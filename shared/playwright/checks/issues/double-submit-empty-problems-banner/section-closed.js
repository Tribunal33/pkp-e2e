// U21 A6, the section-closed case (issue report docs/issues/U21-A6-double-submit-empty-problems-banner.md).
// On PKP's default test dataset (OJS, OPS): the author (ccorino) takes a new submission to
// "Review"; the manager (rvaca, in another browser) edits the draft's section and ticks
// "Items can only be submitted by …"; the author presses "Submit", then reloads the page.
//   PROBE_FEATURE=issues-ir33 PROBE_AGENT=ir33 ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/double-submit-empty-problems-banner/section-closed.js
const {forEachApp, launch, signIn, screen, record, shot, idle} = require('../../../probe');
const H = require('./lib.js');

const RESTRICT = {ojs: 'Items can only be submitted by Editors and Section Editors.', ops: 'Items can only be submitted by Managers and Moderators.'};

forEachApp(async (app) => {
    if (!RESTRICT[app.name]) return;
    const title = 'u21ir33 section closed';
    const w = H.WORDS[app.name];
    const facts = {app: app.name, line: app.line || 'main', author: w.author, title};
    const author = await launch(app);
    const manager = await launch(app);
    const page = author.page;
    try {
        // 1-5. the author takes a new submission to "Review"
        await signIn(page, w.author);
        facts.id = await H.beginSubmission(page, app, app.contextPath, {title, section: w.section});
        await H.toReview(page, app);
        facts.reviewBefore = await H.readReview(page);
        // 6. the manager restricts the section to editors
        const {SectionsTab} = require('../../../pages/SectionsPages.js');
        await signIn(manager.page, 'rvaca');
        const tab = new SectionsTab(manager.page, app.contextPath, {locale: H.L(app).replace('/', '')});
        await tab.goto();
        const win = await tab.openEdit(w.section);
        const box = win.checkbox(RESTRICT[app.name]);
        facts.restrictOffered = await box.count();
        await box.check();
        facts.sectionSave = (await win.saveAndClose()).status();
        record('s1-manager-sections', await screen(manager.page));
        // 7. the author presses "Submit"
        await page.bringToFront();
        facts.submit = await H.pressSubmit(page);
        facts.reviewAfter = await H.readReview(page);
        record('s2-author-after-submit', await screen(page));
        await shot(page, 's2-author-after-submit');
        // 8. the author reloads the page
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        await idle(page).catch(() => {});
        const r = await screen(page);
        facts.reloaded = {title: await page.title(), text: H.flat(r.text && r.text.main, 500), step: await page.locator('.pkpSteps__step__label--current').innerText({timeout: 3000}).catch(() => null)};
        record('s3-author-reloaded', r);
    } finally {
        record('section-closed-facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await manager.close();
        await author.close();
    }
});
