// U05 claim check, chunk K4 — notification emails, the footer, the
// Unsubscribe page, queued emails (docs/process/briefs/claim-check.md).
//
// Drives, per app, on its own scratch context: a discussion email and its
// footer (Rule 7a/7c, scenario 5, Mailpit's own view of the plain-text
// part), the Unsubscribe page signed out and signed in as someone else
// (Fields "The Unsubscribe page", Rules 8a–8e, scenario 6, Actors row
// "Open the Unsubscribe page"), the tab after unsubscribing, A2, the error
// branch of the result page (a stale page whose session has ended), A9 (the
// statistics email switched off), A7 (the task deleted), the announcement
// email's footer after the queued job ran, the OJS issue email (scenario 9),
// and A8 (the needs-editor email's shape; the "Publication Published" email
// after a Manager publishes through the workflow on OMP and OPS).
//
//   PROBE_FEATURE=U05 PROBE_AGENT=ccK4 node bin/probe.js all shared/playwright/checks/U05/K4/k4.js
//   PHASES=disc1,unsub1 … re-runs named phases on the saved scratch context.
//
// No assertions: every screen is recorded with screen()/shot(); the summary
// per app is `k4-summary-<app>.json` in the agent's output folder.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir, outFile, drainJobs: kitDrainJobs} =
    require('../../../probe');

const SCRATCH_FILE = outFile(`k4-scratch-${process.env.PROBE_APPS}.json`);
const scratchAll = fs.existsSync(SCRATCH_FILE) ? JSON.parse(fs.readFileSync(SCRATCH_FILE, 'utf8')) : {};
const ONLY_PHASES = process.env.PHASES ? process.env.PHASES.split(',') : null;
// Mailpit's web UI is the slot's own (app.mailpitUrl): a fixed 8025 opened slot 0's Mailpit, which
// answered "404 page not found" for this slot's messages (U05 drift sweep 2026-10-20).
const mailpitUi = (app) => app.mailpitUrl;

async function safeScreen(page) {
    try {
        return await screen(page);
    } catch (error) {
        return {url: page.url(), screenError: String(error.message).split('\n')[0]};
    }
}

// ---------------------------------------------------------------- tab helpers
async function readTab(page) {
    const form = page.locator('form#notificationSettingsForm');
    await form.waitFor({timeout: 15000});
    return form.evaluate((f) => {
        const order = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
        const boxes = [...f.querySelectorAll('input[type=checkbox]')];
        const sections = [...new Set(boxes.map((b) => b.closest('.section')))].filter(Boolean);
        const items = [...f.querySelectorAll('h4'), ...sections].sort(order);
        const out = {groups: [], rows: []};
        let group = null;
        for (const el of items) {
            if (el.tagName === 'H4') {
                group = el.innerText.trim();
                out.groups.push(group);
                continue;
            }
            const labelEl = el.querySelector(':scope > ul > label:not([for]), :scope > .label, :scope > label:not([for])');
            const row = {group, sentence: labelEl ? labelEl.innerText.trim() : null, boxes: []};
            for (const input of el.querySelectorAll('input[type=checkbox]')) {
                row.boxes.push({id: input.id, checked: input.checked, disabled: input.disabled});
            }
            out.rows.push(row);
        }
        return out;
    });
}

async function openTab(page, app, contextPath) {
    await page.goto(app.url(`/index.php/${contextPath}/user/profile/notificationSettings`));
    await idle(page);
    return readTab(page);
}

function tabSummary(tab) {
    return tab.rows.map((r) => ({group: r.group, sentence: r.sentence, enable: r.boxes[0] && r.boxes[0].checked, email: r.boxes[1] && r.boxes[1].checked, emailDisabled: r.boxes[1] && r.boxes[1].disabled}));
}

function findRow(tab, regex) {
    return tab.rows.find((r) => regex.test(r.sentence || ''));
}

async function saveTab(page) {
    const form = page.locator('form#notificationSettingsForm');
    const action = await form.getAttribute('action');
    const saved = page.waitForResponse((r) => r.url().startsWith(action.split('?')[0]) && r.request().method() === 'POST', {timeout: 20000});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    return (await saved).status();
}

async function recordTab(page, app, contextPath, name) {
    const tab = await openTab(page, app, contextPath);
    await shot(page, name);
    record(name, {...(await safeScreen(page)), tab: tabSummary(tab)});
    return tab;
}

// ------------------------------------------------------------ Tasks helpers
async function openTasks(page, app, contextPath, dashboard) {
    await page.goto(app.url(`/index.php/${contextPath}/${dashboard}`));
    const bell = page.getByRole('button', {name: /^Tasks/});
    await bell.waitFor({timeout: 30000});
    const bellText = await bell.innerText();
    await bell.click();
    const dialog = page.locator('[role="dialog"]:visible').last();
    await dialog.waitFor({timeout: 30000});
    await dialog.getByText('Mark New').waitFor({timeout: 30000}).catch(() => {});
    await idle(page);
    return {bellText, dialog};
}

async function tasksWindow(page, app, contextPath, name, dashboard) {
    const {bellText, dialog} = await openTasks(page, app, contextPath, dashboard);
    const rows = await dialog.locator('tr.gridRow').evaluateAll((els) => els.map((e) => ({text: e.innerText.trim(), unread: !!e.querySelector('.unread')})));
    await shot(page, name);
    record(name, {...(await safeScreen(page)), bellText, rows});
    await page.keyboard.press('Escape');
    await dialog.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
    return {bellText, rows};
}

