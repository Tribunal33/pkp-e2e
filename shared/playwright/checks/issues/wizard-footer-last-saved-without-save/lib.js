// Helpers for the submission wizard's autosave walks (U21 A4, A18). Requiring
// this file runs nothing.
const {screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const SECTION = {ojs: 'Articles', omp: 'Library & Information Studies', ops: 'Preprints'};
const TITLE_ID = 'titleAbstract-title-control-en';

/** The locale segment of an address: main and 3.5 carry `/en`. */
const localeSeg = (app) => (['main', 'stable-3_5_0'].includes(app.line || 'main') ? '/en' : '');

/**
 * Every write the page sends to the REST API (a Vue save is a POST with
 * X-Http-Method-Override), with its time, status and the posted title.
 */
function watchWrites(page) {
    const writes = [];
    const errors = [];
    page.on('request', (q) => {
        if (!/\/api\/v1\//.test(q.url()) || q.method() === 'GET') return;
        let title = null;
        try {
            const p = new URLSearchParams(q.postData() || '');
            title = p.get('title[en]') ?? p.get('title[en_US]');
        } catch (e) { /* not form-encoded */ }
        writes.push({at: Date.now(), op: q.headers()['x-http-method-override'] || q.method(),
            url: q.url().replace(/^https?:\/\/[^/]+/, '').split('?')[0], title, status: null});
    });
    page.on('response', (r) => {
        const w = writes.find((x) => x.status === null && r.url().replace(/^https?:\/\/[^/]+/, '').split('?')[0] === x.url);
        if (w) w.status = r.status();
    });
    page.on('pageerror', (e) => errors.push({at: Date.now(), text: flat(e.message, 300)}));
    page.on('console', (m) => { if (m.type() === 'error') errors.push({at: Date.now(), console: true, text: flat(m.text(), 300)}); });
    page.on('dialog', async (d) => { if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {}); });
    return {writes, errors};
}

/** A numbered screen record and shot. */
function snapper(page, prefix) {
    let n = 0;
    return async (label) => {
        const name = `${prefix}${String(++n).padStart(2, '0')}-${label}`;
        try { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; }
        catch (e) { record(name, {error: flat(e.message, 300), url: page.url()}); return null; }
    };
}

/**
 * The new-submission page: Title, section or series, English, every
 * checkbox, "Begin Submission". Returns the draft's id once the wizard is up.
 */
async function startDraft(page, app, title, snap) {
    await page.goto(app.url(`/index.php/${app.contextPath}${localeSeg(app)}/submission`));
    await idle(page);
    const {waitForEditorReady, editorIdOf} = require('../../../support/richtext.js');
    const iframe = page.locator('iframe.tox-edit-area__iframe').first();
    await waitForEditorReady(page, await editorIdOf(iframe));
    const body = iframe.contentFrame().locator('body');
    await body.click();
    await body.fill(title);
    const radio = page.getByRole('radio', {name: SECTION[app.name], exact: true});
    if (await radio.isVisible().catch(() => false)) await radio.check();
    const english = page.getByRole('radio', {name: 'English', exact: true});
    if (await english.isVisible().catch(() => false)) await english.check();
    for (const box of await page.getByRole('checkbox').all()) {
        if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
    }
    if (snap) await snap('start-form');
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
    await page.locator('.pkpSteps').waitFor({timeout: T});
    await idle(page);
    return Number(new URL(page.url()).searchParams.get('id'));
}

/** The wizard's footer and step rail. */
function wizard(page) {
    const cur = page.locator('.pkpSteps__step__label--current');
    return {
        lastSaved: async () => flat(await page.locator('.submissionWizard__lastSaved').innerText().catch(() => null), 120),
        step: async () => flat(await cur.innerText().catch(() => ''), 80),
        footer: page.locator('.submissionWizard__footer'),
        /** Waits until the footer's text matches re; returns the text, or null at the timeout. */
        async waitFooter(re, timeout) {
            const end = Date.now() + timeout;
            while (Date.now() < end) {
                const t = await this.lastSaved();
                if (re.test(t || '')) return t;
                await pause(250);
            }
            return null;
        },
        /** "Continue" until "Details" is the current step (main opens on "Upload Files", 3.5 on "Details"). */
        async continueToDetails() {
            for (let i = 0; i < 3 && !/Details\s*$/.test(await this.step()); i++) {
                await this.footer.getByRole('button', {name: 'Continue', exact: true}).click();
                await cur.filter({hasText: /Details\s*$/}).waitFor({timeout: 10_000}).catch(() => {});
                await idle(page);
            }
        },
        async openFromRail(name) {
            const b = page.locator('button.pkpSteps__step__label').filter({hasText: new RegExp(`${name}\\s*$`)}).first();
            if (await b.count()) await b.click();
            await cur.filter({hasText: new RegExp(`${name}\\s*$`)}).waitFor({timeout: 10_000}).catch(() => {});
            await idle(page);
        },
    };
}

/** The Title box on "Details": its TinyMCE editor once initialized. */
async function titleEditor(page) {
    await page.locator(`#${TITLE_ID}_ifr`).waitFor({timeout: T});
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), TITLE_ID, {timeout: T});
    return {
        body: page.frameLocator(`#${TITLE_ID}_ifr`).locator('body'),
        text: async () => flat(await page.evaluate((i) => window.tinymce.get(i).getContent({format: 'text'}), TITLE_ID).catch(() => null), 200),
    };
}

/** The draft's title in the database (the walk's check of what was saved). */
function storedTitle(app, sql, id) {
    return sql(app, `select ps.setting_value from publication_settings ps join submissions s on s.current_publication_id = ps.publication_id where s.submission_id = ${id} and ps.setting_name = 'title' and ps.locale like 'en%'`).trim();
}

module.exports = {T, pause, flat, AUTHOR, SECTION, TITLE_ID, localeSeg, watchWrites, snapper, startDraft, wizard, titleEditor, storedTitle};
