/**
 * Import Conta Azul Payables (Contas a Pagar) from XLS export into Supabase
 *
 * The Conta Azul API v2 only exposes ~1,400 payable records, while the
 * web-app "Visão Contas a Pagar" export has 38k+. This script bridges
 * that gap by importing the full XLS export directly.
 *
 * Usage:
 *   set SUPABASE_SERVICE_KEY=your_service_role_key_here
 *   node data-import/import-payables.js [path-to-xls]
 *
 * If no path is given, defaults to: ~/Downloads/Contas a Pagar MATRIZ todo periodo.xls
 */

const XLSX = require('xlsx');
const crypto = require('crypto');
const path = require('path');
const os = require('os');

const SUPABASE_URL = 'https://wfrzsnwisypmgsbeccfj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TABLE = 'conta_azul_contas_pagar';
const BATCH_SIZE = 500;

const DEFAULT_XLS = path.join(os.homedir(), 'Downloads', 'Contas a Pagar MATRIZ todo periodo.xls');

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_KEY nao configurada!');
  console.error('  Pegue a Service Role Key em: https://supabase.com/dashboard/project/wfrzsnwisypmgsbeccfj/settings/api');
  console.error('  Depois execute:');
  console.error('  set SUPABASE_SERVICE_KEY=eyJ...');
  console.error('  node data-import/import-payables.js');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────

function parseDate(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === '') return null;
  const str = String(dateStr).trim();
  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const y = parseInt(match[3]);
    if (y > 2100) return null; // dates like 2202 or 9202
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  return null;
}

