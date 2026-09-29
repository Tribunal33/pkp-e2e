// U40 claim check, chunk I29 (housekeeping 2026-09-29): incidentals row 28.
// Spec: docs/specs/U40-publication-metadata.md — Fields "Default Chapter License URL" (line 115), footnote f-omp4.
// OMP only: the field exists on an Edited Volume's "Permissions & Disclosure" page alone (no Edited Volume on
// OJS/OPS).
//
// A scratch press (no license, seed-facts), manager + author, an Edited Volume seeded. As the manager:
//   01  Permissions & Disclosure, nothing set: the chapter field (end 1: neither license set).
//   02  the volume's own "License URL" typed CC BY-NC 4.0, before Save.
//   03  Save, read on the same page;  04  after a reload  (the row: volume license, no press license).
//   05  the volume's License URL changed to a raw address (https://example.org/volume-license), saved;
//   06  after a reload (the name-vs-address axis of the sentence).
//   07  sweep: the chapter field (Override pressed if offered) typed and left unsaved by the side menu's
//       "Title & Abstract";  08  back on Permissions & Disclosure.
//   09  Settings › Distribution › License: "Author", "CC Attribution 4.0" saved (press license);
//   10  Permissions & Disclosure after it (end 2: both set).
//   11  the volume's License URL emptied (Override if locked), saved;  12  after a reload (press only).
//
//   RUN=r1 PROBE_FEATURE=U40 PROBE_AGENT=ccI29 node bin/probe.js omp shared/playwright/checks/U40/I29/i29.js
//   RUN=r2 …   (each run seeds afresh; facts in facts-<RUN>-omp.json; snapshots <RUN>-<name>-omp)
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const CCBYNC = 'https://creativecommons.org/licenses/by-nc/4.0';
const RAW = 'https://example.org/volume-license';
const CHAPTER_URL = 'https://example.org/chapter-license-unsaved';

