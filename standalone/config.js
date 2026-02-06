// Configuration
export const CONFIG = {
  // Backboard.io API configuration
  // Get your API key and endpoint from: https://app.backboard.io/quickstart
  BACKBOARD_API_KEY: 'espr_Zf5Q8X4VscdEuzXV-fEvogdPWeFR0jVuNt2GWvcvl8g',
  
  // Backboard.io API uses Assistant -> Thread -> Message architecture
  // Base URL: https://app.backboard.io/api
  // Authentication: X-API-Key header
  
  // MCP Server configuration
  MCP_SERVER_URL: 'http://localhost:3001/mcp',
  
  // Widget resource URI (from MCP server)
  WIDGET_RESOURCE_URI: 'ui://excalidraw/mcp-app.html',
  
  // Direct URL to widget HTML (served by MCP server)
  WIDGET_HTML_URL: 'http://localhost:3001/mcp-app.html',
};
