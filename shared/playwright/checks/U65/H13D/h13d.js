// U65 claim check H13D (housekeeping 2026-10-13, incidentals row 16): the
// hosts of every link in the monthly statistics email, the footer's
// included, sent the command line's way and from a request, per app.
//
// On PKP's default dataset (a dataset fleet; publicknowledge sends the email
// by default, rvaca the manager among the recipients):
//   cli      `php lib/pkp/tools/scheduler.php test --name=PKP\task\StatisticsReport`
//            (the routine task now, every context), then the queued jobs run
//            by the app's worker (the kit's drainJobs: `jobs.php work`); every
//            "… activity for …" email Mailpit received since is read: each
//            link of its HTML part (words, address, host), the addresses its
//            text part shows, its List-Unsubscribe header, the footer after
//            the dash.
//   request  the same task through a request to the probe server
//            (scenarios/task statisticsReport, publicknowledge), the same read.
//   open     as rvaca, each distinct address of the command line's email to
//            rvaca opened in the browser and recorded (screen + shot), the
//            unsubscribe page opened only, its button never pressed.
//   signature as rvaca, Settings › Workflow › "Emails": the "Signature" box's
//            content (its links), then the sweep: a character typed into it,
//            the tab left for "Submission" unsaved, the page reloaded, the box
//            read again (facts in signature-<run>-<app>).
// The task notifies and mails the fleet's own dataset context: reset the
// fleet first (npm run reset:<app> -- --dataset 4).
//
// Run (main): bin/app-lock.sh shared ops -- env PKP_E2E_DATASET=4 PROBE_RUN=r1 PROBE_FEATURE=U65 PROBE_AGENT=ccH13D node bin/probe.js ops shared/playwright/checks/U65/H13D/h13d.js
// Run (3.5):  PKP_E2E_LINE=stable-3_5_0 PKP_E2E_DATASET=4 PROBE_RUN=s1 PROBE_FEATURE=U65 PROBE_AGENT=ccH13D node bin/probe.js ops shared/playwright/checks/U65/H13D/h13d.js
// H13D_SKIP=request,open (comma list of phases) narrows a rerun.
// Facts: .reports/U65/ccH13D/facts-<run>-<app>.json, the pages as land-*-<run>-<app>.
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, note, idle, drainJobs, serverLog} = require('../../../probe');

const SIG_ID = 'emailSetup-emailSignature-control';
const SKIP = new Set((process.env.H13D_SKIP || '').split(',').filter(Boolean));
const RECIPIENT = 'rvaca@mailinator.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const host = (u) => {
    try {
        return new URL(u.replace(/&amp;/g, '&')).host;
    } catch {
        return `(unparsed) ${u}`;
    }
};

/** Every <a href> of the HTML part: its words, address and host. */
const links = (html) =>
    [...String(html || '').matchAll(/<a\b[^>]*href=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({
        words: flat(m[3]),
        href: m[2].replace(/&amp;/g, '&'),
        host: host(m[2]),
    }));
/** Every address the text part shows. */
const textUrls = (text) => [...String(text || '').matchAll(/https?:\/\/[^\s)>\]]+/g)].map((m) => ({href: m[0], host: host(m[0])}));
/** The HTML part from the last dash on (the footer), flattened. */
const footer = (html) => {
    const s = String(html || '');
    const i = s.lastIndexOf('—');
    return i < 0 ? null : flat(s.slice(i));
};

