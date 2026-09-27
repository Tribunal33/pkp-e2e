const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U08 claim check K1, the second half of k1.js (same state file, same run):
//   items    the item window on I: fields per type, refusals (td2), lengths,
//            "Preview", saves; query parameters (td3)
//   types    every item type in I's header, per visitor
//   flips    each condition's other end where a settings screen flips it
//   delete   td10 on D; both tables emptied (the "Empty" column)
//   lang     M (en + fr_CA forms): Title boxes, titles in French (Rule 2)
//   site     Administration › Site Settings › Site Setup › "Navigation" (Rule
//            1b, Rule 2's site list, td9, A4): tables, whether the menu window
//            opens (Add Menu, title, Edit), the item window's types; changes
//            nothing (the site's menus are read from the database before and after)
//   control  publicknowledge's tables again (Rule 1)
const {execFileSync} = require('child_process');
const {launch, signIn, signOut, screen, shot, record, loc, note, idle} = require('../../../probe');

module.exports = async function more({app, S, on, log, sleep, T, helpers: H}) {
    const {A, I, D, M} = S;
    const {ctxUrl, snap, as, watchDialogs, openNav, menusTable, grids, rowControls, rowAction, editor, menuWindow, openMenu, panels, brief, panelItem, drag, dialogs, notice, pressWindowButton, saveMenu, header, flat, archivesLike} = H;

    const itemWindow = (page) => page.locator('[role="dialog"]:visible').filter({has: page.locator('form#navigationMenuItemsForm')}).first();
    async function openItemWindow(page, how, title) {
        if (how === 'add') await page.getByRole('link', {name: 'Add item', exact: true}).click();
        else await rowAction(page, 'items', title, 'Edit');
        await itemWindow(page).locator('select[name="menuItemType"]').waitFor({timeout: T});
        await idle(page);
        await sleep(600);
    }
    /** The item window as data: heading, visible fields (name, maxlength, value), the line under the type list, visible errors, the Save state. */
    async function itemState(page) {
        return itemWindow(page).evaluate((w) => {
            const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
            const sel = w.querySelector('select[name="menuItemType"]');
            return {
                heading: w.querySelector('h1')?.innerText.trim() ?? null,
                type: sel ? sel.options[sel.selectedIndex]?.text : null,
                typeOptions: sel ? [...sel.options].map((o) => o.text) : null,
                typeLine: w.querySelector('#menuItemTypeSection .sub_label, #menuItemTypeSection label.sub_label')?.innerText.trim() ?? null,
                fields: [...w.querySelectorAll('input[name], textarea[name], select[name]')].filter((e) => e.type !== 'hidden' && (vis(e) || (e.tagName === 'TEXTAREA' && e.closest('.section') && vis(e.closest('.section'))))).map((e) => ({name: e.name, maxlength: e.getAttribute('maxlength'), value: (e.value || '').slice(0, 40), valueLength: (e.value || '').length})),
                labels: [...w.querySelectorAll('label')].filter(vis).map((l) => l.innerText.trim()).filter(Boolean),
                errors: [...w.querySelectorAll('label.error, .error, .pkp_form_error, .pkp_form_error_list, #formErrors, .pkpFormField__error, [class*="error"]')].filter(vis).map((e) => ({text: e.innerText.replace(/\s+/g, ' ').trim(), cls: String(e.className).slice(0, 40), for: e.getAttribute('for'), near: e.closest('.section')?.querySelector('label')?.innerText.trim() ?? null})).filter((e) => e.text),
                buttons: [...w.querySelectorAll('button, a.cancelButton, a.pkp_button')].filter(vis).map((b) => b.innerText.trim()).filter(Boolean),
                visibleText: [...w.querySelectorAll('#NMI_TYPE_CUSTOM p, #NMI_TYPE_CUSTOM blockquote, .description')].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
            };
        }).catch((e) => ({error: String(e.message || e)}));
    }
    const itemPosts = [];
    const watchItemPosts = (page) => page.on('response', async (r) => {
        if (!/update-navigation-menu-item/.test(r.url())) return;
        let body = null;
        try { body = await r.json(); } catch { body = null; }
        const html = body && typeof body.content === 'string' ? body.content : '';
        const errs = [...html.matchAll(/<(?:span|label|li|p)[^>]*class="[^"]*error[^"]*"[^>]*>([\s\S]*?)<\/(?:span|label|li|p)>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
        itemPosts.push({status: r.status(), body: body && !body.status ? JSON.stringify(body).slice(0, 300) : undefined, jsonStatus: body ? body.status : null, contentLength: html.length, errorsInReturnedForm: errs, hasEvent: !!(body && body.event)});
    });
    async function itemSave(page) {
        const n0 = itemPosts.length;
        await itemWindow(page).getByRole('button', {name: 'Save', exact: true}).click();
        const n = await notice(page, /successfully|not saved|error/i, 4000);
        await idle(page);
        await sleep(700);
        const open = await itemWindow(page).isVisible().catch(() => false);
        const hiddenErrors = open ? await itemWindow(page).evaluate((w) => [...w.querySelectorAll('label.error, span.error, .error')].map((e) => ({text: e.innerText || e.textContent, visible: !!(e.offsetWidth || e.offsetHeight), for: e.getAttribute('for')})).filter((e) => (e.text || '').trim())).catch(() => null) : null;
        return {notice: n, windowOpen: open, posts: itemPosts.slice(n0), hiddenErrors, state: open ? await itemState(page) : null};
    }
    async function closeItemWindow(page) {
        if (!(await itemWindow(page).isVisible().catch(() => false))) return null;
        await itemWindow(page).getByRole('button', {name: 'Close', exact: true}).click();
        await sleep(600);
        const d = await dialogs(page);
        const w = page.locator('[role="dialog"]:visible').filter({hasText: 'The data on this form has changed'});
        if (await w.count()) { await w.getByRole('button', {name: 'Yes', exact: true}).click(); await sleep(400); }
        return d;
    }
    const setType = async (page, label) => { await itemWindow(page).locator('select[name="menuItemType"]').selectOption({label}); await sleep(400); };
    const fillTitle = (page, v, loc = 'en') => itemWindow(page).locator(`input[name="title[${loc}]"]`).fill(v);

    // ---- items: the item window (td2, lengths, Preview, saves) and query parameters (td3) ----
    if (on('items')) {
        const {page, close} = await launch(app);
        const bd = watchDialogs(page);
        watchItemPosts(page);
        try {
            const out = {};
            await as(page, I.users.mgr, I.path);
            await openNav(page, app, I.path);
            await openItemWindow(page, 'add');
            out.opened = await itemState(page);
            await snap(page, '90-items-add-window', out.opened);
            await loc(page, 'item window: "Navigation Menu Type"', itemWindow(page).locator('select[name="menuItemType"]'));
            // each type: the line under the list and the boxes it adds
            out.perType = {};
            for (const label of out.opened.typeOptions.slice(1)) {
                await setType(page, label);
                const st = await itemState(page);
                out.perType[label] = {typeLine: st.typeLine, fields: st.fields.map((f) => `${f.name}${f.maxlength ? '(' + f.maxlength + ')' : ''}`), labels: st.labels};
            }
            record('91-items-per-type', out.perType);
            await setType(page, 'Choose a type...');
            out.backToChoose = await itemState(page);
            // td2 (1): "Test", no type
            await fillTitle(page, 'Test');
            out.td2_1 = await itemSave(page);
            await snap(page, '92-items-td2-1-no-type', out.td2_1);
            // td2 (2): Remote URL "pkp.sfu.ca"
            await setType(page, 'Remote URL');
            await itemWindow(page).locator('input[name="remoteUrl[en]"]').fill('pkp.sfu.ca');
            out.td2_2 = await itemSave(page);
            await snap(page, '93-items-td2-2-url', out.td2_2);
            // td2 (3): Custom Page "my page"
            await setType(page, 'Custom Page');
            await itemWindow(page).locator('input[name="path"]').fill('my page');
            out.td2_3 = await itemSave(page);
            await snap(page, '94-items-td2-3-path', out.td2_3);
            // td2 (4): Title emptied
            await fillTitle(page, '');
            await itemWindow(page).locator('input[name="path"]').fill('mypage');
            out.td2_4 = await itemSave(page);
            await snap(page, '95-items-td2-4-no-title', out.td2_4);
            // lengths: 300 characters typed into Title
            await fillTitle(page, 'x'.repeat(300));
            out.titleLength = await itemWindow(page).locator('input[name="title[en]"]').evaluate((e) => e.value.length);
            await itemWindow(page).locator('input[name="title[en]"]').fill('');
            await itemWindow(page).locator('input[name="title[en]"]').pressSequentially('y'.repeat(260), {delay: 0});
            out.titleTypedLength = await itemWindow(page).locator('input[name="title[en]"]').evaluate((e) => e.value.length);
            // a valid Custom Page, with "Preview" first
            await fillTitle(page, 'U08 page');
            await itemWindow(page).locator('input[name="path"]').fill('u08-page');
            const ed = await page.evaluate(() => (window.tinymce ? (window.tinymce.get() || []).map((e) => e.id) : []));
            const cid = ed.find((id) => /content/.test(id));
            if (cid) await page.evaluate(([id]) => window.tinymce.get(id).setContent('<p>Hello from U08 preview</p>'), [cid]);
            out.preview = {};
            const previewBtn = itemWindow(page).getByRole('button', {name: 'Preview', exact: true}).or(itemWindow(page).getByRole('link', {name: 'Preview', exact: true})).first();
            await loc(page, 'item window: "Preview"', previewBtn);
            const [popup] = await Promise.all([page.context().waitForEvent('page', {timeout: 8000}).catch(() => null), previewBtn.click().catch((e) => { out.preview.error = String(e.message).split('\n')[0]; })]);
            if (popup) {
                await popup.waitForLoadState().catch(() => {});
                out.preview.url = popup.url();
                out.preview.text = (await popup.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 600);
                await popup.screenshot({path: require('path').join(require('../../../probe').outDir(), `96-items-preview-${app.name}.png`)}).catch(() => {});
                await popup.close();
            }
            out.saveCustom = await itemSave(page);
            await snap(page, '97-items-custom-saved', {saveCustom: out.saveCustom});
            // the same path again
            await openNav(page, app, I.path);
            await openItemWindow(page, 'add');
            await fillTitle(page, 'U08 page 2');
            await setType(page, 'Custom Page');
            await itemWindow(page).locator('input[name="path"]').fill('u08-page');
            out.dupPath = await itemSave(page);
            await snap(page, '98-items-dup-path', out.dupPath);
            await closeItemWindow(page);
            // a valid Remote URL
            await openNav(page, app, I.path);
            await openItemWindow(page, 'add');
            await fillTitle(page, 'U08 remote');
            await setType(page, 'Remote URL');
            await itemWindow(page).locator('input[name="remoteUrl[en]"]').fill('https://pkp.sfu.ca/');
            out.saveRemote = await itemSave(page);
            await openNav(page, app, I.path);
            out.gridsAfter = await grids(page);
            // td3: query parameters on the archive-like item
            const al = archivesLike(app);
            await openItemWindow(page, 'edit', al);
            out.td3Opened = await itemState(page);
            await itemWindow(page).locator('input[name="queryParams[en]"]').fill('tab=x');
            out.qpLength = await itemWindow(page).locator('input[name="queryParams[en]"]').evaluate((e) => e.getAttribute('maxlength'));
            out.td3Save = await itemSave(page);
            await snap(page, '99-items-td3-saved', out.td3Save);
            const h = await header(page, app, I.path);
            out.td3Header = h.primary;
            // an item's Edit window leaves with an unsaved change: what does it ask?
            await openNav(page, app, I.path);
            await openItemWindow(page, 'edit', 'Search');
            await fillTitle(page, 'Search changed');
            out.itemLeave = await closeItemWindow(page);
            record('9a-items-summary', {...out, browserDialogs: bd});
            log(app.name, 'items', JSON.stringify({opened: {heading: out.opened.heading, typeLine: out.opened.typeLine, fields: out.opened.fields, labels: out.opened.labels, buttons: out.opened.buttons}, backToChoose: out.backToChoose.typeLine}));
            for (const k of ['td2_1', 'td2_2', 'td2_3', 'td2_4', 'dupPath', 'saveCustom', 'saveRemote', 'td3Save']) log(app.name, 'items', k, JSON.stringify({notice: out[k].notice, open: out[k].windowOpen, posts: out[k].posts, hidden: out[k].hiddenErrors, errors: out[k].state && out[k].state.errors}));
            log(app.name, 'items lengths', out.titleLength, out.titleTypedLength, 'qp maxlength', out.qpLength, 'preview', JSON.stringify(out.preview));
            log(app.name, 'items td3 header', JSON.stringify(out.td3Header), 'itemLeave', JSON.stringify(out.itemLeave && out.itemLeave.map((d) => d.name)));
            for (const [k, v] of Object.entries(out.perType)) log(app.name, 'type', k, '|', v.typeLine, '|', v.fields.join(' '));
        } finally { await close(); }
    }

    // ---------------------------------------------------------------------------
    // settings-form helpers (the idioms of U07 K3)
    const flat1 = (t, n = 300) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n);
    async function waitMce(page, id) {
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T});
    }
    async function mceSet(page, id, text) {
        await waitMce(page, id);
        const body = page.frameLocator(`#${id}_ifr`).locator('body');
        await body.click();
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
        if (text) await page.keyboard.type(text);
        await sleep(300);
        return page.evaluate((i) => window.tinymce.get(i).getContent(), id).catch(() => null);
    }
    async function saveForm(page, inner) {
        const form = page.locator('form').filter({has: page.locator(inner)}).first();
        const w = page.waitForResponse((r) => /\/api\/v1\/(contexts|site)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const resp = await w;
        const saved = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        const errors = await form.locator('.pkpFieldError').allInnerTexts().catch(() => []);
        return {status: resp ? resp.status() : null, saved, errors};
    }
    async function openSettings(page, ctx, section, top, side) {
        await page.goto('about:blank');
        await page.goto(ctxUrl(app, ctx, `/management/settings/${section}`));
        await idle(page);
        if (top) { await page.locator(`#${top}-button`).first().click(); await idle(page); await sleep(400); }
        if (side) { await page.getByRole('tab', {name: side, exact: true}).filter({visible: true}).first().click(); await idle(page); await sleep(500); }
    }
    /** The header items of every menu by title: shown?, href, target. */
    const index = (h) => {
        const o = {};
        const walk = (list, where) => (list || []).forEach((n) => { o[n.title.split('\n')[0].trim()] = {where, href: n.href, target: n.target}; if (n.children) walk(n.children, where + '>' + n.title.split('\n')[0].trim()); });
        walk(h.primary, 'primary');
        walk(h.user, 'user');
        return o;
    };

    // ---- types: each item type in I's header per visitor; each condition's other end ----
    if (on('types')) {
        const {page, close} = await launch(app);
        try {
            const out = {created: {}, headers: {}, flips: {}};
            await as(page, I.users.mgr, I.path);
            await openNav(page, app, I.path);
            // one item of each type the installed items lack
            await openItemWindow(page, 'add');
            const typeOptions = (await itemState(page)).typeOptions.slice(1);
            out.typeOptions = typeOptions;
            await closeItemWindow(page);
            const installed = {Custom: 'U08 page', 'Remote URL': 'U08 remote'};
            const want = typeOptions.filter((t) => ['Current Issue', 'Subscriptions', 'My Subscriptions', 'New Releases', 'Catalog', 'Series', 'Category', 'Editorial Masthead', 'Submissions', 'Search'].includes(t));
            for (const t of want) {
                await openNav(page, app, I.path);
                await openItemWindow(page, 'add');
                await fillTitle(page, `T ${t}`);
                await setType(page, t);
                const sel = itemWindow(page).locator('select[name="relatedSectionId"], select[name="relatedCategoryId"], select[name*="related"]');
                if (await sel.count()) { out.created[t + ' list'] = await sel.first().evaluate((s) => [...s.options].map((o) => o.text)); await sel.first().selectOption({index: 1}).catch(() => {}); }
                out.created[t] = await itemSave(page);
                out.created[t] = {notice: out.created[t].notice, open: out.created[t].windowOpen, posts: out.created[t].posts};
                if (out.created[t].open) await closeItemWindow(page);
            }
            // the primary menu holds every non-user item
            await openNav(page, app, I.path);
            await openMenu(page, 'Primary Navigation Menu');
            const userTypes = /^(Register|Login|Dashboard|View Profile|Administration|Logout)$/;
            let guard = 0;
            while (guard++ < 30) {
                const p = await panels(page);
                const next = p.unassigned.items.find((i) => !userTypes.test(i.title) && i.title !== I.users.mgr);
                if (!next) break;
                const last = p.assigned.items.filter((i) => i.level === 0).slice(-1)[0];
                await drag(page, 'unassigned', next.title, panelItem(page, 'assigned', last.title), 'bottom');
            }
            out.primary = brief(await panels(page));
            out.primarySave = await saveMenu(page);
            await snap(page, 'a0-types-primary', {primary: out.primary});
            // the header per visitor
            const visit = async (who) => {
                if (who === 'out') await signOut(page).catch(() => {});
                else await as(page, who === 'admin' ? 'admin' : I.users[who], I.path);
                const h = await header(page, app, I.path);
                return index(h);
            };
            for (const who of ['out', 'mgr', 'rd', 'admin']) out.headers[who] = await visit(who);
            await snap(page, 'a1-types-header-admin');
            // the Custom Page and the Remote URL when followed
            await signOut(page).catch(() => {});
            const hh = await header(page, app, I.path);
            const ix = index(hh);
            if (ix['U08 page']) { await page.goto(ix['U08 page'].href); await idle(page); out.customPage = {url: page.url(), title: await page.title(), h1: await page.locator('h1, h2.page_title, .page_title').first().innerText().catch(() => null)}; }
            if (ix['U08 remote']) out.remote = ix['U08 remote'];
            record('a3-types-summary', out);
            log(app.name, 'types options', JSON.stringify(out.typeOptions), 'created', JSON.stringify(Object.fromEntries(Object.entries(out.created).map(([k, v]) => [k, v.notice || v]))));
            for (const [who, ix2] of Object.entries(out.headers)) log(app.name, 'types header', who, JSON.stringify(Object.fromEntries(Object.entries(ix2).map(([k, v]) => [k, `${v.where} ${String(v.href).replace(/^https?:\/\/[^/]+/, '')}${v.target ? ' target=' + v.target : ''}`]))));
            log(app.name, 'types custom', JSON.stringify(out.customPage), 'remote', JSON.stringify(out.remote));
        } finally { await close(); }
    }

    // ---- flips: each condition's other end on I, the header read after each ----
    if (on('flips')) {
        const {page, close} = await launch(app);
        try {
            const out = {flips: {}};
            const visit = async (who) => {
                if (who === 'out') await signOut(page).catch(() => {});
                else await as(page, who === 'admin' ? 'admin' : I.users[who], I.path);
                const h = await header(page, app, I.path);
                return index(h);
            };
            // the About page as found (its text empty or not), and the seeded journal's header (read only)
            await signOut(page).catch(() => {});
            await page.goto(ctxUrl(app, I.path, '/about')); await idle(page);
            out.aboutPage = {url: page.url(), text: flat1(await page.locator('.page_about, .page, main, .pkp_structure_main').first().innerText().catch(() => ''), 600)};
            await snap(page, 'a4-flips-about-page', out.aboutPage);
            await as(page, I.users.mgr, I.path);
            const flip = async (name, fn, whoRead = ['out', 'mgr']) => {
                try {
                    const r = await fn();
                    const reads = {};
                    for (const who of whoRead) reads[who] = await visit(who);
                    await as(page, I.users.mgr, I.path);
                    out.flips[name] = {r, reads};
                } catch (e) {
                    out.flips[name] = {error: String(e.message || e).split('\n')[0]};
                    await as(page, I.users.mgr, I.path).catch(() => {});
                }
                log(app.name, 'flip', name, JSON.stringify(out.flips[name].r || out.flips[name].error).slice(0, 400));
            };
            // announcements on
            await flip('announcements on', async () => {
                await openSettings(page, I.path, 'website', 'setup', null);
                await page.locator('#announcements-button').click(); await idle(page); await sleep(500);
                const box = page.locator('input[name="enableAnnouncements"]').first();
                const labels = await page.locator('input[type=checkbox]').evaluateAll((els) => els.filter((e) => e.getClientRects().length || e.closest('label')?.getClientRects().length).map((e) => ({name: e.name, label: e.closest('label')?.innerText.trim()})));
                await box.check({force: true});
                const r = await saveForm(page, 'input[name="enableAnnouncements"]');
                return {...r, labels};
            });
            // privacy statement emptied
            await flip('privacy emptied', async () => {
                await openSettings(page, I.path, 'website', 'setup', 'Privacy Statement');
                await mceSet(page, 'privacy-privacyStatement-control-en', '');
                return saveForm(page, '#privacy-privacyStatement-control-en');
            });
            // registration closed
            await flip('registration closed', async () => {
                await openSettings(page, I.path, 'access', null, null);
                const tab = page.getByRole('tab', {name: 'Site Access Options', exact: true}).first();
                if (await tab.count()) { await tab.click(); await idle(page); await sleep(500); }
                const radios = await page.locator('input[name="disableUserReg"]').evaluateAll((els) => els.map((e) => ({value: e.value, label: e.closest('label')?.innerText.trim() || e.parentElement?.innerText.trim(), checked: e.checked})));
                const off = page.locator('input[name="disableUserReg"][value="true"]').first();
                await off.check({force: true});
                const r = await saveForm(page, 'input[name="disableUserReg"]');
                return {...r, radios};
            }, ['out']);
            // contact: principal name and mailing address emptied (support contact filled, the form asks for it)
            await flip('contact emptied', async () => {
                await openSettings(page, I.path, 'context', 'contact', null);
                const names = await page.locator('form input[name], form textarea[name]').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.name));
                const f = (n) => page.locator(`form [name="${n}"]`).first();
                if (await f('contactName').count()) await f('contactName').fill('');
                const addr = page.locator('textarea[id*="mailingAddress"], [name="mailingAddress"]').first();
                if (await addr.count()) await addr.fill('').catch(() => {});
                if (await f('supportName').count()) await f('supportName').fill('Support Person');
                if (await f('supportEmail').count()) await f('supportEmail').fill('support@mail.test');
                const r = await saveForm(page, '[name="contactName"]');
                const flagged = await page.locator('form').filter({has: page.locator('[name="contactName"]')}).first().evaluate((f) => [...f.querySelectorAll('.pkpFieldError')].map((e) => ({err: e.innerText.trim(), field: e.closest('.pkpFormField')?.querySelector('label')?.innerText.trim()})));
                await snap(page, 'a5-flips-contact-refused', {flagged});
                return {...r, names, flagged};
            }, ['out']);
            // publishing / posting mode: not online (OJS, OPS)
            if (app.name !== 'omp') await flip('publishing none', async () => {
                await openSettings(page, I.path, 'distribution', 'access', null);
                const radios = await page.locator('input[name="publishingMode"]').evaluateAll((els) => els.map((e) => ({value: e.value, label: e.closest('label')?.innerText.trim() || e.parentElement?.innerText.trim(), checked: e.checked})));
                const none = page.getByLabel(/will not be used to (publish|post)/).first();
                await none.check({force: true});
                const r = await saveForm(page, 'input[name="publishingMode"]');
                return {...r, radios};
            }, ['out']);
            // payments set up, then subscription mode (OJS)
            if (app.name === 'ojs') {
                await flip('payments on', async () => {
                    await openSettings(page, I.path, 'distribution', 'payments', null);
                    const enable = page.locator('input[name="paymentsEnabled"]').first();
                    if (!(await enable.isChecked().catch(() => false))) await enable.check({force: true});
                    await sleep(500);
                    await page.locator('select[name="currency"]').first().selectOption({label: 'US Dollar'}).catch(() => {});
                    await page.locator('select[name="paymentPluginName"]').first().selectOption({label: 'Manual Fee Payment'}).catch(() => {});
                    await sleep(600);
                    const instr = page.locator('textarea[name*="manualInstructions"], input[name*="manualInstructions"]').first();
                    if (await instr.count()) await instr.fill('U08 manual payment instructions');
                    return saveForm(page, 'input[name="paymentsEnabled"]');
                }, ['out', 'mgr']);
                await flip('subscription mode', async () => {
                    await openSettings(page, I.path, 'distribution', 'access', null);
                    await page.getByLabel(/require subscriptions/).first().check({force: true});
                    return saveForm(page, 'input[name="publishingMode"]');
                }, ['out', 'mgr']);
            }
            // OMP: the types list on the seeded press (read, not saved)
            if (app.name === 'omp') {
                await as(page, 'manager.maya', 'publicknowledge');
                await openNav(page, app, 'publicknowledge');
                await openItemWindow(page, 'add');
                out.pkTypeOptions = (await itemState(page)).typeOptions;
                for (const t of ['Series', 'Category']) {
                    if (!out.pkTypeOptions.includes(t)) continue;
                    await setType(page, t);
                    const st = await itemState(page);
                    out[`pk${t}`] = {typeLine: st.typeLine, labels: st.labels, options: await itemWindow(page).locator('select:not([name="menuItemType"])').first().evaluate((s) => [...s.options].map((o) => o.text)).catch(() => null)};
                }
                await snap(page, 'a2-types-omp-pk-item-window', {pkTypeOptions: out.pkTypeOptions});
                await closeItemWindow(page);
            }
            record('a6-flips-summary', out);
            log(app.name, 'about page', JSON.stringify(out.aboutPage));
            for (const [k, v] of Object.entries(out.flips)) log(app.name, 'flip result', k, JSON.stringify(v.error || Object.fromEntries(Object.entries(v.reads).map(([w, ix2]) => [w, Object.keys(ix2)]))));
            if (out.pkTypeOptions) log(app.name, 'omp pk types', JSON.stringify(out.pkTypeOptions), JSON.stringify(out.pkSeries), JSON.stringify(out.pkCategory));
        } finally { await close(); }
    }

    // ---- delete: td10 on D, Rule 9, both tables emptied ----
    if (on('delete')) {
        const {page, close} = await launch(app);
        try {
            const out = {};
            const confirmDialog = () => page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible, .pkp_modal_confirmation:visible, [data-cy="dialog"]:visible').filter({hasText: /Are you sure/}).last();
            const removeRow = async (which, title, answer) => {
                await rowAction(page, which, title, 'Remove');
                await sleep(500);
                const d = await dialogs(page);
                const cd = confirmDialog();
                const buttons = await cd.locator('button, a').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()).filter(Boolean)).catch(() => []);
                const btn = cd.getByRole('button', {name: answer, exact: true}).or(cd.getByRole('link', {name: answer, exact: true})).first();
                await btn.click();
                const n = answer === 'OK' ? await notice(page, /successfully removed/, 5000) : null;
                await idle(page); await sleep(600);
                return {dialogs: d, buttons, notice: n};
            };
            await as(page, D.users.mgr, D.path);
            // (1) "Contact" renamed "Reach us"
            await openNav(page, app, D.path);
            await openItemWindow(page, 'edit', 'Contact');
            out.contactOpened = await itemState(page);
            await fillTitle(page, 'Reach us');
            out.rename = await itemSave(page);
            out.rename = {notice: out.rename.notice, open: out.rename.windowOpen};
            const h1 = await header(page, app, D.path);
            out.h1 = flat(h1.primary);
            await snap(page, 'b0-delete-renamed-header', {h1: out.h1});
            // (2) "Remove" on the top-level "About" item: Cancel, then OK
            await openNav(page, app, D.path);
            out.aboutCancel = await removeRow('items', 'About', 'Cancel');
            out.gridsAfterCancel = await grids(page);
            await snap(page, 'b1-delete-about-cancelled', {g: out.gridsAfterCancel});
            out.aboutOk = await removeRow('items', 'About', 'OK');
            out.gridsAfterAbout = await grids(page);
            await snap(page, 'b2-delete-about-removed', {g: out.gridsAfterAbout});
            const h2 = await header(page, app, D.path);
            out.h2 = flat(h2.primary);
            await signOut(page).catch(() => {});
            const h2o = await header(page, app, D.path);
            out.h2out = flat(h2o.primary);
            await as(page, D.users.mgr, D.path);
            await openNav(page, app, D.path);
            await openMenu(page, 'Primary Navigation Menu');
            out.primaryAfterAbout = brief(await panels(page));
            await snap(page, 'b3-delete-primary-window-after-about', out.primaryAfterAbout);
            await pressWindowButton(page, 'Cancel');
            // a second menu holding "Submissions" (also in the primary menu)
            await openNav(page, app, D.path);
            await page.getByRole('link', {name: 'Add Menu', exact: true}).click();
            await editor(page).waitFor({timeout: T}); await idle(page); await sleep(500);
            await menuWindow(page).locator('input[name="title"]').fill('Footer links');
            await drag(page, 'unassigned', 'Submissions', editor(page).locator('[data-cy="panel-content-assigned"]'), 'center');
            out.footer = await saveMenu(page);
            // (3) "Remove" on the primary menu › OK
            await openNav(page, app, D.path);
            out.gridsBeforeMenu = await grids(page);
            out.menuOk = await removeRow('menus', 'Primary Navigation Menu', 'OK');
            await snap(page, 'b4-delete-primary-removed', out.menuOk);
            out.gridsAfterMenu = await grids(page);
            const h3 = await header(page, app, D.path);
            out.h3 = {primary: flat(h3.primary), row: h3.primaryRowText, user: flat(h3.user)};
            await signOut(page).catch(() => {});
            const h3o = await header(page, app, D.path);
            out.h3out = {primary: flat(h3o.primary), row: h3o.primaryRowText, user: flat(h3o.user)};
            await snap(page, 'b5-delete-header-signed-out');
            await as(page, D.users.mgr, D.path);
            await openNav(page, app, D.path);
            await openMenu(page, 'Footer links');
            out.footerAfter = brief(await panels(page));
            await pressWindowButton(page, 'Cancel');
            // (4) every menu removed, then every item
            await openNav(page, app, D.path);
            for (const r of (await grids(page)).menus.rows) await removeRow('menus', r.title, 'OK');
            await openNav(page, app, D.path);
            out.noMenus = await grids(page);
            await snap(page, 'b6-delete-no-menus', {g: out.noMenus});
            let guard = 0;
            while (guard++ < 40) {
                const g = await grids(page);
                if (!g.items.rows.length) break;
                await removeRow('items', g.items.rows[0], 'OK');
            }
            await openNav(page, app, D.path);
            out.noItems = await grids(page);
            await snap(page, 'b7-delete-no-items', {g: out.noItems});
            await page.getByRole('link', {name: 'Add Menu', exact: true}).click();
            await editor(page).waitFor({timeout: T}); await idle(page); await sleep(500);
            out.addMenuEmpty = brief(await panels(page));
            await snap(page, 'b8-delete-add-menu-no-items', out.addMenuEmpty);
            await pressWindowButton(page, 'Cancel');
            record('b9-delete-summary', out);
            log(app.name, 'delete', JSON.stringify({contactTypeLine: out.contactOpened.typeLine, rename: out.rename, h1: out.h1, aboutCancel: {buttons: out.aboutCancel.buttons, d: out.aboutCancel.dialogs.map((d) => d.name + ': ' + d.text.slice(0, 120))}, itemsAfterCancel: out.gridsAfterCancel.items.rows.length, aboutOk: out.aboutOk.notice, itemsAfterAbout: out.gridsAfterAbout.items.rows, menusAfterAbout: out.gridsAfterAbout.menus.rows, h2: out.h2, h2out: out.h2out, primaryAfterAbout: out.primaryAfterAbout}));
            log(app.name, 'delete menu', JSON.stringify({footer: out.footer, menuOk: {buttons: out.menuOk.buttons, d: out.menuOk.dialogs.map((d) => d.name + ': ' + d.text.slice(0, 160)), notice: out.menuOk.notice}, rowsAfter: out.gridsAfterMenu.menus.rows, itemsAfter: out.gridsAfterMenu.items.rows.length, h3: out.h3, h3out: out.h3out, footerAfter: out.footerAfter, noMenus: out.noMenus.menus, noItems: out.noItems.items, addMenuEmpty: out.addMenuEmpty}));
        } finally { await close(); }
    }

    // ---- lang: M with English and French forms ----
    if (on('lang')) {
        const {page, close} = await launch(app);
        try {
            const out = {};
            await as(page, M.users.mgr, M.path);
            await openNav(page, app, M.path);
            await page.getByRole('link', {name: 'Add Menu', exact: true}).click();
            await editor(page).waitFor({timeout: T}); await idle(page); await sleep(500);
            out.menuTitleBoxes = await menuWindow(page).evaluate((w) => ({inputs: [...w.querySelectorAll('input[name^="title"]')].map((e) => e.name), langButtons: [...w.querySelectorAll('button')].map((b) => b.innerText.trim()).filter((t) => /French|English|Français/i.test(t))}));
            await snap(page, 'c0-lang-add-menu', out.menuTitleBoxes);
            await pressWindowButton(page, 'Cancel');
            await openNav(page, app, M.path);
            await openItemWindow(page, 'add');
            await itemWindow(page).locator('input[name="title[en]"]').click();
            await sleep(400);
            out.itemBoxes = await itemWindow(page).evaluate((w) => [...w.querySelectorAll('input[name^="title"], input[name^="remoteUrl"], input[name^="queryParams"]')].map((e) => `${e.name}${e.getClientRects().length ? '' : '(hidden)'}`));
            // French title only: refused?
            await fillTitle(page, '');
            await itemWindow(page).locator('input[name="title[en]"]').click();
            await itemWindow(page).locator('input[name="title[fr_CA]"]').fill('Seulement en français');
            await setType(page, 'Search');
            out.frOnly = await itemSave(page);
            out.frOnly = {notice: out.frOnly.notice, open: out.frOnly.windowOpen, errors: out.frOnly.state && out.frOnly.state.errors, posts: out.frOnly.posts};
            await snap(page, 'c1-lang-french-title-only', out.frOnly);
            // English title, Remote URL in English only
            await fillTitle(page, 'Lang remote');
            await setType(page, 'Remote URL');
            await itemWindow(page).locator('input[name="remoteUrl[en]"]').click();
            await sleep(300);
            out.urlBoxes = await itemWindow(page).evaluate((w) => [...w.querySelectorAll('input[name^="remoteUrl"]')].map((e) => `${e.name}${e.getClientRects().length ? '' : '(hidden)'} max=${e.getAttribute('maxlength')}`));
            await itemWindow(page).locator('input[name="remoteUrl[en]"]').fill('https://pkp.sfu.ca/');
            out.enOnlyUrl = await itemSave(page);
            out.enOnlyUrl = {notice: out.enOnlyUrl.notice, open: out.enOnlyUrl.windowOpen, posts: out.enOnlyUrl.posts};
            if (out.enOnlyUrl.open) await closeItemWindow(page);
            // a French URL that is not an address
            await openNav(page, app, M.path);
            await openItemWindow(page, 'add');
            await fillTitle(page, 'Lang remote 2');
            await setType(page, 'Remote URL');
            await itemWindow(page).locator('input[name="remoteUrl[en]"]').fill('https://pkp.sfu.ca/');
            await itemWindow(page).locator('input[name="remoteUrl[en]"]').click();
            await itemWindow(page).locator('input[name="remoteUrl[fr_CA]"]').fill('pas une adresse');
            out.badFrUrl = await itemSave(page);
            out.badFrUrl = {notice: out.badFrUrl.notice, open: out.badFrUrl.windowOpen, posts: out.badFrUrl.posts, errors: out.badFrUrl.state && out.badFrUrl.state.errors, hidden: out.badFrUrl.hiddenErrors};
            await snap(page, 'c1b-lang-bad-french-url', out.badFrUrl);
            if (out.badFrUrl.open) await closeItemWindow(page);
            // the tables in French
            await page.goto('about:blank');
            await page.goto(ctxUrl(app, M.path, '/management/settings/website#setup/navigationMenus', 'fr_CA'));
            await idle(page);
            await page.locator('table[id^="component-grid-navigationmenus-navigationmenusgrid-"]').first().waitFor({timeout: T});
            await idle(page); await sleep(500);
            out.frGrids = await grids(page);
            await snap(page, 'c2-lang-tables-french', {g: out.frGrids});
            const hfr = await header(page, app, M.path, 'fr_CA');
            out.frHeader = {primary: flat(hfr.primary), user: flat(hfr.user)};
            const hen = await header(page, app, M.path, 'en');
            out.enHeader = {primary: flat(hen.primary), user: flat(hen.user)};
            record('c3-lang-summary', out);
            log(app.name, 'lang', JSON.stringify({menuTitleBoxes: out.menuTitleBoxes, itemBoxes: out.itemBoxes, urlBoxes: out.urlBoxes, frOnly: out.frOnly, enOnlyUrl: out.enOnlyUrl, badFrUrl: out.badFrUrl}));
            log(app.name, 'lang fr tables', JSON.stringify(out.frGrids.menus.rows), JSON.stringify(out.frGrids.items.rows), 'headers', JSON.stringify(out.frHeader), JSON.stringify(out.enHeader));
        } finally { await close(); }
    }

    // ---- site: Administration › Site Settings › Site Setup › "Navigation" as admin (changes nothing) ----
    if (on('site')) {
        const {page, close} = await launch(app);
        const bd = watchDialogs(page);
        const db = `${dbName(app.name)}`;
        const psql = (sql) => execFileSync('psql', ['-h', '127.0.0.1', '-U', 'e2e', db, '-Atc', sql], {env: {...process.env, PGPASSWORD: 'e2e'}}).toString().trim();
        const siteMenus = () => psql("select navigation_menu_id||'|'||title||'|'||coalesce(area_name,'<null>') from navigation_menus where coalesce(context_id,0)=0 order by 1");
        const puts = [];
        page.on('request', (r) => { if (/\/api\/v1\/navigationMenus/.test(r.url()) && r.method() !== 'GET') puts.push({method: r.method(), url: r.url().replace(/^https?:\/\/[^/]+/, ''), override: r.headers()['x-http-method-override'] || null, body: (r.postData() || '').slice(0, 600)}); });
        try {
            const out = {dbBefore: siteMenus()};
            await signIn(page, 'admin');
            await idle(page);
            out.siteHeaderBefore = await header(page, app, 'index');
            await openNav(page, app, 'index');
            out.grids = await grids(page);
            await snap(page, 'd0-site-navigation', {g: out.grids});
            await loc(page, 'Site Settings › Site Setup: the "Navigation" side tab', page.locator('#nav-button'));
            out.menuRowControls = await rowControls(page, 'menus', 'User Navigation Menu');
            out.itemRowControls = await rowControls(page, 'items', 'Login');
            // the menu window from "Add Menu", the title link and the row's "Edit": does it open?
            const errs = [];
            page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().split('\n')[0].slice(0, 200)); });
            out.menuWindow = {};
            for (const how of ['Add Menu', 'title', 'Edit']) {
                await openNav(page, app, 'index');
                const e0 = errs.length;
                if (how === 'Add Menu') await page.getByRole('link', {name: 'Add Menu', exact: true}).click();
                else if (how === 'title') await menusTable(page).getByRole('link', {name: 'User Navigation Menu', exact: true}).click();
                else await rowAction(page, 'menus', 'User Navigation Menu', 'Edit');
                const opened = await editor(page).waitFor({timeout: 8000}).then(() => true).catch(() => false);
                const st = {opened, consoleErrors: errs.slice(e0), dialogs: await dialogs(page), overlay: await page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => { const cs = getComputedStyle(d); return cs.position === 'fixed' && d.offsetWidth >= innerWidth - 20 && d.offsetHeight >= innerHeight - 20 && parseFloat(cs.opacity) > 0 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)'; }).length)};
                if (how === 'Add Menu') await snap(page, 'd1-site-add-menu', st);
                if (opened) {
                    st.form = await menuWindow(page).evaluate((w) => { const sel = w.querySelector('select[name="areaName"]'); return {value: sel.value, options: [...sel.options].map((o) => o.text)}; });
                    st.panels = brief(await panels(page));
                    await pressWindowButton(page, 'Cancel');
                } else {
                    await page.keyboard.press('Escape');
                    await sleep(500);
                    st.afterEscape = {dialogs: await dialogs(page), gridLinkClickable: await page.getByRole('link', {name: 'Add item', exact: true}).click({trial: true, timeout: 3000}).then(() => true).catch(() => false)};
                }
                out.menuWindow[how] = st;
            }
            // "Add item": the types offered
            await openNav(page, app, 'index');
            await openItemWindow(page, 'add');
            out.addItemTypes = (await itemState(page)).typeOptions;
            await snap(page, 'd2-site-add-item', {types: out.addItemTypes});
            await closeItemWindow(page);
            out.dbAfter = siteMenus();
            out.puts = puts.slice();
            out.siteHeaderAfterRestoreSignedIn = await header(page, app, 'index');
            await signOut(page).catch(() => {});
            out.siteHeaderAfterRestoreSignedOut = await header(page, app, 'index');
            out.dbEnd = siteMenus();
            out.browserDialogs = bd;
            record('d5-site-summary', out);
            const hs = (h) => ({user: flat(h.user), primary: flat(h.primary), userText: h.userWrapperText});
            log(app.name, 'site', JSON.stringify({dbBefore: out.dbBefore, headerBefore: hs(out.siteHeaderBefore), menus: out.grids.menus.rows, items: out.grids.items.rows, emptyTexts: [out.grids.menus.empty, out.grids.items.empty], rowControls: [out.menuRowControls.controls, out.itemRowControls.controls], addItemTypes: out.addItemTypes}));
            for (const [k, v] of Object.entries(out.menuWindow)) log(app.name, 'site menu window', k, JSON.stringify({opened: v.opened, errs: v.consoleErrors, dialogs: v.dialogs.map((d) => d.name), overlay: v.overlay, afterEscape: v.afterEscape && {d: v.afterEscape.dialogs.map((d) => d.name), clickable: v.afterEscape.gridLinkClickable}, form: v.form}));
            log(app.name, 'site end', JSON.stringify({dbAfter: out.dbAfter, puts: out.puts, afterIn: hs(out.siteHeaderAfterRestoreSignedIn), afterOut: hs(out.siteHeaderAfterRestoreSignedOut), dbEnd: out.dbEnd}));
        } finally { await close(); }
    }

    // ---- control: the seeded journal's tables again (Rule 1) ----
    if (on('control')) {
        const {page, close} = await launch(app);
        try {
            await as(page, 'manager.maya', 'publicknowledge');
            await openNav(page, app, 'publicknowledge');
            const g = await grids(page);
            await snap(page, 'e0-control-publicknowledge', {g});
            record('e1-control-summary', {grids: g});
            log(app.name, 'control', JSON.stringify(g.menus.rows), JSON.stringify(g.items.rows));
        } finally { await close(); }
    }
};

