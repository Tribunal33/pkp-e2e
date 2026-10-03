// Helpers of the walk for issue reports U04 A2 (the ORCID-denied landing shows a raw
// placeholder) and U04 A8 (the landing's contact line says "journal manager" on a press and
// a preprint server). Requiring this file runs nothing.
const {idle, screen, shot, rawKeys} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** ORCID's OAuth denial: what ORCID appends to the redirect_uri when "Deny" is pressed. */
const DENIAL = 'error=access_denied&error_description=User%20denied%20access';

/**
 * As an editor: open the submission's workflow, its Publication (OPS: Preprint) ›
 * "Contributors", "Edit" on the contributor named `name`; returns the edit window.
 */
async function openContributorEditor(page, app, submissionId, name) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
    await wf.gotoEditorial(submissionId);
    await idle(page);
    await wf.expandLatestVersionNode().catch(() => {}); // 3.5 has no version nodes
    if (!(await wf.menuLink('Contributors').count())) await wf.publicationGroup().click().catch(() => {});
    await wf.select('Contributors', `${group}: Contributors`);
    await idle(page);
    const item = page.locator('.listPanel__item').filter({hasText: name}).first();
    await item.getByRole('button', {name: 'Edit', exact: true}).click();
    const modal = page.locator('[data-cy="active-modal"]').filter({has: page.locator('[id^="contributor-givenName"]')});
    await modal.locator('[id^="contributor-givenName"]').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    return modal;
}

/**
 * In the contributor's "ORCID iD" field: "Request verification", then "Yes" in "Request ORCID
 * verification". Returns the dialog's text, the request's answer and the field afterwards.
 */
async function requestVerification(page, modal) {
    const field = modal.locator('.pkpFormField').filter({hasText: 'ORCID iD'}).first();
    const out = {fieldBefore: flat(await field.innerText().catch(() => null), 300)};
    await field.getByRole('button', {name: 'Request verification'}).click();
    const dialog = page.getByRole('dialog').filter({hasText: 'Request ORCID verification'}).last();
    await dialog.waitFor({state: 'visible', timeout: T});
    out.dialog = flat(await dialog.innerText(), 400);
    const answered = page.waitForResponse((r) => r.url().includes('/orcid/requestAuthorVerification/'), {timeout: T}).catch(() => null);
    await dialog.getByRole('button', {name: 'Yes', exact: true}).click();
    const r = await answered;
    out.request = r ? {status: r.status(), method: r.request().method()} : null;
    await idle(page);
    await sleep(800);
    out.fieldAfter = flat(await field.innerText().catch(() => null), 300);
    return out;
}

/**
 * The contributor's mailbox: the newest message since `since` that carries ORCID's
 * authorization link. The dataset's job runner sends on web requests, so the page is
 * reloaded between reads. Returns the subject, the link and its redirect_uri.
 */
async function readAuthorizationLink(page, app, to, since) {
    for (let i = 0; i < 8; i++) {
        const found = await app.mail.find({to, since, timeoutMs: 6000}).catch(() => null);
        if (found) {
            const full = await app.mail.fullMessage(found.ID);
            const hrefs = [];
            const re = /<a\b[^>]*href=(["'])([^"']+)\1/gi;
            let m;
            while ((m = re.exec(full.HTML || '')) !== null) hrefs.push(m[2].replace(/&amp;/g, '&'));
            const authorization = hrefs.find((h) => /orcid\.org\/oauth\/authorize/.test(h)) || null;
            if (authorization) {
                const redirect = new URL(authorization).searchParams.get('redirect_uri');
                return {subject: found.Subject, authorization, redirectUri: redirect};
            }
        }
        await page.reload().catch(() => {});
        await idle(page).catch(() => {});
    }
    return null;
}

/** Open an address on this install (its path and query, on the fleet's own server). */
async function openOnInstall(page, app, href) {
    const u = new URL(href);
    const resp = await page.goto(app.url(`${u.pathname}${u.search}`));
    await idle(page);
    return resp ? resp.status() : null;
}

/** The "ORCID Authorization" page as data: heading, the failure block, the closing line, raw codes. */
async function readVerifyPage(page, name) {
    const s = await screen(page);
    await shot(page, name).catch(() => {});
    const desc = page.locator('.page_message .description');
    const failure = page.locator('.page_message .orcid-failure');
    const descText = flat(await desc.innerText().catch(() => null), 800);
    const failureText = flat(await failure.innerText().catch(() => null), 400);
    return {
        url: page.url(),
        heading: flat(await page.locator('.page_message h2').first().innerText().catch(() => null), 120),
        failure: failureText,
        closing: descText && failureText != null ? flat(descText.replace(failureText, ''), 400) : descText,
        description: descText,
        rawKeys: await rawKeys(page).catch((e) => ({error: flat(e.message, 200)})),
        screen: s,
    };
}

module.exports = {T, sleep, flat, DENIAL, openContributorEditor, requestVerification, readAuthorizationLink, openOnInstall, readVerifyPage};
