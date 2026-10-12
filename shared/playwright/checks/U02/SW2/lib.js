// Helpers of sw2.js (U02 drift sweep, chunk SW2). Requiring this file runs nothing.
// Every helper drives the screens a visitor or a role uses and returns what the screen shows as data.
// Page objects are required inside the functions, after forEachApp has set the app's environment.
const fs = require('fs');
const path = require('path');
const {screen, record, idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per-app words of the Register pages and the settings screens. */
const W = {
    ojs: {
        noun: 'journal',
        seeded: 'Journal of Public Knowledge',
        reviewer: 'Reviewer',
        second: null,
        closeChoice: 'The Journal Manager will register all user accounts. Editors or Section Editors may register user accounts for reviewers.',
    },
    omp: {
        noun: 'press',
        seeded: 'Public Knowledge Press',
        reviewer: 'External Reviewer',
        second: 'Internal Reviewer',
        closeChoice: 'The Press Manager will register all user accounts. Editors or Section Editors may register user accounts for reviewers.',
    },
    ops: {
        noun: 'server',
        seeded: 'Public Knowledge Preprint Server',
        reviewer: null,
        second: null,
        closeChoice: 'The Server Manager will register all user accounts.',
    },
};

/** screen() recorded under `name`, with any extra facts beside it. */
async function snap(page, name, extra = {}) {
    let s;
    try {
        s = await screen(page);
    } catch (error) {
        // a page without scripts (the JavaScript-off browser) or one the server answered empty
        s = {url: page.url(), title: await page.title().catch(() => null), text: {main: await page.locator('body').innerText({timeout: 3000}).catch(() => null)}, screenError: flat(error.message, 200)};
    }
    record(name, {...s, ...extra});
    return s;
}

/** The reader-side user navigation: its links, in order. */
async function header(page) {
    return page
        .locator('#navigationUser a')
        .evaluateAll((as) => as.map((a) => (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean))
        .catch(() => []);
}

/**
 * A reader-side page as a person reads it: status, address, tab title, every h1 and h2 (an empty
 * one included), the breadcrumb, the body text, the links and buttons of the page body (outside the
 * header, breadcrumb, sidebar and footer), and the header's links.
 */
async function pageFacts(page, response = null) {
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    const dom = await page
        .evaluate(() => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const main = document.querySelector('.pkp_structure_main') || document.querySelector('main') || document.body;
            const body = main.querySelector('.page') || main;
            const crumbs = document.querySelector('.cmp_breadcrumbs');
            return {
                h1: [...document.querySelectorAll('h1')].map((h) => t(h.innerText)),
                h2: [...main.querySelectorAll('h2')].map((h) => t(h.innerText)).slice(0, 12),
                breadcrumb: crumbs ? t(crumbs.innerText) : null,
                crumbCurrent: crumbs ? t((crumbs.querySelector('.current') || {}).innerText) : null,
                text: t(body.innerText).slice(0, 900),
                links: [...body.querySelectorAll('a')].filter((a) => !a.closest('.cmp_breadcrumbs')).map((a) => ({text: t(a.innerText), href: a.getAttribute('href')})),
                crumbLinks: crumbs ? [...crumbs.querySelectorAll('a')].map((a) => t(a.innerText)) : [],
                buttons: [...body.querySelectorAll('button, input[type="submit"]')].map((b) => t(b.innerText || b.value)),
                themeHeader: !!document.querySelector('.pkp_structure_head, #headerNavigationContainer'),
                bodyChars: (document.body.innerText || '').trim().length,
                htmlChars: document.documentElement.outerHTML.length,
                loginForm: !!document.querySelector('form#login'),
                registerForm: !!document.querySelector('form#register'),
                formError: t((document.querySelector('form#login .pkp_form_error, .pkp_form_error, .cmp_notification') || {}).innerText) || null,
            };
        })
        .catch((e) => ({domError: flat(e.message, 200)}));
    return {
        status: response && response.status ? response.status() : undefined,
        url: rel(page.url()),
        title: await page.title().catch(() => null),
        ...dom,
        links: (dom.links || []).map((l) => ({text: l.text, href: rel(l.href)})),
        header: await header(page),
    };
}

/**
 * The Register form as data: every control outside the context blocks with its label, state and
 * place, the legends, the links, the site-level interests block, and the context blocks named in
 * `names` in full with a tally of the rest.
 */
async function formFacts(page, {names = []} = {}) {
    return page.evaluate(
        ({names}) => {
            const form = document.querySelector('form#register');
            if (!form) return null;
            const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const box = (el) => el.getBoundingClientRect();
            const vis = (el) => {
                const r = box(el);
                let p = el;
                while (p && p !== document.body) {
                    const pcs = getComputedStyle(p);
                    if (pcs.display === 'none' || pcs.visibility === 'hidden') return false;
                    p = p.parentElement;
                }
                return r.width > 0 && r.height > 0 && r.left > -1000;
            };
            const labelOf = (el) => {
                const l = el.closest('label') || (el.id && form.querySelector(`label[for="${CSS.escape(el.id)}"]`));
                return l ? flat(l.innerText) : null;
            };
            const control = (el) => ({
                tag: el.tagName.toLowerCase(),
                type: el.type || null,
                name: el.name || null,
                id: el.id || null,
                label: labelOf(el),
                required: !!el.required,
                checked: el.type === 'checkbox' || el.type === 'radio' ? el.checked : undefined,
                value: el.type === 'password' || el.name === 'csrfToken' ? `(${(el.value || '').length} chars)` : el.tagName === 'BUTTON' ? flat(el.innerText) : el.tagName === 'SELECT' ? el.value : el.value,
                visible: vis(el),
            });
            const inContext = (el) => !!el.closest('li.context');
            const blocks = [...form.querySelectorAll('li.context')].map((li) => {
                const p = li.querySelector('.context_privacy');
                const roles = [...li.querySelectorAll('input[type="checkbox"]')].filter((i) => !i.closest('.context_privacy'));
                const legend = li.querySelector('legend');
                return {
                    name: flat((li.querySelector('.name') || {}).innerText),
                    legend: legend ? flat(legend.innerText) : null,
                    legendVisible: legend ? vis(legend) : null,
                    // how the legend is drawn: a 1px clipped box is text for screen readers only
                    legendBox: legend ? {w: Math.round(box(legend).width), h: Math.round(box(legend).height), position: getComputedStyle(legend).position, clip: getComputedStyle(legend).clip} : null,
                    roles: roles.map((i) => ({label: labelOf(i), name: i.name, checked: i.checked, visible: vis(i)})),
                    privacy: p
                        ? {
                              text: flat(p.innerText),
                              cls: p.className,
                              left: Math.round(box(p).left),
                              onScreen: vis(p),
                              checked: (p.querySelector('input') || {}).checked,
                              box: (p.querySelector('input') || {}).name,
                              link: (p.querySelector('a') || {getAttribute: () => null}).getAttribute('href'),
                          }
                        : null,
                };
            });
            const nc = form.querySelector('.reviewer_nocontext_interests');
            const site = form.querySelector('input[name="privacyConsent[0]"]');
            return {
                action: form.getAttribute('action'),
                controls: [...form.querySelectorAll('input, select, textarea, button')].filter((el) => !inContext(el) && el.type !== 'hidden').map(control),
                legends: [...form.querySelectorAll('legend')].filter((el) => !inContext(el)).map((l) => ({text: flat(l.innerText), visible: vis(l)})),
                links: [...form.querySelectorAll('a')].filter((el) => !inContext(el)).map((a) => ({text: flat(a.innerText), href: a.getAttribute('href'), target: a.getAttribute('target')})),
                contextReviewerBlock: (() => {
                    const el = form.querySelector('#reviewerOptinGroup, fieldset.reviewer');
                    return el ? {visible: vis(el), text: flat(el.innerText).slice(0, 200)} : null;
                })(),
                contextInterests: (() => {
                    const el = form.querySelector('#reviewerInterests');
                    return el ? {visible: vis(el), text: flat(el.innerText)} : null;
                })(),
                siteInterests: nc ? {visible: vis(nc), prompt: flat(nc.innerText), box: !!nc.querySelector('input[name="interests"]'), value: (nc.querySelector('input[name="interests"]') || {}).value} : null,
                siteConsent: site ? {label: labelOf(site), checked: site.checked, visible: vis(site), link: ((site.closest('label') || form).querySelector('a') || {getAttribute: () => null}).getAttribute('href')} : null,
                altcha: !!document.querySelector('altcha-widget'),
                contexts: {
                    count: blocks.length,
                    named: blocks.filter((b) => names.some((n) => b.name === n)),
                    missing: names.filter((n) => !blocks.some((b) => b.name === n)),
                    consentOnScreen: blocks.filter((b) => b.privacy && b.privacy.onScreen).length,
                    consentOffScreen: blocks.filter((b) => b.privacy && !b.privacy.onScreen).length,
                    consentNone: blocks.filter((b) => !b.privacy).length,
                    consentTicked: blocks.filter((b) => b.privacy && b.privacy.checked).length,
                    rolesTicked: blocks.reduce((n, b) => n + b.roles.filter((r) => r.checked).length, 0),
                    tally: blocks.reduce((acc, b) => {
                        const key = `${b.roles.map((r) => r.label).join(' + ') || '(no role box)'} | privacy ${b.privacy ? (b.privacy.onScreen ? 'on screen' : 'off screen') : 'none'}`;
                        acc[key] = (acc[key] || 0) + 1;
                        return acc;
                    }, {}),
                },
            };
        },
        {names}
    );
}

/** A context's block of the site-level page, by the context's name. */
function block(page, name) {
    return page.locator('form#register li.context').filter({has: page.locator('.name', {hasText: new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)})});
}

