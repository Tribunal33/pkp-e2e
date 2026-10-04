// Walk of U58 A8 (issue report docs/issues/U58-A8-component-key-help-misspelled-genre.md): as rvaca,
// Settings › Workflow › "Submission" › "Components" › "Add a Component", read the help under "Key"
// (and, as the control, the window's heading and other helps), then "Cancel". All three apps, on
// PKP's default test dataset (fleet reset first). Nothing is created.
//   PROBE_FEATURE=issues-u58h PROBE_AGENT=u58h node bin/probe.js all shared/playwright/checks/issues/component-key-help-misspelled-genre/walk.js
// 3.5: PKP_E2E_LINE=stable-3_5_0 and the 3.5 fleet's feature in front, PROBE_RUN=r35.
// Neighbour (WALK_MODE=nb, alone): the window's every label and help in English and in French
// (fr_CA), to compare with the fix in (PROBE_RUN=nb-in) and out (PROBE_RUN=nb-out).
// Records each screen and the facts; asserts nothing.
const {forEachApp, launch, signIn, signOut, screen, record, note} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null};
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'rvaca');

        if (MODE === 'nb') {
            for (const locale of [null, 'fr_CA']) {
                const tag = locale || 'en';
                const grid = await H.openComponents(page, app, locale);
                const form = await H.openAddWindow(page, grid);
                facts[tag] = await H.readWindow(page, form);
                record(`nb-${tag}`, await screen(page));
                await H.cancelWindow(page, form);
            }
            note(`u58h ${facts.line} nb ${app.name}: en ${JSON.stringify(facts.en)}; fr ${JSON.stringify(facts.fr_CA)}`);
            record('nb-facts', facts);
            await signOut(page);
            return;
        }

        // 2-3
        const grid = await H.openComponents(page, app);
        facts.list = await H.readList(page, grid);
        record('s3-components', await screen(page));

        // 4-5
        const form = await H.openAddWindow(page, grid);
        facts.window = await H.readWindow(page, form);
        record('s5-add-window', await screen(page));

        // 6
        await H.cancelWindow(page, form);
        facts.closed = (await page.locator('form#genreForm').count()) === 0;

        note(`u58h ${facts.line} ${MODE} ${app.name}: list ${JSON.stringify(facts.list)}; window heading ${JSON.stringify(facts.window.heading)}; Key help ${JSON.stringify(facts.window.keyHelp)}`);
        record('facts', facts);
        await signOut(page);
    } finally {
        await close();
    }
});
