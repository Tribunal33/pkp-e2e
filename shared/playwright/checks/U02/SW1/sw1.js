// U02 "Registration & account validation": drift sweep, chunk SW1 (2026-10-12).
// The context-level Register page, its form and refusals, the completion page, closed, disabled and
// restricted registration, a signed-in visitor, the self-registration flags, and the site-level page's
// own fields (spec lines 10-192, 208-235, 286-426; scenarios 1-5 and 8).
//
//   PROBE_FEATURE=U02 PROBE_AGENT=ccSW1 PROBE_RUN=r1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U02/SW1/sw1.js [phases]
//
// Phases (comma list; default every one but `submission` and `site`):
//   open     signed out, nothing stored: the two Register pages, the form's shape, every refusal, the
//            Login and lost-password links, the about page's link, the privacy statement's tab
//   reg      throwaway registrations on the seeded context: the completion page, the profile's Roles and
//            Notifications tabs, the reviewer offer, an interrupted destination, the French page, the
//            "Login" link, "Make a New Submission" and the next sign-in
//   roles    every roster level, signed in, at both Register addresses; who opens Users & Roles
//   scratch  scratch contexts: the privacy statement emptied; registration closed; a disabled context;
//            a sign-in-restricted one; the "Allow user self-registration" boxes
//   kept     what a refused form keeps: the ticked boxes and the interests as well as the typed boxes
//   sitereg  one site-level registration, "Reader" under the seeded context, the notification box unticked
//   orcid    a scratch context with ORCID enabled: the block above the form
//   submission  the reg phase's "Make a New Submission" walk alone (not in the default list)
//   variant  the validation-variant server (+90): the ALTCHA check with and without JavaScript, a
//            not-yet-validated account's claim on its username and email, the emailed link
//   site     the site's own settings, changed and put back: a site Privacy Statement (the site consent
//            box), the compromised-password check. Run it alone, with nothing else on the fleet:
//            `bin/app-lock.sh exclusive <app> -- node bin/probe.js <app> …/sw1.js site`.
// Line 97's Rule 8 clause (an interest two visitors typed is kept twice) is the kept
// shared/playwright/checks/U03/I07/i07.js, `PHASES=int`.
//
// Every phase seeds what it needs under its own tag (u02sw1…), records each screen with screen() and
// writes its facts to facts-<phase>. Nothing is asserted: the records are read against the spec.
const {forEachApp, launch, shot, record, loc, idle, tag} = require('../../../probe');
const L = require('./lib.js');

const {flat, rel, sleep, W} = L;
const PHASES = (process.argv[2] || 'open,kept,reg,sitereg,orcid,roles,scratch,variant').split(',');
const T = 30_000;

/** A throwaway registrant: the name is username and mailbox; the password fits the 32-character box. */
const person = (base, suffix) => ({username: `${base}${suffix}`, email: `${base}${suffix}@mail.test`, password: `Pw9${base.slice(-6)}${suffix}x`});

