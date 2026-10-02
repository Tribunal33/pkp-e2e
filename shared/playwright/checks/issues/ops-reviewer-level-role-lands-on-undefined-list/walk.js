// Kept walk of issue report docs/issues/U28-OPS1-ops-reviewer-level-role-lands-on-undefined-list.md
// (spec U28 register OPS1). On PKP's default test dataset (a dataset fleet), through the screens:
//   as `rvaca`: Settings > Users & Roles > "Roles" > "Create New Role" at the "Reviewer"
//     permission level ("Referee u28m", "REF"; on a journal or press its review stage boxes
//     ticked); "Invite to a role" for a dataset author (OJS, OPS `ccorino`; OMP `aclark`) and for
//     a newcomer (referee.u28m@mailinator.com, who will hold the role alone);
//   signed out, each accepts from the emailed link (the newcomer creates the account `refu28m`);
//   each signs in on the context's login page: where they land, the heading, the list, the
//     "Error" window, the side menu, the API answers and the console's errors;
//   on the landing page: the window's "OK", "Filters" > "Apply Filters", the side menu's
//     "My Assignments as Reviewer" and "My Submissions as Author"; the list's address typed.
// OPS is the finding; OJS and OMP are the controls. Every step records the state it finds (a
// window absent, a menu group gone) instead of throwing, so the same walk reads the fixed code.
//
// `neighbour` as argument walks only the neighbour check (read-only, the dataset's own roles):
// an installed reviewer (OJS `jjanssen`, OMP `phudson`) still lands on the reviewer list with its
// menu group; an Author (`ckwantes`; OMP `afinkel`) on "My Submissions", `dbuskins` on the
// editorial dashboard; the Author typing the reviewer list's address stays refused.
//
// Reset first:  npm run fleet-prep -- --feature issues-u28m --dataset <n> --reset
// Run (main):   PROBE_FEATURE=issues-u28m PROBE_AGENT=u28m node bin/probe.js all shared/playwright/checks/issues/ops-reviewer-level-role-lands-on-undefined-list/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u28m-3_5), PROBE_RUN=r35
// Fix trial:    node bin/try-fix.js apply shared/playwright/checks/issues/ops-reviewer-level-role-lands-on-undefined-list/fix.diff ojs omp ops
//               reset, PROBE_RUN=fix … walk.js; PROBE_RUN=nb-in … walk.js neighbour; then revert
// Facts: .reports/<feature>/u28m/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');
const U06 = require('../newcomer-not-signed-in-after-accepting/lib.js');
const U54 = require('../roles-list-order-moves-and-pages-repeat/lib.js');

