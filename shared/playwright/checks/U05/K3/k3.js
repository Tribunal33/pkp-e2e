// U05 claim check, chunk K3: the Notifications tab's rows per app, the
// site-level tab, registration, the settings entries (docs/process/briefs/claim-check.md).
// Seeds its own scratch contexts, signs in from the roster rule, records
// every screen with screen(). Run:
//   PROBE_FEATURE=U05 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U05/K3/k3.js
// PHASES=setup,seeded,site,register,roles,stats,templates,multi,ann,hosted narrows a
// re-run; scratch.json in the output folder carries the contexts between runs.
//
// Phases (each guarded; results in k3-summary-<app>.json):
//  seeded   manager.maya on publicknowledge: the tab's sentence, groups, rows, boxes (Fields 78–104, scenario 7 first half, OPS1/OPS2)
//  site     admin: the site's home page, "View Profile", the site-level tab (scenario 7 second half, Rule 5d as cited by A4, F24)
//  register two visitors on the scratch Register page, box unticked / ticked, then their tabs (scenario 8, Rule 5e pointers 396–397, 448–450, F3)
//  roles    Author, Reader, assistant on the scratch tab (line 90–91); the Reader's Tasks window after the site announcement (A4); the Author's window after a seeded decision (408–410)
//  stats    M1: Settings › Workflow › Emails, the statistics radios at both ends and the tab after each (Settings 366–376)
//  templates M1 on the email templates page: the New Announcement template body has no footer (411–412)
//  multi    a Manager of two scratch journals: the site-level tab saves its own set, each journal its own (A4 661–662, row 72 "per journal")
//  ann      admin: a site announcement with "Send an email…" ticked; the mailboxes (A4 663–666)
//  hosted   OJS only: admin creates a journal on Administration › Hosted Journals; its Register page signed out (F3's by-hand premise)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir, outFile} =
    require('../../../probe');

const SCRATCH_FILE = outFile(`k3-scratch-${process.env.PROBE_APPS}.json`);
const scratchAll = fs.existsSync(SCRATCH_FILE) ? JSON.parse(fs.readFileSync(SCRATCH_FILE, 'utf8')) : {};
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : null;
const on = (p) => !PHASES || PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // sampling only

// ------------------------------------------------------------ helpers
async function safeScreen(page) {
    try { return await screen(page); } catch (e) { return {url: page.url(), screenError: String(e.message).split('\n')[0]}; }
}
async function snap(page, name) {
    const data = await safeScreen(page);
    record(name, data);
    await shot(page, name).catch(() => {});
    return data;
}
function sumFile(app) { return outFile(`k3-summary-${app.name}.json`); }
function loadSummary(app) { return fs.existsSync(sumFile(app)) ? JSON.parse(fs.readFileSync(sumFile(app), 'utf8')) : {app: app.name}; }
function saveSummary(app, s) { fs.writeFileSync(sumFile(app), JSON.stringify(s, null, 2)); }
function saveScratch() { fs.writeFileSync(SCRATCH_FILE, JSON.stringify(scratchAll, null, 2)); }
// The kit's signOut waits for the redirect; a session the server has already ended hangs it, so fall back to clearing cookies.
async function safeSignOut(page) {
    try { await signOut(page); return 'signed out'; } catch (e) { await page.context().clearCookies(); return `clearCookies (${String(e.message).split('\n')[0]})`; }
}
async function guarded(s, key, fn) {
    const out = {};
    try { const r = await fn(out); s[key] = r || out; } catch (e) { out.error = String(e.message).split('\n')[0]; s[key] = out; console.log(`[k3] ${key}: ${out.error}`); }
}
// Scratch passwords: the roster rule (username twice) can exceed 32 characters with a long tag; the Register page's box may cap it.
const regPassword = (username) => `${username}${username}`.slice(0, 32);

