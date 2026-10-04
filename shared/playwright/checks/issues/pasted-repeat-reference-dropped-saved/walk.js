// Issue report docs/issues/U42-A2-pasted-repeat-reference-dropped-saved.md
// (U42 A2): on a submission's "References" page, a pasted line whose text
// is already in the list (or repeats an earlier line of the same paste) is
// dropped, and the page shows "Saved" as after a full success.
// Takes the report's Steps on PKP's default test dataset (main): dbarnes
// opens OJS submission 8, OMP 3 or OPS 1, adds two references, then pastes
// a repeat with a new line, then a repeat alone.
// MODE=nb runs the neighbour check alone (a paste differing only in
// capitals, and a new line: both added, no warning), for the fix trial.
// Reset the dataset fleet first; the walk changes the dataset.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/pasted-repeat-reference-dropped-saved/walk.js
const {forEachApp, launch, signIn, signOut, record, shot} = require('../../../probe');
const {SUBMISSION, openReferences, addLines} = require('./lib');

const MODE = process.env.MODE || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const sid = SUBMISSION[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: sid};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const refs = await openReferences(page, app, sid, 'a2-step2');
        if (MODE === 'nb') {
            // "Add" with the box empty: refused in place, as before.
            await refs.addButton().click();
            await page.waitForTimeout(800);
            facts.nb0 = {
                fieldError: (await refs.addError().allInnerTexts()).map((t) => t.trim()),
                footer: (await refs.addForm().locator('.pkpFormPage__footer').innerText()).replace(/\s+/g, ' ').trim(),
            };
            console.log(`[fact] a2-nb0: ${JSON.stringify(facts.nb0)}`);
            facts.nb1 = await addLines(page, refs, ['Alpha study 2020'], 'a2-nb1');
            facts.nb2 = await addLines(page, refs, ['ALPHA STUDY 2020', 'Theta paper 2024'], 'a2-nb2');
            await shot(page, 'a2-nb2');
            // A repeat alone, then a new line typed over it: the new line is
            // added and no message stays behind.
            facts.nb3 = await addLines(page, refs, ['Alpha study 2020'], 'a2-nb3');
            facts.nb4 = await addLines(page, refs, ['Iota book 2025'], 'a2-nb4');
            await shot(page, 'a2-nb4');
            facts.verdict = {
                bothAdded: facts.nb2.rows.join('|') === 'Alpha study 2020|ALPHA STUDY 2020|Theta paper 2024',
                boxEmpty: facts.nb2.boxAfter === '',
                saved: facts.nb2.saved,
                noWarning: facts.nb2.messages.length === 0,
                nb3Box: facts.nb3.boxAfter,
                nb3Messages: facts.nb3.messages,
                nb4Added: facts.nb4.rows.includes('Iota book 2025') && facts.nb4.boxAfter === '',
                nb4NoMessage: facts.nb4.messages.length === 0 && facts.nb4.fieldError.length === 0,
            };
        } else {
            facts.step3 = await addLines(page, refs, ['Alpha study 2020', 'Beta trial 2021'], 'a2-step3');
            facts.step4 = await addLines(page, refs, ['Alpha study 2020', 'Gamma report 2022', 'Gamma report 2022'], 'a2-step4');
            await shot(page, 'a2-step4');
            facts.step5 = await addLines(page, refs, ['Beta trial 2021'], 'a2-step5');
            await shot(page, 'a2-step5');
            facts.verdict = {
                // A2: the repeats are dropped and nothing says so.
                step4Rows: facts.step4.rows,
                step4Dropped: facts.step4.rows.join('|') === 'Alpha study 2020|Beta trial 2021|Gamma report 2022',
                step4Silent: facts.step4.saved && facts.step4.boxAfter === '' && facts.step4.messages.length === 0,
                step5Silent: facts.step5.saved && facts.step5.boxAfter === '' && facts.step5.messages.length === 0,
                // Expected: the skipped lines are named (kept in the box with the shipped message).
                step4Told: facts.step4.messages.some((m) => /duplicates/.test(m)),
                step5Told: facts.step5.messages.some((m) => /duplicates/.test(m)),
                step4BoxKeeps: facts.step4.boxAfter,
            };
        }
        console.log(`[fact] ${app.name} verdict: ${JSON.stringify(facts.verdict)}`);
        await signOut(page);
    } finally {
        await close();
    }
    record(`a2-facts-${MODE}`, facts);
    console.log(`[fact] ${app.name} done`);
});
