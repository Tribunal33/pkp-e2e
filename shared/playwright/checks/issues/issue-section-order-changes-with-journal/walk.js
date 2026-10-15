// Walk of docs/issues/U50-A21-issue-section-order-changes-with-journal.md (U50 A21) on PKP's
// default test dataset, OJS: a third section "Essays hkk20" created, submissions 5 and 6
// published into "Vol. 1 No. 2 (2014)" in "Reviews" and "Essays hkk20", the issue's sections
// ordered Articles, Essays hkk20, Reviews on its "Table of Contents" tab, then the journal's
// sections ordered Reviews, Essays hkk20, Articles on Settings › Journal › "Sections", and the
// tab and the issue's page read again.
//
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js ojs \
//     shared/playwright/checks/issues/issue-section-order-changes-with-journal/walk.js
//
// MODE=nb runs the neighbour check alone (for a fix trial): the same setup, then "Order" and
// "Done" on the tab with nothing moved, the journal's sections reordered the same way; an
// issue whose order was never changed must follow the journal's new order.
// Records are named `a21walk-*` (steps) and `a21nb-*` (neighbour); PROBE_RUN keeps runs apart.
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE === 'nb' ? 'nb' : 'steps';
process.on('unhandledRejection', (e) => console.log(`[warn] unhandled: ${String((e && e.message) || e).split('\n')[0]}`));

forEachApp(async (app) => {
    const P = MODE === 'nb' ? 'a21nb' : 'a21walk';
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        record(`${P}-facts`, facts);
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (k, fn) => {
        try {
            const v = await fn();
            fact(k, v);
            return v;
        } catch (e) {
            fact(k, {error: L.flat(e.message, 500)});
            await L.snap(page, `${P}-${k}-error`);
            return null;
        }
    };
    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    try {
        await signIn(page, 'dbarnes');

        // Setup, steps 2-5: a third section; submissions 5 and 6 published into the issue.
        await step('createSection', () => L.createSection(page, app));
        for (const item of L.ITEMS) {
            await step(`s${item.id}`, async () => {
                await L.openWorkflow(page, app, item.id);
                await L.openEntryPage(page, app);
                const set = await L.setSection(page, app, item.section, `${P}-s${item.id}`);
                const pub = await L.publish(page, app, `${P}-s${item.id}`);
                return {section: item.section, set, pub};
            });
        }
        fact('storedAfterSetup', L.stored(app));

        // Steps 6-7: the issue's tab; "Order", "Reviews" dropped below the last row, "Done"
        // (neighbour: "Order", "Done" with nothing moved).
        await step('issueOrder', async () => {
            const win = await L.openToc(page, app);
            await L.snap(page, `${P}-toc-before`);
            const r = await L.orderToc(page, win, MODE === 'nb' ? null : 'Reviews');
            await L.snap(page, `${P}-toc-ordered`);
            return r;
        });
        await step('issuePageBefore', () => L.readIssuePage(page, app));
        fact('storedAfterIssueOrder', L.stored(app));

        // Step 8: the journal's sections ordered Reviews, Essays hkk20, Articles.
        await step('journalOrder', async () => {
            const r = await L.orderSections(page, app, [['Reviews', 'Articles'], [L.SECTION.title, 'Articles']]);
            await L.snap(page, `${P}-sections-ordered`);
            return r;
        });
        fact('storedAfterJournalOrder', L.stored(app));

        // Steps 9-10: the tab and the issue's page read again (twice each, apart, for the tie).
        const expected = MODE === 'nb' ? ['Reviews', L.SECTION.title, 'Articles'] : ['Articles', L.SECTION.title, 'Reviews'];
        fact('expected', expected);
        for (const n of [1, 2]) {
            await step(`tocAfter${n}`, async () => {
                const win = await L.openToc(page, app);
                await L.snap(page, `${P}-toc-after${n}`);
                const sections = await L.tocSections(win);
                return {sections, asExpected: JSON.stringify(sections) === JSON.stringify(expected)};
            });
            await step(`pageAfter${n}`, async () => {
                const r = await L.readIssuePage(page, app);
                await L.snap(page, `${P}-page-after${n}`);
                return {...r, asExpected: JSON.stringify(r.headings) === JSON.stringify(expected)};
            });
        }
    } finally {
        await close();
    }
});
