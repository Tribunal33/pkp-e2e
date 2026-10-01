// U21 A18 and A4 issue walk: the submission wizard's autosave timer.
// Steps (docs/issues/U21-A18-wizard-saves-late-typing-cut.md, docs/issues/U21-A4-wizard-footer-claims-save-on-load.md),
// on the default dataset, as the author (OJS/OPS ccorino, OMP aclark), a submission begun on screen:
//   MODE=late (A18): on "Details", touch nothing until 75 s after the wizard opened, type the Title at a key every 250 ms,
//     wait 5 s, reload, read "Title".
//   MODE=footer (A4): on "Details", touch nothing for 2 minutes, reload, read the footer at once.
//   MODE=neighbour: the paths both fixes must leave alone. The Title typed 5 s after the wizard opened is saved about a
//     minute after the opening (not at once, not key by key); the footer then reads "Last saved …"; an abstract typed
//     and "Continue" pressed is saved at once.
//
//   npm run fleet-prep -- --feature issues-ir31 --dataset 1 --reset
//   MODE=late PROBE_FEATURE=issues-ir31 PROBE_AGENT=ir31 node bin/probe.js all shared/playwright/checks/issues/wizard-autosave-timer/walk.js
//   (PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5; PROBE_RUN=<tag> keeps runs' records apart)
//   Fix trials: node bin/try-fix.js apply shared/playwright/checks/issues/wizard-autosave-timer/fix-a18.diff ojs omp ops,
//   then MODE=late and MODE=neighbour; fix-a4.diff the same with MODE=footer and MODE=neighbour; revert after each.
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const W = require('../wizard-refused-save-hangs-saving/lib.js');
const L = require('./lib.js');

const MODE = process.env.MODE || 'late';
const RUN = process.env.PROBE_RUN || 'main';
const TITLE_ID = 'titleAbstract-title-control-en';
const ABS_ID = 'titleAbstract-abstract-control-en';
const LATE_TITLE = 'Autosave check typed late';

