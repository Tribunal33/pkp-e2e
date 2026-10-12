// @ts-check
/**
 * @file lib/pkp/playwright/pages/TasksDiscussionsPages.js
 *
 * Tasks & discussions, shared by the three app suites (feature spec:
 * docs/specs/U37-tasks-and-discussions.md):
 * - `TasksDiscussionsPanel` — a stage's "{Stage} Tasks & Discussions" panel
 *   (`managers/DiscussionManager/DiscussionManager.vue`): its heading, line
 *   and "Add", the table with its three groups, a row's cells, its
 *   "Started" / "Closed" boxes and their questions, and the row menu
 *   ("Edit", "Add Task Details", "History", "Delete"); the same panel sits
 *   in the workflow (editorial and author views) and on step 3 of the
 *   reviewer's review form, so it is found on the page by its heading;
 * - `ItemWindow` — the "Add" / "Edit" window (`DiscussionManagerFormModal`):
 *   the badge, the three groups, the templates with "Find Template", "Name",
 *   "Participants", "Task Information", the message box with "Attach Files",
 *   the field errors, the error summary, "Save", "Cancel" and the "Warning";
 * - `DiscussionWindow` — the window an item's name opens
 *   (`DiscussionManagerFormDisplayModal`): the badge, "Edit", the numbered
 *   participants, "Task Information" with its start/complete box, the
 *   "Close this Discussion" box, the messages with their files, "Add New
 *   Message" and its box, "Save" and "Saved";
 * - `AttachFilesWindow` — the "Attach Files" window a message box opens,
 *   with "Upload File" and "Workflow Files" (the latter's "Select submission
 *   stage" list and file tables);
 * - `HistoryWindow` — the row menu's "History" window;
 * - `QuestionDialog` — the small confirm dialogs ("Warning", "Delete",
 *   "Start this task", "Close this Discussion", "Apply Template", "Confirm
 *   Automatic Addition"), each named by its title;
 * - `TaskTemplatesTab` and `TemplateWindow` — Settings › Workflow › "Tasks
 *   and Discussions" (`managers/TaskTemplateManager/`): the table, its stage
 *   groups, a template's "Auto-add at stage" box and "More Actions", and the
 *   "Add template" / "Edit" window.
 *
 * App neutrality (PRINCIPLES M2): the strings here are lib/pkp's, identical
 * in the three apps (spec fn-a). What differs per app — the panel heading
 * ("Production Tasks & Discussions", "Review Tasks & Discussions"), the
 * stage group names on the template screen, the role names under a
 * participant, the stage keys — is passed in by the suite.
 *
 * DOM facts the locators rely on (probed live 2026-09-23 on OJS,
 * `.reports/U37/screen-notes.md` ccK1–ccK7 and tojs):
 * - the panel is `[data-cy="discussion-manager"]` with an `h3` heading; its
 *   table has one `tbody` whose group heading rows carry
 *   `th[scope=rowgroup]` ("Yet to begin", "In progress", "Closed") and an
 *   empty group a single `td` "No Items"; an item row's first cell holds
 *   the type word, the name as a link-styled button (`span#discussion_name_{id}`)
 *   and "Created by: …" / "Task Owner: …"; the cells run Name, Activity,
 *   Due Date, Started, Closed, actions;
 * - the "Started" / "Closed" boxes are sr-only checkboxes inside a `label`
 *   (press the label); their question is a dialog named by its title with
 *   "Yes" / "No"; after "No" the input's `checked` lies until a reload
 *   (spec A26), so a row's state is read after a reload;
 * - "More Actions" is `button[aria-label="More Actions"]`; its entries are
 *   `menuitem`s portalled to the page; a greyed entry is `disabled`;
 *   "Delete" carries `text-negative`;
 * - the workflow dialog behind a closed inner window stays aria-hidden for
 *   a moment (patterns.md pitfall 4), so the panel is read through CSS
 *   locators, and a row action after a window closed re-lands the page;
 * - the "Add" / "Edit" window is the last dialog holding `input[name=title]`;
 *   its field errors carry ids `discussionForm-{field}-error` (`title`,
 *   `participants`, `dateDue`, `taskInfoAssignee`, `description`); the
 *   message box is TinyMCE over `textarea#discussionForm-description-control`;
 *   the discussion window's reply box is `…-newMessage-control`;
 * - the Vue "start task" and every other PUT goes out as a POST with
 *   `X-Http-Method-Override` (screen-notes hU37), so saves are awaited by URL.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {WorkflowPage} = require('./WorkflowPage.js');
const {motionEnded} = require('../support/motion.js');

/** The lib/pkp texts the spec quotes (all apps alike, spec fn-a). */
const TEXT = {
    panelLine:
        'Use this space to start discussions, assign tasks to others, or create your personal task list to help you move this submission to the next stage.',
    groups: ['Yet to begin', 'In progress', 'Closed'],
    columns: ['Name', 'Activity', 'Due Date', 'Started', 'Closed'],
    noItems: 'No Items',
    windowGroups: ['Details', 'Task Information', 'Discussion'],
    required: 'This field is required.',
    twoParticipants: 'At least two participants are required for a discussion.',
    creatorMust: 'The creator must participate in the task/discussion.',
    oneOwner: 'There should be one user responsible for the task.',
    reviewersIdentity: 'Cannot disclose the identity of reviewers in the task/discussion.',
    authorsWithReviewers:
        'Cannot allow participation of authors together with reviewers in a task/discussion during anonymous reviews.',
    serverNotice:
        'The form was not saved because 1 error(s) were encountered. Please correct these errors and try again.',
    warning: 'The data on this form has changed. Do you wish to continue without saving?',
    noAccessToAdd: 'To add a new message, please assign yourself as a participant.',
    convertHint: 'You can convert this into a task by clicking Edit.',
    convertHintClosed: 'You can convert this into a task by re-opening the discussion and clicking Edit.',
    templatesLabel: 'Templates to get you started!',
    discussionTemplateLine:
        'This discussion template pre-fills the name, participants, and starting message. You can adjust the details before starting.',
    taskTemplateLine:
        'This task template auto-fills the task name, due date, description, and roles. After selecting the template, you can modify any details before saving the task.',
    overdue: 'This task is overdue. Remind the task owner to complete it as soon as possible',
    startOnSave: 'Begin Task Upon Saving',
    createNotStarted: 'Create Task (Do Not Start)',
    deleteQuestion: 'Are you sure you wish to delete this item? This action cannot be undone.',
    startQuestion: 'Are you sure you want to start this task?',
    closeDiscussionQuestion:
        "Are you sure you want to close this discussion? Closing the discussion won't stop you from sending or receiving messages in this thread - this ensures no message is lost.",
    reopenDiscussionQuestion: 'Are you sure you want to reopen this discussion?',
    closeTaskQuestion:
        "Are you sure you want to close this task? Closing the task won't end the discussion - you can still send messages on it.",
    applyTemplateQuestion:
        "Applying this template will replace information in related fields on the form. These changes won't be saved unless you choose to save. Continue?",
    uploadSourceLine: 'Upload a file from your computer.',
    workflowSourceLine:
        'Attach files uploaded during the submission workflow, such as revisions or files to be reviewed.',
    templatesTableTitle: 'Tasks and Discussions Templates',
    templatesLine:
        'Use this space to create templates for tasks and discussions. These templates automatically fill in the task name, due date, description, and roles, giving you a head start.',
    templateColumns: ['Task and discussion template name', 'Auto-add at stage'],
    autoAddLabel: 'Automatically add this task and discussion when a submission reaches a specific stage',
    autoAddWindowLabel: 'Automatically add this task and/or discussion when a submission reaches the stage',
    autoAddOnQuestion: (stage) =>
        `Are you sure you want this task/discussion template to be automatically added when a submission reaches the ${stage}?`,
    savedToast: 'Your changes have been saved.',
};

