// U66 claim check K2: the Institutions page itself (spec body 49–77 Fields,
// 91–135 Rules 3–7/7a/7b, 182–189 Setting 4; register A2, A3, A5, A7).
//
// Seeds its own scratch contexts per app (POST scenarios/context), signs in
// as each context's throwaway manager (`<tag>mg`) and records every screen
// with screen(). Read-only: publicknowledge's Languages tab as manager.maya.
// Nothing site-wide is changed.
//
// Contexts (one set per run and app):
//   A    one form language: the empty page, the Add panel, refusals, closing
//        Add unsaved, repeated names, ROR shapes (q9), the one-language edit
//        refusal, a two-line IP range read back on Edit
//   I    one form language: every IP-range shape (q8)
//   X    one form language: an "IP ranges" line longer than 40 characters, Save pressed twice; 40 and 41
//   B    one form language: row order (q2), a search kept while adding,
//        "Delete" with "No" and "Yes" (Rule 7, 7b / q5)
//   C    English + French forms: "Name in French", the add and edit
//        refusals, the rows in the French screens (Rule 3), Search (q3),
//        Edit filling / emptying / renaming, closing Edit unsaved (q4, A2)
//   P    30 seeded institutions: no pager; the 31st added on screen; page 2;
//        an add from page 2 (Rule 3, Rule 5)
//   S    {OJS} an institutional subscription naming "Campus Library": Rule 7a (q6)
//   L    the Languages tab: publicknowledge (manager.maya) and context A
//
// Run (each run under its own facts name):
//   RUN=r1 PROBE_FEATURE=U66 PROBE_AGENT=ccK2 node bin/probe.js ojs shared/playwright/checks/U66/K2/k2.js
//   PHASES=A,I,X,B,C,P,S,L picks steps (default all).
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const PHASES = (process.env.PHASES || 'A,I,X,B,C,P,S,L').split(',');
const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const IPS = [
    ['single', '142.58.103.1'],
    ['range', '142.58.103.1-142.58.103.4'],
    ['range-spaced', '142.58.103.1 - 142.58.103.4'],
    ['wild', '142.58.*.*'],
    ['wild-all', '*.*.*.*'],
    ['wild-range', '142.58.*.1 - 142.58.*.9'],
    ['cidr24', '142.58.100.0/24'],
    ['cidr0', '0.0.0.0/0'],
    ['cidr32', '142.58.100.1/32'],
    ['high-low', '142.58.103.4 - 142.58.103.1'],
    ['repeat', '142.58.103.1\n142.58.103.1'],
    ['two-lines', '142.58.103.1\n10.1.0.0/16'],
    ['gap', '142.58.103.1\n\n142.58.103.2'],
    ['edge-lines', '\n142.58.103.1\n'],
    ['edge-spaces', '\n\n   142.58.103.1   \n\n'],
    ['lead-zero', '010.0.0.1'],
    ['part-256', '256.1.1.1'],
    ['two-bad', '256.1.1.1\n300.1.1.1'],
    ['cidr33', '142.58.100.0/33'],
    ['wild-cidr', '142.58.*.0/24'],
    ['ipv6', '2001:db8::1'],
    ['ipv6-range', '2001:db8::1 - 2001:db8::9'],
    ['ipv6-cidr', '2001:db8::/32'],
    ['long', `142.58.103.1${' '.repeat(10)}-${' '.repeat(10)}142.58.103.4`],
    ['inner-space', '142.58. 103.1'],
];
const RORS = [
    ['full', 'https://ror.org/0213rcc28'],
    ['id-alone', '0213rcc28'],
    ['no-scheme', 'ror.org/0213rcc28'],
    ['http', 'http://ror.org/0213rcc28'],
    ['starts-1', 'https://ror.org/1213rcc28'],
    ['trailing-slash', 'https://ror.org/0213rcc28/'],
    ['letters-end', 'https://ror.org/0213rcc2x'],
    ['upper-host', 'HTTPS://ROR.ORG/0213rcc28'],
    ['spaces', '  https://ror.org/0213rcc28  '],
];

