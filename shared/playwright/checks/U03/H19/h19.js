// U03 claim check, chunk H19 (housekeeping 2026-10-19, incidentals row "API Key, a key the
// server cannot decode"; docs/specs/U03-user-profile.md Rule 12, Rule 12c, Side effects "On
// deleting an API key", footnote h).
// Kept claim-check script: run on demand, never in CI. Built for a DATASET fleet (dbarnes signs in;
// the dataset leaves `api_key_secret` empty, so the script sets it in the fleet's config first and
// puts it back at the end; a team install sets it in config.inc.php).
//   main: PROBE_FEATURE=issues-cc19b PKP_E2E_DATASET=7 PROBE_AGENT=cc19b PROBE_RUN=r1 \
//           bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U03/H19/h19.js
//   3.5:  PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=issues-cc19b-3_5 PKP_E2E_DATASET=7 PROBE_AGENT=cc19b \
//           PROBE_RUN=s1 node bin/probe.js ojs shared/playwright/checks/U03/H19/h19.js
// What it does, per app: dbarnes opens Profile › "API Key", deletes a key left from an earlier run,
// presses "Create API Key", then sends `GET {context}/api/v1/submissions` with no cookie and each
// token of TOKENS below (the valid key and a tampered signature as controls, then keys the server
// cannot decode), presses "Delete" (OK), and sends the deleted key and one undecodable key again.
// Outputs: .reports/<PROBE_FEATURE>/cc19b/h19[-<run>]-<app>.json and the snapshots beside it.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, record, serverLog} = require('../../../probe');
const L = require('../SW3/lib.js');

const SECRET = 'cc19b-api-key-secret-for-testing';
const REPO = path.resolve(__dirname, '../../../../..');

const b64url = (s) => Buffer.from(s).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Set (or put back) `api_key_secret` in the fleet's config; the line as it now reads. */
function setSecret(app, value) {
    const file = path.isAbsolute(app.configFile) ? app.configFile : path.resolve(REPO, app.configFile);
    const before = fs.readFileSync(file, 'utf8');
    const was = (before.match(/^api_key_secret\s*=.*$/m) || [])[0];
    fs.writeFileSync(file, before.replace(/^api_key_secret\s*=.*$/m, `api_key_secret = "${value}"`));
    return {was, now: (fs.readFileSync(file, 'utf8').match(/^api_key_secret\s*=.*$/m) || [])[0]};
}

/** The tokens sent, built from the valid key `k` (header.payload.signature). */
function tokens(k) {
    const [h, p, s] = k.split('.');
    const flip = (c) => (c === 'A' ? 'B' : 'A');
    return [
        ['valid', k],
        ['tampered-signature', `${h}.${p}.${flip(s[0])}${s.slice(1)}`],
        ['not-a-jwt', 'abc'],
        ['not-a-jwt-long', 'not-an-api-token-0123456789abcdef'],
        ['two-segments', `${h}.${p}`],
        ['four-segments', `${k}.x`],
        ['empty-segments', '..'],
        ['payload-not-base64', `${h}.!!!!.${s}`],
        ['payload-not-json', `${h}.${b64url('{not json')}.${s}`],
        ['payload-a-number', `${h}.${b64url('123')}.${s}`],
        ['header-not-base64', `!!!!.${p}.${s}`],
        ['header-not-json', `${b64url('{oops')}.${p}.${s}`],
        ['header-alg-none', `${b64url('{"typ":"JWT","alg":"none"}')}.${p}.`],
        ['header-alg-HS512', `${b64url('{"typ":"JWT","alg":"HS512"}')}.${p}.${s}`],
    ];
}

/** One cookie-less REST read: status, content type, body, and the server log lines it wrote. */
async function rest(app, token, {how = 'bearer'} = {}) {
    const {request} = require('@playwright/test');
    const log = serverLog(app);
    const from = log.mark();
    const ctx = await request.newContext({baseURL: app.baseURL, storageState: {cookies: [], origins: []}});
    try {
        let url = `/index.php/${app.contextPath}/api/v1/submissions`;
        const headers = {Accept: 'application/json'};
        if (token != null && how === 'bearer') headers.Authorization = `Bearer ${token}`;
        if (token != null && how === 'param') url += `?apiToken=${encodeURIComponent(token)}`;
        const res = await ctx.get(url, {headers, maxRedirects: 0});
        const text = await res.text().catch(() => '');
        let body = null;
        try {
            const j = JSON.parse(text);
            body = j && typeof j === 'object' && !Array.isArray(j) && 'error' in j ? j : {keys: Object.keys(j || {}).slice(0, 5), itemsMax: j && j.itemsMax};
        } catch {
            body = {raw: L.flat(text, 400)};
        }
        await L.sleep(300);
        return {how: token == null ? 'none' : how, status: res.status(), type: res.headers()['content-type'] || null, body, log: log.since(from).map((l) => L.flat(l, 300))};
    } finally {
        await ctx.dispose();
    }
}

forEachApp(async (app) => {
    const out = {app: app.name, line: app.line || 'main', dataset: app.dataset, at: new Date().toISOString()};
    const F = (k, v) => {
        out[k] = v;
        record('h19', out);
        console.log('[h19]', app.name, k, JSON.stringify(v === undefined ? null : v).slice(0, 500));
    };
    F('secret', setSecret(app, SECRET));
    await L.sleep(2500);
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});
        let p = await L.openProfile(page, app.contextPath, 'apiKey');
        let st = await L.apiKeyState(p);
        F('open', {state: st, snap: await L.snap(page, 'h19-open')});
        if (st.buttons && st.buttons.includes('Delete')) {
            await p.deleteApiKey({confirm: true});
            F('cleared-leftover', await L.apiKeyState(p));
        }
        F('rest-no-token', await rest(app, null));
        await p.createApiKey();
        const k = (await L.apiKeyState(p)).value;
        F('created', {state: await L.apiKeyState(p), snap: await L.snap(page, 'h19-created')});
        const answers = {};
        for (const [name, t] of tokens(k)) answers[name] = await rest(app, t);
        answers['not-a-jwt (query parameter)'] = await rest(app, 'abc', {how: 'param'});
        answers['two-segments (query parameter)'] = await rest(app, k.split('.').slice(0, 2).join('.'), {how: 'param'});
        F('answers', answers);

        await p.deleteApiKey({confirm: true});
        F('deleted', {state: await L.apiKeyState(p), snap: await L.snap(page, 'h19-deleted')});
        F('after-delete', {
            'deleted-key': await rest(app, k),
            'not-a-jwt': await rest(app, 'abc'),
            'tampered-signature of the deleted key': await rest(app, tokens(k)[1][1]),
        });
        p = await L.openProfile(page, app.contextPath, 'apiKey');
        F('deleted-reloaded', {state: await L.apiKeyState(p), snap: await L.snap(page, 'h19-deleted-reloaded')});
        await signOut(page).catch(() => {});
    } finally {
        await close();
        F('secret-restored', setSecret(app, ''));
    }
});
