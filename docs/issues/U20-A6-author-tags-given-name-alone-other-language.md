# An author submitting in a language their account has no name in is published under the given name alone

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the wizard asks the author for their name in the submission's language)
  - 3.3: none (code; the family name is copied with the given name)
- **Introduced** `pkp/pkp-lib#10880` for `pkp/pkp-lib#7135` · [d7c67a46fe](https://github.com/pkp/pkp-lib/commit/d7c67a46fee724dfc003eb4b650021b5edb8e915) · 2025-01-31 · PR by Bozana Bokan (bozana), commit by GaziYucel (GaziYucel)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U20 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#a6)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An author whose account holds their name in English only submits an
item in French. The item they submit, and later the published item,
names them by their given name alone wherever the item's French name
is used: the search engine tags ("citation_author",
"DC.Creator.PersonalName") read "Carlo" instead of "Carlo Corino", and
so does the item's page when a reader views it in French.

In English the wizard, the workflow and the item's page all show the
full name, so the editor who publishes it has no reason to look.

An account registered on an English page holds its name in English
only, so this is the ordinary case for an author who writes in a
journal's second language.

## Impact

- **Lost**: the author's family name in the item's search engine tags
  and on its page in that language, seen in a browser; read in the
  code, also in the Crossref (the given name written as the surname),
  DataCite, DOAJ and PubMed exports, the JATS XML, a press's ONIX and
  "How to Cite" in that language. Nobody is told.
- **Who**: every item submitted in a language its submitting author's
  account has no name in, on any install with two or more submission
  languages. Only the contributor the wizard creates from the
  submitting author's account is hit; co-authors added in the
  "Contributors" form hold the names the person typed.
- **Way round**: the author before submitting, or an editor later,
  opens the contributor ("Contributors" › "Edit"), switches the name
  fields to French and types the family name. A published version's
  contributors can be edited in place by an editor, without a new
  version (the author can no longer edit them). A DOI already
  deposited is not marked for a new deposit by that edit, so the
  editor deposits it again by hand.

Medium: the author's family name is missing from a published item's
search engine tags and from its page in that language, for every item
submitted by an author whose account has no name in that language,
and an editor can complete it on screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, journal (press, server)
  `publicknowledge`, whose submission languages are English and French
  (Canada). Nothing else: the dataset's author accounts hold their
  names in English only.

Steps (OJS; OMP and OPS in brackets):

1. Sign in as `ccorino` [OMP `aclark`]. "New Submission".
2. On "Make a Submission": "Submission Language" "French (Canada)";
   Title "u20e La mer et ses marées"; section "Articles" [OMP and OPS
   ask none]; tick the requirements and privacy boxes; "Begin
   Submission".
3. "Upload Files": add a file. "Details": Abstract (French) "u20e Un
   résumé de la mer." [OPS "For Readers": "This preprint has not been
   published elsewhere".] "Continue" to "Review". "Contributors" lists
   "Carlo Corino" [OMP "Arthur Clark"].
4. Switch the interface to "Français (Canada)": "Contributeurs-trices"
   on "Évaluation" lists "Carlo" [OMP "Arthur"]. Back in English,
   "Submit" and confirm.
5. Sign out; sign in as `dbarnes`. Open the submission. [OJS, OMP:]
   "Accept and Skip Review", "Continue" to "Record Decision"; then
   "Send To Production", "Continue" to "Record Decision".
6. "Publication" › "Schedule For Publication" [OMP "Publish", OPS
   "Post"]; on a journal "Assign To Current/Back Issue" "Vol. 1 No. 2
   (2014)", "Confirm"; then "Publish" ["Post"]. [3.5, OJS: first
   "Issue" › "Assign to Issue", "Vol. 1 No. 2 (2014)", "Save"; the
   publish window then asks for no issue.]
7. Sign out. Open the item's page (OJS `article/view/21`, OMP
   `catalog/book/19`, OPS `preprint/view/20` on a fresh dataset) and
   view the page source.
8. Switch the interface to "Français (Canada)".

**Expected**: the tags and the French page name the author in full, as
the English page does:

```html
<meta name="citation_author" content="Carlo Corino"/>
<meta name="DC.Creator.PersonalName" content="Carlo Corino"/>
```

