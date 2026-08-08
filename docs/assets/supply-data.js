/* ═══════════════════════════════════════════════════════════
   supply-data.js — jeu de données synthétique supply chain
   retail partagé par les dashboards de la page « Dataviz ».
   6 entrepôts × 5 familles × 25 fournisseurs × 52 semaines.
   PRNG seedé : les chiffres sont identiques à chaque visite
   (et identiques entre les versions FR et EN du site).
   Expose window.SUPPLY : données brutes + agrégations.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var N_WEEKS = 52;

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rng = mulberry32(20260808);
  function rand(min, max) { return min + rng() * (max - min); }
  function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }

  /* ── Référentiels ─────────────────────────────────────── */
  var WAREHOUSES = ['Lyon', 'Lille', 'Marseille', 'Nantes', 'Rungis', 'Toulouse'];
  var FAMILIES = ['Frais', 'Épicerie', 'Surgelés', 'Boissons', 'DPH'];

  var SUPPLIER_NAMES = {
    'Frais':    ['Laiterie du Forez', 'Fromagerie Valmont', 'Primeurs de Provence', 'Volailles Grandchamp', 'Océane Marée'],
    'Épicerie': ['Moulins Riva', 'Conserverie Brassac', 'Biscuiterie Lantier', 'Torréfaction Noble', 'Riz & Grains SA'],
    'Surgelés': ['Polaris Surgelés', 'Glacière des Alpes', 'FroidSud', 'Iceberg Foods', 'Banquise & Co'],
    'Boissons': ['Sources du Vercors', 'Brasserie Ardente', 'Casteljus', 'Vignobles Réunis', 'SodaWorks'],
    'DPH':      ['Savonnerie Claire', 'HygiaPro', 'Nettix', 'Cosmética', 'PapierPlus']
  };

  var PRODUCTS = {
    'Frais':    ['Yaourt nature x8', 'Emmental râpé 200g', 'Poulet fermier PAC', 'Saumon fumé 4T', 'Beurre doux 250g', 'Salade cœur x3', 'Jambon sup. 4T', 'Crème 30cl'],
    'Épicerie': ['Pâtes penne 500g', 'Riz basmati 1kg', 'Café moulu 250g', 'Biscuits choc x16', 'Conserve tomates 400g', 'Huile olive 75cl', 'Farine T55 1kg', 'Miel fleurs 350g'],
    'Surgelés': ['Pizza margherita', 'Légumes poêlée 750g', 'Glace vanille 1L', 'Poisson pané x10', 'Frites 1kg', 'Épinards hachés 600g'],
    'Boissons': ['Eau source 6x1,5L', 'Jus orange 1L', 'Soda cola 1,5L', 'Bière blonde 6x25cl', 'Sirop grenadine 75cl', 'Thé glacé 1,5L'],
    'DPH':      ['Lessive 27 lavages', 'Papier toilette x12', 'Shampoing 250ml', 'Liquide vaisselle 500ml', 'Dentifrice x2', 'Essuie-tout x6']
  };

  // 25 fournisseurs, 5 par famille, avec un niveau de service de base
  var suppliers = [];
  FAMILIES.forEach(function (fam) {
    SUPPLIER_NAMES[fam].forEach(function (name, i) {
      suppliers.push({
        id: 'F' + String(suppliers.length + 1).padStart(2, '0'),
        name: name,
        family: fam,
        baseService: rand(89, 98.5)
      });
    });
  });
  // deux fournisseurs volontairement en dérive récente (matière à alertes)
  var DEGRADED = { 'Volailles Grandchamp': 12, 'FroidSud': 9 }; // nom → pente de chute sur les dernières semaines

  /* ── Axe temps : 52 lundis, le dernier proche d'aujourd'hui ── */
  var weeks = [];
  var end = new Date(2026, 7, 3); // lundi 3 août 2026
  for (var w = N_WEEKS - 1; w >= 0; w--) {
    weeks.push(new Date(end.getTime() - w * 7 * 86400000));
  }
  var weekLabels = weeks.map(function (d) { return d.toISOString().slice(0, 10); });

  /* ── Séries hebdo par (entrepôt × famille) ────────────── */
  // Base de valeur de stock par famille (k€ par entrepôt)
  var STOCK_BASE = { 'Frais': 620, 'Épicerie': 2100, 'Surgelés': 880, 'Boissons': 1350, 'DPH': 1050 };
  // Ventes hebdo ≈ stock / couverture cible (en semaines)
  var COVER_BASE = { 'Frais': 1.6, 'Épicerie': 6.5, 'Surgelés': 4.2, 'Boissons': 4.8, 'DPH': 5.6 };

  var weekly = []; // {week, warehouse, family, service, stock, slob, sales, stockouts}
  WAREHOUSES.forEach(function (wh) {
    FAMILIES.forEach(function (fam) {
      var svcBase = rand(92.5, 96.8);
      var stock = STOCK_BASE[fam] * rand(0.85, 1.15);
      var slobShare = rand(0.05, 0.11);
      for (var t = 0; t < N_WEEKS; t++) {
        // creux estival léger (congés fournisseurs) autour des semaines 44-48 de la série
        var summerDip = (t >= 43 && t <= 48) ? -1.4 : 0;
        // incident volontaire : le frais à Marseille décroche sur les 6 dernières semaines
        var incident = (wh === 'Marseille' && fam === 'Frais' && t >= N_WEEKS - 6) ? -(t - (N_WEEKS - 7)) * 1.1 : 0;
        var service = Math.min(99.6, Math.max(78, svcBase + summerDip + incident + rand(-1.6, 1.6)));
        stock = Math.max(200, stock * rand(0.985, 1.015));
        slobShare = Math.min(0.16, Math.max(0.03, slobShare + rand(-0.004, 0.0045)));
        var sales = stock / COVER_BASE[fam] * rand(0.9, 1.1);
        var stockouts = Math.max(0, Math.round((100 - service) * rand(0.35, 0.75)));
        weekly.push({
          week: t, warehouse: wh, family: fam,
          service: service, stock: stock, slob: stock * slobShare,
          sales: sales, stockouts: stockouts
        });
      }
    });
  });

  /* ── Séries hebdo par fournisseur ─────────────────────── */
  var supplierWeekly = []; // {week, supplierId, service, lateOrders}
  suppliers.forEach(function (s) {
    for (var t = 0; t < N_WEEKS; t++) {
      var drift = 0;
      if (DEGRADED[s.name] !== undefined) {
        var slide = DEGRADED[s.name];
        if (t >= N_WEEKS - slide) drift = -(t - (N_WEEKS - slide - 1)) * (14 / slide);
      }
      var service = Math.min(99.8, Math.max(62, s.baseService + drift + rand(-2.2, 2.2)));
      supplierWeekly.push({
        week: t, supplierId: s.id,
        service: service,
        lateOrders: Math.max(0, Math.round((100 - service) * rand(0.25, 0.6)))
      });
    }
  });

  /* ── Ruptures en cours (photo du jour) ────────────────── */
  var stockouts = [];
  for (var k = 0; k < 34; k++) {
    var fam = pick(FAMILIES);
    var famSuppliers = suppliers.filter(function (s) { return s.family === fam; });
    var sup = pick(famSuppliers);
    var daysOut = Math.max(1, Math.round(rand(1, 14) - (fam === 'Frais' ? 2 : 0)));
    var missing = Math.round(rand(40, 2400));
    var weeklySales = Math.round(rand(150, 3200));
    // criticité : durée + poids des ventes + sensibilité du frais
    var score = daysOut * 1.6 + (weeklySales / 400) + (fam === 'Frais' ? 3.5 : 0) + (missing / 600);
    var criticality = score >= 14 ? 'critique' : (score >= 9 ? 'élevée' : 'moyenne');
    stockouts.push({
      product: pick(PRODUCTS[fam]), family: fam,
      warehouse: pick(WAREHOUSES), supplier: sup.name, supplierId: sup.id,
      daysOut: daysOut, missing: missing, weeklySales: weeklySales,
      criticality: criticality, score: score
    });
  }
  // garantit quelques cas critiques liés à l'incident Marseille/frais
  stockouts.slice(0, 3).forEach(function (o, i) {
    o.family = 'Frais'; o.warehouse = 'Marseille';
    o.supplier = 'Volailles Grandchamp'; o.supplierId = suppliers.filter(function (s) { return s.name === o.supplier; })[0].id;
    o.product = PRODUCTS['Frais'][i]; o.daysOut = 5 + i * 2; o.criticality = 'critique'; o.score = 16 + i;
  });
  stockouts.sort(function (a, b) { return b.score - a.score; });

  /* ── Agrégations ──────────────────────────────────────── */

  function filterWeekly(f) {
    f = f || {};
    return weekly.filter(function (r) {
      return (!f.warehouse || r.warehouse === f.warehouse) &&
             (!f.family || r.family === f.family);
    });
  }

  // taux de service hebdo (pondéré par les ventes) sur un sous-ensemble
  function serviceByWeek(f) {
    var rows = filterWeekly(f);
    var out = [];
    for (var t = 0; t < N_WEEKS; t++) {
      var num = 0, den = 0;
      rows.forEach(function (r) { if (r.week === t) { num += r.service * r.sales; den += r.sales; } });
      out.push(den ? num / den : null);
    }
    return out;
  }

  // agrégat mensuel (12 points) à partir des semaines
  function serviceByMonth() {
    var byMonth = {};
    var svc = serviceByWeek();
    weeks.forEach(function (d, t) {
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      (byMonth[key] = byMonth[key] || []).push(svc[t]);
    });
    return Object.keys(byMonth).sort().slice(-12).map(function (key) {
      var vals = byMonth[key];
      return { month: key, service: vals.reduce(function (a, b) { return a + b; }, 0) / vals.length };
    });
  }

  function stockByFamily() {
    return FAMILIES.map(function (fam) {
      var rows = weekly.filter(function (r) { return r.family === fam && r.week === N_WEEKS - 1; });
      var stock = 0, slob = 0;
      rows.forEach(function (r) { stock += r.stock; slob += r.slob; });
      return { family: fam, stock: stock, slob: slob };
    });
  }

  function stockoutsByWarehouse(f) {
    return WAREHOUSES.map(function (wh) {
      var n = stockouts.filter(function (o) {
        return o.warehouse === wh &&
          (!f || !f.family || o.family === f.family) &&
          (!f || !f.supplierId || o.supplierId === f.supplierId);
      }).length;
      return { warehouse: wh, count: n };
    });
  }

  function supplierServiceByWeek(supplierId) {
    return supplierWeekly
      .filter(function (r) { return r.supplierId === supplierId; })
      .sort(function (a, b) { return a.week - b.week; })
      .map(function (r) { return r.service; });
  }

  function lateBySupplier(f) {
    var recent = supplierWeekly.filter(function (r) { return r.week >= N_WEEKS - 4; });
    return suppliers
      .filter(function (s) { return !f || !f.family || s.family === f.family; })
      .map(function (s) {
        var late = 0;
        recent.forEach(function (r) { if (r.supplierId === s.id) late += r.lateOrders; });
        return { supplier: s.name, supplierId: s.id, late: late };
      })
      .sort(function (a, b) { return b.late - a.late; });
  }

  // fournisseurs sous 85 % de service sur les 3 dernières semaines (alertes)
  function failingSuppliers() {
    return suppliers.filter(function (s) {
      var svc = supplierServiceByWeek(s.id).slice(-3);
      return svc.every(function (v) { return v < 85; });
    }).map(function (s) {
      var svc = supplierServiceByWeek(s.id).slice(-3);
      return { supplier: s.name, supplierId: s.id, family: s.family, avg: svc.reduce(function (a, b) { return a + b; }) / 3 };
    });
  }

  // KPIs « du mois » : 4 dernières semaines vs 4 précédentes
  function kpis() {
    function windowStats(from, to) {
      var num = 0, den = 0, stock = 0, slob = 0, sales = 0;
      weekly.forEach(function (r) {
        if (r.week >= from && r.week < to) { num += r.service * r.sales; den += r.sales; }
        if (r.week === to - 1) { stock += r.stock; slob += r.slob; sales += r.sales; }
      });
      return { service: num / den, stock: stock, slob: slob, coverage: stock / sales * 7 };
    }
    var cur = windowStats(N_WEEKS - 4, N_WEEKS);
    var prev = windowStats(N_WEEKS - 8, N_WEEKS - 4);
    var critNow = stockouts.filter(function (o) { return o.criticality === 'critique'; }).length;
    return {
      service: cur.service, dService: cur.service - prev.service,
      stock: cur.stock, dStock: (cur.stock - prev.stock) / prev.stock * 100,
      slobPct: cur.slob / cur.stock * 100,
      dSlobPct: cur.slob / cur.stock * 100 - prev.slob / prev.stock * 100,
      critical: critNow, dCritical: critNow - Math.max(0, critNow - 5),
      coverage: cur.coverage, dCoverage: cur.coverage - prev.coverage
    };
  }

  window.SUPPLY = {
    N_WEEKS: N_WEEKS,
    warehouses: WAREHOUSES, families: FAMILIES, suppliers: suppliers,
    weeks: weeks, weekLabels: weekLabels,
    weekly: weekly, supplierWeekly: supplierWeekly, stockouts: stockouts,
    serviceByWeek: serviceByWeek, serviceByMonth: serviceByMonth,
    stockByFamily: stockByFamily, stockoutsByWarehouse: stockoutsByWarehouse,
    supplierServiceByWeek: supplierServiceByWeek, lateBySupplier: lateBySupplier,
    failingSuppliers: failingSuppliers, kpis: kpis
  };
})();
