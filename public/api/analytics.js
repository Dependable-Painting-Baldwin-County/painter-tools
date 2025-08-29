// analytics.js - expanded analytics tracking for painter-tools

// Utility: get or create a session ID
function getSessionId() {
  let id = localStorage.getItem('session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('session_id', id);
  }
  return id;
}

// Utility: get UTM params from URL
function getUTMParams() {
  const params = {};
  const url = new URL(window.location.href);
  ['utm_source', 'utm_medium', 'utm_campaign', 'gclid'].forEach(key => {
    if (url.searchParams.get(key)) params[key] = url.searchParams.get(key);
  });
  return params;
}

// Send analytics event
function sendEvent(data) {
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      session: getSessionId(),
      ...getUTMParams(),
      page: window.location.pathname,
      referrer: document.referrer
    })
  });
}

// Track page view
sendEvent({ type: 'page_view' });

// Track button clicks (all buttons, add .track-click for custom)
document.addEventListener('click', function(e) {
  if (e.target.matches('button, .track-click')) {
    sendEvent({
      type: 'button_click',
      button: e.target.innerText || e.target.id || e.target.className
    });
  }
});

// Track scroll percentage (fires at 25%, 50%, 75%, 100%)
let lastScrollBucket = 0;
window.addEventListener('scroll', function() {
  const pct = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
  const bucket = Math.floor(pct / 25) * 25;
  if (bucket > lastScrollBucket && bucket <= 100) {
    lastScrollBucket = bucket;
    sendEvent({ type: 'scroll', scroll_pct: bucket });
  }
});

// Track call link clicks
// (any <a href="tel:...">)
document.addEventListener('click', function(e) {
  if (e.target.matches('a[href^="tel:"]')) {
    sendEvent({ type: 'call', call: e.target.getAttribute('href') });
  }
});

// Track form submissions
// (add class .track-form to forms you want to track)
document.addEventListener('submit', function(e) {
  if (e.target.matches('form.track-form')) {
    sendEvent({ type: 'form_submit', form: e.target.getAttribute('name') || e.target.id || '' });
  }
});

// Track outbound link clicks
// (any <a> with target _blank and external href)
document.addEventListener('click', function(e) {
  if (e.target.matches('a[target="_blank"]') && e.target.hostname !== window.location.hostname) {
    sendEvent({ type: 'outbound_click', url: e.target.href });
  }
});

// Track errors
window.addEventListener('error', function(e) {
  sendEvent({ type: 'error', message: e.message, source: e.filename, lineno: e.lineno });
});

// Track feedback (example: call sendEvent({type: 'feedback', rating: 5, comment: 'Great!'}))
// You can call sendEvent manually for custom events as needed.
