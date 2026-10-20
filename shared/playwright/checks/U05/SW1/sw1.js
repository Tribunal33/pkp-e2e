// U05 drift sweep 2026-10-20, chunk SW1 (docs/process/briefs/claim-check.md): the lines the kept
// checks K1 (k1, k1-menu, k1-remainder), C05 and I28 do not settle. Each phase seeds its own scratch
// context (tag u05sw1…), signs in from the roster rule and records every screen with screen().
//
// Phases (PHASES=a,b,… narrows; default all):
//   pager   Rule 2b paging (26 tasks: "1 - 25 of 26 items", ">", ">>", "Items per page:"), Rule 2c the
//           blank part of a row, Rule 3 "Mark New" / "Delete" with no box ticked, the window left with a
//           box ticked and reopened, Escape, the window's controls (sweep)
//   order   A12: pairs of seeded submissions in the same second, then two Authors pressing the wizard's
//           final "Submit" at once (the hand pair); the window's order read three times against the
//           notifications' creation times; OPS3: the "needs an editor" email's link opened as the Manager
//   pub     scenario 10 / Rule 2b: the published-version task (Author) and its control (Manager);
//           Rules 2b, 2c: the statistics task (scenarios/task statisticsReport), pressed
//   roles   Actors row 3 / A3 by role (Production editor, Journal editor, Guest editor, Volume editor,
//           Series editor…), Rule 4b's "Open Menu" list; Actors' manager-level roles on Users & Roles ›
//           "Roles"; Actors row 1: the bell for a user with no role in the journal and for a user with
//           a role in no journal (site-level registration)
//   assign  OPS3 "stays listed until a moderator is assigned": the Manager's needs-editor row after the
//           workflow's Participants "Assign" of a Section editor / Series editor / Moderator
//   toast   Rule 9b over an open window: the "Notify" side panel's warning (hover keeps it, "×" removes it,
//           the window stays); "Add a Component" with Key -survey (same); 9c the Identity tab's save
//
// Run (main, per app, under the slot's lock), twice (PROBE_RUN r1, r2):
//   PROBE_RUN=r1 PROBE_FEATURE=U05 PROBE_AGENT=ccSW1 bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U05/SW1/sw1.js
// Outputs: .reports/U05/ccSW1/ (sw1-<phase>-<run>-<app>.json facts, one snapshot per screen)
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, sql} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const FIXTURES = {
    ojs: path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf'),
    ops: path.join(REPO, 'apps/ops/playwright/fixtures/files/preprint.pdf'),
};
const PHASES = (process.env.PHASES || 'pager,order,pub,roles,assign,toast').split(',');
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // sampling only, never a wait for state
const flat = (s, n = 600) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

