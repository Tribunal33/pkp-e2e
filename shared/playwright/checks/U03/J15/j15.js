// U03 claim check J15 (housekeeping 2026-10-15, incidentals row L9): in the other browser of an
// account whose password (or email) was just changed, which presses raise a browser alert, and
// what does it read ("##user.authorization.userRequired##", a raw English key)?
//
// PKP's default dataset, `rvaca` (the manager), two browsers: A changes, B is the other one.
// B before the change: Profile opened on Identity, Contact pressed, Identity pressed again; a
// second page of B holds Settings › Website › Plugins (the legacy "Installed Plugins" grid).
// Modes, run one after the other in one process per app (each leaves the account as it found it):
//   pw     A saves a new password; B then presses Roles (never opened in B, the first request),
//          Contact (opened), Public, Password, Notifications, API Key, Identity; then "Save" on
//          the panel left showing; then the plugins grid's Search in the second page; B reloads.
//          A sets the password back.
//   pwrev  the same change; B's order reversed: the plugins Search first, then "Save", then the
//          tabs (Roles, Contact, Identity). A sets the password back.
//   email  A saves a new email address on Contact (a pending request); B as in pw. A cancels the
//          pending request.
// J15_MODES=pw,email narrows. Every dialog B's pages raise is answered OK and kept, by phase.
//
// Run (dataset fleet 3):
//   PROBE_FEATURE=issues-kc1 PKP_E2E_DATASET=3 PROBE_AGENT=kc1 PROBE_RUN=r1 \
//     bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U03/J15/j15.js
//   (stable-3_5_0: PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=issues-kc1-3_5, PROBE_RUN=s1)
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, note, tag} = require('../../../probe');

const USER = 'rvaca';
const CURRENT = 'rvacarvaca';
const NEXT = 'u03j15NewPass1';
const MODES = (process.env.J15_MODES || 'pw,pwrev,email').split(',');
const ALL_TABS = ['roles', 'contact', 'public', 'password', 'notifications', 'apiKey', 'identity'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 200);
const pages = (f) => require(path.join(__dirname, '../../../pages', f));

/** screen() + PNG, bounded: a page whose script is stuck still gets its PNG. */
async function snap(page, name, ms = 10000) {
    let s = null;
    try {
        s = await Promise.race([screen(page), sleep(ms).then(() => null)]);
    } catch (e) {
        s = {error: flat(String(e), 200)};
    }
    if (!s) {
        // screen() waits for jQuery, which a page whose session ended mid-request never reaches
        // (A25): the same reads, taken at once
        const main = page.locator('main').first();
        s = {url: page.url(), unsettled: true,
            aria: {main: await main.ariaSnapshot({timeout: 3000}).catch(() => null)},
            text: {main: await main.innerText({timeout: 3000}).catch(() => null)}};
    }
    record(name, s);
    await shot(page, name).catch(() => {});
    return s.unsettled ? `${name} (unsettled read: jQuery never idle)` : name;
}

/**
 * B's watch: every dialog, page error, console error and component/API/login response of the
 * browser context, each tagged with the phase running when it came.
 */
