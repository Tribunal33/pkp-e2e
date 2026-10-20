// U05 claim check, chunk K2 — remainder: Rule 5b for the discussion email
// ("Discussion added." email box ticked → the reply's task still arrives,
// its email does not), driven from the Author's side: the Author ticks the
// box, the Manager replies from the editorial workflow. The main run drove
// the same claim with the roles swapped on OJS and OMP; on OPS the Author's
// second message through the display modal did not save (see the report).
// Runs on the scratch context k2.js saved (scratch.json in the agent folder).
//
//   ONLY=ops PROBE_FEATURE=U05 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U05/K2/k2-remainder.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, outDir, outFile} = require('../../../probe');

const scratchAll = JSON.parse(fs.readFileSync(outFile(`k2-scratch-${process.env.PROBE_APPS}.json`), 'utf8'));
const email = (u) => `${u}@mail.test`;

async function safeScreen(page) {
    try {
        return await screen(page);
    } catch (error) {
        return {url: page.url(), screenError: String(error.message).split('\n')[0]};
    }
}

async function readRow(page, regex) {
    const form = page.locator('form#notificationSettingsForm');
    await form.waitFor({timeout: 15000});
    return form.evaluate((f, source) => {
        const re = new RegExp(source);
        for (const section of f.querySelectorAll('.section')) {
            const label = section.querySelector(':scope > ul > label:not([for]), :scope > label:not([for])');
            if (label && re.test(label.innerText)) {
                return {sentence: label.innerText.trim(), boxes: [...section.querySelectorAll('input[type=checkbox]')].map((b) => ({id: b.id, checked: b.checked, disabled: b.disabled}))};
            }
        }
        return null;
    }, regex.source);
}

async function tasksWindow(page, app, contextPath, name, dashboard) {
    await page.goto(app.url(`/index.php/${contextPath}/${dashboard}`));
    const bell = page.getByRole('button', {name: /^Tasks/});
    await bell.waitFor({timeout: 30000});
    const bellText = (await bell.innerText()).replace(/\s+/g, ' ').trim();
    await bell.click();
    const dialog = page.locator('[role="dialog"]:visible').last();
    await dialog.waitFor({timeout: 30000});
    await dialog.getByText('Mark New').waitFor({timeout: 30000}).catch(() => {});
    await idle(page);
    const rows = await dialog.locator('tr.gridRow').evaluateAll((els) => els.map((e) => ({text: e.innerText.replace(/\s+/g, ' ').trim(), unread: !!e.querySelector('.unread')})));
    await shot(page, name);
    record(name, {...(await safeScreen(page)), bellText, rows});
    await page.keyboard.press('Escape');
    await dialog.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
    return {bellText, rows};
}

forEachApp(async (app) => {
    const scratch = scratchAll[app.name];
    const {m1, au} = scratch;
    const cp = scratch.path;
    const subId = scratch.discussion.submissionId;
    const dname = `Discussion ${scratch.tag}d`;
    const replyText = `Reply ${scratch.tag}m1r`;
    const summary = {app: app.name, problems: []};
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => d.accept().catch(() => {}));
    try {
        // 1. The Author ticks "Do not send me an email…" under "Discussion added." and saves.
        await signIn(page, au);
        await page.goto(app.url(`/index.php/${cp}/user/profile/notificationSettings`));
        await idle(page);
        const row = await readRow(page, /Discussion added\./);
        const form = page.locator('form#notificationSettingsForm');
        await form.locator(`#${row.boxes[1].id}`).check();
        const action = await form.getAttribute('action');
        const saved = page.waitForResponse((r) => r.url().startsWith(action.split('?')[0]) && r.request().method() === 'POST', {timeout: 20000});
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        summary.auSaveStatus = (await saved).status();
        await page.goto(app.url(`/index.php/${cp}/user/profile/notificationSettings`));
        await idle(page);
        summary.auRowAfterReload = await readRow(page, /Discussion added\./);
        record(`rem-tab-au-added-email-ticked-${app.name}`, {...(await safeScreen(page)), row: summary.auRowAfterReload});
        await shot(page, `rem-tab-au-added-email-ticked-${app.name}`);
        summary.auTasksBefore = await tasksWindow(page, app, cp, `rem-tasks-au-before-${app.name}`, 'dashboard/mySubmissions');
        summary.auMailBefore = await app.mail.count({to: email(au)});
        await signOut(page);

        // 2. The Manager replies from the editorial workflow.
        await signIn(page, m1);
        await page.goto(app.url(`/index.php/${cp}/dashboard/editorial?workflowSubmissionId=${subId}`));
        const panel = page.locator('[data-cy="discussion-manager"]').first();
        await panel.waitFor({timeout: 45000});
        await panel.getByText(dname).first().click();
        const modal = page.locator('[data-cy="active-modal"]').last();
        const addMessage = modal.getByRole('button', {name: 'Add New Message', exact: true});
        await addMessage.waitFor({timeout: 30000});
        record(`rem-display-m1-${app.name}`, await safeScreen(page));
        // The press is swallowed at times once two messages are listed (OPS): press again until a visible editor appears.
        const frame = modal.frameLocator('iframe:visible').last();
        for (let attempt = 0; ; attempt++) {
            await addMessage.click({timeout: 10000});
            try {
                await frame.locator('body').waitFor({timeout: 6000});
                summary.addMessagePresses = attempt + 1;
                break;
            } catch (error) {
                if (attempt >= 5) throw error;
            }
        }
        await frame.locator('body').fill(replyText);
        summary.editorTextAfterFill = await frame.locator('body').innerText().catch(() => null);
        const posted = page.waitForResponse((r) => /\/tasks\/\d+/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), {timeout: 30000}).catch(() => null);
        summary.pressedAt = new Date().toISOString();
        const saveButton = modal.getByRole('button', {name: 'Save', exact: true});
        try {
            await saveButton.click({timeout: 15000});
        } catch {
            summary.saveForced = true;
            await saveButton.click({force: true});
        }
        const response = await posted;
        summary.replyStatus = response ? response.status() : null;
        summary.replyUrl = response ? `${response.request().method()} ${response.url().replace(/^https?:\/\/[^/]+/, '')}` : null;
        await addMessage.waitFor({timeout: 15000}).catch(() => {});
        record(`rem-after-reply-m1-${app.name}`, await safeScreen(page));
        await shot(page, `rem-after-reply-m1-${app.name}`);
        await signOut(page);

        // 3. Mailboxes and the Author's Tasks window.
        const own = await app.mail.find({to: email(m1), contains: replyText, timeoutMs: 20000}).catch(() => null);
        summary.m1OwnCopy = own ? {subject: own.Subject, created: own.Created} : null;
        summary.auMailForReply = await app.mail.count({to: email(au), contains: replyText});
        summary.auMailAfter = await app.mail.count({to: email(au)});
        await signIn(page, au);
        summary.auTasksAfter = await tasksWindow(page, app, cp, `rem-tasks-au-after-${app.name}`, 'dashboard/mySubmissions');
        await signOut(page);
    } catch (error) {
        summary.problems.push(String(error.stack || error).slice(0, 700));
        await shot(page, `problem-rem-${app.name}`).catch(() => {});
    } finally {
        record(`k2-remainder-summary-${app.name}`, summary);
        await close();
    }
});
