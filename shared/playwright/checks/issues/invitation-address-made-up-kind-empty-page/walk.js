// Kept walk for docs/issues/U06-A12-invitation-address-made-up-kind-empty-page.md (spec U06, register A12).
// On PKP's default test dataset (a dataset fleet): rvaca opens "Invite to a role" from Users & Roles,
// then types the wizard's address with its last word replaced: a made-up word ("nosuchtype"), the
// name of an invitation kind that has no wizard ("reviewerAccess"), and (control) no last word. Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/invitation-address-made-up-kind-empty-page/walk.js
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: "Invite to a role" still opens
// the wizard, a user's "Edit" still opens their roles page, and an "Edit Invitation" address with a
// number no invitation has still answers "404 Not Found".
const {forEachApp, launch, signIn, idle, screen, record, shot, note, serverLog} = require('../../../probe');

const MODE = process.env.WALK_MODE || 'steps';
const flat = (s, n = 600) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** One step, recorded; a failure is recorded, never thrown, so the walk goes on. */
async function step(facts, key, fn) {
    try {
        facts[key] = await fn();
    } catch (e) {
        facts[key] = {error: flat(e.message, 400)};
        note(`U06 A12 walk: step ${key} failed: ${flat(e.message, 200)}`);
    }
    return facts[key];
}

/** Type an address into the bar (a goto) and read what answers: status, title, page text, new log lines. */
async function typeAddress(page, app, key, url) {
    const log = serverLog(app);
    const from = log.mark();
    const resp = await page.goto(url);
    await idle(page);
    const s = await screen(page);
    record(key, s);
    await shot(page, key);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const h = await page.getByRole('heading').allInnerTexts().catch(() => []);
    return {
        url,
        status: resp ? resp.status() : null,
        title: await page.title(),
        headings: h.map((x) => flat(x, 120)).slice(0, 6),
        bodyLength: bodyText.trim().length,
        body: flat(bodyText, 300),
        log: log.since(from).map((l) => flat(l, 400)).slice(0, 6),
    };
}

forEachApp(async (app) => {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    const {page} = await launch(app);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const users = new UsersListPage(page, app.contextPath);
    await signIn(page, 'rvaca');

    const openWizard = async (key) => {
        await users.goto();
        await idle(page);
        await page.getByRole('button', {name: 'Invite to a role'}).click();
        await page.waitForURL(/\/invitation\/create\//, {timeout: 30_000});
        await idle(page);
        const s = await screen(page);
        record(key, s);
        await shot(page, key);
        return {
            url: page.url(),
            title: await page.title(),
            searchBox: await page.getByLabel(/Search for a user by email address/).count(),
        };
    };

    if (MODE === 'neighbour') {
        await step(facts, 'n1-invite-button', () => openWizard('n1-invite-button'));
        await step(facts, 'n2-user-edit', async () => {
            await users.goto();
            await idle(page);
            const row = users.row('dbarnes@mailinator.com').first();
            const labels = await users.menuLabels(row);
            await users.chooseAction(row, 'Edit');
            await page.waitForURL(/editUser|invitation/, {timeout: 30_000}).catch(() => {});
            await idle(page);
            const s = await screen(page);
            record('n2-user-edit', s);
            await shot(page, 'n2-user-edit');
            return {labels, url: page.url(), title: await page.title(), main: flat(s.text && s.text.main, 300)};
        });
        await step(facts, 'n3-edit-no-such-invitation', async () => {
            const base = page.url().replace(/\/management\/.*$|\/invitation\/.*$/, '');
            return typeAddress(page, app, 'n3-edit-no-such-invitation', `${base}/invitation/edit/999999`);
        });
        record('summary', facts);
        return;
    }

    const s2 = await step(facts, 's2-invite-to-a-role', () => openWizard('s2-invite-to-a-role'));
    const wizardUrl = s2 && s2.url;
    if (wizardUrl && /\/invitation\/create\/userRoleAssignment/.test(wizardUrl)) {
        const swap = (w) => wizardUrl.replace(/\/userRoleAssignment(?=[?#]|$)/, w === null ? '' : `/${w}`);
        await step(facts, 's3-made-up-word', () => typeAddress(page, app, 's3-made-up-word', swap('nosuchtype')));
        await step(facts, 's4-kind-without-wizard', () => typeAddress(page, app, 's4-kind-without-wizard', swap('reviewerAccess')));
        await step(facts, 's5-no-last-word', () => typeAddress(page, app, 's5-no-last-word', swap(null)));
    } else {
        note(`U06 A12 walk: ${app.name}: the wizard's address was not the expected one: ${wizardUrl}`);
    }
    record('summary', facts);
});
