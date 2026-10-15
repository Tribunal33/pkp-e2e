// Issue report U06 A14: each opening of the "Invite to a role" wizard writes PHP warnings
// `Undefined array key "invitation_id"` (InvitationModel.php) to the server's error log.
//
// Mode `walk` (default) takes the report's Steps on PKP's default dataset as `rvaca`:
// "Invite to a role" (create), a newcomer invitation sent to nora.h15k@mailinator.com,
// its row's "Edit" > "Edit Invitation" (edit/{id}), and David Buskins's "Edit" in the users
// list (management/settings/user/{id}). Each step marks the fleet's server log first and
// records the PHP messages written since, pinned on the request line after them.
//
// Mode `nb` (neighbour, for the fix trial): a saved invitation's id still reaches every
// reader. It sends the same newcomer invitation, reads the email's accept and decline links
// (they must carry `id=<n>&key=…`), opens the "Edit Invitation" wizard (edit/<n>) and the
// accept link in a fresh browser, and records each.
//
// Run (main through the slot's app lock, one app per call; reset the fleet first):
//   npm run fleet-prep -- --feature issues-h15k --dataset 1 --reset
//   bin/app-lock.sh shared ojs -- env PROBE_FEATURE=issues-h15k PROBE_AGENT=h15k \
//       node bin/probe.js ojs shared/playwright/checks/issues/invitation-wizard-php-warnings/walk.js
//   MODE=nb PROBE_RUN=nb-out … (the neighbour)
//   PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=issues-h15k-3_5 PROBE_RUN=r35 … node bin/probe.js all …
const fs = require('fs');
const {forEachApp, launch, signIn, screen, record, idle, serverLog} = require('../../../probe');

