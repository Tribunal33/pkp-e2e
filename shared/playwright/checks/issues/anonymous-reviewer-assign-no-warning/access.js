// U35 A11, what the assignment gives the reviewer (issue report
// docs/issues/U35-A11-anonymous-reviewer-assign-no-warning.md). On PKP's default test dataset, on a journal:
// dbarnes takes walk.js's steps on submission 12 (Minoti Inoue enrolled as an anonymous reviewer, then assigned
// as Section editor), and `minoue` signs in three times (after the review request, after the assignment,
// after dbarnes removed her with the row's "Remove") and opens her review of the submission and the
// submission's workflow at the editorial dashboard's address. Each read says whether the author's name,
// "Christopher", is on the screen. Her mailbox is read for what the assignment sent.
//   PROBE_FEATURE=issues-r4 PROBE_AGENT=r4 node bin/probe.js ojs shared/playwright/checks/issues/anonymous-reviewer-assign-no-warning/access.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const H = require('./lib.js');

const AUTHOR = /Christopher/;

/** As the signed-in person: the review's page and the workflow's address; what each shows of the author. */
async function reads(page, app, id, label) {
    const out = {};
    for (const [key, path] of [
        ['review', `/index.php/${app.contextPath}/en/reviewer/submission/${id}`],
        ['workflow', `/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`],
    ]) {
        await page.goto('about:blank');
        const r = await page.goto(app.url(path));
        await idle(page);
        await H.sleep(2500);
        await idle(page);
        const s = await screen(page);
        record(`${label}-${key}`, s);
        const text = [s.text.main, s.text.dialog, s.text.header].filter(Boolean).join('\n');
        const line = text.split('\n').find((l) => AUTHOR.test(l));
        out[key] = {
            status: r ? r.status() : null,
            url: page.url().replace(/^.*index\.php/, ''),
            title: s.title,
            authorShown: AUTHOR.test(text),
            authorLine: line ? H.flat(line, 200) : null,
            participantsPanel: /Participants/i.test(s.text.dialog || ''),
            start: H.flat(s.text.dialog || s.text.main, 260),
        };
    }
    return out;
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const c = H.CASES.ojs;
    const started = Date.now();
    const facts = {app: app.name, line: app.line || 'main', submission: c.id};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await H.openWorkflow(page, app, c.id);
        facts.enroll = (await H.enrollReviewer(page, {search: c.search, person: c.person, label: 'a1'})).status;
        await signIn(page, 'minoue');
        facts.asReviewer = await reads(page, app, c.id, 'a2');

        await signIn(page, 'dbarnes');
        let panel = await H.openWorkflow(page, app, c.id);
        const a = await H.assign(page, panel, {role: c.role, person: c.person, label: 'a3'});
        facts.assign = {warning: a.warning, notices: a.save && a.save.notices, participants: a.participants};
        await signIn(page, 'minoue');
        facts.asParticipant = await reads(page, app, c.id, 'a4');

        await signIn(page, 'dbarnes');
        panel = await H.openWorkflow(page, app, c.id);
        const dialog = await panel.openRemove(c.person);
        facts.removeDialog = H.flat(await dialog.root.innerText(), 300);
        await dialog.ok();
        await idle(page);
        await panel.reland();
        facts.participantsAfterRemove = (await panel.rowLines()).filter((r) => JSON.stringify(r).includes(c.person));
        await signIn(page, 'minoue');
        facts.afterRemove = await reads(page, app, c.id, 'a6');
        await signOut(page);

        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await H.sleep(3000);
        const m = await app.mail._search({to: 'minoue@mailinator.com'}).catch(() => ({messages: []}));
        facts.mail = (m.messages || []).filter((x) => !x.Created || Date.parse(x.Created) >= started - 2000).map((x) => ({subject: x.Subject, at: x.Created}));
    } finally {
        record('access', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
