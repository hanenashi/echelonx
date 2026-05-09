// ==UserScript==
// @name         EchelonX
// @namespace    https://github.com/hanenashi/echelonx
// @version      0.2.0
// @description  Resilient Okoun troll hider/deleter based on Echelonuv filtr, updated for newer Okoun layouts.
// @author       echelon + hanenashi
// @match        https://*.okoun.cz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=okoun.cz
// @downloadURL  https://raw.githubusercontent.com/hanenashi/echelonx/main/echelonx.user.js
// @updateURL    https://raw.githubusercontent.com/hanenashi/echelonx/main/echelonx.user.js
// @run-at       document-end
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// ==/UserScript==

(() => {
    'use strict';

    const APP = 'EchelonX';
    const VERSION = '0.2.0';
    const STORAGE_PREFIX = 'cz.ocs.EchelonX.';

    const defaultBlackList = 'adijunkt, Bernhard_Weiss, bmn, Brandenburg, Bloodrot, Branimir, bretislav.jonas, d.smiricky, Dagobert_Durr, Das_Reich, florian_geyer, frantisek.kachna, Gotz_Berlichingen, Hajny_Filiburg, hamacek, Handschar, Hilfswilliger, horacek, Horst_Wessel, Charlemagne, Charlemagne_, Isidor, Januar, jarda.dusek, jasanek, Jurij_Ozerov, Kama, Karstjager, Koprovka, Knour, Kpt_Tuma, Landstorm_Netherland, Langemarck, Laser_eye, Lutzow, maqeo.cz, Maria_Theresia, mazurek, mazanej_lucifer, Mudrford, Neknubak, Nibelungen, Nord_, Norland, OberSturmKlippFurher, Oblazek, piANistka, Plch, Plsik_Liskovy, Polizei, pixicz, Prinz_Eugen, profesor_Birkermaier, Protez_alpska, prucha, ritna.diera, vojin.kouba, vonavka, Wallonien, Zufanek';
    const defaultRegexList = 'kouba$';

    const keys = {
        hide: 'Schovávat',
        minimize: 'Jen minimalizovat',
        delete: 'Mazat',
        customDelete: 'I z vlastního filtru ⚠️',
        custom: 'Vlastní filtr',
        bannedUsers: 'bannedUsers',
        bannedPatterns: 'bannedPatterns',
        updateTimestamp: 'updateTimestamp'
    };

    function log(...args) { console.log(`[${APP}]`, ...args); }
    function warn(...args) { console.warn(`[${APP}]`, ...args); }

    function getStorageValue(key, fallback) {
        try { if (typeof GM_getValue === 'function') return GM_getValue(key, fallback); } catch (e) { warn('GM_getValue failed', e); }
        try {
            const value = window.localStorage.getItem(STORAGE_PREFIX + key);
            return value === null ? fallback : value;
        } catch {
            return fallback;
        }
    }

    function setStorageValue(key, value) {
        try { if (typeof GM_setValue === 'function') { GM_setValue(key, value); return; } } catch (e) { warn('GM_setValue failed', e); }
        try { window.localStorage.setItem(STORAGE_PREFIX + key, value); } catch (e) { warn('localStorage write failed', e); }
    }

    function boolValue(key, fallback) { return getStorageValue(key, fallback ? 'true' : 'false') === 'true'; }
    function setBoolValue(key, value) { setStorageValue(key, value ? 'true' : 'false'); }
    function escapeRegex(str) { return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function rot13(message) {
        const alpha = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLM';
        return String(message).replace(/[a-z]/gi, letter => alpha[alpha.indexOf(letter) + 13]);
    }
    function listToArray(text) { return !text || !text.trim() ? [] : text.split(',').map(s => s.trim()).filter(Boolean); }
    function userListToRegexArray(text) { return listToArray(text).map(name => '^' + escapeRegex(name) + '$'); }
    function makeRegex(patterns) {
        const clean = patterns.filter(Boolean);
        if (!clean.length) return null;
        try { return new RegExp('(' + clean.join('|') + ')', 'i'); }
        catch (e) { warn('Invalid blacklist regex. Filtering skipped.', e, clean); return null; }
    }

    function getListsFromStorage() {
        const blackList = userListToRegexArray(getStorageValue(keys.bannedUsers, defaultBlackList)).concat(listToArray(getStorageValue(keys.bannedPatterns, defaultRegexList)));
        const customBlackList = userListToRegexArray(getStorageValue(keys.custom, 'testovaci.kakes'));
        return { blackList, customBlackList };
    }

    function getPostRoot(userNode) { return userNode.closest('.item') || userNode.closest('article') || userNode.closest('li') || userNode.parentNode?.parentNode || null; }
    function findUserNodes() { return Array.from(document.querySelectorAll('.item span.user, .item .user, span.user')).filter(el => el.textContent && el.textContent.trim()); }

    function hidePostsRegex(patterns, minimizeOnly) {
        const regex = makeRegex(patterns);
        if (!regex) return 0;
        let changed = 0;
        for (const node of findUserNodes()) {
            regex.lastIndex = 0;
            if (!regex.test(node.textContent)) continue;
            const root = getPostRoot(node);
            if (!root || root.dataset.echelonxHidden === '1') continue;
            root.querySelectorAll('img').forEach(img => { img.src = ''; });
            root.dataset.echelonxHidden = '1';
            changed++;
            if (minimizeOnly) {
                root.style.height = '1.5em';
                root.style.overflow = 'hidden';
                root.style.border = '1px solid gray';
                root.style.opacity = '0.5';
                root.title = 'EchelonX hidden post - tap to toggle';
                root.addEventListener('click', () => { root.style.height = root.style.height === '' ? '1.5em' : ''; });
            } else {
                root.remove();
            }
        }
        return changed;
    }

    function deletePosts(patterns) {
        const regex = makeRegex(patterns);
        if (!regex) return 0;
        let selected = 0;
        for (const node of findUserNodes()) {
            regex.lastIndex = 0;
            if (!regex.test(node.textContent)) continue;
            const root = getPostRoot(node);
            if (!root) continue;
            for (const cb of root.querySelectorAll('input[type="checkbox"]')) {
                if (!cb.checked) selected++;
                cb.checked = true;
            }
        }
        if (selected <= 0) return 0;
        const form = document.querySelector('form[name="markArticlesForm"], form[name="markMessagesForm"]');
        if (!form) { warn(`Would delete ${selected} checkbox(es), but delete form was not found.`); return 0; }
        const iframe = document.createElement('iframe');
        iframe.name = 'echelonxDeletionIframe';
        iframe.id = 'echelonxDeletionIframe';
        iframe.style.display = 'none';
        (document.getElementById('body') || document.body).appendChild(iframe);
        const oldTarget = form.target;
        form.target = 'echelonxDeletionIframe';
        form.submit();
        form.target = oldTarget;
        log(`Submitted delete form for ${selected} checkbox(es).`);
        return selected;
    }

    function applyFiltersNow(options = {}) {
        const { blackList, customBlackList } = getListsFromStorage();
        const filteringEnabled = boolValue(keys.hide, true);
        const minimizeOnly = boolValue(keys.minimize, false);
        const deletingEnabled = boolValue(keys.delete, true);
        const customDeletingEnabled = boolValue(keys.customDelete, false);
        let hidden = 0;
        let deleted = 0;
        if (deletingEnabled && options.allowDelete) deleted = deletePosts(customDeletingEnabled ? blackList.concat(customBlackList) : blackList);
        if (filteringEnabled) hidden = hidePostsRegex(blackList.concat(customBlackList), minimizeOnly);
        return { hidden, deleted };
    }

    function setStatus(text, kind = 'ok') {
        const node = document.getElementById('echelonxStatus');
        if (!node) return;
        node.textContent = text;
        node.style.color = kind === 'bad' ? '#9b0000' : kind === 'warn' ? '#8a5a00' : '#006400';
    }

    function closeOkounUserMenu() {
        const menu = document.querySelector('.head .user .user-menu');
        const backdrop = document.querySelector('.head .user .user-menu-backdrop');
        const toggle = document.querySelector('.head .user .user-menu-toggle');
        const panel = document.getElementById('echelonxMenuPanel');
        if (panel) panel.hidden = true;
        if (menu) menu.hidden = true;
        if (backdrop) backdrop.hidden = true;
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    function makeCheckbox(id, labelText, key, fallback) {
        const label = document.createElement('label');
        label.className = 'echelonx-row';
        const cb = document.createElement('input');
        cb.id = id;
        cb.type = 'checkbox';
        cb.checked = boolValue(key, fallback);
        label.append(cb, document.createTextNode(' ' + labelText));
        return label;
    }

    function buildSettingsPanel() {
        let panel = document.getElementById('echelonxMenuPanel');
        if (panel) return panel;
        panel = document.createElement('div');
        panel.id = 'echelonxMenuPanel';
        panel.hidden = true;
        panel.style.cssText = 'margin:8px 0 0 0;padding:10px;border-top:1px solid #ddd;background:#fff;color:#111;text-align:left;';
        const title = document.createElement('div');
        title.textContent = `${APP} ${VERSION}`;
        title.style.cssText = 'font-weight:bold;margin-bottom:8px;';
        const updateBtn = document.createElement('button');
        updateBtn.type = 'button';
        updateBtn.textContent = 'Update blacklist';
        updateBtn.style.cssText = 'width:100%;margin:4px 0;padding:8px;';
        updateBtn.addEventListener('click', () => updateBlackList(true));
        const customLabel = document.createElement('label');
        customLabel.textContent = 'Custom trolls, comma-separated:';
        customLabel.style.cssText = 'display:block;margin-top:8px;font-size:13px;';
        const customText = document.createElement('textarea');
        customText.id = 'echelonxCustomText';
        customText.value = getStorageValue(keys.custom, 'testovaci.kakes');
        customText.style.cssText = 'display:block;width:100%;height:86px;box-sizing:border-box;margin-top:4px;font-size:14px;';
        customLabel.append(customText);
        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.textContent = 'Save + apply now';
        applyBtn.style.cssText = 'width:100%;margin:8px 0 4px 0;padding:10px;font-weight:bold;';
        applyBtn.addEventListener('click', () => {
            setBoolValue(keys.hide, document.getElementById('echelonxHide').checked);
            setBoolValue(keys.minimize, document.getElementById('echelonxMinimize').checked);
            setBoolValue(keys.delete, document.getElementById('echelonxDelete').checked);
            setBoolValue(keys.customDelete, document.getElementById('echelonxCustomDelete').checked);
            setStorageValue(keys.custom, customText.value);
            const result = applyFiltersNow({ allowDelete: false });
            setStatus(`Saved. Hidden now: ${result.hidden}. Reload if an already-rendered post did not change.`, result.hidden ? 'ok' : 'warn');
        });
        const reloadBtn = document.createElement('button');
        reloadBtn.type = 'button';
        reloadBtn.textContent = 'Reload page';
        reloadBtn.style.cssText = 'width:100%;margin:4px 0;padding:8px;';
        reloadBtn.addEventListener('click', () => window.location.reload());
        const status = document.createElement('div');
        status.id = 'echelonxStatus';
        status.textContent = 'Changes are stored only after Save + apply.';
        status.style.cssText = 'font-size:12px;margin-top:6px;color:#555;line-height:1.25;';
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = 'Close menu';
        closeBtn.style.cssText = 'width:100%;margin-top:8px;padding:8px;';
        closeBtn.addEventListener('click', closeOkounUserMenu);
        panel.append(title, updateBtn, makeCheckbox('echelonxHide', 'Hide matching posts', keys.hide, true), makeCheckbox('echelonxMinimize', 'Only minimize', keys.minimize, false), makeCheckbox('echelonxDelete', 'Delete official blacklist matches', keys.delete, true), makeCheckbox('echelonxCustomDelete', 'Also delete custom filter matches', keys.customDelete, false), customLabel, applyBtn, reloadBtn, status, closeBtn);
        return panel;
    }

    function showSettingsInMenu(event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        const menu = document.querySelector('.head .user .user-menu');
        const panel = buildSettingsPanel();
        if (menu && panel.parentNode !== menu) menu.appendChild(panel);
        panel.hidden = !panel.hidden;
        if (!panel.hidden) setStatus('Changes are stored only after Save + apply.', 'warn');
    }

    function injectAvatarMenuItem() {
        const menu = document.querySelector('.head .user .user-menu');
        if (!menu) return false;
        if (!document.getElementById('echelonxMenuStyle')) {
            const style = document.createElement('style');
            style.id = 'echelonxMenuStyle';
            style.textContent = `.head .user .user-menu #echelonxMenuPanel button{font:inherit}.head .user .user-menu #echelonxMenuPanel .echelonx-row{display:block;padding:5px 0;color:#111;font-size:14px}.head .user .user-menu #echelonxMenuPanel input[type="checkbox"]{transform:scale(1.15);margin-right:5px}`;
            document.head.appendChild(style);
        }
        let item = document.getElementById('echelonxMenuItem');
        if (!item) {
            item = document.createElement('button');
            item.id = 'echelonxMenuItem';
            item.type = 'button';
            item.setAttribute('role', 'menuitem');
            item.textContent = 'EchelonX';
            item.addEventListener('click', showSettingsInMenu);
            const cancel = menu.querySelector('.user-menu-cancel');
            if (cancel) cancel.before(item);
            else menu.appendChild(item);
        }
        const cancel = menu.querySelector('.user-menu-cancel');
        if (cancel && !cancel.dataset.echelonxCloseHook) {
            cancel.dataset.echelonxCloseHook = '1';
            cancel.addEventListener('click', () => { const panel = document.getElementById('echelonxMenuPanel'); if (panel) panel.hidden = true; });
        }
        return true;
    }

    function ensureFallbackButton() {
        if (injectAvatarMenuItem()) {
            const old = document.getElementById('echelonxFloatingButton');
            if (old) old.remove();
            return;
        }
        let btn = document.getElementById('echelonxFloatingButton');
        if (btn) return;
        btn = document.createElement('button');
        btn.id = 'echelonxFloatingButton';
        btn.type = 'button';
        btn.textContent = 'EX';
        btn.title = 'EchelonX settings';
        btn.style.cssText = 'position:fixed;right:8px;bottom:72px;z-index:2147483647;background:#111;color:#fff;border:1px solid #fff;border-radius:18px;padding:8px 10px;font:bold 13px sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4);';
        btn.addEventListener('click', () => {
            const panel = buildSettingsPanel();
            if (panel.parentNode !== document.body) document.body.appendChild(panel);
            panel.style.cssText += 'position:fixed;right:8px;bottom:116px;z-index:2147483647;max-width:min(420px,calc(100vw - 30px));max-height:70vh;overflow:auto;border:2px solid #000;box-shadow:0 2px 12px rgba(0,0,0,.45);';
            panel.hidden = !panel.hidden;
        });
        document.body.appendChild(btn);
    }

    function hideSidebar() {
        if (document.getElementsByClassName('HideSidebar').length !== 1) return;
        const sidebar = document.querySelector('.yui-u.ctx');
        if (sidebar) sidebar.remove();
        const mainDiv = document.querySelector('.yui-u.yui-ge.first.main');
        if (mainDiv) mainDiv.style.width = '100%';
    }

    async function parseBlackList(response) {
        if (!response.ok) { setStatus('Blacklist update failed: HTTP ' + response.status, 'bad'); return; }
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        if (doc.querySelector('parsererror')) { setStatus('Blacklist update failed: parse error.', 'bad'); return; }
        let usersArray = [];
        let patternsArray = [];
        const xdata = doc.getElementsByClassName('xdata');
        if (xdata.length >= 1) {
            const text = xdata[0].textContent.trim();
            usersArray = listToArray(text);
            if (usersArray.length > 2) setStorageValue(keys.bannedUsers, text);
        }
        const extdata = doc.getElementsByClassName('extdata');
        if (extdata.length >= 1 && extdata[0].title) {
            try {
                const decoded = atob(rot13(extdata[0].title));
                patternsArray = listToArray(decoded);
                if (patternsArray.length > 2) setStorageValue(keys.bannedPatterns, decoded);
            } catch (e) { warn('Could not decode extdata patterns.', e); }
        }
        const msg = `Blacklist updated: ${usersArray.length} users, ${patternsArray.length} patterns.`;
        log(msg);
        setStatus(msg, 'ok');
    }

    function updateBlackList(force) {
        if (document.getElementsByClassName('login').length > 0) return;
        const timestamp = parseInt(getStorageValue(keys.updateTimestamp, '0'), 10) || 0;
        const now = Date.now();
        if (timestamp + 30 * 60 * 1000 > now && !force) return;
        setStorageValue(keys.updateTimestamp, String(now));
        setStatus('Updating blacklist...', 'warn');
        fetch('https://www.okoun.cz/boards/ryba_bez_parazitu?contextId=1071957010#article-1071957010')
            .then(parseBlackList)
            .catch(e => { warn('Blacklist update failed.', e); setStatus('Blacklist update failed. Network/CORS goblin.', 'bad'); });
    }

    function run() {
        hideSidebar();
        applyFiltersNow({ allowDelete: true });
        ensureFallbackButton();
        updateBlackList(false);
    }

    run();
})();
