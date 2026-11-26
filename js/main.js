/* ODŸ — Drop 01 · home page behaviour (vanilla JS, no dependencies) */
(function () {
  'use strict';

  var N = 12;
  var LAT = '48.79299323561635';
  var LON = '2.3939829756632616';

  var root = document.getElementById('root');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hoverCapable = !(window.matchMedia && window.matchMedia('(hover: none)').matches);

  var state = { pin: false, vh: 900, vw: 1440, active: 0, way: 0, cart: 0, size: 'M', added: false };

  /* ---------- GPS digit reels (loader + "Origin point" tile) ---------- */
  function seq(reps) { var a = []; for (var r = 0; r < reps; r++) for (var d = 0; d < 10; d++) a.push(d); return a.join('\n'); }
  var COL30 = seq(3), COL20 = seq(2);

  function buildReel(el, str, opts) {
    var frag = document.createDocumentFragment();
    str.split('').forEach(function (ch, k) {
      var isD = ch >= '0' && ch <= '9';
      if (!isD) { var dot = document.createElement('span'); dot.className = 'dot'; dot.textContent = '.'; frag.appendChild(dot); return; }
      var n = Number(ch);
      var reel = document.createElement('span'); reel.className = 'reel';
      var col = document.createElement('span'); col.className = 'col';
      if (opts.hover) {
        col.textContent = COL20;
        col.style.transform = 'translateY(-' + n + 'em)';
        col.style.transitionDelay = (k * 0.025).toFixed(3) + 's';
      } else {
        col.textContent = COL30;
        col.style.transform = 'translateY(-' + (20 + n) + 'em)';
        col.style.animationDelay = (opts.base + k * opts.step).toFixed(2) + 's';
      }
      reel.appendChild(col); frag.appendChild(reel);
    });
    el.appendChild(frag);
  }
  $$('[data-reel]').forEach(function (el) {
    var lat = el.getAttribute('data-reel') === 'lat';
    buildReel(el, lat ? LAT : LON, { base: lat ? 0.25 : 0.45, step: 0.05 });
  });
  $$('[data-reel-hover]').forEach(function (el) {
    buildReel(el, el.getAttribute('data-reel-hover') === 'lat' ? LAT : LON, { hover: true });
  });

  /* ---------- Intro loader ---------- */
  var loader = $('.ld'), loaderLine = $('.ld-line'), introT;
  function endIntro(skipped) {
    clearTimeout(introT);
    if (loader) loader.classList.add('gone');
    if (loaderLine) loaderLine.classList.add('gone');
    if (skipped) root.classList.add('skip');
  }
  var params = new URLSearchParams(location.search);
  if (reduce || params.has('nointro')) endIntro(true);
  else introT = setTimeout(function () { endIntro(false); }, 4500);

  root.classList.add('js');
  if (hoverCapable) root.classList.add('curon');

  /* ---------- Layout measurement ---------- */
  var hero = $('.hero'), rack = document.getElementById('rack'), pinEl = $('.rack-pin');
  var stage = $('.stage'), stageIn = $('.stage-in'), hint = $('[data-hint]');
  var rackHead = $('.rack-head'), rackInfo = $('.rack-info');

  function applyLayout() {
    var s = state;
    var k = Math.min(1, Math.max(0.42, s.vw / 1320), s.pin ? Math.max(0.5, (s.vh - 340) / 640) : 1);
    // Phones: shrink the rack a bit if needed so the arrows, sizes and ADD TO CART always fit on screen
    if (s.pin && s.vw <= 900 && rackHead && rackInfo) {
      var free = s.vh - rackHead.offsetHeight - rackInfo.offsetHeight - 14;
      k = Math.min(k, Math.max(0.3, free / 640));
    }
    hero.style.height = (s.pin ? s.vh : 900) + 'px';
    // The rack is one screen tall: pieces move with the arrows, not with the page scroll
    rack.style.height = (s.pin ? s.vh : 1000) + 'px';
    pinEl.style.height = (s.pin ? s.vh : 1000) + 'px';
    stage.style.height = Math.round(640 * k) + 'px';
    stageIn.style.transform = 'scale(' + k.toFixed(3) + ')';
    root.classList.toggle('pin', s.pin);
    if (hint) hint.textContent = 'USE THE ARROWS — CLICK A PIECE';
  }
  function measure(force) {
    var vh = window.innerHeight || 900, vw = window.innerWidth || 1440;
    // On phones the address bar shows / hides while scrolling and changes the height a little:
    // ignore those small changes so the page does not jump.
    if (!force && Math.abs(vw - state.vw) < 40 && Math.abs(vh - state.vh) < 140) return;
    state.vh = vh;
    state.vw = vw;
    state.pin = state.vh < 1300;
    applyLayout();
    dirty = true;
  }

  /* ---------- Rack: active piece UI ---------- */
  var infos = $$('.info'), nums = $$('.cnum-n'), ticks = $$('.tick');
  function setActive(a) {
    if (a === state.active) return;
    state.active = a;
    for (var i = 0; i < N; i++) {
      var c = i === a ? 'on' : (i < a ? 'up' : '');
      [infos[i], nums[i]].forEach(function (el) { if (!el) return; el.classList.remove('on', 'up'); if (c) el.classList.add(c); });
      if (ticks[i]) ticks[i].classList.toggle('on', i === a);
    }
    // The scarf has one size: show "ONE SIZE" instead of S / M / L / XL
    var one = !!(typeof P !== 'undefined' && P[a] && P[a].one);
    $$('.buy [data-size]').forEach(function (b) { b.hidden = one; });
    var oneEl = $('.buy .one'); if (oneEl) oneEl.hidden = !one;
  }

  /* ---------- Header waypoint HUD ---------- */
  var ways = $$('.way');
  function setWay(w) {
    if (w === state.way) return;
    state.way = w;
    ways.forEach(function (el, j) { el.classList.remove('on', 'up'); if (j === w) el.classList.add('on'); else if (j < w) el.classList.add('up'); });
  }

  /* ---------- Scroll ---------- */
  var bar = $('.hud-bar i'), heroIn = $('.hero-in');
  var words = $$('.wd'), stmt = $('.statement'), lit;
  var target = 0, p = 0, hover = false, lastUser = 0, dirty = true;
  var se = document.scrollingElement || document.documentElement;
  var waypointIds = ['top', 'rack', 'drop', 'odyssey', 'join'];

  function onScroll() {
    var vh = window.innerHeight || 900;
    var st = se.scrollTop || window.scrollY || 0;
    var max = Math.max(1, se.scrollHeight - se.clientHeight);
    if (bar) bar.style.transform = 'scaleX(' + Math.min(1, st / max).toFixed(4) + ')';
    if (heroIn && state.pin) {
      var f = Math.max(0, Math.min(1, st / vh));
      heroIn.style.transform = 'scale(' + (1 - f * 0.12).toFixed(4) + ') translateY(' + (f * -40).toFixed(1) + 'px)';
      heroIn.style.opacity = String(1 - f * 0.7);
    }
    var w = 0;
    for (var k = 0; k < waypointIds.length; k++) {
      var el = document.getElementById(waypointIds[k]);
      if (el && el.getBoundingClientRect().top < vh * 0.55) w = k;
    }
    setWay(w);
    if (stmt && words.length) {
      var q = 1;
      if (state.pin) { var sr = stmt.getBoundingClientRect(); q = Math.max(0, Math.min(1, (vh * 0.85 - sr.top) / (sr.height + vh * 0.35))); }
      var l = q * (words.length + 2);
      if (lit === undefined || Math.abs(l - lit) > 0.02) {
        lit = l;
        words.forEach(function (wd, i) { wd.style.opacity = String(Math.max(0.12, Math.min(1, l - i))); });
      }
    }
  }

  /* ---------- Animation loop: rack carousel physics + cursor ---------- */
  var hangs = $$('.hang'), swings = $$('.swing');
  var ang = [], angV = [];
  for (var i = 0; i < N; i++) { ang.push(0); angV.push(0); }
  var cur = $('.cur'), curT = $('.cur-t');
  var mx = -200, my = -200, cx = -200, cy = -200;

  function tick() {
    requestAnimationFrame(tick);
    if (cur && (Math.abs(mx - cx) > 0.1 || Math.abs(my - cy) > 0.1)) {
      cx += (mx - cx) * 0.22; cy += (my - cy) * 0.22;
      cur.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
    }
    var prev = p;
    p += (target - p) * 0.075;
    if (Math.abs(target - p) < 0.0008) p = target;
    var v = p - prev;
    var moving = dirty || Math.abs(v) > 0.00001;
    for (var i = 0; i < N; i++) {
      angV[i] += -0.055 * ang[i] - 0.085 * angV[i] - v * (7 + (i % 3) * 1.6);
      ang[i] += angV[i];
      if (ang[i] > 16) ang[i] = 16;
      if (ang[i] < -16) ang[i] = -16;
      if (Math.abs(ang[i]) > 0.01 || Math.abs(angV[i]) > 0.01) moving = true;
    }
    if (moving) {
      // Side pieces: turned only 38° (was 72°) so you still see the garment's shape, not a thin edge
      var G = 104, S = 236, ANG = 38;
      for (var j = 0; j < hangs.length; j++) {
        var d = j - p, cd = Math.max(-1, Math.min(1, d)), ad = Math.abs(d);
        var x = d * G + cd * S;
        var sc = 1 - Math.min(ad, 1) * 0.2 - Math.min(Math.max(ad - 1, 0) * 0.03, 0.12);
        var br = 1 - Math.min(ad, 1) * 0.12 - Math.min(ad / 10, 0.22);
        var el = hangs[j];
        el.style.transform = 'translateX(' + x.toFixed(1) + 'px) translateX(-50%) rotateY(' + (cd * ANG).toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
        el.style.zIndex = String(200 - Math.round(ad * 10));
        el.style.filter = 'brightness(' + br.toFixed(3) + ')';
        el.style.opacity = ad > 7.5 ? String(Math.max(0, 1 - (ad - 7.5))) : '1';
        if (swings[j]) swings[j].style.transform = 'rotate(' + ang[j].toFixed(2) + 'deg)';
      }
      dirty = false;
    }
    setActive(Math.max(0, Math.min(N - 1, Math.round(p))));
  }

  root.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (curT) {
      var vw = window.innerWidth || 1440, vh = window.innerHeight || 900;
      var lat = 48.79299323561635 + (0.5 - e.clientY / vh) * 0.0042;
      var lon = 2.3939829756632616 + (e.clientX / vw - 0.5) * 0.0064;
      curT.textContent = lat.toFixed(5) + ' N\n' + lon.toFixed(5) + ' E';
    }
  });

  /* ---------- Navigation on the rack ---------- */
  function goTo(i) {
    i = Math.max(0, Math.min(N - 1, i));
    lastUser = Date.now();
    target = i;
  }
  function openFromGrid(i) {
    goTo(i);
    rack.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function next() { var c = Math.round(target); goTo(c >= N - 1 ? 0 : c + 1); }
  function prev() { var c = Math.round(target); goTo(c <= 0 ? N - 1 : c - 1); }

  // Swipe left / right on the rack (finger or mouse drag)
  var px = null, py = 0, swiped = 0;
  stage.addEventListener('pointerdown', function (e) { px = e.clientX; py = e.clientY; });
  stage.addEventListener('pointercancel', function () { px = null; });
  stage.addEventListener('pointerleave', function () { px = null; });
  stage.addEventListener('pointerup', function (e) {
    if (px === null) return;
    var dx = e.clientX - px, dy = e.clientY - py; px = null;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.2) { swiped = Date.now(); if (dx < 0) next(); else prev(); }
  });
  // Click on a piece: the one in front opens its product page, another one comes to the front
  function pick(i, fromGarment) {
    if (Date.now() - swiped < 350) return;
    if (fromGarment && i === Math.round(p) && Math.abs(target - p) < 0.08) { if (typeof openProduct === 'function') openProduct(i); }
    else goTo(i);
  }

  // Keyboard: left / right arrows browse the rack while it is on screen
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (anyLock() || ui.mega) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var r = rack.getBoundingClientRect(), vh = window.innerHeight || 900;
    if (r.top > vh * 0.5 || r.bottom < vh * 0.5) return;
    e.preventDefault();
    if (e.key === 'ArrowRight') next(); else prev();
  });

  /* ---------- Product data: the 12 pieces, in rack order ----------
     Texts come from the design reference. Placeholders in [BRACKETS] stay as they are. */
  var IMG = 'assets/img/';
  var TEE = ['Composition: [COMPOSITION]', 'Fit: [FIT]', 'Made in: [ORIGIN]'];
  function gi(src, k, cap) { return { src: IMG + src, k: k, cap: cap }; }
  var P = [
    { n: 'Blue Face', t: 'Longsleeve', cat: 'Tops',
      imgs: [gi('01-blue-face-longsleeve.webp', 'cut', 'FRONT'), gi('ls-blueface-studio.webp', 'bg', 'STUDIO'), gi('print-blueface.webp', 'art', 'PRINT — BLUE FACE')],
      desc: 'Off-white longsleeve carrying the Blue Face: a portrait screen-printed in ultramarine, with the ODŸ wordmark running across the brow.',
      det: ['Screen-printed front: Blue Face'].concat(TEE) },
    { n: 'Motorcycle Accident', t: 'Tee', cat: 'Tops',
      imgs: [gi('02-motorcycle-accident-tee.webp', 'cut', 'FRONT'), gi('tee-moto-studio.webp', 'bg dark', 'STUDIO'), gi('print-moto.webp', 'art', 'PRINT — MOTORCYCLE ACCIDENT')],
      desc: 'White tee printed with Motorcycle Accident: an archive crash photo pushed into yellow and black halftone, signed with a faded ODŸ logo.',
      det: ['Screen-printed front: Motorcycle Accident'].concat(TEE) },
    { n: 'Head & Logo', t: 'Button-up shirt', cat: 'Tops',
      imgs: [gi('03-head-logo-shirt.webp', 'cut', 'FRONT'), gi('bu-headlogo-studio.webp', 'bg', 'STUDIO'), gi('print-headlogo.webp', 'art', 'PRINT — HEAD & LOGO')],
      desc: 'Pinstriped white shirt with an X-ray head printed in black and the ODŸ logo boxed in red on the chest.',
      det: ['Screen-printed front: Head & Logo'].concat(TEE) },
    { n: 'Ÿ 02', t: 'Tracksuit', cat: 'Tracksuits',
      imgs: [gi('04-y02-tracksuit.webp', 'cut', 'FRONT'), gi('track-y2-back.webp', 'cut', 'BACK'), gi('track-y2-studio.webp', 'bg', 'STUDIO')],
      desc: 'Blue tracksuit, jacket and pants, traced with contrast piping. The ODŸ logo sits on the chest and the leg, the Ÿ symbol runs across the back.',
      det: ['Jacket and pants', 'Reflective ODŸ logo', 'Ÿ graphic on the back'].concat(TEE) },
    { n: 'Mix Media', t: 'Longsleeve', cat: 'Tops',
      imgs: [gi('05-mix-media-longsleeve.webp', 'cut', 'FRONT'), gi('ls-mxm-studio.webp', 'bg', 'STUDIO'), gi('print-mxm.webp', 'art', 'PRINT — MIX MEDIA')],
      desc: 'Off-white longsleeve with a grid of eight archive portraits printed in black under the red ODŸ logo.',
      det: ['Screen-printed front: Mix Media'].concat(TEE) },
    { n: 'Jumping Girl', t: 'Tee', cat: 'Tops',
      imgs: [gi('06-jumping-girl-tee.webp', 'cut', 'FRONT'), gi('tee-jump-studio.webp', 'bg dark', 'STUDIO'), gi('print-jump.webp', 'art', 'PRINT — JUMPING GIRL')],
      desc: 'White tee printed with Jumping Girl: a figure caught mid-leap over the brand’s GPS coordinates, in yellow and red halftone.',
      det: ['Screen-printed front: Jumping Girl'].concat(TEE) },
    { n: 'Washed Denim', t: 'Jeans', cat: 'Denim',
      imgs: [gi('07-washed-denim-jeans.webp', 'cut', 'FRONT'), gi('jeans-back.webp', 'cut', 'BACK'), gi('jeans-studio.webp', 'bg', 'STUDIO'), gi('logo-red.png', 'art', 'EMBROIDERY — RED ODŸ')],
      desc: 'Washed jeans in a straight, loose cut, with the ODŸ logo embroidered in red at the front.',
      det: ['Red ODŸ embroidery', 'ODŸ back label'].concat(TEE) },
    { n: 'Blue Face', t: 'Button-up shirt', cat: 'Tops',
      imgs: [gi('08-blue-face-shirt.webp', 'cut', 'FRONT'), gi('bu-blueface-studio.webp', 'bg', 'STUDIO'), gi('print-blueface.webp', 'art', 'PRINT — BLUE FACE')],
      desc: 'Pinstriped white shirt carrying the Blue Face portrait in ultramarine, with the ODŸ wordmark running across the brow.',
      det: ['Screen-printed front: Blue Face'].concat(TEE) },
    { n: 'Medical Sisters', t: 'Tee', cat: 'Tops',
      imgs: [gi('09-medical-sisters-tee.webp', 'cut', 'FRONT'), gi('tee-medsis-studio.webp', 'bg dark', 'STUDIO'), gi('print-medsis.webp', 'art', 'PRINT — MEDICAL SISTERS')],
      desc: 'White tee printed with Medical Sisters: three figures from an archive photo, layered over the brand’s GPS coordinates in teal.',
      det: ['Screen-printed front: Medical Sisters'].concat(TEE) },
    { n: 'Ÿ 01', t: 'Tracksuit', cat: 'Tracksuits',
      imgs: [gi('10-y01-tracksuit.webp', 'cut', 'FRONT'), gi('track-y1-back.webp', 'cut', 'BACK'), gi('track-y1-studio.webp', 'bg', 'STUDIO'), gi('pattern-ymono.webp', 'art', 'PATTERN — Ÿ MONOGRAM')],
      desc: 'Black tracksuit with denim-blue panels on the hooded jacket, and the ODŸ logo on the chest and the leg.',
      det: ['Jacket and pants', 'Reflective ODŸ logo', 'Ÿ monogram pattern'].concat(TEE) },
    { n: 'Head & Logo', t: 'Longsleeve', cat: 'Tops',
      imgs: [gi('11-head-logo-longsleeve.webp', 'cut', 'FRONT'), gi('ls-headlogo-studio.webp', 'bg', 'STUDIO'), gi('print-headlogo.webp', 'art', 'PRINT — HEAD & LOGO')],
      desc: 'Off-white longsleeve with the X-ray head printed in black and the ODŸ logo boxed in red.',
      det: ['Screen-printed front: Head & Logo'].concat(TEE) },
    { n: 'Map Scarf', t: 'Scarf', cat: 'Accessories', one: true,
      imgs: [gi('12-map-scarf.webp', 'cut', 'FLAT'), gi('scarf-studio.webp', 'bg', 'STUDIO'), gi('print-scarfmap.webp', 'art dark', 'PRINT — AERIAL MAP')],
      desc: 'Square scarf printed with an aerial map in black and grey, signed with the ODŸ logo in white.',
      det: ['Printed aerial map', 'White ODŸ logo', 'Dimensions: [DIMENSIONS]', 'Composition: [COMPOSITION]', 'Made in: [ORIGIN]'] }
  ];
  P.forEach(function (it, i) { it.img = it.imgs[0].src; it.full = it.t === 'Scarf' ? it.n : it.n + ' ' + it.t; it.num = (i < 9 ? '0' : '') + (i + 1); });
  function esc(str) { return String(str).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- Overlays: drawer, menus, product page, checkout ----------
     One small state object; render() applies it to the page. */
  var ui = { drawer: null, menu: false, mega: false, pdp: null, co: false };
  var lastDrawer = 'cart', focusT, returnFocus = null;
  var scrim = $('.scrim'), drawer = $('.drawer'), dwX = $('.dw-x'), dwK = $('.dw-k');
  function anyLock() { return !!(ui.drawer || ui.menu || ui.pdp !== null || ui.co); }
  function setUi(patch) {
    var was = {}; for (var k in ui) was[k] = ui[k];
    for (var key in patch) ui[key] = patch[key];
    render(was);
  }
  function render(was) {
    // Drawer (bag + info tabs)
    if (ui.drawer) lastDrawer = ui.drawer;
    var dv = ui.drawer || lastDrawer;
    drawer.classList.toggle('on', !!ui.drawer);
    scrim.classList.toggle('on', !!ui.drawer);
    drawer.setAttribute('aria-hidden', ui.drawer ? 'false' : 'true');
    drawer.setAttribute('aria-label', dv === 'cart' ? 'Bag' : 'Information');
    dwK.textContent = dv === 'cart' ? 'ODŸ — BAG' : 'ODŸ — INFO';
    $$('.dw-view').forEach(function (v) { v.hidden = v.classList.contains('dw-cart') ? dv !== 'cart' : dv === 'cart'; });
    $$('[data-tab]').forEach(function (b) { var on = b.getAttribute('data-tab') === dv; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    $$('[data-pane]').forEach(function (pn) { pn.hidden = pn.getAttribute('data-pane') !== dv; });
    if (ui.drawer && !was.drawer) {
      returnFocus = document.activeElement;
      clearTimeout(focusT);
      focusT = setTimeout(function () { dwX.focus({ preventScroll: true }); }, 90);
    }
    if (!ui.drawer && was.drawer && returnFocus && document.body.contains(returnFocus) && !anyLock()) {
      try { returnFocus.focus({ preventScroll: true }); } catch (err) {}
      returnFocus = null;
    }
    renderExtra.forEach(function (fn) { fn(was); });
    // Lock the page scroll while a full-screen layer is open
    se.style.overflow = anyLock() ? 'hidden' : '';
  }
  var renderExtra = [];
  function closeTop() {
    if (ui.drawer) setUi({ drawer: null });
    else if (ui.mega) setUi({ mega: false });
    else if (ui.menu) setUi({ menu: false });
    else if (ui.pdp !== null) setUi({ pdp: null });
    else if (ui.co) closeCo();
  }
  function closeCo() { setUi({ co: false }); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' || e.key === 'Esc') closeTop(); });

  /* ---------- Bag (front-end only: the real checkout will be Shopify) ---------- */
  var bag = [];
  var cartBtn = $('.cart'), cartCounts = $$('[data-cart-count]'), addBtn = $('.add'), addLabel = addBtn ? addBtn.querySelector('span') : null, addT, openT;
  var bagList = $('.bag'), bagEmpty = $('.dw-empty'), bagFoot = $('.dw-foot');
  function bagCount() { return bag.reduce(function (n, b) { return n + b.qty; }, 0); }
  function sizeLabel(b) { return b.size === 'ONE SIZE' ? 'ONE SIZE' : 'SIZE ' + b.size; }
  function addItem(i) {
    var it = P[i], size = it.one ? 'ONE SIZE' : state.size, key = i + '-' + size, found = null;
    bag.forEach(function (b) { if (b.key === key) found = b; });
    if (found) found.qty += 1; else bag.push({ key: key, i: i, size: size, qty: 1 });
    renderBag();
    cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump');
    var label = it.one ? 'ADDED' : 'ADDED — SIZE ' + size;
    $$('.add').forEach(function (b) { b.classList.add('done'); var sp = b.querySelector('span'); if (sp) { if (!sp.hasAttribute('data-idle')) sp.setAttribute('data-idle', sp.textContent); sp.textContent = label; } });
    clearTimeout(addT);
    addT = setTimeout(function () {
      $$('.add').forEach(function (b) { b.classList.remove('done'); var sp = b.querySelector('span'); if (sp && sp.hasAttribute('data-idle')) sp.textContent = sp.getAttribute('data-idle'); });
      cartBtn.classList.remove('bump');
    }, 1600);
    clearTimeout(openT);
    openT = setTimeout(function () { setUi({ drawer: 'cart', menu: false, mega: false }); }, 500);
  }
  function add() { addItem(state.active); }
  function setQty(key, d) {
    bag.forEach(function (b) { if (b.key === key) b.qty += d; });
    bag = bag.filter(function (b) { return b.qty > 0; });
    renderBag();
  }
  function renderBag() {
    var c = bagCount();
    cartCounts.forEach(function (el) { el.textContent = String(c); });
    bagEmpty.hidden = c > 0;
    bagFoot.hidden = c === 0;
    var keep = {};
    bag.forEach(function (b) {
      keep[b.key] = true;
      var li = bagList.querySelector('[data-key="' + b.key + '"]');
      if (!li) {
        var it = P[b.i];
        li = document.createElement('li');
        li.className = 'bag-it';
        li.setAttribute('data-key', b.key);
        li.innerHTML = '<button class="bag-img" type="button" data-bag="view" aria-label="View ' + esc(it.full) + '"><img src="' + it.img + '" alt=""></button>' +
          '<div class="bag-meta"><p class="bag-t mono">' + esc(it.t) + '</p><p class="bag-n">' + esc(it.n) + '</p><p class="bag-s mono">' + sizeLabel(b) + ' — [PRIX] €</p>' +
          '<div class="bag-row"><div class="qty"><button type="button" data-bag="dec" aria-label="Decrease quantity">−</button><span data-q></span><button type="button" data-bag="inc" aria-label="Increase quantity">+</button></div>' +
          '<button class="bag-rm" type="button" data-bag="rm">REMOVE</button></div></div>';
        bagList.appendChild(li);
      }
      li.querySelector('[data-q]').textContent = String(b.qty);
    });
    $$('.bag-it', bagList).forEach(function (li) { if (!keep[li.getAttribute('data-key')]) li.remove(); });
    renderExtra.forEach(function (fn) { fn(null, 'bag'); });
  }
  bagList.addEventListener('click', function (e) {
    var b = e.target.closest('[data-bag]'); if (!b) return;
    var key = b.closest('.bag-it').getAttribute('data-key'), op = b.getAttribute('data-bag');
    var item = null; bag.forEach(function (x) { if (x.key === key) item = x; });
    if (!item) return;
    if (op === 'inc') setQty(key, 1);
    else if (op === 'dec') setQty(key, -1);
    else if (op === 'rm') setQty(key, -item.qty);
    else if (op === 'view' && window.ODY_openProduct) window.ODY_openProduct(item.i);
  });

  /* ---------- In-page navigation (closes any open layer first) ---------- */
  function scrollToId(id) {
    var el = document.getElementById(id); if (!el) return;
    var top = id === 'top' ? 0 : (se.scrollTop || window.scrollY || 0) + el.getBoundingClientRect().top + 1;
    try { window.scrollTo({ top: top, behavior: 'smooth' }); } catch (err) { window.scrollTo(0, top); }
  }
  function navTo(id) {
    setUi({ menu: false, mega: false, drawer: null, pdp: null });
    setTimeout(function () { scrollToId(id); }, 30);
  }

  /* ---------- Drop grid filters ---------- */
  function setFilter(f) {
    chips.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-filter') === f); });
    cards.forEach(function (c) { c.classList.toggle('off', !(f === 'all' || c.getAttribute('data-cat') === f)); });
  }

  /* ---------- Menus: mega menu (desktop) + full-screen menu (phone) ---------- */
  var shopOpen = false;
  var menuEl = $('.menu'), mbtn = $('.mbtn'), mshop = $('.mshop'), mcats = $('.mcats');
  var megaEl = $('.mega'), megaScrim = $('.mega-scrim'), navb = $('.navb');
  renderExtra.push(function () {
    menuEl.classList.toggle('open', ui.menu);
    menuEl.setAttribute('aria-hidden', ui.menu ? 'false' : 'true');
    mbtn.textContent = ui.menu ? 'CLOSE' : 'MENU';
    mbtn.setAttribute('aria-label', ui.menu ? 'Close menu' : 'Open menu');
    mbtn.setAttribute('aria-expanded', ui.menu ? 'true' : 'false');
    mcats.classList.toggle('open', shopOpen);
    mshop.setAttribute('aria-expanded', shopOpen ? 'true' : 'false');
    megaEl.classList.toggle('open', ui.mega);
    megaEl.setAttribute('aria-hidden', ui.mega ? 'false' : 'true');
    megaScrim.classList.toggle('on', ui.mega);
    navb.setAttribute('aria-expanded', ui.mega ? 'true' : 'false');
  });

  /* ---------- Delegated clicks ---------- */
  var sizeBtns = $$('[data-size]'), chips = $$('[data-filter]'), cards = $$('.card[data-cat]');
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-pick],[data-open],[data-size],[data-filter],[data-cat],[data-product],[data-action],[data-nav],[data-info]');
    if (!t) return;
    if (t.hasAttribute('data-nav')) { e.preventDefault(); return navTo(t.getAttribute('data-nav')); }
    if (t.hasAttribute('data-info')) return setUi({ drawer: t.getAttribute('data-info'), menu: false, mega: false });
    if (t.hasAttribute('data-pick')) return pick(Number(t.getAttribute('data-pick')), t.classList.contains('garment'));
    if (t.hasAttribute('data-open')) return openFromGrid(Number(t.getAttribute('data-open')));
    if (t.hasAttribute('data-size')) {
      state.size = t.getAttribute('data-size');
      sizeBtns.forEach(function (b) { b.classList.toggle('on', b === t); });
      return;
    }
    if (t.hasAttribute('data-filter')) return setFilter(t.getAttribute('data-filter'));
    if (t.hasAttribute('data-cat')) {
      setFilter(t.getAttribute('data-cat'));
      setUi({ mega: false, menu: false, pdp: null, drawer: null });
      setTimeout(function () { scrollToId('drop'); }, 60);
      return;
    }
    if (t.hasAttribute('data-product')) { if (typeof openProduct === 'function') openProduct(Number(t.getAttribute('data-product'))); return; }
    var a = t.getAttribute('data-action');
    if (a === 'next') next();
    else if (a === 'prev') prev();
    else if (a === 'skip') endIntro(true);
    else if (a === 'add') add();
    else if (a === 'view') { if (typeof openProduct === 'function') openProduct(state.active); }
    else if (a === 'cart') setUi({ drawer: 'cart', menu: false, mega: false });
    else if (a === 'menu') setUi({ menu: !ui.menu, drawer: null, mega: false });
    else if (a === 'shop') { shopOpen = !shopOpen; render(ui); }
    else if (a === 'mega') setUi({ mega: !ui.mega, drawer: null });
    else if (a === 'close-mega') setUi({ mega: false });
    else if (a === 'close-drawer') setUi({ drawer: null });
    else if (a === 'checkout' && window.ODY_startCheckout) window.ODY_startCheckout();
  });

  /* ---------- Newsletter ---------- */
  var form = $('.jform'), thanks = $('.thanks');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    // TODO: connect to the mailing-list provider (Mailchimp, Klaviyo, Shopify…)
    form.hidden = true; thanks.hidden = false;
  });

  /* ---------- Drop grid: play the hover effect on touch screens ----------
     On phones there is no hover, so the scan / halftone / zoom effect plays
     when a finger lands on a card, and when a card crosses the middle of
     the screen while swiping through the shop. */
  if (!hoverCapable) {
    var fxTimers = new WeakMap();
    var playFx = function (btn) {
      if (btn.classList.contains('fx')) return;
      void btn.offsetWidth; // restart the CSS animations
      btn.classList.add('fx');
      clearTimeout(fxTimers.get(btn));
      fxTimers.set(btn, setTimeout(function () { btn.classList.remove('fx'); }, 1400));
    };
    var cardBtns = $$('.card-btn');
    cardBtns.forEach(function (btn) {
      btn.addEventListener('touchstart', function () { playFx(btn); }, { passive: true });
    });
    if ('IntersectionObserver' in window) {
      var fxIo = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) playFx(en.target); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      cardBtns.forEach(function (btn) { fxIo.observe(btn); });
    }
  }

  /* ---------- Scroll reveal ---------- */
  var rv = $$('[data-rv]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Boot ---------- */
  var rsT;
  window.addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(function () { measure(); onScroll(); }, 140); });
  window.addEventListener('scroll', onScroll, { passive: true });
  measure(true);
  requestAnimationFrame(tick);
  setTimeout(onScroll, 120);
})();
