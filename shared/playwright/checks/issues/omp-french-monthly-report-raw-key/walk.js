// Issue report docs/issues/U69-A15-omp-french-book-page-raw-keys.md (its fix.diff), the part
// from spec U65 OMP5: on a press whose primary language is French (Canada), the monthly
// statistics email's "editorial-report.csv" names the External Review stage by a code.
// Steps (PKP's default test dataset, OMP):
//   1  dbarnes signs in
//   2  Settings > Website, "Setup" > "Languages"
//   3  "Website Languages", row "Français (Canada)": the "Primary locale" radio
//   4  php lib/pkp/tools/scheduler.php test --name='PKP\task\StatisticsReport'
//   5  php lib/pkp/tools/jobs.php run
//   6  dbarnes@mailinator.com: the new email and its "editorial-report.csv", first block
// Changes the press's primary language, so it runs on an install freshly loaded from the
// default dataset. NB=1 runs the neighbour check alone: steps 2 and 3 left out (English
// primary), the attachment the fix must leave as it is.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp \
//        shared/playwright/checks/issues/omp-french-monthly-report-raw-key/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, screen, record, note, idle} = require('../../../probe');
const {JournalLanguagesTab} = require('../../../pages/LanguagesPages.js');
const L = require('../monthly-report-counts-other-journals/lib.js');

const MAIL = 'dbarnes@mailinator.com';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour (English primary)' : 'steps (French (Canada) primary)'};
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'dbarnes');
        await idle(page);
        if (!nb) {
            // 2
            const tab = new JournalLanguagesTab(page, app.contextPath, {locale: 'en'});
            await tab.goto();
            facts.step2 = {columns: await tab.website.columns(), frCA: await tab.website.cellTexts('fr_CA').catch((e) => e.message)};
            record('step2-languages', await screen(page));
            // 3
            const pressed = await tab.pressWebsite('fr_CA', 'contextPrimary').catch((e) => ({error: e.message}));
            facts.step3 = {
                status: pressed.response ? pressed.response.status() : null,
                alerts: pressed.alerts || null,
                error: pressed.error || null,
                frPrimaryChecked: await tab.website.cell('fr_CA', 'contextPrimary').isChecked().catch(() => null),
                enPrimaryChecked: await tab.website.cell('en', 'contextPrimary').isChecked().catch(() => null),
            };
            record('step3-primary', await screen(page));
        }
    } finally {
        await close();
    }
    // 4, 5
    const since = new Date(Date.now() - 1000);
    facts.step4 = L.runTask(app);
    facts.step5 = L.runJobs(app);
    // 6
    let mails = await L.mailbox(app, MAIL, since);
    for (let i = 0; !mails.length && i < 30; i++) {
        await L.sleep(1500);
        mails = await L.mailbox(app, MAIL, since);
    }
    const m = mails[0] || null;
    const csv = m && (m.attachments.find((a) => a.name === 'editorial-report.csv') || {}).text;
    facts.step6 = {
        received: mails.map((x) => ({subject: x.subject, from: x.from})),
        attachments: m ? m.attachments.map((a) => ({name: a.name, bom: a.bom})) : null,
        active: L.activeBlock(csv),
        csv,
    };
    const lines = facts.step6.active.slice(1).map(([n]) => n);
    facts.verdict = {
        codes: lines.filter((n) => /^##.*##$/.test(n)),
        externalReviewLine: lines[2] || null,
    };
    record(nb ? 'neighbour' : 'walk', facts);
    note(`U65 OMP5 ${facts.mode} ${facts.line} ${app.name}: ${JSON.stringify(facts.step6.active)}`);
    console.log(JSON.stringify({app: app.name, line: facts.line, mode: facts.mode, step2: facts.step2, step3: facts.step3, task: facts.step4.status, taskOut: facts.step4.out, jobs: facts.step5.status, received: facts.step6.received, active: facts.step6.active, verdict: facts.verdict}, null, 1));
});
