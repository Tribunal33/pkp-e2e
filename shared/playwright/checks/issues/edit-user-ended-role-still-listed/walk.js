// Issue report for U53 A17: after "Edit User" ends a role on the Settings
// wizard's "Users" grid, the user's row, as the grid redraws it after "User
// edited.", still lists the role just ended until the page is reloaded.
// Takes the report's Steps through the screens on a dataset fleet (PKP's
// default test dataset), freshly reset, on OJS, OMP and OPS:
//   1-2. sign in as admin; Administration › "Hosted Journals" (Presses,
//        Servers) › publicknowledge › "Settings wizard" › "Users"
//   3.   search ccorino (OMP: aclark): "Author, Reader"
//   4-5. the row's "Edit User"; untick "Author"; "OK"
//   6.   the row as redrawn after "User edited.", and again 3 s later
//   7.   reload the page, "Users" tab, search again: the row
// Neighbour check (always run after step 7; the fix must leave it as it is):
// "Edit User" again, tick "Author", "OK": the row reads both roles at once (a
// role granted in the save's own second stays listed).
// REACH=1 walks instead (after steps 1-2) the grid's own "Remove" on another
// Author and Reader (ckwantes; OMP afinkel): the row as the grid redraws it,
// 3 s later, and after a reload.
// Besides the screens it records, for Evidence, the HTTP Date of the save and
// of the row's redraw (the browser's own requests) and the user_user_groups
// rows of the user.
//
// Reset first:  npm run fleet-prep -- --feature issues-r46 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-r46 PROBE_AGENT=r46 node bin/probe.js all shared/playwright/checks/issues/edit-user-ended-role-still-listed/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r46-3_5 PROBE_AGENT=r46 node bin/probe.js all <this file>
const {
  forEachApp,
  launch,
  signIn,
  signOut,
  screen,
  shot,
  record,
  idle,
  sql,
} = require("../../../probe");

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) =>
  String(s == null ? "" : s)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);
const HOSTED = {
  ojs: "Hosted Journals",
  omp: "Hosted Presses",
  ops: "Hosted Servers",
};
const WHO = { ojs: "ccorino", omp: "aclark", ops: "ccorino" };
const REACH = !!process.env.REACH;
const REACH_WHO = { ojs: "ckwantes", omp: "afinkel", ops: "ckwantes" };

