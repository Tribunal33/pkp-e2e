// Walk of U58 OMP2 (issue report docs/issues/U58-OMP2-press-copyright-edit-opens-disable-submissions.md):
// as rvaca, save a copyright notice on Settings › Workflow › "Submission" › "Author Guidance", open
// About › "Submissions", press "Edit" beside "Author Guidelines" (control), then "Edit" beside
// "Copyright Notice", and read which Workflow Settings tab opens. OMP shows the fault; OJS and OPS
// are the control. On PKP's default test dataset, fleet reset first.
//   PROBE_FEATURE=issues-u58e PROBE_AGENT=u58e node bin/probe.js all shared/playwright/checks/issues/press-copyright-edit-opens-disable-submissions/walk.js
// Neighbour (WALK_MODE=nb, alone, no copyright notice saved): "Edit" beside "Author Guidelines",
// "Submission Preparation Checklist" and "Privacy Statement", to compare with the fix in and out.
const {forEachApp, launch, signIn, signOut, screen, record, note} = require('../../../probe');
const H = require('./lib.js');

const NOTICE = 'u58e copyright notice: authors keep the copyright.';
const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'rvaca');

        if (MODE === 'nb') {
            facts.links = [];
            for (const heading of ['Author Guidelines', 'Submission Preparation Checklist', 'Privacy Statement']) {
                const r = await H.pressEditAndRead(page, app, heading);
                record(`nb-${heading.replace(/\s+/g, '-').toLowerCase()}`, await screen(page));
                facts.links.push(r);
            }
            note(`u58e ${facts.line} nb ${app.name}: ${JSON.stringify(facts.links.map((l) => [l.heading, l.hash, l.selectedSideTab]))}`);
            record('nb-facts', facts);
            return;
        }

        // 2-3
        try {
            facts.noticeSaved = await H.setCopyrightNotice(page, app, NOTICE);
        } catch (e) {
            facts.noticeError = String(e.message).slice(0, 300);
        }
        record('s3-notice-saved', await screen(page));

        // 4
        await H.openSubmissionsPage(page, app);
        record('s4-submissions-page', await screen(page));

        // 5 (control)
        facts.authorGuidelinesEdit = await H.pressEditAndRead(page, app, 'Author Guidelines');
        record('s5-author-guidelines-edit', await screen(page));

        // 6
        facts.copyrightEdit = await H.pressEditAndRead(page, app, 'Copyright Notice');
        record('s6-copyright-edit', await screen(page));

        note(`u58e ${facts.line} ${MODE} ${app.name}: guidelines ${facts.authorGuidelinesEdit.hash} → ${facts.authorGuidelinesEdit.selectedSideTab}; copyright ${facts.copyrightEdit.hash} → ${facts.copyrightEdit.selectedSideTab}`);
        record('facts', facts);
        await signOut(page);
    } finally {
        await close();
    }
});
