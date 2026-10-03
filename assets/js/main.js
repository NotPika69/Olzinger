/* ==========================================================================
   Olzinger – Hauptskript
   Preloader, Hero-Intro, Smooth-Scroll, Navigation und Scroll-Animationen.
   ========================================================================== */
(function (w, d) {
  'use strict';

  var html = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var fallback = !!w.__olzFallback;
  w.__olzReady = true;

  /* ---------- Dynamische Jahreszahlen ---------- */
  var nowYear = new Date().getFullYear();
  $$('[data-current-year]').forEach(function (el) { el.textContent = nowYear; });
  $$('[data-years]').forEach(function (el) {
    el.textContent = nowYear - 1985;
    el.setAttribute('data-count', nowYear - 1985);
  });

  /* ---------- Wärmebild ---------- */
  var thermal = null;
  var canvas = $('[data-thermal]');
  if (canvas && w.OlzThermal) {
    thermal = w.OlzThermal.init(canvas, {
      hero: $('[data-hero]'),
      probe: $('[data-probe]'),
      probeVal: $('[data-probe-val]'),
      legendMarker: $('[data-legend-marker]'),
      calm: $('.hero__aside'),
      reduceMotion: reduce
    });
  } else {
    html.classList.add('no-webgl');
  }

  /* ---------- Mobiles Menü (auch ohne GSAP funktionsfähig) ---------- */
  var menu = $('[data-menu]');
  var toggle = $('[data-menu-toggle]');
  var menuOpen = false;
  var lenis = null;

  if (menu) { menu.hidden = false; menu.setAttribute('inert', ''); menu.setAttribute('aria-hidden', 'true'); }

  function openMenu() {
    if (!menu || menuOpen) return;
    menuOpen = true;
    menu.classList.add('is-open');
    menu.removeAttribute('inert');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.querySelector('.sr-only').textContent = 'Menü schließen';
    html.classList.add('menu-open');
    if (lenis) lenis.stop();
    if (w.gsap && !reduce) {
      w.gsap.fromTo($$('.menu__links a, .menu__foot > *'), { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.045, delay: 0.25 });
    }
  }
  function closeMenu() {
    if (!menu || !menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    menu.setAttribute('inert', '');
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.sr-only').textContent = 'Menü öffnen';
    html.classList.remove('menu-open');
    if (lenis) lenis.start();
  }
  if (toggle) toggle.addEventListener('click', function () { if (menuOpen) closeMenu(); else openMenu(); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { closeMenu(); toggle.focus(); } });

  /* ---------- Ohne GSAP: alles statisch sichtbar lassen ---------- */
  if (!w.gsap || !w.ScrollTrigger) {
    html.classList.remove('has-loader', 'js');
    html.classList.add('no-js');
    if (thermal) thermal.heatUp();
    d.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (a && a.dataset.topic) w.dispatchEvent(new CustomEvent('olz:topic', { detail: a.dataset.topic }));
      if (a) closeMenu();
    });
    return;
  }

  var gsap = w.gsap, ScrollTrigger = w.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  if (w.SplitText) gsap.registerPlugin(w.SplitText);
  gsap.config({ nullTargetWarn: false });

  /* ---------- Smooth Scroll ---------- */
  if (!reduce && typeof w.Lenis === 'function') {
    lenis = new w.Lenis({ lerp: 0.105, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    if (html.classList.contains('has-loader')) lenis.stop();
  }
  w.olzLenis = lenis;

  function navHeight() {
    var bar = $('.nav__bar');
    return bar ? bar.getBoundingClientRect().height + 12 : 76;
  }

  // Natürliche Position berechnen (auch für „sticky“-Elemente)
  function targetY(el) {
    if (el.id === 'top') return 0;
    var stack = el.closest('[data-stack]');
    if (stack && el.classList.contains('svc')) {
      var cards = $$('.svc', stack);
      var gap = parseFloat(getComputedStyle(stack).rowGap) || 0;
      var y = stack.getBoundingClientRect().top + w.scrollY;
      for (var i = 0; i < cards.length && cards[i] !== el; i++) y += cards[i].offsetHeight + gap;
      var stickyTop = parseFloat(getComputedStyle(el).top);
      return y - (isNaN(stickyTop) ? navHeight() : stickyTop);
    }
    return el.getBoundingClientRect().top + w.scrollY;
  }

  function scrollToEl(el) {
    var y = targetY(el);
    if (lenis) lenis.scrollTo(y, { duration: 1.4, easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); } });
    else w.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }

  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = d.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    if (a.dataset.topic) w.dispatchEvent(new CustomEvent('olz:topic', { detail: a.dataset.topic }));
    var wasOpen = menuOpen;
    closeMenu();
    setTimeout(function () { scrollToEl(target); }, wasOpen ? 380 : 0);
    if (history.replaceState) history.replaceState(null, '', id === '#top' ? location.pathname : id);
  });

  /* ---------- Seitenwechsel mit Vorhang ---------- */
  var curtain = d.createElement('div');
  curtain.className = 'curtain';
  curtain.setAttribute('aria-hidden', 'true');
  d.body.appendChild(curtain);
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var url;
    try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return;
    e.preventDefault();
    closeMenu();
    html.classList.add('is-leaving');
    w.setTimeout(function () { location.href = url.href; }, reduce ? 0 : 560);
  });
  w.addEventListener('pageshow', function () { html.classList.remove('is-leaving'); });

  /* ---------- Preloader & Hero-Intro ---------- */
  function heroIn() {
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo('.hero__word', { y: 0, yPercent: 112 }, { yPercent: 0, duration: 1.5, stagger: 0.1 }, 0)
      .fromTo('.hero__dot', { scale: 0 }, { scale: 1, duration: 1.1, ease: 'back.out(3)', stagger: 0.1 }, 0.55)
      .fromTo('.hero__tag', { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 1.2, stagger: 0.1 }, 0.7)
      .fromTo('[data-hero-fade]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.3, stagger: 0.12 }, 0.35)
      .fromTo('.nav__bar', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 1.2 }, 0.2)
      .add(function () { if (thermal) thermal.measure(); });
    return tl;
  }

  function intro() {
    if (fallback) { gsap.set('.nav__bar', { opacity: 1 }); if (thermal) thermal.heatUp(); return; }
    var loader = $('.loader');
    var useLoader = html.classList.contains('has-loader') && loader && !reduce;

    if (reduce) {
      html.classList.remove('has-loader');
      gsap.set('.hero__word', { yPercent: 0, y: 0 });
      gsap.set('.hero__dot', { scale: 1 });
      gsap.set('.hero__tag, [data-hero-fade], .nav__bar', { opacity: 1 });
      if (thermal) thermal.heatUp();
      return;
    }

    if (!useLoader) {
      html.classList.remove('has-loader');
      if (loader) loader.remove();
      if (thermal) thermal.heatUp();
      heroIn();
      return;
    }

    var arc = $('.loader__arc', loader);
    var yearEl = $('[data-loader-year]', loader);
    var len = arc.getTotalLength();
    var counter = { v: 1985 };
    gsap.set(arc, { strokeDasharray: len, strokeDashoffset: len });

    var tl = gsap.timeline();
    tl.from('.loader__center', { opacity: 0, scale: 0.92, duration: 0.6, ease: 'power2.out' }, 0)
      .from('.loader__caption', { opacity: 0, y: 10, duration: 0.6, stagger: 0.08 }, 0.1)
      .to(arc, { strokeDashoffset: 0, duration: 1.35, ease: 'power2.inOut' }, 0.15)
      .to(counter, {
        v: nowYear, duration: 1.35, ease: 'power2.inOut',
        onUpdate: function () { yearEl.textContent = Math.round(counter.v); }
      }, 0.15)
      .to('.loader__center, .loader__caption', { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in', stagger: 0.03 }, 1.65)
      .add(function () { if (thermal) thermal.heatUp(); }, 1.7)
      .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.05, ease: 'expo.inOut' }, 1.85)
      .add(heroIn(), 2.25)
      .add(function () {
        html.classList.remove('has-loader');
        loader.remove();
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      }, 2.95);
  }

  /* ---------- Navigation ---------- */
  var nav = $('[data-nav]');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (self) {
      var y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 40);
      if (menuOpen) return;
      if (y > 420 && self.direction === 1) nav.classList.add('is-hidden');
      else if (self.direction === -1 || y <= 420) nav.classList.remove('is-hidden');
    }
  });
  nav.addEventListener('focusin', function () { nav.classList.remove('is-hidden'); });

  var navLinks = $$('[data-nav-link]');
  navLinks.forEach(function (link) {
    var sec = d.getElementById(link.getAttribute('href').slice(1));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 45%', end: 'bottom 45%',
      onToggle: function (self) {
        if (self.isActive) navLinks.forEach(function (l) { l.classList.toggle('is-active', l === link); });
        else link.classList.remove('is-active');
      }
    });
  });

  /* ---------- Animationen, die Bewegung voraussetzen ---------- */
  function motion() {
    // Hero: Inhalte beim Scrollen leicht anheben und ausblenden
    gsap.to('.hero__inner', {
      yPercent: -10, opacity: 0.15, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    // Überschriften: Zeilen-Reveal
    if (w.SplitText) {
      $$('[data-split]').forEach(function (el) {
        w.SplitText.create(el, {
          type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
          onSplit: function (self) {
            return gsap.from(self.lines, {
              yPercent: 110, duration: 1.25, ease: 'expo.out', stagger: 0.09,
              scrollTrigger: { trigger: el, start: 'top 86%', once: true }
            });
          }
        });
      });

      // Intro-Text: Wort für Wort „aufheizen“
      var introText = $('[data-scrub-words]');
      if (introText) {
        var split = w.SplitText.create(introText, { type: 'words', wordsClass: 'scrub-word' });
        gsap.fromTo(split.words, { opacity: 0.13 }, {
          opacity: 1, ease: 'none', stagger: 0.1,
          scrollTrigger: { trigger: introText, start: 'top 82%', end: 'bottom 50%', scrub: true }
        });
        gsap.from('.ichip', {
          scale: 0, rotate: -25, duration: 0.9, ease: 'back.out(2.4)', stagger: 0.18,
          scrollTrigger: { trigger: introText, start: 'top 70%', once: true }
        });
      }
    }

    // Allgemeine Reveals
    $$('[data-reveal]').forEach(function (el) {
      gsap.from(el, {
        y: 44, opacity: 0, duration: 1.25, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
    $$('[data-reveal-stagger]').forEach(function (el) {
      gsap.from(el.children, {
        y: 40, opacity: 0, duration: 1.15, ease: 'expo.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });

    // Vorlauf/Rücklauf-Bänder
    $$('.tape').forEach(function (tape) {
      var track = $('.tape__track', tape);
      var unit = track.innerHTML;
      var unitWidth = track.scrollWidth;
      if (!unitWidth) return;
      var copies = Math.max(2, Math.ceil((tape.offsetWidth * 1.2) / unitWidth) + 1);
      track.innerHTML = new Array(copies + 1).join(unit);
      var dir = parseFloat(tape.getAttribute('data-tape')) || 1;
      var tween = gsap.fromTo(track,
        { x: dir > 0 ? 0 : -unitWidth },
        { x: dir > 0 ? -unitWidth : 0, duration: unitWidth / 70, ease: 'none', repeat: -1 });
      tween.totalTime(tween.duration() * 500);
      var boost = { v: 1 };
      ScrollTrigger.create({
        trigger: tape, start: 'top bottom', end: 'bottom top',
        onUpdate: function (self) {
          var v = Math.min(Math.abs(self.getVelocity()) / 250, 7);
          var sign = self.direction === 1 ? 1 : -1;
          gsap.to(boost, {
            v: (1 + v) * sign, duration: 0.25, overwrite: true,
            onUpdate: function () { tween.timeScale(boost.v); }
          });
          gsap.to(boost, {
            v: sign, duration: 1.2, delay: 0.25, ease: 'power2.out',
            onUpdate: function () { tween.timeScale(boost.v); }
          });
        }
      });
      gsap.fromTo(tape, { xPercent: dir * -4 }, {
        xPercent: dir * 4, ease: 'none',
        scrollTrigger: { trigger: '.tapes', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Leistungskarten: gestapelt, die hinteren treten zurück
    var cards = $$('.svc');
    var mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (min-height: 660px)', function () {
      cards.forEach(function (card, i) {
        var next = cards[i + 1];
        if (!next) return;
        var inner = $('.svc__inner', card);
        gsap.to(inner, {
          scale: 0.9 + i * 0.012, '--shade': 0.55, ease: 'none',
          scrollTrigger: {
            trigger: next, start: 'top 82%',
            end: function () { return 'top ' + (parseFloat(getComputedStyle(next).top) || 100) + 'px'; },
            scrub: true, invalidateOnRefresh: true
          }
        });
      });
    });

    // Illustrationen: leichter Parallax
    $$('.svc__art .art').forEach(function (art) {
      gsap.fromTo(art, { yPercent: 4 }, {
        yPercent: -4, ease: 'none',
        scrollTrigger: { trigger: art.closest('.svc'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Ablauf: Rohr füllt sich
    var steps = $('[data-steps]');
    if (steps) {
      var fill = $('[data-steps-fill]', steps);
      var pipe = $('.steps__pipe', steps);
      var items = $$('[data-step-item]', steps);
      var mmSteps = gsap.matchMedia();
      mmSteps.add({ desktop: '(min-width: 901px)', mobile: '(max-width: 900px)' }, function (ctx) {
        var desktop = ctx.conditions.desktop;
        if (!desktop) {
          var nodes = items.map(function (it) { return $('.step__node', it); });
          var placePipe = function () {
            var top0 = steps.getBoundingClientRect().top;
            var a = nodes[0].getBoundingClientRect(), b = nodes[nodes.length - 1].getBoundingClientRect();
            pipe.style.top = (a.top - top0 + a.height / 2) + 'px';
            pipe.style.height = (b.top - a.top) + 'px';
            pipe.style.bottom = 'auto';
          };
          placePipe();
          ScrollTrigger.addEventListener('refreshInit', placePipe);
        }
        gsap.fromTo(fill, desktop ? { scaleX: 0, scaleY: 1 } : { scaleY: 0, scaleX: 1 }, {
          scaleX: 1, scaleY: 1, ease: 'none',
          scrollTrigger: {
            trigger: steps, start: 'top 72%', end: desktop ? 'bottom 62%' : 'bottom 68%', scrub: 0.6,
            onUpdate: function (self) {
              var p = self.progress, n = items.length;
              items.forEach(function (it, i) { it.classList.toggle('is-on', p > (i / (n - 1)) * 0.97 + 0.01); });
            }
          }
        });
        return function () {
          pipe.style.top = pipe.style.height = pipe.style.bottom = '';
        };
      });
    }

    // Footer-Schriftzug „heizt auf“
    var word = $('[data-footer-word] span');
    if (word) {
      gsap.fromTo(word, { '--heat': '0%' }, {
        '--heat': '100%', ease: 'none',
        scrollTrigger: { trigger: '.footer', start: 'top 80%', end: 'bottom bottom', scrub: true }
      });
      gsap.from(word, {
        yPercent: 60, opacity: 0, duration: 1.4, ease: 'expo.out',
        scrollTrigger: { trigger: '[data-footer-word]', start: 'top 95%', once: true }
      });
    }

    // Magnetische Buttons
    if (finePointer) {
      $$('[data-magnetic]').forEach(function (btn) {
        var xTo = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'power3' });
        var yTo = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'power3' });
        btn.addEventListener('pointermove', function (e) {
          var r = btn.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.22);
          yTo((e.clientY - r.top - r.height / 2) * 0.32);
        });
        btn.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
      });
    }
  }

  /* ---------- Funktionen, die immer laufen (auch bei reduzierter Bewegung) ---------- */
  function essentials() {
    // Illustrationen nur animieren, wenn sichtbar
    if ('IntersectionObserver' in w) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.target.classList.toggle('is-inview', en.isIntersecting); });
      }, { threshold: 0.15 });
      $$('.svc').forEach(function (c) { io.observe(c); });
    } else {
      $$('.svc').forEach(function (c) { c.classList.add('is-inview'); });
    }

    // Zähler
    $$('[data-count]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count') || el.textContent, 10);
      if (isNaN(target)) return;
      if (reduce) { el.textContent = target; return; }
      var from = parseInt(el.getAttribute('data-count-from') || '0', 10);
      var obj = { v: from };
      el.textContent = from;
      gsap.to(obj, {
        v: target, duration: 2.2, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        onUpdate: function () { el.textContent = Math.round(obj.v); }
      });
    });

    // Historie: Zählwerk mit Jahreszahl
    var hist = $('[data-history]');
    if (hist) {
      var strips = $$('[data-odo-digit] .odo__strip', hist);
      var caption = $('[data-odo-caption]', hist);
      var entries = $$('.tl', hist);
      var setYear = function (year, title) {
        String(year).split('').forEach(function (ch, i) {
          if (!strips[i]) return;
          gsap.to(strips[i], { yPercent: -10 * parseInt(ch, 10), duration: reduce ? 0 : 1.1, ease: 'expo.inOut', delay: reduce ? 0 : i * 0.06, overwrite: true });
        });
        if (caption) caption.textContent = title;
      };
      entries.forEach(function (entry) {
        var y = entry.getAttribute('data-year');
        var year = y === 'now' ? nowYear : parseInt(y, 10);
        var title = ($('.tl__title', entry) || {}).textContent || '';
        ScrollTrigger.create({
          trigger: entry, start: 'top 62%', end: 'bottom 62%',
          onToggle: function (self) {
            if (!self.isActive) return;
            entries.forEach(function (e2) { e2.classList.toggle('is-active', e2 === entry); });
            setYear(year, title);
          }
        });
      });
      entries[0].classList.add('is-active');
      setYear(1985, ($('.tl__title', entries[0]) || {}).textContent || '');
    }
  }

  /* ---------- Start ---------- */
  essentials();
  if (!reduce) motion();
  intro();

  // Nach dem Laden der Schriften Positionen neu berechnen
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  w.addEventListener('load', function () { ScrollTrigger.refresh(); });

  // Deep-Link (#kontakt etc.) nach dem Aufbau korrekt anspringen
  if (location.hash && location.hash.length > 1) {
    var deep = d.getElementById(location.hash.slice(1));
    if (deep) w.setTimeout(function () { w.scrollTo(0, targetY(deep)); }, 60);
  }
})(window, document);