const neighbourOnly = process.argv.slice(2).includes('neighbour');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const c = L.CASES[app.name];
    const base = `/index.php/${app.contextPath}/en`;
    const cu = (p) => app.url(`${base}${p}`);
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: neighbourOnly ? 'neighbour' : 'walk', errors: {}};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
        record('facts', facts);
    };
    const step = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            facts.errors[key] = String(e.stack || e).slice(0, 900);
            console.error(`[${app.name}] ${key} FAILED: ${e.message}`);
            record('facts', facts);
        }
    };
    let n = 0;
    const {page, close} = await launch(app);
    const traffic = L.watch(page, base);
    async function read(name) {
        const r = await L.readPage(page, base);
        record(`${String(++n).padStart(2, '0')}-${name}`, r.screen);
        return r.facts;
    }
    /** Sign in on the context's own login page and read where the account lands. */
    async function land(username, label) {
        traffic.take();
        await signIn(page, username, {contextPath: app.contextPath});
        await page.waitForLoadState('load').catch(() => {});
        const f = await read(`${label}-landing`);
        await shot(page, `${label}-landing`).catch(() => {});
        return Object.assign(f, traffic.take());
    }
    async function typed(label, path) {
        traffic.take();
        const r = await page.goto(cu(path)).catch(() => null);
        const f = await read(`${label}-typed-${path.replace(/\W+/g, '-')}`);
        return Object.assign({status: r ? r.status() : null}, f, traffic.take());
    }

    try {
        if (neighbourOnly) {
            // ---- neighbour: the roles the fix must leave alone (nothing is changed) ----
            if (c.reviewer) {
                await step('reviewer', async () => fact(`${c.reviewer} (installed reviewer) signs in`, await land(c.reviewer, c.reviewer)));
            }
            await step('author', async () => {
                fact(`${c.otherAuthor} (Author) signs in`, await land(c.otherAuthor, c.otherAuthor));
                fact(`${c.otherAuthor} types dashboard/reviewAssignments`, await typed(c.otherAuthor, '/dashboard/reviewAssignments'));
            });
            await step('editor', async () => fact(`${c.editor} signs in`, await land(c.editor, c.editor)));
            return;
        }

        // ---- steps 1-2: the manager creates the role ----
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        const tab = U54.rolesTab(page, app);
        await tab.goto();
        const win = await tab.openCreate();
        const levels = await win.levelOptions();
        await win.chooseLevel(L.ROLE.level);
        await L.pause(1500); // past the stage block's hide animation
        const boxes = {};
        for (const s of c.reviewStages) {
            const box = win.stageBox(s);
            boxes[s] = {before: await box.isChecked().catch(() => null), disabled: await box.isDisabled().catch(() => null)};
            if (boxes[s].before === false && !boxes[s].disabled) await box.check();
        }
        const stageBlockShown = await win.stageSection.isVisible().catch(() => null);
        await win.nameBox().fill(L.ROLE.name);
        await win.abbrevBox().fill(L.ROLE.abbrev);
        await read('role-window');
        const saved = await win.save();
        fact('role created', {levels, stageBlockShown, boxes, status: saved.status(), listed: (await tab.rowNames()).includes(L.ROLE.name)});

        // ---- steps 3 and 10: the invitations ----
        const since = new Date();
        const authorMail = U06.mailOf(c.author);
        fact('invite author', await L.invite(page, app, {email: authorMail, role: L.ROLE.name}));
        fact('invite newcomer', await L.invite(page, app, {email: L.NEWCOMER.email, givenName: L.NEWCOMER.givenName, familyName: L.NEWCOMER.familyName, role: L.ROLE.name}));
        const mails = {author: await U06.acceptLink(app, authorMail, since), newcomer: await U06.acceptLink(app, L.NEWCOMER.email, since)};
        fact('invitation emails', {author: mails.author.subject, newcomer: mails.newcomer.subject});
        await signOut(page);

        // ---- step 4: the author accepts, signed out ----
        await U06.openAccept(page, mails.author.accept);
        const a = await U06.acceptAndLeave(page);
        fact('author accepts', {button: a.acceptLabel, dialog: a.dialog, finalize: a.finalize});

        // ---- steps 5-9: the author signs in ----
        await step('author', async () => {
            const who = c.author;
            fact(`${who} signs in`, await land(who, who));
            const w = L.errorWindow(page);
            if (await w.count()) {
                traffic.take();
                await w.getByRole('button', {name: 'OK', exact: true}).click();
                await L.pause(800);
                fact(`${who} presses OK`, Object.assign(await read(`${who}-after-ok`), traffic.take()));
            } else {
                fact(`${who} presses OK`, 'no "Error" window to close');
            }
            const filters = page.locator('main').getByRole('button', {name: 'Filters', exact: true});
            if (await filters.count()) {
                await filters.first().click();
                const apply = page.getByRole('dialog').getByRole('button', {name: 'Apply Filters', exact: true});
                await apply.waitFor({timeout: L.T});
                traffic.take();
                await apply.click();
                await L.pause(1200);
                fact(`${who} Filters > Apply Filters`, Object.assign(await read(`${who}-filters-applied`), traffic.take()));
                await shot(page, `${who}-filters-applied`).catch(() => {});
                const again = L.errorWindow(page);
                if (await again.count()) await again.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                await page.keyboard.press('Escape').catch(() => {});
                await L.pause(600);
            } else {
                fact(`${who} Filters > Apply Filters`, 'no "Filters" button on the landing page');
            }
            const nav = page.getByRole('navigation', {name: 'Site Navigation'});
            for (const name of ['My Assignments as Reviewer', 'My Submissions as Author']) {
                const g = nav.getByText(name, {exact: true}).first();
                if (!(await g.count())) {
                    fact(`${who} presses "${name}"`, 'no such entry in the side menu');
                    continue;
                }
                const before = L.rel(page.url());
                traffic.take();
                await g.click();
                await L.pause(800);
                const menu = await L.sideMenu(page);
                // the group's first entry, when pressing the header opened any
                const sub = nav.locator(name.includes('Author') ? 'a[href*="mySubmissions"]' : 'a[href*="reviewAssignments"]');
                const subs = await sub.count();
                if (subs && name.includes('Author')) {
                    // pressing the header of a group that was open folds it: then the entry is not pressable
                    await sub.first().click({timeout: 5000}).catch(() => g.click().then(() => sub.first().click({timeout: 5000})).catch(() => {}));
                    await page.waitForLoadState('load').catch(() => {});
                }
                const f = await read(`${who}-menu-${name.includes('Author') ? 'author' : 'reviewer'}`);
                fact(`${who} presses "${name}"`, Object.assign({before, entriesUnderIt: subs, menu: menu.entries}, f, traffic.take()));
            }
            fact(`${who} types dashboard/reviewAssignments`, await typed(who, '/dashboard/reviewAssignments'));
            fact(`${who} types dashboard/mySubmissions`, await typed(who, '/dashboard/mySubmissions'));
        });
        await signOut(page).catch(() => {});

        // ---- step 11: the newcomer accepts, signed out, creating the account ----
        await step('newcomer', async () => {
            await U06.openAccept(page, mails.newcomer.accept);
            await L.newcomerSteps(page);
            const b = await U06.acceptAndLeave(page);
            fact('newcomer accepts', {button: b.acceptLabel, dialog: b.dialog, finalize: b.finalize});
            // ---- step 12 ----
            const who = L.NEWCOMER.username;
            fact(`${who} signs in`, await land(who, who));
            fact(`${who} types dashboard/reviewAssignments`, await typed(who, '/dashboard/reviewAssignments'));
            fact(`${who} types submissions`, await typed(who, '/submissions'));
        });
    } catch (err) {
        facts.errors.fatal = String(err.stack || err).slice(0, 1200);
        await shot(page, 'ERROR').catch(() => {});
        throw err;
    } finally {
        record('facts', facts);
        await idle(page).catch(() => {});
        await close();
    }
});
