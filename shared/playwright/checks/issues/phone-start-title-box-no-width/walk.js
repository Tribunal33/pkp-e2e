// U21 A22 issue walk: at phone width, "Make a Submission" gives its "Title" box no width, so no submission starts.
// Steps (docs/issues/U21-A22-phone-start-screen-title-box-no-width.md), default dataset, a 375 x 812 window:
//   sign in as the author (OJS/OPS ccorino, OMP aclark) on the journal's login page; open Make a Submission; tap
//   the "Title" box and type; choose English, (OJS) "Articles", tick the two boxes; press "Begin Submission".
// Control in the same run: the same screen in a fresh 600 x 900 window, the box tapped and typed into (nothing sent).
// MODE=nb (the neighbour a fix must leave alone, run alone): the same screen at 768 x 900 and 1280 x 900, where the
// form fits: widths read and a title typed, nothing sent.
//
//   npm run fleet-prep -- --feature issues-k8 --dataset 2 --reset
// MODE=forms: two other forms at 375 (Settings > Masthead as rvaca; the wizard's Details step as the author), fields'
// widths read and one text box and one rich-text box typed into, nothing saved. MODE=display: dbarnes adds a
// discussion holding a long unbroken address on submission 2 (OJS) and opens it read-only at 1280 (ADD=0 opens an
// existing one); what runs past the window's edge is read.
//
//   PROBE_FEATURE=issues-k8 PROBE_AGENT=k14 node bin/probe.js all shared/playwright/checks/issues/phone-start-title-box-no-width/walk.js
//   (PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5; MODE=nb for the neighbour)
const {forEachApp, launch, screen, shot, record, signIn, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const PHONE = {width: 375, height: 812};
const flat = (s, n = 200) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const prefix = (app) => `/index.php/${app.contextPath}${app.line && /3_[34]/.test(app.line) ? '' : '/en'}`;

forEachApp(async (app) => {
    const {waitForEditorReady} = require('../../../support/richtext.js');
    const author = app.name === 'omp' ? 'aclark' : 'ccorino';
    const o = {app: app.name, line: app.line || 'main', mode: MODE, author, reads: {}};
    let n = 0;
    const snap = async (page, name, id = L.TITLE_ID) => {
        const g = await L.readStart(page, id);
        o.reads[name] = {geometry: g};
        const s = await screen(page).catch((e) => ({url: page.url(), error: String(e.message)}));
        s.geometry = g;
        const rid = `${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(rid, s);
        await shot(page, rid).catch(() => {});
        console.log(`[k14 ${app.name} ${o.line}] ${name}`, JSON.stringify({nav: g.sideNav && g.sideNav.w, main: g.main && g.main.w, title: g.titleEditor && g.titleEditor.w, container: g.titleContainer && g.titleContainer.w, doc: g.docScrollWidth}));
        return g;
    };
    const openStart = async (page) => {
        await page.goto(app.url(`${prefix(app)}/submission`));
        await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: 30_000});
        await idle(page);
        await waitForEditorReady(page, L.TITLE_ID).catch(() => {});
    };
    const window = async (size, fn, user = author) => {
        const {page, close} = await launch(app);
        try {
            await page.setViewportSize(size);
            await signIn(page, user, {contextPath: app.contextPath});
            await idle(page).catch(() => {});
            await fn(page);
        } finally {
            await close();
        }
    };

    if (MODE === 'walk') {
        // Steps 1-6 at phone width.
        await window(PHONE, async (page) => {
            await openStart(page);
            await snap(page, 'phone-start');
            o.reads['phone-start'].typed = await L.tapAndType(page, 'hkk14 phone title', {waitForEditorReady});
            console.log(`[k14 ${app.name}] typed`, JSON.stringify(o.reads['phone-start'].typed));
            const en = page.getByRole('radio', {name: 'English', exact: true});
            if (await en.count()) await en.check({timeout: 5000}).catch(() => {});
            const sec = page.getByRole('radio', {name: 'Articles', exact: true});
            if (app.name === 'ojs' && await sec.count()) await sec.check({timeout: 5000}).catch(() => {});
            for (const nm of [/meets all of these requirements/, /agree to have my data collected/]) {
                const b = page.getByRole('checkbox', {name: nm});
                if (await b.count()) await b.check({timeout: 5000}).catch(() => {});
            }
            const begin = {};
            const posts = [];
            page.on('request', (r) => { if (r.method() === 'POST' && /\/submissions\b/.test(r.url())) posts.push(r.url()); });
            try {
                await page.getByRole('button', {name: 'Begin Submission'}).click({timeout: 5000});
                await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 15_000});
                await page.locator('.pkpSteps').waitFor({timeout: 30_000});
                await idle(page);
                begin.outcome = `wizard opened, id ${new URL(page.url()).searchParams.get('id')}`;
            } catch (e) {
                await idle(page).catch(() => {});
                begin.outcome = `no wizard: ${flat(String(e.message).split('\n')[0])}`;
            }
            begin.url = page.url();
            begin.posts = posts;
            begin.disabled = await page.getByRole('button', {name: 'Begin Submission'}).isDisabled({timeout: 2000}).catch(() => null);
            begin.errors = flat(await page.locator('.pkpFormErrors, .pkpFormField__error').allInnerTexts().then((a) => a.join(' | ')).catch(() => null), 400);
            o.begin = begin;
            console.log(`[k14 ${app.name}] begin`, JSON.stringify(begin));
            await snap(page, 'phone-begin');
        });
        // Control: a fresh window at 600.
        await window({width: 600, height: 900}, async (page) => {
            await openStart(page);
            await snap(page, 'control-600');
            o.reads['control-600'].typed = await L.tapAndType(page, 'hkk14 control title', {waitForEditorReady});
            console.log(`[k14 ${app.name}] control typed`, JSON.stringify(o.reads['control-600'].typed));
        });
    } else if (MODE === 'nb') {
        // Neighbour: in windows wide enough for the form, the screen must lay out as before (box width, no
        // sideways scroll) and take a title: 768 (a tablet) and 1280 (a laptop).
        for (const size of [{width: 768, height: 900}, {width: 1280, height: 900}]) {
            await window(size, async (page) => {
                await openStart(page);
                const name = `nb-start-${size.width}`;
                await snap(page, name);
                o.reads[name].typed = await L.tapAndType(page, `hkk14 title ${size.width}`, {waitForEditorReady});
                console.log(`[k14 ${app.name}] ${name} typed`, JSON.stringify(o.reads[name].typed));
            });
        }
    } else if (MODE === 'forms') {
        // Two other forms at phone width, nothing saved: Settings > Journal > Masthead as the manager (rvaca), and the
        // wizard's Details step as the author (the submission begun at 1280 through the start screen, then the step
        // reached with "Continue", then the window narrowed to 375).
        const FORMS = (process.env.FORMS || 'settings,details').split(',');
        if (FORMS.includes('settings')) await window(PHONE, async (page) => {
            await page.goto(app.url(`${prefix(app)}/management/settings/context`)).catch(() => {});
            await idle(page);
            await page.locator('#app-main .pkpForm').first().waitFor({timeout: 30_000}).catch(() => {});
            await page.locator('#app-main .pkpForm iframe.tox-edit-area__iframe').first().waitFor({state: 'attached', timeout: 30_000}).catch(() => {});
            await idle(page);
            const f = await L.readFields(page);
            o.reads['forms-settings-375'] = {fields: f, typed: await L.tryControls(page, 'k14', '#app-main')};
            const s = await screen(page);
            s.fields = f;
            record(`${MODE}-settings-375`, s);
            await shot(page, `${MODE}-settings-375`).catch(() => {});
            console.log(`[k14 ${app.name}] settings-375`, JSON.stringify({zero: f.zeroWidthControls, n: f.fields && f.fields.length, form: f.form, doc: f.docScrollWidth, typed: o.reads['forms-settings-375'].typed}));
        }, 'rvaca').catch((e) => { o.reads['forms-settings-375'] = {error: flat(e.message)}; });
        if (FORMS.includes('details')) await window({width: 1280, height: 900}, async (page) => {
            const {beginSubmission} = require('../wizard-refused-save-hangs-saving/lib.js');
            const {SubmissionWizardPage} = require(`${process.env.PKP_SUITE_DIR}/pages/SubmissionWizardPage${app.name === 'ojs' ? '' : 's'}.js`);
            o.submissionId = await beginSubmission(page, app, {title: 'Phone details step', section: 'Articles'});
            await new SubmissionWizardPage(page, app.contextPath).continueTo('Details');
            await idle(page);
            await page.locator('#app-main .pkpForm iframe.tox-edit-area__iframe').first().waitFor({state: 'attached', timeout: 30_000}).catch(() => {});
            await idle(page);
            // The wizard reopens on its first step after a reload, so the window is narrowed with the step open.
            await page.setViewportSize(PHONE);
            await page.waitForTimeout(800);
            const cur = await page.locator('.pkpSteps__step__label--current').innerText().catch(() => null);
            const f = await L.readFields(page);
            o.reads['forms-details-375'] = {step: flat(cur), fields: f, typed: await L.tryControls(page, 'k14', '#app-main')};
            const s = await screen(page);
            s.fields = f;
            record(`${MODE}-details-375`, s);
            await shot(page, `${MODE}-details-375`).catch(() => {});
            console.log(`[k14 ${app.name}] details-375`, JSON.stringify({step: flat(cur), zero: f.zeroWidthControls, n: f.fields && f.fields.length, form: f.form, doc: f.docScrollWidth, typed: o.reads['forms-details-375'].typed}));
        }).catch((e) => { o.reads['forms-details-375'] = {error: flat(e.message)}; console.log(`[k14 ${app.name}] details error`, flat(e.message)); });
    } else if (MODE === 'display') {
        // A read-only form (the discussion window, a display-only form of the same component) holding a long
        // unbroken address, at 1280: does anything run past the window's edge? The discussion is added on screen by
        // dbarnes on submission 2's review stage.
        const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
        const name = 'k14 long address';
        const url = 'https://doi.org/10.1234/' + 'abcdefghij'.repeat(16);
        await (async () => {
            const {page, close} = await launch(app);
            try {
                await page.setViewportSize({width: 1280, height: 900});
                await signIn(page, 'dbarnes', {contextPath: app.contextPath});
                const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: 'Review Tasks & Discussions'});
                await panel.gotoEditorial(2, 'workflow_3_2');
                await idle(page);
                if (process.env.ADD !== '0') {
                    const win = await panel.openAdd();
                    await win.nameField().fill(name);
                    await win.tick('dbuskins');
                    await win.typeMessage(`See ${url}`);
                    const answer = await win.saveAndAnswer();
                    o.addStatus = answer.status();
                    await win.root.waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
                    await idle(page);
                }
                const view = await panel.openItem(name);
                await idle(page);
                await page.waitForTimeout(800);
                const f = await L.readFields(page, '[role="dialog"]');
                o.reads['display-1280'] = {fields: f};
                const sc = await screen(page);
                sc.fields = f;
                record(`${MODE}-1280`, sc);
                await shot(page, `${MODE}-1280`).catch(() => {});
                console.log(`[k14 ${app.name}] display-1280`, JSON.stringify({add: o.addStatus, scope: f.scope, form: f.form, groups: f.groups, overflow: f.overflow, doc: f.docScrollWidth}));
            } finally {
                await close();
            }
        })();
    }
    record('k14', o, {merge: true});
});
