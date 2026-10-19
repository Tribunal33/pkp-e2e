// Issue report U04 A22: a contributor completes the emailed ORCID authorization for a work that is
// already published, on a journal (preprint server) using the member API, and the "ORCID
// Authorization" page says nothing of the deposit that follows. Steps: the report's "Steps to
// reproduce". Runs on PKP's default test dataset (a dataset fleet, reset before each walk).
//
//   MODE=steps (default)  OJS, OPS: ORCID on with "Member Sandbox" (screen); "Request verification"
//                         on the contributor (screen); publish (OJS, into "Vol. 1 No. 2 (2014)") or
//                         post (OPS) on screen; the email's link returned with ORCID's "Authorize"
//                         answer. Records the landing's lines, the queued jobs and what reached the
//                         ORCID stand-in.
//   MODE=nb               the neighbour, which the fix must leave alone: OJS, the same without the
//                         publish (the landing keeps "The submission will be added to your ORCID
//                         record during publication."); OMP, monograph 4 published (a press deposits
//                         nothing, so the landing keeps no deposit line).
//
// ORCID's token answer comes from the local stand-in checks/sync/pkp-lib-13493/orcid-token-stub.js
// (ORCID's documented success body; nothing reaches ORCID). The fleet's server must trust its CA:
//   node shared/playwright/checks/sync/pkp-lib-13493/orcid-token-stub.js --init --dir <STUB_DIR>
//   npm run probe-servers -- --stop --app <app> --dataset <n>
//   PHP_INI_SCAN_DIR=:<STUB_DIR>/php npm run probe-servers -- --start --app <app> --dataset <n>
// The walk starts the stand-in in-process and points the fleet config's `[proxy]` lines at it
// from the authorization on (the deposit job goes through it too), putting them back at the end.
//
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=h19f [MODE=nb] [PROBE_RUN=…] \
//     STUB_DIR=.reports/issues/h19f/orcid-stub STUB_PORT=8686 \
//     node bin/probe.js <ojs|omp|ops> shared/playwright/checks/issues/orcid-landing-published-no-deposit-line/walk.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, record, serverLog, sql} = require('../../../probe');
const {flat, readLanding, publishMonographOnScreen} = require('./lib');
const {sleep, setOrcidMember, jobsSince, jobMarks, pointProxy} = require('../publish-without-issue-orcid-contributor-error/lib');
const {orcidRows, awaitMail, readOrcidLink, openReturn, requestVerificationOnScreen, publishOnScreen} = require('../orcid-reauthorization-link-blank-page/lib');
const {startStub, ANSWERS} = require('../../sync/pkp-lib-13493/orcid-token-stub');

// ORCID's success answer to a member-API authorization: the stand-in's documented body with the
// scope the app asks the member API for (OrcidManager::ORCID_API_SCOPE_MEMBER), so the queued
// deposit goes out (the stand-in's own '200-token' carries the public scope, `/authenticate`, on
// which DepositOrcidSubmission asks for wider access instead). ANSWER=200-token for that one.
ANSWERS['200-token-member'] = {...ANSWERS['200-token'], body: JSON.stringify({...JSON.parse(ANSWERS['200-token'].body), scope: '/activities/update'})};
const ANSWER = process.env.ANSWER || '200-token-member';

const REPO = path.resolve(__dirname, '../../../../..');
const MODE = process.env.MODE || 'steps';
const STUB_DIR = path.resolve(REPO, process.env.STUB_DIR || '.reports/issues/h19f/orcid-stub');
const STUB_PORT = Number(process.env.STUB_PORT || 8686);