/** An XPath string literal for `value` (quotes handled with concat()). */
function xpathLiteral(value) {
    if (!value.includes('"')) {
        return `"${value}"`;
    }
    if (!value.includes("'")) {
        return `'${value}'`;
    }
    return `concat(${value
        .split('"')
        .map((part) => `"${part}"`)
        .join(', \'"\', ')})`;
}

/** An anchored, whitespace-tolerant RegExp for an exact text. */
function exactText(text) {
    return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

/** A text with its whitespace folded. */
const flat = (text) => (text || '').replace(/\s+/g, ' ').trim();

/**
 * Run `action` (a press of a message file link) and return the download it
 * starts. The link carries `target=_blank` and answers with an attachment
 * (spec Rule 12, screen-notes ccK5); Chromium opens an empty tab and closes
 * it, and Playwright raises `download` on the page that pressed the link
 * (probed 2026-09-23, tojs), so both the page and any new tab are heard.
 */
async function downloadFromNewTab(page, action) {
    const context = page.context();
    let onPage = null;
    let onDownload = null;
    const download = new Promise((resolve) => {
        onDownload = resolve;
        onPage = (tab) => tab.once('download', resolve);
        context.on('page', onPage);
        page.once('download', resolve);
    });
    let timer = null;
    try {
        await action();
        return await Promise.race([
            download,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('no download within 30 s')), 30_000);
            }),
        ]);
    } finally {
        clearTimeout(timer);
        context.off('page', onPage);
        page.off('download', onDownload);
    }
}

/**
 * A small confirm dialog named by its title ("Warning", "Delete", "Start
 * this task", "Close this Discussion", "Apply Template", "Confirm Automatic
 * Addition"): its sentence and buttons.
 */
class QuestionDialog {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} title
     */
    constructor(page, title) {
        this.page = page;
        this.title = title;
        this.root = page.getByRole('dialog', {name: title, exact: true}).last();
    }

    async expectOpen(sentence = null) {
        await expect(this.root).toBeVisible({timeout: 30_000});
        if (sentence) {
            await expect(this.root.getByText(sentence, {exact: true})).toBeVisible();
        }
    }

    button(label) {
        return this.root.getByRole('button', {name: label, exact: true});
    }

    /** The buttons' labels, in order. */
    async buttonLabels() {
        return (await this.root.getByRole('button').allInnerTexts()).map(flat).filter(Boolean);
    }

    async answer(label) {
        await this.button(label).click();
        await expect(this.root).toHaveCount(0, {timeout: 30_000});
    }
}

