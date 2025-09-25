// Web Vitals monitoring and Core Web Vitals reporting
// This script measures and reports Core Web Vitals metrics
(function() {
  'use strict';

  // Track Web Vitals metrics
  const webVitals = {
    lcp: null,
    fid: null,
    cls: null,
    inp: null,
    fcp: null,
    ttfb: null
  };

  // Send metric to analytics
  function sendMetric(name, value, rating) {
    const metric = {
      name: name,
      value: Math.round(value),
      rating: rating,
      url: window.location.href,
      timestamp: Date.now()
    };

    // Send to internal tracking API
    if (navigator.sendBeacon) {
      const payload = JSON.stringify({
        type: 'web_vital',
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        page: window.location.pathname,
        session: localStorage.getItem('dp_sid') || 'unknown'
      });
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
    }

    // Log to console in development
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
      console.log('Web Vital:', metric);
    }
  }

  // LCP (Largest Contentful Paint)
  function measureLCP() {
    if (!('PerformanceObserver' in window)) return;
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      if (lastEntry) {
        webVitals.lcp = lastEntry.startTime;
        const rating = lastEntry.startTime <= 2500 ? 'good' : lastEntry.startTime <= 4000 ? 'needs-improvement' : 'poor';
        sendMetric('LCP', lastEntry.startTime, rating);
      }
    });
    
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  }

  // FID (First Input Delay) - being replaced by INP
  function measureFID() {
    if (!('PerformanceObserver' in window)) return;
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.processingStart && entry.startTime) {
          const fid = entry.processingStart - entry.startTime;
          webVitals.fid = fid;
          const rating = fid <= 100 ? 'good' : fid <= 300 ? 'needs-improvement' : 'poor';
          sendMetric('FID', fid, rating);
        }
      });
    });
    
    observer.observe({ type: 'first-input', buffered: true });
  }

  // INP (Interaction to Next Paint) - new metric replacing FID
  function measureINP() {
    if (!('PerformanceObserver' in window)) return;
    
    let maxINP = 0;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.processingEnd && entry.startTime) {
          const inp = entry.processingEnd - entry.startTime;
          if (inp > maxINP) {
            maxINP = inp;
            webVitals.inp = inp;
            const rating = inp <= 200 ? 'good' : inp <= 500 ? 'needs-improvement' : 'poor';
            sendMetric('INP', inp, rating);
          }
        }
      });
    });
    
    // Listen to event entries for INP calculation
    observer.observe({ type: 'event', buffered: true });
  }

  // CLS (Cumulative Layout Shift)
  function measureCLS() {
    if (!('PerformanceObserver' in window)) return;
    
    let clsScore = 0;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
        }
      });
      
      if (clsScore > 0) {
        webVitals.cls = clsScore;
        const rating = clsScore <= 0.1 ? 'good' : clsScore <= 0.25 ? 'needs-improvement' : 'poor';
        sendMetric('CLS', clsScore, rating);
      }
    });
    
    observer.observe({ type: 'layout-shift', buffered: true });
  }

  // FCP (First Contentful Paint)
  function measureFCP() {
    if (!('PerformanceObserver' in window)) return;
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          webVitals.fcp = entry.startTime;
          const rating = entry.startTime <= 1800 ? 'good' : entry.startTime <= 3000 ? 'needs-improvement' : 'poor';
          sendMetric('FCP', entry.startTime, rating);
        }
      });
    });
    
    observer.observe({ type: 'paint', buffered: true });
  }

  // TTFB (Time to First Byte)
  function measureTTFB() {
    if (!('performance' in window) || !performance.timing) return;
    
    // Use Navigation Timing API
    const navTiming = performance.timing;
    if (navTiming.responseStart && navTiming.fetchStart) {
      const ttfb = navTiming.responseStart - navTiming.fetchStart;
      webVitals.ttfb = ttfb;
      const rating = ttfb <= 800 ? 'good' : ttfb <= 1800 ? 'needs-improvement' : 'poor';
      sendMetric('TTFB', ttfb, rating);
    }
  }

  // Initialize all measurements
  function initWebVitals() {
    measureLCP();
    measureFID();
    measureINP();
    measureCLS();
    measureFCP();
    measureTTFB();

    // Send summary on page unload
    window.addEventListener('beforeunload', function() {
      // Send final CLS score
      if (webVitals.cls !== null) {
        const rating = webVitals.cls <= 0.1 ? 'good' : webVitals.cls <= 0.25 ? 'needs-improvement' : 'poor';
        sendMetric('CLS_FINAL', webVitals.cls, rating);
      }
    });
  }

  // Start measuring when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWebVitals);
  } else {
    initWebVitals();
  }

  // Expose for debugging
  window.webVitals = webVitals;
})();