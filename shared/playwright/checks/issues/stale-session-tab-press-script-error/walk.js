// U03 A25 (docs/specs/U03-user-profile.md): after a password change, a Profile tab pressed in
// the account's other browser fails in the page's script instead of reaching the Login page.
// The issue report's Steps, taken through the screens on PKP's default dataset as `dbarnes`
// in two browsers (A changes the password, B is the other browser).
//
//   H15E_MODE=walk (default)  the Steps 1-7, the control in A, and a dashboard search in B (reach)
//   H15E_REACH=1              with walk: B also holds the editorial dashboard in a second page, opened
//                             before the change, and types a search there after step 6 (the API's reach;
//                             that page's own background requests can be the first to meet the ended
//                             session, so the Steps are walked without it)
//   H15E_MODE=nb              the neighbour: B holds the dashboard in a second page; after the change a
//                             search typed there is the first request of B (the API's answer to the
//                             ended session), then B's full page load still reaches the Login page and
//                             returns to the Profile after signing in with the new password, and A's
//                             own tabs keep opening (fix in and out)
//   H15E_MODE=save            reach: B types a phone number on Contact before the change and presses
//                             "Save" after it; then signs in again and reads the phone back
//   H15E_FIRST=<tab>          with walk: step 5 presses that tab instead of Roles (contact: a tab opened in
//                             step 2, whose area keeps its form)
//   H15E_MODE=list            the list group: B holds Settings › Website › Plugins (no Profile page); after
//                             the change B presses the list's "Search" with "hkk7" typed (the first request),
//                             then "Search" again, then reloads (U01 A16 is the later Search's alert)
//   H15E_MODE=vue             a newer (Vue) form: B holds Settings › Journal (Press, Server) › Masthead with
//                             "hkk7" typed over the initials; after the change B presses its "Save" (the
//                             first request, an API call by $.ajax); then B reloads, signs in with the new
//                             password and reads the initials back
//   H15E_MODE=nbdl            neighbour: B holds submission 7's workflow (Review) open; after the change
//                             B presses the review file's name (a link that opens a new tab), a plain
//                             browser navigation that must still reach the Login page (fix in and out)
//
// Each mode starts from a freshly reset dataset fleet (the password changes).
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=h15e [PROBE_RUN=…] [H15E_MODE=nb] node bin/probe.js <app|all> \
//        shared/playwright/checks/issues/stale-session-tab-press-script-error/walk.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib.js');

const USER = 'dbarnes';
const CURRENT = 'dbarnesdbarnes';
const NEXT = 'h15eNewPass1';
const MODE = process.env.H15E_MODE || 'walk';
const FIRST = process.env.H15E_FIRST || 'roles';
const REACH = (MODE === 'walk' && process.env.H15E_REACH === '1') || MODE === 'nb';

async function step(out, name, fn) {
    try {
        out[name] = await fn();
    } catch (e) {
        out[name] = {error: L.flat(String(e), 400)};
    }
    record(MODE, {[name]: out[name]}, {merge: true});
}

/** B's dashboard page: a search typed in the sidebar box (the list's own API fetch), and what shows. */
async function dashSearch(dash) {
    const errs = L.errorWatch(dash);
    const box = dash.getByRole('searchbox', {name: /^Search submissions/}).first();
    const requests = await L.traffic(dash, async () => {
        await box.click({timeout: 10000});
        await box.pressSequentially('h15e', {delay: 25});
        await box.press('Enter');
        await L.sleep(5000);
    });
    errs.stop();
    return {requests, errors: errs.list, url: dash.url(),
        heading: L.flat(await dash.locator('h1').first().innerText({timeout: 2000}).catch(() => null), 120),
        main: L.flat(await dash.locator('#app-main, main').first().innerText({timeout: 2000}).catch(() => null), 400),
        dialog: L.flat(await dash.locator('[role="dialog"]:visible').first().innerText({timeout: 2000}).catch(() => null), 300)};
}

/** B's Plugins list: show the filter if hidden, type "hkk7", press "Search"; what follows in `ms`. */
async function listSearch(page, plugins, ms = 6000) {
    const errs = L.errorWatch(page);
    const dialogs = [];
    const onDialog = (d) => { dialogs.push(L.flat(d.message(), 200)); d.accept().catch(() => {}); };
    page.on('dialog', onDialog);
    const requests = await L.traffic(page, async () => {
        if (!(await plugins.list.filterForm.isVisible().catch(() => false))) await plugins.list.searchLink.click({timeout: 5000});
        await plugins.list.nameBox.waitFor({timeout: 5000});
        const box = plugins.list.nameBox;
        await box.click();
        await box.fill('');
        await box.pressSequentially('hkk7', {delay: 20});
        await plugins.list.filterButton.click({timeout: 5000});
        await L.sleep(ms);
    }).catch((e) => [{error: L.flat(String(e), 300)}]);
    page.off('dialog', onDialog);
    errs.stop();
    return {requests, errors: errs.list, dialogs, url: page.url(),
        loginForm: await page.locator('form#login').count().catch(() => null),
        filterVisible: await plugins.list.filterForm.isVisible().catch(() => null),
        nameBox: await plugins.list.nameBox.inputValue({timeout: 1000}).catch(() => null),
        spinners: await page.locator('.pkp_spinner:visible').count().catch(() => null),
        rows: await plugins.list.pluginRows.count().catch(() => null),
        toast: await L.toastNow(page)};
}

