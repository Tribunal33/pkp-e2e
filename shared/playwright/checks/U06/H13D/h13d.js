// U06 claim check H13D (housekeeping 2026-10-13): two incidentals rows on User invitations.
//
// Row 9: every send and every invitation-page load writes PHP warnings to the server log
// (`Undefined array key "invitation_id"` from InvitationModel's id() getter; the
// `$emailSubject`/`$emailBody` warnings of pkp/pkp-lib#13216). Each step below marks the
// fleet's server log first and records the warnings written since, each pinned to the request
// line that follows it (php -S prints a request's warnings before its request line).
//
// Row 10: two newcomers choose the same username and reach "Review & create account"; the first
// accepts, then the second presses the accept button. Recorded: the /finalize answer, every
// notice, field error and dialog on the page, whether the button stays, and whether going back
// to "Create account" with another username recovers. Beside it the "Must not be taken" rule
// itself: a third newcomer types a dataset user's username, then the first newcomer's, on
// "Create account".
//
// Also read on the way: the Invitations table before and after (Rule 1, Rule 11), the email of
// a newcomer send and of an existing-user send (Side effects "On send"), the review step's
// "Cancel" dialog and "Go Back" (Rule 17), the decline page.
//
// PKP's default dataset (dataset fleet), as `rvaca` in `publicknowledge`; invitees are new
// addresses, so no seeded user changes (the accepted newcomers stay as new accounts).
// Run (twice, r1 and r2; main through the slot's app lock, one app per call):
//   bin/app-lock.sh shared ojs -- env PKP_E2E_DATASET=4 PROBE_FEATURE=U06 PROBE_AGENT=ccH13D PROBE_RUN=r1 \
//       node bin/probe.js ojs shared/playwright/checks/U06/H13D/h13d.js
//   PKP_E2E_LINE=stable-3_5_0 PKP_E2E_DATASET=4 PROBE_FEATURE=U06 PROBE_AGENT=ccH13D PROBE_RUN=r1 \
//       node bin/probe.js all shared/playwright/checks/U06/H13D/h13d.js
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, idle, tag, serverLog} = require('../../../probe');

const T = 30_000;
const ACR = {ojs: 'OJS', omp: 'OMP', ops: 'OPS'};
const flat = (s, n = 4000) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const today = () => new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
const strip = (u) => u.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '?…');

