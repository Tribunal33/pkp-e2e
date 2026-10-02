// Kept walk of issue report docs/issues/U06-A8-invitation-role-rows-unnamed.md (U06 A8).
// On PKP's default test dataset, as `rvaca`: Settings > Users & Roles, "Invite to a role" for an
// address with no account, "Search User", "Add Another Role"; the two role rows read field by
// field (ids, the labels the browser ties to each field, the names a screen reader is given,
// each field focused in turn), then row 2's "Start Date" label clicked. Then the users list's
// Edit on a member holding Author and Reader (OJS and OPS: Carlo Corino; OMP: Arthur Clark):
// the same reads of his current roles' masthead selects and the row to add a role.
//
// `neighbour` as argument walks only the neighbour check instead: an invitation to a second
// newcomer with two roles filled in and sent; the search box's and the step's other fields' ids,
// the "Invitation Sent" text and the Invitations table's row (both roles listed).
//
// Reset first:  npm run fleet-prep -- --feature issues-u06e --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u06e PROBE_AGENT=u06e node bin/probe.js all shared/playwright/checks/issues/invitation-role-rows-unnamed/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u06e-3_5), PROBE_RUN=r35
// Facts: .reports/<feature>/u06e/walk[-<run>]-<app>.json (neighbour: neighbour[-<run>]-<app>.json)
const {forEachApp, launch, signIn, record, screen, shot, idle, serverLog} = require('../../../probe');
const H = require('./lib.js');

const neighbour = process.argv.slice(2).includes('neighbour');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, neighbour};
    const log = serverLog(app);
    const mark = log.mark();
    const name = neighbour ? 'neighbour' : 'walk';
    const save = () => record(name, facts);
    const {page, close} = await launch(app);
    try {
        await signIn(page, H.INVITER);
        const list = H.usersList(page, app);
        await list.goto();
        await idle(page);
        if (neighbour) {
            facts.searchBox = await H.searchInWizard(page, H.NB_NEWCOMER);
            facts.email = await page.getByRole('textbox', {name: /^Email address/}).first().evaluate((el) => ({id: el.id, labels: [...(el.labels || [])].map((l) => l.innerText.replace(/\s+/g, ' ').trim())})).catch((e) => `ERR ${e.message}`);
            await H.addAnotherRole(page, 2);
            facts.roles = [await H.fillRow(page, 0)];
            facts.roles.push(await H.fillRow(page, 1, facts.roles[0]));
            facts.tableFilled = await H.readTable(page);
            save();
            facts.sent = await H.send(page);
            save();
            await list.goto();
            await idle(page);
            const row = list.invitationRow(H.NB_NEWCOMER);
            facts.invitationRow = (await row.count()) ? H.flat(await row.first().innerText(), 400) : null;
            record('nb-01-users', await screen(page));
        } else {
            // Inviting a newcomer to two roles (steps 1-7)
            facts.searchBox = await H.searchInWizard(page, H.NEWCOMER);
            facts.oneRow = await H.readTable(page);
            await H.addAnotherRole(page, 2);
            facts.twoRows = await H.readTable(page);
            facts.twoRowsFocus = await H.namesByFocus(page);
            record('01-two-role-rows', await screen(page));
            await shot(page, '01-two-role-rows');
            facts.labelClick = await H.clickLabel(page, 2, 'Start Date');
            save();
            // Changing an existing member's roles (steps 8-9)
            facts.edit = await H.openEdit(page, app, c.member);
            facts.editTable = await H.readTable(page);
            facts.editFocus = await H.namesByFocus(page);
            facts.editLabelClick = await H.clickLabel(page, 2, c.masthead);
            record('02-edit-member', await screen(page));
            await shot(page, '02-edit-member');
        }
    } catch (e) {
        facts.error = String(e.stack || e).slice(0, 1500);
        await shot(page, `${name}-error`).catch(() => {});
    } finally {
        facts.serverLog = log.since(mark);
        save();
        await close();
    }
});
