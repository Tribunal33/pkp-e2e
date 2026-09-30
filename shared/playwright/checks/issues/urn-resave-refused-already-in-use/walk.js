// Kept walk for docs/issues/U44-A4-urn-resave-refused-already-in-use.md (spec U44 register A4).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   Preconditions, as `rvaca`: Settings › Website › Plugins: tick "URN"; its "Settings": "Articles"
//     ("Monographs"), prefix urn:nbn:de:0000-, individual suffix, namespace urn:nbn:de, resolver; "Save".
//   Saving again, as `dbarnes`: OJS submission 5 (OMP 4), "Identifiers", type urn:nbn:de:0000-u44r2a,
//     "Save", "Save" again.
//   A new version: OJS submission 17 (OMP 14), "Create New Version", the new version's "Identifiers",
//     type urn:nbn:de:0000-u44r2b, "Save", "Save" again.
// A "Identifiers" page is opened at the address its side-menu entry puts in the address bar
// (…/dashboard/editorial?workflowSubmissionId=<n>&workflowMenuKey=publication_<version>_identifiers on
// main, …publication_identifiers on 3.5, where the page shows the newest version).
// Records every screen with screen(); prints one line per step. No assertions: the script records.
// Run (main): PROBE_FEATURE=issues-r2 PROBE_AGENT=r2 node bin/probe.js ojs,omp shared/playwright/checks/issues/urn-resave-refused-already-in-use/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r2-3_5 PROBE_AGENT=r2 node bin/probe.js …
const {forEachApp, launch, signOut, record} = require('../../../probe');
const L = require('./lib');

const SUBS = {
    ojs: {draft: 5, published: 17},
    omp: {draft: 4, published: 14},
};

forEachApp(async (app) => {
    const subs = SUBS[app.name];
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!subs) { fact('surface', 'no URN plugin on this app'); record('w-facts', facts); return; }
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `w-${String(++n).padStart(2, '0')}-${x}`;
    try {
        // Preconditions: the URN plugin on and set up, as the manager.
        await L.signIn(page, 'rvaca');
        fact('pre: URN plugin set up', await L.setUpUrnPlugin(page, app, nm('pre')));
        await signOut(page);

        // 1. Sign in as dbarnes.
        await L.signIn(page, 'dbarnes');
        // 2-3. The not-yet-published submission's "Identifiers".
        const d = await L.readSubmission(page, app, subs.draft);
        fact(`submission ${subs.draft}`, d);
        const dPid = d.publications[d.publications.length - 1].id;
        fact('step3: Identifiers', await L.openIdentifiers(page, app, subs.draft, dPid, nm('step3-identifiers')));
        // 4. Type and "Save".
        await L.typeUrn(page, `${L.PREFIX}u44r2a`);
        fact('step4: Save', await L.pressSave(page, nm('step4-save')));
        // 5. "Save" again, nothing changed.
        fact('step5: Save again', await L.pressSave(page, nm('step5-save-again')));
        fact('after step5: stored', (await L.readSubmission(page, app, subs.draft)).publications);

        // 6-7. The published submission: "Create New Version".
        const p = await L.readSubmission(page, app, subs.published);
        fact(`submission ${subs.published}`, p);
        const pPid = p.publications[p.publications.length - 1].id;
        const v = await L.createNewVersion(page, app, subs.published, pPid, nm('step7-create-version'));
        fact('step7: Create New Version', v);
        const p2 = await L.readSubmission(page, app, subs.published);
        fact('after step7: versions', p2.publications);
        const newPid = v.newId || p2.publications[p2.publications.length - 1].id;
        // 8. The new version's "Identifiers".
        fact('step8: Identifiers (new version)', await L.openIdentifiers(page, app, subs.published, newPid, nm('step8-identifiers-new-version')));
        // 9. Type and "Save".
        await L.typeUrn(page, `${L.PREFIX}u44r2b`);
        fact('step9: Save', await L.pressSave(page, nm('step9-save')));
        // 10. "Save" again.
        fact('step10: Save again', await L.pressSave(page, nm('step10-save-again')));
        fact('after step10: stored', (await L.readSubmission(page, app, subs.published)).publications);
        await signOut(page);
    } finally {
        record('w-facts', facts);
        await close();
    }
});
