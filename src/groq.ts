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

export async function* getGroqChatCompletion(userMessage: string) {
  const stream = await groq.chat.completions.create({
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
    model: "llama-3.2-90b-vision-preview",
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
}