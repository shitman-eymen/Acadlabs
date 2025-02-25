import React from 'react';
import { ChevronDown } from 'lucide-react';

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
  const models = [
    { id: "llama-3.2-90b-vision-preview", owned_by: "Meta", context_window: 8192 },
    { id: "llama-3.2-11b-vision-preview", owned_by: "Meta", context_window: 8192 },
    { id: "llama-3.2-11b-text-preview", owned_by: "Meta", context_window: 8192 },
    { id: "mixtral-8x7b-32768", owned_by: "Mistral AI", context_window: 32768 },
    { id: "gemma-7b-it", owned_by: "Google", context_window: 8192 },
    { id: "llama-3.2-90b-text-preview", owned_by: "Meta", context_window: 8192 }
  ];

  return (
    <div className="relative inline-block w-full">
      <select
        value={selectedModel}
        onChange={(e) => onModelSelect(e.target.value)}
        className="appearance-none w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer pr-10"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.id} ({model.owned_by})
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </div>
    </div>
  );
}