// U72 "Chapters & work type" claim check, chunk K1: Purpose with the OJS/OPS
// absence (td1), Actors & permissions (td2-td5), Rule 3 (the plain-text
// list), Setting 6 (the assignment's metadata-edit permission), the
// cross-feature pointers, the canonical preamble (footnote s), register A1
// and A2.
//
// Run (all phases, or K1_PHASE=X,P,... for some):
//   PROBE_FEATURE=U72 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U72/K1/k1.js
//   PROBE_FEATURE=U72 PROBE_AGENT=ccK1 K1_PHASE=P node bin/probe.js omp shared/playwright/checks/U72/K1/k1.js
// Phases (each seeds its own scratch context, tag prefix u72k1):
//   X  every app: the start screen on publicknowledge (read-only, author.alex),
//      a scratch context's workflow as its manager (version pages, header,
//      "Marketing"), a draft's Details step (and OMP's Review step) as its author
//   P  OMP: an unpublished book in Copyediting (td2): the Chapters page per
//      permission level, the author-level roles, Setting 6 off and on (the
//      Roles window, the "Edit Assignment" box ticked on screen), the other
//      publication pages for the assistant (A1 "every other page"), the wizard
//      as the submitting Author, and "Chapters" on a book still in Submission
//   B  OMP: a published book (td3, A1): the line above the list and the
//      controls per role, the Layout Editor's "Epilogue", every assistant role
//   W  OMP: the work-type control and "Publication Dates" per role (td4, td5, A2)
//   C  OMP: cross-feature pointers (Role column, chapter Files list with a
//      proof file, Identifiers tab, DOIs page, sitemap, book page) and
//      footnote s (the ready accounts, the scenario keys)
// Outputs: .reports/U72/ccK1/ (<name>-<app>.json snapshots, PNGs, facts-<app>.json).
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, settled, tag} = require('../../../probe');

