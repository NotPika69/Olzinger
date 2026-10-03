/* ==========================================================================
   Olzinger – „Wärmebild“ (WebGL)
   Ein thermografisches Feld mit Isothermen. Die Maus wirkt als Wärmequelle
   und hinterlässt eine Wärmespur, die langsam abkühlt und sich ausbreitet.
   Hinter Fließtext wird die Wärme gedämpft, damit alles lesbar bleibt.
   ========================================================================== */
(function (w) {
  'use strict';

  var MAX_HEAT = 14;
  var T_MIN = 14;   // °C bei Feldwert 0
  var T_MAX = 28;   // °C bei Feldwert 1

  var VERT = 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }';

  var FRAG = [
    '#ifdef GL_OES_standard_derivatives',
    '#extension GL_OES_standard_derivatives : enable',
    '#endif',
    'precision highp float;',
    '#define MAXH ' + MAX_HEAT,
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uIntro;',
    'uniform vec4 uCalm;',
    'uniform vec4 uHeat[MAXH];',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }',
    'float fbm(vec2 p){ float v = 0.0; float a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);',
    '  for (int i = 0; i < 5; i++){ v += a * noise(p); p = m * p; a *= 0.5; } return v; }',
    'vec3 pal(float t){',
    '  t = clamp(t, 0.0, 1.0) * 8.0;',
    '  vec3 c0 = vec3(0.020, 0.043, 0.071); vec3 c1 = vec3(0.043, 0.106, 0.180); vec3 c2 = vec3(0.078, 0.200, 0.353);',
    '  vec3 c3 = vec3(0.231, 0.141, 0.400); vec3 c4 = vec3(0.541, 0.137, 0.314); vec3 c5 = vec3(0.878, 0.282, 0.165);',
    '  vec3 c6 = vec3(1.000, 0.541, 0.165); vec3 c7 = vec3(1.000, 0.780, 0.420); vec3 c8 = vec3(1.000, 0.910, 0.700);',
    '  if (t < 1.0) return mix(c0, c1, t);',
    '  if (t < 2.0) return mix(c1, c2, t - 1.0);',
    '  if (t < 3.0) return mix(c2, c3, t - 2.0);',
    '  if (t < 4.0) return mix(c3, c4, t - 3.0);',
    '  if (t < 5.0) return mix(c4, c5, t - 4.0);',
    '  if (t < 6.0) return mix(c5, c6, t - 5.0);',
    '  if (t < 7.0) return mix(c6, c7, t - 6.0);',
    '  return mix(c7, c8, t - 7.0);',
    '}',
    'float calm(vec2 p){',
    '  vec2 a = smoothstep(uCalm.xy - 0.08, uCalm.xy + 0.02, p);',
    '  vec2 b = 1.0 - smoothstep(uCalm.zw - 0.02, uCalm.zw + 0.08, p);',
    '  return a.x * a.y * b.x * b.y;',
    '}',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float asp = uRes.x / uRes.y;',
    '  vec2 p = vec2(uv.x * asp, uv.y);',
    '  float t = uTime;',
    '  vec2 s = p * 1.35;',
    '  vec2 q = vec2(fbm(s + vec2(0.0, t * 0.05)), fbm(s + vec2(5.2, -t * 0.04)));',
    '  vec2 r = vec2(fbm(s + 2.4 * q + vec2(1.7, 9.2) + t * 0.06), fbm(s + 2.4 * q + vec2(8.3, 2.8) - t * 0.05));',
    '  float f = fbm(s + 2.2 * r);',
    '  float base = smoothstep(0.18, 0.86, f) * 0.46;',
    '  vec2 dz = p - vec2(asp * 0.8, 0.76);',
    '  base += 0.36 * exp(-dot(dz, dz) / 0.11) * (0.8 + 0.2 * sin(t * 0.45));',
    '  vec2 dc = p - vec2(asp * 0.16, 0.12);',
    '  base -= 0.12 * exp(-dot(dc, dc) / 0.2);',
    '  base *= mix(0.5, 1.0, smoothstep(0.0, 0.95, uv.x * 0.85 + uv.y * 0.55));',
    '  float heat = 0.0;',
    '  for (int i = 0; i < MAXH; i++){ vec4 h = uHeat[i]; vec2 d = p - h.xy; heat += h.z * exp(-dot(d, d) / max(h.w * h.w, 0.0001)); }',
    '  heat *= 1.0 - 0.62 * calm(p);',
    '  float v = max(base, 0.0) + heat * 0.66;',
    '  v = 1.0 - exp(-v * 1.35);',
    '  v *= uIntro;',
    '  vec3 col = pal(v);',
    '  float k = v * 15.0;',
    '#ifdef GL_OES_standard_derivatives',
    '  float fw = fwidth(k) * 1.15;',
    '#else',
    '  float fw = 0.05;',
    '#endif',
    '  float dist = abs(fract(k + 0.5) - 0.5);',
    '  float line = 1.0 - smoothstep(0.0, fw, dist);',
    '  col += line * (0.03 + 0.2 * v) * vec3(1.0, 0.93, 0.86);',
    '  float g = hash(gl_FragCoord.xy + fract(t * 7.0) * 91.7) - 0.5;',
    '  col += g * 0.032;',
    '  vec2 vc = uv - 0.5;',
    '  col *= 1.0 - dot(vc, vc) * 0.5;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  /* ---------- CPU-Gegenstück des Feldes (für die Temperaturanzeige) ---------- */
  function fract(x) { return x - Math.floor(x); }
  function smoothstep(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function hash(x, y) {
    x = fract(x * 123.34); y = fract(y * 456.21);
    var dd = x * (x + 45.32) + y * (y + 45.32);
    x += dd; y += dd;
    return fract(x * y);
  }
  function noise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    var a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    var ab = a + (b - a) * ux, cd = c + (d - c) * ux;
    return ab + (cd - ab) * uy;
  }
  function fbm(x, y) {
    var v = 0, a = 0.5;
    for (var i = 0; i < 5; i++) {
      v += a * noise(x, y);
      var nx = 1.6 * x - 1.2 * y, ny = 1.2 * x + 1.6 * y;
      x = nx; y = ny; a *= 0.5;
    }
    return v;
  }

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      if (w.console) console.warn('[Wärmebild] Shader-Fehler:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function init(canvas, opts) {
    opts = opts || {};
    var root = document.documentElement;
    var hero = opts.hero || canvas.parentElement;
    var gl = null;
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' }) ||
           canvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) { root.classList.add('no-webgl'); return null; }

    gl.getExtension('OES_standard_derivatives');
    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { root.classList.add('no-webgl'); return null; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { root.classList.add('no-webgl'); return null; }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uTime = gl.getUniformLocation(prog, 'uTime');
    var uIntro = gl.getUniformLocation(prog, 'uIntro');
    var uCalm = gl.getUniformLocation(prog, 'uCalm');
    var uHeat = gl.getUniformLocation(prog, 'uHeat');

    var reduce = !!opts.reduceMotion;
    var finePointer = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var probe = opts.probe, probeVal = opts.probeVal, marker = opts.legendMarker;
    var calmEl = opts.calm || null;

    var heatData = new Float32Array(MAX_HEAT * 4);
    var calmRect = [-1, -1, -1, -1];
    var trail = [];
    var quality = (w.devicePixelRatio || 1) > 1.5 ? 0.62 : 0.85;
    var width = 0, height = 0, rect = null;
    var running = false, visible = true, raf = 0;
    var time = Math.random() * 40, last = 0, frame = 0;
    var intro = reduce ? 1 : 0, introTarget = reduce ? 1 : 0;
    var frameTimes = [], tuned = false;

    // Cursor in Feldkoordinaten: x ∈ [0, Seitenverhältnis], y ∈ [0, 1] (y nach oben)
    var cur = { x: 0, y: 0, tx: 0, ty: 0, inside: false, lastMove: -1e9, heat: 0, clientX: 0, clientY: 0 };
    var auto = { heat: 0 };
    var lastEmit = 0;

    function measureCalm() {
      if (!calmEl || !rect) return;
      var r = calmEl.getBoundingClientRect();
      if (!r.width) { calmRect = [-1, -1, -1, -1]; return; }
      var hgt = rect.height, pad = 18;
      calmRect = [
        (r.left - pad - rect.left) / hgt,
        1 - (r.bottom + pad - rect.top) / hgt,
        (r.right + pad - rect.left) / hgt,
        1 - (r.top - pad - rect.top) / hgt
      ];
    }

    function resize() {
      rect = canvas.getBoundingClientRect();
      var dpr = Math.min(w.devicePixelRatio || 1, 2);
      var nw = Math.max(1, Math.round(rect.width * dpr * quality));
      var nh = Math.max(1, Math.round(rect.height * dpr * quality));
      if (nw !== width || nh !== height) {
        width = canvas.width = nw;
        height = canvas.height = nh;
        gl.viewport(0, 0, width, height);
      }
      measureCalm();
    }

    function toField(clientX, clientY) {
      return { x: (clientX - rect.left) / rect.height, y: 1 - (clientY - rect.top) / rect.height };
    }

    function emit(x, y, i, r) {
      trail.unshift({ x: x, y: y, i: i, r: r });
      if (trail.length > MAX_HEAT - 2) trail.pop();
    }

    function onMove(e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      rect = canvas.getBoundingClientRect();
      var f = toField(e.clientX, e.clientY);
      cur.tx = f.x; cur.ty = f.y;
      cur.clientX = e.clientX - rect.left;
      cur.clientY = e.clientY - rect.top;
      if (!cur.inside) { cur.x = f.x; cur.y = f.y; }
      cur.inside = true;
      cur.lastMove = performance.now();
      if (probe) probe.classList.add('is-on');
    }
    function onLeave() {
      cur.inside = false;
      if (probe) probe.classList.remove('is-on');
    }
    function onTouch(e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      rect = canvas.getBoundingClientRect();
      var f = toField(t.clientX, t.clientY);
      emit(f.x, f.y, 0.85, 0.09);
    }

    if (finePointer) {
      hero.addEventListener('pointermove', onMove, { passive: true });
      hero.addEventListener('pointerleave', onLeave, { passive: true });
    }
    hero.addEventListener('touchstart', onTouch, { passive: true });

    function calmAt(px, py) {
      var a = smoothstep(calmRect[0] - 0.08, calmRect[0] + 0.02, px) * smoothstep(calmRect[1] - 0.08, calmRect[1] + 0.02, py);
      var b = (1 - smoothstep(calmRect[2] - 0.02, calmRect[2] + 0.08, px)) * (1 - smoothstep(calmRect[3] - 0.02, calmRect[3] + 0.08, py));
      return a * b;
    }

    // Exakt dieselbe Rechnung wie im Shader – nur für einen Punkt
    function fieldAt(px, py) {
      var asp = width / height, t = time;
      var sx = px * 1.35, sy = py * 1.35;
      var qx = fbm(sx, sy + t * 0.05), qy = fbm(sx + 5.2, sy - t * 0.04);
      var rx = fbm(sx + 2.4 * qx + 1.7 + t * 0.06, sy + 2.4 * qy + 9.2 + t * 0.06);
      var ry = fbm(sx + 2.4 * qx + 8.3 - t * 0.05, sy + 2.4 * qy + 2.8 - t * 0.05);
      var f = fbm(sx + 2.2 * rx, sy + 2.2 * ry);
      var base = smoothstep(0.18, 0.86, f) * 0.46;
      var zx = px - asp * 0.8, zy = py - 0.76;
      base += 0.36 * Math.exp(-(zx * zx + zy * zy) / 0.11) * (0.8 + 0.2 * Math.sin(t * 0.45));
      var cx = px - asp * 0.16, cy = py - 0.12;
      base -= 0.12 * Math.exp(-(cx * cx + cy * cy) / 0.2);
      base *= 0.5 + 0.5 * smoothstep(0, 0.95, (px / asp) * 0.85 + py * 0.55);
      var heat = 0;
      for (var i = 0; i < MAX_HEAT; i++) {
        var o = i * 4, dx = px - heatData[o], dy = py - heatData[o + 1];
        heat += heatData[o + 2] * Math.exp(-(dx * dx + dy * dy) / Math.max(heatData[o + 3] * heatData[o + 3], 0.0001));
      }
      heat *= 1 - 0.62 * calmAt(px, py);
      var v = Math.max(base, 0) + heat * 0.66;
      v = 1 - Math.exp(-v * 1.35);
      return v * intro;
    }

    function readTemperature() {
      if (!probeVal || !cur.inside) return;
      var v = Math.max(0, Math.min(1, fieldAt(cur.tx, cur.ty)));
      var temp = T_MIN + v * (T_MAX - T_MIN);
      probeVal.textContent = temp.toFixed(1).replace('.', ',') + ' °C';
      if (marker) marker.style.left = (v * 100).toFixed(1) + '%';
    }

    function step(now) {
      raf = 0;
      if (!running) return;
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      if (!reduce) time += dt;

      // Auflösung automatisch an die Leistung anpassen
      if (!tuned) {
        frameTimes.push(dt);
        if (frameTimes.length >= 80) {
          var avg = frameTimes.reduce(function (a, b) { return a + b; }, 0) / frameTimes.length;
          if (avg > 0.024 && quality > 0.38) { quality *= 0.75; resize(); frameTimes = []; }
          else tuned = true;
        }
      }

      intro += (introTarget - intro) * (1 - Math.exp(-dt * 1.8));
      var asp = width / height;

      // Maus
      var k = 1 - Math.exp(-dt * 9);
      cur.x += (cur.tx - cur.x) * k;
      cur.y += (cur.ty - cur.y) * k;
      var idle = (now - cur.lastMove) > 3200;
      cur.heat += ((cur.inside ? 1 : 0) - cur.heat) * (1 - Math.exp(-dt * 3));
      if (cur.inside && !idle && now - lastEmit > 55) {
        emit(cur.x, cur.y, 0.42, 0.075);
        lastEmit = now;
      }

      // Autopilot: wandernde Wärmequelle oben rechts, solange niemand interagiert
      var autoOn = (!cur.inside || idle) && !reduce;
      auto.heat += ((autoOn ? 0.8 : 0) - auto.heat) * (1 - Math.exp(-dt * 1.2));
      var ax = asp * (0.7 + 0.16 * Math.sin(time * 0.21)) + 0.05 * Math.sin(time * 0.53);
      var ay = 0.66 + 0.16 * Math.sin(time * 0.29 + 1.3);
      if (autoOn && now - lastEmit > 140) {
        emit(ax, ay, 0.3 * auto.heat, 0.09);
        lastEmit = now;
      }

      // Abkühlen & Ausbreiten
      for (var i = 0; i < trail.length; i++) {
        trail[i].i *= Math.exp(-dt * 0.85);
        trail[i].r += dt * 0.032;
      }

      heatData[0] = cur.x; heatData[1] = cur.y; heatData[2] = cur.heat * 0.8; heatData[3] = 0.095;
      heatData[4] = ax; heatData[5] = ay; heatData[6] = auto.heat * 0.7; heatData[7] = 0.13;
      for (var j = 0; j < MAX_HEAT - 2; j++) {
        var o = (j + 2) * 4, tp = trail[j];
        if (tp) { heatData[o] = tp.x; heatData[o + 1] = tp.y; heatData[o + 2] = tp.i; heatData[o + 3] = tp.r; }
        else { heatData[o + 2] = 0; heatData[o + 3] = 0.1; }
      }

      gl.uniform2f(uRes, width, height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uIntro, intro);
      gl.uniform4f(uCalm, calmRect[0], calmRect[1], calmRect[2], calmRect[3]);
      gl.uniform4fv(uHeat, heatData);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      frame++;
      if (frame % 4 === 0) readTemperature();
      if (probe && cur.inside) {
        probe.style.transform = 'translate3d(' + cur.clientX.toFixed(1) + 'px,' + cur.clientY.toFixed(1) + 'px,0)';
      }

      raf = w.requestAnimationFrame(step);
    }

    function start() {
      if (running || !visible || document.hidden) return;
      running = true;
      last = 0;
      raf = w.requestAnimationFrame(step);
    }
    function stop() {
      running = false;
      if (raf) w.cancelAnimationFrame(raf);
      raf = 0;
    }

    resize();
    if ('ResizeObserver' in w) {
      var ro = new ResizeObserver(function () { resize(); });
      ro.observe(canvas);
      if (calmEl) ro.observe(calmEl);
    } else {
      w.addEventListener('resize', resize);
    }
    if (d().fonts && d().fonts.ready) d().fonts.ready.then(function () { resize(); });

    if ('IntersectionObserver' in w) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); root.classList.add('no-webgl'); });

    start();

    return {
      heatUp: function () { introTarget = 1; },
      measure: function () { rect = canvas.getBoundingClientRect(); measureCalm(); },
      start: start,
      stop: stop
    };
  }

  function d() { return document; }

  w.OlzThermal = { init: init };
})(window);
