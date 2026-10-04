// Helpers of walk.js (U42 A7: a DOI written in a reference typed in the submission wizard is not
// kept when "References Metadata Lookup" is off; issue report
// docs/issues/U42-A7-wizard-reference-doi-not-kept.md). Requiring this file runs nothing.
// The screen helpers reuse the U20 A6 wizard helpers and the U42 A12 References helpers.
const path = require('path');
const {execFileSync} = require('child_process');
const {idle, sql} = require('../../../probe');
const W = require('../author-tags-given-name-alone-other-language/lib.js');
const R = require('../arxiv-id-loses-version/lib.js');
const {currentStep, pressContinue, typeRich} = require('../wizard-refused-save-hangs-saving/lib.js');

const T = 30_000;
const {sleep, flat} = W;
const REPO = path.resolve(__dirname, '../../../../..');

/**
 * From "Make a Submission" to "Submission complete" as the dataset's author: English, `title`, a
 * file, an abstract, and `refs` typed into the "Details" step's "References" box. Returns the id,
 * the steps seen and what the "Review" step listed under "References".
 */
async function submitWithReferences(page, app, {title, refs}) {
    const w = W.WORDS[app.name];
    const ojs = app.name === 'ojs';
    const {id} = await W.beginInLanguage(page, app, {title, section: w.section, language: 'English'});
    const Wz = ojs ? null : require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const O = ojs ? new (require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js')).SubmissionWizardPage)(page, app.contextPath) : null;
    const out = {id, steps: []};
    const done = new Set();
    for (let i = 0; i < 10; i++) {
        const step = (await currentStep(page)).replace(/^\d+\s*/, '');
        if (/(^|\s)Review$/.test(step)) break;
        if (!done.has(step)) {
            done.add(step);
            out.steps.push(step);
            if (step === 'Upload Files') {
                if (ojs) await O.uploadFile();
                else if (app.name === 'omp') await Wz.uploadWizardFile(page, 'u42r8-manuscript.txt');
                else await Wz.addGalleyFile(page, {label: 'PDF'});
            } else if (step === 'Details') {
                const abstract = 'titleAbstract-abstract-control-en';
                if (await page.locator(`#${abstract}_ifr`).count()) await typeRich(page, abstract, 'u42r8 abstract.');
                const box = page.getByRole('textbox', {name: /^References/}).first();
                out.referencesBox = await box.isVisible().catch(() => false);
                if (out.referencesBox) await box.fill(refs);
            } else if (step === 'For Readers' && app.name === 'ops') {
                await Wz.setRelationStatus(page);
            }
        }
        await pressContinue(page);
        await idle(page);
        await sleep(500);
    }
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    const panel = page.locator('.submissionWizard__reviewPanel').filter({hasText: 'References'}).first();
    out.reviewReferences = flat(await panel.innerText({timeout: 3000}).catch(() => null), 600);
    await W.submit(page, app);
    out.complete = true;
    return out;
}

/** Settings › Workflow › "Metadata": set "Enable references structuring and metadata lookup", "Save". */
async function setLookup(page, app, on) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
    await idle(page);
    const tab = page.locator('#metadata-button');
    if (await tab.count()) { await tab.first().click(); await idle(page); }
    const box = page.getByRole('checkbox', {name: 'Enable references structuring and metadata lookup', exact: true});
    await box.waitFor({state: 'visible', timeout: T});
    const out = {before: await box.isChecked()};
    if (on) await box.check(); else await box.uncheck();
    const form = page.locator('form').filter({has: box});
    const saved = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    out.save = r ? r.status() : null;
    await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
    out.after = await box.isChecked();
    return out;
}

/**
 * The publication reads the References page itself requests (its list comes from the
 * publication's `citations`), read as the browser receives them: per call, each reference's
 * text and `doi`. Attach before opening the page.
 */
function watchCitationLists(page) {
    const seen = [];
    page.on('response', async (r) => {
        const u = r.url().split('?')[0];
        if (r.request().method() !== 'GET' || !/\/publications\/\d+(\/citations)?$/.test(u)) return;
        try {
            const b = await r.json();
            const items = Array.isArray(b) ? b : (b.citations || b.items || []);
            if (!items.length) return;
            seen.push({url: u.replace(/^https?:\/\/[^/]+/, ''), status: r.status(), items: items.map((c) => ({rawCitation: flat(c.rawCitation, 80), doi: c.doi ?? null}))});
        } catch (e) {
            seen.push({status: r.status(), error: flat(e.message, 120)});
        }
    });
    return seen;
}

/** Open submission `id`'s Publication (Preprint) › "References" as the signed-in editor. */
async function openReferences(page, app, id) {
    await R.gotoWorkflow(page, app, id);
    return R.openEntry(page, 'References');
}

/**
 * Each reference row: its text, the doi.org links it shows, and the "DOI" box of its "Edit"
 * window (null when the window has no such box). `texts` picks the rows by their start.
 */
async function readRows(page, texts) {
    const out = {};
    for (const t of texts) {
        const row = R.refRow(page, t);
        const visible = await row.isVisible().catch(() => false);
        const r = {visible};
        if (visible) {
            r.text = flat(await row.innerText().catch(() => null), 300);
            r.doiLinks = await row.locator('a[href*="doi.org"]').evaluateAll((els) => els.map((e) => ({text: e.textContent.trim(), href: e.getAttribute('href')})));
            try {
                await R.openEditCitation(page, t);
                const doiBox = R.editPanel(page).getByRole('textbox', {name: /^DOI\b/}).first();
                r.editDoiBox = (await doiBox.count()) ? await doiBox.inputValue() : null;
            } catch (e) {
                r.editError = flat(e.message, 200);
            }
            await R.closeEditCitation(page);
        }
        out[t] = r;
    }
    return out;
}

/** Evidence beside the screens, never a step: each stored reference of `id` and its stored DOI. */
function storedReferences(app, id) {
    if (!Number(id)) return null;
    const rows = sql(app, `select c.seq, c.raw_citation, coalesce(s.setting_value, '(no doi)')
        from citations c join publications p on p.publication_id = c.publication_id
        left join citation_settings s on s.citation_id = c.citation_id and s.setting_name = 'doi'
        where p.submission_id = ${Number(id)} order by c.seq`);
    return rows ? rows.split('\n') : [];
}

/**
 * Evidence beside the screens, never a step, OJS only: the <citation_list> the Crossref export
 * builds for `id` (citationlist.php beside this file).
 */
function crossrefCitationList(app, id) {
    try {
        return execFileSync('php', [path.join(__dirname, 'citationlist.php'), String(id)], {
            cwd: path.resolve(REPO, app.root),
            env: {...process.env, PKP_CONFIG_FILE: path.resolve(REPO, app.configFile)},
            encoding: 'utf8', timeout: 120_000,
        }).trim();
    } catch (e) {
        return {error: flat(`${e.message} ${e.stdout || ''}`, 600)};
    }
}

module.exports = {T, sleep, flat, submitWithReferences, setLookup, watchCitationLists, openReferences, readRows, storedReferences, crossrefCitationList, addReference: R.addReference, snap: W.snap, WORDS: W.WORDS};
