// Helpers of walk.js here (U41 A10, U43 A5's typed-name half). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const {axOf} = require('../role-stage-boxes-unnamed/lib.js');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per app, on PKP's default test dataset: the submission and its contributor (one typed affiliation, English only). */
const CASES = {
    ojs: {id: 7, contributor: 'Domatilia Sokoloff', institution: 'University College Cork'},
    omp: {id: 1, contributor: 'Arthur Clark', institution: 'University of Calgary'},
    ops: {id: 1, contributor: 'Carlo Corino', institution: 'University of Bologna'},
};

/**
 * The text boxes a locator matches (one per language), each as the browser builds it and as a
 * screen reader is given it: id, how many elements carry that id, the labels the browser ties to
 * it, the label drawn above it and where that label's `for` points, its accessible name (Chromium's
 * accessibility tree) and its value.
 */
async function boxFacts(page, boxes) {
    const n = await boxes.count();
    const out = [];
    for (let i = 0; i < n; i++) {
        const box = boxes.nth(i);
        const dom = await box.evaluate((el) => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const own = el.closest('.pkpFormField')?.querySelector('label');
            const target = own ? document.getElementById(own.htmlFor) : null;
            return {
                id: el.id,
                elementsWithId: document.querySelectorAll(`[id="${CSS.escape(el.id)}"]`).length,
                labelsTied: [...(el.labels || [])].map((l) => f(l.innerText)),
                ownLabel: own ? f(own.innerText) : null,
                ownLabelFor: own ? own.htmlFor : null,
                ownLabelPointsAtThisBox: own ? target === el : null,
                describedBy: el.getAttribute('aria-describedby'),
                value: el.value,
            };
        });
        out.push({...dom, ax: await axOf(page, box)});
    }
    return out;
}

/**
 * Click the label drawn above the `index`th box and say which box has the cursor afterwards
 * (its index among `boxes`, or -1 for none of them).
 */
async function clickOwnLabel(page, boxes, index) {
    const box = boxes.nth(index);
    const label = box.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " pkpFormField ")][1]//label').first();
    await label.click();
    await sleep(200);
    return boxes.evaluateAll((els) => els.indexOf(document.activeElement));
}

/** Open the Affiliations row's actions ("Click to edit or delete") and choose `item`. */
async function rowAction(page, dlg, institution, item) {
    const row = dlg.locator('.pkpFormField--affiliations tbody tr').filter({hasText: institution}).first();
    await row.getByRole('button', {name: 'Click to edit or delete'}).click();
    await page.getByRole('menuitem', {name: item}).click();
    await sleep(300);
    await idle(page);
}

module.exports = {CASES, flat, sleep, boxFacts, clickOwnLabel, rowAction, axOf};
