# A refused category or series path says "only letters and numbers", but "-", "_", "." and "/" are accepted

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** OMP [fdc1618f05](https://github.com/pkp/omp/commit/fdc1618f05329957f3d9af4f73e98a93e96b6f0b) (2016-10-13) let the category path accept more characters and kept the old message; OMP [a746a8c2d1](https://github.com/pkp/omp/commit/a746a8c2d1f08256006a9286e9ab4e95fde89417) for `pkp/pkp-lib#1334` (2017-02-15) gave the series path the same check and a message in the same words · Alec Smecher (asmecher). OJS and OPS have the category check through pkp-lib: [e10eb21dfc](https://github.com/pkp/pkp-lib/commit/e10eb21dfc034e42233ef5b050106a7954c0519d) for `pkp/pkp-lib#4158` (2018) moved it there, and [198595800a](https://github.com/pkp/pkp-lib/commit/198595800a0bd40db5db4d41d1a7b34556894719) for `pkp/pkp-lib#10404` (2025, `main` only) moved it into the category repository unchanged
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U17 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#omp2) · spec U16 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A manager types a path with a space into a category's "Path" (or a
series' "Path" on a press) and presses "Save". The save is refused with
"The category path must consist of only letters and numbers." ("The
series path must consist of only letters and numbers."). Yet a path
holding "-", "_", "." or "/" saves, so the message tells the manager a
narrower rule than the one the box applies.

A manager who trusts the message avoids "-", the character most
readable addresses use to join words. And the "letters" it allows do
not include accented ones: "é" is refused.

## Impact

- **Lost**: nothing; the refusal itself is right.
- **Who**: a journal, press or preprint server manager adding or
  editing a category, and a press manager adding or editing a series,
  who types a character the path refuses (a space, an accented letter).
- **Way round**: removing the refused character saves.

Low: only the message is wrong. It would be higher if the message left
a manager unable to find a path that saves.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Nothing else. The `stable-3_5_0` dataset takes the same steps
  with the "3.5" brackets; there the series window's button reads
  "Save" as on `main`.

Categories (OJS, OMP, OPS):

1. Sign in as `rvaca` (password `rvacarvaca`), the Journal manager
   [OMP: Press manager; OPS: Preprint Server manager].
2. Go to Settings › Journal [OMP: Settings › Press; OPS: Settings ›
   Server] and open the "Categories" tab.
3. Press "Add Category".
4. Type "u17e category" into "Name" and "u17e category" into "Path",
   and press "Save" [3.5: "OK"].
5. Change "Path" to "u17e-category_v1.2" and press "Save" [3.5: "OK"].

Series (OMP):

6. Go to Settings › Press, open the "Series" tab and press "Add
   Series".
7. Type "u17e series" into "Title" and "u17e series" into "Path", and
   press "Save".
8. Change "Path" to "u17e-series_v1.2" and press "Save".

**Expected:** the refusals at steps 4 and 7 name what a path may hold:
the letters a–z and A–Z, the digits 0–9 and ".", "/", "-" and "_".
Steps 5 and 8 save.

**Observed:** step 4 is refused, the window stays open, and "Path"
reads under it:

```
The category path must consist of only letters and numbers.
```

[3.5: the same sentence under "Path" and as a notice at the top right.]
Step 5, a path the message rules out, saves: "Category saved", and the
tab lists "u17e category". Step 7 is refused with a notice at the top
right, the window open:

```
The series path must consist of only letters and numbers.
```

Step 8 saves: "Your changes have been saved.", and the "Series" list
shows "u17e series".

## Cause

The path checks and their messages disagree. Both checks use the same
pattern, `/^[a-zA-Z0-9\/._-]+$/`, which accepts ASCII letters, digits,
".", "/", "_" and "-":

- Categories: `PKP\category\Repository::validate()` in pkp-lib
  `classes/category/Repository.php`, `CATEGORY_PATH_REGEX` (line 44),
  refusing with `grid.category.pathAlphaNumeric` (line 213). On 3.5,
  3.4 and 3.3 the same pattern and key sit in
  `CategoryForm::__construct()` (`controllers/grid/settings/category/form/`).
- Series: `SeriesForm::__construct()` in OMP
  `controllers/grid/settings/series/form/SeriesForm.php` line 62,
  refusing with `grid.series.pathAlphaNumeric`.

The messages, in pkp-lib `locale/en/manager.po` and OMP
`locale/en/manager.po`, read "The category path must consist of only
letters and numbers." and "The series path must consist of only letters
and numbers."

The category message was written in 2011 for `FormValidatorAlphaNum`,
which accepted letters and digits with single "-" or "_" between them.
fdc1618f05 ("Replace FormValidatorAlphaNum with FormValidatorRegExp",
2016) changed the check to the present pattern, which accepts more
characters, and did not change the message. a746a8c2d1 ("Prevent series
without paths", 2017) gave the series path the same pattern, with a
message worded like the category's.

The pattern's acceptance of "/" is a separate fault, which this report
leaves alone: a category whose path holds "/" has no reachable page
(spec U16
[A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a8)),
and a series page reads only the part of the path before a "/"
(`CatalogHandler::series()` takes `$args[0]`, read in the code).

Reach:

- Adding and editing, on every category and series path, in every
  interface language: the translations make the same claim (German "nur
  aus Buchstaben und Ziffern"). Adding was taken through the screens;
  editing was read in the code.
- The category check runs in all three apps (pkp-lib); the series check
  is OMP's alone.
- The other path checks of the three apps name the characters they
  accept (checked in the code): navigation menu items and the Static
  Pages plugin use the very same pattern with "The path field must
  contain only alphanumeric characters plus '.', '/', '-', and '_'."
  (`manager.navigationMenus.form.pathRegEx`,
  `plugins.generic.staticPages.pathRegEx`), which does not say that
  accented letters are refused; a context's path, a component's key and
  the issue, galley and publication format URL paths have patterns of
  their own with matching messages.

## Proposed fix

Reword the two English messages to name exactly what the pattern
accepts, in the form the COUNTER platform ID's description already uses
("may contain letters (a–z, A–Z), digits (0–9), underscores (_), dots
(.) and forward slashes (/)", `admin.settings.statistics.sushiPlatform.sushiPlatformID.description`):

```diff
--- a/lib/pkp/locale/en/manager.po
+++ b/lib/pkp/locale/en/manager.po
 msgid "grid.category.pathAlphaNumeric"
-msgstr "The category path must consist of only letters and numbers."
+msgstr ""
+"The category path may contain only letters (a–z, A–Z), digits (0–9), dots "
+"(.), forward slashes (/), hyphens (-) and underscores (_)."
--- a/locale/en/manager.po
+++ b/locale/en/manager.po
 msgid "grid.series.pathAlphaNumeric"
-msgstr "The series path must consist of only letters and numbers."
+msgstr ""
+"The series path may contain only letters (a–z, A–Z), digits (0–9), dots (.), "
+"forward slashes (/), hyphens (-) and underscores (_)."
```

Naming the letter ranges tells a manager who typed "é" why it was
refused, which "alphanumeric characters" would not.

The diffs, one per app root (the pkp-lib hunk is the same in each):
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/path-message-only-letters-and-numbers/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/path-message-only-letters-and-numbers/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/path-message-only-letters-and-numbers/fix-ops.diff).
Tried on `main` in all three apps: steps 4 and 7 showed the new
sentences, with the window open and nothing saved, and steps 5 and 8
saved as before. A path already in use was still refused with "The
category path already exists. Please enter a unique path." ("The series
path …" on the series), with the fix in and out.

This is a proposal; the team decides the wording.

**Alternatives**:

- Narrow the patterns to what the messages say: paths with "-", "_" and
  "." that presses and journals already hold (the default dataset's
  own) would be refused on their next edit, so it needs a data
  migration and a product decision.
- The navigation menu and Static Pages wording ("…only alphanumeric
  characters plus '.', '/', '-', and '_'."): consistent with those two
  messages, but it reads as allowing accented letters. If the team
  prefers one wording for all four, the better one is worth carrying
  to those two as well.
- New message keys with the new text: there is no English fallback
  for a key a language lacks (`Locale::translate()` returns
  `##key##`), so every other language would show a raw code instead
  of a sentence until translated, which is worse than a sentence that
  understates the rule. Rewording under the same keys avoids that.

**What goes with it**:

- "/": the messages name it because the patterns accept it. If the
  separate "/" fault (Cause) is fixed by dropping "/" from the
  patterns, the messages drop it too.
- Translations: each language's `manager.po` keeps its own text under
  the same key, so every other language goes on stating the old rule until a translator rewrites
  it. Whether Weblate flags those strings for review when the English
  changes is not verified.
- Backport: the hunks apply to `stable-3_5_0` and `stable-3_4_0`
  (line numbers aside); on `stable-3_3_0` the files are under
  `locale/en_US/`.
- Test: an e2e check in specs U16 and U17 (a **Planned** item) that a
  refused path's message names the characters a saved path holds.

Medium: two one-line message changes, but in two repositories (pkp-lib
and OMP), with no code change and no data repair.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/path-message-only-letters-and-numbers/walk.js)
  takes the Steps and records, for each "Save", the answer, whether the
  window stays open, the messages under "Path" and in the window, the
  notices at the top right, and the lists afterwards.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/path-message-only-letters-and-numbers/walk.js`.
    `<fleet>` names the pkp-e2e install to drive and `<name>` the folder
    its records go to.
  - **Neighbour check:** `WALK=neighbour` in front adds a category (and
    on OMP a series) with the path "u17e-ok", then a second one with the
    same path (Proposed fix).
- Walks: OJS, OMP and OPS on `main` and `stable-3_5_0`, on PostgreSQL;
  datasets from pkp/datasets c657990 (2026-10-01). No request failed on
  the server and no page script failed. The default dataset's own
  category paths hold hyphens ("applied-science", "social-sciences").
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/path-message-only-letters-and-numbers/fix-<app>.diff <app>`
  for each app, the walk and the neighbour check each on a freshly
  loaded dataset, then reverted.
- Not driven: 3.4 and 3.3; the "/" in a series path and an accented
  letter in either path (both read from the pattern); MySQL
  not checked (the fault does not depend on the database).
- Tips:
  - **`main`:** OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794
    (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - **`stable-3_5_0`:** OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3
    (lib/pkp cf3f984335 in each).
  - **`stable-3_4_0`:** OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b,
    pkp-lib 32b0f4b4af.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161,
    pkp-lib f6ab331645.
- Code reads:
  - `main`: the checks and messages the Cause names.
  - 3.5, 3.4, 3.3: pkp-lib `CategoryForm::__construct()`
    (`CategoryForm.inc.php` on 3.3) and OMP `SeriesForm::__construct()`
    (`SeriesForm.inc.php` on 3.3), each with the same pattern and key,
    and both messages unchanged in the English `manager.po`
    (`locale/en_US/` on 3.3). OJS and OPS 3.4 and 3.3 have the
    "Categories" tab on Settings › Journal (Server)
    (`templates/management/context.tpl`).
  - Every other path check: the `FormValidatorRegExp` and `preg_match`
    path checks of the three apps, their plugins and pkp-lib on `main`,
    each read beside its message (Reach).
- The trace (`git blame`, then `git log -S` on the keys and the
  pattern in OMP, where categories lived until pkp-lib took them in
  `pkp/pkp-lib#4158`, 2018):
  - OMP 79f97ff4b (2011-10-18, Alec Smecher, "FBV clean-up, path
    field") wrote `grid.category.pathAlphaNumeric` for
    `FormValidatorAlphaNum` (`/^[A-Z0-9]+([\-_][A-Z0-9]+)*$/i`).
  - [fdc1618f05](https://github.com/pkp/omp/commit/fdc1618f05329957f3d9af4f73e98a93e96b6f0b)
    (2016-10-13, Alec Smecher) put `FormValidatorRegExp` with
    `/^[a-zA-Z0-9\/._-]+$/` in `CategoryForm` and kept the message.
  - [a746a8c2d1](https://github.com/pkp/omp/commit/a746a8c2d1f08256006a9286e9ab4e95fde89417)
    (2017-02-15, Alec Smecher, `pkp/pkp-lib#1334`) added the series
    path check with the same pattern and `grid.series.pathAlphaNumeric`.
  - pkp-lib [e10eb21dfc](https://github.com/pkp/pkp-lib/commit/e10eb21dfc034e42233ef5b050106a7954c0519d)
    (2018-12-11, Alec Smecher, `pkp/pkp-lib#4158`) took `CategoryForm`
    with its check and message into pkp-lib, which brought them to OJS
    and OPS; [198595800a](https://github.com/pkp/pkp-lib/commit/198595800a0bd40db5db4d41d1a7b34556894719)
    (2025-05-12, Taslan A. Graham, `pkp/pkp-lib#10404`, PR
    `pkp/pkp-lib#11243`) moved the check into `Repository::validate()`
    unchanged on `main`. Neither OMP commit has a pull request.
- Upstream searches (2026-10-02) in pkp/pkp-lib, pkp/omp, pkp/ojs,
  pkp/ops and pkp/ui-library: "only letters and numbers", "path must
  consist", "category path", "series path", `pathAlphaNumeric`,
  `CATEGORY_PATH_REGEX`. None is about this message; `pkp/pkp-lib#12571`
  (category path uniqueness across presses) and `pkp/pkp-lib#5932`
  (category URL structure) are other faults.
