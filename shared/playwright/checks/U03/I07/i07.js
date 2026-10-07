// U03 claim check I07 (housekeeping 2026-10-07): the incidental rows for U03 in
// docs/tracking/incidentals.md. Chunk: .reports/hk07/chunks/U03.md.
//   row 42  A15: "Please enter a valid URL." under Profile › Public › "Homepage URL" after the corrected
//           address is saved (Fields Public, Rule 9c, scenario 7, A15, f-a15).
//   row 51  OPS: Profile › "Roles" › "Save" with nothing changed and the account's stored reviewing
//           interests (Rule 8b's "a Save with nothing changed changes nothing", Rule 8d, OPS1, f-e,
//           f-ops1); OJS and OMP as the control.
//
// Run (twice, each run under its own PROBE_RUN; every run seeds its own scratch context per app):
//   PROBE_RUN=r1 PROBE_FEATURE=U03 PROBE_AGENT=ccI07 node bin/probe.js all shared/playwright/checks/U03/I07/i07.js
//   PROBE_RUN=r2 PROBE_FEATURE=U03 PROBE_AGENT=ccI07 node bin/probe.js all shared/playwright/checks/U03/I07/i07.js
//   PHASES=a15,int (default: all)
//
// Phases, each on a scratch context `u03i07…` with its own accounts (password: the username twice):
//   a15  the Author `<tag>au` on the Public tab: (sweep) the tab's controls, and a typed homepage left
//        unsaved when "Password" is pressed; (typed) "pkp.sfu.ca" › "Save" (refused), corrected by
//        typing key by key, read before "Save", during the save (sampled every 50 ms) and after,
//        then a key typed after the save, then a reload; (filled) the same refusal corrected with
//        fill(), no key pressed, read before "Save", during and after, a key typed after, a
//        reload; (blurred) fill() then leaving the box; (scen7) scenario 7's own steps with
//        "Profile bio.", "example.org/home" and "https://example.org/home", a reload as control.
//   int  two visitors register on the site-wide Register page (`index/user/register`) into the scratch
//        context with "Reader" (OJS, OMP: and the context's reviewer box) and the same two interests
//        typed into the page's interests box as "glacier<x>, ethics<x>" (a comma and a space); the
//        stored interests are read (read-only SQL) after each; then the first visitor reads the
//        context's Profile › "Roles", the context's manager reads Users & Roles › "Edit" › "View more
//        details", the visitor presses "Roles" › "Save" with nothing changed (the request's body
//        recorded), and the tab, the manager's page and the stored interests are read again.
const {forEachApp, launch, signIn, signOut, screen, shot, record, note, idle, tag, serverLog, sql} = require('../../../probe');
const P = require('../../issues/profile-saved-tab-keeps-refusal/lib.js');
const REG = require('../../issues/server-site-register-asks-reviewing-interests/lib.js');

const ALL = ['a15', 'int'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const SENTENCE = 'Please enter a valid URL.';
// The registered visitor's password: short; a 38-character one typed on the Register page (maxlength 32) did not sign in afterwards.
const NEWCOMER_PASSWORD = 'u03i07Pass1';

function profileOf(page, contextPath) {
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    return new ProfilePage(page, contextPath);
}

/** The homepage box and its sentence as they stand. */
async function hp(profile) {
    const s = await P.homepageState(profile);
    return {value: s.value, sentenceShown: s.sentenceShown, labels: (s.errorLabels || []).map((l) => `${l.text}|${l.visible}`)};
}

/**
 * Press the visible tab's "Save" and sample, every 50 ms for 4 s, whether the sentence is shown and
 * what the toast reads; the save request's time and status are noted beside the samples.
 */
async function saveTimeline(page, profile) {
    const t0 = Date.now();
    const reqs = [];
    const onReq = (r) => { if (r.method() === 'POST' && /\/profile-tab\/save-/.test(r.url())) reqs.push({sentMs: Date.now() - t0, url: rel(r.url()).slice(0, 120), body: flat(r.postData(), 600)}); };
    const onRes = (r) => {
        if (r.request().method() === 'POST' && /\/profile-tab\/save-/.test(r.url())) {
            const q = reqs.find((x) => x.url === rel(r.url()).slice(0, 120) && x.answeredMs == null);
            if (q) { q.answeredMs = Date.now() - t0; q.status = r.status(); }
        }
    };
    page.on('request', onReq);
    page.on('response', onRes);
    const changes = [];
    let last = null;
    try {
        await profile.saveButton().click();
        while (Date.now() - t0 < 4000) {
            const shown = await profile.fieldError(SENTENCE).isVisible().catch(() => false);
            const toast = flat(await profile.toast.innerText().catch(() => ''), 120);
            const key = `${shown}|${toast}`;
            if (key !== last) { changes.push({ms: Date.now() - t0, sentenceShown: shown, toast}); last = key; }
            await sleep(50);
        }
        await idle(page).catch(() => {});
    } finally {
        page.off('request', onReq);
        page.off('response', onRes);
    }
    return {requests: reqs, changes};
}

/** The controls a tab's form offers, as a person reads them. */
async function controls(page, formSel) {
    return page.locator(formSel).evaluate((f) => {
        const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 120);
        return [...f.querySelectorAll('input, button, a, select, textarea, iframe')].filter(vis).map((el) => ({
            tag: el.tagName.toLowerCase(), type: el.type || null, name: el.name || el.id || null,
            text: t(el.innerText || el.value || el.getAttribute('aria-label') || el.title),
            href: el.tagName === 'A' ? el.getAttribute('href') : undefined,
        }));
    }).catch((e) => ({error: flat(e.message, 200)}));
}

