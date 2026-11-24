(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Theme ---------- */
  var root = document.documentElement;
  var themeBtn = $("#theme-toggle");
  function currentTheme() {
    return root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function syncThemeBtn() {
    if (!themeBtn) return;
    var dark = currentTheme() === "dark";
    themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    themeBtn.setAttribute("aria-pressed", String(dark));
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      syncThemeBtn();
    });
    syncThemeBtn();
  }

  /* ---------- Mobile menu ---------- */
  var menuBtn = $("#menu-toggle"), links = $("#nav-links");
  if (menuBtn && links) {
    menuBtn.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    $$("a", links).forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Email (assembled here so it isn't sitting in the HTML for scrapers) ---------- */
  var user = "dr.swarnendu.ghosh", host = "gmail.com";
  $$("[data-email]").forEach(function (el) {
    var addr = user + "@" + host;
    el.setAttribute("href", "mailto:" + addr);
    var slot = $("[data-email-text]", el);
    if (slot) slot.textContent = addr;
  });

  /* ---------- Publications ---------- */
  var pubs = (window.PUBLICATIONS || []).slice();
  var types = window.PUB_TYPES || [];
  var list = $("#pub-list"), chipsEl = $("#pub-chips"), q = $("#pub-search"), count = $("#pub-count");
  var state = { type: "all", text: "" };

  var TYPE_LABEL = { journal: "Journal", conference: "Conference", workshop: "Workshop", book: "Book", chapter: "Chapter", patent: "Patent", talk: "Talk" };
  var GROUP = { all: null, journal: ["journal"], conference: ["conference"], workshop: ["workshop"], book: ["book", "chapter"], patent: ["patent", "talk"] };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function authorsHtml(a) { return esc(a).replace(/Swarnendu Ghosh/g, "<mark>Swarnendu Ghosh</mark>"); }

  /* Citation data comes from data/citations.json, refreshed daily by a GitHub Action. Optional: no file, no panel. */
  var cites = {};
  var normTitle = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ""); };
  function citesFor(p) {
    var k = normTitle(p.title);
    if (cites[k] !== undefined) return cites[k];
    if (k.length < 25) return undefined;                       // too short to match loosely
    var head = k.slice(0, 40);
    for (var key in cites) { if (key.indexOf(head) === 0 || k.indexOf(key.slice(0, 40)) === 0) return cites[key]; }
    return undefined;
  }
  function loadCitations() {
    fetch("data/citations.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        if (!d || typeof d.total !== "number") return;
        cites = d.papers || {};
        var fmt = function (n) { return n == null ? "–" : Number(n).toLocaleString("en"); };
        $("#cite-total").textContent = fmt(d.total);
        $("#cite-h").textContent = fmt(d.h_index);
        $("#cite-i10").textContent = fmt(d.i10_index);
        var t = $("#cite-updated");
        if (d.updated) { t.setAttribute("datetime", d.updated); t.textContent = new Date(d.updated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
        var g = (d.graph || []).slice(-10), max = Math.max.apply(null, g.map(function (x) { return x.citations; }).concat(1));
        var chart = $("#cite-chart");
        chart.innerHTML = g.map(function (x) {
          return '<div class="cite-bar" title="' + x.year + ": " + x.citations + ' citations"><i style="height:' + Math.max(3, Math.round(x.citations / max * 100)) + '%"></i><span>' + String(x.year).slice(-2) + "</span></div>";
        }).join("");
        chart.setAttribute("aria-label", "Citations per year, " + g.map(function (x) { return x.year + ": " + x.citations; }).join(", "));
        $("#cite-panel").hidden = false;
        render();
      })
      .catch(function () { /* no data yet: leave the panel hidden */ });
  }

  function matches(p) {
    var g = GROUP[state.type];
    if (g && g.indexOf(p.type) === -1) return false;
    if (!state.text) return true;
    var hay = (p.title + " " + p.authors + " " + p.venue + " " + p.year + " " + (p.detail || "")).toLowerCase();
    return state.text.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  function render() {
    if (!list) return;
    var shown = pubs.filter(matches);
    count.textContent = shown.length + (shown.length === 1 ? " item" : " items");
    if (!shown.length) {
      list.innerHTML = '<div class="empty">Nothing matches that search. Try fewer words or a different filter.</div>';
      return;
    }
    var years = [];
    shown.forEach(function (p) { if (years.indexOf(p.year) === -1) years.push(p.year); });
    years.sort(function (a, b) { return b - a; });
    list.innerHTML = years.map(function (y) {
      var items = shown.filter(function (p) { return p.year === y; }).map(function (p) {
        var c = citesFor(p);
        return '<li class="pub">' +
          '<div class="t"><span class="badge">' + esc(TYPE_LABEL[p.type] || p.type) + "</span>" + esc(p.title) + "</div>" +
          '<div class="a">' + authorsHtml(p.authors) + "</div>" +
          '<div class="v">' + esc(p.venue) + (p.detail ? ' <span>· ' + esc(p.detail) + "</span>" : "") +
          (c ? ' <span class="cites">Cited by ' + c + "</span>" : "") + "</div>" +
          "</li>";
      }).join("");
      return '<div class="year-group"><div class="year">' + y + '</div><ul class="pubs">' + items + "</ul></div>";
    }).join("");
  }

  if (chipsEl) {
    chipsEl.innerHTML = types.map(function (t) {
      return '<button class="chip" type="button" data-type="' + t.key + '" aria-pressed="' + (t.key === "all") + '">' + esc(t.label) + "</button>";
    }).join("");
    chipsEl.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      state.type = b.getAttribute("data-type");
      $$(".chip", chipsEl).forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      render();
    });
  }
  if (q) q.addEventListener("input", function () { state.text = q.value.trim(); render(); });
  render();
  loadCitations();

  /* ---------- Stats (computed from the data so they never go stale) ---------- */
  function setStat(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  var n = function (types) { return pubs.filter(function (p) { return types.indexOf(p.type) !== -1; }).length; };
  setStat("stat-papers", n(["journal", "conference", "workshop"]));
  setStat("stat-journals", n(["journal"]));
  setStat("stat-book", n(["book", "chapter"]));

  /* ---------- Active nav link ---------- */
  var sections = $$("main section[id]");
  var navLinks = $$("#nav-links a");
  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) {
            a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + en.target.id));
          });
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  var rev = $$(".reveal");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.08 });
    rev.forEach(function (el) { io.observe(el); });
  } else {
    rev.forEach(function (el) { el.classList.add("in"); });
  }

  var yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
})();
