// Issue report docs/issues/U63-A5-doaj-deposit-takes-other-journals-articles.md (U63 A5) {OJS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets").
//
//   1-3 (as admin): Administration › Hosted Journals › "Create Journal" "Second Journal <tag>", path <tag>,
//      "Enable this journal to appear publicly on the site" ticked; its DOAJ Export Plugin › Settings: an API
//      key and the automatic-deposit box, "Save"
//   4-8 (as dbarnes, publicknowledge) DOAJ Export Plugin › Articles: submission 17 › "Mark registered";
//      its workflow: "Unpublish", then "Schedule For Publication" › "Confirm" › "Publish"; the list reads "Needs Sync"
//   9 the daily DOAJ task (the cron command; the task has no screen)
//   10 (as dbarnes) the DOAJ list again; 11 (as admin) Administration › "View Jobs", "View Failed Jobs", "Details";
//   12 the article link the deposit carried
//
// `neighbour` as the argument: before the task, dbarnes also saves an API key and ticks automatic deposit on
// publicknowledge, so publicknowledge's own "Needs Sync" and "Not Deposited" articles must still go, in its own
// name (the path a fix must leave alone).
// The kit builds nothing; besides the screens the script reads the queue tables (Evidence only).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir1 node bin/probe.js ojs shared/playwright/checks/issues/doaj-deposit-takes-other-journals-articles/walk.js [neighbour] [versioning]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=ir1 node bin/probe.js ojs shared/playwright/checks/issues/doaj-deposit-takes-other-journals-articles/walk.js
const {forEachApp, launch, signIn, screen, shot, record, tag} = require('../../../probe');
const L = require('./lib');

const neighbour = process.argv.slice(2).includes('neighbour');
// `versioning`: both journals set "DOI Versioning" "Yes" first (the list is then "Publications"), the
// path through the publications' query.
const versioning = process.argv.slice(2).includes('versioning');
const TAB = versioning ? 'Publications' : 'Articles';
const SID = 17;

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // DOAJ is OJS's alone
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const t = tag('u63ir1');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, tag: t, neighbour, versioning};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 1200)}`);
    };
    let n = 0;
    const snap = async (page, name) => {
        const label = `${neighbour ? 'nb' : 'w'}${versioning ? 'v' : ''}-${String(++n).padStart(2, '0')}-${name}`;
        record(label, await screen(page));
        await shot(page, label).catch(() => {});
        return label;
    };
    const statusOf = (list) => (list.find((r) => r[0] === String(SID)) || [])[3] || null;

    const {page, close} = await launch(app);
    try {
        // 1-3: the second journal, as admin
        await signIn(page, 'admin');
        fact('1 create journal', {status: await L.createJournal(page, app, {name: `Second Journal ${t}`, initials: 'SJ', path: t, email: `${t}@mailinator.com`})});
        await L.openDoaj(page, app, t);
        const before2 = await L.readSettings(page);
        await snap(page, 'second-doaj-settings');
        const saved2 = await L.saveSettings(page, {key: `${t}-test-key`, auto: true});
        await L.openDoaj(page, app, t);
        fact('2-3 second journal DOAJ settings', {before: before2, save: saved2, after: await L.readSettings(page), snap: await snap(page, 'second-doaj-saved')});
        if (versioning) {
            fact('versioning: second journal', await L.versioningYes(page, app, t));
            fact('versioning: publicknowledge', await L.versioningYes(page, app, 'publicknowledge'));
        }
        await L.openDoaj(page, app, t, TAB);
        fact('second journal list', await L.readList(page));

        // 4-8: publicknowledge, as dbarnes
        await signIn(page, 'dbarnes');
        await L.openDoaj(page, app, 'publicknowledge');
        fact('4 publicknowledge DOAJ settings', await L.readSettings(page));
        await L.openDoaj(page, app, 'publicknowledge', TAB);
        fact('4 list', await L.readList(page));
        const mr = await L.markRegistered(page, SID);
        await L.openDoaj(page, app, 'publicknowledge', TAB);
        fact('5 mark registered', {status: mr, row: statusOf(await L.readList(page)), snap: await snap(page, 'marked')});
        fact('6 unpublish', {status: await L.unpublish(page, app, 'publicknowledge', SID), snap: await snap(page, 'unpublished')});
        fact('7 publish', {...(await L.publish(page, app, 'publicknowledge', SID)), snap: await snap(page, 'published')});
        await L.openDoaj(page, app, 'publicknowledge', TAB);
        fact('8 list before the task', {list: await L.readList(page), snap: await snap(page, 'before-task')});

        if (neighbour) {
            await L.openDoaj(page, app, 'publicknowledge');
            const s = await L.saveSettings(page, {key: 'publicknowledge-test-key', auto: true});
            await L.openDoaj(page, app, 'publicknowledge');
            fact('neighbour: publicknowledge DOAJ settings', {save: s, after: await L.readSettings(page)});
        }
        fact('queue before the task', L.dbJobs(app));

        // 9: the daily task
        fact('9 task', L.runTask(app));
        fact('queue after the task', L.dbJobs(app));

        // 10
        await L.openDoaj(page, app, 'publicknowledge', TAB);
        const after = await L.readList(page);
        fact('10 list after the task', {row17: statusOf(after), list: after, snap: await snap(page, 'after-task')});

        // 11: the jobs pages, as admin
        await signIn(page, 'admin');
        const jobs = await L.readJobsPage(page, app, 'jobs');
        fact('11 View Jobs', {...jobs, snap: await snap(page, 'view-jobs')});
        // The install runs queued jobs on page loads (job_runner On, the dataset's config): the deposit runs
        // and, with DOAJ out of reach on the test install, lands on "View Failed Jobs".
        let failed = await L.readJobsPage(page, app, 'failedJobs');
        for (let i = 0; i < 5 && !failed.details.length && jobs.details !== null; i++) failed = await L.readJobsPage(page, app, 'failedJobs');
        fact('11 View Failed Jobs', {...failed, snap: await snap(page, 'view-failed-jobs')});
        const details = [];
        for (const href of failed.details.slice(0, 4)) {
            const rows = await L.readJobDetails(page, href);
            details.push({href: L.rel(href), rows: rows.map(([a, v]) => [a, /payload/i.test(a || '') ? L.flat(v, 6000) : L.flat(v, 300)])});
        }
        if (details.length) await snap(page, 'failed-job-details');
        fact('11 details', details);
        // 12: the article link the deposit carried, as a reader of DOAJ would follow it
        const payloadText = details.flatMap((d) => d.rows.map(([, v]) => v || '')).join(' ').replace(/\\/g, '');
        const links = [...new Set(payloadText.match(/https?:\/\/[^"\s]*?\/article\/view\/\d+(\/version\/\d+)?/g) || [])];
        const visits = [];
        for (const u of links) {
            const r = await page.goto(u).catch(() => null);
            visits.push({link: L.rel(u), status: r ? r.status() : null, h1: L.flat(await page.locator('h1').first().innerText().catch(() => null), 80), snap: await snap(page, 'deposited-link')});
        }
        fact('12 deposited links', visits);
        fact('queue at the end', L.dbJobs(app));
    } finally {
        record(`facts${neighbour ? '-neighbour' : ''}${versioning ? '-versioning' : ''}`, facts);
        await close();
    }
});
