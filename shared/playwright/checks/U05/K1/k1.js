// U05 claim check, chunk K1: the Tasks panel, the bell and badge, the
// reader-side count, toasts (docs/process/briefs/claim-check.md). Seeds its own scratch
// contexts, signs in from the roster rule, records every screen with
// screen(). Run: PROBE_FEATURE=U05 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U05/K1/k1.js
//
// Phases (each guarded, results in k1-summary-<app>.json):
//  1 the Author's wizard from its start page while a Manager's page stays open (scenario 1, F5/F8/F6)
//  2 scenario 1 as M1 (bell, window, row, pressing the sentence, OPS3)
//  3 scenario 2 as M2 (Mark Read / Mark New / Delete), M1's rows survive
//  4 a two-journal Manager and admin (Rule 2d, acronym, pooled counts, Create Journal form for F11)
//  5 the reader-side count by role (Rule 4, A3 without a task)
//  6 a discussion gives the Section Editor a task (A3 with a task), Delete ends the Unsubscribe link (A7)
//  7 toasts (Rule 9)
//  8 the section form's "Editorial Assignments" ticked, then a wizard submission (preamble, persona-2 F11)
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const FIXTURES = {
    ojs: path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf'),
    ops: path.join(REPO, 'apps/ops/playwright/fixtures/files/preprint.pdf'),
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // sampling only, never a wait for state

// ------------------------------------------------------------ screen helpers
async function safeScreen(page) {
    try { return await screen(page); } catch (e) { return {url: page.url(), error: String(e.message).slice(0, 200)}; }
}
async function snap(page, name) {
    record(name, await safeScreen(page));
    await shot(page, name).catch(() => {});
}
function bell(page) { return page.getByRole('button', {name: /^Tasks/}); }
async function bellState(page) {
    const b = bell(page);
    const count = await b.count();
    if (!count) return {present: false};
    const data = await b.first().evaluate((el) => {
        const sr = el.querySelector('.-screenReader');
        const badge = [...el.querySelectorAll('span')].find((s) => !s.classList.contains('-screenReader') && /^\d+$/.test(s.textContent.trim()));
        return {
            srText: sr ? sr.textContent.trim() : null,
            accessibleName: el.getAttribute('aria-label') || el.textContent.replace(/\s+/g, ' ').trim(),
            badgeText: badge ? badge.textContent.trim() : null,
            badgeBg: badge ? getComputedStyle(badge).backgroundColor : null,
            disabled: el.disabled,
            ariaDisabled: el.getAttribute('aria-disabled'),
        };
    });
    return {present: true, visible: await b.first().isVisible(), ...data};
}
function dialog(page) { return page.locator('[role="dialog"]:visible').last(); }
async function openWindow(page) {
    await bell(page).first().click();
    const d = dialog(page);
    await d.waitFor({state: 'visible', timeout: 15000});
    await d.locator('.pkp_controllers_grid, table').first().waitFor({state: 'visible', timeout: 15000});
    await idle(page);
    return d;
}
async function windowRows(page) {
    const d = dialog(page);
    const rows = await d.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => {
        const msg = tr.querySelector('span.message');
        const task = tr.querySelector('div.task');
        const a = tr.querySelector('a.pkp_linkaction_details, a');
        return {
            id: tr.id,
            unread: !!(task && task.classList.contains('unread')),
            sentence: msg ? msg.innerText.trim() : null,
            sentenceWeight: msg ? getComputedStyle(msg).fontWeight : null,
            acronym: tr.querySelector('span.acronym') ? tr.querySelector('span.acronym').innerText.trim() : null,
            title: tr.querySelector('span.submission') ? tr.querySelector('span.submission').innerText.trim() : null,
            checked: tr.querySelector('input[type=checkbox]') ? tr.querySelector('input[type=checkbox]').checked : null,
            href: a ? a.getAttribute('href') : null,
        };
    }));
    const text = await d.innerText().catch(() => null);
    return {rows, headers: await d.locator('th').allInnerTexts().catch(() => []), text: text ? text.replace(/\n+/g, ' / ').slice(0, 1200) : null};
}
async function closeWindow(page) {
    const d = dialog(page);
    const btn = d.getByRole('button', {name: /close/i}).first();
    const name = {aria: await btn.getAttribute('aria-label').catch(() => null), text: await btn.innerText().catch(() => null)};
    await btn.click();
    await d.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
    return {closeButton: name, bellAtOnce: await bellState(page)};
}
async function pressAction(page, label) {
    await dialog(page).getByRole('link', {name: label, exact: true}).click();
    await idle(page);
    return (await page.locator('[role="dialog"]:visible').count());
}
async function tick(page, index, state = true) {
    await dialog(page).locator('tr.gridRow input[type=checkbox]').nth(index).setChecked(state);
}
async function userNav(page) {
    return page.evaluate(() => {
        const wrap = document.querySelector('#navigationUserWrapper');
        return {
            text: wrap ? wrap.innerText.replace(/\s+/g, ' ').trim() : null,
            counts: [...document.querySelectorAll('.task_count')].map((e) => ({text: e.innerText.trim(), visible: e.getClientRects().length > 0})),
            links: wrap ? [...wrap.querySelectorAll('a')].map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})) : [],
        };
    });
}
async function toasts(page) {
    return page.evaluate(() => [...document.querySelectorAll('.pkpNotification')].map((e) => {
        const b = e.querySelector('button');
        const r = e.getBoundingClientRect();
        return {classes: e.className, text: e.innerText.trim(), visible: e.getClientRects().length > 0,
            close: b ? {text: b.innerText.trim(), sr: b.querySelector('.-screenReader') ? b.querySelector('.-screenReader').textContent.trim() : null, aria: b.getAttribute('aria-label')} : null,
            top: Math.round(r.top), right: Math.round(window.innerWidth - r.right), width: Math.round(r.width), height: Math.round(r.height),
            bg: getComputedStyle(e).backgroundColor, borderLeft: getComputedStyle(e).borderLeftColor};
    }));
}
async function dashboard(page, app, ctx) {
    await page.goto(app.url(`/index.php/${ctx}/dashboard/editorial`));
    await idle(page);
}

