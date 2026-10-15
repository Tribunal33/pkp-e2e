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
        if (MODE !== 'nbdl') await step(out, 'B-open', async () => {
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
        if (MODE !== 'save' && MODE !== 'nbdl') await step(out, 'B-contact-then-identity', async () => {
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

        if (MODE === 'nbdl') {
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
            // Step 5: B presses Roles (never opened in B)
            await step(out, 'B-roles', async () => {
                const r = await L.pressTabBounded(B.page, pB, 'roles', 5000);
                r.snap = await L.snap(B.page, 'walk-B-roles');
                return r;
            });
            // Step 6: B presses Contact (opened in step 2)
            await step(out, 'B-contact', async () => {
                const r = await L.pressTabBounded(B.page, pB, 'contact', 5000);
                r.snap = await L.snap(B.page, 'walk-B-contact', 5000);
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
        errors: (r.errors || []).map((e) => e.text).slice(0, 3),
        requests: (r.requests || []).filter((q) => /\$\$\$call|login|\/api\//.test(q.url)).slice(0, 4),
    });
    const summary = {};
    for (const k of Object.keys(out)) summary[k] = typeof out[k] === 'object' ? short(out[k]) : out[k];
    console.log(JSON.stringify({app: app.name, ...summary}, null, 1));
});
