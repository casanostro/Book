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

  function fmtFR(v, dec, group) {
    return group
      ? Math.round(v).toLocaleString('fr-FR')
      : v.toFixed(dec).replace('.', ',');
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
})();