forEachApp(async (app) => {
  if (!app.dataset)
    throw new Error(
      "walk.js runs on a dataset fleet only (fleet-prep --dataset n)",
    );
  const who = WHO[app.name];
  const email = `${who}@mailinator.com`;
  const facts = {
    app: app.name,
    line: app.line || "main",
    run: process.env.PROBE_RUN || null,
    user: who,
  };
  const fact = (k, v) => {
    facts[k] = v;
    console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
  };
  const rec = async (page, name) => {
    const s = await screen(page).catch((e) => ({
      error: flat(e.message, 200),
    }));
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
  };
  const rows = () =>
    sql(
      app,
      `select coalesce(s.setting_value, ''), coalesce(uug.date_start::text, 'NULL'), coalesce(uug.date_end::text, 'NULL') from user_user_groups uug join users u using (user_id) join user_groups g using (user_group_id) left join user_group_settings s on s.user_group_id = g.user_group_id and s.setting_name = 'name' and s.locale = 'en' where u.username = '${who}' order by uug.user_user_group_id`,
    )
      .split("\n")
      .filter(Boolean);
  const rolesCell = async (grid) => {
    const cells = await grid.rowCells(email);
    return cells[3];
  };

  fact("db before", rows());
  const { page, close } = await launch(app);
  page.setDefaultTimeout(T);
  // The save (update-user) and the row's redraw (fetch-row): their HTTP Date.
  const calls = [];
  page.on("response", (r) => {
    const m = r
      .url()
      .match(/user-grid\/(update-user|remove-user|fetch-row|fetch-grid)/);
    if (m)
      calls.push({
        call: m[1],
        status: r.status(),
        date: r.headers()["date"],
        at: Date.now(),
      });
  });
  try {
    const {
      HostedContextsPage,
      UserDetailsWindow,
    } = require("../../../pages/UsersManagementPages.js");
    // 1-2
    await signIn(page, "admin");
    const hosted = new HostedContextsPage(page, {
      hostedLabel: HOSTED[app.name],
    });
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(app.contextPath);
    let grid = await hosted.openWizardTab("Users");
    if (!REACH) {
      // 3
      await grid.search({ text: who });
      fact("3 roles before", await rolesCell(grid));
      await rec(page, "s3-row-before");

      const editRoles = async (role, tick, label) => {
        await grid.chooseAction(email, "Edit User");
        const edit = new UserDetailsWindow(page, "Edit User");
        await edit.expectOpen();
        await edit.roleBox(role).setChecked(tick);
        await rec(page, `${label}-edit-user`);
        calls.length = 0;
        const redraw = page.waitForResponse(
          (r) => /user-grid\/fetch-row/.test(r.url()),
          { timeout: T },
        );
        await edit.okButton.click();
        await redraw;
        await edit.expectClosed();
        await idle(page);
        const s = await rec(page, `${label}-after-ok`);
        const now = await rolesCell(grid);
        await pause(3000);
        const later = await rolesCell(grid);
        await rec(page, `${label}-after-3s`);
        return {
          notices: s.notices,
          rowAfterOk: now,
          rowAfter3s: later,
          http: calls.map(({ call, status, date }) => ({ call, status, date })),
          db: rows(),
        };
      };
      // 4-6
      fact("5-6 untick Author", await editRoles("Author", false, "s5"));
      // 7
      grid = await hosted.reloadWizardTab("Users");
      await grid.search({ text: who });
      fact("7 roles after reload", await rolesCell(grid));
      await rec(page, "s7-after-reload");
      // neighbour
      fact("n tick Author again", await editRoles("Author", true, "n"));
      grid = await hosted.reloadWizardTab("Users");
      await grid.search({ text: who });
      fact("n roles after reload", await rolesCell(grid));
    } else {
      // The grid's own "Remove" ends every role of the user in the context
      // and redraws the row through the same column.
      const other = REACH_WHO[app.name];
      const otherEmail = `${other}@mailinator.com`;
      await grid.search({ text: other });
      const before = (await grid.rowCells(otherEmail))[3];
      let dialogText = null;
      page.once("dialog", async (d) => {
        dialogText = d.message();
        await d.accept();
      });
      calls.length = 0;
      const redraw = page
        .waitForResponse((r) => /user-grid\/fetch-row/.test(r.url()), {
          timeout: T,
        })
        .catch(() => null);
      await grid.chooseAction(otherEmail, "Remove");
      const confirm = page
        .locator('[role="dialog"]')
        .filter({ hasText: /Remove|remove/ })
        .last();
      const okButton = confirm.getByRole("button", { name: /^(OK|Yes)$/ });
      if (
        await okButton
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
      ) {
        await okButton.first().click();
      }
      await redraw;
      await idle(page);
      const s = await rec(page, "r-after-remove");
      const n = await grid.row(otherEmail).count();
      const now = n
        ? (await grid.rowCells(otherEmail))[3]
        : `no row for ${otherEmail}`;
      await pause(3000);
      const later = (await grid.row(otherEmail).count())
        ? (await grid.rowCells(otherEmail))[3]
        : `no row for ${otherEmail}`;
      fact("r grid Remove", {
        user: other,
        before,
        dialogText,
        notices: s.notices,
        rowAfterRemove: now,
        rowAfter3s: later,
        http: calls.map(({ call, status, date }) => ({ call, status, date })),
      });
      grid = await hosted.reloadWizardTab("Users");
      await grid.search({ text: other });
      fact(
        "r after reload",
        (await grid.row(otherEmail).count())
          ? (await grid.rowCells(otherEmail))[3]
          : `no row for ${otherEmail}`,
      );
    }
    await signOut(page);
  } finally {
    record("facts", facts);
    await close();
  }
});
