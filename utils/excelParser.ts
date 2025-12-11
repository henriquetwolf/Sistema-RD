import readXlsxFile from 'read-excel-file';
import { FileData, CsvRow } from '../types';

export const parseExcelFile = (file: File): Promise<FileData> => {
  return new Promise((resolve, reject) => {
    readXlsxFile(file)
      .then((rows) => {
        if (!rows || rows.length === 0) {
          reject(new Error("O arquivo Excel está vazio."));
          return;
        }

        // Row 0 are headers
        const rawHeaders = rows[0] as string[];
        
        // Validation: Ensure we have headers
        if (!rawHeaders || rawHeaders.length === 0) {
            reject(new Error("Não foi possível identificar o cabeçalho na primeira linha."));
            return;
        }

        // Filter valid headers (convert non-string headers to string if necessary, though unlikely for row 0)
        const validHeaders = rawHeaders.map(h => String(h || '').trim()).filter(h => h !== '');

        // Map data rows to objects
        const data: CsvRow[] = [];
        
        // Start from row 1
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rowObj: CsvRow = {};
            let hasData = false;

            validHeaders.forEach((header, index) => {
                // Find the original index of this header in rawHeaders to map correctly
                const originalIndex = rawHeaders.indexOf(header);
                if (originalIndex !== -1) {
                    const cellValue = row[originalIndex];
                    // Convert undefined/null to null, strictly
                    rowObj[header] = cellValue === undefined ? null : cellValue;
                    
                    if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
                        hasData = true;
                    }
                }
            });

            // Skip completely empty rows
            if (hasData) {
                data.push(rowObj);
            }
        }

        resolve({
          fileName: file.name,
          rowCount: data.length,
          data: data,
          headers: validHeaders,
        });
      })
      .catch((error) => {
        console.error("Excel parse error:", error);
        reject(new Error("Falha ao ler o arquivo Excel. Verifique se é um .xlsx válido."));
      });
  });
};