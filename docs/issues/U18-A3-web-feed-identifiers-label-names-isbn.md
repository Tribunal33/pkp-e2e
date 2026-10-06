# The web feed setting "Include identifiers (ISBN, …)" names an ISBN, and no feed ever carries one

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OPS (code; the journal's and the press's window has no such box)
- **Introduced** `pkp/ops#351` for `pkp/pkp-lib#7623` · [0d3668ca57](https://github.com/pkp/ops/commit/0d3668ca5794b82457e681f69650c600a20b78bc) · 2022-09-16 · Jonas Raoni Soares da Silva (jonasraoni); carried to OJS and OMP by [e2bb67cd4e](https://github.com/pkp/webFeed/commit/e2bb67cd4e9f4854829411c009ecfab0f84b952d) for `pkp/pkp-lib#8770` (2023-03-14)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U18 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U18-web-feeds.md#a3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager ticks "Include identifiers (ISBN, keywords, categories, etc.)
in the feed summary?" in the Web Feed Plugin's settings, expecting each
item's summary to name its ISBN, the identifier the label lists first.
The summary names the section (the series on a press), categories,
keywords, subjects and disciplines only.

The label is what is wrong: the option was never written to add an
ISBN, and no app's feeds have ever carried one. A journal and a preprint
server have no ISBN at all. A press does, saved on a book's publication
format and shown on the book's page, and its feeds leave it out too.

## Impact

- **Lost**: nothing that was saved. Nothing tells the manager that the
  ISBN is not added.
- **Who**: a manager who opens the Web Feed Plugin's "Settings" window;
  on a press, also a feed reader's user who would look for a book's ISBN
  in its summary.
- **Way round**: no setting makes a feed show the ISBN; it is on the
  book's page, which each feed item links.

Low: a wrong word in one label. If the team wants ISBNs in a press's
feeds, that is a feature request; the severity stays low.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. The
  `stable-3_5_0` dataset takes the same steps.
- On a press, the dataset's two published books have no ISBN, so steps
  P1 and P2 add one.

On a press, first:

- P1. Sign in as `dbarnes` (password `dbarnesdbarnes`). Open submission
  14, "From Bricks to Brains: The Embodied Cognitive Science of LEGO
  Robots", and press "Publication Formats" in its menu. Open the arrow
  beside "PDF", press "Edit", open the "Metadata" tab and press "Add
  Code". Choose "ISBN-13 (15)", type `9781897425789` as the value and
  press "Save". The code is added on the published book as it stands:
  no unpublishing, no new version.
- P2. Open the book's page,
  `/index.php/publicknowledge/en/catalog/book/14`: it shows "ISBN-13
  (15)" and "9781897425789".

On each app:

1. Sign in as `dbarnes`.
2. Go to Settings › Website › "Plugins", open the arrow beside "Web
   Feed Plugin" and press "Settings".
3. Tick "Include identifiers (ISBN, keywords, categories, etc.) in the
   feed summary?" and press "OK".
4. Open `/index.php/publicknowledge/en/gateway/plugin/WebFeedGatewayPlugin/atom`,
   view the page source and read each item's `<summary>`; then the same
   address ending `rss2` and `rss`, where it is the item's
   `<description>`.

**Expected:** the summaries carry what the label names. On the press,
the summary of "From Bricks to Brains…" has a line with its ISBN,
9781897425789. On a journal and a preprint server, where nothing has an
ISBN, the label does not name one.

**Observed:** no feed on any app contains "ISBN" or the number. Each
summary opens with one line per kind of term the item has, then an empty
line and the abstract. The blocks below show the summary's text decoded
(the source writes `<br />` as `&lt;br /&gt;`). On the press, in the
three feeds:

```
Series: Psychology<br />
Keywords: Array<br />
<br />
From Bricks to Brains introduces embodied cognitive science, …
```

On the journal ("The Signalling Theory Dividends") and the preprint
server ("Finocchiaro: Arguments About Arguments"):

```
Section: Articles<br />
Keywords: Array, Array<br />
<br />
```

```
Section: Preprints<br />
Keywords: Array, Array<br />
<br />
None.
```

("Array" in place of each keyword is another finding, U18 A7.)

## Cause

The label and the code disagree, and the label is the one that is wrong.
`WebFeedGatewayPlugin::getIdentifiers()` (`plugins/generic/webFeed/WebFeedGatewayPlugin.php`,
lines 153–177) builds the list the summary prints: the section, the
publication's categories, then `keywords`, `subjects` and `disciplines`.
It reads no ISBN and nothing else.

The label, `plugins.generic.webfeed.settings.includeIdentifiers` in the
plugin's `locale/en/locale.po` (line 66), lists "ISBN" first. The two
arrived together in 0d3668ca57, which brought the feeds to OPS and added
the option with this method and this label. OPS has no ISBN anywhere, so
"ISBN" was never backed by code. e2bb67cd4e then made the OPS plugin the
shared one, and the label reached OJS and OMP with it.

On a press the ISBN exists, on the publication format's identification
codes (`PublicationFormat::getIdentificationCodes()`). The book's page
(`templates/frontend/objects/monograph_full.tpl`) prints every code, and
the Dublin Core, Google Scholar and ONIX outputs read them. The feed
plugin does not, and OMP's own earlier copy of the plugin did not
either.

Reach (checked in the code):

- The label is used once, by the box in `templates/settingsForm.tpl`.
- The list `getIdentifiers()` builds feeds the summary in `atom.tpl`,
  `rss2.tpl` and `rss.tpl`, and also each item's category parts (Atom
  `<category>`, RSS 2.0 `<category>`, RSS 1.0 `<dc:subject>`), which are
  printed whether or not the box is ticked.
- 27 of the plugin's translations carry "ISBN" in the same label.

