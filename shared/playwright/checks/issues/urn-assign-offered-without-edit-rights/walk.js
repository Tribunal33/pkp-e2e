// Issue report docs/issues/U44-A9-urn-assign-offered-without-edit-rights.md (U44 A9): on an article's
// (monograph's) "Identifiers" page a role that may not edit the publication sees "Save" greyed but
// "Assign" live; pressing it fills the URN box with a value that cannot be saved and is gone on the
// next visit. Takes the report's Steps on PKP's default test dataset (a dataset fleet), on OJS and OMP
// (OPS has no URN plugin):
//   1-3  `dbarnes`: Settings › Website › Plugins: "URN" enabled; "Settings": "Articles"/"Monographs",
//        prefix urn:nbn:de:0000-, the default suffix pattern, namespace urn:nbn:de, resolver, "Save"
//   4-7  `sberardo` (OJS; Section editor, "Permissions" unticked on submission 1) / `gcox` (OMP; Layout
//        Editor on submission 4): "Identifiers" of OJS submission 1 version 1.1 / OMP submission 4;
//        read "Save" and "Assign"; press "Assign"; reload
//   8    OJS: 4-7 again as `shellier` (Layout Editor on submission 1)
//   C    control: `dbarnes` on the same page: "Assign", "Save", reload
// WALK=neighbour runs alone (fix in and out): steps 1-3, then the control alone (a role that may edit
// keeps "Assign" and "Clear" and saves).
// A fix that greys "Assign" is recorded, not thrown on: step 6 presses it only when it is enabled.
//
// Reset first:  npm run fleet-prep -- --feature issues-u44g --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-u44g PROBE_AGENT=u44g node bin/probe.js all shared/playwright/checks/issues/urn-assign-offered-without-edit-rights/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44g-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44g-3_5 PROBE_AGENT=u44g node bin/probe.js all shared/playwright/checks/issues/urn-assign-offered-without-edit-rights/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, sql, idle} = require('../../../probe');
const {setUpUrn, openIdentifiers} = require('../urn-check-digit-from-suffix-only/lib');
const {readField, pressAssign} = require('./lib');

const MODE = process.env.WALK || 'walk';
const APP = {
    ojs: {kind: 'Articles', sid: 1, pub: 2, roles: ['sberardo', 'shellier']},
    omp: {kind: 'Monographs', sid: 4, pub: 4, roles: ['gcox']},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const a = APP[app.name];
    if (!a) {
        console.log(`[fact] ${app.name} skipped: no URN plugin`);
        return;
    }
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    // A read for the facts, not a step.
    const storedUrn = () => sql(app, `select setting_value from publication_settings where publication_id = ${a.pub} and setting_name = 'pub-id::other::urn'`);

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    const visit = async (who, {save = false} = {}) => {
        await signIn(page, who);
        const ids = await openIdentifiers(page, app, frame, a.sid, a.pub);
        const before = await readField(ids);
        record(name(`${who}-before`), await screen(page));
        const pressed = await pressAssign(page, ids);
        record(name(`${who}-assigned`), await screen(page));
        let saved = null;
        if (save && pressed.pressed && !before.saveDisabled) {
            await ids.save();
            saved = true;
        }
        const ids2 = await openIdentifiers(page, app, frame, a.sid, a.pub);
        const after = await readField(ids2);
        record(name(`${who}-reloaded`), await screen(page));
        const out = {before, pressed, saved, afterReload: after, stored: storedUrn() || null};
        await signOut(page);
        return out;
    };

    try {
        // 1-3
        await signIn(page, 'dbarnes');
        fact('3 setup', await setUpUrn(page, app, {kinds: [a.kind], suffix: 'default', checkNo: false}));
        await signOut(page);

        if (MODE === 'neighbour') {
            fact('N dbarnes', await visit('dbarnes', {save: true}));
            return;
        }
        // 4-8
        for (const who of a.roles) fact(`4-7 ${who}`, await visit(who));
        // control
        fact('C dbarnes', await visit('dbarnes', {save: true}));
    } finally {
        record(name('facts'), facts);
        await idle(page).catch(() => {});
        await close();
    }
});
