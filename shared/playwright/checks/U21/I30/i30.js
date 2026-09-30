// U21 claim check, housekeeping chunk I30 (2026-09-30): the wizard's timed autosave (Rule 9, scenario 3, note i;
// the anchor's bearing on A4 and A15). What the timer counts from: typing stopping, the footer's "Last saved" time,
// the page load or the arrival at the step. As the Author of a seeded draft on a scratch context, "Title" on
// "Details" typed at several offsets from the page load:
//     t0        typed on arriving at "Details" (seconds after the load); then, 20 s after that save, typed again
//               (is the second save a minute after the typing, or a minute after the first save?)
//     t40       typed 40 s after the load
//     t75slow   typed from 75 s after the load, slowly (about 10 s of typing): does the save come mid-typing, and
//               when does the rest go?
//     railload  75 s on "Upload Files" first, then "Continue" to "Details" and typed at once (arrival vs page load)
//     step      typed, then "Continue" at once; back by the rail, typed, the rail to "Upload Files" at once
//     leave     typed seconds after the load, another address (My Submissions) 1.5 s later; back to the wizard
//     leavelate the same, typed 70 s after the load
// Every variant logs every change of the footer's "Last saved" / "Saving" text (a MutationObserver) and every
// write the page sends, with the Title each carried, in ms from the page load; after the save, a reload read of
// the Title where the variant names one.
//
//   PROBE_FEATURE=U21 PROBE_AGENT=ccI30u21 PROBE_RUN=r1 node bin/probe.js all shared/playwright/checks/U21/I30/i30.js
//   VARIANTS narrows (comma list); the variants run at once, one browser each. Each run seeds its own scratch
//   context (tag prefix u21i30), so two runs never share data. publicknowledge is never touched.
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');
const {waitForEditorReady} = require('../../../support/richtext.js');

