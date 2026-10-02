// Helpers of walk.js here (issue report docs/issues/U44-A9-urn-assign-offered-without-edit-rights.md).
// Requiring this file runs nothing. Each helper reads what the screen shows or presses what a person
// presses.
const {idle} = require('../../../probe');

/** The "Identifiers" page's state: the box's value, "Assign" / "Clear" shown and enabled, "Save" greyed. */
async function readField(ids) {
    const state = async (loc) => {
        const n = await loc.count();
        if (!n) return 'absent';
        if (!(await loc.first().isVisible())) return 'hidden';
        return (await loc.first().isEnabled()) ? 'enabled' : 'disabled';
    };
    return {
        box: await ids.box().inputValue(),
        boxDisabled: await ids.box().isDisabled(),
        assign: await state(ids.assignButton()),
        clear: await state(ids.clearButton()),
        save: await state(ids.saveButton()),
        saveDisabled: (await state(ids.saveButton())) !== 'enabled',
    };
}

/**
 * Press "Assign" when it is there and enabled (a greyed or missing one is recorded, never forced),
 * then read the field again and count the requests the press sent.
 */
async function pressAssign(page, ids) {
    const sent = [];
    const onRequest = (r) => {
        if (/\/api\/|\$\$\$call\$\$\$/.test(r.url()) && r.method() !== 'GET') sent.push(`${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`);
    };
    const shown = await ids.assignButton().count();
    const enabled = shown ? await ids.assignButton().first().isEnabled() : false;
    page.on('request', onRequest);
    try {
        if (enabled) await ids.assignButton().first().click();
        await idle(page);
    } finally {
        page.off('request', onRequest);
    }
    return {pressed: enabled, after: await readField(ids), requestsSent: sent};
}

module.exports = {readField, pressAssign};
