// U04 drift sweep 2026-10-16, chunk SW2 follow-up: the lines that need ORCID's token answer,
// driven with the local stand-in of checks/sync/pkp-lib-13493/orcid-token-stub.js (no call
// reaches ORCID). Spec docs/specs/U04-orcid-integration.md: Rule 5's completion (113-114),
// Rule 6d (126-129), Rule 9's success landing (149-151) and, for the SW3 checker, the Side
// effects lines 241-246 (the single-use link; the landing after an authorization, published or
// not).
//
// Needs the fleet's probe servers started with the stand-in's CA trusted (once per fleet):
//   node shared/playwright/checks/sync/pkp-lib-13493/orcid-token-stub.js --init --dir .reports/U04/orcid-stub
//   (restart the probe servers with PHP_INI_SCAN_DIR=:<repo>/.reports/U04/orcid-stub/php)
// The script starts the stand-in in-process (STUB_DIR, STUB_PORT, default 8670), points the
// fleet config's two `[proxy]` lines at it for the app being driven, and puts back the value
// it found in a finally (and on exit). Only one checker may hold the fleets while it runs.
//
// Per app and run, one scratch context on Public Sandbox (A) and one on Member Sandbox (B):
//   profile  A: three accounts with no iD; each presses "Create or Connect your ORCID iD" and
//            the popup is sent to the app's return address with a code, the token endpoint
//            answering `200-token`, `401-invalid-client` or `500`: whether the popup closes,
//            the profile's notices, the Identity block on the same page and after a reload,
//            the account's settings, what the stand-in received.
//   verify   A (unpublished) and B (one published, one not): "Request verification" on each
//            contributor (no iD) by the manager, the queue drained, the email's link opened
//            signed out with a code, the stand-in answering `200-token` (A also once with
//            `401-invalid-client` on a second contributor): the landing as data, the address
//            11 s later, the contributor's settings and queued ORCID jobs; then the same link
//            opened again with a new code (single use).
// Facts: .reports/U04/ccSW2/sw2stub-facts-<run>-<app>.json.
//   PROBE_RUN=t1 PROBE_FEATURE=U04 PROBE_AGENT=ccSW2 node bin/probe.js all shared/playwright/checks/U04/SW2/sw2-stub.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, tag, sql, serverLog, drainJobs,
    outFile, rawKeys} = require('../../../probe');
const {stubOrcidSite} = require('../../../support/orcid');
const {startStub} = require('../../sync/pkp-lib-13493/orcid-token-stub');

const REPO = path.resolve(__dirname, '../../../../..');
const RUN = process.env.PROBE_RUN || 't1';
const PHASES = (process.env.PHASES || 'profile,verify').split(',');
const STUB_DIR = process.env.STUB_DIR || path.join(REPO, '.reports/U04/orcid-stub');
const STUB_PORT = Number(process.env.STUB_PORT || 8670);
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 1500) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const txt = async (l, n = 400) => ((await l.count()) ? flat(await l.first().innerText({timeout: 3000}).catch(() => null), n) : null);

/** The "ORCID Authorization" page as data, read at once (the success page leaves after 10 s). */
async function readLanding(page, name) {
    const snap = await screen(page);
    record(`${name}-screen`, snap);
    const box = page.locator('.page_message');
    const out = {
        url: rel(page.url()), title: await page.title().catch(() => null),
        heading: await txt(box.locator('h2'), 120),
        orcidLink: await txt(box.locator('.orcid a'), 120),
        orcidIcon: (await box.locator('.orcid a svg').count()) ? flat(await box.locator('.orcid a svg').first().evaluate((e) => e.outerHTML), 70) : null,
        success: (await box.locator('.orcid-success').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)),
        failure: await txt(box.locator('.orcid-failure'), 400),
        redirectLine: await txt(box.locator('.orcid-redirect'), 200),
        text: await txt(box, 900),
        rawKeys: await rawKeys(page).catch(() => null),
    };
    await shot(page, name).catch(() => {});
    record(name, {url: page.url(), title: out.title, text: out.text});
    return out;
}

let stub = null;
const restores = [];
process.on('exit', () => {
    for (const r of restores.splice(0)) r();
});

