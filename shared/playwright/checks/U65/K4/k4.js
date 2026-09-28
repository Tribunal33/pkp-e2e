// U65 claim check K4: "Reports" — who opens it (Actors row "Open 'Reports'
// and download a report"), the page and its links (Fields: Reports), the
// report files (Fields: the report files), Rules 18–23, register A12,
// OJS1–OJS4, OMP3, OMP4, OPS3.
//
// Run: PROBE_FEATURE=U65 PROBE_AGENT=ccK4 node bin/probe.js all shared/playwright/checks/U65/K4/k4.js [seed]
//   `seed` forces fresh scratch contexts; without it the contexts recorded in
//   .reports/U65/<agent>/state-<app>.json are reused. PHASES picks a subset of
//   access,page,articles,reviews,subs,monograph,cancelround,agencies,formreview,
//   subs2,mono2,agencies2,pluginlink,cancelreviewer,identifiers (run in that
//   order). The workflow-changing ones (a decision, a new version, review
//   confirmations, due dates, cancellations, subscribers' countries, a form
//   answer, identification codes) run once per seed, flagged in the state file;
//   run `subs` before `subs2` (subs2 gives the last contact a country).
// Every file is kept under .reports/U65/<agent>/files/ and parsed into
// k4-facts-<app>.json. Scratch contexts only; publicknowledge is read (its
// "Reports" page, as manager.maya) and never changed.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (d) => d.toISOString().slice(0, 10);
const ago = (n) => iso(new Date(Date.now() - n * 86400000));
const FRESH = process.argv.includes('seed');
const ALL = ['access', 'page', 'articles', 'reviews', 'subs', 'monograph', 'cancelround', 'agencies', 'formreview', 'subs2', 'mono2', 'agencies2', 'pluginlink', 'cancelreviewer', 'identifiers'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const DENIED = 'The current role does not have access to this operation.';

// One account per permission level of each app (users.md). The sub-editor
// levels are driven on "Editorial Activity" by K1; here they are seeded as
// participants only.
const ROLES = {
    ojs: {mgr: 'manager', ed: 'editor', pe: 'productionEditor', se: 'sectionEditor', ge: 'guestEditor',
        ce: 'copyeditor', au: 'author', rv: 'externalReviewer', rd: 'reader', sm: 'subscriptionManager'},
    omp: {mgr: 'manager', ed: 'editor', pe: 'productionEditor', se: 'sectionEditor',
        ce: 'copyeditor', au: 'author', ve: 'volumeEditor', rv: 'externalReviewer', ir: 'internalReviewer', rd: 'reader'},
    ops: {mgr: 'manager', se: 'sectionEditor', eb: 'editorialBoardMember', au: 'author', rd: 'reader'},
};
// Line 41's levels: who opens "Reports" and who is refused.
const ACCESS = {
    ojs: ['mgr', 'ed', 'pe', 'admin', 'au', 'rv', 'rd', 'ce', 'sm', null],
    omp: ['mgr', 'ed', 'pe', 'admin', 'au', 'rv', 'ir', 'rd', 'ce', 've', null],
    ops: ['mgr', 'admin', 'au', 'rd', 'eb', null],
};

function dbName(app) {
    const config = fs.readFileSync(path.join(REPO, 'checkouts', app.name, 'config.test.inc.php'), 'utf8');
    return config.match(/\[database\][\s\S]*?\nname = (\S+)/)[1];
}
// Read-only reads of what the app stored; never a write.
function psql(app, sql) {
    const out = execFileSync('psql', ['-h', '127.0.0.1', '-U', 'e2e', dbName(app), '-AtF', '\t', '-c', sql], {env: {...process.env, PGPASSWORD: 'e2e'}, encoding: 'utf8'});
    return out.trim() === '' ? [] : out.trim().split('\n').map((line) => line.split('\t'));
}
function serverLogTail(app, fromBytes) {
    const f = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-probe.log`);
    if (!fs.existsSync(f)) return {file: rel(f), missing: true};
    const buf = fs.readFileSync(f);
    return {size: buf.length, text: fromBytes == null ? null : buf.subarray(fromBytes).toString('utf8')};
}

// RFC 4180 reader: quoted cells may hold commas, quotes and line breaks.
function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let q = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else q = false;
            } else cell += c;
        } else if (c === '"') q = true;
        else if (c === ',') {
            row.push(cell);
            cell = '';
        } else if (c === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else if (c !== '\r') cell += c;
    }
    if (cell !== '' || row.length) {
        row.push(cell);
        rows.push(row);
    }
    return rows;
}

const stateFile = (app) => path.join(outDir(), `state-${app.name}.json`);
function loadState(app) {
    if (FRESH) return null;
    try {
        return JSON.parse(fs.readFileSync(stateFile(app), 'utf8'));
    } catch {
        return null;
    }
}
const saveState = (app, s) => fs.writeFileSync(stateFile(app), JSON.stringify(s, null, 2));

forEachApp(async (app) => {
    const A = app.name;
    const isOJS = A === 'ojs';
    const isOMP = A === 'omp';
    const isOPS = A === 'ops';
    const factsFile = path.join(outDir(), `k4-facts-${A}.json`);
    const facts = (() => {
        try {
            return FRESH ? {} : JSON.parse(fs.readFileSync(factsFile, 'utf8'));
        } catch {
            return {};
        }
    })();
    facts.app = A;
    facts.today = ago(0);
    const fact = (k, v) => {
        facts[k] = v;
        fs.writeFileSync(factsFile, JSON.stringify(facts, null, 2));
        console.log(`[${A}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
    };
    async function step(name, fn) {
        try {
            return await fn();
        } catch (e) {
            const msg = String((e && e.stack) || e).split('\n').slice(0, 6).join(' | ');
            fact(`ERR ${name}`, msg);
            return {error: msg};
        }
    }
    const filesDir = path.join(outDir(), 'files');
    fs.mkdirSync(filesDir, {recursive: true});

    // ---- seeding ------------------------------------------------------------
    async function seed() {
        const S = {subs: {}};
        const roles = ROLES[A];
        const J = tag(isOJS ? 'u65k4j' : isOMP ? 'u65k4p' : 'u65k4s');
        const users = Object.entries(roles).map(([k, r]) => ({username: `${J}${k}`, givenName: k.toUpperCase(), familyName: 'Kfour', roles: [r]}));
        if (!isOPS) {
            // reviewers named by what the drive does to them
            for (const k of ['rinv', 'rdec', 'rcom', 'racc', 'rcan', 'rtwo', 'rform']) {
                users.push({username: `${J}${k}`, givenName: k.toUpperCase(), familyName: 'Rev', roles: isOMP ? ['externalReviewer', 'internalReviewer'] : ['externalReviewer']});
            }
        }
        if (isOJS) {
            for (const k of ['ia', 'ib', 'ja', 'jb', 'jc']) users.push({username: `${J}${k}`, givenName: k.toUpperCase(), familyName: 'Subscriber', roles: ['reader']});
        }
        const body = {tag: J, context: {acronym: isOJS ? 'J-K4' : isOMP ? 'P-K4' : 'S-K4'}, users};
        if (isOMP) {
            body.series = [{path: 'one', title: 'Series One'}];
            body.categories = [{path: 'cat1', title: 'Category One'}, {path: 'cat2', title: 'Category Two'}];
        } else body.sections = isOJS ? [{abbrev: 'ART', title: 'Articles'}, {abbrev: 'REV', title: 'Reviews'}] : [{abbrev: 'PRE', title: 'Preprints'}];
        if (isOJS) {
            body.issues = [{volume: 1, number: 1, year: 2026, published: true}, {volume: 1, number: 2, year: 2026, published: false}];
            body.reviewForms = [{title: 'K4 Form', elements: [{question: 'K4 question one?', type: 'textarea'}]}];
            body.institutions = [{name: 'Alpha Inst', ipRanges: ['10.11.0.0/16']}, {name: 'Beta Inst', ipRanges: ['10.12.0.0/16']}, {name: 'Gamma Inst', ipRanges: ['10.13.0.0/16']}];
            body.subscriptionTypes = [
                {name: 'K4 Individual', cost: 10, currency: 'USD', duration: 12},
                {name: 'K4 Institutional', cost: 100, currency: 'USD', duration: 12, institutional: true},
            ];
            body.subscriptions = [
                {user: `${J}ia`, type: 'K4 Individual', referenceNumber: 'REF-IA', notes: 'Note IA'},
                {user: `${J}ib`, type: 'K4 Individual', referenceNumber: 'REF-IB'},
                {user: `${J}ja`, type: 'K4 Institutional', institution: 'Alpha Inst', mailingAddress: 'Alpha street 1'},
                {user: `${J}jb`, type: 'K4 Institutional', institution: 'Beta Inst', mailingAddress: 'Beta street 2'},
                {user: `${J}jc`, type: 'K4 Institutional', institution: 'Gamma Inst', mailingAddress: 'Gamma street 3'},
            ];
        }
        if (isOMP) body.reviewForms = [{title: 'K4 Form', elements: [{question: 'K4 question one?', type: 'textarea'}]}];
        const res = await app.api.createContext(body);
        S.main = {path: J, id: res.contextId, users: Object.fromEntries(res.users.map((u) => [u.username.slice(J.length), u.username]))};
        saveState(app, S);
        const U = (k) => `${J}${k}`;
        const sub = async (key, spec) => {
            try {
                const r = await app.api.createSubmission({tag: `${J}${key}`, context: J, submitter: U('au'), title: `K4 ${key}`, ...spec});
                S.subs[key] = {id: r.submissionId, publicationId: r.publicationId, stageId: r.stageId};
            } catch (e) {
                S.subs[key] = {error: flat(e.message, 600)};
            }
            saveState(app, S);
        };
        const place = isOMP ? {series: 'one'} : {section: isOJS ? 'ART' : 'PRE'};
        const adminMgr = {username: 'admin', role: 'manager'};
        if (isOJS) {
            // td10: two authors, an agency, a Section Editor who records "Accept and Skip Review" on screen
            await sub('a1', {...place, title: 'Bread & Butter', abstract: 'Salt & Pepper, 1 < 2 > 0', contributors: [{givenName: 'Second', familyName: 'Author', email: `${J}second@mail.test`, country: 'DE'}],
                supportingAgencies: ['Agency One', 'Agency Two'], keywords: ['Kw One', 'Kw Two'], participants: [{username: U('se'), role: 'sectionEditor'}]});
            // A12: decisions by the seeding administrator, who is not assigned
            await sub('a2', {...place, title: 'Unassigned decisions', decisions: ['sendExternalReview', 'accept']});
            await sub('a2se', {...place, title: 'Unassigned decisions beside a Section Editor', decisions: ['sendExternalReview', 'accept'], participants: [{username: U('se'), role: 'sectionEditor'}]});
            await sub('dr', {...place, title: 'K4 draft', submitted: false});
            // 20b: every editorial level assigned, plus a copyeditor
            await sub('ed5', {...place, title: 'Five editors', decisions: ['sendExternalReview', 'accept'], participants: [adminMgr, {username: U('mgr'), role: 'manager'}, {username: U('ed'), role: 'editor'},
                {username: U('pe'), role: 'productionEditor'}, {username: U('ge'), role: 'guestEditor'}, {username: U('ce'), role: 'copyeditor'}]});
            // OJS3: the decisions the file names and leaves unnamed, admin assigned
            await sub('o1', {...place, title: 'Revert initial decline', decisions: ['initialDecline', 'revertInitialDecline'], participants: [adminMgr]});
            await sub('o2', {...place, title: 'New and cancelled round', decisions: ['sendExternalReview', 'newExternalReviewRound', 'cancelReviewRound'], participants: [adminMgr]});
            await sub('o3', {...place, title: 'Back a stage', decisions: ['sendExternalReview', 'accept', 'sendToProduction', 'backFromProduction', 'backFromCopyediting'], participants: [adminMgr]});
            await sub('o4', {...place, title: 'Revert decline', decisions: ['sendExternalReview', 'decline', 'revertDecline', 'requestRevisions', 'resubmit'], participants: [adminMgr]});
            await sub('o5', {...place, title: 'Skip review seeded', decisions: ['skipExternalReview'], participants: [adminMgr]});
            // 20c statuses
            await sub('st1', {...place, title: 'Status submission'});
            await sub('st3', {...place, title: 'Status review', decisions: ['sendExternalReview']});
            await sub('st4', {...place, title: 'Status copyediting', decisions: ['sendExternalReview', 'accept']});
            await sub('st5', {...place, title: 'Status production', decisions: ['sendExternalReview', 'accept', 'sendToProduction']});
            await sub('st6', {...place, title: 'Status published', published: true, issue: {volume: 1, number: 1, year: 2026}});
            await sub('st7', {...place, title: 'Status declined', decisions: ['initialDecline']});
            await sub('st8', {...place, title: 'Status scheduled', published: true, issue: {volume: 1, number: 2, year: 2026}});
            // "each read from its current version": a new version made on screen and moved to "Reviews"
            await sub('v1', {...place, title: 'Versioned', published: true, issue: {volume: 1, number: 1, year: 2026}});
        }
        if (isOMP) {
            // td13: one book, one author; categories for "one entry per line"
            await sub('b1', {...place, title: 'One author book', categories: ['cat1', 'cat2']});
            await sub('b2', {...place, title: 'Internal decline reverted', decisions: ['sendInternalReview', 'declineInternal', 'revertDeclineInternal'], participants: [adminMgr]});
            await sub('a2', {...place, title: 'Unassigned decisions', decisions: ['sendExternalReview', 'accept']});
            await sub('dr', {...place, title: 'K4 draft', submitted: false});
            await sub('o1', {...place, title: 'Revert initial decline', decisions: ['initialDecline', 'revertInitialDecline'], participants: [adminMgr]});
            await sub('o2', {...place, title: 'New and cancelled round', decisions: ['sendExternalReview', 'newExternalReviewRound', 'cancelReviewRound'], participants: [adminMgr]});
            await sub('o3', {...place, title: 'Back a stage', decisions: ['sendExternalReview', 'accept', 'sendToProduction', 'backFromProduction', 'backFromCopyediting'], participants: [adminMgr]});
            await sub('o4', {...place, title: 'Revert decline', decisions: ['sendExternalReview', 'decline', 'revertDecline'], participants: [adminMgr]});
            await sub('o5', {...place, title: 'Skip review seeded', decisions: ['skipExternalReview'], participants: [adminMgr]});
            await sub('st1', {...place, title: 'Status submission'});
            await sub('st2', {...place, title: 'Status internal', decisions: ['sendInternalReview']});
            await sub('st3', {...place, title: 'Status external', decisions: ['sendExternalReview']});
            await sub('st4', {...place, title: 'Status copyediting', decisions: ['sendExternalReview', 'accept']});
            await sub('st5', {...place, title: 'Status production', decisions: ['sendExternalReview', 'accept', 'sendToProduction']});
            await sub('st6', {...place, title: 'Status published', published: true});
            await sub('st7', {...place, title: 'Status declined', decisions: ['initialDecline']});
            await sub('st8', {...place, title: 'Status scheduled', published: true, datePublished: iso(new Date(Date.now() + 30 * 86400000))});
        }
        if (!isOPS) {
            // td11: one round, invited / declined / completed; a second submission
            // (titled to sort first) with two rounds by one reviewer, an accepted
            // review, a cancelled one and a review form.
            const rstage = isOMP ? {stage: 'internal'} : {};
            const first = isOMP ? 'sendInternalReview' : 'sendExternalReview';
            await sub('rw1', {...place, title: 'Zeta reviewed', decisions: [first], reviewRounds: [{...rstage, reviewers: [
                {username: U('rinv'), status: 'invited'}, {username: U('rdec'), status: 'declined'},
                {username: U('rcom'), status: 'completed', comments: 'Zeta comment', ...(isOJS ? {recommendation: 'pendingRevisions'} : {})}]}]});
            await sub('rw2', {...place, title: 'Alpha reviewed', decisions: ['sendExternalReview'], reviewRounds: [
                {reviewers: [{username: U('rtwo'), status: 'completed', comments: 'Round one comment'}, {username: U('racc'), status: 'accepted'},
                    {username: U('rcan'), status: 'invited'}, {username: U('rform'), status: 'completed', reviewForm: 'K4 Form'}]},
                {reviewers: [{username: U('rtwo'), status: 'completed', comments: 'Round two comment'}]}]});
        }
        if (isOJS) {
            // Rule 18: a second journal, initials with a space
            const J2 = tag('u65k4k');
            await app.api.createContext({tag: J2, context: {acronym: 'AB C'}, users: [{username: `${J2}mgr`, roles: ['manager']}]});
            S.second = {path: J2, mgr: `${J2}mgr`};
        }
        if (isOMP) {
            // OMP3: another press with a book of six authors, four editors and
            // five decisions by one editor
            const P2 = tag('u65k4q');
            await app.api.createContext({tag: P2, users: [{username: `${P2}au`, roles: ['author']}, {username: `${P2}ed`, roles: ['editor']}, {username: `${P2}se`, roles: ['sectionEditor']}, {username: `${P2}pe`, roles: ['productionEditor']}]});
            try {
                const r = await app.api.createSubmission({tag: `${P2}big`, context: P2, submitter: `${P2}au`, title: 'Many people book',
                    contributors: [2, 3, 4, 5, 6].map((n) => ({givenName: `Co${n}`, familyName: 'Author', email: `${P2}co${n}@mail.test`})),
                    participants: [adminMgr, {username: `${P2}ed`, role: 'editor'}, {username: `${P2}se`, role: 'sectionEditor'}, {username: `${P2}pe`, role: 'productionEditor'}],
                    decisions: ['sendInternalReview', 'acceptFromInternal', 'requestRevisions', 'resubmit', 'accept', 'sendToProduction']});
                S.second = {path: P2, big: {id: r.submissionId}};
            } catch (e) {
                S.second = {path: P2, error: flat(e.message, 600)};
            }
        }
        saveState(app, S);
        return S;
    }

    let S = loadState(app);
    if (!S) S = await seed();
    const J = S.main.path;
    const U = (k) => `${J}${k}`;
    fact('seeds', {main: J, second: S.second, subs: S.subs});

    // ---- helpers ------------------------------------------------------------
    async function snap(page, name) {
        await idle(page).catch(() => {});
        const s = await screen(page);
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    }
    const sideNavLinks = (page) => page.getByRole('navigation', {name: 'Site Navigation'}).locator('a').evaluateAll((as) => as.map((a) => [a.textContent.replace(/\s+/g, ' ').trim(), (a.getAttribute('href') || '').replace(/^.*index\.php/, '')])).catch(() => []);
    async function classify(page) {
        const main = flat(await page.locator('main').first().innerText().catch(() => page.locator('body').innerText()), 800);
        return {url: rel(page.url()), title: await page.title(), login: (await page.locator('form#login').count()) > 0, denied: main.includes(DENIED), h1: flat(await page.locator('main h1, h1').first().innerText().catch(() => ''), 80), main: main.slice(0, 400)};
    }
    async function reportsPage(page) {
        const main = page.locator('main').first();
        return {
            h1: flat(await main.locator('h1').first().innerText().catch(() => '')),
            paragraphs: (await main.locator('p').allInnerTexts()).map((t) => flat(t, 600)),
            links: await main.locator('a').evaluateAll((as) => as.map((a) => [a.textContent.replace(/\s+/g, ' ').trim(), (a.getAttribute('href') || '').replace(/^.*index\.php/, '')])),
            buttons: (await main.getByRole('button').allInnerTexts()).map((t) => flat(t, 80)),
            inputs: await main.locator('input, select, textarea').count(),
        };
    }
    // Press a report link on the page as it stands; the file, its name, bytes,
    // parsed lines and the page after.
    async function pressReport(page, linkName, label) {
        const urlBefore = page.url();
        const got = [];
        const onResp = (r) => {
            if (/stats\/reports\/report/.test(r.url())) got.push({url: rel(r.url()), status: r.status(), headers: {'content-type': r.headers()['content-type'], 'content-disposition': r.headers()['content-disposition']}});
        };
        page.on('response', onResp);
        const dl = page.waitForEvent('download', {timeout: 90_000});
        dl.catch(() => {});
        const bad = page.waitForResponse((r) => /stats\/reports\/report/.test(r.url()) && r.status() >= 400, {timeout: 90_000}).catch(() => null);
        await page.locator('main').getByRole('link', {name: linkName, exact: true}).click();
        const first = await Promise.race([dl.then((x) => ({d: x})), bad.then((r) => (r ? {bad: r} : null))]);
        if (!first || first.bad) {
            await page.waitForLoadState('load').catch(() => {});
            await sleep(1500);
            page.off('response', onResp);
            const s = await snap(page, `failed-${label}`);
            return {failed: first ? first.bad.status() : 'no download, no error', urlBefore: rel(urlBefore), urlAfter: rel(page.url()), title: await page.title(), pageText: flat(s.text.main || s.text.body || '', 500), aria: flat(JSON.stringify(s.aria), 500), responses: got, rows: []};
        }
        const d = first.d;
        const p = await d.path();
        const buf = fs.readFileSync(p);
        const name = d.suggestedFilename();
        fs.writeFileSync(path.join(filesDir, `${label}-${A}-${name.replace(/[^A-Za-z0-9_.-]+/g, '_')}`), buf);
        await sleep(800);
        page.off('response', onResp);
        const text = buf.toString('utf8');
        const bom = buf.subarray(0, 3).toString('hex') === 'efbbbf';
        const body = bom ? text.slice(1) : text;
        const rows = parseCsv(body);
        const endsWithNewline = body.endsWith('\n');
        return {file: name, bytes: buf.length, bom, rows, endsWithNewline, lines: body.split('\n').length, urlBefore: rel(urlBefore), urlAfter: rel(page.url()), responses: got};
    }
    // A fresh browser per download (the browser may reuse an earlier file).
    async function downloadAs(user, linkName, label, {ctx = J, snapName} = {}) {
        const {page, close} = await launch(app);
        try {
            await signIn(page, user, {contextPath: ctx});
            await page.goto(app.url(`/index.php/${ctx}/stats/reports`));
            await idle(page);
            if (snapName) await snap(page, snapName);
            const r = await pressReport(page, linkName, label);
            if (snapName) {
                const after = await snap(page, `${snapName}-after`);
                r.pageAfterSame = flat(after.text.main, 2000);
            }
            return r;
        } finally {
            await close();
        }
    }
    const header = (r) => (r && r.rows && r.rows[0]) || [];
    const byCol = (r, rowIdx) => Object.fromEntries(header(r).map((h, i) => [h, (r.rows[rowIdx] || [])[i]]));
    const nonEmpty = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));

    // ---- line 41: who opens "Reports" ---------------------------------------
    if (on('access')) {
        await step('access', async () => {
            const {page, close} = await launch(app);
            const out = {};
            try {
                for (const k of ACCESS[A]) {
                    const who = k === 'admin' ? 'admin' : k ? U(k) : null;
                    if (who) await signIn(page, who, {contextPath: J});
                    else await signOut(page);
                    const e = {};
                    if (who) {
                        await page.goto(app.url(`/index.php/${J}/submissions`));
                        await idle(page);
                        e.nav = (await sideNavLinks(page)).filter(([t, h]) => /stats|Statistics|Reports/i.test(h + t));
                    }
                    await page.goto(app.url(`/index.php/${J}/stats/reports`));
                    await idle(page);
                    e.page = await classify(page);
                    if (!e.page.denied && !e.page.login) e.reports = await reportsPage(page);
                    await snap(page, `acc-${k || 'out'}-reports`);
                    // the file address itself, as the page's first link names it
                    const first = isOJS ? 'ArticleReportPlugin' : isOMP ? 'MonographReportPlugin' : null;
                    if (first && (e.page.denied || e.page.login)) {
                        await page.goto(app.url(`/index.php/${J}/stats/reports/report?pluginName=${first}`)).catch((x) => (e.fileAddressError = flat(x.message, 120)));
                        await idle(page);
                        e.fileAddress = await classify(page);
                    }
                    out[k || 'out'] = e;
                }
                await signOut(page);
            } finally {
                await close();
            }
            fact('access', out);
        });
    }

    // ---- Fields "Reports", Rules 18–19 --------------------------------------
    if (on('page')) {
        await step('page', async () => {
            const out = {};
            const {page, close} = await launch(app);
            try {
                await signIn(page, U('mgr'), {contextPath: J});
                await page.goto(app.url(`/index.php/${J}/submissions`));
                await idle(page);
                // from the side menu: the "Statistics" group opened, then its "Reports"
                const nav = page.getByRole('navigation', {name: 'Site Navigation'});
                const link = nav.locator('a[href$="/stats/reports"]');
                out.navReportsLinks = await link.count();
                if (out.navReportsLinks) {
                    if (!(await link.first().isVisible())) {
                        await nav.locator('a, button').filter({hasText: /^\s*Statistics\s*$/}).first().click();
                        await sleep(600);
                    }
                    out.navReportsVisible = await link.first().isVisible();
                    out.navReportsText = flat(await link.first().innerText());
                    await link.first().click();
                    await page.waitForURL(/stats\/reports/, {timeout: T, waitUntil: 'commit'});
                    await idle(page);
                }
                out.fromMenu = await classify(page);
                const s = await snap(page, 'page-reports');
                out.page = await reportsPage(page);
                out.tabTitle = await page.title();
                out.headerText = flat(s.text.header, 600);
                await loc(page, 'Reports page heading', page.locator('main h1'));
                await loc(page, 'Reports page report links', page.locator('main .app__contentPanel a'));
                // each link but COUNTER
                out.files = {};
                const names = out.page.links.map(([t]) => t).filter((t) => t && t !== 'COUNTER Reports');
                for (const n of names) {
                    const r = await pressReport(page, n, `page-${n.replace(/\W+/g, '')}`);
                    const after = await screen(page);
                    if (r.failed) {
                        out.files[n] = r;
                        await page.goto(app.url(`/index.php/${J}/stats/reports`));
                        await idle(page);
                        continue;
                    }
                    out.files[n] = {file: r.file, bom: r.bom, header: header(r), lineCount: r.rows.length, urlBefore: r.urlBefore, urlAfter: r.urlAfter, responses: r.responses,
                        pageUnchanged: flat(after.text.main, 3000) === flat(s.text.main, 3000), endsWithNewline: r.endsWithNewline};
                }
                await snap(page, 'page-reports-after-downloads');
                // COUNTER Reports (OJS)
                if (out.page.links.some(([t]) => t === 'COUNTER Reports')) {
                    await page.locator('main').getByRole('link', {name: 'COUNTER Reports', exact: true}).click();
                    await idle(page);
                    const c = await snap(page, 'page-counter');
                    out.counter = {...(await classify(page)), text: flat(c.text.main, 800)};
                    await page.goBack();
                    await idle(page);
                    out.counterBack = rel(page.url());
                }
                // a report address naming no report, and naming none at all
                for (const [k, q] of [['unknown', '?pluginName=NoSuchReport'], ['empty', '?pluginName='], ['bare', ''], ['lower', `?pluginName=${isOJS ? 'articlereportplugin' : isOMP ? 'monographreportplugin' : 'x'}`]]) {
                    const resp = await page.goto(app.url(`/index.php/${J}/stats/reports/report${q}`)).catch((x) => ({err: x.message}));
                    await idle(page);
                    const n = await snap(page, `page-noreport-${k}`);
                    out[`noReport_${k}`] = {status: resp && resp.status ? resp.status() : resp, ...(await classify(page)), notices: flat(await page.locator('[role="status"], [role="alert"], .pkpNotification, .app__notifications').allInnerTexts().then((x) => x.join(' | ')), 300), mainSame: flat(n.text.main, 3000) === flat(s.text.main, 3000)};
                }
                // Settings › Website › Plugins: the "Report Plugins" rows
                await page.goto(app.url(`/index.php/${J}/management/settings/website`));
                await idle(page);
                await page.locator('#plugins-button').click().catch(() => {});
                await sleep(1500);
                await idle(page);
                const grid = page.locator('[id^="component-grid-settings-plugins-settingsplugingrid"]').first();
                await grid.waitFor({timeout: T}).catch(() => {});
                const group = grid.locator('tbody').filter({hasText: 'Report Plugins'}).first();
                out.pluginRows = await group.locator('tr').evaluateAll((trs) => trs.map((tr) => {
                    const cb = tr.querySelector('input[type="checkbox"]');
                    return {id: tr.id, cls: tr.className, text: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 160), checkbox: cb ? {checked: cb.checked, disabled: cb.disabled} : null, links: [...tr.querySelectorAll('a')].map((a) => a.textContent.trim()).filter(Boolean)};
                })).catch((x) => [{error: flat(x.message, 200)}]);
                await snap(page, 'page-plugins');
                // a report row's own controls: its arrow, then its "Reports" link
                const rowIds = out.pluginRows.filter((r) => r.id && r.checkbox).map((r) => r.id);
                out.pluginRowIds = rowIds;
                if (rowIds.length) {
                    const row = page.locator(`[id="${rowIds[0]}"]`);
                    const cb = row.locator('input[type="checkbox"]');
                    if (await cb.count()) {
                        await cb.click({timeout: 3000}).catch((x) => (out.pluginBoxClick = flat(x.message, 150)));
                        await sleep(800);
                        out.pluginBoxAfterClick = await cb.evaluate((b) => ({checked: b.checked, disabled: b.disabled}));
                    }
                    const arrow = row.locator('a.show_extras');
                    if (await arrow.count()) {
                        await arrow.click();
                        await sleep(800);
                        const actions = page.locator(`[id="${rowIds[0]}"] + tr`);
                        out.pluginRowActions = (await actions.locator('a').allInnerTexts()).map((t) => flat(t, 40));
                        await snap(page, 'page-plugins-row-open');
                        const rl = actions.getByRole('link', {name: 'Reports', exact: true});
                        if (await rl.count()) {
                            await rl.click();
                            await page.waitForURL(/stats\/reports/, {timeout: T, waitUntil: 'commit'}).catch(() => {});
                            await idle(page);
                            await sleep(1000);
                            out.pluginReportsLink = await classify(page);
                            await snap(page, 'page-plugins-reports-link');
                        }
                    }
                }
                await signOut(page);
                // Rule 18: other journals of the installation list the same links
                const others = [];
                if (S.second && S.second.mgr) others.push([S.second.path, S.second.mgr]);
                others.push(['publicknowledge', 'manager.maya']);
                out.others = {};
                for (const [ctx, who] of others) {
                    await signIn(page, who, {contextPath: ctx});
                    await page.goto(app.url(`/index.php/${ctx}/stats/reports`));
                    await idle(page);
                    const r = await reportsPage(page).catch((x) => ({error: flat(x.message, 100)}));
                    out.others[ctx] = {...r, cls: await classify(page)};
                    await snap(page, `page-reports-${ctx === 'publicknowledge' ? 'pk' : 'second'}`);
                    if (ctx !== 'publicknowledge' && isOJS) {
                        const f = await pressReport(page, 'Articles Report', 'second-articles');
                        out.others[ctx].articlesFile = f.file;
                    }
                    await signOut(page);
                }
            } finally {
                await close();
            }
            fact('page', out);
        });
    }

    // ---- Rule 20, A12, OJS1–OJS3 (OJS) --------------------------------------
    if (on('articles') && isOJS) {
        const {DecisionPage} = require(path.join(REPO, 'apps/ojs/playwright/pages/ReviewStagePages.js'));
        // td10: the Section Editor records "Accept and Skip Review" on screen
        if (!S.skipDone) {
            await step('articles-skip', async () => {
                const {page, close} = await launch(app);
                try {
                    await signIn(page, U('se'), {contextPath: J});
                    await page.goto(app.url(`/index.php/${J}/dashboard/editorial?workflowSubmissionId=${S.subs.a1.id}`));
                    await idle(page);
                    await page.getByRole('heading', {name: /^Workflow:/}).waitFor({timeout: T});
                    await sleep(1000);
                    await snap(page, 'art-a1-workflow-se');
                    await page.getByRole('button', {name: 'Accept and Skip Review', exact: true}).click();
                    await page.waitForURL(/decision\/record/, {timeout: T, waitUntil: 'commit'});
                    await idle(page);
                    await snap(page, 'art-a1-decision');
                    await new DecisionPage(page).completeAll();
                    await snap(page, 'art-a1-after-decision');
                    S.skipDone = psql(app, `select decision, editor_id, date_decided from edit_decisions where submission_id=${S.subs.a1.id} order by edit_decision_id`);
                    saveState(app, S);
                } finally {
                    await close();
                }
                fact('articles: skip recorded', S.skipDone);
            });
        }
        // "each read from its current version": a new version of v1, moved to "Reviews", not published
        if (!S.versionDone) {
            await step('articles-version', async () => {
                const v1 = S.subs.v1;
                const {page, close} = await launch(app);
                const out = {};
                try {
                    await signIn(page, U('mgr'), {contextPath: J});
                    await page.goto(app.url(`/index.php/${J}/dashboard/editorial?workflowSubmissionId=${v1.id}&workflowMenuKey=publication_${v1.publicationId}_titleAbstract`));
                    await idle(page);
                    const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
                    await link.waitFor({state: 'visible', timeout: T});
                    await sleep(1000);
                    await link.click();
                    const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
                    const hasWin = await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: 10000}).then(() => true).catch(() => false);
                    let vr;
                    if (hasWin) {
                        await idle(page);
                        await sleep(600);
                        for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
                            const el = w.locator(sel);
                            if ((await el.isVisible().catch(() => false)) && !(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {});
                        }
                        const vw = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T});
                        await w.getByRole('button', {name: 'Confirm', exact: true}).click();
                        vr = await vw;
                    } else {
                        const conf = page.getByRole('dialog').filter({hasText: /version/i}).last();
                        const vw = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T});
                        await conf.getByRole('button', {name: /^(Yes|OK|Confirm|Create New Version)$/}).last().click();
                        vr = await vw;
                    }
                    out.versionStatus = vr.status();
                    const pubs = psql(app, `select publication_id, status from publications where submission_id=${v1.id} order by publication_id`);
                    const np = pubs[pubs.length - 1][0];
                    await idle(page);
                    await sleep(1500);
                    await page.goto(app.url(`/index.php/${J}/dashboard/editorial?workflowSubmissionId=${v1.id}&workflowMenuKey=publication_${np}_titleAbstract`));
                    await idle(page);
                    await sleep(1500);
                    const wf = page.locator('[role="dialog"]:visible').first();
                    await wf.getByRole('link', {name: 'Publication Settings'}).last().click();
                    await idle(page);
                    await sleep(1800);
                    const sel = page.locator('[role="dialog"]:visible').first().locator('select[name="sectionId"]').first();
                    await sel.waitFor({state: 'visible', timeout: T});
                    await sel.selectOption({label: 'Reviews'});
                    const formL = sel.locator('xpath=ancestor::form[1]');
                    const pw = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
                    await formL.getByRole('button', {name: 'Save', exact: true}).last().click();
                    const pr = await pw;
                    out.save = pr ? pr.status() : null;
                    if (!out.save) {
                        const dont = formL.getByRole('radio', {name: /Don't Assign To An Issue/}).first();
                        if (await dont.count()) {
                            await dont.check();
                            const pw2 = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
                            await formL.getByRole('button', {name: 'Save', exact: true}).last().click();
                            const pr2 = await pw2;
                            out.save2 = pr2 ? pr2.status() : null;
                        }
                    }
                    await idle(page);
                    await snap(page, 'art-v1-new-version-moved');
                    out.stored = psql(app, `select publication_id, status, section_id from publications where submission_id=${v1.id} order by publication_id`);
                    out.current = psql(app, `select current_publication_id from submissions where submission_id=${v1.id}`)[0];
                    S.versionDone = out;
                    saveState(app, S);
                } finally {
                    await close();
                }
                fact('articles: version', out);
            });
        }
        await step('articles-download', async () => {
            const r = await downloadAs(U('mgr'), 'Articles Report', 'articles', {snapName: 'art-reports'});
            const h = header(r);
            const rows = r.rows.slice(1).filter((x) => x.length > 1 || x[0] !== '');
            const byId = {};
            for (let i = 1; i < r.rows.length; i++) {
                const o = byCol(r, i);
                byId[o['Submission ID']] = o;
            }
            const keyOf = Object.fromEntries(Object.entries(S.subs).map(([k, s]) => [String(s.id), k]));
            const out = {file: r.file, bom: r.bom, bytes: r.bytes, header: h, dataLines: rows.length, rawLines: r.lines, endsWithNewline: r.endsWithNewline,
                seededIds: Object.fromEntries(Object.entries(S.subs).map(([k, s]) => [k, s.id])),
                strayRows: r.rows.slice(1).filter((x) => !keyOf[x[0]]).map((x) => x.slice(0, 4))};
            out.bySub = {};
            for (const [id, o] of Object.entries(byId)) {
                const k = keyOf[id] || id;
                out.bySub[k] = nonEmpty(o);
            }
            fact('articles: file', out);
            // the "URL" of a1, opened as the manager
            const {page, close} = await launch(app);
            try {
                await signIn(page, U('mgr'), {contextPath: J});
                const u = byId[String(S.subs.a1.id)] && byId[String(S.subs.a1.id)].URL;
                if (u) {
                    await page.goto(u);
                    await idle(page);
                    await sleep(1500);
                    const s = await snap(page, 'art-url-opened');
                    fact('articles: URL opened', {url: rel(u), landed: rel(page.url()), dialogHead: flat(s.text.dialog, 200), h: flat(await page.getByRole('heading', {name: /^Workflow:/}).first().innerText().catch(() => ''), 120)});
                }
            } finally {
                await close();
            }
            fact('articles: decisions stored', psql(app, `select s.submission_id, d.decision, u.username, d.date_decided from edit_decisions d join submissions s on s.submission_id=d.submission_id join users u on u.user_id=d.editor_id where s.context_id=${S.main.id} order by s.submission_id, d.edit_decision_id`));
        });
    }

    // ---- Rule 21 (OJS, OMP) --------------------------------------------------
    const reviewRows = async (label, snapName) => {
        const r = await downloadAs(U('mgr'), 'Review Report', label, {snapName});
        const rows = [];
        for (let i = 1; i < r.rows.length; i++) {
            if (r.rows[i].length === 1 && r.rows[i][0] === '') continue;
            rows.push(byCol(r, i));
        }
        return {file: r.file, bom: r.bom, header: header(r), rows: rows.map((o) => ({sub: o['Submission Title'], id: o['Submission ID'], stage: o.Stage, round: o.Round, reviewer: o.Reviewer, consideration: o.Consideration,
            declined: o.Declined, cancelled: o.Cancelled, respOver: o['Response Overdue Days'], revOver: o['Review Overdue Days'], respDue: o['Response Due Date'], revDue: o['Review Due Date'], rec: o.Recommendation, comments: o['Comments On Submission'],
            given: o['Given Name'], family: o['Family Name'], email: o.Email, country: o.Country, interests: o['Reviewing interests'], assigned: o['Date Assigned'], notified: o['Date Notified'], confirmed: o['Date Confirmed'], completed: o['Date Completed'], acknowledged: o['Date Acknowledged'], reminded: o['Date Reminded']}))};
    };
    const ours = (x) => ({...x, rows: x.rows.filter((r) => r.reviewer && r.reviewer.startsWith(J))});
    if (on('reviews') && !isOPS) {
        await step('reviews-initial', async () => fact('reviews: initial', ours(await reviewRows('reviews0', 'rev-reports'))));
        const openWorkflow = async (page, key) => {
            await page.goto(app.url(`/index.php/${J}/dashboard/editorial?workflowSubmissionId=${S.subs[key].id}`));
            await idle(page);
            await page.getByRole('heading', {name: /^Workflow:/}).waitFor({timeout: T});
            await sleep(1500);
        };
        const reviewerRow = (page, who) => page.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: `${who.toUpperCase()} Rev`});
        const details = (page) => page.getByRole('dialog', {name: /^Review Details:/});
        const settle = async (m) => m.getByRole('button', {name: 'Modify Review', exact: true}).waitFor({state: 'visible', timeout: T}).then(() => sleep(1200));
        if (!S.considerDone) {
            await step('reviews-consider', async () => {
                const out = {};
                const {page, close} = await launch(app);
                try {
                    await signIn(page, U('mgr'), {contextPath: J});
                    await openWorkflow(page, 'rw1');
                    await snap(page, 'rev-rw1-workflow');
                    // Read Review, closed without confirming
                    await reviewerRow(page, 'rcom').getByRole('button', {name: 'Read Review', exact: true}).click();
                    const m = details(page);
                    await m.waitFor({timeout: T});
                    await settle(m);
                    await snap(page, 'rev-rw1-read-open');
                    out.windowButtons = (await m.getByRole('button').allInnerTexts()).map((t) => flat(t, 40));
                    await m.getByRole('button', {name: 'Cancel', exact: true}).click();
                    await m.waitFor({state: 'hidden', timeout: T});
                    await sleep(1000);
                    out.afterRead = psql(app, `select u.username, ra.considered from review_assignments ra join users u on u.user_id=ra.reviewer_id where ra.submission_id=${S.subs.rw1.id} order by 1`);
                } finally {
                    await close();
                }
                out.fileAfterRead = ours(await reviewRows('reviews1-read', null));
                // Mark as Complete
                const b = await launch(app);
                try {
                    const page = b.page;
                    await signIn(page, U('mgr'), {contextPath: J});
                    await openWorkflow(page, 'rw1');
                    await reviewerRow(page, 'rcom').getByRole('button', {name: 'Read Review', exact: true}).click();
                    const m = details(page);
                    await m.waitFor({timeout: T});
                    await settle(m);
                    await m.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
                    const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'});
                    await dlg.waitFor({timeout: T});
                    await dlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
                    await page.getByText('The review has been marked as complete.').first().waitFor({timeout: T});
                    await m.getByRole('button', {name: 'Cancel', exact: true}).click();
                    await m.waitFor({state: 'hidden', timeout: T});
                    await sleep(1000);
                    await snap(page, 'rev-rw1-after-complete');
                    out.afterComplete = psql(app, `select u.username, ra.considered from review_assignments ra join users u on u.user_id=ra.reviewer_id where ra.submission_id=${S.subs.rw1.id} order by 1`);
                } finally {
                    await b.close();
                }
                out.fileAfterComplete = ours(await reviewRows('reviews2-complete', null));
                // Revert Decision
                const c = await launch(app);
                try {
                    const page = c.page;
                    await signIn(page, U('mgr'), {contextPath: J});
                    await openWorkflow(page, 'rw1');
                    const row = reviewerRow(page, 'rcom');
                    out.rowButtonsBeforeRevert = (await row.getByRole('button').allInnerTexts()).map((t) => flat(t, 40));
                    await row.getByRole('button', {name: 'Revert Decision', exact: true}).click();
                    const dlg = page.getByRole('dialog').filter({hasText: 'Unconsider this Review'});
                    await dlg.waitFor({timeout: T});
                    await snap(page, 'rev-rw1-revert-dialog');
                    await dlg.getByRole('button', {name: 'OK', exact: true}).click();
                    await dlg.waitFor({state: 'hidden', timeout: T});
                    await sleep(1500);
                    await snap(page, 'rev-rw1-after-revert');
                    out.afterRevert = psql(app, `select u.username, ra.considered from review_assignments ra join users u on u.user_id=ra.reviewer_id where ra.submission_id=${S.subs.rw1.id} order by 1`);
                } finally {
                    await c.close();
                }
                out.fileAfterRevert = ours(await reviewRows('reviews3-revert', null));
                // confirmed again
                const d = await launch(app);
                try {
                    const page = d.page;
                    await signIn(page, U('mgr'), {contextPath: J});
                    await openWorkflow(page, 'rw1');
                    const row = reviewerRow(page, 'rcom');
                    out.rowButtonsAfterRevert = (await row.getByRole('button').allInnerTexts()).map((t) => flat(t, 40));
                    await row.getByRole('button', {name: 'Read Review', exact: true}).click();
                    const m = details(page);
                    await m.waitFor({timeout: T});
                    await settle(m);
                    await m.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
                    const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'});
                    await dlg.waitFor({timeout: T});
                    await dlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
                    await page.getByText('The review has been marked as complete.').first().waitFor({timeout: T});
                    await m.getByRole('button', {name: 'Cancel', exact: true}).click();
                    await m.waitFor({state: 'hidden', timeout: T});
                    await sleep(1000);
                    out.afterReconfirm = psql(app, `select u.username, ra.considered from review_assignments ra join users u on u.user_id=ra.reviewer_id where ra.submission_id=${S.subs.rw1.id} order by 1`);
                } finally {
                    await d.close();
                }
                out.fileAfterReconfirm = ours(await reviewRows('reviews4-reconfirm', null));
                S.considerDone = true;
                saveState(app, S);
                fact('reviews: consideration', out);
            });
        }
        if (!S.overdueDone) {
            await step('reviews-overdue-cancel', async () => {
                const out = {};
                const {page, close} = await launch(app);
                page.on('dialog', (d) => d.accept().catch(() => {}));
                try {
                    await signIn(page, U('mgr'), {contextPath: J});
                    await openWorkflow(page, 'rw2');
                    // rw2 opens on round 2; its round-1 reviewers are on round 1
                    const r1 = page.getByRole('link', {name: 'Review Round 1', exact: true});
                    if (await r1.count()) {
                        await r1.click();
                        await idle(page);
                        await sleep(1500);
                    }
                    await snap(page, 'rev-rw2-round1');
                    const pickPast = async (who, dates) => {
                        const row = reviewerRow(page, who);
                        await row.getByRole('button', {name: 'More Actions'}).click();
                        await page.getByRole('menu').getByRole('menuitem', {name: 'Edit', exact: true}).click();
                        const modal = page.getByRole('dialog').filter({has: page.locator('form#editReviewForm')}).last();
                        await modal.locator('form#editReviewForm').waitFor({timeout: T});
                        await idle(page);
                        await sleep(800);
                        const res = {};
                        for (const [prefix, daysAgo] of dates) {
                            const d = new Date(Date.now() - daysAgo * 86400000);
                            const input = modal.locator(`input.datepicker[id^="${prefix}"]`);
                            const before = await input.inputValue();
                            await input.click();
                            const picker = page.locator('#ui-datepicker-div');
                            await picker.waitFor({state: 'visible', timeout: T});
                            await picker.locator('select.ui-datepicker-year').selectOption(String(d.getFullYear()));
                            await picker.locator('select.ui-datepicker-month').selectOption(String(d.getMonth()));
                            await picker.locator('td:not(.ui-datepicker-other-month) a').filter({hasText: new RegExp(`^${d.getDate()}$`)}).first().click();
                            await sleep(400);
                            res[prefix] = {before, typed: await input.inputValue(), target: iso(d)};
                        }
                        await snap(page, `rev-rw2-edit-${who}`);
                        await modal.getByRole('button', {name: 'OK', exact: true}).click();
                        await modal.locator('form#editReviewForm').waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
                        await idle(page);
                        await sleep(1500);
                        res.stillOpen = await modal.locator('form#editReviewForm').isVisible().catch(() => false);
                        if (res.stillOpen) {
                            res.errors = flat(await modal.locator('.pkp_form_error, .error, label.error').allInnerTexts().then((x) => x.join(' | ')), 300);
                            await snap(page, `rev-rw2-edit-${who}-refused`);
                        }
                        return res;
                    };
                    const reopen = async () => {
                        await openWorkflow(page, 'rw2');
                        const r1 = page.getByRole('link', {name: 'Review Round 1', exact: true});
                        await r1.click();
                        await idle(page);
                        await sleep(1500);
                    };
                    out.responsePast = await pickPast('rcan', [['responseDueDate', 5]]).catch((e) => ({error: flat(e.message, 200)}));
                    await reopen();
                    out.reviewPast = await pickPast('racc', [['responseDueDate', 10], ['reviewDueDate', 3]]).catch((e) => ({error: flat(e.message, 200)}));
                    await reopen();
                    await snap(page, 'rev-rw2-after-edits');
                    out.fileAfterEdits = ours(await reviewRows('reviews5a-overdue', null));
                    await reopen();
                    // cancel the request whose response is overdue
                    try {
                        const row = reviewerRow(page, 'rcan');
                        await row.getByRole('button', {name: 'More Actions'}).click();
                        out.menu = (await page.getByRole('menu').getByRole('menuitem').allInnerTexts()).map((t) => flat(t, 40));
                        const cancelItem = page.getByRole('menu').getByRole('menuitem', {name: /^Cancel/}).first();
                        out.cancelItem = flat(await cancelItem.innerText().catch(() => ''), 60);
                        await cancelItem.click();
                        await sleep(1500);
                        await idle(page);
                        await snap(page, 'rev-rw2-cancel-window');
                        const w = page.getByRole('dialog').last();
                        out.cancelButtons = (await w.getByRole('button').allInnerTexts()).map((t) => flat(t, 40));
                        const btn = w.getByRole('button', {name: /^Cancel Reviewer$|^Cancel Review$|^OK$/}).last();
                        await btn.click();
                        await sleep(2000);
                        await idle(page);
                        await snap(page, 'rev-rw2-after-cancel');
                    } catch (e) {
                        out.cancelError = flat(e.message, 300);
                    }
                    out.stored = psql(app, `select u.username, ra.round, ra.date_response_due, ra.date_due, ra.date_confirmed, ra.cancelled, ra.declined, ra.considered from review_assignments ra join users u on u.user_id=ra.reviewer_id where ra.submission_id=${S.subs.rw2.id} order by ra.round, 1`);
                } finally {
                    await close();
                }
                out.file = ours(await reviewRows('reviews5-overdue-cancel', null));
                S.overdueDone = true;
                saveState(app, S);
                fact('reviews: overdue and cancelled', out);
            });
        }
    }

    // ---- Rule 22, OJS4 (OJS) ---------------------------------------------------
    if (on('subs') && isOJS) {
        if (!S.countriesDone) {
            await step('subs-countries', async () => {
                const {ProfilePage} = require(path.join(REPO, 'shared/playwright/pages/ProfilePage.js'));
                const out = {};
                const {page, close} = await launch(app);
                page.on('dialog', (d) => d.accept().catch(() => {}));
                try {
                    // Individual "ib", institutional contacts "ja" and "jc" get a country; "ia" and "jb" keep none
                    for (const [k, c] of [['ib', 'CA'], ['ja', 'DE'], ['jc', 'FR']]) {
                        await signIn(page, U(k), {contextPath: J});
                        const pp = new ProfilePage(page, J);
                        await pp.goto('contact');
                        await pp.country().selectOption(c);
                        await pp.save();
                        await sleep(800);
                        out[k] = {country: await pp.country().inputValue(), notice: flat(await pp.form('contact').innerText(), 200).slice(0, 120)};
                        if (k === 'ib') await snap(page, 'subs-profile-country');
                    }
                    await signOut(page);
                } finally {
                    await close();
                }
                out.stored = psql(app, `select username, country from users where username like '${J}%' and (username like '%ia' or username like '%ib' or username like '%ja' or username like '%jb' or username like '%jc') order by 1`);
                S.countriesDone = out;
                saveState(app, S);
                fact('subs: countries', out);
            });
        }
        await step('subs-download', async () => {
            const log0 = serverLogTail(app);
            const r = await downloadAs(U('mgr'), 'Subscriptions Report', 'subscriptions', {snapName: 'subs-reports'});
            await sleep(1500);
            const log = serverLogTail(app, log0.size);
            fact('subs: file', {file: r.file, bom: r.bom, bytes: r.bytes, rows: r.rows, endsWithNewline: r.endsWithNewline, responses: r.responses, pageAfter: r.pageAfterSame && r.pageAfterSame.slice(0, 300),
                serverLog: log.text ? log.text.split('\n').filter((l) => /PHP|Fatal|Uncaught|Error|Warning/i.test(l)).map((l) => flat(l, 400)).slice(0, 12) : log});
            fact('subs: stored', psql(app, `select s.subscription_id, u.username, st.institutional, i.institution_id from subscriptions s join users u on u.user_id=s.user_id join subscription_types st on st.type_id=s.type_id left join institutional_subscriptions i on i.subscription_id=s.subscription_id where s.journal_id=${S.main.id} order by 1`));
        });
    }

    // ---- Rule 23, OMP3, OMP4 (OMP) ---------------------------------------------
    if (on('monograph') && isOMP) {
        await step('monograph', async () => {
            const log0 = serverLogTail(app);
            const r = await downloadAs(U('mgr'), 'Monograph Report', 'monographs', {snapName: 'mono-reports'});
            const log = serverLogTail(app, log0.size);
            const h = header(r);
            const keyOf = Object.fromEntries(Object.entries(S.subs).map(([k, s]) => [String(s.id), k]));
            const bySub = {};
            for (let i = 1; i < r.rows.length; i++) {
                const o = byCol(r, i);
                if (!o.ID) continue;
                bySub[keyOf[o.ID] || o.ID] = nonEmpty(o);
            }
            const maxN = (re) => Math.max(0, ...h.map((c) => (c.match(re) || [0, 0])[1] * 1));
            const cid = S.main.id;
            // what this press needs, and what the installation holds
            const q = (where) => psql(app, `select
                (select coalesce(max(c),0) from (select count(a.author_id) c from submissions s join authors a on a.publication_id=s.current_publication_id ${where} group by s.submission_id) t),
                (select coalesce(max(c),0) from (select count(*) c from edit_decisions d join submissions s on s.submission_id=d.submission_id ${where} group by s.submission_id, d.editor_id) t)`)[0];
            fact('monograph: file', {file: r.file, bom: r.bom, bytes: r.bytes, header: h, dataLines: r.rows.length - 1, endsWithNewline: r.endsWithNewline,
                highest: {author: maxN(/\(Author (\d+)\)/), editor: maxN(/\(Editor (\d+)\)/), decision: maxN(/Decision (\d+) /)},
                thisPress: q(`where s.context_id=${cid}`), installation: q(''), otherPressesWithMoreAuthors: psql(app, `select s.context_id, s.submission_id, count(a.author_id) from submissions s join authors a on a.publication_id=s.current_publication_id where s.context_id<>${cid} group by 1,2 having count(a.author_id) > 1 order by 3 desc limit 5`),
                bySub, serverLog: log.text ? log.text.split('\n').filter((l) => /PHP|Fatal|Uncaught|Error|Warning/i.test(l)).map((l) => flat(l, 400)).slice(0, 12) : log});
            fact('monograph: decisions stored', psql(app, `select s.submission_id, d.decision, u.username, d.date_decided from edit_decisions d join submissions s on s.submission_id=d.submission_id join users u on u.user_id=d.editor_id where s.context_id=${cid} order by s.submission_id, d.edit_decision_id`));
            fact('monograph: editors per book, this press and the installation', psql(app, `select (select max(c) from (select count(distinct sa.user_id) c from stage_assignments sa join submissions s on s.submission_id=sa.submission_id join user_groups g on g.user_group_id=sa.user_group_id where g.role_id in (16,17) and s.context_id=${cid} group by s.submission_id) t), (select max(c) from (select count(distinct sa.user_id) c from stage_assignments sa join user_groups g on g.user_group_id=sa.user_group_id where g.role_id in (16,17) group by sa.submission_id) t)`));
        });
    }


    // ---- more axes, after the first reads ------------------------------------
    // OJS3/"Cancel Review Round": recorded on screen by the assigned administrator
    if (on('cancelround') && !isOPS && !S.cancelRoundDone) {
        await step('cancelround', async () => {
            const {DecisionPage} = require(path.join(REPO, 'apps/ojs/playwright/pages/ReviewStagePages.js')); // app-neutral wizard reader
            const out = {};
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'admin', {contextPath: J});
                await page.goto(app.url(`/index.php/${J}/dashboard/editorial?workflowSubmissionId=${S.subs.o2.id}`));
                await idle(page);
                await page.getByRole('heading', {name: /^Workflow:/}).waitFor({timeout: T});
                await sleep(1500);
                const s0 = await snap(page, 'cr-o2-workflow');
                out.buttons = (await page.getByRole('dialog').last().getByRole('button').allInnerTexts()).map((t) => flat(t, 50)).filter((t) => /Round|Decline|Revision|Accept|Review/.test(t));
                const b = page.getByRole('button', {name: 'Cancel Review Round', exact: true});
                out.offered = await b.count();
                if (out.offered) {
                    await b.first().click();
                    await page.waitForURL(/decision\/record/, {timeout: T, waitUntil: 'commit'});
                    await idle(page);
                    await snap(page, 'cr-o2-decision');
                    await (DecisionPage ? new DecisionPage(page).completeAll() : null);
                    await snap(page, 'cr-o2-after');
                }
                out.stored = psql(app, `select d.decision, u.username from edit_decisions d join users u on u.user_id=d.editor_id where d.submission_id=${S.subs.o2.id} order by d.edit_decision_id`);
                S.cancelRoundDone = out;
                saveState(app, S);
            } finally {
                await close();
            }
            fact('cancelround', out);
        });
    }
    // OJS1: the agencies are filled in on the submission's "Metadata" page
    if (on('agencies') && isOJS) {
        await step('agencies', async () => {
            const {page, close} = await launch(app);
            try {
                await signIn(page, U('mgr'), {contextPath: J});
                await page.goto(app.url(`/index.php/${J}/dashboard/editorial?workflowSubmissionId=${S.subs.a1.id}&workflowMenuKey=publication_${S.subs.a1.publicationId}_metadata`));
                await idle(page);
                await sleep(2500);
                const s = await snap(page, 'agencies-a1-metadata');
                const d = s.text.dialog || '';
                fact('agencies: metadata page', {hasAgencyOne: d.includes('Agency One'), hasAgencyTwo: d.includes('Agency Two'), hasKw: d.includes('Kw One'), excerpt: flat(d.slice(Math.max(0, d.indexOf('Supporting Agencies') - 20), d.indexOf('Supporting Agencies') + 200), 300)});
            } finally {
                await close();
            }
        });
    }
    // 21d: a review form answered by the reviewer on screen ("rinv" on rw1:
    // the form attached in the row's "Edit" window, then the reviewer's wizard)
    if (on('formreview') && !isOPS && !S.formDone) {
        await step('formreview', async () => {
            const out = {};
            const a = await launch(app);
            try {
                const page = a.page;
                await signIn(page, U('mgr'), {contextPath: J});
                await page.goto(app.url(`/index.php/${J}/dashboard/editorial?workflowSubmissionId=${S.subs.rw1.id}`));
                await idle(page);
                await page.getByRole('heading', {name: /^Workflow:/}).waitFor({timeout: T});
                await sleep(1500);
                const row = page.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: 'RINV Rev'});
                await row.getByRole('button', {name: 'More Actions'}).click();
                await page.getByRole('menu').getByRole('menuitem', {name: 'Edit', exact: true}).click();
                const modal = page.getByRole('dialog').filter({has: page.locator('form#editReviewForm')}).last();
                await modal.locator('form#editReviewForm').waitFor({timeout: T});
                await idle(page);
                await sleep(800);
                await modal.locator('select[name="reviewFormId"], select[id^="reviewFormId"]').first().selectOption({label: 'K4 Form'});
                await modal.getByRole('button', {name: 'OK', exact: true}).click();
                await modal.locator('form#editReviewForm').waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
                await idle(page);
                out.attached = psql(app, `select ra.review_form_id from review_assignments ra join users u on u.user_id=ra.reviewer_id where ra.submission_id=${S.subs.rw1.id} and u.username='${U('rinv')}'`);
            } finally {
                await a.close();
            }
            const b = await launch(app);
            b.page.on('dialog', (d) => d.accept().catch(() => {}));
            try {
                const page = b.page;
                await signIn(page, U('rinv'), {contextPath: J});
                await page.goto(app.url(`/index.php/${J}/reviewer/submission/${S.subs.rw1.id}`));
                await idle(page);
                await sleep(1500);
                const privacy = page.locator('input[name="privacyConsent"]').filter({visible: true});
                if (await privacy.count()) await privacy.check();
                await page.getByRole('button', {name: /Accept Review, Continue to Step #2/}).click();
                await idle(page);
                await sleep(1500);
                await page.getByRole('button', {name: 'Continue to Step #3'}).filter({visible: true}).first().click();
                await idle(page);
                await sleep(2000);
                await snap(page, 'form-step3');
                const ta = page.locator('textarea[name^="reviewFormResponses"]').filter({visible: true}).first();
                await ta.fill('Answer & detail <b>bold</b>\nSecond line');
                const rec = page.locator('select[id="reviewerRecommendationId"]');
                if (await rec.count()) await rec.selectOption({label: 'Accept Submission'});
                await page.getByRole('button', {name: 'Submit Review', exact: true}).click();
                await page.getByRole('button', {name: 'OK', exact: true}).click();
                await page.getByRole('heading', {name: 'Review Submitted'}).waitFor({timeout: T});
                await snap(page, 'form-submitted');
                out.submitted = true;
            } finally {
                await b.close();
            }
            const r = await reviewRows('reviews6-form', null);
            out.row = r.rows.filter((x) => x.reviewer === U('rinv'));
            S.formDone = true;
            saveState(app, S);
            fact('formreview', out);
        });
    }
    // Rule 22, the other end: every institutional contact with a country
    if (on('subs2') && isOJS) {
        await step('subs2', async () => {
            const {ProfilePage} = require(path.join(REPO, 'shared/playwright/pages/ProfilePage.js'));
            if (!S.jbCountry) {
                const {page, close} = await launch(app);
                page.on('dialog', (d) => d.accept().catch(() => {}));
                try {
                    await signIn(page, U('jb'), {contextPath: J});
                    const pp = new ProfilePage(page, J);
                    await pp.goto('contact');
                    await pp.country().selectOption('IT');
                    await pp.save();
                    S.jbCountry = await pp.country().inputValue();
                    saveState(app, S);
                } finally {
                    await close();
                }
            }
            const r = await downloadAs(U('mgr'), 'Subscriptions Report', 'subscriptions-all-countries', {snapName: 'subs2-reports'});
            fact('subs2: file with every contact country', {jbCountry: S.jbCountry, file: r.file, bom: r.bom, failed: r.failed, rows: r.rows, endsWithNewline: r.endsWithNewline});
        });
    }
    // OMP3 decisions, OJS2's press twin
    if (on('mono2') && isOMP) {
        await step('mono2', async () => {
            if (!S.mono2) {
                const P2 = S.second.path;
                const o = {};
                try {
                    o.many = (await app.api.createSubmission({tag: `${P2}dec7`, context: P2, submitter: `${P2}au`, title: 'Seven decisions', participants: [{username: 'admin', role: 'manager'}],
                        decisions: ['sendExternalReview', 'requestRevisions', 'resubmit', 'requestRevisions', 'resubmit', 'accept', 'sendToProduction']})).submissionId;
                } catch (e) {
                    o.manyError = flat(e.message, 300);
                }
                try {
                    const r = await app.api.createSubmission({tag: `${J}amp`, context: J, submitter: U('au'), title: 'Bread & Butter', abstract: 'Salt & Pepper, 1 < 2 > 0', series: 'one'});
                    S.subs.amp = {id: r.submissionId, publicationId: r.publicationId};
                } catch (e) {
                    o.ampError = flat(e.message, 300);
                }
                S.mono2 = o;
                saveState(app, S);
            }
            const r = await downloadAs(U('mgr'), 'Monograph Report', 'monographs2', {snapName: 'mono2-reports'});
            const h = header(r);
            const maxN = (re) => Math.max(0, ...h.map((c) => (c.match(re) || [0, 0])[1] * 1));
            const amp = r.rows.find((x) => x[0] === String(S.subs.amp && S.subs.amp.id));
            const cid = S.main.id;
            const q = (where) => psql(app, `select
                (select coalesce(max(c),0) from (select count(a.author_id) c from submissions s join authors a on a.publication_id=s.current_publication_id ${where} group by s.submission_id) t),
                (select coalesce(max(c),0) from (select count(*) c from edit_decisions d join submissions s on s.submission_id=d.submission_id ${where} group by s.submission_id, d.editor_id) t)`)[0];
            fact('mono2', {seeds: S.mono2, file: r.file, highest: {author: maxN(/\(Author (\d+)\)/), editor: maxN(/\(Editor (\d+)\)/), decision: maxN(/Decision (\d+) /)}, thisPress: q(`where s.context_id=${cid}`), installation: q(''),
                ampTitle: amp ? amp[1] : null, ampAbstract: amp ? amp[2] : null, cancelRound: (r.rows.find((x) => x[0] === String(S.subs.o2.id)) || []).filter(Boolean).slice(-6)});
        });
    }


    // OJS1 with the item switched on, OJS2 with "<" and ">": a journal whose
    // Metadata settings offer "Supporting Agencies"
    if (on('agencies2') && isOJS) {
        await step('agencies2', async () => {
            if (!S.j3) {
                const J3 = tag('u65k4m');
                await app.api.createContext({tag: J3, metadata: {agencies: 'enable', keywords: 'request'}, users: [{username: `${J3}mgr`, roles: ['manager']}, {username: `${J3}au`, roles: ['author']}]});
                const r = await app.api.createSubmission({tag: `${J3}a`, context: J3, submitter: `${J3}au`, title: 'A < B > C & D', supportingAgencies: ['Agency One', 'Agency Two'], keywords: ['Kw One', 'Kw Two']});
                S.j3 = {path: J3, sub: {id: r.submissionId, publicationId: r.publicationId}};
                saveState(app, S);
            }
            const J3 = S.j3.path;
            const {page, close} = await launch(app);
            const out = {};
            try {
                await signIn(page, `${J3}mgr`, {contextPath: J3});
                await page.goto(app.url(`/index.php/${J3}/dashboard/editorial?workflowSubmissionId=${S.j3.sub.id}&workflowMenuKey=publication_${S.j3.sub.publicationId}_metadata`));
                await idle(page);
                await sleep(2500);
                const sn = await snap(page, 'agencies2-metadata');
                const d = sn.text.dialog || '';
                out.metadataPage = {hasSupportingAgencies: d.includes('Supporting Agencies'), hasAgencyOne: d.includes('Agency One'), hasAgencyTwo: d.includes('Agency Two'), titleShown: flat(d.slice(d.indexOf('A <'), d.indexOf('A <') + 20), 40)};
            } finally {
                await close();
            }
            const r = await downloadAs(`${J3}mgr`, 'Articles Report', 'articles-agencies', {ctx: J3, snapName: 'agencies2-reports'});
            const o = byCol(r, 1);
            out.file = r.file;
            out.row = {Title: o.Title, Keywords: o.Keywords, 'Supporting Agencies': o['Supporting Agencies']};
            fact('agencies2', out);
        });
    }


    // Actors row 41's other entry point: each report row's "Reports" link on
    // Settings › Website › "Plugins"
    if (on('pluginlink') && !isOPS) {
        await step('pluginlink', async () => {
            const out = {};
            const {page, close} = await launch(app);
            try {
                await signIn(page, U('mgr'), {contextPath: J});
                const names = isOJS ? ['ArticleReportPlugin', 'CounterReportPlugin', 'ReviewReportPlugin'] : ['MonographReportPlugin', 'ReviewReportPlugin'];
                for (const n of names) {
                    await page.goto(app.url(`/index.php/${J}/management/settings/website`));
                    await idle(page);
                    await page.locator('#plugins-button').click().catch(() => {});
                    await sleep(1500);
                    await idle(page);
                    const id = `component-grid-settings-plugins-settingsplugingrid-category-reports-row-${n}`;
                    const row = page.locator(`[id="${id}"]`);
                    await row.waitFor({timeout: T});
                    await row.locator('a.show_extras').click();
                    await sleep(800);
                    const link = page.locator(`[id="${id}-control-row"]`).getByRole('link', {name: 'Reports', exact: true});
                    const before = rel(page.url());
                    const dl = page.waitForEvent('download', {timeout: 20_000}).catch(() => null);
                    const nav = page.waitForURL((u) => /stats\/reports/.test(String(u)), {timeout: 20_000, waitUntil: 'commit'}).then(() => 'navigated').catch(() => null);
                    await link.click();
                    const d = await dl;
                    const nv = await nav;
                    await idle(page).catch(() => {});
                    await sleep(1000);
                    const s2 = await snap(page, `pluginlink-${n}`);
                    out[n] = {before, after: rel(page.url()), download: d ? d.suggestedFilename() : null, navigated: nv, h1: flat(await page.locator('main h1, h1').first().innerText().catch(() => ''), 60), main: flat(s2.text.main, 160)};
                }
            } finally {
                await close();
            }
            fact('pluginlink', out);
        });
    }
    // 21a "Cancelled": the accepted request cancelled from its row menu
    if (on('cancelreviewer') && !isOPS && !S.cancelReviewerDone) {
        await step('cancelreviewer', async () => {
            const out = {};
            const {page, close} = await launch(app);
            page.on('dialog', (d) => d.accept().catch(() => {}));
            try {
                await signIn(page, U('mgr'), {contextPath: J});
                await page.goto(app.url(`/index.php/${J}/dashboard/editorial?workflowSubmissionId=${S.subs.rw2.id}`));
                await idle(page);
                await page.getByRole('heading', {name: /^Workflow:/}).waitFor({timeout: T});
                await sleep(1500);
                await page.getByRole('link', {name: 'Review Round 1', exact: true}).click();
                await idle(page);
                await sleep(1500);
                for (const who of ['racc', 'rcan']) {
                    const row = page.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: `${who.toUpperCase()} Rev`});
                    await row.getByRole('button', {name: 'More Actions'}).click();
                    await sleep(500);
                    out[`menu_${who}`] = (await page.getByRole('menu').getByRole('menuitem').allInnerTexts()).map((t) => flat(t, 40));
                    await row.getByRole('button', {name: 'More Actions'}).click();
                    await sleep(500);
                }
                const row = page.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: 'RACC Rev'});
                await row.getByRole('button', {name: 'More Actions'}).click();
                const item = page.getByRole('menu').getByRole('menuitem', {name: /Cancel/}).first();
                if (await item.count()) {
                    out.item = flat(await item.innerText(), 40);
                    await item.click();
                    await sleep(1500);
                    await idle(page);
                    const w = page.getByRole('dialog').last();
                    await snap(page, 'cancelrev-window');
                    out.windowButtons = (await w.getByRole('button').allInnerTexts()).map((t) => flat(t, 40));
                    await w.getByRole('button', {name: /^Cancel Reviewer$|^Cancel Review$/}).last().click();
                    await sleep(2500);
                    await idle(page);
                    await snap(page, 'cancelrev-after');
                }
                out.stored = psql(app, `select u.username, ra.cancelled, ra.declined from review_assignments ra join users u on u.user_id=ra.reviewer_id where ra.submission_id=${S.subs.rw2.id} order by 1`);
            } finally {
                await close();
            }
            const r = ours(await reviewRows('reviews7-cancelled', null));
            out.rows = r.rows.filter((x) => x.sub === 'Alpha reviewed').map((x) => [x.round, x.reviewer.slice(J.length), x.cancelled, x.declined, x.revOver]);
            S.cancelReviewerDone = true;
            saveState(app, S);
            fact('cancelreviewer', out);
        });
    }


    // Rule 23 "Identifiers": two identification codes typed on a format's
    // "Metadata" tab (Publication Formats › the format's "Edit")
    if (on('identifiers') && isOMP) {
        await step('identifiers', async () => {
            const out = {};
            if (!S.idf) {
                const r = await app.api.createSubmission({tag: `${J}idf`, context: J, submitter: U('au'), title: 'Identified book', series: 'one', publicationFormats: [{name: 'PDF'}]});
                S.idf = {id: r.submissionId, publicationId: r.publicationId};
                saveState(app, S);
            }
            if (!S.idfCodes) {
                const {page, close} = await launch(app);
                try {
                    await signIn(page, U('mgr'), {contextPath: J});
                    for (const [label, fallback, value] of [['ISBN-13 (15)', 1, '9780306406157'], ['ISBN-10 (02)', 2, '0306406152']]) {
                        await page.goto(app.url(`/index.php/${J}/dashboard/editorial?workflowSubmissionId=${S.idf.id}&workflowMenuKey=publication_${S.idf.publicationId}_titleAbstract`));
                        await idle(page);
                        await sleep(1500);
                        await page.getByRole('link', {name: 'Publication Formats', exact: true}).last().click();
                        await idle(page);
                        await sleep(1500);
                        const row = page.locator('tr.gridRow').filter({hasText: 'PDF'}).first();
                        await row.locator('a.show_extras').first().click();
                        await sleep(600);
                        const id = await row.getAttribute('id');
                        await page.locator(`tr#${id} + tr`).getByRole('link', {name: 'Edit', exact: true}).first().click();
                        await sleep(2000);
                        await idle(page);
                        const d = page.getByRole('dialog').last();
                        await d.getByRole('tab', {name: 'Metadata', exact: true}).first().click();
                        await sleep(2000);
                        await idle(page);
                        await d.getByRole('link', {name: 'Add Code', exact: true}).first().click();
                        await sleep(2000);
                        await idle(page);
                        const w = page.getByRole('dialog').last();
                        await w.locator('select[name="code"]').selectOption({label}).catch(async () => w.locator('select[name="code"]').selectOption({index: fallback}));
                        await w.locator('input[name="value"]').fill(value);
                        await snap(page, `idf-code-${fallback}`);
                        await w.getByRole('button', {name: /^(OK|Save)$/}).last().click();
                        await sleep(2000);
                        await idle(page);
                        out[`after${fallback}`] = flat(await d.innerText().catch(() => ''), 500);
                    }
                    await snap(page, 'idf-codes');
                } finally {
                    await close();
                }
                S.idfCodes = psql(app, `select ic.code, ic.value from identification_codes ic join publication_formats pf on pf.publication_format_id=ic.publication_format_id where pf.publication_id=${S.idf.publicationId}`);
                saveState(app, S);
            }
            out.stored = S.idfCodes;
            const r = await downloadAs(U('mgr'), 'Monograph Report', 'monographs3', {snapName: 'idf-reports'});
            const row = r.rows.findIndex((x) => x[0] === String(S.idf.id));
            const o2 = r.rows.findIndex((x) => x[0] === String(S.subs.o2.id));
            out.identifiers = row > 0 ? byCol(r, row).Identifiers : null;
            out.o2 = o2 > 0 ? nonEmpty(byCol(r, o2)) : null;
            fact('identifiers', out);
        });
    }

    fs.writeFileSync(factsFile, JSON.stringify(facts, null, 2));
});
