// U02 "Registration & account validation": drift sweep, chunk SW2 (2026-10-12).
// The site-level Register page (roles in several contexts, consent lines, the interests box) and email
// validation (the waiting page, the "Validate Your Account" email, activation, a dead link): spec
// Rule 8, Rules 11-14, the Side effects and Settings that speak of the site-level page or of
// validation, scenarios 6 and 7, register entries A1, A2, A6, OMP2 and OPS1.
//
//   PROBE_FEATURE=U02 PROBE_AGENT=ccSW2 PROBE_RUN=r1 bin/app-lock.sh shared <app> -- node bin/probe.js <app> shared/playwright/checks/U02/SW2/sw2.js [phases]
//
// Phases (comma list; default site,flags,valid,extra):
//   site     the probe server, validation off: the site homepage's "Register", the page's blocks, a
//            consent line ticked into view and out again, a visitor with roles in two contexts and two
//            interests typed, a second visitor typing the same interests, the stored interests (a
//            read-only query), each one's profile "Roles" tab, the manager's "View more details" before
//            and after a Roles "Save", a third visitor with nothing ticked, no mail to any of them
//   flags    a scratch context's manager: "Allow user self-registration" unticked on Reader, then on
//            the reviewer role, ticked on a press's Internal Reviewer, the Privacy Statement emptied,
//            registration closed; the site-level page read after each
//   valid    the validation-variant server (+90): a browser without JavaScript, the waiting page, the
//            same username again, sign-in before activating, the email, the activation page, an
//            altered key, "Activate Account", Back, the button's address again, sign-in, the link once
//            more; a site-level registration; a context with no technical support contact (A6), its
//            Contact form, "Enable User" by its manager and by the site administrator; the two
//            validation email templates on the Emails screen; the configuration keys as the files hold them
//   extra    (seeds its own context `<tag>x`) a context's own Register page, signed out, read for the
//            reviewer offer and the interests boxes; an account waiting for validation that a manager
//            enables with "Enable User" before its owner opens the emailed link: the link, "Activate
//            Account", sign-in
//   sitecfg  the site's own record, changed and put back (run it under `app-lock.sh exclusive`, since
//            every walk on the fleet sees it): a site Privacy Statement (the site consent box and its
//            refusal), a Site Name (the validation email of a site-level registration names it)
//
// Each run seeds its own scratch contexts `<tag>a`, `<tag>b`, `<tag>n` (tag u02sw2…) with a manager each
// (`<context>mg`, password the username twice) and registers throwaway accounts `<tag>…`. Nothing is
// asserted: every screen is recorded with screen() and the facts go to facts-<phase>; the records are
// read against the spec. Run twice, each under its own PROBE_RUN.
const {forEachApp, launch, signIn, signOut, shot, record, loc, note, idle, tag, sql} = require('../../../probe');
const L = require('./lib.js');

const {flat, rel, sleep, W, T} = L;
const PHASES = (process.argv[2] || 'site,flags,valid,extra').split(',');