const PHASES = (process.env.K1_PHASE || 'X,P,Q,B,W,R,A,C').split(',').map((s) => s.trim().toUpperCase());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30_000;
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const ALL = 'All chapters will use the publication date of the monograph.';
const EACH = 'Each chapter may have its own publication date.';

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const fact = (k, v) => { record('facts', {[k]: v}, {merge: true}); console.log(`[k1 ${app.name}] ${k}: ${JSON.stringify(v).slice(0, 400)}`); };
    await app.api.bootstrapProbe(app.contextPath);
    const {page, close} = await launch(app);
    const snap = async (name, extra, {png = false} = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        record(name, s);
        if (png) await shot(page, name).catch(() => {});
        return s;
    };
    const guard = async (label, fn) => {
        try { return await fn(); } catch (e) {
            fact(`ERROR ${label}`, flat(e.stack || e, 1200));
            await snap(`zz-error-${label.replace(/[^a-z0-9]+/gi, '-')}`, null, {png: true}).catch(() => {});
            return null;
        }
    };
    const apiLog = [];
    page.on('response', (r) => {
        const u = r.url();
        if (/\/api\/v1\//.test(u) && !/_test\//.test(u)) apiLog.push({m: r.request().method(), o: r.request().headers()['x-http-method-override'] || null, s: r.status(), u: u.replace(/^.*\/index\.php/, '')});
    });
    const apiSince = (n) => apiLog.slice(n);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const seedTry = async (label, fn) => {
        try { return await fn(); } catch (e) { fact(`SEED ${label}`, flat(e.message, 800)); return null; }
    };

    // ---------------------------------------------------------------- workflow helpers
    const wf = () => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
    const header = () => wf().locator('[data-cy="sidemodal-header"]');
    const editorialUrl = (p, id, key) => app.url(`/index.php/${p}/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const authorUrl = (p, id, key) => app.url(`/index.php/${p}/dashboard/mySubmissions?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const openWf = async (url) => {
        const resp = await page.goto(url);
        await idle(page);
        await header().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        return resp ? resp.status() : null;
    };
    const headerButtons = async () => (await header().getByRole('button').allInnerTexts().catch(() => [])).map((s) => s.trim()).filter(Boolean);
    const workTypeButton = () => header().getByRole('button', {name: /^(Monograph|Edited Volume)$/});
    const workTypeLabel = async () => (await workTypeButton().first().innerText().catch(() => null))?.trim() ?? null;
    const menuItems = async () => wf().getByRole('navigation').evaluate((nav) => [...nav.querySelectorAll('a, button')].map((a) => a.innerText.trim()).filter(Boolean)).catch(() => null);
    const heading = async () => (await wf().locator('h2').first().textContent().catch(() => null))?.trim() ?? null;
    const wfLines = async (re) => ((await wf().innerText().catch(() => '')) || '').split('\n').map((s) => s.trim()).filter((s) => re.test(s));

    // ---------------------------------------------------------------- chapter grid helpers
    const grid = () => page.locator('[id^="component-grid-users-chapter-chaptergrid"]').first();
    const readGrid = async () => {
        const g = grid();
        if (!(await g.count())) return {grid: false};
        return g.evaluate((root) => {
            const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const out = {heading: t(root.querySelector('.header')), actions: [...root.querySelectorAll('.header a, .header button, .actions a')].filter((a) => a.offsetParent !== null).map((a) => t(a)).filter(Boolean),
                columns: [...root.querySelectorAll('thead th')].map(t), titleLinks: [...root.querySelectorAll('a.pkp_linkaction_editChapter')].map(t),
                rowArrows: root.querySelectorAll('a.show_extras').length};
            out.text = t(root);
            return out;
        });
    };
    const rowControls = async (title) => {
        const row = grid().locator('tr.gridRow').filter({hasText: title}).first();
        const arrow = row.locator('a.show_extras');
        const out = {arrow: await arrow.count()};
        if (out.arrow) {
            await arrow.first().click(); await sleep(500);
            const id = await row.getAttribute('id');
            out.controls = (await page.locator(`#${id}-control-row a:visible`).allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
            await page.locator(`#${id} a.hide_extras`).first().click().catch(() => {});
            await sleep(300);
        }
        return out;
    };
    const openChapters = async (p, id, pubId, {author = false} = {}) => {
        const status = await openWf((author ? authorUrl : editorialUrl)(p, id, `publication_${pubId}_chapters`));
        await grid().waitFor({timeout: 15000}).catch(() => {});
        if (!(await grid().count())) {
            const link = wf().getByRole('link', {name: 'Chapters', exact: true});
            if (await link.count()) { await link.last().click(); await idle(page); await grid().waitFor({timeout: 15000}).catch(() => {}); }
        }
        await idle(page);
        return {status, url: page.url()};
    };
    const chapterForm = () => page.locator('form#editChapterForm:visible').first();
    const listAs = async (name, p, b, {author = false, title = 'Tides', png = false} = {}) => {
        const o = await openChapters(p, b.submissionId, b.publicationId, {author});
        const g = await readGrid();
        const r = {o, heading: await heading(), grid: g, titleIsLink: await grid().getByRole('link', {name: title, exact: true}).count().catch(() => 0),
            menu: await menuItems(), header: await headerButtons(), publishedLines: await wfLines(/published|can not be edited|Warning/i)};
        if (g.grid !== false) r.row = await rowControls(title);
        await snap(name, r, {png});
        return r;
    };
    const addChapter = async (title) => {
        const n = apiLog.length;
        const add = grid().getByRole('link', {name: 'Add Chapter', exact: true});
        if (!(await add.count())) return {offered: false};
        await add.first().click();
        await chapterForm().waitFor({timeout: T});
        await idle(page); await sleep(500);
        await chapterForm().locator('input[name^="title["]').first().fill(title);
        const resp = page.waitForResponse((r) => /update-?chapter/i.test(r.url()), {timeout: T}).catch(() => null);
        await chapterForm().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        let body = null;
        try { body = r ? flat(await r.text(), 300) : null; } catch (e) { /* ignore */ }
        await sleep(800); await idle(page);
        const notices = (await page.locator('.pkp_notification, [role="status"], .pnotify, .ui-pnotify').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean);
        return {offered: true, status: r ? r.status() : null, body, formStillOpen: await chapterForm().count() > 0, notices, titlesSamePage: (await readGrid()).titleLinks, api: apiSince(n)};
    };

    // ---------------------------------------------------------------- work type / Publication Dates helpers
    const menuItemsOpen = async () => page.getByRole('menuitem').allInnerTexts().catch(() => []);
    const chooseWorkType = async (label) => {
        const n = apiLog.length;
        const d0 = dialogs.length;
        await workTypeButton().first().click();
        await page.getByRole('menuitem').first().waitFor({timeout: T});
        const items = (await menuItemsOpen()).map((s) => s.trim());
        await page.getByRole('menuitem', {name: label, exact: true}).click();
        await sleep(500); await idle(page); await sleep(300);
        const errorDlg = page.getByRole('dialog').filter({hasNot: page.locator('[data-cy="sidemodal-header"]')});
        const extra = [];
        for (const d of await errorDlg.all()) if (await d.isVisible().catch(() => false)) extra.push(flat(await d.innerText().catch(() => ''), 300));
        return {items, labelAfter: await workTypeLabel(), api: apiSince(n), browserDialogs: dialogs.slice(d0), otherDialogs: extra};
    };
    const dismissErrorDialog = async () => {
        const ok = page.getByRole('dialog').filter({hasText: 'Error'}).getByRole('button', {name: 'OK', exact: true});
        if (await ok.count()) { await ok.first().click().catch(() => {}); await sleep(600); }
    };
    const pdRadios = async () => wf().locator('input[type=radio][name="enableChapterPublicationDates"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked}))).catch(() => null);
    const openPD = async (p, id) => {
        await openWf(editorialUrl(p, id, 'marketing_publicationDates'));
        await wf().locator('input[type=radio][name="enableChapterPublicationDates"]').first().waitFor({timeout: 15000}).catch(() => {});
        await idle(page);
    };
    const pdSave = async (label) => {
        const n = apiLog.length;
        await wf().getByRole('radio', {name: label, exact: true}).check();
        await sleep(200);
        const btn = wf().getByRole('button', {name: 'Save', exact: true});
        const enabled = await btn.isEnabled().catch(() => null);
        await btn.click();
        await sleep(900); await idle(page); await sleep(400);
        const status = (await wf().locator('.pkpFormPage__status, [role="status"]').allInnerTexts().catch(() => [])).map((s) => s.trim()).filter(Boolean);
        const notices = (await page.locator('.app__notifications').allInnerTexts().catch(() => [])).map((s) => flat(s, 200)).filter(Boolean);
        return {enabled, status, notices, radiosSamePage: await pdRadios(), api: apiSince(n)};
    };

    // ---------------------------------------------------------------- "other page" editability (A1)
    const pageEditability = async (p, b, key, {author = false} = {}) => {
        await openWf((author ? authorUrl : editorialUrl)(p, b.submissionId, `publication_${b.publicationId}_${key}`));
        await sleep(800); await idle(page);
        await settled(page, wf().locator('form, .pkp_controllers_grid').first()).catch(() => {});
        const form = wf().locator('form').first();
        return {
            heading: await heading(),
            saveButtons: await wf().getByRole('button', {name: 'Save', exact: true}).evaluateAll((els) => els.map((e) => ({visible: e.offsetParent !== null, disabled: e.disabled}))).catch(() => null),
            inputs: await form.locator('input:not([type=hidden]), textarea, select').evaluateAll((els) => ({n: els.length, disabled: els.filter((e) => e.disabled || e.readOnly).length})).catch(() => null),
            editors: await wf().locator('.tox-tinymce, [contenteditable]').evaluateAll((els) => els.map((e) => e.getAttribute('contenteditable') || e.className.slice(0, 40))).catch(() => null),
            gridActions: await wf().locator('.pkp_controllers_grid .header a, .pkp_controllers_grid .actions a').evaluateAll((els) => els.filter((a) => a.offsetParent !== null).map((a) => a.innerText.trim())).catch(() => null),
            addButtons: await wf().getByRole('button', {name: /^(Add|Upload|Edit|Delete)\b/}).evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => `${e.innerText.trim()}${e.disabled ? ' (disabled)' : ''}`)).catch(() => null),
            lines: await wfLines(/published|can not be edited|Warning|not have permission|read only/i),
        };
    };

    const ctxUsers = (p, list) => list.map(([k, role, g, f]) => ({username: `${p}${k}`, roles: [role], givenName: g, familyName: f}));
    const STAFF = [
        ['mg', 'manager', 'Mona', 'Manager'], ['ed', 'editor', 'Eda', 'Editor'], ['pe', 'productionEditor', 'Pete', 'Production'],
        ['se', 'sectionEditor', 'Sam', 'Series'], ['sn', 'sectionEditor', 'Nina', 'Nometa'],
        ['le', 'layoutEditor', 'Leo', 'Layout'], ['ce', 'copyeditor', 'Cara', 'Copy'], ['de', 'designer', 'Dee', 'Designer'],
        ['ix', 'indexer', 'Ian', 'Indexer'], ['pr', 'proofreader', 'Pia', 'Proof'], ['mk', 'marketing', 'Mark', 'Marketing'], ['fu', 'funding', 'Fay', 'Funding'],
        ['au', 'author', 'Alma', 'Author'], ['ve', 'volumeEditor', 'Vera', 'Volume'], ['ca', 'chapterAuthor', 'Cal', 'Chapter'], ['tr', 'translator', 'Tom', 'Translator'],
    ];
    const ASSIST = ['le', 'ce', 'de', 'ix', 'pr', 'mk', 'fu'];
    const ASSIST_ROLE = {le: 'layoutEditor', ce: 'copyeditor', de: 'designer', ix: 'indexer', pr: 'proofreader', mk: 'marketing', fu: 'funding'};
    const newPress = async (p, extra = {}) => app.api.createContext({tag: p, context: {name: {en: `K1 ${p}`}, contactName: 'Paula Principal', contactEmail: `principal${p}@mail.test`}, users: ctxUsers(p, STAFF), ...extra});
    const staffParticipants = (p, {snMeta = false, assist = ASSIST} = {}) => [
        {username: `${p}se`, role: 'sectionEditor'},
        {username: `${p}sn`, role: 'sectionEditor', canChangeMetadata: snMeta},
        ...assist.map((k) => ({username: `${p}${k}`, role: ASSIST_ROLE[k]})),
    ];

    // ================================================================ X: absence (td1) and the OMP positive control
    if (PHASES.includes('X')) {
        await guard('X start publicknowledge', async () => {
            await signIn(page, 'author.alex');
            await page.goto(app.url(`/index.php/${app.contextPath}/submission`));
            await idle(page);
            const r = {legends: (await page.locator('legend, .pkpFormFieldLabel').allTextContents()).map((t) => flat(t, 120)),
                radios: await page.getByRole('radio').evaluateAll((els) => els.map((e) => (e.closest('label') || {}).innerText?.trim())),
                submissionType: await page.getByText('Submission Type', {exact: true}).count()};
            fact('X.startPK', r);
            await snap('x-start-publicknowledge', r, {png: true});
        });
        const p = tag('u72k1x');
        const ok = await seedTry('X press', () => app.api.createContext({tag: p, context: {name: {en: `K1 ${p}`}, contactName: 'Paula Principal', contactEmail: `principal${p}@mail.test`},
            users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author']}]}));
        if (ok) {
            const s = await app.api.createSubmission({tag: `${p}s`, context: p, submitter: `${p}au`, title: `K1 control ${p}`});
            const d = await app.api.createSubmission({tag: `${p}d`, context: p, submitter: `${p}au`, title: `K1 draft ${p}`, submitted: false});
            await guard('X manager workflow', async () => {
                await signIn(page, `${p}mg`);
                await openWf(editorialUrl(p, s.submissionId));
                const r = {menu: await menuItems(), header: await headerButtons(), workTypeControl: await workTypeButton().count(),
                    marketing: await wf().getByRole('navigation').getByText('Marketing', {exact: true}).count().catch(() => null),
                    chaptersItem: await wf().getByRole('link', {name: 'Chapters', exact: true}).count()};
                fact('X.managerWorkflow', r);
                await snap('x-manager-workflow', r, {png: true});
                await loc(page, 'workflow side menu: "Chapters" item', wf().getByRole('link', {name: 'Chapters', exact: true}));
                await loc(page, 'workflow header: work-type control', workTypeButton());
                // The version's pages: open the version and list what it holds.
                const titleAbs = wf().getByRole('link', {name: 'Title & Abstract', exact: true});
                if (await titleAbs.count()) { await titleAbs.first().click(); await idle(page); }
                fact('X.managerMenuAfterVersion', await menuItems());
            });
            await guard('X author workflow', async () => {
                await signIn(page, `${p}au`);
                await openWf(authorUrl(p, s.submissionId));
                const r = {menu: await menuItems(), header: await headerButtons(), chaptersItem: await wf().getByRole('link', {name: 'Chapters', exact: true}).count()};
                fact('X.authorWorkflow', r);
                await snap('x-author-workflow', r);
            });
            await guard('X draft details', async () => {
                await page.goto(app.url(`/index.php/${p}/submission?id=${d.submissionId}`));
                await idle(page);
                const current = () => page.locator('.pkpSteps__step__label--current');
                const cont = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
                const r = {steps: (await page.locator('.pkpSteps__buttons .pkpSteps__step__label').allInnerTexts()).map((x) => flat(x, 40))};
                for (let i = 0; i < 4 && !/Details/.test(await current().innerText().catch(() => '')); i++) { await cont.click(); await sleep(1500); await idle(page); }
                r.current = flat(await current().innerText().catch(() => null), 60);
                r.headings = (await page.locator('.submissionWizard h2, .submissionWizard h3, .submissionWizard legend, .pkp_controllers_grid .header').allInnerTexts()).map((x) => flat(x, 80)).filter(Boolean);
                r.chapterGrid = await grid().count();
                r.chaptersText = await page.getByText('Chapters', {exact: true}).count();
                fact('X.draftDetails', r);
                await snap('x-draft-details', r, {png: true});
                if (isOMP) {
                    for (let i = 0; i < 5 && !/Review\s*$/.test(flat(await current().innerText().catch(() => ""), 40)); i++) { await cont.click(); await sleep(1500); await idle(page); }
                    const rv = {current: flat(await current().innerText().catch(() => null), 60),
                        panels: (await page.locator('.submissionWizard__reviewPanel h3, .submissionWizard__reviewPanel__header h3, .submissionWizard h3').allInnerTexts()).map((x) => flat(x, 80)).filter(Boolean)};
                    fact('X.draftReview', rv);
                    await snap('x-draft-review', rv);
                }
            });
        }
    }

    // ================================================================ P: an unpublished book (td2, Rule 3, Setting 6, A1)
    if (isOMP && PHASES.includes('P')) {
        const p = tag('u72k1p');
        const pr = await seedTry('P press', () => newPress(p));
        if (pr) {
            const ada = {givenName: 'Ada', familyName: 'Lovel', email: `ada${p}@mail.test`};
            const chapters = (sub) => [{title: 'Tides', authors: [sub, ada.email]}, {title: 'Harbours'}];
            const U = await app.api.createSubmission({tag: `${p}u`, context: p, submitter: `${p}au`, title: `K1 unpublished ${p}`, workType: 'editedVolume',
                decisions: ['skipExternalReview'], contributors: [ada], chapters: chapters(`${p}au`), participants: staffParticipants(p)});
            fact('P.U', {id: U.submissionId, pub: U.publicationId});
            // td2: each permission level on the unpublished version.
            const levels = [['mg', false], ['ed', false], ['pe', false], ['admin', false], ['se', false], ['sn', false], ['le', false], ['ce', false], ['de', false], ['fu', false], ['au', true]];
            const res = {};
            for (const [k, author] of levels) {
                await guard(`P list ${k}`, async () => {
                    await signIn(page, k === 'admin' ? 'admin' : `${p}${k}`);
                    res[k] = await listAs(`p-list-${k}`, p, U, {author, png: ['mg', 'sn', 'le', 'au'].includes(k)});
                    fact(`P.list.${k}`, {actions: res[k].grid.actions, titleLinks: res[k].grid.titleLinks, row: res[k].row, heading: res[k].heading, text: flat(res[k].grid.text, 300)});
                });
            }
            await loc(page, 'Chapters page: "Add Chapter" link', grid().getByRole('link', {name: 'Add Chapter', exact: true}));
            // A1 "every other page": the assistant's and the no-permission Series editor's other pages on the unpublished version.
            for (const k of ['le', 'sn', 'mg']) {
                await guard(`P other pages ${k}`, async () => {
                    await signIn(page, `${p}${k}`);
                    const r = {};
                    for (const key of ['titleAbstract', 'publicationFormats', 'catalogEntry', 'contributors']) r[key] = await pageEditability(p, U, key);
                    fact(`P.otherPages.${k}`, r);
                    await snap(`p-other-${k}`, r);
                });
            }
            // Setting 6: the role defaults (Roles › Edit) and the assignment's box.
            await guard('P roles window', async () => {
                await signIn(page, `${p}mg`);
                const out = {};
                for (const roleName of ['Author', 'Layout Editor', 'Copyeditor', 'Series editor', 'Volume editor']) {
                    await page.goto(app.url(`/index.php/${p}/management/settings/access`));
                    await idle(page);
                    const rolesTab = page.getByRole('tab', {name: 'Roles', exact: true}).or(page.locator('#roles-button')).first();
                    if (await rolesTab.count()) await rolesTab.click();
                    await idle(page);
                    await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                    const cellRe = new RegExp(`^\\s*(Settings\\s+)?${roleName}\\s*$`, 'i');
                    const row = page.locator('tr.gridRow').filter({has: page.locator('td').filter({hasText: cellRe})}).first();
                    if (!(await row.count())) { out[roleName] = 'row absent'; continue; }
                    await row.locator('a.show_extras').click();
                    await idle(page);
                    await page.getByRole('link', {name: 'Edit', exact: true}).last().click();
                    const form = page.locator('form#userGroupForm');
                    await form.waitFor({state: 'visible', timeout: T}).catch(() => {});
                    const box = form.locator('input[name="permitMetadataEdit"]');
                    await box.waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
                    out[roleName] = {checked: await box.isChecked().catch(() => null), disabled: await box.isDisabled().catch(() => null),
                        label: flat(await box.locator('xpath=ancestor::label[1] | ancestor::li[1]').first().innerText().catch(() => null), 120)};
                    await snap(`p-role-${roleName.replace(/\s+/g, '-').toLowerCase()}`, out[roleName]);
                }
                fact('P.rolesPermitMetadataEdit', out);
            });
            // Setting 6 "on": a second book; the manager ticks "Permissions" on the Author's and the Layout Editor's assignments.
            const U2 = await app.api.createSubmission({tag: `${p}u2`, context: p, submitter: `${p}au`, title: `K1 permission ${p}`, workType: 'editedVolume',
                decisions: ['skipExternalReview'], contributors: [ada], chapters: chapters(`${p}au`), participants: [{username: `${p}le`, role: 'layoutEditor'}, {username: `${p}ce`, role: 'copyeditor', canChangeMetadata: true}]});
            fact('P.U2', {id: U2.submissionId, pub: U2.publicationId});
            const editAssignment = async (stageKey, displayName, want, name) => {
                await openWf(editorialUrl(p, U2.submissionId, stageKey));
                await wf().getByText('Participants', {exact: true}).first().waitFor({timeout: T}).catch(() => {});
                await idle(page);
                const more = wf().getByRole('button', {name: `${displayName} More Actions`}).first();
                if (!(await more.count())) return {found: false, participants: await wfLines(/Author|Layout|Copy|Manager/)};
                await more.click();
                const items = (await menuItemsOpen()).map((s) => s.trim());
                const edit = page.getByRole('menuitem', {name: 'Edit', exact: true}).first();
                if (!(await edit.count())) return {found: true, items, edit: false};
                await edit.click();
                const win = page.getByRole('dialog').filter({hasText: 'Edit Assignment'}).last();
                const box = win.locator('input[name="canChangeMetadata"]');
                await box.waitFor({state: 'visible', timeout: T}).catch(() => {});
                const before = await box.isChecked().catch(() => null);
                const s = await snap(name, {items, before});
                const out = {found: true, items, before, winText: flat(s.text?.dialog, 400)};
                if (want && before === false) {
                    await box.check();
                    await win.getByRole('button', {name: 'OK', exact: true}).click();
                    await box.waitFor({state: 'detached', timeout: T}).catch(() => {});
                    await idle(page);
                    out.set = true;
                } else {
                    await win.getByRole('link', {name: 'Cancel', exact: true}).or(win.getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
                    await box.waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
                }
                return out;
            };
            await guard('P off-list before tick', async () => {
                for (const k of ['au', 'le', 'ce']) {
                    await signIn(page, `${p}${k}`);
                    const r = await listAs(`p-u2-before-${k}`, p, U2, {author: k === 'au'});
                    fact(`P.u2.before.${k}`, {actions: r.grid.actions, titleLinks: r.grid.titleLinks});
                }
            });
            await guard('P tick assignments', async () => {
                await signIn(page, `${p}mg`);
                fact('P.tick.author', await editAssignment('workflow_4', 'Alma Author', true, 'p-edit-assignment-author'));
                fact('P.tick.le', await editAssignment('workflow_5', 'Leo Layout', true, 'p-edit-assignment-le'));
                fact('P.tick.ce.read', await editAssignment('workflow_4', 'Cara Copy', false, 'p-edit-assignment-ce'));
            });
            await guard('P on-list after tick', async () => {
                for (const k of ['au', 'le', 'ce']) {
                    await signIn(page, `${p}${k}`);
                    const r = await listAs(`p-u2-after-${k}`, p, U2, {author: k === 'au', png: k === 'au'});
                    const add = await addChapter(`Epilogue ${k}`);
                    await openChapters(p, U2.submissionId, U2.publicationId, {author: k === 'au'});
                    add.titlesAfterReload = (await readGrid()).titleLinks;
                    fact(`P.u2.after.${k}`, {actions: r.grid.actions, titleLinks: r.grid.titleLinks, row: r.row, add});
                    await snap(`p-u2-after-add-${k}`, add);
                }
            });
            // Author-level roles as submitters (lines 37-38).
            for (const k of ['ve', 'ca', 'tr']) {
                await guard(`P author-level ${k}`, async () => {
                    let B = await seedTry(`P book by ${k}`, () => app.api.createSubmission({tag: `${p}b${k}`, context: p, submitter: `${p}${k}`, title: `K1 by ${k} ${p}`,
                        decisions: ['skipExternalReview'], chapters: [{title: 'Tides', authors: [`${p}${k}`]}]}));
                    let how = 'submitter';
                    if (!B) {
                        how = 'participant';
                        B = await app.api.createSubmission({tag: `${p}c${k}`, context: p, submitter: `${p}au`, title: `K1 with ${k} ${p}`,
                            decisions: ['skipExternalReview'], chapters: [{title: 'Tides', authors: [`${p}au`]}], participants: [{username: `${p}${k}`, role: {ve: 'volumeEditor', ca: 'chapterAuthor', tr: 'translator'}[k]}]});
                    }
                    await signIn(page, `${p}${k}`);
                    const ed = await openWf(editorialUrl(p, B.submissionId));
                    const edUrl = page.url();
                    const r = await listAs(`p-authorlevel-${k}`, p, B, {author: true});
                    fact(`P.authorLevel.${k}`, {how, editorialStatus: ed, editorialUrl: edUrl.replace(/^.*index\.php/, ''), actions: r.grid.actions, titleLinks: r.grid.titleLinks, header: r.header, menu: r.menu});
                });
            }
            // Line 49: "Chapters" listed with no Production-stage requirement: a book still in Submission.
            await guard('P submission-stage book', async () => {
                const S0 = await app.api.createSubmission({tag: `${p}s0`, context: p, submitter: `${p}au`, title: `K1 new ${p}`, chapters: [{title: 'Tides', authors: [`${p}au`]}]});
                for (const k of ['au', 'mg']) {
                    await signIn(page, `${p}${k}`);
                    await openWf((k === 'au' ? authorUrl : editorialUrl)(p, S0.submissionId));
                    const menu = await menuItems();
                    const r = await listAs(`p-s0-${k}`, p, S0, {author: k === 'au'});
                    fact(`P.s0.${k}`, {menuOnLanding: menu, actions: r.grid.actions, titleLinks: r.grid.titleLinks, heading: r.heading});
                }
            });
            // Line 50: the submitting Author in the wizard.
            await guard('P wizard', async () => {
                const D = await app.api.createSubmission({tag: `${p}dr`, context: p, submitter: `${p}au`, title: `K1 draft ${p}`, submitted: false, workType: 'editedVolume', chapters: [{title: 'Tides', authors: [`${p}au`]}, {title: 'Harbours'}]});
                await signIn(page, `${p}au`);
                await page.goto(app.url(`/index.php/${p}/submission?id=${D.submissionId}`));
                await idle(page);
                const current = () => page.locator('.pkpSteps__step__label--current');
                const cont = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
                for (let i = 0; i < 4 && !/Details/.test(await current().innerText().catch(() => '')); i++) { await cont.click(); await sleep(1500); await idle(page); }
                await grid().waitFor({timeout: T}).catch(() => {});
                const g = await readGrid();
                const row = await rowControls('Tides');
                const add = await addChapter('Epilogue');
                await page.reload(); await idle(page);
                for (let i = 0; i < 4 && !/Details/.test(await current().innerText().catch(() => '')); i++) { await cont.click(); await sleep(1500); await idle(page); }
                await grid().waitFor({timeout: T}).catch(() => {});
                add.titlesAfterReload = (await readGrid()).titleLinks;
                // Change: the work-type choice in the wizard.
                const change = page.locator('#submission-configuration').getByRole('button', {name: 'Change', exact: true});
                let changeRadios = null;
                if (await change.count()) {
                    await change.click(); await idle(page); await sleep(500);
                    changeRadios = await page.getByRole('dialog').last().getByRole('radio').evaluateAll((els) => els.map((e) => ({checked: e.checked, label: (e.closest('label') || {}).innerText?.trim()})));
                    await snap('p-wizard-change', {changeRadios});
                    await page.getByRole('dialog').last().getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
                }
                fact('P.wizard', {actions: g.actions, titleLinks: g.titleLinks, row, add, changeRadios});
                await snap('p-wizard-details', {g, row, add}, {png: true});
            });
            // Leaving the Chapters page with a typed, unsaved chapter (the sweep's "leave once").
            await guard('P leave unsaved', async () => {
                await signIn(page, `${p}mg`);
                await openChapters(p, U.submissionId, U.publicationId);
                await grid().getByRole('link', {name: 'Add Chapter', exact: true}).first().click();
                await chapterForm().waitFor({timeout: T});
                await chapterForm().locator('input[name^="title["]').first().fill('Unsaved Leave');
                await chapterForm().locator('input[name^="title["]').first().blur();
                const d0 = dialogs.length;
                await page.goto(editorialUrl(p, U.submissionId, `publication_${U.publicationId}_titleAbstract`)).catch((e) => fact('P.leave.gotoError', flat(e.message, 200)));
                await idle(page);
                await openChapters(p, U.submissionId, U.publicationId);
                fact('P.leave', {dialogs: dialogs.slice(d0), titlesAfter: (await readGrid()).titleLinks});
            });
        }
    }

    // ================================================================ B: a published book (td3, A1)
    if (isOMP && PHASES.includes('B')) {
        const p = tag('u72k1b');
        const pr = await seedTry('B press', () => newPress(p));
        if (pr) {
            const ada = {givenName: 'Ada', familyName: 'Lovel', email: `ada${p}@mail.test`};
            const P = await app.api.createSubmission({tag: `${p}pub`, context: p, submitter: `${p}au`, title: `K1 published ${p}`, workType: 'editedVolume',
                decisions: ['skipExternalReview', 'sendToProduction'], published: true, contributors: [ada],
                chapters: [{title: 'Tides', authors: [`${p}au`, ada.email]}, {title: 'Harbours'}], participants: staffParticipants(p)});
            fact('B.P', {id: P.submissionId, pub: P.publicationId});
            const levels = [['mg', false], ['ed', false], ['pe', false], ['admin', false], ['se', false], ['sn', false], ...ASSIST.map((k) => [k, false]), ['au', true]];
            for (const [k, author] of levels) {
                await guard(`B list ${k}`, async () => {
                    await signIn(page, k === 'admin' ? 'admin' : `${p}${k}`);
                    const r = await listAs(`b-list-${k}`, p, P, {author, png: ['mg', 'le', 'au'].includes(k)});
                    fact(`B.list.${k}`, {actions: r.grid.actions, titleLinks: r.grid.titleLinks, row: r.row, lines: r.publishedLines, heading: r.heading, menuHasChapters: (r.menu || []).includes('Chapters')});
                });
            }
            // td3: the Layout Editor adds "Epilogue"; the no-permission Series editor adds too; read after a reload and as the manager.
            for (const k of ['le', 'sn', 'fu']) {
                await guard(`B add ${k}`, async () => {
                    await signIn(page, `${p}${k}`);
                    await openChapters(p, P.submissionId, P.publicationId);
                    const add = await addChapter(k === 'le' ? 'Epilogue' : `Epilogue ${k}`);
                    await openChapters(p, P.submissionId, P.publicationId);
                    add.titlesAfterReload = (await readGrid()).titleLinks;
                    fact(`B.add.${k}`, add);
                    await snap(`b-add-${k}`, add, {png: k === 'le'});
                });
            }
            // The Layout Editor opens a chapter window, and deletes the chapter it added (the controls work, not only show).
            await guard('B le window and delete', async () => {
                await signIn(page, `${p}le`);
                await openChapters(p, P.submissionId, P.publicationId);
                await grid().getByRole('link', {name: 'Harbours', exact: true}).first().click();
                await chapterForm().waitFor({timeout: T});
                await idle(page); await sleep(500);
                await chapterForm().locator('input[name^="subtitle["]').first().fill('Edited by layout');
                const resp = page.waitForResponse((r) => /update-?chapter/i.test(r.url()), {timeout: T}).catch(() => null);
                await chapterForm().getByRole('button', {name: 'Save', exact: true}).click();
                const r = await resp;
                await sleep(800); await idle(page);
                const out = {editStatus: r ? r.status() : null};
                const row = grid().locator('tr.gridRow').filter({hasText: 'Epilogue'}).first();
                await row.locator('a.show_extras').first().click(); await sleep(400);
                const id = await row.getAttribute('id');
                const del = page.locator(`#${id}-control-row`).getByRole('link', {name: 'Delete', exact: true});
                out.deleteOffered = await del.count();
                if (out.deleteOffered) {
                    await del.first().click();
                    const conf = page.locator('[role="dialog"]:visible, .pkp_modal_confirmation:visible').filter({hasText: /Are you sure|delete/i}).last();
                    await conf.waitFor({timeout: 10000}).catch(() => {});
                    out.confirmText = flat(await conf.innerText().catch(() => null), 200);
                    const dresp = page.waitForResponse((x) => /delete-?chapter/i.test(x.url()), {timeout: T}).catch(() => null);
                    await conf.getByRole('button', {name: /^(OK|Yes|Delete)$/}).or(conf.getByRole('link', {name: /^(OK|Yes|Delete)$/})).first().click().catch(() => {});
                    const dr = await dresp;
                    out.deleteStatus = dr ? dr.status() : null;
                    await sleep(800); await idle(page);
                }
                await openChapters(p, P.submissionId, P.publicationId);
                out.titlesAfterReload = (await readGrid()).titleLinks;
                fact('B.le.editDelete', out);
                await snap('b-le-edit-delete', out);
            });
            // A1 "every other page follows the permission on both sides": the published version's other pages.
            for (const k of ['le', 'sn', 'mg']) {
                await guard(`B other pages ${k}`, async () => {
                    await signIn(page, `${p}${k}`);
                    const r = {};
                    for (const key of ['titleAbstract', 'publicationFormats', 'catalogEntry', 'contributors']) r[key] = await pageEditability(p, P, key);
                    fact(`B.otherPages.${k}`, r);
                    await snap(`b-other-${k}`, r);
                });
            }
        }
    }

    // ================================================================ Q: an unpublished book in Production (td2's Layout Editor, Setting 6 for an assistant, A1)
    if (isOMP && PHASES.includes('Q')) {
        const p = tag('u72k1q');
        const pr = await seedTry('Q press', () => newPress(p));
        if (pr) {
            const ada = {givenName: 'Ada', familyName: 'Lovel', email: `ada${p}@mail.test`};
            const Q = await app.api.createSubmission({tag: `${p}q`, context: p, submitter: `${p}au`, title: `K1 production ${p}`, workType: 'editedVolume',
                decisions: ['skipExternalReview', 'sendToProduction'], contributors: [ada], chapters: [{title: 'Tides', authors: [`${p}au`, ada.email]}, {title: 'Harbours'}],
                participants: staffParticipants(p)});
            fact('Q.Q', {id: Q.submissionId, pub: Q.publicationId});
            for (const k of ['le', 'de', 'ix', 'pr', 'mk', 'fu', 'ce', 'sn', 'au']) {
                await guard(`Q list ${k}`, async () => {
                    await signIn(page, `${p}${k}`);
                    const r = await listAs(`q-list-${k}`, p, Q, {author: k === 'au', png: k === 'le'});
                    fact(`Q.list.${k}`, {heading: r.heading, actions: r.grid.actions, titleLinks: r.grid.titleLinks, row: r.row, header: r.header, menu: r.menu});
                });
            }
            const KEYS = ['titleAbstract', 'contributors', 'chapters', 'metadata', 'publicationFormats', 'media', 'citations', 'catalogEntry', 'license'];
            for (const k of ['le', 'sn', 'mg']) {
                await guard(`Q other pages ${k}`, async () => {
                    await signIn(page, `${p}${k}`);
                    const r = {};
                    for (const key of KEYS) r[key] = await pageEditability(p, Q, key);
                    fact(`Q.otherPages.${k}`, Object.fromEntries(Object.entries(r).map(([a, b]) => [a, {h: b.heading, save: b.saveButtons, grid: b.gridActions, buttons: b.addButtons}])));
                    await snap(`q-other-${k}`, r);
                });
            }
            // The no-permission Series editor presses "Add publication format" (what the offered control does).
            await guard('Q sn add format', async () => {
                await signIn(page, `${p}sn`);
                await openWf(editorialUrl(p, Q.submissionId, `publication_${Q.publicationId}_publicationFormats`));
                await sleep(800); await idle(page);
                const n = apiLog.length;
                await wf().getByRole('link', {name: 'Add publication format'}).first().click();
                const form = page.locator('form[id*="ublicationFormat"]:visible').first();
                await form.waitFor({timeout: T}).catch(() => {});
                await idle(page); await sleep(500);
                const nameBox = form.locator('input[name^="name["]').first();
                await nameBox.fill('K1 format');
                const resp = page.waitForResponse((r) => /update-?format|publication-?format/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                await form.getByRole('button', {name: /^(OK|Save)$/}).first().click();
                const r = await resp;
                await sleep(800); await idle(page);
                const out = {status: r ? r.status() : null, url: r ? r.url().replace(/^.*index\.php/, '') : null, body: r ? flat(await r.text().catch(() => ''), 300) : null, formOpen: await form.isVisible().catch(() => false),
                    gridText: flat(await wf().locator('.pkp_controllers_grid').first().innerText().catch(() => ''), 400), api: apiSince(n)};
                await openWf(editorialUrl(p, Q.submissionId, `publication_${Q.publicationId}_publicationFormats`));
                await sleep(800); await idle(page);
                out.gridAfterReload = flat(await wf().locator('.pkp_controllers_grid').first().innerText().catch(() => ''), 400);
                fact('Q.sn.addFormat', out);
                await snap('q-sn-add-format', out);
            });
            // Setting 6 for an assistant, both ends: the manager ticks, then unticks, the Layout Editor's "Permissions".
            const editAssignment = async (displayName, want, name) => {
                await openWf(editorialUrl(p, Q.submissionId, 'workflow_5'));
                await wf().getByText('Participants', {exact: true}).first().waitFor({timeout: T}).catch(() => {});
                await idle(page);
                const more = wf().getByRole('button', {name: `${displayName} More Actions`}).first();
                if (!(await more.count())) return {found: false};
                await more.click();
                await page.getByRole('menuitem', {name: 'Edit', exact: true}).first().click();
                const win = page.getByRole('dialog').filter({hasText: 'Edit Assignment'}).last();
                const box = win.locator('input[name="canChangeMetadata"]');
                await box.waitFor({state: 'visible', timeout: T}).catch(() => {});
                const before = await box.isChecked().catch(() => null);
                await snap(name, {before});
                if (want) await box.check(); else await box.uncheck();
                await win.getByRole('button', {name: 'OK', exact: true}).click();
                await box.waitFor({state: 'detached', timeout: T}).catch(() => {});
                await idle(page);
                return {found: true, before, set: want};
            };
            for (const want of [true, false]) {
                await guard(`Q le permission ${want}`, async () => {
                    await signIn(page, `${p}mg`);
                    const e = await editAssignment('Leo Layout', want, `q-edit-assignment-le-${want}`);
                    await signIn(page, `${p}le`);
                    const r = await listAs(`q-le-after-${want}`, p, Q, {png: want});
                    const out = {edit: e, actions: r.grid.actions, titleLinks: r.grid.titleLinks, row: r.row};
                    if (want) {
                        out.add = await addChapter('Epilogue le');
                        await openChapters(p, Q.submissionId, Q.publicationId);
                        out.titlesAfterReload = (await readGrid()).titleLinks;
                        out.titleAbstract = (await pageEditability(p, Q, 'titleAbstract')).saveButtons;
                    }
                    fact(`Q.le.permission.${want}`, out);
                });
            }
        }
    }

    // ================================================================ W: the work type and "Publication Dates" per role (td4, td5, A2)
    if (isOMP && PHASES.includes('W')) {
        const p = tag('u72k1w');
        const pr = await seedTry('W press', () => newPress(p));
        if (pr) {
            const B = await app.api.createSubmission({tag: `${p}b`, context: p, submitter: `${p}au`, title: `K1 work type ${p}`,
                decisions: ['skipExternalReview', 'sendToProduction'], chapters: [{title: 'Tides', authors: [`${p}au`]}], participants: staffParticipants(p)});
            fact('W.B', {id: B.submissionId, pub: B.publicationId});
            const chapterKey = `publication_${B.publicationId}_chapters`;
            // Work type, each level in turn; the next role reads what the previous left.
            for (const k of ['mg', 'ed', 'pe', 'admin', 'se', 'sn', 'le', 'ce', 'de', 'mk']) {
                await guard(`W worktype ${k}`, async () => {
                    await signIn(page, k === 'admin' ? 'admin' : `${p}${k}`);
                    await openWf(editorialUrl(p, B.submissionId, chapterKey));
                    const before = await workTypeLabel();
                    const target = before === 'Edited Volume' ? 'Monograph' : 'Edited Volume';
                    const n0 = apiLog.length;
                    const ch = await chooseWorkType(target);
                    await snap(`w-wt-${k}`, {before, target, ...ch}, {png: ['le', 'mg'].includes(k)});
                    await sleep(3000);
                    ch.labelSamePageLater = await workTypeLabel();
                    ch.apiLater = apiSince(n0).filter((a) => /submissions\/\d+$/.test(a.u));
                    await dismissErrorDialog();
                    await openWf(editorialUrl(p, B.submissionId, chapterKey));
                    fact(`W.worktype.${k}`, {header: await headerButtons(), before, target, items: ch.items, labelAfter: ch.labelAfter, labelSamePageLater: ch.labelSamePageLater, apiLater: ch.apiLater, otherDialogs: ch.otherDialogs, api: ch.api.filter((a) => /submissions\/\d+$/.test(a.u) || a.s >= 400), labelAfterReload: await workTypeLabel()});
                });
            }
            await guard('W worktype author', async () => {
                await signIn(page, `${p}au`);
                await openWf(authorUrl(p, B.submissionId));
                const r = {header: await headerButtons(), control: await workTypeButton().count(), menu: await menuItems()};
                fact('W.worktype.au', r);
                await snap('w-wt-au', r);
            });
            // Publication Dates: the page as each level, a save each.
            const pdSeq = [['mg', EACH], ['ed', ALL], ['pe', EACH], ['admin', ALL], ['sn', EACH], ['le', ALL], ['ce', ALL], ['mk', ALL]];
            let first = true;
            for (const [k, choice] of pdSeq) {
                await guard(`W pd ${k}`, async () => {
                    await signIn(page, k === 'admin' ? 'admin' : `${p}${k}`);
                    await openPD(p, B.submissionId);
                    const before = await pdRadios();
                    const menu = await menuItems();
                    const h = await heading();
                    if (first) { await snap('w-pd-new', {before}, {png: true}); first = false; }
                    const s = await pdSave(choice);
                    await snap(`w-pd-${k}`, {before, s}, {png: ['le'].includes(k)});
                    await openPD(p, B.submissionId);
                    fact(`W.pd.${k}`, {heading: h, marketing: menu && menu.filter((m) => /Audience|Representatives|Publication Dates|Marketing/.test(m)), before, choice, enabled: s.enabled, status: s.status, notices: s.notices, radiosSamePage: s.radiosSamePage, api: s.api.filter((a) => a.m !== 'GET' || a.s >= 400), afterReload: await pdRadios()});
                });
            }
            // Sweep: the assistant's other "Marketing" pages.
            await guard('W le audience', async () => {
                await signIn(page, `${p}le`);
                const r = {};
                for (const key of ['marketing_audience', 'marketing_representatives']) {
                    await openWf(editorialUrl(p, B.submissionId, key));
                    await sleep(800); await idle(page);
                    const save = wf().getByRole('button', {name: 'Save', exact: true});
                    r[key] = {heading: await heading(), save: await save.count(), gridActions: await wf().locator('.pkp_controllers_grid .header a').allInnerTexts().catch(() => null)};
                    if (key === 'marketing_audience' && await save.count()) {
                        const n = apiLog.length;
                        const sel = wf().locator('select').first();
                        if (await sel.count()) {
                            const opts = await sel.locator('option').evaluateAll((els) => els.map((o) => o.value).filter(Boolean));
                            if (opts.length) await sel.selectOption(opts[0]);
                        }
                        await save.first().click(); await sleep(900); await idle(page);
                        r[key].saveApi = apiSince(n).filter((a) => a.m !== 'GET' || a.s >= 400);
                        r[key].status = (await wf().locator('.pkpFormPage__status').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
                        r[key].notices = (await page.locator('.app__notifications').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean);
                    }
                    if (key === 'marketing_representatives' && r[key].gridActions && r[key].gridActions.some((a) => /Add Representative/.test(a))) {
                        await wf().getByRole('link', {name: 'Add Representative'}).first().click();
                        const form = page.locator('form:visible').filter({has: page.locator('input[name="name"]')}).last();
                        await form.waitFor({timeout: T}).catch(() => {});
                        await idle(page); await sleep(500);
                        r[key].formFields = await form.locator('input:not([type=hidden]), select').evaluateAll((els) => els.map((e) => e.name)).catch(() => null);
                        const sel = form.locator('select').first();
                        if (await sel.count()) { const o = await sel.locator('option').evaluateAll((els) => els.map((x) => x.value).filter(Boolean)); if (o.length) await sel.selectOption(o[0]); }
                        await form.locator('input[name="name"]').fill('K1 Rep');
                        const resp = page.waitForResponse((x) => /representative/i.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
                        await form.getByRole('button', {name: /^(OK|Save)$/}).first().click().catch(() => {});
                        const rr = await resp;
                        r[key].addStatus = rr ? rr.status() : null;
                        r[key].addBody = rr ? flat(await rr.text().catch(() => ''), 300) : null;
                        await sleep(800); await idle(page);
                        r[key].gridAfter = flat(await wf().locator('.pkp_controllers_grid').first().innerText().catch(() => ''), 300);
                    }
                    await snap(`w-le-${key}`, r[key]);
                }
                fact('W.le.marketingPages', r);
            });
            await guard('W author pd', async () => {
                await signIn(page, `${p}au`);
                await openWf(authorUrl(p, B.submissionId, 'marketing_publicationDates'));
                const r = {heading: await heading(), menu: await menuItems(), radios: await pdRadios()};
                fact('W.pd.au', r);
                await snap('w-pd-au', r);
            });
        }
    }

    // ================================================================ R: can the author-level roles start a book on screen (lines 37-38)
    if (isOMP && PHASES.includes('R')) {
        const p = tag('u72k1r');
        const pr = await seedTry('R press', () => newPress(p));
        if (pr) {
            for (const k of ['au', 've', 'ca', 'tr']) {
                await guard(`R start ${k}`, async () => {
                    await signIn(page, `${p}${k}`);
                    const resp = await page.goto(app.url(`/index.php/${p}/submission`));
                    await idle(page);
                    const main = await page.locator('main').innerText().catch(() => '');
                    const r = {status: resp && resp.status(), url: page.url().replace(/^.*index\.php/, ''), begin: await page.getByRole('button', {name: 'Begin Submission'}).count(),
                        roleChoice: await page.getByRole('radio').evaluateAll((els) => els.map((e) => (e.closest('label') || {}).innerText?.trim())).catch(() => null), excerpt: flat(main, 700)};
                    fact(`R.start.${k}`, r);
                    await snap(`r-start-${k}`, r);
                });
            }
        }
    }

    // ================================================================ A: the Purpose's field list (a chapter window on each work type, dates on and off)
    if (isOMP && PHASES.includes('A')) {
        const p = tag('u72k1a');
        const pr = await seedTry('A press', () => app.api.createContext({tag: p, context: {name: {en: `K1 ${p}`}, contactName: 'Paula Principal', contactEmail: `principal${p}@mail.test`},
            users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author'], givenName: 'Alma', familyName: 'Author'}]}));
        if (pr) {
            const ada = {givenName: 'Ada', familyName: 'Lovel', email: `ada${p}@mail.test`};
            const books = {
                ev: await app.api.createSubmission({tag: `${p}ev`, context: p, submitter: `${p}au`, title: `K1 volume ${p}`, workType: 'editedVolume', contributors: [ada],
                    files: [{file: 'article.pdf', genre: 'Chapter Manuscript'}], enableChapterPublicationDates: true, chapters: [{title: 'Tides', authors: [`${p}au`]}]}),
                mono: await app.api.createSubmission({tag: `${p}mo`, context: p, submitter: `${p}au`, title: `K1 monograph ${p}`, contributors: [ada],
                    files: [{file: 'article.pdf', genre: 'Chapter Manuscript'}], chapters: [{title: 'Tides', authors: [`${p}au`]}]}),
            };
            await signIn(page, `${p}mg`);
            for (const [k, b] of Object.entries(books)) {
                await guard(`A window ${k}`, async () => {
                    await openChapters(p, b.submissionId, b.publicationId);
                    await grid().getByRole('link', {name: 'Tides', exact: true}).first().click();
                    await chapterForm().waitFor({timeout: T});
                    await idle(page); await sleep(700);
                    const r = await chapterForm().evaluate((f) => ({
                        labels: [...new Set([...f.querySelectorAll('label, legend, .label, h3, h4')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter((t) => t && t.length < 80))],
                        authors: [...f.querySelectorAll('input[name="authors[]"]')].map((b) => ((b.closest('label, li, tr') || {}).innerText || '').replace(/\s+/g, ' ').trim()),
                        files: [...f.querySelectorAll('input[name="files[]"]')].map((b) => ((b.closest('label, li, tr') || {}).innerText || '').replace(/\s+/g, ' ').trim()),
                        names: [...new Set([...f.querySelectorAll('input, textarea, select')].map((e) => e.name.replace(/\[.*$/, '')).filter(Boolean))],
                    }));
                    r.header = await headerButtons();
                    fact(`A.window.${k}`, r);
                    await snap(`a-window-${k}`, r, {png: true});
                    await chapterForm().getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
                    await sleep(600);
                    // Cross-feature pointer: "Default Chapter License URL" on "Permissions & Disclosure".
                    await openWf(editorialUrl(p, b.submissionId, `publication_${b.publicationId}_license`));
                    await settled(page, wf().locator('.pkpFormPage__footer, .pkpFormPage__buttons').first()).catch(() => {});
                    const labels = (await wf().locator('.pkpFormFieldLabel, legend').allTextContents().catch(() => [])).map((t) => flat(t, 80)).filter(Boolean);
                    fact(`A.license.${k}`, {heading: await heading(), labels});
                    await snap(`a-license-${k}`, {labels});
                });
            }
        }
    }

    // ================================================================ C: cross-feature pointers and footnote s
    if (isOMP && PHASES.includes('C')) {
        const p = tag('u72k1c');
        // Footnote s: a press license through scenarios/context (the key the preamble names).
        fact('C.licenseKey', await (async () => {
            try { const r = await app.api.createContext({tag: `${p}l`, context: {name: {en: `K1 ${p}l`}}, licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', users: [{username: `${p}lmg`, roles: ['manager']}]}); return {ok: true, keys: Object.keys(r)}; } catch (e) { return {ok: false, error: flat(e.message, 500)}; }
        })());
        const pr = await seedTry('C press', () => app.api.createContext({tag: p, context: {name: {en: `K1 ${p}`}, contactName: 'Paula Principal', contactEmail: `principal${p}@mail.test`},
            enableDois: true, doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'chapter'], doiCreationTime: 'publication', enablePublisherId: ['chapter'],
            users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author'], givenName: 'Alma', familyName: 'Author'}]}));
        if (pr) {
            const ada = {givenName: 'Ada', familyName: 'Lovel', email: `ada${p}@mail.test`};
            const P = await app.api.createSubmission({tag: `${p}pub`, context: p, submitter: `${p}au`, title: `K1 pointers ${p}`, workType: 'editedVolume',
                decisions: ['skipExternalReview', 'sendToProduction'], published: true, contributors: [ada],
                files: [{file: 'article.pdf', genre: 'Chapter Manuscript'}], publicationFormats: [{name: 'PDF', file: 'replacement.pdf'}],
                chapters: [{title: 'Tides', authors: [`${p}au`, ada.email], page: true, files: ['files.0']}, {title: 'Harbours'}]});
            fact('C.P', {id: P.submissionId, pub: P.publicationId});
            await signIn(page, `${p}mg`);
            await guard('C grid and window', async () => {
                await openChapters(p, P.submissionId, P.publicationId);
                const g = await readGrid();
                await grid().getByRole('link', {name: 'Harbours', exact: true}).first().click();
                await chapterForm().waitFor({timeout: T});
                await idle(page); await sleep(600);
                const win = page.locator('[role="dialog"]:visible').filter({has: page.locator('form#editChapterForm')}).last();
                const r = {columns: g.columns, tabs: (await win.locator('[role="tab"], .ui-tabs-nav a').allInnerTexts().catch(() => [])).map((x) => flat(x, 40)),
                    files: await chapterForm().locator('input[name="files[]"]').evaluateAll((els) => els.map((b) => ({label: (b.closest('label, li, tr') || {}).innerText?.replace(/\s+/g, ' ').trim(), checked: b.checked, disabled: b.disabled}))).catch(() => null)};
                fact('C.gridWindow', r);
                await snap('c-chapter-window', r, {png: true});
                await chapterForm().getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
            });
            await guard('C dois page', async () => {
                await page.goto(app.url(`/index.php/${p}/dois`)); await idle(page); await sleep(800);
                const txt = await page.locator('main').innerText().catch(() => '');
                const r = {tides: /Tides/.test(txt), harbours: /Harbours/.test(txt), tabs: await page.getByRole('tab').allInnerTexts().catch(() => null), excerpt: flat(txt, 800)};
                const more = page.getByRole('button', {name: /^Show more details about/}).first();
                if (await more.count()) {
                    await more.click(); await idle(page); await sleep(500);
                    const t2 = await page.locator('main').innerText().catch(() => '');
                    r.expanded = {tides: /Tides/.test(t2), harbours: /Harbours/.test(t2), excerpt: flat(t2, 1200)};
                }
                fact('C.dois', r);
                await snap('c-dois', r, {png: true});
            });
            await guard('C sitemap and book page', async () => {
                const sm = await page.request.get(app.url(`/index.php/${p}/sitemap`));
                const body = await sm.text();
                const chapterUrls = (body.match(/<loc>[^<]*chapter[^<]*<\/loc>/g) || []);
                const r = {status: sm.status(), chapterUrls, n: (body.match(/<loc>/g) || []).length};
                await page.goto(app.url(`/index.php/${p}/catalog/book/${P.submissionId}`)); await idle(page);
                const bt = await page.locator('body').innerText();
                r.bookPageChapters = {tides: /Tides/.test(bt), harbours: /Harbours/.test(bt), tidesLink: await page.getByRole('link', {name: /Tides/}).count()};
                fact('C.sitemapBook', r);
                await snap('c-book-page', r);
            });
        }
        // Footnote s: the ready accounts on the seeded press (read-only: the Users list as manager.maya).
        await guard('C roster', async () => {
            await signIn(page, 'manager.maya');
            await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/access`)); await idle(page); await sleep(800);
            const txt = await page.locator('main').innerText().catch(() => '');
            const want = ['manager.maya', 'editor.diana', 'sectioneditor.ana', 'layouteditor.leo', 'copyeditor.carla', 'author.alex'];
            const rows = await page.locator('tr').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
            const r = {rows: rows.filter((t) => /Maya|Diana|Ana |Leo|Carla|Alex/.test(t)).slice(0, 20), excerpt: flat(txt, 1500), want};
            fact('C.roster', r);
            await snap('c-roster', r);
        });
    }

    await close();
});