forEachApp(async (app) => {
    const T = app.contextPath;
    const out = {line: app.line || 'main', mode: MODE};
    const A = await launch(app);
    const B = await launch(app);
    try {
        // Step 1: B signs in and opens Edit Profile (Identity)
        await signIn(B.page, USER, {contextPath: T});
        let dash = null;
        if (REACH) {
            // reach: a second page of B on the dashboard, opened before the change
            dash = await B.context.newPage();
            await step(out, 'B-dashboard-before', async () => {
                await dash.goto(`/index.php/${T}/en/dashboard/editorial`);
                await dash.waitForLoadState('networkidle', {timeout: 15000}).catch(() => {});
                return {url: dash.url(), heading: L.flat(await dash.locator('h1').first().innerText().catch(() => null), 120)};
            });
        }
        const pB = L.profileOf(B.page, T);
        if (MODE === 'nbdl') await step(out, 'dl-B-workflow', async () => {
            await B.page.goto(`/index.php/${T}/en/dashboard/editorial?workflowSubmissionId=7&workflowMenuKey=workflow_3`);
            const link = B.page.locator('a[href*="file-api/download-file"]').first();
            await link.waitFor({timeout: 30000});
            await L.sleep(2000);
            return {url: B.page.url(), link: L.flat(await link.innerText(), 120), href: (await link.getAttribute('href')).replace(/^https?:\/\/[^/]+/, ''), target: await link.getAttribute('target')};
        });
        let plugins = null;
        if (MODE === 'list') await step(out, 'list-B-plugins', async () => {
            const {WebsitePluginsPage} = require('../../../pages/PluginsPages.js');
            plugins = new WebsitePluginsPage(B.page, T);
            await plugins.goto();
            return {url: B.page.url(), rows: await plugins.list.pluginRows.count(), snap: await L.snap(B.page, 'list-B-before')};
        });
        const mastheadUrl = `/index.php/${T}/en/management/settings/context`;
        const initials = B.page.locator('input[id^="masthead-acronym-control-en"]').first();
        const masthead = B.page.locator('form.pkpForm').filter({has: initials}).first();
        if (MODE === 'vue') await step(out, 'vue-B-typed', async () => {
            await B.page.goto(mastheadUrl);
            await initials.waitFor({timeout: 30000});
            const before = await initials.inputValue();
            await initials.click();
            await initials.fill('');
            await initials.pressSequentially('hkk7', {delay: 20});
            return {url: B.page.url(), before, typed: await initials.inputValue(), snap: await L.snap(B.page, 'vue-B-typed')};
        });
        if (MODE !== 'nbdl' && MODE !== 'list' && MODE !== 'vue') await step(out, 'B-open', async () => {
            await pB.goto('identity');
            return L.profileState(B.page, pB);
        });
        if (MODE === 'save') {
            await step(out, 'save-B-typed', async () => {
                await pB.open('contact');
                const box = pB.form('contact').locator('input[name="phone"]');
                await box.click();
                await box.pressSequentially('555 0115', {delay: 10});
                return {phone: await box.inputValue()};
            });
        }
        // Step 2: B presses Contact, then Identity
        if (MODE !== 'save' && MODE !== 'nbdl' && MODE !== 'list' && MODE !== 'vue') await step(out, 'B-contact-then-identity', async () => {
            await pB.open('contact');
            await pB.open('identity');
            return L.profileState(B.page, pB);
        });

        // Step 3-4: A signs in, opens Password and saves a new password
        await signIn(A.page, USER, {contextPath: T});
        const pA = L.profileOf(A.page, T);
        await step(out, 'A-change', async () => {
            await pA.goto('password');
            const r = await L.changePassword(A.page, pA, CURRENT, NEXT);
            return {...r, snap: await L.snap(A.page, `${MODE}-A-saved`)};
        });

        if (MODE === 'vue') {
            await step(out, 'vue-B-save', async () => {
                await B.page.bringToFront();
                const errs = L.errorWatch(B.page);
                const dialogs = [];
                const onDialog = (d) => { dialogs.push(L.flat(d.message(), 200)); d.accept().catch(() => {}); };
                B.page.on('dialog', onDialog);
                const statuses = new Set();
                const requests = await L.traffic(B.page, async () => {
                    await masthead.getByRole('button', {name: 'Save', exact: true}).first().click({timeout: 5000});
                    for (let i = 0; i < 20; i++) {
                        const t = L.flat(await masthead.locator('.pkpFormPage__status').first().innerText({timeout: 200}).catch(() => ''), 80);
                        if (t) statuses.add(t);
                        const n = await L.toastNow(B.page);
                        if (n) statuses.add(`notice: ${n}`);
                        await L.sleep(300);
                    }
                });
                B.page.off('dialog', onDialog);
                errs.stop();
                return {requests, errors: errs.list, dialogs, url: B.page.url(),
                    loginForm: await B.page.locator('form#login').count().catch(() => null),
                    initials: await initials.inputValue({timeout: 1000}).catch(() => null),
                    statuses: [...statuses],
                    toast: await L.toastNow(B.page),
                    windows: L.flat(await B.page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').first().innerText({timeout: 1000}).catch(() => null), 300),
                    snap: await L.snap(B.page, 'vue-B-save', 6000)};
            });
            await step(out, 'vue-B-reread', async () => {
                await B.page.goto(mastheadUrl, {timeout: 15000}).catch(() => {});
                const atLogin = await B.page.locator('form#login').count();
                if (atLogin) {
                    await B.page.locator('input#username').fill(USER);
                    await B.page.locator('input#password').fill(NEXT);
                    await B.page.locator('form#login button[type="submit"]').click();
                    await B.page.waitForURL(/settings\/context/, {timeout: 20000}).catch(() => {});
                }
                await initials.waitFor({timeout: 30000}).catch(() => {});
                return {atLogin, url: B.page.url(), initials: await initials.inputValue({timeout: 5000}).catch(() => null)};
            });
        } else if (MODE === 'list') {
            // B's first request after the change: the list's Search
            await step(out, 'list-B-search1', async () => {
                const r = await listSearch(B.page, plugins);
                r.snap = await L.snap(B.page, 'list-B-search1', 6000);
                return r;
            });
            // a second Search (the session has ended by now: U01 A16)
            await step(out, 'list-B-search2', async () => {
                const r = await listSearch(B.page, plugins);
                r.snap = await L.snap(B.page, 'list-B-search2', 6000);
                return r;
            });
            await step(out, 'list-B-reload', async () => {
                await B.page.goto(plugins.url(), {timeout: 15000}).catch(() => {});
                await B.page.waitForLoadState('load', {timeout: 15000}).catch(() => {});
                return {url: B.page.url(), loginForm: await B.page.locator('form#login').count(), snap: await L.snap(B.page, 'list-B-reload')};
            });
        } else if (MODE === 'nbdl') {
            await step(out, 'dl-B-press', async () => {
                const errs = L.errorWatch(B.page);
                let popup = null;
                const t = await L.contextTraffic(B.context, async () => {
                    const opened = B.context.waitForEvent('page', {timeout: 10000}).catch(() => null);
                    const download = B.page.waitForEvent('download', {timeout: 8000}).catch(() => null);
                    await B.page.locator('a[href*="file-api/download-file"]').first().click({timeout: 5000});
                    popup = await opened;
                    if (popup) await popup.waitForLoadState('load', {timeout: 15000}).catch(() => {});
                    await L.sleep(3000);
                    return {download: await Promise.race([download, L.sleep(100).then(() => null)])};
                });
                errs.stop();
                const shown = popup || B.page;
                const out2 = {requests: t.requests.filter((q) => /\$\$\$call|login|\/api\//.test(q.url)).slice(0, 8), errors: errs.list,
                    download: t.value.download ? t.value.download.suggestedFilename() : null,
                    newTab: !!popup, url: shown.url(), loginForm: await shown.locator('form#login').count().catch(() => null),
                    body: L.flat(await shown.locator('body').innerText({timeout: 3000}).catch(() => null), 200)};
                if (popup) out2.snap = await L.snap(popup, 'nbdl-B-tab', 8000);
                return out2;
            });
        } else if (MODE === 'save') {
            await step(out, 'save-B', async () => {
                const errs = L.errorWatch(B.page);
                const requests = await L.traffic(B.page, async () => {
                    await pB.saveButton().click({timeout: 5000});
                    await L.sleep(5000);
                });
                errs.stop();
                return {requests, errors: errs.list, state: await L.profileState(B.page, pB),
                    phone: await pB.form('contact').locator('input[name="phone"]').inputValue({timeout: 2000}).catch(() => null),
                    snap: await L.snap(B.page, 'save-B-after', 5000)};
            });
            await step(out, 'save-B-reread', async () => {
                await B.page.goto(pB.url('contact'));
                await B.page.locator('input#username').fill(USER);
                await B.page.locator('input#password').fill(NEXT);
                await B.page.locator('form#login button[type="submit"]').click();
                await B.page.locator('form#contactForm').waitFor({timeout: 20000}).catch(() => {});
                return {url: B.page.url(), phone: await B.page.locator('form#contactForm input[name="phone"]').inputValue({timeout: 5000}).catch(() => null)};
            });
        } else if (MODE === 'walk') {
            // Step 5: B presses Roles (never opened in B), or H15E_FIRST's tab
            await step(out, `B-${FIRST}`, async () => {
                const r = await L.pressTabBounded(B.page, pB, FIRST, 5000);
                r.snap = await L.snap(B.page, `walk-B-${FIRST}`);
                return r;
            });
            // Step 6: B presses Contact (opened in step 2), or Roles when step 5 pressed Contact
            const second = FIRST === 'contact' ? 'roles' : 'contact';
            const dialogs = [];
            const onDialog = (d) => { dialogs.push(L.flat(d.message(), 200)); d.accept().catch(() => {}); };
            B.page.on('dialog', onDialog);
            await step(out, `B-${second}-2`, async () => {
                const r = await L.pressTabBounded(B.page, pB, second, 5000);
                r.dialogs = [...dialogs];
                r.snap = await L.snap(B.page, `walk-B-${second}-2`, 5000);
                return r;
            });
            // reach: B's dashboard page, a search typed in its sidebar box (the list's own fetch)
            if (REACH) await step(out, 'B-dashboard-search', () => dashSearch(dash));
            // Step 7: B reloads
            await step(out, 'B-reload', async () => {
                const requests = await L.traffic(B.page, async () => {
                    await B.page.reload();
                    await B.page.waitForLoadState('load', {timeout: 15000}).catch(() => {});
                });
                return {requests: requests.slice(0, 6), url: B.page.url(), loginForm: await B.page.locator('form#login').count(),
                    snap: await L.snap(B.page, 'walk-B-reload')};
            });
        } else {
            // Neighbour: B's first request after the change is an API call of its dashboard page
            await step(out, 'nb-B-api', () => dashSearch(dash));
            // B's full page load still reaches the Login page and, after signing in
            // with the new password there, returns to the Profile page
            await step(out, 'nb-B-load', async () => {
                const requests = await L.traffic(B.page, async () => {
                    await B.page.goto(pB.url('contact'));
                    await B.page.waitForLoadState('load', {timeout: 15000}).catch(() => {});
                });
                return {requests: requests.slice(0, 6), url: B.page.url(), loginForm: await B.page.locator('form#login').count(),
                    snap: await L.snap(B.page, 'nb-B-load')};
            });
            await step(out, 'nb-B-signin', async () => {
                await B.page.locator('input#username').fill(USER);
                await B.page.locator('input#password').fill(NEXT);
                await B.page.locator('form#login button[type="submit"]').click();
                await B.page.waitForURL(/user\/profile/, {timeout: 20000}).catch(() => {});
                await B.page.locator('#profileTabs').waitFor({timeout: 15000}).catch(() => {});
                return {url: B.page.url(), state: await L.profileState(B.page, pB), snap: await L.snap(B.page, 'nb-B-signedin')};
            });
        }

        // Control: A, the session that made the change, keeps opening tabs
        await step(out, 'A-control', async () => {
            const errs = L.errorWatch(A.page);
            await pA.open('contact');
            await pA.open('roles');
            errs.stop();
            return {errors: errs.list, state: await L.profileState(A.page, pA)};
        });
    } finally {
        await A.close();
        await B.close();
    }
    const short = (r) => r && (r.error ? {error: r.error} : {
        url: (r.state || r).url, selected: (r.state || {}).selectedTab, panelForms: (r.state || {}).panelForms,
        login: (r.state || r).loginForm, toast: (r.state || {}).toast,
        errors: (r.errors || []).map((e) => e.text).slice(0, 3), dialogs: r.dialogs,
        filterVisible: r.filterVisible, spinners: r.spinners, rows: r.rows,
        initials: r.initials, statuses: r.statuses, windows: r.windows, atLogin: r.atLogin,
        requests: (r.requests || []).filter((q) => /\$\$\$call|login|\/api\//.test(q.url)).slice(0, 4),
    });
    const summary = {};
    for (const k of Object.keys(out)) summary[k] = typeof out[k] === 'object' ? short(out[k]) : out[k];
    console.log(JSON.stringify({app: app.name, ...summary}, null, 1));
});
