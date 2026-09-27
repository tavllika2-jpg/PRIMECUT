/* ==========================================================================
   PRIMECUT — поведение сайта
   1. Шапка и мобильное меню
   2. Первый экран: дорожка подгоняется под ширину, курсор доезжает до разреза
   3. Каталог: фильтр по направлениям, кнопки «Выбрать»
   4. Формы: проверка полей и отправка
   ========================================================================== */

(function () {
  "use strict";

  const CONFIG = window.PRIMECUT_CONFIG || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollBehavior = () => (reducedMotion() ? "auto" : "smooth");

  /* ---------- 1. Шапка и мобильное меню ---------- */

  const header = $(".site-header");
  const navToggle = $(".nav-toggle");
  const nav = $("#site-nav");

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    navToggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  }
  if (navToggle && nav) {
    navToggle.addEventListener("click", () => setMenu(navToggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); navToggle.focus(); }
    });
  }

  const yearEl = $("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 2. Первый экран ---------- */

  const timeline = $(".timeline");
  if (timeline) {
    const track = $(".timeline__video", timeline);
    const cut = $(".timeline__cut", timeline);
    const playhead = $(".playhead", timeline);
    const timeLabel = $(".playhead__time", timeline);
    const clips = $$(".clip", track);

    // Размер букв подбирается так, чтобы клипы заняли всю ширину дорожки
    function fit() {
      track.style.fontSize = "";
      const available = track.clientWidth;
      const used = clips.reduce((sum, c) => sum + c.querySelector(".clip__word").getBoundingClientRect().width, 0);
      if (!available || !used) return;
      const base = parseFloat(getComputedStyle(track).fontSize);
      // запас на внутренние отступы клипов и разрез
      const target = available * 0.9;
      track.style.fontSize = Math.floor(base * (target / used)) + "px";
    }

    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    let lastW = 0;
    window.addEventListener("resize", () => {
      if (window.innerWidth !== lastW) { lastW = window.innerWidth; fit(); }
    });

    // Курсор едет от начала дорожки до разреза, таймкод считает кадры
    const END_FRAMES = 4 * 25 + 12; // 00:00:04:12 при 25 кадрах в секунду
    const pad = (n) => String(n).padStart(2, "0");
    const timecode = (frames) => `00:00:${pad(Math.floor(frames / 25))}:${pad(frames % 25)}`;

    function play() {
      if (reducedMotion()) return;
      timeline.classList.add("is-playing");
      const distance = cut.getBoundingClientRect().left - track.getBoundingClientRect().left;
      if (!distance) { timeline.classList.remove("is-playing"); return; }
      const duration = 1500;
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      let start = null;
      function frame(now) {
        if (start === null) start = now;
        const t = Math.min(1, (now - start) / duration);
        const k = ease(t);
        playhead.style.transform = `translateX(${-(1 - k) * distance}px)`;
        timeLabel.textContent = timecode(Math.round(k * END_FRAMES));
        if (t < 1) requestAnimationFrame(frame);
        else { playhead.style.transform = ""; timeline.classList.remove("is-playing"); }
      }
      playhead.style.transform = `translateX(${-distance}px)`;
      timeLabel.textContent = timecode(0);
      requestAnimationFrame(frame);
    }

    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(() => setTimeout(play, 250));
  }

  /* ---------- 3. Каталог ---------- */

  const pros = $$(".pro");
  const filters = $$(".filter");
  const categoryField = $("#r-category");
  const specialistField = $("#r-specialist");

  // Ссылки на портфолио без адреса не показываем
  $$("[data-portfolio]").forEach((a) => { if (a.getAttribute("href") === "#") a.hidden = true; });

  function applyFilter(category) {
    filters.forEach((f) => f.setAttribute("aria-pressed", String(f.dataset.filter === category)));
    pros.forEach((p) => { p.hidden = category !== "all" && p.dataset.category !== category; });
  }
  filters.forEach((f) => f.addEventListener("click", () => applyFilter(f.dataset.filter)));

  $$("[data-show-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyFilter(btn.dataset.showCategory);
      $("#catalog").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    });
  });

  // Список специалистов в заявке строится из каталога
  function fillSpecialists() {
    if (!specialistField) return;
    const category = categoryField.value;
    const previous = specialistField.value;
    const first = specialistField.options[0];
    specialistField.innerHTML = "";
    specialistField.append(first);
    pros
      .filter((p) => !category || category === "mixed" || p.dataset.category === category)
      .forEach((p) => {
        const roleEl = $(".pro__role", p);
        let role = roleEl ? roleEl.textContent.trim() : "";
        // «Видеограф» → «видеограф», но «SMM-специалист» остаётся как есть
        if (/^[A-ZА-ЯЁ][a-zа-яё]/.test(role)) role = role[0].toLowerCase() + role.slice(1);
        const text = p.dataset.name + (role ? `, ${role}` : "");
        specialistField.append(new Option(text, p.dataset.name));
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

  $$("[data-choose]").forEach((btn) => {
    const card = btn.closest(".pro");
    btn.setAttribute("aria-label", `Выбрать: ${card.dataset.name}`);
    btn.addEventListener("click", () => {
      categoryField.value = card.dataset.category;
      categoryField.dispatchEvent(new Event("change"));
      specialistField.value = card.dataset.name;
      markChosen(card.dataset.name);
      $("#request").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      $("#r-task").focus({ preventScroll: true });
    });
  });

  /* ---------- 4. Формы ---------- */

  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function isFilled(el) {
    if (el.type === "checkbox") return el.checked;
    const value = el.value.trim();
    if (el.name === "task") return value.length >= 5;
    return value.length >= 2;
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
      status.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
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

      // Скрытое поле заполнил бот — не отправляем
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
         <a class="btn btn--primary" href="${escapeHTML(tgUrl)}" target="_blank" rel="noopener">Открыть чат в Telegram</a>`
      );
    });
  }

  $$("form[data-form]").forEach(setupForm);
})();