// Per mode and app: the dataset submission, its contributor, and whether the walk publishes it.
const PLAN = {
    steps: {
        ojs: {sid: 5, name: 'Diaga Diouf', email: 'ddiouf@mailinator.com', publish: true},
        ops: {sid: 1, name: 'Carlo Corino', email: 'ccorino@mailinator.com', publish: true},
    },
    nb: {
        ojs: {sid: 5, name: 'Diaga Diouf', email: 'ddiouf@mailinator.com', publish: false},
        omp: {sid: 4, name: 'Bart Beaty', email: 'bbeaty@mailinator.com', publish: true},
    },
};

forEachApp(async (app) => {
    const tagName = `h19f-${MODE}`;
    const plan = (PLAN[MODE] || {})[app.name];
    if (!plan) {
        record(`${tagName}-facts`, {skipped: `${app.name}: not in MODE=${MODE}`});
        return;
    }
    const {sid, name, email} = plan;
    const facts = {mode: MODE, line: app.line || 'main', dataset: app.dataset, sid, name};
    const fact = (k, v) => { facts[k] = v; record(`${tagName}-facts`, facts); console.log(`[h19f ${MODE} ${app.name}] ${k}:`, JSON.stringify(v).slice(0, 1500)); };
    const rec = (n, data) => record(`${tagName}-${n}`, data);
    rec.prefix = `${tagName}-`;
    const log = serverLog(app);
    const configFile = path.isAbsolute(app.configFile) ? app.configFile : path.join(REPO, app.configFile);
    const {page, close} = await launch(app);
    let stub;
    let proxy;
    try {
        // Steps 1-3: ORCID on, member API, as the manager.
        await signIn(page, 'rvaca');
        try { fact('settings', await setOrcidMember(page, app, {}, rec)); } catch (e) { fact('settingsError', flat(e.message, 400)); }
        await signOut(page);
        // Steps 4-6: "Request verification" on the contributor, and the email it sends.
        await signIn(page, 'dbarnes');
        const since = new Date();
        fact('request', await requestVerificationOnScreen(page, app, sid, name, rec));
        const message = await awaitMail(page, app, {to: email, subject: 'Requesting ORCID record access', since});
        const link = message ? await readOrcidLink(app, message) : null;
        fact('mail', link);
        // Step 7: publish / post.
        if (plan.publish) {
            const from = log.mark();
            fact('publish', app.name === 'omp' ? await publishMonographOnScreen(page, app, sid, rec) : await publishOnScreen(page, app, sid, rec));
            fact('publishLog', log.since(from).map((l) => flat(l, 400)));
        }
        fact('publication', sql(app, `select publication_id, status from publications where submission_id=${sid} order by 1`));
        // Step 8.
        await signOut(page).catch(() => {});
        if (!link || !link.redirect) return;
        // Step 9: ORCID's "Authorize" answer on the email's return address.
        stub = await startStub({dir: STUB_DIR, port: STUB_PORT, answer: ANSWER, logFile: path.join(STUB_DIR, `stub-${process.env.PROBE_RUN || 'main'}-${MODE}-${app.name}.log`)});
        const stubFrom = stub.mark ? stub.mark() : null;
        const marks = jobMarks(app);
        proxy = pointProxy(configFile, stub.proxyUrl);
        await sleep(3000);
        const verifiedAt = new Date();
        fact('verify', await openReturn(page, app, `${link.redirect}&code=h19fAuthorize1`, log, rec, '09-landing'));
        fact('landing', await readLanding(page));
        fact('rowsAfterVerify', orcidRows(app, sid, email));
        // The job runner runs on web requests: a page or two, then the queue and the stand-in.
        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await sleep(6000);
        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await sleep(3000);
        fact('jobs', jobsSince(app, marks));
        const after = await app.fleetMail.find({to: email, since: verifiedAt, timeoutMs: 2000}).catch(() => null);
        fact('mailAfterVerify', after ? after.Subject : null);
        fact('stubReceived', stub.since && stubFrom != null ? stub.since(stubFrom) : null);
    } finally {
        if (proxy) proxy.restore();
        if (stub) await stub.close().catch(() => {});
        await close();
    }
});