// The tab as data: groups (h4) and rows (sentence, the two boxes and their state).
async function readTab(page) {
    const form = page.locator('form#notificationSettingsForm');
    await form.waitFor({timeout: 15000});
    return form.evaluate((f) => {
        const order = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
        const boxes = [...f.querySelectorAll('input[type=checkbox]')];
        const sections = [...new Set(boxes.map((b) => b.closest('.section')))].filter(Boolean);
        const items = [...f.querySelectorAll('h4'), ...sections].sort(order);
        const rows = [];
        const groups = [];
        let group = null;
        for (const el of items) {
            if (el.tagName === 'H4') { group = el.innerText.trim(); groups.push(group); continue; }
            const labelEl = el.querySelector(':scope > ul > label:not([for]), :scope > .label, :scope > label:not([for])');
            const inputs = [...el.querySelectorAll('input[type=checkbox]')];
            const lab = (i) => (i ? (f.querySelector(`label[for="${i.id}"]`) || i.closest('label') || {}).innerText || null : null);
            rows.push({
                group, sentence: labelEl ? labelEl.innerText.trim() : null,
                enableId: inputs[0] && inputs[0].id, enable: inputs[0] && inputs[0].checked, enableLabel: lab(inputs[0]) && lab(inputs[0]).trim(),
                emailId: inputs[1] && inputs[1].id, email: inputs[1] && inputs[1].checked, emailDisabled: inputs[1] && inputs[1].disabled, emailLabel: lab(inputs[1]) && lab(inputs[1]).trim(),
            });
        }
        // the sentence above the first group heading: the form's text up to that heading
        const full = f.innerText.replace(/\s+/g, ' ').trim();
        const intro = groups[0] ? full.slice(0, full.indexOf(groups[0])).trim() : null;
        const tabs = [...document.querySelectorAll('[role=tab]')].map((t) => ({text: t.innerText.trim(), selected: t.getAttribute('aria-selected')}));
        const buttons = [...f.querySelectorAll('button, input[type=submit]')].map((b) => b.innerText || b.value);
        return {intro, groups, rows, tabs, buttons, formText: f.innerText.replace(/\s+/g, ' ').trim().slice(0, 3000)};
    });
}
async function openTab(page, app, ctx, name) {
    await page.goto(app.url(`/index.php/${ctx}/user/profile/notificationSettings`));
    await idle(page);
    const tab = await readTab(page);
    const shotData = await snap(page, name);
    return {url: page.url(), title: await page.title(), tab, screenUrl: shotData.url};
}
async function saveTab(page) {
    const form = page.locator('form#notificationSettingsForm');
    const saved = page.waitForResponse((r) => r.url().includes('save-notification-settings'), {timeout: 30000}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const resp = await saved;
    await page.locator('.pkpNotification').first().waitFor({timeout: 10000}).catch(() => {});
    const toast = await page.locator('.pkpNotification').allInnerTexts().catch(() => []);
    return {status: resp ? resp.status() : null, toast};
}
async function userNav(page) {
    return page.evaluate(() => {
        const wrap = document.querySelector('#navigationUserWrapper');
        return {
            text: wrap ? wrap.innerText.replace(/\s+/g, ' ').trim() : null,
            counts: [...document.querySelectorAll('.task_count')].map((e) => ({text: e.innerText.trim(), visible: e.getClientRects().length > 0})),
            links: wrap ? [...wrap.querySelectorAll('a')].map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'), visible: a.getClientRects().length > 0})) : [],
        };
    });
}
// The site's own home page: what it lists (journals) and the signed-in menu.
async function siteHome(page, app, name) {
    await page.goto(app.url('/index.php/index'));
    await idle(page).catch(() => {});
    const data = await snap(page, name);
    const listed = await page.evaluate(() => {
        const main = document.querySelector('main, .pkp_structure_main, #main, body');
        const links = [...document.querySelectorAll('a')].filter((a) => /\/index\.php\/[^/]+\/?(en)?$|\/index\.php\/[^/]+\/en\/?$|\/index\.php\/(?!index)[^/]+\/?$/.test(a.getAttribute('href') || '') && !/index\/|\/user\/|\/login/.test(a.getAttribute('href') || ''));
        return {
            journalLinks: [...new Set(links.map((a) => a.getAttribute('href')))],
            headings: [...document.querySelectorAll('h1,h2,h3')].map((h) => h.innerText.trim()).filter(Boolean).slice(0, 30),
            mainText: main ? main.innerText.replace(/\s+/g, ' ').trim().slice(0, 1500) : null,
        };
    });
    return {url: page.url(), title: await page.title(), nav: await userNav(page), listed, screenUrl: data.url};
}
// Press "View Profile" the way a person does: open the name's dropdown, then the entry; fall back to its href.
async function pressViewProfile(page) {
    const out = {};
    const toggle = page.locator('#navigationUserWrapper > a, #navigationUserWrapper button, #navigationUserWrapper > span').first();
    if (await toggle.count()) { await toggle.hover().catch(() => {}); await toggle.click().catch(() => {}); }
    const link = page.locator('#navigationUserWrapper').getByRole('link', {name: 'View Profile', exact: true});
    out.entryVisibleAfterPress = await link.waitFor({state: 'visible', timeout: 3000}).then(() => true).catch(() => false);
    out.toggleExpanded = await toggle.getAttribute('aria-expanded').catch(() => null);
    if (out.entryVisibleAfterPress) { await link.click(); out.how = 'clicked'; } else {
        const href = await page.locator('#navigationUserWrapper a').filter({hasText: 'View Profile'}).first().getAttribute('href').catch(() => null);
        out.href = href; out.how = href ? 'goto href (entry hidden)' : 'no entry';
        if (href) await page.goto(href);
    }
    await idle(page).catch(() => {});
    out.landed = page.url(); out.title = await page.title();
    return out;
}
function bell(page) { return page.getByRole('button', {name: /^Tasks/}); }
async function tasksWindow(page, name) {
    const b = bell(page);
    const out = {bellPresent: (await b.count()) > 0};
    if (!out.bellPresent) return out;
    out.bellText = (await b.first().innerText()).replace(/\s+/g, ' ').trim();
    await b.first().click();
    const d = page.locator('[role="dialog"]:visible').last();
    await d.waitFor({state: 'visible', timeout: 15000});
    await d.locator('.pkp_controllers_grid, table').first().waitFor({state: 'visible', timeout: 15000}).catch(() => {});
    await idle(page).catch(() => {});
    out.rows = await d.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => ({
        unread: !!tr.querySelector('div.task.unread'), sentence: (tr.querySelector('span.message') || {}).innerText || null,
        title: (tr.querySelector('span.submission') || {}).innerText || null, text: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 300),
    })));
    out.text = (await d.innerText().catch(() => '')).replace(/\n+/g, ' / ').slice(0, 800);
    await snap(page, name);
    await page.keyboard.press('Escape').catch(() => {});
    return out;
}