const ALL = ['t0', 't40', 't75slow', 'railload', 'step', 'leave', 'leavelate'];
const VARIANTS = (process.env.VARIANTS || ALL.join(',')).split(',');
const RUN = process.env.PROBE_RUN || 'r1';
const T = 30_000;
const TITLE_ID = 'titleAbstract-title-control-en';
const log = (...a) => console.log(`[i30 ${RUN}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const endAnchored = (name) => new RegExp(`${esc(name)}\\s*$`);

// Init script: every change of the footer's save line, with the wall-clock time.
function watchFooter() {
    window.__u21footer = [];
    let last = null;
    const read = () => {
        const el = document.querySelector('.submissionWizard__lastSaved');
        const t = el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
        if (t !== last) { last = t; window.__u21footer.push({at: Date.now(), text: t}); }
    };
    const start = () => new MutationObserver(read).observe(document.body, {subtree: true, childList: true, characterData: true});
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}

function titleOf(postData) {
    if (!postData) return undefined;
    try {
        const p = new URLSearchParams(postData);
        for (const [k, v] of p) if (/^title\[en/.test(k)) return flat(v, 200);
    } catch (e) { /* not form data */ }
    return undefined;
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOPS = app.name === 'ops';
    const fact = (name, data) => record(`facts-${name}`, data, {merge: true});
    const t = tag('u21i30');
    const U = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f});
    const body = {tag: t, context: {name: `U21 I30 ${t}`, contactName: 'I30 Contact', contactEmail: `${t}contact@mail.test`},
        users: [U('mg', ['manager'], 'Mira', 'Manager'), U('au', ['author'], 'Ava', 'Author')]};
    if (isOJS) body.sections = [{abbrev: 'ART', title: 'Articles'}];
    if (isOPS) body.sections = [{abbrev: 'PRE', title: 'Preprints', path: 'preprints'}];
    const C = await app.api.createContext(body);
    const ctx = C.path || t;
    fact('context', {ctx, run: RUN});

    async function drive(v) {
        const o = {variant: v};
        const key = v.replace(/-/g, '');
        const spec = {tag: `${t}${key}`, context: ctx, submitter: `${t}au`, title: `I30 ${v} seeded ${t}`, submitted: false};
        const D = isOPS ? await app.api.createSubmission({...spec, galleys: [{label: 'PDF', file: 'preprint.pdf'}]})
            : await app.api.createSubmission({...spec, files: [{file: 'article.pdf'}]});
        o.id = D.submissionId;
        const {page, close} = await launch(app);
        await page.addInitScript(watchFooter);
        const traffic = [];
        const dialogs = [];
        const errs = [];
        page.on('request', (r) => {
            const u = r.url();
            if (!/\/api\/v1\//.test(u) || /_test\//.test(u) || r.method() === 'GET') return;
            const e = {at: Date.now(), m: r.headers()['x-http-method-override'] || r.method(), url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], title: titleOf(r.postData())};
            traffic.push(e);
            r.response().then((res) => { e.status = res ? res.status() : null; e.doneAt = Date.now(); }).catch(() => {});
        });
        page.on('pageerror', (e) => errs.push({at: Date.now(), type: 'pageerror', text: flat(e.message, 300)}));
        page.on('console', (m) => { if (m.type() === 'error') errs.push({at: Date.now(), type: 'console', text: flat(m.text(), 300)}); });
        page.on('dialog', async (d) => {
            dialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300)});
            if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
        });
        let t0 = null; // the first page load; every time in the facts is seconds from it
        const loads = [];
        const footerAll = [];
        const rel = (x) => Math.round((x - t0) / 100) / 10; // seconds from the page load, one decimal
        const writes = (from = 0) => traffic.filter((x) => x.at >= from).map((x) => ({op: x.m, url: x.url, status: x.status, atS: rel(x.at), title: x.title}));
        const footerLog = async () => (await page.evaluate(() => window.__u21footer || []).catch(() => [])).map((x) => ({atS: rel(x.at), text: x.text}));
        const harvest = async () => { footerAll.push(...(await footerLog())); }; // before every navigation
        const markLoad = (why) => { const now = Date.now(); if (t0 === null) t0 = now; loads.push({why, atS: rel(now)}); return now; };
        let lastLoad = null;
        const footer = () => page.locator('.submissionWizard__footer');
        const footerText = async () => flat(await page.locator('.submissionWizard__lastSaved').innerText().catch(() => null), 120);
        const cur = () => page.locator('.pkpSteps__step__label--current');
        const curText = async () => flat(await cur().innerText().catch(() => ''), 80);
        const snap = async (name, extra) => {
            let s;
            try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 300), text: {}}; }
            if (extra) s.facts = extra;
            record(`${v}-${name}`, s);
            await shot(page, `${v}-${name}`).catch(() => {});
            return s;
        };
        async function gotoWizard() {
            await page.goto(app.url(`/index.php/${ctx}/submission?id=${D.submissionId}`));
            lastLoad = markLoad('wizard');
            await page.locator('.pkpSteps').waitFor({timeout: T});
            await idle(page);
        }
        async function continueTo(label) {
            const button = footer().getByRole('button', {name: 'Continue', exact: true});
            for (let attempt = 0; ; attempt++) {
                await button.click({timeout: 10000});
                try { await cur().filter({hasText: endAnchored(label)}).waitFor({timeout: 8000}); return; } catch (e) { if (attempt >= 2) throw e; }
            }
        }
        async function railTo(label) {
            for (let attempt = 0; attempt < 3; attempt++) {
                if (await page.locator('.pkpSteps--collapsed').count()) await page.locator('.pkpSteps__controls button').click().catch(() => {});
                await page.locator('button.pkpSteps__step__label').filter({hasText: endAnchored(label)}).first().click();
                try { await cur().filter({hasText: endAnchored(label)}).waitFor({timeout: 5000}); return; } catch (e) { if (attempt === 2) throw e; }
            }
        }
        async function typeTitle(text, delay = 0) {
            await page.locator(`#${TITLE_ID}_ifr`).waitFor({state: 'visible', timeout: T});
            await waitForEditorReady(page, TITLE_ID);
            await page.frameLocator(`#${TITLE_ID}_ifr`).locator('body').click();
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Delete');
            const start = Date.now();
            await page.keyboard.type(text, {delay});
            return {startS: rel(start), endS: rel(Date.now())};
        }
        async function nextStepName() {
            const labels = (await page.locator('.pkpSteps__step__label').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());
            const c = await curText();
            return labels[labels.findIndex((l) => l === c) + 1].replace(/^\d+\s*/, '');
        }
        const titleValue = () => page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), TITLE_ID).catch(() => null);
        const untilS = async (s) => { const ms = lastLoad + s * 1000 - Date.now(); if (ms > 0) await sleep(ms); };
        // Waits until a write (of the Title's form) is seen after `from`, or `maxS` seconds pass; returns the write.
        async function watchForWrite(from, maxS) {
            const end = Date.now() + maxS * 1000;
            while (Date.now() < end) {
                const w = traffic.find((x) => x.at >= from && /publications\/\d+$/.test(x.url));
                if (w) { await sleep(3000); return {atS: rel(w.at), afterFromS: Math.round((w.at - from) / 100) / 10, status: w.status, title: w.title}; }
                await sleep(250);
            }
            return null;
        }
        async function reloadRead(name) {
            await harvest();
            await page.reload();
            lastLoad = markLoad('reload');
            await page.locator('.pkpSteps').waitFor({timeout: T});
            await idle(page); await sleep(1500);
            const r = {unsavedDialog: await page.getByRole('dialog').filter({hasText: /Unsaved Changes/}).isVisible().catch(() => false), stepOnReload: await curText()};
            if (!r.unsavedDialog) {
                if (/Upload Files\s*$/.test(r.stepOnReload)) await continueTo('Details');
                await waitForEditorReady(page, TITLE_ID).catch(() => {});
                r.title = await titleValue();
            }
            await snap(name, r);
            return r;
        }
        try {
            await signIn(page, `${t}au`, {contextPath: ctx});
            await idle(page).catch(() => {});
            await gotoWizard();
            o.stepOnOpen = await curText();
            o.footerOnLoad = await footerText();
            o.writesBeforeFirstRead = writes();
            await snap('01-open', {footer: o.footerOnLoad, writes: o.writesBeforeFirstRead});
            if (v === 'railload') {
                await untilS(75);
                o.footerAt75OnUpload = await footerText();
                o.writesOnUpload = writes();
            }
            await continueTo('Details');
            await idle(page);
            o.arrivedDetailsS = rel(Date.now());
            o.footerOnDetails = await footerText();
            const title1 = `Autosave check ${v} ${t}`;
            const title2 = `Autosave check ${v} second ${t}`;
            if (v === 't0' || v === 'railload') {
                await snap('02-details', {footer: o.footerOnDetails});
                const from = Date.now();
                o.typed = await typeTitle(title1);
                o.save1 = await watchForWrite(from, 100);
                o.footerAfterSave1 = await footerText();
                if (v === 't0' && o.save1) {
                    await sleep(20000);
                    const from2 = Date.now();
                    o.typed2 = await typeTitle(title2);
                    o.save2 = await watchForWrite(from2, 100);
                }
                await snap('03-after-wait', {writes: writes()});
                o.reload = await reloadRead('04-reload');
            } else if (v === 't40' || v === 't75slow') {
                await untilS(v === 't40' ? 40 : 75);
                o.footerBeforeTyping = await footerText();
                o.writesBeforeTyping = writes();
                const from = Date.now();
                o.typed = await typeTitle(title1, v === 't75slow' ? 250 : 0);
                o.save1 = await watchForWrite(from, 100);
                if (v === 't75slow') {
                    // the rest of the typing, if the first save came mid-typing
                    const from2 = traffic.length ? traffic[traffic.length - 1].at + 1 : Date.now();
                    o.save2 = await watchForWrite(from2, 80);
                }
                await snap('03-after-wait', {writes: writes()});
                o.reload = await reloadRead('04-reload');
            } else if (v === 'step') {
                await snap('02-details', {footer: o.footerOnDetails});
                let from = Date.now();
                o.typed = await typeTitle(title1);
                const next = await nextStepName();
                o.continueClickS = rel(Date.now());
                await continueTo(next);
                o.stepAfterContinue = await curText();
                await idle(page); await sleep(1500);
                o.continueWrites = writes(from);
                o.footerAfterContinue = await footerText();
                await snap('03-after-continue', {writes: o.continueWrites, footer: o.footerAfterContinue});
                await railTo('Details');
                from = Date.now();
                o.typed2 = await typeTitle(title2);
                o.railClickS = rel(Date.now());
                await railTo('Upload Files');
                await idle(page); await sleep(1500);
                o.railWrites = writes(from);
                o.footerAfterRail = await footerText();
                await snap('04-after-rail', {writes: o.railWrites, footer: o.footerAfterRail});
                o.reload = await reloadRead('05-reload');
            } else if (v === 'leave' || v === 'leavelate') {
                if (v === 'leavelate') await untilS(70);
                o.footerBeforeTyping = await footerText();
                o.typed = await typeTitle(title1);
                await page.locator('main h1, h1').first().click().catch(() => {}); // blur the editor
                await sleep(1500);
                const from = Date.now();
                o.writesBeforeLeave = writes();
                await harvest();
                await page.goto(app.url(`/index.php/${ctx}/dashboard/mySubmissions`)).catch((e) => { o.gotoError = flat(e.message, 200); });
                await idle(page).catch(() => {});
                o.dialogsOnLeave = dialogs.filter((x) => x.at >= from);
                o.writesOnLeave = writes(from);
                o.landedOn = page.url().replace(/^https?:\/\/[^/]+/, '');
                await snap('03-left', {dialogs: o.dialogsOnLeave, writes: o.writesOnLeave});
                o.back = await (async () => { await gotoWizard(); return reloadRead('04-back'); })();
            }
            await harvest();
            o.footerLog = footerAll;
            o.loads = loads;
            o.allWrites = writes();
            o.errors = errs;
            o.dialogs = dialogs;
        } catch (e) {
            o.error = flat(e.stack || e.message, 1200);
            o.allWrites = writes();
            await harvest();
            o.footerLog = footerAll;
            o.loads = loads;
            await snap('error').catch(() => {});
        } finally {
            await signOut(page).catch(() => {});
            await close();
        }
        fact(v, o);
        log(app.name, v, JSON.stringify({typed: o.typed, save1: o.save1, typed2: o.typed2, save2: o.save2, cont: o.continueWrites, rail: o.railWrites,
            leave: o.writesOnLeave, back: o.back && o.back.title, reload: o.reload && o.reload.title, error: o.error}).slice(0, 1500));
        return o;
    }
    await Promise.all(VARIANTS.map((v, i) => sleep(i * 1500).then(() => drive(v)).catch((e) => log(app.name, v, 'FAILED', e.message))));
});
