// Track a page view
fetch('/api/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'page_view',
    page: window.location.pathname,
    referrer: document.referrer,
    city: '', // You can fill this from a geo API if needed
    session: localStorage.getItem('session_id') || (function() {
      const id = crypto.randomUUID();
      localStorage.setItem('session_id', id);
      return id;
    })()
  })
});

// Track button clicks
document.addEventListener('click', function(e) {
  if (e.target.matches('button, .track-click')) {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'button_click',
        button: e.target.innerText,
        page: window.location.pathname,
        session: localStorage.getItem('session_id')
      })
    });
  }
});

// Track scroll percentage
window.addEventListener('scroll', function() {
  const scrollPct = Math.round(
    (window.scrollY + window.innerHeight) / document.body.scrollHeight * 100
  );
  if (scrollPct > 10 && !window._scrollTracked) {
    window._scrollTracked = true;
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'scroll',
        scroll_pct: scrollPct,
        page: window.location.pathname,
        session: localStorage.getItem('session_id')
      })
    });
  }
});

// Track call link clicks
document.addEventListener('click', function(e) {
  if (e.target.matches('a[href^=\"tel:\"]')) {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'call',
        page: window.location.pathname,
        session: localStorage.getItem('session_id')
      })
    });
  }
});