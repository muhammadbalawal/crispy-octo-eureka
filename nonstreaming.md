Quickstart Guide
Get started with Backboard in minutes. Create an assistant, send messages, call tools, upload documents, and enable persistent memory across conversations.
First Message
Create an assistant, initialize a thread, and send your first message to get a response.
first-message.js
javascript

// Install: npm install backboard-sdk
import { BackboardClient } from 'backboard-sdk';

async function main() {
  // Initialize the Backboard client
  const client = new BackboardClient({
    apiKey: 'YOUR_API_KEY'
  });

  // Create an assistant
  const assistant = await client.createAssistant({
    name: 'My First Assistant',
    system_prompt: 'A helpful assistant'
  });

  // Create a thread
  const thread = await client.createThread(assistant.assistantId);

  // Send a message and get the complete response
  const response = await client.addMessage(thread.threadId, {
    content: 'Hello! Tell me a fun fact about space.',
    llm_provider: 'openai',
    model_name: 'gpt-4o',
    stream: false
  });

  // Print the AI's response
  console.log(response.content);
}

main().catch(console.error);
Tool Calls
Define custom functions for your assistant to call. Handle tool call requests and submit outputs to continue the conversation.
tool-calls.js
javascript

// Install: npm install backboard-sdk
import { BackboardClient } from 'backboard-sdk';

async function main() {
  // Initialize the Backboard client
  const client = new BackboardClient({
    apiKey: 'YOUR_API_KEY'
  });

  // Define a tool (function) for the assistant to call
  const tools = [{
    type: 'function',
    function: {
      name: 'get_current_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name' }
        },
        required: ['location']
      }
    }
  }];

  // Create an assistant with the tool
  const assistant = await client.createAssistant({
    name: 'Weather Assistant',
    system_prompt: 'You are a helpful weather assistant',
    tools: tools
  });

  // Create a thread
  const thread = await client.createThread(assistant.assistantId);

  // Send a message that triggers the tool call
  const response = await client.addMessage(thread.threadId, {
    content: "What's the weather in San Francisco?",
    stream: false
  });

  // Check if the assistant requires action (tool call)
  if (response.status === 'REQUIRES_ACTION' && response.toolCalls) {
    const toolOutputs = [];
    
    // Process each tool call
    for (const tc of response.toolCalls) {
      if (tc.function.name === 'get_current_weather') {
        // Get parsed arguments (required parameters are guaranteed by API)
        const args = tc.function.parsedArguments;
        const location = args.location;
        
        // Execute your function and format the output
        const weatherData = {
          temperature: '68°F',
          condition: 'Sunny',
          location: location
        };
        
        toolOutputs.push({
          tool_call_id: tc.id,
          output: JSON.stringify(weatherData)
        });
      }
    }
    
    // Submit the tool outputs back to continue the conversation
    const finalResponse = await client.submitToolOutputs(
      thread.threadId,
      response.runId,
      toolOutputs
    );
    
    console.log(finalResponse.content);
  }
}

main().catch(console.error);
Document Upload & Interaction
Upload documents to your assistant and query their contents. Documents are automatically indexed and made searchable.
documents.js
javascript

// Install: npm install backboard-sdk
import { BackboardClient } from 'backboard-sdk';

async function main() {
  // Initialize the Backboard client
  const client = new BackboardClient({
    apiKey: 'YOUR_API_KEY'
  });

  // Create an assistant
  const assistant = await client.createAssistant({
    name: 'Document Assistant',
    system_prompt: 'You are a helpful document analysis assistant'
  });

  // Upload a document to the assistant
  const document = await client.uploadDocumentToAssistant(
    assistant.assistantId,
    'my_document.pdf'
  );

  // Wait for the document to be indexed
  console.log('Waiting for document to be indexed...');
  while (true) {
    const status = await client.getDocumentStatus(document.documentId);
    
    if (status.status === 'indexed') {
      console.log('Document indexed successfully!');
      break;
    } else if (status.status === 'failed') {
      console.log('Document indexing failed:', status.statusMessage);
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Create a thread
  const thread = await client.createThread(assistant.assistantId);

  // Ask a question about the document
  const response = await client.addMessage(thread.threadId, {
    content: 'What are the key points in the uploaded document?',
    stream: false
  });
  
  console.log(response.content);
}

main().catch(console.error);
Memory - Persistent Context
Enable memory to make your assistant remember information across conversations. Set memory="Auto" to automatically save and retrieve relevant context.
memory.js
javascript

// Install: npm install backboard-sdk
import { BackboardClient } from 'backboard-sdk';

async function main() {
  // Initialize the Backboard client
  const client = new BackboardClient({
    apiKey: 'YOUR_API_KEY'
  });
  
  // Create an assistant
  const assistant = await client.createAssistant({
    name: 'Memory Assistant',
    system_prompt: 'You are a helpful assistant with persistent memory'
  });
  
  // Create first thread and share information
  const thread1 = await client.createThread(assistant.assistantId);
  
  // Share information with memory enabled
  const response1 = await client.addMessage(thread1.threadId, {
    content: 'My name is Sarah and I work as a software engineer at Google.',
    memory: 'Auto',  // Enable memory - automatically saves relevant info
    stream: false
  });
  console.log('AI:', response1.content);
  
  // Optional: Poll for memory operation completion
  // const memoryOpId = response1.memoryOperationId;
  // if (memoryOpId) {
  //   while (true) {
  //     const statusResponse = await fetch(
  //       `${baseUrl}/assistants/memories/operations/${memoryOpId}`,
  //       { headers: { 'X-API-Key': apiKey } }
  //     );
  //     if (statusResponse.ok) {
  //       const data = await statusResponse.json();
  //       if (['COMPLETED', 'ERROR'].includes(data.status)) {
  //         console.log('Memory operation:', data.status);
  //         break;
  //       }
  //     }
  //     await new Promise(resolve => setTimeout(resolve, 1000));
  //   }
  // }
  
  // Create a new thread to test memory recall
  const thread2 = await client.createThread(assistant.assistantId);
  
  // Ask what the assistant remembers (in a completely new thread!)
  const response3 = await client.addMessage(thread2.threadId, {
    content: 'What do you remember about me?',
    memory: 'Auto',  // Searches and retrieves saved memories
    stream: false
  });
  console.log('AI:', response3.content);
  // Should mention: Sarah, Google, software engineer
}

main().catch(console.error);