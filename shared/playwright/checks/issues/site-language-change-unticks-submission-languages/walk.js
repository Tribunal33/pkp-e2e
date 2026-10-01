/**
 * U57 A1 — a change on the site's "Languages" list unticks every journal's
 * submission languages that the site has not enabled.
 *
 * Kept walk for docs/issues/U57-A1-site-language-change-unticks-submission-languages.md.
 * Runs on a dataset fleet (PKP's default test dataset), reset before each walk:
 *
 *   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all \
 *     shared/playwright/checks/issues/site-language-change-unticks-submission-languages/walk.js [neighbour]
 *
 * Default: the report's Steps (German added and ticked under "Submissions" by
 * the manager `rvaca`; the admin installs Spanish on the site; the manager's
 * "Submission Languages" and the submission start page read before and after).
 * `neighbour`: the admin disables French (Canada) on the site; French must
 * still leave the journal's "Website Languages" (the site's interface rule,
 * which a fix must keep), and what its "Submission Languages" row keeps is read.
 */
const {
  forEachApp,
  launch,
  signIn,
  signOut,
  screen,
  record,
  idle,
  note,
} = require("../../../probe");

const NEIGHBOUR = process.argv.includes("neighbour");
const CONTEXT = "publicknowledge";

/** The ticks of one language list, as {code: {column: checked}}. */
async function readGrid(page, containerId) {
  return page.evaluate((id) => {
    const out = {};
    const box = document.getElementById(id);
    if (!box) return null;
    for (const tr of box.querySelectorAll("tbody tr.gridRow")) {
      const code = tr.id.replace(/^.*-row-/, "");
      const cells = {};
      for (const input of tr.querySelectorAll('input[id^="select-cell-"]')) {
        const col = input.id
          .replace(`select-cell-${code}-`, "")
          .replace(/-.*$/, "")
          .replace(/[0-9a-f]{13}$/, "");
        cells[col] = input.checked;
      }
      out[code] = cells;
    }
    return out;
  }, containerId);
}

/** The manager's Languages tab, both lists read. */
async function readLanguagesTab(page, label) {
  const { JournalLanguagesTab } = require("../../../pages/LanguagesPages.js");
  const tab = new JournalLanguagesTab(page, CONTEXT);
  await tab.goto();
  const out = {
    website: await readGrid(page, "languageGridContainer"),
    submission: await readGrid(page, "submissionLanguageGridContainer"),
  };
  record(label, { ...out, screen: await screen(page) });
  return { tab, out };
}

/** The submission start page's "Submission Language" choices. */
async function readStartPage(page, app, label) {
  await page.goto(app.url(`/index.php/${CONTEXT}/en/submission`));
  await idle(page);
  const group = page
    .locator("fieldset")
    .filter({ hasText: "Submission Language" })
    .first();
  const offered = (await group.count())
    ? (await group.locator("label").allInnerTexts())
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter(Boolean)
    : [];
  const s = await screen(page);
  record(label, { offered, screen: s });
  return offered;
}

forEachApp(async (app) => {
  const { SiteLanguagesList } = require("../../../pages/LanguagesPages.js");
  const { page, close } = await launch(app);
  const facts = { app: app.name, neighbour: NEIGHBOUR };
  try {
    if (!NEIGHBOUR) {
      // 1-2. rvaca, Settings › Website › Setup › Languages
      await signIn(page, "rvaca");
      const { tab, out: before } = await readLanguagesTab(
        page,
        "01-languages-before",
      );
      facts.before = before;
      // 3. "Add/Remove Languages", tick German, "Save"
      const win = await tab.openAddRemove();
      facts.addWindowGermanLabel = (
        await win
          .box("de")
          .evaluate(
            (el) =>
              el.closest("label")?.innerText ||
              el.parentElement?.innerText ||
              "",
          )
      ).trim();
      await win.box("de").check();
      const added = await win.save();
      facts.addStatus = added.status();
      await idle(page);
      facts.afterAdd = await readGrid(page, "submissionLanguageGridContainer");
      record("02-german-added", {
        grid: facts.afterAdd,
        screen: await screen(page),
      });
      // 4. tick "Submissions" on German's row
      const pressed = await tab.pressSubmission("de", "submissionLocale");
      facts.tickStatus = pressed.response.status();
      facts.tickAlerts = pressed.alerts;
      await idle(page);
      const { out: ticked } = await readLanguagesTab(page, "03-german-ticked");
      facts.ticked = ticked.submission;
      // 5. the start page
      facts.startBefore = await readStartPage(page, app, "04-start-before");
      await signOut(page);

      // 6-7. admin installs Spanish on the site
      await signIn(page, "admin");
      const site = new SiteLanguagesList(page);
      await site.goto();
      facts.siteBefore = await site.codes();
      record("05-site-languages-before", {
        codes: facts.siteBefore,
        screen: await screen(page),
      });
      const install = await site.openInstall();
      await install.box("es").check();
      facts.esLabel = (
        await install
          .box("es")
          .evaluate(
            (el) =>
              el.closest("label")?.innerText ||
              el.parentElement?.innerText ||
              "",
          )
      ).trim();
      const saved = await install.save();
      facts.installStatus = saved.status();
      const s6 = await screen(page);
      facts.installNotices = s6.notices;
      await site.reload();
      facts.siteAfter = await site.codes();
      record("06-site-languages-after-install", {
        codes: facts.siteAfter,
        screen: s6,
      });
      await signOut(page);

      // 8-9. rvaca again
      await signIn(page, "rvaca");
      const { out: after } = await readLanguagesTab(page, "07-languages-after");
      facts.after = after;
      facts.startAfter = await readStartPage(page, app, "08-start-after");
    } else {
      // Neighbour: admin disables French (Canada) on the site
      await signIn(page, "rvaca");
      const { out: before } = await readLanguagesTab(
        page,
        "n1-languages-before",
      );
      facts.before = before;
      await signOut(page);
      await signIn(page, "admin");
      const site = new SiteLanguagesList(page);
      await site.goto();
      await site.enableBox("fr_CA").click();
      const asked = site.question("Disable");
      await asked.waitFor({ timeout: 30_000 });
      facts.question = (await asked.innerText()).replace(/\s+/g, " ").trim();
      const resp = await site.answer("Disable", "OK");
      facts.disableStatus = resp && resp.status();
      const s = await screen(page);
      facts.disableNotices = s.notices;
      await site.reload();
      facts.siteEnabled = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            'input[id^="select-cell-"][id*="-enable"]',
          ),
        ].map(
          (i) =>
            `${i.id.replace(/^select-cell-/, "").replace(/-enable.*$/, "")}:${i.checked}`,
        ),
      );
      record("n2-site-after-disable", {
        enabled: facts.siteEnabled,
        screen: s,
      });
      await signOut(page);
      await signIn(page, "rvaca");
      const { out: after } = await readLanguagesTab(page, "n3-languages-after");
      facts.after = after;
      facts.startAfter = await readStartPage(page, app, "n4-start-after");
    }
  } catch (e) {
    facts.error = String(e && e.stack ? e.stack : e).slice(0, 1500);
    note(
      `w50 ${app.name}${NEIGHBOUR ? " neighbour" : ""}: ${facts.error.split("\n")[0]}`,
    );
    record("error-screen", await screen(page).catch(() => null));
  } finally {
    record(NEIGHBOUR ? "facts-neighbour" : "facts", facts);
    console.log(JSON.stringify(facts, null, 1));
    await close();
  }
});
