// Helpers of walk.js (issue report docs/issues/U21-A5-copyright-agreed-log-raw-placeholder.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const path = require('path');
const {idle, sql} = require('../../../probe');
const A8 = require('../section-editors-not-assigned-second-journal/lib.js');
const {currentStep, pressContinue} = require('../wizard-refused-save-hangs-saving/lib.js');

const {T, sleep, flat, L} = A8;

/** Per-app dataset facts the steps use. */
const WORDS = {
    ojs: {author: 'ccorino', authorName: 'Carlo Corino', section: 'Articles', series: null},
    omp: {author: 'aclark', authorName: 'Arthur Clark', section: null, series: 'Library & Information Studies'},
    ops: {author: 'ccorino', authorName: 'Carlo Corino', section: 'Preprints', series: null},
};

/** As the signed-in manager: Settings › Workflow › "Submission" › "Author Guidance", type the "Copyright Notice", "Save". */
async function setCopyrightNotice(page, app, text) {
    const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
    const p = new WorkflowSubmissionSettings(page, app.contextPath, {locale: L(app).replace('/', '')});
    await p.goto('Author Guidance');
    await p.guidance.type('Copyright Notice', text);
    await p.guidance.pressSave();
    await p.guidance.savedStatus.waitFor({timeout: T});
    await idle(page);
    return p.guidance.text('Copyright Notice');
}

/**
 * From the wizard's first step to "Submission complete": every step with "Continue" (a file,
 * an abstract, OMP's series, OPS's relation status), then on "Review" tick every box of the
 * confirmation form, "Submit" and "Submit" in the confirmation. Returns the boxes' labels.
 */
async function completeWithCopyright(page, app, {series}) {
    const ojs = app.name === 'ojs';
    const W = ojs ? null : require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const O = ojs ? new (require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js')).SubmissionWizardPage)(page, app.contextPath) : null;
    const done = new Set();
    for (let i = 0; i < 10; i++) {
        const step = (await currentStep(page)).replace(/^\d+\s*/, '');
        if (/(^|\s)Review$/.test(step)) break;
        if (!done.has(step)) {
            done.add(step);
            if (step === 'Upload Files') {
                if (ojs) await O.uploadFile();
                else if (app.name === 'omp') await W.uploadWizardFile(page, 'u21ir34-manuscript.txt');
                else await W.addGalleyFile(page, {label: 'PDF'});
            } else if (step === 'Details') {
                await A8.typeAbstract(page, 'An abstract for the u21ir34 walk.');
            } else if (step === 'For the Editors' && series) {
                await page.getByRole('radio', {name: series, exact: true}).check();
                await idle(page);
            } else if (step === 'For Readers' && app.name === 'ops') {
                await W.setRelationStatus(page);
            }
        }
        await pressContinue(page);
        await idle(page);
        await sleep(500);
    }
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    const boxes = page.locator('.submissionWizard__stepForm input[type="checkbox"]:visible');
    const labels = [];
    for (let i = 0; i < (await boxes.count()); i++) {
        const b = boxes.nth(i);
        labels.push(flat(await b.evaluate((e) => (e.closest('label') || {}).innerText || ''), 200));
        if (!(await b.isChecked())) await b.check();
    }
    if (ojs) await O.submitAndConfirm();
    else if (app.name === 'ops') await W.confirmSubmit(page, {message: ''});
    else await W.confirmSubmit(page);
    await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: T});
    return labels;
}

/** As the signed-in editor: the submission's workflow, "Activity Log": every row's text, flattened. */
async function activityLogRows(page, app, id) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const wf = new WorkflowPage(page, `${app.contextPath}${L(app)}`);
    await wf.gotoEditorial(id);
    const dialog = await wf.openActivityLog();
    await idle(page).catch(() => {});
    const rows = (await dialog.getByRole('row').allInnerTexts()).map((r) => flat(r, 300)).filter(Boolean);
    return {wf, rows};
}

/** The stored settings of the submission's copyright-agreed log entry (event type 0x10000009), as `name|locale|value` lines. */
function storedCopyrightEntry(app, id) {
    return sql(app, `select s.setting_name, s.locale, left(s.setting_value, 80) from event_log l join event_log_settings s on s.log_id = l.log_id where l.assoc_type = 1048585 and l.assoc_id = ${Number(id)} and l.event_type = 268435465 order by s.setting_name, s.locale`);
}

module.exports = {T, sleep, flat, L, WORDS, setCopyrightNotice, completeWithCopyright, activityLogRows, storedCopyrightEntry, beginSubmission: A8.beginSubmission};
