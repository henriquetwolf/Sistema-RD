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
  // To delete all rows in Supabase/PostgREST, we need a filter.
  // "not(primaryKey, is, null)" effectively selects all rows where the PK exists.
  const { error, count } = await client
    .from(tableName)
    .delete({ count: 'exact' })
    .not(primaryKey, 'is', null);

  if (error) {
    throw new Error(`Supabase Delete Error: ${error.message}`);
  }

  return count;
};

export const batchUploadData = async (
  client: SupabaseClient,
  config: SupabaseConfig,
  data: CsvRow[],
  onProgress: (progress: number) => void
) => {
  const BATCH_SIZE = 1000;
  const totalRows = data.length;
  let processedRows = 0;

  for (let i = 0; i < totalRows; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    
    let query = client.from(config.tableName);
    
    // If a primary key is provided, we use upsert (update if exists, insert if not).
    // Otherwise, we use standard insert.
    let error;
    
    if (config.primaryKey && config.primaryKey.trim() !== '') {
        const result = await query.upsert(batch, { onConflict: config.primaryKey });
        error = result.error;
    } else {
        const result = await query.insert(batch);
        error = result.error;
    }

    if (error) {
      throw new Error(`Supabase Error: ${error.message} (Batch starting at row ${i})`);
    }

    processedRows += batch.length;
    onProgress(Math.min(100, Math.round((processedRows / totalRows) * 100)));
  }

  return { success: true, count: totalRows };
};