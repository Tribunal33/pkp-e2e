// Phase "extra" of the U03 SW1 sweep (see sw1.js for the run line): the reads the first phases lacked.
//   X1 each tab's save feedback (Roles, Public, Notifications, Password refused and saved, API Key create/delete)
//   X2 a change saved on Roles shown on Notifications only once that tab is opened again (Rule 2f)
//   X3 a two-journal account's site-level profile: Roles inline, no ORCID block, Notifications kept apart (Rule 3)
//   X4 the site-level Register page: its "Login" link and the completion page's "Edit My Profile" (Rule 3)
//   X5 a masthead member with a verified ORCID and none with an affiliation (Rule 7, Cross-feature)
//   X6 a published item's page and the submitter's bio statement (Cross-feature, Rule 9d's pointer)
//   X7 the greeting of a decision email to an author with a preferred public name (Rule 4)
const {signIn, signOut, record, idle, tag, sql} = require('../../../probe');
const L = require('./lib.js');

const {flat, sleep} = L;
const RUN = process.env.PROBE_RUN || 'r1';
const log = (...a) => console.log(`[sw1 ${RUN}]`, ...a);
const rel = (app, u) => (u || '').replace(app.baseURL, '');

async function sect(F, name, fn) {
    try {
        F[name] = await fn();
    } catch (e) {
        F[name] = Object.assign(F[name] || {}, {FAILED: String(e.stack || e).split('\n').slice(0, 5).join(' | ')});
        log(`[${name} FAILED]`, F[name].FAILED);
    }
}

