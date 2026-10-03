// Issue report docs/issues/U15-A11-galley-text-never-searched.md (U15 A11): a word that
// appears only in the text of an article's galley (a book's publication format on a
// press) finds nothing on the Search page, while a word of its title finds it.
//
// Takes the report's Steps on PKP's default test dataset: dbarnes adds an "HTML" galley
// (u15a-galley.html, beside this script, holding the word "zanthorpe") to a submission in
// Production (OJS 5, OMP 4 as an "HTML" publication format, OPS 1) and publishes it; a
// visitor searches "zanthorpe" and the title word.
//
// WALK=steps (default) takes the steps. WALK=nb is the neighbour check for a fix trial:
// first the same kind of galley with the word "merriwake" (u15a-galley-other.html) goes on
// another submission that stays unpublished (OJS 6, OMP 7, OPS 4), then the steps; the
// published item must be listed for "zanthorpe" alone, and "merriwake" must stay
// "No Results", fix in or out.
// Reset the dataset fleet first; the walk changes the dataset.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/galley-text-never-searched/walk.js
'use strict';
const {forEachApp, launch, signIn, signOut, note, record, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK || 'steps';
const ISSUE = 'Vol. 1 No. 2 (2014)';
const KEY = `a11-${MODE}`;

async function step(facts, name, fn) {
    try {
        facts[name] = await fn();
        console.log(`[fact] ${name}: ${JSON.stringify(facts[name]).slice(0, 600)}`);
    } catch (e) {
        facts[`${name}Error`] = String(e.stack || e.message).slice(0, 800);
        console.log(`[fact] ERROR ${name}: ${facts[`${name}Error`]}`);
        note(`u15a ${KEY} ${name}: ${String(e.message).split('\n')[0]}`);
        throw e;
    }
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const I = L.ITEMS[app.name];
    const facts = {mode: MODE, app: app.name, line: app.line || 'main', items: I};
    const log = serverLog(app, {match: /error|exception|fatal|warning|undefined|\[5\d\d\]/i});
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'nb') {
            await step(facts, 'otherGalley', () => L.addHtmlRepresentation(page, app, I.other, L.FILES.other));
        }
        // Steps 1-3: dbarnes adds the "HTML" galley (format) to the item.
        await step(facts, 'galley', () => L.addHtmlRepresentation(page, app, I.publish, L.FILES.steps));
        // Step 4: publish it.
        const {publishItem} = require('../author-tags-given-name-alone-other-language/lib');
        await step(facts, 'publish', () => publishItem(page, app, I.publish, ISSUE));
        await L.snap(page, `${KEY}-step4-published`);
        await signOut(page);
        await step(facts, 'queue', () => L.waitForQueue(app, page));
        // Steps 5-6: a visitor searches the galley's word, then the title word.
        await step(facts, 'searchGalleyWord', () => L.searchAsVisitor(page, app, 'zanthorpe', `${KEY}-step5-zanthorpe`));
        await step(facts, 'searchTitleWord', () => L.searchAsVisitor(page, app, I.control, `${KEY}-step6-control`));
        if (MODE === 'nb') {
            await step(facts, 'searchOtherWord', () => L.searchAsVisitor(page, app, 'merriwake', `${KEY}-nb-merriwake`));
            facts.indexOther = await L.indexRows(app, I.other);
            facts.representationsOther = await L.representationRows(app, I.other);
        }
        facts.index = await L.indexRows(app, I.publish);
        facts.representations = await L.representationRows(app, I.publish);
        console.log(`[fact] index: ${JSON.stringify(facts.index)}; representations: ${JSON.stringify(facts.representations)}`);
    } catch (e) {
        facts.error = String(e.stack || e.message).slice(0, 800);
    } finally {
        facts.serverLog = log.since(from).slice(0, 40);
        record(`${KEY}-facts`, facts);
        await close();
    }
});