function watchContext(context) {
    const w = {phase: 'before', dialogs: [], errors: [], responses: []};
    const hook = (page) => {
        page.on('dialog', (d) => {
            w.dialogs.push({phase: w.phase, type: d.type(), message: d.message(), page: strip(page.url())});
            d.accept().catch(() => {});
        });
        page.on('pageerror', (e) => w.errors.push({phase: w.phase, kind: 'pageerror', text: flat(e.message || String(e), 300)}));
        page.on('console', (m) => { if (m.type() === 'error') w.errors.push({phase: w.phase, kind: 'console', text: flat(m.text(), 300)}); });
    };
    context.pages().forEach(hook);
    context.on('page', hook);
    context.on('response', (res) => {
        const u = res.url();
        if (!/\$\$\$call\$\$\$|\/api\/v1\/|\/login|\/user\/profile|\/management\//.test(u) || /\.(js|css|png|svg|woff2?)(\?|$)/.test(u)) return;
        const r = res.request();
        const e = {phase: w.phase, method: r.method(), url: strip(u), status: res.status(),
            type: (res.headers()['content-type'] || '').slice(0, 40), accept: (r.headers().accept || '').slice(0, 50)};
        if (res.status() >= 300 && res.status() < 400) e.location = strip(res.headers().location);
        w.responses.push(e);
    });
    return w;
}

/** What the Profile page shows now (bounded reads). */
async function profileState(page) {
    const panel = page.locator('#profileTabs .ui-tabs-panel[aria-hidden="false"]').first();
    return {
        url: strip(page.url()),
        selectedTab: flat(await page.locator('#profileTabs > ul > li[aria-selected="true"] > a').first().innerText({timeout: 2000}).catch(() => null), 40),
        panelForms: await panel.locator('form').evaluateAll((fs) => fs.map((f) => f.id)).catch(() => null),
        panelText: flat(await panel.innerText({timeout: 2000}).catch(() => null), 160),
        loginForm: await page.locator('form#login').count().catch(() => null),
        toast: flat(await page.locator('.app__notifications').first().innerText({timeout: 1000}).catch(() => ''), 200),
        spinner: await page.locator('#profileTabs .ui-tabs-panel[aria-hidden="false"] .pkp_spinner:visible').count().catch(() => null),
    };
}

/** One press in B: the phase's dialogs, responses and errors, and the screen after `ms`. */
async function press(w, name, page, fn, ms = 4000) {
    w.phase = name;
    const d0 = w.dialogs.length, e0 = w.errors.length, r0 = w.responses.length;
    let error = null;
    try {
        await fn();
    } catch (e) {
        error = flat(String(e), 200);
    }
    await sleep(ms);
    const out = {press: name, error,
        dialogs: w.dialogs.slice(d0).map((d) => `${d.type}: ${d.message}`),
        responses: w.responses.slice(r0).map((r) => `${r.method} ${r.status} ${r.url}${r.location ? ' -> ' + r.location : ''} [${r.type}]`),
        errors: w.errors.slice(e0).map((e) => `${e.kind}: ${e.text}`)};
    return out;
}

async function typeInto(box, text) {
    await box.click({timeout: 5000});
    await box.fill('');
    await box.pressSequentially(text, {delay: 5});
}

/** A: Password tab, three boxes typed, Save; the save's answer and the toast. */
async function changePassword(page, profile, from, to) {
    await profile.goto('password');
    const f = profile.form('password');
    await typeInto(f.locator('input[name="oldPassword"]'), from);
    await typeInto(f.locator('input[name="password"]'), to);
    await typeInto(f.locator('input[name="password2"]'), to);
    const answered = page.waitForResponse((r) => /profile-tab\/save-password/.test(r.url()), {timeout: 15000});
    await profile.saveButton().click();
    const res = await answered;
    await sleep(800);
    return {status: res.status(), toast: flat(await page.locator('.app__notifications').first().innerText().catch(() => ''), 200)};
}

forEachApp(async (app) => {
    const T = app.contextPath;
    const {ProfilePage} = pages('ProfilePage.js');
    const {WebsitePluginsPage} = pages('PluginsPages.js');
    const result = {app: app.name, line: app.line || 'main', modes: {}};
    for (const mode of MODES) {
        const out = {mode};
        result.modes[mode] = out;
        const A = await launch(app);
        const B = await launch(app);
        try {
            const w = watchContext(B.context);
            // B before the change: Profile (Identity), Contact, Identity; a second page on Plugins
            await signIn(B.page, USER, {contextPath: T});
            const pB = new ProfilePage(B.page, T);
            await pB.goto('identity');
            await pB.open('contact');
            await pB.open('identity');
            out.bBefore = await profileState(B.page);
            const p2 = await B.context.newPage();
            const plugins = new WebsitePluginsPage(p2, T);
            await plugins.goto();
            out.bPluginsBefore = {url: strip(p2.url()), rows: await p2.locator('tr.gridRow').count()};
            await snap(p2, `j15-${mode}-B-plugins-before`);
            await B.page.bringToFront();
            await snap(B.page, `j15-${mode}-B-before`);

            // A: the change
            await signIn(A.page, USER, {contextPath: T});
            const pA = new ProfilePage(A.page, T);
            let newEmail = null;
            w.phase = 'A-change';
            if (mode === 'email') {
                await pA.goto('contact');
                out.oldEmail = await pA.form('contact').locator('input[name="email"]').inputValue();
                newEmail = `${tag('u03j15')}@mailinator.com`;
                await typeInto(pA.form('contact').locator('input[name="email"]'), newEmail);
                const answered = A.page.waitForResponse((r) => /profile-tab\/save-contact/.test(r.url()), {timeout: 15000});
                await pA.saveButton().click();
                const res = await answered;
                await sleep(1500);
                out.aChange = {status: res.status(), newEmail,
                    pending: await pA.pendingEmailNotice().count().catch(() => null),
                    toast: flat(await A.page.locator('.app__notifications').first().innerText().catch(() => ''), 200)};
            } else {
                out.aChange = await changePassword(A.page, pA, CURRENT, NEXT);
            }
            await snap(A.page, `j15-${mode}-A-changed`);
            out.bBetween = w.responses.filter((r) => r.phase === 'A-change');

            // B after the change
            const steps = [];
            const tabPress = (tab) => press(w, `tab-${tab}`, B.page, () => pB.tabLink(tab).click({timeout: 5000}));
            const savePress = () => press(w, 'save', B.page, async () => {
                const form = B.page.locator('#profileTabs .ui-tabs-panel[aria-hidden="false"] form').first();
                const box = form.locator('input[name="preferredAvatarInitials"]');
                if (await box.count()) await typeInto(box, 'RJ');
                await B.page.locator('#profileTabs .ui-tabs-panel[aria-hidden="false"]').getByRole('button', {name: 'Save', exact: true}).first().click({timeout: 5000});
            }, 6000);
            const listPress = () => press(w, 'plugins-search', p2, async () => {
                await p2.bringToFront();
                await plugins.list.openFilter().catch(() => {});
                await plugins.list.nameBox.fill('u03j15', {timeout: 5000});
                await plugins.list.filterButton.click({timeout: 5000});
            }, 6000);
            const order = mode === 'pwrev'
                ? [listPress, savePress, () => tabPress('roles'), () => tabPress('contact'), () => tabPress('identity')]
                : [...ALL_TABS.map((t) => () => tabPress(t)), savePress, listPress];
            for (const fn of order) {
                const s = await fn();
                const onPlugins = s.press === 'plugins-search';
                s.state = onPlugins
                    ? {url: strip(p2.url()), filterVisible: await plugins.list.filterForm.isVisible().catch(() => null),
                        main: flat(await p2.locator('main').first().innerText({timeout: 2000}).catch(() => null), 200)}
                    : await profileState(B.page);
                s.snap = await snap(onPlugins ? p2 : B.page, `j15-${mode}-B-${s.press}`, 6000);
                if (!onPlugins) await B.page.bringToFront();
                steps.push(s);
            }
            out.bSteps = steps;

            // B reloads the Profile page
            const reload = await press(w, 'reload', B.page, async () => {
                await B.page.goto(pB.url('identity'), {timeout: 15000});
            }, 1500);
            reload.state = {url: strip(B.page.url()), loginForm: await B.page.locator('form#login').count()};
            reload.snap = await snap(B.page, `j15-${mode}-B-reload`);
            out.bReload = reload;
            out.bAllDialogs = w.dialogs;

            // A: control (its own tabs open) and putting the account back
            const aErr = [];
            A.page.on('pageerror', (e) => aErr.push(flat(e.message, 200)));
            await pA.open('roles');
            await pA.open('contact');
            out.aControl = {errors: aErr, selected: (await profileState(A.page)).selectedTab};
            if (mode === 'email') {
                await pA.cancelPendingEmail();
                out.aRestore = {email: await pA.form('contact').locator('input[name="email"]').inputValue(),
                    pending: await pA.pendingEmailNotice().count()};
            } else {
                out.aRestore = await changePassword(A.page, pA, NEXT, CURRENT);
            }
        } catch (e) {
            out.error = flat(String(e), 500);
        } finally {
            await A.close();
            await B.close();
        }
        record('j15', {[mode]: out}, {merge: true});
    }
    const brief = {};
    for (const [m, o] of Object.entries(result.modes)) {
        brief[m] = {error: o.error, aChange: o.aChange, aRestore: o.aRestore,
            steps: (o.bSteps || []).map((s) => ({press: s.press, dialogs: s.dialogs, errors: s.errors.slice(0, 2),
                calls: s.responses.slice(0, 4), selected: s.state && s.state.selectedTab, forms: s.state && s.state.panelForms,
                toast: s.state && s.state.toast, spinner: s.state && s.state.spinner, login: s.state && s.state.loginForm})),
            reload: o.bReload && o.bReload.state};
    }
    console.log(JSON.stringify({app: app.name, line: result.line, modes: brief}, null, 1));
    if (app.name === 'ojs' && (app.line || 'main') === 'main' && process.env.PROBE_RUN === 'r1') {
        note('J15 · after a password change elsewhere, B\'s page is stuck: never call idle()/open() in B; press the tab link and sleep; answer dialogs with your own page.on(\'dialog\') (alerts come from the later presses).');
    }
});
