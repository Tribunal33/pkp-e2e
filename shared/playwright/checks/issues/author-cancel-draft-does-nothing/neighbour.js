// U21 OPS3 steps 5-7 and the neighbour check for the fix (issue report docs/issues/U21-OPS3-author-cancel-draft-does-nothing.md).
// The dataset's author (ccorino; OMP aclark) starts a draft, then in My Submissions uses
// "Delete Incomplete Submissions": only the draft may offer a box, the author's own submitted
// submission none, and after the delete the submitted one is still listed. Walked with the fix
// in and out; on OJS and OMP the outcome must not change.
//   PROBE_FEATURE=issues-ir30 PROBE_AGENT=ir30 PROBE_RUN=fixin node bin/probe.js all shared/playwright/checks/issues/author-cancel-draft-does-nothing/neighbour.js
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const H = require('./lib.js');

const SUBMITTED = {
    ojs: 'The influence of lactation on the quantity and quality of cashmere production',
    omp: 'The ABCs of Human Survival: A Paradigm for Global Citizenship',
    ops: 'The influence of lactation on the quantity and quality of cashmere production',
};

forEachApp(async (app) => {
    const title = 'u21ir30 neighbour';
    const facts = {app: app.name, line: app.line || 'main', author: H.AUTHOR[app.name], title, submitted: SUBMITTED[app.name]};
    const {page, close} = await launch(app);
    const deletes = H.watchDeletes(page);
    try {
        await signIn(page, H.AUTHOR[app.name]);
        facts.id = await H.beginSubmission(page, app, {title, section: H.SECTION[app.name]});
        await H.openMySubmissions(page, app);
        await page.getByRole('button', {name: 'More Actions'}).first().click({timeout: H.T});
        await page.getByRole('menuitem', {name: 'Delete Incomplete Submissions'}).click({timeout: H.T});
        await H.rowBox(page, title).waitFor({state: 'attached', timeout: H.T});
        facts.boxes = {draft: await H.rowBox(page, title).count(), submitted: await H.rowBox(page, SUBMITTED[app.name]).count()};
        record('01-selection', await screen(page));
        const b = await H.bulkDelete(page, app, title);
        await H.openMySubmissions(page, app);
        facts.after = {draftListed: await H.listed(page, title), submittedListed: await H.listed(page, SUBMITTED[app.name]), notices: b.after.notices};
        record('02-after-delete', await screen(page));
    } finally {
        facts.deletes = deletes;
        record('facts-neighbour', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
