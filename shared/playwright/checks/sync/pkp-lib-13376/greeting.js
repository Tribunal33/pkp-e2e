// Intention-gap check for pkp/pkp-lib#13397 (issue #13376, aa077419e3), kept from the
// 2026-09-27 sync (docs/tracking/ci-triage.md "Open regressions",
// docs/reports/2026-09-27-pkp-lib-13376.md).
//   PROBE_FEATURE=sync PROBE_AGENT=<agent> RR_LEGS=a,b,s1,s2e,s2f node bin/probe.js omp|ojs shared/playwright/checks/sync/pkp-lib-13376/greeting.js
// Verdict from result-<app>.json legs.<leg>.mail (the sent email's "Dear …," line):
//   a (English names) and s2f (French-primary press, inviter in French) greet by name;
//   gap → s2e (French-primary press, names in both languages, inviter in English) and
//         s1 (names only in the non-primary language) greet by the email address;
//   fixed when s2e greets "Dear Eve English," (or the French name).
// rr13376 — pkp/pkp-lib#13397: the invitation email's recipient name for new/existing invitees.
// Legs (RR_LEGS=a,b,... to narrow): a en names, b no name, s1 fr-only names, s3 HTML chars,
// s4 existing user, s5 Edit on a's invitation, s2c en-primary press sent with the session in fr_CA,
// s2e fr_CA-primary press sent with the session in en, s2f same press sent with the session in fr_CA.
// No assertions: facts per leg go to result-<app>.json (merge), screens beside them.
const {forEachApp, launch, signIn, screen, record, shot, idle, tag, note} = require('../../../probe');

const ONLY = (process.env.RR_LEGS || '').split(',').map((s) => s.trim()).filter(Boolean);
const want = (l) => !ONLY.length || ONLY.includes(l);
const today = () => new Date().toISOString().slice(0, 10);
const LANG = {en: 'English', fr_CA: 'French'};

