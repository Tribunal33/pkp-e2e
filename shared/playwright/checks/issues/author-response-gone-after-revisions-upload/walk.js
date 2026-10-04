// Kept walk for docs/issues/U30-A7-author-response-gone-after-revisions-upload.md (spec U30, register A7).
// On PKP's default test dataset (a dataset fleet), OJS, submission 10 (author jnovak, Review round 1):
//   1 dbarnes opens submission 10; 2-3 "Request Revisions" ("Revisions will not be subject to a new round
//   of peer reviews."), the steps, "Record Decision"; 4 jnovak opens submission 10: status and the
//   "Author Response" card; 5 "Upload revisions" (Article Text, u30e-revision.txt); the round again;
//   6 the decision email's "Submit Author Response" pressed; 7 dbarnes reads the "Author Response" table
//   and sends "Request Response" (the way round); 8 jnovak opens submission 10 again.
// The kit builds nothing. A press shows no card at all (U30 OMP1, the companion walk
// ../press-author-response-button-leads-nowhere/walk.js); a preprint server has no review.
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: submission 7 (author dsokoloff)
// gets "Request Revisions" with "Revisions will be subject to a new round of peer reviews." (a decision
// whose email carries no "Submit Author Response"), and the author's round still shows no card.
// Run:
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/author-response-gone-after-revisions-upload/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, the 3.5 fleet's feature)
const {forEachApp, launch, signIn, screen, shot, record, note} = require('../../../probe');
const K = require('./lib.js');
const A1 = require('../author-response-request-leaves-no-trace/lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const CASES = {
    ojs: {id: 10, menuKey: 'workflow_3_8', author: 'jnovak', component: 'Article Text', nb: {id: 7, menuKey: 'workflow_3_6', author: 'dsokoloff'}},
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[a7 ${app.name}] no "Author Response" card on this app: nothing to walk`); return; }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const id = `a7-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, await screen(page).catch((e) => ({url: page.url(), error: K.flat(e.message)})));
        await shot(page, id).catch(() => {});
    };
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) {
            facts[key] = {threw: K.flat(e.message, 400)};
            note(`U30 A7 walk (${app.name}, ${MODE}): step ${key} threw: ${K.flat(e.message, 200)}`);
            await snap(`${key}-threw`).catch(() => {});
        }
        console.log(`[a7 ${app.name} ${MODE}] ${key}`, JSON.stringify(facts[key]).slice(0, 1200));
        return facts[key];
    };
    try {
        if (MODE === 'neighbour') {
            const s = c.nb;
            const since = new Date();
            await signIn(page, 'dbarnes');
            await step('n1-resubmit', async () => {
                const out = await K.decide(page, app, s.id, 'Request Revisions', {menuKey: s.menuKey, newRound: true});
                await snap('n1-recorded');
                return out;
            });
            await signIn(page, s.author);
            await step('n2-author', async () => {
                const out = await K.authorView(page, app, s.id, {menuKey: s.menuKey});
                await snap('n2-author');
                return out;
            });
            await step('n3-mail', async () => {
                const host = new URL(app.baseURL).host;
                const to = `${s.author}@mailinator.com`;
                const msg = await app.mail.find({to, contains: host, since, timeoutMs: 30_000});
                const full = await app.mail.fullMessage(msg.ID);
                return {subject: msg.Subject, button: app.mail.extractLink(full.HTML || '', 'Submit Author Response')};
            });
            return;
        }
        const since = new Date();
        await signIn(page, 'dbarnes');                                                              // 1
        await step('s1-3-decision', async () => {                                                   // 2, 3
            const out = await K.decide(page, app, c.id, 'Request Revisions', {menuKey: c.menuKey});
            await snap('s3-recorded');
            return out;
        });
        await signIn(page, c.author);
        await step('s4-author-after-decision', async () => {                                       // 4
            const out = await K.authorView(page, app, c.id, {menuKey: c.menuKey});
            await snap('s4-author');
            return out;
        });
        await step('s5-upload', () => K.uploadRevision(page, app, c.id, c.component, 'u30e-revision.txt')); // 5
        await step('s5-author-after-upload', async () => {
            const out = await K.authorView(page, app, c.id, {menuKey: c.menuKey});
            await snap('s5-author');
            return out;
        });
        const mail = await step('s6-mail', () => K.mailButton(app, `${c.author}@mailinator.com`, K.DECISION_SUBJECT, since));
        if (mail && mail.button) {
            await step('s6-button', async () => {                                                   // 6
                const out = await K.pressButton(page, mail.button);
                await snap('s6-button');
                return out;
            });
        }
        await signIn(page, 'dbarnes');
        await step('s7-table', async () => {                                                        // 7
            await A1.openEditorial(page, app, c.id);
            return A1.readTable(page, null);
        });
        await step('s7-request', () => A1.sendRequest(page, app, c.id, null));
        await signIn(page, c.author);
        await step('s8-author-after-request', async () => {                                       // 8
            const out = await K.authorView(page, app, c.id, {menuKey: c.menuKey});
            await snap('s8-author');
            return out;
        });
    } finally {
        record(`a7-facts-${MODE}`, facts);
    }
});
