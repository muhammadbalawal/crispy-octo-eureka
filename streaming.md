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

  // Send a message and stream the response
  const stream = await client.addMessage(thread.threadId, {
    content: 'Tell me a short story about a robot learning to paint.',
    llm_provider: 'openai',
    model_name: 'gpt-4o',
    stream: true
  });

  // Print each chunk of content as it arrives
  for await (const chunk of stream) {
    if (chunk.type === 'content_streaming') {
      process.stdout.write(chunk.content || '');
    } else if (chunk.type === 'message_complete') {
      break;
    }
  }
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

  // Send a message and stream the response
  const stream = await client.addMessage(thread.threadId, {
    content: "What's the weather in San Francisco?",
    stream: true
  });

  for await (const chunk of stream) {
    // Stream content chunks
    if (chunk.type === 'content_streaming') {
      process.stdout.write(chunk.content);
    }
    
    // Handle tool call requirement
    else if (chunk.type === 'tool_submit_required') {
      const toolOutputs = [];
      
      // Process each tool call
      for (const tc of chunk.tool_calls) {
        const functionName = tc.function.name;
        const functionArgs = JSON.parse(tc.function.arguments);
        
        if (functionName === 'get_current_weather') {
          // Execute your function
          const location = functionArgs.location;
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
      
      // Submit tool outputs and stream the final response
      const toolStream = await client.submitToolOutputs(
        thread.threadId,
        chunk.run_id,
        toolOutputs,
        true
      );
      
      for await (const toolChunk of toolStream) {
        if (toolChunk.type === 'content_streaming') {
          process.stdout.write(toolChunk.content);
        } else if (toolChunk.type === 'message_complete') {
          break;
        }
      }
      break;
    }
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
      console.log('Indexing failed:', status.statusMessage);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Create a thread
  const thread = await client.createThread(assistant.assistantId);
  
  // Ask a question about the document and stream the response
  const stream = await client.addMessage(thread.threadId, {
    content: 'What are the key points in the document?',
    stream: true
  });
  
  for await (const chunk of stream) {
    if (chunk.type === 'content_streaming') {
      process.stdout.write(chunk.content || '');
    } else if (chunk.type === 'message_complete') {
      break;
    }
  }
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
  
  // Share information with memory enabled (streaming)
  console.log('Sharing info...');
  const stream1 = await client.addMessage(thread1.threadId, {
    content: 'My name is Sarah and I work as a software engineer at Google.',
    memory: 'Auto',  // Enable memory - automatically saves relevant info
    stream: true
  });
  
  let memoryOpId = null;
  for await (const chunk of stream1) {
    if (chunk.type === 'content_streaming') {
      process.stdout.write(chunk.content || '');
    } else if (chunk.type === 'memory_retrieved') {
      // Shows when memories are being searched
      const memories = chunk.memories || [];
      if (memories.length > 0) {
        console.log(`\n[Found ${memories.length} memories]`);
      }
    } else if (chunk.type === 'run_ended') {
      memoryOpId = chunk.memoryOperationId;
    }
  }
  console.log('\n');
  
  // Optional: Poll for memory operation completion
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
  
  // Ask what the assistant remembers (streaming)
  console.log('Testing memory recall...');
  const stream3 = await client.addMessage(thread2.threadId, {
    content: 'What do you remember about me?',
    memory: 'Auto',  // Searches and retrieves saved memories
    stream: true
  });
  
  for await (const chunk of stream3) {
    if (chunk.type === 'content_streaming') {
      process.stdout.write(chunk.content || '');
    }
  }
  console.log('\n');
  // Should mention: Sarah, Google, software engineer
}

main().catch(console.error);