# Backboard API Documentation

**Version:** v1.0.0  
**OAS:** 3.1.0

## Welcome to Backboard API

Build conversational AI applications with persistent memory and intelligent document processing.

**Endpoint URL:** `https://app.backboard.io/api`

---

## API Architecture

Understanding the core concepts of Backboard API will help you build powerful conversational AI applications.

### Assistant

An Assistant is an AI agent with specific instructions and capabilities. Think of it as a specialized AI persona that you configure once and use across multiple conversations.

**Key Properties:**

- `assistant_id` - Unique identifier for the assistant
- `name` - Human-readable name for your assistant
- `system_prompt` - Instructions that define the assistant's behavior and personality
- `llm_provider` - AI provider (e.g., "openai", "anthropic", "google")
- `model_name` - Specific model to use (e.g., "gpt-4o", "claude-3-5-sonnet-20241022")
- `tools` - Optional tools the assistant can use (web search, function calling, etc.)
- `embedding_provider` & `embedding_model_name` - Models used for RAG and memory operations

**Use Cases:**

- Customer support bot with specific product knowledge
- Code review assistant with particular coding standards
- Research assistant with domain expertise

### Thread

A Thread represents a persistent conversation session. It maintains the full context and history of messages between a user and an assistant.

**Key Properties:**

- `thread_id` - Unique identifier for the conversation thread
- `assistant_id` - The assistant associated with this thread
- Messages are automatically stored and retrieved within the thread

**Important Notes:**

- Threads maintain conversation history across multiple API calls
- Each thread is tied to a specific assistant
- You can have multiple threads per assistant (e.g., different users or topics)
- Threads persist indefinitely unless explicitly deleted

**Example Flow:**

- User creates Thread A → sends messages → conversation is saved
- Days later → same Thread A → assistant remembers full context

### Message

A Message is a single interaction within a thread - either from the user or the assistant's response.

**Key Properties:**

- `content` - The text content of the message
- `role` - Either "user" or "assistant"
- `thread_id` - Which thread this message belongs to
- `stream` - Whether to stream the response (true/false)
- `memory` - Memory mode: "Auto", "On", "Off" (controls persistent memory features)

**Streaming vs Non-Streaming:**

- Non-streaming: Wait for the complete response (simpler, use for batch processing)
- Streaming: Receive response in real-time chunks (better UX for chat interfaces)

### Document

Documents are files you upload to provide context to your assistant. They can be attached at the assistant level (available to all threads) or thread level (specific conversation only).

**Key Properties:**

- `document_id` - Unique identifier for the document
- `filename` - Original filename
- `status` - Processing status: "processing", "completed", "error"
- `assistant_id` or `thread_id` - Where the document is attached

**Supported Formats:**

- PDF documents
- Text files (.txt, .md)
- Microsoft Office (.docx, .xlsx, .pptx)
- CSV and JSON files
- Source code files

**Processing Pipeline:**

1. Upload document via API
2. Backboard chunks and indexes the content
3. Status changes from "processing" to "completed"
4. Document content is available for RAG (Retrieval-Augmented Generation)

### Memory

Memory is an advanced feature that enables assistants to remember facts, preferences, and context across conversations and even across different threads.

**Memory Modes:**

- "Off": No persistent memory, only uses conversation history
- "On": Explicitly saves and retrieves memories for context
- "Auto": Intelligently determines when to use memory (recommended)

**How It Works:**

- Automatically extracts key facts from conversations
- Stores them in a semantic knowledge base
- Retrieves relevant memories for future messages
- Works across different threads with the same assistant

**Example:**

- Thread 1: User mentions "I prefer Python over JavaScript"
- Thread 2 (days later): Assistant remembers this preference

---

## Typical Workflow

Here's how these components work together:

```
1. Create an Assistant
   └─ Define behavior, choose model, configure tools
   
2. Create a Thread (per conversation/user)
   └─ Links to the assistant you created
   
3. Upload Documents (optional)
   └─ Attach to assistant (all threads) or specific thread
   
4. Send Messages
   └─ User messages → Assistant responses
   └─ Conversation history is automatically maintained
   
5. Memory (optional)
   └─ Enable with memory="Auto" to persist learnings
```

