// U05 chunk K1, last remainder: the editorial header's user menu ("Edit
// Profile" under the signed-in name, scenarios preamble) and Users & Roles'
// add-user control, as M1 on k1.js's scratch context. Also writes the
// chunk's screen notes. Run after k1.js:
// PROBE_FEATURE=U05 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U05/K1/k1-menu.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, outDir, outFile} =
    require('../../../probe');

forEachApp(async (app) => {
    const prev = require(outFile(`k1-summary-${app.name}.json`));
    const t = prev.tag;
    const S = {app: app.name, tag: t, errors: {}};
    const {page, close} = await launch(app);
    try {
        await signIn(page, `${t}m1`);
        await page.goto(app.url(`/index.php/${t}/dashboard/editorial`)); await idle(page);
        const menuButton = page.locator('header').getByRole('button', {name: new RegExp(`${t}m1`)}).first();
        S.menuButton = await menuButton.innerText().catch(() => null);
        await menuButton.click();
        const menu = page.locator('header').getByRole('menu').or(page.locator('header [role="menuitem"], header .pkpDropdown__content, header ul').filter({hasText: /Profile|Logout/})).first();
        await menu.waitFor({timeout: 10000}).catch(() => {});
        S.menuEntries = await page.evaluate(() => [...document.querySelectorAll('header a, header button, header [role="menuitem"]')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
        record(`m-user-menu-${app.name}`, await screen(page));
        await shot(page, `m-user-menu-${app.name}`);
        await loc(page, 'the editorial header user menu button', menuButton);
        const edit = page.locator('header').getByRole('link', {name: 'Edit Profile'}).or(page.locator('header').getByRole('menuitem', {name: 'Edit Profile'})).first();
        S.editProfile = {count: await edit.count(), href: await edit.getAttribute('href').catch(() => null)};
        if (S.editProfile.count) { await edit.click(); await idle(page); S.editProfile.landing = page.url(); S.editProfile.tabs = await page.getByRole('tab').allInnerTexts().catch(() => []); }
        await page.goto(app.url(`/index.php/${t}/management/settings/access`)); await idle(page);
        S.usersRolesControls = await page.evaluate(() => [...document.querySelectorAll('main a, main button, body a, body button')].filter((e) => e.getClientRects().length && /add|create/i.test(e.innerText)).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).slice(0, 10));
        await signOut(page);
    } catch (e) { S.errors.main = String(e.stack || e).slice(0, 600); } finally { await close(); }
    record(`k1-menu-summary-${app.name}`, S);
    if (app.name === 'ojs') {
        note('ccK1: the wizard from its start page on a scratch context demands, in order: Title (TinyMCE `iframe.tox-edit-area__iframe`), the checklist box "Yes, my submission meets all of these requirements." (heading "Submission Checklist" OJS/OPS, "Submission Requirements" OMP; OMP also "Submission Type" with Monograph preselected), "Privacy Consent", then "Begin Submission"; Upload Files needs one file with a genre; Details needs the Abstract on OJS and OPS (`iframe[id*="-abstract-"]`; `iframe[id*="bstract"]` also matches the title editor inside the `titleAbstract` form, which cost one run) — OMP\'s Details requires only the title; OPS adds "For Readers" (radio "This preprint has not been published elsewhere."); the footer "Submit" then a dialog "Submit". Submit is disabled at Review while a required field is missing ("There are one or more problems that need to be fixed before you can submit.").');
        note('ccK1: the front-end user menu (`#navigationUserWrapper`) is a dropdown whose entries are in the DOM but hidden; `getByRole(\'link\')` ignores hidden elements, so read hrefs from the DOM and `goto` them (site home "View Profile" → `/index/en/user/profile`).');
        note('ccK1: the badge on an already-open editorial page does not change when a task arrives (sampled 6 s after the wizard\'s Submit on all three apps); it shows on the next page load. The bell\'s accessible name is the button text "Tasks" / "Tasks 1" (no aria-label).');
        note('ccK1: the discussion form needs the Section Editor to be a stage participant of the submission (`POST scenarios/submission` `participants`), or the form offers only manager and author and the save answers 422. Delete on the discussion task then makes its email\'s Unsubscribe link answer "404 Not Found" (all three apps).');
        note('ccK1: Administration › Hosted Journals "Create Journal" is a link (`getByRole(\'link\', {name: /^Create (Journal|Press|Server)$/})`) opening a Vue side form; wait for `input[type="text"]:visible` (the field ids are `context-name-control-en`, `context-acronym-control-en`, `context-urlPath-control`), not for a `[role=dialog]` input.');
        note('ccK1: `[role="dialog"]:visible` on the editorial dashboard also matches the page itself; wait for `tr.gridRow` inside the last one before reading the Tasks window.');
    }
    return S;
});
