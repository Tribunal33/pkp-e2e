// Issue report U04 A17: while the site-wide ORCID configuration is on, a journal manager's
// "Save" on the journal's (locked) ORCID tab also stores the journal's own "Enable ORCID
// functionality" as ticked, so once the site administrator unticks the site-wide box the
// journal keeps ORCID on with no Client ID. Steps: the report's "Steps to reproduce".
// Runs on PKP's default test dataset (a dataset fleet, reset before each walk).
//
//   MODE=steps (default)  steps 1–8: site-wide on (admin), City saved on the journal's
//                         locked tab (rvaca), site-wide off (admin), then the journal's tab,
//                         rvaca's Identity tab and the signed-out Register page, with the
//                         ORCID sign-in address the connect button opens.
//   MODE=reach            steps 1–6, then the contributor form's "Request verification" on
//                         submission 4 (OJS) and the email it sends.
//   MODE=nb               the neighbour: a journal that had its own ORCID on (rvaca ticks the
//                         box and saves its own Client ID first) keeps it on, with its own
//                         Client ID, through the same round (fix in and out).
//
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=h19a [MODE=nb] [PROBE_RUN=…] \
//     node bin/probe.js all shared/playwright/checks/issues/orcid-locked-tab-save-switches-journal-on/walk.js
//
// orcid.org is answered locally in the browser (shared/playwright/support/orcid.js): the popup
// is recorded by the address the app gave it.
const {forEachApp, launch, signIn, signOut, record, screen, shot, idle, loc, sql} = require('../../../probe');
const {stubOrcidSite, ORCID_SITE} = require('../../../support/orcid.js');
const L = require('./lib.js');

const MODE = process.env.MODE || 'steps';
const SITE_API = /\/index\/api\/v1\/site(\?|$)/;
const CONTEXT_API = /\/api\/v1\/contexts\/\d+(\?|$)/;
const SITE_CLIENT_ID = 'APP-H19A000000000000';
const JOURNAL_CLIENT_ID = 'APP-H19AJOURNAL00000';

/** Press the connect control and read the popup's address (ORCID stubbed). Never throws. */
async function connectAddress(page, control) {
    try {
        await stubOrcidSite(page.context());
        const [popup] = await Promise.all([page.waitForEvent('popup', {timeout: 15_000}), control.click()]);
        for (let i = 0; i < 40 && !ORCID_SITE.test(popup.url()); i++) await L.sleep(250);
        const a = popup.url();
        await popup.close().catch(() => {});
        return L.oauthParts(a);
    } catch (e) {
        return {error: L.flat(e.message, 300)};
    }
}

async function siteWide(page, app, on, F, key) {
    const panel = await L.openSiteOrcid(page, app);
    const box = panel.getByRole('checkbox', {name: 'Enable ORCID functionality site-wide'});
    if (on) {
        await loc(page, 'site: Enable ORCID functionality site-wide', box);
        await box.check();
        await L.sleep(300);
        await panel.locator('select[name="orcidApiType"]').selectOption({label: 'Public Sandbox'});
        await panel.locator('input[name="orcidClientId"]').fill(SITE_CLIENT_ID);
        await panel.locator('input[name="orcidClientSecret"]').fill('h19a-site-secret');
    } else if (await box.isChecked()) {
        await box.uncheck();
    }
    F[key] = {save: await L.pressSave(page, panel, SITE_API)};
    await shot(page, `a17-${MODE}-${key}`);
    F[key].siteRows = L.siteOrcidRows(app);
    F[key].journalRows = L.journalOrcidRows(app);
}

