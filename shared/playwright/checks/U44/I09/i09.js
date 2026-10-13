// U44 claim check, chunk I09 (housekeeping 2026-10-09): incidentals row L15 against
// docs/specs/U44-identifiers.md Rules 11 and 12 (footnotes c, e, g, q6, q18, q23; register A4).
// The row: is a URN one kind of item carries refused on another kind, as the settings text says
// ("must be unique among all publishing objects with the same URN prefix assigned"), or only within
// the kind? OJS and OMP; OPS has no URN plugin (a read-only control of its Plugins page).
//
// Per run, on a scratch journal / press of its own, as `manager.maya` (a manager there), URN plugin
// on for every kind, "Enter an individual URN suffix…", no check number, prefix urn:nbn:de:0000-:
//   OJS (plugin seeded with every key its window writes; eight articles with a galley "PDF", three issues)
//     j00  the unsaved ways out, every question answered "OK": on H's galley tab a suffix typed, then
//          the window's header "Close"; the same, then the "Edit Metadata" tab; control: the label
//          changed on "Edit Metadata", then "Close" (U46 Rule 6a's question); an issue's tab, a suffix
//          typed, "Close"; H's "Identifiers" page, a URN typed, then the side menu's "Galleys"
//     j00x the same on G's galley after a "Close" that asked: the label changed, "Close"; then twice
//          a suffix typed, "Close", the page opened again and reloaded
//     j01  A's galley: suffix e2e-x1, "Save"; again, the box ticked, "Save" (assigned)
//     j02  A's "Identifiers" page: urn…e2e-x1, "Save"; read there and after a reload        (the row)
//     j03  B's galley: e2e-x2 assigned; C's page: urn…e2e-x2 (another article's galley)     (the row)
//     j04  control, Rule 11: D's page urn…e2e-k1 saved; E's page the same URN
//     j05  control, Rule 12: C's galley suffix e2e-x1 (A's galley has it)
//     j06  the other way: F's page urn…e2e-y1 saved; F's galley suffix e2e-y1, both saves   (the row)
//     j07  G's page urn…e2e-y2 saved; D's galley suffix e2e-y2 (another article's URN)       (the row)
//     j08  issues: Vol. 1 No. 2 suffix e2e-x1 (A's galley's URN), both saves; control Vol. 1 No. 4
//          suffix e2e-x1 (an issue has it); Vol. 1 No. 3 suffix e2e-z1 assigned, then H's page
//          urn…e2e-z1 and E's galley suffix e2e-z1
//     j10  Rule 12's other end: G's galley saves the suffix e2e-q1 once (not assigned); C's galley
//          takes e2e-q1 through both saves; then G's second "Save"
//     j09  last: "Publisher ID" switched on for galleys (Settings › Workflow › Submission ›
//          "Metadata"); on H's galley tab a Publisher ID typed, "Close"; the page opened again; a
//          Publisher ID typed, the "Edit Metadata" tab
//   OMP (plugin set up on screen after the seed, since a seeded format cannot be built with URNs on
//        for formats; three monographs, each with a chapter, a format "PDF" and its file, a fourth with neither, two with a chapter only)
//     p00  the unsaved ways out: on M3's chapter tab a suffix typed, then "Close"; the same, then
//          "Edit Metadata"; control: the title changed on "Edit Metadata", then "Close"; a format's
//          and a file's tab, a suffix typed, "Close"
//     p00x the same on M2's chapter after a "Close" that asked (the title changed), twice
//     p01  M1's chapter e2e-c1, format e2e-f1, file e2e-s1, each assigned (two saves)
//     p02  M1's "Identifiers" page: urn…e2e-c1 (its own chapter's)                           (the row)
//     p03  control, Rule 11: M2's page the same URN (M1 has it if p02 stored it)
//     p04  M2's page: urn…e2e-f1, then urn…e2e-s1 (another monograph's format, file)         (the row)
//     p05  control, Rule 12: M2's chapter e2e-c1, format e2e-f1, file e2e-s1
//     p06  the other way: M3's page urn…e2e-m1, its chapter e2e-m1; page …m2, format e2e-m2;
//          page …m3, file e2e-m3                                                             (the row)
//     p07  across the tab kinds: M2's format e2e-c1 (a chapter's), file e2e-f1 (a format's),
//          chapter e2e-s1 (a file's)
//     p09  Rule 12's other end on chapters (M5 saves e2e-q1 once, M6 takes it through both saves,
//          then M5's second "Save")
//     p08  the settings window's own pattern example: "Use the pattern entered below…" with
//          "press%ppub%r" for monographs, "Save"; M4's "Identifiers" page, "Assign" (not saved)
//   OPS  o01  Settings › Website › "Plugins" of `publicknowledge`: no "URN" row (read only)
//        o02  a scratch server, "Publisher ID" on for galleys: j09's ways out of a preprint's galley tab
// Every step records the screen (`screen()`), the answer of the save, the messages, the browser
// dialogs and page notices; the stored values are also read from the database, for evidence only.
// No assertions: the script records, the reader judges. On stable-3_5_0 the same steps run on the
// line's campaign fleet (menu keys without the version's number).
//
//   bin/app-lock.sh shared ojs -- env PROBE_FEATURE=U44 PROBE_AGENT=ccI09 PROBE_RUN=r1 node bin/probe.js ojs shared/playwright/checks/U44/I09/i09.js
//   PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=U44 PROBE_AGENT=ccI09 PROBE_RUN=r35a node bin/probe.js omp shared/playwright/checks/U44/I09/i09.js
//   STEPS=j01,j02 narrows a run to the steps named (the seed and the plugin's setup always run).
// Run on 2026-10-09: r1, r2 (main, whole, before j00x, j09 and o02 were added), x1, x2 (STEPS=j00x /
// p00x), y1, y2 (STEPS=j09; OPS whole), z1, z2 (STEPS=j10 / p09); on stable-3_5_0 r35a, r35b, x35a, x35b,
// y35a, y35b, z35a, z35b the same, and w35 the whole script.
// The press's setup step waits for the "Your changes have been saved." notice, which one of four
// runs started together missed (the settings were saved).
const {expect} = require('@playwright/test');
const {forEachApp, launch, signIn, screen, shot, record, loc, idle, tag, sql, serverLog} = require('../../../probe');

