// Issue report docs/issues/U44-OMP8-urn-pattern-example-unknown-placeholder.md (U44 OMP8): a press's
// URN settings window lists %p %m %c %f %s %x as the pattern's placeholders, then gives the example
// "press%ppub%r", and "%r" is filled by nothing: a pattern copied from it leaves "%r" in the URN.
// Takes the report's Steps on PKP's default test dataset (a dataset fleet), as `dbarnes`, on OMP
// (OJS's example uses listed placeholders only; OPS has no URN plugin):
//   1-3  sign in; Settings › Website › Plugins: "URN" enabled; its "Settings"
//   4    read the pattern choice and the example under it
//   5-8  "Monographs", prefix, the pattern choice, "for monographs" = the example's pattern, namespace,
//        resolver, "Check Number" off, "Save"
//   9-11 book 7 › Publication › "Identifiers": "Assign", "Save", reload
// WALK=neighbour runs alone (fix in and out): the same steps with "press%ppub%m" (listed placeholders
// only) typed in step 7 instead of the example's pattern.
//
// Reset first:  npm run fleet-prep -- --feature issues-h19o --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-h19o PROBE_AGENT=h19o node bin/probe.js omp shared/playwright/checks/issues/urn-pattern-example-unknown-placeholder/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-h19o-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h19o-3_5 PROBE_AGENT=h19o node bin/probe.js omp shared/playwright/checks/issues/urn-pattern-example-unknown-placeholder/walk.js
const {expect} = require('@playwright/test');
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const {T, PREFIX, RESOLVER, flat, openUrnSettings, readPatternChoice, patternBox, openIdentifiers} = require('./lib');

const MODE = process.env.WALK || 'walk';
const SID = 7; // "Accessible Elements: Teaching Science Online and at a Distance"

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        console.log(`[fact] ${app.name} skipped: the example with "%r" is the press's (OMP) URN plugin's`);
        return;
    }
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${MODE}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const pubId = Number(sql(app, `select max(publication_id) from publications where submission_id = ${SID}`).trim());
    const {page, close} = await launch(app);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(flat(e.message, 200)));
    const snap = async (label) => record(name(label), await screen(page));
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    try {
        // 1-3
        await signIn(page, 'dbarnes');
        const {plugins, wasEnabled} = await openUrnSettings(page, app);
        fact('2 urn plugin was enabled', wasEnabled);

        // 4
        const choice = await readPatternChoice(plugins);
        fact('4 pattern choice', choice);
        const listed = [...choice.label.matchAll(/%[a-zA-Z]/g)].map((m) => m[0]);
        const exampleMatch = choice.example.match(/(\S*%\S*)/);
        const examplePattern = exampleMatch ? exampleMatch[1] : null;
        const used = examplePattern ? [...examplePattern.matchAll(/%[a-zA-Z]/g)].map((m) => m[0]) : [];
        fact('4 placeholders listed', listed);
        fact('4 example pattern', examplePattern);
        fact('4 example placeholders not listed', used.filter((u) => !listed.includes(u)));
        await snap('4-settings');

        // 5-8
        const typed = MODE === 'neighbour' ? 'press%ppub%m' : examplePattern;
        fact('7 pattern typed', typed);
        await plugins.setKind('Monographs', true);
        await plugins.prefixBox().fill(PREFIX);
        await plugins.suffixRadio('pattern').check();
        await expect(patternBox(plugins)).toBeEditable({timeout: T});
        await patternBox(plugins).fill(typed);
        await plugins.checkNumberBox().uncheck();
        await plugins.namespaceSelect().selectOption('urn:nbn:de');
        await plugins.resolverBox().fill(RESOLVER);
        await snap('8-before-save');
        await plugins.saveAccepted();
        fact('8 page errors so far (A11 is the settings window\'s own)', pageErrors.slice());

        // 9-10
        let ids = await openIdentifiers(page, app, frame, SID, pubId);
        fact('9 urn box before', await ids.box().inputValue());
        const assignVisible = await ids.assignButton().isVisible().catch(() => false);
        fact('10 assign offered', assignVisible);
        if (assignVisible) {
            await ids.assignButton().click();
            await expect(ids.box()).not.toHaveValue('', {timeout: T}).catch(() => {});
        }
        fact('10 urn box after assign', await ids.box().inputValue());
        await snap('10-assigned');

        // 11
        try {
            await ids.save();
            fact('11 save', 'saved');
        } catch (e) {
            fact('11 save error', flat(e.message, 400));
        }
        ids = await openIdentifiers(page, app, frame, SID, pubId);
        fact('11 urn box after reload', await ids.box().inputValue());
        await snap('11-reloaded');
        fact('11 stored (read)', sql(app, `select setting_value from publication_settings where publication_id = ${pubId} and setting_name = 'pub-id::other::urn'`).trim());
        fact('page errors', pageErrors);
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
