# Excalidraw Standalone - AI-Powered Diagram Generator

A standalone Excalidraw app powered by Backboard.io AI, with a minimal UI matching excalidraw-mcp-app.

## Features

- 🎨 **Minimal UI** - Clean interface matching excalidraw-mcp-app
- 🤖 **AI-Powered** - Uses Backboard.io SDK to convert prompts to diagrams
- 🖼️ **High-Quality Widget** - Uses the same Excalidraw MCP App widget
- 🔄 **Streaming Updates** - See diagrams animate as they're generated
- 📱 **Fullscreen Mode** - Click the expand button for fullscreen editing

## Setup

### 1. Install Python Dependencies

```bash
cd standalone
pip install -r requirements.txt
```

### 2. Set Backboard.io API Key

Set your API key as an environment variable:

**Windows (PowerShell):**
```powershell
$env:BACKBOARD_API_KEY="your_api_key_here"
```

**Windows (CMD):**
```cmd
set BACKBOARD_API_KEY=your_api_key_here
```

**Linux/Mac:**
```bash
export BACKBOARD_API_KEY="your_api_key_here"
```

Or create a `.env` file (if using python-dotenv):
```
BACKBOARD_API_KEY=your_api_key_here
```

### 3. Start the Python Backend

```bash
python backend.py
```

The backend will run on `http://localhost:3002`

### 4. Start the MCP Server

In a separate terminal:

```bash
cd excalidraw-mcp-app
npm start
```

The MCP server will run on `http://localhost:3001`

### 5. Start the Frontend

In another terminal:

```bash
cd standalone
python -m http.server 8000
```

Or use any static file server. Open `http://localhost:8000` in your browser.

## Usage

### Method 1: Browser Console

Open browser console and type:
```javascript
drawDiagram("draw a cute cat")
```

### Method 2: URL Parameter

Visit:
```
http://localhost:8000?prompt=draw%20a%20flowchart
```

### Method 3: Programmatic

The `drawDiagram()` function is available globally:
```javascript
await drawDiagram("create an architecture diagram")
```

## Architecture

```
Browser (localhost:8000)
  ↓
Python Backend (localhost:3002) ← Uses Backboard.io SDK
  ↓
Backboard.io API
  ↓
Returns Excalidraw elements JSON
  ↓
Widget Loader → MCP Server (localhost:3001)
  ↓
Excalidraw Widget (animated, streaming)
```

## Files

- `backend.py` - Python FastAPI server using Backboard SDK
- `index.html` - Minimal UI matching excalidraw-mcp-app
- `styles.css` - Clean styling
- `backboard-client.js` - Frontend client calling Python backend
- `widget-loader.js` - Loads and manages Excalidraw widget
- `mock-host.js` - MCP App host implementation

## Troubleshooting

**Backend not starting:**
- Check Python version: `python --version` (needs 3.8+)
- Install dependencies: `pip install -r requirements.txt`
- Verify API key is set: `echo $BACKBOARD_API_KEY`

**Widget not loading:**
- Ensure MCP server is running on port 3001
- Check browser console for errors
- Verify `WIDGET_HTML_URL` in config.js

**Backboard.io errors:**
- Check API key is valid
- Verify you have credits in your Backboard.io account
- Check backend logs for detailed error messages

## Development

The UI is intentionally minimal to match excalidraw-mcp-app. To add features:

1. Modify `index.html` for UI changes
2. Update `backend.py` for backend logic
3. Extend `widget-loader.js` for widget interactions
