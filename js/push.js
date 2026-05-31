// Push notification subscription management.
// Requires: sw.js (push/notificationclick listeners), Supabase `db` global (from quiniela.js).

const VAPID_PUBLIC_KEY = '%%VAPID_PUBLIC_KEY%%';

function urlBase64ToUint8Array(b64) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64  = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function pushSubscribe() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  const { endpoint, keys } = sub.toJSON();
  const { error } = await db.from('push_subscriptions').upsert(
    { endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: 'endpoint' }
  );
  if (error) throw error;
}

async function renderPushSection() {
  const el = document.getElementById('push-section');
  if (!el) return;

  // Web Push not supported
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

  // iOS Safari requires the app to be installed (added to home screen)
  const isIOS        = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone;
  if (isIOS && !isStandalone) return;

  // User previously denied permission — nothing we can do
  if (Notification.permission === 'denied') return;

  // Check if already subscribed
  if (Notification.permission === 'granted') {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      el.innerHTML = '<div class="push-active">🔔 Notificaciones activas</div>';
      return;
    }
  }

  el.innerHTML = `
    <button class="push-btn" id="push-btn" onclick="handlePushClick()">
      🔔 Activar notificaciones
    </button>
    <p class="push-hint">Avisos antes de los partidos de España</p>
  `;
}

async function handlePushClick() {
  const btn = document.getElementById('push-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Activando…'; }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      renderPushSection();
      return;
    }
    await pushSubscribe();
    const el = document.getElementById('push-section');
    if (el) el.innerHTML = '<div class="push-active">🔔 Notificaciones activas</div>';
  } catch (err) {
    console.error('Push subscription error:', err);
    if (btn) { btn.disabled = false; btn.textContent = '🔔 Activar notificaciones'; }
  }
}

// Initialise once the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderPushSection);
} else {
  renderPushSection();
}
