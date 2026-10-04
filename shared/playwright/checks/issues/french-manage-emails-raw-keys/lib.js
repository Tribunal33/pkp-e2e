// Helpers for the "Manage Emails" walk in French (U56 A11). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (t, n = 400) => (t == null ? null : String(t).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Open Settings > Workflow in `lang`, its "Emails" tab, and the link to "Manage Emails", as a
 * manager does; wait for the list's first row. Returns how the page was reached.
 */
async function openManageEmails(app, page, lang) {
    await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/management/settings/workflow`));
    await idle(page);
    const tab = page.getByRole('tab', {name: /^(Emails|Courriels)$/}).first();
    let via = 'link';
    if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await idle(page);
    } else {
        via = 'tab not found';
    }
    const link = page.locator('a[href*="manageEmails"]:visible').first();
    if (await link.isVisible().catch(() => false)) {
        via += `: "${flat(await link.innerText())}"`;
        await link.click();
        await page.waitForURL(/manageEmails/, {timeout: T});
    } else {
        via = `${via}; link not found, address typed`;
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/management/settings/manageEmails`));
    }
    await idle(page);
    await page.locator('.manageEmails__listPanel .listPanel__item').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return via;
}

/** The list's rows (name, description, the "Edit" button's text and screen-reader name) and the filters. */
async function listFacts(page) {
    const panel = page.locator('.manageEmails__listPanel').first();
    const rows = await panel.locator('.listPanel__item').evaluateAll((lis) => lis.map((li) => {
        const t = (sel) => {
            const el = li.querySelector(sel);
            return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
        };
        const btn = li.querySelector('.listPanel__itemActions button');
        return {
            name: t('.listPanel__itemTitle'),
            description: t('.listPanel__itemSubtitle'),
            editShown: btn ? btn.innerText.replace(/\s+/g, ' ').trim() : null,
            editName: btn ? btn.textContent.replace(/\s+/g, ' ').trim() : null,
        };
    }));
    const sidebar = await panel.locator('.listPanel__sidebar').evaluate((sb) => {
        const blocks = [];
        let current = {heading: null, buttons: []};
        blocks.push(current);
        for (const el of sb.querySelectorAll('h2, h3, .pkpFilter__label')) {
            if (el.matches('h2, h3')) {
                current = {heading: el.textContent.replace(/\s+/g, ' ').trim(), buttons: []};
                blocks.push(current);
            } else {
                current.buttons.push(el.textContent.replace(/\s+/g, ' ').trim());
            }
        }
        return blocks.filter((b) => b.heading || b.buttons.length);
    }).catch((e) => `sidebar not read: ${e.message}`);
    return {rows, sidebar};
}

module.exports = {T, flat, openManageEmails, listFacts};
