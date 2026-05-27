const { getPublicKey, sendPushNotifications } = require('../push-service');

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.resolve({});
    }
  }

  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ publicKey: getPublicKey() });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const subscriptions = Array.isArray(body?.subscriptions) ? body.subscriptions : [];
    const notification = body?.notification || {};

    if (!subscriptions.length) {
      return res.status(400).json({ error: 'Aucune souscription push fournie.' });
    }

    const result = await sendPushNotifications(subscriptions, notification);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erreur push.' });
  }
};
