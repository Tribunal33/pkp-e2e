# Users & Roles › "Notify": the button that emails whole roles reads "Save"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#6374` for `pkp/pkp-lib#4017` · [891eba2020](https://github.com/pkp/pkp-lib/commit/891eba202036ec9d41ff8896949330918c0a4565) · 2020-11-25 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U55 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U55-notify-users.md#a1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Settings › Users & Roles › "Notify", the button under the form reads
"Save", the label every settings form uses, although it sends an email
to everyone who holds the ticked roles. Only the window that follows
names the action: it is titled "Send Email" and asks to confirm the
number of recipients.

Nothing is lost: the window stops a manager who pressed "Save" expecting
to keep a draft, and "Cancel" sends nothing.

## Impact

- **Lost**: nothing.
- **Who**: managers of a journal, press or server (and the Site
  Administrator) on the "Notify" tab. A site allows no journal bulk
  email until the Site Administrator turns it on, so only those sites
  show the tab.
- **Way round**: none needed.

Low: a misleading button label on a task that completes as intended,
with a confirmation in between.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS "Journal of Public
  Knowledge", OMP "Public Knowledge Press" or OPS "Public Knowledge
  Preprint Server", all at `publicknowledge`.
- The dataset allows no context bulk email, so the Site Administrator
  turns it on first (steps 1–3).

Steps:

1. Sign in as `admin`.
2. Open Administration › "Site Settings" › "Site Setup" › "Bulk Emails".
3. Tick "Journal of Public Knowledge" ("Public Knowledge Press", "Public
   Knowledge Preprint Server") and press "Save". "Saved" shows.
4. Sign out, and sign in as `rvaca` (the journal manager).
5. Open Settings › "Users & Roles" › "Notify"
   (`/index.php/publicknowledge/en/management/settings/access#notify`).
6. Tick "Journal manager" ("Press manager", "Preprint Server manager"),
   type "Office closed" in "Subject" and "The office is closed on
   Friday." in "Email".
7. Read the button under the form, and press it.
8. In the window that opens, press "Send Email".

**Expected** The button under the form says what it does, "Send Email",
the words the window that follows uses.

**Observed** The only button under the form reads "Save". Pressing it
opens a window titled "Send Email": "You are about to send an email to
2 users. Are you sure you want to send this email?" (3 on OPS), with
"Send Email" and "Cancel". "Send Email" replaces the form with "Emails
are successfully queued to be sent at the earliest convenience." and
"Send another email"; once the site's queued jobs have run, `admin` and
`rvaca` (and `dbarnes` on OPS) receive "Office closed".

## Cause

`PKPNotifyUsersForm` (lib/pkp
`classes/components/forms/context/PKPNotifyUsersForm.php`) declares no
page in its constructor. `FormComponent::getConfig()` then adds a
default one with the settings forms' button:

```php
if (!$this->pages) {
    $this->addPage(['id' => 'default', 'submitButton' => ['label' => __('common.save')]]);
```

The form does know the action's name: its `getConfig()` passes
`manager.setup.notifyUsers.send` ("Send Email") as `sendLabel`, which
ui-library's `NotifyUsersForm.vue::nextPage()` uses only for the
confirmation window's title and its primary button. The page's own
button keeps `common.save`, as it has since the form arrived with
`pkp/pkp-lib#4017`.

Reach:

- One shared form: OJS, OMP and OPS build the "Notify" tab from this
  lib/pkp class and the same ui-library component; no app subclasses or
  overrides it (code).
- The other Vue forms that fall back to the default page save settings
  or records (masthead, site settings, publication metadata and the
  like), so "Save" is right for them (code; the site's "Bulk Emails" and
  Settings › Journal › "Masthead" checked on screen). The forms that do
  something else already declare their own button, such as
  `statistics/users/ReportForm` "Export", `PKPCounterReportForm`
  "Download", `ChangeSubmissionLanguageMetadataForm` "Confirm",
  `LogReviewerResponseForm`, the `SelectRevision*Form`s,
  `StartSubmission` and OJS's `PublishForm`.

## Proposed fix

Declare the form's page with the "Send Email" label in the constructor,
the way `ReportForm` and `PKPCounterReportForm` declare theirs, and put
the fields in that page's group
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-send-button-reads-save/fix.diff)):

```diff
--- a/lib/pkp/classes/components/forms/context/PKPNotifyUsersForm.php
+++ b/lib/pkp/classes/components/forms/context/PKPNotifyUsersForm.php
@@ -65,7 +65,11 @@
 
         $currentUser = Application::get()->getRequest()->getUser();
 
+        $this->addPage(['id' => 'default', 'submitButton' => ['label' => __('manager.setup.notifyUsers.send')]]);
+        $this->addGroup(['id' => 'default', 'pageId' => 'default']);
+
         $this->addField(new FieldOptions('userGroupIds', [
+            'groupId' => 'default',
             'label' => __('user.roles'),
```

