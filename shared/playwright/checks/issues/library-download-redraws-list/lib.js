// Helpers of the U39 A9 + A12 walk (a library file's name pressed, then the list used within the
// two seconds the download link waits): library-download-redraws-list/walk.js. Requiring this
// file runs nothing. Each helper records what it saw rather than throwing, so a fix trial reads
// the state the fix brings.
const fs = require('fs');
const {idle, outFile} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The Publisher Library's name per app: the Settings › Workflow tab's label and the list's heading. */
const LIBRARY_TAB = {ojs: 'Publisher Library', omp: 'Press Library', ops: 'Preprint Server Library'};

/**
 * Watch the page: every uncaught page error, every console error, every request for the whole
 * list (`fetch-grid`), every `enable-link-action` answer and every download, each with its time
 * in ms since `w.t0` (set by `mark()`) and the step it came in.
 */
function watch(page) {
    const w = {t0: Date.now(), step: null, errors: [], grids: [], enables: [], downloads: []};
    const at = () => Date.now() - w.t0;
    w.mark = (step) => { w.step = step; w.t0 = Date.now(); };
    page.on('pageerror', (e) => w.errors.push({step: w.step, ms: at(), kind: 'pageerror', message: flat(e.message)}));
    page.on('console', (m) => { if (m.type() === 'error') w.errors.push({step: w.step, ms: at(), kind: 'console', message: flat(m.text())}); });
    page.on('request', (r) => { if (/fetch-grid/.test(r.url())) w.grids.push({step: w.step, ms: at(), url: r.url().replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '')}); });
    page.on('response', (r) => {
        if (/enable-link-action/.test(r.url())) {
            const e = {step: w.step, ms: at(), status: r.status()};
            w.enables.push(e);
            r.text().then((t) => { e.body = flat(t, 200); }, () => {});
        }
    });
    page.on('download', (d) => w.downloads.push({step: w.step, ms: at(), name: d.suggestedFilename()}));
    w.since = (step) => ({
        errors: w.errors.filter((e) => e.step === step),
        listRequests: w.grids.filter((e) => e.step === step).map((e) => `${e.ms} ms ${e.url}`),
        enableLinkAnswers: w.enables.filter((e) => e.step === step),
        downloads: w.downloads.filter((e) => e.step === step).map((e) => `${e.ms} ms ${e.name}`),
    });
    return w;
}

/** Settings › Workflow and the app's library tab; returns the tab's list (`LibraryList`). */
async function openPublisherLibrary(page, app) {
    const {PublisherLibraryTab} = require('../../../pages/LibraryPages.js');
    const tab = new PublisherLibraryTab(page, app.contextPath, LIBRARY_TAB[app.name]);
    await tab.goto();
    await idle(page);
    return tab.list();
}

/** "Add a file": "Name", "Type", a small text file uploaded, "OK"; the window closes. */
async function addFile(list, name, type) {
    const file = outFile(`${name.replace(/\W+/g, '-')}.txt`);
    fs.writeFileSync(file, `${name}\n`);
    const win = await list.openAdd();
    await win.add({name, type, file});
}

/** The row's strip and arrow as they stand: whether "Edit" shows and the arrow reads open. */
async function stripRead(list, name) {
    const strip = list.strip(name);
    return {
        editShown: await strip.getByRole('link', {name: 'Edit', exact: true}).isVisible().catch(() => null),
        arrow: await list.arrow(name).first().getAttribute('class').then((c) => (/hide_extras/.test(c || '') ? 'open (hide_extras)' : 'closed (show_extras)'), () => null),
    };
}

/** The name link as it stands: its `disabled` attribute and whether its address is the download's or "#". */
async function linkRead(list, name) {
    const link = list.nameLink(name).first();
    return {
        disabled: await link.getAttribute('disabled').then((v) => v != null, () => null),
        href: await link.getAttribute('href').then((h) => (h === '#' ? '#' : h ? 'the download address' : h), () => null),
    };
}

/** Let the list settle: no request left and nothing pending from the last press. */
async function settle(page, ms = 3_000) {
    await sleep(ms);
    await idle(page);
}

module.exports = {sleep, flat, LIBRARY_TAB, watch, openPublisherLibrary, addFile, stripRead, linkRead, settle};
