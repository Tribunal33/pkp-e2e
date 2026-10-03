// Issue report docs/issues/U08-A7-open-menu-button-always-english.md (U08 A7): in a narrow window
// the public header's menu button is named "Open Menu" in every interface language. Takes the
// report's Steps on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets").
// The kit builds nothing; no sign-in.
//
//   1. open /index.php/publicknowledge/fr_CA (the dataset's French)
//   2. narrow the window to 375 px: the menu button appears
//   3. read the button's name as assistive technology gets it (aria snapshot, accessible name)
//   4. press the button: the menus open
//   5. control: the names of "Search" and the skip links on the same page
//
// Neighbour mode (`neighbour` as the script's argument, run alone, fix in and out):
//   - the English home page, narrow: the button still reads "Open Menu" and still opens the menus
//   - both languages in a wide window (1280 px): the button stays hidden
//   - the button's text stays out of sight (the three lines are drawn over it)
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u08h --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u08h PROBE_AGENT=u08h node bin/probe.js all shared/playwright/checks/issues/open-menu-button-always-english/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u08h-3_5 PROBE_AGENT=u08h node bin/probe.js all shared/playwright/checks/issues/open-menu-button-always-english/walk.js
// Facts: .reports/<feature>/u08h/facts[-neighbour][-<run>]-<app>.json
const { forEachApp, launch, screen, shot, record, idle } = require("../../../probe");

const neighbour = process.argv.includes("neighbour");
const NARROW = { width: 375, height: 800 };
const WIDE = { width: 1280, height: 900 };

// The button as assistive technology gets it, and whether its text is in sight.
async function readToggle(page) {
  const button = page.locator("button.pkp_site_nav_toggle");
  const count = await button.count();
  if (!count) return { count };
  const visible = await button.first().isVisible();
  const aria = visible ? await button.first().ariaSnapshot().catch((e) => `error ${e}`) : null;
  const geometry = await button.first().evaluate((b) => {
    const span = b.querySelector("span");
    const r = span ? span.getBoundingClientRect() : null;
    const range = document.createRange();
    if (span) range.selectNodeContents(span);
    const t = span ? range.getBoundingClientRect() : null;
    return {
      text: b.textContent.trim(),
      ariaLabel: b.getAttribute("aria-label"),
      ariaExpanded: b.getAttribute("aria-expanded"),
      spanBox: r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      textBox: t && { x: Math.round(t.x), w: Math.round(t.width) },
      textIndent: span ? getComputedStyle(span).textIndent : null,
    };
  });
  return { count, visible, aria, ...geometry };
}

async function readHeader(page) {
  return page.evaluate(() => {
    const menu = document.querySelector(".pkp_site_nav_menu");
    return {
      htmlLang: document.documentElement.lang,
      title: document.title,
      skipLinks: [...document.querySelectorAll(".cmp_skip_to_content a")].map((a) => a.textContent.trim()),
      search: [...document.querySelectorAll(".pkp_navigation_search_wrapper a")].map((a) => a.textContent.trim()),
      navLabel: menu ? menu.getAttribute("aria-label") : null,
      menuOpenClass: menu ? menu.classList.contains("pkp_site_nav_menu--isOpen") : null,
      menuVisible: menu ? menu.offsetParent !== null && menu.getBoundingClientRect().height > 0 : null,
    };
  });
}

forEachApp(async (app) => {
  if (!app.dataset) throw new Error("walk.js runs on a dataset fleet");
  const facts = { app: app.name, line: app.line || "main", mode: neighbour ? "neighbour" : "steps" };
  const fact = (k, v) => {
    facts[k] = v;
    console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
  };
  const home = (locale) => `/index.php/${app.contextPath}/${locale}`;

  const { page, close } = await launch(app);
  try {
    if (!neighbour) {
      // 1
      const r = await page.goto(app.url(home("fr_CA")));
      await idle(page);
      fact("1 French home", { status: r && r.status(), url: page.url(), ...(await readHeader(page)) });
      // 2
      await page.setViewportSize(NARROW);
      await idle(page);
      // 3
      fact("3 button, narrow, French", await readToggle(page));
      record("3-french-narrow", await screen(page));
      await shot(page, "3-french-narrow").catch(() => {});
      // 4
      try {
        await page.locator("button.pkp_site_nav_toggle").click();
        await idle(page);
        fact("4 after press", { header: await readHeader(page), button: await readToggle(page) });
        await shot(page, "4-french-narrow-open").catch(() => {});
      } catch (e) {
        fact("4 error", String(e).slice(0, 500));
      }
      // 5 (control): read with step 1's header facts; aria of the header for the record
      fact(
        "5 header aria",
        await page.locator("header").first().ariaSnapshot().catch((e) => `error ${e}`),
      );
    } else {
      for (const locale of ["en", "fr_CA"]) {
        await page.setViewportSize(NARROW);
        await page.goto(app.url(home(locale)));
        await idle(page);
        fact(`nb ${locale} narrow button`, await readToggle(page));
        try {
          await page.locator("button.pkp_site_nav_toggle").click();
          await idle(page);
          fact(`nb ${locale} narrow after press`, (await readHeader(page)).menuOpenClass);
        } catch (e) {
          fact(`nb ${locale} press error`, String(e).slice(0, 500));
        }
        await page.setViewportSize(WIDE);
        await page.goto(app.url(home(locale)));
        await idle(page);
        fact(`nb ${locale} wide button`, await readToggle(page));
        await shot(page, `nb-${locale}-wide`).catch(() => {});
      }
    }
  } finally {
    record(neighbour ? "facts-neighbour" : "facts", facts);
    await close();
  }
});
