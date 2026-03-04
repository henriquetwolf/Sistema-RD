/**
 * Import Conta Azul Receivables from XLS export into Supabase
 * 
 * Usage:
 *   set SUPABASE_SERVICE_KEY=your_service_role_key_here
 *   node data-import/import-receivables.js
 */

const XLSX = require('xlsx');
const crypto = require('crypto');

const SUPABASE_URL = 'https://wfrzsnwisypmgsbeccfj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FILIAL_ACCOUNT_ID = '877e0139-7ebf-4e0e-957c-f3b98902f739';

const XLS_FILE = 'data-import/visao_contas_a_receber_filial.xls';
const TABLE = 'conta_azul_contas_receber';
const BATCH_SIZE = 500;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY não configurada!');
  console.error('   Pegue a Service Role Key em: https://supabase.com/dashboard/project/wfrzsnwisypmgsbeccfj/settings/api');
  console.error('   Depois execute:');
  console.error('   set SUPABASE_SERVICE_KEY=eyJ...');
  console.error('   node data-import/import-receivables.js');
  process.exit(1);
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === '') return null;
  const str = String(dateStr).trim();
  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  return null;
}

function safeFloat(val) {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function generateId(row) {
  const key = [
    row[2] || '',   // Código de referência
    row[8] || '',   // Descrição
    row[4] || '',   // Data de vencimento
    row[12] || '',  // Valor
    row[0] || '',   // Identificador do cliente
  ].join('|');
  return 'xls-' + crypto.createHash('sha256').update(key).digest('hex').substring(0, 40);
}

function parseParcela(descricao) {
  if (!descricao) return { numero: null, total: null };
  const match = String(descricao).match(/^(\d+)\/(\d+)\s*-/);
  if (match) return { numero: parseInt(match[1]), total: parseInt(match[2]) };
  return { numero: null, total: null };
}

function mapRow(row) {
  const parcela = parseParcela(row[8]);
  return {
    account_id: FILIAL_ACCOUNT_ID,
    id_conta_azul: generateId(row),
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

async function supabasePost(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
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
    throw new Error(`Supabase POST error ${res.status}: ${text}`);
  }
  return res;
}

async function main() {
  console.log('📖 Lendo arquivo XLS...');
  const wb = XLSX.readFile(XLS_FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0 });

  const header = data[0];
  const rows = data.slice(1).filter(r => r && r.length > 0 && r[0]);

  console.log(`📊 Sheet: "${wb.SheetNames[0]}"`);
  console.log(`📊 Colunas: ${header.length}`);
  console.log(`📊 Registros: ${rows.length}`);
  console.log(`🏢 Account: FILIAL (${FILIAL_ACCOUNT_ID})`);

  const mapped = rows.map(mapRow);

  const statusCount = {};
  mapped.forEach(r => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
  console.log('\n📊 Distribuição por status:');
  Object.entries(statusCount).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
    console.log(`   ${s}: ${c.toLocaleString()}`);
  });

  const totalValor = mapped.reduce((s, r) => s + r.valor, 0);
  const totalPago = mapped.reduce((s, r) => s + r.valor_pago, 0);
  console.log(`\n💰 Valor total: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`💰 Total pago: R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  console.log(`\n🚀 Iniciando importação em batches de ${BATCH_SIZE}...`);
  const totalBatches = Math.ceil(mapped.length / BATCH_SIZE);
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    try {
      await supabasePost(batch);
      imported += batch.length;
      if (batchNum % 10 === 0 || batchNum === totalBatches) {
        const pct = ((imported / mapped.length) * 100).toFixed(1);
        console.log(`   Batch ${batchNum}/${totalBatches} — ${imported.toLocaleString()} registros (${pct}%)`);
      }
    } catch (err) {
      errors++;
      console.error(`   ❌ Erro batch ${batchNum}: ${err.message}`);
      if (errors > 5) {
        console.error('   Muitos erros. Abortando.');
        process.exit(1);
      }
    }
  }

  console.log(`\n✅ Importação concluída!`);
  console.log(`   Total importados: ${imported.toLocaleString()}`);
  console.log(`   Erros: ${errors}`);

  console.log('\n📝 Registrando sync log...');
  const logRes = await fetch(`${SUPABASE_URL}/rest/v1/conta_azul_sync_log`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_id: FILIAL_ACCOUNT_ID,
      tipo_sync: 'receivables-xls-import',
      status: 'success',
      registros_sincronizados: imported,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    }),
  });
  if (logRes.ok) {
    console.log('   Sync log registrado com sucesso.');
  } else {
    console.error('   Falha ao registrar sync log:', await logRes.text());
  }
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
