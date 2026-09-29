// @ts-check
/**
 * @file playwright/tests/U66-institutions.spec.js
 *
 * Institutions — OMP suite, the parallel part: one test per canonical
 * scenario the press runs in the `omp` project: S1–S3 (common), in the
 * press's own words (the Press Manager, the Series editor, "Press
 * editor"). S4 ticks the site's "Enable institutional statistics", so it
 * runs `@solo` in the serial project: `tests/serial/U66-institutions.spec.js`.
 * S5 is the journal's (footnote s).
 * Spec: docs/specs/U66-institutions.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A3 🐞: S1 never presses "Yes" in "Delete Institution" (on a press it
 *   deletes nothing, Rule 7b); its "No" is read, and the row stays.
 * - A8 🐞: no scratch press is ever removed.
 * - A2 🐞: S1 closes "Edit Institution" only after a saved name, never
 *   after an unsaved one.
 * - A9 🐞: no "IP ranges" line here runs past 40 characters.
 * - A10 ❓: every list is read as a set, never in order.
 * - A11 ❓: S1 reads "Jump to next error", never presses it.
 * - A1, A4–A7: not on these scenarios' paths.
 *
 * Seeding (footnote s): every test seeds its own scratch press with
 * throwaway accounts (the username twice as password) through `POST
 * scenarios/context`: `institutions[]` (S2), `context.supportedLocales`
 * and `supportedFormLocales` `['en', 'fr_CA']` (S2's press B), `roles:
 * {editor: {permitSettings: false}}` (S3). publicknowledge and the seeded
 * roster are never touched. S1's spare account is the recipient of its
 * mail control.
 *
 * Every absence is read settled (the list's own fetch after the action
 * that would change it, the requests sent while an action that must send
 * none runs) and paired with a positive control taken the same way (M4,
 * M6); S1's mailbox silence is bounded by an email the test sends to its
 * spare account and finds (A8). Every signed-in actor is an `asUser`
 * context; S3's signed-out visitor is the fixture's own page, which
 * carries no session in a test that sets no `user`. Every answer of 500
 * or more a manager page receives fails the test (a finding on its own).
 * Waits are web-first or bounded by the screen's own answer (A5); the one
 * page timer waits out the modal store's slot after a panel closes
 * (patterns.md pitfall 4).
 */
const {test, expect} = require('../support/fixtures.js');
const {CounterR5Page} = require('../../../../shared/playwright/pages/UsageStatsPages.js');
const {UsersListPage, EmailUserWindow} = require('../../../../shared/playwright/pages/UsersManagementPages.js');
const {InstitutionsPage, serverFailures} = require('../../../../shared/playwright/pages/InstitutionsPages.js');

const T = 30_000;

