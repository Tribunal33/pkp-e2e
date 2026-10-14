// U03 User profile — drift sweep 2026-10-14, chunk SW1 (.reports/U03/sweep-chunks.md): the page shell,
// Identity, Contact, the email change, impersonation, the new submission's contributor; spec Rules 1–7,
// scenarios 1–5, 11, 12, the Actors table, Fields & validation (intro, Identity, Contact), Cross-feature
// interactions. Every screen is recorded with screen()/shot(); facts land in facts-<phase>-<run>-<app>.json.
//
//   PROBE_RUN=r1 PHASES=shell PROBE_FEATURE=U03 PROBE_AGENT=ccSW1 bin/app-lock.sh shared ojs -- \
//       node bin/probe.js ojs shared/playwright/checks/U03/SW1/sw1.js
//   phases: shell identity contact email imperson contrib xfeat extra (default: all but extra). Run each twice (r1, r2).
//
//   shell    read-only on publicknowledge (one account per level), the user menu, the tabs and what each
//            offers, tab names in the address, other accounts' ids in the address, the public header's menu,
//            signed out at the address; a scratch context with two form languages (the pop-up boxes); the
//            site-level profile as admin; a user with no role anywhere
//   identity scenario 2 on a scratch context (en + fr_CA), the 255/256 axis of "Given Name", the initials box,
//            a family name without its given name (two form languages), the ORCID block's presence
//   contact  scenario 3: the browser checks, phone's 24/25 axis, Working Languages, the server refusal and the
//            tab question before and after it (A17), the tab reloads (Rule 2f)
//   email    scenarios 4 and 5, a preferred name in the message, a link opened by another signed-in user,
//            the signed-out "reject", the three-day lapse (expiry back-dated in the DB), a two-journal account
//            (A18) signed in and signed out, a request made on the site-level profile (A3, A10)
//   imperson scenario 11
//   contrib  scenario 12 and its other end (an empty profile), the masthead's affiliation, the signature in a
//            decision email and not in a participant's Notify message, reviewing interests in Add Reviewer
//   xfeat    the registration completion page's "Edit My Profile" and the Register page's "Login" link, the
//            access-denied page, the "Change Email Address Invitation" row on Manage Emails, OJS's
//            user/subscriptions page
const {forEachApp, signIn, signOut, record, loc, note, idle, tag, sql} = require('../../../probe');
const L = require('./lib.js');

const {flat, sleep, TABS, SAVED} = L;
const RUN = process.env.PROBE_RUN || 'r1';
const PHASES = (process.env.PHASES || 'shell,identity,contact,email,imperson,contrib,xfeat').split(',');
const on = (p) => PHASES.includes(p);
const PK = 'publicknowledge';
const log = (...a) => console.log(`[sw1 ${RUN}]`, ...a);

async function sect(F, name, fn) {
    try {
        F[name] = await fn();
    } catch (e) {
        F[name] = {FAILED: String(e.stack || e).split('\n').slice(0, 5).join(' | ')};
        log(`[${name} FAILED]`, F[name].FAILED);
    }
}

