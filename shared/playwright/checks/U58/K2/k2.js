// U58 claim check, chunk K2: the "Author Guidance" and "Metadata" side tabs of
// Settings › Workflow › "Submission", and where their settings land (the
// "Submissions" page, the start form, the wizard's steps, the publication
// pages). Spec: docs/specs/U58-submission-intake-configuration.md lines
// 71–116 (Fields), 214–252 (Rules 7–12), 391–394 (Settings 2), 416–420,
// 426–434, 444–447 (Cross-feature); register A7, OMP1, OPS1; footnotes d, e,
// td2, td3, f-a7, f-omp1, f-ops1.
//
// Scratch contexts per app (tag prefix u58k2; state in
// .reports/U58/ccK2/k2-state-<app>.json). Every context has a manager (mgr)
// and an author (au) with a draft (submitted: false; OJS/OMP with a file).
//   D  install defaults; OJS/OMP "Reviewer Suggestion at Submission" on.
//   C  custom texts typed on screen into every "Author Guidance" box; OJS/OMP
//      reviewer suggestions on. The author's wizard is open before the save.
//   E  every box emptied on screen; a seeded copyright notice first; OJS/OMP
//      reviewer suggestions on.
//   L  one very long "Author Guidelines" text.
//   G  English + French under "UI", English alone under "Forms"; French
//      ticked under "Forms" on screen.
//   MT the "Metadata" tab driven (td2, Rules 10, 11, a page left unsaved).
//   X0 subjects off, plain language summary off (+ a submitted submission)
//   X1 subjects "Do not request", plain language summary "Ask" then set to
//      "Require" on screen (+ a submitted submission)
//   X2 subjects "Ask", plain language summary "Ask" (+ a submitted submission)
//   X3 subjects "Require"
//   Y  a category and "Yes, add a categories field…", "Enable for
//      Publications"; competing interests ticked on screen (+ submitted)
// `publicknowledge` and the roster are only read (manager.maya).
//
//   PROBE_FEATURE=U58 PROBE_AGENT=ccK2 node bin/probe.js <app|all> shared/playwright/checks/U58/K2/k2.js
//   PHASES=seed,ag,adefault,custom,custom2,empty,long,lang,meta,effect,effect2,cross,gate,frstart (default all, in
//   this order: custom2 needs custom's texts, effect2 closes L after long)
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['seed', 'ag', 'adefault', 'custom', 'custom2', 'empty', 'long', 'lang', 'meta', 'effect', 'effect2', 'cross', 'gate', 'frstart'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k2]', new Date().toISOString().slice(11, 19), ...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const stateFile = (app) => path.join(outDir(), `k2-state-${app.name}.json`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30_000;
const BOXES = ['authorGuidelines', 'beginSubmissionHelp', 'submissionChecklist', 'uploadFilesHelp', 'contributorsHelp',
    'detailsHelp', 'forTheEditorsHelp', 'reviewHelp', 'copyrightNotice', 'reviewerSuggestionsHelp'];

// ---------------------------------------------------------------------------
// Reading helpers

async function snap(page, name, extra = {}) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), title: await page.title().catch(() => null), error: String(e.message).slice(0, 300)};
    }
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

async function go(page, app, p) {
    const resp = await page.goto(app.url(p)).catch((e) => ({err: e.message}));
    await idle(page);
    return resp && resp.status ? resp.status() : (resp && resp.err) || null;
}

