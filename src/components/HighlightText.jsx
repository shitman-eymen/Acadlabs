import React from 'react';

export function HighlightText({ text }) {
  // Function to format markdown text
  const formatText = (text) => {
    if (!text) return '';
    
    // Split the text into parts: regular text and code blocks
    const parts = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      
      // Process text before code block
      if (matchIndex > lastIndex) {
        const textBeforeCode = text.substring(lastIndex, matchIndex);
        parts.push({
          type: 'text',
          content: textBeforeCode
        });
      }
      
      // Add the code block as is
      parts.push({
        type: 'code',
        content: match[0]
      });
      
      lastIndex = matchIndex + match[0].length;
    }
    
    // Add any remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    // If no parts were found (no code blocks), treat the entire text as regular text
    if (parts.length === 0) {
      parts.push({
        type: 'text',
        content: text
      });
    }
    
    // Process each part
    return parts.map((part, index) => {
      if (part.type === 'code') {
        // Return code blocks as is
        return <React.Fragment key={`code-${index}`}>{part.content}</React.Fragment>;
      } else {
        // Process markdown in text parts
        return <React.Fragment key={`text-${index}`}>{processMarkdown(part.content)}</React.Fragment>;
      }
    });
  };
  
  // Helper function to process markdown in text
  const processMarkdown = (text) => {
    // Process line by line for headings
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Process headings (## text)
      if (line.startsWith('## ')) {
        const headingText = line.slice(3);
        return (
          <React.Fragment key={`line-${lineIndex}`}>
            <strong>{headingText}</strong>
            {lineIndex < lines.length - 1 && <br />}
          </React.Fragment>
        );
      }
      
      // Process bold text (**text**)
      const boldParts = [];
      let lastBoldIndex = 0;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let boldMatch;
      
      while ((boldMatch = boldRegex.exec(line)) !== null) {
        const beforeBold = line.substring(lastBoldIndex, boldMatch.index);
        if (beforeBold) {
          boldParts.push(beforeBold);
        }
        
        boldParts.push(<strong key={`bold-${lineIndex}-${boldMatch.index}`}>{boldMatch[1]}</strong>);
        lastBoldIndex = boldMatch.index + boldMatch[0].length;
      }
      
      // Add remaining text after last bold match
      if (lastBoldIndex < line.length) {
        boldParts.push(line.substring(lastBoldIndex));
      }
      
      // If no bold parts were found, use the original line
      const processedLine = boldParts.length > 0 ? boldParts : line;
      
      return (
        <React.Fragment key={`line-${lineIndex}`}>
          {processedLine}
          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return <>{formatText(text)}</>;
}