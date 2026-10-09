// Shared steps of the pkp/pkp-lib#13283 PR review checks in this folder (site-orcid-tab.js,
// orcid-emails.js): turning ORCID on for the dataset's one context through its own "ORCID" tab,
// pressing a contributor's "Request verification" (or "Resend Verification Email" once one was
// requested), and reading the mail that press sends. Nothing here asserts: every step answers
// with what it saw, and a step that cannot be driven answers with `{error}`.
const {execFileSync} = require('child_process');
const path = require('path');
const {idle, drainJobs} = require('../../../probe');

const CLIENT_ID = 'APP-TEST';
const CLIENT_SECRET = 'test-secret';

/** The checkout's pkp-lib commit, for the output file names. */
function pkpLibSha(app) {
    return execFileSync('git', ['-C', path.join(path.resolve(app.root), 'lib/pkp'), 'rev-parse', '--short=10', 'HEAD'], {encoding: 'utf8'}).trim();
}

/** Run a step; a throw becomes `{error: <first line>}`. */
async function attempt(fn) {
    try {
        return await fn();
    } catch (error) {
        return {error: String((error && error.message) || error).split('\n')[0].slice(0, 300)};
    }
}

/**
 * The context's "ORCID" tab (Settings › Users & Roles) as the screen shows it: each control's
 * state and the panel's words. `OrcidSettingsTab` comes from the app's OrcidPages.js.
 */
async function readJournalTab(page, app, OrcidSettingsTab) {
    const tab = new OrcidSettingsTab(page, app.contextPath);
    await page.goto(tab.contextUrl(app.contextPath, '/management/settings/access'));
    await idle(page);
    const tabButton = page.getByRole('tab', {name: 'ORCID', exact: true});
    if ((await tabButton.count()) === 0) {
        return {tabPresent: false};
    }
    await tabButton.click();
    await tab.panel.waitFor({state: 'visible', timeout: 30_000});
    await idle(page);
    const control = async (locator, {secret = false} = {}) => {
        if ((await locator.count()) === 0) {
            return {present: false};
        }
        const first = locator.first();
        const value = await first.inputValue().catch(() => null);
        return {
            present: true,
            visible: await first.isVisible(),
            disabled: await first.isDisabled(),
            readonly: (await first.getAttribute('readonly')) !== null,
            ...(secret ? {valueLength: value === null ? null : value.length} : {value}),
        };
    };
    const enable = tab.panel.getByRole('checkbox').first();
    return {
        tabPresent: true,
        enable: (await enable.count()) ? {checked: await enable.isChecked(), disabled: await enable.isDisabled()} : {present: false},
        apiType: await control(tab.apiSelect),
        clientId: await control(tab.clientIdInput),
        clientSecret: await control(tab.clientSecretInput, {secret: true}),
        saveDisabled: (await tab.saveButton.count()) ? await tab.saveButton.isDisabled() : null,
        configuredGlobally: /configured globally/.test(await tab.panel.innerText()),
        text: (await tab.panel.innerText()).replace(/\n{2,}/g, '\n').trim(),
    };
}

/**
 * Turn ORCID on for the context on its own tab with the placeholder credentials and the named
 * "ORCID API" ("Public Sandbox", "Member Sandbox"). Answers with the save's status.
 */
async function journalOrcidOn(page, app, OrcidSettingsTab, apiLabel) {
    const tab = new OrcidSettingsTab(page, app.contextPath);
    await tab.goto();
    await idle(page);
    if (!(await tab.enableCheckbox.isChecked())) {
        await tab.enableCheckbox.check();
    }
    await tab.apiSelect.waitFor({state: 'visible', timeout: 15_000});
    await tab.apiSelect.selectOption({label: apiLabel});
    await tab.clientIdInput.fill(CLIENT_ID);
    await tab.clientSecretInput.fill(CLIENT_SECRET);
    const answered = page.waitForResponse((r) => r.url().includes('/api/v1/contexts/') && r.request().method() === 'POST', {timeout: 30_000});
    await tab.saveButton.click();
    const response = await answered;
    await idle(page);
    return {api: apiLabel, status: response.status()};
}