// ------------------------------------------------------------ screen helpers
async function safeScreen(page) {
    try { return await screen(page); } catch (e) { return {url: page.url(), error: String(e.message).slice(0, 200)}; }
}
async function snap(page, name, extra = {}) {
    const s = await safeScreen(page);
    record(name, {...s, ...extra});
    await shot(page, name).catch(() => {});
    return s;
}
const bell = (page) => page.getByRole('button', {name: /^Tasks/});
async function bellState(page) {
    const b = bell(page);
    if (!(await b.count())) return {present: false};
    return b.first().evaluate((el) => {
        const badge = [...el.querySelectorAll('span')].find((s) => !s.classList.contains('-screenReader') && /^\d+$/.test(s.textContent.trim()));
        return {present: true, name: el.textContent.replace(/\s+/g, ' ').trim(), badge: badge ? badge.textContent.trim() : null, disabled: el.disabled};
    });
}
const win = (page) => page.getByRole('dialog').filter({has: page.getByRole('heading', {name: 'Tasks', exact: true})});
async function openWindow(page) {
    await bell(page).first().click();
    await win(page).waitFor({timeout: 20000});
    await win(page).locator('table').first().waitFor({timeout: 20000});
    await idle(page);
}
async function closeWindow(page) {
    await win(page).getByRole('button', {name: 'Close', exact: true}).first().click();
    await win(page).waitFor({state: 'detached', timeout: 15000}).catch(() => {});
}
async function rows(page) {
    return win(page).locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => {
        const q = (s) => tr.querySelector(s);
        const box = q('input[type=checkbox]');
        return {
            id: tr.id.replace(/^.*-row-/, ''),
            unread: !!q('div.task.unread'),
            sentence: q('.task .message') ? q('.task .message').innerText.trim() : null,
            weight: q('.task .message') ? getComputedStyle(q('.task .message')).fontWeight : null,
            acronym: q('.task .details .acronym') ? q('.task .details .acronym').innerText.trim() : null,
            title: q('.task .details .submission') ? q('.task .details .submission').innerText.trim() : null,
            checked: box ? box.checked : null,
        };
    }));
}
async function pager(page) {
    return win(page).evaluate((d) => {
        const t = (s) => [...d.querySelectorAll(s)].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
        const sel = d.querySelector('select');
        return {
            text: (d.querySelector('.gridPaging') || d.querySelector('.pkp_linkaction_container') || d).innerText.replace(/\s+/g, ' ').trim().slice(-300),
            links: t('.gridPaging a, .gridPaging span, .pkp_helpers_text_right a'),
            select: sel ? {label: (sel.closest('label, div') || {}).innerText?.replace(/\s+/g, ' ').trim().slice(0, 80), options: [...sel.options].map((o) => o.text.trim()), value: sel.value} : null,
            controls: [...d.querySelectorAll('a, button, input, select')].filter((e) => e.getClientRects().length).map((e) => ({tag: e.tagName.toLowerCase(), type: e.type || null, text: (e.innerText || e.value || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60)})),
        };
    });
}
async function act(page, label) {
    await win(page).getByRole('link', {name: label, exact: true}).click();
    await idle(page);
}
async function userNav(page) {
    return page.evaluate(() => {
        const wrap = document.querySelector('#navigationUserWrapper');
        const shown = (e) => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
        const textOf = (a) => [...a.childNodes].map((n) => (n.nodeType === 3 ? n.textContent : (shown(n) ? n.innerText : ''))).join(' ').replace(/\s+/g, ' ').trim();
        return wrap ? {
            links: [...wrap.querySelectorAll('a')].map((a) => ({displayed: textOf(a), source: a.textContent.replace(/\s+/g, ' ').trim(), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')})),
        } : null;
    });
}

// ------------------------------------------------------------ the wizard (from k1.js, stoppable at its final dialog)
function currentStep(page) { return page.locator('.pkpSteps__step__label--current'); }
async function continueTo(page, label) {
    const button = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
    for (let attempt = 0; ; attempt++) {
        await button.click();
        try { await currentStep(page).filter({hasText: label}).waitFor({timeout: 5000}); return; } catch (e) { if (attempt >= 2) throw e; }
    }
}
async function uploadWizardFile(page, app, marker) {
    if (app.name === 'ojs') {
        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', {name: 'Add File', exact: true}).click()]);
        await chooser.setFiles(FIXTURES.ojs);
        await page.getByRole('button', {name: 'Article Text', exact: true}).click();
        await page.locator('.listPanel__item--submissionFile').filter({hasText: 'article.pdf'}).getByText('Article Text').waitFor({timeout: 30000});
    } else if (app.name === 'omp') {
        await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles({name: `ms-${marker}.txt`, mimeType: 'text/plain', buffer: Buffer.from(`Manuscript ${marker}`)});
        const genreButton = page.locator('.listPanel--submissionFiles__setGenre').getByRole('button', {name: 'Book Manuscript', exact: true});
        await genreButton.waitFor({timeout: 30000});
        const saved = page.waitForResponse((r) => r.url().includes('/files/') && r.ok());
        await genreButton.click();
        await saved;
        await page.locator('.listPanel--submissionFiles__itemGenre').filter({hasText: 'Book Manuscript'}).first().waitFor({timeout: 20000});
    } else {
        const labelDialog = page.getByRole('dialog').filter({has: page.locator('#preprintGalleyForm')});
        await idle(page);
        for (let attempt = 0; ; attempt++) {
            await page.getByRole('link', {name: 'Add File', exact: true}).click();
            try { await labelDialog.first().waitFor({timeout: 5000}); break; } catch (e) { if (attempt >= 2) throw e; }
        }
        await labelDialog.locator('input[name="label"]').fill('PDF');
        await labelDialog.getByRole('button', {name: 'Save', exact: true}).click();
        const upload = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});
        const genreSelect = upload.locator('select[name="genreId"]').first();
        await genreSelect.waitFor({timeout: 30000});
        await genreSelect.selectOption({label: 'Preprint Text'});
        await upload.locator('input[type="file"]').setInputFiles(FIXTURES.ops);
        const cont = upload.getByRole('button', {name: 'Continue', exact: true});
        await cont.waitFor({timeout: 30000});
        await page.waitForFunction(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => x.innerText.trim() === 'Continue'); return b && !b.disabled; }, null, {timeout: 30000});
        await cont.click();
        await upload.getByRole('tab', {name: '2. Review Details'}).waitFor({timeout: 30000});
        await upload.getByRole('button', {name: 'Continue', exact: true}).click();
        await upload.getByRole('tab', {name: '3. Confirm'}).waitFor({timeout: 30000});
        await upload.getByRole('button', {name: 'Complete', exact: true}).click();
        await upload.waitFor({state: 'hidden', timeout: 30000});
        await idle(page);
        await page.locator('.submissionWizard').getByRole('link', {name: 'PDF'}).first().waitFor({timeout: 20000});
    }
}
/** The wizard from its start page to the final "Submit" dialog, open; returns the dialog's "Submit" button. */
async function wizardToDialog(page, app, ctx, title, name) {
    await page.goto(app.url(`/index.php/${ctx}/submission`));
    await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: 30000});
    await idle(page);
    const body = page.frameLocator('iframe.tox-edit-area__iframe').first().locator('body');
    await body.click();
    await body.fill(title);
    for (const box of [page.getByRole('checkbox', {name: /meets all of these requirements/}), page.getByRole('checkbox', {name: /agree to have my data collected/})]) {
        if (await box.count()) await box.check();
    }
    const radios = await page.getByRole('radio').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked})));
    const groups = {};
    for (const r of radios) (groups[r.name] ||= []).push(r);
    for (const [g, list] of Object.entries(groups)) if (!list.some((r) => r.checked)) await page.locator(`input[type=radio][name="${g}"]`).first().check();
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45000});
    const submissionId = Number(new URL(page.url()).searchParams.get('id'));
    await currentStep(page).filter({hasText: 'Upload Files'}).waitFor({timeout: 30000});
    await uploadWizardFile(page, app, `${ctx}${submissionId}`);
    await continueTo(page, 'Details');
    if (await page.locator('iframe[id*="-abstract-"]').count()) {
        const ab = page.frameLocator('iframe[id*="-abstract-"]').first().locator('body');
        await ab.click();
        await ab.fill(`Abstract for ${title}.`);
    }
    await continueTo(page, 'Contributors');
    if (app.name === 'ops') {
        await continueTo(page, 'For Readers');
        await page.getByRole('radio', {name: 'This preprint has not been published elsewhere.'}).check();
    } else {
        await continueTo(page, 'For the Editors');
    }
    const validated = page.waitForResponse((r) => r.url().includes('/submit') && r.request().method() === 'POST' && r.status() < 500, {timeout: 45000});
    await continueTo(page, 'Review');
    await validated;
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
    await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click();
    const d = page.getByRole('dialog').filter({hasText: /will be submitted to|Are you sure you want to (complete|submit)/});
    await d.waitFor({timeout: 30000});
    await snap(page, `${name}-dialog`);
    return {submissionId, submit: d.getByRole('button', {name: 'Submit', exact: true})};
}