forEachApp(async (app) => {
    const w = W[app.name];
    const seededPath = app.contextPath;
    const t = tag('u02sw2');
    const sfx = t.slice(-6);
    const VO = app.variant('validation');
    const vapp = {...app, baseURL: VO, url: (p) => `${VO}${p}`};
    const u = (p) => app.url(`/index.php/${p}`);
    const facts = {};
    const errors = [];
    const person = (suffix, family) => ({username: `${t}${suffix}`, email: `${t}${suffix}@mail.test`, password: `Pw9${sfx}${suffix}`, given: 'Sweep', family: family || `V${suffix}${sfx}`});
    const ctxA = {path: `${t}a`, name: `SW2 A ${sfx}`, manager: `${t}amg`};
    const ctxB = {path: `${t}b`, name: `SW2 B ${sfx}`, manager: `${t}bmg`};
    const ctxN = {path: `${t}n`, name: `SW2 N ${sfx}`, manager: `${t}nmg`};
    const words = [`glacier${sfx}`, `ethics${sfx}`];
    const typed = `${words[0]}, ${words[1]}`; // as a person types it: a comma and a space
    const q = (query) => {
        try {
            return sql(app, query).split('\n').filter(Boolean);
        } catch (e) {
            return [`error: ${flat(e.message, 200)}`];
        }
    };
    const userRow = (username) => q(`select username, disabled, coalesce(disabled_reason, ''), date_validated is not null as validated, date_last_login is not null as signed_in from users where username = '${username}'`);
    const rolesOf = (username) => q(`select ug.context_id, ugs.setting_value from user_user_groups uug join users u on u.user_id = uug.user_id join user_groups ug on ug.user_group_id = uug.user_group_id left join user_group_settings ugs on ugs.user_group_id = ug.user_group_id and ugs.setting_name = 'name' and ugs.locale = 'en' where u.username = '${username}' order by 1, 2`);
    const stored = () => ({
        entries: q(`select s.controlled_vocab_entry_id, s.setting_value from controlled_vocab_entry_settings s where s.setting_name = 'name' and s.setting_value in (${words.map((x) => `'${x}'`).join(',')}) order by 1`),
        links: q(`select u.username, ui.controlled_vocab_entry_id from user_interests ui join users u on u.user_id = ui.user_id where u.username like '${t}%' order by 1, 2`),
    });

    const step = async (name, fn) => {
        try {
            await fn();
        } catch (error) {
            errors.push({step: name, error: String(error.message || error).split('\n').slice(0, 3).join(' | ')});
            console.error(`[sw2] ${app.name} ${name} FAILED: ${String(error.message || error).split('\n')[0]}`);
        }
    };
    const phase = async (name, fn) => {
        if (!PHASES.includes(name)) return;
        const started = Date.now();
        facts[name] = {};
        try {
            await fn(facts[name]);
        } catch (error) {
            errors.push({phase: name, error: String(error.stack || error).split('\n').slice(0, 4).join(' | ')});
            console.error(`[sw2] ${app.name} phase ${name} FAILED: ${String(error.message || error).split('\n')[0]}`);
        }
        record(`facts-${name}`, {run: {app: app.name, tag: t, contexts: [ctxA.path, ctxB.path, ctxN.path]}, ...facts[name], errors: errors.slice()});
        console.log(`[sw2] ${app.name} phase ${name}: ${Math.round((Date.now() - started) / 1000)} s, ${errors.length} step failures so far`);
    };
    /** A browser of its own for one person; closed whatever happens. */
    const visitor = async (bag, fn) => {
        const b = await launch(bag);
        try {
            return await fn(b.page, b);
        } finally {
            await b.close();
        }
    };

    /** Settings › Journal › Contact as the context's manager: Save as it stands, then with the support contact typed. */
    const setSupport = async (ctx, contact, label) =>
        visitor(app, async (page) => {
            await signIn(page, ctx.manager, {contextPath: ctx.path});
            const {SettingsPages} = require('../../../pages/ContextIdentityPages.js');
            const settings = new SettingsPages(page, ctx.path);
            const form = await settings.openJournalTab('Contact');
            const out = {before: {name: await form.control('contact-supportName-control').inputValue(), email: await form.control('contact-supportEmail-control').inputValue(), principal: await form.control('contact-contactEmail-control').inputValue().catch(() => null)}};
            // "Save" with no support contact typed
            let sent = 0;
            const onReq = (r) => {
                if (r.method() === 'POST' && /\/api\/v1\/contexts\/\d+/.test(r.url())) sent++;
            };
            page.on('request', onReq);
            await form.saveButton.click();
            await sleep(1500);
            await idle(page).catch(() => {});
            page.off('request', onReq);
            const s = await L.snap(page, `valid-${label}-contact-save-empty`);
            out.emptySave = {requests: sent, notices: s.notices, errors: (await form.form.locator('.pkpFieldError, .pkpFormErrors, .pkpFormField__error').allInnerTexts().catch(() => [])).map((x) => flat(x, 200))};
            await form.control('contact-supportName-control').fill(contact.name);
            await form.control('contact-supportEmail-control').fill(contact.email);
            const res = await form.pressSave();
            out.saved = {status: res.status(), shown: await form.savedStatus.waitFor({state: 'visible', timeout: T}).then(() => true, () => false)};
            return out;
        });

    if (PHASES.some((p) => ['site', 'flags', 'valid'].includes(p))) {
        for (const c of [ctxA, ctxB, ctxN]) {
            await app.api.createContext({tag: c.path, context: {name: c.name, acronym: 'SW2', country: 'CA'}, users: [{username: c.manager, roles: ['manager']}]});
        }
    }

    // ================================================================================================
    // site: the site-level Register page with validation off (Rule 8, scenario 6, OMP2, OPS1)
    // ================================================================================================
    await phase('site', async (f) => {
        const names = [w.seeded, ctxA.name];
        const v1 = person('v1');
        const v2 = person('v2');
        const v3 = person('v3');
        const v4 = person('v4');
        const second = w.reviewer || 'Reader'; // the role ticked under the scratch context
        f.people = {v1: v1.username, v2: v2.username, v3: v3.username, v4: app.name === 'ops' ? v4.username : null, words, typed};
        const since = new Date();
        f.since = since.toISOString();

        /** Tick a role under a context and that context's consent line; what the ticks did. */
        const tickRole = async (page, name, label) => {
            const blk = L.block(page, name);
            const box = L.roleBox(blk, label);
            const out = {block: await blk.count(), box: await box.count()};
            if (!out.box) return out;
            await box.check();
            await sleep(250);
            const consent = blk.locator('.context_privacy input[type="checkbox"]');
            out.consentBoxes = await consent.count();
            if (out.consentBoxes) {
                out.consentShown = await blk.locator('.context_privacy').evaluate((el) => ({cls: el.className, left: Math.round(el.getBoundingClientRect().left)}));
                await consent.check();
            }
            return out;
        };

        // --- the first visitor: the site homepage, "Register", roles in two contexts, two interests
        await visitor(app, async (page) => {
            await step('site.home', async () => {
                await page.goto(u('index'));
                const s = await L.snap(page, 'site-01-home');
                f.home = {url: rel(s.url), title: s.title, header: await L.header(page)};
                await page.locator('#navigationUser').getByRole('link', {name: 'Register', exact: true}).click();
                await page.waitForURL(/user\/register/, {timeout: T});
                const r = await L.snap(page, 'site-02-register');
                await shot(page, 'site-02-register');
                f.register = {url: rel(r.url), title: r.title, h1: flat(await page.locator('h1').first().innerText()), header: await L.header(page), form: await L.formFacts(page, {names})};
                await loc(page, 'site-level Register: the form', page.locator('form#register'));
                await loc(page, 'site-level Register: a context block by its name', L.block(page, w.seeded));
                await loc(page, 'site-level Register: "Reader" under a context', L.roleBox(L.block(page, w.seeded), 'Reader'));
                await loc(page, "site-level Register: a context's consent line", L.block(page, w.seeded).locator('.context_privacy'));
                await loc(page, 'site-level Register: the interests box', page.locator('form#register .reviewer_nocontext_interests input[name="interests"]'));
                await loc(page, "site-level Register: the site's own consent box", page.locator('form#register input[name="privacyConsent[0]"]'));
                await loc(page, 'site-level Register: the notification box', page.locator('form#register input[name="emailConsent"]'));
            });

            // --- a consent line ticked into view and out again (Rule 5, OMP2: both ends)
            await step('site.consentToggle', async () => {
                const blk = L.block(page, w.seeded);
                const line = blk.locator('.context_privacy');
                const read = async () => (await line.count() ? line.evaluate((el) => ({cls: el.className, left: Math.round(el.getBoundingClientRect().left), text: el.innerText.replace(/\s+/g, ' ').trim()})) : null);
                const before = await read();
                await L.roleBox(blk, 'Reader').check();
                await sleep(300);
                const ticked = await read();
                await L.snap(page, 'site-03-reader-ticked');
                await L.roleBox(blk, 'Reader').uncheck();
                await sleep(300);
                const unticked = await read();
                f.consentToggle = {before, ticked, unticked, formAfter: (await L.formFacts(page, {names})).contexts};
            });

            // --- the roles, the consent lines, the interests, "Register" (scenario 6)
            await step('site.v1', async () => {
                f.v1 = {ticks: {seeded: await tickRole(page, w.seeded, 'Reader'), scratch: await tickRole(page, ctxA.name, second)}};
                const box = page.locator('form#register .reviewer_nocontext_interests input[name="interests"]');
                f.v1.interestsBox = {count: await box.count(), visible: await box.first().isVisible().catch(() => false), valueBefore: await box.first().inputValue().catch(() => null)};
                if (app.name !== 'ops' && (await box.count())) {
                    await box.first().click();
                    await box.first().pressSequentially(typed);
                    f.v1.interestsBox.typed = await box.first().inputValue();
                }
                await L.fill(page, v1);
                f.v1.formBefore = await L.formFacts(page, {names});
                await L.snap(page, 'site-04-v1-filled');
                f.v1.press = await L.press(page);
                const s = await L.snap(page, 'site-05-v1-complete');
                await shot(page, 'site-05-v1-complete');
                f.v1.complete = await L.completeFacts(page);
                f.v1.notices = s.notices;
                f.v1.account = {row: userRow(v1.username), roles: rolesOf(v1.username)};
                f.v1.stored = stored();
                await loc(page, 'Registration complete: the links', page.locator('ul.registration_complete_actions a'));
            });

            // --- "Edit My Profile" › Roles
            await step('site.v1.roles', async () => {
                await page.locator('ul.registration_complete_actions').getByRole('link', {name: 'Edit My Profile', exact: true}).click();
                await page.locator('#profileTabs').waitFor({timeout: T});
                f.v1.profileLanded = rel(page.url());
                await L.openRoles(page, app, null);
                await L.snap(page, 'site-06-v1-roles');
                await shot(page, 'site-06-v1-roles');
                f.v1.roles = await L.rolesFacts(page, names);
                await loc(page, 'Profile Roles tab: the interest chips', page.locator('form#rolesForm #interests .tagit-label'));
                await loc(page, 'Profile Roles tab: a ticked role box', page.locator('form#rolesForm input[type="checkbox"]:checked'));
            });

            // --- the completion page once more, "Continue Browsing"
            await step('site.v1.continue', async () => {
                await page.goto(u('index/user/register'));
                await idle(page);
                f.v1.completeAgain = await L.completeFacts(page);
                await page.locator('ul.registration_complete_actions').getByRole('link', {name: 'Continue Browsing', exact: true}).click();
                await page.waitForLoadState('load');
                await idle(page);
                f.v1.continueLanded = {url: rel(page.url()), title: await page.title(), h1: flat(await page.locator('h1').first().innerText({timeout: 3000}).catch(() => null), 120)};
            });
        });

        // --- a second visitor types the same interests (Rule 8); on a preprint server a further one too
        const typists = app.name === 'ops' ? [v2, v4] : [v2];
        for (const who of typists) {
            const key = who === v2 ? 'v2' : 'v4';
            await visitor(app, async (page) => {
                await step(`site.${key}`, async () => {
                    await page.goto(u('index/user/register'));
                    await idle(page);
                    f[key] = {ticks: {reader: await tickRole(page, ctxA.name, 'Reader')}};
                    if (w.reviewer) f[key].ticks.reviewer = await tickRole(page, ctxA.name, w.reviewer);
                    const box = page.locator('form#register .reviewer_nocontext_interests input[name="interests"]');
                    await box.first().click();
                    await box.first().pressSequentially(typed);
                    f[key].typed = await box.first().inputValue();
                    await L.fill(page, who);
                    await L.snap(page, `site-07-${key}-filled`);
                    f[key].press = await L.press(page);
                    const s = await L.snap(page, `site-08-${key}-complete`);
                    f[key].notices = s.notices;
                    f[key].complete = await L.completeFacts(page);
                    f[key].stored = stored();
                    f[key].account = {row: userRow(who.username), roles: rolesOf(who.username)};
                    await L.openRoles(page, app, ctxA.path);
                    await L.snap(page, `site-09-${key}-roles`);
                    f[key].roles = await L.rolesFacts(page, [ctxA.name]);
                });
            });
        }

        // --- the first typist's Roles tab, the manager's "View more details", a Roles "Save", both again
        const first = app.name === 'ops' ? v2 : v1;
        const managerRead = async (label) =>
            visitor(app, async (page) => {
                await signIn(page, ctxA.manager, {contextPath: ctxA.path});
                const r = await L.managerEditRead(page, ctxA.path, first.username, words);
                await L.snap(page, `site-${label}`);
                return r;
            });
        await step('site.managerBefore', async () => {
            f.managerBefore = await managerRead('10-manager-before');
        });
        await visitor(app, async (page) => {
            await step('site.rolesSave', async () => {
                await signIn(page, first.username, {contextPath: ctxA.path, password: first.password});
                await L.openRoles(page, app, ctxA.path);
                f.rolesBeforeSave = await L.rolesFacts(page, [ctxA.name]);
                await L.snap(page, 'site-11-first-roles-before-save');
                const sent = [];
                const onReq = (r) => {
                    if (r.method() === 'POST' && /profile-tab\/save-roles/.test(r.url())) sent.push(r);
                };
                page.on('request', onReq);
                await page.locator('form#rolesForm').getByRole('button', {name: 'Save', exact: true}).click();
                await sleep(1500);
                await idle(page).catch(() => {});
                page.off('request', onReq);
                const posts = [];
                for (const r of sent) {
                    const res = await r.response().catch(() => null);
                    const sentFields = decodeURIComponent((r.postData() || '').replace(/\+/g, ' ')).split('&').filter((x) => /interest|keyword/i.test(x));
                    posts.push({status: res ? res.status() : null, interestFields: sentFields.slice(0, 12)});
                }
                const s = await L.snap(page, 'site-12-first-roles-saved');
                f.rolesSave = {posts, notices: s.notices, stored: stored()};
                await page.reload();
                await L.openRoles(page, app, null);
                f.rolesAfterSave = await L.rolesFacts(page, [ctxA.name]);
                await L.snap(page, 'site-13-first-roles-after-reload');
            });
        });
        await step('site.managerAfter', async () => {
            f.managerAfter = await managerRead('14-manager-after');
        });

        // --- a visitor with nothing ticked (Rule 5, Rule 8, scenario 6)
        await visitor(app, async (page) => {
            const dialogs = [];
            page.on('dialog', (d) => {
                dialogs.push({type: d.type(), message: d.message().slice(0, 200)});
                d.accept().catch(() => {});
            });
            await step('site.v3.leave', async () => {
                // the page left with something typed and nothing sent: what asks on the way out
                await page.goto(u('index/user/register'));
                await idle(page);
                await page.locator('form#register input[name="givenName"]').fill('Left unsaved');
                await page.locator('form#register input[name="email"]').fill(v3.email);
                await page.locator('form#register input[name="email"]').blur();
                await page.locator('form#register a.login, form#register a').filter({hasText: /^\s*Login\s*$/}).first().click();
                await page.waitForLoadState('load');
                await idle(page);
                f.v3leave = {landed: rel(page.url()), h1: flat(await page.locator('h1').first().innerText({timeout: 3000}).catch(() => null), 120), dialogs: dialogs.slice()};
                await L.snap(page, 'site-15-left-for-login');
            });
            await step('site.v3', async () => {
                await page.goto(u('index/user/register'));
                await idle(page);
                await L.fill(page, v3);
                const form = await L.formFacts(page, {names});
                f.v3 = {
                    formBefore: {siteConsent: form.siteConsent, contexts: form.contexts, checkedBoxes: await page.locator('form#register input[type="checkbox"]:checked').count(), emailConsent: (form.controls.find((c) => c.name === 'emailConsent') || {}).checked},
                };
                await L.snap(page, 'site-16-v3-filled');
                f.v3.press = await L.press(page);
                const s = await L.snap(page, 'site-17-v3-complete');
                f.v3.notices = s.notices;
                f.v3.complete = await L.completeFacts(page);
                f.v3.account = {row: userRow(v3.username), roles: rolesOf(v3.username)};
                await L.openRoles(page, app, seededPath);
                await L.snap(page, 'site-18-v3-roles');
                f.v3.roles = await L.rolesFacts(page, names);
            });
            await step('site.v3.rolesLeave', async () => {
                // the Roles tab left with a box ticked and not saved
                const before = dialogs.length;
                const box = page.locator('form#rolesForm input[type="checkbox"]').first();
                await box.check();
                await box.blur();
                await page.locator('#profileTabs').getByRole('tab', {name: 'Identity', exact: true}).click();
                await sleep(1500);
                await idle(page).catch(() => {});
                const s = await L.snap(page, 'site-19-v3-roles-left');
                f.v3.rolesLeft = {dialogs: dialogs.slice(before), notices: s.notices, activeTab: flat(await page.locator('#profileTabs > ul > li.ui-tabs-active').innerText().catch(() => null), 40), rolesAfter: rolesOf(v3.username)};
            });
        });
    });

    // ================================================================================================
    // flags: what decides a context's boxes on the site-level page (Rule 8, Settings)
    // ================================================================================================
    await phase('flags', async (f) => {
        const {RolesTab} = require('../../../pages/ContextIdentityPages.js');
        const {SettingsPages} = require('../../../pages/ContextIdentityPages.js');
        const {SiteAccessTab} = require('../../../pages/RolesConfigurationPages.js');
        const FLAG = 'Allow user self-registration';
        const reader = await launch(app); // the signed-out visitor
        const mgr = await launch(app); // the scratch context's manager
        const read = async (label) => {
            await reader.page.goto(u('index/user/register'));
            await idle(reader.page);
            const form = await L.formFacts(reader.page, {names: [ctxB.name]});
            await L.snap(reader.page, `flags-${label}`, {block: form.contexts.named});
            return {block: form.contexts.named[0] || null, missing: form.contexts.missing};
        };
        try {
            await signIn(mgr.page, ctxB.manager, {contextPath: ctxB.path});
            const roles = new RolesTab(mgr.page, ctxB.path);
            await step('flags.start', async () => {
                f.start = await read('01-start');
                await roles.goto();
                await roles.openRoleWindow('Reader');
                f.roleWindow = {text: flat(await roles.roleWindow.innerText(), 900), flag: {count: await roles.box(FLAG).count(), checked: await roles.box(FLAG).isChecked().catch(() => null)}};
                await L.snap(mgr.page, 'flags-02-reader-role-window');
                await loc(mgr.page, 'Roles › "Edit": "Allow user self-registration"', roles.box(FLAG));
            });
            await step('flags.readerClosed', async () => {
                await roles.setRoleBox('Reader', FLAG, false);
                f.readerClosed = await read('03-reader-closed');
            });
            if (w.reviewer) {
                await step('flags.reviewerClosed', async () => {
                    await roles.setRoleBox(w.reviewer, FLAG, false);
                    f.reviewerClosed = await read('04-reviewer-closed');
                });
            }
            if (w.second) {
                await step('flags.secondOpen', async () => {
                    await roles.setRoleBox(w.second, FLAG, true);
                    f.secondOpen = await read('05-second-reviewer-open');
                });
            }
            await step('flags.restored', async () => {
                await roles.setRoleBox('Reader', FLAG, true);
                if (w.reviewer) await roles.setRoleBox(w.reviewer, FLAG, true);
                f.restored = await read('06-restored');
            });
            await step('flags.statementEmptied', async () => {
                const settings = new SettingsPages(mgr.page, ctxB.path);
                const form = await settings.openWebsiteSetupTab('privacy');
                const before = flat(await form.richContent('privacy-privacyStatement-control'), 160);
                await form.typeRich('privacy-privacyStatement-control', '');
                const res = await form.pressSave();
                await form.savedStatus.waitFor({state: 'visible', timeout: T}).catch(() => {});
                f.statementEmptied = {before, saveStatus: res.status(), page: await read('07-statement-emptied')};
                // a role ticked under it: no line comes
                const blk = L.block(reader.page, ctxB.name);
                await L.roleBox(blk, 'Reader').check();
                await sleep(300);
                f.statementEmptied.afterTick = (await L.formFacts(reader.page, {names: [ctxB.name]})).contexts.named[0];
            });
            await step('flags.closed', async () => {
                const tab = new SiteAccessTab(mgr.page, ctxB.path);
                await tab.goto();
                f.accessOptions = flat(await tab.panel.innerText(), 900);
                await L.snap(mgr.page, 'flags-08-site-access-options');
                await tab.radio(w.closeChoice).check();
                const res = await tab.save();
                f.closed = {saveStatus: res.status(), page: await read('09-registration-closed')};
                await shot(reader.page, 'flags-09-registration-closed');
            });
        } finally {
            await reader.close();
            await mgr.close();
        }
    });

    // ================================================================================================
    // valid: email validation on the variant server (Rules 11-14, scenario 7, A1, A2, A6)
    // ================================================================================================
    await phase('valid', async (f) => {
        const w1 = person('w1', `W1${sfx}`);
        const w2 = person('w2', `W2${sfx}`);
        const n1 = person('n1', `N1${sfx}`);
        const n2 = person('n2', `N2${sfx}`);
        const n3 = person('n3', `N3${sfx}`);
        const support = {name: `Support ${sfx}`, email: `${t}support@mail.test`};
        const supportN = {name: `Support N ${sfx}`, email: `${t}nsupport@mail.test`};
        const vlog = L.variantLog(app);
        f.people = {w1: w1.username, w2: w2.username, n1: n1.username, n2: n2.username, n3: n3.username};
        f.variant = VO;
        f.config = {variant: L.configKeys(app.validationConfigFile), fleet: L.configKeys(app.configFile), template: L.configKeys(require('path').join(app.root, 'config.TEMPLATE.inc.php'))};
        f.site = {title: q(`select locale, setting_value from site_settings where setting_name = 'title'`), contact: q(`select setting_name, locale, setting_value from site_settings where setting_name in ('contactName', 'contactEmail') order by 1, 2`)};

        await step('valid.support', async () => {
            f.support = await setSupport(ctxA, support, '00');
        });

        const registerUrl = (ctx) => `${VO}/index.php/${ctx}/user/register`;
        /** Register on a context-level page of the variant server; the press's facts. */
        const registerOn = async (page, ctxPath, who) => {
            await page.goto(registerUrl(ctxPath));
            await page.locator('form#register').waitFor({state: 'visible', timeout: T});
            await L.fill(page, who);
            return L.press(page);
        };

        // --- a browser without JavaScript (scenario 7; Fields "Spam check")
        const sinceW1 = new Date();
        await step('valid.noscript', async () => {
            const b = await launch(vapp);
            const ctx = await b.browser.newContext({baseURL: VO, javaScriptEnabled: false, viewport: {width: 1280, height: 900}});
            try {
                const page = await ctx.newPage();
                const res = await page.goto(registerUrl(ctxA.path));
                const form = page.locator('form#register');
                await form.waitFor({state: 'visible', timeout: T});
                await L.fill(page, w1);
                const answer = page.waitForResponse((r) => r.request().method() === 'POST' && /user\/register/.test(r.url()), {timeout: 60_000}).catch(() => null);
                await form.locator('button.submit').click();
                const post = await answer;
                await page.waitForLoadState('load').catch(() => {});
                f.noscript = {
                    opened: res && res.status(),
                    postStatus: post ? post.status() : null,
                    url: rel(page.url()),
                    h1: flat(await page.locator('h1').first().innerText({timeout: 3000}).catch(() => null), 120),
                    errors: await L.errorsOf(page),
                    values: await L.valuesOf(page),
                    widget: await page.locator('altcha-widget').count(),
                    account: userRow(w1.username),
                };
                await L.snap(page, 'valid-01-noscript-refused');
            } finally {
                await ctx.close().catch(() => {});
                await b.close();
            }
        });

        // --- the same visitor with JavaScript on: the waiting page, the same again, sign-in refused
        await visitor(vapp, async (page) => {
            await step('valid.w1.register', async () => {
                await page.goto(registerUrl(ctxA.path));
                await page.locator('form#register').waitFor({state: 'visible', timeout: T});
                f.w1 = {form: {altcha: await page.locator('altcha-widget').count(), widgetText: flat(await page.locator('altcha-widget').first().innerText().catch(() => null), 120)}};
                await L.fill(page, w1);
                f.w1.press = await L.press(page);
                const s = await L.snap(page, 'valid-02-awaiting');
                await shot(page, 'valid-02-awaiting');
                f.w1.awaiting = await L.pageFacts(page);
                f.w1.awaiting.notices = s.notices;
                f.w1.account = {row: userRow(w1.username), roles: rolesOf(w1.username)};
                f.w1.invitation = q(`select i.type, i.status, i.context_id is not null as has_context, round(extract(epoch from (i.expiry_date - i.created_at)) / 86400.0, 3) as days, i.expiry_date > now() as live from invitations i join users u on u.user_id = i.user_id where u.username = '${w1.username}' order by i.invitation_id`);
                await loc(page, 'Registration awaiting verification: the heading', page.locator('h1'));
            });
            await step('valid.w1.again', async () => {
                f.w1.again = await registerOn(page, ctxA.path, w1);
                f.w1.againValues = await L.valuesOf(page);
                await L.snap(page, 'valid-03-same-again');
            });
            await step('valid.w1.loginBefore', async () => {
                f.w1.loginBefore = await L.loginTry(page, VO, ctxA.path, w1);
                await L.snap(page, 'valid-04-login-before-activating');
            });
        });
        await step('valid.w1.mail', async () => {
            f.w1.mail = await L.validationMail(app, w1.email, sinceW1, VO);
        });

        // --- the emailed link, an altered key, "Activate Account", Back, the button's address, sign-in
        await visitor(vapp, async (page, b) => {
            const link = f.w1 && f.w1.mail && f.w1.mail.link;
            if (!link) {
                errors.push({step: 'valid.w1.activate', error: 'no activation link in the email'});
                return;
            }
            let activateAddress = null;
            await step('valid.w1.link', async () => {
                const res = await page.goto(link);
                const s = await L.snap(page, 'valid-05-activation-page');
                await shot(page, 'valid-05-activation-page');
                f.w1.activation = await L.pageFacts(page, res);
                f.w1.activation.notices = s.notices;
                const btn = page.getByRole('link', {name: 'Activate Account', exact: true});
                f.w1.activation.control = await btn.evaluateAll((els) => els.map((e) => ({tag: e.tagName.toLowerCase(), cls: e.className, href: e.getAttribute('href'), inForm: !!e.closest('form')})));
                activateAddress = f.w1.activation.control[0] ? new URL(f.w1.activation.control[0].href, page.url()).toString() : null;
                await loc(page, 'Activation page: "Activate Account"', btn);
            });
            await step('valid.w1.altered', async () => {
                const other = await b.context.newPage();
                try {
                    const last = link.slice(-1);
                    const altered = link.slice(0, -1) + (last === 'a' ? 'b' : 'a');
                    const res = await other.goto(altered);
                    await L.snap(other, 'valid-06-altered-key');
                    await shot(other, 'valid-06-altered-key');
                    f.w1.altered = await L.pageFacts(other, res);
                } finally {
                    await other.close();
                }
            });
            await step('valid.w1.activate', async () => {
                const answer = page.waitForResponse((r) => /user\/activateUser/.test(r.url()), {timeout: T}).catch(() => null);
                await page.getByRole('link', {name: 'Activate Account', exact: true}).click();
                const res = await answer;
                const s = await L.snap(page, 'valid-07-activated');
                await shot(page, 'valid-07-activated');
                f.w1.activated = await L.pageFacts(page, res);
                f.w1.activated.notices = s.notices;
                f.w1.activated.account = userRow(w1.username);
                f.w1.activated.invitation = q(`select i.status from invitations i join users u on u.user_id = i.user_id where u.username = '${w1.username}' order by i.invitation_id`);
            });
            await step('valid.w1.back', async () => {
                const res = await page.goBack();
                const s = await L.snap(page, 'valid-08-back-button');
                await shot(page, 'valid-08-back-button');
                f.w1.back = await L.pageFacts(page, res);
                f.w1.back.notices = s.notices;
                await loc(page, 'Invitation Unavailable: the landing', page.locator('.page_invitation_unavailable'));
                // the landing's two buttons, pressed in turn
                f.w1.unavailableButtons = {};
                for (const name of ['Login', 'Register']) {
                    const control = page.locator('.page_invitation_unavailable').getByRole('link', {name, exact: true}).or(page.locator('.page_invitation_unavailable').getByRole('button', {name, exact: true}));
                    if (!(await control.count())) {
                        f.w1.unavailableButtons[name] = {present: false};
                        continue;
                    }
                    await control.first().click();
                    await page.waitForLoadState('load');
                    await idle(page).catch(() => {});
                    f.w1.unavailableButtons[name] = {present: true, landed: rel(page.url()), h1: flat(await page.locator('h1').first().innerText({timeout: 3000}).catch(() => null), 120)};
                    await page.goto(link);
                    await idle(page).catch(() => {});
                }
            });
            await step('valid.w1.activateAgain', async () => {
                const res = await page.goto(activateAddress);
                const s = await L.snap(page, 'valid-09-button-address-again');
                f.w1.activateAgain = await L.pageFacts(page, res);
                f.w1.activateAgain.notices = s.notices;
                f.w1.activateAgain.address = rel(activateAddress).replace(/invitationKey=[^&]+/, 'invitationKey=…');
            });
            await step('valid.w1.loginAfter', async () => {
                f.w1.loginAfter = await L.loginTry(page, VO, ctxA.path, w1);
                await L.snap(page, 'valid-10-signed-in');
                f.w1.accountAfterLogin = userRow(w1.username);
            });
            await step('valid.w1.linkAgain', async () => {
                const res = await page.goto(link);
                await L.snap(page, 'valid-11-link-once-more');
                f.w1.linkAgain = await L.pageFacts(page, res);
                f.w1.mailCountAtEnd = await app.mail.count({to: w1.email, since: sinceW1});
            });
        });

        // --- the second visitor on the site-level page of the variant server
        const sinceW2 = new Date();
        await visitor(vapp, async (page) => {
            await step('valid.w2.register', async () => {
                await page.goto(`${VO}/index.php/index/user/register`);
                await page.locator('form#register').waitFor({state: 'visible', timeout: T});
                const blk = L.block(page, w.seeded);
                await L.roleBox(blk, 'Reader').check();
                await sleep(250);
                await blk.locator('.context_privacy input[type="checkbox"]').check();
                await L.fill(page, w2);
                await L.snap(page, 'valid-12-site-filled');
                f.w2 = {press: await L.press(page)};
                const s = await L.snap(page, 'valid-13-site-awaiting');
                f.w2.awaiting = await L.pageFacts(page);
                f.w2.awaiting.notices = s.notices;
                f.w2.account = {row: userRow(w2.username), roles: rolesOf(w2.username)};
                f.w2.mail = await L.validationMail(app, w2.email, sinceW2, VO);
            });
            await step('valid.w2.activate', async () => {
                const res = await page.goto(f.w2.mail.link);
                await L.snap(page, 'valid-14-site-activation-page');
                f.w2.activation = await L.pageFacts(page, res);
                await page.getByRole('link', {name: 'Activate Account', exact: true}).click();
                await L.snap(page, 'valid-15-site-activated');
                f.w2.activated = await L.pageFacts(page);
            });
        });
        await visitor(vapp, async (page) => {
            await step('valid.w2.login', async () => {
                f.w2.login = await L.loginTry(page, VO, 'index', w2);
                await L.snap(page, 'valid-16-site-signed-in');
                f.w2.landing = await L.pageFacts(page);
            });
        });

        // --- a context with no technical support contact (A6)
        const sinceN = new Date();
        await visitor(vapp, async (page) => {
            for (const [key, who] of [['n1', n1], ['n2', n2]]) {
                await step(`valid.${key}.register`, async () => {
                    const from = vlog.mark();
                    const press = await registerOn(page, ctxN.path, who);
                    const s = await L.snap(page, `valid-17-${key}-no-support-contact`);
                    if (key === 'n1') await shot(page, 'valid-17-n1-no-support-contact');
                    f[key] = {press, page: await L.pageFacts(page), notices: s.notices, log: vlog.since(from).slice(0, 6), account: {row: userRow(who.username), roles: rolesOf(who.username)}};
                });
            }
            await step('valid.n1.again', async () => {
                f.n1.again = await registerOn(page, ctxN.path, n1);
                await L.snap(page, 'valid-18-n1-same-again');
            });
        });
        await visitor(vapp, async (page) => {
            await step('valid.n1.loginRefused', async () => {
                f.n1.loginRefused = await L.loginTry(page, VO, ctxN.path, n1);
                await L.snap(page, 'valid-19-n1-login-refused');
            });
        });
        await step('valid.n.support', async () => {
            f.supportN = await setSupport(ctxN, supportN, '20');
        });
        await visitor(vapp, async (page) => {
            await step('valid.n3.register', async () => {
                const since = new Date();
                f.n3 = {press: await registerOn(page, ctxN.path, n3)};
                await L.snap(page, 'valid-21-n3-awaiting');
                f.n3.mail = await L.validationMail(app, n3.email, since, VO);
                // the control has arrived: the two stranded addresses, read after it
                f.n1.mailCount = await app.mail.count({to: n1.email, since: sinceN});
                f.n2.mailCount = await app.mail.count({to: n2.email, since: sinceN});
            });
        });
        await visitor(vapp, async (page) => {
            await step('valid.n1.loginStillRefused', async () => {
                f.n1.loginStillRefused = await L.loginTry(page, VO, ctxN.path, n1);
            });
        });
        // "Enable User": the context's manager for one account, the site administrator for the other
        for (const [key, who, actor] of [['n1', n1, ctxN.manager], ['n2', n2, 'admin']]) {
            await visitor(app, async (page) => {
                await step(`valid.${key}.enable`, async () => {
                    await signIn(page, actor, actor === 'admin' ? {} : {contextPath: ctxN.path});
                    f[key].enable = {by: actor, ...(await L.enableUser(page, ctxN.path, {search: who.username, email: who.email, fullName: `${who.given} ${who.family}`}, async () => {
                        await L.snap(page, `valid-22-${key}-enable-window`);
                    }))};
                    await L.snap(page, `valid-23-${key}-enabled`);
                    f[key].enable.account = userRow(who.username);
                });
            });
            await visitor(vapp, async (page) => {
                await step(`valid.${key}.loginEnabled`, async () => {
                    f[key].loginEnabled = await L.loginTry(page, VO, ctxN.path, who);
                    await L.snap(page, `valid-24-${key}-signed-in`);
                });
            });
        }

        // --- the two validation email templates on the Emails screen
        await visitor(app, async (page) => {
            await step('valid.emails', async () => {
                const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
                await signIn(page, ctxA.manager, {contextPath: ctxA.path});
                const emails = new ManageEmailsPage(page, ctxA.path);
                await emails.goto();
                await emails.search('Validate');
                await sleep(1200);
                await idle(page).catch(() => {});
                const s = await L.snap(page, 'valid-25-emails-validate');
                f.emails = {url: rel(page.url()), rows: await emails.rowNames(), items: (await emails.rows().allInnerTexts()).map((x) => flat(x, 260)), notices: s.notices};
            });
        });

        // --- no mail to the accounts registered with validation off (Side effects), read after the mails above
        if (facts.site && facts.site.people) {
            await step('valid.noWelcomeMail', async () => {
                const p = facts.site.people;
                const since = facts.site.since;
                facts.site.mail = {};
                for (const name of [p.v1, p.v2, p.v3, p.v4].filter(Boolean)) {
                    facts.site.mail[name] = await app.mail.count({to: `${name}@mail.test`, since});
                }
                facts.site.mail.control = f.n3 && f.n3.mail ? {to: n3.email, found: f.n3.mail.found} : null;
                record('facts-site', {mail: facts.site.mail}, {merge: true});
            });
        }
    });

    // ================================================================================================
    // extra: the context's own page beside the site-level one; a manager's "Enable User" before the link
    // ================================================================================================
    await phase('extra', async (f) => {
        const ctxX = {path: `${t}x`, name: `SW2 X ${sfx}`, manager: `${t}xmg`};
        const x1 = person('x1', `X1${sfx}`);
        await app.api.createContext({tag: ctxX.path, context: {name: ctxX.name, acronym: 'SW2', country: 'CA'}, users: [{username: ctxX.manager, roles: ['manager']}]});
        f.people = {x1: x1.username, context: ctxX.path};

        // --- a context's own Register page, signed out (OPS1: "the server's own Register page asks nothing of the kind")
        await visitor(app, async (page) => {
            await step('extra.contextPage', async () => {
                for (const [key, ctxPath] of [['seeded', seededPath], ['scratch', ctxX.path]]) {
                    await page.goto(u(`${ctxPath}/user/register`));
                    await idle(page);
                    const form = await L.formFacts(page);
                    await L.snap(page, `extra-01-context-register-${key}`);
                    f[`contextPage_${key}`] = {
                        url: rel(page.url()),
                        siteInterests: form.siteInterests,
                        contextReviewerBlock: form.contextReviewerBlock,
                        contextInterests: form.contextInterests,
                        interestsInputs: await page.locator('form#register input[name="interests"]').count(),
                        checkboxes: form.controls.filter((c) => c.type === 'checkbox').map((c) => ({name: c.name, label: c.label, visible: c.visible})),
                        contextBlocks: form.contexts.count,
                    };
                }
            });
        });

        // --- waiting for validation, enabled by the manager, then the emailed link
        await step('extra.support', async () => {
            f.support = await setSupport(ctxX, {name: `Support X ${sfx}`, email: `${t}xsupport@mail.test`}, 'extra-02');
        });
        const since = new Date();
        await visitor(vapp, async (page) => {
            await step('extra.x1.register', async () => {
                await page.goto(`${VO}/index.php/${ctxX.path}/user/register`);
                await page.locator('form#register').waitFor({state: 'visible', timeout: T});
                await L.fill(page, x1);
                f.x1 = {press: await L.press(page)};
                f.x1.mail = await L.validationMail(app, x1.email, since, VO);
                f.x1.account = userRow(x1.username);
            });
        });
        await visitor(app, async (page) => {
            await step('extra.x1.enable', async () => {
                await signIn(page, ctxX.manager, {contextPath: ctxX.path});
                f.x1.enable = await L.enableUser(page, ctxX.path, {search: x1.username, email: x1.email, fullName: `${x1.given} ${x1.family}`});
                f.x1.accountEnabled = userRow(x1.username);
                f.x1.invitationEnabled = q(`select i.status, i.expiry_date > now() as live from invitations i join users u on u.user_id = i.user_id where u.username = '${x1.username}' order by i.invitation_id`);
            });
        });
        await visitor(vapp, async (page) => {
            await step('extra.x1.loginEnabled', async () => {
                f.x1.loginEnabled = await L.loginTry(page, VO, ctxX.path, x1);
                await L.snap(page, 'extra-03-x1-signed-in-after-enable');
                await signOut(page, {origin: VO});
            });
            await step('extra.x1.link', async () => {
                const res = await page.goto(f.x1.mail.link);
                await L.snap(page, 'extra-04-x1-link-after-enable');
                f.x1.linkAfterEnable = await L.pageFacts(page, res);
                const btn = page.getByRole('link', {name: 'Activate Account', exact: true});
                if (await btn.count()) {
                    await btn.click();
                    const s = await L.snap(page, 'extra-05-x1-activate-after-enable');
                    f.x1.activateAfterEnable = await L.pageFacts(page);
                    f.x1.activateAfterEnable.notices = s.notices;
                }
                f.x1.accountAfterLink = userRow(x1.username);
                f.x1.invitationAfterLink = q(`select i.status from invitations i join users u on u.user_id = i.user_id where u.username = '${x1.username}' order by i.invitation_id`);
            });
        });
        await visitor(vapp, async (page) => {
            await step('extra.x1.loginAfterLink', async () => {
                f.x1.loginAfterLink = await L.loginTry(page, VO, ctxX.path, x1);
            });
        });
    });

    // ================================================================================================
    // sitecfg: the site's own record, changed and put back
    // ================================================================================================
    await phase('sitecfg', async (f) => {
        const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
        const names = [w.seeded];
        const statement = `SW2 site statement ${sfx}`;
        const title = `SW2 Site ${sfx}`;
        const c1 = person('c1');
        const c2 = person('c2');
        const siteRows = () => q(`select setting_name, locale, left(setting_value, 60) from site_settings where setting_name in ('title', 'privacyStatement') order by 1, 2`);
        f.before = siteRows();
        const admin = await launch(app);
        try {
            await signIn(admin.page, 'admin');
            const site = new SiteSettingsPage(admin.page);
            const setStatement = async (text) => {
                await site.goto();
                const form = await site.information();
                const before = flat(await form.richContent(form.privacyId()), 120);
                await form.typeRich(form.privacyId(), text);
                const res = await form.pressSave();
                await sleep(800);
                return {before, status: res.status(), rows: siteRows()};
            };
            try {
                await step('sitecfg.statement', async () => {
                    f.statementSet = await setStatement(statement);
                    await L.snap(admin.page, 'cfg-01-site-information-saved');
                    await visitor(app, async (page) => {
                        await page.goto(u('index/user/register'));
                        await idle(page);
                        const form = await L.formFacts(page, {names});
                        const s = await L.snap(page, 'cfg-02-site-register-with-site-statement');
                        await shot(page, 'cfg-02-site-register-with-site-statement');
                        f.withStatement = {siteConsent: form.siteConsent, contexts: form.contexts, controls: form.controls.filter((c) => c.type === 'checkbox')};
                        await loc(page, "site-level Register: the site's own consent box (site statement set)", page.locator('form#register input[name="privacyConsent[0]"]'));
                        // a role and its context's line ticked, the site's box left unticked
                        const blk = L.block(page, w.seeded);
                        await L.roleBox(blk, 'Reader').check();
                        await sleep(250);
                        f.withStatement.contextLineAfterTick = (await L.formFacts(page, {names})).contexts.named[0];
                        await blk.locator('.context_privacy input[type="checkbox"]').check();
                        await L.fill(page, c1);
                        f.withStatement.refused = await L.press(page);
                        await L.snap(page, 'cfg-03-site-consent-missing');
                        f.withStatement.account = userRow(c1.username);
                        // the statement's own page, from the box's link
                        if (form.siteConsent && form.siteConsent.link) {
                            const res = await page.goto(new URL(form.siteConsent.link, page.url()).toString());
                            f.withStatement.statementPage = await L.pageFacts(page, res);
                            await L.snap(page, 'cfg-04-site-privacy-page');
                        }
                        void s;
                    });
                });
            } finally {
                await step('sitecfg.statementBack', async () => {
                    f.statementCleared = await setStatement('');
                    await visitor(app, async (page) => {
                        await page.goto(u('index/user/register'));
                        await idle(page);
                        f.afterClear = {siteConsent: (await L.formFacts(page, {names})).siteConsent};
                        await L.snap(page, 'cfg-05-site-register-statement-cleared');
                    });
                });
            }
        } finally {
            await admin.close();
        }

        // --- a Site Name: the validation email of a site-level registration names it
        try {
            await step('sitecfg.title', async () => {
                f.titleSet = await app.api.setSite({title});
                const since = new Date();
                await visitor(vapp, async (page) => {
                    await page.goto(`${VO}/index.php/index/user/register`);
                    await page.locator('form#register').waitFor({state: 'visible', timeout: T});
                    f.titled = {pageTitle: await page.title(), siteName: flat(await page.locator('.pkp_site_name').first().innerText().catch(() => null), 120)};
                    const blk = L.block(page, w.seeded);
                    await L.roleBox(blk, 'Reader').check();
                    await sleep(250);
                    await blk.locator('.context_privacy input[type="checkbox"]').check();
                    await L.fill(page, c2);
                    f.titled.press = await L.press(page);
                    await L.snap(page, 'cfg-06-titled-site-awaiting');
                });
                f.titled.mail = await L.validationMail(app, c2.email, since, VO);
            });
        } finally {
            await step('sitecfg.titleBack', async () => {
                f.titleCleared = await app.api.setSite({title: ''});
                f.after = siteRows();
            });
        }
    });

    if (errors.length) console.error(`[sw2] ${app.name}: ${errors.length} step failures: ${JSON.stringify(errors).slice(0, 1500)}`);
    void note;
});
