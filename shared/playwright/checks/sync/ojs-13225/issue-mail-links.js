const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// Kept verification probe for pkp/pkp-lib#13225 (pkp/ojs#5811, ojs 2a94a0218c merged as a4af345eec: the issue-published
// email's table of contents links every article and galley through the page router with the journal's path, and
// `IssueEmailVariable::getIssueToc()` assigns `journal` for the templates, so the links resolve from the mail instead of
// landing on "You cannot call this operation without a context"). Run:
//   PROBE_FEATURE=sync PROBE_AGENT=s15-13225 node bin/probe.js ojs shared/playwright/checks/sync/ojs-13225/issue-mail-links.js
// One OJS process on a scratch journal (manager, author; one issue created on screen; one submission seeded scheduled into it; a
// remote galley row inserted with psql, since the scenario API seeds no galleys yet):
//   seed      the journal, the issue, the scheduled submission, the galley row                       (seed)
//   m1        manager: Issues › Future Issues › the row's "Publish Issue" › OK, email box left ticked (m1-*)
//   m2        the queue drained; the Author's "Just published" email; every link of its HTML          (m2-mail)
//   m3        each article/galley/issue link fetched anonymously: status, final URL, page title       (m3-links)
// No assertions: the session judges. Expected: the TOC's article link is `/index.php/<journal>/article/view/<id>` and
// the galley link `/index.php/<journal>/article/view/<id>/<galleyId>`; both answer 200 with the article page (the remote
// galley redirects to its URL), none shows "You cannot call this operation without a context".
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, idle, tag} =
    require('../../../probe');
const {runJobs} = require('../../../support/jobs.js');
const log = (...a) => console.log('[13225]', ...a);
const T = 30_000;

async function snap(page, name, extra = {}) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

function psql(sql) {
    return execFileSync('psql', ['-h', '127.0.0.1', '-U', 'e2e', '-At', '-c', sql, dbName('ojs')],
        {env: {...process.env, PGPASSWORD: 'e2e'}, encoding: 'utf8'}).trim();
}

