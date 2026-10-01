// The report's steps for the 3.5 -> main upgrade gap (pkp-lib#12994's migration missing from upgrade.xml), walked on PKP's default
// dataset as the team holds it: OJS stable-3_5_0 dataset upgraded to main by `php tools/upgrade.php upgrade` (fleet-prep does it).
//   PKP_E2E_DATASET_BRANCH=stable-3_5_0 npm run fleet-prep -- --feature sync-ds --dataset 1 --reset --apps ojs
//   PROBE_FEATURE=sync-ds PROBE_AGENT=upgwalk node bin/probe.js ojs shared/playwright/checks/sync/upgrade-3_5/walk.js
// Steps: dbarnes saves a "Competing Interests" text under Settings › Workflow › Review › Reviewer Guidance; jjanssen accepts the
// request for submission 12 ("Sodium butyrate improves growth performance…"); phudson declines his request for submission 12.
// Fixed when jjanssen reaches step 2 and phudson leaves the wizard, with no response of 500.
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1200) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const POLICY = 'Reviewers declare any relationship with the authors.';
const CTX = 'publicknowledge';
const SUB = 12;

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('walk-facts', {[k]: v}, {merge: true}); console.log(`[${k}]`, JSON.stringify(v).slice(0, 900)); };
    const q = (s) => { try { return sql(app, s); } catch (e) { return `ERROR ${flat(e.message, 300)}`; } };
    fact('schema', {version: q("select major||'.'||minor||'.'||revision||'.'||build from versions where current=1 and product_type='core'"),
        ciDeclaredColumn: q("select count(*) from information_schema.columns where table_name='review_assignments' and column_name='competing_interests_declared'"),
        dataset: app.dataset});
    const {page, close} = await launch(app);
    const bad = [];
    page.on('response', (r) => { if (r.status() >= 500) bad.push({status: r.status(), method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, '')}); });
    const raRow = (user) => q(`select ra.review_id, ra.date_confirmed is not null as confirmed, ra.declined, ra.step from review_assignments ra join users u on u.user_id=ra.reviewer_id where ra.submission_id=${SUB} and u.username='${user}'`);
    const {ReviewWizardPage} = require(path.resolve(__dirname, '../../../pages/ReviewerPages.js'));
    const {ReviewSettingsPage} = require(path.resolve(__dirname, '../../../pages/ReviewSettingsPages.js'));
    try {
        // 1-3: dbarnes sets the reviewers' competing-interests guidance
        await signIn(page, 'dbarnes', {contextPath: CTX}); await idle(page);
        const rs = new ReviewSettingsPage(page, CTX);
        await rs.goto('Reviewer Guidance');
        await rs.guidance.typeInto('competingInterests', POLICY);
        await rs.guidance.save();
        fact('guidance saved', q(`select left(setting_value,60) from journal_settings js join journals j on j.journal_id=js.journal_id where j.path='${CTX}' and setting_name='competingInterests'`));
        await signOut(page).catch(() => {});
        // 4-7: jjanssen accepts the request for submission 12
        for (const [who, mode] of [['jjanssen', 'accept'], ['phudson', 'decline']]) {
            const n0 = bad.length;
            await signIn(page, who, {contextPath: CTX}); await idle(page);
            const w = new ReviewWizardPage(page, CTX, {});
            await w.goto(SUB); await idle(page);
            await w.expectStep(1).catch(() => {});
            const out = {before: raRow(who)};
            if (mode === 'accept') {
                if (await w.privacyBox.count()) await w.privacyBox.check();
                await w.acceptButton.click();
                out.reachedStep2 = await w.expectStep(2).then(() => true).catch(() => false);
            } else {
                await w.openDecline();
                out.decline = await w.confirmDecline().then(() => 'left the wizard').catch((e) => `stayed: ${flat(e.message, 160)}`);
            }
            await sleep(1500);
            const s = await screen(page);
            await shot(page, `${who}-${mode}`).catch(() => {});
            record(`${who}-${mode}`, s);
            out.url = s.url; out.notices = s.notices; out.http500 = bad.slice(n0); out.after = raRow(who);
            fact(`${who} ${mode}`, out);
            await signOut(page).catch(() => {});
        }
    } finally {
        await close();
    }
});
