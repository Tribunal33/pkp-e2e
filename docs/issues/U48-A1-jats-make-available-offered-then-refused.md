# A Layout Editor, other assistant or Guest Editor without "Permissions" is offered "Make available with publication", and "Confirm" is refused

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (code; no "Make available with publication" box)
  - 3.4: none (code; no "JATS XML" page)
  - 3.3: none (code; no "JATS XML" page)
- **Introduced** `pkp/ui-library#788` for `pkp/pkp-lib#10405` (the box's own feature issue is `pkp/pkp-lib#10436`) · [02a9e42c](https://github.com/pkp/ui-library/commit/02a9e42c5d792bc260d0457505d894341277f235) · 2026-02-13 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A Layout Editor or other assistant, or a Guest Editor, whose assignment
has "Permissions" unticked sees no "Upload" or "Delete" on "JATS XML",
yet is offered "Make available with publication" enabled, with its
confirmation window. Pressing "Confirm" is refused with a window
"Error" / "You are not allowed to edit this publication." and "OK".

After "OK" the box looks unticked again, as saved, but a screen reader
still hears it as the person set it until the page is reloaded.

"Permissions" is unticked by default for the Guest Editor and every
assistant role. So with default roles, every Guest Editor, Layout
Editor or other assistant assigned to an article meets this. A Section Editor meets it only when "Permissions" has
been unticked on their assignment, since it is ticked by default for
that role.

## Impact

- **Lost**: nothing is saved or changed.
- **Who**: the people named in the Summary, on the "JATS XML" page of
  any version of an article they are assigned to.
- **Way round**: an editor sets the box, or ticks "Permissions" on the
  participant's assignment.

Low: it would be medium if the team rules that Layout Editors and the
other assistants, without "Permissions", must be able to publish the
JATS XML with the article.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. Submission 5, "Genetic
  transformation of forest trees", is in Production with `gcox` (Layout
  Editor) assigned, his "Permissions" box unticked (the Layout Editor
  role's default). Its one version has no uploaded JATS file, and "Make
  available with publication" is unticked.

1. Sign in as `gcox`.
2. On the dashboard ("Assigned to me") press "View" on submission 5.
3. Side menu: "Publication" › "JATS XML".
4. Look at the buttons on the right of the panel's "JATS XML" heading.
5. Tick "Make available with publication". A window "Enable JATS XML
   Download" opens; press "Confirm".
6. Read the window that opens and press "OK". Look at the box, and read
   its state in the browser's accessibility pane (or the input's
   `checked` property in the developer tools).
7. Reload the browser page and open "Publication" › "JATS XML" again.

**Expected**, as recommended below: the page offers `gcox` what the
server lets him do. The box shows the saved state, greyed, as "Upload"
and "Delete" are withheld, so steps 5–7 cannot be taken. (If the team
rules the other way, step 5 saves.)

**Observed**: in step 4 the heading offers "Download" and the box,
enabled and unticked; no "Upload". Step 5's window reads "This will
make the JATS XML file available for public download when the
publication is published. Are you sure you want to enable this?", with
"Confirm" and "Cancel". "Confirm" opens:

```
Error
You are not allowed to edit this publication.
OK
```

The save answered 401:

```
PUT …/api/v1/submissions/5/publications/6/jats/visibility   401   (sent as POST with X-Http-Method-Override: PUT)
{"error":"api.submissions.403.userCantEdit","errorMessage":"You are not allowed to edit this publication."}
```

After "OK" the box is still enabled and looks unticked, while its
accessible state reads `checkbox "Make available with publication"
[checked]`. After the reload in step 7 both read unticked.

## Cause

The page withholds "Upload" and "Delete" from people the server will
refuse, but offers them the box, which the server refuses by the same
rule.

The server: `lib/pkp/api/v1/jats/PKPJatsController.php` routes `PUT
…/jats/visibility` (`setVisibility()`) with the upload and the delete,
and `authorize()` adds `PublicationWritePolicy` for every action but
`get`. Its `PublicationCanBeEditedPolicy` asks
`Repo::submission()->canEditPublication()`: true for a manager-level
role, otherwise only when one of the user's assignments on the
submission has `canChangeMetadata` (the "Permissions" box).
`jatsPublicVisibility` is a property of the publication
(`schemas/publication.json`), so this is the right rule.

The page: `lib/ui-library/src/pages/workflow/components/publication/WorkflowPublicationJats.vue`
receives `canEdit` (`permissions.canEditPublication`, which is the
publication's `canCurrentUserChangeMetadata`, computed by the same
`canEditPublication()`) and shows "Upload" and "Delete" only when it is
true. The `Checkbox` beside them is guarded only by
`loadingContentError == null` and greyed only while a save runs
(`:disabled="isUpdatingVisibility"`). The box came that way in
02a9e42c, as a plain input; 85b2217d moved it onto `Checkbox` with the
same guard.

After a refusal, `updateVisibility()`'s error callback sets
`jatsPublicVisibility` to the value it already held, so `Checkbox`'s
`checked` does not change. `Checkbox` draws its icon from `checked`,
so the box looks as saved, but Vue leaves the native input as the
person set it. This is the `Checkbox` fault of
[U37 A26](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U37-A26-no-answer-box-screen-reader-opposite-state.md)
(`pkp-e2e#431`), whose fix makes the input follow `checked` and covers
this box too.

Reach:

