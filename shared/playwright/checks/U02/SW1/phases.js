// The later phases of sw1.js (reg, roles, scratch, variant, site). Requiring this file runs nothing.
const {launch, signIn, signOut, shot, record, loc, idle, tag} = require('../../../probe');
const L = require('./lib.js');

const {flat, rel, sleep} = L;

/** Fill the Login form on the page as it stands (a Login page reached by a link) and press "Login". */
async function loginHere(page, username, password) {
    const {LoginPage} = require('../../../pages/LoginPage.js');
    const login = new LoginPage(page);
    await login.usernameInput.fill(username);
    await login.fillPassword(password);
    if (await page.locator('altcha-widget').count()) {
        await page.waitForFunction(() => !!customElements.get('altcha-widget'), undefined, {timeout: 30_000}).catch(() => {});
    }
    await Promise.all([page.waitForLoadState('domcontentloaded'), login.submitButton.click()]);
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    return {url: rel(page.url()), headings: await L.headings(page), error: flat(await page.locator('.pkp_form_error, #formErrors, .error').first().innerText().catch(() => null), 400)};
}

module.exports = async function phases({app, w, ctx, facts, errors, u, step, phase, person, T}) {
    const pw = (name) => app.users.getPassword(name);
    const registerAt = async (page, path) => {
        await page.goto(u(path));
        await idle(page);
    };

    /**
     * A new Reader opens "Make a New Submission" from the completion page, presses nothing, signs out and
     * signs in again on the context's Login page: where that lands, and what the Roles tab then shows.
     */
    const submissionWalk = async (f, base, prefix = 'reg') => {
        const who = person(base, 'g');
        const {page, close} = await launch(app);
        try {
            await registerAt(page, `${ctx}/en/user/register`);
            await L.fill(page, who, {consent: true});
            f.submission = {who: who.username, press: await L.press(page)};
            await L.profileTab(page, app, ctx, 'Roles', 'form#rolesForm');
            f.submission.rolesBefore = (await L.rolesFacts(page)).first;
            await registerAt(page, `${ctx}/user/register`);
            await page.locator('ul.registration_complete_actions').getByRole('link', {name: 'Make a New Submission', exact: true}).click();
            await page.waitForURL((url) => !/user\/register/.test(url.pathname), {timeout: T});
            const s = await L.snap(page, `${prefix}-17-make-a-new-submission`);
            await sleep(1000);
            f.submission.wizard = {url: rel(page.url()), title: s.title, headings: await L.headings(page)};
            await signOut(page);
            await signIn(page, who.username, {password: who.password, contextPath: ctx});
            const n = await L.snap(page, `${prefix}-18-next-sign-in`);
            await sleep(1000);
            f.submission.nextSignIn = {url: rel(page.url()), title: n.title, headings: await L.headings(page), sideMenu: flat(await page.getByRole('navigation', {name: 'Site Navigation'}).innerText().catch(() => null), 400)};
            await L.profileTab(page, app, ctx, 'Roles', 'form#rolesForm');
            f.submission.rolesAfter = (await L.rolesFacts(page)).first;
        } finally {
            await close();
        }
    };

    // ================================================================================================
    // reg: throwaway registrations on the seeded context
    // ================================================================================================
    await phase('reg', async () => {
        const f = (facts.reg = {});
        const base = tag('u02sw1');
        f.base = base;
        const since = new Date();

        // --- scenario 1's first visitor: the header's "Register", the notification box left unticked
        await step('reg.plain', async () => {
            const who = person(base, 'a');
            const {page, close} = await launch(app);
            try {
                await page.goto(u(ctx));
                await page.locator('#navigationUser').getByRole('link', {name: 'Register', exact: true}).click();
                await page.waitForURL(/user\/register/, {timeout: T});
                await idle(page);
                await L.fill(page, who, {consent: true, emailConsent: false});
                f.plain = {who: who.username, typed: await L.valuesOf(page)};
                f.plain.press = await L.press(page);
                const s = await L.snap(page, 'reg-01-complete');
                await shot(page, 'reg-01-complete');
                f.plain.complete = await L.completeFacts(page);
                f.plain.completeText = flat(s.text.main, 3000).replace(/^.*?(Home \/)/, '$1').slice(0, 400);
                await loc(page, 'Registration complete: the links', page.locator('ul.registration_complete_actions a'));
                await page.reload();
                await idle(page);
                f.plain.reloaded = await L.completeFacts(page);
                // "Edit My Profile" › Roles, › Notifications
                await page.locator('ul.registration_complete_actions').getByRole('link', {name: 'Edit My Profile', exact: true}).click();
                await page.waitForURL(/user\/profile/, {timeout: T});
                await idle(page);
                f.plain.profile = {url: rel(page.url()), headings: await L.headings(page)};
                await L.profileTab(page, app, null, 'Roles', 'form#rolesForm');
                await L.snap(page, 'reg-02-roles');
                f.plain.roles = await L.rolesFacts(page);
                await L.profileTab(page, app, null, 'Notifications', 'form#notificationSettingsForm');
                await L.snap(page, 'reg-03-notifications');
                f.plain.notifications = await L.notificationFacts(page);
                // "Continue Browsing"
                await registerAt(page, `${ctx}/user/register`);
                await page.locator('ul.registration_complete_actions').getByRole('link', {name: 'Continue Browsing', exact: true}).click();
                await page.waitForLoadState('load');
                await idle(page);
                f.plain.continueBrowsing = {url: rel(page.url()), title: await page.title()};
                // the mail catcher: nothing for the new address
                await sleep(4000);
                f.plain.mail = await app.mail.count({to: who.email});
                f.plain.mailSince = await app.mail.count({to: who.email, since});
                // signing out and in again on the context's Login page
                await signOut(page);
                await signIn(page, who.username, {password: who.password, contextPath: ctx});
                await idle(page);
                f.plain.nextSignIn = {url: rel(page.url()), headings: await L.headings(page), header: (await L.header(page)).map((l) => l.text)};
                // the site-level Register address for this new Reader
                await registerAt(page, 'index/user/register');
                f.plain.siteLevel = await L.completeFacts(page);
            } finally {
                await close();
            }
        });

        // --- the control: the notification box ticked
        await step('reg.optin', async () => {
            const who = person(base, 'b');
            const {page, close} = await launch(app);
            try {
                await registerAt(page, `${ctx}/en/user/register`);
                await L.fill(page, who, {consent: true, emailConsent: true});
                f.optin = {who: who.username, press: await L.press(page)};
                await L.profileTab(page, app, ctx, 'Notifications', 'form#notificationSettingsForm');
                await L.snap(page, 'reg-04-notifications-opted-in');
                f.optin.notifications = await L.notificationFacts(page);
                await sleep(2000);
                f.optin.mail = await app.mail.count({to: who.email});
            } finally {
                await close();
            }
        });

        // --- scenario 3: the reviewer offer and its interests (a journal, a press); the absence on a server
        await step('reg.reviewer', async () => {
            const who = person(base, 'c');
            const {page, close} = await launch(app);
            try {
                await registerAt(page, `${ctx}/en/user/register`);
                const boxes = page.locator('form#register #reviewerOptinGroup input[type="checkbox"]');
                f.reviewer = {who: who.username, boxes: await boxes.count(), notificationBox: await page.locator('form#register input[name="emailConsent"]').count(), interestsBlock: await page.locator('form#register #reviewerInterests').count()};
                if (!(await boxes.count())) return;
                await L.fill(page, who, {consent: true});
                await boxes.first().check();
                await page.locator('form#register #reviewerInterests').waitFor({state: 'visible', timeout: T});
                await page.locator('form#register input#interests').fill('ethics, statistics');
                await L.snap(page, 'reg-05-reviewer-form');
                f.reviewer.press = await L.press(page);
                await L.snap(page, 'reg-06-reviewer-complete');
                f.reviewer.complete = await L.completeFacts(page);
                // the site-level address for a new Reviewer: two links only
                await registerAt(page, 'index/user/register');
                await L.snap(page, 'reg-07-reviewer-site-level-complete');
                f.reviewer.siteLevel = await L.completeFacts(page);
                await page.locator('ul.registration_complete_actions').getByRole('link', {name: 'Edit My Profile', exact: true}).click();
                await page.waitForURL(/user\/profile/, {timeout: T});
                await idle(page);
                await sleep(800);
                f.reviewer.siteEditProfile = {url: rel(page.url()), headings: await L.headings(page), active: flat(await page.locator('#profileTabs > ul > li.ui-tabs-active').innerText().catch(() => null))};
                await registerAt(page, 'index/user/register');
                await page.locator('ul.registration_complete_actions').getByRole('link', {name: 'Continue Browsing', exact: true}).click();
                await page.waitForLoadState('load');
                await idle(page);
                f.reviewer.siteContinue = {url: rel(page.url()), title: await page.title(), headings: (await L.headings(page)).slice(0, 3)};
                // "View Submissions"
                await registerAt(page, `${ctx}/user/register`);
                await page.locator('ul.registration_complete_actions').getByRole('link', {name: 'View Submissions', exact: true}).click();
                await page.waitForURL((url) => !/user\/register/.test(url.pathname), {timeout: T});
                const s = await L.snap(page, 'reg-08-reviewer-view-submissions');
                await sleep(1000);
                f.reviewer.viewSubmissions = {url: rel(page.url()), headings: await L.headings(page), title: s.title};
                // the profile's Roles tab
                await L.profileTab(page, app, ctx, 'Roles', 'form#rolesForm');
                await L.snap(page, 'reg-09-reviewer-roles');
                f.reviewer.roles = await L.rolesFacts(page);
                await loc(page, 'Roles tab: interest chips', page.locator('form#rolesForm #interests .tagit-label'));
            } finally {
                await close();
            }
        });

        // --- scenario 1's second visitor: an interrupted destination carried by the Login form's link (Rule 9)
        await step('reg.interrupted', async () => {
            const who = person(base, 'd');
            const {page, close} = await launch(app);
            try {
                await page.goto(u(`${ctx}/en/dashboard/mySubmissions`));
                await idle(page);
                const s = await L.snap(page, 'reg-10-login-with-destination');
                f.interrupted = {
                    who: who.username,
                    login: {url: rel(s.url), h1: flat(await page.locator('h1').first().innerText().catch(() => null)), header: await L.header(page), inForm: (await L.mainLinks(page)).filter((l) => /Register/i.test(l.text)), source: await page.locator('form#login input[name="source"]').inputValue().catch(() => null)},
                };
                await page.locator('form#login').getByRole('link', {name: 'Register', exact: true}).click();
                await page.waitForURL(/user\/register/, {timeout: T});
                await idle(page);
                f.interrupted.register = {url: rel(page.url()), source: (await L.valuesOf(page) || {}).source};
                await L.fill(page, who, {consent: true});
                f.interrupted.press = await L.press(page);
                const d = await L.snap(page, 'reg-11-interrupted-landing');
                f.interrupted.landing = {url: rel(d.url), title: d.title, headings: await L.headings(page), denied: await page.getByText('The current role does not have access to this operation.').count(), complete: await page.getByText('Thanks for registering!').count(), header: (await L.header(page)).map((l) => l.text), text: flat(d.text.main, 4000).replace(/^.*?(Home \/|Skip to site footer)/, '').slice(0, 300)};
            } finally {
                await close();
            }
        });

        // --- the control: the header's "Register" on that Login page carries no destination
        await step('reg.interruptedHeader', async () => {
            const who = person(base, 'e');
            const {page, close} = await launch(app);
            try {
                await page.goto(u(`${ctx}/en/dashboard/mySubmissions`));
                await idle(page);
                await page.locator('#navigationUser').getByRole('link', {name: 'Register', exact: true}).click();
                await page.waitForURL(/user\/register/, {timeout: T});
                await idle(page);
                f.interruptedHeader = {who: who.username, register: {url: rel(page.url()), source: (await L.valuesOf(page) || {}).source, sourceField: await page.locator('form#register input[name="source"]').count()}};
                await L.fill(page, who, {consent: true});
                f.interruptedHeader.press = await L.press(page);
                f.interruptedHeader.landing = await L.completeFacts(page);
            } finally {
                await close();
            }
        });

        // --- scenario 1's third visitor: the French Register page (Rules 1, 16)
        await step('reg.french', async () => {
            const who = person(base, 'f');
            const {page, close} = await launch(app);
            try {
                const res = await page.goto(u(`${ctx}/fr_CA/user/register`));
                await idle(page);
                const s = await L.snap(page, 'reg-12-french-register');
                f.french = {who: who.username, page: {status: res && res.status(), url: rel(s.url), title: s.title, h1: flat(await page.locator('h1').first().innerText().catch(() => null)), form: await page.locator('form#register').count()}};
                await L.fill(page, who, {consent: true, profile: {givenName: 'Prénom', familyName: 'Nom', affiliation: 'Laboratoire FR'}});
                f.french.press = await L.press(page);
                await L.snap(page, 'reg-13-french-complete');
                f.french.complete = await L.completeFacts(page);
                const boxes = async (form) => page.locator(`${form} input[type="text"], ${form} input:not([type]), ${form} textarea`).evaluateAll((els) => els.map((e) => ({name: e.name, value: e.value})).filter((e) => /givenName|familyName|affiliation|preferredPublicName/.test(e.name)));
                await page.goto(u(`${ctx}/en/user/profile`));
                await page.locator('form#identityForm').waitFor({timeout: T});
                await idle(page);
                await L.snap(page, 'reg-14-french-profile-identity-en');
                f.french.identityEn = await boxes('form#identityForm');
                await L.profileTab(page, app, null, 'Contact', 'form#contactForm');
                await L.snap(page, 'reg-15-french-profile-contact-en');
                f.french.contactEn = await boxes('form#contactForm');
                await page.goto(u(`${ctx}/fr_CA/user/profile`));
                await page.locator('form#identityForm').waitFor({timeout: T});
                await idle(page);
                await L.snap(page, 'reg-16-french-profile-identity-fr');
                f.french.identityFr = await boxes('form#identityForm');
                f.french.identityFrTabs = (await page.locator('#profileTabs > ul > li').allInnerTexts()).map((t) => flat(t));
                await page.locator('#profileTabs > ul > li > a[name="contact"]').click();
                await page.locator('form#contactForm').waitFor({state: 'visible', timeout: T});
                await idle(page);
                f.french.contactFr = await boxes('form#contactForm');
            } finally {
                await close();
            }
        });

        // --- Rule 7's last sentence: "Make a New Submission" opened and left, then the next sign-in
        await step('reg.submission', () => submissionWalk(f, base));

        // --- A5: the Register page's "Login" link, then a sign-in; the control from the plain Login page
        await step('reg.loginLink', async () => {
            f.loginLink = {};
            for (const name of ['author.alex', 'reader.rosa']) {
                const {page, close} = await launch(app);
                try {
                    await registerAt(page, `${ctx}/en/user/register`);
                    await page.locator('form#register a.login').click();
                    await page.waitForURL(/\/login/, {timeout: T});
                    await idle(page);
                    const source = await page.locator('form#login input[name="source"]').inputValue().catch(() => null);
                    const viaLink = await loginHere(page, name, pw(name));
                    await sleep(800);
                    viaLink.headings = await L.headings(page);
                    if (name === 'author.alex') await L.snap(page, 'reg-19-login-link-landing-author');
                    await signOut(page);
                    await page.goto(u(`${ctx}/en/login`));
                    await idle(page);
                    const plain = await loginHere(page, name, pw(name));
                    await sleep(800);
                    plain.headings = await L.headings(page);
                    f.loginLink[name] = {source, viaLink, plain};
                } finally {
                    await close();
                }
            }
        });
    });

    // ================================================================================================
    // submission: the reg phase's "Make a New Submission" walk alone (not in the default list)
    // ================================================================================================
    await phase('submission', async () => {
        const f = (facts.submission = {});
        await step('submission.walk', () => submissionWalk(f, tag('u02sw1'), 'submission'));
    });

    // ================================================================================================
    // kept: what a refused form keeps: the ticked boxes and the interests as well as the typed boxes
    // ================================================================================================
    await phase('kept', async () => {
        const f = (facts.kept = {});
        const who = person(tag('u02sw1'), 'w'); // never registered: the username is refused
        const {page, close} = await launch(app);
        try {
            await step('kept.refused', async () => {
                await registerAt(page, `${ctx}/en/user/register`);
                await L.fill(page, {...who, username: 'Not Valid'}, {consent: true, emailConsent: true, profile: {familyName: 'Kept', affiliation: 'Kept Institute', country: 'Iceland'}});
                const reviewer = page.locator('form#register #reviewerOptinGroup input[type="checkbox"]');
                if (await reviewer.count()) {
                    await reviewer.first().check();
                    await page.locator('form#register input#interests').fill('kept one, kept two');
                }
                f.typed = await L.valuesOf(page);
                const r = await L.press(page);
                await L.snap(page, 'kept-01-refused');
                f.lines = r.errors && r.errors.lines;
                f.after = await L.valuesOf(page);
                f.reviewerBox = (await reviewer.count()) ? await reviewer.first().isChecked() : null;
                f.interestsShown = ((await L.formFacts(page)).reviewerInterests || {}).visible;
            });
        } finally {
            await close();
        }
    });

    // ================================================================================================
    // sitereg: a site-level registration with "Reader" under the seeded context and the notification box
    // left unticked (Fields "Site-level page only", Rule 6's last sentence, A3; Rule 10's site-level links)
    // ================================================================================================
    await phase('sitereg', async () => {
        const f = (facts.sitereg = {});
        const who = person(tag('u02sw1'), 's');
        f.who = who.username;
        const {page, close} = await launch(app);
        try {
            await step('sitereg.register', async () => {
                await registerAt(page, 'index/en/user/register');
                const block = page.locator('form#register li.context').filter({has: page.locator('.name', {hasText: w.seeded})}).first();
                await block.getByRole('checkbox', {name: 'Reader', exact: true}).check();
                await sleep(300);
                await block.locator('.context_privacy input[type="checkbox"]').check();
                await L.fill(page, who, {emailConsent: false});
                const form = await L.formFacts(page, {names: [w.seeded]});
                f.typed = {values: await L.valuesOf(page), notificationBox: form.controls.find((c) => c.name === 'emailConsent') || null, block: form.contexts.named[0] || null};
                await L.snap(page, 'sitereg-01-form-filled');
                f.press = await L.press(page);
                await L.snap(page, 'sitereg-02-complete');
                f.complete = await L.completeFacts(page);
                await page.locator('ul.registration_complete_actions').getByRole('link', {name: 'Edit My Profile', exact: true}).click();
                await page.waitForURL(/user\/profile/, {timeout: T});
                await idle(page);
                await sleep(800);
                f.editProfile = {url: rel(page.url()), headings: await L.headings(page), active: flat(await page.locator('#profileTabs > ul > li.ui-tabs-active').innerText().catch(() => null))};
                await L.profileTab(page, app, ctx, 'Roles', 'form#rolesForm');
                await L.snap(page, 'sitereg-03-roles');
                const roles = await L.rolesFacts(page);
                f.roles = {first: roles.first, ticked: roles.ticked, checkedCount: roles.checkedCount};
                await L.profileTab(page, app, ctx, 'Notifications', 'form#notificationSettingsForm');
                await L.snap(page, 'sitereg-04-notifications');
                const n = await L.notificationFacts(page);
                f.notifications = {emailTicked: n.emailTicked, allowUnticked: n.allowUnticked, boxes: n.boxes.length};
                await sleep(2000);
                f.mail = await app.mail.count({to: who.email});
            });
        } finally {
            await close();
        }
    });

    // ================================================================================================
    // orcid: a scratch context with ORCID enabled: the block above the form (Fields; the block is U04's)
    // ================================================================================================
    await phase('orcid', async () => {
        const f = (facts.orcid = {});
        const t = tag('u02sw1');
        await app.api.createContext({tag: `${t}o`, context: {name: {en: `SW1 orcid ${t}`}}, orcid: {enabled: true}});
        const v = await launch(app);
        try {
            await step('orcid.register', async () => {
                await registerAt(v.page, `${t}o/en/user/register`);
                const s = await L.snap(v.page, 'orcid-01-register');
                await shot(v.page, 'orcid-01-register');
                f.register = await v.page.evaluate(() => {
                    const flat = (x) => (x || '').replace(/\s+/g, ' ').trim();
                    const form = document.querySelector('form#register');
                    const button = document.querySelector('#connect-orcid-button');
                    const hit = [...document.querySelectorAll('.pkp_structure_main *')].find((e) => e.children.length === 0 && /Create or Connect your ORCID iD/.test(e.textContent));
                    const before = (a, b) => !!(a && b && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
                    return {
                        text: !!hit,
                        button: button ? flat(button.innerText) : null,
                        buttonInsideForm: !!(button && form && form.contains(button)),
                        buttonBeforeGivenName: before(button, form && form.querySelector('[name="givenName"]')),
                        buttonBeforeForm: before(button, form),
                        buttonTop: button ? Math.round(button.getBoundingClientRect().top) : null,
                        givenNameTop: form ? Math.round(form.querySelector('[name="givenName"]').getBoundingClientRect().top) : null,
                        links: [...document.querySelectorAll('.pkp_structure_main a')].filter((a) => /orcid/i.test(`${a.innerText} ${a.getAttribute('href')}`)).map((a) => ({text: flat(a.innerText), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')})),
                    };
                });
                f.register.top = flat((s.text.main || '').split('Required fields are marked')[1], 100000).slice(0, 260);
                await registerAt(v.page, 'index/en/user/register');
                f.site = {button: await v.page.locator('#connect-orcid-button').count(), text: await v.page.getByText('Create or Connect your ORCID iD').count()};
                await registerAt(v.page, `${ctx}/en/user/register`);
                f.seeded = {button: await v.page.locator('#connect-orcid-button').count(), text: await v.page.getByText('Create or Connect your ORCID iD').count()};
            });
        } finally {
            await v.close();
        }
    });

    // ================================================================================================
    // roles: every roster level, signed in, at both Register addresses (Rules 4, 10); who opens Users & Roles
    // ================================================================================================
    await phase('roles', async () => {
        const f = (facts.roles = {users: {}});
        const {page, close} = await launch(app);
        try {
            for (const name of L.ROSTER[app.name]) {
                await step(`roles.${name}`, async () => {
                    await signIn(page, name, {contextPath: ctx});
                    await registerAt(page, `${ctx}/user/register`);
                    const s = await L.snap(page, `roles-01-${name.replace('.', '-')}`);
                    const r = (f.users[name] = {context: await L.completeFacts(page)});
                    r.text = flat(s.text.main, 6000).replace(/^.*?(Home \/)/, '$1').slice(0, 260);
                    if (r.context.links.some((l) => l.text === 'View Submissions')) {
                        await page.locator('ul.registration_complete_actions').getByRole('link', {name: 'View Submissions', exact: true}).click();
                        await page.waitForURL((url) => !/user\/register/.test(url.pathname), {timeout: T});
                        await idle(page);
                        await page.locator('h1, h2').first().waitFor({timeout: T}).catch(() => {});
                        await sleep(1200);
                        await idle(page);
                        r.viewSubmissions = {url: rel(page.url()), headings: await L.headings(page)};
                    }
                    await registerAt(page, 'index/user/register');
                    r.site = await L.completeFacts(page);
                    if (name === 'sectioneditor.ana' || name === 'admin') await L.snap(page, `roles-02-site-level-${name.replace('.', '-')}`);
                });
            }

            // --- the site-level completion page's two links, pressed (reader.rosa is the last one signed in)
            await step('roles.siteLinks', async () => {
                await registerAt(page, 'index/user/register');
                await page.locator('ul.registration_complete_actions').getByRole('link', {name: 'Edit My Profile', exact: true}).click();
                await page.waitForURL(/user\/profile/, {timeout: T});
                await idle(page);
                await sleep(800);
                const s = await L.snap(page, 'roles-03-site-edit-my-profile');
                f.siteEditProfile = {url: rel(s.url), headings: await L.headings(page), active: flat(await page.locator('#profileTabs > ul > li.ui-tabs-active').innerText().catch(() => null))};
                await L.profileTab(page, app, null, 'Roles', 'form#rolesForm');
                await L.snap(page, 'roles-04-roles-tab-reader');
                f.rolesTab = await L.rolesFacts(page);
                f.rolesTab.foldText = flat(await page.locator('form#rolesForm').innerText(), 100000).match(/Register with other [a-z ]+/i);
                const res = await page.goto(u('index/en/user/profile/roles'));
                await idle(page);
                await sleep(800);
                f.siteRolesAddress = {status: res && res.status(), url: rel(page.url()), active: flat(await page.locator('#profileTabs > ul > li.ui-tabs-active').innerText().catch(() => null))};
                await L.profileTab(page, app, ctx, 'Notifications', 'form#notificationSettingsForm');
                await L.snap(page, 'roles-05-notifications-tab-reader');
                f.notificationsTab = {text: (await L.notificationFacts(page)).text.slice(0, 700)};
                await registerAt(page, 'index/user/register');
                await page.locator('ul.registration_complete_actions').getByRole('link', {name: 'Continue Browsing', exact: true}).click();
                await page.waitForLoadState('load');
                await idle(page);
                f.siteContinue = {url: rel(page.url()), title: await page.title()};
            });

            // --- Users & Roles: who opens it (Actors row 8)
            await step('roles.access', async () => {
                f.access = {};
                for (const name of ['manager.maya', 'editor.diana', 'sectioneditor.ana', 'assistant.rita', 'author.alex'].filter((n) => L.ROSTER[app.name].includes(n))) {
                    await signIn(page, name, {contextPath: ctx});
                    const res = await page.goto(u(`${ctx}/management/settings/access`));
                    await idle(page);
                    await sleep(500);
                    const s = await L.snap(page, `roles-06-users-and-roles-${name.replace('.', '-')}`);
                    f.access[name] = {
                        status: res && res.status(),
                        url: rel(page.url()),
                        h1: flat(await page.locator('h1').first().innerText().catch(() => null)),
                        tabs: (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((t) => flat(t)),
                        denied: await page.getByText('The current role does not have access to this operation.').count(),
                        text: flat((s.text.main || '').slice(0, 300)),
                    };
                    if (name === 'manager.maya') {
                        await page.getByRole('tab', {name: 'Roles', exact: true}).click();
                        await page.locator('#roleGridContainer tbody tr.gridRow').first().waitFor({timeout: T});
                        await idle(page);
                        await L.snap(page, 'roles-07-roles-grid');
                        f.rolesGrid = await page.locator('#roleGridContainer tbody tr.gridRow').evaluateAll((rows) => rows.map((r) => [...r.querySelectorAll('td')].slice(0, 2).map((td) => (td.innerText || '').replace(/\s+/g, ' ').trim()).join(' | ')));
                    }
                }
            });

            // --- the administrator's screens the spec points at (read only)
            await step('roles.admin', async () => {
                await signIn(page, 'admin');
                await page.goto(u('index/en/admin'));
                await idle(page);
                const s = await L.snap(page, 'roles-08-administration');
                f.admin = {url: rel(s.url), links: (await page.locator('main a, .pkp_structure_main a').evaluateAll((as) => as.map((a) => (a.innerText || '').replace(/\s+/g, ' ').trim()))).filter(Boolean), text: flat(s.text.main, 1200)};
                const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
                const site = new SiteSettingsPage(page);
                await site.goto();
                const sec = await site.security();
                const s2 = await L.snap(page, 'roles-09-site-settings-security');
                f.security = {minPasswordLength: await sec.minPasswordLength.inputValue(), compromisedCheck: await sec.compromisedCheck.isChecked(), text: flat(await sec.form.innerText(), 900), tabs: (await page.getByRole('tab').allInnerTexts()).map((t) => flat(t)), url: rel(s2.url)};
                const info = await site.information();
                await L.snap(page, 'roles-10-site-settings-information');
                f.siteInformation = {privacyStatement: await info.richContent(info.privacyId('en')), text: flat(await info.form.innerText(), 600)};
                await signOut(page);
            });
        } finally {
            await close();
        }
    });

    // ================================================================================================
    // scratch: the privacy statement emptied; registration closed; disabled; restricted; the role flags
    // ================================================================================================
    await phase('scratch', async () => {
        const f = (facts.scratch = {});
        const t = tag('u02sw1');
        const mgr = `${t}m`;
        const dis = `${t}x`;
        const names = {p: `SW1 privacy ${t}`, c: `SW1 closed ${t}`, d: `SW1 disabled ${t}`, r: `SW1 restricted ${t}`, s: `SW1 flags ${t}`};
        const path = (k) => `${t}${k}`;
        f.tag = t;
        f.names = names;
        const mk = (k, {context = {}, users = [], top = {}} = {}) => app.api.createContext({tag: path(k), context: {name: {en: names[k]}, ...context}, users: [{username: mgr, roles: ['manager']}, ...users], ...top});
        // other levels the roster lacks: a second manager-level role and (a journal) the Subscription Manager
        const extra = {ojs: {pe: 'productionEditor', sm: 'subscriptionManager', ge: 'guestEditor'}, omp: {pe: 'productionEditor'}, ops: {}}[app.name];
        await mk('p', {users: [{username: dis, roles: ['reader']}, ...Object.entries(extra).map(([k, role]) => ({username: `${t}${k}`, roles: [role]}))]});
        await mk('c');
        await mk('d', {context: {enabled: false}});
        await mk('r', {top: {restrictSiteAccess: true}});
        await mk('s');
        const all = Object.values(names);
        const block = async (page, k) => ((await L.formFacts(page, {names: [names[k]]})).contexts.named[0] || null);

        // --- scenario 4: the consent box, its refusal, the statement emptied (Rule 5)
        await step('scratch.privacy', async () => {
            const first = person(t, 'h');
            const second = person(t, 'i');
            const v = await launch(app);
            try {
                await registerAt(v.page, `${path('p')}/en/user/register`);
                await L.snap(v.page, 'scratch-01-privacy-register');
                const form = await L.formFacts(v.page);
                f.privacy = {consentBox: form.controls.find((c) => c.name === 'privacyConsent') || null, links: form.links};
                const link = v.page.locator('form#register').getByRole('link', {name: 'privacy statement'});
                const [tabPage] = await Promise.all([v.context.waitForEvent('page', {timeout: T}), link.click()]);
                await tabPage.waitForLoadState('load');
                f.privacy.tab = {url: rel(tabPage.url()), title: await tabPage.title(), h1: flat(await tabPage.locator('h1').first().innerText().catch(() => null)), text: flat(await tabPage.locator('.pkp_structure_main').first().innerText().catch(() => null), 400)};
                await tabPage.close();
                await L.fill(v.page, first, {consent: false});
                f.privacy.unticked = await L.press(v.page);
                f.privacy.untickedValues = await L.valuesOf(v.page);
                await L.snap(v.page, 'scratch-02-privacy-unticked');
                await v.page.locator('form#register input[name="privacyConsent"]').check();
                await L.passwords(v.page, first);
                f.privacy.ticked = await L.press(v.page);
                f.privacy.tickedComplete = await L.completeFacts(v.page);
            } finally {
                await v.close();
            }
            const m = await launch(app);
            try {
                await signIn(m.page, mgr, {contextPath: path('p')});
                const {SettingsPages} = require('../../../pages/ContextIdentityPages.js');
                const settings = new SettingsPages(m.page, path('p'), {locale: 'en'});
                const form = await settings.openWebsiteSetupTab('privacy');
                const s = await L.snap(m.page, 'scratch-03-privacy-setting');
                f.privacy.setting = {url: rel(s.url), before: flat(await form.richContent('privacy-privacyStatement-control-en'), 200), formText: flat(await form.form.innerText(), 500), tabs: (await m.page.getByRole('tab').allInnerTexts()).map((x) => flat(x))};
                await form.typeRich('privacy-privacyStatement-control-en', '');
                const r = await form.pressSave();
                await form.savedStatus.waitFor({timeout: T}).catch(() => {});
                f.privacy.save = {status: r.status(), saved: await form.savedStatus.isVisible().catch(() => false), echo: await r.json().then((j) => j.privacyStatement).catch(() => undefined)};
                const after = await L.snap(m.page, 'scratch-04-privacy-setting-saved');
                f.privacy.save.notices = after.notices;
                await m.page.reload();
                const again = await settings.openWebsiteSetupTab('privacy');
                f.privacy.save.afterReload = flat(await again.richContent('privacy-privacyStatement-control-en'), 200);
            } finally {
                await m.close();
            }
            const v2 = await launch(app);
            try {
                await registerAt(v2.page, `${path('p')}/en/user/register`);
                await L.snap(v2.page, 'scratch-05-privacy-register-no-statement');
                const form = await L.formFacts(v2.page);
                f.privacy.emptied = {consentBox: form.controls.find((c) => c.name === 'privacyConsent') || null, notificationBox: !!form.controls.find((c) => c.name === 'emailConsent'), legends: form.legends, links: form.links};
                const res = await v2.page.goto(u(`${path('p')}/en/about/privacy`));
                f.privacy.emptied.aboutPrivacy = {status: res && res.status(), h1: flat(await v2.page.locator('h1').first().innerText().catch(() => null)), text: flat(await v2.page.locator('body').innerText(), 200)};
                await registerAt(v2.page, `${path('p')}/en/user/register`);
                await L.fill(v2.page, second, {});
                f.privacy.emptied.press = await L.press(v2.page);
                f.privacy.emptied.complete = await L.completeFacts(v2.page);
            } finally {
                await v2.close();
            }
        });

        // --- Rule 10 and Actors row 8 at the levels the roster lacks
        await step('scratch.levels', async () => {
            f.levels = {};
            const m = await launch(app);
            try {
                for (const [k, role] of Object.entries(extra)) {
                    const name = `${t}${k}`;
                    await signIn(m.page, name, {contextPath: path('p')});
                    await registerAt(m.page, `${path('p')}/user/register`);
                    const r = (f.levels[role] = {complete: (await L.completeFacts(m.page)).links.map((l) => l.text)});
                    const res = await m.page.goto(u(`${path('p')}/management/settings/access`));
                    await idle(m.page);
                    await sleep(500);
                    const s = await L.snap(m.page, `scratch-05b-users-and-roles-${role}`);
                    r.access = {status: res && res.status(), url: rel(s.url), h1: flat(await m.page.locator('h1').first().innerText().catch(() => null)), tabs: (await m.page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x)), denied: await m.page.getByText('The current role does not have access to this operation.').count()};
                }
            } finally {
                await m.close();
            }
        });

        // --- Rule 15: a disabled account still claims its username and email
        await step('scratch.disabled-account', async () => {
            const m = await launch(app);
            try {
                await signIn(m.page, mgr, {contextPath: path('p')});
                const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
                const list = new UsersListPage(m.page, path('p'));
                await list.goto();
                const row = list.row(`${dis}@mail.test`);
                f.disabledAccount = {row: flat(await row.first().innerText().catch(() => null), 200)};
                await list.chooseAction(row.first(), 'Disable User');
                const dialog = m.page.getByRole('dialog', {name: /^Disable /});
                await dialog.locator('textarea[name="disableReason"]').waitFor({timeout: T});
                f.disabledAccount.window = flat(await dialog.innerText(), 300);
                await dialog.locator('textarea[name="disableReason"]').fill('SW1 sweep');
                await dialog.getByRole('button', {name: 'OK', exact: true}).click();
                await dialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await idle(m.page);
                await sleep(1000);
                const s = await L.snap(m.page, 'scratch-06-user-disabled');
                f.disabledAccount.notices = s.notices;
                f.disabledAccount.rowAfter = flat(await list.row(`${dis}@mail.test`).first().innerText().catch(() => null), 200);
            } finally {
                await m.close();
            }
            const v = await launch(app);
            try {
                const fresh = person(t, 'j');
                f.disabledAccount.tries = {};
                for (const [name, who] of Object.entries({
                    sameName: {...fresh, username: dis},
                    capitalName: {...fresh, username: dis.toUpperCase()},
                    sameEmail: {...fresh, email: `${dis}@mail.test`},
                    capitalEmail: {...fresh, email: `${dis}@MAIL.TEST`.toUpperCase()},
                })) {
                    await registerAt(v.page, `${ctx}/en/user/register`);
                    await L.fill(v.page, who, {consent: true});
                    const r = await L.press(v.page);
                    f.disabledAccount.tries[name] = {typed: [who.username, who.email], h1: r.h1, lines: r.errors && r.errors.lines};
                }
                await v.page.goto(u(`${path('p')}/en/login`));
                await idle(v.page);
                f.disabledAccount.signIn = await loginHere(v.page, dis, pw(dis));
                f.disabledAccount.signIn.text = flat(await v.page.locator('.pkp_structure_main').first().innerText().catch(() => null), 300);
            } finally {
                await v.close();
            }
        });

        // --- scenario 5: registration closed on Site Access Options (Rules 2, 4; Settings "User Registration")
        await step('scratch.closed', async () => {
            const m = await launch(app);
            const v = await launch(app);
            try {
                await signIn(m.page, mgr, {contextPath: path('c')});
                const {SiteAccessTab} = require('../../../pages/RolesConfigurationPages.js');
                const access = new SiteAccessTab(m.page, path('c'));
                await access.goto();
                await idle(m.page);
                const s = await L.snap(m.page, 'scratch-07-site-access-options');
                await shot(m.page, 'scratch-07-site-access-options');
                const controls = () => access.panel.locator('input[type="radio"], input[type="checkbox"]').evaluateAll((els) => els.map((e) => ({type: e.type, name: e.name, value: e.value, checked: e.checked, label: ((e.closest('label') || {}).innerText || '').replace(/\s+/g, ' ').trim()})));
                f.closed = {setting: {url: rel(s.url), h1: flat(await m.page.locator('h1').first().innerText().catch(() => null)), tabs: (await m.page.getByRole('tab').allInnerTexts()).map((x) => flat(x)), panel: flat(await access.panel.innerText(), 900), controls: await controls()}};
                await loc(m.page, 'Site Access Options: the registration radios', access.panel.locator('input[type="radio"]'));
                // before: the open state as a visitor sees it
                await v.page.goto(u(path('c')));
                await idle(v.page);
                f.closed.openHeader = (await L.header(v.page)).map((l) => l.text);
                // close it
                await access.panel.getByRole('radio', {name: /will register all user accounts/}).check();
                const r = await access.save();
                f.closed.save = {status: r.status(), method: r.request().method()};
                const after = await L.snap(m.page, 'scratch-08-site-access-saved');
                f.closed.save.notices = after.notices;
                await access.reload();
                await idle(m.page);
                f.closed.save.afterReload = (await controls()).filter((c) => c.checked).map((c) => c.label);
                // the manager, still signed in, at the closed and the disabled context's Register address (Rule 4)
                await registerAt(m.page, `${path('c')}/user/register`);
                await L.snap(m.page, 'scratch-09-closed-manager-at-register');
                f.closed.manager = {...(await L.completeFacts(m.page)), closedMessage: await m.page.getByText(/currently not accepting user registrations/).count()};
                await registerAt(m.page, `${path('d')}/user/register`);
                await L.snap(m.page, 'scratch-10-disabled-manager-at-register');
                f.closed.managerAtDisabled = {...(await L.completeFacts(m.page)), loginForm: await m.page.locator('form#login').count()};
                // a signed-in user with no role in either context
                await signIn(m.page, 'reader.rosa', {contextPath: ctx});
                await registerAt(m.page, `${path('c')}/user/register`);
                f.closed.reader = {...(await L.completeFacts(m.page)), closedMessage: await m.page.getByText(/currently not accepting user registrations/).count()};
                await registerAt(m.page, `${path('d')}/user/register`);
                f.closed.readerAtDisabled = {...(await L.completeFacts(m.page)), loginForm: await m.page.locator('form#login').count()};
                await signOut(m.page);

                // the visitor, signed out
                await v.page.goto(u(path('c')));
                const home = await L.snap(v.page, 'scratch-11-closed-home');
                f.closed.home = {url: rel(home.url), header: (await L.header(v.page)).map((l) => l.text)};
                await v.page.goto(u(`${path('c')}/en/login`));
                const lg = await L.snap(v.page, 'scratch-12-closed-login');
                f.closed.login = {url: rel(lg.url), header: (await L.header(v.page)).map((l) => l.text), links: (await L.mainLinks(v.page)).map((l) => l.text).filter(Boolean), form: await v.page.locator('form#login').count()};
                await v.page.goto(u(`${path('c')}/en/login/lostPassword`));
                const lp = await L.snap(v.page, 'scratch-13-closed-lost-password');
                f.closed.lost = {url: rel(lp.url), h1: flat(await v.page.locator('h1').first().innerText().catch(() => null)), header: (await L.header(v.page)).map((l) => l.text), links: (await L.mainLinks(v.page)).map((l) => l.text).filter(Boolean)};
                f.closed.typed = {};
                for (const p of [`${path('c')}/user/register`, `${path('c')}/en/user/register`]) {
                    const res = await v.page.goto(u(p));
                    await idle(v.page);
                    f.closed.typed[p] = {status: res && res.status(), url: rel(v.page.url()), title: await v.page.title(), h1: flat(await v.page.locator('h1').first().innerText().catch(() => null)), form: await v.page.locator('form#register').count(), links: (await L.mainLinks(v.page)).map((l) => ({text: l.text, href: rel(l.href)})).filter((l) => l.text), text: flat(await v.page.locator('.pkp_structure_main').first().innerText().catch(() => null), 300), header: (await L.header(v.page)).map((l) => l.text)};
                }
                await L.snap(v.page, 'scratch-14-closed-register');
                await shot(v.page, 'scratch-14-closed-register');
                await v.page.locator('.pkp_structure_main').getByRole('link', {name: 'Login', exact: true}).first().click();
                await v.page.waitForLoadState('load');
                f.closed.typedLoginLink = rel(v.page.url());
                await v.page.goto(u(`${path('c')}/en/about/submissions`));
                await idle(v.page);
                await L.snap(v.page, 'scratch-15-closed-about-submissions');
                f.closed.about = {links: (await L.mainLinks(v.page)).filter((l) => /register|login/i.test(`${l.text} ${l.href}`)).map((l) => ({text: l.text, href: rel(l.href)})), text: flat(await v.page.locator('.pkp_structure_main').first().innerText().catch(() => null), 500)};
                // the site homepage's "Register" still opens the site-level page
                await v.page.goto(u('index'));
                await idle(v.page);
                f.closed.siteHeader = (await L.header(v.page)).map((l) => l.text);
                await v.page.locator('#navigationUser').getByRole('link', {name: 'Register', exact: true}).click();
                await v.page.waitForURL(/user\/register/, {timeout: T});
                await idle(v.page);
                const site = await L.formFacts(v.page, {names: all});
                f.closed.site = {url: rel(v.page.url()), form: await v.page.locator('form#register').count(), legend: site.legends.map((l) => l.text), blocks: site.contexts.named, tally: site.contexts.tally, count: site.contexts.count};
                record('scratch-16-site-register-blocks', f.closed.site);
                await shot(v.page, 'scratch-16-site-register');
            } finally {
                await m.close();
                await v.close();
            }
        });

        // --- a disabled context (Rule 2's last sentences)
        await step('scratch.disabled', async () => {
            const v = await launch(app);
            try {
                f.disabled = {};
                for (const p of [`${path('d')}/user/register`, `${path('d')}/en/user/register`, path('d'), `${path('d')}/en/login`, `${path('d')}/en/about`]) {
                    const res = await v.page.goto(u(p));
                    await idle(v.page);
                    f.disabled[p] = {status: res && res.status(), url: rel(v.page.url()), title: await v.page.title(), h1: flat(await v.page.locator('h1').first().innerText().catch(() => null)), loginForm: await v.page.locator('form#login').count(), registerForm: await v.page.locator('form#register').count()};
                }
                await v.page.goto(u(`${path('d')}/user/register`));
                const s = await L.snap(v.page, 'scratch-17-disabled-register-address');
                f.disabled.page = {header: await L.header(v.page), inForm: (await L.mainLinks(v.page)).filter((l) => l.text).map((l) => ({text: l.text, href: rel(l.href)})), text: flat(await v.page.locator('.pkp_structure_main').first().innerText().catch(() => null), 400), saysDisabled: /disabled|not available|unavailable/i.test(await v.page.locator('.pkp_structure_main').first().innerText().catch(() => ''))};
                await v.page.locator('#navigationUser').getByRole('link', {name: 'Register', exact: true}).click();
                await v.page.waitForLoadState('load');
                await idle(v.page);
                f.disabled.headerRegister = {url: rel(v.page.url()), h1: flat(await v.page.locator('h1').first().innerText().catch(() => null)), loginForm: await v.page.locator('form#login').count(), registerForm: await v.page.locator('form#register').count()};
                await v.page.locator('form#login').getByRole('link', {name: 'Register', exact: true}).click();
                await v.page.waitForLoadState('load');
                await idle(v.page);
                await L.snap(v.page, 'scratch-18-disabled-after-register-links');
                f.disabled.formRegister = {url: rel(v.page.url()), h1: flat(await v.page.locator('h1').first().innerText().catch(() => null)), loginForm: await v.page.locator('form#login').count(), registerForm: await v.page.locator('form#register').count(), saysDisabled: /disabled|not available|unavailable/i.test(await v.page.locator('.pkp_structure_main').first().innerText().catch(() => ''))};
            } finally {
                await v.close();
            }
        });

        // --- Rule 3: a context that requires sign-in to view its pages still registers
        await step('scratch.restricted', async () => {
            const v = await launch(app);
            const m = await launch(app);
            try {
                f.restricted = {};
                for (const p of [path('r'), `${path('r')}/en/about`, `${path('r')}/en/about/submissions`, `${path('r')}/en/login/lostPassword`]) {
                    const res = await v.page.goto(u(p));
                    await idle(v.page);
                    f.restricted[p] = {status: res && res.status(), url: rel(v.page.url()), h1: flat(await v.page.locator('h1').first().innerText().catch(() => null)), loginForm: await v.page.locator('form#login').count(), header: (await L.header(v.page)).map((l) => l.text)};
                }
                await v.page.goto(u(path('r')));
                await L.snap(v.page, 'scratch-19-restricted-home');
                const res = await v.page.goto(u(`${path('r')}/user/register`));
                const s = await L.snap(v.page, 'scratch-20-restricted-register');
                const form = await L.formFacts(v.page);
                f.restricted.register = {status: res && res.status(), url: rel(s.url), h1: flat(await v.page.locator('h1').first().innerText().catch(() => null)), header: (await L.header(v.page)).map((l) => l.text), controls: form ? form.controls.map((c) => c.name) : null, reviewerInterests: form && form.reviewerInterests};
                const who = person(t, 'k');
                await L.fill(v.page, who, {consent: true});
                f.restricted.press = await L.press(v.page);
                f.restricted.complete = await L.completeFacts(v.page);
                // the setting as the manager's screen shows it
                await signIn(m.page, mgr, {contextPath: path('r')});
                const {SiteAccessTab} = require('../../../pages/RolesConfigurationPages.js');
                const access = new SiteAccessTab(m.page, path('r'));
                await access.goto();
                await idle(m.page);
                await L.snap(m.page, 'scratch-21-restricted-site-access-options');
                f.restricted.setting = await access.panel.locator('input[type="radio"], input[type="checkbox"]').evaluateAll((els) => els.map((e) => ({type: e.type, checked: e.checked, label: ((e.closest('label') || {}).innerText || '').replace(/\s+/g, ' ').trim()})));
            } finally {
                await v.close();
                await m.close();
            }
        });

        // --- "Allow user self-registration" (Rule 7, Settings, A7; the several-roles block of Fields)
        await step('scratch.flags', async () => {
            const m = await launch(app);
            const v = await launch(app);
            try {
                f.flags = {};
                const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
                const roles = new RolesTab(m.page, path('s'), {stages: []});
                await signIn(m.page, mgr, {contextPath: path('s')});
                const setFlag = async (role, on, label) => {
                    await roles.goto();
                    const win = await roles.openEdit(role);
                    const box = win.optionBox('Allow user self-registration');
                    const out = {role, before: await box.isChecked()};
                    if (!f.flags.window) {
                        f.flags.window = {title: flat(await win.title.innerText().catch(() => null)), text: flat(await win.form.innerText(), 900)};
                        await L.snap(m.page, 'scratch-22-role-edit-window');
                    }
                    await box.setChecked(on);
                    const r = await win.save();
                    out.save = r.status();
                    f.flags[label] = out;
                };
                const visitorPage = async (label, snapName) => {
                    await registerAt(v.page, `${path('s')}/en/user/register`);
                    const s = await L.snap(v.page, snapName);
                    const form = await L.formFacts(v.page);
                    const out = {
                        h1: flat(await v.page.locator('h1').first().innerText().catch(() => null)),
                        form: !!form,
                        checkboxes: form ? form.controls.filter((c) => c.type === 'checkbox').map((c) => ({name: c.name, label: c.label, visible: c.visible})) : null,
                        reviewerGroup: flat(await v.page.locator('form#register #reviewerOptinGroup').innerText().catch(() => null)),
                        reviewerFieldset: form ? form.fieldsets.filter((x) => x.cls === 'reviewer') : null,
                        legends: form ? form.legends : null,
                        reviewerInterests: form ? form.reviewerInterests : null,
                        interestsInput: await v.page.locator('form#register input#interests').count(),
                        text: flat((s.text.main || '').split('Repeat password')[1], 600),
                    };
                    await v.page.goto(u('index/en/user/register'));
                    await idle(v.page);
                    out.siteBlock = await block(v.page, 's');
                    f.flags[label] = out;
                };
                f.flags.rolesGrid = await (async () => {
                    await roles.goto();
                    return m.page.locator('#roleGridContainer tbody tr.gridRow').evaluateAll((rows) => rows.map((r) => [...r.querySelectorAll('td')].slice(0, 2).map((td) => (td.innerText || '').replace(/\s+/g, ' ').trim()).join(' | ')));
                })();
                await visitorPage('page0', 'scratch-23-flags-default');
                // 1. the reviewer role(s) closed to self-registration
                if (w.reviewer) {
                    await setFlag(w.reviewer, false, 'reviewerOff');
                    await visitorPage('page1', 'scratch-24-flags-reviewer-off');
                }
                // 2. Reader closed as well (A7)
                await setFlag('Reader', false, 'readerOff');
                await visitorPage('page2', 'scratch-25-flags-reader-off');
                const who = person(t, 'q');
                await registerAt(v.page, `${path('s')}/en/user/register`);
                await L.fill(v.page, who, {consent: true});
                f.flags.a7 = {who: who.username, press: await L.press(v.page), complete: await L.completeFacts(v.page)};
                await L.profileTab(v.page, app, path('s'), 'Roles', 'form#rolesForm');
                await L.snap(v.page, 'scratch-26-flags-a7-roles-tab');
                f.flags.a7.roles = await L.rolesFacts(v.page);
                await signOut(v.page);
                const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
                const list = new UsersListPage(m.page, path('s'));
                await list.goto();
                await idle(m.page);
                await L.snap(m.page, 'scratch-27-flags-a7-users-tab');
                f.flags.a7.usersRow = flat(await list.row(who.email).first().innerText().catch(() => null), 300);
                f.flags.a7.usersColumns = (await list.table.locator('thead th').allInnerTexts().catch(() => [])).map((x) => flat(x));
                // 3. several self-registering reviewer roles (a journal: a created one; a press: Internal Reviewer)
                if (w.reviewer) {
                    await setFlag(w.reviewer, true, 'reviewerOn');
                    let second = w.second;
                    if (second) {
                        await setFlag(second, true, 'secondOn');
                    } else {
                        second = 'SW1 Referee';
                        await roles.goto();
                        const win = await roles.openCreate();
                        await win.chooseLevel('Reviewer');
                        await win.nameBox().fill(second);
                        await win.abbrevBox().fill('SWR');
                        await win.optionBox('Allow user self-registration').check();
                        f.flags.createWindow = flat(await win.form.innerText(), 900);
                        const r = await win.save();
                        f.flags.secondOn = {role: second, created: true, save: r.status()};
                    }
                    await visitorPage('page3', 'scratch-28-flags-two-reviewer-roles');
                    await shot(v.page, 'scratch-28-flags-site-level');
                    await registerAt(v.page, `${path('s')}/en/user/register`);
                    await shot(v.page, 'scratch-28-flags-two-reviewer-roles');
                    const boxes = v.page.locator('form#register #reviewerOptinGroup input[type="checkbox"]');
                    const before = (await L.formFacts(v.page)).reviewerInterests;
                    const who2 = person(t, 'v');
                    await L.fill(v.page, who2, {consent: true});
                    const secondBox = v.page.locator('form#register #reviewerOptinGroup label').filter({hasText: second}).locator('input[type="checkbox"]');
                    f.flags.several = {who: who2.username, boxes: await boxes.count(), second, secondBox: await secondBox.count(), interestsBefore: before};
                    await secondBox.first().check();
                    await sleep(300);
                    f.flags.several.interestsTicked = (await L.formFacts(v.page)).reviewerInterests;
                    await v.page.locator('form#register input#interests').fill(`sweep${t}`);
                    f.flags.several.press = await L.press(v.page);
                    f.flags.several.complete = await L.completeFacts(v.page);
                    await L.profileTab(v.page, app, path('s'), 'Roles', 'form#rolesForm');
                    await L.snap(v.page, 'scratch-29-flags-second-reviewer-roles-tab');
                    f.flags.several.roles = await L.rolesFacts(v.page);
                    await signOut(v.page);
                }
            } finally {
                await m.close();
                await v.close();
            }
        });
    });

    // ================================================================================================
    // variant: the validation-variant server (+90): ALTCHA, an unvalidated account's claim, the link
    // ================================================================================================
    await phase('variant', async () => {
        const f = (facts.variant = {});
        const origin = app.variant('validation');
        const base = tag('u02sw1');
        const who = person(base, 'z');
        f.who = who.username;
        f.origin = origin;
        const since = new Date();
        const {page, browser, close} = await launch(app);
        const states = [];
        try {
            // --- at rest: nothing captcha-like on screen
            await step('variant.rest', async () => {
                f.rest = {};
                for (const [k, p] of [['context', `${ctx}/en/user/register`], ['site', 'index/en/user/register']]) {
                    await page.goto(`${origin}/index.php/${p}`);
                    await idle(page);
                    const s = k === 'context' ? await L.snap(page, 'variant-01-register-at-rest') : null;
                    const form = await L.formFacts(page);
                    f.rest[k] = {url: rel(page.url()), altcha: form.altcha, recaptcha: form.recaptcha, widgetInForm: await page.locator('form#register altcha-widget').count(), widgetAttrs: await page.locator('altcha-widget').first().evaluate((e) => [...e.attributes].map((a) => a.name)).catch(() => null), visibleText: /ALTCHA|Verif|robot/i.test(await page.locator('.pkp_structure_main').first().innerText())};
                    if (s) await shot(page, 'variant-01-register-at-rest');
                }
                f.rest.scripts = await page.locator('script[src*="altcha"]').evaluateAll((els) => els.map((e) => e.getAttribute('src').replace(/^https?:\/\/[^/]+/, '')));
            });

            // --- a browser without JavaScript: refused, nothing created; the same visitor cannot sign in either
            await step('variant.nojs', async () => {
                const nojs = await browser.newContext({baseURL: origin, javaScriptEnabled: false, viewport: {width: 1280, height: 900}});
                const p = await nojs.newPage();
                try {
                    await p.goto(`${origin}/index.php/index/en/user/register`);
                    await L.fill(p, who, {});
                    const answer = p.waitForResponse((r) => r.request().method() === 'POST' && /user\/register/.test(r.url()), {timeout: 60_000});
                    await p.locator('form#register button.submit').click();
                    const r = await answer;
                    await p.waitForLoadState('load');
                    f.nojs = {status: r.status(), postedAltcha: /(^|&)altcha=/.test(r.request().postData() || ''), url: rel(p.url()), h1: flat(await p.locator('h1').first().innerText().catch(() => null)), errors: await L.errorsOf(p), values: await L.valuesOf(p)};
                    record('variant-02-nojs-refused', {url: p.url(), title: await p.title(), text: flat(await p.locator('.pkp_structure_main').first().innerText(), 1500)});
                    // the Login form, same browser
                    await p.goto(`${origin}/index.php/${ctx}/en/login`);
                    await p.locator('input#username').fill('reader.rosa');
                    await p.locator('input#password').fill(pw('reader.rosa'));
                    await Promise.all([p.waitForLoadState('domcontentloaded'), p.locator('form#login button[type="submit"]').click()]);
                    await p.waitForLoadState('load');
                    f.nojs.login = {url: rel(p.url()), h1: flat(await p.locator('h1').first().innerText().catch(() => null)), text: flat(await p.locator('.pkp_structure_main').first().innerText(), 400), header: (await L.header(p)).map((l) => l.text)};
                    record('variant-03-nojs-login-refused', {url: p.url(), text: f.nojs.login.text});
                } finally {
                    await nojs.close();
                }
                // with JavaScript on, that username and password do not sign in: no account was created
                await page.goto(`${origin}/index.php/index/en/login`);
                await idle(page);
                f.nojs.signInAfter = await loginHere(page, who.username, who.password);
                f.nojs.signInAfter.text = flat(await page.locator('.pkp_structure_main').first().innerText().catch(() => null), 300);
            });

            // --- JavaScript on: the check runs on the press and the form goes through
            await step('variant.js', async () => {
                await page.goto(`${origin}/index.php/index/en/user/register`);
                await idle(page);
                await L.fill(page, who, {});
                await page.exposeFunction('__sw1Altcha', (s) => states.push(s)).catch(() => {});
                await page.waitForFunction(() => !!customElements.get('altcha-widget'), undefined, {timeout: T});
                await page.evaluate(() => {
                    const el = document.querySelector('altcha-widget');
                    const read = () => {
                        const inner = el.querySelector('.altcha');
                        const r = inner ? inner.getBoundingClientRect() : null;
                        window.__sw1Altcha({at: Date.now(), state: inner && inner.getAttribute('data-state'), display: inner && getComputedStyle(inner).display, text: (el.innerText || '').replace(/\s+/g, ' ').trim(), size: r && [Math.round(r.width), Math.round(r.height)]});
                    };
                    new MutationObserver(read).observe(el, {subtree: true, attributes: true, childList: true, characterData: true});
                    read();
                });
                const requests = [];
                const onRequest = (r) => {
                    if (!/127\.0\.0\.1/.test(r.url()) || /altcha/i.test(r.url())) requests.push(`${r.method()} ${r.url().slice(0, 120)}`);
                };
                page.on('request', onRequest);
                const answer = page.waitForResponse((r) => r.request().method() === 'POST' && /user\/register/.test(r.url()), {timeout: 60_000});
                await page.locator('form#register button.submit').click();
                const r = await answer;
                page.off('request', onRequest);
                await page.waitForLoadState('load');
                const s = await L.snap(page, 'variant-04-awaiting-verification');
                f.js = {status: r.status(), postedAltcha: /(^|&)altcha=/.test(r.request().postData() || ''), url: rel(s.url), title: s.title, h1: flat(await page.locator('h1').first().innerText().catch(() => null)), states: states.map((x) => `${x.state}|${x.display}|${x.text}|${x.size}`).filter((x, i, a) => a.indexOf(x) === i), requests, text: flat(await page.locator('.pkp_structure_main').first().innerText(), 600), links: (await L.mainLinks(page)).map((l) => l.text).filter(Boolean), header: (await L.header(page)).map((l) => l.text), errors: await L.errorsOf(page)};
            });

            // --- Rule 15: the not-yet-validated account claims its username and email (the default server's page)
            await step('variant.claim', async () => {
                f.claim = {};
                const fresh = person(base, 'y');
                for (const [name, w2] of Object.entries({
                    capitalName: {...fresh, username: who.username.toUpperCase()},
                    capitalEmail: {...fresh, email: who.email.toUpperCase()},
                    both: {...fresh, username: who.username, email: who.email},
                })) {
                    await page.goto(u(`${ctx}/en/user/register`));
                    await idle(page);
                    await L.fill(page, w2, {consent: true});
                    const r = await L.press(page);
                    f.claim[name] = {typed: [w2.username, w2.email], h1: r.h1, lines: r.errors && r.errors.lines};
                }
                // signing in before activating (the Login page's own words are Rule 11's)
                await page.goto(`${origin}/index.php/index/en/login`);
                await idle(page);
                f.claim.signInBefore = await loginHere(page, who.username, who.password);
                f.claim.signInBefore.text = flat(await page.locator('.pkp_structure_main').first().innerText().catch(() => null), 500);
                await L.snap(page, 'variant-05-sign-in-before-activating');
            });

            // --- Actors row 6: the emailed link activates the account
            await step('variant.activate', async () => {
                const m = await app.mail.find({to: who.email, subject: 'Validate Your Account', since});
                const full = await app.mail.fullMessage(m.ID);
                const body = full.Text || full.HTML || '';
                const link = (body.match(/https?:\/\/[^\s<>"']+\/invitation\/accept\?[^\s<>"']+/) || [null])[0];
                f.activate = {count: await app.mail.count({to: who.email}), from: m.From, subject: m.Subject, body: flat(body, 500), link: link && rel(link.replace(/&amp;/g, '&')).replace(/key=[^&]+/, 'key=…')};
                if (!link) return;
                await page.goto(link.replace(/&amp;/g, '&'));
                const s = await L.snap(page, 'variant-06-activation-page');
                f.activate.page = {url: rel(s.url).replace(/key=[^&]+/, 'key=…'), title: s.title, headings: await L.headings(page), text: flat(await page.locator('.pkp_structure_main').first().innerText().catch(() => null), 300), links: (await L.mainLinks(page)).map((l) => l.text).filter(Boolean)};
                await page.getByRole('link', {name: 'Activate Account', exact: true}).click();
                await page.waitForLoadState('load');
                const s2 = await L.snap(page, 'variant-07-activated');
                f.activate.done = {url: rel(s2.url).replace(/Key=[^&]+/, 'Key=…'), title: s2.title, text: flat(await page.locator('.pkp_structure_main').first().innerText().catch(() => null), 300), links: (await L.mainLinks(page)).map((l) => l.text).filter(Boolean)};
                // the emailed link once more, and with its key altered (the landing is User invitations')
                const used = link.replace(/&amp;/g, '&');
                const again = await page.goto(used);
                const s3 = await L.snap(page, 'variant-08-link-used');
                f.activate.used = {status: again && again.status(), title: s3.title, headings: await L.headings(page), links: (await L.mainLinks(page, 'body')).map((l) => l.text).filter(Boolean).slice(-6), buttons: (await page.locator('.page_invitation_unavailable a, .page_invitation_unavailable button').allInnerTexts().catch(() => [])).map((x) => flat(x))};
                const altered = await page.goto(used.replace(/key=(.)/, (m, c) => `key=${c === 'a' ? 'b' : 'a'}`));
                f.activate.altered = {status: altered && altered.status(), title: await page.title(), text: flat(await page.locator('body').innerText(), 200), header: await page.locator('#navigationUser').count(), links: await page.locator('a').count()};
                record('variant-09-link-altered', {url: rel(page.url()).replace(/key=[^&]+/, 'key=…'), ...f.activate.altered});
                await page.goto(`${origin}/index.php/index/en/login`);
                await idle(page);
                f.activate.signInAfter = await loginHere(page, who.username, who.password);
                f.activate.signInAfter.header = (await L.header(page)).map((l) => l.text);
            });
        } finally {
            await close();
        }
    });

    // ================================================================================================
    // site: the site's own settings, changed and put back (run alone)
    // ================================================================================================
    await phase('site', async () => {
        const f = (facts.site = {});
        const t = tag('u02sw1');
        const statement = `SW1 sweep site statement ${t}`;
        const a = await launch(app);
        const v = await launch(app);
        const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
        const site = new SiteSettingsPage(a.page);
        const strip = (html) => (html || '').replace(/<[^>]+>|&nbsp;|\s/g, '');
        let statementChanged = false;
        let checkChanged = false;
        try {
            await signIn(a.page, 'admin');

            // --- the site's Privacy Statement: the site consent box and its refusal (Fields, Rule 5)
            await step('site.statement', async () => {
                await site.goto();
                let form = await site.information();
                f.statement = {before: await form.richContent(form.privacyId('en'))};
                if (strip(f.statement.before)) {
                    f.statement.skipped = 'the site already has a Privacy Statement: left as it is';
                    return;
                }
                await v.page.goto(u('index/en/user/register'));
                await idle(v.page);
                f.statement.boxBefore = await v.page.locator('form#register input[name="privacyConsent[0]"]').count();
                await form.typeRich(form.privacyId('en'), statement);
                statementChanged = true;
                const r = await form.pressSave();
                await form.savedStatus.waitFor({timeout: T}).catch(() => {});
                f.statement.save = {status: r.status(), saved: await form.savedStatus.isVisible().catch(() => false)};
                await L.snap(a.page, 'site-01-site-information-saved');
                // the visitor
                await v.page.goto(u('index/en/user/register'));
                const s = await L.snap(v.page, 'site-02-site-register-with-site-statement');
                await shot(v.page, 'site-02-site-register-with-site-statement');
                const facts0 = await L.formFacts(v.page, {names: [w.seeded]});
                f.statement.box = facts0.controls.find((c) => c.name === 'privacyConsent[0]') || null;
                f.statement.links = facts0.links;
                f.statement.seededBlock = facts0.contexts.named[0] || null;
                f.statement.tally = facts0.contexts.tally;
                f.statement.tail = flat((s.text.main || '').split('Repeat password')[1], 100000).slice(-700);
                const who = person(t, 'n');
                await L.fill(v.page, who, {});
                f.statement.unticked = await L.press(v.page);
                await L.snap(v.page, 'site-03-site-consent-missing');
                f.statement.untickedValues = await L.valuesOf(v.page);
                // the link's page
                const link = v.page.locator('form#register').getByRole('link', {name: 'privacy statement'}).last();
                if (await link.count()) {
                    f.statement.link = {href: rel(await link.getAttribute('href')), target: await link.getAttribute('target')};
                    const res = await v.context.request.get(await link.getAttribute('href')).catch(() => null);
                    f.statement.link.status = res && res.status();
                }
                // ticked, no role: registers
                await v.page.locator('form#register input[name="privacyConsent[0]"]').check();
                await L.passwords(v.page, who);
                f.statement.ticked = await L.press(v.page);
                f.statement.tickedComplete = await L.completeFacts(v.page);
                await signOut(v.page);
                // the context-level page is unchanged by the site's statement
                await v.page.goto(u(`${ctx}/en/user/register`));
                await idle(v.page);
                f.statement.contextPage = (await L.formFacts(v.page)).controls.filter((c) => c.type === 'checkbox').map((c) => c.name);
            });
        } finally {
            if (statementChanged) {
                try {
                    await site.goto();
                    const form = await site.information();
                    await form.typeRich(form.privacyId('en'), '');
                    const r = await form.pressSave();
                    await form.savedStatus.waitFor({timeout: T}).catch(() => {});
                    await a.page.reload();
                    const again = await new SiteSettingsPage(a.page).information();
                    const left = await again.richContent(again.privacyId('en'));
                    await v.page.goto(u('index/en/user/register'));
                    await idle(v.page);
                    f.statement.restore = {status: r.status(), left, boxAfter: await v.page.locator('form#register input[name="privacyConsent[0]"]').count()};
                    console.log(`[sw1] ${app.name} site statement restored: status ${r.status()}, left "${strip(left)}", site consent boxes ${f.statement.restore.boxAfter}`);
                } catch (error) {
                    f.statement.restore = {error: String(error.message || error).split('\n')[0]};
                    console.error(`[sw1] ${app.name} SITE STATEMENT NOT RESTORED: ${f.statement.restore.error}`);
                    process.exitCode = 1;
                }
            }
        }
        try {
            // --- the compromised-password check (Fields "Password"; Settings "Site password policy")
            await step('site.password', async () => {
                await site.goto();
                let sec = await site.security();
                f.password = {before: {min: await sec.minPasswordLength.inputValue(), check: await sec.compromisedCheck.isChecked()}};
                if (f.password.before.check) {
                    f.password.skipped = 'the check is already on: left as it is';
                    return;
                }
                await sec.compromisedCheck.check();
                checkChanged = true;
                const r = await sec.pressSave();
                await sec.savedStatus.waitFor({timeout: T}).catch(() => {});
                f.password.save = {status: r.status(), saved: await sec.savedStatus.isVisible().catch(() => false)};
                await L.snap(a.page, 'site-04-site-security-check-on');
                const who = person(t, 'k');
                f.password.tries = {};
                for (const [name, password] of Object.entries({breached: 'qwerty123456', breached2: 'password1234', shortBreached: '12345'})) {
                    await v.page.goto(u(`${ctx}/en/user/register`));
                    await idle(v.page);
                    await L.fill(v.page, {...who, password}, {consent: true});
                    const started = Date.now();
                    const p = await L.press(v.page);
                    f.password.tries[name] = {password, ms: Date.now() - started, h1: p.h1, lines: p.errors && p.errors.lines, status: p.status};
                    if (name === 'breached') await L.snap(v.page, 'site-05-register-breached-password');
                    if (p.h1 && /complete/i.test(p.h1)) break;
                }
                // the control: with the check still on, a password of the run's own registers
                if (!Object.values(f.password.tries).some((x) => /complete/i.test(x.h1 || ''))) {
                    await v.page.goto(u(`${ctx}/en/user/register`));
                    await idle(v.page);
                    await L.fill(v.page, who, {consent: true});
                    const p = await L.press(v.page);
                    f.password.control = {h1: p.h1, lines: p.errors && p.errors.lines, links: (await L.completeFacts(v.page)).links.map((l) => l.text)};
                    await signOut(v.page);
                }
            });
        } finally {
            if (checkChanged) {
                try {
                    await site.goto();
                    const sec = await site.security();
                    await sec.compromisedCheck.uncheck();
                    const r = await sec.pressSave();
                    await sec.savedStatus.waitFor({timeout: T}).catch(() => {});
                    await a.page.reload();
                    const again = await new SiteSettingsPage(a.page).security();
                    f.password.restore = {status: r.status(), check: await again.compromisedCheck.isChecked()};
                    console.log(`[sw1] ${app.name} compromised-password check restored: status ${r.status()}, ticked ${f.password.restore.check}`);
                } catch (error) {
                    f.password.restore = {error: String(error.message || error).split('\n')[0]};
                    console.error(`[sw1] ${app.name} PASSWORD CHECK NOT RESTORED: ${f.password.restore.error}`);
                    process.exitCode = 1;
                }
            }
            await a.close();
            await v.close();
        }
    });
};
