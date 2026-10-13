// Kept walk for docs/issues/U45-OJS9-author-response-doi-reminted.md (spec U45, register OJS9).
// The defect is latent: no screen offers the "Author Response" DOI kind. The walk confirms the code
// read on PKP's default test dataset (a dataset fleet), OJS, journal `publicknowledge`, as the
// dataset's users, through the screens except step 2:
//   1 dbarnes: DOIs "Setup": prefix 10.1234, "Peer Review" ticked, "Save"
//   2 the journal settings request the "Setup" tab sends, with "authorResponse" added to
//     enabledDoiTypes (the one request no screen sends; WALK_MODE=neighbour leaves it out)
//   3 submission 10: Aisla McCrae's review "Edit" › "Publicly Show Reviewer Comments", "OK";
//     her "Read Review" › "Mark as Complete" (the control: a peer-review DOI on the same article)
//   4 "Request Response" › "Submit Request"
//   5 jnovak: "Submit Response" (John Novak ticked)
//   6 dbarnes: "Accept Submission" (the automatic assignment at Copyediting)  [db read 1]
//   7 DOIs page: "Assign DOIs" on submission 10                                [db read 2]
//   8 the same again                                                           [db read 3]
// The database reads (the response's, the review's and the article's doi_id, the journal's DOI rows,
// the rows no item points at) are the evidence, not steps. The kit builds nothing.
// WALK_MODE=neighbour (fix trial): the same without step 2: the response must get no DOI while the
// article and the review get and keep theirs.
// Run:
//   npm run fleet-prep -- --feature <feature> --dataset <n> --apps ojs --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=u45r1 node bin/probe.js ojs shared/playwright/checks/issues/author-response-doi-reminted/walk.js
// OMP and OPS have no author responses (OMP's review has no "Author Response" table, OPS no review);
// stable-3_5_0 has no author responses at all.
const {forEachApp, launch, signIn, screen, shot, record, note, serverLog} = require('../../../probe');
const K = require('./lib.js');
const PR = require('../public-review-never-shown/lib.js');
const A1 = require('../author-response-request-leaves-no-trace/lib.js');
const A7 = require('../author-response-gone-after-revisions-upload/lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const CASES = {
    ojs: {sid: 10, menuKey: 'workflow_3_8', author: {user: 'jnovak', name: 'John Novak'}, reviewer: {user: 'amccrae', name: 'Aisla McCrae'}},
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[ojs9 ${app.name}] no author responses on this app: nothing to walk`); return; }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const log = serverLog(app);
    const from = log.mark();
    const {page} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const id = `ojs9-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, await screen(page).catch((e) => ({url: page.url(), error: K.flat(e.message)})));
        await shot(page, id).catch(() => {});
    };
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) {
            facts[key] = {threw: K.flat(e.message, 400)};
            note(`U45 OJS9 walk (${app.name}, ${MODE}): step ${key} threw: ${K.flat(e.message, 200)}`);
            await snap(`${key}-threw`).catch(() => {});
        }
        console.log(`[ojs9 ${app.name} ${MODE}] ${key}`, JSON.stringify(facts[key]).slice(0, 1500));
        return facts[key];
    };
    const j = K.journal(app);
    const read = (key) => step(key, async () => K.dbRead(app, {sid: c.sid, reviewer: c.reviewer.user, contextId: j.id}));
    try {
        facts.journal = j;
        await signIn(page, 'dbarnes');
        const setup = await step('s1-setup', async () => {                                         // 1
            const out = await K.setupSave(page, app, {prefix: '10.1234', tick: ['Peer Review']});
            await snap('s1-setup');
            return out;
        });
        if (MODE !== 'neighbour') {
            await step('s2-kind-on', async () => {                                                  // 2
                const out = await K.putDoiTypes(page, app, {contextId: j.id, csrf: setup && setup.csrf, types: ['publication', 'peerReview', 'authorResponse']});
                return {...out, stored: K.journal(app).enabledDoiTypes};
            });
            await step('s2-setup-after', async () => {
                const {DoiSettings} = require('../../../pages/DoisPages.js');
                const settings = new DoiSettings(page, app.contextPath);
                await settings.goto('Setup');
                await snap('s2-setup-after');
                return {kinds: await settings.kinds()};
            });
        }
        await step('s3-public', () => PR.editReview(page, app, c.sid, c.reviewer.name, {makePublic: true}));   // 3
        await step('s3-complete', () => PR.markComplete(page, app, c.sid, c.reviewer.name));
        await step('s4-request', async () => {                                                      // 4
            await A1.openEditorial(page, app, c.sid);
            return A1.sendRequest(page, app, c.sid, null);
        });
        await signIn(page, c.author.user);
        await step('s5-response', async () => {                                                     // 5
            await A1.authorView(page, app, c.sid, null);
            const out = await A1.submitResponse(page, c.author.name, 'u45r1: our response to the reviewers.');
            await snap('s5-response');
            return out;
        });
        await read('db0-before');
        await signIn(page, 'dbarnes');
        await step('s6-accept', async () => {                                                       // 6
            const out = await A7.decide(page, app, c.sid, 'Accept Submission', {menuKey: c.menuKey});
            await snap('s6-accepted');
            return out;
        });
        await read('db1-after-accept');
        await step('s7-assign', async () => {                                                       // 7
            const out = await K.assignDois(page, app, c.sid);
            await snap('s7-assigned');
            return out;
        });
        await read('db2-after-assign');
        await step('s8-assign-again', async () => {                                                 // 8
            const out = await K.assignDois(page, app, c.sid);
            await snap('s8-assigned');
            return out;
        });
        await read('db3-after-assign-again');
        facts.serverLog = log.since(from).slice(0, 20);
    } finally {
        record(`ojs9-facts-${MODE}`, facts);
    }
});