async function topTabs(page) {
    return page.locator('[role="tab"]').evaluateAll((els) => els
        .filter((e) => !e.parentElement.closest('[role="tabpanel"]'))
        .map((e) => ({id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected')}))).catch(() => []);
}

async function sideTabs(page) {
    return page.locator('[role="tabpanel"]:visible [role="tab"]').evaluateAll((els) => els.map((e) => ({
        id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected'),
    }))).catch(() => []);
}

async function openWorkflow(page, app, ctx, sideId) {
    const status = await go(page, app, `/index.php/${ctx}/management/settings/workflow`);
    await page.locator('[id="submission-button"]').first().click().catch(() => {});
    await idle(page);
    await sleep(600);
    if (sideId) {
        await page.locator(`[id="${sideId}-button"]`).first().click().catch(() => {});
        await idle(page);
        await sleep(1500);
    }
    return status;
}

async function tinyIds(page) {
    return page.evaluate(() => (window.tinymce ? window.tinymce.get().map((e) => e.id) : [])).catch(() => []);
}

async function tinyGet(page, id) {
    return page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent() : null), id).catch(() => null);
}

async function editorsReady(page) {
    await page.waitForFunction(() => window.tinymce && window.tinymce.get().length && window.tinymce.get().every((e) => e.initialized), null, {timeout: T}).catch(() => {});
}

/** Every "Author Guidance" field: label, help (with links), editor ids and contents, toolbar. */
async function readGuidance(page) {
    await editorsReady(page);
    const fields = await page.locator('[id="instructions"]').evaluate((p) => {
        const all = [...p.querySelectorAll('.pkpFormField')].filter((f) => !f.parentElement.closest('.pkpFormField'));
        return all.map((f) => ({
            label: ((f.querySelector('.pkpFormFieldLabel, legend') || {}).innerText || '').replace(/\s+/g, ' ').trim(),
            help: ((f.querySelector('.pkpFormField__description') || {}).innerText || '').replace(/\s+/g, ' ').trim(),
            helpLinks: [...f.querySelectorAll('.pkpFormField__description a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})),
            editorIds: [...f.querySelectorAll('textarea')].map((t) => t.id).filter(Boolean),
            toolbar: !!f.querySelector('.tox-toolbar, .tox-toolbar__primary, .tox-editor-header'),
            toolbarButtons: [...f.querySelectorAll('.tox-tbtn')].map((b) => b.getAttribute('aria-label')).filter(Boolean),
            maxlength: [...f.querySelectorAll('textarea, input')].map((t) => t.getAttribute('maxlength')).filter(Boolean),
            required: !!f.querySelector('.pkpFormFieldLabel__required'),
            extra: f.innerText.replace(/\s+/g, ' ').trim().slice(0, 400),
        }));
    }).catch((e) => [{error: e.message.slice(0, 200)}]);
    for (const f of fields) {
        f.content = {};
        for (const id of f.editorIds || []) f.content[id] = await tinyGet(page, id);
    }
    const formInfo = await page.locator('[id="instructions"]').evaluate((p) => ({
        forms: p.querySelectorAll('form').length,
        buttons: [...p.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
        text: p.innerText.slice(0, 600),
    })).catch(() => null);
    return {fields, formInfo};
}

const byField = (guid, field) => (guid.fields || []).find((f) => (f.editorIds || []).some((i) => i.includes(`-${field}-`)));
const enId = (guid, field) => { const f = byField(guid, field); return f ? (f.editorIds.find((i) => /-en$/.test(i)) || f.editorIds[0]) : null; };

async function typeRich(page, editorId, text, {replace = false, insert = false} = {}) {
    await page.waitForFunction((id) => !!(window.tinymce && window.tinymce.get(id) && window.tinymce.get(id).initialized), editorId, {timeout: T}).catch(() => {});
    const body = page.frameLocator(`[id="${editorId}_ifr"]`).locator('body');
    await body.click();
    if (replace) { await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace'); } else { await page.keyboard.press('ControlOrMeta+End'); }
    if (text) {
        if (insert) await page.keyboard.insertText(text);
        else await page.keyboard.type(text);
    }
    await sleep(200);
}

/** Press "Save" in the form holding `field`; record statuses, notices, the request and response. */
async function saveForm(page, field, name) {
    const form = page.locator('form').filter({has: field}).first();
    const save = form.getByRole('button', {name: 'Save', exact: true});
    const out = {requests: [], statuses: [], notices: []};
    const onReq = (r) => {
        if (/\/api\/v1\/contexts\//.test(r.url()) && r.method() !== 'GET') {
            let body = null;
            try { body = JSON.parse(r.postData() || '{}'); } catch (e) { body = (r.postData() || '').slice(0, 2000); }
            const keys = body && typeof body === 'object' ? Object.keys(body) : null;
            const sizes = body && typeof body === 'object' ? Object.fromEntries(Object.entries(body).map(([k, v]) => [k, JSON.stringify(v).length])) : null;
            out.requests.push({method: r.method(), override: r.headers()['x-http-method-override'] || null, keys, sizes, body: JSON.stringify(body).length < 6000 ? body : '(large)'});
        }
    };
    const onResp = (r) => {
        if (/\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET') out.responseStatus = r.status();
    };
    page.on('request', onReq);
    page.on('response', onResp);
    out.saveEnabled = await save.isEnabled({timeout: 10_000}).catch(() => 'err');
    await save.click({timeout: 10_000}).catch((e) => { out.clickError = e.message.slice(0, 120); });
    const start = Date.now();
    const seen = [];
    while (Date.now() - start < 12_000) {
        for (const t of (await page.locator('[role="status"], .pkpFormPage__status').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean)) if (!seen.includes(t)) seen.push(t);
        if (seen.includes('Saved')) break;
        await sleep(150);
    }
    out.statuses = seen;
    out.notices = await page.locator('[role="alert"], .pkpNotification, .app__notifications').allInnerTexts().catch(() => []);
    out.fieldErrors = await form.locator('.pkpFieldError, .pkpFormField__error').allInnerTexts().catch(() => []);
    page.off('request', onReq);
    page.off('response', onResp);
    record(name, out);
    log(name, JSON.stringify({saveEnabled: out.saveEnabled, statuses: out.statuses, status: out.responseStatus, keys: out.requests.map((r) => r.keys), notices: out.notices, fieldErrors: out.fieldErrors}));
    return out;
}

async function submissionsPage(page, app, ctx, name, {locale = ''} = {}) {
    const status = await go(page, app, `/index.php/${ctx}${locale ? '/' + locale : ''}/about/submissions`);
    await snap(page, name);
    const info = await page.evaluate(() => {
        const main = document.querySelector('.page_submissions') || document.querySelector('.pkp_structure_main') || document.body;
        return {
            headings: [...main.querySelectorAll('h1, h2, h3')].map((h) => h.innerText.trim()),
            parts: [...main.querySelectorAll('h2, h3')].map((h) => {
                let t = '';
                let n = h.nextElementSibling;
                while (n && !/^H[123]$/.test(n.tagName)) { t += ' ' + n.innerText; n = n.nextElementSibling; }
                const parent = h.closest('div, section');
                return {h: h.innerText.trim(), after: t.replace(/\s+/g, ' ').trim().slice(0, 600), block: parent ? parent.innerText.replace(/\s+/g, ' ').trim().slice(0, 600) : null,
                    cls: parent ? parent.className : null};
            }),
            links: [...main.querySelectorAll('a')].map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})),
            textLength: main.innerText.length,
            text: main.innerText.slice(0, 4000),
        };
    }).catch((e) => ({error: e.message}));
    return {status, url: page.url(), ...info};
}

/** The start form ("Make a Submission", `/submission`): text, links, checkboxes, the button. Never pressed. */
async function startForm(page, app, ctx, name) {
    const status = await go(page, app, `/index.php/${ctx}/submission`);
    await sleep(800);
    await snap(page, name);
    const info = await page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        return {
            h1: [...main.querySelectorAll('h1')].map((h) => h.innerText.trim()),
            text: main.innerText.slice(0, 5000),
            links: [...main.querySelectorAll('a')].filter((a) => a.offsetParent).map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})),
            checkboxes: [...main.querySelectorAll('input[type=checkbox]')].map((c) => ({name: c.name, label: ((c.closest('label') || {}).innerText || '').replace(/\s+/g, ' ').trim(), visible: !!c.offsetParent})),
            legends: [...main.querySelectorAll('legend, .pkpFormFieldLabel')].filter((l) => l.offsetParent).map((l) => l.innerText.replace(/\s+/g, ' ').trim()),
            fieldsHtml: [...main.querySelectorAll('.pkpFormField--html, .pkpFormField__description')].map((d) => d.innerText.replace(/\s+/g, ' ').trim().slice(0, 800)),
            begin: [...main.querySelectorAll('button')].filter((b) => /Begin Submission/.test(b.innerText)).length,
        };
    }).catch((e) => ({error: e.message}));
    return {status, url: page.url(), ...info};
}

async function railRead(page) {
    return page.locator('.pkpSteps__step__label').evaluateAll((els) => els.map((e) => ({
        text: e.innerText.replace(/\s+/g, ' ').trim(), tag: e.tagName, current: e.classList.contains('pkpSteps__step__label--current'),
    }))).catch(() => []);
}

async function currentStep(page) {
    return flat(await page.locator('.pkpSteps__step__label--current').first().innerText().catch(() => null), 80);
}

async function expandRail(page) {
    if (await page.locator('.pkpSteps--collapsed').count().catch(() => 0)) {
        const c = page.locator('.pkpSteps__controls button');
        if (await c.count()) await c.first().click().catch(() => {});
        await sleep(300);
    }
}

async function stepInfo(page) {
    return page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        const vis = (e) => !!e.offsetParent;
        return {
            text: main.innerText.slice(0, 6000),
            labels: [...main.querySelectorAll('legend, .pkpFormFieldLabel, h2, h3')].filter(vis).map((l) => l.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
            required: [...main.querySelectorAll('.pkpFormFieldLabel__required')].filter(vis).map((r) => ((r.closest('label, legend, .pkpFormField') || {}).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80)),
            checkboxes: [...main.querySelectorAll('input[type=checkbox]')].filter(vis).map((c) => ({label: ((c.closest('label') || {}).innerText || '').replace(/\s+/g, ' ').trim(), checked: c.checked})),
            errors: [...main.querySelectorAll('.pkpFieldError, .submissionWizard__reviewPanel__error, .pkpFormField__error, [class*="error"]')].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30),
            submit: [...main.querySelectorAll('button')].filter((b) => vis(b) && b.innerText.trim() === 'Submit').map((b) => ({disabled: b.disabled, aria: b.getAttribute('aria-disabled')})),
        };
    }).catch((e) => ({error: e.message}));
}

/**
 * Walk a draft's wizard from its first step to "Review", pressing "Continue";
 * record every step. `atStep(name, info)` may act on a step.
 */
async function walkWizard(page, app, ctx, id, prefix, {atStep, fromFirst = true, reload = true} = {}) {
    if (reload) {
        await go(page, app, `/index.php/${ctx}/submission?id=${id}`);
        await page.locator('.pkpSteps').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(1200);
    }
    const out = {railAtOpen: await railRead(page), openedOn: await currentStep(page), steps: []};
    if (fromFirst) {
        await expandRail(page);
        const first = page.locator('button.pkpSteps__step__label').first();
        if (await first.count() && !(await first.evaluate((e) => e.classList.contains('pkpSteps__step__label--current')).catch(() => true))) {
            await first.click().catch(() => {});
            await idle(page); await sleep(1000);
        }
    }
    for (let i = 0; i < 9; i++) {
        const cur = await currentStep(page);
        const s = await snap(page, `${prefix}-step${i}`);
        const info = await stepInfo(page);
        const entry = {step: cur, url: s.url, ...info};
        if (atStep) Object.assign(entry, (await atStep(cur, info)) || {});
        out.steps.push(entry);
        if (/Review$/.test(cur || '')) break;
        const cont = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
        if (!(await cont.isVisible().catch(() => false))) break;
        for (let a = 0; a < 3; a++) {
            await cont.click().catch(() => {});
            const t0 = Date.now();
            while (Date.now() - t0 < 10_000 && (await currentStep(page)) === cur) await sleep(250);
            if ((await currentStep(page)) !== cur) break;
        }
        await idle(page); await sleep(1000);
    }
    out.rail = await railRead(page);
    return out;
}

