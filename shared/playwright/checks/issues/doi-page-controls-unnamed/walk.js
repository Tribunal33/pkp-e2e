// Issue report docs/issues/U45-A8-doi-page-controls-unnamed.md (U45 A8): on
// the DOIs page the round "?" button beside "Filters" and every row's tick
// box have no accessible name. Takes the report's Steps through the screens
// on a dataset fleet freshly reset to PKP's default test dataset, as the
// dataset's `dbarnes` on `publicknowledge`. The kit builds nothing and
// nothing is saved (a box is ticked and unticked; no bulk action is run).
//
// Steps (OJS, OMP, OPS):
//   1. sign in as dbarnes; side menu "DOIs"
//   2. read the name of the round "?" button beside "Filters"
//   3. focus it and press Enter: the "DOI Statuses" window opens; close it
//   4. read the name of every row's tick box
// Reach (OJS): the "Issues" tab's same two reads, when the journal assigns
// DOIs to issues (the default dataset does not: the tab is absent).
// Control: the row's expand button and "Bulk Actions" have names.
// Neighbours (what a fix must leave alone): the tick box still ticks and
// "Bulk Actions" counts one selected item; the row's name link is not part
// of the tick box's label; the expand button's name is unchanged.
//
// A name is read twice: as Chromium's accessibility tree computes it (what
// DevTools › Accessibility and a screen reader get) and by Playwright's
// role query.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir14 node bin/probe.js all shared/playwright/checks/issues/doi-page-controls-unnamed/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-ir2-3_5,
//               and PROBE_RUN=r35 in front of the run.
// PROBE_RUN=fix names the run with fix.diff applied.
// Facts: .reports/<feature>/ir14/names-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Role and name of a locator's first element in Chromium's accessibility tree. */
async function axOf(page, locator) {
    const cdp = await page.context().newCDPSession(page);
    try {
        const handle = await locator.first().elementHandle();
        await handle.evaluate((el) => {
            window.__axProbe = el;
        });
        const {result} = await cdp.send('Runtime.evaluate', {expression: 'window.__axProbe'});
        const {nodes} = await cdp.send('Accessibility.getPartialAXTree', {objectId: result.objectId, fetchRelatives: false});
        const node = nodes[0] || {};
        return {role: node.role && node.role.value, name: node.name ? node.name.value : null, ignored: !!node.ignored};
    } finally {
        await cdp.detach().catch(() => {});
    }
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoisPage} = require('../../../pages/DoisPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 2400)}`);
    };

    const {page, close} = await launch(app);
    try {
        const dois = new DoisPage(page, app.contextPath);

        /** The two reads of the list shown: the "?" button and every row. */
        const readList = async (name) => {
            record(`names-${name}${run}`, await screen(page));
            await shot(page, `names-${name}${run}`).catch(() => {});
            const panel = dois.panel();
            const button = panel.locator('.doiListPanel__statusInfoButton');
            const rows = dois.rows();
            const n = await rows.count();
            const out = {
                statusButton: {
                    ax: await axOf(page, button),
                    aria: flat(await button.ariaSnapshot()),
                    html: flat(await button.evaluate((el) => el.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg…/>'))),
                    byName: await panel.getByRole('button', {name: 'DOI Statuses', exact: true}).count(),
                    place: await button.boundingBox(),
                },
                rows: [],
                checkboxes: await panel.getByRole('checkbox').count(),
                checkboxesNamed: await panel.getByRole('checkbox', {name: /\S/}).count(),
                bulkActions: await axOf(page, dois.bulkActionsButton()),
            };
            for (let i = 0; i < n; i++) {
                const row = rows.nth(i);
                out.rows.push({
                    id: await row.getAttribute('id'),
                    title: flat(await dois.rowLink(row).innerText(), 80),
                    box: await axOf(page, dois.rowCheckbox(row)),
                    expander: await axOf(page, row.locator('.expander')),
                    linkInsideLabel: await row.locator('label a').count(),
                    place: i === 0 ? await dois.rowCheckbox(row).boundingBox() : undefined,
                });
            }
            out.rowSnapshot = n ? flat(await rows.first().locator('.listPanel__itemSummary').ariaSnapshot(), 600) : null;
            return out;
        };

        // Steps 1, 2, 4
        await signIn(page, 'dbarnes');
        await dois.goto();
        fact('2+4 work tab', await readList('works'));

        // Step 3: the button from the keyboard
        const button = dois.panel().locator('.doiListPanel__statusInfoButton');
        await button.focus();
        await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog').last();
        await dialog.waitFor({state: 'visible', timeout: 15000});
        await idle(page);
        const opened = await screen(page);
        record(`names-statuses-window${run}`, opened);
        fact('3 window opened by Enter', {
            heading: flat(await dialog.locator('h1, h2, .pkpModal__title, [id*="title"]').first().innerText().catch(() => null)),
            text: flat(opened.text && opened.text.dialog, 200),
        });
        await dialog.getByRole('button', {name: /^Close/}).first().click();
        await dialog.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
        await page.waitForTimeout(700);

        // Neighbours: the tick box still ticks, and the menu counts it
        const first = dois.rows().first();
        const box = dois.rowCheckbox(first);
        await box.click();
        const ticked = await box.isChecked();
        await dois.openBulkActions();
        const counted = flat(await dois.bulkDescription().innerText());
        await dois.closeBulkActions();
        await box.click();
        fact('neighbour: tick, count, untick', {ticked, counted, after: await box.isChecked()});

        // Step 5: the journal's "Issues" tab
        // The journal's "Issues" tab, where the journal assigns DOIs to issues
        // (the default dataset does not, so the tab is absent there).
        if (app.name === 'ojs') {
            if (await dois.tab('Issues').count()) {
                await dois.openTab('Issues');
                fact('Issues tab', await readList('issues'));
            } else {
                fact('Issues tab', 'absent: the journal assigns no DOIs to issues');
            }
        }
    } finally {
        record(`names-facts${run}`, facts);
        await close();
    }
});
