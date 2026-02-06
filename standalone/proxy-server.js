// Simple proxy server to handle Backboard.io API calls (avoids CORS)
import express from 'express';
import cors from 'cors';
import FormData from 'form-data';
import axios from 'axios';
// Import config
const configModule = await import('./config.js');
const CONFIG = configModule.CONFIG;

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Backboard.io API uses Assistant -> Thread -> Message architecture
const BASE_URL = 'https://app.backboard.io/api';
let cachedAssistantId = null;

// Create or get assistant for Excalidraw diagram generation
async function getOrCreateAssistant() {
  if (cachedAssistantId) {
    return cachedAssistantId;
  }

  try {
    // Create a new assistant using axios
    const response = await axios.post(
      `${BASE_URL}/assistants`,
      {
        name: 'Excalidraw Diagram Generator',
        system_prompt: `You are an expert at creating Excalidraw diagrams. Convert user requests into valid Excalidraw elements JSON.

CRITICAL RULES:
1. Return ONLY a valid JSON array of Excalidraw elements
2. NO markdown code blocks, NO comments, NO trailing commas
3. Start with a cameraUpdate element: {"type":"cameraUpdate","width":800,"height":600,"x":0,"y":0}
4. Use labeled shapes when possible
5. Use colors from the palette: #4a9eed (blue), #22c55e (green), #f59e0b (amber), #ef4444 (red)
6. Keep elements compact and readable
7. Minimum fontSize: 16 for body text, 20 for titles

Example format:
[
  {"type":"cameraUpdate","width":800,"height":600,"x":0,"y":0},
  {"type":"rectangle","id":"r1","x":100,"y":100,"width":200,"height":100,"roundness":{"type":3},"backgroundColor":"#a5d8ff","fillStyle":"solid","label":{"text":"Start","fontSize":20}},
  {"type":"arrow","id":"a1","x":300,"y":150,"width":200,"height":0,"points":[[0,0],[200,0]],"endArrowhead":"arrow"}
]`,
        llm_provider: 'anthropic',
        model_name: 'claude-3-5-sonnet-20241022',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': CONFIG.BACKBOARD_API_KEY,
        },
      }
    );

    cachedAssistantId = response.data.assistant_id;
    console.log(`Created assistant: ${cachedAssistantId}`);
    return cachedAssistantId;
  } catch (error) {
    console.error('Error creating assistant:', error.response?.data || error.message);
    throw error;
  }
}

// Proxy endpoint for Backboard.io API
app.post('/api/backboard/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!CONFIG.BACKBOARD_API_KEY || CONFIG.BACKBOARD_API_KEY === 'YOUR_BACKBOARD_API_KEY_HERE') {
      return res.status(400).json({ error: 'Backboard.io API key not configured' });
    }

    console.log(`Processing prompt: ${prompt.substring(0, 50)}...`);

    // Get or create assistant
    const assistantId = await getOrCreateAssistant();

    // Create a thread using axios
    const threadResponse = await axios.post(
      `${BASE_URL}/assistants/${assistantId}/threads`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': CONFIG.BACKBOARD_API_KEY,
        },
      }
    );

    const threadId = threadResponse.data.thread_id;
    console.log(`Created thread: ${threadId}`);

    // Send message to thread using multipart/form-data
    // Use axios for better FormData support
    const formData = new FormData();
    formData.append('content', prompt);
    formData.append('stream', 'false');
    formData.append('memory', 'off');
    formData.append('send_to_llm', 'true');

    const messageResponse = await axios.post(
      `${BASE_URL}/threads/${threadId}/messages`,
      formData,
      {
        headers: {
          'X-API-Key': CONFIG.BACKBOARD_API_KEY,
          ...formData.getHeaders(),
        },
      }
    );

    const messageData = messageResponse.data;
    const content = messageData.content;
    
    if (!content) {
      throw new Error('No content in response');
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonString = content.trim();
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    // Validate JSON
    const elements = JSON.parse(jsonString);
    if (!Array.isArray(elements)) {
      throw new Error('Response is not an array');
    }

    console.log(`Successfully converted prompt, got ${elements.length} elements`);
    return res.json({ elements, thread_id: threadId });
  } catch (error) {
    console.error('Error in proxy:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data?.detail || error.message,
      details: 'Check server console for details'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Backboard.io API proxy endpoint: http://localhost:${PORT}/api/backboard/chat`);
});
