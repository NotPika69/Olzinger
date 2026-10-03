/* ==========================================================================
   Olzinger – Öffnungszeiten (live, inkl. bayerischer Feiertage) & Kontaktformular
   ========================================================================== */
(function (w, d) {
  'use strict';

  /* ---------- Öffnungszeiten ---------- */
  // Minuten seit Mitternacht; Index = Wochentag (0 = Sonntag)
  var SCHEDULE = {
    0: [],
    1: [[420, 720], [780, 990]],
    2: [[420, 720], [780, 990]],
    3: [[420, 720], [780, 990]],
    4: [[420, 720], [780, 990]],
    5: [[420, 690]],
    6: []
  };
  var DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  function fmt(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h + ':' + (m < 10 ? '0' : '') + m;
  }

  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - dd - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, month - 1, day);
  }

  // Gesetzliche Feiertage in Bayern (Gemeinde mit überwiegend katholischer Bevölkerung)
  var holidayCache = {};
  function holidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    var DAY = 864e5, e = easter(y), map = {};
    var add = function (t, name) { var dt = new Date(t); map[dt.getUTCMonth() + 1 + '-' + dt.getUTCDate()] = name; };
    add(Date.UTC(y, 0, 1), 'Neujahr');
    add(Date.UTC(y, 0, 6), 'Heilige Drei Könige');
    add(e - 2 * DAY, 'Karfreitag');
    add(e + 1 * DAY, 'Ostermontag');
    add(Date.UTC(y, 4, 1), 'Tag der Arbeit');
    add(e + 39 * DAY, 'Christi Himmelfahrt');
    add(e + 50 * DAY, 'Pfingstmontag');
    add(e + 60 * DAY, 'Fronleichnam');
    add(Date.UTC(y, 7, 15), 'Mariä Himmelfahrt');
    add(Date.UTC(y, 9, 3), 'Tag der Deutschen Einheit');
    add(Date.UTC(y, 10, 1), 'Allerheiligen');
    add(Date.UTC(y, 11, 25), '1. Weihnachtstag');
    add(Date.UTC(y, 11, 26), '2. Weihnachtstag');
    return (holidayCache[y] = map);
  }
  function holidayName(y, m, day) { return holidays(y)[m + '-' + day] || null; }

  function berlinNow() {
    var now = new Date();
    try {
      var parts = new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
      }).formatToParts(now);
      var get = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parseInt(parts[i].value, 10); return 0; };
      var y = get('year'), mo = get('month'), da = get('day');
      return { y: y, m: mo, d: da, mins: get('hour') * 60 + get('minute'), wd: new Date(Date.UTC(y, mo - 1, da)).getUTCDay() };
    } catch (e) {
      return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate(), mins: now.getHours() * 60 + now.getMinutes(), wd: now.getDay() };
    }
  }

  function computeStatus() {
    var n = berlinNow();
    var hol = holidayName(n.y, n.m, n.d);
    var slots = hol ? [] : SCHEDULE[n.wd];
    var i;
    for (i = 0; i < slots.length; i++) {
      if (n.mins >= slots[i][0] && n.mins < slots[i][1]) {
        return { state: 'open', text: 'Jetzt geöffnet · bis ' + fmt(slots[i][1]) + ' Uhr', wd: n.wd };
      }
    }
    if (slots.length > 1 && n.mins >= slots[0][1] && n.mins < slots[1][0]) {
      return { state: 'break', text: 'Mittagspause · ab ' + fmt(slots[1][0]) + ' Uhr wieder erreichbar', wd: n.wd };
    }
    if (slots.length && n.mins < slots[0][0]) {
      return { state: 'closed', text: 'Geschlossen · öffnet heute um ' + fmt(slots[0][0]) + ' Uhr', wd: n.wd };
    }
    var base = Date.UTC(n.y, n.m - 1, n.d);
    for (i = 1; i <= 14; i++) {
      var dt = new Date(base + i * 864e5);
      var wd = dt.getUTCDay();
      var s = SCHEDULE[wd];
      if (!s.length || holidayName(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())) continue;
      var when = i === 1 ? 'morgen' : (i < 7 ? 'am ' + DAYS[wd] : 'am ' + dt.getUTCDate() + '.' + (dt.getUTCMonth() + 1) + '.');
      var prefix = hol ? 'Heute Feiertag (' + hol + ')' : 'Geschlossen';
      return { state: 'closed', text: prefix + ' · öffnet ' + when + ' um ' + fmt(s[0][0]) + ' Uhr', wd: n.wd };
    }
    return { state: 'closed', text: 'Geschlossen', wd: n.wd };
  }

  var statusEls = d.querySelectorAll('[data-status]');
  var dayRows = d.querySelectorAll('[data-days]');

  function renderStatus() {
    var st = computeStatus();
    Array.prototype.forEach.call(statusEls, function (el) {
      el.classList.remove('is-open', 'is-break', 'is-closed');
      el.classList.add('is-' + st.state);
      var t = el.querySelector('.status__text');
      if (t) t.textContent = st.text;
    });
    Array.prototype.forEach.call(dayRows, function (row) {
      var days = row.getAttribute('data-days').split(',').map(Number);
      row.classList.toggle('is-today', days.indexOf(st.wd) > -1);
    });
  }
  renderStatus();
  w.setInterval(renderStatus, 60000);

  /* ---------- Kontaktformular ---------- */
  var form = d.querySelector('[data-contact-form]');
  if (!form) return;

  var statusBox = form.querySelector('[data-form-status]');
  var ts = form.querySelector('[data-ts]');
  if (ts) ts.value = String(Date.now());

  var RECIPIENT = 'kontakt@olzinger.de';
  var fields = {
    name: form.querySelector('[name="name"]'),
    email: form.querySelector('[name="email"]'),
    message: form.querySelector('[name="message"]'),
    privacy: form.querySelector('[name="privacy"]')
  };

  Object.keys(fields).forEach(function (k) {
    var el = fields[k];
    if (!el) return;
    el.setAttribute('aria-describedby', 'e-' + k);
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', function () {
      if (el.closest('.field').classList.contains('is-invalid')) validateField(k);
    });
  });

  function validateField(k) {
    var el = fields[k], ok = true;
    if (k === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());
    else if (k === 'privacy') ok = el.checked;
    else if (k === 'message') ok = el.value.trim().length >= 5;
    else ok = el.value.trim().length > 0;
    el.closest('.field').classList.toggle('is-invalid', !ok);
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }

  function setStatus(type, html) {
    statusBox.className = 'form__status' + (type ? ' is-' + type : '');
    statusBox.innerHTML = html || '';
  }

  function selectTopic(topic) {
    if (!topic) return;
    var radios = form.querySelectorAll('[name="topic"]');
    Array.prototype.forEach.call(radios, function (r) { r.checked = (r.value === topic); });
  }

  w.addEventListener('olz:topic', function (e) { selectTopic(e.detail); });
  w.addEventListener('olz:prefill', function (e) {
    var det = e.detail || {};
    selectTopic(det.topic);
    if (det.message && fields.message) {
      fields.message.value = det.message;
      fields.message.closest('.field').classList.remove('is-invalid');
    }
  });

  function buildMail(data) {
    var topic = data.get('topic') || 'Allgemeine Anfrage';
    var lines = [
      'Anliegen: ' + topic,
      'Name: ' + (data.get('name') || ''),
      'E-Mail: ' + (data.get('email') || ''),
      'Telefon: ' + (data.get('phone') || '–'),
      'PLZ / Ort: ' + (data.get('place') || '–'),
      '',
      String(data.get('message') || '')
    ];
    return 'mailto:' + RECIPIENT +
      '?subject=' + encodeURIComponent('Anfrage über olzinger.de – ' + topic) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var valid = ['name', 'email', 'message', 'privacy'].map(validateField);
    if (valid.indexOf(false) > -1) {
      var firstBad = form.querySelector('.is-invalid input, .is-invalid textarea');
      if (firstBad) firstBad.focus();
      setStatus('error', 'Bitte prüfen Sie die markierten Felder.');
      return;
    }
    var data = new FormData(form);
    form.classList.add('is-busy');
    setStatus('', '');

    var done = function (ok, serverValidation) {
      form.classList.remove('is-busy');
      if (ok) {
        form.reset();
        if (ts) ts.value = String(Date.now());
        setStatus('success', '<strong>Vielen Dank!</strong> Ihre Anfrage ist bei uns angekommen. Wir melden uns schnellstmöglich bei Ihnen.');
      } else if (serverValidation) {
        setStatus('error', 'Bitte prüfen Sie Ihre Angaben – einige Felder sind unvollständig.');
      } else {
        w.location.href = buildMail(data);
        setStatus('info', '<strong>Fast geschafft:</strong> Ihr E-Mail-Programm öffnet sich mit Ihrer vorbereiteten Anfrage – bitte dort nur noch auf „Senden“ klicken. Alternativ erreichen Sie uns unter <a href="tel:+4987172617">0871&nbsp;72617</a>.');
      }
    };

    if (!/^https?:$/.test(w.location.protocol) || !w.fetch) { done(false); return; }

    w.fetch(form.getAttribute('action'), { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (res) {
        return res.text().then(function (txt) {
          var json = null;
          try { json = JSON.parse(txt); } catch (err) { json = null; }
          if (res.status === 422 && json) return done(false, true);
          done(!!(res.ok && json && json.ok === true));
        });
      })
      .catch(function () { done(false); });
  });
})(window, document);
