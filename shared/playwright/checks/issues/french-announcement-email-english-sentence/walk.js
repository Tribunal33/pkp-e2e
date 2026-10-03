// Issue report docs/issues/U12-A14-french-announcement-email-english-sentence.md (spec U12 A14): the
// report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). OMP and OPS show it; OJS is the control.
//
// Default mode, as `dbarnes`:
//   2  Settings › Website › Setup › Languages: "Website Languages", row "Français (Canada)", the
//      primary radio
//   3  Settings › Website › Setup › Announcements: "Enable announcements", "Save"
//   4-5 the side menu's "Announcements", "Add Announcement": the French "Title" and "Short
//      Description", "Send an email about this to all registered users.", "Save"
//   6  rvaca@mailinator.com: the new email (the dataset's install runs its queued jobs on page loads;
//      the script loads the Announcements page between mailbox reads)
//   7  Settings › Workflow › Emails › "Add and edit templates", "New Announcement", "Edit": the
//      template's English and French subject and body (and the template GET the screen sends)
// `neighbour` as the argument runs alone: step 2 left out (English stays primary), the English
//   title and short description in step 5. With the fix in and out the English email and the
//   English template must read the same.
//
// Reset first:  npm run fleet-prep -- --feature issues-u12r7 --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-u12r7 PROBE_AGENT=u12r7 node bin/probe.js all shared/playwright/checks/issues/french-announcement-email-english-sentence/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u12r7-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u12r7-3_5 PROBE_AGENT=u12r7 node bin/probe.js all shared/playwright/checks/issues/french-announcement-email-english-sentence/walk.js
// Fix trial (fix-omp.diff, fix-ops.diff: the French texts and an upgrade migration that fills the empty
//   stored default): apply both, load the 3.5 dataset so the app's upgrade runs the migration
//   (PKP_E2E_DATASET_BRANCH=stable-3_5_0 npm run fleet-prep -- --feature issues-u12r7 --dataset 7 --reset --apps omp,ops),
//   PROBE_RUN=fix … walk.js; a plain reset, PROBE_RUN=nb-in … walk.js neighbour; revert; a plain
//   reset, PROBE_RUN=nb-out … walk.js neighbour.
// Facts: .reports/<feature>/u12r7/a14-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, drainJobs, serverLog} = require('../../../probe');
const {enableAnnouncements, openAnnouncementsFromMenu} = require('../sitemap-lists-expired-announcements/lib');
const {openManageEmails} = require('../preprint-emails-list-misses-sent-emails/lib');
const A = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const RECIPIENT = 'rvaca@mailinator.com';
const KEY = 'ANNOUNCEMENT';

