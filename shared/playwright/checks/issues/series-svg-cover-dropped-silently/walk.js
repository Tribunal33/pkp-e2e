// Issue report docs/issues/U17-OMP3-series-svg-cover-dropped-silently.md (U17 OMP3): a series' "Cover Image"
// picker offers SVG files, and "Save" with an SVG keeps nothing and says nothing. Takes the report's Steps on
// PKP's default test dataset (a dataset fleet), OMP only (no other app has a series cover), as `rvaca`:
//   1    sign in as rvaca
//   2    Settings › Press › "Series"
//   3    "Library & Information Studies": the row's arrow, "Edit"
//   4    "Cover Image", "Upload File": record what the picker offers, choose u17f-cover.svg
//   5    "Save": the answer, whether the window stays open, messages in the window and at the top right
//   6    "Cancel", "Edit" again: is there a "Current Image"?
//   c1-c3  control: the same with u17f-cover.png ("Save" closes the window; the reopened series shows it)
// WALK=neighbour runs alone (fix in and out): "Psychology" with u17f-ok.png saves and shows its cover, and
// "History" with u17f-text.png (a text file named .png, which the picker lets through) is refused by "Save".
// WALK=edits runs alone: "Education" gets a PNG cover, then its title is changed and an SVG chosen in one
// "Save"; after "Cancel" the list and the reopened window show whether the title and the old cover stayed.
//
// Reset first:  npm run fleet-prep -- --feature issues-u17f --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-u17f PROBE_AGENT=u17f node bin/probe.js omp shared/playwright/checks/issues/series-svg-cover-dropped-silently/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u17f-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u17f-3_5 PROBE_AGENT=u17f node bin/probe.js omp shared/playwright/checks/issues/series-svg-cover-dropped-silently/walk.js
const fs = require('fs');
const {forEachApp, launch, signIn, screen, record, idle, outFile, serverLog} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const T = 30_000;
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#36c"/></svg>\n';
// A 2×3 red PNG.
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAAA2iEnWAAAAEElEQVR4nGP4z8AARAwoFABE0AX7pM/egAAAAABJRU5ErkJggg==',
    'base64'
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const file = (n, body) => {
        const p = outFile(n);
        fs.writeFileSync(p, body);
        return p;
    };
    const files = {
        svg: file('u17f-cover.svg', SVG),
        png: file('u17f-cover.png', PNG),
        ok: file('u17f-ok.png', PNG),
        text: file('u17f-text.png', 'not an image\n'),
    };
    const log = serverLog(app);

    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page).catch(() => null);
    };
    const tidy = (t) => String(t || '').replace(/\s+/g, ' ').trim();
    const noticeSel = '.app__notifications .pkpNotification';
    const markNotices = () =>
        page.evaluate((sel) => document.querySelectorAll(sel).forEach((n) => n.setAttribute('data-u17f-seen', '1')), noticeSel);
    const freshNotices = async (ms) => {
        const fresh = page.locator(`${noticeSel}:not([data-u17f-seen])`);
        await fresh.first().waitFor({state: 'visible', timeout: ms}).catch(() => null);
        return (await fresh.allInnerTexts()).map(tidy);
    };
    // The series window after a save: open or not, its messages, and whether it shows a current cover.
    const windowState = () =>
        page.evaluate(() => {
            const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            const form = document.querySelector('form#seriesForm');
            if (!form || !visible(form)) return {windowOpen: false};
            const under = [...form.querySelectorAll('label.error')].filter(visible).map((l) => ({for: l.getAttribute('for'), text: l.textContent.trim()}));
            const inForm = [...form.querySelectorAll('#formErrors li, .notifyFormError, .pkp_form_error')]
                .filter(visible)
                .map((e) => e.textContent.replace(/\s+/g, ' ').trim());
            const img = form.querySelector('#coverImagePreview img');
            return {windowOpen: true, under, inForm, currentImage: img ? {alt: img.getAttribute('alt'), shown: visible(img)} : null};
        });

    const series = new SectionsTab(page, app.contextPath, {tab: 'Series', addLabel: 'Add Series', formId: 'seriesForm'});
    let win = null;
    const openEdit = async (title) => {
        await series.goto();
        win = await series.openEdit(title);
        await idle(page);
        return {heading: tidy(await win.heading().innerText().catch(() => '')), ...(await windowState())};
    };
    // "Upload File" under "Cover Image": what the picker offers, then choose the file; the box's text after.
    const upload = async (path) => {
        const box = win.form().locator('#coverImage .pkp_controller_fileUpload, #plupload').first();
        // The visible "Upload File" button lies under plupload's transparent file input; a press lands on that input.
        const button = win.form().locator('.pkp_uploader_button').first();
        const input = win.form().locator('input[type=file]').first();
        const buttonText = tidy(await button.innerText().catch(() => ''));
        const chooserP = page.waitForEvent('filechooser', {timeout: 15_000});
        await button.click({timeout: 3_000}).catch(() => input.click({force: true}));
        const chooser = await chooserP;
        const accept = await chooser.element().getAttribute('accept');
        const uploaded = page
            .waitForResponse((r) => r.request().method() === 'POST' && /upload-image/.test(r.url()), {timeout: 15_000})
            .then(async (r) => ({status: r.status(), body: (await r.text()).slice(0, 300)}))
            .catch(() => null);
        await chooser.setFiles(path);
        const answer = await uploaded;
        await sleep(1000);
        await idle(page).catch(() => null);
        return {
            buttonText,
            pickerAccepts: accept,
            uploadAnswer: answer,
            box: tidy(await box.innerText().catch(() => '')),
            temporaryFileId: await win.form().locator('input[name="temporaryFileId"]').inputValue().catch(() => null),
        };
    };
    const save = async () => {
        await markNotices();
        const from = log.mark();
        const answered = page.waitForResponse((r) => r.request().method() === 'POST' && /update-series/.test(r.url()), {timeout: T});
        await win.saveButton().click();
        const response = await answered;
        const body = (await response.text().catch(() => '')).slice(0, 300);
        await idle(page);
        const notices = await freshNotices(8_000);
        await sleep(1500);
        return {status: response.status(), body, ...(await windowState()), notices, serverLog: log.since(from)};
    };
    const cancel = async () => {
        if (await win.form().isVisible().catch(() => false)) {
            await win.cancelLink().click().catch(() => null);
            await win.form().waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
        }
        return 'closed';
    };

    try {
        await step('1 sign in as rvaca', () => signIn(page, 'rvaca'));
        if (MODE === 'walk') {
            await step('2-3 Series, "Library & Information Studies", Edit', () => openEdit('Library & Information Studies'));
            record(name('3-window'), await screen(page));
            await step('4 Upload File, choose u17f-cover.svg', () => upload(files.svg));
            record(name('4-uploaded'), await screen(page));
            await step('5 Save', save);
            record(name('5-saved'), await screen(page));
            await step('6 Cancel', cancel);
            await step('6 Edit again', () => openEdit('Library & Information Studies'));
            record(name('6-reopened'), await screen(page));
            await step('6a Cancel', cancel);

            await step('c1 control: Edit "Library & Information Studies"', () => openEdit('Library & Information Studies'));
            await step('c2 Upload File, choose u17f-cover.png', () => upload(files.png));
            await step('c2 Save', save);
            record(name('c2-saved'), await screen(page));
            await step('c2a Cancel if open', cancel);
            await step('c3 Edit again', () => openEdit('Library & Information Studies'));
            record(name('c3-reopened'), await screen(page));
            await step('c3a Cancel', cancel);
        } else if (MODE === 'edits') {
            // What else an SVG "Save" refuses: a title changed in the same save, and a cover the series already has.
            await step('e1 Edit "Education"', () => openEdit('Education'));
            await step('e2 Upload File, choose u17f-cover.png', () => upload(files.png));
            await step('e2 Save', save);
            await step('e2a Cancel if open', cancel);
            await step('e3 Edit "Education" again', () => openEdit('Education'));
            await step('e4 Title "Education u17f"', async () => {
                await win.type('title[en]', 'Education u17f');
                return 'typed';
            });
            await step('e5 Upload File, choose u17f-cover.svg', () => upload(files.svg));
            await step('e6 Save', save);
            record(name('e6-saved'), await screen(page));
            await step('e7 Cancel', cancel);
            await step('e8 Series rows', async () => (await series.titleCells().allInnerTexts()).map(tidy));
            await step('e9 Edit "Education" again', async () => {
                const out = await openEdit('Education');
                return {...out, title: await win.box('title[en]').inputValue()};
            });
            record(name('e9-reopened'), await screen(page));
            await step('e9a Cancel', cancel);
        } else {
            await step('n1 Edit "Psychology"', () => openEdit('Psychology'));
            await step('n2 Upload File, choose u17f-ok.png', () => upload(files.ok));
            await step('n2 Save', save);
            await step('n2a Cancel if open', cancel);
            await step('n3 Edit "Psychology" again', () => openEdit('Psychology'));
            record(name('n3-reopened'), await screen(page));
            await step('n3a Cancel', cancel);
            await step('n4 Edit "History"', () => openEdit('History'));
            await step('n5 Upload File, choose u17f-text.png', () => upload(files.text));
            await step('n5 Save', save);
            record(name('n5-saved'), await screen(page));
            await step('n5a Cancel if open', cancel);
            await step('n6 Edit "History" again', () => openEdit('History'));
            await step('n6a Cancel', cancel);
        }
    } finally {
        record(name(MODE === 'walk' ? 'facts' : `${MODE}-facts`), facts);
        await close();
    }
});
