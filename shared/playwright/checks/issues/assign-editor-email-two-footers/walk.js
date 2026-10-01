// U35 A15 (issue report docs/issues/U35-A15-assign-editor-email-two-footers.md): the letter the
// predefined message "Assign Editor" sends from the Submission stage closes with the journal's
// "This is an automated message from …" and then the discussion footer. The steps of the report,
// through the screens, on PKP's default dataset (lib.js WORDS: OJS 4, OMP 3 on Submission; OPS 1 on
// Production, the preprint server's only stage):
//   assign   as dbarnes: "Participants" › "Assign", the role, "Search", "Minoti Inoue", the predefined
//            message "Assign Editor" chosen, the end of "Message" read, "OK"
//   mail     the mailbox of minoue@mailinator.com, read for the letter (up to 25 s)
//   control  the same on a submission in Review (OJS 7, OMP 15), whose letter ends with the discussion
//            footer alone; it is also the neighbour check of fix-ojs.diff / fix-omp.diff beside this file
//
//   PROBE_FEATURE=issues-r14 PROBE_AGENT=r14 node bin/probe.js all shared/playwright/checks/issues/assign-editor-email-two-footers/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r14-3_5 in front.)
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const facts = {app: app.name, line: app.line || 'main', submission: w.letter.id, control: w.control && w.control.id};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]));
    };
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => {
        await d.accept().catch(() => {});
    });
    try {
        await signIn(page, 'dbarnes');
        let since = Date.now() - 2000;
        await step('assign', () => L.assignWithLetter(page, app, w, w.letter, 'assign'));
        await step('mail', () => L.letters(page, app, w.mail, w.letter.words, since, 25000));
        if (w.control) {
            since = Date.now() - 2000;
            await step('controlAssign', () => L.assignWithLetter(page, app, w, w.control, 'control'));
            await step('controlMail', () => L.letters(page, app, w.mail, w.control.words, since, 25000));
        }
        await signOut(page).catch(() => {});
    } finally {
        record('facts', facts);
        await close();
    }
});
