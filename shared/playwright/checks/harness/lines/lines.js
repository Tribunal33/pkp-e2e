/**
 * @file shared/playwright/checks/harness/lines/lines.js
 *
 * The stable lines' smoke walk (harness.md "The stable lines"): per app,
 * sign in as the installer's `admin`, record Administration, create a
 * scratch context with a manager of its own, sign in as that manager and
 * record their dashboard and the context's settings page. On the lines
 * without the `_test` API (3.4, 3.3) the context comes from the kit's
 * lineScratchContext(); on `main` and 3.5 from the seed API.
 *
 *   PKP_E2E_LINE=stable-3_3_0 PROBE_FEATURE=issues-3_3 PROBE_AGENT=lines \
 *     node bin/probe.js all shared/playwright/checks/harness/lines/lines.js
 *
 * Needs the line's fleet up (fleet-prep --reset) and nothing else.
 */
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, tag, lineScratchContext} = require('../../../probe');

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        await page.goto(app.url('/index.php/index/admin'));
        await idle(page);
        const admin = await screen(page);
        record('admin', admin);
        await shot(page, 'admin');

        let scratch;
        if (app.testApi) {
            const path = tag('lines');
            await app.api.createContext({tag: path, users: [{username: `${path}mgr`, roles: ['manager']}]});
            scratch = {path, manager: {username: `${path}mgr`, password: `${path}mgr${path}mgr`}};
        } else {
            scratch = await lineScratchContext(app, page);
        }
        record('scratch', {line: app.line, ...scratch});
        await signOut(page);

        await signIn(page, scratch.manager.username, {password: scratch.manager.password, contextPath: scratch.path});
        await idle(page);
        record('manager-landing', await screen(page));
        await page.goto(app.url(`/index.php/${scratch.path}/management/settings/context`));
        await idle(page);
        record('manager-context-settings', await screen(page));
        await shot(page, 'manager-context-settings');
        await signOut(page);
        console.log(`[lines] ${app.name} on ${app.line}: admin page "${admin.title}", scratch ${scratch.path}, manager ${scratch.manager.username}`);
    } finally {
        await close();
    }
});
