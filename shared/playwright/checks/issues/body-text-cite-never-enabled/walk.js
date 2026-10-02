// Issue report docs/issues/U48-A16-body-text-cite-never-enabled.md (U48 A16): "Cite" beside each
// reference in the "Body Text" page's "References" section is never enabled. Takes the report's
// Steps on PKP's default test dataset (a dataset fleet), as `dbarnes`, on OJS (the only app with a
// "Body Text" page):
//   1-2  sign in; open submission 5 "Genetic transformation of forest trees"
//   3    "Publication" › "References": add "Alpha, A. (2020). First reference." and
//        "Beta, B. (2021). Second reference."
//   4    "Body Text": the "References" section, each reference's "Cite"
//   5    click into the editor, type "First sentence."
//   6    "Cite" beside "Alpha, A. …": read it, press it, read the editor
//   control: drag "Beta, B. …" into the paragraph
// WALK=keyboard runs alone: steps 1-4, then from the keyboard: Shift+Tab from "Save" into the editor
// (the cursor not moved), "Cite" read; type "First sentence."; Tab on to the first "Cite" (each focus
// recorded, "Cite" read once the editor lost focus); Enter; the editor read.
// WALK=neighbour runs alone (fix in and out): steps 1-4, "Cite" read on arrival before the editor
// is touched, then text typed and "Alpha, A. …" dragged into it (the drag control): exactly one
// citation either way.
//
// Reset first:  npm run fleet-prep -- --feature issues-u48r5 --dataset 5 --apps ojs --reset
// Run (main):   PROBE_FEATURE=issues-u48r5 PROBE_AGENT=u48r5 node bin/probe.js ojs shared/playwright/checks/issues/body-text-cite-never-enabled/walk.js
const {forEachApp, launch, signIn} = require('../../../probe');
const {pages, addReferences, citeStates, editorState, snap} = require('./lib');

const MODE = process.env.WALK || 'walk';
const SUBMISSION = 5;
const REFS = ['Alpha, A. (2020). First reference.', 'Beta, B. (2021). Second reference.'];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        console.log(`[fact] ${app.name} skipped: no "Body Text" page`);
        return;
    }
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const key = (s) => `a16-${s}${run}-${app.name}`;
    const fact = (k, v) => console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);

    const {page, close} = await launch(app);
    const {frame, body} = pages(page, app);
    try {
        // 1-3
        await signIn(page, 'dbarnes');
        await frame.gotoEditorial(SUBMISSION);
        fact('3 references added', await addReferences(page, frame, REFS));
        await snap(page, key('3-references'));
        // 4
        await body.openFromMenu();
        await page.waitForTimeout(1000);
        fact('4 references open', await body.section('references').evaluate((d) => d.open));
        fact('4 hint', (await body.referencesHint().innerText()).trim());
        const arrival = await citeStates(body);
        fact('4 cite on arrival', arrival);
        await snap(page, key('4-body-text'));

        if (MODE === 'keyboard') {
            const focused = () => page.evaluate(() => {
                let el = document.activeElement;
                const path = [];
                while (el) {
                    path.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}`);
                    el = el.shadowRoot ? el.shadowRoot.activeElement : null;
                }
                return {path: path.join(' > '), inEditor: path[0].startsWith('sciflow-editor'), text: (document.activeElement && document.activeElement.innerText || '').slice(0, 40)};
            });
            // K1: Tab into the editor without moving its cursor (from "Save", reached by focus, not pressed)
            await body.saveButton().focus();
            await page.keyboard.press('Shift+Tab');
            await page.waitForTimeout(400);
            fact('K1 focus after Shift+Tab', await focused());
            fact('K1 cite on focus, cursor not moved', await citeStates(body));
            // K2: type
            await page.keyboard.type('First sentence.');
            await page.waitForTimeout(400);
            fact('K2 cite after typing', await citeStates(body));
            // K3: Tab on to Alpha's "Cite"
            const seen = [];
            let onCite = false;
            for (let i = 0; i < 20 && !onCite; i++) {
                await page.keyboard.press('Tab');
                await page.waitForTimeout(150);
                const f = await focused();
                seen.push(f.path);
                if (i === 0) fact('K3 cite after the editor lost focus', await citeStates(body));
                onCite = /reference-cite-btn/.test(f.path);
            }
            fact('K3 tabs to Cite', {count: seen.length, onCite, seen});
            await snap(page, key('K3-on-cite'));
            // K4: Enter
            if (onCite) {
                await page.keyboard.press('Enter');
                await page.waitForTimeout(800);
            }
            fact('K4 after Enter', {...(await editorState(body)), focus: await focused()});
            await snap(page, key('K4-entered'));
            return;
        }

        if (MODE === 'neighbour') {
            const first = body.referenceItems().nth(0);
            await body.typeAtEnd('First sentence.');
            await body.dragReference(first, body.paragraphs().first());
            await page.waitForTimeout(800);
            const after = await editorState(body);
            fact('N drag after typing', after);
            fact('N verdict', {citeGreyOnArrival: arrival.every((r) => r.disabled), oneCitation: after.citations.length === 1});
            await snap(page, key('N-dragged'));
            return;
        }

        // 5
        await body.typeAtEnd('First sentence.');
        await page.waitForTimeout(500);
        fact('5 cite with the cursor in the text', await citeStates(body));
        fact('5 editor', await editorState(body));
        await snap(page, key('5-typed'));
        // 6
        const alpha = body.referenceItems().nth(0);
        const cite = body.citeButton(alpha);
        const disabled = await cite.isDisabled();
        await cite.click({force: true, timeout: 5000}).catch((e) => fact('6 press error', String(e).split('\n')[0]));
        await page.waitForTimeout(800);
        const afterCite = await editorState(body);
        fact('6 Cite pressed', {disabledWhenPressed: disabled, ...afterCite});
        fact('6 highlighted', await body.referenceItems().evaluateAll((li) => li.map((l) => l.classList.contains('reference-highlight'))));
        await snap(page, key('6-cite-pressed'));
        // control
        const beta = body.referenceItems().nth(1);
        await body.dragReference(beta, body.paragraphs().first());
        await page.waitForTimeout(800);
        fact('control drag', await editorState(body));
        await snap(page, key('control-dragged'));
    } finally {
        await close();
    }
});
