// U38 A11, step 3 as a person takes it: `minoue` pastes the "View changes" address into the browser's
// address bar (a plain navigation, no script), with submissionId changed to their own submission.
// Runs after walk.js on the same install (it needs the entry walk.js's step 1 created); ENTRY overrides
// the entry number (default: the newest review-comment change, read from event_log).
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<agent> PROBE_RUN=addr node bin/probe.js ojs,omp shared/playwright/checks/issues/activity-log-view-changes-reads-any-review/address.js
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    if (app.name === 'ops') return;
    const c = L.CASES[app.name];
    const entry = process.env.ENTRY || sql(app, `SELECT max(log_id) FROM event_log WHERE event_type = 1073741859`);
    const {page, close} = await launch(app);
    try {
        await signIn(page, c.subEditor, {contextPath: app.contextPath});
        const url = `${app.baseURL}/index.php/${app.contextPath}/$$$call$$$/grid/event-log/submission-review-event-log-grid/view-review-change?submissionId=${c.accessible.id}&logEntryId=${entry}`;
        const res = await page.goto(url);
        const s = await screen(page);
        const o = {who: c.subEditor, entry, status: res && res.status(), url: page.url().replace(app.baseURL, ''), body: L.flat(await page.locator('body').innerText(), 600), hasEditedText: (await page.content()).includes(L.COMMENT)};
        console.log(`[a11 ${app.name} address]`, JSON.stringify(o));
        record('a11-address', {...o, screen: s});
    } finally { await close(); }
});