async function phaseExtra(app) {
    const F = {};
    const A = app.name;
    const ctx = (cp, p) => app.url(`/index.php/${cp}${p}`);
    const t = tag(`u03sw1y${RUN}`);
    const t2 = tag(`u03sw1z${RUN}`);
    const U = {u: `${t}u`, v: `${t}v`, se: `${t}se`, s3: `${t}s3`, w: `${t}w`, w2: `${t}w2`};
    const c1 = {tag: t, orcid: {enabled: true}, users: [
        {username: U.u, givenName: 'Uma', familyName: 'Saver', roles: ['author']},
        {username: U.v, givenName: 'Vic', familyName: 'Twojournal', roles: ['author']},
        {username: U.se, givenName: 'Sid', familyName: 'Editor', roles: ['sectionEditor']},
        {username: U.s3, givenName: 'Ola', familyName: 'Orcid', roles: ['sectionEditor'], orcid: 'https://orcid.org/0000-0002-1825-0097', orcidIsVerified: true},
        {username: U.w, givenName: 'Wes', familyName: 'Writer', roles: ['author']},
        {username: U.w2, givenName: 'Wren', familyName: 'Plain', roles: ['author']},
    ]};
    if (A === 'ojs') c1.issues = [{volume: 1, number: 1, year: 2026, published: true}];
    await app.api.createContext(c1);
    await app.api.createContext({tag: t2, users: [{username: U.v, roles: ['author']}]});
    F.seed = {t, t2, U};
    const b = await L.browserFor(app, 'extra');
    const {page} = b;
    const save = async () => {
        const n = b.saves.length;
        await L.panel(page).getByRole('button', {name: 'Save', exact: true}).click();
        await sleep(1500);
        await idle(page);
        return b.saves.length - n;
    };
    const feedback = async (label, inTabSel) => {
        const s = await L.snap(page, label);
        return {notices: s.notices, toasts: await L.toasts(page), inTab: flat(await page.locator(inTabSel).innerText().catch(() => null)), selected: await L.selectedTab(page)};
    };
    try {
        // ---- X1 each tab's save feedback
        await sect(F, 'tabSaves', async () => {
            const out = {};
            await signIn(page, U.u, {contextPath: t});
            await page.goto(ctx(t, '/user/profile/roles'));
            await L.waitForm(page, 'roles');
            await L.snap(page, 'extra-x1-roles-before');
            out.roles = {sent: await save(), ...(await feedback('extra-x1-roles-saved', '#rolesFormNotification'))};
            await L.pressTab(page, 'publicProfile');
            await page.locator('form#publicProfileForm input[name="userUrl"]').fill('https://example.org/x1');
            out.public = {sent: await save(), ...(await feedback('extra-x1-public-saved', '#publicProfileNotification'))};
            await L.pressTab(page, 'notificationSettings');
            out.notifications = {sent: await save(), ...(await feedback('extra-x1-notifications-saved', '#notificationSettingsFormNotification'))};
            // Password: a wrong current password, then a valid change
            await L.pressTab(page, 'changePassword');
            const pw = (n) => page.locator(`form#changePasswordForm input[name="${n}"]`);
            for (const n of ['oldPassword', 'password', 'password2']) await pw(n).evaluate((i) => i.removeAttribute('maxlength'));
            await pw('oldPassword').fill('wrong-password-x1');
            await pw('password').fill('newpass-x1a');
            await pw('password2').fill('newpass-x1a');
            out.passwordRefused = {sent: await save(), ...(await feedback('extra-x1-password-refused', '#changePasswordFormNotification')),
                notice: flat(await page.locator('form#changePasswordForm .pkp_notification').first().innerText().catch(() => null), 300)};
            for (const n of ['oldPassword', 'password', 'password2']) await pw(n).evaluate((i) => i.removeAttribute('maxlength'));
            await pw('oldPassword').fill(`${U.u}${U.u}`);
            await pw('password').fill('newpass-x1a');
            await pw('password2').fill('newpass-x1a');
            await sleep(6500); // the refusal's own page notice expires first
            await L.snap(page, 'extra-x1-password-before-valid');
            out.passwordSaved = {sent: await save(), ...(await feedback('extra-x1-password-saved', '#changePasswordFormNotification'))};
            // API Key: create, then delete (its confirm answered OK by the script's listener)
            await L.pressTab(page, 'apiSettings');
            await sleep(6000);
            await L.snap(page, 'extra-x1-api-before');
            await L.panel(page).getByRole('button', {name: 'Create API Key', exact: true}).click();
            await sleep(1500);
            await idle(page);
            out.apiCreate = await feedback('extra-x1-api-created', '#apiProfileNotification');
            out.apiCreate.key = (await page.locator('form#apiProfileForm input[name="apiKey"]').inputValue().catch(() => '')).length;
            const n0 = b.seen.length;
            await L.panel(page).getByRole('button', {name: 'Delete', exact: true}).click();
            await sleep(1500);
            await idle(page);
            out.apiDelete = {dialogs: b.since(n0), ...(await feedback('extra-x1-api-deleted', '#apiProfileNotification')),
                key: await page.locator('form#apiProfileForm input[name="apiKey"]').inputValue().catch(() => null)};
            return out;
        });
        // ---- X2 a Roles change seen on Notifications
        await sect(F, 'crossTab', async () => {
            const out = {};
            await page.goto(ctx(t, '/user/profile/notificationSettings'));
            await L.waitForm(page, 'notificationSettings');
            out.groupsBefore = (await page.locator('form#notificationSettingsForm h4').allInnerTexts()).map((x) => flat(x));
            out.rowsBefore = await page.locator('form#notificationSettingsForm input[type=checkbox]').count();
            await L.pressTab(page, 'roles');
            const boxes = page.locator('form#rolesForm #userGroups .section').first().locator('input[type=checkbox]');
            const labels = (await page.locator('form#rolesForm #userGroups .section').first().locator('li').allInnerTexts()).map((x) => flat(x));
            let ticked = null;
            for (let i = (await boxes.count()) - 1; i >= 0; i--) {
                if (!(await boxes.nth(i).isChecked())) { await boxes.nth(i).check(); ticked = labels[i]; break; }
            }
            out.ticked = ticked;
            out.saved = await save();
            await L.pressTab(page, 'notificationSettings');
            out.groupsAfter = (await page.locator('form#notificationSettingsForm h4').allInnerTexts()).map((x) => flat(x));
            out.rowsAfter = await page.locator('form#notificationSettingsForm input[type=checkbox]').count();
            await L.snap(page, 'extra-x2-notifications-after-roles');
            return out;
        });
        // ---- X3 the two-journal account's site-level page
        await sect(F, 'siteLevel', async () => {
            const out = {};
            await signIn(page, U.v, {contextPath: t});
            await page.goto(app.url('/index.php/index/user/profile/roles'));
            await L.waitForm(page, 'roles');
            const s = await L.snap(page, 'extra-x3-site-roles');
            out.url = rel(app, page.url());
            out.title = s.title;
            out.foldLink = await page.locator('form#rolesForm a').evaluateAll((as) => as.map((a) => a.innerText.trim()).filter((x) => /Register with other|Hide other/.test(x)));
            out.sections = await page.evaluate(([a, b2]) => {
                const secs = [...document.querySelectorAll('form#rolesForm #userGroups .section, form#rolesForm .section')];
                const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
                return {count: secs.length, visible: secs.filter(vis).length, hasA: secs.some((x) => x.innerText.includes(a)), hasB: secs.some((x) => x.innerText.includes(b2)), firstTexts: secs.slice(0, 3).map((x) => x.innerText.replace(/\s+/g, ' ').trim().slice(0, 80))};
            }, [`Scratch context ${t}`, `Scratch context ${t2}`]);
            await L.pressTab(page, 'identity');
            out.orcid = /orcid/i.test(await page.locator('form#identityForm').innerText());
            // Notifications: the site-level first box unticked and saved; the journal's first box read
            await L.pressTab(page, 'notificationSettings');
            const first = page.locator('form#notificationSettingsForm input[type=checkbox]').first();
            out.siteFirst = {name: await first.getAttribute('name'), before: await first.isChecked()};
            await first.setChecked(!out.siteFirst.before);
            out.siteFirst.saved = await save();
            await page.goto(app.url('/index.php/index/user/profile/notificationSettings'));
            await L.waitForm(page, 'notificationSettings');
            out.siteFirst.afterReload = await page.locator(`form#notificationSettingsForm input[name="${out.siteFirst.name}"]`).isChecked();
            await page.goto(ctx(t, '/user/profile/notificationSettings'));
            await L.waitForm(page, 'notificationSettings');
            out.journalFirst = await page.locator(`form#notificationSettingsForm input[name="${out.siteFirst.name}"]`).isChecked().catch(() => null);
            await L.snap(page, 'extra-x3-journal-notifications');
            // restore the site-level box
            await page.goto(app.url('/index.php/index/user/profile/notificationSettings'));
            await L.waitForm(page, 'notificationSettings');
            await page.locator(`form#notificationSettingsForm input[name="${out.siteFirst.name}"]`).setChecked(out.siteFirst.before);
            await save();
            return out;
        });
        // ---- X4 the site-level Register page
        await sect(F, 'siteRegister', async () => {
            const out = {};
            await signOut(page);
            await page.goto(app.url('/index.php/index/user/register'));
            await idle(page);
            await L.snap(page, 'extra-x4-site-register');
            out.loginLinks = await page.locator('form#register a').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})).filter((a) => /login/i.test(a.text)));
            const who = {username: `${t}rg`, email: `${t}rg@mail.test`, password: `${t}pw1`};
            const form = page.locator('form#register');
            await form.locator('input[name="givenName"]').fill('Rae');
            await form.locator('input[name="familyName"]').fill('Sitewide');
            await form.locator('input[name="affiliation"]').fill('PKP');
            await form.locator('select[name="country"]').selectOption({label: 'Canada'});
            await form.locator('input[name="email"]').fill(who.email);
            await form.locator('input[name="username"]').fill(who.username);
            await form.locator('input[name="password"]').fill(who.password);
            await form.locator('input[name="password2"]').fill(who.password);
            // one context's Reader box and its consent: the scratch context of this phase
            const item = form.getByRole('listitem').filter({hasText: `Scratch context ${t}`}).first();
            out.readerBox = await item.getByRole('checkbox', {name: 'Reader'}).count();
            if (out.readerBox) await item.getByRole('checkbox', {name: 'Reader'}).check();
            const consent = item.getByRole('checkbox', {name: /I agree to have my data/});
            if (await consent.count()) await consent.check();
            const top = form.locator('input[name="privacyConsent"]');
            if (await top.count() && await top.isVisible()) await top.check();
            await form.locator('button.submit').click();
            await page.waitForLoadState('load').catch(() => {});
            await idle(page);
            const sc = await L.snap(page, 'extra-x4-site-register-complete');
            out.complete = {url: rel(app, page.url()), h1: flat(await page.locator('h1').first().innerText().catch(() => null)), main: flat(sc.text.main, 300),
                actions: await page.locator('ul.registration_complete_actions a').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`))};
            const edit = page.locator('ul.registration_complete_actions').getByRole('link', {name: 'Edit My Profile', exact: true});
            if (await edit.count()) {
                b.takeChain();
                await edit.click();
                await page.waitForURL(/user\/profile/, {timeout: 30000}).catch(() => {});
                await page.locator('#profileTabs form').first().waitFor({timeout: 30000}).catch(() => {});
                await idle(page);
                out.editMyProfile = {url: rel(app, page.url()), selected: await L.selectedTab(page), chain: b.takeChain()};
                await L.snap(page, 'extra-x4-edit-my-profile');
            }
            return out;
        });
        // ---- X5 the masthead: a verified ORCID, and members without an affiliation
        await sect(F, 'masthead', async () => {
            await page.goto(ctx(t, '/about/editorialMasthead'));
            await idle(page);
            const s = await L.snap(page, 'extra-x5-masthead');
            return {main: flat(s.text.main, 900), orcidLinks: await page.locator('a[href*="orcid.org"]').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`)),
                orcidImgs: await page.locator('.orcid').count()};
        });
        // ---- X6 + X7: the writer's bio on a published item; the decision greeting for a preferred name
        await sect(F, 'published', async () => {
            const out = {};
            await signIn(page, U.w, {contextPath: t});
            await page.goto(ctx(t, '/user/profile/publicProfile'));
            await L.waitForm(page, 'publicProfile');
            await L.waitEditors(page, 'form#publicProfileForm');
            await L.typeEditor(page, 'form#publicProfileForm', 'biography', `Writer bio ${RUN}.`);
            await save();
            const pub = A === 'ojs' ? {published: true, issue: {volume: 1, number: 1, year: 2026}} : {published: true};
            const sub = await app.api.createSubmission({tag: `${t}p`, context: t, submitter: U.w, title: `Published ${t}`, ...pub});
            out.id = sub.submissionId;
            const path = A === 'ojs' ? `/article/view/${sub.submissionId}` : A === 'omp' ? `/catalog/book/${sub.submissionId}` : `/preprint/view/${sub.submissionId}`;
            await signOut(page);
            const r = await page.goto(ctx(t, path));
            await idle(page);
            const s = await L.snap(page, 'extra-x6-published-item');
            out.page = {status: r && r.status(), url: rel(app, page.url()), hasBio: (s.text.main || '').includes(`Writer bio ${RUN}.`),
                bioHeading: ((s.text.main || '').match(/Author Biography|About the Authors?|Biography/g) || []), tail: flat((s.text.main || '').slice(-500), 500)};
            return out;
        });
        await sect(F, 'greeting', async () => {
            const out = {};
            await signIn(page, U.w2, {contextPath: t});
            await page.goto(ctx(t, '/user/profile/identity'));
            await L.waitForm(page, 'identity');
            await page.locator('form#identityForm input[name="preferredPublicName[en]"]').fill('Dr. Wren Preferred');
            await save();
            const sub = await app.api.createSubmission({tag: `${t}g`, context: t, submitter: U.w2, title: `Greeting ${t}`, participants: [{username: U.se, role: 'sectionEditor'}]});
            await signIn(page, U.se, {contextPath: t});
            await page.goto(ctx(t, `/dashboard/editorial?workflowSubmissionId=${sub.submissionId}`));
            await idle(page);
            const wf = page.locator('[role="dialog"]:visible').first();
            await wf.waitFor({timeout: 30000});
            await sleep(1500);
            const btn = wf.getByRole('button', {name: 'Decline Submission', exact: true}).first();
            out.button = await btn.count();
            if (out.button) {
                await btn.click();
                await page.waitForURL(/decision\/record/, {timeout: 30000}).catch(() => {});
                await idle(page);
                await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                await page.waitForFunction(() => (window.tinymce ? window.tinymce.get() : []).some((e) => e.initialized && e.getContent().length > 20), null, {timeout: 30000}).catch(() => {});
                await sleep(800);
                await L.snap(page, 'extra-x7-decline-composer');
                out.openings = await page.evaluate(() => (window.tinymce ? window.tinymce.get() : []).map((e) => (e.getBody() ? e.getBody().innerText.trim() : '')).filter(Boolean).map((x) => x.split('\n')[0].slice(0, 120)));
                out.recipients = flat(await page.locator('main').innerText().then((x) => (x.match(/To[\s\S]{0,200}/) || [''])[0]).catch(() => null), 200);
            }
            return out;
        });
    } finally {
        F.dialogs = b.seen;
        await b.close();
    }
    record('facts-extra', F);
    return F;
}

module.exports = {extra: phaseExtra};
void sql;
