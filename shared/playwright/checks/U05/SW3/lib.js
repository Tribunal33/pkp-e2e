// Helpers of sw3.js (U05 drift sweep 2026-10-20, chunk SW3: emails, footer, Unsubscribe page, side
// effects, cross-feature). Requiring this file runs nothing. The discussion form, the Unsubscribe page
// reads and the tab reads follow the kept K4 script (../K4/k4.js); the Tasks window is the suites'
// TasksPanel page object, required inside forEachApp's fn by the caller.
const {screen, shot, record, idle, signOut} = require('../../../probe');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function safeScreen(page) {
    try {
        return await screen(page);
    } catch (error) {
        return {url: page.url(), screenError: flat(error.message, 200)};
    }
}

/** screen() + shot() under one name; returns the snapshot. */
async function snap(page, name, extra = {}) {
    const s = await safeScreen(page);
    await shot(page, name).catch(() => {});
    record(name, {...s, ...extra});
    return s;
}

// ------------------------------------------------------------------ the Notifications tab
async function readTab(page) {
    const form = page.locator('form#notificationSettingsForm');
    await form.waitFor({timeout: 20000});
    return form.evaluate((f) => {
        const order = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
        const boxes = [...f.querySelectorAll('input[type=checkbox]')];
        const sections = [...new Set(boxes.map((b) => b.closest('.section')))].filter(Boolean);
        const items = [...f.querySelectorAll('h4'), ...sections].sort(order);
        const rows = [];
        let group = null;
        for (const el of items) {
            if (el.tagName === 'H4') {
                group = el.innerText.trim();
                continue;
            }
            const labelEl = el.querySelector(':scope > ul > label:not([for]), :scope > .label, :scope > label:not([for])');
            const bx = [...el.querySelectorAll('input[type=checkbox]')].map((i) => ({id: i.id, checked: i.checked, disabled: i.disabled}));
            rows.push({group, sentence: labelEl ? labelEl.innerText.trim() : null, enable: bx[0] && bx[0].checked, email: bx[1] && bx[1].checked, enableId: bx[0] && bx[0].id, emailId: bx[1] && bx[1].id, emailDisabled: bx[1] && bx[1].disabled});
        }
        return rows;
    });
}

async function openTab(page, app, cp) {
    await page.goto(app.url(`/index.php/${cp}/user/profile/notificationSettings`));
    await idle(page);
    return readTab(page);
}

const tabShort = (rows) => rows.map((r) => `${r.enable ? 'E' : '-'}${r.email ? 'X' : '-'} ${r.sentence}`);

async function saveTab(page) {
    const form = page.locator('form#notificationSettingsForm');
    const action = await form.getAttribute('action');
    const saved = page.waitForResponse((r) => r.url().startsWith(action.split('?')[0]) && r.request().method() === 'POST', {timeout: 20000});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const status = (await saved).status();
    await idle(page);
    return status;
}

