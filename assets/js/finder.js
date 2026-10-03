/* ==========================================================================
   Olzinger – Heizungs-Finder
   Vier Fragen → erste, unverbindliche Empfehlung (Wärmepumpe / Pellets / Hybrid).
   Das Ergebnis kann direkt ins Kontaktformular übernommen werden.
   ========================================================================== */
(function (w, d) {
  'use strict';

  var app = d.querySelector('[data-finder]');
  if (!app) return;

  var form = app.querySelector('[data-finder-form]');
  var steps = Array.prototype.slice.call(form.querySelectorAll('.finder__step'));
  var result = form.querySelector('.finder__result');
  var countEl = app.querySelector('[data-finder-count]');
  var barEl = app.querySelector('[data-finder-bar]');
  var backBtn = app.querySelector('[data-finder-back]');
  var nextBtn = app.querySelector('[data-finder-next]');
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var total = steps.length;
  var index = 0;
  var answers = {};
  var pointerSelect = false;
  var advanceTimer = 0;

  var LABELS = {
    gebaeude: { neubau: 'Neubau', gedaemmt: 'Bestand, gut gedämmt', unsaniert: 'Bestand, wenig gedämmt' },
    verteilung: { fbh: 'Fußbodenheizung', hk: 'Heizkörper', mix: 'Fußbodenheizung & Heizkörper' },
    lager: { ja: 'vorhanden', nein: 'nicht vorhanden' },
    dach: { ja: 'ja', nein: 'nein / unbekannt' }
  };

  var SYSTEMS = {
    wp: { name: 'Wärmepumpe', title: 'Luft-Wasser-Wärmepumpe', topic: 'Wärmepumpe & Regenerativ' },
    pellet: { name: 'Pelletheizung', title: 'Pelletheizung', topic: 'Wärmepumpe & Regenerativ' },
    hybrid: { name: 'Hybridheizung', title: 'Hybridheizung', topic: 'Heizung' }
  };

  var TEXTS = {
    wp: {
      neubau: 'Für Ihren Neubau ist die Wärmepumpe die naheliegende Wahl: Sie heizt mit Umweltwärme, arbeitet mit niedrigen Vorlauftemperaturen besonders effizient und harmoniert perfekt mit einer Fußbodenheizung.',
      gedaemmt: 'Ihr Haus bringt gute Voraussetzungen mit: Dank Dämmung reichen niedrige Vorlauftemperaturen – genau dort arbeitet eine Wärmepumpe besonders effizient. Ob einzelne Heizkörper getauscht werden sollten, prüfen wir vor Ort.',
      unsaniert: 'Mit Flächenheizung kann eine Wärmepumpe auch im älteren Haus gut funktionieren. Eine Heizlastberechnung zeigt, ob vorher kleinere Maßnahmen sinnvoll sind.'
    },
    pellet: 'Holzpellets heizen nahezu CO<sub>2</sub>-neutral und liefern auch die hohen Vorlauftemperaturen, die klassische Heizkörper in älteren Häusern brauchen. Den nötigen Lagerraum haben Sie bereits.',
    hybrid: 'Wärmepumpe und Brennwertkessel im Team: Die Wärmepumpe übernimmt den Großteil des Jahres, der Kessel springt nur an sehr kalten Tagen ein. Oft ist auch eine Hochtemperatur-Wärmepumpe möglich – das klären wir mit einer Heizlastberechnung.'
  };

  /* Bewertung – bewusst einfach und nachvollziehbar gehalten */
  function evaluate(a) {
    var s = { wp: 0, pellet: 0, hybrid: 0 };
    var G = { neubau: [7, 1, 0], gedaemmt: [6, 2, 2], unsaniert: [1, 4, 4] }[a.gebaeude] || [0, 0, 0];
    s.wp += G[0]; s.pellet += G[1]; s.hybrid += G[2];

    if (a.verteilung === 'fbh') { s.wp += 4 + (a.gebaeude === 'unsaniert' ? 3 : 0); s.pellet += 1; s.hybrid += 1; }
    if (a.verteilung === 'mix') { s.wp += 2; s.pellet += 2; s.hybrid += 2; }
    if (a.verteilung === 'hk') { s.wp += (a.gebaeude === 'unsaniert' ? 0 : 3); s.pellet += 3; s.hybrid += 3; }

    if (a.lager === 'ja') s.pellet += 3; else { s.pellet -= 6; s.hybrid += 1; }
    if (a.dach === 'ja') { s.wp += 1; s.pellet += 1; s.hybrid += 1; }

    var max = { wp: 12, pellet: 11, hybrid: 9 };
    var pct = {};
    Object.keys(s).forEach(function (k) { pct[k] = Math.round(Math.max(0, Math.min(1, s[k] / max[k])) * 100); });
    var priority = ['wp', 'hybrid', 'pellet'];
    var order = Object.keys(s).sort(function (x, y) {
      return (pct[y] - pct[x]) || (priority.indexOf(x) - priority.indexOf(y));
    });
    return { pct: pct, order: order, top: order[0] };
  }

  function addons(a, top) {
    var list = [];
    if (a.dach === 'ja') list.push(['i-sun', 'Solarthermie für Warmwasser']);
    if (a.gebaeude === 'neubau') list.push(['i-wind', 'Wohnraumlüftung mit Wärmerückgewinnung']);
    if (top === 'wp' && a.verteilung !== 'fbh') list.push(['i-gauge', 'Heizkörper-Check & hydraulischer Abgleich']);
    if (top === 'pellet') list.push(['i-tank', 'Pufferspeicher für mehr Effizienz']);
    if (top === 'hybrid') list.push(['i-gauge', 'Heizlastberechnung vor Ort']);
    list.push(['i-check', 'Beratung zu Fördermöglichkeiten']);
    return list;
  }

  function icon(id) {
    return '<svg class="icon" aria-hidden="true"><use href="#' + id + '"/></svg>';
  }

  function updateChrome() {
    var isResult = index >= total;
    countEl.textContent = isResult ? 'Ihr Ergebnis' : 'Frage ' + (index + 1) + ' von ' + total;
    barEl.style.transform = 'scaleX(' + (isResult ? 1 : (index + 1) / total) + ')';
    backBtn.disabled = index === 0;
    if (!isResult) {
      var name = steps[index].querySelector('input').name;
      nextBtn.disabled = !answers[name];
      nextBtn.textContent = '';
      nextBtn.insertAdjacentHTML('beforeend', (index === total - 1 ? 'Ergebnis zeigen' : 'Weiter') + icon('i-arrow'));
    }
    app.classList.toggle('is-done', isResult);
  }

  function panel(i) { return i >= total ? result : steps[i]; }

  function go(to, focus) {
    if (to === index) return;
    var from = panel(index);
    var target = panel(to);
    var dir = to > index ? 1 : -1;
    index = to;
    if (to >= total) renderResult();
    updateChrome();

    var reveal = function () {
      from.hidden = true;
      from.classList.remove('is-active');
      target.hidden = false;
      target.classList.add('is-active');
      if (to >= total) animateBars();
      if (focus) {
        var f = to >= total ? result : target.querySelector('input:checked') || target.querySelector('input');
        if (f) f.focus({ preventScroll: true });
      }
    };

    if (w.gsap && !reduce) {
      w.gsap.to(from, {
        x: -28 * dir, opacity: 0, duration: 0.28, ease: 'power2.in',
        onComplete: function () {
          w.gsap.set(from, { clearProps: 'transform,opacity' });
          reveal();
          w.gsap.fromTo(target, { x: 36 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'expo.out', clearProps: 'transform,opacity' });
        }
      });
    } else {
      reveal();
    }
  }

  function renderResult() {
    var r = evaluate(answers);
    var sys = SYSTEMS[r.top];
    result.querySelector('[data-result-title]').textContent = sys.title;
    var text = r.top === 'wp' ? TEXTS.wp[answers.gebaeude] || TEXTS.wp.gedaemmt : TEXTS[r.top];
    result.querySelector('[data-result-text]').innerHTML = text;

    var bars = result.querySelector('[data-result-bars]');
    bars.innerHTML = r.order.map(function (k, i) {
      return '<li class="' + (i === 0 ? 'is-top' : '') + '"><span>' + SYSTEMS[k].name + '</span>' +
        '<span class="bar" role="img" aria-label="' + SYSTEMS[k].name + ': ' + r.pct[k] + ' Prozent Übereinstimmung"><i data-v="' + (r.pct[k] / 100) + '"></i></span>' +
        '<b>' + r.pct[k] + '&nbsp;%</b></li>';
    }).join('');

    result.querySelector('[data-result-addons]').innerHTML = addons(answers, r.top).map(function (a) {
      return '<li>' + icon(a[0]) + a[1] + '</li>';
    }).join('');

    var summary = 'Heizungs-Finder – meine Angaben: Gebäude: ' + LABELS.gebaeude[answers.gebaeude] +
      ' · Wärmeverteilung: ' + LABELS.verteilung[answers.verteilung] +
      ' · Lagerraum: ' + LABELS.lager[answers.lager] +
      ' · Sonnige Dachfläche: ' + LABELS.dach[answers.dach] +
      '. Erste Empfehlung: ' + sys.title + '. Ich hätte gern eine persönliche Beratung.';
    var apply = result.querySelector('[data-finder-apply]');
    apply.setAttribute('data-topic', sys.topic);
    apply.setAttribute('data-message', summary);
  }

  function animateBars() {
    var bars = result.querySelectorAll('.bar i');
    // Zwei Frames warten, damit die Transition sicher greift
    w.requestAnimationFrame(function () {
      w.requestAnimationFrame(function () {
        Array.prototype.forEach.call(bars, function (b, i) {
          b.style.transitionDelay = (0.12 * i) + 's';
          b.style.transform = 'scaleX(' + b.getAttribute('data-v') + ')';
        });
      });
    });
  }

  function restart() {
    answers = {};
    Array.prototype.forEach.call(form.querySelectorAll('input[type="radio"]'), function (r) { r.checked = false; });
    var current = panel(index);
    current.hidden = true;
    current.classList.remove('is-active');
    index = 0;
    steps[0].hidden = false;
    steps[0].classList.add('is-active');
    updateChrome();
    var first = steps[0].querySelector('input');
    if (first) first.focus({ preventScroll: true });
  }

  form.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.opt')) pointerSelect = true;
  });
  form.addEventListener('keydown', function () { pointerSelect = false; });

  form.addEventListener('change', function (e) {
    var input = e.target;
    if (input.type !== 'radio') return;
    answers[input.name] = input.value;
    updateChrome();
    if (pointerSelect) {
      w.clearTimeout(advanceTimer);
      advanceTimer = w.setTimeout(function () { go(index + 1, false); }, 320);
    }
  });

  nextBtn.addEventListener('click', function () {
    if (nextBtn.disabled) return;
    w.clearTimeout(advanceTimer);
    go(index + 1, true);
  });
  backBtn.addEventListener('click', function () {
    if (index > 0) { w.clearTimeout(advanceTimer); go(index - 1, true); }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  var restartBtn = result.querySelector('[data-finder-restart]');
  if (restartBtn) restartBtn.addEventListener('click', restart);

  var applyBtn = result.querySelector('[data-finder-apply]');
  if (applyBtn) {
    applyBtn.addEventListener('click', function () {
      w.dispatchEvent(new CustomEvent('olz:prefill', {
        detail: { topic: applyBtn.getAttribute('data-topic'), message: applyBtn.getAttribute('data-message') }
      }));
    });
  }

  updateChrome();
})(window, document);
