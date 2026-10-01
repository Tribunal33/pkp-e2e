// Helpers of walk.js (issue report docs/issues/U52-A9-membership-address-signed-out-blank-page.md).
// Requiring this file runs nothing. Every helper presses what a person presses.

/** Settings › Distribution › "Access": "The journal will require subscriptions…", "Save". */
async function requireSubscriptions(page, app) {
    const {AccessSettings, SUBSCRIPTIONS_TEXT} = require('../../../pages/SubscriptionsPages.js');
    const label = (SUBSCRIPTIONS_TEXT && SUBSCRIPTIONS_TEXT.modeSubscription) || 'The journal will require subscriptions to access some or all of its contents.';
    const tab = new AccessSettings(page, app.contextPath);
    await tab.goto();
    const before = await tab.modeRadio(label).isChecked();
    await tab.modeRadio(label).check();
    const response = await tab.save();
    return {before, chosen: label, save: response.status()};
}

module.exports = {requireSubscriptions};
