// U02 OPS1 walk (issue report docs/issues/U02-OPS1-server-site-register-asks-reviewing-interests.md).
// On PKP's default test dataset: a visitor, signed out, opens the site-wide Register page by its
// address, reads the context's block and the "If you requested to be a reviewer…" prompt, ticks
// "Reader" and the privacy line, types "ethics, statistics" into the prompt's box and presses
// "Register"; then opens the context's Profile › "Roles"; then `admin` opens Settings ›
// "Users & Roles", finds the newcomer and chooses "Edit". OPS shows the fault; OJS and OMP are
// the control (their blocks offer a reviewer role).
// Modes (the argument after the script; each runs alone, from a freshly reset dataset):
//   walk       (default) the steps above
//   neighbour  OJS, OMP: the site-wide page with the context's reviewer box ticked and the
//              interests typed: the prompt stays and the Roles tab lists the interests.
//              OPS: the server's own Register page: no interests box (must stay so).
//   PROBE_FEATURE=issues-u02g PROBE_AGENT=u02g node bin/probe.js all shared/playwright/checks/issues/server-site-register-asks-reviewing-interests/walk.js [walk|neighbour]
const {forEachApp, launch, signIn, signOut, screen, record, serverLog} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const INTERESTS = 'ethics, statistics';
const who = (username, email) => ({
    givenName: 'u02g',
    familyName: 'Visitor',
    affiliation: 'u02g',
    country: 'Canada',
    email,
    username,
    password: `${username}${username}`,
});

/** Run a step, recording its error instead of throwing, so the state a fix brings is read too. */
async function step(facts, name, fn) {
    try {
        facts.steps[name] = await fn();
    } catch (e) {
        facts.steps[name] = {error: String(e && e.message ? e.message : e).split('\n')[0]};
    }
    return facts.steps[name];
}

/** Steps 1-6 on the site-wide page: read it, fill, tick, type the interests (when a box is there), register. */
async function siteRegister(page, app, facts, tag, person, {reviewer}) {
    const ctxName = H.CONTEXT_NAME[app.name];
    await step(facts, `${tag}-open`, () => H.openRegister(page, app, null));
    await step(facts, `${tag}-page`, () => H.readRegister(page));
    record(`${tag}-1-site-register`, await screen(page));
    return step(facts, `${tag}-register`, async () => {
        await H.fillNewcomer(page, person);
        const block = H.contextBlock(page, ctxName);
        const reader = await H.tick(block.getByRole('checkbox', {name: 'Reader', exact: true}));
        const rev = reviewer ? await H.tick(block.locator('input[name^="reviewerGroup"]')) : null;
        const consent = await H.tick(block.locator('.context_privacy input[type="checkbox"]'));
        const box = H.siteInterestsBox(page);
        const typed = (await box.count()) ? (await box.fill(INTERESTS), true) : false;
        return {reader, reviewer: rev, consent, typed, ...(await H.pressRegister(page))};
    });
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, dataset: app.dataset, steps: {}};
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        if (MODE === 'walk') {
            // 1-6
            await siteRegister(page, app, facts, 'w', who('u02gvisitor', 'u02g.visitor@mailinator.com'), {reviewer: false});
            record('w-2-registered', await screen(page));
            // 7: the context's Profile › "Roles"
            await step(facts, 'w-roles', () => H.readRolesInterests(page, app.contextPath));
            record('w-3-roles', await screen(page));
            // 8: admin's Users & Roles › Edit
            await signOut(page);
            await step(facts, 'w-manager', async () => {
                await signIn(page, 'admin');
                return H.readManagerEdit(page, app, 'u02g.visitor', ['ethics', 'statistics']);
            });
            record('w-4-manager-edit', await screen(page));
        } else if (MODE === 'neighbour') {
            if (app.name === 'ops') {
                await step(facts, 'n-open', () => H.openRegister(page, app, app.contextPath));
                await step(facts, 'n-page', () => H.readRegister(page));
                record('n-1-server-register', await screen(page));
            } else {
                await siteRegister(page, app, facts, 'n', who('u02gnb', 'u02g.nb@mailinator.com'), {reviewer: true});
                record('n-2-registered', await screen(page));
                await step(facts, 'n-roles', () => H.readRolesInterests(page, app.contextPath));
                record('n-3-roles', await screen(page));
            }
        }
    } finally {
        facts.serverLog = log.since(from);
        record(`facts-${MODE}`, facts);
        await close();
    }
});
