// Helpers of the U73 A13 walk (docs/issues/U73-A13-*.md): which pages the press workflow's side
// menu lists under a version for a role, and what its "Publication Formats" page then shows
// (the list, or the refusal the list's request answers). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const workflow = (page) => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
const nav = (page) => workflow(page).getByRole('navigation').first();
const VERSION = /^(Unassigned version|Version of Record|Author Original|All Versions)\b/;
const GRID = /publication-format-grid\/fetch-grid/;

/** The side menu's visible entries, in order (a closed group's entries have no text). */
async function menuLabels(page) {
    return nav(page)
        .evaluate((n) => [...n.querySelectorAll('a, button')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))
        .catch(() => []);
}

/**
 * "Publication" › the newest version: open it when its pages are hidden, and return the pages
 * listed under it (on 3.5, whose menu has no version node, every entry after "Publication").
 */
async function pagesUnderVersion(page) {
    let labels = await menuLabels(page);
    const versions = labels.filter((l) => VERSION.test(l));
    if (versions.length) {
        const last = versions[versions.length - 1];
        const after = labels.slice(labels.lastIndexOf(last) + 1);
        if (!after.length || VERSION.test(after[0]) || ['Create New Version', 'Marketing', 'Workflow'].includes(after[0])) {
            await nav(page).getByRole('link', {name: last, exact: true}).last().click();
            await idle(page);
            await page.waitForFunction(
                (lbl) => {
                    const d = [...document.querySelectorAll('[role="dialog"] nav a')].map((a) => a.innerText.trim());
                    const i = d.lastIndexOf(lbl);
                    return i >= 0 && d[i + 1] && d[i + 1] !== 'Create New Version';
                },
                last,
                {timeout: T},
            ).catch(() => {});
            labels = await menuLabels(page);
        }
        const out = [];
        for (const l of labels.slice(labels.lastIndexOf(last) + 1)) {
            if (VERSION.test(l) || ['Create New Version', 'Marketing', 'Workflow'].includes(l)) break;
            out.push(l);
        }
        return {labels, pages: out};
    }
    const i = labels.indexOf('Publication');
    return {labels, pages: i < 0 ? [] : labels.slice(i + 1)};
}

/**
 * Press the menu entry `label` and read what the page shows once the list's request has
 * answered: the heading, the main column's text, whether the list is drawn, and the request's
 * answer (status, JSON status, content head).
 */
async function openFormatsPage(page) {
    const answer = page.waitForResponse((r) => GRID.test(r.url()), {timeout: T}).catch(() => null);
    await nav(page).getByRole('link', {name: 'Publication Formats', exact: true}).first().click();
    return readFormatsPage(page, answer);
}

/** Read the page after `answer` (a pending waitForResponse) settles. */
async function readFormatsPage(page, answer) {
    const r = await answer;
    let request = null;
    if (r) {
        request = {url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status()};
        try {
            const body = await r.json();
            request.jsonStatus = body.status;
            request.content = flat(String(body.content || '').replace(/<[^>]+>/g, ' '), 200);
        } catch {
            request.content = '(not JSON)';
        }
    }
    await idle(page);
    const grid = page.locator('[id^="component-grid-catalogentry-publicationformatgrid"]');
    if (request && request.jsonStatus) await grid.first().waitFor({timeout: T}).catch(() => {});
    const main = workflow(page).locator('.pkp-modal-scroll-container').first();
    return {
        heading: flat(await workflow(page).locator('.pkp-modal-scroll-container h2').first().innerText().catch(() => null)),
        main: flat(await main.innerText().catch(() => null), 900),
        list: await grid.count(),
        listHeading: flat(await grid.locator('.header h4').first().innerText().catch(() => null)),
        addLink: await grid.locator('.header a').filter({hasText: 'Add publication format'}).count(),
        columns: await grid.locator('th').evaluateAll((ths) => ths.map((t) => t.innerText.trim()).filter(Boolean)).catch(() => []),
        request,
    };
}

module.exports = {flat, workflow, menuLabels, pagesUnderVersion, openFormatsPage, readFormatsPage, GRID};