/** Retype the homepage box with fill() alone: no key press, as a script fills a form. */
async function fillOnly(profile, text) {
    await profile.homepage().fill(text);
}

// ---------------------------------------------------------------------------------------------
// a15

async function phaseA15(app, ctx, fact, dialogs) {
    const {page} = ctx;
    const user = `${ctx.t}au`;
    await signIn(page, user, {contextPath: ctx.t});
    let profile = profileOf(page, ctx.t);
    await profile.goto('public');
    await idle(page);
    record('a15-01-public', await screen(page));
    await shot(page, 'a15-01-public');
    fact('a15-sweep-controls', await controls(page, 'form#publicProfileForm'));
    fact('a15-sweep-start', await hp(profile));

    // sweep: an unsaved typed homepage, then "Password" (Cancel first, then OK)
    await P.retype(profile.homepage(), 'https://unsaved.example.org');
    await profile.homepage().blur();
    fact('a15-sweep-leave-cancel', await P.pressTab(page, profile, dialogs, 'password', {answer: 'dismiss'}));
    fact('a15-sweep-leave-cancel-state', {publicOpen: await profile.form('public').isVisible().catch(() => false), ...(await hp(profile))});
    fact('a15-sweep-leave-ok', await P.pressTab(page, profile, dialogs, 'password', {answer: 'accept'}));
    record('a15-02-left-to-password', await screen(page));

    // typed
    await profile.goto('public');
    await idle(page);
    record('a15-03-public-again', await screen(page));
    fact('a15-typed-0-start', await hp(profile));
    await P.retype(profile.homepage(), 'pkp.sfu.ca');
    fact('a15-typed-1-save-refused', await saveTimeline(page, profile));
    fact('a15-typed-1-state', await hp(profile));
    record('a15-04-typed-refused', await screen(page));
    await shot(page, 'a15-04-typed-refused');
    await P.retype(profile.homepage(), 'https://pkp.sfu.ca');
    await sleep(500);
    fact('a15-typed-2-corrected-before-save', await hp(profile));
    record('a15-05-typed-corrected', await screen(page));
    fact('a15-typed-3-save', await saveTimeline(page, profile));
    fact('a15-typed-3-after-save', await hp(profile));
    record('a15-06-typed-saved', await screen(page));
    await shot(page, 'a15-06-typed-saved');
    await profile.homepage().click();
    await profile.homepage().press('End');
    await profile.homepage().pressSequentially('/x');
    await sleep(500);
    fact('a15-typed-4-key-after-save', await hp(profile));
    dialogs.answer = 'accept';
    await profile.goto('public');
    dialogs.answer = 'dismiss';
    await idle(page);
    fact('a15-typed-5-reloaded', await hp(profile));
    record('a15-07-typed-reloaded', await screen(page));

    // filled (no key press)
    await P.retype(profile.homepage(), 'pkp.sfu.ca');
    fact('a15-filled-1-save-refused', await saveTimeline(page, profile));
    fact('a15-filled-1-state', await hp(profile));
    record('a15-08-filled-refused', await screen(page));
    await fillOnly(profile, 'https://pkp.sfu.ca/b');
    await sleep(500);
    fact('a15-filled-2-corrected-before-save', await hp(profile));
    record('a15-09-filled-corrected', await screen(page));
    await shot(page, 'a15-09-filled-corrected');
    fact('a15-filled-3-save', await saveTimeline(page, profile));
    fact('a15-filled-3-after-save', await hp(profile));
    record('a15-10-filled-saved', await screen(page));
    await shot(page, 'a15-10-filled-saved');
    await profile.homepage().click();
    await profile.homepage().press('End');
    await profile.homepage().pressSequentially('/y');
    await sleep(500);
    fact('a15-filled-4-key-after-save', await hp(profile));
    dialogs.answer = 'accept';
    await profile.goto('public');
    dialogs.answer = 'dismiss';
    await idle(page);
    fact('a15-filled-5-reloaded', await hp(profile));
    record('a15-11-filled-reloaded', await screen(page));

    // blurred: fill() then leave the box, no save
    await P.retype(profile.homepage(), 'pkp.sfu.ca');
    fact('a15-blur-1-save-refused', await saveTimeline(page, profile));
    await fillOnly(profile, 'https://pkp.sfu.ca/c');
    await profile.homepage().blur();
    await sleep(500);
    fact('a15-blur-2-after-blur', await hp(profile));
    record('a15-12-blurred', await screen(page));

    // scenario 7's steps (a fresh page)
    dialogs.answer = 'accept';
    await profile.goto('public');
    dialogs.answer = 'dismiss';
    await idle(page);
    await profile.expectBioEditorReady();
    const bio = profile.bioEditorBody();
    await bio.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Profile bio.');
    await P.retype(profile.homepage(), 'example.org/home');
    fact('a15-s7-1-save-refused', await saveTimeline(page, profile));
    fact('a15-s7-1-state', {...(await hp(profile)), bio: flat(await bio.innerText().catch(() => null), 120)});
    record('a15-13-s7-refused', await screen(page));
    await P.retype(profile.homepage(), 'https://example.org/home');
    fact('a15-s7-2-save', await saveTimeline(page, profile));
    fact('a15-s7-2-state', {...(await hp(profile)), bio: flat(await bio.innerText().catch(() => null), 120)});
    record('a15-14-s7-saved', await screen(page));
    await shot(page, 'a15-14-s7-saved');
    await profile.goto('public');
    await idle(page);
    await profile.expectBioEditorReady().catch(() => {});
    fact('a15-s7-3-reloaded', {...(await hp(profile)), bio: flat(await profile.bioEditorBody().innerText().catch(() => null), 120)});
    record('a15-15-s7-reloaded', await screen(page));
    await signOut(page);
}

