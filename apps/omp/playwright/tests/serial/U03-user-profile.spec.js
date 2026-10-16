// @ts-check
/**
 * @file playwright/tests/serial/U03-user-profile.spec.js
 *
 * User profile — OMP suite, the serial part: scenario 13 (common), the
 * Password tab with the site's compromised-password check ticked. The
 * other scenarios (1–12) are in `../U03-user-profile.spec.js`.
 * Spec: docs/specs/U03-user-profile.md
 *
 * Serial project (PRINCIPLES A7, A9): the check is a site setting, the one
 * record every worker, fleet page and scratch press shares, so the test
 * runs after the parallel projects and puts the box back unticked in a
 * `finally` whatever the outcome, through the site's own save sent from
 * the Site Administrator's page (`putSite` with the install values, as the
 * serial U60 suite does). The ticked check asks Have I Been Pwned over the
 * network (the installs carry no local list; spec footnote g, seed-facts),
 * so the run needs the network the VM and CI have.
 *
 * Deliberately NOT covered (register IDs): A7, A11, A22.
 *
 * Seeding (fn-s): a scratch press from `POST scenarios/context` with a
 * throwaway Author whose password is short (A7's 32-character cap) and
 * not a leaked one; the Author signs in through the real Login form in
 * the test's own browser context, because the scenario's last save
 * changes the password. The Site Administrator is `admin`, through
 * `asUser`. No `POST site` key sets the check, so the given ticks it on
 * the screen the scenario's control unticks it on.
 */
const {test, expect} = require('../../support/fixtures.js');
const {LoginPage} = require('../../../../../shared/playwright/pages/LoginPage.js');
const {ProfilePage, SAVED_MESSAGE} = require('../../../../../shared/playwright/pages/ProfilePage.js');
const {SiteSettingsPage, SITE_INSTALL, putSite} = require('../../../../../shared/playwright/pages/SiteSettingsPages.js');

const LEAKED = 'This password has appeared in data leaks. Please choose a different, strong password.';
const LEAKED_PASSWORD = 'qwerty123456';
const LEAKED_REPEAT = 'qwerty654321';
const ERRORS_HEADING = 'Errors occurred processing this form';
const PASSWORDS_MISMATCH = 'The passwords do not match.';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u03${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('user profile (serial)', () => {
    test('S13: a leaked password refused on the Password tab', async ({browser, baseURL, asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s13', testInfo);
        const username = `${tag}au`;
        // Short on purpose (A7), and no leaked password.
        const current = `pw${tag}`;
        await ompApi.createContext({
            tag,
            users: [{username, givenName: 'Lee', familyName: 'Leak', roles: ['author'], password: current}],
        });

        const adminPage = await (await asUser('admin')).newPage();
        const authorContext = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
        let ticked = false;
        try {
            const authorPage = await authorContext.newPage();
            await authorPage.goto(`/index.php/${tag}/login`);
            await new LoginPage(authorPage).signIn(username, current);
            const profile = new ProfilePage(authorPage, tag);
            await profile.goto('password');
            const hint = await profile.newPasswordSubLabel().textContent();

            // The given: the Site Administrator ticks "Check passwords against
            // compromised password databases" on Administration › Site
            // Settings › Site Setup › Security and saves.
            const site = new SiteSettingsPage(adminPage);
            await site.goto();
            let form = await site.security();
            ticked = true;
            await form.compromisedCheck.check();
            await form.save();
            await site.reload();
            form = await site.security();
            await expect(form.compromisedCheck).toBeChecked();

            // A leaked password typed twice: the notice with the data-leak
            // sentence, the same sentence under "New password" in place of
            // the hint, the three boxes emptied (Rule 10a).
            await profile.fillPasswords({current, next: LEAKED_PASSWORD});
            await profile.save();
            await expect(profile.passwordErrorNotice()).toContainText(ERRORS_HEADING);
            await expect(profile.passwordErrorNotice()).toContainText(LEAKED);
            await expect(profile.newPasswordSubLabel()).toHaveText(LEAKED);
            await expect(profile.form('password').getByText(hint || '', {exact: true})).toHaveCount(0);
            await expect(profile.currentPassword()).toHaveValue('');
            await expect(profile.newPassword()).toHaveValue('');
            await expect(profile.repeatPassword()).toHaveValue('');

            // The leaked password with a different repeat: "The passwords do
            // not match." in the notice and under "New password", with no
            // sentence about data leaks (Rule 10a; the leak sentence read
            // just above is the control).
            await profile.fillPasswords({current, next: LEAKED_PASSWORD, repeat: LEAKED_REPEAT});
            await profile.save();
            await expect(profile.passwordErrorNotice()).toContainText(PASSWORDS_MISMATCH);
            await expect(profile.newPasswordSubLabel()).toHaveText(PASSWORDS_MISMATCH);
            await expect(profile.passwordErrorNotice()).not.toContainText(LEAKED);
            await expect(profile.form('password')).not.toContainText(LEAKED);

            // Control: the Site Administrator unticks the box on the same
            // screen and saves; the leaked password typed twice is then
            // saved at the top right (Settings, "Site password policy").
            await form.compromisedCheck.uncheck();
            await form.save();
            await site.reload();
            form = await site.security();
            await expect(form.compromisedCheck).not.toBeChecked();
            ticked = false;
            await profile.fillPasswords({current, next: LEAKED_PASSWORD});
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            await expect(profile.form('password')).not.toContainText(LEAKED);
            await expect(profile.passwordErrorNotice()).toHaveCount(0, {timeout: 20_000});
        } finally {
            if (ticked) {
                await putSite(adminPage, SITE_INSTALL.security);
            }
            await authorContext.close();
        }
    });
});