// ------------------------------------------------------- discussion helpers
/** As the signed-in Manager: open a discussion on the submission with the matching participants ticked. */
async function openDiscussion(page, app, contextPath, submissionId, discussionName, message, participantRegexes, name) {
    await page.goto(app.url(`/index.php/${contextPath}/dashboard/editorial?workflowSubmissionId=${submissionId}`));
    const panel = page.locator('[data-cy="discussion-manager"]').first();
    await panel.waitFor({timeout: 45000});
    const panelHeading = await panel.locator('h2, h3, h4').first().innerText().catch(() => null);
    const panelButtons = await panel.getByRole('button').allInnerTexts();
    record(`${name}-workflow-${app.name}`, {...(await safeScreen(page)), panelHeading, panelButtons});
    await shot(page, `${name}-workflow-${app.name}`);
    await panel.getByRole('button', {name: 'Add', exact: true}).click();
    const modal = page.locator('[data-cy="active-modal"]').last();
    await modal.locator('input[name="title"]').waitFor({timeout: 30000});
    await modal.locator('input[name="participants"]').first().waitFor({timeout: 30000});
    const participants = await modal.locator('input[name="participants"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || {}).innerText || null})));
    const modalText = await modal.innerText();
    record(`${name}-form-${app.name}`, {...(await safeScreen(page)), participants, modalText});
    await shot(page, `${name}-form-${app.name}`);
    await loc(page, 'discussion form: name field', modal.locator('input[name="title"]'));
    await loc(page, 'discussion form: participant boxes', modal.locator('input[name="participants"]'));
    await modal.locator('input[name="title"]').fill(discussionName);
    const ticked = [];
    for (const p of participants) {
        if (participantRegexes.some((re) => re.test(p.label || '')) && !p.checked) {
            await modal.locator(`input[name="participants"][value="${p.value}"]`).check();
            ticked.push(p.label);
        }
    }
    const frame = modal.frameLocator('iframe').last();
    await frame.locator('body').click();
    await frame.locator('body').fill(message);
    const saveResponse = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+\/tasks$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', {timeout: 30000}).catch(() => null);
    const pressedAt = new Date();
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    const errorDialog = page.getByRole('dialog', {name: 'Error'});
    const outcome = await Promise.race([
        errorDialog.waitFor({timeout: 30000}).then(() => 'error'),
        modal.waitFor({state: 'hidden', timeout: 30000}).then(() => 'saved'),
    ]).catch(() => 'timeout');
    const response = await saveResponse;
    const result = {outcome, pressedAt: pressedAt.toISOString(), ticked, participants, saveStatus: response ? response.status() : null, panelHeading, panelButtons, modalHasEmailChoice: /e-?mail/i.test(modalText)};
    if (outcome === 'error') {
        result.errorDialog = await errorDialog.innerText();
        record(`${name}-save-error-${app.name}`, await safeScreen(page));
        await shot(page, `${name}-save-error-${app.name}`);
        await errorDialog.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        await modal.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
    } else {
        await panel.getByText(discussionName).first().waitFor({timeout: 30000}).catch(() => {});
        record(`${name}-after-save-${app.name}`, await safeScreen(page));
        await shot(page, `${name}-after-save-${app.name}`);
    }
    return result;
}

// ------------------------------------------------------------- mail helpers
async function mailFor(app, to, contains, timeoutMs) {
    try {
        const m = await app.mail.find({to, contains, timeoutMs});
        return describeMessage(app, m);
    } catch (error) {
        return {found: false, error: String(error.message).split('\n')[0]};
    }
}

async function describeMessage(app, m) {
    const full = await app.mail.fullMessage(m.ID);
    let headers = null;
    try {
        headers = await app.mail._get(`/api/v1/message/${m.ID}/headers`);
    } catch {
        headers = null;
    }
    const text = full.Text || '';
    const html = full.HTML || '';
    const textLinks = [...text.matchAll(/https?:\/\/[^\s)]+/g)].map((x) => x[0]);
    const htmlLinks = [...html.matchAll(/<a\b[^>]*href=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi)].map((x) => ({href: x[2].replace(/&amp;/g, '&'), text: x[3].replace(/<[^>]+>/g, '').trim()}));
    const unsubscribeLink = app.mail.extractLink(html, /^unsubscribe$/i) || app.mail.extractLink(html, /unsubscribe/i);
    const dashIndex = text.lastIndexOf('—');
    return {
        found: true,
        id: m.ID,
        created: m.Created,
        subject: m.Subject,
        from: m.From,
        to: m.To,
        text,
        html,
        textFooter: dashIndex >= 0 ? text.slice(dashIndex) : null,
        textTail: text.slice(-500),
        dashOnOwnLine: /(^|\n)—\s*(\n|$)/.test(text),
        textLinks,
        htmlLinks,
        unsubscribeLink,
        listUnsubscribe: headers && headers['List-Unsubscribe'] ? headers['List-Unsubscribe'] : null,
        listUnsubscribePost: headers && headers['List-Unsubscribe-Post'] ? headers['List-Unsubscribe-Post'] : null,
        headerNames: headers ? Object.keys(headers) : null,
    };
}

function slim(mail) {
    if (!mail) return mail;
    const {html, text, ...rest} = mail;
    return rest;
}

async function mailCount(app, to, contains) {
    try {
        return await app.mail.count({to, contains});
    } catch (error) {
        return `error: ${String(error.message).split('\n')[0]}`;
    }
}

// The kit's drainJobs (patterns.md "Probe kit"): support/jobs.js runJobs() polls worker 0, which is down
// outside a suite run, so the ann and issue phases timed out after 180 s (U05 drift sweep 2026-10-20).
async function drainJobs(app) {
    const out = await kitDrainJobs(app);
    return {passes: out.passes, counts: out.counts, tail: String(out.output || '').split('\n').filter((l) => l.trim()).slice(-12).join('\n')};
}

/** A queued email's link carries the config base_url (the worker port); open it on the probe server. */
function onProbeServer(app, link) {
    return link.replace(/^https?:\/\/[^/]+/, app.baseURL);
}

/** Mailpit's own message view (the mail catcher as a screen): the HTML view, then its "Text" tab. */
async function mailpitView(page, app, mailId, name) {
    const out = {};
    await page.goto(`${mailpitUi(app)}/view/${mailId}`);
    await page.locator('#nav-plain-text-tab').waitFor({timeout: 20000}).catch(() => {});
    out.tabs = await page.locator('[role=tab]').allInnerTexts().catch(() => []);
    record(`${name}-html-view`, await safeScreen(page));
    await shot(page, `${name}-html-view`);
    // The "Text" tab is #nav-plain-text-tab and its pane #nav-plain-text; the first `pre` on the page is the
    // "HTML Source" pane, which the 2026-10-20 sweep's first fixed run read by mistake.
    const textTab = page.locator('#nav-plain-text-tab');
    out.textTabFound = await textTab.count();
    if (out.textTabFound) {
        await textTab.click();
        await page.locator('#nav-plain-text').waitFor({state: 'visible', timeout: 10000}).catch(() => {});
        out.textView = await page.locator('#nav-plain-text').innerText().catch(() => null);
        record(`${name}-text-view`, {...(await safeScreen(page)), textView: out.textView});
        await shot(page, `${name}-text-view`);
    }
    // What the message itself carries: Mailpit's "Text" is its own rendering when the email has no text part.
    try {
        const raw = await (await fetch(`${mailpitUi(app)}/api/v1/message/${mailId}/raw`)).text();
        const head = raw.split(/\r?\n\r?\n/)[0];
        out.contentType = (head.match(/^Content-Type:\s*([^;\r\n]+)/im) || [])[1] || null;
        out.mimeParts = [...raw.matchAll(/^Content-Type:\s*([^;\r\n]+)/gim)].map((m) => m[1]);
    } catch (error) {
        out.rawError = String(error.message).split('\n')[0];
    }
    return out;
}

