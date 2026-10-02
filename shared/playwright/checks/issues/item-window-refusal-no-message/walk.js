// U08 A11: the item window's refused saves (no type, a URL that is not a
// web address, a path with other characters, a path already used). The
// report's Steps, on PKP's default test dataset, all three apps:
//   1-3  `rvaca`, Settings › Website › "Setup" › "Navigation", "Add item"
//   4    "u08b page", type left at "Choose a type...", "Save"
//   5    "Remote URL", "pkp.sfu.ca", "Save"
//   6    "Custom Page", path "my page", "Save"
//   7    path "u08b-page", "Save" (accepted)
//   8    "Add item", "u08b second", "Custom Page", path "u08b-page", "Save"
//   control: the "Navigation Menu Items" table after step 8
// `footnote` as the argument re-drives the register's own evidence (td2):
// the same steps as a journal manager on a scratch journal, which the kit
// builds through the test API beside `publicknowledge`.
// For each save it records the save's answer, whether the window stays,
// any message inside the window, the notices at the top right (and
// whether one is on top, not under the window), and the notification
// fetches answered meanwhile. The kit builds nothing.
//
// Reset first: PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:         PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<r>] node bin/probe.js all shared/playwright/checks/issues/item-window-refusal-no-message/walk.js
// Facts:       .reports/<feature>/<id>/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, screen, shot, idle, tag} = require('../../../probe');

const MODE = process.argv[2] || 'walk';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => (t || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Keep every notification fetch's answer (the call behind the notices at the top right). */
function watchFetches(page) {
    const fetches = [];
    page.on('response', async (r) => {
        if (!/notification\/fetch-?[nN]otification/.test(r.url())) return;
        let content = null;
        try {
            const j = await r.json();
            const c = j && j.content;
            content = c ? {
                inPlace: c.inPlace ? Object.values(c.inPlace).flatMap((lv) => Object.values(lv)).map((h) => flat(String(h).replace(/<[^>]+>/g, ' '), 300)) : [],
                general: c.general ? Object.values(c.general).flatMap((lv) => Object.values(lv)).map((n) => flat(`${n.title || ''}: ${n.text || ''}`, 300)) : [],
            } : null;
        } catch { content = 'unreadable'; }
        fetches.push({status: r.status(), content});
    });
    return fetches;
}

/** What the window shows after a save: messages in it, its in-form message box. */
async function windowState(win) {
    if (!(await win.form.isVisible().catch(() => false))) return {open: false};
    return win.root.evaluate((w) => {
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const sel = w.querySelector('select[name="menuItemType"]');
        const box = w.querySelector('#navigationMenuItemFormNotification');
        return {
            open: true,
            type: sel ? sel.options[sel.selectedIndex]?.text : null,
            messages: [...new Set([...w.querySelectorAll('label.error, .error, .pkp_form_error, #formErrors, .notifyFormError, [class*="Error"]')]
                .filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))],
            messageBox: box ? {visible: vis(box), text: box.innerText.replace(/\s+/g, ' ').trim()} : null,
        };
    }).catch((e) => ({error: String(e.message || e)}));
}

/** The notices at the top right now, each with whether it is on top at its centre. */
async function toasts(page) {
    return page.locator('.app__notifications .pkpNotification').evaluateAll((els) => els.map((e) => {
        const r = e.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return {text: e.innerText.replace(/\s+/g, ' ').trim(), shown: r.width > 0 && r.height > 0, onTop: !!top && e.contains(top),
            atCentre: top ? `${top.tagName.toLowerCase()}${top.id ? '#' + top.id : ''}.${String(top.className || '').split(/\s+/).slice(0, 3).join('.')}` : null};
    })).catch(() => []);
}

/** Press "Save" and read what follows. */
async function saveAndRead(page, win, fetches, name, {expectClose = false} = {}) {
    await screen(page); // drop the notices shown before
    const from = fetches.length;
    let answer = null;
    try {
        const r = await win.save();
        answer = {status: r.status, body: r.body ? {status: r.body.status, content: flat(r.body.content, 120), event: r.body.event ? flat(JSON.stringify(r.body.event), 120) : undefined} : null};
    } catch (e) { answer = {error: flat(String(e.message || e), 200)}; }
    if (expectClose) await win.form.waitFor({state: 'hidden', timeout: 15_000}).catch(() => {});
    await sleep(800);
    const atOnce = await toasts(page);
    await shot(page, name).catch(() => {});
    await sleep(1500);
    const s = await screen(page);
    return {answer, window: await windowState(win), toastsAtOnce: atOnce, notices: s.notices, fetches: fetches.slice(from)};
}

forEachApp(async (app) => {
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const facts = {app: app.name, line: app.line, mode: MODE};
    const fact = (k, v) => { facts[k] = v; console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 1200)); };
    const {page, close} = await launch(app);
    const fetches = watchFetches(page);
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push({type: d.type(), message: d.message()}); await d.accept(); });
    try {
        // 1-2
        let contextPath = app.contextPath;
        if (MODE === 'footnote') {
            contextPath = tag('u08b');
            await app.api.createContext({tag: contextPath, users: [{username: `${contextPath}mgr`, roles: ['manager']}]});
            facts.scratchContext = contextPath;
            await signIn(page, `${contextPath}mgr`, {password: `${contextPath}mgr${contextPath}mgr`, contextPath});
        } else {
            await signIn(page, 'rvaca');
        }
        const tab = new NavigationTab(page, contextPath);
        await tab.goto();
        await idle(page);
        fact('itemsBefore', await tab.rowTitles('items'));

        // 3-4
        let win = await tab.addItem();
        await win.titleInput('en').fill('u08b page');
        fact('s4-noType', await saveAndRead(page, win, fetches, 's4-no-type'));

        // 5
        await win.chooseType('Remote URL');
        await win.urlInput('en').fill('pkp.sfu.ca');
        fact('s5-badUrl', await saveAndRead(page, win, fetches, 's5-bad-url'));

        // 6
        await win.chooseType('Custom Page');
        await win.pathInput.fill('my page');
        fact('s6-badPath', await saveAndRead(page, win, fetches, 's6-bad-path'));

        // 7 (accepted)
        await win.pathInput.fill('u08b-page');
        fact('s7-saved', await saveAndRead(page, win, fetches, 's7-saved', {expectClose: true}));

        // 8
        await sleep(600); // the modal store's closing slot (patterns.md pitfall 4)
        win = await tab.addItem();
        await win.titleInput('en').fill('u08b second');
        await win.chooseType('Custom Page');
        await win.pathInput.fill('u08b-page');
        fact('s8-usedPath', await saveAndRead(page, win, fetches, 's8-used-path'));

        // control: the table behind the window
        fact('itemsAfter', await tab.rowTitles('items'));
        record('screen-after-s8', await screen(page));
    } finally {
        facts.dialogs = dialogs;
        record(MODE === 'walk' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
