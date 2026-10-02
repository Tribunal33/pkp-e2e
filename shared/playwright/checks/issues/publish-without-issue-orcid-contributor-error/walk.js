// Issue report U49 OJS4: on a journal with issues and ORCID on under the member API,
// publishing an article with "Don't Assign To An Issue" when its contributor holds a verified
// ORCID iD. Steps: .reports/issues/v6/steps.md (the report's "Steps to reproduce").
// Runs on PKP's default test dataset (a dataset fleet, reset before each walk).
//
//   MODE=steps (default)  the report's steps: ORCID settings on screen, the contributor's
//                         verified iD (SQL, as VerifyIdentityWithOrcid stores it), publish
//                         submission 5 with "Don't Assign To An Issue".
//   MODE=nb               the neighbour: the same, but "Assign To Current/Back Issue" ›
//                         "Vol. 1 No. 2 (2014)" (must publish and queue the ORCID deposit with
//                         the fix in and out).
//
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=v6 [MODE=nb] [PROBE_RUN=…] \
//     node bin/probe.js ojs shared/playwright/checks/issues/publish-without-issue-orcid-contributor-error/walk.js
// On stable-3_5_0 (PKP_E2E_LINE=stable-3_5_0) the walk records what the publish button opens
// for an article with no issue (that line has no "Don't Assign To An Issue").
const {forEachApp, launch, signIn, signOut, record, serverLog, sql} = require('../../../probe');
const {sleep, flat, setOrcidMember, seedVerifiedOrcid, jobsSince, jobMarks, publishFromWorkflow, reread} = require('./lib');

const MODE = process.env.MODE || 'steps';
const SUBMISSION = 5; // "Genetic transformation of forest trees", Production, author account ddiouf
const AUTHOR_EMAIL = 'ddiouf@mailinator.com';
const BACK_ISSUE = /Vol\. 1 No\. 2 \(2014\)/;

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        record(`v6-${MODE}-facts`, {skipped: `${app.name}: no issues, so no "Don't Assign To An Issue" (OJS only)`});
        return;
    }
    const facts = {mode: MODE, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; record(`v6-${MODE}-facts`, facts); console.log(`[v6 ${MODE}] ${k}:`, JSON.stringify(v).slice(0, 1500)); };
    const rec = (name, data) => record(`v6-${MODE}-${name}`, data);
    rec.prefix = `v6-${MODE}-`;
    const {page, close} = await launch(app);
    try {
        // Steps 1-5: ORCID on, member API, as the journal manager.
        await signIn(page, 'rvaca');
        try { fact('settings', await setOrcidMember(page, app, {}, rec)); } catch (e) { fact('settingsError', flat(e.message, 400)); }
        // Step 6: the verified iD only ORCID's sign-in creates.
        fact('precondition', seedVerifiedOrcid(app, SUBMISSION, AUTHOR_EMAIL));
        await signOut(page);
        // Steps 7-11.
        await signIn(page, 'dbarnes');
        const marks = jobMarks(app);
        const log = serverLog(app);
        const from = log.mark();
        const since = new Date();
        const choice = MODE === 'nb' ? 'Assign To Current/Back Issue' : "Don't Assign To An Issue";
        try {
            fact('publish', await publishFromWorkflow(page, app, SUBMISSION, {choice, issue: MODE === 'nb' ? BACK_ISSUE : null}, rec));
        } catch (e) {
            fact('publishError', flat(e.message, 500));
        }
        fact('serverLog', log.since(from).map((l) => flat(l, 400)));
        fact('dbAfterPublish', sql(app, `select publication_id, status, issue_id, date_published from publications where submission_id=${SUBMISSION}`));
        if (app.line === 'stable-3_5_0') return;
        // After a reload.
        fact('reloaded', await reread(page, app, SUBMISSION, rec));
        // The job runner runs on web requests: one more page, then wait for mail and jobs.
        await page.reload().catch(() => {});
        await sleep(8000);
        await page.reload().catch(() => {});
        await sleep(4000);
        fact('jobs', jobsSince(app, marks));
        fact('submission', sql(app, `select status, stage_id, current_publication_id from submissions where submission_id=${SUBMISSION}`));
        fact('eventLog', sql(app, `select message from event_log where assoc_type=1048585 and assoc_id=${SUBMISSION} and date_logged >= now() - interval '10 minutes' order by log_id`));
        fact('notificationsPublished', sql(app, `select count(*) from notifications where type=16777263 and assoc_id=(select current_publication_id from submissions where submission_id=${SUBMISSION})`));
        const pp = await app.mail.count({to: AUTHOR_EMAIL, subject: 'Publication Published', since});
        const any = await app.mail.count({to: AUTHOR_EMAIL, since});
        fact('mailToAuthor', {publicationPublished: pp, anyMessage: any});
        fact('serverLogAll', log.since(from).map((l) => flat(l, 400)));
        await signOut(page).catch(() => {});
    } finally {
        await close();
    }
});
