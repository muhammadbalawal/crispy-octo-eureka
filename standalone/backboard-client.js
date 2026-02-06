import { CONFIG } from './config.js';

/**
 * Call Python backend server (uses Backboard.io SDK)
 */
async function callBackend(prompt) {
  try {
    console.log('Calling Python backend at http://localhost:3002/api/chat');
    const response = await fetch('http://localhost:3002/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      let errorMessage = `Backend error: ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.detail || error.error || errorMessage;
      } catch (e) {
        const errorText = await response.text();
        errorMessage += ` - ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (!data.elements) {
      throw new Error('Backend returned invalid response: missing elements');
    }
    console.log('Backend call successful, got', data.elements.length, 'elements');
    return data.elements;
  } catch (error) {
    // Check if it's a connection error (backend not running)
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('Python backend not running. Please start it with: python backend.py');
    }
    console.error('Backend call failed:', error);
    throw error;
  }
}

/**
 * Simple fallback: Convert basic prompts to Excalidraw elements
 * This is a temporary solution until Backboard.io endpoint is configured
 */
function simplePromptToElements(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Simple examples for testing
  if (lowerPrompt.includes('cat')) {
    return [
      {"type":"cameraUpdate","width":800,"height":600,"x":0,"y":0},
      {"type":"ellipse","id":"head","x":300,"y":200,"width":150,"height":150,"backgroundColor":"#ffd8a8","fillStyle":"solid","strokeColor":"#f59e0b","strokeWidth":2},
      {"type":"ellipse","id":"ear1","x":320,"y":180,"width":30,"height":40,"backgroundColor":"#ffd8a8","fillStyle":"solid","strokeColor":"#f59e0b"},
      {"type":"ellipse","id":"ear2","x":400,"y":180,"width":30,"height":40,"backgroundColor":"#ffd8a8","fillStyle":"solid","strokeColor":"#f59e0b"},
      {"type":"ellipse","id":"eye1","x":330,"y":230,"width":15,"height":15,"backgroundColor":"#1e1e1e","fillStyle":"solid"},
      {"type":"ellipse","id":"eye2","x":405,"y":230,"width":15,"height":15,"backgroundColor":"#1e1e1e","fillStyle":"solid"},
      {"type":"ellipse","id":"nose","x":365,"y":260,"width":20,"height":15,"backgroundColor":"#f59e0b","fillStyle":"solid"},
      {"type":"line","id":"mouth","x":365,"y":275,"width":0,"height":0,"points":[[0,0],[15,10]],"strokeColor":"#1e1e1e","strokeWidth":2}
    ];
  }
  
  if (lowerPrompt.includes('rectangle') || lowerPrompt.includes('box')) {
    return [
      {"type":"cameraUpdate","width":800,"height":600,"x":0,"y":0},
      {"type":"rectangle","id":"box1","x":200,"y":200,"width":200,"height":150,"roundness":{"type":3},"backgroundColor":"#a5d8ff","fillStyle":"solid","strokeColor":"#4a9eed","label":{"text":"Box","fontSize":20}}
    ];
  }
  
  // Default: simple diagram
  return [
    {"type":"cameraUpdate","width":800,"height":600,"x":0,"y":0},
    {"type":"rectangle","id":"r1","x":100,"y":100,"width":200,"height":100,"roundness":{"type":3},"backgroundColor":"#a5d8ff","fillStyle":"solid","label":{"text":"Start","fontSize":20}},
    {"type":"arrow","id":"a1","x":300,"y":150,"width":200,"height":0,"points":[[0,0],[200,0]],"endArrowhead":"arrow"},
    {"type":"rectangle","id":"r2","x":500,"y":100,"width":200,"height":100,"roundness":{"type":3},"backgroundColor":"#b2f2bb","fillStyle":"solid","label":{"text":"End","fontSize":20}}
  ];
}

/**
 * Converts a natural language prompt to Excalidraw elements JSON using Backboard.io
 */
export async function convertPromptToElements(prompt) {
  // Check if API key is configured
  if (!CONFIG.BACKBOARD_API_KEY || CONFIG.BACKBOARD_API_KEY === 'YOUR_BACKBOARD_API_KEY_HERE') {
    console.warn('Backboard.io API key not configured. Using simple fallback converter.');
    return simplePromptToElements(prompt);
  }

  // Use Python backend (uses Backboard.io SDK) - NO FALLBACK
  console.log('Calling Python backend...');
  const elements = await callBackend(prompt);
  return elements;
}
