# Readers get no other citation format or citation download on an article published outside a published issue

- **Severity** medium
- **Effort** small
- **Kind** intention gap
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: none (code; every published article is in a published issue)
  - 3.4: none (code; the same)
  - 3.3: none (code; the same)
- **Introduced** continuous publication: `pkp/pkp-lib#11385` for `pkp/pkp-lib#9295` · [ada320fd81](https://github.com/pkp/ojs/commit/ada320fd81d1f78c9bad0f80c58b502a29498a55) · 2025-05-12 · Touhidur Rahman (touhidurabir); the server error for signed-out visitors: `pkp/citationStyleLanguage#159` for `pkp/pkp-lib#12152` · [fa35220](https://github.com/pkp/citationStyleLanguage/commit/fa3522012bb295386d2b5e6367b20fcad69d335d) · 2026-01-17 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On an article published outside a published issue, the app fails on
the server when a visitor who is not signed in uses "How to Cite":
choosing a format under "More Citation Formats" leaves the citation
unchanged with no message, and the "BibTeX" and
"Endnote/Zotero/Mendeley (RIS)" downloads open a blank page.

This happens on an article published with no issue (the journal's
continuous publication), or published at once into an issue that is
not yet published ("Assign To Future Issue and Publish Immediately").
A signed-in Reader, the article's Author or a Section Editor not
assigned to the article gets the same unchanged citation, and the
downloads show "404 Not Found". A Journal Manager, and a Section Editor
or Copyeditor assigned to the article, get the other formats and the
files. On an article in a published issue all of it works, for
everyone.

It needs the "Citation Style Language" plugin turned on. No released
version can publish an article outside a published issue, so only
journals on the coming release meet it.

## Impact

- **Lost.** Readers cannot see the citation in their own style or
  import it into a reference manager. Nobody is told: the format list
  does nothing and the download opens a blank or "404 Not Found" page.
- **Who.** Every reader of a journal that publishes articles ahead of
  their issue, or without issues, with the plugin on.
- **Way round.** The primary citation still shows and can be copied.
  There is no way on screen to get another format or a file.

Medium: a secondary feature of every such article's public page fails
for all readers, silently, but the primary citation stays readable.
It would be high if publishing outside an issue became the common way
journals publish.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: journal `publicknowledge`,
  whose issue "Vol. 1 No. 2 (2014)" is published and "Vol. 2 No. 1
  (2015)" is not.
- The "Citation Style Language" plugin is off in the dataset. Sign in
  as `rvaca` (Journal manager), open Settings › Website › "Plugins" and
  tick "Citation Style Language".
- Two articles published outside a published issue. Sign in as
  `dbarnes`, open submission 5, "Genetic transformation of forest
  trees" (in Production), go to Publication › "Title & Abstract" and
  press "Publish". In "Review Publishing Details" pick Publication Stage
  "Version of Record", Revision Significance "Major Revision" and "Don't Assign To An Issue",
  then "Confirm" and "Publish".
- Do the same for submission 6, "Investigating the Shared Background
  Required for Argument: A Critique of Fogelin's Thesis on Deep
  Disagreement", with "Assign To Future Issue and Publish Immediately"
  and Issue "Vol. 2 No. 1 (2015)".

Steps, on article 5 and then on article 6:

Signed out:

1. Open the article's page, `/index.php/publicknowledge/article/view/5`
   (`…/view/6` for article 6).
2. Under "How to Cite", press "More Citation Formats", then "MLA".
3. Press "More Citation Formats" again, then "BibTeX" under "Download
   Citation".

Signed in, once for each of these users: open the article's page and
take steps 2 and 3.

4. `ccorino` (a Reader, not on the article).
5. The article's Author (`ddiouf` for 5, `dphillips` for 6).
6. `minoue` (a Section editor not assigned to the article).
7. `rvaca` (Journal manager), `dbuskins` (a Section editor assigned to
   the article) and `mfritz` (a Copyeditor assigned to it).

**Expected.** For everyone who can open the page, "MLA" replaces the
APA citation, and "BibTeX" downloads a ".bib" file, as on submission 17
in the published issue "Vol. 1 No. 2 (2014)".

**Observed.** Below, {address} stands for the article's address on
the install (`http://<host>/index.php/publicknowledge/article/view/5`).
Signed out, the citation stays "Diouf, D. (2026). Genetic
transformation of forest trees. Journal of Public Knowledge. {address}"
with no message, and "BibTeX" opens an
empty page. Both requests answer 500, and the server log reads:

```
PHP Fatal error:  Uncaught TypeError: APP\plugins\generic\citationStyleLanguage\pages\CitationStyleLanguageHandler::canUserAccess(): Argument #2 ($userRoles) must be of type array, null given, called in …/plugins/generic/citationStyleLanguage/pages/CitationStyleLanguageHandler.php on line 163
```

As `ccorino`, the Author and `minoue`, the citation stays the same (the
format's request answers 404) and "BibTeX" opens a page reading "404
Not Found". As `rvaca`, `dbuskins` and `mfritz`, "MLA" shows "Diouf,
Diaga. “Genetic Transformation of Forest Trees”. Journal of Public
Knowledge, Oct. 2026, {address}." and "BibTeX" downloads
"Genetic+transformation+of+forest+trees.bib". Article 6 behaves the
same.

Control: on submission 17 every one of these users, and a signed-out
visitor, gets the MLA citation and the ".bib" file.

## Cause

`CitationStyleLanguageHandler::setupRequest()` (plugin
`citationStyleLanguage`, `pages/CitationStyleLanguageHandler.php`)
refuses a citation for an unpublished item unless the user is a
manager or an assigned sub-editor or assistant. On a journal it decides
"unpublished" in `isUnpublished()`:

```php
return !$issue || !$issue->getPublished() || $publication->getData('status') != PKPPublication::STATUS_PUBLISHED;
```

`$issue` is the issue the article page passed in the link's `issueId`:
none for an article without an issue, and the unpublished issue for
one published into a future issue. Both count as unpublished, though
the publication is published and its page is public. The article page
itself (`ArticleHandler::initialize()`) asks only whether the
publication's status is published, and lets others preview it through
`Repo::submission()->canPreview()`.

The rule dates from 2017 (`pkp/pkp-lib#723`), when a published article
was always in a published issue. `pkp/pkp-lib#9295` (continuous
publication) let an article be published with no issue or ahead of its
issue, and its follow-up "Do not assume an issue will be present in
published content" (OJS commit e1efda5dd4, no pull request of its
own) did not reach this plugin.

The server error is a second fault on the same path. A signed-out
visitor has no user roles, so `getAuthorizedContextObject(ASSOC_TYPE_USER_ROLES)`
returns null. Since `pkp/citationStyleLanguage#159`, `canUserAccess()`
declares `array $userRoles`, so PHP throws a TypeError instead of the
plugin answering 404. Before that change, the same request answered
404.

Reach:

- Both the format request (`get`) and the downloads (`download`) go
  through `setupRequest()`, which refuses before the format is read.
  "MLA" and "BibTeX" were walked; the other formats and the RIS
  download are inferred from the shared requests.
- Only the journal branch of `isUnpublished()` reads the issue. On a
  press and a preprint server it tests the submission's status, so a
  published book's or preprint's formats are not affected (code; not
  walked for this report).
- An article "Assign[ed] To Future Issue and Schedule Only" is not
  published and has no public page, so it is not affected.
- A neighbouring rule, not this one: on an unpublished article's
  preview, its Author can open the page but gets 404 for the formats,
  because `canUserAccess()` admits fewer roles than `canPreview()`
  (walked on submission 9 as `fpaglieri`). A press's preview gives the
  book's Author the same refusal ([U69 A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a21)).
  Who may use a preview's formats is a product question for the team;
  this fix leaves it as it is.

## Proposed fix

In the plugin, let a journal's article count as published when its
publication is published, as the article page does. Make the role list
safe for a visitor who is not signed in. A proposal, tried; the team
decides. [`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/citation-formats-outside-published-issue/fix.diff)
(against the OJS root):

`isUnpublished()`:

```diff
-    protected function isUnpublished(PKPPublication $publication, Submission $submission, ?Issue $issue = null): bool
+    protected function isUnpublished(PKPPublication $publication, Submission $submission): bool
     {
         $applicationName = Application::get()->getName();
 
+        // An article may be published outside a published issue (continuous
+        // publication): its page follows the publication's own status, and so
+        // does its citation.
         if ($applicationName === 'ojs2') {
-            return !$issue || !$issue->getPublished() || $publication->getData('status') != PKPPublication::STATUS_PUBLISHED;
+            return $publication->getData('status') != PKPPublication::STATUS_PUBLISHED;
         }
```

`setupRequest()`:

```diff
-        if ($this->isUnpublished($this->publication, $this->submission, $this->issue)) {
-            $userRoles = $this->getAuthorizedContextObject(PKPApplication::ASSOC_TYPE_USER_ROLES);
+        if ($this->isUnpublished($this->publication, $this->submission)) {
+            $userRoles = $this->getAuthorizedContextObject(PKPApplication::ASSOC_TYPE_USER_ROLES) ?? [];
             if (!$this->canUserAccess($user, $userRoles)) {
```

Tried on OJS `main`: with the fix, the Steps showed the MLA citation
and the ".bib" file for every user on articles 5 and 6, with no server
error. On the unpublished submission 9, signed out still got "404 Not
Found" for the page, `fpaglieri` (its Author) still got 404 for the
formats, and `rvaca` still got them, the same as without the fix.

The rule lives in the plugin's handler, the only place that decides who
gets a citation. It follows the article page's own test (publication
status), and `pkp/citationStyleLanguage#143` took the same approach when
it made the preprint server's test read the item's status alone. The
search for the same assumption elsewhere found no other access check
on an issue being published. The plugin's date fallback in
`getCitation()` reads `$issue?->getPublished()` only to choose a date.

**Alternatives**

- Pass the issue only when it is published, in `getTemplateData()`.
  This hides the issue from the citation data and still refuses an
  article with no issue.
- Gate on `Repo::submission()->canPreview()` for unpublished items, as
  the article page does. This would also widen the formats on a preview
  to the Author and every sub-editor and assistant, which is the open
  product question above, so it is left out here.

**What goes with it**

- No stored data changes. The `?? []` also changes the answer to a
  signed-out request for a truly unpublished item from a server error
  to 404, on all three apps, since the plugin is shared.
- No backport: 3.5 and older cannot publish outside a published issue.
  The `?? []` fixes a fault only `main` has.
- Guard: an e2e scenario in this repository's spec, U13 Rule 15c (a
  reader on an article published with no issue gets another format and
  a download), and a handler test in the plugin for an article with no
  issue and for a signed-out request.

Small: about four lines in two methods of one file, following the
article page's own rule, tried. It is one pull request in
pkp/citationStyleLanguage, which OJS takes with its usual plugin
submodule bump; the bump carries no code of its own, so the fix stays
within REPORT's "small" (one place, an existing pattern, no data
repair).

## Evidence

- Kept script that runs the Steps on OJS (the only app with issues), on
  an install freshly loaded from PKP's default test dataset (pkp/datasets
  38ab955, the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade
  needed):
  [`shared/playwright/checks/issues/citation-formats-outside-published-issue/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/citation-formats-outside-published-issue/walk.js),
  run with `PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir1 node bin/probe.js ojs shared/playwright/checks/issues/citation-formats-outside-published-issue/walk.js`.
  It records each format request's and download's status, the citation
  before and after, and the downloaded file's name. With `neighbour` as
  its argument it walks the preview of submission 9 instead.
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/citation-formats-outside-published-issue/fix.diff ojs`,
  then `walk.js` and `walk.js neighbour` on a freshly loaded install;
  `walk.js neighbour` also ran without the fix, with the same result.
  Reverted with `node bin/try-fix.js revert`.
- 3.5: the script on the `stable-3_5_0` install walked the control
  (submission 17) only, and every user got the formats and the file.
  The Steps cannot be taken there. On 3.5,
  `Repository::validatePublish()` refuses a publish without an issue
  ("publication.required.issue"), `publish()` sets a publication in an
  unpublished issue to Scheduled, and unpublishing an issue
  (`IssueGridHandler::unpublishIssue()`) puts its articles back to
  Scheduled. The plugin's handler on 3.5 has the same issue condition
  (`isSubmissionUnpublished()`) and the untyped `canUserAccess()`.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` `classes/publication/Repository.php`
  and `upstream/stable-3_3_0` `classes/services/PublicationService.inc.php`
  require an issue to publish and schedule into an unpublished one. The
  plugin pinned there (3.4 8f54149, 3.3 648ae36) has the same issue
  condition, which no published article meets.
- Kind: intention gap. `pkp/pkp-lib#9295` asked that an article be
  publishable outside a published issue, and its changes did not bring
  this plugin's access test along; no released version can hold such an
  article, so nothing that worked before broke. The signed-out server
  error alone is a regression on `main` (fa35220).
- Introduced (dates are commit dates throughout): `git blame` on the `isUnpublished()` line leads, through a
  rename (`pkp/pkp-lib#12245`, 7b085d8f) and reformatting, to
  `pkp/pkp-lib#723` (bec8698, 8a691fe, 2017, Nate Wright), when the rule
  was right. The change that made it wrong is the first publish without
  an issue: OJS commit ada320fd81 (2025-05-12) and pkp-lib commit
  5003931b66 (2025-06-27, PR `pkp/pkp-lib#11385`), both "publishing
  without issue assignment in editorial workflow". The TypeError comes
  from fa35220 (2026-01-17, `pkp/citationStyleLanguage#159`), which
  typed `canUserAccess(?User $user, array $userRoles)`; before it,
  `$user` was checked before the role list was read.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/citationStyleLanguage and
  pkp/ui-library searched by user words ("citation continuous
  publication", "how to cite 404") and by the class and method
  (`CitationStyleLanguageHandler`, `canUserAccess`); `pkp/pkp-lib#9295`'s
  comments do not name the plugin. `pkp/citationStyleLanguage#143`
  (closed, fixed) is the preprint server's version of a wrong published
  test, not this one.
- Tips: OJS `main` bade233f73 (lib/pkp 2e377d27fc, plugin 9dd6eba);
  OJS `stable-3_5_0` 92b9a16b48 (lib/pkp a9c76aed62, plugin 41ddd1b);
  `upstream/stable-3_4_0` 9571d8fde7 (lib/pkp df13621c2d);
  `upstream/stable-3_3_0` 9fdb9bcf9a (lib/pkp d446601ebe). PostgreSQL;
  the fault does not depend on the database.
- Not driven: "Endnote/Zotero/Mendeley (RIS)" and the on-screen
  formats other than "MLA"; they use the same `download` and `get`
  requests as "BibTeX" and "MLA", and the handler refuses before it
  reads the format. OMP and OPS were read in the code only.
