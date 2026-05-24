import os
import time
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

from huggingface_hub import InferenceClient

class HuggingFaceApiEmbedder:
    """
    Lightweight, drop-in replacement for SentenceTransformer.
    Uses Hugging Face Hub's official InferenceClient to generate embeddings.
    Consumes ~0MB of RAM, making it perfect for resource-constrained environments like Render's free tier.
    """
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.token = os.getenv("HF_TOKEN")
        self.client = InferenceClient(token=self.token)

    def encode(self, texts: list[str], batch_size: int = 32, show_progress_bar: bool = False) -> np.ndarray:
        results = []
        
        # Process in batches to stay within Hugging Face API guidelines
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            # Retry up to 3 times in case the model is loading
            for attempt in range(3):
                try:
                    # Hugging Face InferenceClient handles all DNS and HTTP posting automatically
                    embeddings = self.client.feature_extraction(
                        batch,
                        model=self.model_name
                    )
                    
                    results.extend(embeddings)
                    break
                except Exception as exc:
                    exc_str = str(exc)
                    if "503" in exc_str or "loading" in exc_str or "Model" in exc_str:
                        print(f"[HF Embeddings] Model is currently loading, waiting 15s (attempt {attempt+1}/3)...")
                        time.sleep(15.0)
                        continue
                        
                    if attempt == 2:
                        raise RuntimeError(f"Failed to fetch embeddings via Hugging Face InferenceClient: {exc}")
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
        print(f"[Embeddings] Package 'sentence-transformers' NOT detected. Using Hugging Face Serverless Inference API via HF Hub: {model_name}")
        return HuggingFaceApiEmbedder(model_name)
