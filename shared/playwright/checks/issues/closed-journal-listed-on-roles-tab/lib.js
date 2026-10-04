// Helpers of walk.js (issue report docs/issues/U03-A4-closed-journal-listed-on-roles-tab.md).
// Requiring this file runs nothing. Page objects are required inside each function, after
// forEachApp has set the app's environment.
const {idle} = require('../../../probe');
const {createContext} = require('../section-editors-not-assigned-second-journal/lib.js');

const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per-app screen words. */
const WORDS = {
    ojs: {noun: 'Journal', fold: 'Register with other journals', closeChoice: 'The Journal Manager will register all user accounts. Editors or Section Editors may register user accounts for reviewers.'},
    omp: {noun: 'Press', fold: 'Register with other presses', closeChoice: 'The Press Manager will register all user accounts. Editors or Section Editors may register user accounts for reviewers.'},
    ops: {noun: 'Server', fold: 'Register with other servers', closeChoice: 'The Server Manager will register all user accounts.'},
};

/** The two contexts the steps create, by app: names and paths. */
function scratchNames(app) {
    const n = WORDS[app.name].noun;
    return {
        open: {name: `u03rf Open ${n}`, initials: 'U03RFO', path: 'u03rfopen', email: 'u03rf.open@mailinator.com'},
        closed: {name: `u03rf Closed ${n}`, initials: 'U03RFC', path: 'u03rfclosed', email: 'u03rf.closed@mailinator.com'},
    };
}

/** Steps 1-2: Administration › Hosted … › "Create …", as `admin` (signed in). Returns the save's status. */
async function createJournal(page, app, ctx) {
    return createContext(page, app, ctx);
}

/**
 * Step 3: the context's Settings › Users & Roles › "Site Access Options", "User Registration"
 * set to the manager-only choice, "Save". Returns the PUT's status and the radio's state after
 * a reload.
 */
async function closeRegistration(page, app, contextPath) {
    const {SiteAccessTab} = require('../../../pages/RolesConfigurationPages.js');
    const tab = new SiteAccessTab(page, contextPath);
    await tab.goto();
    const choice = tab.radio(WORDS[app.name].closeChoice);
    await choice.check();
    const r = await tab.save();
    await tab.reload();
    return {status: r.status(), checkedAfterReload: await tab.radio(WORDS[app.name].closeChoice).isChecked()};
}

/** The Profile page of a context (null = the site-level page), on its Roles tab. */
async function openRoles(page, contextPath) {
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    const profile = new ProfilePage(page, contextPath);
    await profile.goto('roles');
    await idle(page).catch(() => {});
    return profile;
}

/**
 * What the Roles tab shows: the fieldset's text as a person reads it, every section under it
 * (its label, its boxes, its size), the fold's link, and whether each named context is listed
 * and with which boxes.
 */
async function readRoles(page, names = []) {
    return page.evaluate((names) => {
        const area = document.querySelector('#userGroups');
        if (!area) return {area: null};
        const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
        const own = (el, sel) => [...el.children].filter((c) => c.matches(sel));
        const sections = [...area.querySelectorAll('.section')].map((s) => {
            const labelEl = own(s, 'label, legend, span.label, .label')[0] || null;
            const ul = s.querySelector(':scope > ul');
            const ulLabel = ul ? ([...ul.children].find((c) => c.matches('label, span.label')) || {}).innerText || null : null;
            const boxes = [...s.querySelectorAll(':scope > ul > li input[type=checkbox]')].map((i) => ({
                label: ((i.closest('li') || i.parentElement).innerText || '').trim(),
                checked: i.checked,
            }));
            const r = s.getBoundingClientRect();
            return {
                id: s.id || null,
                cls: s.className,
                inFold: !!s.closest('#userGroupExtraFormFields'),
                label: labelEl ? labelEl.innerText.trim() : null,
                ulLabel: ulLabel ? ulLabel.trim() : null,
                boxes,
                inputs: s.querySelectorAll('input').length,
                text: (s.innerText || '').trim().slice(0, 400),
                height: Math.round(r.height),
                visible: visible(s),
            };
        });
        const link = area.querySelector('#userGroupExtras a.toggleExtras');
        const linkText = link ? [...link.querySelectorAll('span')].filter(visible).map((x) => x.innerText.trim()).join(' / ') : null;
        const text = area.innerText;
        const listed = {};
        for (const n of names) {
            // the context's own list: the ul whose label reads the name
            const ul = [...area.querySelectorAll('ul')].find((u) => [...u.children].some((c) => c.matches('label, span.label') && c.innerText.trim() === n));
            listed[n] = ul
                ? {listed: true, visible: visible(ul), boxes: [...ul.querySelectorAll('li input[type=checkbox]')].map((i) => ((i.closest('li') || i.parentElement).innerText || '').trim())}
                : {listed: text.includes(n), viaText: true};
        }
        return {legend: (area.querySelector('legend') || {}).innerText || null, text: text.trim().slice(0, 3000), sections, foldLink: linkText, listed, html: area.outerHTML.replace(/\s+/g, ' ').slice(0, 6000)};
    }, names);
}