class TasksDiscussionsPanel extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{title: string, appContext?: any, labels?: object}} options
     *   `title` is the panel's heading ("Production Tasks & Discussions")
     */
    constructor(page, contextPath, options) {
        super(page);
        this.contextPath = contextPath;
        this.title = options.title;
        /** The workflow frame (opening by address). */
        this.frame = new WorkflowPage(page, contextPath, options);
    }

    // ---------------------------------------------------------------------
    // Opening
    // ---------------------------------------------------------------------

    /** Open the submission's workflow (editorial view) at a stage and wait for the panel. */
    async gotoEditorial(submissionId, menuKey) {
        await this.frame.gotoEditorial(submissionId, {menuKey});
        await this.expectSettled();
    }

    /** Open the author's view of the workflow at a stage and wait for the panel. */
    async gotoAuthor(submissionId, menuKey) {
        await this.frame.gotoAuthor(submissionId, {menuKey});
        await this.expectSettled();
    }

    /**
     * Open the author's view and reach the panel through the side menu's
     * link named like it: a preprint server's Author has no workflow stage
     * entries, and the panel is the "Production Tasks & Discussions" page
     * of the preprint's entries (screen-notes ccK2, ccK3 [ops]). The menu
     * press writes its key into the address, so `reland()` returns there.
     */
    async gotoAuthorByMenu(submissionId) {
        await this.frame.gotoAuthor(submissionId);
        await this.page.getByRole('navigation').getByRole('link', {name: this.title, exact: true}).click();
        await this.expectSettled();
    }

    /** Land the current address afresh (after a window closed; ccK1) and wait for the panel. */
    async reland() {
        await this.page.goto(this.page.url());
        await this.expectSettled();
    }

    /**
     * The panel is on screen with its rows fetched: "Add" is shown and no
     * group reads "Loading" (the rows arrive after the panel mounts).
     */
    async expectSettled() {
        await expect(this.addButton()).toBeVisible({timeout: 30_000});
        await expect(this.root().locator('tbody')).not.toContainText('Loading', {timeout: 30_000});
        await expect(this.root().locator('tbody th[scope="rowgroup"]')).toHaveCount(3, {timeout: 30_000});
    }

    // ---------------------------------------------------------------------
    // The panel (Rule 1)
    // ---------------------------------------------------------------------

    /** The panel, found by its heading anywhere on the page (workflow, review form). */
    root() {
        return this.page
            .locator('[data-cy="discussion-manager"]')
            .filter({has: this.page.locator('h3', {hasText: exactText(this.title)})})
            .first();
    }

    heading() {
        return this.root().locator('h3').first();
    }

    /** The line under the heading. */
    line() {
        return this.root().getByText(TEXT.panelLine, {exact: true});
    }

    addButton() {
        return this.root().locator('button').filter({hasText: /^\s*Add\s*$/});
    }

    /** The visible column headings (the actions column's is screen-reader only). */
    async columnLabels() {
        return this.root()
            .locator('thead th')
            .evaluateAll((cells) =>
                cells
                    .filter((cell) => !cell.querySelector('.sr-only') && cell.textContent.trim())
                    .map((cell) => cell.textContent.replace(/\s+/g, ' ').trim())
            );
    }

    /** The screen-reader-only column headings. */
    async hiddenColumnLabels() {
        return this.root()
            .locator('thead th .sr-only')
            .evaluateAll((cells) => cells.map((cell) => cell.textContent.trim()));
    }

    /** The group headings, in order. */
    async groupLabels() {
        return (await this.root().locator('tbody th[scope="rowgroup"]').allTextContents()).map(flat);
    }

    /** The group heading row `group` followed at once by its "No Items" row. */
    emptyGroup(group) {
        return this.root().locator(
            `xpath=.//tbody/tr[th[@scope="rowgroup"]][normalize-space(.)=${xpathLiteral(group)}]` +
                `/following-sibling::tr[1][normalize-space(.)=${xpathLiteral(TEXT.noItems)}]`
        );
    }

    /** Every item row (group headings and "No Items" rows excluded). */
    itemRows() {
        return this.root().locator('tbody tr').filter({has: this.page.locator('span[id^="discussion_name_"]')});
    }

    /** The row(s) of the item named `name` (exact). */
    row(name) {
        return this.root()
            .locator('tbody tr')
            .filter({has: this.page.locator('span[id^="discussion_name_"]').filter({hasText: exactText(name)})});
    }

    /** The row(s) of `name` sitting under the group heading `group`. */
    rowInGroup(name, group) {
        return this.root().locator(
            `xpath=.//tbody/tr[.//span[starts-with(@id, "discussion_name_")][normalize-space(.)=${xpathLiteral(name)}]]` +
                `[preceding-sibling::tr[th[@scope="rowgroup"]][1][normalize-space(.)=${xpathLiteral(group)}]]`
        );
    }

    /** The item `name` is listed once, under `group` (auto-waited). */
    async expectInGroup(name, group) {
        await expect(this.rowInGroup(name, group)).toHaveCount(1, {timeout: 30_000});
        await expect(this.row(name)).toHaveCount(1);
    }

    /** The item `name` is not listed (bounded by the settled panel; pair with a positive control). */
    async expectNoRow(name) {
        await this.expectSettled();
        await expect(this.row(name)).toHaveCount(0);
    }

    /** The row's "Name" cell. */
    nameCell(name) {
        return this.row(name).locator('td').nth(0);
    }

    /** The name, as the link-styled button that opens the discussion window. */
    nameButton(name) {
        return this.row(name).locator('button').filter({has: this.page.locator('span[id^="discussion_name_"]')});
    }

    /** "Discussion" or "Task", the word over the name. */
    typeWord(name) {
        return this.nameCell(name).locator('span').first();
    }

    /** The line under the name: "Created by: …" or "Task Owner: …". */
    ownerLine(name) {
        return this.nameCell(name).locator(':scope > div > span').last();
    }

    activityCell(name) {
        return this.row(name).locator('td').nth(1);
    }

    /** The "Activity" cell's numbered list entries (empty when it shows one line). */
    activityListItems(name) {
        return this.activityCell(name).locator('ol > li');
    }

    dueDateCell(name) {
        return this.row(name).locator('td').nth(2);
    }

    /** The row's "Started" box (the input; `checked` / `disabled` are read on it). */
    startedBox(name) {
        return this.row(name).locator('td').nth(3).locator('input[type="checkbox"]');
    }

    /** The row's "Closed" box. */
    closedBox(name) {
        return this.row(name).locator('td').nth(4).locator('input[type="checkbox"]');
    }

    /** Press a row box (its label; the input is screen-reader only). */
    async pressBox(name, column) {
        const cell = this.row(name).locator('td').nth(column === 'Started' ? 3 : 4);
        await cell.locator('label').click();
    }

    // ---------------------------------------------------------------------
    // The row menu (Rule 5)
    // ---------------------------------------------------------------------

    menuButton(name) {
        return this.row(name).locator('button[aria-label="More Actions"]');
    }

    menuItems() {
        return this.page.getByRole('menuitem');
    }

    menuItem(label) {
        return this.page.getByRole('menuitem', {name: label, exact: true});
    }

    async openMenu(name) {
        await this.menuButton(name).click();
        await expect(this.menuItems().first()).toBeVisible({timeout: 30_000});
    }

    /** Close the open menu by pressing its button again (Escape would close the workflow too). */
    async closeMenu(name) {
        await this.menuButton(name).click();
        await expect(this.menuItems()).toHaveCount(0, {timeout: 30_000});
    }

    /** The open menu's entries, in order. */
    async menuLabels() {
        return (await this.menuItems().allInnerTexts()).map(flat);
    }

    async chooseMenu(name, label) {
        await this.openMenu(name);
        await this.menuItem(label).click();
    }

    // ---------------------------------------------------------------------
    // The windows
    // ---------------------------------------------------------------------

    /** Press "Add" and wait for the window with its participants. */
    async openAdd() {
        await this.addButton().click();
        const win = new ItemWindow(this.page);
        await win.expectReady();
        return win;
    }

    /** Row menu › "Edit" (or "Add Task Details") and wait for the window. */
    async openEdit(name, entry = 'Edit') {
        await this.chooseMenu(name, entry);
        const win = new ItemWindow(this.page);
        await win.expectReady();
        return win;
    }

    /** Press the item's name and wait for its window to settle. */
    async openItem(name) {
        await this.nameButton(name).click();
        const win = new DiscussionWindow(this.page, name);
        await win.expectReady();
        return win;
    }

    /** Row menu › "History" and wait for the table. */
    async openHistory(name) {
        await this.chooseMenu(name, 'History');
        const win = new HistoryWindow(this.page);
        await win.expectReady();
        return win;
    }

    /** Row menu › "Delete": the question. */
    async openDelete(name) {
        await this.chooseMenu(name, 'Delete');
        const dialog = new QuestionDialog(this.page, 'Delete');
        await dialog.expectOpen(TEXT.deleteQuestion);
        return dialog;
    }

    /**
     * Answer a row box's question and wait for the item to move ("Yes":
     * the start/close/open request's answer).
     */
    async answerRowQuestion(title, answer) {
        const dialog = new QuestionDialog(this.page, title);
        if (answer === 'Yes') {
            const done = this.page.waitForResponse(
                (r) => /\/tasks\/\d+\/(start|close|open)$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET',
                {timeout: 30_000}
            );
            await dialog.answer('Yes');
            expect((await done).status()).toBe(200);
        } else {
            await dialog.answer(answer);
        }
    }
}

