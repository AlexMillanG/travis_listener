const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');

const URL = 'https://shop.travisscott.com/';
const INTERVAL = 3 * 60 * 1000; // cada 3 minutos
const TARGET_TITLE = 'AIR JORDAN 1 LOW OG SP "FRAGMENT"';
const STATE_FILE = 'last_state.txt';

async function checkShopifyDrop() {
  try {
    const res = await fetch(URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    // buscamos el contenedor con el producto
    const product = $('.P__Info.js-product-info')
      .filter((i, el) => $(el).find('h2').text().includes(TARGET_TITLE))
      .first();

    if (!product.length) {
      console.log(`[${new Date().toLocaleString()}] Producto no encontrado.`);
      return;
    }

    // obtenemos el texto dentro del <p>
    const status = product.find('.PI__desc p').text().trim();
    const previousState = fs.existsSync(STATE_FILE)
      ? fs.readFileSync(STATE_FILE, 'utf8').trim()
      : '';

    console.log(`[${new Date().toLocaleString()}] Estado actual: "${status}"`);

    if (status !== previousState) {
      console.log('🔔 Cambio detectado:', previousState, '→', status);
      fs.writeFileSync(STATE_FILE, status);

      // Aquí puedes mandar notificación: correo, Telegram, Discord, etc.
      // Por ahora solo imprimimos en consola.
    }

  } catch (err) {
    console.error('Error al verificar la página:', err.message);
  }
}

console.log(`👀 Monitoreando ${URL} cada ${INTERVAL / 1000 / 60} min...`);
checkShopifyDrop();
setInterval(checkShopifyDrop, INTERVAL);