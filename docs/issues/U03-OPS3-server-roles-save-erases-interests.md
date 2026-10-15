# On a preprint server, saving the Profile's Roles tab erases the account's reviewing interests

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12014` for `pkp/pkp-lib#12013` · [093e000b86](https://github.com/pkp/pkp-lib/commit/093e000b868aac526038d53a22cf916cc66ffc6f) · 2025-11-27 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U03 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#ops3)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a preprint server, the Profile's "Roles" tab has no "Reviewing
interests" box. Even so, every "Save" on that tab, even one with nothing
changed, deletes the reviewing interests stored for the account. The tab
says "Your changes have been saved.", and nothing tells the user or a
manager that the interests are gone.

A server account gets interests in one of two ways:

- the site-wide Register page, which still asks for them on a preprint
  server;
- an upgrade from 3.5, where the server's Roles tab still had the box.

A server has no reviewers, so nothing on it uses the interests. What is
lost is only what the person typed.

## Impact

- **Lost**: the account's stored reviewing interests, at its first
  Roles-tab "Save".
- **Who**: preprint-server users who hold interests, at any "Save" on
  their Profile's "Roles" tab, with or without a change.
- **Way round**: none for the user, whose tab has no box. A Preprint
  Server manager's Users & Roles page shows the interests read-only. A
  site administrator can type them again in Administration › "Hosted
  Servers" › the server's settings › "Users" › "Edit User", which has the
  box (read in the code, not driven). Not pressing "Save" keeps them.

Low: nothing on a preprint server relies on the interests. It would be
higher if the same save also erased them on a journal or press.

The fix proposed here stops the erasing. Whether a server should collect
interests at all is the Register page's question, which is
*Registration & account validation*
[OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U02-registration-and-account-validation.md#ops1).
The interests already stored need this fix either way.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` ("Public Knowledge Preprint
  Server").

Steps:

1. Signed out, open `/index.php/index/en/user/register`, the site-wide
   "Register" page.
2. Fill "Given Name" `h15b`, "Family Name" `Newcomer`, "Affiliation"
   `h15b`, "Country" "Canada", "Email" `h15b.server@mailinator.com`,
   "Username" `h15bserver`, and "Password" and "Repeat password"
   `h15bserverh15bserver`.
3. Under "Public Knowledge Preprint Server", tick "Reader", then tick the
   server's privacy line that appears under it.
4. In the box under "If you requested to be a reviewer, please enter
   your subject interests." type `glacier, ethics`. Press "Register".
5. Sign in as `rvaca` (a Preprint Server manager). Open Settings ›
   "Users & Roles", search `h15b.server`, choose "Edit" in the row's
   menu, then press "View more details".
6. Sign in as `h15bserver`, open
   `/index.php/publicknowledge/en/user/profile`, select "Roles" and
   press "Save" without changing anything.
7. Sign in as `rvaca` and repeat step 5.

**Expected**: step 7 reads "Reviewing interests glacier, ethics", as
step 5 does. A tab without the interests box leaves them as they are.

**Observed**: step 4 ends on "Registration complete". Step 5 reads
"Reviewing interests glacier, ethics". In step 6 the tab lists "Reader"
(ticked) and "Author" and has no "Reviewing interests". "Save" posts the
role boxes only and shows "Your changes have been saved.":

```
POST …/$$$call$$$/tab/user/profile-tab/save-roles   200
readerGroup[5]=on&submitFormButton=
```

Step 7 reads "Reviewing interests --".

Control: on 3.5 the same tab shows "Reviewing interests" with the chips
"glacier" and "ethics", and posts them with the save. Step 7 then reads
"Reviewing interests glacier, ethics".

## Cause

`PKP\user\form\RolesForm::execute()` (pkp-lib
`classes/user/form/RolesForm.php`, line 106) always calls
`Repo::userInterest()->setInterestsForUser($user, $this->getData('interests'))`.
On OPS the tab posts no `interests`, so the method receives `null`. It
then deletes the account's links to its interests and adds none
(`UserInterest::query()->withUserId()->delete()`). This is also how it
clears the interests when a user removes every chip on a journal's or a
press's tab.

`RolesForm::fetch()` hides the field on OPS: it sets
`disableInterestsSection` from `Application::get()->getName() === 'ops'`
(line 58), which `templates/user/userGroups.tpl` reads. That condition
came with `pkp/pkp-lib#12014` for `pkp/pkp-lib#12013`. That change added
the interests suggestions API and left a server's tab without the box,
since a server has no reviewers. The save was not given the same
condition.

Reach:

- OPS only. OJS and OMP show the box and post it: checked on screen on
  3.5, and in the code on `main`.
- No other caller of `setInterestsForUser()` erases interests on OPS
  (code):
  - The Register pages and "Create New Reviewer" save a new account.
  - The Users XML import calls the method only when the file holds
    interests.
  - The administrator's "Edit User" includes
    `templates/common/userDetails.tpl`. That template has its own
    `{if !$disableInterestsSection}` switch, but `UserDetailsForm` never
    sets it, so the box shows and posts on OPS too.

## Proposed fix

Save the interests only where the tab offers them. Put the condition in
one method that both `fetch()` and `execute()` use:

```php
protected function hasInterestsSection(): bool
{
    return Application::get()->getName() !== 'ops';
}
…
$templateMgr->assign('disableInterestsSection', !$this->hasInterestsSection());
…
if ($this->hasInterestsSection()) {
    Repo::userInterest()->setInterestsForUser($user, $this->getData('interests'));
}
```

The full change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/server-roles-save-erases-interests/fix.diff).
The check belongs in the form, because `setInterestsForUser()` cannot
tell "no box" from "every chip removed": tag-it posts nothing in both
cases.

