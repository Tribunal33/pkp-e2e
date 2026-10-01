// PR review check — pkp/pkp-lib#13127, ui-library#989 (main) / #1001 (stable-3_5_0):
// "Reset invitationId ONLY on userId/userEmail change". U06's send wizard (note g, f-a2).
//
//   PROBE_FEATURE=sync PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/sync/ui-library-989/invite-race.js
//   RACE_LEGS=race-existing,plain …   runs only the named legs
//
// Before the PR, a deep watcher on the wizard payload nulled the invitation id on ANY payload change
// whose inviteeEmail differed from the create payload's (always, for an existing user: the create payload
// then carries userId only). An email-composer edit landing while the final `populate` was in flight made
// the following `PUT invitations/null/invite` answer 404 (the issue's log), and every composer edit
// before the send created a fresh draft. The legs, each on one scratch context per app:
//   race-existing  existing user; the final populate held 2.5 s, the subject edited while it is held
//   race-new       the same for a newcomer's address (control: the old watcher kept the id here)
//   plain          existing user, no hold, subject and body edited on the compose step: drafts left behind
//   back-switch    existing user to the compose step, Back twice to Search, a newcomer's address sent:
//                  the new watcher must still start a new invitation for the new invitee
//   edit           "Edit Invitation" on the plain leg's pending row, subject edited, sent
// No assertions: facts per leg (API calls, the dialog, mail counts, the invitations rows) go to
// result-<app>.json, judged by the reader.
const {forEachApp, launch, signIn, screen, record, shot, idle, tag, sql} = require('../../../probe');

const ONLY = (process.env.RACE_LEGS || '').split(',').map((s) => s.trim()).filter(Boolean);
const want = (leg) => !ONLY.length || ONLY.includes(leg);
const fold = (s) => (s || '').replace(/\s+/g, ' ').trim();
const today = () => new Date().toISOString().slice(0, 10);