forEachApp(async (app) => {
    if (app.name !== 'omp') { console.log(`[${app.name}] skipped: no Edited Volume on this app`); return; }
    const factsFile = path.join(outDir(), `facts-${RUN}-${app.name}.json`);
    const facts = {};
    const saveFacts = () => fs.writeFileSync(factsFile, JSON.stringify(facts, null, 1));
    const log = (...a) => console.log(`[${app.name} ${RUN}]`, ...a);
    const fact = (k, v) => { facts[k] = v; saveFacts(); log(k, JSON.stringify(v).slice(0, 2500)); };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);

    const {page} = await launch(app);
    const traffic = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/api\/v1\//.test(u) || /_test\//.test(u)) return;
        const m = r.request().method();
        traffic.push({at: Date.now(), m: r.request().headers()['x-http-method-override'] || m, url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: r.status(),
            body: m !== 'GET' && r.status() >= 400 ? await r.text().then((b) => b.slice(0, 300)).catch(() => null) : undefined});
    });
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 200)});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), msg: flat(e.message, 300)}));
    const since = (arr, t0) => arr.filter((e) => e.at >= t0).map(({at, ...x}) => x);
    const writes = (t0) => since(traffic, t0).filter((x) => x.m !== 'GET');
    const bad = (t0) => since(traffic, t0).filter((x) => x.status >= 400);
    const wf = () => page.locator('[role="dialog"]:visible').first();

    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 300)}; }
        if (extra) s.facts = extra;
        record(`${RUN}-${name}`, s);
        await shot(page, `${RUN}-${name}`).catch(() => {});
        return `${RUN}-${name}-${app.name}`;
    }
    async function gotoWorkflow(ctx, sid, key) {
        await page.goto(cu(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`)).catch(() => {});
        await idle(page).catch(() => {});
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page).catch(() => {});
    }
    const saveBtn = () => wf().getByRole('button', {name: 'Save', exact: true});
    async function saveAndRead() {
        const t0 = Date.now();
        const b = saveBtn();
        if (!(await b.count()) || !(await b.first().isEnabled().catch(() => false))) return {pressed: false};
        const resp = page.waitForResponse((r) => /\/api\/v1\/.*\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 12_000}).catch(() => null);
        await b.first().click();
        const r = await resp;
        const seen = new Set();
        const start = Date.now();
        while (Date.now() - start < 6000) {
            for (const x of await wf().locator('[role="status"], .pkpFormPage__status').allInnerTexts().catch(() => [])) if (x.trim()) seen.add(x.trim());
            if (seen.has('Saved')) break;
            await sleep(250);
        }
        await idle(page).catch(() => {});
        return {pressed: true, status: r ? r.status() : 'no request', statuses: [...seen],
            fieldErrors: await wf().locator('.pkpFieldError').allInnerTexts().catch(() => []),
            notices: await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => []), writes: writes(t0)};
    }
    async function readPermFields() {
        await wf().locator('input[name="licenseUrl"]').first().waitFor({timeout: 15000}).catch(() => {});
        await sleep(500);
        return wf().evaluate((root) => {
            const fields = [...root.querySelectorAll('.pkpFormField')].filter((f) => f.offsetParent !== null && f.querySelector('input'));
            return fields.map((f) => {
                const input = f.querySelector('input');
                const lab = f.querySelector('label, legend');
                const desc = f.querySelector('.pkpFormField__description, [id$="-description"]');
                return {
                    name: input.name, label: lab ? lab.innerText.replace(/\s+/g, ' ').trim() : null,
                    value: input.value, disabled: input.disabled,
                    description: desc ? desc.innerText.replace(/\s+/g, ' ').trim() : null,
                    descLinks: desc ? [...desc.querySelectorAll('a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})) : [],
                    buttons: [...f.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map((b) => b.innerText.trim()).filter(Boolean),
                };
            });
        }).catch((e) => [{err: e.message.slice(0, 200)}]);
    }
    const pick = (fields, name) => (fields.find((f) => f.name === name || (f.name || '').startsWith(`${name}-`)) || null);
    const both = (fields) => ({licenseUrl: pick(fields, 'licenseUrl'), chapterLicenseUrl: pick(fields, 'chapterLicenseUrl'), all: fields});
    async function openPerm(ctx, sid, pub) {
        await gotoWorkflow(ctx, sid, `publication_${pub}_license`);
        return readPermFields();
    }
    async function overrideAndType(name, value) {
        const sel = `input[name="${name}"], input[name^="${name}-"]`;
        const fld = wf().locator('.pkpFormField').filter({has: page.locator(sel)}).first();
        const box = fld.locator(sel).first();
        const o = {disabledBefore: await box.isDisabled().catch(() => null)};
        if (o.disabledBefore) {
            await fld.getByRole('button', {name: /Override/}).first().click().catch((e) => { o.overrideErr = flat(e.message, 150); });
            await sleep(500);
            o.afterOverride = pick(await readPermFields(), name);
        }
        await box.fill(value).catch((e) => { o.fillErr = flat(e.message, 150); });
        await box.blur().catch(() => {});
        await sleep(500);
        o.typed = both(await readPermFields());
        return o;
    }
    async function setContextLicense(ctx) {
        const out = {};
        await page.goto(cu(ctx, '/management/settings/distribution')).catch(() => {});
        await idle(page).catch(() => {});
        const tab = page.getByRole('tab', {name: 'License', exact: true}).first();
        if (await tab.count()) { await tab.click(); await idle(page).catch(() => {}); await sleep(700); }
        const cc = page.getByRole('radio', {name: 'CC Attribution 4.0', exact: true});
        await cc.waitFor({state: 'visible', timeout: T}).catch(() => {});
        const author = page.getByRole('radio', {name: 'Author', exact: true});
        if (await author.count()) await author.check().catch(() => {});
        await cc.check().catch((e) => { out.ccErr = flat(e.message, 150); });
        const form = page.locator('form').filter({has: cc}).first();
        const t0 = Date.now();
        const resp = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
        out.save = {status: r ? r.status() : 'no request', writes: writes(t0)};
        return out;
    }

    const t0all = Date.now();
    const t = tag('u40i29');
    const C = await app.api.createContext({tag: t, users: [
        {username: `${t}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
        {username: `${t}au`, roles: ['author'], givenName: 'Ava', familyName: 'Author'}]});
    const S = await app.api.createSubmission({tag: `${t}s`, context: C.path, submitter: `${t}au`, title: `I29 chapter license ${t}`, workType: 'editedVolume'});
    fact('seed', {path: C.path, sid: S.submissionId, pub: S.publicationId});
    const P = [C.path, S.submissionId, S.publicationId];
    try {
        await signIn(page, `${t}mg`, {contextPath: C.path});
        const r = {};

        r.s01 = both(await openPerm(...P));
        await snap('01-neither-set', r.s01);
        await loc(page, 'Permissions & Disclosure: "Default Chapter License URL" input', wf().locator('input[name="chapterLicenseUrl"]'));
        await loc(page, 'Permissions & Disclosure: "License URL" input', wf().locator('input[name="licenseUrl"]'));

        r.s02 = await overrideAndType('licenseUrl', CCBYNC);
        await snap('02-volume-license-typed-unsaved', r.s02);
        r.s03 = {save: await saveAndRead()};
        r.s03.fields = both(await readPermFields());
        await snap('03-volume-license-saved-same-page', r.s03);
        r.s04 = both(await openPerm(...P));
        await snap('04-volume-license-saved-reloaded', r.s04);
        await loc(page, 'Permissions & Disclosure: chapter field "Override" (volume license only)', wf().locator('.pkpFormField').filter({has: page.locator('input[name="chapterLicenseUrl"]')}).getByRole('button', {name: /Override/}));

        r.s05 = await overrideAndType('licenseUrl', RAW);
        r.s05.save = await saveAndRead();
        r.s05.samePage = both(await readPermFields());
        await snap('05-volume-raw-license-saved-same-page', r.s05);
        r.s06 = both(await openPerm(...P));
        await snap('06-volume-raw-license-reloaded', r.s06);

        // sweep: the chapter field changed and left unsaved by the side menu
        r.s07 = await overrideAndType('chapterLicenseUrl', CHAPTER_URL);
        let t0 = Date.now();
        await wf().getByRole('link', {name: 'Title & Abstract', exact: true}).last().click().catch((e) => { r.s07.clickErr = flat(e.message, 150); });
        await sleep(2000); await idle(page).catch(() => {});
        r.s07.dialogs = since(dialogs, t0);
        r.s07.visibleDialogs = (await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
        r.s07.heading = await wf().getByRole('heading', {level: 2}).first().innerText().catch(() => null);
        await snap('07-left-unsaved-chapter', r.s07);
        await wf().getByRole('link', {name: 'Permissions & Disclosure', exact: true}).last().click().catch(() => {});
        await idle(page).catch(() => {});
        r.s08 = both(await readPermFields());
        await snap('08-back-on-permissions', r.s08);
        r.s08.reload = both(await openPerm(...P));
        await snap('08b-reloaded-after-unsaved', r.s08.reload);

        // restore the volume's license to CC BY-NC before the press license, so end 2 reads a CC name
        r.s08c = await overrideAndType('licenseUrl', CCBYNC);
        r.s08c.save = await saveAndRead();

        r.s09 = await setContextLicense(C.path);
        await snap('09-press-license-saved', r.s09);
        r.s10 = both(await openPerm(...P));
        await snap('10-both-set-reloaded', r.s10);

        r.s11 = await overrideAndType('licenseUrl', '');
        r.s11.save = await saveAndRead();
        r.s11.samePage = both(await readPermFields());
        await snap('11-volume-license-emptied-same-page', r.s11);
        r.s12 = both(await openPerm(...P));
        await snap('12-press-only-reloaded', r.s12);

        fact('drive', r);
        const nm = (x) => x && x.chapterLicenseUrl ? `${x.chapterLicenseUrl.disabled ? 'locked' : 'editable'} [${x.chapterLicenseUrl.buttons.join('|')}] "${x.chapterLicenseUrl.description}"` : 'absent';
        fact('summary', {
            '01 neither': nm(r.s01), '03 volume CC same page': nm(r.s03.fields), '04 volume CC reload': nm(r.s04),
            '05 volume raw same page': nm(r.s05.samePage), '06 volume raw reload': nm(r.s06), '08 back': nm(r.s08), '08b reload': nm(r.s08.reload),
            '10 both': nm(r.s10), '11 press only same page': nm(r.s11.samePage), '12 press only reload': nm(r.s12),
        });
        await signOut(page).catch(() => {});
    } finally {
        fact('http4xx5xx', bad(t0all));
        fact('pageErrors', since(pageErrors, t0all));
        fact('dialogs', since(dialogs, t0all));
    }
    if (RUN === 'r1') note(`I29 (ccI29): OMP Edited Volume "Default Chapter License URL" — i29.js drives it via workflowMenuKey=publication_<pubId>_license and reads each .pkpFormField's input.disabled, description and buttons; a volume License URL saved on a press with no license: see facts-r*-omp.json "summary".`);
});
