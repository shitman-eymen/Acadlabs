import React, { useState, useRef, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Send, Bot, Sun, Moon, Upload, Computer } from 'lucide-react'
import { getGroqChatCompletion } from './utils/groq'
import { CodeBlock } from './components/CodeBlock'
import { FileUploader } from './components/FileUploader'
import { HighlightText } from './components/HighlightText'
import { css } from '@emotion/react'
import { availableModels } from './utils/groq'
import { motion, AnimatePresence } from 'framer-motion'
import { TypingIndicator } from './components/TypingIndicator';

const App = () => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false);
  const [shouldStopGeneration, setShouldStopGeneration] = useState(false);
  const [showUploader, setShowUploader] = useState(false)
  const [activeFileType, setActiveFileType] = useState('pdf')
  const [isUploading, setIsUploading] = useState(false)
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('themeMode') || 'system'
    }
    return 'system'
  })
  const [timeOfDay, setTimeOfDay] = useState('morning')
  const [greeting, setGreeting] = useState('Pagi')
  const [themeColor, setThemeColor] = useState('#00B7FF')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile')
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [editingMessageIndex, setEditingMessageIndex] = useState(null)
  const [editingText, setEditingText] = useState('')
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const editInputRef = useRef(null)

  useEffect(() => {
    const updateTimeBasedTheme = () => {
      const hour = new Date().getHours()
      let newTimeOfDay
      let newGreeting
      let newColor

      if (hour >= 0 && hour < 11) {
        newTimeOfDay = 'morning'
        newGreeting = 'Pagi'
        newColor = '#00B7FF'
      } else if (hour >= 11 && hour < 15.5) {
        newTimeOfDay = 'afternoon'
        newGreeting = 'Siang'
        newColor = '#FF0000'
      } else if (hour >= 15.5 && hour < 19) {
        newTimeOfDay = 'evening'
        newGreeting = 'Sore'
        newColor = '#FF6600'
      } else {
        newTimeOfDay = 'night'
        newGreeting = 'Malam'
        newColor = '#6A0DAD'
      }

      setTimeOfDay(newTimeOfDay)
      setGreeting(newGreeting)
      setThemeColor(newColor)
    }

    updateTimeBasedTheme()
    const interval = setInterval(updateTimeBasedTheme, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        if (themeMode === 'system') {
          setIsDarkMode(darkModeMediaQuery.matches)
          document.documentElement.classList.toggle('dark', darkModeMediaQuery.matches)
        }
      }

      handleChange()
      darkModeMediaQuery.addEventListener('change', handleChange)
      return () => darkModeMediaQuery.removeEventListener('change', handleChange)
    }
  }, [themeMode])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('themeMode', themeMode)
      if (themeMode === 'dark') {
        setIsDarkMode(true)
        document.documentElement.classList.add('dark')
      } else if (themeMode === 'light') {
        setIsDarkMode(false)
        document.documentElement.classList.remove('dark')
      }
    }
  }, [themeMode])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const [isTyping, setIsTyping] = useState(false);
  const [visibleResponse, setVisibleResponse] = useState('');
  const typingSpeed = 1000; // Increased from 50 to 80 milliseconds per character for slower typing
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
  
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    setVisibleResponse('');
    setIsLoading(true);
    setIsTyping(false); // Ensure typing animation is disabled
    setShouldStopGeneration(false); // Reset stop flag
  
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    
    try {
      console.log("Starting API request with model:", selectedModel);
      const messageGenerator = getGroqChatCompletion(userMessage, selectedModel);
      
      let fullResponse = '';
      
      for await (const { content, error } of messageGenerator) {
        if (shouldStopGeneration) {
          console.log("Generation stopped by user");
          break;
        }
        
        if (content) {
          if (content.includes("Memproses permintaan Anda")) {
            continue;
          }
          
          fullResponse += content;
          
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length > 0) {
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage?.role === 'assistant') {
                lastMessage.content = fullResponse;
              }
            }
            return newMessages;
          });
          
          setTimeout(scrollToBottom, 10);
        }
      }
      
      console.log("API request completed successfully");
    } catch (error) {
      console.error('Error during API request:', error);
      
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage?.role === 'assistant') {
            lastMessage.content = "Maaf, terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi.";
          }
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setShouldStopGeneration(false); // Reset stop flag
      scrollToBottom();
    }
  };
  
  const handleFileProcess = (result) => {
    if (result.text) {
      setMessages(prev => [...prev, { 
        role: 'user', 
        content: `Processed file: ${result.fileName}\n\n${result.text}`
      }])
    }
    setShowUploader(false)
  }

  const handleEditMessage = (index, content) => {
    setEditingMessageIndex(index)
    setEditingText(content)
    setTimeout(() => {
      editInputRef.current?.focus()
    }, 100)
  }

  const handleSaveEdit = async (index) => {
    if (!editingText.trim()) return
    
    const updatedMessages = [...messages]
    updatedMessages[index].content = editingText.trim()
    setMessages(updatedMessages)
    setEditingMessageIndex(null)
    
    if (index === messages.length - 2 && messages[index].role === 'user' && messages[index + 1]?.role === 'assistant') {
      setIsLoading(true)
      setVisibleResponse('') // Reset visible response
      try {
        let fullResponse = ''
        const messageGenerator = getGroqChatCompletion(editingText.trim(), selectedModel)
        
        for await (const { content } of messageGenerator) {
          fullResponse += content
          setMessages(prev => {
            const newMessages = [...prev]
            // Replace content instead of appending
            newMessages[index + 1].content = fullResponse
            return newMessages
          })
        }
      } catch (error) {
        console.error('Error:', error)
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[index + 1].content = 'Sorry, I encountered an error. Please try again.'
          return newMessages
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageIndex(null)
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isDarkMode ? 'dark:text-white' : 'text-black'}`}>
      <Routes>
        <Route path="/" element={
          <main className="flex flex-col h-screen">
            <motion.div 
              className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-indigo-900 dark:bg-indigo-950 text-white"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2">
                <motion.div 
                  className="w-8 h-8 bg-indigo-700 dark:bg-indigo-800 rounded-full flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-sm font-medium text-white">A</span>
                </motion.div>
                <span className="text-sm font-medium">AcadLabs</span>
                <div className="md:hidden relative">
                  <motion.button
                    type="button"
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    className="ml-2 px-2 py-1 text-xs bg-indigo-500 text-white rounded-full flex items-center gap-1"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="max-w-[80px] truncate text-xs">{selectedModel.split('-')[0]}</span>
                    <svg className="w-2 h-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.button>
                  
                  <AnimatePresence>
                    {showModelMenu && (
                      <motion.div 
                        className="absolute right-0 bottom-full mb-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-80 overflow-hidden z-50"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <div className="py-2 flex flex-col h-full">
                          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
                            <h3 className="text-sm font-semibold">Select AI Model</h3>
                            <p className="text-xs opacity-80">Choose the best model for your needs</p>
                          </div>
                          
                          <div 
                            className="overflow-y-auto max-h-48 px-2 scrollbar-hide"
                            css={css`
                              &::-webkit-scrollbar {
                                width: 0px;
                                background: transparent;
                              }
                              -ms-overflow-style: none;
                              scrollbar-width: none;
                            `}
                          >
                            {availableModels.map((model, index) => (
                              <motion.button
                                key={model.id}
                                onClick={() => {
                                  setSelectedModel(model.id)
                                  setShowModelMenu(false)
                                }}
                                className={`flex flex-col w-full px-4 py-3 my-1 text-sm rounded-lg transition-all duration-200 ${
                                  selectedModel === model.id 
                                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-900/30 text-indigo-600 dark:text-indigo-300 border-l-4 border-indigo-500 shadow-md' 
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
                                }`}
                                whileHover={{ 
                                  x: 5, 
                                  backgroundColor: isDarkMode ? 'rgba(79, 70, 229, 0.2)' : 'rgba(224, 231, 255, 0.8)',
                                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.15)",
                                  transition: { duration: 0.2 }
                                }}
                                whileTap={{ scale: 0.98 }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ 
                                  opacity: 1, 
                                  y: 0,
                                  transition: { delay: index * 0.05, duration: 0.2 }
                                }}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium">{model.id}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{model.provider || "Groq"}</span>
                                  </div>
                                  {selectedModel === model.id && (
                                    <motion.div
                                      initial={{ scale: 0, rotate: -90 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    >
                                      <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    </motion.div>
                                  )}
                                </div>
                                
                                <div className="flex gap-1 mt-1">
                                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">Text</span>
                                  {model.id.includes('versatile') && (
                                    <motion.span 
                                      className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs"
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: 0.1 }}
                                    >
                                      Vision
                                    </motion.span>
                                  )}
                                </div>
                              </motion.button>
                            ))}
                          </div>
                          
                          <motion.div 
                            className="mt-auto px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Current: <span className="font-medium text-indigo-500">{selectedModel.split('-')[0]}</span>
                            </span>
                            <motion.button
                              onClick={() => setShowModelMenu(false)}
                              className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-800/50"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Close
                            </motion.button>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Theme toggle button with animation */}
              <div className="relative">
                <motion.button
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded-lg text-white"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Computer className="w-5 h-5" />
                </motion.button>
                
                <AnimatePresence>
                  {showThemeMenu && (
                    <motion.div 
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="py-1">
                        {/* Theme options with animations */}
                        <motion.button
                          onClick={() => setThemeMode('light')}
                          className={`flex items-center w-full px-4 py-2 text-sm ${
                            themeMode === 'light' 
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          whileHover={{ x: 5 }}
                        >
                          <Sun className="w-4 h-4 mr-2" />
                          <span>Light Mode</span>
                        </motion.button>
                        <motion.button
                          onClick={() => setThemeMode('dark')}
                          className={`flex items-center w-full px-4 py-2 text-sm ${
                            themeMode === 'dark' 
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          whileHover={{ x: 5 }}
                        >
                          <Moon className="w-4 h-4 mr-2" />
                          <span>Dark Mode</span>
                        </motion.button>
                        <motion.button
                          onClick={() => setThemeMode('system')}
                          className={`flex items-center w-full px-4 py-2 text-sm ${
                            themeMode === 'system' 
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          whileHover={{ x: 5 }}
                        >
                          <Computer className="w-4 h-4 mr-2" />
                          <span>System Default</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <div className="flex-1 overflow-auto">
              {messages.length === 0 ? (
                <motion.div 
                  className="h-full flex flex-col items-center justify-center p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div 
                    className="mb-6 relative"
                    animate={{ 
                      y: [0, -15, 0],
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2,
                      ease: "easeInOut" 
                    }}
                  >
                    <motion.div
                      className="absolute -inset-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 blur-xl"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 3,
                        ease: "easeInOut"
                      }}
                    />
                    <Bot className="w-20 h-20 text-indigo-500 relative z-10" />
                  </motion.div>
                  <motion.h1 
                    className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    Selamat <span>{greeting}</span>
                  </motion.h1>
                  <motion.p 
                    className="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    Apa yang ingin Anda tanyakan hari ini? Saya siap membantu dengan berbagai pertanyaan dan tugas Anda.
                  </motion.p>
                  <motion.div 
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl w-full px-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    {[
                      "Jelaskan konsep machine learning",
                      "Buatkan contoh kode React",
                      "Bagaimana cara belajar efektif?",
                      "Ceritakan fakta menarik",
                      "Buatkan rencana belajar",
                      "Jelaskan teknologi AI"
                    ].map((suggestion, i) => (
                      <motion.button
                        key={i}
                        onClick={() => {
                          setInput(suggestion);
                          setTimeout(() => {
                            inputRef.current?.focus();
                            handleSubmit({ preventDefault: () => {} });
                          }, 100);
                        }}
                        className="px-4 py-3 bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 
                                  rounded-xl text-sm text-left transition-colors duration-200 shadow-md border border-gray-200 dark:border-gray-700"
                        whileHover={{ 
                          scale: 1.03, 
                          backgroundColor: isDarkMode ? 'rgba(79, 70, 229, 0.2)' : 'rgba(224, 231, 255, 0.8)',
                          y: -5,
                          boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.3)"
                        }}
                        whileTap={{ scale: 0.97 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          transition: { delay: 0.6 + (i * 0.1), duration: 0.3 }
                        }}
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </motion.div>
                </motion.div>
              ) : (
                <div className="max-w-2xl mx-auto p-4 space-y-4">
                  <AnimatePresence>
                    {messages.map((message, index) => (
                      <motion.div 
                        key={index} 
                        className={`flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 group`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                      >
                        {message.role === 'assistant' ? (
                          <motion.div 
                            className="w-8 h-8 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                          >
                            <Bot className="w-5 h-5 text-white" />
                          </motion.div>
                        ) : (
                          <motion.div 
                            className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                          >
                            <span className="text-sm font-medium">U</span>
                          </motion.div>
                        )}
                        <div className="flex flex-col">
                          <motion.div 
                            className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-3 relative shadow-md hover:shadow-lg transition-shadow ${
                              message.role === 'user' 
                                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white ml-auto rounded-tr-none transform hover:scale-[1.02] transition-transform' 
                                : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-tl-none transform hover:scale-[1.02] transition-transform'
                            }`}
                            initial={{ scale: 0.8, opacity: 0, x: message.role === 'user' ? 20 : -20 }}
                            animate={{ scale: 1, opacity: 1, x: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            whileHover={{ y: -2 }}
                          >
                            {/* Add chat bubble tail for user messages */}
                            {message.role === 'user' && (
                              <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 transform translate-x-0 -translate-y-0 rotate-45"></div>
                            )}
                            
                            {/* Add chat bubble tail for assistant messages */}
                            {message.role === 'assistant' && (
                              <div className="absolute top-0 left-0 w-3 h-3 bg-gray-100 dark:bg-gray-800 transform -translate-x-0 -translate-y-0 rotate-45"></div>
                            )}
                            
                            {/* Message content rendering */}
                            {editingMessageIndex === index ? (
                              <div className="w-full">
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  ref={editInputRef}
                                  rows={Math.max(3, editingText.split('\n').length)}
                                />
                                <div className="flex justify-end gap-2">
                                  <motion.button 
                                    onClick={() => handleSaveEdit(index)}
                                    className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-full flex items-center gap-1"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Save</span>
                                  </motion.button>
                                  <motion.button 
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1.5 bg-gray-500 text-white text-xs rounded-full flex items-center gap-1"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Cancel</span>
                                  </motion.button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {message.content.includes('```') ? (
                                  <div>
                                    <HighlightText text={message.content.split('```')[0]} />
                                    <CodeBlock code={message.content.substring(message.content.indexOf('```'))} language="javascript" />
                                  </div>
                                ) : (
                                  <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <div>
                                      <HighlightText text={message.content} />
                                      {message.role === 'assistant' && isLoading && messages[messages.length - 1] === message && (
                                        <span className="inline-flex items-center ml-1">
                                          <motion.span 
                                            className="w-2 h-2 bg-indigo-500 rounded-full mx-0.5"
                                            animate={{ 
                                              scale: [0.5, 1.2, 0.5],
                                              opacity: [0.5, 1, 0.5]
                                            }}
                                            transition={{ 
                                              duration: 1.5,
                                              repeat: Infinity,
                                              ease: "easeInOut"
                                            }}
                                          />
                                          <motion.span 
                                            className="w-2 h-2 bg-indigo-500 rounded-full mx-0.5"
                                            animate={{ 
                                              scale: [0.5, 1.2, 0.5],
                                              opacity: [0.5, 1, 0.5]
                                            }}
                                            transition={{ 
                                              duration: 1.5,
                                              repeat: Infinity,
                                              delay: 0.2,
                                              ease: "easeInOut"
                                            }}
                                          />
                                          <motion.span 
                                            className="w-2 h-2 bg-indigo-500 rounded-full mx-0.5"
                                            animate={{ 
                                              scale: [0.5, 1.2, 0.5],
                                              opacity: [0.5, 1, 0.5]
                                            }}
                                            transition={{ 
                                              duration: 1.5,
                                              repeat: Infinity,
                                              delay: 0.4,
                                              ease: "easeInOut"
                                            }}
                                          />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                          
                          {/* Move edit and resend buttons outside and below the bubble */}
                          {message.role === 'user' && !editingMessageIndex && (
                            <div className="flex justify-end mt-1 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <motion.button
                                onClick={() => handleEditMessage(index, message.content)}
                                className="p-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300 text-xs flex items-center gap-1 shadow-sm"
                                whileHover={{ scale: 1.1, backgroundColor: isDarkMode ? '#4B5563' : '#E5E7EB' }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                <span>Edit</span>
                              </motion.button>
                              <motion.button
                                onClick={() => {
                                  setInput(message.content);
                                  setTimeout(() => inputRef.current?.focus(), 100);
                                }}
                                className="p-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300 text-xs flex items-center gap-1 shadow-sm"
                                whileHover={{ scale: 1.1, backgroundColor: isDarkMode ? '#4B5563' : '#E5E7EB' }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                                </svg>
                                <span>Resend</span>
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <motion.div 
              className="border-t border-gray-200 dark:border-gray-700 p-4 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 sticky bottom-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      onClick={() => setShowUploader(true)}
                      className="p-2.5 bg-gradient-to-r from-indigo-400 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-full transition-colors flex-shrink-0 shadow-md"
                      whileHover={{ scale: 1.1, rotate: 15 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Upload className="w-4 h-4 text-white" />
                    </motion.button>
                    <div className="relative flex-grow">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                          }
                        }}
                        placeholder="Tulis di sini..."
                        className="w-full py-3 px-4 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none text-sm resize-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 shadow-sm"
                        style={{ 
                          minHeight: '48px', 
                          maxHeight: '150px',
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#6366F1 #E5E7EB'
                        }}
                        disabled={isLoading}
                        ref={inputRef}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center justify-center pr-3">
                        {isLoading ? (
                          <motion.button
                            type="button"
                            onClick={handleStopGeneration}
                            className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors duration-200 active:bg-red-700 shadow-md"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            initial={{ rotate: 0 }}
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 0.5, repeat: 3, repeatType: "reverse" }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <rect x="6" y="6" width="12" height="12" />
                            </svg>
                          </motion.button>
                        ) : (
                          <motion.button
                            type="submit"
                            disabled={!input.trim()}
                            className={`p-2 ${
                              input.trim() ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-gray-400'
                            } rounded-full transition-colors duration-200 shadow-md`}
                            whileHover={{ scale: 1.1, rotate: input.trim() ? 15 : 0 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Send className="w-4 h-4 text-white" />
                          </motion.button>
                        )}
                      </div>
                    </div>
                    <div className="relative hidden md:block">
                      <motion.button
                        type="button"
                        onClick={() => setShowModelMenu(!showModelMenu)}
                        className="px-3 py-2 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center gap-1 hover:from-indigo-600 hover:to-purple-700 transition-colors duration-200 shadow-md"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="max-w-[150px] truncate">{selectedModel}</span>
                        <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </motion.button>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {showModelMenu && (
                      <motion.div 
                        className="absolute right-0 bottom-full mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto z-50"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="py-1">
                          {availableModels.map((model) => (
                            <motion.button
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model.id)
                                setShowModelMenu(false)
                              }}
                              className={`flex flex-col w-full px-4 py-3 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${
                                selectedModel === model.id 
                                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border-l-4 border-indigo-500' 
                                  : 'text-gray-700 dark:text-gray-200'
                              }`}
                              whileHover={{ 
                                x: 5, 
                                backgroundColor: isDarkMode ? 'rgba(79, 70, 229, 0.2)' : 'rgba(224, 231, 255, 0.8)',
                                transition: { duration: 0.2 }
                              }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{model.id}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{model.provider}</span>
                                </div>
                                {selectedModel === model.id && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                  >
                                    <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </motion.div>
                                )}
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
                
                <AnimatePresence>
                  {showUploader && (
                    <motion.div 
                      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowUploader(false)}
                    >
                      <motion.div 
                        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md p-4"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* File uploader content with animations */}
                        {/* ... file uploader content ... */}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </main>
        } />
      </Routes>
    </div>
  )
}

export default App

const fileTypeAccept = {
  pdf: '.pdf',
  csv: '.csv',
  image: 'image/*',
  docx: '.docx'
}

const handleFileChange = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  
  setIsUploading(true)
  
  try {
    let result = { fileName: file.name, text: '' }
    
    if (activeFileType === 'image') {
      result.text = `[Image analysis of ${file.name}]\n\nThis would be processed using Groq's vision models like llama-3.2-11b-vision-preview.`
    } else if (activeFileType === 'pdf') {
            result.text = `[PDF content from ${file.name}]\n\nThis would be extracted using a library like pdf-parse and then processed with Groq.`
    } else if (activeFileType === 'csv') {
      result.text = `[CSV data from ${file.name}]\n\nThis would be parsed using a library like csv-parse and then processed with Groq.`
    } else if (activeFileType === 'docx') {
      result.text = `[DOCX content from ${file.name}]\n\nThis would be extracted using a library like docx and then processed with Groq.`
    }
    
    setTimeout(() => {
      handleFileProcess(result)
      setIsUploading(false)
    }, 1500)
  } catch (error) {
    console.error('Error processing file:', error)
    setIsUploading(false)
    alert('Error processing file. Please try again.')
  }
}

  const handleStopGeneration = () => {
    setShouldStopGeneration(true);
    console.log("Stopping generation...");
    
    setIsLoading(false);

    setTimeout(scrollToBottom, 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
  
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    setVisibleResponse('');
    setIsLoading(true);
    setIsTyping(true); // Enable typing animation
    setShouldStopGeneration(false); // Reset stop flag

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    
    try {
      console.log("Starting API request with model:", selectedModel);
      const messageGenerator = getGroqChatCompletion(userMessage, selectedModel);
      
      let fullResponse = '';
      
      for await (const { content, error } of messageGenerator) {
        if (shouldStopGeneration) {
          console.log("Generation stopped by user");
          break;
        }
        
        if (content) {
          if (content.includes("Memproses permintaan Anda")) {
            continue;
          }
          
          fullResponse += content;
          
          for (let i = 0; i <= content.length; i++) {
            if (shouldStopGeneration) break;
            
            const partialContent = content.substring(0, i);
            const currentDisplayedContent = fullResponse.substring(0, fullResponse.length - content.length + i);
            
            setMessages(prev => {
              const newMessages = [...prev];
              if (newMessages.length > 0) {
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === 'assistant') {
                  lastMessage.content = currentDisplayedContent;
                }
              }
              return newMessages;
            });

            await new Promise(resolve => setTimeout(resolve, 150));
            
            setTimeout(scrollToBottom, 10);
          }
        }
      }
      
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage?.role === 'assistant') {
            lastMessage.content = fullResponse;
          }
        }
        return newMessages;
      });
      
      console.log("API request completed successfully");
    } catch (error) {
      console.error('Error during API request:', error);
      
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage?.role === 'assistant') {
            lastMessage.content = "Maaf, terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi.";
          }
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false); // Disable typing animation
      setShouldStopGeneration(false); // Reset stop flag
      scrollToBottom();
    }
  };