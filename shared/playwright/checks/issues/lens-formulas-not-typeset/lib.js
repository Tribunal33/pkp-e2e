// Helpers for walk.js (U13 OJS9). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {screen, record, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/**
 * The editor adds a galley with a file to the submission's newest
 * (unpublished) version: Publication menu › the newest version ›
 * "Galleys" › "Add galley", the label, "Save", then the upload window
 * (component, file, "Continue" twice, "Complete").
 */
async function addGalleyToLatestVersion(page, app, submissionId, {label, component, file, name}) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {GalleyManager} = require('../../../pages/GalleysPages.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const galleysLink = frame.menuLink('Galleys');
    if (app.line !== 'stable-3_5_0') {
        await expect(frame.latestVersionNode()).toBeVisible({timeout: T});
        if (!(await galleysLink.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    }
    await expect(galleysLink.last()).toBeVisible({timeout: T});
    await galleysLink.last().click();
    const galleys = new GalleyManager(page, frame);
    await galleys.expectLoaded();
    const before = await galleys.labels();
    await galleys.addGalley({label, component, file, name});
    await idle(page);
    const after = await galleys.labels();
    record('step3-galleys', await screen(page));
    return {before, after};
}

/**
 * The Lens reader page once Lens has laid the article out: its tabs, the
 * article's text, each formula node (typeset by MathJax, rendered by the
 * browser's own MathML, or left as an invisible TeX script) and the
 * paragraph with dollar amounts.
 */
async function readLens(page) {
    await page.locator('.content-node.paragraph, .content-node.text, .paragraph').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    // MathJax arrives from a public CDN; give typesetting time to finish.
    await sleep(6000);
    return page.evaluate(() => {
        const vis = (el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        };
        const formulas = [...document.querySelectorAll('.content-node.formula')].map((el) => ({
            id: el.getAttribute('id'),
            inline: el.classList.contains('inline'),
            text: (el.innerText || '').replace(/\s+/g, ' ').trim(),
            typeset: el.querySelectorAll('mjx-container').length,
            nativeMath: el.querySelectorAll('math').length,
            texScripts: [...el.querySelectorAll('script[type^="math/tex"]')].map((s) => `${s.type}: ${s.textContent}`),
            height: Math.round(el.getBoundingClientRect().height),
        }));
        const paras = [...document.querySelectorAll('.content-node.text')];
        const inlinePara = paras.find((p) => /inline formula/.test(p.textContent));
        const dollarPara = paras.find((p) => /tickets cost/.test(p.textContent));
        const inlineFormula = inlinePara && inlinePara.querySelector('.annotation.inline-formula');
        const describe = (p) => (p ? {
            text: (p.innerText || '').replace(/\s+/g, ' ').trim(),
            typeset: p.querySelectorAll('mjx-container').length,
            texScripts: p.querySelectorAll('script[type^="math/tex"]').length,
        } : null);
        return {
            title: document.title,
            mathJax: {
                type: typeof window.MathJax,
                version: window.MathJax && window.MathJax.version || null,
                keys: window.MathJax ? Object.keys(window.MathJax).slice(0, 12) : null,
                hub: !!(window.MathJax && window.MathJax.Hub),
            },
            tabs: [...document.querySelectorAll('.menu-bar a, .context-toggle')].filter(vis).map((a) => (a.innerText || a.title || '').trim()).filter(Boolean),
            headings: [...document.querySelectorAll('.content-node.heading')].map((h) => (h.innerText || '').trim()),
            mjxOnPage: document.querySelectorAll('mjx-container').length,
            formulas,
            inlineParagraph: describe(inlinePara),
            inlineFormula: inlineFormula ? {
                text: (inlineFormula.innerText || '').replace(/\s+/g, ' ').trim(),
                typeset: inlineFormula.querySelectorAll('mjx-container').length,
                texScripts: [...inlineFormula.querySelectorAll('script[type^="math/tex"]')].map((s) => `${s.type}: ${s.textContent}`),
                width: Math.round(inlineFormula.getBoundingClientRect().width),
            } : null,
            dollarParagraph: describe(dollarPara),
        };
    });
}

/** Collects the page's uncaught errors and console errors from the moment it is called. */
function watchErrors(page) {
    const seen = [];
    page.on('pageerror', (e) => seen.push({kind: 'pageerror', message: e.message, stack: flat(e.stack, 300)}));
    page.on('console', (m) => {
        if (m.type() === 'error') seen.push({kind: 'console', message: flat(m.text(), 300)});
    });
    return seen;
}

module.exports = {T, sleep, flat, rel, addGalleyToLatestVersion, readLens, watchErrors};
