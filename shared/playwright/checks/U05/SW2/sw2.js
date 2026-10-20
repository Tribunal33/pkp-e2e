// U05 drift sweep 2026-10-20, chunk SW2 (docs/process/briefs/claim-check.md): the
// Notifications tab's rows per role, the Tasks panel's frame, Rule 5d's site-level
// address, the statistics setting at its off end, the Tasks panel's page size, the
// review-complete email to an assigned manager, the reviewer's "assignment changed"
// email against the reviewer's own boxes (Rule 6's closing sentence), the
// "Publication Published" email against the author's box (A8), the OJS issue email
// with its box unticked, the announcements switch, registration's reader-side header
// and a journal created on Administration › Hosted Journals ("Forms" languages).
// K2 (ann, issue, site) and K3 cover the rest of the chunk; this script fills what
// their records leave open.
//
// Per app, one scratch journal (ctx A) with one account per permission level, and a
// second one (ctx B) with the editorial statistics email off. Phases (PHASES=…
// narrows; the scratch file of the run carries the contexts between processes):
//   setup     the two contexts, the seeded submissions
//   roles     every level's Notifications tab (rows, defaults, what else the form offers);
//             the Manager leaves the tab once with an unsaved change
//   panel     the Tasks window's frame: empty (Reader) and with rows (Manager); its
//             buttons pressed on the empty list
//   site      Rule 5d: one-journal accounts at the site-level addresses; admin's
//             site-level bell against a journal's; the site home's header
//   stats     ctx B (statistics email off): the tab, the Emails radio, the monthly run;
//             ctx A's run as the control
//   perpage   the Tasks window's page size and its "per page" choice (26 discussions)
//   review    OJS, OMP: a fresh submission in review (Section editor and Journal/Press editor
//             seeded as participants); the review stage's Participants › "Assign" roles and an
//             attempt to assign the second Manager in the manager role; the reviewer's "assignment
//             changed" email with default boxes and with every "Enable…" unticked; the review
//             submitted; who is emailed, who gets a task
//   publish   every app: one author with defaults, one with the email box ticked under
//             "A new version of your submission…"; each item published on screen
//   annoff    with "Enable announcements" off: the page at its address, an announcement posted
//             there with its email box ticked, the mailboxes, the email's link and the public page
//   issueoff  OJS: one issue published with the email box unticked, one ticked (control)
//   register  scenario 8's reader-side header on the journal's home page
//   hosted    admin creates a journal on Hosted Journals; its Languages grid; its Register page
//
// Run (main, per app, under the slot's lock), twice (PROBE_RUN r1, r2):
//   PROBE_RUN=r1 PROBE_FEATURE=U05 PROBE_AGENT=ccSW2 bin/app-lock.sh shared ojs -- \
//     node bin/probe.js ojs shared/playwright/checks/U05/SW2/sw2.js
// Outputs: .reports/U05/ccSW2/ (sw2-summary-<run>-<app>.json, one snapshot per screen).
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outFile, drainJobs, users: rosterUsers} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30000;
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : null;
const on = (p) => !PHASES || PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // sampling only
const flat = (s, n = 600) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const email = (u) => `${u}@mail.test`;
// one file per app and run: processes of different apps run at once (each under its own app lock)
const SCRATCH_FILE = outFile(`sw2-scratch-${process.env.PROBE_APPS}.json`);
const scratchAll = fs.existsSync(SCRATCH_FILE) ? JSON.parse(fs.readFileSync(SCRATCH_FILE, 'utf8')) : {};
const saveScratch = () => fs.writeFileSync(SCRATCH_FILE, JSON.stringify(scratchAll, null, 2));

async function safeScreen(page) {
    try {
        return await screen(page);
    } catch (e) {
        return {url: page.url(), screenError: flat(e.message, 300)};
    }
}
async function snap(page, name, extra = {}) {
    const data = {...(await safeScreen(page)), ...extra};
    record(name, data);
    await shot(page, name).catch(() => {});
    return data;
}

// ------------------------------------------------------------------ the tab
async function readTab(page) {
    const form = page.locator('form#notificationSettingsForm');
    await form.waitFor({timeout: T});
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
            const bx = [...el.querySelectorAll('input[type=checkbox]')].map((i) => ({id: i.id, name: i.name, checked: i.checked, disabled: i.disabled}));
            out.rows.push({group, sentence: labelEl ? labelEl.innerText.trim() : null, enable: bx[0] && bx[0].checked, email: bx[1] && bx[1].checked, emailDisabled: bx[1] && bx[1].disabled, ids: bx.map((b) => b.id)});
        }
        out.intro = (f.querySelector('p') || {}).innerText || null;
        out.links = [...f.querySelectorAll('a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')}));
        out.buttons = [...f.querySelectorAll('button')].map((b) => b.innerText.trim());
        out.otherText = [...f.querySelectorAll('p, .pkp_form_required, .required_fields, span.description')].map((e) => e.innerText.trim()).filter(Boolean).slice(0, 8);
        out.textInputs = f.querySelectorAll('input[type=text], textarea, select').length;
        return out;
    });
}
async function selectedTab(page) {
    return page.locator('[role="tab"][aria-selected="true"], .ui-tabs-active a').first().innerText({timeout: 5000}).catch(() => null);
}
async function openTab(page, app, ctx) {
    await page.goto(app.url(`/index.php/${ctx}/user/profile/notificationSettings`));
    await idle(page);
    return readTab(page);
}
async function saveTab(page) {
    const form = page.locator('form#notificationSettingsForm');
    const action = await form.getAttribute('action');
    const saved = page.waitForResponse((r) => r.url().startsWith(action.split('?')[0]) && r.request().method() === 'POST', {timeout: 20000});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const status = (await saved).status();
    const toast = page.locator('.app__notifications .pkpNotification').last();
    const text = await toast.innerText({timeout: 8000}).catch(() => null);
    return {status, toast: flat(text, 120)};
}