// ------------------------------------------------------------ the wizard
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
/** From the start page ("Make a Submission") through "Begin Submission" and every step to the final "Submit". */
async function wizardFromStart(page, app, ctx, title, name) {
    const out = {title, steps: []};
    await page.goto(app.url(`/index.php/${ctx}/submission`));
    await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: 30000});
    await idle(page);
    record(`${name}-start-${app.name}`, await safeScreen(page));
    out.start = {
        url: page.url(),
        radios: await page.getByRole('radio').evaluateAll((els) => els.map((e) => ({name: e.name, label: (e.labels && e.labels[0] ? e.labels[0].innerText : '').trim(), checked: e.checked}))),
        checkboxes: await page.getByRole('checkbox').evaluateAll((els) => els.map((e) => ({label: (e.labels && e.labels[0] ? e.labels[0].innerText : e.getAttribute('aria-label') || '').trim(), checked: e.checked}))),
        required: await page.locator('.pkpFormField').evaluateAll((els) => els.map((e) => e.innerText.split('\n')[0].trim())),
    };
    const body = page.frameLocator('iframe.tox-edit-area__iframe').first().locator('body');
    await body.click();
    await body.fill(title);
    for (const box of [page.getByRole('checkbox', {name: /meets all of these requirements/}), page.getByRole('checkbox', {name: /agree to have my data collected/})]) {
        if (await box.count()) await box.check();
    }
    // A section/language/type choice, when the form asks for one: the first option.
    const groups = {};
    for (const r of out.start.radios) { (groups[r.name] ||= []).push(r); }
    for (const [groupName, list] of Object.entries(groups)) {
        if (!list.some((r) => r.checked)) await page.locator(`input[type=radio][name="${groupName}"]`).first().check();
    }
    out.beginLabel = await page.getByRole('button', {name: 'Begin Submission'}).innerText();
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45000});
    out.submissionId = Number(new URL(page.url()).searchParams.get('id'));
    await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: 30000});
    await currentStep(page).filter({hasText: 'Upload Files'}).waitFor({timeout: 30000});
    out.railSteps = await page.locator('.pkpSteps__buttons .pkpSteps__step__label').allInnerTexts();
    record(`${name}-files-${app.name}`, await safeScreen(page));
    await uploadWizardFile(page, app, `${ctx}`);
    await continueTo(page, 'Details');
    record(`${name}-details-${app.name}`, await safeScreen(page));
    out.detailsRequired = await page.locator('.pkpFormField').evaluateAll((els) => els.filter((e) => /\*/.test(e.innerText.split('\n')[0])).map((e) => e.innerText.split('\n')[0].trim()));
    // The abstract is required on a scratch journal's default section (Details step, "Abstract * Required").
    const abstractFrame = page.locator('iframe[id*="-abstract-"]');
    if (await abstractFrame.count()) { const body = page.frameLocator('iframe[id*="-abstract-"]').first().locator('body'); await body.click(); await body.fill(`Abstract for ${title}.`); }
    await continueTo(page, 'Contributors');
    record(`${name}-contributors-${app.name}`, await safeScreen(page));
    if (app.name === 'ops') {
        await continueTo(page, 'For Readers');
        await page.getByRole('radio', {name: 'This preprint has not been published elsewhere.'}).check();
    } else {
        await continueTo(page, 'For the Editors');
    }
    record(`${name}-editors-${app.name}`, await safeScreen(page));
    const validated = page.waitForResponse((r) => r.url().includes('/submit') && r.request().method() === 'POST' && r.status() < 500, {timeout: 45000});
    await continueTo(page, 'Review');
    await validated;
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
    record(`${name}-review-${app.name}`, await safeScreen(page));
    out.reviewText = (await page.locator('.submissionWizard').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1500);
    const submit = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true});
    out.submitLabel = await submit.innerText();
    out.submitDisabled = await submit.isDisabled();
    if (out.submitDisabled) throw new Error(`Submit disabled at Review: ${out.reviewText.slice(0, 600)}`);
    await submit.click();
    const d = page.getByRole('dialog').filter({hasText: /will be submitted to|Are you sure you want to (complete|submit)/});
    await d.waitFor({timeout: 30000});
    out.dialogText = await d.innerText();
    out.pressedAt = new Date().toISOString();
    await d.getByRole('button', {name: 'Submit', exact: true}).click();
    await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45000});
    out.completeAt = new Date().toISOString();
    record(`${name}-complete-${app.name}`, await safeScreen(page));
    await shot(page, `${name}-complete-${app.name}`);
    return out;
}