---

## Core Features

### Persistent Conversations
Create conversation threads that maintain context across multiple messages and support file attachments.

### Intelligent Document Processing
Upload and process documents (PDF, text, Office files) with automatic chunking and indexing for retrieval.

### AI Assistants
Create specialized assistants with custom instructions, document access, and tool capabilities.

---

## Quickstart

```python
import requests

API_KEY = "your_api_key"
BASE_URL = "https://app.backboard.io/api"
HEADERS = {"X-API-Key": API_KEY}

# 1) Create assistant
response = requests.post(
    f"{BASE_URL}/assistants",
    json={"name": "Support Bot", "system_prompt": "After every response, pass a joke at the end of the response!"},
    headers=HEADERS,
)
assistant_id = response.json()["assistant_id"]

# 2) Create thread
response = requests.post(
    f"{BASE_URL}/assistants/{assistant_id}/threads",
    json={},
    headers=HEADERS,
)
thread_id = response.json()["thread_id"]

# 3) Send message
response = requests.post(
    f"{BASE_URL}/threads/{thread_id}/messages",
    headers=HEADERS,
    data={"content": "Tell me about Canada in detail.", "stream": "false", "memory": "Auto"},
)
print(response.json().get("content"))
```

Explore the Assistants, Threads, and Documents sections in the sidebar.

---

## Server

**Server:** `https://app.backboard.io/api` (Production)

---

## Authentication

**Required**  
**Selected Auth Type:** APIKeyHeader  
**Name:** `X-API-Key`  
**Value:** `QUxMIFlPVVIgQkFTRSBBUkUgQkVMT05HIFRPIFVT`

---

## API Endpoints

### Threads

#### List Threads
`GET /threads`

List all threads for the currently authenticated user.

**Query Parameters:**
- `skip` (integer, default: 0) - Integer numbers.
- `limit` (integer, default: 100) - Integer numbers.

**Responses:**

**200 - Successful Response** (application/json)
```json
[
  {
    "metadata_": {
      "additionalProperty": "anything"
    },
    "thread_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2026-02-07T04:00:46.791Z",
    "messages": []
  }
]
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/threads \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### Get Thread
`GET /threads/{thread_id}`

Retrieve a specific thread by its UUID, including all its messages.

**Path Parameters:**
- `thread_id` (uuid, required)

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "metadata_": {
    "additionalProperty": "anything"
  },
  "thread_id": "123e4567-e89b-12d3-a456-426614174000",
  "created_at": "2026-02-07T04:00:46.791Z",
  "messages": []
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/threads/123e4567-e89b-12d3-a456-426614174000 \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### Delete Thread
`DELETE /threads/{thread_id}`

Permanently delete a thread and all its associated messages.

**Path Parameters:**
- `thread_id` (uuid, required)

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "message": "string",
  "thread_id": "123e4567-e89b-12d3-a456-426614174000",
  "deleted_at": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/threads/123e4567-e89b-12d3-a456-426614174000 \
  --request DELETE \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### List Thread Documents
`GET /threads/{thread_id}/documents`

List all documents associated with a specific thread.

**Path Parameters:**
- `thread_id` (uuid, required)

**Responses:**

**200 - Successful Response** (application/json)
```json
[
  {
    "metadata_": {
      "additionalProperty": "anything"
    },
    "document_id": "123e4567-e89b-12d3-a456-426614174000",
    "filename": "string",
    "status": "pending",
    "status_message": "string",
    "summary": "string",
    "created_at": "2026-02-07T04:00:46.791Z",
    "updated_at": "2026-02-07T04:00:46.791Z"
  }
]
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/threads/123e4567-e89b-12d3-a456-426614174000/documents \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### Add Message to Thread with Optional Attachments
`POST /threads/{thread_id}/messages`