/** The server log since `from`: each PHP message, pinned on the request line after it. */
function logSince(log, from) {
    if (!fs.existsSync(log.file)) return [];
    const lines = fs.readFileSync(log.file).subarray(from).toString('utf8').split('\n');
    const out = [];
    let pending = [];
    for (const l of lines) {
        if (/PHP (Warning|Notice|Deprecated|Fatal error|Parse error)/.test(l)) {
            pending.push(l.replace(/^\[[^\]]+\]\s*/, '').replace(/\/home\/e2e\/[^ ]*?checkouts\//, '').trim());
            continue;
        }
        const m = l.match(/\[(\d{3})\]: (\w+) (\S+)/);
        if (m && pending.length) {
            out.push({request: `${m[1]} ${m[2]} ${strip(m[3])}`, warnings: pending});
            pending = [];
        } else if (m && Number(m[1]) >= 500) {
            out.push({request: `${m[1]} ${m[2]} ${strip(m[3])}`, warnings: []});
        }
    }
    if (pending.length) out.push({request: null, warnings: pending});
    return out;
}

/** Count of each distinct warning text across `entries`. */
function tally(entries) {
    const t = {};
    for (const e of entries) for (const w of e.warnings) t[w] = (t[w] || 0) + 1;
    return t;
}

forEachApp(async (app) => {
    const run = process.env.PROBE_RUN || 'r0';
    const T6 = tag('u06h13d').slice(-6);
    const addr = (n) => `${n}.u06h13d${T6}.${app.name}@mailinator.com`;
    const people = {una: addr('una'), duo: addr('duo'), tre: addr('tre'), qua: addr('qua')};
    const username = `twin${T6}${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', run, tag: T6, username, steps: {}, errors: {}};
    const log = serverLog(app);
    const runFrom = log.mark();
    const snaps = {};
    const snap = async (page, name) => {
        const s = await screen(page);
        record(`${name}`, s);
        snaps[name] = {url: strip(s.url), notices: s.notices};
        return s;
    };
    /** Run `fn` with the log marked; keep its warnings under `name`. */
    const logged = async (name, fn) => {
        const from = log.mark();
        let value;
        try {
            value = await fn();
        } catch (e) {
            facts.errors[name] = flat(String(e.stack || e), 800);
        }
        await new Promise((r) => setTimeout(r, 700));
        facts.steps[name] = logSince(log, from);
        return value;
    };
    const guard = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            facts.errors[name] = flat(String(e.stack || e), 800);
            return null;
        }
    };

    const manager = await launch(app);
    const visitors = {una: await launch(app), duo: await launch(app), tre: await launch(app), qua: await launch(app)};
    const mp = manager.page;
    const since = new Date(Date.now() - 2000).toISOString();

    const usersAndRoles = async () => {
        await mp.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
        await mp.locator('main h1').first().waitFor({timeout: T});
        await idle(mp);
    };
    const invitationsTable = async () => {
        const box = mp.locator('main').getByRole('table').filter({hasText: /Invited|No Items|invitation/i}).first();
        const rows = await mp.getByRole('row').filter({hasText: /u06h13d/}).allInnerTexts().catch(() => []);
        return {rows: rows.map((r) => flat(r, 300)), tableFound: (await box.count()) > 0};
    };
    /** "Invite to a role" > search > one new role > compose > send; each phase logged under `k`. */
    const send = async (k, email, {given, family, role = 'Author', masthead = 'Does not appear on the masthead', existing = false}) => {
        const out = {};
        await logged(`${k}-01-users-and-roles`, usersAndRoles);
        await logged(`${k}-02-open-wizard`, async () => {
            await mp.locator('main').getByRole('button').filter({hasText: /Invite to a role/}).first().click();
            await mp.locator('input[name="search"]').waitFor({timeout: T});
            await idle(mp);
        });
        out.wizardUrl = strip(mp.url());
        await logged(`${k}-03-search`, async () => {
            await mp.locator('input[name="search"]').fill(email);
            await mp.getByRole('button', {name: /^Search User/}).last().click();
            await mp.getByRole('button', {name: /Save And Continue/i}).waitFor({timeout: T});
            await idle(mp);
        });
        if (k === 'una' || existing) await snap(mp, `send-${k}-details`);
        if (!existing) {
            if (given) await mp.getByLabel(/^Given Name/).first().fill(given);
            if (family) await mp.getByLabel(/^Family Name/).first().fill(family);
        }
        const sel = mp.locator('select[name="userGroupId"]').last();
        const options = await sel.evaluate((s) => [...s.options].map((o) => o.text.trim()).filter(Boolean));
        out.roleOptions = options;
        const pick = Array.isArray(role) ? role.find((r) => options.includes(r)) : role;
        out.role = pick;
        await sel.selectOption({label: pick});
        const row = mp.getByRole('row').filter({has: sel});
        await row.getByRole('textbox').fill(today());
        const ms = row.locator('select[name="masthead"]');
        if (await ms.count()) await ms.selectOption({label: masthead});
        await logged(`${k}-04-to-compose`, async () => {
            await mp.getByRole('button', {name: /Save And Continue/i}).click();
            await mp.locator('input[name="subject"]').waitFor({timeout: T});
            await mp.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(mp);
        });
        if (k === 'una' || existing) await snap(mp, `send-${k}-compose`);
        await logged(`${k}-05-send`, async () => {
            await mp.getByRole('button', {name: 'Invite user to the role'}).click();
            const sent = mp.getByRole('dialog').filter({hasText: 'Invitation Sent'});
            await sent.waitFor({timeout: T});
            out.sentDialog = flat(await sent.innerText(), 400);
            await sent.getByRole('button', {name: 'View All Users'}).click();
            await mp.waitForURL(/management\/settings\/access/, {timeout: T}).catch(() => {});
            await idle(mp);
        });
        return out;
    };
    const mail = async (to) => {
        const host = new URL(app.baseURL).host;
        const deadline = Date.now() + T;
        for (;;) {
            const found = await app.mail._search({to, since});
            for (const m of found.messages || []) {
                const full = await app.mail.fullMessage(m.ID);
                const html = full.HTML || '';
                if (!html.includes(host)) continue;
                const grab = (op) => {
                    const hit = html.match(new RegExp(`href=['"]([^'"]*/invitation/${op}\\?[^'"]+)['"]`, 'i'));
                    return hit ? hit[1].replace(/&amp;/g, '&') : null;
                };
                const toLine = (full.To || []).map((x) => `${x.Name || ''} <${x.Address}>`);
                const fromLine = full.From ? `${full.From.Name || ''} <${full.From.Address}>` : null;
                return {subject: full.Subject, to: toLine, from: fromLine, text: full.Text || '', accept: grab('accept'), decline: grab('decline')};
            }
            if (Date.now() > deadline) throw new Error(`no invitation email to ${to} from ${host}`);
            await new Promise((r) => setTimeout(r, 1000));
        }
    };
    /** Track the visitor page's /invitations/ API answers (status, and the body of a refusal). */
    const apiTrail = (page) => {
        const trail = [];
        page.on('response', async (r) => {
            if (!/\/api\/v1\/invitations\//.test(r.url())) return;
            const e = {method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null, path: strip(r.url()).replace(/key\/[^/]+/, 'key/…'), status: r.status()};
            if (r.status() >= 400) e.body = await r.json().catch(() => null);
            trail.push(e);
        });
        return trail;
    };
    const saveAndContinue = (p) => p.getByRole('button', {name: /^Save and continue$/i});
    const acceptButton = (p) => p.getByRole('button', {name: /^Accept And Continue/i});
    const heading = async (p) => flat(await p.locator('.pkpStep:not([hidden]) h2, main h2').first().innerText().catch(() => null), 200);
    const fieldErrors = (p) =>
        p.locator('main').locator('.pkpFormFieldError, [id$="-error"], .pkpFormField__error, .text-negative').evaluateAll((l) =>
            l.filter((n) => !n.closest('button')).map((n) => n.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)
        );

    try {
        await signIn(mp, 'rvaca', {contextPath: app.contextPath});
        await usersAndRoles();
        facts.invitationsBefore = await invitationsTable();
        await snap(mp, 'users-roles-before');

        // Row 9: four newcomer sends, the first one step by step.
        facts.sends = {};
        facts.sends.una = await guard('send-una', () => send('una', people.una, {given: 'Nova', family: 'Quill'}));
        for (const k of ['duo', 'tre', 'qua']) facts.sends[k] = await guard(`send-${k}`, () => send(k, people[k], {given: 'Nova'}));
        await usersAndRoles();
        facts.invitationsAfterSend = await invitationsTable();
        await snap(mp, 'users-roles-after-send');

        const mails = {};
        for (const k of Object.keys(people)) mails[k] = await guard(`mail-${k}`, () => mail(people[k]));
        facts.mailUna = mails.una && {subject: mails.una.subject, to: mails.una.to, from: mails.una.from, text: mails.una.text};

        // Row 10: una and duo go through "Create account" with the same username to the review.
        const trails = {};
        facts.accept = {};
        for (const k of ['una', 'duo']) {
            const v = visitors[k].page;
            trails[k] = apiTrail(v);
            const a = (facts.accept[k] = {});
            await guard(`walk-${k}`, async () => {
                await logged(`${k}-11-accept-load`, async () => {
                    await v.goto(mails[k].accept);
                    await v.locator('.pkpSteps').first().waitFor({timeout: T});
                    await idle(v);
                });
                a.firstHeading = await heading(v);
                if (k === 'una') await snap(v, 'accept-una-create-account');
                await v.getByLabel(/^Username/).fill(username);
                await v.getByLabel(/^Password/).fill(`H13d-${T6}-Passw0rd`);
                await v.getByRole('checkbox').first().check();
                await logged(`${k}-12-create-account`, async () => {
                    await saveAndContinue(v).click();
                    await v.getByLabel(/^Country/).waitFor({timeout: T});
                    await idle(v);
                });
                if (k === 'una') await snap(v, 'accept-una-enter-details');
                await v.getByLabel(/^Country/).selectOption({index: 1});
                await logged(`${k}-13-enter-details`, async () => {
                    await saveAndContinue(v).click();
                    await acceptButton(v).waitFor({timeout: T});
                    await idle(v);
                });
                a.reviewHeading = await heading(v);
                a.reviewButtons = (await v.locator('main').getByRole('button').allInnerTexts()).map((t) => flat(t, 60));
                await snap(v, `accept-${k}-review`);
            });
        }
        const una = visitors.una.page;
        const duo = visitors.duo.page;
        await logged('una-14-accept', async () => {
            await acceptButton(una).click();
            await una.getByRole('dialog').first().waitFor({timeout: T});
            facts.accept.una.dialog = flat(await una.getByRole('dialog').first().innerText(), 300);
        });
        await snap(una, 'accept-una-accepted');

        // duo presses accept with the username taken now.
        const d = facts.accept.duo;
        await logged('duo-14-accept-taken', async () => {
            const before = trails.duo.length;
            await acceptButton(duo).click();
            await duo.waitForResponse((r) => /\/finalize/.test(r.url()), {timeout: T}).catch(() => null);
            await idle(duo);
            await duo.waitForTimeout(1500);
            d.trailAtAccept = trails.duo.slice(before);
        });
        const dShot = await snap(duo, 'accept-duo-after-taken');
        await shot(duo, 'accept-duo-after-taken').catch(() => {});
        d.afterTaken = {
            heading: await heading(duo),
            url: strip(duo.url()),
            dialogOpen: (await duo.getByRole('dialog').count()) > 0,
            acceptButtonVisible: await acceptButton(duo).isVisible().catch(() => false),
            alerts: await duo.locator('[role="alert"], [role="status"], .pkpNotification').evaluateAll((l) => l.map((n) => n.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)),
            fieldErrors: await fieldErrors(duo),
            codes: [...new Set((dShot.text.main || '').match(/##[A-Za-z0-9_.]+##/g) || [])],
            noticesSeen: dShot.notices,
        };
        // The same page again after five seconds (a notice that faded) and after the press again.
        await duo.waitForTimeout(5000);
        d.after5s = {acceptButtonVisible: await acceptButton(duo).isVisible().catch(() => false), alerts: await duo.locator('[role="alert"], .pkpNotification').allInnerTexts().catch(() => [])};
        await logged('duo-15-accept-taken-again', async () => {
            const before = trails.duo.length;
            await acceptButton(duo).click();
            await duo.waitForResponse((r) => /\/finalize/.test(r.url()), {timeout: T}).catch(() => null);
            await idle(duo);
            await duo.waitForTimeout(1500);
            d.trailAtSecondPress = trails.duo.slice(before);
        });
        await snap(duo, 'accept-duo-after-taken-again');

        // Rule 17 on the newcomer's review step: Cancel opens the dialog; Go Back returns.
        await guard('duo-cancel-goback', async () => {
            await duo.locator('main').getByRole('button', {name: 'Cancel', exact: true}).last().click();
            const dlg = duo.getByRole('dialog');
            await dlg.first().waitFor({timeout: 5000});
            const s = await snap(duo, 'accept-duo-review-cancel-dialog');
            d.cancelDialog = flat(s.text.dialog, 600);
            await dlg.first().getByRole('button', {name: 'Go Back'}).click();
            await dlg.first().waitFor({state: 'detached', timeout: 5000}).catch(() => {});
            d.afterGoBack = {dialogs: await duo.getByRole('dialog').count(), heading: await heading(duo), acceptButtonVisible: await acceptButton(duo).isVisible().catch(() => false)};
        });

        // Recovery: "Back" to "Create account", another username, forward, accept.
        await guard('duo-recover', async () => {
            const back = duo.locator('main').getByRole('button', {name: 'Back', exact: true}).last();
            for (let i = 0; i < 3 && !(await duo.getByLabel(/^Username/).isVisible().catch(() => false)); i++) {
                await back.click();
                await idle(duo);
            }
            d.backUsernameValue = await duo.getByLabel(/^Username/).inputValue().catch(() => null);
            await snap(duo, 'accept-duo-back-create-account');
            await duo.getByLabel(/^Username/).fill(`${username}b`);
            const pw = duo.getByLabel(/^Password/);
            if (!(await pw.inputValue().catch(() => ''))) await pw.fill(`H13d-${T6}-Passw0rd`);
            const cb = duo.getByRole('checkbox').first();
            if (!(await cb.isChecked().catch(() => true))) await cb.check();
            await saveAndContinue(duo).click();
            await duo.getByLabel(/^Country/).waitFor({timeout: T});
            await idle(duo);
            await saveAndContinue(duo).click();
            await acceptButton(duo).waitFor({timeout: T});
            await idle(duo);
            const before = trails.duo.length;
            await acceptButton(duo).click();
            await duo.getByRole('dialog').first().waitFor({timeout: T}).catch(() => {});
            await idle(duo);
            d.recoverTrail = trails.duo.slice(before);
            d.recoverDialog = flat(await duo.getByRole('dialog').first().innerText().catch(() => null), 300);
            await snap(duo, 'accept-duo-recovered');
        });

        // "Must not be taken" on "Create account": a dataset user's username, then una's.
        const tre = visitors.tre.page;
        trails.tre = apiTrail(tre);
        const t = (facts.accept.tre = {});
        await guard('tre-taken', async () => {
            await tre.goto(mails.tre.accept);
            await tre.locator('.pkpSteps').first().waitFor({timeout: T});
            await idle(tre);
            await tre.getByLabel(/^Password/).fill(`H13d-${T6}-Passw0rd`);
            await tre.getByRole('checkbox').first().check();
            for (const [key, name] of [['dataset', 'rvaca'], ['newcomer', username]]) {
                await tre.getByLabel(/^Username/).fill(name);
                const before = trails.tre.length;
                await saveAndContinue(tre).click();
                await idle(tre);
                await tre.waitForTimeout(1000);
                const s = await snap(tre, `accept-tre-taken-${key}`);
                t[key] = {
                    heading: await heading(tre),
                    stayed: await tre.getByLabel(/^Username/).isVisible().catch(() => false),
                    fieldErrors: await fieldErrors(tre),
                    trail: trails.tre.slice(before),
                    notices: s.notices,
                };
            }
            // the free end: a username nobody holds advances
            await tre.getByLabel(/^Username/).fill(`${username}t`);
            await saveAndContinue(tre).click();
            t.freeAdvanced = await tre.getByLabel(/^Country/).waitFor({timeout: T}).then(() => true, () => false);
        });

        // Decline page (row 9: an invitation page load), then confirm.
        const qua = visitors.qua.page;
        await guard('qua-decline', async () => {
            await logged('qua-21-decline-load', async () => {
                await qua.goto(mails.qua.decline);
                await idle(qua);
            });
            await snap(qua, 'decline-qua-page');
            await logged('qua-22-decline-confirm', async () => {
                await qua.getByRole('button', {name: 'Confirm Decline Invitation'}).click();
                await qua.waitForURL(/\/login/, {timeout: T}).catch(() => {});
                await idle(qua);
            });
            facts.declineLanded = strip(qua.url());
            await logged('qua-23-accept-link-after-decline', async () => {
                await qua.goto(mails.qua.accept);
                await idle(qua);
            });
            await snap(qua, 'decline-qua-accept-link-after');
        });

        // Manager: the Invitations table after, then an existing-user send to una (now a user).
        await usersAndRoles();
        facts.invitationsAfterAnswers = await invitationsTable();
        await snap(mp, 'users-roles-after-answers');
        facts.sends.unaExisting = await guard('send-una-existing', () =>
            send('unaexisting', people.una, {existing: true, role: ['Reader', 'Reviewer', 'Moderator'], masthead: 'Appear on the masthead'})
        );
        const since2 = Date.now();
        await guard('mail-una-existing', async () => {
            const deadline = Date.now() + T;
            for (;;) {
                const found = await app.mail._search({to: people.una, since});
                const host = new URL(app.baseURL).host;
                const hits = [];
                for (const m of found.messages || []) {
                    const full = await app.mail.fullMessage(m.ID);
                    if ((full.HTML || '').includes(host)) hits.push(full);
                }
                if (hits.length >= 2) {
                    const newest = hits.sort((a, b) => new Date(b.Date) - new Date(a.Date))[0];
                    facts.mailUnaExisting = {subject: newest.Subject, to: (newest.To || []).map((x) => `${x.Name || ''} <${x.Address}>`), text: newest.Text || ''};
                    break;
                }
                if (Date.now() > deadline) throw new Error('no second email to una');
                await new Promise((r) => setTimeout(r, 1000));
            }
        });
        facts.mailWaitMs = Date.now() - since2;
    } catch (error) {
        facts.errors.top = flat(String(error.stack || error), 1500);
    } finally {
        await new Promise((r) => setTimeout(r, 700));
        const all = logSince(log, runFrom);
        facts.logTotal = tally(all);
        facts.snaps = snaps;
        record('h13d', facts);
        for (const x of [...Object.values(visitors), manager]) await x.close().catch(() => {});
    }
});
