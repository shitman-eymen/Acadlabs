import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Coins, Sun, Moon, KeyRound, Upload, X, FileText, Computer, ChevronDown } from 'lucide-react';
import { getGroqChatCompletion } from './groq';
import { CodeBlock } from './components/CodeBlock';
import { FileUploader } from './components/FileUploader';
import { ModelSelector } from './components/ModelSelector';
import { PDFViewer } from './components/PDFViewer';

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
  pdfFile?: File;
}

type ThemeMode = 'light' | 'dark' | 'system';
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as ThemeMode) || 'system';
  });
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  const [greeting, setGreeting] = useState('Pagi');
  const [themeColor, setThemeColor] = useState('#00B7FF');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const themeSelectorRef = useRef<HTMLDivElement>(null);

  // Determine if dark mode should be active based on theme mode
  const isDarkMode = () => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const [darkMode, setDarkMode] = useState(isDarkMode());

  // Update dark mode when theme mode changes
  useEffect(() => {
    const updateDarkMode = () => {
      const shouldBeDark = isDarkMode();
      setDarkMode(shouldBeDark);
      document.documentElement.classList.toggle('dark', shouldBeDark);
    };

    updateDarkMode();

    // Listen for system preference changes if in system mode
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateDarkMode();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  // Save theme mode to localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  // Determine time of day and set appropriate greeting and color
  useEffect(() => {
    const updateTimeBasedUI = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeInMinutes = hours * 60 + minutes;

      // Morning: 12 AM to 10 AM
      if (timeInMinutes >= 0 && timeInMinutes <= 10 * 60) {
        setTimeOfDay('morning');
        setGreeting('Pagi');
        setThemeColor('#00B7FF'); // Light blue
      } 
      // Afternoon: 11 AM to 3:30 PM
      else if (timeInMinutes > 10 * 60 && timeInMinutes <= 15 * 60 + 30) {
        setTimeOfDay('afternoon');
        setGreeting('Siang');
        setThemeColor('#FF0000'); // Red
      } 
      // Evening: 3:31 PM to 7 PM
      else if (timeInMinutes > 15 * 60 + 30 && timeInMinutes <= 19 * 60) {
        setTimeOfDay('evening');
        setGreeting('Sore');
        setThemeColor('#FF6600'); // Orange
      } 
      // Night: 7:01 PM to 11:59 PM
      else {
        setTimeOfDay('night');
        setGreeting('Malam');
        setThemeColor('#6A0DAD'); // Purple for night
      }
    };

    updateTimeBasedUI();
    // Update every minute
    const interval = setInterval(updateTimeBasedUI, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close theme selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeSelectorRef.current && !themeSelectorRef.current.contains(event.target as Node)) {
        setShowThemeSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if ((!input.trim() && !preview && !pdfFile) || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: input,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      imageUrl: preview || undefined,
      pdfFile: pdfFile || undefined,
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
      setPdfFile(null);
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
    pdfFile?: File;
  }) => {
    if (result.imageUrl) {
      setPreview(result.imageUrl);
      setInput(result.fileName ? `Analyze this image: ${result.fileName}` : '');
    } else if (result.pdfFile) {
      setPdfFile(result.pdfFile);
      setInput(`Please analyze this PDF: ${result.fileName}`);
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
        
        {message.pdfFile && (
          <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <PDFViewer file={message.pdfFile} />
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
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 transition-all duration-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-300 font-medium">A</span>
              </div>
              <h1 className="text-base font-medium text-gray-800 dark:text-white">
                AcadLabs
              </h1>
            </div>
            <div className="relative" ref={themeSelectorRef}>
              <button
                onClick={() => setShowThemeSelector(!showThemeSelector)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                aria-label="Toggle theme mode"
              >
                {themeMode === 'light' ? (
                  <Sun className="w-5 h-5 text-gray-600" />
                ) : themeMode === 'dark' ? (
                  <Moon className="w-5 h-5 text-gray-300" />
                ) : (
                  <Computer className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
              </button>
              
              {showThemeSelector && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700 animate-fadeIn">
                  <button
                    onClick={() => {
                      setThemeMode('light');
                      setShowThemeSelector(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Sun className="w-4 h-4 mr-2 text-yellow-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Light Mode</span>
                  </button>
                  <button
                    onClick={() => {
                      setThemeMode('dark');
                      setShowThemeSelector(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Moon className="w-4 h-4 mr-2 text-blue-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</span>
                  </button>
                  <button
                    onClick={() => {
                      setThemeMode('system');
                      setShowThemeSelector(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Computer className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">System Default</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center min-h-screen pt-16 pb-24">
        {messages.length === 0 ? (
          <div className="text-center py-20 w-full max-w-md mx-auto px-4">
            <h2 className="text-3xl font-semibold text-gray-800 dark:text-white mb-2">
              Selamat <span style={{ color: themeColor }}>{greeting}</span>
            </h2>
            <p className="text-gray-600 dark:text-blue-500 mb-16">
              Apa Yang bisa Saya bantu?
            </p>
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto px-4 space-y-6">
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

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 p-4 transition-colors duration-200">
        <div className="max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="relative">
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
            
            {pdfFile && (
              <div className="relative mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 px-3 py-2">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-300" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{pdfFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPdfFile(null)}
                    className="p-1 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Bot className="w-5 h-5" />
              </button>
              
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tulis di sini..."
                className="flex-1 bg-transparent border-none focus:outline-none text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 py-2 px-1"
                disabled={isLoading}
              />
              
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setShowUploader(true)}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Upload className="w-5 h-5" />
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && !preview && !pdfFile)}
                  className="ml-1 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="mt-2 flex items-center justify-center">
              <button
                type="button"
                className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
                onClick={() => setShowThemeSelector(!showThemeSelector)}
              >
                <span>Models</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;