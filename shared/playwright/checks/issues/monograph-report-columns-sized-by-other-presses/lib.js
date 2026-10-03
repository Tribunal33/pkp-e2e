// Helpers of walk.js (issue report docs/issues/U65-OMP3-monograph-report-columns-sized-by-other-presses.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const fs = require('fs');
const path = require('path');
const {idle, loc, launch, signIn, screen, shot, record} = require('../../../probe');
const S = require('../section-editors-not-assigned-second-journal/lib.js');
const {currentStep, pressContinue} = require('../wizard-refused-save-hangs-saving/lib.js');
const {parseCsv} = require('../articles-report-supporting-agencies-empty/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * The wizard's "Contributors" step: "Add Contributor", the person's fields, the "Author" role
 * (a box on `main`, a choice on 3.5), "Save"; waits for the row. Returns the panel's rows.
 */
async function addContributor(page, {given, family, email, country = 'Canada'}) {
    const panel = page.locator('.contributorsListPanel');
    const add = panel.getByRole('button', {name: 'Add Contributor', exact: true});
    await loc(page, 'wizard › Contributors: "Add Contributor"', add);
    await add.click();
    const dialog = page.getByRole('dialog').filter({has: page.locator('input[name^="givenName"]')}).last();
    await dialog.locator('input[name^="givenName"]').first().waitFor({state: 'visible', timeout: T});
    await dialog.locator('input[name^="givenName"]').first().fill(given);
    await dialog.locator('input[name^="familyName"]').first().fill(family);
    await dialog.locator('input[name="email"]').fill(email);
    await dialog.locator('select').filter({has: page.locator('option', {hasText: 'Canada'})}).first().selectOption({label: country});
    const box = dialog.getByRole('checkbox', {name: 'Author', exact: true});
    const radio = dialog.getByRole('radio', {name: 'Author', exact: true});
    if (await box.count()) await box.first().check();
    else if (await radio.count()) await radio.first().check();
    const saved = page.waitForResponse((r) => r.url().includes('/contributors') && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await dialog.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await panel.getByText(`${given} ${family}`).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return {status: r ? r.status() : null, rows: flat(await panel.innerText().catch(() => null), 400)};
}

/**
 * The wizard after "Begin Submission", step by step as the rail orders them: a file on
 * "Upload Files", one contributor on "Contributors", an abstract on "Details", then "Submit"
 * and its confirmation. Returns {steps, contributor, problems} (problems empty when it submitted).
 */
async function completeBook(page, app, {fileName, contributor, abstract}) {
    const W = require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const done = new Set();
    const out = {steps: [], contributor: null, problems: ''};
    for (let i = 0; i < 10; i++) {
        const step = (await currentStep(page)).replace(/^\d+\s*/, '');
        if (/(^|\s)Review$/.test(step)) break;
        if (!done.has(step)) {
            done.add(step);
            out.steps.push(step);
            if (step === 'Upload Files') {
                await W.uploadWizardFile(page, fileName);
            } else if (step === 'Contributors') {
                out.contributor = await addContributor(page, contributor);
            } else if (step === 'Details') {
                await S.typeAbstract(page, abstract);
            }
        }
        await pressContinue(page);
        await idle(page);
        await sleep(500);
    }
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    out.problems = flat(await page.locator('.submissionWizard__review_errors').innerText({timeout: 3000}).catch(() => ''), 600);
    if (out.problems) return out;
    await W.confirmSubmit(page);
    return out;
}

/**
 * In a fresh browser: sign in, open the press's Statistics › "Reports", press "Monograph
 * Report"; the file's name, bytes and parsed rows. `keep` names a path to write the bytes to.
 */
async function downloadMonographReport(app, username, ctx, snapName, keep) {
    const {page, close} = await launch(app);
    try {
        await signIn(page, username);
        await page.goto(app.url(`/index.php/${ctx}${S.L(app)}/stats/reports`));
        await idle(page);
        record(snapName, await screen(page));
        await shot(page, snapName);
        const link = page.locator('main').getByRole('link', {name: 'Monograph Report', exact: true});
        await loc(page, 'Statistics › Reports: "Monograph Report"', link);
        const dl = page.waitForEvent('download', {timeout: 90_000});
        await link.click();
        const d = await dl;
        const buf = fs.readFileSync(await d.path());
        if (keep) fs.writeFileSync(keep, buf);
        const text = buf.toString('utf8').replace(/^﻿/, '');
        return {file: d.suggestedFilename(), bytes: buf.length, rows: parseCsv(text).filter((r) => r.length > 1)};
    } finally {
        await close();
    }
}

/**
 * A header row read for the column groups: the highest "(Author n)", "(Editor n)" and
 * "Editor Decision n", the author and decision column names at the edges, and for each data
 * line the highest group that holds anything.
 */
function columnGroups(rows) {
    const header = rows[0] || [];
    const top = (re) => header.reduce((m, h) => {
        const x = re.exec(h);
        return x ? Math.max(m, Number(x[1])) : m;
    }, 0);
    const used = (line, re) => header.reduce((m, h, i) => {
        const x = re.exec(h);
        return x && line[i] ? Math.max(m, Number(x[1])) : m;
    }, 0);
    const AUTHOR = /\(Author (\d+)\)$/;
    const EDITOR = /\(Editor (\d+)\)$/;
    const DECISION = /^Editor Decision (\d+) /;
    return {
        columns: header.length,
        authorGroups: top(AUTHOR),
        editorGroups: top(EDITOR),
        decisionGroups: top(DECISION),
        lastAuthorColumn: [...header].reverse().find((h) => AUTHOR.test(h)) || null,
        lastColumn: header[header.length - 1] || null,
        decisionColumns: header.filter((h) => /^(Editor Decision|Date decided) \d+/.test(h)),
        lines: rows.slice(1).map((line) => ({
            id: line[0],
            title: flat(line[1], 80),
            authorsFilled: used(line, AUTHOR),
            editorsFilled: used(line, EDITOR),
            decisionsFilled: used(line, DECISION),
        })),
    };
}

module.exports = {T, sleep, flat, createPress: S.createContext, beginSubmission: S.beginSubmission, addContributor, completeBook, downloadMonographReport, columnGroups};
