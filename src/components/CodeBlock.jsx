import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);
  
  // Extract code blocks from the message
  const parseContent = (text) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    // Find all code blocks and keep track of text before/between/after them
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const [fullMatch, lang, codeContent] = match;
      const startIndex = match.index;
      
      // Add text before code block
      if (startIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, startIndex)
        });
      }
      
      // Add code block
      parts.push({
        type: 'code',
        lang: lang || language || 'javascript',
        content: codeContent.trim()
      });
      
      lastIndex = startIndex + fullMatch.length;
    }
    
    // Add any remaining text after the last code block
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    // If no code blocks were found, treat the entire text as a code block
    if (parts.length === 0) {
      parts.push({
        type: 'code',
        lang: language || 'javascript',
        content: text
      });
    }
    
    return parts;
  };

  const contentParts = parseContent(code);
  
  const handleCopy = async (textToCopy) => {
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-full">
      {contentParts.map((part, index) => (
        part.type === 'code' ? (
          <div key={index} className="rounded-md overflow-hidden bg-gray-800 max-w-full">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
              <span className="text-xs text-gray-400">{part.lang}</span>
              <button
                onClick={() => handleCopy(part.content)}
                className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="overflow-x-auto" style={{ maxWidth: '100%', width: '100%' }}>
              <SyntaxHighlighter
                language={part.lang}
                style={vs2015}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  width: '100%',
                  maxWidth: '100%',
                }}
                wrapLines={true}
                wrapLongLines={true}
                codeTagProps={{
                  style: {
                    display: 'inline-block',
                    maxWidth: '100%',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }
                }}
              >
                {part.content}
              </SyntaxHighlighter>
            </div>
          </div>
        ) : (
          <p key={index} className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            {part.content}
          </p>
        )
      ))}
    </div>
  );
}