// ------------------------------------------------------------ register
async function registerBoxes(page) {
    return page.evaluate(() => [...document.querySelectorAll('form input[type=checkbox]')].map((i) => ({
        name: i.name, checked: i.checked, required: i.required,
        label: (i.closest('label') || document.querySelector(`label[for="${i.id}"]`) || {}).innerText ? ((i.closest('label') || document.querySelector(`label[for="${i.id}"]`)).innerText.replace(/\s+/g, ' ').trim().slice(0, 200)) : null,
    })));
}
async function registerVisitor(page, app, ctx, username, {given, family, emailConsent, name}) {
    const out = {username, emailConsent};
    await page.goto(app.url(`/index.php/${ctx}/user/register`));
    await idle(page).catch(() => {});
    out.registerPage = {url: page.url(), title: await page.title(), boxesBefore: await registerBoxes(page)};
    await snap(page, `${name}-register-${app.name}`);
    await page.locator('#givenName').fill(given);
    await page.locator('#familyName').fill(family);
    await page.locator('#affiliation').fill('Check University');
    await page.locator('#country').selectOption('CZ');
    await page.locator('#email').fill(`${username}@mail.test`);
    await page.locator('#username').fill(username);
    out.passwordMaxlength = await page.locator('#password').getAttribute('maxlength');
    await page.locator('#password').fill(regPassword(username));
    await page.locator('#password2').fill(regPassword(username));
    const privacy = page.locator('input[name="privacyConsent"]');
    if (await privacy.count()) await privacy.check();
    const consent = page.locator('input[name="emailConsent"]');
    await loc(page, 'Register page: the "Yes, I would like to be notified…" box', consent);
    if (emailConsent) await consent.check(); else await consent.uncheck();
    out.boxesAtSubmit = await registerBoxes(page);
    const t0 = Date.now();
    const btn = page.getByRole('button', {name: 'Register', exact: true}).last();
    await btn.click();
    await page.waitForLoadState('domcontentloaded');
    await idle(page).catch(() => {});
    out.after = {url: page.url(), title: await page.title(), nav: await userNav(page)};
    await snap(page, `${name}-after-register-${app.name}`);
    out.mail = await app.mail.find({to: `${username}@mail.test`, timeoutMs: 4000})
        .then((m) => ({found: true, subject: m.Subject, msAfter: Date.now() - t0}))
        .catch((e) => ({found: false, error: String(e.message).split('\n')[0]}));
    return out;
}

