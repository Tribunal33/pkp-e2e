// Issue report walk: docs/issues/U30-A11-author-response-deleted-from-other-submission.md
// (spec U30 register A11). OJS and OMP (OPS has no reviews API).
//
// No screen sends the author-response requests with a review round of another submission, and
// no press screen sends them at all, so they are checked directly: the requests the screens' own
// code sends (useAuthorResponseForm.js, AuthorResponseRequestManagerStore.js,
// RequestReviewRoundAuthorResponse.vue -> useFetch: X-Csrf-Token from pkp.currentUser.csrfToken;
// PUT and DELETE tunnelled as POST with X-Http-Method-Override) are sent with fetch() from the
// user's own signed-in page, as the report's console snippet does. Everything else goes through
// the screens. Runs on PKP's default test dataset (a dataset fleet):
//   OJS: lkumiega answers on submission 13 (round 10, revisions requested); minoue (Section
//     editor of submission 2 only) edits and deletes that answer through submission 2's
//     address; admin creates journal "u30r1 Journal" and invites phudson as its Journal manager,
//     phudson accepts and starts a submission there; lkumiega answers again; phudson edits and
//     deletes the answer through that journal's address; minoue requests a response on
//     submission 10's round (8) through submission 2's address.
//   OMP: dbarnes sends the request on submission 16's round (18) from the typed request page;
//     mpower posts the answer (no press screen offers it); minoue (assigned to 6) deletes it
//     through submission 6's address.
// MODE=nb: the neighbour check, which the fix must leave working: on OJS the author's "Submit
//   Response", the editor's "View" › "Save" and "Delete" on submission 13 and dbuskins's
//   "Request Response" › "Submit Request" on submission 10, all through the screens; on OMP the
//   same three requests through submission 16's own address.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs,omp
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs|omp <this file>
// Neighbour:    MODE=nb PROBE_RUN=nb-out … (and PROBE_RUN=nb-in with fix.diff applied)
// Fix trial:    fix-trial.sh beside this file (nb-out, apply, fix, nb-in, revert)
// Facts: .reports/<feature>/<id>/a10-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, sql} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const NAME = `a10-${MODE}`;

const OJS = {
    target: {id: 13, round: 10, author: 'lkumiega', authorName: 'Lise Kumiega', authorId: 22},
    own: {id: 2}, // minoue's submission
    asked: {id: 10, round: 8, author: 'jnovak', mail: 'jnovak@mailinator.com'},
    ownAuthorMail: 'ccorino@mailinator.com',
    journal: {name: 'u30r1 Journal', initials: 'U30R1', path: 'u30r1', email: 'u30r1@mailinator.com'},
    manager: {username: 'phudson', email: 'phudson@mailinator.com'},
};
const OMP = {
    target: {id: 16, round: 18, author: 'mpower', authorId: 49},
    own: {id: 6},
};

const responseText = (r) => {
    if (!r) return null;
    try {
        return sql(r.app, `SELECT response_id || ' ' || coalesce((SELECT string_agg(setting_value, ' ') FROM review_round_author_response_settings s WHERE s.response_id = a.response_id), '?') FROM review_round_author_responses a WHERE review_round_id = ${r.round}`) || 'none';
    } catch (e) {
        return `sql: ${String(e.message).split('\n')[0]}`;
    }
};

async function step(o, key, fn) {
    try {
        o[key] = await fn();
    } catch (e) {
        o[key] = {error: String(e.message || e).split('\n')[0].slice(0, 300)};
    }
    console.log(`[a10 ${key}]`, JSON.stringify(o[key]).slice(0, 700));
}

