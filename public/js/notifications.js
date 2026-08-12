(function () {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;

  const POLL_MS = 5000;
  let lastSeenLatestId = sessionStorage.getItem('poopbuddy_last_notif_id') || null;
  let toastContainer = null;

  function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.style.cssText =
      'position:fixed;bottom:20px;left:20px;right:20px;display:flex;flex-direction:column;gap:8px;align-items:center;z-index:9999;pointer-events:none;';
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function showToast(message) {
    const el = document.createElement('div');
    el.textContent = message;
    el.style.cssText =
      'background:#5a3b20;color:#fff8ec;padding:10px 18px;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.25);max-width:400px;text-align:center;font-size:0.9rem;opacity:0;transition:opacity .3s ease;';
    ensureToastContainer().appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  async function poll() {
    try {
      const countRes = await fetch('/api/notifications/unread-count');
      if (!countRes.ok) return;
      const { count } = await countRes.json();
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }

      const latestRes = await fetch('/api/notifications/latest');
      if (!latestRes.ok) return;
      const { notifications } = await latestRes.json();
      if (notifications.length === 0) return;

      const newest = notifications[0];
      if (lastSeenLatestId && newest.id !== lastSeenLatestId) {
        const freshOnes = [];
        for (const n of notifications) {
          if (n.id === lastSeenLatestId) break;
          freshOnes.push(n);
        }
        freshOnes.reverse().forEach((n) => showToast(n.message));
      }
      lastSeenLatestId = newest.id;
      sessionStorage.setItem('poopbuddy_last_notif_id', lastSeenLatestId);
    } catch {
      // network hiccup, try again next tick
    }
  }

  poll();
  setInterval(poll, POLL_MS);
})();