// ------------------------------------------------------------ settings › workflow › emails
async function emailsTab(page, app, ctx) {
    await page.goto(app.url(`/index.php/${ctx}/management/settings/workflow`));
    await idle(page);
    await page.getByRole('tab', {name: 'Emails', exact: true}).first().click();
    const radio = page.locator('input[name="editorialStatsEmail"]');
    await radio.first().waitFor({timeout: 30000});
    const form = page.locator('form').filter({has: page.locator('input[name="editorialStatsEmail"]')}).first();
    return {form, radio};
}
async function statsFieldData(page) {
    return page.evaluate(() => {
        const first = document.querySelector('input[name="editorialStatsEmail"]');
        const field = first ? first.closest('.pkpFormField, fieldset, .pkpFormGroup') : null;
        const group = first ? first.closest('.pkpFormGroup') : null;
        return {
            fieldText: field ? field.innerText.replace(/\s+/g, ' ').trim() : null,
            groupHeading: group ? ((group.querySelector('h1,h2,h3,h4,legend,.pkpFormGroup__heading') || {}).innerText || null) : null,
            groupDescription: group ? ((group.querySelector('.pkpFormGroup__description') || {}).innerText || null) : null,
            options: [...document.querySelectorAll('input[name="editorialStatsEmail"]')].map((r) => ({value: r.value, checked: r.checked, label: ((r.closest('label') || document.querySelector(`label[for="${r.id}"]`) || {}).innerText || '').trim()})),
        };
    });
}
async function setStats(page, app, ctx, labelRegex, name) {
    const {form, radio} = await emailsTab(page, app, ctx);
    const before = await statsFieldData(page);
    record(`${name}-before-${app.name}`, {...(await safeScreen(page)), field: before});
    await loc(page, 'Settings › Workflow › Emails: the editorial statistics radios', radio);
    const target = page.locator('label').filter({hasText: labelRegex}).filter({has: page.locator('input[name="editorialStatsEmail"]')}).first();
    await target.click();
    const saved = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && /^(PUT|POST)$/.test(r.request().method()), {timeout: 30000}).catch(() => null);
    const saveBtn = form.getByRole('button', {name: 'Save', exact: true}).first();
    await saveBtn.click();
    const resp = await saved;
    await page.locator('.pkpNotification, .pkpFormPage__status').first().waitFor({timeout: 10000}).catch(() => {});
    const after = await statsFieldData(page);
    const statusTexts = await page.locator('.pkpNotification, .pkpFormPage__status').allInnerTexts().catch(() => []);
    await snap(page, `${name}-after-${app.name}`);
    return {before, after, saveStatus: resp ? resp.status() : null, statusTexts, url: page.url()};
}
// The email templates page ("Email Templates" on the Emails tab): is a footer or "unsubscribe" text offered anywhere?
async function templatesLook(page, app, ctx, name) {
    await page.goto(app.url(`/index.php/${ctx}/management/settings/workflow`));
    await idle(page);
    await page.getByRole('tab', {name: 'Emails', exact: true}).first().click();
    await page.locator('input[name="editorialStatsEmail"]').first().waitFor({timeout: 30000});
    const out = {};
    const go = page.getByRole('link', {name: /Templates/}).or(page.getByRole('button', {name: /Templates/})).first();
    out.templatesControl = (await go.count()) ? {text: await go.innerText(), href: await go.getAttribute('href').catch(() => null)} : null;
    if (await go.count()) await go.click(); else await page.goto(app.url(`/index.php/${ctx}/management/settings/manageEmails`));
    await page.locator('.listPanel__item').first().waitFor({timeout: 30000});
    await idle(page).catch(() => {});
    out.url = page.url();
    out.firstItems = await page.locator('.listPanel__item').evaluateAll((els) => els.slice(0, 40).map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 120)));
    const search = page.getByRole('searchbox').first();
    out.searchPresent = (await search.count()) > 0;
    if (out.searchPresent) { await search.fill('Announcement'); await idle(page).catch(() => {}); await page.locator('.listPanel__item').first().waitFor({timeout: 10000}).catch(() => {}); }
    await snap(page, `${name}-list-${app.name}`);
    const pageText = await page.locator('main, body').first().innerText().catch(() => '');
    out.pageMentionsUnsubscribe = /unsubscribe/i.test(pageText);
    const item = page.locator('.listPanel__item').filter({hasText: /New Announcement/i}).first();
    out.itemText = (await item.count()) ? await item.innerText().catch(() => null) : null;
    const editBtn = item.getByRole('button', {name: /Edit|Expand|Manage/}).first();
    out.editPresent = (await editBtn.count()) > 0;
    if (out.editPresent) {
        await editBtn.click();
        const dlg = page.locator('[role="dialog"]:visible').last();
        await dlg.waitFor({timeout: 15000}).catch(() => {});
        await dlg.locator('iframe, textarea, input').first().waitFor({timeout: 15000}).catch(() => {});
        out.dialogTitle = await dlg.locator('h1,h2,h3').first().innerText().catch(() => null);
        const dText = await dlg.innerText().catch(() => '');
        out.dialogMentionsUnsubscribe = /unsubscribe/i.test(dText);
        // the template body may be one editor per template in the dialog, or the dialog lists templates to expand first
        const expand = dlg.getByRole('button', {name: /Edit/}).first();
        if (!(await dlg.locator('iframe').count()) && (await expand.count())) { await expand.click().catch(() => {}); await dlg.locator('iframe').first().waitFor({timeout: 10000}).catch(() => {}); }
        const frames = dlg.locator('iframe');
        out.frames = await frames.count();
        out.bodyMentionsUnsubscribe = null;
        out.bodies = [];
        for (let i = 0; i < out.frames; i++) {
            const t = await frames.nth(i).contentFrame().locator('body').innerText().catch(() => '');
            out.bodies.push(t.replace(/\s+/g, ' ').slice(0, 400));
            if (/unsubscribe/i.test(t)) out.bodyMentionsUnsubscribe = true; else if (out.bodyMentionsUnsubscribe === null) out.bodyMentionsUnsubscribe = false;
        }
        out.dialogFields = await dlg.locator('label, .pkpFormFieldLabel, h2, h3').allInnerTexts().catch(() => []);
        await snap(page, name);
        await page.keyboard.press('Escape').catch(() => {});
    } else {
        await snap(page, name);
    }
    return out;
}

