/**
 * LLM Client for calling OpenAI and Anthropic APIs
 */

/**
 * Call LLM API with streaming support
 * @param {Object} config - Provider configuration
 * @param {Array} messages - Chat messages array
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<string>} Complete response
 */
export async function callLLM(config, messages, onChunk) {
  const { type, baseUrl, apiKey, model } = config;

  if (type === 'openai') {
    return callOpenAI(baseUrl, apiKey, model, messages, onChunk);
  } else if (type === 'anthropic') {
    return callAnthropic(baseUrl, apiKey, model, messages, onChunk);
  } else if (type === 'backboard') {
    return callBackboard(baseUrl, apiKey, model, messages, onChunk);
  } else {
    throw new Error(`Unsupported provider type: ${type}`);
  }
}

/**
 * Call OpenAI-compatible API
 */
async function callOpenAI(baseUrl, apiKey, model, messages, onChunk) {
  const url = `${baseUrl}/chat/completions`;

  // Process messages to support multimodal content (text + images)
  const processedMessages = messages.map(processMessageForOpenAI);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: processedMessages,
      stream: true,
      // max_tokens: 64000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  return processOpenAIStream(response.body, onChunk);
}

/**
 * Process OpenAI streaming response
 */
async function processOpenAIStream(body, onChunk) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              if (onChunk) onChunk(content);
            }
          } catch (e) {
            console.error('Failed to parse SSE:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

/**
 * Call Anthropic API
 */
async function callAnthropic(baseUrl, apiKey, model, messages, onChunk) {
  const url = `${baseUrl}/messages`;

  // Convert messages format for Anthropic with multimodal support
  const systemMessage = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');
  const processedMessages = chatMessages.map(processMessageForAnthropic);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      messages: processedMessages,
      system: systemMessage ? [{ type: 'text', text: systemMessage.content }] : undefined,
      max_tokens: 8192,
      stream: true,
      temperature: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${error}`);
  }

  return processAnthropicStream(response.body, onChunk);
}

/**
 * Process Anthropic streaming response
 */
async function processAnthropicStream(body, onChunk) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        try {
          const json = JSON.parse(trimmed.slice(6));
          
          if (json.type === 'content_block_delta') {
            const content = json.delta?.text;
            if (content) {
              fullText += content;
              if (onChunk) onChunk(content);
            }
          }
        } catch (e) {
          console.error('Failed to parse SSE:', e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

/**
 * Call Backboard API (Assistant/Thread/Message architecture)
 */
async function callBackboard(baseUrl, apiKey, model, messages, onChunk) {
  const headers = { 'X-API-Key': apiKey };

  // Extract system prompt and user content
  const systemMessage = messages.find(m => m.role === 'system');
  const systemPrompt = systemMessage ? systemMessage.content : '';
  const userMessages = messages.filter(m => m.role !== 'system');
  const userContent = userMessages.map(m => {
    if (m.image) {
      console.warn('Backboard: Image data in messages is not supported, sending text only');
    }
    return typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
  }).join('\n\n');

  // Parse model string: "provider/model_name" or just "model_name"
  let llmProvider = 'openai';
  let modelName = model;
  if (model.includes('/')) {
    const parts = model.split('/');
    llmProvider = parts[0];
    modelName = parts.slice(1).join('/');
  }

  let assistantId = null;

  try {
    // 1. Create ephemeral assistant
    const assistantRes = await fetch(`${baseUrl}/assistants`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'FlowCraft Session', system_prompt: systemPrompt }),
    });
    if (!assistantRes.ok) {
      const err = await assistantRes.text();
      throw new Error(`Backboard create assistant error: ${assistantRes.status} ${err}`);
    }
    const assistantData = await assistantRes.json();
    assistantId = assistantData.assistant_id;

    // 2. Create thread
    const threadRes = await fetch(`${baseUrl}/assistants/${assistantId}/threads`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!threadRes.ok) {
      const err = await threadRes.text();
      throw new Error(`Backboard create thread error: ${threadRes.status} ${err}`);
    }
    const threadData = await threadRes.json();
    const threadId = threadData.thread_id;

    // 3. Post message with streaming
    const formData = new FormData();
    formData.append('content', userContent);
    formData.append('stream', 'true');
    formData.append('model_name', modelName);
    formData.append('llm_provider', llmProvider);
    formData.append('memory', 'off');

    const messageRes = await fetch(`${baseUrl}/threads/${threadId}/messages`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!messageRes.ok) {
      const err = await messageRes.text();
      throw new Error(`Backboard message error: ${messageRes.status} ${err}`);
    }

    return await processBackboardStream(messageRes.body, onChunk);
  } finally {
    // Cleanup: delete ephemeral assistant
    if (assistantId) {
      try {
        await fetch(`${baseUrl}/assistants/${assistantId}`, {
          method: 'DELETE',
          headers,
        });
      } catch (cleanupErr) {
        console.error('Backboard cleanup error (non-fatal):', cleanupErr);
      }
    }
  }
}

/**
 * Process Backboard streaming response (SSE)
 */
async function processBackboardStream(body, onChunk) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));

          if (json.type === 'content_streaming') {
            const content = json.content;
            if (content) {
              fullText += content;
              if (onChunk) onChunk(content);
            }
          } else if (json.type === 'message_complete') {
            break;
          }
        } catch (e) {
          console.error('Failed to parse Backboard SSE:', e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

/**
 * Process message for OpenAI API with multimodal support
 * @param {Object} message - Message object
 * @returns {Object} Processed message for OpenAI
 */
function processMessageForOpenAI(message) {
  // If message doesn't have image data, return as-is
  if (!message.image) {
    return message;
  }

  // Process message with image
  const { image, content } = message;

  return {
    role: message.role,
    content: [
      {
        type: 'text',
        text: content
      },
      {
        type: 'image_url',
        image_url: {
          url: `data:${image.mimeType};base64,${image.data}`,
          detail: 'high'
        }
      }
    ]
  };
}

/**
 * Process message for Anthropic API with multimodal support
 * @param {Object} message - Message object
 * @returns {Object} Processed message for Anthropic
 */
function processMessageForAnthropic(message) {
  // If message doesn't have image data, return as-is
  if (!message.image) {
    return message;
  }

  // Process message with image
  const { image, content } = message;

  return {
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: [
      {
        type: 'text',
        text: content
      },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: image.mimeType,
          data: image.data
        }
      }
    ]
  };
}

/**
 * Test configuration connection with a simple API call
 * @param {Object} config - Provider configuration
 * @returns {Promise<Object>} Test result with success status and message
 */
export async function testConnection(config) {
  const { type, baseUrl, apiKey } = config;

  try {
    // Try to fetch models as a simple connection test
    const models = await fetchModels(type, baseUrl, apiKey);

    if (models && models.length > 0) {
      return {
        success: true,
        message: `Connection successful, found ${models.length} available models`,
        models: models.slice(0, 5) // Return first 5 models for preview
      };
    } else {
      return {
        success: false,
        message: 'Connection successful but no available models found'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error.message}`
    };
  }
}

