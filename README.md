# QualiTube | YouTube Data Extraction for Social Sciences

**QualiTube** is a stateless YouTube data extraction and structuring tool, custom-designed for researchers in Social Sciences, Communication, Humanities, and social network analysis. The tool simplifies video sampling, comments extraction, and channel metadata consolidation for both quantitative and qualitative analyses.

---

## 🚀 Key Features

- **Video Sampling (Step 1)**: Search for videos using keywords (with support for Boolean operators `AND`, `OR`, `-`) and filters by channel or publication date range.
- **Deep Comments Extraction (Step 2)**: Capture comments and replies in batches from multiple videos in a paginated, controlled workflow.
- **Individual Channel Analysis**: Collect metadata, general statistics (subscribers, views, uploaded videos count), and upload video listings from specific channels.
- **Batch Channels Processing**: Paste multiple channel IDs to aggregate their metadata or list all their videos in consolidated sheets.
- **Multi-format Data Export**:
  - **CSV (Flat Spreadsheet)**: Clean table containing structured comment metrics (IDs, text, likes, dates, author) ready for R, SPSS, Python, Excel, etc.
  - **GEXF (Social Networks)**: Structures comment author-to-video interaction networks, ready for import and analysis in Gephi.
- **Internationalization (i18n)**: Full language support (Portuguese and English) switchable in the sidebar with a single click.

---

## 🛠️ How to Run Locally

The application is split into two components: a **Backend** (stateless Python API built with FastAPI) and a **Frontend** (static HTML/JS page). Start the backend first.

### Prerequisites

- Python **3.10** or higher
- A valid **YouTube Data API v3** key ([get one here](https://console.cloud.google.com/apis/library/youtube.googleapis.com))
- VS Code with the **Live Server** extension (recommended for the frontend) or any HTTP server

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/meneguinha/QualiTube.git
cd QualiTube
```

---

### Step 2 — Set up and run the Backend

#### 2.1 Navigate to the backend folder

```bash
cd qualitube-backend
```

#### 2.2 Create and activate a virtual environment

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**Linux / macOS:**
```bash
python -m venv venv
source venv/bin/activate
```

#### 2.3 Install dependencies

```bash
pip install -r requirements.txt
```

#### 2.4 Configure environment variables

The backend requires your YouTube API key to be set as an environment variable. You can do this in one of two ways:

**Option A — `.env` file (recommended):**

Create a file named `.env` inside the `qualitube-backend/` folder:

```env
YOUTUBE_API_KEY=YOUR_API_KEY_HERE
DEBUG=True
```

**Option B — Shell environment variable:**

*Windows (PowerShell):*
```powershell
$env:YOUTUBE_API_KEY="YOUR_API_KEY_HERE"
$env:DEBUG="True"
```

*Linux / macOS:*
```bash
export YOUTUBE_API_KEY="YOUR_API_KEY_HERE"
export DEBUG="True"
```

> **Important:** `DEBUG=True` is required to allow requests from `localhost`. Without it, the CORS policy will block the frontend from communicating with the backend.

#### 2.5 Start the backend server

```bash
python -m app.main
```

The API will be available at **`http://localhost:8000`**.  
Interactive documentation (Swagger UI): **`http://localhost:8000/docs`**

---

### Step 3 — Run the Frontend

1. Navigate to the `qualitube-frontend/` folder.
2. Open `index.html` using **VS Code's Live Server** extension (right-click → *Open with Live Server*).  
   The default Live Server URL is `http://localhost:5500` — which is already allowed by the backend when `DEBUG=True`.
3. Alternatively, use any local HTTP server (e.g. `python -m http.server 5500`).

> **Do not** open `index.html` directly as a `file://` URL — browsers block fetch requests from `file://` origins.

---

## 🌐 Architecture Overview

```
qualitube-frontend/   ← Static HTML + JS (no build step required)
qualitube-backend/    ← FastAPI (Python) REST API
    app/
    ├── main.py       ← CORS config, app bootstrap
    ├── config.py     ← Reads env vars / .env file
    └── api/
        └── endpoints.py  ← All API routes (/api/search, /api/comments, etc.)
```

The frontend communicates with the backend via `fetch()` calls. The backend reads the `YOUTUBE_API_KEY` from the server environment — no key is stored in the browser.

---

## 🧑‍💻 Credits & Authorship

Developed by **Felipe Menegotto**:
- B.Sc. in Physics from the Federal University of Rio Grande do Sul (UFRGS).
- M.Sc. in Scientific Culture from the University of Lisbon.
- Independent researcher focused on digital tools and methodologies for scientific research.
