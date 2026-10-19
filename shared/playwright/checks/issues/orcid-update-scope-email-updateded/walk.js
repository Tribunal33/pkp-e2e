// Issue report U04 A21: the "Requesting updated ORCID record access" email (ORCID_REQUEST_UPDATE_SCOPE)
// asks for "updateded permissions". The report's steps through the screens, on PKP's default dataset:
//
//   STEPS=template  (OJS, OMP; a preprint server lists no ORCID email) as rvaca: Settings › Workflow ›
//                   "Emails" › "Add and edit templates", `ORCID` searched, "Edit" on "orcidRequestUpdateScope",
//                   the English "Body" read.
//   STEPS=email     (OJS, OPS; a press deposits nothing, so it never sends the email) the U04 A14 report's
//                   steps: ORCID on with "Member Sandbox" (screen), the contributor's public-API verification
//                   (SQL, as VerifyIdentityWithOrcid stores it), publish/post on screen, the delivered
//                   email read.
//   STEPS=nb        the fix's neighbour (run alone, fix in and out): every stored default template's
//                   key, locale and the md5 of its name, subject and body (SQL), and the English and
//                   French bodies of this template, so the two runs show the fix changes one word of
//                   one English text and nothing else.
//   STEPS=wayround  (run alone; OJS or OMP) as rvaca: the template opened as in "template", the word selected
//                   in the body and "updated" typed over it, "Save"; the list row's buttons read, the template
//                   reopened, then any "Reset" the screens offer pressed and the body read again.
//   Default: STEPS=template,email.
//
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=h19e node bin/probe.js all \
//     shared/playwright/checks/issues/orcid-update-scope-email-updateded/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<its feature> in front.)
//   A fix to the .po text shows on a loaded dataset only after the template's install step is replayed:
//     (cd checkouts/<app> && PKP_CONFIG_FILE=$PWD/config.test.ds<n>.inc.php php lib/pkp/tools/installEmailTemplate.php ORCID_REQUEST_UPDATE_SCOPE en,fr_CA)
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql, serverLog} = require('../../../probe');
const R = require('./lib.js');
const E = R;
const {setOrcidMember} = R;

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n));
const KEY = 'ORCID_REQUEST_UPDATE_SCOPE';
const ROW = 'orcidRequestUpdateScope';
/** The sentence the finding is about, cut out of a body or an email's text. */
const sentence = (text) => {
    const t = flat(text, 5000) || '';
    const m = t.match(/You have previously authorized[^.]*\./);
    return m ? m[0] : null;
};