/**
 * Fetch available models from provider
 * @param {string} type - Provider type
 * @param {string} baseUrl - API base URL
 * @param {string} apiKey - API key
 * @returns {Promise<Array>} List of available models
 */
export async function fetchModels(type, baseUrl, apiKey) {
  if (type === 'openai') {
    const url = `${baseUrl}/models`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return (Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : Array.isArray(data) ? data : [])
      .map(model => ({
        id: typeof model === 'string' ? model : (model.id || model.name || model.model || model.slug),
        name: typeof model === 'string' ? model : (model.name || model.id || model.model || model.slug),
      }))
      .filter(m => m.id);
  } else if (type === 'anthropic') {
    // Request actual models from provider like OpenAI, but with Anthropic headers
    const url = `${baseUrl}/models`;
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return (Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : Array.isArray(data) ? data : [])
      .map(model => ({
        id: typeof model === 'string' ? model : (model.id || model.name || model.model || model.slug),
        name: typeof model === 'string' ? model : (model.name || model.id || model.model || model.slug),
      }))
      .filter(m => m.id);
  } else if (type === 'backboard') {
    const url = `${baseUrl}/models?model_type=llm`;
    const response = await fetch(url, {
      headers: { 'X-API-Key': apiKey },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const modelList = Array.isArray(data?.models) ? data.models : [];
    return modelList
      .map(model => ({
        id: `${model.provider}/${model.name}`,
        name: `${model.provider}/${model.name}`,
      }))
      .filter(m => m.id);
  } else {
    throw new Error(`Unsupported provider type: ${type}`);
  }
}