async function ojsWalk(app, page, o) {
    const T = OJS.target;
    const db = {app, round: T.round};
    // Preconditions: Lise Kumiega's response through the screens; the ids as dbarnes reads them
    await signIn(page, T.author, {contextPath: app.contextPath});
    await step(o, 'pre.card', () => L.authorCard(page, app, T.id));
    await step(o, 'pre.submit', () => L.submitResponse(page, T.authorName, 'Our answer to the reviewers (u30r1).'));
    await step(o, 'pre.cardAfter', () => L.authorCard(page, app, T.id));
    await signIn(page, 'dbarnes', {contextPath: app.contextPath});
    await L.dashboard(page, app, app.contextPath);
    await step(o, 'pre.rounds', () => L.rounds(page, T.id));
    const rid1 = o['pre.rounds'].rounds && o['pre.rounds'].rounds[0] && o['pre.rounds'].rounds[0].authorResponse && o['pre.rounds'].rounds[0].authorResponse.id;
    o.rid1 = rid1;

    // Preconditions, other journal: admin creates it and invites phudson; phudson accepts and starts a submission
    const since = new Date();
    await signIn(page, 'admin');
    await step(o, 'pre.createJournal', () => L.createJournal(page, app, OJS.journal));
    await step(o, 'pre.invite', () => L.inviteToRole(page, app, OJS.journal.path, {email: OJS.manager.email, role: 'Journal manager'}));
    await step(o, 'pre.acceptLink', () => L.acceptLink(app, OJS.manager.email, since));
    await signIn(page, OJS.manager.username); // the site login
    if (o['pre.acceptLink'] && o['pre.acceptLink'].link) await step(o, 'pre.accept', () => L.acceptInvitation(page, o['pre.acceptLink'].link));
    await step(o, 'pre.startSubmission', () => L.startSubmission(page, app, OJS.journal.path, 'u30r1 placeholder'));
    const sub2 = typeof o['pre.startSubmission'] === 'number' ? o['pre.startSubmission'] : null;

    // Section Editor, same journal (steps 1-6)
    await signIn(page, 'minoue', {contextPath: app.contextPath});
    await step(o, 's1.dashboard', () => L.dashboard(page, app, app.contextPath));
    await step(o, 's2.deleteOwnAddress', () => L.api(page, 'DELETE', `reviews/${T.id}/${T.round}/authorResponse/${rid1}`));
    o['s2.after'] = responseText(db);
    await step(o, 's3.putOtherAddress', () => L.api(page, 'PUT', `reviews/${OJS.own.id}/${T.round}/authorResponse/${rid1}`, {authorResponse: {en: '<p>Changed by minoue</p>'}, associatedAuthorIds: [T.authorId]}));
    o['s3.after'] = responseText(db);
    await step(o, 's4.deleteOtherAddress', () => L.api(page, 'DELETE', `reviews/${OJS.own.id}/${T.round}/authorResponse/${rid1}`));
    o['s4.after'] = responseText(db);
    await signIn(page, 'dbarnes', {contextPath: app.contextPath});
    await step(o, 's5.editorTable', () => L.editorTable(page, app, T.id));
    await signIn(page, T.author, {contextPath: app.contextPath});
    await step(o, 's6.authorCard', () => L.authorCard(page, app, T.id));

    // Journal manager of another journal (steps 7-13)
    await step(o, 's7.submitAgain', () => L.submitResponse(page, T.authorName, 'Our second answer (u30r1).'));
    await signIn(page, 'dbarnes', {contextPath: app.contextPath});
    await L.dashboard(page, app, app.contextPath);
    await step(o, 's7.rounds', () => L.rounds(page, T.id));
    const r7 = o['s7.rounds'].rounds && o['s7.rounds'].rounds[0];
    const rid2 = r7 && r7.authorResponse ? r7.authorResponse.id : null;
    o.rid2 = rid2;
    await signIn(page, OJS.manager.username); // the site login
    await step(o, 's9.controlWorkflow', () => L.typed(page, app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${T.id}`)));
    await step(o, 's9.controlReviewerDashboard', () => L.dashboard(page, app, app.contextPath, 'reviewAssignments'));
    await step(o, 's9.controlDeleteOwnJournal', () => L.api(page, 'DELETE', `reviews/${T.id}/${T.round}/authorResponse/${rid2}`));
    await signIn(page, OJS.manager.username); // the site login
    await step(o, 's8.dashboard', () => L.dashboard(page, app, OJS.journal.path));
    await step(o, 's10.putOtherJournal', () => L.api(page, 'PUT', `reviews/${sub2}/${T.round}/authorResponse/${rid2}`, {authorResponse: {en: '<p>Changed from another journal</p>'}, associatedAuthorIds: [T.authorId]}));
    o['s10.after'] = responseText(db);
    await signIn(page, T.author, {contextPath: app.contextPath});
    await step(o, 's11.authorCard', () => L.authorCard(page, app, T.id));
    await step(o, 's11.viewSubmitted', () => L.viewSubmitted(page));
    await signIn(page, OJS.manager.username); // the site login
    await L.dashboard(page, app, OJS.journal.path);
    await step(o, 's12.deleteOtherJournal', () => L.api(page, 'DELETE', `reviews/${sub2}/${T.round}/authorResponse/${rid2}`));
    o['s12.after'] = responseText(db);
    await signIn(page, 'dbarnes', {contextPath: app.contextPath});
    await step(o, 's13.editorTable', () => L.editorTable(page, app, T.id));

    // A request through another submission's address (steps 14-17)
    const A = OJS.asked;
    await signIn(page, A.author, {contextPath: app.contextPath});
    await step(o, 's14.cardBefore', () => L.authorCard(page, app, A.id));
    await signIn(page, 'minoue', {contextPath: app.contextPath});
    await step(o, 's15.controlTypedPage', () => L.typed(page, app.url(`/index.php/${app.contextPath}/en/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId=${A.round}&submissionId=${OJS.own.id}`)));
    await L.dashboard(page, app, app.contextPath);
    const before = new Date();
    await step(o, 's15.request', () => L.api(page, 'POST', `reviews/${OJS.own.id}/${A.round}/authorResponse/requestResponse`, {subject: 'Response requested (u30r1)', body: '<p>Please respond to the reviews (u30r1).</p>', locale: 'en', cc: [], bcc: [], attachments: [], recipients: []}));
    o['s15.flag'] = sql(app, `SELECT review_round_id || ' ' || setting_name || '=' || setting_value FROM review_round_settings WHERE setting_name = 'isAuthorResponseRequested'`) || 'none';
    await signIn(page, A.author, {contextPath: app.contextPath});
    await step(o, 's16.cardAfter', () => L.authorCard(page, app, A.id));
    await step(o, 's17.mail', async () => {
        const out = {};
        for (const to of [OJS.ownAuthorMail, A.mail]) {
            const found = await app.fleetMail.find({to, subject: 'Response requested (u30r1)', since: before, timeoutMs: 15_000}).catch(() => null);
            out[to] = found ? {subject: found.Subject, to: (found.To || []).map((t) => t.Address)} : null;
        }
        return out;
    });
}

async function ojsNeighbour(app, page, o) {
    const T = OJS.target;
    const db = {app, round: T.round};
    await signIn(page, T.author, {contextPath: app.contextPath});
    await step(o, 'nb.card', () => L.authorCard(page, app, T.id));
    await step(o, 'nb.submit', () => L.submitResponse(page, T.authorName, 'Our answer to the reviewers (u30r1 neighbour).'));
    o['nb.submit.after'] = responseText(db);
    // dbarnes: "…" › "View", new text, "Save"; then "…" › "Delete" › "OK"
    await signIn(page, 'dbarnes', {contextPath: app.contextPath});
    await step(o, 'nb.tableBefore', () => L.editorTable(page, app, T.id));
    await step(o, 'nb.edit', async () => {
        const R = require('../../../../../apps/ojs/playwright/pages/AuthorResponsePages.js');
        const table = new R.AuthorResponseTable(page);
        await table.openRowMenu(T.authorName);
        await table.menuItem('View').click();
        const win = new R.AuthorResponseWindow(page, {editor: true});
        await win.modal().waitFor({timeout: L.T});
        await win.body().waitFor({timeout: L.T});
        await L.sleep(800);
        await win.fillBody('Edited by the editor (u30r1 neighbour).');
        const put = page.waitForResponse((r) => /\/authorResponse\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', {timeout: L.T}).catch(() => null);
        await win.submitButton().click();
        const resp = await put;
        await win.modal().waitFor({state: 'hidden', timeout: L.T}).catch(() => {});
        return {put: resp ? resp.status() : null, override: resp ? await resp.request().headerValue('x-http-method-override') : null};
    });
    o['nb.edit.after'] = responseText(db);
    await step(o, 'nb.delete', async () => {
        const R = require('../../../../../apps/ojs/playwright/pages/AuthorResponsePages.js');
        const table = new R.AuthorResponseTable(page);
        await table.openRowMenu(T.authorName);
        await table.menuItem('Delete').click();
        const dialog = table.deleteDialog();
        await dialog.waitFor({timeout: L.T});
        const del = page.waitForResponse((r) => /\/authorResponse\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', {timeout: L.T}).catch(() => null);
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        const resp = await del;
        return {del: resp ? resp.status() : null, override: resp ? await resp.request().headerValue('x-http-method-override') : null};
    });
    o['nb.delete.after'] = responseText(db);
    // dbuskins: "Request Response" › "Submit Request" on submission 10
    const A = OJS.asked;
    await signIn(page, 'dbuskins', {contextPath: app.contextPath});
    await step(o, 'nb.tableAsked', () => L.editorTable(page, app, A.id));
    await step(o, 'nb.request', async () => {
        const R = require('../../../../../apps/ojs/playwright/pages/AuthorResponsePages.js');
        const req = new R.RequestAuthorResponsePage(page, app.contextPath);
        const b = page.getByRole('button', {name: 'Request Response', exact: true});
        if (!(await b.count()) || !(await b.isEnabled())) return {requestResponse: 'not enabled'};
        await b.click();
        await req.heading().waitFor({timeout: L.T});
        for (let i = 0; i < 60; i++) {
            const body = L.flat(await req.messageBody().innerText().catch(() => ''));
            if (body && body.length > 40 && !(await page.getByText('Loading', {exact: true}).count())) break;
            await L.sleep(500);
        }
        const posted = page.waitForResponse((r) => /authorResponse\/requestResponse/.test(r.url()), {timeout: L.T}).catch(() => null);
        await req.submitRequestButton().click();
        const resp = await posted;
        const dialog = page.getByRole('dialog').filter({hasText: /Request for review response sent|Error/});
        await dialog.first().waitFor({timeout: L.T}).catch(() => {});
        return {post: resp ? resp.status() : null, dialog: L.flat(await dialog.first().innerText().catch(() => null), 200)};
    });
    await signIn(page, A.author, {contextPath: app.contextPath});
    await step(o, 'nb.askedCard', () => L.authorCard(page, app, A.id));
}

async function ompWalk(app, page, o) {
    const T = OMP.target;
    const db = {app, round: T.round};
    // O1: dbarnes sends the request from the typed request page
    await signIn(page, 'dbarnes', {contextPath: app.contextPath});
    await step(o, 'o1.request', () => L.sendTypedRequest(page, app, {submissionId: T.id, reviewRoundId: T.round}));
    // O2: mpower posts the answer (no press screen offers it)
    await signIn(page, T.author, {contextPath: app.contextPath});
    await step(o, 'o2.dashboard', () => L.dashboard(page, app, app.contextPath, 'mySubmissions'));
    await step(o, 'o2.post', () => L.api(page, 'POST', `reviews/${T.id}/${T.round}/authorResponse`, {authorResponse: {en: '<p>Press answer (u30r1).</p>'}, associatedAuthorIds: [T.authorId]}));
    const rid = o['o2.post'].json && o['o2.post'].json.id;
    o.rid = rid;
    o['o2.after'] = responseText(db);
    if (MODE === 'nb') {
        // the neighbour: dbarnes edits and deletes through submission 16's own address
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});
        await L.dashboard(page, app, app.contextPath);
        await step(o, 'nb.put', () => L.api(page, 'PUT', `reviews/${T.id}/${T.round}/authorResponse/${rid}`, {authorResponse: {en: '<p>Edited by the editor (u30r1 neighbour).</p>'}, associatedAuthorIds: [T.authorId]}));
        o['nb.put.after'] = responseText(db);
        await step(o, 'nb.delete', () => L.api(page, 'DELETE', `reviews/${T.id}/${T.round}/authorResponse/${rid}`));
        o['nb.delete.after'] = responseText(db);
        return;
    }
    // O3: minoue, control through submission 16's address, then through submission 6's
    await signIn(page, 'minoue', {contextPath: app.contextPath});
    await step(o, 'o3.dashboard', () => L.dashboard(page, app, app.contextPath));
    await step(o, 'o3.deleteOwnAddress', () => L.api(page, 'DELETE', `reviews/${T.id}/${T.round}/authorResponse/${rid}`));
    o['o3.ownAfter'] = responseText(db);
    await step(o, 'o3.deleteOtherAddress', () => L.api(page, 'DELETE', `reviews/${OMP.own.id}/${T.round}/authorResponse/${rid}`));
    o['o3.otherAfter'] = responseText(db);
    // O4: dbarnes reads the round
    await signIn(page, 'dbarnes', {contextPath: app.contextPath});
    await L.dashboard(page, app, app.contextPath);
    await step(o, 'o4.rounds', () => L.rounds(page, T.id));
}

forEachApp(async (app) => {
    const o = {app: app.name, line: app.line || 'main', mode: MODE, dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const {page, close} = await launch(app);
    try {
        if (app.name === 'ojs') await (MODE === 'nb' ? ojsNeighbour : ojsWalk)(app, page, o);
        else if (app.name === 'omp') await ompWalk(app, page, o);
        else o.skipped = 'no reviews API';
    } catch (e) {
        o.error = String(e.stack || e).slice(0, 1500);
        console.log('[a10 error]', o.error);
    } finally {
        record(NAME, o);
        await signOut(page).catch(() => {});
        await close();
    }
});