// ---------------------------------------------------------------------------------------------
// int

async function rolesRead(page, contextPath, label) {
    const r = await REG.readRolesInterests(page, contextPath);
    record(`int-${label}`, await screen(page));
    return r;
}

async function managerRead(page, app, ctx, who, label) {
    await signIn(page, `${ctx.t}mg`, {contextPath: ctx.t});
    const r = await REG.readManagerEdit(page, {...app, contextPath: ctx.t}, who, ctx.words);
    record(`int-${label}`, await screen(page));
    await signOut(page);
    return r;
}

/** The site-wide Register page, signed out: a visitor into the scratch context with the interests typed as `typed`. */
async function registerVisitor(page, app, ctx, who, typed, label, fact) {
    await signOut(page).catch(() => {});
    fact(`int-${label}-open`, await REG.openRegister(page, app, null));
    record(`int-${label}-01-site-register`, await screen(page));
    const block = REG.contextBlock(page, ctx.name);
    fact(`int-${label}-page`, {blocks: await block.count(), block: flat(await block.first().innerText().catch(() => null), 300)});
    await REG.fillNewcomer(page, {givenName: 'U03i07', familyName: `Visitor ${label}`, affiliation: 'u03i07', country: 'Canada', email: `${who}@mail.test`, username: who, password: NEWCOMER_PASSWORD});
    const reader = await REG.tick(block.getByRole('checkbox', {name: 'Reader', exact: true}));
    const reviewer = await REG.tick(block.locator('input[name^="reviewerGroup"]'));
    const consent = await REG.tick(block.locator('.context_privacy input[type="checkbox"]'));
    const siteConsent = await REG.tick(REG.siteConsent(page));
    const box = REG.siteInterestsBox(page);
    const boxCount = await box.count();
    const boxShown = boxCount ? await box.first().isVisible().catch(() => false) : false;
    const boxPrompt = flat(await page.locator('form#register .reviewer_nocontext_interests').first().innerText().catch(() => null), 200);
    if (boxCount) {
        await box.first().click();
        await box.first().pressSequentially(typed);
    }
    record(`int-${label}-02-filled`, await screen(page));
    const reg = await REG.pressRegister(page);
    fact(`int-${label}-register`, {reader, reviewer, consent, siteConsent, interestsBox: {present: boxCount, shown: boxShown, prompt: boxPrompt, typed}, ...reg});
    record(`int-${label}-03-registered`, await screen(page));
}

