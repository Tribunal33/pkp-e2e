// Issue report U04 A14: a contributor verified under the public API follows the "Requesting
// updated ORCID record access" link after the journal (preprint server) switched to the member
// API and published their work. Steps: .reports/issues/r2/steps.md (the report's "Steps to
// reproduce"). Runs on PKP's default test dataset (a dataset fleet, reset before each walk).
//
//   MODE=steps (default)  the report's steps: ORCID on with "Member Sandbox" (screen), the
//                         contributor's public-API verification (SQL, as VerifyIdentityWithOrcid
//                         stores it), publish/post on screen, the emailed link's return address
//                         opened with ORCID's "Authorize" answer, then with its "Deny" answer,
//                         then once more (a used link).
//   MODE=nb               the neighbour: the verification request of Rule 9 ("Request
//                         verification" on the contributor's ORCID iD field), its link's return
//                         address opened with "Authorize", then "Deny" (must answer the
//                         "ORCID Authorization" page, with the fix in and out).
//
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=r2 [MODE=nb] [PROBE_RUN=…] \
//     node bin/probe.js ojs,ops shared/playwright/checks/issues/orcid-reauthorization-link-blank-page/walk.js
// OMP has no such email (a press deposits nothing), so the walk skips it.
const {forEachApp, launch, signIn, signOut, record, serverLog, sql} = require('../../../probe');
const {flat, SUBJECT, seedPublicVerifiedOrcid, orcidRows, publishOnScreen, awaitMail, readOrcidLink, openReturn, requestVerificationOnScreen} = require('./lib');
const {setOrcidMember} = require('../publish-without-issue-orcid-contributor-error/lib');

const MODE = process.env.MODE || 'steps';
const AUTHORIZE = '&code=AbC123';
const DENY = '&error=access_denied&error_description=User%20denied%20access';

forEachApp(async (app) => {
    const tagName = `r2-${MODE}`;
    if (!SUBJECT[app.name]) {
        record(`${tagName}-facts`, {skipped: `${app.name}: a press deposits nothing, so it sends no re-authorization email`});
        return;
    }
    const {sid, email, name} = SUBJECT[app.name];
    const facts = {mode: MODE, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; record(`${tagName}-facts`, facts); console.log(`[r2 ${MODE}] ${k}:`, JSON.stringify(v).slice(0, 1500)); };
    const rec = (n, data) => record(`${tagName}-${n}`, data);
    rec.prefix = `${tagName}-`;
    const log = serverLog(app);
    const {page, close} = await launch(app);
    try {
        // Steps 1-2: ORCID on, member API, as the manager.
        await signIn(page, 'rvaca');
        try { fact('settings', await setOrcidMember(page, app, {}, rec)); } catch (e) { fact('settingsError', flat(e.message, 400)); }
        await signOut(page);
        await signIn(page, 'dbarnes');
        const since = new Date();
        let message;
        if (MODE === 'steps') {
            // Precondition: verified under the public API (only ORCID's sign-in creates it).
            fact('precondition', seedPublicVerifiedOrcid(app, sid, email));
            // Steps 3-4: publish / post.
            const from = log.mark();
            fact('publish', await publishOnScreen(page, app, sid, rec));
            fact('publishLog', log.since(from).map((l) => flat(l, 400)));
            fact('publication', sql(app, `select publication_id, status from publications where submission_id=${sid} order by 1`));
            // Step 5: the email.
            message = await awaitMail(page, app, {to: email, subject: 'Requesting updated ORCID record access', since});
        } else {
            fact('request', await requestVerificationOnScreen(page, app, sid, name, rec));
            message = await awaitMail(page, app, {to: email, subject: 'Requesting ORCID record access', since});
        }
        fact('jobs', {
            jobs: sql(app, `select id, substring(payload from '"displayName":"([^"]+)"') from jobs order by id`),
            failed: sql(app, `select id, substring(payload from '"displayName":"([^"]+)"'), left(exception, 200) from failed_jobs order by id`),
        });
        if (!message) {
            fact('mail', null);
            return;
        }
        const link = await readOrcidLink(app, message);
        fact('mail', link);
        fact('before', orcidRows(app, sid, email));
        await signOut(page).catch(() => {});
        if (!link.redirect) return;
        // Step 6: ORCID's "Authorize" answer; step 7: its "Deny" answer; then the used link.
        fact('authorize', await openReturn(page, app, link.redirect + AUTHORIZE, log, rec, '06-authorize'));
        fact('afterAuthorize', orcidRows(app, sid, email));
        fact('deny', await openReturn(page, app, link.redirect + DENY, log, rec, '07-deny'));
        fact('afterDeny', orcidRows(app, sid, email));
        fact('again', await openReturn(page, app, link.redirect + AUTHORIZE, log, rec, '08-again'));
        fact('afterAgain', orcidRows(app, sid, email));
    } finally {
        await close();
    }
});
