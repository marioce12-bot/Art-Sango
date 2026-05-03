import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const LOGO_KEY = 'artsango_platform_logo';

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
  if (localLogo) applyLogo(localLogo);

  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const snap = await getDoc(doc(db, 'platform', 'branding'));
    const remoteLogo = snap.exists() ? (snap.data().logoUrl || '') : '';
    if (remoteLogo) {
      localStorage.setItem(LOGO_KEY, remoteLogo);
      applyLogo(remoteLogo);
      return;
    }
  } catch {}

  if (!localLogo) applyLogo('');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadPlatformLogo);
} else {
  loadPlatformLogo();
}