// ================================================================================== shell
async function phaseShell(app) {
    const F = {};
    const A = app.name;
    const ctxUrl = (cp, p) => app.url(`/index.php/${cp}${p}`);
    const levels = ['reader.rosa', 'author.alex', 'reviewer.julia', 'assistant.rita', 'sectioneditor.ana', 'manager.maya', 'admin']
        .filter((u) => !(A === 'ops' && u === 'reviewer.julia'));
    const b = await L.browserFor(app, 'shell');
    const {page} = b;
    try {
        // ---- one account per level: the page, its tabs, the Roles boxes, the API Key button, no banner
        await sect(F, 'levels', async () => {
            const out = {};
            for (const u of levels) {
                await signIn(page, u, {contextPath: PK});
                await idle(page);
                const landed = page.url().replace(app.baseURL, '');
                await page.goto(ctxUrl(PK, '/user/profile'));
                await L.waitForm(page, 'identity');
                const s = await L.snap(page, `shell-level-${u.replace('.', '')}-identity`);
                const r = {
                    landed,
                    url: page.url().replace(app.baseURL, ''),
                    title: s.title,
                    heading: flat(await page.locator('h1').first().innerText().catch(() => null)),
                    tabs: (await page.locator('#profileTabs [role="tab"]').allInnerTexts()).map((t) => flat(t)),
                    selected: await L.selectedTab(page),
                    username: flat(await page.locator('#userNameInfo').innerText().catch(() => null)),
                    banner: (s.text.main || '').includes('scheduled to begin'),
                    userButton: await L.userButton(page),
                    navLandmarks: await page.getByRole('navigation').evaluateAll((ns) => ns.map((n) => n.getAttribute('aria-label') || n.id || n.className).slice(0, 8)),
                };
                await L.pressTab(page, 'roles');
                await L.snap(page, `shell-level-${u.replace('.', '')}-roles`);
                r.roles = await page.evaluate(() => {
                    const sec = document.querySelector('form#rolesForm #userGroups .section');
                    if (!sec) return null;
                    return [...sec.querySelectorAll('li')].map((li) => ({label: li.innerText.trim(), checked: !!(li.querySelector('input') || {}).checked}));
                });
                await L.pressTab(page, 'apiSettings');
                r.apiButtons = (await L.tabFacts(page) || {}).buttons;
                out[u] = r;
                log('[level]', A, u, JSON.stringify({sel: r.selected, tabs: r.tabs.length, user: r.username, roles: r.roles && r.roles.map((x) => `${x.label}${x.checked ? '+' : ''}`)}));
            }
            return out;
        });

        // ---- author.alex: "Edit Profile" from an editorial screen, each tab swept, the address reads
        await sect(F, 'alex', async () => {
            const out = {};
            await signIn(page, 'author.alex', {contextPath: PK});
            await page.goto(ctxUrl(PK, '/dashboard/mySubmissions'));
            await idle(page);
            out.userButton = await L.userButton(page);
            out.menu = await L.userMenu(page);
            await L.snap(page, 'shell-alex-usermenu');
            await page.locator('[data-cy="app-user-nav"]').getByRole('link', {name: 'Edit Profile', exact: true}).click();
            await page.waitForURL(/user\/profile/, {timeout: 30000});
            await L.waitForm(page, 'identity');
            const s0 = await L.snap(page, 'shell-alex-editprofile');
            out.editProfile = {url: page.url().replace(app.baseURL, ''), selected: await L.selectedTab(page), title: s0.title,
                given: await page.locator('form#identityForm input[name="givenName[en]"]').inputValue().catch(() => null),
                family: await page.locator('form#identityForm input[name="familyName[en]"]').inputValue().catch(() => null),
                usernameTag: await page.locator('#userNameInfo').evaluate((e) => e.tagName + (e.isContentEditable ? ' editable' : '')).catch(() => null)};
            await loc(page, 'Profile › Identity: the username (plain text)', page.locator('#userNameInfo'));
            out.tabs = {};
            for (const t of TABS) {
                await L.pressTab(page, t);
                await L.waitEditors(page, `form#${L.FORMS[t]}`);
                await L.snap(page, `shell-alex-tab-${t}`);
                out.tabs[t] = await L.tabFacts(page);
            }
            out.tabLoads = b.tabLoads.slice();
            // a tab named in the address, every name and a nonsense one
            out.address = {};
            for (const name of [...TABS, 'nowhere', 'Contact']) {
                await page.goto(ctxUrl(PK, `/user/profile/${name}`));
                await page.locator('#profileTabs form').first().waitFor({timeout: 30000}).catch(() => {});
                await idle(page);
                await sleep(500);
                out.address[name] = {url: page.url().replace(app.baseURL, ''), selected: await L.selectedTab(page)};
            }
            await L.snap(page, 'shell-alex-address-nowhere-last');
            // another account's id in the address
            const rosaId = sql(app, `select user_id from users where username='reader.rosa'`);
            out.otherIds = {};
            for (const p of [`/user/profile/${rosaId}`, `/user/profile/identity/${rosaId}`, `/user/profile?userId=${rosaId}`, `/user/profile/contact/${rosaId}`]) {
                await page.goto(ctxUrl(PK, p));
                await page.locator('#profileTabs form').first().waitFor({timeout: 30000}).catch(() => {});
                await idle(page);
                out.otherIds[p] = {url: page.url().replace(app.baseURL, ''), username: flat(await page.locator('#userNameInfo').innerText().catch(() => null)),
                    email: await page.locator('form#contactForm input[name="email"]').inputValue().catch(() => null)};
            }
            // the public pages: the header's username and its menu's "View Profile"
            await page.goto(ctxUrl(PK, '/index'));
            await idle(page);
            await page.locator('[data-toggle="dropdown"]').first().waitFor({timeout: 15000}).catch(() => {});
            const sh = await L.snap(page, 'shell-alex-public-home');
            out.publicHeader = flat(sh.text.header, 400);
            const toggle = page.locator('#navigationUser [data-toggle="dropdown"], .pkp_navigation_user [data-toggle="dropdown"]').first();
            out.publicToggle = flat(await toggle.innerText().catch(() => null));
            await toggle.click().catch(() => {});
            await sleep(500);
            out.publicMenu = (await page.locator('#navigationUser .dropdown-menu a, .pkp_navigation_user .dropdown-menu a').allInnerTexts().catch(() => [])).map((t) => flat(t));
            await L.snap(page, 'shell-alex-public-menu');
            const view = page.getByRole('link', {name: 'View Profile', exact: true}).first();
            if (await view.count()) {
                await view.click();
                await page.waitForURL(/user\/profile/, {timeout: 30000}).catch(() => {});
                await L.waitForm(page, 'identity').catch(() => {});
                const sv = await L.snap(page, 'shell-alex-viewprofile');
                out.viewProfile = {url: page.url().replace(app.baseURL, ''), selected: await L.selectedTab(page), title: sv.title,
                    editorial: await page.locator('[data-cy="app-user-nav"]').count()};
            }
            // signed out at the address, then the Login page's own form
            const address = ctxUrl(PK, '/user/profile');
            await signOut(page);
            b.takeChain();
            await page.goto(`${address}/contact`);
            await idle(page);
            const sl = await L.snap(page, 'shell-alex-signedout-login');
            out.signedOut = {url: page.url().replace(app.baseURL, ''), loginForm: await page.locator('form#login').count(), title: sl.title, chain: b.takeChain()};
            const {LoginPage} = require('../../../pages/LoginPage.js');
            await new LoginPage(page).signIn('author.alex', 'author.alexauthor.alex');
            await page.waitForURL(/user\/profile/, {timeout: 30000}).catch(() => {});
            await page.locator('#profileTabs form').first().waitFor({timeout: 30000}).catch(() => {});
            await idle(page);
            await L.snap(page, 'shell-alex-signedout-after-signin');
            out.signedOut.after = {url: page.url().replace(app.baseURL, ''), selected: await L.selectedTab(page), chain: b.takeChain()};
            // the reader at the copied address (control)
            const r = await L.browserFor(app, 'reader');
            try {
                await signIn(r.page, 'reader.rosa', {contextPath: PK});
                await r.page.goto(address);
                await L.waitForm(r.page, 'identity');
                await L.snap(r.page, 'shell-rosa-copied-address');
                out.readerControl = {username: flat(await r.page.locator('#userNameInfo').innerText().catch(() => null))};
            } finally {
                await r.close();
            }
            return out;
        });

        // ---- two form languages: the pop-up panel of a second language's box
        await sect(F, 'multilingual', async () => {
            const t = tag(`u03sw1m${RUN}`);
            await app.api.createContext({tag: t, context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
                users: [{username: `${t}au`, roles: ['author'], givenName: 'Mila', familyName: 'Lingua'}]});
            const out = {t};
            await signIn(page, `${t}au`, {contextPath: t});
            await page.goto(ctxUrl(t, '/user/profile/identity'));
            await L.waitForm(page, 'identity');
            const popover = async () => page.evaluate(() => {
                const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
                const boxes = [...document.querySelectorAll('#profileTabs [role="tabpanel"][aria-hidden="false"] input[name$="[fr_CA]"]')];
                return boxes.map((i) => {
                    const pop = i.closest('.localization_popover, .pkpFormLocales, [class*="popover"]');
                    return {name: i.name, visible: vis(i), popoverVisible: pop ? vis(pop) : null,
                        popoverText: pop ? (pop.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80) : null,
                        label: (document.querySelector(`label[for="${i.id}"]`) || {}).innerText || null};
                });
            });
            out.identityInputs = (await L.tabFacts(page)).inputs.filter((i) => /Name|Initials/.test(i.name)).map((i) => `${i.name}${i.visible ? '' : ' (hidden)'}`);
            out.beforeFocus = await popover();
            await page.locator('form#identityForm input[name="givenName[en]"]').click();
            await sleep(600);
            out.afterClick = await popover();
            await L.snap(page, 'shell-ml-identity-given-clicked');
            await loc(page, 'Profile › Identity: the French "Given Name" box in its pop-up (two form languages)', page.locator('form#identityForm input[name="givenName[fr_CA]"]'));
            // away, then the Tab key into the box
            await page.locator('h1').first().click();
            await sleep(400);
            out.afterAway = await popover();
            await page.locator('form#identityForm input[name="familyName[en]"]').focus();
            await page.keyboard.press('Shift+Tab');
            await sleep(200);
            let guard = 0;
            while (guard++ < 12) {
                const n = await page.evaluate(() => (document.activeElement ? document.activeElement.getAttribute('name') : null));
                if (n === 'givenName[en]') break;
                await page.keyboard.press('Shift+Tab');
                await sleep(120);
            }
            await sleep(500);
            out.afterTabKey = {active: await page.evaluate(() => (document.activeElement ? document.activeElement.getAttribute('name') : null)), boxes: await popover()};
            await L.snap(page, 'shell-ml-identity-given-tabbed');
            // Contact and Public: which boxes double
            await L.pressTab(page, 'contact');
            await L.waitEditors(page, 'form#contactForm');
            await L.snap(page, 'shell-ml-contact');
            const cf = await L.tabFacts(page);
            out.contact = {inputs: cf.inputs.map((i) => `${i.name}${i.visible ? '' : ' (hidden)'}`), editors: cf.editors.length,
                signature: await L.editorIn(page, 'form#contactForm', 'signature'), mailing: await L.editorIn(page, 'form#contactForm', 'mailingAddress')};
            await L.pressTab(page, 'publicProfile');
            await L.waitEditors(page, 'form#publicProfileForm');
            out.public = {bio: await L.editorIn(page, 'form#publicProfileForm', 'biography')};
            return out;
        });

        // ---- the site-level profile as the Site Administrator
        await sect(F, 'siteAdmin', async () => {
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/user/profile'));
            await L.waitForm(page, 'identity');
            const s = await L.snap(page, 'shell-admin-site-identity');
            const f = await L.tabFacts(page);
            return {url: page.url().replace(app.baseURL, ''), title: s.title, tabs: (await page.locator('#profileTabs [role="tab"]').allInnerTexts()).map((t) => flat(t)),
                nameBoxes: f.inputs.filter((i) => /^(givenName|familyName|preferredPublicName)/.test(i.name)).map((i) => `${i.name}${i.visible ? '' : ' (hidden)'}`),
                orcid: /orcid/i.test(s.text.main || ''), header: flat(s.text.header, 200)};
        });

        // ---- a user with no role anywhere (every role ended)
        await sect(F, 'noRole', async () => {
            const t = tag(`u03sw1n${RUN}`);
            await app.api.createContext({tag: t, users: [{username: `${t}nr`, roles: [], pastRoles: [{role: 'author'}], givenName: 'Nora', familyName: 'Nobody'}]});
            const out = {t};
            await signIn(page, `${t}nr`, {contextPath: t});
            await idle(page);
            const s0 = await L.snap(page, 'shell-norole-after-signin');
            out.landed = {url: page.url().replace(app.baseURL, ''), title: s0.title};
            for (const [k, p] of [['journal', ctxUrl(t, '/user/profile')], ['site', app.url('/index.php/index/user/profile')], ['seeded', ctxUrl(PK, '/user/profile')]]) {
                await page.goto(p);
                await page.locator('#profileTabs form').first().waitFor({timeout: 20000}).catch(() => {});
                await idle(page);
                const s = await L.snap(page, `shell-norole-${k}`);
                out[k] = {url: page.url().replace(app.baseURL, ''), title: s.title, heading: flat(await page.locator('h1').first().innerText().catch(() => null)),
                    tabs: (await page.locator('#profileTabs [role="tab"]').allInnerTexts().catch(() => [])).map((x) => flat(x)),
                    username: flat(await page.locator('#userNameInfo').innerText().catch(() => null)), banner: (s.text.main || '').includes('scheduled')};
            }
            return out;
        });
    } finally {
        await b.close();
    }
    F.dialogs = b.seen;
    record('facts-shell', F);
    return F;
}

