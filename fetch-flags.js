const fs = require('fs');
const https = require('https');
const path = require('path');

const flags = {
  USD: 'us', EUR: 'eu', GBP: 'gb', CHF: 'ch', CAD: 'ca', AED: 'ae',
  SAR: 'sa', CNY: 'cn', TRY: 'tr', TND: 'tn', MAD: 'ma', JPY: 'jp'
};

const dir = path.join(process.cwd(), 'assets', 'flags');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

Object.entries(flags).forEach(([code, country]) => {
  const url = `https://flagcdn.com/w40/${country}.png`;
  const dest = path.join(dir, `${code}.png`);
  https.get(url, (res) => {
    const file = fs.createWriteStream(dest);
    res.pipe(file);
  }).on('error', console.error);
});