Add a user message to an existing thread with optional file attachments. Can send text only, attachments only, or both. Documents must be indexed before further messages are allowed. To choose a model, set llm_provider and model_name. If omitted, defaults are llm_provider=openai and model_name=gpt-4o. Set memory='Auto' to enable memory search and automatic memory operations. See the Model Library page in the dashboard (model-library page) for a current list of supported models and providers.

**Path Parameters:**
- `thread_id` (uuid, required)

**Body (multipart/form-data):**
- `content` (nullable)
- `files` (array, default: [])
- `llm_provider` (nullable) - LLM provider name (nullable). Default: openai.
- `memory` (default: "off", nullable) - Memory mode: 'Auto' (search and write), 'off' (disabled), 'Readonly' (search only). Default: off.
- `metadata` (nullable) - Optional metadata as JSON string. Can include custom_timestamp (ISO 8601 format) and other custom fields.
- `model_name` (nullable) - Model name (nullable). Default: gpt-4o.
- `send_to_llm` (default: "true", nullable) - Whether to send the message to the LLM for a response. If 'false', the message is saved but no AI response is generated. Default: true.
- `stream` (default: false)
- `web_search` (default: "off", nullable) - Web search mode: 'Auto' (enables web search tool for LLM), 'off' (disabled). Default: off.

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "message": "string",
  "thread_id": "123e4567-e89b-12d3-a456-426614174000",
  "content": "string",
  "message_id": "123e4567-e89b-12d3-a456-426614174000",
  "role": "user",
  "status": "IN_PROGRESS",
  "tool_calls": [
    {
      "additionalProperty": "anything"
    }
  ],
  "run_id": "string",
  "memory_operation_id": "string",
  "retrieved_memories": [
    {
      "id": "string",
      "memory": "string",
      "score": 1
    }
  ],
  "retrieved_files": [
    "string"
  ],
  "model_provider": "string",
  "model_name": "string",
  "input_tokens": 1,
  "output_tokens": 1,
  "total_tokens": 1,
  "created_at": "2026-02-07T04:00:46.791Z",
  "attachments": [
    {
      "document_id": "123e4567-e89b-12d3-a456-426614174000",
      "filename": "string",
      "status": "string",
      "file_size_bytes": 1,
      "summary": "string"
    }
  ],
  "timestamp": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/threads/123e4567-e89b-12d3-a456-426614174000/messages \
  --request POST \
  --header 'Content-Type: multipart/form-data' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --form 'content=' \
  --form 'llm_provider=' \
  --form 'model_name=' \
  --form 'stream=false' \
  --form 'memory=off' \
  --form 'web_search=off' \
  --form 'send_to_llm=true' \
  --form 'metadata='
```

---

#### Submit Tool Outputs for a Run
`POST /threads/{thread_id}/runs/{run_id}/submit-tool-outputs`

Submit the outputs of tool calls that an assistant message previously requested. This will continue the run. If stream=true, returns a Server-Sent Events stream.

**Path Parameters:**
- `thread_id` (uuid, required)
- `run_id` (required)

**Query Parameters:**
- `stream` (default: false)

**Body (application/json):**
- `tool_outputs` (array, required) - A list of tool outputs to submit.

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "message": "string",
  "thread_id": "123e4567-e89b-12d3-a456-426614174000",
  "run_id": "string",
  "content": "string",
  "message_id": "123e4567-e89b-12d3-a456-426614174000",
  "role": "user",
  "status": "IN_PROGRESS",
  "tool_calls": [
    {
      "additionalProperty": "anything"
    }
  ],
  "memory_operation_id": "string",
  "retrieved_memories": [
    {
      "id": "string",
      "memory": "string",
      "score": 1
    }
  ],
  "retrieved_files": [
    "string"
  ],
  "model_provider": "string",
  "model_name": "string",
  "input_tokens": 1,
  "output_tokens": 1,
  "total_tokens": 1,
  "created_at": "2026-02-07T04:00:46.791Z",
  "timestamp": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl 'https://app.backboard.io/api/threads/123e4567-e89b-12d3-a456-426614174000/runs/{run_id}/submit-tool-outputs' \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --data '{
  "tool_outputs": [
    {
      "tool_call_id": "",
      "output": ""
    }
  ]
}'
```

