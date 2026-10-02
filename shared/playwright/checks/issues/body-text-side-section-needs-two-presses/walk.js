// Issue report docs/issues/U48-A17-body-text-side-section-needs-two-presses.md (U48 A17): on the
// "Body Text" page, opening a closed side section while another is open closes both. Takes the
// report's Steps on PKP's default test dataset (a dataset fleet), as `dbarnes`, on OJS (the only
// app with a "Body Text" page):
//   1-3  sign in; open submission 5 "Genetic transformation of forest trees"; "Body Text"
//   4    press "Document Outline" ("References" open)
//   5    press "Document Outline" again
//   6-7  reload the browser page ("References" open again); click into the editor, type
//        "First sentence.", double-click "First"
// WALK=neighbour runs alone (fix in and out): steps 1-3, then "References" (the open section)
// pressed: all three closed; pressed again: "References" open, either way.
//
// Reset first:  npm run fleet-prep -- --feature issues-u48r5 --dataset 5 --apps ojs --reset
// Run (main):   PROBE_FEATURE=issues-u48r5 PROBE_AGENT=u48r5 node bin/probe.js ojs shared/playwright/checks/issues/body-text-side-section-needs-two-presses/walk.js
const {forEachApp, launch, signIn} = require('../../../probe');
const {pages, sectionStates, snap} = require('../body-text-cite-never-enabled/lib');

const MODE = process.env.WALK || 'walk';
const SUBMISSION = 5;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        console.log(`[fact] ${app.name} skipped: no "Body Text" page`);
        return;
    }
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const key = (s) => `a17-${s}${run}-${app.name}`;
    const fact = (k, v) => console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);

    const {page, close} = await launch(app);
    const {frame, body} = pages(page, app);
    try {
        // 1-3
        await signIn(page, 'dbarnes');
        await frame.gotoEditorial(SUBMISSION);
        await body.openFromMenu();
        fact('3 on arrival', await sectionStates(page, body));
        await snap(page, key('3-arrival'));

        if (MODE === 'neighbour') {
            await body.sectionHeading('references').click();
            const closed = await sectionStates(page, body);
            fact('N References pressed', closed);
            await body.sectionHeading('references').click();
            const reopened = await sectionStates(page, body);
            fact('N References pressed again', reopened);
            fact('N verdict', {
                closesOwn: Object.values(closed).every((o) => !o),
                reopens: reopened.references && !reopened.outline && !reopened['selected-element'],
            });
            await snap(page, key('N-references'));
            return;
        }

        // 4
        await body.sectionHeading('outline').click();
        fact('4 Document Outline pressed', await sectionStates(page, body));
        await snap(page, key('4-outline-pressed'));
        // 5
        await body.sectionHeading('outline').click();
        fact('5 Document Outline pressed again', await sectionStates(page, body));
        await snap(page, key('5-outline-again'));
        // 6-7
        await body.reload();
        fact('6 reloaded', await sectionStates(page, body));
        await body.typeAtEnd('First sentence.');
        const before = await sectionStates(page, body);
        const p = body.paragraphs().first();
        const box = await p.boundingBox();
        await page.mouse.dblclick(box.x + 8, box.y + box.height / 2);
        const selected = await page.evaluate(() => {
            const host = document.querySelector('sciflow-editor');
            const sel = host && host.shadowRoot && host.shadowRoot.getSelection ? host.shadowRoot.getSelection() : window.getSelection();
            return sel ? String(sel) : null;
        });
        fact('7 word selected with the mouse', {before, selected, after: await sectionStates(page, body)});
        await snap(page, key('7-selection'));
    } finally {
        await close();
    }
});
