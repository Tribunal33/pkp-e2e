// Issue report docs/issues/U50-A11-issue-galley-interface-language-refused.md (U50 A11): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"). The kit builds nothing; OJS only (issues are a journal's).
//   steps 1–6  as `rvaca`: Settings › Website › "Setup" › "Languages", untick French "Forms";
//              Issues › "Future Issues" › "Vol. 2 No. 1 (2015)" › "Edit" › "Issue Galleys" ›
//              "Create Issue Galley": a PDF, "PDF", French, "Save"
//   control    the same galley in English saves
//   `neighbour` as the script's argument, on a fresh reset (the fix's reach):
//     N1  the dataset as loaded (French a "UI" and "Forms" language): a galley in French saves
//     N3  French "Forms" unticked: the French galley's "Edit", a new label, "Save" (a galley keeps
//         the language it has)
//     N2  French "Forms" ticked again, "UI" unticked (a forms-only language): what "Language"
//         offers, and a galley in French when it is offered
//
// Reset first:  npm run fleet-prep -- --feature issues-u50a11 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u50a11 PROBE_AGENT=u50a11 node bin/probe.js ojs shared/playwright/checks/issues/issue-galley-interface-language-refused/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u50a11-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u50a11-3_5 PROBE_AGENT=u50a11 node bin/probe.js ojs shared/playwright/checks/issues/issue-galley-interface-language-refused/walk.js
// Facts: .reports/<feature>/u50a11/a11-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn} = require('../../../probe');
const L = require('./lib');
const NEIGHBOUR = process.argv[2] === 'neighbour';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // issues and issue galleys are OJS's alone
    const {record} = require('../../../probe');
    const fact = (k, v) => { record('a11-facts', {[k]: v}, {merge: true}); console.log('[a11]', k, JSON.stringify(v).slice(0, 1500)); };
    const {page} = await launch(app);

    // 1. Sign in as rvaca.
    await signIn(page, 'rvaca');

    if (!NEIGHBOUR) {
        // 2. Settings › Website › "Setup" › "Languages": untick French "Forms".
        fact('step2-untick-french-forms', await L.pressLanguageBox(page, 'fr_CA', 'formLocale'));
        // 3–4. Issues › "Future Issues" › the issue's "Edit" › "Issue Galleys" › "Create Issue Galley".
        const win = await L.openIssueGalleys(page);
        fact('step3-list-before', await L.galleyList(win));
        // 5–6. A PDF, "PDF", French, "Save".
        fact('step6-french', await L.createGalley(page, win, {label: 'PDF', file: L.PDF('u50a11.pdf'), locale: 'fr_CA'}, 'a11-french'));
        // Control: the same in English.
        fact('control-english', await L.createGalley(page, win, {label: 'PDF', file: L.PDF('u50a11.pdf'), locale: 'en'}, 'a11-english'));
        return;
    }

    // N1: the dataset as loaded: a galley in French.
    let win = await L.openIssueGalleys(page);
    fact('n1-french-both', await L.createGalley(page, win, {label: 'PDF', file: L.PDF('u50a11-n1.pdf'), locale: 'fr_CA'}, 'a11-n1'));
    await win.close().catch(() => {});

    // N3: French "Forms" unticked: edit the French galley's label.
    fact('n3-untick-french-forms', await L.pressLanguageBox(page, 'fr_CA', 'formLocale'));
    win = await L.openIssueGalleys(page);
    fact('n3-edit-french-galley', await L.editGalley(page, win, 'PDF', {label: 'PDF u50a11'}, 'a11-n3'));
    await win.close().catch(() => {});

    // N2: French "Forms" ticked again, "UI" unticked: what "Language" offers; French when offered.
    fact('n2-tick-french-forms', await L.pressLanguageBox(page, 'fr_CA', 'formLocale'));
    fact('n2-untick-french-ui', await L.pressLanguageBox(page, 'fr_CA', 'uiLocale'));
    win = await L.openIssueGalleys(page);
    fact('n2-french-forms-only', await L.createGalley(page, win, {label: 'Full issue', file: L.PDF('u50a11-n2.pdf'), locale: 'fr_CA'}, 'a11-n2'));
});
