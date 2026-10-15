// Issue walk: docs/issues/U03-A24-profile-contact-save-script-error.md (U03 A24).
// On PKP's default test dataset, the Profile page's Contact tab as `dbarnes`: its "Signature" field
// has a formatted-text box per language. MultilingualInputHandler.isIncomplete_() reads every
// language's editor 500 ms after the tab's form is built, and throws "Cannot read properties of
// undefined (reading 'serialize')" when one of them has not started yet. Records every page error
// with its stack, each box's state, and the Signature field's language marker.
//
// MODE (env):
//   walk     (default) the Steps: the console snippet of the report (the French boxes start 3 s
//            late, as on a busy computer) pasted on the Identity tab, then "Contact", then a
//            "Save" of a new email address, then "Cancel" on its notice.
//   natural  the same tab with nothing held, TRIES saves (+ "Cancel") at the site level (admin,
//            after a second journal made in Administration) and at the journal level (dbarnes):
//            how often an ordinary walk meets it.
//   marker   what the failure costs: with an English Signature saved alone (nothing held) the
//            field shows its "incomplete" marker; after the snippet, the same "Save" leaves it out.
//   nb       neighbour of the fix: the Signature field's language marker after "Save" with
//            English typed alone (incomplete), then French typed too (complete), nothing held;
//            then one more "Save" after the snippet (complete with the fix, unset without).
//
//   npm run fleet-prep -- --feature issues-h15d --dataset 1 --reset
//   PROBE_FEATURE=issues-h15d PROBE_AGENT=h15d node bin/probe.js all \
//     shared/playwright/checks/issues/profile-contact-save-script-error/walk.js
//   (MODE=natural / MODE=nb; PROBE_RUN=<tag> keeps runs apart; PKP_E2E_LINE=stable-3_5_0 for 3.5)
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const TRIES = Number(process.env.TRIES || 6);

// The report's console snippet, verbatim: every French formatted-text box opened afterwards
// starts 3 seconds late.
const SNIPPET = `(() => {
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (type === 'load' && this instanceof HTMLIFrameElement && /-fr_CA-/.test(this.id) && typeof fn === 'function') {
      const frame = this;
      return add.call(this, type, (event) => {
        const late = new Proxy(event, {get: (e, k) => (k === 'composedPath' ? () => [frame]
          : k === 'target' || k === 'currentTarget' ? frame
          : typeof e[k] === 'function' ? e[k].bind(e) : e[k])});
        setTimeout(() => fn.call(frame, late), 3000);
      }, opts);
    }
    return add.call(this, type, fn, opts);
  };
})();`;