/** Point the config's `[proxy]` lines at `url`; returns a function that puts back what was there. */
function pointProxy(configFile, url) {
    const before = fs.readFileSync(configFile, 'utf8');
    const found = (before.match(/^http_proxy\s*=\s*"?([^"\n]*)"?/m) || [])[1];
    fs.writeFileSync(configFile, before.replace(/^(https?_proxy)\s*=.*$/gm, `$1 = "${url}"`));
    let done = false;
    const restore = () => {
        if (done) return;
        done = true;
        fs.writeFileSync(configFile, before);
    };
    restores.push(restore);
    return {found, restore};
}

forEachApp(async (app) => {
    if (!stub) stub = await startStub({dir: STUB_DIR, port: STUB_PORT, logFile: path.join(STUB_DIR, `stub-${RUN}.log`)});
    const configFile = path.isAbsolute(app.configFile) ? app.configFile : path.join(REPO, app.configFile);
    const fact = (k, v) => {
        record('sw2stub-facts', {[k]: v}, {merge: true});
        console.log(`[u04 sw2stub ${RUN} ${app.name}] ${k}:`, flat(JSON.stringify(v), 1800));
    };
    const log = serverLog(app);
    const userOrcid = (username) => sql(app, `select s.setting_name, case when s.setting_name in ('orcidAccessToken','orcidRefreshToken') then '(set)' else s.setting_value end from users u join user_settings s on s.user_id=u.user_id where u.username='${username}' and s.setting_name like 'orcid%' order by 1`).split('\n').filter(Boolean);
    const authorOrcid = (pub) => sql(app, `select s.setting_name, case when s.setting_name in ('orcidAccessToken','orcidRefreshToken','orcidEmailToken') then '(set)' else s.setting_value end from authors a join author_settings s on s.author_id=a.author_id where a.publication_id=${pub} and s.setting_name like 'orcid%' order by 1`).split('\n').filter(Boolean);
    const orcidJobs = () => sql(app, `select substring(payload from '"displayName":"([^"]+)"') from jobs where payload like '%orcid%' order by id`).split('\n').filter(Boolean);

    const t = tag('u04sw2t');
    const A = await app.api.createContext({
        tag: t, context: {name: `U04 SW2 stub ${t}`, acronym: 'UST'},
        orcid: {enabled: true, apiType: 'publicSandbox'},
        users: [
            {username: `${t}mg`, roles: ['manager']},
            {username: `${t}n1`, roles: ['author'], givenName: 'Nia', familyName: 'Token'},
            {username: `${t}n2`, roles: ['author'], givenName: 'Noa', familyName: 'Refused'},
            {username: `${t}n3`, roles: ['author'], givenName: 'Ned', familyName: 'Fivehundred'},
            {username: `${t}a1`, roles: ['author'], givenName: 'Ava', familyName: 'Public'},
            {username: `${t}a2`, roles: ['author'], givenName: 'Abe', familyName: 'Refused'},
        ],
    });
    const PA = A.path || t;
    const tb = tag('u04sw2m');
    const B = await app.api.createContext({
        tag: tb, context: {name: `U04 SW2 member ${tb}`, acronym: 'USM'},
        orcid: {enabled: true, apiType: 'memberSandbox'},
        ...(app.name === 'ojs' ? {issues: [{volume: 1, number: '1', year: 2026, published: true}]} : {}),
        users: [
            {username: `${tb}mg`, roles: ['manager']},
            {username: `${tb}b1`, roles: ['author'], givenName: 'Bea', familyName: 'Published'},
            {username: `${tb}b2`, roles: ['author'], givenName: 'Bo', familyName: 'Unpublished'},
            {username: `${tb}b3`, roles: ['author'], givenName: 'Bex', familyName: 'Noissue'},
        ],
    });
    const PB = B.path || tb;
    fact('seed', {A: PA, B: PB});

    const {found, restore} = pointProxy(configFile, stub.proxyUrl);
    fact('proxy', {configFile: path.relative(REPO, configFile), found, set: stub.proxyUrl});
    try {
        // -------------------------------------------------------------- profile (Rule 5 completion, 6d)
        if (PHASES.includes('profile')) {
            const {page, close} = await launch(app);
            try {
                for (const [who, answer] of [[`${t}n1`, '200-token'], [`${t}n2`, '401-invalid-client'], [`${t}n3`, '500']]) {
                    await signIn(page, who, {contextPath: PA});
                    await page.goto(app.url(`/index.php/${PA}/user/profile`));
                    await page.locator('form#identityForm').waitFor({timeout: T});
                    await idle(page);
                    await stubOrcidSite(page.context());
                    const [popup] = await Promise.all([page.waitForEvent('popup', {timeout: T}), page.locator('#connect-orcid-button').click()]);
                    await popup.waitForLoadState('domcontentloaded').catch(() => {});
                    const redirect = new URL(popup.url()).searchParams.get('redirect_uri');
                    stub.setAnswer(answer);
                    const sm = stub.mark();
                    const from = log.mark();
                    const popupErrors = [];
                    popup.on('pageerror', (e) => popupErrors.push(flat(e.message, 200)));
                    popup.on('console', (m) => { if (m.type() === 'error') popupErrors.push(flat(m.text(), 200)); });
                    // ORCID's redirect is a navigation of the popup's own document, so the
                    // popup keeps the profile as its opener (a page.goto() would drop it).
                    const back = `${app.url(rel(redirect))}&code=u04sw2${answer.replace(/\W/g, '')}`;
                    const answered = page.context().waitForEvent('response', {predicate: (r) => r.url().startsWith(back), timeout: T}).catch(() => null);
                    await popup.evaluate((u) => { window.location.href = u; }, back).catch(() => {});
                    const resp = await answered;
                    let closed = false;
                    for (let i = 0; i < 20 && !closed; i++) { await sleep(500); closed = popup.isClosed(); }
                    const popupBody = closed ? null : await txt(popup.locator('body'), 300);
                    if (!closed) await popup.screenshot({path: outFile(`sw2stub-profile-${answer}-popup.png`)}).catch(() => {});
                    await idle(page);
                    await sleep(1500);
                    const s = await screen(page);
                    record(`sw2stub-profile-${answer}`, s);
                    await shot(page, `sw2stub-profile-${answer}`).catch(() => {});
                    const block = async () => ({
                        connect: await txt(page.locator('#connect-orcid-button'), 80),
                        verifiedLink: await txt(page.locator('#orcid-link'), 120),
                        verifiedHref: (await page.locator('#orcid-link').count()) ? await page.locator('#orcid-link').getAttribute('href') : null,
                        verifiedIcon: (await page.locator('#orcid-link svg').count()) ? flat(await page.locator('#orcid-link svg').first().evaluate((e) => e.outerHTML), 70) : null,
                        deleteButton: await txt(page.locator('#deleteOrcidButton'), 40),
                    });
                    const same = await block();
                    await page.goto(app.url(`/index.php/${PA}/user/profile`));
                    await page.locator('form#identityForm').waitFor({timeout: T});
                    await idle(page);
                    fact(`profile ${answer}`, {redirectUri: redirect, status: resp ? resp.status() : null, popupClosed: closed, popupBody, popupErrors,
                        notices: s.notices, same, reload: await block(), settings: userOrcid(who), stubReceived: stub.since(sm),
                        serverLog: log.since(from).filter((l) => !/plugin-gallery|PluginGallery|pkp\.sfu\.ca/.test(l)).map((l) => flat(l, 300))});
                    if (!closed) await popup.close().catch(() => {});
                    await signOut(page).catch(() => {});
                }
            } finally {
                await close();
            }
        }

        // -------------------------------------------------------------- verify (Rule 9 success, single use, Side effects)
        if (PHASES.includes('verify')) {
            const A2 = require('../../issues/orcid-denied-page-raw-placeholder/lib');
            const subs = [];
            const mk = async (ctx, submitter, name, published, answer, label, extra = {}) => {
                const s = await app.api.createSubmission({tag: `${ctx}${label}`, context: ctx, submitter, title: `U04 SW2 ${label} ${ctx}`,
                    submitted: true, ...(published ? {published: true} : {}), ...extra});
                subs.push({ctx, submitter, name, published, answer, label, id: s.submissionId, pub: s.publicationId});
            };
            await mk(PA, `${t}a1`, 'Ava Public', false, '200-token', 'public-unpublished');
            await mk(PA, `${t}a2`, 'Abe Refused', false, '401-invalid-client', 'public-refused');
            // OJS: published into the seeded issue, as an editor publishes; and (b3) published
            // with no issue, the U49 OJS4 shape.
            await mk(PB, `${tb}b1`, 'Bea Published', true, '200-token', 'member-published',
                app.name === 'ojs' ? {issue: {volume: 1, number: '1', year: 2026}} : {});
            if (app.name === 'ojs') await mk(PB, `${tb}b3`, 'Bex Noissue', true, '200-token', 'member-published-noissue');
            await mk(PB, `${tb}b2`, 'Bo Unpublished', false, '200-token', 'member-unpublished');
            const {page, close} = await launch(app);
            try {
                for (const ctx of [PA, PB]) {
                    await signIn(page, ctx === PA ? `${t}mg` : `${tb}mg`, {contextPath: ctx});
                    for (const s of subs.filter((x) => x.ctx === ctx)) {
                        s.since = new Date();
                        const modal = await A2.openContributorEditor(page, {...app, contextPath: ctx}, s.id, s.name);
                        s.request = await A2.requestVerification(page, modal);
                    }
                    await signOut(page).catch(() => {});
                }
                const d = await drainJobs(app);
                fact('verify drain', {passes: d.passes, out: flat(d.output, 400)});
                for (const s of subs) {
                    const link = await A2.readAuthorizationLink(page, app, `${s.submitter}@mail.test`, s.since);
                    if (!link || !link.redirectUri) {
                        fact(`verify ${s.label}`, {request: s.request, email: null});
                        continue;
                    }
                    const before = authorOrcid(s.pub);
                    const jobsBefore = orcidJobs();
                    stub.setAnswer(s.answer);
                    const sm = stub.mark();
                    const from = log.mark();
                    const resp = await page.goto(`${app.url(rel(link.redirectUri))}&code=u04sw2first`);
                    const landedAt = Date.now();
                    const out = await readLanding(page, `sw2stub-verify-${s.label}`);
                    const after = authorOrcid(s.pub);
                    const jobsAfter = orcidJobs();
                    const received = stub.since(sm);
                    // Ten seconds on: where the page went (the success page's own timer).
                    await page.waitForURL((u) => !/\/orcid\/verify/.test(u.toString()), {timeout: 15_000}).catch(() => {});
                    const movedAfterMs = /\/orcid\/verify/.test(page.url()) ? null : Date.now() - landedAt;
                    await idle(page);
                    const laterUrl = rel(page.url());
                    const laterTitle = await page.title();
                    // The same link again, with a new code (single use).
                    stub.setAnswer('200-token');
                    const sm2 = stub.mark();
                    const resp2 = await page.goto(`${app.url(rel(link.redirectUri))}&code=u04sw2second`);
                    const again = await readLanding(page, `sw2stub-verify-${s.label}-again`);
                    fact(`verify ${s.label}`, {published: s.published, answer: s.answer, email: {subject: link.subject, redirect: rel(link.redirectUri)},
                        status: resp ? resp.status() : null, ...out,
                        before, after, jobsBefore, jobsAfter, stubReceived: received, movedAfterMs, laterUrl, laterTitle,
                        again: {status: resp2 ? resp2.status() : null, ...again, stubReceived: stub.since(sm2), settings: authorOrcid(s.pub)},
                        serverLog: log.since(from).filter((l) => !/plugin-gallery|PluginGallery|pkp\.sfu\.ca/.test(l)).map((l) => flat(l, 300))});
                }
                const d2 = await drainJobs(app);
                fact('verify drain after', {passes: d2.passes, out: flat(d2.output, 600),
                    failed: sql(app, `select substring(payload from '"displayName":"([^"]+)"'), left(exception, 220) from failed_jobs where failed_at >= now() - interval '5 minutes' and payload like '%orcid%' order by id`).split('\n').filter(Boolean)});
            } finally {
                await close();
            }
        }
    } finally {
        restore();
        fact('proxy restored', {now: (fs.readFileSync(configFile, 'utf8').match(/^http_proxy\s*=\s*"?([^"\n]*)"?/m) || [])[1]});
    }
}).finally(async () => {
    if (stub) await stub.close().catch(() => {});
});
