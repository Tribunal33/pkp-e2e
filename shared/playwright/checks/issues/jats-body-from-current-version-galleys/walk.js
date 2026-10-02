// Issue report docs/issues/U48-A6-jats-body-from-current-version-galleys.md
// (U48 A6): each version's "JATS XML" takes its <body> from the galleys of
// the article's current version, not the version whose page is open.
//
// Takes the report's Steps on PKP's default test dataset (OJS only: the
// other apps have no "JATS XML" page): dbarnes adds an "HTML" galley
// (u48r8-body.html, in ../jats-body-html-markup-as-text/) to submission 1
// "Signalling Theory Dividends"'s unpublished newest version, opens that
// version's "JATS XML", publishes the version, and opens the first
// version's "JATS XML", then the newest one's again (the control).
//
// WALK=steps (default) takes the steps. WALK=nb is the neighbour check for a
// fix trial: a single-version article (submission 5, in Production) with an
// HTML galley, whose own (current) version must keep its body, fix in or out.
// Reset the dataset fleet first; the walk changes the dataset.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs \
//     shared/playwright/checks/issues/jats-body-from-current-version-galleys/walk.js
'use strict';
const {forEachApp, launch, signIn, screen, shot, record, note} = require('../../../probe');
const {HTML_FILE, openJats} = require('../jats-body-html-markup-as-text/lib');
const {addGalleyToLatestVersion} = require('../lens-formulas-not-typeset/lib');
const {publishLatestVersion} = require('../older-version-pdf-reader-empty/lib');

const MODE = process.env.WALK || 'steps';
const SUBMISSION = MODE === 'nb' ? 5 : 1;
const KEY = `a6-${MODE}`;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        console.log(`[fact] ${app.name}: no "JATS XML" page; skipped`);
        return;
    }
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const facts = {mode: MODE, app: app.name, line: app.line || 'main', submission: SUBMISSION};
    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    const read = async (name, which) => {
        const j = await openJats(page, app, frame, which);
        record(`${KEY}-${name}`, {...(await screen(page)), jats: j});
        await shot(page, `${KEY}-${name}`).catch(() => {});
        console.log(`[fact] ${name}: ${JSON.stringify(j)}`);
        return j;
    };
    try {
        // Steps 1-3: sign in, open the submission, add the galley to the newest version.
        await signIn(page, 'dbarnes');
        facts.galleys = await addGalleyToLatestVersion(page, app, SUBMISSION, {
            label: 'HTML', component: 'Article Text', file: HTML_FILE, name: 'u48r8-body.html',
        });
        console.log(`[fact] galleys: ${JSON.stringify(facts.galleys)}`);
        // Step 4: the same version's "JATS XML".
        facts.step4 = await read('step4-newest-jats', 'latest');
        if (MODE === 'steps') {
            // Step 5: publish the newest version.
            const pub = await publishLatestVersion(page, app, SUBMISSION);
            facts.step5 = {button: pub.button, publish: pub.publish, versionNodes: pub.versionNodes};
            console.log(`[fact] step5: ${JSON.stringify(facts.step5)}`);
            // Step 6: the first version's "JATS XML".
            await frame.gotoEditorial(SUBMISSION);
            facts.step6 = await read('step6-first-jats', 'first');
            // Control: the newest version's "JATS XML" again.
            await frame.gotoEditorial(SUBMISSION);
            facts.control = await read('control-newest-jats', 'latest');
        }
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
