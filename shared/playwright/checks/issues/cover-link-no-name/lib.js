// Helpers of walk.js (issue report docs/issues/U68-A2-cover-link-no-name.md). Requiring this file
// runs nothing. Every helper drives the screens a person uses, or reads what the browser's own
// accessibility tree says about a link (Chrome's computed role and name, through DevTools Protocol).
const path = require('path');
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const FILES = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files');
const PICTURE = path.join(FILES, 'profile-image-400.png'); // a real 400 × 400 PNG

/**
 * Every element matching `selector`, as Chrome's accessibility tree has it: role, name, whether it
 * is left out of the tree (aria-hidden), and the DOM facts behind it (href, tabindex, the image's
 * file name and alt). Read through a DevTools Protocol session, the tree a screen reader is given.
 */
async function axRead(page, selector) {
    const client = await page.context().newCDPSession(page);
    try {
        await client.send('DOM.enable');
        await client.send('Accessibility.enable');
        const {result} = await client.send('Runtime.evaluate', {
            expression: `Array.from(document.querySelectorAll(${JSON.stringify(selector)}))`,
        });
        if (!result.objectId) return [];
        const {result: props} = await client.send('Runtime.getProperties', {objectId: result.objectId, ownProperties: true});
        const out = [];
        for (const p of props.filter((x) => /^\d+$/.test(x.name)).sort((a, b) => a.name - b.name)) {
            const objectId = p.value.objectId;
            const {nodes} = await client.send('Accessibility.getPartialAXTree', {objectId, fetchRelatives: false});
            const n = nodes[0] || {};
            const {result: info} = await client.send('Runtime.callFunctionOn', {
                objectId,
                returnByValue: true,
                functionDeclaration: `function () {
                    const i = this.querySelector('img');
                    return {
                        href: (this.getAttribute('href') || '').replace(/^https?:\\/\\/[^/]+/, ''),
                        ariaHidden: this.getAttribute('aria-hidden'),
                        tabindex: this.getAttribute('tabindex'),
                        focusable: this.tabIndex >= 0,
                        img: i ? (i.getAttribute('src') || '').split('/').pop() : null,
                        alt: i ? i.getAttribute('alt') : null,
                        text: (this.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 160),
                    };
                }`,
            });
            out.push({
                axRole: n.role ? n.role.value : null,
                axName: n.name ? n.name.value : null,
                axIgnored: !!n.ignored,
                ...info.value,
            });
        }
        return out;
    } finally {
        await client.detach().catch(() => {});
    }
}

/** The list selectors of each app's summaries: the cover link and the title link. */
const SUMMARY = {
    book: {cover: '.obj_monograph_summary a.cover', title: '.obj_monograph_summary .title a'},
    article: {cover: '.obj_article_summary .cover a', title: '.obj_article_summary .title a'},
    issue: {cover: '.obj_issue_summary a.cover', title: '.obj_issue_summary a.title'},
    preprint: {cover: '.obj_preprint_summary .cover a', title: '.obj_preprint_summary .title a'},
};

/**
 * The summaries on the open page: each cover link and each title link as the accessibility tree has
 * them, the page's tab stops that lead to a summary's address, and the first summary's aria snapshot.
 */
async function readSummaries(page, kind) {
    const s = SUMMARY[kind];
    const covers = await axRead(page, s.cover);
    const titles = await axRead(page, s.title);
    const objSel = s.cover.split(' ')[0];
    const first = page.locator(objSel).first();
    const snapshot = (await first.count()) ? await first.ariaSnapshot().catch((e) => `ariaSnapshot failed: ${e.message}`) : null;
    return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), kind, covers, titles, firstSummaryAria: snapshot};
}

/** The workflow's side-menu page whose form holds "Cover Image"; returns its name. */
async function openCoverPage(page) {
    const names = ['Catalog Entry', 'Publication Settings', 'Preprint Entry', 'Preprint entry', 'Issue'];
    for (const name of names) {
        const link = page.getByRole('link', {name, exact: true}).first();
        if (!(await link.isVisible().catch(() => false))) {
            const group = page.getByRole('link', {name: 'Publication', exact: true}).first();
            if (await group.isVisible().catch(() => false)) await group.click().catch(() => {});
            await sleep(300);
        }
        if (!(await link.isVisible().catch(() => false))) continue;
        await link.click();
        await idle(page).catch(() => {});
        await sleep(1500);
        if (await coverField(page).count()) return name;
    }
    return null;
}

/** The "Cover Image" field of the open publication page. */
function coverField(page) {
    return page
        .locator('.pkpFormField--upload, .pkpFormField')
        .filter({has: page.locator('.pkpFormFieldLabel, legend, label').filter({hasText: /^\s*Cover Image\b/})})
        .last();
}

/** What the "Cover Image" field offers now: its text, whether an "Alternate text" box is there, whether it takes input. */
async function readCoverField(page) {
    const field = coverField(page);
    if (!(await field.count())) return {field: false};
    const alt = field.getByRole('textbox', {name: /Alternate text/i});
    const input = field.locator('input[type=file]').first();
    return {
        field: true,
        text: flat(await field.innerText().catch(() => null), 400),
        altTextBox: (await alt.count()) ? await alt.first().isVisible().catch(() => false) : false,
        fileInputDisabled: (await input.count()) ? await input.isDisabled().catch(() => null) : null,
    };
}

/**
 * Upload the PNG under "Cover Image", type `altText` (empty leaves the box as it is) and press the
 * form's "Save". After "Unpublish" the open page may still show the form greyed out: a person reloads
 * the workflow and opens the page again, which this does when the field takes no file.
 */
async function setCover(page, altText, reopen) {
    const out = {opened: await openCoverPage(page), before: await readCoverField(page)};
    if (out.before.fileInputDisabled) {
        await reopen();
        out.reopened = await openCoverPage(page);
        out.before = await readCoverField(page);
    }
    const field = coverField(page);
    const uploaded = page.waitForResponse((r) => /temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await field.locator('input[type=file]').first().setInputFiles(PICTURE);
    const up = await uploaded;
    out.upload = up ? up.status() : null;
    const alt = field.getByRole('textbox', {name: /Alternate text/i}).first();
    await alt.waitFor({timeout: T}).catch(() => {});
    out.afterUpload = await readCoverField(page);
    if (altText) await alt.fill(altText);
    const form = field.locator('xpath=ancestor::form[1]');
    const w = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).first().click();
    const r = await w;
    out.save = r ? r.status() : null;
    const body = r ? await r.json().catch(() => null) : null;
    out.storedCover = body && body.coverImage ? body.coverImage : null;
    await idle(page).catch(() => {});
    await sleep(800);
    return out;
}

/** The book (article, preprint) page's own cover picture, as the accessibility tree has it. */
async function readItemPageCover(page) {
    return axRead(page, '.item.cover img, .item.cover_image img, .cover_image img');
}

module.exports = {T, sleep, flat, PICTURE, axRead, SUMMARY, readSummaries, openCoverPage, coverField, readCoverField, setCover, readItemPageCover};