// ---- the words (Fields) ----------------------------------------------------------------
const W = {
    heading: 'Institutions',
    ipDescription:
        "Valid values include an IP address (e.g. 142.58.103.1), IP range (e.g. 142.58.103.1 - 142.58.103.4), IP range with wildcard '*' (e.g. 142.58.*.*), and an IP range with CIDR (e.g. 142.58.100.0/24).",
    rorDescription: 'Research Organization Registry ID for this institution.',
    required: 'This field is required.',
    requiredIn: (language) => `You must complete this field in ${language}.`,
    badIp: 'Invalid IP range',
    badRor: 'This is not formatted correctly.',
    correct: (n) => `Please correct ${n} errors.`,
    notSaved: (n) => `The form was not saved because ${n} error(s) were encountered. Please correct these errors and try again.`,
    deleteQuestion: 'Are you sure you want to continue and delete this institution?',
    denied: 'The current role does not have access to this operation.',
    theWorld: 'The World',
};
const ROR = 'https://ror.org/0213rcc28';
/** The eight accepted lines of scenario 1, as the panel keeps them. */
const SHAPES = [
    '142.58.103.1',
    '142.58.103.1-142.58.103.4',
    '142.58.103.1 - 142.58.103.4',
    '142.58.*.*',
    '142.58.*.1 - 142.58.*.9',
    '142.58.100.0/24',
    '142.58.103.4 - 142.58.103.1',
    '142.58.103.1',
];

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u66${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/** An actor's page (an `asUser` context), its server failures collected. */
async function actorPage(asUser, username) {
    const page = await (await asUser(username)).newPage();
    return {page, failures: serverFailures(page)};
}

/** "Customer ID" of Statistics › "Counter R5" › "Edit" on "Platform Master Report (PR)", as a set. */
async function customerIds(page, contextPath) {
    const counter = new CounterR5Page(page, contextPath);
    await counter.goto();
    const window = await counter.edit('PR');
    let names = [];
    await expect
        .poll(async () => {
            names = (await window.customers()).map(([text]) => text);
            return names.length;
        }, {timeout: T})
        .toBeGreaterThan(0);
    await window.close();
    return names.sort();
}

test.describe('Institutions', () => {
    test('S1: adding, editing and deleting an institution', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s1', testInfo);
        const manager = `${tag}mg`;
        const spare = `${tag}sp`;
        await ompApi.createContext({
            tag,
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(spare, 'Xena', 'Spare', ['author'])],
        });
        const {page, failures} = await actorPage(asUser, manager);
        const inst = new InstitutionsPage(page, tag);

        // The empty page, by its address (Fields; Rules 1–3).
        await inst.goto();
        await expect(inst.heading).toHaveText(W.heading);
        await expect(inst.panelTitle).toHaveText(W.heading);
        await expect(inst.searchBox).toBeVisible();
        await expect(inst.addButton).toBeVisible();
        await inst.expectNames([]);

        // Three faults at once (Rule 5; Fields).
        let panel = await inst.openAdd();
        await expect(panel.heading).toBeVisible();
        await expect(panel.fieldLabel('name-en')).toHaveText('Name');
        await expect(panel.fieldLabel('ipRanges')).toHaveText('IP ranges');
        await expect(panel.description('ipRanges')).toHaveText(W.ipDescription);
        await expect(panel.fieldLabel('ror')).toHaveText('ROR');
        await expect(panel.description('ror')).toHaveText(W.rorDescription);
        await expect(panel.nameBox()).toHaveValue('');
        await expect(panel.ipRangesBox).toHaveValue('');
        await expect(panel.rorBox).toHaveValue('');
        await expect(panel.nameBox('fr_CA')).toHaveCount(0);
        await panel.ipRangesBox.fill('256.1.1.1\n300.1.1.1');
        await panel.rorBox.fill('https://ror.org/1213rcc28');
        await panel.saveRefused();
        await expect(panel.fieldError('name-en')).toHaveText(W.required);
        await expect(panel.fieldErrorLines('ipRanges')).toHaveText([W.badIp]);
        await expect(panel.fieldError('ror')).toHaveText(W.badRor);
        await expect(panel.flagged).toHaveCount(3);
        await expect(panel.errorSummary).toContainText(W.correct(3));
        await expect(panel.jumpButton).toBeVisible();
        await expect(inst.notices(W.notSaved(3))).toHaveCount(1, {timeout: T});
        await expect(panel.saveButton).toBeDisabled();

        // Correcting the faults (Fields). "Save" is pressable again only
        // once every flagged box has changed (T-ojs-1, the same ui-library
        // form on a press): the next bullet's first press reads it enabled.
        await panel.nameBox().fill('Campus Library');
        await panel.rorBox.fill(ROR);

        // More refused lines: each alone flags "IP ranges" (Fields "IP ranges").
        for (const lines of ['010.0.0.1', '142.58.103.1\n\n142.58.103.4']) {
            await panel.ipRangesBox.fill(lines);
            await panel.saveRefused();
            await expect(panel.fieldErrorLines('ipRanges'), JSON.stringify(lines)).toHaveText([W.badIp]);
            await expect(panel.flagged, JSON.stringify(lines)).toHaveCount(1);
            await expect(panel.dialog).toBeVisible();
        }

        // Every accepted shape (Rules 3, 5, 6; Fields "IP ranges").
        await panel.ipRangesBox.fill(['', '', `   ${SHAPES[0]}   `, ...SHAPES.slice(1), ''].join('\n'));
        await panel.saveAccepted({refetch: true});
        await inst.expectNames(['Campus Library']);
        await expect(inst.rowButtons('Campus Library')).toHaveText(['Edit', 'Delete']);
        panel = await inst.openEdit('Campus Library');
        await expect(panel.heading).toBeVisible();
        await expect(panel.nameBox()).toHaveValue('Campus Library');
        await expect(panel.ipRangesBox).toHaveValue(SHAPES.join('\n'));
        await expect(panel.rorBox).toHaveValue(ROR);

        // Editing (Rule 6).
        await panel.nameBox().fill('Campus Library Renamed');
        await panel.ipRangesBox.fill('');
        await panel.rorBox.fill('');
        await panel.saveAccepted();
        await inst.expectNames(['Campus Library Renamed']);
        panel = await inst.openEdit('Campus Library Renamed');
        await expect(panel.nameBox()).toHaveValue('Campus Library Renamed');
        await expect(panel.ipRangesBox).toHaveValue('');
        await expect(panel.rorBox).toHaveValue('');
        await panel.close();
        await inst.reload();
        await inst.expectNames(['Campus Library Renamed']);

        // "Customer ID" (Side effects).
        expect(await customerIds(page, tag)).toEqual(['Campus Library Renamed', W.theWorld].sort());

        // "No": the dialog closes, nothing is sent, the row stays (Rule 7).
        // "Yes" is not pressed: on a press it deletes nothing (Rule 7b, A3 🐞).
        await inst.goto();
        const del = await inst.openDelete('Campus Library Renamed');
        await expect(del.dialog).toContainText(W.deleteQuestion);
        await expect(del.yesButton).toBeVisible();
        await expect(del.noButton).toBeVisible();
        expect(await del.no()).toEqual([]);
        await inst.expectNames(['Campus Library Renamed']);
        await inst.reload();
        await inst.expectNames(['Campus Library Renamed']);

        // No email since the first "Save", bounded by an email to the spare
        // account (Side effects; A8).
        const users = new UsersListPage(page, tag);
        await users.goto();
        await users.chooseAction(users.row(mailOf(spare)), 'Email');
        const email = new EmailUserWindow(page);
        await email.compose({subject: `Control ${tag}`, body: `Control ${tag}`});
        await email.sendAndExpectSent();
        await pkpMail.expectNone({to: mailOf(manager), afterControl: {to: mailOf(spare), contains: `Control ${tag}`}});

        // Control: "Add Institution" opens empty (Rule 5).
        await inst.goto();
        panel = await inst.openAdd();
        await expect(panel.nameBox()).toHaveValue('');
        await expect(panel.ipRangesBox).toHaveValue('');
        await expect(panel.rorBox).toHaveValue('');
        await panel.close();
        expect(failures).toEqual([]);
    });

    test('S2: searching a press\'s list, in two languages', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(300_000);
        const tagA = makeTag('s2a', testInfo);
        const tagB = makeTag('s2b', testInfo);
        const manager = `${tagB}mg`;
        await ompApi.createContext({
            tag: tagA,
            users: [user(`${tagA}mg`, 'Ari', 'Manager', ['manager'])],
            institutions: [{name: 'Zebra Institute', ipRanges: ['172.16.0.0/12']}],
        });
        await ompApi.createContext({
            tag: tagB,
            context: {primaryLocale: 'en', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
            users: [user(manager, 'Mona', 'Manager', ['manager'])],
            institutions: [
                {name: 'Campus Library', ipRanges: ['10.0.0.0/8']},
                {name: 'Local Library', ipRanges: ['127.0.0.1']},
            ],
        });
        const {page, failures} = await actorPage(asUser, manager);
        const inst = new InstitutionsPage(page, tagB);
        const both = ['Campus Library', 'Local Library'];

        // B's list, and no "Zebra Institute" (Rules 2, 3).
        await inst.goto();
        await inst.expectNames(both);

        // A French name (Settings bullet 4; Fields; Rule 3).
        let panel = await inst.openEdit('Campus Library');
        await expect(panel.localeNames).toHaveText(['French', 'English']);
        await expect(panel.nameBox('fr_CA')).toBeHidden();
        await panel.showLocale('French', 'fr_CA');
        await expect(panel.localeLabel('name-fr_CA')).toHaveText('French');
        await panel.nameBox('fr_CA').fill('Bibliothèque du campus');
        await panel.saveAccepted();
        await inst.expectNames(both);

        // The primary language required (Fields "Name"; Settings bullet 4).
        panel = await inst.openEdit('Local Library');
        await panel.nameBox().fill('');
        await panel.saveRefused();
        await expect(panel.fieldError('name-en')).toHaveText(W.requiredIn('English'));
        await panel.nameBox().fill('Local Library');
        await panel.saveAccepted();
        await inst.expectNames(both);

        // Searches, each ended with Enter and read after its own answer (Rule 4).
        const searches = [
            ['bibliothèque', ['Campus Library']],
            ['LIBRARY', both],
            ['127.0.0', ['Local Library']],
            ['campus 10.0', ['Campus Library']],
            ['campus 127', []],
            ['Zebra', []],
            ['172.16', []],
        ];
        for (const [phrase, expected] of searches) {
            await inst.search(phrase);
            await inst.expectNames(expected);
        }

        // The whole list back: the clear button, then an emptied box and
        // Enter (Rule 4).
        await inst.clearSearch();
        await inst.expectNames(both);
        await inst.search('local');
        await inst.expectNames(['Local Library']);
        await inst.search('');
        await inst.expectNames(both);

        // Adding under a search (Rule 5).
        await inst.search('campus');
        await inst.expectNames(['Campus Library']);
        panel = await inst.openAdd();
        await panel.nameBox().fill('Delta Institute');
        await panel.saveAccepted({refetch: true});
        await inst.expectNames(['Campus Library']);
        panel = await inst.openAdd();
        await panel.nameBox().fill('Campus Annex');
        await panel.saveAccepted({refetch: true});
        await inst.expectNames(['Campus Library', 'Campus Annex']);

        // "Customer ID": B's four, no "Zebra Institute" (Rule 2; Side effects).
        const four = ['Campus Library', 'Local Library', 'Delta Institute', 'Campus Annex'];
        expect(await customerIds(page, tagB)).toEqual([...four, W.theWorld].sort());

        // Control: typing without Enter sends nothing and keeps the four;
        // Enter then narrows the list (Rule 4).
        await inst.goto();
        await inst.expectNames(four);
        expect(await inst.typeSearch('local')).toEqual([]);
        await inst.expectNames(four);
        await expect(inst.clearSearchButton).toHaveCount(0);
        await inst.searchBox.press('Enter');
        await inst.expectNames(['Local Library']);
        await expect(inst.clearSearchButton).toBeVisible();
        expect(failures).toEqual([]);
    });

    test('S3: who opens the Institutions page', async ({page, asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        const roles = {
            manager: `${tag}mg`,
            editor: `${tag}ed`,
            sectionEditor: `${tag}se`,
            copyeditor: `${tag}ce`,
            author: `${tag}au`,
            externalReviewer: `${tag}rv`,
            reader: `${tag}rd`,
        };
        await ompApi.createContext({
            tag,
            users: Object.entries(roles).map(([role, username]) => user(username, 'Una', role, [role])),
            roles: {editor: {permitSettings: false}},
        });
        const address = new InstitutionsPage(page, tag).url();

        // The Press editor without "Permit changes to Settings", the Series
        // editor, Copyeditor, Author, Reviewer and Reader: the access-denied
        // page (Actors row 2; Settings bullet 3).
        for (const role of ['editor', 'sectionEditor', 'copyeditor', 'author', 'externalReviewer', 'reader']) {
            const {page: rp} = await actorPage(asUser, roles[role]);
            await rp.goto(address);
            await expect(rp, role).toHaveURL(/\/user\/authorizationDenied/);
            await expect(rp.getByText(W.denied, {exact: true}), role).toBeVisible();
            await expect(new InstitutionsPage(rp, tag).panel, role).toHaveCount(0);
        }

        // Signed out: the Login page (Actors row 2).
        await page.goto(address);
        await expect(page).toHaveURL(/\/login(\?|$)/);
        await expect(page.getByRole('heading', {level: 1})).toHaveText('Login');
        await expect(page.locator('input#username')).toBeVisible();

        // Control: the Press Manager opens the page (Actors row 2; Rule 1).
        const {page: mg} = await actorPage(asUser, roles.manager);
        const inst = new InstitutionsPage(mg, tag);
        await inst.goto();
        await expect(mg).toHaveURL(/\/management\/settings\/institutions$/);
        await expect(inst.heading).toHaveText(W.heading);
        await expect(inst.addButton).toBeVisible();
    });
});
