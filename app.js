const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
var admin = require("firebase-admin");s

const URL = 'https://shop.travisscott.com/';
const INTERVAL = 3 * 60 * 1000; // cada 3 minutos
const TARGET_TITLE = 'AIR JORDAN 1 LOW OG SP "FRAGMENT"';
const STATE_FILE = 'last_state.txt';
const FCM_SERVR_KEY = process.env.FCM_SERVER_KEY

var serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


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
        await sendNotification(
        '👟 Cambio detectado en Travis Scott Shop',
        `Estado: ${status}`
        );
    }

  } catch (err) {
    console.error('Error al verificar la página:', err.message);
  }
}

async function sendNotification(title, body) {
  await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: '/topics/drops',
      notification: {
        title,
        body,
        sound: 'default',
      },
      data: {
        trigger: 'drop_detected',
        status: body,
      },
    }),
  });
}


console.log(`👀 Monitoreando ${URL} cada ${INTERVAL / 1000 / 60} min...`);
checkShopifyDrop();
setInterval(checkShopifyDrop, INTERVAL);