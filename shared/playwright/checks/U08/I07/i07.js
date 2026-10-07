// U08 claim check I07 (housekeeping 2026-10-07): the incidental rows for U08 in
// docs/tracking/incidentals.md, row 26 (A11, the item window's refused saves) and row 30
// (A17 / Rule 6a, the menu window's discarded change and the leave question).
// Chunk: .reports/hk07/chunks/U08.md. Spec: docs/specs/U08-navigation-menus-and-site-chrome.md
// Fields (the item window, the paragraph under its table), Rule 6/6a, scenario 5, A11, A17,
// notes l, j, td2, td7, f-a11, f-a17.
//
// Run (twice, each run under its own PROBE_RUN; every run seeds its own scratch journal):
//   PROBE_RUN=r1 PROBE_FEATURE=U08 PROBE_AGENT=ccI07 node bin/probe.js all shared/playwright/checks/U08/I07/i07.js
//   PROBE_RUN=r2 PROBE_FEATURE=U08 PROBE_AGENT=ccI07 node bin/probe.js all shared/playwright/checks/U08/I07/i07.js
//   PHASES=a11,a17,a17pk,scen5 (default: all); A17_PATHS=edit:drag,... narrows the a17 paths
//
// Phases (Settings › Website › "Setup" › "Navigation"):
//   a11    as the Journal Manager of a scratch journal (tag u08i07): "Add item", each refused
//          "Save" (no type; "Remote URL" "pkp.sfu.ca"; "Custom Page" "my page"), the accepted
//          path, then a second item on the same path; then the saved item's "Edit" with "my page"
//          and with a used path; an empty "Title" as the control. For each save: the save's
//          answer, the page notices polled every 100 ms for 6 s after the press (text, first-seen
//          ms, whether it sits on top of the window), whether the window stays, any mark on a box,
//          and, after a reload, the items table (nothing stored).
//   a17    the same scratch manager: "Add Menu" and the "Primary Navigation Menu"'s "Edit" with a
//          changed area, a typed title and a drag, each discarded with "Cancel" › "Yes", then 3 s,
//          then the side menu's Settings › "Workflow": the leave question and the page's
//          `beforeunload` listeners; the same with no wait ("quick", the 2026-09-23 timing); the
//          back arrow and Escape with "Yes"; "none" (unchanged) and "open" (leave with the change
//          held) as controls.
//   a17pk  manager.maya on publicknowledge (seeded data, nothing saved): area, title and drag on
//          "Add Menu", slow, as a second account.
//   scen5  scenario 5 as the spec writes it, on its own scratch journal: no title, no type, not a web
//          address, a path with other characters, a path accepted, a path already used, then at once
//          the back arrow (the browser's question recorded).
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag} = require('../../../probe');
const L = require('../../issues/discarded-menu-change-holds-page/lib');

const ALL = ['a11', 'a17', 'a17pk', 'scen5'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/** Poll the page notices for `ms` after a press: each text with the ms it was first seen and whether it sits on top. */
async function pollNotices(page, t0, ms = 6_000) {
    const seen = new Map();
    while (Date.now() - t0 < ms) {
        const now = await page.locator('.app__notifications .pkpNotification').evaluateAll((els) => els.map((e) => {
            const r = e.getBoundingClientRect();
            const top = r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
            return {text: e.innerText.replace(/\s+/g, ' ').trim(), shown: r.width > 0 && r.height > 0, onTop: !!top && e.contains(top), box: [Math.round(r.left), Math.round(r.top)]};
        })).catch(() => []);
        for (const n of now) {
            const k = n.text;
            if (!seen.has(k)) seen.set(k, {...n, firstMs: Date.now() - t0, lastMs: Date.now() - t0});
            else seen.get(k).lastMs = Date.now() - t0;
        }
        await sleep(100);
    }
    return [...seen.values()];
}

/** What the item window shows now: open or not, its in-form messages, any box marked as wrong. */
async function itemWindowState(win) {
    if (!(await win.form.isVisible().catch(() => false))) return {open: false};
    return win.root.evaluate((w) => {
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const sel = w.querySelector('select[name="menuItemType"]');
        const box = w.querySelector('#navigationMenuItemFormNotification');
        const marked = [...w.querySelectorAll('input, select, textarea')].filter(vis)
            .filter((e) => /error|invalid/i.test(e.className) || e.getAttribute('aria-invalid') === 'true')
            .map((e) => `${e.name || e.id}:${e.className}`);
        return {
            open: true,
            type: sel ? sel.options[sel.selectedIndex]?.text : null,
            messages: [...new Set([...w.querySelectorAll('label.error, .error, .pkp_form_error, #formErrors, .notifyFormError, .pkpFieldError, [class*="Error"]')]
                .filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))],
            messageBox: box ? {visible: vis(box), text: box.innerText.replace(/\s+/g, ' ').trim()} : null,
            markedBoxes: marked,
            text: w.innerText.replace(/\s+/g, ' ').trim().slice(0, 1500),
        };
    }).catch((e) => ({error: flat(e.message, 200)}));
}

