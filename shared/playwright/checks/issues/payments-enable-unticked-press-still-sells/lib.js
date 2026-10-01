// Helpers of walk.js (issue report docs/issues/U69-A12-payments-enable-unticked-press-still-sells.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const {flat} = require('../older-version-pdf-reader-empty/lib');

/** Settings › Distribution › "Payments": untick "Enable", "Save", reload; what the tab then shows. */
async function untickEnable(page, app) {
    const {PaymentSettingsTab} = require('../../../pages/PaymentsPages.js');
    const tab = new PaymentSettingsTab(page, app.contextPath);
    await tab.goto();
    const before = {enabled: await tab.enableBox().isChecked(), label: flat(await tab.enableLabel().innerText().catch(() => null), 200)};
    await tab.enableBox().uncheck();
    const response = await tab.save();
    const saved = flat(await tab.savedStatus().innerText().catch(() => null), 60);
    await tab.reload();
    return {
        before,
        saveStatus: response.status(),
        saved,
        afterReload: {
            enabled: await tab.enableBox().isChecked(),
            currencyShown: await tab.currencySelect().isVisible().catch(() => false),
            methodShown: await tab.pluginSelect().isVisible().catch(() => false),
            tab: flat(await tab.panel().innerText().catch(() => ''), 400),
        },
    };
}

module.exports = {untickEnable};
