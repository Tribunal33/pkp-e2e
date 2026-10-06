# On an item's "Identifiers" tab, the box that assigns the URN does not name the URN

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP, OPS (code; OPS through its DOI plugin)
- **Introduced** OJS [dba6c9d597](https://github.com/pkp/ojs/commit/dba6c9d5978b12ecd65fae02ab34e0229d3d8272) for `pkp/pkp-lib#1457` (no PR linked to the commit) · 2015-12-06 · Bozana Bokan (bozana); OMP `pkp/omp#306` for `pkp/pkp-lib#1527` · [825986f47](https://github.com/pkp/omp/commit/825986f471eeb933c5dd3a3dfec0f773efcdecd9) · 2016-07-12 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the "Identifiers" tab of a galley, an issue, or a press's chapter,
format or file, a URN that is not yet assigned comes with a ticked box
that assigns it on "Save". The box reads "Assign the URN to this
galley", with the item's kind as the last word. It should read "Assign
the URN urn:nbn:de:0000-… to this galley". The same box in the "Publish
Issue" window names the URN.

Nothing is lost: the URN that will be assigned is shown just above the
box, as a preview or in the prefix and suffix boxes. In a few languages
whose sentence attaches an ending or punctuation to the URN (Turkish,
Azerbaijani, Georgian among them), that ending is left standing alone
in the label.

## Impact

- **Lost**: nothing; the right URN is assigned.
- **Who**: editors of a journal or press with the URN plugin on (it is
  off by default), on every item tab that offers to assign a URN.
- **Way round**: none needed.

Low: the label is incomplete, and nothing else is wrong.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS or OMP). The steps set up
  the URN plugin, which the dataset leaves off. OPS on `main` has no URN
  plugin.

Setting up URNs:
1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Enabled" on the "URN" row.
3. The "URN" row's "Settings": tick "Articles" and "Galleys" [press:
   "Monographs" and "Chapters"]; "URN Prefix" `urn:nbn:de:0000-`; leave
   "Use default patterns." selected; leave the "Check Number" box
   unticked; "Namespace" `urn:nbn:de`; "Resolver URL"
   `https://nbn-resolving.de/`; "Save".

Default pattern:
4. Open submission 1, "Signalling Theory Dividends" [press: 7,
   "Accessible Elements: Teaching Science Online and at a Distance"],
   Publication › "Galleys" › "PDF Version 2" › "Edit" › "Identifiers"
   [press: Publication › "Chapters" › "Introduction" › "Identifiers"].
   Read the "URN" area, then "Close".

Individual suffix:
5. Plugins › "URN" › "Settings": choose "Enter an individual URN suffix
   for each published item. …", "Save".
6. Open the same tab, type `u44k` in "URN Suffix" and press "Save".
7. Open the tab again and read the "URN" area. "Close" without saving.

**Expected**: the ticked box names the URN it will assign:

| Step | OJS | OMP |
|------|-----|-----|
| 4 | Assign the URN urn:nbn:de:0000-jpkjpk.v1i2.1.g2 to this galley | Assign the URN urn:nbn:de:0000-jpk.7.c27 to this chapter |
| 7 | Assign the URN urn:nbn:de:0000-u44k to this galley | Assign the URN urn:nbn:de:0000-u44k to this chapter |

**Observed**: in both steps, under "What you see is a preview of the
URN. Select the checkbox and save the form to assign the URN.", the
ticked box reads

```
Assign the URN to this galley
```

[press: `Assign the URN to this chapter`]. The page's text holds two
spaces where the URN belongs (`Assign the URN  to this galley`). In
step 4 the preview above the box shows `urn:nbn:de:0000-jpkjpk.v1i2.1.g2`
[press `urn:nbn:de:0000-jpk.7.c27`].

## Cause