const ownFrame = (e) => e.stack.find((l) => /pkp\.min\.js|\/js\/controllers\//.test(l)) || e.stack[0] || e.message;

async function cycles(page, profile, F, phase, who, prefix) {
    const rows = [];
    for (let i = 1; i <= TRIES; i++) {
        phase.name = `${who}-save-${i}`;
        const n0 = F.errors.length;
        const saved = await L.saveNewEmail(page, profile, `${prefix}${i}@mailinator.com`);
        const afterSave = F.errors.slice(n0).map(ownFrame);
        phase.name = `${who}-cancel-${i}`;
        const n1 = F.errors.length;
        const cancelled = await L.cancelRequest(page, profile);
        rows.push({i, saved, saveErrors: afterSave, cancelled, cancelErrors: F.errors.slice(n1).map(ownFrame)});
    }
    return rows;
}

/** What the tab shows a few seconds after a step: errors since `n0`, boxes, marker. */
async function state(page, F, n0) {
    return {
        errors: F.errors.slice(n0).map((e) => ({message: e.message, at: ownFrame(e)})),
        editors: await L.editors(page),
        marker: await L.signatureIndicator(page),
    };
}

forEachApp(async (app) => {
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    const F = {mode: MODE, line: app.line || 'main', errors: []};
    const phase = {name: 'start'};
    const {page, close} = await launch(app);
    L.watchErrors(page, F.errors, phase);
    await L.deepStacks(page);
    try {
        if (MODE === 'walk') {
            // 1-2: sign in as dbarnes, open the Profile page (Identity)
            await signIn(page, 'dbarnes', {contextPath: app.contextPath});
            const own = new ProfilePage(page, app.contextPath);
            phase.name = 'identity';
            await own.goto('identity');
            await idle(page);
            // 3: paste the snippet into the console
            await page.evaluate(SNIPPET);
            // 4: "Contact", wait 4 s
            phase.name = 'contact';
            let n0 = F.errors.length;
            await own.open('contact');
            await L.sleep(4000);
            F.contact = await state(page, F, n0);
            record('contact', await screen(page));
            // 5: new email address, "Save", wait 4 s
            phase.name = 'save';
            n0 = F.errors.length;
            await own.email().fill('dbarnes.h15d@mailinator.com');
            await own.save();
            await L.sleep(4000);
            F.save = await state(page, F, n0);
            F.save.pending = L.flat(await own.pendingEmailNotice().innerText().catch(() => null));
            F.save.notices = (await screen(page)).notices;
            await shot(page, 'after-save');
            // 6: "Cancel" on the notice, wait 4 s
            phase.name = 'cancel';
            n0 = F.errors.length;
            await own.cancelPendingEmail();
            await L.sleep(4000);
            F.cancel = await state(page, F, n0);
            F.cancel.email = await own.email().inputValue().catch(() => null);
            // the boxes take typing: English Signature
            phase.name = 'type';
            await L.typeSignature(page, 'en', 'typed h15d');
            F.typed = await page.frameLocator('#contactForm iframe[id^="signature-en"]').locator('body').innerText().catch(() => null);
        } else if (MODE === 'natural') {
            phase.name = 'create-journal';
            await signIn(page, 'admin');
            F.createJournal = await L.createSecondContext(page, app);
            phase.name = 'site-open';
            const site = new ProfilePage(page, null);
            await site.goto('contact');
            await idle(page);
            F.siteUrl = page.url();
            F.site = await cycles(page, site, F, phase, 'site', 'pkpadmin.h15d');
            phase.name = 'journal-open';
            await signIn(page, 'dbarnes', {contextPath: app.contextPath});
            const own = new ProfilePage(page, app.contextPath);
            await own.goto('contact');
            await idle(page);
            F.journal = await cycles(page, own, F, phase, 'journal', 'dbarnes.h15d');
        } else if (MODE === 'marker') {
            await signIn(page, 'dbarnes', {contextPath: app.contextPath});
            const own = new ProfilePage(page, app.contextPath);
            phase.name = 'marker-open';
            await own.goto('contact');
            await idle(page);
            await L.sleep(1500);
            await L.typeSignature(page, 'en', 'Daniel Barnes h15d');
            let n0 = F.errors.length;
            await own.save();
            await L.sleep(2000);
            F.plain = await state(page, F, n0);
            await page.evaluate(SNIPPET);
            phase.name = 'marker-held';
            n0 = F.errors.length;
            await own.save();
            await L.sleep(4000);
            F.held = await state(page, F, n0);
            await shot(page, 'marker-held');
        } else if (MODE === 'nb') {
            await signIn(page, 'dbarnes', {contextPath: app.contextPath});
            const own = new ProfilePage(page, app.contextPath);
            phase.name = 'nb-open';
            await own.goto('contact');
            await idle(page);
            await L.sleep(1500);
            F.open = await state(page, F, 0);
            phase.name = 'nb-english';
            await L.typeSignature(page, 'en', 'Daniel Barnes h15d');
            let n0 = F.errors.length;
            await own.save();
            await L.sleep(2000);
            F.englishOnly = await state(page, F, n0);
            phase.name = 'nb-french';
            await L.typeSignature(page, 'fr_CA', 'Daniel Barnes h15d (fr)');
            n0 = F.errors.length;
            await own.save();
            await L.sleep(2000);
            F.both = await state(page, F, n0);
            // both languages filled, the French box held: the marker read from a box still starting
            await page.evaluate(SNIPPET);
            phase.name = 'nb-held';
            n0 = F.errors.length;
            await own.save();
            await L.sleep(4000);
            F.bothHeld = await state(page, F, n0);
            await shot(page, 'nb-marker');
        }
    } catch (e) {
        F.threw = String(e && e.message || e).split('\n')[0];
        await shot(page, `threw-${MODE}`).catch(() => {});
    } finally {
        record(`facts-${MODE}`, F);
        const by = {};
        for (const e of F.errors) by[ownFrame(e)] = (by[ownFrame(e)] || 0) + 1;
        console.log(`[h15d] ${app.name} ${F.line} ${MODE}: ${F.errors.length} page error(s)`, JSON.stringify(by), F.threw ? `THREW ${F.threw}` : '');
        await close();
    }
});