---

### Documents

#### Upload Document to Thread
`POST /threads/{thread_id}/documents`

Upload a document (e.g., PDF) to be associated with a specific thread and processed for RAG.

**Path Parameters:**
- `thread_id` (uuid, required)

**Body (multipart/form-data):**
- `file` (binary, required) - binary data, used to describe files

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "metadata_": {
    "additionalProperty": "anything"
  },
  "document_id": "123e4567-e89b-12d3-a456-426614174000",
  "filename": "string",
  "status": "pending",
  "status_message": "string",
  "summary": "string",
  "created_at": "2026-02-07T04:00:46.791Z",
  "updated_at": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/threads/123e4567-e89b-12d3-a456-426614174000/documents \
  --request POST \
  --header 'Content-Type: multipart/form-data' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --form 'file=@filename'
```

---

#### Delete Document
`DELETE /documents/{document_id}`

Delete a document by ID across assistant, thread, or message scope.

**Path Parameters:**
- `document_id` (required)

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "message": "string",
  "document_id": "123e4567-e89b-12d3-a456-426614174000",
  "filename": "string",
  "document_type": "string",
  "deleted_at": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl 'https://app.backboard.io/api/documents/{document_id}' \
  --request DELETE \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### Get Document Status
`GET /documents/{document_id}/status`

Get the processing status and details of a specific document.

**Path Parameters:**
- `document_id` (required)

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "document_id": "123e4567-e89b-12d3-a456-426614174000",
  "filename": "string",
  "document_type": "string",
  "status": "string",
  "status_message": "string",
  "file_size_bytes": 1,
  "total_tokens": 1,
  "chunk_count": 1,
  "processing_started_at": "2026-02-07T04:00:46.791Z",
  "processing_completed_at": "2026-02-07T04:00:46.791Z",
  "created_at": "2026-02-07T04:00:46.791Z",
  "updated_at": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl 'https://app.backboard.io/api/documents/{document_id}/status' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

### Assistants

#### Create Assistant
`POST /assistants`

Create a new assistant for the authenticated user. Optionally configure embedding model for RAG (defaults to OpenAI text-embedding-3-large with 3072 dimensions).

**Body (application/json):**
- `name` (required, min length: 1, max length: 255) - Name of the assistant
- `description` (nullable) - Optional system prompt for the assistant
- `embedding_dims` (nullable) - Embedding dimensions (e.g., 1024 for Cohere, 3072 for OpenAI text-embedding-3-large)
- `embedding_model_name` (nullable) - Embedding model name (e.g., text-embedding-3-large, text-embedding-004)
- `embedding_provider` (nullable) - Embedding provider (openai, google, cohere, etc.)
- `system_prompt` (nullable) - Optional system prompt (alias for description)
- `tok_k` (min: 1, max: 100, default: 10) - Document search top_k for the internal search_documents tool (default 10).
- `tools` (array, nullable) - List of tools available to the assistant

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "name": "string",
  "description": "string",
  "system_prompt": "string",
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "string",
        "description": "string",
        "parameters": {
          "type": "object",
          "properties": {
            "additionalProperty": {
              "type": "string",
              "description": "string",
              "enum": [
                "string"
              ],
              "properties": {
                "additionalProperty": "anything"
              },
              "items": {
                "additionalProperty": "anything"
              }
            }
          },
          "required": [
            "string"
          ]
        }
      }
    }
  ],
  "tok_k": 10,
  "embedding_provider": "string",
  "embedding_model_name": "string",
  "embedding_dims": 1,
  "assistant_id": "123e4567-e89b-12d3-a456-426614174000",
  "created_at": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/assistants \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --data '{
  "name": "",
  "description": "",
  "system_prompt": "",
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "",
        "description": "",
        "parameters": {
          "type": "object",
          "properties": {
            "additionalProperty": {
              "type": "",
              "description": "",
              "enum": [
                ""
              ],
              "properties": {
                "additionalProperty": "anything"
              },
              "items": {
                "additionalProperty": "anything"
              }
            }
          },
          "required": [
            ""
          ]
        }
      }
    }
  ],
  "tok_k": 10,
  "embedding_provider": "",
  "embedding_model_name": "",
  "embedding_dims": 1
}'
```

