// ==UserScript==
// @name         EchelonX
// @namespace    https://github.com/hanenashi/echelonx
// @version      0.1.0
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
    const STORAGE_PREFIX = 'cz.ocs.EchelonX.';

    const defaultBlackList = 'adijunkt, Bernhard_Weiss, bmn, Brandenburg, Bloodrot, Branimir, bretislav.jonas, d.smiricky, Dagobert_Durr, Das_Reich, florian_geyer, frantisek.kachna, Gotz_Berlichingen, Hajny_Filiburg, hamacek, Handschar, Hilfswilliger, horacek, Horst_Wessel, Charlemagne, Charlemagne_, Isidor, Januar, jarda.dusek, jasanek, Jurij_Ozerov, Kama, Karstjager, Koprovka, Knour, Kpt_Tuma, Landstorm_Netherland, Langemarck, Laser_eye, Lutzow, maqeo.cz, Maria_Theresia, mazurek, mazanej_lucifer, Mudrford, Neknubak, Nibelungen, Nord_, Norland, OberSturmKlippFurher, Oblazek, piANistka, Plch, Plsik_Liskovy, Polizei, pixicz, Prinz_Eugen, profesor_Birkermaier, Protez_alpska, prucha, ritna.diera, vojin.kouba, vonavka, Wallonien, Zufanek';
    const defaultRegexList = 'kouba$';

    function log(...args) {
        console.log(`[${APP}]`, ...args);
    }

    function warn(...args) {
        console.warn(`[${APP}]`, ...args);
    }

    function getStorageValue(key, defaultValue) {
        try {
            if (typeof GM_getValue === 'function') return GM_getValue(key, defaultValue);
        } catch (e) {
            warn('GM_getValue failed, falling back to localStorage', e);
        }
        try {
            const val = window.localStorage.getItem(STORAGE_PREFIX + key);
            return val === null ? defaultValue : val;
        } catch (e) {
            warn('localStorage read failed', e);
            return defaultValue;
        }
    }

    function setStorageValue(key, value) {
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue(key, value);
                return;
            }
        } catch (e) {
            warn('GM_setValue failed, falling back to localStorage', e);
        }
        try {
            window.localStorage.setItem(STORAGE_PREFIX + key, value);
        } catch (e) {
            warn('localStorage write failed', e);
        }
    }

    function escapeRegex(str) {
        return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function rot13(message) {
        const alpha = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLM';
        return String(message).replace(/[a-z]/gi, letter => alpha[alpha.indexOf(letter) + 13]);
    }

    function userListToArray(userList) {
        if (!userList || userList.trim().length === 0) return [];
        return userList.split(',').map(str => str.trim()).filter(Boolean);
    }

    function userListToRegexArray(userList) {
        return userListToArray(userList).map(name => '^' + escapeRegex(name) + '$');
    }

    function makeRegex(patterns) {
        const clean = patterns.filter(Boolean);
        if (!clean.length) return null;
        try {
            return new RegExp('(' + clean.join('|') + ')', 'i');
        } catch (e) {
            warn('Invalid blacklist regex; filtering skipped.', e, clean);
            return null;
        }
    }

    function findHeaderAnchor() {
        return document.querySelector('.head .user a') ||
            document.querySelector('.head a[href*="user"]') ||
            document.querySelector('.head a[href*="login"]') ||
            document.querySelector('.head a[href*="logout"]') ||
            document.querySelector('.head a') ||
            document.querySelector('a[href*="login"], a[href*="logout"], a[href*="user"]');
    }

    function togglePluginWidgetVisibility(event) {
        if (event) event.preventDefault();
        const widget = document.getElementById('echelonxPluginWidget');
        if (widget) widget.style.display = widget.style.display === 'none' ? 'block' : 'none';
    }

    function createPluginWidget() {
        let widget = document.getElementById('echelonxPluginWidget');
        if (widget) return widget;

        const anchor = findHeaderAnchor();
        const toggle = document.createElement('a');
        toggle.href = '#0';
        toggle.textContent = 'EchelonX';
        toggle.addEventListener('click', togglePluginWidgetVisibility);

        widget = document.createElement('div');
        widget.id = 'echelonxPluginWidget';
        widget.style.cssText = 'background:#fff;color:#000;border:2px solid #000;padding:10px;margin:5px;display:none;z-index:999999;position:relative;max-width:420px;font:14px sans-serif;';

        if (anchor && anchor.parentNode) {
            anchor.after(document.createTextNode(' | '));
            anchor.after(toggle);
            anchor.parentNode.after(widget);
        } else if (document.body) {
            const box = document.createElement('div');
            box.style.cssText = 'position:fixed;top:5px;right:5px;z-index:999999;background:#fff;color:#000;border:1px solid #000;padding:4px;';
            box.append(toggle, widget);
            document.body.append(box);
        } else {
            return null;
        }
        return widget;
    }

    function getPluginWidgetNode() {
        return document.getElementById('echelonxPluginWidget') || createPluginWidget();
    }

    function addCheckbox(name, defaultVal, pluginNode) {
        const label = document.createElement('label');
        label.style.display = 'block';
        const checkBox = document.createElement('input');
        checkBox.type = 'checkbox';
        checkBox.checked = getStorageValue(name, defaultVal ? 'true' : 'false') === 'true';
        checkBox.addEventListener('change', event => setStorageValue(name, event.target.checked ? 'true' : 'false'));
        label.append(checkBox, ' ', name);
        pluginNode.append(label);
    }

    function addTextArea(name, defaultVal, pluginNode) {
        const label = document.createElement('label');
        label.style.display = 'block';
        label.textContent = name;
        const textArea = document.createElement('textarea');
        textArea.value = getStorageValue(name, defaultVal);
        textArea.style.cssText = 'display:block;width:100%;min-height:70px;box-sizing:border-box;';
        textArea.addEventListener('change', event => setStorageValue(name, event.target.value));
        label.append(textArea);
        pluginNode.append(label);
    }

    function addButton(name, callback, pluginNode) {
        const button = document.createElement('button');
        button.textContent = name;
        button.type = 'button';
        button.addEventListener('click', callback);
        pluginNode.append(button);
    }

    function addPluginSettings(pluginNode) {
        if (!pluginNode) return;
        pluginNode.textContent = '';
        const title = document.createElement('div');
        title.textContent = `${APP} ${GM_info?.script?.version || ''}`;
        title.style.fontWeight = 'bold';
        pluginNode.append(title);

        addButton('Zkontrolovat aktualizace blacklistu', () => updateBlackList(true), pluginNode);
        addCheckbox('Schovávat', true, pluginNode);
        addCheckbox('Jen minimalizovat', false, pluginNode);
        addCheckbox('Mazat', true, pluginNode);
        addCheckbox('I z vlastního filtru ⚠️', false, pluginNode);
        addTextArea('Vlastní filtr', 'testovaci.kakes', pluginNode);
    }

    function getPostRoot(userSpan) {
        return userSpan.closest('.item') ||
            userSpan.closest('article') ||
            userSpan.closest('li') ||
            userSpan.parentNode?.parentNode ||
            null;
    }

    function findUserSpans() {
        return Array.from(document.querySelectorAll('span.user, .user span, .user a'))
            .filter(el => el.textContent && el.textContent.trim());
    }

    function deletePosts(patterns) {
        const regex = makeRegex(patterns);
        if (!regex) return;

        let selectedPosts = 0;
        for (const span of findUserSpans()) {
            if (!regex.test(span.textContent)) continue;
            regex.lastIndex = 0;
            const root = getPostRoot(span);
            if (!root) continue;
            const checkboxes = root.querySelectorAll('input[type="checkbox"]');
            for (const checkbox of checkboxes) {
                checkbox.checked = true;
                selectedPosts++;
            }
        }

        if (selectedPosts <= 0) return;

        const deleteForm = document.querySelector('form[name="markArticlesForm"], form[name="markMessagesForm"]');
        if (!deleteForm) {
            warn(`Would delete ${selectedPosts} posts, but delete form was not found.`);
            return;
        }

        log(`Deleting ${selectedPosts} matching checkbox(es).`);
        const host = document.getElementById('body') || document.body;
        const iframe = document.createElement('iframe');
        iframe.height = '1';
        iframe.width = '1';
        iframe.name = 'echelonxDeletionIframe';
        iframe.id = 'echelonxDeletionIframe';
        iframe.style.display = 'none';
        host.appendChild(iframe);

        const oldTarget = deleteForm.target;
        deleteForm.target = 'echelonxDeletionIframe';
        deleteForm.submit();
        deleteForm.target = oldTarget;
    }

    function hidePostsRegex(patterns, minimizeOnly) {
        const regex = makeRegex(patterns);
        if (!regex) return;

        for (const span of findUserSpans()) {
            if (!regex.test(span.textContent)) continue;
            regex.lastIndex = 0;
            const root = getPostRoot(span);
            if (!root) continue;

            root.querySelectorAll('img').forEach(img => { img.src = ''; });

            if (minimizeOnly) {
                root.style.height = '1.5em';
                root.style.overflow = 'hidden';
                root.style.border = '1px solid gray';
                root.style.opacity = '0.5';
                root.title = 'EchelonX hidden post - click to toggle';
                root.addEventListener('click', () => {
                    root.style.height = root.style.height === '' ? '1.5em' : '';
                });
            } else {
                root.remove();
            }
        }
    }

    function hideSidebar() {
        const hideReqDiv = document.getElementsByClassName('HideSidebar');
        if (hideReqDiv.length !== 1) return;
        const sidebar = document.querySelector('.yui-u.ctx, .yui-u.ctx');
        if (sidebar) sidebar.remove();
        const mainDiv = document.querySelector('.yui-u.yui-ge.first.main');
        if (mainDiv) mainDiv.style.width = '100%';
    }

    async function parseBlackList(response) {
        if (!response.ok) return;
        const responseText = await response.text();
        const doc = new DOMParser().parseFromString(responseText, 'text/html');
        if (doc.querySelector('parsererror')) return;

        const xdata = doc.getElementsByClassName('xdata');
        let usersArray = [];
        let patternsArray = [];

        if (xdata.length >= 1) {
            const text = xdata[0].textContent.trim();
            usersArray = text.split(',').map(s => s.trim()).filter(Boolean);
            if (usersArray.length > 2) setStorageValue('bannedUsers', text);
        }

        const regexCyphertext = doc.getElementsByClassName('extdata');
        if (regexCyphertext.length >= 1 && regexCyphertext[0].title) {
            try {
                const asciidata = atob(rot13(regexCyphertext[0].title));
                patternsArray = asciidata.split(',').map(s => s.trim()).filter(Boolean);
                if (patternsArray.length > 2) setStorageValue('bannedPatterns', asciidata);
            } catch (e) {
                warn('Could not decode extdata patterns.', e);
            }
        }

        log(`Blacklist updated: ${usersArray.length} users, ${patternsArray.length} patterns.`);
    }

    function updateBlackList(force) {
        if (document.getElementsByClassName('login').length > 0) return;

        const updateTimestamp = parseInt(getStorageValue('updateTimestamp', '0'), 10) || 0;
        const currentTimestamp = Date.now();
        const updateInterval = 30 * 60 * 1000;
        if (updateTimestamp + updateInterval > currentTimestamp && !force) return;

        setStorageValue('updateTimestamp', String(currentTimestamp));
        fetch('https://www.okoun.cz/boards/ryba_bez_parazitu?contextId=1071957010#article-1071957010')
            .then(parseBlackList)
            .catch(e => warn('Blacklist update failed.', e));
    }

    function run() {
        const blackListString = getStorageValue('bannedUsers', defaultBlackList);
        const regexListString = getStorageValue('bannedPatterns', defaultRegexList);
        const blackList = userListToRegexArray(blackListString).concat(userListToArray(regexListString));

        const customBlackListString = getStorageValue('Vlastní filtr', 'testovaci.kakes');
        const customBlackList = userListToRegexArray(customBlackListString);

        const filteringEnabled = getStorageValue('Schovávat', 'true') === 'true';
        const minimizeOnly = getStorageValue('Jen minimalizovat', 'false') === 'true';
        const deletingEnabled = getStorageValue('Mazat', 'true') === 'true';
        const customDeletingEnabled = getStorageValue('I z vlastního filtru ⚠️', 'false') === 'true';

        hideSidebar();

        if (deletingEnabled) {
            deletePosts(customDeletingEnabled ? blackList.concat(customBlackList) : blackList);
        }
        if (filteringEnabled) {
            hidePostsRegex(blackList.concat(customBlackList), minimizeOnly);
        }

        const pluginNode = getPluginWidgetNode();
        if (pluginNode) addPluginSettings(pluginNode);
        updateBlackList(false);
    }

    run();
})();
