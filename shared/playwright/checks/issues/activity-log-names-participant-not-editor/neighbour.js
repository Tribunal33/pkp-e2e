// Neighbour check for docs/issues/U35-A14-activity-log-names-participant-not-editor.md:
// as dbarnes, the whole Activity Log History of a submission that already
// holds the dataset's own "was assigned" / "was removed" lines (OJS 9, OMP 6;
// OPS 1 holds none in the dataset, so it shows walk.js's lines when walk.js
// ran before it). Run with the fix out, then with the fix in after the
// upgrade migration (migrate.php): only the User column of the participant
// lines may change, from the participant to the user who acted; every other
// line, and every message, must read the same. Also counts the
// event_log_settings rows named userFullName / participantFullName per event
// type, so the migration is seen to touch only the two participant types.
// Run: PROBE_FEATURE=issues-w38 PROBE_AGENT=w38 PROBE_RUN=nb-out node bin/probe.js all shared/playwright/checks/issues/activity-log-names-participant-not-editor/neighbour.js
const {forEachApp, launch, signIn, record, sql} = require('../../../probe');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'nb';
const SID = {ojs: 9, omp: 6, ops: 1};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const {ActivityLogWindow} = require('../../../pages/ActivityLogPages.js');
    const sid = SID[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: RUN, sid};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 3000)}`);
    };

    const {page, close} = await launch(app);
    try {
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        const log = new ActivityLogWindow(page, panel.frame);
        await signIn(page, 'dbarnes');
        await panel.goto(sid);
        await log.open();
        fact('history', (await log.historyLines()).map((l) => `${l.user} | ${l.event}`));
        await log.close();
        fact('db.settings', sql(app, `select e.event_type, s.setting_name, count(*) from event_log e join event_log_settings s on s.log_id=e.log_id where s.setting_name in ('userFullName','participantFullName') group by 1,2 order by 1,2`));
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
