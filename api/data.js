const https = require('https');

const FILE_ID = '1fE_-S3cEAzLS0SOA4rnEWGzE4y7bXOUo';
const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${FILE_ID}/export?format=xlsx`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const buffer = await downloadFile(EXPORT_URL);
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets['BASE'];
    if (!sheet) throw new Error('Aba BASE não encontrada');

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const headers = rows[0];

    const col = (names) => {
      for (const n of names) {
        const i = headers.indexOf(n);
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
      if (!String(r[iT] || '').startsWith('TSK')) continue;
      const ano = Number(r[iA]);
      if (!ano || isNaN(ano)) continue;
      const mes = String(r[iM] || '').trim().toUpperCase();
      if (!mes) continue;

      let end = String(r[iE] || '').trim().toUpperCase();
      if (/^TSK\d/.test(end) || /^SP[A-Z]+_/.test(end)) end = '';
      end = end.replace(/,?\s*\d+[\s\S]*$/, '').trim().replace(/^[-.,]+|[-.,]+$/g, '');
      if (end.length <= 4) end = '';

      records.push({
        M: mes, A: ano,
        V: String(r[iV]  || '').trim().toUpperCase(),
        C: String(r[iC]  || '').trim().toUpperCase(),
        CI:String(r[iCI] || '').trim().toUpperCase(),
        B: String(r[iB]  || '').trim().toUpperCase(),
        E: end
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, total: records.length, data: records });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const follow = (u, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return follow(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}