class ItemWindow extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.root = page.getByRole('dialog').filter({has: page.locator('input[name="title"]')}).last();
    }

    /** The window is open, its participants listed and its message box ready. */
    async expectReady() {
        await expect(this.root).toBeVisible({timeout: 30_000});
        await expect(this.participantBoxes().first()).toBeAttached({timeout: 30_000});
        await this.waitForEditor();
    }

    async waitForEditor(field = 'description') {
        const id = await this.editorId(field);
        await this.page.waitForFunction(
            (i) => {
                // eslint-disable-next-line no-undef
                const mce = window.tinymce;
                const editor = mce && mce.get(i);
                return !!(editor && editor.initialized);
            },
            id,
            {timeout: 30_000}
        );
    }

    async editorId(field = 'description') {
        return await this.root.locator(`textarea[id$="-${field}-control"]`).getAttribute('id');
    }

    header() {
        return this.root.locator('[data-cy="sidemodal-header"]');
    }

    heading() {
        return this.root.getByRole('heading', {level: 1});
    }

    /** The header badge reading `text` ("New", "In progress", …). */
    badge(text) {
        return this.header().getByText(text, {exact: true});
    }

    group(name) {
        return this.root.getByRole('group', {name, exact: true});
    }

    /** A group's one-line description (the text under its heading). */
    groupDescription(name, text) {
        return this.group(name).getByText(text, {exact: true});
    }

    nameField() {
        return this.root.locator('input[name="title"]');
    }

    participantBoxes() {
        return this.root.locator('input[name="participants"]');
    }

    /** The ticked participant boxes. */
    checkedParticipantBoxes() {
        return this.root.locator('input[name="participants"]:checked');
    }

    /** A participant's box by username ("{full name} ({username})"). */
    participantBox(username) {
        return this.root
            .locator('label')
            .filter({hasText: `(${username})`})
            .locator('input[name="participants"]');
    }

    /** The participant's label with its role line. */
    participantLabel(username) {
        return this.root
            .locator('label')
            .filter({hasText: `(${username})`})
            .filter({has: this.page.locator('input[name="participants"]')});
    }

    /**
     * Every participant as `{label, checked}`, the label its whole text
     * (name, "(Me)", the roles and the review line folded to one line).
     */
    async participants() {
        return this.participantBoxes().evaluateAll((boxes) =>
            boxes.map((box) => ({
                label: ((box.closest('label') || box.parentElement).innerText || '').replace(/\s+/g, ' ').trim(),
                checked: box.checked,
            }))
        );
    }

    /** The participants' usernames, in order (auto-waited for the list to load). */
    async participantUsernames() {
        return (await this.participants()).map((p) => (p.label.match(/\(([^)\s]+)\)/) || [])[1]);
    }

    async tick(username, on = true) {
        await this.participantBox(username).setChecked(on);
    }

    taskBox() {
        return this.root.getByRole('checkbox', {name: 'Enter task information', exact: true});
    }

    dueDate() {
        return this.root.locator('input[name="dateDue"]');
    }

    ownerRadios() {
        return this.root.locator('input[name="taskInfoAssignee"]');
    }

    ownerRadio(username) {
        return this.root
            .locator('label')
            .filter({hasText: `(${username})`})
            .locator('input[name="taskInfoAssignee"]');
    }

    /** The owner list's usernames, in order. */
    async ownerUsernames() {
        return this.ownerRadios().evaluateAll((radios) =>
            radios.map((radio) => {
                const text = (radio.closest('label') || radio.parentElement).innerText || '';
                return (text.match(/\(([^)\s]+)\)/) || [])[1];
            })
        );
    }

    ownerHeading() {
        return this.root.getByText('Responsible to complete this task (Task owner)', {exact: false}).first();
    }

    /** The start drop-down under "Task Information". */
    startSelect() {
        return this.root.locator('select[name="taskInfoShouldStart"]');
    }

    async startSelectLabel() {
        return flat(await this.startSelect().locator('option:checked').innerText());
    }

    /** Type into the message box (replacing its text), once TinyMCE is ready. */
    async typeMessage(text) {
        const id = await this.editorId();
        await this.waitForEditor();
        await this.page.frameLocator(`#${id}_ifr`).locator('body').click();
        await this.page.keyboard.press('ControlOrMeta+a');
        await this.page.keyboard.press('Delete');
        await this.page.keyboard.type(text);
        await expect.poll(() => this.messageText(), {timeout: 10_000}).toBe(text);
    }

    /** The message box's text (TinyMCE, format text). */
    async messageText() {
        const id = await this.editorId();
        return this.page.evaluate((i) => {
            // eslint-disable-next-line no-undef
            const editor = window.tinymce && window.tinymce.get(i);
            return editor ? editor.getContent({format: 'text'}).trim() : null;
        }, id);
    }

    /** The message box's HTML (placeholders show as tags). */
    async messageHtml() {
        const id = await this.editorId();
        return this.page.evaluate((i) => {
            // eslint-disable-next-line no-undef
            const editor = window.tinymce && window.tinymce.get(i);
            return editor ? editor.getContent() : null;
        }, id);
    }

    // Templates (Rule 10) --------------------------------------------------

    templatesLabel() {
        return this.root.getByText(TEXT.templatesLabel, {exact: true});
    }

    templateList() {
        return this.root.getByRole('list', {name: 'Search Results'});
    }

    /** A template button by type ("Discussion" / "Task") and name. */
    templateButton(type, name) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return this.templateList().getByRole('button', {name: new RegExp(`^${type} - ${escaped}\\s+This`)});
    }

    /** Every template button as "{TYPE} - {name}" (the uppercase is CSS). */
    async templateNames() {
        const buttons = this.templateList().getByRole('button');
        return (await buttons.evaluateAll((els) => els.map((el) => el.querySelector('div').textContent))).map(flat);
    }

    noTemplatesLine() {
        return this.root.getByText('No items found.', {exact: true});
    }

    findTemplate() {
        return this.root.getByRole('searchbox', {name: 'Find Template'});
    }

    clearSearch() {
        return this.root.getByRole('button', {name: /Clear search/});
    }

    /** Press a template and wait for its fetch (`…/tasks/fromTemplate/{id}`). */
    async pressTemplate(type, name, {expectFetch = true} = {}) {
        const fetched = expectFetch
            ? this.page.waitForResponse((r) => r.url().includes('/tasks/fromTemplate/'), {timeout: 30_000})
            : null;
        await this.templateButton(type, name).click();
        if (fetched) {
            await fetched;
        }
    }

    // Errors (Rules 8, 11a) -------------------------------------------------

    /** A field's error (`title`, `participants`, `dateDue`, `taskInfoAssignee`, `description`). */
    fieldError(field) {
        return this.root.locator(`[id$="-${field}-error"]`);
    }

    /**
     * The summary box beside "Cancel" and "Save" (`.pkpFormErrors`): its own
     * line, the screen-reader list of the errors and "Jump to next error".
     */
    errorSummary() {
        return this.root.locator('.pkpFormErrors');
    }

    /** The summary's own line ("Please correct one error.", "Please correct 2 errors."). */
    async errorSummaryLine() {
        return this.errorSummary().evaluate((box) =>
            [...box.childNodes]
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim()
        );
    }

    /** The summary reads `line` (auto-waited). */
    async expectErrorSummary(line) {
        await expect(this.errorSummary()).toBeVisible({timeout: 30_000});
        await expect.poll(() => this.errorSummaryLine()).toBe(line);
    }

    jumpToNextError() {
        return this.root.getByRole('button', {name: 'Jump to next error', exact: true});
    }

    /** The server refusal's page notice (Rule 11a): a toast at the top right. */
    serverNotice() {
        return this.page.locator('.pkpNotification').filter({hasText: TEXT.serverNotice});
    }

    // Save / Cancel (Rule 11) -----------------------------------------------

    saveButton() {
        return this.root.getByRole('button', {name: 'Save', exact: true});
    }

    cancelButton() {
        return this.root.getByRole('button', {name: 'Cancel', exact: true});
    }

    /** Press "Save" on a form the page refuses at once: nothing is sent. */
    async saveRefusedOnPage() {
        const sent = [];
        const onRequest = (req) => {
            if (/\/tasks(\/\d+)?$/.test(new URL(req.url()).pathname) && req.method() !== 'GET') {
                sent.push(req.url());
            }
        };
        this.page.on('request', onRequest);
        await this.saveButton().click({timeout: 30_000});
        await expect(this.errorSummary()).toBeVisible({timeout: 30_000});
        this.page.off('request', onRequest);
        expect(sent, 'the refused "Save" sent nothing').toEqual([]);
        await expect(this.root).toBeVisible();
    }

    /** Press "Save" and wait for the server's answer; returns it. */
    async saveAndAnswer() {
        const answered = this.page.waitForResponse(
            (r) => /\/tasks(\/\d+)?$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET',
            {timeout: 30_000}
        );
        await this.saveButton().click({timeout: 30_000});
        return await answered;
    }

    /** "Save" accepted: the answer is 200 and the window closes. */
    async saveExpectClosed() {
        const answer = await this.saveAndAnswer();
        expect(answer.status(), `the save answered ${answer.status()}`).toBe(200);
        await expect(this.root).toHaveCount(0, {timeout: 30_000});
    }

    /**
     * "Save" refused by the server: a 4xx answer, the window stays, and the
     * notice of Rule 11a shows (a toast that lives a few seconds, so its
     * wait is armed before the press).
     */
    async saveExpectRefused() {
        const notice = expect(this.serverNotice()).toBeVisible({timeout: 30_000});
        notice.catch(() => {});
        const answer = await this.saveAndAnswer();
        expect(answer.status()).toBeGreaterThanOrEqual(400);
        expect(answer.status()).toBeLessThan(500);
        await expect(this.root).toBeVisible();
        await notice;
    }

    warning() {
        return new QuestionDialog(this.page, 'Warning');
    }

    /** "Cancel" on an untouched window: it closes at once, no question. */
    async cancelUntouched() {
        await this.cancelButton().click();
        await expect(this.root).toHaveCount(0, {timeout: 30_000});
        await expect(this.warning().root).toHaveCount(0);
    }

    /** Attach Files on the message box. */
    async openAttachFiles() {
        await this.group('Discussion').getByRole('button', {name: 'Attach Files'}).click();
        const win = new AttachFilesWindow(this.page);
        await win.expectOpen();
        return win;
    }

    /** The message box's field (the box and the files listed under it). */
    messageField() {
        return this.root.locator('.pkpFormField--richTextarea').filter({has: this.page.locator('textarea[id$="-description-control"]')});
    }

    /**
     * A file listed under the message box ("{file number} {name}"; a
     * workflow file's name is a link, an upload's plain text).
     */
    attachedFile(name) {
        return this.messageField().getByText(name, {exact: true});
    }

    /** The "Remove" control of each file listed under the message box. */
    removeButtons() {
        return this.messageField().getByRole('button', {name: 'Remove', exact: true});
    }
}

