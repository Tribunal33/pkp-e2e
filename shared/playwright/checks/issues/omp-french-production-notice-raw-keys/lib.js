// Helpers for walk.js (U33 OMP3). Requiring this file runs nothing.
const {screen, record, idle, rawKeys} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const flat = (s, n = 900) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const workflow = (page) => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();

/**
 * Open book `id`'s workflow by its address in language `lang` (the editorial view, or the
 * author's from "My Submissions"), press "Production" in the window's menu (the same word in
 * English and French), and read the notice boxes at the top of the main column: each one's
 * heading and paragraph, the main column's heading, and the raw `##key##` codes on the page.
 * Never throws: a failure comes back as `{error}`.
 */
async function readProductionNotice(page, app, id, {lang, author = false, label}) {
    try {
        await page.goto('about:blank');
        const view = author ? 'mySubmissions' : 'editorial';
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/dashboard/${view}?workflowSubmissionId=${id}`));
        const dialog = workflow(page);
        await dialog.locator('[data-cy="sidemodal-header"]').waitFor({timeout: T});
        await idle(page);
        const entry = dialog.getByRole('navigation').getByRole('link', {name: 'Production', exact: true}).first();
        await entry.waitFor({timeout: T});
        await entry.click();
        await idle(page);
        await sleep(1500); // the notice box fills from its own request after the stage renders
        await idle(page);
        const s = await screen(page);
        record(`${label}-production`, s);
        const boxes = await dialog.locator('h3').evaluateAll((hs) =>
            hs
                .filter((h) => h.parentElement && h.parentElement.matches('div.border'))
                .map((h) => ({heading: h.innerText.trim(), text: ((h.parentElement.querySelector('p') || {}).innerText || '').trim()}))
        );
        const heading = flat(await dialog.locator('.pkp-modal-scroll-container h2').first().innerText().catch(() => ''), 200);
        const keys = await rawKeys(page).catch((e) => `rawKeys failed: ${e.message}`);
        return {
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            htmlLang: await page.locator('html').getAttribute('lang'),
            heading,
            boxes,
            rawKeys: Array.isArray(keys) ? keys.map((k) => (typeof k === 'string' ? k : k.key)) : keys,
        };
    } catch (e) {
        return {error: flat(e.message, 600)};
    }
}

module.exports = {sleep, flat, workflow, readProductionNotice};
