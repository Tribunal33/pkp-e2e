// U06 claim check S02 (upstream sync, pkp/pkp-lib#13299 at OJS lib/pkp
// ddd8ab243a): the send wizard's own address, `invitation/create/
// userRoleAssignment` and `invitation/edit/<id>`, typed by one account per
// permission level, and an invitation of journal B typed under journal A's
// path. Spec lines 26-27, 32, 673, 740, 748-757 and notes a, b, f-a1.
// OJS only: OMP's and OPS's lib/pkp sit before the change (the brief).
//
// Per run, on scratch journals of its own:
//   A (tag T): manager mgr, editor edn (a manager-level role whose group has
//     "Permit changes to Settings" unticked), productionEditor pe (manager
//     level, the installer's flag), sectionEditor se, funding as (assistant),
//     author au, externalReviewer rv, reader rd, and mab (manager of A and B)
//   B (tag Tb): manager mgrb, and mab
// 1. mgr sends an invitation in A from "Invite to a role" and opens it again
//    from the row's "Edit" › "Edit Invitation" (the id), leaves that wizard
//    once with a field changed; mgrb does the same in B.
// 2. admin opens A's wizard from "Invite to a role" and from "Edit Invitation".
// 3. Every account types A's Users & Roles, the create address and A's edit
//    address; cross-journal edit addresses for mgr, mab and admin; controls
//    (an id that does not exist, a non-numeric id).
// 5. (S02_PHASE=roster) the roster's accounts, one per permission level,
//    type publicknowledge's Users & Roles and create address (read-only: the
//    create page stores nothing until its first step is saved); a manager
//    types the create address with an unknown and with no invitation type.
// Every screen is recorded with screen(); run twice, each under PROBE_RUN:
//   PROBE_RUN=r1 PROBE_FEATURE=U06 PROBE_AGENT=ccS02 node bin/probe.js ojs shared/playwright/checks/U06/S02/s02.js
//   PROBE_RUN=r1 S02_PHASE=roster PROBE_FEATURE=U06 PROBE_AGENT=ccS02 node bin/probe.js ojs shared/playwright/checks/U06/S02/s02.js
const {forEachApp, launch, signIn, signOut, screen, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'r0';
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
    const PHASE = process.env.S02_PHASE || 'main';
    const T = tag('u06s02');
    const A = T;
    const B = `${T}b`;
    const facts = {app: app.name, run: RUN, tag: T, today: today(), errors: {}};
    const save = () => record(PHASE === 'main' ? 'facts' : `facts-${PHASE}`, facts);
    const snap = async (page, name) => {
        const s = await screen(page);
        record(name, s);
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
    const rcpt = (k) => `rcpt${T}${k}@mail.test`;

    const u = (k) => `${k}${T}`;

    // ── Helpers ──────────────────────────────────────────────────────────
    const usersTable = (page) => page.getByRole('table', {name: /^Current Users \(/});
    const invitationsTable = (page) => page.getByRole('table', {name: /^Invitations \(/});
    const gotoAccess = async (page, ctx) => {
        await page.goto(`/index.php/${ctx}/management/settings/access`);
        await expect(usersTable(page).locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
    };

    // Every /api/ answer while a visit loads, keyed by the visit.
    let apiKey = null;
    const apiLog = {};
    const watch = (page) => page.on('response', (r) => {
        if (!apiKey) return;
        const url = r.url();
        if (!/\/api\/v1\//.test(url) && !/\$\$\$call\$\$\$/.test(url)) return;
        (apiLog[apiKey] = apiLog[apiKey] || []).push({method: r.request().method(),
            override: r.request().headers()['x-http-method-override'] || null,
            path: new URL(url).pathname, status: r.status()});
    });

    /** Send an invitation to a newcomer from "Invite to a role"; returns what each step showed. */
    const sendFromButton = async (page, ctx, {to, marker, key}) => {
        const out = {};
        await gotoAccess(page, ctx);
        await snap(page, `${key}-01-users-roles`);
        out.inviteButtons = await page.getByRole('button', {name: 'Invite to a role'}).count();
        await page.getByRole('button', {name: 'Invite to a role'}).click();
        await expect(page.getByRole('heading', {name: /Search User/})).toBeVisible({timeout: 30_000});
        const s2 = await snap(page, `${key}-02-wizard-search`);
        out.wizardUrl = s2.url;
        await page.getByLabel(/Search for a user by email address/).fill(to);
        await page.getByRole('button', {name: 'Search User', exact: true}).click();
        await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
        await idle(page);
        await snap(page, `${key}-03-enter-details`);
        await page.getByLabel(/^Given Name/).first().fill('Nova');
        await page.getByLabel(/^Family Name/).first().fill('Quill');
        const row = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
        await row.getByLabel(/^Select a new role/).selectOption({label: 'Copyeditor'});
        await row.getByRole('textbox').fill(today());
        const mast = row.getByRole('combobox').last();
        if (await mast.count() && await mast.isEnabled()) await mast.selectOption({label: 'Appear on the masthead'}).catch(() => {});
        await page.getByRole('button', {name: 'Save And Continue'}).click();
        const subject = page.getByLabel(/^Subject/);
        await expect(subject).toBeVisible({timeout: 30_000});
        await expect(subject).not.toHaveValue('', {timeout: 30_000});
        await expect(page.frameLocator('iframe').locator('body')).not.toHaveText('', {timeout: 30_000});
        await idle(page);
        await snap(page, `${key}-04-compose`);
        await subject.fill(marker);
        await page.getByRole('button', {name: 'Invite user to the role'}).click();
        const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
        await expect(sent).toBeVisible({timeout: 30_000});
        out.sentDialog = flat((await snap(page, `${key}-05-sent`)).text.dialog, 400);
        await sent.getByRole('button', {name: 'View All Users'}).click();
        await page.waitForURL(/management\/settings\/access/, {timeout: 30_000});
        await expect(usersTable(page).locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
        out.rowsAfter = (await invitationsTable(page).locator('tbody tr').filter({hasText: to}).allInnerTexts()).map((x) => flat(x, 200));
        await page.reload();
        await expect(usersTable(page).locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
        out.rowsAfterReload = (await invitationsTable(page).locator('tbody tr').filter({hasText: to}).allInnerTexts()).map((x) => flat(x, 200));
        return out;
    };

    /** The invitation's row › "Edit" › "Edit Invitation": the edit wizard; returns its id and screen. */
    const openEditFromRow = async (page, ctx, {to, key}) => {
        const out = {};
        await gotoAccess(page, ctx);
        const row = invitationsTable(page).locator('tbody tr').filter({hasText: to});
        out.rows = await row.count();
        await row.getByRole('button', {name: /management.options/i}).click();
        const items = page.getByRole('menuitem');
        await expect(items.first()).toBeVisible({timeout: 10_000});
        out.menuItems = (await items.allInnerTexts()).map((x) => flat(x, 60));
        await loc(page, 'Users & Roles: Invitations row menu item "Edit"', page.getByRole('menuitem', {name: /^Edit/}));
        await page.getByRole('menuitem', {name: /^Edit/}).click();
        const dlg = page.getByRole('dialog').filter({hasText: 'Edit Invitation'});
        await expect(dlg).toBeVisible({timeout: 10_000});
        out.warnDialog = flat((await snap(page, `${key}-01-edit-warning`)).text.dialog, 400);
        out.warnButtons = (await dlg.getByRole('button').allInnerTexts()).map((x) => flat(x, 40));
        await dlg.getByRole('button', {name: 'Edit Invitation', exact: true}).click();
        await page.waitForURL(/invitation\/edit\/\d+/, {timeout: 30_000});
        await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
        await idle(page);
        const s = await snap(page, `${key}-02-edit-wizard`);
        out.url = s.url;
        out.id = Number((s.url.match(/invitation\/edit\/(\d+)/) || [])[1]) || null;
        out.emailValue = await page.getByLabel(/^Email address/).inputValue().catch(() => null);
        out.controls = await controls(page);
        return out;
    };

    /** A typed address: the status, where it lands and what it shows. */
    const visit = async (page, who, path, key) => {
        apiKey = key;
        const resp = await page.goto(path).catch((e) => ({error: e.message}));
        await idle(page);
        await sleep(300);
        const s = await snap(page, key);
        apiKey = null;
        const h = await page.locator('main h1, main h2, h1').allInnerTexts().catch(() => []);
        const out = {who, path, status: resp && resp.status ? resp.status() : resp && resp.error, url: s.url.replace(/^https?:\/\/[^/]+/, ''),
            title: s.title, headings: h.map((x) => flat(x, 120)).slice(0, 6), main: flat(s.text.main, 700),
            api: apiLog[key] || []};
        out.wizard = (await page.getByRole('heading', {name: /Search User|Enter details/}).count()) > 0;
        out.emailValue = out.wizard ? await page.getByLabel(/^Email address/).inputValue().catch(() => null) : null;
        out.inviteButton = await page.getByRole('button', {name: 'Invite to a role'}).count();
        if (out.wizard) out.controls = await controls(page);
        return out;
    };

    // ── 5. The roster on publicknowledge (read-only), and create-address controls ──
    if (PHASE === 'roster') {
        const ctx = app.contextPath;
        const {page, close} = await launch(app);
        watch(page);
        const roster = [
            ['admin', 'admin'], ['manager', 'manager.maya'], ['editor', 'editor.diana'],
            ['sectionEditor', 'sectioneditor.ana'], ['assistant', 'assistant.rita'], ['copyeditor', 'copyeditor.carla'],
            ['author', 'author.alex'], ['reviewer', 'reviewer.julia'], ['reader', 'reader.rosa'],
        ];
        facts.roster = {};
        try {
            for (const [k, user] of roster) {
                await step(`roster-${k}`, async () => {
                    await signIn(page, user);
                    facts.roster[k] = {
                        access: await visit(page, user, `/index.php/${ctx}/management/settings/access`, `p5-${k}-access`),
                        create: await visit(page, user, `/index.php/${ctx}/invitation/create/userRoleAssignment`, `p5-${k}-create`),
                    };
                });
            }
            await step('createControls', async () => {
                await signIn(page, 'manager.maya');
                facts.createControls = {
                    unknownType: await visit(page, 'manager.maya', `/index.php/${ctx}/invitation/create/nosuchtype`, 'p5-mgr-create-unknown-type'),
                    noType: await visit(page, 'manager.maya', `/index.php/${ctx}/invitation/create`, 'p5-mgr-create-no-type'),
                };
            });
        } finally {
            save();
            await close();
        }
        return;
    }

    // ── Seed ─────────────────────────────────────────────────────────────
    const seedA = await app.api.createContext({tag: A, context: {name: `U06 S02 A ${A}`, acronym: 'S2A'},
        roles: {editor: {permitSettings: false}},
        users: [
            {username: u('mgr'), roles: ['manager']},
            {username: u('edn'), roles: ['editor']},
            {username: u('pe'), roles: ['productionEditor']},
            {username: u('se'), roles: ['sectionEditor']},
            {username: u('as'), roles: ['funding']},
            {username: u('au'), roles: ['author']},
            {username: u('rv'), roles: ['externalReviewer']},
            {username: u('rd'), roles: ['reader']},
            {username: u('mab'), roles: ['manager']},
        ]});
    const seedB = await app.api.createContext({tag: B, context: {name: `U06 S02 B ${B}`, acronym: 'S2B'},
        users: [
            {username: `mgr${B}`, roles: ['manager']},
            {username: u('mab'), roles: ['manager']},
        ]});
    facts.contexts = {A, B, seededA: (seedA.users || []).map((x) => x.username), seededB: (seedB.users || []).map((x) => x.username)};
    save();

    const {page, close} = await launch(app);
    watch(page);
    const leaveDialogs = [];
    try {
        // ── 1. The unchanged path: a manager sends and reopens ─────────────
        await signIn(page, u('mgr'));
        await step('mgrSendA', async () => {
            facts.mgrSendA = await sendFromButton(page, A, {to: rcpt('a'), marker: `Inv${T}a`, key: 'p1-mgr-send-a'});
            await loc(page, 'Users & Roles: "Invite to a role"', page.getByRole('button', {name: 'Invite to a role'}));
        });
        await step('mgrEditA', async () => {
            facts.mgrEditA = await openEditFromRow(page, A, {to: rcpt('a'), key: 'p1-mgr-edit-a'});
            // Left once with a field changed, unsaved, by the breadcrumb.
            const given = page.getByLabel(/^Given Name/).first();
            const out = {};
            out.givenBefore = await given.inputValue().catch(() => null);
            out.givenEditable = await given.isEditable().catch(() => null);
            if (out.givenEditable) {
                await given.fill('Changedname');
                await given.blur();
            }
            const handler = async (d) => {
                leaveDialogs.push({type: d.type(), message: d.message()});
                await d.accept().catch(() => {});
            };
            page.on('dialog', handler);
            const crumb = page.getByRole('link', {name: 'Users & Roles'});
            out.breadcrumbCount = await crumb.count();
            if (out.breadcrumbCount) {
                await crumb.first().click();
            } else {
                await page.goto(`/index.php/${A}/management/settings/access`);
            }
            await page.waitForURL(/management\/settings\/access/, {timeout: 30_000}).catch(() => {});
            await idle(page);
            page.off('dialog', handler);
            out.leaveDialogs = [...leaveDialogs];
            out.landed = page.url().replace(/^https?:\/\/[^/]+/, '');
            await snap(page, 'p1-mgr-edit-a-03-left');
            out.rowAfterLeave = (await invitationsTable(page).locator('tbody tr').filter({hasText: rcpt('a')}).allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
            facts.mgrEditA.leave = out;
        });

        await signIn(page, `mgr${B}`);
        await step('mgrSendB', async () => {
            facts.mgrSendB = await sendFromButton(page, B, {to: rcpt('b'), marker: `Inv${T}b`, key: 'p1-mgrb-send-b'});
        });
        await step('mgrEditB', async () => {
            facts.mgrEditB = await openEditFromRow(page, B, {to: rcpt('b'), key: 'p1-mgrb-edit-b'});
        });
        const idA = facts.mgrEditA && facts.mgrEditA.id;
        const idB = facts.mgrEditB && facts.mgrEditB.id;
        facts.ids = {idA, idB};
        save();

        // ── 2. The Site Administrator, from the screen ────────────────────
        await signIn(page, 'admin');
        await step('adminButton', async () => {
            const out = {};
            await gotoAccess(page, A);
            await snap(page, 'p2-admin-users-roles');
            out.inviteButtons = await page.getByRole('button', {name: 'Invite to a role'}).count();
            await page.getByRole('button', {name: 'Invite to a role'}).click();
            await expect(page.getByRole('heading', {name: /Search User/})).toBeVisible({timeout: 30_000});
            const s = await snap(page, 'p2-admin-wizard-search');
            out.url = s.url.replace(/^https?:\/\/[^/]+/, '');
            out.controls = await controls(page);
            facts.adminButton = out;
        });
        await step('adminEditA', async () => {
            facts.adminEditA = await openEditFromRow(page, A, {to: rcpt('a'), key: 'p2-admin-edit-a'});
        });

        // ── 3. Typed addresses, one account per permission level ──────────
        const create = (ctx) => `/index.php/${ctx}/invitation/create/userRoleAssignment`;
        const edit = (ctx, id) => `/index.php/${ctx}/invitation/edit/${id}`;
        const access = (ctx) => `/index.php/${ctx}/management/settings/access`;
        const levels = [
            ['admin', 'admin'], ['mgr', u('mgr')], ['edn', u('edn')], ['pe', u('pe')], ['se', u('se')],
            ['as', u('as')], ['au', u('au')], ['rv', u('rv')], ['rd', u('rd')],
        ];
        facts.matrix = {};
        for (const [k, user] of levels) {
            await step(`matrix-${k}`, async () => {
                await signIn(page, user);
                const m = {};
                m.access = await visit(page, user, access(A), `p3-${k}-access`);
                m.create = await visit(page, user, create(A), `p3-${k}-create`);
                m.edit = idA ? await visit(page, user, edit(A, idA), `p3-${k}-edit-a`) : 'no idA';
                facts.matrix[k] = m;
            });
        }

        // ── 4. Another journal's invitation ──────────────────────────────
        facts.cross = {};
        const crossFor = [
            ['mgr', u('mgr'), [['A-idB', edit(A, idB)], ['B-idB', edit(B, idB)]]],
            ['mab', u('mab'), [['A-idB', edit(A, idB)], ['B-idB', edit(B, idB)], ['B-idA', edit(B, idA)], ['A-idA', edit(A, idA)]]],
            ['admin', 'admin', [['A-idB', edit(A, idB)], ['B-idB', edit(B, idB)]]],
        ];
        for (const [k, user, paths] of crossFor) {
            await step(`cross-${k}`, async () => {
                await signIn(page, user);
                facts.cross[k] = {};
                for (const [pk, p] of paths) {
                    facts.cross[k][pk] = await visit(page, user, p, `p4-${k}-${pk}`);
                }
            });
        }
        await step('controls', async () => {
            await signIn(page, u('mgr'));
            facts.controlsVisits = {
                missing: await visit(page, u('mgr'), edit(A, 99999999), 'p4-mgr-missing-id'),
                nonNumeric: await visit(page, u('mgr'), edit(A, 'abc'), 'p4-mgr-nonnumeric-id'),
            };
        });
        await signOut(page);
        await step('signedOut', async () => {
            facts.signedOut = {
                create: await visit(page, 'signed out', create(A), 'p4-signedout-create'),
            };
        });
    } finally {
        save();
        await close();
    }
});
