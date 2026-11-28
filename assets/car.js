/* A small toy car, seen from above. It roams on its own and parks only in blank space; tap it and it follows the pointer.
   Red by day, white at night (the site's light and dark themes). In the dark theme its headlamps are lit, it throws a
   beam of light ahead, and the blocks it lights up glow along their edges. It drives over ordinary text and under
   headings, buttons and blocks with a single row of text. */
import * as THREE from "./vendor/three.module.min.js";

(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMq.matches) return;
  try {
    var probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) return;
  } catch (e) { return; }

  var store = {
    get: function (k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var enabled = store.get("toycar", "on") !== "off";

  /* ================================================================= scene */
  var canvas = document.createElement("canvas");
  canvas.id = "car-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  /* the light layer: a 2D canvas under the car, blended with "screen" so it adds light to the page (dark theme only) */
  var lightCv = document.createElement("canvas");
  lightCv.id = "car-light"; lightCv.setAttribute("aria-hidden", "true"); lightCv.style.display = "none";
  document.body.appendChild(lightCv);
  var lctx = lightCv.getContext("2d");
  /* the beam itself is a "colour dodge" layer: it multiplies up whatever is under it, so the page's own content is what
     brightens, instead of a white haze lying over it */
  var beamEl = document.createElement("canvas");
  beamEl.id = "car-beam"; beamEl.setAttribute("aria-hidden", "true"); beamEl.style.display = "none";
  document.body.appendChild(beamEl);
  var blx = beamEl.getContext("2d");
  /* a third layer in the "saturation" blend mode: lit items gain a little colour (grey and white are unchanged) */
  var satEl = document.createElement("canvas");
  satEl.id = "car-sat"; satEl.setAttribute("aria-hidden", "true"); satEl.style.display = "none";
  document.body.appendChild(satEl);
  var slx = satEl.getContext("2d");
  function setLightDisplay(on) { var v = on ? "" : "none"; lightCv.style.display = v; beamEl.style.display = v; satEl.style.display = v; if (!on) clearGlow(); }
  var lightScale = 1, lightShown = false;
  var beamCv = document.createElement("canvas"), bctx = beamCv.getContext("2d"), beamImg = null;
  var airCv = document.createElement("canvas"), actx = airCv.getContext("2d"), airImg = null;   /* the two beams lit in the air */
  var edgeCv = document.createElement("canvas"), ectx = edgeCv.getContext("2d");
  var scene = new THREE.Scene();
  var cam = new THREE.OrthographicCamera(0, 100, 0, -100, -400, 400);
  var W = 0, H = 0, S = 1;

  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  var sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-60, 90, 140);
  scene.add(sun);

  function rrect(w, h, r) {
    var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function lam(c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.05 }); }
  function extrude(shape, depth, bevel) {
    return new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
  }

  /* the car is modelled facing +x, about 42 x 26 px, wheelbase 24 */
  var K = 11.5;                    /* pixels per metre: the Model 3 is 4.72 m long, so about 54 px, with a 2.93 m wheelbase */
  var L = 2.93 * K;
  var car3d = new THREE.Group();
  var body = new THREE.Group();
  car3d.add(body);

  /* The car is a top-view sprite of a Tesla Model 3, rendered from the 3D model in the LANCER-GPU fleet (sedan_model3.glb):
     body_red.png and body_white.png are the same body with red and white paint, wheel.png is one tyre (so the front pair can steer).
     The sprite faces +x and covers 4.9 x 2.5 m, centred on the middle of the wheelbase. */
  var SPRITES = {
    red: new URL("./car/body_red.png", import.meta.url).href,
    white: new URL("./car/body_white.png", import.meta.url).href,
    wheel: new URL("./car/wheel.png", import.meta.url).href
  };
  var texLoader = new THREE.TextureLoader();
  function loadTex(url) { var t = texLoader.load(url, function () { wake(); }); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  var texRed = loadTex(SPRITES.red), texWhite = loadTex(SPRITES.white), texWheel = loadTex(SPRITES.wheel);
  var spriteGeo = new THREE.PlaneGeometry(4.9 * K, 2.5 * K);
  var bodyMat = new THREE.MeshBasicMaterial({ map: texRed, transparent: true, alphaTest: 0.02, depthWrite: false });
  var bodyPlane = new THREE.Mesh(spriteGeo, bodyMat); bodyPlane.position.z = 8; body.add(bodyPlane);
  var spriteIsWhite = false;

  /* back lamps: slim red strips over the rear lamp bar, lit only while braking */
  var tailMat = new THREE.MeshBasicMaterial({ color: 0xff2b2b, transparent: true, opacity: 0 });
  [-1, 1].forEach(function (sd) {
    var t = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 5.4), tailMat); t.position.set(-2.24 * K, sd * 0.56 * K, 9); body.add(t);
  });

  /* headlamps: bright white strips over the sprite's lamps, lit in the dark theme */
  var headMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  [-1, 1].forEach(function (sd) {
    var h = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2), headMat);
    h.position.set(2.17 * K, sd * 0.62 * K, 9); h.rotation.z = sd * -0.55; body.add(h);
  });

  /* wheels: drawn under the body, as in the real top view; the front pair turns with the steering */
  var wheelMat = new THREE.MeshBasicMaterial({ map: texWheel, transparent: true, alphaTest: 0.02, depthWrite: false });
  var frontWheels = [];
  [[-1.43, 0.8, false], [-1.43, -0.8, false], [1.5, 0.8, true], [1.5, -0.8, true]].forEach(function (w) {
    var g = new THREE.Group(); g.position.set(w[0] * K, w[1] * K, 3);
    var m = new THREE.Mesh(spriteGeo, wheelMat); g.add(m); car3d.add(g);
    if (w[2]) frontWheels.push(g);
  });
  scene.add(car3d);

  /* shadows are the car's own silhouette, so it sits on the page: a tight contact shadow right under the tyres, and a longer
     one cast away from the sun */
  function shadowMesh() {
    var m = new THREE.Mesh(spriteGeo, new THREE.MeshBasicMaterial({ map: texRed, color: 0x000000, transparent: true, alphaTest: 0.02, opacity: 0.3, depthWrite: false }));
    m.position.z = -6; scene.add(m); return m;
  }
  var shadowContact = shadowMesh(), shadowCast = shadowMesh();

  /* exhaust puffs */
  var puffTex = (function () {
    var c = document.createElement("canvas"); c.width = c.height = 64;
    var g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  var puffs = [];
  for (var pi0 = 0; pi0 < 12; pi0++) {
    var pm = new THREE.SpriteMaterial({ map: puffTex, color: 0xa0a6b2, transparent: true, opacity: 0, depthWrite: false });
    var ps = new THREE.Sprite(pm); ps.visible = false; ps.position.z = -3; scene.add(ps);
    puffs.push({ s: ps, age: 1, life: 0.6, vx: 0, vy: 0 });
  }
  var puffClock = 0, puffIdx = 0;

  /* ================================================================= the page */
  function night() {
    var th = root.getAttribute("data-theme");
    return th ? th === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  var SKIP_TAG = /^(SCRIPT|STYLE|LINK|META|BR|HEAD|HTML|NOSCRIPT|PATH|G|CIRCLE|RECT|LINE|POLYLINE|POLYGON|USE|SPAN|B|I|EM|STRONG|SMALL|CODE|LABEL|SUP|SUB|TIME|MARK)$/i;
  var SKIP_IN = "#car-canvas,#car-light,#car-beam,#car-sat,.toycar-btn,.toycar-toast,#intro";
  function alphaOf(c) {
    var m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return c && c !== "transparent" ? 1 : 0;
    var p = m[1].split(/[ ,\/]+/);
    return p.length > 3 ? parseFloat(p[3]) : 1;
  }
  function fixedAncestor(el, cache) {
    var chain = [], cur = el, res = false;
    while (cur && cur !== document.body && cur !== root) {
      if (cache.has(cur)) { res = cache.get(cur); break; }
      chain.push(cur);
      var pos = getComputedStyle(cur).position;
      if (pos === "fixed" || pos === "sticky") { res = true; break; }
      cur = cur.parentElement;
    }
    chain.forEach(function (e) { cache.set(e, res); });
    return res;
  }
  /* how many rows of text an element holds: 0 for none, 1 for a single row, 2 for two or more */
  function textRows(el) {
    var tops = [], range = document.createRange(), walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n;
    while ((n = walker.nextNode())) {
      if (!/\S/.test(n.nodeValue)) continue;
      range.selectNodeContents(n);
      var rs = range.getClientRects();
      for (var i = 0; i < rs.length; i++) {
        if (rs[i].width < 1) continue;
        var t = Math.round(rs[i].top / 5);
        if (tops.indexOf(t) < 0) tops.push(t);
        if (tops.length > 1) return 2;
      }
    }
    return tops.length;
  }

  /* the four corner radii [top-left, top-right, bottom-right, bottom-left] of a block, in px, as it is actually drawn:
     percentages and elliptical corners are resolved, and neighbouring radii are scaled down if they would overlap */
  function cornerRadii(cs, w, h) {
    function one(v) {
      var p = (v || "0").split(" "), a = p[0], b = p[1] || p[0];
      function px(x, ref) { return x.indexOf("%") > -1 ? parseFloat(x) / 100 * ref : (parseFloat(x) || 0); }
      return Math.min(px(a, w), px(b, h));
    }
    var r = [one(cs.borderTopLeftRadius), one(cs.borderTopRightRadius), one(cs.borderBottomRightRadius), one(cs.borderBottomLeftRadius)];
    var f = 1;
    if (r[0] + r[1] > w) f = Math.min(f, w / (r[0] + r[1]));
    if (r[3] + r[2] > w) f = Math.min(f, w / (r[3] + r[2]));
    if (r[0] + r[3] > h) f = Math.min(f, h / (r[0] + r[3]));
    if (r[1] + r[2] > h) f = Math.min(f, h / (r[1] + r[2]));
    return r.map(function (x) { return x * f; });
  }
  var inkRects = [];     /* text rows and pictures, in document pixels: [left, top, right, bottom] */
  var boxes = [];        /* blocks with a background colour, which catch the light at their edges */
  var marked = [];       /* small blocks that are drawn above the car */
  var glowEls = [];      /* white buttons and boxes: [{el, l, t, w, h, box, lv}] in document pixels */
  var glowWords = [];    /* the words of white text: {range, cx, cy} in document pixels */
  /* the words themselves glow: ranges are handed to the CSS highlight API (::highlight(car-g1..3) carries a text-shadow) */
  var HL = (window.CSS && CSS.highlights && window.Highlight) ? [1, 2, 3].map(function (i) { var h = new Highlight(); CSS.highlights.set("car-g" + i, h); return h; }) : null;
  var wordLv = new Uint8Array(0);
  function clearWords() { if (HL) HL.forEach(function (h) { h.clear(); }); wordLv.fill(0); }
  function clearGlow() {
    clearWords();
    glowEls.forEach(function (g) { if (g.lv) { g.el.classList.remove("lit-b" + g.lv); g.lv = 0; } });
  }
  function brightRgb(c, min) {
    var m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return false;
    var p = m[1].split(/[ ,\/]+/).map(parseFloat);
    return (p.length < 4 || p[3] > 0.5) && p[0] >= min && p[1] >= min && p[2] >= min;
  }
  function collectPage() {
    marked.forEach(function (m) { m.classList.remove("above-car"); });
    marked = [];
    clearGlow(); var glow2 = [], words2 = [], glowSeen = new Map();
    var sx = window.pageXOffset || 0, sy = window.pageYOffset || 0, cache = new Map(), range = document.createRange();
    var ink = [], bx = [], seen = new Set(), lastMarked = null;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !/\S/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p || p.closest("script,style,noscript," + SKIP_IN)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      if (fixedAncestor(n.parentElement, cache)) continue;
      range.selectNodeContents(n);
      var rs = range.getClientRects();
      var pe = n.parentElement, white = glowSeen.get(pe);
      if (white === undefined) { white = brightRgb(getComputedStyle(pe).color, 185); glowSeen.set(pe, white); }
      for (var i = 0; i < rs.length; i++) {
        var r0 = rs[i];
        if (r0.width < 2 || r0.height < 2) continue;
        ink.push([r0.left + sx, r0.top + sy, r0.right + sx, r0.bottom + sy]);
      }
      if (white && night() && HL) {
        var txt = n.nodeValue, wre = /\S+/g, wm;
        while ((wm = wre.exec(txt))) {
          range.setStart(n, wm.index); range.setEnd(n, wm.index + wm[0].length);
          var wr = range.getBoundingClientRect();
          if (wr.width < 1 || wr.height < 1) continue;
          var wrg = document.createRange(); wrg.setStart(n, wm.index); wrg.setEnd(n, wm.index + wm[0].length);
          words2.push({ range: wrg, cx: (wr.left + wr.right) / 2 + sx, cy: (wr.top + wr.bottom) / 2 + sy });
        }
      }
    }
    Array.prototype.forEach.call(document.querySelectorAll("img,video,svg,input,textarea,select"), function (el) {
      if (el.closest(SKIP_IN) || fixedAncestor(el, cache)) return;
      var r1 = el.getBoundingClientRect();
      if (r1.width < 8 || r1.height < 8) return;
      ink.push([r1.left + sx, r1.top + sy, r1.right + sx, r1.bottom + sy]);
    });
    var all = document.body.getElementsByTagName("*"), vh = window.innerHeight;
    for (var e = 0; e < all.length; e++) {
      var el2 = all[e], tag = el2.tagName;
      if (SKIP_TAG.test(tag) || el2.closest(SKIP_IN)) continue;
      var r = el2.getBoundingClientRect();
      if (r.width < 22 || r.height < 14) continue;
      var big = tag === "SECTION" || el2.classList.contains("hero") || (el2.parentElement && el2.parentElement.id === "main");
      if (!big && r.height > 3 * vh) continue;
      var cs = getComputedStyle(el2);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      var hasBg = alphaOf(cs.backgroundColor) > 0.05;
      var hasBorder = (parseFloat(cs.borderTopWidth) || 0) > 0 && cs.borderTopStyle !== "none" && alphaOf(cs.borderTopColor) > 0.05;
      if (!hasBg && !hasBorder) continue;
      var fx = fixedAncestor(el2, cache);
      /* a button, chip, label or block with a single row of text goes above the car */
      if (!fx && !big && r.height <= 120 && r.width * r.height <= 60000 && !(lastMarked && lastMarked.contains(el2)) &&
          (cs.position === "static" || cs.position === "relative") && textRows(el2) === 1) {
        el2.classList.add("above-car"); marked.push(el2); lastMarked = el2;
      }
      if (hasBg && night() && !fx && brightRgb(cs.backgroundColor, 200)) glow2.push({ el: el2, l: r.left + sx, t: r.top + sy, w: r.width, h: r.height, box: true, lv: 0 });
      if (!hasBg) continue;                      /* only blocks with a visible fill have an edge to light */
      var key = Math.round(r.left) + "," + Math.round(r.top) + "," + Math.round(r.width) + "," + Math.round(r.height);
      if (seen.has(key)) continue;
      seen.add(key);
      var rads = cornerRadii(cs, r.width, r.height);
      bx.push({ el: el2, l: r.left + (fx ? 0 : sx), t: r.top + (fx ? 0 : sy), w: r.width, h: r.height, rads: rads, fixed: fx, big: !!big });
    }
    inkRects = ink; boxes = bx; glowEls = glow2; glowWords = words2; wordLv = new Uint8Array(words2.length);
  }
  /* is this viewport point clear of text and pictures by at least pad pixels? */
  function isBlank(x, y, pad) {
    var dy = y + (window.pageYOffset || 0);
    for (var i = 0; i < inkRects.length; i++) {
      var q = inkRects[i];
      if (x > q[0] - pad && x < q[2] + pad && dy > q[1] - pad && dy < q[3] + pad) return false;
    }
    return true;
  }
  var rebuildTimer = 0;
  function scheduleRebuild(delay) {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(function () { collectPage(); wake(); }, delay == null ? 450 : delay);
  }

  /* the route is a straight line: the car steers, brakes and reverses the way a car does, so it makes its own curves */
  function plan(sx0, sy0, gx, gy) { return [{ x: sx0, y: sy0 }, { x: gx, y: gy }]; }

  /* ================================================================= car physics */
  var car = { x: 0, y: 0, th: -0.6, v: 0, delta: 0, yaw: 0, accel: 0, mode: 1, hop: 0 };
  var pointer = null, goalX = 0, goalY = 0;
  var route = null, routeLen = 0, routeCum = [], seg = 0, planAt = 0, planGoalX = -1e9, planGoalY = -1e9, planScroll = 0;
  var brakeOn = false;
  var vMaxF, vMaxR, aMax, aBrake, aLat, wheelbase, offX, offY;

  function setScale() {
    S = W < 640 ? 0.78 : 1;
    car3d.scale.setScalar(S); shadowContact.scale.setScalar(S); shadowCast.scale.setScalar(S);
    wheelbase = L * S;
    vMaxF = 400 * S; vMaxR = 140 * S; aMax = 480 * S; aBrake = 950 * S; aLat = 1000 * S;
    offX = 26 * S; offY = 30 * S;
  }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var routeTurns = [];
  function setRoute(pts) {
    route = pts; routeCum = [0];
    for (var i = 1; i < pts.length; i++) routeCum.push(routeCum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    routeLen = routeCum[routeCum.length - 1]; seg = 0;
    routeTurns = [];
    for (var j = 0; j < pts.length; j++) {
      if (!pts[j].arc) continue;
      var k = j; while (k + 1 < pts.length && pts[k + 1].arc) k++;
      routeTurns.push({ s0: routeCum[j], s1: routeCum[k], r: pts[j].r });
      j = k;
    }
  }
  /* point on the route at arc length s */
  var tp = { x: 0, y: 0 };
  function routeAt(s) {
    s = clamp(s, 0, routeLen);
    var i = Math.min(seg, route.length - 2);
    while (i < route.length - 2 && routeCum[i + 1] < s) i++;
    var l = routeCum[i + 1] - routeCum[i], t = l > 0 ? (s - routeCum[i]) / l : 0;
    tp.x = route[i].x + (route[i + 1].x - route[i].x) * t; tp.y = route[i].y + (route[i + 1].y - route[i].y) * t;
    return tp;
  }
  function project() {
    var best = 1e18, bs = 0;
    for (var i = seg; i < Math.min(route.length - 1, seg + 8); i++) {
      var ax = route[i].x, ay = route[i].y, bx = route[i + 1].x, by = route[i + 1].y;
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      var t = clamp(((car.x - ax) * dx + (car.y - ay) * dy) / l2, 0, 1);
      var px = ax + dx * t, py = ay + dy * t, d = (px - car.x) * (px - car.x) + (py - car.y) * (py - car.y);
      if (d < best) { best = d; bs = routeCum[i] + Math.sqrt(l2) * t; seg = i; }
    }
    return bs;
  }

  var scrollNow = 0, simTime = 0, gearTime = 0, closeTime = 0, closeGX = 0, closeGY = 0;
  /* ---- roaming: a second mode, switched on by tapping the car ---- */
  var roam = true, roamGoal = null, roamWaiting = true, roamWaitUntil = 1.2, roamGoalAt = 0, lastScrollY = 0;
  /* a random spot in plain view where nothing is written: a street, a gutter, or an empty patch of page */
  function blankSpot(minFromCar) {
    for (var i = 0; i < 90; i++) {
      var q = [rnd(54, W - 54), rnd(86, H - 56)];
      if (q[0] < 90 && q[1] > H - 90) continue;                                      /* keep clear of the on/off buttons */
      if (minFromCar && Math.hypot(q[0] - car.x, q[1] - car.y) < minFromCar * S) continue;   /* a proper drive, not a shuffle */
      if (!isBlank(q[0], q[1], 22 * S)) continue;                                    /* never on text or a picture */
      return { x: q[0], y: q[1] };
    }
    return null;
  }
  function pickRoamGoal() {
    var spot = blankSpot(150);
    if (!spot) { roamGoal = { x: car.x, y: car.y }; roamGoalAt = simTime; roamWaiting = true; roamWaitUntil = simTime + 1; return; }
    roamGoal = spot; roamGoalAt = simTime; roamWaiting = false;
  }
  function onScreen(m) { return car.x > -m && car.x < W + m && car.y > -m && car.y < H + m; }
  function roamStep() {
    var visible = onScreen(10);
    var goalBad = !roamGoal || roamGoal.y < 60 || roamGoal.y > H - 30 || roamGoal.x < 30 || roamGoal.x > W - 30;
    if (roamWaiting) {
      if (simTime >= roamWaitUntil || !visible) pickRoamGoal();
    } else if (goalBad || simTime - roamGoalAt > 16) {
      pickRoamGoal();
    }
    if (roamWaiting) { goalX = car.x; goalY = car.y; } else { goalX = roamGoal.x; goalY = roamGoal.y; }
  }

  function step(dt) {
    simTime += dt;
    /* the car stands on the page, in either mode: when the page scrolls, the car scrolls with it, and in follow
       mode it then drives back to the pointer */
    var ds = scrollNow - lastScrollY; lastScrollY = scrollNow;
    if (ds) { car.y -= ds; if (roamGoal) roamGoal.y -= ds; }
    if (roam) roamStep();
    else {
      if (!pointer) return;
      /* point at the car and it stays put, so it can be tapped */
      if (Math.hypot(pointer.x - car.x, pointer.y - car.y) < 30 * S) { goalX = car.x; goalY = car.y; }
      else { goalX = clamp(pointer.x + offX, 24, W - 24); goalY = clamp(pointer.y + offY, 24, H - 24); }
    }
    var dxg = goalX - car.x, dyg = goalY - car.y, dist = Math.hypot(dxg, dyg);
    var now = simTime;

    /* replan when the goal or the page has moved, or now and then while driving */
    var moved = Math.hypot(goalX - planGoalX, goalY - planGoalY) > 14 || Math.abs(scrollNow - planScroll) > 6;
    if (!route || (moved && now - planAt > 0.08) || (now - planAt > 0.5 && dist > 12)) {
      setRoute(plan(car.x, car.y, goalX, goalY));
      planAt = now; planGoalX = goalX; planGoalY = goalY; planScroll = scrollNow;
    }

    var sProj = project();
    var rem = Math.max(0, routeLen - sProj);

    /* forward or reverse? Near the spot, ask which gear can actually reach it: a point inside the car's turning circle
       cannot be reached by an arc, so the car backs off (or drives off) first and tries again, like a real 3-point turn. */
    var R = wheelbase / Math.tan(0.62) * 1.12;
    var cth = Math.cos(car.th), sth = Math.sin(car.th);
    var along = dxg * cth + dyg * sth, side = -dxg * sth + dyg * cth;
    function reach(gr) { var fx = along * gr, fy = Math.abs(side); var Rt = R - 13 * S; return fx > 0 && fx * fx + (fy - R) * (fy - R) >= Rt * Rt; }
    var want = car.mode, escape = false;
    if (dist < 2.8 * R && dist > 13 * S) {
      if (!reach(car.mode)) {
        if (reach(-car.mode)) want = -car.mode;
        else { escape = true; want = along > 0 ? -1 : 1; }
      }
    } else if (dist > 150 * S) want = 1;
    gearTime += dt;
    if (want !== car.mode && Math.abs(car.v) < 10 && gearTime > 0.45) { car.mode = want; gearTime = 0; }
    var switching = want !== car.mode;
    if (dist < 34 * S) closeTime += dt; else closeTime = 0;
    if (Math.hypot(goalX - closeGX, goalY - closeGY) > 20) { closeTime = 0; closeGX = goalX; closeGY = goalY; }
    var arrived = dist < 14 * S || closeTime > 4.5;   /* close enough is good enough: stop shuffling */

    /* pure pursuit toward a point further along the route */
    var Ld = clamp(0.32 * Math.abs(car.v) + 34 * S, 30 * S, 120 * S);
    var look = routeAt(sProj + Ld);
    var heading = car.mode === 1 ? car.th : car.th + Math.PI;
    var alpha = wrap(Math.atan2(look.y - car.y, look.x - car.x) - heading);
    var kappa = 2 * Math.sin(alpha) / Math.max(Ld, 1);
    var dTarget = Math.atan(wheelbase * kappa);
    if (car.mode === -1) dTarget = -dTarget;
    if (escape) dTarget = 0;
    var dMax = 0.62 / (1 + Math.pow(Math.abs(car.v) / (360 * S), 2));
    dTarget = clamp(dTarget, -dMax, dMax);
    car.delta += clamp(dTarget - car.delta, -5.5 * dt, 5.5 * dt);

    /* target speed: cruise, brake for the stop, slow for tight corners, crawl when facing away */
    var vLim = (car.mode === 1 ? vMaxF : vMaxR) * (roam && onScreen(0) ? 0.62 : 1);
    var vStop = Math.sqrt(2 * aBrake * 0.5 * Math.max(0, rem - 3 * S));
    var vCorner = Math.sqrt(aLat / Math.max(Math.abs(kappa), 1e-4));
    var vTurn = Math.abs(alpha) > 1.3 ? 150 * S : vLim;
    var vNear = Math.max(55 * S, dist * 4.5);       /* creep when close, so tight manoeuvres stay controlled */
    /* each right-angle turn is taken slowly: brake in time for it, hold a turning speed through it, then accelerate away */
    var vRoute = vLim;
    for (var tn = 0; tn < routeTurns.length; tn++) {
      var T = routeTurns[tn];
      if (T.s1 < sProj) continue;
      var vArc = Math.sqrt(550 * S * Math.max(20 * S, T.r * 0.6));
      vRoute = sProj >= T.s0 ? vArc : Math.sqrt(vArc * vArc + 2 * aBrake * 0.4 * (T.s0 - sProj));
      break;
    }
    var vDes = Math.min(vLim, vStop, vCorner, vTurn, vNear, vRoute);
    if (escape) vDes = Math.min(vDes, 95 * S);
    if (arrived) vDes = 0;
    vDes *= car.mode;
    if (switching) vDes = 0;

    var dv = vDes - car.v, a;
    if (dv > 0) a = Math.min(aMax, dv * 9); else a = Math.max(-aBrake, dv * 9);
    if (vDes === 0 && Math.abs(car.v) < 6) { car.v = 0; a = 0; }
    car.accel = a;
    car.v += a * dt;

    /* kinematic bicycle model referenced at the middle of the wheelbase */
    var beta = Math.atan(0.5 * Math.tan(car.delta));
    car.x += car.v * Math.cos(car.th + beta) * dt;
    car.y += car.v * Math.sin(car.th + beta) * dt;
    car.yaw = car.v * Math.cos(beta) * Math.tan(car.delta) / wheelbase;
    car.th += car.yaw * dt;

    if (roam && !roamWaiting && arrived && Math.abs(car.v) < 8) { roamWaiting = true; roamWaitUntil = simTime + rnd(0.9, 2.8); }
    brakeOn = (car.v > 8 && a < -260 * S) || (car.v < -8 && a > 260 * S) || (vDes === 0 && Math.abs(car.v) > 8);
    /* puffs when pulling away hard */
    puffClock -= dt;
    if (puffClock <= 0 && Math.abs(a) > aMax * 0.75 && Math.abs(car.v) < 280 * S && a * car.mode > 0) {
      puffClock = 0.045;
      var pf = puffs[puffIdx++ % puffs.length], sgn = car.mode === 1 ? -1 : 1;
      pf.age = 0; pf.life = rnd(0.45, 0.7); pf.s.visible = true;
      pf.s.position.set(car.x + Math.cos(car.th) * 22 * S * sgn, -(car.y + Math.sin(car.th) * 22 * S * sgn), -3);
      pf.vx = Math.cos(car.th) * 40 * sgn + rnd(-14, 14); pf.vy = -(Math.sin(car.th) * 40 * sgn) + rnd(-14, 14);
      pf.s.scale.set(7, 7, 1);
    }
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ================================================================= drawing */
  var lastDrawn = { x: -1, y: -1, th: 0 };
  function draw(dt) {
    car3d.position.set(car.x, -car.y, 0);
    car3d.rotation.z = -car.th;
    /* body sway and a little pitch from the accelerations, hop when clicked */
    var lat = clamp(car.v * car.yaw / (900 * S), -1, 1), lon = clamp(car.accel / (aBrake), -1, 1);
    body.rotation.z = lat * 0.05;
    body.scale.set(1 + lon * 0.012, 1, 1);
    if (car.hop > 0) {
      car.hop -= dt * 3.4;
      var h = Math.sin(Math.max(0, car.hop) * Math.PI);
      car3d.position.z = h * 8; car3d.scale.setScalar(S * (1 + h * 0.12));
      if (car.hop <= 0) { car3d.position.z = 0; car3d.scale.setScalar(S); }
    }
    frontWheels.forEach(function (w) { w.rotation.z = -car.delta; });
    /* white in the dark theme, red in the light theme */
    var wantWhite = isDark();
    if (wantWhite !== spriteIsWhite) { spriteIsWhite = wantWhite; bodyMat.map = wantWhite ? texWhite : texRed; bodyMat.needsUpdate = true; }
    /* back lamps: red, and only while braking; the headlamps are lit in the dark theme */
    tailMat.opacity = brakeOn ? 1 : 0;
    headMat.opacity = isDark() ? 1 : 0;
    var tilt = car3d.position.z;
    var lift = 1 - Math.min(0.55, tilt / 14);                  /* a hop lifts the car off its shadow */
    var sa = night() ? 0 : 0.26;                                /* the car casts a shadow by day, none at night */
    shadowContact.position.set(car.x + 1.4 + tilt * 0.4, -(car.y + 2 + tilt * 0.4), -6);
    shadowCast.position.set(car.x + 3.6 + tilt * 0.6, -(car.y + 5.4 + tilt * 0.6), -6.5);
    shadowContact.rotation.z = shadowCast.rotation.z = -car.th;
    shadowContact.material.opacity = Math.min(0.6, sa * 1.4) * lift;
    shadowCast.material.opacity = Math.min(0.28, sa * 0.7) * lift;
    shadowContact.material.color.set("#000"); shadowCast.material.color.set("#000");
    for (var i = 0; i < puffs.length; i++) {
      var p = puffs[i];
      if (p.age >= 1) { p.s.visible = false; continue; }
      p.age += dt / p.life;
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt;
      var k = Math.min(1, p.age);
      p.s.scale.set(7 + k * 15, 7 + k * 15, 1);
      p.s.material.opacity = 0.42 * (1 - k);
      p.s.material.color.setHex(isDark() ? 0xc4cad8 : 0x9aa1ae);
    }
    cam.updateProjectionMatrix();
    renderer.render(scene, cam);
  }
  function isDark() { return night(); }


  /* ================================================================= headlights (dark theme) */
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function rr4(c, x, y, w, h, r) {        /* rounded rectangle with a radius per corner */
    c.moveTo(x + r[0], y);
    c.lineTo(x + w - r[1], y); if (r[1] > 0) c.arc(x + w - r[1], y + r[1], r[1], -Math.PI / 2, 0);
    c.lineTo(x + w, y + h - r[2]); if (r[2] > 0) c.arc(x + w - r[2], y + h - r[2], r[2], 0, Math.PI / 2);
    c.lineTo(x + r[3], y + h); if (r[3] > 0) c.arc(x + r[3], y + h - r[3], r[3], Math.PI / 2, Math.PI);
    c.lineTo(x, y + r[0]); if (r[0] > 0) c.arc(x + r[0], y + r[0], r[0], Math.PI, 1.5 * Math.PI);
    c.closePath();
  }
  /* a round glow that fades out smoothly: the falloff is eased to zero slope at the rim, so there is no visible edge */
  function glow(c, x, y, rad, rgb, a) {
    var g = c.createRadialGradient(x, y, 0, x, y, rad);
    for (var k = 0; k <= 12; k++) {
      var u = k / 12, s = u * u * (3 - 2 * u), f = 1 - s;
      g.addColorStop(u, "rgba(" + rgb + "," + (a * f * f).toFixed(4) + ")");
    }
    c.fillStyle = g; c.beginPath(); c.arc(x, y, rad + 1, 0, 6.2832); c.fill();
  }
  var WARM = "250,252,255", COOL = "170,190,255";   /* neutral white; a cool tint only for big blocks */
  function drawLight() {
    var dark = isDark();
    if (dark !== lightShown) { lightShown = dark; setLightDisplay(dark && enabled); }
    if (!dark || !enabled) return;
    var c = lctx;
    c.setTransform(lightScale, 0, 0, lightScale, 0, 0);
    c.clearRect(0, 0, W, H);
    blx.setTransform(lightScale, 0, 0, lightScale, 0, 0); blx.clearRect(0, 0, W, H);
    slx.setTransform(lightScale, 0, 0, lightScale, 0, 0); slx.clearRect(0, 0, W, H);
    var dx = Math.cos(car.th), dy = Math.sin(car.th), nx = -dy, ny = dx;
    var cx = car.x, cy = car.y;
    var R = 270 * S;
    if (cx < -R - 60 || cx > W + R + 60 || cy < -R - 60 || cy > H + R + 60) return;
    var sy = window.pageYOffset || 0;

    /* The beam is worked out per pixel, so it has no bands and no hard edges: it fades with distance and falls off
       smoothly either side of the axis, identically on the left and the right. */
    var bx = cx + dx * 21 * S, by = cy + dy * 21 * S;            /* the bumper */
    var BS = 0.42, BN = Math.ceil(2 * R * BS);                   /* beam map: low resolution, scaled up smoothly */
    if (beamCv.width !== BN) { beamCv.width = beamCv.height = BN; beamImg = bctx.createImageData(BN, BN); airCv.width = airCv.height = BN; airImg = actx.createImageData(BN, BN); }
    var px = beamImg.data, tau = 0.42, w0 = 8 * S, Rinv = 1 / R, step = 1 / BS, lampOff = 0.62 * K * S;
    /* two kinds of light. The ground: a soft cone that lights the page, the surfaces and the text. The air: two beams,
       one from each lamp, that widen (and drift apart) with distance, like headlamps through moist air. */
    function ground(wx, wy) {
      var u = wx * dx + wy * dy, v = wx * nx + wy * ny;
      if (u <= -10 * S) return 0;
      var rr2 = Math.sqrt(wx * wx + wy * wy) * Rinv;
      if (rr2 >= 1) return 0;
      var f = 1 - rr2, av = Math.abs(v) - w0; if (av < 0) av = 0;
      var tt = av / ((u + 10 * S) * tau + 4);
      var ang = 1 / (1 + tt * tt * tt * tt);
      var ramp = (u + 10 * S) / (26 * S); if (ramp > 1) ramp = 1;
      var val = f * f * ramp * ang * 0.8;
      return val > 1 ? 1 : val;
    }
    function air(wx, wy) {
      var u = wx * dx + wy * dy, v = wx * nx + wy * ny;
      if (u <= -10 * S) return 0;
      var rr2 = Math.sqrt(wx * wx + wy * wy) * Rinv;
      if (rr2 >= 1) return 0;
      var f = 1 - rr2, ramp = (u + 10 * S) / (26 * S); if (ramp > 1) ramp = 1;
      var uu = u > 0 ? u : 0, lw = 2.3 * S + 0.12 * uu, off = lampOff + 0.07 * uu;
      var a1 = (v - off) / lw, a2 = (v + off) / lw, l1 = 1 / (1 + a1 * a1), l2 = 1 / (1 + a2 * a2);
      var thin = Math.sqrt(2.3 * S / lw);                        /* a wider beam is a little fainter */
      var val = f * ramp * thin * (l1 * l1 + l2 * l2);
      return val > 1 ? 1 : val;
    }
    function beamVal(wx, wy) { var g = ground(wx, wy) + air(wx, wy); return g > 1 ? 1 : g; }   /* all the light at a point (for the text glow) */
    var pa = airImg.data;
    for (var j = 0; j < BN; j++) {
      var wy0 = -R + (j + 0.5) * step;
      for (var i = 0; i < BN; i++) {
        var o = (j * BN + i) * 4, wx0 = -R + (i + 0.5) * step;
        px[o] = 150; px[o + 1] = 150; px[o + 2] = 155; px[o + 3] = ground(wx0, wy0) * 255;
        pa[o] = 200; pa[o + 1] = 218; pa[o + 2] = 255; pa[o + 3] = air(wx0, wy0) * 255;
      }
    }
    actx.putImageData(airImg, 0, 0);
    bctx.putImageData(beamImg, 0, 0);
    var ox = bx - R, oy = by - R;
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    /* the beam brightens the content under it (colour dodge): dark ground stays dark, grey and coloured items come up */
    blx.setTransform(lightScale, 0, 0, lightScale, 0, 0);
    blx.clearRect(0, 0, W, H);
    blx.imageSmoothingEnabled = true; blx.imageSmoothingQuality = "high";
    blx.globalAlpha = 0.9;
    blx.drawImage(beamCv, ox, oy, 2 * R, 2 * R);
    blx.globalAlpha = 1;
    /* the same beam shape, painted in a fully saturated colour, at a low strength */
    slx.imageSmoothingEnabled = true; slx.imageSmoothingQuality = "high";
    slx.globalAlpha = 0.28; slx.drawImage(beamCv, ox, oy, 2 * R, 2 * R); slx.globalAlpha = 1;
    slx.globalCompositeOperation = "source-in"; slx.fillStyle = "rgb(255,30,90)"; slx.fillRect(ox, oy, 2 * R, 2 * R);
    slx.globalCompositeOperation = "source-over";
    /* the dark page itself is lit too: colour dodge cannot brighten black, so the same beam adds a soft neutral light
       (screen layer) that lifts the page base, kept low so it never reads as a haze over the content */
    c.globalAlpha = 0.32; c.drawImage(beamCv, ox, oy, 2 * R, 2 * R); c.globalAlpha = 1;
    /* the beams in the air: a faint cool-white light you see in front of the lamps */
    c.globalAlpha = 0.42; c.drawImage(airCv, ox, oy, 2 * R, 2 * R); c.globalAlpha = 1;

    /* items that are already white cannot get brighter, so they get a tiny glow where the beam reaches them:
       a soft halo behind each row of white text, and a drop-shadow halo on white buttons */
    if (HL) {
      var changed = false;
      for (var wi = 0; wi < glowWords.length; wi++) {
        var gw = glowWords[wi], lvw = 0;
        var wdx = gw.cx - bx, wdy = gw.cy - sy - by;
        if (Math.abs(wdx) < R + 40 && Math.abs(wdy) < R + 40) {
          var wv = beamVal(wdx, wdy);
          lvw = wv > 0.4 ? 3 : (wv > 0.2 ? 2 : (wv > 0.08 ? 1 : 0));
        }
        if (lvw !== wordLv[wi]) { wordLv[wi] = lvw; changed = true; }
      }
      if (changed) {
        HL.forEach(function (h) { h.clear(); });
        for (var wj = 0; wj < glowWords.length; wj++) if (wordLv[wj]) HL[wordLv[wj] - 1].add(glowWords[wj].range);
      }
    }
    for (var gi = 0; gi < glowEls.length; gi++) {
      var ge = glowEls[gi], gx = ge.l + ge.w / 2, gy = ge.t + ge.h / 2 - sy, lv = 0;
      if (Math.abs(gx - bx) < R + 40 && Math.abs(gy - by) < R + 40) {
        var gv = beamVal(gx - bx, gy - by);
        lv = gv > 0.4 ? 2 : (gv > 0.13 ? 1 : 0);
      }
      if (lv !== ge.lv) {
        if (ge.lv) ge.el.classList.remove("lit-b" + ge.lv);
        if (lv) ge.el.classList.add("lit-b" + lv);
        ge.lv = lv;
      }
    }

    /* edges and surfaces in the beam, drawn to a scratch layer and then masked by the same beam map */
    var EN = Math.ceil(2 * R * lightScale);
    if (edgeCv.width !== EN) { edgeCv.width = edgeCv.height = EN; }
    var e = ectx;
    e.setTransform(lightScale, 0, 0, lightScale, -ox * lightScale, -oy * lightScale);
    e.clearRect(ox, oy, 2 * R, 2 * R);
    var any = false;
    for (var q = 0; q < boxes.length; q++) {
      /* the cached position only picks the blocks near the beam; the edge is drawn where the block is right now, so
         reveal animations, hover lifts and late layout changes cannot leave the highlight off the boundary */
      var bb0 = boxes[q], t0 = bb0.fixed ? bb0.t : bb0.t - sy;
      if (bb0.l > ox + 2 * R + 80 || bb0.l + bb0.w < ox - 80 || t0 > oy + 2 * R + 80 || t0 + bb0.h < oy - 80) continue;
      if (!bb0.el.isConnected) continue;
      var lr = bb0.el.getBoundingClientRect();
      if (lr.width < 2 || lr.height < 2) continue;
      var bb = { l: lr.left, w: lr.width, h: lr.height, rads: bb0.rads, big: bb0.big }, top = lr.top;
      if (bb.l > ox + 2 * R || bb.l + bb.w < ox || top > oy + 2 * R || top + bb.h < oy) continue;
      any = true;
      var col = bb.big ? "rgb(" + COOL + ")" : "rgb(" + WARM + ")";
      var x0 = bb.l, x1 = bb.l + bb.w, y0 = top, y1 = top + bb.h, R4 = bb.rads;
      var inside = bx > x0 && bx < x1 && by > y0 && by < y1;
      if (!bb.big) { e.globalAlpha = 0.2; e.fillStyle = "rgb(" + WARM + ")"; e.beginPath(); rr4(e, x0, y0, bb.w, bb.h, R4); e.fill(); }
      /* only the edges that face the car light up: seen from outside, the near side and not the far side;
         from inside the box, the sides the car is driving towards. Each straight edge runs between its two corners' radii. */
      var sides = [
        [by < y0 || inside, x0 + R4[0], y0, x1 - R4[1], y0],     /* top */
        [by > y1 || inside, x0 + R4[3], y1, x1 - R4[2], y1],     /* bottom */
        [bx < x0 || inside, x0, y0 + R4[0], x0, y1 - R4[3]],     /* left */
        [bx > x1 || inside, x1, y0 + R4[1], x1, y1 - R4[2]]      /* right */
      ];
      e.strokeStyle = col; e.lineCap = "round";
      for (var sd = 0; sd < 4; sd++) {
        var S4 = sides[sd];
        if (!S4[0]) continue;
        e.beginPath(); e.moveTo(S4[1], S4[2]); e.lineTo(S4[3], S4[4]);
        e.globalAlpha = bb.big ? 0.3 : 0.24; e.lineWidth = bb.big ? 7 : 5; e.stroke();
        e.globalAlpha = bb.big ? 0.95 : 0.8; e.lineWidth = bb.big ? 2.2 : 1.4; e.stroke();
      }
      /* the rounded corners light up too, when they face the car, each with its own radius */
      var arcs = [
        [x0 + R4[0], y0 + R4[0], Math.PI, 1.5 * Math.PI, -1, -1, R4[0]],
        [x1 - R4[1], y0 + R4[1], 1.5 * Math.PI, 2 * Math.PI, 1, -1, R4[1]],
        [x1 - R4[2], y1 - R4[2], 0, 0.5 * Math.PI, 1, 1, R4[2]],
        [x0 + R4[3], y1 - R4[3], 0.5 * Math.PI, Math.PI, -1, 1, R4[3]]
      ];
      for (var ac = 0; ac < 4; ac++) {
        var A4 = arcs[ac], rd = A4[6];
        if (rd < 0.5) continue;
        var mx = A4[0] + A4[4] * rd * 0.7071, my = A4[1] + A4[5] * rd * 0.7071;
        if (!inside && ((bx - mx) * A4[4] + (by - my) * A4[5]) <= 0) continue;
        e.beginPath(); e.arc(A4[0], A4[1], rd, A4[2], A4[3]);
        e.globalAlpha = bb.big ? 0.3 : 0.24; e.lineWidth = bb.big ? 7 : 5; e.stroke();
        e.globalAlpha = bb.big ? 0.95 : 0.8; e.lineWidth = bb.big ? 2.2 : 1.4; e.stroke();
      }
    }
    if (any) {
      e.setTransform(1, 0, 0, 1, 0, 0);
      e.globalAlpha = 1; e.globalCompositeOperation = "destination-in";
      e.imageSmoothingEnabled = true;
      e.drawImage(beamCv, 0, 0, EN, EN);
      e.globalCompositeOperation = "source-over";
      c.drawImage(edgeCv, ox, oy, 2 * R, 2 * R);
    }

    /* the lamps are white; each has a small round glow */
    for (var sgn = -1; sgn <= 1; sgn += 2) {
      var hx = cx + dx * 2.17 * K * S + nx * 0.62 * K * S * sgn, hy = cy + dy * 2.17 * K * S + ny * 0.62 * K * S * sgn;
      glow(c, hx, hy, 24 * S, "255,255,255", 1);          /* one glow, bright in the middle and fading out smoothly */
    }
    if (brakeOn) {
      for (var t2 = -1; t2 <= 1; t2 += 2) {
        var tx = cx - dx * 2.24 * K * S + nx * 0.56 * K * S * t2, ty = cy - dy * 2.24 * K * S + ny * 0.56 * K * S * t2;
        glow(c, tx, ty, 20 * S, "255,50,38", 0.8);
      }
    }
  }

  /* ================================================================= loop */
  var running = false, raf = 0, lastT = 0, idleSince = 0;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    scrollNow = window.pageYOffset || 0;
    var sub = 2;
    for (var i = 0; i < sub; i++) step(dt / sub);
    draw(dt);
    drawLight();
    var settled = Math.abs(car.v) < 0.5 && Math.abs(car.delta) < 0.02 && !car.hop && puffs.every(function (p) { return p.age >= 1; });
    var near = pointer && (Math.hypot(goalX - car.x, goalY - car.y) < 14 * S || closeTime > 4.5);
    if (settled && !roam && (near || !pointer)) {
      if (!idleSince) idleSince = t;
      if (t - idleSince > 900) { stopLoop(); }
    } else idleSince = 0;
  }
  function wake() { if (!enabled || running) { idleSince = 0; return; } running = true; idleSince = 0; lastT = performance.now(); raf = requestAnimationFrame(frame); }
  function stopLoop() { running = false; cancelAnimationFrame(raf); }

  function resize() {
    W = root.clientWidth; H = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    lightScale = Math.min(window.devicePixelRatio || 1, 1.5);
    lightCv.width = Math.round(W * lightScale); lightCv.height = Math.round(H * lightScale);
    lightCv.style.width = W + "px"; lightCv.style.height = H + "px";
    satEl.width = lightCv.width; satEl.height = lightCv.height; satEl.style.width = W + "px"; satEl.style.height = H + "px";
    beamEl.width = lightCv.width; beamEl.height = lightCv.height; beamEl.style.width = W + "px"; beamEl.style.height = H + "px";
    cam.left = 0; cam.right = W; cam.top = 0; cam.bottom = -H; cam.updateProjectionMatrix();
    setScale(); route = null;
  }

  /* ================================================================= input */
  function onPointer(e) {
    if (e.pointerType === "mouse" && e.buttons === undefined) return;
    pointer = { x: e.clientX, y: e.clientY };
    if (car.x === 0 && car.y === 0) { car.x = W - 90; car.y = H - 90; }
    if (!roam) wake();
  }
  window.addEventListener("pointermove", onPointer, { passive: true });
  /* tapping the car switches between following the pointer and roaming on its own */
  var toast = document.createElement("div");
  toast.className = "toycar-toast"; toast.setAttribute("role", "status");
  document.body.appendChild(toast);
  var toastTimer = 0;
  function say(msg) {
    toast.textContent = msg; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }
  var carHit = false, carHitTimer = 0;
  function setRoam(on, e) {
    roam = on; route = null; roamGoal = null; roamWaiting = true; roamWaitUntil = simTime + 0.5; lastScrollY = window.pageYOffset || 0;
    if (on) say("Roaming. Tap the car to call it back.");
    else { if (e) pointer = { x: e.clientX, y: e.clientY }; say("Following your pointer."); }
    car.hop = 1; wake();
  }
  window.addEventListener("pointerdown", function (e) {
    if (!enabled) return;
    var hitR = (e.pointerType === "touch" ? 46 : 32) * S;
    if (car.x !== 0 && Math.hypot(e.clientX - car.x, e.clientY - car.y) < hitR && onScreen(0)) {
      carHit = true; clearTimeout(carHitTimer); carHitTimer = setTimeout(function () { carHit = false; }, 500);
      setRoam(!roam, e);
      return;
    }
    onPointer(e);
  }, { passive: true });
  /* a tap that lands on the car should not also press the link or button underneath it */
  window.addEventListener("click", function (e) { if (carHit) { carHit = false; e.preventDefault(); e.stopPropagation(); } }, true);
  window.addEventListener("scroll", function () { wake(); }, { passive: true });
  new MutationObserver(function () { wake(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { wake(); });
  new MutationObserver(function () { scheduleRebuild(30); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener("resize", function () { resize(); scheduleRebuild(200); wake(); });
  if ("ResizeObserver" in window) new ResizeObserver(function () { scheduleRebuild(500); }).observe(document.body);
  new MutationObserver(function () { scheduleRebuild(700); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener("load", function () { scheduleRebuild(300); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scheduleRebuild(200); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stopLoop(); else wake(); });

  /* ================================================================= on/off button */
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "toycar-btn";
  btn.title = "Toy car on or off"; btn.setAttribute("aria-label", "Toy car on or off");
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17h14v-5l-2-5H7l-2 5z"/><circle cx="8" cy="17" r="1.5"/><circle cx="16" cy="17" r="1.5"/><path d="M5 12h14"/></svg>';
  function syncBtn() { btn.setAttribute("aria-pressed", String(enabled)); btn.classList.toggle("on", enabled); canvas.style.display = enabled ? "" : "none"; lightShown = !isDark(); if (!enabled) setLightDisplay(false); }
  btn.addEventListener("click", function () {
    enabled = !enabled; store.set("toycar", enabled ? "on" : "off"); syncBtn();
    lastScrollY = window.pageYOffset || 0;
    if (enabled) { renderer.setSize(W, H, false); wake(); } else stopLoop();
  });
  document.body.appendChild(btn);

  /* ================================================================= start */
  resize();
  syncBtn();
  collectPage();
  car.x = W - 90; car.y = H - 90;
  /* it starts on a street, in a blank space, and roams from there; tapping it makes it follow the pointer */
  (function () {
    var spot = blankSpot(0);
    if (spot) { car.x = spot.x; car.y = spot.y; car.th = rnd(-3, 3); }
  })();
  lastScrollY = window.pageYOffset || 0;
  draw(0.016);
  drawLight();
  wake();
  if (store.get("toycar-hint", "") !== "seen") { store.set("toycar-hint", "seen"); setTimeout(function () { say("The car roams on its own. Tap it to make it follow your pointer."); }, 1800); }
})();
