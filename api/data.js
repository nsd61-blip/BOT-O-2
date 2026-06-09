const https = require('https');

const FILE_ID = '1fE_-S3cEAzLS0SOA4rnEWGzE4y7bXOUo';
// Exporta só a aba BASE como CSV — muito mais rápido que xlsx (35MB vs ~500KB)
const CSV_URL = `https://docs.google.com/spreadsheets/d/${FILE_ID}/gviz/tq?tqx=out:csv&sheet=BASE`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const csv = await downloadText(CSV_URL);
    const rows = parseCSV(csv);

    if (rows.length < 2) throw new Error('Dados insuficientes no CSV');

    const headers = rows[0];

    const col = (names) => {
      for (const n of names) {
        const i = headers.findIndex(h => h.trim() === n.trim());
        if (i >= 0) return i;
      }
      return -1;
    };

    const iT  = col(['TSK']);
    const iM  = col(['MÊS-ESPELHO','MES-ESPELHO']);
    const iA  = col(['ANO']);
    const iV  = col(['Validação FMO','Validacao FMO']);
    const iC  = col(['Causa']);
    const iCI = col(['Capital-Interior']);
    const iB  = col(['Bairro da falha']);
    const iE  = col(['Endereço(Puro)','Endereco(Puro)']);

    const records = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 3) continue;
      const tsk = (r[iT] || '').trim();
      if (!tsk.startsWith('TSK')) continue;
      const ano = Number(r[iA]);
      if (!ano || isNaN(ano)) continue;
      const mes = (r[iM] || '').trim().toUpperCase();
      if (!mes) continue;

      let end = (r[iE] || '').trim().toUpperCase();
      if (/^TSK\d/.test(end) || /^SP[A-Z]+_/.test(end)) end = '';
      end = end.replace(/,?\s*\d+[\s\S]*$/, '').trim().replace(/^[-.,]+|[-.,]+$/g, '');
      if (end.length <= 4) end = '';

      records.push({
        M: mes,
        A: ano,
        V: (r[iV]  || '').trim().toUpperCase(),
        C: (r[iC]  || '').trim().toUpperCase(),
        CI:(r[iCI] || '').trim().toUpperCase(),
        B: (r[iB]  || '').trim().toUpperCase(),
        E: end
      });
    }

    res.status(200).json({ ok: true, total: records.length, data: records });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// Download texto (CSV)
function downloadText(url) {
  return new Promise((resolve, reject) => {
    const follow = (u, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      const mod = u.startsWith('https') ? https : require('http');
      mod.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return follow(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        res.setEncoding('utf8');
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}

// Parser CSV simples (lida com aspas e vírgulas dentro de campos)
function parseCSV(text) {
  const rows = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let field = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i+1] === '"') { field += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        row.push(field); field = '';
      } else {
        field += ch;
      }
    }
    row.push(field);
    rows.push(row);
  }
  return rows;
}
