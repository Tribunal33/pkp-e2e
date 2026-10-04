// Helpers of walk.js here (spec U05, register OPS2: the new-preprint row's stray space). Requiring
// this file runs nothing.
const {idle, record, screen, shot} = require('../../../probe');

/**
 * The signed-in person's profile "Notifications" tab in `locale` (null: the page's default address),
 * as a person reaches it by the language switcher or the address: the rows' sentences, in order.
 */
async function tabSentences(page, app, locale, label) {
    const lang = locale ? `/${locale}` : '';
    await page.goto(app.url(`/index.php/${app.contextPath}${lang}/user/profile/notificationSettings`));
    await idle(page);
    const form = page.locator('form#notificationSettingsForm');
    await form.waitFor({timeout: 30_000});
    const sentences = await form.evaluate((f) => [...new Set([...f.querySelectorAll('input[type=checkbox]')].map((b) => {
        const section = b.closest('.section') || b.parentElement;
        const head = section && section.querySelector(':scope > label, :scope > span.label, label');
        return head ? head.textContent.replace(/\s+/g, ' ').trim() : null;
    }))]);
    if (label) {
        record(label, {...(await screen(page)), sentences});
        await shot(page, label).catch(() => {});
    }
    return sentences;
}

module.exports = {tabSentences};
