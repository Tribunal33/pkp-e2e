// Kept walk for docs/issues/U27-A1-send-review-to-orcid-offered-before-complete.md (spec U27, register A1).
// On PKP's default test dataset (a dataset fleet), journal and press: dbarnes turns ORCID on
// (Member Sandbox); one reviewer's authorized iD is written as ORCID's sign-in leaves it (the one
// precondition only the outside service creates); dbarnes opens the "More Actions" menu of that
// reviewer's unanswered request, presses "Send Review To ORCID", and opens the menus of a reviewer
// without an iD and of the same reviewer's completed review. Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=k5 node bin/probe.js ojs,omp \
//     shared/playwright/checks/issues/send-review-to-orcid-offered-before-complete/walk.js
// (`all` works too: a preprint server has no review and is skipped.)
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: the same setup, then the menu
// of the reviewer's completed review, which must keep "Send Review To ORCID".
// Helpers: ../reviewer-response-erases-reminder-history/lib.js.
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const K = require('../reviewer-response-erases-reminder-history/lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const ENTRY = 'Send Review To ORCID';

forEachApp(async (app) => {
    const c = K.CASES[app.name];
    if (!c) return; // a preprint server has no review
    const o = c.orcid;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, reviewer: o.user};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: K.flat(e.message, 400)};
            note(`U27 A1 walk (${app.name}, ${MODE}): step ${key} failed: ${K.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const {page} = await launch(app);
    await signIn(page, 'dbarnes');
    await step('p1-orcid-settings', () => K.enableOrcid(page, app));
    await step('p2-authorized-id', async () => K.authorizeOrcid(app, o.user));
    const has = (k) => Array.isArray(facts[k]) ? facts[k].includes(ENTRY) : null;

    if (MODE !== 'neighbour') {
        await step('s1-row', async () => K.rowText(await K.openWorkflow(page, app, c.pending), o.name));
        await step('s2-menu-unanswered', async () => K.menuEntries(page, await K.openWorkflow(page, app, c.pending), o.name));
        facts['s2-offered'] = has('s2-menu-unanswered');
        if (facts['s2-offered']) {
            await step('s3-send', async () => K.sendToOrcid(page, await K.openWorkflow(page, app, c.pending), o.name));
        }
        await step('s4-row-control', async () => K.rowText(await K.openWorkflow(page, app, c.pending), o.other));
        await step('s4-menu-control', async () => K.menuEntries(page, await K.openWorkflow(page, app, c.pending), o.other));
        facts['s4-offered'] = has('s4-menu-control');
    }
    await step('s5-row-completed', async () => K.rowText(await K.openWorkflow(page, app, o.completed), o.name));
    await step('s5-menu-completed', async () => K.menuEntries(page, await K.openWorkflow(page, app, o.completed), o.name));
    facts['s5-offered'] = has('s5-menu-completed');
    record(MODE === 'neighbour' ? 'a1-neighbour' : 'a1-summary', facts);
});
