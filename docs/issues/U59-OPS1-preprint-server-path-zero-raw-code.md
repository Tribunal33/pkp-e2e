# Hosted Servers: a path of zeros ("0", "00") on a preprint server is refused with a raw code

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** `pkp/pkp-lib#6678` for `pkp/pkp-lib#6633` · [118d293e75](https://github.com/pkp/pkp-lib/commit/118d293e751413ad0e072cacd3d61a3f90d2ae42) · 2021-01-28 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U59 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U59-hosted-journals.md#ops1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, a Site Administrator who types "0" or "00" as the
"Path" and presses "Save" is refused with the raw code
"##admin.contexts.form.pathRequired##" under "Path". A journal and a
press refuse the same paths with "A path is required."

This shows on "Create Server", on a server's "Edit" and on the Settings
Wizard's "Server" tab. Nothing is stored, and an ordinary path saves.
An empty "Path" is refused in words ("This field is required.").

## Impact

- **Lost**: nothing but the reason for the refusal. The form keeps what
  was typed.
- **Who**: the Site Administrator of an install running OPS, when the
  path typed for a server is "0" or zeros only. An empty path, the
  commoner slip, does not show it.
- **Way round**: type another path.

Low: a raw translation key on a refusal that stores nothing.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OPS.

Creating:

1. Sign in as `admin`.
2. Open Administration › "Hosted Servers"
   (`/index.php/index/en/admin/contexts`).
3. Press "Create Server".
4. Type "u59j Server" in "Server title", "U59J" in "Server initials",
   "u59j Contact" in "Principal Contact Name", "u59j@mailinator.com" in
   "Principal Contact Email address" and "0" in "Path". Choose "Iceland"
   for "Country", tick "English" under "Languages" and choose "English"
   for "Primary locale".
5. Press "Save".

Editing:

6. Reload "Hosted Servers", press the arrow of the `publicknowledge`
   row, then "Edit".
7. Replace "Path" with "0" and press "Save".

**Expected**: both saves are refused with "Please correct one error."
and, under "Path", a sentence. A journal and a press say "A path is
required."

**Observed**: both saves are refused and nothing is stored. Under
"Path", and in the error line beside "Save" ("Please correct one error.
Go to Path: …"), the form reads:

```
##admin.contexts.form.pathRequired##
```

Step 5 sends `POST /index.php/index/api/v1/contexts` and step 7 sends
`POST /index.php/publicknowledge/api/v1/contexts/1` with
`X-Http-Method-Override: PUT`. Both answer 400.

The path "00" at step 4 shows the same raw code. With "Path" left empty,
the browser refuses step 5 itself with "This field is required." and
sends nothing.

Control: the same steps on OJS and OMP ("Create Journal", "Create
Press") show "A path is required." in both places.

## Cause

`PKPContextService::validate()`
(`lib/pkp/classes/services/PKPContextService.php`, the "Ensure that a
urlPath is not 0" check) refuses the path "0" with
`__('admin.contexts.form.pathRequired')`. The check is shared code, but
lib/pkp's locale files do not define the key: the code assumes the app
defines it. OJS's and OMP's `locale/en/admin.po` do ("A path is
required."). OPS's `locale/en/admin.po` does not, and neither does any
of OPS's other 17 languages. `Locale::translate()` prints a key it
cannot find as `##key##`.

The missing key is OPS's, and older than the check. OPS had it until
[3d318e9b1c](https://github.com/pkp/ops/commit/3d318e9b1c2504feb042ea0e5b997c8b69ce0784)
("Remove unused locale keys", 2019-11-24) removed it, when no code used
it. In 2021
[118d293e75](https://github.com/pkp/pkp-lib/commit/118d293e751413ad0e072cacd3d61a3f90d2ae42)
added the "0" check to stop a path that breaks the router
(`pkp/pkp-lib#6633`), with the key OJS and OMP still had. That change
is the one that made the missing key reachable on OPS, which is why the
header names it.

Reach:

- "Create Server" (the paths "0" and "00") and "Edit" (the path "0") on
  Hosted Servers were walked. The Settings Wizard's "Server" tab sends
  the same request to the same check (code).
- The REST API, `POST` and `PUT /api/v1/contexts` on OPS, answers the
  raw code as the `urlPath` error (seen in the form's own requests).
- The "0" check is the only use of the key in the code. The other path
  refusals on OPS use keys OPS defines. "Create Server" with the path
  `publicknowledge` and with "a b" shows each as a sentence (walked).
- An empty "Path" never reaches the check: the form refuses it in the
  browser (walked).
- A second, shared fault, seen and not covered here: the check compares
  loosely (`$props['urlPath'] == '0'`), and PHP holds "00" equal to "0"
  as numbers, as it does "000" and "0e5". All pass the path's pattern.
  So OJS refuses the path "00" with "A path is required." though a path
  was given (walked on OJS; OMP by code), and OPS shows the raw code
  for it.

## Proposed fix

Give OPS the key back in `locale/en/admin.po`, with OJS's and OMP's
sentence, so the three apps say the same:
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-server-path-zero-raw-code/fix-ops.diff).

```diff
--- a/locale/en/admin.po
+++ b/locale/en/admin.po
@@ -50,6 +50,9 @@
 msgid "admin.contexts.create"
 msgstr "Create Server"
 
+msgid "admin.contexts.form.pathRequired"
+msgstr "A path is required."
+
 msgid "admin.contexts.form.pathAlphaNumeric"
 msgstr ""
 "The path can only include letters, numbers and the characters _ and -. It "
```

Tried on `main`, OPS. Steps 5 and 7 then show "A path is required."
under "Path" and in the error line.

The two other path refusals read the same with and without the fix. The
path `publicknowledge` gives "The path you provided is already in use by
another server." The path "a b" gives "The path can only include
letters, numbers and the characters _ and -. It must begin and end with
a letter or number."

Whether the key belongs in OPS's file or in lib/pkp's is the team's
call. The one-line fix is recommended because it touches one repo and
applies as written to every stable branch. The move is the cleaner end
state and costs a change in three repos.

**Alternatives**:

- Move the key into lib/pkp's `locale/en/admin.po`. The code that uses
  it is shared and the sentence names no journal, press or server, so
  lib/pkp is its natural owner. `lib/pkp/tools/moveLocaleKeysToLib.php`
  moves a key with all its translations (OJS holds it in 66 locale
  folders, OMP in 29), so OPS would get those languages at once. It
  needs a commit in lib/pkp, OJS and OMP together. Not tried.

**What goes with it**:

- Translations: the fix covers English. A language without the key does
  not fall back to English, so OPS's other 17 languages show the raw
  code until Weblate, or a commit copying OJS's translations into OPS's
  `.po` files, supplies it.
- The sentence: "A path is required." is kept for parity with OJS and
  OMP. A sentence that fits a path of zeros better is the team's call,
  and belongs with the loose comparison named in the Cause.
- No data repair, and nothing changes for an API client except the
  error's text.
- Backport: the same lines apply to 3.5 and 3.4 (`locale/en/admin.po`)
  and to 3.3 (`locale/en_US/admin.po`).
- Test: none proposed for one message.

Small: one message in one locale file.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-server-path-zero-raw-code/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-server-path-zero-raw-code/lib.js))
  takes steps 1–7 on OJS, OMP and OPS by default. With `neighbour` it
  takes the two other path refusals, and with `reach` the empty path
  and the path "00". Each run starts from
  an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preprint-server-path-zero-raw-code/walk.js [neighbour|reach]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The walks ran in Chromium on PostgreSQL. Datasets: pkp/datasets
  c657990 (2026-10-01). On `main` and 3.5, OJS and OMP showed "A path is
  required." at steps 5 and 7, and OPS the raw code. The empty path and
  "00" were walked on `main` only, on OJS and OPS.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  091fb65453, OMP 9c5e24246c, OPS 38b61882d3; pkp-lib cf3f984335. 3.4:
  OPS acd8ae704b; pkp-lib 32b0f4b4af. 3.3: OPS c5532e2161; pkp-lib
  f6ab331645.
- Code reads for 3.4 and 3.3. pkp-lib's
  `classes/services/PKPContextService.php` (3.4) and
  `PKPContextService.inc.php` (3.3) both hold the "0" check with the
  same key (the introducing commit is on both branches). OPS's
  `locale/en/admin.po` (3.4) and `locale/en_US/admin.po` (3.3) do not
  define it, and pkp-lib's English files on those branches do not
  either.
- Introduced: `git log -S` for the key in `PKPContextService` leads to
  118d293e75; the blame's e3f570bc37 only reformatted the file.
- Other keys of the same kind, found by a search and not checked for
  whether a screen reaches them. lib/pkp's PHP and templates on `main`
  translate these literal keys, which OJS's English files define and
  OPS's and lib/pkp's do not:
  `api.dois.403.contextsNotMatched`,
  `api.submission.400.inactiveSection`,
  `editor.submission.decision.promoteFiles.externalReview`,
  `editor.submission.decision.sendExternalReview.notifyAuthorsDescription`,
  `emailTemplate.variable.context.contextAcronym`,
  `manager.reviewerRecommendations`,
  `manager.setup.notifications.copySubmissionAckPrimaryContact.disabled.description`,
  `manager.setup.reviewGuidelines`,
  `manager.setup.reviewOptions.restrictReviewerFileAccess`,
  `manager.setup.reviewOptions.restrictReviewerFileAccess.description`,
  `manager.setup.reviewOptions.reviewerAccessKeysEnabled`,
  `manager.setup.reviewOptions.reviewerAccessKeysEnabled.description`,
  `manager.setup.reviewOptions.reviewerAccessKeysEnabled.label`,
  `notification.type.assignProductionUser`,
  `payment.type.publication.required`,
  `submission.articleNumber`,
  `submission.articleNumber.description`,
  `submission.sectionNotFound`,
  `submission.sectionRestrictedToEditors`,
  `submission.submit.whatNext.description`,
  `submission.task.validation.error.headnote.author`,
  `submission.task.validation.error.headnote.editExpired`,
  `submission.wizard.notAllowed.description`,
  `user.reviewerPrompt`.
- Not walked: the Settings Wizard's "Server" tab, OPS in a language
  other than English, and "00" on OMP and on 3.5.
