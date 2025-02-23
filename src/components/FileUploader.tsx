import React, { useState } from 'react';
import { FileUp, Loader2, X } from 'lucide-react';
import { processPDF, processCSV, processImage, processDOCX } from '../utils/fileProcessors';

interface FileUploaderProps {
  onProcessComplete: (result: { text?: string; imageUrl?: string; fileName: string }) => void;
  onError: (error: string) => void;
  onClose: () => void;
}

export function FileUploader({ onProcessComplete, onError, onClose }: FileUploaderProps) {
  const [fileType, setFileType] = useState<'pdf' | 'csv' | 'image' | 'docx'>('pdf');
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const fileTypes = [
    { id: 'pdf', label: 'PDF', accept: '.pdf' },
    { id: 'csv', label: 'CSV', accept: '.csv' },
    { id: 'image', label: 'Image', accept: '.png,.jpg,.jpeg' },
    { id: 'docx', label: 'DOCX', accept: '.docx' },
  ] as const;

  const handleFileSubmit = async (file: File) => {
    if (!file) {
      onError('Please select a file first');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onError('File size too large (max 5MB)');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    try {
      if (fileType === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          setPreview(imageUrl);
          onProcessComplete({
            imageUrl,
            fileName: file.name
          });
        };
        reader.readAsDataURL(file);
      } else {
        let text: string;
        switch(fileType) {
          case 'pdf':
            text = await processPDF(file);
            break;
          case 'csv':
            text = await processCSV(file);
            break;
          case 'docx':
            text = await processDOCX(file);
            break;
          default:
            throw new Error('Unsupported file type');
        }
        onProcessComplete({
          text,
          fileName: file.name
        });
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = () => {
    setPreview(null);
    setFileName(null);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Upload File
        </h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {fileTypes.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFileType(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              fileType === id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative">
        <input
          type="file"
          accept={fileTypes.find(t => t.id === fileType)?.accept}
          onChange={(e) => e.target.files?.[0] && handleFileSubmit(e.target.files[0])}
          disabled={isLoading}
          className="hidden"
          id="file-upload"
        />
        
        <label
          htmlFor="file-upload"
          className={`flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
            isLoading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-blue-500 dark:hover:border-blue-400'
          } ${
            fileName
              ? 'border-green-500 dark:border-green-400'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </div>
          ) : fileName ? (
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">{fileName}</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  clearFile();
                }}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <FileUp className="w-5 h-5" />
              <span>Upload {fileTypes.find(t => t.id === fileType)?.label}</span>
            </div>
          )}
        </label>
      </div>

      {preview && (
        <div className="relative w-full max-w-md mx-auto">
          <img
            src={preview}
            alt="Preview"
            className="w-full rounded-lg shadow-lg"
          />
          <button
            onClick={clearFile}
            className="absolute top-2 right-2 p-1 rounded-full bg-gray-800/50 hover:bg-gray-800/70 text-white transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}