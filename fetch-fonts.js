const fs = require('fs');
const https = require('https');
const path = require('path');

const FONTS_DIR = path.join(__dirname, 'fonts');
if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR);

const fetchUrl = (url) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(data));
  }).on('error', reject);
});

const downloadFile = (url, dest) => new Promise((resolve, reject) => {
  const file = fs.createWriteStream(dest);
  https.get(url, (res) => {
    res.pipe(file);
    file.on('finish', () => {
      file.close(resolve);
    });
  }).on('error', reject);
});

async function run() {
  console.log('Fetching CSS for Sen and Manrope...');
  const cssUrl = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sen:wght@400;700;800&display=swap';
  let css = await fetchUrl(cssUrl);
  
  const regex = /url\((https:\/\/[^)]+\.woff2)\)/g;
  let match;
  let counter = 1;
  const urlMap = {};

  while ((match = regex.exec(css)) !== null) {
    const url = match[1];
    if (!urlMap[url]) {
      const isSen = css.substring(match.index - 200, match.index).includes('Sen');
      const filename = `${isSen ? 'sen' : 'manrope'}-${counter++}.woff2`;
      urlMap[url] = filename;
      
      console.log(`Downloading ${filename}...`);
      await downloadFile(url, path.join(FONTS_DIR, filename));
    }
  }

  for (const [url, filename] of Object.entries(urlMap)) {
    css = css.replace(url, `./fonts/${filename}`);
  }

  fs.writeFileSync(path.join(__dirname, 'fonts.css'), css);
  console.log('Done! Generated fonts.css');
}

run().catch(console.error);