const T = 30_000;
const MODE = process.env.MODE || 'walk';
const NEWCOMER = 'nora.h15k@mailinator.com';
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
            pending.push(l.replace(/^\[[^\]]+\]\s*/, '').replace(/\/home\/e2e\/[^ ]*?checkouts\/(stable-3_5_0\/)?/, '').trim());
            continue;
        }
        const m = l.match(/\[(\d{3})\]: (\w+) (\S+)/);
        if (m && (pending.length || Number(m[1]) >= 500)) {
            out.push({request: `${m[1]} ${m[2]} ${strip(m[3])}`, warnings: pending});
            pending = [];
        }
    }
    if (pending.length) out.push({request: null, warnings: pending});
    return out;
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null, steps: {}, counts: {}, errors: {}};
    const log = serverLog(app);
    const step = async (name, fn) => {
        const from = log.mark();
        try {
            await fn();
        } catch (e) {
            facts.errors[name] = flat(String(e.stack || e), 800);
        }
        await new Promise((r) => setTimeout(r, 800));
        facts.steps[name] = logSince(log, from);
        facts.counts[name] = facts.steps[name].reduce((n, e) => n + e.warnings.length, 0);
    };
    const {page, close} = await launch(app);
    const access = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
        await page.locator('main h1').first().waitFor({timeout: T});
        await idle(page);
    };
    const sendNewcomer = async () => {
        await step('04-search', async () => {
            await page.locator('input[name="search"]').fill(NEWCOMER);
            await page.getByRole('button', {name: /^Search User/}).last().click();
            await page.getByRole('button', {name: /Save And Continue/i}).waitFor({timeout: T});
            await idle(page);
        });
        await step('05-details', async () => {
            await page.getByLabel(/^Given Name/).first().fill('Nora');
            const sel = page.locator('select[name="userGroupId"]').last();
            await sel.selectOption({label: 'Author'});
            const row = page.getByRole('row').filter({has: sel});
            await row.getByRole('textbox').fill(today());
            const ms = row.locator('select[name="masthead"]');
            if (await ms.count()) await ms.selectOption({label: 'Does not appear on the masthead'});
        });
        await step('06-save-and-send', async () => {
            await page.getByRole('button', {name: /Save And Continue/i}).click();
            await page.locator('input[name="subject"]').waitFor({timeout: T});
            await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page);
            await page.getByRole('button', {name: 'Invite user to the role'}).click();
            const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
            await sent.waitFor({timeout: T});
            facts.sentDialog = flat(await sent.innerText(), 400);
        });
        await step('07-view-all-users', async () => {
            await page.getByRole('dialog').getByRole('button', {name: 'View All Users'}).click();
            await page.waitForURL(/management\/settings\/access/, {timeout: T}).catch(() => {});
            await idle(page);
        });
    };
    const openEditInvitation = async () => {
        const inv = page.getByRole('row').filter({hasText: NEWCOMER}).first();
        for (let i = 0; i < 10 && !(await inv.isVisible().catch(() => false)); i++) {
            await page.locator('main').getByRole('button', {name: /^Next/}).first().click();
            await idle(page);
        }
        await inv.getByRole('button').last().click();
        await page.getByRole('menuitem', {name: /^Edit/}).click();
        const dlg = page.getByRole('dialog').filter({hasText: 'Edit Invitation'});
        await dlg.waitFor({timeout: T});
        facts.editDialog = flat(await dlg.innerText(), 400);
        await dlg.getByRole('button', {name: 'Edit Invitation', exact: true}).click();
        await page.waitForURL(/invitation\/edit\/\d+/, {timeout: T});
        await page.getByRole('button', {name: /Save And Continue/i}).waitFor({timeout: T});
        await idle(page);
        facts.editUrl = strip(page.url());
    };
    try {
        await step('01-sign-in', () => signIn(page, 'rvaca', {contextPath: app.contextPath}));
        await step('02-users-and-roles', access);
        const since = new Date(Date.now() - 2000);
        await step('03-invite-to-a-role', async () => {
            await page.locator('main').getByRole('button').filter({hasText: /Invite to a role/}).first().click();
            await page.locator('input[name="search"]').waitFor({timeout: T});
            await idle(page);
            facts.createUrl = strip(page.url());
        });
        if (MODE === 'walk') record('wizard-create', await screen(page));
        await sendNewcomer();
        if (MODE === 'walk') {
            await step('08-edit-invitation', openEditInvitation);
            record('wizard-edit', await screen(page));
            await step('09a-users-and-roles', access);
            await step('09-member-edit', async () => {
                await page.getByRole('searchbox').first().fill('Buskins');
                await page.keyboard.press('Enter');
                await idle(page);
                const r = page.getByRole('row').filter({hasText: 'Buskins'}).first();
                await r.waitFor({timeout: T});
                await r.getByRole('button').last().click();
                await page.getByRole('menuitem', {name: 'Edit'}).click();
                await page.getByRole('button', {name: /Save And Continue/i}).waitFor({timeout: T});
                await idle(page);
                facts.memberUrl = strip(page.url());
            });
            record('wizard-member-edit', await screen(page));
        } else {
            // Neighbour: the saved invitation's id reaches the email links, the edit wizard and the accept page.
            const msg = await app.fleetMail.find({to: NEWCOMER, since, timeoutMs: T});
            const full = await app.fleetMail.fullMessage(msg.ID);
            const html = (full.HTML || '').replace(/&amp;/g, '&');
            const link = (op) => (html.match(new RegExp(`href=['"]([^'"]*/invitation/${op}\\?[^'"]+)['"]`, 'i')) || [])[1] || null;
            const accept = link('accept'), decline = link('decline');
            facts.email = {subject: full.Subject, accept: accept && accept.replace(/key=[^&]+/, 'key=…'), decline: decline && decline.replace(/key=[^&]+/, 'key=…')};
            facts.linkId = accept ? (accept.match(/[?&]id=(\d+)/) || [])[1] || null : null;
            await step('nb-edit-invitation', openEditInvitation);
            facts.editId = (facts.editUrl || '').match(/edit\/(\d+)/)?.[1] || null;
            facts.idsAgree = !!facts.linkId && facts.linkId === facts.editId;
            if (accept) {
                const visitor = await launch(app);
                try {
                    await step('nb-open-accept-link', async () => {
                        await visitor.page.goto(accept);
                        await idle(visitor.page);
                    });
                    const s = await screen(visitor.page);
                    record('nb-accept-page', s);
                    facts.acceptPage = {url: strip(s.url), title: s.title, text: flat(s.text && s.text.main, 300)};
                } finally {
                    await visitor.close();
                }
            }
        }
    } catch (e) {
        facts.errors.top = flat(String(e.stack || e), 1500);
    } finally {
        record(MODE === 'walk' ? 'walk' : 'neighbour', facts);
        await close();
    }
});