forEachApp(async (app) => {
    const T = tag('race');
    const ROLE = app.name === 'ops' ? 'Moderator' : 'Copyeditor';
    const U = {mgr: `${T}mgr`, exA: `${T}exa`, exB: `${T}exb`, exC: `${T}exc`};
    const mail = (k) => `${U[k]}@mail.test`;
    const NEW = {race: `${T}new1@mail.test`, back: `${T}new2@mail.test`};
    await app.api.createContext({
        tag: T,
        users: [
            {username: U.mgr, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
            {username: U.exA, roles: ['author'], givenName: 'Ann', familyName: 'Existing'},
            {username: U.exB, roles: ['author'], givenName: 'Ben', familyName: 'Existing'},
            {username: U.exC, roles: ['author'], givenName: 'Cyd', familyName: 'Existing'},
        ],
    });
    const {table, id} = app.contextTables;
    const ctxId = sql(app, `select ${id} from ${table} where path='${T}'`);
    const rows = () =>
        sql(app, `select i.invitation_id, i.status, coalesce(u.email, i.email) from invitations i left join users u on u.user_id=i.user_id where i.context_id=${ctxId} order by i.invitation_id`)
            .split('\n')
            .filter(Boolean);
    console.log(`${app.name}: scratch context ${T} (${ctxId})`);

    const R = {app: app.name, context: T, legs: {}};
    const {page, close} = await launch(app);
    const api = [];
    page.on('response', (res) => {
        const u = res.url();
        if (/\/api\/v1\/invitations/.test(u)) {
            const m = res.request().headers()['x-http-method-override'];
            api.push(`${m || res.request().method()} ${res.status()} ${u.replace(/^.*\/api\/v1\//, '').replace(/\?.*$/, '')}`);
        }
    });
    const take = () => api.splice(0, api.length);
    const accessUrl = app.url(`/index.php/${T}/management/settings/access`);
    const subject = page.getByLabel(/^Subject/);
    const sendBtn = page.getByRole('button', {name: 'Invite user to the role'});
    const sentDialog = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
    const step = (name) => page.getByRole('heading', {name});

    const openWizard = async () => {
        await page.goto(accessUrl);
        await page.getByRole('heading', {name: 'Users & Roles'}).waitFor();
        await idle(page);
        await page.getByRole('button', {name: 'Invite to a role'}).click();
        await step(/Search User/).waitFor();
    };
    const search = async (email) => {
        await page.getByLabel(/Search for a user by email address/).fill(email);
        await page.getByRole('button', {name: 'Search User', exact: true}).click();
        await step(/Enter details/).waitFor();
        await idle(page);
    };
    const fillRole = async () => {
        const row = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
        const select = row.getByLabel(/^Select a new role/);
        // After Back to Search the earlier pass's role row is still filled in (read, not refilled).
        if ((await select.inputValue()) && (await row.getByRole('textbox').inputValue())) return 'kept';
        await select.selectOption({label: ROLE});
        await row.getByRole('textbox').fill(today());
        await row.getByRole('combobox').last().selectOption({label: 'Appear on the masthead'});
    };
    const toCompose = async () => {
        await page.getByRole('button', {name: 'Save And Continue'}).click();
        await subject.waitFor();
        await page.waitForFunction(() => {
            const el = [...document.querySelectorAll('input')].find((i) => /subject/i.test(i.id + i.name));
            return el && el.value;
        }, null, {timeout: 15_000}).catch(() => {});
        await idle(page);
    };
    /** Press send; with `hold`, the next populate is held 2.5 s and the subject edited inside it. */
    const send = async (leg, {hold = false} = {}) => {
        const f = {};
        if (hold) {
            let held = false;
            await page.route('**/api/v1/invitations/*/populate', async (route) => {
                if (!held) {
                    held = true;
                    await new Promise((r) => setTimeout(r, 2500));
                }
                await route.continue();
            });
            await sendBtn.click();
            await page.waitForTimeout(400);
            f.editDuringHold = await subject
                .fill(`${leg} edited mid-flight`, {timeout: 1500})
                .then(() => 'typed')
                .catch((e) => `not typed: ${fold(e.message).slice(0, 120)}`);
        } else {
            await sendBtn.click();
        }
        f.sentDialog = await sentDialog
            .waitFor({timeout: 15_000})
            .then(() => true)
            .catch(() => false);
        await idle(page);
        if (hold) await page.unrouteAll({behavior: 'ignoreErrors'});
        const s = await screen(page);
        record(`${leg}-after-send-${app.name}`, s);
        await shot(page, `${leg}-after-send-${app.name}`);
        f.notices = s.notices;
        f.dialog = fold(s.text.dialog).slice(0, 300) || null;
        return f;
    };
    const leg = async (name, fn) => {
        if (!want(name)) return;
        take();
        const before = rows();
        const f = {};
        try {
            await fn(f);
        } catch (e) {
            f.error = fold(e.message).slice(0, 400);
            await shot(page, `${name}-error-${app.name}`).catch(() => {});
        }
        f.api = take();
        f.addCalls = f.api.filter((l) => /invitations\/add\//.test(l)).length;
        f.nullCalls = f.api.filter((l) => /invitations\/null\//.test(l));
        f.rowsNew = rows().filter((r) => !before.includes(r));
        f.rowsAll = rows();
        R.legs[name] = f;
        console.log(`${app.name} ${name}: dialog=${f.sentDialog} add=${f.addCalls} null=${f.nullCalls.length} new rows=${JSON.stringify(f.rowsNew)}${f.error ? ' ERROR ' + f.error : ''}`);
    };

    try {
        await signIn(page, U.mgr);

        await leg('race-existing', async (f) => {
            await openWizard();
            await search(mail('exA'));
            await fillRole();
            await toCompose();
            await subject.fill('race-existing subject');
            Object.assign(f, await send('race-existing', {hold: true}));
            f.mail = await app.mail.count({to: mail('exA')});
        });

        await leg('race-new', async (f) => {
            await openWizard();
            await search(NEW.race);
            await page.getByLabel(/^Given Name/).first().fill('Nova');
            await fillRole();
            await toCompose();
            await subject.fill('race-new subject');
            Object.assign(f, await send('race-new', {hold: true}));
            f.mail = await app.mail.count({to: NEW.race});
        });

        await leg('plain', async (f) => {
            await openWizard();
            await search(mail('exB'));
            await fillRole();
            await toCompose();
            await subject.fill('plain subject one');
            await subject.fill('plain subject two');
            await page.frameLocator('iframe').locator('body').click();
            await page.keyboard.type(' Extra line.');
            await idle(page);
            Object.assign(f, await send('plain'));
            f.mail = await app.mail.count({to: mail('exB')});
        });

        await leg('back-switch', async (f) => {
            await openWizard();
            await search(mail('exC'));
            await fillRole();
            await toCompose();
            f.apiAtCompose = [...api];
            const back = page.getByRole('button', {name: 'Back', exact: true});
            await back.click();
            await step(/Enter details/).waitFor();
            await back.click();
            await step(/Search User/).waitFor();
            await search(NEW.back);
            f.detailsEmail = await page.getByLabel(/^Email/).first().inputValue().catch(() => null);
            await page.getByLabel(/^Given Name/).first().fill('Nadia');
            f.roleRow = (await fillRole()) || 'filled';
            await toCompose();
            await subject.fill('back-switch subject');
            Object.assign(f, await send('back-switch'));
            f.mailNew = await app.mail.count({to: NEW.back});
            f.mailExC = await app.mail.count({to: mail('exC')});
        });

        await leg('edit', async (f) => {
            await page.goto(accessUrl);
            await page.getByRole('heading', {name: 'Users & Roles'}).waitFor();
            await idle(page);
            const row = page.getByRole('table', {name: /Invitations \(/}).getByRole('row').filter({hasText: mail('exB')});
            await row.getByRole('button', {name: /management.options/i}).click();
            await page.getByRole('menuitem', {name: /Edit/}).click();
            const confirm = page.getByRole('dialog').getByRole('button', {name: /Yes|Edit|Continue|OK/}).first();
            await confirm.click({timeout: 5000}).catch(() => {});
            await step(/Enter details/).waitFor();
            await idle(page);
            await toCompose();
            await subject.fill('edit subject one');
            await subject.fill('edit subject two');
            Object.assign(f, await send('edit'));
            f.mail = await app.mail.count({to: mail('exB')});
        });
    } finally {
        record(`result-${app.name}`, R);
        await close();
    }
});
