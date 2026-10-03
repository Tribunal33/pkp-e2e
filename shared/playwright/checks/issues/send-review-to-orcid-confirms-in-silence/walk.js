// Kept walk for docs/issues/U04-A1-send-review-to-orcid-confirms-in-silence.md (spec U04, register A1).
// On PKP's default test dataset (a dataset fleet), journal and press: dbarnes turns ORCID on (the journal
// under ORCID's public API, "Public Sandbox"; the press under "Member Sandbox", since a press sends no
// review under either); one reviewer's authorized iD is written as ORCID's sign-in leaves it (the one
// precondition only the outside service creates); dbarnes opens that reviewer's completed review row,
// "More Actions" › "Send Review To ORCID", "OK", and the walk records what the screen says.
// Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp \
//     shared/playwright/checks/issues/send-review-to-orcid-confirms-in-silence/walk.js
// (`all` works too: a preprint server has no review and is skipped.)
// WALK_MODE=neighbour runs only the neighbour check for a fix trial, on the journal: ORCID under
// "Member Sandbox" with a City (the journal's country is set in the dataset). Julie Janssen's iD carries
// the member scope, so a review can be sent: "OK" must still queue the deposit (it then fails on the
// unreachable ORCID service). Aisla McCrae's iD, on the same completed review, carries the public scope
// (connected before the journal moved to the member API): "OK" must still queue the job that emails her
// a permission request ("Requesting updated ORCID record access").
const {forEachApp, launch, signIn, record, note, screen, idle} = require('../../../probe');
const K = require('../reviewer-response-erases-reminder-history/lib.js');
const L = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const ENTRY = 'Send Review To ORCID';
const SCOPE = {public: '/authenticate', member: '/activities/update'};

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) return; // a preprint server has no review
    if (MODE === 'neighbour' && app.name !== 'ojs') return; // only a journal sends reviews
    const member = MODE === 'neighbour' || app.name !== 'ojs';
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, reviewer: c.user, submission: c.completed};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: K.flat(e.message, 400)};
            note(`U04 A1 walk (${app.name}, ${MODE}): step ${key} failed: ${K.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const {page} = await launch(app);
    await signIn(page, 'dbarnes');
    await step('p1-orcid-settings', () => L.enableOrcid(page, app, member
        ? {api: 'Member Sandbox', city: MODE === 'neighbour' ? 'Vancouver' : null}
        : {api: 'Public Sandbox'}));
    facts['p1-stored'] = L.orcidSettings(app);
    await step('p2-authorized-id', async () => L.authorizeOrcid(app, c.user, member ? SCOPE.member : SCOPE.public));
    if (MODE === 'neighbour') {
        // A reviewer who connected under the public API before the journal moved to the member API.
        await step('p3-scoped-id', async () => L.authorizeOrcid(app, c.scoped.user, SCOPE.public));
    }
    facts['jobs-before'] = L.orcidJobs(app);

    // Steps 1-3 on one reviewer's row: the row, the menu, "Send Review To ORCID" › "OK", then the queue
    // right after "OK", after one more page load (the job runner works the queue at a request's end) and
    // after a second one past the job's retry delay (5 s).
    const send = async (prefix, who) => {
        const since = new Date();
        await step(`${prefix}-row`, async () => K.rowText(await K.openWorkflow(page, app, c.completed), who.name));
        await step(`${prefix}-menu`, async () => K.menuEntries(page, await K.openWorkflow(page, app, c.completed), who.name));
        const menu = facts[`${prefix}-menu`];
        if (!(Array.isArray(menu) && menu.includes(ENTRY))) return;
        await step(`${prefix}-send`, async () => K.sendToOrcid(page, await K.openWorkflow(page, app, c.completed), who.name));
        await step(`${prefix}-screen`, async () => {
            const s = await screen(page);
            return {notices: s.notices};
        });
        facts[`${prefix}-jobs-at-ok`] = L.orcidJobs(app);
        await page.reload().catch(() => {});
        await idle(page);
        await K.sleep(2000);
        facts[`${prefix}-jobs-after-1`] = L.orcidJobs(app);
        await K.sleep(6000);
        await page.reload().catch(() => {});
        await idle(page);
        await K.sleep(2000);
        facts[`${prefix}-jobs-after-2`] = L.orcidJobs(app);
        await step(`${prefix}-mail`, async () => L.mailSubjects(app, who.user, since));
    };
    await send('s', {user: c.user, name: c.name});
    if (MODE === 'neighbour') await send('n2', c.scoped);
    record(MODE === 'neighbour' ? 'u04a1-neighbour' : 'u04a1-summary', facts);
});