/** A role box of a block by its label. */
function roleBox(blk, label) {
    return blk.getByRole('checkbox', {name: label, exact: true});
}

/** The refusal list above the form: its opening line and every line under it. */
async function errorsOf(page) {
    return page
        .evaluate(() => {
            const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const el = document.querySelector('#formErrors');
            if (!el) return {present: false, lines: []};
            const head = el.querySelector('.pkp_form_error');
            return {present: true, head: head ? flat(head.innerText) : null, lines: [...el.querySelectorAll('li')].map((li) => flat(li.innerText))};
        })
        .catch(() => null);
}

/** What the form's boxes hold now (password boxes as lengths). */
async function valuesOf(page) {
    return page
        .evaluate(() => {
            const form = document.querySelector('form#register');
            if (!form) return null;
            const v = (n) => {
                const el = form.querySelector(`[name="${n}"]`);
                if (!el) return undefined;
                if (el.type === 'checkbox') return el.checked;
                if (el.type === 'password') return `(${el.value.length} chars)`;
                return el.value;
            };
            return Object.fromEntries(['givenName', 'familyName', 'affiliation', 'country', 'email', 'username', 'password', 'password2', 'privacyConsent', 'emailConsent', 'interests'].map((n) => [n, v(n)]));
        })
        .catch(() => null);
}

