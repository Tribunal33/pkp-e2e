// @ts-check
/**
 * @file playwright/tests/serial/U03-user-profile.spec.js
 *
 * User profile — OJS suite, serial part: scenario 13 (common). Scenarios
 * 1–12 run in the parallel project, `../U03-user-profile.spec.js`.
 * Spec: docs/specs/U03-user-profile.md
 *
 * Serial project (PRINCIPLES A7, A9): scenario 13 ticks the site's "Check
 * passwords against compromised password databases" (Administration › Site
 * Settings › Site Setup › Security), one record every worker, fleet page
 * and scratch journal shares, so it cannot run beside the parallel suites.
 * The serial U60 suite ticks the same box; both run in the serial chain,
 * one test at a time. The test puts the box back unticked whatever the
 * outcome: its control unticks it on the screen, and a `finally` sends the
 * site's own Security save with the install values (`putSite`,
 * `SITE_INSTALL.security`) whenever the box may still be ticked. The ticked
 * check asks Have I Been Pwned over the network (the installs carry no
 * local list; spec note g), so this test needs the network, which the VM
 * and CI have.
 *
 * Not asserted here, by register ID: A7, A11, A22 (the spec's Coverage
 * section is the record of the rest).
 *
 * Seeding (fn-s): a scratch journal from `POST scenarios/context` with a
 * throwaway Author (a short password of its own, under the boxes' 32
 * characters, A7); the Site Administrator is `admin`, through `asUser` (it
 * only opens Site Settings). The Author signs in through the journal's real
 * Login form in a fresh browser context, because the control changes its
 * password. No hard-coded waits.
 */
const {test, expect} = require('../../support/fixtures.js');
const {LoginPage} = require('../../../../../shared/playwright/pages/LoginPage.js');
const {ProfilePage, SAVED_MESSAGE} = require('../../../../../shared/playwright/pages/ProfilePage.js');
const {SiteSettingsPage, SITE_INSTALL, putSite} = require('../../../../../shared/playwright/pages/SiteSettingsPages.js');

const ERRORS_HEADING = 'Errors occurred processing this form';
const LEAKED = 'This password has appeared in data leaks. Please choose a different, strong password.';
const PASSWORDS_MISMATCH = 'The passwords do not match.';
/** The leaked password the fleets refuse, and its mismatching repeat (fn-s; seed-facts). */
const LEAKED_PASSWORD = 'qwerty123456';
const OTHER_REPEAT = 'qwerty654321';

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u03${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** Fresh UI login on a journal's Login page, in its own context (never the .auth cache). */
async function freshLogin(browser, baseURL, contextPath, username, password) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    const page = await context.newPage();
    await page.goto(`/index.php/${contextPath}/login`);
    await new LoginPage(page).signIn(username, password);
    return {context, page};
}

test.describe('user profile (serial)', () => {
    test('S13: a leaked password refused on the Password tab', async ({browser, baseURL, ojsApi, asUser}, testInfo) => {
        test.slow();
        const tag = makeTag('s13', testInfo);
        const username = `${tag}au`;
        const current = `pw${tag}`;
        await ojsApi.createContext({
            tag,
            users: [{username, givenName: 'Lea', familyName: 'Leaked', roles: ['author'], password: current}],
        });

        const author = await freshLogin(browser, baseURL, tag, username, current);
        const adminPage = await (await asUser('admin')).newPage();
        const site = new SiteSettingsPage(adminPage);
        let ticked = false;
        try {
            // Given: the Site Administrator ticks "Check passwords against
            // compromised password databases" on Site Setup › Security (fn-s).
            await site.goto();
            const security = await site.security();
            await expect(security.compromisedCheck).not.toBeChecked();
            ticked = true;
            await security.compromisedCheck.check();
            await security.save();
            await expect(security.compromisedCheck).toBeChecked();

            const profile = new ProfilePage(author.page, tag);
            await profile.goto('password');

            // A leaked password typed twice: the notice with the data-leaks
            // sentence, the same sentence under "New password" in place of
            // the hint, and the three boxes emptied (Rule 10a).
            await profile.fillPasswords({current, next: LEAKED_PASSWORD});
            await profile.save();
            await expect(profile.passwordErrorNotice()).toContainText(ERRORS_HEADING);
            await expect(profile.passwordErrorNotice()).toContainText(LEAKED);
            await expect(profile.newPasswordSubLabel()).toHaveText(LEAKED);
            await expect(profile.currentPassword()).toHaveValue('');
            await expect(profile.newPassword()).toHaveValue('');
            await expect(profile.repeatPassword()).toHaveValue('');

            // The leaked password with a different repeat: "The passwords do
            // not match." in the notice and under "New password", with no
            // sentence about data leaks (Rule 10a; the leak refusal just
            // above, read the same way, is the control).
            await profile.fillPasswords({current, next: LEAKED_PASSWORD, repeat: OTHER_REPEAT});
            await profile.save();
            await expect(profile.passwordErrorNotice()).toContainText(PASSWORDS_MISMATCH);
            await expect(profile.newPasswordSubLabel()).toHaveText(PASSWORDS_MISMATCH);
            await expect(profile.passwordErrorNotice()).not.toContainText(LEAKED);
            await expect(profile.form('password').getByText(LEAKED)).toHaveCount(0);

            // Control: the Site Administrator unticks the box on the same
            // screen and saves; the same leaked password typed twice goes
            // through, saved at the top right (Settings, "Site password
            // policy").
            await security.compromisedCheck.uncheck();
            await security.save();
            await expect(security.compromisedCheck).not.toBeChecked();
            ticked = false;
            await profile.fillPasswords({current, next: LEAKED_PASSWORD});
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            await expect(profile.form('password').getByText(LEAKED)).toHaveCount(0);
        } finally {
            if (ticked) {
                expect.soft(await putSite(adminPage, SITE_INSTALL.security), 'the site put back unticked').toBe(200);
            }
            await author.context.close();
        }
    });
});
