// U06 claim check H13D, row 9's other wizard doors: which page loads and sends write the
// `Undefined array key "invitation_id"` warning beside "Invite to a role" (h13d.js): the
// "Edit Invitation" path (a pending invitation's row > Edit > "Edit Invitation", then a send
// from the edit wizard) and the users list's Edit on a member (the same wizard, no search step).
// Each step marks the fleet's server log and records the PHP messages written since, pinned on
// the request line after them. Self-contained: it sends its own newcomer invitation first.
// PKP's default dataset, as `rvaca`; the member opened through Edit is `dbuskins`, and nothing
// is saved on that path. Run as h13d.js (PROBE_RUN r1, r2; main through bin/app-lock.sh).
const fs = require('fs');
const {forEachApp, launch, signIn, screen, record, idle, tag, serverLog} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 4000) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const today = () => new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
const strip = (u) => u.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '?…');

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
        if (m && (pending.length || Number(m[1]) >= 500)) {
            out.push({request: `${m[1]} ${m[2]} ${strip(m[3])}`, warnings: pending});
            pending = [];
        }
    }
    if (pending.length) out.push({request: null, warnings: pending});
    return out;
}

forEachApp(async (app) => {
    const T6 = tag('u06h13d').slice(-6);
    const email = `edi.u06h13d${T6}.${app.name}@mailinator.com`;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || 'r0', tag: T6, steps: {}, errors: {}};
    const log = serverLog(app);
    const logged = async (name, fn) => {
        const from = log.mark();
        try {
            await fn();
        } catch (e) {
            facts.errors[name] = flat(String(e.stack || e), 800);
        }
        await new Promise((r) => setTimeout(r, 700));
        facts.steps[name] = logSince(log, from);
    };
    const {page, close} = await launch(app);
    const access = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
        await page.locator('main h1').first().waitFor({timeout: T});
        await idle(page);
    };
    const toComposeAndSend = async (k) => {
        await logged(`${k}-to-compose`, async () => {
            await page.getByRole('button', {name: /Save And Continue/i}).click();
            await page.locator('input[name="subject"]').waitFor({timeout: T});
            await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page);
        });
        await logged(`${k}-send`, async () => {
            await page.getByRole('button', {name: 'Invite user to the role'}).click();
            const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
            await sent.waitFor({timeout: T});
            await sent.getByRole('button', {name: 'View All Users'}).click();
            await page.waitForURL(/management\/settings\/access/, {timeout: T}).catch(() => {});
            await idle(page);
        });
    };
    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        // 1. A newcomer invitation through "Invite to a role".
        await logged('new-01-users-and-roles', access);
        await logged('new-02-open-wizard', async () => {
            await page.locator('main').getByRole('button').filter({hasText: /Invite to a role/}).first().click();
            await page.locator('input[name="search"]').waitFor({timeout: T});
            await idle(page);
        });
        await logged('new-03-search', async () => {
            await page.locator('input[name="search"]').fill(email);
            await page.getByRole('button', {name: /^Search User/}).last().click();
            await page.getByRole('button', {name: /Save And Continue/i}).waitFor({timeout: T});
            await idle(page);
        });
        await page.getByLabel(/^Given Name/).first().fill('Edna');
        const sel = page.locator('select[name="userGroupId"]').last();
        await sel.selectOption({label: 'Author'});
        const row = page.getByRole('row').filter({has: sel});
        await row.getByRole('textbox').fill(today());
        await row.locator('select[name="masthead"]').selectOption({label: 'Does not appear on the masthead'});
        await toComposeAndSend('new');

        // 2. Its row > Edit > "Edit Invitation": the edit wizard's load, then a send from it.
        await logged('edit-01-users-and-roles', access);
        await logged('edit-02-open-edit-wizard', async () => {
            // The Invitations table pages by five, oldest first: page on until the row shows.
            const inv = page.getByRole('row').filter({hasText: email}).first();
            for (let i = 0; i < 10 && !(await inv.isVisible().catch(() => false)); i++) {
                // the Invitations box comes before Current Users, so its "Next" is the first
                await page.locator('main').getByRole('button', {name: /^Next/}).first().click();
                await idle(page);
            }
            await inv.getByRole('button', {name: /management.options/i}).click();
            await page.getByRole('menuitem', {name: /^Edit/}).click();
            const dlg = page.getByRole('dialog').filter({hasText: 'Edit Invitation'});
            await dlg.waitFor({timeout: T});
            await dlg.getByRole('button', {name: 'Edit Invitation', exact: true}).click();
            await page.waitForURL(/invitation\/edit\/\d+/, {timeout: T});
            await page.getByRole('button', {name: /Save And Continue/i}).waitFor({timeout: T});
            await idle(page);
        });
        facts.editUrl = strip(page.url());
        record('edit-wizard', await screen(page));
        await toComposeAndSend('edit');

        // 3. The users list's Edit on a member: the same wizard, nothing saved.
        await logged('member-01-users-and-roles', access);
        await logged('member-02-open-edit', async () => {
            await page.getByRole('searchbox').first().fill('Buskins');
            await page.keyboard.press('Enter');
            await idle(page);
            const r = page.getByRole('row').filter({hasText: 'dbuskins'}).first();
            await r.waitFor({timeout: T});
            await r.getByRole('button').last().click();
            await page.getByRole('menuitem', {name: 'Edit'}).click();
            await page.getByRole('button', {name: /Save And Continue/i}).waitFor({timeout: T});
            await idle(page);
        });
        facts.memberUrl = strip(page.url());
        record('member-edit-wizard', await screen(page));
    } catch (e) {
        facts.errors.top = flat(String(e.stack || e), 1500);
    } finally {
        record('edit-paths', facts);
        await close();
    }
});
