// Helpers for walk.js (U69 A16). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {screen, record, idle} = require('../../../probe');
const {T, sleep, flat, rel, workflowFrame} = require('../older-version-tab-current-title/lib');

/**
 * The given version's "Catalog Entry" page (main: the workflow address with
 * its menu key, as the menu's entry opens it; 3.5: the entry of the menu,
 * which lists the shown version's pages): "URL Path" set to `urlPath` (an
 * empty string clears it), then "Save", bounded by the publication's write.
 */
async function saveUrlPath(page, app, submissionId, publicationId, urlPath, label) {
    const frame = workflowFrame(page, app);
    if (app.line === 'stable-3_5_0') {
        await frame.menuLink('Catalog Entry').last().click();
    } else {
        await frame.gotoEditorial(submissionId, {menuKey: `publication_${publicationId}_catalogEntry`});
    }
    const box = page.locator('input[name="urlPath"]');
    await expect(box).toBeVisible({timeout: T});
    await idle(page);
    await sleep(600);
    const before = await box.inputValue();
    await box.fill(urlPath);
    const saved = page.waitForResponse(
        (r) => /\/submissions\/\d+\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET',
        {timeout: T}
    );
    await page.locator('form').filter({has: box}).first().getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    const body = await r.json().catch(() => ({}));
    await idle(page);
    await sleep(800);
    record(label, await screen(page));
    return {before, typed: urlPath, save: r.status(), savedUrl: rel(r.url()), stored: body.urlPath ?? null, error: r.status() >= 400 ? flat(JSON.stringify(body), 300) : undefined};
}

/** Open one typed address and say how it was answered and where it ended. */
async function visit(page, app, label, address) {
    const chain = [];
    const onResponse = (r) => {
        if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${rel(r.url())}`);
    };
    page.on('response', onResponse);
    let error = null;
    let status = null;
    try {
        const res = await page.goto(app.url(address));
        status = res ? res.status() : null;
    } catch (e) {
        error = flat(e.message, 200);
    }
    await idle(page).catch(() => {});
    page.off('response', onResponse);
    const s = await screen(page);
    record(label, s);
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    const out = {
        asked: address,
        status,
        url: rel(page.url()),
        chain,
        tab: await page.title(),
        blank: body.trim().length === 0,
        heading: flat(await page.locator('.page h1').first().innerText({timeout: 2000}).catch(() => null), 120),
        bookPage: (await page.locator('.obj_monograph_full').count()) > 0,
        outdated: (body.match(/This is an outdated version[^\n]*/) || [null])[0],
        login: /\/login(\?|$)/.test(page.url()),
        notFound: /404 Not Found/.test(body),
        text: flat(body, 160),
        error,
    };
    console.log(`[fact] ${app.name} ${label}: ${JSON.stringify(out)}`);
    return out;
}

module.exports = {saveUrlPath, visit};