// ================================================================================== identity
async function phaseIdentity(app) {
    const F = {};
    const ctxUrl = (cp, p) => app.url(`/index.php/${cp}${p}`);
    const t = tag(`u03sw1i${RUN}`);
    const au = `${t}au`;
    const mg = `${t}mg`;
    const email = `${au}@mail.test`;
    const pref = `Dr. Pat Profile ${RUN}`;
    await app.api.createContext({tag: t, context: {supportedLocales: ['en', 'fr_CA']},
        users: [{username: au, givenName: 'Ulla', familyName: 'Bergmann', roles: ['author']}, {username: mg, givenName: 'Mona', familyName: 'Manager', roles: ['manager']}]});
    const tf = tag(`u03sw1f${RUN}`);
    const fa = `${tf}fa`;
    await app.api.createContext({tag: tf, orcid: {enabled: true}, context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
        users: [{username: fa, givenName: 'Fay', familyName: 'Forms', roles: ['author']}]});
    F.seed = {t, au, mg, tf, fa};
    const b = await L.browserFor(app, 'author');
    const m = await L.browserFor(app, 'manager');
    const {page} = b;
    const given = () => page.locator('form#identityForm input[name="givenName[en]"]');
    const family = () => page.locator('form#identityForm input[name="familyName[en]"]');
    const prefBox = () => page.locator('form#identityForm input[name="preferredPublicName[en]"]');
    const initials = () => page.locator('form#identityForm input[name="preferredAvatarInitials"]');
    const save = async () => {
        const n = b.saves.length;
        await L.panel(page).getByRole('button', {name: 'Save', exact: true}).click();
        await sleep(1500);
        await idle(page);
        return b.saves.length - n;
    };
    const afterSave = async (label) => {
        const s = await L.snap(page, label);
        return {notices: s.notices, toasts: await L.toasts(page), inTab: flat(await page.locator('#identityFormNotification').innerText().catch(() => null)),
            fieldErrors: (await L.tabFacts(page) || {}).fieldErrors, selected: await L.selectedTab(page)};
    };
    try {
        await signIn(page, au, {contextPath: t});
        await page.goto(ctxUrl(t, '/user/profile/identity'));
        await L.waitForm(page, 'identity');
        await L.snap(page, 'identity-00-open');
        await sect(F, 'fields', async () => ({
            facts: await L.tabFacts(page),
            hints: await page.evaluate(() => [...document.querySelectorAll('form#identityForm label, form#identityForm .description, form#identityForm span, form#identityForm p')]
                .map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter((x) => /Please provide|Enter the two letters/.test(x)).filter((x, i, a) => a.indexOf(x) === i)),
            usernameEditable: await page.locator('#userNameInfo input, input[name="username"]').count(),
        }));
        await loc(page, 'Profile › Identity: "Given Name" (English)', given());
        await loc(page, 'Profile › Identity: "Preferred Avatar Initials"', initials());

        // given name emptied: the browser's refusal, nothing sent
        await sect(F, 'givenEmpty', async () => {
            await given().fill('');
            const sent = await save();
            const r = await afterSave('identity-01-given-empty');
            r.sent = sent;
            r.errorPlacement = await page.evaluate(() => {
                const e = [...document.querySelectorAll('form#identityForm label.error')].find((x) => x.offsetParent);
                if (!e) return null;
                const inp = document.querySelector('form#identityForm input[name="givenName[en]"]');
                return {forAttr: e.getAttribute('for'), inputId: inp && inp.id, follows: !!(inp && (inp.nextElementSibling === e || inp.parentElement.contains(e)))};
            });
            await given().fill('Ulla');
            return r;
        });

        // the 255/256 axis of "Given Name"
        await sect(F, 'givenLength', async () => {
            const out = {maxlength: await given().getAttribute('maxlength')};
            for (const n of [255, 256]) {
                await given().fill('');
                await given().click();
                await page.keyboard.insertText('G'.repeat(n));
                out[`typed${n}`] = (await given().inputValue()).length;
                const sent = await save();
                const r = await afterSave(`identity-02-given-${n}`);
                await page.reload();
                await L.waitForm(page, 'identity');
                out[`saved${n}`] = {sent, ...r, afterReload: (await given().inputValue()).length};
            }
            await given().fill('Ulla');
            await save();
            return out;
        });

        // the initials box: a pasted three, then two typed lower-case letters and a third
        await sect(F, 'initials', async () => {
            const out = {maxlength: await initials().getAttribute('maxlength')};
            await initials().fill('xyz');
            out.filled3 = await initials().inputValue();
            await initials().fill('');
            await initials().pressSequentially('zqx', {delay: 60});
            out.typed = await initials().inputValue();
            await prefBox().fill(pref);
            const sent = await save();
            out.save = {sent, ...(await afterSave('identity-03-pref-initials-saved'))};
            // six seconds on: did anything show at the top right?
            await sleep(6000);
            out.save.toastsLater = await L.toasts(page);
            out.save.valuesAfterSave = {pref: await prefBox().inputValue(), initials: await initials().inputValue()};
            // the in-tab message after the tab is opened again
            await L.pressTab(page, 'contact');
            await L.pressTab(page, 'identity');
            out.inTabAfterReopen = flat(await page.locator('#identityFormNotification').innerText().catch(() => null));
            // the reload: the avatar and the top bar
            await page.reload();
            await L.waitForm(page, 'identity');
            await L.snap(page, 'identity-04-reloaded');
            out.afterReload = await L.userButton(page);
            return out;
        });
        // a lower-case pair put in without typing: the tab after the save shows the stored value
        await sect(F, 'refresh', async () => {
            await initials().fill('ab');
            const before = await initials().inputValue();
            const sent = await save();
            const right = await initials().inputValue();
            await page.reload();
            await L.waitForm(page, 'identity');
            const reloaded = await initials().inputValue();
            const av = await L.userButton(page);
            // back to ZQ for the reads below
            await initials().fill('');
            await initials().pressSequentially('zq');
            await save();
            return {before, sent, rightAfterSave: right, afterReload: reloaded, avatar: av};
        });
        // the public homepage's header
        await sect(F, 'publicHeader', async () => {
            await page.goto(ctxUrl(t, '/index'));
            await idle(page);
            const s = await L.snap(page, 'identity-05-public-home');
            return {header: flat(s.text.header, 300), hasUsername: (s.text.header || '').includes(au), hasPref: (s.text.header || '').includes(pref)};
        });
        // the manager's Users & Roles, English and French
        await sect(F, 'usersRoles', async () => {
            await signIn(m.page, mg, {contextPath: t});
            const en = await L.usersRow(m.page, app, t, au, email);
            await L.snap(m.page, 'identity-06-users-en');
            const fr = await L.usersRow(m.page, app, t, au, email, 'fr_CA');
            await L.snap(m.page, 'identity-07-users-fr');
            const en2 = await L.usersRow(m.page, app, t, au, email, 'en');
            return {en, fr, enAgain: en2, frUrl: m.page.url().replace(app.baseURL, '')};
        });
        // the site-level address: forwarded to the journal's profile, with and without a tab
        await sect(F, 'siteForward', async () => {
            const out = {};
            for (const p of ['/index.php/index/user/profile', '/index.php/index/user/profile/roles', '/index.php/index/user/profile/notificationSettings', '/index.php/index/en/user/profile/contact']) {
                b.takeChain();
                await page.goto(app.url(p));
                await page.locator('#profileTabs form').first().waitFor({timeout: 30000}).catch(() => {});
                await idle(page);
                await sleep(400);
                out[p] = {url: page.url().replace(app.baseURL, ''), selected: await L.selectedTab(page), title: await page.title(), chain: b.takeChain()};
            }
            await L.snap(page, 'identity-08-site-forward-last');
            return out;
        });
        // back to the name's initials, then the given name's letter alone
        await sect(F, 'clear', async () => {
            await page.goto(ctxUrl(t, '/user/profile/identity'));
            await L.waitForm(page, 'identity');
            await prefBox().fill('');
            await initials().fill('');
            const s1 = await save();
            await page.reload();
            await L.waitForm(page, 'identity');
            const a1 = await L.userButton(page);
            await L.snap(page, 'identity-09-cleared');
            await family().fill('');
            const s2 = await save();
            await page.reload();
            await L.waitForm(page, 'identity');
            const a2 = await L.userButton(page);
            await L.snap(page, 'identity-10-family-cleared');
            const row = await L.usersRow(m.page, app, t, au, email, 'en');
            return {sent: [s1, s2], cleared: a1, familyCleared: a2, usersRow: row};
        });
        // ORCID block: this context (ORCID not enabled) and the two-language context (ORCID enabled)
        await sect(F, 'orcidAndForms', async () => {
            const out = {};
            await page.goto(ctxUrl(t, '/user/profile/identity'));
            await L.waitForm(page, 'identity');
            out.noOrcidCtx = await page.evaluate(() => /orcid/i.test(document.querySelector('form#identityForm').innerText));
            await signIn(page, fa, {contextPath: tf});
            await page.goto(ctxUrl(tf, '/user/profile/identity'));
            await L.waitForm(page, 'identity');
            const s = await L.snap(page, 'identity-11-orcid-ctx');
            out.orcidCtx = {orcid: /orcid/i.test(s.text.main || ''), orcidText: flat((s.text.main || '').split('\n').filter((l) => /orcid/i.test(l)).join(' | '), 300)};
            // a family name in French with no French given name
            await page.locator('form#identityForm input[name="familyName[en]"]').click();
            await sleep(500);
            const frFamily = page.locator('form#identityForm input[name="familyName[fr_CA]"]');
            await frFamily.fill('Famille');
            out.frGivenValue = await page.locator('form#identityForm input[name="givenName[fr_CA]"]').inputValue();
            const sent = await save();
            const r = await afterSave('identity-12-family-without-given');
            out.familyWithoutGiven = {sent, ...r, formText: flat(await page.locator('form#identityForm').innerText().catch(() => null), 900)};
            await page.reload();
            await L.waitForm(page, 'identity');
            await page.locator('form#identityForm input[name="familyName[en]"]').click();
            await sleep(400);
            out.familyWithoutGiven.afterReload = await page.locator('form#identityForm input[name="familyName[fr_CA]"]').inputValue();
            return out;
        });
    } finally {
        F.dialogs = b.seen.concat(m.seen);
        await b.close();
        await m.close();
    }
    record('facts-identity', F);
    return F;
}

