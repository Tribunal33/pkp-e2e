// Helpers of walk.js here (issue report
// docs/issues/U28-OPS1-ops-reviewer-level-role-lands-on-undefined-list.md). Requiring this file
// runs nothing. The role is created through the U54 page objects (createRole() of the U54 A13
// walk's lib), the invitations through the U06 A4 walk's lib (invite, acceptLink, openAccept,
// acceptAndLeave); what is here sends the invitation (a Reviewer-level role's row has no masthead
// choice, which that lib's invite() selects) and reads the page a signed-in account lands on.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const ROLE = {name: 'Referee u28m', abbrev: 'REF', level: 'Reviewer'};

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const CASES = {
    ojs: {author: 'ccorino', reviewStages: ['Review'], reviewer: 'jjanssen', otherAuthor: 'ckwantes', editor: 'dbuskins'},
    omp: {author: 'aclark', reviewStages: ['Internal Review', 'External Review'], reviewer: 'phudson', otherAuthor: 'afinkel', editor: 'dbuskins'},
    ops: {author: 'ccorino', reviewStages: [], reviewer: null, otherAuthor: 'ckwantes', editor: 'dbuskins'},
};

/** The newcomer who holds the created role alone (names tagged u28m). */
const NEWCOMER = {
    email: 'referee.u28m@mailinator.com',
    givenName: 'Reffa',
    familyName: 'Uquill',
    username: 'refu28m',
    password: 'refu28mrefu28m', // the username twice, so the kit's signIn() takes it
    country: 'Canada',
};

const DENIED = /The current role does not have access to this operation\./;

/** The "Error" window the reviewer list opens when its request is refused. */
const errorWindow = (page) => page.getByRole('dialog').filter({hasText: DENIED});

/**
 * Collect, from now on, the API answers, the failed requests and the console's errors of `page`.
 * `take()` returns what came since the last take.
 */
function watch(page, base) {
    let cur = {api: [], console: [], pageErrors: []};
    const short = (u) => rel(u).replace(base, '~');
    page.on('response', (r) => {
        const u = r.url();
        if (/\/api\/v1\//.test(u) || r.status() >= 400) cur.api.push(`${r.request().method()} ${r.status()} ${short(u)}`);
    });
    page.on('console', (m) => {
        if (m.type() === 'error') cur.console.push(flat(m.text(), 220));
    });
    page.on('pageerror', (e) => cur.pageErrors.push(flat(e.message, 220)));
    return {
        take() {
            const out = cur;
            cur = {api: [], console: [], pageErrors: []};
            return out;
        },
    };
}

/** The side menu: its group headers and its links, as shown. */
async function sideMenu(page) {
    const nav = page.getByRole('navigation', {name: 'Site Navigation'});
    if (!(await nav.count().catch(() => 0))) return {present: false};
    return nav.first().evaluate((el) => {
        const tx = (e) => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
        const entries = [...el.querySelectorAll('a, button, [role="button"]')].map((e) => {
            const href = e.getAttribute('href');
            return `${tx(e)}${href ? ` -> ${href.replace(/^https?:\/\/[^/]+/, '')}` : ''}`;
        }).filter((x, i, a) => x && a.indexOf(x) === i);
        return {present: true, reviewerGroup: entries.some((x) => /My Assignments as Reviewer/.test(x)), entries};
    });
}

/** The page as the account sees it now: address, heading, the list, an open window, the menu. */
async function readPage(page, base) {
    await idle(page).catch(() => {});
    await pause(500);
    const shown = await screen(page);
    const main = page.locator('main');
    const hasMain = await main.count();
    const list = hasMain
        ? await main.first().evaluate((m) => {
            const h = m.querySelector('h1');
            const t = (m.innerText || '');
            return {
                h1: h ? h.innerText.replace(/\s+/g, ' ').trim() : null,
                rows: [...m.querySelectorAll('table tbody tr')].map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 100)),
                showing: (t.match(/Showing[^\n]*/) || [null])[0],
            };
        })
        : null;
    const win = errorWindow(page);
    const open = await win.count();
    return {
        screen: shown,
        facts: {
            url: rel(page.url()).replace(base, '~'),
            title: shown.title,
            h1: list ? list.h1 : flat(await page.locator('h1').first().innerText().catch(() => null), 120),
            rows: list ? list.rows : null,
            showing: list ? list.showing : null,
            denied: DENIED.test(`${(shown.text && shown.text.main) || ''} ${(shown.text && shown.text.dialog) || ''}`),
            errorWindow: open
                ? {
                    heading: flat(await win.first().getByRole('heading').first().innerText().catch(() => null), 80),
                    text: flat(await win.first().innerText().catch(() => null), 200),
                    buttons: await win.first().getByRole('button').allInnerTexts().catch(() => []),
                }
                : null,
            menu: await sideMenu(page),
        },
    };
}

function today() {
    return new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
}

/**
 * Settings > Users & Roles > "Invite to a role": search `email`; for a newcomer type the names;
 * the role, today as its start date, the masthead choice where the row offers one; "Save And
 * Continue"; "Invite user to the role"; the "Invitation Sent" window's "View All Users".
 */
async function invite(page, app, {email, givenName, familyName, role}) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
    await page.getByRole('heading', {name: 'Users & Roles'}).first().waitFor({timeout: T});
    await idle(page);
    await page.getByRole('button', {name: 'Invite to a role'}).click();
    await page.getByLabel(/Search for a user by email address/).fill(email);
    await page.getByRole('button', {name: 'Search User', exact: true}).click();
    const newRow = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
    await newRow.waitFor({timeout: T});
    await idle(page);
    if (givenName) {
        await page.getByLabel(/^Given Name/).first().fill(givenName);
        await page.getByLabel(/^Family Name/).first().fill(familyName);
    }
    const select = newRow.getByLabel(/^Select a new role/);
    const offered = (await select.locator('option').allInnerTexts()).map((x) => flat(x, 60));
    await select.selectOption({label: role});
    await newRow.getByRole('textbox').fill(today());
    await pause(300);
    const boxes = newRow.getByRole('combobox');
    const masthead = (await boxes.count()) > 1;
    if (masthead) await boxes.last().selectOption({label: 'Appear on the masthead'});
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    await page.locator('input[name="subject"]').waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
    await sent.waitFor({timeout: T});
    const sentText = flat(await sent.innerText(), 300);
    await sent.getByRole('button', {name: 'View All Users'}).click();
    await idle(page);
    return {email, rolesOffered: offered, mastheadChoice: masthead, sentText};
}

/** A newcomer's "Create account" and "Enter details" steps of the accept wizard. */
async function newcomerSteps(page) {
    await page.getByLabel(/^Username/).fill(NEWCOMER.username);
    await page.getByLabel(/^Password/).fill(NEWCOMER.password);
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', {name: 'Save and continue'}).click();
    await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
    await idle(page);
    await page.getByLabel(/^Country/).first().selectOption({label: NEWCOMER.country});
    await page.getByRole('button', {name: 'Save and continue'}).click();
    await page.getByRole('heading', {name: /Review & create account/}).waitFor({timeout: T});
    await idle(page);
}

module.exports = {T, flat, rel, pause, ROLE, CASES, NEWCOMER, DENIED, errorWindow, watch, sideMenu, readPage, invite, newcomerSteps};