// ------------------------------------------------------------ site announcement (admin)
async function siteAnnouncement(page, app, title, name) {
    const out = {};
    await page.goto(app.url('/index.php/index/admin/settings'));
    await idle(page);
    const annTab = page.getByRole('tab', {name: 'Announcements', exact: true}).first();
    out.tabPresent = (await annTab.count()) > 0;
    if (!out.tabPresent) { await snap(page, `${name}-no-tab-${app.name}`); return out; }
    await annTab.click();
    await idle(page).catch(() => {});
    // sub-tab "Settings": the switch
    const settingsSub = page.getByRole('tab', {name: 'Settings', exact: true}).last();
    if (await settingsSub.count()) await settingsSub.click().catch(() => {});
    const sw = page.getByRole('checkbox', {name: 'Enable announcements'}).first();
    out.switchPresent = (await sw.count()) > 0;
    if (out.switchPresent) {
        out.switchWas = await sw.isChecked();
        if (!out.switchWas) {
            await sw.check();
            const saved = page.waitForResponse((r) => /\/index\/api\/v1\/site/.test(r.url()) && /^(PUT|POST)$/.test(r.request().method()), {timeout: 30000}).catch(() => null);
            await sw.locator('xpath=ancestor::form[1]').getByRole('button', {name: 'Save', exact: true}).click();
            out.switchSave = (await saved) ? (await saved).status() : null;
            await page.reload(); await idle(page);
            await page.getByRole('tab', {name: 'Announcements', exact: true}).first().click();
        }
    }
    const listSub = page.getByRole('tab', {name: 'Announcements', exact: true}).last();
    await listSub.click().catch(() => {});
    const add = page.getByRole('button', {name: 'Add Announcement', exact: true}).first();
    await add.waitFor({timeout: 15000});
    await snap(page, `${name}-list-${app.name}`);
    await add.click();
    const emailBox = page.getByRole('checkbox', {name: 'Send an email about this to all registered users.'}).first();
    await emailBox.waitFor({timeout: 30000});
    const form = emailBox.locator('xpath=ancestor::form[1]');
    const titleInput = form.locator('input[name^="title"], input[id^="title"]').first();
    await titleInput.waitFor({timeout: 15000});
    await titleInput.fill(title);
    const frames = form.locator('iframe');
    if ((await frames.count()) > 0) { const body = form.frameLocator('iframe').first().locator('body'); await body.click(); await body.fill(`Short description ${title}`); }
    out.emailBoxDefault = await emailBox.isChecked();
    await emailBox.check();
    await snap(page, `${name}-form-${app.name}`);
    const saved = page.waitForResponse((r) => /\/api\/v1\/announcements/.test(r.url()) && r.request().method() === 'POST', {timeout: 30000}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const resp = await saved;
    out.save = resp ? {status: resp.status(), url: resp.url()} : null;
    try { await form.waitFor({state: 'hidden', timeout: 15000}); out.formClosed = true; } catch { out.formClosed = false; out.errors = await form.locator('.pkpFormField__error, .pkpFormPage__errors').allInnerTexts().catch(() => null); }
    await idle(page).catch(() => {});
    await snap(page, `${name}-saved-${app.name}`);
    return out;
}

// ------------------------------------------------------------ hosted journal (OJS)
async function createHostedJournal(page, app, t, name) {
    const out = {};
    await page.goto(app.url('/index.php/index/admin/contexts'));
    await idle(page);
    const create = page.getByRole('link', {name: /^Create (Journal|Press|Server)$/}).first();
    out.createLabel = await create.innerText().catch(() => null);
    await create.click();
    const nameInput = page.locator('#context-name-control-en, input[id^="context-name-control"]').first();
    await nameInput.waitFor({state: 'visible', timeout: 15000});
    await nameInput.fill(`Hosted ${t}`);
    await page.locator('#context-acronym-control-en, input[id^="context-acronym-control"]').first().fill(`H${t.slice(-4)}`);
    await page.locator('#context-urlPath-control').fill(`${t}h`);
    const dlg = page.getByRole('dialog', {name: /Create (Journal|Press|Server)/}).first();
    await dlg.getByRole('textbox', {name: /Principal Contact Name/}).fill('Check Contact');
    await dlg.getByRole('textbox', {name: /Principal Contact Email/}).fill(`${t}h-contact@mail.test`);
    const english = dlg.getByRole('checkbox', {name: 'English', exact: true}).first();
    if ((await english.count()) && !(await english.isChecked())) await english.check();
    const primary = dlg.getByRole('radio', {name: 'English', exact: true}).first();
    if ((await primary.count()) && !(await primary.isChecked())) await primary.check();
    out.formFields = await dlg.locator('label, legend').allInnerTexts().catch(() => []);
    await snap(page, `${name}-form-${app.name}`);
    const saved = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() === 'POST', {timeout: 60000}).catch(() => null);
    await dlg.getByRole('button', {name: 'Save', exact: true}).click();
    const resp = await saved;
    out.save = resp ? {status: resp.status()} : null;
    try { await dlg.waitFor({state: 'hidden', timeout: 60000}); out.formClosed = true; } catch { out.formClosed = false; out.errors = await dlg.locator('.pkpFormField__error, .pkpFormPage__errors, [class*="error"]').allInnerTexts().catch(() => null); out.dialogText = (await dlg.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1500); }
    await idle(page).catch(() => {});
    out.landed = page.url();
    await snap(page, `${name}-after-${app.name}`);
    out.path = `${t}h`;
    return out;
}

