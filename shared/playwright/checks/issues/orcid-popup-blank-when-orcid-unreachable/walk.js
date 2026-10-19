// Issue walk — U04 A18 (docs/specs/U04-orcid-integration.md#a18): when ORCID cannot be reached,
// or fails, as the ORCID sign-in popup comes back to the journal, the popup stays open on a blank
// page and the profile or the registration form under it says nothing.
// Report: docs/issues/U04-A18-orcid-popup-blank-when-orcid-unreachable.md
//
// On a dataset fleet (PKP's default test dataset), per app:
//   1. `dbarnes` turns ORCID on (Settings › Users & Roles › "ORCID": "Enable ORCID
//      functionality", "Public Sandbox", Client ID APP-TEST, Client Secret test-secret, "Save").
//   2. Profile: `dbarnes` opens the profile's Identity tab and presses "Create or Connect your
//      ORCID iD"; the popup's address is sent where ORCID sends the browser back after a sign-in
//      (its `redirect_uri` with `&code=abc123`).
//   3. Registration: signed out, the journal's "Register" page, a name and an email typed, the
//      same button and the same return (`targetOp=register`).
// Each per row of ROWS: `off` is the fleet's own dead-port `[proxy]` (the Steps: ORCID cannot
// be reached); the others are a stand-in's answer to the token request (`500`, the control
// `401-invalid-client`, `200-token`), which needs the fleet's server started once with the
// stand-in's CA on PHP's scan path:
//   D=$PWD/.reports/issues/h19b/orcid-stub
//   node shared/playwright/checks/sync/pkp-lib-13493/orcid-token-stub.js --init --dir $D
//   npm run probe-servers -- --stop --dataset 2
//   PHP_INI_SCAN_DIR=:$D/php npm run probe-servers -- --start --dataset 2
//
// Modes (MODE): `walk` (default) the Steps, rows off,500,401-invalid-client; `nb` the neighbour
// check for a fix trial, rows 401-invalid-client,200-token (a refusal and a success must stay
// as they are). ROWS=… narrows; TARGETS=profile,register narrows.
//
//   npm run fleet-prep -- --feature issues-h19b --dataset 2 --reset
//   STUB_DIR=$D PROBE_FEATURE=issues-h19b PROBE_AGENT=h19b node bin/probe.js all \
//     shared/playwright/checks/issues/orcid-popup-blank-when-orcid-unreachable/walk.js
//
// No assertions: every row is recorded (walk-<row>-<target>-<app>.json, screenshots), and the
// script never throws on a row. The fleet's `[proxy]` is put back to the dead port at the end.
const path = require('path');
const {forEachApp, launch, signIn, signOut, idle, shot, record, sql, outDir} = require('../../../probe');
const {datasetFleet} = require('../../../dataset');
const {startStub} = require('../../sync/pkp-lib-13493/orcid-token-stub');
const {DEAD_PROXY, setProxy, registerForm, driveReturn, firstLine} = require('./lib');

const MODE = process.env.MODE || 'walk';
const DEFAULT_ROWS = {walk: ['off', '500', '401-invalid-client'], nb: ['401-invalid-client', '200-token']}[MODE];
if (!DEFAULT_ROWS) throw new Error(`MODE ${MODE}: walk | nb`);
const ROWS = (process.env.ROWS || DEFAULT_ROWS.join(',')).split(',').filter(Boolean);
const TARGETS = (process.env.TARGETS || 'profile,register').split(',').filter(Boolean);
const STUB_PORT = Number(process.env.STUB_PORT || 8711);
const STUB_DIR = process.env.STUB_DIR || path.resolve('.reports/issues/h19b/orcid-stub');
const MANAGER = 'dbarnes';
const TYPED = {givenName: 'Hana', familyName: 'Novak h19b', email: 'hana.novak.h19b@mail.test'};