---

#### List Assistants
`GET /assistants`

List all assistants belonging to the authenticated user.

**Query Parameters:**
- `skip` (integer, default: 0)
- `limit` (integer, default: 100)

**Responses:**

**200 - Successful Response** (application/json)
```json
[
  {
    "name": "string",
    "description": "string",
    "system_prompt": "string",
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "string",
          "description": "string",
          "parameters": {
            "type": "object",
            "properties": {
              "additionalProperty": {
                "type": "string",
                "description": "string",
                "enum": [
                  "string"
                ],
                "properties": {
                  "additionalProperty": "anything"
                },
                "items": {
                  "additionalProperty": "anything"
                }
              }
            },
            "required": [
              "string"
            ]
          }
        }
      }
    ],
    "tok_k": 10,
    "embedding_provider": "string",
    "embedding_model_name": "string",
    "embedding_dims": 1,
    "assistant_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2026-02-07T04:00:46.791Z"
  }
]
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/assistants \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### Get Assistant
`GET /assistants/{assistant_id}`

Retrieve a specific assistant by its UUID.

**Path Parameters:**
- `assistant_id` (uuid, required)

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "name": "string",
  "description": "string",
  "system_prompt": "string",
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "string",
        "description": "string",
        "parameters": {
          "type": "object",
          "properties": {
            "additionalProperty": {
              "type": "string",
              "description": "string",
              "enum": [
                "string"
              ],
              "properties": {
                "additionalProperty": "anything"
              },
              "items": {
                "additionalProperty": "anything"
              }
            }
          },
          "required": [
            "string"
          ]
        }
      }
    }
  ],
  "tok_k": 10,
  "embedding_provider": "string",
  "embedding_model_name": "string",
  "embedding_dims": 1,
  "assistant_id": "123e4567-e89b-12d3-a456-426614174000",
  "created_at": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/assistants/123e4567-e89b-12d3-a456-426614174000 \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### Update Assistant
`PUT /assistants/{assistant_id}`

Update an assistant's attributes, including its name, description, and tools. Note: The 'tools' field will replace the existing list of tools. Embedding model cannot be changed after creation.

**Path Parameters:**
- `assistant_id` (uuid, required)

**Body (application/json):**
- `description` (nullable) - New system prompt for the assistant
- `name` (min length: 1, max length: 255, nullable) - New name for the assistant
- `system_prompt` (nullable) - New system prompt (alias for description)
- `tok_k` (min: 1, max: 100, nullable) - Document search top_k for the internal search_documents tool.
- `tools` (array, nullable) - New list of tools for the assistant. Replaces existing tools.

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "name": "string",
  "description": "string",
  "system_prompt": "string",
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "string",
        "description": "string",
        "parameters": {
          "type": "object",
          "properties": {
            "additionalProperty": {
              "type": "string",
              "description": "string",
              "enum": [
                "string"
              ],
              "properties": {
                "additionalProperty": "anything"
              },
              "items": {
                "additionalProperty": "anything"
              }
            }
          },
          "required": [
            "string"
          ]
        }
      }
    }
  ],
  "tok_k": 10,
  "embedding_provider": "string",
  "embedding_model_name": "string",
  "embedding_dims": 1,
  "assistant_id": "123e4567-e89b-12d3-a456-426614174000",
  "created_at": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/assistants/123e4567-e89b-12d3-a456-426614174000 \
  --request PUT \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --data '{
  "name": "",
  "description": "",
  "system_prompt": "",
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "",
        "description": "",
        "parameters": {
          "type": "object",
          "properties": {
            "additionalProperty": {
              "type": "",
              "description": "",
              "enum": [
                ""
              ],
              "properties": {
                "additionalProperty": "anything"
              },
              "items": {
                "additionalProperty": "anything"
              }
            }
          },
          "required": [
            ""
          ]
        }
      }
    }
  ],
  "tok_k": 1
}'
```

