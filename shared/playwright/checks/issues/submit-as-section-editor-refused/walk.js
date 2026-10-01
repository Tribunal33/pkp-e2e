// Issue report walk: docs/issues/U21-A14-submit-as-section-editor-refused.md
// (spec U21 register A14). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
//   A  dbuskins (Section editor / Series editor / Moderator) ticks "Author" on
//      "Edit Profile" › "Roles", opens "New Submission" three times (reads the
//      "Submit As" options, their order and the selected one), then begins
//      "u21w35 Section editor's paper" as "Section editor" ("Series editor"),
//      and, refused, as "Author" (the control).
//   B  dbarnes (Journal editor / Press editor / Preprint Server manager) ticks
//      "Author" the same way and opens "New Submission" three times.
// NEIGHBOUR=1 (the fix's neighbour check) runs instead: dbarnes ticks "Author"
// and begins "u21w35 Editor's paper" as the editorial role ("Journal editor",
// "Press editor", "Preprint Server manager"): it must still be offered and
// accepted (the fix must not take the editorial role away from an editor);
// then rvaca (Journal manager, no submission-stage access) ticks "Author" and
// opens "New Submission": no "Submit As" may appear (the manager role stays off
// the list, as pkp/pkp-lib#10929 wants).
// SECTION_EDITOR_ONLY=1 runs instead: sberardo (Section editor / Series editor
// with no Author role) opens "New Submission", reads "Submit As", begins
// "u21w35 Section editor only" as offered; the roles the profile then holds.
// The kit builds nothing. Besides the screens it reads, from the database,
// the drafts the walk made and their stage assignments (Evidence only).
//
// Reset first:  npm run fleet-prep -- --feature issues-w35 --dataset 8 --reset
// Run (main):   PROBE_FEATURE=issues-w35 PROBE_AGENT=w35 node bin/probe.js all shared/playwright/checks/issues/submit-as-section-editor-refused/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w35-3_5 PROBE_AGENT=w35 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w35/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const TAG = 'u21w35';
const flat = (s, n = 1500) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const SECTION = {ojs: 'Articles', omp: null, ops: 'Preprints'};
const EDITORIAL = {ojs: 'Section editor', omp: 'Series editor', ops: 'Moderator'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const neighbour = !!process.env.NEIGHBOUR;
    const loc = ['main', 'stable-3_5_0'].includes(app.line || 'main') ? '/en' : '';
    const base = `/index.php/${app.contextPath}${loc}`;
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, neighbour, startedAt: new Date().toISOString()};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    let n = 0;
    const rec = async (page, label) => {
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; }
        catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); return null; }
    };

    // "Edit Profile" › "Roles": tick the journal's own "Author"; "Save".
    const tickAuthor = async (page, who) => {
        await page.goto(app.url(`${base}/user/profile`));
        await idle(page);
        await page.locator('#profileTabs').getByRole('link', {name: 'Roles', exact: true}).click();
        const form = page.locator('#rolesForm');
        await form.waitFor({timeout: T});
        await idle(page);
        const own = form.locator('#userGroups .section').first();
        const box = own.getByRole('checkbox', {name: 'Author', exact: true});
        const before = await box.isChecked();
        await box.check();
        await rec(page, `${who}-roles-ticked`);
        const resp = page.waitForResponse((r) => /saveroles/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await idle(page);
        const s = await rec(page, `${who}-roles-saved`);
        return {authorWasChecked: before, saveStatus: r ? r.status() : null, notices: s && s.notices,
            rolesNow: sql(app, `select string_agg(s.setting_value, ', ' order by ug.user_group_id) from user_user_groups uug join user_groups ug using (user_group_id) join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' join users u on u.user_id = uug.user_id where u.username = '${who}' and ug.context_id = 1`)};
    };

    // The "Submit As" radios as shown: label, checked, in screen order.
    const submitAs = (page) => page.evaluate(() => {
        const fs = [...document.querySelectorAll('fieldset')].find((f) => /Submit As/.test((f.querySelector('legend') || {}).textContent || ''));
        if (!fs) return null;
        return [...fs.querySelectorAll('input[type=radio]')].map((i) => ({
            label: ((i.closest('label') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
            checked: i.checked,
        }));
    });

    const visits = async (page, who) => {
        const out = [];
        for (const how of ['open', 'reload', 'open again']) {
            if (how === 'reload') await page.reload(); else await page.goto(app.url(`${base}/submission`));
            await idle(page);
            await page.getByRole('button', {name: 'Begin Submission'}).waitFor({timeout: T});
            await rec(page, `${who}-start-${how.replace(' ', '-')}`);
            const opts = await submitAs(page);
            out.push({how, submitAs: opts ? opts.map((o) => `${o.checked ? '(x) ' : '( ) '}${o.label}`).join(' | ') : 'no "Submit As" field'});
        }
        return out;
    };

    // Fill the start form (title, section, English, every box) as on screen.
    const fillStart = async (page, title) => {
        const {waitForEditorReady, editorIdOf} = require('../../../support/richtext.js');
        const iframe = page.locator('iframe.tox-edit-area__iframe').first();
        await waitForEditorReady(page, await editorIdOf(iframe));
        const body = iframe.contentFrame().locator('body');
        await body.click();
        await body.fill(title);
        if (SECTION[app.name]) {
            const radio = page.getByRole('radio', {name: SECTION[app.name], exact: true});
            if (await radio.isVisible().catch(() => false)) await radio.check();
        }
        const english = page.getByRole('radio', {name: 'English', exact: true});
        if (await english.isVisible().catch(() => false)) await english.check();
        for (const box of await page.getByRole('checkbox').all()) {
            if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
        }
    };

    // Choose a "Submit As" role (when the field is there) and press "Begin Submission".
    const begin = async (page, who, role, label) => {
        if (role) await page.getByRole('radio', {name: role, exact: true}).check();
        await rec(page, `${who}-${label}-filled`);
        const resp = page.waitForResponse((r) => /\/api\/v1\/submissions(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await page.getByRole('button', {name: 'Begin Submission'}).click();
        const r = await resp;
        const status = r ? r.status() : null;
        const body = r && status >= 400 ? flat(await r.text().catch(() => ''), 400) : null;
        let opened = false;
        if (status && status < 300) {
            opened = await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000}).then(() => true).catch(() => false);
        }
        await idle(page);
        const s = await rec(page, `${who}-${label}-after`);
        const fieldError = flat(await page.locator('fieldset').filter({hasText: 'Submit As'}).locator('.pkpFormFieldLabel ~ *, .pkpFieldError, [class*="Error"]').allInnerTexts().catch(() => []), 300);
        return {chose: role, status, body, wizardOpened: opened, url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            heading: flat(await page.locator('h1').first().innerText().catch(() => ''), 200),
            submitAsError: fieldError || null, notices: s && s.notices};
    };

    const drafts = () => sql(app, `select string_agg(s.submission_id || ' "' || ps.setting_value || '" by ' || coalesce((select string_agg(u.username || ' as ' || (select setting_value from user_group_settings where user_group_id = sa.user_group_id and setting_name = 'name' and locale = 'en'), ', ') from stage_assignments sa join users u using (user_id) where sa.submission_id = s.submission_id), '-') || ', contributors ' || (select count(*) from authors a where a.publication_id = s.current_publication_id), ' ; ' order by s.submission_id) from submissions s join publication_settings ps on ps.publication_id = s.current_publication_id and ps.setting_name = 'title' where ps.setting_value like '%${TAG}%'`);

    try {
        if (process.env.SECTION_EDITOR_ONLY) {
            const {page, close} = await launch(app);
            page.setDefaultTimeout(T);
            try {
                await signIn(page, 'sberardo');
                await page.goto(app.url(`${base}/submission`));
                await idle(page);
                await page.getByRole('button', {name: 'Begin Submission'}).waitFor({timeout: T});
                await rec(page, 'sberardo-start');
                const opts = await submitAs(page);
                fact('S submitAs', opts);
                await fillStart(page, `${TAG} Section editor only`);
                fact('S begin as offered', await begin(page, 'sberardo', null, 'as-offered'));
                fact('S drafts', drafts());
                fact('S roles after', sql(app, `select string_agg(s.setting_value, ', ' order by ug.user_group_id) from user_user_groups uug join user_groups ug using (user_group_id) join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' join users u on u.user_id = uug.user_id where u.username = 'sberardo' and ug.context_id = 1`));
                await signOut(page);
            } finally { await close(); }
            return;
        }

        // A. dbuskins
        if (!neighbour) {
            const {page, close} = await launch(app);
            page.setDefaultTimeout(T);
            try {
                await signIn(page, 'dbuskins');
                fact('A1-3 dbuskins ticks Author', await tickAuthor(page, 'dbuskins'));
                fact('A4-5 dbuskins visits', await visits(page, 'dbuskins'));
                await page.goto(app.url(`${base}/submission`));
                await idle(page);
                await fillStart(page, `${TAG} Section editor's paper`);
                const opts = await submitAs(page);
                const offersEditorial = !!(opts && opts.some((o) => o.label === EDITORIAL[app.name]));
                fact('A6 offers editorial role', offersEditorial);
                if (offersEditorial) {
                    fact('A6 begin as editorial role', await begin(page, 'dbuskins', EDITORIAL[app.name], 'as-editorial'));
                    fact('A6 drafts after', drafts());
                    fact('A7 control: begin as Author', await begin(page, 'dbuskins', 'Author', 'as-author'));
                } else {
                    fact('A7 control: begin (no Submit As choice)', await begin(page, 'dbuskins', opts ? 'Author' : null, 'as-offered'));
                }
                fact('A drafts', drafts());
                await signOut(page);
            } finally { await close(); }
        }

        // B. dbarnes
        {
            const {page, close} = await launch(app);
            page.setDefaultTimeout(T);
            try {
                await signIn(page, 'dbarnes');
                fact('B8-9 dbarnes ticks Author', await tickAuthor(page, 'dbarnes'));
                if (!neighbour) fact('B10 dbarnes visits', await visits(page, 'dbarnes'));
                if (neighbour) {
                    await page.goto(app.url(`${base}/submission`));
                    await idle(page);
                    await fillStart(page, `${TAG} Editor's paper`);
                    const opts = await submitAs(page);
                    const editorial = opts && opts.find((o) => o.label !== 'Author');
                    fact('N begin as editorial role', await begin(page, 'dbarnes', editorial ? editorial.label : null, 'as-editorial'));
                    fact('N drafts', drafts());
                }
                await signOut(page);
            } finally { await close(); }
        }

        // C. rvaca (neighbour check only)
        if (neighbour) {
            const {page, close} = await launch(app);
            page.setDefaultTimeout(T);
            try {
                await signIn(page, 'rvaca');
                fact('N rvaca ticks Author', await tickAuthor(page, 'rvaca'));
                fact('N rvaca visits', await visits(page, 'rvaca'));
                await signOut(page);
            } finally { await close(); }
        }

        fact('user group heap order', sql(app, `select string_agg(ug.user_group_id || ':' || coalesce(s.setting_value, '?'), ', ' order by ug.ctid) from user_groups ug left join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where ug.context_id = 1`));
    } finally {
        record(`facts${facts.run ? '-' + facts.run : ''}${neighbour ? '-neighbour' : ''}`, facts);
    }
});
