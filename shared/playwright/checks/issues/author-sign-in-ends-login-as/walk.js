// Issue report docs/issues/U01-A15-author-sign-in-ends-login-as.md (U01 A15): its Steps to reproduce, walked
// through the screens on PKP's default test dataset for stable-3_4_0 upgraded to the line under test (the
// accounts keep 3.4's cost-10 bcrypt passwords until their first sign-in), and its control on the line's own
// dataset (passwords already at cost 12). The kit builds nothing; besides the screens the script reads the
// Author's stored password form and session rows (users, sessions) and the server log.
//
// Modes (argument): walk (default) | nb | save.
//   walk: browser A, rvaca › Settings › Users & Roles › the Author's row › "Login As" › "OK"; browser B, the
//         Author signs in; browser A reloads; if still the Author, "Logout as {author}".
//   nb:   the fix's neighbours: browser B, the Author signs in with no other session (the password must still
//         be re-saved at cost 12); then browser A, rvaca's "Login As" of the Author; browser B, Edit Profile ›
//         Password changes it; browser A reloads (a real change must still end the impersonation).
//   save: browser A, rvaca's "Login As" of the Author › Edit Profile › "Contact", a phone number typed; browser B,
//         the Author signs in; browser A presses "Save" (what happens to the save).
// SHORTCUT=1 (on the main dataset): before the steps, the Author's users.password is set to a cost-10 bcrypt hash
// of the same password (php's password_hash(…, PASSWORD_BCRYPT, ['cost' => 10])), standing in for an account last
// saved by 3.4: the developer's shortcut the report's Steps give.
//
// Reset first (upgraded 3.4 dataset):  PKP_E2E_DATASET_BRANCH=stable-3_4_0 npm run fleet-prep -- --feature issues-h19j --dataset 2 --reset
// Control (main dataset):              npm run fleet-prep -- --feature issues-h19j --dataset 2 --reset
// Run:   PROBE_FEATURE=issues-h19j PROBE_AGENT=h19j node bin/probe.js all shared/playwright/checks/issues/author-sign-in-ends-login-as/walk.js [walk|nb]
// 3.5:   PKP_E2E_LINE=stable-3_5_0 PKP_E2E_DATASET_BRANCH=stable-3_4_0 npm run fleet-prep -- --feature issues-h19j-3_5 --dataset 2 --reset
//        PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h19j-3_5 PROBE_AGENT=h19j node bin/probe.js all shared/playwright/checks/issues/author-sign-in-ends-login-as/walk.js
const {forEachApp, launch, signIn, screen, record, idle, serverLog, sql} = require('../../../probe');
const L = require('./lib');

const {execFileSync} = require('child_process');

const mode = process.argv.slice(2).find((a) => /^(walk|nb|save)$/.test(a)) || 'walk';
const PHONE = '+1 555 0119';
const RUN = process.env.PROBE_RUN || 'main';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const [author, authorName] = L.AUTHOR[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: RUN, mode, author};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${L.flat(JSON.stringify(v), 1200)}`); };
    const log = serverLog(app), from = log.mark();
    const A = await launch(app);
    const B = await launch(app);
    const step = async (k, fn) => {
        try { fact(k, await fn()); } catch (e) { fact(k, {error: L.flat(e.message, 300)}); }
    };
    try {
        if (process.env.SHORTCUT) {
            const hash = execFileSync('php', ['-r', `echo password_hash('${author}${author}', PASSWORD_BCRYPT, ['cost' => 10]);`]).toString();
            sql(app, `update users set password = '${hash}' where username = '${author}'`);
            fact('shortcut: password set to a cost-10 hash', true);
        }
        fact('stored at start', L.stored(app, author));
        if (mode === 'nb') {
            await step('nb1 B: author signs in, no other session', async () => {
                await signIn(B.page, author, {contextPath: app.contextPath});
                await idle(B.page);
                return {landed: L.path(B.page), stored: L.stored(app, author)};
            });
        }
        await step('1 A: rvaca signs in', async () => {
            await signIn(A.page, 'rvaca', {contextPath: app.contextPath});
            await idle(A.page);
            return L.path(A.page);
        });
        await step('2 A: Login As the Author', async () => {
            const r = await L.loginAsFromUsers(A.page, app, authorName);
            r.menu = await L.userMenu(A.page);
            r.stored = L.stored(app, author);
            record(`${RUN}-${mode}-2-impersonating`, await screen(A.page));
            return r;
        });
        if (mode === 'save') {
            await step('2s A: Edit Profile › Contact, a phone number typed', async () => {
                await A.page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile/contact`));
                await A.page.locator('form#contactForm input[name="phone"]').waitFor({timeout: L.T});
                await A.page.locator('form#contactForm input[name="phone"]').fill(PHONE);
                return L.path(A.page);
            });
        }
        if (mode === 'walk' || mode === 'save') {
            await step('3 B: the Author signs in', async () => {
                await signIn(B.page, author, {contextPath: app.contextPath});
                await idle(B.page);
                record(`${RUN}-${mode}-3-author-signed-in`, await screen(B.page));
                return {landed: L.path(B.page), stored: L.stored(app, author)};
            });
        } else {
            await step('nb2 B: the Author changes the password', async () => {
                const r = await L.changePassword(B.page, app, `${author}${author}`, `${author}h19jnew`);
                r.stored = L.stored(app, author);
                return r;
            });
        }
        if (mode === 'save') {
            await step('4s A: "Save" on the Contact tab', async () => {
                const answer = A.page.waitForResponse((r) => /\/profile-tab\/save-/.test(r.url()) || /\/login/.test(r.url()), {timeout: L.T}).catch(() => null);
                await A.page.locator('form#contactForm').getByRole('button', {name: 'Save', exact: true}).click();
                const r = await answer;
                await L.sleep(3000);
                await idle(A.page).catch(() => {});
                record(`${RUN}-${mode}-4s-after-save`, await screen(A.page));
                return {
                    answer: r ? {url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status()} : null,
                    page: L.path(A.page),
                    notice: L.flat(await A.page.locator('form#contactForm .pkp_notification, [role="status"]').allInnerTexts().then((t) => t.join(' | ')).catch(() => ''), 300),
                    tab: L.flat(await A.page.locator('form#contactForm').innerText().catch(() => ''), 200),
                    phoneStored: sql(app, `select coalesce(phone, '(empty)') from users where username = '${author}'`),
                };
            });
        }
        await step('4 A: reload', async () => {
            await A.page.reload();
            await idle(A.page);
            record(`${RUN}-${mode}-4-after-reload`, await screen(A.page));
            return L.whoAmI(A.page);
        });
        await step('5 A: Logout as the Author (when offered)', async () => {
            const r = await L.logoutAs(A.page, author);
            if (r.offered) {
                r.after = await L.whoAmI(A.page);
                record(`${RUN}-${mode}-5-after-logout-as`, await screen(A.page));
            }
            return r;
        });
        fact('server log', log.since(from).slice(0, 20));
    } finally {
        record(`${RUN}-${mode}-facts`, facts);
        await A.close();
        await B.close();
    }
});
