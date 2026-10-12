// Issue report docs/issues/U09-A11-static-page-refusal-repeated-after-save.md, steps 23-30
// (U46 A8, which joined the report): a "URL Path" refused in a galley's "Edit" window shows its
// message under the box, and comes back as a red notice at the top right with the next good
// "Save", once per refusal, or on the next page load when the window is left with "Cancel".
// Walked through the screens on PKP's default test dataset (a dataset fleet), as `dbarnes`:
// OJS submission 1 "Signalling Theory Dividends" (its newest version, unpublished, has the
// galley "PDF Version 2"); OPS preprint 1 "The influence of lactation on the quantity and
// quality of cashmere production" (not posted, galley "PDF"). A press has no galleys: skipped.
// The kit builds nothing. Records the screens; asserts nothing.
//
// MODE=walk (default), the report's steps:
//   23.    sign in as dbarnes; submission 1; Publication ("Preprint") › "Galleys"
//   24.    the row's "More Actions" › "Edit"
//   25-26. "URL Path" `123`, "Save" (refused); `my galley`, "Save" (refused)
//   27.    `u46rf7-pdf`, "Save"
//   28-30. "Edit" again, `123`, "Save" (refused); "Cancel"; a reload of the page (and a second)
// MODE=nb, the neighbour alone (with the fix in and out): "Edit" saved with `u46rf7-ctl` and no
//   refusal before it (no notice); "Add galley" › "Save" with an empty "Galley Label" (refused in
//   the browser, no save sent, no notice).
// MODE=reach, the page's other window alone (walked, not a step of the report): "Add galley",
//   "Galley Label" `u46rf7 new`, "URL Path" `123`, "Save" (refused); `u46rf7-new`, "Save" (the
//   upload window opens); the upload window's "Cancel".
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/static-page-refusal-repeated-after-save/galley.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the 3.5 fleet's feature, PROBE_RUN=r35.
// Facts: .reports/<feature>/<agent>/galley-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');
const G = require('../remote-galley-asked-for-file/lib');

const MODE = process.env.MODE || 'walk';
const {T, sleep, flat} = L;

