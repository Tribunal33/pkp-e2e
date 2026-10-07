// Helpers of the walk for issue report U04 A14 (the "Requesting updated ORCID record access"
// link failing on the server). Requiring this file runs nothing.
const path = require('path');
const {idle, screen, shot, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app: the dataset submission whose contributor holds the iD, and their address. */
const SUBJECT = {
    ojs: {sid: 5, email: 'ddiouf@mailinator.com', name: 'Diaga Diouf'},
    ops: {sid: 1, email: 'ccorino@mailinator.com', name: 'Carlo Corino'},
};

/**
 * The precondition only ORCID's sign-in creates: a contributor verified while the context
 * used the public API. Written as PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData()
 * and saveIdentityData() store it (author_settings, locale '', the scope ORCID grants the
 * public API, OrcidManager::ORCID_API_SCOPE_PUBLIC "/authenticate", the expiry in
 * Carbon::toDateTimeString()'s shape about 20 years ahead). Portable SQL.
 */
function seedPublicVerifiedOrcid(app, submissionId, email) {
    const statement = `INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
SELECT a.author_id, '', v.setting_name, v.setting_value
FROM authors a
JOIN submissions s ON s.current_publication_id = a.publication_id
CROSS JOIN (
  SELECT 'orcid' AS setting_name, 'https://sandbox.orcid.org/0000-0002-1825-0097' AS setting_value
  UNION ALL SELECT 'orcidIsVerified', '1'
  UNION ALL SELECT 'orcidAccessToken', '00000000-1111-2222-3333-444444444444'
  UNION ALL SELECT 'orcidAccessScope', '/authenticate'
  UNION ALL SELECT 'orcidRefreshToken', '55555555-6666-7777-8888-999999999999'
  UNION ALL SELECT 'orcidAccessExpiresOn', '2046-10-01 00:00:00'
) v
WHERE s.submission_id = ${submissionId}
  AND a.email = '${email}';`;
    const result = sql(app, statement);
    return {statement, result, rows: orcidRows(app, submissionId, email)};
}

/** The contributor's ORCID settings on the submission's current publication, as lines. */
function orcidRows(app, submissionId, email) {
    return sql(app, `select s.setting_name, s.setting_value from authors a join author_settings s on s.author_id=a.author_id where a.email='${email}' and a.publication_id=(select current_publication_id from submissions where submission_id=${submissionId}) and s.setting_name like 'orcid%' order by 1`).split('\n');
}

/**
 * Publish (OJS: into "Vol. 1 No. 2 (2014)") or post (OPS) the submission through the
 * workflow, as the signed-in editor. Records each screen; returns what happened, never throws.
 */
async function publishOnScreen(page, app, submissionId, rec) {
    const out = {};
    const backIssue = /Vol\. 1 No\. 2 \(2014\)/;
    const answered = [];
    const onResp = (r) => { if (/\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET') answered.push({status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '')}); };
    page.on('response', onResp);
    try {
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${submissionId}`));
        await idle(page);
        if (app.name === 'ojs' && app.line !== 'stable-3_5_0') {
            const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
            const pub = new PublicationScreen(page, app.contextPath);
            await pub.openEntry('Title & Abstract');
            await idle(page);
            await pub.publish({backIssueLabel: backIssue});
        } else if (app.name === 'ops' && app.line !== 'stable-3_5_0') {
            const {postPreprint} = require(path.join(app.suiteDir, 'pages', 'PublicationPages.js'));
            await postPreprint(page);
        } else {
            // stable-3_5_0: the publication page's header button, then (OJS, no issue yet)
            // "Select an issue …" with its Issue select and "Save", then the confirmation's button.
            const tabs = page.getByRole('link', {name: 'Title & Abstract', exact: true});
            await tabs.first().waitFor({state: 'visible', timeout: T}).catch(() => {});
            if (await tabs.first().isVisible().catch(() => false)) await tabs.first().click();
            await idle(page);
            const label = app.name === 'ops' ? 'Post' : 'Schedule For Publication';
            const button = page.getByRole('button', {name: label, exact: true}).first();
            await button.waitFor({state: 'visible', timeout: T});
            await button.click();
            await sleep(1500);
            await idle(page);
            const issueSelect = page.locator('select[name="issueId"]').last();
            if (await issueSelect.isVisible().catch(() => false)) {
                rec('35-select-issue', await screen(page));
                const opt = issueSelect.locator('option').filter({hasText: backIssue});
                await issueSelect.selectOption((await opt.first().getAttribute('value')) || '');
                const form = page.locator('form').filter({has: issueSelect}).last();
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                await sleep(2000);
                await idle(page);
            }
            const confirmLabel = app.name === 'ops' ? 'Post' : 'Publish';
            const dlg = page.getByRole('dialog').filter({has: page.getByRole('button', {name: confirmLabel, exact: true})}).last();
            await dlg.waitFor({state: 'visible', timeout: T});
            await sleep(800);
            out.window = flat(await dlg.innerText().catch(() => null), 400);
            rec('35-confirm', await screen(page));
            await dlg.getByRole('button', {name: confirmLabel, exact: true}).last().click();
            await page.getByRole('button', {name: app.name === 'ops' ? 'Unpost' : 'Unpublish', exact: true}).first().waitFor({timeout: T}).catch(() => {});
        }
    } catch (e) {
        out.error = flat(e.message, 500);
    } finally {
        page.off('response', onResp);
    }
    await idle(page).catch(() => {});
    await sleep(1000);
    out.publishAnswers = answered;
    const after = await screen(page);
    rec('03-published', after);
    await shot(page, (rec.prefix || '') + '03-published').catch(() => {});
    out.status = flat((after.text && after.text.main) || '', 200);
    return out;
}

/**
 * Wait for the fleet's own message to `to` with `subject`, loading the front page between
 * reads so the job runner (on web requests in the dataset's config) runs the queued jobs.
 */
async function awaitMail(page, app, {to, subject, since, rounds = 18}) {
    for (let i = 0; i < rounds; i++) {
        const m = await app.fleetMail.find({to, subject, since, timeoutMs: 2000}).catch(() => null);
        if (m) return m;
        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await sleep(3000);
    }
    return null;
}

/** The message's ORCID authorize link and the redirect_uri inside it. */
async function readOrcidLink(app, message) {
    const full = await app.fleetMail.fullMessage(message.ID);
    const html = full.HTML || '';
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    const authorize = hrefs.find((h) => /oauth\/authorize/.test(h)) || null;
    const redirect = authorize ? new URL(authorize).searchParams.get('redirect_uri') : null;
    return {
        subject: full.Subject,
        from: full.From && `${full.From.Name} <${full.From.Address}>`,
        to: (full.To || []).map((t) => t.Address),
        text: flat(full.Text, 1500),
        authorizeLinks: hrefs.filter((h) => /oauth\/authorize/.test(h)).length,
        authorize,
        scope: authorize ? new URL(authorize).searchParams.get('scope') : null,
        redirect,
        aboutLink: hrefs.find((h) => /\/orcid\/about/.test(h)) || null,
    };
}

/**
 * Open the address ORCID sends the browser back to, with ORCID's answer appended. Returns
 * the HTTP status, the page's title, heading and text, and the server log lines it wrote.
 */
async function openReturn(page, app, url, log, rec, name) {
    const from = log.mark();
    const resp = await page.goto(url, {waitUntil: 'load'}).catch((e) => ({error: e.message}));
    await idle(page).catch(() => {});
    await sleep(500);
    const s = await screen(page);
    rec(name, s);
    await shot(page, (rec.prefix || '') + name).catch(() => {});
    return {
        url: url.replace(/^https?:\/\/[^/]+/, ''),
        status: resp && resp.status ? resp.status() : resp,
        title: await page.title().catch(() => null),
        heading: flat(await page.locator('h1, h2').first().innerText({timeout: 2000}).catch(() => null), 120),
        bodyText: flat(await page.locator('body').innerText().catch(() => null), 600),
        bodyLength: (await page.content().catch(() => '')).length,
        serverLog: log.since(from).map((l) => flat(l, 500)),
    };
}

/**
 * The contributor's ORCID iD field (Publication › Contributors › Edit): "Request verification",
 * "Yes". Returns what the field and the request showed; never throws.
 */
async function requestVerificationOnScreen(page, app, submissionId, name, rec) {
    const out = {};
    try {
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${submissionId}`));
        await idle(page);
        await page.getByRole('link', {name: 'Contributors', exact: true}).first().click();
        await page.getByRole('button', {name: 'Add Contributor'}).first().waitFor({timeout: T});
        const item = page.locator('.listPanel__item').filter({hasText: name}).first();
        await item.getByRole('button', {name: 'Edit', exact: true}).click();
        const modal = page.locator('[data-cy="active-modal"]').filter({has: page.locator('[id^="contributor-givenName"]')}).last();
        await modal.locator('[id^="contributor-givenName"]').first().waitFor({timeout: T});
        const field = modal.locator('.pkpFormField').filter({hasText: 'ORCID iD'}).first();
        out.fieldBefore = flat(await field.innerText().catch(() => null), 300);
        await field.getByRole('button', {name: 'Request verification'}).click();
        const dialog = page.getByRole('dialog').filter({hasText: 'requesting they verify their ORCID'}).last();
        await dialog.waitFor({timeout: T});
        const posted = page.waitForResponse((r) => r.url().includes('/orcid/requestAuthorVerification/'), {timeout: T}).catch(() => null);
        await dialog.getByRole('button', {name: 'Yes', exact: true}).click();
        const r = await posted;
        out.request = r ? r.status() : null;
        await sleep(1000);
        out.fieldAfter = flat(await field.innerText().catch(() => null), 300);
        rec('nb-requested', await screen(page));
    } catch (e) {
        out.error = flat(e.message, 400);
    }
    return out;
}

module.exports = {T, sleep, flat, SUBJECT, seedPublicVerifiedOrcid, orcidRows, publishOnScreen, awaitMail, readOrcidLink, openReturn, requestVerificationOnScreen};
