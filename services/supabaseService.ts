
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig, CsvRow } from '../types';

export const createSupabaseClient = (url: string, key: string): SupabaseClient => {
  return createClient(url, key);
};

export const clearTableData = async (
  client: SupabaseClient, 
  tableName: string, 
  primaryKey: string = 'id'
) => {
  if (!primaryKey) throw new Error("Impossível limpar tabela: Nenhuma coluna de destino especificada.");

  const { error, count } = await client
    .from(tableName)
    .delete({ count: 'exact' })
    .not(primaryKey, 'is', null);

  if (error) {
    console.error("Supabase Clear Error:", error);
    if (error.code === '42703' || (error.message.includes('column') && error.message.includes('does not exist'))) {
        throw new Error(`Erro: A coluna '${primaryKey}' não existe na tabela '${tableName}'. Verifique a Chave Primária.`);
    }
    throw new Error(`Erro ao limpar tabela: ${error.message}`);
  }

  return count;
};

export const batchUploadData = async (
  client: SupabaseClient,
  config: SupabaseConfig,
  data: CsvRow[],
  onProgress: (progress: number) => void
) => {
  const BATCH_SIZE = 500; 
  const totalRows = data.length;
  let processedRows = 0;

  for (let i = 0; i < totalRows; i += BATCH_SIZE) {
    const rawBatch = data.slice(i, i + BATCH_SIZE);
    
    const batch = rawBatch.map(row => {
        const cleaned: any = {};
        Object.keys(row).forEach(key => {
            let val = row[key];
            if (typeof val === 'string') {
                const trimmed = val.trim();
                const lowerKey = key.toLowerCase();
                
                if (trimmed.toLowerCase() === 'true') val = true;
                else if (trimmed.toLowerCase() === 'false') val = false;
                else if (
                  lowerKey.includes('value') || 
                  lowerKey.includes('valor') || 
                  lowerKey.includes('honorarium') || 
                  lowerKey.includes('salary') ||
                  lowerKey.includes('salario') ||
                  lowerKey.includes('preco') ||
                  lowerKey.includes('preço')
                ) {
                    let cleanStr = trimmed
                      .replace('R$', '')
                      .replace(/\s/g, '');
                    
                    // Se contém vírgula, assume formato brasileiro (ponto=milhar, vírgula=decimal)
                    if (cleanStr.includes(',')) {
                        cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
                    }
                    // Senão, o parseFloat lida com o ponto decimal naturalmente
                    
                    const num = parseFloat(cleanStr);
                    if (!isNaN(num)) val = num;
                }
            }
            cleaned[key] = val;
        });
        return cleaned;
    });
    
    let query = client.from(config.tableName);
    let error;
    
    if (config.primaryKey && config.primaryKey.trim() !== '') {
        const result = await query.upsert(batch, { 
            onConflict: config.primaryKey,
            ignoreDuplicates: false 
        });
        error = result.error;
    } else {
        const result = await query.insert(batch);
        error = result.error;
    }

    if (error) {
      console.error("Supabase Batch Error:", error);
      throw new Error(`${error.message} (Falha no lote iniciando na linha ${i + 1}). Verifique se as colunas do CSV coincidem exatamente com o banco.`);
    }

    processedRows += rawBatch.length;
    onProgress(Math.min(100, Math.round((processedRows / totalRows) * 100)));
  }

  return { success: true, count: totalRows };
};
