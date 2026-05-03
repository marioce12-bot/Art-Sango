const webPush = require('web-push');

const DEFAULT_VAPID_PUBLIC_KEY = 'BAFa3HkBvUUXxsnR7Dgyr6b1iWADG7qP1SsQP-9p-IYfj6PpWDPLp4pt1cbxXynSqdA46eL45PEutTzg9VZcDrM';
const DEFAULT_VAPID_PRIVATE_KEY = 'NUpdsv20xeon0QALNHwnmkC6pgl0vNM-Ti-a-dAQZhc';
const DEFAULT_VAPID_SUBJECT = 'mailto:contact@artsango.local';

let configured = false;

function getPushConfig() {
  return {
    publicKey: process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT,
  };
}

function configureWebPush() {
  const config = getPushConfig();
  if (!config.publicKey || !config.privateKey) {
    throw new Error('Les clés VAPID sont manquantes.');
  }

  if (!configured) {
    webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    configured = true;
  }

  return config;
}

function getPublicKey() {
  return getPushConfig().publicKey;
}

function normalizeNotification(input = {}) {
  const data = input.data && typeof input.data === 'object' ? input.data : {};

  return {
    title: String(input.title || '').trim(),
    body: String(input.body || '').trim(),
    url: String(input.url || data.url || './index.html').trim() || './index.html',
    kind: String(input.kind || data.kind || '').trim(),
    tag: String(input.tag || '').trim(),
    icon: String(input.icon || '').trim(),
    badge: String(input.badge || '').trim(),
    data: {
      ...data,
      url: String(input.url || data.url || './index.html').trim() || './index.html',
      kind: String(input.kind || data.kind || '').trim(),
      title: String(input.title || data.title || '').trim(),
    },
  };
}

async function sendPushNotifications(subscriptions, notification = {}) {
  configureWebPush();

  if (!Array.isArray(subscriptions) || !subscriptions.length) {
    return { sent: 0, failed: 0, total: 0 };
  }

  const payload = JSON.stringify(normalizeNotification(notification));
  const results = await Promise.allSettled(
    subscriptions.map((subscription) => webPush.sendNotification(subscription, payload))
  );

  return {
    sent: results.filter((item) => item.status === 'fulfilled').length,
    failed: results.filter((item) => item.status === 'rejected').length,
    total: subscriptions.length,
  };
}

module.exports = {
  getPublicKey,
  sendPushNotifications,
};
