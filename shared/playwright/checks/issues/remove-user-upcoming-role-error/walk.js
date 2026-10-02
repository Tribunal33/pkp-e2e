// U53 A19 walk (issue report docs/issues/U53-A19-remove-user-upcoming-role-error.md).
// On PKP's default test dataset, as `rvaca` (the context's manager), Settings > Users & Roles:
//   steps (default): an author (OJS amwandenga, OMP aclark, OPS ccorino) is invited from their
//     row's "Edit" › "Add Another Role" to the section editor role (Series editor, Moderator)
//     starting 2027-06-01 and accepts from the email; then the author's row: "Remove User" › "OK"
//     (the answer, the row after it); "Remove User" › "OK" again when still offered; a reload;
//     the roles page ("Edit") and its "Remove Role" on the upcoming role. The stored assignments
//     are read after each stage.
//   nb (neighbour, alone): N1 the same invitation, then on the roles page "Remove Role" on the
//     upcoming role while the author still holds Author and Reader; N2 "Remove User" › "OK" on
//     a second author who holds current roles only (OJS ccorino, OMP afinkel, OPS ckwantes).
// Each step records what it finds and goes on: with the fix in, an action may be absent.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/remove-user-upcoming-role-error/walk.js [nb]
// 3.5:          PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<line feature> PROBE_AGENT=<id> node bin/probe.js all …/walk.js
// Facts: .reports/<feature>/<id>/a19-walk[-<run>]-<app>.json (steps) or a19-nb[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const H = require('./lib.js');

const mode = process.argv[2] === 'nb' ? 'nb' : 'steps';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode, user: c.user, role: c.role, start: H.FUTURE};
    const name = mode === 'nb' ? 'a19-nb' : 'a19-walk';
    const {page, close} = await launch(app);
    try {
        // Preconditions: the upcoming role, invited and accepted
        await signIn(page, 'rvaca');
        let list = await H.openList(page, app);
        facts.invite = await H.inviteUpcoming(page, app, list, c);
        facts.storedAfterInvite = H.assignments(app, c.user);

        await signIn(page, 'rvaca');
        list = await H.openList(page, app);
        let row = await H.findRow(page, list, c.search, H.email(c.user));
        facts.before = await H.rowFacts(list, row);
        record('01-row-before', await screen(page));

        if (mode === 'steps') {
            // "Remove User" › "OK"
            if (facts.before.menu.includes('Remove User')) {
                facts.remove1 = await H.removeUser(page, list, row);
                facts.storedAfterRemove1 = H.assignments(app, c.user);
                list = await H.openList(page, app);
                row = await H.findRow(page, list, c.search, H.email(c.user));
                facts.afterRemove1 = await H.rowFacts(list, row);
                record('02-row-after-first-remove', await screen(page));
            } else facts.remove1 = 'not offered';

            // "Remove User" › "OK" again, while offered
            if (facts.afterRemove1 && facts.afterRemove1.menu.includes('Remove User')) {
                facts.remove2 = await H.removeUser(page, list, row);
                record('03-after-second-remove', await screen(page));
                await shot(page, '03-after-second-remove');
                facts.storedAfterRemove2 = H.assignments(app, c.user);
            } else facts.remove2 = 'not offered';

            // reload
            list = await H.openList(page, app);
            row = await H.findRow(page, list, c.search, H.email(c.user));
            facts.afterReload = await H.rowFacts(list, row);

            // the roles page and its "Remove Role" on the upcoming role
            facts.rolesPage = await H.rolesPage(page, list, row);
            record('04-roles-page', await screen(page));
            facts.removeRole = await H.removeRole(page, c.role);
            record('05-roles-page-after-remove-role', await screen(page));
            facts.storedAtEnd = H.assignments(app, c.user);
        } else {
            // N1. "Remove Role" on the upcoming role while Author and Reader are held
            facts.n1 = {rolesPage: await H.rolesPage(page, list, row)};
            facts.n1.removeRole = await H.removeRole(page, c.role);
            facts.n1.stored = H.assignments(app, c.user);
            record('n1-roles-page', await screen(page));

            // N2. "Remove User" on an author with current roles only
            list = await H.openList(page, app);
            row = await H.findRow(page, list, c.other.search, H.email(c.other.user));
            facts.n2 = {before: await H.rowFacts(list, row), storedBefore: H.assignments(app, c.other.user)};
            if (facts.n2.before.menu.includes('Remove User')) {
                facts.n2.remove = await H.removeUser(page, list, row);
                list = await H.openList(page, app);
                row = await H.findRow(page, list, c.other.search, H.email(c.other.user));
                facts.n2.after = await H.rowFacts(list, row);
            }
            facts.n2.stored = H.assignments(app, c.other.user);
            record('n2-other-author', await screen(page));
        }
        record(name, facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record(name, facts);
        throw error;
    } finally {
        await close();
    }
});
