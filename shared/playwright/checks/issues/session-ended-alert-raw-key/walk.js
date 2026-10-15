// U03 A26 (docs/specs/U03-user-profile.md): a Profile page whose session has ended answers each
// press on a tab or on "Save" with a browser alert reading "##user.authorization.userRequired##".
// The issue report's Steps, taken through the screens on PKP's default dataset in two browsers:
// B holds `dbarnes`'s Profile page, A ends B's session.
//
//   K16_MODE=walk (default)  "Ending the session from Administration": A is `admin`, who presses
//                            "Expire User Sessions"; B then presses "Save" on Identity (with "HK"
//                            typed in "Preferred Avatar Initials"), then "Contact", reloads, signs in
//                            again and reads the initials back
//   K16_MODE=pw              "After a password change": A is `dbarnes`, who saves a new password; B
//                            then presses "Roles" (the first request, U03 A25) and "Contact"
//   K16_MODE=nb              the neighbour (fix in and out): a signed-in Profile page's tabs and
//                            "Save" still work (Contact, Roles, Identity's "Save"), and a signed-out
//                            browser opening "Edit Profile" by its address still gets the Login page
//
// walk and pw each start from a freshly reset dataset fleet; nb changes nothing that matters.
// Every dialog B raises is answered "OK" and kept with its text.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=k16 [PROBE_RUN=…] [K16_MODE=pw] node bin/probe.js <app|all> \
//        shared/playwright/checks/issues/session-ended-alert-raw-key/walk.js
//      (stable-3_5_0: PKP_E2E_LINE=stable-3_5_0 in front, its own PROBE_FEATURE and PROBE_RUN)
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.K16_MODE || 'walk';
const USER = 'dbarnes';
const CURRENT = 'dbarnesdbarnes';
const NEXT = 'hkk16NewPass1';

async function step(out, name, fn) {
    try {
        out[name] = await fn();
    } catch (e) {
        out[name] = {error: L.flat(String(e), 400)};
    }
    record(MODE, {[name]: out[name]}, {merge: true});
    return out[name];
}

forEachApp(async (app) => {
    const T = app.contextPath;
    const out = {line: app.line || 'main', mode: MODE};
    const A = await launch(app);
    const B = await launch(app);
    try {
        // B: sign in as dbarnes, Edit Profile (Identity)
        await signIn(B.page, USER, {contextPath: T});
        const pB = L.profileOf(B.page, T);
        await step(out, 'B-open', async () => {
            await pB.goto('identity');
            return {...(await L.profileState(B.page)), snap: await L.snap(B.page, `${MODE}-B-open`)};
        });

        if (MODE === 'nb') {
            await step(out, 'nb-B-contact', () => L.press(B.page, () => pB.tabLink('contact').click({timeout: 5000})));
            await step(out, 'nb-B-roles', () => L.press(B.page, () => pB.tabLink('roles').click({timeout: 5000})));
            await step(out, 'nb-B-identity-save', async () => {
                await pB.tabLink('identity').click({timeout: 5000});
                await pB.form('identity').waitFor({timeout: 15000});
                return L.press(B.page, () => pB.saveButton().click({timeout: 5000}));
            });
            // a browser never signed in opens Edit Profile by its address
            await step(out, 'nb-A-signed-out-profile', async () => {
                const w = L.watch(A.page);
                const requests = await L.traffic(A.page, async () => {
                    await A.page.goto(`/index.php/${T}/en/user/profile`);
                    await A.page.waitForLoadState('load');
                });
                w.stop();
                return {requests, dialogs: w.dialogs, url: L.strip(A.page.url()), loginForm: await A.page.locator('form#login').count(),
                    snap: await L.snap(A.page, 'nb-A-signed-out-profile')};
            });
            return;
        }

        if (MODE === 'walk') {
            // Step 2: B types "HK" in "Preferred Avatar Initials", unsaved
            await step(out, 'B-type-initials', async () => {
                const box = pB.form('identity').locator('input[name="preferredAvatarInitials"]');
                const before = await box.inputValue();
                await box.click();
                await box.fill('');
                await box.pressSequentially('HK', {delay: 20});
                return {before, typed: await box.inputValue()};
            });
            // Steps 3-4: A signs in as admin, Administration, "Expire User Sessions", OK
            await signIn(A.page, 'admin');
            await step(out, 'A-expire', async () => {
                await A.page.goto('/index.php/index/en/admin');
                await A.page.waitForLoadState('load');
                const heading = L.flat(await A.page.locator('h1').first().innerText().catch(() => null), 80);
                const w = L.watch(A.page);
                await A.page.getByRole('button', {name: 'Expire User Sessions'}).click({timeout: 10000});
                await A.page.waitForLoadState('load');
                await L.sleep(1500);
                w.stop();
                return {adminHeading: heading, dialogs: w.dialogs, url: L.strip(A.page.url()), loginForm: await A.page.locator('form#login').count(),
                    snap: await L.snap(A.page, 'walk-A-expired')};
            });
            // Step 5: B presses "Save" under Identity
            await step(out, 'B-save', async () => {
                const r = await L.press(B.page, () => pB.saveButton().click({timeout: 5000}), 5000);
                r.snap = await L.snap(B.page, 'walk-B-save');
                return r;
            });
            // Step 6: B presses "Contact"
            await step(out, 'B-contact', async () => {
                const r = await L.press(B.page, () => pB.tabLink('contact').click({timeout: 5000}));
                r.snap = await L.snap(B.page, 'walk-B-contact');
                return r;
            });
            // Step 7: B reloads
            await step(out, 'B-reload', async () => {
                const w = L.watch(B.page);
                await B.page.reload();
                await B.page.waitForLoadState('load');
                w.stop();
                return {url: L.strip(B.page.url()), dialogs: w.dialogs, loginForm: await B.page.locator('form#login').count(),
                    snap: await L.snap(B.page, 'walk-B-reload')};
            });
            // Step 8: B signs in again, Edit Profile › Identity: the initials
            await step(out, 'B-again', async () => {
                await signIn(B.page, USER, {contextPath: T});
                await pB.goto('identity');
                return {initials: await pB.form('identity').locator('input[name="preferredAvatarInitials"]').inputValue(),
                    snap: await L.snap(B.page, 'walk-B-again')};
            });
        } else if (MODE === 'pw') {
            // A: dbarnes saves a new password
            await signIn(A.page, USER, {contextPath: T});
            const pA = L.profileOf(A.page, T);
            await step(out, 'A-change', async () => {
                await pA.goto('password');
                return L.changePassword(A.page, pA, CURRENT, NEXT);
            });
            // B: Roles (the first request after the change: U03 A25), then Contact
            await step(out, 'B-roles', async () => {
                const r = await L.press(B.page, () => pB.tabLink('roles').click({timeout: 5000}));
                r.snap = await L.snap(B.page, 'pw-B-roles', 6000);
                return r;
            });
            await step(out, 'B-contact', async () => {
                const r = await L.press(B.page, () => pB.tabLink('contact').click({timeout: 5000}));
                r.snap = await L.snap(B.page, 'pw-B-contact', 6000);
                return r;
            });
        }
    } finally {
        record(`${MODE}-summary`, out);
        await A.close().catch(() => {});
        await B.close().catch(() => {});
    }
});
