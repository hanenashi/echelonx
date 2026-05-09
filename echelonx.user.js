// ==UserScript==
// @name         EchelonX
// @namespace    https://github.com/hanenashi/echelonx
// @version      0.2.1
// @description  Okoun troll hider/deleter, updated for newer mobile Okoun menu.
// @author       echelon + hanenashi
// @match        https://*.okoun.cz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=okoun.cz
// @downloadURL  https://raw.githubusercontent.com/hanenashi/echelonx/main/echelonx.user.js
// @updateURL    https://raw.githubusercontent.com/hanenashi/echelonx/main/echelonx.user.js
// @run-at       document-end
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(() => {
  'use strict';

  const APP = 'EchelonX';
  const VERSION = '0.2.1';
  const PFX = 'cz.ocs.EchelonX.';
  const defaultUsers = 'adijunkt, Bernhard_Weiss, bmn, Brandenburg, Bloodrot, Branimir, bretislav.jonas, d.smiricky, Dagobert_Durr, Das_Reich, florian_geyer, frantisek.kachna, Gotz_Berlichingen, Hajny_Filiburg, hamacek, Handschar, Hilfswilliger, horacek, Horst_Wessel, Charlemagne, Charlemagne_, Isidor, Januar, jarda.dusek, jasanek, Jurij_Ozerov, Kama, Karstjager, Koprovka, Knour, Kpt_Tuma, Landstorm_Netherland, Langemarck, Laser_eye, Lutzow, maqeo.cz, Maria_Theresia, mazurek, mazanej_lucifer, Mudrford, Neknubak, Nibelungen, Nord_, Norland, OberSturmKlippFurher, Oblazek, piANistka, Plch, Plsik_Liskovy, Polizei, pixicz, Prinz_Eugen, profesor_Birkermaier, Protez_alpska, prucha, ritna.diera, vojin.kouba, vonavka, Wallonien, Zufanek';
  const defaultPatterns = 'kouba$';
  const K = { hide:'Schovávat', min:'Jen minimalizovat', del:'Mazat', cdel:'I z vlastního filtru ⚠️', custom:'Vlastní filtr', users:'bannedUsers', patterns:'bannedPatterns', stamp:'updateTimestamp' };

  const log = (...a) => console.log(`[${APP}]`, ...a);
  const warn = (...a) => console.warn(`[${APP}]`, ...a);

  function getVal(k, d) {
    try { if (typeof GM_getValue === 'function') return GM_getValue(k, d); } catch (e) { warn(e); }
    try { const v = localStorage.getItem(PFX + k); return v === null ? d : v; } catch { return d; }
  }
  function setVal(k, v) {
    try { if (typeof GM_setValue === 'function') { GM_setValue(k, v); return; } } catch (e) { warn(e); }
    try { localStorage.setItem(PFX + k, v); } catch (e) { warn(e); }
  }
  const getBool = (k, d) => getVal(k, d ? 'true' : 'false') === 'true';
  const setBool = (k, v) => setVal(k, v ? 'true' : 'false');
  const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const split = s => (!s || !s.trim()) ? [] : s.split(',').map(x => x.trim()).filter(Boolean);
  const usersToRx = s => split(s).map(x => '^' + esc(x) + '$');
  function rot13(s) { const a='abcdefghijklmnopqrstuvwxyzabcdefghijklmABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLM'; return String(s).replace(/[a-z]/gi, c => a[a.indexOf(c)+13]); }
  function makeRx(parts) { try { return parts.length ? new RegExp('(' + parts.filter(Boolean).join('|') + ')', 'i') : null; } catch (e) { warn('bad regex', e); return null; } }
  function lists() { return { official: usersToRx(getVal(K.users, defaultUsers)).concat(split(getVal(K.patterns, defaultPatterns))), custom: usersToRx(getVal(K.custom, 'testovaci.kakes')) }; }
  function userNodes() { return [...document.querySelectorAll('.item span.user, .item .user, span.user')].filter(n => n.textContent && n.textContent.trim()); }
  function rootOf(n) { return n.closest('.item') || n.closest('article') || n.closest('li') || n.parentNode?.parentNode || null; }

  function hidePosts(parts, minimize) {
    const rx = makeRx(parts); if (!rx) return 0;
    let count = 0;
    for (const n of userNodes()) {
      rx.lastIndex = 0;
      if (!rx.test(n.textContent)) continue;
      const root = rootOf(n);
      if (!root || root.dataset.echelonxHidden === '1') continue;
      root.dataset.echelonxHidden = '1';
      root.querySelectorAll('img').forEach(img => { img.src = ''; });
      count++;
      if (minimize) {
        root.style.height = '1.5em'; root.style.overflow = 'hidden'; root.style.border = '1px solid gray'; root.style.opacity = '0.5';
        root.title = 'EchelonX hidden post - tap to toggle';
        root.addEventListener('click', () => { root.style.height = root.style.height === '' ? '1.5em' : ''; });
      } else root.remove();
    }
    return count;
  }

  function deletePosts(parts) {
    const rx = makeRx(parts); if (!rx) return 0;
    let count = 0;
    for (const n of userNodes()) {
      rx.lastIndex = 0;
      if (!rx.test(n.textContent)) continue;
      const root = rootOf(n); if (!root) continue;
      root.querySelectorAll('input[type="checkbox"]').forEach(cb => { if (!cb.checked) count++; cb.checked = true; });
    }
    if (!count) return 0;
    const form = document.querySelector('form[name="markArticlesForm"], form[name="markMessagesForm"]');
    if (!form) return 0;
    const iframe = document.createElement('iframe'); iframe.name = iframe.id = 'echelonxDeletionIframe'; iframe.style.display = 'none';
    (document.getElementById('body') || document.body).appendChild(iframe);
    const old = form.target; form.target = iframe.name; form.submit(); form.target = old;
    return count;
  }

  function applyNow({ allowDelete = false } = {}) {
    const l = lists();
    const all = l.official.concat(l.custom);
    let deleted = 0, hidden = 0;
    if (allowDelete && getBool(K.del, true)) deleted = deletePosts(getBool(K.cdel, false) ? all : l.official);
    if (getBool(K.hide, true)) hidden = hidePosts(all, getBool(K.min, false));
    return { hidden, deleted };
  }

  function status(txt, kind='ok') {
    const el = document.getElementById('echelonxStatus'); if (!el) return;
    el.textContent = txt;
    el.style.color = kind === 'bad' ? '#9b0000' : kind === 'warn' ? '#8a5a00' : '#006400';
  }
  function chk(id, text, key, def) {
    const label = document.createElement('label'); label.className = 'echelonx-row';
    const c = document.createElement('input'); c.id = id; c.type = 'checkbox'; c.checked = getBool(key, def);
    label.append(c, ' ', text); return label;
  }
  function panel() {
    let p = document.getElementById('echelonxMenuPanel'); if (p) return p;
    p = document.createElement('div'); p.id = 'echelonxMenuPanel'; p.hidden = true;
    const title = document.createElement('div'); title.className = 'echelonx-title'; title.textContent = `${APP} ${VERSION}`;
    const update = document.createElement('button'); update.className = 'echelonx-wide'; update.textContent = 'Update blacklist'; update.type = 'button'; update.onclick = () => updateBlacklist(true);
    const areaLabel = document.createElement('label'); areaLabel.className = 'echelonx-custom-label'; areaLabel.textContent = 'Custom trolls, comma-separated:';
    const area = document.createElement('textarea'); area.id = 'echelonxCustomText'; area.value = getVal(K.custom, 'testovaci.kakes'); areaLabel.append(area);
    const save = document.createElement('button'); save.className = 'echelonx-wide echelonx-primary'; save.type = 'button'; save.textContent = 'Save + apply now';
    save.onclick = () => {
      setBool(K.hide, document.getElementById('echelonxHide').checked);
      setBool(K.min, document.getElementById('echelonxMinimize').checked);
      setBool(K.del, document.getElementById('echelonxDelete').checked);
      setBool(K.cdel, document.getElementById('echelonxCustomDelete').checked);
      setVal(K.custom, area.value);
      const r = applyNow({ allowDelete: false });
      status(`Saved. Hidden now: ${r.hidden}. Reload if old posts stay visible.`, r.hidden ? 'ok' : 'warn');
    };
    const reload = document.createElement('button'); reload.className = 'echelonx-wide'; reload.type = 'button'; reload.textContent = 'Reload page'; reload.onclick = () => location.reload();
    const st = document.createElement('div'); st.id = 'echelonxStatus'; st.textContent = 'Changes are stored only after Save + apply.';
    p.append(title, update, chk('echelonxHide','Hide matching posts',K.hide,true), chk('echelonxMinimize','Only minimize',K.min,false), chk('echelonxDelete','Delete official blacklist matches',K.del,true), chk('echelonxCustomDelete','Also delete custom filter matches',K.cdel,false), areaLabel, save, reload, st);
    return p;
  }
  function refreshPanel() {
    const vals = [['echelonxHide',K.hide,true],['echelonxMinimize',K.min,false],['echelonxDelete',K.del,true],['echelonxCustomDelete',K.cdel,false]];
    vals.forEach(([id,k,d]) => { const el=document.getElementById(id); if(el) el.checked=getBool(k,d); });
    const t = document.getElementById('echelonxCustomText'); if (t) t.value = getVal(K.custom, 'testovaci.kakes');
  }
  function togglePanel(e) {
    e?.preventDefault(); e?.stopPropagation();
    const item = document.getElementById('echelonxMenuItem'); const p = panel();
    if (item && p.parentNode !== item.parentNode) item.after(p);
    refreshPanel(); p.hidden = !p.hidden;
    item?.classList.toggle('echelonx-open', !p.hidden);
    if (!p.hidden) status('Changes are stored only after Save + apply.', 'warn');
  }

  function injectMenu() {
    const menu = document.querySelector('.head .user .user-menu'); if (!menu) return false;
    if (!document.getElementById('echelonxMenuStyle')) {
      const s = document.createElement('style'); s.id = 'echelonxMenuStyle';
      s.textContent = `.head .user .user-menu #echelonxMenuItem.echelonx-open{margin-bottom:0!important;border-bottom-left-radius:0!important;border-bottom-right-radius:0!important;font-weight:bold!important;background:#fff!important}.head .user .user-menu #echelonxMenuPanel{margin:0 8px 8px 8px;padding:10px;background:#fff;color:#111;text-align:left;border:1px solid #ddd;border-top:0;border-radius:0 0 8px 8px;box-sizing:border-box}.head .user .user-menu #echelonxMenuPanel .echelonx-title{font-weight:bold;margin-bottom:8px}.head .user .user-menu #echelonxMenuPanel .echelonx-row{display:block;padding:5px 0;color:#111;font-size:14px}.head .user .user-menu #echelonxMenuPanel input[type="checkbox"]{transform:scale(1.15);margin-right:5px}.head .user .user-menu #echelonxMenuPanel .echelonx-wide{width:100%;margin:4px 0;padding:8px;font:inherit;box-sizing:border-box}.head .user .user-menu #echelonxMenuPanel .echelonx-primary{padding:10px;font-weight:bold}.head .user .user-menu #echelonxMenuPanel .echelonx-custom-label{display:block;margin-top:8px;font-size:13px}.head .user .user-menu #echelonxMenuPanel textarea{display:block;width:100%;height:86px;box-sizing:border-box;margin-top:4px;font-size:14px}.head .user .user-menu #echelonxStatus{font-size:12px;margin-top:6px;color:#555;line-height:1.25}`;
      document.head.appendChild(s);
    }
    let item = document.getElementById('echelonxMenuItem');
    if (!item) {
      item = document.createElement('button'); item.id = 'echelonxMenuItem'; item.type = 'button'; item.setAttribute('role','menuitem'); item.textContent = 'EchelonX'; item.onclick = togglePanel;
      const close = menu.querySelector('.user-menu-cancel'); close ? close.before(item) : menu.appendChild(item);
    }
    const close = menu.querySelector('.user-menu-cancel');
    if (close && !close.dataset.echelonxHook) {
      close.dataset.echelonxHook = '1';
      close.addEventListener('click', () => { document.getElementById('echelonxMenuPanel')?.setAttribute('hidden',''); document.getElementById('echelonxMenuItem')?.classList.remove('echelonx-open'); });
    }
    return true;
  }
  function fallbackButton() {
    if (injectMenu()) { document.getElementById('echelonxFloatingButton')?.remove(); return; }
    let b = document.getElementById('echelonxFloatingButton'); if (b) return;
    b = document.createElement('button'); b.id = 'echelonxFloatingButton'; b.type = 'button'; b.textContent = 'EX';
    b.style.cssText = 'position:fixed;right:8px;bottom:72px;z-index:2147483647;background:#111;color:#fff;border:1px solid #fff;border-radius:18px;padding:8px 10px;font:bold 13px sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4);';
    b.onclick = () => { const p = panel(); if (p.parentNode !== document.body) document.body.appendChild(p); p.style.cssText = 'position:fixed;right:8px;bottom:116px;z-index:2147483647;max-width:min(420px,calc(100vw - 30px));max-height:70vh;overflow:auto;border:2px solid #000;background:#fff;color:#111;padding:10px;box-shadow:0 2px 12px rgba(0,0,0,.45);'; p.hidden = !p.hidden; };
    document.body.appendChild(b);
  }

  function hideSidebar() { if (document.getElementsByClassName('HideSidebar').length !== 1) return; document.querySelector('.yui-u.ctx')?.remove(); const m = document.querySelector('.yui-u.yui-ge.first.main'); if (m) m.style.width = '100%'; }
  async function parseBlacklist(res) {
    if (!res.ok) { status('Blacklist update failed: HTTP ' + res.status, 'bad'); return; }
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    let users = [], patterns = [];
    const x = doc.getElementsByClassName('xdata'); if (x.length) { const text = x[0].textContent.trim(); users = split(text); if (users.length > 2) setVal(K.users, text); }
    const e = doc.getElementsByClassName('extdata'); if (e.length && e[0].title) { try { const d = atob(rot13(e[0].title)); patterns = split(d); if (patterns.length > 2) setVal(K.patterns, d); } catch(err) { warn(err); } }
    const msg = `Blacklist updated: ${users.length} users, ${patterns.length} patterns.`; log(msg); status(msg, 'ok');
  }
  function updateBlacklist(force) {
    if (document.getElementsByClassName('login').length) return;
    const now = Date.now(); const stamp = parseInt(getVal(K.stamp, '0'), 10) || 0;
    if (stamp + 30 * 60 * 1000 > now && !force) return;
    setVal(K.stamp, String(now)); status('Updating blacklist...', 'warn');
    fetch('https://www.okoun.cz/boards/ryba_bez_parazitu?contextId=1071957010#article-1071957010').then(parseBlacklist).catch(err => { warn(err); status('Blacklist update failed. Network/CORS goblin.', 'bad'); });
  }

  hideSidebar(); applyNow({ allowDelete: true }); fallbackButton(); updateBlacklist(false);
})();