// ================================================================================== contact
async function phaseContact(app) {
    const F = {};
    const ctxUrl = (cp, p) => app.url(`/index.php/${cp}${p}`);
    const t = tag(`u03sw1c${RUN}`);
    const au = `${t}au`;
    const ot = `${t}ot`;
    const email = `${au}@mail.test`;
    await app.api.createContext({tag: t, context: {supportedLocales: ['en', 'fr_CA']},
        users: [{username: au, givenName: 'Cora', familyName: 'Contact', roles: ['author']}, {username: ot, givenName: 'Otto', familyName: 'Other', roles: ['author']}]});
    F.seed = {t, au, ot};
    const b = await L.browserFor(app, 'contact');
    const {page} = b;
    const f = (n) => page.locator(`form#contactForm [name="${n}"]`);
    const phone = () => f('phone');
    const country = () => f('country');
    const emailBox = () => f('email');
    const label = () => page.locator('form#contactForm label[for^="email"]').first();
    const save = async () => {
        const n = b.saves.length;
        await L.panel(page).getByRole('button', {name: 'Save', exact: true}).click();
        await sleep(1500);
        await idle(page);
        return b.saves.length - n;
    };
    const read = async (lbl) => {
        const s = await L.snap(page, lbl);
        return {notices: s.notices, toasts: await L.toasts(page), facts: await L.tabFacts(page), label: flat(await label().innerText().catch(() => null)),
            phone: await phone().inputValue().catch(() => null), email: await emailBox().inputValue().catch(() => null), selected: await L.selectedTab(page)};
    };
    const leave = async (mode, lbl) => {
        b.mode = mode;
        const n = b.seen.length;
        await L.pressTab(page, 'identity', {expectForm: false});
        await sleep(600);
        const r = {dialogs: b.since(n), selected: await L.selectedTab(page), contactShown: await page.locator('form#contactForm').isVisible().catch(() => false)};
        if (r.contactShown) r.phone = await phone().inputValue().catch(() => null);
        await L.snap(page, lbl, r);
        b.mode = 'accept';
        return r;
    };
    try {
        await signIn(page, au, {contextPath: t});
        await page.goto(ctxUrl(t, '/user/profile/contact'));
        await L.waitForm(page, 'contact');
        await L.waitEditors(page, 'form#contactForm');
        F.open = await read('contact-00-open');
        F.open.countryFirst = await country().evaluate((s) => [...s.options].slice(0, 3).map((o) => `${o.value}:${o.text}`));
        F.open.countryCount = await country().evaluate((s) => s.options.length);
        F.open.workingLanguages = await page.evaluate(() => [...document.querySelectorAll('form#contactForm input[name="locales[]"]')].map((i) => ({value: i.value, label: (i.closest('label') || i.parentElement).innerText.trim(), checked: i.checked})));
        await loc(page, 'Profile › Contact: "Email address" label', label());
        await loc(page, 'Profile › Contact: "Country"', country());

        // a new account's first save: Country empty
        await sect(F, 'firstSave', async () => ({sent: await save(), ...(await read('contact-01-first-save'))}));
        // a malformed address, country chosen
        await sect(F, 'malformed', async () => {
            await country().selectOption({label: 'Canada'});
            await emailBox().fill('not-an-email');
            const sent = await save();
            const r = await read('contact-02-malformed');
            await emailBox().fill(email);
            await country().selectOption({value: ''});
            return {sent, ...r};
        });
        // country blank + phone: refused by the browser; then another tab: Cancel, then OK (Rule 2c)
        await sect(F, 'blankCountry', async () => {
            await country().selectOption({value: ''});
            await phone().fill('555 0100');
            const sent = await save();
            const r = await read('contact-03-blank-country');
            const cancel = await leave('dismiss', 'contact-04-leave-cancel');
            const ok = await leave('accept', 'contact-05-leave-ok');
            await L.pressTab(page, 'contact');
            const reopened = await read('contact-06-reopened');
            return {sent, refusal: {fieldErrors: r.facts.fieldErrors, notices: r.notices}, cancel, ok, reopenedPhone: reopened.phone};
        });
        // phone: the 24/25 axis
        await sect(F, 'phoneLength', async () => {
            const out = {maxlength: await phone().getAttribute('maxlength')};
            await phone().fill('');
            await phone().pressSequentially('123456789012345678901234', {delay: 5});
            out.typed24 = (await phone().inputValue()).length;
            await phone().pressSequentially('5678', {delay: 5});
            out.typed28 = (await phone().inputValue()).length;
            await phone().fill('');
            return out;
        });
        // a valid save
        await sect(F, 'validSave', async () => {
            await country().selectOption({label: 'Canada'});
            await phone().fill('555 0100');
            await page.locator('form#contactForm input[name="affiliation[en]"]').fill('Contact Institute');
            const sent = await save();
            const r = await read('contact-07-valid-saved');
            r.inTab = flat(await page.locator('#contactFormNotification').innerText().catch(() => null));
            await L.pressTab(page, 'identity');
            await L.pressTab(page, 'contact');
            const back = await read('contact-08-valid-reopened');
            return {sent, right: {notices: r.notices, toasts: r.toasts, inTab: r.inTab, selected: r.selected, contactShown: await page.locator('form#contactForm').isVisible()},
                reopened: {phone: back.phone, country: await country().inputValue(), affiliation: await page.locator('form#contactForm input[name="affiliation[en]"]').inputValue()}};
        });
        // Working Languages: tick the second, nothing on screen; saved; the site's language unchanged
        await sect(F, 'workingLanguages', async () => {
            const box = page.locator('form#contactForm input[name="locales[]"][value="fr_CA"]');
            const before = flat(await L.panel(page).innerText(), 2000);
            const htmlLang = await page.locator('html').getAttribute('lang');
            await box.check();
            await sleep(500);
            const after = flat(await L.panel(page).innerText(), 2000);
            const sent = await save();
            const r = await read('contact-09-languages-saved');
            await L.pressTab(page, 'identity');
            await L.pressTab(page, 'contact');
            const ticked = await box.isChecked();
            await page.reload();
            await L.waitForm(page, 'contact');
            await L.snap(page, 'contact-10-languages-reloaded');
            return {sent, screenChangedOnTick: before !== after, toasts: r.toasts, notices: r.notices, tickedOnReopen: ticked,
                htmlLangBefore: htmlLang, htmlLangAfter: await page.locator('html').getAttribute('lang'), heading: flat(await page.locator('h1').first().innerText()), url: page.url().replace(app.baseURL, '')};
        });
        // another account's address + a phone change: the server's refusal; another tab after it (A17)
        await sect(F, 'taken', async () => {
            await page.goto(ctxUrl(t, '/user/profile/contact'));
            await L.waitForm(page, 'contact');
            const labelBefore = flat(await label().innerText());
            await emailBox().fill(`${ot}@mail.test`);
            await phone().fill('555 0199');
            const sent = await save();
            const r = await read('contact-11-taken');
            const inTab = flat(await page.locator('#contactFormNotification').innerText().catch(() => null));
            const typedKept = {email: r.email, phone: r.phone};
            const away = await leave('dismiss', 'contact-12-taken-leave');
            await L.pressTab(page, 'contact');
            const back = await read('contact-13-taken-reopened');
            // again, then a change typed after the refusal: the question returns
            await emailBox().fill(`${ot}@mail.test`);
            await phone().fill('555 0177');
            await save();
            await read('contact-14-taken-again');
            await phone().fill('555 0188');
            await phone().press('Tab');
            const asked = await leave('dismiss', 'contact-15-typed-after-refusal-cancel');
            const asked2 = await leave('accept', 'contact-16-typed-after-refusal-ok');
            await L.pressTab(page, 'contact');
            const back2 = await read('contact-17-after-ok');
            return {sent, labelBefore, labelAfter: r.label, toasts: r.toasts, notices: r.notices, inTab, typedKept, away,
                reopened: {email: back.email, phone: back.phone}, afterRefusalTyped: {cancel: asked, ok: asked2, reopenedPhone: back2.phone}};
        });
        F.tabLoads = b.tabLoads.slice();
    } finally {
        F.dialogs = b.seen;
        await b.close();
    }
    record('facts-contact', F);
    return F;
}

forEachApp(async (app) => {
    const more = require('./sw1-more.js');
    const all = {shell: phaseShell, identity: phaseIdentity, contact: phaseContact, ...more, ...require('./sw1-extra.js')};
    for (const p of PHASES) {
        if (!all[p]) { log('no phase', p); continue; }
        const t0 = Date.now();
        log('phase start', app.name, p);
        try { await all[p](app); } catch (e) { log(`[phase ${p} FAILED]`, String(e.stack || e).split('\n').slice(0, 6).join(' | ')); }
        log('phase end', app.name, p, `${Math.round((Date.now() - t0) / 1000)}s`);
    }
});
