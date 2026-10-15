// Helpers of walk.js here (issue report
// docs/issues/U29-A12-recommendations-controls-unnamed.md). Requiring this
// file runs nothing.

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Role, name and state of a locator's first element as Chromium's
 * accessibility tree computes them (what DevTools > Accessibility shows and
 * what a screen reader is given), with the sources the name was looked for in.
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
        const prop = (k) => ((node.properties || []).find((p) => p.name === k) || {value: {}}).value.value;
        return {
            role: node.role && node.role.value,
            name: node.name ? node.name.value : null,
            checked: prop('checked'),
            focusable: !!prop('focusable'),
            nameSources: ((node.name && node.name.sources) || [])
                .map((x) => ({type: x.type, attribute: x.attribute, value: x.value && x.value.value}))
                .filter((x) => x.value != null && x.value !== ''),
        };
    } finally {
        await cdp.detach().catch(() => {});
    }
}

module.exports = {flat, axOf};