- Who: every participant without a manager-level role whose
  assignments on the submission all have "Permissions" unticked. OJS's
  `registry/userGroups.xml` sets `permitMetadataEdit` on the Journal
  manager, Journal editor, Production editor and Section editor groups
  only. The "JATS XML" item sits outside the side menu's
  Production-access block (`useWorkflowNavigationConfigOJS.js`), so
  participants without Production access meet the box too (code).
  Walked: a Layout Editor.
- Both directions: unticking a ticked box asks "Disable JATS XML
  Download" and is refused the same way (code).
- Not reached: the Author, whose view lists no "JATS XML".
- Not affected: "Download" and "More Information", which only read.
- The same pattern, separate fixes: the "Body Text" page offers the
  text editor and "Save" to the same people
  ([U48 A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A2-body-text-save-offered-then-refused.md);
  that component is passed no `canEdit`), and the "Media" page offers
  its write actions
  ([U47 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U47-A1-media-actions-offered-then-refused.md),
  `pkp-e2e#493`; its component drops the `canEdit` it is given).

## Proposed fix

Proposal, for the team to confirm: grey the box for anyone the page
already withholds "Upload" and "Delete" from, using the `canEdit` the
component already has. The box keeps showing whether the JATS XML is
published with the article, which is worth seeing, and it can no longer
be changed by someone the server will refuse.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jats-make-available-offered-then-refused/fix.diff):

```diff
--- a/lib/ui-library/src/pages/workflow/components/publication/WorkflowPublicationJats.vue
+++ b/lib/ui-library/src/pages/workflow/components/publication/WorkflowPublicationJats.vue
@@ -56,7 +56,7 @@
 								v-if="workingJatsProps['loadingContentError'] == null"
 								:label="t('publication.jats.makePublic')"
 								:checked="jatsPublicVisibility"
-								:disabled="isUpdatingVisibility"
+								:disabled="isUpdatingVisibility || !canEdit"
 								class="text-sm !inline-flex shrink-0 whitespace-nowrap"
 								@change="handleVisibilityChange($event)"
 							/>
```

Tried on OJS `main`: `gcox` sees the box greyed and unticked, before
and after a reload, beside "Download" alone. With and without the fix,
`dbuskins` (a Section editor whose assignment has "Permissions") is
offered "Upload", "Download" and the box enabled, and ticking it and
pressing "Confirm" saves (200) and holds after a reload.

**Alternatives**:

- Hide the box with `v-if`, as "Upload" and "Delete" are: simpler to
  read, but the participant loses the one place on the page that says
  whether the file is published with the article.
- Let the server accept the change from Layout Editors and the other
  assistants: the box sets a publication property, which "Permissions"
  guards on every other publication page, so this would widen who may
  change the publication.

**What goes with it**:

- No server, REST API or stored data change.
- The input's state after a refusal that can still happen (a failed
  request): U37 A26's `Checkbox` fix covers it for every box. If that
  fix does not land, the local alternative is one line in
  `updateVisibility()`'s error callback that resets the input as the
  window's "Cancel" already does (`event.target.checked =
  this.jatsPublicVisibility;`), with the input passed in from
  `handleVisibilityChange()`.
- Guard: an e2e check that an assigned Layout Editor without
  "Permissions" sees the box greyed (a **Planned** item in the spec).

Small: one attribute in one component and a test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jats-make-available-offered-then-refused/walk.js)
  (helpers in `lib.js` beside it), steps 1–7 on a freshly loaded
  default dataset:
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/jats-make-available-offered-then-refused/walk.js`.
  `WALK=neighbour` takes steps 1–7 as `dbuskins` (Section editor on
  submission 5, "Permissions" ticked in the dataset); it was walked with
  the fix in and out.
- Walked: OJS `main` on its default dataset (pkp/datasets e8dafbc,
  2026-10-02, PostgreSQL). Not walked: the other roles named in Reach,
  unticking, a published version.
- 3.5 (code): `stable-3_5_0` has a "JATS XML" page but no visibility
  route in `PKPJatsController`, no `jatsPublicVisibility` in
  `schemas/publication.json` and no `jatsPublicVisibility` or
  `makePublic` in ui-library's `src`. 3.4, 3.3 (code): no `api/v1/jats`
  in pkp-lib and no JATS or body text component in ui-library.
- Introduced: 02a9e42c's subject reads "pkp/pkp-lib#10405 added jats
  public visibility settings from pkp/pkp-lib#10436": `pkp/pkp-lib#10405`
  is the issue its PR, `pkp/ui-library#788` ("file revision history of
  jats and galley"), was filed under, and `pkp/pkp-lib#10436` ("Add
  option to present JATS with galleys") the feature request for the
  box. The server's visibility route is pkp-lib 5f5066e1 (same author,
  2026-02-13), behind the `PublicationWritePolicy` the controller has
  applied to its writes since e3dbb3c9 (2023).
- Upstream: no pkp issue or PR found in pkp/pkp-lib, pkp/ui-library or
  pkp/ojs (searched for the box's label, `jatsPublicVisibility`, JATS
  visibility with permission, and `WorkflowPublicationJats`).
  `pkp/pkp-lib#12728` is about the public download, not this.
- Branch tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a,
  lib/ui-library 64d67363); `stable-3_5_0` OJS 091fb65453 (cf3f984335,
  d4e01883); `stable-3_4_0` OJS 75cc2d488b, pkp-lib 6f96165c90,
  ui-library ee684b34; `stable-3_3_0` OJS ac77c9fb35, pkp-lib
  4156e50233, ui-library 96959f9e.