// ------------------------------------------------------------ Tasks window
async function openBell(page) {
    const bell = page.getByRole('button', {name: /^Tasks/});
    await bell.waitFor({timeout: T});
    const bellText = flat(await bell.innerText());
    await bell.click();
    const dialog = page.getByRole('dialog').filter({has: page.locator('#notificationsGrid, [id^="component-grid-notifications"], .pkp_controllers_grid')}).last();
    await dialog.waitFor({timeout: T});
    await dialog.getByText('Mark New').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return {bellText, dialog};
}
async function readWindow(dialog) {
    return dialog.evaluate((d) => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const rows = [...d.querySelectorAll('tr.gridRow')].map((tr) => ({text: txt(tr), unread: !!tr.querySelector('.unread')}));
        return {
            heading: [...d.querySelectorAll('h1, h2, h3')].map(txt),
            buttons: [...d.querySelectorAll('button')].map((b) => ({text: txt(b), aria: b.getAttribute('aria-label'), disabled: b.disabled})),
            links: [...d.querySelectorAll('a')].map((a) => txt(a)).filter(Boolean).slice(0, 40),
            columns: [...d.querySelectorAll('th')].map(txt),
            rows,
            counter: txt(d.querySelector('.gridPaging, .pkp_linkaction_moreItems, .gridPagingItems, [class*="Paging"]')),
            selects: [...d.querySelectorAll('select')].map((s) => ({name: s.name, id: s.id, value: s.value, options: [...s.options].map((o) => o.text)})),
            textEntry: d.querySelectorAll('input[type=text], input[type=search], input:not([type]), textarea, [contenteditable="true"]').length,
            checkboxes: d.querySelectorAll('input[type=checkbox]').length,
            text: txt(d).slice(0, 1500),
            height: d.getBoundingClientRect().height,
            viewport: window.innerHeight,
        };
    });
}
async function closeWindow(page, dialog) {
    await dialog.getByRole('button', {name: 'Close', exact: true}).first().click().catch(async () => page.keyboard.press('Escape'));
    await dialog.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
}
async function tasksAt(page, app, address, name) {
    await page.goto(app.url(address));
    const {bellText, dialog} = await openBell(page);
    const w = await readWindow(dialog);
    await snap(page, name, {bellText, window: w});
    await closeWindow(page, dialog);
    return {bellText, ...w};
}

// --------------------------------------------------------------------- mail
async function describeMessage(app, m) {
    const full = await app.mail.fullMessage(m.ID);
    let headers = null;
    try {
        headers = await app.mail._get(`/api/v1/message/${m.ID}/headers`);
    } catch {
        headers = null;
    }
    const text = full.Text || '';
    return {
        found: true, subject: m.Subject, from: m.From, created: m.Created,
        textTail: text.slice(-400),
        unsubscribeWord: /unsubscribe/i.test(text),
        listUnsubscribe: headers && headers['List-Unsubscribe'] ? headers['List-Unsubscribe'] : null,
    };
}
async function mailFor(app, to, opts, timeoutMs = 20000) {
    try {
        const m = await app.mail.find({to, ...opts, timeoutMs});
        return describeMessage(app, m);
    } catch (e) {
        return {found: false, error: flat(e.message, 200)};
    }
}
async function mailCount(app, to, opts) {
    try {
        return await app.mail.count({to, ...opts});
    } catch (e) {
        return `error: ${flat(e.message, 200)}`;
    }
}
async function mailSubjects(app, to, since) {
    try {
        const res = await app.mail._search({to, since});
        return (res.messages || []).map((m) => m.Subject);
    } catch (e) {
        return `error: ${flat(e.message, 200)}`;
    }
}

// --------------------------------------------------------------- the header
async function readerHeader(page) {
    return page.evaluate(() => {
        const wrap = document.querySelector('#navigationUserWrapper') || document.querySelector('.pkp_navigation_user_wrapper');
        if (!wrap) return null;
        const toggle = wrap.querySelector('a[data-toggle="dropdown"], a.dropdown-toggle, :scope > ul > li > a');
        const counts = [...wrap.querySelectorAll('.task_count')].map((c) => ({text: c.textContent.trim(), display: getComputedStyle(c).display, inEntry: (c.closest('li ul li a') || {}).textContent ? true : false}));
        const entries = [...wrap.querySelectorAll('ul ul a, .dropdown-menu a')].map((a) => ({source: a.textContent.replace(/\s+/g, ' ').trim(), shown: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}));
        return {nameShown: toggle ? toggle.innerText.replace(/\s+/g, ' ').trim() : null, nameSource: toggle ? toggle.textContent.replace(/\s+/g, ' ').trim() : null, counts, entries};
    });
}

