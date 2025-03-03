import { createWorker } from 'tesseract.js';
import * as mammoth from 'mammoth';

export const processPDF = async (file: File): Promise<string> => {
  // We'll just return the file object for React-PDF to handle
  // This is a placeholder - the actual PDF processing will be done by React-PDF
  // in the component that displays the PDF
  return "PDF file loaded successfully. The content will be displayed in the viewer.";
};

export const processCSV = async (file: File): Promise<string> => {
  const text = await file.text();
  const rows = text.split('\n');
  const headers = rows[0].split(',');
  
  const data = rows.slice(1).map(row => {
    const values = row.split(',');
    return headers.reduce((obj: Record<string, string>, header, i) => ({
      ...obj,
      [header.trim()]: values[i]?.trim() || ''
    }), {});
  });
  
  return JSON.stringify(data, null, 2);
};

export const processImage = async (file: File): Promise<string> => {
  const worker = await createWorker('eng+ind');
  const { data: { text } } = await worker.recognize(file, {
    rotateAuto: true,
    tessedit_pageseg_mode: '6'
  });
  await worker.terminate();
  return text;
};

export const processDOCX = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};