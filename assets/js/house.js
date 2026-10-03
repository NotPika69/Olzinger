/* ==========================================================================
   Olzinger – Energie-Haus
   Tabs + Hotspots steuern, welches System im Hausschnitt hervorgehoben wird.
   Solange niemand klickt, wechseln die Komponenten automatisch.
   ========================================================================== */
(function (w, d) {
  'use strict';

  var root = d.querySelector('[data-house]');
  if (!root) return;

  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  var parts = Array.prototype.slice.call(root.querySelectorAll('.part'));
  var hotspots = Array.prototype.slice.call(root.querySelectorAll('.hotspot'));
  var systems = Array.prototype.slice.call(root.querySelectorAll('.sys'));
  var progress = root.querySelector('[data-house-progress]');
  var order = tabs.map(function (t) { return t.getAttribute('data-part'); });
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var DURATION = 6500;
  var current = null;
  var autoplay = !reduce;
  var inView = false;
  var hovering = false;
  var elapsed = 0, last = 0, raf = 0;

  hotspots.forEach(function (h) {
    h.setAttribute('aria-controls', 'part-' + h.getAttribute('data-part'));
  });

  function activate(id, focusTab) {
    if (id === current) return;
    current = id;
    root.setAttribute('data-active', id);
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-part') === id;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focusTab) t.focus();
    });
    parts.forEach(function (p) {
      var on = p.getAttribute('data-part') === id;
      p.hidden = !on;
      p.classList.toggle('is-active', on);
    });
    hotspots.forEach(function (h) {
      var on = h.getAttribute('data-part') === id;
      h.classList.toggle('is-active', on);
      h.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    systems.forEach(function (s) { s.classList.toggle('is-on', s.getAttribute('data-sys') === id); });
    elapsed = 0;
  }

  function stopAutoplay() {
    autoplay = false;
    if (progress) progress.style.transform = 'scaleX(0)';
    if (raf) w.cancelAnimationFrame(raf);
    raf = 0;
  }

  function tick(now) {
    raf = 0;
    if (!autoplay || !inView || hovering) return;
    var dt = last ? now - last : 16;
    last = now;
    elapsed += Math.min(dt, 100);
    if (progress) progress.style.transform = 'scaleX(' + Math.min(elapsed / DURATION, 1) + ')';
    if (elapsed >= DURATION) {
      var next = order[(order.indexOf(current) + 1) % order.length];
      activate(next, false);
    }
    raf = w.requestAnimationFrame(tick);
  }

  function run() {
    if (!autoplay || !inView || hovering || raf) return;
    last = 0;
    raf = w.requestAnimationFrame(tick);
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { stopAutoplay(); activate(t.getAttribute('data-part'), false); });
  });
  hotspots.forEach(function (h) {
    h.addEventListener('click', function () { stopAutoplay(); activate(h.getAttribute('data-part'), false); });
  });

  // Tastatursteuerung nach WAI-ARIA Tabs-Pattern
  var tablist = root.querySelector('[role="tablist"]');
  if (tablist) {
    tablist.addEventListener('keydown', function (e) {
      var i = order.indexOf(current), n = order.length, to = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (i + 1) % n;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (i - 1 + n) % n;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = n - 1;
      if (to < 0) return;
      e.preventDefault();
      stopAutoplay();
      activate(order[to], true);
    });
  }

  // Pausieren, solange der Nutzer mit der Maus im Bereich ist
  root.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') { hovering = true; if (raf) { w.cancelAnimationFrame(raf); raf = 0; } }
  });
  root.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') { hovering = false; run(); }
  });

  if ('IntersectionObserver' in w) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) run();
    }, { threshold: 0.35 }).observe(root);
    // SVG-Animationen (Strömungen, Lüfter) nur laufen lassen, solange das Haus sichtbar ist
    new IntersectionObserver(function (entries) {
      root.classList.toggle('is-inview', entries[0].isIntersecting);
    }, { threshold: 0 }).observe(root);
  }

  if (!('IntersectionObserver' in w)) root.classList.add('is-inview');
  activate(order[0], false);
})(window, document);