forEachApp(async (app) => {
    const T = tag('rr76');
    const T2 = tag('rr76p');
    const mgr = `${T}mgr`, mgr2 = `${T2}mgr`, ex = `${T}ex`;
    await app.api.createContext({
        tag: T,
        context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
        users: [
            {username: mgr, roles: ['manager'], givenName: 'Mia', familyName: 'Mgr'},
            {username: ex, roles: ['reader'], givenName: 'Stored', familyName: 'Member'},
        ],
    });
    if (want('s2e') || want('s2f')) {
        await app.api.createContext({
            tag: T2,
            context: {primaryLocale: 'fr_CA', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
            users: [{username: mgr2, roles: ['manager'], givenName: 'Mia', familyName: 'Mgr'}],
        });
    }
    console.log(`${app.name}: presses ${T} (en primary) ${T2} (fr_CA primary)`);
    const R = {app: app.name, T, T2, legs: {}};
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => { await d.accept(); });
    const footer = page.locator('.buttonRow');
    const fbtn = (name) => footer.getByRole('button', {name, exact: true});
    const main = page.locator('main');

    const gotoAccess = async (ctx) => {
        await page.goto(app.url(`/index.php/${ctx}/en/management/settings/access`));
        await page.getByRole('button', {name: 'Invite to a role'}).waitFor({timeout: 30000});
        await idle(page);
    };
    const fillNames = async (names) => {
        for (const field of ['givenName', 'familyName']) {
            for (const [loc, val] of Object.entries((names && names[field]) || {})) {
                const box = page.locator(`input[name="${field}-${loc}"]`);
                if (!(await box.isVisible())) {
                    await main.getByRole('button', {name: LANG[loc], exact: true}).click();
                    await box.waitFor({state: 'visible'});
                }
                await box.fill(val);
                await box.blur();
            }
        }
    };
    const addRole = async (want) => {
        const rows = page.getByRole('row').filter({has: page.locator('select[name="userGroupId"]')});
        let n = await rows.count();
        const lastEmpty = n > 0 && (await rows.last().locator('select[name="userGroupId"]').inputValue()) === '';
        if (!lastEmpty) {
            await page.getByRole('button', {name: 'Add Another Role'}).click();
            await rows.nth(n).waitFor();
        }
        const row = rows.last();
        const sel = row.locator('select[name="userGroupId"]');
        const val = await sel.evaluate((s, re) => {
            const o = [...s.options].find((o) => new RegExp(re).test(o.text.trim()));
            return o ? o.value : null;
        }, want);
        await sel.selectOption(val);
        await row.locator('input[name="dateStart"]').fill(today());
        const mh = row.locator('select[name="masthead"]');
        if (await mh.count()) {
            const v = await mh.evaluate((s) => ([...s.options].find((o) => o.value !== '') || {}).value);
            await mh.selectOption(v);
        }
    };
    const composeAndSend = async (leg, subject, flipTo) => {
        await fbtn('Save And Continue').click();
        const subj = page.getByLabel('Subject');
        await subj.waitFor({timeout: 30000});
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: 30000}).catch(() => {});
        await idle(page);
        const preview = await page.frameLocator('iframe').first().locator('body').innerText();
        await shot(page, `${leg}-compose`);
        await subj.fill(subject);
        if (flipTo) {
            const p2 = await page.context().newPage();
            await p2.goto(app.url(`/index.php/${flipTo.ctx}/${flipTo.locale}/index`));
            await p2.close();
        }
        await fbtn('Invite user to the role').click();
        const sent = page.locator('[data-cy="dialog"]').filter({hasText: 'Invitation Sent'});
        await sent.waitFor({timeout: 30000});
        return preview.slice(0, 300);
    };
    const readMail = async (to, marker) => {
        const s = await app.mail.find({to, contains: marker, timeoutMs: 30000});
        const m = await app.mail.fullMessage(s.ID);
        const html = m.HTML || '';
        const bodyAt = html.search(/<body/i);
        return {
            to: m.To, subject: m.Subject,
            textGreeting: ((m.Text || '').match(/^.*(Dear|Bonjour|Cher|Chère|Madame).*$/mi) || [null])[0],
            htmlGreeting: (html.match(/(Dear|Bonjour|Cher|Chère|Madame)[\s\S]{0,160}/i) || [null])[0],
            htmlHead: html.slice(bodyAt < 0 ? 0 : bodyAt, (bodyAt < 0 ? 0 : bodyAt) + 700),
        };
    };
    const newInvite = async (leg, {ctx, email, names, flipTo}) => {
        await gotoAccess(ctx);
        await page.getByRole('button', {name: 'Invite to a role'}).click();
        await page.getByLabel(/Search for a user by email address/).fill(email);
        await fbtn('Search User').click();
        await page.getByText(/does not have a role/).waitFor();
        await fillNames(names);
        await addRole('^Author$');
        await shot(page, `${leg}-details`);
        const marker = `Inv${leg}${T}`;
        const preview = await composeAndSend(leg, marker, flipTo);
        return {email, names, flipTo: flipTo || null, composePreviewHead: preview, mail: await readMail(email, marker)};
    };
    const run = async (leg, fn) => {
        if (!want(leg)) return;
        try {
            R.legs[leg] = await fn();
        } catch (e) {
            R.legs[leg] = {error: String(e).slice(0, 400)};
            await shot(page, `${leg}-error`).catch(() => {});
            record(`${leg}-error`, await screen(page).catch(() => null));
        }
        console.log(leg, JSON.stringify(R.legs[leg]).slice(0, 600));
        record('result', R, {merge: true});
    };

    try {
        await signIn(page, mgr, {contextPath: T});
        const em = (k) => `rcpt${T}${k}@mail.test`;
        await run('a', () => newInvite('a', {ctx: T, email: em('a'), names: {givenName: {en: 'Anna'}, familyName: {en: 'Smith'}}}));
        await run('b', () => newInvite('b', {ctx: T, email: em('b'), names: null}));
        await run('s1', () => newInvite('s1', {ctx: T, email: em('fr'), names: {givenName: {fr_CA: 'Anne'}, familyName: {fr_CA: 'Dupont'}}}));
        await run('s3', () => newInvite('s3', {ctx: T, email: em('ht'), names: {givenName: {en: 'Zoe <Ann>'}, familyName: {en: 'Smith & Co'}}}));
        await run('s2c', () => newInvite('s2c', {ctx: T, email: em('pc'), names: {givenName: {en: 'Clara', fr_CA: 'Claire'}, familyName: {en: 'Control', fr_CA: 'Controle'}}, flipTo: {ctx: T, locale: 'fr_CA'}}));
        await run('s4', async () => {
            await gotoAccess(T);
            await page.getByRole('button', {name: 'Invite to a role'}).click();
            await page.getByLabel(/Search for a user by email address/).fill(`${ex}@mail.test`);
            await fbtn('Search User').click();
            await page.getByText(/already exists/).waitFor();
            await addRole('^Author$');
            const marker = `Invs4${T}`;
            const preview = await composeAndSend('s4', marker);
            return {email: `${ex}@mail.test`, stored: 'Stored Member', composePreviewHead: preview, mail: await readMail(`${ex}@mail.test`, marker)};
        });
        await run('s5', async () => {
            await gotoAccess(T);
            const row = page.getByRole('table', {name: /Invitations \(\d+\)/}).getByRole('row').filter({hasText: em('a')});
            await row.getByRole('button', {name: 'Invitation management options'}).click();
            await page.getByRole('menuitem', {name: 'Edit'}).click();
            const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Edit Invitation'});
            await dlg.getByRole('button', {name: 'Edit Invitation', exact: true}).click();
            await page.getByRole('textbox', {name: /^Email/}).waitFor();
            await idle(page);
            const shown = {
                givenEn: await page.locator('input[name="givenName-en"]').inputValue(),
                familyEn: await page.locator('input[name="familyName-en"]').inputValue(),
            };
            await addRole('^Copyeditor$');
            const marker = `Invs5${T}`;
            const preview = await composeAndSend('s5', marker);
            return {email: em('a'), editFormShowed: shown, composePreviewHead: preview, mail: await readMail(em('a'), marker)};
        });
        if (want('s2e') || want('s2f')) {
            await signIn(page, mgr2, {contextPath: T2});
            const em2 = (k) => `rcpt${T2}${k}@mail.test`;
            await run('s2e', () => newInvite('s2e', {ctx: T2, email: em2('pe'), names: {givenName: {fr_CA: 'Eva', en: 'Eve'}, familyName: {fr_CA: 'Anglais', en: 'English'}}}));
            await run('s2f', () => newInvite('s2f', {ctx: T2, email: em2('pf'), names: {givenName: {fr_CA: 'Fanny', en: 'Fay'}, familyName: {fr_CA: 'Francais', en: 'French'}}, flipTo: {ctx: T2, locale: 'fr_CA'}}));
        }
    } finally {
        record('result', R, {merge: true});
        await close();
    }
});