forEachApp(async (app) => {
    const fr = MODE === 'steps';
    const marker = fr ? 'u12r7fr' : 'u12r7en';
    const facts = {mode: MODE, app: app.name, line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const fetched = [];
    page.on('response', async (r) => {
        if (new RegExp(`/api/v1/(emailTemplates|mailables)/${KEY}\\b`).test(r.url()) && r.request().method() === 'GET') {
            try {
                fetched.push({status: r.status(), json: await r.json()});
            } catch (e) {
                fetched.push({status: r.status(), error: String(e.message).slice(0, 200)});
            }
        }
    });
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {error: String(e.message).split('\n')[0].slice(0, 400)};
        }
    };
    try {
        // 1
        await signIn(page, 'dbarnes');
        await idle(page).catch(() => {});
        // 2
        if (fr) {
            await step('step2', async () => {
                const {JournalLanguagesTab} = require('../../../pages/LanguagesPages.js');
                const tab = new JournalLanguagesTab(page, app.contextPath, {locale: 'en'});
                await tab.goto();
                const before = {columns: await tab.website.columns(), frCA: await tab.website.cellTexts('fr_CA').catch((e) => e.message)};
                record(`a14-${MODE}-step2-languages`, await screen(page));
                const pressed = await tab.pressWebsite('fr_CA', 'contextPrimary');
                return {
                    before,
                    status: pressed.response ? pressed.response.status() : null,
                    alerts: pressed.alerts,
                    frPrimary: await tab.website.cell('fr_CA', 'contextPrimary').isChecked().catch(() => null),
                    enPrimary: await tab.website.cell('en', 'contextPrimary').isChecked().catch(() => null),
                };
            });
        }
        // 3
        await step('step3', () => enableAnnouncements(app, page));
        // 4
        await step('step4', () => openAnnouncementsFromMenu(app, page));
        // 5
        const since = new Date(Date.now() - 1000);
        const title = fr ? 'Appel à contributions u12r7fr' : 'Call for papers u12r7en';
        const short = fr ? 'Résumé u12r7' : 'Summary u12r7';
        await step('step5', () => A.addAnnouncement(page, {locale: fr ? 'fr_CA' : 'en', title, short}));
        record(`a14-${MODE}-step5-list`, await screen(page));
        // 6
        await step('step6', async () => {
            let {msg, loads} = await A.waitForMail(app, page, {
                to: RECIPIENT, marker, since,
                reloadUrl: `/index.php/${app.contextPath}/en/management/settings/announcements`,
            });
            let via = `page loads (${loads})`;
            if (!msg) {
                await drainJobs(app).catch(() => {});
                ({msg} = await A.waitForMail(app, page, {to: RECIPIENT, marker, since, tries: 10}));
                via = 'the job queue drained by the kit';
            }
            if (!msg) return {error: `no email to ${RECIPIENT} carrying ${marker}`};
            const recipients = await app.mail.count({to: 'mailinator.com', contains: marker, since}).catch(() => null);
            return {via, recipients, ...A.readMail(msg)};
        });
        // 7
        await step('step7', async () => {
            const {m, via} = await openManageEmails(page, app);
            const {kind, window: win} = await m.openEmail('New Announcement');
            const out = {manageEmailsVia: via, opens: kind};
            if (kind === 'several') {
                const rows = await m.templateRowsRead(win);
                out.templateRows = rows;
                const def = rows.find((r) => r.badges.includes('Default')) || rows[0];
                await m.openTemplate(win, def.name);
            }
            await idle(page).catch(() => {});
            for (const l of ['en', 'fr_CA']) {
                out[l] = {
                    subject: await m.subjectBox(l).inputValue().catch((e) => ({error: e.message.split('\n')[0]})),
                    body: A.flat(await m.bodyHtml(l).catch((e) => `ERROR ${e.message.split('\n')[0]}`)),
                };
            }
            record(`a14-${MODE}-step7-template`, await screen(page));
            await shot(page, `a14-${MODE}-step7-template`);
            out.templateGet = fetched.map((f) => {
                const j = f.json || {};
                const t = j.body ? j : (j.emailTemplates || [])[0] || {};
                return {status: f.status, error: f.error, subject: t.subject || null, body: Object.fromEntries(Object.entries(t.body || {}).map(([l, b]) => [l, A.flat(b, 400)]))};
            });
            return out;
        });
    } finally {
        facts.serverLog = log.since(from).slice(0, 20);
        await close();
    }
    record(`a14-${MODE}`, facts);
    const s6 = facts.step6 || {};
    console.log(JSON.stringify({app: app.name, line: facts.line, mode: MODE, run: facts.run,
        step2: facts.step2 && {status: facts.step2.status, alerts: facts.step2.alerts, frPrimary: facts.step2.frPrimary, error: facts.step2.error},
        step3: facts.step3, step5: facts.step5 && {status: facts.step5.status, fields: facts.step5.titleFields, error: facts.step5.error},
        mail: {via: s6.via, recipients: s6.recipients, subject: s6.subject, sentenceText: s6.sentenceText, sentenceHtml: s6.sentenceHtml, error: s6.error, tail: s6.text && s6.text.slice(-400)},
        template: facts.step7 && {en: facts.step7.en, fr_CA: facts.step7.fr_CA, error: facts.step7.error},
        serverLog: facts.serverLog.length}, null, 1));
});