**Observed**: the English page reads "Carlo Corino" [OMP "Arthur
Clark"], but the tags read the given name alone, on OJS and OMP both
tags, on OPS "citation_author" (OPS has no Dublin Core tags):

```html
<meta name="citation_author" content="Carlo"/>
<meta name="DC.Creator.PersonalName" content="Carlo"/>
```

The French page lists the author under "Auteurs-es" as "Carlo" [OMP
"Arthur"].

Control: an author who first gives the account a French name of their
own (Profile › "Identity", French "Carl" "Corin") and then submits in
French is listed in French as "Carl Corin".

## Cause

When an author starts a submission, `PKPSubmissionController::add()`
makes them its first contributor with
`Repo::author()->newAuthorFromUser()`
(`lib/pkp/classes/author/Repository.php`). That method copies the
account's names in the submission's allowed languages, and then makes
sure a given name exists in the submission's own language, because
submitting is refused without one
(`validateSubmit()` in `lib/pkp/classes/submission/Repository.php`,
"The given name is missing in …"):

```php
if (!array_key_exists($submissionLocale, $user->getGivenName(null))) {
    $author->setGivenName($user->getGivenName($user->getDefaultLocale()), $submissionLocale);
}
```

It copies the given name and not the family name. The contributor ends
up with given name `{en: Carlo, fr_CA: Carlo}` and family name
`{en: Corino}`: a whole name in English and half a name in French.

Every place that builds a name for one language then gets the given
name alone.
`Identity::getFullName($preferred, $familyFirst, $locale)` falls back
to another language only when the given name is missing, and takes the
family name from the same language as the given name, on purpose, so
names in two languages are never mixed. With a French given name
present, it returns "Carlo". The tags call it with the publication's
language; the page calls it with the interface language.

The rest of the code keeps names whole. `changePublicationLocale()` in
the same class, which runs when an editor changes a submission's
language, copies the given name, family name and preferred public name
together when the new language has none of them. 3.3 copied the family name
with the given name when creating this contributor, saying "then there
should also be no family name for the submission locale"
(`PKPSubmissionSubmitStep1Form`). The copy of the given name alone came
with the multiple-affiliations work, `pkp/pkp-lib#7135`, which
replaced 3.4's copy of every name.

Reach, all from the same stored half name, beyond what the Steps show:

- Crossref export (OJS `ArticleCrossrefXmlFilter`, OPS
  `PreprintCrossrefXmlFilter`): with no family name in the
  publication's language it writes the given name as `<surname>`
  (code).
- DOAJ, DataCite (`getFullName(…, $publicationLocale)`), PubMed
  (`LastName` from the given name), JATS (`name-style="given-only"`),
  OMP's ONIX (`PersonName`, `KeyNames`) (code).
- "How to Cite" (`CitationStyleLanguagePlugin`) in that interface
  language: the family name taken from the given name (code; the
  plugin is off in the dataset).
- Items already submitted on 3.5 and later hold the half name in
  `author_settings`.
- Only `PKPSubmissionController::add()` calls `newAuthorFromUser()` in
  the apps and pkp-lib, so the contributor created from the submitting
  author's account is the only one hit; contributors added in the
  "Contributors" form hold what the person typed (code).

## Proposed fix

Copy the family name of the same language along with the given name,
when the account has no family name in the submission's language, in
`Repository::newAuthorFromUser()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-tags-given-name-alone-other-language/fix.diff)):

```diff
         if (!array_key_exists($submissionLocale, $user->getGivenName(null))) {
-            $author->setGivenName($user->getGivenName($user->getDefaultLocale()), $submissionLocale);
+            $defaultLocale = $user->getDefaultLocale();
+            $author->setGivenName($user->getGivenName($defaultLocale), $submissionLocale);
+            $familyName = $user->getFamilyName($defaultLocale);
+            if (!empty($familyName) && empty($user->getFamilyName($submissionLocale))) {
+                $author->setFamilyName($familyName, $submissionLocale);
+            }
         }
```

This puts the rule where the name is made, the one place that writes
the half name, so every reader above is covered at once. It copies the
family name alone beside the given name: `newAuthorFromUser()` never
copies the account's preferred public name, so there is none to carry
over, unlike `changePublicationLocale()`; it is 3.3's own copy of the
two names. It keeps the intent of `pkp/pkp-lib#7135`'s change: the
author is still not asked for a French given name, and names in
languages the context does not accept are still left out. An account
that already holds a French name keeps it untouched.

Tried on `main` in all three apps: the Steps then show "Carlo Corino"
[OMP "Arthur Clark"] in both tags and on the French page, and the
control (an account with its own French name) still lists "Carl
Corin", with the fix in and out.

**Alternatives**:

- Make `Identity::getFullName()` take the family name from the
  fallback language when the chosen one has none: it mixes languages,
  which the method avoids on purpose, and would turn a deliberately
  given-name-only person in one language into a two-language mix.
- Patch each reader (the tag plugins, the exports): many places, and
  each one would need to know which half is missing.
- Ask the author for the French name, as 3.4 did: before submitting,
  the author had to open their own contributor entry and type their
  name in French.

**What goes with it**:

- A repair, in an upgrade migration, for contributors already stored
  with the half name. It would copy the family name of the site's
  primary language into the publication's language for a contributor
  whose:
  - given name in the publication's language equals their given name
    in the primary language,
  - family name in the publication's language is empty,
  - family name in the primary language is set.

  Not tried. A person whose French name really is a given name alone
  would gain a family name, so the team may prefer to leave stored
  names as they are.
- A unit test of `newAuthorFromUser()` with an account named only in
  the site's language and a submission in another, asserting both
  names in the submission's language.
- Backport: the same lines are on `stable-3_5_0`.
- Items already deposited with Crossref need a new deposit after the
  repair.

Medium: a few lines and a unit test, plus an upgrade migration for
the names stored since 3.5.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-tags-given-name-alone-other-language/walk.js),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/author-tags-given-name-alone-other-language/walk.js`
  (`MODE=nb` in front runs the control alone). The fix was applied with
  `node bin/try-fix.js apply shared/playwright/checks/issues/author-tags-given-name-alone-other-language/fix.diff ojs omp ops`.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
    (lib/pkp cf3f984335), OPS 38b61882d3 (lib/pkp cf3f984335).
- 3.4, by code: pkp-lib `stable-3_4_0` at 767353f4fe;
  `classes/author/Repository.php` `newAuthorFromUser()` copies every
  name as the account holds it, with no copy into the submission's
  language, and `classes/submission/Repository.php` `validateSubmit()`
  refuses to submit with "The given name is missing in {language} for
  one or more of the contributors.", so the author types both French
  names in the contributor form.
- 3.3, by code: pkp-lib `stable-3_3_0` at ac3fa73402;
  `classes/submission/form/PKPSubmissionSubmitStep1Form.inc.php`
  copies the given and the family name of the site's primary language
  into the submission's language.
- Introduced: `git blame` on the copy (`Repository.php` lines 260-265
  on main, 249-254 on `stable-3_5_0`) gives d7c67a46fe, the squashed
  `pkp/pkp-lib#7135` commit merged by `pkp/pkp-lib#10880` (from
  `pkp/pkp-lib#10460`); its parent's `newAuthorFromUser()` is 3.4's,
  copying every name unchanged.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched by the symptom's words and by `newAuthorFromUser` and
  `DC.Creator.PersonalName`. Nearest, a different fault:
  `pkp/pkp-lib#9184` (author names not following the interface
  language on the reader pages, closed in 2023).
- Not driven: the Crossref, DataCite, DOAJ, PubMed, JATS and ONIX
  outputs and "How to Cite", read in the code as in Cause. The Crossref
  XML was tried on OJS `main` after the Steps (Crossref Manager Plugin
  on, DOI prefix and Crossref depositor set, "Assign DOIs", then
  "Export DOIs" on the DOIs page): the test install cannot reach
  crossref.org, so the export stops before writing any XML with "An XML
  validation error occurred and the XML could not be exported." (400),
  the server logging `failed to load external entity
  "https://www.crossref.org/schemas/crossref5.4.0.xsd"`.
- Editing a published version's contributor and the DOI's deposit
  state after it: read in the code (`canEditPublication()` in
  `lib/pkp/classes/submission/Repository.php` lets an editor edit a
  published version's contributors and refuses the author;
  `Repo::author()->edit()` and
  `Repo::publication()->edit()` mark no DOI stale, only publishing and
  unpublishing do).
