// U01 A16 (docs/specs/U01-login-and-sessions.md), the newer lists' part: once a session has ended,
// a search typed on Settings › Users & Roles left open in a tab opens a window headed "Error"
// reading "You are not authorized to access the requested resource." instead of leading to the
// Login page.
// The issue report's Steps, through the screens on PKP's default dataset in two browsers: B holds
// `dbarnes`'s Users & Roles page, A (`admin`) ends every session with "Expire User Sessions".
//
//   H19J_MODE=walk (default)  the Steps: B opens Users & Roles; A expires the sessions; B types
//                             "h19i" in the search box and presses Enter; B presses "OK"; B reloads
//   H19J_MODE=nb              the neighbour (fix in and out): with B's session alive, a search
//                             answers with its list and no window; then, after A expires the
//                             sessions, the dashboard's search (another list on the REST API) and
//                             a settings form's "Save" (Settings › Journal/Press/Server, "Masthead")
//   H19J_MODE=dash            "Searching the dashboard": B's dashboard left 15 s to settle, A expires
//                             the sessions, B's dashboard untouched for 30 s, then B searches
//                             "h19i", presses "OK" and reloads
//
// Each mode starts from a freshly reset dataset fleet. Every dialog is answered "OK" and kept.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=…] [H19J_MODE=nb] node bin/probe.js <app|all> \
//        shared/playwright/checks/issues/users-search-session-ended-error-window/walk.js
//      (stable-3_5_0: PKP_E2E_LINE=stable-3_5_0 in front, the line fleet's PROBE_FEATURE)
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.H19J_MODE || 'walk';
const NAME = `users-${MODE}`;

async function step(out, name, fn) {
    try {
        out[name] = await fn();
    } catch (e) {
        out[name] = {error: L.flat(String(e), 400)};
    }
    record(NAME, {[name]: out[name]}, {merge: true});
    return out[name];
}

/** The open "Error"-style window of `page`, if any: its text. */
async function windowText(page) {
    const dlg = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'OK', exact: true})}).last();
    return (await dlg.isVisible().catch(() => false)) ? L.flat(await dlg.innerText().catch(() => ''), 300) : null;
}

/** Press "OK" in the open window, as a person would; its text first. */
async function pressOk(page) {
    const dlg = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'OK', exact: true})}).last();
    const text = await windowText(page);
    if (text) await dlg.getByRole('button', {name: 'OK', exact: true}).click({timeout: 5000});
    return text;
}