forEachApp(async (app) => {
    const w = W[app.name];
    const ctx = app.contextPath;
    const facts = {};
    const errors = [];
    const u = (path) => app.url(`/index.php/${path}`);

    /** One named step: its failure is kept and the drive goes on. */
    const step = async (name, fn) => {
        try {
            await fn();
        } catch (error) {
            errors.push({step: name, error: String(error.message || error).split('\n').slice(0, 3).join(' | ')});
            console.error(`[sw1] ${app.name} ${name} FAILED: ${String(error.message || error).split('\n')[0]}`);
        }
    };
    const phase = async (name, fn) => {
        if (!PHASES.includes(name)) return;
        const started = Date.now();
        try {
            await fn();
        } catch (error) {
            errors.push({phase: name, error: String(error.stack || error).split('\n').slice(0, 4).join(' | ')});
            console.error(`[sw1] ${app.name} phase ${name} FAILED: ${String(error.message || error).split('\n')[0]}`);
        }
        record(`facts-${name}`, {...facts[name], errors});
        console.log(`[sw1] ${app.name} phase ${name}: ${Math.round((Date.now() - started) / 1000)} s, ${errors.length} step failures so far`);
    };

    // ================================================================================================
    // open: signed out, nothing stored
    // ================================================================================================
    await phase('open', async () => {
        const f = (facts.open = {});
        const {page, context, close} = await launch(app);
        const who = person(tag('u02sw1'), 'o'); // never registered: every submit of this phase is refused
        try {
            // --- Rule 1: the header's "Register" on the context's homepage
            await step('open.home', async () => {
                await page.goto(u(ctx));
                const s = await L.snap(page, 'open-01-home');
                f.home = {url: rel(s.url), header: await L.header(page)};
                await page.locator('#navigationUser').getByRole('link', {name: 'Register', exact: true}).click();
                await page.waitForURL(/user\/register/, {timeout: T});
                const r = await L.snap(page, 'open-02-register');
                await shot(page, 'open-02-register');
                f.register = {
                    url: rel(r.url),
                    title: r.title,
                    h1: flat(await page.locator('h1').first().innerText()),
                    requiredLine: await page.getByText('Required fields are marked with an asterisk: *').count(),
                    header: await L.header(page),
                    form: await L.formFacts(page, {countries: true}),
                    breadcrumb: flat(await page.locator('.cmp_breadcrumbs').first().innerText().catch(() => null)),
                };
                await loc(page, 'Register: the form', page.locator('form#register'));
                await loc(page, 'Register: the header entry', page.locator('#navigationUser').getByRole('link', {name: 'Register', exact: true}));
                await loc(page, 'Register: the privacy consent box', page.locator('form#register input[name="privacyConsent"]'));
                await loc(page, 'Register: the notification box', page.locator('form#register input[name="emailConsent"]'));
                await loc(page, 'Register: the reviewer offer boxes', page.locator('form#register #reviewerOptinGroup input[type="checkbox"]'));
                await loc(page, 'Register: "Reviewing interests" block', page.locator('form#register #reviewerInterests'));
                await loc(page, 'Register: the "Login" link beside the button', page.locator('form#register a.login'));
            });

            // --- the address typed with and without the language code (Rule 1)
            await step('open.addresses', async () => {
                f.addresses = {};
                for (const path of [`${ctx}/user/register`, `${ctx}/en/user/register`, 'index/user/register', 'index/en/user/register']) {
                    const res = await page.goto(u(path));
                    await idle(page);
                    f.addresses[path] = {status: res && res.status(), landed: rel(page.url()), h1: flat(await page.locator('h1').first().innerText().catch(() => null)), form: await page.locator('form#register').count(), contexts: await page.locator('form#register li.context').count()};
                }
            });

            // --- the reviewer offer and "Reviewing interests" (Fields, Rule 7)
            await step('open.reviewer', async () => {
                await page.goto(u(`${ctx}/en/user/register`));
                await idle(page);
                const boxes = page.locator('form#register #reviewerOptinGroup input[type="checkbox"]');
                f.reviewer = {boxes: await boxes.count(), group: flat(await page.locator('form#register #reviewerOptinGroup').innerText().catch(() => null)), before: (await L.formFacts(page)).reviewerInterests};
                if (await boxes.count()) {
                    await boxes.first().check();
                    await sleep(300);
                    f.reviewer.ticked = (await L.formFacts(page)).reviewerInterests;
                    f.reviewer.interestsBox = await page.locator('form#register #reviewerInterests input').evaluateAll((els) => els.map((e) => ({id: e.id, name: e.name, type: e.type, cls: e.className})));
                    f.reviewer.interestsWidget = await page.locator('form#register #reviewerInterests .tagit, form#register #reviewerInterests ul').count();
                    await L.snap(page, 'open-03-reviewer-ticked');
                    await boxes.first().uncheck();
                    await sleep(300);
                    f.reviewer.unticked = (await L.formFacts(page)).reviewerInterests;
                }
            });

            // --- an empty required box never reaches the site (Fields)
            await step('open.empty', async () => {
                await page.goto(u(`${ctx}/en/user/register`));
                await idle(page);
                f.empty = {all: await L.press(page)};
                // filled box by box: where the browser stops next
                const form = page.locator('form#register');
                const order = [];
                const fills = [
                    ['givenName', () => form.locator('input[name="givenName"]').fill('Sweep')],
                    ['affiliation', () => form.locator('input[name="affiliation"]').fill('PKP')],
                    ['country', () => form.locator('select[name="country"]').selectOption({label: 'Canada'})],
                    ['email', () => form.locator('input[name="email"]').fill(who.email)],
                    ['username', () => form.locator('input[name="username"]').fill(who.username)],
                    ['password', () => form.locator('input[name="password"]').fill(who.password)],
                ];
                for (const [name, doFill] of fills) {
                    await doFill();
                    const r = await L.press(page);
                    order.push({after: name, stopped: r.browserStopped, first: r.invalid && r.invalid[0], focused: r.focused});
                    if (r.posted) break;
                }
                f.empty.order = order;
                f.empty.urlAfter = rel(page.url());
                f.empty.errorsAfter = await L.errorsOf(page);
            });

            // --- the Email box: "abc" stopped by the browser, "a@b" passes browser and site
            await step('open.email', async () => {
                await page.goto(u(`${ctx}/en/user/register`));
                await idle(page);
                await L.fill(page, {...who, email: 'abc'}, {consent: false});
                f.email = {abc: await L.press(page)};
                await L.fill(page, {...who, email: 'a@b'}, {consent: false});
                f.email.ab = await L.press(page);
                f.email.abValues = await L.valuesOf(page);
                await L.snap(page, 'open-04-email-a-at-b-consent-unticked');
            });

            // --- Username: the format sentence, the taken line, both
            await step('open.username', async () => {
                f.username = {};
                for (const name of ['NewUser1', '-abc', 'abc-', 'ab_-cd', 'ab.cd', 'ab--cd', 'ab_cd-ef9', 'reader.rosa', 'Reader.Rosa', 'READER.ROSA']) {
                    await page.goto(u(`${ctx}/en/user/register`));
                    await idle(page);
                    // a valid name would register: the last, well-formed one is sent with the consent unticked
                    const wellFormed = /^[a-z0-9]+([-_][a-z0-9]+)*$/.test(name);
                    await L.fill(page, {...who, username: name}, {consent: !wellFormed});
                    const r = await L.press(page);
                    f.username[name] = {h1: r.h1, lines: r.errors && r.errors.lines, kept: (await L.valuesOf(page) || {}).username, passwords: [(await L.valuesOf(page) || {}).password, (await L.valuesOf(page) || {}).password2]};
                    if (name === 'NewUser1') await L.snap(page, 'open-05-username-capital');
                    if (name === 'Reader.Rosa') await L.snap(page, 'open-06-username-taken-capital');
                }
            });

            // --- Email taken, either case
            await step('open.emailTaken', async () => {
                f.emailTaken = {};
                for (const email of ['reader.rosa@mail.test', 'READER.ROSA@MAIL.TEST', 'Reader.Rosa@Mail.Test']) {
                    await page.goto(u(`${ctx}/en/user/register`));
                    await idle(page);
                    await L.fill(page, {...who, email});
                    const r = await L.press(page);
                    f.emailTaken[email] = {h1: r.h1, lines: r.errors && r.errors.lines, kept: (await L.valuesOf(page) || {}).email};
                }
            });

            // --- Password: too short, a different repeat, both; every fault at once (order of lines)
            await step('open.password', async () => {
                f.password = {};
                const cases = {
                    short: {who: {...who, password: 'abc'}, opts: {}},
                    five: {who: {...who, password: 'abcde'}, opts: {}},
                    mismatch: {who: {...who, password: 'abcdefgh', password2: 'abcdefgi'}, opts: {}},
                    shortAndMismatch: {who: {...who, password: 'abc', password2: 'abd'}, opts: {}},
                    s2first: {who: {username: 'Reader.Rosa', email: 'READER.ROSA@MAIL.TEST', password: 'abc', password2: 'abd'}, opts: {}},
                    everyFault: {who: {username: 'Reader.Rosa', email: 'READER.ROSA@MAIL.TEST', password: 'abc', password2: 'abd'}, opts: {consent: false}},
                    everyFaultBadName: {who: {username: 'Bad Name', email: 'READER.ROSA@MAIL.TEST', password: 'abc', password2: 'abc'}, opts: {consent: false}},
                };
                for (const [name, c] of Object.entries(cases)) {
                    await page.goto(u(`${ctx}/en/user/register`));
                    await idle(page);
                    await L.fill(page, c.who, c.opts);
                    const r = await L.press(page);
                    f.password[name] = {h1: r.h1, head: r.errors && r.errors.head, lines: r.errors && r.errors.lines, links: r.errors && r.errors.lineLinks, values: await L.valuesOf(page)};
                    if (name === 'everyFault') {
                        await L.snap(page, 'open-07-every-fault');
                        await shot(page, 'open-07-every-fault');
                    }
                    if (name === 's2first') {
                        // scenario 2's second step, on the same page: a new username and email, a short password twice
                        await L.fill(page, {...who, password: 'abc'}, {});
                        const r2 = await L.press(page);
                        f.password.s2second = {h1: r2.h1, lines: r2.errors && r2.errors.lines, values: await L.valuesOf(page)};
                    }
                }
            });

            // --- the typing caps
            await step('open.caps', async () => {
                await page.goto(u(`${ctx}/en/user/register`));
                await idle(page);
                const form = page.locator('form#register');
                const typed = {};
                for (const [name, n] of [['username', 34], ['password', 34], ['password2', 34], ['email', 95], ['givenName', 260], ['familyName', 260], ['affiliation', 300]]) {
                    const box = form.locator(`input[name="${name}"]`);
                    await box.click();
                    await page.keyboard.insertText('a'.repeat(n));
                    typed[name] = {typed: n, kept: await box.evaluate((e) => e.value.length), maxlength: await box.getAttribute('maxlength')};
                }
                f.caps = typed;
            });

            // --- the "privacy statement" link opens the statement's page in a new tab
            await step('open.privacyLink', async () => {
                await page.goto(u(`${ctx}/en/user/register`));
                await idle(page);
                const link = page.locator('form#register').getByRole('link', {name: 'privacy statement'});
                f.privacyLink = {count: await link.count()};
                if (await link.count()) {
                    f.privacyLink.href = rel(await link.getAttribute('href'));
                    f.privacyLink.target = await link.getAttribute('target');
                    const [tab] = await Promise.all([context.waitForEvent('page', {timeout: T}), link.click()]);
                    await tab.waitForLoadState('load');
                    f.privacyLink.tab = {url: rel(tab.url()), title: await tab.title(), h1: flat(await tab.locator('h1').first().innerText().catch(() => null)), pages: context.pages().length};
                    record('open-08-privacy-tab', {url: tab.url(), title: await tab.title(), text: flat(await tab.locator('.pkp_structure_main, main').first().innerText().catch(() => null), 1200)});
                    await tab.close();
                }
            });

            // --- the Login and lost-password pages' "Register" links (Rule 1), and the about page's
            await step('open.links', async () => {
                f.links = {};
                await page.goto(u(`${ctx}/en/login`));
                const s = await L.snap(page, 'open-09-login');
                f.links.login = {url: rel(s.url), header: await L.header(page), inForm: (await L.mainLinks(page)).filter((l) => /Register/i.test(l.text))};
                await page.locator('form#login').getByRole('link', {name: 'Register', exact: true}).click();
                await page.waitForURL(/user\/register/, {timeout: T});
                await idle(page);
                f.links.loginRegisterLands = {url: rel(page.url()), form: await page.locator('form#register').count(), source: (await L.valuesOf(page) || {}).source};
                await page.goto(u(`${ctx}/en/login/lostPassword`));
                const lp = await L.snap(page, 'open-10-lost-password');
                f.links.lost = {url: rel(lp.url), title: lp.title, h1: flat(await page.locator('h1').first().innerText().catch(() => null)), header: await L.header(page), inMain: (await L.mainLinks(page)).filter((l) => /Register/i.test(l.text))};
                const lostRegister = page.locator('.pkp_structure_main').getByRole('link', {name: 'Register', exact: true});
                if (await lostRegister.count()) {
                    await lostRegister.first().click();
                    await page.waitForURL(/user\/register/, {timeout: T});
                    f.links.lostRegisterLands = {url: rel(page.url()), form: await page.locator('form#register').count()};
                }
                await page.goto(u(`${ctx}/en/about/submissions`));
                const ab = await L.snap(page, 'open-11-about-submissions');
                f.links.about = {url: rel(ab.url), h1: flat(await page.locator('h1').first().innerText().catch(() => null)), links: (await L.mainLinks(page)).filter((l) => /register|login|log in/i.test(`${l.text} ${l.href}`))};
            });

            // --- the "Login" link beside the button (A5): what it carries
            await step('open.loginLink', async () => {
                await page.goto(u(`${ctx}/en/user/register`));
                await idle(page);
                const link = page.locator('form#register a.login');
                f.loginLink = {text: flat(await link.innerText().catch(() => null)), href: await link.getAttribute('href').catch(() => null)};
                await link.click();
                await page.waitForURL(/\/login/, {timeout: T});
                await idle(page);
                f.loginLink.lands = {url: rel(page.url()), source: await page.locator('form#login input[name="source"]').inputValue().catch(() => null)};
            });

            // --- the site-level page: the same form, its own sections (Fields "Site-level page only")
            await step('open.site', async () => {
                await page.goto(u('index'));
                const home = await L.snap(page, 'open-12-site-home');
                f.site = {home: {url: rel(home.url), title: home.title, header: await L.header(page)}};
                await page.locator('#navigationUser').getByRole('link', {name: 'Register', exact: true}).click();
                await page.waitForURL(/user\/register/, {timeout: T});
                const s = await L.snap(page, 'open-13-site-register');
                await shot(page, 'open-13-site-register');
                f.site.url = rel(s.url);
                f.site.title = s.title;
                f.site.h1 = flat(await page.locator('h1').first().innerText());
                f.site.requiredLine = await page.getByText('Required fields are marked with an asterisk: *').count();
                f.site.form = await L.formFacts(page, {names: [w.seeded]});
                await loc(page, 'site-level Register: a context block', page.locator('form#register li.context').first());
                await loc(page, 'site-level Register: the per-context consent line', page.locator('form#register li.context .context_privacy').first());
                await loc(page, 'site-level Register: the site consent box', page.locator('form#register input[name="privacyConsent[0]"]'));
                await loc(page, 'site-level Register: the notification box', page.locator('form#register input[name="emailConsent"]'));
                // the seeded context's consent line before and after a role is ticked, and after it is unticked
                const block = page.locator('form#register li.context').filter({has: page.locator('.name', {hasText: w.seeded})}).first();
                const reader = block.getByRole('checkbox', {name: 'Reader', exact: true});
                const line = async () => ((await L.formFacts(page, {names: [w.seeded]})).contexts.named[0] || {}).privacy;
                f.site.consentLine = {before: await line()};
                await reader.check();
                await sleep(300);
                f.site.consentLine.ticked = await line();
                await L.snap(page, 'open-14-site-register-reader-ticked');
                // a ticked role whose consent line is left unticked: one refusal line
                await L.fill(page, who, {});
                const r = await L.press(page);
                f.site.contextConsentMissing = {h1: r.h1, lines: r.errors && r.errors.lines, values: await L.valuesOf(page)};
                await L.snap(page, 'open-15-site-register-consent-missing');
                f.site.afterRefusal = ((await L.formFacts(page, {names: [w.seeded]})).contexts.named[0] || {});
                // two contexts short: still one line
                const others = page.locator('form#register li.context').filter({hasNot: page.locator('.name', {hasText: w.seeded})});
                const n = await others.count();
                let second = null;
                for (let i = 0; i < n && !second; i++) {
                    const b = others.nth(i);
                    if ((await b.locator('.context_privacy').count()) && (await b.getByRole('checkbox', {name: 'Reader', exact: true}).count())) second = b;
                }
                if (second) {
                    const seededReader = page.locator('form#register li.context').filter({has: page.locator('.name', {hasText: w.seeded})}).first().getByRole('checkbox', {name: 'Reader', exact: true});
                    await seededReader.check();
                    await second.getByRole('checkbox', {name: 'Reader', exact: true}).check();
                    await L.passwords(page, who);
                    const r2 = await L.press(page);
                    f.site.twoContextsShort = {second: flat(await second.locator('.name').innerText().catch(() => null)), h1: r2.h1, lines: r2.errors && r2.errors.lines};
                } else {
                    f.site.twoContextsShort = {second: null, note: 'no second open context with a statement on the site'};
                }
                // untick again: the line goes
                await page.goto(u('index/en/user/register'));
                await idle(page);
                const block2 = page.locator('form#register li.context').filter({has: page.locator('.name', {hasText: w.seeded})}).first();
                await block2.getByRole('checkbox', {name: 'Reader', exact: true}).check();
                await sleep(200);
                await block2.getByRole('checkbox', {name: 'Reader', exact: true}).uncheck();
                await sleep(300);
                f.site.consentLine.unticked = await line();
            });

            // --- the form left with something typed and not sent: no question on the way out
            await step('open.leave', async () => {
                const asked = [];
                const onDialog = (d) => {
                    asked.push({type: d.type(), message: d.message()});
                    d.accept().catch(() => {});
                };
                page.on('dialog', onDialog);
                await page.goto(u(`${ctx}/en/user/register`));
                await idle(page);
                await L.fill(page, who, {});
                await page.locator('form#register input[name="givenName"]').blur();
                await page.locator('#navigationUser').getByRole('link', {name: 'Login', exact: true}).click();
                await page.waitForURL(/\/login/, {timeout: T});
                await sleep(500);
                await page.goBack();
                await idle(page);
                f.leave = {asked, landed: rel(page.url()), afterBack: await L.valuesOf(page)};
                page.off('dialog', onDialog);
            });

            // --- the site's own Login and lost-password pages (the links are U01's; their state is read)
            await step('open.siteLinks', async () => {
                await page.goto(u('index/en/login'));
                await idle(page);
                f.siteLinks = {login: {header: await L.header(page), inMain: (await L.mainLinks(page)).filter((l) => /Register/i.test(l.text))}};
                await page.goto(u('index/en/login/lostPassword'));
                await idle(page);
                f.siteLinks.lost = {header: await L.header(page), inMain: (await L.mainLinks(page)).filter((l) => /Register/i.test(l.text))};
            });
        } finally {
            await close();
        }
    });

    await require('./phases.js')({app, w, ctx, facts, errors, u, step, phase, person, T});
    record('errors', errors);
});