/** Every statistics email Mailpit received since `since`, read whole. */
async function statsMails(app, since) {
    const res = await app.mail._get('/api/v1/search', {query: 'subject:"activity for"', limit: '200'});
    const from = since.getTime();
    const out = [];
    for (const m of res.messages || []) {
        if (new Date(m.Created).getTime() < from) continue;
        const full = await app.mail.fullMessage(m.ID);
        const headers = await app.mail._get(`/api/v1/message/${m.ID}/headers`).catch(() => ({}));
        const all = `${full.HTML || ''}\n${full.Text || ''}`;
        out.push({
            id: m.ID,
            created: m.Created,
            subject: full.Subject,
            to: (full.To || []).map((t) => t.Address),
            ours: all.includes(new URL(app.baseURL).host),
            links: links(full.HTML),
            textUrls: textUrls(full.Text),
            listUnsubscribe: (headers['List-Unsubscribe'] || []).join(' '),
            footerHtml: footer(full.HTML),
            textTail: String(full.Text || '').split(/\r?\n/).slice(-6).join('\n'),
        });
    }
    return out;
}

/** Hosts per link word, summed over a set of emails. */
const hostTable = (mails) => {
    const t = {};
    for (const m of mails) {
        for (const l of m.links) {
            const k = `${l.words} -> ${l.host}`;
            t[k] = (t[k] || 0) + 1;
        }
        const k = `List-Unsubscribe -> ${(m.listUnsubscribe.match(/https?:\/\/[^>/]+/) || ['none'])[0]}`;
        t[k] = (t[k] || 0) + 1;
    }
    return t;
};

const readSig = (page) =>
    page.evaluate((id) => (window.tinymce && window.tinymce.get(id) ? window.tinymce.get(id).getContent() : null), SIG_ID).catch(() => null);
const waitSig = (page) =>
    page.waitForFunction((id) => window.tinymce && window.tinymce.get(id) && window.tinymce.get(id).initialized, SIG_ID, {timeout: 20_000}).catch(() => {});

/** Settings › Workflow › "Emails" as rvaca: the "Signature" box, then left unsaved. */
async function signature(app) {
    const out = {};
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => dialogs.push({type: d.type(), message: d.message()}));
    try {
        await signIn(page, 'rvaca');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
        await idle(page).catch(() => {});
        await page.getByRole('tab', {name: 'Emails', exact: true}).click();
        await waitSig(page);
        await idle(page).catch(() => {});
        const html = await readSig(page);
        out.before = {html, links: links(html)};
        record('sig-emails-tab', await screen(page));
        await shot(page, 'sig-emails-tab');
        // The sweep: one character added, the tab left unsaved, then a reload.
        await page.frameLocator(`iframe[id="${SIG_ID}_ifr"]`).locator('body').click();
        await page.keyboard.press('End');
        await page.keyboard.type('Z');
        out.typed = await readSig(page);
        await page.getByRole('tab', {name: 'Submission', exact: true}).click();
        await idle(page).catch(() => {});
        record('sig-left-unsaved', await screen(page));
        await page.getByRole('tab', {name: 'Emails', exact: true}).click();
        await idle(page).catch(() => {});
        out.backOnTab = await readSig(page);
        await page.reload();
        await idle(page).catch(() => {});
        await page.getByRole('tab', {name: 'Emails', exact: true}).click();
        await waitSig(page);
        out.afterReload = await readSig(page);
        record('sig-after-reload', await screen(page));
        out.dialogs = dialogs;
    } catch (e) {
        out.error = String(e.message).slice(0, 400);
    } finally {
        await close();
    }
    return out;
}

