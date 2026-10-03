// Helpers for walk.js (U20 A7: an "&" or "<" in an abstract reaches the item page's
// "citation_abstract" and "DC.Description" tags escaped twice). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const {setAbstract} = require('../book-without-abstract-oai-lists-fail/lib');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/** The published item each app's steps use, and its page. */
const ITEM = {
    ojs: {id: 17, page: (ctx) => `/index.php/${ctx}/article/view/17`},
    omp: {id: 14, page: (ctx) => `/index.php/${ctx}/catalog/book/14`},
    ops: {id: 12, page: (ctx) => `/index.php/${ctx}/preprint/view/12`},
};

const TAGS = ['citation_abstract', 'DC.Description', 'citation_title', 'DC.Title'];

/**
 * Open a public page and read its abstract tags two ways: each tag's line as the
 * server sent it (the page source), and the content a reader of the tag gets
 * (the browser's parsed attribute); plus the page's own Abstract section.
 */
async function readTags(app, page, path) {
    const res = await page.goto(app.url(path));
    await idle(page).catch(() => {});
    const html = (await res.text().catch(() => '')) || '';
    const sent = {};
    for (const name of TAGS) {
        const lines = html.match(new RegExp(`<meta name="${name.replace('.', '\\.')}"[^\\n]*`, 'g')) || [];
        if (lines.length) sent[name] = lines.map((l) => flat(l, 300));
    }
    const read = await page.evaluate((names) => {
        const out = {};
        for (const n of names) {
            const ms = [...document.querySelectorAll(`meta[name="${n}"]`)];
            if (ms.length) out[n] = ms.map((m) => ({lang: m.getAttribute('xml:lang'), content: m.getAttribute('content'), attributes: [...m.attributes].map((a) => a.name)}));
        }
        return out;
    }, TAGS);
    const shown = await page.locator('.item.abstract, section.abstract, .abstract').first().innerText().catch(() => null);
    // where the abstract tags hold a symbol: as sent and as read, around the first one
    const around = (t) => { const i = t.search(/&|</); return i < 0 ? null : t.slice(Math.max(0, i - 30), i + 40); };
    const symbols = {};
    for (const n of ['citation_abstract', 'DC.Description']) {
        if (sent[n]) symbols[n] = {sent: (html.match(new RegExp(`<meta name="${n.replace('.', '\\.')}"[^\\n]*`, 'g')) || []).map((l) => around(l.replace(/^.*?content="/, ''))), read: (read[n] || []).map((m) => around(m.content || ''))};
    }
    return {status: res.status(), url: rel(page.url()), symbols, sent, read, pageAbstract: flat(shown, 300)};
}

/** The workflow of a submission, by the dashboard address the "View" link opens. */
async function openWorkflow(app, page, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page).catch(() => {});
}

/**
 * On the open workflow: Publication › "Title & Abstract", the "Abstract" replaced by
 * `text` (typed), "Save". Returns the save and the warning the page shows above the form.
 */
async function editAbstract(app, page, text) {
    const out = await setAbstract(page, app, text);
    out.warning = flat(await page.getByText(/This version has been published/).first().innerText({timeout: 3000}).catch(() => null), 200);
    return out;
}

/**
 * OMP: the book page's links to the book's files: each link's text, address and whether it
 * sits in the chapters' list; the first one outside it (a file of the whole book) is opened.
 */
async function bookFileLinks(app, page, bookId) {
    return page.locator(`a[href*="/catalog/view/${bookId}/"]`).evaluateAll((as) => as.map((a) => ({
        text: a.textContent.replace(/\s+/g, ' ').trim(),
        href: a.getAttribute('href').replace(/^https?:\/\/[^/]+/, ''),
        inChapter: !!a.closest('.chapters, .chapter, li.chapter'),
    })));
}

module.exports = {flat, rel, ITEM, readTags, openWorkflow, editAbstract, bookFileLinks};
