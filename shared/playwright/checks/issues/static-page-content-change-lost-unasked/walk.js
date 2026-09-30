// Issue report walk: docs/issues/U09-A19-static-page-content-change-lost-unasked.md
// (spec U09 register A19, with U03 A19 and U28 A15). Three groups, PARTS=static,profile,review
// (default all): `static` below; `profile` (all apps): `dbarnes` types into
// Profile › Contact "Signature" and presses "Public", then into Public "Bio
// Statement" and presses "Identity", then into "Signature" again and presses
// the site name link at the top left (controls: "Phone" alone, then a tab or the
// link); `review` (OJS submission 12, OMP 17): `jjanssen` accepts the open review
// request, types into "For author and editor" on step 3 and presses "2. Guidelines".
// The neighbour check adds an untouched, a just-saved and a saved-and-reopened
// "Contact" tab and an untouched step 3. `static`: takes the report's Steps
// through the screens on a dataset fleet (PKP's default test dataset,
// harness.md "Dataset fleets"): the manager `rvaca` ticks "Static Pages Plugin"
// on Settings › Website › "Plugins", reloads, opens the "Static Pages" tab, adds
// "u09a19 page" with its text and saves, opens its "Edit" window, adds " and
// more" to "Content" only and presses "Close", opens "Edit" again, adds to
// "Content" again and reloads the page. The controls change "Title" instead,
// then press "Close", and then reload. Step
// numbers are the report's. OPS has no Static Pages plugin and is skipped.
// The kit builds nothing. Every browser question is recorded; a
// "The data on this form has changed" question is answered "Cancel" first
// (the window must keep the text), then the close control is pressed again
// and the question answered "OK".
//
// `neighbour` as the argument walks the neighbour check for the fix instead:
// an untouched "Add Static Page" window closed; a page "u09a19-nb" added with
// "Title", "Path" and "Content" typed and "Save" pressed (the window must
// close with no question and the page be stored with its content); its
// "Edit" window closed untouched (loading saved content must not count as a
// change). Walked with the fix in and out: it must ask nothing either way.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u09a19 node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-unasked/walk.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u09a19 node bin/probe.js all shared/playwright/checks/issues/static-page-content-change-lost-unasked/walk.js
const {forEachApp, launch, signIn, screen, record, idle, loc} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const NEIGHBOUR = process.argv.includes('neighbour');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const GROUPS = (process.env.PARTS || 'static,profile,review').split(',').filter((g) => app.name !== 'ops' || g === 'profile');
    if (!GROUPS.length) { console.log(`[${app.name}] nothing to walk`); return; }
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : 'steps'};
    const SUF = NEIGHBOUR ? '-nb' : '';
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };

    const {page, close} = await launch(app);
    // The browser's questions: `answer` decides each confirm; beforeunload is accepted.
    const dialogs = [];
    let answer = 'dismiss';
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : answer});
        if (d.type() === 'beforeunload' || answer === 'accept') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    const asked = (from) => dialogs.slice(from);

    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}${SUF}`, {...s, ...extra}); return s; };
    const websiteURL = app.url(`/index.php/${app.contextPath}/en/management/settings/website`);
    const openTab = async (id) => { await page.locator(`#${id}-button`).first().click(); await idle(page); await pause(500); };
    const container = () => page.locator('#staticPageGridContainer');
    const win = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('form#staticPageForm')}).last();
    const form = () => win().locator('form#staticPageForm');

    const waitEditor = async () => {
        await form().waitFor({timeout: T});
        await idle(page);
        const id = await form().locator('textarea[id^="content-en"]').first().getAttribute('id');
        await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, id, {timeout: T});
        await pause(500);
        return id;
    };
    const contentOf = (id) => page.evaluate((x) => (window.tinymce && window.tinymce.get(x) ? window.tinymce.get(x).getContent() : null), id);
    const typeContent = async (text) => {
        const frame = win().frameLocator('iframe[id^="content-en"]').first();
        const body = frame.locator('body');
        await body.click();
        await page.keyboard.type(text, {delay: 20});
        await pause(300);
    };
    const closeControl = () => win().getByRole('button', {name: /^Close/}).first();
    const openAdd = async () => {
        const add = container().getByRole('link', {name: 'Add Static Page', exact: true}).first();
        for (let i = 0; i < 3 && !(await form().isVisible().catch(() => false)); i++) {
            await add.click();
            await form().waitFor({timeout: 6000}).catch(() => {});
        }
        return waitEditor();
    };
    // Presses the close control; answers a change question "Cancel" first, then "OK".
    const pressClose = async (label) => {
        const from = dialogs.length;
        answer = 'dismiss';
        await loc(page, 'Static page window: the close control', closeControl());
        await closeControl().click();
        await pause(2000);
        const out = {asked: asked(from).map((d) => d.message), openAfter: await form().isVisible().catch(() => false)};
        if (out.asked.length) {
            out.keptAfterCancel = out.openAfter;
            await snap(`${label}-after-cancel`);
            answer = 'accept';
            await closeControl().click();
            await pause(2000);
            out.openAfterOk = await form().isVisible().catch(() => false);
            answer = 'dismiss';
        }
        await snap(`${label}-closed`);
        return out;
    };

    // ---- shared: a rich-text box by its textarea name, inside a form
    const editorIn = (formSel, prefix) => page.evaluate(([f, nm]) => {
        const ta = [...document.querySelectorAll(`${f} textarea`)].find((t) => (t.getAttribute('name') || '').startsWith(nm));
        if (!ta) return null;
        const e = window.tinymce && window.tinymce.get(ta.id);
        return {id: ta.id, init: !!(e && e.initialized), content: e ? e.getContent() : null, textarea: ta.value};
    }, [formSel, prefix]);
    const waitEditorIn = async (formSel, prefix) => {
        await page.locator(formSel).first().waitFor({state: 'visible', timeout: T});
        await page.waitForFunction(([f, nm]) => {
            const ta = [...document.querySelectorAll(`${f} textarea`)].find((t) => (t.getAttribute('name') || '').startsWith(nm));
            const e = ta && window.tinymce && window.tinymce.get(ta.id);
            return !!(e && e.initialized);
        }, [formSel, prefix], {timeout: T});
        await idle(page); await pause(500);
        return (await editorIn(formSel, prefix)).id;
    };
    const typeIn = async (id, text) => {
        await page.frameLocator(`[id="${id}_ifr"]`).locator('body').click();
        await page.keyboard.type(text, {delay: 20});
        await pause(300);
    };
    const contentById = (id) => page.evaluate((x) => (window.tinymce && window.tinymce.get(x) ? window.tinymce.get(x).getContent() : null), id);
    // Presses a tab; a change question is answered "Cancel" first, then the tab is pressed again and "OK" given.
    const pressTabAsking = async (tab, label) => {
        const from = dialogs.length;
        answer = 'dismiss';
        await tab.click(); await idle(page); await pause(1500);
        const out = {asked: asked(from).map((d) => d.message)};
        if (out.asked.length) {
            await snap(`${label}-after-cancel`);
            out.keptAfterCancel = true;
            answer = 'accept';
            await tab.click(); await idle(page); await pause(1500);
            answer = 'dismiss';
        }
        await snap(`${label}-after-press`);
        return out;
    };

    // ---- Profile (all apps): dbarnes, Contact › "Signature", Public › "Bio Statement"
    const profile = async () => {
        await signIn(page, 'dbarnes');
        const profileTab = (nm) => page.locator(`#profileTabs > ul > li > a[name="${nm}"]`);
        await page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile`)); await idle(page);
        await profileTab('contact').click(); await idle(page);
        let sid = await waitEditorIn('form#contactForm', 'signature');
        await loc(page, 'Profile: the "Public" tab', profileTab('publicProfile'));
        await snap('profile-contact');
        if (!NEIGHBOUR) {
            fact('profileSignatureBefore', await contentById(sid));
            await typeIn(sid, 'u09a19 signature');
            fact('profileSignatureTyped', await editorIn('form#contactForm', 'signature'));
            fact('profileToPublic', await pressTabAsking(profileTab('publicProfile'), 'profile-to-public'));
            fact('profilePublicShown', await page.locator('form#publicProfileForm').isVisible().catch(() => false));
            await profileTab('contact').click(); await idle(page);
            sid = await waitEditorIn('form#contactForm', 'signature');
            fact('profileSignatureBack', await contentById(sid));
            await snap('profile-contact-back');
            await profileTab('publicProfile').click(); await idle(page);
            const bid = await waitEditorIn('form#publicProfileForm', 'biography');
            await typeIn(bid, 'u09a19 biography');
            fact('profileBioTyped', await contentById(bid));
            fact('profileToIdentity', await pressTabAsking(profileTab('identity'), 'profile-to-identity'));
            await profileTab('publicProfile').click(); await idle(page);
            fact('profileBioBack', await contentById(await waitEditorIn('form#publicProfileForm', 'biography')));
            await snap('profile-public-back');
            // Step 15: Signature again, then the site name link at the top left
            await profileTab('contact').click(); await idle(page);
            sid = await waitEditorIn('form#contactForm', 'signature');
            await typeIn(sid, 'u09a19 signature');
            const navLink = async () => {
                const l = page.locator('header a[href$="/publicknowledge/en/index"]').first();
                await loc(page, 'Profile: the site name at the top left (a link to the reader home page)', l);
                return {name: (await l.innerText().catch(() => '')).trim(), l};
            };
            const leaveBy = async (label) => {
                const {name, l} = await navLink();
                const from = dialogs.length;
                await l.click().catch((e) => fact(`${label}Error`, String(e.message || e)));
                await page.waitForLoadState('load').catch(() => {});
                await idle(page).catch(() => {}); await pause(1000);
                return {link: name, asked: asked(from).map((d) => ({type: d.type, message: d.message})), url: page.url().replace(app.baseURL, '')};
            };
            fact('profileLeaveByLink', await leaveBy('profileLeave'));
            await page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile`)); await idle(page);
            await profileTab('contact').click(); await idle(page);
            fact('profileSignatureAfterLeave', await contentById(await waitEditorIn('form#contactForm', 'signature')));
            // Control: "Phone" alone, a link
            await page.locator('form#contactForm input[name="phone"]').fill('555 0199');
            await page.locator('form#contactForm input[name="phone"]').blur();
            fact('profileControlLeave', await leaveBy('profileControlLeave'));
            await page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile`)); await idle(page);
            // Control: "Phone" alone, another tab
            await profileTab('contact').click(); await idle(page);
            await waitEditorIn('form#contactForm', 'signature');
            await page.locator('form#contactForm input[name="phone"]').fill('555 0199');
            await page.locator('form#contactForm input[name="phone"]').blur();
            fact('profileControlPhone', await pressTabAsking(profileTab('publicProfile'), 'profile-control-phone'));
        } else {
            // Untouched Contact, then a saved signature, then untouched again
            fact('nbProfileUntouched', await pressTabAsking(profileTab('publicProfile'), 'nb-profile-untouched'));
            await profileTab('contact').click(); await idle(page);
            sid = await waitEditorIn('form#contactForm', 'signature');
            await typeIn(sid, 'u09a19 saved signature');
            const from = dialogs.length;
            const ws = page.waitForResponse((x) => /profile\/save-?contact|saveContact/i.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await page.locator('form#contactForm').getByRole('button', {name: 'Save', exact: true}).click();
            const rs = await ws; await idle(page); await pause(1500);
            fact('nbProfileSave', {status: rs ? rs.status() : null, asked: asked(from).map((d) => d.message)});
            fact('nbProfileAfterSave', await pressTabAsking(profileTab('publicProfile'), 'nb-profile-after-save'));
            await profileTab('contact').click(); await idle(page);
            sid = await waitEditorIn('form#contactForm', 'signature');
            fact('nbProfileSavedSignature', await contentById(sid));
            fact('nbProfileSavedUntouched', await pressTabAsking(profileTab('publicProfile'), 'nb-profile-saved-untouched'));
        }
    };

    // ---- Review (OJS, OMP): jjanssen accepts the open review request and writes on step 3
    const review = async () => {
        const id = app.name === 'omp' ? 17 : 12;
        await signIn(page, 'jjanssen');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/reviewAssignments`)); await idle(page);
        await snap('review-assignments');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`)); await idle(page); await pause(1000);
        await snap('review-step1');
        const acc = page.getByRole('button', {name: /Accept Review/});
        if (await acc.isVisible().catch(() => false)) {
            const privacy = page.locator('input[name="privacyConsent"]');
            if (await privacy.isVisible().catch(() => false) && !(await privacy.isChecked())) await privacy.check();
            const noCI = page.locator('input[name="competingInterestsOption"][value="noCompetingInterests"]');
            if (await noCI.isVisible().catch(() => false)) await noCI.check();
            await loc(page, 'Review step 1: "Accept Review, Continue to Step #2"', acc);
            await acc.click(); await idle(page); await pause(1500);
        }
        const cont = page.getByRole('button', {name: 'Continue to Step #3'});
        await cont.waitFor({timeout: T});
        await snap('review-step2');
        await cont.click(); await idle(page); await pause(1500);
        const cid = await waitEditorIn('form#reviewStep3Form', 'comments');
        await snap('review-step3');
        const guidelines = page.getByRole('tab', {name: '2. Guidelines'});
        const step3tab = page.getByRole('tab', {name: '3. Download & Review'});
        await loc(page, 'Review: the "2. Guidelines" tab', guidelines);
        if (!NEIGHBOUR) {
            await typeIn(cid, 'u09a19 review text');
            fact('reviewTyped', await editorIn('form#reviewStep3Form', 'comments'));
            fact('reviewToGuidelines', await pressTabAsking(guidelines, 'review-to-guidelines'));
            await step3tab.click(); await idle(page); await pause(1000);
            fact('reviewBack', await contentById(await waitEditorIn('form#reviewStep3Form', 'comments')));
            await snap('review-step3-back');
        } else {
            fact('nbReviewUntouched', await pressTabAsking(guidelines, 'nb-review-untouched'));
        }
    };

    try {
      if (GROUPS.includes('static')) {
        // Steps 1-4
        await signIn(page, 'rvaca');
        await page.goto(websiteURL); await idle(page);
        await openTab('plugins');
        const row = page.locator('tr.gridRow[id$="-row-staticpagesplugin"]').first();
        await row.waitFor({timeout: T});
        const box = row.getByRole('checkbox').first();
        await loc(page, 'Plugins: the "Static Pages Plugin" checkbox', box);
        const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
        fact('pluginWasTicked', await box.isChecked());
        if (!(await box.isChecked())) await box.click();
        const r = await w;
        await pause(800);
        await snap('plugin-ticked', {enableStatus: r ? r.status() : null});
        await page.goto(websiteURL); await idle(page);
        await openTab('staticPages');
        await container().waitFor({timeout: T});
        await idle(page);
        await snap('static-pages-tab');

        if (!NEIGHBOUR) {
            // Step 5: add a page with its text, Save
            const id0 = await openAdd();
            await form().locator('input[name="path"]').fill('u09a19');
            await form().locator('input[name="title[en]"]').fill('u09a19 page');
            await typeContent('u09a19 saved text');
            await form().locator('input[name="path"]').click();
            await pause(500);
            const ws = page.waitForResponse((x) => /update-?static-?page/i.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await win().getByRole('button', {name: 'Save', exact: true}).click();
            const rs = await ws; await idle(page); await pause(1500);
            fact('step5Save', {status: rs ? rs.status() : null, windowOpen: await form().isVisible().catch(() => false)});
            await snap('step5-saved');
            // Step 6: Edit
            const openEdit = async () => {
                await openTab('staticPages').catch(() => {});
                const row = container().locator('tr.gridRow').filter({hasText: 'u09a19 page'}).first();
                await row.waitFor({timeout: T});
                await row.locator('a.show_extras, button.show_extras').first().click().catch(() => {});
                await pause(300);
                await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).first().click()
                    .catch(async () => { await container().getByRole('link', {name: 'Edit', exact: true}).first().click(); });
                return waitEditor();
            };
            const addMore = async () => {
                await win().frameLocator('iframe[id^="content-en"]').first().locator('body').click();
                await page.keyboard.press('Control+End');
                await page.keyboard.type(' and more', {delay: 20});
                await pause(300);
            };
            let id = await openEdit();
            fact('step6Content', await contentOf(id));
            // Step 7-8: add to Content only, Close
            await addMore();
            fact('step7Content', await contentOf(id));
            fact('step7Textarea', await form().locator(`textarea#${id}`).inputValue().catch(() => null));
            await snap('step7-typed');
            fact('step8', await pressClose('step8'));
            // Step 9: Edit again
            id = await openEdit();
            fact('step9Content', await contentOf(id));
            await snap('step9-reopened');
            // Step 10: add to Content again, reload
            await addMore();
            let from = dialogs.length;
            await page.reload().catch((e) => fact('reloadError', String(e.message || e)));
            await idle(page).catch(() => {});
            await pause(1000);
            fact('step10', {asked: asked(from).map((d) => ({type: d.type, message: d.message})), url: page.url().replace(app.baseURL, '')});
            await snap('step10-reloaded');
            // Controls: "Title" changed, then Close; then "Title" changed and a reload
            await openTab('staticPages');
            await container().waitFor({timeout: T});
            await openEdit();
            await form().locator('input[name="title[en]"]').fill('u09a19 page changed');
            await form().locator('input[name="title[en]"]').blur();
            await pause(300);
            fact('control', await pressClose('control'));
            await openEdit();
            await form().locator('input[name="title[en]"]').fill('u09a19 page changed');
            await form().locator('input[name="title[en]"]').blur();
            await pause(300);
            from = dialogs.length;
            await page.reload().catch((e) => fact('controlReloadError', String(e.message || e)));
            await idle(page).catch(() => {});
            await pause(1000);
            fact('controlReload', {asked: asked(from).map((d) => ({type: d.type, message: d.message}))});
        } else {
            // Untouched Add window
            await openAdd();
            fact('untouchedAdd', await pressClose('nb-untouched-add'));
            // Add a page with Content, Save
            const id = await openAdd();
            await form().locator('input[name="title[en]"]').fill('u09a19 neighbour');
            await typeContent('u09a19 saved text');
            // "Path" last: leaving "Content" closes its other-language box over "Save"
            await form().locator('input[name="path"]').click();
            await form().locator('input[name="path"]').fill('u09a19-nb');
            await pause(500);
            const from = dialogs.length;
            const save = win().getByRole('button', {name: 'Save', exact: true});
            const ws = page.waitForResponse((x) => /update-?static-?page/i.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await save.click();
            const rs = await ws;
            await idle(page); await pause(2000);
            fact('save', {status: rs ? rs.status() : null, asked: asked(from).map((d) => d.message), windowOpen: await form().isVisible().catch(() => false)});
            fact('listed', await container().locator('tr.gridRow').allInnerTexts().then((a) => a.map((s) => s.replace(/\s+/g, ' ').trim())));
            await snap('nb-saved');
            // Edit of the saved page, untouched
            const editRow = container().locator('tr.gridRow').filter({hasText: 'u09a19 neighbour'}).first();
            await editRow.locator('a.show_extras, button.show_extras').first().click().catch(() => {});
            await pause(300);
            await editRow.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).first().click()
                .catch(async () => { await container().getByRole('link', {name: 'Edit', exact: true}).first().click(); });
            const eid = await waitEditor();
            fact('editContent', await contentOf(eid));
            fact('untouchedEdit', await pressClose('nb-untouched-edit'));
            const pub = await page.goto(app.url(`/index.php/${app.contextPath}/en/u09a19-nb`));
            await idle(page).catch(() => {});
            fact('publicPage', {status: pub ? pub.status() : null, hasText: (await page.locator('body').innerText()).includes('u09a19 saved text')});
        }
      }
      if (GROUPS.includes('profile')) await profile();
      if (GROUPS.includes('review')) await review();
    } finally {
        fact('dialogs', dialogs);
        record(`facts${SUF}`, facts);
        await close();
    }
});
