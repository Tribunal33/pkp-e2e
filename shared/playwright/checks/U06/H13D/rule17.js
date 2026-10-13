// U06 claim check H13D, Rule 17 (accept-side "Cancel"), the rule row 10's screen sits in.
// A. A newcomer, signed out: "Cancel" on "Create account" ("Go Back"), a username typed there
//    and left by typing another address, "Cancel" on "Enter details" > "Cancel Invitation
//    Process", the manager's row, the link again, then accepting.
// B. The same person, now a member, invited to a further role: signed out, "Cancel" >
//    "Cancel Invitation Process", signing in where that lands; then signed in, the same again;
//    the manager's row and the member's roles; then accepting.
// PKP's default dataset, as `rvaca`; the invitee is a new address. Run as h13d.js.
const {forEachApp, launch, signIn, screen, record, idle, tag} = require('../../../probe');

const T = 30_000;
const ACR = {ojs: 'OJS', omp: 'OMP', ops: 'OPS'};
const flat = (s, n = 4000) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const today = () => new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
const strip = (u) => u.replace(/^https?:\/\/[^/]+/, '').replace(/key=[^&]+/, 'key=…');

forEachApp(async (app) => {
    const T6 = tag('u06h13d').slice(-6);
    const email = `sep.u06h13d${T6}.${app.name}@mailinator.com`;
    const user = `sep${T6}${app.name}`;
    const pass = `H13d-${T6}-Passw0rd`;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || 'r0', tag: T6, a: {}, b: {}, errors: {}};
    const guard = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            facts.errors[name] = flat(String(e.stack || e), 800);
            return null;
        }
    };
    const snap = async (page, name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    const manager = await launch(app);
    const visitor = await launch(app);
    const mp = manager.page;
    const vp = visitor.page;
    const since = new Date(Date.now() - 2000).toISOString();
    const access = async () => {
        await mp.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
        await mp.locator('main h1').first().waitFor({timeout: T});
        await idle(mp);
    };
    const invitationRow = async () => {
        await access();
        const row = mp.getByRole('row').filter({hasText: email}).first();
        for (let i = 0; i < 10 && !(await row.isVisible().catch(() => false)); i++) {
            const next = mp.locator('main').getByRole('button', {name: /^Next/}).first();
            if (!(await next.isEnabled().catch(() => false))) break;
            await next.click();
            await idle(mp);
        }
        return (await row.isVisible().catch(() => false)) ? flat(await row.innerText(), 200) : null;
    };
    const memberRow = async () => {
        await access();
        await mp.getByRole('searchbox').first().fill(email);
        await mp.keyboard.press('Enter');
        await idle(mp);
        await mp.waitForTimeout(1000);
        return (await mp.getByRole('row').filter({hasText: email}).allInnerTexts()).map((r) => flat(r, 200));
    };
    const send = async ({role, given}) => {
        await access();
        await mp.locator('main').getByRole('button').filter({hasText: /Invite to a role/}).first().click();
        await mp.locator('input[name="search"]').fill(email);
        await mp.getByRole('button', {name: /^Search User/}).last().click();
        await mp.getByRole('button', {name: /Save And Continue/i}).waitFor({timeout: T});
        await idle(mp);
        if (given) await mp.getByLabel(/^Given Name/).first().fill(given);
        const sel = mp.locator('select[name="userGroupId"]').last();
        const options = await sel.evaluate((s) => [...s.options].map((o) => o.text.trim()));
        const pick = role.find((r) => options.includes(r));
        await sel.selectOption({label: pick});
        const row = mp.getByRole('row').filter({has: sel});
        await row.getByRole('textbox').fill(today());
        const ms = row.locator('select[name="masthead"]');
        if (await ms.count()) await ms.selectOption({label: 'Does not appear on the masthead'});
        await mp.getByRole('button', {name: /Save And Continue/i}).click();
        await mp.locator('input[name="subject"]').waitFor({timeout: T});
        await mp.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
        await mp.getByRole('button', {name: 'Invite user to the role'}).click();
        const sent = mp.getByRole('dialog').filter({hasText: 'Invitation Sent'});
        await sent.waitFor({timeout: T});
        await sent.getByRole('button', {name: 'View All Users'}).click();
        await idle(mp);
        return pick;
    };
    const acceptLink = async (after) => {
        const host = new URL(app.baseURL).host;
        const deadline = Date.now() + T;
        for (;;) {
            const found = await app.mail._search({to: email, since: after});
            const links = [];
            for (const m of found.messages || []) {
                const full = await app.mail.fullMessage(m.ID);
                const hit = (full.HTML || '').includes(host) && (full.HTML || '').match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i);
                if (hit) links.push({date: new Date(full.Date), link: hit[1].replace(/&amp;/g, '&')});
            }
            if (links.length) return links.sort((x, y) => y.date - x.date)[0].link;
            if (Date.now() > deadline) throw new Error('no invitation email');
            await new Promise((r) => setTimeout(r, 1000));
        }
    };
    const open = async (link) => {
        await vp.goto(link);
        await vp.locator('.pkpSteps').first().waitFor({timeout: T});
        await idle(vp);
        await vp.waitForTimeout(1000);
    };
    const heading = async () => flat(await vp.locator('.pkpStep:not([hidden]) h2, main h2').first().innerText().catch(() => null), 200);
    const cancelButton = () => vp.locator('main').getByRole('button', {name: 'Cancel', exact: true}).last();
    const cancelProcess = async (key) => {
        await cancelButton().click();
        const dlg = vp.getByRole('dialog');
        await dlg.first().waitFor({timeout: 5000});
        const text = flat((await snap(vp, `${key}-dialog`)).text.dialog, 600);
        const navigated = vp.waitForURL((u) => !/invitation\/accept/.test(u.toString()), {timeout: T}).catch(() => {});
        await dlg.first().getByRole('button', {name: 'Cancel Invitation Process'}).click();
        await navigated;
        await idle(vp);
        const s = await snap(vp, `${key}-landed`);
        return {dialog: text, landed: strip(vp.url()), header: flat(await vp.locator('header').first().innerText().catch(() => ''), 300), title: s.title};
    };

    try {
        await signIn(mp, 'rvaca', {contextPath: app.contextPath});
        // A. newcomer
        const t0 = new Date(Date.now() - 1000).toISOString();
        await send({role: ['Author'], given: 'Sepa'});
        const link1 = await acceptLink(t0);
        const a = facts.a;
        await guard('a-create-account', async () => {
            await open(link1);
            a.firstHeading = await heading();
            a.createButtons = (await vp.locator('main').getByRole('button').allInnerTexts()).map((x) => flat(x, 50));
            await snap(vp, 'r17-a-create-account');
            await cancelButton().click();
            const dlg = vp.getByRole('dialog');
            await dlg.first().waitFor({timeout: 5000});
            a.createCancelDialog = flat((await snap(vp, 'r17-a-create-cancel-dialog')).text.dialog, 600);
            a.dialogButtons = (await dlg.first().getByRole('button').allInnerTexts()).map((x) => flat(x, 50));
            await dlg.first().getByRole('button', {name: 'Go Back'}).click();
            await dlg.first().waitFor({state: 'detached', timeout: 5000}).catch(() => {});
            a.afterGoBack = {dialogs: await vp.getByRole('dialog').count(), heading: await heading()};
            // a username typed, then another address typed
            await vp.getByLabel(/^Username/).fill(user);
            await vp.goto(app.url(`/index.php/${app.contextPath}/about`));
            await idle(vp);
            a.leftTo = strip(vp.url());
            await open(link1);
            a.reopenHeading = await heading();
            a.reopenUsername = await vp.getByLabel(/^Username/).inputValue().catch(() => null);
        });
        await guard('a-enter-details-cancel', async () => {
            await vp.getByLabel(/^Username/).fill(user);
            await vp.getByLabel(/^Password/).fill(pass);
            await vp.getByRole('checkbox').first().check();
            await vp.getByRole('button', {name: /^Save and continue$/i}).click();
            await vp.getByLabel(/^Country/).waitFor({timeout: T});
            await idle(vp);
            a.detailsHeading = await heading();
            a.detailsButtons = (await vp.locator('main').getByRole('button').allInnerTexts()).map((x) => flat(x, 50));
            a.cancelOnDetails = await cancelProcess('r17-a-details-cancel');
        });
        a.rowAfterCancel = await guard('a-row', invitationRow);
        await guard('a-reopen-accept', async () => {
            await open(link1);
            a.reopenAfterCancelHeading = await heading();
            a.reopenAfterCancelUsername = await vp.getByLabel(/^Username/).inputValue().catch(() => null);
            await vp.getByLabel(/^Username/).fill(user);
            await vp.getByLabel(/^Password/).fill(pass);
            await vp.getByRole('checkbox').first().check();
            await vp.getByRole('button', {name: /^Save and continue$/i}).click();
            await vp.getByLabel(/^Country/).waitFor({timeout: T});
            await vp.getByLabel(/^Country/).selectOption({index: 1});
            await vp.getByRole('button', {name: /^Save and continue$/i}).click();
            const accept = vp.getByRole('button', {name: new RegExp(`^Accept And Continue to ${ACR[app.name]}`)});
            await accept.waitFor({timeout: T});
            a.reviewButtons = (await vp.locator('main').getByRole('button').allInnerTexts()).map((x) => flat(x, 50));
            await accept.click();
            await vp.getByRole('dialog').first().waitFor({timeout: T});
            a.acceptedDialog = flat(await vp.getByRole('dialog').first().innerText(), 200);
        });
        a.memberAfterAccept = await guard('a-member', memberRow);

        // B. the member, a further role
        const b = facts.b;
        await visitor.context.clearCookies().catch(() => {});
        const t1 = new Date(Date.now() - 1000).toISOString();
        b.role = await guard('b-send', () => send({role: ['Reader', 'Reviewer', 'Moderator']}));
        const link2 = await acceptLink(t1);
        await guard('b-signed-out', async () => {
            await vp.goto('about:blank');
            await open(link2);
            b.outHeading = await heading();
            b.outButtons = (await vp.locator('main').getByRole('button').allInnerTexts()).map((x) => flat(x, 50));
            b.out = await cancelProcess('r17-b-out-cancel');
            // sign in where it landed
            await vp.locator('input#username').fill(user);
            await vp.locator('input#password').fill(pass);
            await vp.locator('form#login button[type="submit"]').click();
            await vp.waitForURL((u) => !/\/login/.test(u.toString()), {timeout: T}).catch(() => {});
            await idle(vp);
            const s = await snap(vp, 'r17-b-out-signed-in');
            b.afterSignIn = {url: strip(vp.url()), main: flat(s.text.main, 300)};
        });
        await guard('b-signed-in', async () => {
            await open(link2);
            b.inHeading = await heading();
            b.in = await cancelProcess('r17-b-in-cancel');
        });
        b.rowAfterCancels = await guard('b-row', invitationRow);
        b.memberAfterCancels = await guard('b-member', memberRow);
        await guard('b-accept', async () => {
            await open(link2);
            const accept = vp.getByRole('button', {name: new RegExp(`^Accept And Continue to ${ACR[app.name]}`)});
            await accept.click();
            await vp.getByRole('dialog').first().waitFor({timeout: T});
            b.acceptedDialog = flat(await vp.getByRole('dialog').first().innerText(), 200);
        });
        b.memberAfterAccept = await guard('b-member-after', memberRow);
    } catch (e) {
        facts.errors.top = flat(String(e.stack || e), 1500);
    } finally {
        record('rule17', facts);
        await visitor.close();
        await manager.close();
    }
});
