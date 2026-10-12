// Helpers of sw1.js (U02 drift sweep, chunk SW1). Requiring this file runs nothing.
// Every helper drives the screens a visitor or a role uses and returns what the screen shows as data.
const {screen, record, idle} = require('../../../probe');

const flat = (s, n = 500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per-app words the Register pages use. */
const W = {
    ojs: {noun: 'journal', seeded: 'Journal of Public Knowledge', reviewer: 'Reviewer', second: null, levelManager: 'Journal Manager'},
    omp: {noun: 'press', seeded: 'Public Knowledge Press', reviewer: 'External Reviewer', second: 'Internal Reviewer', levelManager: 'Press Manager'},
    ops: {noun: 'server', seeded: 'Public Knowledge Preprint Server', reviewer: null, second: null, levelManager: 'Server Manager'},
};

/** One account per permission level, per app (users.md, seed-facts "Users"). */
const ROSTER = {
    ojs: ['admin', 'manager.maya', 'editor.diana', 'sectioneditor.ana', 'reviewer.julia', 'copyeditor.carla', 'layouteditor.leo', 'proofreader.pia', 'assistant.rita', 'author.alex', 'reader.rosa'],
    omp: ['admin', 'manager.maya', 'editor.diana', 'sectioneditor.ana', 'reviewer.julia', 'reviewer.amara', 'copyeditor.carla', 'layouteditor.leo', 'proofreader.pia', 'assistant.rita', 'author.alex', 'reader.rosa'],
    ops: ['admin', 'manager.maya', 'sectioneditor.ana', 'assistant.rita', 'author.alex', 'reader.rosa'],
};

/** screen() recorded under `name`, with any extra facts beside it. */
async function snap(page, name, extra = {}) {
    const s = await screen(page);
    record(name, {...s, ...extra});
    return s;
}

/** The reader-side user navigation: its links, in order. */
async function header(page) {
    return page
        .locator('#navigationUser a')
        .evaluateAll((as) => as.map((a) => ({text: (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})))
        .catch(() => []);
}

/** Headings of the page, in order. */
async function headings(page) {
    return (await page.locator('h1, h2').allInnerTexts().catch(() => [])).map((t) => flat(t, 120)).filter(Boolean);
}

/** The links of the main region: text, address, target. */
async function mainLinks(page, scope = '.pkp_structure_main, main') {
    return page
        .locator(scope)
        .first()
        .locator('a')
        .evaluateAll((as) => as.map((a) => ({text: (a.innerText || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'), target: a.getAttribute('target'), cls: a.className})))
        .catch(() => []);
}

/**
 * The Register form as data: every control with its label, required mark, cap and state, the legends,
 * the links, the country list's shape, and (site-level) the context blocks named in `names` in full
 * with a tally of the rest.
 */
async function formFacts(page, {names = [], countries = false} = {}) {
    return page.evaluate(
        ({names, countries}) => {
            const form = document.querySelector('form#register');
            if (!form) return null;
            const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const box = (el) => el.getBoundingClientRect();
            const vis = (el) => {
                const r = box(el);
                const cs = getComputedStyle(el);
                let p = el;
                while (p && p !== document.body) {
                    const pcs = getComputedStyle(p);
                    if (pcs.display === 'none' || pcs.visibility === 'hidden') return false;
                    p = p.parentElement;
                }
                return cs.display !== 'none' && r.width > 0 && r.height > 0 && r.left > -1000;
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
                maxlength: el.maxLength > 0 ? el.maxLength : null,
                checked: el.type === 'checkbox' || el.type === 'radio' ? el.checked : undefined,
                value: el.type === 'password' || el.name === 'csrfToken' ? `(${(el.value || '').length} chars)` : el.tagName === 'BUTTON' ? flat(el.innerText) : el.value,
                visible: vis(el),
                left: Math.round(box(el).left),
            });
            const inContext = (el) => !!el.closest('li.context');
            const out = {
                action: form.getAttribute('action'),
                method: form.getAttribute('method'),
                controls: [...form.querySelectorAll('input, select, textarea, button')].filter((el) => !inContext(el)).map(control),
                legends: [...form.querySelectorAll('legend')].filter((el) => !inContext(el)).map((l) => ({text: flat(l.innerText), visible: vis(l), cls: l.className})),
                links: [...form.querySelectorAll('a')].filter((el) => !inContext(el)).map((a) => ({text: flat(a.innerText), href: a.getAttribute('href'), target: a.getAttribute('target'), cls: a.className})),
                fieldsets: [...form.querySelectorAll('fieldset')].filter((el) => !inContext(el)).map((f) => ({cls: f.className, id: f.id || null, legend: flat((f.querySelector(':scope > legend') || {}).innerText), visible: vis(f)})),
                reviewerInterests: (() => {
                    const el = form.querySelector('#reviewerInterests');
                    return el ? {visible: vis(el), text: flat(el.innerText)} : null;
                })(),
                noContextInterests: (() => {
                    const el = form.querySelector('.reviewer_nocontext_interests');
                    return el ? {visible: vis(el), text: flat(el.innerText)} : null;
                })(),
                orcidText: /ORCID/i.test(document.body.innerText),
                altcha: (() => {
                    const el = document.querySelector('altcha-widget');
                    if (!el) return null;
                    const inner = el.querySelector('.altcha');
                    return {state: inner ? inner.getAttribute('data-state') : null, display: inner ? getComputedStyle(inner).display : null, text: flat(el.innerText), field: !!form.querySelector('input[name="altcha"]')};
                })(),
                recaptcha: !!document.querySelector('.g-recaptcha'),
            };
            const country = form.querySelector('select[name="country"]');
            if (country) {
                const opts = [...country.options].map((o) => o.text);
                const at = (n) => opts.indexOf(n);
                out.country = {
                    count: opts.length,
                    first: opts[0],
                    firstValue: country.options[0].value,
                    selected: country.selectedIndex,
                    second: opts[1],
                    last: opts[opts.length - 1],
                    beforeLast: opts[opts.length - 2],
                    czechia: at('Czechia'),
                    coteDIvoire: opts.findIndex((o) => /^C.te d.Ivoire$/.test(o)),
                    zimbabwe: at('Zimbabwe'),
                    aland: opts.findIndex((o) => /land Islands$/.test(o)),
                    // every place where the plain A–Z order (accents ignored) breaks
                    breaks: opts.slice(1).reduce((acc, name, i, arr) => {
                        const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
                        if (i > 0 && plain(arr[i - 1]).localeCompare(plain(name), 'en') > 0) acc.push(`${arr[i - 1]} / ${name}`);
                        return acc;
                    }, []),
                };
                if (countries) out.country.all = opts;
            }
            const blocks = [...form.querySelectorAll('li.context')].map((li) => {
                const p = li.querySelector('.context_privacy');
                const roles = [...li.querySelectorAll('input[type="checkbox"]')].filter((i) => !i.closest('.context_privacy'));
                const legend = li.querySelector('legend');
                return {
                    name: flat((li.querySelector('.name') || {}).innerText),
                    legend: legend ? flat(legend.innerText) : null,
                    legendVisible: legend ? vis(legend) : null,
                    roles: roles.map((i) => ({label: labelOf(i), name: i.name, value: i.value, checked: i.checked, visible: vis(i)})),
                    privacy: p ? {text: flat(p.innerText), cls: p.className, left: Math.round(box(p).left), onScreen: vis(p), checked: (p.querySelector('input') || {}).checked, box: (p.querySelector('input') || {}).name} : null,
                };
            });
            const contextsLegend = form.querySelector('#contextOptinGroup legend, fieldset.contexts > legend, .contexts legend');
            out.contexts = {
                legend: contextsLegend ? flat(contextsLegend.innerText) : null,
                count: blocks.length,
                named: blocks.filter((b) => names.some((n) => b.name === n || b.name.includes(n))),
                tally: blocks.reduce((acc, b) => {
                    const key = `${b.roles.map((r) => r.label).join(' + ') || '(no role box)'} | privacy ${b.privacy ? (b.privacy.onScreen ? 'on screen' : 'off screen') : 'none'}`;
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {}),
            };
            return out;
        },
        {names, countries}
    );
}

/** The refusal list above the form: its opening line and every line under it. */
async function errorsOf(page) {
    return page.evaluate(() => {
        const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const el = document.querySelector('#formErrors');
        if (!el) return {present: false, lines: []};
        const head = el.querySelector('.pkp_form_error');
        return {
            present: true,
            head: head ? flat(head.innerText) : null,
            lines: [...el.querySelectorAll('li')].map((li) => flat(li.innerText)),
            lineLinks: [...el.querySelectorAll('li a')].map((a) => a.getAttribute('href')),
        };
    });
}

/** What the form's boxes hold now (password boxes as lengths). */
async function valuesOf(page) {
    return page.evaluate(() => {
        const form = document.querySelector('form#register');
        if (!form) return null;
        const v = (n) => {
            const el = form.querySelector(`[name="${n}"]`);
            if (!el) return undefined;
            if (el.type === 'checkbox') return el.checked;
            if (el.type === 'password') return `(${el.value.length} chars)`;
            return el.value;
        };
        return Object.fromEntries(['givenName', 'familyName', 'affiliation', 'country', 'email', 'username', 'password', 'password2', 'privacyConsent', 'emailConsent', 'interests', 'source'].map((n) => [n, v(n)]));
    });
}

/**
 * Fill the "Profile" and "Login" sections as a newcomer would. `who` = {username, email, password,
 * password2?}; `profile` overrides the name, affiliation and country; `consent` ticks the journal-level
 * privacy box when it is there; `emailConsent` ticks the notification box.
 */
async function fill(page, who, {profile = {}, consent = true, emailConsent = false} = {}) {
    const form = page.locator('form#register');
    const p = {givenName: 'Sweep', familyName: 'Visitor', affiliation: 'PKP', country: 'Canada', ...profile};
    if (p.givenName !== null) await form.locator('input[name="givenName"]').fill(p.givenName);
    if (p.familyName !== null) await form.locator('input[name="familyName"]').fill(p.familyName);
    if (p.affiliation !== null) await form.locator('input[name="affiliation"]').fill(p.affiliation);
    if (p.country !== null) await form.locator('select[name="country"]').selectOption({label: p.country});
    if (who.email !== undefined) await form.locator('input[name="email"]').fill(who.email);
    if (who.username !== undefined) await form.locator('input[name="username"]').fill(who.username);
    await passwords(page, who);
    const box = form.locator('input[name="privacyConsent"]');
    if (await box.count()) await box.setChecked(!!consent);
    const mail = form.locator('input[name="emailConsent"]');
    if (await mail.count()) await mail.setChecked(!!emailConsent);
}

async function passwords(page, who) {
    const form = page.locator('form#register');
    await form.locator('input[name="password"]').fill(who.password);
    await form.locator('input[name="password2"]').fill(who.password2 === undefined ? who.password : who.password2);
}

/**
 * Press "Register". Resolves with {posted, status, url, title, h1, errors}: `posted` false when the
 * browser kept the form (a required box empty), with the first box it stopped at and its prompt.
 */
async function press(page, {wait = true} = {}) {
    const form = page.locator('form#register');
    const invalid = await form.evaluate((f) => {
        const bad = [...f.elements].filter((e) => e.willValidate && !e.validity.valid);
        return bad.map((e) => ({name: e.name, message: e.validationMessage}));
    });
    if (invalid.length) {
        let sent = 0;
        const onRequest = (r) => {
            if (r.method() === 'POST' && /user\/register/.test(r.url())) sent++;
        };
        page.on('request', onRequest);
        await form.locator('button.submit').click();
        await sleep(600);
        page.off('request', onRequest);
        const focused = await page.evaluate(() => (document.activeElement ? document.activeElement.getAttribute('name') : null));
        return {posted: sent > 0, browserStopped: sent === 0, invalid, focused, url: rel(page.url())};
    }
    const answer = wait ? page.waitForResponse((r) => r.request().method() === 'POST' && /user\/register/.test(r.url()), {timeout: 60_000}).catch((e) => ({error: String(e.message).split('\n')[0]})) : null;
    await form.locator('button.submit').click();
    const response = answer ? await answer : null;
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    return {
        posted: true,
        status: response && response.status ? response.status() : response,
        url: rel(page.url()),
        title: await page.title(),
        h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120),
        errors: await errorsOf(page).catch(() => null),
    };
}

/** The "Registration complete" page's links, in order, with their addresses. */
async function completeLinks(page) {
    return page
        .locator('ul.registration_complete_actions a')
        .evaluateAll((as) => as.map((a) => ({text: (a.innerText || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})))
        .catch(() => []);
}

/** The completion page as data. */
async function completeFacts(page) {
    return {
        url: rel(page.url()),
        title: await page.title(),
        h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120),
        thanks: await page.getByText('Thanks for registering! What would you like to do next?').count(),
        form: await page.locator('form#register').count(),
        links: (await completeLinks(page)).map((l) => ({text: l.text, href: rel(l.href)})),
        header: (await header(page)).map((l) => l.text),
    };
}

/** Open the profile of a context and one of its tabs; resolves with the tab's form locator. */
async function profileTab(page, app, contextPath, tabName, formSelector, {locale = 'en'} = {}) {
    if (contextPath !== null) {
        await page.goto(app.url(`/index.php/${contextPath}/${locale}/user/profile`));
    }
    await page.locator('#profileTabs').waitFor({timeout: 30_000});
    await idle(page);
    await page.locator('#profileTabs').getByRole('tab', {name: tabName, exact: true}).click();
    await page.locator(formSelector).waitFor({state: 'visible', timeout: 30_000});
    await idle(page);
    return page.locator(formSelector);
}

/** The Roles tab as data: each block's boxes, the interests, the fold's words. */
async function rolesFacts(page) {
    return page.evaluate(() => {
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
            const boxes = [...s.querySelectorAll('input[type="checkbox"]')].map((i) => ({label: flat((i.closest('label') || {}).innerText), checked: i.checked, visible: vis(i)}));
            return {title: flat((s.querySelector('label, legend, .label') || {}).innerText).slice(0, 80), boxes, hasInterests: !!s.querySelector('#interests')};
        });
        return {
            tabs: [...document.querySelectorAll('#profileTabs > ul > li')].map((li) => flat(li.innerText)),
            activeTab: flat((document.querySelector('#profileTabs > ul > li.ui-tabs-active') || {}).innerText),
            first: sections[0] || null,
            ticked: sections.filter((s) => s.boxes.some((b) => b.checked)).map((s) => ({title: s.title, ticked: s.boxes.filter((b) => b.checked).map((b) => b.label)})),
            sectionCount: sections.length,
            boxCount: form.querySelectorAll('input[type="checkbox"]').length,
            checkedCount: form.querySelectorAll('input[type="checkbox"]:checked').length,
            firstBlockText: flat((sections[0] ? form.querySelector('.section') : form).innerText).slice(0, 300),
            fold: [...form.querySelectorAll('a, button, legend, summary')].map((e) => flat(e.innerText)).filter((t) => /Register with other/i.test(t)),
            chips: [...form.querySelectorAll('#interests .tagit-label')].map((c) => flat(c.innerText)),
            interestsLabel: flat((form.querySelector('label[for="interests"]') || {}).innerText) || null,
            interestsPresent: !!form.querySelector('#interests'),
            headText: flat(form.innerText).slice(0, 200),
        };
    });
}

/** The Notifications tab as data: every box with its id and state, grouped under its heading. */
async function notificationFacts(page) {
    return page.evaluate(() => {
        const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const form = document.querySelector('form#notificationSettingsForm');
        if (!form) return null;
        const groupOf = (el) => {
            const fs = el.closest('fieldset, .section');
            let node = fs;
            while (node) {
                const t = node.querySelector(':scope > legend, :scope > h3, :scope > h4, :scope > label');
                if (t) return flat(t.innerText).slice(0, 60);
                node = node.parentElement && node.parentElement.closest('fieldset, .section');
            }
            return null;
        };
        const boxes = [...form.querySelectorAll('input[type="checkbox"]')].map((i) => ({id: i.id, label: flat((i.closest('label') || form.querySelector(`label[for="${i.id}"]`) || {}).innerText).slice(0, 80), checked: i.checked, group: groupOf(i)}));
        return {
            boxes,
            emailTicked: boxes.filter((b) => /^email/.test(b.id) && b.checked).map((b) => b.id),
            allowUnticked: boxes.filter((b) => !/^email/.test(b.id) && !b.checked).map((b) => b.id),
            text: flat(form.innerText).slice(0, 2500),
        };
    });
}

module.exports = {flat, rel, sleep, W, ROSTER, snap, header, headings, mainLinks, formFacts, errorsOf, valuesOf, fill, passwords, press, completeLinks, completeFacts, profileTab, rolesFacts, notificationFacts};