/** Press the fold's link (the profile's "Register with other …"). Returns the link's text after. */
async function openFold(page, profile) {
    const link = profile.otherContextsLink();
    if (!(await link.count())) return {link: false};
    await link.click();
    await sleep(800);
    return {link: true, text: flat(await profile.otherContextsLinkText().first().innerText().catch(() => null), 100)};
}

/**
 * The site-wide Register page, signed out: the heading and the list of journals to register
 * with (each name and its boxes).
 */
async function readSiteRegister(page, app, names = []) {
    const loc = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    const res = await page.goto(app.url(`/index.php/index${loc}/user/register`));
    await idle(page).catch(() => {});
    const data = await page.evaluate((names) => {
        const list = document.querySelector('#contextOptinGroup');
        const items = list
            ? [...list.querySelectorAll('li.context')].map((li) => ({
                  name: ((li.querySelector('.name') || {}).innerText || '').trim(),
                  boxes: [...li.querySelectorAll('fieldset.roles label')].map((l) => l.innerText.trim()),
                  rolesLegend: ((li.querySelector('fieldset.roles legend') || {}).innerText || '').trim(),
              }))
            : null;
        return {h1: ((document.querySelector('h1') || {}).innerText || '').trim(), items, listed: Object.fromEntries(names.map((n) => [n, document.body.innerText.includes(n)]))};
    }, names);
    return {status: res && res.status(), ...data};
}

/**
 * Steps 11-12 (role loss): the journal's own Register page, filled as a newcomer would and sent
 * (the journal grants "Reader"); then that journal's Profile, "Roles", "Author" ticked, "Save".
 */
async function registerAndTakeAuthor(page, app, who) {
    const {registerReader} = require('../login-from-journal-not-public-forgets-page/lib.js');
    const reg = await registerReader(page, app, who);
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    const profile = new ProfilePage(page, app.contextPath);
    await profile.goto('roles');
    await idle(page).catch(() => {});
    const author = profile.roleBox('Author');
    const had = {count: await author.count()};
    if (had.count) {
        await author.check();
        await profile.save().catch((e) => (had.saveError = String(e).slice(0, 300)));
    }
    return {register: reg, author: had};
}

/** Step 13: the Profile page of a context, "Roles", "Save" pressed without touching anything. */
async function saveRolesUnchanged(page, contextPath) {
    const profile = await openRoles(page, contextPath);
    const save = profile.saveButton();
    if (!(await save.count())) return {save: false};
    let error = null;
    await profile.save().catch((e) => (error = String(e).slice(0, 300)));
    await idle(page).catch(() => {});
    const notice = await page.locator('.pkp_notification, [role="status"]').allInnerTexts().catch(() => []);
    return {save: true, error, notice: notice.map((t) => flat(t, 120)).filter(Boolean)};
}

/** The current context's own role boxes on its Roles tab: label and ticked. */
async function ownRoleBoxes(page, contextPath) {
    await openRoles(page, contextPath);
    return page.evaluate(() => {
        const area = document.querySelector('#userGroups');
        if (!area) return null;
        const first = area.querySelector('.section');
        return first ? [...first.querySelectorAll('input[type=checkbox]')].map((i) => ({label: ((i.closest('li') || i.parentElement).innerText || '').trim(), checked: i.checked})) : [];
    });
}

/**
 * Step 15: Settings › Users & Roles (`management/settings/access`) of a context, signed in as a
 * manager or `admin`: search the user's email and read their row as shown.
 */
async function usersRow(page, app, contextPath, email) {
    const loc = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    await page.goto(app.url(`/index.php/${contextPath}${loc}/management/settings/access`));
    await idle(page).catch(() => {});
    const box = page.getByRole('searchbox', {name: /Enter a user's name/});
    if (await box.count()) {
        await box.fill(email);
        const answer = page.waitForResponse((r) => /\/api\/v1\/users\?/.test(r.url()) && r.url().includes('searchPhrase='), {timeout: 30_000}).catch(() => null);
        await box.press('Enter');
        await answer;
    } else {
        const legacy = page.locator('input[name="search"]').first();
        await legacy.waitFor({state: 'visible', timeout: 30_000});
        await legacy.fill(email);
        await legacy.press('Enter');
    }
    await idle(page).catch(() => {});
    await sleep(800);
    const rows = await page.locator('tr', {hasText: email}).allInnerTexts().catch(() => []);
    return {rows: rows.map((r) => flat(r, 400))};
}

module.exports = {WORDS, scratchNames, createJournal, closeRegistration, openRoles, readRoles, openFold, readSiteRegister, registerAndTakeAuthor, saveRolesUnchanged, ownRoleBoxes, usersRow, flat};
