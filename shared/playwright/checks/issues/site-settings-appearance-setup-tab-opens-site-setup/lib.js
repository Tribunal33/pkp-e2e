// Helpers of walk.js (U60 A7). Requiring this file runs nothing. Every helper drives the
// screens a person uses; tabs are found by their labels, since the "Appearance" side tab
// "Setup" and the "Site Setup" top tab share the id `setup` (the finding).
const {idle} = require('../../../probe');
const {openTabs} = require('../settings-side-tab-reload-opens-first-tab/lib');

/** The page's outermost <tabs>. */
const root = (page) => page.locator('div.pkpTabs').first();

/** The top tab button by its label. */
const topButton = (page, label) =>
    root(page).locator(':scope > .pkpTabs__buttons').getByRole('tab', {name: label, exact: true});

/** The open top tab's panel. */
const openPanel = (page) => root(page).locator(':scope > .pkpTab:not([hidden])');

/** Wait until the open tabs differ from `before` (the debounced writes and hashchange listeners have had their turn). */
async function settle(page, before) {
    await page
        .waitForFunction(
            (b) => {
                const r = document.querySelector('.pkpTabs');
                const top = r && r.querySelector(':scope > .pkpTabs__buttons > [aria-selected="true"]');
                const panel = r && r.querySelector(':scope > .pkpTab:not([hidden])');
                const side = panel && panel.querySelector('.pkpTabs > .pkpTabs__buttons > [aria-selected="true"]');
                const now = [top && top.innerText.trim(), side && side.innerText.trim(), location.hash].join('|');
                return now !== b;
            },
            before,
            {timeout: 3000},
        )
        .catch(() => {});
    // The tabs write the address 100 ms after a change (a debounce): wait for that write.
    await page.waitForFunction(() => new Promise((r) => setTimeout(() => r(true), 150))).catch(() => {});
    return openTabs(page);
}

const key = (t) => [t.top, t.side, t.hash].join('|');

/** Press a top tab by its label; returns the open tabs and the address afterwards. */
async function pressTop(page, label) {
    const before = key(await openTabs(page));
    const b = topButton(page, label);
    if (!(await b.isVisible().catch(() => false))) return {pressed: false, label};
    await b.click();
    await idle(page);
    return {pressed: true, label, ...(await settle(page, before))};
}

/** Press a side (or inner) tab of the open top tab by its label. */
async function pressSide(page, label) {
    const before = key(await openTabs(page));
    const b = openPanel(page).locator('.pkpTabs > .pkpTabs__buttons').getByRole('tab', {name: label, exact: true});
    if (!(await b.isVisible().catch(() => false))) return {pressed: false, label};
    await b.click();
    await idle(page);
    return {pressed: true, label, ...(await settle(page, before))};
}

/** The browser's Back button; returns the open tabs afterwards. */
async function back(page) {
    const before = key(await openTabs(page));
    await page.goBack().catch(() => {});
    await idle(page);
    return settle(page, before);
}

/** Reload; returns the open tabs afterwards. */
async function reload(page) {
    await page.reload();
    await idle(page);
    return settle(page, '');
}

/** How many elements carry each id, and what the side tab "Setup"'s aria-controls points at. */
async function idFacts(page) {
    return page.evaluate(() => {
        const n = (id) => document.querySelectorAll(`[id="${id}"]`).length;
        const appearance = document.querySelector('.pkpTabs > [id="appearance"]');
        const sideSetup =
            appearance &&
            [...appearance.querySelectorAll('.pkpTabs__buttons > [role="tab"]')].find((b) => b.innerText.trim() === 'Setup');
        const target = sideSetup && document.getElementById(sideSetup.getAttribute('aria-controls'));
        return {
            setup: n('setup'),
            setupButton: n('setup-button'),
            appearanceSetup: n('appearance-setup'),
            sideSetupId: sideSetup ? sideSetup.id : null,
            sideSetupControls: sideSetup ? sideSetup.getAttribute('aria-controls') : null,
            controlsResolvesTo: target ? target.getAttribute('aria-labelledby') : null,
        };
    });
}

module.exports = {openTabs, pressTop, pressSide, back, reload, idFacts};
