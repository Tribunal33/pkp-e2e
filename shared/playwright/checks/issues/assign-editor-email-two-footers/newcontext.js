// Fix check for docs/issues/U35-A15-assign-editor-email-two-footers.md: a
// context's predefined messages are written when it is created, so the
// registry and locale half of the fix shows only on a new journal, press or
// server. This builds one through the kit (app.api.createContext) and reads,
// in its database, how each stored "Assign Editor" letter is signed.
// Run: PROBE_FEATURE=issues-w39 PROBE_AGENT=w39 node bin/probe.js all shared/playwright/checks/issues/assign-editor-email-two-footers/newcontext.js
const {forEachApp, record, sql, tag} = require('../../../probe');

forEachApp(async (app) => {
    const t = tag('u35w39');
    const ctx = await app.api.createContext({tag: t, users: [{username: `${t}mgr`, roles: ['manager']}]});
    const cpath = ctx.path || t;
    const ct = app.contextTables;
    const rows = sql(app, `select t.key, s.locale, right(s.setting_value, 40) from edit_task_templates t join edit_task_template_settings s using (edit_task_template_id) where t.key like 'EDITOR_ASSIGN%' and s.setting_name = 'description' and t.context_id = (select ${ct.id} from ${ct.table} where path = '${cpath}') order by 1, 2`);
    console.log(`[fact] ${app.name} context ${cpath}:\n${[].concat(rows).join('\n')}`);
    record(`newcontext-${process.env.PROBE_RUN || 'main'}`, {context: cpath, rows});
});
