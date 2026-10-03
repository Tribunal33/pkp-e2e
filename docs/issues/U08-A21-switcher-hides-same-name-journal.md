# The journals switcher in the editorial header leaves out every journal with exactly the current journal's name

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#987` · [20ee5d454b](https://github.com/pkp/pkp-lib/commit/20ee5d454b35d7108556f2d7b4a71835ca542acc) · 2016-01-06 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a21)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

The journals switcher leaves out every journal with the current
journal's name. An Author enrolled in two journals of the same name sees
the sitemap icon on either, and it opens an empty list; the Site
Administrator on one of them is offered every journal but its namesake,
while from a third journal both are listed.

## Impact

- **Lost.** No data. The switcher fails for the namesake without a word:
  the icon is there and its list is empty or incomplete.
- **Who.** Every user with a role in both journals, on every editorial
  page (Dashboard, "My Submissions", Settings and the rest). "The same
  name" is an exact match, letter for letter. The other journal's name
  is read in its primary language, the current journal's in the
  language the user reads in (Cause). Two journals of one name on a site
  are rare: a test copy of a journal, or a ceased journal kept beside
  its successor.
- **Way round.** The administrator: Administration, where the switcher
  lists every journal. Any other user: the site's home page, which lists
  every enabled journal.

Low: no data is lost and the other journal stays reachable; medium if
some user had no other way to reach it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; on OMP "Press", on OPS
  "Server" for "Journal"). It holds one journal, `publicknowledge`,
  "Journal of Public Knowledge"; the steps add a second one with the
  same name.

Steps:

1. Sign in as `admin`.
2. Open Administration › "Hosted Journals", press "Create Journal" and
   fill in: "Journal title" "Journal of Public Knowledge" (OMP "Public
   Knowledge Press", OPS "Public Knowledge Preprint Server"), "Journal
   initials" "U08N", contact name "Journal of Public Knowledge", contact
   email `u08n@mailinator.com`, country "Canada", Path `u08n`;
   "Languages": English ticked; "Primary locale": English; "Enable this
   journal to appear publicly on the site" ticked.
   Press "Save".
3. On the new journal's settings wizard that opens, tab "Users": search
   `ccorino` (OMP `aclark`) with "Include users with no roles in this
   journal" ticked, choose "Edit User" on the row, tick "Author", press
   "OK".
4. Open the dataset journal's Dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial`) and press the
   sitemap icon left of "Journal of Public Knowledge" in the dark header
   bar (its screen-reader name is "Journals", "Presses", "Servers").
5. Open Administration (`/index.php/index/en/admin`) and press the same
   icon.
6. Sign out, sign in as `ccorino` (OMP `aclark`), open
   `/index.php/publicknowledge/en/submissions` ("My Submissions") and
   press the icon.
7. Open the new journal's "My Submissions" (`/index.php/u08n/submissions`)
   and press the icon.

**Expected.** At step 4 the list offers the new journal ("Journal of
Public Knowledge", linking to `/index.php/u08n/…`). At steps 6 and 7 the
list offers the other journal of the two.

**Observed.** At steps 4, 6 and 7 the icon is there and opens an empty
list: no entry at all. At step 5, with no current journal, the list
holds both:

```
Journal of Public Knowledge   -> /index.php/publicknowledge/en/submissions
Journal of Public Knowledge   -> /index.php/u08n/submissions
```

## Cause

`lib/pkp/templates/layouts/backend.tpl` builds the switcher's list from
`$availableContexts` and skips each entry whose name equals the current
context's:

```smarty
{foreach from=$availableContexts item=$availableContext}
	{if !$currentContext || $availableContext->name !== $currentContext->getLocalizedData('name')}
```

A name does not identify a context: two contexts may carry the same
one. The test is meant to keep the current context out of its own list,
but it also drops every other context with that name.

It is also redundant. `PKPTemplateManager::setupBackendPage()` already
removes the current context from `$availableContexts` by its ID before
the template sees the list:

```php
$availableContexts = array_filter($availableContexts, function ($context) use ($request) {
    return $context->id !== $request->getContext()->getId();
});
```

So the template's test removes only namesakes. With the namesake as the
only other context the list is empty, while `{if $availableContexts}`,
which reads the PHP list, still shows the icon.

Reach:

- Every editorial page shares `backend.tpl`, for every role, and OJS,
  OMP and OPS share it through pkp-lib with no override in the apps.
- The test is a strict string comparison of two names in possibly
  different languages. `PKPContextQueryBuilder::getManySummary()` gives
  each other context's name in that context's primary language. The
  template takes the current context's name in the language the user
  reads in. So for a user reading in French, the other journal is
  dropped when its primary-language name equals the current journal's
  French name. Checked in the code, not walked.
- The same mistake elsewhere: no other template or class in pkp-lib or
  the three apps compares a context's name to pick or skip a context.
  Checked in the code.

## Proposed fix

Remove the name test from `backend.tpl` and let the ID filter in
`PKPTemplateManager::setupBackendPage()` alone keep the current context
out. In that filter, cast the summary's `id` to an integer. The cast
matters because the filter becomes the only guard. If a database driver
returned `id` as a string, the strict `!==` would keep the current
context in the list. Today the name test would still hide it; without
the name test and without the cast, the current journal would appear in
its own switcher. This is a proposal:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/switcher-hides-same-name-journal/fix.diff),
three lines changed and five re-indented in pkp-lib, covering the three
apps.

```diff
--- a/lib/pkp/classes/template/PKPTemplateManager.php
-                        return $context->id !== $request->getContext()->getId();
+                        return (int) $context->id !== $request->getContext()->getId();
--- a/lib/pkp/templates/layouts/backend.tpl
 						{foreach from=$availableContexts item=$availableContext}
-							{if !$currentContext || $availableContext->name !== $currentContext->getLocalizedData('name')}
-								<li>
…
-							{/if}
+							<li>
…
 						{/foreach}
```

Tried on `main`, OJS, OMP and OPS. With the fix, steps 4, 6 and 7 each
list the other journal, linking to it, and step 5 still lists both. On
a site whose second journal has a different name, the switcher read the
same with the fix and without it: on each journal the administrator's
list holds the other journal and never the current one, and
`amwandenga` (OMP `afinkel`, OPS `ckwantes`), an author of the dataset
journal only, gets no icon.

**Alternatives**

- Compare IDs in the template instead
  (`$availableContext->id != $currentContext->getId()`): it works, but
  keeps two filters for one rule in two files.
- Compare the names case-insensitively or in one language: a name still
  does not identify a context, so namesakes stay hidden.

**What goes with it**

- Two entries with the same name are then alike in the list, as they
  already are on Administration. Showing the path beside the name would
  tell them apart; that is a separate choice for the team.
- No stored data, REST API or plugin hook is touched; the
  `Template::Layout::Backend::HeaderActions` hook sits outside the list.
- Backport: the same change applies to `stable-3_5_0`, `stable-3_4_0`
  and `stable-3_3_0`, where the changed lines read the same (on 3.3 the
  class file is `PKPTemplateManager.inc.php`).
- Guard: a Planned item in spec U08 (Rule 29): two journals of the same
  name, each offered in the other's switcher, the current one never.

Small: three lines in one pkp-lib template and one class, tried on all
three apps, with no data or API change.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/switcher-hides-same-name-journal/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/switcher-hides-same-name-journal/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/switcher-hides-same-name-journal/walk.js`.
  It records each switcher's entries and links. `SWITCHER_MODE=neighbour`
  in front runs the neighbour check alone: a journal named "u08n
  Neighbour" (path `u08nnb`), the administrator's switcher on both
  journals' Dashboards, and `amwandenga`'s (OMP `afinkel`, OPS
  `ckwantes`) on "My Submissions".
- The fix, tried 2026-10-03 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/switcher-hides-same-name-journal/fix.diff ojs omp ops`,
  then walk.js and the neighbour check, each on a freshly loaded
  install, then `revert` and the neighbour check again.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6). `backend.tpl` and
    `PKPTemplateManager.php` are the same file in the two lib/pkp
    commits.
  - stable-3_5_0: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335). The same steps and the same result; the code
    reads as on `main` (`backend.tpl` line 53, the ID filter at
    `PKPTemplateManager.php` line 1001).
