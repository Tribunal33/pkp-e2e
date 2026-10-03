// Helpers for walk.js and neighbour.js (U20 A2). Requiring this file runs nothing.
const {idle, settled} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const doaj = require('../doaj-tool-stays-on-plugins-list-when-off/lib');

const PLUGIN = 'googleanalyticsplugin';

/** Settings › Website › "Plugins" in the interface language `locale` (a fresh page load), waiting for the grid. */
async function openPlugins(app, page, locale = 'en') {
    await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/management/settings/website`));
    await page.locator('#plugins-button').click();
    await page.locator('#pluginGridContainer tr.gridRow').first().waitFor();
    await idle(page).catch(() => {});
}

/** The "Google Analytics Plugin" row: its text (name and description) and its box's state. */
async function row(app, page) {
    return doaj.rowState(app, page, PLUGIN);
}

/** Tick the row's box when it is not ticked; returns the notice it raised (null when already ticked). */
async function enable(app, page) {
    const s = await row(app, page);
    if (s.ticked) return {alreadyTicked: true};
    return doaj.setEnabled(app, page, PLUGIN, true);
}

/** The arrow beside the row, then "Settings" (`linkName` in another interface language): the window's title, its paragraphs and its box label. */
async function openSettings(app, page, linkName = 'Settings') {
    const s = doaj.plugins(app, page, PLUGIN);
    if (!(await s.arrow().count())) return {arrow: false};
    await s.arrow().click();
    const link = s.grid().locator(`tr[id$="-row-${PLUGIN}"] + tr`).getByRole('link', {name: linkName, exact: true});
    if (!(await link.count())) return {arrow: true, settings: false};
    await link.click();
    const form = page.locator('#gaSettingsForm');
    await settled(page, form.locator('#description'));
    const dialog = page.getByRole('dialog').filter({has: form});
    return {
        arrow: true,
        settings: true,
        title: native.flat(await dialog.locator('h1, h2, .pkp_modal_title, [class*="title"]').first().innerText().catch(() => null), 120),
        paragraphs: (await form.locator('#description p').allInnerTexts()).map((t) => native.flat(t, 400)),
        description: native.flat(await form.locator('#description').innerText(), 800),
        links: await form.locator('#description a').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')}))),
        label: native.flat(await form.locator('label').first().innerText().catch(() => null), 120),
        checkStatusControls: await page.getByText(/check status/i).filter({hasNot: form.locator('#description')}).evaluateAll(
            (els) => els.filter((e) => !e.closest('#description')).map((e) => e.tagName + ': ' + e.innerText.trim().slice(0, 80))),
    };
}

module.exports = {PLUGIN, openPlugins, row, enable, openSettings, snap: native.snap, flat: native.flat};
