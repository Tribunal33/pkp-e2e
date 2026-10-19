# Saving a journal's locked ORCID tab leaves ORCID on, with no Client ID, after the site-wide ORCID switch is turned off

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; ORCID is the ORCID Profile plugin, with no site-wide switch on screen)
  - 3.3: none (code; ORCID is the ORCID Profile plugin, with no site-wide switch on screen)
- **Introduced** `pkp/pkp-lib#9818` for `pkp/pkp-lib#9771` · [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff) · 2024-06-21 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U04 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a17)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

While the Site Administrator's site-wide ORCID switch ("Enable ORCID
functionality site-wide") is on, each journal's ORCID tab shows the
journal's own "Enable ORCID functionality" box ticked and locked. A
Journal Manager who presses "Save" on that tab, to change one of the
fields it leaves editable ("City", the email option or the log level),
also stores the locked box as the journal's own setting, ticked.

When the site-wide switch is turned off again, a journal that had ORCID
off keeps it on, with no Client ID. Its Identity tab and Register page
offer "Create or Connect your ORCID iD", and "Request verification" on a
contributor emails the author an ORCID link. Both open ORCID's sign-in
with an empty client ID, which names no journal to connect an iD to.

Nobody is told. Nothing stored is lost, and a journal that had its own
ORCID on keeps it as it was.

## Impact

- **Lost**: no stored data. The journal's choice of ORCID off is
  overturned, and its users, visitors and contributors are offered
  ORCID controls whose sign-in carries no client ID. What ORCID shows
  for such an address was not seen: the test installs cannot reach
  orcid.org.
- **Who**: journals that had ORCID off, on an install whose site-wide
  switch was turned on and then off, if a manager saved the journal's
  ORCID tab in between. A journal that never set up ORCID itself, like
  the default dataset's, holds no Client ID and gets the empty one. One
  that turned ORCID off but kept its old credentials comes back on with
  them, working, against its choice.
- **Way round**: the Journal Manager unticks "Enable ORCID
  functionality" on the tab, which is no longer locked once the
  site-wide switch is off.

Medium: a silent wrong setting that leaves a journal's users with ORCID
controls that cannot connect an iD, in a rare setup with a way round on
screen; it would be high if turning the site-wide switch off were an
ordinary step.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP and OPS the same, on the press
  and the preprint server). Its journal has ORCID off, and the
  site-wide switch, "Enable ORCID functionality site-wide", is off.
  Nothing else is needed.

Turning the site-wide switch on:

1. Sign in as `admin`. Open Administration › "Site Settings", then
   "Site Setup" › "ORCID".
2. Tick "Enable ORCID functionality site-wide". Choose "ORCID API"
   "Public Sandbox", type "Client ID" `APP-H19A000000000000` and
   "Client Secret" `h19a-site-secret`, press "Save".

The journal manager changes the ORCID tab's "City":

3. Sign in as `rvaca`. Open Settings › "Users & Roles" › "ORCID". The
   box "Enable ORCID functionality" is ticked and greyed out, and the
   note ends "Contact your site administrator to disable ORCID
   functionality or change these credentials."
4. Type `Burnaby` in "City" and press "Save". The page says "Saved".

Turning the site-wide switch off:

5. As `admin`, open "Site Settings" › "Site Setup" › "ORCID" again,
   untick "Enable ORCID functionality site-wide" and press "Save".

What the journal is left with:

6. As `rvaca`, open Settings › "Users & Roles" › "ORCID".
7. As `rvaca`, open the profile (`/index.php/publicknowledge/user/profile`),
   which opens on "Identity".
8. Sign out, open the Register page
   (`/index.php/publicknowledge/user/register`) and press "Create or
   Connect your ORCID iD".

**Expected**: step 4 saves "City" and nothing else. After step 5 the
journal is back where it started: at step 6 "Enable ORCID
functionality" is unticked, and steps 7 and 8 show no ORCID button.

**Observed**: the save in step 4 sends the locked box with "City":

```
PUT /index.php/publicknowledge/api/v1/contexts/1   200
orcidEnabled=true&orcidCity=Burnaby&orcidSendMailToAuthorsOnPublication=false&orcidLogLevel=ERROR
```

