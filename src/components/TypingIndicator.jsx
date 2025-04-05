import React from 'react';
import { motion } from 'framer-motion';

export const TypingIndicator = ({ showHeading = false }) => {
  return (
    <span className="inline-flex items-center ml-1">
      {showHeading && (
        <motion.span 
          className="text-indigo-500 font-bold mr-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          ###
        </motion.span>
      )}
      
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="w-1.5 h-1.5 bg-indigo-500 rounded-full mx-0.5"
          initial={{ opacity: 0.3, scale: 0.8 }}
          animate={{ 
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.2, 0.8],
            y: [0, -3, 0]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </span>
  );
};