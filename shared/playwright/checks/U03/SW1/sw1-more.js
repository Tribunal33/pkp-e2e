// Phases email, imperson, contrib, xfeat of the U03 SW1 sweep (see sw1.js for the run line).
const {signIn, signOut, record, loc, idle, tag, sql, launch} = require('../../../probe');
const L = require('./lib.js');

const {flat, sleep, SUBJECT, mask} = L;
const RUN = process.env.PROBE_RUN || 'r1';
const PK = 'publicknowledge';
const log = (...a) => console.log(`[sw1 ${RUN}]`, ...a);

async function sect(F, name, fn) {
    try {
        F[name] = await fn();
    } catch (e) {
        F[name] = Object.assign(F[name] || {}, {FAILED: String(e.stack || e).split('\n').slice(0, 5).join(' | ')});
        log(`[${name} FAILED]`, F[name].FAILED);
    }
}
const rel = (app, u) => (u || '').replace(app.baseURL, '');

/** The Contact tab's state as the screen shows it. */
async function contactState(page) {
    const f = page.locator('form#contactForm');
    const vis = await f.isVisible().catch(() => false);
    if (!vis) return {contactShown: false};
    return {
        contactShown: true,
        email: await f.locator('input[name="email"]').inputValue().catch(() => null),
        readonly: await f.locator('input[name="email"]').evaluate((i) => i.readOnly).catch(() => null),
        notice: flat(await f.getByText('You have requested a change of your email to').innerText().catch(() => null), 300),
        noticeCount: await f.getByText('You have requested a change of your email to').count(),
        cancelButton: await f.locator('button[name="action"][value="cancelPendingEmail"]').count(),
        cancelLabel: flat(await f.locator('button[name="action"][value="cancelPendingEmail"]').innerText().catch(() => null)),
        noticeAboveBox: await f.getByText('You have requested a change of your email to').first().evaluate((n) => {
            const i = document.querySelector('form#contactForm input[name="email"]');
            return i ? !!(n.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
        }).catch(() => null),
        phone: await f.locator('input[name="phone"]').inputValue().catch(() => null),
        inTab: flat(await page.locator('#contactFormNotification').innerText().catch(() => null)),
        toasts: await L.toasts(page),
    };
}

async function openContact(app, b, cp) {
    await b.page.goto(app.url(cp ? `/index.php/${cp}/user/profile/contact` : '/index.php/index/user/profile/contact'));
    await L.waitForm(b.page, 'contact');
}

/** Save the Contact tab with a new address (a country chosen first when the box is blank). */
async function requestChange(app, b, cp, newEmail, {phone, label} = {}) {
    const {page} = b;
    await openContact(app, b, cp);
    const country = page.locator('form#contactForm select[name="country"]');
    if (!(await country.inputValue())) await country.selectOption({label: 'Canada'});
    if (phone) await page.locator('form#contactForm input[name="phone"]').fill(phone);
    await page.locator('form#contactForm input[name="email"]').fill(newEmail);
    const n = b.saves.length;
    await L.panel(page).getByRole('button', {name: 'Save', exact: true}).click();
    await page.locator('form#contactForm').getByText('You have requested a change of your email to').waitFor({timeout: 30000}).catch(() => {});
    await sleep(800);
    await idle(page);
    const s = label ? await L.snap(page, label) : null;
    const st = await contactState(page);
    st.sent = b.saves.length - n;
    if (s) st.notices = s.notices;
    return st;
}

/** Where a link leaves the browser: chain, address, title, header, the Contact tab or the page's own words. */
async function follow(app, b, url, label) {
    b.takeChain();
    const resp = await b.page.goto(url).catch((e) => ({error: String(e.message).slice(0, 200)}));
    await b.page.locator('#profileTabs form, form#login, main h1, h1').first().waitFor({timeout: 30000}).catch(() => {});
    await idle(b.page).catch(() => {});
    await sleep(500);
    const s = await L.snap(b.page, label);
    return {
        status: resp && resp.status ? resp.status() : resp,
        url: mask(rel(app, b.page.url())),
        title: s.title,
        header: flat(s.text.header, 160),
        h1: flat(await b.page.locator('h1').first().innerText().catch(() => null)),
        main: flat(s.text.main, 400),
        notices: s.notices,
        login: await b.page.locator('form#login').count(),
        contact: await contactState(b.page),
        username: flat(await b.page.locator('#userNameInfo').innerText().catch(() => null)),
        chain: b.takeChain().map(mask),
    };
}

async function confirmDecline(app, b, label) {
    b.takeChain();
    const btn = b.page.getByRole('button', {name: 'Confirm Decline Invitation', exact: true});
    if (!(await btn.count())) return {noButton: true};
    await btn.click();
    await b.page.waitForLoadState('load').catch(() => {});
    await b.page.locator('#profileTabs form, form#login, h1').first().waitFor({timeout: 30000}).catch(() => {});
    await idle(b.page).catch(() => {});
    await sleep(500);
    const s = await L.snap(b.page, label);
    return {url: mask(rel(app, b.page.url())), title: s.title, header: flat(s.text.header, 160), notices: s.notices, login: await b.page.locator('form#login').count(),
        contact: await contactState(b.page), chain: b.takeChain().map(mask)};
}

const dbEmail = (app, u) => sql(app, `select email from users where username='${u}'`);
const dbPending = (app, u) => sql(app, `select count(*) from invitations where type='changeProfileEmail' and status='PENDING' and user_id=(select user_id from users where username='${u}')`);

// ================================================================================== email
async function phaseEmail(app) {
    const F = {};
    const since = new Date(Date.now() - 2000);
    const t = tag(`u03sw1e${RUN}`);
    const U = {d: `${t}d`, c: `${t}c`, p: `${t}p`, o: `${t}o`};
    await app.api.createContext({tag: t, users: [
        {username: U.d, givenName: 'Dee', familyName: 'Probe', roles: ['author']},
        {username: U.c, givenName: 'Cal', familyName: 'Probe', roles: ['author']},
        {username: U.p, givenName: 'Pia', familyName: 'Plain', roles: ['author']},
        {username: U.o, givenName: 'Otto', familyName: 'Other', roles: ['author']},
    ]});
    const ta = tag(`u03sw1a${RUN}`);
    const tb = tag(`u03sw1b${RUN}`);
    const M = `${ta}m`;
    await app.api.createContext({tag: ta, users: [{username: M, givenName: 'Mia', familyName: 'Multi', roles: ['author']}]});
    await app.api.createContext({tag: tb, users: [{username: M, roles: ['author']}]});
    F.seed = {t, U, ta, tb, M};
    const mailOf = (u) => `${u}@mail.test`;
    const {LoginPage} = require('../../../pages/LoginPage.js');
    const b1 = await L.browserFor(app, 'b1');
    const b2 = await L.browserFor(app, 'b2');
    const open = [b1, b2];
    const fresh = async (label) => { const b = await L.browserFor(app, label); open.push(b); return b; };
    try {
        // ---------------------------------------------------------- scenario 4 (Dee)
        await sect(F, 's4', async () => {
            const out = {};
            const old = mailOf(U.d);
            const n1 = `${U.d}n1@mail.test`;
            const n2 = `${U.d}n2@mail.test`;
            await signIn(b1.page, U.d, {contextPath: t});
            await signIn(b2.page, U.d, {contextPath: t});
            await openContact(app, b2, t);
            // a third browser signed in with "Keep me logged in" unticked (the other end of that box)
            const bu = await fresh('unremembered');
            await bu.page.goto(app.url(`/index.php/${t}/login`));
            const lpu = new LoginPage(bu.page);
            await lpu.setRememberMe(false);
            out.unrememberedBox = await lpu.rememberMeCheckbox.isChecked();
            await lpu.signIn(U.d, `${U.d}${U.d}`);
            await bu.page.waitForLoadState('load').catch(() => {});
            await openContact(app, bu, t);
            out.secondRemembered = await b2.page.context().cookies().then((cs) => cs.map((c) => c.name).filter((n) => /remember/i.test(n)));
            out.thirdRemembered = await bu.page.context().cookies().then((cs) => cs.map((c) => c.name).filter((n) => /remember/i.test(n)));
            out.request = await requestChange(app, b1, t, n1, {phone: '555 0400', label: 'email-s4-01-requested'});
            await loc(b1.page, 'Profile › Contact: the pending notice\'s "Cancel"', b1.page.locator('form#contactForm button[name="action"][value="cancelPendingEmail"]'));
            await sleep(5500);
            out.request.toastsLater = await L.toasts(b1.page);
            // typing into the read-only box
            await b1.page.locator('form#contactForm input[name="email"]').click().catch(() => {});
            await b1.page.keyboard.type('zz');
            out.typedIntoReadonly = await b1.page.locator('form#contactForm input[name="email"]').inputValue();
            // the tab reopened: the phone saved with the request
            await L.pressTab(b1.page, 'identity');
            await L.pressTab(b1.page, 'contact');
            out.reopened = await contactState(b1.page);
            out.dbEmailPending = dbEmail(app, U.d);
            // the second browser carries on
            await L.pressTab(b2.page, 'identity');
            out.second = {given: await b2.page.locator('form#identityForm input[name="givenName[en]"]').inputValue().catch(() => null), url: rel(app, b2.page.url())};
            await b2.page.reload();
            await b2.page.locator('#profileTabs form').first().waitFor({timeout: 20000}).catch(() => {});
            out.second.afterReload = {url: rel(app, b2.page.url()), login: await b2.page.locator('form#login').count()};
            await L.snap(b2.page, 'email-s4-02-second-browser');
            out.secondDialogs = b2.seen.map((d) => ({type: d.type, message: d.message}));
            {
                const bu = open.find((x) => x.label === 'unremembered');
                const n0 = bu.seen.length;
                await L.pressTab(bu.page, 'identity');
                out.third = {given: await bu.page.locator('form#identityForm input[name="givenName[en]"]').inputValue().catch(() => null), dialogs: bu.since(n0)};
                await bu.page.reload();
                await bu.page.locator('#profileTabs form, form#login').first().waitFor({timeout: 20000}).catch(() => {});
                out.third.afterReload = {url: rel(app, bu.page.url()), login: await bu.page.locator('form#login').count()};
                await L.snap(bu.page, 'email-s4-02b-third-browser-unremembered');
            }
            // the message
            const msg = await L.changeMail(app, {to: old, contains: n1, since});
            out.mail = {...msg, confirm: mask(msg.confirm), reject: mask(msg.reject)};
            out.toNew = await app.mail.count({to: n1, since});
            // confirm, signed in
            out.confirm = await follow(app, b1, msg.confirm, 'email-s4-03-confirm');
            await sleep(3000);
            out.afterConfirm = {toOld: await app.mail.count({to: old, since}), toNew: await app.mail.count({to: n1, since}), db: dbEmail(app, U.d)};
            // the new address signs in; the old one is refused
            await signOut(b1.page);
            await b1.page.goto(app.url(`/index.php/${t}/login`));
            await new LoginPage(b1.page).signIn(n1, `${U.d}${U.d}`);
            await b1.page.waitForLoadState('load').catch(() => {});
            await idle(b1.page);
            out.signInNew = {url: rel(app, b1.page.url())};
            await signOut(b1.page);
            await b1.page.goto(app.url(`/index.php/${t}/login`));
            const lp = new LoginPage(b1.page);
            await lp.usernameInput.fill(old);
            await lp.fillPassword(`${U.d}${U.d}`);
            await lp.submitButton.click();
            await b1.page.waitForLoadState('load').catch(() => {});
            await idle(b1.page);
            const so = await L.snap(b1.page, 'email-s4-04-old-refused');
            out.signInOld = {url: rel(app, b1.page.url()), main: flat(so.text.main, 200)};
            // a later request goes to the address current by then
            await signIn(b1.page, U.d, {contextPath: t});
            out.second2 = await requestChange(app, b1, t, n2);
            const m2 = await L.changeMail(app, {to: n1, contains: n2, since});
            out.laterRequest = {to: m2.to, from: m2.from, toOldCount: await app.mail.count({to: old, since})};
            F._dPending = m2; // its links, used below by another account
            return out;
        });

        // ---------------------------------------------------------- the link opened by another signed-in account
        await sect(F, 'otherAccount', async () => {
            const m2 = F._dPending;
            if (!m2) return {skipped: 'no pending request'};
            const bo = await fresh('otto');
            await signIn(bo.page, U.o, {contextPath: t});
            const before = dbEmail(app, U.d);
            const r = await follow(app, bo, m2.confirm, 'email-other-01-confirm-as-otto');
            return {before, after: dbEmail(app, U.d), ottoEmail: dbEmail(app, U.o), landing: r};
        });

        // ---------------------------------------------------------- a preferred public name in the message
        await sect(F, 'preferredInMail', async () => {
            const bp = await fresh('pia');
            await signIn(bp.page, U.p, {contextPath: t});
            await bp.page.goto(app.url(`/index.php/${t}/user/profile/identity`));
            await L.waitForm(bp.page, 'identity');
            await bp.page.locator('form#identityForm input[name="preferredPublicName[en]"]').fill('Dr. Pia Preferred');
            await L.panel(bp.page).getByRole('button', {name: 'Save', exact: true}).click();
            await sleep(1500);
            const np = `${U.p}n1@mail.test`;
            await requestChange(app, bp, t, np);
            const mp = await L.changeMail(app, {to: mailOf(U.p), contains: np, since});
            return {from: mp.from, dear: mp.dear, to: mp.to, signOff: mp.signOff};
        });

        // ---------------------------------------------------------- scenario 5 (Cal), the signed-out reject, the lapse
        await sect(F, 's5', async () => {
            const out = {};
            const old = mailOf(U.c);
            const n = (i) => `${U.c}n${i}@mail.test`;
            await signIn(b1.page, U.c, {contextPath: t});
            out.r1 = await requestChange(app, b1, t, n(1));
            const m1 = await L.changeMail(app, {to: old, contains: n(1), since});
            // the tab's Cancel: notices flushed first, then the in-tab block and the toasts polled for 7 s
            await sleep(6000);
            await L.snap(b1.page, 'email-s5-00-before-cancel');
            const k = b1.saves.length;
            const seenFeedback = [];
            const t0 = Date.now();
            await b1.page.locator('form#contactForm button[name="action"][value="cancelPendingEmail"]').click();
            while (Date.now() - t0 < 7000) {
                const inTab = flat(await b1.page.locator('#contactFormNotification').innerText().catch(() => null));
                const ts = await L.toasts(b1.page);
                const key = JSON.stringify([inTab, ts]);
                if (!seenFeedback.length || seenFeedback[seenFeedback.length - 1].key !== key) seenFeedback.push({at: Date.now() - t0, key, inTab, toasts: ts});
                await sleep(200);
            }
            await idle(b1.page);
            const sc = await L.snap(b1.page, 'email-s5-01-cancelled');
            out.cancel = {posts: b1.saves.slice(k), notices: sc.notices, feedback: seenFeedback.map(({at, inTab, toasts}) => ({at, inTab, toasts})), state: await contactState(b1.page), db: dbPending(app, U.c)};
            await sleep(5000);
            out.cancel.toastsLater = await L.toasts(b1.page);
            out.cancel.mailToOld = await app.mail.count({to: old, since});
            out.cancelledConfirm = await follow(app, b1, m1.confirm, 'email-s5-02-cancelled-confirm');
            out.cancelledReject = await follow(app, b1, m1.reject, 'email-s5-03-cancelled-reject');
            // reject, signed in
            out.r2 = await requestChange(app, b1, t, n(2));
            const m2 = await L.changeMail(app, {to: old, contains: n(2), since});
            out.reject = await follow(app, b1, m2.reject, 'email-s5-04-decline-page');
            out.rejectButton = await b1.page.getByRole('button', {name: 'Confirm Decline Invitation', exact: true}).count();
            out.rejectDone = await confirmDecline(app, b1, 'email-s5-05-declined');
            out.rejectedConfirm = await follow(app, b1, m2.confirm, 'email-s5-06-rejected-confirm');
            // confirm, signed out
            out.r3 = await requestChange(app, b1, t, n(3));
            const m3 = await L.changeMail(app, {to: old, contains: n(3), since});
            const b3 = await fresh('signedout');
            out.signedOutConfirm = await follow(app, b3, m3.confirm, 'email-s5-07-confirm-signed-out');
            out.signedOutConfirm.dbBeforeSignIn = dbEmail(app, U.c);
            if (out.signedOutConfirm.login) {
                b3.takeChain();
                await new LoginPage(b3.page).signIn(U.c, `${U.c}${U.c}`);
                await b3.page.waitForURL(/user\/profile/, {timeout: 30000}).catch(() => {});
                await L.waitForm(b3.page, 'contact').catch(() => {});
                await sleep(800);
                const s = await L.snap(b3.page, 'email-s5-08-after-sign-in');
                out.signedOutConfirm.after = {url: rel(app, b3.page.url()), notices: s.notices, contact: await contactState(b3.page), chain: b3.takeChain().map(mask)};
            }
            await sleep(2500);
            out.control = {toOldSubject: await app.mail.count({to: old, subject: SUBJECT, since}), toOld: await app.mail.count({to: old, since})};
            // the signed-out "reject"
            await openContact(app, b1, t);
            out.b1AfterSwitch = await contactState(b1.page);
            out.r4 = await requestChange(app, b1, t, n(4));
            const m4 = await L.changeMail(app, {to: n(3), contains: n(4), since});
            const b4 = await fresh('signedout2');
            out.signedOutReject = await follow(app, b4, m4.reject, 'email-s5-09-reject-signed-out');
            out.signedOutReject.done = await confirmDecline(app, b4, 'email-s5-10-reject-signed-out-done');
            out.signedOutReject.pendingDb = dbPending(app, U.c);
            await openContact(app, b1, t);
            out.signedOutReject.signedInTab = await contactState(b1.page);
            // the lapse: the request's expiry moved into the past
            out.r5 = await requestChange(app, b1, t, n(5));
            const m5 = await L.changeMail(app, {to: n(3), contains: n(5), since});
            sql(app, `update invitations set expiry_date = now() - interval '1 hour' where type='changeProfileEmail' and status='PENDING' and user_id=(select user_id from users where username='${U.c}')`);
            await openContact(app, b1, t);
            await L.snap(b1.page, 'email-s5-11-lapsed-tab');
            out.lapse = {tab: await contactState(b1.page), db: sql(app, `select status from invitations where type='changeProfileEmail' and user_id=(select user_id from users where username='${U.c}') order by invitation_id desc limit 1`)};
            out.lapse.confirm = await follow(app, b1, m5.confirm, 'email-s5-12-lapsed-confirm');
            out.lapse.reject = await follow(app, b1, m5.reject, 'email-s5-13-lapsed-reject');
            out.lapse.dbEmail = dbEmail(app, U.c);
            // a new request after the lapse
            await openContact(app, b1, t);
            out.lapse.newRequestAllowed = !(await b1.page.locator('form#contactForm input[name="email"]').evaluate((i) => i.readOnly));
            return out;
        });

        // ---------------------------------------------------------- an account in two journals (A18), and the site-level request (A3, A10)
        await sect(F, 'multi', async () => {
            const out = {};
            const old = mailOf(M);
            const n = (i) => `${M}n${i}@mail.test`;
            await signIn(b2.page, M, {contextPath: ta});
            out.r1 = await requestChange(app, b2, ta, n(1));
            const m1 = await L.changeMail(app, {to: old, contains: n(1), since});
            out.links = {confirm: mask(m1.confirm), reject: mask(m1.reject)};
            out.signOff = m1.signOff;
            out.confirm = await follow(app, b2, m1.confirm, 'email-multi-01-confirm');
            out.r2 = await requestChange(app, b2, ta, n(2));
            const m2 = await L.changeMail(app, {to: n(1), contains: n(2), since});
            out.reject = await follow(app, b2, m2.reject, 'email-multi-02-decline-page');
            out.rejectDone = await confirmDecline(app, b2, 'email-multi-03-declined');
            // signed out "confirm"
            out.r3 = await requestChange(app, b2, ta, n(3));
            const m3 = await L.changeMail(app, {to: n(1), contains: n(3), since});
            const bx = await fresh('multi-signedout');
            out.signedOut = await follow(app, bx, m3.confirm, 'email-multi-04-confirm-signed-out');
            if (out.signedOut.login) {
                bx.takeChain();
                await new LoginPage(bx.page).signIn(M, `${M}${M}`);
                await bx.page.waitForLoadState('load').catch(() => {});
                await bx.page.locator('#profileTabs form').first().waitFor({timeout: 30000}).catch(() => {});
                await idle(bx.page);
                const s = await L.snap(bx.page, 'email-multi-05-after-sign-in');
                out.signedOut.after = {url: rel(app, bx.page.url()), title: s.title, header: flat(s.text.header, 160), notices: s.notices, contact: await contactState(bx.page), chain: bx.takeChain().map(mask)};
            }
            // the site-level profile's own request: its message and its "reject"
            out.site = await requestChange(app, b2, null, n(4), {label: 'email-multi-06-site-requested'});
            out.site.url = rel(app, b2.page.url());
            const m4 = await L.changeMail(app, {to: n(3), contains: n(4), since});
            out.site.links = {confirm: mask(m4.confirm), reject: mask(m4.reject)};
            out.site.signOff = m4.signOff;
            out.site.dear = m4.dear;
            out.site.reject = await follow(app, b2, m4.reject, 'email-multi-07-site-decline-page');
            out.site.rejectDone = await confirmDecline(app, b2, 'email-multi-08-site-declined');
            return out;
        });
        delete F._dPending;
    } finally {
        F.dialogs = open.flatMap((b) => b.seen.map((d) => ({browser: b.label, ...d})));
        for (const b of open) await b.close();
    }
    record('facts-email', F);
    return F;
}

// ================================================================================== imperson (scenario 11)
async function phaseImperson(app) {
    const F = {};
    const t = tag(`u03sw1p${RUN}`);
    const mg = `${t}mg`;
    const au = `${t}au`;
    await app.api.createContext({tag: t, users: [
        {username: mg, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
        {username: au, givenName: 'Ann', familyName: 'Impersonated', roles: ['author']},
        {username: `${au}2`, givenName: 'Bo', familyName: 'Firstsign', roles: ['author']},
    ]});
    F.seed = {t, mg, au};
    const bm = await L.browserFor(app, 'manager');
    const ba = await L.browserFor(app, 'author');
    const page = bm.page;
    const loginAs = async (label) => {
        await page.goto(app.url(`/index.php/${t}/management/settings/access`));
        await idle(page);
        const search = page.getByRole('searchbox').first();
        await search.fill(au);
        await search.press('Enter');
        const row = page.getByRole('row').filter({hasText: `${au}@mail.test`}).first();
        await row.waitFor({timeout: 30000});
        await idle(page);
        await row.getByRole('button', {name: /management[. ]options|^More Actions$/i}).click();
        await page.getByRole('menuitem').filter({hasText: 'Login As'}).click();
        const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Login As'});
        await dlg.waitFor({timeout: 15000});
        await dlg.getByRole('button', {name: 'OK'}).click();
        await page.waitForURL(/dashboard/, {timeout: 30000}).catch(() => {});
        await idle(page);
        await L.snap(page, label);
        return {landed: rel(app, page.url()), userButton: await L.userButton(page)};
    };
    const logoutAs = async (label) => {
        bm.takeChain();
        await page.locator('[data-cy="app-user-nav"] > button').first().click();
        await sleep(400);
        await Promise.all([
            page.waitForNavigation({timeout: 30000}).catch(() => {}),
            page.locator('[data-cy="app-user-nav"]').getByRole('link', {name: `Logout as ${au}`}).first().click(),
        ]);
        await page.waitForLoadState('load').catch(() => {});
        await idle(page);
        const s = await L.snap(page, label);
        return {landed: rel(app, page.url()), title: s.title, chain: bm.takeChain(), login: await page.locator('form#login').count(), userButton: await L.userButton(page)};
    };
    try {
        await sect(F, 'authorEarly', async () => {
            await signIn(ba.page, au, {contextPath: t});
            return {url: rel(app, ba.page.url())};
        });
        await sect(F, 'loginAs', async () => {
            await signIn(page, mg, {contextPath: t});
            await page.goto(app.url(`/index.php/${t}/management/settings/access`));
            await idle(page);
            const search = page.getByRole('searchbox').first();
            await search.fill(au);
            await search.press('Enter');
            const row = page.getByRole('row').filter({hasText: `${au}@mail.test`}).first();
            await row.waitFor({timeout: 30000});
            await idle(page);
            await row.getByRole('button', {name: /management[. ]options|^More Actions$/i}).click();
            const items = (await page.getByRole('menuitem').allInnerTexts()).map((x) => flat(x));
            await page.getByRole('menuitem').filter({hasText: 'Login As'}).click();
            const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Login As'});
            await dlg.waitFor({timeout: 15000});
            const dtext = flat(await dlg.innerText());
            await dlg.getByRole('button', {name: 'OK'}).click();
            await page.waitForURL(/dashboard/, {timeout: 30000}).catch(() => {});
            await idle(page);
            const menu = await L.userMenu(page);
            await L.snap(page, 'imp-01-impersonating-menu');
            return {rowMenu: items, dialog: dtext, landed: rel(app, page.url()), userButton: await L.userButton(page), menu};
        });
        await sect(F, 'profile', async () => {
            await page.locator('[data-cy="app-user-nav"]').getByRole('link', {name: 'Edit Profile', exact: true}).click();
            await page.waitForURL(/user\/profile/, {timeout: 30000});
            await L.waitForm(page, 'identity');
            await L.snap(page, 'imp-02-edit-profile');
            const r = {url: rel(app, page.url()), username: flat(await page.locator('#userNameInfo').innerText()), given: await page.locator('form#identityForm input[name="givenName[en]"]').inputValue()};
            await L.pressTab(page, 'contact');
            await page.locator('form#contactForm select[name="country"]').selectOption({label: 'Canada'});
            await page.locator('form#contactForm input[name="affiliation[en]"]').fill('Impersonated Institute');
            await L.panel(page).getByRole('button', {name: 'Save', exact: true}).click();
            await sleep(1500);
            await idle(page);
            const s = await L.snap(page, 'imp-03-contact-saved');
            r.saved = {notices: s.notices, toasts: await L.toasts(page)};
            r.db = sql(app, `select setting_value from user_settings where setting_name='affiliation' and user_id=(select user_id from users where username='${au}')`);
            return r;
        });
        await sect(F, 'author', async () => {
            await ba.page.goto(app.url(`/index.php/${t}/user/profile/contact`));
            await L.waitForm(ba.page, 'contact');
            await L.snap(ba.page, 'imp-04-author-contact');
            return {affiliation: await ba.page.locator('form#contactForm input[name="affiliation[en]"]').inputValue(), country: await ba.page.locator('form#contactForm select[name="country"]').inputValue()};
        });
        await sect(F, 'back', async () => {
            await page.locator('[data-cy="app-user-nav"] > button').first().click();
            await sleep(400);
            const entries = await page.locator('[data-cy="app-user-nav"]').getByRole('link', {name: `Logout as ${au}`}).evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`));
            bm.takeChain();
            await Promise.all([
                page.waitForNavigation({timeout: 30000}).catch(() => {}),
                page.locator('[data-cy="app-user-nav"]').getByRole('link', {name: `Logout as ${au}`}).first().click(),
            ]);
            await page.waitForLoadState('load').catch(() => {});
            await idle(page);
            const sl = await L.snap(page, 'imp-05a-after-logout-as');
            const landed = rel(app, page.url());
            const chain = bm.takeChain();
            const ownMenu = await L.userMenu(page).catch(() => null);
            await page.goto(app.url(`/index.php/${t}/user/profile/contact`));
            await page.locator('#profileTabs form, form#login').first().waitFor({timeout: 30000}).catch(() => {});
            await idle(page);
            const sc = await L.snap(page, 'imp-05-manager-own-contact');
            if (!(await page.locator('form#contactForm').count())) {
                return {entries, landed, chain, ownMenu, title: sl.title, contactUrl: rel(app, page.url()), contactTitle: sc.title, contactMain: flat(sc.text.main, 300)};
            }
            return {entries, landed, chain, ownMenu, userButton: await L.userButton(page), username: flat(await page.locator('#userNameInfo').innerText().catch(() => null)), affiliation: await page.locator('form#contactForm input[name="affiliation[en]"]').inputValue(),
                email: await page.locator('form#contactForm input[name="email"]').inputValue()};
        });
        // variant: the Author signs in elsewhere while the impersonation is running
        await sect(F, 'lateSignIn', async () => {
            const out = {};
            await signIn(page, mg, {contextPath: t});
            out.loginAs = await loginAs('imp-06-impersonating-again');
            const bc = await L.browserFor(app, 'author-late');
            try {
                await signIn(bc.page, au, {contextPath: t});
                out.authorLanded = rel(app, bc.page.url());
            } finally {
                await bc.close();
            }
            await page.reload();
            await page.waitForLoadState('load').catch(() => {});
            await idle(page);
            const s = await L.snap(page, 'imp-07-manager-after-author-signin');
            out.managerAfterReload = {url: rel(app, page.url()), title: s.title, login: await page.locator('form#login').count(), userButton: await L.userButton(page)};
            if (!out.managerAfterReload.login) out.logoutAs = await logoutAs('imp-08-logout-as-after-late-signin');
            return out;
        });
        // variant: a Contact save while impersonating, then the Author signs in elsewhere, then "Logout as" (no reload)
        for (const reload of [false, true]) await sect(F, `saveThenLate${reload ? 'Reload' : ''}`, async () => {
            const out = {};
            await signIn(page, mg, {contextPath: t});
            out.loginAs = await loginAs(`imp-11-impersonating-save-${reload}`);
            await page.goto(app.url(`/index.php/${t}/user/profile/contact`));
            await L.waitForm(page, 'contact');
            await page.locator('form#contactForm input[name="phone"]').fill(`555 01${reload ? 2 : 1}1`);
            await L.panel(page).getByRole('button', {name: 'Save', exact: true}).click();
            await sleep(1500);
            await idle(page);
            out.saved = await L.toasts(page);
            const bc = await L.browserFor(app, 'author-late2');
            try {
                await signIn(bc.page, au, {contextPath: t});
                out.authorLanded = rel(app, bc.page.url());
            } finally {
                await bc.close();
            }
            if (reload) {
                await page.reload();
                await page.waitForLoadState('load').catch(() => {});
                await idle(page);
                out.afterReload = {url: rel(app, page.url()), login: await page.locator('form#login').count(), userButton: await L.userButton(page)};
            }
            out.logoutAs = await logoutAs(`imp-12-logout-as-after-save-${reload}`);
            if (out.logoutAs.login) await signIn(page, mg, {contextPath: t});
            return out;
        });
        // variant (the order of the first runs): a Contact save while impersonating, the Author signs in elsewhere
        // and opens their own Contact tab, the browser left open; then "Logout as" with no reload
        await sect(F, 'origOrder', async () => {
            const out = {};
            await signIn(page, mg, {contextPath: t});
            out.loginAs = await loginAs('imp-13-impersonating-orig');
            await page.goto(app.url(`/index.php/${t}/user/profile/contact`));
            await L.waitForm(page, 'contact');
            await page.locator('form#contactForm input[name="phone"]').fill('555 0131');
            await L.panel(page).getByRole('button', {name: 'Save', exact: true}).click();
            await sleep(1500);
            await idle(page);
            const bd = await L.browserFor(app, 'author-orig');
            try {
                await signIn(bd.page, au, {contextPath: t});
                await bd.page.goto(app.url(`/index.php/${t}/user/profile/contact`));
                await L.waitForm(bd.page, 'contact');
                out.authorPhone = await bd.page.locator('form#contactForm input[name="phone"]').inputValue();
                out.logoutAs = await logoutAs('imp-14-logout-as-orig');
                if (out.logoutAs.login) await signIn(page, mg, {contextPath: t});
            } finally {
                await bd.close();
            }
            return out;
        });
        // variant: an Author who has never signed in is impersonated, then signs in for the first time elsewhere
        await sect(F, 'firstSignIn', async () => {
            const out = {};
            const au2 = `${au}2`;
            const cost = () => sql(app, `select substr(password, 1, 7) from users where username='${au2}'`);
            out.hashBefore = cost();
            await signIn(page, mg, {contextPath: t});
            // Login As the second author
            await page.goto(app.url(`/index.php/${t}/management/settings/access`));
            await idle(page);
            const search = page.getByRole('searchbox').first();
            await search.fill(au2);
            await search.press('Enter');
            const row = page.getByRole('row').filter({hasText: `${au2}@mail.test`}).first();
            await row.waitFor({timeout: 30000});
            await idle(page);
            await row.getByRole('button', {name: /management[. ]options|^More Actions$/i}).click();
            await page.getByRole('menuitem').filter({hasText: 'Login As'}).click();
            const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Login As'});
            await dlg.waitFor({timeout: 15000});
            await dlg.getByRole('button', {name: 'OK'}).click();
            await page.waitForURL(/dashboard/, {timeout: 30000}).catch(() => {});
            await idle(page);
            out.impersonating = await L.userButton(page);
            const bc = await L.browserFor(app, 'author-first');
            try {
                await signIn(bc.page, au2, {contextPath: t});
                out.authorLanded = rel(app, bc.page.url());
            } finally {
                await bc.close();
            }
            out.hashAfter = cost();
            await page.reload();
            await page.waitForLoadState('load').catch(() => {});
            await idle(page);
            const s = await L.snap(page, 'imp-15-manager-after-first-signin');
            out.managerAfterReload = {url: rel(app, page.url()), title: s.title, login: await page.locator('form#login').count(), userButton: await L.userButton(page)};
            if (out.managerAfterReload.login) await signIn(page, mg, {contextPath: t});
            return out;
        });
        // control: impersonating with no sign-in elsewhere, "Logout as" straight away
        await sect(F, 'plainLogoutAs', async () => {
            await signIn(page, mg, {contextPath: t});
            const a = await loginAs('imp-09-impersonating-plain');
            return {loginAs: a, logoutAs: await logoutAs('imp-10-logout-as-plain')};
        });
    } finally {
        F.dialogs = bm.seen.concat(ba.seen);
        await bm.close();
        await ba.close();
    }
    record('facts-imperson', F);
    return F;
}

// ================================================================================== contrib
function wizardOf(app, page, cp) {
    const root = '../../../../../apps';
    if (app.name === 'ojs') {
        const {StartSubmissionPage, SubmissionWizardPage} = require(`${root}/ojs/playwright/pages/SubmissionWizardPage.js`);
        const w = new SubmissionWizardPage(page, cp);
        return {
            async begin(title) {
                const start = new StartSubmissionPage(page, cp);
                await start.heading().waitFor({timeout: 30000});
                await start.fillTitle(title);
                await start.checklistBox().check();
                await start.privacyBox().check();
                await start.begin();
                await w.expectLoaded();
            },
            async toContributors() { await w.expectStep('Upload Files'); await w.continueTo('Details'); await w.continueTo('Contributors'); },
            openEdit: (name) => w.openContributorEdit(name),
            close: (modal) => w.closeContributorEdit(modal),
            item: (name) => w.contributorItem(name),
        };
    }
    const W = require(`${root}/${app.name}/playwright/pages/SubmissionWizardPages.js`);
    return {
        async begin(title) { await W.beginSubmission(page, {title}); },
        async toContributors() { await W.expectStep(page, W.STEPS.files); await W.continueTo(page, W.STEPS.details); await W.continueTo(page, W.STEPS.contributors); },
        openEdit: (name) => W.openContributorEdit(page, name),
        close: (modal) => W.closeContributorEdit(modal),
        item: (name) => W.contributorItem(page, name),
    };
}

async function readContributor(page, modal) {
    await sleep(800);
    return modal.evaluate((m) => {
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const inputs = {};
        for (const i of m.querySelectorAll('input[name], select[name]')) if (i.type !== 'hidden' && i.type !== 'checkbox' && i.type !== 'radio') inputs[i.name] = i.value;
        const eds = (window.tinymce ? window.tinymce.get() : []).filter((e) => m.contains(e.getElement()) || m.contains(e.getContainer())).map((e) => ({id: e.id, text: e.getBody() ? e.getBody().innerText.trim() : null}));
        const aff = [...m.querySelectorAll('table, [class*="ffiliation"]')].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
        return {inputs, editors: eds, affiliations: aff.slice(0, 3), buttons: [...m.querySelectorAll('button')].filter(vis).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
            orcidText: (m.innerText.match(/ORCID[^\n]*\n?[^\n]*/g) || []).slice(0, 4)};
    });
}

async function startAndRead(app, b, cp, title, name, label) {
    const {page} = b;
    await page.goto(app.url(`/index.php/${cp}/dashboard/mySubmissions`));
    await idle(page);
    await page.getByRole('link', {name: 'Start A New Submission'}).first().click();
    const w = wizardOf(app, page, cp);
    await w.begin(title);
    const id = (page.url().match(/[?&]id=(\d+)/) || [])[1];
    await w.toContributors();
    await idle(page);
    const s = await L.snap(page, `${label}-contributors`);
    const listText = flat(await w.item(name).first().innerText().catch(() => null), 300);
    const modal = await w.openEdit(name);
    await L.snap(page, `${label}-edit`);
    const c = await readContributor(page, modal);
    await w.close(modal).catch(() => {});
    return {id, listText, main: flat(s.text.main, 600), contributor: c};
}

async function phaseContrib(app) {
    const F = {};
    const A = app.name;
    const t = tag(`u03sw1k${RUN}`);
    const U = {au: `${t}au`, ae: `${t}ae`, se: `${t}se`, rv: `${t}rv`};
    const users = [
        {username: U.au, givenName: 'Pat', familyName: 'Profile', roles: ['author'], orcid: 'https://orcid.org/0000-0002-1825-0097', orcidIsVerified: true},
        {username: U.ae, givenName: 'Emma', familyName: 'Empty', roles: ['author']},
        {username: U.se, givenName: 'Sam', familyName: 'Section', roles: ['sectionEditor']},
        {username: `${U.se}2`, givenName: 'Una', familyName: 'Unaffiliated', roles: ['sectionEditor']},
    ];
    if (A !== 'ops') users.push({username: U.rv, givenName: 'Rex', familyName: 'Reviewer', roles: ['externalReviewer']});
    await app.api.createContext({tag: t, orcid: {enabled: true}, users});
    F.seed = {t, U};
    const b = await L.browserFor(app, 'contrib');
    const {page} = b;
    const saveTab = async () => { await L.panel(page).getByRole('button', {name: 'Save', exact: true}).click(); await sleep(1500); await idle(page); };
    try {
        // ---- scenario 12
        await sect(F, 's12', async () => {
            const out = {};
            await signIn(page, U.au, {contextPath: t});
            await page.goto(app.url(`/index.php/${t}/user/profile/identity`));
            await L.waitForm(page, 'identity');
            await page.locator('form#identityForm input[name="preferredPublicName[en]"]').fill('Dr. Pat Profile');
            await saveTab();
            out.identitySaved = flat(await page.locator('#identityFormNotification').innerText().catch(() => null));
            await L.pressTab(page, 'contact');
            await page.locator('form#contactForm select[name="country"]').selectOption({label: 'Canada'});
            await page.locator('form#contactForm input[name="affiliation[en]"]').fill('Profile Institute');
            await saveTab();
            out.contactSaved = await L.toasts(page);
            await L.pressTab(page, 'publicProfile');
            await L.waitEditors(page, 'form#publicProfileForm');
            await L.typeEditor(page, 'form#publicProfileForm', 'biography', 'Profile bio.');
            await page.locator('form#publicProfileForm input[name="userUrl"]').fill('https://example.org/profile');
            await saveTab();
            out.publicSaved = await L.toasts(page);
            out.first = await startAndRead(app, b, t, `Submission ${t}`, 'Pat Profile', 'contrib-s12-first');
            // control: a later affiliation, the draft reopened by its address
            await page.goto(app.url(`/index.php/${t}/user/profile/contact`));
            await L.waitForm(page, 'contact');
            await page.locator('form#contactForm input[name="affiliation[en]"]').fill('Later Institute');
            await saveTab();
            await page.goto(app.url(`/index.php/${t}/submission?id=${out.first.id}`));
            const w = wizardOf(app, page, t);
            await w.toContributors();
            const modal = await w.openEdit('Pat Profile');
            await L.snap(page, 'contrib-s12-reopened-edit');
            out.reopened = await readContributor(page, modal);
            await w.close(modal).catch(() => {});
            return out;
        });
        // ---- the other end: an account with nothing on its profile beyond the names
        await sect(F, 'empty', async () => {
            await signIn(page, U.ae, {contextPath: t});
            return startAndRead(app, b, t, `Empty ${t}`, 'Emma Empty', 'contrib-empty');
        });
        // ---- the section editor: affiliation (masthead), signature (decision email, Notify)
        await sect(F, 'editor', async () => {
            const out = {};
            const sig = `SW1 signature line ${RUN}`;
            await signIn(page, U.se, {contextPath: t});
            await page.goto(app.url(`/index.php/${t}/user/profile/contact`));
            await L.waitForm(page, 'contact');
            await L.waitEditors(page, 'form#contactForm');
            await page.locator('form#contactForm select[name="country"]').selectOption({label: 'Canada'});
            await page.locator('form#contactForm input[name="affiliation[en]"]').fill('Masthead Institute');
            await L.typeEditor(page, 'form#contactForm', 'signature', sig);
            await saveTab();
            out.saved = await L.toasts(page);
            // the masthead
            await page.goto(app.url(`/index.php/${t}/about/editorialMasthead`));
            await idle(page);
            const sm = await L.snap(page, 'contrib-masthead');
            out.masthead = flat(sm.text.main, 1200);
            // a submission with the section editor as participant: the decision composer
            const sub = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: U.ae, title: `Decision ${t}`, participants: [{username: U.se, role: 'sectionEditor'}]});
            out.submissionId = sub.submissionId;
            await page.goto(app.url(`/index.php/${t}/dashboard/editorial?workflowSubmissionId=${sub.submissionId}`));
            await idle(page);
            const wf = page.locator('[role="dialog"]:visible').first();
            await wf.waitFor({timeout: 30000});
            await sleep(1500);
            const s0 = await L.snap(page, 'contrib-workflow');
            out.workflowButtons = (await wf.getByRole('button').allInnerTexts()).map((x) => flat(x)).filter(Boolean).slice(0, 40);
            let pressed = null;
            for (const name of ['Decline Submission', 'Send to External Review', 'Send for Review', 'Decline']) {
                const btn = wf.getByRole('button', {name, exact: true}).first();
                if (await btn.count()) { pressed = name; await btn.click(); break; }
            }
            out.decision = {pressed};
            if (pressed) {
                await page.waitForURL(/decision\/record/, {timeout: 30000}).catch(() => {});
                await idle(page);
                await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                await page.waitForFunction(() => (window.tinymce ? window.tinymce.get() : []).some((e) => e.initialized && e.getContent().length > 20), null, {timeout: 30000}).catch(() => {});
                await sleep(1000);
                await L.snap(page, 'contrib-decision-composer');
                out.decision.bodies = await page.evaluate(() => (window.tinymce ? window.tinymce.get() : []).map((e) => (e.getBody() ? e.getBody().innerText.trim() : '')).filter(Boolean).map((x) => x.slice(-260)));
                out.decision.hasSignature = out.decision.bodies.some((x) => x.includes(sig));
            }
            // the Participants panel's "Notify" for the author
            await page.goto(app.url(`/index.php/${t}/dashboard/editorial?workflowSubmissionId=${sub.submissionId}`));
            await idle(page);
            await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000});
            await sleep(1500);
            const more = page.getByRole('button', {name: 'Emma Empty More Actions'}).first();
            out.notify = {button: await more.count()};
            if (out.notify.button) {
                await more.click();
                await page.getByRole('menuitem', {name: 'Notify', exact: true}).click();
                const form = page.locator('form#notifyForm');
                await form.waitFor({timeout: 30000});
                await idle(page);
                const opts = await form.locator('select[name="template"] option').allInnerTexts().catch(() => []);
                out.notify.templates = opts.map((x) => flat(x));
                const pick = opts.find((o) => /Discussion/.test(o)) || opts.find((o) => o.trim());
                if (pick) {
                    await form.locator('select[name="template"]').selectOption({label: pick.trim()});
                    await page.waitForFunction(() => (window.tinymce ? window.tinymce.get() : []).some((e) => /^message/.test(e.id) && e.initialized && e.getContent().trim() !== ''), null, {timeout: 30000}).catch(() => {});
                    await sleep(800);
                }
                out.notify.picked = pick;
                await L.snap(page, 'contrib-notify');
                out.notify.body = await page.evaluate(() => {
                    const f = document.querySelector('form#notifyForm');
                    const e = (window.tinymce ? window.tinymce.get() : []).find((x) => /^message/.test(x.id) && f && f.contains(x.getElement()));
                    return e && e.getBody() ? e.getBody().innerText.trim().slice(-300) : null;
                });
                out.notify.hasSignature = (out.notify.body || '').includes(sig);
            }
            void s0;
            return out;
        });
        // ---- reviewing interests in the Add Reviewer search (a journal and a press)
        if (A !== 'ops') await sect(F, 'interests', async () => {
            const out = {};
            const word = `sw1int${RUN}${t.slice(-4)}`;
            await signIn(page, U.rv, {contextPath: t});
            await page.goto(app.url(`/index.php/${t}/user/profile/roles`));
            await L.waitForm(page, 'roles');
            const box = page.locator('#interests ul.tagit li.tagit-new input');
            await box.click();
            await box.pressSequentially(word, {delay: 20});
            await box.press('Enter');
            await saveTab();
            out.saved = await L.toasts(page);
            const sub = await app.api.createSubmission({tag: `${t}r`, context: t, submitter: U.ae, title: `Review ${t}`, decisions: ['sendExternalReview'], participants: [{username: U.se, role: 'sectionEditor'}]});
            await signIn(page, U.se, {contextPath: t});
            await page.goto(app.url(`/index.php/${t}/dashboard/editorial?workflowSubmissionId=${sub.submissionId}`));
            await idle(page);
            await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000});
            await sleep(1500);
            await page.getByRole('button', {name: 'Add Reviewer', exact: true}).first().click();
            const modal = page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')});
            const search = modal.locator('.listPanel--selectReviewer input.pkpSearch__input');
            await search.waitFor({timeout: 30000});
            await idle(page);
            const item = modal.locator('.listPanel--selectReviewer .listPanel__item').filter({hasText: 'Rex Reviewer'});
            out.unsearched = flat(await item.first().innerText().catch(() => null), 400);
            await search.fill(word);
            await search.press('Enter');
            await sleep(1500);
            await idle(page);
            await L.snap(page, 'contrib-add-reviewer-by-interest');
            out.byInterest = (await modal.locator('.listPanel--selectReviewer .listPanel__item').allInnerTexts()).map((x) => flat(x, 300));
            await search.fill('Rex Reviewer');
            await search.press('Enter');
            await sleep(1500);
            await idle(page);
            out.byName = (await modal.locator('.listPanel--selectReviewer .listPanel__item').allInnerTexts()).map((x) => flat(x, 300));
            out.word = word;
            return out;
        });
    } finally {
        F.dialogs = b.seen;
        await b.close();
    }
    record('facts-contrib', F);
    return F;
}

// ================================================================================== xfeat
async function phaseXfeat(app) {
    const F = {};
    const t = tag(`u03sw1x${RUN}`);
    await app.api.createContext({tag: t, users: [{username: `${t}mg`, roles: ['manager']}]});
    F.seed = {t};
    const b = await L.browserFor(app, 'xfeat');
    const {page} = b;
    try {
        // registration: the completion page's "Edit My Profile", the Register page's "Login" link
        await sect(F, 'register', async () => {
            const out = {};
            const who = {username: `${t}nw`, email: `${t}nw@mail.test`, password: `${t}pw1`};
            await page.goto(app.url(`/index.php/${t}/user/register`));
            await idle(page);
            await L.snap(page, 'xfeat-register');
            out.loginLink = await page.locator('form#register a').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})).filter((a) => /login/i.test(a.text)));
            const form = page.locator('form#register');
            await form.locator('input[name="givenName"]').fill('Reg');
            await form.locator('input[name="familyName"]').fill('Newcomer');
            await form.locator('input[name="affiliation"]').fill('PKP');
            await form.locator('select[name="country"]').selectOption({label: 'Canada'});
            await form.locator('input[name="email"]').fill(who.email);
            await form.locator('input[name="username"]').fill(who.username);
            await form.locator('input[name="password"]').fill(who.password);
            await form.locator('input[name="password2"]').fill(who.password);
            const pc = form.locator('input[name="privacyConsent"]');
            if (await pc.count()) await pc.check();
            await form.locator('button.submit').click();
            await page.waitForLoadState('load').catch(() => {});
            await idle(page);
            const sc = await L.snap(page, 'xfeat-register-complete');
            out.complete = {url: rel(app, page.url()), h1: flat(await page.locator('h1').first().innerText().catch(() => null)),
                actions: await page.locator('ul.registration_complete_actions a').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`))};
            void sc;
            const edit = page.locator('ul.registration_complete_actions').getByRole('link', {name: 'Edit My Profile', exact: true});
            if (await edit.count()) {
                await edit.click();
                await page.waitForURL(/user\/profile/, {timeout: 30000}).catch(() => {});
                await page.locator('#profileTabs form').first().waitFor({timeout: 30000}).catch(() => {});
                await idle(page);
                await L.snap(page, 'xfeat-edit-my-profile');
                out.editMyProfile = {url: rel(app, page.url()), selected: await L.selectedTab(page)};
            }
            // the Register page's "Login" link, signed out
            await signOut(page);
            await page.goto(app.url(`/index.php/${t}/user/register`));
            await idle(page);
            const link = page.locator('form#register a').filter({hasText: /^Login$/});
            if (await link.count()) {
                await link.first().click();
                await page.waitForLoadState('load').catch(() => {});
                await idle(page);
                out.loginPage = rel(app, page.url());
                const {LoginPage} = require('../../../pages/LoginPage.js');
                await new LoginPage(page).signIn(who.username, who.password);
                await page.waitForLoadState('load').catch(() => {});
                await idle(page);
                await sleep(800);
                await L.snap(page, 'xfeat-register-login-landing');
                out.loginLanding = {url: rel(app, page.url()), selected: await L.selectedTab(page)};
            }
            return out;
        });
        // the access-denied page a barred address lands on
        await sect(F, 'denied', async () => {
            await signIn(page, 'reader.rosa', {contextPath: PK});
            await page.goto(app.url(`/index.php/${PK}/management/settings/access`));
            await idle(page);
            const s = await L.snap(page, 'xfeat-denied');
            return {url: rel(app, page.url()), title: s.title, main: flat(s.text.main, 300)};
        });
        // OJS's subscription pages under user/ (read as the Reader)
        await sect(F, 'subscriptions', async () => {
            const r = await page.goto(app.url(`/index.php/${PK}/user/subscriptions`));
            await idle(page);
            const s = await L.snap(page, 'xfeat-user-subscriptions');
            return {status: r && r.status(), url: rel(app, page.url()), title: s.title, h1: flat(await page.locator('h1').first().innerText().catch(() => null)), main: flat(s.text.main, 300)};
        });
        // Manage Emails: the "Change Email Address Invitation" row
        await sect(F, 'manageEmails', async () => {
            await signIn(page, 'manager.maya', {contextPath: PK});
            await page.goto(app.url(`/index.php/${PK}/management/settings/manageEmails`));
            await idle(page);
            await page.locator('main').getByRole('button', {name: /^Edit /}).first().waitFor({timeout: 30000}).catch(() => {});
            const s = await L.snap(page, 'xfeat-manage-emails');
            const names = await page.evaluate(() => [...document.querySelectorAll('main button')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()).filter((x) => /^Edit /.test(x)).map((x) => x.replace(/^Edit (Edit )?/, '')));
            return {count: names.length, changeEmail: names.filter((n) => /Change Email/i.test(n)), mainHas: /Change Email Address Invitation/.test(s.text.main || '')};
        });
    } finally {
        F.dialogs = b.seen;
        await b.close();
    }
    record('facts-xfeat', F);
    return F;
}

module.exports = {email: phaseEmail, imperson: phaseImperson, contrib: phaseContrib, xfeat: phaseXfeat};
void launch;
