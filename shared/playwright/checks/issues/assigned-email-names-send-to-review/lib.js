// Helpers of walk.js (issue report docs/issues/U35-OJS1-assigned-email-names-send-to-review.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses, or reads a mailbox.
const {idle} = require('../../../probe');
const M = require('../moderator-assigned-email-never-sent/lib.js');

const {T, sleep, flat, L} = M;

/** Per-app dataset users and screen words the steps name. */
const WORDS = {
    ojs: {email: 'Editor Assigned (Auto)', author: 'ccorino', editor: 'dbarnes'},
    omp: {email: 'Editor Assigned (Auto)', author: 'aclark', editor: 'dbuskins'},
};

/** Every quoted name in the sentence that tells the editor what to select: ["Send to Review", "Add Reviewer"]. */
function namedButtons(text) {
    const m = /please forward the submission[^.]*\./.exec((text || '').replace(/\s+/g, ' '));
    const sentence = m ? m[0] : null;
    return {sentence, names: sentence ? [...sentence.matchAll(/["“]([^"”]+)["”]/g)].map((x) => x[1]) : []};
}

const plain = (html) => (html || '').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** As the signed-in manager: the email's "Edit" window under Settings › Workflow › Emails; the English body's text. */
async function templateBody(page, app) {
    const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
    const name = WORDS[app.name].email;
    const p = new ManageEmailsPage(page, `${app.contextPath}${L(app)}`);
    await p.goto();
    await p.search(name);
    await idle(page).catch(() => {});
    const {kind} = await p.openEmail(name, {search: false});
    if (kind !== 'one') return {kind, body: null};
    const subject = await p.subjectBox('en').inputValue().catch(() => null);
    return {kind, subject, body: plain(await p.bodyHtml('en'))};
}

/** The newest message to `to` holding `marker`, whole: {subject, text, links}. Polls as M.waitMail does. */
async function readMail(page, app, to, marker, ms) {
    await M.waitMail(page, app, to, marker, ms);
    const r = await app.mail._search({to, contains: marker}).catch(() => ({messages: []}));
    const hit = (r.messages || []).find((m) => /^You have been assigned as/.test(m.Subject));
    if (!hit) return {found: (r.messages || []).map((m) => m.Subject)};
    const full = await app.mail._get(`/api/v1/message/${hit.ID}`);
    const links = [...(full.HTML || '').matchAll(/href="([^"]+)"/g)].map((x) => x[1].replace(/&amp;/g, '&'));
    return {subject: full.Subject, text: plain(full.HTML || full.Text), links};
}

/** Open `link` (the email's link) as the signed-in editor; the names of the buttons the workflow shows. */
async function openLinkAndReadButtons(page, link) {
    await page.goto(link);
    await idle(page).catch(() => {});
    const dialog = page.getByRole('dialog').last();
    await dialog.waitFor({timeout: T}).catch(() => {});
    await dialog.getByText('Participants', {exact: false}).first().waitFor({timeout: T}).catch(() => {});
    await sleep(1500);
    const scope = (await dialog.count()) ? dialog : page.locator('body');
    const names = (await scope.locator('button, a[role="button"], a.pkp_button, a.pkpButton').allInnerTexts()).map((s) => flat(s, 80)).filter(Boolean);
    return [...new Set(names)];
}

module.exports = {T, sleep, flat, L, WORDS, namedButtons, plain, templateBody, readMail, openLinkAndReadButtons, submitAs: M.submitAs};