// ------------------------------------------------------------ site-level registration (from K2's registerOn)
async function register(page, app, username, name) {
    await page.goto(app.url('/index.php/index/user/register'));
    await page.locator('#username').waitFor({timeout: 30000});
    await page.locator('#givenName').fill('Reg');
    await page.locator('#familyName').fill('Norole');
    await page.locator('#affiliation').fill('Scratch University').catch(() => {});
    await page.locator('#country').selectOption('CZ').catch(() => {});
    await page.locator('#email').fill(`${username}@mail.test`);
    await page.locator('#username').fill(username);
    for (const id of ['#password', '#password2']) {
        const field = page.locator(id);
        await field.evaluate((e) => e.removeAttribute('maxlength'));
        await field.fill(`${username}${username}`);
    }
    await snap(page, `${name}-form`);
    await page.getByRole('button', {name: 'Register', exact: true}).click();
    await page.waitForLoadState('domcontentloaded');
    await page.getByText(/Registration complete/).first().waitFor({timeout: 30000}).catch(() => {});
    await idle(page);
    await snap(page, `${name}-landing`);
    return {url: page.url(), title: await page.title()};
}

// ============================================================ the chunk
forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const NEEDS = isOJS ? 'A new article has been submitted to which an editor needs to be assigned.'
        : isOMP ? 'A new monograph has been submitted to which an editor needs to be assigned.'
            : 'A new preprint has been submitted to which a moderator needs to be assigned.';
    const SE_LABEL = isOMP ? 'Series editor' : isOPS ? 'Moderator' : 'Section editor';
    const STAGE = isOPS ? 'workflow_5' : 'workflow_1';
    const F = {app: app.name, run: process.env.PROBE_RUN || null, errors: {}};
    const phase = async (name, fn) => {
        if (!on(name)) return;
        const out = {};
        F[name] = out;
        const t0 = Date.now();
        try { await fn(out); } catch (e) { F.errors[name] = String(e.stack || e).slice(0, 900); }
        out.seconds = Math.round((Date.now() - t0) / 1000);
        record(`sw1-${name}`, out);
        console.log(`[sw1] ${app.name} ${name} ${F.errors[name] ? 'ERROR ' + F.errors[name].split('\n')[0] : 'ok'} (${out.seconds}s)`);
    };
    const mkUsers = (t, list) => list.map(([k, roles]) => ({username: `${t}${k}`, roles, givenName: k.toUpperCase(), familyName: 'Sweep'}));

    // ---------------------------------------------------------------- pager
    await phase('pager', async (out) => {
        const t = tag('u05sw1p');
        const pctx = await app.api.createContext({tag: t, users: mkUsers(t, [['pg', ['manager']], ['au', ['author']]])});
        for (let i = 1; i <= 26; i++) await app.api.createSubmission({tag: `${t}s${i}`, context: t, submitter: `${t}au`, title: `Pager ${String(i).padStart(2, '0')} ${t}`});
        const pgId = pctx.users.find((u) => u.username === `${t}pg`).id;
        // The tasks' creation times (the window's sort key) beside their ids, for the order read below.
        out.created = sql(app, `select n.notification_id, to_char(n.date_created,'HH24:MI:SS') from notifications n where n.user_id = ${pgId} and n.level = 3 order by n.notification_id`).split('\n').filter(Boolean).map((l) => l.replace('|', '@'));
        const {page, close} = await launch(app);
        const dialogs = [];
        page.on('dialog', (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); });
        try {
            await signIn(page, `${t}pg`, {contextPath: t});
            await page.goto(app.url(`/index.php/${t}/dashboard/editorial`)); await idle(page);
            out.bell = await bellState(page);
            await openWindow(page);
            await snap(page, 'sw1-pager-open');
            out.page1 = {rows: (await rows(page)).length, first: (await rows(page))[0], pager: await pager(page)};
            await loc(page, 'the Tasks window pager', win(page).locator('.gridPaging, .pkp_linkaction_container').first());
            // ">" (next page)
            const next = win(page).getByRole('link', {name: '>', exact: true});
            out.nextCount = await next.count();
            if (out.nextCount) {
                await next.first().click(); await idle(page);
                out.page2 = {rows: await rows(page), pager: await pager(page)};
                await snap(page, 'sw1-pager-page2');
            }
            // "Items per page:" 50
            const sel = win(page).locator('select').first();
            if (await sel.count()) {
                await sel.selectOption({label: '50'}); await idle(page);
                out.per50 = {rows: (await rows(page)).length, pager: await pager(page)};
                await snap(page, 'sw1-pager-50');
                await sel.selectOption({label: '10'}); await idle(page);
                out.per10 = {rows: (await rows(page)).length, pager: await pager(page)};
                await snap(page, 'sw1-pager-10');
                await sel.selectOption({label: '25'}); await idle(page);
            }
            // Rule 2c: the blank part of the first row (the cell's bottom-right corner, outside the link).
            const r0 = win(page).locator('tr.gridRow').first();
            const cell = r0.locator('td').last();
            const box = await cell.boundingBox();
            const urlBefore = page.url();
            const linkBox = await r0.locator('a').first().boundingBox();
            out.blank = {cell: box, link: linkBox};
            await page.mouse.click(box.x + box.width - 4, box.y + box.height - 3);
            await sleep(1500); await idle(page);
            out.blank.after = {sameUrl: page.url() === urlBefore, windowOpen: await win(page).isVisible(), row: (await rows(page))[0], dialogs: dialogs.length};
            await snap(page, 'sw1-pager-blank-press');
            // Rule 3: "Mark New" and "Delete" with no box ticked.
            const before = await rows(page);
            const req = [];
            const onReq = (r) => { if (/mark-new|mark-read|delete-notifications/.test(r.url())) req.push({url: r.url().replace(/^.*\$\$\$call\$\$\$/, ''), method: r.method()}); };
            page.on('request', onReq);
            for (const label of ['Mark New', 'Delete']) {
                const d0 = dialogs.length;
                await act(page, label);
                await sleep(800);
                const after = await rows(page);
                out[`none-${label}`] = {same: JSON.stringify(after) === JSON.stringify(before), count: after.length, dialogs: dialogs.slice(d0),
                    toasts: await page.locator('.pkpNotification').allInnerTexts()};
                await snap(page, `sw1-pager-none-${label.replace(' ', '')}`);
            }
            page.off('request', onReq);
            out.requestsWithNoneTicked = req;
            // The window left with a box ticked: closed, reopened.
            await win(page).locator('tr.gridRow input[type=checkbox]').nth(1).check();
            out.tickedBeforeClose = (await rows(page)).filter((r) => r.checked).map((r) => r.id);
            const d1 = dialogs.length;
            await closeWindow(page);
            out.leaveTicked = {dialogs: dialogs.slice(d1), bell: await bellState(page)};
            await openWindow(page);
            out.leaveTicked.reopened = (await rows(page)).filter((r) => r.checked).map((r) => r.id);
            await snap(page, 'sw1-pager-reopened');
            // Escape on the open window.
            await page.keyboard.press('Escape'); await sleep(800);
            out.escapeClosed = !(await win(page).isVisible().catch(() => false));
            // The header's select-all box, if any (sweep).
            if (!out.escapeClosed) await closeWindow(page);
            await openWindow(page);
            out.headerBoxes = await win(page).locator('th input[type=checkbox]').count();
            out.windowAria = (await safeScreen(page)).aria;
            await closeWindow(page);
            // The row's text is one link as wide as the task cell: a press to the right of the sentence, on
            // its own line (where a reader sees blank space), lands on the link.
            out.order = (await (async () => { await openWindow(page); const r = await rows(page); return r.map((x) => `${x.id}:${(x.title || '').slice(6, 8)}`); })());
            const r1 = win(page).locator('tr.gridRow').first();
            const textBox = await r1.locator('span.message').boundingBox();
            const linkBox2 = await r1.locator('a').first().boundingBox();
            const textRight = await r1.locator('span.message').evaluate((e) => { const rg = document.createRange(); rg.selectNodeContents(e); const rs = [...rg.getClientRects()]; return Math.max(...rs.map((x) => x.right)); });
            out.beside = {textBox, textRight, link: linkBox2, unreadBefore: (await rows(page))[0].unread};
            const urlB = page.url();
            await page.mouse.click(linkBox2.x + linkBox2.width - 30, textBox.y + 8);
            await page.waitForURL((u) => u.href !== urlB, {timeout: 15000}).catch(() => {});
            await idle(page);
            out.beside.after = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), left: page.url() !== urlB, windowOpen: await win(page).isVisible().catch(() => false)};
            await snap(page, 'sw1-pager-beside-text-press');
            out.dialogs = dialogs;
            await signOut(page);
        } finally { await close(); }
    });

    // ---------------------------------------------------------------- order (A12) + OPS3 email link
    await phase('order', async (out) => {
        const t = tag('u05sw1o');
        const ctx = await app.api.createContext({tag: t, users: mkUsers(t, [['om', ['manager']], ['a1', ['author']], ['a2', ['author']]])});
        const omId = ctx.users.find((u) => u.username === `${t}om`).id;
        const notif = () => sql(app, `select n.notification_id, to_char(n.date_created,'HH24:MI:SS.US'), n.assoc_id from notifications n where n.user_id = ${omId} and n.level = 3 order by n.notification_id`).split('\n').filter(Boolean).map((l) => l.split('|'));
        // Seeded pairs, each pair's two requests sent at once.
        out.pairs = [];
        for (let p = 1; p <= 3; p++) {
            const titles = [`Seed ${p}A ${t}`, `Seed ${p}B ${t}`];
            const t0 = Date.now();
            const res = await Promise.all(titles.map((ti, i) => app.api.createSubmission({tag: `${t}p${p}${i}`, context: t, submitter: `${t}a${i + 1}`, title: ti})));
            out.pairs.push({titles, ids: res.map((r) => r.submissionId), ms: Date.now() - t0});
        }
        out.notificationsAfterSeeds = notif();
        const {page, close} = await launch(app);
        page.on('dialog', (d) => d.accept().catch(() => {}));
        const readOrder = async (label) => {
            const reads = [];
            for (let i = 0; i < 3; i++) {
                await page.goto(app.url(`/index.php/${t}/dashboard/editorial`)); await idle(page);
                await openWindow(page);
                reads.push((await rows(page)).map((r) => `${r.id}:${r.title}`));
                if (i === 0) await snap(page, `sw1-order-${label}`);
                await closeWindow(page);
            }
            return reads;
        };
        try {
            await signIn(page, `${t}om`, {contextPath: t});
            out.seedReads = await readOrder('seeds');
            await signOut(page);
        } finally { await close(); }
        // The hand pair: two Authors at the final dialog, "Submit" pressed in both at once.
        const A = await launch(app), B = await launch(app);
        try {
            await signIn(A.page, `${t}a1`, {contextPath: t});
            await signIn(B.page, `${t}a2`, {contextPath: t});
            const [wa, wb] = await Promise.all([
                wizardToDialog(A.page, app, t, `Hand A ${t}`, 'sw1-order-wizA'),
                wizardToDialog(B.page, app, t, `Hand B ${t}`, 'sw1-order-wizB'),
            ]);
            out.hand = {ids: [wa.submissionId, wb.submissionId], pressedAt: new Date().toISOString()};
            await Promise.all([wa.submit.click(), wb.submit.click()]);
            await Promise.all([A.page, B.page].map((p) => p.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45000})));
            await snap(A.page, 'sw1-order-wizA-complete');
        } finally { await A.close(); await B.close(); }
        out.notificationsAfterHand = notif();
        const C = await launch(app);
        C.page.on('dialog', (d) => d.accept().catch(() => {}));
        try {
            await signIn(C.page, `${t}om`, {contextPath: t});
            const page2 = C.page;
            const reads = [];
            for (let i = 0; i < 3; i++) {
                await page2.goto(app.url(`/index.php/${t}/dashboard/editorial`)); await idle(page2);
                await openWindow(page2);
                reads.push((await rows(page2)).slice(0, 2).map((r) => `${r.id}:${r.title}`));
                if (i === 0) await snap(page2, 'sw1-order-hand');
                await closeWindow(page2);
            }
            out.handReads = reads;
            // OPS3: the "needs an editor" email of the hand pair, its link opened as the Manager.
            const m = await app.mail.find({to: `${t}om@mail.test`, contains: `Hand A ${t}`, timeoutMs: 20000}).catch((e) => ({error: e.message}));
            out.email = {subject: m.Subject || null, error: m.error || null};
            if (!m.error) {
                const full = await app.mail.fullMessage(m.ID).catch(() => null);
                const text = (full && (full.Text || full.HTML)) || m.Text || m.Snippet || '';
                out.email.links = [...new Set((text.match(/https?:\/\/[^\s"'<>)]+/g) || []))].slice(0, 10);
                const wf = out.email.links.find((l) => /workflow|dashboard|submission/.test(l));
                out.email.followed = wf || null;
                if (wf) {
                    await page2.goto(wf.replace(/^https?:\/\/[^/]+/, app.url('')));
                    await idle(page2);
                    await sleep(1500); await idle(page2);
                    const s = await snap(page2, 'sw1-order-email-link');
                    out.email.landing = {url: page2.url(), title: await page2.title(), dialogText: flat(s.text && s.text.dialog, 300), main: flat(s.text && s.text.main, 300)};
                }
            }
            await signOut(page2);
        } finally { await C.close(); }
    });

    // ---------------------------------------------------------------- pub: scenario 10 + the statistics task
    await phase('pub', async (out) => {
        const t = tag('u05sw1v');
        await app.api.createContext({tag: t, users: mkUsers(t, [['vm', ['manager']], ['va', ['author']], ['vb', ['author']]])});
        const title = `Published ${t}`;
        // A second Author assigned on the same submission (Rule 6 / scenario 10: "every user holding an Author assignment").
        const sub = await app.api.createSubmission({tag: t, context: t, submitter: `${t}va`, title, submitted: true, published: true, participants: [{username: `${t}vb`, role: 'author'}]});
        out.submissionId = sub.submissionId;
        const {page, close} = await launch(app);
        page.on('dialog', (d) => d.accept().catch(() => {}));
        try {
            await signIn(page, `${t}va`, {contextPath: t});
            await page.goto(app.url(`/index.php/${t}/dashboard/mySubmissions`)); await idle(page);
            out.authorBell = await bellState(page);
            await openWindow(page);
            out.authorRows = await rows(page);
            out.authorRowHtml = await win(page).locator('tr.gridRow').first().evaluate((tr) => tr.querySelector('.task').innerHTML.replace(/\s+/g, ' ').slice(0, 600)).catch(() => null);
            await snap(page, 'sw1-pub-author-window');
            await closeWindow(page);
            await signOut(page);
            await signIn(page, `${t}vb`, {contextPath: t});
            await page.goto(app.url(`/index.php/${t}/dashboard/mySubmissions`)); await idle(page);
            out.coAuthorBell = await bellState(page);
            await openWindow(page);
            out.coAuthorRows = await rows(page);
            await snap(page, 'sw1-pub-coauthor-window');
            await closeWindow(page);
            await signOut(page);
            await signIn(page, `${t}vm`, {contextPath: t});
            await page.goto(app.url(`/index.php/${t}/dashboard/editorial`)); await idle(page);
            await openWindow(page);
            out.managerRows = await rows(page);
            await snap(page, 'sw1-pub-manager-window');
            await closeWindow(page);
            // The statistics task.
            out.task = await app.api.runTask({task: 'statisticsReport', context: t}).catch((e) => ({error: String(e.message).slice(0, 300)}));
            await page.goto(app.url(`/index.php/${t}/dashboard/editorial`)); await idle(page);
            out.statsBell = await bellState(page);
            await openWindow(page);
            out.statsRows = await rows(page);
            await snap(page, 'sw1-pub-stats-window');
            const statsRow = win(page).locator('tr.gridRow').filter({hasText: 'kind reminder'}).first();
            out.statsRowCount = await statsRow.count();
            if (out.statsRowCount) {
                await statsRow.locator('span.message').click();
                await page.waitForURL((u) => !/dashboard\/editorial$/.test(u.pathname), {timeout: 30000}).catch(() => {});
                await idle(page);
                const s = await snap(page, 'sw1-pub-stats-landing');
                out.statsLanding = {url: page.url(), title: await page.title(), headings: await page.locator('h1, h2').allInnerTexts().catch(() => []), bell: await bellState(page), main: flat(s.text && s.text.main, 200)};
                await page.goto(app.url(`/index.php/${t}/dashboard/editorial`)); await idle(page);
                out.statsBellAfter = await bellState(page);
                await openWindow(page);
                out.statsRowsAfter = (await rows(page)).filter((r) => /kind reminder/.test(r.sentence || ''));
                await closeWindow(page);
            }
            await signOut(page);
        } finally { await close(); }
    });

    // ---------------------------------------------------------------- roles: Actors rows 1 and 3, manager-level roles
    await phase('roles', async (out) => {
        const t = tag('u05sw1r');
        const list = [['mg', ['manager']], ['se', ['sectionEditor']], ['au', ['author']], ['rd', ['reader']]];
        if (isOJS) list.push(['ed', ['editor']], ['pe', ['productionEditor']], ['ge', ['guestEditor']], ['fc', ['funding']], ['tr', ['translator']], ['rv', ['externalReviewer']]);
        if (isOMP) list.push(['ed', ['editor']], ['pe', ['productionEditor']], ['ve', ['volumeEditor']], ['ir', ['internalReviewer']], ['ca', ['chapterAuthor']]);
        if (isOPS) list.push(['eb', ['editorialBoardMember']]);
        await app.api.createContext({tag: t, users: mkUsers(t, list)});
        const t2 = `${t}x`;
        await app.api.createContext({tag: t2, users: mkUsers(t2, [['rd', ['reader']]])});
        const {page, close} = await launch(app);
        page.on('dialog', (d) => d.accept().catch(() => {}));
        try {
            out.nav = {};
            for (const [k] of list) {
                await signIn(page, `${t}${k}`, {contextPath: t});
                await page.setViewportSize({width: 1280, height: 900});
                await page.goto(app.url(`/index.php/${t}/index`)); await idle(page);
                const desk = await userNav(page);
                if (['pe', 'ge', 've', 'ed'].includes(k)) await snap(page, `sw1-roles-home-${k}-1280`);
                await page.setViewportSize({width: 800, height: 900});
                await page.goto(app.url(`/index.php/${t}/index`)); await idle(page);
                const openMenu = page.getByRole('button', {name: /Open Menu/i});
                const narrow = {openMenu: await openMenu.count(), openMenuText: await openMenu.first().innerText().catch(() => null)};
                if (narrow.openMenu) {
                    await openMenu.first().click(); await sleep(500);
                    narrow.nav = await userNav(page);
                    if (k === 'mg' || k === 'pe') await snap(page, `sw1-roles-home-${k}-800-open`);
                }
                await page.setViewportSize({width: 1280, height: 900});
                await page.goto(app.url(`/index.php/${t}/dashboard`)); await idle(page);
                out.nav[k] = {desk, narrow, dashboardLanding: page.url().replace(/^https?:\/\/[^/]+/, ''), bell: await bellState(page)};
                await signOut(page);
            }
            // Users & Roles › "Roles" as the Manager: each role's permission level.
            await signIn(page, `${t}mg`, {contextPath: t});
            await page.goto(app.url(`/index.php/${t}/management/settings/access`)); await idle(page);
            await page.getByRole('tab', {name: 'Roles', exact: true}).or(page.getByRole('link', {name: 'Roles', exact: true})).first().click();
            await idle(page);
            await page.locator('tr.gridRow').first().waitFor({timeout: 20000}).catch(() => {});
            await idle(page);
            await snap(page, 'sw1-roles-grid');
            out.rolesGrid = await page.locator('tr.gridRow').evaluateAll((trs) => trs.filter((tr) => tr.getClientRects().length).map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ')));
            out.rolesHeaders = await page.locator('table th').allInnerTexts().catch(() => []);
            await signOut(page);
            // A user with no role in this journal (a reader of another journal), on this journal's profile page.
            await signIn(page, `${t2}rd`, {contextPath: t2});
            await page.goto(app.url(`/index.php/${t}/user/profile`)); await idle(page);
            await snap(page, 'sw1-roles-norole-here-profile');
            out.noRoleHere = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), bell: await bellState(page)};
            if (out.noRoleHere.bell.present) {
                await openWindow(page);
                out.noRoleHere.window = {rows: await rows(page), text: flat(await win(page).innerText(), 300)};
                await snap(page, 'sw1-roles-norole-here-window');
                await closeWindow(page);
            }
            await page.goto(app.url(`/index.php/${t}/dashboard`)); await idle(page);
            out.noRoleHere.dashboard = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title(), bell: await bellState(page)};
            await snap(page, 'sw1-roles-norole-here-dashboard');
            await signOut(page);
            // A user with a role in no journal: the site-level Register page, no journal ticked.
            const ru = `${t}nr`;
            out.registered = await register(page, app, ru, 'sw1-roles-register');
            await page.goto(app.url('/index.php/index/user/profile')); await idle(page);
            out.noRoleAnywhere = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), bell: await bellState(page)};
            await snap(page, 'sw1-roles-norole-site-profile');
            if (out.noRoleAnywhere.bell.present) {
                await openWindow(page);
                out.noRoleAnywhere.window = flat(await win(page).innerText(), 300);
                await snap(page, 'sw1-roles-norole-site-window');
                await closeWindow(page);
            }
            await signOut(page);
        } finally { await close(); }
    });

    // ---------------------------------------------------------------- assign: does the needs-editor row leave when an editor is assigned?
    await phase('assign', async (out) => {
        const t = tag('u05sw1a');
        await app.api.createContext({tag: t, users: mkUsers(t, [['am', ['manager']], ['am2', ['manager']], ['ase', ['sectionEditor']], ['aau', ['author']]])});
        const title = `Assign ${t}`;
        const sub = await app.api.createSubmission({tag: t, context: t, submitter: `${t}aau`, title});
        out.submissionId = sub.submissionId;
        const {page, close} = await launch(app);
        page.on('dialog', (d) => d.accept().catch(() => {}));
        const readFor = async (who) => {
            await signIn(page, `${t}${who}`, {contextPath: t});
            await page.goto(app.url(`/index.php/${t}/dashboard/editorial`)); await idle(page);
            const b = await bellState(page);
            await openWindow(page);
            const r = (await rows(page)).filter((x) => x.title === title);
            await snap(page, `sw1-assign-window-${who}`);
            await closeWindow(page);
            return {bell: b, rows: r};
        };
        try {
            out.before = await readFor('am');
            // am reads the task (presses it), so "read" and "listed" are apart.
            await openWindow(page);
            await win(page).locator('tr.gridRow').filter({hasText: title}).locator('span.message').click();
            await page.waitForURL(/workflowSubmissionId|authorizationDenied/, {timeout: 30000}).catch(() => {});
            await idle(page);
            await page.goto(app.url(`/index.php/${t}/dashboard/editorial?workflowSubmissionId=${sub.submissionId}&workflowMenuKey=${STAGE}`)); await idle(page);
            await page.locator('[data-cy="workflow-secondary-items"]').waitFor({timeout: 30000});
            await idle(page);
            await snap(page, 'sw1-assign-workflow');
            await page.locator('[data-cy="workflow-secondary-items"]').getByRole('button', {name: 'Assign', exact: true}).click();
            const w = page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();
            await w.locator('select[name="filterUserGroupId"]').waitFor({timeout: 30000});
            await idle(page);
            await w.locator('select[name="filterUserGroupId"]').selectOption({label: SE_LABEL});
            await idle(page);
            await w.getByRole('textbox', {name: 'Search User By Name'}).fill(`${t}ase`);
            await w.getByRole('button', {name: 'Search', exact: true}).click();
            await idle(page);
            await w.getByRole('row').filter({hasText: 'ASE Sweep'}).locator('input[name="userId"]').click();
            await idle(page);
            await snap(page, 'sw1-assign-form');
            const resp = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: 30000}).catch(() => null);
            await w.getByRole('button', {name: 'OK', exact: true}).click();
            const r = await resp;
            out.assignStatus = r ? r.status() : null;
            await w.waitFor({state: 'detached', timeout: 15000}).catch(() => {});
            await idle(page);
            await snap(page, 'sw1-assign-after');
            await signOut(page);
            out.afterAm = await readFor('am');
            await signOut(page);
            out.afterAm2 = await readFor('am2');
            await signOut(page);
            out.afterSe = await readFor('ase');
            await signOut(page);
        } finally { await close(); }
    });

    // ---------------------------------------------------------------- toast: Rule 9b over open windows, 9c the Identity tab
    await phase('toast', async (out) => {
        const t = tag('u05sw1t');
        await app.api.createContext({tag: t, users: [
            {username: `${t}tm`, roles: ['manager'], givenName: 'Tia', familyName: 'Manager'},
            {username: `${t}tse`, roles: ['sectionEditor'], givenName: 'Ned', familyName: 'Notified'},
            {username: `${t}tau`, roles: ['author'], givenName: 'Ari', familyName: 'Author'},
        ]});
        const sub = await app.api.createSubmission({tag: t, context: t, submitter: `${t}tau`, title: `Toast ${t}`, participants: [{username: `${t}tse`, role: 'sectionEditor'}]});
        const {page, close} = await launch(app);
        const dialogs = [];
        page.on('dialog', (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); });
        const toastInfo = () => page.evaluate(() => [...document.querySelectorAll('.app__notifications .pkpNotification')].map((n) => ({
            text: n.innerText.replace(/×|Close/g, '').replace(/\s+/g, ' ').trim(), cls: n.className, edge: getComputedStyle(n).borderLeftColor})));
        const openWins = () => page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].filter((d) => d.getClientRects().length).length);
        // hover the toast for 8 s, leave, time its going; then a second one's "×"
        const hoverThenLeave = async (re) => {
            const toast = page.locator('.app__notifications .pkpNotification').filter({hasText: re}).first();
            await toast.waitFor({timeout: 15000});
            const shownAt = Date.now();
            const b = await toast.boundingBox();
            await page.mouse.move(b.x + 20, b.y + b.height / 2);
            await sleep(8000);
            const stillAfter8 = await toast.isVisible().catch(() => false);
            await page.mouse.move(640, 880);
            const left = Date.now();
            let goneMs = null;
            for (let i = 0; i < 40; i++) { if (!(await toast.isVisible().catch(() => false))) { goneMs = Date.now() - left; break; } await sleep(250); }
            return {stillAfter8, goneAfterLeaveMs: goneMs, shownForMs: Date.now() - shownAt, windowsOpen: await openWins()};
        };
        const pressX = async (re) => {
            const toast = page.locator('.app__notifications .pkpNotification').filter({hasText: re}).first();
            await toast.waitFor({timeout: 15000});
            const btn = toast.locator('.pkpNotification__closeButton, button').first();
            const bb = await btn.boundingBox();
            const w0 = await openWins();
            await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
            await sleep(600);
            return {goneAfterX: !(await toast.isVisible().catch(() => false)), windowsBefore: w0, windowsAfter: await openWins()};
        };
        try {
            await signIn(page, `${t}tm`, {contextPath: t});
            // (1) the Notify side panel with "Message" empty.
            const openNotify = async () => {
                await page.goto(app.url(`/index.php/${t}/dashboard/editorial?workflowSubmissionId=${sub.submissionId}&workflowMenuKey=${STAGE}`)); await idle(page);
                await page.locator('[data-cy="workflow-secondary-items"]').waitFor({timeout: 30000}); await idle(page);
                await page.getByRole('button', {name: 'Ned Notified More Actions', exact: true}).first().click();
                await page.getByRole('menuitem', {name: 'Notify', exact: true}).click();
                const w = page.getByRole('dialog').filter({has: page.locator('form select[name="template"]')}).last();
                await w.getByRole('button', {name: 'Notify', exact: true}).waitFor({timeout: 30000});
                await idle(page);
                return w;
            };
            const warn = /Please ensure that you have filled out the message field/;
            let w = await openNotify();
            await w.getByRole('button', {name: 'Notify', exact: true}).click();
            await page.locator('.app__notifications .pkpNotification').filter({hasText: warn}).first().waitFor({timeout: 15000});
            await snap(page, 'sw1-toast-notify-warning');
            out.notifyWarning = await toastInfo();
            out.notifyHover = await hoverThenLeave(warn);
            out.notifyHover.notifyStillOpen = await w.isVisible().catch(() => false);
            await w.getByRole('button', {name: 'Notify', exact: true}).click();
            out.notifyX = await pressX(warn);
            out.notifyX.notifyStillOpen = await w.isVisible().catch(() => false);
            await snap(page, 'sw1-toast-notify-after-x');
            // (2) "Add a Component", Key -survey.
            await page.goto(app.url(`/index.php/${t}/management/settings/workflow`)); await idle(page);
            await page.getByRole('tab', {name: 'Components'}).or(page.getByRole('link', {name: 'Components'})).first().click();
            await idle(page);
            await page.getByRole('button', {name: /Add a Component/}).or(page.getByRole('link', {name: /Add a Component/})).first().click();
            await idle(page);
            const d = page.getByRole('dialog').last();
            await d.getByLabel(/^Name/).first().fill('Survey Forms');
            await d.getByLabel(/^Key/).first().fill('-survey');
            await d.getByRole('button', {name: 'Save'}).last().click();
            const keyRe = /The key can contain only/;
            await page.locator('.app__notifications .pkpNotification').filter({hasText: keyRe}).first().waitFor({timeout: 15000});
            await snap(page, 'sw1-toast-component-warning');
            out.componentWarning = await toastInfo();
            out.componentHover = await hoverThenLeave(keyRe);
            await d.getByRole('button', {name: 'Save'}).last().click();
            out.componentX = await pressX(keyRe);
            out.componentX.componentWindowOpen = await d.isVisible().catch(() => false);
            await snap(page, 'sw1-toast-component-after-x');
            await d.getByRole('button', {name: 'Cancel'}).last().click().catch(() => {});
            await idle(page);
            // (3) 9c: the Identity tab's save.
            await page.goto(app.url(`/index.php/${t}/user/profile`)); await idle(page);
            const idForm = page.locator('form#identityForm, form').filter({has: page.locator('input[name="givenName[en]"], input[id^="givenName"]')}).first();
            await idForm.getByRole('button', {name: 'Save', exact: true}).click();
            await sleep(700);
            const s = await snap(page, 'sw1-toast-identity-save');
            out.identity = {toasts: await toastInfo(), inForm: flat(await idForm.innerText().catch(() => null), 400), notices: s.notices};
            out.dialogs = dialogs;
            await signOut(page);
        } finally { await close(); }
    });

    record('sw1-facts', F);
    return F;
});
