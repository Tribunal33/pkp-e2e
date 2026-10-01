// Helpers for the Native XML Plugin export list's "Stages" filters (U63 A10). The plugin page
// helpers (openNative, openExportTab, snap, watch, scriptErrors) come from the sibling issue
// walk's lib.js. Requiring this file runs nothing.
const {idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');

const {sleep} = native;
const listTab = (page) => page.locator('#exportSubmissions-tab');
const sidebar = (page) => listTab(page).locator('.listPanel__sidebar');

/** The export list as data: each line's submission id and title, and the page links' text. */
async function readList(page) {
    return listTab(page).evaluate((el) => {
        const items = [...el.querySelectorAll('.listPanel__item')].map((i) => {
            const box = i.querySelector('input[type=checkbox]');
            const t = i.querySelector('.listPanel__itemSubTitle');
            return {id: box ? Number(box.value) : null, title: t ? t.innerText.replace(/\s+/g, ' ').trim().slice(0, 80) : null};
        });
        const empty = el.querySelector('.listPanel__empty');
        return {count: items.length, ids: items.map((i) => i.id).sort((a, b) => a - b), items,
            empty: empty ? empty.innerText.trim() : null};
    });
}

/** Wait until the list stops changing after a filter press, then read it. */
async function settleList(page) {
    let prev = null;
    for (let i = 0; i < 30; i++) {
        await sleep(300);
        await idle(page).catch(() => {});
        const cur = JSON.stringify((await readList(page)).ids);
        if (cur === prev) break;
        prev = cur;
    }
    return readList(page);
}

/** Press "Filters" and return the filter panel's groups: heading and the buttons under it. */
async function openFilters(page) {
    await listTab(page).getByRole('button', {name: 'Filters'}).first().click();
    await sidebar(page).waitFor({state: 'visible', timeout: 10_000});
    await sleep(300);
    return sidebar(page).evaluate((el) => [...el.querySelectorAll('.listPanel__block')].map((b) => ({
        heading: (b.querySelector('h4') || {innerText: null}).innerText,
        buttons: [...b.querySelectorAll('.pkpFilter__label')].map((x) => x.innerText.trim()),
    })));
}

/** Press one filter button by its label and return the list after it settles. */
async function pressFilter(page, label) {
    await sidebar(page).locator('.pkpFilter__label').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)}).first().click();
    return settleList(page);
}

module.exports = {listTab, sidebar, readList, settleList, openFilters, pressFilter};
