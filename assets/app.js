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


  /* Publications that belong to the current project (tag a paper in data.js with project: "lancer") */
  function renderLancer() {
    var ul = $("#lancer-pubs");
    if (!ul) return;
    var items = pubs.filter(function (p) { return p.project === "lancer"; }).sort(function (a, b) { return b.year - a.year; });
    if (!items.length) { var box = $(".proj-papers"); if (box) box.hidden = true; return; }
    ul.innerHTML = items.map(function (p) {
      var href = p.url || p.link;
      var title = href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(p.title) + "</a>" : esc(p.title);
      return "<li>" + title + '<div class="m">' + authorsHtml(p.authors) + " · " + esc(p.venue) + " · " + p.year + "</div></li>";
    }).join("");
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
          '<div class="t"><span class="badge">' + esc(TYPE_LABEL[p.type] || p.type) + "</span>" +
            (p.auto ? '<span class="badge auto" title="Added automatically from my Google Scholar profile">Scholar</span>' : "") +
            ((p.url || p.link) ? '<a class="tlink" href="' + esc(p.url || p.link) + '" target="_blank" rel="noopener">' + esc(p.title) + "</a>" : esc(p.title)) + "</div>" +
          '<div class="a">' + authorsHtml(p.authors) + "</div>" +
          '<div class="v">' + esc(p.venue) + (p.detail ? ' <span>· ' + esc(p.detail) + "</span>" : "") +
          (c ? ' <span class="cites">Cited by ' + c + "</span>" : "") + "</div>" +
          "</li>";
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
    var card = function (p) {
      var face = p.photo
        ? '<img class="avatar photo" src="' + esc(p.photo) + '" alt="Photo of ' + esc(p.name) + '" width="56" height="56" loading="lazy" data-initials="' + esc(initials(p.name)) + '">'
        : '<div class="avatar" aria-hidden="true">' + esc(initials(p.name)) + "</div>";
      var body = face + "<div><h4>" + esc(p.name) + "</h4>" + affHtml(p.org) + "</div>";
      // Only genuine LinkedIn profile addresses become links (anything else in the data is ignored)
      var ok = typeof p.linkedin === "string" && /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|pub)\/[A-Za-z0-9%_.\/-]+$/.test(p.linkedin);
      if (!ok) return '<div class="person">' + body + "</div>";
      return '<a class="person has-link" href="' + esc(p.linkedin) + '" target="_blank" rel="noopener noreferrer" aria-label="' +
        esc(p.name) + ' on LinkedIn (opens in a new tab)">' + body + '<span class="li-badge" aria-hidden="true">in</span></a>';
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
      track.innerHTML = '<div class="slides-empty"><b>Be the first to leave a note.</b><p>If we have worked or studied together, a few honest lines would mean a lot. Use the form to send me yours.</p></div>';
      return;
    }

    track.innerHTML = items.map(function (t, i) {
      var meta = [t.role, t.org, t.year].filter(Boolean).join(" · ");
      return '<div class="slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + " of " + items.length + '">' +
        '<figure class="quote-card">' + (t.sample ? '<span class="sample-tag">Sample</span>' : "") +
        "<blockquote>" + esc(t.quote) + "</blockquote>" +
        '<figcaption><div class="avatar" aria-hidden="true">' + esc(ini(t.name)) + '</div><div class="who"><b>' + esc(t.name) + "</b>" +
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
      var lede = $(".form-lede");
      if (lede) lede.textContent = "Worked or studied with me? I'd be glad to hear how it went. Your testimonial is saved privately and checked before it appears here. You will be told straight away if it is waiting for review.";
      var sb = form.querySelector('button[type="submit"]'); if (sb) sb.textContent = "Submit testimonial";
      var cp = $("#t-copy"); if (cp) cp.hidden = true;
    }
    var say = function (text, cls) { status.textContent = text; status.className = "form-status" + (cls ? " " + cls : ""); };
    msg.addEventListener("input", function () { count.textContent = msg.value.length + " / " + msg.maxLength; });

    function valid() {
      var bad = [name, rel, msg].filter(function (el) { return !el.value.trim(); });
      [name, rel, msg].forEach(function (el) { el.classList.toggle("invalid", !el.value.trim()); el.setAttribute("aria-invalid", String(!el.value.trim())); });
      if (bad.length) { say("Please fill in the starred fields.", "err"); bad[0].focus(); return false; }
      if (!ok.checked) { say("Please tick the box to confirm you're happy for this to be shown.", "err"); ok.focus(); return false; }
      return true;
    }
    function compose() {
      var body = "Testimonial for swarnendughosh.com\n\n" +
        "Name: " + name.value.trim() + "\n" +
        "Relationship: " + rel.value + "\n" +
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
      var payload = { name: name.value.trim(), relationship: rel.value, org: org.value.trim(), message: msg.value.trim(), consent: true, website: ($("#t-hp") || {}).value || "" };
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
          form.reset(); count.textContent = "0 / " + msg.maxLength;
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
