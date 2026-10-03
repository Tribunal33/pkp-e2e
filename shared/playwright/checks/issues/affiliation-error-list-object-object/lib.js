// Helpers of walk.js here (U41 A7). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per app, on PKP's default test dataset: the submission and its contributor (one typed affiliation, English only). */
const CASES = {
    ojs: {id: 7, contributor: 'Domatilia Sokoloff', institution: 'University College Cork'},
    omp: {id: 1, contributor: 'Arthur Clark', institution: 'University of Calgary'},
    ops: {id: 1, contributor: 'Carlo Corino', institution: 'University of Bologna'},
};

/** Open the Affiliations row's actions ("Click to edit or delete") and choose `item`. */
async function rowAction(page, dlg, institution, item) {
    const row = dlg.locator('.pkpFormField--affiliations tbody tr').filter({hasText: institution}).first();
    await row.getByRole('button', {name: 'Click to edit or delete'}).click();
    await page.getByRole('menuitem', {name: item}).click();
    await sleep(300);
    await idle(page);
}

/**
 * Press the open form's "Save" and take what follows: the contributor save's answer (status and
 * body, null when the form refused before sending), and whether the form stayed open.
 */
async function pressSave(page, dlg) {
    const answer = page
        .waitForResponse((r) => /\/contributors(\/\d+)?(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: 8000})
        .catch(() => null);
    await dlg.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    await idle(page);
    await sleep(500);
    return {
        request: r ? {status: r.status(), body: flat(await r.text().catch(() => ''), 600)} : null,
        formOpen: await dlg.isVisible().catch(() => false),
    };
}

/**
 * The error box at the form's foot (`.pkpFormErrors`): its visible line and button, the
 * screen-reader list's entries (text, and whether each is drawn on screen), and the aria snapshot.
 */
async function errorBox(dlg) {
    const box = dlg.locator('.pkpFormErrors');
    if (!(await box.count())) return {shown: false};
    return box.first().evaluate((el) => {
        const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const drawn = (e) => {
            const r = e.getBoundingClientRect();
            const s = getComputedStyle(e.closest('ul') || e);
            return r.width > 1 && r.height > 1 && s.clip !== 'rect(0px, 0px, 0px, 0px)' && s.position !== 'absolute';
        };
        return {
            shown: true,
            visibleText: f(el.innerText),
            list: [...el.querySelectorAll('ul button')].map((b) => ({text: f(b.textContent), drawnOnScreen: drawn(b)})),
        };
    }).then(async (o) => ({...o, aria: flat(await box.first().ariaSnapshot().catch(() => null), 800)}));
}

/** The text a field shows (its label, boxes' values aside, and its messages). */
async function fieldText(dlg, cls) {
    return flat(await dlg.locator(cls).first().innerText().catch(() => null), 600);
}

/** Where focus is, and whether the Affiliations field sits inside the side window's visible area. */
async function focusFacts(page, dlg) {
    return dlg.evaluate((d) => {
        const a = document.activeElement;
        const f = d.querySelector('.pkpFormField--affiliations');
        const box = [...document.querySelectorAll('div.pkp-modal-scroll-container')].pop();
        const fr = f.getBoundingClientRect();
        const cr = box ? box.getBoundingClientRect() : {top: 0, bottom: window.innerHeight};
        return {
            focus: a ? `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''} "${(a.innerText || a.value || '').replace(/\s+/g, ' ').trim().slice(0, 80)}"` : null,
            focusInsideAffiliations: !!(a && f.contains(a)),
            scrollTop: box ? Math.round(box.scrollTop) : null,
            affiliationsTopInView: fr.top >= cr.top && fr.top < cr.bottom,
        };
    });
}

module.exports = {T, flat, sleep, CASES, rowAction, pressSave, errorBox, fieldText, focusFacts};
