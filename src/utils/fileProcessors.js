import { createWorker } from 'tesseract.js';
import * as mammoth from 'mammoth';

export const processPDF = async (file) => {
  return "PDF file loaded successfully. The content will be displayed in the viewer.";
};

export const processCSV = async (file) => {
  const text = await file.text();
  const rows = text.split('\n');
  const headers = rows[0].split(',');
  
  const data = rows.slice(1).map(row => {
    const values = row.split(',');
    return headers.reduce((obj, header, i) => ({
      ...obj,
      [header.trim()]: values[i]?.trim() || ''
    }), {});
  });
  
  return JSON.stringify(data, null, 2);
};

export const processImage = async (file) => {
  const worker = await createWorker('eng+ind');
  const { data: { text } } = await worker.recognize(file, {
    rotateAuto: true,
    tessedit_pageseg_mode: '6'
  });
  await worker.terminate();
  return text;
};

export const processDOCX = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};