// ------------------------------------------------------------ discussion
async function openDiscussion(page, app, ctx, submissionId, marker, participantRegex, name) {
    await page.goto(app.url(`/index.php/${ctx}/dashboard/editorial?workflowSubmissionId=${submissionId}`));
    const panel = page.locator('[data-cy="discussion-manager"]').first();
    await panel.waitFor({timeout: 45000});
    const out = {panelHeading: await panel.locator('h1,h2,h3,h4').first().innerText().catch(() => null)};
    await panel.getByRole('button', {name: 'Add', exact: true}).click();
    const modal = page.locator('[data-cy="active-modal"]').last();
    await modal.locator('input[name="title"]').waitFor({timeout: 30000});
    await modal.locator('input[name="participants"]').first().waitFor({timeout: 30000});
    const participants = await modal.locator('input[name="participants"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: ((e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || {}).innerText || '').trim()})));
    record(`${name}-form-${app.name}`, {...(await safeScreen(page)), participants});
    await modal.locator('input[name="title"]').fill(`Discussion ${marker}`);
    for (const p of participants) {
        if (participantRegex.test(p.label) && !p.checked) await modal.locator(`input[name="participants"][value="${p.value}"]`).check();
    }
    const frame = modal.frameLocator('iframe').last();
    await frame.locator('body').click();
    await frame.locator('body').fill(`Opening message ${marker}`);
    const saveResponse = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+\/tasks$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', {timeout: 30000}).catch(() => null);
    out.pressedAt = new Date().toISOString();
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    const errorDialog = page.getByRole('dialog', {name: 'Error'});
    out.outcome = await Promise.race([
        errorDialog.waitFor({timeout: 30000}).then(() => 'error'),
        modal.waitFor({state: 'hidden', timeout: 30000}).then(() => 'saved'),
    ]).catch(() => 'timeout');
    const response = await saveResponse;
    out.saveStatus = response ? response.status() : null;
    out.participants = participants;
    if (out.outcome === 'error') {
        out.errorDialog = await errorDialog.innerText();
        await errorDialog.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
    }
    record(`${name}-after-${app.name}`, await safeScreen(page));
    return out;
}

// ============================================================ the chunk
forEachApp(async (app) => {
    const t = tag('u05k1');
    const S = {app: app.name, tag: t, errors: {}};
    const U = {m1: `${t}m1`, m2: `${t}m2`, au: `${t}au`, se: `${t}se`, rd: `${t}rd`, mu: `${t}mu`, rv: `${t}rv`, as1: `${t}as`, au2: `${t}au2`};
    const users = [
        {username: U.m1, roles: ['manager']}, {username: U.m2, roles: ['manager']}, {username: U.mu, roles: ['manager']},
        {username: U.au, roles: ['author']}, {username: U.se, roles: ['sectionEditor']}, {username: U.rd, roles: ['reader']},
    ];
    if (app.name === 'ops') users.push({username: U.as1, roles: ['editorialBoardMember']});
    else users.push({username: U.rv, roles: ['externalReviewer']}, {username: U.as1, roles: ['copyeditor']});
    const acr = t.slice(-4).toUpperCase();
    S.ctx1 = await app.api.createContext({tag: t, context: {acronym: `K1${acr}`}, users});
    S.ctx2 = await app.api.createContext({tag: `${t}b`, context: {acronym: `K2${acr}`}, users: [{username: U.mu, roles: ['manager']}, {username: U.au2, roles: ['author']}]});
    const t2 = `${t}b`;
    S.sub2ctx = await app.api.createSubmission({tag: `${t}o`, context: t2, submitter: U.au2, title: `Other journal ${t}`});
    const mailTo = (u) => `${u}@mail.test`;
    const title1 = `Task one ${t}`;

    // ---- Phase 1 + 2: the wizard while M1's page stays open; scenario 1.
    const B = await launch(app);
    B.page.on('dialog', (d) => d.accept().catch(() => {}));
    try {
        await signIn(B.page, U.m1);
        await dashboard(B.page, app, t);
        record(`p1-m1-dashboard-before-${app.name}`, await safeScreen(B.page));
        S.m1Before = {url: B.page.url(), bell: await bellState(B.page)};
        await loc(B.page, 'the Tasks bell (no task yet)', bell(B.page));

        const A = await launch(app);
        A.page.on('dialog', (d) => d.accept().catch(() => {}));
        try {
            await signIn(A.page, U.au);
            try {
                S.wizard1 = await wizardFromStart(A.page, app, t, title1, 'p1-wizard');
            } catch (e) {
                S.errors.wizard1 = String(e.message).slice(0, 500);
                record(`p1-wizard-failed-${app.name}`, await safeScreen(A.page));
                await shot(A.page, `p1-wizard-failed-${app.name}`).catch(() => {});
            }
            // The Author's own bell and count.
            await A.page.goto(app.url(`/index.php/${t}/user/profile`)); await idle(A.page);
            S.authorBell = await bellState(A.page);
            await A.page.goto(app.url(`/index.php/${t}/index`)); await idle(A.page);
            S.authorNav = await userNav(A.page);
            record(`p5-author-home-${app.name}`, await safeScreen(A.page));
        } finally { await A.close(); }

        if (S.wizard1) {
            // The email, timed against the press (preamble "within a second").
            try {
                const m = await app.mail.find({to: mailTo(U.m1), contains: title1, timeoutMs: 15000});
                S.mail1 = {subject: m.Subject, created: m.Created, delaySeconds: (new Date(m.Created) - new Date(S.wizard1.pressedAt)) / 1000};
            } catch (e) { S.mail1 = {error: String(e.message).slice(0, 200)}; }
            // F5: does the already-open page's badge change without a reload? Sampled for 6 s.
            const samples = [];
            const t0 = Date.now();
            while (Date.now() - t0 < 6000) { samples.push({ms: Date.now() - t0, badge: (await bellState(B.page)).badgeText}); await sleep(1000); }
            S.f5 = {samples, url: B.page.url()};
        }
        if (!S.wizard1) {
            S.sub1Seeded = await app.api.createSubmission({tag: `${t}s1`, context: t, submitter: U.au, title: title1});
        }
        // Scenario 1 as M1.
        await B.page.reload(); await idle(B.page);
        record(`p2-m1-dashboard-after-${app.name}`, await safeScreen(B.page));
        S.s1 = {bellAfterReload: await bellState(B.page)};
        await loc(B.page, 'the Tasks bell with a badge', bell(B.page));
        await openWindow(B.page);
        record(`p2-window-one-${app.name}`, await safeScreen(B.page));
        await shot(B.page, `p2-window-one-${app.name}`);
        S.s1.window = await windowRows(B.page);
        S.s1.bellWhileOpen = await bellState(B.page);
        await loc(B.page, 'the Tasks window', dialog(B.page));
        await loc(B.page, 'a task row', dialog(B.page).locator('tr.gridRow'));
        S.s1.closed = await closeWindow(B.page);
        await openWindow(B.page);
        const row = dialog(B.page).locator('tr.gridRow').first();
        await row.locator('span.message').click();
        await B.page.waitForURL((u) => !/\/dashboard\/editorial$/.test(u.pathname) || u.search.length > 0, {timeout: 20000}).catch(() => {});
        await idle(B.page);
        const landed = await safeScreen(B.page);
        record(`p2-after-press-${app.name}`, landed);
        await shot(B.page, `p2-after-press-${app.name}`);
        S.s1.afterPress = {url: B.page.url(), title: landed.title, h1: await B.page.locator('h1').first().innerText().catch(() => null), bodyText: (await B.page.locator('main, body').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)};
        await dashboard(B.page, app, t);
        S.s1.bellBack = await bellState(B.page);
        await openWindow(B.page);
        S.s1.windowBack = await windowRows(B.page);
        record(`p2-window-read-${app.name}`, await safeScreen(B.page));
        await closeWindow(B.page);
        await B.page.goto(app.url(`/index.php/${t}/index`)); await idle(B.page);
        S.s1.navAfter = await userNav(B.page);
        record(`p5-m1-home-${app.name}`, await safeScreen(B.page));
        await loc(B.page, 'the reader-side user menu', B.page.locator('#navigationUserWrapper'));
        await signOut(B.page);
    } catch (e) { S.errors.phase12 = String(e.stack || e).slice(0, 800); } finally { await B.close(); }

    // ---- Phase 3: scenario 2 as M2; M1's rows survive.
    try {
        S.sub2 = await app.api.createSubmission({tag: `${t}s2`, context: t, submitter: U.au, title: `Task two ${t}`, participants: [{username: U.se, role: 'sectionEditor'}]});
        const {page, close} = await launch(app);
        page.on('dialog', (d) => { (S.browserDialogs ||= []).push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); });
        const s2 = {};
        S.s2 = s2;
        try {
            await signIn(page, U.m2);
            await dashboard(page, app, t);
            s2.bell = await bellState(page);
            await openWindow(page);
            s2.start = await windowRows(page);
            record(`p3-window-two-${app.name}`, await safeScreen(page));
            s2.dialogsAfterMarkReadNone = await pressAction(page, 'Mark Read');
            s2.afterMarkReadNone = {rows: (await windowRows(page)).rows, toasts: await toasts(page)};
            record(`p3-after-markread-none-${app.name}`, await safeScreen(page));
            await tick(page, 0);
            await pressAction(page, 'Mark Read');
            s2.afterMarkReadOne = (await windowRows(page)).rows;
            record(`p3-after-markread-one-${app.name}`, await safeScreen(page));
            s2.closeAfterMarkRead = await closeWindow(page);
            await page.goto(app.url(`/index.php/${t}/index`)); await idle(page);
            s2.navAfterMarkRead = await userNav(page);
            await dashboard(page, app, t);
            s2.bellAfterMarkRead = await bellState(page);
            await openWindow(page);
            await tick(page, 0);
            await pressAction(page, 'Mark New');
            s2.afterMarkNew = (await windowRows(page)).rows;
            s2.closeAfterMarkNew = await closeWindow(page);
            await openWindow(page);
            await tick(page, 0); await tick(page, 1);
            s2.dialogsAfterDelete = await pressAction(page, 'Delete');
            s2.afterDelete = await windowRows(page);
            record(`p3-after-delete-${app.name}`, await safeScreen(page));
            await shot(page, `p3-after-delete-${app.name}`);
            s2.closeAfterDelete = await closeWindow(page);
            await page.reload(); await idle(page);
            s2.bellAfterReload = await bellState(page);
            await openWindow(page);
            s2.windowAfterReload = await windowRows(page);
            await closeWindow(page);
            await signOut(page);
            await signIn(page, U.m1);
            await dashboard(page, app, t);
            s2.m1Bell = await bellState(page);
            await openWindow(page);
            s2.m1Rows = (await windowRows(page)).rows;
            record(`p3-m1-window-survives-${app.name}`, await safeScreen(page));
            await closeWindow(page);
            await signOut(page);
        } finally { await close(); }
        S.s2 = s2;
    } catch (e) { S.errors.phase3 = String(e.stack || e).slice(0, 800); }

    // ---- Phase 4: a two-journal Manager, admin, the site-level profile, the Create form.
    try {
        const {page, close} = await launch(app);
        page.on('dialog', (d) => d.accept().catch(() => {}));
        const p4 = {};
        S.p4 = p4;
        try {
            await signIn(page, U.mu);
            await dashboard(page, app, t);
            p4.bellCtx1 = await bellState(page);
            await openWindow(page);
            p4.rowsCtx1 = await windowRows(page);
            record(`p4-mu-window-ctx1-${app.name}`, await safeScreen(page));
            await shot(page, `p4-mu-window-ctx1-${app.name}`);
            await closeWindow(page);
            await dashboard(page, app, t2);
            p4.bellCtx2 = await bellState(page);
            await openWindow(page);
            p4.rowsCtx2 = (await windowRows(page)).rows;
            record(`p4-mu-window-ctx2-${app.name}`, await safeScreen(page));
            await closeWindow(page);
            await page.goto(app.url(`/index.php/${t}/index`)); await idle(page);
            p4.navCtx1 = await userNav(page);
            await page.goto(app.url(`/index.php/${t2}/index`)); await idle(page);
            p4.navCtx2 = await userNav(page);
            await page.goto(app.url('/index.php/index/index')); await idle(page);
            record(`p4-mu-site-home-${app.name}`, await safeScreen(page));
            p4.navSite = await userNav(page);
            // The front-end user menu is a dropdown: its entries are in the DOM but hidden until opened, so the link is followed by its address.
            p4.viewProfileHref = (p4.navSite.links.find((l) => l.text === 'View Profile') || {}).href;
            await page.goto(p4.viewProfileHref);
            await idle(page);
            p4.siteProfile = {url: page.url(), bell: await bellState(page)};
            record(`p4-mu-site-profile-${app.name}`, await safeScreen(page));
            if (p4.siteProfile.bell.present) {
                await openWindow(page);
                p4.siteProfileRows = (await windowRows(page)).rows;
                record(`p4-mu-site-profile-window-${app.name}`, await safeScreen(page));
                await closeWindow(page);
            }
            await signOut(page);
            // admin
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/index')); await idle(page);
            p4.adminNavSite = await userNav(page);
            await page.goto(app.url('/index.php/index/user/profile')); await idle(page);
            p4.adminSiteProfile = {url: page.url(), bell: await bellState(page)};
            await openWindow(page);
            const adminRows = await windowRows(page);
            p4.adminRows = {count: adminRows.rows.length, ours: adminRows.rows.filter((r) => (r.title || '').includes(t)), pagerText: adminRows.text};
            record(`p4-admin-site-window-${app.name}`, await safeScreen(page));
            await closeWindow(page);
            // Administration › Hosted Journals › the Create form (F11: which field feeds the acronym).
            await page.goto(app.url('/index.php/index/admin/contexts')); await idle(page);
            record(`p4-admin-contexts-${app.name}`, await safeScreen(page));
            const create = page.getByRole('button', {name: /^Create/}).or(page.getByRole('link', {name: /^Create/})).first();
            p4.createLabel = await create.innerText().catch(() => null);
            await create.click();
            // The Create form is a Vue side form: wait for its first visible text field, not for a
            // field inside the last [role=dialog] (that matched the page's hidden submit input and
            // timed out on every app; U05 SW1 drift sweep, 2026-10-20).
            const form = page.locator('[role="dialog"]').filter({has: page.locator('input[type="text"]:visible')}).last();
            await page.locator('input[type="text"]:visible, textarea:visible').first().waitFor({state: 'visible', timeout: 30000});
            await idle(page);
            record(`p4-admin-create-form-${app.name}`, await safeScreen(page));
            await shot(page, `p4-admin-create-form-${app.name}`);
            p4.createFields = await form.locator('label, legend, .pkpFormField__heading').allInnerTexts().catch(() => []);
            await form.getByRole('button', {name: /Cancel|Close/}).first().click().catch(() => {});
            await signOut(page);
        } finally { await close(); }
        S.p4 = p4;
    } catch (e) { S.errors.phase4 = String(e.stack || e).slice(0, 800); }

    // ---- Phase 5: the reader-side count by role on the scratch journal's home page.
    try {
        const {page, close} = await launch(app);
        page.on('dialog', (d) => d.accept().catch(() => {}));
        const p5 = {};
        S.p5 = p5;
        try {
            const list = [['se', U.se], ['rd', U.rd], ['as1', U.as1]];
            if (app.name !== 'ops') list.push(['rv', U.rv]);
            for (const [who, user] of list) {
                await signIn(page, user);
                await page.goto(app.url(`/index.php/${t}/index`)); await idle(page);
                record(`p5-${who}-home-${app.name}`, await safeScreen(page));
                p5[who] = {nav: await userNav(page)};
                if (who === 'rd') {
                    p5[who].dashboardHref = (p5[who].nav.links.find((l) => /^Dashboard/.test(l.text)) || {}).href;
                    await page.goto(p5[who].dashboardHref);
                    await idle(page);
                    p5[who].dashboardLanding = {url: page.url(), bell: await bellState(page)};
                    record(`p5-rd-dashboard-landing-${app.name}`, await safeScreen(page));
                }
                await signOut(page);
            }
        } finally { await close(); }
        S.p5 = p5;
    } catch (e) { S.errors.phase5 = String(e.stack || e).slice(0, 800); }

    // ---- Phase 6: a discussion gives the Section Editor a task (A3); Delete ends the Unsubscribe link (A7).
    try {
        // The discussion is opened on the seeded second submission, where the Section Editor is a participant.
        const subId = S.sub2 && (S.sub2.submissionId || S.sub2.id);
        const {page, close} = await launch(app);
        page.on('dialog', (d) => d.accept().catch(() => {}));
        const p6 = {subId};
        S.p6 = p6;
        try {
            await signIn(page, U.m1);
            p6.discussion = await openDiscussion(page, app, t, subId, `${t}d1`, new RegExp(U.se), 'p6-discussion');
            await signOut(page);
            if (p6.discussion.outcome === 'saved' && p6.discussion.saveStatus && p6.discussion.saveStatus < 300) {
                try {
                    const m = await app.mail.find({to: mailTo(U.se), contains: `Discussion ${t}d1`, timeoutMs: 15000});
                    const full = await app.mail.fullMessage(m.ID);
                    const text = full.Text || '';
                    const link = (text.match(/https?:\/\/[^\s)>]+unsubscribe[^\s)>]*/i) || [null])[0];
                    p6.email = {subject: m.Subject, unsubscribeLink: link};
                } catch (e) { p6.email = {error: String(e.message).slice(0, 200)}; }
                await signIn(page, U.se);
                await page.goto(app.url(`/index.php/${t}/index`)); await idle(page);
                p6.seNav = await userNav(page);
                record(`p6-se-home-${app.name}`, await safeScreen(page));
                await shot(page, `p6-se-home-${app.name}`);
                await dashboard(page, app, t);
                p6.seBell = await bellState(page);
                await openWindow(page);
                const rows = await windowRows(page);
                p6.seRows = rows.rows;
                record(`p6-se-window-${app.name}`, await safeScreen(page));
                const idx = rows.rows.findIndex((r) => (r.sentence || '').includes(`Discussion ${t}d1`));
                if (idx >= 0) {
                    await tick(page, idx);
                    await pressAction(page, 'Delete');
                    p6.seAfterDelete = (await windowRows(page)).rows;
                    p6.seClose = await closeWindow(page);
                }
                await page.goto(app.url(`/index.php/${t}/index`)); await idle(page);
                p6.seNavAfterDelete = await userNav(page);
                await signOut(page);
                if (p6.email && p6.email.unsubscribeLink) {
                    const fresh = await launch(app);
                    try {
                        const link = p6.email.unsubscribeLink.replace(/^https?:\/\/[^/]+/, app.baseURL);
                        const resp = await fresh.page.goto(link);
                        await idle(fresh.page).catch(() => {});
                        const s = await safeScreen(fresh.page);
                        record(`p6-unsubscribe-after-delete-${app.name}`, s);
                        await shot(fresh.page, `p6-unsubscribe-after-delete-${app.name}`);
                        p6.unsubscribeAfterDelete = {status: resp ? resp.status() : null, url: fresh.page.url(), title: s.title, text: (await fresh.page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300)};
                    } finally { await fresh.close(); }
                }
            }
        } finally { await close(); }
        S.p6 = p6;
    } catch (e) { S.errors.phase6 = String(e.stack || e).slice(0, 800); }

    // ---- Phase 7: toasts as M1.
    try {
        const {page, close} = await launch(app);
        page.on('dialog', (d) => d.accept().catch(() => {}));
        const p7 = {};
        S.p7 = p7;
        try {
            await signIn(page, U.m1);
            await page.goto(app.url(`/index.php/${t}/user/profile`)); await idle(page);
            await page.getByRole('tab', {name: 'Notifications', exact: true}).click();
            const form = page.locator('#notificationSettingsForm');
            await form.waitFor({timeout: 15000}); await idle(page);
            const save = form.getByRole('button', {name: 'Save', exact: true}).first();
            await page.mouse.move(5, 850);
            const toast = page.locator('.pkpNotification').first();
            let t0 = Date.now();
            await save.click();
            await toast.waitFor({state: 'visible', timeout: 15000});
            p7.appearedMs = Date.now() - t0;
            p7.success = await toasts(page);
            await shot(page, `p7-toast-${app.name}`);
            await loc(page, 'the toast', page.locator('.pkpNotification'));
            await loc(page, 'the toast close control', page.locator('.pkpNotification').getByRole('button', {name: 'Close'}));
            t0 = Date.now();
            p7.unhoveredLifetime = {gone: await toast.waitFor({state: 'hidden', timeout: 20000}).then(() => true).catch(() => false), ms: Date.now() - t0};
            await save.click();
            await toast.waitFor({state: 'visible', timeout: 15000});
            await toast.hover();
            t0 = Date.now();
            p7.hover = {goneWithin8s: await toast.waitFor({state: 'hidden', timeout: 8000}).then(() => true).catch(() => false), ms: Date.now() - t0};
            const closeBtn = toast.locator('button').first();
            p7.closeControl = {text: await closeBtn.innerText(), aria: await closeBtn.getAttribute('aria-label'), sr: await closeBtn.evaluate((b) => (b.querySelector('.-screenReader') || {}).textContent || null)};
            await closeBtn.click();
            p7.afterClose = await toast.waitFor({state: 'hidden', timeout: 5000}).then(() => true).catch(() => false);
            await page.mouse.move(5, 850);
            await save.click(); await save.click();
            await toast.waitFor({state: 'visible', timeout: 15000}); await idle(page);
            p7.stack = await toasts(page);
            await shot(page, `p7-stack-${app.name}`);
            await toast.waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
            // Line 155: every "Enable…" unticked, the save's own toast still comes.
            const enable = form.getByRole('checkbox', {name: 'Enable these types of notifications.'});
            const n = await enable.count();
            for (let i = 0; i < n; i++) await enable.nth(i).setChecked(false);
            const saved = page.waitForResponse((r) => r.url().includes('save-notification-settings'), {timeout: 20000}).catch(() => null);
            await save.click();
            await saved;
            await toast.waitFor({state: 'visible', timeout: 15000}).catch(() => {});
            p7.toastWithAllUnticked = await toasts(page);
            record(`p7-all-unticked-${app.name}`, await safeScreen(page));
            await page.reload(); await idle(page);
            await page.getByRole('tab', {name: 'Notifications', exact: true}).click();
            await form.waitFor({timeout: 15000}); await idle(page);
            p7.enableAfterReload = await enable.evaluateAll((els) => els.map((e) => e.checked));
            for (let i = 0; i < n; i++) await enable.nth(i).setChecked(true);
            const saved2 = page.waitForResponse((r) => r.url().includes('save-notification-settings'), {timeout: 20000}).catch(() => null);
            await save.click(); await saved2;
            // Wrong current password: in-form notice, timed.
            await page.goto(app.url(`/index.php/${t}/user/profile/changePassword`));
            const pf = page.locator('form#changePasswordForm');
            await pf.locator('input[name="oldPassword"]').waitFor({timeout: 20000});
            await idle(page);
            await pf.locator('input[name="oldPassword"]').fill('wrongwrong1');
            await pf.locator('input[name="password"]').fill('Newpassword12345');
            await pf.locator('input[name="password2"]').fill('Newpassword12345');
            const samples = [];
            t0 = Date.now();
            await pf.getByRole('button', {name: 'Save', exact: true}).click();
            let shotTaken = false;
            while (Date.now() - t0 < 9500) {
                const notice = await page.locator('#changePasswordFormNotification').innerText().catch(() => null);
                const vis = await page.locator('#changePasswordFormNotification .notifyFormError').isVisible().catch(() => false);
                samples.push({ms: Date.now() - t0, noticeVisible: vis, notice: notice ? notice.replace(/\s+/g, ' ').trim().slice(0, 160) : null, toasts: await page.locator('.pkpNotification').count()});
                if (vis && !shotTaken) { record(`p7-password-wrong-${app.name}`, await safeScreen(page)); await shot(page, `p7-password-wrong-${app.name}`); shotTaken = true; }
                await sleep(250);
            }
            p7.passwordNotice = {samples: samples.filter((s, i, a) => i === 0 || s.noticeVisible !== a[i - 1].noticeVisible || i === a.length - 1), border: await page.locator('#changePasswordFormNotification .notifyFormError').evaluate((e) => getComputedStyle(e).borderLeftColor).catch(() => null)};
            // The plugin toggle: a notice toast.
            await page.goto(app.url(`/index.php/${t}/management/settings/website`)); await idle(page);
            await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click(); await idle(page);
            const rowEl = page.locator('#pluginGridContainer tr.gridRow').filter({hasText: 'Custom Block Manager'}).first();
            const box = rowEl.locator('input[type=checkbox]').first();
            p7.pluginWasChecked = await box.isChecked();
            await box.click();
            await toast.waitFor({state: 'visible', timeout: 15000}).catch(() => {});
            p7.pluginToast = await toasts(page);
            p7.pluginUrl = page.url();
            record(`p7-plugin-toggle-${app.name}`, await safeScreen(page));
            await shot(page, `p7-plugin-toggle-${app.name}`);
            await toast.waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
            await box.click();
            await toast.waitFor({state: 'visible', timeout: 15000}).catch(() => {});
            p7.pluginToastBack = await toasts(page);
            await signOut(page);
        } finally { await close(); }
        S.p7 = p7;
    } catch (e) { S.errors.phase7 = String(e.stack || e).slice(0, 800); }

    // ---- Phase 8: "Editorial Assignments" ticked on the section, then a wizard submission.
    try {
        const {page, close} = await launch(app);
        page.on('dialog', (d) => d.accept().catch(() => {}));
        const p8 = {};
        S.p8 = p8;
        try {
            await signIn(page, U.m1);
            await page.goto(app.url(`/index.php/${t}/management/settings/context`)); await idle(page);
            await page.getByRole('tab', {name: /^(Sections|Series)$/}).first().click(); await idle(page);
            const grid = page.locator('#sectionsGridContainer, #seriesGridContainer').first();
            await grid.waitFor({timeout: 20000});
            record(`p8-sections-grid-${app.name}`, await safeScreen(page));
            p8.gridText = (await grid.innerText()).replace(/\s+/g, ' ').slice(0, 300);
            if (app.name !== 'omp') {
                await grid.locator('tr.gridRow a.show_extras').first().click(); await idle(page);
                await grid.getByRole('link', {name: 'Edit', exact: true}).first().click();
                const form = page.locator('form#sectionForm');
                await form.locator('input[name^="subEditors"]').first().waitFor({timeout: 20000});
                p8.boxesBefore = await form.locator('input[name^="subEditors"]').evaluateAll((els) => els.map((e) => ({label: (e.labels && e.labels[0] ? e.labels[0].innerText : '').trim(), checked: e.checked})));
                const seBox = form.locator('input[name^="subEditors"]').filter({has: page.locator(`xpath=..//*[contains(., "${U.se}")]`)}).first();
                const target = (await seBox.count()) ? seBox : form.locator('input[name^="subEditors"]').last();
                await target.check();
                record(`p8-section-form-ticked-${app.name}`, await safeScreen(page));
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                await form.waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
                await idle(page);
                p8.saved = true;
                await signOut(page);
                await signIn(page, U.au);
                const title3 = `Assigned ${t}`;
                try { p8.wizard = await wizardFromStart(page, app, t, title3, 'p8-wizard'); } catch (e) { p8.wizardError = String(e.message).slice(0, 400); record(`p8-wizard-failed-${app.name}`, await safeScreen(page)); }
                await signOut(page);
                if (p8.wizard) {
                    try { const m = await app.mail.find({to: mailTo(U.se), contains: title3, timeoutMs: 6000}); p8.seMail = {subject: m.Subject}; } catch (e) { p8.seMail = null; }
                    try { const m = await app.mail.find({to: mailTo(U.m1), contains: title3, timeoutMs: 6000}); p8.m1Mail = {subject: m.Subject}; } catch (e) { p8.m1Mail = null; }
                    await signIn(page, U.m1);
                    await dashboard(page, app, t);
                    p8.m1Bell = await bellState(page);
                    await openWindow(page);
                    p8.m1Rows = (await windowRows(page)).rows.filter((r) => (r.title || '').includes('Assigned'));
                    record(`p8-m1-window-${app.name}`, await safeScreen(page));
                    await closeWindow(page);
                    await page.goto(app.url(`/index.php/${t}/dashboard/editorial?workflowSubmissionId=${p8.wizard.submissionId}`));
                    await page.locator('[data-cy="discussion-manager"], .pkpWorkflow, [role="dialog"]').first().waitFor({timeout: 45000}).catch(() => {});
                    await idle(page);
                    const s = await safeScreen(page);
                    record(`p8-workflow-${app.name}`, s);
                    const body = await page.locator('body').innerText();
                    p8.participantsMentionSe = body.includes(U.se);
                    p8.workflowText = body.replace(/\s+/g, ' ').slice(0, 600);
                    await signOut(page);
                    await signIn(page, U.se);
                    await dashboard(page, app, t);
                    p8.seBell = await bellState(page);
                    await openWindow(page);
                    p8.seRows = (await windowRows(page)).rows;
                    await closeWindow(page);
                    await signOut(page);
                }
            } else {
                await signOut(page);
            }
        } finally { await close(); }
        S.p8 = p8;
    } catch (e) { S.errors.phase8 = String(e.stack || e).slice(0, 800); }

    record(`k1-summary-${app.name}`, S);
    return S;
});