// The body of a server error and the message of an "Error" window are not
// recorded (their status and title are).
const WITHHELD = '[not recorded]';
function redact(s) {
    if (s && s.text && typeof s.text.dialog === 'string' && /^\s*Error\b/.test(s.text.dialog)) s.text.dialog = `Error ${WITHHELD}`;
    if (s && s.aria && Array.isArray(s.aria.dialogs)) s.aria.dialogs = s.aria.dialogs.map((d) => (/^- dialog "Error"/.test(d) ? `- dialog "Error": ${WITHHELD}` : d));
    return s;
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name} ${RUN}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const save = () => record(`${RUN}-facts`, facts, {merge: true});
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
    const bad = [];
    page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
    const since = (n0, e0) => ({bad: bad.slice(n0), errs: errs.slice(e0)});

    async function snap(name, {png = false} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        s = redact(s);
        record(`${RUN}-${name}`, s);
        if (png && !JSON.stringify(s).includes(WITHHELD)) await shot(page, `${RUN}-${name}`).catch(() => {});
        return s;
    }
    const url = (ctx, p, locale = 'en') => app.url(`/index.php/${ctx}/${locale}${p}`);
    const pageURL = (ctx, locale = 'en') => url(ctx, '/management/settings/institutions', locale);
    async function land(ctx, locale = 'en') {
        const r = await page.goto(pageURL(ctx, locale));
        await idle(page);
        await page.locator('.institutionsListPanel').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        return r ? r.status() : null;
    }
    async function listRead() {
        return page.evaluate(() => {
            const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const main = document.querySelector('main') || document.body;
            const panel = main.querySelector('.institutionsListPanel');
            if (!panel) return {h1: t(main.querySelector('h1')), panel: null, main: t(main).slice(0, 400)};
            const pag = panel.querySelector('.pkpPagination, nav');
            return {
                h1: t(main.querySelector('h1')),
                h2: t(panel.querySelector('h2')),
                rows: [...panel.querySelectorAll('.listPanel__item')].map((li) => t(li.querySelector('span[id^="institution-"]'))),
                rowButtons: [...new Set([...panel.querySelectorAll('.listPanel__item')].map((li) => [...li.querySelectorAll('button')].map(t).join('/')))],
                count: panel.querySelectorAll('.listPanel__item').length,
                pager: pag ? {text: t(pag), buttons: [...pag.querySelectorAll('button, a')].map((b) => `${t(b) || ''}${b.getAttribute('aria-label') ? `[${b.getAttribute('aria-label')}]` : ''}${b.getAttribute('aria-current') && b.getAttribute('aria-current') !== 'false' ? '(current)' : ''}${b.disabled ? '(dis)' : ''}`)} : null,
                search: (panel.querySelector('input[type=search]') || {}).value,
                clearButton: [...panel.querySelectorAll('.pkpSearch button')].map((b) => t(b)),
                headerButtons: [...panel.querySelectorAll('.pkpHeader button')].map(t),
                text: t(panel).slice(0, 1200),
            };
        });
    }
    const addBtn = () => page.locator('.institutionsListPanel').getByRole('button', {name: 'Add Institution', exact: true});
    const dlgAdd = () => page.getByRole('dialog', {name: 'Add Institution'});
    const dlgEdit = () => page.getByRole('dialog', {name: 'Edit Institution'});
    const rowOf = (name) => page.locator('.institutionsListPanel .listPanel__item').filter({has: page.locator('span[id^="institution-"]', {hasText: new RegExp(`^\\s*${esc(name)}\\s*$`)})});
    async function panelRead(dlg) {
        return dlg.evaluate((root) => {
            const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const vis = (e) => !!(e && e.getClientRects().length);
            return {
                title: t(root.querySelector('h1, h2')),
                locales: [...root.querySelectorAll('.pkpFormLocales__locale')].map((e) => `${t(e)}${e.tagName === 'BUTTON' ? '(button)' : ''}${/isPrimary/.test(e.className) ? '(primary)' : ''}${/isActive|current/i.test(e.className) ? '(active)' : ''}`),
                fields: [...root.querySelectorAll('.pkpFormField')].filter(vis).map((f) => ({
                    label: t(f.querySelector('.pkpFormField__heading')),
                    required: !!f.querySelector('.pkpFormFieldLabel__required'),
                    desc: t(f.querySelector('.pkpFormField__description')),
                    err: t(f.querySelector('.pkpFieldError')),
                    inputs: [...f.querySelectorAll('input, textarea')].filter((i) => i.type !== 'hidden' && i.type !== 'submit').map((i) => ({name: i.name, tag: i.tagName.toLowerCase(), value: i.value, invalid: i.getAttribute('aria-invalid'), visible: vis(i)})),
                })),
                footer: t(root.querySelector('.pkpFormPage__footer')),
                buttons: [...root.querySelectorAll('button')].filter(vis).map((b) => `${t(b) || b.getAttribute('aria-label')}${b.disabled ? '(dis)' : ''}`),
                listboxes: root.querySelectorAll('[role="listbox"], [role="option"], .autosuggest, [class*="autosuggest"]').length,
            };
        });
    }
    async function openAdd() {
        await addBtn().click();
        const d = dlgAdd();
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page); await pause(300);
        return d;
    }
    async function openEdit(name) {
        await rowOf(name).first().getByRole('button', {name: 'Edit', exact: true}).click();
        const d = dlgEdit();
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page); await pause(300);
        return d;
    }
    async function fill(d, {name, fr, ip, ror}) {
        if (name !== undefined) await d.locator('input[name="name-en"]').fill(name);
        if (fr !== undefined) {
            const box = d.locator('input[name="name-fr_CA"]');
            if (!(await box.isVisible().catch(() => false))) await d.locator('.pkpFormLocales').getByRole('button', {name: 'French'}).click().catch(() => {});
            await box.fill(fr);
        }
        if (ip !== undefined) await d.locator('textarea[name="ipRanges"]').fill(ip);
        if (ror !== undefined) await d.locator('input[name="ror"]').fill(ror);
    }
    async function pressSave(d) {
        const b0 = bad.length; const e0 = errs.length;
        const btn = d.getByRole('button', {name: 'Save', exact: true});
        if (await btn.isDisabled().catch(() => false)) return {saveDisabled: true};
        const resp = page.waitForResponse((r) => /\/api\/v1\/institutions/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await btn.click();
        const r = await resp;
        let body = null;
        if (r && r.status() !== 200) body = r.status() >= 500 ? WITHHELD : flat(await r.text().catch(() => null), 500);
        await idle(page); await pause(900);
        const open = await d.isVisible().catch(() => false);
        const out = {status: r ? r.status() : null, method: r ? r.request().method() : null, override: r ? r.request().headers()['x-http-method-override'] || null : null, body, open};
        if (open) out.panel = await panelRead(d);
        const s = since(b0, e0);
        if (s.bad.length) out.bad = s.bad;
        if (s.errs.length) out.pageErrors = s.errs;
        return out;
    }
    async function closePanel(d, how) {
        if (how === 'control') await d.getByRole('button', {name: 'Close', exact: true}).first().click();
        else if (how === 'escape') await page.keyboard.press('Escape');
        else if (how === 'outside') await page.mouse.click(40, 500);
        await d.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
        await pause(800); // the modal store's slot (patterns pitfall 4)
        return !(await d.isVisible().catch(() => false));
    }

    async function mk(key, spec) {
        const t = tag(`u66k2${key.toLowerCase()}`);
        const r = await app.api.createContext({tag: t, ...spec(t), users: [{username: `${t}mg`, roles: ['manager']}, ...((spec(t).users) || [])]});
        fact(`ctx ${key}`, {path: r.path || t, institutions: r.institutions || null, subs: r.subscriptions || null});
        return r.path || t;
    }

    try {
        // ================================================================== A
        if (PHASES.includes('A')) {
            const A = await mk('A', () => ({}));
            await signIn(page, `${A}mg`);
            fact('A land', await land(A));
            let s = await snap('A01-empty', {png: true});
            fact('A empty list', await listRead());
            await loc(page, 'Institutions page: the list panel', page.locator('.institutionsListPanel'));
            await loc(page, 'Institutions page: Search box', page.locator('.institutionsListPanel').getByRole('searchbox', {name: 'Search'}));
            await loc(page, 'Institutions page: Add Institution', addBtn());
            fact('A empty main', flat(s.text.main, 600));

            let d = await openAdd();
            s = await snap('A02-add-open', {png: true});
            fact('A add open', await panelRead(d));
            fact('A add dialog aria', s.aria.dialogs.join('\n').slice(0, 2500));
            await loc(page, 'Add Institution panel', dlgAdd());
            await loc(page, 'Add panel: Name (en)', d.locator('input[name="name-en"]'));
            await loc(page, 'Add panel: IP ranges', d.locator('textarea[name="ipRanges"]'));
            await loc(page, 'Add panel: ROR', d.locator('input[name="ror"]'));
            // typing in ROR: any suggestions?
            await d.locator('input[name="ror"]').pressSequentially('0213rcc', {delay: 60});
            await pause(1500); await idle(page);
            fact('A ror typing', {listboxes: await page.locator('[role="listbox"]:visible, [role="option"]:visible').count(), panel: (await panelRead(d)).listboxes});
            await snap('A03-ror-typing');
            await d.locator('input[name="ror"]').fill('');
            // empty save
            let r = await pressSave(d);
            s = await snap('A04-refused-empty', {png: true});
            fact('A refused empty', {...r, notices: s.notices});
            await loc(page, 'Add panel: the error summary', d.locator('.pkpFormPage__footer'));
            await loc(page, 'Add panel: "Go to Name: …" button', d.getByRole('button', {name: /^Go to Name/}));
            // Save grayed until a flagged box changes: type in the unflagged ROR first
            await d.locator('input[name="ror"]').fill('x');
            fact('A save after ROR typed (unflagged)', {disabled: await d.getByRole('button', {name: 'Save', exact: true}).isDisabled()});
            await d.locator('input[name="ror"]').fill('');
            await d.locator('input[name="name-en"]').fill('Z');
            fact('A save after Name typed (flagged)', {disabled: await d.getByRole('button', {name: 'Save', exact: true}).isDisabled()});
            await d.locator('input[name="name-en"]').fill('');
            // three faults at once
            await fill(d, {name: '', ip: '256.1.1.1', ror: 'x'});
            r = await pressSave(d);
            s = await snap('A05-refused-three', {png: true});
            fact('A refused three', {...r, notices: s.notices});
            // "Go to" button focus
            const goTo = d.getByRole('button', {name: /^Go to IP ranges/});
            fact('A error list visibility', await d.locator('.pkpFormErrors').evaluate((root) => ({
                text: root.innerText.replace(/\s+/g, ' ').trim(),
                items: [...root.querySelectorAll('button')].map((b) => { const r = b.getBoundingClientRect(); return {text: b.innerText.trim(), w: Math.round(r.width), h: Math.round(r.height), sr: !!b.closest('.-screenReader')}; }),
            })).catch((e) => String(e.message).slice(0, 100)));
            if (await goTo.count()) {
                await goTo.first().focus();
                await page.keyboard.press('Enter');
                await pause(400);
                fact('A go-to IP focus', await page.evaluate(() => ({name: document.activeElement && document.activeElement.name, id: document.activeElement && document.activeElement.id, tag: document.activeElement && document.activeElement.tagName, text: document.activeElement && (document.activeElement.innerText || '').slice(0, 60)})));
            }
            const jump = d.getByRole('button', {name: 'Jump to next error'});
            if (await jump.count()) {
                await jump.click(); await pause(600);
                fact('A jump to next error focus', await page.evaluate(() => ({name: document.activeElement && document.activeElement.name, id: document.activeElement && document.activeElement.id, tag: document.activeElement && document.activeElement.tagName, text: document.activeElement && (document.activeElement.innerText || '').slice(0, 60)})));
            }
            await closePanel(d, 'control');
            fact('A list after refused adds', await listRead());

            // Closing "Add Institution" with typed text, three ways; reopen reads empty?
            for (const how of ['control', 'escape', 'outside']) {
                d = await openAdd();
                await fill(d, {name: `Unsaved ${how}`, ip: '10.0.0.1', ror: 'https://ror.org/0213rcc28'});
                const n0 = (await listRead()).count;
                const closed = await closePanel(d, how);
                s = await snap(`A06-add-closed-${how}`);
                const lr = await listRead();
                d = await openAdd();
                const re = await panelRead(d);
                await closePanel(d, 'control');
                fact(`A add closed by ${how}`, {closed, dialogsSeen: s.aria.dialogs.length, rowsBefore: n0, rowsAfter: lr.count, reopened: re.fields.map((f) => f.inputs.map((i) => i.value).join('|'))});
            }
            // repeated name
            for (let i = 0; i < 2; i++) {
                d = await openAdd();
                await fill(d, {name: 'Dup Library'});
                fact(`A dup add ${i + 1}`, await pressSave(d));
            }
            fact('A list after dup', await listRead());
            await snap('A07-dup');
            await page.reload(); await idle(page);
            fact('A list after dup reload', await listRead());
            // ROR shapes (q9)
            for (const [k, v] of RORS) {
                d = await openAdd();
                await fill(d, {name: `ROR ${k}`, ror: v});
                r = await pressSave(d);
                s = await snap(`A08-ror-${k}`);
                const out = {typed: v, closed: !r.open, status: r.status, err: r.panel ? r.panel.fields.filter((f) => f.err).map((f) => `${f.label}: ${f.err}`) : null, footer: r.panel ? r.panel.footer : null, notices: s.notices, bad: r.bad, pageErrors: r.pageErrors};
                if (r.open) await closePanel(d, 'control');
                else {
                    const e = await openEdit(`ROR ${k}`);
                    out.editRor = await e.locator('input[name="ror"]').inputValue();
                    await closePanel(e, 'control');
                }
                fact(`A ror ${k}`, out);
            }
            fact('A list after ror', await listRead());
            await page.reload(); await idle(page);
            fact('A list after ror reload', await listRead());
            // one-language edit refusal
            const e = await openEdit('Dup Library');
            await snap('A09-edit-open');
            fact('A edit open', await panelRead(e));
            await fill(e, {name: ''});
            r = await pressSave(e);
            s = await snap('A10-edit-refused-empty', {png: true});
            fact('A edit refused empty (one language)', {...r, notices: s.notices});
            await closePanel(e, 'control');
            await page.reload(); await idle(page);
            fact('A list after edit refusal reload', await listRead());
            save();
        }

        // ================================================================== I (q8)
        if (PHASES.includes('I')) {
            const I = await mk('I', () => ({}));
            await signIn(page, `${I}mg`);
            await land(I);
            await snap('I00-page');
            for (const [k, v] of IPS) {
                const d = await openAdd();
                await fill(d, {name: `IP ${k}`, ip: v});
                const r = await pressSave(d);
                const s = await snap(`I01-ip-${k}`);
                const out = {typed: JSON.stringify(v), closed: !r.open, status: r.status, body: r.body, err: r.panel ? r.panel.fields.filter((f) => f.err).map((f) => `${f.label}: ${f.err}`) : null, footer: r.panel ? r.panel.footer : null, notices: s.notices, bad: r.bad, pageErrors: r.pageErrors};
                if (r.open) {
                    out.textareaAfter = JSON.stringify(await d.locator('textarea[name="ipRanges"]').inputValue());
                    await closePanel(d, 'control');
                } else {
                    const e = await openEdit(`IP ${k}`);
                    out.editIp = JSON.stringify(await e.locator('textarea[name="ipRanges"]').inputValue());
                    await closePanel(e, 'control');
                }
                fact(`I ip ${k}`, out);
                if (r.status && r.status >= 500) { await page.reload(); await idle(page); }
            }
            fact('I list', await listRead());
            await page.reload(); await idle(page);
            fact('I list reload', await listRead());
            // saved lines read after a reload
            for (const k of ['range-spaced', 'repeat', 'edge-spaces', 'high-low', 'two-lines']) {
                if (!(await rowOf(`IP ${k}`).count())) continue;
                const e = await openEdit(`IP ${k}`);
                fact(`I ip ${k} after reload`, JSON.stringify(await e.locator('textarea[name="ipRanges"]').inputValue()));
                await closePanel(e, 'control');
            }
            await snap('I02-after-reload');
            save();
        }

        // ================================================================== X (a line longer than the stored 40 characters)
        if (PHASES.includes('X')) {
            const X = await mk('X', () => ({}));
            await signIn(page, `${X}mg`);
            await land(X);
            const long = `142.58.103.1${' '.repeat(10)}-${' '.repeat(10)}142.58.103.4`;
            let d = await openAdd();
            await fill(d, {name: 'Long Library', ip: long});
            let r = await pressSave(d);
            let s = await snap('X01-long-save');
            fact('X long save 1', {status: r.status, open: r.open, footer: r.panel && r.panel.footer, saveButton: r.panel && r.panel.buttons.filter((b) => /^Save/.test(b)), notices: s.notices, rowsBehind: (await listRead()).rows});
            if (r.open) {
                r = await pressSave(d);
                s = await snap('X02-long-save-again');
                fact('X long save 2 (Save pressed again)', {status: r.status, open: r.open, notices: s.notices, rowsBehind: (await listRead()).rows});
                if (r.open) await closePanel(d, 'control');
            }
            fact('X rows after close (no reload)', (await listRead()).rows);
            await page.reload(); await idle(page);
            s = await snap('X03-after-reload', {png: true});
            const lr = await listRead();
            fact('X rows after reload', lr.rows);
            if (lr.rows.includes('Long Library')) {
                d = await openEdit('Long Library');
                fact('X Long Library edit', (await panelRead(d)).fields.map((f) => f.inputs.map((i) => `${i.name}=${JSON.stringify(i.value)}`).join(' ')));
                await snap('X04-long-edit');
                await closePanel(d, 'control');
            }
            // the other end: a range of exactly 40 characters saves
            const forty = `142.58.103.1${' '.repeat(7)}-${' '.repeat(8)}142.58.103.4`;
            d = await openAdd();
            await fill(d, {name: 'Forty Library', ip: forty});
            r = await pressSave(d);
            fact('X forty-character line', {length: forty.length, status: r.status, open: r.open});
            if (!r.open) {
                d = await openEdit('Forty Library');
                fact('X forty edit', JSON.stringify(await d.locator('textarea[name="ipRanges"]').inputValue()));
                await closePanel(d, 'control');
            } else await closePanel(d, 'control');
            const fortyOne = `142.58.103.1${' '.repeat(8)}-${' '.repeat(8)}142.58.103.4`;
            d = await openAdd();
            await fill(d, {name: 'FortyOne Library', ip: fortyOne});
            r = await pressSave(d);
            fact('X forty-one-character line', {length: fortyOne.length, status: r.status, open: r.open});
            if (r.open) await closePanel(d, 'control');
            await page.reload(); await idle(page);
            fact('X rows end', (await listRead()).rows);
            save();
        }

        // ================================================================== B (q2, Rule 5 search kept, Rule 7/7b)
        if (PHASES.includes('B')) {
            const B = await mk('B', () => ({}));
            await signIn(page, `${B}mg`);
            await land(B);
            for (const n of ['Alpha', 'Beta', 'Gamma']) {
                const d = await openAdd();
                await fill(d, {name: n});
                fact(`B add ${n}`, await pressSave(d));
                fact(`B rows after ${n}`, (await listRead()).rows);
            }
            await snap('B01-after-gamma');
            await page.reload(); await idle(page);
            fact('B rows after reload', (await listRead()).rows);
            let d = await openEdit('Alpha');
            await fill(d, {ror: 'https://ror.org/0213rcc28'});
            fact('B edit Alpha ror', await pressSave(d));
            fact('B rows after Alpha edit', (await listRead()).rows);
            await page.reload(); await idle(page);
            fact('B rows after Alpha edit reload', (await listRead()).rows);
            d = await openEdit('Beta');
            await fill(d, {name: 'Beta', ip: '10.2.0.0/16'});
            fact('B edit Beta ip', await pressSave(d));
            await page.reload(); await idle(page);
            fact('B rows after Beta edit reload', (await listRead()).rows);
            await snap('B02-order');
            // a search kept while adding
            const box = page.locator('.institutionsListPanel').getByRole('searchbox', {name: 'Search'});
            await box.fill('Beta'); await box.press('Enter'); await idle(page); await pause(500);
            fact('B search Beta', (await listRead()).rows);
            d = await openAdd(); await fill(d, {name: 'Delta'});
            fact('B add Delta under search Beta', await pressSave(d));
            fact('B rows after Delta (search Beta)', await listRead());
            await snap('B03-add-under-search-nonmatching');
            d = await openAdd(); await fill(d, {name: 'Beta Two'});
            fact('B add Beta Two under search Beta', await pressSave(d));
            fact('B rows after Beta Two (search Beta)', await listRead());
            await snap('B04-add-under-search-matching');
            await page.reload(); await idle(page);
            fact('B rows reload', await listRead());
            // Delete: "No"
            await rowOf('Gamma').getByRole('button', {name: 'Delete', exact: true}).click();
            const del = page.getByRole('dialog', {name: 'Delete Institution'});
            await del.waitFor({timeout: T}).catch(() => {});
            let s = await snap('B05-delete-dialog', {png: true});
            fact('B delete dialog', {text: s.text.dialog, aria: s.aria.dialogs.join('\n').slice(0, 800)});
            await loc(page, 'Delete Institution dialog', del);
            await del.getByRole('button', {name: 'No', exact: true}).click();
            await del.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
            await pause(800);
            fact('B after No', {dialogOpen: await del.isVisible().catch(() => false), rows: (await listRead()).rows});
            await page.reload(); await idle(page);
            fact('B after No reload', (await listRead()).rows);
            // Delete: "Yes" (Gamma, then Delta)
            for (const n of ['Gamma', 'Delta']) {
                const b0 = bad.length; const e0 = errs.length;
                await rowOf(n).getByRole('button', {name: 'Delete', exact: true}).click();
                await del.waitFor({timeout: T}).catch(() => {});
                const resp = page.waitForResponse((r) => /\/api\/v1\/institutions\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
                await del.getByRole('button', {name: 'Yes', exact: true}).click();
                const r = await resp;
                await idle(page); await pause(1200);
                s = await snap(`B06-delete-yes-${n}`, {png: true});
                const dialogs = await page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((e) => { const t = e.innerText.replace(/\s+/g, ' ').trim(); return /^Error\b/.test(t) ? 'Error [not recorded]' : t.slice(0, 300); }));
                const out = {status: r ? r.status() : null, override: r ? r.request().headers()['x-http-method-override'] || null : null, body: r && r.status() !== 200 ? (r.status() >= 500 ? WITHHELD : flat(await r.text().catch(() => null), 400)) : null, dialogs, rows: (await listRead()).rows, ...since(b0, e0), notices: s.notices};
                // close whatever is left open: the error window's button, then the delete dialog's "No"
                for (const lbl of ['OK', 'Ok', 'Close']) {
                    const b = page.locator('[role="dialog"]:visible').getByRole('button', {name: lbl, exact: true});
                    if (await b.count()) { await b.first().click().catch(() => {}); await pause(800); break; }
                }
                out.afterErrorClosed = {dialogs: await page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 40))), rows: (await listRead()).rows};
                await snap(`B07-after-error-closed-${n}`);
                if (await del.isVisible().catch(() => false)) { await del.getByRole('button', {name: 'No', exact: true}).click().catch(() => {}); await pause(800); }
                await page.reload(); await idle(page);
                out.afterReload = (await listRead()).rows;
                fact(`B delete Yes ${n}`, out);
            }
            await snap('B08-after-deletes');
            save();
        }

        // ================================================================== C (two form languages)
        if (PHASES.includes('C')) {
            const C = await mk('C', () => ({context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']}, institutions: [{name: 'Local Library', ipRanges: ['127.0.0.1']}]}));
            await signIn(page, `${C}mg`);
            await land(C);
            await snap('C01-page');
            let d = await openAdd();
            let s = await snap('C02-add-open', {png: true});
            fact('C add open', await panelRead(d));
            await d.locator('.pkpFormLocales').getByRole('button', {name: 'French'}).click();
            await pause(500);
            s = await snap('C03-add-french', {png: true});
            fact('C add french shown', await panelRead(d));
            await loc(page, 'Add panel: the "French" language button', d.locator('.pkpFormLocales').getByRole('button', {name: 'French'}));
            await loc(page, 'Add panel: Name (fr_CA)', d.locator('input[name="name-fr_CA"]'));
            // French alone
            await fill(d, {name: '', fr: 'Bibliothèque du campus', ip: '10.0.0.0/8'});
            let r = await pressSave(d);
            s = await snap('C04-add-refused-en-empty', {png: true});
            fact('C add refused (English empty, French typed)', {...r, notices: s.notices});
            await fill(d, {name: 'Campus Library'});
            fact('C add Campus', await pressSave(d));
            fact('C rows en', await listRead());
            await snap('C05-rows-en');
            // the French screens (Rule 3)
            await land(C, 'fr_CA');
            s = await snap('C06-rows-fr', {png: true});
            fact('C rows fr_CA', await listRead());
            await land(C);
            // Search (q3)
            const box = page.locator('.institutionsListPanel').getByRole('searchbox', {name: 'Search'});
            for (const q of ['campus 10.0', 'bibliothèque', 'Bibliothèque', '127.0.0', 'LIBRARY', 'campus 127', 'nothing', '10.0.0.0/8', '%', 'ca_pus']) {
                await box.fill(q); await box.press('Enter'); await idle(page); await pause(600);
                const lr = await listRead();
                fact(`C search "${q}"`, {rows: lr.rows, clear: lr.clearButton, text: lr.rows.length ? null : lr.text});
                await snap(`C07-search-${q.replace(/[^a-z0-9]+/gi, '_')}`);
            }
            await loc(page, 'Search: the clear button', page.locator('.institutionsListPanel').getByRole('button', {name: 'Clear search phrase'}));
            // typing without Enter
            await box.fill('campus'); await box.press('Enter'); await idle(page); await pause(500);
            fact('C search campus', (await listRead()).rows);
            await box.fill('local'); await pause(1500); await idle(page);
            fact('C typed local without Enter', await listRead());
            await snap('C08-typed-no-enter');
            await page.locator('.institutionsListPanel').getByRole('button', {name: 'Clear search phrase'}).click();
            await idle(page); await pause(600);
            fact('C after clear button', await listRead());
            await snap('C09-cleared');
            await box.fill('campus'); await box.press('Enter'); await idle(page); await pause(500);
            await box.fill(''); await box.press('Enter'); await idle(page); await pause(600);
            fact('C after emptied + Enter', await listRead());
            // an English-only add
            d = await openAdd(); await fill(d, {name: 'Plain Library'});
            fact('C add English only', await pressSave(d));
            // Edit filling
            d = await openEdit('Campus Library');
            s = await snap('C10-edit-open', {png: true});
            const before = await panelRead(d);
            await d.locator('.pkpFormLocales').getByRole('button', {name: 'French'}).click().catch(() => {});
            await pause(400);
            fact('C edit open', {before, french: await panelRead(d)});
            await fill(d, {name: ''});
            r = await pressSave(d);
            s = await snap('C11-edit-refused-en-empty', {png: true});
            fact('C edit refused (English empty)', {...r, notices: s.notices});
            await fill(d, {name: 'Campus Library'});
            fact('C edit Save after refill', {disabled: await d.getByRole('button', {name: 'Save', exact: true}).isDisabled()});
            await fill(d, {ror: 'https://ror.org/0213rcc28', ip: '10.0.0.0/8\n142.58.103.1 - 142.58.103.4'});
            r = await pressSave(d);
            fact('C edit save ror + 2 lines', r);
            d = await openEdit('Campus Library');
            fact('C edit reopened', await panelRead(d));
            await closePanel(d, 'control');
            await page.reload(); await idle(page);
            fact('C rows after ror+2-lines edit reload', (await listRead()).rows);
            d = await openEdit('Campus Library');
            fact('C edit reopened after reload', await panelRead(d));
            // emptying IP ranges and ROR
            await fill(d, {ip: '', ror: ''});
            r = await pressSave(d);
            fact('C edit emptied ip+ror', r);
            d = await openEdit('Campus Library');
            fact('C emptied reopened', (await panelRead(d)).fields.map((f) => f.inputs.map((i) => `${i.name}=${JSON.stringify(i.value)}`).join(' ')));
            await closePanel(d, 'control');
            await page.reload(); await idle(page);
            fact('C rows after emptied reload', (await listRead()).rows);
            d = await openEdit('Campus Library');
            fact('C emptied reopened after reload', (await panelRead(d)).fields.map((f) => f.inputs.map((i) => `${i.name}=${JSON.stringify(i.value)}`).join(' ')));
            await snap('C12-emptied-reopened');
            await closePanel(d, 'control');
            await box.fill('10.0'); await box.press('Enter'); await idle(page); await pause(500);
            fact('C search 10.0 after emptied', (await listRead()).rows);
            await page.reload(); await idle(page);
            // rename: the row at once, then reload
            d = await openEdit('Campus Library');
            await fill(d, {name: 'Campus Library Renamed'});
            r = await pressSave(d);
            fact('C rename', {save: r, rowsAtOnce: (await listRead()).rows});
            await snap('C13-renamed');
            await page.reload(); await idle(page);
            fact('C rename after reload', (await listRead()).rows);
            // q4 / A2: close Edit with an unsaved name change
            for (const how of ['control', 'escape', 'outside']) {
                d = await openEdit('Campus Library Renamed');
                const nameBox = d.locator('input[name="name-en"]');
                await nameBox.click();
                await nameBox.press('End');
                await nameBox.pressSequentially(' X', {delay: 40});
                await pause(300);
                const closed = await closePanel(d, how);
                s = await snap(`C14-edit-closed-${how}`, {png: how === 'control'});
                const atOnce = (await listRead()).rows;
                // reopen: what the Name box holds
                let reopened = null;
                const target = atOnce.find((x) => /Campus Library Renamed/.test(x));
                if (target) {
                    const e = await openEdit(target);
                    reopened = (await panelRead(e)).fields[0];
                    await snap(`C15-edit-reopened-${how}`);
                    await closePanel(e, 'control');
                }
                await page.reload(); await idle(page);
                fact(`C q4 close by ${how}`, {closed, rowsAtOnce: atOnce, reopenedName: reopened && reopened.inputs.map((i) => i.value), rowsAfterReload: (await listRead()).rows, dialogs: s.aria.dialogs.length});
            }
            // French box change + close (the other language)
            d = await openEdit('Campus Library Renamed');
            await d.locator('.pkpFormLocales').getByRole('button', {name: 'French'}).click().catch(() => {});
            await d.locator('input[name="name-fr_CA"]').fill('Bibliothèque modifiée');
            await closePanel(d, 'control');
            fact('C q4 French changed, closed: rows en', (await listRead()).rows);
            await land(C, 'fr_CA');
            fact('C q4 French changed, closed: rows fr after load', (await listRead()).rows);
            await land(C);
            // control: IP ranges changed and closed
            d = await openEdit('Campus Library Renamed');
            await fill(d, {ip: '10.9.9.9'});
            await closePanel(d, 'control');
            const ctlRows = (await listRead()).rows;
            d = await openEdit('Campus Library Renamed');
            const ctlIp = await d.locator('textarea[name="ipRanges"]').inputValue();
            await closePanel(d, 'control');
            fact('C q4 control IP changed', {rows: ctlRows, reopenedIp: JSON.stringify(ctlIp)});
            // unsaved name then Save of another field: what is stored
            d = await openEdit('Campus Library Renamed');
            await d.locator('input[name="name-en"]').fill('Campus Library Leaked');
            await closePanel(d, 'control');
            d = await openEdit('Campus Library Leaked').catch(() => null);
            if (d) {
                await fill(d, {ror: 'https://ror.org/0213rcc28'});
                fact('C q4 save after leaked name', await pressSave(d));
                await page.reload(); await idle(page);
                fact('C q4 rows after leaked-name save + reload', (await listRead()).rows);
            }
            await snap('C16-end');
            save();
        }

        // ================================================================== P (pagination)
        if (PHASES.includes('P')) {
            const inst = Array.from({length: 30}, (_, i) => ({name: `Pag ${String(i + 1).padStart(2, '0')}`}));
            const P = await mk('P', () => ({institutions: inst}));
            await signIn(page, `${P}mg`);
            await land(P);
            let s = await snap('P01-thirty', {png: true});
            let lr = await listRead();
            fact('P thirty', {count: lr.count, pager: lr.pager, first: lr.rows[0], last: lr.rows[lr.rows.length - 1]});
            let d = await openAdd(); await fill(d, {name: 'Pag 31'});
            fact('P add 31', await pressSave(d));
            lr = await listRead();
            fact('P after 31 at once', {count: lr.count, pager: lr.pager, has31: lr.rows.includes('Pag 31')});
            await snap('P02-after-31', {png: true});
            await page.reload(); await idle(page);
            lr = await listRead();
            fact('P after 31 reload', {count: lr.count, pager: lr.pager, has31: lr.rows.includes('Pag 31')});
            await loc(page, 'Institutions pager: page 2', page.locator('.institutionsListPanel').getByRole('button', {name: /Page 2|^2$/}));
            const p2 = page.locator('.institutionsListPanel').getByRole('button', {name: /Page 2|^2$/}).first();
            if (await p2.count()) {
                await p2.click(); await idle(page); await pause(600);
                lr = await listRead();
                fact('P page 2', {count: lr.count, rows: lr.rows, pager: lr.pager});
                s = await snap('P03-page2', {png: true});
                d = await openAdd(); await fill(d, {name: 'Pag 32'});
                fact('P add 32 from page 2', await pressSave(d));
                lr = await listRead();
                fact('P after 32 at once', {count: lr.count, pager: lr.pager, rowsHead: lr.rows.slice(0, 3), has32: lr.rows.includes('Pag 32')});
                await snap('P04-after-32');
            }
            save();
        }

        // ================================================================== S {OJS} Rule 7a (q6)
        if (PHASES.includes('S') && isOJS) {
            const S = await mk('S', (t) => ({
                payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay by cheque.'},
                institutions: [{name: 'Campus Library', ipRanges: ['10.0.0.0/8']}, {name: 'Other Library', ipRanges: ['10.1.0.0/16']}],
                subscriptionTypes: [{name: 'Inst Type', cost: 100, currency: 'USD', duration: 12, institutional: true}],
                subscriptions: [{user: `${t}rd`, type: 'Inst Type', institution: 'Campus Library', mailingAddress: 'Campus Rd'}],
                users: [{username: `${t}rd`, roles: ['reader']}],
            }));
            await signIn(page, `${S}mg`);
            const W = () => page.locator('[role="dialog"]:visible').last();
            async function instTab() {
                await page.goto(url(S, '/payments')); await idle(page);
                await page.getByRole('tab', {name: 'Institutional Subscriptions', exact: true}).click(); await idle(page); await pause(600);
                const panel = page.getByRole('tabpanel', {name: 'Institutional Subscriptions'});
                await panel.locator('table').first().waitFor({timeout: T}).catch(() => {});
                await idle(page); await pause(400);
                return panel;
            }
            async function gridRead(panel) {
                return panel.evaluate((root) => [...root.querySelectorAll('table')].filter((t) => t.getClientRects().length).map((t) => ({
                    columns: [...t.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
                    rows: [...t.querySelectorAll('tbody tr')].filter((tr) => tr.getClientRects().length && !/control-row/.test(tr.id)).map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim()).join(' | ')),
                })));
            }
            async function closeW() {
                const c = W().getByRole('button', {name: 'Close', exact: true}).first();
                if (await c.count()) await c.click().catch(() => {});
                await pause(900);
                const yes = page.locator('[role="dialog"]:visible').filter({hasText: /changed|unsaved/i}).getByRole('button', {name: /^(Yes|OK)$/});
                if (await yes.count()) { await yes.first().click().catch(() => {}); await pause(600); }
            }
            async function selectRead(sel) {
                return page.locator(sel).first().evaluate((s) => ({selected: s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : null, options: [...s.options].map((o) => o.text)})).catch((e) => ({err: String(e.message).slice(0, 120)}));
            }
            async function subReads(label) {
                const out = {};
                let panel = await instTab();
                out.grid = await gridRead(panel);
                await snap(`S-${label}-inst-subs`, {png: true});
                const row = panel.locator('tr.gridRow').first();
                if (await row.count()) {
                    const id = await row.getAttribute('id');
                    const arrow = row.locator('a.show_extras').first();
                    if (await arrow.count()) { await arrow.click(); await pause(400); }
                    await page.locator(`[id="${id}-control-row"]`).getByRole('link', {name: 'Edit', exact: true}).first().click();
                    await page.locator('select[name="institutionId"]').first().waitFor({timeout: T}).catch(() => {});
                    await idle(page); await pause(600);
                    out.editInstitution = await selectRead('select[name="institutionId"]');
                    await snap(`S-${label}-sub-edit`, {png: true});
                    await closeW();
                }
                panel = await instTab();
                await panel.getByRole('link', {name: 'Create New Subscription', exact: true}).first().click();
                await page.locator('select[name="institutionId"]').first().waitFor({timeout: T}).catch(() => {});
                await idle(page); await pause(600);
                out.createInstitution = await selectRead('select[name="institutionId"]');
                await snap(`S-${label}-sub-create`);
                await closeW();
                // Counter R5 › PR › Edit: "Customer ID"
                await page.goto(url(S, '/stats/counterR5/counterR5')); await idle(page); await pause(800);
                const btn = page.locator('.listPanel__item', {has: page.locator('span[id="PR"]')}).getByRole('button', {name: 'Edit'});
                if (await btn.count()) {
                    await btn.click();
                    const dlg = page.getByRole('dialog').filter({hasText: 'Report Settings'});
                    await dlg.getByRole('button', {name: 'Download', exact: true}).waitFor({timeout: T}).catch(() => {});
                    await idle(page); await pause(500);
                    out.customerId = await dlg.evaluate((root) => {
                        const f = [...root.querySelectorAll('.pkpFormField')].find((x) => /Customer ID/.test(x.innerText));
                        if (!f) return null;
                        const s = f.querySelector('select');
                        return s ? [...s.options].map((o) => o.text.trim()) : f.innerText.replace(/\s+/g, ' ').slice(0, 300);
                    }).catch((e) => String(e.message).slice(0, 100));
                    await snap(`S-${label}-counter-pr`);
                    await dlg.getByRole('button', {name: /^Close$/}).first().click().catch(() => {});
                    await pause(800);
                } else out.customerId = 'no PR row';
                return out;
            }
            fact('S before delete', await subReads('before'));
            await land(S);
            await snap('S01-institutions');
            fact('S list before', (await listRead()).rows);
            await rowOf('Campus Library').getByRole('button', {name: 'Delete', exact: true}).click();
            const del = page.getByRole('dialog', {name: 'Delete Institution'});
            await del.waitFor({timeout: T});
            const resp = page.waitForResponse((r) => /\/api\/v1\/institutions\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
            await del.getByRole('button', {name: 'Yes', exact: true}).click();
            const r = await resp;
            await idle(page); await pause(1000);
            const s = await snap('S02-after-delete', {png: true});
            fact('S delete', {status: r && r.status(), rows: (await listRead()).rows, dialogs: s.aria.dialogs.length, notices: s.notices});
            await page.reload(); await idle(page);
            fact('S list after reload', (await listRead()).rows);
            fact('S after delete', await subReads('after'));
            save();
        }

        // ================================================================== L (form languages, Setting 4)
        if (PHASES.includes('L')) {
            async function langs(ctx, name) {
                await page.goto(url(ctx, '/management/settings/website#setup/languages')); await idle(page);
                const setup = page.locator('#setup-button').first();
                if (await setup.count() && (await setup.getAttribute('aria-selected')) !== 'true') await setup.click().catch(() => {});
                const tab = page.locator('#languages-button').filter({visible: true}).first();
                if (await tab.count()) await tab.click().catch(() => {});
                await page.locator('#languageGridContainer .pkp_controllers_grid').first().waitFor({timeout: T}).catch(() => {});
                await idle(page); await pause(500);
                await snap(name);
                return page.evaluate(() => {
                    const c = document.querySelector('#languageGridContainer');
                    if (!c) return null;
                    return {head: [...c.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
                        rows: [...c.querySelectorAll('tbody tr.gridRow')].map((r) => {
                            const cells = {};
                            r.querySelectorAll('input[type=checkbox], input[type=radio]').forEach((b) => {
                                const k = (b.id.match(/-(contextPrimary|uiLocale|formLocale)/) || [])[1] || b.id;
                                cells[k] = b.checked ? 'X' : '-';
                            });
                            return {id: r.id.replace(/^.*-row-/, ''), text: [...r.querySelectorAll('td')].map((td) => td.innerText.trim()).filter(Boolean).join(' | '), cells};
                        })};
                });
            }
            await signIn(page, 'manager.maya');
            fact('L publicknowledge languages', await langs(app.contextPath, 'L01-publicknowledge-languages'));
            // the seeded journal's Add panel (read-only: opened and closed)
            await land(app.contextPath);
            await snap('L02-publicknowledge-institutions');
            const d = await openAdd();
            fact('L publicknowledge add panel', await panelRead(d));
            await snap('L03-publicknowledge-add');
            await closePanel(d, 'control');
            const N = await mk('L', () => ({}));
            await signIn(page, `${N}mg`);
            fact('L new context languages', await langs(N, 'L04-new-languages'));
        }
    } catch (e) {
        fact('ERROR', String(e.stack || e).slice(0, 1500));
        await snap('ERROR', {png: true}).catch(() => {});
        throw e;
    } finally {
        fact('page errors', errs);
        fact('bad responses', bad);
        save();
        await close();
    }
});
