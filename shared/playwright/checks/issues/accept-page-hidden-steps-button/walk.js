// Kept walk of issue report docs/issues/U06-A7-accept-page-hidden-steps-button.md (U06 A7).
// On PKP's default test dataset: as `rvaca`, Settings > Users & Roles > "Invite to a role" for
// dbuskins@mailinator.com (Author, today, "Does not appear on the masthead"), sent; in a
// signed-out browser the email's accept link ("Review & create account", one step): Tab from the
// top of the page, each stop; Enter on the invisible one.
//
// `neighbour` as argument walks only the neighbour instead, as `dbarnes`:
// - the same component on a one-step editorial decision page ("Decline Submission" on OJS 4,
//   OMP 3, OPS 1): Tab from the top, each stop (the reach: the fix must take this stop away too);
// - a decision page of more than one step ("Send for Review" on OJS 4, "Send to Internal Review"
//   on OMP 3; OPS has none) loaded at 1440 pixels and narrowed to 375: the row must still collapse
//   to "1/n steps" with its "Show all steps" button, which the fix must leave alone.
//
// Reset first:  npm run fleet-prep -- --feature issues-u06h --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u06h PROBE_AGENT=u06h node bin/probe.js all shared/playwright/checks/issues/accept-page-hidden-steps-button/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u06h-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, screen, record, shot, serverLog} = require('../../../probe');
const H = require('../invitation-wizard-typos/lib.js');

// Every record's name starts with 'hidden-', so the A7 walks run by one agent keep apart.
const P = 'hidden-';
const neighbour = process.argv.slice(2).includes('neighbour');
const MULTI = {ojs: 'Send for Review', omp: 'Send to Internal Review', ops: null};

/** Tab to the first stop inside the steps' controls (if any), press Enter; what changed. */
async function enterOnHidden(page, stops) {
    const i = stops.findIndex((s) => s.insideAriaHidden);
    if (i < 0) return {found: false};
    const before = await H.stepsFacts(page);
    const textBefore = H.flat((await screen(page)).text.main, 1500);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.mouse.click(1, 1);
    for (let k = 0; k <= i; k++) await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => (document.activeElement.textContent || '').replace(/\s+/g, ' ').trim());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    const after = await H.stepsFacts(page);
    const textAfter = H.flat((await screen(page)).text.main, 1500);
    return {found: true, stop: i + 1, focused, before, after, textChanged: textBefore !== textAfter, url: page.url().replace(/^https?:\/\/[^/]+/, '')};
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: neighbour ? 'neighbour' : 'walk'};
    const log = serverLog(app);
    const from = log.mark();
    const manager = await launch(app);
    try {
        const page = manager.page;
        if (neighbour) {
            await signIn(page, 'dbarnes');
            await H.openWorkflow(page, app, H.DECISION[app.name].submissionId);
            await H.openDecision(page, 'Decline Submission');
            record(P + 'nb-decision-one-step', await screen(page));
            facts.oneStep = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), steps: await H.stepsFacts(page)};
            facts.oneStep.tabs = (await H.tabStops(page, 30)).filter((t) => t.insideAriaHidden || /steps|Notify/.test(t.text || ''));
            const name = MULTI[app.name];
            if (!name) {
                facts.multi = 'no decision of more than one step on this app';
            } else {
                await page.setViewportSize({width: 1440, height: 900});
                await H.openWorkflow(page, app, H.DECISION[app.name].submissionId);
                await H.openDecision(page, name);
                facts.wide = await H.stepsFacts(page);
                await page.setViewportSize({width: 375, height: 800});
                await page.waitForTimeout(2000);
                facts.narrow = await H.stepsFacts(page);
                record(P + 'nb-decision-375', await screen(page));
                await shot(page, P + 'nb-decision-375');
            }
        } else {
            await signIn(page, 'rvaca');
            const since = new Date();
            facts.sent = await H.sendInvitation(page, app, {email: H.PERSON.email, role: 'Author', masthead: 'Does not appear on the masthead'});
            const mail = await H.invitationMail(app, H.PERSON.email, since);
            const r = await launch(app);
            try {
                await H.openAccept(r.page, mail.accept);
                record(P + '01-accept-page', await screen(r.page));
                await shot(r.page, P + '01-accept-page');
                facts.accept = {steps: await H.stepsFacts(r.page)};
                facts.accept.tabs = await H.tabStops(r.page, 8);
                facts.accept.enter = await enterOnHidden(r.page, facts.accept.tabs);
            } finally {
                await r.close();
            }
        }
        facts.serverLog = log.since(from);
        record(P + (neighbour ? 'neighbour' : 'walk'), facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        facts.serverLog = log.since(from);
        record(P + (neighbour ? 'neighbour' : 'walk'), facts);
        throw error;
    } finally {
        await manager.close();
    }
});
