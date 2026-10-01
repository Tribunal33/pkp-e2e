// Issue report docs/issues/U57-A8-french-default-texts-stored-as-codes.md (U57 A8, U07 OPS3,
// OPS4, U53 OPS1): the report's Steps to reproduce, walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"). OJS is the control. The new press
// or server is created on screen; the kit builds nothing.
//
//   Reading (signed out)
//   1. /publicknowledge/fr_CA/about/submissions: author guidelines and checklist
//   2. OPS: /publicknowledge/fr_CA/about/privacy
//   3. OPS: /publicknowledge/fr_CA/about/editorialMasthead: the role headings
//   The users list
//   4. sign in as admin; /publicknowledge/fr_CA/management/settings/access › "Utilisateurs"
//   Reloading the French defaults
//   5. Settings › Workflow › "Submission" › "Author Guidance", "French": type a French guideline, "Save"
//   6. step 1's page: the typed text
//   7. Settings › Website › "Setup" › "Languages", "French" row › "Reload defaults" › OK
//   8. step 1's page again (OPS: and step 2's)
//   Making a submission in French
//   9. sign in as the author (OJS/OPS ccorino, OMP aclark); /publicknowledge/fr_CA/submission
//   A new press or server
//   10. as admin, Administration › Hosted … › "Create …": path u57u4, English (primary) and French
//   11. /u57u4/fr_CA/about/submissions (OPS: and /u57u4/fr_CA/about/privacy)
//   12. /u57u4/fr_CA/management/settings/access › "Rôles": the role names
// Control (the fix must leave them as they are): the same pages in English, and the journal's
// French pages, which have French texts. Besides the screens it reads the stored French values.
//
// Reset first:  npm run fleet-prep -- --feature issues-u4 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u4 PROBE_AGENT=u4 node bin/probe.js all shared/playwright/checks/issues/french-default-texts-stored-as-codes/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u4-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u4-3_5 PROBE_AGENT=u4 node bin/probe.js all shared/playwright/checks/issues/french-default-texts-stored-as-codes/walk.js
// Facts: .reports/<feature>/u4/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, screen, sql} = require('../../../probe');
const L = require('./lib');

const NEW = 'u57u4';
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const TYPED = 'Lignes directrices u57u4 de la maison.';

function stored(app, path) {
    const T_ = app.contextTables;
    const ctx = sql(app, `SELECT s.setting_name || '=' || left(s.setting_value, 80) FROM ${T_.settings} s JOIN ${T_.table} c ON c.${T_.id} = s.${T_.id} WHERE c.path = '${path}' AND s.locale = 'fr_CA' AND s.setting_name IN ('authorGuidelines','submissionChecklist','privacyStatement') ORDER BY 1`).split('\n').filter(Boolean);
    const groups = sql(app, `SELECT g.role_id || ':' || COALESCE((SELECT setting_value FROM user_group_settings WHERE user_group_id = g.user_group_id AND setting_name = 'name' AND locale = 'fr_CA'), '(none)') FROM user_groups g JOIN ${T_.table} c ON c.${T_.id} = g.context_id WHERE c.path = '${path}' ORDER BY g.user_group_id`).split('\n').filter(Boolean);
    return {ctx, groups};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const f = {app: app.name, line: app.line || 'main', steps: {}};
    const ops = app.name === 'ops';
    const P = app.contextPath;
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const take = async (key, path) => {
        const r = await L.readPage(page, app, path);
        r.codes = L.codes(r.text);
        f.steps[key] = r;
        record(`${key}`, await screen(page));
        return r;
    };
    const tab = async (key, path, id) => {
        const text = await L.readTab(page, app, path, id);
        f.steps[key] = {text, codes: L.codes(text)};
        record(key, await screen(page));
    };
    try {
        f.storedBefore = stored(app, P);
        // Reading
        await take('s1-submissions-fr', `/index.php/${P}/fr_CA/about/submissions`);
        if (ops) await take('s2-privacy-fr', `/index.php/${P}/fr_CA/about/privacy`);
        await take('s3-masthead-fr', `/index.php/${P}/fr_CA/about/editorialMasthead`);
        await take('c1-submissions-en', `/index.php/${P}/en/about/submissions`);
        await take('c3-masthead-en', `/index.php/${P}/en/about/editorialMasthead`);
        // The users list
        await signIn(page, 'admin');
        await tab('s4-users-fr', `/index.php/${P}/fr_CA/management/settings/access`, 'users');
        // Reloading the French defaults, after a French text of the manager's own
        f.steps.s5typed = await L.typeFrenchGuidelines(page, app, P, TYPED);
        await take('s6-submissions-fr', `/index.php/${P}/fr_CA/about/submissions`);
        f.steps.s6hasTyped = f.steps['s6-submissions-fr'].text.includes(TYPED);
        f.steps.s7reload = await L.reloadDefaults(page, app, P, 'fr_CA');
        record('s7-reload', await screen(page));
        await take('s8-submissions-fr', `/index.php/${P}/fr_CA/about/submissions`);
        if (ops) await take('s8-privacy-fr', `/index.php/${P}/fr_CA/about/privacy`);
        f.storedAfterReload = stored(app, P);
        // Making a submission in French
        await signIn(page, AUTHOR[app.name]);
        await take('s9-wizard-fr', `/index.php/${P}/fr_CA/submission`);
        f.steps.s9boxes = await page.locator('main input[type=checkbox]').evaluateAll((els) => els.map((e) => ({name: e.name, required: e.required, label: ((e.closest('label') || {}).innerText || '').trim()})));
        // A new press or server
        await signIn(page, 'admin');
        f.steps.s10createStatus = await L.createContext(page, app, {
            name: `${NEW} ${L.WORDS[app.name].noun}`, initials: NEW, path: NEW, email: `${NEW}@mailinator.com`, locales: ['en', 'fr_CA'],
        });
        record('s10-created', await screen(page));
        await take('s11-submissions-fr', `/index.php/${NEW}/fr_CA/about/submissions`);
        if (ops) await take('s11-privacy-fr', `/index.php/${NEW}/fr_CA/about/privacy`);
        await take('c11-submissions-en', `/index.php/${NEW}/en/about/submissions`);
        await tab('s12-roles-fr', `/index.php/${NEW}/fr_CA/management/settings/access`, 'roles');
        f.storedNew = stored(app, NEW);
        await signOut(page).catch(() => {});
    } finally {
        record('walk', f);
        const short = Object.fromEntries(Object.entries(f.steps).map(([k, v]) => [k, v && v.codes ? v.codes : v]));
        console.log(`[${app.name} ${f.line}]`, JSON.stringify(short));
        await close();
    }
});
