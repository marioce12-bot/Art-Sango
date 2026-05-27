import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const LOGO_KEY = 'artsango_platform_logo';
const MANIFEST_LINK_ID = 'dynamic-manifest';
const APPLE_TOUCH_ICON_ID = 'dynamic-apple-touch-icon';

function guessMimeType(src = '') {
  const lower = String(src).toLowerCase();
  if (lower.endsWith('.svg') || lower.startsWith('data:image/svg+xml')) return 'image/svg+xml';
  if (lower.endsWith('.webp') || lower.startsWith('data:image/webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.startsWith('data:image/jpeg')) return 'image/jpeg';
  return 'image/png';
}

function buildManifestHref(logoUrl) {
  const icon = logoUrl || new URL('./icon.svg', location.href).href;
  const startUrl = new URL('./index.html', location.href).href;
  const type = guessMimeType(icon);
  const manifest = {
    name: 'ArtSango',
    short_name: 'ArtSango',
    start_url: startUrl,
    scope: new URL('./', location.href).href,
    display: 'standalone',
    background_color: '#11100e',
    theme_color: '#11100e',
    icons: [
      { src: icon, sizes: '192x192', type, purpose: 'any' },
      { src: icon, sizes: '512x512', type, purpose: 'any' }
    ]
  };

  return URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
}

function applyManifest(logoUrl) {
  let link = document.querySelector(`link[rel="manifest"]#${MANIFEST_LINK_ID}`) || document.querySelector('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }

  const nextHref = buildManifestHref(logoUrl);
  if (link.dataset.blobUrl) {
    try { URL.revokeObjectURL(link.dataset.blobUrl); } catch {}
  }
  link.id = MANIFEST_LINK_ID;
  link.href = nextHref;
  link.dataset.blobUrl = nextHref;
}

function applyAppleTouchIcon(logoUrl) {
  let link = document.querySelector(`link[rel="apple-touch-icon"]#${APPLE_TOUCH_ICON_ID}`) || document.querySelector('link[rel="apple-touch-icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    document.head.appendChild(link);
  }

  link.id = APPLE_TOUCH_ICON_ID;
  link.sizes = '180x180';
  link.href = logoUrl || './icon.svg';
}

async function toDataUrl(src) {
  if (!src) return '';
  if (src.startsWith('data:')) return src;
  try {
    const response = await fetch(src, { mode: 'cors' });
    if (!response.ok) return src;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || src));
      reader.onerror = () => resolve(src);
      reader.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
}

function applyToExistingNodes(logoUrl) {
  const existing = document.querySelectorAll('#platform-logo, .platform-logo-dynamic');
  if (!existing.length) return;
  existing.forEach((img) => {
    if (!(img instanceof HTMLImageElement)) return;
    if (logoUrl) {
      img.src = logoUrl;
      img.style.display = 'inline-block';
    } else {
      img.style.display = 'none';
    }
  });
}

function applyLogo(logoUrl) { applyToExistingNodes(logoUrl); }

async function loadPlatformLogo() {
  const localLogo = localStorage.getItem(LOGO_KEY) || '';
  if (localLogo) {
    applyLogo(localLogo);
    applyAppleTouchIcon(localLogo);
  } else {
    applyAppleTouchIcon('./icon.svg');
  }

  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const snap = await getDoc(doc(db, 'platform', 'branding'));
    const remoteLogo = snap.exists() ? (snap.data().logoUrl || '') : '';
    if (remoteLogo) {
      localStorage.setItem(LOGO_KEY, remoteLogo);
      applyLogo(remoteLogo);
      applyAppleTouchIcon(remoteLogo);
      const manifestIcon = await toDataUrl(remoteLogo);
      applyManifest(manifestIcon || remoteLogo);
      return;
    }
  } catch {}

  if (localLogo) {
    const manifestIcon = await toDataUrl(localLogo);
    applyManifest(manifestIcon || localLogo);
  } else {
    applyManifest('./icon.svg');
    applyLogo('');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadPlatformLogo);
} else {
  loadPlatformLogo();
}
