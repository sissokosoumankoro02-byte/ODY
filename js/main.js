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

  function applyLayout() {
    var s = state;
    var k = Math.min(1, Math.max(0.42, s.vw / 1320), s.pin ? Math.max(0.5, (s.vh - 300) / 640) : 1);
    hero.style.height = (s.pin ? s.vh : 900) + 'px';
    // The rack is one screen tall: pieces move with the arrows, not with the page scroll
    rack.style.height = (s.pin ? s.vh : 1000) + 'px';
    pinEl.style.height = (s.pin ? s.vh : 1000) + 'px';
    stage.style.height = Math.round(640 * k) + 'px';
    stageIn.style.transform = 'scale(' + k.toFixed(3) + ')';
    root.classList.toggle('pin', s.pin);
    if (hint) hint.textContent = 'USE THE ARROWS — CLICK A PIECE';
  }
  function measure() {
    state.vh = window.innerHeight || 900;
    state.vw = window.innerWidth || 1440;
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
      var G = 78, S = 250;
      for (var j = 0; j < hangs.length; j++) {
        var d = j - p, cd = Math.max(-1, Math.min(1, d)), ad = Math.abs(d);
        var x = d * G + cd * S;
        var sc = 1 - Math.min(ad, 1) * 0.1;
        var br = 1 - Math.min(ad, 1) * 0.14 - Math.min(ad / 10, 0.22);
        var el = hangs[j];
        el.style.transform = 'translateX(' + x.toFixed(1) + 'px) translateX(-50%) rotateY(' + (cd * 72).toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
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

  // Keyboard: left / right arrows browse the rack while it is on screen
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var r = rack.getBoundingClientRect(), vh = window.innerHeight || 900;
    if (r.top > vh * 0.5 || r.bottom < vh * 0.5) return;
    e.preventDefault();
    if (e.key === 'ArrowRight') next(); else prev();
  });

  /* ---------- Cart (front-end only for now) ---------- */
  var cartBtn = $('.cart'), cartCount = $('[data-cart-count]'), addBtn = $('.add'), addLabel = addBtn ? addBtn.querySelector('span') : null, addT;
  function add() {
    state.cart += 1;
    cartCount.textContent = String(state.cart);
    cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump');
    addBtn.classList.add('done');
    addLabel.textContent = 'ADDED — SIZE ' + state.size;
    clearTimeout(addT);
    addT = setTimeout(function () {
      addBtn.classList.remove('done'); addLabel.textContent = 'ADD TO CART'; cartBtn.classList.remove('bump');
    }, 1600);
  }

  /* ---------- Delegated clicks ---------- */
  var sizeBtns = $$('[data-size]'), chips = $$('[data-filter]'), cards = $$('.card[data-cat]');
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-pick],[data-open],[data-size],[data-filter],[data-action]');
    if (!t) return;
    if (t.hasAttribute('data-pick')) return goTo(Number(t.getAttribute('data-pick')));
    if (t.hasAttribute('data-open')) return openFromGrid(Number(t.getAttribute('data-open')));
    if (t.hasAttribute('data-size')) {
      state.size = t.getAttribute('data-size');
      sizeBtns.forEach(function (b) { b.classList.toggle('on', b === t); });
      return;
    }
    if (t.hasAttribute('data-filter')) {
      var f = t.getAttribute('data-filter');
      chips.forEach(function (b) { b.classList.toggle('on', b === t); });
      cards.forEach(function (c) { c.classList.toggle('off', !(f === 'all' || c.getAttribute('data-cat') === f)); });
      return;
    }
    var a = t.getAttribute('data-action');
    if (a === 'next') next();
    else if (a === 'prev') prev();
    else if (a === 'skip') endIntro(true);
    else if (a === 'add') add();
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
  measure();
  requestAnimationFrame(tick);
  setTimeout(onScroll, 120);
})();
