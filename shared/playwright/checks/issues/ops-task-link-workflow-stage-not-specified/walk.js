// U05 OPS3 walk (issue report docs/issues/U05-OPS3-ops-task-link-workflow-stage-not-specified.md).
// On PKP's default test dataset: dbarnes takes every editor off the section the author's
// submission lands in ("Preprints"; OJS "Articles", OMP series "Library & Information
// Studies"), the author submits, and dbarnes presses the new "needs a moderator (an editor)"
// task in the header's Tasks window. OPS is the finding, OJS and OMP the control.
// `neighbour` as the argument runs the neighbour check alone: after the same set-up, the
// Moderator (section/series editor) minoue, not assigned, types the address the fixed task
// opens; the submission must stay closed to them, with the fix in and out.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/ops-task-link-workflow-stage-not-specified/walk.js [neighbour]
const {forEachApp, launch, signIn, signOut, screen, record, tag, idle} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] === 'neighbour' ? 'neighbour' : 'walk';

forEachApp(async (app) => {
    const run = tag('u05b');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run};
    const {page, close} = await launch(app);
    try {
        // 1-3. dbarnes takes the editors off the section
        facts.section = await H.clearSectionAssignments(page, app);
        // 4. the author submits
        const title = `${run} needs a moderator`;
        const au = await H.authorSubmits(page, app, title);
        record(`${MODE}-01-author-complete`, au.screen);
        facts.submission = {id: au.id, title, problems: au.problems};

        if (MODE === 'walk') {
            // 5-7. dbarnes presses the task
            await signIn(page, 'dbarnes');
            const t = await H.openTask(page, app, title);
            record('02-landed', t.screen);
            facts.task = t.out;
            Object.assign(facts.task, await H.taskAfter(page, app, title));
            await signOut(page);
        } else {
            // neighbour: an unassigned Moderator types the address the fixed task opens
            await signIn(page, 'minoue');
            const addr = `/index.php/${app.contextPath}${H.L(app)}/dashboard/editorial?workflowSubmissionId=${au.id}`;
            const res = await page.goto(app.url(addr));
            await idle(page).catch(() => {});
            await H.sleep(1500);
            await idle(page).catch(() => {});
            const s = await screen(page);
            record('n-02-minoue', s);
            facts.neighbour = {address: addr, status: res && res.status(), landedUrl: page.url(),
                dialog: H.flat(s.text && s.text.dialog, 400), main: H.flat(s.text && s.text.main, 400), notices: s.notices};
            await signOut(page);
        }
    } finally {
        record(MODE === 'walk' ? 'facts' : 'neighbour', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
