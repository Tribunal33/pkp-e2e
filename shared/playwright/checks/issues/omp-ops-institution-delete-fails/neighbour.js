// Issue report docs/issues/U66-A3-A8-omp-ops-institution-delete-fails.md: the fix's
// neighbour check on OJS, walked with fix.diff in and out. The fix must leave
// OJS's rule alone: an institution an institutional subscription names is
// kept (soft deleted) for that subscription, one no subscription names is
// deleted outright. Through the screens, as the dataset's `admin` (a Journal
// Manager of `publicknowledge`):
//   1. Institutions: "Add Institution" "Campus Library" with the IP range
//      192.168.1.1 (an institutional subscription needs a domain or an IP
//      range), and "Other Library" with none
//   2. Payments (`/index.php/publicknowledge/payments`) › "Subscription
//      Types" › "Create New Subscription Type": "Campus Year",
//      Institutional, USD 400, Online, 12 months
//   3. "Institutional Subscriptions" › "Create New Subscription": user
//      `rvaca`, "Campus Year", Active, "Campus Library", today to a year on
//   4. Institutions: "Delete" › "Yes" on "Campus Library", then on
//      "Other Library"; reload
//   5. Payments › "Institutional Subscriptions": the subscription still
//      names "Campus Library"
// Reads `institutions.deleted_at` for both. Reset the fleet first (walk.js
// removes the journal).
// Run: PROBE_FEATURE=issues-rv1 PROBE_AGENT=rv1 ONLY=ojs node bin/probe.js ojs shared/playwright/checks/issues/omp-ops-institution-delete-fails/neighbour.js
//      (PROBE_RUN=fixin / fixout to keep both records)
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (d) => d.toISOString().slice(0, 10);

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const {InstitutionsPage} = require('../../../pages/InstitutionsPages.js');
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const ctx = app.contextPath;
    const cid = sql(app, `select journal_id from journals where path='${ctx}'`);
    const facts = {app: app.name, fix: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const inst = (name) =>
        sql(app, `select i.institution_id, coalesce(i.deleted_at::text, 'live') from institutions i join institution_settings s on s.institution_id=i.institution_id and s.setting_name='name' where i.context_id=${cid} and s.setting_value='${name}'`) || 'no row';

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        const ip = new InstitutionsPage(page, ctx);

        // 1
        await ip.goto();
        for (const [name, ranges] of [['Campus Library', '192.168.1.1'], ['Other Library', '']]) {
            const panel = await ip.openAdd();
            await panel.nameBox('en').fill(name);
            if (ranges) await panel.ipRangesBox.fill(ranges);
            await panel.saveAccepted({refetch: true});
        }
        fact('1 institutions', {names: (await ip.names.allInnerTexts()).map((t) => t.trim()), campus: inst('Campus Library'), other: inst('Other Library')});

        // 2
        const pay = new PaymentsPage(page, ctx);
        await pay.gotoTab('Subscription Types');
        const tw = await pay.openCreateType();
        await tw.kindRadio('Institutional (users are validated via domain or IP address)').check();
        await tw.fill({name: 'Campus Year', currency: 'USD', cost: '400', format: 'Online', duration: '12'});
        const typeSaved = await tw.saveAccepted();
        fact('2 type', {status: typeSaved.status(), rows: await pay.firstCells('Subscription Types')});

        // 3
        await pay.showTab('Institutional Subscriptions');
        const sw = await pay.openCreateSubscription('Institutional Subscriptions');
        await sw.chooseUser('rvaca', sql(app, "select user_id from users where username='rvaca'"));
        await sw.chooseType('Campus Year');
        await sw.chooseStatus('Active');
        await sw.chooseInstitution('Campus Library');
        const now = new Date();
        const later = new Date(now);
        later.setUTCFullYear(later.getUTCFullYear() + 1);
        await sw.typeDate('dateStart', iso(now));
        await sw.typeDate('dateEnd', iso(later));
        const subSaved = await sw.saveAccepted();
        fact('3 subscription', {status: subSaved.status(), cells: await pay.rowCells('Institutional Subscriptions', 'Campus Library'),
            db: sql(app, `select count(*) from institutional_subscriptions s join institutions i using (institution_id) where i.context_id=${cid}`)});

        // 4
        await ip.goto();
        const deletes = {};
        for (const name of ['Campus Library', 'Other Library']) {
            const dlg = await ip.openDelete(name);
            const answered = page.waitForResponse((r) => /\/api\/v1\/institutions\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
            await dlg.yesButton.click();
            const r = await answered;
            await sleep(800);
            await idle(page);
            deletes[name] = {override: r.request().headers()['x-http-method-override'] || null, status: r.status()};
        }
        await ip.reload();
        record('s4-institutions-after', await screen(page));
        fact('4 deletes', {deletes, listAfterReload: (await ip.names.allInnerTexts()).map((t) => t.trim()), campus: inst('Campus Library'), other: inst('Other Library')});

        // 5
        await pay.gotoTab('Institutional Subscriptions');
        record('s5-subscriptions-after', await screen(page));
        fact('5 subscription after', {cells: await pay.rowCells('Institutional Subscriptions', 'Campus Library').catch((e) => `not listed: ${String(e.message).slice(0, 80)}`)});
    } finally {
        record('facts', facts);
        await close();
    }
});