The fix was tried on `main` in OJS and OPS:

- With the fix, step 7 reads "Reviewing interests glacier, ethics".
- On OPS, ticking "Author" and saving still gives the account the role,
  with the fix and without it.
- On OJS, removing both chips and saving still clears the interests,
  with the fix and without it.

**Alternatives**

- Treat `null` as "leave the interests alone" in `setInterestsForUser()`.
  A journal's tab with every chip removed also posts nothing, so its
  user could no longer clear them.
- Post the stored interests back from the OPS template in hidden fields.
  The page would then carry a field the user cannot see or change.

**What goes with it**

- No repair is possible: interests that have already been erased cannot
  be restored.
- No API or hook change.
- Guard: an e2e check on OPS that a Roles "Save" keeps the interests
  that the manager's "View more details" lists.

Small: one condition in one pkp-lib form, and an e2e check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/server-roles-save-erases-interests/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/interest-listed-twice-after-roles-save/lib.js)),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 7912e09, 2026-10-14; PostgreSQL). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/server-roles-save-erases-interests/walk.js`
  for steps 1 to 7 (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- With `neighbour` as its argument, the script runs the side-effect
  checks instead of the steps: the same registration, then "Author"
  ticked and saved on OPS, or both chips removed and saved on OJS. The
  fix was applied with
  `node bin/try-fix.js apply shared/playwright/checks/issues/server-roles-save-erases-interests/fix.diff ojs ops`.
  The script also reads the account's stored links (read-only SQL) after
  steps 4 and 6.
- Branch tips (2026-10-15). `main`: OJS 378eced941, OPS 2ece50497f
  (pkp-lib b17fadae59). 3.5: OPS 44aec6e131 (pkp-lib 4045d9241e). 3.4:
  pkp-lib 55c8e406b3. 3.3: pkp-lib 5e84acd11b.
- 3.5, 3.4 and 3.3 (code): `RolesForm.php` has no
  `disableInterestsSection`, and `templates/user/userGroups.tpl` prints
  the field on every app.
- Not driven:
  - An install upgraded from 3.5. Its interests are stored the same
    way, so the save erases them the same way (code).
  - The administrator's "Edit User" form (code).
  - 3.4 and 3.3 (code).
