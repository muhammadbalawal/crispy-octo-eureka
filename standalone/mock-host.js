import { CONFIG } from './config.js';

/**
 * Mock MCP App Host - Implements the host API that the widget expects
 */
export class MockMcpAppHost {
  constructor(iframe) {
    this.iframe = iframe;
    this.messageId = 0;
    this.pendingCallbacks = new Map();
    this.toolCallId = null;
    this.displayMode = 'inline';
    
    // Set up message listener
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  handleMessage(event) {
    // Only accept messages from our iframe
    if (event.source !== this.iframe.contentWindow) {
      return;
    }

    try {
      const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      
      if (message.jsonrpc === '2.0') {
        this.handleJsonRpcMessage(message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  handleJsonRpcMessage(message) {
    // Handle requests from widget
    if (message.method) {
      this.handleRequest(message);
    }
    // Handle responses to our requests
    else if (message.id && this.pendingCallbacks.has(message.id)) {
      const callback = this.pendingCallbacks.get(message.id);
      this.pendingCallbacks.delete(message.id);
      callback(message);
    }
  }

  async handleRequest(message) {
    console.log('[Mock Host] Handling request:', message.method);
    
    switch (message.method) {
      case 'initialize':
      case 'ui/initialize':
        console.log('[Mock Host] Handling initialize');
        await this.sendResponse(message.id, {
          protocolVersion: '2025-11-21',
          capabilities: {
            appHost: {
              displayMode: true,
              modelContext: true,
            },
          },
          serverInfo: {
            name: 'standalone-host',
            version: '1.0.0',
          },
          // Required fields for widget validation
          hostInfo: {
            name: 'standalone-host',
            version: '1.0.0',
          },
          hostCapabilities: {
            displayMode: true,
            modelContext: true,
          },
          hostContext: {
            displayMode: this.displayMode,
            // toolInfo is optional - omit it instead of sending null
          },
        });
        break;

      case 'app/host/requestDisplayMode':
        const { mode } = message.params || {};
        this.displayMode = mode || 'inline';
        await this.sendResponse(message.id, { mode: this.displayMode });
        // Notify widget of context change
        await this.sendNotification('app/host/contextChanged', {
          displayMode: this.displayMode,
        });
        break;

      case 'app/host/getContext':
        await this.sendResponse(message.id, {
          displayMode: this.displayMode,
          toolInfo: {
            id: this.toolCallId || 'default',
            name: 'create_view',
          },
        });
        break;

      case 'app/host/updateModelContext':
        // Widget is sending screenshot/context back
        console.log('Model context updated:', message.params);
        await this.sendResponse(message.id, {});
        break;

      case 'app/host/log':
        // Widget is logging
        console.log('[Widget]', message.params);
        await this.sendResponse(message.id, {});
        break;

      case 'ui/notifications/initialized':
        // Widget finished initializing
        console.log('[Mock Host] Widget initialized');
        // No response needed for notifications
        break;

      case 'ui/notifications/size-changed':
        // Widget size changed
        console.log('[Mock Host] Size changed:', message.params);
        // No response needed for notifications
        break;

      default:
        console.warn('[Mock Host] Unknown method:', message.method);
        // Only send error if it's a request (has an id)
        if (message.id) {
          await this.sendError(message.id, -32601, `Method not found: ${message.method}`);
        }
    }
  }

  async sendRequest(method, params = {}) {
    const id = ++this.messageId;
    const message = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingCallbacks.set(id, (response) => {
        if (response.error) {
          reject(new Error(response.error.message || 'Request failed'));
        } else {
          resolve(response.result);
        }
      });

      this.sendMessage(message);
    });
  }

  async sendResponse(id, result) {
    this.sendMessage({
      jsonrpc: '2.0',
      id,
      result,
    });
  }

  async sendError(id, code, message) {
    this.sendMessage({
      jsonrpc: '2.0',
      id,
      error: { code, message },
    });
  }

  async sendNotification(method, params = {}) {
    this.sendMessage({
      jsonrpc: '2.0',
      method,
      params,
    });
  }

  sendMessage(message) {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*');
    }
  }

  /**
   * Initialize MCP connection (if needed)
   */
  async initializeMcpConnection() {
    try {
      const response = await fetch(CONFIG.MCP_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'standalone-app',
              version: '1.0.0',
            },
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('MCP initialized:', result);
        return result;
      }
    } catch (error) {
      console.warn('MCP initialization failed (may not be required):', error);
    }
    return null;
  }

  /**
   * Call MCP server tool and stream input to widget
   */
  async callTool(toolName, args, onPartial, onFinal) {
    try {
      // Generate tool call ID
      this.toolCallId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Call MCP server
      // StreamableHTTPServerTransport requires Accept header with both application/json and text/event-stream
      const response = await fetch(CONFIG.MCP_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MCP server error: ${response.status} - ${errorText}`);
      }

      // Handle SSE (Server-Sent Events) response format
      const contentType = response.headers.get('content-type') || '';
      let result;
      
      if (contentType.includes('text/event-stream')) {
        // Parse SSE format
        const text = await response.text();
        const lines = text.split('\n');
        let jsonData = null;
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.jsonrpc === '2.0' && data.id) {
                jsonData = data;
                break;
              }
            } catch (e) {
              // Continue parsing
            }
          }
        }
        
        if (!jsonData) {
          throw new Error('Could not parse SSE response');
        }
        result = jsonData;
      } else {
        // Regular JSON response
        result = await response.json();
      }
      
      if (result.error) {
        throw new Error(result.error.message || 'Tool call failed');
      }

      // Get resource URI from tool result
      const resourceUri = result.result?.content?.[0]?._meta?.ui?.resourceUri;
      
      if (resourceUri) {
        // Load widget resource
        await this.loadWidgetResource(resourceUri);
      }

      // Stream tool input to widget
      if (onPartial) {
        // Simulate partial streaming
        const elementsStr = JSON.stringify(args.elements || '[]');
        const partialChunks = this.chunkString(elementsStr, 50);
        
        for (let i = 0; i < partialChunks.length - 1; i++) {
          const partial = partialChunks.slice(0, i + 1).join('');
          await this.sendNotification('app/host/toolInputPartial', {
            arguments: { elements: partial },
          });
          if (onPartial) onPartial(partial);
          await this.sleep(50); // Small delay for animation
        }
      }

      // Send final input
      await this.sendNotification('app/host/toolInput', {
        arguments: args,
        toolInfo: {
          id: this.toolCallId,
          name: toolName,
        },
      });
      
      if (onFinal) onFinal(args);

      return result;
    } catch (error) {
      console.error('Error calling tool:', error);
      throw error;
    }
  }

  async loadWidgetResource(uri) {
    try {
      // First try: Call MCP server to get resource
      try {
        const response = await fetch(CONFIG.MCP_SERVER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'resources/read',
            params: {
              uri: uri,
            },
          }),
        });

        if (response.ok) {
          // Handle SSE or JSON response
          const contentType = response.headers.get('content-type') || '';
          let result;
          
          if (contentType.includes('text/event-stream')) {
            const text = await response.text();
            const lines = text.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  if (data.jsonrpc === '2.0' && data.id) {
                    result = data;
                    break;
                  }
                } catch (e) {
                  // Continue parsing
                }
              }
            }
          } else {
            result = await response.json();
          }
          
          if (result?.error) {
            throw new Error(result.error.message || 'Resource read failed');
          }
          
          const html = result?.result?.contents?.[0]?.text;
          if (html && this.iframe) {
            this.iframe.srcdoc = html;
            return;
          }
        }
      } catch (apiError) {
        console.warn('MCP resource API failed, trying direct load:', apiError);
      }

      // Fallback: Load widget HTML directly from MCP server dist folder
      // Since we're in the same project, we can try to fetch it directly
      try {
        const widgetUrl = CONFIG.WIDGET_HTML_URL || 'http://localhost:3001/widget.html';
        const response = await fetch(widgetUrl);
        if (response.ok) {
          const html = await response.text();
          if (this.iframe) {
            this.iframe.srcdoc = html;
            return;
          }
        }
      } catch (directError) {
        console.warn('Direct widget load failed:', directError);
      }

      // Last resort: Load from local dist folder (if served statically)
      // This requires the widget HTML to be served as a static file
      throw new Error('Could not load widget resource. Make sure MCP server is running and widget HTML is accessible.');
    } catch (error) {
      console.error('Error loading widget resource:', error);
      throw error;
    }
  }

  chunkString(str, chunkSize) {
    const chunks = [];
    for (let i = 0; i < str.length; i += chunkSize) {
      chunks.push(str.slice(i, i + chunkSize));
    }
    return chunks;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy() {
    window.removeEventListener('message', this.handleMessage.bind(this));
  }
}