/**
 * Fill the "Profile" and "Login" sections as a newcomer would. `who` = {username, email, password,
 * given?, family?}; `consent` ticks the context-level privacy box when it is there.
 */
async function fill(page, who, {consent = true} = {}) {
    const form = page.locator('form#register');
    await form.locator('input[name="givenName"]').fill(who.given || 'Sweep');
    await form.locator('input[name="familyName"]').fill(who.family || 'Visitor');
    await form.locator('input[name="affiliation"]').fill('PKP');
    await form.locator('select[name="country"]').selectOption({label: 'Canada'});
    await form.locator('input[name="email"]').fill(who.email);
    await form.locator('input[name="username"]').fill(who.username);
    await form.locator('input[name="password"]').fill(who.password);
    await form.locator('input[name="password2"]').fill(who.password);
    const box = form.locator('input[name="privacyConsent"]');
    if (await box.count()) await box.setChecked(!!consent);
}

/**
 * Press "Register" and wait for the answer. With the ALTCHA check on the page (`spamCheck`, the
 * default when its widget is there) the widget's script must be live first: it verifies as the
 * button is pressed and posts the form itself. Resolves with the POST's status, where the browser
 * is, the title, the h1 and the refusal list.
 */
async function press(page, {spamCheck = true} = {}) {
    const form = page.locator('form#register');
    if (spamCheck && (await page.locator('altcha-widget').count())) {
        await page.waitForFunction(() => !!customElements.get('altcha-widget'), undefined, {timeout: T});
    }
    const answer = page.waitForResponse((r) => r.request().method() === 'POST' && /user\/register/.test(r.url()), {timeout: 60_000}).catch((e) => ({error: String(e.message).split('\n')[0]}));
    await form.locator('button.submit').click();
    const response = await answer;
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    return {
        status: response && response.status ? response.status() : response,
        url: rel(page.url()),
        title: await page.title().catch(() => null),
        h1: flat(await page.locator('h1').first().innerText({timeout: 3000}).catch(() => null), 120),
        errors: await errorsOf(page),
    };
}

