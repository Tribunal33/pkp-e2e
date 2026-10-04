// U42 A16, joined to docs/issues/U16-A11-category-arrows-keyboard-and-names.md (one shared component,
// ui-library TableCellTreeExpand.vue): on the References page with metadata lookup on, a structured
// row's arrow is named "Collapse" open or closed and ignores Enter and Space; every row with nothing
// to expand carries an invisible "Collapse" button.
//
// Takes the report's "The References page" Steps through the screens on a dataset fleet freshly reset
// to PKP's default test dataset, as the dataset's editor `dbarnes` on `publicknowledge`, on the
// submission of ../citation-author-row-kept-after-close/lib.js SUBMISSION. Names tagged u42r7. The
// kit builds nothing. A name is read as Chromium's accessibility tree computes it.
//
// Modes (first argument; each runs alone on a freshly reset dataset):
//   steps (default)  the Steps.
//   nb               what the fix must leave alone: a mouse click opens the structured row and a
//                    second click closes it; "Expand All" / "Collapse All" open and close it.
//
// Reset first:  npm run fleet-prep -- --feature issues-u42r7 --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-u42r7 PROBE_AGENT=u42r7 node bin/probe.js <app|all> shared/playwright/checks/issues/reference-row-expander-always-collapse/walk.js [steps|nb]
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), with
//               ../category-arrows-keyboard-and-names/fix.diff applied or not.
// Facts: .reports/issues-u42r7/u42r7/a16-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../citation-author-row-kept-after-close/lib');
const {axOf} = require('../role-stage-boxes-unnamed/lib');

const mode = process.argv[2] || 'steps';
const STRUCTURED = 'u42r7 Expander structured';
const PLAIN = 'u42r7 Expander plain';
const LINES = [`${STRUCTURED}. Test Press; 2020.`, `${PLAIN}. Test Press; 2020.`];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1200)}`);
        record(`a16-facts${run}`, facts);
    };
    const {page, close} = await launch(app);
    const part = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${key} error`, L.flat(e.message, 500));
            await shot(page, `a16-${key}-error${run}`).catch(() => {});
        }
    };
    let refs;
    /** The row's arrow cell button, whatever its name (the fix renames it). */
    const arrow = (text) => refs.row(text).locator('button[data-cy="category-manager-toggle-sub-categories"]');
    const arrowFacts = async (text) => {
        const a = arrow(text);
        const n = await a.count();
        if (!n) return {count: 0};
        const b = await a.first().boundingBox();
        return {count: n, ax: await axOf(page, a), ariaExpanded: await a.first().getAttribute('aria-expanded'),
            size: b ? `${Math.round(b.width)}x${Math.round(b.height)}` : 'not drawn', icon: await a.first().locator('svg').count()};
    };
    /** Is the structured row open (its raw text in small print shows)? */
    const isOpen = async () => (await refs.rowSmallPrint(STRUCTURED).count()) > 0 && refs.rowSmallPrint(STRUCTURED).first().isVisible();
    const focused = async () => {
        const raw = await page.evaluate(() => {
            const a = document.activeElement;
            if (!a || a === document.body) return null;
            const r = a.getBoundingClientRect();
            const tr = a.closest('tr');
            return {tag: a.tagName.toLowerCase(), size: `${Math.round(r.width)}x${Math.round(r.height)}`,
                row: tr ? (tr.innerText || '').split('\n')[0].trim().slice(0, 80) : null, html: a.outerHTML.replace(/\s+/g, ' ').slice(0, 300)};
        });
        if (!raw) return null;
        return {...raw, ax: await axOf(page, page.locator(':focus'))};
    };
    /** Shift+Tab from the row's "More Actions": what the focus lands on. */
    const backFromMenu = async (text) => {
        await refs.rowMenuButton(text).focus();
        await page.keyboard.press('Shift+Tab');
        await L.sleep(300);
        return focused();
    };

    try {
        await signIn(page, 'dbarnes');
        await part('s1', async () => fact('s1 lookup on', await L.tickMetadata(page, app, ['lookup'])));
        await part('s2', async () => {
            ({pg: refs} = await L.openPublicationPage(page, app, 'References'));
            await refs.add(LINES);
            await idle(page);
            const panel = await refs.edit(STRUCTURED);
            await panel.field('DOI').fill('10.1234/u42r7.9');
            await panel.field('Title').fill(STRUCTURED);
            await panel.addAuthor({givenName: 'Ada', familyName: 'Lovelace'});
            await panel.save();
            await L.afterClose(page);
            await L.sleep(800);
            fact('s4 structured row open?', await isOpen());
        });

        if (mode === 'steps') {
            await part('s5', async () => {
                fact('s5 focus after Shift+Tab from the structured row\'s More Actions', await backFromMenu(STRUCTURED));
                fact('s5 structured arrow, row closed', await arrowFacts(STRUCTURED));
            });
            await part('s6', async () => {
                await page.keyboard.press('Enter');
                await idle(page);
                await L.sleep(500);
                fact('s6 open after Enter?', await isOpen());
                await page.keyboard.press('Space');
                await idle(page);
                await L.sleep(500);
                fact('s6 open after Enter then Space?', await isOpen());
            });
            await part('s7', async () => {
                const wasOpen = await isOpen();
                await arrow(STRUCTURED).first().click();
                await idle(page);
                await L.sleep(500);
                fact('s7 open after a click (was open before?)', {wasOpen, open: await isOpen()});
                fact('s7 structured arrow after the click', await arrowFacts(STRUCTURED));
                record(`a16-s7${run}`, await screen(page));
                await shot(page, `a16-s7${run}`);
            });
            await part('s8', async () => {
                fact('s8 plain row arrow', await arrowFacts(PLAIN));
                fact('s8 focus after Shift+Tab from the plain row\'s More Actions', await backFromMenu(PLAIN));
            });
            await part('s9', async () => {
                // Close the row first if open, then the way round: "Expand All" from the keyboard.
                if (await isOpen()) { await arrow(STRUCTURED).first().click(); await L.sleep(500); }
                const all = refs.expandAllButton().first();
                fact('s9 header button', L.flat(await all.innerText()));
                await all.focus();
                await page.keyboard.press('Enter');
                await idle(page);
                await L.sleep(500);
                fact('s9 open after Enter on "Expand All"?', {open: await isOpen(), header: L.flat(await all.innerText())});
            });
        }

        if (mode === 'nb') {
            await part('n1', async () => {
                const before = await isOpen();
                await arrow(STRUCTURED).first().click();
                await idle(page);
                await L.sleep(500);
                const afterOne = await isOpen();
                await arrow(STRUCTURED).first().click();
                await idle(page);
                await L.sleep(500);
                fact('n1 mouse: closed → click → click', {before, afterOne, afterTwo: await isOpen()});
            });
            await part('n2', async () => {
                const all = refs.expandAllButton().first();
                await all.click();
                await idle(page);
                await L.sleep(500);
                const opened = {open: await isOpen(), header: L.flat(await all.innerText())};
                await all.click();
                await idle(page);
                await L.sleep(500);
                fact('n2 "Expand All" then "Collapse All"', {opened, closed: {open: await isOpen(), header: L.flat(await all.innerText())}});
                fact('n2 arrows on the page', {structured: await arrowFacts(STRUCTURED), plain: await arrowFacts(PLAIN)});
                record(`a16-n2${run}`, await screen(page));
            });
        }
    } finally {
        record(`a16-facts${run}`, facts);
        await close();
    }
});
