// Issue report docs/issues/U01-A2-keep-me-logged-in-always-ticked.md (U01 A2): "Keep me logged
// in" arrives ticked every time the Login form shows, so a user who unticks it, mistypes the
// password and signs in on the next try is kept signed in anyway. Takes the report's Steps on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//
//   1. signed out, open the Login page: read the box
//   2-4. dbarnes / wrongpassword, untick the box, "Login": read the error and the box
//   5. dbarnesdbarnes, the box as shown, "Login": where it lands, and the remember_web_* cookie
//
// Neighbour mode (`neighbour` as the script's argument, run alone, fix in and out): the box left
// ticked on a refused attempt comes back ticked, and the next correct sign-in sets the
// remember_web_* cookie (the opt-in keeps working).
//
// Reset first:  npm run fleet-prep -- --feature issues-u01a --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u01a PROBE_AGENT=u01a node bin/probe.js all shared/playwright/checks/issues/keep-me-logged-in-always-ticked/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u01a-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u01a-3_5 PROBE_AGENT=u01a node bin/probe.js all shared/playwright/checks/issues/keep-me-logged-in-always-ticked/walk.js
// Facts: .reports/<feature>/u01a/facts[-neighbour][-<run>]-<app>.json
const { forEachApp, launch, signOut, screen, shot, record, idle } = require("../../../probe");

const USER = "dbarnes";
const neighbour = process.argv.includes("neighbour");

forEachApp(async (app) => {
  if (!app.dataset) throw new Error("walk.js runs on a dataset fleet");
  const facts = { app: app.name, line: app.line || "main", mode: neighbour ? "neighbour" : "steps" };
  const fact = (k, v) => {
    facts[k] = v;
    console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
  };
  const box = (page) => page.getByLabel("Keep me logged in");
  const readForm = async (page) => ({
    url: page.url(),
    error: await page.locator(".pkp_form_error").innerText().catch(() => null),
    username: await page.locator("#username").inputValue().catch(() => null),
    boxChecked: await box(page).isChecked().catch((e) => `error: ${String(e).slice(0, 200)}`),
    boxMarkup: await page.locator("#remember").evaluate((el) => el.outerHTML).catch(() => null),
  });
  const cookies = async (page) =>
    (await page.context().cookies()).map((c) => ({
      name: c.name,
      session: c.expires === -1,
      days: c.expires === -1 ? null : Math.round((c.expires * 1000 - Date.now()) / 864e5),
    }));
  const press = async (page) => {
    const answered = page.waitForResponse(
      (r) => r.request().resourceType() === "document" && /\/login\/signIn/.test(r.url()),
      { timeout: 60_000 },
    );
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await answered;
    await page.waitForLoadState("load");
    await idle(page);
  };
  const loginPath = `/index.php/${app.contextPath}${app.line && /3_[34]/.test(app.line) ? "" : "/en"}/login`;

  const { page, close } = await launch(app);
  try {
    await signOut(page).catch(() => {});
    // 1
    await page.goto(app.url(loginPath));
    await idle(page);
    fact("1 fresh login page", await readForm(page));
    record("1-fresh-login", await screen(page));
    await shot(page, "1-fresh-login").catch(() => {});
    // 2-4
    try {
      await page.getByLabel("Username or Email").fill(USER);
      await page.getByLabel("Password", { exact: false }).first().fill("wrongpassword");
      if (neighbour) await box(page).check();
      else await box(page).uncheck();
      fact("3 box before Login", await box(page).isChecked());
      await press(page);
      fact("4 refused form", await readForm(page));
      record("4-refused", await screen(page));
      await shot(page, "4-refused").catch(() => {});
    } catch (e) {
      fact("4 error", String(e).slice(0, 500));
    }
    // 5
    try {
      await page.getByLabel("Password", { exact: false }).first().fill(`${USER}${USER}`);
      fact("5 box as pressed", await box(page).isChecked());
      await press(page);
      fact("5 landed", { url: page.url(), title: await page.title() });
      const all = await cookies(page);
      fact("5 cookies", all);
      fact("5 remember cookie", all.filter((c) => /^remember_/.test(c.name)));
      record("5-landed", await screen(page));
    } catch (e) {
      fact("5 error", String(e).slice(0, 500));
    }
  } finally {
    record(neighbour ? "facts-neighbour" : "facts", facts);
    await close();
  }
});