class DiscussionWindow extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} name the item's name (the window's title)
     */
    constructor(page, name) {
        super(page);
        this.name = name;
        this.root = page.getByRole('dialog', {name, exact: true}).last();
    }

    /**
     * The window has fetched the item: a message or the no-access line, and
     * the numbered participants (when there are any).
     */
    async expectReady({participants = true} = {}) {
        await expect(this.root).toBeVisible({timeout: 30_000});
        await expect(this.messages().first().or(this.noAccessLine()).first()).toBeVisible({timeout: 30_000});
        if (participants) {
            await expect(this.details().getByText(/^1\. /).first()).toBeVisible({timeout: 30_000});
        }
    }

    header() {
        return this.root.locator('[data-cy="sidemodal-header"]');
    }

    heading() {
        return this.root.getByRole('heading', {level: 1});
    }

    badge(text) {
        return this.header().getByText(text, {exact: true});
    }

    editButton() {
        return this.header().getByRole('button', {name: 'Edit', exact: true});
    }

    details() {
        return this.root.getByRole('group', {name: 'Details', exact: true});
    }

    /** The "Details" participants as their lines ("1. {full name} ({username})" …). */
    participantLines() {
        return this.details().getByText(/^\d+\. /);
    }

    /** The participants' usernames, in their numbered order. */
    async participantUsernames() {
        const lines = await this.participantLines().allInnerTexts();
        return lines.map((line) => (line.match(/\(([^)\s]+)\)/) || [])[1]);
    }

    taskInformation() {
        return this.root.getByRole('group', {name: 'Task Information', exact: true});
    }

    discussion() {
        return this.root.getByRole('group', {name: 'Discussion', exact: true});
    }

    /** A status box: "Start this task", "Complete this task", "Close this Discussion". */
    statusBox(label) {
        return this.root.getByRole('checkbox', {name: label, exact: true});
    }

    /** Every message, oldest first. */
    messages() {
        return this.discussion().getByRole('listitem');
    }

    /** A message's head line ("Message from {username}" and its date and time). */
    messageHead(index) {
        return this.messages().nth(index).locator('p').first();
    }

    /** A message's text. */
    messageBody(index) {
        return this.messages().nth(index).locator(':scope > p').nth(1);
    }

    /** A file link under the messages (`…/download-file?submissionFileId=…`). */
    fileLink(fileName) {
        return this.discussion().locator('a[href*="download-file"]').filter({hasText: fileName});
    }

    addNewMessageButton() {
        return this.root.getByRole('button', {name: 'Add New Message', exact: true});
    }

    noAccessLine() {
        return this.root.getByText(TEXT.noAccessToAdd, {exact: true});
    }

    /** "Add New Message": its box opens under the messages. */
    async addNewMessage() {
        await this.addNewMessageButton().click();
        await this.waitForReplyEditor();
    }

    async replyEditorId() {
        return await this.root.locator('textarea[id$="-newMessage-control"]').getAttribute('id');
    }

    async waitForReplyEditor() {
        await expect(this.root.locator('textarea[id$="-newMessage-control"]')).toBeAttached({timeout: 30_000});
        const id = await this.replyEditorId();
        await this.page.waitForFunction(
            (i) => {
                // eslint-disable-next-line no-undef
                const editor = window.tinymce && window.tinymce.get(i);
                return !!(editor && editor.initialized);
            },
            id,
            {timeout: 30_000}
        );
    }

    async typeReply(text) {
        const id = await this.replyEditorId();
        await this.page.frameLocator(`#${id}_ifr`).locator('body').click();
        await this.page.keyboard.type(text);
        await expect
            .poll(
                () =>
                    this.page.evaluate((i) => {
                        // eslint-disable-next-line no-undef
                        const editor = window.tinymce && window.tinymce.get(i);
                        return editor ? editor.getContent({format: 'text'}).trim() : null;
                    }, id),
                {timeout: 10_000}
            )
            .toBe(text);
    }

    /** The reply box's error. */
    replyError() {
        return this.discussion().locator('.pkpFieldError');
    }

    saveButton() {
        return this.root.getByRole('button', {name: 'Save', exact: true}).last();
    }

    savedStatus() {
        return this.root.getByRole('status').filter({hasText: 'Saved'});
    }

    /** Press "Save" once it is active (it wakes a moment after a change; ccK5). */
    async pressSave() {
        await expect(this.saveButton()).toBeEnabled({timeout: 30_000});
        await this.saveButton().click();
    }

    /** "Save" with a reply typed: the note request answers 200 and "Saved" shows. */
    async saveReply() {
        const answered = this.page.waitForResponse(
            (r) => /\/tasks\/\d+\/notes?$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET',
            {timeout: 30_000}
        );
        await this.pressSave();
        expect((await answered).status()).toBe(200);
        await expect(this.savedStatus()).toBeVisible({timeout: 30_000});
    }

    /** "Save" after a status box: the start/close/open request answers 200 and "Saved" shows. */
    async saveStatus() {
        const answered = this.page.waitForResponse(
            (r) => /\/tasks\/\d+\/(start|close|open)$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET',
            {timeout: 30_000}
        );
        await this.pressSave();
        expect((await answered).status()).toBe(200);
        await expect(this.savedStatus()).toBeVisible({timeout: 30_000});
    }

    /** Attach Files on the reply box. */
    async openAttachFiles() {
        await this.discussion().getByRole('button', {name: 'Attach Files'}).click();
        const win = new AttachFilesWindow(this.page);
        await win.expectOpen();
        return win;
    }

    /** The reply box's field (the box and the files listed under it). */
    replyField() {
        return this.root.locator('.pkpFormField--richTextarea').filter({has: this.page.locator('textarea[id$="-newMessage-control"]')});
    }

    /** A file listed under the reply box ("{file number} {name}"). */
    attachedFile(name) {
        return this.replyField().getByText(name, {exact: true});
    }

    /** The "Remove" control of each file listed under the reply box. */
    removeButtons() {
        return this.replyField().getByRole('button', {name: 'Remove', exact: true});
    }

    /** Close through the header's "Close" (no change pending). */
    async close() {
        await this.root.getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(this.root).toHaveCount(0, {timeout: 30_000});
    }
}