forEachApp(async (app) => {
    const run = process.env.PROBE_RUN || 'r0';
    const facts = {app: app.name, line: app.line, dataset: app.dataset, run, baseURL: app.baseURL, at: new Date().toISOString()};
    const log = serverLog(app);
    try {
        if (!SKIP.has('cli')) {
            const since = new Date(Date.now() - 1000);
            const mark = log.mark();
            try {
                facts.scheduler = execFileSync('php', ['lib/pkp/tools/scheduler.php', 'test', '--name=PKP\\task\\StatisticsReport'], {
                    cwd: app.root,
                    env: {...process.env, PKP_CONFIG_FILE: app.configFile},
                    encoding: 'utf8',
                    timeout: 120_000,
                }).replace(/\s+/g, ' ').trim().slice(0, 400);
            } catch (e) {
                facts.scheduler = {error: `${e.stdout || ''}${e.stderr || ''}${e.message}`.slice(0, 800)};
            }
            const drained = await drainJobs(app).catch((e) => ({error: String(e.message).slice(0, 300)}));
            facts.jobs = {passes: drained.passes, counts: drained.counts, error: drained.error, output: String(drained.output || '').slice(-1200)};
            let mails = [];
            for (let i = 0; i < 30; i++) {
                mails = await statsMails(app, since);
                if (mails.some((m) => m.ours && m.to.includes(RECIPIENT))) break;
                await sleep(1000);
            }
            facts.cli = {mails, hosts: hostTable(mails.filter((m) => m.ours)), unattributed: mails.filter((m) => !m.ours).map((m) => ({to: m.to, subject: m.subject, hosts: [...new Set(m.links.map((l) => l.host))]}))};
            facts.cliServerLog = log.since(mark);
        }
        if (!SKIP.has('request')) {
            const since = new Date(Date.now() - 1000);
            try {
                const r = await app.api.runTask({task: 'statisticsReport', context: app.contextPath});
                facts.requestTask = {mailed: r.mailed, notified: r.notified, jobs: r.jobs, dateStart: r.dateStart, dateEnd: r.dateEnd};
            } catch (e) {
                facts.requestTask = {error: String(e.message).slice(0, 600)};
            }
            let mails = [];
            for (let i = 0; i < 30; i++) {
                mails = await statsMails(app, since);
                if (mails.some((m) => m.ours && m.to.includes(RECIPIENT))) break;
                await sleep(1000);
            }
            facts.request = {mails, hosts: hostTable(mails.filter((m) => m.ours))};
        }
        if (!SKIP.has('open') && facts.cli) {
            const mine = facts.cli.mails.find((m) => m.ours && m.to.includes(RECIPIENT));
            facts.opened = [];
            if (mine) {
                const {page, close} = await launch(app);
                try {
                    await signIn(page, 'rvaca');
                    const seen = new Set();
                    let n = 0;
                    for (const l of mine.links) {
                        if (seen.has(l.href)) continue;
                        seen.add(l.href);
                        n += 1;
                        const name = `land-${n}`;
                        const entry = {words: l.words, href: l.href};
                        try {
                            const resp = await page.goto(l.href, {timeout: 20_000});
                            entry.status = resp ? resp.status() : null;
                            await idle(page).catch(() => {});
                        } catch (e) {
                            entry.error = String(e.message).split('\n')[0].slice(0, 300);
                        }
                        const s = await screen(page).catch((e) => ({error: String(e.message).slice(0, 200)}));
                        entry.url = page.url();
                        entry.title = s.title;
                        entry.main = String((s.text && s.text.main) || '').slice(0, 300);
                        record(name, s);
                        await shot(page, name).catch(() => {});
                        facts.opened.push(entry);
                    }
                } finally {
                    await close();
                }
            } else {
                facts.opened.push({error: `no command-line email to ${RECIPIENT} naming ${app.baseURL}`});
            }
        }
        if (!SKIP.has('signature')) {
            facts.signature = await signature(app);
        }
    } catch (e) {
        facts.error = String(e.stack || e.message).slice(0, 800);
    } finally {
        if (facts.signature) record('signature', facts.signature);
        if (facts.cli || facts.request || facts.error) record('facts', facts);
    }
    if (run === 'r1' && facts.cli && facts.request) {
        note(`H13D monthly email (${app.name} ${app.line}): read every link host from Mailpit's search 'subject:"activity for"' since a timestamp taken before the run; a message is the fleet's when its HTML or text names the probe server's host:port; scheduler.php test --name=PKP\\task\\StatisticsReport then drainJobs is the command line's way, api.runTask({task:'statisticsReport'}) the request's.`);
    }
});