// ------------------------------------------------------ Unsubscribe helpers
async function readUnsubscribePage(page) {
    return page.evaluate(() => {
        const region = document.querySelector('main') || document.querySelector('.page') || document.body;
        const boxes = [...region.querySelectorAll('input[type=checkbox]')].map((i) => {
            const lab = i.id ? document.querySelector(`label[for="${i.id}"]`) : null;
            const wrap = i.closest('label') || i.parentElement;
            return {id: i.id, checked: i.checked, label: (lab || wrap || {}).innerText ? (lab || wrap).innerText.trim() : null};
        });
        const links = [...region.querySelectorAll('a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})).filter((l) => l.text);
        const buttons = [...region.querySelectorAll('button, input[type=submit]')].map((b) => (b.innerText || b.value || '').trim());
        const headings = [...region.querySelectorAll('h1, h2, h3')].map((h) => h.innerText.trim());
        const groupHeadings = [...region.querySelectorAll('h4, h5, legend')].map((h) => h.innerText.trim());
        const form = region.querySelector('form');
        return {
            headings,
            groupHeadings,
            boxes,
            links,
            buttons,
            form: form ? {action: form.getAttribute('action'), method: form.getAttribute('method'), hidden: [...form.querySelectorAll('input[type=hidden]')].map((i) => i.name)} : null,
            layout: {hasMain: !!document.querySelector('main'), bodyClass: document.body.className, title: document.title, h1: (document.querySelector('h1') || {}).innerText || null, headerText: (document.querySelector('header') || {}).innerText || null},
        };
    });
}

async function visitUnsubscribe(page, link, name) {
    const response = await page.goto(link);
    const status = response ? response.status() : null;
    let data = null;
    try {
        data = await readUnsubscribePage(page);
    } catch (error) {
        data = {error: String(error.message).split('\n')[0]};
    }
    await shot(page, name);
    record(name, {...(await safeScreen(page)), status, ...data});
    return {status, ...data};
}

function unsubscribeButton(page) {
    return page.locator('main, .page, body').locator('button:has-text("Unsubscribe"), input[type=submit]').last();
}

async function pressUnsubscribe(page, name) {
    const button = unsubscribeButton(page);
    await loc(page, 'Unsubscribe page: the button', button);
    const posted = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('unsubscribe'), {timeout: 20000}).catch(() => null);
    await button.click();
    const response = await posted;
    await page.waitForLoadState('domcontentloaded');
    let data = {postStatus: response ? response.status() : null, postUrl: response ? response.url() : null};
    try {
        data = {...data, ...(await readUnsubscribePage(page))};
    } catch (error) {
        data.error = String(error.message).split('\n')[0];
    }
    await shot(page, name);
    record(name, {...(await safeScreen(page)), ...data});
    return data;
}

function compact(pageData) {
    if (!pageData) return pageData;
    return {status: pageData.status, postStatus: pageData.postStatus, headings: pageData.headings, groupHeadings: pageData.groupHeadings, boxes: (pageData.boxes || []).map((b) => `${b.checked ? '[x]' : '[ ]'} ${b.label}`), links: pageData.links, buttons: pageData.buttons, form: pageData.form, layout: pageData.layout};
}

/** Follow "user profile" from the current page; sign in there if asked; record where it lands. */
async function followProfileLink(page, app, username, name) {
    const out = {};
    const link = page.getByRole('link', {name: 'user profile'}).first();
    out.href = await link.getAttribute('href');
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    out.landing = {url: page.url(), title: await page.title(), h1: await page.locator('h1').first().innerText().catch(() => null)};
    await shot(page, `${name}-landing`);
    record(`${name}-landing`, await safeScreen(page));
    if (await page.locator('input#username').count()) {
        await page.locator('input#username').fill(username);
        // The login form's password box carries maxlength=32; scratch passwords (username twice) can be longer (users.md).
        await page.locator('input#password').evaluate((e) => e.removeAttribute('maxlength'));
        await page.locator('input#password').fill(`${username}${username}`);
        await Promise.all([
            page.waitForLoadState('load'),
            page.locator('form').filter({has: page.locator('input#username')}).locator('button[type=submit], input[type=submit]').first().click(),
        ]);
        await idle(page).catch(() => {});
    }
    const selectedTab = await page.locator('#profileTabs > ul > li[aria-selected="true"], #profileTabs > ul > li.ui-tabs-active').allInnerTexts().catch(() => []);
    out.afterLogin = {url: page.url(), title: await page.title(), h1: await page.locator('h1').first().innerText().catch(() => null), selectedTab};
    await shot(page, `${name}-after`);
    record(`${name}-after`, {...(await safeScreen(page)), selectedTab});
    return out;
}

// --------------------------------------------------- announcement helpers
async function enableAnnouncements(page, app, contextPath, name) {
    await page.goto(app.url(`/index.php/${contextPath}/management/settings/website`));
    await page.locator('#setup-button').waitFor({timeout: 30000});
    await page.locator('#setup-button').click();
    const annTab = page.getByRole('tab', {name: 'Announcements', exact: true});
    await annTab.waitFor({timeout: 15000});
    await annTab.click();
    const box = page.getByRole('checkbox', {name: /Enable announcements/i});
    await box.waitFor({timeout: 15000});
    const form = box.locator('xpath=ancestor::form[1]');
    const wasChecked = await box.isChecked();
    record(`${name}-settings-${app.name}`, {...(await safeScreen(page)), wasChecked});
    await shot(page, `${name}-settings-${app.name}`);
    if (!wasChecked) await box.check();
    const saved = page.waitForResponse((r) => /^(PUT|POST)$/.test(r.request().method()) && /\/api\/v1\/contexts/.test(r.url()), {timeout: 20000});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    return {wasChecked, saveStatus: (await saved).status()};
}

async function addAnnouncement(page, app, contextPath, title, sendEmail, name) {
    await page.goto(app.url(`/index.php/${contextPath}/management/settings/announcements`));
    const add = page.getByRole('button', {name: /Add Announcement/i}).first();
    await add.waitFor({timeout: 30000});
    record(`${name}-list-${app.name}`, await safeScreen(page));
    await shot(page, `${name}-list-${app.name}`);
    await add.click();
    const sendBox = page.getByRole('checkbox', {name: 'Send an email about this to all registered users.'});
    await sendBox.waitFor({timeout: 30000});
    const form = sendBox.locator('xpath=ancestor::form[1]');
    const titleInput = form.locator('input[name^="title"], input[id^="title"]').first();
    await titleInput.waitFor({timeout: 15000});
    const sendDefault = await sendBox.isChecked();
    record(`${name}-form-${app.name}`, {...(await safeScreen(page)), sendDefault});
    await shot(page, `${name}-form-${app.name}`);
    await loc(page, 'Announcement form: "Send Email" box', sendBox);
    await titleInput.fill(title);
    const body = form.frameLocator('iframe').first().locator('body');
    await body.click();
    await body.fill(`Short description ${title}`);
    if (sendEmail && !(await sendBox.isChecked())) await sendBox.check();
    const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/v1\/announcements/.test(r.url()), {timeout: 30000}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const response = await posted;
    await form.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
    record(`${name}-after-save-${app.name}`, await safeScreen(page));
    await shot(page, `${name}-after-save-${app.name}`);
    return {title, sendDefault, postStatus: response ? response.status() : null};
}

// --------------------------------------------------------------------- main
forEachApp(async (app) => {
    const summary = {app: app.name, problems: [], blocked: []};
    let scratch = scratchAll[app.name];
    if (!scratch) {
        const t = tag('u05k4');
        const users = [
            {username: `${t}m1`, givenName: 'Mira', familyName: 'ManagerOne', roles: ['manager']},
            {username: `${t}m2`, givenName: 'Milo', familyName: 'ManagerTwo', roles: ['manager']},
            {username: `${t}au`, givenName: 'Ada', familyName: 'Author', roles: ['author']},
            {username: `${t}ab`, givenName: 'Ben', familyName: 'AuthorTwo', roles: ['author']},
            {username: `${t}r1`, givenName: 'Rosa', familyName: 'ReaderOne', roles: ['reader']},
        ];
        const created = await app.api.createContext({tag: t, users});
        const s1 = await app.api.createSubmission({tag: `${t}s1`, context: t, submitter: `${t}au`, title: `Footer one ${t}`, submitted: true, participants: []});
        // S2 sits in Production so a Manager can publish it through the workflow (A8's published half; OMP and OPS).
        const s2Spec = {tag: `${t}s2`, context: t, submitter: `${t}ab`, title: `Publish me ${t}`, submitted: true, participants: []};
        if (app.name !== 'ops') s2Spec.decisions = ['skipExternalReview', 'sendToProduction'];
        let s2 = null;
        try {
            s2 = await app.api.createSubmission(s2Spec);
        } catch (error) {
            s2 = {error: String(error.message).split('\n')[0].slice(0, 300)};
        }
        scratch = {tag: t, path: t, m1: `${t}m1`, m2: `${t}m2`, au: `${t}au`, ab: `${t}ab`, r1: `${t}r1`, created, s1, s2};
        scratchAll[app.name] = scratch;
        fs.writeFileSync(SCRATCH_FILE, JSON.stringify(scratchAll, null, 2));
    }
    const {m1, au, ab, r1} = scratch;
    const cp = scratch.path;
    const email = (u) => `${u}@mail.test`;
    summary.scratch = {path: cp, s1: scratch.s1.submissionId, s2: scratch.s2 && scratch.s2.submissionId};
    const priorFile = outFile(`k4-summary-${app.name}.json`);
    if (ONLY_PHASES && fs.existsSync(priorFile)) {
        Object.assign(summary, JSON.parse(fs.readFileSync(priorFile, 'utf8')), {problems: [], blocked: []});
    }
    const {page, close, context} = await launch(app);
    page.on('dialog', async (d) => {
        summary.browserDialogs = summary.browserDialogs || [];
        summary.browserDialogs.push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    const phase = async (label, fn) => {
        if (ONLY_PHASES && !ONLY_PHASES.includes(label)) return;
        console.log(`[k4 ${app.name}] ${label}`);
        try {
            await fn();
        } catch (error) {
            summary.problems.push({phase: label, error: String(error.stack || error).slice(0, 700)});
            await shot(page, `problem-${label}-${app.name}`).catch(() => {});
            record(`problem-${label}-${app.name}`, await safeScreen(page));
            await signOut(page).catch(() => {});
        }
        record(`k4-summary-${app.name}`, summary);
    };
    const d1 = `Discussion ${scratch.tag}d1`;
    const d2 = `Discussion ${scratch.tag}d2`;
    const link1 = () => summary.disc1 && summary.disc1.authorMail && summary.disc1.authorMail.unsubscribeLink;

    try {
        // ---- disc1: scenario 5's first half; Rule 7a (discussion wording), 7c; F16 (Mailpit's Text view).
        await phase('disc1', async () => {
            summary.disc1 = {};
            await signIn(page, m1);
            summary.disc1.open = await openDiscussion(page, app, cp, scratch.s1.submissionId, d1, `Opening message ${scratch.tag}d1`, [/Ada Author/], 'disc1');
            await signOut(page);
            const mail = await mailFor(app, email(au), `${scratch.tag}d1`, 45000);
            if (mail.found) {
                record(`disc1-mail-author-${app.name}`, mail);
                summary.disc1.mailDelaySeconds = (new Date(mail.created) - new Date(summary.disc1.open.pressedAt)) / 1000;
                const u = new URL(mail.unsubscribeLink);
                summary.disc1.linkShape = {path: u.pathname, validateLength: (u.searchParams.get('validate') || '').length, id: u.searchParams.get('id'), endsWithAmpId: /&id=\d+$/.test(mail.unsubscribeLink), paramOrder: [...u.searchParams.keys()]};
                summary.disc1.mailpitView = await mailpitView(page, app, mail.id, `disc1-mailpit-${app.name}`);
            }
            summary.disc1.authorMail = slim(mail);
            summary.disc1.m1MailCount = await mailCount(app, email(m1), `${scratch.tag}d1`);
            summary.disc1.m1Mail = slim(await mailFor(app, email(m1), `${scratch.tag}d1`, 10000));
            await signIn(page, au);
            summary.disc1.authorTasks = await tasksWindow(page, app, cp, `disc1-tasks-author-${app.name}`, 'dashboard/mySubmissions');
            await signOut(page);
        });
        if (!link1()) {
            summary.blocked.push('no discussion email with a footer link on this app (see disc1); the Unsubscribe phases need it');
            return;
        }
        // ---- mailpit / profile: re-runs of two disc1/unsub1 legs (named phases only; the full run does them inline).
        await phase('mailpit', async () => {
            if (!ONLY_PHASES) return;
            summary.disc1.mailpitView = await mailpitView(page, app, summary.disc1.authorMail.id, `disc1-mailpit-${app.name}`);
        });
        await phase('profile', async () => {
            if (!ONLY_PHASES) return;
            // Discussion 1's link may be dead by now (a7); use the Manager's own discussion-2 link and account.
            const l = (summary.disc2 && summary.disc2.m1Mail && summary.disc2.m1Mail.unsubscribeLink) || link1();
            const who = summary.disc2 && summary.disc2.m1Mail && summary.disc2.m1Mail.unsubscribeLink ? m1 : au;
            summary.profile = {addressee: who};
            await visitUnsubscribe(page, l, `profile-page-${app.name}`);
            summary.profile.fromPage = await followProfileLink(page, app, who, `profile-from-page-${app.name}`);
            await signOut(page);
            await visitUnsubscribe(page, l, `profile-page-2-${app.name}`);
            await pressUnsubscribe(page, `profile-result-${app.name}`);
            summary.profile.fromResult = await followProfileLink(page, app, who, `profile-from-result-${app.name}`);
            // Signed in already: the link straight from the page.
            await visitUnsubscribe(page, l, `profile-page-3-${app.name}`);
            summary.profile.fromPageSignedIn = await followProfileLink(page, app, who, `profile-from-page-signed-in-${app.name}`);
            await signOut(page);
        });
        // ---- unsub1: Fields; Rules 8a, 8b, 8d, 8e; scenario 5's middle; broken links.
        await phase('unsub1', async () => {
            summary.unsub1 = {};
            summary.unsub1.page = compact(await visitUnsubscribe(page, link1(), `unsub1-page-${app.name}`));
            await loc(page, 'Unsubscribe page: the boxes', page.locator('input[type=checkbox]'));
            await loc(page, 'Unsubscribe page: the "user profile" link', page.getByRole('link', {name: 'user profile'}));
            await loc(page, 'Unsubscribe page: the heading', page.getByRole('heading', {name: 'Unsubscribe', exact: true}));
            // 8e on the page itself, signed out: Login, then the Profile page.
            summary.unsub1.profileFromPage = await followProfileLink(page, app, au, `unsub1-profile-from-page-${app.name}`);
            await signOut(page);
            // Press the button, then 8e again from the result page.
            await visitUnsubscribe(page, link1(), `unsub1-page-again-${app.name}`);
            summary.unsub1.result = compact(await pressUnsubscribe(page, `unsub1-result-${app.name}`));
            summary.unsub1.reopened = compact(await visitUnsubscribe(page, link1(), `unsub1-reopened-${app.name}`));
            await pressUnsubscribe(page, `unsub1-result-again-${app.name}`);
            summary.unsub1.profileFromResult = await followProfileLink(page, app, au, `unsub1-profile-from-result-${app.name}`);
            await signOut(page);
            // Broken links, signed out.
            const u = new URL(link1());
            const noValidate = new URL(u);
            noValidate.searchParams.delete('validate');
            const noId = new URL(u);
            noId.searchParams.delete('id');
            const cutAtAmp = link1().slice(0, link1().lastIndexOf('&'));
            const bigId = new URL(u);
            bigId.searchParams.set('id', '999999999');
            summary.unsub1.broken = {};
            for (const [k, l] of [['noValidate', noValidate.toString()], ['noId', noId.toString()], ['cutFromAmp', cutAtAmp], ['unknownId', bigId.toString()]]) {
                const r = await visitUnsubscribe(page, l, `unsub1-broken-${k}-${app.name}`);
                summary.unsub1.broken[k] = {status: r.status, h1: r.layout && r.layout.h1, title: r.layout && r.layout.title, headerText: r.layout && r.layout.headerText, bodyClass: r.layout && r.layout.bodyClass, boxCount: (r.boxes || []).length};
            }
        });
        // ---- tabAfter + disc2: scenario 5's second half.
        await phase('disc2', async () => {
            summary.disc2 = {};
            await signIn(page, au);
            summary.disc2.authorTabAfterUnsubscribe = tabSummary(await recordTab(page, app, cp, `disc2-tab-author-${app.name}`));
            await signOut(page);
            await signIn(page, m1);
            summary.disc2.open = await openDiscussion(page, app, cp, scratch.s1.submissionId, d2, `Second message ${scratch.tag}d2`, [/Ada Author/], 'disc2');
            await signOut(page);
            summary.disc2.m1Mail = slim(await mailFor(app, email(m1), `${scratch.tag}d2`, 45000));
            summary.disc2.authorMailCount = await mailCount(app, email(au), `${scratch.tag}d2`);
            summary.disc2.authorMailD1Count = await mailCount(app, email(au), `${scratch.tag}d1`);
            await signIn(page, au);
            summary.disc2.authorTasks = await tasksWindow(page, app, cp, `disc2-tasks-author-${app.name}`, 'dashboard/mySubmissions');
            await signOut(page);
        });
        // ---- s6: scenario 6, Actors row, Rules 8b/8c.
        await phase('s6', async () => {
            summary.s6 = {};
            await signIn(page, m1);
            summary.s6.m1TabBefore = tabSummary(await recordTab(page, app, cp, `s6-tab-m1-before-${app.name}`));
            summary.s6.page = compact(await visitUnsubscribe(page, link1(), `s6-page-as-m1-${app.name}`));
            summary.s6.headerWhileOnPage = summary.s6.page.layout && summary.s6.page.layout.headerText;
            const boxes = page.locator('input[type=checkbox]');
            const n = await boxes.count();
            for (let i = 0; i < n; i++) {
                const label = (await boxes.nth(i).evaluate((b) => (document.querySelector(`label[for="${b.id}"]`) || b.closest('label') || b.parentElement).innerText)).trim();
                if (!/^Discussion added\.?$/.test(label)) await boxes.nth(i).uncheck();
            }
            summary.s6.boxesBeforePress = (await readUnsubscribePage(page)).boxes.map((b) => `${b.checked ? '[x]' : '[ ]'} ${b.label}`);
            summary.s6.result = compact(await pressUnsubscribe(page, `s6-result-${app.name}`));
            summary.s6.m1TabAfter = tabSummary(await recordTab(page, app, cp, `s6-tab-m1-after-${app.name}`));
            await signOut(page);
            await signIn(page, au);
            summary.s6.authorTab = tabSummary(await recordTab(page, app, cp, `s6-tab-author-${app.name}`));
            await signOut(page);
        });
        // ---- a2: the page re-enables an email switched off on the tab (Rule 8c, A2).
        await phase('a2', async () => {
            summary.a2 = {};
            await signIn(page, au);
            let tab = await openTab(page, app, cp);
            const row = findRow(tab, /reviewer has commented/);
            summary.a2.row = row.sentence;
            await page.locator(`form#notificationSettingsForm input#${row.boxes[1].id}`).check();
            summary.a2.saveStatus = await saveTab(page);
            tab = await recordTab(page, app, cp, `a2-tab-after-tick-${app.name}`);
            summary.a2.tabAfterTick = tabSummary(tab);
            summary.a2.page = compact(await visitUnsubscribe(page, link1(), `a2-page-${app.name}`));
            const boxes = page.locator('input[type=checkbox]');
            const n = await boxes.count();
            for (let i = 0; i < n; i++) {
                const label = (await boxes.nth(i).evaluate((b) => (document.querySelector(`label[for="${b.id}"]`) || b.closest('label') || b.parentElement).innerText)).trim();
                if (/reviewer has commented/.test(label)) await boxes.nth(i).uncheck();
            }
            summary.a2.result = compact(await pressUnsubscribe(page, `a2-result-${app.name}`));
            summary.a2.tabAfterPage = tabSummary(await recordTab(page, app, cp, `a2-tab-after-page-${app.name}`));
            await signOut(page);
        });
        // ---- stale: Rule 8d's error branch — a page left open after its session ended.
        await phase('stale', async () => {
            summary.stale = {};
            await visitUnsubscribe(page, link1(), `stale-page-${app.name}`);
            // The visitor's session ends (cookies gone: a closed browser, an expired session); the old page is still open.
            await context.clearCookies();
            summary.stale.afterCookiesCleared = compact(await pressUnsubscribe(page, `stale-result-cookies-${app.name}`));
            // Second route: a sign-in and sign-out in another tab of the same browser while the page stays open.
            await visitUnsubscribe(page, link1(), `stale-page-2-${app.name}`);
            const other = await context.newPage();
            await signIn(other, au);
            await signOut(other);
            await other.close();
            summary.stale.afterSignInOutElsewhere = compact(await pressUnsubscribe(page, `stale-result-signinout-${app.name}`));
        });
        // ---- a9: the statistics email switched off; the tab drops the row, the page keeps its box.
        await phase('a9', async () => {
            summary.a9 = {};
            await signIn(page, m1);
            await page.goto(app.url(`/index.php/${cp}/management/settings/workflow`));
            const emailsTab = page.getByRole('tab', {name: 'Emails', exact: true});
            await emailsTab.waitFor({timeout: 30000});
            await emailsTab.click();
            const radios = page.locator('input[name="editorialStatsEmail"]');
            await radios.first().waitFor({timeout: 15000});
            const labels = await radios.evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (document.querySelector(`label[for="${e.id}"]`) || e.closest('label') || {}).innerText || null})));
            summary.a9.radiosBefore = labels;
            record(`a9-settings-before-${app.name}`, {...(await safeScreen(page)), labels});
            await shot(page, `a9-settings-before-${app.name}`);
            const off = radios.nth(labels.findIndex((l) => /Do not send/.test(l.label || '')));
            const saved = page.waitForResponse((r) => /^(PUT|POST)$/.test(r.request().method()) && /\/api\/v1\/contexts/.test(r.url()), {timeout: 20000});
            await off.evaluate((e) => (document.querySelector(`label[for="${e.id}"]`) || e).click());
            await page.locator('form').filter({has: radios.first()}).first().getByRole('button', {name: 'Save', exact: true}).first().click();
            summary.a9.saveStatus = (await saved).status();
            summary.a9.m1TabOff = tabSummary(await recordTab(page, app, cp, `a9-tab-m1-off-${app.name}`));
            const m1Link = summary.disc2 && summary.disc2.m1Mail && summary.disc2.m1Mail.unsubscribeLink;
            summary.a9.page = compact(await visitUnsubscribe(page, m1Link || link1(), `a9-page-${app.name}`));
            summary.a9.pageLinkAddressee = m1Link ? 'm1 (discussion 2)' : 'author (discussion 1)';
            await signOut(page);
        });
        // ---- a7: the Author deletes discussion 1's task; the link afterwards (Rule 7b, Side effects).
        await phase('a7', async () => {
            summary.a7 = {};
            await signIn(page, au);
            const {bellText, dialog} = await openTasks(page, app, cp, 'dashboard/mySubmissions');
            summary.a7.bellBefore = bellText;
            const row = dialog.locator('tr.gridRow').filter({hasText: d1}).first();
            summary.a7.rowText = await row.innerText().catch(() => null);
            await row.locator('input[type=checkbox]').check();
            await dialog.getByRole('link', {name: 'Delete', exact: true}).click();
            await idle(page);
            summary.a7.rowsAfter = await dialog.locator('tr.gridRow').evaluateAll((els) => els.map((e) => e.innerText.trim()));
            await shot(page, `a7-tasks-after-delete-${app.name}`);
            record(`a7-tasks-after-delete-${app.name}`, await safeScreen(page));
            await page.keyboard.press('Escape');
            const r1 = await visitUnsubscribe(page, link1(), `a7-link-signed-in-${app.name}`);
            summary.a7.linkSignedIn = {status: r1.status, h1: r1.layout && r1.layout.h1, title: r1.layout && r1.layout.title, boxCount: (r1.boxes || []).length};
            await signOut(page);
            const r2 = await visitUnsubscribe(page, link1(), `a7-link-signed-out-${app.name}`);
            summary.a7.linkSignedOut = {status: r2.status, h1: r2.layout && r2.layout.h1, title: r2.layout && r2.layout.title, boxCount: (r2.boxes || []).length};
        });
        // ---- ann: the announcement email's footer (Rule 7a first sentence) after the queued job ran; F7.
        await phase('ann', async () => {
            summary.ann = {};
            await signIn(page, m1);
            summary.ann.settings = await enableAnnouncements(page, app, cp, 'ann');
            summary.ann.add = await addAnnouncement(page, app, cp, `Announcement ${scratch.tag}`, true, 'ann-add');
            await signOut(page);
            summary.ann.beforeJobs = {r1MailCount: await mailCount(app, email(r1), `Announcement ${scratch.tag}`)};
            summary.ann.jobs = await drainJobs(app);
            const mail = await mailFor(app, email(r1), `Announcement ${scratch.tag}`, 30000);
            if (mail.found) record(`ann-mail-r1-${app.name}`, mail);
            summary.ann.r1Mail = slim(mail);
            summary.ann.authorMailCount = await mailCount(app, email(au), `Announcement ${scratch.tag}`);
            if (mail.found && mail.unsubscribeLink) {
                summary.ann.page = compact(await visitUnsubscribe(page, onProbeServer(app, mail.unsubscribeLink), `ann-page-r1-${app.name}`));
            }
        });
        // ---- issue (OJS): scenario 9; F21.
        if (app.name === 'ojs') {
            await phase('issue', async () => {
                summary.issue = {};
                await signIn(page, r1);
                let tab = await openTab(page, app, cp);
                const row = findRow(tab, /An issue has been published/);
                await page.locator(`#${row.boxes[0].id}`).uncheck();
                summary.issue.readerSave = await saveTab(page);
                summary.issue.readerTab = tabSummary(await recordTab(page, app, cp, `issue-tab-reader-${app.name}`));
                await signOut(page);
                await signIn(page, m1);
                await page.goto(app.url(`/index.php/${cp}/manageIssues`));
                await idle(page);
                const create = page.getByRole('link', {name: 'Create Issue', exact: true}).first();
                await create.waitFor({timeout: 30000});
                record(`issue-issues-${app.name}`, await safeScreen(page));
                await shot(page, `issue-issues-${app.name}`);
                const alreadyThere = await page.getByText(`Issue ${scratch.tag}`).count();
                if (!alreadyThere) {
                await create.click();
                const issueForm = page.locator('form#issueForm');
                await issueForm.locator('input[name=volume]').waitFor({timeout: 30000});
                await issueForm.locator('input[name=volume]').fill('1');
                await issueForm.locator('input[name=number]').fill('1');
                await issueForm.locator('input[name=year]').fill('2026');
                await issueForm.locator('input[name^=title]').first().fill(`Issue ${scratch.tag}`).catch(() => {});
                await issueForm.getByRole('button', {name: 'Save', exact: true}).click();
                await issueForm.waitFor({state: 'hidden', timeout: 30000});
                await idle(page);
                record(`issue-created-${app.name}`, await safeScreen(page));
                await shot(page, `issue-created-${app.name}`);
                }
                // The row's actions are folded: expand the row first.
                const publish = page.getByRole('link', {name: 'Publish Issue', exact: true}).first();
                if (!(await publish.isVisible())) {
                    await page.locator('tr.gridRow').filter({hasText: `Issue ${scratch.tag}`}).first().locator('a.show_extras, .show_extras').first().click();
                    await idle(page);
                }
                await publish.waitFor({timeout: 15000});
                await publish.click();
                const dialog = page.locator('[role="dialog"]:visible').last();
                await dialog.locator('#sendIssueNotification').waitFor({timeout: 30000});
                summary.issue.dialog = {text: await dialog.innerText(), boxDefault: await dialog.locator('#sendIssueNotification').isChecked(), buttons: await dialog.locator('button, input[type=submit], a.pkp_button, a.ok, a.cancelButton').allInnerTexts()};
                record(`issue-publish-dialog-${app.name}`, {...(await safeScreen(page)), ...summary.issue.dialog});
                await shot(page, `issue-publish-dialog-${app.name}`);
                const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /publish-issue/.test(r.url()), {timeout: 30000}).catch(() => null);
                await dialog.getByRole('button', {name: 'OK', exact: true}).click();
                const response = await posted;
                summary.issue.postStatus = response ? response.status() : null;
                await dialog.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                await idle(page);
                summary.issue.afterPublishText = await page.locator('main, body').first().innerText().then((t) => t.slice(0, 1500)).catch(() => null);
                record(`issue-after-publish-${app.name}`, await safeScreen(page));
                await shot(page, `issue-after-publish-${app.name}`);
                await signOut(page);
                summary.issue.beforeJobs = {abMailCount: await mailCount(app, email(ab), `Issue ${scratch.tag}`)};
                summary.issue.jobs = await drainJobs(app);
                const mail = await mailFor(app, email(ab), `Issue ${scratch.tag}`, 30000);
                if (mail.found) record(`issue-mail-author-${app.name}`, mail);
                summary.issue.abMail = slim(mail);
                summary.issue.r1MailCount = await mailCount(app, email(r1), `Issue ${scratch.tag}`);
            });
        }
        // ---- a8: the needs-editor email's shape (from this fleet's own mail today) and the "Publication Published" email.
        await phase('a8', async () => {
            summary.a8 = {};
            // (a) needs-editor: newest message with that subject whose links point at this app's ports.
            try {
                const found = await app.mail._get('/api/v1/search', {query: 'subject:"needs an editor"', limit: '50'});
                const portRe = new RegExp(`127\\.0\\.0\\.1:${app.basePort.toString().slice(0, 2)}\\d\\d/`);
                let pick = null;
                for (const m of found.messages || []) {
                    const full = await app.mail.fullMessage(m.ID);
                    if (portRe.test(full.Text || '')) {
                        pick = m;
                        break;
                    }
                }
                summary.a8.needsEditor = pick ? slim(await describeMessage(app, pick)) : {found: false, note: 'no needs-editor email from this app in Mailpit'};
                if (pick) record(`a8-needs-editor-mail-${app.name}`, await describeMessage(app, pick));
            } catch (error) {
                summary.a8.needsEditor = {error: String(error.message).split('\n')[0]};
            }
            // (b) publish S2 through the workflow (OMP "Publish", OPS "Post"); OJS's issue step is left to the report.
            if (!scratch.s2 || !scratch.s2.submissionId) {
                summary.a8.published = {skipped: 'S2 not seeded', s2: scratch.s2};
                return;
            }
            if (app.name === 'ojs') {
                summary.a8.published = {skipped: 'OJS publish needs the issue step of the Review Publishing Details panel; not driven here'};
                return;
            }
            await signIn(page, m1);
            await page.goto(app.url(`/index.php/${cp}/dashboard/editorial?workflowSubmissionId=${scratch.s2.submissionId}`));
            const publishBtn = page.getByRole('button', {name: app.name === 'ops' ? 'Post' : 'Publish', exact: true});
            // The stage's own action: OPS "Post the preprint", OMP "Schedule For Publication" (U49 Rule 2).
            const stageAction = page.getByRole('button', {name: app.name === 'ops' ? 'Post the preprint' : 'Schedule For Publication', exact: true});
            await publishBtn.or(stageAction).first().waitFor({timeout: 45000});
            record(`a8-workflow-${app.name}`, await safeScreen(page));
            await shot(page, `a8-workflow-${app.name}`);
            summary.a8.stageActionUsed = await stageAction.isVisible();
            if (summary.a8.stageActionUsed) {
                await stageAction.click();
            }
            // OPS: "Post the preprint" reveals "Post"; OMP: "Schedule For Publication" lands on Publication › Title & Abstract, whose "Publish" opens the window.
            await publishBtn.waitFor({timeout: 30000});
            await publishBtn.click();
            const dialog = app.name === 'ops' ? page.getByRole('dialog').filter({hasText: /post/i}).last() : page.getByRole('dialog', {name: /Schedule For Publication/});
            await dialog.waitFor({timeout: 30000});
            summary.a8.dialogText = await dialog.innerText();
            record(`a8-publish-dialog-${app.name}`, await safeScreen(page));
            await shot(page, `a8-publish-dialog-${app.name}`);
            const published = page.waitForResponse((r) => /\/publish$/.test(r.url().split('?')[0]) && r.request().method() === 'PUT', {timeout: 30000}).catch(() => null);
            const pressedAt = new Date();
            await dialog.getByRole('button', {name: app.name === 'ops' ? 'Post' : 'Publish', exact: true}).last().click();
            const response = await published;
            summary.a8.publishStatus = response ? response.status() : null;
            await dialog.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
            record(`a8-after-publish-${app.name}`, await safeScreen(page));
            await shot(page, `a8-after-publish-${app.name}`);
            await signOut(page);
            let mail = await mailFor(app, email(ab), `Publish me ${scratch.tag}`, 15000);
            if (!mail.found) {
                summary.a8.jobs = await drainJobs(app);
                mail = await mailFor(app, email(ab), `Publish me ${scratch.tag}`, 15000);
            }
            if (mail.found) {
                record(`a8-published-mail-${app.name}`, mail);
                summary.a8.publishedMailDelaySeconds = (new Date(mail.created) - pressedAt) / 1000;
            }
            summary.a8.published = slim(mail);
            await signIn(page, ab);
            summary.a8.abTasks = await tasksWindow(page, app, cp, `a8-tasks-author-${app.name}`, 'dashboard/mySubmissions');
            await signOut(page);
        });
        // ---- a5: the mail program's own Unsubscribe (Mailpit reads List-Unsubscribe and offers one-click).
        await phase('a5', async () => {
            summary.a5 = {};
            const m = summary.disc2 && summary.disc2.m1Mail;
            if (!m || !m.id) {
                summary.a5.skipped = 'no discussion-2 email for the Manager';
                return;
            }
            await signIn(page, m1);
            summary.a5.m1TabBefore = tabSummary(await recordTab(page, app, cp, `a5-tab-m1-before-${app.name}`));
            await page.goto(`${mailpitUi(app)}/view/${m.id}`);
            const unsub = page.getByText('Unsubscribe', {exact: true}).first();
            await unsub.waitFor({timeout: 20000});
            await unsub.click();
            const modal = page.locator('.modal:visible, [role=dialog]:visible').last();
            await modal.waitFor({timeout: 10000}).catch(() => {});
            // Mailpit 1.31 offers no one-click button: the press unfolds an "Unsubscribe" row with the header's link.
            summary.a5.infoRow = await page.locator('tr').filter({has: page.locator('th', {hasText: /^Unsubscribe$/})}).first().innerText().catch(() => null);
            summary.a5.modalText = await modal.innerText().catch(() => null);
            summary.a5.modalButtons = await modal.locator('button, a.btn').allInnerTexts().catch(() => []);
            record(`a5-mailpit-unsubscribe-dialog-${app.name}`, {...(await safeScreen(page)), modalText: summary.a5.modalText, modalButtons: summary.a5.modalButtons});
            await shot(page, `a5-mailpit-unsubscribe-dialog-${app.name}`);
            const go = modal.locator('button, a.btn').filter({hasText: /unsubscribe|send|post/i}).last();
            if (await go.count()) {
                await go.click();
                await modal.getByText(/success|error|fail|status|response|\b[45]\d\d\b|\b200\b/i).first().waitFor({timeout: 20000}).catch(() => {});
                summary.a5.afterPress = await modal.innerText().catch(() => null);
                record(`a5-mailpit-unsubscribe-result-${app.name}`, {...(await safeScreen(page)), afterPress: summary.a5.afterPress});
                await shot(page, `a5-mailpit-unsubscribe-result-${app.name}`);
            }
            summary.a5.m1TabAfter = tabSummary(await recordTab(page, app, cp, `a5-tab-m1-after-${app.name}`));
            await signOut(page);
        });
        // ---- review: the review-complete email's "automated" footer (Rule 7a). Own small context: a Section Editor on the submission and an accepted reviewer.
        if (app.name !== 'ops') {
            await phase('review', async () => {
                summary.review = {};
                let rs = scratch.review;
                if (!rs) {
                    const t = tag('u05k4r');
                    const users = [
                        {username: `${t}se`, givenName: 'Sena', familyName: 'SectionEd', roles: ['sectionEditor']},
                        {username: `${t}au`, givenName: 'Ada', familyName: 'Author', roles: ['author']},
                        {username: `${t}rv`, givenName: 'Rex', familyName: 'Reviewer', roles: ['externalReviewer']},
                    ];
                    const created = await app.api.createContext({tag: t, users});
                    const sub = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, title: `Review me ${t}`, submitted: true, decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: `${t}rv`, status: 'accepted'}]}], participants: [{username: `${t}se`, role: 'sectionEditor'}]});
                    rs = {tag: t, path: t, se: `${t}se`, au: `${t}au`, rv: `${t}rv`, created, sub};
                    scratch.review = rs;
                    scratchAll[app.name] = scratch;
                    fs.writeFileSync(SCRATCH_FILE, JSON.stringify(scratchAll, null, 2));
                }
                summary.review.scratch = {path: rs.path, submissionId: rs.sub.submissionId};
                await signIn(page, rs.rv);
                await page.goto(app.url(`/index.php/${rs.path}/reviewer/submission/${rs.sub.submissionId}`));
                await idle(page).catch(() => {});
                record(`review-step-open-${app.name}`, await safeScreen(page));
                await shot(page, `review-step-open-${app.name}`);
                // Walk the steps: accept (if asked), continue, then the review form.
                for (let i = 0; i < 4; i++) {
                    const consent = page.locator('input[name="privacyConsent"], input[type=checkbox][name*="onsent"]');
                    if (await consent.count()) await consent.first().check().catch(() => {});
                    const next = page.getByRole('button', {name: /Accept Review, Continue to Step|Continue to Step|Save and continue/i}).first();
                    if (!(await next.count()) || !(await next.isVisible().catch(() => false))) break;
                    await next.click();
                    await idle(page).catch(() => {});
                    record(`review-step-${i + 2}-${app.name}`, await safeScreen(page));
                    await shot(page, `review-step-${i + 2}-${app.name}`);
                }
                const submit = page.getByRole('button', {name: 'Submit Review', exact: true}).first();
                await submit.waitFor({timeout: 30000});
                const frames = page.locator('iframe');
                summary.review.editorCount = await frames.count();
                for (let i = 0; i < summary.review.editorCount; i++) {
                    const body = page.frameLocator('iframe').nth(i).locator('body');
                    await body.click();
                    await body.fill(`Review comment ${rs.tag} (${i + 1})`);
                }
                const rec = page.locator('select#reviewerRecommendationId, select[name="reviewerRecommendationId"]').first();
                if (await rec.count()) {
                    summary.review.recommendationOptions = await rec.locator('option').allInnerTexts();
                    await rec.selectOption({label: 'Accept Submission'});
                    summary.review.recommendationChosen = await rec.inputValue();
                }
                summary.review.formText = (await page.locator('form').filter({has: submit}).innerText().catch(() => '')).slice(0, 1500);
                record(`review-form-filled-${app.name}`, await safeScreen(page));
                await shot(page, `review-form-filled-${app.name}`);
                const pressedAt = new Date();
                await submit.click();
                const confirm = page.locator('[role="dialog"]:visible').last();
                await confirm.waitFor({timeout: 10000}).catch(() => {});
                summary.review.confirmText = await confirm.innerText().catch(() => null);
                record(`review-confirm-${app.name}`, await safeScreen(page));
                await shot(page, `review-confirm-${app.name}`);
                const ok = confirm.getByRole('button', {name: /^(OK|Submit|Confirm)$/}).first();
                if (await ok.count()) await ok.click();
                await page.getByText('Review Submitted', {exact: false}).first().waitFor({timeout: 20000}).catch(() => {});
                await idle(page).catch(() => {});
                summary.review.afterSubmit = {url: page.url(), errors: await page.locator('.pkp_form_error, .pkp_form_error_list, .formError, [id$="-error"]').allInnerTexts().catch(() => []), mainHead: (await page.locator('main, #main, .pkp_structure_main').first().innerText().catch(() => '')).slice(0, 400)};
                record(`review-after-submit-${app.name}`, {...(await safeScreen(page)), ...summary.review.afterSubmit});
                await shot(page, `review-after-submit-${app.name}`);
                await signOut(page);
                const mail = await mailFor(app, email(rs.se), `Review me ${rs.tag}`, 30000);
                if (mail.found) {
                    record(`review-mail-se-${app.name}`, mail);
                    summary.review.mailDelaySeconds = (new Date(mail.created) - pressedAt) / 1000;
                }
                summary.review.seMail = slim(mail);
            });
        }
        // ---- tail: three late reads. A Reader's Tasks window after the announcement email (A7: nothing to delete), the
        // Author's whole mailbox after the Unsubscribe presses (Side effects: no confirmation email), and the tab the
        // "user profile" link lands on (Rule 8e) read from the Profile page's tab strip.
        await phase('tail', async () => {
            summary.tail = {};
            summary.tail.authorMailbox = {total: await mailCount(app, email(au)), d1: await mailCount(app, email(au), `${scratch.tag}d1`), d2: await mailCount(app, email(au), `${scratch.tag}d2`), unsubscribeWord: await mailCount(app, email(au), 'unsubscribed')};
            await signIn(page, r1);
            summary.tail.readerTasks = await tasksWindow(page, app, cp, `tail-tasks-reader-${app.name}`, 'user/profile');
            await signOut(page);
            const l = summary.disc2 && summary.disc2.m1Mail && summary.disc2.m1Mail.unsubscribeLink;
            if (l) {
                await signIn(page, m1);
                await visitUnsubscribe(page, l, `tail-page-m1-${app.name}`);
                await page.getByRole('link', {name: 'user profile'}).first().click();
                await page.waitForLoadState('domcontentloaded');
                await idle(page).catch(() => {});
                await page.locator('#profileTabs').waitFor({timeout: 15000}).catch(() => {});
                summary.tail.profile = {url: page.url(), title: await page.title(), tabs: await page.locator('#profileTabs > ul > li').evaluateAll((els) => els.map((e) => ({name: e.innerText.trim(), selected: e.getAttribute('aria-selected') === 'true' || e.classList.contains('ui-tabs-active')})))};
                record(`tail-profile-m1-${app.name}`, {...(await safeScreen(page)), ...summary.tail.profile});
                await shot(page, `tail-profile-m1-${app.name}`);
                await signOut(page);
            }
        });
    } finally {
        record(`k4-summary-${app.name}`, summary);
        await close();
    }
});
