// Helpers for walk.js (U70 A2). Requiring this file runs nothing.
const {screen, record, idle} = require('../../../probe');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const flat = (s, n = 900) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * Open book `id`'s workflow (the editorial view, or the author's from "My Submissions"),
 * press "Production" in the side menu, and read the stage: its notice boxes (heading, text,
 * links and buttons inside), what the main column shows above the first box, and the side
 * menu's entries. Never throws: a failure comes back as `{error}`.
 */
async function readProduction(page, app, id, {author = false, label}) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const frame = new WorkflowPage(page, app.contextPath);
    try {
        await page.goto('about:blank');
        if (author) await frame.gotoAuthor(id);
        else await frame.gotoEditorial(id);
        await idle(page);
        await frame.selectStage('Production');
        await idle(page);
        await sleep(1500); // the notice box fills from its own request after the stage renders
        await idle(page);
        const s = await screen(page);
        record(`${label}-production`, s);
        const boxes = await frame.dialog().locator('h3').evaluateAll((hs) =>
            hs
                .filter((h) => h.parentElement && h.parentElement.matches('div.border'))
                .map((h) => {
                    const box = h.parentElement;
                    // Every link and button the main column renders before this box (the side menu left out).
                    const column = box.closest('.pkp-modal-scroll-container') || document.body;
                    const before = [];
                    const walker = document.createTreeWalker(column, NodeFilter.SHOW_ELEMENT);
                    for (let n = walker.nextNode(); n && n !== box; n = walker.nextNode()) {
                        if (n.matches('a[href], button') && n.offsetParent !== null && !n.closest('nav')) before.push((n.innerText || n.getAttribute('aria-label') || '').trim());
                    }
                    return {
                        heading: h.innerText.trim(),
                        text: (box.querySelector('p') || {}).innerText || '',
                        controlsInBox: [...box.querySelectorAll('a, button')].map((a) => a.innerText.trim()),
                        controlsAboveInColumn: before.filter(Boolean),
                    };
                })
        );
        const heading = flat(await frame.heading().innerText().catch(() => ''), 200);
        const menu = (await frame.menuEntries()).map((e) => `${'  '.repeat(e.level - 1)}${e.label}`);
        const dialogText = (s.text && s.text.dialog) || '';
        const at = dialogText.indexOf(heading.split(':').pop().trim());
        return {heading, boxes, menu, columnText: flat(at >= 0 ? dialogText.slice(at) : dialogText, 700)};
    } catch (e) {
        return {error: flat(e.message, 600)};
    }
}

module.exports = {sleep, flat, readProduction};