function safeFloat(val) {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

const STATUS_MAP = {
  'Quitado': 'RECEBIDO',
  'Em aberto': 'EM_ABERTO',
  'Atrasado': 'ATRASADO',
  'Parcialmente quitado': 'RECEBIDO_PARCIAL',
  'Perdido': 'PERDIDO',
  'Renegociado': 'RENEGOCIADO',
};

function mapStatus(situacao) {
  if (!situacao) return 'PENDENTE';
  return STATUS_MAP[situacao] || situacao.toUpperCase().replace(/\s+/g, '_');
}

function parseParcela(qtdRecorrencia) {
  if (!qtdRecorrencia) return { numero: null, total: null };
  const str = String(qtdRecorrencia).trim();
  const match = str.match(/^(\d+)\/(\d+)$/);
  if (match) return { numero: parseInt(match[1]), total: parseInt(match[2]) };
  return { numero: null, total: null };
}

/**
 * Generate a deterministic unique ID for each XLS row.
 * Uses: fornecedor + descricao + data_vencimento + valor + data_competencia + parcela
 */
function generateId(row) {
  const key = [
    String(row[1] || '').trim(),  // Nome do fornecedor
    String(row[8] || '').trim(),  // Descricao
    String(row[4] || ''),         // Data de vencimento
    String(row[12] || ''),        // Valor original
    String(row[3] || ''),         // Data de competencia
    String(row[7] || ''),         // Quantidade de recorrencia (parcela)
    String(row[0] || ''),         // Identificador fornecedor (CNPJ)
  ].join('|');
  return 'xls-' + crypto.createHash('sha256').update(key).digest('hex').substring(0, 40);
}

// ─── XLS Column Indices ───────────────────────────────────────────
// 0:  Identificador do fornecedor (CNPJ/CPF)
// 1:  Nome do fornecedor
// 2:  Codigo de referencia
// 3:  Data de competencia
// 4:  Data de vencimento
// 5:  Data prevista
// 6:  Recorrencia
// 7:  Quantidade de recorrencia (e.g. "3/5")
// 8:  Descricao
// 9:  Origem do lancamento
// 10: Situacao
// 11: Agendado
// 12: Valor original da parcela (R$)
// 13: Forma de pagamento
// 14: Valor pago da parcela (R$)
// 15-17: Juros/Multa/Desconto realizado
// 18: Valor total pago da parcela (R$)
// 19: Valor da parcela em aberto (R$)
// 20-22: Juros/Multa/Desconto previsto
// 23: Valor total da parcela em aberto (R$)
// 24: Conta bancaria
// 25: Data do ultimo pagamento
// 26: Nota fiscal
// 27: Observacoes
// 28: Categoria 1
// 29: Valor na Categoria 1
// 30: Centro de Custo 1
// 31: Valor no Centro de Custo 1

function mapRow(row, accountId) {
  const parcela = parseParcela(row[7]);
  const rawCpf = row[0] ? String(row[0]).replace(/[^\d]/g, '') : '';
  const cpf = rawCpf.length >= 11 ? rawCpf : null;
  const valor = safeFloat(row[12]);
  const valorPago = safeFloat(row[14]);
  const valorTotalPago = safeFloat(row[18]);

  return {
    account_id: accountId,
    id_conta_azul: generateId(row),
    descricao: row[8] || null,
    valor,
    valor_pago: valorTotalPago > 0 ? valorTotalPago : valorPago,
    data_vencimento: parseDate(row[4]),
    data_competencia: parseDate(row[3]),
    data_pagamento: parseDate(row[25]),
    status: mapStatus(row[10]),
    categoria_nome: row[28] || null,
    centro_custo_nome: row[30] || null,
    conta_financeira_nome: row[24] || null,
    parcela_numero: parcela.numero,
    total_parcelas: parcela.total,
    fornecedor_nome: row[1] || null,
    contato_cpf: cpf,
    observacoes: row[27] || null,
    numero_documento: row[26] ? String(row[26]) : null,
    synced_at: new Date().toISOString(),
  };
}

// ─── Supabase REST helpers ────────────────────────────────────────

async function supabaseGet(tablePath) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tablePath}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`GET ${tablePath}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supabaseUpsert(table, rows, onConflict = 'account_id,id_conta_azul') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`;
  const res = await fetch(url, {
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
    throw new Error(`POST ${table} ${res.status}: ${text}`);
  }
  return res;
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const xlsPath = process.argv[2] || DEFAULT_XLS;
  console.log(`Lendo arquivo: ${xlsPath}`);

  const wb = XLSX.readFile(xlsPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0 });

  const header = data[0];
  const rows = data.slice(1).filter(r => r && r.length > 1 && (r[1] || r[8]));

  console.log(`Sheet: "${wb.SheetNames[0]}"`);
  console.log(`Colunas: ${header.length}`);
  console.log(`Registros validos: ${rows.length}`);

  // Auto-detect Matriz account
  console.log('\nBuscando contas no Supabase...');
  const accounts = await supabaseGet('conta_azul_accounts?select=id,nome,cnpj&ativo=eq.true&order=nome');
  if (!accounts || accounts.length === 0) {
    console.error('Nenhuma conta ativa encontrada no Supabase!');
    process.exit(1);
  }

  console.log('Contas disponiveis:');
  accounts.forEach((a, i) => console.log(`  [${i}] ${a.nome} (${a.cnpj}) - ${a.id}`));

  const matrizAccount = accounts.find(a => a.nome.toLowerCase().includes('matriz'));
  if (!matrizAccount) {
    console.error('Conta "Matriz" nao encontrada! Configure manualmente o ACCOUNT_ID.');
    process.exit(1);
  }

  const accountId = matrizAccount.id;
  console.log(`\nUsando conta: ${matrizAccount.nome} (${accountId})`);

  // Map all rows
  const mapped = rows.map(r => mapRow(r, accountId));

  // Deduplicate by id_conta_azul (keep last occurrence)
  const deduped = new Map();
  mapped.forEach(r => deduped.set(r.id_conta_azul, r));
  const uniqueRows = Array.from(deduped.values());
  const dupes = mapped.length - uniqueRows.length;
  if (dupes > 0) {
    console.log(`\n${dupes} duplicatas removidas (mesmo fornecedor+descricao+data+valor). ${uniqueRows.length} registros unicos.`);
  }

  // Status distribution
  const statusCount = {};
  uniqueRows.forEach(r => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
  console.log('\nDistribuicao por status:');
  Object.entries(statusCount).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
    console.log(`  ${s}: ${c.toLocaleString()}`);
  });

  const totalValor = uniqueRows.reduce((s, r) => s + r.valor, 0);
  const totalPago = uniqueRows.reduce((s, r) => s + r.valor_pago, 0);
  const withCpf = uniqueRows.filter(r => r.contato_cpf).length;
  console.log(`\nValor total: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`Total pago: R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`Registros com CPF/CNPJ: ${withCpf.toLocaleString()} / ${uniqueRows.length.toLocaleString()}`);

  // Import in batches
  console.log(`\nIniciando importacao em batches de ${BATCH_SIZE}...`);
  const totalBatches = Math.ceil(uniqueRows.length / BATCH_SIZE);
  let imported = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
    const batch = uniqueRows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    try {
      await supabaseUpsert(TABLE, batch);
      imported += batch.length;
      if (batchNum % 10 === 0 || batchNum === totalBatches) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const pct = ((imported / uniqueRows.length) * 100).toFixed(1);
        console.log(`  Batch ${batchNum}/${totalBatches} - ${imported.toLocaleString()} registros (${pct}%) - ${elapsed}s`);
      }
    } catch (err) {
      errors++;
      console.error(`  Erro batch ${batchNum}: ${err.message}`);
      if (errors > 10) {
        console.error('  Muitos erros consecutivos. Abortando.');
        process.exit(1);
      }
      for (const row of batch) {
        try {
          await supabaseUpsert(TABLE, [row]);
          imported++;
        } catch (rowErr) {
          console.error(`    Erro individual id=${row.id_conta_azul}: ${rowErr.message}`);
        }
      }
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nImportacao concluida em ${totalElapsed}s!`);
  console.log(`  Importados: ${imported.toLocaleString()}`);
  console.log(`  Erros de batch: ${errors}`);

  // Register sync log
  console.log('\nRegistrando sync log...');
  try {
    await supabaseUpsert('conta_azul_sync_log', [{
      account_id: accountId,
      tipo_sync: 'payables-xls-import',
      status: 'success',
      registros_sincronizados: imported,
      started_at: new Date(startTime).toISOString(),
      finished_at: new Date().toISOString(),
    }]);
    console.log('  Sync log registrado.');
  } catch (e) {
    console.error('  Falha ao registrar sync log:', e.message);
  }
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
