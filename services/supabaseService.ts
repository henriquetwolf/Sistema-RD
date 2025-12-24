
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
  const BATCH_SIZE = 500; // Reduzido para maior estabilidade
  const totalRows = data.length;
  let processedRows = 0;

  for (let i = 0; i < totalRows; i += BATCH_SIZE) {
    const rawBatch = data.slice(i, i + BATCH_SIZE);
    
    // Limpeza leve de dados para evitar erros comuns de tipo
    const batch = rawBatch.map(row => {
        const cleaned: any = {};
        Object.keys(row).forEach(key => {
            let val = row[key];
            // Se for uma string que parece ser moeda ou número formatado, limpa
            if (typeof val === 'string') {
                const trimmed = val.trim();
                // Verifica se parece um booleano string
                if (trimmed.toLowerCase() === 'true') val = true;
                else if (trimmed.toLowerCase() === 'false') val = false;
                // Se for campo de valor (ex: level_honorarium), tenta limpar
                else if (key.includes('value') || key.includes('honorarium') || key.includes('salary')) {
                    const cleanNum = trimmed.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
                    const num = parseFloat(cleanNum);
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
