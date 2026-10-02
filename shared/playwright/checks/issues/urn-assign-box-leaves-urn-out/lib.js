// Helpers of walk.js here (issue report docs/issues/U44-A7-urn-assign-box-leaves-urn-out.md).
// Requiring this file runs nothing; it reads what the screen shows.

/**
 * The "Identifiers" tab's assign box: whether it is there and ticked, its label as the page holds it
 * (`text`, spaces kept) and as the screen shows it (`shown`).
 */
async function readAssignBox(win) {
    const box = win.assignBox();
    if (!((await box.count()) > 0)) return {present: false};
    const label = win.urnArea().locator('label').filter({has: box}).or(win.urnArea().locator(`label[for="${await box.getAttribute('id')}"]`)).first();
    const holder = (await label.count()) > 0 ? label : box.locator('xpath=..');
    return {
        present: true,
        ticked: await box.isChecked(),
        text: await holder.evaluate((el) => el.textContent.replace(/^\s+|\s+$/g, '')),
        shown: (await holder.innerText()).trim(),
    };
}

module.exports = {readAssignBox};
