// Helpers for walk.js (U40 OMP5). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const {typeRich, openWorkflow, openEntry, savePage, watchWrites} = require('../plain-summary-required-refuses-other-saves/lib');
const {pressAndConfirm} = require('../chapter-page-dates-and-preview-notice/lib');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The published item each app's steps read: OMP book 14, OJS article 17, OPS preprint 2 (default dataset). */
const ITEM = {
    omp: {path: 'en/catalog/book/14'},
    ojs: {path: 'en/article/view/17'},
    ops: {path: 'en/preprint/view/2'},
};

/** Settings > Distribution > "License": License Terms typed (the License choice left alone), "Save". */
async function setLicenseTerms(page, app, text) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/distribution`));
    await idle(page);
    await page.locator('#license-button').click();
    const form = page.locator('#license');
    await form.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page);
    const licenseChoice = await form.getByRole('radio').evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value));
    const ifr = form.locator('iframe[id*="licenseTerms"]').first();
    const id = (await ifr.getAttribute('id')).replace(/_ifr$/, '');
    await typeRich(page, id, text);
    const answer = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    await form.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
    return {licenseChecked: licenseChoice, status: r ? r.status() : null, statusText: flat(await form.locator('[role="status"]').allInnerTexts().then((a) => a.join(' | ')).catch(() => null))};
}

/** The item page's License block: its heading, every link with its address as written, and its text. */
async function readLicenseBlock(page) {
    return page.evaluate(() => {
        const block = document.querySelector('.item.license') || document.querySelector('.item.copyright');
        if (!block) return {block: null};
        const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
        return {
            cls: block.className,
            heading: txt(block.querySelector('h2, h3, .label')),
            links: [...block.querySelectorAll('a')].map((a) => ({text: txt(a), href: a.getAttribute('href'), img: !!a.querySelector('img')})),
            text: txt(block),
            html: block.innerHTML.replace(/\s+/g, ' ').trim().slice(0, 900),
            copyrightLine: txt(document.querySelector('.obj_monograph_full .item.copyright')),
        };
    });
}

/** Unpublish a published book from its workflow (the header's "Unpublish", confirmed). */
async function unpublish(page, app, id) {
    await openWorkflow(app, page, id);
    return pressAndConfirm(page, 'Unpublish', /\/unpublish$/);
}

/** The workflow's "Permissions & Disclosure": License URL typed, "Save". */
async function setPublicationLicenseUrl(page, app, id, url) {
    const writes = watchWrites(page);
    await openWorkflow(app, page, id);
    await openEntry(page, 'Permissions & Disclosure');
    const box = page.locator('[role="dialog"]:visible').first().getByLabel('License URL', {exact: true});
    await box.fill(url);
    return savePage(page, writes);
}

module.exports = {ITEM, setLicenseTerms, readLicenseBlock, unpublish, setPublicationLicenseUrl};
