// PR review check — pkp/pkp-lib#13188, ui-library#999 + ojs#5880 (stable-3_5_0 only): "closing the toast
// notifications also closes the current open panels". Drives the 3.5 line's fleet (or `main`'s without
// PKP_E2E_LINE, for the forward-port question):
//
//   PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=pr13188 PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/sync/ui-library-999/toast-modal.js
//   LEGS=wf,nested,…   runs only the named legs
//
// Every toast is clicked with the mouse at the spot a user aims at (page.mouse, so whatever is on top
// takes the click, never a forced dispatch), and read 0.8 s later, inside the toast's 5 s life:
//   wf         the workflow side modal alone; a toast (eventBus `notify`), its text clicked, then its ×
//   nested     the workflow plus a legacy side modal over it (Participants › Assign); the toast's ×
//   after-nested  the workflow after a legacy side modal over it was opened and cancelled; the toast's ×
//   dialog     the workflow plus a Dialog over it (the modal store's openDialog); the toast's ×
//   bare       a Dialog on the dashboard, no side modal; the toast's ×
//   reviewer   the issue's path (OJS, OMP): Add Reviewer on review round 1, the "added" toast's ×
//   component  the code review's path: Settings › Workflow › Components › Add a Component, key `-survey`,
//              Save; the error toast's ×
//   outside    controls: a click on the overlay beside the workflow, and on a Dialog's overlay, still closes it
//   tinymce    the Assign Participant window's message editor: its link dialog typed into and cancelled; the
//              windows under it stay open (the #11693 selectors the PR moved into a list)
//   page       no modal: a toast's × (control), and what the empty toast area lets through to the header
// No assertions: facts per leg (open dialogs, toasts, what the pointer hits) go to result-<app>.json.
const {forEachApp, launch, signIn, record, shot, idle, tag, outFile} = require('../../../probe');
const fs = require('fs');

const ONLY = (process.env.LEGS || '').split(',').map((s) => s.trim()).filter(Boolean);
const want = (leg) => !ONLY.length || ONLY.includes(leg);
const fold = (s) => (s || '').replace(/\s+/g, ' ').trim();

// Open dialogs (side modals and Dialogs), each by its title.
const dialogs = (page) =>
    page.evaluate(() =>
        [...document.querySelectorAll('[role="dialog"]')]
            .filter((d) => d.getClientRects().length)
            .map((d) => {
                const id = d.getAttribute('aria-labelledby');
                const h = (id && document.getElementById(id)) || d.querySelector('h1, h2, h3');
                return (h ? h.innerText : d.innerText).replace(/\s+/g, ' ').trim().slice(0, 80);
            }),
    );

