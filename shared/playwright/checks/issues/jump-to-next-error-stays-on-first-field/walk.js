// Issue report docs/issues/U59-A6-jump-to-next-error-stays-on-first-field.md (U59 A6):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets").
//   (default)  as `admin`, Hosted Journals › "Create Journal", "Save" on the empty form
//              ("Please correct 7 errors."), then "Jump to next error" pressed seven times:
//              the refused field the window scrolls to after each press.
//   neighbour  (the fix's): on the same refused form the screen-reader button "Go to Path: This
//              field is required." still goes to "Path"; then every field but "Path" is filled
//              ("Please correct one error.") and "Jump to next error", pressed twice, goes to
//              "Path" both times. Nothing is saved.
//              Nothing is built by the kit in either mode, and neither mode creates anything.
//
// Reset first:  npm run fleet-prep -- --feature issues-u59g --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u59g PROBE_AGENT=u59g node bin/probe.js all shared/playwright/checks/issues/jump-to-next-error-stays-on-first-field/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u59g-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u59g-3_5 PROBE_AGENT=u59g node bin/probe.js all shared/playwright/checks/issues/jump-to-next-error-stays-on-first-field/walk.js
// Facts: .reports/<feature>/u59g/a6-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] || 'steps';
const PRESSES = 7;

forEachApp(async (app) => {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const W = L.WORDS[app.name];
    const fact = (k, v) => {
        record('a6-facts', {[k]: v}, {merge: true});
        console.log('[a6]', app.name, k, JSON.stringify(v).slice(0, 1200));
    };
    const snap = async (page, name) => {
        record(name, await screen(page));
        await shot(page, name).catch(() => {});
    };
    const {page} = await launch(app);
    const hosted = new HostedJournalsPage(page, W);

    // 1–2: sign in as admin, Hosted Journals.
    await signIn(page, 'admin');
    await hosted.goto();
    // 3: "Create Journal".
    const win = await hosted.openCreate();
    // 4: "Save" on the empty form: refused in the browser, nothing sent.
    const sent = await win.saveRefusedInBrowser('urlPath');
    const refused = await L.readJump(win.form);
    fact('step4-refused', {
        sent,
        summary: L.flat(await win.errorSummary.innerText().catch(() => null)),
        srButtons: await win.errorSummary.locator('ul button').allInnerTexts().catch(() => []),
        reasons: await win.errorMap(),
        fields: refused.fields.map((f) => `${f.name} (${f.label})`),
        scrollBox: refused.scrollBox,
        scrollTop: refused.scrollTop,
        scrollMax: refused.scrollMax,
        inView: refused.inView,
    });
    await snap(page, MODE === 'neighbour' ? 'a6-nb-refused' : 'a6-step4');

    if (MODE === 'neighbour') {
        // The screen-reader "Go to Path: …" button, by keyboard as its user presses it.
        const goToPath = win.errorSummary.locator('ul button').filter({hasText: /^\s*Go to Path:/});
        try {
            await goToPath.focus();
            await page.keyboard.press('Enter');
            const at = await L.readJump(win.form);
            fact('nb-go-to-path', {scrollTop: at.scrollTop, scrollMax: at.scrollMax, atTop: at.atTop, inView: at.inView});
        } catch (e) {
            fact('nb-go-to-path', {error: L.flat(e.message, 200)});
        }
        // Every field but "Path" filled: one error left.
        try {
            await win.type(win.title('en'), `u59g ${W.noun}`);
            await win.type(win.initials('en'), 'U59G');
            await win.type(win.contactName, 'u59g Contact');
            await win.type(win.contactEmail, 'u59g@mailinator.com');
            await win.country.selectOption({label: 'Iceland'});
            await win.setBox(win.languageBox('en'), true);
            await win.setBox(win.primaryChoice('en'), true);
            fact('nb-one-error', {summary: L.flat(await win.errorSummary.innerText().catch(() => null)), reasons: await win.errorMap()});
            const presses = [];
            for (let i = 1; i <= 2; i++) presses.push({press: i, ...(await L.pressJump(win.form, win.jumpToErrorButton))});
            fact('nb-one-error-presses', presses);
            await snap(page, 'a6-nb-one-error');
        } catch (e) {
            fact('nb-one-error-presses', {error: L.flat(e.message, 200)});
        }
    } else {
        // 5–6: "Jump to next error", seven times.
        const presses = [];
        for (let i = 1; i <= PRESSES; i++) {
            try {
                presses.push({press: i, ...(await L.pressJump(win.form, win.jumpToErrorButton))});
            } catch (e) {
                presses.push({press: i, error: L.flat(e.message, 200)});
                break;
            }
            if (i === 1 || i === 2 || i === PRESSES) await shot(page, `a6-press${i}`).catch(() => {});
        }
        fact('step5-6-presses', presses);
        fact('step5-6-reached', [...new Set(presses.flatMap((p) => (p.atTop ? [p.atTop] : [])))]);
        await snap(page, 'a6-step6');
    }
    await win.close().catch(() => {});
    await signOut(page).catch(() => {});
});
