/* ═══════════════════════════════════════════════════════════
   site.js | Comportements partages du portfolio
   Vanilla, sans dependance. Chaque bloc est autonome et se
   desactive proprement si son point d'ancrage est absent.
   - reveal au scroll + compteurs + trace des diagrammes
   - barre de progression de lecture + chapitre actif (sommaire)
   - carte du systeme interactive (clavier + souris)
   - selecteur de profondeur de lecture (synthese / complet)
   - panneau d'etat de dossier qui avance au scroll
   - navigation mobile
   - bascule de langue FR / EN
   Respecte prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isEN = (document.documentElement.lang || 'fr').slice(0, 2) === 'en';
  var locale = isEN ? 'en-US' : 'fr-FR';

  /* ── Compteurs ─────────────────────────────── */
  function fmt(v, dec, group) {
    if (group) return Math.round(v).toLocaleString(locale);
    var s = v.toFixed(dec);
    return isEN ? s : s.replace('.', ',');
  }
  function count(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var target = parseFloat(el.dataset.target);
    var dec = parseInt(el.dataset.decimals || '0', 10);
    var group = el.dataset.group === '1';
    if (reduce || isNaN(target)) { el.textContent = fmt(target, dec, group); return; }
    var dur = 1300, t0 = performance.now();
    (function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * e, dec, group);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ── Reveal + trace des diagrammes ─────────── */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      e.target.querySelectorAll('.count').forEach(count);
      e.target.querySelectorAll('.draw').forEach(function (p) {
        try { var L = p.getTotalLength(); p.style.setProperty('--len', L); } catch (err) {}
        p.classList.add('in');
      });
      io.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal, .count, .draw').forEach(function (el) {
    // un .count isole (hors .reveal) est observe individuellement
    if (el.classList.contains('reveal')) io.observe(el);
    else if (!el.closest('.reveal')) io.observe(el);
  });

  /* ── Barre de progression de lecture ───────── */
  var readbar = document.querySelector('.readbar');
  if (readbar) {
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      readbar.style.width = (p * 100).toFixed(2) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Sommaire : chapitre actif ─────────────── */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  if (tocLinks.length) {
    var chapters = tocLinks.map(function (a) {
      return document.querySelector(a.getAttribute('href'));
    }).filter(Boolean);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        tocLinks.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    chapters.forEach(function (c) { spy.observe(c); });
  }

  /* ── Selecteur de profondeur de lecture ────── */
  var depth = document.querySelector('.depth');
  if (depth) {
    var buttons = depth.querySelectorAll('button');
    var apply = function (mode) {
      document.body.dataset.depth = mode;
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
      });
    };
    buttons.forEach(function (b) {
      b.addEventListener('click', function () { apply(b.dataset.mode); });
    });
    apply(depth.dataset.default || 'full');
  }

  /* ── Carte du systeme interactive ──────────── */
  var map = document.querySelector('.systemmap');
  if (map) {
    var nodes = map.querySelectorAll('.sm-node');
    var edges = map.querySelectorAll('.sm-edge');
    var panelNode = map.querySelector('.pnode');
    var panelTitle = map.querySelector('.panel h3');
    var panelDesc = map.querySelector('.panel p');
    var panelLink = map.querySelector('.panel .plink');

    var activate = function (node) {
      var key = node.dataset.node;
      nodes.forEach(function (n) { n.classList.toggle('active', n === node); });
      edges.forEach(function (e) {
        var linked = (e.dataset.link || '').split(' ').indexOf(key) !== -1;
        e.classList.toggle('lit', linked);
      });
      if (panelNode) panelNode.textContent = node.dataset.node;
      if (panelTitle) panelTitle.textContent = node.dataset.title || '';
      if (panelDesc) panelDesc.textContent = node.dataset.desc || '';
      if (panelLink && node.dataset.href) {
        panelLink.textContent = node.dataset.cta || (isEN ? 'Open case →' : 'Ouvrir le dossier →');
        panelLink.setAttribute('href', node.dataset.href);
        panelLink.style.display = '';
      } else if (panelLink) {
        panelLink.style.display = 'none';
      }
    };
    nodes.forEach(function (node) {
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.addEventListener('mouseenter', function () { activate(node); });
      node.addEventListener('focus', function () { activate(node); });
      node.addEventListener('click', function () {
        if (node.dataset.href) location.href = node.dataset.href;
      });
      node.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          if (node.dataset.href) location.href = node.dataset.href;
        }
      });
    });
    // etat initial : premier noeud
    if (nodes.length) activate(nodes[0]);

    // Boot de la carte : les aretes se tracent, les noeuds apparaissent
    // en cascade quand la carte entre dans le champ. Sans JS ou en
    // reduced-motion, tout reste visible d'emblee.
    if (!reduce) nodes.forEach(function (n) { n.style.opacity = '0'; });
    var booted = false;
    function bootMap() {
      if (booted) return; booted = true;
      if (reduce) { nodes.forEach(function (n) { n.style.opacity = '1'; }); return; }
      edges.forEach(function (e) {
        var L; try { L = e.getTotalLength(); } catch (x) { L = 260; }
        e.style.strokeDasharray = L; e.style.strokeDashoffset = L;
        e.style.transition = 'stroke-dashoffset .7s var(--ease)';
      });
      nodes.forEach(function (n) { n.style.transition = 'opacity .45s var(--ease)'; });
      void map.offsetWidth; // reflow
      edges.forEach(function (e, i) { e.style.transitionDelay = (i * 0.05) + 's'; e.style.strokeDashoffset = '0'; });
      nodes.forEach(function (n, i) { n.style.transitionDelay = (0.28 + i * 0.07) + 's'; n.style.opacity = '1'; });
    }
    var bootIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { bootMap(); bootIO.disconnect(); } });
    }, { threshold: 0.25 });
    bootIO.observe(map);
  }

  /* ── Panneau d'etat de dossier (au scroll) ─── */
  var panel = document.querySelector('.statuspanel');
  if (panel) {
    var spStatus = panel.querySelector('.sp-status');
    var spN = panel.querySelector('.sp-metric .n');
    var spNumUnit = spN ? spN.querySelector('.u') : null;
    var spL = panel.querySelector('.sp-metric .l');
    var track = panel.querySelectorAll('.sp-track i');
    var steps = document.querySelectorAll('.inv-step[data-status]');
    var total = steps.length;

    var setStep = function (idx) {
      var s = steps[idx];
      if (!s) return;
      if (spStatus) spStatus.textContent = s.dataset.status;
      if (spN) {
        var num = s.dataset.metric || '';
        var unit = s.dataset.unit || '';
        spN.textContent = num;
        if (unit) { var u = document.createElement('span'); u.className = 'u'; u.textContent = ' ' + unit; spN.appendChild(u); }
      }
      if (spL) spL.textContent = s.dataset.metricLabel || '';
      track.forEach(function (t, i) { t.classList.toggle('on', i <= idx); });
    };
    var stepSpy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var idx = Array.prototype.indexOf.call(steps, e.target);
        if (idx !== -1) setStep(idx);
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    steps.forEach(function (s) { stepSpy.observe(s); });
    if (total) setStep(0);
  }

  /* ── Navigation mobile ─────────────────────── */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ── Langue FR / EN ────────────────────────── */
  var lang = document.querySelector('.lang-toggle');
  if (lang) {
    lang.addEventListener('click', function () {
      try { localStorage.setItem('lang', lang.dataset.lang); } catch (e) {}
    });
  }
  try {
    var pageLang = (document.documentElement.lang || 'fr').slice(0, 2);
    var stored = localStorage.getItem('lang');
    if (!stored) {
      stored = (navigator.language || 'fr').slice(0, 2) === 'en' ? 'en' : 'fr';
      localStorage.setItem('lang', stored);
    }
    if (document.body.hasAttribute('data-lang-root') && stored !== pageLang && lang) {
      location.replace(lang.getAttribute('href'));
    }
  } catch (e) {}
})();
