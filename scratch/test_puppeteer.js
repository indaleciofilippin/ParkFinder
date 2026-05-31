const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <script type="module" src="https://unpkg.com/rebill@latest/dist/rebill/rebill.esm.js"></script>
    </head>
    <body>
      <rebill-save-card processing-country="AR" public-key="pk_6abbb605fa104702aee3cd3b04899836"></rebill-save-card>
    </body>
    </html>
  `, { waitUntil: 'networkidle0' });

  await new Promise(r => setTimeout(r, 4000));

  const shadowHTML = await page.evaluate(() => {
    const el = document.querySelector('rebill-save-card');
    if (!el || !el.shadowRoot) return "No shadow root";
    return el.shadowRoot.innerHTML;
  });

  console.log("=== SHADOW DOM ===");
  console.log(shadowHTML);

  await browser.close();
})();
