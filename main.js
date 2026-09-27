/* ==========================================================================
   PRIMECUT — поведение сайта
   1. Появление при загрузке, меню
   2. Заглушки-силуэты людей
   3. 3D-фотоаппарат: собирается из блоков и летит через весь сайт
   4. Эффекты прокрутки: ленты кадров, текст по словам, полароиды,
      горизонтальный «Путь проекта», наклон карточек, плёнка, стопка проектов
   5. Каталог специалистов, перевёртыши, вкладки
   6. Формы: проверка и отправка
   ========================================================================== */

(function () {
  "use strict";

  const CONFIG = window.PRIMECUT_CONFIG || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollBehavior = reduced ? "auto" : "smooth";
  const isMobile = () => window.innerWidth < 768;

  const yearEl = $("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  $$("[data-hide-if-empty]").forEach((a) => { if (a.getAttribute("href") === "#") a.hidden = true; });

  /* ---------- 1. Загрузка и меню ---------- */

  requestAnimationFrame(() => document.body.classList.add("is-loaded"));

  const burger = $(".burger");
  const menu = $("#menu");
  function openMenu() {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add("is-open"));
    burger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    const first = $(".menu__links a", menu);
    if (first) first.focus();
  }
  function closeMenu(restoreFocus = true) {
    menu.classList.remove("is-open");
    menu.hidden = true;
    burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (restoreFocus) burger.focus();
  }
  if (burger && menu) {
    burger.addEventListener("click", openMenu);
    $(".menu__close", menu).addEventListener("click", () => closeMenu());
    $$("[data-menu-link]", menu).forEach((a) => a.addEventListener("click", () => closeMenu(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) closeMenu(); });
  }

  // Заголовки секций выезжают, когда попадают на экран
  const revealEls = $$("[data-reveal]");
  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- 2. Силуэты-заглушки ---------- */

  function silhouette(kind) {
    const body =
      '<path d="M22 250c4-58 38-92 78-92s74 34 78 92z" fill="#B7A3EE"/>' +
      '<rect x="86" y="128" width="28" height="36" rx="12" fill="#C9B9F4"/>' +
      '<circle cx="100" cy="100" r="40" fill="#D4C6F7"/>';
    const extras = {
      camera:
        '<rect x="58" y="86" width="84" height="52" rx="10" fill="#15161a"/><rect x="68" y="77" width="28" height="13" rx="3" fill="#15161a"/>' +
        '<circle cx="100" cy="112" r="18" fill="#2b2d33"/><circle cx="100" cy="112" r="11" fill="#5E0ED7"/><circle cx="96" cy="108" r="3" fill="#fff" opacity=".7"/>' +
        '<circle cx="56" cy="126" r="11" fill="#C9B9F4"/><circle cx="144" cy="126" r="11" fill="#C9B9F4"/>',
      phone:
        '<rect x="120" y="84" width="32" height="56" rx="7" fill="#15161a"/><rect x="124" y="90" width="24" height="42" rx="4" fill="#7B3BFF"/>' +
        '<circle cx="130" cy="142" r="12" fill="#C9B9F4"/>',
      headphones:
        '<path d="M58 104a42 42 0 0 1 84 0" fill="none" stroke="#15161a" stroke-width="9"/>' +
        '<rect x="50" y="96" width="18" height="32" rx="8" fill="#15161a"/><rect x="132" y="96" width="18" height="32" rx="8" fill="#15161a"/>',
      plain: "",
    };
    return `<svg class="sil" viewBox="0 0 200 250" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${body}${extras[kind] || ""}</svg>`;
  }
  $$("[data-sil]").forEach((el) => el.insertAdjacentHTML("beforeend", silhouette(el.dataset.sil)));

  /* ---------- 3. Фотоаппарат ---------- */

  const camLayer = $(".cam-layer");
  const cam = $("#cam");
  const mover = $(".cam-mover");
  const flash = $(".cam-flash");
  let camReady = false;

  function buildCamera(root) {
    const part = (x, y, z) => {
      const p = document.createElement("div");
      p.className = "part";
      p.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
      root.append(p);
      return p;
    };
    const face = (parent, cls, w, h, transform, shade, html) => {
      const f = document.createElement("div");
      f.className = `cf ${cls}`;
      f.style.cssText = `width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;transform:${transform};--shade:${shade}`;
      if (html) f.innerHTML = html;
      parent.append(f);
      return f;
    };
    const box = (parent, w, h, d, c, html = {}) => {
      face(parent, c.front || c.side, w, h, `translateZ(${d / 2}px)`, 0, html.front);
      face(parent, c.back || c.side, w, h, `rotateY(180deg) translateZ(${d / 2}px)`, 0.2, html.back);
      face(parent, c.side, d, h, `rotateY(90deg) translateZ(${w / 2}px)`, 0.35);
      face(parent, c.side, d, h, `rotateY(-90deg) translateZ(${w / 2}px)`, 0.12);
      face(parent, c.top, w, d, `rotateX(90deg) translateZ(${h / 2}px)`, 0, html.top);
      face(parent, "cf--bottom", w, d, `rotateX(-90deg) translateZ(${h / 2}px)`, 0.3);
    };

    // Корпус 260 × 150 × 90
    box(part(0, 0, 0), 260, 150, 90, { side: "cf--leather", top: "cf--silver" }, {
      front: '<span class="cam-brand">PRIMECUT</span><span class="cam-dot"></span><span class="cam-flashwin"></span>',
      top: '<span class="cam-dial" style="left:22px;top:26px"></span><span class="cam-shoe" style="left:105px;top:36px"></span><span class="cam-shutter" style="left:196px;top:33px"></span>',
      back: '<span class="cam-screen"></span><span class="cam-btn" style="left:192px;top:44px"></span><span class="cam-btn" style="left:222px;top:44px"></span><span class="cam-btn" style="left:207px;top:74px"></span><span class="cam-btn" style="left:192px;top:104px"></span><span class="cam-btn" style="left:222px;top:104px"></span>',
    });
    // Видоискатель сверху
    box(part(0, -93, -4), 86, 36, 62, { side: "cf--silver", top: "cf--silver", front: "cf--dark" });
    // Рукоять справа
    box(part(104, 12, 57), 44, 118, 24, { side: "cf--dark", top: "cf--dark" });

    // Объектив: цилиндр из граней
    const lens = part(-12, 10, 45);
    const cylinder = (r, len, z0, cls) => {
      const n = 24;
      const w = 2 * r * Math.tan(Math.PI / n) + 0.8;
      for (let i = 0; i < n; i++) {
        const a = (360 / n) * i;
        const shade = 0.32 - 0.3 * Math.cos(((a + 45) * Math.PI) / 180);
        face(lens, cls, w, len, `rotateZ(${a}deg) translate3d(0, ${-r}px, ${z0 + len / 2}px) rotateX(90deg)`, shade.toFixed(2));
      }
    };
    cylinder(54, 66, 0, "cf--barrel");
    cylinder(57, 22, 16, "cf--ridges");
    face(lens, "cam-rim", 114, 114, "translateZ(66.6px)", 0);
    face(lens, "cam-glass", 100, 100, "translateZ(66.3px)", 0,
      '<svg viewBox="0 0 200 200" aria-hidden="true"><defs>' +
      '<radialGradient id="cgGlass" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0b0614"/><stop offset=".55" stop-color="#1c0b3a"/><stop offset=".85" stop-color="#2d0e63"/><stop offset="1" stop-color="#09060f"/></radialGradient>' +
      '<radialGradient id="cgGlowA" cx=".3" cy=".72" r=".6"><stop offset="0" stop-color="#7B3BFF" stop-opacity=".95"/><stop offset=".5" stop-color="#5E0ED7" stop-opacity=".35"/><stop offset="1" stop-color="#5E0ED7" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="cgGlowB" cx=".72" cy=".28" r=".5"><stop offset="0" stop-color="#FF8FC7" stop-opacity=".55"/><stop offset="1" stop-color="#FF8FC7" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="cgSpec" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '</defs><circle cx="100" cy="100" r="100" fill="#0c0d10"/><circle cx="100" cy="100" r="86" fill="url(#cgGlass)"/>' +
      '<circle cx="100" cy="100" r="86" fill="url(#cgGlowA)"/><circle cx="100" cy="100" r="86" fill="url(#cgGlowB)"/>' +
      '<circle cx="100" cy="100" r="58" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/><circle cx="100" cy="100" r="34" fill="#050407"/>' +
      '<circle cx="100" cy="100" r="13" fill="#000"/><ellipse cx="70" cy="64" rx="30" ry="13" transform="rotate(-35 70 64)" fill="url(#cgSpec)"/>' +
      '<circle cx="130" cy="134" r="5" fill="#fff" opacity=".5"/></svg>');
  }

  // Точки маршрута фотоаппарата: элементы .cam-anchor в разметке
  const anchors = $$(".cam-anchor").map((el) => {
    const parse = (s) => (s || "").split(",").map(Number);
    return { el, d: parse(el.dataset.cam), m: parse(el.dataset.camM || el.dataset.cam), y: 0 };
  });

  const camState = { x: 0, y: 0, s: 1, init: false };
  let scrollVel = 0;

  if (camLayer && cam && CONFIG.camera !== false) {
    buildCamera(cam);
    camReady = true;
  } else if (camLayer) {
    camLayer.remove();
  }

  function camTarget(scrollY) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mobile = isMobile();
    const base = mobile ? 1 : clamp(vw / 1440, 0.62, 1.15);
    const probe = scrollY + vh / 2;
    const list = anchors;
    if (!list.length) return { x: vw / 2, y: vh / 2, s: base };
    const pick = (a) => (mobile ? a.m : a.d);
    let a = list[0], b = list[0], t = 0;
    if (probe <= list[0].y) { a = b = list[0]; }
    else if (probe >= list[list.length - 1].y) { a = b = list[list.length - 1]; }
    else {
      for (let i = 0; i < list.length - 1; i++) {
        if (probe >= list[i].y && probe < list[i + 1].y) {
          a = list[i]; b = list[i + 1];
          t = smooth((probe - a.y) / Math.max(1, b.y - a.y));
          break;
        }
      }
    }
    const pa = pick(a), pb = pick(b);
    return { x: lerp(pa[0], pb[0], t) * vw, y: lerp(pa[1], pb[1], t) * vh, s: lerp(pa[2], pb[2], t) * base };
  }

  function updateCamera(time, dt, scrollY) {
    if (!camReady) return;
    const target = camTarget(scrollY);
    if (!camState.init) { Object.assign(camState, target, { init: true }); }
    const k = reduced ? 1 : Math.min(1, dt * 5);
    camState.x += (target.x - camState.x) * k;
    camState.y += (target.y - camState.y) * k;
    camState.s += (target.s - camState.s) * k;

    if (reduced) {
      mover.style.transform = `translate3d(${camState.x}px, ${camState.y}px, 0) scale(${camState.s})`;
      cam.style.transform = "rotateX(-12deg) rotateY(-28deg)";
      camLayer.style.opacity = scrollY < window.innerHeight * 0.6 ? "1" : "0";
      return;
    }
    const bob = Math.sin(time * 1.4) * 6;
    mover.style.transform = `translate3d(${camState.x.toFixed(1)}px, ${(camState.y + bob).toFixed(1)}px, 0) scale(${camState.s.toFixed(3)})`;
    const ry = time * 28 + scrollY * 0.12;
    const rx = -14 + Math.sin(time * 0.9) * 6 + clamp(scrollVel * 0.02, -14, 14);
    const rz = Math.sin(time * 0.6) * 5 + clamp(scrollVel * -0.015, -10, 10);
    cam.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${(ry % 360).toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
  }

  function fireFlash() {
    if (!camReady || reduced) return;
    flash.style.setProperty("--fx", `${(camState.x / window.innerWidth) * 100}%`);
    flash.style.setProperty("--fy", `${(camState.y / window.innerHeight) * 100}%`);
    flash.classList.remove("is-on");
    void flash.offsetWidth;
    flash.classList.add("is-on");
    cam.classList.add("is-flash");
    setTimeout(() => cam.classList.remove("is-flash"), 450);
  }

  const contactSection = $("#contacts");
  if (contactSection && "IntersectionObserver" in window) {
    const fo = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { fireFlash(); fo.disconnect(); }
    }, { threshold: 0.35 });
    fo.observe(contactSection);
  }

  /* ---------- 4. Эффекты прокрутки ---------- */

  // Позиция элемента на странице без учёта его трансформаций
  const docTop = (el) => { let y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; };

  // Ленты кадров
  const reel = $(".reel");
  const reelRows = $(".reel__rows");
  const row1 = $('[data-row="1"]');
  const row2 = $('[data-row="2"]');
  let row1Set = 0;

  function makeTile(name, index, sil) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.dataset.ph = String(index % 6);
    if (sil) {
      const slot = document.createElement("div");
      slot.className = "media-slot";
      slot.innerHTML = silhouette(sil);
      tile.append(slot);
    }
    if (name) {
      const isVideo = /\.(mp4|webm)$/i.test(name);
      const media = document.createElement(isVideo ? "video" : "img");
      if (isVideo) {
        media.muted = true; media.loop = true; media.autoplay = true; media.playsInline = true;
        media.setAttribute("muted", ""); media.setAttribute("playsinline", "");
      } else {
        media.alt = ""; media.loading = "lazy"; media.decoding = "async";
      }
      media.addEventListener("error", () => media.remove());
      media.addEventListener(isVideo ? "loadeddata" : "load", () => tile.classList.add("has-media"));
      media.src = name;
      tile.append(media);
    }
    return tile;
  }
  const sils = ["camera", "", "phone", "", "headphones", ""];
  function fillRow(row, names, offset) {
    const list = names.length ? names : new Array(6).fill("");
    for (let copy = 0; copy < 3; copy++) {
      list.forEach((name, i) => row.append(makeTile(name, i + offset, sils[(i + offset) % sils.length])));
    }
  }
  if (row1 && row2) {
    const works = Array.isArray(CONFIG.works) ? CONFIG.works.filter(Boolean) : [];
    const half = Math.ceil(works.length / 2);
    fillRow(row1, works.slice(0, half), 0);
    fillRow(row2, works.slice(half), 3);
  }

  // Текст «О нас» проявляется по словам
  const words = [];
  const wordText = $("[data-words]");
  if (wordText && !reduced) {
    const html = wordText.innerHTML.trim();
    const srCopy = document.createElement("p");
    srCopy.className = "visually-hidden";
    srCopy.innerHTML = html;
    wordText.before(srCopy);
    wordText.setAttribute("aria-hidden", "true");
    wordText.innerHTML = html.split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
    words.push(...$$(".w", wordText));
  }

  // Полароиды, путь, карточки, плёнка, стопка
  const polaroids = $$("[data-spin]");
  const manifesto = $(".manifesto");
  const path = $(".path");
  const pathTrack = $(".path__track");
  const pathBar = $(".path__bar span");
  const stages = $$(".stage");
  const timecode = $("[data-timecode]");
  const tilts = $$("[data-tilt]");
  const strip = $("[data-strip]");
  const filmstrip = $(".filmstrip");
  const stack = $("[data-stack]");
  const projects = stack ? $$(".project", stack) : [];
  const heroStats = $(".hero__stats");
  const heroTitle = $(".hero__title");

  if (strip) {
    for (let i = 0; i < 36; i++) {
      const f = document.createElement("span");
      f.className = "frame";
      strip.append(f);
    }
  }

  const pos = {};
  function measure() {
    if (path && pathTrack && !reduced) {
      const extra = Math.max(0, pathTrack.scrollWidth - window.innerWidth);
      path.style.height = `${extra + window.innerHeight * 1.25}px`;
    }
    pos.reel = reel ? docTop(reel) : 0;
    pos.manifesto = manifesto ? docTop(manifesto) : 0;
    pos.path = path ? docTop(path) : 0;
    pos.pathH = path ? path.offsetHeight : 0;
    pos.film = filmstrip ? docTop(filmstrip) : 0;
    pos.stack = stack ? docTop(stack) : 0;
    pos.stackH = stack ? stack.offsetHeight : 0;
    tilts.forEach((el) => { el._top = docTop(el); el._h = el.offsetHeight; });
    anchors.forEach((a) => { a.y = docTop(a.el); });
    anchors.sort((a, b) => a.y - b.y);
    if (row1) row1Set = row1.scrollWidth / 3;
    fitHeroTitle();
    fitFooterMark();
    needsScroll = true;
  }

  function fitHeroTitle() {
    if (!heroTitle) return;
    heroTitle.style.fontSize = "";
    const row = heroTitle.parentElement;
    const desc = $(".hero__desc", row);
    const gap = parseFloat(getComputedStyle(row).columnGap) || 12;
    const stacked = getComputedStyle(row).flexDirection === "column";
    const available = stacked ? row.clientWidth : row.clientWidth - (desc ? desc.offsetWidth : 0) - gap;
    const widest = Math.max(...$$(".hw > span", heroTitle).map((s) => s.getBoundingClientRect().width));
    if (widest > available && available > 0) {
      const size = parseFloat(getComputedStyle(heroTitle).fontSize);
      heroTitle.style.fontSize = `${Math.floor(size * (available / widest) * 0.98)}px`;
    }
  }

  const footerMark = $(".footer__mark");
  function fitFooterMark() {
    if (!footerMark) return;
    footerMark.style.fontSize = "";
    const range = document.createRange();
    range.selectNodeContents(footerMark);
    const width = range.getBoundingClientRect().width;
    const available = footerMark.clientWidth;
    if (width > available) {
      const size = parseFloat(getComputedStyle(footerMark).fontSize);
      footerMark.style.fontSize = `${Math.floor(size * (available / width) * 0.98)}px`;
    }
  }

  function updateScroll(sy) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Первый экран: лёгкий параллакс
    if (sy < vh * 1.2 && !reduced) {
      if (heroStats) heroStats.style.transform = `translate3d(0, ${sy * 0.25}px, 0)`;
      if (heroTitle) heroTitle.style.transform = `translate3d(0, ${sy * -0.08}px, 0)`;
    }

    // Ленты кадров: едут в разные стороны и наклоняются
    if (reel && row1 && row2) {
      const offset = (sy - pos.reel + vh) * 0.3;
      row1.style.transform = `translate3d(${(offset - 200 - row1Set).toFixed(1)}px, 0, 0)`;
      row2.style.transform = `translate3d(${(-(offset - 200)).toFixed(1)}px, 0, 0)`;
      if (!reduced && reelRows) {
        const p = clamp((sy + vh / 2 - (pos.reel + reel.offsetHeight / 2)) / vh, -1, 1);
        reelRows.style.transform = `rotateX(${(-p * 16).toFixed(2)}deg) rotateZ(${(-p * 2.5).toFixed(2)}deg)`;
      }
    }

    // Слова и полароиды
    if (manifesto) {
      const local = sy - pos.manifesto;
      if (words.length) {
        const r = wordText.getBoundingClientRect();
        const progress = clamp((vh * 0.85 - r.top) / (vh * 0.5 + r.height), 0, 1);
        const lit = Math.round(progress * words.length);
        words.forEach((w, i) => { const on = i < lit; if (w._on !== on) { w.style.opacity = on ? "1" : ""; w._on = on; } });
      }
      if (!reduced) {
        polaroids.forEach((p) => {
          const rot = parseFloat(p.dataset.spin) + local * parseFloat(p.dataset.rate);
          const ty = local * parseFloat(p.dataset.par);
          p.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
        });
      }
    }

    // Путь проекта: горизонтальная прокрутка
    if (path && pathTrack && !reduced) {
      const p = clamp((sy - pos.path) / Math.max(1, pos.pathH - vh), 0, 1);
      const extra = Math.max(0, pathTrack.scrollWidth - vw);
      const shift = clamp(p / 0.85, 0, 1) * extra;
      pathTrack.style.transform = `translate3d(${(-shift).toFixed(1)}px, 0, 0)`;
      if (pathBar) pathBar.style.setProperty("--p", p.toFixed(3));
      const n = stages.length;
      stages.forEach((st, i) => {
        const lp = clamp((p - i / n) * n * 1.15 + 0.25, 0, 1);
        st.style.setProperty("--lp", lp.toFixed(3));
        const art = st.querySelector(".stage__art");
        if (art) {
          const center = st.offsetLeft - shift + st.offsetWidth / 2;
          const d = clamp((center - vw / 2) / vw, -1, 1);
          art.style.transform = `perspective(1200px) rotateY(${(-d * 38).toFixed(2)}deg) rotateZ(${(d * 3).toFixed(2)}deg)`;
        }
      });
      if (timecode && stages[0]) {
        const secs = Math.round(parseFloat(stages[0].style.getPropertyValue("--lp") || 0) * 14);
        timecode.textContent = `00:00:${String(secs).padStart(2, "0")}`;
      }
    }

    // Карточки услуг и специалистов наклоняются и переворачиваются
    if (!reduced) {
      tilts.forEach((el, i) => {
        if (el.hidden) return;
        // Перевёрнутую карточку не наклоняем, чтобы по кнопкам на обороте было легко попасть
        if (el.classList.contains("is-flipped")) {
          if (el.style.transform) { el.style.transform = ""; el.style.opacity = ""; }
          return;
        }
        const center = el._top + el._h / 2 - sy;
        const t = clamp((center - vh / 2) / (vh / 2 + el._h / 2), -1, 1);
        if (Math.abs(t) >= 1) return;
        const side = i % 2 ? -1 : 1;
        const flipIn = t > 0.45 ? ((t - 0.45) / 0.55) * 75 : 0;
        const rx = t * 22;
        const ry = side * (t * 10 + flipIn);
        const tz = -Math.abs(t) * 90;
        el.style.transform = `translate3d(0, 0, ${tz.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        el.style.opacity = String(clamp(1 - (t - 0.7) / 0.3, 0.15, 1).toFixed(3));
      });
    }

    // Плёнка
    if (strip && filmstrip && !reduced) {
      const local = sy - pos.film + vh;
      strip.style.transform = `translate3d(${(-local * 0.55).toFixed(1)}px, 0, 0)`;
      const band = strip.parentElement;
      const p = clamp((sy + vh / 2 - pos.film) / vh, -1, 1);
      band.style.transform = `translateY(-50%) rotate(${(-4 + p * 4).toFixed(2)}deg)`;
    }

    // Стопка проектов
    if (projects.length && !reduced) {
      const total = pos.stackH - vh;
      const p = total > 0 ? clamp((sy - pos.stack) / total, 0, 1) : 0;
      const n = projects.length;
      projects.forEach((card, i) => {
        const target = 1 - (n - 1 - i) * 0.04;
        const start = i / n;
        const t = clamp((p - start) / (1 - start), 0, 1);
        const rot = (i % 2 ? 1.6 : -1.6) * t * (n - 1 - i);
        card.style.transform = `scale(${(1 + (target - 1) * t).toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
      });
    }
  }

  /* ---------- Единый цикл анимации ---------- */

  let needsScroll = true;
  let lastScroll = -1;
  let lastTime = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    const sy = window.scrollY;
    const delta = sy - (lastScroll < 0 ? sy : lastScroll);
    scrollVel = lerp(scrollVel, delta / Math.max(dt, 0.001) / 10, 0.15);
    if (needsScroll || sy !== lastScroll) {
      updateScroll(sy);
      needsScroll = false;
      lastScroll = sy;
    }
    updateCamera(now / 1000, dt, sy);
    requestAnimationFrame(frame);
  }

  measure();
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if ("ResizeObserver" in window) {
    let lastH = 0;
    new ResizeObserver(() => {
      const h = document.body.scrollHeight;
      if (Math.abs(h - lastH) > 2) { lastH = h; measure(); }
    }).observe(document.body);
  }
  requestAnimationFrame(frame);

  /* ---------- 5. Специалисты и вкладки ---------- */

  const people = $$(".person");
  const filters = $$(".filter");
  const categoryField = $("#r-category");
  const specialistField = $("#r-specialist");
  const tabs = $$('[role="tab"]');

  const countEl = $("[data-count-pros]");
  if (countEl && people.length) countEl.textContent = String(people.length);

  function applyFilter(category) {
    filters.forEach((f) => f.setAttribute("aria-pressed", String(f.dataset.filter === category)));
    people.forEach((p) => { p.hidden = category !== "all" && p.dataset.category !== category; });
    measure();
  }
  filters.forEach((f) => f.addEventListener("click", () => applyFilter(f.dataset.filter)));

  function setFlipped(card, on, focus) {
    card.classList.toggle("is-flipped", on);
    if (on) { card.style.transform = ""; card.style.opacity = ""; }
    needsScroll = true;
    const front = $(".person__front", card);
    const back = $(".person__back", card);
    front.inert = on;
    back.inert = !on;
    if (focus) {
      const target = on ? $("[data-choose]", back) : $(".person__more", front);
      if (target) setTimeout(() => target.focus({ preventScroll: true }), 50);
    }
  }
  $$("[data-flip-card]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".person");
      setFlipped(card, !card.classList.contains("is-flipped"), true);
    });
  });

  function roleOf(card) {
    const el = $(".person__role", card);
    let role = el ? el.textContent.trim() : "";
    if (/^[A-ZА-ЯЁ][a-zа-яё]/.test(role)) role = role[0].toLowerCase() + role.slice(1);
    return role;
  }

  function fillSpecialists() {
    if (!specialistField || !categoryField) return;
    const category = categoryField.value;
    const previous = specialistField.value;
    const first = specialistField.options[0];
    specialistField.innerHTML = "";
    specialistField.append(first);
    people
      .filter((p) => !category || category === "mixed" || p.dataset.category === category)
      .forEach((p) => {
        const role = roleOf(p);
        specialistField.append(new Option(p.dataset.name + (role ? `, ${role}` : ""), p.dataset.name));
      });
    if ($$("option", specialistField).some((o) => o.value === previous)) specialistField.value = previous;
  }
  function markChosen(name) {
    people.forEach((p) => p.classList.toggle("is-selected", p.dataset.name === name));
  }
  if (categoryField) {
    fillSpecialists();
    categoryField.addEventListener("change", fillSpecialists);
    specialistField.addEventListener("change", () => markChosen(specialistField.value));
  }

  function selectTab(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        selectTab(tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length], true);
      }
    });
  });
  $$("[data-open-tab]").forEach((link) => {
    link.addEventListener("click", () => {
      const tab = document.getElementById(link.dataset.openTab);
      if (tab) selectTab(tab);
    });
  });

  $$("[data-choose]").forEach((btn) => {
    const card = btn.closest(".person");
    btn.setAttribute("aria-label", `Выбрать: ${card.dataset.name}`);
    btn.addEventListener("click", () => {
      selectTab($("#tab-request"));
      categoryField.value = card.dataset.category;
      fillSpecialists();
      specialistField.value = card.dataset.name;
      markChosen(card.dataset.name);
      setFlipped(card, false, false);
      $("#contacts").scrollIntoView({ behavior: scrollBehavior, block: "start" });
      $("#r-task").focus({ preventScroll: true });
    });
  });

  /* ---------- 6. Формы ---------- */

  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function isFilled(el) {
    if (el.type === "checkbox") return el.checked;
    const value = el.value.trim();
    return el.name === "task" ? value.length >= 5 : value.length >= 2;
  }
  function setError(el, show) {
    const errorEl = document.getElementById(`${el.id}-error`);
    el.setAttribute("aria-invalid", show ? "true" : "false");
    if (errorEl) errorEl.hidden = !show;
    if (show && errorEl) el.setAttribute("aria-describedby", errorEl.id);
    else el.removeAttribute("aria-describedby");
  }
  function readValue(el) {
    if (el.tagName === "SELECT") return el.selectedOptions[0] ? el.selectedOptions[0].text : "";
    return el.value.trim();
  }

  function setupForm(form) {
    const required = $$("[required]", form);
    const status = $(".form__status", form);
    const submit = $('button[type="submit"]', form);
    const submitText = submit.textContent;

    required.forEach((el) => {
      const evt = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
      el.addEventListener(evt, () => {
        if (el.getAttribute("aria-invalid") === "true" && isFilled(el)) setError(el, false);
      });
    });

    function showStatus(html, isError) {
      status.innerHTML = html;
      status.classList.toggle("form__status--error", Boolean(isError));
      status.hidden = false;
      status.focus({ preventScroll: true });
      status.scrollIntoView({ behavior: scrollBehavior, block: "nearest" });
    }
    function done() {
      showStatus(`<h3>${escapeHTML(form.dataset.successTitle)}</h3><p>${escapeHTML(form.dataset.successText)}</p>`);
      form.reset();
      if (form.id === "request-form") { fillSpecialists(); markChosen(""); }
      fireFlash();
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.hidden = true;
      let firstInvalid = null;
      required.forEach((el) => {
        const ok = isFilled(el);
        setError(el, !ok);
        if (!ok && !firstInvalid) firstInvalid = el;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      const trap = $("[data-honeypot]", form);
      if (trap && trap.value) { done(); return; }

      const entries = $$("[data-label]", form).map((el) => [el.dataset.label, readValue(el)]).filter(([, v]) => v);
      const settings = CONFIG.forms || {};
      const contact = CONFIG.contact || {};

      if (settings.endpoint) {
        submit.disabled = true;
        submit.textContent = "Отправляем…";
        try {
          const res = await fetch(settings.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ ...Object.fromEntries(entries), _subject: form.dataset.title }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          done();
        } catch (err) {
          showStatus(`<h3>Не отправилось</h3><p>Проверьте интернет и нажмите кнопку ещё раз. Или напишите нам: <a href="${escapeHTML(contact.href || "#")}" target="_blank" rel="noopener">${escapeHTML(contact.display || "")}</a></p>`, true);
        } finally {
          submit.disabled = false;
          submit.textContent = submitText;
        }
        return;
      }

      const text = [form.dataset.title, ...entries.map(([k, v]) => `${k}: ${v}`)].join("\n");
      const tgUrl = `https://t.me/${settings.telegram || ""}`;
      const copying = navigator.clipboard && window.isSecureContext
        ? navigator.clipboard.writeText(text).then(() => true, () => false)
        : Promise.resolve(false);
      window.open(tgUrl, "_blank", "noopener");
      const copied = await copying;
      showStatus(
        `<h3>Осталось отправить в Telegram</h3>
         <p>${copied ? "Текст скопирован. Вставьте его в чат с PRIMECUT и отправьте." : "Скопируйте текст ниже и отправьте его в чат с PRIMECUT в Telegram."}</p>
         <div class="form__copy">${escapeHTML(text)}</div>
         <a class="btn-outline" href="${escapeHTML(tgUrl)}" target="_blank" rel="noopener">Открыть чат в Telegram</a>`
      );
    });
  }
  $$("form[data-form]").forEach(setupForm);
})();
