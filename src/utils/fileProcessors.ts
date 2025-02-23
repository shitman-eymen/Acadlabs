import * as pdfjs from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import * as mammoth from 'mammoth';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const processPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument(arrayBuffer).promise;
  
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(' ');
  }
  return text;
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