# The assign box on a galley's, issue's, chapter's, format's or file's "Identifiers" tab does not name the URN

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** OJS: [dba6c9d597](https://github.com/pkp/ojs/commit/dba6c9d5978b12ecd65fae02ab34e0229d3d8272) for `pkp/pkp-lib#1457` · 2015-12-06 · Bozana Bokan (bozana), committed without a PR; OMP: `pkp/omp#306` for `pkp/pkp-lib#1527` · [825986f471](https://github.com/pkp/omp/commit/825986f471eeb933c5dd3a3dfec0f773efcdecd9) · 2016-07-12 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U44 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On the "Identifiers" tab of a galley or an issue (journal), or of a
chapter, a publication format or a file (press), the box that assigns
the URN reads "Assign the URN to this galley" (issue, chapter…) and does
not say which URN. The same box in "Publish Issue", and on a press in
"Format Approval", names it: "Assign the URN urn:nbn:de:0000-jpkjpk.v2i1
to this issue".

Nothing is lost: the URN is shown just above the box. In Turkish,
Azerbaijani and Georgian the label also keeps a word ending or a colon
that belongs to the missing URN.

The URN plugin is off by default. The box shows once a manager switches
the plugin on for these items, with the "URN Suffix" setting on "Use
default patterns." or on a typed pattern. With "Enter an individual URN
suffix for each published item…" the box leaves the URN out too, which
is right there (Cause).

## Impact

- **Lost.** No data, and no URN is assigned wrong. In the three
  languages the label reads, for a galley, "URN 'yı bu dizgi tablası'ye
  atayın" (Turkish), "URN -ni bu dizayn qutusu'yə təyin edin"
  (Azerbaijani) and "URN-ის მინიჭება : გალერეას" (Georgian). Each still
  says "assign the URN to this galley", with a stray ending or colon
  where the URN belongs: it looks broken but does not mislead.
- **Who.** Editors and managers who open these tabs on a journal or
  press that uses the URN plugin. The box starts ticked. So pressing
  "Save" on the tab for any reason, even only to change the Publisher
  ID, also assigns the URN. Two things on the tab say so: this label,
  and the line above it, "What you see is a preview of the URN. Select
  the checkbox and save the form to assign the URN."
- **Way round.** None needed: the preview line names the URN.

Low: the label is incomplete, and nothing depends on it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS and OMP).
- On OJS, submission 1 "Signalling Theory Dividends" has an unpublished
  version 2 in Vol. 1 No. 2 (2014) with a galley "PDF Version 2"; issue
  Vol. 2 No. 1 (2015) is unpublished. On OMP, submission 4 "How
  Canadians Communicate: Contexts of Canadian Popular Culture" is in
  Production with the chapter "Introduction: Contexts of Popular
  Culture"; its only format is remote, which "Format Approval" gives no
  URN, so step 3 adds one.

The tab and the window:

1. Sign in as `rvaca`. Settings › Website › "Plugins", tick "URN", then
   the row's arrow › "Settings":
   - tick "Issues" and "Galleys" (press: "Monographs", "Chapters" and
     "Publication Formats");
   - "URN Prefix": `urn:nbn:de:0000-`;
   - "URN Suffix": "Use default patterns.";
   - "Namespace": `urn:nbn:de`; "Resolver URL":
     `https://nbn-resolving.de/`;
   - "Save". Sign out.
2. Sign in as `dbarnes`. Open submission 1; in the workflow's side menu
   under "Publication", version 2's "Galleys"; the "PDF Version 2" row's
   "More Actions" › "Edit"; tab "Identifiers". [3.5: the side menu lists
   no versions, and the row's arrow › "Edit" opens the galley.] (Press:
   open submission 4; in the side menu under "Publication", "Chapters";
   press the chapter title "Introduction: Contexts of Popular Culture",
   which opens the "Edit Chapter" window; tab "Identifiers".) Close the
   window.
3. Issues › "Future Issues", "Vol. 2 No. 1 (2015)" › "Edit", tab
   "Identifiers". Close the window. (Press: "Publication Formats", "Add
   publication format", Name `u44r25 PDF`, "OK"; then its arrow ›
   "Edit", tab "Identifiers"; close.)