/** The users list now: which list the line has, its window, its rows, the search box. */
async function usersState(page) {
    const box = page.getByRole('searchbox', {name: /Enter a user's name/});
    const grid = page.locator('[id^="component-grid-settings-user-usergrid"]').first();
    return {url: L.strip(page.url()),
        list: (await box.count()) ? 'vue' : ((await grid.count()) ? 'grid' : 'none'),
        loginForm: await page.locator('form#login').count().catch(() => null),
        window: await windowText(page),
        boxValue: await box.inputValue({timeout: 1000}).catch(() => null),
        heading: L.flat(await page.locator('main h2, main h3, main h4').filter({hasText: /Users/}).first().innerText({timeout: 1000}).catch(() => null), 60),
        rows: await page.locator('main table tbody tr').count().catch(() => null)};
}

/** Type `text` in the users search box as a person types, then Enter. */
async function search(page, text) {
    const box = page.getByRole('searchbox', {name: /Enter a user's name/});
    await box.click({timeout: 5000});
    await box.fill('');
    await box.pressSequentially(text, {delay: 25});
    await box.press('Enter');
}

forEachApp(async (app) => {
    const T = app.contextPath;
    const out = {line: app.line || 'main', mode: MODE};
    const A = await launch(app);
    const B = await launch(app);
    const w = L.watchContext(B.context);
    try {
        if (MODE === 'dash') {
            // "Searching the dashboard": B's dashboard settles (past its counts' 5-second throttle), A
            // expires the sessions, B's dashboard sits untouched for 30 s (any request, any window), then
            // B searches, presses "OK" and reloads
            await signIn(B.page, 'dbarnes', {contextPath: T});
            const box = B.page.getByRole('searchbox', {name: /^Search submissions/}).first();
            await step(out, 'dash-B-open', async () => {
                await B.page.goto(`/index.php/${T}/en/dashboard/editorial`);
                await box.waitFor({timeout: 30000});
                await L.sleep(15000);
                return {url: L.strip(B.page.url()), window: await windowText(B.page),
                    main: L.flat(await B.page.locator('main').first().innerText({timeout: 2000}).catch(() => null), 300)};
            });
            await step(out, 'A-expire', () => L.expireSessions(A.page));
            await step(out, 'dash-B-idle', async () => {
                const r = await L.act(w, B.context, 'dash-idle', () => L.sleep(30000), 500);
                return {...r, window: await windowText(B.page), state: await L.where(B.page)};
            });
            await step(out, 'dash-B-search', async () => {
                const r = await L.act(w, B.context, 'dash-search', async () => {
                    await box.click({timeout: 5000});
                    await box.pressSequentially('h19i', {delay: 25});
                    await box.press('Enter');
                }, 5000);
                return {...r, window: await windowText(B.page), state: await L.where(B.page), snap: await L.snap(B.page, `${NAME}-B-search`)};
            });
            await step(out, 'dash-B-ok', async () => {
                const pressed = await pressOk(B.page);
                await L.sleep(3000);
                return {pressed, windowAgain: await windowText(B.page), state: await L.where(B.page)};
            });
            await step(out, 'dash-B-reload', async () => {
                const r = await L.act(w, B.context, 'dash-reload', () => B.page.reload({timeout: 20000}), 1500);
                return {...r, state: await L.where(B.page)};
            });
            return;
        }

        // Step 1: B signs in as dbarnes, Settings › Users & Roles
        await signIn(B.page, 'dbarnes', {contextPath: T});
        await step(out, 'B-users', async () => {
            await B.page.goto(`/index.php/${T}/en/management/settings/access`);
            await B.page.getByRole('searchbox', {name: /Enter a user's name/}).or(B.page.locator('[id^="component-grid-settings-user-usergrid"]')).first().waitFor({timeout: 30000});
            await L.sleep(1500);
            return {...(await usersState(B.page)), snap: await L.snap(B.page, `${NAME}-B-users`)};
        });

        if (MODE === 'nb') {
            await step(out, 'nb-alive-search', async () => {
                const r = await L.act(w, B.context, 'alive-search', () => search(B.page, 'Barnes'), 4000);
                return {...r, state: await usersState(B.page), snap: await L.snap(B.page, `${NAME}-alive-search`)};
            });
            const dash = await B.context.newPage();
            const form = await B.context.newPage();
            const initials = form.locator('input[id^="masthead-acronym-control-en"]').first();
            await step(out, 'nb-B-open', async () => {
                await dash.goto(`/index.php/${T}/en/dashboard/editorial`);
                await dash.getByRole('searchbox', {name: /^Search submissions/}).first().waitFor({timeout: 30000});
                await form.goto(`/index.php/${T}/en/management/settings/context`);
                await initials.waitFor({timeout: 30000});
                const before = await initials.inputValue();
                await initials.fill('');
                await initials.pressSequentially('h19i', {delay: 20});
                return {dash: L.strip(dash.url()), form: L.strip(form.url()), initialsBefore: before, typed: await initials.inputValue()};
            });
            await step(out, 'A-expire', () => L.expireSessions(A.page));
            await step(out, 'nb-B-dashboard-search', async () => {
                await dash.bringToFront();
                // the dashboard's own background requests (its counts, refreshed when the tab is shown)
                // may have opened a window by now: what they sent, then "OK", as a person would
                const shown = await L.act(w, B.context, 'dashboard-shown', () => L.sleep(1500), 1500);
                const windowFirst = await pressOk(dash);
                out.dashboardShown = {...shown, windowFirst};
                record(NAME, {dashboardShown: out.dashboardShown}, {merge: true});
                const r = await L.act(w, B.context, 'dashboard-search', async () => {
                    const box = dash.getByRole('searchbox', {name: /^Search submissions/}).first();
                    await box.click({timeout: 5000});
                    await box.pressSequentially('h19i', {delay: 25});
                    await box.press('Enter');
                }, 5000);
                return {...r, state: await L.where(dash), window: await windowText(dash), snap: await L.snap(dash, `${NAME}-dashboard-search`)};
            });
            await step(out, 'nb-B-masthead-save', async () => {
                await form.bringToFront();
                const r = await L.act(w, B.context, 'masthead-save', () =>
                    form.locator('form.pkpForm').filter({has: initials}).first().getByRole('button', {name: 'Save', exact: true}).first().click({timeout: 5000}), 5000);
                return {...r, state: await L.where(form), window: await windowText(form),
                    typedStill: await initials.inputValue({timeout: 1000}).catch(() => null), snap: await L.snap(form, `${NAME}-masthead-save`)};
            });
            return;
        }

        // Step 2: A (admin) presses "Expire User Sessions", "OK"
        await step(out, 'A-expire', async () => ({...(await L.expireSessions(A.page)), snap: await L.snap(A.page, `${NAME}-A-expired`)}));
        // Step 3: B, without reloading, types h19i in the search box and presses Enter
        await step(out, 'B-search', async () => {
            const r = await L.act(w, B.context, 'search', () => search(B.page, 'h19i'), 5000);
            return {...r, state: await usersState(B.page), snap: await L.snap(B.page, `${NAME}-B-search`)};
        });
        // Step 4: B presses "OK", then reloads
        await step(out, 'B-ok', async () => {
            const text = await pressOk(B.page);
            await L.sleep(800);
            return {pressed: text, state: await usersState(B.page)};
        });
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