## Proposed fix

Reword the label so it names what the option adds, in the shared plugin
(pkp/webFeed):

```diff
--- a/plugins/generic/webFeed/locale/en/locale.po
+++ b/plugins/generic/webFeed/locale/en/locale.po
@@ -63,4 +63,4 @@
 msgstr "Latest publications"
 
 msgid "plugins.generic.webfeed.settings.includeIdentifiers"
-msgstr "Include identifiers (ISBN, keywords, categories, etc.) in the feed summary?"
+msgstr "Include the section or series, categories, keywords, subjects and disciplines in the feed summary?"
```

The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/web-feed-identifiers-label-names-isbn/fix.diff).
Tried on `main` on the three apps: the box reads the new label, and it
ticks and saves as before. The window's other labels, and the Atom
summaries with the box ticked and unticked again, read the same with the
fix in and out.

The label is the right place because two of the three apps have no ISBN
to add, and the option was written for one of them. This is a proposal
and the wording a suggestion; the team decides.

**Alternatives**:

- Add the ISBN on a press: in `getIdentifiers()`, for OMP, read the
  ISBN-13 and ISBN-10 codes of the publication's formats (ONIX codes
  `15` and `02`), as OMP's `GoogleScholarPlugin.php` does (line 158
  on). The list also feeds each item's category
  parts, so an ISBN added there would be printed as a category unless
  the templates skip it; and the label would still name an ISBN on a
  journal and a preprint server. This is a feature, and it needs a
  decision on which format's ISBN a book's item shows.
- Drop only the word "ISBN": the label would still call a section and
  keywords "identifiers" and end in "etc.", with nothing more behind it.

**What goes with it**:

- Translations: 27 languages name "ISBN" under the same key and keep
  doing so until each is updated through the translation platform.
- Backport: the hunk applies as it stands to the plugin's
  `stable-3_5_0` and `stable-3_4_0` branches. OPS `stable-3_3_0` keeps
  the plugin in its own tree, with the label in
  `plugins/generic/webFeed/locale/en_US/locale.po`.
- Stored settings and the feeds do not change.
- Test: an e2e check in spec U18 (a **Planned** item) that reads the
  ticked summary against the label.

Small: one English message in one plugin, with no code change.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/web-feed-identifiers-label-names-isbn/walk.js)
  takes the Steps and records the window's labels, the book's page (OMP)
  and, per feed, whether "ISBN" or the number appears and how the
  summaries open.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/web-feed-identifiers-label-names-isbn/walk.js`.
    `<fleet>` names the pkp-e2e install to drive and `<name>` the folder
    its records go to.
  - **Neighbour check:** `MODE=nb` in front records the window's other
    labels and the Atom summaries with the box ticked, then unticked.
- Walks: OJS, OMP and OPS on `main` and `stable-3_5_0`, on PostgreSQL;
  datasets from pkp/datasets e8dafbc (2026-10-02). No request failed on
  the server and no page script failed, apart from the Plugin Gallery
  list, which fails on every offline test install.
- Where the walk differed from the Steps: the script reads the feeds
  while still signed in as `dbarnes`, and reaches the workflow by its
  address before pressing "Publication Formats".
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/web-feed-identifiers-label-names-isbn/fix.diff ojs omp ops`,
  the walk and the neighbour check each on a freshly loaded dataset,
  then reverted.
- Not driven: 3.4 and 3.3; other interface languages (read in the
  locale files); the alternative that adds an ISBN on a press (not
  written). MySQL not checked (the fault does not depend on the
  database).
- Tips:
  - **`main`:** OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7; pkp/webFeed
    7436935.
  - **`stable-3_5_0`:** OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3;
    pkp/webFeed cd16aa3.
  - **`stable-3_4_0`:** OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b;
    pkp/webFeed d786885.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161.
- Code reads:
  - `main`, 3.5 and 3.4: `getIdentifiers()` in the plugin's
    `WebFeedGatewayPlugin.php` (the same five kinds of term on each
    branch), the label in `locale/en/locale.po`, its one use in
    `templates/settingsForm.tpl`, and the three feed templates; `grep`
    for "ISBN" over the plugin (locale files only).
  - 3.3: OPS has the plugin in its tree with the same box, label
    (`locale/en_US/locale.po`) and `_getIdentifiers()`, from the
    same change on `stable-3_3_0`
    ([ec26b41e47](https://github.com/pkp/ops/commit/ec26b41e47df19dd2db8c2168e628c60d198739e),
    `pkp/ops#350`). OJS's and OMP's 3.3 plugin has no
    `includeIdentifiers` in its form, gateway or locale, and no ISBN
    in its gateway or templates; `git log -S "ISBN"` over OMP's in-tree
    plugin up to `stable-3_4_0`, locale files apart, finds nothing.
  - OMP `main`: the callers of `getIdentificationCodes()`, for where a
    press reads an ISBN (`GoogleScholarPlugin.php` picks codes `02` and
    `15`).
- The trace: `git log -S "plugins.generic.webfeed.settings.includeIdentifiers"`
  over the three apps' `plugins/generic/webFeed` finds the label first
  in OPS 0d3668ca57 (and ec26b41e47 on `stable-3_3_0`), never in OJS's
  or OMP's tree; `git log -S "ISBN"` over pkp/webFeed's English locale
  ends at its first commit, e2bb67cd4e. `pkp/pkp-lib#7623` asks for
  feeds on a preprint server and does not mention ISBNs.
- Upstream searches (2026-10-02; pkp/pkp-lib, pkp/webFeed, pkp/ojs,
  pkp/omp, pkp/ops): "web feed ISBN", "feed ISBN identifiers", "Include
  identifiers", `includeIdentifiers`, `getIdentifiers`; no match.
  pkp/ui-library not searched (no part in this).
