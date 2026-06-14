const https = require('https');

// URL do seu Google Apps Script
const SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (!SCRIPT_URL) {
    return res.status(500).json({ ok: false, error: 'APPS_SCRIPT_URL não configurada no Vercel' });
  }

  try {
    const data = await fetch_json(SCRIPT_URL);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

function fetch_json(url) {
  return new Promise((resolve, reject) => {
    const follow = (u, hops) => {
      if (hops > 8) return reject(new Error('Too many redirects'));
      const mod = u.startsWith('https') ? https : require('http');
      mod.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return follow(res.headers.location, hops + 1);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        let body = '';
        res.setEncoding('utf8');
        res.on('data', c => body += c);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch(e) { reject(new Error('Resposta inválida do Apps Script')); }
        });
        res.on('error', reject);
      }).on('error', reject);
    };
    follow(url, 0);
  });
}
