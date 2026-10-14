// U03 drift sweep, chunk SW3 (docs/specs/U03-user-profile.md: Fields Password / Notifications /
// API Key, Rules 10-12, Side effects, scenarios 8-10; register A7, A11, A12, A10, OPS2).
// Kept claim-check script: run on demand, never in CI. One phase per process:
//   PROBE_FEATURE=U03 PROBE_AGENT=ccSW3 PROBE_RUN=r1 bin/app-lock.sh shared ojs -- \
//     node bin/probe.js ojs shared/playwright/checks/U03/SW3/sw3.js <phase>
// Phases:
//   levels    read-only: Password, Notifications and API Key tabs on `publicknowledge` for one
//             roster account per permission level, and the site-level tabs for `admin`
//   password  Rule 10 / scenario 8 / A7 / A11 / A12 on a scratch author in two browsers; the
//             reset link; no mail; the activity log after every tab's save
//   policy    the site's "Minimum password length" (6 and 8) and compromised-password check
//             (off and on), read on the Password tab; restored at the end (site-wide, short)
//   apikey    Rule 12 / scenario 9; the key against the REST API before and after Delete
//   notif     Rule 11 / scenario 10 on a scratch manager in two journals; site-level set
//   email     Side effects of an email-change request (journal and site level), confirm,
//             the template's row under Manage Emails
//   roles     Side effects of a Roles save: Users & Roles and the masthead
// Outputs: .reports/U03/ccSW3/<phase>-<run>-<app>.json (facts) and snapshot files beside it.
const {forEachApp, launch, signIn, signOut, screen, record, loc, note, idle, tag, serverLog} = require('../../../probe');
const L = require('./lib.js');

const PHASE = process.argv[2] || 'levels';
const SAVED = 'Your changes have been saved.';

function factsFor(app, phase) {
    const name = phase;
    return (k, v) => {
        record(name, {[k]: v}, {merge: true});
        console.log(`[${phase}]`, app.name, k, JSON.stringify(v === undefined ? null : v).slice(0, 600));
    };
}

async function step(F, k, fn) {
    try {
        const v = await fn();
        F(k, v);
        return v;
    } catch (e) {
        F(k, {error: L.flat(String(e && e.stack ? e.stack : e), 700)});
        return null;
    }
}

const APP_ROLE = {
    ojs: {reviewerBox: 'Reviewer', manager: 'Journal manager'},
    omp: {reviewerBox: 'External Reviewer', manager: 'Press manager'},
    ops: {reviewerBox: null, manager: 'Preprint Server manager'},
};

// ---------------------------------------------------------------------------
// levels: one account per permission level, read-only
async function levels(app, F) {
    const roster = ['reader.rosa', 'author.alex', 'reviewer.julia', 'assistant.rita', 'sectioneditor.ana', 'manager.maya', 'admin']
        .filter((u) => !(app.name === 'ops' && u === 'reviewer.julia'));
    const {page, close} = await launch(app);
    const dialogs = L.dialogRecorder(page);
    try {
        for (const user of roster) {
            await signIn(page, user, {contextPath: app.contextPath});
            const out = {};
            const profile = await L.openProfile(page, app.contextPath, 'password');
            out.password = {snap: await L.snap(page, `lv-${user}-password`), state: await L.passwordState(profile), foot: await L.tabFoot(profile, 'password'),
                text: L.flat(await profile.form('password').innerText(), 900),
                maxlength: await profile.form('password').locator('input[type=password]').evaluateAll((is) => is.map((i) => [i.name, i.getAttribute('maxlength'), i.required, i.getAttribute('aria-required')]))};
            await L.pressTab(page, profile, dialogs, 'notifications');
            out.notifications = {snap: await L.snap(page, `lv-${user}-notifications`), state: await L.notificationsState(profile), foot: await L.tabFoot(profile, 'notifications')};
            await L.pressTab(page, profile, dialogs, 'apiKey');
            out.apiKey = {snap: await L.snap(page, `lv-${user}-apikey`), state: await L.apiKeyState(profile), foot: await L.tabFoot(profile, 'apiKey')};
            out.tabs = await profile.tabs.locator('> ul > li > a').allInnerTexts().then((a) => a.map((t) => L.flat(t)));
            F(`level-${user}`, out);
        }
        // admin's site-level tabs
        await signIn(page, 'admin');
        const site = {};
        const p2 = await L.openProfile(page, null, 'notifications').catch(async (e) => ({err: String(e)}));
        if (p2.err) {
            site.err = p2.err;
        } else {
            site.url = page.url();
            site.notifications = {snap: await L.snap(page, 'lv-admin-site-notifications'), state: await L.notificationsState(p2)};
            await L.pressTab(page, p2, dialogs, 'password');
            site.password = {snap: await L.snap(page, 'lv-admin-site-password'), state: await L.passwordState(p2), foot: await L.tabFoot(p2, 'password')};
            await L.pressTab(page, p2, dialogs, 'apiKey');
            site.apiKey = {snap: await L.snap(page, 'lv-admin-site-apikey'), state: await L.apiKeyState(p2)};
        }
        F('site-admin', site);
        F('dialogs', dialogs.seen);
    } finally {
        await close();
    }
}

