// U17 A1, A7, A8 walk (issue reports docs/issues/U17-A1-section-link-chooses-no-section.md and
// docs/issues/U17-A7-A8-section-links-offer-closed-submissions.md).
// On PKP's default test dataset (a freshly reset install), About > "Submissions" {OJS OPS}:
//   steps (no argument): {OPS} rvaca creates section "Methods u17a" (the server has one section);
//     A1  ccorino presses the "Articles" ("Preprints") link under its policy: the start form's "Section";
//     A8  rvaca ticks "Disable Submissions"; ccorino reads the page and presses the link; rvaca unticks it;
//     A7  rvaca ticks "Inactive" on "Articles" ("Preprints"), reads the page, presses the link;
//         ccorino reads the page (control).
//   a1 | a8 | a7: that part alone (after the {OPS} section), for a fix trial; modes join by commas (a8,a7).
//   nb-a1: ccorino presses "Make a new submission" at the top (no section asked for);
//          rvaca, "Articles" ("Preprints") inactive, presses its line if there is one.
//   nb-a8: submissions open: ccorino and rvaca read the page (the lines must stay).
//   nb-a7: "Articles" ("Preprints") restricted to editors instead: rvaca reads the page and presses
//          its line; ccorino reads the page.
//   {OMP} every mode: the author aclark reads the page (a press has no section blocks).
//   PROBE_FEATURE=issues-u17a PROBE_AGENT=u17a node bin/probe.js all shared/playwright/checks/issues/section-link-chooses-no-section/walk.js [mode]
const {forEachApp, launch, signIn, signOut, record, screen} = require('../../../probe');
const H = require('./lib.js');

const MODES = ['steps', 'a1', 'a8', 'a7', 'nb-a1', 'nb-a8', 'nb-a7'];
// One mode, or several joined by commas ("a8,a7"), taken in the order of MODES.
const modes = (process.argv.slice(2).find((a) => a.split(',').every((m) => MODES.includes(m))) || 'steps').split(',');
const mode = modes.join(',');
const has = (m) => modes.includes(m);

async function step(facts, key, fn) {
    try {
        facts[key] = await fn();
    } catch (e) {
        facts[key] = {error: String((e && e.message) || e).slice(0, 500)};
    }
}

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode};
    const {page, close} = await launch(app);
    const part = (p) => has('steps') || has(p);
    try {
        if (app.name === 'omp') {
            await signIn(page, c.author);
            await step(facts, 'authorPage', async () => {
                const r = await H.readSubmissionsPage(page, app);
                delete r.sp;
                return r;
            });
            record('u17a-omp-page', await screen(page));
            return;
        }
        const read = async (key, who) => {
            await step(facts, key, async () => {
                const r = await H.readSubmissionsPage(page, app);
                delete r.sp;
                return {who, ...r};
            });
            record(`u17a-${key}`, await screen(page));
        };
        const press = async (key, title) => {
            await step(facts, key, () => H.pressSectionLink(page, app, title));
            record(`u17a-${key}`, await screen(page));
        };

        if (c.createSection) {
            await signIn(page, c.manager);
            await step(facts, 's0-createSection', () => H.createSection(page, app, c.createSection));
        }

        if (part('a1')) {
            await signIn(page, c.author);
            await read('a1-page', c.author);
            await press('a1-start', c.policySection);
        }

        if (part('a8')) {
            await signIn(page, c.manager);
            await step(facts, 'a8-disable', () => H.setDisableSubmissions(page, app, true));
            await signIn(page, c.author);
            await read('a8-page', c.author);
            await press('a8-start', c.policySection);
            await signIn(page, c.manager);
            await read('a8-page-manager', c.manager);
            await step(facts, 'a8-enable', () => H.setDisableSubmissions(page, app, false));
        }

        if (part('a7')) {
            await signIn(page, c.manager);
            await step(facts, 'a7-inactive', () => H.setInactive(page, app, c.policySection, true));
            await read('a7-page', c.manager);
            await press('a7-start', c.policySection);
            await signIn(page, c.author);
            await read('a7-page-author', c.author);
        }

        if (has('nb-a1')) {
            await signIn(page, c.author);
            await step(facts, 'nb1-top', () => H.pressTopLink(page, app));
            record('u17a-nb1-top', await screen(page));
            await signIn(page, c.manager);
            await step(facts, 'nb1-inactive', () => H.setInactive(page, app, c.policySection, true));
            await press('nb1-inactive-start', c.policySection);
        }

        if (has('nb-a8')) {
            await signIn(page, c.author);
            await read('nb8-page-author', c.author);
            await signIn(page, c.manager);
            await read('nb8-page-manager', c.manager);
        }

        if (has('nb-a7')) {
            await signIn(page, c.manager);
            await step(facts, 'nb7-restricted', () => H.setEditorRestricted(page, app, c.policySection, true));
            await read('nb7-page-manager', c.manager);
            await press('nb7-start', c.policySection);
            await signIn(page, c.author);
            await read('nb7-page-author', c.author);
        }
        await signOut(page);
    } finally {
        record('u17a-facts', facts);
        console.log(JSON.stringify(facts, null, 1).slice(0, 6000));
        await close();
    }
});
