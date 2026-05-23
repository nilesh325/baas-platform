import os
import time
import httpx
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

class HuggingFaceApiEmbedder:
    """
    Lightweight, drop-in replacement for SentenceTransformer.
    Uses Hugging Face's Serverless Inference API to generate embeddings.
    Consumes ~0MB of RAM, making it perfect for resource-constrained environments like Render's free tier.
    """
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.api_url = f"https://api-inference.huggingface.co/models/{model_name}"
        self.token = os.getenv("HF_TOKEN")

    def encode(self, texts: list[str], batch_size: int = 32, show_progress_bar: bool = False) -> np.ndarray:
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        else:
            print("[HF Embeddings] Warning: HF_TOKEN is missing. Attempting unauthenticated request...")
        
        results = []
        
        # Process in batches to stay within Hugging Face API payload guidelines
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            # Retry up to 3 times in case the model is currently loading on the serverless endpoint (HTTP 503)
            for attempt in range(3):
                try:
                    response = httpx.post(
                        self.api_url,
                        headers=headers,
                        json={"inputs": batch},
                        timeout=30.0
                    )
                except httpx.RequestError as exc:
                    if attempt == 2:
                        raise RuntimeError(f"Network error when calling Hugging Face embeddings: {exc}")
                    time.sleep(2.0)
                    continue

                if response.status_code == 503:
                    # Model loading, wait and retry
                    error_data = response.json()
                    estimated_time = error_data.get("estimated_time", 15.0)
                    print(f"[HF Embeddings] Model is loading, waiting {estimated_time:.1f}s (attempt {attempt+1}/3)...")
                    time.sleep(min(estimated_time, 20.0))
                    continue
                
                try:
                    response.raise_for_status()
                    batch_vectors = response.json()
                    
                    # Ensure the response is in list format
                    if isinstance(batch_vectors, dict) and "error" in batch_vectors:
                        raise RuntimeError(f"Hugging Face API returned error: {batch_vectors['error']}")
                    
                    results.extend(batch_vectors)
                    break
                except Exception as exc:
                    if attempt == 2:
                        raise RuntimeError(f"Failed to fetch embeddings: {exc} — Response: {response.text}")
                    time.sleep(2.0)
            else:
                raise RuntimeError("Hugging Face Inference API did not recover in time from loading status.")
                
        return np.array(results, dtype=np.float32)

def get_embedding_model(model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
    """
    Returns a local SentenceTransformer model if the package is installed,
    or falls back dynamically to the Hugging Face Serverless Inference API.
    """
    if HAS_SENTENCE_TRANSFORMERS:
        print(f"[Embeddings] Package 'sentence-transformers' detected. Loading local model: {model_name}")
        return SentenceTransformer(model_name)
    else:
        print(f"[Embeddings] Package 'sentence-transformers' NOT detected. Using Hugging Face Serverless Inference API: {model_name}")
        return HuggingFaceApiEmbedder(model_name)
