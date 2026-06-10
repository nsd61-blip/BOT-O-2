const https = require('https');

// URL do Google Apps Script — atualizada após implantar
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (!APPS_SCRIPT_URL) {
    return res.status(500).json({ ok: false, error: 'APPS_SCRIPT_URL não configurada' });
  }

  try {
    const data = await fetchJson(APPS_SCRIPT_URL);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const follow = (u, redirects = 0) => {
      if (redirects > 8) return reject(new Error('Too many redirects'));
      const mod = u.startsWith('https') ? https : require('http');
      mod.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return follow(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        let body = '';
        res.setEncoding('utf8');
        res.on('data', c => body += c);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch(e) { reject(new Error('JSON inválido')); }
        });
        res.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}
