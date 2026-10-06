# The REST API's sections endpoint refuses a missing or another journal's section with a raw message code

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code; no sections endpoint)
  - 3.3: none (code; no sections endpoint)
- **Introduced** `pkp/pkp-lib#9939` and `pkp/ojs#4268` for `pkp/pkp-lib#9938` · [41fa40ffc8](https://github.com/pkp/pkp-lib/commit/41fa40ffc87754040bb364ec18cd8164a9600f24), [40ef7b6c4b](https://github.com/pkp/ojs/commit/40ef7b6c4b34e41156ba5e441b84d616713d804f) · 2024-05-08 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U17 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a program reads one section through the REST API's sections
endpoint and the journal has no section with that number, the refusal
reads "##api.sections.404.sectionNotFound##" instead of a sentence.

When it asks for a section that belongs to another journal, the refusal
reads "##api.sections.400.contextsNotMatched##". Neither message has any
text in the install.

No screen of the application sends this request, so only the authors of
programs that call the endpoint meet it.

## Impact

- **Lost**: the reason for the refusal. The refusal itself and its
  status (404, 400) are right.
- **Who**: whoever writes or runs a program (a plugin, an integration
  signed in with a Journal manager's API token) that reads one section
  of a journal. Only a journal offers this endpoint; a press or a
  preprint server answers "The requested URL was not recognized." at
  that address.
- **Way round**: the status code tells the two refusals apart.

Low: a missing reason in an otherwise correct refusal, which no user of
the screens can reach.

## Steps to reproduce

None through the screens. To see it, type the endpoint's addresses into
a browser signed in as a Journal manager.

Preconditions:

- PKP's default test dataset, OJS `main`.
- A second journal, which the dataset lacks: as `admin`, Administration
  › Hosted Journals › "Create Journal": title "u17c Second Journal",
  initials "U17C", a contact name and email, a country, path `u17c`,
  "Languages" English ticked, "Primary locale" English, "Enable this
  journal to appear publicly on the site" ticked, "Save". OJS gives a
  new journal one section, "Articles".

Signed in as `admin` (Site administrator and Journal manager of both):

1. Open `/index.php/u17c/api/v1/sections`. The list holds the second
   journal's "Articles" with `"id":3`.
2. Open `/index.php/publicknowledge/api/v1/sections/999` (no section has
   this number).
3. Open `/index.php/publicknowledge/api/v1/sections/3` (the second
   journal's section, asked for at publicknowledge's address).

**Expected**: both requests are refused with a sentence, for example:

```
404 {"error":"The section you requested was not found."}
400 {"error":"The section you requested is not part of this journal."}
```

**Observed**:

```
404 {"error":"##api.sections.404.sectionNotFound##"}
400 {"error":"##api.sections.400.contextsNotMatched##"}
```

Control: `/index.php/publicknowledge/api/v1/sections/1` answers 200 with
the section "Articles".

## Cause

`SectionController::get()` (lib/pkp
`api/v1/sections/SectionController.php`, lines 101–112) refuses an
unknown id with `__('api.sections.404.sectionNotFound')` and another
context's section with `__('api.sections.400.contextsNotMatched')`.
Neither key has a `msgid` in any English locale file of pkp-lib or OJS,
so `Locale::translate()` returns the key wrapped in `##`.

Both keys came with the controller in 41fa40ffc8 ("Add section API
endpoint"), which added the controller alone. No later commit in
pkp-lib or OJS has added either key (`git log -S'api.sections.'`).

Reach:

- Both refusals of `get()` are affected. The list (`getMany()`) has no
  refusal text, but it fails at the site's own address, where line 147
  calls `getContext()->getId()` on a null context; that is reported
  separately (spec U17
  [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#a10)).
- At the site's own address, `/index.php/index/api/v1/sections/<id>`
  answers the same 400 code, since `getContext()` is null there (code).
- Only OJS has the route file `api/v1/sections/index.php`. OMP and OPS
  carry the same controller in their lib/pkp but answer "The requested
  URL was not recognized." at that address (tried on both).
- The same mistake on other endpoints, left out of this fix: a scan
  compared every `__('api.…')` key in the PHP of each app and its lib/pkp
  (`api`, `classes`, `pages`, `controllers`) with the English locale files
  of the app, lib/pkp and the app's plugins. Besides these two it found:
  - all apps: `api.403.forbidden` (`EditorialTaskController`, five
    places), `api.400.missingRequiredParameter` (`PKPJatsController`);
  - OJS: `api.406.notAcceptable` (`ReviewerRecommendationController`);
  - OMP: seven `api.contexts.*` keys (`PKPContextController`,
    `UserGroupController`, the category, DOI and email-template
    repositories), `api.announcements.400.contextsNotMatched`,
    `api.dois.403.contextsNotMatched`,
    `api.dois.400.noRegistrationAgencyConfigured`,
    `api.submissionFiles.400.badRepresentationAssocType`; OJS defines
    these in its own `locale/en/api.po`;
  - OPS: `api.dois.403.contextsNotMatched` (OPS defines
    `api.dois.400.contextsNotMatched`), `api.submission.400.inactiveSection`.

## Proposed fix

Add the two texts to pkp-lib's `locale/en/api.po`, beside the
contributor-role entries. That controller uses the same
`404.…NotFound` / `400.contextsNotMatched` pair and keeps its texts in
pkp-lib
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sections-interface-refusals-raw-codes/fix.diff)):

```diff
--- a/lib/pkp/locale/en/api.po
+++ b/lib/pkp/locale/en/api.po
@@ -478,6 +478,12 @@
 
 msgid "api.contributorRole.400.errorDeletingAuthorRole"
 msgstr "Last AUTHOR role cannot be deleted."
+
+msgid "api.sections.404.sectionNotFound"
+msgstr "The section you requested was not found."
+
+msgid "api.sections.400.contextsNotMatched"
+msgstr "The section you requested is not part of this journal."
 
 msgid "api.submission.400.emptyContributorRoles"
 msgstr "There have to be at least one assigned contributor role."
```

The controller and the status codes stay as they are. Tried on OJS: both
refusals answer the two sentences above. Section 1 still answers 200,
and a role without access is still refused by role first.

**Alternatives**:

- Look the section up in the journal, `Repo::section()->get($id,
  $contextId)`, which already takes a context id, and drop the second
  check. Both refusals would become one 404 ("not found"), the usual
  REST answer for a resource outside the caller's scope, and it would
  remove the wrong "not part of this journal" reason at the site's
  address. Not recommended alone: the 400 is part of what clients see
  today, and with no journal (`$contextId` null) the lookup is not
  scoped and would return any journal's section with a 200 unless the
  site's address is refused first, which is A10's fix. If the team
  takes A10's fix, this becomes a clean follow-up; the 404's key still
  needs its text (or the shared `api.404.resourceNotFound`).
- Answer an unknown id with the shared `api.404.resourceNotFound`
  ("The requested resource was not found."), as most controllers do:
  fine for the 404, but the 400 still needs a text of its own.
- Put the 400 text in OJS's own `locale/en/api.po`, as the announcement
  and DOI refusals do so that each app says "journal", "press" or
  "server": the right home if OMP and OPS ever get this endpoint (spec
  U17 A5), but today only OJS has it.

**What goes with it**:

- Backport to 3.5: the same two entries at the end of lib/pkp's
  `locale/en/api.po`, after `api.409.resourceActionConflict` (3.5's file
  has no contributor-role block, so the diff's context does not apply
  there).
- A guard: a check that every key passed to `__()` in PHP has an
  English text would have caught this and the other instances under
  Cause; no such check exists in pkp-lib or the apps today.

This is a proposal; the team decides.

Small: two entries in one locale file.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sections-interface-refusals-raw-codes/walk.js)
  creates the second journal through Administration › Hosted Journals and
  takes the steps and the control as `admin` on OJS; on OMP and OPS it
  opens the address once. `neighbour` as its argument runs only the
  checks the fix must leave alone (section 1 as `admin`, section 999 as
  the Author `ccorino`). Run it on an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/sections-interface-refusals-raw-codes/walk.js [neighbour]`.
  Its journal path is a random tag beginning `u17c`, not `u17c` itself.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/sections-interface-refusals-raw-codes/fix.diff ojs`,
  then the script and its `neighbour` mode, then `node bin/try-fix.js revert …`
  and `neighbour` again; the neighbour checks answered the same with the
  fix in and out.
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0` on 2026-10-02, on
  PostgreSQL. Dataset: pkp/datasets c657990 (2026-10-01). No server error
  and no script error was recorded.
- Branch tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794c and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5). `stable-3_5_0`: OJS 091fb65453,
  OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335). pkp-lib
  `stable-3_4_0` 32b0f4b4af and `stable-3_3_0` f6ab331645; OJS
  `stable-3_4_0` 75cc2d488b, `stable-3_3_0` ac77c9fb35; OMP 0aec65441 /
  8e72fc883; OPS acd8ae704b / c5532e2161.
- Code reads: `stable-3_5_0`'s lib/pkp has the same `get()` (lines 103
  and 110) and neither key in any English locale file of OJS or lib/pkp.
  On `stable-3_4_0` and `stable-3_3_0` neither pkp-lib nor any app has an
  `api/v1/sections` directory or a section controller, and 41fa40ffc8 is
  not on pkp-lib's `stable-3_4_0`.
- Trace: `git blame` on `SectionController.php` lines 103 and 110 gives
  41fa40ffc8; the GitHub API's `commits/<sha>/pulls` names
  `pkp/pkp-lib#9939` (merged 2024-05-08).
- Tracker search (2026-10-02; pkp/pkp-lib, pkp/ojs, pkp/ui-library) by
  the keys, the class and the symptom's words: only `pkp/pkp-lib#9938`
  (closed, the change itself) matched.
- MySQL not checked; nothing here depends on the database.
