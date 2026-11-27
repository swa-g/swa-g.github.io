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

  /* ---------- Submenus (desktop: hover, focus or click; inside the mobile panel they are always expanded) ---------- */
  var groups = $$(".nav-group", links || document);
  function closeGroups(except) {
    groups.forEach(function (g) { if (g !== except) { g.classList.remove("open"); $(".nav-btn", g).setAttribute("aria-expanded", "false"); } });
  }
  groups.forEach(function (g) {
    var b = $(".nav-btn", g);
    b.addEventListener("click", function () {
      var open = !g.classList.contains("open");
      closeGroups(g); g.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open));
    });
    g.addEventListener("mouseenter", function () { b.setAttribute("aria-expanded", "true"); });
    g.addEventListener("mouseleave", function () { b.setAttribute("aria-expanded", String(g.classList.contains("open"))); });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest || !e.target.closest(".nav-group")) closeGroups(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeGroups(); });

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
  var state = { type: "all", text: "", sort: "cites" };   // default: most cited first

  var TYPE_LABEL = { journal: "Journal", conference: "Conference", workshop: "Workshop", book: "Book", chapter: "Chapter", patent: "Patent", talk: "Talk", preprint: "Preprint", other: "Other" };
  var GROUP = { all: null, journal: ["journal"], conference: ["conference"], workshop: ["workshop"], book: ["book", "chapter"], patent: ["patent", "talk", "preprint", "other"] };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function authorsHtml(a) { return esc(a).replace(/Swarnendu Ghosh|\bS Ghosh\b/g, function (m) { return "<mark>" + m + "</mark>"; }); }

  /* Citation data comes from data/citations.json, refreshed daily by a GitHub Action. Optional: no file, no panel. */
  var cites = {};
  var normTitle = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ""); };
  function citesFor(p) {
    var k = normTitle(p.scholarTitle || p.title);
    if (cites[k] !== undefined) return cites[k];
    if (k.length < 25) return undefined;                       // too short to match loosely
    var head = k.slice(0, 40);
    for (var key in cites) { if (key.indexOf(head) === 0 || k.indexOf(key.slice(0, 40)) === 0) return cites[key]; }
    return undefined;
  }

  /* Papers that appear on the Google Scholar profile but not in assets/data.js are added automatically
     (data/citations.json -> articles, refreshed daily). The curated list always wins when a title matches. */
  function guessType(venue) {
    if (/arxiv|preprint|ssrn|biorxiv|medrxiv/i.test(venue)) return "preprint";
    if (/conference|proceedings|symposium|workshop|congress|\bconf\b|ICDAR|CVPR|ICCV|ECCV|NeurIPS|ICML|AAAI|IJCAI|\bACL\b/i.test(venue)) return "conference";
    if (/journal|transactions|letters|review|survey|magazine|\baccess\b|bulletin/i.test(venue)) return "journal";
    return "other";
  }
  function addScholarArticles(arts) {
    if (!Array.isArray(arts)) return;
    var have = pubs.map(function (p) { return normTitle(p.scholarTitle || p.title); });
    arts.forEach(function (a) {
      if (!a || !a.title) return;
      var k = normTitle(a.title);
      var dup = have.some(function (h) { return h === k || (h.length >= 25 && k.length >= 25 && h.slice(0, 40) === k.slice(0, 40)); });
      if (dup) return;
      var venue = String(a.publication || "");
      var year = parseInt(a.year, 10) || 0;
      if (!year) { var m = venue.match(/\b(?:19|20)\d{2}\b/g); if (m) year = parseInt(m[m.length - 1], 10); }
      var authors = String(a.authors || "");
      if (/(\.\.\.|…)\s*$/.test(authors)) authors = authors.replace(/\s*(\.\.\.|…)\s*$/, "") + ", et al.";
      var link = /^https:\/\/scholar\.google\.[a-z.]+\//.test(a.link || "") ? a.link : "";
      pubs.push({ year: year, type: guessType(venue), title: String(a.title), authors: authors, venue: venue, detail: "", auto: true, link: link });
      have.push(k);
    });
  }
  function loadCitations() {
    fetch("data/citations.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        if (!d || typeof d.total !== "number") return;
        cites = d.papers || {};
        addScholarArticles(d.articles);
        var fmt = function (n) { return n == null ? "–" : Number(n).toLocaleString("en"); };
        $("#cite-total").textContent = fmt(d.total);
        setStat("stat-cites", fmt(d.total));
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
        updateStats();
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


  /* Addresses on this site open in the same tab; everything else in a new one */
  function linkAttrs(href) { return /^(https?:)?\/\//.test(href) ? ' target="_blank" rel="noopener"' : ""; }

  /* Publications that belong to the current project (tag a paper in data.js with project: "lancer") */
  function renderLancer() {
    var ul = $("#lancer-pubs");
    if (!ul) return;
    var items = pubs.filter(function (p) { return p.project === "lancer"; }).sort(function (a, b) { return b.year - a.year; });
    if (!items.length) { var box = $(".proj-papers"); if (box) box.hidden = true; return; }
    ul.innerHTML = items.map(function (p) {
      var href = p.url || p.link;
      var title = href ? '<a href="' + esc(href) + '"' + linkAttrs(href) + ">" + esc(p.title) + "</a>" : esc(p.title);
      return "<li>" + title + '<div class="m">' + authorsHtml(p.authors) + " · " + esc(p.venue) + " · " + p.year + "</div></li>";
    }).join("");
  }

  /* "Request full PDF": an email draft to me that names the paper. Assembled here so the address is not in the HTML. */
  function reqHref(p) {
    var plain = function (x) { return String(x || "").replace(/\s+/g, " ").trim(); };
    var link = p.url || p.link || "";
    var lines = ["Dear Dr. Ghosh,", "", "I would like to request a copy of the full text (PDF) of this publication:", "",
      "Title: " + plain(p.title),
      "Authors: " + plain(p.authors),
      "Type: " + (TYPE_LABEL[p.type] || p.type) + ", " + (p.year || "n.d."),
      "Published in: " + plain(p.venue) + (p.detail ? " (" + plain(p.detail) + ")" : "")];
    if (link) lines.push("Link: " + link);
    lines.push("", "My name and affiliation:", "What I need it for (optional):", "", "Thank you,");
    return "mailto:" + user + "@" + host + "?subject=" + encodeURIComponent("Request for full PDF: " + plain(p.title)) +
      "&body=" + encodeURIComponent(lines.join("\r\n"));
  }

  /* One publication's text block. Inline "Cited by" is only used in the by-date view (the by-citations view has its own right-hand column). */
  function pubMain(p, inlineCites) {
    var c = citesFor(p), href = p.url || p.link;
    return '<div class="t"><span class="badge">' + esc(TYPE_LABEL[p.type] || p.type) + "</span>" +
        (p.auto ? '<span class="badge auto" title="Added automatically from my Google Scholar profile">Scholar</span>' : "") +
        (href ? '<a class="tlink" href="' + esc(href) + '"' + linkAttrs(href) + ">" + esc(p.title) + "</a>" : esc(p.title)) + "</div>" +
      '<div class="a">' + authorsHtml(p.authors) + "</div>" +
      '<div class="v">' + esc(p.venue) + (p.detail ? ' <span>· ' + esc(p.detail) + "</span>" : "") +
        (inlineCites && c ? ' <span class="cites">Cited by ' + c + "</span>" : "") + "</div>" +
      '<div class="req-row">' + (p.pdf
        ? '<a class="reqpdf" href="' + esc(p.pdf) + '" title="Opens the PDF of this paper">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>' +
          "Open PDF</a>"
        : '<a class="reqpdf" href="' + esc(reqHref(p)) + '" title="Opens an email draft to me asking for the PDF of this paper">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>' +
          "Request full PDF</a>") +
        (p.blog ? '<a class="reqpdf readblog" href="' + esc(p.blog) + '" title="A short plain-language article about this paper">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 8h6M8 12h6"/></svg>' +
          "Read the story</a>" : "") + "</div>";
  }

  function render() {
    if (!list) return;
    var shown = pubs.filter(matches);
    count.textContent = shown.length + (shown.length === 1 ? " item" : " items");
    if (!shown.length) {
      list.innerHTML = '<div class="empty">Nothing matches that search. Try fewer words or a different filter.</div>';
      return;
    }

    if (state.sort === "cites") {
      /* Most cited first. Ties: newer first, then title. Year and citation count sit on the right of each paper. */
      var loaded = Object.keys(cites).length > 0;
      var ranked = shown.slice().sort(function (a, b) {
        return (citesFor(b) || 0) - (citesFor(a) || 0) || (b.year - a.year) || (a.title < b.title ? -1 : 1);
      });
      list.innerHTML = '<ul class="pubs flat">' + ranked.map(function (p) {
        var c = citesFor(p) || 0;
        var citeTxt = loaded ? '<span class="cites' + (c ? "" : " zero") + '">' + c + (c === 1 ? " citation" : " citations") + "</span>" : "";
        return '<li class="pub row"><div class="pub-main">' + pubMain(p, false) + '</div>' +
          '<div class="pub-side"><span class="py">' + (p.year || "n.d.") + "</span>" + citeTxt + "</div></li>";
      }).join("") + "</ul>";
      return;
    }

    /* Sort by date: grouped by year, newest first */
    var years = [];
    shown.forEach(function (p) { if (years.indexOf(p.year) === -1) years.push(p.year); });
    years.sort(function (a, b) { return b - a; });
    list.innerHTML = years.map(function (y) {
      var items = shown.filter(function (p) { return p.year === y; }).map(function (p) {
        return '<li class="pub">' + pubMain(p, true) + "</li>";
      }).join("");
      return '<div class="year-group"><div class="year">' + (y || "Undated") + '</div><ul class="pubs">' + items + "</ul></div>";
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
  var sortEl = $("#pub-sort");
  if (sortEl) sortEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-sort]");
    if (!b) return;
    state.sort = b.getAttribute("data-sort");
    $$("[data-sort]", sortEl).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    render();
  });
  if (q) q.addEventListener("input", function () { state.text = q.value.trim(); render(); });
  render();
  renderLancer();
  loadCitations();

  /* ---------- People I have worked with: photo, name, current affiliation, grouped and ordered by relationship ---------- */
  function buildPeople() {
    var root = $("#people-root"), P = window.PEOPLE;
    if (!root || !P) return;
    var nk = function (s) { return String(s).replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase(); };
    var initials = function (n) { var t = String(n).trim().split(/\s+/); return (t[0][0] + (t.length > 1 ? t[t.length - 1][0] : "")).toUpperCase(); };
    var surname = function (n) { return String(n).trim().split(/\s+/).pop().toLowerCase(); };

    var canon = {}, info = {};                          // alias -> key ; key -> person record
    (P.people || []).forEach(function (p) {
      var key = "p:" + nk(p.name); info[key] = p;
      (p.aliases || []).concat([p.name]).forEach(function (a) { canon[nk(a)] = key; });
    });

    /* Everyone who appears in an author list, merged by alias (hidden people are skipped entirely) */
    var names = {};
    pubs.forEach(function (p) {
      p.authors.split(",").forEach(function (a) {
        var raw = a.trim();
        if (!raw || nk(raw) === "swarnendu ghosh") return;
        var key = canon[nk(raw)] || "r:" + nk(raw);
        if (info[key] && info[key].hide) return;
        if (!names[key]) names[key] = info[key] ? info[key].name : raw;
      });
    });

    var affHtml = function (o) {
      if (!o) return "";
      if (typeof o === "string") return '<p class="aff"><span class="pos">' + esc(o) + "</span></p>";
      var inst = [o.name ? o.name + (o.abbr ? " (" + o.abbr + ")" : "") : "", o.city, o.country].filter(Boolean).join(", ");
      return '<p class="aff">' + (o.pos ? '<span class="pos">' + esc(o.pos) + "</span>" : "") +
        (inst ? '<span class="inst">' + esc(inst) + "</span>" : "") + "</p>";
    };
    var affPlain = function (o) {
      if (!o) return "";
      if (typeof o === "string") return o;
      return [o.pos, [o.name ? o.name + (o.abbr ? " (" + o.abbr + ")" : "") : "", o.city, o.country].filter(Boolean).join(", ")].filter(Boolean).join(", ");
    };
    var card = function (p) {
      var face = p.photo
        ? '<img class="avatar photo" src="' + esc(p.photo) + '" alt="Photo of ' + esc(p.name) + '" width="84" height="84" loading="lazy" data-initials="' + esc(initials(p.name)) + '">'
        : '<div class="avatar" aria-hidden="true">' + esc(initials(p.name)) + "</div>";
      var o = p.org && typeof p.org === "object" ? p.org : null;
      var logo = (o && /^assets\/logos\/[a-z0-9-]+\.png$/.test(o.logo || ""))
        ? '<img class="org-logo" src="' + esc(o.logo) + '" alt="' + esc(o.name || "Organisation") + ' logo" loading="lazy" width="116" height="46">'
        : (o && (o.abbr || o.name) ? '<span class="org-text">' + esc(o.abbr || o.name) + "</span>" : "");
      var body = '<div class="p-face">' + face + "</div><h4>" + esc(p.name) + "</h4>" + logo +
        '<div class="p-more"><div class="p-more-in">' + affHtml(p.org) + "</div></div>";
      // Only genuine LinkedIn profile addresses become links (anything else in the data is ignored)
      var ok = typeof p.linkedin === "string" && /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|pub)\/[A-Za-z0-9%_.\/-]+$/.test(p.linkedin);
      var tile = !ok
        ? '<div class="person" tabindex="0" role="group" aria-label="' + esc(p.name + (affPlain(p.org) ? ": " + affPlain(p.org) : "")) + '">' + body + "</div>"
        : '<a class="person has-link" href="' + esc(p.linkedin) + '" target="_blank" rel="noopener noreferrer" aria-label="' +
          esc(p.name + (affPlain(p.org) ? ", " + affPlain(p.org) : "")) + ' (LinkedIn profile, opens in a new tab)">' + body + '<span class="li-badge" aria-hidden="true">in</span></a>';
      return '<div class="pcell">' + tile + "</div>";
    };

    var html = "", placed = {};
    (P.groups || []).forEach(function (g) {
      var list = Object.keys(info).map(function (k) { return info[k]; })
        .filter(function (p) { return !p.hide && g.rels.indexOf(p.rel) !== -1; })
        .sort(function (a, b) {
          return (g.rels.indexOf(a.rel) - g.rels.indexOf(b.rel)) || (surname(a.name) < surname(b.name) ? -1 : surname(a.name) > surname(b.name) ? 1 : 0);
        });
      list.forEach(function (p) { placed["p:" + nk(p.name)] = 1; });
      if (!list.length) return;
      html += '<div class="people-group"><h3>' + esc(g.title) + '</h3><div class="people-grid">' + list.map(card).join("") + "</div></div>";
    });

    root.innerHTML = '<p class="people-summary">Everyone here is a co-author on at least one of my publications.</p>' + html;

    /* A logo that fails to load is simply dropped */
    $$("img.org-logo", root).forEach(function (img) { img.addEventListener("error", function () { img.remove(); }, { once: true }); });

    /* If a photo file is missing or broken, fall back to the initials */
    $$("img.photo", root).forEach(function (img) {
      img.addEventListener("error", function () {
        var d = document.createElement("div");
        d.className = "avatar"; d.setAttribute("aria-hidden", "true"); d.textContent = img.getAttribute("data-initials");
        img.replaceWith(d);
      }, { once: true });
    });
  }
  buildPeople();

  /* A testimonial photo is a small JPEG sent as a data URL; anything else is ignored */
  var PHOTO_OK = /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]{20,40000}$/;

  /* ---------- Testimonials: slider ---------- */
  (function testimonials() {
    var track = $("#slides"), ui = $("#slider-ui");
    if (!track) return;
    var cfg = window.TESTIMONIAL_CONFIG || {};
    var local = (window.TESTIMONIALS || []).filter(function (t) { return t && t.quote && t.name; });
    var demo = /[?&]demo\b/.test(location.search);
    var showPending = function (n) { var el = $("#pending-note"); if (el) el.hidden = !(n > 0); };
    if (cfg.endpoint && !demo) {
      fetch(cfg.endpoint + (cfg.endpoint.indexOf("?") > -1 ? "&" : "?") + "action=list", { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var v = ((d && d.verified) || []).filter(function (t) { return t && t.quote && t.name; });
          build(local.concat(v), Number(d && d.pending) || 0);
        })
        .catch(function () { build(local, 0); });
    } else {
      build(local, /[?&]pending\b/.test(location.search) ? 1 : 0);   // ?demo&pending previews the asterisk
    }

    function build(items, pending) {
    showPending(pending);
    if (!items.length && demo) {
      var sample = "This is a sample card to preview the layout. It is not a real testimonial.";
      items = [
        { quote: sample + " Real ones appear here after you approve them.", name: "Sample Person", role: "Student", sample: true },
        { quote: sample + " Long quotes wrap neatly and the card keeps its height.", name: "Another Sample", role: "Colleague", org: "Some Institute", sample: true },
        { quote: sample + " Swipe, use the arrows, or pick a dot below.", name: "Third Sample", role: "Co-author", sample: true }
      ];
    }
    var ini = function (n) { var t = String(n).trim().split(/\s+/); return (t[0][0] + (t.length > 1 ? t[t.length - 1][0] : "")).toUpperCase(); };

    if (!items.length) {
      track.removeAttribute("tabindex");
      track.style.display = "block";
      track.innerHTML = '<div class="slides-empty"><b>Be the first to leave a note.</b><p>If we have worked or studied together, a few honest lines would mean a lot. Use the “Write a testimonial” button to send me yours.</p></div>';
      return;
    }

    track.innerHTML = items.map(function (t, i) {
      var meta = [t.role, t.org, t.year].filter(Boolean).join(" · ");
      return '<div class="slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + " of " + items.length + '">' +
        '<figure class="quote-card">' + (t.sample ? '<span class="sample-tag">Sample</span>' : "") +
        "<blockquote>" + esc(t.quote) + "</blockquote>" +
        "<figcaption>" + (PHOTO_OK.test(t.photo || "") ? '<img class="avatar photo" alt="" src="' + t.photo + '">' : '<div class="avatar" aria-hidden="true">' + esc(ini(t.name)) + "</div>") + '<div class="who"><b>' + esc(t.name) + "</b>" +
        (meta ? "<span>" + esc(meta) + "</span>" : "") + "</div></figcaption></figure></div>";
    }).join("");

    var n = items.length, idx = 0, timer = null, userPaused = false, hoverPaused = false;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dots = $("#s-dots"), playBtn = $("#s-play");
    if (n < 2) return;                                   // one card: no controls needed
    ui.hidden = false;
    dots.innerHTML = items.map(function (_, i) {
      return '<button class="dot-btn" type="button" role="tab" aria-label="Testimonial ' + (i + 1) + '" aria-selected="' + (i === 0) + '" data-i="' + i + '"></button>';
    }).join("");

    function mark(i) {
      idx = i;
      $$(".dot-btn", dots).forEach(function (d, k) { d.setAttribute("aria-selected", String(k === i)); });
    }
    function go(i, smooth) {
      i = (i + n) % n;
      track.style.scrollBehavior = smooth === false ? "auto" : "";
      track.scrollTo({ left: i * track.clientWidth, behavior: smooth === false ? "auto" : "smooth" });
      mark(i);
    }
    var raf = 0;
    track.addEventListener("scroll", function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (i !== idx && i >= 0 && i < n) mark(i);
      });
    }, { passive: true });
    window.addEventListener("resize", function () { go(idx, false); });

    $("#s-prev").addEventListener("click", function () { go(idx - 1); });
    $("#s-next").addEventListener("click", function () { go(idx + 1); });
    dots.addEventListener("click", function (e) { var b = e.target.closest(".dot-btn"); if (b) go(Number(b.getAttribute("data-i"))); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1); }
    });

    /* Autoplay: off for reduced-motion, paused on hover/focus/touch, and with an explicit pause button */
    function tick() { if (!userPaused && !hoverPaused && !document.hidden) go(idx + 1); }
    function start() { stop(); if (!reduce && !userPaused) timer = setInterval(tick, 7000); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    var slider = $("#slider");
    ["mouseenter", "focusin", "touchstart"].forEach(function (ev) { slider.addEventListener(ev, function () { hoverPaused = true; }, { passive: true }); });
    ["mouseleave", "focusout"].forEach(function (ev) { slider.addEventListener(ev, function () { hoverPaused = false; }); });
    function syncPlay() {
      playBtn.setAttribute("aria-pressed", String(userPaused));
      playBtn.setAttribute("aria-label", userPaused ? "Resume automatic sliding" : "Pause automatic sliding");
      $("#s-pause-ico").hidden = userPaused; $("#s-play-ico").hidden = !userPaused;
    }
    if (reduce) { userPaused = true; }
    syncPlay();
    playBtn.addEventListener("click", function () { userPaused = !userPaused; syncPlay(); userPaused ? stop() : start(); });
    start();
    }
  })();

  /* ---------- Testimonials: "write one" form (opens an email draft; nothing is stored on any server) ---------- */
  (function testimonialForm() {
    var form = $("#testi-form");
    if (!form) return;
    var name = $("#t-name"), rel = $("#t-rel"), org = $("#t-org"), msg = $("#t-msg"), ok = $("#t-ok");
    var count = $("#t-count"), status = $("#t-status");
    var cfg = window.TESTIMONIAL_CONFIG || {};
    if (cfg.endpoint) {
      var lede = $("#testi-lede");
      if (lede) lede.textContent = "I'd be glad to hear how it went. Write a few lines and see how they will look before you send them. Your testimonial is checked before it appears here, and you will be told straight away if it is waiting for review.";
      var sb = form.querySelector('button[type="submit"]'); if (sb) sb.textContent = "Submit testimonial";
      var cp = $("#t-copy"); if (cp) cp.hidden = true;
    }
    var say = function (text, cls) { status.textContent = text; status.className = "form-status" + (cls ? " " + cls : ""); };

    /* The form lives in a small window that shows the finished card as a preview */
    var dlg = $("#testi-dialog"), openers = $$("#open-testi, [data-open-testi]"), avatar = $("#t-avatar"), lastFocus = null;
    function initials(n) { var p = String(n).trim().split(/\s+/).filter(Boolean); return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() : "?"; }
    function openDlg() {
      if (!dlg) return;
      lastFocus = document.activeElement; say("");
      if (typeof dlg.showModal === "function") { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
      document.body.classList.add("modal-open");
      setTimeout(function () { (rel || name).focus(); }, 30);
    }
    function closeDlg() {
      if (!dlg) return;
      if (typeof dlg.close === "function") { if (dlg.open) dlg.close(); } else dlg.removeAttribute("open");
      document.body.classList.remove("modal-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    openers.forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); openDlg(); }); });
    if (dlg) {
      dlg.addEventListener("click", function (e) { if (e.target === dlg) closeDlg(); });   // click on the dimmed backdrop
      dlg.addEventListener("close", function () { document.body.classList.remove("modal-open"); });
      $("#testi-close").addEventListener("click", closeDlg);
      $("#t-cancel").addEventListener("click", closeDlg);
    }
    name.addEventListener("input", function () { if (avatar) avatar.textContent = initials(name.value); });

    /* Optional photo: cropped to a small square JPEG in the browser, so only a few KB are ever sent */
    var photoInput = $("#t-photo"), photoImg = $("#t-avatar-img"), photoClear = $("#t-photo-clear"), photoHint = $("#t-photo-hint"), photoData = "";
    function showPhoto(url) {
      photoData = url || "";
      if (photoImg) { photoImg.hidden = !url; if (url) photoImg.src = url; else photoImg.removeAttribute("src"); }
      if (avatar) avatar.hidden = !!url;
      if (photoClear) photoClear.hidden = !url;
      if (photoHint) photoHint.hidden = !!url;
    }
    function clearPhoto() { if (photoInput) photoInput.value = ""; showPhoto(""); }
    if (photoInput) {
      if (!cfg.endpoint) { var pp = $(".photo-pick"); if (pp) pp.classList.add("no-photo"); }   // a photo cannot travel in an email draft
      photoInput.addEventListener("change", function () {
        var f = photoInput.files && photoInput.files[0];
        if (!f) return;
        if (!/^image\/(png|jpe?g|webp)$/i.test(f.type) || f.size > 12 * 1024 * 1024) { say("Please choose a JPG, PNG or WebP picture under 12 MB.", "err"); clearPhoto(); return; }
        var url = URL.createObjectURL(f), img = new Image();
        img.onload = function () {
          var S = 112, cv = document.createElement("canvas"); cv.width = cv.height = S;
          var side = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
          var ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, S, S);
          ctx.drawImage(img, sx, sy, side, side, 0, 0, S, S);
          URL.revokeObjectURL(url);
          var out = cv.toDataURL("image/jpeg", 0.82);
          if (out.length > 28000) out = cv.toDataURL("image/jpeg", 0.6);
          if (!PHOTO_OK.test(out) || out.length > 28000) { say("That picture could not be used. Please try another one.", "err"); clearPhoto(); return; }
          showPhoto(out); say("");
        };
        img.onerror = function () { URL.revokeObjectURL(url); say("That file could not be read as a picture.", "err"); clearPhoto(); };
        img.src = url;
      });
      if (photoClear) photoClear.addEventListener("click", clearPhoto);
    }
    if (location.hash === "#testi-form" || location.hash === "#write-testimonial") openDlg();
    msg.addEventListener("input", function () { count.textContent = msg.value.length + " / " + msg.maxLength; });

    function valid() {
      var bad = [msg, name].filter(function (el) { return !el.value.trim(); });
      [name, msg].forEach(function (el) { el.classList.toggle("invalid", !el.value.trim()); el.setAttribute("aria-invalid", String(!el.value.trim())); });
      if (bad.length) { say("Please write your testimonial and add the name you want shown.", "err"); bad[0].focus(); return false; }
      if (!ok.checked) { say("Please tick the box to confirm you're happy for this to be shown.", "err"); ok.focus(); return false; }
      return true;
    }
    function compose() {
      var body = "Testimonial for swarnendughosh.com\n\n" +
        "Name: " + name.value.trim() + "\n" +
        (rel.value.trim() ? "Relation to Swarnendu: " + rel.value.trim() + "\n" : "") +
        (org.value.trim() ? "Institution / role: " + org.value.trim() + "\n" : "") +
        "\nTestimonial:\n" + msg.value.trim() + "\n\n" +
        "I agree to my name and these words being shown on swarnendughosh.com.";
      return { subject: "Testimonial for your website from " + name.value.trim(), body: body };
    }
    /* The submitter's private id lives only in their own browser. The server returns just the Status for that id. */
    var MINE = "testimonial_ids";
    function readMine() { try { return JSON.parse(localStorage.getItem(MINE) || "[]"); } catch (e) { return []; } }
    function writeMine(list) { try { localStorage.setItem(MINE, JSON.stringify(list.slice(-5))); } catch (e) {} }
    function rememberMine(id) { if (id) { var l = readMine(); l.push(id); writeMine(l); } }
    function checkMine() {
      var ids = readMine(), box = $("#my-status");
      if (!cfg.endpoint || !ids.length || !box) return;
      Promise.all(ids.map(function (id) {
        return fetch(cfg.endpoint + (cfg.endpoint.indexOf("?") > -1 ? "&" : "?") + "action=status&id=" + encodeURIComponent(id), { cache: "no-store" })
          .then(function (r) { return r.json(); }).then(function (d) { return { id: id, status: d && d.status }; }).catch(function () { return { id: id, status: "error" }; });
      })).then(function (res) {
        var waiting = res.filter(function (x) { return x.status === "Unverified"; }).length;
        var live = res.filter(function (x) { return x.status === "Verified"; }).length;
        var declined = res.filter(function (x) { return x.status === "Rejected"; }).length;
        var msgs = [];
        if (waiting) msgs.push("Your testimonial is pending verification. It will appear here once it has been checked.");
        if (live) msgs.push("Good news: your testimonial has been verified and is now live.");
        if (declined) msgs.push("Your testimonial was reviewed and will not be shown. Thank you for taking the time to write it.");
        if (msgs.length) { box.textContent = msgs.join(" "); box.hidden = false; }
        // keep only the ones still waiting (or temporarily unreachable); live/declined are told once
        writeMine(res.filter(function (x) { return x.status === "Unverified" || x.status === "error"; }).map(function (x) { return x.id; }));
      });
    }
    checkMine();

    function send() {
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; say("Submitting…");
      var payload = { name: name.value.trim(), relationship: rel.value.trim(), org: org.value.trim(), message: msg.value.trim(), photo: photoData, consent: true, website: ($("#t-hp") || {}).value || "" };
      fetch(cfg.endpoint, { method: "POST", body: JSON.stringify(payload) })   // plain-text body: no CORS preflight
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok) throw new Error((d && d.error) || "failed");
          var pending = d.status !== "Verified";
          if (pending) {
            say("Thank you! Your testimonial has been submitted and is pending verification. It will appear here once it has been checked. You will see a note on this page whenever you come back.", "ok");
            var pn = $("#pending-note"); if (pn) pn.hidden = false;
          } else {
            say("Thank you! Your testimonial has been verified and published. Reload the page to see it in the slider.", "ok");
          }
          rememberMine(d.id);
          form.reset(); count.textContent = "0 / " + msg.maxLength; if (avatar) avatar.textContent = "?"; clearPhoto();
          var box = $("#my-status");
          if (box) { box.textContent = pending ? "Thank you! Your testimonial is pending verification. It will appear here once it has been checked." : "Thank you! Your testimonial has been verified and published. Reload the page to see it in the slider."; box.hidden = false; }
          setTimeout(closeDlg, 2200);
        })
        .catch(function (err) {
          say(/at least 20|confirm|Too many/.test(String(err && err.message)) ? err.message : "Sorry, I couldn't submit that just now. Please try again in a little while.", "err");
        })
        .then(function () { btn.disabled = false; });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!valid()) return;
      if (cfg.endpoint) { send(); return; }
      var m = compose();
      var href = "mailto:" + user + "@" + host + "?subject=" + encodeURIComponent(m.subject) + "&body=" + encodeURIComponent(m.body);
      if (href.length > 1900) { say("That's a little long for an email link. Please use “Copy text instead” and paste it into an email.", "err"); return; }
      form.setAttribute("data-mailto", href);
      say("Your email app should open with a draft. Press send there to finish. If nothing opened, use “Copy text instead”.", "ok");
      window.location.href = href;
    });
    $("#t-copy").addEventListener("click", function () {
      if (!valid()) return;
      var text = compose().body + "\n\nSend to: " + user + "@" + host;
      var done = function () { say("Copied. Paste it into an email to " + user + "@" + host + ".", "ok"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { say("Couldn't copy automatically. Please select your text and copy it by hand.", "err"); });
      else say("Couldn't copy automatically. Please select your text and copy it by hand.", "err");
    });
  })();

  /* ---------- Stats (computed from the data so they never go stale) ---------- */
  function setStat(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function updateStats() {
    var n = function (types) { return pubs.filter(function (p) { return types.indexOf(p.type) !== -1; }).length; };
    setStat("stat-papers", n(["journal", "conference", "workshop"]));
    setStat("stat-journals", n(["journal"]));
    setStat("stat-book", n(["book", "chapter"]));
  }
  updateStats();

  var prof = window.PROFILE || {};
  if (prof.teaching && prof.teaching.length) {
    var days = prof.teaching.reduce(function (t, x) { return t + (new Date(x.to) - new Date(x.from)); }, 0) / 864e5;
    var yrs = days / 365.25, whole = Math.floor(yrs);
    setStat("stat-teach", whole + (yrs - whole >= 0.1 ? "+" : ""));
    var tb = $("#stat-teach-box");
    if (tb) tb.title = prof.teaching.map(function (x) { return x.role + ", " + x.org; }).join("\n");
  }
  if (prof.projects && prof.projects.length) {
    setStat("stat-proj", prof.projects.length);
    var pb = $("#stat-proj-box");
    if (pb) pb.title = prof.projects.map(function (x) { return x.title + " (" + x.funder + ", " + x.years + ")"; }).join("\n");
  }

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
          $$("#nav-links .nav-group").forEach(function (g) {
            $(".nav-btn", g).setAttribute("aria-current", String(!!$("a[aria-current=true]", g)));
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


/* ---------- Signature intro: remove it when it has faded; a click/tap or Escape skips it, scrolling works as usual ---------- */
(function () {
  "use strict";
  var el = document.getElementById("intro"), root = document.documentElement;
  if (!el) return;
  if (!root.classList.contains("intro")) { el.parentNode.removeChild(el); return; }
  /* start the exit timeline once the self-drawing signature has loaded (or after 1.5s regardless) */
  var pic = el.querySelector("img");
  var started = false;
  function go() {
    if (started) return; started = true;
    /* aim the zoom-out at the mark in the top bar: measure both boxes while the signature is still at scale 1 */
    var mark = document.querySelector(".nav .brand .mark"), a = mark && mark.getBoundingClientRect(), b = pic && pic.getBoundingClientRect();
    if (a && b && a.width && b.width) {
      el.style.setProperty("--s", (a.width / b.width).toFixed(4));
      el.style.setProperty("--dx", (a.left + a.width / 2 - (b.left + b.width / 2)).toFixed(1) + "px");
      el.style.setProperty("--dy", (a.top + a.height / 2 - (b.top + b.height / 2)).toFixed(1) + "px");
    }
    el.classList.add("go");
  }
  if (pic && !pic.complete) { pic.addEventListener("load", go); pic.addEventListener("error", go); setTimeout(go, 1500); } else go();
  var finished = false;
  function finish() {
    if (finished) return; finished = true;
    root.classList.remove("intro");
    if (el.parentNode) el.parentNode.removeChild(el);
  }
  function skip() { el.classList.add("skip"); setTimeout(finish, 320); }
  el.addEventListener("animationend", function (e) { if (e.animationName === "introClear" || (e.target === el && e.animationName === "introOut")) finish(); });
  /* scrolling, touch-scrolling and the arrow/space keys must keep working, so only a click/tap or Escape ends it early */
  window.addEventListener("click", skip, { once: true, passive: true });
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") skip(); }, { passive: true });
  setTimeout(finish, 10500);   /* failsafe */
})();
