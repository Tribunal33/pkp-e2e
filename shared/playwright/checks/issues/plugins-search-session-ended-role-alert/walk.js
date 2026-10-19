// U01 A16 (docs/specs/U01-login-and-sessions.md), the older lists' part: once a session has ended,
// a search on Settings › Website › "Plugins" left open in a tab raises the alert "The current role
// does not have access to this operation." instead of leading to the Login page.
// The issue report's Steps, through the screens on PKP's default dataset in two browsers: B holds
// `dbarnes`'s Plugins list, A (`admin`) ends every session with "Expire User Sessions".
//
//   H19I_MODE=walk (default)  the Steps: B opens Plugins; A expires the sessions; B presses
//                             "Search" (with "h19i" typed), "OK", "Search" again; B reloads
//   H19I_MODE=nb              the neighbour (fix in and out): with B's session alive, a search
//                             answers with its list and no alert; then, after A expires the
//                             sessions, two other requests of B's open pages that pass the same
//                             refusal: a Profile tab press ("Contact") and a submission file's
//                             link (a browser navigation, not a script's request; submission 1's
//                             Submission files, OJS and OMP only)
//   H19I_MODE=form            "Saving a form": B types a phone number on Profile › Contact; after A
//                             expires the sessions B presses "Save", then reloads (the way round),
//                             signs in again and reads Contact's "Phone" back
//
// Each mode starts from a freshly reset dataset fleet. Every dialog is answered "OK" and kept.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=…] [H19I_MODE=nb] node bin/probe.js <app|all> \
//        shared/playwright/checks/issues/plugins-search-session-ended-role-alert/walk.js
//      (stable-3_5_0: PKP_E2E_LINE=stable-3_5_0 in front, the line fleet's PROBE_FEATURE)
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.H19I_MODE || 'walk';
const NAME = `plugins-${MODE}`;

async function step(out, name, fn) {
    try {
        out[name] = await fn();
    } catch (e) {
        out[name] = {error: L.flat(String(e), 400)};
    }
    record(NAME, {[name]: out[name]}, {merge: true});
    return out[name];
}

/** What the Plugins list shows now (bounded reads: the page may be stuck). */
async function listState(page, plugins) {
    return {url: L.strip(page.url()),
        loginForm: await page.locator('form#login').count().catch(() => null),
        filterOpen: await plugins.list.filterForm.isVisible().catch(() => null),
        boxValue: await plugins.list.nameBox.inputValue({timeout: 1000}).catch(() => null),
        rows: await plugins.list.pluginRows.count().catch(() => null),
        spinner: await plugins.list.grid.locator('.pkp_spinner:visible').count().catch(() => null)};
}

/** Show the search box if hidden, type `text` and press the "Search" button under it. */
async function search(plugins, text) {
    if (!(await plugins.list.filterForm.isVisible().catch(() => false))) await plugins.list.searchLink.click({timeout: 5000});
    await plugins.list.nameBox.fill('', {timeout: 5000});
    await plugins.list.nameBox.pressSequentially(text, {delay: 20});
    await plugins.list.filterButton.click({timeout: 5000});
}

