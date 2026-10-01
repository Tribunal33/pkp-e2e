// Fix check for the install half of the proposed fix (registry/userGroups.xml):
// a context created after the fix is applied gets its roles from the
// registry, which a loaded dataset does not re-read (harness.md "Trying a
// fix"). Builds one scratch context through the kit's `_test` API (tag
// u54w47…) and reads the stages of its Journal Manager-level roles (sql).
// No screen; evidence for the report's "tried" sentence only.
//   PROBE_FEATURE=issues-w47 PROBE_AGENT=w47 PROBE_RUN=fix node bin/probe.js all shared/playwright/checks/issues/manager-role-stages-differ-until-saved/registry-check.js
const {forEachApp, record, sql, tag} = require('../../../probe');

forEachApp(async (app) => {
    const scratch = tag('u54w47');
    const made = await app.api.createContext({tag: scratch, users: [{username: `${scratch}mgr`, roles: ['manager']}]});
    const t = app.contextTables;
    const rows = sql(app, `select coalesce((select setting_value from user_group_settings s where s.user_group_id = ug.user_group_id and setting_name = 'name' and locale = 'en'), '?') || ':' || coalesce(string_agg(ugs.stage_id::text, ',' order by ugs.stage_id), '') from user_groups ug join ${t.table} c on c.${t.id} = ug.context_id left join user_group_stage ugs on ugs.user_group_id = ug.user_group_id where c.path = '${made.path || scratch}' and ug.role_id = 16 group by ug.user_group_id order by ug.user_group_id`).split('\n');
    console.log(`[${app.name}] scratch context ${made.path || scratch}: manager-level roles ${JSON.stringify(rows)}`);
    record('registry-check', {context: made.path || scratch, managerLevelRoles: rows});
});
