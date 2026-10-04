// Issue report docs/issues/U42-A3-reference-search-keeps-rows-without-word.md
// (U42 A3): "Search references here" keeps rows whose shown text lacks
// the typed word, because it matches everything the reference's record
// holds. Takes the report's Steps on PKP's default test dataset (main):
// dbarnes opens OJS submission 8, OMP 3 or OPS 1, adds five references and
// searches "citations", "http", "false" and "0".
// MODE=nb runs the neighbour check alone (words the rows do show still
// narrow the table: "epsilon", "ZETA piece", "2021"; clearing shows all),
// for the fix trial. MODE=lookup: see lookupMode() below.
// Reset the dataset fleet first; the walk changes the dataset.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/reference-search-keeps-rows-without-word/walk.js
const {forEachApp, launch, signIn, signOut, record, shot, idle} = require('../../../probe');
const {SUBMISSION, openReferences, addLines, search, rowTexts} = require('../pasted-repeat-reference-dropped-saved/lib');

const MODE = process.env.MODE || 'steps';
const LINES = ['Alpha study 2020', 'Beta trial 2021', 'Gamma report 2022', 'Epsilon note', 'Zeta final piece'];

// MODE=lookup (fix trial only): a manager turns metadata lookup on; one
// reference is given shown details (URL, title, an author) and a hidden
// one ("Publisher or Host") through "Edit citation"; searches for a shown
// word, the reference's own text and the hidden word.
async function lookupMode(app, facts) {
    const {tickMetadata} = require('../citation-author-row-kept-after-close/lib');
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'rvaca');
            facts.lookupOn = await tickMetadata(page, app, ['lookup']);
            console.log(`[fact] lookup on: ${JSON.stringify(facts.lookupOn)}`);
            await signOut(page);
        } finally {
            await close();
        }
    }
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const refs = await openReferences(page, app, SUBMISSION[app.name], 'a3-lookup-open');
        facts.added = await addLines(page, refs, ['Delta paper 2023', 'Epsilon note'], 'a3-lookup-add');
        const panel = await refs.edit('Delta paper 2023');
        await panel.field('URL').fill('https://example.org/u42rdelta');
        await panel.field('Title').fill('Harbour tides u42rtitle');
        await panel.field('Publisher or Host').fill('U42rhost Press');
        await panel.addAuthor({givenName: 'Ada', familyName: 'U42rfamily'});
        await panel.save();
        await idle(page);
        facts.rowsAfterEdit = await rowTexts(refs);
        console.log(`[fact] rows after edit: ${JSON.stringify(facts.rowsAfterEdit)}`);
        await shot(page, 'a3-lookup-after-edit');
        facts.searches = {};
        for (const [i, w] of ['u42rtitle', 'u42rfamily', 'delta', 'u42rhost'].entries()) {
            facts.searches[w] = await search(page, refs, w, `a3-lookup-search${i + 1}`);
        }
        const hit = (rows) => rows.some((r) => /u42rtitle/i.test(r));
        facts.verdict = {
            titleFound: hit(facts.searches.u42rtitle),
            authorFound: hit(facts.searches.u42rfamily),
            rawTextFound: hit(facts.searches.delta),
            hiddenNotFound: !hit(facts.searches.u42rhost),
            epsilonNotInShownSearches: !facts.searches.u42rtitle.some((r) => /Epsilon/.test(r)),
        };
        await signOut(page);
    } finally {
        await close();
    }
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const sid = SUBMISSION[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: sid};
    if (MODE === 'lookup') {
        await lookupMode(app, facts);
        console.log(`[fact] ${app.name} verdict: ${JSON.stringify(facts.verdict)}`);
        record(`a3-facts-${MODE}`, facts);
        return;
    }
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const refs = await openReferences(page, app, sid, 'a3-step2');
        facts.step3 = await addLines(page, refs, LINES, 'a3-step3');
        const words = MODE === 'nb' ? ['epsilon', 'ZETA piece', '2021'] : ['citations', 'http', 'false', '0'];
        facts.searches = {};
        for (const [i, w] of words.entries()) {
            facts.searches[w] = await search(page, refs, w, `a3-${MODE}-search${i + 1}`);
        }
        await shot(page, `a3-${MODE}-last-search`);
        await refs.clearSearchButton().click().catch(() => {});
        await page.waitForTimeout(500);
        facts.cleared = await rowTexts(refs);
        const s = facts.searches;
        facts.verdict = MODE === 'nb'
            ? {
                epsilon: (s.epsilon || []).join('|') === 'Epsilon note',
                zeta: (s['ZETA piece'] || []).join('|') === 'Zeta final piece',
                y2021: (s['2021'] || []).join('|') === 'Beta trial 2021',
                clearedAll: facts.cleared.length === 5,
            }
            : {
                citationsRows: (s.citations || []).length,
                httpRows: (s.http || []).length,
                falseRows: (s.false || []).length,
                zeroRows: s['0'],
                // Expected: no row for the first three, the three dated rows for "0".
                asExpected: ['citations', 'http', 'false'].every((w) => !(s[w] || []).some((r) => LINES.includes(r)))
                    && (s['0'] || []).filter((r) => LINES.includes(r)).join('|') === LINES.slice(0, 3).join('|'),
            };
        console.log(`[fact] ${app.name} verdict: ${JSON.stringify(facts.verdict)}`);
        await signOut(page);
    } finally {
        await close();
    }
    record(`a3-facts-${MODE}`, facts);
    console.log(`[fact] ${app.name} done`);
});
