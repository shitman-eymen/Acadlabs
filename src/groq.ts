import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export async function* getGroqChatCompletion(userMessage: string, modelId: string = "llama-3.2-90b-vision-preview", imageBase64: string | null = null) {
  const messages = [
    {
      role: "system",
      content: "You are a helpful AI assistant."
    }
  ];

  if (imageBase64) {
    messages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: imageBase64
          }
        },
        {
          type: "text",
          text: userMessage || "Please analyze this image."
        }
      ]
    });
  } else {
    messages.push({
      role: "user",
      content: userMessage
    });
  }

  try {
    const stream = await groq.chat.completions.create({
      messages,
      model: modelId,
      temperature: 0.5,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: true
    });

    let tokenUsage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };

    for await (const chunk of stream) {
      if (chunk.usage) {
        tokenUsage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens
        };
      }
      yield { content: chunk.choices[0]?.delta?.content || '', tokenUsage };
    }
  } catch (error) {
    console.error("Error in Groq streaming:", error);
    throw error;
  }
}

export async function listModels() {
  try {
    const models = await groq.models.list();
    return models.data;
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

export async function uploadFile(file: File, purpose: string = 'batch') {
  try {
    const content = await file.arrayBuffer();
    const buffer = Buffer.from(content);
    const uploadedFile = await groq.files.create({
      file: buffer,
      purpose: purpose
    });
    return uploadedFile;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export async function listFiles() {
  try {
    const files = await groq.files.list();
    return files.data;
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

export async function deleteFile(fileId: string) {
  try {
    const response = await groq.files.delete(fileId);
    return response;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

// Example function for streaming with a stop sequence
export async function getGroqChatStreamWithStop(userMessage: string, modelId: string = "llama-3.2-90b-vision-preview", stopSequence: string | string[] | null = null) {
  return groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a helpful AI assistant."
      },
      {
        role: "user",
        content: userMessage
      }
    ],
    model: modelId,
    temperature: 0.5,
    max_completion_tokens: 1024,
    top_p: 1,
    stop: stopSequence,
    stream: true
  });
}