// The toast area as the pointer meets it.
const toasts = (page) =>
    page.evaluate(() => {
        const c = document.querySelector('.app__notifications');
        const r = c && c.getBoundingClientRect();
        const hit = (el, x, y) => {
            const at = document.elementFromPoint(x, y);
            if (!at) return null;
            if (at.closest('.pkpNotification__closeButton')) return 'close button';
            if (at.closest('.pkpNotification')) return 'toast';
            return `${at.tagName.toLowerCase()}${at.className && typeof at.className === 'string' ? '.' + at.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`;
        };
        const list = [...document.querySelectorAll('.app__notifications .pkpNotification')].map((t) => {
            const b = t.getBoundingClientRect();
            const x = t.querySelector('.pkpNotification__closeButton')?.getBoundingClientRect();
            const body = {x: b.x + 16, y: b.y + b.height / 2};
            const close = x && {x: x.x + x.width / 2, y: x.y + x.height / 2};
            return {
                text: t.innerText.replace(/×|Close/g, '').replace(/\s+/g, ' ').trim().slice(0, 160),
                body,
                close,
                bodyHits: hit(t, body.x, body.y),
                closeHits: close && hit(t, close.x, close.y),
            };
        });
        return {
            area: r && {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
            areaPointerEvents: c && getComputedStyle(c).pointerEvents,
            bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
            list,
        };
    });

const notify = (page, text, type = 'success') => page.evaluate(([m, t]) => pkp.eventBus.$emit('notify', m, t), [text, type]);

const openDialog = (page, title) =>
    page.evaluate((t) => {
        const app = document.querySelector('#app').__vue_app__;
        const store = app.config.globalProperties.$pinia._s.get('modal');
        store.openDialog({
            name: 'probeDialog',
            title: t,
            message: 'A dialog opened by the probe.',
            actions: [{label: 'OK', callback: (close) => close()}],
        });
    }, title);

forEachApp(async (app) => {
    const T = tag('toast');
    const isOPS = app.name === 'ops';
    const U = {mgr: `${T}mgr`, au: `${T}au`, rv: `${T}rv`, rv2: `${T}rv2`};
    await app.api.createContext({
        tag: T,
        users: [
            {username: U.mgr, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
            {username: U.au, roles: ['author'], givenName: 'Ann', familyName: 'Author'},
            ...(isOPS ? [] : [
                {username: U.rv, roles: ['externalReviewer'], givenName: 'Rex', familyName: 'Reviewer'},
                {username: U.rv2, roles: ['externalReviewer'], givenName: 'Rita', familyName: 'Spare'},
            ]),
        ],
    });
    const sub = await app.api.createSubmission({
        tag: T, context: T, submitter: U.au, title: `Toast ${T}`,
        ...(isOPS ? {} : {files: [{file: 'article.pdf'}], decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: U.rv, status: 'invited'}]}]}),
    });
    const sid = sub.submissionId;
    const R = {app: app.name, line: app.line || 'main', context: T, submission: sid, legs: {}};
    const {page, close} = await launch(app);
    const workflow = app.url(`/index.php/${T}/dashboard/editorial?workflowSubmissionId=${sid}`);
    const openWorkflow = async () => {
        await page.goto(workflow);
        await idle(page);
        await page.getByRole('dialog').first().waitFor();
        await idle(page);
    };
    const waitToast = (text) => page.locator('.app__notifications .pkpNotification').filter({hasText: text}).first().waitFor({timeout: 10_000});
    /** Click a toast where a user aims (`close` or `body`) and read what is left 0.8 s later. */
    const clickToast = async (f, label, text, where = 'close') => {
        await waitToast(text);
        const before = await toasts(page);
        const t = before.list.find((x) => x.text.includes(text)) || before.list[0];
        const at = t[where];
        f[`${label}.before`] = {dialogs: await dialogs(page), toastArea: before.area, areaPointerEvents: before.areaPointerEvents, bodyPointerEvents: before.bodyPointerEvents, toast: t.text, pointerHits: where === 'close' ? t.closeHits : t.bodyHits};
        await page.mouse.click(at.x, at.y);
        await page.waitForTimeout(800);
        const after = await toasts(page);
        f[`${label}.after`] = {dialogs: await dialogs(page), toastStillShown: after.list.some((x) => x.text.includes(text)), url: page.url().replace(/^.*index.php/, '')};
        await shot(page, `${label}-${app.name}`);
    };
    const leg = async (name, fn) => {
        if (!want(name)) return;
        const f = {};
        try {
            await fn(f);
        } catch (e) {
            f.error = fold(e.message).slice(0, 400);
            await shot(page, `${name}-error-${app.name}`).catch(() => {});
        }
        R.legs[name] = f;
        console.log(`${app.name} ${name}: ${JSON.stringify(f)}`);
    };

    try {
        await signIn(page, U.mgr, {contextPath: T});

        await leg('wf', async (f) => {
            await openWorkflow();
            await notify(page, 'Probe toast one');
            await clickToast(f, 'wf-body', 'Probe toast one', 'body');
            if ((await dialogs(page)).length === 0) await openWorkflow();
            await notify(page, 'Probe toast two');
            await clickToast(f, 'wf-close', 'Probe toast two');
        });

        await leg('nested', async (f) => {
            await openWorkflow();
            const before = (await dialogs(page)).length;
            await page.getByRole('button', {name: 'Assign', exact: true}).first().click();
            await page.waitForFunction((n) => [...document.querySelectorAll('[role="dialog"]')].filter((d) => d.getClientRects().length).length > n, before, {timeout: 15_000});
            await idle(page);
            await notify(page, 'Probe toast nested');
            await clickToast(f, 'nested-close', 'Probe toast nested');
        });

        await leg('after-nested', async (f) => {
            await openWorkflow();
            await page.getByRole('button', {name: 'Assign', exact: true}).first().click();
            await page.getByRole('heading', {name: 'Assign Participant'}).waitFor({timeout: 15_000});
            await idle(page);
            f.nestedOpen = await dialogs(page);
            // The legacy form asks "The data on this form has changed…" on close; answer it yes.
            await page.evaluate(() => (window.confirm = () => true));
            await page.getByRole('button', {name: /close/i}).filter({visible: true}).last().click();
            await page.getByRole('heading', {name: 'Assign Participant'}).waitFor({state: 'hidden', timeout: 15_000});
            await idle(page);
            f.afterCancel = await dialogs(page);
            await notify(page, 'Probe toast after nested');
            await clickToast(f, 'after-nested-close', 'Probe toast after nested');
        });

        await leg('dialog', async (f) => {
            await openWorkflow();
            await openDialog(page, 'Probe dialog over workflow');
            await page.getByRole('dialog').filter({hasText: 'Probe dialog over workflow'}).waitFor();
            await notify(page, 'Probe toast dialog');
            await clickToast(f, 'dialog-close', 'Probe toast dialog');
        });

        await leg('bare', async (f) => {
            await page.goto(app.url(`/index.php/${T}/dashboard/editorial`));
            await idle(page);
            await openDialog(page, 'Probe dialog alone');
            await page.getByRole('dialog').filter({hasText: 'Probe dialog alone'}).waitFor();
            await notify(page, 'Probe toast bare');
            await clickToast(f, 'bare-close', 'Probe toast bare');
        });

        if (!isOPS) await leg('reviewer', async (f) => {
            await openWorkflow();
            await page.getByRole('button', {name: 'Add Reviewer'}).first().click();
            await idle(page);
            await page.getByText('Rita Spare').first().waitFor({timeout: 20_000});
            await shot(page, `reviewer-pick-${app.name}`);
            await page.getByRole('button', {name: /Select Rita Spare|Select Reviewer/}).first().click();
            await idle(page);
            await shot(page, `reviewer-form-${app.name}`);
            await page.locator('button[type="submit"], button').filter({hasText: /^\s*Add Reviewer\s*$/}).last().click();
            await page.locator('.app__notifications .pkpNotification').first().waitFor({timeout: 20_000});
            const text = (await toasts(page)).list[0].text;
            f.toastText = text;
            await clickToast(f, 'reviewer-close', text.slice(0, 20));
        });

        await leg('component', async (f) => {
            await page.goto(app.url(`/index.php/${T}/management/settings/workflow`));
            await idle(page);
            await page.getByRole('tab', {name: 'Components'}).or(page.getByRole('link', {name: 'Components'})).first().click();
            await idle(page);
            await page.getByRole('button', {name: /Add a Component/}).or(page.getByRole('link', {name: /Add a Component/})).first().click();
            await idle(page);
            const d = page.getByRole('dialog').last();
            await d.getByLabel(/^Name/).first().fill('Probe component');
            await d.getByLabel(/^Key/).first().fill('-survey');
            await shot(page, `component-form-${app.name}`);
            await d.getByRole('button', {name: 'Save'}).last().click();
            await page.locator('.app__notifications .pkpNotification').first().waitFor({timeout: 15_000});
            const text = (await toasts(page)).list[0].text;
            f.toastText = text;
            await clickToast(f, 'component-close', text.slice(0, 20));
        });

        await leg('outside', async (f) => {
            await openWorkflow();
            f.workflowBefore = await dialogs(page);
            await page.mouse.click(30, 450);
            await page.waitForTimeout(800);
            f.workflowAfterOverlayClick = await dialogs(page);
            await page.goto(app.url(`/index.php/${T}/dashboard/editorial`));
            await idle(page);
            await openDialog(page, 'Probe dialog overlay');
            await page.getByRole('dialog').filter({hasText: 'Probe dialog overlay'}).waitFor();
            await page.mouse.click(30, 450);
            await page.waitForTimeout(800);
            f.dialogAfterOverlayClick = await dialogs(page);
        });

        await leg('tinymce', async (f) => {
            await openWorkflow();
            await page.getByRole('button', {name: 'Assign', exact: true}).first().click();
            await page.getByRole('heading', {name: 'Assign Participant'}).waitFor({timeout: 15_000});
            await idle(page);
            await page.locator('.tox-tinymce').last().waitFor({timeout: 15_000});
            await page.locator('.tox-tinymce').last().getByRole('button', {name: /Insert\/edit link|Link/}).first().click();
            const tox = page.locator('.tox-dialog');
            await tox.waitFor({timeout: 10_000});
            f.toxDialog = fold(await tox.locator('.tox-dialog__title').innerText().catch(() => ''));
            await tox.getByRole('textbox').first().click();
            await page.keyboard.type('https://example.org');
            f.typed = await tox.getByRole('textbox').first().inputValue();
            f.dialogsWithTox = await dialogs(page);
            await tox.getByRole('button', {name: 'Cancel'}).click();
            await page.waitForTimeout(800);
            f.dialogsAfterTox = await dialogs(page);
            await shot(page, `tinymce-${app.name}`);
        });

        await leg('page', async (f) => {
            await page.goto(app.url(`/index.php/${T}/dashboard/editorial`));
            await idle(page);
            const empty = await toasts(page);
            f.emptyArea = empty.area;
            f.emptyAreaPointerEvents = empty.areaPointerEvents;
            await notify(page, 'Probe toast page');
            await clickToast(f, 'page-close', 'Probe toast page');
            // What sits under the toast area's top edge, once it is empty again: does the area take clicks?
            await page.waitForFunction(() => !document.querySelector('.app__notifications .pkpNotification'), null, {timeout: 10_000});
            f.underEmptyArea = await page.evaluate(() => {
                const r = document.querySelector('.app__notifications').getBoundingClientRect();
                const pts = [[r.x + 10, r.y + 2], [r.x + r.width / 2, r.y + 2], [r.x + r.width - 10, r.y + 2]];
                return {rect: [r.x, r.y, r.width, r.height].map(Math.round), hits: pts.map(([x, y]) => {
                    const el = document.elementFromPoint(x, y);
                    return el && (el.closest('.app__notifications') ? 'toast area' : el.tagName.toLowerCase());
                })};
            });
        });
    } finally {
        fs.writeFileSync(outFile(`result-${app.name}.json`), JSON.stringify(R, null, 2));
        await close();
    }
});
