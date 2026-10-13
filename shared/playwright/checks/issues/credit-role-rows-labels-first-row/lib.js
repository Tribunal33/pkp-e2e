// Helpers of walk.js here (U41 A25). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per app, on PKP's default test dataset: the submission and its contributor (no CRediT roles yet). */
const CASES = {
    ojs: {id: 7, contributor: 'Domatilia Sokoloff'},
    omp: {id: 1, contributor: 'Arthur Clark'},
    ops: {id: 1, contributor: 'Carlo Corino'},
};

/** The accessible name and role Chromium's accessibility tree gives the element (what a screen reader is given). */
async function axOf(page, locator) {
    const cdp = await page.context().newCDPSession(page);
    try {
        const handle = await locator.first().elementHandle();
        await handle.evaluate((el) => {
            window.__axProbe = el;
        });
        const {result} = await cdp.send('Runtime.evaluate', {
            expression: 'window.__axProbe',
        });
        const {nodes} = await cdp.send('Accessibility.getPartialAXTree', {
            objectId: result.objectId,
            fetchRelatives: false,
        });
        const node = nodes[0] || {};
        return {
            role: node.role && node.role.value,
            name: node.name ? node.name.value : null,
        };
    } finally {
        await cdp.detach().catch(() => {});
    }
}

/** Open the submission in the workflow and choose `label` in its side menu (the latest version's entry). */
async function openPage(wf, page, sub, label) {
    await wf.gotoEditorial(sub);
    await idle(page);
    await wf.expandLatestVersionNode().catch(() => {});
    const links = wf.menuLink(label);
    const n = await links.count();
    let target = null;
    for (let i = n - 1; i >= 0; i--) {
        if (
            await links
                .nth(i)
                .isVisible()
                .catch(() => false)
        ) {
            target = links.nth(i);
            break;
        }
    }
    if (!target) return false;
    await target.click();
    await idle(page);
    await sleep(500);
    return true;
}

/** Press "Edit" on the contributor's row and wait for the form's CRediT field. */
async function openContributorEdit(page, wf, name) {
    const item = wf.dialog().locator('li.listPanel__item').filter({hasText: name}).first();
    await item.waitFor({timeout: T});
    await item.getByRole('button', {name: /^Edit/}).first().click();
    const dlg = page.getByRole('dialog', {name: 'Edit', exact: true});
    await dlg.waitFor({timeout: T});
    await dlg.locator('.pkpFormField--creditRoles').first().waitFor({timeout: T});
    await idle(page);
    return dlg;
}

/** The CRediT field of an open contributor form. */
const creditField = (dlg) => dlg.locator('.pkpFormField--creditRoles').first();
const creditRows = (dlg) => creditField(dlg).locator('tbody tr');

/** What each row's two drop-downs show, row by row. */
const rowValues = (dlg) =>
    creditRows(dlg).evaluateAll((trs) =>
        trs.map((tr) =>
            [...tr.querySelectorAll('select')].map((s) => (s.selectedOptions[0] ? s.selectedOptions[0].innerText.trim() : null)),
        ),
    );

/**
 * A select as the browser builds it and as a screen reader is given it: id, how many elements carry
 * that id, the labels the browser ties to it, the label drawn beside it and whether its `for` points
 * at this select, and its accessible name.
 */
async function selectFacts(page, sel) {
    const dom = await sel.evaluate((el) => {
        const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const own = el.closest('.pkpFormField')?.querySelector('label');
        const target = own ? document.getElementById(own.htmlFor) : null;
        const tr = target && target.closest('tbody tr');
        return {
            id: el.id || null,
            elementsWithId: el.id ? document.querySelectorAll(`[id="${CSS.escape(el.id)}"]`).length : 0,
            labelsTied: [...(el.labels || [])].map((l) => f(l.innerText)),
            ownLabel: own ? f(own.innerText) : null,
            ownLabelFor: own ? own.htmlFor : null,
            ownLabelPointsAtThisSelect: own ? target === el : null,
            ownLabelPointsAtRow: tr ? [...tr.parentElement.children].indexOf(tr) + 1 : null,
            shown: f(el.selectedOptions[0] && el.selectedOptions[0].innerText),
        };
    });
    return {...dom, ax: await axOf(page, sel)};
}

/** Where the cursor is: the CRediT row and the select's name, or what else has it. */
const cursor = (page) =>
    page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const tr = el.closest('.pkpFormField--creditRoles tbody tr');
        return {
            element: el.tagName.toLowerCase(),
            name: el.getAttribute('name'),
            id: el.id || null,
            creditRow: tr ? [...tr.parentElement.children].indexOf(tr) + 1 : null,
        };
    });

/** Choose the option whose text is `text` in a select (a person's pick from the list). */
async function pick(sel, text) {
    const value = await sel.evaluate((el, t) => {
        const o = [...el.options].find((x) => x.innerText.trim() === t);
        return o ? o.value : null;
    }, text);
    if (value == null) throw new Error(`no option "${text}"`);
    await sel.selectOption(value, {timeout: 5000});
    await sleep(300);
}

/** The contributor's stored CRediT roles, in the database (role identifier and degree). */
function storedCredit(sqlFn, app, authorId) {
    if (!authorId) return null;
    return sqlFn(
        app,
        `select r.credit_role_identifier || ' ' || coalesce(c.credit_degree::text, '-') from credit_contributor_roles c join credit_roles r on r.credit_role_id = c.credit_role_id where c.contributor_id = ${Number(authorId)} order by c.credit_contributor_role_id`,
    )
        .split('\n')
        .filter(Boolean);
}

module.exports = {
    T,
    CASES,
    flat,
    sleep,
    axOf,
    openPage,
    openContributorEdit,
    creditField,
    creditRows,
    rowValues,
    selectFacts,
    cursor,
    pick,
    storedCredit,
};