forEachApp(async (app) => {
    const only = (process.env.STEPS || 'template,email').split(',').filter(Boolean);
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || 'main', dataset: app.dataset, steps: only};
    const say = (k, v) => console.log(`[h19e ${app.name}] ${k}:`, JSON.stringify(v).slice(0, 1500));
    const step = async (name, fn) => {
        if (!only.includes(name)) return;
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        say(name, facts[name]);
        record('facts', facts);
    };
    const rec = (n, data) => record(`email-${n}`, data);
    rec.prefix = 'email-';
    const {page, close} = await launch(app);
    try {
        await step('template', async () => {
            if (app.name === 'ops') return {skipped: 'a preprint server lists no ORCID email on Manage Emails (U04 OPS2)'};
            await signIn(page, 'rvaca');
            const {m, via} = await E.openManageEmails(page, app);
            await m.search('ORCID');
            await idle(page);
            await page.waitForTimeout(500);
            const rows = (await m.rowsRead()).map((r) => r.name);
            record('template-search', await screen(page));
            const out = {via, rows};
            if (!rows.includes(ROW)) return {...out, missing: ROW};
            const {kind, window} = await m.openEmail(ROW, {search: false});
            out.opens = kind;
            if (kind !== 'one') {
                out.window = flat(await window.innerText().catch(() => ''), 400);
                return out;
            }
            out.subject = await m.subjectBox('en').inputValue().catch(() => null);
            const html = await m.bodyHtml('en');
            out.bodySentence = sentence(html);
            out.updateded = /updateded/.test(html);
            record('template-edit', await screen(page));
            out.stored = sql(app, `select locale, position('updateded' in body) from email_templates_default_data where email_key='${KEY}' order by 1`).split('\n');
            await m.closeWindow(window).catch(() => {});
            await signOut(page);
            return out;
        });

        await step('email', async () => {
            const subject = R.SUBJECT[app.name];
            if (!subject) return {skipped: 'a press deposits nothing, so it never sends the email (U04 OMP1)'};
            const {sid, email} = subject;
            const out = {};
            const log = serverLog(app);
            await signIn(page, 'rvaca');
            try { out.settings = await setOrcidMember(page, app, {}, rec); } catch (e) { out.settingsError = flat(e.message, 300); }
            await signOut(page);
            out.precondition = R.seedPublicVerifiedOrcid(app, sid, email).rows;
            await signIn(page, 'dbarnes');
            const since = new Date();
            const from = log.mark();
            out.publish = await R.publishOnScreen(page, app, sid, rec);
            out.publishLog = log.since(from).map((l) => flat(l, 300));
            const message = await R.awaitMail(page, app, {to: email, subject: 'Requesting updated ORCID record access', since});
            if (!message) return {...out, mail: null, jobs: sql(app, "select id, left(exception, 200) from failed_jobs order by id")};
            const full = await app.fleetMail.fullMessage(message.ID);
            out.mail = {subject: full.Subject, from: full.From && `${full.From.Name} <${full.From.Address}>`, to: (full.To || []).map((t) => t.Address)};
            out.mailSentence = sentence(full.Text || full.HTML);
            out.updateded = /updateded/.test(full.Text || '') || /updateded/.test(full.HTML || '');
            record('email-message', {subject: full.Subject, text: full.Text});
            await signOut(page).catch(() => {});
            return out;
        });

        await step('wayround', async () => {
            if (app.name === 'ops') return {skipped: 'not listed on a preprint server'};
            await signIn(page, 'rvaca');
            const {m} = await E.openManageEmails(page, app);
            const open = async () => {
                await m.search('ORCID');
                await idle(page);
                await page.waitForTimeout(500);
                return m.openEmail(ROW, {search: false});
            };
            const out = {};
            await open();
            await m.bodyHtml('en');
            // Select the word in the editor, as a double-click would, and type over it.
            const frame = page.frameLocator(`#${m.bodyId('en')}_ifr`);
            await frame.locator('body').click();
            out.selected = await frame.locator('body').evaluate((body) => {
                const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT);
                for (let n = walker.nextNode(); n; n = walker.nextNode()) {
                    const i = n.data.indexOf('updateded');
                    if (i >= 0) {
                        const r = body.ownerDocument.createRange();
                        r.setStart(n, i);
                        r.setEnd(n, i + 'updateded'.length);
                        const sel = body.ownerDocument.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(r);
                        return sel.toString();
                    }
                }
                return null;
            });
            if (!out.selected) return out;
            await page.keyboard.type('updated');
            out.edited = sentence(await m.bodyHtml('en'));
            out.save = await m.pressTemplateSave().catch((e) => ({error: flat(e.message, 200)}));
            await page.waitForTimeout(1500);
            record('wayround-saved', await screen(page));
            out.storedCustom = sql(app, `select s.locale, position('updateded' in s.setting_value), position('require updated' in s.setting_value) from email_templates t join email_templates_settings s on s.email_id = t.email_id where t.email_key='${KEY}' and s.setting_name='body' order by 1`).split('\n');
            await m.goto();
            await m.search('ORCID');
            await idle(page);
            await page.waitForTimeout(500);
            out.rowsAfter = (await m.rowsRead()).map((r) => ({name: r.name, buttons: r.buttons}));
            record('wayround-list', await screen(page));
            const {window} = await m.openEmail(ROW, {search: false});
            out.reopened = sentence(await m.bodyHtml('en'));
            out.windowButtons = await window.getByRole('button').allInnerTexts().catch(() => []);
            await m.closeWindow(window).catch(() => {});
            // "Reset", wherever the screens offer it for this email (the row, or "Reset All").
            const row = m.rows().filter({hasText: ROW}).first();
            const reset = row.getByRole('button', {name: /^Reset/});
            if (await reset.count()) {
                await reset.first().click();
                out.resetVia = 'row';
            } else {
                out.resetVia = 'Reset All';
                await m.resetAllButton().click();
            }
            const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: /^Reset/})}).last();
            await confirm.waitFor({timeout: 15_000}).catch(() => {});
            out.confirmText = flat(await confirm.innerText().catch(() => null), 300);
            await confirm.getByRole('button', {name: /^Reset/}).last().click().catch((e) => { out.confirmError = flat(e.message, 200); });
            await page.waitForTimeout(2500);
            await idle(page).catch(() => {});
            await m.goto();
            const again = await open();
            out.afterReset = sentence(await m.bodyHtml('en'));
            record('wayround-reset', await screen(page));
            await m.closeWindow(again.window).catch(() => {});
            await signOut(page);
            return out;
        });

        await step('nb', async () => {
            const out = {};
            out.version = sql(app, "select major||'.'||minor||'.'||revision||'.'||build from versions where current = 1 and product_type = 'core'");
            out.stored = sql(app, 'select email_key, locale, md5(name), md5(subject), md5(body) from email_templates_default_data order by 1, 2').split('\n');
            out.thisTemplate = sql(app, `select locale, subject, md5(body), length(body) from email_templates_default_data where email_key='${KEY}' order by 1`).split('\n');
            const bodies = sql(app, `select locale || '¦' || replace(replace(body, chr(10), ' '), chr(13), ' ') from email_templates_default_data where email_key='${KEY}' order by 1`).split('\n');
            out.sentences = bodies.map((b) => {
                const [locale, body] = b.split('¦');
                return {locale, sentence: sentence(body), french: locale === 'fr_CA' ? flat(body, 600) : undefined};
            });
            record('nb-facts', out);
            return out;
        });
    } finally {
        record('facts', facts);
        await close();
    }
});
