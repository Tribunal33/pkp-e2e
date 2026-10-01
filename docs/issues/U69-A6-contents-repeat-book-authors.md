# A book's table of contents repeats the book's authors under every chapter

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP (while the "Author" role's "Show role title in contributor list" box is ticked, as on a new press)
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced**
  - the comparison: a `pkp/omp` commit for Bugzilla 9038 · [fa2b6ee18f](https://github.com/pkp/omp/commit/fa2b6ee18f18ced6ce14070d28a563e8d8dedd9a) · 2014-12-02 · Alec Smecher (asmecher)
  - on main, role names in every credit line: `pkp/pkp-lib#11765` for `pkp/pkp-lib#857` · [52d3a0f8e7](https://github.com/pkp/pkp-lib/commit/52d3a0f8e70659ff8a1507068866a6abdeb8ec90) · 2025-11-11 · jyhein (jyhein)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U69 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A book's page names the book's authors at the top, and its table of
contents is meant to show a chapter's author line only when the
chapter's authors differ from the book's. The chapter's author line is
shown also where the chapter's authors are the book's: a book by one
author lists that author again under each of its chapters, and a book by
several authors lists them all again under a chapter credited to all of
them.

The names shown are correct; the repeated lines only add noise to the
table of contents.

On `main` no setting avoids it. On 3.5 and earlier the lines are left
out once the "Author" role's "Show role title in contributor list" box
(Settings › Users & Roles › Roles) is unticked; it is ticked on a new
press.

## Impact

- **Lost**: the reader gets one redundant author line per chapter.
- **Who**: every reader of a book whose chapters are credited to the
  book's own authors, on every press that records chapter authors.
- **Way round**: none on `main`. On 3.5 and earlier, unticking the box
  also takes "(Author)" out of the author lines of the catalog's book
  listings, the editors' submission lists and the suggested copyright
  holder, so it is a way round only for a press that wants that too.

Low: a redundant line on a public page. It would be medium only if the
repeated names were wrong.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Nothing else is needed:
  "Bomb Canada and Other Unkind Remarks in the American Media"
  (submission 5) is published, Chantal Allan is its only contributor,
  and she is the only author of each of its six chapters.

Steps, signed out:

1. Open the press's catalog, `/index.php/publicknowledge/en/catalog`.
2. Press "Bomb Canada and Other Unkind Remarks in the American Media".
3. Read the list of chapters below the book's author.

[3.5: the same steps show the same lines. Then, as `rvaca`: "Settings" ›
"Users & Roles" › "Roles", open the "Author" row, "Edit", untick "Show
role title in contributor list", "OK", and open the book's page again:
the lines are gone. `main` has no such tick box.]

**Expected**: each chapter shows its title only, since the chapter's
author is the book's, named at the top of the page:

```
Prologue
Chapter 1: The First Five Years: 1867-1872
…
```

**Observed**: every one of the six chapters carries the author's name:

```
Prologue
Chantal Allan
Chapter 1: The First Five Years: 1867-1872
Chantal Allan
Chapter 2: Free Trade or "Freedom": 1911
Chantal Allan
Chapter 3: Castro, Nukes & the Cold War: 1953-1968
Chantal Allan
Chapter 4: Enter the Intellect: 1968-1984
Chantal Allan
Epilogue
Chantal Allan
```

Control: "From Bricks to Brains: The Embodied Cognitive Science of LEGO
Robots" (submission 14) has three authors and each of its four chapters
is by one of them, so its lines ("Michael Dawson", "Brian Dupuis",
"Michael Wilson", "Michael Dawson") are right to show.

## Cause

`templates/frontend/objects/monograph_full.tpl` (line 188 on `main`)
decides whether to print a chapter's author line by comparing two
display strings:

```smarty
{assign var=chapterAuthors value=$chapter->getAuthorNamesAsString()}
{if $authorString != $chapterAuthors}
```

The two strings are built by different rules, so they do not match for
the same people. `Chapter::getAuthorNamesAsString()` joins the bare
names with ", ". `$authorString` is `Publication::getAuthorString()`,
assigned in `CatalogBookHandler::book()`, a credit line that also names
roles:

- on `main` it is "{name} ({contributor roles})" per author, joined by
  `common.semicolonListSeparator` ("; "). The book gives "Chantal Allan
  (Author)" against the chapter's "Chantal Allan", and a book by two
  authors "A (Author); B (Author)" against a chapter's "A, B": never
  equal for any book;
- on 3.5, 3.4 and 3.3 it is the names joined by
  `common.commaListSeparator` (", ") within a role and
  `common.semicolonListSeparator` ("; ") between roles, with
  " ({role name})" appended when the role's `showTitle` is on.
  `user_groups.show_title` defaults to 1, so a new press gives "Chantal
  Allan (Author)" too. With the box unticked the strings match when all
  the book's authors hold that one role, and the line is left out.

The comparison has been made against the credit line since it was added
(`pkp/omp` fa2b6ee18f, 2014, `$publishedMonograph->getAuthorString()`).
That string already appended role titles, and `show_title` already
defaulted to 1 (both from pkp-lib 3e14afcf9c, 2013). So the comparison
never worked on a press left as installed, which is why this is a defect
and not a regression: only a press that had unticked the box saw the
lines left out.

Two changes on `main` took that press's case away. `pkp/pkp-lib#11765`
(52d3a0f8e7) rewrote `getAuthorString()` to put each author's
contributor roles in the string whatever `showTitle` says, so such a
press gets the lines back on upgrade. `pkp/pkp-lib#11971` (34e836f529,
Bozana Bokan, 2025-12-10) then removed the `showTitle` property and its
box from the role form.

Reach:

- the book page and an older version's book page, which share the
  template and the handler (code);
- the chapter page does not print the table of contents' author lines
  (`chapter.tpl` lists the chapter's own authors), so it is not touched
  (code);
- `$authorString` is read nowhere else in OMP's templates (code); a
  custom theme that copied `monograph_full.tpl` carries the same
  comparison.

## Proposed fix

Compare like with like: give the template the book's authors written the
way `Chapter::getAuthorNamesAsString()` writes a chapter's (the names
joined by ", "), and compare the chapter's string with that.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/contents-repeat-book-authors/fix.diff):

```diff
--- a/pages/catalog/CatalogBookHandler.php
+++ b/pages/catalog/CatalogBookHandler.php
@@ -213,6 +213,11 @@
             'authorString' => $this->publication->getAuthorString(),
+            // The book's authors as Chapter::getAuthorNamesAsString() writes a chapter's,
+            // so that the table of contents can tell a chapter by the book's authors
+            'authorNamesString' => collect($this->publication->getData('authors'))
+                ->map(fn ($author) => $author->getFullName())
+                ->implode(', '),
--- a/templates/frontend/objects/monograph_full.tpl
+++ b/templates/frontend/objects/monograph_full.tpl
@@ -185,7 +185,7 @@
-								{if $authorString != $chapterAuthors}
+								{if $authorNamesString != $chapterAuthors}
```

Tried on OMP `main`: with it the six chapters of "Bomb Canada and Other
Unkind Remarks in the American Media" show no author line, and the four
chapters of "From Bricks to Brains" keep theirs, as without it.

The rule belongs to this template and its handler, and nothing else
reads the comparison. `authorString` stays assigned, since a custom
theme may print it. This is a proposal; the team decides.

**Alternatives**

- Compare the two sets of author IDs instead of two strings. It would
  also leave the line out when a chapter lists the book's authors in
  another order, where the fix above keeps it. It needs a loop or a new
  `Chapter` method, since the chapters are walked in the template; worth
  it only if the team wants order ignored.
- Strip the roles from `Publication::getAuthorString()`: no, the role
  names there are what `pkp/pkp-lib#857` set out to show.

**What goes with it**

- No data repair. The page changes only where a chapter's authors are
  the book's.
- Backport: the same two edits apply on 3.5 and 3.4, where the handler's
  neighbouring line reads `getAuthorString($userGroups)`. On 3.3 the
  file is `CatalogBookHandler.inc.php` and the arrow function becomes a
  closure, since 3.3's `lib/pkp/composer.json` pins PHP 7.3.0. The diff
  as written is for `main`.
- Guard: an e2e scenario on the book page (a single-author book with
  chapters shows no author line; a chapter by one of several authors
  shows its own), a Planned item in spec U69.

Small: one assigned value and one changed condition, in one app, with a
test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/contents-repeat-book-authors/walk.js)
  (with `lib.js` beside it), run on an install freshly loaded from the
  default dataset (pkp/datasets 92050d9, 2026-10-01), PostgreSQL:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/contents-repeat-book-authors/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. It takes the three
  steps, then reads submission 14's page as the control; on 3.5 it then
  unticks the "Author" role's box as `rvaca` and reads both books again.
  Nothing here depends on the database.
- `main` walked: OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262),
  pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
  The six lines showed; the control book's four lines showed.
- 3.5 walked: OMP [b24879c3db](https://github.com/pkp/omp/commit/b24879c3dbfde02b2744fe357060d83cc2169af3),
  pkp-lib [1fb843f491](https://github.com/pkp/pkp-lib/commit/1fb843f4919f8847e1be9504a7188d3112424013).
  The six lines showed with the box ticked (the dataset's state) and
  were gone with it unticked; the control book's lines showed both
  times. Code read: `PKPPublication::getAuthorString($userGroups)`,
  `Chapter::getAuthorNamesAsString()`, `monograph_full.tpl` line 177,
  `CatalogBookHandler::book()`.
- 3.4 (code): OMP [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
  pkp-lib [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747);
  3.3 (code): OMP [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2),
  pkp-lib [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
  Both hold the same comparison in `monograph_full.tpl`, the same two
  string builders as 3.5, and `show_title` defaulting to 1 in
  `RolesAndUserGroupsMigration`.
- Fix trial on OMP `main`:
  `node bin/try-fix.js apply shared/playwright/checks/issues/contents-repeat-book-authors/fix.diff omp`,
  the walk with `FIX=1` in front, then `revert`. The control book is the
  neighbour check, read with the fix in and out.
- Trace: `git log -S'getAuthorString() != $chapterAuthors'` in OMP leads
  to fa2b6ee18f (2014-12-02), which added the comparison to
  `templates/catalog/book/bookInfo.tpl`; role titles were in
  `Submission::getAuthorString()` since pkp-lib
  [3e14afcf9c](https://github.com/pkp/pkp-lib/commit/3e14afcf9ca021292a09e7bfd171b9a0f25c9822)
  (2013-12-13). OMP [9cc962b167](https://github.com/pkp/omp/commit/9cc962b1674c2a9602a39d9891f064f1e1368e16)
  (2019, `pkp/pkp-lib#4870`) only moved the value into `$authorString`.
  `git blame` on `PKPPublication::getAuthorString()` on `main` names
  52d3a0f8e7, merged as `pkp/pkp-lib#11765` from the branch `f857`; the
  box left `userGroupForm.tpl` in pkp-lib
  [34e836f529](https://github.com/pkp/pkp-lib/commit/34e836f52981e95a76026b29dc851b463ab8e547)
  (`pkp/pkp-lib#11971`), which is the later of the two.
- 3e14afcf9c adds `show_title` to `xml/schema/rolesAndUserGroups.xml`
  with `<DEFAULT VALUE="1"/>`, a year before the comparison.
- Where else the role's title goes on 3.5 (code): the callers of
  `getAuthorString($userGroups)` in `monograph_summary.tpl`,
  `publication/maps/Schema.php` (`authorsString`) and
  `PKPPublicationLicenseForm`.
- Upstream search (2026-10-01), pkp/pkp-lib and pkp/omp, issues and
  PRs, open and closed: "chapter authors table of contents book page",
  "chapter author repeated monograph", "chapter authors same as book
  authors", `getAuthorNamesAsString`, `authorString chapter`,
  `getAuthorString chapter`. `pkp/pkp-lib#5739` and `pkp/pkp-lib#857`
  are about showing contributor roles, not this comparison.
- Not driven: a book with several authors whose chapter is credited to
  all of them (the dataset has none); what the Cause says of it, on
  `main` and with the fix, is a code read. An edited volume was not
  driven.
- Unverified: nothing beyond the two setups not driven.
