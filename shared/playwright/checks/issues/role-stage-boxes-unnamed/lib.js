// Helpers of walk.js here (issue report docs/issues/U54-A8-role-stage-boxes-unnamed.md).
// Requiring this file runs nothing.

/** Per app, on PKP's default test dataset: the stage columns of Settings > Users & Roles > "Roles". */
const CASES = {
    ojs: {stages: ['Submission', 'Review', 'Copyediting', 'Production'], pressStage: 'Review'},
    omp: {stages: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'], pressStage: 'Internal Review'},
    ops: {stages: ['Production'], pressStage: 'Production'},
};

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Role and name of a locator's first element as Chromium's accessibility tree computes them
 * (what DevTools > Accessibility shows and what a screen reader is given).
 */
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
        return {role: node.role && node.role.value, name: node.name ? node.name.value : null};
    } finally {
        await cdp.detach().catch(() => {});
    }
}

/**
 * Every tick box of a legacy grid (a locator on its container): how many, how many have a
 * non-empty accessible name, the first box's markup and accessibility node, whether the table
 * gives the rows a heading (`rowheader`) a screen reader could add as context, the boxes' and the
 * radio buttons' `aria-label`s (none before a fix), and the row count (a neighbour: unchanged).
 */
async function gridBoxes(page, grid) {
    const boxes = grid.locator('tbody input[type="checkbox"]');
    const n = await boxes.count();
    return {
        rows: await grid.locator('tbody tr.gridRow').count(),
        boxes: n,
        named: await grid.locator('tbody').getByRole('checkbox', {name: /\S/}).count(),
        columnHeaders: (await grid.getByRole('columnheader').allInnerTexts()).map((t) => flat(t)),
        rowHeaders: await grid.getByRole('rowheader').count(),
        firstBox: n ? {ax: await axOf(page, boxes.first()), html: flat(await boxes.first().evaluate((el) => el.outerHTML))} : null,
        names: [...new Set(await boxes.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label'))))].slice(0, 8),
        radios: await grid.locator('tbody input[type="radio"]').count(),
        radiosNamed: await grid.locator('tbody').getByRole('radio', {name: /\S/}).count(),
        radioNames: await grid.locator('tbody input[type="radio"]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label'))),
    };
}

module.exports = {CASES, flat, axOf, gridBoxes};
