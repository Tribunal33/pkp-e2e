// U50 A16, joined to docs/issues/U09-A19-static-page-content-change-lost-on-close.md: the Steps'
// "An issue's description" group, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"). The kit builds nothing; OJS only (issues are a
// journal's).
//   1–4   `dbarnes`: Issues › "Future Issues" › "Vol. 2 No. 1 (2015)" › "Edit" › "Issue Data"
//   5–7   text typed in "Description" only; "Table of Contents" (a question is answered "Cancel",
//         then the tab pressed again with "OK"); "Issue Data" again: what "Description" holds
//   8–10  the same text typed again; the window's "Close" (the same answers); "Edit" › "Issue Data"
//         again: what "Description" holds
//   c     the control: "URL Path" typed instead, then "Table of Contents" (answered "Cancel")
//   `neighbour` as the script's argument, on a fresh reset (the fix's reach):
//     n1  "Issue Data" untouched, then "Table of Contents": no question
//     n2  "Description" typed, "Save": no question, the text saved
//     n3  "Issue Data" reopened with the saved description, untouched, then "Table of Contents"
//         and the window's "Close": no question
//
// Reset first:  npm run fleet-prep -- --feature issues-u50a16 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u50a16 PROBE_AGENT=u50a16 node bin/probe.js ojs shared/playwright/checks/issues/issue-description-tab-switch-no-question/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u50a16-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u50a16-3_5 PROBE_AGENT=u50a16 node bin/probe.js ojs shared/playwright/checks/issues/issue-description-tab-switch-no-question/walk.js
// Facts: .reports/<feature>/u50a16/a16-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');
const NEIGHBOUR = process.argv[2] === 'neighbour';
const TEXT = 'u50a16 An issue about tides.';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // issues are OJS's alone
    const fact = (k, v) => { record(NEIGHBOUR ? 'a16-neighbour' : 'a16-facts', {[k]: v}, {merge: true}); console.log('[a16]', k, JSON.stringify(v).slice(0, 800)); };
    const {page} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));

    await signIn(page, 'dbarnes');                                                         // 1

    if (!NEIGHBOUR) {
        let win = await L.openIssueWindow(page);                                            // 2–3
        let form = await L.openIssueData(win);                                              // 4
        fact('4-description-before', await form.descriptionText());
        await L.typeDescription(page, form, TEXT);                                                   // 5
        fact('5-typed', await form.descriptionText());
        await L.snap(page, 'a16-5-typed');
        let r = await L.pressTab(page, win, 'Table of Contents', {answer: 'cancel'});       // 6
        fact('6-toc', r);
        await L.snap(page, 'a16-6-toc');
        if (r.asked) {
            fact('6-kept', await form.descriptionText());
            fact('6-toc-ok', await L.pressTab(page, win, 'Table of Contents'));
        }
        form = await L.openIssueData(win);                                                  // 7
        fact('7-description', await form.descriptionText());

        await L.typeDescription(page, form, TEXT);                                                   // 8
        fact('8-typed', await form.descriptionText());
        let c = await L.closeIssueWindow(page, win, {answer: 'cancel'});                    // 9
        fact('9-close', c);
        await L.snap(page, 'a16-9-close');
        if (!c.closed) {
            fact('9-kept', await form.descriptionText());
            fact('9-close-ok', await L.closeIssueWindow(page, win));
        }
        win = await L.openIssueWindow(page);                                                // 10
        form = await L.openIssueData(win);
        fact('10-description', await form.descriptionText());

        await form.urlPathBox().fill('u50a16');                                             // control
        r = await L.pressTab(page, win, 'Table of Contents', {answer: 'cancel'});
        fact('c-urlpath-toc', r);
        if (r.asked) fact('c-kept', await form.urlPathBox().inputValue());
        await L.snap(page, 'a16-c');
        fact('scriptErrors', errs);
        return;
    }

    let win = await L.openIssueWindow(page);
    let form = await L.openIssueData(win);
    fact('n1-toc-untouched', await L.pressTab(page, win, 'Table of Contents', {answer: 'cancel'}));
    form = await L.openIssueData(win);
    await L.typeDescription(page, form, TEXT);
    let asked = null;
    const h = async (d) => { asked = d.message(); await d.accept(); };
    page.on('dialog', h);
    await form.saveButton().click();
    await win.dialog.waitFor({state: 'hidden', timeout: L.T}).catch(() => {});
    await L.sleep(500);
    page.off('dialog', h);
    fact('n2-save', {asked, closed: !(await win.dialog.isVisible().catch(() => false))});
    win = await L.openIssueWindow(page);
    form = await L.openIssueData(win);
    fact('n3-description-saved', await form.descriptionText());
    fact('n3-toc-untouched', await L.pressTab(page, win, 'Table of Contents', {answer: 'cancel'}));
    form = await L.openIssueData(win);
    fact('n3-close-untouched', await L.closeIssueWindow(page, win, {answer: 'cancel'}));
    await L.snap(page, 'a16-n3');
    fact('scriptErrors', errs);
});