forEachApp(async (app) => {
    const T_ = tag('i13225');
    const manager = `${T_}mgr`;
    const author = `${T_}au`;
    const issue = {volume: 1, number: 1, year: 2026};
    // The scenario context seeds no issues (`issues[]` is a bootstrap key), so the manager creates the one issue on
    // screen first, as U05 S9 does; the submission is then seeded scheduled into it.
    const ctxRes = await app.api.createContext({tag: T_, users: [
        {username: manager, roles: ['manager']},
        {username: author, roles: ['author']},
    ]});
    const identification = `Vol. 1 No. 1 (2026): Issue ${T_}`;

    const {page, close} = await launch(app);
    try {
        await signIn(page, manager, {contextPath: T_});
        await page.goto(app.url(`/index.php/${T_}/manageIssues`));
        await idle(page);
        await page.getByRole('link', {name: 'Create Issue', exact: true}).first().waitFor({state: 'visible', timeout: T});
        await page.getByRole('link', {name: 'Create Issue', exact: true}).first().click();
        const form = page.locator('form#issueForm');
        await form.waitFor({state: 'visible', timeout: T});
        await form.locator('input[name="volume"]').fill('1');
        await form.locator('input[name="number"]').fill('1');
        await form.locator('input[name="year"]').fill('2026');
        await form.locator('input[name="title[en]"]').fill(`Issue ${T_}`);
        const issueSaved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/update-issue/.test(r.url()), {timeout: T});
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const issueRes = await issueSaved;
        await idle(page);
        log('issue created', issueRes.status());

        const sub = await app.api.createSubmission({tag: T_, context: T_, submitter: author, submitted: true, published: true, issue,
            title: `TOC links ${T_}`});
        const galleyId = psql(`INSERT INTO publication_galleys (locale, publication_id, label, seq, remote_url, is_approved)
            VALUES ('en', ${Number(sub.publicationId)}, 'PDF', 0, 'https://example.org/remote-${T_}.pdf', 1) RETURNING galley_id`);
        const status = psql(`SELECT s.status, p.status, p.date_published FROM submissions s JOIN publications p ON p.publication_id = s.current_publication_id WHERE s.submission_id = ${Number(sub.submissionId)}`);
        record('seed', {context: ctxRes, submission: sub, galleyId, submissionStatus: status, issueCreate: issueRes.status()});
        log('seeded', T_, 'submission', sub.submissionId, 'publication', sub.publicationId, 'galley', galleyId, 'status', status);

        await page.goto(app.url(`/index.php/${T_}/manageIssues`));
        await idle(page);
        await page.getByRole('link', {name: 'Create Issue', exact: true}).first().waitFor({state: 'visible', timeout: T});
        const row = page.locator('tr.gridRow').filter({hasText: identification});
        await row.first().waitFor({state: 'visible', timeout: T});
        await snap(page, 'm1-future-issues', {rowText: await row.first().innerText().catch(() => null)});
        await row.first().locator('a.show_extras').click();
        await page.getByRole('link', {name: 'Publish Issue', exact: true}).click();
        const dialog = page.locator('[role="dialog"]:visible').last();
        const emailBox = dialog.locator('#sendIssueNotification');
        await emailBox.waitFor({state: 'visible', timeout: T});
        await snap(page, 'm1-publish-dialog', {emailChecked: await emailBox.isChecked()});
        const published = page.waitForResponse((r) => r.request().method() === 'POST' && /\/publish-issue/.test(r.url()), {timeout: T});
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        const res = await published;
        await idle(page);
        await snap(page, 'm1-published', {publishStatus: res.status()});
        log('publish-issue answered', res.status());

        // The jobs tool reads the test config and the drain loop counts through the probe server's _test API.
        process.env.PKP_CONFIG_FILE = app.configFile || path.join(path.resolve(process.cwd(), app.root), 'config.test.inc.php');
        process.env.TEST_API_KEY = app.testApiKey || process.env.TEST_API_KEY;
        process.env.PLAYWRIGHT_BASE_PORT = new URL(app.baseURL).port;
        runJobs({appRoot: path.resolve(process.cwd(), app.root)});

        const summary = await app.mail.find({to: `${author}@mail.test`, subject: 'Just published', contains: 'Vol. 1 No. 1'});
        const full = await app.mail.fullMessage(summary.ID);
        const html = full.HTML || '';
        const links = [...html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
            .map((m) => ({href: m[1].replace(/&amp;/g, '&'), text: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}));
        record('m2-mail', {subject: summary.Subject, to: summary.To, links, text: full.Text, html});
        log('mail', summary.Subject, 'links', JSON.stringify(links));

        // m3: fetch every article/galley/issue link the way a reader's click would, without a session. A link whose
        // host is not the fleet's is rewritten to it (the config's base_url names the workers' port), and noted.
        const base = new URL(app.url('/'));
        const anon = await page.context().browser().newContext();
        const out = [];
        for (const l of links.filter((x) => /\/(article|issue)\/view\//.test(x.href) || /\/article\//.test(x.href))) {
            let target = l.href;
            let rewritten = false;
            try {
                const u = new URL(l.href);
                if (u.host !== base.host) { u.protocol = base.protocol; u.host = base.host; target = u.toString(); rewritten = true; }
            } catch (e) { /* keep as is */ }
            const r = await anon.request.get(target, {maxRedirects: 0, failOnStatusCode: false}).catch((e) => ({error: String(e.message)}));
            const entry = {text: l.text, href: l.href, fetched: target, rewritten};
            if (r.error) { entry.error = r.error; out.push(entry); continue; }
            entry.status = r.status();
            entry.location = r.headers()['location'] || null;
            const body = await r.text().catch(() => '');
            entry.title = (body.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || null;
            entry.noContextError = /cannot call this operation without a context/i.test(body);
            entry.hasSeededTitle = body.includes(`TOC links ${T_}`);
            out.push(entry);
        }
        await anon.close();
        record('m3-links', {baseHost: base.host, results: out});
        log('links fetched', JSON.stringify(out, null, 1));
    } finally {
        await close();
    }
});
