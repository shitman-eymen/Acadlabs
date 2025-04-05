import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

export const availableModels = [
  { id: 'qwen-2.5-32b', provider: 'Default' },
  { id: 'qwen-2.5-coder-32b', provider: 'Default' },
  { id: 'qwen-qwq-32b', provider: 'Default' },
  { id: 'deepseek-r1-distill-qwen-32b', provider: 'DeepSeek / Alibaba Cloud' },
  { id: 'deepseek-r1-distill-llama-70b', provider: 'DeepSeek / Meta' },
  { id: 'gemma2-9b-it', provider: 'Google' },
  { id: 'distil-whisper-large-v3-en', provider: 'Hugging Face' },
  { id: 'llama-3.1-8b-instant', provider: 'Meta' },
  { id: 'llama-3.2-11b-vision-preview', provider: 'Meta' },
  { id: 'llama-3.2-1b-preview', provider: 'Meta' },
  { id: 'llama-3.2-3b-preview', provider: 'Meta' },
  { id: 'llama-3.2-90b-vision-preview', provider: 'Meta' },
  { id: 'llama-3.3-70b-specdec', provider: 'Meta' },
  { id: 'llama-3.3-70b-versatile', provider: 'Meta' },
  { id: 'llama-guard-3-8b', provider: 'Meta' },
  { id: 'llama3-70b-8192', provider: 'Meta' },
  { id: 'llama3-8b-8192', provider: 'Meta' }
];

export async function* getGroqChatCompletion(userMessage, modelId = "llama-3.1-8b-instant", imageBase64 = null) {
  // Gunakan model yang lebih kecil dan stabil sebagai default
  
  const messages = [
    {
      role: "system",
      content: "You are a helpful AI assistant. When sharing code examples, always wrap them in triple backticks with the appropriate language identifier, like ```javascript or ```python."
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
    // Tidak perlu implementasi timeout manual karena bisa menyebabkan masalah
    // dengan stream yang sudah dibuka
    
    // Gunakan streaming API dengan parameter yang lebih konservatif
    const stream = await groq.chat.completions.create({
      messages,
      model: modelId,
      temperature: 0.5,
      max_tokens: 2000, // Lebih konservatif untuk menghindari timeout
      stream: true,
    });
    
    let isFirstChunk = true;
    
    for await (const chunk of stream) {
      // Get the content from the chunk
      const content = chunk.choices[0]?.delta?.content || '';
      
      if (content) {
        yield { content, isFirstChunk };
        
        if (isFirstChunk) {
          isFirstChunk = false;
        }
      }
    }
    
    // Pastikan respons lengkap dengan mengirim sinyal selesai
    yield { content: '', isComplete: true };
    
  } catch (error) {
    console.error("Groq API error:", error);
    
    // Jika error terjadi, coba gunakan model yang lebih kecil dan stabil
    try {
      yield { content: "\n\nMencoba dengan model alternatif...\n\n" };
      
      // Gunakan model yang paling stabil dan kecil
      const fallbackModel = "llama-3.1-8b-instant";
      
      // Pesan yang lebih sederhana untuk fallback
      const simplifiedMessages = [
        {
          role: "system",
          content: "You are a helpful assistant. Keep responses concise."
        },
        {
          role: "user",
          content: userMessage.length > 1000 
            ? userMessage.substring(0, 1000) + "..." // Potong pesan yang terlalu panjang
            : userMessage
        }
      ];
      
      const fallbackStream = await groq.chat.completions.create({
        messages: simplifiedMessages,
        model: fallbackModel,
        temperature: 0.3, // Lebih rendah untuk respons yang lebih deterministik
        max_tokens: 1000, // Lebih rendah untuk fallback
        stream: true,
      });
      
      for await (const chunk of fallbackStream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield { content };
        }
      }
      
      // Sinyal selesai untuk fallback
      yield { content: '', isComplete: true };
      
    } catch (fallbackError) {
      console.error("Fallback model error:", fallbackError);
      yield { 
        content: "\n\nMaaf, saya mengalami masalah teknis. Silakan coba lagi dengan pertanyaan yang lebih singkat atau model yang berbeda.", 
        error: true,
        isComplete: true
      };
    }
  }
}