// ------------------------------------------------------------------ the discussion form
/** As the signed-in Manager: open a discussion on the submission with the matching participants ticked. */
async function openDiscussion(page, app, cp, submissionId, name, message, participantRegexes, recName) {
    await page.goto(app.url(`/index.php/${cp}/dashboard/editorial?workflowSubmissionId=${submissionId}`));
    const panel = page.locator('[data-cy="discussion-manager"]').first();
    await panel.waitFor({timeout: 45000});
    await idle(page);
    const panelHeading = await panel.locator('h2, h3, h4').first().innerText().catch(() => null);
    if (recName) await snap(page, `${recName}-workflow-${app.name}`, {panelHeading});
    await panel.getByRole('button', {name: 'Add', exact: true}).click();
    const modal = page.locator('[data-cy="active-modal"]').filter({has: page.locator('input[name="title"]')}).last();
    await modal.locator('input[name="title"]').waitFor({timeout: 30000});
    await modal.locator('input[name="participants"]').first().waitFor({timeout: 30000});
    await sleep(500);
    const participants = await modal.locator('input[name="participants"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: ((e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || {}).innerText || '').replace(/\s+/g, ' ').trim()})));
    if (recName) await snap(page, `${recName}-form-${app.name}`, {participants});
    await modal.locator('input[name="title"]').fill(name);
    for (const p of participants) {
        if (participantRegexes.some((re) => re.test(p.label || '')) && !p.checked) {
            await modal.locator(`input[name="participants"][value="${p.value}"]`).check();
        }
    }
    const body = modal.frameLocator('iframe').last().locator('body');
    await body.click();
    await body.fill(message);
    const saved = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+\/tasks$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', {timeout: 30000}).catch(() => null);
    const pressedAt = new Date();
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    const response = await saved;
    await modal.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
    await idle(page);
    return {name, panelHeading, participants, status: response ? response.status() : null, pressedAt: pressedAt.toISOString()};
}

// ------------------------------------------------------------------ mail
function describe(app, full, summary) {
    const text = full.Text || '';
    const html = full.HTML || '';
    const htmlLinks = [...html.matchAll(/<a\b[^>]*href=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi)].map((x) => ({href: x[2].replace(/&amp;/g, '&'), text: x[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}));
    const dash = text.lastIndexOf('—');
    const unsubscribe = htmlLinks.find((l) => /^unsubscribe$/i.test(l.text));
    return {
        id: summary.ID,
        created: summary.Created,
        subject: summary.Subject,
        from: summary.From,
        to: (summary.To || []).map((t) => t.Address),
        textFooter: dash >= 0 ? text.slice(dash) : null,
        dashOnOwnLine: /(^|\n)—\s*(\n|$)/.test(text),
        htmlFooterLinks: htmlLinks.slice(-4),
        unsubscribeLink: unsubscribe ? unsubscribe.href : null,
        textTail: text.slice(-700),
    };
}

async function mailFor(app, query) {
    try {
        const m = await app.mail.find({timeoutMs: 30000, ...query});
        const full = await app.mail.fullMessage(m.ID);
        return {found: true, ...describe(app, full, m)};
    } catch (error) {
        return {found: false, error: flat(error.message, 200)};
    }
}

async function mailCount(app, query) {
    try {
        return await app.mail.count(query);
    } catch (error) {
        return `error: ${flat(error.message, 120)}`;
    }
}

/** A link from an email sent by a queued job carries the config base_url; open it on the probe server. */
const onProbeServer = (app, link) => link.replace(/^https?:\/\/[^/]+/, app.baseURL);

// ------------------------------------------------------------------ the Unsubscribe page
async function readUnsubscribe(page) {
    return page.evaluate(() => {
        const main = document.querySelector('.pkp_structure_main') || document.body;
        const boxes = [...main.querySelectorAll('input[type=checkbox]')].map((i) => {
            const lab = i.id ? document.querySelector(`label[for="${i.id}"]`) : null;
            return {id: i.id, checked: i.checked, label: ((lab || i.closest('label') || i.parentElement || {}).innerText || '').trim()};
        });
        const h1 = (document.querySelector('h1') || {}).innerText || null;
        const paragraphs = [...main.querySelectorAll('p')].map((p) => p.innerText.trim()).filter(Boolean);
        const links = [...main.querySelectorAll('a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})).filter((l) => l.text);
        const userMenu = (document.querySelector('#navigationUserWrapper') || {}).innerText || null;
        return {h1, paragraphs, boxes, links, userMenu: userMenu ? userMenu.replace(/\s+/g, ' ').trim() : null, title: document.title, hasHeader: !!document.querySelector('header'), bodyText: document.body.innerText.trim().slice(0, 200)};
    });
}

async function visitUnsubscribe(page, link, name) {
    const response = await page.goto(link);
    const status = response ? response.status() : null;
    await idle(page).catch(() => {});
    const data = await readUnsubscribe(page).catch((e) => ({error: flat(e.message, 200)}));
    await snap(page, name, {status, read: data});
    return {status, ...data};
}

async function pressUnsubscribe(page, name) {
    const button = page.locator('.pkp_structure_main button:has-text("Unsubscribe"), .pkp_structure_main input[type=submit]').last();
    const posted = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('unsubscribe'), {timeout: 20000}).catch(() => null);
    await button.click();
    const response = await posted;
    await page.waitForLoadState('domcontentloaded');
    await idle(page).catch(() => {});
    const data = await readUnsubscribe(page).catch((e) => ({error: flat(e.message, 200)}));
    await snap(page, name, {postStatus: response ? response.status() : null, read: data});
    return {postStatus: response ? response.status() : null, ...data};
}

const boxesShort = (d) => (d.boxes || []).map((b) => `${b.checked ? '[x]' : '[ ]'} ${b.label}`);

/** Follow "user profile" on the current page; sign in on the Login page if it asks; where it lands. */
async function followProfile(page, username, name) {
    const out = {};
    const link = page.getByRole('link', {name: 'user profile'}).first();
    out.href = await link.getAttribute('href');
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    await idle(page).catch(() => {});
    out.landing = {url: page.url(), h1: await page.locator('h1').first().innerText().catch(() => null)};
    await snap(page, `${name}-landing`);
    if (username && (await page.locator('input#username').count())) {
        await page.locator('input#username').fill(username);
        await page.locator('input#password').evaluate((e) => e.removeAttribute('maxlength'));
        await page.locator('input#password').fill(`${username}${username}`);
        await Promise.all([page.waitForLoadState('load'), page.locator('form').filter({has: page.locator('input#username')}).locator('button[type=submit]').first().click()]);
        await idle(page).catch(() => {});
    }
    await page.locator('#profileTabs').waitFor({timeout: 15000}).catch(() => {});
    out.after = {
        url: page.url(),
        h1: await page.locator('h1').first().innerText().catch(() => null),
        tabs: await page.locator('#profileTabs > ul > li').evaluateAll((els) => els.map((e) => ({name: e.innerText.trim(), selected: e.getAttribute('aria-selected') === 'true' || e.classList.contains('ui-tabs-active')}))).catch(() => []),
        username: await page.locator('#profileTabs').innerText().then((t) => (t.match(/Username\s*\n?\s*(\S+)/) || [])[1] || null).catch(() => null),
    };
    await snap(page, `${name}-after`, {tabs: out.after.tabs});
    return out;
}

// ------------------------------------------------------------------ Tasks window (TasksPanel)
/** Open the bell's window from `pathAfterContext` and return {panel, bell, rows}. */
async function openTasks(page, app, cp, pathAfterContext, TasksPanel) {
    await page.goto(app.url(`/index.php/${cp}/${pathAfterContext}`));
    const panel = new TasksPanel(page);
    await panel.bell().waitFor({timeout: 30000});
    await idle(page);
    const bell = await panel.count();
    await panel.open();
    await idle(page);
    return {panel, bell, rows: await taskRows(panel)};
}

async function taskRows(panel) {
    return panel.rows().evaluateAll((rows) => rows.map((r) => ({text: (r.querySelector('.task .message') || r).textContent.replace(/\s+/g, ' ').trim(), title: ((r.querySelector('.task .details .submission') || {}).textContent || '').replace(/\s+/g, ' ').trim(), unread: !!r.querySelector('div.task.unread'), href: (r.querySelector('a') || {}).href || null})));
}

async function tick(panel, text) {
    const row = panel.row(text).first();
    await panel.box(row).check();
}

module.exports = {flat, sleep, safeScreen, snap, readTab, openTab, tabShort, saveTab, openDiscussion, mailFor, mailCount, onProbeServer, readUnsubscribe, visitUnsubscribe, pressUnsubscribe, boxesShort, followProfile, openTasks, taskRows, tick, signOut};
