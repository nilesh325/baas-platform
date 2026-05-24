# 🤖 BAAS (Bot-as-a-Service) — AI-Driven Knowledge Base & Customer Support SaaS

BAAS (Bot-as-a-Service) is an enterprise-grade, logical multi-tenant B2B SaaS platform designed to democratize Retrieval-Augmented Generation (RAG) for customer-facing businesses. The platform enables organizations to instantly deploy proprietary-knowledge AI chatbot agents trained exclusively on their business manuals, guides, and manuals, while offering an integrated support ticket management lifecycle.

---

## 🎯 Project Aims & Mission

The core objectives of the BAAS platform are:
1.  **Eliminate AI Hallucinations**: Standard LLMs often hallucinate facts when answering business queries. BAAS solves this by using a local, semantic RAG pipeline to restrict the AI agent's responses exclusively to the context extracted from the company's uploaded documents.
2.  **Stateless Customer Onboarding (SSO)**: Provide a friction-free experience where customers can securely launch a help desk chatbot directly from their brand portal without needing separate credentials, utilizing a cryptographic JWT handshake.
3.  **Unified Support Lifecycle**: Bridge the gap between automated AI replies and human intervention. If the AI cannot solve a query, the customer raises a ticket that streams instantly into a real-time Query Management Cockpit for admin review.
4.  **Premium Glassmorphic Developer Experience**: Deliver a visual dark-mode aesthetic that wows administrators and clients at first glance, proving that enterprise SaaS dashboards can be both functionally robust and visually jaw-dropping.

---

## 🛠️ Tech Stack & System Design

| Layer | Technologies | Engineering Purpose |
| :--- | :--- | :--- |
| **Frontend SPA Client** | React 18, Vite, TailwindCSS v4, React Router DOM, Lucide Icons | Ultra-fast client-side state transitions, modular components, responsive layout, cyber-dark HSL glassmorphism styling. |
| **Backend Web Server** | FastAPI (Python 3.10+), Pydantic, HTTPBearer Security | High-throughput asynchronous routing, automatic OpenAPI schema specs, strict payload validation. |
| **Database & Search** | MongoDB (Community Server), Motor Driver (Async MongoDB) | Non-blocking database calls, flexible unstructured JSON schemas, dynamic query sorting and indexing. |
| **AI / RAG Pipeline** | PyPDF2, LangChain Chunks, SentenceTransformers, Cosine Similarity | PDF semantic text extraction, overlap sliding-window token chunking, semantic similarity vector retrieval. |
| **Authentication Cockpit**| Google Identity Services (GSI 2.0), PyJWT, Argon2-ID | Multi-factor stateless auth, cryptographically signed tenant handshakes, memory-hard admin credential hashing. |

---

## 📁 Complete Workspace Directory Layout

Below is the full layout of the unified BAAS repository, showing both the async backend services and the modern compiled React SPA frontend:

```
BAAS2/
├── frontend/                     # Modern React Single Page Application (SPA)
│   ├── public/                   # Static browser assets (favicon.svg, icons.svg)
│   ├── src/
│   │   ├── assets/               # Local media and brand imagery (hero.png, vite.svg)
│   │   ├── components/
│   │   │   └── Navbar.jsx        # Translucent glassmorphic header navigation
│   │   ├── pages/
│   │   │   ├── Auth.jsx          # Login/Register view with secure Google Identity Sign-In
│   │   │   ├── Home.jsx          # Admin uploader dashboard with active pipeline states
│   │   │   ├── Tickets.jsx       # Stats panel & ticket manager with custom delete confirmation modal
│   │   │   ├── Profile.jsx       # Account cockpit with locking danger zone deletion cards
│   │   │   ├── ContactUs.jsx     # FAQ gate page with customer SSO launch trigger
│   │   │   ├── ChatbotLogin.jsx  # Work-email gating validation screen
│   │   │   └── ChatbotWindow.jsx # Customer live support AI chatbot chatroom
│   │   ├── App.css               # Global responsive CSS layouts
│   │   ├── App.jsx               # React Router client-side path definitions
│   │   ├── index.css             # Premium cyber-dark HSL style tokens & animations
│   │   └── main.jsx              # DOM entry point
│   ├── eslint.config.js          # Code quality and syntax standards config
│   ├── index.html                # Vite client entry page template
│   ├── package.json              # Client dependencies, React Router, & script commands
│   ├── README.md                 # Dedicated frontend documentation guide
│   └── vite.config.js            # Compile settings, base asset mapping, and dev server proxies
├── routes/                       # Asynchronous Backend REST API Route Controllers
│   ├── auth.py                   # Administrative signup, login, Google GSI auth, & JWT generator
│   ├── dynamic_routes.py         # SSO chatbot gating routes and dynamic sessions
│   └── routes.py                 # Core dashboard page routers mapping to built React index.html
├── src/                          # Backend Core Database and Business Logic
│   ├── database.py               # Async MongoDB client connections & database collections configurations
│   ├── main_logic.py             # RAG logic (vector embeddings matching and query processing)
│   └── pdf_database.py           # Threadpool document parser, semantic chunker, and database storage
├── static/                       # Production Static Mount target
│   └── favicon.ico               # Server landing brand shortcut icon
├── templates/                    # Legacy server templates (bypassed for SPA distribution)
├── chatbot.py                    # Support room conversational LLM controllers
├── comapny_profile.py            # Account customization, credential changes, and permanent deletion logic
├── main.py                       # FastAPI core main entry, CORS middleware, and production SPA dist mount
├── tickets.py                    # Support tickets status updater and logic-hardened deletion endpoint
├── requirements.txt              # Unified list of backend Python library dependencies
└── README.md                     # Root project master documentation file (This file)
```

