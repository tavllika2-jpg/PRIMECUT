/* ==========================================================================
   PRIMECUT — поведение сайта
   1. Появление блоков при прокрутке
   2. Заголовок PRIMECUT во всю ширину
   3. Магнит: картинка на первом экране тянется за курсором
   4. Бегущие ленты работ, которые едут при прокрутке
   5. Текст «О нас» проявляется по буквам
   6. Карточки проектов складываются стопкой
   7. Каталог специалистов и вкладки форм
   8. Формы: проверка и отправка
   ========================================================================== */

(function () {
  "use strict";

  const CONFIG = window.PRIMECUT_CONFIG || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollBehavior = reduced ? "auto" : "smooth";

  const yearEl = $("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Кнопки и ссылки с href="#" (не заполнены) прячем
  $$("[data-hide-if-empty]").forEach((a) => { if (a.getAttribute("href") === "#") a.hidden = true; });

  /* ---------- 1. Появление при прокрутке ---------- */

  const fadeEls = $$("[data-fade]");
  fadeEls.forEach((el) => {
    const d = el.dataset;
    if (d.x !== undefined) el.style.setProperty("--fx", `${d.x}px`);
    if (d.y !== undefined) el.style.setProperty("--fy", `${d.y}px`);
    if (d.delay !== undefined) el.style.setProperty("--fdelay", `${d.delay}s`);
    if (d.duration !== undefined) el.style.setProperty("--fd", `${d.duration}s`);
  });

  if (reduced || !("IntersectionObserver" in window)) {
    fadeEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "50px", threshold: 0 });
    fadeEls.forEach((el) => io.observe(el));
  }

  /* ---------- 2. Заголовок во всю ширину ---------- */

  const heroTitle = $(".hero__title");
  const heroWord = $(".hero__word");
  function fitTitle() {
    if (!heroTitle || !heroWord) return;
    heroTitle.style.fontSize = "";
    const available = heroTitle.clientWidth * 0.97;
    const width = heroWord.getBoundingClientRect().width;
    if (width > available) {
      const size = parseFloat(getComputedStyle(heroTitle).fontSize);
      heroTitle.style.fontSize = `${Math.floor(size * (available / width))}px`;
    }
  }
  fitTitle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);

  /* ---------- 3. Магнит ---------- */

  const magnet = $("[data-magnet]");
  if (magnet && !reduced && window.matchMedia("(pointer: fine)").matches) {
    const PADDING = 150;
    const STRENGTH = 3;
    let active = false;
    window.addEventListener("mousemove", (e) => {
      const r = magnet.getBoundingClientRect();
      const inside =
        e.clientX > r.left - PADDING && e.clientX < r.right + PADDING &&
        e.clientY > r.top - PADDING && e.clientY < r.bottom + PADDING;
      if (inside) {
        if (!active) { active = true; magnet.style.transition = "transform 0.3s ease-out"; }
        const dx = (e.clientX - (r.left + r.width / 2)) / STRENGTH;
        const dy = (e.clientY - (r.top + r.height / 2)) / STRENGTH;
        magnet.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      } else if (active) {
        active = false;
        magnet.style.transition = "transform 0.6s ease-in-out";
        magnet.style.transform = "translate3d(0, 0, 0)";
      }
    }, { passive: true });
  }

  /* ---------- 4. Бегущие ленты ---------- */

  const marquee = $(".marquee");
  const row1 = $('[data-row="1"]');
  const row2 = $('[data-row="2"]');
  let row1SetWidth = 0;

  function makeTile(name, index) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.dataset.ph = String(index % 6);
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
      media.src = name;
      tile.append(media);
    }
    return tile;
  }

  function fillRow(row, names, offset) {
    const list = names.length ? names : new Array(6).fill("");
    for (let copy = 0; copy < 3; copy++) {
      list.forEach((name, i) => row.append(makeTile(name, i + offset)));
    }
  }

  if (marquee && row1 && row2) {
    const works = Array.isArray(CONFIG.works) ? CONFIG.works.filter(Boolean) : [];
    const half = Math.ceil(works.length / 2);
    fillRow(row1, works.slice(0, half), 0);
    fillRow(row2, works.slice(half), 3);
  }

  function measureRows() {
    if (row1) row1SetWidth = row1.scrollWidth / 3;
  }

  function updateMarquee() {
    if (!marquee) return;
    const rect = marquee.getBoundingClientRect();
    if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
    const sectionTop = rect.top + window.scrollY;
    const offset = (window.scrollY - sectionTop + window.innerHeight) * 0.3;
    row1.style.transform = `translate3d(${offset - 200 - row1SetWidth}px, 0, 0)`;
    row2.style.transform = `translate3d(${-(offset - 200)}px, 0, 0)`;
  }

  /* ---------- 5. Текст по буквам ---------- */

  const scrollText = $("[data-scroll-text]");
  let chars = [];
  if (scrollText && !reduced) {
    const text = scrollText.textContent.trim();
    // Копия для экранных дикторов: они читают текст целиком, а не по буквам
    const srCopy = document.createElement("p");
    srCopy.className = "visually-hidden";
    srCopy.textContent = text;
    scrollText.before(srCopy);
    scrollText.setAttribute("aria-hidden", "true");
    scrollText.textContent = "";
    const words = text.split(/\s+/);
    words.forEach((word, wi) => {
      const w = document.createElement("span");
      w.className = "w";
      for (const ch of word) {
        const c = document.createElement("span");
        c.className = "ch";
        c.textContent = ch;
        w.append(c);
        chars.push(c);
      }
      scrollText.append(w);
      if (wi < words.length - 1) scrollText.append(" ");
    });
  }

  function updateText() {
    if (!chars.length) return;
    const r = scrollText.getBoundingClientRect();
    const vh = window.innerHeight;
    // Как offset ['start 0.8', 'end 0.2']
    const progress = clamp((vh * 0.8 - r.top) / (vh * 0.6 + r.height), 0, 1);
    const n = chars.length;
    const pos = progress * n;
    for (let i = 0; i < n; i++) {
      const local = clamp(pos - i, 0, 1);
      const opacity = (0.2 + 0.8 * local).toFixed(3);
      if (chars[i]._o !== opacity) { chars[i].style.opacity = opacity; chars[i]._o = opacity; }
    }
  }

  /* ---------- 6. Стопка карточек ---------- */

  const stack = $("[data-stack]");
  const cards = stack ? $$(".project-card", stack) : [];

  function updateStack() {
    if (!cards.length || reduced) return;
    const r = stack.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    const progress = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
    const n = cards.length;
    cards.forEach((card, i) => {
      const target = 1 - (n - 1 - i) * 0.03;
      const start = i / n;
      const t = clamp((progress - start) / (1 - start), 0, 1);
      card.style.transform = `scale(${(1 + (target - 1) * t).toFixed(4)})`;
    });
  }

  /* ---------- Один цикл обновления на прокрутку ---------- */

  let ticking = false;
  function update() {
    ticking = false;
    updateMarquee();
    updateText();
    updateStack();
  }
  function requestUpdate() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", () => { measureRows(); fitTitle(); requestUpdate(); });
  window.addEventListener("load", () => { measureRows(); requestUpdate(); });
  measureRows();
  update();

  /* ---------- 7. Каталог и вкладки ---------- */

  const pros = $$(".pro");
  const filters = $$(".filter");
  const categoryField = $("#r-category");
  const specialistField = $("#r-specialist");
  const tabs = $$('[role="tab"]');

  function applyFilter(category) {
    filters.forEach((f) => f.setAttribute("aria-pressed", String(f.dataset.filter === category)));
    pros.forEach((p) => { p.hidden = category !== "all" && p.dataset.category !== category; });
  }
  filters.forEach((f) => f.addEventListener("click", () => applyFilter(f.dataset.filter)));

  function roleOf(card) {
    const el = $(".pro__role", card);
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
    pros
      .filter((p) => !category || category === "mixed" || p.dataset.category === category)
      .forEach((p) => {
        const role = roleOf(p);
        specialistField.append(new Option(p.dataset.name + (role ? `, ${role}` : ""), p.dataset.name));
      });
    if ($$("option", specialistField).some((o) => o.value === previous)) specialistField.value = previous;
  }

  function markChosen(name) {
    pros.forEach((p) => p.classList.toggle("is-selected", p.dataset.name === name));
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
        const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        selectTab(next, true);
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
    const card = btn.closest(".pro");
    btn.setAttribute("aria-label", `Выбрать: ${card.dataset.name}`);
    btn.addEventListener("click", () => {
      selectTab($("#tab-request"));
      categoryField.value = card.dataset.category;
      fillSpecialists();
      specialistField.value = card.dataset.name;
      markChosen(card.dataset.name);
      $("#contacts").scrollIntoView({ behavior: scrollBehavior, block: "start" });
      $("#r-task").focus({ preventScroll: true });
    });
  });

  /* ---------- 8. Формы ---------- */

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

      // Вариант 1: заявка уходит на сервер (Formspree или свой)
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
          showStatus(
            `<h3>Не отправилось</h3><p>Проверьте интернет и нажмите кнопку ещё раз. Или напишите нам: <a href="${escapeHTML(contact.href || "#")}" target="_blank" rel="noopener">${escapeHTML(contact.display || "")}</a></p>`,
            true
          );
        } finally {
          submit.disabled = false;
          submit.textContent = submitText;
        }
        return;
      }

      // Вариант 2: сервера нет — копируем текст и открываем Telegram
      const text = [form.dataset.title, ...entries.map(([k, v]) => `${k}: ${v}`)].join("\n");
      const tgUrl = `https://t.me/${settings.telegram || ""}`;
      const copying = navigator.clipboard && window.isSecureContext
        ? navigator.clipboard.writeText(text).then(() => true, () => false)
        : Promise.resolve(false);
      window.open(tgUrl, "_blank", "noopener");
      const copied = await copying;

      showStatus(
        `<h3>Осталось отправить в Telegram</h3>
         <p>${copied
           ? "Текст скопирован. Вставьте его в чат с PRIMECUT и отправьте."
           : "Скопируйте текст ниже и отправьте его в чат с PRIMECUT в Telegram."}</p>
         <div class="form__copy">${escapeHTML(text)}</div>
         <a class="ghost-btn" href="${escapeHTML(tgUrl)}" target="_blank" rel="noopener">Открыть чат в Telegram</a>`
      );
    });
  }

  $$("form[data-form]").forEach(setupForm);
})();