/** The "Registration complete" page as data. */
async function completeFacts(page) {
    return {
        url: rel(page.url()),
        title: await page.title(),
        h1: flat(await page.locator('h1').first().innerText({timeout: 3000}).catch(() => null), 120),
        thanks: await page.getByText('Thanks for registering! What would you like to do next?').count(),
        form: await page.locator('form#register').count(),
        links: await page
            .locator('ul.registration_complete_actions a')
            .evaluateAll((as) => as.map((a) => ({text: (a.innerText || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})))
            .then((ls) => ls.map((l) => ({text: l.text, href: rel(l.href)})))
            .catch(() => []),
        header: await header(page),
    };
}

/** Open the profile of a context (null: stay on the profile already open) on its "Roles" tab. */
async function openRoles(page, app, contextPath) {
    if (contextPath !== null) await page.goto(app.url(`/index.php/${contextPath}/en/user/profile`));
    await page.locator('#profileTabs').waitFor({timeout: T});
    await idle(page);
    await page.locator('#profileTabs').getByRole('tab', {name: 'Roles', exact: true}).click();
    await page.locator('form#rolesForm').waitFor({state: 'visible', timeout: T});
    await idle(page);
}

/** The Roles tab as data: the blocks named in `names`, every ticked box, the interests field. */
async function rolesFacts(page, names = []) {
    return page.evaluate((names) => {
        const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const form = document.querySelector('form#rolesForm');
        if (!form) return null;
        const vis = (el) => {
            let p = el;
            while (p && p !== document.body) {
                const cs = getComputedStyle(p);
                if (cs.display === 'none' || cs.visibility === 'hidden') return false;
                p = p.parentElement;
            }
            return true;
        };
        const sections = [...form.querySelectorAll('.section')].map((s) => {
            const boxes = [...s.querySelectorAll('input[type="checkbox"]')].map((i) => ({label: flat((i.closest('label') || i.closest('li') || {}).innerText), checked: i.checked, visible: vis(i)}));
            return {title: flat((s.querySelector('label, legend, .label') || {}).innerText).slice(0, 80), boxes, hasInterests: !!s.querySelector('#interests'), text: flat(s.innerText).slice(0, 200)};
        });
        const interests = form.querySelector('#interests');
        return {
            url: location.pathname + location.hash,
            tabs: [...document.querySelectorAll('#profileTabs > ul > li')].map((li) => flat(li.innerText)),
            activeTab: flat((document.querySelector('#profileTabs > ul > li.ui-tabs-active') || {}).innerText),
            sectionCount: sections.length,
            named: sections.filter((s) => names.some((n) => s.title === n || s.text.startsWith(n))).map((s) => ({title: s.title, boxes: s.boxes})),
            ticked: sections.filter((s) => s.boxes.some((b) => b.checked)).map((s) => ({title: s.title, ticked: s.boxes.filter((b) => b.checked).map((b) => b.label)})),
            boxCount: form.querySelectorAll('input[type="checkbox"]').length,
            checkedCount: form.querySelectorAll('input[type="checkbox"]:checked').length,
            fold: [...form.querySelectorAll('a, button')].map((e) => flat(e.innerText)).filter((t) => /Register with other/i.test(t)),
            interestsPresent: !!interests,
            interestsLabel: flat((form.querySelector('label[for="interests"]') || {}).innerText) || null,
            chips: [...form.querySelectorAll('#interests .tagit-label')].map((c) => flat(c.innerText)),
            mentionsInterests: /Reviewing interests/i.test(form.innerText),
            buttons: [...form.querySelectorAll('button, input[type="submit"]')].filter(vis).map((b) => flat(b.innerText || b.value)),
            headText: flat(form.innerText).slice(0, 240),
        };
    }, names);
}

/**
 * A Login page of `origin` (the context's, or the site's with `contextPath` 'index'): type the
 * username and password, press "Login" (with the spam check's script live when its widget is
 * there), and report where the browser is and what the page says.
 */
async function loginTry(page, origin, contextPath, who) {
    await page.goto(`${origin}/index.php/${contextPath}/login`);
    const form = page.locator('form#login');
    await form.waitFor({state: 'visible', timeout: T});
    await page.locator('input#username').fill(who.username);
    await page.locator('input#password').fill(who.password);
    if (await page.locator('altcha-widget').count()) {
        await page.waitForFunction(() => !!customElements.get('altcha-widget'), undefined, {timeout: T});
    }
    const answer = page.waitForResponse((r) => r.request().method() === 'POST' && /login\/signIn/.test(r.url()), {timeout: 60_000}).catch(() => null);
    await form.locator('button[type="submit"]').click();
    const response = await answer;
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForURL((u) => !/\/login\/signIn/.test(u.pathname), {timeout: 10_000}).catch(() => {});
    await idle(page).catch(() => {});
    const onLogin = (await page.locator('form#login').count()) > 0;
    return {
        postStatus: response ? response.status() : null,
        signedIn: !onLogin,
        url: rel(page.url()),
        title: await page.title().catch(() => null),
        h1: flat(await page.locator('h1').first().innerText({timeout: 3000}).catch(() => null), 120),
        message: onLogin ? flat(await page.locator('form#login .pkp_form_error, .pkp_form_error, .cmp_notification').first().innerText({timeout: 2000}).catch(() => null), 700) : null,
        header: await header(page),
    };
}

/**
 * Every message to `to` since `since`: how many, and for the newest "Validate Your Account" one its
 * subject, sender, text, and the activation link as mailed and as followed (`origin` in place of the
 * mailed link's own, which the fleet's variant config can point at another port).
 */
async function validationMail(app, to, since, origin, {timeoutMs = 30_000} = {}) {
    let m;
    try {
        m = await app.mail.find({to, since, subject: 'Validate Your Account', timeoutMs});
    } catch (error) {
        return {found: false, count: await app.mail.count({to, since}).catch(() => null), error: flat(error.message, 160)};
    }
    const full = await app.mail.fullMessage(m.ID);
    const text = full.Text || '';
    const html = full.HTML || '';
    const hrefs = [...html.matchAll(/href=(["'])([^"']+)\1/g)].map((x) => x[2].replace(/&amp;/g, '&'));
    const mailed = hrefs.find((h) => /invitation\/accept/.test(h)) || (text.match(/https?:\/\/\S+invitation\/accept\S+/) || [])[0] || null;
    return {
        found: true,
        count: await app.mail.count({to, since}),
        subject: m.Subject,
        from: m.From && `${m.From.Name} <${m.From.Address}>`,
        to: (m.To || []).map((t) => t.Address),
        text: flat(text, 1200),
        linkAsMailed: mailed,
        linkOrigin: mailed ? (mailed.match(/^https?:\/\/[^/]+/) || [])[0] : null,
        link: mailed ? `${origin}${rel(mailed)}` : null,
        links: hrefs.map((h) => rel(h)).slice(0, 8),
    };
}

/**
 * Settings › Users & Roles › "Users" of `contextPath`, as a signed-in manager: search the user, open
 * the row's menu, choose "Edit", press "View more details", and read the page for "Reviewing
 * interests" and the given words.
 */
async function managerEditRead(page, contextPath, search, words = []) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    const list = new UsersListPage(page, contextPath);
    await list.goto();
    await list.search(search);
    await idle(page).catch(() => {});
    const row = list.row(search);
    const rows = await row.count();
    if (!rows) return {rows};
    const rowText = flat(await row.first().innerText(), 300);
    await list.chooseAction(row.first(), 'Edit');
    await page.waitForURL(/settings\/user\/\d+/, {timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await page.getByText(search).first().waitFor({timeout: T}).catch(() => {});
    const more = page.getByRole('button', {name: 'View more details'});
    const moreShown = (await more.count()) > 0;
    if (moreShown) {
        await more.first().click();
        await idle(page).catch(() => {});
        await sleep(500);
    }
    const text = await page.locator('main').first().innerText().catch(() => '');
    const at = text.search(/Reviewing interests/i);
    return {
        rows,
        row: rowText,
        landed: rel(page.url()),
        moreDetails: moreShown,
        mentionsInterests: at >= 0,
        aroundInterests: at >= 0 ? flat(text.slice(at, at + 160), 160) : null,
        words: Object.fromEntries(words.map((w) => [w, (text.match(new RegExp(w, 'g')) || []).length])),
    };
}

/**
 * Settings › Users & Roles › "Users" of `contextPath`, as a signed-in manager: the row holding
 * `email`, its menu's labels, "Enable User", the "Enable {name}" window's text, "OK".
 */
async function enableUser(page, contextPath, {search, email, fullName}, onWindow = async () => {}) {
    const {UsersListPage, DisableUserWindow} = require('../../../pages/UsersManagementPages.js');
    const list = new UsersListPage(page, contextPath);
    await list.goto();
    await list.search(search);
    await idle(page).catch(() => {});
    const row = list.row(email).first();
    await row.waitFor({state: 'visible', timeout: T});
    const rowText = flat(await row.innerText(), 300);
    const labels = await list.menuLabels(row);
    await list.chooseAction(row, 'Enable User');
    const win = new DisableUserWindow(page, `Enable ${fullName}`);
    await win.expectForm();
    const text = flat(await win.dialog.innerText(), 700);
    const reason = await win.reason.inputValue().catch(() => null);
    await onWindow();
    await win.ok();
    await idle(page).catch(() => {});
    const after = flat(await list.row(email).first().innerText().catch(() => null), 300);
    const labelsAfter = await list.menuLabels(list.row(email).first()).catch(() => null);
    return {row: rowText, labels, window: text, reasonBox: reason, rowAfter: after, labelsAfter};
}

/** The error, exception and 5xx lines the validation-variant server logged since `from` bytes. */
function variantLog(app) {
    const file = path.join(app.suiteDir, '.server-logs', `server-${app.validationPort}-validation.log`);
    const mark = () => (fs.existsSync(file) ? fs.statSync(file).size : 0);
    const since = (from = 0) =>
        fs.existsSync(file)
            ? fs
                  .readFileSync(file)
                  .subarray(from)
                  .toString('utf8')
                  .split('\n')
                  .filter((l) => l && /error|exception|fatal|warning|\[5\d\d\]/i.test(l))
                  .map((l) => flat(l, 400))
            : [];
    return {file, mark, since};
}

/** The keys this spec names, as a configuration file holds them. */
function configKeys(file) {
    if (!fs.existsSync(file)) return {missing: file};
    const text = fs.readFileSync(file, 'utf8');
    const out = {};
    for (const key of ['require_validation', 'validation_timeout', 'user_validation_period', 'expiration_days', 'sitewide_privacy_statement', 'altcha', 'altcha_on_register', 'altcha_on_login', 'altcha_on_lost_password', 'recaptcha', 'captcha_on_register', 'captcha_on_login', 'base_url']) {
        const m = text.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm'));
        out[key] = m ? m[1].trim() : null;
    }
    return out;
}

module.exports = {T, flat, rel, sleep, W, snap, header, pageFacts, formFacts, block, roleBox, errorsOf, valuesOf, fill, press, completeFacts, openRoles, rolesFacts, loginTry, validationMail, managerEditRead, enableUser, variantLog, configKeys};
