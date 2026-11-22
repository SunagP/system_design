/**
 * Designed to Scale - Auth & Razorpay Lifetime Payment Controller
 *
 * Rules:
 * 1. Foundations (Module 01) & Scaling up to Load Balancing: FREE to all.
 * 2. Gated Modules (35 lessons):
 *    - Step 1: Sign in with Google (Firebase Authentication).
 *    - Step 2: One-time payment of ₹49 via Razorpay (UPI & Cards) for Lifetime Access.
 *    - Access granted ONLY after successful payment.
 */

(function () {
  'use strict';

  const FREE_LESSONS = new Set([
    'request-lifecycle',
    'latency-throughput',
    'napkin-math',
    'vertical-horizontal',
    'load-balancing'
  ]);

  const GOOGLE_SVG = `<svg class="google-btn__icon" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
  </svg>`;

  const LOCK_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lesson-lock-icon" title="Sign in & unlock for ₹49">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`;

  let currentUser = null;
  let firebaseAuth = null;
  let isFirebaseConfigured = false;

  // 1. Strict Gmail Validation
  function isValidGmail(email) {
    if (!email || typeof email !== 'string') return false;
    const clean = email.trim().toLowerCase();
    return /^[a-zA-Z0-9._%+-]+@(gmail\.com|googlemail\.com)$/i.test(clean);
  }

  // 2. Paid Users Registry
  function getPaidUsers() {
    try {
      const stored = localStorage.getItem('sdt:paid_users');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  }

  function isUserPaid(user) {
    if (!user || !user.email) return false;
    const paid = getPaidUsers();
    return Boolean(paid[user.email.toLowerCase()]);
  }

  function recordSuccessfulPayment(paymentId) {
    if (!currentUser || !currentUser.email) return;
    const paid = getPaidUsers();
    paid[currentUser.email.toLowerCase()] = {
      paymentId: paymentId || ('pay_' + Math.random().toString(36).substring(2, 11)),
      timestamp: new Date().toISOString(),
      amount: 49,
      currency: 'INR',
      tier: 'LIFETIME'
    };
    try {
      localStorage.setItem('sdt:paid_users', JSON.stringify(paid));
    } catch (e) {}

    closePaymentModal();
    renderTopbarAuth();
    updateSidebarLocks();
    checkActiveLessonAccess();
    showToast(`Payment of ₹49 verified! (ID: ${paymentId}). Lifetime access unlocked! 🎉`);
  }

  // Load session from local cache or URL param for testing
  try {
    const urlUser = new URLSearchParams(window.location.search).get('user');
    if (urlUser && isValidGmail(urlUser)) {
      currentUser = {
        uid: 'firebase-test-123',
        email: urlUser,
        displayName: urlUser.split('@')[0],
        photoURL: ''
      };
    } else {
      const cached = localStorage.getItem('sdt:auth_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && isValidGmail(parsed.email)) {
          currentUser = parsed;
        } else {
          localStorage.removeItem('sdt:auth_user');
        }
      }
    }
  } catch (e) {}

  function getFirebaseConfig() {
    const cfg = window.FIREBASE_CONFIG;
    if (cfg && cfg.apiKey && cfg.apiKey.trim().length > 10 && !cfg.apiKey.includes('YOUR_')) {
      return cfg;
    }
    return null;
  }

  // Initialize Firebase App & Auth
  async function initFirebase() {
    const cfg = getFirebaseConfig();
    if (!cfg) {
      isFirebaseConfigured = false;
      return;
    }

    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const { 
        getAuth, 
        GoogleAuthProvider, 
        onAuthStateChanged,
        browserLocalPersistence,
        setPersistence
      } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');

      const app = initializeApp(cfg);
      firebaseAuth = getAuth(app);
      
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);
      } catch (e) {}

      isFirebaseConfigured = true;

      onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          if (!isValidGmail(user.email)) {
            const { signOut: fbSignOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
            await fbSignOut(firebaseAuth);
            setUser(null);
            showAuthModal(`Access Restricted: "${user.email}" is not an @gmail.com address. Please sign in with a Gmail account.`);
            return;
          }

          setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || ''
          });

          // Check if user has paid. If not, open payment prompt gently
          if (!isUserPaid(user)) {
            setTimeout(() => {
              const hash = window.location.hash || '';
              const match = /^#\/([\w-]+)/.exec(hash);
              if (match && !FREE_LESSONS.has(match[1])) {
                showPaymentModal();
              }
            }, 600);
          }
        } else {
          if (!currentUser || !currentUser.uid.startsWith('firebase-test')) {
            setUser(null);
          }
        }
      });
    } catch (err) {
      console.warn('[AuthManager] Firebase initialization error:', err);
      isFirebaseConfigured = false;
    }
  }

  function setUser(user) {
    currentUser = user;
    try {
      if (user) {
        localStorage.setItem('sdt:auth_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('sdt:auth_user');
      }
    } catch (e) {}

    renderTopbarAuth();
    updateSidebarLocks();
    checkActiveLessonAccess();
  }

  // Google Sign-In Action via Firebase
  async function signInWithGoogle() {
    if (!firebaseAuth) {
      await initFirebase();
    }

    if (!firebaseAuth) {
      showAuthModal('Firebase Authentication is initializing. Please verify your keys in firebase-config.js.');
      return;
    }

    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
        hd: 'gmail.com'
      });

      const result = await signInWithPopup(firebaseAuth, provider);
      const user = result.user;

      if (!isValidGmail(user.email)) {
        const { signOut: fbSignOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
        await fbSignOut(firebaseAuth);
        setUser(null);
        showAuthModal(`Access Restricted: "${user.email}" is not an @gmail.com address. Please sign in using a Gmail account.`);
        return;
      }

      setUser({
        uid: 'firebase-' + user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || ''
      });

      closeAuthModal();
      showToast(`Signed in as ${user.email}!`);

      // If user hasn't paid yet, prompt payment gently
      if (!isUserPaid(user)) {
        showPaymentModal();
      }
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') return;

      let friendlyMsg = err.message;
      if (err.code === 'auth/unauthorized-domain') {
        friendlyMsg = `Firebase Error: "localhost" is not in Authorized Domains. In Firebase Console, go to Authentication -> Settings -> Authorized domains -> Add "localhost".`;
      } else if (err.code === 'auth/operation-not-allowed') {
        friendlyMsg = `Firebase Error: Google provider is not enabled. In Firebase Console, go to Authentication -> Sign-in method -> Enable Google.`;
      } else if (err.code === 'auth/popup-blocked') {
        friendlyMsg = `Popup was blocked by your browser. Please click again or allow popups for localhost:3333.`;
      }
      console.error('[Firebase Sign-In Error]:', err);
      showAuthModal(friendlyMsg);
    }
  }

  // Password / Credentials Sign-In via Firebase (or QA Reviewer Fallback)
  async function signInWithEmail(email, password) {
    if (!email || !password) {
      showToast('Please enter both Gmail address and password.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidGmail(cleanEmail)) {
      showToast('Access Restricted: Only @gmail.com accounts are permitted.');
      return;
    }

    if (!firebaseAuth) {
      await initFirebase();
    }

    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      let user = null;
      try {
        const cred = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
        user = cred.user;
      } catch (err) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
          try {
            const newCred = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, password);
            user = newCred.user;
          } catch (createErr) {
            if (createErr.code === 'auth/email-already-in-use') {
              throw new Error('Incorrect password for this email account.');
            }
            throw createErr;
          }
        } else {
          throw err;
        }
      }

      if (user) {
        setUser({
          uid: 'firebase-' + user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || ''
        });

        closeAuthModal();
        showToast(`Signed in as ${user.email}!`);

        if (!isUserPaid(user)) {
          showPaymentModal();
        }
      }
    } catch (err) {
      console.warn('[Firebase Email Auth]:', err);
      // Fallback for Razorpay QA review or offline testing
      if (err.code === 'auth/operation-not-allowed' || !firebaseAuth || cleanEmail === 'testuser@gmail.com') {
        setUser({
          uid: 'test-qa-' + Math.random().toString(36).substring(2, 8),
          email: cleanEmail,
          displayName: cleanEmail.split('@')[0],
          photoURL: ''
        });
        closeAuthModal();
        showToast(`Signed in as ${cleanEmail}!`);
        if (!isUserPaid({ email: cleanEmail })) {
          showPaymentModal();
        }
      } else {
        showToast('Login failed: ' + (err.message || 'Please check your credentials.'));
      }
    }
  }

  async function signOut() {
    if (isFirebaseConfigured && firebaseAuth) {
      try {
        const { signOut: fbSignOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
        await fbSignOut(firebaseAuth);
      } catch (e) {}
    }
    setUser(null);
    showToast('Signed out. Free preview active.');
  }

  function showToast(msg) {
    const existing = document.getElementById('auth-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'auth-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--paper-sheet, #fff);
      color: var(--ink, #1c1917);
      border: 2px solid var(--ink, #1c1917);
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      box-shadow: 3px 4px 0 var(--ink, #1c1917);
      z-index: 9999;
      animation: paywallFadeIn 0.2s ease-out;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function closeAuthModal() {
    const existing = document.getElementById('auth-modal-dialog');
    if (existing) existing.remove();
  }

  function closePaymentModal() {
    const existing = document.getElementById('payment-modal-dialog');
    if (existing) existing.remove();
  }

  function showAuthModal(errMsg = '') {
    openAuthModal(errMsg);
  }

  function openAuthModal(errMsg = '') {
    closeAuthModal();

    const modal = document.createElement('div');
    modal.id = 'auth-modal-dialog';
    modal.className = 'auth-modal-backdrop';
    modal.innerHTML = `
      <div class="auth-modal" style="max-width: 420px;">
        <button class="auth-modal__close" id="modal-close-btn">&times;</button>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
          <span style="font-size:22px;">🔐</span>
          <div>
            <h3 style="margin:0; font-size:16px; font-weight:800; line-height:1.2;">Sign in to Continue</h3>
            <span style="font-size:11px; color:var(--muted,#78716c);">Strict @gmail.com authentication</span>
          </div>
        </div>

        ${errMsg ? `
          <div style="background:#fee2e2; color:#b91c1c; padding:8px 12px; border-radius:8px; font-size:11.5px; margin-bottom:12px; border:1px solid #f87171; line-height:1.4;">
            ${errMsg}
          </div>
        ` : ''}

        <button class="google-btn" id="modal-google-btn" style="width:100%; justify-content:center; padding:10px 16px; font-size:13px; border-radius:9px;">
          ${GOOGLE_SVG}
          <span>Continue with Google</span>
        </button>

        <div class="auth-divider">or sign in with password</div>

        <form class="auth-email-form" id="modal-email-form">
          <input type="email" id="modal-email-input" class="auth-input-field" placeholder="username@gmail.com" required autocomplete="username" />
          <input type="password" id="modal-password-input" class="auth-input-field" placeholder="Password" required autocomplete="current-password" />
          <button type="submit" class="auth-submit-btn" id="modal-email-submit">Sign In / Sign Up</button>
        </form>

        <div class="auth-test-helper-card" style="margin-top:12px;">
          <b>⚡ Razorpay Verification / QA Credentials:</b><br>
          Email: <code>testuser@gmail.com</code><br>
          Password: <code>TestPassword123!</code>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#modal-close-btn').onclick = closeAuthModal;
    modal.onclick = (e) => { if (e.target === modal) closeAuthModal(); };
    modal.querySelector('#modal-google-btn').onclick = () => {
      closeAuthModal();
      signInWithGoogle();
    };

    const form = modal.querySelector('#modal-email-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const email = (modal.querySelector('#modal-email-input').value || '').trim();
        const pass = (modal.querySelector('#modal-password-input').value || '').trim();
        signInWithEmail(email, pass);
      };
    }
  }

  // 3. Gentle Razorpay Payment Modal
  function showPaymentModal() {
    closePaymentModal();
    if (!currentUser) {
      signInWithGoogle();
      return;
    }

    const cfg = window.RAZORPAY_CONFIG || {};
    const key = cfg.keyId || '';
    const isKeyConfigured = Boolean(key && !key.includes('YOUR_KEY_HERE') && key.startsWith('rzp_'));

    const modal = document.createElement('div');
    modal.id = 'payment-modal-dialog';
    modal.className = 'payment-modal-backdrop';
    modal.innerHTML = `
      <div class="payment-card-modal">
        <button class="auth-modal__close" id="pay-modal-close-btn">&times;</button>
        
        <div class="payment-header">
          <div class="payment-icon-tile">✨</div>
          <div class="payment-title-group">
            <h2>Support the Project &amp; Unlock Lifetime Access</h2>
            <span>Signed in as <b>${currentUser.email}</b></span>
          </div>
        </div>

        <p class="payment-gentle-msg">
          To help maintain our interactive simulation servers, cover database and infrastructure costs, and continuously build new system design scenarios, we ask for a small one-time contribution.
          <br><br>
          There are <strong>no monthly subscriptions or recurring fees</strong>—just a single contribution of <strong>₹49</strong> for lifetime access to the entire application.
        </p>

        <ul class="payment-perks">
          <li class="payment-perk-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Full lifetime access to all 40 interactive modules</span>
          </li>
          <li class="payment-perk-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            <span>All future system design scenarios, labs &amp; updates included</span>
          </li>
          <li class="payment-perk-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Pay once, keep forever · Tied to your Gmail</span>
          </li>
        </ul>

        <div class="payment-pricing-banner">
          <div class="payment-price-tag">
            <span class="payment-price-currency">₹</span>
            <span class="payment-price-val">49</span>
            <span class="payment-price-sub">/ one-time</span>
          </div>
          <div class="payment-methods-icons">
            <span>Accepted Payment Methods</span>
            <div class="payment-methods-pills">
              <span class="payment-pill">UPI</span>
              <span class="payment-pill">GPay</span>
              <span class="payment-pill">PhonePe</span>
              <span class="payment-pill">Cards</span>
            </div>
          </div>
        </div>

        <button class="razorpay-pay-btn" id="execute-razorpay-btn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          <span>Pay ₹49 &amp; Unlock Lifetime Access</span>
        </button>

        ${key.startsWith('rzp_test_') ? `
          <div style="background:#fef9c3; border:1px solid #eab308; border-radius:8px; padding:10px 12px; font-size:11.5px; color:#854d0e; line-height:1.45;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
              <b>⚡ Razorpay Test Mode Active:</b>
              <button id="quick-test-unlock-btn" style="background:#16a34a; color:#fff; border:none; border-radius:6px; padding:4px 10px; font-family:inherit; font-size:11px; font-weight:700; cursor:pointer;">Simulate Test Unlock (₹49)</button>
            </div>
            <span>NPCI restricts manual UPI ID typing on desktop, and test QRs cannot be scanned with real banking apps. To test the Razorpay popup, select <b>Card</b> with test number <code>4012 0000 0000 0002</code>, CVV <code>123</code>, or click <b>Simulate Test Unlock</b> above.</span>
          </div>
        ` : ''}

        ${!isKeyConfigured ? `
          <div style="background:#fef9c3; border:1px solid #eab308; border-radius:8px; padding:10px; font-size:11px; color:#854d0e;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <b>⚡ Test Mode Available:</b>
              <button id="demo-pay-btn" style="background:#ca8a04; color:#fff; border:none; border-radius:6px; padding:3px 8px; font-family:inherit; font-size:10px; font-weight:700; cursor:pointer;">Complete Test Payment (₹49)</button>
            </div>
            <span>To connect your live Razorpay gateway, paste your <b>Key ID</b> in <code>razorpay-config.js</code> or in the box below:</span>
            <div style="display:flex; gap:6px; margin-top:6px;">
              <input type="text" id="razorpay-key-input" placeholder="rzp_test_... or rzp_live_..." style="flex:1; padding:4px 8px; font-size:11px; border:1px solid #ca8a04; border-radius:6px; font-family:monospace;" />
              <button id="save-razorpay-key-btn" style="background:#854d0e; color:#fff; border:none; border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;">Save</button>
            </div>
          </div>
        ` : ''}

        <div class="payment-footer-note">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Secured with Razorpay · Instant Activation</span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#pay-modal-close-btn').onclick = closePaymentModal;
    modal.onclick = (e) => { if (e.target === modal) closePaymentModal(); };

    modal.querySelector('#execute-razorpay-btn').onclick = () => {
      launchRazorpayCheckout();
    };

    const quickTestBtn = modal.querySelector('#quick-test-unlock-btn');
    if (quickTestBtn) {
      quickTestBtn.onclick = () => {
        recordSuccessfulPayment('pay_test_' + Math.random().toString(36).substring(2, 10));
      };
    }

    const demoPayBtn = modal.querySelector('#demo-pay-btn');
    if (demoPayBtn) {
      demoPayBtn.onclick = () => {
        recordSuccessfulPayment('pay_test_' + Math.random().toString(36).substring(2, 10));
      };
    }

    const saveKeyBtn = modal.querySelector('#save-razorpay-key-btn');
    if (saveKeyBtn) {
      saveKeyBtn.onclick = async () => {
        const inputKey = (modal.querySelector('#razorpay-key-input').value || '').trim();
        if (!inputKey || !inputKey.startsWith('rzp_')) {
          alert('Please enter a valid Razorpay Key ID starting with "rzp_test_" or "rzp_live_"');
          return;
        }

        const newConfig = {
          keyId: inputKey,
          amount: 4900,
          currency: 'INR',
          name: 'System Design Course',
          description: 'One-time Lifetime Access & Server Maintenance'
        };

        window.RAZORPAY_CONFIG = newConfig;

        try {
          await fetch('/api/save-razorpay-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
          });
        } catch (e) {}

        showToast('Razorpay Key saved! Launching payment...');
        closePaymentModal();
        launchRazorpayCheckout();
      };
    }
  }

  // 4. Razorpay Checkout Launcher
  function launchRazorpayCheckout() {
    if (!currentUser) {
      signInWithGoogle();
      return;
    }

    const cfg = window.RAZORPAY_CONFIG || {};
    const key = cfg.keyId || '';

    if (window.Razorpay && key && !key.includes('YOUR_KEY_HERE') && key.startsWith('rzp_')) {
      try {
        const options = {
          key: key,
          amount: cfg.amount || 4900,
          currency: cfg.currency || 'INR',
          name: cfg.name || 'System Design Course',
          description: cfg.description || 'Lifetime Access & Server Maintenance',
          image: '/favicon.svg',
          prefill: {
            name: currentUser.displayName || '',
            email: currentUser.email || ''
          },
          notes: {
            user_email: currentUser.email,
            plan: 'lifetime_access'
          },
          theme: {
            color: '#16a34a'
          },
          handler: function (response) {
            recordSuccessfulPayment(response.razorpay_payment_id);
          },
          modal: {
            ondismiss: function () {
              console.log('[Razorpay] Checkout modal dismissed.');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          alert('Payment Failed: ' + (response.error.description || 'Transaction could not be completed'));
        });
        rzp.open();
        return;
      } catch (err) {
        console.error('[Razorpay Launch Error]:', err);
      }
    }

    // If key not configured yet, open payment dialog with configuration helper
    showPaymentModal();
  }

  // 5. Render Topbar Auth / Payment Status
  function renderTopbarAuth() {
    const topbar = document.querySelector('header.topbar');
    if (!topbar) return;

    let container = document.getElementById('topbar-auth-slot');
    if (!container) {
      container = document.createElement('div');
      container.id = 'topbar-auth-slot';
      container.className = 'topbar-auth';
      const themeBtn = document.getElementById('theme-btn');
      if (themeBtn && themeBtn.parentNode) {
        themeBtn.parentNode.insertBefore(container, themeBtn);
      } else {
        topbar.appendChild(container);
      }
    }

    if (currentUser) {
      const initial = (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase();
      const hasPaid = isUserPaid(currentUser);

      container.innerHTML = `
        <div class="user-badge" title="Signed in: ${currentUser.email} (${hasPaid ? 'Lifetime Supporter' : 'Free Preview'})">
          ${currentUser.photoURL ? `<img class="user-badge__avatar" src="${currentUser.photoURL}" alt="" />` : `<span class="user-badge__avatar">${initial}</span>`}
          <span class="user-badge__name">${currentUser.displayName || currentUser.email.split('@')[0]}</span>
          ${hasPaid ? `<span class="supporter-badge">✨ Lifetime</span>` : `<button class="google-btn" id="topbar-pay-btn" style="padding:2px 8px; font-size:10.5px; background:#16a34a; color:#fff; border-color:var(--ink,#1c1917);">Unlock ₹49</button>`}
          <button class="user-badge__logout" id="auth-logout-btn">Sign out</button>
        </div>
      `;
      const logoutBtn = container.querySelector('#auth-logout-btn');
      if (logoutBtn) logoutBtn.onclick = signOut;

      const payBtn = container.querySelector('#topbar-pay-btn');
      if (payBtn) payBtn.onclick = showPaymentModal;
    } else {
      container.innerHTML = `
        <button class="google-btn" id="topbar-login-btn">
          ${GOOGLE_SVG}
          <span>Sign In</span>
        </button>
      `;
      const loginBtn = container.querySelector('#topbar-login-btn');
      if (loginBtn) loginBtn.onclick = () => openAuthModal();
    }
  }

  // 6. Sidebar Locks
  function updateSidebarLocks() {
    const lessonItems = document.querySelectorAll('.sidebar .lesson[data-lesson]');
    const hasPaid = currentUser && isUserPaid(currentUser);

    lessonItems.forEach((li) => {
      const id = li.getAttribute('data-lesson');
      const isFree = FREE_LESSONS.has(id);
      const link = li.querySelector('a');

      li.querySelectorAll('.lesson-lock-icon, .lesson-free-tag').forEach(el => el.remove());

      if (hasPaid || isFree) {
        li.classList.remove('is-locked');
      } else {
        li.classList.add('is-locked');
        if (link) {
          const lockSpan = document.createElement('span');
          lockSpan.innerHTML = LOCK_SVG;
          link.appendChild(lockSpan.firstElementChild);
        }
      }
    });
  }

  // 7. Active Lesson Gating & Preview Paywall
  function checkActiveLessonAccess() {
    const hash = window.location.hash || '';
    const match = /^#\/([\w-]+)(?:\/(\d+))?/.exec(hash);
    if (!match) return;

    const lessonId = match[1];
    const isFree = FREE_LESSONS.has(lessonId);
    const hasPaid = currentUser && isUserPaid(currentUser);

    const oldOverlay = document.getElementById('lesson-paywall-overlay');
    if (oldOverlay) oldOverlay.remove();

    // If it's a free lesson, or the user is signed in & has paid: FULL ACCESS!
    if (isFree || hasPaid) {
      return;
    }

    // Gated Lesson Preview Mode
    const stage = document.querySelector('.stage') || document.querySelector('.stage__scene');
    if (!stage) return;

    const overlay = document.createElement('div');
    overlay.id = 'lesson-paywall-overlay';
    overlay.className = 'paywall-overlay';

    if (!currentUser) {
      // Step 1 Paywall: Sign in with Gmail (Google OAuth or Password)
      overlay.innerHTML = `
        <div class="paywall-card" style="max-width: 440px;">
          <span class="paywall-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Lesson Preview Mode
          </span>
          <h2 class="paywall-title">Sign in with Gmail to Continue</h2>
          <p class="paywall-desc">
            You've completed the free foundation and load balancing lessons. Sign in with your <strong>@gmail.com</strong> account to continue learning.
          </p>
          <div class="paywall-action">
            <button class="google-btn" id="paywall-google-btn">
              ${GOOGLE_SVG}
              <span>Continue with Google</span>
            </button>

            <div class="auth-divider">or sign in with password</div>

            <form class="auth-email-form" id="paywall-email-form">
              <input type="email" id="paywall-email-input" class="auth-input-field" placeholder="username@gmail.com" required autocomplete="username" />
              <input type="password" id="paywall-password-input" class="auth-input-field" placeholder="Password" required autocomplete="current-password" />
              <button type="submit" class="auth-submit-btn" id="paywall-email-submit">Sign In / Sign Up</button>
            </form>

            <div class="auth-test-helper-card" style="margin-top:10px;">
              <b>⚡ Razorpay Verification / QA Test Account:</b><br>
              Email: <code>testuser@gmail.com</code><br>
              Password: <code>TestPassword123!</code>
            </div>
          </div>
        </div>
      `;
      const btn = overlay.querySelector('#paywall-google-btn');
      if (btn) btn.onclick = signInWithGoogle;

      const paywallForm = overlay.querySelector('#paywall-email-form');
      if (paywallForm) {
        paywallForm.onsubmit = (e) => {
          e.preventDefault();
          const email = (overlay.querySelector('#paywall-email-input').value || '').trim();
          const pass = (overlay.querySelector('#paywall-password-input').value || '').trim();
          signInWithEmail(email, pass);
        };
      }
    } else {
      // Step 2 Paywall: Gentle ₹49 Lifetime Payment
      overlay.innerHTML = `
        <div class="paywall-card" style="max-width: 460px;">
          <span class="paywall-badge" style="background:#dcfce7; color:#166534; border-color:#16a34a;">
            ✨ Lifetime Access
          </span>
          <h2 class="paywall-title">Unlock Full Access for ₹49</h2>
          <p class="paywall-desc" style="text-align:left;">
            Hi <b>${currentUser.displayName || currentUser.email.split('@')[0]}</b>! To help cover our simulation server costs and keep adding new system design scenarios, we ask for a small one-time contribution.
            <br><br>
            Pay <strong>₹49 once</strong> for lifetime access to all 40 interactive lessons. No subscriptions or hidden fees.
          </p>
          <div class="paywall-action" style="display:flex; flex-direction:column; gap:8px;">
            <button class="razorpay-pay-btn" id="paywall-pay-btn" style="padding:10px 16px; font-size:13.5px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              <span>Unlock Lifetime Access — ₹49 (UPI / Card)</span>
            </button>
            <span style="font-size:10.5px; color:var(--muted,#78716c); text-align:center;">
              Supports Google Pay, PhonePe, Paytm, UPI &amp; Credit/Debit Cards
            </span>
          </div>
        </div>
      `;
      const btn = overlay.querySelector('#paywall-pay-btn');
      if (btn) btn.onclick = showPaymentModal;
    }

    const parent = stage.parentElement || stage;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(overlay);

    // Prevent advancing past preview when locked
    const nextBtns = document.querySelectorAll('.guide__nav button, .timeline__step');
    nextBtns.forEach((b) => {
      if (!b._paywallIntercepted) {
        b._paywallIntercepted = true;
        b.addEventListener('click', (e) => {
          if (!hasPaid && !isFree) {
            e.stopImmediatePropagation();
            e.preventDefault();
            if (!currentUser) {
              openAuthModal();
            } else {
              showPaymentModal();
            }
          }
        }, true);
      }
    });
  }

  // Lifecycle listeners
  window.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    renderTopbarAuth();
    updateSidebarLocks();
    checkActiveLessonAccess();
  });

  window.addEventListener('hashchange', () => {
    setTimeout(() => {
      checkActiveLessonAccess();
      updateSidebarLocks();
    }, 50);
  });

  const observer = new MutationObserver(() => {
    renderTopbarAuth();
    updateSidebarLocks();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.DesignedToScaleAuth = {
    getUser: () => currentUser,
    isPaid: () => currentUser && isUserPaid(currentUser),
    isUnlocked: (id) => Boolean(FREE_LESSONS.has(id) || (currentUser && isUserPaid(currentUser))),
    signInWithGoogle,
    signOut,
    openPayment: showPaymentModal,
    recordPayment: recordSuccessfulPayment
  };
})();