---

## ⚙️ Core Technical Mechanics (How it Works)

### 📈 A. The PDF Knowledge Pipeline (RAG)
1.  **Dropzone Ingestion**: The administrator drops a PDF guide inside the Drag-and-Drop Uploader.
2.  **Threadpool Extraction**: FastAPI intercepts the stream and loads the document parser into an asynchronous worker pool, keeping the main web loop 100% responsive.
3.  **Semantic Overlap Chunking**: Text is broken down into small 500-token chunks with a 100-token sliding overlap to ensure contextual continuity at document boundaries.
4.  **Embedding Vector Extraction**: Chunks are processed via our vectorization engine, yielding multi-dimensional semantic weights stored alongside document tags in MongoDB.
5.  **RAG Semantic Search**: When a customer queries the bot, their prompt is converted into a query vector. Cosine similarity retrieves the top 3 most semantically aligned context chunks, dynamically injected into the LLM context prompt to generate highly precise answers.

### 🔐 B. The stateless SSO Token Handshake
*   To prevent corporate clients from needing manual credentials, the brand page cryptographically signs a **JWT Token** containing custom session IDs and company parameters using their shared HMAC secret.
*   The client redirects to the chatbot portal at `/ai/{company_id}/{session_id}`.
*   FastAPI decrypts and validates the SHA-256 signature, instantly authorizing a customized customer support session in milliseconds without asking the customer for an administrative password.

---

## 💻 Local Development Setup

To run the complete BAAS platform locally in development mode:

### 1. Prerequisites
Ensure you have Python (>= 3.10), Node.js (>= 18), and MongoDB running locally on port `27017`.

### 2. Backend Installation & Startup
1.  Clone the repository and navigate to the directory:
    ```bash
    git clone https://github.com/nilesh325/BAAS2.git
    cd BAAS2
    ```
2.  Set up a virtual environment and install backend dependencies:
    ```bash
    python -m venv venv
    venv\Scripts\activate   # On Windows PowerShell: .\venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    ```
3.  Set up your `.env` configuration file in the root:
    ```env
    MONGO_URL=mongodb://localhost:27017
    JWT_SECRET=super-secret-key-bass-project-2026
    ```
4.  Start the FastAPI development server:
    ```bash
    uvicorn main:app --port 8000 --reload
    ```

### 3. Frontend Installation & Startup
1.  Open a new terminal window, go into the frontend subdirectory, and install packages:
    ```bash
    cd frontend
    npm install
    ```
2.  Start the Vite React development server:
    ```bash
    npm run dev
    ```
3.  Open your browser to **`http://localhost:3000`** to view the live dashboard!

---

## 🎓 Showcase Guide: Core Technical Talking Points
When presenting this project to interviewers, be sure to highlight these three engineering challenges and your solutions:

1.  **Logical Multi-Tenant Security**: *"To prevent cross-tenant data leaks, we implemented strict database query logical filters. Every ticket and vector document is strictly mapped via `company_id` validated directly from the JWT signature on the backend, ensuring Company A can never access data belonging to Company B."*
2.  **Threadpool File Processing**: *"PDF reading and text parsing can be heavily blocking operations in single-threaded Python environments. To prevent large document uploads from freezing the FastAPI main thread, we offloaded semantic chunking and embedding extraction to an asynchronous background worker pool, keeping the web server perfectly responsive."*
3.  **Modern Client-Side Modals vs. Native Popups**: *"We built premium custom state-controlled glassmorphic modals for ticket deletion to replace native blocking alert boxes. Native blocking dialogs can cause event starvation and freeze JavaScript threads, whereas our custom modal guarantees seamless execution and maintains dark theme visual elegance."*

---

🔗 LIVE LINK : https://baas-platform-xi.vercel.app/