4. Issues › "Future Issues", "Vol. 2 No. 1 (2015)" › "Publish Issue";
   press "Cancel". (Press: the `u44r25 PDF` row's "Awaiting Approval" ›
   "Format Approval"; "Cancel".)

The individual-suffix state, which the fix leaves as it is:

5. As `rvaca`, the URN "Settings" again: "Enter an individual URN
   suffix for each published item…", "Save".
6. As `dbarnes`, the step 2 tab: type `u44r25` in "URN Suffix", "Save";
   open the tab again.

**Expected.** At step 2, under the preview `urn:nbn:de:0000-jpkjpk.v1i2.1.g2`
and "What you see is a preview of the URN. Select the checkbox and save
the form to assign the URN.", a ticked box "Assign the URN
urn:nbn:de:0000-jpkjpk.v1i2.1.g2 to this galley" (press: "Assign the
URN urn:nbn:de:0000-jpk.4.c13 to this chapter"). At step 3 "Assign the
URN urn:nbn:de:0000-jpkjpk.v2i1 to this issue" (press: "Assign the URN
urn:nbn:de:0000-jpk.4.4 to this publication format").

**Observed.** At step 2 the preview and the sentence are there, and the
ticked box reads "Assign the URN to this galley" (press: "Assign the
URN to this chapter"). At step 3 it reads "Assign the URN to this
issue" (press: "Assign the URN to this publication format"), under the
preview `urn:nbn:de:0000-jpkjpk.v2i1` (press: `urn:nbn:de:0000-jpk.4.4`).
The page holds the label with two spaces where the URN belongs, which
the browser shows as one:

```
Assign the URN  to this galley
```

Step 4's window reads "Assign the URN urn:nbn:de:0000-jpkjpk.v2i1 to
this issue" (press: "Assign the URN urn:nbn:de:0000-jpk.4.4 to this
publication format"), as expected. At step 6 the reopened tab shows "What you see is
a preview of the URN…" and a ticked "Assign the URN to this galley"
(press: "… to this chapter") beside the "URN Suffix" box holding
`u44r25`.

## Cause

`plugins/pubIds/urn/templates/urnSuffixEdit.tpl`, the URN area of every
"Identifiers" tab, builds the box from `urnAssignCheckBox.tpl`, whose
label is the message `plugins.pubIds.urn.editor.assignURN`, "Assign the
URN {$pubId} to this {$pubObjectType}"
([urnAssignCheckBox.tpl L13](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/pubIds/urn/templates/urnAssignCheckBox.tpl#L13)).
Both places the tab includes it pass `pubId=""`
([OJS L31, L49](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/pubIds/urn/templates/urnSuffixEdit.tpl#L31-L49);
[OMP L30, L48](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/plugins/pubIds/urn/templates/urnSuffixEdit.tpl#L30-L48)),
so the message is filled with nothing.

`urnAssign.tpl`, the same box in "Publish Issue" and "Format Approval",
builds the URN once with `getPubId()` and passes it to the box
([L20, L31](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/pubIds/urn/templates/urnAssign.tpl#L20-L31)).
It prints the URN as text only when it cannot offer
the box (L26, "The URN … cannot be assigned because it contains an
unresolved pattern.").

The two includes on the tab are in different states:

- **The preview** (line 49; OMP 48). The suffix comes from the default
  or a typed pattern, and the line just above prints `getPubId()`. On
  "Save" with the box ticked, `PKPPubIdPluginHelper::execute()` calls
  `getPubId()` again and stores that. The two agree, with one exception.
  A typed pattern may hold `%x`, which `PubIdPlugin::generateCustomPattern()`
  fills with the item's stored Publisher ID
  ([L315-L318](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/plugins/PubIdPlugin.php#L315-L318);
  OMP L185-L187). With Publisher IDs on, the "Publisher ID" box is on
  the same tab, and `PKPPublicIdentifiersForm::execute()` stores a
  changed Publisher ID
  ([L226-L227](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/controllers/tab/pubIds/form/PKPPublicIdentifiersForm.php#L226-L227))
  before it builds the URN
  ([L231](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/controllers/tab/pubIds/form/PKPPublicIdentifiersForm.php#L231)).
  So an editor who changes the Publisher ID and saves with the box
  ticked gets a URN other than the preview shows. This is the state
  where the empty label is the fault.
- **The individual suffix** (line 31; OMP 30). The box appears once a
  suffix is saved, beside the "URN Suffix" box, which stays editable.
  `PKPPubIdPluginHelper::execute()` copies the typed suffix before it
  builds the URN. A URN written into the label when the tab opened would
  therefore be the old one if the editor changed the suffix before
  saving. The tab shows no other full URN here, so the label would be
  the only thing naming it, wrongly. Leaving the URN out is right in
  this state.

The reach:

- The tabs: galleys, issues (OJS), chapters, publication formats and
  files (OMP) all render `urnSuffixEdit.tpl` (`getPubIdMetadataFile()`)
  through `publicIdentifiersForm.tpl`. Walked for galleys, issues,
  chapters and formats; files read in the code.
- The translations: Turkish (OJS) "URN {$pubId}'yı bu
  {$pubObjectType}'ye atayın", Azerbaijani "URN {$pubId}-ni bu …" and
  Georgian "URN-ის მინიჭება {$pubId}: …" attach an ending or a colon to
  the URN, which stays behind when it is empty (read in the locale
  files, not walked). The other languages read like the English.
- Older versions: the same two includes on 3.5, 3.4 and 3.3 in both apps
  (code; 3.5 walked). On 3.3, OJS's DOI plugin has the same shape in
  `doiSuffixEdit.tpl` (`pubId=""` into "Assign the DOI {$pubId} to this
  {$pubObjectType}"); DOIs left the plugin in 3.4.
- No other `pubId=""` include exists in OJS, OMP or OPS on `main`.

## Proposed fix

In the preview branch of `urnSuffixEdit.tpl`, build the URN once and
hand it to the box, escaped like the preview line it repeats
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/fix.diff);
the same change in OJS and OMP, whose plugins are copies; the hunk's
line numbers are OJS's, and in OMP the same lines start one earlier, so
`patch` applies it with an offset):

```diff
--- a/plugins/pubIds/urn/templates/urnSuffixEdit.tpl
+++ b/plugins/pubIds/urn/templates/urnSuffixEdit.tpl
@@ -42,11 +42,12 @@
 				</p>
 			{/if}
 		{else} {* pub id preview *}
-			<p>{$pubIdPlugin->getPubId($pubObject)|escape}</p>
+			{assign var=pubId value=$pubIdPlugin->getPubId($pubObject)}
+			<p>{$pubId|escape}</p>
 			{if $canBeAssigned}
 				<p class="pkp_help">{translate key="plugins.pubIds.urn.editor.canBeAssigned"}</p>
 				{assign var=templatePath value=$pubIdPlugin->getTemplateResource('urnAssignCheckBox.tpl')}
-				{include file=$templatePath pubId="" pubObjectType=$pubObjectType}
+				{include file=$templatePath pubId=$pubId|escape pubObjectType=$pubObjectType}
 			{else}
 				<p class="pkp_help">{translate key="plugins.pubIds.urn.editor.patternNotResolved"}</p>
 			{/if}
```

It follows `urnAssign.tpl`, which also assigns `getPubId()` once and
passes it to the box; the value is escaped as the preview line is.

The label then always repeats the preview line, `%x` case included. In
that case both name the URN as it stands before the Publisher ID change
is saved. The recommendation is to accept this: the label becomes
exactly as accurate as the preview line beside it, and it says nothing
the tab does not already show.

Tried on `main`, OJS and OMP: the galley, issue, chapter and format tabs
read "Assign the URN urn:nbn:de:0000-jpkjpk.v1i2.1.g2 to this galley"
(issue, chapter, publication format) with their previews; the "Publish
Issue" and "Format Approval" windows and the individual-suffix tab read
as before. "Save" with the box ticked stored the named URN, and the
reopened tab showed it with "The URN is assigned to this galley." and
"Clear", with the fix in and out. The `%x` case was not walked.

**Alternatives**

- Leave the URN out when the pattern holds `%x` and Publisher IDs are on
  for the item: the label would then be right in every case, but the
  template would have to read the pattern and the Publisher ID setting,
  and the preview line above it would still name the URN before the
  change.
- Pass the URN in the individual-suffix state too: the label would name
  the saved suffix's URN while the "URN Suffix" box beside it can still
  change it before "Save", so it could name a URN other than the one
  stored.
- Give the individual-suffix state a message without the URN slot (a
  new key, "Assign the URN to this {$pubObjectType}", in OJS and OMP):
  it would clear the Turkish, Azerbaijani and Georgian debris in that
  state as well, at the cost of a new string for every translation. A
  follow-up if those languages matter.
- Drop `{$pubId}` from the message: breaks the two windows that fill it.

**What goes with it**

- No data repair: nothing is stored wrong.
- Backport: the diff applies to 3.5, 3.4 and 3.3 in both apps, with the
  same one-line offset in OMP (checked with `patch --dry-run`).
- A guard: an e2e scenario on the galley tab reading the box's label
  with the preview's URN; the apps have no template-rendering unit
  tests.

Small: two lines in each app's copy of one template, and one e2e
scenario.

## Evidence

- Kept scripts, in
  [urn-assign-box-leaves-urn-out/](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/walk.js)
    takes steps 1–6 on a fresh load of the default dataset and records
    each label as shown and as the page holds it:
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/walk.js`
    (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/neighbour.js)
    saves the galley (chapter) tab with the box ticked and compares the
    stored URN with the preview and the label; walked with the fix in
    and out, each on a fresh load.
  - The fix was tried with `node bin/try-fix.js apply
    shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/fix.diff ojs omp`,
    then `walk.js` and `neighbour.js`, then `node bin/try-fix.js revert
    ojs omp`.
- Walked through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): `main` and `stable-3_5_0`, OJS and
  OMP, every step, the same on both lines. The fault is in a template,
  so the database plays no part.
- Introduced: `git blame` on both include lines in OJS gives
  a893a48a40 (2018), which only switched them to `getTemplateResource()`
  and kept `pubId=""`; `git log -S'pubId=""'` on the file then stops at
  dba6c9d597 ("pkp/pkp-lib#1457 pub ids"), which created
  `urnAssignCheckBox.tpl`, the message and both includes, and the same
  for the DOI plugin. The GitHub API lists no PR for it. In OMP the
  includes arrive with the plugin in 825986f471 (PR `pkp/omp#306`, "URN
  plugin").
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library
  for "Assign the URN", "Assign the DOI", URN with assign, checkbox and
  label, and `urnSuffixEdit` and `urnAssignCheckBox`.
  `pkp/pkp-lib#4132` (improve pub id assignment) and `pkp/pkp-lib#6443`
  (a custom DOI needing two saves, 3.3) are other faults.
- Code reads: on `main`, `urnSuffixEdit.tpl`, `urnAssign.tpl`,
  `urnAssignCheckBox.tpl` and the `en` and other locale files of the
  URN plugin in OJS and OMP; `PubIdPlugin::getPubId()`,
  `PKPPubIdPlugin::canBeAssigned()`,
  `PKPPubIdPluginHelper::execute()`, `publicIdentifiersForm.tpl` in OJS
  and OMP (OJS `issueForm.tpl` also includes `getPubIdMetadataFile()`,
  but `IssueForm` passes it no plugins), lib/pkp `form/checkbox.tpl`,
  `PKPPublicIdentifiersForm::execute()` and
  `PubIdPlugin::generateCustomPattern()` in OJS and OMP. On 3.5, 3.4 and
  3.3, `urnSuffixEdit.tpl` and `urnAssignCheckBox.tpl` in both apps, and
  on 3.3 OJS's `doiSuffixEdit.tpl`.
- Tips: `main` OJS bade233f73 (pkp-lib 2e377d27fc), OMP 3b0ecf794c.
  `stable-3_5_0` OJS 92b9a16b48, OMP 3081c9b00d. `stable-3_4_0` OJS
  9571d8fde7, OMP 0aec65441f. `stable-3_3_0` OJS 9fdb9bcf9a, OMP
  8e72fc8836.
- Not driven: a press file's tab (same template; read in the code); a
  typed pattern ("Use the pattern entered below…"), which takes the same
  preview branch, and the `%x` case with a Publisher ID change (read in
  the code); the Turkish, Azerbaijani and Georgian labels (read in the
  locale files); 3.4 and 3.3.
- Revised after two reviews, from code reads only: the `%x` case and the
  rest were added; the diff did not change.