/** The stored interests (read-only query, for Evidence): every entry named as one of the run's words, and each visitor's links. */
function storedInterests(app, ctx) {
    const names = ctx.words.map((w) => `'${w}'`).join(',');
    const q = (query) => { try { return sql(app, query).split('\n').filter(Boolean); } catch (e) { return [`error: ${flat(e.message, 200)}`]; } };
    return {
        entries: q(`select s.controlled_vocab_entry_id, s.setting_value from controlled_vocab_entry_settings s where s.setting_name='name' and s.setting_value in (${names}) order by 1`),
        links: q(`select u.username, ui.controlled_vocab_entry_id from user_interests ui join users u on u.user_id=ui.user_id where u.username like '${ctx.t}n%' order by 1,2`),
    };
}

async function phaseInt(app, ctx, fact) {
    const {page} = ctx;
    const sfx = ctx.t.slice(-6);
    ctx.words = [`glacier${sfx}`, `ethics${sfx}`];
    // as a person types it: a comma and a space between the two
    const typed = `${ctx.words[0]}, ${ctx.words[1]}`;
    const who = `${ctx.t}nw`;
    const second = `${ctx.t}nb`;
    await registerVisitor(page, app, ctx, who, typed, 'a', fact);
    fact('int-a-stored', storedInterests(app, ctx));
    await registerVisitor(page, app, ctx, second, typed, 'b', fact);
    fact('int-b-stored', storedInterests(app, ctx));

    await signOut(page).catch(() => {});
    await signIn(page, who, {contextPath: ctx.t, password: NEWCOMER_PASSWORD});
    fact('int-3-roles-before', await rolesRead(page, ctx.t, '04-roles-before'));
    await signOut(page);
    fact('int-4-manager-before', await managerRead(page, app, ctx, who, '05-manager-before'));

    await signIn(page, who, {contextPath: ctx.t, password: NEWCOMER_PASSWORD});
    const profile = profileOf(page, ctx.t);
    await profile.goto('roles');
    await idle(page);
    record('int-06-roles-open', await screen(page));
    fact('int-5-roles-controls', await controls(page, 'form#rolesForm'));
    const sent = [];
    const onReq = (r) => { if (r.method() === 'POST' && /\/profile-tab\/save-roles/.test(r.url())) sent.push(r); };
    page.on('request', onReq);
    await profile.saveButton().click();
    let toast = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 3000) { const x = flat(await profile.toast.innerText().catch(() => ''), 200); if (x) toast = x; await sleep(200); }
    await idle(page).catch(() => {});
    page.off('request', onReq);
    const posts = [];
    for (const q of sent) {
        const res = await q.response().catch(() => null);
        posts.push({url: rel(q.url()).slice(0, 140), body: (q.postData() || '').replace(/csrfToken=[^&]+/, 'csrfToken=…'), status: res ? res.status() : null});
    }
    record('int-07-roles-saved', await screen(page));
    await shot(page, 'int-07-roles-saved');
    fact('int-6-save', {posts, toast});
    fact('int-6-stored', storedInterests(app, ctx));
    fact('int-7-roles-after', await rolesRead(page, ctx.t, '08-roles-after'));
    await signOut(page);
    fact('int-8-manager-after', await managerRead(page, app, ctx, who, '09-manager-after'));
}

// ---------------------------------------------------------------------------------------------

forEachApp(async (app) => {
    const run = process.env.PROBE_RUN || 'r0';
    const fact = (k, v) => {
        record('facts', {[k]: v}, {merge: true});
        console.log('[i07]', app.name, k, JSON.stringify(v).slice(0, 600));
    };
    const t = tag('u03i07');
    const name = `U03 I07 ${t}`;
    const role = 'author';
    const res = await app.api.createContext({
        tag: t,
        context: {name, acronym: 'I07'},
        users: [
            {username: `${t}mg`, roles: ['manager']},
            {username: `${t}au`, roles: [role]},
        ],
    });
    fact('run', {app: app.name, line: app.line || 'main', run, scratch: t, contextId: res && res.contextId, phases: PHASES});
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const dialogs = P.dialogRecorder(page);
    const ctx = {page, t, name};
    try {
        for (const [p, fn] of [['a15', () => phaseA15(app, ctx, fact, dialogs)], ['int', () => phaseInt(app, ctx, fact)]]) {
            if (!on(p)) continue;
            try {
                await fn();
            } catch (e) {
                fact(`${p}-error`, flat(e.stack || e, 1500));
                record(`${p}-error-screen`, await screen(page).catch(() => null));
                await signOut(page).catch(() => {});
            }
        }
    } finally {
        fact('dialogs', dialogs.seen);
        fact('serverLog', log.since(from).map((l) => flat(l, 400)));
        await close();
    }
});
