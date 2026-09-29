---
name: contributors-and-affiliations
status: verified
---

# Contributors & affiliations

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Every publication carries a list of **contributors**: the people or
organizations credited as its authors. This feature is how that list is
maintained and shown. The submitting author builds the list while
submitting. The editorial team maintains it in the workflow's Publication
area. Readers see it on the published item's pages. Each contributor has a
name, contact details, one or more **contributor roles**, and any number of
**affiliations**. Contributor roles are labels such as "Author" or
"Translator", defined per journal on a settings screen that belongs to this
feature. An affiliation is an institution, either picked from the ROR
registry (the public Research Organization Registry) or typed by hand. An
entry picked from the registry carries the **ROR mark**, the registry's
logo. One contributor per publication is its **primary contact**.
<sup>a</sup>

## Actors & permissions

**Editing rights follow the publication, not this screen.** The
contributors list is editable by exactly the people who may edit the
submission's publication metadata at that moment. That gate, and the locks
it applies once a version is published, belong to *Publication metadata*
([→ edit gate](U40-publication-metadata.md#edit-gate)). The gate's
published-state behavior holds here unchanged: a published version's
Contributors page shows the same warning banner as the other publication
pages, and it stays fully editable for the same people. When the viewer
may not edit, the list is read-only. The rows and the "Preview" button
remain. Every other control is absent entirely: "Order", "Add Contributor"
and all row actions (Rule 9). This differs from the Funding list, whose
disabled buttons stay visible but grayed out. During submission, the
wizard's Contributors step is the submitting author's own draft, and it is
always editable there. <sup>a</sup> <sup>b</sup>

| Action | Who may — and when |
|--------|--------------------|
| **See the Contributors list (workflow)** | • any role whose workflow view includes the Publication area: Journal Manager, Editor, Site Administrator, and assigned Section Editors, Guest Editors, Assistants and the submission's Author. The "Contributors" entry is always present, and no setting removes it. Which roles reach the workflow screen at all is the workflow screen's own rule ([→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)); whether the Publication area shows is [→ the Publication tabs](U24-workflow-screen-and-stage-access.md#publication-tabs). <sup>a</sup> |
| **Add / edit / delete / reorder contributors, set the primary contact** | • whoever may currently edit the publication's metadata ([→ edit gate](U40-publication-metadata.md#edit-gate)). Everyone else sees the read-only list (Rule 9).<br>• on a preprint server, that includes the submitting author on their own not-yet-posted preprint. On a journal or press the author's workflow list is read-only [OPS1](#ops1). <sup>b</sup> |
| **Edit contributors while submitting (wizard)** | • the submitting author. The wizard's Contributors step is always present and always editable. The step's place in the flow and its submit gates belong to the *[Submission wizard](U21-submission-wizard.md)*. <sup>i</sup> |
| **Manage the journal's contributor roles** | • Journal Manager, and a Site Administrator working in the journal, on the "Contributor Roles" settings screen (Rule 12). <sup>e</sup> |
| **See contributors on reader pages** | • any reader, on a published item's landing page and in the listing pages' author lines (Rules 14–15). <sup>h</sup> |
| **Require competing-interest statements** | • Journal Manager, and a Site Administrator working in the journal, on the workflow settings' Metadata screen (Settings that modify behavior). <sup>j</sup> |

## Fields & validation

The add/edit panel ("Add Contributor" / "Edit") opens with a
**"Contributor Type"** choice. That choice decides which of the fields
below appear. Its guidance warns: "Selecting a contributor type will
determine which fields you need to complete in this form. Please note that
if you change the contributor type after you've started filling out the
form, any information you've already entered will not be saved." Fields
marked *multilingual* follow the language-bar behavior of the other
publication forms (see *[Publication metadata](U40-publication-metadata.md)*).
Only the submission language's copy is ever required. A save with a
required field missing never leaves the form. **"This field is required."**
appears in red under the field. The form's foot shows **"Please correct one
error."**, or **"Please correct {n} errors."** when there are several, with
a **"Jump to next error"** link until every error is fixed. After a refused
save, Save stays disabled while any flagged field still carries its error.
Editing a flagged field clears that field's message alone, and Save enables
once no error is left. The server can also refuse a save the form itself
let through. The same foot then counts and lists the server's reasons as
"Go to {Field}: {message}" buttons, and the page shows "The form was not saved because {n}
error(s) were encountered. Please correct these errors and try again." A
reason that names a field the chosen contributor type does not show can
never be cleared, so Save stays disabled until the panel is closed
⚠ [A20](#a20). <sup>c</sup> <sup>n</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Contributor Type** | Yes | Radio choice: **"Person"** (preselected), **"Organization or group"** or **"Anonymous"**. An Anonymous contributor has no name of its own and is shown everywhere as "Anonymous" (Rule 3). For it, only Email, Country, Contributor Roles, CRediT roles and Publication Lists remain; there are no name fields, ROR ID, Homepage URL, Bio Statement or Affiliations. Of those, only Contributor Roles is actually enforced. Email and Country keep their required markers, yet an Anonymous save with both empty is accepted ⚠ [A18](#a18). Switching types leaves what you typed on screen. On save, the other type's entries are discarded, as the guidance warns. The exception is a typed ROR ID, which silently stays in the saved record ⚠ [A4](#a4). |
| **Given Name** | Yes (Person) | Text, multilingual. Person only. |
| **Family Name** | No | Text, multilingual. Person only. |
| **Preferred Public Name** | No | Text, multilingual. Person only. Guidance: "Please provide the full name as the author should be identified on the published work. Example: Dr. Alan P. Mwandenga" |
| **Organization Name** | Yes (Organization) | Text, multilingual. Organization only. |
| **Email** | Yes | Text; must be an email address. Not enforced for an Anonymous contributor, despite the marker ([A18](#a18)). The label reads "Email" on some installs and "Email address" on others ⚠ [A19](#a19). |
| **Country** | Yes | Drop-down of countries. The submitting author's auto-created contributor can arrive with no country. Every later edit of that contributor is then refused until one is chosen ⚠ [A16](#a16). Not enforced for an Anonymous contributor ([A18](#a18)). |
| **ROR ID** | No | Organization only. A plain text box ("Enter organization's ROR ID."), separate from the Affiliations field below. Anything typed is accepted without a shape check ⚠ [A4](#a4). |
| **Homepage URL** | No | Must be a web address. |
| **ORCID iD** | No | Person only. Present only while the journal has ORCID enabled. The field's states, its "Request verification" flow and iD removal are owned by *[ORCID integration](U04-orcid-integration.md)*. |
| **Competing Interests** | Yes, when shown | Rich text, multilingual. Present only when the journal requires competing-interest statements (Settings that modify behavior). Guidance: "Please disclose any competing interests this author may have with the research subject." Saving it empty is stopped as a missing required field (the refusal described above this table). On a preprint server the field's label renders as raw code-like text instead of the plain "Competing Interests" ⚠ [OPS2](#ops2). <sup>j</sup> |
| **Bio Statement (e.g., department and rank)** | No | Rich text, multilingual. |
| **Affiliations** | No | The contributor's institution list, any number of entries. Guidance: 'Enter the full name of the institution below, avoiding any acronyms. Select the name from the dropdown and click "Add" to include the affiliation in your profile (e.g. "Simon Fraser University")'. Typing under "Type the institution name in {language}" queries the public ROR registry as you type, from four characters on, straight from your own browser. Each suggestion shows the institution's name, country, the ROR mark and a link to its registry record. You can also pick your typed text itself, offered first as a bare label, to record a hand-typed institution. "Add" appears only once a suggestion is picked. There is no Add button before that, and text typed but never picked is silently dropped when the form is saved ⚠ [A8](#a8). "Add" puts the institution on the list. While a picked entry sits under "Selected", the search box is disabled: add or remove the entry before typing a new query. A registry-backed entry's identity is fixed. Its row links to the registry record, its name comes from the registry, and its only action is "Remove institution". A typed entry carries one name box per submission language ("Type the institution name in {language}"). A screen reader announces those boxes wrongly ⚠ [A10](#a10). It also shows a completeness status: "{count} of {total} languages completed" while incomplete, "All translations available" once every language is filled. That total may follow the publication's own language set rather than the journal's ⚠ [A17](#a17). A typed entry offers both "Edit institution name" and "Remove institution"; the two actions sit behind the row's expander button, named "Click to edit or delete". A save without the submission language's name is refused with "Please provide affiliation name in the submission primary locale." The form foot's error summary misprints that message as "Go to Affiliations: [object Object]" ⚠ [A7](#a7). Removing asks "Are you sure?" with "The affiliation {name} will be deleted." (Yes/No). When a registry search fails, an "ROR API Error" dialog explains why. There are three distinct messages (rate-limited, unavailable or deprecated), each dismissed with "OK", and the text just searched is left pre-picked as a typed entry. Registry suggestions do not come back after the dialog. They stay off until the Edit panel is closed and reopened, whatever the dialog's own advice says ⚠ [A11](#a11). Hand-typed entry keeps working throughout. <sup>d</sup> |
| **Contributor Roles** | Yes | One checkbox per role the journal defines (Rule 11). At least one must be ticked; a save with none is stopped as a missing required field (the refusal described above this table). When the journal has exactly one role, the field disappears. Every contributor save from the form then fails, leaving role-less contributors behind ⚠ [A14](#a14). <sup>c</sup> |
| **CRediT roles and the degrees of contribution** | No | Guidance: "Select the CRediT roles of the contributor and the degrees of contribution." The standard CRediT taxonomy list, with a degree per picked role. Shown to readers on the landing page (Rule 14). |
| **Publication Lists** | No | One checkbox, ticked by default: "Include this contributor when identifying authors in lists of publications." (Rule 8, and its limits in practice, ⚠ [A3](#a3)). |

**The "Add Role" / "Edit Role" panel** (the Contributor Roles settings
screen, Rule 12): <sup>e</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Role Identifier** | Yes | Drop-down of the built-in identifier codes (AUTHOR, EDITOR, CHAIR, REVIEWER, REVIEW_ASSISTANT, STATS_REVIEWER, REVIEWER_EXTERNAL, READER, TRANSLATOR, OTHER). The identifier is what the role means to the system, for example in exports. It is fixed after creation: on "Edit Role" the drop-down offers only the role's own identifier. |
| **Role Name** | Yes (enforced for the primary language only) | Text, one box per language ticked under "Forms" on the journal's "Languages" tab, with the guidance "Fill name in all of the languages." The primary language's box shows when the window opens. Each other language's box ("Role Name in French") shows once that language's button ("French") at the top of the window is pressed. Under each box, "{count}/{total} languages completed" counts the filled boxes. These are the words shown on contributor rows, forms and reader pages; how a reader page falls back when a language's box is empty is Rule 15a. Despite the guidance, a save with another language's box left empty is accepted without a word ⚠ [A13](#a13). <sup>e</sup> |

## Rules & state

1. **One list per publication version.** Each version carries its own
   copy of the contributors list. Creating a new version copies every
   contributor onto the new version, including order, roles, affiliations
   and the primary-contact choice. The copy can then be edited
   independently. Creating versions belongs to
   *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*. <sup>g</sup>
2. **Where it lives.** The workflow screen's Publication area is titled
   "Preprint" on a preprint server. It carries a **"Contributors"** entry,
   second in the list right after "Title & Abstract". The entry is there
   for every role, and no setting removes it. It opens the contributors
   list: the heading "Contributors", with **"Order"**, **"Preview"** and
   **"Add Contributor"** above the rows. <sup>a</sup>
3. **The row.** Each contributor's row shows their full name and one
   badge per contributor role ("Author", "Translator", …). The primary
   contact's row adds a **"Primary Contact"** badge; other rows offer
   **"Set Primary Contact"** instead. Each row ends with **"Edit"** and
   **"Delete"**. An Anonymous contributor's row is titled with the literal
   word **"Anonymous"**. That word serves as the name in every place the
   list feeds: the Delete confirmation's "{name}", the three Preview
   formats (Rule 7), and the reader pages' credits and author lines
   (Rules 14–15). Nothing there distinguishes the entry from a person
   actually named Anonymous. The row never shows the contributor's
   affiliations, although the list reserves a line under the name for
   exactly that ⚠ [A1](#a1). <sup>a</sup>
4. **Add and edit.** "Add Contributor" opens the side panel described in
   Fields & validation. "Edit" opens the same panel prefilled. Saving
   closes the panel, updates the row in place, and refreshes the preview
   formats (Rule 7). <sup>c</sup>
5. **Delete.** "Delete" opens a confirmation titled "Delete Contributor":
   "Are you sure you want to remove {name} as a contributor? This action
   can not be undone." Its "Delete Contributor" button removes the
   contributor, with their affiliations, permanently. "Cancel" leaves
   everything untouched. The last contributor deletes the same way, with
   no extra warning. The emptied list then shows "No items found." beneath
   the unchanged "Order", "Preview" and "Add Contributor" buttons, and
   Preview's three formats simply show nothing. Deleting the primary
   contact leaves the publication with no primary contact at all, without
   any warning or replacement ⚠ [A2](#a2). <sup>f</sup>
6. **Ordering.** "Order" puts the list in ordering mode. "Preview" and
   "Add Contributor" give way to a **"Cancel"** button, "Order" itself is
   relabeled **"Save Order"**, and each row shows up/down arrows. For
   assistive technology the arrows are named "Increase position of
   {name}" and "Decrease position of {name}". "Save Order" saves the
   sequence everywhere the list appears. "Cancel" restores the order from
   before. A newly added contributor joins at the end of the list, after
   the auto-created submitting author, and that order is the same in the
   panel, the three Preview formats and the reader pages, and stable
   across loads, whether or not "Save Order" has ever been used. Once an
   order has been saved, every list and author string follows it, and
   later additions still join at the end. <sup>f</sup>
7. **Preview: the three display formats.** "Preview" opens "List of
   Contributors" ("Contributors to this publication will be identified in
   the following formats."). It is a two-column table (Format / Display)
   of the strings the rest of the system uses:
   - **"Abbreviated"**: a short author line built from the first
     contributor alone, plus "et al." when there are several. For a
     person it uses the family name, or the given name when there is no
     family name. For an organization it uses the Organization Name. For
     an Anonymous contributor it uses the word "Anonymous". The string is
     therefore never empty while any contributor exists. "First" is the
     first row of the list: the auto-created submitting author until an
     order is saved, then whoever the saved order puts first.
   - **"Publication Lists"**: the Full format below, restricted to
     contributors ticked for publication lists (Rule 8).
   - **"Full"**: every contributor's name followed by their own roles in
     parentheses, with the entries joined by semicolons. For example
     "Daniel Barnes (Author); Carlo Corino (Author); Alan Mwandenga
     (Translator)". Contributors sharing a role are never grouped under
     one parenthesis. <sup>a</sup>
8. **The publication-lists tick.** Unticking "Publication Lists" on a
   contributor is meant to keep them out of the author lines on listing
   pages, while the landing page still credits them. In practice the tick
   governs the Preview's "Publication Lists" format everywhere, but among
   the reader-facing listings only a press's catalog lists honor it. A
   journal's and a preprint server's listings show the unticked
   contributor anyway ⚠ [A3](#a3). "Abbreviated" ignores the tick either
   way. It is built from the first contributor of the full list, even one
   unticked from publication lists, so the two formats can disagree about
   who leads the author line. <sup>a</sup> <sup>h</sup>
9. **Read-only presentation.** Some viewers may not edit the publication
   (Actors & permissions). On a journal or press the submission's own
   Author is such a viewer. For them the same list shows only the rows,
   with names and role badges, and the "Preview" button. "Order", "Add
   Contributor" and every row action are absent. The "Primary Contact"
   badge disappears with them, so a read-only viewer cannot tell which
   contributor is the primary contact ⚠ [A6](#a6). <sup>b</sup>
10. **The primary contact.** Exactly one contributor at a time can be the
    version's primary contact. "Set Primary Contact" moves the badge
    immediately, with no confirmation. The submitting author's own
    contributor record arrives as the primary contact. It is created on
    submission; see *[Submission wizard](U21-submission-wizard.md)*.
    Readers never see the choice: no reader page marks any author as a
    contact. A publication can be left with no primary contact
    ([A2](#a2)). <sup>b</sup> <sup>g</sup>
11. **Contributor roles are journal records.** The roles offered on the
    contributor form are the journal's own list, maintained on the
    "Contributor Roles" settings screen (Rule 12). A new journal or
    preprint server starts with two: "Author" (identifier AUTHOR) and
    "Translator" (identifier TRANSLATOR). A new press starts with four:
    those two plus "Chapter Author" (also identifier AUTHOR) and "Volume
    editor" (identifier EDITOR). Each arrives named in the journal's
    primary language only: its box for any other "Forms" language is
    empty ⚠ [A21](#a21). The submitting author's auto-created
    contributor gets the journal's first AUTHOR-identifier role.
    <sup>e</sup>
12. **The Contributor Roles screen.** Settings → Workflow → Submission →
    **"Contributor Roles"**. It is a table of **"Role Name"** and **"Role
    Identifier"**, with **"Add Role"** above it and "Edit" / "Delete Role"
    behind each row's "…" menu. Add and edit use the panel described in
    Fields & validation. A successful save reports "Contributor role
    saved". In "Edit Role", the only way out besides "Save" is "Close"
    at the top (no "Cancel"). It shuts the window at once, with no
    question, saving nothing: reopened after a reload, the window shows
    the stored names; reopened before, it still holds what was typed
    ⚠ [A22](#a22). "Add Role" was not tried. <sup>e</sup>
13. **Deleting a role.** "Delete Role" opens a type-to-confirm dialog:
    'Are you absolutely sure you want to delete "{identifier}" role?' Its
    warning lists the two preconditions: at least one AUTHOR role must
    remain, and no contributor may still hold the role. Its confirm button
    stays disabled until the identifier is typed back exactly. A role that
    any contributor of any submission still holds is refused: "One or more
    contributors are using this role. Change the role to another before
    delete." The journal's last AUTHOR-identifier role can never be
    deleted ("Last AUTHOR role cannot be deleted."). Either refusal
    appears as a modal "Error" dialog dismissed with "OK". When both would
    apply, the in-use refusal is the one shown. The type-to-confirm
    dialog's confirm button is mislabeled with a whole warning sentence,
    "Are you sure you wish to delete this item? This action cannot be
    undone.", where a short "Delete" label belongs ⚠ [A12](#a12). A
    deleted role's confirmation reads "Role Deleted": '"{identifier}" has
    been successfully deleted.' <sup>e</sup>
14. **What readers see on the landing page.** A published item's landing
    page is the article page on a journal, the catalog's book page on a
    press, and the preprint's page on a server. It credits every
    contributor in list order: name, affiliation names, contributor role
    names (in the reader's language, Rule 15a), ORCID iD, and any CRediT
    roles, each followed by its degree in parentheses ("Conceptualization
    (Lead)"). On a journal's French article page the degree prints as a
    raw code (presses and servers untried) ⚠ [A23](#a23). A
    registry-backed affiliation's ROR mark links to its registry record,
    but assistive technology cannot name that link ⚠ [A9](#a9). The ORCID
    iD shows a verified or unauthenticated icon; see
    *[ORCID integration](U04-orcid-integration.md)*. Contributors with a
    Bio Statement get an **"Author Biographies"** section ("Author
    Biography" for one). Above each statement it shows "{name}, {affiliations}", or the name with no
    comma for a contributor without an affiliation. On a press, a book
    with five or more contributors compacts the credits to a single
    flowed line of names joined by semicolons, without affiliations, ROR
    marks, ORCID icons or role names [OMP1](#omp1). An Edited Volume's
    book page credits its volume editors in place of the contributor
    list, each name suffixed "(ed)", with the role name [OMP2](#omp2).
    <sup>h</sup>
15. **What readers see in listings.** Issue tables of contents, search
    results, the archive and other listing pages show each item's author
    line in the "Full" format of Rule 7: names with roles in parentheses.
    Whether a listing omits unticked contributors is Rule 8's exception
    ([A3](#a3)). Whether a section hides author lines entirely is the
    section configuration's rule, not this feature's. <sup>h</sup>
15a. **Role names in the reader's language.** On the landing page and
    in the listings' author lines (an issue's table of contents, a
    press's catalog, a preprint server's archive), each contributor role
    is named in the language the reader is browsing in. A role whose
    name is empty in that language (Fields, "Role Name") is named in the
    journal's primary language instead. Every role arrives with its
    French name empty ([A21](#a21)). So on a journal whose primary
    language is English, a reader browsing in French sees "Author"
    beside each contributor on the landing page and "{name} (Author)" in
    the author lines. Once a Journal Manager saves "Auteur-e" as the
    role's French name in its "Edit Role" window (Rule 12), the French
    pages read "Auteur-e" and "{name} (Auteur-e)", and the English pages
    still read "Author". <sup>h</sup>
16. **Affiliation identities and the registry cache.** An affiliation is
    either registry-backed or typed by hand. A registry-backed one is
    identified by its ROR record, and its name is shown from the registry
    in every registry language. A typed one has per-language names
    (Fields & validation). Registry search runs from the user's own
    browser against the public registry. The first time an institution is
    picked anywhere in the journal, the install also stores its registry
    record through the journal's server. A monthly self-update keeps all
    stored records current with the public registry data set; it also
    runs once at install. When the journal's server cannot reach the
    registry for that first pick, the stored record never arrives. The
    pick itself still lands normally, pressing "Add" raises an error
    dialog, and the entry is added anyway. The affiliation then saves, and
    publishes, with no name at all ⚠ [A5](#a5). <sup>d</sup> <sup>k</sup>
17. **Reviewers and anonymity.** Where the review type keeps the authors'
    identity from the reviewer, the contributor list is withheld from the
    data sent to the reviewer's browser. That safeguard is visible only by
    inspecting that data. What a reviewer's screens show of authorship
    belongs to the review features
    (*[Review stage & rounds](U26-review-stage-and-rounds.md)*).
    <sup>l</sup>

## Side effects

- Adding, editing, deleting or reordering contributors sends no email,
  raises no notification, and writes no activity-log entry. The list
  simply changes. Changing the primary contact is the one exception. It
  writes a single activity-log entry, "Submission metadata updated"
  (Activity Log & Notes → History), because the choice is saved on the
  publication itself. It too sends no email and raises no notification.
  <sup>f</sup>
- The one email in the flow: requesting a contributor's ORCID
  verification from the form sends that contributor the verification
  email. That email is owned by *[ORCID integration](U04-orcid-integration.md)*.
- Picking a registry-backed affiliation can store a local copy of the
  institution's registry record, with names in all registry languages.
  This is invisible to users (Rule 16).
- Contributor data travels outward with the publication's metadata. DOI
  registration, metadata export and citation displays carry the names,
  roles, affiliations and ORCID iDs. Those surfaces belong to their own
  features.
- Changing the submission language copies contributor names, and typed
  affiliation names, into the new language. The change-language flow
  belongs to *[Publication metadata](U40-publication-metadata.md)*.

## Settings that modify behavior

- **Competing interests.** On the workflow settings' Metadata screen,
  section "Competing Interests", the checkbox "Require submitting Authors
  to file a Competing Interest (CI) statement with their submission."
  When it is on, the contributor form gains the required "Competing
  Interests" field (Fields & validation) on every add and edit. Turning
  the setting off removes the field but keeps any saved statements. They
  reappear intact when it is turned back on. <sup>j</sup>
- **The journal's contributor roles** (Rules 11–13) shape the form's
  Contributor Roles choices. A one-role journal shows no choice at all,
  and cannot save a contributor from the form (⚠ [A14](#a14)).
- **A "Forms" language not ticked under "Metadata".** On the journal's
  "Languages" tab (Settings › Website › "Setup"), a language can be
  ticked under "Forms" in "Website Languages" without being ticked under
  "Metadata" in "Submission Languages"
  ([Languages & locales](U57-languages-and-locales.md#form-languages);
  install default: the primary language alone in both). Such a language
  adds no box to the contributor form, but the workflow's "Add
  Contributor" then never saves ([A20](#a20)). Adding the language to
  "Submission Languages" with "Submissions" ticked, which ticks
  "Metadata" too, lets it save again.
- **ORCID enablement** decides whether the form carries the ORCID iD
  field. The setting belongs to *[ORCID integration](U04-orcid-integration.md)*.
- Nothing gates the rest. The Contributors entry, the affiliations field
  and the registry lookup are always on, with no journal or site setting
  to disable them. <sup>a</sup>

## Cross-feature interactions

- *[Publication metadata](U40-publication-metadata.md)* owns the "may
  edit the publication" gate ([→ edit gate](U40-publication-metadata.md#edit-gate))
  and the published-state banners this feature's editing depends on. It
  also owns the Publication area's shared page furniture around each
  publication page (header, status line, banners), and the
  change-language flow whose name-copying is noted in Side effects.
- *[Submission wizard](U21-submission-wizard.md)* owns the wizard shell:
  the Contributors step's place, its Review-step presentation and submit
  gates, and the auto-creation of the submitting author's contributor
  record. This spec owns the panel the step shows: the same list, form
  and rules as the workflow, always editable there.
- *[ORCID integration](U04-orcid-integration.md)* owns the contributor
  form's ORCID iD field states, the verification request and iD removal,
  and the publish-time checks on contributor iDs.
- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#stage-access)*
  owns which roles reach the workflow screen and its Publication area
  ([→ the Publication tabs](U24-workflow-screen-and-stage-access.md#publication-tabs)).
  This spec's Actors rows start from that access.
- *[Funding](U43-funding.md)*: its Funder field reuses this feature's
  registry lookup (<a id="ror-lookup"></a>the search-as-you-type against
  the public ROR registry, the suggestion rows and the install's record
  cache; Rule 16).
- *[Languages & locales](U57-languages-and-locales.md)* owns the
  journal's "Languages" tab. The one combination of its ticks that
  changes this feature is under Settings that modify behavior.
- *[Institutions](U66-institutions.md)*: the manager-maintained institution list
  for subscriptions and statistics is a separate record set. Only the
  registry lookup above is shared.
- [Article landing page & reading](U13-article-landing-page-and-reading.md)
  (the press counterpart is the OMP catalog's book page) owns the landing
  screen. The contributor block on it is described here (Rule 14) as this
  feature's reader surface. A press's chapter-level author lists belong to
  *Chapters & work type* {OMP}.
- **User profiles and the masthead** use a separate, plain-text
  affiliation field, not this feature's institution records. The two meet
  only when a new submission copies the submitting author's profile
  affiliation into their contributor record: the text arrives as a typed
  institution name, never as a registry record, and a submission started
  in a language the profile has no affiliation for receives the profile's
  default-language text under that language. <sup>d</sup>

## Canonical scenarios

Scenarios 1–3, 6, 7, 9 and 10 run on the seeded journal with ready
accounts and scratch submissions; scenarios 4, 5, 8 and 11 run on a
scratch journal with throwaway accounts, because each needs the journal
set up differently (a second submission language, added contributor
roles, the competing-interests requirement, a review type). Each
scenario's accounts, seeding and the mail catcher's address are in its
footnote.

1. **Maintain the contributor list**

   Given: Journal Manager, on the seeded journal, with a submitted
   scratch submission.

   - **"Contributors"**: open the submission's workflow, then the
     Publication area, then "Contributors": the entry sits second, right
     after "Title & Abstract", and the page is headed "Contributors" with
     "Order", "Preview" and "Add Contributor" above the rows; the
     submitting author is already listed with an "Author" badge, the
     "Primary Contact" badge, "Edit" and "Delete" (Rules 2, 3, 10).
   - **An empty save**: press "Add Contributor": the panel opens with
     "Contributor Type" set to "Person"; press Save with nothing filled:
     "This field is required." appears in red under Given Name, Email,
     Country and Contributor Roles, the foot reads "Please correct 4
     errors." with "Jump to next error", and Save stays disabled while
     any of them is still empty; type "Alan" as Given Name and only its
     message goes, with Save still disabled (Fields).
   - **A bad Email and Homepage URL**: type "not-an-address" as Email
     and "not a web address" as Homepage URL, pick "Canada" as Country,
     tick "Author" and press Save: the save is refused and the panel
     stays open, with an error under Email and under Homepage URL
     (Fields).
   - **The person**: replace Email with "alan@example.test", clear
     Homepage URL and press Save: the panel closes and the new row shows
     "Alan" with an "Author" badge (Rule 4).
   - **The type switch**: press "Add Contributor", type "Casey" as Given
     Name, then choose "Organization or group": the name fields swap to
     "Organization Name"; type "Probe Org" there, "org@example.test" as
     Email, pick "Canada", tick "Author" and press Save: the row shows
     "Probe Org" with an "Author" badge; open its "Edit" and choose
     "Person": Given Name is empty, the other type's entry discarded on
     save as the guidance warns; choose "Organization or group" again
     and press Save (Fields; Rule 4).
   - **Edit**: open the person's "Edit", type "Mwandenga" as Family Name
     and press Save: the row updates to "Alan Mwandenga" (Rule 4).
   - **An Anonymous contributor**: press "Add Contributor" and choose
     "Anonymous": there are no name fields, ROR ID, Homepage URL, Bio
     Statement or Affiliations, only Email, Country, Contributor Roles,
     CRediT roles and Publication Lists; type "anon@example.test" as
     Email, pick "Canada", tick "Author" and press Save: the row is
     titled "Anonymous" with an "Author" badge, and "Preview"'s "Full"
     row ends "; Anonymous (Author)" (Fields; Rules 3, 7).
   - **Delete**: press "Delete" on "Probe Org": the dialog "Delete
     Contributor" asks "Are you sure you want to remove Probe Org as a
     contributor? This action can not be undone."; "Cancel" keeps the
     row; press "Delete" again and confirm with "Delete Contributor":
     the row is removed; delete the "Anonymous" row the same way, its
     dialog asking to remove "Anonymous" (Rules 3, 5).
   - **Nothing else happens**: no email arrived in the mail catcher from
     these saves, and the submission's Activity Log & Notes → History
     has no new entry (Side effects).
   - **Control**: the log's silence is read against scenario 3's line:
     "Set Primary Contact" on this same submission writes one
     "Submission metadata updated" entry (Side effects). <sup>s1</sup>

2. **Reorder and preview the display formats**

   Given: Journal Manager, on the seeded journal, with scenario 1's
   submission: two Person contributors with distinct family names, as
   scenario 1 leaves it once its organization and its Anonymous row are
   deleted.

   - **Preview**: the list shows the submitting author first and the
     added contributor second; press "Preview": "List of Contributors"
     shows "Abbreviated" as the first contributor's family name plus
     "et al.", and "Full" as both names, each followed by "(Author)" and
     separated by a semicolon (Rules 6, 7).
   - **Save Order**: close it and press "Order": up/down arrows replace
     the row buttons; move the second contributor up and press "Save
     Order"; reload the page: the order holds, and "Abbreviated" in
     Preview now names the other family name (Rule 6).
   - **Cancel**: press "Order" again, move a row and press "Cancel": the
     saved order is back (Rule 6).
   - **A new version**: open the first contributor's "Edit", under
     "Affiliations" type "Probe Institute", pick the typed text and press
     "Add", then Save; press "Create New Version" in the Publication
     area's side menu, offered whatever the version's state
     (*[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*),
     and press "Confirm" in its dialog unchanged: the new version's
     "Contributors" lists the same rows in the saved order, each with its
     "Author" badge, the "Primary Contact" badge on the submitting
     author's row, and "Probe Institute" under "Affiliations" in the
     first contributor's "Edit" (the row never shows it, [A1](#a1))
     (Rule 1; Fields).
   - **Control**: before "Save Order", the list showed the submitting
     author first and the added contributor second on every reload, and
     "Abbreviated" named their family name (Rule 6). <sup>s2</sup>

3. **Move the primary contact**

   Given: Journal Manager, on the seeded journal, with a submission with
   two contributors.

   - **"Set Primary Contact"**: the submitting author's row carries
     "Primary Contact" and the other row offers "Set Primary Contact";
     press "Set Primary Contact" on the other row: the badge moves at
     once, with no confirmation (Rule 10).
   - **The log and the mailbox**: the submission's Activity Log & Notes
     → History shows one new entry, "Submission metadata updated", and
     no email has arrived (Side effects).
   - **Deleting the primary contact**: delete that new primary contact:
     the remaining row still shows only "Set Primary Contact": the
     submission now has no primary contact, and nothing warned about it
     (Rules 5, 10).
   - **The publish dialog**: on a journal press "Schedule For
     Publication", the button in the Publication area's header beside
     "Status: Unscheduled", and continue past "Review Publishing Details"
     (its "Confirm" button) to the final window; on a press the same
     button reads "Publish" and opens the "Schedule For Publication"
     window at once, with no "Review Publishing Details" step. The window
     reads "All publication requirements have been met." (on a press
     followed by "Are you sure you want to make this catalog entry
     public?"); the missing contact is never mentioned (⚠ [A2](#a2));
     back out with "Close": the window's only other button is "Publish",
     no Cancel. Nothing is published. On a journal the header's status
     may no longer read "Unscheduled" and the Activity Log holds a second
     "Submission metadata updated" entry: the earlier "Confirm" recorded
     the version choice, a save on the publication itself, so both are
     expected, not a failure. On a preprint server the button reads
     "Post" and opens "Post the preprint"; that window's own mechanics,
     like the journal's and the press's, belong to
     *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*.
   - **The last contributor**: press "Delete" on the remaining row and
     confirm with "Delete Contributor": the emptied list shows "No items
     found." beneath the unchanged "Order", "Preview" and "Add
     Contributor" buttons, and "Preview"'s three formats show nothing
     (Rule 5).
   - **Control**: the deletes wrote nothing: after the first delete the
     Activity Log still held the move's one "Submission metadata updated"
     entry, and the last delete added none: the count stays at the
     publish step's two entries on a journal and at the move's one on a
     press (Side effects). <sup>s3</sup>

4. **Record affiliations, typed and registry-backed**

   Given: Journal Manager, on a scratch journal with a second submission
   language, editing a contributor of a scratch submission.

   - **A typed institution**: under "Affiliations", type "Probe
     Institute" (four or more characters), pick the typed text from the
     suggestions and press "Add": the institution joins the list, with
     "Edit institution name" and "Remove institution" behind its
     row-expander button ("Click to edit or delete") (Fields).
   - **The per-language names**: "Edit institution name" opens one name
     box per language, "Type the institution name in {language}", with a
     "{count} of {total} languages completed" status (Fields).
   - **An empty primary-language name**: clear the submission language's
     box and press Save: the save is refused with "Please provide
     affiliation name in the submission primary locale." under the
     field, while the foot's summary misprints it as "Go to
     Affiliations: [object Object]" ([A7](#a7)); type "Probe Institute"
     back into the box (Fields).
   - **A registry-backed institution**: type "Simon Fraser University",
     pick the suggestion that shows its country and the ROR mark, and
     press "Add": the entry's row links to the registry record and
     offers only "Remove institution". On an install whose server cannot
     reach the registry, the picked suggestion still shows, but "Add"
     raises an "Error" dialog; the entry is added anyway and saves
     without a display name ([A5](#a5)) (Fields; Rule 16).
   - **Both saved**: Save the contributor and reopen "Edit": both
     institutions are there (Rule 4; Fields).
   - **Removing one**: press "Remove institution" on "Probe Institute":
     "Are you sure?" asks "The affiliation Probe Institute will be
     deleted."; "Yes" removes it (Fields).
   - **Control**: the second language's name box stayed empty throughout
     and no save was refused for it: only the submission language's copy
     is ever required (Fields). <sup>s4</sup>

5. **Manage the journal's contributor roles**

   Given: Journal Manager, on a scratch journal with a scratch submission
   whose contributor holds the "Author" role.

   - **The Contributor Roles screen**: Settings → Workflow → Submission →
     "Contributor Roles": the table lists "Author" (AUTHOR) and
     "Translator" (TRANSLATOR); on a press it also lists "Chapter Author"
     and "Volume editor" (Rule 11).
   - **Add Role**: press "Add Role", pick identifier EDITOR, type
     "Handling editor" as the Role Name in every language ("Fill name in
     all of the languages.") and Save: "Contributor role saved" appears
     and the row appears (Rule 12; Fields).
   - **"Edit Role"**: open "Edit" behind the new row's "…" menu: the Role
     Identifier drop-down offers only EDITOR, the role's own identifier
     (Rule 12; Fields).
   - **The role in use**: on the submission, edit the contributor and
     tick "Handling editor": its badge joins the row; back on the
     settings screen, "Delete Role" on the new role now refuses after the
     type-to-confirm, with a modal "Error" dialog: "One or more
     contributors are using this role. Change the role to another before
     delete."; "OK" returns to the list with the role still there
     (Rule 13).
   - **The deletion**: untick the role on the contributor, then delete
     the role again: type "EDITOR" into the confirm box; the confirm
     button, labeled with a whole warning sentence (⚠ [A12](#a12)),
     enables only on an exact match; the dialog "Role Deleted" confirms
     (Rule 13).
   - **The last AUTHOR role**: try "Delete Role" on "Author": while the
     submission's contributor still holds the "Author" role, the same
     in-use "Error" dialog refuses again; with both refusals applicable,
     the in-use one is shown (Rule 13); move the contributor off the
     role: tick "Translator", untick "Author", Save; on a press also
     delete "Chapter Author" the same way, leaving "Author" the last
     AUTHOR-identifier role: "Chapter Author" shares the identifier
     AUTHOR, so its dialog also asks for "AUTHOR", and the role deleted
     is the one whose row's "…" menu was opened; try once more: the
     "Error" dialog now reads "Last AUTHOR role cannot be deleted."
     (Rule 13).
   - **Control**: the new role, once no contributor held it, went through
     the same dialog to "Role Deleted": the refusals are the held role's
     and the last AUTHOR role's alone (Rule 13). <sup>s5</sup>

6. **Readers see the contributors**

   Given: Reader, on the seeded journal, with a published item with two
   contributors, the first with a typed affiliation, a Bio Statement,
   two roles and the CRediT role "Conceptualization" at the degree
   "Lead"; on a press, also a second published book with five
   contributors, one with an affiliation.

   - **The landing page**: open the landing page: the authors block
     credits both in list order: names, the affiliation name, each
     contributor's role names, and the first contributor's CRediT role
     with its degree (Rule 14; Fields).
   - **"Author Biography"**: an "Author Biography" section shows
     "{name}, {affiliation}" above the statement, headed in the singular
     because only one contributor has a Bio Statement (Rule 14).
   - **A listing**: a listing page naming the item (an issue's table of
     contents, a press's catalog list, the preprint server's archive)
     shows the author line as names with roles in parentheses (Rule 15).
   - **No contact mark**: neither the landing page nor the listing marks
     either contributor as the primary contact (Rule 10).
   - **A book with five contributors**: on a press, open the second
     book's page: with five or more contributors the credits compact to
     a single flowed line of names joined by semicolons, with no
     affiliations, ROR marks, ORCID icons or role names ([OMP1](#omp1));
     the affiliated contributor's only trace is a dangling comma after
     the name (⚠ [A1](#a1)) (Rule 14).
   - **Control**: in the workflow, the item's "Contributors" list shows
     the "Primary Contact" badge on the submitting author's row, the
     choice readers never see (Rules 3, 10). <sup>s6</sup>

7. **Keep a contributor out of publication lists**

   Given: Journal Manager, then Reader, on the seeded journal, with
   scenario 6's published item and its two contributors.

   - **The untick**: edit the second of the two contributors, untick
     "Include this contributor when identifying authors in lists of
     publications." and Save: "Preview" now omits them from the
     "Publication Lists" row, while "Full" keeps them (Rule 8; Fields).
   - **The reader pages**: on the published item, the landing page still
     credits both; a press's catalog list drops the unticked
     contributor, while a journal's and a preprint server's listings
     still show them (⚠ [A3](#a3)) (Rules 8, 14, 15).
   - **"Abbreviated" ignores the tick**: re-tick the second contributor,
     untick the first the same way and Save: "Publication Lists" now
     omits the first, while "Abbreviated" still reads the first
     contributor's family name plus "et al.", so the two formats
     disagree about who leads the author line (Rule 8).
   - **Control**: before any untick, "Publication Lists" and "Full" read
     the same names and roles (Rule 7). <sup>s7</sup>

8. **Require competing interests**

   Given: Journal Manager, on a scratch journal with a scratch submission
   and its contributor.

   - **The setting**: on the workflow settings' Metadata screen, tick
     "Require submitting Authors to file a Competing Interest (CI)
     statement with their submission." and save: editing any contributor
     now shows a required "Competing Interests" field (Settings;
     Fields).
   - **An empty statement**: press Save with it empty: the save is
     refused on the form: "This field is required." in red under the
     field, and "Please correct one error." at the foot (Fields).
   - **A statement**: type "No competing interests." and press Save: the
     panel closes (Rule 4; Fields).
   - **The setting off**: untick the setting: the field is gone from the
     form (Settings).
   - **The setting on again**: tick the setting again and reopen the
     contributor's "Edit": the "Competing Interests" field is back with
     "No competing interests." intact (Settings).
   - **Control**: before the tick, the same contributor's form had no
     "Competing Interests" field (Settings; Fields). <sup>s8</sup>

9. **The read-only list**

   Given: Author, on the seeded journal, with the Author's own submitted
   scratch submission carrying a second contributor, and a second, not
   yet submitted draft of the same Author.

   - **The Author's list**: open your own submission's Publication area,
     then "Contributors": the rows show names and role badges, and the
     "Preview" button is there; "Order", "Add Contributor", "Set Primary
     Contact", "Edit" and "Delete" are absent, and no row carries the
     "Primary Contact" badge, so the primary contact cannot be told
     apart (⚠ [A6](#a6)) (Rule 9; Actors row 2).
   - **Preview**: press "Preview": "List of Contributors" opens with its
     "Abbreviated", "Publication Lists" and "Full" rows (Rule 7).
   - **The wizard's Contributors step**: open the draft in the submission
     wizard and go to its Contributors step: the same list, with
     "Order", "Preview" and "Add Contributor" above the rows and "Edit"
     and "Delete" on the row, editable as always there (Actors row 3;
     Cross-feature interactions).
   - **A preprint server**: on a preprint server the submitting author's
     list on their own not-yet-posted preprint carries the full controls
     instead: "Order", "Preview" and "Add Contributor" above the rows,
     and "Primary Contact" or "Set Primary Contact", "Edit" and "Delete"
     on each row ([OPS1](#ops1)) (Actors row 2).
   - **Control**: the Journal Manager's "Contributors" on the same
     submission shows "Order", "Preview" and "Add Contributor" above the
     rows, and each row's "Primary Contact" or "Set Primary Contact",
     "Edit" and "Delete" (Rules 2, 3). <sup>s9</sup>

App-specific:

10. **An Edited Volume credits its volume editors** {OMP}

    Given: Reader, on the seeded press, with a published Edited Volume
    with two contributors, the second holding the "Volume editor" role
    alone.

    - **The book page**: open the catalog's book page: it credits the
      volume editor in place of the contributor list, the name suffixed
      "(ed)", with the role name "Volume editor"; the first contributor
      is not credited there (Rule 14; [OMP2](#omp2)).
    - **The catalog list**: the catalog list's line for the volume keeps
      the full contributor list: both names, each with its roles in
      parentheses (Rule 15; [OMP2](#omp2)).
    - **Control**: scenario 6's two-contributor monograph's book page
      credits every contributor in list order (Rule 14). <sup>s10</sup>

11. **The reviewer's browser never receives the contributor list** {OJS OMP}

    Given: Reviewer, on a scratch journal at the install defaults, whose
    review type keeps the authors' identity from the reviewer ("Anonymous
    Reviewer/Anonymous Author"), with a submission in review and the
    Reviewer's accepted request on it; a second scratch journal whose
    default review type is "Open", seeded the same way.

    - **The anonymous assignment**: open the request from the reviewer
      dashboard and read the data the page fetched (the browser's own
      network view): the contributor list is withheld, so the data
      carries no contributor; the reviewer's screens are not read here:
      what they show of authorship belongs to the review features
      (Rule 17).
    - **Control**: on the open assignment the same data carries the full
      contributor list (Rule 17). A preprint server installs no review
      stage, so the scenario has no end there. <sup>s11</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - a new contributor joining last before any "Save Order" is pressed,
    on a press and a preprint server, where the suites save an order
    before they read it (Rule 6): scenario 2's "Preview" and "Control"
  - role names in the reader's language: a French reader's "Author" on
    the landing page and in the listings' author lines, "Auteur-e" once
    the role's French name is saved, the English pages unchanged
    (Rule 15a)
  - the "Edit Role" window's language button, the other language's box
    shown once it is pressed, and "{count}/{total} languages completed"
    under each box (Fields "Role Name")
  - "Close" on "Edit Role" leaving at once, with no question, and a
    reload showing nothing saved (Rule 12)
- **Nothing new to test**:
  - Preferred Public Name (Fields): another text box on the form
    scenario 1 fills
  - the search box disabled while a picked entry sits under "Selected"
    (Fields): the pick-then-"Add" flow scenario 4 runs
  - a contributor added after a saved order still joining at the end
    (Rule 6): scenario 2's read of a new contributor joining last
  - "Abbreviated" built from a given name, an Organization Name or
    "Anonymous" (Rule 7): the family-name form scenario 2 reads
  - "Author Biographies" in the plural with two statements (Rule 14):
    the singular heading scenario 6 reads
  - the Contributors entry, the affiliations field and the registry
    lookup with no setting to remove them (Settings): every scenario's
    given
- **Register carries it**:
  - A4 (a typed ROR ID surviving the type switch; Fields)
  - A7 (the form foot's "Go to Affiliations: [object Object]"; Fields;
    scenario 4 marks it)
  - A8 (institution text typed but never picked dropped on save;
    Fields)
  - A9 (the landing page's ROR link without an accessible name;
    Rule 14)
  - A10 (the typed affiliation's name boxes announced wrongly; Fields)
  - A11 (registry suggestions staying off after the "ROR API Error"
    dialog; Fields)
  - A13 (a Role Name saved with another language's box empty; Fields)
  - A14 (a one-role journal: no roles choice and every save failing;
    Fields; Settings)
  - A16 (the auto-created contributor without a Country, every edit
    refused until one is chosen; Fields)
  - A17 (the "{count} of {total} languages" total following the
    publication's languages; Fields)
  - A18 (an Anonymous save with Email and Country empty accepted;
    Fields)
  - A19 (the email field labeled "Email" or "Email address" by the
    install; Fields)
  - A20 (the workflow's "Add Contributor" never saving on a journal
    with a "Forms" language not ticked under "Metadata"; Fields;
    Settings)
  - A21 (contributor roles arriving named in the primary language
    only; Rule 11)
  - A22 (a role name closed without saving still showing when "Edit
    Role" is reopened before a reload; Rule 12)
  - A23 (a CRediT role's degree printing as a raw code on a French
    landing page; Rule 14)
  - OPS2 (the Competing Interests label rendering raw on a preprint
    server; Fields)
- **No seed**:
  - a failed registry search: the "ROR API Error" dialog and the text
    left as a typed entry (Fields)
  - the install storing a picked institution's registry record, and the
    monthly self-update (Rule 16; Side effects)
  - a registry-backed affiliation's ROR mark linking to its record on
    the landing page (Rule 14): the test installs' server cannot reach
    the registry, so a registry-backed affiliation with a name cannot
    be built
- **Owned by another feature**:
  - the ORCID iD field while ORCID is enabled (Fields; Settings; *ORCID
    integration*)
  - the ORCID iD icon on the landing page (Rule 14; *ORCID integration*)
  - the ORCID verification email (Side effects; *ORCID integration*)
  - a section hiding author lines (Rule 15; *Sections*)
  - contributor data travelling outward: DOI registration, export and
    citation displays (Side effects; *Identifiers*, *Import & export*)
  - changing the submission language copying names and typed
    affiliation names (Side effects; *Publication metadata*, its
    scenario 6)
  - the wizard shell and the auto-created submitting author's record
    (Cross-feature interactions; *Submission wizard*)
  - the edit gate and the published-version banners (Cross-feature
    interactions; *Publication metadata*, its scenarios 3, 4 and 12)
  - the Funder field's reuse of the registry lookup (Cross-feature
    interactions; *Funding*)
  - a new submission copying the submitting author's profile affiliation
    into their contributor record as a typed institution name
    (Cross-feature interactions; *Submission wizard*)

## Findings register

Verdicts are the author's judgment (claude, 2026-08-28), unreviewed
unless an entry notes otherwise; the team settles them on spec review.
The summary is sorted 🐞 → ❓ → ✅ and the entries below are the source;
badges, Impact and Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | Contributor rows never show affiliations, though the list reserves a line for them | 🐞 | user-visible | — |
| [A3](#a3) | The publication-lists tick is honored only by a press's catalog listings; journal and preprint-server listings ignore it | 🐞 | user-visible | — |
| [A5](#a5) | A registry pick the server cannot cache raises an error dialog, then saves and publishes with no name | 🐞 | user-visible | — |
| [A14](#a14) | On a one-role journal no contributor can be saved from the form; every attempt errors, yet creates a role-less contributor | 🐞 | user-visible | — |
| [A20](#a20) | On a journal with a "Forms" language not ticked under "Metadata", the workflow's "Add Contributor" never saves, refused on fields the form does not show | 🐞 | user-visible | — |
| [A7](#a7) | The contributor form's error summary prints "Go to Affiliations: [object Object]" | 🐞 | minor | — |
| [A9](#a9) | The landing page's affiliation ROR link has no accessible name | 🐞 | minor | — |
| [A10](#a10) | The typed affiliation's per-language name boxes are announced wrongly by a screen reader | 🐞 | minor | — |
| [A12](#a12) | The delete-role confirm button is labeled with a whole warning sentence instead of "Delete" | 🐞 | minor | — |
| [A23](#a23) | On a French landing page a CRediT role's degree prints as a raw text code | 🐞 | minor | — |
| [OPS2](#ops2) | The contributor form's Competing Interests label renders raw markup on a preprint server | 🐞 | minor | — |
| [A2](#a2) | Deleting the primary contact silently leaves the publication with none | ❓ | user-visible | — |
| [A16](#a16) | The auto-created contributor can arrive without a Country — every later edit is then refused until one is supplied | ❓ | user-visible | — |
| [A4](#a4) | The organization contributor's "ROR ID" box accepts any text without a shape check | ❓ | minor | — |
| [A6](#a6) | The read-only list hides the "Primary Contact" badge, so viewers without edit rights cannot see who it is | ❓ | minor | — |
| [A8](#a8) | Institution text typed but never picked is silently dropped on save | ❓ | minor | — |
| [A11](#a11) | After a registry-error dialog the institution search stays dead until the Edit panel is reopened | ❓ | minor | — |
| [A13](#a13) | A contributor role's name saves with a language left empty, despite the required marker | ❓ | minor | — |
| [A17](#a17) | The typed affiliation's "{count} of {total} languages" total may follow the publication's languages, not the journal's | ❓ | minor | — |
| [A18](#a18) | An Anonymous contributor's Email and Country are marked "* Required" but save empty | ❓ | minor | — |
| [A19](#a19) | The contributor form's email field is labeled "Email" on one install and "Email address" on another, and the error summary's "Go to …:" link follows the label | ❓ | minor | — |
| [A21](#a21) | Contributor roles arrive named in the primary language only, so readers in another language see "Author" | ❓ | minor | — |
| [A22](#a22) | A role name typed and closed without saving still shows when "Edit Role" is reopened before a reload | ❓ | minor | — |
| [OMP1](#omp1) | A book with five or more contributors compacts to bare name-and-affiliation lines | ✅ | user-visible | — |
| [OMP2](#omp2) | An Edited Volume's book page credits volume editors instead of the contributor list | ✅ | user-visible | — |
| [OPS1](#ops1) | The submitting author edits their own unposted preprint's contributors | ✅ | user-visible | — |
| [A15](#a15) | A newly added contributor can land at the top of the list, and of the reader-facing author line, varying between loads (pkp/pkp-lib#13003) | ✅ | retired | rebase check (claude), 2026-09-03 — fixed upstream (pkp-lib `922f895988`), verified live on OJS and OMP |

### All apps

<a id="a1"></a>
**A1 — Contributor rows never show affiliations** · 🐞 · user-visible.
The workflow's contributor rows, and the wizard's Review list, are built
to show each contributor's affiliation under the name. The line is always
empty, even for a contributor whose Edit panel holds a saved affiliation,
such as one carried over from the submitter's profile. An editor scanning
the list cannot see any contributor's institution without opening each
Edit panel. The display reads from a field the contributor data no longer
carries. The same dead read reaches a press's readers. On a book page
compacted for five or more contributors ([OMP1](#omp1)), a contributor
with an affiliation renders as "{name}, ;". The comma that should
introduce the affiliation prints with nothing after it.
Basis: code reading + probe. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — Deleting the primary contact leaves none** · ❓ · user-visible.
Deleting the contributor who is the primary contact removes the badge
from the list entirely. No other contributor inherits it, and no warning
or prompt appears. The publication simply has no primary contact until
someone notices and sets one. The publish flow does not catch it either:
the "Schedule For Publication" window ("All publication requirements have
been met."), and on a journal the "Review Publishing Details" step before
it, pass with no mention of the missing contact.
Question: should deletion be blocked, warn, or hand the badge to another
contributor? Lean: at least a warning. The deletion is offered without
any hint that the contact point is being lost.
Basis: code reading + probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — The publication-lists tick works only on a press** · 🐞 ·
user-visible.
Unticking "Include this contributor when identifying authors in lists of
publications." promises to keep the contributor out of listing pages, and
the Preview's "Publication Lists" row honors it. On a journal and a
preprint server, though, every reader-facing listing (issue tables of
contents, search results, the archive) shows the contributor anyway. Only
a press's catalog lists apply the tick. The checkbox therefore does
nothing reader-visible on two of the three applications.
Basis: code reading + probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The organization "ROR ID" box takes anything** · ❓ · minor.
An organization contributor's form offers a free-text "ROR ID" box that
accepts any string without checking the registry-identifier shape. The
Affiliations field is different: its registry entries are always picked
from the registry. A wrong value saves silently. It then shows nowhere but
this same box, not on the contributor's row and not on the published
page, while still traveling into metadata exports. The value even
survives a change of contributor type. A contributor saved as a Person
after a type switch silently keeps a ROR ID typed while "Organization or
group" was selected, even though the save discards the Organization Name
as the guidance warns. So a Person's stored record can carry an
organization-only ROR ID, with the same export risk.
Question: should the box validate the identifier shape, or be a registry
pick? Lean: validate. The sibling affiliation machinery already enforces
the shape.
Basis: code reading + probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — A registry pick the server cannot cache errors, then saves — and publishes — nameless** · 🐞 · user-visible.
When the journal's server cannot reach the registry, the user's own
browser search still works. The picked suggestion still becomes the
selected entry, with its registry link and ROR mark. Pressing "Add" then
raises a generic "Error" dialog: "An unexpected error has occurred.
Please reload the page and try again." Yet the entry is added anyway and
saves with no name. Reopening the form shows the entry flagged in red
"The primary language English is required". That message misleads twice:
the missing name never blocks any later save, and a registry-backed row
offers no name box, only "Remove institution". On the published page the
reader sees a bare, unlabeled ROR-logo link where the institution name
should be. This is the same failure family as the Funding list's
registry picks (*[Funding](U43-funding.md)*).
Basis: probe. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Read-only viewers cannot see who the primary contact is** · ❓ · minor.
For a viewer without edit rights, the contributor rows show names and
role badges only. The "Primary Contact" badge disappears along with the
editing controls. An assigned participant who may not edit the metadata
therefore has no way to see which contributor editorial correspondence
goes to.
Question: should the badge stay in the read-only view, since it is
information rather than an action? Lean: yes. It states a fact about the
publication, and hiding it reads as a side effect of stripping the action
buttons rather than a choice.
Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — The form's error summary prints "[object Object]" for affiliation errors** · 🐞 · minor.
When an affiliation fails validation on the contributor form, the error
summary at the form's foot reads "Go to Affiliations: [object Object]".
Sibling fields print their message there (compare "Go to Country: This
field is required."). The inline message under the field itself is
correct. Only the summary line is garbled.
Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — Institution text typed but never picked is dropped without a word** · ❓ · minor.
Typing an institution into the Affiliations search box and saving the
form without picking a suggestion saves the contributor with no
affiliation. The typed text vanishes with no message. A user who missed
that "Add" only appears after a pick can believe they recorded an
affiliation they did not.
Question: should the save warn about text left in the search box, or
keep it? Lean: warn. The pick-then-Add flow is easy to miss.
Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — The landing page's affiliation ROR link has no accessible name** · 🐞 · minor.
On a journal's article page and a preprint server's preprint page, a
registry-backed affiliation's ROR mark is an icon-only link with no text
and no accessible name. A screen-reader user hears an unnamed link and
cannot tell that it leads to the institution's registry record.
Basis: probe. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — The typed affiliation's name boxes are announced wrongly** · 🐞 · minor.
In the Affiliations field's typed-entry editor, a screen reader reads the
primary language's box out with both languages' labels run together, and
the second language's box has no label at all. The Funding list's
typed-name boxes carry the same defect
(*[Funding](U43-funding.md#a5)*).
Basis: probe. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — A registry error kills the institution search for the rest of the panel** · ❓ · minor.
After any "ROR API Error" dialog, dismissing it does not bring the search
back. New queries fire no registry lookup and offer only the typed text
itself, until the Edit panel is closed and reopened. The rate-limited
dialog's own advice, "Please wait a moment before continuing to search.",
cannot work in place. Only the unavailable dialog's page-refresh advice
does. The text just searched is left pre-picked as a typed entry, so
hand-typed entry keeps working.
Question: should dismissing the dialog, or a short wait, re-enable the
registry search, as the dialogs' wording implies? Lean: yes. Two of the
three messages advise retrying, and no retry is possible without
reopening the panel.
Basis: probe. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — The delete-role confirm button is labeled with a whole sentence** · 🐞 · minor.
In the type-to-confirm delete-role dialog (Rule 13), the confirm button's
label is the message "Are you sure you wish to delete this item? This
action cannot be undone." That is a warning sentence where a short
"Delete" belongs. No concise confirm label exists in the dialog.
Basis: probe. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — A role name saves with a language left empty** · ❓ · minor.
"Add Role" marks Role Name required in every journal language, and its
guidance says "Fill name in all of the languages." Yet a save with a
non-primary language's box empty succeeds, reports "Contributor role
saved", and simply leaves that language's name blank.
Question: should the all-languages requirement be enforced, or the
marker and guidance softened to the primary language? Lean: enforce. The
form promises it twice.
Basis: probe. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — On a one-role journal no contributor can be saved** · 🐞 · user-visible.
When a journal has exactly one contributor role, the form hides the
Contributor Roles field as designed. Saving any contributor from it then
fails every time, with the generic "An unexpected error has occurred.
Please reload the page and try again." toast. The screen cannot create a
contributor at all on such a journal. Worse, each failed attempt still
creates the contributor behind the scenes with no role. After a reload
the list shows the new row with no role badge, and the intended automatic
assignment of the one role never happens.
Basis: probe. <sup>f-a14</sup>

<a id="a16"></a>
**A16 — The auto-created contributor can lack a Country, then every edit demands one** · ❓ · user-visible.
The submitting author's auto-created contributor copies the country from
their user profile. An account created by an administrator ("Add User")
never asks for a country, so the contributor can arrive without one.
Country is required on the contributor form, so any later edit of that
contributor, such as ticking a role or adding an affiliation, is refused
until the editor supplies a Country the author never entered.
Question: should the form accept an edit that leaves an already-missing
Country empty, or should the administrator's account form require a
country as self-registration does? Lean: real friction, leaning bug. The
form's assumption is broken only by the administrator-created account
path.
Basis: probe + code reading. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — The affiliation completeness total may follow the publication's languages** · ❓ · minor.
On one journal, a fresh typed affiliation reported "All translations
available" on one submission but "1 of 2 languages completed" on
another. This suggests that the typed entry's per-language name boxes,
and their "{count} of {total} languages completed" total, follow the
publication's own language set rather than the journal's.
Question: does the box count follow the publication's languages or the
journal's? Lean: the publication's. The two submissions differed in
nothing else observed. Settling it needs two publications on one journal
with differing language sets, comparing each typed entry's box count and
total.
Basis: probe (single observation). <sup>f-a17</sup>

<a id="a18"></a>
**A18 — Anonymous's required markers on Email and Country do not bind** · ❓ · minor.
With "Anonymous" picked as the contributor type, the form marks Email,
Country and Contributor Roles "* Required". A save with only a
contributor role ticked is nonetheless accepted without a word, and the
stored contributor has no email or country. Only Contributor Roles is
enforced: an all-empty save is refused for that field alone, and Email
and Country are never flagged.
Question: should Email and Country be enforced for an Anonymous
contributor, or their required markers dropped? Lean: drop the markers.
An entry with no identity of its own plausibly has no contact details,
and nothing downstream is observed to need them.
Basis: probe. <sup>f-a18</sup>

<a id="a19"></a>
**A19 — The email field's label differs between installs** · ❓ · minor.
The contributor form's email field is labeled "Email" on one install and
"Email address" on another, with no setting behind the difference. The
refused form's error summary follows suit: "Go to Email: This is not a
valid email address." on the one, "Go to Email address: This is not a
valid email address." on the other. Seen on a press; the form is shared,
so a journal and a preprint server are expected to split the same way.
This spec names the field "Email", the reading both labels contain.
Question: which label should the form carry, "Email" or "Email address"?
Lean: a wording call either way; the defect is that the install, not the
product, decides.
Since: 2023-02-16 (3½ years) · Basis: test run. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — "Add Contributor" never saves while a "Forms" language is not ticked under "Metadata"** · 🐞 · user-visible.
A journal can have a language ticked under "Forms" but not under
"Metadata" (Settings that modify behavior). On such a journal the
workflow's "Add Contributor" › "Save" is refused for every contributor
type, whether a Journal Manager, an assigned Section Editor or, on a
preprint server, the submitting author presses it. The panel stays open and the page shows "The form was
not saved because {n} error(s) were encountered." The foot names fields
of the other contributor types, each as "Go to {Field}: This language is
not accepted.":

- **Person**: "Please correct one error.", naming Organization Name.
- **Organization or group**: "Please correct 3 errors.", naming Given
  Name, Family Name and Preferred Public Name.
- **Anonymous**: "Please correct 5 errors.", naming those three, "Bio
  Statement (e.g., department and rank)" and Organization Name.

None of those fields is on the form, so nothing can be corrected. No
field shows a message, and the "Go to …" buttons and "Jump to next error"
move to no field. Typing into a field that is shown clears nothing, and
"Save" stays disabled. "Close" leaves with nothing saved. On the same
journal the wizard's Contributors step and a row's "Edit" save normally.
Workaround: add the language to "Submission Languages" with
"Submissions" ticked, or add the contributor in the wizard before
submitting.
Since: 2025-11-11 (10½ months) · Basis: probe. <sup>f-a20</sup>

<a id="a21"></a>
**A21 — Contributor roles arrive named in the primary language only** · ❓ · minor.
A journal's contributor roles arrive named in its primary language
alone: "Author" and "Translator", and on a press also "Chapter Author"
and "Volume editor" (Rule 11). On a journal with French ticked under
"Forms", each role's "Edit Role" window shows the French box empty,
with "1/2 languages completed". A reader browsing in French therefore
sees "Author" on every landing page and author line (Rule 15a) until a
Journal Manager types each role's French name, although the
application's own French translation has them ("Auteur-e",
"Traducteur-trice", "Auteur du chapitre").
Question: should the role names be filled from the application's own
translations when the journal is created or a form language is added?
Lean: yes. The window marks the name required in every language and
counts the French one missing, yet nothing ever fills it.
Basis: probe + code reading. <sup>f-a21</sup>

<a id="a22"></a>
**A22 — A role name closed without saving reappears in "Edit Role"** · ❓ · minor.
In a role's "Edit Role" window, a French name typed and left with
"Close" is not saved: the Contributor Roles list is unchanged, and after
a reload the window's French box is empty. Reopened on the same page
before any reload, though, the window shows the typed name and "2/2
languages completed", as if it had been stored. A Journal Manager who
reopens the window to check reads an unsaved name as saved.
Question: should a reopened window show the stored values? Lean: yes.
The window is where a manager checks what readers will see (Rule 15a).
Basis: probe. <sup>f-a22</sup>

<a id="a23"></a>
**A23 — A CRediT role's degree prints as a raw code on a French landing page** · 🐞 · minor.
On a French article page a contributor's CRediT role reads
"Conceptualisation (##submission.submit.creditRoles.degrees.lead##)"
where the English page reads "Conceptualization (Lead)": the role is
translated, its degree is not. Seen on a journal. The degree words are
missing from the French translation all three applications share, so a
press's book page and a preprint server's page are expected to show the
same.
Basis: probe + code reading. <sup>f-a23</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Five or more contributors compact the book page's credits** · ✅ · user-visible.
On a press, a catalog book page with five or more contributors switches
from the full per-contributor blocks to a single flowed line of names
joined by semicolons, with no ROR marks, no ORCID icons, no role names
and no CRediT roles. This is a deliberate layout for long author lists.
In practice the line is names-only: where a contributor has an
affiliation, it renders as a dangling comma with nothing after it
(⚠ [A1](#a1)).
Basis: code reading + probe. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — An Edited Volume credits volume editors** · ✅ · user-visible.
On a press, an Edited Volume's book page shows the volume's editors where
a monograph shows its contributor list. Each name is suffixed "(ed)",
with the role name. The catalog's listing line keeps the full contributor
list, and chapter pages carry their own author lines. The contributors
list remains the source the catalog draws from. The swap is the catalog's
presentation choice.
Basis: code reading + probe. <sup>f-omp2</sup>

### OPS

<a id="ops1"></a>
**OPS1 — The submitting author edits their own preprint's contributors** · ✅ · user-visible.
On a preprint server the author's workflow Contributors list is fully
editable on their not-yet-posted preprint. On a journal or press the
author's workflow list is read-only. This matches the preprint model, in
which authors prepare their own preprint for posting. The same difference
holds for the neighboring Funding list.
Basis: probe. <sup>f-ops1</sup>

<a id="ops2"></a>
**OPS2 — The Competing Interests label renders raw markup** · 🐞 · minor.
On a preprint server the contributor form's Competing Interests field is
labeled with raw code-like text instead of the plain "Competing
Interests" label the other applications show. The text is visible link
markup around "CI Policy" plus an unresolved placeholder token. The
guidance sentence, the required behavior and saving all work as
specified.
Basis: probe + code reading. <sup>f-ops2</sup>

### Retired

<a id="a15"></a>
**A15 — A new contributor can land at the top of the list, varying between loads** · ✅ · retired. Fixed upstream (pkp-lib `922f895988`, pkp/pkp-lib#13003), 2026-09-03. <sup>f-a15</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a — the panel and its mount.** UI: `ContributorsListPanel.vue`
(ui-library `src/components/ListPanel/contributors/`), wrapped by
`ContributorManager.vue` (`src/managers/ContributorManager/`), mounted
by the workflow page's publication config (`contributors` block in
`workflowConfigEditorialOJS.js` AND `workflowConfigAuthorOJS.js` — both
pass `canEdit: permissions.canEditPublication`); OMP and OPS inherit the
block whole via the config deep-merge (`useWorkflowConfigOMP.js` /
`useWorkflowConfigOPS.js` — no app override touches `contributors`), and
all three apps pin the identical ui-library commit (`246623e9`, checked
2026-08-28) — positive shared-code evidence for every client-side claim.
The "Contributors" nav entry is pushed unconditionally by all six
navigation builders (`useWorkflowNavigationConfig{OJS,OMP,OPS}.js`,
editorial + author), right after `titleAbstract`, label
`publication.contributors` ("Contributors"). Panel strings:
`common.order` ("Order"), `grid.action.saveOrdering` ("Save Order"),
`common.cancel`, `contributor.listPanel.preview` ("Preview"),
`grid.action.addContributor` ("Add Contributor"). Preview modal
(`ContributorsPreviewModal.vue`): title `submission.contributors` ("List
of Contributors"), description `contributor.listPanel.preview.description`,
rows `…preview.abbreviated`/`…publicationLists`/`…full` bound to the
publication payload's `authorsStringShort` /
`authorsStringIncludeInBrowse` / `authorsString`
(`PKP\publication\maps\Schema::mapByProperties()`), computed by
`PKPPublication::getShortAuthorString()` (a Person's `familyName ?:
givenName`; an Organization's or Anonymous contributor's full name —
the organization name / the localized "Anonymous"; wrapped in
`submission.shortAuthor` "{$author} et al." when several) and
`getAuthorString()` ("{fullName} ({roles})"
joined by `common.semicolonListSeparator`). The fallback chain
live-probed 2026-08-28 (OJS; shared pkp-lib code, cross-app by path):
with the first contributor an organization, "Abbreviated" read "Probe
Org u41h2 et al."; a person with a given name only, "Solo et al."; an
Anonymous contributor, "Anonymous et al." Anonymous rendering, same
probe: the saved record answers `fullName: "Anonymous"`; the row read
"Anonymous" + role badge, the Delete dialog "Are you sure you want to
remove Anonymous as a contributor?", and Preview's "Publication Lists"
and "Full" rows "Alex Author (Author); Anonymous (Author)". Preview re-fetches the
publication on open, so the strings are server-fresh. Chrome, nav
position ("Contributors" second, area titled "Preprint" on OPS), the
buttons and the three preview formats live-confirmed 2026-08-28 on all
three apps — "et al." already appears at two contributors.
`getShortAuthorString()` applies no publication-lists filter:
live-probed 2026-08-28 (OJS), "Abbreviated" named a first-listed
contributor who was unticked from publication lists while the
"Publication Lists" row omitted them.

<a id="fn-b"></a>
**b — the edit gate, read-only rendering, API roles.** `canEditPublication`
comes from the same permission as the sibling publication features
([→ edit gate](U40-publication-metadata.md#edit-gate) — 
`canEditPublication` via `PublicationCanBeEditedPolicy` /
`Repo::submission()->canEditPublication()`). In the panel, `canEditPublication:false`
HIDES "Order" (`v-if`), "Add Contributor" (`v-if`) and the whole
`#item-actions` slot (Set Primary Contact, badge, Edit, Delete); nothing
is rendered disabled — contrast `FunderManager`, whose buttons gray out.
"Preview" is not gated. API cluster (owned by
*[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*'s
controller): GET contributors allows Manager, Sub-editor,
Assistant, Reviewer, Author; the four writes (add/edit/delete/saveOrder)
allow Manager, Sub-editor, Assistant, Author behind
`PublicationWritePolicy`; `addContributor`/`editContributor` re-run
`canEditPublication()` inline, `deleteContributor`/`saveContributorsOrder`
rely on the policy alone (`PKPSubmissionController.php`). Primary
contact: the panel PUTs `{primaryContactId}` to the publication itself,
not a contributor endpoint (`setPrimaryContact()` →
`publicationApiUrl`). OPS's `SubmissionController` re-registers publish
ops with author-inclusive roles but touches no contributor route —
contributor endpoints already include Author in the base class (empty
chain on all three apps for author model, affiliation classes and the
contributors cluster). Live-probed 2026-08-28: an OJS and an OMP
author's workflow list renders read-only exactly as described (controls
absent, nothing grayed); an Assistant's controls flip absent→present
with the metadata-edit grant; "Preview" stays offered in every
read-only view. Published-version behavior live-probed 2026-08-28 (OJS,
published scratch version): the Contributors page rendered the
published-version warning banner *Publication metadata* documents
("Warning: This version has been published. Editing it may impact the
published content.") with the full controls, and an add and a delete
both saved with no further warning — warn-but-editable, identical to
the neighboring Title & Abstract and Metadata pages — for the Journal
Manager and (rendering checked) for an Assistant holding the
metadata-edit permission.

<a id="fn-c"></a>
**c — the contributor form.** `PKP\components\forms\publication\ContributorForm`
(byte-identical in the three pinned lib/pkp copies; OPS carries an empty
subclass, OJS/OMP none). Field order and conditions as tabled:
`contributorType` (FieldOptions radio, `ContributorType::getTypes()` —
PERSON "Person", ORGANIZATION "Organization or group", ANONYMOUS
"Anonymous"; all three radios live-confirmed 2026-08-28 on OJS, OMP and
OPS, with the Anonymous field set as tabled), `givenName` (required,
showWhen Person), `familyName`,
`preferredPublicName`, `organizationName` (required, showWhen
Organization), `email` (required), `country` (required, FieldSelect),
`rorId` (showWhen Organization, plain FieldText,
`submission.submit.contributor.rorId` "ROR ID" — no shape validation in
`author.json`, unlike `affiliation.json`'s `ror` regex — A4),
`url`, `orcid` (FieldOrcid, only when `OrcidManager::isEnabled()`),
`competingInterests` (required multilingual FieldRichTextarea, only when
context `requireAuthorCompetingInterests`), `biography`
(`author.bioStatement` "Bio Statement (e.g., department and rank)"),
`affiliations` (FieldAffiliations), `contributorRoles` (FieldOptions
checkboxes of the context's `ContributorRole` rows; collapses to a
hidden pre-set field when the context has exactly one role),
`creditRoles` (FieldCreditRoles), `includeInBrowse` (FieldOptions,
default true, `submission.submit.includeInBrowse.title` "Publication
Lists"). Server validation
(`PKP\author\Repository::validate()`): empty `contributorRoles` →
`api.submission.400.emptyContributorRoles` ("There have to be at least
one assigned contributor role."); competing interests →
`author.competingInterests.required` ("A competing interest statement
is required."). Neither of these two guards has an observed screen path:
live-probed 2026-08-28, the form's client-side required check refuses
first — no request is sent — with "This field is required." under the
field and "Please correct one error." / "Jump to next error" at the
foot (same shape for Country). A four-error empty save showed "Please
correct 4 errors." with the Save button disabled (live-probed
2026-08-28, OJS/OMP/OPS identically). The re-enable, from the suites'
runs of 2026-09-16 on all three apps: with Given Name filled and its
message gone, Save stayed disabled for a ten-second read while the
other three messages showed, and enabled once Email, Country and a role
were filled too; the shared form footer disables Save while the form
holds any field error (`FormFooter.vue`, `isLastPage &&
Object.keys(errors).length`). A server refusal of a request the form
did send does reach the screen (live-probed 2026-09-28, Fields preamble,
OJS/OMP/OPS, three runs): the add endpoint's 400 put each refused field
in the foot as "Go to {Field}: {message}" with "Please correct {n}
errors." and "Jump to next error", the page notice "The form was not
saved because {n} error(s) were encountered. Please correct these errors
and try again." showed, and Save stayed disabled; a refused field the
chosen type hides is never cleared (A20, fn f-a20). ORCID writes via
these endpoints are refused outright
(`api.orcid.403.cannotUpdateAuthorOrcid`) — the ORCID flows run through
their own endpoints (U04). Type switching:
`removeIrrelevantContributorTypeData()` nulls the other type's fields
at save time — except `rorId`, which it misses: a typed ROR ID survived
a cross-type save as Person and reappeared intact on switching the
radio back (live-probed 2026-08-28, "definitely-not-a-ror-id" on an OJS
submission and "omp-garbage-ror" on an OMP one — A4's cross-type half);
client-side a typed value survives the switch untouched (live-probed
2026-08-28), so the guidance's "will not be saved" is a save-time
discard with that one gap. Author records are keyed per publication
(`author.json` requires `publicationId`).

<a id="fn-d"></a>
**d — affiliations.** Model `PKP\affiliation\*` + `author_affiliations`
tables; `affiliation.json`: `ror` (regex
`#^https://ror\.org/0[^ILOU]{6}\d{2}$#`) XOR multilingual `name` —
`Repository::saveAffiliations()` nulls the manual name whenever a ROR is
set; validation strings `author.affiliationRorAndNameEmpty` ("Please
provide a ROR affiliation or at least one affiliation name.") and
`author.affiliationNamePrimaryLocaleMissing`. The first is an API-side
guard with no observed screen path (live-probed 2026-08-28: every
empty-name path from the form — primary box cleared, all boxes
cleared — returns the primary-locale message instead, since the Add
button never exists without a pick and both pick types carry a name).
No count limit exists anywhere (schema, validation, UI). UI `FieldAffiliations.vue` +
`FieldAffiliationsRorAutoSuggest.vue`: browser queries
`https://api.ror.org/v2/organizations` directly (fires from 4 typed
characters, 400 ms debounce); suggestion rows show `ror_display` name,
country, ROR icon and a registry link ("Open link in a new tab.");
`allowCustom: true` offers the typed text as the manual path (primary
locale name only, then per-locale boxes:
`user.affiliations.typeTranslationNameInLanguageLabel`,
`translationsSomeAvailable` "{$count} of {$total} languages completed";
the complete state has its own string, "All translations available" —
live-probed 2026-08-28, as was the Add button appearing only after a
pick).
Row actions: `user.affiliations.translationEditActionLabel` ("Edit
institution name" — absent on ROR-backed rows) /
`translationDeleteActionLabel` ("Remove institution") — both behind the
typed row's expander button, accessible name "Click to edit or delete"
(live-probed 2026-08-28); the search input is disabled while a picked
entry sits in "Selected" (same probe). Delete modal
`user.affiliations.deleteModal.title/message`. Registry-error modals:
`user.affiliations.error.rorApi*` — probed 2026-08-28 (OJS) with
SIMULATED registry answers (the browser's own registry queries were
answered 429 / 500 / 410 by the test harness; the screen's requests
were untouched): each renders once per errored search as a modal
"ROR API Error" with a single "OK" — 429 "Too many requests have been
sent to the ROR API. Please wait a moment before continuing to
search.", 5xx "The ROR API service is currently unavailable. Please
refresh the page or try again later.", 410 "The ROR API service in
this installation is deprecated. Please contact your system
administrator." After any of them the typed text becomes a pre-picked
typed entry and the query watcher stays blocked for the panel's life —
`hasError` is cleared only by a successful fetch, which nothing
in-panel can trigger (A11); a reopened panel searches normally. A registry pick POSTs
to the install's own `rors/` API — `PKPRorController::addOrEdit()`
returns the cached record without any registry call when one exists,
otherwise re-fetches `https://api.ror.org/v2/organizations/{id}`
server-side (10 s timeout; per-user 20/60 s and global 40/300 s rate
limits with their own 429 strings; failure → 404, basis of A5).
Display: `Affiliation::getAffiliationName()` prefers the cached registry
record's names, falling back to the stored manual name. User-profile
bridge: `Repository::migrateUserAffiliation()` copies the profile's
plain-text `affiliation` per locale into the contributor's `name` and
never sets `ror` (pkp/pkp-lib#13317, issue #13274; before it an exact
name match against the cached registry records produced a `ror` link and
no name, the issue's complaint), and fills the submission locale from
the user's default-locale value when the profile has none there. Driven
2026-09-12 on OJS at the PR head `3f82add062`, before its merge: with a
cached record planted under exactly the profile's text, the en and fr_CA
submissions' contributor rows carried the text as `name` (fr_CA under
both locales) and no `ror`, where the same steps at `b48c22ca06` stored
the `ror` and no name. A language change inside the wizard asks for the
copied name in the new language like any typed institution, by design:
[Submission wizard](U21-submission-wizard.md) A13. The profile/masthead field itself is `user.json`'s plain multilingual
`affiliation` string, separate machinery.

<a id="fn-e"></a>
**e — contributor roles.** Records: `contributor_roles` per context,
schema `contributorRole.json` (`contributorRoleIdentifier` in a
ten-value enum; multilingual `name`); seeded on context creation only —
`PKPContextService::add()` inserts AUTHOR/"Author" and
TRANSLATOR/"Translator" (`default.groups.name.author/translator`); a
press arrives with four (live-probed 2026-08-28: the form's checkbox
group and the Contributor Roles table both list "Author", "Translator",
"Chapter Author" (identifier AUTHOR), "Volume editor" (EDITOR) on a
seeded press — OMP-side seeding); the
auto-created submitting contributor gets the context's first
AUTHOR-identifier role (`Repository::newAuthorFromUser()`). Author↔role
link: `credit_contributor_roles` pivot (XOR with CRediT rows; cascade
delete). Manager UI `src/managers/ContributorRoleManager/*`, mounted
solely at `lib/pkp templates/management/workflow.tpl` (tab id
`contributorRoles`, Settings → Workflow → "Submission" tab, label
`manager.contributorRoles.title` "Contributor Roles") — same mount in
all three apps. Strings: `manager.contributorRoles.add` ("Add Role"),
`.edit` ("Edit Role"), `.name` ("Role Name"), `.identifier` ("Role
Identifier"), `.name.description` ("Fill name in all of the
languages."), `.saved` ("Contributor role saved"), `.delete.role`
("Delete Role"), `.alert.delete.confirmationTitle` / `.message.body`
(type-to-confirm; confirm button = `common.confirmDelete`, disabled
until the typed value equals the identifier), `.alert.deleted` ("Role
Deleted") + `.backToRoles`. On edit the identifier select collapses to
the role's own value; the API additionally discards identifier changes.
API `PKP\API\v1\contributorRoles\ContributorRoleController` (no app
subclass): Site Administrator + Manager only, settings-access policy;
delete-in-use → HTTP 406 `manager.contributorRoles.error.delete.inUse`;
last-AUTHOR-role delete → 406 `api.contributorRole.400.errorDeletingAuthorRole`
("Last AUTHOR role cannot be deleted."). Live-probed 2026-08-28 (screen
+ guards on an OJS scratch journal; screen placement on all three
apps): both refusals render as a modal "Error" dialog with "OK", and
with both applicable the in-use refusal fires first; the
type-to-confirm's confirm button carries `common.confirmDelete` — a
message string used as a button label (A12); a Section Editor (OPS:
Moderator) opening the settings URL directly lands on the
authorization-denied page, "The current role does not have access to
this operation."; a role-name save with the second language empty
returned 200 with a null stored name (A13). `GET identifiers` returns
the enum list the Add panel offers. The "Edit Role" window's language
boxes, live-probed 2026-09-29 (Fields "Role Name"; Rules 11, 12; OJS,
OMP and OPS, two full runs each plus a roles-only run; kept script
`shared/playwright/checks/U10/I29/i29.js`, phase `roles`): on a scratch
context with French under "UI" and "Forms", "Edit Role" on "Author"
showed the English box ("Author") and a "French" button beside the word
"English" at the top; the French box ("Role Name in French", empty) was
hidden until "French" was pressed; "1/2 languages completed" stood under
each box once both showed. On a scratch context with French under "UI" only, and on
`publicknowledge` (read by `manager.maya`, nothing saved), the window had
no language button and no French box. Saving "Auteur-e" as the French
name answered 200 with "Contributor role saved", and the box still read
"Auteur-e" after a reload. "Close" is the window's one control besides
"Save" (A22).

<a id="fn-f"></a>
**f — delete, order, silence.** Delete dialog: title + confirm
`grid.action.deleteContributor` ("Delete Contributor"), message
`grid.action.deleteContributor.confirmationMessage` ("Are you sure you
want to remove {$name} as a contributor? This action can not be
undone."). Server: `PKP\author\Repository::delete()` →
`DAO::delete()` nulls `publications.primary_contact_id` when it pointed
at the deleted author (no replacement — A2) and re-numbers the remaining
sequence. Ordering: `Orderer.vue` up/down (`common.orderUp/orderDown`
carry the row title — accessible, unlike the funder arrows); save PUTs
`contributors/saveOrder` (`Repo::author()->setAuthorsOrder()`, 0..n);
"Cancel" restores the pre-ordering snapshot client-side and re-fetches.
New contributors are meant to take `max(seq)+1` (`DAO::getNextSeq()`),
but the method treats a max sequence of 0 as "no contributors" (`if
($seq)` — falsy zero), `Repository::newAuthorFromUser()` leaves the
auto-created author's sequence at 0, and the authors collector orders
by sequence with no tiebreak — so on a never-reordered list the new
contributor tied at 0 (A15, retired 2026-09-03: `getNextSeq()` now tests
`$seq !== null` and the collector breaks sequence ties by `author_id`,
so a new contributor takes `seq` 1 after the auto-created author's 0);
an earlier append-at-end live-confirmation (2026-08-28, OJS) was a
coincidental draw on the then-tied rows. Delete dialog,
ordering mode with the verbatim arrow names,
cancel-restore and the immediate primary-contact move
live-confirmed 2026-08-28 (OJS); same date, the last delete emptied the
list through the standard dialog with no extra warning, leaving
"No items found." under the three header buttons and an empty Preview. Silence: no Mail/Notification/EventLog usage
anywhere in `classes/author/` or `classes/affiliation/` (grepped,
pinned checkouts) — the only email is U04's ORCID verification request.
Live-probed 2026-08-28 (OJS, per-action isolation): add, edit, delete
and reorder each left the activity-log count and the mailbox untouched,
while "Set Primary Contact" alone added exactly one history row,
"Submission metadata updated" — it rides the publication PUT (fn b),
which logs a metadata update without naming the actual change. The
journal's "Review Publishing Details" Confirm is a save on the same
publication and logs the same line (s3).

<a id="fn-g"></a>
**g — versioning.** `PKP\publication\Repository::version()` clones every
author onto the new publication (id nulled, `publicationId` re-keyed;
affiliations, contributor roles and CRediT roles re-persisted with the
clone; `seq` preserved) and re-points `primaryContactId` at the clone of
the old primary contact. OMP's override additionally re-links chapter
authors (*Chapters & work type*); OJS/OPS overrides touch no author code.
Live-confirmed 2026-08-28 (OJS): the new version's copy edits
independently and the "Primary Contact" badge rides onto the clone.

<a id="fn-h"></a>
**h — reader surfaces.** OJS `templates/frontend/objects/article_details.tpl`
(authors section: `getFullName()`, affiliations loop with
`getLocalizedName()` + ROR-icon link to `$affiliation->getRor()`,
`getLocalizedContributorRoleNames()`, ORCID icons, `creditRoles`;
biographies section `submission.authorBiographies` with
`submission.authorWithAffiliation` "{$name}, {$affiliation}"); OPS
`preprint_details.tpl` structurally identical; OMP
`templates/frontend/components/authors.tpl` (book page + chapter pages)
with the <5 / ≥5 branch (OMP1) and the edited-volume `$editors` swap
(OMP2). Listings: OJS `article_summary.tpl` and OPS
`preprint_summary.tpl` print `getAuthorString()` with NO
include-in-browse filter; OMP `monograph_summary.tpl` prints
`getAuthorString(true)` — the sole reader-side consumer of the tick
(A3); `authorsStringIncludeInBrowse` has no template consumer in any
app. No frontend template reads `primaryContactId` (no
corresponding-author marker). The author line's visibility toggle
(`hideAuthor`) is section configuration. Head metadata (Google Scholar
tags) comes from that plugin's feature, not here. Live-probed
2026-08-28: the landing credits held on all three apps (list order,
typed affiliation as plain text, role names, CRediT "{Role} ({Degree})",
biographies heading singular/plural with the comma dropped when there
is no affiliation, nothing marking the primary contact); the unticked
contributor appeared in OJS's issue TOC and search and OPS's archive
and search, was dropped from OMP's catalog listing, and was credited
on all three landing pages; all five listing surfaces printed the
"Full"-format author line. Anonymous credit live-probed 2026-08-28
(OJS, logged out, published scratch article): the landing page's
authors block listed "Anonymous" with role "Author" as a normal
entry — the word appearing exactly once on the page, with nothing
marking it as a placeholder — and the issue table of contents and the
search result line both printed "Alex Author (Author); Anonymous
(Author)". Role names by the reader's language (Rule 15a), live-probed
2026-09-29 on OJS, OMP and OPS (two full runs each plus a roles-only
run; kept script `shared/playwright/checks/U10/I29/i29.js`), signed out,
on scratch contexts with French under "UI" (with and without "Forms")
and on `publicknowledge`: the French article, book, chapter and preprint
pages printed "Author" beside the contributor, and the French issue
table of contents, catalog and archive lines "{name} (Author)"; once
"Auteur-e" was saved as the French name, the same French reads showed
"Auteur-e" and "{name} (Auteur-e)" and the English pages still
"Author". The authors heading ("Authors", "Auteurs-es") is visible to
screen readers only. Mechanism: `Author::getLocalizedContributorRoleNames()`
takes each role's `getLocalizedData('name')`, whose locale precedence
(`LocalizedData::getBestLocalizedData()`) passes over an empty
visitor-locale value to the next locale holding one, on a
one-language role its primary-locale name.

<a id="fn-i"></a>
**i — the wizard mount.** `PKPSubmissionHandler::getSteps()` pushes the
Contributors step unconditionally (`SECTION_TYPE_CONTRIBUTORS`;
`getContributorsStep()`); the panel is built with `canEditPublication:
true` hard-coded — always editable inside the wizard. Review step
`review-contributors.tpl`: per-author name + "Primary Contact" badge +
role badges; empty-list warning `submission.wizard.noContributors` ("No
contributors have been added for this submission."). Live-confirmed
2026-08-28 (OJS + OPS): the step is fully editable, the submitting
author can delete themselves down to an empty list, and the Review step
then shows the warning verbatim. OMP's handler
carries a functionally identical override of the panel builder; OJS/OPS
none. Step order, gates and the auto-created contributor: U21's
territory (its Rule 5 and probes).

<a id="fn-j"></a>
**j — competing interests.** Context setting
`requireAuthorCompetingInterests` (`context.json`), checkbox in
`PKPMetadataSettingsForm` — `manager.setup.competingInterests`
("Competing Interests") /
`manager.setup.competingInterests.requireAuthors` ("Require submitting
Authors to file a Competing Interest (CI) statement with their
submission.") — rendered on Settings → Workflow → Metadata in all three
apps (no app touches the field). Author-side enforcement:
`PKP\author\Repository::validate()` requires the primary-locale
`competingInterests` when the setting is on
(`author.competingInterests.required` — API-side; from the form the
client-side required check refuses first, see fn c). Form field:
required multilingual `FieldRichTextarea` (`author.competingInterests`
+ `.description`; on OPS the label key is overridden app-side — OPS2,
f-ops2). Live-probed 2026-08-28 (OJS + OMP scratch contexts):
setting placement, field position and required marker as described; a
saved statement survived the setting's untick/re-tick round trip, the
field simply vanishing while the setting was off.

<a id="fn-k"></a>
**k — the registry cache.** Table `rors` + `ror_settings`
(`ror.json`: "this table is a cache of the data dump"). Scheduled task
`PKP\task\UpdateRorRegistryDataset`: downloads the ROR data dump (via
its Zenodo record), verifies the checksum, upserts every record's names
and display locale, never deletes records absent from a new dump;
registered monthly (`PKPScheduler`, `withoutOverlapping`) and run once
at install/upgrade; failures land in the scheduled-task log
("Update ROR registry dataset cache"), invisible on screen. No config
or context setting gates any of it; no app subclasses any ROR class
(empty chains). The install's `rors/` API (Manager, Sub-editor,
Assistant, Author; POST-only in practice — the two GET routes have no
caller in any app's UI at the pinned commits).

<a id="fn-l"></a>
**l — anonymized review.** `PKP\publication\maps\Schema::mapByProperties()`
empties `authors` and the three author strings when mapping for
author-anonymous review contexts; `getContributors` answers the shielded
reviewer with an empty list and `getContributor` refuses. Same
at-the-source withholding as the funders list
(*[Funding](U43-funding.md)*'s probe-confirmed twin); reviewer-screen
presentation is the review features' territory. Live-probed 2026-08-28
(OJS): the author-anonymous reviewer's captured browser traffic carried
an empty contributor list and empty author strings, and no step of the
review wizard named an author; an open-review assignment (control)
carried the full list, with an Authors row in the reviewer's
submission-details view.

<a id="fn-m"></a>
**m — the legacy contributor grid (unreachable).** The pre-3.4
grid (`PKP\controllers\grid\users\author\AuthorGridHandler`, marked
deprecated, with `authorForm.tpl`'s user-group radios,
principal-contact/include-in-browse checkboxes and checkmark cell
templates) has NO mount site in any of the three apps at the pinned
commits — grepped every template, page, class and plugin; only the
class files and autoloader entries exist. OPS lacks the app-side form
subclass the handler instantiates, so its add/edit ops would fail
outright there. Treated as dead code: no screen reaches it, so it is
recorded here and excluded from rules, scenarios and probes. Deleted
upstream 2026-09-14 (pkp-lib `648fee2e04`, issue pkp/pkp-lib#12827, with
the app-side `AuthorForm.php` subclasses in ojs `4632d9cae0` and omp
`fda2070ab`; the QuickSubmit plugin was its last user), so from the
2026-09-15 sync the class files are gone too.

<a id="fn-n"></a>
**n — pin note.** OJS's pkp-lib pin (`87999c45`) carries one commit
OMP/OPS's pin (`a9767b7f`) lacks — "Restore type-aware empty value
fallback for form field configs", touching the shared form-field config
layer including `FieldAffiliations.php` and `FieldCreditRoles.php`
(checked 2026-08-28). Every contributor-form file compared
(`ContributorForm.php`, panel, templates) is byte-identical across the
pins; behavior differences, if any, would sit in form-field default
handling — the probes run on all three apps regardless.

<a id="fn-s1"></a>
**s1 — scenario 1 seeding.** One scratch submission (any stage before
publication) in the seeded journal, submitted by an author account so
the auto-created contributor exists; Journal Manager account. The
organization contributor exercises the type switch and A4's ROR ID box
if desired. The empty Person save's four errors are Given Name, Email,
Country and Contributor Roles (fn c). Mail is read in the mail catcher
(Mailpit, `http://127.0.0.1:8025`), scoped by the submitter's address,
so the submitter is a throwaway account (created on a scratch context,
the only place users are created, and submitting to the seeded journal,
as U40's scenario 1 does); the absence is read against a positive
control the test itself sends the same way (scenarios.md "Mailpit").
The log is the submission's Activity Log & Notes → History.

<a id="fn-s2"></a>
**s2 — scenario 2 seeding.** The scenario-1 submission with two PERSON
contributors with distinct family names. "et al." from
`submission.shortAuthor`; the format strings refresh because Preview
re-fetches the publication. The suites still open with a Save-Order pin
(submitter first), a workaround from when A15 made "Abbreviated" and the
row order nondeterministic; since A15's retirement (2026-09-03) it is
belt-and-braces, not load-bearing. The version copy: the typed
affiliation is added through the contributor form before the copy (no
seed key exists for contributors or affiliations, scenarios.md "Field
shapes not built yet"); "Create New Version" is the Publication area's
side-menu item (*Publish, schedule & versions*).

<a id="fn-s3"></a>
**s3 — scenario 3 seeding.** Same submission; the submitting author's
contributor is the seeded primary contact (created at submission). The
log read is Activity Log & Notes → History; the mailbox read and its
positive control as in s1. Suite runs of 2026-09-16: on OJS the
"Review Publishing Details" Confirm added a second "Submission metadata
updated" row by the Journal Manager (the run's count read 2 where the
move had left 1, and the deletes before and after added none), so the
journal's closing read is two rows; on OMP the header's "Publish"
opened the "Schedule For Publication" window at once, its text "All
publication requirements have been met. Are you sure you want to make
this catalog entry public?" with a "Publish" button and the header's
"Close", and the closing read stayed at the move's one row; the OPS
suite leaves the publish step to *Publish, schedule & versions*.

<a id="fn-s4"></a>
**s4 — scenario 4 seeding.** The multilingual leg needs a scratch
journal with a second submission language. The registry leg needs
internet browser-side (suggestions come live from the public registry)
AND server-side (the record cache) — the campaign's test installs block
server-side egress, so there the registry leg deterministically shows
A5's shape and suites cover the typed-name path plus that shape. The
empty-name refusal: clear the submission language's "Type the
institution name in {language}" box under "Edit institution name"
before Save (fn d).

<a id="fn-s5"></a>
**s5 — scenario 5 seeding.** Scratch journal (roles are mutated); one
scratch submission with a contributor to hold the new role for the
in-use refusal. The "Edit Role" read opens "Edit" behind the new row's
"…" menu and reads the Role Identifier drop-down (fn e: the select
collapses to the role's own value).

<a id="fn-s6"></a>
**s6 — scenario 6 seeding.** One published scratch submission per app
with the contributor set described; on OMP the listing is the catalog
list, on OPS the archive. The suites still run "Order" → "Save Order"
once before publishing, an A15-era workaround that is no longer needed
since its retirement (2026-09-03). The
≥5-contributor OMP leg needs a second
scratch monograph with five contributors. The CRediT role and its
degree are picked on the contributor form ("CRediT roles and the
degrees of contribution"); no seed key exists for contributors, CRediT
roles or the primary contact beyond the submitter's own record, so the
set is built through the panel.

<a id="fn-s7"></a>
**s7 — scenario 7 seeding.** The scenario-6 publications; re-publish or
edit as needed after the untick. The cross-app assertion pair is the
point: OMP omits, OJS/OPS show (A3). The "Abbreviated" read re-ticks
the second contributor and unticks the first through the same form,
then reads Preview.

<a id="fn-s8"></a>
**s8 — scenario 8 seeding.** Scratch journal (the setting is mutated);
any submission with a contributor. The re-tick is made on the same
Metadata screen; no context passthrough exists for the setting
(scenarios.md "Configuring a scratch context").

<a id="fn-s9"></a>
**s9 — scenario 9 seeding.** Seeded journal. The Author is the roster
author who submitted the scratch submission (`submitter`); the second
contributor is added through the panel by the Journal Manager (ready
account), who is also the control; the OJS-A and OMP-A tests already
drive this leg. The wizard leg is a second submission of the same Author
with `submitted: false` (scenarios.md: a wizard-resumable draft, listed
under the author's Incomplete list). The preprint-server leg is the same
seed on the seeded preprint server with `published: false` (the OPS1
test; fn b, f-ops1).

<a id="fn-s10"></a>
**s10 — scenario 10 seeding.** Seeded press; `POST scenarios/submission`
with `workType: editedVolume` and `published: true` (scenarios.md
"OMP:"); the second contributor and its "Volume editor" role are set
through the panel (tick "Volume editor", untick "Author") before the
publish, no seed key existing for contributors. The book page is the
catalog's book page, the listing the catalog list. The OMP2 test already
drives it (f-omp2: "Vera Editorova (ed)" with role "Volume editor").

<a id="fn-s11"></a>
**s11 — scenario 11 seeding.** Two scratch journals from `POST
scenarios/context`, each with throwaway accounts (a manager, an author
as `submitter`, an `externalReviewer`): one at the install defaults
("Default Review Mode" "Anonymous Reviewer/Anonymous Author", seed-facts
"Settings › Workflow › Review"), one with `review.defaultReviewMode:
open`; each with one submission seeded `decisions:
['sendExternalReview']` and `reviewRounds: [{reviewers: [{username,
status: 'accepted'}]}]` (OMP: the external round), the builder stamping
the assignment's review type from the context's default (seed-facts,
2026-09-05). The read is the page's own traffic, the contributors
request the reviewer's submission page makes, captured in the browser's
network view or by the suite's response listener; fn l holds the probed
shape (empty contributor list and empty author strings on the anonymous
assignment; the full list, with an Authors row in the reviewer's
submission-details view, on the open one). OPS answers 400 on `review`
and `reviewRounds` (scenarios.md "OPS:"), so the suite there carries
nothing for this scenario.

<a id="fn-f-a1"></a>
**f-a1 — A1 evidence.** `ContributorsListPanel.vue` binds the row
subtitle to `localize(item.affiliation)` and
`SubmissionWizardPage.vue::getAuthorName()` appends `author.affiliation`
— but `author.json` carries only the `affiliations` array (no singular
`affiliation` prop), and the ui-library `localize()` of a missing value
returns the empty string. Verified schema + map + helper at the pinned
commits. Live-confirmed 2026-08-28: the empty reserved line sits in the
DOM on OJS, OMP and OPS, workflow list and wizard Review list alike; a
contributor whose Edit panel held a saved affiliation (one migrated
from the submitter's profile) still showed no affiliation text on
either surface. The OMP reader-side symptom, same date: on a
five-contributor book page the one contributor with a (typed, saved)
affiliation rendered as "Ben Beta, ;" in the compacted line —
`submission.authorWithAffiliation` with an empty affiliation value;
the exact template-side mechanism is unverified, but the shape matches
this entry's dead-field read.

<a id="fn-f-a2"></a>
**f-a2 — A2 evidence.** `PKP\author\DAO::delete()` sets
`publications.primary_contact_id = null` where it referenced the deleted
author, before deleting; no repository or UI code path reassigns or
warns (grepped panel + repositories, pinned checkouts). Live-probed
2026-08-28 (OJS): after deleting the primary contact no row carried the
badge, no warning or toast appeared, the DB column read NULL — and the
publish flow ("Review Publishing Details" through the final "All
publication requirements have been met." dialog) passed with no mention
of the missing contact. Backed out with the final dialog's "Close" —
its buttons are Close/Publish only, no Cancel — and the earlier
"Review Publishing Details" Confirm had already set the publication's
status to READY_TO_PUBLISH with `date_published` still null (probed
2026-08-28, OJS), so the workflow's status label changes despite
nothing being published.

<a id="fn-f-a3"></a>
**f-a3 — A3 evidence.** `includeInBrowse` filtering exists in exactly
two places: `PKPPublication::getAuthorString(true)` and the mapped
`authorsStringIncludeInBrowse` payload prop. Template survey (pinned
checkouts): OMP `monograph_summary.tpl` calls `getAuthorString(true)`;
OJS `article_summary.tpl` and OPS `preprint_summary.tpl` call
`getAuthorString()` unfiltered; landing pages loop the full author set;
`authorsStringIncludeInBrowse` has no `.tpl` consumer anywhere.
Live-probed 2026-08-28 cross-app: the unticked contributor showed in
OJS's issue TOC and search and OPS's archive and search, was dropped
from OMP's catalog listing, and was credited on every landing page
(see fn h).

<a id="fn-f-a4"></a>
**f-a4 — A4 evidence.** `author.json` `rorId`: `[nullable]` only — no
regex, no registry check; `ContributorForm` renders it as a plain
`FieldText` for ORGANIZATION. Contrast `affiliation.json` `ror`
(full-URL regex) and the Funder field's registry pick. Live-probed
2026-08-28 (OJS): a nonsense value saved with no message (200),
reappeared only in the Edit panel's own box, and the published article
page's HTML carried no trace of it. Cross-type persistence (2026-08-28,
OJS "definitely-not-a-ror-id" + OMP "omp-garbage-ror"):
`removeIrrelevantContributorTypeData()` clears the other type's name
fields but not `rorId`, so a ROR ID typed under "Organization or group"
survived a save as Person and reappeared on switching the radio back.

<a id="fn-f-a5"></a>
**f-a5 — A5 evidence.** Mechanism chain: the pick POSTs to the local
registry cache; `PKPRorController::addOrEdit()` re-fetches from
`api.ror.org` server-side when the record is not yet cached and answers
404 on failure; `saveAffiliations()` nulls the manual name whenever a
ROR is set; display resolves via the cached record
(`Affiliation::getAffiliationName()`), so no cache row → no name. The
identical server-side chain holds for funders
(*[Funding](U43-funding.md)*, its register's registry-failure finding).
Live-probed 2026-08-28 end-to-end on OJS and OPS (egress-blocked
installs; strings byte-identical): pick → selected chip with registry
URL and ROR mark → "Add" → the install's cache POST fails → "Error"
dialog, entry added regardless, saved with an empty
name and the registry id kept; the reopened row showed the red "The
primary language English is required" with only "Remove institution",
a later save with the nameless row present succeeded, and the
published article/preprint page rendered the affiliation as an
icon-only registry link.

<a id="fn-f-a6"></a>
**f-a6 — A6 evidence.** The badge and "Set Primary Contact" render in
the same per-row actions area (`ContributorsListPanel.vue` `#item-actions`
slot) that read-only viewing removes wholesale (fn b). Live-probed
2026-08-28: an OJS and an OMP author's read-only workflow list showed
names and role badges only — no "Primary Contact" badge on any row.

<a id="fn-f-a7"></a>
**f-a7 — A7 evidence.** Live-probed 2026-08-28 (OJS scratch journal;
shared form): the 400 refusal "Please provide affiliation name in the
submission primary locale." rendered correctly inline under the field
while the foot's error-summary item printed the literal "Go to
Affiliations: [object Object]" — sibling fields print their message
text (e.g. "Go to Country: This field is required.").

<a id="fn-f-a8"></a>
**f-a8 — A8 evidence.** Live-probed 2026-08-28 (OJS; shared field):
with an institution name typed in the search box and nothing picked,
the contributor save returned 200 and both the response and a reload
showed an empty affiliations list — no message anywhere.

<a id="fn-f-a9"></a>
**f-a9 — A9 evidence.** Live-probed 2026-08-28 (OJS + OPS landing
pages, registry-backed affiliation): the ROR mark is an `<a>` holding
only the logo image, with no text, title or ARIA name — an accessibility
scan reads the link out as nothing. OMP's book page renders its own
ROR-mark markup and was not checked (its ≥5-contributor compaction
drops the marks entirely, OMP1).

<a id="fn-f-a10"></a>
**f-a10 — A10 evidence.** Live-probed 2026-08-28 (OJS; shared
ui-library field): in the typed-entry editor the EN box's accessible
name concatenates both languages' labels ("Type the institution name
in English Type the institution name in French (Canada)") and the FR
box has no accessible name — the same shared-component defect the
Funding list's typed-name boxes show.

<a id="fn-f-a11"></a>
**f-a11 — A11 evidence.** Probed 2026-08-28 (OJS) with SIMULATED
registry answers (fn d — route-fulfilled 429/500/410 on the browser's
own registry queries): after each dialog's "OK" the typed text sat as
a selected typed-entry chip with the search input disabled; removing
the chip re-enabled typing, but a fresh query with the registry healthy
again fired zero registry requests and offered only the literal typed
text, for all three statuses; a freshly reopened Edit panel searched
normally. Mechanism: `FieldAffiliationsRorAutoSuggest.vue`'s `hasError`
blocks the query watcher and only a successful fetch clears it — the
dialog's "OK" merely closes.

<a id="fn-f-a12"></a>
**f-a12 — A12 evidence.** Live-probed 2026-08-28 (OJS; shared UI): the
dialog's two buttons read "Are you sure you wish to delete this item?
This action cannot be undone." (the confirm — locale key
`common.confirmDelete`, a message string wired in as the label) and
"Cancel".

<a id="fn-f-a13"></a>
**f-a13 — A13 evidence.** Live-probed 2026-08-28 (OJS scratch journal,
en + fr_CA; shared API): "Add Role" with the French name box empty
returned 200 with `fr_CA: null` stored and the "Contributor role
saved" toast; no validation message anywhere.

<a id="fn-f-a14"></a>
**f-a14 — A14 evidence.** Live-probed 2026-08-28 (OJS scratch journal
reduced to the single "Author" role; shared code): the Add Contributor
save POST returned HTTP 500 — "`PKP\author\Author::getContributorRoles():
Return value must be of type array, string returned`" (the one-role
collapse pre-sets the hidden field as a string where the model demands
an array) — with the generic reload toast and the panel left open;
reproduced three times, each attempt inserting an `authors` row with
no `credit_contributor_roles` link, listed after reload with no role
badge. Deleting the role-less rows worked normally.

<a id="fn-f-a15"></a>
**f-a15 — A15 evidence.** Mechanism: `PKP\author\DAO::getNextSeq()`
computes the next sequence with `if ($seq)` — a max sequence of 0 (the
auto-created author's, left there by `Repository::newAuthorFromUser()`)
reads as "no contributors", so the new row also gets sequence 0; the
authors collector orders by sequence with no tiebreak. Live-probed
2026-08-28 (OJS + OMP, and reproduced independently by both apps' test
authoring the same day): after adding a second contributor both rows
held sequence 0 in the database; the new row rendered FIRST on two
publications and LAST on a third; on one publication the workflow panel
listed "Alex, Beta" while the landing page and issue table of contents
printed "Beta; Alex", and ordering mode opened in the reader pages'
order. "Save Order" stamped 0..n and every surface agreed from then on.
Shared `lib/pkp` DAO with no app override — OPS runs the same code.
Retired 2026-09-03: fixed upstream by pkp-lib `922f895988` ("pkp/pkp-lib#13003
Fix author insertion order glitch"): `classes/author/DAO.php`
`getNextSeq()` now tests `if ($seq !== null)`, so a new author after the
seq-0 auto-created author gets seq 1 instead of tying at 0, and
`classes/author/Collector.php` ORDERBY_SEQUENCE breaks ties by
`author_id`. The commit sits in all three apps' `lib/pkp` as of
2026-09-03 (OJS `762415103f`, OMP `a1aefa3fe`, OPS `6bda92fb03`).
Verified live 2026-09-03 on OJS and OMP (env 0, fresh reset,
`editor.diana` on `publicknowledge`, one unpublished and one published
submission per app): after adding a contributor through the panel's
"Add Contributor" form, the panel showed the auto-created author first
and the new contributor second immediately after the save and on three
reloads; all three Preview formats, ordering mode, the landing/book page
(two loads) and the issue table of contents / catalog line agreed; the
panel's own API responses carried `seq=0` for the auto-created author
and `seq=1` for the new one on every publication. Not re-probed on OPS
(shared pkp-lib mechanism) nor with three or more contributors.

<a id="fn-f-a16"></a>
**f-a16 — A16 evidence.** `Repository::newAuthorFromUser()` copies the
profile's country verbatim; self-registration requires a country
(`RegistrationForm`), but the administrator's Add User form
(`UserDetailsForm`) has no country requirement (code-checked
2026-08-28) — an admin-created author account yields a countryless
contributor, and the submission wizard never forces the author to open
their own record, so the gap survives into the workflow. Live-observed
2026-08-28 (OMP + OPS, plus OJS scenario walks on seeded data): editing
such a contributor was refused with the Country requirement until a
country was picked. The campaign's seeded test accounts carry no
country, so test installs hit this on every seeded submission — the
observed frequency is fixture-inflated, but the administrator-created
path is real product surface.

<a id="fn-f-a17"></a>
**f-a17 — A17 evidence.** Observed 2026-08-28 (OJS, one journal, fresh
typed entries): "All translations available" on one submission, "1 of 2
languages completed" on another, same journal languages. The form's
locale list is driven by the publication's languages
(`getPublicationLanguages()`), which would explain the difference;
unsettled pending the two-publication comparison the entry names.

<a id="fn-f-a18"></a>
**f-a18 — A18 evidence.** Live-probed 2026-08-28 (OJS; shared form):
Save on an all-empty Anonymous form was refused client-side with a
single error — "Please correct one error. Go to Contributor Roles:
This field is required. Jump to next error" — Email and Country
unflagged despite their "* Required" markers, no request sent; with
only a role ticked, the save posted and returned 200, the stored
record carrying `"email":null,"country":null` and
`fullName: "Anonymous"`. The throwaway record deleted normally through
the row's Delete dialog.

<a id="fn-f-a19"></a>
**f-a19 — A19 evidence.** Seen 2026-09-16 on two OMP installs at the
same tip. CI's fresh box (pkp-e2e `main` run 35080349964, job "omp /
e2e (omp)"): scenario 1's test, then asserting the literal "Email
address", went red twice at the "Go to Email address:" read; the run's
aria snapshot shows the textbox "Email * Required" and the summary's
"Go to Email: This is not a valid email address." (`.reports/U41/
ci-omp-artifacts/…/error-context.md`, lines 57–60 and 372–378). The
VM's green runs of the same tip (`.reports/U41/test-omp-green.log`,
`final-run-omp.log`) passed that literal assertion, so its form read
"Email address" and "Go to Email address: …". Mechanism: pkp-lib
defines the locale key `user.email` twice — `locale/en/common.po` line
2029 "Email address" and `locale/en/user.po` line 168 "Email" — and
`classes/components/forms/publication/ContributorForm.php` line 112
labels the field `__('user.email')`, so whichever file the install
loads last supplies the string. The duplicate dates from the .po merge
of 2023-02-16 (pkp-lib `4ad3d52ba2`, pkp/pkp-lib#8598). Not read on
OJS or OPS. The test now reads the label as `/Email( address)?/`
(`.reports/U41/test-omp-fix-green.log`).

<a id="fn-f-a20"></a>
**f-a20 — A20 evidence.** Live-probed 2026-09-28 (Fields preamble;
Settings that modify behavior; A20), three runs on each of OJS, OMP
and OPS, on a scratch context with `supportedFormLocales` [en, fr_CA]
and `supportedSubmissionLocales` / `supportedSubmissionMetadataLocales`
[en] (the contributor form showed no language button). As the Journal
Manager, as the assigned Section Editor / Series editor / Moderator,
and on OPS as the submitting author on their own preprint's workflow
list: "Add Contributor" › Save posted `POST
…/submissions/{id}/publications/{id}/contributors` and got 400, Person
`{"organizationName":{"fr_CA":["This language is not accepted."]}}`,
Organization the same for `givenName`, `familyName`,
`preferredPublicName`, Anonymous for those three plus `biography` and
`organizationName`. The request carried English values only. Read 1.5 s
and 10 s after the press: panel open, foot and notice as quoted, Save
disabled, "Saving" never shown. From runs 2 and 3: "Jump to next error"
and the first "Go to …" left the focus on the foot's "Jump to next
error" button; typing into Given Name, Organization Name or (Anonymous)
Email and leaving it cleared nothing; "Close" closed the panel with no
confirmation, and the list was unchanged on the page and after a
reload. No response of 500 or more and no page error; the console
logged only the 400. Mechanism:
`PKPSubmissionController::removeIrrelevantContributorTypeData()` sets
every unselected type's multilingual field that the request omits to
null in each of the context's form locales
(`getSupportedFormLocales()`);
`PKP\author\Repository::validate()` then applies
`ValidatorFactory::allowedLocales()` with the submission's
`getPublicationLanguages()` over the context's
`getSupportedSubmissionMetadataLocales()`, which refuses `fr_CA`. The
wizard's step and a row's "Edit" post every field under `[en]`, empty
ones included, so the nulling adds no `fr_CA` key: on the same context
the author's wizard add and an "Edit" save (Country picked first, A16)
answered 200 and listed the row after a reload. Control: a second
context with `fr_CA` also a submission (hence metadata) language saved a
Person and an Organization, listed after a reload. A language ticked
under "Metadata" alone is accepted by that code; not driven. Introduced
by pkp-lib `52d3a0f8e7` (2025-11-11, "Contributor Roles and Type").

<a id="fn-f-a21"></a>
**f-a21 — A21 evidence.** Live-probed 2026-09-29 (OJS, OMP, OPS; two
full runs each plus a roles-only run; kept script
`shared/playwright/checks/U10/I29/i29.js`): on scratch contexts with
French under "UI" and "Forms", every role's "Edit Role" window held an
empty French box with "1/2 languages completed" ("Author" and
"Translator"; on a press also "Chapter Author" and "Volume editor"); on
scratch contexts with French under "UI" only, and on `publicknowledge`,
the window had no French box; every French reader page read "Author"
(fn h). Code reading: `PKPContextService::add()` names the default roles
in the context's form locales at creation (`getSupportedFormLocales()`),
which on a new context is the primary locale alone (the Hosted Journals
window sets no form languages; not driven); nothing names them again
when a form language is added. lib/pkp `locale/fr_CA/default.po` has
`default.groups.name.author` "Auteur-e" and `.translator`
"Traducteur-trice"; OMP `locale/fr_CA/default.po` has `.chapterAuthor`
"Auteur du chapitre".

<a id="fn-f-a22"></a>
**f-a22 — A22 evidence.** Live-probed 2026-09-29 (OJS and OPS three
runs; OMP three for the reopen, two for the reload; kept script `shared/playwright/checks/U10/I29/i29.js`,
phase `roles`): "Edit Role" on "Author", "French" pressed, "Auteur-e"
typed, "Close" pressed: the window closed, no browser dialog, the list
unchanged; reopened at once, the French box read "Auteur-e" and both
counts "2/2 languages completed"; after a reload and a reopen the French
box was empty and the count "1/2 languages completed". No request of
500 or more and no page error.

<a id="fn-f-a23"></a>
**f-a23 — A23 evidence.** Live-probed 2026-09-29 (OJS, two runs,
signed out): a `publicknowledge` article whose first contributor holds
the CRediT role "Conceptualization" at "Lead" read "Conceptualisation
(##submission.submit.creditRoles.degrees.lead##)" at `fr_CA` and
"Conceptualization (Lead)" at `en`. Code reading: lib/pkp
`locale/en/submission.po` defines
`submission.submit.creditRoles.degrees.lead` / `.equal` /
`.supporting` ("Lead", "Equal", "Supporting"); lib/pkp
`locale/fr_CA/` has none of the three, in all three apps' checkouts.
Not read on a press or a preprint server: no French item read there
carried a CRediT role.

<a id="fn-f-omp1"></a>
**f-omp1 — OMP1 evidence.** OMP
`templates/frontend/components/authors.tpl`: `count($authors) < 5`
renders the full blocks (ROR icon, ORCID, roles, CRediT); the else
branch renders `submission.authorWithAffiliation` entries. Live-probed
2026-08-28 (five-contributor scratch monograph): one flowed line,
"Alicia Alpha; Ben Beta, ; Carl Gamma; Dana Delta; Erik Epsilon" —
semicolon-joined names, the dangling comma on the one contributor with
an affiliation (A1's footnote).

<a id="fn-f-omp2"></a>
**f-omp2 — OMP2 evidence.** OMP `monograph_full.tpl` passes `$editors`
(with `submission.editorName` labels — the "(ed)" suffix) to
`authors.tpl` for Edited Volumes; chapter pages pass `$chapterAuthors`.
Live-probed 2026-08-28 (scratch Edited Volume): the book page credited
only "Vera Editorova (ed)" with role "Volume editor" while the catalog
listing line kept the full contributor list. Work types and chapters
belong to *Chapters & work type*; recorded here because the reader-facing
contributor block is this spec's surface.

<a id="fn-f-ops1"></a>
**f-ops1 — OPS1 evidence.** The panel's `canEdit` is
`permissions.canEditPublication` in both workflow configs on every app;
that permission evaluates true for the OPS submitting author before
posting — the Funding list shows the same divergence (same gate, same
page, *[Funding](U43-funding.md)* OPS1). Live-confirmed for
Contributors 2026-08-28: the OPS submitting author's workflow list
carries the full controls on their unposted preprint, while the OJS
and OMP author lists are read-only.

<a id="fn-f-ops2"></a>
**f-ops2 — OPS2 evidence.** Observed 2026-08-28 (OPS test authoring):
the field's label renders as the literal text `Competing interests <a
target="_new" class="action" href="{$competingInterestGuidelinesUrl}">CI
Policy</a>`. Mechanism: OPS's app-level `locale/en/author.po` overrides
lib/pkp's `author.competingInterests` key with a legacy pre-Vue string
carrying markup and a template placeholder, and the Vue form renders
field labels as plain text. OJS and OMP take lib/pkp's plain "Competing
Interests" (live-probed 2026-08-28, fn j).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Contributors list (workflow) | workflow screen → Publication → "Contributors" | AFFW-396 · AFFW-532 · VUE-033 |
| "Order" / "Save Order" button | above the contributors list | AFFW-146 |
| Cancel ordering | above the contributors list (ordering mode) | AFFW-147 |
| "Preview" button | above the contributors list | AFFW-148 |
| "Add Contributor" button | above the contributors list | AFFW-149 |
| Row move up / move down (ordering mode) | contributor rows | AFFW-150 |
| Row "Set Primary Contact" / badge | contributor rows | AFFW-151 |
| Row "Edit" | contributor rows | AFFW-152 |
| Row "Delete" (+ confirmation) | contributor rows | AFFW-153 |
| Panel API plumbing (add/edit/delete/order/primary contact) | — | AFFW-154 |
| Add/Edit Contributor side panel | side panel | AFFW-155 · VUE-093 |
| "List of Contributors" preview | modal | AFFW-156 · VUE-094 |
| Contributors step panel (wizard) | submission wizard, Contributors step | rider on the wizard shell (owned by *[Submission wizard](U21-submission-wizard.md)*) |
| Contributor Roles screen | Settings → Workflow → Submission → "Contributor Roles" | AFFM-061 (Add Role) · AFFM-062 (row Edit) · AFFM-063 (row Delete) · VUE-034 · VUE-056 |
| Contributor roles API | `contributorRoles` (list, get, identifiers, add, edit, delete) | API-014 |
| Contributors API cluster | `submissions/{id}/publications/{id}/contributors` (list, get, add, edit, delete, saveOrder) | rider on the submissions API (owned by *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*) |
| ROR registry lookup API | `rors` (get, list, add-or-edit cache) — the two read routes have no UI caller | API-033 |
| ROR registry cache refresh | scheduled task, monthly + at install | JOB-057 |
| Author record shape | — | SET-003 |
| Affiliation record shape | — | SET-001 |
| Contributor-role record shape | — | SET-007 |
| Registry-record (ROR) shape | — | SET-022 |
| Legacy contributor grid + form (pre-3.4) | UNREACHABLE — no mount site in any app at the pinned commits <sup>m</sup> | GRID-051 · AFFW-681 · AFFW-682 · AFFW-683 · AFFW-684 · AFFW-685 · AFFW-686 |

## Reference — code anchors

- `lib/pkp/classes/author/` — `Author.php`, `Repository.php` (validate,
  newAuthorFromUser, setAuthorsOrder, changePublicationLocale),
  `DAO.php` (primary-contact nulling, seq), `maps/Schema.php`;
  `lib/pkp/schemas/author.json`.
- `lib/pkp/classes/author/contributorRole/` (+
  `creditContributorRole/`, `creditRole/`) — role records, identifier
  enum, pivot; `lib/pkp/schemas/contributorRole.json`;
  `lib/pkp/api/v1/contributorRoles/ContributorRoleController.php`.
- `lib/pkp/classes/affiliation/` — `Affiliation.php` (name resolution),
  `Repository.php` (validate, saveAffiliations,
  migrateUserAffiliation); `lib/pkp/schemas/affiliation.json`.
- `lib/pkp/api/v1/submissions/PKPSubmissionController.php` — the
  contributor endpoint cluster; `lib/pkp/classes/components/listPanels/
  ContributorsListPanel.php` + `lib/pkp/classes/components/forms/
  publication/ContributorForm.php`.
- `lib/ui-library/src/components/ListPanel/contributors/*` (panel, edit
  + preview modals), `src/managers/ContributorManager/*`,
  `src/managers/ContributorRoleManager/*`,
  `src/components/Form/fields/FieldAffiliations.vue` /
  `FieldAffiliationsRorAutoSuggest.vue` (same commit in all three apps).
- `lib/pkp/api/v1/rors/PKPRorController.php`, `lib/pkp/classes/ror/`,
  `lib/pkp/classes/task/UpdateRorRegistryDataset.php`,
  `lib/pkp/schemas/ror.json`.
- `lib/pkp/pages/submission/PKPSubmissionHandler.php`
  (`getContributorsStep()`, `getContributorsListPanel()`) +
  `lib/pkp/templates/submission/wizard.tpl` / `review-contributors.tpl`.
- Reader templates: `templates/frontend/objects/article_details.tpl` +
  `article_summary.tpl` (OJS), `templates/frontend/components/authors.tpl` +
  `objects/monograph_full.tpl` / `monograph_summary.tpl` (OMP),
  `objects/preprint_details.tpl` / `preprint_summary.tpl` (OPS).
- Legacy (unreachable, deleted upstream 2026-09-14, footnote m):
  `lib/pkp/controllers/grid/users/author/AuthorGridHandler.php` +
  `form/PKPAuthorForm.php` + `templates/controllers/grid/users/author/*`.