class AttachFilesWindow extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.root = page.getByRole('dialog', {name: 'Attach Files', exact: true}).last();
        this.workflowRoot = page.getByRole('dialog', {name: 'Workflow Files', exact: true}).last();
    }

    async expectOpen() {
        await expect(this.root.getByRole('heading', {name: 'Attach Files', level: 1})).toBeVisible({timeout: 30_000});
    }

    /** The sources' headings ("Upload File", "Workflow Files"), in order. */
    async sourceHeadings() {
        return (await this.root.getByRole('heading', {level: 2}).allInnerTexts()).map(flat);
    }

    uploadButton() {
        return this.root.getByRole('button', {name: 'Upload File', exact: true});
    }

    workflowButton() {
        return this.root.getByRole('button', {name: 'Attach Workflow Files', exact: true});
    }

    /**
     * "Upload File": choose the file, wait for its row, press "Attach Files"
     * (both windows close; the file lists under the message box).
     */
    async upload(filePath) {
        await this.uploadButton().click();
        const top = this.page.locator('[role="dialog"]:visible').last();
        await top.locator('input[type="file"]').setInputFiles(filePath);
        await expect(top.getByRole('button', {name: /Remove/}).first()).toBeVisible({timeout: 30_000});
        await top.getByRole('button', {name: 'Attach Files', exact: true}).last().click();
        await expect(this.page.getByRole('dialog', {name: 'Attach Files', exact: true})).toHaveCount(0, {timeout: 30_000});
    }

    /** "Attach Workflow Files": the "Workflow Files" window. */
    async openWorkflowFiles() {
        await this.workflowButton().click();
        await expect(this.stageSelect()).toBeVisible({timeout: 30_000});
    }

    stageSelect() {
        return this.workflowRoot.getByRole('combobox', {name: 'Select submission stage'});
    }

    async chooseStage(label) {
        await this.stageSelect().selectOption({label});
    }

    /** A file's box in the chosen stage's lists. */
    fileBox(fileName) {
        return this.workflowRoot.getByRole('checkbox', {name: fileName, exact: true});
    }

    attachSelectedButton() {
        return this.workflowRoot.getByRole('button', {name: 'Attach Selected', exact: true});
    }

    /** Tick a file and "Attach Selected": both windows close. */
    async attachWorkflowFile(fileName) {
        // A forced tick does not wait for the window's slide-in (motion.js).
        await motionEnded(this.fileBox(fileName));
        await this.fileBox(fileName).check({force: true});
        await this.attachSelectedButton().click();
        await expect(this.page.getByRole('dialog', {name: 'Workflow Files', exact: true})).toHaveCount(0, {timeout: 30_000});
        await expect(this.page.getByRole('dialog', {name: 'Attach Files', exact: true})).toHaveCount(0, {timeout: 30_000});
    }
}