forEachApp(async (app) => {
    const author = app.name === 'omp' ? 'aclark' : 'ccorino';
    const o = {app: app.name, line: app.line || 'main', mode: MODE, author};
    const {page, close} = await launch(app);
    await page.addInitScript(W.watchFooter);
    const traffic = [];
    const errs = [];
    page.on('request', (r) => {
        const u = r.url();
        if (!/\/api\/v1\//.test(u) || r.method() === 'GET') return;
        traffic.push({at: Date.now(), op: r.headers()['x-http-method-override'] || r.method(), url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], title: L.titleOf(r.postData())});
    });
    page.on('pageerror', (e) => errs.push(W.flat(e.message, 200)));
    page.on('dialog', async (d) => { if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {}); });
    let t0 = Date.now();
    const rel = (x) => Math.round((x - t0) / 100) / 10;
    const saves = (from = 0) => traffic.filter((x) => x.at >= from && /\/publications\/\d+/.test(x.url)).map((x) => ({op: x.op, atS: rel(x.at), title: x.title}));
    const footerLog = async (from = 0) => (await page.evaluate(() => window.__footer || []).catch(() => [])).filter((x) => x.at >= from).map((x) => ({atS: rel(x.at), text: x.text}));
    const footerNow = () => page.locator('.submissionWizard__lastSaved').innerText({timeout: 2000}).then((s) => W.flat(s, 120)).catch(() => null);
    const pageLoad = () => page.evaluate(() => Math.round(performance.timeOrigin));
    const until = async (at) => page.waitForTimeout(Math.max(0, at - Date.now()));
    let n = 0;
    const snap = async (name, facts) => {
        const s = await screen(page).catch((e) => ({url: page.url(), error: W.flat(e.message)}));
        if (facts) s.facts = facts;
        const id = `${RUN}-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    };
    const openDetails = async () => {
        if (/Upload Files\s*$/.test(await W.currentStep(page))) await W.pressContinue(page);
        await page.locator(`#${TITLE_ID}_ifr`).waitFor({timeout: W.T});
    };
    try {
        // 1-2: the author begins a submission; the wizard opens.
        await signIn(page, author);
        o.submissionId = await W.beginSubmission(page, app, {title: `u21ir31 ${MODE}`, section: 'Articles'});
        t0 = await pageLoad();
        o.firstStep = await W.currentStep(page);
        o.footerOnArrival = await footerNow();
        // 3: on to "Details".
        await openDetails();
        o.detailsStep = await W.currentStep(page);
        await snap('details', {footer: o.footerOnArrival, savesSoFar: saves()});

        if (MODE === 'late') {
            // 4: nothing touched until 75 s after the wizard opened.
            await until(t0 + 75_000);
            o.footerBeforeTyping = await footerNow();
            o.savesBeforeTyping = saves();
            // 5: the Title typed at an ordinary pace.
            const typedAt = Date.now();
            await L.typeRichSlowly(page, TITLE_ID, LATE_TITLE, 250);
            const typedEnd = Date.now();
            o.typing = {fromS: rel(typedAt), toS: rel(typedEnd)};
            // 6: five seconds.
            await page.waitForTimeout(5000);
            o.savesAfterTyping = saves(typedAt);
            o.footerDuringAndAfter = await footerLog(typedAt);
            o.titleInBox = await L.richText(page, TITLE_ID);
            await snap('typed', {saves: o.savesAfterTyping, footer: o.footerDuringAndAfter});
            // 7: reload, read "Title".
            const r0 = Date.now();
            await page.reload();
            await page.locator('.pkpSteps__step__label--current').waitFor({timeout: W.T});
            await idle(page);
            o.stepAfterReload = await W.currentStep(page);
            const unsaved = page.getByRole('dialog').filter({hasText: /Unsaved Changes/});
            o.reloadUnsavedDialog = await unsaved.waitFor({timeout: 4000}).then(() => true).catch(() => false);
            await openDetails();
            await page.waitForTimeout(1500);
            o.titleAfterReload = await L.richText(page, TITLE_ID);
            o.savesOnLeaving = saves(r0);
            await snap('after-reload', {title: o.titleAfterReload, unsavedDialog: o.reloadUnsavedDialog});
        } else if (MODE === 'footer') {
            // 3: nothing touched for two minutes.
            await until(t0 + 120_000);
            o.footerAt2min = await footerNow();
            o.savesBeforeReload = saves();
            await snap('two-minutes', {footer: o.footerAt2min, saves: o.savesBeforeReload});
            // 4-5: reload, read the footer straight away.
            await page.reload();
            await page.locator('.pkpSteps__step__label--current').waitFor({timeout: W.T});
            t0 = await pageLoad();
            o.footerAfterReload = await footerNow();
            o.footerAfterReloadAtS = rel(Date.now());
            await page.waitForTimeout(5000);
            o.footerLogAfterReload = await footerLog(t0);
            o.savesAfterReload = saves(t0);
            await snap('after-reload', {footer: o.footerAfterReload, footerLog: o.footerLogAfterReload, saves: o.savesAfterReload});
        } else if (MODE === 'neighbour') {
            o.footerBeforeTyping = await footerNow();
            await until(t0 + 5000);
            const typedAt = Date.now();
            await L.typeRichSlowly(page, TITLE_ID, 'u21ir31 typed early', 100);
            o.typing = {fromS: rel(typedAt), toS: rel(Date.now())};
            await page.waitForFunction(() => /Last saved/.test((document.querySelector('.submissionWizard__lastSaved') || {}).textContent || '') && (window.__footer || []).some((x) => /Saving/.test(x.text || '')), null, {timeout: 75_000}).catch(() => {});
            await page.waitForTimeout(1500);
            o.titleSaves = saves(typedAt);
            o.footerLog = await footerLog(typedAt);
            o.footerAfterSave = await footerNow();
            await snap('timer-save', {saves: o.titleSaves, footer: o.footerLog});
            await W.typeRich(page, ABS_ID, 'u21ir31 abstract before Continue.');
            const c0 = Date.now();
            await W.pressContinue(page);
            await page.waitForTimeout(3000);
            o.continueSaves = traffic.filter((x) => x.at >= c0 && /\/publications\/\d+/.test(x.url)).map((x) => ({atS: Math.round((x.at - c0) / 100) / 10}));
            await snap('continue', {saves: o.continueSaves});
        }
    } catch (e) {
        o.error = W.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        o.pageErrors = errs;
        record(`${RUN}-facts-${MODE}`, o);
        console.log(`[ir31 ${app.name} ${RUN} ${MODE}]`, JSON.stringify(o).slice(0, 3000));
        await close();
    }
});
