import { MockMcpAppHost } from './mock-host.js';
import { CONFIG } from './config.js';

/**
 * Loads and initializes the Excalidraw widget
 */
export class WidgetLoader {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.host = null;
    this.iframe = null;
  }

  async load() {
    try {
      // Create iframe with explicit dimensions
      this.iframe = document.createElement('iframe');
      this.iframe.id = 'excalidraw-widget';
      this.iframe.style.cssText = 'width: 100%; height: 100%; min-width: 800px; min-height: 600px; border: none; background: #ffffff; display: block;';
      this.iframe.sandbox = 'allow-scripts allow-same-origin allow-popups';
      
      console.log('[Widget Loader] Container dimensions:', this.container.offsetWidth, 'x', this.container.offsetHeight);
      
      this.container.appendChild(this.iframe);

      // Create mock host
      this.host = new MockMcpAppHost(this.iframe);

      // Try to load widget HTML directly
      // Option 1: Try loading from MCP server dist folder (if served)
      let widgetHtml = null;
      
      // Try direct fetch from configured URL
      const possibleUrls = [
        CONFIG.WIDGET_HTML_URL,
      ].filter(Boolean);

      for (const url of possibleUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            widgetHtml = await response.text();
            break;
          }
        } catch (e) {
          // Try next URL
          continue;
        }
      }

      // Option 2: Try MCP resource API
      if (!widgetHtml) {
        try {
          await this.host.loadWidgetResource(CONFIG.WIDGET_RESOURCE_URI);
          await this.waitForIframeLoad();
          return this.host;
        } catch (resourceError) {
          console.warn('Resource API failed, trying alternative:', resourceError);
        }
      }

      // If we got HTML directly, load it
      if (widgetHtml && this.iframe) {
        this.iframe.srcdoc = widgetHtml;
        await this.waitForIframeLoad();
        // Give widget time to initialize and connect to mock host
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.host;
      }

      throw new Error('Could not load widget HTML. Make sure MCP server is running and widget HTML is accessible.');
    } catch (error) {
      console.error('Error loading widget:', error);
      throw error;
    }
  }

  waitForIframeLoad() {
    return new Promise((resolve) => {
      if (this.iframe.contentDocument?.readyState === 'complete') {
        resolve();
      } else {
        this.iframe.onload = () => resolve();
      }
    });
  }

  async callCreateView(elements) {
    if (!this.host) {
      throw new Error('Widget not loaded');
    }

    const elementsJson = JSON.stringify(elements);
    
    return await this.host.callTool(
      'create_view',
      { elements: elementsJson },
      (partial) => {
        // Partial input callback
        console.log('Partial input:', partial);
      },
      (final) => {
        // Final input callback
        console.log('Final input:', final);
      }
    );
  }

  destroy() {
    if (this.host) {
      this.host.destroy();
    }
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
  }
}