class HistoryWindow extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.root = page.getByRole('dialog', {name: 'History', exact: true}).last();
    }

    async expectReady() {
        await expect(this.root.getByRole('heading', {name: 'History', level: 1})).toBeVisible({timeout: 30_000});
        await expect(this.rows().first()).toBeVisible({timeout: 30_000});
    }

    /** The item's name under the title. */
    subtitle(name) {
        return this.root.locator('[data-cy="sidemodal-header"]').getByText(name, {exact: true});
    }

    /** The column headings as a screen reader hears them. */
    async columnLabels() {
        return (await this.root.getByRole('columnheader').allTextContents()).map(flat);
    }

    rows() {
        return this.root.locator('tbody tr');
    }

    /** The row(s) whose "Event" matches `event` (string: substring; RegExp). */
    row(event) {
        return this.rows().filter({has: this.page.locator('td:nth-child(3)', {hasText: event})});
    }

    /** Every row as `{date, user, event, download}`, newest first. */
    async entries() {
        return this.rows().evaluateAll((rows) =>
            rows.map((row) => {
                const cells = [...row.querySelectorAll('td')].map((cell) => (cell.innerText || '').replace(/\s+/g, ' ').trim());
                return {date: cells[0], user: cells[1], event: cells[2], download: cells[3] || ''};
            })
        );
    }

    downloadLink(row) {
        return row.getByRole('link', {name: 'Download', exact: true});
    }

    async close() {
        await this.root.getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(this.root).toHaveCount(0, {timeout: 30_000});
    }
}

class TaskTemplatesTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    url() {
        return this.contextUrl(this.contextPath, '/management/settings/workflow');
    }

    /** Settings › Workflow, then the "Tasks and Discussions" tab with its rows. */
    async goto() {
        await this.page.goto(this.url());
        await this.tab().click();
        await expect(this.table()).toBeVisible({timeout: 30_000});
        await expect(this.panel().locator('button[aria-label="More Actions"]').first()).toBeVisible({timeout: 30_000});
    }

    tab() {
        return this.page.getByRole('tab', {name: 'Tasks and Discussions', exact: true});
    }

    panel() {
        return this.page.getByRole('tabpanel', {name: 'Tasks and Discussions'});
    }

    table() {
        return this.panel().getByRole('table', {name: TEXT.templatesTableTitle});
    }

    tableHeading() {
        return this.panel().getByRole('heading', {name: TEXT.templatesTableTitle, level: 3});
    }

    line() {
        return this.panel().getByText(TEXT.templatesLine, {exact: true});
    }

    async columnLabels() {
        return this.panel()
            .locator('thead th')
            .evaluateAll((cells) =>
                cells.filter((c) => !c.querySelector('.sr-only') && c.textContent.trim()).map((c) => c.textContent.replace(/\s+/g, ' ').trim())
            );
    }

    /** The stage groups' names, in order. */
    async groupLabels() {
        return (await this.panel().locator('tbody th[scope="rowgroup"] > div > span').allTextContents()).map(flat);
    }

    /** A stage group's heading row. */
    groupRow(stage) {
        return this.panel().locator(
            `xpath=.//tbody/tr[th[@scope="rowgroup"]//span[normalize-space(.)=${xpathLiteral(stage)}]]`
        );
    }

    addTemplateButton(stage) {
        return this.groupRow(stage).locator('button').filter({hasText: /^\s*Add template\s*$/});
    }

    /** The template rows of a stage group, in order. */
    async templateNames(stage) {
        return this.groupRow(stage).evaluate((groupRow) => {
            const names = [];
            let tr = groupRow.nextElementSibling;
            while (tr && !tr.querySelector('th[scope="rowgroup"]')) {
                const th = tr.querySelector('th[scope="row"]');
                names.push(th ? th.innerText.replace(/\s+/g, ' ').trim() : `[${tr.innerText.replace(/\s+/g, ' ').trim()}]`);
                tr = tr.nextElementSibling;
            }
            return names;
        });
    }

    /** The row of the template `name` in the stage group `stage`. */
    row(name, stage) {
        return this.panel().locator(
            `xpath=.//tbody/tr[th[@scope="row"][normalize-space(.)=${xpathLiteral(name)}]]` +
                `[preceding-sibling::tr[th[@scope="rowgroup"]][1]//span[normalize-space(.)=${xpathLiteral(stage)}]]`
        );
    }

    /** The row's "Auto-add at stage" box (the input). */
    autoAddBox(name, stage) {
        return this.row(name, stage).locator('input[type="checkbox"]');
    }

    /** Press the box's label; the question follows. */
    async pressAutoAdd(name, stage) {
        await this.row(name, stage).locator('label').click();
        const dialog = new QuestionDialog(this.page, 'Confirm Automatic Addition');
        await dialog.expectOpen();
        return dialog;
    }

    menuButton(name, stage) {
        return this.row(name, stage).locator('button[aria-label="More Actions"]');
    }

    async openMenu(name, stage) {
        await this.menuButton(name, stage).click();
        await expect(this.page.getByRole('menuitem').first()).toBeVisible({timeout: 30_000});
    }

    async chooseMenu(name, stage, label) {
        await this.openMenu(name, stage);
        await this.page.getByRole('menuitem', {name: label, exact: true}).click();
    }

    async openAdd(stage) {
        await this.addTemplateButton(stage).click();
        const win = new TemplateWindow(this.page);
        await win.expectReady();
        return win;
    }

    async openEdit(name, stage) {
        await this.chooseMenu(name, stage, 'Edit');
        const win = new TemplateWindow(this.page);
        await win.expectReady();
        return win;
    }

    async openDelete(name, stage) {
        await this.chooseMenu(name, stage, 'Delete');
        const dialog = new QuestionDialog(this.page, 'Delete');
        await dialog.expectOpen(TEXT.deleteQuestion);
        return dialog;
    }
}

class TemplateWindow extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.root = page.getByRole('dialog').filter({has: page.locator('input[name="title"]')}).last();
    }

    async expectReady() {
        await expect(this.root).toBeVisible({timeout: 30_000});
        await expect(this.nameField()).toBeVisible({timeout: 30_000});
        const id = await this.root.locator('textarea[id$="-description-control"]').getAttribute('id');
        await this.page.waitForFunction(
            (i) => {
                // eslint-disable-next-line no-undef
                const editor = window.tinymce && window.tinymce.get(i);
                return !!(editor && editor.initialized);
            },
            id,
            {timeout: 30_000}
        );
    }

    heading() {
        return this.root.getByRole('heading', {level: 1});
    }

    nameField() {
        return this.root.locator('input[name="title"]');
    }

    radio(label) {
        return this.root.getByRole('radio', {name: label, exact: true});
    }

    /** A role box under "Limit access to specific roles". */
    roleBox(label) {
        return this.root.getByRole('checkbox', {name: label, exact: true});
    }

    taskBox() {
        return this.root.getByRole('checkbox', {name: 'Enter task information', exact: true});
    }

    dueSelect() {
        return this.root.locator('select').first();
    }

    autoAddBox() {
        return this.root.getByRole('checkbox', {name: TEXT.autoAddWindowLabel, exact: true});
    }

    async typeMessage(text) {
        const id = await this.root.locator('textarea[id$="-description-control"]').getAttribute('id');
        await this.page.frameLocator(`#${id}_ifr`).locator('body').click();
        await this.page.keyboard.press('ControlOrMeta+a');
        await this.page.keyboard.press('Delete');
        await this.page.keyboard.type(text);
    }

    /** A field's error by the form's field name. */
    fieldError(field) {
        return this.root.locator(`[id$="-${field}-error"]`);
    }

    /** Every visible field error as `{field, text}` (the error's id names the field). */
    async fieldErrors() {
        return this.root.locator('.pkpFieldError').evaluateAll((els) =>
            els
                .filter((el) => el.getClientRects().length > 0)
                .map((el) => ({field: (el.id || '').replace(/^.*?-(.*)-error$/, '$1'), text: (el.innerText || '').replace(/\s+/g, ' ').trim()}))
        );
    }

    saveButton() {
        return this.root.getByRole('button', {name: 'Save', exact: true});
    }

    cancelButton() {
        return this.root.getByRole('button', {name: 'Cancel', exact: true});
    }

    /** "Save" accepted: the templates call answers 200 and the window closes. */
    async saveExpectClosed() {
        const answered = this.page.waitForResponse(
            (r) => /editTaskTemplates|taskTemplates/.test(r.url()) && r.request().method() !== 'GET',
            {timeout: 30_000}
        );
        await this.saveButton().click();
        expect((await answered).status()).toBe(200);
        await expect(this.root).toHaveCount(0, {timeout: 30_000});
    }
}

module.exports = {
    TEXT,
    TasksDiscussionsPanel,
    ItemWindow,
    DiscussionWindow,
    AttachFilesWindow,
    HistoryWindow,
    QuestionDialog,
    TaskTemplatesTab,
    TemplateWindow,
    downloadFromNewTab,
    exactText,
};
