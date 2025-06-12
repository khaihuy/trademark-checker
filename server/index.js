// server/index.js
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/check', async (req, res) => {
  const { brand } = req.body;
  if (!brand) return res.status(400).json({ error: 'Missing brand name' });

  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(\`https://branddb.wipo.int/en/quicksearch?query=\${encodeURIComponent(brand)}\`);

    await page.waitForSelector('.search-results', { timeout: 10000 });
    const wipoResults = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.search-results .result-item'));
      return rows.slice(0, 5).map(row => {
        const brand = row.querySelector('.mark-text')?.textContent.trim() || '';
        const country = row.querySelector('.country')?.textContent.trim() || '';
        const cls = row.querySelector('.nice-class')?.textContent.trim() || '';
        return { brand, country, class: cls };
      });
    });

    await browser.close();

    const markerApiUrl = \`https://api.markerapi.com/api/v2/trademarks/trademark/\${encodeURIComponent(brand)}/status/all/start/1/username/khai123/password/9hKMTBLR4m\`;
    const uspResponse = await fetch(markerApiUrl);
    const uspData = await uspResponse.json();
    const uspResults = uspData?.data || [];

    res.json({ wipo: wipoResults, usp: uspResults });
  } catch (err) {
    console.error('Error during trademark check:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.listen(PORT, () => console.log(\`🚀 Server ready at http://localhost:\${PORT}\`));