forEachApp(async (app) => {
    if (app.name === 'omp') { console.log('[galley] omp: a press has no galleys; skipped'); return; }
    if (!app.dataset) throw new Error('galley.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {GalleyWindow, GALLEYS_TEXT} = require('../../../pages/GalleysPages.js');
    const ID = 1;
    const ROW = app.name === 'ops' ? 'PDF' : 'PDF Version 2';
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[galley] ${app.name} ${MODE} ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    const snap = async (page, name) => { record(name, await screen(page).catch(() => null)); await shot(page, name).catch(() => {}); };
    const {page, close} = await launch(app);
    const fetches = L.watchFetches(page);
    const saves = [];
    page.on('request', (r) => { if (r.url().includes('update-galley') && r.method() === 'POST') saves.push(Date.now()); });
    page.on('dialog', async (d) => { await d.accept().catch(() => {}); });

    /** The open galley window, found by the heading it shows. */
    const openWindow = async () => {
        await page.locator('form[id$="GalleyForm"] input[name="label"]').last().waitFor({timeout: T});
        const heading = await G.topHeading(page);
        const win = new GalleyWindow(page, heading);
        await win.expectLoaded();
        return {win, heading};
    };
    /** The window as it stands: open or not, the "URL Path" box, the messages in it, its message boxes. */
    const windowState = async (win) => {
        if ((await win.dialog().count()) === 0) return {open: false};
        return {
            open: true,
            urlPath: await win.urlPathBox().inputValue().catch(() => null),
            messages: await win.form().locator('label.error, .sub_label.error, .error, .pkp_form_error')
                .evaluateAll((els) => [...new Set(els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))]).catch(() => null),
            messageBoxes: await win.form().locator('.pkp_notification').count().catch(() => null),
        };
    };
    /** Type a "URL Path" and press "Save" on a form the server refuses; the window is read 2 s on. */
    const refuse = async (win, value) => {
        await win.type(win.urlPathBox(), value);
        const out = await L.noticesAfter(page, fetches, async () => {
            await win.saveRefused().catch((e) => fact(`save of "${value}" did not stay open`, String(e).split('\n')[0].slice(0, 200)));
        });
        return {typed: value, notices: out.notices, notificationRequests: out.fetches, window: await windowState(win)};
    };

    try {
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});                         // 23
        const galleys = await G.openGalleys(page, app, ID);
        fact('23 galleys', await galleys.labels());

        if (MODE === 'walk') {
            fact('24 menu', await galleys.openMenu(ROW));                                     // 24
            await galleys.choose('Edit');
            let {win, heading} = await openWindow();
            fact('24 window', {heading, ...(await windowState(win))});

            fact('25 refused', await refuse(win, '123'));                                     // 25
            await snap(page, 'galley-25-refused');
            fact('26 refused', await refuse(win, 'my galley'));                               // 26
            await snap(page, 'galley-26-refused');

            await win.type(win.urlPathBox(), 'u46rf7-pdf');                                   // 27
            const s27 = await L.noticesAfter(page, fetches, async () => {
                const r = await win.save().catch((e) => ({error: String(e).split('\n')[0].slice(0, 200)}));
                return r && r.error ? r : {status: r.status()};
            });
            fact('27 saved', {...s27, notificationRequests: s27.fetches, fetches: undefined, window: await windowState(win), rows: await galleys.labels()});
            await snap(page, 'galley-27-saved');

            await galleys.openMenu(ROW);                                                      // 28
            await galleys.choose('Edit');
            ({win, heading} = await openWindow());
            fact('28 reopened', await windowState(win));
            fact('28 refused', await refuse(win, '123'));
            const s29 = await L.noticesAfter(page, fetches, async () => {                     // 29
                await win.cancel().catch((e) => fact('29 cancel error', String(e).split('\n')[0].slice(0, 200)));
            });
            fact('29 cancelled', {notices: s29.notices, notificationRequests: s29.fetches, window: await windowState(win)});
            const s30 = await L.noticesAfter(page, fetches, async () => {                     // 30
                await page.reload();
                await idle(page);
            });
            fact('30 reloaded', {notices: s30.notices, notificationRequests: s30.fetches, url: flat(G.rel(page.url()), 160)});
            await snap(page, 'galley-30-reloaded');
            const s30b = await L.noticesAfter(page, fetches, async () => {
                await page.reload();
                await idle(page);
            });
            fact('30 reloaded again', {notices: s30b.notices, notificationRequests: s30b.fetches});
        } else if (MODE === 'nb') {
            await galleys.openMenu(ROW);
            await galleys.choose('Edit');
            const {win} = await openWindow();
            await win.type(win.urlPathBox(), 'u46rf7-ctl');
            const c = await L.noticesAfter(page, fetches, async () => {
                const r = await win.save().catch((e) => ({error: String(e).split('\n')[0].slice(0, 200)}));
                return r && r.error ? r : {status: r.status()};
            });
            fact('nb good save, no refusal before', {result: c.result, notices: c.notices, notificationRequests: c.fetches, window: await windowState(win), rows: await galleys.labels()});
            await snap(page, 'galley-nb-good-save');

            const add = await galleys.openCreate();
            const from = saves.length;
            const b = await L.noticesAfter(page, fetches, async () => add.saveRefusedInBrowser().catch((e) => ({error: String(e).split('\n')[0].slice(0, 200)})));
            fact('nb empty label', {
                savesSent: saves.length - from, notices: b.notices, notificationRequests: b.fetches,
                required: (await add.form().innerText().catch(() => '')).includes(GALLEYS_TEXT.required), window: await windowState(add),
            });
            await snap(page, 'galley-nb-empty-label');
            await add.cancel().catch(() => {});
        } else if (MODE === 'reach') {
            const add = await galleys.openCreate();
            await add.type(add.labelBox(), 'u46rf7 new');
            fact('reach refused', await refuse(add, '123'));
            await snap(page, 'galley-reach-refused');
            await add.type(add.urlPathBox(), 'u46rf7-new');
            const s = await L.noticesAfter(page, fetches, async () => {
                const r = await add.save().catch((e) => ({error: String(e).split('\n')[0].slice(0, 200)}));
                return r && r.error ? r : {status: r.status()};
            });
            fact('reach saved', {result: s.result, notices: s.notices, notificationRequests: s.fetches, windowOnTop: await G.topHeading(page)});
            await snap(page, 'galley-reach-saved');
            const w = await L.noticesAfter(page, fetches, async () => {
                await galleys.cancelWizard().catch((e) => fact('reach wizard cancel error', String(e).split('\n')[0].slice(0, 200)));
            });
            fact('reach wizard cancelled', {notices: w.notices, notificationRequests: w.fetches, rows: await galleys.labels()});
        }
    } catch (e) {
        fact('FAILED', String(e.stack || e).split('\n').slice(0, 4).join(' | '));
        await snap(page, `galley-${MODE}-failed`);
    } finally {
        record(`galley-${MODE}`, facts);
        await sleep(100);
        await close();
    }
});
