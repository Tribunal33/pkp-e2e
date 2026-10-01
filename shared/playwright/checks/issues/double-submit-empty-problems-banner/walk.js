// U21 A6 walk (issue report docs/issues/U21-A6-double-submit-empty-problems-banner.md).
// On PKP's default test dataset: the dataset's author (ccorino; OMP aclark) takes a new
// submission to "Review", opens the same address in a second tab, submits from the first
// tab and then presses "Submit" in the second. The control reloads the second tab.
//   PROBE_FEATURE=issues-ir33 PROBE_AGENT=ir33 node bin/probe.js all shared/playwright/checks/issues/double-submit-empty-problems-banner/walk.js
const {forEachApp, launch, signIn, screen, record, shot} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const title = 'u21ir33 submitted twice';
    const w = H.WORDS[app.name];
    const facts = {app: app.name, line: app.line || 'main', author: w.author, title};
    const {page, close} = await launch(app);
    try {
        // 1-3. the author starts a submission
        await signIn(page, w.author);
        facts.id = await H.beginSubmission(page, app, app.contextPath, {title, section: w.section});
        // 4-5. every step up to "Review"
        await H.toReview(page, app);
        facts.firstTabReview = await H.readReview(page);
        record('01-first-tab-review', await screen(page));
        // 6. the same address in a second tab, which opens on the first step; "Continue" until "Review"
        const {tab, errors} = await H.secondTab(page);
        facts.address = page.url().replace(/^https?:\/\/[^/]+/, '');
        facts.secondTabLanded = await tab.locator('.pkpSteps__step__label--current').innerText().catch(() => null);
        await H.toReview(tab, app, {onlyContinue: true});
        facts.secondTabOpened = await H.readReview(tab);
        record('02-second-tab-opened', await screen(tab));
        // 7. the first tab submits
        await page.bringToFront();
        facts.confirmBoxesFirst = await H.tickConfirmations(page);
        facts.firstSubmit = await H.pressSubmit(page);
        record('03-first-tab-after-submit', await screen(page));
        // 8. the second tab submits
        await tab.bringToFront();
        facts.confirmBoxesSecond = await H.tickConfirmations(tab);
        facts.secondSubmit = await H.pressSubmit(tab);
        facts.secondTabAfter = await H.readReview(tab);
        const s = await screen(tab);
        facts.secondTabNotices = s.notices;
        record('04-second-tab-after-submit', s);
        await shot(tab, '04-second-tab-after-submit');
        facts.secondTabScriptErrors = errors;
        // control: reload the second tab
        await tab.reload();
        await tab.waitForLoadState('domcontentloaded');
        const r = await screen(tab);
        facts.secondTabReloaded = H.flat(r.text && r.text.main, 300);
        record('05-second-tab-reloaded', r);
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