const T = 30_000;
const PREFIX = 'urn:nbn:de:0000-';
const RESOLVER = 'https://nbn-resolving.de/';
const FILE = 'article.pdf';
const CHAPTER = 'I09 Chapter One';
const MANAGER = 'manager.maya';
const ONLY = process.env.STEPS ? process.env.STEPS.split(',') : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 500) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    const stable35 = app.line === 'stable-3_5_0';
    const facts = {app: app.name, line: app.line || 'main', steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1800)}`);
    };
    const {page, close} = await launch(app);
    /** Every browser dialog, with the step it came in; all accepted (the script's listener decides alone). */
    const asked = [];
    let current = 'start';
    page.on('dialog', (d) => {
        asked.push({step: current, type: d.type(), message: flat(d.message(), 200)});
        d.accept().catch(() => {});
    });
    /** The fleet's log is every agent's: keep the lines that name this run's context, count the rest. */
    let ctxPath = null;
    const mine = (lines) => {
        const own = lines.filter((l) => ctxPath && l.includes(`/${ctxPath}/`)).map((l) => flat(l, 300));
        return lines.length > own.length ? [...own, `(+${lines.length - own.length} lines of other contexts on the fleet)`] : own;
    };
    /** A marker in the dialog list, so a question can be placed between two presses of a step. */
    const mark = (label) => asked.push({step: current, mark: label});
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    /** One step: skipped when STEPS leaves it out; an error is recorded and the run goes on. */
    const step = async (k, fn) => {
        if (ONLY && !/-setup$/.test(k) && !ONLY.includes(k.split(' ')[0])) return null;
        current = k;
        try {
            const v = await fn();
            fact(k, v);
            return v;
        } catch (e) {
            fact(k, {threw: flat(e.message, 700)});
            await snap(`${k.split(' ')[0]}-error`).catch(() => {});
            await shot(page, `${k.split(' ')[0]}-error`).catch(() => {});
            // leave any open legacy window behind
            await page.keyboard.press('Escape').catch(() => {});
            return null;
        }
    };

    try {
        if (app.name === 'ops') {
            // Read-only control: a preprint server lists no "URN" plugin.
            await signIn(page, MANAGER);
            await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`));
            await idle(page);
            await page.locator('#plugins-button').click();
            await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T});
            await idle(page);
            const s = await snap('o01-plugins');
            const rows = await page.locator('#pluginGridContainer tr.gridRow').evaluateAll((els) => els.map((e) => e.id.replace(/^.*-row-/, '')));
            const cats = (await page.locator('#pluginGridContainer tr.category, #pluginGridContainer .category_title, #pluginGridContainer tbody > tr:not(.gridRow)').allInnerTexts()).map((t) => flat(t, 80)).filter(Boolean);
            fact('o01 plugins', {
                rowCount: rows.length,
                urnRow: rows.filter((r) => /urn/i.test(r)),
                pubIdRows: rows.filter((r) => /pubid/i.test(r)),
                mentionsURN: /\bURN\b/.test(s.text.main || ''),
                publicIdentifierHeading: /Public Identifier Plugins/.test(s.text.main || ''),
                categories: cats.slice(0, 30),
            });
        }

        const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
        const {IdentifiersPage, LegacyIdentifiersWindow, GalleysPage, IssuesPage, UrnPluginSettings, PublisherIdSettings, pastCloseWindow} = require('../../../pages/IdentifiersPages.js');
        const isOJS = app.name === 'ojs';
        const isOMP = app.name === 'omp';
        const isOPS = app.name === 'ops';
        const t = tag('u44i09');
        ctxPath = t;
        const author = `${t}au`;
        const frame = new WorkflowPage(page, t, {labels: {publicationGroup: app.name === 'ops' ? 'Preprint' : 'Publication'}});

        // ---- seed -----------------------------------------------------------------
        const plugins = isOJS
            ? {
                  urnpubidplugin: {
                      enabled: true,
                      settings: {
                          enableIssueURN: true,
                          enablePublicationURN: true,
                          enableRepresentationURN: true,
                          urnPrefix: PREFIX,
                          urnSuffix: 'customId',
                          urnCheckNo: false,
                          urnNamespace: 'urn:nbn:de',
                          urnResolver: RESOLVER,
                      },
                  },
              }
            : undefined;
        const ctx = await app.api.createContext({
            tag: t,
            context: {acronym: isOMP ? 'PKP' : 'JPK'},
            users: [
                {username: MANAGER, roles: ['manager']},
                {username: author, givenName: 'Ada', familyName: 'Author', email: `${author}@mail.test`, roles: ['author']},
            ],
            ...(isOJS
                ? {
                      issues: [
                          {volume: 1, number: 2, year: 2026},
                          {volume: 1, number: 3, year: 2026},
                          {volume: 1, number: 4, year: 2026},
                      ],
                      plugins,
                  }
                : {}),
        });
        const S = {};
        const names = isOJS ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] : isOPS ? ['P'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];
        for (const n of names) {
            const r = await app.api.createSubmission({
                tag: `${t}${n.toLowerCase()}`,
                context: t,
                submitter: author,
                title: `I09 ${n} ${t}`,
                ...(!isOMP
                    ? {galleys: [{label: 'PDF', file: isOPS ? 'preprint.pdf' : FILE}]}
                    : n === 'M4'
                      ? {}
                      : n === 'M5' || n === 'M6'
                        ? {chapters: [{title: CHAPTER}]}
                        : {publicationFormats: [{name: 'PDF', file: FILE, approved: false, available: false}], chapters: [{title: CHAPTER}]}),
            });
            S[n] = {id: r.submissionId, pub: r.publicationId};
        }
        fact('seed', {context: t, issues: (ctx.issues || []).map((i) => i.id), S});

        // ---- reads for the facts (evidence only, never a step) ----------------------
        const pubIds = Object.values(S).map((s) => s.pub).join(',');
        const subIds = Object.values(S).map((s) => s.id).join(',');
        const q = (label, query) => {
            try {
                return sql(app, query).split('\n').filter(Boolean).map((l) => `${label}|${l}`);
            } catch (e) {
                return [`${label}|sql failed: ${flat(e.message, 120)}`];
            }
        };
        const KEYS = `setting_name in ('pub-id::other::urn', 'urnSuffix')`;
        const stored = () => [
            ...q('publication', `select p.submission_id, s.publication_id, s.setting_name, s.setting_value from publication_settings s join publications p on p.publication_id = s.publication_id where s.${KEYS} and s.publication_id in (${pubIds}) order by 2, 3`),
            ...(!isOMP
                ? [
                      ...q('galley', `select g.publication_id, s.galley_id, s.setting_name, s.setting_value from publication_galley_settings s join publication_galleys g on g.galley_id = s.galley_id where s.${KEYS} and g.publication_id in (${pubIds}) order by 2, 3`),
                      ...q('issue', `select s.issue_id, s.setting_name, s.setting_value from issue_settings s where s.${KEYS} and s.issue_id in (${(ctx.issues || []).map((i) => i.id).join(',') || 0}) order by 1, 2`),
                  ]
                : [
                      ...q('chapter', `select c.publication_id, s.chapter_id, s.setting_name, s.setting_value from submission_chapter_settings s join submission_chapters c on c.chapter_id = s.chapter_id where s.${KEYS} and c.publication_id in (${pubIds}) order by 2, 3`),
                      ...q('format', `select f.publication_id, s.publication_format_id, s.setting_name, s.setting_value from publication_format_settings s join publication_formats f on f.publication_format_id = s.publication_format_id where s.${KEYS} and f.publication_id in (${pubIds}) order by 2, 3`),
                      ...q('file', `select f.submission_id, s.submission_file_id, s.setting_name, s.setting_value from submission_file_settings s join submission_files f on f.submission_file_id = s.submission_file_id where s.${KEYS} and f.submission_id in (${subIds}) order by 2, 3`),
                  ]),
        ];

        // ---- screens ------------------------------------------------------------------
        /** A Publication page of the version: by its menu key on main; on 3.5 (keys carry no version) by the side menu. */
        const openPubPage = async (sub, key, heading) => {
            if (stable35) {
                await frame.gotoEditorial(sub.id);
                await frame.expectVersionLoaded().catch(() => {});
                await frame.menuLink(heading).first().click();
            } else {
                await frame.gotoEditorial(sub.id, {menuKey: `publication_${sub.pub}_${key}`});
            }
            await frame.expectPageHeading(heading);
            await idle(page);
        };
        const ids = new IdentifiersPage(page, frame);
        const openIdPage = async (sub) => {
            await openPubPage(sub, 'identifiers', 'Identifiers');
            await expect(ids.box()).toBeVisible({timeout: T});
            await idle(page);
        };
        /**
         * The "Identifiers" page of `sub`: the box as it arrives, `urn` typed, "Save"; what the page
         * answers and shows; then the page opened again by its address and the box read again.
         */
        const savePage = async (name, sub, urn) => {
            await openIdPage(sub);
            await locOnce('page', async () => {
                await loc(page, 'Identifiers page (individual suffix): the "URN" box', ids.box());
                await loc(page, 'Identifiers page: "Save"', ids.saveButton());
            });
            const shown = await ids.box().inputValue();
            await ids.box().fill(urn);
            const log = serverLog(app);
            const from = log.mark();
            await screen(page); // the notices seen so far
            const answered = page.waitForResponse((r) => /\/publications\/\d+(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
            await ids.saveButton().click();
            const r = await answered;
            const body = flat(await r.text().catch(() => ''), 400);
            const savedStatus = frame.dialog().locator('[role="status"]').filter({hasText: 'Saved'});
            const errors = ids.field().locator('.pkpFieldError');
            await expect(savedStatus.or(errors).first()).toBeVisible({timeout: 10_000}).catch(() => {});
            await idle(page);
            const saved = await savedStatus.isVisible().catch(() => false);
            const fieldErrors = (await errors.allInnerTexts().catch(() => [])).map((x) => flat(x));
            const summary = flat(await frame.dialog().locator('.pkpFormErrors, .pkpFormPage__errors, [class*="formErrors"]').first().innerText().catch(() => ''), 200) || null;
            const boxAfter = await ids.box().inputValue().catch(() => null);
            const s = await snap(`${name}-saved`);
            await shot(page, `${name}-saved`).catch(() => {});
            await openIdPage(sub);
            const boxReloaded = await ids.box().inputValue();
            await snap(`${name}-reloaded`);
            return {
                submission: sub.id,
                publication: sub.pub,
                shown,
                typed: urn,
                status: r.status(),
                saved,
                fieldErrors,
                summary,
                body: r.ok() ? null : body,
                boxAfter,
                boxReloaded,
                notices: s.notices,
                serverLog: mine(log.since(from)),
            };
        };

        const rowFacts = {};
        /** A locator row for the test author, once per run and key, taken while the element is on screen. */
        const located = new Set();
        const locOnce = async (key, fn) => {
            if (located.has(key)) return;
            located.add(key);
            await fn().catch(() => {});
        };
        const galleys = new GalleysPage(page, frame);
        const issuesPage = isOJS ? new IssuesPage(page, t) : null;
        /** A legacy window of `kind` on its "Identifiers" tab. */
        const openTab = async (kind, sub) => {
            if (kind === 'galley') {
                await openPubPage(sub, 'galleys', 'Galleys');
                return galleys.openIdentifiers('PDF');
            }
            if (kind === 'issue') {
                await issuesPage.open();
                const win = await issuesPage.openIdentifiers(sub);
                await idle(page);
                return win;
            }
            if (kind === 'chapter') {
                const {ChapterList, ChapterWindow} = require('../../../../../apps/omp/playwright/pages/ChapterPages.js');
                await openPubPage(sub, 'chapters', 'Chapters');
                const list = new ChapterList(page);
                await list.expectLoaded();
                await list.titleLink(CHAPTER).click();
                const cw = new ChapterWindow(page, 'Edit Chapter');
                await cw.expectOpen();
                const win = new LegacyIdentifiersWindow(page, cw.dialog());
                await win.openIdentifiersTab();
                await idle(page);
                return win;
            }
            const {PublicationFormatsPage} = require('../../../../../apps/omp/playwright/pages/PublicationFormatPages.js');
            const formats = new PublicationFormatsPage(page, t);
            await openPubPage(sub, 'publicationFormats', 'Publication Formats');
            await formats.expectLoaded();
            await idle(page);
            // The row's arrow, then "Edit". The controls are taken as the row's next row, not by their id:
            // a format's and a file's control rows share one id when the two numbers are equal (a new install).
            const row = kind === 'format' ? formats.formatRow('PDF') : formats.fileRow('PDF', FILE);
            await expect(row).toHaveCount(1, {timeout: T});
            const controls = row.locator('xpath=following-sibling::tr[1]');
            if (!(await controls.isVisible())) await row.locator('a.show_extras').first().click();
            await expect(controls).toBeVisible({timeout: T});
            const rowId = await row.getAttribute('id');
            const sameId = await page.locator(`[id="${rowId}-control-row"]`).count();
            if (sameId > 1) rowFacts[`${kind} ${sub.id}`] = {rowId, controlRowsWithThatId: sameId, opened: flat(await controls.innerText(), 120), visibleControlRows: await page.locator('tr.row_controls:visible').count()};
            await controls.getByRole('link', {name: 'Edit', exact: true}).first().click();
            const dialog = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: 'Identifiers', exact: true})}).last();
            const win = new LegacyIdentifiersWindow(page, dialog);
            await win.tab('Identifiers').waitFor({timeout: T});
            // The first tab's form loaded before the switch, as the chapter and galley openers do:
            // a switch that aborts that request leaves the window asking on close (rrlead, 2026-10-09).
            await expect(dialog.locator('form').first()).toBeVisible({timeout: T});
            await idle(page);
            await win.openIdentifiersTab();
            await idle(page);
            return win;
        };
        /** What the tab's "URN" area shows. */
        const readTab = async (win) => {
            const text = flat(await win.urnArea().innerText().catch(() => ''), 700);
            const m = text.match(/urn:[^\s"]+/i);
            const boxes = await win.assignBox().count();
            const suffixes = await win.urnSuffixBox().count();
            return {
                title: flat(await win.dialog.getAttribute('aria-label').catch(() => ''), 80) || null,
                tabs: await win.tabNames().catch(() => null),
                text,
                urn: m ? m[0] : null,
                suffixBox: suffixes ? {value: await win.urnSuffixBox().inputValue(), editable: await win.urnSuffixBox().isEditable()} : null,
                assignBox: boxes ? {checked: await win.assignBox().isChecked()} : null,
                assignedText: /The URN is assigned to this/.test(text),
                clearLink: (await win.clearLink().count()) > 0,
                errors: flat(await win.form().innerText().catch(() => ''), 2000).includes('Errors occurred processing this form'),
            };
        };
        const closeWin = async (win) => {
            if (!((await win.dialog.count()) > 0)) return;
            await win.close();
        };
        /** Press the tab's "Save"; the window closes (accepted) or the tab comes back with its messages. */
        const pressSave = async (name, win) => {
            const log = serverLog(app);
            const from = log.mark();
            await screen(page);
            const answered = page.waitForResponse((r) => /update-identifiers/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
            await win.saveButton().click();
            const r = await answered;
            await idle(page);
            const refusedBox = win.form().getByText('Errors occurred processing this form');
            const closed = await Promise.race([
                expect(win.dialog).toHaveCount(0, {timeout: 12_000}).then(() => true).catch(() => null),
                expect(refusedBox.first()).toBeVisible({timeout: 12_000}).then(() => false).catch(() => null),
            ]);
            await sleep(600);
            const open = (await win.dialog.count()) > 0;
            const s = await snap(name);
            const out = {status: r.status(), windowClosed: !open, raced: closed, notices: s.notices, serverLog: mine(log.since(from))};
            if (open) {
                out.tab = await readTab(win);
                out.formTop = flat(await win.form().innerText().catch(() => ''), 500);
                await shot(page, name).catch(() => {});
            } else {
                await pastCloseWindow(page);
            }
            return out;
        };
        /**
         * An item's tab: read as it arrives, `suffix` typed, "Save". If the window closed: opened
         * again (the preview and the box), "Save" again with the box as it arrives, opened a third
         * time and read (the stored state). If it stayed open: read, closed, opened again and read.
         */
        const tabSuffix = async (name, kind, sub, suffix) => {
            const out = {kind, of: typeof sub === 'string' ? sub : sub.id, typed: suffix};
            let win = await openTab(kind, sub);
            out.arrives = await readTab(win);
            await snap(`${name}-arrives`);
            await locOnce(`tab-${kind}`, async () => {
                await loc(page, `${kind} window, "Identifiers" tab: the "URN Suffix" box`, win.urnSuffixBox());
                await loc(page, `${kind} window, "Identifiers" tab: "Save"`, win.saveButton());
            });
            if (!out.arrives.suffixBox) {
                await closeWin(win);
                out.note = 'no "URN Suffix" box on the tab';
                return out;
            }
            await win.urnSuffixBox().fill(suffix);
            out.save1 = await pressSave(`${name}-save1`, win);
            if (!out.save1.windowClosed) {
                await closeWin(win);
                win = await openTab(kind, sub);
                out.reopened = await readTab(win);
                await snap(`${name}-reopened`);
                await closeWin(win);
                return out;
            }
            win = await openTab(kind, sub);
            out.second = await readTab(win);
            await snap(`${name}-second`);
            await locOnce(`box-${kind}`, () => loc(page, `${kind} window, "Identifiers" tab: the "Assign the URN to this …" box`, win.assignBox()));
            out.save2 = await pressSave(`${name}-save2`, win);
            if (!out.save2.windowClosed) await closeWin(win);
            win = await openTab(kind, sub);
            out.final = await readTab(win);
            await snap(`${name}-final`);
            await shot(page, `${name}-final`).catch(() => {});
            await closeWin(win);
            return out;
        };

        /** Type into a box the way a person does: the text, then out of the box (a legacy form notices a change then). */
        const typeIn = async (box, value) => {
            await box.click();
            await box.fill('');
            await box.pressSequentially(value, {delay: 15});
            await box.blur().catch(() => {});
            await sleep(300);
        };
        /**
         * Change something in an open legacy window (`change`), then leave it by the header "Close"
         * (`how` = 'close') or by another tab (`how` = the tab's name). What the browser asked, and
         * whether the window (or the tab) is still there. Every question is answered "OK".
         */
        const leaveWindow = async (win, change, how, name) => {
            mark(`${name}: opened`);
            await change();
            mark(`${name}: changed, leaving by ${how}`);
            const before = asked.length;
            if (how === 'close') await win.dialog.getByRole('button', {name: 'Close', exact: true}).first().click();
            else await win.tab(how).click();
            await sleep(2000);
            await idle(page);
            const out = {how, asked: asked.slice(before), windowOpen: (await win.dialog.count()) > 0};
            mark(`${name}: left`);
            const s = await snap(name);
            out.notices = s.notices;
            if (out.windowOpen) {
                out.selectedTab = flat(await win.dialog.locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => ''), 40);
                await closeWin(win);
            }
            return out;
        };

        /**
         * Settings › Workflow › Submission › "Metadata": "Enable for Galleys" ticked, "Save". Then the
         * galley's "Identifiers" tab: a Publisher ID typed, the header "Close"; the page opened again;
         * a Publisher ID typed, the "Edit Metadata" tab.
         */
        const publisherIdWays = async (name, sub) => {
            const out = {};
            const settings = new PublisherIdSettings(page, t);
            await settings.open();
            out.boxesBefore = await settings.boxes();
            await settings.setBoxes({'Enable for Galleys': true});
            await settings.save();
            let win = await openTab('galley', sub);
            out.arrives = {tabs: await win.tabNames(), publisherIdBox: await win.publisherIdBox().count(), urnArea: await win.urnArea().count()};
            await snap(`${name}-arrives`);
            out.pidClose = await leaveWindow(win, () => typeIn(win.publisherIdBox(), 'pid-unsaved1'), 'close', `${name}-pid-close`);
            mark(`${name}: closed, the page opened again by its address`);
            win = await openTab('galley', sub);
            mark(`${name}: opened again`);
            out.reopened = {publisherId: await win.publisherIdBox().inputValue()};
            out.pidTab = await leaveWindow(win, () => typeIn(win.publisherIdBox(), 'pid-unsaved2'), 'Edit Metadata', `${name}-pid-tab`);
            return out;
        };

        /**
         * Rule 12's "already uses", the other end: a suffix another item of the kind holds as a typed
         * suffix only, its URN not assigned yet. `first` saves the suffix once; `second` takes the same
         * suffix through both saves; then `first`'s second "Save" (the box as it arrives).
         */
        const sameSuffixUnassigned = async (name, kind, first, second, suffix) => {
            const out = {};
            let win = await openTab(kind, first);
            await win.urnSuffixBox().fill(suffix);
            out.firstSave1 = await pressSave(`${name}-first-save1`, win);
            if (!out.firstSave1.windowClosed) await closeWin(win);
            out.second = await tabSuffix(`${name}-second`, kind, second, suffix);
            win = await openTab(kind, first);
            out.firstArrives = await readTab(win);
            await snap(`${name}-first-arrives`);
            out.firstSave2 = await pressSave(`${name}-first-save2`, win);
            if (!out.firstSave2.windowClosed) await closeWin(win);
            win = await openTab(kind, first);
            out.firstFinal = await readTab(win);
            await snap(`${name}-first-final`);
            await closeWin(win);
            return out;
        };

        await signIn(page, MANAGER);

        if (isOMP) {
            // The press's URN plugin, on screen (Settings › Website › "Plugins" › "URN" › "Settings").
            await step('p-setup', async () => {
                const settings = new UrnPluginSettings(page, t);
                await settings.openPlugins();
                const wasEnabled = await settings.enabledBox().isChecked();
                if (!wasEnabled) await settings.setEnabled(true);
                await settings.openSettings();
                for (const k of ['Monographs', 'Chapters', 'Publication Formats', 'Files']) await settings.setKind(k, true);
                await settings.prefixBox().fill(PREFIX);
                await settings.suffixRadio('customId').check();
                await settings.checkNumberBox().uncheck();
                await settings.namespaceSelect().selectOption('urn:nbn:de');
                await settings.resolverBox().fill(RESOLVER);
                const s = await snap('p-setup-window');
                await settings.saveAccepted();
                return {wasEnabled, suffixSentence: (s.text.dialog || '').includes('Enter an individual URN suffix for each published item')};
            });
        } else if (isOJS) {
            // The journal's settings window as seeded, read only (the sentence the row quotes sits on the tabs).
            await step('j-setup', async () => {
                const settings = new UrnPluginSettings(page, t);
                await settings.openPlugins();
                await settings.openSettings();
                await idle(page);
                const s = await snap('j-setup-window');
                await shot(page, 'j-setup-window').catch(() => {});
                await page.keyboard.press('Escape').catch(() => {});
                await page.goto(app.url(`/index.php/${t}/management/settings/website`));
                await idle(page);
                return {enabled: true, dialogLength: (s.text.dialog || '').length};
            });
        }

        if (isOJS) {
            await step('j00 unsaved', async () => {
                const out = {};
                // (a) a suffix typed, the window's header "Close"
                let win = await openTab('galley', S.H);
                out.suffixClose = await leaveWindow(win, () => typeIn(win.urnSuffixBox(), 'e2e-unsaved1'), 'close', 'j00-suffix-close');
                // (b) a suffix typed, the other tab
                win = await openTab('galley', S.H);
                out.suffixTab = await leaveWindow(win, () => typeIn(win.urnSuffixBox(), 'e2e-unsaved2'), 'Edit Metadata', 'j00-suffix-tab');
                // (c) control: the "Edit Metadata" tab's label changed, the header "Close" (U46 Rule 6a asks)
                await openPubPage(S.H, 'galleys', 'Galleys');
                win = await galleys.openEdit('PDF');
                out.labelClose = await leaveWindow(win, () => typeIn(win.dialog.locator('input[name="label"]'), 'PDF unsaved'), 'close', 'j00-label-close');
                win = await openTab('galley', S.H);
                out.galleyReopened = await readTab(win);
                await closeWin(win);
                // (c2) an issue's tab: a suffix typed, the header "Close"
                win = await openTab('issue', 'Vol. 1 No. 4 (2026)');
                out.issueSuffixClose = await leaveWindow(win, () => typeIn(win.urnSuffixBox(), 'e2e-unsaved4'), 'close', 'j00-issue-suffix-close');
                mark('j00-issue: closed, the Issues page opened again');
                win = await openTab('issue', 'Vol. 1 No. 4 (2026)');
                out.issueReopened = await readTab(win);
                await closeWin(win);
                // (d) the "Identifiers" page: a URN typed, then the side menu's "Galleys"
                await openIdPage(S.H);
                await typeIn(ids.box(), `${PREFIX}e2e-unsaved3`);
                mark('j00-page: URN typed, the side menu "Galleys"');
                const before2 = asked.length;
                await frame.menuLink('Galleys').first().click();
                await sleep(2000);
                await idle(page);
                const s = await snap('j00-page-left');
                out.pageLeftAsked = asked.slice(before2);
                mark('j00-page: on "Galleys", the page opened again by its address');
                out.pageLeftHeading = /Galleys/.test(s.text.dialog || '');
                out.pageLeftQuestion = await page.locator('[role="dialog"]').filter({hasText: /unsaved|Unsaved|without saving/}).count();
                await openIdPage(S.H);
                out.boxAfterLeaving = await ids.box().inputValue();
                return out;
            });
            // Is the silent "Close" of j00 the first window's only? After a "Close" that asked: twice more.
            await step('j00x unsaved again', async () => {
                const out = {};
                await openPubPage(S.G, 'galleys', 'Galleys');
                let win = await galleys.openEdit('PDF');
                out.labelClose = await leaveWindow(win, () => typeIn(win.dialog.locator('input[name="label"]'), 'PDF unsaved'), 'close', 'j00x-label-close');
                win = await openTab('galley', S.G);
                out.suffixClose1 = await leaveWindow(win, () => typeIn(win.urnSuffixBox(), 'e2e-unsaved5'), 'close', 'j00x-suffix-close-1');
                mark('j00x: closed, the page opened again by its address');
                win = await openTab('galley', S.G);
                mark('j00x: opened again');
                out.suffixClose2 = await leaveWindow(win, () => typeIn(win.urnSuffixBox(), 'e2e-unsaved6'), 'close', 'j00x-suffix-close-2');
                mark('j00x: closed, the page reloaded');
                await page.reload();
                await idle(page);
                mark('j00x: reloaded');
                win = await openTab('galley', S.G);
                out.galleyReopened = await readTab(win);
                await closeWin(win);
                return out;
            });
            await step('j01 galley A', () => tabSuffix('j01-galley-a', 'galley', S.A, 'e2e-x1'));
            await step('j02 page A', () => savePage('j02-page-a', S.A, `${PREFIX}e2e-x1`));
            await step('j03a galley B', () => tabSuffix('j03-galley-b', 'galley', S.B, 'e2e-x2'));
            await step('j03b page C', () => savePage('j03-page-c', S.C, `${PREFIX}e2e-x2`));
            await step('j04a page D', () => savePage('j04-page-d', S.D, `${PREFIX}e2e-k1`));
            await step('j04b page E', () => savePage('j04-page-e', S.E, `${PREFIX}e2e-k1`));
            await step('j05 galley C', () => tabSuffix('j05-galley-c', 'galley', S.C, 'e2e-x1'));
            await step('j06a page F', () => savePage('j06-page-f', S.F, `${PREFIX}e2e-y1`));
            await step('j06b galley F', () => tabSuffix('j06-galley-f', 'galley', S.F, 'e2e-y1'));
            await step('j07a page G', () => savePage('j07-page-g', S.G, `${PREFIX}e2e-y2`));
            await step('j07b galley D', () => tabSuffix('j07-galley-d', 'galley', S.D, 'e2e-y2'));
            await step('j08a issue 2', () => tabSuffix('j08-issue-2', 'issue', 'Vol. 1 No. 2 (2026)', 'e2e-x1'));
            await step('j08b issue 4', () => tabSuffix('j08-issue-4', 'issue', 'Vol. 1 No. 4 (2026)', 'e2e-x1'));
            await step('j08c issue 3', () => tabSuffix('j08-issue-3', 'issue', 'Vol. 1 No. 3 (2026)', 'e2e-z1'));
            await step('j08d page H', () => savePage('j08-page-h', S.H, `${PREFIX}e2e-z1`));
            await step('j08e galley E', () => tabSuffix('j08-galley-e', 'galley', S.E, 'e2e-z1'));
            await step('j10 same suffix unassigned', () => sameSuffixUnassigned('j10', 'galley', S.G, S.C, 'e2e-q1'));
            // Is the silent "Close" the suffix box's, or the tab's? The tab's other box, "Publisher ID".
            await step('j09 publisher id', () => publisherIdWays('j09', S.H));
        } else if (isOPS) {
            // A preprint server's galley tab holds "Publisher ID" alone (no URN plugin): the same ways out.
            await step('o02 publisher id', () => publisherIdWays('o02', S.P));
        } else {
            await step('p00 unsaved', async () => {
                const out = {};
                // (a) a suffix typed on the chapter's tab, the window's header "Close"
                let win = await openTab('chapter', S.M3);
                out.suffixClose = await leaveWindow(win, () => typeIn(win.urnSuffixBox(), 'e2e-unsaved1'), 'close', 'p00-suffix-close');
                // (b) a suffix typed, the other tab
                win = await openTab('chapter', S.M3);
                out.suffixTab = await leaveWindow(win, () => typeIn(win.urnSuffixBox(), 'e2e-unsaved2'), 'Edit Metadata', 'p00-suffix-tab');
                // (c) control: the chapter's title changed on "Edit Metadata", the header "Close"
                win = await openTab('chapter', S.M3);
                await win.tab('Edit Metadata').click();
                await idle(page);
                out.titleClose = await leaveWindow(win, () => typeIn(win.dialog.locator('input[name^="title"]').first(), `${CHAPTER} unsaved`), 'close', 'p00-title-close');
                win = await openTab('chapter', S.M3);
                out.chapterReopened = await readTab(win);
                await closeWin(win);
                // (c2) a format's and a file's tab: a suffix typed, the header "Close"
                win = await openTab('format', S.M3);
                out.formatSuffixClose = await leaveWindow(win, () => typeIn(win.urnSuffixBox(), 'e2e-unsaved3'), 'close', 'p00-format-suffix-close');
                mark('p00-format: closed, the page opened again');
                win = await openTab('file', S.M3);
                out.fileSuffixClose = await leaveWindow(win, () => typeIn(win.urnSuffixBox(), 'e2e-unsaved4'), 'close', 'p00-file-suffix-close');
                mark('p00-file: closed, the page opened again');
                win = await openTab('file', S.M3);
                out.fileReopened = await readTab(win);
                await closeWin(win);
                return out;
            });
            // Is the silent "Close" of p00 the first window's only? After a "Close" that asked: twice more.
            await step('p00x unsaved again', async () => {
                const out = {};
                let win = await openTab('chapter', S.M2);
                await win.tab('Edit Metadata').click();
                await idle(page);
                out.titleClose = await leaveWindow(win, () => typeIn(win.dialog.locator('input[name^="title"]').first(), `${CHAPTER} unsaved`), 'close', 'p00x-title-close');
                win = await openTab('chapter', S.M2);
                out.suffixClose1 = await leaveWindow(win, () => typeIn(win.urnSuffixBox(), 'e2e-unsaved5'), 'close', 'p00x-suffix-close-1');
                mark('p00x: closed, the page opened again by its address');
                win = await openTab('chapter', S.M2);
                mark('p00x: opened again');
                out.suffixClose2 = await leaveWindow(win, () => typeIn(win.urnSuffixBox(), 'e2e-unsaved6'), 'close', 'p00x-suffix-close-2');
                mark('p00x: closed, the page reloaded');
                await page.reload();
                await idle(page);
                mark('p00x: reloaded');
                win = await openTab('chapter', S.M2);
                out.chapterReopened = await readTab(win);
                await closeWin(win);
                return out;
            });
            await step('p01a chapter M1', () => tabSuffix('p01-chapter-m1', 'chapter', S.M1, 'e2e-c1'));
            await step('p01b format M1', () => tabSuffix('p01-format-m1', 'format', S.M1, 'e2e-f1'));
            await step('p01c file M1', () => tabSuffix('p01-file-m1', 'file', S.M1, 'e2e-s1'));
            await step('p02 page M1', () => savePage('p02-page-m1', S.M1, `${PREFIX}e2e-c1`));
            await step('p03 page M2', () => savePage('p03-page-m2', S.M2, `${PREFIX}e2e-c1`));
            await step('p04a page M2', () => savePage('p04-page-m2-format', S.M2, `${PREFIX}e2e-f1`));
            await step('p04b page M2', () => savePage('p04-page-m2-file', S.M2, `${PREFIX}e2e-s1`));
            await step('p05a chapter M2', () => tabSuffix('p05-chapter-m2', 'chapter', S.M2, 'e2e-c1'));
            await step('p05b format M2', () => tabSuffix('p05-format-m2', 'format', S.M2, 'e2e-f1'));
            await step('p05c file M2', () => tabSuffix('p05-file-m2', 'file', S.M2, 'e2e-s1'));
            await step('p06a page M3', () => savePage('p06-page-m3-1', S.M3, `${PREFIX}e2e-m1`));
            await step('p06b chapter M3', () => tabSuffix('p06-chapter-m3', 'chapter', S.M3, 'e2e-m1'));
            await step('p06c page M3', () => savePage('p06-page-m3-2', S.M3, `${PREFIX}e2e-m2`));
            await step('p06d format M3', () => tabSuffix('p06-format-m3', 'format', S.M3, 'e2e-m2'));
            await step('p06e page M3', () => savePage('p06-page-m3-3', S.M3, `${PREFIX}e2e-m3`));
            await step('p06f file M3', () => tabSuffix('p06-file-m3', 'file', S.M3, 'e2e-m3'));
            await step('p07a format M2', () => tabSuffix('p07-format-m2', 'format', S.M2, 'e2e-c1'));
            await step('p07b file M2', () => tabSuffix('p07-file-m2', 'file', S.M2, 'e2e-f1'));
            await step('p07c chapter M2', () => tabSuffix('p07-chapter-m2', 'chapter', S.M2, 'e2e-s1'));
            await step('p09 same suffix unassigned', () => sameSuffixUnassigned('p09', 'chapter', S.M5, S.M6, 'e2e-q1'));
            // The settings window's own example for a pattern, "press%ppub%r": typed for monographs, then "Assign" on M4's page (not saved).
            await step('p08 pattern example', async () => {
                const settings = new UrnPluginSettings(page, t);
                await settings.openPlugins();
                await settings.openSettings();
                await idle(page);
                const form = settings.form();
                const help = flat(await form.locator('#urnSuffixFormArea').innerText().catch(() => ''), 1200);
                await settings.suffixRadio('pattern').check();
                await form.locator('input[name="urnPublicationSuffixPattern"]').fill('press%ppub%r');
                await form.locator('input[name="urnChapterSuffixPattern"]').fill('c%c');
                await form.locator('input[name="urnRepresentationSuffixPattern"]').fill('f%f');
                await form.locator('input[name="urnSubmissionFileSuffixPattern"]').fill('s%s');
                await snap('p08-settings');
                await settings.saveAccepted();
                await openIdPage(S.M4);
                const before = await snap('p08-page-arrives');
                const out = {
                    example: (help.match(/For example[^.]*\./) || [null])[0],
                    placeholders: (help.match(/Use %[^.]*\./) || [null])[0],
                    boxArrives: await ids.box().inputValue(),
                    boxEditable: await ids.box().isEditable(),
                    assignOffered: await ids.assignButton().count(),
                    fieldText: flat(await ids.field().innerText().catch(() => ''), 400),
                    notices: before.notices,
                };
                if (out.assignOffered) {
                    await ids.assignButton().click();
                    await sleep(500);
                    out.boxAfterAssign = await ids.box().inputValue();
                    await snap('p08-page-assigned');
                    await shot(page, 'p08-page-assigned').catch(() => {});
                }
                return out;
            });
        }

        if (Object.keys(rowFacts).length) fact('rows sharing an id', rowFacts);
        fact('stored', stored());
    } finally {
        facts.dialogs = asked;
        record('facts', facts);
        await close();
    }
});
