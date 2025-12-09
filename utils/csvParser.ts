import Papa from 'papaparse';
import { FileData, CsvRow } from '../types';

export const parseCsvFile = (file: File): Promise<FileData> => {
  return new Promise((resolve, reject) => {
    // We read as text first to pre-process the content
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        reject(new Error("O arquivo está vazio."));
        return;
      }

      let cleanText = text;
      
      // Improve SEP detection to handle various newline characters (\n, \r\n, \r)
      // Excel uses "SEP=," or "sep=;" at the start.
      // The regex ^sep=.* matches the line starting with sep= until a newline.
      if (cleanText.trim().substring(0, 4).toUpperCase() === 'SEP=') {
         cleanText = cleanText.replace(/^sep=.*[\r\n]+/i, '');
      }

      Papa.parse(cleanText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true, // Automatically convert numbers and booleans
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV Parse Warnings:', results.errors);
          }
          
          // Filter out columns that might have been parsed as empty strings due to trailing delimiters
          const rawHeaders = results.meta.fields || [];
          const validHeaders = rawHeaders.filter(h => h && h.trim() !== '');

          resolve({
            fileName: file.name,
            rowCount: results.data.length,
            data: results.data as CsvRow[],
            headers: validHeaders,
          });
        },
        error: (error) => {
          reject(error);
        },
      });
    };

    reader.onerror = () => {
      reject(new Error("Falha ao ler o arquivo CSV."));
    };

    reader.readAsText(file);
  });
};