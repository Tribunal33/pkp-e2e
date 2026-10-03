// Helpers of walk.js (issue report docs/issues/U03-A14-site-profile-privacy-link-not-found.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses; page objects
// are required inside each function, after forEachApp has set the app's environment.
const {idle} = require('../../../probe');
const {createContext, giveRole} = require('../section-editors-not-assigned-second-journal/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/** The seven tabs, in the page's order (ProfilePage keys). */
const TABS = ['identity', 'contact', 'roles', 'public', 'password', 'notifications', 'apiKey'];

/** Per-app screen words and the second context the steps create. */
const WORDS = {
    ojs: {noun: 'Journal'},
    omp: {noun: 'Press'},
    ops: {noun: 'Server'},
};
function secondContext(app) {
    const n = WORDS[app.name].noun;
    return {name: `u03re Second ${n}`, initials: 'U03RE', path: 'u03re', email: 'u03re@mailinator.com'};
}

/** Steps 1-2: create the second context as `admin` (signed in), and give `username` a role there. */
async function createSecondContext(page, app, {username = 'dbarnes', role = 'Reader'} = {}) {
    const ctx = secondContext(app);
    const status = await createContext(page, app, ctx);
    const landed = rel(page.url());
    const roleGiven = await giveRole(page, app, {username, role});
    return {ctx, status, landed, roleGiven};
}

/** The Profile page (contextPath null = the site-level page), typed into the address bar. */
async function openProfile(page, app, contextPath) {
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    const loc = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    const res = await page.goto(app.url(`/index.php/${contextPath || 'index'}${loc}/user/profile`));
    const profile = new ProfilePage(page, contextPath);
    await profile.expectOpen('identity');
    await idle(page).catch(() => {});
    return {profile, status: res && res.status(), landed: rel(page.url())};
}

/** What one tab's form says about the privacy statement: the sentence and its links. */
async function readPrivacy(page, profile, tab) {
    const form = profile.form(tab);
    return form.evaluate((f) => {
        const links = [...f.querySelectorAll('a')].filter((a) => /privacy statement/i.test(a.innerText));
        const p = links[0] ? links[0].closest('p') : [...f.querySelectorAll('p')].find((x) => /accordance with our/i.test(x.innerText));
        return {
            sentence: p ? p.innerText.replace(/\s+/g, ' ').trim() : null,
            links: links.map((a) => ({text: a.innerText.trim(), hrefAttr: a.getAttribute('href'), href: a.href, target: a.getAttribute('target')})),
        };
    });
}

/**
 * Press the tab's "privacy statement" link and read the page it opens in a new browser tab:
 * the address, the answer's status, the title and the heading. Null when there is no link.
 */
async function openPrivacyLink(page, profile, tab) {
    const link = profile.form(tab).getByRole('link', {name: 'privacy statement', exact: true});
    if (!(await link.count())) return null;
    const ctx = page.context();
    const answers = [];
    const onResponse = (r) => {
        if (r.request().isNavigationRequest() && /\/about\/privacy/.test(r.url())) answers.push({url: rel(r.url()), status: r.status()});
    };
    ctx.on('response', onResponse);
    try {
        const popupP = ctx.waitForEvent('page', {timeout: T});
        await link.click();
        const popup = await popupP;
        await popup.waitForLoadState('domcontentloaded', {timeout: T}).catch(() => {});
        await sleep(500);
        const read = await popup.evaluate(() => ({
            title: document.title,
            h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()).filter(Boolean),
            text: (document.querySelector('main, .page, .pkp_structure_main, body') || document.body).innerText.replace(/\s+/g, ' ').trim().slice(0, 400),
        }));
        const out = {url: rel(popup.url()), answers: answers.slice(), ...read};
        await popup.close();
        return out;
    } finally {
        ctx.off('response', onResponse);
    }
}

/**
 * Every tab of the open profile: its sentence and link (all tabs), and the page the link opens
 * (the tabs named in `open`).
 */
async function walkTabs(page, profile, {open = ['identity', 'apiKey']} = {}) {
    const out = {};
    for (const tab of TABS) {
        if (tab !== 'identity') await profile.open(tab);
        await idle(page).catch(() => {});
        const row = {privacy: await readPrivacy(page, profile, tab)};
        if (open.includes(tab)) row.opened = await openPrivacyLink(page, profile, tab);
        out[tab] = row;
    }
    return out;
}

/** The Roles tab's list of contexts, as text (proves the page is the site-level one). */
async function rolesText(page, profile) {
    await profile.open('roles');
    return flat(await profile.form('roles').innerText().catch(() => null), 600);
}

/** Step 7: Administration › Site Settings › "Site Setup" › "Information" › "Privacy Statement", typed and saved. */
async function setSitePrivacy(page, text) {
    const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
    const site = new SiteSettingsPage(page);
    await site.gotoFromAdministration();
    const form = await site.information();
    await form.typeRich(form.privacyId('en'), text);
    const r = await form.pressSave();
    await idle(page).catch(() => {});
    return {status: r.status(), saved: await form.savedStatus.isVisible().catch(() => false)};
}

/** Reach: Settings › Website › "Setup" › "Privacy Statement" of a context, its English box emptied and saved. */
async function emptyContextPrivacy(page, contextPath) {
    const {SettingsPages} = require('../../../pages/ContextIdentityPages.js');
    const settings = new SettingsPages(page, contextPath, {locale: 'en'});
    const form = await settings.openWebsiteSetupTab('privacy');
    await form.typeRich('privacy-privacyStatement-control-en', '');
    const r = await form.pressSave();
    await idle(page).catch(() => {});
    return {status: r.status(), saved: await form.savedStatus.isVisible().catch(() => false)};
}

module.exports = {TABS, secondContext, createSecondContext, openProfile, readPrivacy, openPrivacyLink, walkTabs, rolesText, setSitePrivacy, emptyContextPrivacy, flat};
