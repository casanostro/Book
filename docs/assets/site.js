/* ═══════════════════════════════════════════════════════════
   site.js — comportements partagés du portfolio
   - apparition au scroll (.reveal)
   - compteurs animés (.count, data-target / data-decimals / data-group)
   - barres de progression (.s-fill / .fill, data-width)
   Chargé avec `defer` sur toutes les pages.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // les compteurs suivent la langue de la page (fr-FR ou en-US)
  var isEN = (document.documentElement.lang || 'fr').slice(0, 2) === 'en';
  function fmtFR(v, dec, group) {
    if (group) return Math.round(v).toLocaleString(isEN ? 'en-US' : 'fr-FR');
    var s = v.toFixed(dec);
    return isEN ? s : s.replace('.', ',');
  }

  function animateCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var target = parseFloat(el.dataset.target);
    var dec = parseInt(el.dataset.decimals || '0', 10);
    var group = el.dataset.group === '1';
    if (reduceMotion) { el.textContent = fmtFR(target, dec, group); return; }
    var dur = 1400, t0 = performance.now();
    (function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmtFR(target * eased, dec, group);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      e.target.querySelectorAll('.count').forEach(animateCounter);
      e.target.querySelectorAll('.s-fill, .fill').forEach(function (el) {
        el.style.width = el.dataset.width + '%';
      });
      io.unobserve(e.target);
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  /* ── Langue FR / EN ───────────────────────────────────────
     - le toggle du header pointe vers la page miroir (href en dur,
       cohérent avec les balises hreflang) ; un clic mémorise le choix
     - au premier passage sur une des deux homepages (et uniquement là,
       pour ne jamais détourner un lien profond partagé), la langue du
       navigateur est détectée et on redirige si besoin
     - le choix mémorisé (localStorage) prime ensuite sur la détection */
  var toggle = document.querySelector('.lang-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      try { localStorage.setItem('lang', toggle.dataset.lang); } catch (e) { /* navigation privée */ }
    });
  }
  try {
    var pageLang = (document.documentElement.lang || 'fr').slice(0, 2);
    var stored = localStorage.getItem('lang');
    if (!stored) {
      stored = (navigator.language || 'fr').slice(0, 2) === 'en' ? 'en' : 'fr';
      localStorage.setItem('lang', stored);
    }
    if (document.body.hasAttribute('data-lang-root') && stored !== pageLang && toggle) {
      location.replace(toggle.getAttribute('href'));
    }
  } catch (e) { /* localStorage indisponible : pas de redirection */ }
})();
