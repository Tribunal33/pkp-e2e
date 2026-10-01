// Helpers for walk.js (U69 A19). Requiring this file runs nothing.
const {screen, record, idle} = require('../../../probe');
const {flat, rel} = require('../older-version-tab-current-title/lib');

/** What a reader's page shows: a book or chapter page, the 404 page, Login or nothing. */
async function readReaderPage(page) {
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    return {
        url: rel(page.url()),
        tab: await page.title().catch(() => null),
        blank: body.trim().length === 0,
        heading: flat(await page.locator('.page h1').first().innerText({timeout: 2000}).catch(() => null), 140),
        chapterPage: (await page.locator('.obj_chapter').count()) > 0,
        bookPage: (await page.locator('.obj_monograph_full:not(.obj_chapter)').count()) > 0,
        outdated: (body.match(/This is an outdated version[^\n]*/) || [null])[0],
        doi: flat(await page.locator('.obj_chapter .item.doi .value').first().innerText({timeout: 1000}).catch(() => null), 120),
        contentsDois: await page
            .locator('.item.chapters li')
            .evaluateAll((items) => items.map((li) => ({chapter: (li.querySelector('.title')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), doi: li.querySelector('.doi a')?.textContent.trim() || null})).filter((c) => c.doi)),
        versions: await page
            .locator('.sub_item.versions li')
            .evaluateAll((items) => items.map((li) => ({text: li.textContent.replace(/\s+/g, ' ').trim(), href: li.querySelector('a')?.getAttribute('href') || null})))
            .then((list) => list.map((v) => ({...v, href: rel(v.href)}))),
        notFound: /404 Not Found/.test(body),
        login: /\/login(\?|$)/.test(page.url()),
        text: flat(body, 160),
    };
}

/**
 * Take one reader's action (`act`: a typed address or a pressed link) and say
 * how the main frame's navigation was answered and what the page shows.
 */
async function arrive(page, app, label, act) {
    const chain = [];
    const onResponse = (r) => {
        if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${rel(r.url())}`);
    };
    page.on('response', onResponse);
    let error = null;
    try {
        await act();
        await page.waitForLoadState('load');
    } catch (e) {
        error = flat(e.message, 200);
    }
    await idle(page).catch(() => {});
    page.off('response', onResponse);
    record(label, await screen(page));
    const out = {chain, ...(await readReaderPage(page)), error};
    console.log(`[fact] ${app.name} ${label}: ${JSON.stringify(out)}`);
    return out;
}

module.exports = {readReaderPage, arrive};
