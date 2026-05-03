import { collection, query, where, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

function hasNotificationSupport() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function toMs(value) {
  if (!value) return 0;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function shortRef(id) {
  return id ? String(id).slice(0, 8).toUpperCase() : '';
}

function cleanText(value, max = 120) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function hasPushSupport() {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function hashText(value) {
  let hash = 0;
  const input = String(value || '');
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function toPlainSubscription(subscription) {
  if (!subscription) return null;
  if (typeof subscription.toJSON === 'function') return subscription.toJSON();
  try { return JSON.parse(JSON.stringify(subscription)); } catch { return null; }
}

function normalizeStoredSubscriptions(profileData = {}) {
  const raw = profileData.pushSubscriptions;
  const items = [];

  if (Array.isArray(raw)) {
    items.push(...raw);
  } else if (raw && typeof raw === 'object') {
    items.push(...Object.values(raw));
  }

  if (profileData.pushSubscription) items.push(profileData.pushSubscription);

  const seen = new Set();
  return items
    .map(toPlainSubscription)
    .filter((item) => item && item.endpoint && !seen.has(item.endpoint) && seen.add(item.endpoint));
}

async function loadProfileRecord(db, uid, preferredRole = '') {
  const ordered = preferredRole === 'artisan'
    ? ['artisans', 'clients']
    : (preferredRole === 'client' ? ['clients', 'artisans'] : ['artisans', 'clients']);

  for (const collectionName of ordered) {
    try {
      const snap = await getDoc(doc(db, collectionName, uid));
      if (snap.exists()) return { collectionName, data: snap.data() || {} };
    } catch {}
  }

  return { collectionName: ordered[0] || '', data: {} };
}

async function getPublicPushKey() {
  const res = await fetch('/api/push', { method: 'GET' });
  if (!res.ok) throw new Error('Clé push indisponible');
  const data = await res.json();
  return data.publicKey || '';
}

async function ensurePushSubscription({ db, currentUser, role = '' } = {}) {
  if (!db || !currentUser?.uid || !hasPushSupport()) return false;
  if (!(await requestNotificationPermission())) return false;

  const publicKey = await getPublicPushKey();
  if (!publicKey) throw new Error('Clé publique push manquante');

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  const stored = toPlainSubscription(subscription);
  if (!stored?.endpoint) return false;

  const { collectionName } = await loadProfileRecord(db, currentUser.uid, role);
  if (!collectionName) return false;

  await setDoc(doc(db, collectionName, currentUser.uid), {
    pushSubscriptions: {
      [hashText(stored.endpoint)]: stored,
    },
    pushSubscriptionUpdatedAt: serverTimestamp(),
  }, { merge: true });

  return true;
}

export async function requestNotificationPermission() {
  if (!hasNotificationSupport()) return false;
  if (isIOS() && !isStandalonePwa()) {
    console.warn('Les notifications iOS nécessitent une installation PWA sur l’écran d’accueil.');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function showNotification(title, options = {}) {
  if (!hasNotificationSupport() || Notification.permission !== 'granted') return false;

  const payload = {
    requireInteraction: true,
    ...options,
  };

  payload.icon = payload.icon || './icon.svg';
  payload.badge = payload.badge || './icon.svg';

  payload.tag = payload.tag || `artsango-${Date.now()}`;
  payload.data = {
    ...(payload.data || {}),
    url: options.url || payload.data?.url || '',
    kind: options.kind || payload.data?.kind || '',
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        if (reg && typeof reg.showNotification === 'function') {
          return reg.showNotification(title, payload);
        }
        return new Notification(title, payload);
      })
      .catch(() => {
        new Notification(title, payload);
      });
    return true;
  }

  new Notification(title, payload);
  return true;
}

export function notifyNewMessage(senderName, messageText, options = {}) {
  return showNotification(`Nouveau message de ${senderName}`, {
    body: cleanText(messageText || 'Nouveau message'),
    tag: options.tag || `message-${options.conversationId || Date.now()}`,
    url: options.url || 'messagerie.html',
    kind: 'message',
    icon: options.icon || './icon.svg',
    badge: options.badge || './icon.svg',
  });
}

export function notifyNewOrder(details = {}) {
  const orderId = details.orderId ? `#${shortRef(details.orderId)}` : 'Nouvelle commande';
  const amount = Number(details.amount || 0);
  const amountText = amount ? `${amount.toLocaleString('fr-FR')} XOF` : '';
  const body = details.body || [orderId, amountText].filter(Boolean).join(' · ');

  return showNotification(`Nouvelle commande${details.clientName ? ` de ${details.clientName}` : ''}`, {
    body,
    tag: details.tag || `order-${details.orderId || Date.now()}`,
    url: details.url || 'commandes.html',
    kind: 'order',
    icon: details.icon || './icon.svg',
    badge: details.badge || './icon.svg',
  });
}

export async function setupNotifications({ db, currentUser, role = '' } = {}) {
  const granted = await requestNotificationPermission();
  if (granted && db && currentUser?.uid) {
    try {
      await ensurePushSubscription({ db, currentUser, role });
    } catch (e) {
      console.warn('Push setup failed:', e.message);
    }
  }
  return granted;
}

export async function sendPushToUser({
  db,
  recipientUid,
  title,
  body = '',
  url = '',
  kind = '',
  data = {},
  icon = '',
  badge = '',
  tag = '',
} = {}) {
  if (!db || !recipientUid || !title) return { sent: 0, skipped: true };

  const { data: profileData } = await loadProfileRecord(db, recipientUid);
  const subscriptions = normalizeStoredSubscriptions(profileData);
  if (!subscriptions.length) return { sent: 0, skipped: true };

  const res = await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscriptions,
      notification: {
        title,
        body: cleanText(body),
        url,
        kind,
        data,
        icon,
        badge,
        tag,
      },
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Impossible d\'envoyer la notification push.');
  return json;
}

export function startConversationNotifications({
  db,
  currentUser,
  getActiveConversationId = () => '',
  basePath = 'messagerie.html',
} = {}) {
  if (!db || !currentUser?.uid) return () => {};

  const seenLastAt = new Map();
  let bootstrapped = false;
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', currentUser.uid));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const activeConversationId = typeof getActiveConversationId === 'function' ? getActiveConversationId() : '';

    if (!bootstrapped) {
      snapshot.docs.forEach((doc) => {
        const data = doc.data() || {};
        seenLastAt.set(doc.id, toMs(data.lastAt || data.createdAt));
      });
      bootstrapped = true;
      return;
    }

    snapshot.docChanges().forEach((change) => {
      const conv = change.doc.data() || {};
      const convId = change.doc.id;
      const lastMs = toMs(conv.lastAt || conv.createdAt);
      const prevMs = seenLastAt.get(convId) || 0;

      if (lastMs && lastMs <= prevMs) return;
      if (lastMs) seenLastAt.set(convId, lastMs);
      if (convId === activeConversationId) return;

      const unreadForMe = Array.isArray(conv.unreadFor) && conv.unreadFor.includes(currentUser.uid);
      const fromOther = conv.lastSender && conv.lastSender !== currentUser.uid;
      if (!unreadForMe || !fromOther) return;

      const otherUid = (conv.participants || []).find((uid) => uid !== currentUser.uid) || '';
      const senderName = conv.participantNames?.[otherUid] || conv.lastSenderName || 'Utilisateur';
      const targetUrl = otherUid ? `${basePath}?artisanId=${encodeURIComponent(otherUid)}&open=1` : basePath;

      notifyNewMessage(senderName, conv.lastMessage || 'Nouveau message', {
        url: targetUrl,
        conversationId: convId,
        tag: `message-${convId}`,
      });
    });
  });

  return unsubscribe;
}

export function startOrderNotifications({
  db,
  currentUser,
  basePath = 'commandes.html',
} = {}) {
  if (!db || !currentUser?.uid) return () => {};

  const seenIds = new Set();
  let bootstrapped = false;
  const q = query(collection(db, 'commandes'), where('artisanId', '==', currentUser.uid));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (!bootstrapped) {
      snapshot.docs.forEach((doc) => seenIds.add(doc.id));
      bootstrapped = true;
      return;
    }

    snapshot.docChanges().forEach((change) => {
      if (change.type !== 'added') return;
      if (seenIds.has(change.doc.id)) return;

      seenIds.add(change.doc.id);
      const order = change.doc.data() || {};

      notifyNewOrder({
        clientName: order.clientName || 'un client',
        orderId: change.doc.id,
        amount: order.montant || 0,
        url: basePath,
        tag: `order-${change.doc.id}`,
      });
    });
  });

  return unsubscribe;
}
