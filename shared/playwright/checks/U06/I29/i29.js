// U06 claim check I29 (housekeeping 2026-09-29): incidental rows 25 and 26 of
// docs/tracking/incidentals.md (.reports/hk29/chunks/U06.md holds the plan),
// driven per app on a scratch context of this run's own:
//   R25  the accept wizard's "Cancel" › "Cancel Invitation Process" for an
//        EXISTING user, on the review step: once signed out (ca), once signed
//        in as that user (cb). Read the landing address/page, whether the
//        session survives, the manager's Invitations row, the user's roles,
//        and the link reopened; then ca accepts after the cancel.
//   R26  "Invite to a role" for an existing user (mh): on "Enter details" the
//        held Author role's masthead select is changed (confirmation, the PUT,
//        any "Error" dialog, dismissed), then the new role is added and sent;
//        the invitation email and the masthead email are read. Control (mc):
//        the same send without touching the held-role select. Sweep (mx): the
//        held-role select changed and "Cancel" pressed on its confirmation;
//        (ml): the held-role select confirmed, a new role row chosen, the
//        wizard left by typed address (unsent).
// Every screen is recorded with screen(); run twice, each under its own RUN:
//   RUN=r1 PROBE_FEATURE=U06 PROBE_AGENT=ccI29 node bin/probe.js ojs shared/playwright/checks/U06/I29/i29.js
const {forEachApp, launch, signIn, signOut, screen, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ACR = {ojs: 'OJS', omp: 'OMP', ops: 'OPS'};
const OFFER = {ojs: 'Copyeditor', omp: 'Copyeditor', ops: 'Moderator'};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

function today() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Visible buttons, links and form controls in main and in the last open dialog (the sweep's inventory). */
async function controls(page) {
    return page.evaluate(() => {
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const pick = (root) => [...root.querySelectorAll('button, a[href], select, input, textarea')].filter(vis).map((e) => ({
            tag: e.tagName.toLowerCase(), type: e.type || null,
            name: (e.getAttribute('aria-label') || e.innerText || e.value || e.name || '').replace(/\s+/g, ' ').trim().slice(0, 80),
            disabled: e.disabled || e.getAttribute('aria-disabled') === 'true' || false,
        }));
        const main = document.querySelector('main') || document.body;
        const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis).pop();
        return {main: pick(main), dialog: dlg ? pick(dlg) : null};
    }).catch((e) => ({error: e.message}));
}

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const T = tag('u06i29');
    const facts = {app: app.name, run: RUN, tag: T, today: today(), errors: {}};
    const save = () => record(`facts-${RUN}`, facts);
    const snap = async (page, name) => {
        const s = await screen(page);
        record(`${RUN}-${name}`, s);
        return s;
    };
    const step = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            facts.errors[key] = String(e.stack || e).slice(0, 1200);
            console.error(`[${app.name}] ${key} FAILED: ${e.message}`);
        }
        save();
    };
    const mail = (u) => `${u}${T}@mail.test`;

    const seeded = await app.api.createContext({tag: T, users: [
        {username: `mgr${T}`, roles: ['manager']},
        {username: `ca${T}`, givenName: 'Cara', familyName: 'Signedout', roles: ['author']},
        {username: `cb${T}`, givenName: 'Cobi', familyName: 'Signedin', roles: ['author']},
        {username: `mh${T}`, givenName: 'Mira', familyName: 'Mastheadflip', roles: ['author']},
        {username: `mc${T}`, givenName: 'Milo', familyName: 'Control', roles: ['author']},
        {username: `mx${T}`, givenName: 'Max', familyName: 'Cancelflip', roles: ['author']},
        {username: `ml${T}`, givenName: 'Lea', familyName: 'Leaver', roles: ['author']},
    ]});
    facts.seededUsers = (seeded.users || []).map((u) => ({username: u.username, id: u.id}));
    save();

    const readMail = async (to, marker, {timeoutMs = 30_000} = {}) => {
        const summary = await app.mail.find({to, contains: marker, timeoutMs});
        const full = await app.mail.fullMessage(summary.ID);
        const text = (full.Text || '').replace(/\r/g, '');
        const grab = (op) => {
            const m = (full.HTML || '').match(new RegExp(`href=['"]([^'"]*/invitation/${op}\\?[^'"]+)['"]`, 'i'));
            return m ? m[1].replace(/&amp;/g, '&') : null;
        };
        return {subject: full.Subject, text: text.slice(0, 4000), accept: grab('accept'), decline: grab('decline')};
    };
    const inbox = async (to) => ((await app.mail._search({to})).messages || []).map((m) => m.Subject);

    const gotoAccess = async (page) => {
        await page.goto(`/index.php/${T}/management/settings/access`);
        await expect(page.getByRole('table', {name: /^Current Users \(/}).locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
    };
    const usersTable = (page) => page.getByRole('table', {name: /^Current Users \(/});
    const userRow = (page, text) => usersTable(page).locator('tbody tr').filter({hasText: text});
    const invitationsTable = (page) => page.getByRole('table', {name: /^Invitations \(/});
    const invitationRow = async (page, email) => {
        await gotoAccess(page);
        const rows = invitationsTable(page).locator('tbody tr').filter({hasText: email});
        return {count: await rows.count(), text: (await rows.allInnerTexts().catch(() => [])).map((x) => flat(x, 200))};
    };

    // The send wizard, from Users & Roles to "Enter details" for an existing user.
    const openFor = async (page, to, key) => {
        await gotoAccess(page);
        await page.getByRole('button', {name: 'Invite to a role'}).click();
        await expect(page.getByRole('heading', {name: /Search User/})).toBeVisible({timeout: 30_000});
        await idle(page);
        await page.getByLabel(/Search for a user by email address/).fill(to);
        await page.getByRole('button', {name: 'Search User', exact: true}).click();
        await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
        await idle(page);
        const s = await snap(page, `${key}-01-enter-details`);
        return {url: s.url, text: flat(s.text.main, 1500), controls: await controls(page)};
    };
    const heldRow = (page, role) => page.getByRole('row').filter({hasText: role}).filter({hasNot: page.getByLabel(/^Select a new role/)});
    const readHeld = async (page, role) => {
        const sel = heldRow(page, role).getByRole('combobox');
        return {count: await sel.count(),
            value: await sel.first().evaluate((s) => s.options[s.selectedIndex] && s.options[s.selectedIndex].text).catch(() => null),
            rowText: flat(await heldRow(page, role).first().innerText().catch(() => ''), 300)};
    };
    const fillNewRow = async (page, role) => {
        const row = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
        if (!(await row.count())) await page.getByRole('button', {name: 'Add Another Role'}).click();
        const r = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
        await r.getByLabel(/^Select a new role/).selectOption({label: role});
        await r.getByRole('textbox').fill(today());
        const mast = r.getByRole('combobox').last();
        if (await mast.count() && await mast.isEnabled()) await mast.selectOption({label: 'Appear on the masthead'}).catch(() => {});
    };
    const composeAndSend = async (page, marker, key) => {
        const out = {};
        await page.getByRole('button', {name: 'Save And Continue'}).click();
        const subject = page.getByLabel(/^Subject/);
        out.composeReached = await subject.waitFor({state: 'visible', timeout: 30_000}).then(() => true).catch(() => false);
        if (!out.composeReached) {
            out.stuck = flat((await snap(page, `${key}-03-no-compose`)).text.main, 800);
            return out;
        }
        await expect(subject).not.toHaveValue('', {timeout: 30_000});
        const body = page.frameLocator('iframe').locator('body');
        await expect(body).not.toHaveText('', {timeout: 30_000});
        await idle(page);
        await snap(page, `${key}-03-compose`);
        await subject.fill(marker);
        await page.getByRole('button', {name: 'Invite user to the role'}).click();
        const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
        out.sentShown = await sent.waitFor({state: 'visible', timeout: 30_000}).then(() => true).catch(() => false);
        const s = await snap(page, `${key}-04-sent`);
        out.sentDialog = flat(s.text.dialog, 400);
        if (out.sentShown) {
            await sent.getByRole('button', {name: 'View All Users'}).click();
            await page.waitForURL(/management\/settings\/access/, {timeout: 30_000}).catch(() => {});
        }
        return out;
    };

    const {page: mp, close: closeM} = await launch(app);
    const vb = await launch(app);
    const vp = vb.page;
    const apiLog = [];
    const watch = (page, who) => page.on('response', (r) => {
        if (/\/api\/v1\/(invitations|users)\//.test(r.url())) apiLog.push({who, method: r.request().method(), path: new URL(r.url()).pathname.replace(/key\/[^/]+/, 'key/…'), status: r.status()});
    });
    watch(mp, 'manager');
    watch(vp, 'recipient');
    try {
        await signIn(mp, `mgr${T}`);

        // ── R26: the held role's masthead select changed mid-wizard ─────────
        facts.r26 = {};
        await step('r26-mh', async () => {
            const out = {};
            out.details = await openFor(mp, mail('mh'), 'mh');
            out.heldBefore = await readHeld(mp, 'Author');
            await loc(mp, 'Send wizard (existing user): the held Author row\'s masthead select', heldRow(mp, 'Author').getByRole('combobox'));
            const other = /Does not/.test(out.heldBefore.value || '') ? 'Appear on the masthead' : 'Does not appear on the masthead';
            out.chose = other;
            apiLog.length = 0;
            await heldRow(mp, 'Author').getByRole('combobox').selectOption({label: other});
            const cdlg = mp.getByRole('dialog', {name: 'Confirm masthead visibility change'});
            out.confirmShown = await cdlg.waitFor({state: 'visible', timeout: 10_000}).then(() => true).catch(() => false);
            const s2 = await snap(mp, 'mh-02-confirm');
            out.confirmDialog = flat(s2.text.dialog, 500);
            out.confirmButtons = await cdlg.getByRole('button').allInnerTexts().catch(() => []);
            if (out.confirmShown) {
                const put = mp.waitForResponse((r) => r.url().includes('/masthead/'), {timeout: 30_000}).catch(() => null);
                await cdlg.getByRole('button', {name: 'Confirm'}).click();
                const r = await put;
                out.putStatus = r ? r.status() : null;
                await idle(mp);
                await sleep(800);
                const s3 = await snap(mp, 'mh-03-after-confirm');
                out.afterConfirm = {dialog: flat(s3.text.dialog, 600), dialogs: await mp.getByRole('dialog').count()};
                out.afterConfirmControls = await controls(mp);
                const err = mp.getByRole('dialog').filter({hasNotText: 'Confirm masthead'});
                if (await err.count()) {
                    out.errorButtons = await err.last().getByRole('button').allInnerTexts().catch(() => []);
                    await err.last().getByRole('button').first().click().catch(() => {});
                    await idle(mp);
                    await sleep(500);
                }
                const s4 = await snap(mp, 'mh-04-after-dismiss');
                out.afterDismiss = {dialog: flat(s4.text.dialog, 400), dialogs: await mp.getByRole('dialog').count(), heading: flat(s4.text.main, 200)};
            }
            out.heldAfter = await readHeld(mp, 'Author');
            out.responses = apiLog.slice();
            apiLog.length = 0;
            await fillNewRow(mp, OFFER[app.name]);
            await snap(mp, 'mh-05-row-filled');
            out.send = await composeAndSend(mp, `Invitation${T}mh`, 'mh');
            out.sendResponses = apiLog.slice();
            out.invitation = await invitationRow(mp, mail('mh'));
            out.mail = await readMail(mail('mh'), `Invitation${T}mh`).catch((e) => ({error: e.message}));
            await sleep(2000);
            out.inbox = await inbox(mail('mh'));
            // The user's Edit page after a reload: the held row's select.
            await gotoAccess(mp);
            await userRow(mp, mail('mh')).getByRole('button').last().click();
            await mp.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            await expect(mp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(mp);
            await snap(mp, 'mh-06-edit-page');
            out.heldOnEditPage = await readHeld(mp, 'Author');
            facts.r26.mh = out;
        });
        await step('r26-mc', async () => {
            const out = {};
            out.details = await openFor(mp, mail('mc'), 'mc');
            out.heldBefore = await readHeld(mp, 'Author');
            apiLog.length = 0;
            await fillNewRow(mp, OFFER[app.name]);
            out.send = await composeAndSend(mp, `Invitation${T}mc`, 'mc');
            out.sendResponses = apiLog.slice();
            out.invitation = await invitationRow(mp, mail('mc'));
            out.mail = await readMail(mail('mc'), `Invitation${T}mc`).catch((e) => ({error: e.message}));
            await sleep(2000);
            out.inbox = await inbox(mail('mc'));
            facts.r26.mc = out;
        });
        // Sweep: the confirmation's "Cancel" (mx).
        await step('r26-mx', async () => {
            const out = {};
            await openFor(mp, mail('mx'), 'mx');
            out.heldBefore = await readHeld(mp, 'Author');
            const other = /Does not/.test(out.heldBefore.value || '') ? 'Appear on the masthead' : 'Does not appear on the masthead';
            apiLog.length = 0;
            await heldRow(mp, 'Author').getByRole('combobox').selectOption({label: other});
            const cdlg = mp.getByRole('dialog', {name: 'Confirm masthead visibility change'});
            out.confirmShown = await cdlg.waitFor({state: 'visible', timeout: 10_000}).then(() => true).catch(() => false);
            if (out.confirmShown) await cdlg.getByRole('button', {name: 'Cancel', exact: true}).click();
            await idle(mp);
            await sleep(500);
            await snap(mp, 'mx-02-after-cancel');
            out.heldAfterCancel = await readHeld(mp, 'Author');
            out.responses = apiLog.slice();
            await mp.reload();
            await idle(mp);
            await gotoAccess(mp);
            await userRow(mp, mail('mx')).getByRole('button').last().click();
            await mp.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            await expect(mp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(mp);
            await snap(mp, 'mx-03-edit-page');
            out.heldOnEditPage = await readHeld(mp, 'Author');
            await sleep(1500);
            out.inbox = await inbox(mail('mx'));
            facts.r26.mx = out;
        });
        // Sweep: masthead confirmed, a new row chosen, the wizard left unsent (ml).
        await step('r26-ml', async () => {
            const out = {};
            await openFor(mp, mail('ml'), 'ml');
            out.heldBefore = await readHeld(mp, 'Author');
            const other = /Does not/.test(out.heldBefore.value || '') ? 'Appear on the masthead' : 'Does not appear on the masthead';
            await heldRow(mp, 'Author').getByRole('combobox').selectOption({label: other});
            const cdlg = mp.getByRole('dialog', {name: 'Confirm masthead visibility change'});
            if (await cdlg.waitFor({state: 'visible', timeout: 10_000}).then(() => true).catch(() => false)) {
                const put = mp.waitForResponse((r) => r.url().includes('/masthead/'), {timeout: 30_000}).catch(() => null);
                await cdlg.getByRole('button', {name: 'Confirm'}).click();
                const r = await put;
                out.putStatus = r ? r.status() : null;
                await idle(mp);
                await sleep(800);
                const err = mp.getByRole('dialog').filter({hasNotText: 'Confirm masthead'});
                if (await err.count()) await err.last().getByRole('button').first().click().catch(() => {});
            }
            await fillNewRow(mp, OFFER[app.name]);
            await snap(mp, 'ml-02-unsaved');
            const dialogs = [];
            const h = (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); };
            mp.on('dialog', h);
            await mp.getByLabel(/^Select a new role/).last().blur().catch(() => {});
            await mp.goto(`/index.php/${T}/management/settings/access`);
            await idle(mp);
            mp.off('dialog', h);
            out.leaveDialogs = dialogs;
            out.leftTo = mp.url();
            out.invitation = await invitationRow(mp, mail('ml'));
            await userRow(mp, mail('ml')).getByRole('button').last().click();
            await mp.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            await expect(mp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(mp);
            await snap(mp, 'ml-03-edit-page');
            out.heldOnEditPage = await readHeld(mp, 'Author');
            await sleep(1500);
            out.inbox = await inbox(mail('ml'));
            facts.r26.ml = out;
        });

        // ── R25: existing user's "Cancel Invitation Process" ────────────────
        facts.r25 = {sends: {}};
        await step('r25-sends', async () => {
            for (const k of ['ca', 'cb']) {
                await openFor(mp, mail(k), `send-${k}`);
                await fillNewRow(mp, OFFER[app.name]);
                facts.r25.sends[k] = await composeAndSend(mp, `Invitation${T}${k}`, `send-${k}`);
                facts.r25.sends[k].mail = await readMail(mail(k), `Invitation${T}${k}`);
            }
        });
        const cancelFlow = async (k, {signedIn, key}) => {
            const out = {signedIn};
            await signOut(vp).catch(() => {});
            if (signedIn) {
                await signIn(vp, `${k}${T}`, {contextPath: T});
                await idle(vp);
                const s0 = await snap(vp, `${key}-00-signed-in`);
                out.signedInAt = {url: s0.url, header: flat(s0.text.header, 200)};
            }
            const dialogs = [];
            const h = (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); };
            vp.on('dialog', h);
            apiLog.length = 0;
            await vp.goto(facts.r25.sends[k].mail.accept);
            const accept = vp.getByRole('button', {name: new RegExp(`^Accept And Continue to ${ACR[app.name]}`)});
            await accept.waitFor({timeout: 30_000}).catch(() => {});
            await idle(vp);
            const s1 = await snap(vp, `${key}-01-review`);
            out.review = {url: s1.url, main: flat(s1.text.main, 800), header: flat(s1.text.header, 200), controls: await controls(vp)};
            const cancel = vp.getByRole('button', {name: 'Cancel', exact: true});
            out.cancelCount = await cancel.count();
            await loc(vp, 'Accept wizard, existing user review step: Cancel', cancel);
            await cancel.click();
            const cd = vp.getByRole('dialog');
            out.dialogShown = await cd.first().waitFor({state: 'visible', timeout: 15_000}).then(() => true).catch(() => false);
            const s2 = await snap(vp, `${key}-02-cancel-dialog`);
            out.cancelDialog = flat(s2.text.dialog, 700);
            out.cancelDialogButtons = await cd.getByRole('button').allInnerTexts().catch(() => []);
            // "Go Back" first, then Cancel again.
            const goBack = cd.getByRole('button', {name: /Go Back/});
            if (await goBack.count()) {
                await goBack.click();
                await idle(vp);
                const s3 = await snap(vp, `${key}-03-after-go-back`);
                out.afterGoBack = {url: s3.url, main: flat(s3.text.main, 300), dialogs: await vp.getByRole('dialog').count()};
                await cancel.click();
                await cd.first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
            }
            apiLog.length = 0;
            const confirmBtn = cd.getByRole('button', {name: 'Cancel Invitation Process'});
            out.confirmCount = await confirmBtn.count();
            const nav = vp.waitForNavigation({timeout: 30_000}).catch(() => null);
            await confirmBtn.click();
            await nav;
            await vp.waitForLoadState('load').catch(() => {});
            await idle(vp);
            await sleep(1000);
            const s4 = await snap(vp, `${key}-04-after-cancel`);
            out.after = {url: s4.url, title: s4.title, header: flat(s4.text.header, 300), main: flat(s4.text.main, 600)};
            out.afterSignedIn = await vp.evaluate(() => !!document.querySelector('a[href*="login/signOut"], a[href*="signOut"]')).catch(() => null);
            out.cancelRequests = apiLog.slice();
            out.leaveDialogs = dialogs.slice();
            // The session after the cancel: a page that needs a sign-in.
            await vp.goto(`/index.php/${T}/submissions`);
            await idle(vp);
            const s5 = await snap(vp, `${key}-05-submissions-after`);
            out.submissionsAfter = {url: s5.url, header: flat(s5.text.header, 200), main: flat(s5.text.main, 300)};
            if (!signedIn && /\/login/.test(s5.url)) {
                // Sign in on the sign-in screen the cancel led to: where does it go?
                const {LoginPage} = require('../../../pages/LoginPage.js');
                const users = require('../../../data/users.js');
                await vp.goto(out.after.url);
                await idle(vp);
                await new LoginPage(vp).signIn(`${k}${T}`, users.getPassword(`${k}${T}`));
                await vp.waitForLoadState('load').catch(() => {});
                await idle(vp);
                const s5b = await snap(vp, `${key}-05b-signed-in-from-landing`);
                out.signInFromLanding = {url: s5b.url, header: flat(s5b.text.header, 200), main: flat(s5b.text.main, 200)};
                await signOut(vp).catch(() => {});
            }
            // The manager's row, the user's roles.
            out.invitation = await invitationRow(mp, mail(k));
            out.userRow = flat(await userRow(mp, mail(k)).innerText().catch(() => ''), 300);
            // The link again.
            apiLog.length = 0;
            await vp.goto(facts.r25.sends[k].mail.accept);
            await accept.waitFor({timeout: 30_000}).catch(() => {});
            await idle(vp);
            const s6 = await snap(vp, `${key}-06-link-again`);
            out.linkAgain = {url: s6.url, main: flat(s6.text.main, 500), acceptButton: await accept.count()};
            vp.off('dialog', h);
            return out;
        };
        await step('r25-ca', async () => { facts.r25.ca = await cancelFlow('ca', {signedIn: false, key: 'ca'}); });
        await step('r25-cb', async () => { facts.r25.cb = await cancelFlow('cb', {signedIn: true, key: 'cb'}); });
        // After the cancel, ca accepts from the reopened link (the invitation still works).
        await step('r25-ca-accept', async () => {
            const out = {};
            await signOut(vp).catch(() => {});
            await vp.goto(facts.r25.sends.ca.mail.accept);
            const accept = vp.getByRole('button', {name: new RegExp(`^Accept And Continue to ${ACR[app.name]}`)});
            await accept.waitFor({timeout: 30_000});
            await idle(vp);
            await sleep(1500);
            await accept.click();
            out.dialogShown = await vp.getByRole('dialog').first().waitFor({state: 'visible', timeout: 30_000}).then(() => true).catch(() => false);
            await idle(vp);
            out.dialog = flat((await snap(vp, 'ca-07-accepted')).text.dialog, 400);
            out.invitation = await invitationRow(mp, mail('ca'));
            out.userRow = flat(await userRow(mp, mail('ca')).innerText().catch(() => ''), 300);
            facts.r25.caAccept = out;
        });
        if (RUN === 'r1') {
            note(`ccI29 [${app.name}]: accept wizard, existing user's review step: "Cancel" is getByRole("button", {name: "Cancel", exact: true}); its dialog's buttons "Cancel Invitation Process" and "Go Back". Send wizard (search path, existing user): a held role's masthead select is getByRole("row").filter({hasText: role}).filter({hasNot: getByLabel(/^Select a new role/)}).getByRole("combobox"); its change opens getByRole("dialog", {name: "Confirm masthead visibility change"}) at once.`);
        }
    } finally {
        save();
        await closeM();
        await vb.close();
    }
});
