import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Model {
  id: string;
  owned_by: string;
  context_window: number;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
}

export function ModelSelector({ selectedModel, onModelSelect }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const models = [
    { id: "llama-3.3-70b-versatile", owned_by: "Meta", context_window: 8192 },
    { id: "llama-3.2-90b-vision-preview", owned_by: "Meta", context_window: 8192 },
    { id: "llama-3.2-11b-vision-preview", owned_by: "Meta", context_window: 8192 },
    { id: "mixtral-8x7b-32768", owned_by: "Mistral AI", context_window: 32768 },
    { id: "llama3-70b-8192", owned_by: "Meta", context_window: 8192 },
    { id: "llama3-8b-8192", owned_by: "Meta", context_window: 8192 },
    { id: "llama-3.2-3b-preview", owned_by: "Meta", context_window: 8192 }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedModelData = models.find(model => model.id === selectedModel);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm text-center text-blue-600 dark:text-blue-400 focus:outline-none"
      >
        <span>Models</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 ml-1" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-1" />
        )}
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fadeIn">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onModelSelect(model.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                selectedModel === model.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="flex flex-col">
                <span className={`font-medium ${selectedModel === model.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-white'}`}>
                  {model.id}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {model.owned_by} • Context: {model.context_window.toLocaleString()} tokens
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}