/** At the Contributors step: open the first contributor's "Edit", record the window's fields, close it. */
function contribAtStep(page, name) {
    return async (cur) => {
        if (!/Contributors$/.test(cur || '')) return null;
        const edit = page.locator('main').getByRole('listitem').filter({hasText: 'Primary Contact'}).getByRole('button', {name: 'Edit', exact: true}).first();
        if (!(await edit.count())) return {contribEdit: 'none'};
        await edit.click().catch(() => {});
        const modal = page.locator('[data-cy="active-modal"]').filter({has: page.locator('[id^="contributor-givenName"]')});
        await modal.locator('[id^="contributor-givenName"]').first().waitFor({timeout: T}).catch(() => {});
        await sleep(800);
        const labels = await modal.locator('legend, .pkpFormFieldLabel').allInnerTexts().catch(() => []);
        await snap(page, name);
        await modal.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(1200);
        return {contribLabels: labels.map((l) => flat(l, 80))};
    };
}

// ---- workflow (publication pages) helpers, after U40 K1 ----
const wf = (page) => page.locator('[role="dialog"]:visible').first();
async function gotoWorkflow(page, app, ctx, id) {
    await page.goto(app.url(`/index.php/${ctx}/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page);
    await wf(page).getByRole('link', {name: /^(Title & Abstract|Publication|Preprint|Submission|Production)$/}).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
}
async function openEntry(page, name) {
    const dialog = wf(page);
    let entry = dialog.getByRole('link', {name, exact: true});
    if (!(await entry.count())) return false;
    if (!(await entry.first().isVisible().catch(() => false))) {
        const group = dialog.getByRole('link', {name: /^(Publication|Preprint)$/}).first();
        if (await group.count()) await group.click().catch(() => {});
        await idle(page); await sleep(500);
    }
    if (!(await entry.first().isVisible().catch(() => false))) return false;
    await entry.first().click();
    await dialog.getByRole('heading', {name: new RegExp(`^(Publication|Preprint): ${name.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&')}$`, 'i')}).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    const t0 = Date.now();
    while (Date.now() - t0 < 15_000 && !(await dialog.getByRole('button', {name: 'Save', exact: true}).count())) await sleep(250);
    await editorsReady(page);
    await sleep(600);
    return true;
}
async function entryInfo(page) {
    return wf(page).evaluate((d) => ({
        labels: [...d.querySelectorAll('legend, .pkpFormFieldLabel')].filter((e) => e.offsetParent).map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
        menu: [...d.querySelectorAll('nav a, [role="navigation"] a')].filter((e) => e.offsetParent).map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
    })).catch((e) => ({error: e.message}));
}
async function pubSave(page) {
    const button = wf(page).getByRole('button', {name: 'Save', exact: true});
    const out = {count: await button.count(), enabled: await button.first().isEnabled().catch(() => null)};
    if (!out.count || !out.enabled) return out;
    const resp = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await button.first().click();
    const r = await resp;
    out.apiStatus = r ? r.status() : null;
    await page.locator('[role="status"]:has-text("Saved")').first().waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
    await sleep(600);
    out.status = await wf(page).locator('[role="status"]').allInnerTexts().catch(() => []);
    out.errors = await wf(page).locator('.pkpFieldError, .pkpFormPage__errors, .pkpFormErrors, [class*="error"]').evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
    return out;
}

/** Every top-level field of the "Metadata" tab: legend, help, tooltip, boxes and choices. */
async function readMeta(page) {
    return page.locator('[id="metadata"]').evaluate((p) => {
        const all = [...p.querySelectorAll('.pkpFormField')].filter((f) => !f.parentElement.closest('.pkpFormField'));
        return all.map((f) => ({
            legend: ((f.querySelector('legend .align-middle, legend, .pkpFormFieldLabel') || {}).innerText || '').replace(/\s+/g, ' ').trim(),
            tooltip: ((f.querySelector('legend .-screenReader') || {}).innerText || '').replace(/\s+/g, ' ').trim() || null,
            help: ((f.querySelector('.pkpFormField__description') || {}).innerText || '').replace(/\s+/g, ' ').trim() || null,
            inputs: [...f.querySelectorAll('input')].map((i) => ({type: i.type, value: i.value, checked: i.checked, visible: !!i.offsetParent,
                label: ((i.closest('label') || {}).innerText || '').replace(/\s+/g, ' ').trim()})),
        }));
    }).catch((e) => [{error: e.message.slice(0, 200)}]);
}
const metaLine = (m) => (m || []).map((f) => `${f.legend}: ${(f.inputs || []).filter((i) => i.visible).map((i) => `${i.type === 'radio' ? '(' : '['}${i.checked ? 'x' : ' '}${i.type === 'radio' ? ')' : ']'}${i.value}`).join(' ')}`).join(' | ');
const metaField = (page, boxLabel) => page.locator('[id="metadata"] fieldset.pkpFormField').filter({has: page.getByRole('checkbox', {name: boxLabel, exact: true})}).first();

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    const isOjs = app.name === 'ojs', isOmp = app.name === 'omp', isOps = app.name === 'ops';
    const PK = app.contextPath;
    await app.api.bootstrapProbe(PK);
    const sf = stateFile(app);
    const st = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const saveSt = () => fs.writeFileSync(sf, JSON.stringify(st, null, 2));

    if (on('seed') && !st.D) {
        const users = (p) => [
            {username: `${p}mgr`, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
            {username: `${p}au`, roles: ['author'], givenName: 'Ava', familyName: 'Author'},
        ];
        const rev = isOps ? {} : {review: {reviewerSuggestionEnabled: true}};
        const files = isOps ? {} : {files: [{file: 'article.pdf'}]};
        const mk = async (key, prefix, extra = {}, {submitted = false, draft = true} = {}) => {
            const t = tag(prefix);
            const created = await app.api.createContext({tag: t, users: users(t), ...extra});
            const c = {path: t, created: !!created};
            if (draft) {
                const d = await app.api.createSubmission({tag: `${t}d`, context: t, submitter: `${t}au`, title: `K2 draft ${key}`, submitted: false, ...files});
                c.draft = d.submissionId;
            }
            if (submitted) {
                const s = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, title: `K2 submitted ${key}`, ...files});
                c.sub = s.submissionId;
            }
            st[key] = c;
            saveSt();
            log('seeded', key, JSON.stringify(c));
        };
        await mk('D', 'u58k2d', rev);
        await mk('C', 'u58k2c', rev);
        await mk('E', 'u58k2e', {...rev, copyrightNotice: {en: 'K2 seeded copyright notice E.'}});
        await mk('L', 'u58k2l', {}, {draft: false});
        await mk('G', 'u58k2g', {context: {supportedLocales: ['en', 'fr_CA']}}, {draft: false});
        await mk('MT', 'u58k2m', {}, {draft: false});
        await mk('X0', 'u58k2x0', {metadata: {subjects: 'off', plainLanguageSummary: 'off'}}, {submitted: true});
        await mk('X1', 'u58k2x1', {metadata: {subjects: 'enable', plainLanguageSummary: 'request'}}, {submitted: true});
        await mk('X2', 'u58k2x2', {metadata: {subjects: 'request', plainLanguageSummary: 'request'}}, {submitted: true});
        await mk('X3', 'u58k2x3', {metadata: {subjects: 'require'}});
        await mk('Y', 'u58k2y', {categories: [{path: 'k2cat', title: 'K2 Category'}], submitWithCategories: true, enablePublisherId: ['publication']}, {submitted: true});
        record('seed', st);
    }

    const {page, close} = await launch(app);
    try {
        // ── ag: the "Author Guidance" tab read as a manager: a new context (D) and publicknowledge; the other tabs' labels ──
        if (on('ag')) {
            const res = {};
            for (const [k, ctx, user] of [['D', st.D.path, `${st.D.path}mgr`], ['PK', PK, 'manager.maya']]) {
                await signIn(page, user, {contextPath: ctx});
                await openWorkflow(page, app, ctx, 'instructions');
                await snap(page, `ag-${k}-01-author-guidance`);
                const g = await readGuidance(page);
                res[k] = {top: await topTabs(page), side: await sideTabs(page), ...g};
                if (k === 'D') {
                    await loc(page, 'Author Guidance: Author Guidelines editor (en)', page.frameLocator(`[id="${enId(g, 'authorGuidelines')}_ifr"]`).locator('body'));
                    await loc(page, 'Author Guidance: the help link "submissions"', page.locator('[id="instructions"] .pkpFormField__description a').first());
                    // the help link: where it leads
                    const a = page.locator('[id="instructions"] .pkpFormField__description a').first();
                    if (await a.count()) {
                        const href = await a.getAttribute('href');
                        const target = await a.getAttribute('target');
                        res.helpLink = {href, target};
                    }
                    // Disable Submissions help (OMP1) and the Contributors help (A7)
                    await page.locator('[id="disableSubmissions-button"]').first().click().catch(() => {});
                    await idle(page); await sleep(800);
                    res.disableHelp = await page.locator('[id="disableSubmissions"] .pkpFormField__description').allInnerTexts().catch(() => []);
                    await snap(page, `ag-${k}-02-disable-submissions`);
                }
                log('ag', k, JSON.stringify({top: res[k].top.map((t) => t.text), fields: res[k].fields.map((f) => [f.label, f.help.slice(0, 90), (f.editorIds || []).length, f.toolbar, f.maxlength])}));
                await signOut(page);
            }
            record('ag', res);
        }

        // ── adefault: D as a visitor and as its author: "Submissions" page, the start form, the wizard ──
        if (on('adefault')) {
            const res = {};
            const D = st.D.path;
            res.subs = await submissionsPage(page, app, D, 'ad-01-submissions-visitor');
            await signIn(page, `${D}au`, {contextPath: D});
            res.start = await startForm(page, app, D, 'ad-02-start-form-author');
            await loc(page, 'start form: the checklist confirmation box', page.getByRole('checkbox', {name: /my submission meets all of these requirements/}));
            // follow the "Submission Guidelines" link of "Before you begin" and the checklist's "Author Guidelines" link
            for (const [i, name] of [['03', 'Submission Guidelines'], ['04', 'Author Guidelines']]) {
                await go(page, app, `/index.php/${D}/submission`);
                const a = page.locator('main').getByRole('link', {name, exact: true}).first();
                const r = {count: await page.locator('main').getByRole('link', {name, exact: true}).count(), href: await a.getAttribute('href').catch(() => null), target: await a.getAttribute('target').catch(() => null)};
                if (r.count) {
                    const popupP = page.context().waitForEvent('page', {timeout: 5000}).catch(() => null);
                    await a.click().catch((e) => { r.err = e.message.slice(0, 100); });
                    const popup = await popupP;
                    const p = popup || page;
                    await p.waitForLoadState('load').catch(() => {});
                    await idle(p);
                    r.landed = p.url();
                    r.popup = !!popup;
                    r.h1 = await p.locator('h1').allInnerTexts().catch(() => []);
                    await snap(p, `ad-${i}-link-${name.replace(/\s+/g, '-')}-landed`);
                    if (popup) await popup.close().catch(() => {});
                }
                res[`link_${name}`] = r;
            }
            // CI control on the Contributors step (open a contributor's Edit)
            const atStep = contribAtStep(page, 'ad-05-contributor-edit');
            res.wizard = await walkWizard(page, app, D, st.D.draft, 'ad-06-wizard', {atStep});
            await signOut(page);
            record('adefault', res);
            log('adefault', JSON.stringify({subs: res.subs.headings, start: [res.start.h1, res.start.checkboxes, res.start.links], links: [res['link_Submission Guidelines'], res['link_Author Guidelines']], rail: res.wizard.rail.map((r) => r.text), steps: res.wizard.steps.map((s) => [s.step, flat(s.text, 160), s.checkboxes, s.contribLabels])}));
        }

        // ── custom: C, every box given a marked text on screen; the author's wizard open during the save ──
        if (on('custom')) {
            const res = {};
            const C = st.C.path;
            const mark = (f) => `K2C ${f} marked text`;
            // the author opens the wizard first (second browser)
            const b2 = await launch(app);
            const p2 = b2.page;
            await signIn(p2, `${C}au`, {contextPath: C});
            await go(p2, app, `/index.php/${C}/submission?id=${st.C.draft}`);
            await p2.locator('.pkpSteps').first().waitFor({timeout: T}).catch(() => {});
            await idle(p2); await sleep(1000);
            res.authorBefore = {step: await currentStep(p2), text: flat(await p2.locator('main').innerText().catch(() => ''), 1500)};
            await snap(p2, 'cu-01-author-wizard-before');
            // the manager types
            await signIn(page, `${C}mgr`, {contextPath: C});
            await openWorkflow(page, app, C, 'instructions');
            const g = await readGuidance(page);
            res.typed = {};
            for (const f of BOXES) {
                const id = enId(g, f);
                if (!id) { res.typed[f] = 'absent'; continue; }
                await typeRich(page, id, mark(f), {replace: true});
                res.typed[f] = id;
            }
            await page.locator('h1').first().click().catch(() => {});
            await snap(page, 'cu-02-typed-unsaved');
            res.save = await saveForm(page, page.locator(`[id="${enId(g, 'authorGuidelines')}"]`), 'cu-03-save');
            res.samePage = (await readGuidance(page)).fields.map((f) => ({label: f.label, content: Object.values(f.content)[0]}));
            await snap(page, 'cu-04-same-page-after-save');
            await openWorkflow(page, app, C, 'instructions');
            res.afterReload = (await readGuidance(page)).fields.map((f) => ({label: f.label, content: Object.values(f.content)[0]}));
            await snap(page, 'cu-05-after-reload');
            await signOut(page);
            // the author's open wizard: same page, next step, then a reload
            res.authorSamePage = {step: await currentStep(p2), hasMarks: BOXES.filter((f) => false)};
            const t0 = flat(await p2.locator('main').innerText().catch(() => ''), 3000);
            res.authorSamePage.marks = (t0.match(/K2C \w+ marked text/g) || []);
            await snap(p2, 'cu-06-author-wizard-same-page');
            const cont = p2.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
            const cur = await currentStep(p2);
            await cont.click().catch(() => {});
            const ts = Date.now();
            while (Date.now() - ts < 10_000 && (await currentStep(p2)) === cur) await sleep(250);
            await idle(p2); await sleep(800);
            res.authorNextStep = {step: await currentStep(p2), marks: (flat(await p2.locator('main').innerText().catch(() => ''), 3000).match(/K2C \w+ marked text/g) || []), text: flat(await p2.locator('main').innerText().catch(() => ''), 800)};
            await snap(p2, 'cu-07-author-wizard-next-step-no-reload');
            await p2.reload(); await idle(p2); await sleep(1200);
            res.authorReload = {step: await currentStep(p2), marks: (flat(await p2.locator('main').innerText().catch(() => ''), 3000).match(/K2C \w+ marked text/g) || [])};
            await snap(p2, 'cu-08-author-wizard-reloaded');
            await signOut(p2).catch(() => {});
            await b2.close();
            // the author: start form and the whole wizard; the visitor: the "Submissions" page
            await signIn(page, `${C}au`, {contextPath: C});
            res.start = await startForm(page, app, C, 'cu-09-start-form');
            res.wizard = await walkWizard(page, app, C, st.C.draft, 'cu-10-wizard');
            await signOut(page);
            res.subs = await submissionsPage(page, app, C, 'cu-11-submissions-visitor');
            record('custom', res);
            log('custom', JSON.stringify({typed: res.typed, save: [res.save.statuses, res.save.responseStatus], same: res.samePage.map((f) => flat(f.content, 60)), reload: res.afterReload.map((f) => flat(f.content, 60)),
                authorBefore: res.authorBefore.step, authorSame: res.authorSamePage, authorNext: [res.authorNextStep.step, res.authorNextStep.marks], authorReload: res.authorReload,
                start: [res.start.checkboxes, (res.start.text.match(/K2C \w+ marked text/g) || [])], steps: res.wizard.steps.map((s) => [s.step, (s.text.match(/K2C \w+ marked text/g) || []), s.checkboxes]), subs: res.subs.parts.map((p) => [p.h, flat(p.after, 80)])}));
        }

        // ── empty: E, a seeded copyright notice first, then every box emptied ──
        if (on('empty')) {
            const res = {};
            const E = st.E.path;
            // before: the copyright notice on the "Submissions" page and the Review step
            res.subsBefore = await submissionsPage(page, app, E, 'em-01-submissions-before');
            await signIn(page, `${E}au`, {contextPath: E});
            res.startBefore = await startForm(page, app, E, 'em-02-start-form-before');
            res.wizardBefore = await walkWizard(page, app, E, st.E.draft, 'em-03-wizard-before');
            await signOut(page);
            await signIn(page, `${E}mgr`, {contextPath: E});
            await openWorkflow(page, app, E, 'instructions');
            const g = await readGuidance(page);
            res.before = g.fields.map((f) => ({label: f.label, content: flat(Object.values(f.content)[0], 100)}));
            for (const f of BOXES) {
                const id = enId(g, f);
                if (id) await typeRich(page, id, '', {replace: true});
            }
            await page.locator('h1').first().click().catch(() => {});
            res.emptiedUnsaved = (await readGuidance(page)).fields.map((f) => ({label: f.label, content: Object.values(f.content)[0]}));
            await snap(page, 'em-04-emptied-unsaved');
            res.save = await saveForm(page, page.locator(`[id="${enId(g, 'authorGuidelines')}"]`), 'em-05-save');
            res.samePage = (await readGuidance(page)).fields.map((f) => ({label: f.label, content: Object.values(f.content)[0]}));
            await snap(page, 'em-06-same-page');
            await openWorkflow(page, app, E, 'instructions');
            res.afterReload = (await readGuidance(page)).fields.map((f) => ({label: f.label, content: Object.values(f.content)[0]}));
            await snap(page, 'em-07-after-reload');
            await signOut(page);
            res.subsAfter = await submissionsPage(page, app, E, 'em-08-submissions-after');
            await signIn(page, `${E}au`, {contextPath: E});
            res.startAfter = await startForm(page, app, E, 'em-09-start-form-after');
            res.wizardAfter = await walkWizard(page, app, E, st.E.draft, 'em-10-wizard-after');
            await signOut(page);
            record('empty', res);
            log('empty', JSON.stringify({subsBefore: res.subsBefore.headings, startBefore: [res.startBefore.checkboxes, res.startBefore.legends], reviewBefore: res.wizardBefore.steps.slice(-1).map((s) => [s.step, s.checkboxes, s.submit]),
                save: [res.save.statuses, res.save.responseStatus, res.save.requests.map((r) => r.body)], same: res.samePage.map((f) => f.content), reload: res.afterReload.map((f) => f.content),
                subsAfter: res.subsAfter.headings, startAfter: [res.startAfter.checkboxes, res.startAfter.legends, flat(res.startAfter.text, 400)], stepsAfter: res.wizardAfter.steps.map((s) => [s.step, flat(s.text, 200), s.checkboxes, s.submit])}));
        }

        // ── long: L, one very long "Author Guidelines" ──
        if (on('long')) {
            const res = {};
            const L = st.L.path;
            const para = 'K2 long guideline sentence number ';
            let long = '';
            for (let i = 0; long.length < 120_000; i++) long += `${para}${i}. `;
            res.typedLength = long.length;
            await signIn(page, `${L}mgr`, {contextPath: L});
            await openWorkflow(page, app, L, 'instructions');
            const g = await readGuidance(page);
            const id = enId(g, 'authorGuidelines');
            await typeRich(page, id, long, {replace: true, insert: true});
            await page.locator('h1').first().click().catch(() => {});
            res.editorLength = (await tinyGet(page, id) || '').length;
            res.save = await saveForm(page, page.locator(`[id="${id}"]`), 'lo-01-save');
            res.save.requests = res.save.requests.map((r) => ({...r, body: undefined}));
            res.samePageLength = (await tinyGet(page, id) || '').length;
            await snap(page, 'lo-02-same-page');
            await openWorkflow(page, app, L, 'instructions');
            await editorsReady(page);
            res.reloadLength = (await tinyGet(page, id) || '').length;
            res.reloadTail = (await tinyGet(page, id) || '').slice(-80);
            await signOut(page);
            const sp = await submissionsPage(page, app, L, 'lo-03-submissions');
            res.subsLength = sp.textLength;
            res.subsHasLast = (sp.text || '').includes(para + '0.');
            res.subsTail = await page.evaluate(() => (document.querySelector('.page_submissions, .pkp_structure_main') || document.body).innerText.slice(-300)).catch(() => null);
            record('long', res);
            log('long', JSON.stringify(res));
        }

        // ── lang: Settings bullet 2 and Cross-feature 446–447: French ticked under "Forms" on screen ──
        if (on('lang')) {
            const res = {};
            const G = st.G.path;
            const dialogs = [];
            page.on('dialog', async (d) => { dialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); });
            const landLanguages = async () => {
                await go(page, app, `/index.php/${G}/management/settings/website`);
                const setup = page.locator('#setup-button').first();
                if (await setup.count() && (await setup.getAttribute('aria-selected').catch(() => null)) !== 'true') await setup.click().catch(() => {});
                await page.locator('#languages-button').filter({visible: true}).first().click().catch(() => {});
                await page.locator('#languageGridContainer .pkp_controllers_grid').first().waitFor({timeout: 20_000}).catch(() => {});
                await idle(page); await sleep(500);
            };
            const readGrid = async () => page.locator('#languageGridContainer').evaluate((c) => ({
                head: [...c.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
                rows: [...c.querySelectorAll('tbody tr.gridRow')].map((r) => ({code: r.id.replace(/^.*-row-/, ''),
                    cells: Object.fromEntries([...r.querySelectorAll('input[type=checkbox], input[type=radio]')].map((b) => [(b.id.match(/-(contextPrimary|uiLocale|formLocale|submissionLocale)/) || [])[1] || b.id, b.checked]))})),
            })).catch((e) => ({error: e.message}));
            const readForms = async (k) => {
                await openWorkflow(page, app, G, 'instructions');
                await editorsReady(page);
                const g = await readGuidance(page);
                const panel = page.getByRole('tabpanel', {name: 'Author Guidance'});
                const out = {langButtons: await panel.getByRole('button', {name: /French|English|Français/}).allInnerTexts().catch(() => []),
                    completed: await panel.getByText(/languages completed/).allInnerTexts().catch(() => []),
                    fields: g.fields.map((f) => ({label: f.label, editors: f.editorIds, contents: Object.fromEntries(Object.entries(f.content).map(([i, c]) => [i, flat(c, 160)]))}))};
                await snap(page, `la-${k}-author-guidance`);
                // the component window's Name
                await page.locator('[id="components-button"]').first().click(); await idle(page); await sleep(1200);
                const add = page.getByRole('link', {name: 'Add a Component'}).first();
                if (await add.count()) {
                    await add.click(); await idle(page);
                    await page.locator('input[name^="name"]').first().waitFor({timeout: T}).catch(() => {});
                    await sleep(800);
                    out.nameInputs = await page.locator('input[name^="name"]').evaluateAll((els) => els.map((e) => ({name: e.name, visible: !!e.offsetParent})));
                    await page.locator('input[name^="name"]').first().focus().catch(() => {});
                    await sleep(500);
                    out.nameInputsFocused = await page.locator('input[name^="name"]').evaluateAll((els) => els.map((e) => ({name: e.name, visible: !!e.offsetParent})));
                    await snap(page, `la-${k}-component-window`);
                    await page.locator('form#genreForm').last().getByRole('link', {name: 'Cancel'}).click().catch(() => {});
                    await sleep(800);
                }
                return out;
            };
            await signIn(page, `${G}mgr`, {contextPath: G});
            await landLanguages();
            res.gridBefore = await readGrid();
            await snap(page, 'la-01-languages-before');
            await loc(page, 'Languages grid: French "Forms" box', page.locator('#languageGridContainer input[id^="select-cell-fr_CA-formLocale"]').first());
            res.one = await readForms('02-one-language');
            await landLanguages();
            const box = page.locator('#languageGridContainer input[id^="select-cell-fr_CA-formLocale"]').first();
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 15_000}).catch(() => null);
            await box.click().catch((e) => { res.tickErr = e.message.slice(0, 100); });
            const r = await w;
            res.tickStatus = r ? r.status() : null;
            await idle(page); await sleep(1500);
            res.notices = await page.locator('[role="alert"], .pkpNotification').allInnerTexts().catch(() => []);
            await snap(page, 'la-03-french-forms-ticked');
            await landLanguages();
            res.gridAfter = await readGrid();
            res.two = await readForms('04-two-languages');
            // type a French text into "Before you begin" and save; read back
            await openWorkflow(page, app, G, 'instructions');
            await editorsReady(page);
            const panel = page.getByRole('tabpanel', {name: 'Author Guidance'});
            const fr = panel.getByRole('button', {name: /French|Français/}).first();
            if (await fr.count()) { await fr.click(); await sleep(600); }
            await snap(page, 'la-05-french-shown');
            const ids = await tinyIds(page);
            const frId = ids.find((i) => /beginSubmissionHelp.*fr_CA/.test(i));
            res.frId = frId;
            if (frId) {
                await typeRich(page, frId, 'K2 texte français avant de commencer', {replace: true});
                await page.locator('h1').first().click().catch(() => {});
                res.save = await saveForm(page, page.locator(`[id="${frId}"]`), 'la-06-save-french');
                await openWorkflow(page, app, G, 'instructions');
                await editorsReady(page);
                res.frAfterReload = await tinyGet(page, frId);
                res.enAfterReload = flat(await tinyGet(page, frId.replace(/fr_CA$/, 'en')), 200);
            }
            await signOut(page);
            page.removeAllListeners('dialog');
            res.dialogs = dialogs;
            // a French read of the "Submissions" page in a browser of its own (a /fr_CA/ address switches the session)
            const b3 = await launch(app);
            res.subsFr = await submissionsPage(b3.page, app, G, 'la-07-submissions-fr', {locale: 'fr_CA'});
            res.subsFr = {headings: res.subsFr.headings, text: flat(res.subsFr.text, 1200)};
            await b3.close();
            record('lang', res);
            log('lang', JSON.stringify({gridBefore: res.gridBefore, one: [res.one.langButtons, res.one.completed, res.one.fields.map((f) => f.editors.length), res.one.nameInputs, res.one.nameInputsFocused], tick: [res.tickStatus, res.notices], gridAfter: res.gridAfter,
                two: [res.two.langButtons, res.two.completed, res.two.fields.map((f) => [f.label, f.editors.length, Object.values(f.contents)[1]]), res.two.nameInputs, res.two.nameInputsFocused], save: res.save && [res.save.statuses, res.save.responseStatus], frAfter: res.frAfterReload, subsFr: res.subsFr}));
        }

        // ── meta: the "Metadata" tab: D and publicknowledge read; td2 and Rules 10–11 on MT; the tab left unsaved ──
        if (on('meta')) {
            const res = {};
            for (const [k, ctx, user] of [['D', st.D.path, `${st.D.path}mgr`], ['PK', PK, 'manager.maya']]) {
                await signIn(page, user, {contextPath: ctx});
                await openWorkflow(page, app, ctx, 'metadata');
                await snap(page, `me-${k}-01-metadata`);
                res[k] = await readMeta(page);
                log('meta', k, metaLine(res[k]));
                await signOut(page);
            }
            const MT = st.MT.path;
            const dialogs = [];
            page.on('dialog', async (d) => { dialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); });
            await signIn(page, `${MT}mgr`, {contextPath: MT});
            await openWorkflow(page, app, MT, 'metadata');
            const panel = page.getByRole('tabpanel', {name: 'Metadata'});
            const subj = panel.getByRole('checkbox', {name: 'Enable subject metadata', exact: true});
            await loc(page, 'Metadata: "Enable subject metadata" box', subj);
            const radios = () => metaField(page, 'Enable subject metadata').locator('input[type=radio]');
            const radioState = async () => radios().evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: ((e.closest('label') || {}).innerText || '').trim()}))).catch(() => []);
            const t = {};
            t.before = {box: await subj.isChecked(), radios: await radioState()};
            await subj.check();
            await sleep(400);
            t.afterTick = {box: await subj.isChecked(), radios: await radioState()};
            await snap(page, 'me-02-subjects-ticked');
            await loc(page, 'Metadata: subjects "Require…" choice', radios().filter({has: page.locator('[value="require"]')}).or(metaField(page, 'Enable subject metadata').locator('input[value="require"]')));
            await metaField(page, 'Enable subject metadata').locator('input[value="require"]').check().catch((e) => { t.requireErr = e.message.slice(0, 100); });
            t.afterRequire = await radioState();
            await subj.uncheck();
            await sleep(400);
            t.afterUntick = {box: await subj.isChecked(), radios: await radioState()};
            await snap(page, 'me-03-subjects-unticked');
            await subj.check();
            await sleep(400);
            t.afterRetick = {box: await subj.isChecked(), radios: await radioState()};
            await snap(page, 'me-04-subjects-reticked');
            t.save = await saveForm(page, page.locator('input[type="checkbox"][value="enable"]'), 'me-05-save');
            t.samePage = {box: await subj.isChecked(), radios: await radioState()};
            await openWorkflow(page, app, MT, 'metadata');
            t.afterReload = {box: await panel.getByRole('checkbox', {name: 'Enable subject metadata', exact: true}).isChecked(), radios: await radioState()};
            await snap(page, 'me-06-after-reload');
            // "Ask" saved, both reads
            await metaField(page, 'Enable subject metadata').locator('input[value="request"]').check().catch(() => {});
            t.saveAsk = await saveForm(page, page.locator('input[type="checkbox"][value="enable"]'), 'me-07-save-ask');
            t.askSamePage = await radioState();
            await openWorkflow(page, app, MT, 'metadata');
            t.askReload = await radioState();
            res.td2 = t;
            // Rule 11: the dependent boxes
            const r11 = {};
            for (const [parent, child] of [['Enable references metadata', /references structuring and metadata lookup/], ['Enable funder metadata', /Grant ID validation/]]) {
                const pb = panel.getByRole('checkbox', {name: parent, exact: true});
                const childBox = panel.getByRole('checkbox', {name: child});
                const o = {parentBefore: await pb.isChecked().catch(() => null), childBefore: await childBox.count()};
                await pb.uncheck().catch(() => {});
                await sleep(500);
                o.parentAfter = await pb.isChecked().catch(() => null);
                o.childAfterUntick = await childBox.count();
                await snap(page, `me-08-untick-${parent.split(' ')[1]}`);
                await pb.check().catch(() => {});
                await sleep(500);
                o.childAfterRetick = await childBox.count();
                o.parentRetickRadios = await metaField(page, parent).locator('input[type=radio]').evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value)).catch(() => []);
                r11[parent] = o;
            }
            res.rule11 = r11;
            // an unsaved change: another side tab and back, then a reload
            await openWorkflow(page, app, MT, 'metadata');
            await panel.getByRole('checkbox', {name: 'Enable coverage metadata', exact: true}).check().catch(() => {});
            const u = {ticked: await panel.getByRole('checkbox', {name: 'Enable coverage metadata', exact: true}).isChecked().catch(() => null)};
            await page.locator('[id="components-button"]').first().click(); await idle(page); await sleep(1000);
            await page.locator('[id="metadata-button"]').first().click(); await idle(page); await sleep(1000);
            u.afterSideRoundTrip = await panel.getByRole('checkbox', {name: 'Enable coverage metadata', exact: true}).isChecked().catch(() => null);
            await snap(page, 'me-09-unsaved-after-side-tab');
            const d0 = dialogs.length;
            await page.locator('[id="review-button"], [id="emails-button"]').first().click().catch(() => {});
            await idle(page); await sleep(800);
            await page.locator('[id="submission-button"]').first().click().catch(() => {});
            await page.locator('[id="metadata-button"]').first().click().catch(() => {});
            await idle(page); await sleep(800);
            u.afterTopTabRoundTrip = await panel.getByRole('checkbox', {name: 'Enable coverage metadata', exact: true}).isChecked().catch(() => null);
            await go(page, app, `/index.php/${MT}/management/settings/context`);
            u.leaveDialogs = dialogs.slice(d0);
            await openWorkflow(page, app, MT, 'metadata');
            u.afterLeave = await panel.getByRole('checkbox', {name: 'Enable coverage metadata', exact: true}).isChecked().catch(() => null);
            await snap(page, 'me-10-after-leave');
            res.unsaved = u;
            await signOut(page);
            page.removeAllListeners('dialog');
            record('meta', res);
            log('meta', JSON.stringify({td2: t, rule11: r11, unsaved: u}));
        }

        // ── effect: Rule 12 on X0–X3; the author's wizard and the publication pages ──
        if (on('effect')) {
            const res = {};
            // X1: plain language summary set to "Require" on screen first
            const X1 = st.X1.path;
            await signIn(page, `${X1}mgr`, {contextPath: X1});
            await openWorkflow(page, app, X1, 'metadata');
            const pls = metaField(page, 'Enable plain language summary metadata');
            await pls.locator('input[value="require"]').check().catch((e) => { res.plsErr = e.message.slice(0, 100); });
            res.plsSave = await saveForm(page, page.getByRole('checkbox', {name: 'Enable plain language summary metadata', exact: true}), 'ef-00-x1-pls-require-save');
            res.x1Meta = metaLine(await readMeta(page));
            await signOut(page);
            for (const k of ['X0', 'X1', 'X2', 'X3']) {
                const c = st[k];
                const r = {};
                await signIn(page, `${c.path}au`, {contextPath: c.path});
                r.wizard = await walkWizard(page, app, c.path, c.draft, `ef-${k}-wizard`);
                await signOut(page);
                if (c.sub) {
                    await signIn(page, `${c.path}mgr`, {contextPath: c.path});
                    await gotoWorkflow(page, app, c.path, c.sub);
                    r.menu = (await entryInfo(page)).menu;
                    r.ta = {opened: await openEntry(page, 'Title & Abstract')};
                    if (r.ta.opened) { r.ta.labels = (await entryInfo(page)).labels; await snap(page, `ef-${k}-title-abstract`); }
                    r.md = {opened: await openEntry(page, 'Metadata')};
                    if (r.md.opened) {
                        r.md.labels = (await entryInfo(page)).labels;
                        await snap(page, `ef-${k}-metadata-page`);
                        r.md.save = await pubSave(page);
                        await snap(page, `ef-${k}-metadata-page-after-save`);
                    }
                    await signOut(page);
                }
                res[k] = r;
                log('effect', k, JSON.stringify({rail: r.wizard.rail.map((x) => x.text), steps: r.wizard.steps.map((s) => [s.step, s.labels.filter((l) => /Subject|Plain Language|Keyword/i.test(l)), s.required, /Review$/.test(s.step || '') ? [s.errors, s.submit] : null]), menu: r.menu, ta: r.ta && r.ta.labels, md: r.md && [r.md.labels, r.md.save]}));
            }
            record('effect', res);
        }

        // ── cross: Y (categories, publisher ID, competing interests) and the reviewer suggestions step control ──
        if (on('cross')) {
            const res = {};
            const Y = st.Y.path;
            await signIn(page, `${Y}mgr`, {contextPath: Y});
            await openWorkflow(page, app, Y, 'metadata');
            const ci = page.getByRole('tabpanel', {name: 'Metadata'}).getByRole('checkbox', {name: /Competing Interest/});
            res.ciBefore = await ci.isChecked().catch(() => null);
            await ci.check().catch((e) => { res.ciErr = e.message.slice(0, 100); });
            res.ciSave = await saveForm(page, page.locator('input[type="checkbox"][value="enable"]'), 'cr-01-ci-save');
            res.yMeta = metaLine(await readMeta(page));
            await snap(page, 'cr-02-metadata-after-save');
            // Workflow Settings top tabs (Cross-feature 444)
            res.topTabs = await topTabs(page);
            await signOut(page);
            await signIn(page, `${Y}au`, {contextPath: Y});
            const atStep = contribAtStep(page, 'cr-03-contributor-edit');
            res.wizard = await walkWizard(page, app, Y, st.Y.draft, 'cr-04-wizard', {atStep});
            await signOut(page);
            await signIn(page, `${Y}mgr`, {contextPath: Y});
            await gotoWorkflow(page, app, Y, st.Y.sub);
            res.menu = (await entryInfo(page)).menu;
            for (const e of ['Identifiers', 'Metadata', 'Title & Abstract']) {
                const opened = await openEntry(page, e);
                res[`entry_${e}`] = opened ? (await entryInfo(page)).labels : 'absent';
                if (opened) await snap(page, `cr-05-entry-${e.replace(/\W+/g, '-')}`);
            }
            await signOut(page);
            record('cross', res);
            log('cross', JSON.stringify({ci: [res.ciBefore, res.ciSave.statuses], yMeta: res.yMeta, top: res.topTabs.map((t) => t.text), rail: res.wizard.rail.map((r) => r.text), steps: res.wizard.steps.map((s) => [s.step, s.labels.filter((l) => /Categor|Competing|Publisher/i.test(l)), s.contribLabels && s.contribLabels.filter((l) => /Competing/i.test(l))]), menu: res.menu, ids: res.entry_Identifiers, md: res.entry_Metadata}));
        }
        // ── custom2: Rule 7 again on C (a second run): the start form and the wizard open while the texts change ──
        if (on('custom2')) {
            const res = {};
            const C = st.C.path;
            const rx = /K2R2 \w+ second text/g;
            const b2 = await launch(app);
            const p2 = b2.page;
            await signIn(p2, `${C}au`, {contextPath: C});
            await go(p2, app, `/index.php/${C}/submission?id=${st.C.draft}`);
            await p2.locator('.pkpSteps').first().waitFor({timeout: T}).catch(() => {});
            await idle(p2); await sleep(800);
            await expandRail(p2);
            const first = p2.locator('button.pkpSteps__step__label').first();
            if (await first.count()) { await first.click().catch(() => {}); await idle(p2); await sleep(800); }
            res.wizardBefore = await currentStep(p2);
            const b3 = await launch(app);
            const p3 = b3.page;
            await signIn(p3, `${C}au`, {contextPath: C});
            await go(p3, app, `/index.php/${C}/submission`);
            res.startBefore = (flat(await p3.locator('main').innerText().catch(() => ''), 3000).match(/K2C \w+ marked text|K2R2 \w+ second text/g) || []);
            // the manager changes three boxes
            await signIn(page, `${C}mgr`, {contextPath: C});
            await openWorkflow(page, app, C, 'instructions');
            const g = await readGuidance(page);
            for (const f of ['beginSubmissionHelp', 'detailsHelp', 'contributorsHelp', 'reviewHelp']) await typeRich(page, enId(g, f), `K2R2 ${f} second text`, {replace: true});
            await page.locator('h1').first().click().catch(() => {});
            res.save = await saveForm(page, page.locator(`[id="${enId(g, 'detailsHelp')}"]`), 'c2-01-save');
            await signOut(page);
            // the open start form: same page, then reload
            res.startSame = (flat(await p3.locator('main').innerText().catch(() => ''), 3000).match(/K2C \w+ marked text|K2R2 \w+ second text/g) || []);
            await snap(p3, 'c2-02-start-form-same-page');
            await p3.reload(); await idle(p3); await sleep(800);
            res.startReload = (flat(await p3.locator('main').innerText().catch(() => ''), 3000).match(/K2C \w+ marked text|K2R2 \w+ second text/g) || []);
            await snap(p3, 'c2-03-start-form-reloaded');
            await b3.close();
            // the open wizard: Continue through the steps without a reload, then reload
            res.noReload = await walkWizard(p2, app, C, st.C.draft, 'c2-04-wizard-no-reload', {reload: false, fromFirst: false});
            res.noReload = res.noReload.steps.map((s) => [s.step, (s.text.match(/K2C \w+ marked text|K2R2 \w+ second text/g) || [])]);
            res.reloaded = await walkWizard(p2, app, C, st.C.draft, 'c2-05-wizard-reloaded');
            res.reloaded = res.reloaded.steps.map((s) => [s.step, (s.text.match(/K2C \w+ marked text|K2R2 \w+ second text/g) || [])]);
            await b2.close();
            record('custom2', res);
            log('custom2', JSON.stringify(res, (k, v) => (k === 'requests' ? undefined : v)));
        }

        // ── effect2: subjects "Require" set on screen (X2), then a later save of the publication's Metadata page;
        //    the closed-journal start screen and a draft opened while closed (L; Cross-feature 417–418) ──
        if (on('effect2')) {
            const res = {};
            const X2 = st.X2.path;
            await signIn(page, `${X2}mgr`, {contextPath: X2});
            await openWorkflow(page, app, X2, 'metadata');
            await metaField(page, 'Enable subject metadata').locator('input[value="require"]').check().catch((e) => { res.err = e.message.slice(0, 100); });
            res.save = await saveForm(page, page.locator('input[type="checkbox"][value="enable"]'), 'e2-01-x2-subjects-require-save');
            res.meta = metaLine(await readMeta(page));
            await gotoWorkflow(page, app, X2, st.X2.sub);
            res.md = {opened: await openEntry(page, 'Metadata')};
            if (res.md.opened) {
                res.md.labels = (await entryInfo(page)).labels;
                await snap(page, 'e2-02-x2-metadata-page');
                res.md.save = await pubSave(page);
                await snap(page, 'e2-03-x2-metadata-page-after-save');
            }
            await signOut(page);
            // L: submissions disabled on screen
            const L = st.L.path;
            if (!st.L.draft) {
                const d = await app.api.createSubmission({tag: `${L}d`, context: L, submitter: `${L}au`, title: 'K2 draft L', submitted: false, ...(isOps ? {} : {files: [{file: 'article.pdf'}]})});
                st.L.draft = d.submissionId;
                saveSt();
            }
            await signIn(page, `${L}mgr`, {contextPath: L});
            await openWorkflow(page, app, L, null);
            const box = page.locator('input[name="disableSubmissions"]').first();
            await box.check().catch(() => {});
            res.disable = await saveForm(page, box, 'e2-04-l-disable-save');
            await signOut(page);
            await signIn(page, `${L}au`, {contextPath: L});
            res.start = await startForm(page, app, L, 'e2-05-l-start-closed');
            res.start = {h1: res.start.h1, begin: res.start.begin, text: flat(res.start.text, 600)};
            const w = await walkWizard(page, app, L, st.L.draft, 'e2-06-l-draft-closed');
            res.draft = {rail: w.rail.map((r) => r.text), steps: w.steps.map((s) => [s.step, flat(s.text, 200)]), submit: w.steps.length ? w.steps[w.steps.length - 1].submit : null};
            await signOut(page);
            record('effect2', res);
            log('effect2', JSON.stringify({save: res.save.statuses, meta: res.meta, md: res.md, disable: res.disable.statuses, start: res.start, draft: res.draft}));
        }

        // ── frstart: G after "lang": the French start form and French "Submissions" page as the author (own browser) ──
        if (on('frstart')) {
            const res = {};
            const G = st.G.path;
            const b = await launch(app);
            await signIn(b.page, `${G}au`, {contextPath: G});
            await go(b.page, app, `/index.php/${G}/fr_CA/submission`);
            await sleep(800);
            await snap(b.page, 'fr-01-start-form-fr');
            res.start = flat(await b.page.locator('main').innerText().catch(() => ''), 1500);
            // a second context with French under "Forms" from creation (F): its untouched French texts
            if (!st.F) {
                const t = tag('u58k2f');
                await app.api.createContext({tag: t, context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
                    users: [{username: `${t}au`, roles: ['author'], givenName: 'Ava', familyName: 'Author'}]});
                st.F = {path: t};
                saveSt();
            }
            await signIn(b.page, `${st.F.path}au`, {contextPath: st.F.path});
            await go(b.page, app, `/index.php/${st.F.path}/fr_CA/submission`);
            await sleep(800);
            await snap(b.page, 'fr-02-start-form-fr-F');
            res.startF = flat(await b.page.locator('main').innerText().catch(() => ''), 1500);
            await b.close();
            record('frstart', res);
            log('frstart', JSON.stringify(res));
        }

        // ── gate: a draft without a file where subjects are required (X3): the Review step's blockers (Cross-feature 418–419) ──
        if (on('gate')) {
            const res = {};
            const X3 = st.X3.path;
            if (!st.X3.nofile) {
                const d = await app.api.createSubmission({tag: `${X3}n`, context: X3, submitter: `${X3}au`, title: 'K2 draft no file', submitted: false});
                st.X3.nofile = d.submissionId;
                saveSt();
            }
            await signIn(page, `${X3}au`, {contextPath: X3});
            res.wizard = await walkWizard(page, app, X3, st.X3.nofile, 'ga-01-wizard');
            const rv = res.wizard.steps[res.wizard.steps.length - 1];
            res.review = {step: rv.step, submit: rv.submit, text: rv.text.slice(rv.text.indexOf('Review and Submit'), rv.text.indexOf('Review and Submit') + 1500)};
            await signOut(page);
            record('gate', res);
            log('gate', JSON.stringify(res.review));
        }
    } finally {
        await close();
    }
});