/**
 * Open the contributor's form in the workflow's Publication › Contributors and press the "ORCID
 * iD" field's "Request verification", or its "Resend Verification Email" when a request was
 * sent before; answer "Yes". Answers with the button pressed, the question asked and the
 * request's status. `since` is taken before the press, for the mailbox read.
 */
async function requestVerification(page, app, pages, {submissionId, name}) {
    const {WorkflowPage, openContributors} = pages;
    const workflow = new WorkflowPage(page, app.contextPath);
    await workflow.gotoEditorial(submissionId);
    await openContributors(page);
    const item = page.locator('.listPanel__item').filter({hasText: name}).first();
    await item.getByRole('button', {name: 'Edit', exact: true}).click();
    const modal = page.locator('[data-cy="active-modal"]').filter({has: page.locator('[id^="contributor-givenName"]')}).last();
    await modal.locator('[id^="contributor-givenName"]').first().waitFor({state: 'visible', timeout: 30_000});
    await idle(page);
    const field = modal.locator('.pkpFormField').filter({hasText: 'ORCID iD'}).last();
    const fieldBefore = (await field.innerText()).replace(/\s+/g, ' ').trim();
    const request = field.getByRole('button', {name: 'Request verification'});
    const resend = field.getByRole('button', {name: 'Resend Verification Email'});
    const pressed = (await request.count()) ? 'Request verification' : (await resend.count()) ? 'Resend Verification Email' : null;
    if (!pressed) {
        return {pressed, fieldBefore};
    }
    const since = new Date();
    await (pressed === 'Request verification' ? request : resend).click();
    const dialog = page.getByRole('dialog').filter({hasText: 'requesting they verify their ORCID'}).last();
    await dialog.waitFor({state: 'visible', timeout: 15_000});
    const question = (await dialog.innerText()).replace(/\s+/g, ' ').trim();
    const answered = page.waitForResponse((r) => r.url().includes('/orcid/requestAuthorVerification/'), {timeout: 30_000});
    await dialog.getByRole('button', {name: 'Yes', exact: true}).click();
    const response = await answered;
    await idle(page);
    const fieldAfter = (await field.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    return {pressed, since, question, status: response.status(), fieldBefore, fieldAfter};
}

/** Every `<a href>` of a mail's HTML, entities in the address decoded. */
function links(html) {
    const found = [];
    const re = /<a\b[^>]*href=(["'])([^"']*)\1[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = re.exec(html || '')) !== null) {
        found.push({
            href: match[2].replace(/&amp;/g, '&').replace(/&#0?38;/g, '&'),
            text: match[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
        });
    }
    return found;
}

/** An OAuth address taken apart: ORCID's own part and the decoded `redirect_uri`, in full. */
function oauthParts(address) {
    if (!address) {
        return {address: address || null};
    }
    try {
        const url = new URL(address);
        return {
            address,
            authorize: `${url.origin}${url.pathname}`,
            clientId: url.searchParams.get('client_id'),
            scope: url.searchParams.get('scope'),
            redirectUri: url.searchParams.get('redirect_uri'),
        };
    } catch (error) {
        return {address, unparsable: String(error.message)};
    }
}

/**
 * The mail the press sent to the contributor: this fleet's newest message to the address since
 * `since`. The dataset's own job runner sends it on a later request; when none came within 20 s
 * the queue is drained once and the mailbox read again.
 */
async function requestMail(page, app, {to, since}) {
    let summary = null;
    let drained = false;
    try {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`)).catch(() => {});
        summary = await app.fleetMail.find({to, since, timeoutMs: 20_000});
    } catch (error) {
        drained = true;
        await drainJobs(app);
        summary = await app.fleetMail.find({to, since, timeoutMs: 20_000});
    }
    const full = await app.fleetMail.fullMessage(summary.ID);
    const all = links(full.HTML);
    const auth = all.find((l) => /orcid\.org\/oauth\/authorize/.test(l.href)) || null;
    return {
        drained,
        subject: full.Subject,
        from: full.From,
        to: full.To,
        text: full.Text,
        html: full.HTML,
        links: all,
        authLink: auth ? oauthParts(auth.href) : null,
    };
}

module.exports = {CLIENT_ID, CLIENT_SECRET, pkpLibSha, attempt, readJournalTab, journalOrcidOn, requestVerification, requestMail, links, oauthParts};
