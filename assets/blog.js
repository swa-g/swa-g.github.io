/* Blog pages: theme toggle, mobile menu, submenus, and the tag filter on the index. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;

  var themeBtn = $("#theme-toggle");
  function current() { return root.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
  function sync() {
    if (!themeBtn) return;
    var dark = current() === "dark";
    themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    themeBtn.setAttribute("aria-pressed", String(dark));
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      sync();
    });
    sync();
  }

  var menuBtn = $("#menu-toggle"), links = $("#nav-links");
  if (menuBtn && links) {
    menuBtn.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    $$("a", links).forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); });
    });
  }

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

  /* tag filter (index only) */
  var chips = $$(".tag-chip");
  if (chips.length) {
    var cards = $$(".post-card"), blocks = $$(".year-block"), count = $("#post-count"), active = "all";
    function apply() {
      var shown = 0;
      cards.forEach(function (c) {
        var ok = active === "all" || (c.getAttribute("data-tags") || "").split("|").indexOf(active) > -1;
        c.hidden = !ok; if (ok) shown++;
      });
      blocks.forEach(function (b) { b.hidden = !$$(".post-card", b).some(function (c) { return !c.hidden; }); });
      if (count) count.textContent = shown + (shown === 1 ? " article" : " articles");
    }
    chips.forEach(function (ch) {
      ch.addEventListener("click", function () {
        active = ch.getAttribute("data-tag");
        chips.forEach(function (o) { o.setAttribute("aria-pressed", String(o === ch)); });
        apply();
      });
    });
    apply();
  }
})();
