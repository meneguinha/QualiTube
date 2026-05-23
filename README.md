# QualiTube | YouTube Data Extraction for Social Sciences

**QualiTube** is a stateless YouTube data extraction and structuring tool, custom-designed for researchers in Social Sciences, Communication, Humanities, and social network analysis. The tool simplifies video sampling, comments extraction, and channel metadata consolidation for both quantitative and qualitative analyses.

---

## 🚀 Key Features

*   **Video Sampling (Step 1)**: Search for videos using keywords (with support for Boolean operators AND, OR, `-`) and filters by channel or publication date range.
*   **Deep Comments Extraction (Step 2)**: Capture comments and replies in batches from multiple videos in a paginated, controlled workflow.
*   **Individual Channel Analysis**: Collect metadata, general statistics (subscribers, views, uploaded videos count), and upload video listings from specific channels.
*   **Batch Channels Processing**: Paste multiple channel IDs to aggregate their metadata or list all their videos in consolidated sheets.
*   **Multi-format Data Export**:
    *   **CSV (Flat Spreadsheet)**: Clean table containing structured comment metrics (IDs, text, likes, dates, author) ready for R, SPSS, Python, Excel, etc.
    *   **GEXF (Social Networks)**: Structures comment author-to-video interaction networks, ready for import and analysis in Gephi.
*   **Internationalization (i18n)**: Full language support (Portuguese and English) switchable in the sidebar with a single click.
*   **Premium and Responsive Design**: A clean, minimalist interface inspired by parchment and Midnight Navy tones, crafted for comfortable, long research sessions.

---

## 🛠️ How to Run Locally

The application is split into two components: a **Frontend** (static HTML/JS page) and a **Backend** (stateless Python API built with FastAPI).

### 1. Running the Backend (API)

#### Prerequisites:
*   Python 3.10 or higher installed.

#### Step-by-Step:
1.  Open your terminal (PowerShell or Bash) and navigate to the backend folder:
    ```bash
    cd qualitube-backend
    ```
2.  Create and activate a virtual environment:
    *   **On Windows (PowerShell)**:
        ```powershell
        python -m venv venv
        .\venv\Scripts\activate
        ```
    *   **On Linux/macOS**:
        ```bash
        python -m venv venv
        source venv/bin/activate
        ```
3.  Install the required dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure your YouTube API Key in the environment variables:
    *   **On Windows (PowerShell)**:
        ```powershell
        $env:YOUTUBE_API_KEY="YOUR_API_KEY_HERE"
        ```
    *   **On Linux/macOS**:
        ```bash
        export YOUTUBE_API_KEY="YOUR_API_KEY_HERE"
        ```
5.  Start the backend server:
    ```bash
    python -m app.main
    ```
    The backend will be running at `http://localhost:8000`. You can access the interactive API docs at `http://localhost:8000/docs`.

### 2. Running the Frontend (UI)

1.  Navigate to the `qualitube-frontend` folder.
2.  Open the `index.html` file directly in any modern web browser (or use VS Code's Live Server extension).
3.  The dashboard will automatically connect to your local backend.

---

## 🧑‍💻 Credits & Authorship

Developed by **Felipe Menegotto**:
*   B.Sc. in Physics from the Federal University of Rio Grande do Sul (UFRGS).
*   M.Sc. in Scientific Culture from the University of Lisbon.
*   Independent researcher focused on digital tools and methodologies for scientific research.