// ------------------------------------------------------------- review helpers
const R = () => require(path.join(REPO, 'apps/omp/playwright/pages/ReviewerAssignmentPages.js'));
function dayFromNow(n) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
}
async function editReviewDue(page, app, ctx, sub, reviewerName, [responseDays, days], name) {
    const rr = sub.reviewRounds[0];
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${ctx}/dashboard/editorial?workflowSubmissionId=${sub.submissionId}&workflowMenuKey=workflow_${rr.stageId}_${rr.id}`));
    const modal = page.locator('[data-cy="active-modal"]').first();
    await modal.locator('[data-cy="reviewer-manager"]').waitFor({timeout: T});
    await idle(page);
    const pm = modal.locator('[data-cy="participant-manager"]').first();
    await pm.waitFor({timeout: 15000}).catch(() => {});
    const participants = flat(await pm.innerText().catch(() => null), 800);
    await snap(page, `${name}-workflow`, {participants});
    const row = R().reviewerRow(modal, reviewerName).first();
    const win = await R().openEditReview(page, row);
    await snap(page, `${name}-open`);
    await R().pickDate(page, win, 'responseDueDate', dayFromNow(responseDays));
    await R().pickDate(page, win, 'reviewDueDate', dayFromNow(days));
    const resp = page.waitForResponse((r) => /reviewer-grid\//.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    const pressedAt = new Date();
    await win.getByRole('button', {name: 'OK', exact: true}).last().click();
    const r = await resp;
    let body = null;
    if (r) {
        try {
            body = await r.json();
        } catch {
            body = null;
        }
    }
    await idle(page).catch(() => {});
    await snap(page, `${name}-after`);
    return {status: r ? r.status() : null, jsonStatus: body ? body.status : null, pressedAt: pressedAt.toISOString(), participants};
}
async function walkReview(page, app, ctx, sub, marker) {
    await page.goto(app.url(`/index.php/${ctx}/reviewer/submission/${sub.submissionId}`));
    await idle(page).catch(() => {});
    for (let i = 0; i < 4; i++) {
        const consent = page.locator('input[name="privacyConsent"], input[type=checkbox][name*="onsent"]');
        if (await consent.count()) await consent.first().check().catch(() => {});
        const next = page.getByRole('button', {name: /Accept Review, Continue to Step|Continue to Step|Save and continue/i}).first();
        if (!(await next.count()) || !(await next.isVisible().catch(() => false))) break;
        await next.click();
        await idle(page).catch(() => {});
    }
    const submit = page.getByRole('button', {name: 'Submit Review', exact: true}).first();
    await submit.waitFor({timeout: T});
    const n = await page.locator('iframe').count();
    for (let i = 0; i < n; i++) {
        const body = page.frameLocator('iframe').nth(i).locator('body');
        await body.click().catch(() => {});
        await body.fill(`Review comment ${marker} (${i + 1})`).catch(() => {});
    }
    const rec = page.locator('select#reviewerRecommendationId, select[name="reviewerRecommendationId"]').first();
    if (await rec.count()) await rec.selectOption({label: 'Accept Submission'});
    await snap(page, `review-filled`);
    await submit.click();
    const confirm = page.locator('[role="dialog"]:visible').last();
    await confirm.waitFor({timeout: 10000}).catch(() => {});
    const ok = confirm.getByRole('button', {name: /^(OK|Submit|Confirm)$/}).first();
    if (await ok.count()) await ok.click();
    await page.getByText('Review Submitted', {exact: false}).first().waitFor({timeout: 20000}).catch(() => {});
    return snap(page, `review-submitted`);
}

// ------------------------------------------------------------ publish helpers
async function publishOnScreen(page, app, ctx, submissionId, name) {
    if (app.name === 'ojs') {
        const {PublicationScreen} = require(path.join(REPO, 'apps/ojs/playwright/pages/PublicationMetadataPages.js'));
        const s = new PublicationScreen(page, ctx);
        await s.gotoWorkflow(submissionId);
        await s.openEntry('Title & Abstract');
        await snap(page, `${name}-workflow`);
        await s.publish();
        return snap(page, `${name}-after`);
    }
    await page.goto(app.url(`/index.php/${ctx}/dashboard/editorial?workflowSubmissionId=${submissionId}`));
    const publishBtn = page.getByRole('button', {name: app.name === 'ops' ? 'Post' : 'Publish', exact: true});
    const stageAction = page.getByRole('button', {name: app.name === 'ops' ? 'Post the preprint' : 'Schedule For Publication', exact: true});
    await publishBtn.or(stageAction).first().waitFor({timeout: 45000});
    await snap(page, `${name}-workflow`);
    if (await stageAction.isVisible()) await stageAction.click();
    await publishBtn.waitFor({timeout: T});
    await publishBtn.click();
    const dialog = app.name === 'ops' ? page.getByRole('dialog').filter({hasText: /post/i}).last() : page.getByRole('dialog', {name: /Schedule For Publication/});
    await dialog.waitFor({timeout: T});
    await snap(page, `${name}-dialog`);
    await dialog.getByRole('button', {name: app.name === 'ops' ? 'Post' : 'Publish', exact: true}).last().click();
    await dialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    return snap(page, `${name}-after`);
}

// ---------------------------------------------------------------------- main
forEachApp(async (app) => {
    const S = {app: app.name, line: app.line || 'main', problems: []};
    const phase = async (label, fn) => {
        if (!on(label)) return;
        const t0 = Date.now();
        try {
            S[label] = (await fn()) || {};
        } catch (e) {
            S.problems.push({phase: label, error: flat(e.stack || e, 900)});
        }
        S[`${label}Seconds`] = Math.round((Date.now() - t0) / 1000);
        record('sw2-summary', S, {merge: true});
    };
    const isOps = app.name === 'ops';
    const hasReview = !isOps;

    // ---- setup
    let sc = scratchAll[app.name];
    if (!sc) {
        const t = tag('u05sw2');
        const u = (k) => `${t}${k}`;
        const people = [
            {username: u('mg'), givenName: 'Mara', familyName: 'Manager', roles: ['manager']},
            {username: u('se'), givenName: 'Sena', familyName: 'Subeditor', roles: ['sectionEditor']},
            {username: u('as'), givenName: 'Asa', familyName: 'Assistant', roles: [isOps ? 'editorialBoardMember' : 'copyeditor']},
            {username: u('au'), givenName: 'Ada', familyName: 'Authorson', roles: ['author']},
            {username: u('aw'), givenName: 'Abel', familyName: 'Writer', roles: ['author']},
            {username: u('rd'), givenName: 'Rita', familyName: 'Reader', roles: ['reader']},
            {username: u('m2'), givenName: 'Milo', familyName: 'Managertwo', roles: ['manager']},
            {username: u('pp'), givenName: 'Pia', familyName: 'Pager', roles: ['manager']},
            {username: u('pq'), givenName: 'Quin', familyName: 'Pager', roles: ['manager']},
        ];
        if (!isOps) {
            people.push({username: u('ed'), givenName: 'Edda', familyName: 'Editor', roles: ['editor']});
            people.push({username: u('rv'), givenName: 'Rex', familyName: 'Reviewer', roles: ['externalReviewer']});
        }
        const ctxA = await app.api.createContext({tag: t, users: people});
        let ctxB;
        const bUsers = [{username: u('sb'), givenName: 'Sid', familyName: 'Statsoff', roles: ['manager']}, {username: u('sbs'), givenName: 'Sue', familyName: 'Statsoff', roles: ['sectionEditor']}];
        try {
            ctxB = await app.api.createContext({tag: `${t}b`, editorialStatsEmail: false, users: bUsers});
        } catch (e) {
            ctxB = {error: flat(e.message, 400)};
        }
        sc = {tag: t, ctx: ctxA.path || t, ctxB: ctxB.path || `${t}b`, ctxBRaw: ctxB.error ? ctxB : null, people: people.map((p) => p.username)};
        for (const k of ['mg', 'se', 'as', 'au', 'aw', 'rd', 'm2', 'pp', 'pq', 'ed', 'rv', 'sb', 'sbs']) sc[k] = u(k);
        const pubDecisions = isOps ? [] : ['skipExternalReview', 'sendToProduction'];
        sc.pub1 = await app.api.createSubmission({tag: `${t}p1`, context: sc.ctx, submitter: sc.au, title: `Publish one ${t}`, submitted: true, participants: [], ...(pubDecisions.length ? {decisions: pubDecisions} : {})});
        sc.pub2 = await app.api.createSubmission({tag: `${t}p2`, context: sc.ctx, submitter: sc.aw, title: `Publish two ${t}`, submitted: true, participants: [], ...(pubDecisions.length ? {decisions: pubDecisions} : {})});
        sc.pager = await app.api.createSubmission({tag: `${t}pg`, context: sc.ctx, submitter: sc.au, title: `Pager ${t}`, submitted: true, participants: [],
            tasks: Array.from({length: 26}, (_, i) => ({title: `Pg${String(i + 1).padStart(2, '0')} ${t}`, creator: sc.pp, participants: [sc.pp, sc.pq], message: `Page ${i + 1}`}))});
        scratchAll[app.name] = sc;
        saveScratch();
    }
    S.scratch = {tag: sc.tag, ctx: sc.ctx, ctxB: sc.ctxB, ctxBRaw: sc.ctxBRaw};
    const ctx = sc.ctx;
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), at: page.url()});
        await d.accept().catch(() => {});
    });
    try {
        // ---- roles: every level's tab
        await phase('roles', async () => {
            const out = {};
            const levels = ['mg', 'ed', 'se', 'as', 'rv', 'au', 'rd'].filter((k) => sc.people.includes(sc[k]));
            for (const k of levels) {
                await signIn(page, sc[k]);
                const tab = await openTab(page, app, ctx);
                out[k] = {selected: await selectedTab(page), groups: tab.groups, rows: tab.rows.map((r) => [r.group, r.sentence, r.enable, r.email, r.emailDisabled]), intro: tab.intro, links: tab.links, buttons: tab.buttons, otherText: tab.otherText, textInputs: tab.textInputs};
                await snap(page, `roles-tab-${k}`, {tab});
                if (k === 'mg') {
                    // Leave the tab once with an unsaved change: untick "Enable…" under "Discussion activity.",
                    // press "Identity", come back, then leave the page for the dashboard.
                    const form = page.locator('form#notificationSettingsForm');
                    const row = tab.rows.find((r) => r.sentence === 'Discussion activity.');
                    const box = form.locator(`#${row.ids[0]}`);
                    const before = dialogs.length;
                    await box.uncheck();
                    await box.blur().catch(() => {});
                    await page.getByRole('tab', {name: 'Identity', exact: true}).click();
                    await idle(page);
                    out.leave = {afterIdentity: {selected: await selectedTab(page), dialogs: dialogs.slice(before)}};
                    await snap(page, 'roles-mg-left-to-identity');
                    await page.getByRole('tab', {name: 'Notifications', exact: true}).click();
                    await idle(page);
                    const back = await readTab(page);
                    out.leave.backOnTab = back.rows.find((r) => r.sentence === 'Discussion activity.');
                    await snap(page, 'roles-mg-back-on-tab');
                    const before2 = dialogs.length;
                    await page.goto(app.url(`/index.php/${ctx}/dashboard/editorial`));
                    await idle(page).catch(() => {});
                    out.leave.leavePage = {url: page.url(), dialogs: dialogs.slice(before2)};
                    const again = await openTab(page, app, ctx);
                    out.leave.afterReturn = again.rows.find((r) => r.sentence === 'Discussion activity.');
                    await snap(page, 'roles-mg-after-return');
                    // "Save" with nothing changed.
                    out.saveUnchanged = await saveTab(page);
                    // The privacy statement link the form carries.
                    const privacy = page.locator('form#notificationSettingsForm a').filter({hasText: /privacy statement/i}).first();
                    if (await privacy.count()) {
                        out.privacyHref = await privacy.getAttribute('href');
                        await page.goto(new URL(out.privacyHref, app.baseURL).toString());
                        await idle(page).catch(() => {});
                        out.privacyLanded = {url: page.url(), title: await page.title()};
                        await snap(page, 'roles-mg-privacy');
                    }
                }
                await signOut(page);
            }
            const ref = JSON.stringify((out.mg || {}).rows);
            out.sameAsManager = Object.fromEntries(levels.map((k) => [k, JSON.stringify(out[k].rows) === ref]));
            // admin, enrolled as a manager of every scratch journal
            await signIn(page, 'admin');
            const at = await openTab(page, app, ctx);
            out.admin = {rows: at.rows.map((r) => [r.group, r.sentence, r.enable, r.email]), same: JSON.stringify(at.rows.map((r) => [r.group, r.sentence, r.enable, r.email, r.emailDisabled])) === ref};
            await snap(page, 'roles-tab-admin');
            await signOut(page);
            return out;
        });

        // ---- panel: the Tasks window's frame
        await phase('panel', async () => {
            const out = {};
            await signIn(page, sc.rd);
            await page.goto(app.url(`/index.php/${ctx}/user/profile`));
            let {bellText, dialog} = await openBell(page);
            out.empty = {bellText, ...(await readWindow(dialog))};
            out.empty.aria = (await safeScreen(page)).aria;
            await snap(page, 'panel-empty-rd', {window: out.empty});
            for (const b of ['Mark New', 'Mark Read', 'Delete']) {
                const before = dialogs.length;
                const reqs = [];
                const listener = (r) => { if (/\$\$\$call\$\$\$|\/api\//.test(r.url())) reqs.push({method: r.method(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160)}); };
                page.on('request', listener);
                await dialog.getByRole('link', {name: b, exact: true}).or(dialog.getByRole('button', {name: b, exact: true})).first().click().catch((e) => { reqs.push({clickError: flat(e.message, 120)}); });
                await sleep(1500);
                await idle(page).catch(() => {});
                page.off('request', listener);
                const s = await safeScreen(page);
                out[`press${b.replace(/\s/g, '')}`] = {dialogs: dialogs.slice(before), requests: reqs, notices: s.notices, windowOpen: await dialog.isVisible()};
            }
            await snap(page, 'panel-empty-after-presses');
            await closeWindow(page, dialog);
            out.closedByClose = !(await dialog.isVisible().catch(() => false));
            await signOut(page);
            await signIn(page, sc.mg);
            await page.goto(app.url(`/index.php/${ctx}/dashboard/editorial`));
            ({bellText, dialog} = await openBell(page));
            out.rows = {bellText, ...(await readWindow(dialog))};
            await snap(page, 'panel-rows-mg', {window: out.rows});
            await closeWindow(page, dialog);
            await signOut(page);
            return out;
        });

        // ---- site: Rule 5d's site-level address for one-journal accounts; admin's site-level bell
        await phase('site', async () => {
            const out = {};
            for (const k of ['rd', 'mg']) {
                await signIn(page, sc[k]);
                out[k] = {};
                for (const [key, addr] of [['bare', '/index.php/index/user/profile'], ['notifications', '/index.php/index/user/profile/notificationSettings'], ['password', '/index.php/index/user/profile/password'], ['enBare', '/index.php/index/en/user/profile']]) {
                    await page.goto(app.url(addr));
                    await idle(page).catch(() => {});
                    await page.locator('[role="tab"][aria-selected="true"]').first().waitFor({timeout: 10000}).catch(() => {});
                    out[k][key] = {address: addr, landed: page.url().replace(app.baseURL, ''), selected: await selectedTab(page), hasNotificationForm: await page.locator('form#notificationSettingsForm').count(), visibleForm: await page.locator('form#notificationSettingsForm').isVisible().catch(() => false)};
                    await snap(page, `site-${k}-${key}`);
                }
                // the site home's "View Profile"
                await page.goto(app.url('/index.php/index/en'));
                await idle(page).catch(() => {});
                out[k].siteHomeHeader = await readerHeader(page);
                const vp = (out[k].siteHomeHeader && out[k].siteHomeHeader.entries || []).find((e) => /View Profile/.test(e.source));
                if (vp) {
                    await page.goto(new URL(vp.href, app.baseURL).toString());
                    await idle(page).catch(() => {});
                    out[k].viewProfile = {href: vp.href.replace(app.baseURL, ''), landed: page.url().replace(app.baseURL, ''), selected: await selectedTab(page)};
                    await snap(page, `site-${k}-view-profile`);
                }
                await signOut(page);
            }
            // manager.maya (read-only) on the site's home page
            await signIn(page, 'manager.maya');
            await page.goto(app.url('/index.php/index/en'));
            await idle(page).catch(() => {});
            out.mayaSiteHome = await readerHeader(page);
            await snap(page, 'site-maya-home', {header: out.mayaSiteHome});
            await signOut(page);
            // admin: site-level bell against the seeded journal's editorial page, three tries
            await signIn(page, 'admin');
            out.adminBell = [];
            for (let i = 0; i < 3; i++) {
                const site = await tasksAt(page, app, '/index.php/index/en/user/profile', `site-admin-bell-site-${i}`);
                const journal = await tasksAt(page, app, `/index.php/${app.contextPath}/en/dashboard/editorial`, `site-admin-bell-journal-${i}`);
                const a = site.rows.map((r) => r.text);
                const b = journal.rows.map((r) => r.text);
                out.adminBell.push({siteBell: site.bellText, journalBell: journal.bellText, siteCounter: site.counter, journalCounter: journal.counter, same: JSON.stringify(a) === JSON.stringify(b), sameSorted: JSON.stringify([...a].sort()) === JSON.stringify([...b].sort()), siteFirst: a.slice(0, 3), journalFirst: b.slice(0, 3)});
                if (out.adminBell[i].same) break;
            }
            await page.goto(app.url('/index.php/index/en'));
            await idle(page).catch(() => {});
            out.adminSiteHome = await readerHeader(page);
            await snap(page, 'site-admin-home', {header: out.adminSiteHome});
            await signOut(page);
            return out;
        });

        // ---- stats: ctx B with the statistics email off
        await phase('stats', async () => {
            const out = {ctxBRaw: sc.ctxBRaw};
            await signIn(page, sc.sb);
            const tab = await openTab(page, app, sc.ctxB);
            out.tabB = tab.rows.map((r) => r.sentence);
            await snap(page, 'stats-tab-b');
            await page.goto(app.url(`/index.php/${sc.ctxB}/management/settings/workflow#emails`));
            await idle(page);
            await page.locator('input[name="editorialStatsEmail"]').first().waitFor({timeout: T}).catch(() => {});
            out.radiosB = await page.locator('input[name="editorialStatsEmail"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || {}).innerText || null})));
            await snap(page, 'stats-settings-b');
            await signOut(page);
            const since = new Date();
            try {
                out.runB = await app.api.runTask({task: 'statisticsReport', context: sc.ctxB});
            } catch (e) {
                out.runB = {error: flat(e.message, 500)};
            }
            try {
                out.runA = await app.api.runTask({task: 'statisticsReport', context: ctx});
            } catch (e) {
                out.runA = {error: flat(e.message, 500)};
            }
            out.mailA = await mailFor(app, email(sc.mg), {subject: 'activity for', since}, 30000);
            out.mailB = {sb: await mailCount(app, email(sc.sb), {since}), sbs: await mailCount(app, email(sc.sbs), {since})};
            await signIn(page, sc.sb);
            out.tasksB = await tasksAt(page, app, `/index.php/${sc.ctxB}/dashboard/editorial`, 'stats-tasks-b');
            await signOut(page);
            return out;
        });

        // ---- perpage: 26 discussion tasks for pp
        await phase('perpage', async () => {
            const out = {};
            await signIn(page, sc.pp);
            await page.goto(app.url(`/index.php/${ctx}/dashboard/editorial`));
            let {bellText, dialog} = await openBell(page);
            out.first = {bellText, ...(await readWindow(dialog))};
            out.first.rowCount = out.first.rows.length;
            await snap(page, 'perpage-first', {window: out.first});
            await loc(page, 'Tasks window: the paging line', dialog.locator('.gridPaging, [class*="Paging"]').first());
            const sel = dialog.locator('select').first();
            if (await sel.count()) {
                const opts = await sel.locator('option').allInnerTexts();
                const pick = opts.map((o) => o.trim()).filter((o) => /^\d+$/.test(o)).sort((a, b) => Number(b) - Number(a))[0];
                out.choice = {options: opts, picked: pick};
                await sel.selectOption({label: pick});
                await sleep(1500);
                await idle(page);
                out.afterChoice = await readWindow(dialog);
                out.afterChoice.rowCount = out.afterChoice.rows.length;
                await snap(page, 'perpage-after-choice', {window: out.afterChoice});
                await closeWindow(page, dialog);
                ({bellText, dialog} = await openBell(page));
                out.reopenedSamePage = await readWindow(dialog);
                out.reopenedSamePage.rowCount = out.reopenedSamePage.rows.length;
                await snap(page, 'perpage-reopened');
                await closeWindow(page, dialog);
                await page.reload();
                ({bellText, dialog} = await openBell(page));
                out.afterReload = await readWindow(dialog);
                out.afterReload.rowCount = out.afterReload.rows.length;
                await snap(page, 'perpage-after-reload');
            } else {
                // no select: the pager's own links
                out.pagerLinks = await dialog.locator('.gridPaging a, [class*="Paging"] a').allInnerTexts().catch(() => []);
            }
            const next = dialog.locator('.gridPaging a, [class*="Paging"] a').filter({hasText: /^(2|>|›|Next)$/}).first();
            if (await next.count()) {
                await next.click();
                await sleep(1500);
                await idle(page);
                out.page2 = await readWindow(dialog);
                out.page2.rowCount = out.page2.rows.length;
                await snap(page, 'perpage-page2');
            }
            await closeWindow(page, dialog);
            await signOut(page);
            return out;
        });

        // ---- review (OJS, OMP)
        if (hasReview) await phase('review', async () => {
            const out = {};
            const rvName = 'Rex Reviewer';
            const stamp = Date.now().toString(36).slice(-4);
            const title = `Review me ${sc.tag}${stamp}`;
            const sub = await app.api.createSubmission({tag: `${sc.tag}r${stamp}`, context: ctx, submitter: sc.au, title, submitted: true,
                decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: sc.rv, status: 'accepted'}]}],
                participants: [{username: sc.se, role: 'sectionEditor'}, {username: sc.ed, role: 'editor'}]});
            out.submissionId = sub.submissionId;
            // The second Manager assigned on screen, in the manager role, from the review stage's Participants panel.
            const managerGroup = app.name === 'omp' ? 'Press manager' : 'Journal manager';
            await signIn(page, sc.mg);
            const rr = sub.reviewRounds[0];
            const wf = app.url(`/index.php/${ctx}/dashboard/editorial?workflowSubmissionId=${sub.submissionId}&workflowMenuKey=workflow_${rr.stageId}_${rr.id}`);
            await page.goto(wf);
            let modal = page.locator('[data-cy="active-modal"]').first();
            let pm = modal.locator('[data-cy="participant-manager"]').first();
            await pm.waitFor({timeout: T});
            await idle(page);
            await pm.getByRole('button', {name: 'Assign', exact: true}).click();
            const amodal = page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')});
            await amodal.locator('select[name="filterUserGroupId"]').waitFor({timeout: T});
            out.assignGroups = (await amodal.locator('select[name="filterUserGroupId"] option').allInnerTexts()).map((x) => x.trim());
            await snap(page, 'review-assign-open', {groups: out.assignGroups});
            if (out.assignGroups.includes(managerGroup)) {
                const RS = require(path.join(REPO, 'apps/ojs/playwright/pages/ReviewStagePages.js'));
                try {
                    await RS.completeAssignParticipantForm(page, {group: managerGroup, name: 'Milo Managertwo', searchName: 'Managertwo'});
                    out.m2Assigned = true;
                } catch (e) {
                    out.m2AssignError = flat(e.message, 400);
                    await snap(page, 'review-assign-failed');
                }
            }
            await page.goto('about:blank');
            await page.goto(wf);
            modal = page.locator('[data-cy="active-modal"]').first();
            pm = modal.locator('[data-cy="participant-manager"]').first();
            await pm.waitFor({timeout: T});
            await idle(page);
            out.participantsAfterAssign = flat(await pm.innerText(), 600);
            await snap(page, 'review-participants-after-assign', {participants: out.participantsAfterAssign});
            // the same panel on the Submission stage
            await page.goto('about:blank');
            await page.goto(app.url(`/index.php/${ctx}/dashboard/editorial?workflowSubmissionId=${sub.submissionId}&workflowMenuKey=workflow_1`));
            pm = page.locator('[data-cy="active-modal"]').first().locator('[data-cy="participant-manager"]').first();
            await pm.waitFor({timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            out.participantsSubmissionStage = flat(await pm.innerText().catch(() => null), 600);
            await snap(page, 'review-participants-submission-stage');
            await signOut(page);
            // control: the reviewer's boxes at their defaults
            await signIn(page, sc.m2);
            out.edit1 = await editReviewDue(page, app, ctx, sub, rvName, [10, 20], 'review-edit1');
            await signOut(page);
            out.edit1.mail = await mailSubjects(app, email(sc.rv), new Date(Date.parse(out.edit1.pressedAt) - 1000));
            await sleep(4000);
            out.edit1.mailLater = await mailSubjects(app, email(sc.rv), new Date(Date.parse(out.edit1.pressedAt) - 1000));
            // the reviewer unticks every "Enable…" and saves
            await signIn(page, sc.rv);
            const tab = await openTab(page, app, ctx);
            const form = page.locator('form#notificationSettingsForm');
            for (const r of tab.rows) await form.locator(`#${r.ids[0]}`).uncheck();
            out.rvSave = await saveTab(page);
            const after = await openTab(page, app, ctx);
            out.rvTabAfter = after.rows.map((r) => [r.sentence, r.enable, r.email]);
            await snap(page, 'review-rv-tab-all-unticked');
            await signOut(page);
            await signIn(page, sc.m2);
            out.edit2 = await editReviewDue(page, app, ctx, sub, rvName, [12, 25], 'review-edit2');
            await signOut(page);
            await sleep(4000);
            out.edit2.mail = await mailSubjects(app, email(sc.rv), new Date(Date.parse(out.edit2.pressedAt) - 1000));
            // the review
            await signIn(page, sc.rv);
            const pressed = new Date();
            out.submitted = (await walkReview(page, app, ctx, sub, sc.tag)).url;
            await signOut(page);
            out.seMail = await mailFor(app, email(sc.se), {contains: title, subject: 'Review complete'}, 30000);
            out.m2Mail = await mailFor(app, email(sc.m2), {contains: title, subject: 'Review complete'}, 15000);
            out.mgCount = await mailCount(app, email(sc.mg), {contains: title, subject: 'Review complete'});
            out.edMail = await mailFor(app, email(sc.ed), {contains: title, subject: 'Review complete'}, 15000);
            out.since = pressed.toISOString();
            for (const k of ['se', 'm2', 'ed']) {
                await signIn(page, sc[k]);
                const w = await tasksAt(page, app, `/index.php/${ctx}/dashboard/editorial`, `review-tasks-${k}`);
                out[`${k}Tasks`] = w.rows.map((r) => r.text);
                await signOut(page);
            }
            return out;
        });

        // ---- publish: the author's "A new version…" email against the author's box
        await phase('publish', async () => {
            const out = {};
            await signIn(page, sc.aw);
            const tab = await openTab(page, app, ctx);
            const row = tab.rows.find((r) => /A new version of your submission/.test(r.sentence));
            await page.locator(`form#notificationSettingsForm #${row.ids[1]}`).check();
            out.awSave = await saveTab(page);
            const after = await openTab(page, app, ctx);
            out.awRow = after.rows.find((r) => /A new version of your submission/.test(r.sentence));
            await snap(page, 'publish-aw-tab');
            await signOut(page);
            await signIn(page, sc.mg);
            for (const [k, sub] of [['p1', sc.pub1], ['p2', sc.pub2]]) {
                const at = new Date();
                try {
                    out[`${k}Screen`] = (await publishOnScreen(page, app, ctx, sub.submissionId, `publish-${k}`)).url;
                } catch (e) {
                    out[`${k}Error`] = flat(e.stack || e, 700);
                    await snap(page, `publish-${k}-failed`);
                }
                out[`${k}At`] = at.toISOString();
            }
            await signOut(page);
            out.auMail = await mailFor(app, email(sc.au), {subject: 'Publication Published', contains: `Publish one ${sc.tag}`}, 30000);
            out.awMailCount = await mailCount(app, email(sc.aw), {contains: `Publish two ${sc.tag}`});
            out.awSubjects = await mailSubjects(app, email(sc.aw), new Date(out.p2At));
            for (const k of ['au', 'aw']) {
                await signIn(page, sc[k]);
                const w = await tasksAt(page, app, `/index.php/${ctx}/dashboard/mySubmissions`, `publish-tasks-${k}`);
                out[`${k}Tasks`] = w.rows.map((r) => r.text);
                await signOut(page);
            }
            return out;
        });

        // ---- annoff: before announcements are enabled
        await phase('annoff', async () => {
            const out = {};
            await signIn(page, sc.mg);
            await page.goto(app.url(`/index.php/${ctx}/management/settings/announcements`));
            await idle(page).catch(() => {});
            out.page = {url: page.url().replace(app.baseURL, ''), title: await page.title(), addButtons: await page.getByRole('button', {name: /Add Announcement/i}).count(), mainText: flat(await page.locator('main, body').first().innerText().catch(() => ''), 500)};
            await snap(page, 'annoff-page');
            await page.goto(app.url(`/index.php/${ctx}/management/settings/website`));
            await page.locator('#setup-button').waitFor({timeout: T});
            await page.locator('#setup-button').click();
            const annTab = page.getByRole('tab', {name: 'Announcements', exact: true});
            await annTab.click();
            const box = page.getByRole('checkbox', {name: /Enable announcements/i});
            await box.waitFor({timeout: 15000});
            out.switchTicked = await box.isChecked();
            // every entry of the side menu is in the DOM, closed groups included (patterns.md pitfall 2)
            out.sideMenuAnnouncementLinks = await page.locator('a[href*="management/settings/announcements"]').evaluateAll((as) => as.map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})));
            await snap(page, 'annoff-switch');
            // the page still offers "Add Announcement": post one with its email box ticked
            const annTitle = `Switch off announcement ${sc.tag}`;
            await page.goto(app.url(`/index.php/${ctx}/management/settings/announcements`));
            const add = page.getByRole('button', {name: /Add Announcement/i}).first();
            await add.waitFor({timeout: T});
            await add.click();
            const sendBox = page.getByRole('checkbox', {name: 'Send an email about this to all registered users.'});
            await sendBox.waitFor({timeout: T});
            const aform = sendBox.locator('xpath=ancestor::form[1]');
            await aform.locator('input[name^="title"], input[id^="title"]').first().fill(annTitle);
            const body = aform.frameLocator('iframe').first().locator('body');
            await body.click();
            await body.fill(`Short description ${annTitle}`);
            await sendBox.check();
            await snap(page, 'annoff-form');
            const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/v1\/announcements/.test(r.url()), {timeout: T}).catch(() => null);
            await aform.getByRole('button', {name: 'Save', exact: true}).click();
            const resp = await posted;
            out.post = {status: resp ? resp.status() : null};
            await aform.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
            await snap(page, 'annoff-after-save');
            await signOut(page);
            const since = new Date(Date.now() - 60000);
            out.drain = await drainJobs(app).then((d) => ({passes: d.passes, counts: d.counts})).catch((e) => ({error: flat(e.message, 200)}));
            out.rdMail = await mailFor(app, email(sc.rd), {contains: annTitle, since}, 20000);
            out.counts = {};
            for (const k of ['rd', 'au', 'se']) out.counts[k] = await mailCount(app, email(sc[k]), {contains: annTitle});
            // the email's "Visit our website to read the full announcement" link, opened signed out
            const link = ((out.rdMail.textTail || '').match(/\/index\.php\/[^ ]+\/announcement\/view\/\d+/) || [])[0];
            if (link) {
                const resp = await page.goto(app.url(link));
                out.emailLink = {path: link, status: resp ? resp.status() : null, text: flat(await page.locator('body').innerText().catch(() => ''), 120)};
                await snap(page, 'annoff-email-link');
            }
            await page.goto(app.url(`/index.php/${ctx}/announcement`));
            await idle(page).catch(() => {});
            out.publicList = {url: page.url().replace(app.baseURL, ''), title: await page.title(), listsIt: (await page.getByText(annTitle).count()) > 0};
            await snap(page, 'annoff-public-list');
            return out;
        });

        // ---- issueoff (OJS): "Publish Issue" with its box unticked, then ticked
        if (app.name === 'ojs') await phase('issueoff', async () => {
            const out = {};
            const {createIssue, publishIssue} = require(path.join(REPO, 'apps/ojs/playwright/pages/PublicationMetadataPages.js'));
            const quiet = `Quiet issue ${sc.tag}`;
            const loud = `Loud issue ${sc.tag}`;
            await signIn(page, sc.mg);
            await createIssue(page, ctx, {volume: '7', number: '1', year: '2026', title: quiet});
            await createIssue(page, ctx, {volume: '7', number: '2', year: '2026', title: loud});
            await snap(page, 'issueoff-future');
            const since = new Date();
            await publishIssue(page, 'Vol. 7 No. 1 (2026)');
            // the second with the box as it arrives (ticked)
            const row = page.locator('tr.gridRow').filter({hasText: 'Vol. 7 No. 2 (2026)'});
            await row.locator('a.show_extras').click();
            await idle(page);
            await page.getByRole('link', {name: 'Publish Issue'}).click();
            const dialog = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish the new issue?'});
            const box = dialog.locator('input[type="checkbox"]').first();
            await box.waitFor({timeout: T});
            out.loudBoxDefault = await box.isChecked();
            await snap(page, 'issueoff-loud-dialog');
            await dialog.getByRole('button', {name: 'OK', exact: true}).click();
            await dialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await idle(page);
            await snap(page, 'issueoff-after');
            await signOut(page);
            out.drain = await drainJobs(app).then((d) => ({passes: d.passes, counts: d.counts})).catch((e) => ({error: flat(e.message, 200)}));
            out.rdLoud = await mailFor(app, email(sc.rd), {contains: loud, since}, 30000);
            out.counts = {};
            for (const k of ['rd', 'au', 'se', 'mg']) out.counts[k] = {quiet: await mailCount(app, email(sc[k]), {contains: quiet}), loud: await mailCount(app, email(sc[k]), {contains: loud})};
            return out;
        });

        // ---- register: scenario 8's reader-side header
        await phase('register', async () => {
            const out = {};
            const r1 = `${sc.tag}r1`;
            await signOut(page).catch(() => {});
            await page.goto(app.url(`/index.php/${ctx}/user/register`));
            await page.locator('#username').waitFor({timeout: T});
            await page.locator('#givenName').fill('Vera');
            await page.locator('#familyName').fill('Visitor');
            await page.locator('#affiliation').fill('Scratch University').catch(() => {});
            await page.locator('#country').selectOption('CZ').catch(() => {});
            await page.locator('#email').fill(email(r1));
            await page.locator('#username').fill(r1);
            await page.locator('#password').fill(rosterUsers.getPassword(r1));
            await page.locator('#password2').fill(rosterUsers.getPassword(r1));
            const consent = page.locator('input[name^="privacyConsent"]');
            for (let i = 0; i < (await consent.count()); i++) await consent.nth(i).check();
            out.emailConsentDefault = await page.locator('input[name="emailConsent"]').isChecked();
            await page.getByRole('button', {name: 'Register', exact: true}).click();
            await page.getByText(/Registration complete/).first().waitFor({timeout: T}).catch(() => {});
            out.landed = {url: page.url().replace(app.baseURL, ''), title: await page.title()};
            await page.goto(app.url(`/index.php/${ctx}`));
            await idle(page).catch(() => {});
            out.r1Home = await readerHeader(page);
            await snap(page, 'register-r1-home', {header: out.r1Home});
            const tab = await openTab(page, app, ctx);
            out.r1Tab = tab.rows.map((r) => [r.group, r.sentence, r.enable, r.email]);
            await signOut(page);
            // control: the scratch Manager on the same home page
            await signIn(page, sc.mg);
            await page.goto(app.url(`/index.php/${ctx}`));
            await idle(page).catch(() => {});
            out.mgHome = await readerHeader(page);
            await snap(page, 'register-mg-home', {header: out.mgHome});
            await signOut(page);
            return out;
        });

        // ---- hosted: a journal created on Administration › Hosted Journals
        await phase('hosted', async () => {
            const out = {};
            const path2 = `${sc.tag}h`;
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/en/admin/contexts'));
            await idle(page);
            const create = page.getByRole('link', {name: /^Create (Journal|Press|Server)$/}).first();
            out.createLabel = await create.innerText();
            await create.click();
            const nameInput = page.locator('#context-name-control-en, input[id^="context-name-control"]').first();
            await nameInput.waitFor({state: 'visible', timeout: T});
            const dlg = page.getByRole('dialog', {name: /Create (Journal|Press|Server)/}).first();
            await nameInput.fill(`Hosted ${sc.tag}`);
            await page.locator('#context-acronym-control-en, input[id^="context-acronym-control"]').first().fill(`HS${sc.tag.slice(-3).toUpperCase()}`);
            await dlg.getByRole('textbox', {name: /Principal Contact Name/}).fill('Hosted Contact');
            await dlg.getByRole('textbox', {name: /Principal Contact Email/}).fill(`${path2}-contact@mail.test`);
            await page.locator('#context-urlPath-control').fill(path2);
            await dlg.locator('select').filter({has: page.locator('option[value="CA"]')}).first().selectOption('CA');
            const english = dlg.getByRole('checkbox', {name: 'English', exact: true}).first();
            if ((await english.count()) && !(await english.isChecked())) await english.check();
            const primary = dlg.getByRole('radio', {name: 'English', exact: true}).first();
            if ((await primary.count()) && !(await primary.isChecked())) await primary.check();
            await snap(page, 'hosted-form');
            const saved = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() === 'POST', {timeout: 60000}).catch(() => null);
            await dlg.getByRole('button', {name: 'Save', exact: true}).click();
            const resp = await saved;
            out.save = resp ? {status: resp.status(), body: flat(await resp.text().catch(() => ''), 800)} : null;
            await dlg.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
            out.formOpen = await dlg.isVisible().catch(() => false);
            if (out.formOpen) {
                out.errors = await dlg.locator('[id$="-error"], .pkpFormFieldError, .pkpFieldError, [class*="Error"]').allInnerTexts().catch(() => []);
                await snap(page, 'hosted-refused');
            }
            await snap(page, 'hosted-after');
            if (out.save && out.save.status === 200) {
                await page.goto(app.url(`/index.php/${path2}/management/settings/website`));
                await page.locator('#setup-button').waitFor({timeout: T});
                await page.locator('#setup-button').click();
                await page.getByRole('tab', {name: 'Languages', exact: true}).click();
                await page.locator('tr.gridRow').first().waitFor({timeout: T});
                await idle(page);
                out.languages = await page.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => ({text: tr.innerText.replace(/\s+/g, ' ').trim(), boxes: [...tr.querySelectorAll('input[type=checkbox]')].map((i) => ({id: i.id.replace(/[0-9a-f]{13}$/, ''), checked: i.checked}))})));
                out.languageHeads = await page.locator('table th').allInnerTexts().catch(() => []);
                await snap(page, 'hosted-languages');
                await signOut(page);
                await page.goto(app.url(`/index.php/${path2}/user/register`));
                await idle(page).catch(() => {});
                out.register = {url: page.url().replace(app.baseURL, ''), title: await page.title(), emailConsent: await page.locator('input[name="emailConsent"]').count()};
                await snap(page, 'hosted-register');
            } else {
                await signOut(page).catch(() => {});
            }
            return out;
        });
    } finally {
        S.dialogs = dialogs;
        record('sw2-summary', S, {merge: true});
        await close();
    }
});