---

#### Delete Assistant
`DELETE /assistants/{assistant_id}`

Permanently delete an assistant and all its associated threads and documents.

**Path Parameters:**
- `assistant_id` (uuid, required)

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "message": "string",
  "assistant_id": "123e4567-e89b-12d3-a456-426614174000",
  "deleted_at": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/assistants/123e4567-e89b-12d3-a456-426614174000 \
  --request DELETE \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### Create Thread for Assistant
`POST /assistants/{assistant_id}/threads`

Create a new empty conversation thread under a specific assistant. Use the message endpoints to add messages to the thread.

**Path Parameters:**
- `assistant_id` (uuid, required)

**Body (application/json):**
Empty object

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "metadata_": {
    "additionalProperty": "anything"
  },
  "thread_id": "123e4567-e89b-12d3-a456-426614174000",
  "created_at": "2026-02-07T04:00:46.791Z",
  "messages": []
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/assistants/123e4567-e89b-12d3-a456-426614174000/threads \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --data '{}'
```

---

#### List Threads for Assistant
`GET /assistants/{assistant_id}/threads`

List all threads under a specific assistant for the authenticated user.

**Path Parameters:**
- `assistant_id` (uuid, required)

**Query Parameters:**
- `skip` (integer, default: 0)
- `limit` (integer, default: 100)

**Responses:**

**200 - Successful Response** (application/json)
```json
[
  {
    "metadata_": {
      "additionalProperty": "anything"
    },
    "thread_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2026-02-07T04:00:46.791Z",
    "messages": []
  }
]
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/assistants/123e4567-e89b-12d3-a456-426614174000/threads \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### List Assistant Documents
`GET /assistants/{assistant_id}/documents`

List all documents associated with a specific assistant.

**Path Parameters:**
- `assistant_id` (uuid, required)

**Responses:**

**200 - Successful Response** (application/json)
```json
[
  {
    "metadata_": {
      "additionalProperty": "anything"
    },
    "document_id": "123e4567-e89b-12d3-a456-426614174000",
    "filename": "string",
    "status": "pending",
    "status_message": "string",
    "summary": "string",
    "created_at": "2026-02-07T04:00:46.791Z",
    "updated_at": "2026-02-07T04:00:46.791Z"
  }
]
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/assistants/123e4567-e89b-12d3-a456-426614174000/documents \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### Upload Document to Assistant
`POST /assistants/{assistant_id}/documents`

Upload a document to be associated with a specific assistant (shared context for its threads).

**Path Parameters:**
- `assistant_id` (uuid, required)

**Body (multipart/form-data):**
- `file` (binary, required) - binary data, used to describe files

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "metadata_": {
    "additionalProperty": "anything"
  },
  "document_id": "123e4567-e89b-12d3-a456-426614174000",
  "filename": "string",
  "status": "pending",
  "status_message": "string",
  "summary": "string",
  "created_at": "2026-02-07T04:00:46.791Z",
  "updated_at": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/assistants/123e4567-e89b-12d3-a456-426614174000/documents \
  --request POST \
  --header 'Content-Type: multipart/form-data' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --form 'file=@filename'
```

---

### Memories (Collapsed)

**Operations:**
- `GET /assistants/{assistant_id}/memories`
- `POST /assistants/{assistant_id}/memories`
- `GET /assistants/{assistant_id}/memories/{memory_id}`
- `DELETE /assistants/{assistant_id}/memories/{memory_id}`
- `PUT /assistants/{assistant_id}/memories/{memory_id}`
- `GET /assistants/{assistant_id}/memories/stats`
- `GET /assistants/memories/operations/{operation_id}`

---

### Models

#### List All Models
`GET /models`