forEachApp(async (app) => {
    const T = app.contextPath;
    const {WebsitePluginsPage} = require('../../../pages/PluginsPages.js');
    const out = {line: app.line || 'main', mode: MODE};
    const A = await launch(app);
    const B = await launch(app);
    const w = L.watchContext(B.context);
    try {
        if (MODE === 'form') {
            // "Saving a form": a phone number typed on Profile › Contact, the session ended, "Save", then the
            // way round (a reload), a new sign-in, and what Contact holds
            const {ProfilePage} = require('../../../pages/ProfilePage.js');
            await signIn(B.page, 'dbarnes', {contextPath: T});
            const prof = new ProfilePage(B.page, T);
            await step(out, 'form-B-typed', async () => {
                await prof.goto('contact');
                const box = prof.form('contact').locator('input[name="phone"]');
                const before = await box.inputValue();
                await box.click();
                await box.pressSequentially('555 0119', {delay: 20});
                return {before, typed: await box.inputValue()};
            });
            await step(out, 'A-expire', () => L.expireSessions(A.page));
            await step(out, 'form-B-save', async () => {
                await B.page.bringToFront();
                const r = await L.act(w, B.context, 'form-save', () => prof.saveButton().click({timeout: 5000}), 5000);
                return {...r, state: await L.where(B.page),
                    phone: await B.page.locator('input[name="phone"]').first().inputValue({timeout: 1000}).catch(() => null),
                    snap: await L.snap(B.page, `${NAME}-B-save`)};
            });
            await step(out, 'form-B-reload', async () => {
                const r = await L.act(w, B.context, 'form-reload', () => B.page.reload({timeout: 20000}), 1500);
                return {...r, state: await L.where(B.page)};
            });
            await step(out, 'form-B-again', async () => {
                await signIn(B.page, 'dbarnes', {contextPath: T});
                await prof.goto('contact');
                return {phone: await prof.form('contact').locator('input[name="phone"]').inputValue(),
                    snap: await L.snap(B.page, `${NAME}-B-again`)};
            });
            return;
        }

        // Step 1: B signs in as dbarnes, Settings › Website › Plugins
        await signIn(B.page, 'dbarnes', {contextPath: T});
        const plugins = new WebsitePluginsPage(B.page, T);
        await step(out, 'B-plugins', async () => {
            await plugins.goto();
            return {...(await listState(B.page, plugins)), snap: await L.snap(B.page, `${NAME}-B-plugins`)};
        });

        if (MODE === 'nb') {
            // control: the session alive, a search answers with the filtered list
            await step(out, 'nb-alive-search', async () => {
                const r = await L.act(w, B.context, 'alive-search', () => search(plugins, 'Crossref'), 4000);
                return {...r, state: await listState(B.page, plugins), snap: await L.snap(B.page, `${NAME}-alive-search`)};
            });
            // B's other open pages: the Profile, and a workflow with a submission file's link
            const prof = await B.context.newPage();
            const flow = await B.context.newPage();
            await step(out, 'nb-B-open', async () => {
                await prof.goto(`/index.php/${T}/en/user/profile`);
                await prof.locator('#profileTabs').waitFor({timeout: 20000});
                if (app.name === 'ops') return {profile: L.strip(prof.url()), link: null};
                await flow.goto(`/index.php/${T}/en/dashboard/editorial?workflowSubmissionId=1&workflowMenuKey=workflow_1`);
                const link = flow.locator('a[href*="file-api/download-file"]').first();
                await link.waitFor({timeout: 30000});
                return {profile: L.strip(prof.url()), link: L.flat(await link.innerText(), 120),
                    href: L.strip(await link.getAttribute('href')), target: await link.getAttribute('target')};
            });
            await step(out, 'A-expire', () => L.expireSessions(A.page));
            await step(out, 'nb-B-profile-contact', async () => {
                await prof.bringToFront();
                const r = await L.act(w, B.context, 'profile-contact',
                    () => prof.locator('#profileTabs > ul a').filter({hasText: 'Contact'}).first().click({timeout: 5000}), 5000);
                return {...r, state: await L.where(prof),
                    selectedTab: L.flat(await prof.locator('#profileTabs > ul > li[aria-selected="true"]').first().innerText({timeout: 1000}).catch(() => null), 40),
                    snap: await L.snap(prof, `${NAME}-profile-contact`)};
            });
            // OPS: submission 1's workflow opens on its posted preprint, with no file link: not driven there
            if (app.name !== 'ops') await step(out, 'nb-B-file-link', async () => {
                await flow.bringToFront();
                // the workflow's own background requests may have opened a window by now: "OK", as a person would
                await L.sleep(1500);
                const win = flow.getByRole('dialog').filter({has: flow.getByRole('button', {name: 'OK', exact: true})}).last();
                let windowFirst = null;
                if (await win.isVisible().catch(() => false)) {
                    windowFirst = L.flat(await win.innerText().catch(() => ''), 200);
                    await win.getByRole('button', {name: 'OK', exact: true}).click({timeout: 5000}).catch(() => {});
                    await L.sleep(800);
                }
                out.fileLinkWindowFirst = windowFirst;
                let opened = null;
                const r = await L.act(w, B.context, 'file-link', async () => {
                    const popup = B.context.waitForEvent('page', {timeout: 10000}).catch(() => null);
                    await flow.locator('a[href*="file-api/download-file"]').first().click({timeout: 5000});
                    opened = await popup;
                }, 5000);
                const target = opened || flow;
                return {...r, windowFirst, newTab: !!opened, state: await L.where(target),
                    snap: await L.snap(target, `${NAME}-file-link`)};
            });
            return;
        }

        // Step 2: A (admin) presses "Expire User Sessions", "OK"
        await step(out, 'A-expire', async () => ({...(await L.expireSessions(A.page)), snap: await L.snap(A.page, `${NAME}-A-expired`)}));
        // Step 3: B, without reloading: "Search", type h19i, "Search"
        await step(out, 'B-search-1', async () => {
            const r = await L.act(w, B.context, 'search-1', () => search(plugins, 'h19i'), 5000);
            return {...r, state: await listState(B.page, plugins), snap: await L.snap(B.page, `${NAME}-B-search-1`)};
        });
        // Step 4: B presses "Search" again (the alert was answered "OK")
        await step(out, 'B-search-2', async () => {
            const r = await L.act(w, B.context, 'search-2', () => plugins.list.filterButton.click({timeout: 5000}), 5000);
            return {...r, state: await listState(B.page, plugins), snap: await L.snap(B.page, `${NAME}-B-search-2`)};
        });
        // Step 5: B reloads
        await step(out, 'B-reload', async () => {
            const r = await L.act(w, B.context, 'reload', () => B.page.reload({timeout: 20000}), 1500);
            return {...r, state: await L.where(B.page), snap: await L.snap(B.page, `${NAME}-B-reload`)};
        });
    } finally {
        out.allDialogs = w.dialogs;
        out.allErrors = w.errors;
        record(`${NAME}-summary`, out);
        await A.close().catch(() => {});
        await B.close().catch(() => {});
    }
});