forEachApp(async (app) => {
    const {NavigationTab, MenuWindow, ItemWindow} = require('../../../pages/NavigationChromePages.js');
    const fact = (k, v) => { record('i07-facts', {[k]: v}, {merge: true}); console.log(`[i07 ${app.name} ${k}]`, JSON.stringify(v).slice(0, 1500)); };
    const snap = async (page, name) => { const s = await screen(page); record(`i07-${name}`, s); await shot(page, `i07-${name}`).catch(() => {}); return s; };

    const t = tag('u08i07');
    const {contextId} = await app.api.createContext({tag: t, context: {name: `U08 I07 ${t}`, acronym: 'I07'}, users: [{username: `${t}mg`, roles: ['manager']}]});
    fact('scratch', {path: t, contextId, manager: `${t}mg`});

    const {page} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push({type: d.type(), message: flat(d.message(), 200), at: Date.now()}); d.accept().catch(() => {}); });

    // ------------------------------------------------------------------ a11
    if (on('a11')) {
        await signIn(page, `${t}mg`, {contextPath: t});
        const tab = new NavigationTab(page, t);
        const CTX = t;
        await tab.goto();
        await idle(page);
        await snap(page, 'a11-tab');
        const itemsBefore = await tab.rowTitles('items');
        fact('a11-itemsBefore', itemsBefore);

        const saveAndRead = async (win, name, {expectClose = false} = {}) => {
            await screen(page); // drop notices shown before
            const dBefore = dialogs.length;
            const t0 = Date.now();
            const savePromise = win.save().then((r) => ({status: r.status, body: r.body ? {status: r.body.status, content: flat(r.body.content, 120), event: r.body.event ? flat(JSON.stringify(r.body.event), 160) : undefined} : null}), (e) => ({error: flat(e.message, 200)}));
            const noticesP = pollNotices(page, t0, 6_000);
            const answer = await savePromise;
            const answerMs = Date.now() - t0;
            if (expectClose) await win.form.waitFor({state: 'hidden', timeout: 15_000}).catch(() => {});
            await sleep(300);
            await shot(page, `i07-${name}`).catch(() => {});
            const winAtOnce = await itemWindowState(win);
            const notices = await noticesP;
            const s = await screen(page);
            record(`i07-${name}`, s);
            const out = {answer, answerMs, window: winAtOnce, windowAfter6s: await itemWindowState(win), notices, screenNotices: s.notices, dialogs: dialogs.slice(dBefore)};
            fact(name, out);
            return out;
        };

        // Add item, no type
        let win = await tab.addItem();
        await snap(page, 'a11-add-open');
        await loc(page, 'item window: Navigation Menu Type select', win.typeSelect);
        await win.titleInput('en').fill('u08i07 page');
        await saveAndRead(win, 'a11-noType');
        // Remote URL, pkp.sfu.ca
        await win.chooseType('Remote URL');
        await win.urlInput('en').fill('pkp.sfu.ca');
        await saveAndRead(win, 'a11-badUrl');
        // Custom Page, my page
        await win.chooseType('Custom Page');
        await win.pathInput.fill('my page');
        await saveAndRead(win, 'a11-badPath');
        // accepted
        await win.pathInput.fill('u08i07-page');
        await saveAndRead(win, 'a11-saved', {expectClose: true});
        await sleep(800);
        // a second item on the same path
        win = await tab.addItem();
        await win.titleInput('en').fill('u08i07 second');
        await win.chooseType('Custom Page');
        await win.pathInput.fill('u08i07-page');
        await saveAndRead(win, 'a11-usedPath');
        // control: empty Title, no request expected
        await win.titleInput('en').fill('');
        {
            const reqs = [];
            const onReq = (r) => { if (/update-navigation-menu-item/.test(r.url())) reqs.push(r.method()); };
            page.on('request', onReq);
            const t0 = Date.now();
            await win.saveButton.click();
            const notices = await pollNotices(page, t0, 3_000);
            page.off('request', onReq);
            fact('a11-emptyTitle', {requests: reqs, window: await itemWindowState(win), notices});
            await snap(page, 'a11-emptyTitle');
        }
        // leave the window by its back arrow (A18 territory, recorded only)
        {
            const dBefore = dialogs.length;
            await win.closeButton.click().catch(() => {});
            await win.form.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
            fact('a11-closeAfterRefusals', {closed: !(await win.form.isVisible().catch(() => false)), dialogs: dialogs.slice(dBefore)});
        }
        await sleep(800);
        // Edit the saved item: a bad path, then a used path (the "Our page"-like built-in has none, so seed another)
        win = await tab.addItem();
        await win.titleInput('en').fill('u08i07 other');
        await win.chooseType('Custom Page');
        await win.pathInput.fill('u08i07-other');
        await saveAndRead(win, 'a11-savedOther', {expectClose: true});
        await sleep(800);
        win = await tab.editItem('u08i07 page');
        await snap(page, 'a11-edit-open');
        await win.pathInput.fill('my page');
        await saveAndRead(win, 'a11-edit-badPath');
        await win.pathInput.fill('u08i07-other');
        await saveAndRead(win, 'a11-edit-usedPath');
        await win.chooseType('Remote URL');
        await win.urlInput('en').fill('pkp.sfu.ca');
        await saveAndRead(win, 'a11-edit-badUrl');
        // the edit's "Choose a type..." (no type)
        await win.typeSelect.selectOption({index: 0});
        await saveAndRead(win, 'a11-edit-noType');
        // nothing stored: reload and read the table and the saved item's window
        // a fresh load (a reload then the same #hash address can miss the tab; OPS r2 2026-10-07)
        await page.goto(app.url(`/index.php/${CTX}/management/settings/workflow`));
        await tab.goto();
        await idle(page);
        await snap(page, 'a11-tab-after');
        fact('a11-itemsAfter', await tab.rowTitles('items'));
        win = await tab.editItem('u08i07 page');
        fact('a11-editAfterReload', {type: await win.typeSelect.evaluate((s) => s.options[s.selectedIndex].text), path: await win.pathInput.inputValue().catch(() => null)});
        await snap(page, 'a11-edit-after');
        await win.closeButton.click().catch(() => {});
        await win.form.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    }

    // ------------------------------------------------------------------ scen5
    if (on('scen5')) {
        const t5 = tag('u08i07s');
        await app.api.createContext({tag: t5, context: {name: `U08 I07 S5 ${t5}`, acronym: 'I07S'}, users: [{username: `${t5}mg`, roles: ['manager']}]});
        fact('scen5-scratch', t5);
        await signIn(page, `${t5}mg`, {contextPath: t5});
        const tab = new NavigationTab(page, t5);
        const CTX = t5;
        await tab.goto();
        await idle(page);
        const step = async (name, w) => {
            await screen(page);
            const t0 = Date.now();
            const reqs = [];
            const onReq = (r) => { if (/update-navigation-menu-item/.test(r.url())) reqs.push(r.method()); };
            page.on('request', onReq);
            await w.saveButton.click();
            const notices = await pollNotices(page, t0, 6_000);
            page.off('request', onReq);
            const s = await snap(page, `scen5-${name}`);
            const out = {requests: reqs, notices: notices.map((n) => [n.text, n.firstMs, n.onTop]), window: await itemWindowState(w), screenNotices: s.notices};
            if (out.window && out.window.text) out.window.text = out.window.text.slice(0, 300);
            fact(`scen5-${name}`, out);
        };
        let w = await tab.addItem();
        await w.chooseType('Remote URL');
        await w.urlInput('en').fill('https://pkp.sfu.ca');
        await step('noTitle', w);
        await w.titleInput('en').fill('Our page');
        await w.typeSelect.selectOption({label: 'Choose a type...'});
        await step('noType', w);
        await w.chooseType('Remote URL');
        await w.urlInput('en').fill('pkp.sfu.ca');
        await step('notWebAddress', w);
        await w.chooseType('Custom Page');
        await w.pathInput.fill('my page');
        await step('pathOtherChars', w);
        await w.pathInput.fill('our-page');
        await step('pathAccepted', w);
        fact('scen5-itemsAfterAccepted', await tab.rowTitles('items'));
        await sleep(800);
        w = await tab.addItem();
        await w.titleInput('en').fill('Second page');
        await w.chooseType('Custom Page');
        await w.pathInput.fill('our-page');
        await step('pathUsed', w);
        const dBefore = dialogs.length;
        await w.closeButton.click().catch(() => {});
        const closed = await w.form.waitFor({state: 'hidden', timeout: 10_000}).then(() => true, () => false);
        await sleep(500);
        fact('scen5-backArrow', {closed, dialogs: dialogs.slice(dBefore)});
        // a fresh load (a reload then the same #hash address can miss the tab; OPS r2 2026-10-07)
        await page.goto(app.url(`/index.php/${CTX}/management/settings/workflow`));
        await tab.goto();
        await idle(page);
        await snap(page, 'scen5-tab-after');
        fact('scen5-itemsAfterReload', await tab.rowTitles('items'));
    }

    // ------------------------------------------------------------------ a17
    const a17 = async (contextPath, prefix, paths) => {
        const tab = new NavigationTab(page, contextPath);
        for (const spec of paths) {
            const [how, change, timing = 'slow', closeBy = 'cancel'] = spec.split(':');
            const key = `${prefix}-${how}-${change}-${timing}-${closeBy}`;
            const f = {};
            await tab.goto();
            await idle(page);
            f.menusBefore = await L.menuTitles(tab);
            f.listenersOnTab = await L.unloadListeners(page);
            if (how === 'add') f.window = await L.openAddMenu(page, tab.addMenuLink);
            else { await tab.openMenu('Primary Navigation Menu'); await sleep(800); f.window = await L.openWindow(page); }
            f.listenersWindowOpen = await L.unloadListeners(page);
            try {
                if (change === 'area' || change === 'open') f.change = {area: await L.chooseArea(page, how === 'add' ? 'user' : 'None')};
                else if (change === 'title') f.change = {title: await L.typeTitle(page, 'u08i07 menu')};
                else if (change === 'drag') {
                    const mw = new MenuWindow(page);
                    const un = await mw.titles('unassigned');
                    const pick = how === 'add' ? 'About' : (un[0] || null);
                    // "Add Menu": onto the empty panel. "Edit": before the first top-level item, so the
                    // drop is never a third level (Rule 5a), which the editor refuses and leaves no change.
                    const first = how === 'add' ? null : (await mw.titles('assigned'))[0];
                    if (pick) { await mw.drag('unassigned', pick, first ? {panel: 'assigned', item: first, where: 'top'} : {panel: 'assigned'}); await sleep(1_000); }
                    f.change = {dragged: pick, assigned: await mw.outline('assigned')};
                } else f.change = null;
            } catch (e) { f.change = {error: flat(e.message, 200)}; }
            await snap(page, `${key}-changed`);
            if (change !== 'open') {
                const wait = timing === 'quick' ? 0 : timing === '1s' ? 1_000 : 3_000;
                if (closeBy === 'cancel') f.close = await L.cancelAndDiscard(page, dialogs, {wait});
                else {
                    const out = {};
                    if (closeBy === 'back') await new MenuWindow(page).closeButton.click().catch((e) => { out.err = flat(e.message, 120); });
                    else await page.keyboard.press('Escape');
                    const warning = new MenuWindow(page).warningDialog;
                    if (await warning.waitFor({state: 'visible', timeout: 2_500}).then(() => true, () => false)) {
                        out.asked = flat(await warning.innerText(), 200);
                        await warning.getByRole('button', {name: 'Yes', exact: true}).click();
                    } else out.asked = null;
                    out.closed = await page.locator('[data-cy="navigation-menu-editor"]:visible').first().waitFor({state: 'hidden', timeout: 10_000}).then(() => true, () => false);
                    await sleep(wait);
                    f.close = out;
                }
                if (timing === 'slow') {
                    f.listenersAfterClose = await L.unloadListeners(page);
                    f.menusAfter = await L.menuTitles(tab);
                    await snap(page, `${key}-closed`);
                }
            }
            if (change === 'open') {
                // The open side window covers the side menu (a person leaves through the browser): a typed address.
                const dBefore = dialogs.length;
                const leave = {via: 'typed address of Settings › Workflow'};
                await page.goto(app.url(`/index.php/${contextPath}/management/settings/workflow`)).catch((e) => { leave.error = flat(e.message, 160); });
                await sleep(500);
                leave.leaveQuestion = dialogs.slice(dBefore).some((d) => d.type === 'beforeunload');
                leave.dialogs = dialogs.slice(dBefore);
                leave.url = page.url().replace(/^https?:\/\/[^/]+/, '');
                f.leave = leave;
            } else f.leave = await L.leaveToWorkflow(page, dialogs);
            fact(key, f);
        }
    };

    if (on('a17')) {
        await signIn(page, `${t}mg`, {contextPath: t});
        await a17(t, 'a17', process.env.A17_PATHS ? process.env.A17_PATHS.split(',') : [
            'add:none', 'add:open',
            'add:area', 'add:title', 'add:drag',
            'add:area:quick', 'add:title:quick', 'add:drag:quick', 'add:area:1s', 'add:drag:1s',
            'edit:area', 'edit:title', 'edit:drag',
            'add:area:slow:back', 'add:title:slow:escape',
        ]);
    }
    if (on('a17pk')) {
        await signIn(page, 'manager.maya');
        await a17(app.contextPath, 'a17pk', ['add:area', 'add:title', 'add:drag', 'add:open']);
    }
    fact('dialogsAll', dialogs);
});