The label is the locale key `plugins.pubIds.urn.editor.assignURN`,
"Assign the URN {$pubId} to this {$pubObjectType}", built in
`plugins/pubIds/urn/templates/urnAssignCheckBox.tpl` from the `pubId` its
caller passes. The tab's template,
`plugins/pubIds/urn/templates/urnSuffixEdit.tpl`, includes it twice
with `pubId=""`: once for an individual suffix (OJS line 31, OMP 30)
and once for the pattern preview (OJS line 49, OMP 48). The other
caller, `urnAssign.tpl` (the "Publish Issue" window on OJS, "Format
Approval" on OMP), passes the URN from `$pubIdPlugin->getPubId($pubObject)`.
The introducing commits give no reason for the empty value.

Reach:
- Every item tab that uses `urnSuffixEdit.tpl`: OJS galleys and issues,
  OMP chapters, publication formats and files (code; galleys and
  chapters walked).
- Translations that have the key all carry `{$pubId}`. Where one
  attaches an ending or punctuation to it, the empty value leaves that
  behind: `tr` "URN {$pubId}'yı bu {$pubObjectType}'ye atayın", `az`
  "URN {$pubId}-ni bu …", `ka` "URN-ის მინიჭება {$pubId}: …" (code; not
  walked).
- Some locales have no text for the key and show
  `##plugins.pubIds.urn.editor.assignURN##` whatever the template
  passes: OJS `dsb`, `eu`, `hsb`, `mn`, `ps`, `zh_Hans` (no entry) and
  `is`, `ro`, `uz` (empty); OMP `fr_CA` (no entry) and `vi` (empty).
  That is a separate translation gap, not part of this fix.
- 3.3 only: the DOI plugin of all three apps has the same two includes
  in `plugins/pubIds/doi/templates/doiSuffixEdit.tpl`, so its box reads
  "Assign the DOI to this …" (code). From 3.4 on, DOIs are part of the
  core apps, and their screens have no such box. On `main` the URN
  plugin is the only one with it.

## Proposed fix

Pass the URN to the label in both includes of `urnSuffixEdit.tpl`,
escaped the way the preview line just above prints the same value
(`{$pubIdPlugin->getPubId($pubObject)|escape}`). OJS
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/fix-ojs.diff)),
and the same two lines in OMP
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/fix-omp.diff)):

```diff
-					{include file=$templatePath pubId="" pubObjectType=$pubObjectType}
+					{include file=$templatePath pubId=$pubIdPlugin->getPubId($pubObject)|escape pubObjectType=$pubObjectType}
```

Tried on `main`, OJS and OMP: both steps then show the Expected labels.
To check that the assignment is unchanged, the saved suffix was changed
to `u44k2` and saved with the box ticked. That assigned
`urn:nbn:de:0000-u44k2` both with the fix and without it.

With an individual suffix, the label names the URN built from the
suffix that was last saved. If someone changes the suffix and saves
with the box ticked in one go, the new suffix is assigned (as today), so
for that one save the label names the old URN.

**Alternatives**
- A new key without the URN ("Assign the URN to this {$pubObjectType}")
  for the tab: always right, but it is a new string. `Locale::translate()`
  has no fallback to English, so every locale would show a raw key
  until translated, where today only the locales listed under Reach do.
- Fill `$pubId` inside `urnAssignCheckBox.tpl` when the caller passes
  none: the same result, but the label template would then reach into
  its caller's variables. Each caller passing its own value keeps the
  pattern `urnAssign.tpl` uses.

**What goes with it**
- No stored data, API or plugin hook changes.
- The diff applies as it stands to `stable-3_5_0`, `stable-3_4_0` and
  `stable-3_3_0`, which have the same lines. A 3.3 backport that should
  also cover the DOI plugin needs the same change in `doiSuffixEdit.tpl`.

Small: two lines in one template per app.

## Evidence

- Walk script, kept in this repo:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/walk.js)
  (helpers in `lib.js` beside it and in
  `../urn-check-digit-from-suffix-only/lib.js`), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). `WALK=neighbour` in front runs the
  check that the assignment is unchanged. Neither the fault nor the fix
  depends on the database.
- Tips: `main` OJS b84f8e2e44 (lib/pkp 3dc90c81a6), OMP 3b0ecf794
  (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246
  (lib/pkp cf3f984335); `stable-3_4_0` OJS 75cc2d488b, OMP 0aec65441
  (lib/pkp 32b0f4b4af); `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883
  (lib/pkp f6ab331645).
- 3.4 and 3.3 (code): `plugins/pubIds/urn/templates/urnSuffixEdit.tpl`
  on each app's branch has both includes with `pubId=""`;
  `urnAssignCheckBox.tpl` and the `assignURN` text are unchanged. On 3.3,
  `doiSuffixEdit.tpl` has them at OJS lines 27 and 53, OMP 27 and 45,
  OPS 27 and 53, with `plugins.pubIds.doi.editor.assignDoi`, "Assign the
  DOI {$pubId} to this {$pubObjectType}". OPS has no URN plugin on any
  branch.
- Introduced: `git blame` on the two includes gives a893a48a40 (2018,
  which only moved them to `getTemplateResource()`, keeping `pubId=""`).
  Every earlier version back to dba6c9d597 has `pubId=""`, and
  dba6c9d597 added `urnAssignCheckBox.tpl`, `urnAssign.tpl` and the
  `{$pubId}` text. OMP: `git log -S'pubId=""'` gives 825986f47, which
  created the template.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/omp, issues and PRs,
  for "URN assign checkbox", "Assign the URN", "URN label missing",
  "URN preview checkbox label", "Assign the DOI" checkbox,
  `urnAssignCheckBox` and `urnSuffixEdit`.
