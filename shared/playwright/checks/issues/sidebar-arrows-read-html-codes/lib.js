// Helpers for walk.js (U10 A17). Runs nothing when required.

const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/** A control's role and accessible name as Chromium computes it (what a screen reader is given). Copied from role-stage-boxes-unnamed/lib.js. */
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
 * One option row of an orderable FieldOptions list, by the option's value (a block plugin's name,
 * `developedbyblockplugin`): the nearest element around the option's input that also holds an
 * Orderer, so it holds with the arrows inside or outside the <label>.
 */
function optionRow(fieldset, value) {
    return fieldset
        .locator(`input[value="${value}"]`)
        .locator('xpath=ancestor::*[.//*[contains(concat(" ", @class, " "), " orderer ")]][1]')
        .first();
}

/**
 * What a row shows and what a screen reader is given for it: the visible label (and its source),
 * the box's name, each arrow's name and its hidden text's source.
 */
async function readRow(page, fieldset, wanted) {
    // A plugin's registry name keeps its class's case on some lines: match without case.
    const values = await fieldset.locator('input[type="checkbox"]').evaluateAll((els) => els.map((el) => el.value));
    const value = values.find((v) => v.toLowerCase() === wanted.toLowerCase());
    if (!value) return {value: wanted, absent: true, values};
    const row = optionRow(fieldset, value);
    await row.scrollIntoViewIfNeeded();
    const label = row.locator('.pkpFormField--options__optionLabel').first();
    const up = row.locator('button.orderer__up');
    const down = row.locator('button.orderer__down');
    const box = row.locator(`input[value="${value}"]`);
    return {
        value,
        labelShown: flat(await label.innerText()),
        labelHtml: flat(await label.innerHTML()),
        box: await axOf(page, box),
        up: await axOf(page, up),
        down: await axOf(page, down),
        upTextShown: flat(await up.innerText()),
        upHtml: flat(await up.innerHTML(), 400),
    };
}

/** The values of the list's options, in order, with their visible labels. */
async function listRows(fieldset) {
    return fieldset.locator('input[name="sidebar"], input[type="checkbox"]').evaluateAll((els) =>
        els.map((el) => {
            const row = el.closest('label') || el.parentElement;
            const l = row && row.querySelector('.pkpFormField--options__optionLabel');
            return {value: el.value, checked: el.checked, label: l ? l.textContent.replace(/\s+/g, ' ').trim() : ''};
        })
    );
}

module.exports = {flat, axOf, optionRow, readRow, listRows};
