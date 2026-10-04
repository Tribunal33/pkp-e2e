// Helpers of the U38 A7 walk (issue report
// docs/issues/U38-A7-file-lines-empty-name-other-language.md). Runs nothing when required.
const {idle, screen, record, sql} = require('../../../probe');

const T = 60_000;
const LOG_BUTTON = /^(Activity Log|Journal d'événements)$/;
const CLOSE = /^(Close|Fermer)$/;
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** Per app: the dataset submission the steps open (all three are submission 1, made in English). */
exports.CASES = {
    ojs: {submissionId: 1, title: 'Signalling Theory Dividends'},
    omp: {submissionId: 1, title: 'The ABCs of Human Survival: A Paradigm for Global Citizenship'},
    ops: {submissionId: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'},
};

/** Open the submission's workflow at its editorial address in interface language `locale`. */
exports.openSubmission = async function openSubmission(page, app, submissionId, locale) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/dashboard/editorial?workflowSubmissionId=${Number(submissionId)}`));
    await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: LOG_BUTTON}).first().waitFor({timeout: T});
    await idle(page);
};

/**
 * Close the submission's window with its own close button (the dashboard list stays behind it),
 * so the header's initials menu can be reached.
 */
exports.closeSubmission = async function closeSubmission(page) {
    const workflow = page.locator('[role="dialog"]:visible').first();
    const button = workflow.getByRole('button', {name: CLOSE}).first();
    const found = (await button.count()) > 0;
    if (found) {
        await button.click();
        await workflow.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    }
    await page.waitForTimeout(600); // the modal store's 450 ms slot (patterns.md pitfall 4)
    await idle(page);
    return {closedByButton: found, dialogsLeft: await page.locator('[role="dialog"]:visible').count()};
};

/** The initials menu's language link (a label or a RegExp: "français" on main and 3.5; "English"); waits for the address to carry `locale`. */
exports.chooseLanguage = async function chooseLanguage(page, label, locale) {
    const {LanguageMenu} = require('../../../pages/LanguagesPages.js');
    const menu = new LanguageMenu(page);
    await menu.openUserMenu();
    const shown = (await menu.userMenuLink(label).innerText()).trim();
    await menu.closeUserMenu();
    await menu.choose(label, locale);
    await idle(page);
    return shown;
};

/**
 * Press "Activity Log" ("Journal d'événements") in the open workflow's header and read the
 * "History" lines as {date, user, event}, newest first; record the screen under `label`;
 * then the window's own "Close" ("Fermer").
 */
exports.readLog = async function readLog(page, label) {
    const fetched = page.waitForResponse((r) => r.url().includes('submission-event-log-grid/fetch-grid'), {timeout: T});
    const button = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: LOG_BUTTON}).first();
    const buttonText = flat(await button.innerText());
    await button.click();
    await fetched;
    const win = page.getByRole('dialog').filter({has: page.locator('tbody tr.gridRow')}).last();
    await win.locator('tbody tr.gridRow').first().waitFor({timeout: T});
    await idle(page);
    const title = flat(await win.locator('h1, h2').first().innerText().catch(() => ''));
    const headers = (await win.locator('thead th').allTextContents()).map(flat).filter(Boolean);
    const lines = await win.locator('tbody tr.gridRow').evaluateAll((rows) =>
        rows.map((tr) => {
            const cells = [...tr.querySelectorAll('td')].map((td) => {
                const c = td.cloneNode(true);
                c.querySelectorAll('script, a.show_extras').forEach((x) => x.remove());
                return c.textContent.replace(/\s+/g, ' ').trim();
            });
            return {date: cells[0], user: cells[1], event: cells[2]};
        })
    );
    record(label, await screen(page));
    await win.getByRole('button', {name: CLOSE}).first().click();
    await win.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await page.waitForTimeout(600); // the modal store's 450 ms slot (patterns.md pitfall 4)
    return {buttonText, title, headers, lines};
};

/** The events the steps read: file lines, and "assigned" lines. */
exports.pick = function pick(lines) {
    const events = lines.map((l) => l.event);
    const file = events.filter((e) => /^(Revision ".*" was uploaded|The metadata for file|A file ".*" was|La révision «|Les métadonnées du fichier «|Un fichier «|Le fichier «)/.test(e));
    const assigned = events.filter((e) => /was assigned to this submission as|a été ajouté-e à cette soumission/.test(e));
    return {file, assigned};
};

/** The submission's stored per-language log values: log id|message|setting|locale|value. */
exports.stored = function stored(app, submissionId) {
    return sql(
        app,
        `select l.log_id, l.message, s.setting_name, s.locale, left(s.setting_value, 60) from event_log l join event_log_settings s on s.log_id = l.log_id where l.assoc_type = 1048585 and l.assoc_id = ${Number(submissionId)} and s.locale <> '' order by l.log_id, s.setting_name, s.locale`
    ).split('\n').filter(Boolean);
};
