// Helpers of walk.js (issue report docs/issues/U08-OJS1-subscription-menu-items-no-eye.md).
// Requiring this file runs nothing. The menu window's own helpers (open, read a notice,
// cancel) are menu-notices-wrong-settings-places/lib.js, which this file re-exports.
const {idle} = require('../../../probe');
const N = require('../menu-notices-wrong-settings-places/lib');

/**
 * A panel of the open menu window ('assigned' | 'unassigned') as data: each item's
 * title and its own icons ('eye' | 'warning', with the tooltip text where it has one),
 * on the Vue window (main) and the older form (3.5) alike.
 */
async function panelIcons(page, panel) {
    const vue = page.locator(`[data-cy="panel-content-${panel}"]`);
    if (await vue.count()) {
        return vue.first().evaluate((p) => [...p.querySelectorAll('[data-menu-item-title]')].map((el) => ({
            title: el.getAttribute('data-menu-item-title'),
            icons: [...el.querySelectorAll('button[title]')].filter((b) => b.closest('[data-menu-item-title]') === el)
                .map((b) => ({kind: b.className.includes('text-negative') ? 'warning' : 'eye', text: b.getAttribute('title')})),
        })));
    }
    const id = panel === 'assigned' ? '#pkpNavAssigned' : '#pkpNavUnassigned';
    return page.locator(`${id} li`).evaluateAll((lis) => lis.map((li) => {
        const item = li.querySelector(':scope > .item');
        return {
            title: (item?.querySelector('.item_title')?.innerText || '').replace(/\s+/g, ' ').trim(),
            icons: [...(item?.querySelectorAll('.item_buttons button') || [])]
                .map((b) => ({kind: b.classList.contains('btnSubmenuWarning') ? 'warning' : 'eye', text: null})),
        };
    }));
}

/** "Add item": choose a type, type the English title, "Save"; returns the save's answer. */
async function addItem(page, tab, typeLabel, title) {
    const win = await tab.addItem();
    await win.chooseType(typeLabel);
    await win.titleInput('en').fill(title);
    const answer = await win.save();
    await win.form.waitFor({state: 'hidden', timeout: N.T}).catch(() => {});
    await idle(page);
    await N.sleep(600); // a closed window keeps its slot ~450 ms (patterns.md pitfall 4)
    return {type: typeLabel, title, status: answer.status, refused: answer.body && answer.body.status === false};
}

module.exports = {...N, panelIcons, addItem};
