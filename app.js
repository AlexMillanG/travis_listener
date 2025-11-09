const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');

const URL = 'https://shop.travisscott.com/';
const INTERVAL = 3 * 60 * 1000; // cada 3 minutos
const TARGET_TITLE = 'AIR JORDAN 1 LOW OG SP "FRAGMENT"';
const STATE_FILE = 'last_state.txt';
const SERVICE_ACCOUNT_PATH = './firebase-key.json'; // ruta a tu clave JSON
const PROJECT_ID = 'sockettravis-6e629';
const TOPIC = 'drops';

// Configura la autenticación con Firebase Cloud Messaging API v1
const auth = new GoogleAuth({
  keyFile: SERVICE_ACCOUNT_PATH,
  scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
});

async function sendNotification(title, body) {
  try {
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const message = {
      message: {
        topic: TOPIC,
        notification: {
          title,
          body,
        },
        data: {
          trigger: 'drop_detected',
          status: body,
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    const result = await response.json();
    console.log('📩 Notificación enviada:', result);
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error.message);
  }
}

async function checkShopifyDrop() {
  try {
    const res = await fetch(URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const product = $('.P__Info.js-product-info')
      .filter((i, el) => $(el).find('h2').text().includes(TARGET_TITLE))
      .first();

    if (!product.length) {
      console.log(`[${new Date().toLocaleString()}] Producto no encontrado.`);
      return;
    }

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

console.log(`👀 Monitoreando ${URL} cada ${INTERVAL / 1000 / 60} min...`);
checkShopifyDrop();
sendNotification('🔥 Prueba Travis Dropwatcher', 'Notificación de prueba funcionando');
setInterval(checkShopifyDrop, INTERVAL);
