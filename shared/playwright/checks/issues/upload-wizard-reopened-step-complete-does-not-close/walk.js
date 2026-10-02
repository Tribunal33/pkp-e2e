// Issue report docs/issues/U36-A15-upload-wizard-reopened-step-complete-does-not-close.md (U36 A15):
// in the upload wizard, "2. Review Details" pressed on "3. Confirm" opens step 2 again with the
// button still reading "Complete"; pressing it saves and shows "3. Confirm" again instead of
// closing. Walked through the screens on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), context `publicknowledge`. The kit builds nothing.
//
// MODE=walk (default), OJS submission 4 and OMP submission 3, "Submission Files":
//   1. sign in as dbarnes
//   2. open the submission's workflow; read "Submission Files"
//   3. "Upload": the window "Upload Submission File" on "1. Upload File"
//   4. the component "Article Text" (OMP "Book Manuscript")
//   5. "Upload File": u36m-file.pdf
//   6. "Continue": "2. Review Details"
//   7. "Continue": "3. Confirm", "File Added"
//   8. the step name "2. Review Details": step 2 again; read the button
//   9. the button under the step, whatever it reads
//  10. the button again, while the window is open (at most twice more)
//   then the list, read again.
//   OPS (no file lists; a new galley's file): preprint 1, "Galleys", "Add galley" "u36m PDF",
//   "Save", then steps 4 to 10 with "Preprint Text".
// MODE=nb, the neighbour alone (with the fix in and out), three passes through the wizard:
//   a. the straight path: steps 3 to 7, then "Complete" once must close the window;
//   b. steps 3 to 8, then the step name "3. Confirm" pressed without the button: the button must
//      read "Complete" there and one press must close the window;
//   c. (OJS, OMP; a galley's step 3 has no "Add Another File") steps 3 to 7, "Add Another File":
//      step 1 again, the button reading "Continue"; then "Cancel".
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=issues-u36m PROBE_AGENT=u36m node bin/probe.js all shared/playwright/checks/issues/upload-wizard-reopened-step-complete-does-not-close/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature <feature>-3_5 --dataset <n> --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u36m-3_5 PROBE_AGENT=u36m node bin/probe.js all shared/playwright/checks/issues/upload-wizard-reopened-step-complete-does-not-close/walk.js
// Facts: .reports/<feature>/u36m/a15-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const C = require('../change-file-keeps-first-upload/lib');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const SUBMISSION = {ojs: 4, omp: 3, ops: 1};
const COMPONENT = {ojs: 'Article Text', omp: 'Book Manuscript', ops: 'Preprint Text'};

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log('[a15]', app.name, MODE, k, JSON.stringify(v).slice(0, 1200)); };
    const step = async (k, fn) => {
        try { return await fn(); } catch (e) {
            fact(`${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            return null;
        }
    };
    const id = SUBMISSION[app.name];
    const file = L.oneFile();
    const {page} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(`${d.type()}: ${d.message()}`); d.accept().catch(() => {}); });
    const requests = L.watchSteps(page);

    await signIn(page, 'dbarnes');                                                                  // 1
    if (app.name === 'ops') {
        await C.openWorkflow(page, app, id, app.line === 'stable-3_5_0' ? 'publication_galleys' : 'publication_1_galleys');
    } else {
        await C.openWorkflow(page, app, id);                                                        // 2
        fact('list-before', await step('list-before', () => C.listRows(page)));
    }

    // Step 3 (OPS: a new galley, whose wizard opens by itself); `n` numbers the galley of a pass.
    const openWizard = async (k, n) => step(`${k}-open`, async () => {
        if (app.name === 'ops') {
            await L.addGalley(page, `u36m PDF${n ? ` ${n}` : ''}`);
        } else {
            await C.uploadButton(page).click();
            await C.uploadBox(page).waitFor({state: 'attached', timeout: L.T});
            await idle(page);
        }
    });
    // Steps 4 to 7: the component, the file, "Continue" twice. Records the button at each step.
    const toConfirm = async (k) => {
        await step(`${k}-component`, () => C.wizard(page).locator('select[id^="genreId"]').selectOption({label: COMPONENT[app.name]}));  // 4
        fact(`${k}-uploaded`, await step(`${k}-upload`, () => C.pick(page, file)));                 // 5
        fact(`${k}-step1`, await step(`${k}-step1`, () => L.state(page)));
        await step(`${k}-continue-1`, async () => { await L.press(page); await L.onStep(page, '2. Review Details'); });   // 6
        fact(`${k}-step2`, await step(`${k}-step2`, () => L.state(page)));
        await step(`${k}-continue-2`, async () => { await L.press(page); await L.onStep(page, '3. Confirm'); });          // 7
        fact(`${k}-step3`, await step(`${k}-step3`, () => L.state(page)));
    };
    // Step 8: the step name "2. Review Details" on "3. Confirm".
    const backToTwo = async (k) => {
        await step(`${k}-back`, async () => { await L.stepName(page, '2. Review Details').locator('a').click(); await L.onStep(page, '2. Review Details'); });
        fact(`${k}-step2-again`, await step(`${k}-step2-again`, () => L.state(page)));
    };
    const after = async (k) => {
        if (app.name === 'ops') fact(`${k}-galleys`, await step(`${k}-galleys`, () => L.galleyRows(page)));
        else fact(`${k}-list`, await step(`${k}-list`, () => C.listRows(page)));
    };

    if (MODE === 'walk') {
        await openWizard('walk');                                                                   // 3
        await toConfirm('walk');
        record('a15-walk-step3', await screen(page));
        await backToTwo('walk');                                                                    // 8
        record('a15-walk-step2-again', await screen(page));
        await shot(page, 'a15-walk-step2-again');
        const presses = [];
        for (let i = 0; i < 3; i++) {                                                               // 9, 10
            const before = await L.state(page);
            if (!before.open) break;
            const label = await step(`walk-press-${i + 1}`, () => L.pressAndSettle(page, '3. Confirm'));
            const now = await L.state(page);
            presses.push({pressed: label, from: before.current, then: now.open ? `open on "${now.current}", button "${now.button}": ${now.text}` : 'window closed'});
            record(`a15-walk-after-press-${i + 1}`, await screen(page));
            if (i === 0) await shot(page, 'a15-walk-after-press-1');
        }
        fact('walk-presses', presses);
        await after('walk');
        fact('verdict', {
            buttonOnReopenedStep2: (facts['walk-step2-again'] || {}).button,
            pressesToClose: presses.length,
            closed: presses.length ? presses[presses.length - 1].then === 'window closed' : false,
        });
    } else {
        // a. the straight path
        await openWizard('a', 'a');
        await toConfirm('a');
        await step('a-complete', () => L.pressAndSettle(page));
        fact('a-after-complete', await L.state(page));
        await after('a');

        // b. back to step 2, forward by the step name, "Complete" once
        await openWizard('b', 'b');
        await toConfirm('b');
        await backToTwo('b');
        await step('b-forward', async () => { await L.stepName(page, '3. Confirm').locator('a').click(); await L.onStep(page, '3. Confirm'); });
        fact('b-step3-again', await step('b-step3-again', () => L.state(page)));
        await step('b-complete', () => L.pressAndSettle(page));
        fact('b-after-complete', await L.state(page));
        await after('b');

        // c. "Add Another File" restarts at step 1
        if (app.name !== 'ops') {
            await openWizard('c');
            await toConfirm('c');
            await step('c-add-another', async () => { await L.win(page).locator('#newFile').click(); await L.onStep(page, '1. Upload File'); });
            fact('c-step1-again', await step('c-step1-again', () => L.state(page)));
            await step('c-cancel', async () => {
                await L.win(page).locator('#cancelButton').click();
                await L.win(page).waitFor({state: 'hidden', timeout: L.T}).catch(() => {});
                await idle(page);
                await L.sleep(600);
            });
            fact('c-after-cancel', await L.state(page));
            await after('c');
        }
        const lab = (k) => (facts[k] || {}).button;
        fact('verdict', {
            a: {labels: [lab('a-step1'), lab('a-step2'), lab('a-step3')], closedByOneComplete: facts['a-after-complete'].open === false},
            b: {step3AgainButton: lab('b-step3-again'), closedByOneComplete: facts['b-after-complete'].open === false},
            c: app.name === 'ops' ? 'no "Add Another File" on a galley' : {step1AgainButton: lab('c-step1-again'), current: (facts['c-step1-again'] || {}).current},
        });
    }
    fact('requests', requests);
    fact('dialogs', dialogs);
    record(`a15-facts${MODE === 'walk' ? '' : `-${MODE}`}`, facts);
});
