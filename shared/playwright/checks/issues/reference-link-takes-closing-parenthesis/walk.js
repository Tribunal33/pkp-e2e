// Issue report docs/issues/U13-A10-reference-link-takes-closing-parenthesis.md
// (U13 A10): under "References" on an article's, preprint's or book's page,
// an address written inside parentheses becomes a link that takes the
// closing ")". Takes the report's Steps on PKP's default test dataset:
//   OJS: dbarnes adds five references to submission 1's unpublished
//        version 1.1 and publishes it.
//   OPS, OMP: dbarnes creates a new version of submission 3 (14), adds the
//        references and posts (publishes) it.
//   Then, signed out: the landing page's "References".
// Neighbour checks (fix in and out): a trailing "." stays outside its link,
// and an address with parentheses of its own keeps them in the link.
// Reset the dataset fleet first; the walk changes the dataset.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/reference-link-takes-closing-parenthesis/walk.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const {addReferences, readReferences} = require('./lib');

const SUBMISSION = {ojs: 1, ops: 3, omp: 14};
const LANDING = {ojs: 'article/view/mwandenga', ops: 'preprint/view/3', omp: 'catalog/book/14'};
const PAREN = 'ftp://files.example.org/ridge/data.csv';
const DOT = 'https://example.org/harbour';
const OWN = 'https://en.wikipedia.org/wiki/Estuary_(landform)';
const DOI = 'https://doi.org/10.1234/u13ir23';
const SEMI = 'https://example.org/marshes';
const LINES = [
    `Ridge, A. (2021). Tide tables u13ir23 (${PAREN})`,
    `Ridge, A. (2022). Harbour notes u13ir23. Available at ${DOT}.`,
    `Ridge, A. (2023). Estuaries u13ir23. ${OWN}`,
    `Ridge, A. (2024). Deltas u13ir23. Shore Press. (${DOI}).`,
    `Ridge, A. (2025). Marshes u13ir23 (${SEMI}); second edition.`,
];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const ctx = app.contextPath;
    const sid = SUBMISSION[app.name];
    const facts = {app: app.name, line: app.line || 'main', submission: sid, typed: LINES};

    // Steps 1-4: dbarnes adds the references to an unpublished version and publishes it.
    {
        const {page, close} = await launch(app);
        try {
            const {workflowFrame, createNewVersion, publishShownVersion} = require('../older-version-tab-current-title/lib');
            await signIn(page, 'dbarnes');
            const frame = workflowFrame(page, app);
            await frame.gotoEditorial(sid);
            await idle(page);
            record('step1-workflow', await screen(page));
            if (app.name !== 'ojs') {
                facts.newVersion = await createNewVersion(page, app);
                console.log(`[fact] ${app.name} new version: ${JSON.stringify(facts.newVersion)}`);
            }
            facts.references = await addReferences(page, app, frame, LINES);
            console.log(`[fact] ${app.name} references: ${JSON.stringify(facts.references)}`);
            await shot(page, 'step3-references');
            if (app.name === 'ojs') {
                const {publishLatestVersion} = require('../older-version-pdf-reader-empty/lib');
                facts.publish = await publishLatestVersion(page, app, sid);
            } else {
                facts.publish = await publishShownVersion(page);
            }
            console.log(`[fact] ${app.name} publish: ${JSON.stringify(facts.publish)}`);
            await signOut(page);
        } finally {
            await close();
        }
    }

    // Steps 5-6, signed out.
    const {page, close} = await launch(app);
    try {
        await page.goto(app.url(`/index.php/${ctx}/${LANDING[app.name]}`));
        await idle(page);
        record('step5-landing', await screen(page));
        await shot(page, 'step5-landing');
        facts.landing = await readReferences(page);
        console.log(`[fact] ${app.name} landing: ${JSON.stringify(facts.landing)}`);
        const [p1, p2, p3, p4, p5] = facts.landing.paragraphs;
        const link = (p) => (p && p.links[0]) || {};
        facts.verdict = {
            // A10: the link takes the ")".
            parenLink: link(p1),
            parenTaken: link(p1).href === `${PAREN})`,
            parenLeftOut: link(p1).href === PAREN && link(p1).text === PAREN && /\)\s*$/.test(p1.text),
            // The same for the usual "(https://doi.org/…)." form, and for ");".
            doiLink: link(p4).href,
            doiLeftOut: link(p4).href === DOI && link(p4).text === DOI && /\)\.\s*$/.test(p4.text),
            semiLink: link(p5).href,
            semiLeftOut: link(p5).href === SEMI && link(p5).text === SEMI,
            // Neighbours.
            dotLeftOut: link(p2).href === DOT && link(p2).text === DOT && /harbour\.\s*$/.test(p2.text),
            ownParenthesesKept: link(p3).href === OWN && link(p3).text === OWN,
        };
        console.log(`[fact] ${app.name} verdict: ${JSON.stringify(facts.verdict)}`);
    } finally {
        await close();
    }
    record('facts', facts);
    console.log(`[fact] ${app.name} done`);
});
