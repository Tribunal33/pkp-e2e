---
name: languages-and-locales
status: verified
---

# Languages & locales

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

One installation can run its journals in many languages. The Site
Administrator decides which languages the installation carries at all
(installing them, and enabling or disabling each) and which one is the
site's primary language. Each journal's managers then choose, from the
languages the site has enabled, the ones the journal's pages can be read
in, the ones the journal's own texts are typed in, the journal's primary
language, and the languages authors may write their submissions and
describe them in. Visitors and signed-in users pick the language they read
in, and the application remembers the choice. This spec owns the two
"Languages" screens (the site's and the journal's), the ways of switching
language, and what the language of a page decides. What a second language
adds to one particular form, list or page belongs to the feature that owns
that screen; the pointers are under *Cross-feature interactions*. <sup>a</sup>

## Actors & permissions

Four words recur, each the name of a column on the journal's "Languages"
tab (Rule 7). An **interface language** ("UI") is a language the
journal's pages, public and editorial, can be read in. A **form language**
("Forms") is a language the journal's own texts are typed in: every field
marked per language takes a text in each. A **submission language**
("Submissions") is a language an author may write a submission in, and a
**metadata language** ("Metadata") is a language a submission's title,
abstract and other metadata can be entered in. The **primary language**
("Primary locale") is the journal's main language, and the site has one of
its own. On the test installs the site carries English and French
(Canada), both enabled, English primary. <sup>a</sup> <sup>f</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Install a language on the site** ("Install Locale" on Administration › "Site Settings" › "Site Setup" › "Languages"; Rule 2) | • Site Administrator alone; every other account never reaches Site Settings ([Site settings](U60-site-settings.md), its Actors row 1) <sup>a</sup> <sup>b</sup> |
| **Enable or disable a site language; choose the site's primary language** ("Enable", "Primary locale" on the same list; Rules 3, 4) | • Site Administrator alone <sup>c</sup> <sup>d</sup> |
| **Remove a language from the site** (a row's "Remove"; Rule 5) | • Site Administrator, on every row but the site's primary language <sup>e</sup> |
| **Change a journal's "Website Languages" and "Submission Languages"** (Settings › Website › "Setup" › "Languages"; Rules 7–16) | • whoever opens the journal's Settings pages ([→ settings access](U07-journal-identity-and-about-pages.md#settings-access)): the Journal Manager, and the Editor and Production Editor while their role keeps "Permit changes to Settings"<br>• Site Administrator: also from Administration › "Hosted Journals" › a journal's "Settings wizard" (Rule 7)<br>• every other role: no Settings pages, as the same link says <sup>f</sup> |
| **"Reload defaults"** (a "Website Languages" row's arrow; Rule 13) | • Site Administrator alone, on a journal's own "Languages" tab and in its Settings wizard<br>• a Journal Manager, Editor or Production Editor who is not the Site Administrator: the rows carry no arrow, so nothing is offered ⚠ [A2](#a2) <sup>k</sup> |
| **Read the site in another language** (Rules 17–21) | • anyone, signed in or not: with the sidebar "Language" block where the journal has placed it (Rule 19), or through an address with the language in it (Rule 17)<br>• a signed-in user on the editorial screens: "Change Language" in the initials menu (Rule 20); a Reader finds it only on Profile, their one editorial screen <sup>m</sup> <sup>n</sup> <sup>o</sup> |

## Fields & validation

Every list on these screens saves each change the moment it is made:
there is no "Save" button, and a notice at the top right confirms the
change. Actions on a row sit behind the arrow at the row's start, where
the row has one. <sup>f</sup>

**Administration › "Site Settings" › "Site Setup" › "Languages"**: a list
headed "Languages", one row per installed language. <sup>a</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Enable" | — | A tick box per row, ticked for an enabled language (Rule 3) <sup>a</sup> |
| "Locale" | — | The language's name in the interface language, a slash, and its name in itself, such as "French/français" ("anglais/English" in the French interface); a country is added when two installed languages share one ("French/français (Canada)" beside "French/français"). An asterisk after the name refers to the line under the list, "Marked locales may be incomplete." [OMP1](#omp1) (Rule 6) <sup>a</sup> |
| "Code" | — | The language's code, such as "en" or "fr_CA" <sup>a</sup> |
| "Primary locale" | — | A radio button per row, grayed out on a language that is not enabled (Rule 4) <sup>a</sup> |
| "Install Locale" | — | Above the list; opens the window below (Rule 2) <sup>a</sup> |
| "Remove" | — | Behind a row's arrow, on every row but the primary language's (Rule 5) <sup>a</sup> |

**The "Install Locale" window**: under the heading "Available Locales",
the sentence "Select any additional locales to install support for in this
system. Locales must be installed before they can be used by hosted
journals. See the OJS documentation for information on adding support for
new languages." ("hosted presses" and "OMP" on a press, "hosted servers"
and "OPS" on a preprint server), then one tick box per language the
installation can carry and has not installed, labelled with its two names
and its code in brackets, such as "German/Deutsch (de)", and the buttons
"Cancel" and "Save". When every language is installed the window reads
"No additional locales are available for installation." and offers no
"Save". <sup>b</sup>

**Settings › Website › "Setup" › "Languages"**: two lists, one above the
other. <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| *"Website Languages"*: one row per language the site has enabled | | |
| "Locale" | — | The language's two names, as on the site's list, with no asterisk <sup>f</sup> |
| "Code" | — | The language's code <sup>f</sup> |
| "Primary locale" | — | A radio button per row (Rule 11) <sup>f</sup> |
| "UI" | — | A tick box per row (Rule 9) <sup>f</sup> |
| "Forms" | — | A tick box per row (Rule 10) <sup>f</sup> |
| "Reload defaults" | — | Behind a row's arrow, which only the Site Administrator's rows carry (Rule 13) <sup>k</sup> |
| *"Submission Languages"*: one row per language added to it | | |
| "Locale" | — | The language's name in the interface language, a slash, and its name in itself, such as "French (Canada)/français (Canada)" <sup>l</sup> |
| "Code" | — | The language's code <sup>l</sup> |
| "Default" | — | A radio button per row (Rule 16) <sup>l</sup> |
| "Submissions" | — | A tick box per row (Rule 15) <sup>l</sup> |
| "Metadata" | — | A tick box per row (Rule 15) <sup>l</sup> |
| "Add/Remove Languages" | — | Above the list; opens the window below (Rule 14) <sup>l</sup> |

**The "Add/Remove Languages" window**: under the heading "Available
Locales", the sentence "Select submission and metadata languages.", then
one tick box per language of the world, labelled with its code and name,
such as "[ fr_CA ] French (Canada)", the languages already in the list
ticked, and the buttons "Cancel" and "Save". "Save" with no box ticked
shows the notice "At least one locale needs to be selected." at the top
right; the window stays open and nothing is saved. <sup>l</sup>

Both windows ask before throwing a change away: closing one with a box
changed and not saved asks "The data on this form has changed. Do you
wish to continue without saving?"; "Cancel" keeps the window open, "OK"
closes it and nothing is installed or saved. <sup>b</sup> <sup>l</sup>

**The sidebar "Language" block** (on public pages): the heading
"Language" ("Langue" in French) and one link per interface language, each
named in its own language ("English", "français"). Nothing on screen
marks the language being read: both entries look alike and both stay
links (Rule 19). <sup>n</sup>

**"Change Language"** (the editorial header's initials menu): the heading
"Change Language" ("Changer la langue" in French) at the top of the menu
and one link per interface language, each named in its own language
("English", "français"), a tick beside the language being read (Rule 20).
On Administration's own page and on "Hosted Journals" the links are the
site's languages, named the same way. On "Site Settings" they are named
in the language being read instead: "English", "French" in English,
"anglais", "français" in French ⚠ [A12](#a12). <sup>o</sup>

In the block and in "Change Language" alike, two scripts of one language
carry the same name: Chinese in simplified and in traditional characters
both read "中文" ⚠ [A9](#a9). <sup>n</sup>

## Rules & state

**The site's languages**

1. <a id="site-languages"></a>**Where, and what the words mean.**
   Administration › "Site Settings" › "Site Setup" › "Languages" lists
   every language the installation has **installed** (it carries the
   language's texts). A language that is also **enabled** is the only
   kind anything else can use: it appears on every journal's "Website
   Languages" list (Rule 8), the site's own pages can be read in it
   (Rules 17–20), the site's per-language fields take a text in it
   ([Site settings](U60-site-settings.md), its Rule 5) and "Working
   Languages" on the profile lists it
   ([User profile](U03-user-profile.md), its Rule 7). <sup>a</sup>
2. **Installing.** "Install Locale" opens the window of Fields. Ticking
   one or more languages and pressing "Save" closes it with the notice
   "All selected locale(s) installed and activated.": each language joins
   the list, installed and enabled, and appears on every journal's
   "Website Languages" list with "UI" and "Forms" unticked (Side effects).
   Pressing "Save" with no box ticked shows the same notice and adds
   nothing. <sup>b</sup>
3. **Enabling and disabling.** Ticking "Enable" enables the language at
   once ("Locale enabled."), with no question. Unticking it asks, in a
   window titled "Disable", "Are you sure you want to disable this
   locale? This may affect any hosted journals currently using the
   locale." ("hosted presses", "hosted servers"), with "OK" and "Cancel";
   "OK" shows "Locale disabled." In this question and in those of Rules 4
   and 5, "Cancel" closes the window and leaves the list as it was.
   <sup>c</sup>
   - 3a. A disabled language leaves every journal. Its row leaves the
     journal's "Website Languages" list, with its "UI" and "Forms" ticks.
     Its row on "Submission Languages", if it has one, stays, with
     "Submissions" and "Metadata" unticked; a "Default" radio stays where
     it was (Rule 3c). A journal whose primary language it was takes the
     site's primary language. Enabling it again brings the "Website
     Languages" row back with its boxes unticked; the journals' earlier
     ticks do not return.
   - 3b. The site's primary language cannot be disabled: after the
     question, the notice "This locale is the primary language of the
     site. You can't disable it until you choose another primary locale."
     shows and the box stays ticked.
   - 3c. Every change on this list (an install, an enable, a disable, a
     removal) also unticks, on every journal, the "Submissions" and
     "Metadata" boxes of each submission language the site has not
     enabled ⚠ [A1](#a1).
4. **The site's primary language.** Pressing "Primary locale" on another
   enabled row asks, in a window titled "Primary locale", "Are you sure
   you want to change the site primary locale? Users' names, which are
   required in the site's primary locale, will be copied from the
   existing primary locale where they are missing." with "OK" and
   "Cancel". "OK" shows "{language} defined as primary locale.", the
   language by its two names ("German/Deutsch defined as primary
   locale."). The site's own pages then open in it for a visitor who has
   made no choice and whose browser prefers none of the site's languages
   (Rule 18) ⚠ [A10](#a10), and account names are copied into it (Side
   effects). <sup>d</sup>
5. **Removing.** A row's "Remove" asks, in a window titled "Remove", "Are
   you sure you want to uninstall this locale? This may affect any hosted
   journals currently using the locale." ("hosted presses", "hosted
   servers") with "OK" and "Cancel". "OK" shows "{language} locale
   uninstalled." ("German/Deutsch locale uninstalled."), the row leaves
   the list, every journal loses the language as in Rule 3a, and the
   language's email texts are deleted (Side effects). "Install Locale"
   offers it again. The primary language's row has no arrow, so no
   "Remove". <sup>e</sup>
6. **Incomplete translations.** The asterisk of Fields marks a language
   whose translation covers less than about nine in ten of the
   application's texts. On the current builds every language but English
   carries it, French (Canada) and German included, so it sets no
   language apart. Nothing else changes: a marked language can be
   installed, enabled and used like any other, and its missing texts show
   as Rule 21a says. <sup>a</sup>

**A journal's languages**

7. <a id="journal-languages"></a>**Where.** Settings › Website › "Setup"
   › "Languages" holds the journal's two lists, "Website Languages" and
   then "Submission Languages" (Fields). The Site Administrator reaches
   the same two lists for any journal from Administration › "Hosted
   Journals" › the journal's row arrow › "Settings wizard", on the page
   "Settings Wizard", tab "Journal Settings" ("Setup" on a press, "Server
   Settings" on a preprint server), side tab "Languages"; Rules 8–16 hold
   there alike. Each change shows "Locale settings saved." unless its rule
   names another notice. <sup>f</sup>
8. **What a journal starts with.** The "Website Languages" list has a row
   for each language the site has enabled. A new journal starts with the
   languages ticked on the Hosted Journals create form under "UI" (every
   site language when the site has only one, since the form then asks
   nothing ⚠ [A7](#a7)), its primary language alone under "Forms", and its
   primary language alone on "Submission Languages", ticked under
   "Default", "Submissions" and "Metadata". The seeded journal has English
   and French under "UI", English alone under "Forms" and under
   "Submissions". <sup>g</sup>
   - 8a. A language ticked under "UI" when the journal is created also
     gets its default texts of Rule 10a at once. With French, a French
     reader sees the French "Privacy Statement", "For Readers", "For
     Authors", "For Librarians" and "Author Guidelines" (on a press and a
     preprint server some of them are internal names, [A8](#a8)), while
     the Settings pages offer no French box for them until French is
     ticked under "Forms". On a journal the "Reviewer Recommendations" get
     French names too. A language ticked under "UI" later brings no
     texts: its reader sees the primary language's (Rule 10). <sup>g</sup>
9. <a id="interface-languages"></a>**"UI".** The ticked languages are the
   journal's interface languages. With one, nothing on the journal offers
   a choice of language. With two or more, the sidebar block lists them
   (Rule 19), so does "Change Language" (Rule 20), every address of the
   journal carries the language (Rule 17), and every public page links
   its versions in the other languages
   ([Search-engine metadata & analytics](U20-search-engine-metadata-and-analytics.md),
   its Rule 8). Unticking a language takes it out of all of these; a
   reader who was reading in it gets the language Rule 18 picks next.
   <sup>h</sup>
10. <a id="form-languages"></a>**"Forms".** The ticked languages are the
    journal's form languages. Each one gives every per-language field of
    the journal's forms a box in that language: the Settings pages show
    it behind the language buttons
    [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
    describes under its Fields, and the older windows (a section, a
    navigation item) show a box per language; which fields are per
    language is each screen's own feature's. A public page shows a text
    in the language the visitor reads in, and the primary language's text
    where that language's box is empty (the same spec's Rule 11). "Forms"
    does not depend on "UI": a language can be a form language without
    being an interface language, although the default email texts wait
    for both (Side effects). <sup>i</sup>
    - 10a. Ticking a language under "Forms" fills that language's box of
      each journal text the application ships a default for with the
      default text in that language, where the box is still empty:
      "Privacy Statement", "For Readers", "For Authors", "For
      Librarians", "Author Guidelines", the submission checklist and the
      submission wizard's help texts. A box that already holds a text
      keeps it; "Reload defaults" is the one action that replaces texts
      (Rule 13). On a press and a preprint server the French "Author
      Guidelines" and checklist arrive as internal names ⚠ [A8](#a8).
      <sup>i</sup>
    - 10b. The tick shows at once, and the other tabs of the Settings
      page gain the new language's button without a reload. Until the
      page is reloaded, that language's boxes there are empty, with "1/2
      languages completed" under each box; after a reload they hold the
      default texts of Rule 10a. The page's script fails five times on
      the way ⚠ [A5](#a5). <sup>i</sup>
11. **"Primary locale".** Pressing the radio button of another row makes
    that language the journal's primary language at once, with no
    question, and ticks its "UI" and "Forms" boxes. From then on the
    journal's required per-language fields need a text in it, a text
    missing in the reader's language falls back to it (Rule 10), and a
    visitor who has made no choice, and whose browser prefers none of the
    journal's interface languages, reads the journal in it (Rule 18).
    Unlike a "Forms" tick, it fills none of Rule 10a's texts in a
    language that was not a form language: its "Privacy Statement" box
    and the other default texts stay empty until someone types them or
    uses "Reload defaults". <sup>j</sup>
12. **The primary language keeps its boxes.** Unticking "UI" or "Forms" on
    the primary language's row is refused with the browser's alert "The
    language setting could not be saved. All options need to be enabled."
    and the box stays ticked. <sup>j</sup>
13. **"Reload defaults".** Behind a "Website Languages" row's arrow (Actors
    row 5), it asks, in a window titled "Reload defaults", "This will
    replace any locale-specific journal settings you had for this locale"
    ("press settings", "server settings") with "OK" and "Cancel". "OK"
    puts the default texts of Rule 10a back in that language, replacing
    what those boxes held, and shows "{language} locale reloaded for
    {journal name}.", the language as on the list ("English/English
    locale reloaded for …"); "Cancel" changes nothing. <sup>k</sup>

**A journal's submission languages**

14. <a id="submission-languages"></a>**The list and its window.**
    "Submission Languages" lists the languages added through "Add/Remove
    Languages", which offers every language of the world, not only the
    site's. In the window, a newly ticked language joins the list with
    "Submissions" and "Metadata" unticked, and an unticked one leaves it.
    When the "Default" language is unticked, the first remaining language
    in the order of the codes becomes the "Default", with both its boxes
    ticked. "Save" closes the window with "Submission locales updated.".
    <sup>l</sup>
15. **"Submissions" and "Metadata".** The languages ticked under
    "Submissions" are the ones an author may write a submission in: with
    two or more, the submission wizard asks for the "Submission Language"
    ([Submission wizard](U21-submission-wizard.md), its Rules 4 and 11).
    The languages ticked under "Metadata" are the ones a submission's
    metadata can be entered in besides its own
    ([Publication metadata](U40-publication-metadata.md), its Rule 3). The
    columns move together in one direction: <sup>l</sup>
    - 15a. Ticking "Submissions" also ticks "Metadata" for that language.
      When "Metadata" was not ticked yet, the language's default texts
      fill its empty boxes as by Rule 10a.
    - 15b. Unticking "Metadata" also unticks "Submissions"; unticking
      "Submissions" leaves "Metadata" ticked.
    - 15c. The "Default" language's two boxes cannot be unticked: the
      browser's alert of Rule 12 says so and the box stays ticked.
16. **"Default".** Pressing the radio button of another row makes that
    language the default submission language and ticks its "Submissions"
    and "Metadata" boxes. A new submission takes the default language
    whenever nobody chooses one, which on screen is the case whenever the
    journal has a single submission language. <sup>l</sup>

**Reading in a language**

17. <a id="language-addresses"></a>**Addresses carry the language.** On a
    journal with two or more interface languages every address of the
    journal, public and editorial, carries the language's code after the
    journal's path, such as "…/{journal}/fr_CA/about"; the site's
    own pages do the same with the site's languages. <sup>m</sup>
    - 17a. An address without a language forwards to the same page in the
      language Rule 18 picks.
    - 17b. Opening an address with another language switches the whole
      visit: the pages opened after it are in that language too.
    - 17c. An address with a language the journal does not offer as an
      interface language, such as "de", forwards to the same page in the
      language Rule 18 picks. A segment that is not a language code the
      application knows, such as "fr_FR" or "xx", is read as part of the
      page's address and shows a page headed "404 Not Found".
    - 17d. On a journal with one interface language the addresses carry no
      language, and an address with one forwards to the same page without
      it.
18. **Which language a page opens in.** In order: the language in the
    address; the language this browser last chose on the site, which is
    kept across signing out and in and on a later visit; the browser's
    preferred language when the journal offers it; the journal's primary
    language (on the site's own pages, the site's). A remembered language
    the journal does not offer counts as no choice. <sup>m</sup>
19. <a id="language-block"></a>**The sidebar "Language" block.** Where the
    journal has placed "Language Toggle Block" in its sidebar (Settings
    bullet 1) and has two or more interface languages, every public page
    shows the block of Fields; with one it shows nothing. Choosing a
    language reopens the page the visitor was on, in that language
    ⚠ [A3](#a3). Placed in the site's sidebar, the block lists the site's
    languages on the site's own pages. <sup>n</sup>
20. <a id="change-language"></a>**"Change Language".** On the editorial
    screens of a journal with two or more interface languages, the
    initials menu opens with "Change Language" (on Administration, with
    the site's languages); with one there is no such heading. Choosing a
    language reopens the same screen in that language. A Reader signs in
    onto the journal's public home, which has no initials menu; their one
    editorial screen is Profile, whose initials menu has "Change
    Language". <sup>o</sup>
    - 20a. On Settings › Website the address ends, a moment after each
      press, with the tab last pressed, and a language chosen there
      reopens the page as a reload of that address does. After "Setup"
      is pressed the address ends "#setup", and the page reopens on
      "Setup" at its first side tab, "Languages". After a side tab such
      as "Languages" is pressed it ends "#languages", which the page
      does not restore: it reopens on its first tab, "Appearance" ›
      "Theme", as it also does when the choice is made before the
      address shows a tab.
21. <a id="what-follows"></a>**What follows the reading language.** Every
    text the application itself prints, on public and editorial screens
    alike, is in the language being read, as are the journal's own texts
    of Rule 10. A web feed, an OAI request and the sitemap follow the
    language they are read in
    ([Web feeds](U18-web-feeds.md), its Rule 10;
    [OAI-PMH](U19-oai-pmh.md), its Rule 19;
    [Search-engine metadata & analytics](U20-search-engine-metadata-and-analytics.md),
    its Rule 4). <sup>p</sup>
    - 21a. A text the language's translation lacks shows as its internal
      name between two pairs of hash signs, such as
      "##discussion.description##", not in the primary language
      ⚠ [A4](#a4). <sup>p</sup>
    - 21b. In a language written from right to left the pages run from
      right to left. <sup>q</sup>

## Side effects

- **A language installed (Rule 2)**: the application's default email
  texts in that language are added. A journal's "Edit Template" window
  shows them in that language's boxes once the language is both a form
  and an interface language of the journal
  ([Emails management](U56-emails-management.md), its Rule 20). A form
  language that is not an interface language gets the language's button
  with its "Name", "Subject" and "Body" boxes empty ("1/2 languages
  completed") ⚠ [A13](#a13). The discussion templates gain their texts
  in the language ([Tasks & discussions](U37-tasks-and-discussions.md)).
  Every journal's language lists are saved again (Rule 3c). <sup>r</sup>
- **A language removed (Rule 5)**: every journal's email texts in that
  language are deleted, the ones a manager edited included; installing
  the language again brings back the application's defaults only.
  <sup>r</sup>
- **A language enabled or disabled (Rule 3)**: every journal's language
  lists are saved again, which unticks the boxes of Rules 3a and 3c.
  <sup>c</sup>
- **The site's primary language changed (Rule 4)**: every account whose
  given name, family name or preferred public name is empty in the new
  primary language gets the one of the former primary language copied
  in. <sup>d</sup>
- **A language ticked under "Forms", "Submissions" ticked for a language
  not yet under "Metadata", or "Reload defaults" (Rules 10a, 13, 15a)**:
  the default texts of Rule 10a, in the empty boxes (with "Reload
  defaults", in every box); the application's default email texts
  in that language, which every journal of the site shares, are written
  again; and on a journal the "Reviewer Recommendations" list gains
  names in that language
  ([Review setup & review forms](U29-review-setup-and-review-forms.md)).
  When two managers tick the same language at the same moment, one of
  the two ticks can fail without a word ⚠ [A6](#a6). <sup>r</sup>
- **The journal's primary language changed (Rule 11)**: on a journal the
  "Reviewer Recommendations" list gains names in the new primary
  language. <sup>j</sup>

## Settings that modify behavior

1. **"Language Toggle Block" in "Sidebar"** (Settings › Website ›
   "Appearance" › "Setup"; [Appearance & theming](U10-appearance-and-theming.md),
   its Rules 23–24). Default: not placed on a new journal. Placed, with
   two or more interface languages: the block of Rule 19 on every public
   page. <sup>t</sup>
2. **The "Language Toggle Block" plugin** (Settings › Website ›
   "Plugins" › "Installed Plugins"; *Plugins management*). Default:
   enabled. Disabled: the block leaves "Sidebar" and every page (the same
   spec's Rule 25). <sup>t</sup>
3. **The site's "Sidebar"** (Administration › "Site Settings" ›
   "Appearance" › "Setup"; [Site settings](U60-site-settings.md)).
   Default: nothing placed. "Language Toggle Block" placed: the block
   lists the site's languages on the site's own pages (Rule 19). <sup>t</sup>
4. **"Permit changes to Settings"** (Settings › Users & Roles › "Roles" › a
   role's "Edit"; *Roles configuration*). Default: ticked on every
   manager-level role. Unticked: the role loses the journal's "Languages"
   tab with the rest of the Settings pages (Actors row 4). <sup>f</sup>
5. **The browser's preferred language** (the visitor's own browser, not
   the application). Its first language the journal offers decides the
   language of a first visit (Rule 18) ⚠ [A11](#a11); a language the
   journal does not offer changes nothing. <sup>m</sup>

## Cross-feature interactions

- [Site settings](U60-site-settings.md#site-settings-tabs) owns the page
  whose "Languages" side tab this spec describes, who opens it, and what
  its per-language fields do with the site's languages (its Rule 5).
- [Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)
  owns who opens a journal's Settings pages, the language buttons of the
  Settings forms, and the rule that a page shows the reader's language
  and falls back to the primary one (its Rule 11); every other screen
  with per-language fields states its own instance
  ([Appearance & theming](U10-appearance-and-theming.md),
  [Custom pages & blocks](U09-custom-pages-and-blocks.md),
  [Highlights](U11-highlights.md), [Announcements](U12-announcements.md),
  [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
  [Roles configuration](U54-roles-configuration.md),
  [Emails management](U56-emails-management.md),
  [Review setup & review forms](U29-review-setup-and-review-forms.md),
  [Reviewer suggestions](U31-reviewer-suggestions.md),
  [Author response to reviews](U30-author-response-to-reviews.md),
  [Editorial decision recording](U34-editorial-decision-recording.md)).
  This spec owns only that a form language adds the boxes (Rule 10).
- [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
  owns the initials menu and its other entries (its Rule 28); this spec
  owns its "Change Language" part (Rule 20).
- [Appearance & theming](U10-appearance-and-theming.md) owns "Sidebar",
  where the block is placed and in what order, and the Settings wizard's
  "Appearance" tab (its Rule 34); *Hosted journals (site admin)* owns the
  create form's "Languages" and "Primary locale" and the rest of the
  wizard. This spec owns the block's content and the wizard's
  "Languages" side tab.
- [Submission wizard](U21-submission-wizard.md) owns the "Submission
  Language" choice; [Publication metadata](U40-publication-metadata.md)
  owns the metadata language bar and changing a submission's language;
  [Galleys](U46-galleys.md) owns a galley's "Language" list, fed by the
  submission languages.
- [Web feeds](U18-web-feeds.md), [OAI-PMH](U19-oai-pmh.md) and
  [Search-engine metadata & analytics](U20-search-engine-metadata-and-analytics.md)
  own what their output looks like in each language (Rule 21).
- [Users management](U53-users-management.md) (its Rule 25) and
  [Tasks & discussions](U37-tasks-and-discussions.md) (its Rule 24) own
  their screens' untranslated French texts; the general rule is Rule 21a.
- [User profile](U03-user-profile.md) owns "Working Languages", which
  lists the site's languages (Rule 1).
- [Emails management](U56-emails-management.md) owns the email texts per
  language that the site's installs and removals add and delete (Side
  effects).

## Canonical scenarios

Scenarios 1 to 3 change the site's languages, which the whole install
shares, so they run one at a time as the Site Administrator (a ready
account) and put back what they changed; scenarios 4 to 8 run on scratch
journals with throwaway accounts, and scenario 9 reads the seeded journal
as it stands. <sup>s</sup>

1. **Installing and removing a site language**

   Given: Site Administrator, on the site as installed (English and
   French (Canada), both enabled, English the primary language), hosting
   a scratch journal whose Journal Manager is signed in in a second
   browser.

   - **Administration's "Change Language"**: open Administration: the
     initials menu opens with "Change Language" and the links "English"
     and "français", a tick beside "English". Choose "français":
     Administration reopens in French, and the menu reads "Changer la
     langue", "English", "français", the tick beside "français". Choose
     "English": it reopens in English (Fields; Rule 20).
   - **The site's list**: open "Site Settings" › "Site Setup" ›
     "Languages": a list headed "Languages" with the columns "Enable",
     "Locale", "Code" and "Primary locale". The row "English/English",
     ticked under "Enable" and selected under "Primary locale", has no
     arrow at its start. The row "French/français", code "fr_CA", ticked
     under "Enable", carries an asterisk after its name, and its arrow
     offers "Remove". Under the list: "Marked locales may be incomplete."
     [OMP1](#omp1) (Fields; Rules 5, 6).
   - **"Install Locale" left unsaved**: press "Install Locale": a window
     with the heading "Available Locales", the sentence "Select any
     additional locales to install support for in this system. Locales
     must be installed before they can be used by hosted journals. See
     the OJS documentation for information on adding support for new
     languages." ("hosted presses" and "OMP" on a press, "hosted servers"
     and "OPS" on a preprint server), one tick box per language not yet
     installed, such as "German/Deutsch (de)", none for English or French
     (Canada), and the buttons "Cancel" and "Save". Tick
     "German/Deutsch (de)" and close the window: it asks "The data on
     this form has changed. Do you wish to continue without saving?".
     Press "Cancel": the window stays open. Close it again and press
     "OK": the window closes and the list is as it was (Fields).
   - **"Save" with nothing ticked**: press "Install Locale" again and
     "Save" with no box ticked: "All selected locale(s) installed and
     activated.", and the list is unchanged (Rule 2).
   - **German installed**: press "Install Locale", tick
     "German/Deutsch (de)" and press "Save": the window closes with "All
     selected locale(s) installed and activated.", and the list gains the
     row "German/Deutsch", code "de", ticked under "Enable", not selected
     under "Primary locale", an asterisk after its name (Rules 2, 6).
   - **The journal's list**: the Journal Manager opens Settings › Website
     › "Setup" › "Languages": "Website Languages" has a row
     "German/Deutsch" with "UI" and "Forms" unticked (Rule 2).
   - **The German email texts**: the Journal Manager ticks "Forms" on the
     German row: "Locale settings saved.". On Settings › Workflow ›
     "Emails", the "Edit Template" window of the default template of
     "Submission Confirmation" ("Submission Acknowledgement (Pending
     Moderation)" on a preprint server), opened as
     [Emails management](U56-emails-management.md) scenario 5 opens one,
     has a "German" button. Press it: the German "Subject" and "Body"
     are empty, German not being an interface language [A13](#a13).
     Type Unser Text. in the German "Body" and press "Save": "Saved"
     (Side effects; the same spec's Rule 20).
   - **"Cancel" on "Remove"**: on the site's list, press the German
     row's arrow and "Remove": a window titled "Remove" asks "Are you
     sure you want to uninstall this locale? This may affect any hosted
     journals currently using the locale." ("hosted presses", "hosted
     servers"), with "OK" and "Cancel". Press "Cancel": the window closes
     and the row stays (Rules 3, 5).
   - **German removed**: press "Remove" again and "OK": "German/Deutsch
     locale uninstalled.", and the row leaves the list. The Journal
     Manager reloads Settings › Website and opens "Setup" › "Languages":
     "Website Languages" has no German row (Rules 3a, 5).
   - **German installed again**: press "Install Locale": it offers
     "German/Deutsch (de)" again. Tick it and press "Save": "All selected
     locale(s) installed and activated.". The Journal Manager's "Website
     Languages", reloaded, has the German row with "UI" and "Forms"
     unticked. The Journal Manager ticks "Forms" and opens the template
     again: its German "Body" no longer reads Unser Text.; it is empty
     again [A13](#a13), and the English "Body" is the application's
     default text (Rules 2, 5; Side effects).
   - **Control**: press "Install Locale" once more: the window offers no
     "German/Deutsch (de)", German being installed. Press "Cancel"
     (Fields). <sup>s</sup>

2. **Disabling and enabling a site language**

   Given: Site Administrator, on a site with German installed and enabled
   beside English and French (Canada), hosting a scratch journal with
   English and German ticked under "UI" and "Forms" and on "Submission
   Languages" under "Submissions" and "Metadata", and a second scratch
   journal whose primary language is German.

   - **The Settings wizard**: open Administration › "Hosted Journals",
     press the first journal's row arrow and "Settings wizard"; on the
     page "Settings Wizard", open the tab "Journal Settings" ("Setup" on
     a press, "Server Settings" on a preprint server) and its side tab
     "Languages": "Website Languages" lists German ticked under "UI" and
     "Forms", and "Submission Languages" lists German ticked under
     "Submissions" and "Metadata" (Rule 7).
   - **"Cancel" on "Disable"**: open Administration › "Site Settings" ›
     "Site Setup" › "Languages" and untick German's "Enable": a window
     titled "Disable" asks "Are you sure you want to disable this locale?
     This may affect any hosted journals currently using the locale."
     ("hosted presses", "hosted servers"), with "OK" and "Cancel". Press
     "Cancel", reload the page and open "Languages": German is still
     ticked (Rule 3).
   - **German disabled**: untick German's "Enable" again and press "OK":
     "Locale disabled.", and German's "Primary locale" radio button is
     grayed out (Fields; Rules 3, 4).
   - **The first journal**: open its Settings wizard's "Languages" side
     tab again: "Website Languages" has no German row, and "Submission
     Languages" still lists German, with "Submissions" and "Metadata"
     unticked (Rule 3a).
   - **The German journal**: open the second journal's Settings wizard
     the same way: on "Website Languages", English is selected under
     "Primary locale" (Rule 3a).
   - **German enabled again**: on the site's list, tick German's
     "Enable": "Locale enabled.", with no question. The first journal's
     Settings wizard, opened again, has the German row back on "Website
     Languages", with "UI" and "Forms" unticked (Rules 3, 3a).
   - **Control**: untick English's "Enable" and press "OK" in the same
     question: "This locale is the primary language of the site. You
     can't disable it until you choose another primary locale." Reload
     the page and open "Languages": English is still ticked (Rule 3b).
     <sup>s</sup>

3. **The site's primary language**

   Given: Site Administrator, on a site with German installed and enabled
   beside English and French (Canada), with the throwaway account Nora
   Lindqvist, whose given and family names are in English alone, and two
   visitors, each in a browser of their own that has made no language
   choice, the first preferring Japanese, which the site does not offer,
   the second English ("en").

   - **"Cancel"**: open Administration › "Site Settings" › "Site Setup" ›
     "Languages" and press German's "Primary locale": a window titled
     "Primary locale" asks "Are you sure you want to change the site
     primary locale? Users' names, which are required in the site's
     primary locale, will be copied from the existing primary locale
     where they are missing.", with "OK" and "Cancel". Press "Cancel":
     English stays selected (Rules 3, 4).
   - **German made primary**: press German's "Primary locale" again and
     "OK": "German/Deutsch defined as primary locale.". German's row now
     has no arrow, and English's arrow offers "Remove" (Rules 4, 5).
   - **The first visitor**: opens the site's home page: it is in German,
     its address carrying "de" after "index" [A10](#a10) (Rules 4, 17,
     18).
   - **Nora's names**: Nora signs in and opens her Profile at the site's
     address (the Profile address with "index" in place of the journal's
     path), tab "Identity": the German boxes of "Given Name" and "Family
     Name" read Nora and Lindqvist (Side effects).
   - **Control**: the second visitor opens the site's home page: it is in
     English, its address carrying "en" (Rule 18). <sup>s</sup>

4. **A second interface language**

   Given: Journal Manager, on a scratch journal with English alone under
   "UI" and "Forms" and "Language Toggle Block" placed in its "Sidebar",
   and a visitor, signed out, in a second browser.

   - **One interface language**: the visitor opens the journal's home
     page: it has no "Language" block, and its address carries no
     language. The visitor opens {journal address}/fr_CA/about
     ({journal address} being the address of the journal's home page with
     no language in it): it forwards to {journal address}/about. The
     Journal Manager's initials menu has no "Change Language" (Rules 17d,
     19, 20).
   - **French ticked under "UI"**: open Settings › Website › "Setup" ›
     "Languages" and tick "UI" on the "French/français" row: "Locale
     settings saved." (Rules 7, 9).
   - **The visitor's pages**: the visitor reloads the home page: it
     forwards to the same page with "en" after the journal's path, and
     the sidebar shows the block headed "Language" with the links
     "English" and "français" (Rules 17a, 19).
   - **No French texts yet**: the visitor opens the journal's "Privacy
     Statement" page ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
     its Rule 18) and puts "fr_CA" in place of "en" in its address: the
     page's headings are in French, and the statement is the English one
     (Rules 8a, 21).
   - **"Change Language"**: the Journal Manager reloads the page, opens
     "Setup" and presses its side tab "Languages": the address carries
     "en" after the journal's path and ends "#languages", and the
     initials menu opens with "Change Language" and the links "English"
     and "français", a tick beside "English" (Fields; Rules 17, 20).
   - **Chosen on a Settings side tab**: choose "français": Settings ›
     Website reopens in French on its first tab, "Appearance" › "Theme",
     and the initials menu reads "Changer la langue", the tick beside
     "français" (Fields; Rules 20, 20a).
   - **Chosen on the Dashboard**: open the Dashboard, in French, and
     choose "English": the Dashboard reopens in English (Rule 20).
   - **French unticked**: on Settings › Website › "Setup" › "Languages",
     untick "UI" on the French row: "Locale settings saved.". The visitor
     reloads the French "Privacy Statement" page: it opens in English,
     its address without a language, and the "Language" block is gone.
     The Journal Manager's initials menu, after a reload, has no "Change
     Language" (Rules 9, 17d).
   - **Control**: the "Forms" box of the French row stayed unticked
     throughout, and Settings › Website › "Setup" › "Privacy Statement"
     has no "French" button (Rule 10). <sup>s</sup>

5. **A second form language**

   Given: Journal Manager, on a scratch journal with English alone under
   "UI" and "Forms".

   - **One form language**: open Settings › Website › "Setup" › "Privacy
     Statement": the tab has no language buttons (Rule 10).
   - **French ticked under "Forms" alone**: open "Setup" › "Languages"
     and tick "Forms" on the "French/français" row, leaving its "UI"
     unticked: "Locale settings saved." [A5](#a5) (Rules 7, 10).
   - **The other side tabs, without a reload**: open "Setup" › "Privacy
     Statement" again: it has a "French" button. Press it: the French
     "Privacy Statement" box is empty, and "1/2 languages completed"
     shows under each box (Rule 10b).
   - **After a reload**: reload the page, open "Setup" › "Privacy
     Statement" and press "French": the French box holds the journal's
     default privacy statement in French; on a preprint server it holds
     an internal name instead
     ([Journal identity & about pages](U07-journal-identity-and-about-pages.md#ops3))
     (Rules 10a, 10b).
   - **A text of the journal's own**: replace the French text with Notre
     politique. and press "Save": "Saved".
   - **"Forms" unticked and ticked again**: on "Setup" › "Languages",
     untick "Forms" on the French row, then tick it again: "Locale
     settings saved." each time. Reload the page, open "Setup" ›
     "Privacy Statement" and press "French": the French box reads Notre
     politique. (Rule 10a).
   - **"Submissions" ticked**: on "Setup" › "Languages", press
     "Add/Remove Languages" under "Submission Languages", tick
     "[ fr_CA ] French (Canada)" and press "Save": "Submission locales
     updated.". Tick "Submissions" on the "French (Canada)/français
     (Canada)" row: "Metadata" is ticked with it. Reload the page and
     open the French "Privacy Statement" again: it still reads Notre
     politique. (Rules 14, 15a).
   - **Control**: the Journal Manager's initials menu has no "Change
     Language", French being a form language and not an interface
     language (Rules 9, 10, 20). <sup>s</sup>

6. **Another primary language for the journal**

   Given: Journal Manager, on a scratch journal created with English
   alone, whose French row on "Website Languages" has nothing ticked, and
   two visitors, each in a browser of their own that has made no language
   choice, the first preferring German, the second English ("en").

   - **French made primary**: open Settings › Website › "Setup" ›
     "Languages" and press "Primary locale" on the "French/français" row:
     with no question, "Locale settings saved.", and French is ticked
     under "UI" and "Forms" (Rule 11).
   - **The primary language's boxes**: untick "UI" on the French row: the
     browser's alert "The language setting could not be saved. All
     options need to be enabled.", and the box stays ticked. The same for
     "Forms" (Rule 12).
   - **No default texts**: reload the page and open "Setup" › "Privacy
     Statement": the French box, now the primary language's, is empty
     (Rule 11).
   - **Required in French**: open Settings › Journal › "Masthead" and
     press "Save": "This field is required." shows under the French
     "Journal title" ("Press Name", "Server title"), which is empty
     (Rule 11; [Journal identity & about pages](U07-journal-identity-and-about-pages.md),
     its Rule 11).
   - **The first visitor**: opens the journal's home page: it is in
     French, its address carrying "fr_CA" (Rules 11, 18).
   - **Control**: the second visitor opens the journal's home page: it
     is in English, its address carrying "en" (Rule 18; Settings bullet 5
     [A11](#a11)). <sup>s</sup>

7. **Submission languages**

   Given: Journal Manager, on a scratch journal whose "Submission
   Languages" lists English alone, as "Default" with "Submissions" and
   "Metadata" ticked, and a throwaway Author of the journal signed in in a
   second browser.

   - **The window**: open Settings › Website › "Setup" › "Languages" and
     press "Add/Remove Languages": a window with the heading "Available
     Locales", the sentence "Select submission and metadata languages.",
     one tick box per language of the world, labelled like "[ fr_CA ]
     French (Canada)", the box for English ticked, and the buttons
     "Cancel" and "Save" (Fields; Rule 14).
   - **Left unsaved**: tick "[ fr_CA ] French (Canada)" and close the
     window: it asks "The data on this form has changed. Do you wish to
     continue without saving?". Press "OK": the window closes and the
     list is as it was (Fields).
   - **Nothing ticked**: press "Add/Remove Languages" again, untick
     English and press "Save": "At least one locale needs to be
     selected." shows at the top right, and the window stays open. Tick
     English again (Fields).
   - **French (Canada) added**: tick "[ fr_CA ] French (Canada)" and press
     "Save": the window closes with "Submission locales updated.", and
     the list gains the row "French (Canada)/français (Canada)" with
     "Submissions" and "Metadata" unticked (Rule 14).
   - **"Submissions" ticked**: tick "Submissions" on that row: "Locale
     settings saved.", and "Metadata" is ticked with it (Rule 15a).
   - **The Author's submission**: the Author starts "Make a Submission":
     the wizard asks for the "Submission Language" (Rule 15;
     [Submission wizard](U21-submission-wizard.md)).
   - **The columns together**: untick "Metadata" on the French (Canada)
     row: "Submissions" is unticked with it. Tick "Submissions": both are
     ticked. Untick "Submissions": "Metadata" stays ticked (Rules 15a,
     15b).
   - **The "Default" row**: untick "Submissions" on the English row: the
     browser's alert "The language setting could not be saved. All
     options need to be enabled.", and the box stays ticked. The same for
     "Metadata" (Rule 15c).
   - **Another "Default"**: press "Default" on the French (Canada) row:
     French (Canada) is the "Default", its "Submissions" and "Metadata"
     both ticked (Rule 16).
   - **The "Default" language removed**: press "Add/Remove Languages",
     untick "[ fr_CA ] French (Canada)" and press "Save": "Submission
     locales updated.". The French (Canada) row leaves the list, and
     English is the "Default" again, with both its boxes ticked (Rule
     14).
   - **Control**: the Author starts "Make a Submission" again: the wizard
     asks for no "Submission Language", the journal having one submission
     language (Rules 15, 16). <sup>s</sup>

8. **Switching with the "Language" block**

   Given: a Reader, signed out, in a browser that has made no language
   choice, on a scratch journal created with English and French (Canada)
   under "UI" and English alone under "Forms", with "Language Toggle
   Block" placed in its "Sidebar", and the journal's Journal Manager in a
   second browser.

   - **The block**: open the journal's home page: its address carries
     "en" after the journal's path, and the sidebar holds the block
     headed "Language" with the links "English" and "français"; nothing
     marks the language being read, and both are links. Open "About the
     Journal": the same block (Fields; Rules 17a, 19).
   - **"français" chosen**: on "About the Journal", choose "français":
     the site's home opens in French, the install having a port
     [A3](#a3). Open the journal's home page with no language in its
     address: French, its address carrying "fr_CA", the block headed
     "Langue" (Fields; Rules 17a, 18, 19).
   - **The texts the journal was created with**: open the journal's
     "Privacy Statement" page: the default privacy statement, in French;
     on a preprint server an internal name instead
     ([Journal identity & about pages](U07-journal-identity-and-about-pages.md#ops3))
     (Rule 8a).
   - **Signed in**: sign in as the Reader: the journal's home page opens,
     in French, with no initials menu. Open Profile: its initials menu
     opens with "Changer la langue" and the links "English" and
     "français", the tick beside "français" (Fields; Rules 18, 20).
   - **Signed out**: sign out and open the journal's home page with no
     language in its address: it opens in French, its address carrying
     "fr_CA" (Rule 18).
   - **Control**: the Journal Manager, whose browser has made no language
     choice, signs in and opens Settings › Website › "Setup" › "Privacy
     Statement": the screen is in English, and the tab has no "French"
     button, French not being a form language (Rules 8a, 18).
     <sup>s</sup>

9. **Addresses with a language**

   Given: a visitor, signed out, in a browser that has made no language
   choice, on the seeded journal, whose interface languages are English,
   the primary language, and French (Canada), and which has no "Language"
   block placed.

   - **No language in the address**: open {journal address}/about: it
     forwards to {journal address}/en/about, "About the Journal" in
     English, with no "Language" block beside it (Rule 17a; Settings
     bullet 1).
   - **French in the address**: open {journal address}/fr_CA/about: the
     page is in French. Open {journal address}/about again: it forwards
     to {journal address}/fr_CA/about (Rules 17b, 18).
   - **A language the journal does not offer**: open
     {journal address}/de/about: it forwards to
     {journal address}/fr_CA/about (Rule 17c).
   - **No language code**: open {journal address}/xx/about: a page headed
     "404 Not Found" (Rule 17c).
   - **Control**: open {journal address}/en/about: the page is in
     English, although French is the language this browser chose last
     (Rule 18). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A8 (issue report
    `docs/issues/U57-A8-french-default-texts-stored-as-codes.md`): a press and a server created with French under "UI", and French "Reload defaults", leaving no "##" code on the French "Submissions", "Privacy Statement" and "Editorial Masthead" pages {OMP OPS}
- **Rarely met**:
  - the Site Administrator's "Reload defaults" on a journal's "Website
    Languages" row, which puts the default texts back over the
    journal's own (Actors row 5; Rule 13): offered to the Site
    Administrator alone, whom no editor, author or reviewer meets in an
    ordinary week
- **Nothing new to test**:
  - a right-to-left language's pages running from right to left, which
    needs such a language installed on the site (Rule 21b)
  - "Change Language" chosen on Settings › Website with "Setup" pressed
    last, which reopens on "Setup" › "Languages" (Rule 20a)
  - the Editor and the Production Editor while their role keeps "Permit
    changes to Settings", offered the same "Languages" tab as the
    Journal Manager of scenarios 4 to 7 (Actors row 4)
- **Register carries it**:
  - A1 (a change on the site's list unticking the submission languages
    the site has not enabled; Rule 3c)
  - A2 ("Reload defaults" offered to the Site Administrator alone;
    Actors row 5)
  - A3 (the block's links landing on the site's home on a site
    with a port; Rule 19; scenario 8 passes it)
  - A4 (a missing translation shown as its internal name; Rule 21a)
  - A5 (the "Forms" tick's script failures; Rule 10b; scenario 5 passes
    it)
  - A6 (two managers ticking the same language at the same moment;
    Side effects)
  - A7 (a journal created on a one-language site; Rule 8)
  - A8 (a press's and a preprint server's French "Author Guidelines" and
    checklist; Rule 10a)
  - A9 (two scripts of one language named alike in the block and in
    "Change Language"; Fields)
  - A10 (the site's home naming a journal in another of its languages
    under a new site primary language; Rule 4; scenario 3 passes it)
  - A11 (a browser listing only a regional code, such as "en-US";
    Settings bullet 5; scenario 6 names it)
  - A12 ("Change Language" on "Site Settings" naming the languages in
    the language being read; Fields)
  - A13 (a form language that is not an interface language getting
    empty email template boxes; Side effects; scenario 1 passes it)
  - OMP1 (the press's line under the site's list opening with an
    asterisk; Fields; scenario 1 names it)
- **Owned by another feature**:
  - every account but the Site Administrator refused Site Settings
    (Actors row 1; *[Site settings](U60-site-settings.md)*, scenario 1)
  - a role without the journal's Settings pages (Actors row 4; Settings
    bullet 4;
    *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*,
    scenario 2)
  - the "Submission Language" choice itself (Rule 15;
    *[Submission wizard](U21-submission-wizard.md)*, scenario 5)
  - a web feed, an OAI request and the sitemap read in another language
    (Rule 21; *[Web feeds](U18-web-feeds.md)*;
    *[OAI-PMH](U19-oai-pmh.md)*;
    *[Search-engine metadata & analytics](U20-search-engine-metadata-and-analytics.md)*,
    scenario 4)
  - the "Language Toggle Block" plugin disabled, as any block's plugin
    (Settings bullet 2;
    *[Appearance & theming](U10-appearance-and-theming.md)*, scenario 4)
  - the block in the site's "Sidebar" (Settings bullet 3;
    *[Site settings](U60-site-settings.md)*, scenario 9)
  - the discussion templates' texts in an installed language (Side
    effects; *[Tasks & discussions](U37-tasks-and-discussions.md)*)
  - the "Reviewer Recommendations" names in a new form or primary
    language (Side effects;
    *[Review setup & review forms](U29-review-setup-and-review-forms.md)*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-27), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | Any change on the site's "Languages" list unticks every journal's submission languages that the site has not enabled | 🐞 | user-visible | — |
| [A3](#a3) | On a site served on a port of its own, the "Language" block's links land on the site's home page | 🐞 | minor | — |
| [A5](#a5) | Ticking "Forms" makes the Settings page's script fail five times | 🐞 | invisible · crash: script | — |
| [A6](#a6) | Two managers adding the same form language at the same moment: one tick silently fails on the server | 🐞 | latent · crash: server | Jarda 2026-09-26 · risk accepted |
| [A7](#a7) | On a one-language site, each field typed on "Create Journal" makes the page's script fail | 🐞 | invisible · crash: script | — |
| [A8](#a8) | A press's or preprint server's French (Canada) guidelines, checklist, privacy statement and role names show internal codes | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A2](#a2) | "Reload defaults" is offered to the Site Administrator alone | ❓ | minor | — |
| [A4](#a4) | A text missing from a translation shows as its internal name, not in the primary language | ❓ | user-visible | — |
| [A9](#a9) | Two scripts of one language carry the same name, so a reader cannot tell their links apart | ❓ | minor | — |
| [A10](#a10) | With German the site's primary, the site's home once named a press in French | ❓ | minor | — |
| [A11](#a11) | A browser that lists only "en-US" opened a French-primary journal in French, not English | ❓ | minor | — |
| [A12](#a12) | "Change Language" on "Site Settings" names the languages in the language being read, not each in its own | ❓ | minor | — |
| [A13](#a13) | A form language that is not an interface language gets empty email template boxes, not the default texts | ❓ | minor | — |
| [OMP1](#omp1) | A press's site "Languages" list prints its own asterisk before "Marked locales may be incomplete." | ✅ | — | — |

### All apps

<a id="a1"></a>
**A1 — A site-level language change strips journals' submission languages** · 🐞 · user-visible.
A journal can accept submissions in any language of the world ("Add/Remove
Languages", Rule 14), including one the site has not enabled, such as
German on a site with English and French. When the Site Administrator then
installs, enables, disables or removes any language on the site's
"Languages" list, every such language loses its "Submissions" and
"Metadata" ticks on every journal: its row stays on "Submission Languages"
with both boxes empty (a "Default" radio included), "Make a Submission"
stops offering it, and no one is told. The Journal Manager expects the
site's interface languages and the journal's submission languages to be
independent, as the two lists say.
Since: 2024-03-21 (submission languages made independent of the site's) ·
Basis: probe. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — "Reload defaults" is for the Site Administrator only** · ❓ · minor.
The "Website Languages" rows offer "Reload defaults" to the Site
Administrator alone; for a Journal Manager, who may change every other box
on the tab, the rows carry no arrow at all.
Question: should a journal's managers be able to reload their own
journal's default texts? Lean: intended; the restriction is years old and
the action overwrites texts in bulk.
Basis: probe. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — The "Language" block loses the page on a site with a port** · 🐞 · minor.
On a site whose address carries a port number, such as
`http://example.org:8080`, choosing a language in the sidebar "Language"
block does not reopen the page the visitor was on: it lands on the site's
home page in the chosen language, and the visitor has to find the page
again (the journal's pages are then in that language). The same happens
with the block placed in the site's sidebar: a language chosen on the
site's Login page lands on the site's home. A site on the usual
web ports is not affected; "Change Language" on the editorial screens is
not affected.
Basis: probe. <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — Missing translations show internal names** · ❓ · user-visible.
Where a language's translation lacks a text, the screen shows the text's
internal name between hash signs ("##discussion.description##",
"##common.yetToBegin##") instead of the text in the primary language. A
reader of the French interface meets such names on the discussions panel
([Tasks & discussions](U37-tasks-and-discussions.md#a15)) and the "Users"
list ([Users management](U53-users-management.md#a11)), among others.
Question: should a missing text fall back to the primary language? Lean:
yes for readers; the internal names have always been shown and help
translators find gaps, but a reader cannot act on them.
Basis: probe. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — Ticking "Forms" breaks the page's script** · 🐞 · invisible · crash: script.
Each tick of a "Forms" box on Settings › Website saves and shows nothing
wrong, but the page's script fails five times ("Cannot read properties of
undefined (reading 'filter')") while it hands the new language to the
page's other forms. Nothing on screen shows the failure; the same tick in
the Settings wizard does not fail.
Basis: probe. <sup>[f-a5](#fn-a5)</sup>

<a id="a6"></a>
**A6 — Adding the same form language twice at once fails** · 🐞 · latent · crash: server.
When two journals tick the same language under "Forms", or under
"Submissions" (Rule 15a), at the same moment (two managers, or two
journals set up together), one of the two changes
fails on the server and is not saved. That manager's box shows unticked
again and nothing on the page says the change failed; ticked again, it
saves. A journal's managers meet it only by coincidence.
Basis: probe. <sup>[f-a6](#fn-a6)</sup>

> **Reviewed — Jarda Kotěšovec, 2026-09-26**: confirmed 🐞, risk accepted.
> Ruling: not a realistic problem for a journal; the test suites work
> around it, and it goes upstream only if it keeps firing with no
> reasonable test-side fix.

<a id="a7"></a>
**A7 — On a one-language site, "Create Journal" breaks the page's script** · 🐞 · invisible · crash: script.
When the site has one language, Administration › "Hosted Journals" ›
"Create Journal" ("Create Press", "Create Server") asks no languages, and
each change to one of its fields (the name, the initials, the contact,
the path, the country) makes the page's script fail once. Nothing shows
on screen and "Save" creates the journal; on a site with two languages the
same form does not fail.
Basis: probe. <sup>[f-a7](#fn-a7)</sup>

<a id="a8"></a>
**A8 — A press's or preprint server's French (Canada) guidelines, checklist, privacy statement and role names show internal codes** · 🐞 · medium.
On a press or preprint server that offers French (Canada), the French
"Submissions" page shows "##default.contextSettings.authorGuidelines##"
and "##default.contextSettings.checklist##" where the author guidelines
and the submission checklist should be. A French author starting "Make
a Submission" is asked to confirm the checklist under that code. A
preprint server's French "Privacy Statement" page is only
"##default.contextSettings.privacyStatement##", and its Moderator and
manager roles are named "##default.groups.name.sectionEditor##" and
"##default.groups.name.manager##" in French: on the "Editorial
Masthead", on Users & Roles › "Roles" and in the users list's "Roles"
column. A journal shows French texts.
The codes are saved into the press's or server's settings when it is
created with French or French is added, so they stay, and no one is
told. "Reload defaults" for French writes the texts' codes again over a
French text the manager typed. A manager can replace each one by typing
a French text or renaming the role.
Every press and server with French (Canada) has them, the default test
dataset's included. The same happens in other languages wherever the
application's own default texts are untranslated, journals included:
the guidelines and checklist of a press in Catalan or Russian, a
preprint server in Catalan, French (France) or Norwegian Bokmål as in
French (Canada), a journal in Greek or Vietnamese (the full list under
Cause).
The same fault: [Journal identity & about pages](U07-journal-identity-and-about-pages.md#ops3), [OPS4](U07-journal-identity-and-about-pages.md#ops4); [Users management](U53-users-management.md#ops1).
Basis: probe, 2026-10-01. <sup>[f-a8](#fn-a8)</sup>

<a id="a9"></a>
**A9 — Two scripts of one language carry the same name** · ❓ · minor.
Chinese written in simplified and in traditional characters (codes
"zh_Hans" and "zh_Hant") both read "Chinese/中文" on the site's and the
journal's "Languages" lists, where only "Code" tells them apart, and both
read "中文" in the sidebar "Language" block and in "Change Language",
where nothing does. Bosnian ("Bosnian/bosanski"), Serbian
("Serbian/српски") and Uzbek ("Uzbek/o‘zbek") are the same on the site's
list. A reader of a journal that offers both scripts cannot tell which
link is which.
Question: should each script's name say which script it is? Lean: yes; a
defect for readers.
Basis: probe. <sup>[f-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — The site's home once named a press in French** · ❓ · minor.
With German made the site's primary language, a first visit to the site's
home, in German, named the seeded press "Presse de la connaissance du
public", its French name, although the press's primary language is
English and it has no German name. The journal and the preprint server
showed their English names. Seen once, on a press only.
Question: when a journal's name has no text in the page's language, which
of its names should the site's home show? Lean: the journal's primary
language's, as on the journal's own pages; the French name looks like
the first stored name taken instead, a defect if it shows again.
Basis: probe. <sup>[f-a10](#fn-a10)</sup>

<a id="a11"></a>
**A11 — A browser that lists only "en-US" does not get English** · ❓ · minor.
On a journal whose primary language is French and which also offers
English, a first visit from a browser whose only preferred language is
English (United States), "en-US", opened in French, while one asking for
"en" opened in English. A browser asking for French (France) and then
French, "fr-FR, fr", opened a journal offering French (Canada) in French.
The match seems to go through the bare language code the browser lists,
so a browser that lists only a regional code gets the journal's primary
language.
Question: should a regional code alone ("en-US", "fr-FR") match the
journal's language of the same family? Lean: yes; not yet seen with
"fr-FR" alone, "en-US, en" or "en-CA" alone.
Basis: probe. <sup>[f-a11](#fn-a11)</sup>

<a id="a12"></a>
**A12 — "Change Language" on "Site Settings" names the languages in the reader's language** · ❓ · minor.
On a journal's editorial screens, on Administration's own page and on
"Hosted Journals", the initials menu's "Change Language" names each
language in itself ("English", "français"), so a reader finds their
own language whatever the page is in. On Administration › "Site
Settings" the same links read "English", "French" in English and
"anglais", "français" in French.
Question: should "Site Settings" name each language in itself, as
Administration's own page does? Lean: yes; a reader who cannot read the
current language has to recognise their own language's name in it.
Basis: test run. <sup>[f-a12](#fn-a12)</sup>

<a id="a13"></a>
**A13 — A form language alone gets empty email template boxes** · ❓ · minor.
A language ticked under "Forms" and not under "UI" gives "Edit Template"
(Settings › Workflow › "Emails") a button in that language, but its
"Name", "Subject" and "Body" boxes are empty ("1/2 languages
completed"), although the application's default texts in that language
are installed. Ticking the language under "UI" as well fills them. The
journal's own default texts (Rule 10a) arrive with the "Forms" tick
alone, so a Journal Manager who adds a form language to translate the
emails starts from empty boxes.
Question: should a form language's email templates show the
application's default texts whether or not it is an interface
language? Lean: yes; Rule 10a sets the expectation, and the texts
exist.
Basis: test run. <sup>[f-a13](#fn-a13)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press's line under the site's "Languages" list starts with an asterisk** · ✅ · —.
Under the site's "Languages" list, a press's installation reads "* Marked
locales may be incomplete.", where a journal's and a preprint server's
read "Marked locales may be incomplete."; the asterisks beside the
languages are the same. A wording difference in the press's own text.
Basis: probe. <sup>[f-omp1](#fn-omp1)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-27 at the checkouts' tips (ojs `3162c105bf`, omp
`72a01a026`, ops `e9f6f4f550`, all three on lib/pkp `1ad4a14bb2` and
ui-library `03d1cee2`). Every class named below is lib/pkp's; no app
subclasses a language list, its rows, its forms or the switching code
(RUNBOOK rule 8: one shared code path), and the apps differ only in the
locale texts the notes name. Every live probe below ran 2026-09-27 on
OJS, OMP and OPS unless its note names fewer apps.

<a id="fn-a"></a>
**a** — The site's list is `PKP\controllers\grid\admin\languages\AdminLanguageGridHandler`, mounted by `lib/pkp/templates/admin/settings.tpl` as the side tab `languages` (`common.languages` "Languages"), which `AdminHandler::siteSettingsAvailability()` shows whatever the number of journals (`'languages' => true`; a one-journal site was not driven, the test installs host dozens). Only `Role::ROLE_ID_SITE_ADMIN` is role-assigned, and `AdminHandler::authorize()` refuses any request made at a journal's address, so the list always runs at the site. Columns: `enable` (`common.enable` "Enable", `selectStatusCell.tpl`), `locale` (`grid.columns.locale` "Locale", `localeNameCell.tpl`, which appends `<span class="pkp_form_error">*</span>` when `incomplete`), `code` (`grid.columns.locale.code` "Code"), `sitePrimary` (`locale.primary` "Primary locale"); foot note `admin.locale.maybeIncomplete`; grid title `common.languages`. Names: `Site::getInstalledLocaleNames()` with `LocaleMetadata::LANGUAGE_LOCALE_WITH`, i.e. the name in the interface language, `common.withForwardSlash` "{$item}/{$afterSlash}", the name in itself (a country is added only when two installed locales share a language; a script never is, A9). "Incomplete" is `LocaleMetadata::isComplete()`, a completeness ratio below 0.9 against English. The branch of `_canManage()` (one journal on the site, a journal in the request, a manager role) that would add "UI" and "Forms" columns to this list is unreachable for the reason above (UNASSIGNED item 44). The test installs are installed with `installed_locales = en,fr_CA` (`shared/playwright/make-test-config.js`), both supported, English primary (seed-facts). "Working Languages": [User profile](U03-user-profile.md) Rule 7. Live-probed 2026-09-27 (Purpose; Actors rows 1–3; Fields, the site's list; Rules 1, 6): the list headed "Languages" with the columns "Enable", "Locale", "Code", "Primary locale", no button of its own, the rows "English/English" (enabled, primary) and "French/français *" (enabled); in the French interface "Langues", "anglais/English", "français/français *"; "French/français (Canada)" beside "French/français" once both were installed; with every offered language installed (81 rows on OJS, 71 on OMP and OPS) every row but English carried the asterisk; the English row had no arrow, every other row's arrow offered "Remove"; every roster account and a Production Editor typing the site's Settings address got "The current role does not have access to this operation."; an enabled German showed on a journal's "Website Languages", on the site's pages at `index/de`, as a "German" button on the site's forms and among "Working Languages", a disabled German in none of them.

<a id="fn-b"></a>
**b** — `AdminLanguageGridHandler::installLocale()` opens `PKP\controllers\grid\languages\form\InstallLanguageForm` (`templates/controllers/grid/languages/installLanguageForm.tpl`: `admin.languages.availableLocales` "Available Locales", `admin.languages.installNewLocalesInstructions`, overridden per app with "hosted journals"/"OJS", "hosted presses"/"OMP", "hosted servers"/"OPS", `admin.languages.noLocalesAvailable`, `common.save`). The offered list is `Locale::getFormattedDisplayNames(null, null, LANGUAGE_LOCALE_WITH, false)` (every locale folder the installation ships, the code appended in brackets) minus the installed ones. `saveInstallLocale()`: the form's `validate()` has no rule of its own, `execute()` adds each valid, not yet installed locale to the site's installed and supported lists, runs `Locale::installLocale()` and `Repo::editorialTask()->installTaskTemplates()`; then `_updateContextLocaleSettings()` re-saves every journal (Rule 3c) and the notice `notification.localeInstalled` shows, also after an empty "Save". A journal's "Website Languages" rows are `$site->getSupportedLocales()` (`ManageLanguageGridHandler::loadData()`), ticked from the journal's own lists. The leave question is the form handler's unsaved-changes check. Live-probed 2026-09-27 (Fields, the window; Rule 2): the window with the per-app sentence, boxes such as "German/Deutsch (de)", "Spanish/español (es)", "Arabic/العربية (ar)", no English or French (Canada), "Cancel" and "Save"; 79 boxes on OJS (among them "Unknown language/Unknown language (und)"), 69 on OMP and OPS; German ticked and saved: the window closed, "All selected locale(s) installed and activated.", the row enabled and not primary, a scratch journal's "Website Languages" with a German row, "UI" and "Forms" unticked; an empty "Save": the same notice, the list unchanged after a reload; with every language installed, the heading, the sentence and "No additional locales are available for installation." with no "Save"; closing the window with German ticked asked the leave question and installed nothing. On the test installs, hosting dozens of journals each, a "Save" took 13–27 s.

<a id="fn-c"></a>
**c** — `LanguageGridCellProvider::getCellActions()`, column `enable`: an enabled row's tick opens `RemoteActionConfirmationModal` with `admin.languages.confirmDisable` (per-app "hosted journals/presses/servers") titled `common.disable` "Disable", posting `disableLocale`; a disabled row's tick posts `enableLocale` directly. The modal's buttons are "OK" and "Cancel". Notices `notification.localeEnabled` "Locale enabled.", `notification.localeDisabled` "Locale disabled."; `disableLocale()` on the primary row answers the error notice `admin.languages.cantDisable` and changes nothing. `_updateLocaleSupportState()` saves the site's supported list and calls `_updateContextLocaleSettings()`, which for every journal intersects `supportedLocales`, `supportedFormLocales`, `supportedSubmissionLocales` and `supportedSubmissionMetadataLocales` with the site's supported list and sets `primaryLocale` to the site's primary when the journal's is outside it; `supportedAddedSubmissionLocales` and the default submission locale are left alone, so the "Submission Languages" row stays. Enabling again changes only the site's list. Live-probed 2026-09-27 (Actors row 2; Rules 3, 3a, 3b, 3c; Side effects): German's untick asked in a window titled "Disable" with "OK" and "Cancel"; "Cancel" left the box ticked after a reload; "OK" showed "Locale disabled."; German's row left a scratch journal's "Website Languages" while its "Submission Languages" row stayed with both boxes empty; a journal whose primary was German took English; ticked again: no question, "Locale enabled.", the journal's row back with every box unticked, its primary still English; English's untick asked the same question and after "OK" showed the Rule 3b notice, the box ticked after a reload; an install, a removal, a disable and an enable each emptied the boxes of a submission language the site lacks, with no notice on the journal's side.

<a id="fn-d"></a>
**d** — Column `sitePrimary` (`radioButtonCell.tpl`, `disabled` when the row is not supported); a non-primary row's radio opens `RemoteActionConfirmationModal` with `admin.languages.confirmSitePrimaryLocaleChange`, titled `locale.primary` "Primary locale", posting `setPrimaryLocale()`, which runs `Repo::user()->dao->changeSitePrimaryLocale($old, $new)` (for `givenName`, `familyName` and `preferredPublicName`: empty values in the new locale deleted, then the old locale's values copied where the new one has none), saves the site and shows `notification.primaryLocaleDefined` with the row's name. The site's pages use `Site::getPrimaryLocale()` when `Locale::getLocale()` finds no address language, session, cookie or browser match (note m). Live-probed 2026-09-27 (Rule 4; Side effects): German's radio asked in a window titled "Primary locale" with "OK" and "Cancel"; "Cancel" left the radios as they were; "OK" showed "German/Deutsch defined as primary locale."; a fresh browser preferring Japanese then opened the site's home at `index/de` in German, one preferring English at `index/en`, and the seeded journal stayed English; a throwaway account with English names only then had its English given and family names in the German boxes of Profile › "Identity", its preferred public name empty in both; English back: "English/English defined as primary locale."; a disabled German's radio was grayed out and a press did nothing.

<a id="fn-e"></a>
**e** — `LanguageGridRow::initialize()` adds `uninstall` (`grid.action.remove` "Remove", `RemoteActionConfirmationModal` `admin.languages.confirmUninstall`, per-app wording, titled "Remove") only for the Site Administrator, only without a journal in the request and only on a non-primary row. `uninstallLocale()` refuses the primary row, removes the locale from the site's installed and supported lists, calls `_updateContextLocaleSettings()`, `Locale::uninstallLocale()` (`emailTemplate\DAO::deleteEmailTemplatesByLocale()`: the locale's rows of `email_templates_settings`, every journal's edited texts, and of `email_templates_default_data`) and `Repo::editorialTask()->deleteTemplateLocaleData()`, then shows `notification.localeUninstalled` "{$locale} locale uninstalled." with the row's name. Live-probed 2026-09-27 (Actors row 3; Rule 5): the English row carried no arrow; German's "Remove" asked in a window titled "Remove" with "OK" and "Cancel"; "Cancel" kept the row after a reload; "OK" showed "German/Deutsch locale uninstalled.", the row gone after a reload and gone from two scratch journals' "Website Languages" (a "Submission Languages" row kept with empty boxes), "Install Locale" offering "German/Deutsch (de)" again; while German was primary, English's arrow offered "Remove" and German's row had none.

<a id="fn-f"></a>
**f** — The journal's tab is `lib/pkp/templates/management/website.tpl`, tab `setup` (`navigation.setup` "Setup"), side tab `languages` (`common.languages`), which loads `PKP\controllers\grid\settings\languages\ManageLanguageGridHandler` (title `manager.language.websiteLanguages` "Website Languages"; columns "Locale", "Code", `contextPrimary` "Primary locale", `uiLocale` `manager.language.ui` "UI", `formLocale` `manager.language.forms` "Forms"; OJS and OPS override the two keys with the same words) and `SubmissionLanguageGridHandler` (title `manager.language.submissionLanguages` "Submission Languages"; columns "Locale", "Code", `defaultSubmissionLocale` `common.default` "Default", `submissionLocale` `manager.language.submissions` "Submissions", `submissionMetadataLocale` `manager.language.submissionMetadata` "Metadata"; action `manager.language.gridAction.addLangauage` "Add/Remove Languages"). Both extend `LanguageGridHandler`, whose ops are role-assigned to `ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN` under `ContextAccessPolicy` and `CanAccessSettingsPolicy` (the settings-access gate of [Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)). The Settings wizard is `AdminHandler::wizard()` rendering `lib/pkp/templates/admin/contextSettings.tpl` (page heading `manager.settings.wizard` "Settings Wizard", tab `manager.setup`: "Journal Settings" OJS, "Setup" OMP, "Server Settings" OPS), whose `languages` side tab loads the same two lists with `context=$editContext->getPath()`; the row action is `ContextGridRow`'s `grid.action.wizard` "Settings wizard". Each cell is an `AjaxAction`: the change is saved on the click and a trivial notification shows at the top right; a refusal answers `JSONMessage(false, …)`, which `$.pkp.classes.Handler::handleJson()` shows with the browser's `alert()`. Live-probed 2026-09-27 (Actors row 4; Fields; Rule 7; Settings bullet 4): as the seeded journal's Journal Manager, "Website Languages" (French "UI" only; English primary, "UI" and "Forms"; the names without the site list's asterisk) above "Submission Languages" (English with "Default", "Submissions", "Metadata"); every change's notice "Locale settings saved." at the top right, no "Save" button; the Journal Manager, the Editor (OJS, OMP) and a Production Editor opened the tab, while the Section Editor, the assistants, the Reviewer, the Author, the Reader and an Editor or Production Editor with "Permit changes to Settings" off got "The current role does not have access to this operation." and no "Settings" in their side menu; in Settings › Users & Roles › "Roles" the Editor and Production Editor roles had the box ticked and the Section Editor's was unticked and grayed out; the Hosted Journals row arrow offered "Edit", "Remove", "Settings wizard", which opened "Settings Wizard" on "Journal Settings" / "Setup" / "Server Settings" with the side tab "Languages" holding the same two lists; a "Forms" tick there showed "Locale settings saved." and held on the journal's own tab; a Journal Manager typing the wizard's address got the refusal.

<a id="fn-g"></a>
**g** — `PKPContextService::add()`: `primaryLocale` defaults to the site's, `supportedLocales` to the site's supported list when the form sent none; `supportedFormLocales` is set to `[primaryLocale]`, `supportedDefaultSubmissionLocale` to the primary locale, and `supportedAddedSubmissionLocales`, `supportedSubmissionLocales` and `supportedSubmissionMetadataLocales` to `[default]`. The create form (`PKPContextForm`) adds "Languages" (`common.languages`) and "Primary locale" only when no journal is being edited and the site has more than one language; seed-facts has the form requiring both (2026-09-23, U07 claim check K2). The seeded journal: `apps/<app>/playwright/fixtures/bootstrap.js` `supportedLocales: ['en', 'fr_CA']`, primary `en`; seed-facts "`fr_CA` is a UI language but not a form language" (2026-09-03) and "A new context lists its primary language alone" (2026-09-24). Live-probed 2026-09-27 (Rules 8, 8a; A7): a journal created with English and French under "Languages" and English as "Primary locale" had both under "UI", English alone under "Forms" and on "Submission Languages" with its three ticks; created with English alone, a French row with nothing ticked; with French disabled on the site, the form asked neither "Languages" nor "Primary locale" and the journal had English under "Primary locale", "UI" and "Forms". A journal created with French under "UI" (on screen or through the test tooling) showed a signed-out visitor the French privacy statement and "For Readers", "For Authors", "For Librarians" texts at `…/fr_CA/about/privacy` and `…/fr_CA/information/…` while its "Privacy Statement" form had no language button, and its OJS reviewer recommendations had French names; one created with English alone and French ticked later under "UI" only showed the English text there and English recommendation names.

<a id="fn-h"></a>
**h** — "UI" posts `saveLanguageSetting` with `setting=supportedLocales`. The block and "Change Language" read the journal's `getSupportedLocales()`; addresses carry the language when `PKPPageRouter::_getContextAndLocales()` returns more than one (`PKPPageRouter::url()`); the alternate links are `PKPTemplateManager`'s `<link rel='alternate' hreflang=…>` headers under the same condition. Live-probed 2026-09-27 (Rule 9): on a scratch journal with English alone and the block placed, the bare home stayed bare, with no block, no alternate links and an initials menu opening with "Edit Profile"; French ticked under "UI" ("Locale settings saved."): the bare address landed on `…/en/index`, the block listed "English", "français", alternate links for en, fr-CA and x-default, the editorial addresses carried `/en/`, the menu opened with "Change Language"; French unticked: a visitor who had been reading in French got the bare home in English, `…/fr_CA/about` landed on `…/about`, and the block, the alternates and "Change Language" were gone.

<a id="fn-i"></a>
**i** — "Forms" posts `saveLanguageSetting` with `setting=supportedFormLocales`; on a tick it runs `PKPContextService::restoreLocaleDefaults()` (which also calls `Locale::installLocale()`) and `Repo::reviewerRecommendation()->setLocalizedDataOnNewLocaleAdd()`. The default texts are the context schema's multilingual props with a `defaultLocaleKey`: `authorGuidelines`, `authorInformation`, `beginSubmissionHelp`, `contributorsHelp`, `detailsHelp`, `forTheEditorsHelp`, `librarianInformation`, `openAccessPolicy`, `privacyStatement`, `readerInformation`, `reviewHelp`, `reviewerSuggestionsHelp` (OJS, OMP), `submissionChecklist`, `uploadFilesHelp`, plus `lockssLicense` and `clockssLicense` on OJS (`lib/pkp/schemas/context.json` and each app's `schemas/context.json`); `openAccessPolicy` and the two licenses have no box on any Settings page (Settings › Distribution holds "Publishing Mode"/"Posting Mode", "Enable OAI" and, on OJS, two LOCKSS/CLOCKSS enable boxes), and OJS's LOCKSS page prints the fixed English line "LOCKSS system has permission to collect, preserve, and serve this Archival Unit." at `/en/` and `/fr_CA/` alike. `restoreLocaleDefaults()` merges the default over the language's value, yet a text already typed survives the tick on screen: the grid's own save afterwards writes back the journal it loaded before, texts included (read, not traced further). The answer carries the global event `set-form-languages`, which `lib/ui-library/src/components/Container/Container.vue` hands to every form on the page; the "Date & Time" form's `FieldRadioInput.vue` then fails in `isInputSelected` (A5). Every "Forms" cell is live on every row (`supported` is always true on this list), whatever "UI" says. The older windows' per-language boxes are the form builder's multilingual fields. Live-probed 2026-09-27 (Rules 10, 10a, 10b): before the tick the "Privacy Statement" form had no language button; after it, "French" on "Privacy Statement", "Information", "Author Guidelines" and the rest, on the same page without a reload and after one, and "Date & Time" still took a click; the section window (OJS, OPS) and the navigation-item window gained a French title box; on a journal with French under "UI", English alone under "Forms", `…/fr_CA/about/privacy` showed the English text under French headings; French ticked under "Forms" without "UI" saved and the form gained "French", and "UI" unticked with "Forms" ticked saved too; the French privacy box held the French default on OJS and OMP (OPS: [U07 OPS3](U07-journal-identity-and-about-pages.md#ops3)), the author guidelines and wizard help texts were filled; "Notre politique." typed in the French "Privacy Statement" and saved stayed, on the form after a reload and on the public page, after French was unticked and ticked again under "Forms", after French (Canada) was added on "Submission Languages" and its "Submissions" ticked, and after "Metadata" was unticked and "Submissions" ticked again (two runs on each app). Test runs 2026-09-27 (Rule 10b; every run on each app, OPS also with "Privacy Statement" opened before the tick and not): without a reload the French "Privacy Statement" box was empty, "1/2 languages completed" under both boxes, while the journal already held the French default; after a reload the box held the French default (OJS, OMP) or `##default.contextSettings.privacyStatement##` (OPS).

<a id="fn-j"></a>
**j** — `LanguageGridHandler::setContextPrimaryLocale()` (an `AjaxAction`, no question): adds the locale to `supportedLocales` and `supportedFormLocales`, sets the primary locale, calls `setLocalizedDataOnNewLocaleAdd()` for the reviewer recommendations, and shows `notification.localeSettingsSaved`; it does not call `restoreLocaleDefaults()`. `saveLanguageSetting()` refuses unticking `supportedLocales` or `supportedFormLocales` on the primary locale with `notification.defaultLocaleSettingsCannotBeSaved`, shown by the browser's alert (note f). Live-probed 2026-09-27 (Rules 11, 12; Side effects): French's "Primary locale" pressed: no question, "Locale settings saved.", French ticked under "Primary locale", "UI" and "Forms", English keeping its boxes; Settings › Journal › "Masthead" then offered "English" as the other language and "Save" with the French title empty was refused with "This field is required."; a first visit from a browser preferring German landed on `…/fr_CA/index`; unticking "UI" or "Forms" on the primary row raised the alert "The language setting could not be saved. All options need to be enabled." and the box stayed ticked after a reload; on a journal created with English alone, French made primary left the French "Privacy Statement" box empty, and the OJS reviewer recommendations turned French.

<a id="fn-k"></a>
**k** — `LanguageGridRow::initialize()` adds `reload` (`manager.language.reloadLocalizedDefaultSettings` "Reload defaults", `RemoteActionConfirmationModal` `manager.language.confirmDefaultSettingsOverwrite`, per-app "journal/press/server settings", titled "Reload defaults") only when `Validation::isSiteAdmin()` and a journal is in the request; with no action a row gets no arrow. `ManageLanguageGridHandler::reloadLocale()` is role-assigned to managers too but nothing links it for them (A2). `reloadLocale()` runs `restoreLocaleDefaults()` and shows `notification.localeReloaded` "{$locale} locale reloaded for {$contextName}.". Live-probed 2026-09-27 (Actors row 5; Fields; Rule 13; A2): the Site Administrator's rows carried an arrow offering "Reload defaults", on the journal's tab and in the Settings wizard; the rows of the Journal Manager, the Editor and a Production Editor carried no arrow; "Our own policy." typed in the English "Privacy Statement" and saved; "Reload defaults" on English asked in a window titled "Reload defaults" with "OK" and "Cancel"; "Cancel" sent nothing; "OK" showed "English/English locale reloaded for {journal name}." and the English "Privacy Statement" read the default text after a reload.

<a id="fn-l"></a>
**l** — `SubmissionLanguageGridHandler::loadData()` lists `supportedAddedSubmissionLocales`, named by `Locale::getSubmissionLocaleDisplayNames()` (the Weblate language list, every language of the world) as "{name}/{name in itself}"; rows are plain `GridRow`s with no action. "Add/Remove Languages" opens `AddLanguageForm` (`templates/controllers/grid/languages/addLanguageForm.tpl`: `admin.languages.availableLocales`, `manager.language.submission.form.description`, labels "[ {code} ] {name}", the current ones checked); `validate()` refuses an empty choice with `manager.language.submission.from.error`; `execute()` drops unticked languages from the three lists and, when the default was dropped, makes the first of the sorted codes the default and adds it to both lists; the notice is `notification.submissionLocales`. In `saveLanguageSetting()`: a `supportedSubmissionLocales` tick adds the locale to `supportedSubmissionMetadataLocales` when missing and then runs `restoreLocaleDefaults()`; a `supportedSubmissionMetadataLocales` untick also removes it from `supportedSubmissionLocales`; unticking either on the default locale answers `notification.defaultLocaleSettingsCannotBeSaved`. `setDefaultSubmissionLocale()` adds the locale to both lists. The wizard's choice is `StartSubmission::addLanguage()`, shown with two or more submission languages; `Repo::submission()->add()` gives a submission without a language the default one. Live-probed 2026-09-27 (Fields; Rules 14–16): the window titled "Add/Remove Languages", "Available Locales", "Select submission and metadata languages.", 799 boxes such as "[ de ] German" and "[ fr_CA ] French (Canada)", the listed ones ticked, "Cancel" and "Save"; German and French (Canada) saved: "Submission locales updated.", the rows "German/Deutsch" and "French (Canada)/français (Canada)" with nothing ticked; an empty "Save" showed "At least one locale needs to be selected." at the top right with the window still open and the list unchanged; closing the window with a box changed asked the leave question and saved nothing; German's "Submissions" ticked "Metadata" too, "Metadata" unticked took "Submissions" with it, "Submissions" unticked left "Metadata"; the Default row's untick raised the Rule 12 alert; French (Canada) as the Default unticked in the window made German the Default with both boxes, English not; German's "Default" pressed ticked both its boxes; with English and German under "Submissions", "Make a Submission" asked "Submission Language" with "German" and "English", neither preselected, and a submission begun in English offered German boxes on its Details step; with German alone the wizard asked nothing.

<a id="fn-m"></a>
**m** — Addresses: `PKPPageRouter::url()` adds `_getLocaleForUrl()` after the journal's path when `_getContextAndLocales()` lists more than one locale (the site's list for the site's own pages). `PKPPageRouter::_setLocale()` redirects a bare address, an address whose language the journal does not support and, on a one-language journal, an address with a language to the same path with the language `Locale::getLocale()` picks (or none), and stores the language of a well-formed address in the session and the `currentLocale` cookie; a segment that is no known locale code is not read as a language at all, so the page handler gets it and answers 404. `Locale::getLocale()` picks, in order: the address's language when supported, the session's, the `currentLocale` cookie, `getPreferredLocale()` (the browser's Accept-Language matched against the journal's languages, the primary first); `setLocale()` falls back to the primary language for anything unsupported. Live-probed 2026-09-27 (Rules 17, 18; Settings bullet 5): on a two-language journal every public and editorial address carried `/en/`, the site's pages `/index/en/…`; a bare address landed on `/en/` in a fresh English browser and on `/fr_CA/` after a French visit; `…/fr_CA/about` switched the visit, on another journal of the site and the site's home too; `/de/`, `/es/`, `/ja/` forwarded to the same page in the Rule 18 language; `/fr_FR/` and `/xx/` showed "404 Not Found"; a one-language journal forwarded `/en/`, `/fr_CA/` and `/de/` to the bare address; `/en/about` with French remembered read English; a French choice held across signing in and out, a new tab and a browser reopened with only its lasting cookies (the choice rides the 30-day session cookie; a fresh browser signing in as the same account read the primary language); browsers preferring English, French (Canada), Japanese, "ja, fr-CA, en" and "de, en" read English, French, the primary, French and English; "fr-FR, fr" read French (Canada); a one-language journal read English whatever the browser. A remembered language the journal does not offer was driven at the one-language end only.

<a id="fn-n"></a>
**n** — `plugins/blocks/languageToggle/templates/block.tpl` (identical in the three apps): shown when `enableLanguageToggle` (more than one locale), heading `common.language` "Language", one `<li>` per locale with the class `current` on the language being read (it changes nothing on screen), each link `user/setLocale/{code}?source={server name}{request address}`. `LanguageToggleBlockPlugin::getContents()` names the journal's (or, at the site, the site's) supported locales with `LANGUAGE_LOCALE_ONLY`, each in its own language; OMP's copy differs only in the installer's session-less branch. `PKPPageRouter::_setLocale()` rebuilds the return address from `source` and falls back to the site's `/index/{code}` when that address does not start with the installation's own base address (A3). Live-probed 2026-09-27 (Fields; Rule 19): the heading "Language" ("Langue"), the links "English" then "français", the two entries alike in every computed style; the block on the home, About, Search, Login and Register pages and the Archive (OJS) or Catalog (OMP), signed out and as a Reader; nothing on a one-language journal or where the block is not placed; the seeded journal has none placed; Chinese installed in both scripts and ticked under "UI" on a scratch journal: "中文" twice in the block and in "Change Language", "Chinese/中文" twice on the journal's list.

<a id="fn-o"></a>
**o** — `lib/ui-library/src/components/TopNavActions/TopNavActions.vue`: when `getSupportedLocalesList()` has more than one entry, the menu opens with `common.changeLanguage` "Change Language" and one link per locale, the `Complete` icon beside `currentLocale`; each link is `user/setLocale/{code}?source=` followed by the page's own address, not encoded. The list is `pkp.context.supportedLocales`, which `PKPTemplateManager` fills with the journal's `getSupportedLocaleNames(LANGUAGE_LOCALE_ONLY)`, or the site's on the site's pages, named there in the interface language. [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md) Rule 28 lists the menu. The Website Settings page turns `#setup/languages` into `#languages` on a reload, and `…/website#languages` opens on "Appearance". Live-probed 2026-09-27 (Fields; Rule 20; Actors row 6): for the Journal Manager, the Section Editor, an assistant, the Reviewer, the Author and the Site Administrator on a journal, the menu opened with "Change Language" ("Changer la langue"), "English", "français", the tick beside the language being read; on Site Settings "English", "French" in English and "anglais", "français" in French (the French reading on OMP and OPS); choosing reopened the same Dashboard view, the same workflow, Profile and Site Settings in the chosen language; from Settings › Website › "Setup" › "Languages" the page reopened on "Appearance" › "Theme"; a one-language journal's menu opened with "Edit Profile"; a Reader signed in onto the public home, was refused the Dashboard's "My Submissions", and found "Change Language" in Profile's menu. Test runs 2026-09-27 (Fields; Rules 20, 20a; A12): on Administration (`index/en/admin`) the menu read "Change Language", "English" (ticked), "français", and after "français" was chosen (`index/fr_CA/admin`) "Changer la langue", "English", "français" (ticked), on the three apps; "Hosted Journals" the same, Site Settings "English", "French" (three apps), in French "anglais", "français" (OPS). On OPS, three runs and a by-hand read: the menu's link carries the page's address with its fragment; chosen after "Setup" was pressed (`…/website#setup`) the page reopened on "Configuration" › "Langues", after "Languages" was pressed (`…/website#languages`) or before any fragment on "Apparence" › "Thème". The mechanism is the shared Website page, so OJS and OMP read alike (not driven with "#setup" there).

<a id="fn-p"></a>
**p** — Application texts come from the language's translation files through `Locale::translate()`; the editorial screens load theirs from `api/v1/_i18n/ui.js?hash=…` (`PKP\API\v1\_i18n\I18nController`, public, cached a year, the hash changing with the language's texts). A key missing from the language's bundle returns `'##' . $key . '##'`; no fallback to another language is tried (a missing-key handler is set only while email texts are installed). Live-probed 2026-09-27 (Rules 21, 21a): the public menus in French ("Numéro courant", "Archives", "À propos" on OJS; "Catalogue", "À propos" on OMP; "Archives", "À propos" on OPS) and the About headings in French; the seeded journal's Journal Manager in French saw "Assignées à moi (0)" and the side menu "Tableau de bord éditorial", "Résultats de recherche", "Assignées à moi"; the "Users" search read "##userAccess.search##" in French, the workflow "##discussion.description##", "##common.yetToBegin##", "##common.closed##", with no English stand-in; German's "Tasks and Discussions" tab read "##taskTemplates.title##" and an Arabic OPS home "##index.latestPreprints##". Also seen in French: [Tasks & discussions](U37-tasks-and-discussions.md#a15), [Users management](U53-users-management.md#a11), [Site settings](U60-site-settings.md#a2).

<a id="fn-q"></a>
**q** — `PKPTemplateManager` assigns `currentLocaleLangDir` from `LocaleMetadata::isRightToLeft()`, and the editorial pages receive the journal's right-to-left languages as `rtlLocales`. Live-probed 2026-09-27 (Rule 21b): with Arabic installed and ticked under "UI" on a scratch journal, the journal's `/ar` home had `lang="ar"` and a right-to-left body, the sidebar at the left and the main column at the right (the reverse in English), and the editorial Settings page in Arabic ran right to left too; `<html>` carries no `dir`, the direction comes from the body's style. Arabic was removed after.

<a id="fn-r"></a>
**r** — `Locale::installLocale()` runs `emailTemplate\DAO::installEmailTemplateLocaleData()` for the locale (deletes and re-inserts the site-wide default rows of `email_templates_default_data`) and the `Locale::installLocale` hook; `InstallLanguageForm::execute()` adds `Repo::editorialTask()->installTaskTemplates()`; removal is note e, whose `deleteTemplateLocaleData()` also deletes the discussion templates' texts in the language (not visible on screen: the default names return after a reinstall either way, and an edited template name was not driven). The "Forms" tick, the "Submissions" tick of Rule 15a and "Reload defaults" call `restoreLocaleDefaults()`, which calls `Locale::installLocale()` again, and the "Forms" tick adds the reviewer recommendations' names (the code runs for OJS and OMP, but OMP's Settings › Workflow › "Review" shows no recommendations list, only "Setup", "Reviewer Guidance" and "Review Forms"; OPS has none). [Emails management](U56-emails-management.md) Rule 20 shows one text per form language. Live-probed 2026-09-27 (Side effects): before German was a form language, "Submission Confirmation" (OPS "Submission Acknowledgement (Pending Moderation)") › "Edit Template" offered English alone; with German ticked under "UI" and then "Forms", a "German" button with the German subject "Vielen Dank für Ihre Einreichung bei {$contextName}" and body; with German under "UI" the discussion templates carried German names; "Unser Text." typed in the German body stayed through an untick and re-tick of "Forms"; German removed, installed again and ticked under "UI" and "Forms": the default German body was back. With "Forms" alone the German boxes are empty (A13, note f-a13).

<a id="fn-s"></a>
**s** — Scenario seeding. Every scenario runs on OJS, OMP and OPS. The Site Administrator is the installer's `admin` (password `admin`, `docs/process/users.md`); every other account is a throwaway `users[]` entry of `POST scenarios/context` (password the username twice, email `<username>@mail.test`), and every scratch journal (press, preprint server) comes from the same request, its languages set with `context.supportedLocales` ("UI"), `context.supportedFormLocales` ("Forms"), `context.supportedSubmissionLocales` ("Submissions" and "Metadata") and `context.primaryLocale`, and the block placed with `sidebar: ['languagetoggleblockplugin']` (scenarios.md). A context created without `supportedFormLocales` has its primary language alone under "Forms"; created with French under "UI" it already holds the French default texts (Rule 8a, note g), so scenarios 4 to 7 seed `supportedLocales: ['en']` and scenario 8 `['en', 'fr_CA']`. Scenarios 1 to 3 change the site's language list, which every journal of the install reads (Rules 3a, 3c): each is `@solo` (harness.md "Project chain") and puts back what it changed in a `finally`, even when it fails midway (German removed; in scenario 3, English made the site's primary language again first). No harness key installs a language, so scenarios 2 and 3 install German through the "Install Locale" window before their steps and seed their German journals after it; a site change takes 13–27 s on the test installs (note b). Scenario 1: one scratch journal with a `manager`; the email is "Submission Confirmation" on OJS and OMP and "Submission Acknowledgement (Pending Moderation)" on OPS (note r). Scenario 2: the first journal with `supportedLocales`, `supportedFormLocales` and `supportedSubmissionLocales` `['en', 'de']`, the second with `primaryLocale: 'de'` and `supportedLocales: ['de', 'en']`. Scenario 3: a scratch journal whose `reader` is Nora Lindqvist (`givenName` Nora, `familyName` Lindqvist, stored under English); her site-level Profile is `index/user/profile`; the two visitors are browser contexts sending `Accept-Language` `ja` and `en`. Scenario 6's visitors send `de` and `en`. Scenario 7 adds an `author` to the `manager`; scenarios 5 and 7 both tick French (Canada) early and run one after the other, not at once (A6, note f-a6); scenario 8 has a `reader` and a `manager`. Scenario 9 reads `publicknowledge` as seeded: English primary, English and French (Canada) under "UI", no block placed in its "Sidebar" (live-probed 2026-09-27, three apps). The test browser's own language is "en-US" (note f-a11), which reads English on every English-primary journal. {journal address} is `…/index.php/{path}`; the site's pages are `…/index.php/index/…`. A preprint server's French privacy statement (scenarios 5 and 8) is [Journal identity & about pages](U07-journal-identity-and-about-pages.md#ops3)'s OPS3.

<a id="fn-t"></a>
**t** — "Language Toggle Block" (`plugins.block.languageToggle.displayName`), `plugins/blocks/languageToggle/settings.xml` installs `enabled` true for the site and every new journal; no box of "Sidebar" is ticked on a new journal ([Appearance & theming](U10-appearance-and-theming.md), Rules 23–25) or on the site ([Site settings](U60-site-settings.md) Rule 20). The browser language: `Locale::getPreferredLocale()` (note m). Live-probed 2026-09-27 (Settings bullets 1–3): a new journal's "Sidebar" offered "Language Toggle Block" unticked; the plugin row "Language Toggle Block — This plugin provides the sidebar language toggler." arrived ticked, and unticking it asked "Are you sure you want to disable this plugin?", showed "The plugin "Language Toggle Block" has been disabled." and took the block out of "Sidebar" and off the pages; enabled again, the block was back in its place; the site's "Sidebar" offered the block alone, unticked; placed and saved, the site's home showed "Language" with "English", "français" ("Langue" in French).

<a id="fn-a1"></a>
**f-a1** — `AdminLanguageGridHandler::_updateContextLocaleSettings()`, run by `saveInstallLocale()`, `uninstallLocale()` and `_updateLocaleSupportState()`, intersects each journal's `supportedSubmissionLocales` and `supportedSubmissionMetadataLocales` with the site's supported list; `supportedAddedSubmissionLocales` and `supportedDefaultSubmissionLocale` are left alone, so the row stays with both boxes empty. The metadata list joined the intersection in pkp/pkp-lib `7781b8a799` "Make submission language selection and metadata forms independent from website language settings" (2024-03-21), the change that let "Add/Remove Languages" offer every language. Live-probed 2026-09-27: German, not installed on the site, added through "Add/Remove Languages" and ticked under "Submissions": "Make a Submission" asked "Submission Language" with "German", "English"; after the site installed Spanish, German's row stayed with both boxes empty and the start page asked no language; the same after a removal, a disable and an enable; with German made the "Default" first, it kept the "Default" with both boxes empty. What a new submission then gets as its language was seen once and not settled.

<a id="fn-a2"></a>
**f-a2** — `LanguageGridRow::initialize()` guards both row actions with `Validation::isSiteAdmin()`, unchanged since pkp/pkp-lib `2ac16d58aa` (2020-07-10) at least; `ManageLanguageGridHandler` role-assigns `reloadLocale` to `ROLE_ID_MANAGER` as well, so the restriction is the link's alone (code only; the request was not sent as a manager). Code read 2026-09-27. Live-probed 2026-09-27: note k.

<a id="fn-a3"></a>
**f-a3** — Seen 2026-09-24 (U09 claim check K1, three apps: from a custom page and from "About the Journal" the links landed on `index.php/index/<locale>`) and 2026-09-25 (U18 claim check K1: "français" linked to the host without the port and landed on `/index.php/index/fr_CA`; back on the journal the pages were French). Live-probed 2026-09-27 (three apps): the links carry `source=127.0.0.1/index.php/…` without the port; chosen from About, from a search result and, with the block in the site's sidebar, from the site's Login page, "français" landed on `/index.php/index/fr_CA`. Cause, read from the code: the block builds `source` from `SERVER_NAME` and the request address, which carry no port, so `PKPPageRouter::_setLocale()` cannot strip the installation's base address (with its port) from it and falls back to `/index/{code}`; "Change Language" passes the full page address and is not affected. The test installs serve on their own ports; a site on the usual ports was not driven.

<a id="fn-a4"></a>
**f-a4** — `Locale::translate()` (note p). The `##…##` form of a missing text is PKP's long-standing one. Seen: [Tasks & discussions](U37-tasks-and-discussions.md#a15), [Users management](U53-users-management.md#a11), [Site settings](U60-site-settings.md#a2), all in the French interface; live-probed 2026-09-27 (note p).

<a id="fn-a5"></a>
**f-a5** — Seen 2026-09-24 (U09 claim check K1, K1-6, three apps): each tick saved and five errors "TypeError: Cannot read properties of undefined (reading 'filter') at Proxy.isInputSelected" were logged. Live-probed 2026-09-27 (three apps): five per tick on Settings › Website, also for a tick without "UI" and a re-tick; none for the same tick in the Settings wizard. Test runs 2026-09-27 (OPS): five per tick again, logged while the "Privacy Statement" tab of Rule 10b showed its empty French box. The cause is in note i.

<a id="fn-a6"></a>
**f-a6** — Seen 2026-09-26 on OJS and OPS: 5 of 42 journals created at the same moment with French as a form language (the test tooling's path, which is the "Forms" tick's) answered a server error. Live-probed 2026-09-27: two scratch journals, one Journal Manager each, the second browser on the install's second server process, both "Forms" boxes pressed together, four rounds per pair, three pairs: one side's `POST …/grid/settings/languages/manage-language-grid/save-language-setting?rowId=fr_CA&setting=supportedFormLocales&value=1` answered 500 in 5 of 12 rounds on OJS, 9 of 12 on OMP and 7 of 12 on OPS; that side showed no notice and no alert, its box unticked, still unticked after a reload; the other side saved. `Locale::installLocale()` → `installEmailTemplateLocaleData()` deletes and re-inserts the site-wide default email rows of the language outside a transaction, so two at once meet the unique key of `email_templates_default_data`. The same call runs on "Install Locale", the "Submissions" tick of Rule 15a and "Reload defaults". Seen again 2026-09-27 in an OPS test run, on the "Submissions" tick: two scratch servers ticked French (Canada) under "Submissions" a second apart; one's `POST …/grid/settings/languages/submission-language-grid/save-language-setting?rowId=fr_CA&setting=supportedSubmissionLocales&value=1` answered 500 (`duplicate key value violates unique constraint "email_templates_default_data_unique"`), the other's 200. Each tick installs the language's default email texts again, whether or not the site already carries them, so a language installed once beforehand does not prevent it.

<a id="fn-a7"></a>
**f-a7** — Live-probed 2026-09-27, two runs, three apps: with French disabled on the site (English the one language), each field change on the Hosted Journals create form logged "TypeError: Cannot read properties of undefined (reading 'includes') at Proxy.submitValues" once, six per filled form, none on opening it or on "Save"; the same form on the two-language site logged none. The form then has no language fields (note g); the failing code was not traced further.

<a id="fn-a8"></a>
**f-a8** — `omp/locale/fr_CA/default.po` and `ops/locale/fr_CA/default.po` carry `default.contextSettings.authorGuidelines` and `default.contextSettings.checklist` with empty texts, which `Locale::translate()` answers as the internal name (note p); `ojs/locale/fr_CA/default.po` has both. Code read 2026-09-27. Live-probed 2026-09-27 (OMP, OPS; OJS the control): after a French "Forms" tick and on a press or server created with French under "UI", the French "Author Guidelines" and checklist boxes held the internal names, and `…/fr_CA/about/submissions` showed them, on the seeded press and server too.
Issue report: [docs/issues/U57-A8-french-default-texts-stored-as-codes.md](../issues/U57-A8-french-default-texts-stored-as-codes.md).

<a id="fn-a9"></a>
**f-a9** — Names: note a (a country is added when two installed locales share a language, a script never is) and note n (`LANGUAGE_LOCALE_ONLY`). Live-probed 2026-09-27: Chinese installed in both scripts and ticked under "UI" on a scratch journal: "Chinese/中文" twice on the journal's list (codes `zh_Hans`, `zh_Hant`), "中文" twice in the block and in "Change Language"; the site's list with every language installed: "Bosnian/bosanski" (`bs`, `bs_Latn`), "Serbian/српски" (`sr`, `sr_Cyrl`), "Uzbek/o‘zbek" (`uz`, `uz_Latn`).

<a id="fn-a10"></a>
**f-a10** — Live-probed 2026-09-27, once, on OMP: with German the site's primary language, a fresh browser preferring Japanese opened the site's home at `index/de`, which named the seeded press "Presse de la connaissance du public" (the press holds English and French names, primary English); OJS and OPS showed their English names. Not repeated; a second reading of the site's home with German primary would settle it.

<a id="fn-a11"></a>
**f-a11** — `Locale::getPreferredLocale()` hands the journal's languages, primary first, to the request's preferred-language match (note m). Live-probed 2026-09-27, one run each, three apps: on a scratch journal with French primary and English offered, `Accept-Language: en-US` (the test browser's default) landed on `…/fr_CA/index` and `en` on `…/en/index`; on the seeded journal `fr-FR,fr;q=0.9` landed on `/fr_CA/`. Not driven: "fr-FR" alone, "en-US, en", "en-CA" alone.

<a id="fn-a12"></a>
**f-a12** — Test runs 2026-09-27: the OJS, OMP and OPS suites' scenario 1 read Administration (`index/en/admin`) as "Change Language", "English" (ticked), "français" and, after "français" was chosen, "Changer la langue", "English", "français" (ticked); by-hand reads the same day: "Hosted Journals" the same on the three apps, Site Settings (`index/en/admin/settings`) "English", "French" on the three apps and, in French, "Changer la langue", "anglais", "français" (ticked) on OPS (OMP and OPS in the earlier live probe, note o). The menu's names come from `pkp.context.supportedLocales` (note o); why Administration's own page differs was not traced.

<a id="fn-a13"></a>
**f-a13** — `emailTemplate\DAO::fromRow()` joins the default texts of `email_templates_default_data` only in the journal's `supportedLocales` (the "UI" list), while the window's language buttons follow `supportedFormLocales`. Code read 2026-09-27. Test runs 2026-09-27 (three apps, scenario 1 with German ticked under "Forms" alone): the "German" button present, the German subject and body empty on the first open, before anything was typed, and again after German was removed and installed again, while the install had written the German default rows ("Vielen Dank für Ihre Einreichung bei {$contextName}"); by-hand reads the same day (OJS with German, OPS with French (Canada) on three scratch servers): "Forms" alone gave empty boxes and the email's API answer a null French subject; "UI" then "Forms", or a server created with the language under both, gave "Accusé de réception de la soumission à {$contextName}" and the German "Guten Tag {$recipientName}, …".

<a id="fn-omp1"></a>
**f-omp1** — `admin.locale.maybeIncomplete`: `omp/locale/en/admin.po` "* Marked locales may be incomplete.", `ojs/locale/en/admin.po` and `ops/locale/en/admin.po` "Marked locales may be incomplete.". Code read 2026-09-27. Live-probed 2026-09-27: the lines as quoted under the site's list, the asterisks beside the languages the same; OMP's French line also opens with one ("*Les paramètres marqués pourraient être incomplets.").

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The site's "Languages" list: "Enable" boxes and "Primary locale" radios | Administration › "Site Settings" › "Site Setup" › "Languages" | AFFM-217 · GRID-005 |
| "Install Locale" window | the same list, "Install Locale" | AFFM-214 · GRID-005 |
| A site row's "Remove" | the same list, a row's arrow | AFFM-215 · GRID-005 |
| A site row's "Reload defaults" | never offered on the site's list (the action needs a journal; UNASSIGNED item 44) | AFFM-216 |
| "Website Languages": "Primary locale" radios | Settings › Website › "Setup" › "Languages" | AFFM-023 · GRID-043 · GRID-036 |
| "Website Languages": "UI" and "Forms" boxes | the same list | AFFM-024 · GRID-043 · GRID-036 |
| "Website Languages": a row's "Reload defaults" | the same list, a row's arrow (Site Administrator) | AFFM-025 · GRID-043 |
| "Submission Languages": "Add/Remove Languages" window | Settings › Website › "Setup" › "Languages", second list | AFFM-026 · GRID-044 |
| "Submission Languages": "Default" radios, "Submissions" and "Metadata" boxes | the same list | AFFM-027 · GRID-044 · GRID-036 |
| The Settings wizard's "Languages" side tab | Administration › "Hosted Journals" › a row's arrow › "Settings wizard" | AFFM-199 |
| The sidebar "Language" block | every public page, when placed | AFFR-089 · PLUG-004 |
| "Change Language" | the editorial header's initials menu | (with U08's header) |
| The editorial screens' texts in the reading language | loaded by every editorial page | API-003 |
| An address with a language | `{journal}/{code}/…`, `index/{code}/…` | — |

## Reference — code anchors

- Site list: `lib/pkp/controllers/grid/admin/languages/AdminLanguageGridHandler.php` (GRID-005) · `lib/pkp/templates/admin/settings.tpl` · `lib/pkp/pages/admin/AdminHandler.php` (`siteSettingsAvailability()`, `authorize()`, `wizard()`)
- Shared grid layer: `lib/pkp/controllers/grid/languages/LanguageGridHandler.php` (GRID-036) · `LanguageGridRow.php` · `LanguageGridCellProvider.php` · `form/InstallLanguageForm.php` · `form/AddLanguageForm.php` · `lib/pkp/templates/controllers/grid/languages/{installLanguageForm,addLanguageForm,localeNameCell}.tpl`
- Journal lists: `lib/pkp/controllers/grid/settings/languages/ManageLanguageGridHandler.php` (GRID-043) · `SubmissionLanguageGridHandler.php` (GRID-044) · `lib/pkp/templates/management/website.tpl` · `lib/pkp/templates/admin/contextSettings.tpl` · `lib/pkp/controllers/grid/admin/context/ContextGridRow.php`
- Context and site data: `lib/pkp/classes/services/PKPContextService.php` (`add()`, `validate()`, `restoreLocaleDefaults()`) · `lib/pkp/classes/context/Context.php` · `lib/pkp/classes/site/Site.php` · `lib/pkp/classes/user/DAO.php::changeSitePrimaryLocale()` · `lib/pkp/classes/emailTemplate/DAO.php` · `lib/pkp/schemas/context.json` and each app's `schemas/context.json`
- Locale machinery: `lib/pkp/classes/i18n/Locale.php` (`getLocale()`, `translate()`, `installLocale()`, `uninstallLocale()`, `getPreferredLocale()`) · `lib/pkp/classes/i18n/LocaleMetadata.php` · `lib/pkp/classes/core/PKPPageRouter.php` (`url()`, `_setLocale()`, `isAllowedHost()`) · `lib/pkp/classes/core/Core.php::getLocalization()`
- Switching: `plugins/blocks/languageToggle/` in each app (PLUG-004, AFFR-089) · `lib/ui-library/src/components/TopNavActions/TopNavActions.vue` · `lib/pkp/classes/template/PKPTemplateManager.php` (`pkp.context.supportedLocales`, the alternate links, `currentLocaleLangDir`)
- Editorial texts: `lib/pkp/api/v1/_i18n/I18nController.php` (API-003)
- Form languages on a page: `lib/ui-library/src/components/Container/Container.vue` (`set-form-languages`) · `lib/ui-library/src/components/Form/fields/FieldRadioInput.vue`
- Submission side: `lib/pkp/classes/components/forms/submission/StartSubmission.php::addLanguage()` · `lib/pkp/classes/submission/Repository.php::add()`
- Locale texts: `lib/pkp/locale/en/{common,admin,manager,grid}.po`; app overrides in `{ojs,omp,ops}/locale/en/{admin,manager}.po` (`admin.languages.installNewLocalesInstructions`, `admin.languages.confirmDisable`, `admin.languages.confirmUninstall`, `admin.locale.maybeIncomplete`, `manager.language.confirmDefaultSettingsOverwrite`, `manager.language.ui|forms|submissions`)
