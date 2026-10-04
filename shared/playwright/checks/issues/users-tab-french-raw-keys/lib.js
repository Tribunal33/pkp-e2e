// Helpers for the Settings > Users & Roles > "Users" tab walks (U53 A11, A4).
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (t, n = 400) => (t == null ? null : String(t).replace(/\s+/g, ' ').trim().slice(0, n));

/** Open Settings > Users & Roles in `lang` ('en' | 'fr_CA') and wait for the users list's first row. */
async function openUsersTab(app, page, lang) {
    await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/management/settings/access`));
    await idle(page);
    await page.locator('#users table').last().locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
}

/** The users list's search box (the Search component's input). */
function searchBox(page) {
    return page.locator('main input.pkpSearch__input').first();
}

/**
 * What the "Users" tab shows: the search box's placeholder and screen-reader label, every
 * table's caption heading, header cells (rendered text and source text, since the
 * columns are upper-cased by CSS), and the buttons above the tables.
 */
async function usersTabFacts(page) {
    const box = searchBox(page);
    const placeholder = await box.getAttribute('placeholder').catch(() => null);
    const label = flat(await page.locator('main .pkpSearch label .-screenReader').first().textContent().catch(() => null));
    const tables = await page.locator('#users table').evaluateAll((els) => els.map((t) => {
        const wrap = t.closest('.pkpTable, div') || t.parentElement;
        let heading = null;
        for (let el = t; el && !heading; el = el.parentElement) {
            const h = el.querySelector('h2, h3, h4');
            if (h) heading = h.textContent.replace(/\s+/g, ' ').trim();
        }
        return {
            heading,
            ariaLabel: t.getAttribute('aria-label'),
            columns: [...t.querySelectorAll('thead th')].map((th) => ({
                shown: th.innerText.replace(/\s+/g, ' ').trim(),
                text: th.textContent.replace(/\s+/g, ' ').trim(),
            })),
            wrap: !!wrap,
        };
    }));
    const buttons = (await page.locator('#users button:visible').allInnerTexts().catch(() => [])).map((t) => flat(t)).filter(Boolean);
    return {placeholder, label, tables, buttons};
}

/** Type `term` into the search box and press Enter; return the list's heading and row texts. */
async function searchUsers(page, term) {
    const box = searchBox(page);
    await box.fill(term);
    const answer = page.waitForResponse((r) => /\/api\/v1\/users\?/.test(r.url()), {timeout: T}).catch(() => null);
    await box.press('Enter');
    const res = await answer;
    await idle(page);
    const table = page.locator('#users table').last();
    const rows = await table.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()));
    const heading = flat(await page.locator('#users h3, #users h2').filter({hasText: /\(\d+\)/}).last().innerText().catch(() => null));
    return {term, status: res ? res.status() : null, heading, rows};
}

/**
 * Open submission `id`'s workflow in `lang` (`mySubmissions` for an author, else `editorial`) and
 * wait for its review stage's "Author Response" table (editor) or card (author), named by the
 * English text, the French text or the raw code. Returns whether it showed.
 */
async function openAuthorResponse(app, page, id, lang, {author = false} = {}) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${id}`));
    await page.getByRole('dialog').first().waitFor({timeout: 60_000});
    await idle(page);
    const shown = await page.getByRole('heading', {name: AUTHOR_RESPONSE}).first().waitFor({timeout: 20_000}).then(() => true).catch(() => false);
    if (shown && !author) await authorResponseTable(page).locator('tbody tr').filter({hasNotText: /No Items|Aucun/}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return shown;
}

const AUTHOR_RESPONSE = /^(Author Response|##submission\.reviewRound\.authorResponse##|Réponse de l.auteur.*)$/;
const authorResponseTable = (page) => page.getByRole('table', {name: AUTHOR_RESPONSE});

/** The "Author Response" table as a screen reader meets it: column headings (shown and full text), each row's cells and its last button's name. */
async function authorResponseTableFacts(page) {
    const t = authorResponseTable(page);
    if (!(await t.count())) return {table: false};
    const rows = [];
    for (const tr of await t.locator('tbody tr').all()) {
        const b = tr.getByRole('button').last();
        rows.push({
            cells: (await tr.locator('td').allInnerTexts()).map((x) => flat(x, 160)),
            button: (await b.count()) ? {ariaLabel: await b.getAttribute('aria-label'), text: flat(await b.innerText().catch(() => null), 60)} : null,
        });
    }
    return {
        table: true,
        name: await t.first().getAttribute('aria-label').catch(() => null),
        columns: await t.locator('thead th').evaluateAll((ths) => ths.map((th) => ({shown: th.innerText.replace(/\s+/g, ' ').trim(), text: th.textContent.replace(/\s+/g, ' ').trim()}))),
        rows,
    };
}

module.exports = {T, flat, openUsersTab, searchBox, usersTabFacts, searchUsers, AUTHOR_RESPONSE, openAuthorResponse, authorResponseTable, authorResponseTableFacts};