At step 6 "Enable ORCID functionality" is ticked, now editable, with
"ORCID API" on "Public" and "Client ID" and "Client Secret" empty. Step
7 shows "Create or Connect your ORCID iD" on the Identity tab, and step
8 shows it on the Register page. Pressing it opens ORCID's sign-in
window with an empty client ID (the install's host shortened to `…`):

```
https://sandbox.orcid.org/oauth/authorize?client_id=&response_type=code&scope=%2Fauthenticate&redirect_uri=…%2Findex.php%2Fpublicknowledge%2Forcid%2FauthorizeOrcid%3FtargetOp%3Dregister
```

Control: the journal's own setting stays off through steps 2 and 3; it
is the "Save" in step 4 that turns it on.

## Cause

`PKP\components\forms\context\OrcidSettingsForm::__construct()` (lib/pkp
`classes/components/forms/context/OrcidSettingsForm.php`, lines 48–63)
builds the "Enable ORCID functionality" box. While the site-wide switch
is on (`OrcidManager::isGloballyConfigured()`, the site's
`orcidEnabled`), it sets the field's value to `true` and its one option
to `disabled`, so the box shows the site's state instead of the
journal's own `orcidEnabled`.

Unlike a disabled input in a plain HTML form, a disabled option is still
part of the field's value: the ui-library `Form` component's
`submitValues()` sends every field that is not `isInert`. So each "Save"
of the tab sends `orcidEnabled=true`, and `PUT /contexts/{id}` stores it
as the journal's own setting. The rule broken: a box that only displays
the site's configuration must not overwrite the journal's setting. The
three fields that show the site's API type, Client ID and secret under
the same condition are `FieldHTML`, which is inert, so they are not
sent; the box is the one field left out.

Once the site-wide switch is off, `OrcidManager::isEnabled()` reads the
journal's stored `true`, and `getClientId()` gives the journal's own
empty Client ID.

Reach:

- Every save of the tab while the site-wide switch is on sends the box,
  whichever field changed (seen for "City"; the form sends all its
  fields).
- With the journal left on, every `isEnabled()` check passes for it,
  and every ORCID address is built with the empty client ID:
  - the Identity tab and the Register page: "Create or Connect your
    ORCID iD" opens `…/oauth/authorize?client_id=&…` (seen). It goes to
    `sandbox.orcid.org` although the tab shows "Public": the journal's
    `orcidApiType` is unset, and `getOrcidUrl()` treats anything but a
    production type as the sandbox (code);
  - the contributor form: an "ORCID iD" field with "Request
    verification", whose "Submission ORCID" email carries the same empty
    `client_id` (seen, OJS). The same link goes out on acceptance when
    the tab's "Send e-mail to request ORCID authorization" is ticked
    (`SendAuthorOrcidEmail`, `SendAuthorMail`), and in the update-scope
    email (`SendUpdateScopeMail`) (code);
  - invitations: accepting one adds an ORCID verification step with the
    same address (`AcceptInvitationStep`), and the invitation's user
    details show an ORCID row (`UserDetailsForm`) (code);
  - reviewer suggestions gain an "ORCID iD" text box
    (`ReviewerSuggestionsForm`), and the Publish window warns about
    contributors' unverified iDs (`Repository::validatePublishWarnings()`)
    (code).
- What does not run for such a journal (code): deposits need the member
  API (`isMemberApiEnabled()`, false for an unset type) and an author
  with a verified iD and token; the citation lookups need a Client ID
  (`Inbound::hasReadCredentials()`); the sign-in return handlers
  (`AuthorizeUserData`, `VerifyIdentityWithOrcid`) run only when ORCID
  sends the user back.
- A journal that kept old credentials comes back on with them, and all
  of the above runs with them, deposits too when its stored API type is
  a member one (code).
- A journal with its own ORCID on is unaffected: it stays on with its
  own Client ID (seen).
- No other form component in lib/pkp, OJS, OMP or OPS has a locked
  option (a search for `'disabled' =>` in `classes/components/forms`).

## Proposed fix

Mark the box inert while the site-wide switch is on, so it still shows
ticked and locked but is no longer sent
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-locked-tab-save-switches-journal-on/fix.diff)):

```diff
             'value' => $isEnabledValue,
+            // While the site-wide configuration applies, the box only shows it: it is not
+            // saved, so the journal keeps its own choice for when the site-wide box is unticked.
+            'isInert' => OrcidManager::isGloballyConfigured(),
         ]));
```

`isInert` is the existing way to keep a display-only field out of a
save (`Field::$isInert`, set by `FieldHTML` and `FieldOrcid`). It sits
in the form that shows the locked box, the only place that sends it,
and the settings group's `showWhen` still reads the field's value, so
"City", the email option and the log level stay on screen.

Tried on `main` on the journal, the press and the preprint server. With
the fix in, step 3 still showed the box ticked and locked, step 4 sent
`orcidCity=Burnaby&orcidSendMailToAuthorsOnPublication=false&orcidLogLevel=ERROR`,
and after step 5 the box was unticked, with no ORCID button on the
Identity tab or the Register page. A journal that had turned its own
ORCID on before step 1 kept it on with its own Client ID through the
same steps, with the fix in and out.

