"""
Python backend server using Claude API
Handles prompt-to-Excalidraw elements conversion using Claude's tool calling
"""
import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from anthropic import Anthropic

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Anthropic client
client: Anthropic | None = None


class PromptRequest(BaseModel):
    prompt: str


class ElementsResponse(BaseModel):
    elements: list


def get_client():
    """Get or create Anthropic client"""
    global client
    if client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY or CLAUDE_API_KEY environment variable not set")
        client = Anthropic(api_key=api_key)
    return client


@app.post("/api/chat", response_model=ElementsResponse)
async def convert_prompt(request: PromptRequest):
    """Convert a prompt to Excalidraw elements using Claude"""
    try:
        print(f"Received prompt: {request.prompt}")
        
        client = get_client()
        
        # Define tool for creating Excalidraw diagrams
        tools = [{
            "name": "create_excalidraw_diagram",
            "description": "Create an Excalidraw diagram with visual elements",
            "input_schema": {
                "type": "object",
                "properties": {
                    "elements": {
                        "type": "array",
                        "description": "Array of Excalidraw element objects",
                        "items": {
                            "type": "object"
                        }
                    }
                },
                "required": ["elements"]
            }
        }]
        
        # Call Claude with tool
        # Try multiple model names (your API key determines which are available)
        models_to_try = [
            "claude-sonnet-4-5",           # Latest Sonnet 4.5
            "claude-3-5-sonnet-20240620",  # Claude 3.5 Sonnet
            "claude-3-sonnet-20240229",    # Claude 3 Sonnet
        ]
        
        last_error = None
        for model_name in models_to_try:
            try:
                print(f"Trying Claude model: {model_name}")
                response = client.messages.create(
                    model=model_name,
                    max_tokens=4096,
                    tools=tools,
            messages=[{
                "role": "user",
                "content": f"""Create an Excalidraw diagram for: {request.prompt}

IMPORTANT RULES:
1. Always start with a cameraUpdate element: {{"type":"cameraUpdate","width":800,"height":600,"x":0,"y":0}}
2. Use labeled shapes when possible: {{"type":"rectangle","id":"r1","x":100,"y":100,"width":200,"height":100,"label":{{"text":"Label","fontSize":20}}}}
3. Use colors from palette: #4a9eed (blue), #22c55e (green), #f59e0b (amber), #ef4444 (red)
4. Keep elements compact and readable
5. Use roundness for rounded rectangles: {{"roundness":{{"type":3}}}}

Call the create_excalidraw_diagram tool with your elements array."""
                    }]
                )
                
                print(f"Success with model: {model_name}")
                print(f"Response stop_reason: {response.stop_reason}")
                
                # Check if Claude wants to use a tool
                if response.stop_reason == "tool_use":
                    for block in response.content:
                        if block.type == "tool_use" and block.name == "create_excalidraw_diagram":
                            elements = block.input.get("elements", [])
                            print(f"Got {len(elements)} elements from Claude tool call")
                            
                            if not isinstance(elements, list):
                                raise HTTPException(status_code=500, detail="Tool response is not an array")
                            
                            return ElementsResponse(elements=elements)
                    
                    raise HTTPException(status_code=500, detail="No create_excalidraw_diagram tool call found")
                
                raise HTTPException(status_code=500, detail=f"Unexpected stop_reason: {response.stop_reason}")
                
            except Exception as e:
                if "not_found_error" in str(e):
                    print(f"Model {model_name} not available, trying next...")
                    last_error = e
                    continue
                else:
                    # Non-model error, raise immediately
                    raise
        
        # All models failed
        raise HTTPException(status_code=500, detail=f"No Claude models available. Last error: {last_error}")
        
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "model": "claude-3-5-sonnet-20240620"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)