(and `'groupId' => 'default'` on "Subject", "Email" and "Copy" alike).
The key is the one the window already uses, so the button and the window
read the same in every language; where a locale lacks it (21 of 65),
both fall back to English "Send Email". Tried on `main`, OJS, OMP and
OPS: with the fix applied the button reads "Send Email", it still opens
the same confirmation window, "Send Email" there still queues the
emails and "Cancel" still sends nothing, while the site's "Bulk Emails"
form and Settings › Journal › "Masthead" keep "Save".

**Alternatives**

- Overriding `getConfig()` to rewrite `pages[0]['submitButton']` after
  the parent builds it: works, but every other form with its own button
  declares it in the constructor.
- Setting the label in `NotifyUsersForm.vue`: the button's label comes
  from the server's page configuration for every form, so a client-side
  override would be the only one of its kind.

**What goes with it**

- Two other reports touch this constructor, and their diffs need
  merging with this one, not choosing between.
  [No field is marked required](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U55-A2-notify-required-fields-unchecked.md):
  the fields pass `'required' => true`, a key `Field` ignores because
  its property is `isRequired`.
  [The window counts a person once per ticked role](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U55-A3-notify-total-counts-person-per-role.md):
  its fix drops the per-role counts this constructor gathers.
- Backport: the same change applies to `stable-3_5_0` and
  `stable-3_4_0` (the same file with the same constructor), and to
  `stable-3_3_0` in `PKPNotifyUsersForm.inc.php` with its array syntax.
- Guard: the e2e spec U55's scenario 1 presses this button and can
  assert its label once the fix lands.
- No stored data, API or plugin hook is involved.

Small: six lines in one lib/pkp class, following the existing pattern,
tried on all three apps.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-send-button-reads-save/walk.js),
  using the page objects in
  [NotifyUsersPages.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/pages/NotifyUsersPages.js).
  It takes the Steps on OJS, OMP and OPS on an install loaded from PKP's
  default test dataset, run from the pkp-e2e repo:
  `node bin/probe.js all shared/playwright/checks/issues/notify-send-button-reads-save/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Run with the
  argument `nb`, the script checks only that the site's "Bulk Emails"
  and "Masthead" forms keep "Save" and that "Cancel" in the Notify
  window sends nothing.
- Fix trial: `node bin/try-fix.js apply …/fix.diff ojs omp ops`, the
  walk and the `nb` run, then `revert`; the `nb` run was repeated with
  the fix out and read the same, apart from the "Notify" button's
  label.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, each on an
  install freshly loaded from pkp/datasets 1a5552c (2026-10-04),
  PostgreSQL. The fault is a fixed label, independent of the database.
  No request failed and no page script failed on any walk.
- Branch tips:
  - main: OJS ff004d0973, pkp-lib 987776cd04, ui-library 64d67363; OMP
    3b0ecf794c and OPS c8af945bb7, pkp-lib 3dc90c81a6, ui-library
    280f98c5 (the form file is identical in the three).
  - stable-3_5_0: OJS c1cee76b95, pkp-lib 771474347e; OMP 9c5e24246c
    and OPS 38b61882d3, pkp-lib cf3f984335; ui-library d4e01883.
  - stable-3_4_0: OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b;
    pkp-lib 767353f4fe, ui-library ee684b34.
  - stable-3_3_0: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161;
    pkp-lib ac3fa73402, ui-library 96959f9e.
- Code reads:
  - main and 3.5: `PKPNotifyUsersForm` (constructor, `getConfig()`),
    `FormComponent::getConfig()` (the default page),
    `NotifyUsersForm.vue::nextPage()`, and the other `FormComponent`
    subclasses for a declared `submitButton`.
  - 3.4 and 3.3 (pkp-lib's and ui-library's `stable-3_4_0` and
    `stable-3_3_0`, shared by the three apps): `PKPNotifyUsersForm.php`
    (3.4) and `PKPNotifyUsersForm.inc.php` (3.3) declare no page and
    pass `sendLabel` only; `FormComponent` adds the `common.save` page;
    `NotifyUsersForm.vue` uses `sendLabel` for the window alone.
- Introduced: `git log --follow` on the form gives 891eba2020 as the
  commit that created it without a page; no later commit touched the
  page. GitHub's `commits/<sha>/pulls` names `pkp/pkp-lib#6374`, and
  `pkp/ui-library#129` (eda42e56) for the Vue component.
- Upstream: pkp/pkp-lib, pkp/ui-library and pkp/ojs searched for the
  notify tab's button, "Save" and "Send Email", bulk email labels and
  `PKPNotifyUsersForm` / `NotifyUsersForm`. `pkp/pkp-lib#12548` and
  `pkp/pkp-lib#13184` are about the window's count, not the button.
- Not driven: the Site Administrator's and the editor's own view of the
  tab (the same form), and 3.4 and 3.3, read in the code only.