// ------------------------------------------------------------ main
forEachApp(async (app) => {
    const s = loadSummary(app);
    let scratch = scratchAll[app.name];
    const assistantRole = app.name === 'ops' ? 'editorialBoardMember' : 'copyeditor';

    if (on('setup') && !scratch) {
        const t = tag('u05k3');
        const U = {m1: `${t}m1`, mu: `${t}mu`, au: `${t}au`, rd: `${t}rd`, as: `${t}as`, r1: `${t}r1`, r2: `${t}r2`};
        const ctx = await app.api.createContext({tag: t, context: {acronym: `K3${t.slice(-3).toUpperCase()}`}, users: [
            {username: U.m1, roles: ['manager'], givenName: 'Mira', familyName: 'ManagerOne'},
            {username: U.mu, roles: ['manager'], givenName: 'Multi', familyName: 'Manager'},
            {username: U.au, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            {username: U.rd, roles: ['reader'], givenName: 'Rita', familyName: 'Reader'},
            {username: U.as, roles: [assistantRole], givenName: 'Asa', familyName: 'Assistant'},
        ]});
        const ctx2 = await app.api.createContext({tag: `${t}b`, context: {acronym: `K3B${t.slice(-2).toUpperCase()}`}, users: [{username: U.mu, roles: ['manager']}]});
        scratch = {tag: t, path: ctx.path || t, path2: ctx2.path || `${t}b`, users: U, contextId: ctx.contextId, contextId2: ctx2.contextId};
        // 408–410: a decision task for the Author (OJS, OMP; OPS has no review stage)
        if (app.name !== 'ops') {
            try {
                const sub = await app.api.createSubmission({tag: `${t}dec`, context: t, submitter: U.au, title: `Decision ${t}`, decisions: ['sendExternalReview', 'requestRevisions']});
                scratch.decisionSubmission = {id: sub.submissionId || sub.id, raw: sub};
            } catch (e) { scratch.decisionSubmission = {error: String(e.message).slice(0, 600)}; }
        }
        scratchAll[app.name] = scratch; saveScratch();
    }
    const t = scratch.tag; const U = scratch.users; const ctx = scratch.path; const ctx2 = scratch.path2;
    s.scratch = scratch;

    // ---- seeded: manager.maya's tab on publicknowledge (read-only)
    if (on('seeded')) await guarded(s, 'seeded', async (out) => {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'manager.maya');
            // reach the tab as the preamble says: "Edit Profile" under the name, then the "Notifications" tab
            await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial`)); await idle(page);
            const menuBtn = page.locator('header').getByRole('button', {name: /manager\.maya/}).first();
            out.menuButtonPresent = (await menuBtn.count()) > 0;
            if (out.menuButtonPresent) {
                await menuBtn.click();
                const edit = page.locator('header').getByRole('link', {name: 'Edit Profile'}).or(page.locator('header').getByRole('menuitem', {name: 'Edit Profile'})).first();
                out.editProfilePresent = await edit.waitFor({state: 'visible', timeout: 10000}).then(() => true).catch(() => false);
                out.menuEntries = await page.evaluate(() => [...document.querySelectorAll('header a, header button, header [role="menuitem"]')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
                if (out.editProfilePresent) { await edit.click(); await idle(page); }
            }
            out.profileUrl = page.url();
            const tabBtn = page.getByRole('tab', {name: 'Notifications', exact: true});
            out.tabControlPresent = await tabBtn.first().waitFor({timeout: 10000}).then(() => true).catch(() => false);
            if (out.tabControlPresent) { await tabBtn.first().click(); await page.locator('form#notificationSettingsForm').waitFor({timeout: 15000}); }
            await loc(page, 'Profile: the "Notifications" tab control', tabBtn);
            await snap(page, `seeded-tab-maya-${app.name}`);
            out.viaMenu = {url: page.url(), tab: out.tabControlPresent ? await readTab(page) : null};
            // the direct address, as the footnotes give it
            out.direct = await openTab(page, app, app.contextPath, `seeded-tab-maya-direct-${app.name}`);
            await loc(page, 'Notifications tab: group headings', page.locator('form#notificationSettingsForm h4'));
            await loc(page, 'Notifications tab: every "Enable…" box', page.locator('form#notificationSettingsForm').getByRole('checkbox', {name: 'Enable these types of notifications.'}));
            await loc(page, 'Notifications tab: every "Do not send me an email…" box', page.locator('form#notificationSettingsForm').getByRole('checkbox', {name: 'Do not send me an email for these types of notifications.'}));
            await safeSignOut(page);
            return out;
        } finally { await close(); }
    });

    // ---- site: admin, the site's home page, "View Profile", the site-level tab
    if (on('site')) await guarded(s, 'site', async (out) => {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            out.home = await siteHome(page, app, `site-home-admin-${app.name}`);
            out.viewProfile = await pressViewProfile(page);
            const tabBtn = page.getByRole('tab', {name: 'Notifications', exact: true});
            out.tabControlPresent = (await tabBtn.count()) > 0;
            if (out.tabControlPresent) { await tabBtn.click(); await page.locator('form#notificationSettingsForm').waitFor({timeout: 15000}); }
            out.viaMenu = {url: page.url(), tab: await readTab(page)};
            await snap(page, `site-tab-admin-${app.name}`);
            out.direct = await openTab(page, app, 'index', `site-tab-admin-direct-${app.name}`);
            // the same account's journal-level tab, for the row difference
            out.journal = await openTab(page, app, app.contextPath, `site-journal-tab-admin-${app.name}`);
            await safeSignOut(page);
            return out;
        } finally { await close(); }
    });

    // ---- register: two visitors on the scratch Register page
    if (on('register')) await guarded(s, 'register', async (out) => {
        scratch.registered = scratch.registered || [];
        for (const [who, consent] of [['r1', false], ['r2', true]]) {
            const {page, close} = await launch(app);
            try {
                let reg;
                if (scratch.registered.includes(U[who])) {
                    reg = {username: U[who], emailConsent: consent, note: 'registered on an earlier run; only the tab is re-read'};
                } else {
                    reg = await registerVisitor(page, app, ctx, U[who], {given: 'Reg', family: consent ? 'Ticked' : 'Unticked', emailConsent: consent, name: `register-${who}`});
                    scratch.registered.push(U[who]); saveScratch();
                    reg.tabWhileSignedIn = await openTab(page, app, ctx, `register-${who}-tab-${app.name}`);
                    reg.signOut = await safeSignOut(page);
                }
                // sign in again with the new credentials, the way scenario 8 says ("then signs in")
                await signIn(page, U[who], {password: regPassword(U[who])});
                reg.afterSignIn = {url: page.url(), title: await page.title()};
                reg.tabAfterSignIn = await openTab(page, app, ctx, `register-${who}-tab2-${app.name}`);
                await safeSignOut(page);
                out[who] = reg;
            } finally { await close(); }
        }
        return out;
    });

    // ---- ann: admin posts a site announcement with the email box ticked (A4)
    if (on('ann')) await guarded(s, 'ann', async (out) => {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            const title = `Site notice ${t}`;
            Object.assign(out, await siteAnnouncement(page, app, title, 'ann'));
            out.title = title;
            const t0 = Date.now();
            out.mailReader = await app.mail.find({to: `${U.rd}@mail.test`, contains: title, timeoutMs: 5000}).then((m) => ({found: true, subject: m.Subject})).catch((e) => ({found: false, error: String(e.message).split('\n')[0]}));
            out.mailManager = await app.mail.find({to: `${U.m1}@mail.test`, contains: title, timeoutMs: 1500}).then((m) => ({found: true, subject: m.Subject})).catch(() => ({found: false}));
            out.mailAdmin = await app.mail.find({to: 'admin@mail.test', contains: title, timeoutMs: 1500}).then((m) => ({found: true, subject: m.Subject})).catch(() => ({found: false}));
            out.waitedMs = Date.now() - t0;
            await safeSignOut(page);
            return out;
        } finally { await close(); }
    });

    // ---- roles: Author, Reader, assistant on the scratch tab; the Reader's and Author's Tasks windows
    if (on('roles')) await guarded(s, 'roles', async (out) => {
        for (const who of (process.env.ROLES ? process.env.ROLES.split(',') : ['au', 'rd', 'as'])) {
            const {page, close} = await launch(app);
            try {
                await signIn(page, U[who]);
                const r = {landed: page.url()};
                r.tab = await openTab(page, app, ctx, `roles-${who}-tab-${app.name}`);
                if (who === 'rd' || who === 'au') r.window = await tasksWindow(page, `roles-${who}-window-${app.name}`);
                await safeSignOut(page);
                out[who] = r;
            } finally { await close(); }
        }
        return out;
    });

    // ---- stats: M1 flips the statistics email both ways, the tab after each
    if (on('stats')) await guarded(s, 'stats', async (out) => {
        const {page, close} = await launch(app);
        try {
            await signIn(page, U.m1);
            out.tabOnArrival = await openTab(page, app, ctx, `stats-tab-on-${app.name}`);
            out.setOff = await setStats(page, app, ctx, /Do not send the email to editors\./, 'stats-off');
            out.tabOff = await openTab(page, app, ctx, `stats-tab-off-${app.name}`);
            out.setOn = await setStats(page, app, ctx, /Send a monthly email to editors\./, 'stats-on');
            out.tabOn = await openTab(page, app, ctx, `stats-tab-on-again-${app.name}`);
            await safeSignOut(page);
            return out;
        } finally { await close(); }
    });

    // ---- templates: M1 on the email templates page (411–412)
    if (on('templates')) await guarded(s, 'templates', async (out) => {
        const {page, close} = await launch(app);
        try {
            await signIn(page, U.m1);
            Object.assign(out, await templatesLook(page, app, ctx, `templates-${app.name}`));
            await safeSignOut(page);
            return out;
        } finally { await close(); }
    });

    // ---- multi: a Manager of two scratch journals; the site-level set is its own, each journal its own
    if (on('multi')) await guarded(s, 'multi', async (out) => {
        const {page, close} = await launch(app);
        try {
            await signIn(page, U.mu);
            out.home = await siteHome(page, app, `multi-home-mu-${app.name}`);
            out.viewProfile = await pressViewProfile(page);
            out.siteDirect = await openTab(page, app, 'index', `multi-site-tab-${app.name}`);
            // tick the announcement email box on journal 1 and save
            out.j1 = await openTab(page, app, ctx, `multi-j1-before-${app.name}`);
            const box = page.locator('input#emailNotificationNewAnnouncement');
            await box.check();
            out.j1Save = await saveTab(page);
            out.j1After = await openTab(page, app, ctx, `multi-j1-after-${app.name}`);
            out.j2After = await openTab(page, app, ctx2, `multi-j2-after-${app.name}`);
            out.siteAfterJ1 = await openTab(page, app, 'index', `multi-site-after-j1-${app.name}`);
            // now the site-level set: tick the needs-editor email box there and save
            const siteBox = page.locator('input#emailNotificationEditorAssignmentRequired');
            await siteBox.check();
            out.siteSave = await saveTab(page);
            out.siteAfterSave = await openTab(page, app, 'index', `multi-site-after-save-${app.name}`);
            out.j1AfterSite = await openTab(page, app, ctx, `multi-j1-after-site-${app.name}`);
            out.j2AfterSite = await openTab(page, app, ctx2, `multi-j2-after-site-${app.name}`);
            await safeSignOut(page);
            return out;
        } finally { await close(); }
    });

    // ---- hosted (OJS only): a journal created by hand, its Register page signed out
    if (on('hosted') && app.name === 'ojs') await guarded(s, 'hosted', async (out) => {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            Object.assign(out, await createHostedJournal(page, app, t, 'hosted'));
            await safeSignOut(page);
            await page.goto(app.url(`/index.php/${out.path}/user/register`));
            await idle(page).catch(() => {});
            out.registerPage = {url: page.url(), title: await page.title(), boxes: await registerBoxes(page), hasRegisterButton: (await page.getByRole('button', {name: 'Register', exact: true}).count()) > 0};
            out.registerText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 800);
            await snap(page, `hosted-register-${app.name}`);
            return out;
        } finally { await close(); }
    });

    saveSummary(app, s);
    record(`k3-summary-${app.name}`, s);
});
