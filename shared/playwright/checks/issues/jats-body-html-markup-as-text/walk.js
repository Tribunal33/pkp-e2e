// Issue report docs/issues/U48-A7-jats-body-html-markup-as-text.md (U48 A7):
// with an HTML galley, the "JATS XML" page's generated XML has a <body> of
// one paragraph that shows the galley's <p> tags as text, runs its heading
// into the text and doubles its "&" escaping.
//
// Takes the report's Steps on PKP's default test dataset (OJS only: the
// other apps have no "JATS XML" page): dbarnes adds an "HTML" galley
// (u48r8-body.html, beside this script) to submission 5 "Genetic
// transformation of forest trees" and opens its "JATS XML".
//
// WALK=steps (default) takes the steps. WALK=nb is the neighbour check for a
// fix trial: a plain-text galley ("TXT", u48r8-body.txt beside this script)
// on submission 9 "Hansen & Pinto: Reason Reclaimed", whose body must stay
// one escaped paragraph, fix in or out.
// Reset the dataset fleet first; the walk changes the dataset.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs \
//     shared/playwright/checks/issues/jats-body-html-markup-as-text/walk.js
'use strict';
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, note} = require('../../../probe');
const {sleep, HTML_FILE, openJats} = require('./lib');
const {addGalleyToLatestVersion} = require('../lens-formulas-not-typeset/lib');

const MODE = process.env.WALK || 'steps';
const RUN = {
    steps: {submission: 5, label: 'HTML', file: HTML_FILE, name: 'u48r8-body.html'},
    nb: {submission: 9, label: 'TXT', file: path.join(__dirname, 'u48r8-body.txt'), name: 'u48r8-body.txt'},
}[MODE];
const KEY = `a7-${MODE}`;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        console.log(`[fact] ${app.name}: no "JATS XML" page; skipped`);
        return;
    }
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const facts = {mode: MODE, app: app.name, line: app.line || 'main', submission: RUN.submission};
    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    try {
        // Steps 1-3: sign in, open the submission, add the galley.
        await signIn(page, 'dbarnes');
        facts.galleys = await addGalleyToLatestVersion(page, app, RUN.submission, {
            label: RUN.label, component: 'Article Text', file: RUN.file, name: RUN.name,
        });
        console.log(`[fact] galleys: ${JSON.stringify(facts.galleys)}`);
        // Step 4: "JATS XML".
        const jats = await openJats(page, app, frame, 'latest');
        facts.jats = jats;
        const s = await screen(page);
        record(`${KEY}-step4-jats`, s);
        await shot(page, `${KEY}-step4-jats`).catch(() => {});
        console.log(`[fact] jats: ${JSON.stringify(jats)}`);
    } catch (e) {
        facts.error = String(e.stack || e.message).slice(0, 800);
        note(`u48r8 ${app.name} ${KEY}: ${facts.error.split('\n')[0]}`);
        record(`${KEY}-error`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `${KEY}-error`).catch(() => {});
        console.log(`[fact] ERROR ${facts.error}`);
    } finally {
        record(`${KEY}-facts`, facts);
        await close();
    }
});