**Alternatives**

- Drop `orcidEnabled` in the context API while the site-wide switch is
  on: it covers API clients too, but changes what the REST API accepts,
  and the form is the one sending the wrong value.
- Show the journal's own value in the locked box: the box would read as
  off while ORCID is on for the journal, and the group's `showWhen`
  would hide "City", the email option and the log level.
- Untick every journal when the site-wide switch is turned off: it
  would also turn off the journals that had their own ORCID on.

**What goes with it**

- No data repair: journals that saved their tab while the site-wide
  switch was on already hold `orcidEnabled = 1`, which cannot be told
  apart from a manager's own choice. A release note can ask
  administrators who turn the site-wide switch off to check each
  journal's ORCID tab.
- Backport: the diff applies as written to `stable-3_5_0`.
- Test: an e2e scenario in spec U04 that saves "City" while the
  site-wide switch is on, turns the switch off and expects the
  journal's box unticked.

Small: one line, following the inert `FieldHTML` fields beside it, with
no repair.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/orcid-locked-tab-save-switches-journal-on/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-locked-tab-save-switches-journal-on/walk.js)
  (helpers in `lib.js` beside it) takes the Steps on the three apps
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/orcid-locked-tab-save-switches-journal-on/walk.js`.
  `MODE=reach` takes steps 1–6 and then "Request verification" for
  Craig Montgomerie on submission 4 (OJS), reading the "Submission
  ORCID" email. `MODE=nb` first turns the journal's own ORCID on
  (Public Sandbox, `APP-H19AJOURNAL00000`) and takes steps 1–6: the run
  with and without the fix that shows such a journal unaffected. The
  browser's requests to orcid.org are answered locally
  (`shared/playwright/support/orcid.js`), so the script records the
  address the page opens, not what ORCID shows. It reads the context's
  and the site's `orcid*` settings rows after each step, the source of
  the "Control:" paragraph.
- The trial: `node bin/try-fix.js apply <dir>/fix.diff ojs omp ops`,
  the walk and `MODE=nb`, `revert`, `MODE=nb` again.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL,
  the default datasets of pkp/datasets eaf024c5 (2026-10-18): the same
  result on all six, with no alert, script error or failed request.
  `MODE=reach` ran on OJS `main` only. Not walked: unticking the
  journal's box and saving after step 6 (the way round), which the code
  allows since the box is no longer disabled there; and the
  contributor, invitation and Publish-window paths marked "code" in the
  Cause.
- 3.5 (walked, and code): lib/pkp `stable-3_5_0` has the same
  `OrcidSettingsForm` lines 48–63 and the same `submitValues()` in
  ui-library `Form.vue`.
- 3.4 and 3.3 (code): lib/pkp `stable-3_4_0` and `stable-3_3_0` have no
  `OrcidSettingsForm` and no `orcidEnabled` setting. ORCID is the ORCID
  Profile plugin (pkp/orcidProfile at the commits OJS and OPS bundle on
  each line), switched on in the plugin list; its
  `isGloballyConfigured()` reads an `[orcid]` section of
  `config.inc.php`, and `OrcidProfileSettingsForm` has no enable box.
- Introduced: `git blame` on lines 48–63 gives `c79f538c51` (ORCID moved
  into the core, authored 2023-10-06), unchanged since. GitHub's
  `branch_commits` page for the commit names `pkp/pkp-lib#9818` as the
  merged pull request, and the pull request's merge commit is
  `c79f538c51` itself (a rebase merge on 2024-06-21), so `main` has no
  separate merge commit.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library for site-wide ORCID, the locked box, `orcidEnabled`,
  `OrcidSettingsForm` and `isGloballyConfigured`. `pkp/pkp-lib#12059`
  (the site-wide save failing on a sub-path install) and
  `pkp/pkp-lib#13336` (the secret shown on the journal's tab) are other
  faults on the same tabs.
- Branch tips: main OJS 6b4323ced7, OMP 5777025bec, OPS f048e747b4
  (lib/pkp 042726ebf6, lib/ui-library 99abe25290); 3.5 OJS 007c2cd0d6,
  OMP 2d575f2506, OPS e737a9e465 (lib/pkp 092ec34b0f); 3.4 OJS
  0012bd1022, OMP e30fa7e38c, OPS 0f1e21a117 (lib/pkp a71d6bd2ca); 3.3
  OJS d7d9dd14ec, OMP 8e72fc8836, OPS c5532e2161 (lib/pkp 5e84acd11b).
