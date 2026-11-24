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
    var k = normTitle(p.scholarTitle || p.title);
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

  /* ---------- People (grouped by relationship; counts are computed from the publication list) ---------- */
  function buildPeople() {
    var root = $("#people-root"), P = window.PEOPLE;
    if (!root || !P) return;
    var nk = function (s) { return String(s).replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase(); };
    var initials = function (n) { var t = String(n).trim().split(/\s+/); return (t[0][0] + (t.length > 1 ? t[t.length - 1][0] : "")).toUpperCase(); };

    var canon = {}, info = {};                          // alias -> key ; key -> person record
    (P.people || []).forEach(function (p) {
      var key = "p:" + nk(p.name); info[key] = p;
      (p.aliases || []).concat([p.name]).forEach(function (a) { canon[nk(a)] = key; });
    });

    var stats = {}, joint = 0;
    pubs.forEach(function (p) {
      var seen = {}, others = 0;
      p.authors.split(",").forEach(function (a) {
        var raw = a.trim();
        if (!raw || nk(raw) === "swarnendu ghosh") return;
        var key = canon[nk(raw)] || "r:" + nk(raw);
        if (info[key] && info[key].hide) return;         // "Show on site = No"
        if (seen[key]) return;
        seen[key] = 1; others++;
        var s = stats[key] || (stats[key] = { key: key, name: info[key] ? info[key].name : raw, count: 0, first: 9999, last: 0 });
        s.count++; s.first = Math.min(s.first, p.year); s.last = Math.max(s.last, p.year);
      });
      if (others) joint++;
    });

    var together = function (s) {
      if (!s) return "";
      var yrs = s.first === s.last ? s.first : s.first + "–" + s.last;
      return s.count + (s.count === 1 ? " publication" : " publications") + " together · " + yrs;
    };
    var byCountThenName = function (a, b) {
      var sa = stats["p:" + nk(a.name)], sb = stats["p:" + nk(b.name)];
      return ((sb ? sb.count : 0) - (sa ? sa.count : 0)) || (a.name < b.name ? -1 : 1);
    };
    var card = function (p, big) {
      var s = stats["p:" + nk(p.name)];
      return '<div class="person' + (big ? " big" : "") + '"><div class="avatar" aria-hidden="true">' + esc(initials(p.name)) + "</div><div>" +
        "<h4>" + esc(p.name) + "</h4>" + (p.rel ? '<span class="prole">' + esc(p.rel) + "</span>" : "") +
        (p.org ? "<p>" + esc(p.org) + "</p>" : "") + (p.note ? "<p>" + esc(p.note) + "</p>" : "") +
        (s ? '<div class="together">' + esc(together(s)) + "</div>" : "") + "</div></div>";
    };

    var html = "", grouped = {};
    (P.groups || []).forEach(function (g) {
      var list = Object.keys(info).map(function (k) { return info[k]; })
        .filter(function (p) { return !p.hide && g.rels.indexOf(p.rel) !== -1; }).sort(byCountThenName);
      list.forEach(function (p) { grouped["p:" + nk(p.name)] = 1; });
      if (!list.length) return;
      html += '<div class="people-group"><h3>' + esc(g.title) + " <small>" + list.length + '</small></h3><div class="people-grid">' +
        list.map(function (p) { return card(p, g.big); }).join("") + "</div></div>";
    });

    /* People who are not co-authors on any paper (optional list in people.js) */
    if ((P.extraStudents || []).length) {
      html += '<div class="people-group"><h3>More students &amp; mentees <small>' + P.extraStudents.length + '</small></h3><div class="people-grid">' +
        P.extraStudents.map(function (s) {
          var nm = s.link ? '<a href="' + esc(s.link) + '" target="_blank" rel="noopener">' + esc(s.name) + "</a>" : esc(s.name);
          return '<div class="person"><div class="avatar" aria-hidden="true">' + esc(initials(s.name)) + "</div><div><h4>" + nm + "</h4>" +
            '<span class="prole">' + esc([s.level, s.years].filter(Boolean).join(" · ")) + "</span>" +
            (s.topic ? "<p>" + esc(s.topic) + "</p>" : "") + (s.now ? "<p>Now: " + esc(s.now) + "</p>" : "") + "</div></div>";
        }).join("") + "</div></div>";
    }

    /* Frequent co-authors who have no relationship label yet */
    var all = Object.keys(stats).map(function (k) { return stats[k]; });
    var freq = all.filter(function (s) { return s.count >= 3 && !grouped[s.key]; })
      .sort(function (a, b) { return b.count - a.count || b.last - a.last; }).slice(0, 12);
    if (freq.length) {
      html += '<div class="people-group"><h3>Frequent co-authors <small>3 or more publications together</small></h3><div class="people-grid">' +
        freq.map(function (s) { return card({ name: s.name }, false); }).join("") + "</div></div>";
    }

    /* Everyone, alphabetical by surname */
    var sorted = all.slice().sort(function (a, b) {
      var sa = a.name.split(" ").pop().toLowerCase(), sb = b.name.split(" ").pop().toLowerCase();
      return sa < sb ? -1 : sa > sb ? 1 : a.name < b.name ? -1 : 1;
    });
    html += '<details class="all-authors"><summary>All co-authors (' + all.length + ")</summary>" +
      '<ul class="author-list">' + sorted.map(function (s) { return "<li>" + esc(s.name) + "<b>" + s.count + "</b></li>"; }).join("") + "</ul></details>";

    root.innerHTML = '<p class="people-summary">' + all.length + " co-authors across " + joint +
      " collaborative publications. The number next to a name is how many publications we share.</p>" + html;
  }
  buildPeople();

  /* ---------- Testimonials: slider ---------- */
  (function testimonials() {
    var track = $("#slides"), ui = $("#slider-ui");
    if (!track) return;
    var items = (window.TESTIMONIALS || []).filter(function (t) { return t && t.quote && t.name; });
    var demo = /[?&]demo\b/.test(location.search);
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
  })();

  /* ---------- Testimonials: "write one" form (opens an email draft; nothing is stored on any server) ---------- */
  (function testimonialForm() {
    var form = $("#testi-form");
    if (!form) return;
    var name = $("#t-name"), rel = $("#t-rel"), org = $("#t-org"), msg = $("#t-msg"), ok = $("#t-ok");
    var count = $("#t-count"), status = $("#t-status");
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
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!valid()) return;
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
