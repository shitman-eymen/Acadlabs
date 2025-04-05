'use client'

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export function PDFViewer({ file, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF. Please try again.');
    setIsLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    if (numPages) {
      setPageNumber(prev => Math.min(prev + 1, numPages));
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading PDF...</span>
        </div>
      )}
      
      {error && (
        <div className="text-red-500 py-4">
          {error}
        </div>
      )}
      
      <Document 
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        className="w-full"
      >
        <Page 
          pageNumber={pageNumber} 
          renderTextLayer={true}
          renderAnnotationLayer={true}
          className="flex justify-center"
          scale={1.0}
        />
      </Document>
      
      {numPages && (
        <div className="flex items-center justify-between w-full mt-4 px-4">
          <button 
            onClick={goToPrevPage} 
            disabled={pageNumber <= 1}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Page {pageNumber} of {numPages}
          </p>
          
          <button 
            onClick={goToNextPage} 
            disabled={pageNumber >= numPages}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      )}
    </div>
  );
}