forEachApp(async (app) => {
    const F = {mode: MODE, line: app.line || 'main', dataset: app.dataset};
    const admin = await launch(app);
    const mgr = await launch(app);
    try {
        F.start = {siteRows: L.siteOrcidRows(app), journalRows: L.journalOrcidRows(app)};
        await signIn(admin.page, 'admin');
        await signIn(mgr.page, 'rvaca', {contextPath: app.contextPath});

        if (MODE === 'nb') {
            // the journal's own ORCID on, with its own pair, before the site-wide round
            const {panel} = await L.openJournalOrcid(mgr.page, app);
            await panel.getByRole('checkbox', {name: 'Enable ORCID functionality'}).check();
            await panel.locator('select[name="orcidApiType"]').waitFor({state: 'visible', timeout: L.T});
            await panel.locator('select[name="orcidApiType"]').selectOption({label: 'Public Sandbox'});
            await panel.locator('input[name="orcidClientId"]').fill(JOURNAL_CLIENT_ID);
            await panel.locator('input[name="orcidClientSecret"]').fill('h19a-journal-secret');
            F.nbOwnOn = {save: await L.pressSave(mgr.page, panel, CONTEXT_API), journalRows: L.journalOrcidRows(app)};
        }

        // steps 1–2: the site-wide configuration on
        await siteWide(admin.page, app, true, F, 'step2');

        // step 3: the journal's locked tab
        {
            const {panel, facts} = await L.openJournalOrcid(mgr.page, app);
            await loc(mgr.page, 'journal: Enable ORCID functionality (locked)', panel.getByRole('checkbox', {name: 'Enable ORCID functionality'}));
            await loc(mgr.page, 'journal: City', panel.locator('input[name="orcidCity"]'));
            F.step3 = {...facts, screen: await screen(mgr.page), journalRows: L.journalOrcidRows(app)};
            await shot(mgr.page, `a17-${MODE}-step3`);
            // step 4: City typed, Save
            await panel.locator('input[name="orcidCity"]').fill('Burnaby');
            F.step4 = {save: await L.pressSave(mgr.page, panel, CONTEXT_API)};
            await shot(mgr.page, `a17-${MODE}-step4`);
            F.step4.journalRows = L.journalOrcidRows(app);
        }

        // step 5: the site-wide configuration off
        await siteWide(admin.page, app, false, F, 'step5');

        // step 6: the journal's tab afterwards
        {
            const {facts} = await L.openJournalOrcid(mgr.page, app);
            F.step6 = {...facts, screen: await screen(mgr.page)};
            await shot(mgr.page, `a17-${MODE}-step6`);
        }

        if (MODE === 'reach') {
            // the contributor form's "Request verification" on submission 4 (Craig Montgomerie)
            // and the email it sends (OJS: the dataset's submission 4 is in the Submission stage)
            const R = {};
            try {
                const p = mgr.page;
                const pub = sql(app, 'select current_publication_id from submissions where submission_id = 4').trim();
                const since = new Date();
                await p.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=4&workflowMenuKey=publication_${pub}_contributors`));
                await idle(p);
                const list = p.locator('.listPanel--contributor').first();
                await list.locator('li.listPanel__item').first().waitFor({timeout: L.T});
                await list.locator('li.listPanel__item').filter({hasText: 'Montgomerie'}).first().getByRole('button', {name: 'Edit', exact: true}).click();
                const dlg = p.locator('[role="dialog"]:visible').filter({has: p.locator('[id^="contributor-givenName"]')}).last();
                await dlg.locator('[id^="contributor-givenName"]').first().waitFor({timeout: L.T});
                await idle(p); await L.sleep(400);
                const field = dlg.locator('.pkpFormField').filter({has: p.locator('.pkpFormFieldLabel', {hasText: /ORCID/})}).first();
                R.orcidField = L.flat(await field.innerText().catch(() => null), 400);
                const req = field.getByRole('button', {name: /^(Request verification|Resend Verification Email)$/}).last();
                await loc(p, 'contributor: Request verification', req);
                R.pressed = L.flat(await req.innerText(), 60);
                await req.click();
                const q2 = p.locator('[role="dialog"]:visible').filter({hasText: 'verify their ORCID'}).last();
                await q2.waitFor({timeout: L.T});
                R.question = L.flat(await q2.innerText(), 300);
                const answered = p.waitForResponse((r) => r.url().includes('/orcid/requestAuthorVerification/'), {timeout: L.T});
                await q2.getByRole('button', {name: 'Yes', exact: true}).click();
                const r = await answered;
                R.status = r.status();
                await idle(p);
                R.after = L.flat(await field.innerText().catch(() => null), 300);
                await shot(p, `a17-${MODE}-requested`);
                await p.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`)); // a request for the job runner
                const m = await app.fleetMail.find({to: 'cmontgomerie@mailinator.com', since, timeoutMs: 45_000}).catch((e) => ({error: L.flat(e.message, 200)}));
                if (m.error) {
                    R.mail = m;
                } else {
                    const full = await app.fleetMail.fullMessage(m.ID);
                    const hrefs = [...String(full.HTML || '').matchAll(/href=(["'])([^"']*)\1/g)].map((x) => x[2].replace(/&amp;/g, '&'));
                    R.mail = {subject: full.Subject, links: hrefs.filter((h) => /orcid/i.test(h)).map((h) => (/oauth\/authorize/.test(h) ? L.oauthParts(h) : h))};
                }
            } catch (e) {
                R.error = L.flat(e.stack || e.message, 800);
            }
            F.reach = R;
        }

        if (MODE === 'steps') {
            // step 7: rvaca's Identity tab
            const id = await L.identityOrcid(mgr.page, app);
            F.step7 = {orcidBlock: id.orcidBlock, connect: id.connect, screen: await screen(mgr.page)};
            await loc(mgr.page, 'profile: Create or Connect your ORCID iD', id.connectLocator);
            await shot(mgr.page, `a17-${MODE}-step7`);
            if (id.connect) F.step7.popup = await connectAddress(mgr.page, id.connectLocator);

            // step 8: signed out, the Register page
            await signOut(mgr.page);
            await mgr.page.goto(app.url(`/index.php/${app.contextPath}/user/register`));
            await mgr.page.locator('form#register').waitFor({state: 'visible', timeout: 30_000});
            await idle(mgr.page);
            const b = mgr.page.locator('form#register #connect-orcid-button');
            F.step8 = {connect: (await b.count()) ? L.flat(await b.innerText(), 120) : null, screen: await screen(mgr.page)};
            await shot(mgr.page, `a17-${MODE}-step8`);
            if (F.step8.connect) F.step8.popup = await connectAddress(mgr.page, b);
        }
        F.end = {siteRows: L.siteOrcidRows(app), journalRows: L.journalOrcidRows(app)};
    } catch (e) {
        F.error = L.flat(e.stack || e.message, 1500);
    } finally {
        record(`a17-${MODE}`, F);
        await admin.close();
        await mgr.close();
    }
});
