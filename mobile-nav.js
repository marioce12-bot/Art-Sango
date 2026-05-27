(() => {
  const LOGO_KEY = 'artsango_platform_logo';
  const ROLE_KEY = 'artsango_user_role';
  const HIDE_ON = new Set(['index.html', 'connexion.html', 'connexion-client.html', 'inscription-artisan.html']);
  const NOTIF_PAGES = new Set(['messagerie.html', 'dashboard-artisan.html', 'dashboard-client.html', 'commandes.html']);
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  if (HIDE_ON.has(path)) return;

  function buildManifestHref(iconUrl) {
    const fallbackIcon = './icon.svg';
    const icon = iconUrl || fallbackIcon;
    const manifest = {
      name: 'ArtSango',
      short_name: 'ArtSango',
      start_url: './index.html',
      display: 'standalone',
      background_color: '#11100e',
      theme_color: '#11100e',
      icons: [
        { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' }
      ]
    };
    return URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
  }

  function updateManifestFromBranding() {
    const logo = localStorage.getItem(LOGO_KEY) || '';
    const href = buildManifestHref(logo);
    let link = document.querySelector('link[rel="manifest"]#dynamic-manifest');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.id = 'dynamic-manifest';
      document.head.appendChild(link);
    }
    if (link.dataset.blobUrl) {
      try { URL.revokeObjectURL(link.dataset.blobUrl); } catch {}
    }
    link.href = href;
    link.dataset.blobUrl = href;
  }

  function ensurePwaMeta() {
    updateManifestFromBranding();

    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#11100e';
      document.head.appendChild(meta);
    }

    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      const appleCapable = document.createElement('meta');
      appleCapable.name = 'apple-mobile-web-app-capable';
      appleCapable.content = 'yes';
      document.head.appendChild(appleCapable);
    }

    if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) {
      const appleBar = document.createElement('meta');
      appleBar.name = 'apple-mobile-web-app-status-bar-style';
      appleBar.content = 'black-translucent';
      document.head.appendChild(appleBar);
    }
  }

  const cachedRole = localStorage.getItem(ROLE_KEY);
  const accountHref = cachedRole === 'artisan'
    ? 'dashboard-artisan.html'
    : (cachedRole === 'client' ? 'dashboard-client.html' : 'connexion.html');

  const navItems = [
    {
      href: 'marketplace.html',
      active: path === 'marketplace.html' || path === 'produit-detail.html',
      label: 'Marketplace',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18l-1.4 6.7a2 2 0 0 1-2 1.6H6.4a2 2 0 0 1-2-1.6L3 7Zm3 8.3V20h12v-4.7M8 11h8"/></svg>'
    },
    {
      href: 'panier.html',
      active: path === 'panier.html' || path === 'checkout.html',
      label: 'Panier',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 1.9-1.4L22 7H7M10 20a1 1 0 1 0 0 .01M18 20a1 1 0 1 0 0 .01"/></svg>'
    },
    {
      href: 'commandes.html',
      active: path === 'commandes.html',
      label: 'Commandes',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v13H4zM4 10h16M8 3v6M16 3v6"/></svg>'
    },
    {
      href: 'messagerie.html',
      active: path === 'messagerie.html',
      label: 'Messagerie',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v10H7l-3 3V6zM8 10h8M8 13h5"/></svg>'
    },
    {
      href: accountHref,
      active: path === 'dashboard-artisan.html' || path === 'dashboard-client.html',
      label: 'Compte',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0"/></svg>'
    }
  ];

  const style = document.createElement('style');
  style.textContent = `
    .mobile-bottom-nav {
      position: fixed;
      left: 10px;
      right: 10px;
      bottom: calc(10px + env(safe-area-inset-bottom));
      z-index: 1200;
      display: none;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 2px;
      padding: 6px;
      background: rgba(18,14,11,0.88);
      border: 1px solid rgba(227,189,136,0.3);
      border-radius: 16px;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 8px 28px rgba(0,0,0,0.3);
    }
    .mobile-bottom-nav a {
      min-height: 54px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      text-decoration: none;
      color: #d7c3a1;
      transition: background-color 120ms ease, color 120ms ease;
    }
    .mobile-msg-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 999px;
      background: #dc2626;
      color: #fff;
      font-size: 10px;
      line-height: 16px;
      text-align: center;
      font-weight: 700;
      display: none;
    }
    .mobile-bottom-nav a svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.9;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .mobile-bottom-nav a.is-active {
      color: #f3e7d4;
      background: rgba(255,255,255,0.1);
    }
    @media (max-width: 720px) {
      .mobile-bottom-nav { display: grid; }
      body { padding-bottom: calc(88px + env(safe-area-inset-bottom)) !important; }
      html, body { overscroll-behavior-y: contain; }
      .topbar, .top { align-items: flex-start !important; }
      .logo, .logo-link { align-self: flex-start !important; }
    }
  `;
  document.head.appendChild(style);

  const nav = document.createElement('nav');
  nav.className = 'mobile-bottom-nav';
  nav.setAttribute('aria-label', 'Navigation mobile');
  nav.innerHTML = navItems.map((item) => {
    const cls = item.active ? 'is-active' : '';
    const accountAttr = item.label === 'Compte' ? ' data-account-link="1"' : '';
    const msgAttr = item.label === 'Messagerie' ? ' data-msg-link="1"' : '';
    const badge = item.label === 'Messagerie' ? '<span class="mobile-msg-badge" data-msg-badge="1">0</span>' : '';
    return `<a class="${cls}" href="${item.href}"${accountAttr}${msgAttr} aria-label="${item.label}" title="${item.label}">${item.icon}${badge}</a>`;
  }).join('');

  function setAccountLinkHref(href) {
    nav.querySelectorAll('[data-account-link="1"]').forEach((a) => {
      a.setAttribute('href', href);
    });
  }

  function setUnreadBadge(count) {
    const n = Number(count) || 0;
    nav.querySelectorAll('[data-msg-badge="1"]').forEach((badge) => {
      if (n > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = n > 99 ? '99+' : String(n);
      } else {
        badge.style.display = 'none';
      }
    });
  }

  async function resolveAccountLink() {
    try {
      const [{ initializeApp, getApps }, { getAuth, onAuthStateChanged }, { getFirestore, doc, getDoc, collection, query, where, getDocs }] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
      ]);

      const firebaseConfig = {
        apiKey: 'AIzaSyAghL7HcGVTWur9ijJzjWXywTgvCaiJ01M',
        authDomain: 'art-sango.firebaseapp.com',
        projectId: 'art-sango',
        storageBucket: 'art-sango.firebasestorage.app',
        messagingSenderId: '840868763552',
        appId: '1:840868763552:web:b7cb1ac710d3b9968436c5'
      };

      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);

      const startGlobalNotifications = async (user, role = '') => {
        if (!user?.uid || NOTIF_PAGES.has(path)) return;

        const notifKey = `${user.uid}:${role}`;
        if (window.__artsangoNotificationKey === notifKey && typeof window.notificationUnsubscribe === 'function') return;

        try {
          const { setupNotifications, startConversationNotifications, startOrderNotifications } = await import('./messaging-service.js');
          await setupNotifications({ db, currentUser: user, role });

          if (typeof window.notificationUnsubscribe === 'function') window.notificationUnsubscribe();

          const unsubscribers = [
            startConversationNotifications({
              db,
              currentUser: user,
              basePath: 'messagerie.html',
            }),
          ];

          if (role === 'artisan') {
            unsubscribers.push(startOrderNotifications({
              db,
              currentUser: user,
              basePath: 'commandes.html',
            }));
          }

          window.notificationUnsubscribe = () => {
            unsubscribers.forEach((stop) => {
              if (typeof stop === 'function') stop();
            });
          };
          window.__artsangoNotificationKey = notifKey;
        } catch (e) {
          console.warn('Notifications non configurées:', e.message);
        }
      };

      const refreshUnread = async (uid) => {
        if (!uid) { setUnreadBadge(0); return; }
        try {
          const snap = await getDocs(query(collection(db, 'conversations'), where('participants', 'array-contains', uid)));
          const unread = snap.docs.reduce((acc, d) => {
            const data = d.data() || {};
            return acc + ((Array.isArray(data.unreadFor) && data.unreadFor.includes(uid)) ? 1 : 0);
          }, 0);
          setUnreadBadge(unread);
        } catch {
          setUnreadBadge(0);
        }
      };

      const resolveRoleForUser = async (user) => {
        if (!user) {
          if (typeof window.notificationUnsubscribe === 'function') window.notificationUnsubscribe();
          window.notificationUnsubscribe = null;
          window.__artsangoNotificationKey = '';
          setAccountLinkHref('connexion.html');
          localStorage.removeItem(ROLE_KEY);
          setUnreadBadge(0);
          return;
        }

        const artisanSnap = await getDoc(doc(db, 'artisans', user.uid));
        if (artisanSnap.exists()) {
          localStorage.setItem(ROLE_KEY, 'artisan');
          setAccountLinkHref('dashboard-artisan.html');
          await refreshUnread(user.uid);
          await startGlobalNotifications(user, 'artisan');
          return;
        }

        const clientSnap = await getDoc(doc(db, 'clients', user.uid));
        if (clientSnap.exists()) {
          localStorage.setItem(ROLE_KEY, 'client');
          setAccountLinkHref('dashboard-client.html');
          await refreshUnread(user.uid);
          await startGlobalNotifications(user, 'client');
          return;
        }

        setAccountLinkHref('connexion.html');
        await refreshUnread(user.uid);
        await startGlobalNotifications(user, '');
      };

      if (auth.currentUser) {
        resolveRoleForUser(auth.currentUser).catch(() => {});
      } else {
        onAuthStateChanged(auth, (user) => {
          resolveRoleForUser(user).catch(() => {});
        });
      }

      setInterval(() => {
        const uid = auth.currentUser?.uid || '';
        refreshUnread(uid).catch(() => {});
      }, 8000);
    } catch {
      // Garde le fallback courant si Firebase n'est pas disponible
    }
  }

  ensurePwaMeta();
  setTimeout(updateManifestFromBranding, 1200);
  setTimeout(updateManifestFromBranding, 2600);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(nav);
      resolveAccountLink();
    });
  } else {
    document.body.appendChild(nav);
    resolveAccountLink();
  }
})();