// ---------------------------------------------------------------------------
// password: Rule 10, scenario 8, A7, A11, A12, the reset link, no mail, activity log
async function password(app, F) {
    const T = tag('u03sw3');
    const au = `${T}a`;
    const mg = `${T}m`;
    const email = `${au}@mail.test`;
    const cur = `cur${T.slice(-6)}`;
    const NEXT = 'newpass99';
    F('seed', {T, au, mg, cur});
    await app.api.createContext({tag: T, users: [
        {username: au, givenName: 'Pat', familyName: 'Pass', roles: ['author'], password: cur},
        {username: mg, givenName: 'Mia', familyName: 'Mgr', roles: ['manager'], password: 'mgrpass1'},
    ]});
    const sub = await app.api.createSubmission({tag: `${T}s`, context: T, submitter: au});
    F('submission', {id: sub.submissionId});

    const A = await launch(app);
    const B = await launch(app);
    const C = await launch(app);
    const dA = L.dialogRecorder(A.page);
    const dB = L.dialogRecorder(B.page);
    const log = serverLog(app);
    const from = log.mark();
    try {
        // C: the manager's activity-log baseline
        await signIn(C.page, mg, {password: 'mgrpass1', contextPath: T});
        await step(F, 'activity-before', () => L.activityLines(C.page, T, sub.submissionId));
        await signOut(C.page);

        // a reset link requested before the change (C, signed out)
        const resetBefore = await step(F, 'reset-request-before', async () => {
            const since = new Date();
            await C.page.goto(`/index.php/${T}/en/login/lostPassword`);
            await C.page.locator('input#email').fill(email);
            await C.page.locator('form#lostPasswordForm button[type="submit"]').click();
            await C.page.waitForLoadState('domcontentloaded');
            const m = await L.fullMail(app, {to: email, subject: 'Password Reset Confirmation', since});
            const link = (m.html || m.text).match(/https?:\/\/[^\s<>"']+\/login\/resetPassword\/[^\s<>"']+/);
            return {subject: m.subject, link: link ? link[0].replace(/&amp;/g, '&') : null};
        });

        // A and B sign in as the author
        await signIn(A.page, au, {password: cur, contextPath: T});
        await signIn(B.page, au, {password: cur, contextPath: T});
        const pB = await L.openProfile(B.page, T, 'identity');
        await pB.tabLink('contact').click();
        await L.sleep(2500);
        F('B-tab-before', {contactOpen: await pB.form('contact').isVisible().catch(() => false)});
        await pB.tabLink('identity').click();
        await L.sleep(1500);

        // the Password tab as it opens
        let p = await L.openProfile(A.page, T, 'password');
        F('open', {snap: await L.snap(A.page, 'pw-open'), state: await L.passwordState(p), foot: await L.tabFoot(p, 'password'),
            text: L.flat(await p.form('password').innerText(), 900),
            inputs: await p.form('password').locator('input').evaluateAll((is) => is.map((i) => ({name: i.name, type: i.type, maxlength: i.getAttribute('maxlength'), required: i.required, label: (document.querySelector(`label[for="${i.id}"]`) || {}).textContent})))});
        await loc(A.page, 'Password tab Cancel link', p.passwordCancelLink());
        await loc(A.page, 'Password tab error notice', p.form('password').locator('.pkp_notification'));
        await loc(A.page, 'line under New password', p.form('password').locator('label.sub_label[for^="password-"]'));

        // unsaved typing, another tab pressed (Cancel the question), then "Cancel" (A12), then another tab
        await L.typePasswords(p, 'abc123', 'def456');
        F('leave-typed-before', await L.passwordState(p));
        F('leave-typed', await L.pressTab(A.page, p, dA, 'contact', {answer: 'dismiss', wait: false}));
        F('leave-typed-after', await L.passwordState(p));
        const cancel = await L.traffic(A.page, async () => {
            await p.passwordCancelLink().click();
            await L.sleep(1500);
        });
        F('cancel', {requests: cancel.requests, url: A.page.url(), selected: await p.tabEntry('password').getAttribute('aria-selected'), state: await L.passwordState(p),
            snap: await L.snap(A.page, 'pw-cancel')});
        F('leave-after-cancel', await L.pressTab(A.page, p, dA, 'contact', {answer: 'dismiss'}));
        F('leave-after-cancel-state', {selectedContact: await p.tabEntry('contact').getAttribute('aria-selected'), passwordOpen: await p.form('password').isVisible().catch(() => false)});

        // A7: 40 characters typed into each box
        p = await L.openProfile(A.page, T, 'password');
        const forty = 'abcdefghij'.repeat(4);
        await L.typePasswords(p, forty, forty, forty);
        const s40 = await L.passwordState(p);
        F('a7-typed40', {old: s40.oldPassword.length, password: s40.password.length, password2: s40.password2.length});

        // refusals
        const cases = [
            ['all-empty', '', '', ''],
            ['wrong-current', 'wrongpass', NEXT, NEXT],
            ['mismatch', cur, NEXT, 'newpass98'],
            ['same-as-old', cur, cur, cur],
            ['too-short', cur, 'np1', 'np1'],
            ['o-same-and-mismatch', cur, cur, `${cur}x`],
            ['o-mismatch-and-short', cur, 'abc', 'abcd'],
            ['o-wrong-and-same', 'wrongpass', cur, cur],
            ['o-wrong-and-short', 'wrongpass', 'abc', 'abc'],
            ['o-wrong-and-mismatch', 'wrongpass', NEXT, 'newpass98'],
        ];
        for (const [k, c, n, r] of cases) {
            p = await L.openProfile(A.page, T, 'password');
            await L.typePasswords(p, c, n, r);
            const res = await L.savePassword(A.page, p);
            F(`refuse-${k}`, {...res, snap: await L.snap(A.page, `pw-refuse-${k}`)});
        }
        // the notice left alone: sampled for 10 s
        p = await L.openProfile(A.page, T, 'password');
        await L.typePasswords(p, cur, 'np1', 'np1');
        await L.savePassword(A.page, p);
        F('fade-alone', await L.sampleNotice(p, 10_000));
        F('fade-alone-after', await L.passwordState(p));

        // a refusal, then the valid save about 1 s later; sampled for 9 s
        p = await L.openProfile(A.page, T, 'password');
        await L.typePasswords(p, 'wrongpass', NEXT, 'newpass98');
        const tRefuse = Date.now();
        await L.savePassword(A.page, p);
        F('pre-valid-refusal', await L.passwordState(p));
        await L.typePasswords(p, cur, NEXT, NEXT);
        const changedAt = new Date();
        const valid = await L.traffic(A.page, async () => { await p.save(); }, {filter: /profile-tab\/save-/});
        const toastAfter = await L.toastNow(A.page);
        const stateNow = await L.passwordState(p);
        F('valid-save', {requests: valid.requests, toastAfter, state: stateNow, msSinceRefusal: changedAt - tRefuse, snap: await L.snap(A.page, 'pw-valid-saved')});
        F('valid-save-samples', await L.sampleNotice(p, 9_000, tRefuse));
        F('valid-save-later', await L.passwordState(p));
        p = await L.openProfile(A.page, T, 'password');
        F('valid-save-reloaded', {state: await L.passwordState(p), snap: await L.snap(A.page, 'pw-valid-reloaded')});
        F('valid-session-A', {url: A.page.url(), login: /\/login/.test(A.page.url())});

        // B: a tab press, then a full load
        const bTab = await L.traffic(B.page, async () => {
            await pB.tabLink('contact').click();
            await L.sleep(3000);
        }, {filter: /./});
        F('B-tab-press', {requests: bTab.requests.filter((r) => !/\.(js|css|png|woff)/.test(r.url)).slice(0, 12), url: B.page.url(),
            panel: L.flat(await pB.panel().innerText().catch(() => null), 300), panelHtml: L.flat(await pB.panel().innerHTML().catch(() => null), 300),
            toast: await L.toastNow(B.page), dialogs: dB.seen, snap: await L.snap(B.page, 'pw-B-tab')});
        await B.page.goto(pB.url('identity'));
        await L.sleep(1500);
        F('B-reload', {url: B.page.url(), login: await B.page.locator('form#login').count(), snap: await L.snap(B.page, 'pw-B-reload')});

        // the reset link from before dies; a fresh one opens the form (and bounds the no-mail read)
        if (resetBefore && resetBefore.link) {
            await C.page.goto(resetBefore.link);
            await L.sleep(1000);
            F('reset-old-link', {url: C.page.url(), text: L.flat(await C.page.locator('main, body').first().innerText().catch(() => null), 400), snap: await L.snap(C.page, 'pw-reset-old')});
        }
        await step(F, 'reset-fresh', async () => {
            const since = new Date();
            await C.page.goto(`/index.php/${T}/en/login/lostPassword`);
            await C.page.locator('input#email').fill(email);
            await C.page.locator('form#lostPasswordForm button[type="submit"]').click();
            const m = await L.fullMail(app, {to: email, subject: 'Password Reset Confirmation', since});
            const link = (m.html || m.text).match(/https?:\/\/[^\s<>"']+\/login\/resetPassword\/[^\s<>"']+/);
            await C.page.goto(link[0].replace(/&amp;/g, '&'));
            await L.sleep(800);
            return {fresh: true, url: C.page.url(), form: await C.page.locator('input[name="password"]').count(), heading: L.flat(await C.page.locator('h1').first().innerText().catch(() => null))};
        });
        // the mailbox since the change: only the fresh reset mail (the bound)
        await step(F, 'mail-since-change', async () => {
            const all = await app.mail._search({to: email, since: changedAt});
            return (all.messages || []).map((m) => m.Subject);
        });

        // every other tab saved once by the author, then the activity log
        await step(F, 'other-saves', async () => {
            const out = {};
            let q = await L.openProfile(A.page, T, 'identity');
            await q.form('identity').locator('input[name^="givenName"]').first().fill('Patty');
            await q.save(); out.identity = [await L.toastNow(A.page), L.flat(await q.inTabNotice('identity').innerText().catch(() => null))];
            q = await L.openProfile(A.page, T, 'public');
            await q.homepage().fill('https://example.org/sw3');
            await q.save(); out.public = await L.toastNow(A.page);
            q = await L.openProfile(A.page, T, 'notifications');
            await q.save(); out.notifications = await L.toastNow(A.page);
            q = await L.openProfile(A.page, T, 'roles');
            await q.save(); out.roles = await L.toastNow(A.page);
            q = await L.openProfile(A.page, T, 'apiKey');
            await q.createApiKey();
            dA.answer = 'accept';
            const del = q.waitForSave();
            await q.deleteApiKeyButton().click();
            await del;
            dA.answer = 'dismiss';
            await idle(A.page);
            out.apiKey = L.flat(await q.inTabNotice('apiKey').innerText().catch(() => null));
            q = await L.openProfile(A.page, T, 'contact');
            await q.country().selectOption({label: 'Canada'});
            await q.email().fill(`${au}new@mail.test`);
            await q.save(); out.contact = await q.pendingEmailNotice().isVisible().catch(() => false);
            return out;
        });
        await signIn(C.page, mg, {password: 'mgrpass1', contextPath: T});
        await step(F, 'activity-after', () => L.activityLines(C.page, T, sub.submissionId));
        await L.snap(C.page, 'pw-activity-after');

        // sign-ins: new works, old refused
        await signOut(A.page);
        F('signin-new', await L.typedSignIn(A.page, app, T, au, NEXT));
        await signOut(A.page);
        F('signin-old', await L.typedSignIn(A.page, app, T, au, cur));

        // A7 end to end: a 40-character new password typed, then signing in typed (32 kept) and sent whole
        await step(F, 'a7-chain', async () => {
            await L.typedSignIn(A.page, app, T, au, NEXT);
            const q = await L.openProfile(A.page, T, 'password');
            await L.typePasswords(q, NEXT, forty, forty);
            const r = await L.savePassword(A.page, q);
            await signOut(A.page);
            const typed = await L.typedSignIn(A.page, app, T, au, forty);
            await signOut(A.page);
            const whole = await L.fullSignIn(A.page, T, au, forty);
            await signOut(A.page);
            const first32 = await L.fullSignIn(A.page, T, au, forty.slice(0, 32));
            return {save: {toasts: r.toasts, state: r.state}, typed, whole, first32};
        });
        F('dialogsA', dA.seen);
        F('serverLog', log.since(from));
    } finally {
        await A.close();
        await B.close();
        await C.close();
    }
}

// ---------------------------------------------------------------------------
// policy: minimum length and the compromised-password check, both ends; restored
async function policy(app, F) {
    const T = tag('u03sw3');
    const au = `${T}p`;
    const cur = `cur${T.slice(-6)}`;
    await app.api.createContext({tag: T, users: [{username: au, givenName: 'Poli', familyName: 'Cy', roles: ['author'], password: cur}]});
    F('seed', {T, au});
    const Adm = await launch(app);
    const U = await launch(app);
    const {SiteSettingsPage} = L.pages('SiteSettingsPages.js');
    let changed = false;
    try {
        await signIn(Adm.page, 'admin');
        const site = new SiteSettingsPage(Adm.page);
        await site.goto('#setup');
        let form = await site.security();
        const before = {min: await form.minPasswordLength.inputValue(), compromised: await form.compromisedCheck.isChecked()};
        F('site-before', before);
        await L.snap(Adm.page, 'pol-site-before');

        await signIn(U.page, au, {password: cur, contextPath: T});
        let p = await L.openProfile(U.page, T, 'password');
        F('hint-default', (await L.passwordState(p)).newPasswordLine);
        await L.typePasswords(p, cur, 'qwerty123456');
        const leakOff = await L.savePassword(U.page, p);
        F('leak-off', {toasts: leakOff.toasts, state: leakOff.state});
        // the save worked: the current password is now qwerty123456
        const cur2 = leakOff.toasts.some((t) => t.includes(SAVED)) ? 'qwerty123456' : cur;

        // the other end: minimum 8, the check on
        await form.minPasswordLength.fill('8');
        await form.compromisedCheck.check();
        changed = true;
        const r1 = await form.pressSave();
        F('site-set', {status: r1.status()});
        p = await L.openProfile(U.page, T, 'password');
        F('hint-8', {line: (await L.passwordState(p)).newPasswordLine, snap: await L.snap(U.page, 'pol-hint-8')});
        const tries = [
            ['seven', 'abcdefg', 'abcdefg'],
            ['leaked', 'password1234', 'password1234'],
            ['leaked-mismatch', 'password1234', 'password1235'],
            ['leaked-short', 'qwerty', 'qwerty'],
            ['leaked-same', cur2, cur2],
        ];
        for (const [k, n, r] of tries) {
            p = await L.openProfile(U.page, T, 'password');
            await L.typePasswords(p, cur2, n, r);
            const res = await L.savePassword(U.page, p);
            F(`try-${k}`, {toasts: res.toasts, state: res.state, snap: await L.snap(U.page, `pol-${k}`)});
        }
    } finally {
        if (changed) {
            try {
                const site = new SiteSettingsPage(Adm.page);
                await site.goto('#setup');
                const form = await site.security();
                await form.minPasswordLength.fill('6');
                await form.compromisedCheck.uncheck();
                const r2 = await form.pressSave();
                await site.reload();
                const f2 = await site.security();
                F('site-restored', {status: r2.status(), min: await f2.minPasswordLength.inputValue(), compromised: await f2.compromisedCheck.isChecked()});
            } catch (e) {
                F('site-restore-error', String(e));
                note(`SW3 policy phase on ${app.name}: restoring the site's password policy failed (${String(e).slice(0, 120)}); check Administration > Site Settings > Security`);
            }
        }
        await Adm.close();
        await U.close();
    }
}

// ---------------------------------------------------------------------------
// apikey: Rule 12, scenario 9, the key against the REST API
async function apikey(app, F) {
    const T = tag('u03sw3');
    const au = `${T}k`;
    await app.api.createContext({tag: T, users: [{username: au, givenName: 'Kay', familyName: 'Api', roles: ['author'], password: 'kaypass1'}]});
    await app.api.createSubmission({tag: `${T}s`, context: T, submitter: au});
    F('seed', {T, au});
    const {page, close} = await launch(app);
    const d = L.dialogRecorder(page);
    try {
        await signIn(page, au, {password: 'kaypass1', contextPath: T});
        let p = await L.openProfile(page, T, 'apiKey');
        F('open', {state: await L.apiKeyState(p), foot: await L.tabFoot(p, 'apiKey'), snap: await L.snap(page, 'ak-open')});
        await loc(page, 'API Key box', p.apiKeyBox());
        await loc(page, 'Create API Key button', p.createApiKeyButton());
        F('rest-none', await L.restWith(app, T, null));

        const c1 = await L.traffic(page, async () => { await p.createApiKey(); }, {filter: /profile-tab\/save-/});
        const toasts1 = await L.watchToasts(page, 1500);
        const k1 = await L.apiKeyState(p);
        F('create-1', {requests: c1.requests, toasts: toasts1, dialogs: d.seen.length, state: k1, snap: await L.snap(page, 'ak-created')});
        await loc(page, 'API Key Delete button', p.deleteApiKeyButton());
        await loc(page, 'API Key in-tab notice', p.inTabNotice('apiKey'));
        p = await L.openProfile(page, T, 'apiKey');
        const k1b = await L.apiKeyState(p);
        F('reloaded', {same: k1b.value === k1.value, state: k1b, snap: await L.snap(page, 'ak-reloaded')});
        F('rest-k1-bearer', await L.restWith(app, T, k1.value));
        F('rest-k1-param', await L.restWith(app, T, k1.value, {how: 'param'}));
        F('rest-k1-users', await L.restWith(app, T, k1.value, {endpoint: 'users'}));

        d.answer = 'dismiss';
        const del0 = await L.traffic(page, async () => {
            await p.deleteApiKeyButton().click();
            await L.sleep(1500);
        }, {filter: /profile-tab\/save-/});
        F('delete-cancel', {requests: del0.requests, dialogs: d.seen.slice(-1), state: await L.apiKeyState(p)});
        F('rest-k1-after-cancel', await L.restWith(app, T, k1.value));

        d.answer = 'accept';
        const del1 = await L.traffic(page, async () => {
            const saved = p.waitForSave();
            await p.deleteApiKeyButton().click();
            await saved;
            await idle(page);
        }, {filter: /profile-tab\/save-/});
        d.answer = 'dismiss';
        const toasts2 = await L.watchToasts(page, 1500);
        F('delete-ok', {requests: del1.requests, toasts: toasts2, dialogs: d.seen.slice(-1), state: await L.apiKeyState(p), snap: await L.snap(page, 'ak-deleted')});
        F('rest-k1-after-delete', await L.restWith(app, T, k1.value));
        p = await L.openProfile(page, T, 'apiKey');
        F('deleted-reloaded', await L.apiKeyState(p));

        await p.createApiKey();
        const k2 = await L.apiKeyState(p);
        F('create-2', {differs: k2.value !== k1.value, length: k2.length, state: k2, toasts: await L.watchToasts(page, 1000)});
        F('rest-k2', await L.restWith(app, T, k2.value));
        F('rest-k1-after-k2', await L.restWith(app, T, k1.value));
        // a tampered token (a sanity end of the same axis)
        F('rest-tampered', await L.restWith(app, T, `${k2.value.slice(0, -2)}xx`));
        F('dialogs', d.seen);
    } finally {
        await close();
    }
}

// ---------------------------------------------------------------------------
// notif: Rule 11, scenario 10 (as the suites run it), site-level and other-journal sets
async function notif(app, F) {
    const T = tag('u03sw3');
    const T2 = tag('u03sw3');
    const mg = `${T}n`;
    await app.api.createContext({tag: T, users: [{username: mg, givenName: 'Nora', familyName: 'Notif', roles: ['manager'], password: 'norapass1'}]});
    await app.api.createContext({tag: T2, users: [{username: mg, roles: ['manager']}]});
    F('seed', {T, T2, mg});
    const {page, close} = await launch(app);
    const d = L.dialogRecorder(page);
    try {
        await signIn(page, mg, {password: 'norapass1', contextPath: T});
        let p = await L.openProfile(page, T, 'notifications');
        const s0 = await L.notificationsState(p);
        F('open', {state: s0, foot: await L.tabFoot(p, 'notifications'), snap: await L.snap(page, 'nt-open')});
        const rows = s0.groups.flatMap((g) => g.rows);
        const r1 = rows[0].boxes;
        const r2 = rows[1].boxes;
        // axis: row 1 with the email box unticked, row 2 with it ticked first
        await page.locator(`#${r2[1].id}`).check();
        F('row2-email-ticked', await page.locator(`#${r2[1].id}`).isChecked());
        await page.locator(`#${r1[0].id}`).uncheck();
        await page.locator(`#${r2[0].id}`).uncheck();
        const pairNow = async () => ({
            r1: {allow: await page.locator(`#${r1[0].id}`).isChecked(), email: await page.locator(`#${r1[1].id}`).isChecked(), emailDisabled: await page.locator(`#${r1[1].id}`).isDisabled()},
            r2: {allow: await page.locator(`#${r2[0].id}`).isChecked(), email: await page.locator(`#${r2[1].id}`).isChecked(), emailDisabled: await page.locator(`#${r2[1].id}`).isDisabled()},
        });
        F('unticked', {pairs: await pairNow(), snap: await L.snap(page, 'nt-unticked')});
        // leave the tab with the change unsaved: the question, Cancel keeps it
        F('leave-unsaved', await L.pressTab(page, p, d, 'identity', {answer: 'dismiss', wait: false}));
        F('leave-unsaved-state', {notifOpen: await p.form('notifications').isVisible().catch(() => false), pairs: await pairNow().catch(() => null)});
        const sv = await L.traffic(page, async () => { await p.save(); }, {filter: /profile-tab\/save-/});
        F('saved', {requests: sv.requests, toasts: await L.watchToasts(page, 1500), inTab: L.flat(await p.inTabNotice('notifications').innerText().catch(() => null)), pairsAfterSave: await pairNow()});
        await L.pressTab(page, p, d, 'identity', {answer: 'accept'});
        await L.pressTab(page, p, d, 'notifications');
        F('reopened-tab', await pairNow());
        p = await L.openProfile(page, T, 'notifications');
        F('reopened-reload', {pairs: await pairNow(), snap: await L.snap(page, 'nt-reloaded')});

        // the other journal's set and the site-level set
        const q = await L.openProfile(page, T2, 'notifications');
        const sT2 = await L.notificationsState(q);
        F('other-journal', {row1: sT2.groups.flatMap((g) => g.rows)[0], row2: sT2.groups.flatMap((g) => g.rows)[1]});
        const site = await L.openProfile(page, null, 'notifications').catch((e) => ({err: String(e)}));
        if (site.err) F('site', site);
        else {
            const sS = await L.notificationsState(site);
            F('site', {url: page.url(), groups: sS.groups.map((g) => ({group: g.group, rows: g.rows.map((r) => `${r.sentence} [${r.boxes.map((b) => (b.checked ? 'x' : '_') + (b.disabled ? 'd' : '')).join('')}]`)})), snap: await L.snap(page, 'nt-site')});
        }

        // restore, reopen: the control
        p = await L.openProfile(page, T, 'notifications');
        await page.locator(`#${r1[0].id}`).check();
        await page.locator(`#${r2[0].id}`).check();
        F('retick', await pairNow());
        await p.save();
        F('restored-toasts', await L.watchToasts(page, 1200));
        p = await L.openProfile(page, T, 'notifications');
        F('restored-reload', await pairNow());

        // Roles "Save" with nothing changed; Users & Roles
        p = await L.openProfile(page, T, 'roles');
        const ticks = async () => p.form('roles').getByRole('checkbox').evaluateAll((bs) => bs.map((b) => `${(b.closest('label') || b.parentElement).textContent.trim()}=${b.checked}`));
        const before = await ticks();
        await p.save();
        const rt = await L.watchToasts(page, 1200);
        p = await L.openProfile(page, T, 'roles');
        F('roles-save', {before, toasts: rt, after: await ticks()});
        F('users-roles-row', await L.usersRolesRow(page, T, mg));
        await L.snap(page, 'nt-users-roles');
        F('dialogs', d.seen);
    } finally {
        await close();
    }
}

// ---------------------------------------------------------------------------
// email: Side effects of an email-change request; confirm; Manage Emails
async function email(app, F) {
    const T = tag('u03sw3');
    const T2 = tag('u03sw3');
    const e1 = `${T}e`;
    const e2 = `${T}f`;
    const contactName = `Ursula Contact${T.slice(-4)}`;
    await app.api.createContext({tag: T, context: {contactName, contactEmail: `${T}c@mail.test`}, users: [
        {username: e1, givenName: 'Eve', familyName: 'Mail', roles: ['author'], password: 'evepass1'},
        {username: e2, givenName: 'Fay', familyName: 'Site', roles: ['author'], password: 'faypass1'},
    ]});
    await app.api.createContext({tag: T2, users: [{username: e2, roles: ['reader']}]});
    F('seed', {T, T2, e1, e2, contactName});
    const A = await launch(app);
    const B = await launch(app);
    try {
        await signIn(A.page, e1, {password: 'evepass1', contextPath: T});
        await signIn(B.page, e1, {password: 'evepass1', contextPath: T});
        const pB = await L.openProfile(B.page, T, 'identity');
        // control: B's tab press works before the request
        await pB.tabLink('contact').click();
        await L.sleep(2500);
        F('B-tab-before', {contactOpen: await pB.form('contact').isVisible().catch(() => false), url: B.page.url()});
        await pB.tabLink('identity').click();
        await L.sleep(1500);
        let p = await L.openProfile(A.page, T, 'contact');
        const since = new Date();
        await p.country().selectOption({label: 'Canada'});
        const newMail = `${e1}new@mail.test`;
        await p.email().fill(newMail);
        await p.save();
        F('request', {pending: L.flat(await p.pendingEmailNotice().innerText().catch(() => null)), toasts: await L.watchToasts(A.page, 1200), snap: await L.snap(A.page, 'em-requested')});
        const m = await L.fullMail(app, {to: `${e1}@mail.test`, subject: 'Confirm account contact email change request', since});
        F('mail', {subject: m.subject, from: m.from, to: m.to, text: m.text});
        F('mail-count-old', await app.mail.count({to: `${e1}@mail.test`, since}));
        F('mail-count-new', await app.mail.count({to: newMail, since}));
        // B: unaffected
        const bt = await L.traffic(B.page, async () => {
            await pB.tabLink('contact').click();
            await L.sleep(2500);
        }, {filter: /profile-tab|login/});
        F('B-tab', {requests: bt.requests, panel: L.flat(await pB.panel().innerText().catch(() => null), 200), contactOpen: await pB.form('contact').isVisible().catch(() => false), url: B.page.url()});
        await B.page.goto(pB.url('identity'));
        await L.sleep(1200);
        F('B-reload', {url: B.page.url(), login: await B.page.locator('form#login').count()});
        // confirm, then the sign-in address
        const confirm = app.mail.extractLink(m.html, /confirm/i);
        const confirmAt = new Date();
        await A.page.goto(confirm);
        await L.sleep(1500);
        F('confirm', {url: A.page.url(), toasts: await L.watchToasts(A.page, 1000), email: await A.page.locator('input[name="email"]').inputValue().catch(() => null)});
        await signOut(A.page);
        F('signin-new-address', await L.typedSignIn(A.page, app, T, newMail, 'evepass1'));
        await signOut(A.page);
        F('signin-old-address', await L.typedSignIn(A.page, app, T, `${e1}@mail.test`, 'evepass1'));
        // no further mail: bounded by a reset request to the new address
        await step(F, 'mail-after-confirm', async () => {
            await A.page.goto(`/index.php/${T}/en/login/lostPassword`);
            await A.page.locator('input#email').fill(newMail);
            await A.page.locator('form#lostPasswordForm button[type="submit"]').click();
            await app.mail.find({to: newMail, subject: 'Password Reset Confirmation', since: confirmAt});
            const n = await app.mail._search({to: newMail, since: confirmAt});
            const o = await app.mail._search({to: `${e1}@mail.test`, since: confirmAt});
            return {toNew: (n.messages || []).map((x) => x.Subject), toOld: (o.messages || []).map((x) => x.Subject)};
        });

        // site level (e2 holds two contexts)
        await signIn(A.page, e2, {password: 'faypass1', contextPath: T});
        await step(F, 'site-request', async () => {
            const s = await L.openProfile(A.page, null, 'contact');
            const since2 = new Date();
            await s.country().selectOption({label: 'Canada'});
            await s.email().fill(`${e2}new@mail.test`);
            await s.save();
            const m2 = await L.fullMail(app, {to: `${e2}@mail.test`, subject: 'Confirm account contact email change request', since: since2});
            return {url: A.page.url(), from: m2.from, text: m2.text};
        });
        // the site's contact name, as Administration shows it
        await signIn(A.page, 'admin');
        await step(F, 'site-contact', async () => {
            const {SiteSettingsPage} = L.pages('SiteSettingsPages.js');
            const site = new SiteSettingsPage(A.page);
            await site.goto('#setup');
            await site.information();
            return A.page.locator('input[id^="siteInfo-contactName-control"]').evaluateAll((is) => is.map((i) => `${i.id}=${i.value}`));
        });
        // Manage Emails: the template's row
        await step(F, 'manage-emails', async () => {
            const {ManageEmailsPage} = L.pages('EmailsPages.js');
            const me = new ManageEmailsPage(A.page, T);
            await me.goto();
            await idle(A.page);
            const names = await me.rowNames();
            await me.searchBox().fill('Change Email');
            await me.searchBox().press('Enter');
            await L.sleep(2000);
            await idle(A.page);
            const searched = await me.rowNames();
            await L.snap(A.page, 'em-manage-emails');
            return {count: names.length, hasRow: names.filter((n) => /email/i.test(n)), searched};
        });
    } finally {
        await A.close();
        await B.close();
    }
}

// ---------------------------------------------------------------------------
// roles: Side effects of a Roles save (Users & Roles at once; the masthead)
async function roles(app, F) {
    const T = tag('u03sw3');
    const rd = `${T}r`;
    await app.api.createContext({tag: T, users: [{username: rd, givenName: 'Rory', familyName: 'Rolesave', roles: ['reader'], password: 'rorypass1'},
        {username: `${T}x`, givenName: 'Max', familyName: 'Mastcontrol', roles: ['sectionEditor']}]});
    F('seed', {T, rd});
    const U = await launch(app);
    const M = await launch(app);
    const box = APP_ROLE[app.name].reviewerBox || 'Author';
    try {
        await signIn(U.page, rd, {password: 'rorypass1', contextPath: T});
        await signIn(M.page, 'admin');
        const mh0 = await L.mastheadText(M.page, T);
        F('masthead-before', {hasName: mh0.text.includes('Rolesave'), control: mh0.text.includes('Mastcontrol'), text: mh0.text.slice(-600)});
        F('ur-before', await L.usersRolesRow(M.page, T, rd));
        let p = await L.openProfile(U.page, T, 'roles');
        await p.roleBox(box).check();
        await p.save();
        F('tick-save', {box, toasts: await L.watchToasts(U.page, 1200)});
        F('ur-after-tick', await L.usersRolesRow(M.page, T, rd));
        const mh = await L.mastheadText(M.page, T);
        F('masthead-after-tick', {hasName: mh.text.includes('Rolesave'), control: mh.text.includes('Mastcontrol'), status: mh.status});
        await L.snap(M.page, 'ro-masthead');
        p = await L.openProfile(U.page, T, 'roles');
        await p.roleBox(box).uncheck();
        await p.save();
        F('untick-save', await L.watchToasts(U.page, 1200));
        F('ur-after-untick', await L.usersRolesRow(M.page, T, rd));
        F('masthead-after-untick', {hasName: (await L.mastheadText(M.page, T)).text.includes('Rolesave')});
    } finally {
        await U.close();
        await M.close();
    }
}

const PHASES = {levels, password, policy, apikey, notif, email, roles};

forEachApp(async (app) => {
    const fn = PHASES[PHASE];
    if (!fn) throw new Error(`unknown phase ${PHASE}`);
    const F = factsFor(app, PHASE);
    F('run', {app: app.name, line: app.line || 'main', phase: PHASE, run: process.env.PROBE_RUN || null, at: new Date().toISOString()});
    await fn(app, F);
});
