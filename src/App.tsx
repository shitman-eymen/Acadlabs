import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Coins, Sun, Moon, KeyRound, Upload, X } from 'lucide-react';
import { getGroqChatCompletion } from './groq';
import { CodeBlock } from './components/CodeBlock';
import { FileUploader } from './components/FileUploader';
import { ModelSelector } from './components/ModelSelector';

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isCode?: boolean;
  language?: string;
  tokenUsage?: TokenUsage;
  imageUrl?: string;
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('llama-3.2-90b-vision-preview');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved
      ? JSON.parse(saved)
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const detectCodeBlock = (
    content: string
  ): { isCode: boolean; language: string; content: string } => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/;
    const match = content.match(codeBlockRegex);

    if (match) {
      return {
        isCode: true,
        language: match[1] || 'plaintext',
        content: match[2].trim(),
      };
    }

    return {
      isCode: false,
      language: '',
      content,
    };
  };

  const formatContent = (content: string): string => {
    content = content.replace(/^\d+\.\s+/gm, (match) => `\n${match}`);
    let bulletPointCounter = 1;
    content = content.replace(
      /^[•\-*]\s+/gm,
      (match) => `\n${bulletPointCounter++}. `
    );
    content = content.replace(/\n{3,}/g, '\n\n');
    return content.trim();
  };

  const formatBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !preview) || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: input,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      imageUrl: preview || undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const initialAssistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, initialAssistantMessage]);

      let accumulatedContent = '';
      for await (const { content: chunk, tokenUsage } of getGroqChatCompletion(
        input,
        selectedModel,
        preview
      )) {
        accumulatedContent += chunk;
        const { isCode, language, content } = detectCodeBlock(accumulatedContent);

        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content = content;
            lastMessage.isCode = isCode;
            lastMessage.language = language;
            lastMessage.tokenUsage = tokenUsage;
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry, an error occurred. Please check your API key configuration.',
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setPreview(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileProcessed = (result: {
    text?: string;
    imageUrl?: string;
    fileName: string;
  }) => {
    if (result.imageUrl) {
      setPreview(result.imageUrl);
      setInput(result.fileName ? `Analyze this image: ${result.fileName}` : '');
    } else if (result.text) {
      setInput(
        `Please analyze this content from ${result.fileName}:\n\n${result.text}`
      );
    }
    setShowUploader(false);
    inputRef.current?.focus();
  };

  const handleFileError = (error: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `Error processing file: ${error}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
    setShowUploader(false);
  };

  const renderMessage = (message: Message) => {
    if (message.isCode) {
      return (
        <>
          <CodeBlock
            code={message.content}
            language={message.language || 'plaintext'}
          />
          {message.tokenUsage && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 dark:text-gray-500">
              <Coins className="w-3 h-3" />
              <span>Tokens: {message.tokenUsage.totalTokens}</span>
              <span className="text-gray-500 dark:text-gray-400">
                (Prompt: {message.tokenUsage.promptTokens}, Response:{' '}
                {message.tokenUsage.completionTokens})
              </span>
            </div>
          )}
        </>
      );
    }

    return (
      <div className="relative">
        {message.imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img
              src={message.imageUrl}
              alt="Uploaded content"
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        )}
        <div className="mb-1 break-words whitespace-pre-line">
          {formatContent(message.content)
            .split('\n')
            .map((line, index) => {
              const isNumberedPoint = /^\d+\.\s+/.test(line);

              if (isNumberedPoint) {
                return (
                  <div
                    key={index}
                    className="pl-6 mb-3 list-decimal relative before:absolute before:left-2 before:content-[counter(list-item)] before:text-gray-500 dark:before:text-gray-400"
                  >
                    <span className="inline-block">
                      {formatBoldText(line.replace(/^\d+\.\s+/, ''))}
                    </span>
                  </div>
                );
              }

              return (
                <div key={index} className={`mb-3 ${index > 0 ? 'mt-2' : ''}`}>
                  {formatBoldText(line.trim())}
                </div>
              );
            })}
        </div>
        {message.tokenUsage && (
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-400 dark:text-gray-500">
            <Coins className="w-3 h-3" />
            <span>Tokens: {message.tokenUsage.totalTokens}</span>
            <span className="text-gray-500 dark:text-gray-400">
              (Prompt: {message.tokenUsage.promptTokens}, Response:{' '}
              {message.tokenUsage.completionTokens})
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 transition-colors duration-200">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 transition-all duration-200 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400 transition-transform duration-200 group-hover:scale-110" />
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 dark:bg-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
              </div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                AcadLabs (BETA)
              </h1>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 active:scale-95"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
          <div className="w-full">
            <ModelSelector
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 mt-16 mb-24">
        {messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative group inline-block">
              <Bot className="w-16 h-16 text-blue-600 dark:text-blue-400 transition-transform duration-300 group-hover:scale-110 mx-auto mb-6" />
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-blue-600 dark:bg-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
              Apa Yang bisa Saya bantu?
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Beri kami pertanyaan yang sulit!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                } animate-fadeIn`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-110 ${
                    message.role === 'user'
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {message.role === 'user' ? (
                    <div className="text-white font-semibold">U</div>
                  ) : (
                    <Bot className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  )}
                </div>
                <div
                  className={`flex-1 ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  <div
                    className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 transition-all duration-200 hover:shadow-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white'
                    }`}
                  >
                    {renderMessage(message)}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {message.timestamp}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {showUploader && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-lg w-full mx-4 animate-fadeIn">
              <FileUploader
                onProcessComplete={handleFileProcessed}
                onError={handleFileError}
                onClose={() => setShowUploader(false)}
              />
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          {preview && (
            <div className="relative mb-4 rounded-lg overflow-hidden">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-800/50 hover:bg-gray-800/70 text-white transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex gap-3 items-start">
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="flex-shrink-0 p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:shadow-md active:scale-95"
              title="Focus input"
            >
              <KeyRound className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tulis di sini..."
                rows={1}
                style={{
                  minHeight: '48px',
                  maxHeight: '120px',
                  height: 'auto',
                  resize: 'none',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(
                    target.scrollHeight,
                    120
                  )}px`;
                }}
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:shadow-md"
                disabled={isLoading}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowUploader(true)}
              className="flex-shrink-0 p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:shadow-md active:scale-95"
              title="Upload file"
            >
              <Upload className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !preview)}
              className="flex-shrink-0 bg-blue-600 dark:bg-blue-500 text-white p-3 rounded-full hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;