/**
 * Import Conta Azul Receivables/Payables from XLSX exports into Supabase
 *
 * Expects 4 XLSX files in data-import/:
 *   receber_filial.xlsx, receber_matriz.xlsx,
 *   pagar_filial.xlsx,   pagar_matriz.xlsx
 *
 * Usage:
 *   set SUPABASE_SERVICE_KEY=your_service_role_key_here
 *   node data-import/import-financeiro.cjs
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Resolve xlsx from project root (handles Unicode path issues)
const os = require('os');
const desktop = path.join(os.homedir(), 'OneDrive');
const desktopItems = fs.readdirSync(desktop);
const areaFolder = desktopItems.find(d => d.toLowerCase().includes('rea de trabalho'));
const PROJECT_ROOT = path.join(desktop, areaFolder, 'CURSOR IA SISTEMA VOLL');
const XLSX = require(path.join(PROJECT_ROOT, 'node_modules', 'xlsx'));

const SUPABASE_URL = 'https://wfrzsnwisypmgsbeccfj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const FILIAL_ACCOUNT_ID = '877e0139-7ebf-4e0e-957c-f3b98902f739';
const BATCH_SIZE = 500;

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_KEY not set.');
  console.error('  set SUPABASE_SERVICE_KEY=eyJ...');
  console.error('  node data-import/import-financeiro.cjs');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────

function excelSerialToDate(serial) {
  // Excel serial: days since 1899-12-30 (with the Lotus 1-2-3 leap year bug)
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const ms = epoch.getTime() + serial * 86400000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(dateStr) {
  if (dateStr === null || dateStr === undefined || dateStr === '-' || dateStr === '') return null;

  if (typeof dateStr === 'number' && dateStr > 1 && dateStr < 200000) {
    return excelSerialToDate(dateStr);
  }

  const str = String(dateStr).trim();
  if (!str) return null;

  const ddmmyyyy = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);

  if (/^\d+$/.test(str)) {
    const n = parseInt(str, 10);
    if (n > 1 && n < 200000) return excelSerialToDate(n);
  }

  return null;
}

function safeFloat(val) {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : Math.round(Math.abs(n) * 100) / 100;
}

function generateStableId(row, type, rowIndex) {
  const key = [
    type,
    row[2] || '',           // Codigo de referencia
    row[0] || '',           // Identificador cliente/fornecedor
    row[8] || '',           // Descricao
    row[4] || '',           // Data vencimento
    row[3] || '',           // Data competencia
    String(row[12] || 0),   // Valor original
    String(row[18] || 0),   // Valor total pago/recebido
    row[24] || '',          // Conta bancaria
    row[25] || '',          // Data ultimo pagamento
    String(rowIndex),       // Indice da linha (garante unicidade)
  ].join('|');
  return 'imp-' + crypto.createHash('sha256').update(key).digest('hex').substring(0, 40);
}

function parseParcela(descricao) {
  if (!descricao) return { numero: null, total: null };
  const match = String(descricao).match(/^(\d+)\/(\d+)\s*-/);
  if (match) return { numero: parseInt(match[1]), total: parseInt(match[2]) };
  return { numero: null, total: null };
}

// ── Mappers ─────────────────────────────────────────────────

function mapReceivableRow(row, accountId, rowIndex) {
  const parcela = parseParcela(row[8]);
  return {
    account_id: accountId,
    id_conta_azul: generateStableId(row, 'REC', rowIndex),
    descricao: row[8] || null,
    valor: safeFloat(row[12]),
    valor_pago: safeFloat(row[18]),
    data_vencimento: parseDate(row[4]),
    data_competencia: parseDate(row[3]),
    data_pagamento: parseDate(row[25]),
    status: row[10] || 'PENDENTE',
    categoria_nome: row[28] || null,
    centro_custo_nome: row[30] || null,
    conta_financeira_nome: row[24] || null,
    parcela_numero: parcela.numero,
    total_parcelas: parcela.total,
    contato_nome: row[1] || null,
    contato_id: row[0] ? String(row[0]) : null,
    observacoes: row[27] || null,
    numero_documento: row[2] ? String(row[2]) : null,
    synced_at: new Date().toISOString(),
  };
}

function mapPayableRow(row, accountId, rowIndex) {
  const parcela = parseParcela(row[8]);
  return {
    account_id: accountId,
    id_conta_azul: generateStableId(row, 'PAG', rowIndex),
    descricao: row[8] || null,
    valor: safeFloat(row[12]),
    valor_pago: safeFloat(row[18]),
    data_vencimento: parseDate(row[4]),
    data_competencia: parseDate(row[3]),
    data_pagamento: parseDate(row[25]),
    status: row[10] || 'PENDENTE',
    categoria_nome: row[28] || null,
    centro_custo_nome: row[30] || null,
    conta_financeira_nome: row[24] || null,
    parcela_numero: parcela.numero,
    total_parcelas: parcela.total,
    fornecedor_nome: row[1] || null,
    fornecedor_id: row[0] ? String(row[0]) : null,
    observacoes: row[27] || null,
    numero_documento: row[2] ? String(row[2]) : null,
    synced_at: new Date().toISOString(),
  };
}

// ── Supabase POST ───────────────────────────────────────────

async function supabaseUpsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text.substring(0, 300)}`);
  }
  return res;
}

async function fetchAccounts() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/conta_azul_accounts?select=id,nome,cnpj,ativo&ativo=eq.true`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch accounts: ' + res.status);
  return res.json();
}

async function logSync(accountId, tipo, count) {
  await fetch(`${SUPABASE_URL}/rest/v1/conta_azul_sync_log`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_id: accountId,
      tipo_sync: tipo,
      status: 'success',
      registros_sincronizados: count,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    }),
  });
}

// ── Import a single file ────────────────────────────────────

async function importFile(filePath, table, mapFn, accountId, accountName) {
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP: ${path.basename(filePath)} not found`);
    return 0;
  }

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0 });
  const rows = data.slice(1).filter(r => r && r.length > 0 && (r[0] || r[1] || r[8]));

  console.log(`  ${path.basename(filePath)}: ${rows.length.toLocaleString()} rows -> ${table} (${accountName})`);

  const mapped = rows.map((r, idx) => mapFn(r, accountId, idx));

  const statusCount = {};
  mapped.forEach(r => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
  Object.entries(statusCount).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
    console.log(`    ${s}: ${c.toLocaleString()}`);
  });

  const totalValor = mapped.reduce((s, r) => s + r.valor, 0);
  console.log(`    Valor total: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  let imported = 0;
  let errors = 0;
  const totalBatches = Math.ceil(mapped.length / BATCH_SIZE);

  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    try {
      await supabaseUpsert(table, batch);
      imported += batch.length;
      if (batchNum % 20 === 0 || batchNum === totalBatches) {
        const pct = ((imported / mapped.length) * 100).toFixed(1);
        console.log(`    Batch ${batchNum}/${totalBatches} - ${imported.toLocaleString()} (${pct}%)`);
      }
    } catch (err) {
      errors++;
      console.error(`    ERROR batch ${batchNum}: ${err.message}`);
      if (errors > 5) {
        console.error('    Too many errors, aborting this file.');
        break;
      }
    }
  }

  console.log(`    Done: ${imported.toLocaleString()} imported, ${errors} errors`);
  return imported;
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log('Fetching accounts from Supabase...');
  const accounts = await fetchAccounts();
  console.log(`Found ${accounts.length} active accounts:`);
  accounts.forEach(a => console.log(`  ${a.nome} (${a.id}) - CNPJ: ${a.cnpj}`));

  const filialAcc = accounts.find(a => a.id === FILIAL_ACCOUNT_ID);
  const matrizAcc = accounts.find(a => a.id !== FILIAL_ACCOUNT_ID);

  if (!filialAcc) {
    console.error(`FILIAL account ${FILIAL_ACCOUNT_ID} not found in database!`);
    process.exit(1);
  }
  if (!matrizAcc) {
    console.error('MATRIZ account not found (expected a second active account).');
    process.exit(1);
  }

  console.log(`\nFILIAL: ${filialAcc.nome} (${filialAcc.id})`);
  console.log(`MATRIZ: ${matrizAcc.nome} (${matrizAcc.id})`);

  const dataDir = path.join(PROJECT_ROOT, 'data-import');

  const jobs = [
    { file: 'receber_filial.xlsx', table: 'conta_azul_contas_receber', mapper: mapReceivableRow, account: filialAcc, syncType: 'receivables-xlsx-import' },
    { file: 'receber_matriz.xlsx', table: 'conta_azul_contas_receber', mapper: mapReceivableRow, account: matrizAcc, syncType: 'receivables-xlsx-import' },
    { file: 'pagar_filial.xlsx',   table: 'conta_azul_contas_pagar',   mapper: mapPayableRow,    account: filialAcc, syncType: 'payables-xlsx-import' },
    { file: 'pagar_matriz.xlsx',   table: 'conta_azul_contas_pagar',   mapper: mapPayableRow,    account: matrizAcc, syncType: 'payables-xlsx-import' },
  ];

  let grandTotal = 0;

  for (const job of jobs) {
    console.log(`\n--- ${job.file} ---`);
    const count = await importFile(
      path.join(dataDir, job.file),
      job.table,
      job.mapper,
      job.account.id,
      job.account.nome,
    );
    if (count > 0) {
      await logSync(job.account.id, job.syncType, count);
    }
    grandTotal += count;
  }

  console.log(`\n========================================`);
  console.log(`TOTAL IMPORTED: ${grandTotal.toLocaleString()} records`);
  console.log(`========================================`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
