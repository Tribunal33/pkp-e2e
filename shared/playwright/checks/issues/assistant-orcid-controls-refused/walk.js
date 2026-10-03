// Kept walk for docs/issues/U04-A5-assistant-orcid-controls-refused.md and
// docs/issues/U04-A5-orcid-field-refusal-shown-as-done.md (spec U04, register A5).
// On PKP's default test dataset (a dataset fleet), OJS, OMP and OPS: dbarnes turns ORCID on (Member
// Sandbox, dummy credentials) and lets the submission's Assistant edit the publication (the
// participant's "Permissions" box; on OPS first giving "Editorial Board Member" the Production stage
// and inviting a newcomer to it). The Assistant opens the contributor and presses "Request
// verification" › "Yes", closes the form and presses "Edit" again; then, once the contributor holds a verified iD (the one precondition only
// ORCID's sign-in creates, written by SQL as VerifyIdentityWithOrcid stores it), "Delete" › "Yes" and the same reopening;
// each followed by a reload. Control: the same Assistant adds a contributor with "Request
// verification". Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/assistant-orcid-controls-refused/walk.js
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: dbarnes (a manager-level
// editor, allowed before and after any fix) requests verification and deletes the iD on the same
// contributor; both must keep working, and a refusal must not appear.
// Each step records what it saw and never throws, so a fix's state is recorded, not fatal.
const {forEachApp, launch, signIn, record, note, screen, shot} = require('../../../probe');
const K = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    const c = K.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id, contributor: c.contributor};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: K.flat(e.message, 400)};
            note(`U04 A5 walk (${app.name}, ${facts.line}, ${MODE}): step ${key} failed: ${K.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const {page} = await launch(app);
    await signIn(page, 'dbarnes');
    await step('p1-orcid-on', () => K.enableOrcid(page, app));

    const actor = MODE === 'neighbour' ? 'dbarnes' : c.assistant;
    if (MODE !== 'neighbour') {
        if (c.newcomer) {
            await step('p2a-role-stage', () => K.roleTakesProduction(page, app, c.role));
            await step('p2b-newcomer', () => K.newcomerJoins(page, app, c.role, launch));
            await step('p2c-assign', () => K.assign(page, app, c));
        } else {
            await step('p2-permissions', () => K.grantPermissions(page, app, c));
        }
        await signIn(page, actor);
    }
    facts.actor = actor;

    // Requesting verification (steps 1–6)
    let since = new Date();
    await step('s3-open', async () => {
        const list = await K.openContributors(page, app, c);
        const {field} = await K.openContributor(page, c.contributor);
        const shown = await K.fieldState(field);
        await shot(page, `a5-${MODE}-s3-field`);
        return {list, field: shown};
    });
    await step('s4-request', async () => {
        // the side window is left open from step 3; the field is pressed there
        const field = page.locator('[data-cy="active-modal"] .pkpFormField').filter({hasText: 'ORCID iD'}).first();
        since = new Date();
        const out = await K.pressAndConfirm(page, field, 'Request verification', '/orcid/requestAuthorVerification/');
        await shot(page, `a5-${MODE}-s4-after-request`);
        out.screen = (await screen(page)).notices;
        return out;
    });
    await step('s4b-reopen', async () => {
        const out = await K.reopenContributor(page, c.contributor);
        await shot(page, `a5-${MODE}-s4b-reopened`);
        return out;
    });
    await step('s5-reload', async () => {
        await page.goto('about:blank');
        await K.openContributors(page, app, c);
        const {field, modal} = await K.openContributor(page, c.contributor);
        const out = await K.fieldState(field);
        await shot(page, `a5-${MODE}-s5-reloaded`);
        await K.closeContributor(page, modal);
        return out;
    });
    await step('s6-mail', () => K.mailTo(app, c.email, since));
    facts['s6-stored'] = K.stored(app, c);

    // Deleting the iD (steps 7–9), after the SQL precondition
    await step('p3-verified-id', async () => K.verifiedId(app, c));
    await step('s7-open', async () => {
        await page.goto('about:blank');
        await K.openContributors(page, app, c);
        const {field} = await K.openContributor(page, c.contributor);
        return K.fieldState(field);
    });
    await step('s8-delete', async () => {
        const field = page.locator('[data-cy="active-modal"] .pkpFormField').filter({hasText: 'ORCID iD'}).first();
        const out = await K.pressAndConfirm(page, field, 'Delete', '/orcid/deleteForAuthor/');
        await shot(page, `a5-${MODE}-s8-after-delete`);
        return out;
    });
    await step('s8b-reopen', async () => {
        const out = await K.reopenContributor(page, c.contributor);
        await shot(page, `a5-${MODE}-s8b-reopened`);
        return out;
    });
    await step('s9-reload', async () => {
        await page.goto('about:blank');
        await K.openContributors(page, app, c);
        const {field, modal} = await K.openContributor(page, c.contributor);
        const out = await K.fieldState(field);
        await shot(page, `a5-${MODE}-s9-reloaded`);
        await K.closeContributor(page, modal);
        return out;
    });
    facts['s9-stored'] = K.stored(app, c);

    if (MODE === 'neighbour' && app.name === 'ops') {
        // The preprint's own author (pkp-lib#11505's case) resends the request from their dashboard.
        await step('n-author-resend', async () => {
            await signIn(page, 'ccorino');
            await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/mySubmissions?workflowSubmissionId=${c.id}`));
            await page.getByRole('link', {name: 'Contributors', exact: true}).first().click();
            await page.locator('.listPanel__item').first().waitFor({timeout: K.T});
            const {field} = await K.openContributor(page, c.contributor);
            const before = await K.fieldState(field);
            const name = before.buttons.find((b) => /Resend/.test(b)) || 'Request verification';
            const out = await K.pressAndConfirm(page, field, name, '/orcid/requestAuthorVerification/');
            await shot(page, `a5-${MODE}-author-resend`);
            return {before, ...out};
        });
    }

    if (MODE !== 'neighbour') {
        // Control: the same Assistant adds a contributor with "Request verification"
        const added = new Date();
        await step('c1-add-with-request', async () => {
            await page.goto('about:blank');
            await K.openContributors(page, app, c);
            return K.addWithRequest(page, app);
        });
        await step('c1-mail', () => K.mailTo(app, K.ADDED.email, added, 20_000));
    }
    record(MODE === 'neighbour' ? 'a5-neighbour' : 'a5-walk', facts);
});
