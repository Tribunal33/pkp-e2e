// Helpers for the U21 A6 walks. Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * As a manager: Settings › Journal/Press/Server › "Sections" (a press: "Series"),
 * the row named `name` › "Edit", tick the editors-only box ("Items can only be
 * submitted by…"; OMP "Don't allow authors to submit directly to this series."),
 * "Save". Returns {label, status}.
 */
async function restrictSection(page, app, name) {
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/context`));
    await idle(page).catch(() => {});
    const omp = app.name === 'omp';
    await page.getByRole('tab', {name: omp ? 'Series' : 'Sections', exact: true}).first().click();
    const grid = page.locator(omp ? '#seriesGridContainer' : '#sectionsGridContainer');
    await grid.locator('tr.gridRow').first().waitFor({timeout: T});
    await idle(page).catch(() => {});
    const id = await grid.locator('tr.gridRow').evaluateAll((trs, want) => {
        const label = (r) => ((r.querySelector('td') || {}).innerText || '').split('\n').map((t) => t.trim()).filter(Boolean).pop();
        const tr = trs.find((r) => label(r) === want);
        return tr ? tr.id : null;
    }, name);
    if (!id) throw new Error(`no row "${name}" in the grid`);
    await page.locator(`tr[id="${id}"]`).locator('a.show_extras').first().click();
    await pause(300);
    await page.locator(`tr[id="${id}"] + tr`).getByRole('link', {name: 'Edit', exact: true}).first().click();
    const form = page.locator(omp ? 'form#seriesForm' : 'form#sectionForm');
    const box = form.locator('input[name^="editorRestrict"]');
    await box.waitFor({state: 'attached', timeout: T});
    await idle(page).catch(() => {});
    await pause(500);
    const label = flat(await box.evaluate((i) => (i.closest('li, div') || {}).innerText || '').catch(() => ''), 160);
    await box.check();
    const saved = page.waitForResponse((r) => /update-(section|series)/.test(r.url()), {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    return {label, status: r ? r.status() : null};
}

module.exports = {restrictSection, flat, pause, T};