Get a list of all available models with their specifications (excluding pricing information).

**Query Parameters:**
- `model_type` (nullable) - Filter by model type: 'llm' or 'embedding'
- `provider` (nullable) - Filter by provider name
- `supports_tools` (nullable) - Filter by tool/function calling support
- `min_context` (nullable) - Minimum context limit
- `max_context` (nullable) - Maximum context limit
- `skip` (min: 0, default: 0) - Number of records to skip
- `limit` (min: 1, max: 500, default: 100) - Maximum number of records to return

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "models": [
    {
      "name": "string",
      "provider": "string",
      "model_type": "string",
      "context_limit": 1,
      "max_output_tokens": 1,
      "supports_tools": true,
      "api_mode": "string",
      "embedding_dimensions": 1,
      "last_updated": "2026-02-07T04:00:46.791Z"
    }
  ],
  "total": 1
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/models \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### List All Providers
`GET /models/providers`

Get a list of all unique model providers available in the system.

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "providers": [
    "string"
  ],
  "total": 1
}
```

**Example Request:**
```bash
curl https://app.backboard.io/api/models/providers \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### List Models by Provider
`GET /models/provider/{provider_name}`

Get all models from a specific provider.

**Path Parameters:**
- `provider_name` (required)

**Query Parameters:**
- `skip` (min: 0, default: 0) - Number of records to skip
- `limit` (min: 1, max: 500, default: 100) - Maximum number of records to return

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "models": [
    {
      "name": "string",
      "provider": "string",
      "model_type": "string",
      "context_limit": 1,
      "max_output_tokens": 1,
      "supports_tools": true,
      "api_mode": "string",
      "embedding_dimensions": 1,
      "last_updated": "2026-02-07T04:00:46.791Z"
    }
  ],
  "total": 1
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl 'https://app.backboard.io/api/models/provider/{provider_name}' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### Get Model by Name
`GET /models/{model_name}`

Get detailed information about a specific model by its name.

**Path Parameters:**
- `model_name` (required)

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "name": "string",
  "provider": "string",
  "model_type": "string",
  "context_limit": 1,
  "max_output_tokens": 1,
  "supports_tools": true,
  "api_mode": "string",
  "embedding_dimensions": 1,
  "last_updated": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl 'https://app.backboard.io/api/models/{model_name}' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### List All Embedding Models
`GET /models/embedding/all`

Get a list of all available embedding models with their specifications.

**Query Parameters:**
- `provider` (nullable) - Filter by provider name
- `min_dimensions` (nullable) - Minimum embedding dimensions
- `max_dimensions` (nullable) - Maximum embedding dimensions
- `skip` (min: 0, default: 0) - Number of records to skip
- `limit` (min: 1, max: 500, default: 100) - Maximum number of records to return

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "models": [
    {
      "name": "string",
      "provider": "string",
      "embedding_dimensions": 1,
      "context_limit": 1,
      "last_updated": "2026-02-07T04:00:46.791Z"
    }
  ],
  "total": 1
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl https://app.backboard.io/api/models/embedding/all \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### List All Embedding Model Providers
`GET /models/embedding/providers`

Get a list of all unique embedding model providers available in the system.

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "providers": [
    "string"
  ],
  "total": 1
}
```

**Example Request:**
```bash
curl https://app.backboard.io/api/models/embedding/providers \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```

---

#### Get Embedding Model by Name
`GET /models/embedding/{model_name}`

Get detailed information about a specific embedding model by its name.

**Path Parameters:**
- `model_name` (required)

**Responses:**

**200 - Successful Response** (application/json)
```json
{
  "name": "string",
  "provider": "string",
  "embedding_dimensions": 1,
  "context_limit": 1,
  "last_updated": "2026-02-07T04:00:46.791Z"
}
```

**422 - Validation Error** (application/json)

**Example Request:**
```bash
curl 'https://app.backboard.io/api/models/embedding/{model_name}' \
  --header 'X-API-Key: YOUR_SECRET_TOKEN'
```