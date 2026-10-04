// Walk of U31 A7 and A11 (issue reports docs/issues/U31-A7-reviewer-suggestion-guidance-misspells-valuable.md
// and docs/issues/U31-A11-reviewer-suggestion-reason-help-is-there.md), on PKP's default test dataset,
// fleet reset first. OJS and OMP have the surface; OPS is the control (no setting, no step, no box).
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=q3 node bin/probe.js all shared/playwright/checks/issues/reviewer-suggestion-guidance-misspells-valuable/walk.js
// WALK_MODE (each runs alone, on a freshly reset dataset):
//   steps   the reports' steps: rvaca turns "Reviewer Suggestion at Submission" on and reads "Author Guidance"'s
//           "For Reviewer Suggestion" box (A7); the author starts a submission, reads the text above the
//           "Reviewer Suggestions" panel (A7) and the help under "Reasons for suggesting reviewer" in "Add Reviewer
//           Suggestion" (A11); then admin creates a journal (press) and reads its "For Reviewer Suggestion" box (A7).
//   new     the A7 report's "A new journal" steps alone (its fix trial).
//   nb7     A7 neighbour: the dataset journal's Review › Setup description of the setting (fixed by the same diff)
//           and stored "For Reviewer Suggestion" text, and a new journal's every "Author Guidance" box text.
//   reason  the A11 report's steps alone (its fix trial).
//   nb11    A11 neighbour: every box's label and help in "Add Reviewer Suggestion".
const {forEachApp, launch, signIn, signOut, screen, record, note} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const NEW_PATH = 'u31q3';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const rec = (name, data) => record(`${MODE}-${name}`, data);
    try {
        const existing = ['steps', 'reason', 'nb11', 'nb7'].includes(MODE);
        if (existing) {
            // 1-3. the manager turns the setting on
            await signIn(page, 'rvaca');
            // nb7 reads the setting's description and leaves the setting as it is
            facts.enable = await H.enableSuggestions(page, app, {save: MODE !== 'nb7'});
            rec('s3-review-setup', await screen(page));
            // 4. "Author Guidance" › "For Reviewer Suggestion"
            if (MODE === 'steps' || MODE === 'nb7') {
                const g = await H.reviewerGuidanceBox(page, app);
                facts.guidanceBox = g.box ? {label: g.box.label, help: g.box.help, text: g.text} : null;
                facts.guidanceLabels = g.labels;
                rec('s4-author-guidance', await screen(page));
            }
            await signOut(page);
        }

        if (['steps', 'reason', 'nb11'].includes(MODE)) {
            // 5-7. the author reaches "Reviewer Suggestions"
            const author = H.AUTHOR[app.name];
            facts.author = author;
            await signIn(page, author);
            const r = await H.reachSuggestionStep(page, app, 'u31q3 Reviewer suggestions');
            facts.submission = r;
            rec('s7-step', await screen(page));
            if (r.reached) {
                // 8. the text above the panel
                if (MODE === 'steps') facts.stepGuidance = await H.stepGuidance(page);
                // 9. "Add Reviewer Suggestion" › the help under "Reasons for suggesting reviewer"
                facts.addWindow = await H.readAddWindow(page);
                rec('s9-add-window', await screen(page));
            }
            await signOut(page);
        }

        if (['steps', 'new', 'nb7'].includes(MODE)) {
            // 10. admin creates a journal (press, server) on screen
            await signIn(page, 'admin');
            facts.createStatus = await H.createJournal(page, app, {name: 'u31q3 Journal', initials: 'U31Q3', path: NEW_PATH});
            rec('s10-created', await screen(page));
            // 11. its "Author Guidance" › "For Reviewer Suggestion"
            const bag = H.contextBag(app, NEW_PATH);
            if (MODE === 'nb7') {
                facts.newJournalBoxes = await H.allGuidanceTexts(page, bag);
            } else {
                const g = await H.reviewerGuidanceBox(page, bag);
                facts.newGuidanceBox = g.box ? {label: g.box.label, help: g.box.help, text: g.text} : null;
            }
            rec('s11-new-author-guidance', await screen(page));
            await signOut(page);
        }

        const has = (t, w) => (t == null ? null : String(t).includes(w));
        facts.summary = {
            guidanceBoxValueable: has(facts.guidanceBox && facts.guidanceBox.text, 'valueable'),
            stepValueable: has(facts.stepGuidance && facts.stepGuidance.text, 'valueable'),
            newJournalValueable: has(facts.newGuidanceBox && facts.newGuidanceBox.text, 'valueable'),
            reasonHelp: facts.addWindow && facts.addWindow.reason ? facts.addWindow.reason.help : null,
            setupDescription: facts.enable ? facts.enable.description : null,
        };
        note(`u31q3 ${facts.line} ${MODE} ${app.name}: ${JSON.stringify(facts.summary)}`);
    } finally {
        rec('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
