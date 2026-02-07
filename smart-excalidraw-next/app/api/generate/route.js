import { NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm-client';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, PRESENTATION_PLAN_PROMPT, PRESENTATION_SYSTEM_PROMPT, PRESENTATION_STEP_PROMPT } from '@/lib/prompts';

/**
 * POST /api/generate
 * Generate Excalidraw code based on user input
 */
export async function POST(request) {
  try {
    const { config, userInput, chartType, presentationMode, plan, existingElements, stepNumber, totalSteps } = await request.json();
    const accessPassword = request.headers.get('x-access-password');

    // Check if using server-side config with access password
    let finalConfig = config;
    if (accessPassword) {
      const envPassword = process.env.ACCESS_PASSWORD;
      if (!envPassword) {
        return NextResponse.json(
          { error: 'Access password not configured on server' },
          { status: 400 }
        );
      }
      if (accessPassword !== envPassword) {
        return NextResponse.json(
          { error: 'Incorrect access password' },
          { status: 401 }
        );
      }
      // Use server-side config
      finalConfig = {
        type: process.env.SERVER_LLM_TYPE,
        baseUrl: process.env.SERVER_LLM_BASE_URL,
        apiKey: process.env.SERVER_LLM_API_KEY,
        model: process.env.SERVER_LLM_MODEL,
      };
      if (!finalConfig.type || !finalConfig.apiKey) {
        return NextResponse.json(
          { error: 'Server LLM configuration is incomplete' },
          { status: 500 }
        );
      }
    } else if (!config || !userInput) {
      return NextResponse.json(
        { error: 'Missing required parameters: config, userInput' },
        { status: 400 }
      );
    }

    // Build messages array
    let fullMessages;

    if (presentationMode) {
      if (!plan) {
        // Step 0: Generate the drawing plan
        fullMessages = [
          { role: 'system', content: 'You are a diagram planning assistant. Create concise, actionable drawing plans.' },
          { role: 'user', content: PRESENTATION_PLAN_PROMPT(userInput, chartType) }
        ];
      } else {
        // Step 1-N: Generate elements for a specific step
        fullMessages = [
          { role: 'system', content: PRESENTATION_SYSTEM_PROMPT },
          { role: 'user', content: PRESENTATION_STEP_PROMPT(plan, existingElements, stepNumber, totalSteps, userInput, chartType) }
        ];
      }
    } else {
      // Standard single-shot generation
      let userMessage;

      // Handle different input types
      if (typeof userInput === 'object' && userInput.image) {
        // Image input with text and image data
        const { text, image } = userInput;
        userMessage = {
          role: 'user',
          content: USER_PROMPT_TEMPLATE(text, chartType),
          image: {
            data: image.data,
            mimeType: image.mimeType
          }
        };
      } else {
        // Regular text input
        userMessage = {
          role: 'user',
          content: USER_PROMPT_TEMPLATE(userInput, chartType)
        };
      }

      fullMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        userMessage
      ];
    }

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await callLLM(finalConfig, fullMessages, (chunk) => {
            // Send each chunk as SSE
            const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
          });

          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Error in stream:', error);
          const errorData = `data: ${JSON.stringify({ error: error.message })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error generating code:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate code' },
      { status: 500 }
    );
  }
}