- 3.4, by code: pkp-lib `stable-3_4_0` at 9e41f10273: `backend.tpl` line
  47 holds the same name test and `PKPTemplateManager.php` the same ID
  filter (line 1016); OJS c1827e3527, OMP 0aec65441, OPS acd8ae704b
  have no template of their own for the header.
- 3.3, by code: pkp-lib `stable-3_3_0` at ac3fa73402: the same, at
  `backend.tpl` line 43 and `PKPTemplateManager.inc.php` line 936;
  OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161, no override.
- Introduced: `git blame` on the name test gives 4ababcd4c2
  ([commit](https://github.com/pkp/pkp-lib/commit/4ababcd4c2b2abedbbee5752c66e0316c04bda49),
  `pkp/pkp-lib#5866` for `pkp/pkp-lib#5865`, 2020-05-13, Nate Wright),
  which created `backend.tpl` and the ID filter together and carried the
  test over from `templates/header/usernav.tpl`
  (`{if $currentContextName == $name}{continue}{/if}`). `git log -S` on
  that line leads to 20ee5d454b, which added it; no PR is linked to that
  commit.
- Unverified: the language variant in the Cause's reach (a name equal
  only across two languages) was read in the code, not walked. MySQL not
  checked: the integer cast in the fix guards the case of a driver that
  returns the summary's `id` as a string; on PostgreSQL it arrives as an
  integer (the neighbour check with the fix in).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched 2026-10-03 for "context switcher same name", "journal
  switcher name", "journals dropdown same name", "switcher missing
  journal", "journal switcher empty", "journals menu empty", "two
  journals same name", "press switcher", "server switcher",
  `availableContexts`, `getManySummary` and "backend.tpl currentContext
  name". The nearest hits, `pkp/pkp-lib#6564` (the switcher's 404 from a
  submission page) and `pkp/pkp-lib#7052` (a long list running past the
  screen), are other faults.
- The site's home page as the way round, from the code: OJS
  `templates/frontend/pages/indexSite.tpl` lists the site's journals;
  not walked. No namesake out of reach was found: Administration lists
  every journal, enabled or not, and the switcher's own list takes
  disabled journals too.
- "While from a third journal both are listed" (Summary): from the code
  (the name test drops only names equal to the current journal's) and
  the register's 2026-09-23 probe; today's walks read the list from
  Administration, which has no current journal, instead.
