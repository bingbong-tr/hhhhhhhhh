// ==UserScript==
// @name         HUSH+ Android (HTML5 Speed Hack)
// @namespace    hush-plus-android
// @version      1.0
// @description  HTML5 oyunlar icin hizlandirma (setTimeout, setInterval, Date.now, performance.now, requestAnimationFrame). Ekranda yuzen hiz kontrolu.
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @noframes     false
// ==/UserScript==

(function () {
  "use strict";
  if (window.__hushPlus) return;
  window.__hushPlus = true;

  const KEY = "hushPlusConfig";
  const MAX_SPEED = 25; // maksimum hiz sinirini buradan degistir

  const cfg = {
    speed: 1.0,
    setInterval: true,
    setTimeout: true,
    performanceNow: true,
    dateNow: true,
    raf: false,
  };

  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved) Object.assign(cfg, saved);
  } catch (e) {}

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
  };

  // ---- Orijinal fonksiyonlar ----
  const origClearInterval = window.clearInterval.bind(window);
  const origClearTimeout = window.clearTimeout.bind(window);
  const origSetInterval = window.setInterval.bind(window);
  const origSetTimeout = window.setTimeout.bind(window);
  const origPerfNow = window.performance.now.bind(window.performance);
  const origDateNow = Date.now.bind(Date);
  const origRAF = window.requestAnimationFrame.bind(window);

  // ---- setInterval / setTimeout ----
  let timers = [];

  const reloadTimers = () => {
    const kept = [];
    timers.forEach((t) => {
      origClearInterval(t.id);
      if (t.customId) origClearInterval(t.customId);
      if (!t.finished) {
        t.customId = origSetInterval(
          t.handler,
          cfg.setInterval ? t.timeout / cfg.speed : t.timeout,
          ...t.args
        );
        kept.push(t);
      }
    });
    timers = kept;
  };

  window.clearInterval = (id) => {
    origClearInterval(id);
    timers.forEach((t) => {
      if (t.id == id || t.customId == id) {
        t.finished = true;
        if (t.customId) origClearInterval(t.customId);
      }
    });
  };

  window.clearTimeout = (id) => origClearTimeout(id);

  window.setInterval = (handler, timeout, ...args) => {
    timeout = timeout || 0;
    const id = origSetInterval(
      handler,
      cfg.setInterval ? timeout / cfg.speed : timeout,
      ...args
    );
    timers.push({ id, handler, timeout, args, finished: false, customId: null });
    return id;
  };

  window.setTimeout = (handler, timeout, ...args) => {
    timeout = timeout || 0;
    return origSetTimeout(
      handler,
      cfg.setTimeout ? timeout / cfg.speed : timeout,
      ...args
    );
  };

  // ---- performance.now ----
  (function () {
    let value = null, prev = null;
    window.performance.now = () => {
      const o = origPerfNow();
      if (value !== null) value += (o - prev) * (cfg.performanceNow ? cfg.speed : 1);
      else value = o;
      prev = o;
      return Math.floor(value);
    };
  })();

  // ---- Date.now ----
  (function () {
    let value = null, prev = null;
    Date.now = () => {
      const o = origDateNow();
      if (value !== null) value += (o - prev) * (cfg.dateNow ? cfg.speed : 1);
      else value = o;
      prev = o;
      return Math.floor(value);
    };
  })();

  // ---- requestAnimationFrame ----
  (function () {
    let value = null, prev = null;
    const callbacks = [];
    const ticks = [];
    const empty = () => {};
    const newRAF = (callback) => {
      return origRAF(() => {
        const o = origDateNow();
        if (value !== null) value += (o - prev) * (cfg.raf ? cfg.speed : 1);
        else value = o;
        prev = o;
        const now = Math.floor(value);

        const i = callbacks.indexOf(callback);
        if (i === -1) {
          callbacks.push(callback);
          ticks.push(0);
          callback(now);
        } else if (cfg.raf) {
          let tick = ticks[i] + cfg.speed;
          if (tick >= 1) {
            while (tick >= 1) {
              callback(now);
              window.requestAnimationFrame = empty;
              tick -= 1;
            }
            window.requestAnimationFrame = newRAF;
          } else {
            window.requestAnimationFrame(callback);
          }
          ticks[i] = tick;
        } else {
          callback(now);
        }
      });
    };
    window.requestAnimationFrame = newRAF;
  })();

  // ---- Ekrandaki kontrol paneli (sadece ana sayfada) ----
  if (window.top !== window) return;

  function buildUI() {
    if (document.getElementById("hush-plus-root")) return;
    const root = document.createElement("div");
    root.id = "hush-plus-root";
    root.style.cssText =
      "position:fixed;top:80px;right:8px;z-index:2147483647;font-family:sans-serif;touch-action:none;";

    const btn = document.createElement("div");
    btn.textContent = "⚡ " + cfg.speed.toFixed(2) + "x";
    btn.style.cssText =
      "background:#111c;color:#fff;border:1px solid #fff5;border-radius:20px;padding:8px 12px;font-size:14px;text-align:center;user-select:none;";
    root.appendChild(btn);

    const panel = document.createElement("div");
    panel.style.cssText =
      "display:none;margin-top:6px;background:#111e;color:#fff;border-radius:12px;padding:12px;width:230px;font-size:13px;";
    panel.innerHTML =
      '<div style="margin-bottom:8px">Hiz: <b id="hp-val"></b></div>' +
      '<input id="hp-slider" type="range" min="0.05" max="' + MAX_SPEED + '" step="0.05" style="width:100%">' +
      '<div style="display:flex;gap:6px;margin:8px 0">' +
      [1, 2, 5, 10].map((v) => '<button data-v="' + v + '" style="flex:1;padding:6px;border-radius:6px;border:0">' + v + "x</button>").join("") +
      "</div>" +
      [
        ["setInterval", "setInterval"],
        ["setTimeout", "setTimeout"],
        ["performanceNow", "performance.now"],
        ["dateNow", "Date.now"],
        ["raf", "requestAnimationFrame"],
      ]
        .map(([k, l]) => '<label style="display:block;padding:4px 0"><input type="checkbox" data-k="' + k + '"> ' + l + "</label>")
        .join("");
    root.appendChild(panel);

    const slider = panel.querySelector("#hp-slider");
    const val = panel.querySelector("#hp-val");

    const refresh = () => {
      slider.value = cfg.speed;
      val.textContent = cfg.speed.toFixed(2) + "x";
      btn.textContent = "⚡ " + cfg.speed.toFixed(2) + "x";
      panel.querySelectorAll("input[data-k]").forEach((c) => (c.checked = !!cfg[c.dataset.k]));
    };
    const apply = () => { save(); reloadTimers(); refresh(); };

    slider.addEventListener("input", () => { cfg.speed = parseFloat(slider.value); apply(); });
    panel.querySelectorAll("button[data-v]").forEach((b) =>
      b.addEventListener("click", () => { cfg.speed = parseFloat(b.dataset.v); apply(); })
    );
    panel.querySelectorAll("input[data-k]").forEach((c) =>
      c.addEventListener("change", () => { cfg[c.dataset.k] = c.checked; apply(); })
    );

    btn.addEventListener("click", () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    refresh();
    (document.body || document.documentElement).appendChild(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI);
  } else {
    buildUI();
  }
  // Sayfa ayarlari kayitliysa zamanlayicilari yeniden yukle
  reloadTimers();
})();
