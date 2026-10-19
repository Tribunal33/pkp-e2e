// Issue report U49 OJS4, the verification side (U04 OJS2): a contributor of an article published
// with "Don't Assign To An Issue" completes the emailed ORCID authorization on a journal using the
// member API. Steps: .reports/issues/h19c/steps.md (the report's "Verifying after publication").
// Runs on PKP's default test dataset (a dataset fleet, reset before each walk).
//
//   MODE=steps (default)  ORCID on with "Member Sandbox" (screen); "Request verification" on Diaga
//                         Diouf (screen); publish submission 5 with "Don't Assign To An Issue"
//                         (screen); the email's link returned with ORCID's "Authorize" answer, then
//                         opened again with a new code.
//   MODE=nb               the neighbour: the same, but published into "Vol. 1 No. 2 (2014)" (must
//                         land on the success page and queue the deposit, with the fix in and out).
//
// ORCID's token answer comes from the local stand-in of checks/sync/pkp-lib-13493/orcid-token-stub.js
// (ORCID's documented success body; nothing reaches ORCID). The fleet's server must trust its CA:
//   node shared/playwright/checks/sync/pkp-lib-13493/orcid-token-stub.js --init --dir <STUB_DIR>
//   npm run probe-servers -- --stop --app ojs --dataset <n>
//   PHP_INI_SCAN_DIR=:<STUB_DIR>/php npm run probe-servers -- --start --app ojs --dataset <n>
// The walk starts the stand-in in-process (STUB_DIR, STUB_PORT) and points the fleet config's
// `[proxy]` lines at it only while the return address is opened.
//
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=h19c [MODE=nb] [PROBE_RUN=…] \
//     STUB_DIR=.reports/issues/h19c/orcid-stub STUB_PORT=8673 \
//     node bin/probe.js ojs shared/playwright/checks/issues/publish-without-issue-orcid-contributor-error/verify-walk.js
// On stable-3_5_0 the walk records what the publish button opens for an article with no issue
// (that line has no "Don't Assign To An Issue") and stops there.
const path = require('path');
const {forEachApp, launch, signIn, signOut, record, serverLog, sql} = require('../../../probe');
const {sleep, flat, setOrcidMember, jobsSince, jobMarks, publishFromWorkflow, pointProxy} = require('./lib');
const {orcidRows, awaitMail, readOrcidLink, openReturn, requestVerificationOnScreen} = require('../orcid-reauthorization-link-blank-page/lib');
const {startStub} = require('../../sync/pkp-lib-13493/orcid-token-stub');

const REPO = path.resolve(__dirname, '../../../../..');
const MODE = process.env.MODE || 'steps';
const STUB_DIR = path.resolve(REPO, process.env.STUB_DIR || '.reports/issues/h19c/orcid-stub');
const STUB_PORT = Number(process.env.STUB_PORT || 8673);
const SUBMISSION = 5; // "Genetic transformation of forest trees", Production, author account ddiouf
const NAME = 'Diaga Diouf';
const EMAIL = 'ddiouf@mailinator.com';
const BACK_ISSUE = /Vol\. 1 No\. 2 \(2014\)/;

forEachApp(async (app) => {
    const tagName = `h19c-${MODE}`;
    if (app.name !== 'ojs') {
        record(`${tagName}-facts`, {skipped: `${app.name}: no issues, so no publishing outside one (OJS only)`});
        return;
    }
    const facts = {mode: MODE, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; record(`${tagName}-facts`, facts); console.log(`[h19c ${MODE}] ${k}:`, JSON.stringify(v).slice(0, 1500)); };
    const rec = (n, data) => record(`${tagName}-${n}`, data);
    rec.prefix = `${tagName}-`;
    const log = serverLog(app);
    const configFile = path.isAbsolute(app.configFile) ? app.configFile : path.join(REPO, app.configFile);
    const choice = MODE === 'nb' ? 'Assign To Current/Back Issue' : "Don't Assign To An Issue";
    const {page, close} = await launch(app);
    let stub;
    let proxy;
    try {
        // Steps 1-3: ORCID on, member API, as the journal manager.
        await signIn(page, 'rvaca');
        try { fact('settings', await setOrcidMember(page, app, {}, rec)); } catch (e) { fact('settingsError', flat(e.message, 400)); }
        await signOut(page);
        await signIn(page, 'dbarnes');
        if (app.line === 'stable-3_5_0') {
            // The publish window decides whether the steps can be taken on this line.
            try { fact('publish', await publishFromWorkflow(page, app, SUBMISSION, {choice}, rec)); } catch (e) { fact('publishError', flat(e.message, 500)); }
            return;
        }
        // Steps 4-6: "Request verification" on the contributor, and the email it sends.
        const since = new Date();
        fact('request', await requestVerificationOnScreen(page, app, SUBMISSION, NAME, rec));
        const message = await awaitMail(page, app, {to: EMAIL, subject: 'Requesting ORCID record access', since});
        const link = message ? await readOrcidLink(app, message) : null;
        fact('mail', link);
        fact('rowsAfterRequest', orcidRows(app, SUBMISSION, EMAIL));
        // Steps 7-9: publish outside an issue (or, nb, into the back issue).
        const from = log.mark();
        try {
            fact('publish', await publishFromWorkflow(page, app, SUBMISSION, {choice, issue: MODE === 'nb' ? BACK_ISSUE : null}, rec));
        } catch (e) {
            fact('publishError', flat(e.message, 500));
        }
        fact('publishLog', log.since(from).map((l) => flat(l, 400)));
        fact('publication', sql(app, `select publication_id, status, issue_id, date_published from publications where submission_id=${SUBMISSION} order by 1`));
        await signOut(page).catch(() => {});
        if (!link || !link.redirect) return;
        // Steps 10-11: ORCID's "Authorize" answer on the email's return address, then once more.
        stub = await startStub({dir: STUB_DIR, port: STUB_PORT, answer: '200-token', logFile: path.join(STUB_DIR, `stub-${process.env.PROBE_RUN || 'main'}-${MODE}.log`)});
        const stubFrom = stub.mark ? stub.mark() : null;
        const marks = jobMarks(app);
        proxy = pointProxy(configFile, stub.proxyUrl);
        await sleep(3000);
        fact('verify', await openReturn(page, app, `${link.redirect}&code=h19cAuthorize1`, log, rec, '10-verify'));
        fact('rowsAfterVerify', orcidRows(app, SUBMISSION, EMAIL));
        fact('again', await openReturn(page, app, `${link.redirect}&code=h19cAuthorize2`, log, rec, '11-again'));
        proxy.restore();
        proxy = null;
        fact('stubReceived', stub.since && stubFrom != null ? stub.since(stubFrom) : null);
        fact('rowsAfterAgain', orcidRows(app, SUBMISSION, EMAIL));
        // The job runner runs on web requests: a page or two, then the queue.
        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await sleep(6000);
        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await sleep(3000);
        fact('jobs', jobsSince(app, marks));
    } finally {
        if (proxy) proxy.restore();
        if (stub) await stub.close().catch(() => {});
        await close();
    }
});
