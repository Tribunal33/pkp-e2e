# "What is ORCID?" beside the ORCID button opens ORCID's sign-in instead of the explanation page

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the ORCID Profile plugin's link opens the "What is ORCID?" page)
  - 3.3: none (code; the ORCID Profile plugin's link opens the "What is ORCID?" page)
- **Introduced** `pkp/pkp-lib#10829` for `pkp/pkp-lib#10792` · [3f903cbaab](https://github.com/pkp/pkp-lib/commit/3f903cbaab83a9d6af9ce32d6a68ab7b370b9de3) · 2025-01-24 · Taslan Graham (taslangraham)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U04 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a journal, press or preprint server with ORCID turned on, a user who
presses "What is ORCID?" beside the "Create or Connect your ORCID iD"
button gets ORCID's sign-in window, the same as the button, instead of
the site's "What is ORCID?" page. This happens on the profile's Identity
tab and at the top of the registration form.

The window opens over the page: the profile, or the registration form
with whatever the visitor has typed, stays as it was behind it, and the
user can close the window and carry on. Nothing typed is lost.

## Impact

- **Lost**: no data. The explanation the link names is out of reach
  from the screen that offers it, and pressing the link starts ORCID's
  sign-in the user did not ask for.
- **Who**: every signed-in user who has no verified iD, on their
  profile's Identity tab, and every visitor on the registration page,
  wherever a manager has turned ORCID on, each time they press the link.
- **Way round**: none on screen; the page opens only by typing its
  address. Only a submission's contributors who are asked to connect
  their iD get a working link, in the "Submission ORCID" and
  "Requesting ORCID record access" emails.

Low: nothing is lost and connecting an iD still works; it would be
medium if the team counts reading the explanation before connecting as
a task of its own.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. OMP and OPS are the same, on the
  press and the preprint server.
- ORCID is on (the dataset has it off): sign in as `rvaca`, open
  Settings › Users & Roles › "ORCID", tick "Enable ORCID
  functionality", leave "ORCID API" on "Public", Client ID
  `APP-0000000000000000`, Client Secret
  `00000000-0000-0000-0000-000000000000`, "Save". No account in the
  dataset holds an iD.
- Compare the window's address, not its content: with this made-up
  Client ID, orcid.org shows its own error page in the window rather
  than a sign-in form. Pressing the button or the link also signs the
  browser out of orcid.org.

Profile:

1. Still signed in as `rvaca`, open the profile
   (`/index.php/publicknowledge/user/profile`). It opens on "Identity",
   which shows "Create or Connect your ORCID iD" and, beside it, the
   link "What is ORCID?".
2. Press "Create or Connect your ORCID iD": a small window opens on
   ORCID's sign-in address while the profile stays put. Close it.
3. Press "What is ORCID?".

Registration:

4. Sign out and open the registration page
   (`/index.php/publicknowledge/user/register`). The form opens with
   "Create or Connect your ORCID iD" and "What is ORCID?" at its top.
5. Press "What is ORCID?".

**Expected**: in steps 3 and 5, the journal's "What is ORCID?" page
opens, the page the link points to
(`/index.php/publicknowledge/en/orcid/about`).

**Observed**: in steps 3 and 5, the same small window as in step 2
opens, on ORCID's sign-in address, and the profile or the form stays
where it was; the "What is ORCID?" page never opens. (On an install
that reaches orcid.org, the window shows ORCID's error page for the
made-up Client ID.) The window's
address, with the install's host shortened to `…`:

```
step 3: https://orcid.org/oauth/authorize?client_id=APP-0000000000000000&response_type=code&scope=%2Fauthenticate&redirect_uri=…%2Findex.php%2Fpublicknowledge%2Forcid%2FauthorizeOrcid%3FtargetOp%3Dprofile
step 5: https://orcid.org/oauth/authorize?client_id=APP-0000000000000000&response_type=code&scope=%2Fauthenticate&redirect_uri=…%2Findex.php%2Fpublicknowledge%2Forcid%2FauthorizeOrcid%3FtargetOp%3Dregister
```

Control: the link's own address,
`/index.php/publicknowledge/en/orcid/about`, typed into the address
bar, opens the page ("Home / What is ORCID?", heading "What is
ORCID?").

## Cause

The link in lib/pkp `templates/form/orcidProfile.tpl` (line 26), which
both the profile's Identity tab (`templates/user/identityForm.tpl`) and
the registration form (`templates/frontend/pages/userRegister.tpl`)
include, carries the connect button's handler:

```smarty
<a href="{url router="page" page="orcid" op="about"}" onclick="return openORCID();">{translate key='orcid.about.title'}</a>
```

`openORCID()`, defined in the same template, sends ORCID's sign-out
request (`userStatus.json?logUserOut=true`), opens the sign-in window
on `$orcidOAuthUrl` and returns `false`, which cancels the link's own
navigation. So the `href` is never followed.

The handler came with `pkp/pkp-lib#10829` (ORCID branding for
unauthenticated iDs, `pkp/pkp-lib#10792`). Before it, one button
already switched between "Create or Connect your ORCID iD" and
"Authorize and Connect your ORCID iD"; the change moved that switch
outside the button, making two buttons, added the hollow-icon iD link
before the second, and added the `onclick` to the "What is ORCID?" link,
which until then was plain. Nothing in that issue asks for the link to
change.

The plain link lived only on `main`, from `c79f538c51` (ORCID moved into
the core) to this change: lib/pkp `stable-3_5_0` branched after it, so
every 3.5 release has the fault, and sites meet it on upgrading from 3.4,
whose ORCID Profile plugin has a plain link.

Reach:

- A user whose iD is not yet verified sees "Authorize and Connect your
  ORCID iD" with the same link beside it: both buttons and the link sit
  in one Smarty block, `{capture name=orcidButton}` (checked in the
  code).
- The sign-out request also goes out when the link is pressed, signing
  the user out of orcid.org in that browser (read in the code, not
  observed: the walk answered ORCID's site locally).
- No other link calls `openORCID()`; the ORCID emails link to the page
  directly through `{$orcidAboutUrl}` (lib/pkp
  `classes/mail/traits/OrcidVariables.php`; checked in the code).

## Proposed fix

Drop the handler from the link, and open the page in a new tab, so a
half-filled registration form or unsaved profile stays open
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-about-link-opens-sign-in/fix.diff)):

```diff
-    <a href="{url router="page" page="orcid" op="about"}" onclick="return openORCID();">{translate key='orcid.about.title'}</a>
+    <a href="{url router="page" page="orcid" op="about"}" target="_blank">{translate key='orcid.about.title'}</a>
```

Tried on `main` on the journal, the press and the preprint server: with
the fix in, steps 3 and 5 opened the "What is ORCID?" page in a new tab
and left the profile and the form in place, and the connect button on
both pages still opened ORCID's sign-in window, as it does with the fix
out.

How this was settled:

- **How the code base does it.** The same registration form's privacy
  statement link (`user.register.form.privacyConsent`, lib/pkp
  `locale/en/user.po` line 410) opens the journal's own page in a new
  tab, for the same reason. The one shared template covers both pages.
- **What the introducing change was for.** The hollow icon and the
  separate "authorize" button for unauthenticated iDs; both stay.
- **What it touches.** No API, hook or stored data. It applies as
  written to 3.5.
- **The test.** The e2e step in spec U04, Scenario 2, which presses the
  link and expects the page.

**Alternatives**

- Remove only the `onclick`: the true revert (the 3.4 plugin's link
  and the core's first one opened in the same tab), but the page then
  replaces the registration form the visitor was filling in.
- Keep the handler and make `openORCID()` skip links: a special case
  for a link that needs no script.

Small: one attribute in one template, tried.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/orcid-about-link-opens-sign-in/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-about-link-opens-sign-in/walk.js)
  (the ORCID settings helper is `setOrcidMember()` in
  [`../publish-without-issue-orcid-contributor-error/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publish-without-issue-orcid-contributor-error/lib.js),
  called with the "Public" API) takes the preconditions and Steps on
  the three apps loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/orcid-about-link-opens-sign-in/walk.js`;
  with `MODE=nb` it presses only the connect button on both pages, for
  the fix trial. orcid.org is unreachable from the test installs, so the
  browser's requests to ORCID's site are answered locally
  (`shared/playwright/support/orcid.js`); the script records the address
  the page passes to `window.open()`.
- The trial: `node bin/try-fix.js apply <dir>/fix.diff ojs omp ops`, the
  walk and `MODE=nb` with the fix in, `revert` with the same arguments,
  `MODE=nb` again with the fix out. No rebuild is needed (a template).
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL,
  the default datasets of pkp/datasets c312c01 (2026-10-03). The browser
  showed no alert, notice or script error, and no request failed.
- 3.4 and 3.3 (code): lib/pkp has no `templates/form/orcidProfile.tpl`
  there; ORCID is the ORCID Profile plugin (pkp/orcidProfile, bundled
  with OJS and OPS at 894c2593e0 / 7d8c4e3c51 on 3.4 and 41864d3770 on
  3.3, and the plugin's `stable-3_4_0` and `stable-3_3_0` tips for OMP,
  which installs it from the Plugin Gallery). Its
  `templates/orcidProfile.tpl` line 22 is a plain
  `<a href="{url router="page" page="orcidapi" op="about"}">` with no
  handler. `3f903cbaab` is not on lib/pkp `stable-3_4_0`.
- Introduced: `git blame` on line 26 gives `3f903cbaab`; its diff turns
  the plain link of `c79f538c51` (`pkp/pkp-lib#9771`, ORCID moved into
  the core, committed 2024-06-21) into the one with `onclick`. lib/pkp
  `stable-3_5_0` branched from `main` at `c5a638eaec` (2025-02-28),
  after it.
- Branch tips: main OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c
  and OPS c8af945bb7 (lib/pkp 3dc90c81a6); 3.5 OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335);
  3.4 OJS d68934d0d1, OMP 0aec65441f, OPS acd8ae704b (lib/pkp
  767353f4fe); 3.3 OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161
  (lib/pkp ac3fa73402).