let stub = null;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('this walk drives a dataset fleet (fleet-prep --dataset)');
    const fleet = datasetFleet(app.name, app.dataset);
    const configFile = path.resolve(fleet.configFile);
    const {OrcidSettingsTab, ProfileIdentityPage} = require(path.join(app.suiteDir, 'pages', 'OrcidPages.js'));
    if (!stub && ROWS.some((row) => row !== 'off')) stub = await startStub({dir: STUB_DIR, port: STUB_PORT});
    const shipped = setProxy(configFile, DEAD_PROXY);
    const tag = MODE; // record() and shot() add PROBE_RUN themselves
    const R = {app: app.name, line: app.line || 'main', mode: MODE, proxyAsFound: shipped, rows: []};
    const userOrcid = () =>
        sql(app, `SELECT setting_name || '=' || CASE WHEN setting_name LIKE '%Token' THEN '(set)' ELSE coalesce(setting_value, '') END FROM user_settings WHERE user_id = (SELECT user_id FROM users WHERE username = '${MANAGER}') AND setting_name LIKE 'orcid%' AND coalesce(setting_value, '') <> '' ORDER BY 1`)
            .split('\n')
            .filter(Boolean);

    const editor = await launch(app);
    const visitor = await launch(app);
    try {
        // Precondition: ORCID on, through the screens
        await signIn(editor.page, MANAGER, {contextPath: app.contextPath});
        try {
            const settings = new OrcidSettingsTab(editor.page, app.contextPath);
            await settings.goto();
            await settings.enableCheckbox.check();
            await settings.apiSelect.selectOption({label: 'Public Sandbox'});
            await settings.clientIdInput.fill('APP-TEST');
            await settings.clientSecretInput.fill('test-secret');
            await settings.save();
            await idle(editor.page);
            await shot(editor.page, `${tag}-orcid-settings`);
        } catch (error) {
            R.settingsError = firstLine(error);
        }
        const {table, id, settings: settingsTable} = app.contextTables;
        R.contextOrcid = sql(app, `SELECT setting_name || '=' || CASE WHEN setting_name = 'orcidClientSecret' THEN '(' || length(setting_value) || ' chars)' ELSE setting_value END FROM ${settingsTable} WHERE ${id} = (SELECT ${id} FROM ${table} WHERE path = '${app.contextPath}') AND setting_name LIKE 'orcid%' ORDER BY 1`).split('\n');
        R.userOrcidBefore = userOrcid();

        for (const row of ROWS) {
            if (TARGETS.includes('profile')) {
                const identity = new ProfileIdentityPage(editor.page, app.contextPath);
                await identity.goto();
                await idle(editor.page);
                const name = `${tag}-${row}-profile`;
                const facts = await driveReturn({
                    app, name, row, configFile, stub, page: editor.page, button: identity.connectButton,
                    after: async () => {
                        await idle(editor.page);
                        return {
                            orcidBlock: ((await identity.orcidContainer.innerText({timeout: 5000}).catch(() => null)) || '').replace(/\s+/g, ' ').trim() || null,
                            connectButton: (await identity.connectButton.count()) ? (await identity.connectButton.innerText()).trim() : null,
                            verifiedLink: (await identity.orcidLink.count()) ? (await identity.orcidLink.innerText()).trim() : null,
                            userOrcidSettings: userOrcid(),
                        };
                    },
                });
                facts.target = 'profile';
                R.rows.push(facts);
                record(name, facts);
                console.log(`[${app.name} ${R.line}] ${MODE} ${row} profile: ${facts.summary}`);
            }
            if (TARGETS.includes('register')) {
                const page = visitor.page;
                await signOut(page).catch(() => {});
                await page.goto(app.url(`/index.php/${app.contextPath}/user/register`));
                await idle(page);
                const form = page.locator('form#register');
                await form.locator('#connect-orcid-button').waitFor({timeout: 30_000});
                await form.locator('#givenName').fill(TYPED.givenName);
                await form.locator('#familyName').fill(TYPED.familyName);
                await form.locator('#email').fill(TYPED.email);
                const name = `${tag}-${row}-register`;
                const facts = await driveReturn({
                    app, name, row, configFile, stub, page, button: form.locator('#connect-orcid-button'),
                    after: async () => ({typed: TYPED, form: await registerForm(page)}),
                });
                facts.target = 'register';
                R.rows.push(facts);
                record(name, facts);
                console.log(`[${app.name} ${R.line}] ${MODE} ${row} register: ${facts.summary} · form ${JSON.stringify(facts.after && facts.after.form)}`);
            }
        }
    } finally {
        setProxy(configFile, DEAD_PROXY);
        record(`${tag}-summary`, {...R, rows: R.rows.map((r) => ({target: r.target, row: r.row, summary: r.summary, return: r.return && {status: r.return.status, body: r.return.body}, emitted: r.emitted, popup: r.popup, after: r.after, serverLog: r.serverLog, standIn: r.standIn, error: r.error}))});
        await editor.close();
        await visitor.close();
    }
}).finally(async () => {
    if (stub) await stub.close();
});
