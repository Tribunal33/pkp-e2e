---
name: subscriptions
status: verified
---

# Subscriptions & open access control {OJS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal decides whether readers pay for its content. Its **"Publishing
Mode"** says which: open access for everyone, subscriptions required for
some or all of it, or no online publishing at all. A journal that
requires subscriptions sells **subscriptions**, each of a **subscription
type** (a name, a price, a duration and a format): an **individual
subscription** belongs to one reader, who signs in to use it; an
**institutional subscription** belongs to an institution, and anyone
reaching the journal from the institution's network addresses uses it
without signing in. The Journal Manager, the Editor, the Production
Editor or a **Subscription Manager** (a role that exists for this job
alone) keeps the subscription types, the subscribers and the
subscription policies on the **"Payments"** page; readers see the offer
on the journal's **"Subscriptions"** page, buy through the journal's
payment method and follow their own subscriptions on **"My
Subscriptions"**. On such a journal an issue's articles are
**restricted** (its galleys, the files a reader downloads, closed to
readers without a subscription; Rule 11 says who else gets through)
until the issue, or a single article in it, becomes open access, by
hand or automatically on a date. This spec owns
the publishing mode, the subscriptions and the rules that decide who may
open restricted content; the issue screens where an issue's access is
set are [Issues](U50-issues.md)'s. <sup>a</sup>

OMP does not install subscriptions: a press's Settings › Distribution has
no "Access" tab, its side menu no "Payments", and it restricts nothing (a
press's "Payments" tab on Distribution serves the direct sale of
publication formats, another feature). OPS does not install them either:
a preprint server's Settings › Distribution › "Access" tab carries only a
"Posting Mode" choice, "The server will provide open access to its
contents." or "OPS will not be used to post the server's contents
online.", beside "Enable OAI"; either choice says "Saved" and is not
kept ⚠ [OPS1](#ops1). Neither app has a "Subscriptions" page, "My
Subscriptions" or a Subscription Manager role. <sup>b</sup> <sup>td1</sup>

## Actors & permissions

**Manager-level roles** here are the Journal Manager, the Editor and the
Production Editor; the Site Administrator holds a manager role in every
journal of the test installs and counts with them. **Reading roles** are
the manager-level roles, the Section Editor, the Guest Editor, every
assistant role (Copyeditor, Designer, Funding Coordinator, Indexer,
Layout Editor, Marketing and Sales Coordinator, Proofreader, Editorial
Board Member) and the Subscription Manager, held anywhere in the journal;
nothing here depends on being assigned to a submission. The Subscription
Manager is not among the seeded accounts; the role is given like any
other on the journal's Users & Roles (*Users management*). <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the "Payments" page and work its subscription tabs** (subscriptions, subscription types, subscription policies; Rules 14–25) | • Manager-level roles and the Subscription Manager. The side menu offers "Payments" only while payments are enabled ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md), its Rule 30); the page's address opens it whatever the payment settings <sup>td2</sup><br>• Everyone else: the address opens the access-denied page, or the Login page when signed out <sup>c</sup> |
| **Choose "Publishing Mode" and "Delayed Open Access"** (Rules 1–6) | • Whoever opens the Settings pages ([→ settings access](U07-journal-identity-and-about-pages.md#settings-access)), on Settings › Distribution › "Access" <sup>d</sup> |
| **Set an issue's "Access status" and "Open access date", or tick an article's "Open Access"** | • Manager-level roles, on the issue's "Access" and "Table of Contents" tabs ([Issues](U50-issues.md), its Actors row 1 and Rule 13); what the values do is Rules 7–9 here |
| **Read an article's page and an issue's page on a journal that requires subscriptions** (Rule 8) | • Anyone who may read them on an open journal, signed out included: the restriction covers the galleys only <sup>e</sup> |
| **Open a restricted galley** (Rules 7, 11) | • Subscribers, visitors from a subscribing institution's addresses, buyers of the article or its issue, and paid-up members (Rule 11)<br>• Reading roles, and the article's own Author (Rule 11a)<br>• Anyone else is turned away as Rule 12 says <sup>e</sup> <sup>td9</sup> |
| **Read the "Subscriptions" page** (Rule 26) | • Anyone, signed out included, while payments are set up (Settings bullet 4); otherwise nobody: its address opens the journal's home page <sup>f</sup> |
| **Open "My Subscriptions", buy and renew** (Rules 27–31) | • Any signed-in user, on a journal that requires subscriptions and has at least one subscription type; buying and renewing also need payments set up <sup>f</sup> |
| **Receive the subscription emails** (Side effects) | • The subscriber, the subscription contact and the journal's users, each email as Side effects names them <sup>g</sup> |
| **Sign in as the Subscription Manager** | • The Subscription Manager lands on the access-denied page ("The current role does not have access to this operation.") instead of a dashboard, and the Dashboard's own address (the journal's address followed by "dashboard/editorial") opens the same page; that page has no side menu. Its user menu's "Dashboard" opens the Profile page, as it does for every user holding no manager-level, assistant, Reviewer or Author role ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md), its Rule 19a)<br>• The "Payments" page opens by its address; there the side menu offers "Start A New Submission" and, while payments are enabled, "Institutions" and "Payments". "Institutions" is refused with the same access-denied page ⚠ [A16](#a16) <sup>td3</sup> |

## Fields & validation

<a id="access-tab"></a>
**The "Access" tab** (Settings › Distribution › "Access"), top to bottom,
then "Save". <sup>d</sup> <sup>td4</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Publishing Mode" | No | Three choices: "The journal will provide open access to its contents.", "The journal will require subscriptions to access some or all of its contents." and "OJS will not be used to publish the journal's contents online." A new journal arrives with none selected ⚠ [A1](#a1) (Rules 1–4) |
| "Delayed Open Access" | No | Shown only while the second "Publishing Mode" choice is selected. A list: "Disabled", then "1 Months" ⚠ [A15](#a15) to "60 Months" (Rule 6). Until someone saves a choice in it, the box shows empty instead of "Disabled", and "Save" with it untouched keeps it empty ⚠ [A17](#a17); the journal behaves as "Disabled" |
| "Enable OAI" | No | "Enable" or "Disable"; described in *OAI-PMH* |

**The "Payments" page** (side menu › "Payments", or the journal's
address followed by "payments"; headed "Subscriptions").
Six tabs, left to right: "Individual Subscriptions", "Institutional
Subscriptions", "Subscription Types", "Subscription Policies", "Payment
Types" and "Payments"; the page opens on "Individual Subscriptions". The
last two are *Payments & APCs*'s. Closing a window on the page, or
switching tabs, with a change unsaved asks "The data on this form has
changed. Do you wish to continue without saving?"; "OK" closes the
window, or opens the other tab, and the change is not saved. Leaving
the page itself asks the browser's "Leave site?". <sup>a</sup> <sup>td2</sup>

<a id="subscription-lists"></a>
**The "Individual Subscriptions" and "Institutional Subscriptions" tabs.**
Each holds a list under a heading of the same name, with "Create New
Subscription" above it and a search form over it; an empty list reads
"No Items", and a long list is split into pages. <sup>h</sup> <sup>td10</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Name" column | — | The subscriber's full name; on "Institutional Subscriptions" the institution's name |
| "Email" column | — | "Individual Subscriptions" only: the subscriber's email |
| "Subscription Type", "Status" columns | — | The type's name; the status (Rule 17's list) |
| "Start", "End" columns | — | The subscription's dates; empty for a non-expiring type |
| "Reference Number" column | — | As typed in the subscription window |
| Search form | — | Under "Search": a list of what to search ("Given Name", "Family Name", "Username", "Email", "Membership", "Reference Number", "Notes", plus "Institution name", "Domain" and "IP ranges" on the institutional tab), a list "contains" / "is", a text box and "Search" (Rule 22) |
| Row actions | — | Behind the row's arrow: "Edit" (Rule 19), "Renew" except on a non-expiring subscription (Rule 20), "Delete" (Rule 21) |

<a id="subscription-window"></a>
**The subscription window** ("Create New Subscription" / "Edit
Subscription"), top to bottom, then "Save". <sup>h</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Locate a User" | Yes | A list of the journal's users with a round button per user, a search box and a role list reading "All Roles"; on "Edit" it opens on the subscriber, chosen. Nothing chosen refuses "Save" with "A user is required." (Rule 19) |
| "Subscription type" | Yes | The journal's types of this tab's kind (individual or institutional), each as "{name} - {duration} - {cost} {currency}", hidden ones included (Rule 16a) |
| "Status" | Yes | "Active", "Needs Information", "Needs Approval", "Awaiting Manual Payment", "Awaiting Online Payment", "Other, See Notes" (Rule 17) |
| "Date": "Start date", "End date" | Unless the type is non-expiring | Date boxes with a date picker (Rule 19) |
| "Institution" | Yes, institutional only | A list of the journal's institutions, kept on the [Institutions](U66-institutions.md) page (Rule 19) |
| "Mailing address" | No | Institutional only |
| "Domain" | No | Institutional only, under "If a domain is entered here, IP ranges are optional. Valid values are domain names (e.g. lib.sfu.ca)." (Rules 18, 19) |
| "Membership" | When the type asks for it | Individual only (Rule 19) |
| "Reference Number" | No | Free text |
| "Notes" | No | Formatted text |
| "Send the user an email with their username and subscription details." | No | A box, unticked each time the window opens (Side effects; Rule 19) |

**The "Subscription Types" tab.** A list headed "Subscription Types" with
"Create New Subscription Type" above it; columns "Name",
"Subscriptions" ("Individual" or
"Institutional"), "Duration" (such as "1 year", "1 year 6 months" or
"Non-expiring") and "Cost" (such as "40.00 (USD)"); row actions "Edit"
and "Delete" (Rules 14–16). <sup>i</sup>

<a id="type-window"></a>
**The subscription type window** ("Create New Subscription Type" / "Edit
Subscription Type"), top to bottom, then "Save". <sup>i</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Name of Type" | Yes | One per form language |
| "Description" | No | Formatted text, one per form language; shown on the "Subscriptions" page (Rule 26) |
| "Cost": "Currency", "Cost" | Yes | A list of currencies and a box labelled "Cost"; saved with two decimals (Rule 15) |
| "Format" | Yes | "Online", "Print", "Print and Online" (Rule 17) |
| "Duration" | No | "The number of months the subscription lasts (e.g. 12)."; left empty, the type is non-expiring (Rule 14) |
| "Subscriptions" | — | "Individual (users are validated via login)" or "Institutional (users are validated via domain or IP address)"; neither is ticked when "Create New Subscription Type" opens, and a type saved so is individual; greyed on "Edit" (Rule 15) |
| "Options" | No | "Subscriptions require membership information (e.g. of an association, organization, consortium, etc.)", greyed while "Institutional" is chosen in "Create New Subscription Type"; on "Edit" of an institutional type the box can still be ticked. "Do not make this subscription type publicly available or visible on the website." (Rules 15, 16a) |

**The "Subscription Policies" tab**, top to bottom, then "Save". A fresh
journal's tab arrives with every text box empty, every list on
"Disabled", every box unticked and "Full expiry" selected. <sup>j</sup>
<sup>td14</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Subscription Manager": "Name", "Email", "Phone", "Mailing Address" | "Name", "Email" and "Mailing Address" | Under "These contact details will be listed on the subscription page for customers with enquiries related to subscriptions.". "Save" with one of the three empty shows "This field is required." under it and saves nothing; an "Email" the browser rejects, such as "sub@", shows "Please enter a valid email address." under the box (Rules 24, 26) |
| "Subscription Information" | No | Formatted text, one per form language, shown on the "Subscriptions" and "My Subscriptions" pages (Rule 26) |
| "Subscription Expiry" | — | "Full expiry" ("Readers are denied access to all subscription content upon subscription expiry.") or "Partial expiry" ("Readers are denied access to recently published subscription content, but retain access to subscription content published prior to the subscription expiry date.") (Rule 23) |
| "Subscription Expiry Reminders" | — | Four lists, in screen order: "Notify subscribers by email before subscription expiry." ("Disabled", "1 Months" to "12 Months"), the same label again ("Disabled", "1 Weeks" to "3 Weeks"), "Notify subscribers by email after subscription expiry" (months) and "Notify subscribers by email after subscription expiry." (weeks) [A15](#a15) (Side effects) |
| "Online Payment Notifications" | — | Four boxes, "Notify Subscription Manager by email upon online purchase of an Individual subscription.", "… online purchase of an Institutional subscription (recommended).", "… online renewal of an Individual subscription.", "… online renewal of an Institutional subscription."; greyed, with a note beginning "Note: To enable these options…", while payments are not set up (Side effects) |
| "Open Access Options For Subscription Journals" | — | The box "Registered readers will have the option of receiving the table of contents by email when an issue becomes open access." (Side effects) |

<a id="subscriptions-page"></a>
**The "Subscriptions" page** (the header's "Subscriptions", or the
journal's address followed by "about/subscriptions"), top to bottom
(Rule 26). <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Breadcrumb and heading | — | "Home / Subscriptions"; "Subscriptions" |
| "Subscription Information" text | — | When one is saved on "Subscription Policies" |
| "Subscriptions Contact" | — | While a contact name, phone or email is saved: the name, the mailing address, "Phone" with the number, and the email as a link that opens a new message |
| "Individual Subscriptions" | — | While a public individual type exists: "Individual subscriptions require login to access subscription content.", then a table "Name" (with the type's description under it), "Format", "Duration", "Cost"; under it "Purchase New Subscription" for a signed-in visitor |
| "Institutional Subscriptions" | — | The same for institutional types, under "Institutional subscriptions do not require login. The user's domain and/or IP address is used to provide access to subscription content." |

<a id="my-subscriptions"></a>
**"My Subscriptions"** (the header's "My Subscriptions", or the journal's
address followed by "user/subscriptions"), top to bottom (Rule 27).
<sup>f</sup> <sup>td25</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Heading, information, contact | — | "My Subscriptions", then the "Subscription Information" and "Subscriptions Contact" parts of the "Subscriptions" page |
| "Subscription Status" | — | While payments are set up: a table "Status" / "Description" explaining "Needs Information", "Needs Approval", "Awaiting Manual Payment" and "Awaiting Online Payment" |
| "Individual Subscription" | — | While an individual type exists: the reader's subscription as "Subscription Type", "Status" and, while payments are set up, its buttons (Rule 31); with none, "Purchase New Subscription" while payments are set up, "View Available Subscription Types" otherwise, which leads to the journal's home page with no message, since the "Subscriptions" page is closed then ⚠ [A24](#a24) |
| "Institutional Subscriptions" | — | While an institutional type exists: one row per institutional subscription the reader bought ("Subscription Type", "Institution name", "Status", buttons), then "Purchase New Subscription" while payments are set up, "View Available Subscription Types" otherwise (leading home as in the row above) |

**The purchase pages** (Rules 28, 29). <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Purchase Individual Subscription" (the browser tab's title; the page shows no heading): box "Purchase Subscription" with "Subscription Type" and "Membership", then "Save" | The type; "Membership" when the type asks for it | The type list holds the public individual types as "{name} ({cost} {currency})" |
| "Purchase Institutional Subscription" (the page's heading): box "Purchase Subscription" with "Subscription Type", "Membership" ("Membership information if required for the selected subscription type."), "Institution name", "Mailing address"; then "Domain" and "IP ranges", each with its help; then "Continue" and "Cancel" | "Subscription Type", "Institution name", and "Domain" or "IP ranges" (only "Subscription Type" carries the required mark) | The type list holds the public institutional types as on the subscription window; "IP ranges" takes one entry per line, as its help describes ("142.58.103.1", "142.58.103.1 - 142.58.103.4", "142.58.*.*", "142.58.100.0/24") |

<a id="subscription-block"></a>
**The "Subscription" block** (the "Subscription Block" placed in the
sidebar, Settings bullet 13), headed "Subscription"; its lines are Rule
33. <sup>k</sup>

## Rules & state

### The publishing mode

1. **Three modes.** "Publishing Mode" on the "Access" tab decides how the
   journal publishes: open access (the first choice), subscriptions
   required (the second) or not online (the third). A journal on which
   nobody has saved a choice publishes as open access, though the tab
   shows no choice selected [A1](#a1). <sup>d</sup> <sup>td4</sup>
2. **Open access.** Nothing is restricted: every published article's
   galleys and every issue's "Full Issue" open for anyone who may read
   the journal. The issue screens offer no "Access" tab and no "Open
   Access" column ([Issues](U50-issues.md), its Settings bullet 1).
   <sup>e</sup>
3. **Subscriptions required.** Choosing the second choice and saving:
   <sup>d</sup> <sup>e</sup>
   - a new issue is born with the "Access status" "Subscription", and
     the issue window gains its "Access" tab
     ([Issues](U50-issues.md), its Rules 3 and 5);
   - the content of such issues is restricted (Rule 7);
   - the "Access" tab shows "Delayed Open Access" (Rule 6);
   - "My Subscriptions" opens (Rule 27) and, with payments set up, the
     purchase pages (Rules 28, 29); the header can show "My Subscriptions"
     ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
     its Settings bullet 6), and the "Subscription" block shows (Rule
     33).
4. **Not online.** With the third choice saved, the journal's issue
   pages, "Current", "Archives", its articles' pages and galleys and its
   search page are refused to everyone but the reading roles: a signed-in
   Reader, Author, Reviewer or Translator gets the access-denied page
   "This journal does not publish its content online.", and a signed-out
   visitor the Login page. The header loses "Current" and "Archives", for
   everyone. What each page does is its own spec's: [Issues](U50-issues.md)
   (its Settings bullet 1), [Article landing page &
   reading](U13-article-landing-page-and-reading.md) and
   [Search](U15-search.md) (its Rule 13). <sup>e</sup>
5. **Saving the tab.** "Save" stores the tab and shows "Saved". A choice
   made and not saved is gone without a question once the Journal
   Manager leaves Settings › Distribution, as on every Settings page
   ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
   its Rule 5). <sup>d</sup> <sup>td4</sup>
6. **"Delayed Open Access".** Set to a number of months, every issue
   published afterwards ("Publish Issue", [Issues](U50-issues.md), its
   Rule 16) gets the "Access status" "Subscription" and the "Open access
   date" of the publishing day that many months later, whatever its
   "Access" tab said before; the issue then opens by itself on that day
   (Rule 9). Issues published earlier keep their access. "Disabled"
   leaves each issue's access as its "Access" tab sets it. <sup>m</sup>
   <sup>td5</sup>

### What is restricted

7. **A restricted issue.** On a journal that requires subscriptions, an
   issue is restricted while its "Access status" is "Subscription" and
   its "Open access date" is empty or still to come. Every article in it
   is restricted, except one whose "Open Access" box is ticked on the
   issue's "Table of Contents" tab, which opens for everyone like an
   open-access article. An issue whose "Access status" is "Open access"
   is not restricted. <sup>e</sup> <sup>m</sup>
8. **What stays open.** Restriction covers the galleys only: an
   article's galleys (its additional files included) and the issue's
   "Full Issue" galleys. The article's page, with its title, authors,
   abstract and references, the issue's page and its table of contents,
   "Current", "Archives" and search results stay open to every visitor.
   <sup>e</sup> <sup>td9</sup>
9. **The open access date.** Once the day of a restricted issue's "Open
   access date" begins, the issue opens for everyone, with nothing to
   press; its "Access" tab still reads "Subscription" with that date.
   <sup>e</sup> <sup>m</sup>
10. **The locked link.** Wherever a restricted galley is listed (the
    article's page, the issue's table of contents, the "Full Issue"
    list) for a visitor who may not open it, its link shows a padlock in
    place of the file icon. A file under the article's "Additional Files"
    is the exception: it keeps its file icon yet is refused
    ⚠ [A18](#a18). A screen reader hears "Requires Subscription"
    before the label, or "Requires Subscription or Fee" while article
    purchases are on (Settings bullet 5). While a "Purchase Article" fee
    is saved, an article galley's label is followed by "({currency}
    {fee})", and a "Full Issue" galley's by the "Purchase Issue" fee the
    same way, even while payments are off and nothing can be bought
    ⚠ [A19](#a19). With "Only Restrict Access to PDF version of issues and
    articles" ticked (Settings bullet 6), only PDF galleys show the lock;
    the others show none, yet open only while a "Purchase Article" (for
    an issue galley, "Purchase Issue") or "Association Membership" fee is
    set, and are otherwise refused as Rule 12 says ⚠ [A14](#a14).
    <sup>l</sup> <sup>td6</sup> <sup>td23</sup>

### Who may open restricted content

11. **Who gets through.** A visitor opens a restricted article galley
    when any of these holds: <sup>e</sup> <sup>td9</sup>
    - signed in, with a valid individual subscription (Rule 17);
    - coming from an address a valid institutional subscription covers
      (Rule 18), signed in or not;
    - signed in, having paid "Purchase Article" for this article, or
      "Purchase Issue" for its issue while an issue fee is set; <sup>p</sup>
    - signed in, with a paid-up "Association Membership" while a
      membership fee is set (Settings bullet 7); <sup>p</sup>
    - signed in, with an expired subscription that still covers the
      article under "Partial expiry" (Rule 23).

    For a "Full Issue" galley the same list holds, the article purchase
    aside. The issue's table of contents shows the lock (Rule 10) by the
    subscription, the institution and the issue purchase alone, so it
    locks galleys that the reading roles, the article's Author and a
    reader under "Partial expiry" can open ⚠ [A7](#a7).
11a. **Reading roles and the article's Author.** A signed-in user holding
    a reading role opens every restricted galley, article and "Full
    Issue" alike, without a subscription; so does an Author of the
    article, for that article's galleys. <sup>e</sup> <sup>td9</sup>
12. **Everyone else.** A visitor for whom Rule 11 does not hold, pressing
    a restricted galley: <sup>e</sup> <sup>td7</sup> <sup>td8</sup>
    - signed out, is sent to the Login page with the message
      "Subscription required to access item. To verify subscription, log
      in to journal." (while article purchases or membership are on:
      "Subscription or article purchase required to access item. To
      verify subscription, access previous purchase, or purchase article,
      log in to journal."; for a "Full Issue" while issue purchases or
      membership are on, the same with "issue purchase" and "purchase
      issue"); signed in there, the galley opens if Rule 11 now holds;
    - signed in, while "Purchase Article" is set (a "Full Issue":
      "Purchase Issue"), gets the payment method's page for a "Purchase
      Article Fee" ("Purchase Issue Fee") of the set amount (Rule 30); a
      "Full Issue" pressed while only "Association Membership" is set
      gets that page too, for a "Purchase Issue Fee" with no amount
      ⚠ [A20](#a20);
    - signed in otherwise, is sent to the "Subscriptions" page; on a
      journal whose payments are not set up that page is not offered
      (Rule 26), and the reader lands on the journal's home page with no
      word about why ⚠ [A5](#a5).
13. **Registered readers only.** With "Users must be registered and log
    in to view open access content." ticked (Settings bullet 3), a
    signed-out visitor pressing any galley of an article in an issue,
    restricted or not, is sent to the Login page first, unless the
    visitor comes from an address a valid institutional subscription
    covers; the pages themselves stay open. The same for a "Full Issue"
    is [Issues](U50-issues.md)'s Settings bullet 3. <sup>e</sup>
    <sup>td24</sup>

### Subscription types

14. **The list.** "Subscription Types" lists every type in the order the
    types were created; nothing reorders them. A type with an empty
    "Duration" is non-expiring and reads "Non-expiring"; otherwise the
    duration reads in years and months ("1 year", "2 years 6 months",
    "6 months"). <sup>i</sup>
15. **Saving a type.** "Save" needs "Name of Type" in the journal's
    primary language, a "Currency", a "Cost" and a "Format"; an empty
    one is marked "This field is required." under its box before
    anything is sent. A "Cost" or a "Duration" that is not a number of 0
    or more is refused: the window stays open, nothing is marked under
    the box, and a notice reads "The cost must be a positive, numeric
    value." or "The duration must be a positive, numeric value.". A
    saved type closes the window, shows "Your changes have been saved."
    and joins the end of the list. "Individual" or "Institutional" is
    chosen once: on "Edit" the choice is greyed. "Subscriptions require
    membership information…" is greyed while "Institutional" is chosen
    in "Create New Subscription Type", but not on "Edit" of an
    institutional type. <sup>i</sup> <sup>td12</sup>
16. **Deleting a type.** "Delete" asks "Warning! All subscriptions with
    this subscription type will also be deleted. Are you sure you want
    to continue and delete this subscription type?"; "OK" removes the
    type and every subscription of that type, whose subscribers lose
    access at once. <sup>i</sup> <sup>td13</sup>
16a. **A hidden type.** A type with "Do not make this subscription type
    publicly available or visible on the website." ticked is left off
    the "Subscriptions" page and the purchase pages; the subscription
    window still offers it. <sup>i</sup> <sup>f</sup>

### Subscriptions

17. **A valid individual subscription** has the "Status" "Active", a type
    whose "Format" is "Online" or "Print and Online", and either a
    non-expiring type or today between its "Start date" and its "End
    date", the end date's whole day included. Every other status
    ("Needs Information", "Needs Approval", "Awaiting Manual Payment",
    "Awaiting Online Payment", "Other, See Notes"), a "Print" type, a
    start date still to come and a passed end date each open nothing.
    <sup>e</sup> <sup>h</sup> <sup>td10</sup>
18. **A valid institutional subscription** follows the same status,
    format and date rules, and covers a visitor whose network address
    falls in one of the institution's IP ranges (kept on the
    [Institutions](U66-institutions.md) page). Nobody signs in for it. <sup>e</sup> <sup>td22</sup>

    It also covers a visitor whose host name ends in the subscription's
    "Domain". <sup>q</sup>
19. **Creating and editing a subscription.** "Create New Subscription"
    opens the subscription window empty; "Edit" opens it filled in.
    "Save" is refused, the window staying open with the message, when:
    <sup>h</sup> <sup>td11</sup>
    - no user is chosen: "A user is required.";
    - the chosen user already has an individual subscription to this
      journal (individual tab only): "This user already has a
      subscription for this journal.";
    - the journal has no type of this tab's kind: "A subscription type
      must be created before new subscriptions can be made.", shown as
      soon as the window opens;
    - institutional only, the journal has no institution: "An
      institution must be created before new subscriptions can be
      made.", shown as soon as the window opens;
    - the type is not non-expiring and a date is missing or more than ten
      years away from today's year: "A subscription start date is
      required." / "Please select a valid subscription start date." and
      the same for the end date;
    - the type is non-expiring and a date is given: "This is a
      non-expiring subscription type; please do not specify a start
      date." (end date: "… an end date.");
    - the type asks for membership and "Membership" is empty: "The
      selected subscription type requires membership information.";
    - institutional only, a malformed "Domain" ("Please enter a valid
      domain."), or an "Online" or "Print and Online" type with neither a
      "Domain" nor an IP range on the chosen institution ("The selected
      subscription type requires a domain and/or an IP range for
      subscription authentication.");
    - the email box is ticked while the subscription contact's name or
      email is empty on "Subscription Policies": "In order to send the
      user a notification email, the subscription contact name and email
      address must be specified in the journal Setup." ⚠ [A4](#a4).

    A saved subscription closes the window, shows "Your changes have been
    saved." and appears in the list. A subscription created here takes
    effect at once (Rule 17).
    A "Start date" after the "End date" is not refused: the subscription
    is saved and listed with those dates ⚠ [A21](#a21).
    After a refused "Save", an empty "Start date" or "End date" box shows
    today's date, but the window does not send it: the next "Save" is
    refused with "A subscription start date is required." (or the end
    date's message) again. Typing today's date into "Start date" changes
    nothing; a different date is taken ⚠ [A28](#a28).
20. **"Renew".** Not offered on a non-expiring subscription. It asks "Are
    you sure you want to renew this subscription?"; "OK" moves the "End"
    on by the type's duration, counted from the old end date, or from
    today when that date has passed. The status is not changed.
    <sup>h</sup> <sup>td15</sup>
21. **"Delete".** Asks "Are you sure you wish to delete this
    subscription?"; "OK" removes it, and the subscriber loses access at
    once. <sup>h</sup>
22. **Searching the list.** "Search" by "Given Name", "Family Name",
    "Username" or "Email" lists the subscriptions whose field contains,
    or is exactly, the typed text; an empty text box lists them all. The
    other fields narrow nothing ⚠ [A22](#a22). <sup>h</sup> <sup>td10</sup>
23. **Partial expiry.** With "Partial expiry" chosen on "Subscription
    Policies", a subscriber whose individual subscription has ended
    keeps opening the articles whose own publication date is on or
    before its end date (an article can carry a later date than its
    issue) and the "Full Issue" of the issues published in that time;
    later articles are refused as Rule 12 says. The same holds for an
    institutional subscription. With "Full expiry" the end date closes
    everything. <sup>e</sup> <sup>td21</sup>

### Subscription policies

24. **Saving the policies.** "Save" on "Subscription Policies" stores the
    whole tab and shows "Your changes have been saved.". It is refused
    while the contact's "Name", "Email" or "Mailing Address" is empty or
    the email is malformed (Fields), so changing any other setting on the
    tab needs the contact filled. <sup>j</sup> <sup>td14</sup>
25. **Online payment notifications** can be ticked only while payments
    are set up (Settings bullet 4); they concern online payment methods
    only (Side effects). <sup>j</sup>

### The reader's pages

26. **The "Subscriptions" page** opens while payments are enabled and a
    payment method is set up (Settings bullet 4); otherwise its address
    leads to the journal's home page, and the header's "Subscriptions"
    item is not shown ([Navigation menus & site
    chrome](U08-navigation-menus-and-site-chrome.md), its Settings bullet
    6). It lists the public types (Rule 16a) as Fields describes, whatever
    the publishing mode. On a journal that does not require
    subscriptions (open access, or not online), a signed-in reader is
    still offered "Purchase New Subscription" there, and pressing it
    leads to the journal's home page with no message ⚠ [A23](#a23).
    <sup>f</sup> <sup>td27</sup>
27. **"My Subscriptions"** opens for a signed-in user on a journal that
    requires subscriptions and has at least one subscription type;
    otherwise its address leads to the journal's home page (signed out
    included). Each subscription's "Status" reads: <sup>f</sup>
    <sup>td25</sup>
    - while payments are set up, "Awaiting Online Payment" or "Awaiting
      Manual Payment", or "Needs Approval" for an institutional one;
    - "Inactive" for any other status but "Active", and for those three
      too while payments are not set up;
    - "Non-expiring", "Expires: {date}" or "Expired: {date}" for an
      active one.
28. **Buying an individual subscription.** "Purchase New Subscription"
    opens "Purchase Individual Subscription" for a signed-in reader who
    has no individual subscription to the journal (with one, its address
    leads to the home page). "Save" with a type that asks for membership
    and an empty "Membership" shows the page again with nothing said
    ⚠ [A9](#a9). A saved purchase creates the subscription with the
    status "Awaiting Manual Payment" and today as both "Start" and "End"
    (no dates on a non-expiring type; with an online method: "Awaiting
    Online Payment"), then shows the payment method's page for a
    "Subscription Fee ({type name})" of the type's cost (Rule 30).
    <sup>f</sup> <sup>td16</sup>
29. **Buying an institutional subscription.** "Purchase New
    Subscription" under "Institutional Subscriptions" opens "Purchase
    Institutional Subscription", its type list arriving with a type
    chosen. "Continue" is refused, with the message at the top of the
    page, without an institution name ("An institution name is
    required."), with neither a domain nor an IP range ("The selected
    subscription type requires a domain and/or an IP range for
    subscription authentication."), with a malformed domain ("Please
    enter a valid domain.") or IP range ("Please enter a valid IP
    range."). Accepted, it creates the subscription as Rule 28 does and a
    new institution under the typed name with the typed IP ranges, even
    when one of that name exists ⚠ [A11](#a11); then the payment page as
    in Rule 28. "Cancel" returns to "My Subscriptions". <sup>f</sup>
    <sup>td17</sup>

    "Continue" is also refused without a membership the type asks for.
    <sup>r</sup>
30. **Paying with the manual method.** On the test installs the one
    payment method that works without an outside service is "Manual Fee
    Payment": its page shows the item, the fee, the journal's payment
    instructions and "Send notification of payment"; what that page and
    its email do is *Payments & APCs*'s. Nothing records the payment
    here: a bought subscription stays "Awaiting Manual Payment" until a
    Journal Manager or Subscription Manager edits it to "Active" with its
    dates (Rule 19). A bought article or issue has no such step, so it
    never opens for the buyer ⚠ [A6](#a6). <sup>o</sup> <sup>td26</sup>
31. **The buttons on "My Subscriptions"** (while payments are set up):
    <sup>f</sup> <sup>td18</sup>
    - "Awaiting Online Payment": "Purchase", which shows the payment page
      for the type's cost again;
    - "Active": "Renew" (not on a non-expiring subscription), which shows
      the payment page for the type's cost and, once an online payment
      completes, moves the end date on as Rule 20 does; and "Purchase",
      which opens the purchase page for the same subscription. Saving
      that page sets the active subscription back to "Awaiting Manual
      Payment" with today's dates, so the reader loses access at once
      ⚠ [A10](#a10). On an institutional subscription that page arrives
      with "IP ranges" reading "Array", which "Continue" refuses until
      the ranges are typed again ⚠ [A25](#a25);
    - any other status: no button.
32. **The purchase pages need a signed-in reader.** They are offered only
    through links a signed-in reader sees; a signed-out visitor who opens
    a purchase page's address gets an empty page, the server failing,
    instead of the Login page ⚠ [A12](#a12). On a journal that does not
    require subscriptions, or whose payments are not set up, their
    addresses lead to the home page. With payments set up and no
    subscription type, the addresses open with an empty "Subscription
    Type" list; no link leads there. <sup>f</sup> <sup>td19</sup>

### The "Subscription" block

33. **Its lines.** Placed in the sidebar, the block shows only on a
    journal that requires subscriptions, headed "Subscription": <sup>k</sup>
    <sup>td20</sup>
    - for anyone an institutional subscription covers, except a
      signed-in reader whose own individual subscription is active and
      within its dates: "Access provided by: {institution}" and
      "Accessed from: {address}";
    - otherwise, for a signed-in reader with an individual subscription:
      the type's name, the membership in brackets when there is one,
      then "Non-expiring", "Expires: {date}" or "Expired: {date}". A
      subscription awaiting payment reads its status ("Awaiting Manual
      Payment") only on "My Subscriptions"; on every other page it reads
      its dates, so a fresh purchase reads "Expired: {today}"
      ⚠ [A13](#a13). A subscription set to "Needs Information", "Needs
      Approval" or "Other, See Notes" reads "Expires: {date}" on every
      page ⚠ [A26](#a26);
    - for a signed-out visitor with no institutional access: "Login to
      access subscriber-only resources.";
    - for a signed-in reader: "My Subscriptions" as a link when a
      subscription is shown, otherwise "A subscription is required to
      access some resources." with "Learn More", which opens the
      "Subscriptions" page (Rule 26), or the journal's home page while
      payments are not set up [A24](#a24).

## Side effects

- **"Subscription Notification"** (the subscription window's email box,
  Rule 19). The subscriber gets an email from the subscription contact
  (the name and email on "Subscription Policies"): subject "Subscription
  Notification", naming the journal, the subscription type and the
  subscriber's username. It is sent on "Save", new subscription or edit
  alike, and only when the box is ticked. <sup>g</sup> <sup>td28</sup>

  If sending fails, the Journal Manager sees "There was a problem
  sending an email message. Please try again later, or contact your
  system administrator." <sup>s</sup>
- **Expiry reminders** ("Subscription Expiry Reminders", Settings bullet
  9). The reminders come from a scheduled task the site runs on its own
  timer. Run that way, the task stops with an error as soon as a journal
  requiring subscriptions has a reminder list set, and no reminder goes
  out, on its day or any other ⚠ [A27](#a27).
  <sup>n</sup> <sup>td29</sup>

  The reminders it would send go to active subscribers, from the
  subscription contact, on a journal that requires subscriptions:
  "Notice of Subscription Expiry" the chosen number of months, and of
  weeks, before the end date; "Subscription Expired" the chosen number
  of weeks after it; "Subscription Expired - Final Reminder" the chosen
  number of months after it. The task runs on the first day of each
  month and matches end dates to that exact day, so even once it works
  a subscription ending on any other day gets no reminder ⚠ [A8](#a8).
  <sup>t</sup>
- **Online payment notifications** (Settings bullet 10). When an online
  payment for a subscription completes, the subscription contact (the
  journal's principal contact when none is set) gets "Subscription
  Purchase: Individual", "Subscription Purchase: Institutional",
  "Subscription Renewal: Individual" or "Subscription Renewal:
  Institutional", each only while its box is ticked. A paid online
  purchase makes an individual subscription "Active" and an institutional
  one "Needs Approval", and moves the end date on as Rule 20 does. The
  manual method completes no payment, so none of this can be seen on
  the test installs. <sup>o</sup> <sup>u</sup>
- **The open-access email** ("Open Access Options For Subscription
  Journals", Settings bullet 11). A daily scheduled task, on a journal
  that requires subscriptions, emails every user of the journal who has
  not turned off "An issue has been made open access." ([Notifications
  center & email preferences](U05-notifications-center-and-email-preferences.md))
  on the day a published issue's "Open access date" comes: subject "Free
  to read: {issue name} of {journal name} is now open access", from the
  journal's principal contact, with the issue's name as a link to its
  page and the unsubscribe footer. It also records the notification "An
  issue has been made open access.", which nothing on screen lists. An
  issue opened by switching its "Access status" to "Open access", or an
  article's "Open Access" box, sends nothing. <sup>n</sup>

  Each of those users gets one copy, except when the issue opens on 1
  May, 1 July, 1 October or 1 December, or on 1 March in most years:
  then each gets two ⚠ [A29](#a29).
- **The manual method's email** ("Send notification of payment", Rule 30)
  is *Payments & APCs*'s.
- **A new institution** is added to the journal's [Institutions](U66-institutions.md) list by
  every institutional purchase (Rule 29).
- Nothing else sends email: creating, editing, renewing and deleting
  subscriptions and types, saving the policies and changing the
  publishing mode are silent. <sup>g</sup>

## Settings that modify behavior

1. **"Publishing Mode"** — Settings › Distribution › "Access". Default: no
   choice selected; the journal behaves as open access (Rule 1).
   - "The journal will provide open access to its contents.": nothing
     restricted (Rule 2).
   - "The journal will require subscriptions to access some or all of its
     contents.": Rules 3 and 7.
   - "OJS will not be used to publish the journal's contents online.":
     Rule 4.
2. **"Delayed Open Access"** — the same tab, shown with the second mode.
   Default: an empty box, which behaves as "Disabled" (issues keep the
   access their "Access" tab gives) [A17](#a17). Set to months: Rule 6.
3. **"Users must be registered and log in to view open access
   content."** — Settings › Users & Roles › "Site Access Options", under
   "View Article Content" (*Roles configuration*). Default: unticked
   (galleys open to signed-out visitors as the rules above allow). Ticked:
   Rule 13.
4. **Payments set up** — Settings › Distribution › "Payments": "Enable",
   a currency, a payment method and, for "Manual Fee Payment", its
   "Manual Payment Instructions" (*Payments & APCs*). Default: off. Off:
   no "Subscriptions" page (Rule 26), no buying (Rules 28, 29, 32), no
   status table or buttons on "My Subscriptions" (Rule 27), the online
   payment boxes greyed (Rule 25). On: all of them.
5. **"Purchase Article" and "Purchase Issue"** — the "Payments" page ›
   "Payment Types", under "Reader Fees" (*Payments & APCs*). Default:
   empty. Set: the fee on the locked link (Rule 10), even with payments
   off [A19](#a19); with payments set up, also the purchase message and
   the payment page (Rule 12), and access once paid (Rule 11).
6. **"Only Restrict Access to PDF version of issues and articles"** — the
   same tab. Default: unticked (every restricted galley is locked).
   Ticked, with payments set up: Rule 10's last sentences.
7. **"Association Membership"** — the same tab, under "General Fees".
   Default: empty. Set, with payments set up: a signed-out visitor's
   message reads "Subscription or article purchase required…" (Rule
   12), and a "Full Issue" asks a signed-in reader for an issue fee of
   no amount [A20](#a20). <sup>td7</sup> <sup>td8</sup>

   A paid-up member opens restricted galleys (Rule 11). <sup>p</sup>
   Paying for membership is *Payments & APCs*'s.
8. **"Subscription Expiry"** — the "Payments" page › "Subscription
   Policies". Default: "Full expiry". "Partial expiry": Rule 23.
9. **"Subscription Expiry Reminders"** — the same tab. Default: all four
   "Disabled". Set: the reminders of Side effects, of which none goes
   out [A27](#a27).
10. **"Online Payment Notifications"** — the same tab. Default: all four
    unticked. Ticked: the notifications of Side effects.
11. **"Registered readers will have the option of receiving the table of
    contents by email when an issue becomes open access."** — the same
    tab. Default: unticked (no open-access email). Ticked: the
    open-access email of Side effects.
12. **The subscription contact and "Subscription Information"** — the same
    tab. Default: empty. Filled: shown on the "Subscriptions" page and
    "My Subscriptions" (Rule 26; Fields); the contact's name, email and
    mailing address are needed to save the tab (Rule 24); the
    name and email are needed for the "Subscription Notification" (Rule
    19) and are its sender. <sup>td28</sup>

    They are the reminders' sender too (Side effects). <sup>t</sup>
13. **"Subscription Block" in the "Sidebar"** — Settings › Website ›
    Appearance › "Setup" ([Appearance & theming](U10-appearance-and-theming.md),
    its Rules 23 and 24). Default: offered, not placed. Placed: Rule 33.
14. **Each person's "An issue has been made open access."** — Profile ›
    "Notifications" ([Notifications center & email
    preferences](U05-notifications-center-and-email-preferences.md)).
    Default: on. Off, or its email box ticked off: no open-access email
    for that person (Side effects).

## Cross-feature interactions

- *[Issues](U50-issues.md)*: the issue's "Access" tab, the "Open Access"
  column of its "Table of Contents" tab, the "Access status" a new issue
  is born with, "Publish Issue" (which applies "Delayed Open Access"),
  and the "Full Issue" galleys; this spec says what their values let a
  reader open.
- *[Article landing page & reading](U13-article-landing-page-and-reading.md)*:
  the article's page and its galley links, on which Rules 8, 10 and 12
  act.
- *[Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)*:
  the side menu's "Payments" and "Institutions", and the header's
  "Subscriptions" and "My Subscriptions" items, with its OJS1 (their
  missing eye icon) and OPS2 (a server's "Archives" never hiding, the
  consequence of [OPS1](#ops1)).
- *[Search](U15-search.md)*: its Rule 13 (the not-online gate) and Rule 16
  (restricted articles listed like any other).
- *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*:
  who opens the Settings pages, and unsaved changes on them (its Rule 5).
- *[Appearance & theming](U10-appearance-and-theming.md)*: placing the
  "Subscription Block".
- *[Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)*:
  the "An issue has been made open access." preferences and the email's
  footer.
- [Payments & APCs](U52-payments-and-apcs.md): Settings › Distribution ›
  "Payments", the "Payment Types" and "Payments" tabs, the manual method's
  page and email, and membership.
- *[Institutions](U66-institutions.md)*: the institutions and IP ranges an
  institutional subscription relies on.
- [Roles configuration](U54-roles-configuration.md),
  [Users management](U53-users-management.md): the "Site Access Options" box,
  and giving someone the Subscription Manager role.
- [OAI-PMH](U19-oai-pmh.md): "Enable OAI" on the "Access" tab.
- *Login & sessions*: the Login page the refusals of Rule 12 lead to, and
  where the Subscription Manager lands after signing in (Actors).

## Canonical scenarios

Scenario 16 runs on the seeded press and preprint server with ready
accounts, its control on the seeded journal; the others run on scratch
journals with throwaway accounts. The footnote holds the accounts, the
passwords, the mail catcher's address, the commands that run the site's
scheduled tasks and background jobs, and the tooling recipe. <sup>s0</sup>

1. **A journal that requires subscriptions, and back to open access**

   Given: Journal Manager, and a visitor signed out in a second browser,
   on a scratch journal whose "Publishing Mode" is "The journal will
   require subscriptions to access some or all of its contents.", with
   the published, current issue "Vol. 1 No. 1 (2026)" (its "Access
   status" "Subscription", no "Open access date") holding the published
   article "Tidal Patterns" with the galley "PDF".

   - **The locked link**: the visitor presses "Current" in the header,
     then "Tidal Patterns": the article's page opens with its title
     (Rule 8), and its "PDF" link shows a padlock in place of the file
     icon; a screen reader hears "Requires Subscription" before the
     label (Rules 7, 10).
   - **Refused, signed out**: the visitor presses "PDF": the Login page
     opens with the message "Subscription required to access item. To
     verify subscription, log in to journal." (Rule 12).
   - **The "Access" tab**: the Journal Manager opens Settings ›
     Distribution › "Access": the second "Publishing Mode" choice is
     selected, and "Delayed Open Access" shows under it (Rule 3; Fields,
     the "Access" tab).
   - **Open access chosen**: select "The journal will provide open access
     to its contents." and press "Save": "Saved" shows, and "Delayed
     Open Access" is gone from the tab. Reload the page: the first choice
     is still selected (Rule 5; Fields, the "Access" tab).
   - **The reader side, open**: the visitor reloads "Tidal Patterns":
     "PDF" shows its file icon and no padlock; pressing it opens the
     PDF (Rule 2).
   - **Subscriptions again**: the Journal Manager selects the second
     choice again and presses "Save": "Saved". The visitor reloads
     "Tidal Patterns": "PDF" shows the padlock again, since the issue
     kept its "Access status" "Subscription" (Rules 3, 7).
   - **Control**: the article's page, the issue's page that "Current"
     opens and "Archives" opened for the visitor at every step, locked
     or not (Rule 8). <sup>s0</sup>

2. **Subscribers, non-subscribers and the "Subscription" block**

   Given: four Readers, Sam (an active "Online Year" subscription whose
   dates hold today), Lena (an active "Lifetime" subscription, a
   non-expiring type), Eve (an active "Online Year" subscription whose
   "End date" was 30 days before today) and Nova (no subscription), and
   a visitor signed out in a second browser, on a scratch journal that
   requires subscriptions, has payments set up with "Manual Fee
   Payment", keeps "Subscription Expiry" at "Full expiry" and has the
   "Subscription Block" placed in the sidebar, with the published,
   current issue "Vol. 1 No. 1 (2026)" (its "Access status"
   "Subscription") holding "Tidal Patterns" with the galley "PDF".

   - **Signed out**: the visitor opens "Tidal Patterns" from "Current":
     "PDF" shows the padlock, and the sidebar's block, headed
     "Subscription", reads "Login to access subscriber-only resources."
     (Rules 10, 33). Pressing "PDF" opens the Login page with "Subscription
     required to access item. To verify subscription, log in to
     journal."; sign in there as Sam: the PDF opens (Rules 12, 17).
   - **Sam, active**: on "Tidal Patterns", "PDF" shows no padlock; the
     block reads "Online Year", then "Expires:" with Sam's end date, then
     "My Subscriptions" as a link (Rule 33). The journal's address
     followed by "user/subscriptions" opens "My Subscriptions", whose
     "Individual Subscription" part shows "Online Year" with the status
     "Expires:" and the same date (Rule 27; Fields, "My Subscriptions").
   - **Lena, non-expiring**: Lena signs in and presses "Tidal
     Patterns"'s "PDF": the PDF opens (Rule 17). The block reads "Lifetime", then "Non-expiring",
     and "My Subscriptions" gives "Non-expiring" as the status (Rules 27,
     33).
   - **Eve, expired**: Eve signs in and opens "Tidal Patterns": "PDF"
     shows the padlock, and pressing it opens the "Subscriptions" page (Rules 12, 17, 23). The
     block reads "Online Year", then "Expired:" with her end date, and
     "My Subscriptions" gives "Expired:" with the same date (Rules 27,
     33).
   - **Nova, none**: Nova signs in and opens "Tidal Patterns": "PDF"
     shows the padlock, and pressing it opens the "Subscriptions" page (Rule 12). The block reads "A
     subscription is required to access some resources." with "Learn
     More", which opens the "Subscriptions" page too (Rule 33).
   - **Control**: on the issue's page that "Current" opens, "Tidal
     Patterns"'s "PDF" shows the padlock for the visitor, Eve and Nova,
     and no padlock for Sam and Lena (Rule 10). <sup>s0</sup>

3. **Reading roles, the article's Author and the open pages**

   Given: a Section Editor (assigned to no submission), a Copyeditor, a
   Subscription Manager, the Author of "Tidal Patterns" and a Reader,
   none with a subscription, and a visitor signed out, on a scratch
   journal that requires subscriptions (payments not set up, the
   install default), with the published, current issue "Vol. 1 No. 1
   (2026)" (its "Access status" "Subscription", its "Full Issue" galley
   "PDF") holding "Tidal Patterns" with the galley "PDF".

   - **The open pages**: each of them, the visitor included, opens the
     issue's page with "Current", then "Archives", then "Tidal Patterns"
     with its title: every page opens (Actors row 4; Rule 8).
   - **The Section Editor, the Copyeditor and the Subscription
     Manager**: each presses "Tidal Patterns"'s "PDF": the PDF opens;
     each presses the issue's "Full Issue" "PDF": it opens too (Rule
     11a). On the issue's page the links still show them the padlock
     ⚠ [A7](#a7).
   - **The article's Author**: presses "Tidal Patterns"'s "PDF": the PDF
     opens (Rule 11a).
   - **Control**: the Reader presses "Tidal Patterns"'s "PDF": the PDF
     does not open (where the Reader lands instead is [A5](#a5)), and
     the visitor's "PDF" opens the Login page (Rule 12). <sup>s0</sup>

4. **Who opens the "Payments" page; the Subscription Manager signing in**

   Given: Journal Manager, a Subscription Manager, a Section Editor and a
   Reader, and a visitor signed out, on a scratch journal that requires
   subscriptions and has payments set up, with the institutional
   subscription type "Campus Year" and no institution.

   - **The Journal Manager**: the side menu's "Payments" opens a page
     headed "Subscriptions" with six tabs, left to right "Individual
     Subscriptions", "Institutional Subscriptions", "Subscription Types",
     "Subscription Policies", "Payment Types" and "Payments", open on
     "Individual Subscriptions", whose list reads "No Items" (Actors row
     1; Fields, the "Payments" page and the subscription lists).
   - **The Subscription Manager signs in**: lands on the access-denied
     page "The current role does not have access to this operation.",
     which has no side menu; its user menu offers "Dashboard" (which
     leads to the Profile page), and the journal's address followed by
     "dashboard/editorial" opens the same access-denied page (Actors row
     9).
   - **The Subscription Manager at the address**: the page's address
     opens the page with the same six tabs, and its side menu offers
     "Start A New Submission" and "Payments" (it also offers
     "Institutions", which refuses the role ⚠ [A16](#a16)) (Actors rows
     1, 9).
   - **No institution yet**: the Subscription Manager opens
     "Institutional Subscriptions" and presses "Create New
     Subscription": the window shows "An institution must be created
     before new subscriptions can be made." as soon as it opens (Rule
     19). Close the window.
   - **The Section Editor and the Reader**: the page's address opens the
     access-denied page for each (Actors row 1).
   - **Signed out**: the page's address opens the Login page (Actors row
     1).
   - **Control**: the Subscription Manager's "Subscription Types" tab
     lists "Campus Year" with "Institutional" under "Subscriptions"
     (Actors row 1; Fields, the "Subscription Types" tab). <sup>s0</sup>

5. **Subscription types: created, edited and deleted**

   Given: Journal Manager and two Readers, Sam (an active "Old Rate"
   subscription) and Tess (an active "Other Rate" subscription), on a
   scratch journal that requires subscriptions, with the individual
   types "Old Rate" and "Other Rate" (12 months each), and the published,
   current issue "Vol. 1 No. 1 (2026)" (its "Access status"
   "Subscription") holding "Tidal Patterns" with the galley "PDF".

   - **An empty window**: at the journal's address followed by "payments",
     on "Subscription Types" press
     "Create New Subscription Type": neither "Individual (users are
     validated via login)" nor "Institutional (users are validated via
     domain or IP address)" is ticked (Fields, the subscription type
     window). Press "Save": "This field is required." shows under "Name
     of Type" (Rule 15).
   - **A cost that is not a number**: type Online Year in "Name of
     Type", choose the US dollar in "Currency", type forty in "Cost",
     choose "Online" in "Format", type 12 in "Duration" and press "Save":
     the window stays open, nothing is marked under "Cost", and a notice
     reads "The cost must be a positive, numeric value." (Rule 15).
   - **A duration that is not a number**: replace forty with 40 and 12
     with a, and press "Save": the notice reads "The duration must be a
     positive, numeric value." (Rule 15).
   - **Saved**: replace a with 12 and press "Save", neither kind ticked:
     the window closes, "Your changes have been saved." shows, and the
     list ends with "Online Year", "Individual", "1 year", "40.00 (USD)"
     (Rules 14, 15; Fields, the "Subscription Types" tab).
   - **Non-expiring**: create Lifetime the same way, with 300 in "Cost"
     and "Duration" left empty: its row reads "Non-expiring" (Rule 14).
   - **"Edit"**: "Online Year"'s arrow › "Edit": the window opens with
     the "Individual" and "Institutional" choices greyed (Rule 15). Close
     it.
   - **Institutional and membership**: press "Create New Subscription
     Type" and tick "Institutional (users are validated via domain or IP
     address)": "Subscriptions require membership information (e.g. of an
     association, organization, consortium, etc.)" greys (Rule 15;
     Fields, the subscription type window).
   - **An unsaved change**: type Draft in "Name of Type" and close the
     window: it asks "The data on this form has changed. Do you wish to
     continue without saving?"; press "OK": the window closes, and the
     list holds no "Draft" (Fields, the "Payments" page).
   - **Deleting a type**: Sam signs in and presses "Tidal Patterns"'s
     "PDF": the PDF opens.
     The Journal Manager presses "Old Rate"'s arrow › "Delete": it asks
     "Warning! All subscriptions with this subscription type will also be
     deleted. Are you sure you want to continue and delete this
     subscription type?"; press "OK": "Old Rate" leaves the list, and
     "Individual Subscriptions" no longer lists Sam. Sam reloads "Tidal
     Patterns": "PDF" shows the padlock (Rule 16).
   - **Control**: Tess, whose "Other Rate" was not deleted, still opens
     "Tidal Patterns"'s "PDF" (Rules 16, 17). <sup>s0</sup>

6. **An individual subscription by hand: refused, saved, renewed and
   deleted**

   Given: Journal Manager and two Readers, Nova (no subscription) and
   Sam (an active "Lifetime" subscription), on a scratch journal that
   requires subscriptions, whose subscription contact on "Subscription
   Policies" is "Subscriptions Desk" at desk@mail.test, with the
   individual types "Online Year" (12 months) and "Lifetime"
   (non-expiring), and the published, current issue "Vol. 1 No. 1
   (2026)" (its "Access status" "Subscription") holding "Tidal Patterns"
   with the galley "PDF".

   - **No user**: at the journal's address followed by "payments", on
     "Individual Subscriptions" press
     "Create New Subscription", choose "Online Year" in "Subscription
     type" and press "Save": the window stays open with "A user is
     required." (Rule 19).
   - **No dates**: choose Nova in "Locate a User", "Active" in "Status",
     and press "Save": "A subscription start date is required.", and the
     same for the end date (Rule 19).
   - **A user who has one**: choose Sam instead. "Start date" and "End
     date" now show today's date, which the window does not send
     ⚠ [A28](#a28), so type yesterday's date in "Start date" and then
     today's date, type the same day next year in "End date", and press
     "Save": "This user already has a subscription for this journal."
     (Rule 19).
   - **Saved, with the email**: choose Nova, type yesterday's date in
     "Start date" and then today's date again, type INV-1 in "Reference
     Number", tick "Send the user an email with their username and
     subscription details." and press "Save": the window closes, "Your
     changes have been saved." shows, and the list gains Nova's row: her
     full name, her email, "Online Year", "Active", the two dates and
     "INV-1" (Rule 19; Fields, the subscription lists).
   - **The email**: the mail catcher holds for Nova an email from
     Subscriptions Desk at desk@mail.test, subject "Subscription
     Notification", naming the journal, "Online Year" and Nova's username
     (Side effects).
   - **At once**: Nova signs in and presses "Tidal Patterns"'s "PDF": the
     PDF opens (Rules 17, 19).
   - **An unsaved change**: Nova's row's arrow › "Edit": the window opens
     on Nova, filled in, with the email box unticked (Fields, the
     subscription window). Replace INV-1 with INV-2 and close the window:
     it asks "The data on this form has changed. Do you wish to continue
     without saving?"; press "OK": the row still reads "INV-1" (Fields,
     the "Payments" page).
   - **"Renew"**: Nova's row's arrow › "Renew" asks "Are you sure you want
     to renew this subscription?"; press "OK": "End" now reads the same
     day two years from today, and "Status" still reads "Active" (Rule
     20).
   - **Non-expiring**: Sam's row shows empty "Start" and "End", and its
     arrow offers "Edit" and "Delete" but no "Renew" (Rule 20; Fields,
     the subscription lists).
   - **"Delete"**: Nova's row's arrow › "Delete" asks "Are you sure you
     wish to delete this subscription?"; press "OK": the row is gone.
     Nova reloads "Tidal Patterns": "PDF" shows the padlock (Rule 21).
   - **Control**: the mail catcher holds for Nova that one "Subscription
     Notification" and nothing else: the refusals, "Renew" and "Delete"
     sent nothing (Side effects). <sup>s0</sup>

7. **An institutional subscription covers a visitor's address**

   Given: Journal Manager, the Reader Nova, and a visitor signed out in
   a second browser, on a scratch journal that requires subscriptions and
   has the "Subscription Block" placed in the sidebar, with the
   institutional type "Campus Year" (12 months, "Online") and no
   individual type, the institutions "Harbour Library", whose IP ranges
   cover the visitor's address, and "Dock Library", with no IP range,
   and the published, current issue "Vol. 1 No. 1 (2026)" (its "Access
   status" "Subscription") holding "Tidal Patterns" with the galley
   "PDF".

   - **Before**: the visitor opens "Tidal Patterns" from "Current":
     "PDF" shows the padlock, and the block reads "Login to access
     subscriber-only resources." (Rules 10, 33).
   - **No individual type**: the Journal Manager opens the journal's
     address followed by "payments", then "Individual Subscriptions", and
     presses "Create New Subscription":
     the window shows "A subscription type must be created before new
     subscriptions can be made." as soon as it opens (Rule 19). Close
     it.
   - **The institutional window**: on "Institutional Subscriptions" press
     "Create New Subscription": the window holds "Locate a User",
     "Subscription type" offering "Campus Year", "Status", "Start date"
     and "End date", "Institution" offering "Harbour Library" and "Dock
     Library", "Mailing address", "Domain" under "If a domain is entered
     here, IP ranges are optional. Valid values are domain names (e.g.
     lib.sfu.ca).", "Reference Number", "Notes" and the email box, and no
     "Membership" (Fields, the subscription window).
   - **No domain and no IP range**: choose Nova in "Locate a User",
     "Campus Year" in "Subscription type", "Active" in "Status" and "Dock
     Library" in "Institution", type today's date in "Start date" and the
     same day next year in "End date", and press "Save": the window stays open with "The selected
     subscription type requires a domain and/or an IP range for
     subscription authentication." (Rule 19).
   - **A malformed domain**: type not a domain in "Domain" and press
     "Save": "Please enter a valid domain." (Rule 19).
   - **Saved**: empty "Domain", choose "Harbour Library" and press
     "Save": the window closes, "Your changes have been saved." shows,
     and the list reads "Harbour Library", "Campus Year", "Active" and
     the two dates (Rule 19; Fields, the subscription lists).
   - **The visitor, still signed out**: reloads "Tidal Patterns": "PDF"
     shows no padlock and opens the PDF; the block reads "Access
     provided by: Harbour Library" and "Accessed from:" with the
     visitor's address (Rules 11, 18, 33).
   - **Control**: the Journal Manager edits the row, chooses "Needs
     Information" in "Status" and presses "Save". The visitor reloads
     "Tidal Patterns": "PDF" shows the padlock again, and the block reads
     "Login to access subscriber-only resources." (Rules 18, 33).
     <sup>s0</sup>

8. **The "Subscriptions" page and the subscription policies**

   Given: Journal Manager, a Reader, and a visitor signed out in a
   second browser, on a scratch journal that requires subscriptions, has
   payments set up with "Manual Fee Payment" and has never saved
   "Subscription Policies", with the individual type "Online Year"
   (described as "A year of online reading."), the hidden individual
   type "Staff Rate" and the institutional type "Campus Year".

   - **The policies refused**: the Journal Manager opens "Payments" ›
     "Subscription Policies" and presses "Save": "This field is
     required." shows under "Name", "Email" and "Mailing Address", and
     nothing is saved (Rule 24; Fields, the "Subscription Policies" tab).
   - **A malformed email**: type Subscriptions Desk in "Name", desk@ in
     "Email" and 1 Harbour Road in "Mailing Address", and press "Save":
     "Please enter a valid email address." shows under "Email" (Fields,
     the "Subscription Policies" tab).
   - **Saved**: replace desk@ with desk@mail.test, type +1 555 0100 in
     "Phone" and Subscriptions renew each January. in "Subscription
     Information", and press "Save": "Your changes have been saved."
     (Rule 24). The four "Online Payment Notifications" boxes can be
     ticked (Rule 25).
   - **The visitor's "Subscriptions" page**: the visitor opens the
     journal's address followed by "about/subscriptions": the breadcrumb
     "Home / Subscriptions", the heading "Subscriptions", "Subscriptions
     renew each January.", then "Subscriptions Contact" with
     "Subscriptions Desk", "1 Harbour Road", "Phone" with +1 555 0100 and
     desk@mail.test as a link (Rule 26; Fields, the "Subscriptions"
     page).
   - **The types listed**: under "Individual Subscriptions", the line
     "Individual subscriptions require login to access subscription
     content." and a table "Name", "Format", "Duration", "Cost" listing
     "Online Year" with "A year of online reading." under it, and no
     "Staff Rate"; under "Institutional Subscriptions", "Institutional
     subscriptions do not require login. The user's domain and/or IP
     address is used to provide access to subscription content." and
     "Campus Year". The visitor is offered no "Purchase New
     Subscription" (Rules 16a, 26; Fields, the "Subscriptions" page).
   - **The Reader**: signed in, the same page offers "Purchase New
     Subscription" under each table (Fields, the "Subscriptions" page).
   - **The hidden type in the window**: the Journal Manager opens
     "Individual Subscriptions" › "Create New Subscription": "Subscription
     type" offers "Staff Rate" beside "Online Year" (Rule 16a). Close
     the window.
   - **Control**: on scenario 1's journal, whose payments are not set
     up, the journal's address followed by "about/subscriptions" leads
     to the journal's home page (Rule 26). <sup>s0</sup>

9. **A reader buys an individual subscription**

   Given: Journal Manager and the Reader Nova (no subscription), on a
   scratch journal that requires subscriptions, has payments set up with
   "Manual Fee Payment" and the payment instructions "Pay by bank
   transfer." and has the "Subscription Block" placed in the sidebar,
   with the individual type "Online Year" (12 months, 40 USD) and the
   published, current issue "Vol. 1 No. 1 (2026)" (its "Access status"
   "Subscription") holding "Tidal Patterns" with the galley "PDF".

   - **"My Subscriptions"**: Nova opens the journal's address followed
     by "user/subscriptions": the heading "My Subscriptions", then
     "Subscription Status", a table "Status" / "Description" explaining
     "Needs Information", "Needs Approval", "Awaiting Manual Payment" and
     "Awaiting Online Payment", then "Individual Subscription" with
     "Purchase New Subscription" (Rule 27; Fields, "My Subscriptions").
   - **The purchase page**: press "Purchase New Subscription": the
     browser tab reads "Purchase Individual Subscription", and the page
     shows no heading; its box "Purchase Subscription" holds "Subscription
     Type", offering "Online Year", and "Membership". Choose "Online
     Year" and press "Save" (Rule 28; Fields, the purchase pages).
   - **The payment page**: the "Manual Fee Payment" page shows the item
     "Subscription Fee (Online Year)", the fee of 40, "Pay by bank
     transfer." and "Send notification of payment" (Rules 28, 30).
   - **Awaiting payment**: Nova's "My Subscriptions" now shows "Online
     Year" with the status "Awaiting Manual Payment" and no button
     (Rules 27, 31); the "Subscription" block on the other pages reads
     otherwise ⚠ [A13](#a13). "Tidal Patterns"'s "PDF" still shows the
     padlock (Rule 17).
   - **The manager's list**: the Journal Manager opens "Payments" ›
     "Individual Subscriptions": Nova's row reads "Online Year",
     "Awaiting Manual Payment", and today's date under both "Start" and
     "End" (Rule 28). Its arrow › "Edit": choose "Active" in "Status",
     type the same day next year in "End date" and press "Save" (Rule
     30).
   - **Active**: Nova reloads "My Subscriptions": the status reads
     "Expires:" with that date, and the row offers "Renew" and
     "Purchase" (the latter takes access away when saved ⚠ [A10](#a10))
     (Rules 27, 31). "Tidal Patterns"'s "PDF" opens, and the block reads
     "Online Year", then "Expires:" with the same date (Rules 17, 33).
   - **Control**: the mail catcher holds no email to Nova: neither the
     purchase nor the Journal Manager's edit sent one (Side effects).
     <sup>s0</sup>

10. **A reader buys an institutional subscription**

    Given: Journal Manager and the Reader Nova, on a scratch journal
    that requires subscriptions and has payments set up with "Manual Fee
    Payment", with the institutional type "Campus Year" ("Online", 12
    months, 400 USD) and no institution.

    - **"My Subscriptions"**: Nova opens the journal's address followed
      by "user/subscriptions": under "Institutional Subscriptions",
      "Purchase New Subscription" (Fields, "My Subscriptions").
    - **The purchase page**: press it: the page is headed "Purchase
      Institutional Subscription"; its box "Purchase Subscription" holds
      "Subscription Type", arriving with "Campus Year" chosen,
      "Membership", "Institution name" and "Mailing address", then
      "Domain" and "IP ranges", then "Continue" and "Cancel" (Rule 29;
      Fields, the purchase pages).
    - **"Cancel"**: type Harbour Library in "Institution name" and press
      "Cancel": "My Subscriptions" is back (Rule 29).
    - **Refused, empty**: press "Purchase New Subscription" again, then
      "Continue" as the page arrives: the top of the page reads "An
      institution name is required." and "The selected subscription type
      requires a domain and/or an IP range for subscription
      authentication." (Rule 29).
    - **A malformed range**: type Harbour Library in "Institution name"
      and 999.1.1.1 in "IP ranges", and press "Continue": "Please enter
      a valid IP range." (Rule 29).
    - **A malformed domain**: replace 999.1.1.1 with 142.58.103.1, type
      not a domain in "Domain" and press "Continue": "Please enter a
      valid domain." (Rule 29).
    - **Accepted**: empty "Domain" and press "Continue": the "Manual Fee
      Payment" page shows "Subscription Fee (Campus Year)" and the fee of
      400 (Rules 28, 29, 30).
    - **Nova's page**: "My Subscriptions" lists under "Institutional
      Subscriptions" the row "Campus Year", "Harbour Library", "Awaiting
      Manual Payment" (Rule 27; Fields, "My Subscriptions").
    - **The manager's side**: the Journal Manager's "Payments" ›
      "Institutional Subscriptions" lists "Harbour Library", "Campus
      Year", "Awaiting Manual Payment" (Rule 29). The side menu's
      "Institutions" lists "Harbour Library" (Side effects).
    - **Control**: "Institutions" lists "Harbour Library" once: the
      cancelled page added no institution (Side effects; Rule 29).
      <sup>s0</sup>

11. **"Partial expiry"**

    Given: Journal Manager and two Readers, Eve (an "Online Year"
    subscription from 2025-01-01 to 30 days before today, "Active") and
    Sam (an active "Online Year" subscription whose dates hold today),
    on a scratch journal that requires subscriptions, whose
    "Subscription Policies" hold the contact "Subscriptions Desk"
    (desk@mail.test, 1 Harbour Road) and "Partial expiry", with the
    published, current issue "Vol. 1 No. 1 (2025)", dated 2025-03-01,
    whose "Full Issue" galley is "PDF", holding "Tidal Patterns" with the
    galley "PDF", published today.

    - **Partial expiry**: Eve signs in and opens the issue with
      "Current": its "Full Issue" "PDF" opens, since the issue was
      published before her end date; "Tidal Patterns"'s "PDF", whose own
      publication date is today, does not open (Rule 23).
    - **Full expiry**: the Journal Manager opens the journal's address
      followed by "payments", then "Subscription Policies", selects
      "Full expiry" and presses "Save":
      "Your changes have been saved." (Rule 24). Eve presses the "Full
      Issue" "PDF" again: it does not open (Rule 23).
    - **Control**: Sam opens both the "Full Issue" "PDF" and "Tidal
      Patterns"'s "PDF" after the change (Rule 17). <sup>s0</sup>

12. **Open access by date, by switch and by article; the open-access
    email**

    Given: Journal Manager, a Reader, and a visitor signed out in a
    second browser, on a scratch journal that requires subscriptions,
    whose "Subscription Policies" hold the contact "Subscriptions Desk"
    (desk@mail.test, 1 Harbour Road), with three published issues: "Vol.
    1 No. 1 (2026)", "Access status" "Subscription" and "Open access date"
    today, holding "Tidal Patterns"; "Vol. 1 No. 2 (2026)", "Access
    status" "Open access", holding "Coastal Winds"; and "Vol. 1 No. 3
    (2026)", "Access status" "Subscription" with no date, holding "Storm
    Surges", its "Open Access" box ticked, and "Harbour Walls"; each
    article with the galley "PDF".

    - **By date**: the visitor opens "Tidal Patterns" from "Archives":
      "PDF" shows no padlock and opens the PDF (Rule 9). The Journal
      Manager opens the issue's "Access" tab
      ([Issues](U50-issues.md)): it still reads "Subscription", with
      today's date under "Open access date" (Rule 9).
    - **By switch**: the visitor's "Coastal Winds" "PDF" opens (Rule 7).
    - **By article**: the visitor's "Storm Surges" "PDF" opens, while
      "Harbour Walls"'s shows the padlock (Rule 7).
    - **The box**: the Journal Manager opens the journal's address
      followed by "payments", then "Subscription Policies", ticks
      "Registered readers will have the option of
      receiving the table of contents by email when an issue becomes open
      access." and presses "Save": "Your changes have been saved."
      (Settings bullet 11).
    - **The open-access email**: run the site's scheduled tasks, then its
      background jobs: the mail catcher holds for the Reader, and for the
      Journal Manager, one email from the journal's principal contact with
      the subject "Free to read: Vol. 1 No. 1 (2026) of {journal name} is
      now open access", whose body holds the issue's name as a link to its
      page and which ends with the unsubscribe footer of [Notifications
      center & email
      preferences](U05-notifications-center-and-email-preferences.md)
      (Side effects). Run on one of the days [A29](#a29) names, the mail
      catcher holds two for each of them.
    - **Control**: no email names "Vol. 1 No. 2 (2026)" or "Vol. 1 No. 3
      (2026)": an issue switched to "Open access" and an article's "Open
      Access" box send nothing (Side effects). <sup>s0</sup>

13. **"Delayed Open Access"**

    Given: Journal Manager and a Reader, on a scratch journal that
    requires subscriptions and has never saved "Delayed Open Access",
    with the published issue "Vol. 1 No. 1 (2026)", "Access status"
    "Open access", holding "Tidal Patterns", and the unpublished issue
    "Vol. 1 No. 2 (2026)", into which "Coastal Winds" is scheduled, each
    article with the galley "PDF".

    - **The list**: the Journal Manager opens Settings › Distribution ›
      "Access": "Delayed Open Access" shows an empty box ⚠ [A17](#a17).
      Choose "6 Months" and press "Save": "Saved" (Rules 5, 6).
    - **Published under it**: the Journal Manager publishes "Vol. 1 No.
      2 (2026)" with "Publish Issue" ([Issues](U50-issues.md)): its
      "Access" tab reads "Subscription", with "Open access date" six
      months from today (Rule 6).
    - **The reader side**: the Reader opens "Coastal Winds" from
      "Archives": its "PDF" shows the padlock (Rules 6, 7).
    - **Control**: "Vol. 1 No. 1 (2026)", published before, still reads
      "Open access" on its "Access" tab, and the Reader's "Tidal Patterns"
      "PDF" opens (Rule 6). <sup>s0</sup>

14. **A "Purchase Article" fee, and "Only Restrict Access to PDF…"**

    Given: Journal Manager, a Reader, and a visitor signed out in a
    second browser, on a scratch journal that requires subscriptions and
    has payments set up with "Manual Fee Payment" and a "Purchase
    Article" fee of 5 USD, with the published, current issue "Vol. 1 No.
    1 (2026)" (its "Access status" "Subscription") holding "Tidal
    Patterns" with the galleys "PDF" and "HTML".

    - **The price on the link**: the visitor opens "Tidal Patterns" from
      "Current": "PDF" and "HTML" each show the padlock, their labels
      followed by "(USD 5)", and a screen reader hears "Requires
      Subscription or Fee" before each label (Rule 10; Settings bullet
      5).
    - **Signed out**: the visitor presses "PDF": the Login page opens
      with "Subscription or article purchase required to access item. To
      verify subscription, access previous purchase, or purchase article,
      log in to journal." (Rule 12).
    - **Signed in**: the Reader presses "PDF": the "Manual Fee Payment"
      page opens for a "Purchase Article Fee" of 5 (Rules 12, 30); paying
      it this way never opens the article ⚠ [A6](#a6).
    - **Only PDF restricted**: the Journal Manager opens "Payments" ›
      "Payment Types", ticks "Only Restrict Access to PDF version of issues
      and articles" and presses "Save". The visitor reloads "Tidal
      Patterns": "PDF" still shows the padlock, "HTML" shows none, and
      pressing "HTML" opens it (Rule 10; Settings bullet 6).
    - **Control**: the visitor's "PDF" still opens the Login page with
      the same message (Rule 12). <sup>s0</sup>

15. **Registered readers only, on a journal that requires subscriptions**

    Given: a Reader, signed out, on a scratch journal that requires
    subscriptions and has "Users must be registered and log in to view
    open access content." ticked, with the published, current issue
    "Vol. 1 No. 1 (2026)" (its "Access status" "Subscription") holding
    "Tidal Patterns" and "Open Waters", its "Open Access" box ticked,
    each with the galley "PDF".

    - **Signed out**: press "Current", then "Open Waters": the article's
      page opens; press its "PDF": the Login page opens. "Tidal
      Patterns"'s "PDF" opens the Login page too (Rule 13).
    - **Signed in**: sign in as the Reader, open "Open Waters" and press
      "PDF": the PDF opens (Rules 7, 13).
    - **Control**: the Reader's "Tidal Patterns" "PDF" shows the padlock
      (Rules 7, 10). <sup>s0</sup>

16. **No subscriptions on a press or a preprint server** {OMP OPS}

    Given: Press Manager (Preprint Server Manager), and a visitor signed
    out, on the seeded press (the seeded preprint server).

    - **The press's Distribution**: on OMP, Settings › Distribution has
      no "Access" tab (Purpose, the absence paragraph).
    - **The server's "Access" tab**: on OPS, Settings › Distribution ›
      "Access" holds "Posting Mode", with the choices "The server will
      provide open access to its contents." and "OPS will not be used to
      post the server's contents online.", and "Enable OAI", and nothing
      more; a choice saved there is not kept ⚠ [OPS1](#ops1) (Purpose,
      the absence paragraph).
    - **No Subscription Manager**: Settings › Users & Roles › "Roles"
      lists no "Subscription Manager" (Purpose, the absence paragraph).
    - **No "Subscriptions" page**: the visitor opens the press's (the
      server's) address followed by "about/subscriptions", then by
      "user/subscriptions": neither opens a "Subscriptions" or "My
      Subscriptions" page (Purpose, the absence paragraph).
    - **Control**: on the seeded journal, the Journal Manager's Settings
      › Distribution › "Access" holds "Publishing Mode" with its three
      choices, and "Roles" lists "Subscription Manager"; the same two
      addresses opened the "Subscriptions" page for scenario 8's visitor
      and "My Subscriptions" for scenario 9's Reader (Actors intro;
      Fields, the "Access" tab, the "Subscriptions" page and "My
      Subscriptions"). <sup>s0</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A12 (issue report
    `docs/issues/U52-A9-membership-address-signed-out-blank-page.md`):
    a signed-out visitor at the "Purchase Individual Subscription", "Purchase Institutional Subscription" and membership addresses sent to the Login page
  - the guard for OPS1 (issue report
    `docs/issues/U51-OPS1-posting-mode-says-saved-keeps-nothing.md`): on a
    preprint server, Settings › Distribution › "Access" offers "Enable OAI"
    and no "Posting Mode", and an "Enable OAI" choice saved is still
    selected after a reload {OPS}.
  - the guard for A14 (issue report
    `docs/issues/U51-A14-non-pdf-galley-shown-open-refused.md`): with "Only
    Restrict Access to PDF version of issues and articles" ticked and no fee
    set, a visitor opens the HTML galley of a restricted article and of a
    "Full Issue".
  - the guard for A20 (issue report
    `docs/issues/U51-A20-full-issue-asks-fee-of-no-amount.md`): with only an
    "Association Membership" fee, a signed-in reader without a subscription
    who presses a "Full Issue" galley lands on the "Subscriptions" page.
  - the guard for A13 (issue report
    `docs/issues/U51-A13-A26-subscription-block-status-wrong.md`): a
    subscription bought with the manual method reads "Awaiting Manual
    Payment" in the "Subscription" block on the home page, and once set to
    "Needs Approval" reads "Inactive" there (A13, A26).
  - the guard for A9 (issue report
    `docs/issues/U51-A9-individual-purchase-refusal-says-nothing.md`): on
    "Purchase Individual Subscription", "Save" with a type that requires
    membership and "Membership" empty shows a message
    that "Membership" is required.
  - the guard for A23 (issue report
    `docs/issues/U51-A23-purchase-link-on-open-journal-leads-home.md`): a
    signed-in reader on an open-access journal with payments set up finds no
    "Purchase New Subscription" on "Subscriptions".
  - the guard for A24 (issue report
    `docs/issues/U51-A24-subscription-offer-links-lead-home-payments-off.md`):
    on a journal that requires subscriptions with payments off, "My
    Subscriptions" and the "Subscription" block offer neither "View
    Available Subscription Types" nor "Learn More".
  - the guard for A16 (issue report
    `docs/issues/U51-A16-subscription-manager-offered-institutions-refused.md`):
    a Subscription Manager without the Journal Manager role creates an
    institution from "Institutions" and then an institutional subscription
    (with the other fix: the side menu offers no "Institutions").
  - the guard for A7 (issue report
    `docs/issues/U51-A7-issue-contents-lock-galleys-reader-can-open.md`): on
    a restricted issue's table of contents a Section Editor without a
    subscription sees no padlock.
  - the guard for A18 (issue report
    `docs/issues/U51-A18-additional-file-no-padlock-refused.md`): a
    restricted article's additional file shows the padlock to a visitor.
  - the guard for A19 (issue report
    `docs/issues/U51-A19-locked-link-fee-while-payments-off.md`): with
    "Purchase Article" and "Purchase Issue" fees saved and payments turned
    off, the locked galley links show no price.
  - the guard for A22 (issue report
    `docs/issues/U51-A22-subscription-search-fields-narrow-nothing.md`): on
    both subscription lists, a search by each of the ten fields ("is" and
    "contains") lists only the subscriptions that match.
  - the guard for A10 (issue report
    `docs/issues/U51-A10-purchase-on-active-subscription-removes-access.md`):
    on "My Subscriptions" a running subscription offers only "Renew", and
    its purchase address changes nothing.
  - the guard for A25 (issue report
    `docs/issues/U51-A25-institutional-purchase-ip-ranges-read-array.md`):
    the institutional purchase page opened for an existing institutional
    subscription shows its stored IP ranges.
  - the guard for A11 (issue report
    `docs/issues/U51-A11-institutional-purchase-adds-institution-each-time.md`):
    two institutional purchases for the same institution leave one entry on
    the Institutions page.
- **Nothing new to test**:
  - subscriptions set to "Needs Information", "Needs Approval" or
    "Other, See Notes", which open nothing and read "Inactive" on "My
    Subscriptions" (Rules 17, 27)
  - "Renew" on "My Subscriptions" (Rule 31)
  - searching the subscription lists by "Given Name", "Family Name",
    "Username" or "Email" (Rule 22)
  - a "Start date" still to come (Rule 17)
  - "Awaiting Online Payment" and its "Purchase" button (Rules 27, 31)
  - a "Print" type, which opens nothing (Rule 17)
  - the "Purchase Issue" fee on a "Full Issue" galley (Settings bullet
    5; Rules 10, 12)
  - the purchase pages' addresses on a journal with no subscription
    type (Rule 32)
  - the Editor, the Production Editor and the Site Administrator on the
    "Payments" page, offered what the Journal Manager of scenarios 4 to
    10 is (Actors row 1)
  - "Association Membership" set: the signed-out visitor's message, the
    one scenario 14's "Purchase Article" fee gives (Settings bullet 7;
    Rule 12)
- **Register carries it**:
  - A1 ("Publishing Mode" showing no choice on a journal that never
    saved one; Rule 1)
  - A4 (the email-box refusal pointing to "the journal Setup"; Rule 19)
  - A5 (a signed-in reader sent to the home page from a locked galley
    while payments are not set up; Rule 12; scenario 3 passes it)
  - A6 (an article or issue bought with the manual method never
    opening; Rule 30; scenario 14 passes it)
  - A7 (the issue's page locking galleys the reader can open; Rule 11;
    scenario 3 passes it)
  - A8 and A27 (the expiry reminders, whose task fails and sends
    nothing; Side effects; Settings bullet 9)
  - A9 (the individual purchase page refusing a missing membership
    without a word; Rule 28)
  - A10 and A25 ("Purchase" on an active subscription, individual or
    institutional; Rule 31; scenario 9 passes it)
  - A11 (every institutional purchase adding an institution; Rule 29)
  - A12 (a signed-out visitor at a purchase page's address; Rule 32)
  - A13 (the block reading "Expired: {today}" for a subscription
    awaiting payment; Rule 33; scenario 9 passes it)
  - A14 (non-PDF galleys shown unlocked under "Only Restrict Access to
    PDF…" and refused while no fee is set; Rule 10)
  - A15 ("1 Months" and "1 Weeks"; Fields)
  - A16 (the Subscription Manager offered "Institutions" and refused it;
    Actors row 9; scenario 4 passes it)
  - A17 ("Delayed Open Access" arriving as an empty box; Settings bullet
    2; scenario 13 passes it)
  - A18 (a restricted article's additional file with no padlock; Rule
    10)
  - A19 (a fee on the locked link while payments are off; Rule 10)
  - A20 (a "Full Issue" asking for an issue fee of no amount while only
    a membership fee is set; Rule 12)
  - A21 (a "Start date" after the "End date" saved; Rule 19)
  - A22 (the six search fields that narrow nothing; Rule 22)
  - A23 ("Purchase New Subscription" on a journal that does not require
    subscriptions; Rule 26)
  - A24 ("View Available Subscription Types" and "Learn More" while
    payments are not set up; Rules 27, 33)
  - A26 (the block for a subscription set to "Needs Approval", "Needs
    Information" or "Other, See Notes"; Rule 33)
  - A28 (a date box showing today's date after a refused "Save", which
    the window does not send; Rule 19; scenario 6 passes it)
  - A29 (the open-access email sent twice on the first day of some
    months; Side effects; scenario 12 passes it)
  - OPS1 (a preprint server's "Posting Mode" not kept; Purpose;
    scenario 16 passes it)
- **No seed**:
  - an institutional subscription matched by its "Domain" (Rule 18; no
    test install is reached by a domain name)
  - a paid-up "Association Membership" opening restricted galleys
    (Settings bullet 7; Rule 11)
  - a completed online payment and what follows it: the "Online Payment
    Notifications" emails, the subscription made "Active" or "Needs
    Approval", and the renewal (Settings bullet 10; Side effects)
  - a press whose payments are enabled, whose side menu still offers no
    "Payments" (Purpose, the absence paragraph)
- **Owned by another feature**:
  - setting an issue's "Access status" and "Open access date", and
    ticking an article's "Open Access", on the issue screens (Actors
    row 3; *[Issues](U50-issues.md)*, scenario 8)
  - "Publishing Mode" not online (Settings bullet 1; Rule 4;
    *[Issues](U50-issues.md)*, scenario 9)
  - the manual method's page and its "Send notification of payment"
    email (Rule 30; *Payments & APCs*)
  - a person's "An issue has been made open access." turned off
    (Settings bullet 14; *[Notifications center & email
    preferences](U05-notifications-center-and-email-preferences.md)*,
    scenarios 3 and 4, on another row)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-25), unreviewed unless an
entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A4](#a4) | The email-box refusal sends the manager to "the journal Setup" for fields that are on "Subscription Policies" | 🐞 | minor | — |
| [A7](#a7) | An issue's table of contents shows a padlock on galleys that editors, the article's author or a former subscriber under "Partial expiry" can open | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A8](#a8) | Expiry reminders run once a month and reach only subscriptions ending on matching days | 🐞 | user-visible | — |
| [A9](#a9) | A reader buying a subscription type that requires membership gets the same page back, unexplained, when "Membership" is empty | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A10](#a10) | A subscriber who presses "Purchase" beside an active subscription loses access before paying | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A11](#a11) | Each institutional subscription a reader buys adds another copy of their institution to the journal's list | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A12](#a12) | A signed-out visitor at a purchase page's address gets an empty page, the server failing | 🐞 | low · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A13](#a13) | The "Subscription" block reads "Expired: {today}" for a subscription awaiting payment | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A14](#a14) | A journal restricting only PDFs shows its HTML galleys unlocked, then refuses them to readers without a subscription | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A15](#a15) | The delayed open access and expiry reminder lists offer "1 Months" and "1 Weeks" | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A16](#a16) | A Subscription Manager's side menu offers "Institutions", and the page refuses them | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A17](#a17) | "Delayed Open Access" shows an empty box instead of "Disabled" until a manager saves a choice | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A18](#a18) | A restricted article's additional file shows a plain file icon instead of a padlock, then refuses the reader | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A19](#a19) | A journal with payments turned off still shows readers a price on its locked galley links | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A20](#a20) | A reader pressing a locked "Full Issue" is asked to pay an issue fee of no amount when only a membership fee is set | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A21](#a21) | The subscription window saves a start date after the end date | 🐞 | minor | — |
| [A22](#a22) | Searching the subscription lists by reference number, membership, notes or institution lists every subscription | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A23](#a23) | "Subscriptions" offers "Purchase New Subscription" on an open-access journal, and it leads to the home page | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A24](#a24) | While payments are off, a reader's "Learn More" and "View Available Subscription Types" lead to the home page | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A25](#a25) | A reader reopening their institutional subscription's purchase page finds "IP ranges" reading "Array" | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A26](#a26) | The "Subscription" block reads "Expires: {date}" for an inactive subscription | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A27](#a27) | The expiry-reminder task stops with an error and sends nothing | 🐞 | user-visible · crash: server | — |
| [A28](#a28) | After a refused "Save", the date boxes show today's date, yet "Save" says the start date is missing | 🐞 | user-visible | — |
| [A29](#a29) | Readers get the open-access email twice when an issue opens on the 1st of some months | 🐞 | minor | — |
| [OPS1](#ops1) | A preprint server's "Posting Mode" says "Saved" but keeps nothing, so the server goes on posting {OPS} | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A1](#a1) | "Publishing Mode" shows no choice on a new journal, which publishes as open access | ❓ | minor | — |
| [A5](#a5) | Without payments set up, a signed-in reader pressing a locked galley lands on the home page with no word | ❓ | user-visible | — |
| [A6](#a6) | With the manual method, a bought article or issue never opens | ❓ | user-visible | — |
| [A2](#a2) | Retired: a "Cost" or "Duration" that is not a number is refused with a notice | ✅ | retired | — |
| [A3](#a3) | Retired: "Subscription Policies" refuses an empty contact name, email or mailing address | ✅ | retired | — |

### All apps

<a id="a1"></a>
**A1 — "Publishing Mode" arrives with no choice selected** · ❓ · minor.
On a new journal Settings › Distribution › "Access" shows none of the
three "Publishing Mode" choices selected, while the journal publishes as
open access and hides "Delayed Open Access" as the first choice does. A
Journal Manager cannot tell from the tab how the journal publishes.
Question: should a new journal arrive with "The journal will provide open
access to its contents." selected? Lean: yes; the tab should show what
the journal does. Basis: probe, 2026-09-25. <sup>f-a1</sup>

<a id="a4"></a>
**A4 — The notify refusal points to the wrong screen** · 🐞 · minor.
Saving a subscription with "Send the user an email with their username
and subscription details." ticked while the subscription contact is
missing is refused with "In order to send the user a notification email,
the subscription contact name and email address must be specified in the
journal Setup.". The fields are on the "Payments" page's "Subscription
Policies" tab; no "Setup" screen holds them. Basis: probe, 2026-09-25.
<sup>f-a4</sup>

<a id="a5"></a>
**A5 — A locked galley leads home without a word** · ❓ · user-visible.
On a journal that requires subscriptions but has not set up payments (the
install default), a signed-in reader without a subscription who presses a
locked galley is sent towards the "Subscriptions" page, which such a
journal does not offer, and lands on the journal's home page with no
message. The reader is told neither that a subscription is needed nor
whom to ask. Question: should the reader get a page that says a
subscription is required and shows the subscription contact, whatever
the payment settings? Lean: yes; subscriptions sold by hand are the
common case without payments. Basis: probe, 2026-09-25. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — A bought article never opens with the manual method** · ❓ · user-visible.
With "Manual Fee Payment" as the journal's method and a "Purchase
Article" (or "Purchase Issue") fee set, a signed-in reader who presses a
locked galley gets the manual method's page with the fee and "Send
notification of payment". Nothing on any screen lets a manager record
that payment, so the galley stays locked for that reader for good, and
pressing it again only shows the payment page again. Question: should the
manual method offer article and issue purchases at all, or should a
manager be able to mark such a payment as received? Lean: give the
manager a way to record it, as the workflow does for a manual publication
fee. Basis: probe, 2026-09-25. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — An issue's table of contents shows a padlock on galleys that editors, the article's author or a former subscriber under "Partial expiry" can open** · 🐞 · low.
On a journal that requires subscriptions, an issue's table of contents
shows a padlock on galley links that some users can in fact open, and a
screen reader announces "Requires Subscription" before them: - Editorial
staff without a subscription (journal managers, editors, section
editors, assistants such as copyeditors, and subscription managers) see
every article's and the "Full Issue"'s links locked. - The author of an
article sees that article's links locked. - On a journal set to "Partial
expiry", a former subscriber keeps access to the issues published while
the subscription ran. The table of contents still shows those issues'
"Full Issue" locked. Each of them presses the link and the galley opens.
The article's own page shows editors and authors the right state; for
the former subscriber's "Full Issue" no page does. The editorial roles
and "Partial expiry" both showed correctly on this page in OJS 2.x; the
author never did. Basis: probe, 2026-10-01. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — Expiry reminders reach almost nobody** · 🐞 · user-visible.
"Subscription Expiry Reminders" promise an email a set number of months
or weeks before and after each subscription's end. The task that sends
them runs on the first day of each month only, and each run looks for
subscriptions ending on exactly one day (the run's day moved by the
chosen interval), so a subscription whose end date falls on any other
day of the month gets none. The task was written for a
daily run; it has run monthly since 2025-08-13 (a regression, not a
choice). Today the task fails before sending anything ([A27](#a27));
this is what remains once that is fixed. Since: 2025-08-13 · Basis:
commit. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — A reader buying a subscription type that requires membership gets the same page back, unexplained, when "Membership" is empty** · 🐞 · low.
On "Purchase Individual Subscription", a signed-in reader chooses a
subscription type that requires membership information and presses
"Save" with "Membership" empty. The same page comes back with the type
still chosen, no message and nothing marked, and no subscription is
created. The form's own message, "The selected subscription type
requires membership information.", is never shown. Nothing on the page
says the box is needed: "Membership" carries no required mark and no
hint, and the type's name need not mention membership. The reader gets
through only by guessing that the one empty box is the reason. It needs
a journal that requires subscriptions and has payments set up (Settings
› Distribution › "Payments": "Enable" and a payment method), with an
individual type that requires membership. Basis: probe, 2026-10-01.
<sup>f-a9</sup>

<a id="a10"></a>
**A10 — A subscriber who presses "Purchase" beside an active subscription loses access before paying** · 🐞 · medium.
On "My Subscriptions", a running subscription, individual or
institutional, offers "Purchase" beside "Renew". The page it opens lists
the journal's subscription types, so a reader may press it to change
type or to buy again. Once they submit that page ("Save" on the
individual page, "Continue" on the institutional one), the subscription
becomes "Awaiting Manual Payment", its start and end dates become today,
and the reader's restricted articles lock again. Nothing has been paid,
and nothing warns them. The reader cannot undo it. With an online
payment method, paying then gives a new period from the day of payment,
so whatever time was left on the old subscription is lost. Basis: probe,
2026-10-01. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — Each institutional subscription a reader buys adds another copy of their institution to the journal's list** · 🐞 · low.
Every "Continue" on "Purchase Institutional Subscription" adds a new
institution to the journal's Institutions list under the name the reader
typed. A second purchase for the same institution, with the same name
and IP ranges, adds a second identical entry. When a reader reopens
their bought subscription with the "Purchase" button on "My
Subscriptions", the subscription moves to yet another new entry, and the
one it used stays on the list, used by nothing. The Journal Manager sees
look-alike entries with nothing to say which subscription uses which,
and tidies them by hand. Basis: probe, 2026-10-01. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — A signed-out purchase address fails with an empty page** · 🐞 · low · crash: server.
A signed-out visitor who opens "Purchase Individual Subscription" or
"Purchase Institutional Subscription" by its address (a bookmark, or a
link shared by a colleague) gets an empty page, the server failing,
instead of the Login page. The membership payment address fails the
same way ([Payments & APCs](U52-payments-and-apcs.md#a9)).
Basis: probe, 2026-10-01. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — The block reads "Expired" for a subscription awaiting payment** · 🐞 · low.
A reader who has just bought a subscription with the manual method sees,
in the "Subscription" block on the home page and the article pages, the
type's name and "Expired: {today}" (for a non-expiring type,
"Non-expiring"), where "My Subscriptions", and the block on that page,
read "Awaiting Manual Payment". Basis: probe, 2026-10-01. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — A journal restricting only PDFs shows its HTML galleys unlocked, then refuses them to readers without a subscription** · 🐞 · medium.
A subscription journal with payments enabled ticks "Only Restrict Access
to PDF version of issues and articles" and saves no "Purchase Article",
"Purchase Issue" or "Association Membership" fee. Its restricted issues
then show the non-PDF galleys (HTML, for one) without the padlock, on
the issue's page and the article's page. A reader without a subscription
who presses one is turned away exactly like a PDF: a signed-out visitor
to the Login page, a signed-in reader to the "Subscriptions" page. The
box and the link both say that only PDFs are restricted, so the journal
believes its HTML is open while every reader without a subscription is
refused it. The reader is not told why, and nothing tells the journal's
managers that the HTML is refused. Saving a fee makes the HTML open.
Basis: probe, 2026-10-01. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — The delayed open access and expiry reminder lists offer "1 Months" and "1 Weeks"** · 🐞 · low.
A journal manager sets how long issues stay subscription-only, or when
subscribers get expiry reminders. In those lists, the first choice after
"Disabled" reads "1 Months" or "1 Weeks". This happens in "Delayed Open
Access" on Settings › Distribution › "Access", and in the four
"Subscription Expiry Reminders" lists on the "Payments" page's
"Subscription Policies" tab. The choice works as intended; only its
wording is wrong. Most translations have the same fault, such as German
"1 Wochen" and Spanish "1 semanas". Basis: probe, 2026-10-01.
<sup>f-a15</sup>

<a id="a16"></a>
**A16 — A Subscription Manager's side menu offers "Institutions", and the page refuses them** · 🐞 · medium.
On a journal with payments enabled, a Subscription Manager who is not
also a Journal Manager sees "Institutions" in the side menu above
"Payments". Pressing it, or typing its address, shows "The current role
does not have access to this operation.". So the Subscription Manager
can no longer create the first institutional subscription alone. The
"Create New Subscription" window on "Institutional Subscriptions" reads
"An institution must be created before new subscriptions can be made.",
and only a Journal Manager can create one. Up to 3.3 the Subscription
Manager typed the institution's name and IP ranges into that window.
This reaches every subscription journal that gives someone the
Subscription Manager role without the Journal Manager role. Basis:
probe, 2026-10-01. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — "Delayed Open Access" shows an empty box instead of "Disabled" until a manager saves a choice** · 🐞 · low.
On Settings › Distribution › "Access", the "Delayed Open Access" list
shows an empty box instead of "Disabled" on a journal that has never
saved a choice in it. The list appears once "Publishing Mode" is set to
subscriptions. Pressing "Save" with the list untouched shows "Saved",
stores nothing for it, and the box stays empty on every later visit. The
journal behaves as "Disabled", so nothing is published differently. Only
the screen does not say which setting is in force. It concerns
subscription journals whose managers have never saved this list. Every
journal created on OJS 3.2 or later starts that way. Basis: probe,
2026-10-01. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — A restricted article's additional file shows a plain file icon instead of a padlock, then refuses the reader** · 🐞 · low.
On a journal that requires subscriptions, a restricted article's page
shows its main galleys ("PDF") with a padlock in place of the file icon,
so a reader can see what they may not open. A file listed under
"Additional Files" (a data set, a research instrument) keeps its plain
file icon. It is restricted all the same: a visitor who presses it is
sent to the Login page, and a signed-in reader without access ends up on
the journal's home page with no message. The page's hidden text for
screen readers is right ("Requires Subscription" before the file's
name), so only sighted readers are misled. The journal's theme is the
bundled Default Theme, the only theme OJS ships. Additional files showed
the padlock until 2017, when the change that gave them a list of their
own dropped it. Basis: probe, 2026-10-01. <sup>f-a18</sup>

<a id="a19"></a>
**A19 — A journal with payments turned off still shows readers a price on its locked galley links** · 🐞 · low.
A journal that requires subscriptions sets "Purchase Article" and
"Purchase Issue" fees while payments are on, then turns payments off.
Its locked galley links keep showing the price: "PDF (USD 5)" on each
article and "PDF (USD 20)" on the "Full Issue", on the issue's page and
on each article's page. Nothing can be bought. A signed-in reader who
presses the link lands on the journal's home page with no message. A
visitor who presses it is sent to the Login page, whose message asks for
a subscription and says nothing of a purchase. The manager can remove
the price by opening the "Payments" page by its address, which still
works with payments off, and emptying the fees. Basis: probe,
2026-10-01. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — A reader pressing a locked "Full Issue" is asked to pay an issue fee of no amount when only a membership fee is set** · 🐞 · low.
On a subscription journal with an "Association Membership" fee and no
"Purchase Issue" fee, a signed-in reader without a subscription or
membership who presses a locked "Full Issue" galley gets the payment
method's page for a "Purchase Issue Fee" with no amount (with the manual
method: its payment instructions and "Send notification of payment"). An
article galley in the same case leads to the "Subscriptions" page. The
reader is invited to pay for something the journal does not sell, and
"Send notification of payment" tells the journal's contact that a
"Purchase Issue Fee" costing 0 is to be processed. Basis: probe,
2026-10-01. <sup>f-a20</sup>

<a id="a21"></a>
**A21 — A subscription can end before it starts** · 🐞 · minor.
The subscription window saves a subscription whose "Start date" is
after its "End date" with "Your changes have been saved.", and the list
shows it with those dates; the other date checks of Rule 19 let it
through. Basis: probe, 2026-09-25. <sup>f-a21</sup>

<a id="a22"></a>
**A22 — Searching the subscription lists by reference number, membership, notes or institution lists every subscription** · 🐞 · medium.
On the subscription lists under "Payments", a search by some fields
lists every subscription whatever is typed, even text no subscription
holds: - "Individual Subscriptions": 3 of its 7 fields ("Membership",
"Reference Number", "Notes"). - "Institutional Subscriptions": 6 of its
10 fields (the same three, plus "Institution name", "Domain" and "IP
ranges"). Only "Given Name", "Family Name", "Username" and "Email
address" narrow either list. A manager looking a subscriber up by
reference number, or an institution by name, domain or IP address, gets
the whole list back with no message. The open pkp issue covers one of
these symptoms, "Institution name" on 3.4. Basis: probe, 2026-10-01.
<sup>f-a22</sup>

<a id="a23"></a>
**A23 — "Subscriptions" offers "Purchase New Subscription" on an open-access journal, and it leads to the home page** · 🐞 · low.
On a journal that does not require subscriptions (open access, or not
published online) but has payments set up and subscription types, the
"Subscriptions" page lists the types and offers a signed-in reader
"Purchase New Subscription" under each list. Pressing it leads to the
journal's home page with no message. The purchase pages refuse every
journal that does not require subscriptions, so the page offers a
purchase that cannot happen. Readers reach "Subscriptions" there only
through a menu item the journal added itself, or by its address. Basis:
probe, 2026-10-01. <sup>f-a23</sup>

<a id="a24"></a>
**A24 — While payments are off, a reader's "Learn More" and "View Available Subscription Types" lead to the home page** · 🐞 · low.
On a journal that requires subscriptions and has not set up payments
(payments are off on a new journal), a signed-in reader with no
subscription is offered "Learn More" in the sidebar's "Subscription"
block, and "View Available Subscription Types" on "My Subscriptions".
Both lead to the journal's home page with no message. Both links point
to the "Subscriptions" page, which has been closed while payments are
off since 2018; until then they opened it. The proposed fix hides the
two links while the page is closed. Basis: probe, 2026-10-01.
<sup>f-a24</sup>

<a id="a25"></a>
**A25 — A reader reopening their institutional subscription's purchase page finds "IP ranges" reading "Array"** · 🐞 · low.
On "My Subscriptions", "Purchase" beside an active institutional
subscription opens "Purchase Institutional Subscription" with the
institution's name filled in, but with "IP ranges" reading "Array"
instead of the subscription's ranges. Pressing "Continue" without
editing anything is refused with "Please enter a valid IP range.". To
get past it the reader must type the ranges again, or clear the box if
the subscription has only a domain. The journal shows a reader their
ranges nowhere; the manager can read them on the Institutions page.
Basis: probe, 2026-10-01. <sup>f-a25</sup>

<a id="a26"></a>
**A26 — The block shows an inactive subscription as running** · 🐞 · low.
A subscription set to "Needs Approval", "Needs Information" or "Other,
See Notes" shows in the "Subscription" block as the type's name and
"Expires: {date}" on every page, "My Subscriptions" included, whose own
table reads "Inactive" for it; the reader's galleys are refused. Basis:
probe, 2026-10-01. <sup>f-a26</sup>

<a id="a27"></a>
**A27 — The expiry-reminder task fails and sends nothing** · 🐞 · user-visible · crash: server.
Run as the site's timer runs it, the scheduled task that sends the
"Subscription Expiry Reminders" stops with an error as soon as a
journal requiring subscriptions has a reminder list set on
"Subscription Policies", and no reminder goes out, on its day or any
other. Subscribers get no warning before their access ends, whatever
the tab promises. Basis: probe, 2026-09-25. <sup>f-a27</sup>

<a id="a28"></a>
**A28 — A date box shows a date the window does not send** · 🐞 · user-visible.
On "Individual Subscriptions" › "Create New Subscription", once a "Save"
is refused while "Start date" and "End date" are empty, the window shows
today's date in both boxes, but nothing is behind it: the next "Save" is
refused with "A subscription start date is required." (and the end
date's message for an untouched "End date"), beside any other refusal.
Typing today's date into "Start date" changes nothing; only a different
date is taken. A Journal Manager or Subscription Manager sees a filled
box and a message saying it is empty, and cannot save a subscription starting today
without first typing another day. Basis: test run, 2026-09-25.
<sup>f-a28</sup>

<a id="a29"></a>
**A29 — Readers get the open-access email twice when an issue opens on the 1st of some months** · 🐞 · minor.
With "Registered readers will have the option of receiving the table of
contents by email when an issue becomes open access." ticked on
"Subscription Policies", every user of the journal who keeps "An issue
has been made open access." on should get one "Free to read: {issue
name} of {journal name} is now open access" email on the day an issue's
"Open access date" comes. When that day is 1 May, 1 July, 1 October or
1 December, each of them gets the same email twice; on 1 March this
happens in every year but the one after a leap year.
Since: 2006-04-18 · Basis: test run, 2026-10-01. <sup>f-a29</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A preprint server's "Posting Mode" says "Saved" but keeps nothing, so the server goes on posting** · 🐞 · medium.
On a preprint server's Settings › Distribution › "Access", choosing
either "Posting Mode" choice and pressing "Save" shows "Saved". The next
load of the tab shows neither choice selected. When "OPS will not be
used to post the server's contents online." is chosen and "Save" shows
"Saved", the server goes on posting: "Archives" stays in the header, and
visitors and Readers still open the list of preprints, each preprint and
its PDF. Losing the other choice, "The server will provide open access
to its contents.", changes nothing, since the server posts openly by
default. If the choice were kept, the server's existing code would hide
"Archives" and refuse visitors and Readers the list, each preprint and
its PDF; the sentence a refused Reader should see exists in no language.
The same fault: [Navigation menus & site
chrome](U08-navigation-menus-and-site-chrome.md), its OPS2;
[Search](U15-search.md), its OPS2. Basis: probe, 2026-10-01. <sup>f-ops1</sup>

### Retired

<a id="a2"></a>
**A2 — A non-numeric cost or duration fails silently** · ✅ · retired. Overturned on screen 2026-09-25: a "Cost" of "forty" or "-5", or a "Duration" of "a" or "-1", keeps the subscription type window open with a notice reading "The cost must be a positive, numeric value." or "The duration must be a positive, numeric value." (Rule 15); the code reading behind the entry did not hold. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Required-marked policy fields save empty** · ✅ · retired. Overturned on screen 2026-09-25: "Save" on "Subscription Policies" with the contact's "Name", "Email" or "Mailing Address" empty shows "This field is required." under it and saves nothing (Rule 24); the code reading behind the entry did not hold. <sup>f-a3</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-25 at the checkouts' tips (ojs `71bb244152`, lib/pkp
`76a315591`, omp `187f0f40d`, ops `61cd158ce3`). The body was
live-probed on 2026-09-25 on OJS, with OMP and OPS read for the absence
and the exclusivity controls (notes td1–td29, each naming the rules it
settled, and the f-a notes); a claim still read only in the code says so
in its note (p, q, r, s, t, u).

<a id="fn-a"></a>
**a** — The "Payments" page: OJS `pages/payments/PaymentsHandler.php` (`index` renders `templates/payments/index.tpl`, heading `manager.subscriptions` "Subscriptions", `#subscriptionsTabs` with `subscriptionManager.individualSubscriptions`, `subscriptionManager.institutionalSubscriptions`, `subscriptionManager.subscriptionTypes`, `manager.subscriptionPolicies`, `manager.paymentTypes`, lib/pkp `manager.paymentMethod` "Payments"); the tab bodies are `subscriptions/individual|institutional` (grids), `subscriptionTypes` (grid), `subscriptionPolicies`/`saveSubscriptionPolicies` (form), `paymentTypes`/`savePaymentTypes` and `payments` (*Payments & APCs*). Side menu: OJS `TemplateManager` adds `common.payments` "Payments" when `paymentsEnabled` and the user holds `ROLE_ID_SITE_ADMIN`, `ROLE_ID_MANAGER` or `ROLE_ID_SUBSCRIPTION_MANAGER`. The issue side: `IssueAction::subscriptionRequired()`; the issue screens are U50's (`issue.tpl` "Access" tab, `TocGridHandler::setAccessStatus()`).

<a id="fn-b"></a>
**b** — OMP and OPS have no `pages/payments`, no `pages/about/AboutHandler.php` subscriptions op, no `classes/subscription`, no subscription grids and no subscription-manager user group (`registry/userGroups.xml`). OPS `classes/components/forms/context/AccessForm.php` offers `publishingMode` with `Server::PUBLISHING_MODE_OPEN` and `PUBLISHING_MODE_NONE` (OPS `locale/en/manager.po`: `manager.distribution.publishingMode` "Posting Mode", `.openAccess` "The server will provide open access to its contents.", `.none` "OPS will not be used to post the server's contents online.") and `enableOai`; OPS `schemas/context.json` has no `publishingMode` property, so the save drops it (note f-ops1). OMP's Distribution tabs carry no `access` tab (U07 Rule, its Settings tab table: "Access" {OJS OPS}).

<a id="fn-c"></a>
**c** — Role gates: `PaymentsHandler` assigns all its ops to `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN`, `ROLE_ID_SUBSCRIPTION_MANAGER` behind `PKPSiteAccessPolicy`; the grids `SubscriptionsGridHandler` (and its `Individual`/`Institutional` subclasses), `SubscriptionTypesGridHandler` and `grid.users.subscriberSelect.SubscriberSelectGridHandler` use the same three roles behind `ContextAccessPolicy`. OJS `registry/userGroups.xml`: "Journal manager", "Journal editor", "Production editor" carry `0x10`; Section and Guest editor `0x11`; assistant groups `0x1001`; Subscription Manager `0x200000` (`default.groups.name.subscriptionManager` "Subscription Manager"). The scenario role key `subscriptionManager` exists (`docs/process/users.md`); no roster account holds it.

<a id="fn-d"></a>
**d** — OJS `classes/components/forms/context/AccessForm.php` (`FORM_ACCESS`, PUT to the context API), mounted by `templates/management/additionalDistributionTabs.tpl` as tab `access` (`manager.distribution.access` "Access"): `publishingMode` `FieldOptions` radio (`Journal::PUBLISHING_MODE_OPEN` 0, `_SUBSCRIPTION` 1, `_NONE` 2; labels `manager.distribution.publishingMode.*`), `delayedOpenAccessDuration` `FieldSelect` (`about.delayedOpenAccess`, options `common.disabled` then `manager.subscriptionPolicies.xMonths` "{$x} Months" for 1..60, `showWhen` the subscription mode), `enableOai`. OJS `schemas/context.json` `publishingMode` nullable `in:0,1,2`, no default; a fresh journal has no row (seed-facts, U08 claim check 2026-09-23), and every reader of the mode compares with `PUBLISHING_MODE_SUBSCRIPTION` or `_NONE`, so no row behaves as open.

<a id="fn-e"></a>
**e** — Reader access, OJS. `IssueAction::subscriptionRequired()`: `publishingMode == PUBLISHING_MODE_SUBSCRIPTION` and `accessStatus != ISSUE_ACCESS_OPEN` and (`openAccessDate` null or `strtotime(openAccessDate) > time()`). `ArticleHandler::userCanViewGalley()`: `Repo::submission()->canPreview()` first (its `_roleCanPreview()` admits `ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR`, `ROLE_ID_ASSISTANT`, `ROLE_ID_SUBSCRIPTION_MANAGER` held in the context, then any user with an Author stage assignment on the submission); then, for a published publication in an issue: `restrictArticleAccess` redirect to Login unless `subscribedDomain()`; when a subscription is required and no domain match, `subscribedUser()`, a paid issue (`hasPaidPurchaseIssue`, only while `purchaseIssueEnabled()`), the publication's `accessStatus == ARTICLE_ACCESS_OPEN`; failing those, with `purchaseArticleEnabled() || membershipEnabled()`: `onlyPdfEnabled()` lets a non-PDF galley through, a signed-out visitor goes to Login (`payment.loginRequired.forArticle`), a paid article or `dateEndMembership > time()` passes, else with `purchaseArticleEnabled()` a `PAYMENT_TYPE_PURCHASE_ARTICLE` queued payment and the method's form; otherwise signed out → Login (`reader.subscriptionRequiredLoginText`), signed in → `about/subscriptions`. `ArticleHandler::view()` (no galley) renders the landing page for everyone; its `hasAccess` only styles the links. `IssueHandler::userCanViewGalley()`: `IssueAction::allowedIssuePrePublicationAccess()` (manager, sub-editor, assistant, subscription manager roles) first, then the same chain with `purchaseIssueEnabled()`, `PAYMENT_TYPE_PURCHASE_ISSUE` and `payment.loginRequired.forIssue`. `IssueAction::subscribedUser()` / `subscribedDomain()` and the partial-expiry branches: note td21. Not-online mode: `OjsJournalMustPublishPolicy` (permits `ROLE_ID_MANAGER`, `_SITE_ADMIN`, `_ASSISTANT`, `_SUB_EDITOR`, `_SUBSCRIPTION_MANAGER`; denies everyone else under `PUBLISHING_MODE_NONE` with `user.authorization.journalDoesNotPublish` "This journal does not publish its content online."), added by `ArticleHandler`, `IssueHandler`, `SearchHandler` and the issues API. Additional files: `article_details.tpl` lists supplementary galleys through the same `galley_link.tpl` and `ArticleHandler::download()` runs `userCanViewGalley()` for every galley.

<a id="fn-f"></a>
**f** — Reader pages, OJS. `pages/about/AboutHandler.php::subscriptions()` redirects to the journal index unless `paymentsEnabled && PaymentManager::isConfigured()` (the method plugin configured: for the manual method, non-empty `manualInstructions`); it lists `SubscriptionTypeDAO::getByInstitutional($journalId, false|true, false)` (public types only) into `templates/frontend/pages/subscriptions.tpl` (`about.subscriptions`, `about.subscriptions.individual`, `subscriptions.individualDescription`, `about.subscriptionTypes.name|format|duration|cost`, `user.subscriptions.purchaseNewSubscription` under `{if $isUserLoggedIn}`) and `templates/frontend/components/subscriptionContact.tpl` (`about.subscriptionsContact` "Subscriptions Contact", `about.contact.phone`). `pages/user/UserHandler.php`: `subscriptions()` redirects to the index without a user, outside `PUBLISHING_MODE_SUBSCRIPTION`, or with no type of either kind; `templates/frontend/pages/userSubscriptions.tpl` (status strings `subscriptions.status.*`, `subscriptions.inactive` "Inactive", `user.subscriptions.expires` "Expires: {$date}", `user.subscriptions.expired` "Expired: {$date}", buttons `user.subscriptions.purchase` "Purchase" → `completePurchaseSubscription` for `AWAITING_ONLINE_PAYMENT`, `user.subscriptions.renew` "Renew" → `payRenewSubscription` and "Purchase" → `purchaseSubscription/{kind}/{id}` for `ACTIVE`). `purchaseSubscription()` / `payPurchaseSubscription()` check the mode and `isConfigured()` and redirect to the index otherwise, refuse an existing individual subscription by redirect, and accept an existing subscription only in `ACTIVE`, `AWAITING_ONLINE_PAYMENT` or `AWAITING_MANUAL_PAYMENT`. Forms: `classes/subscription/form/UserIndividualSubscriptionForm.php` (types `getByInstitutional(…, false, false)`, labels "{name} ({cost} {currency})"; `execute()` sets `AWAITING_MANUAL_PAYMENT` when the method plugin's name is `ManualPayment`, else `AWAITING_ONLINE_PAYMENT`, and `dateStart`/`dateEnd` to today unless non-expiring, then queues `PAYMENT_TYPE_PURCHASE_SUBSCRIPTION` and displays the method's form) with `templates/frontend/pages/purchaseIndividualSubscription.tpl` (no `formErrors.tpl` include); `UserInstitutionalSubscriptionForm.php` (required `institutionName`; domain regexp; domain or `ipRanges`; IP pattern `manager.subscriptions.form.ipRangeValid`; `execute()` adds a new `Institution` every time) with `purchaseInstitutionalSubscription.tpl` (`common/formErrors.tpl`, `common.continue`, `common.cancel` → `user/subscriptions`).

<a id="fn-g"></a>
**g** — Emails, OJS `classes/mail/mailables/`: `SubscriptionNotify` (`SUBSCRIPTION_NOTIFY`, `emails.subscriptionNotify.subject` "Subscription Notification"; built in `SubscriptionForm::_prepareNotificationEmail()`, from `subscriptionEmail`/`subscriptionName`, to the subscriber; sent from `IndividualSubscriptionForm::execute()` / `InstitutionalSubscriptionForm::execute()` when `notifyEmail`; on failure `email.compose.error`). `SubscriptionExpiresSoon` (`SUBSCRIPTION_BEFORE_EXPIRY`, "Notice of Subscription Expiry"), `SubscriptionExpired` (`SUBSCRIPTION_AFTER_EXPIRY`, "Subscription Expired"), `SubscriptionExpiredLast` (`SUBSCRIPTION_AFTER_EXPIRY_LAST`, "Subscription Expired - Final Reminder"); `SubscriptionPurchaseIndividual|Institutional`, `SubscriptionRenewIndividual|Institutional` (`SUBSCRIPTION_PURCHASE_INDL|INSTL`, `SUBSCRIPTION_RENEW_INDL|INSTL`), sent by `SubscriptionAction::sendOnlinePaymentNotificationEmail()` to `subscriptionEmail`, else `contactEmail`; `OpenAccessNotify` (`OPEN_ACCESS_NOTIFY`, "Free to read: {$issueIdentification} of {$contextName} is now open access"). The grids' create, edit, renew and delete, `SubscriptionTypeForm`, `SubscriptionPolicyForm` and `AccessForm` send nothing.

<a id="fn-h"></a>
**h** — Subscription grids and window, OJS `controllers/grid/subscriptions/`: `SubscriptionsGridHandler` (`addSubscription` "Create New Subscription", `PagingFeature`, filter template `subscriptionsGridFilter.tpl`, `renewSubscription()` → `SubscriptionDAO::_renewSubscription()`: non-expiring skipped, end = max(old end, now) + the type's `duration` months, at 23:59:59, status untouched), `IndividualSubscriptionsGridHandler` / `InstitutionalSubscriptionsGridHandler` (columns `common.name`, `user.email` individual only, `manager.subscriptions.subscriptionType`, `manager.subscriptions.form.status`, `manager.subscriptions.dateStart` "Start", `manager.subscriptions.dateEnd` "End", `manager.subscriptions.referenceNumber`; filter field options as Fields lists; `deleteSubscription()` scoped to the journal), `SubscriptionsGridRow` (`common.edit`; `manager.subscriptions.renew` "Renew" with `manager.subscriptions.confirmRenew` unless `isNonExpiring()`; `grid.action.delete` with `subscriptionManager.subscription.confirmRemove`), `SubscriptionsGridCellProvider`. Forms: `classes/subscription/form/SubscriptionForm.php` (checks and messages as Rule 19 quotes: `manager.subscriptions.form.userIdRequired`, `.statusRequired`, `.typeIdRequired`, `.membershipRequired`, `.dateStartRequired|Valid`, `.dateEndRequired|Valid` with `Subscription::SUBSCRIPTION_YEAR_OFFSET_PAST|FUTURE` ±10 years, `.dateStartEmpty|dateEndEmpty` for a non-expiring type, `.subscriptionContactRequired`; `execute()` stores the end date at 23:59:59), `controllers/grid/subscriptions/IndividualSubscriptionForm.php` (`.typeRequired` added at construction when the journal has no individual type; `.subscriptionExists`), `InstitutionalSubscriptionForm.php` (`.institutionRequired` at construction; `.institutionIdValid`; `.domainValid`; `validate()` adds `.domainIPRangeRequired` for a non-`FORMAT_PRINT` type with no domain and no IP range on the institution). Templates `templates/payments/individualSubscriptionForm.tpl`, `institutionalSubscriptionForm.tpl` (`editor.submission.findAndSelectUser` "Locate a User" grid, `grid.user.allRoles`; `manager.subscriptions.form.notifyEmail`). Status options: `SubscriptionDAO::getStatusOptions()` (`subscriptions.status.active` "Active", `.needsInformation`, `.needsApproval`, `.awaitingManualPayment`, `.awaitingOnlinePayment`, `.other` "Other, See Notes"). Validity: `IndividualSubscriptionDAO::isValidIndividualSubscription()` (status `ACTIVE`, `institutional = 0`, `duration IS NULL` or today within `date_start`..`date_end`, format `FORMAT_ONLINE` or `FORMAT_PRINT_ONLINE`). Search: `SubscriptionDAO::applySearchFilters()`.

<a id="fn-i"></a>
**i** — Types, OJS `controllers/grid/subscriptions/SubscriptionTypesGridHandler.php` (`manager.subscriptionTypes.create`; columns `common.name`, `manager.subscriptionTypes.subscriptions`, `.duration`, `.cost`; `SubscriptionTypeDAO::getByJournalId()` ordered by `seq`, new types appended by `resequenceSubscriptionTypes()`; `updateSubscriptionType()` answers `new JSONMessage(false)` on a failed validation, and the validator's message shows as a notice (note f-a2); `deleteSubscriptionType()` → `SubscriptionTypeDAO::deleteById()`, cascading to `subscriptions` and `institutional_subscriptions`), `SubscriptionTypesGridRow` (`manager.subscriptionTypes.confirmDelete`), `SubscriptionTypesGridCellProvider` (duration `getDurationYearsMonths()`, cost `%.2f (CODE)`), `SubscriptionTypeForm.php` (`manager.subscriptionTypes.form.typeNameRequired` for the primary locale, `.costRequired`, `.costNumeric`, `.currencyRequired|Valid`, `.formatRequired|Valid`, `.durationNumeric`; `duration` empty → null → `getNonExpiring()`), `templates/payments/subscriptionTypeForm.tpl` (radios `institutional` `disabled=$typeId`; script disabling `#membership` on change to institutional; `manager.subscriptionTypes.form.public`). Hidden types: `disable_public_display` filtered by `getByInstitutional(…, false)` on the public and purchase pages, not by the manager forms.

<a id="fn-j"></a>
**j** — Policies, OJS `classes/subscription/form/SubscriptionPolicyForm.php` (one check besides CSRF: `FormValidatorEmail` on `subscriptionEmail`, optional; the select values in their ranges) and `templates/payments/subscriptionPolicyForm.tpl` (`required=true` on `subscriptionName`, `subscriptionEmail`, `subscriptionMailingAddress`, which the browser enforces before sending, note f-a3; `subscriptionExpiryPartial` radios with `|compare:0` / `|compare:1`; the four `enableSubscriptionOnlinePaymentNotification*` boxes `disabled=$paymentsEnabled|compare:0` with `manager.subscriptionPolicies.onlinePaymentDisabled`; `enableOpenAccessNotification`). `PaymentsHandler::saveSubscriptionPolicies()` answers a trivial success notification (`common.changesSaved` "Your changes have been saved.").

<a id="fn-k"></a>
**k** — `plugins/blocks/subscription/SubscriptionBlockPlugin.php::getContents()` returns nothing outside `PUBLISHING_MODE_SUBSCRIPTION`; it assigns `individualSubscription`, and when that is missing or not `isValid()`, `InstitutionalSubscriptionDAO::isValidInstitutionalSubscription()` for the request's address and host, with `acceptSubscriptionPayments`; `templates/block.tpl` (`plugins.block.subscription.blockTitle` "Subscription", `.providedBy`, `.comingFromIP`, `.loginToVerifySubscription`, `.subscriptionRequired`, `.subscriptionRequired.learnMore`) tests `$paymentsEnabled`, which the block does not assign itself (note f-a13). Placement: U10's "Sidebar" (`sidebar` scenario key, `subscriptionblockplugin`).

<a id="fn-l"></a>
**l** — `templates/frontend/objects/galley_link.tpl`: `restricted` when `!$hasAccess` (all galleys, or only `type == pdf` with `$restrictOnlyPdf`); the link gets the class `restricted` (default theme `styles/objects/galley_link.less`: `@fa-var-lock` in place of the file icon), a screen-reader span `reader.subscriptionOrFeeAccess` "Requires Subscription or Fee" when `$purchaseArticleEnabled`, else `reader.subscriptionAccess` "Requires Subscription", and `reader.purchasePrice` "({$currency} {$price})" when `$purchaseFee && $purchaseCurrency`. The article page passes `purchaseArticleFee`, `issue_toc.tpl` the `purchaseIssueFee` for "Full Issue" galleys, `article_summary.tpl` `purchaseArticleFee` and forces access for an open journal or an `ARTICLE_ACCESS_OPEN` publication. `hasAccess`: `ArticleHandler::view()` and `IssueHandler::setupIssueTemplate()`.

<a id="fn-m"></a>
**m** — Delayed open access: `IssueGridHandler::publishIssue()` (OJS `classes/controllers/grid/issues/`), under `PUBLISHING_MODE_SUBSCRIPTION` with a non-empty `delayedOpenAccessDuration`, sets `accessStatus = ISSUE_ACCESS_SUBSCRIPTION` and `openAccessDate` = today + the months at 00:00, after the issue's own values. The issue's "Access" tab: `controllers/grid/issues/form/IssueAccessForm.php` (`editor.issues.accessStatus` "Access status", options `editor.issues.openAccess` "Open access" / `editor.issues.subscription` "Subscription"; `editor.issues.accessDate` "Open access date"). A new issue's status: `IssueForm::execute()` by the mode (U50 Rule 3). The per-article box: `TocGridHandler::setAccessStatus()` edits the current publication's `accessStatus`.

<a id="fn-n"></a>
**n** — Scheduled tasks, OJS `classes/scheduler/Scheduler.php`: `SubscriptionExpiryReminder` `monthlyOn(1)`, `OpenAccessNotification` `daily()`. `classes/tasks/SubscriptionExpiryReminder.php::sendJournalReminders()` (only `PUBLISHING_MODE_SUBSCRIPTION`): before-months and before-weeks → `SubscriptionExpiresSoon`, after-weeks → `SubscriptionExpired`, after-months → `SubscriptionExpiredLast`, each for `getByDateEnd()` matches of one computed day (active subscriptions, `EXTRACT(YEAR|MONTH|DAY FROM date_end)`), from `subscriptionEmail`/`subscriptionName`; `executeActions()` also simulates the 31st and late-February days on a month's first day. `classes/tasks/OpenAccessNotification.php` (`PUBLISHING_MODE_SUBSCRIPTION` and `enableOpenAccessNotification`): for each published issue with `accessStatus == ISSUE_ACCESS_SUBSCRIPTION` and `openAccessDate` equal to the day, `jobs/notifications/OpenAccessMailUsers.php` per chunk of `NotificationSubscriptionSettingsDAO::getSubscribedUserIds()` for `NOTIFICATION_TYPE_OPEN_ACCESS` (the journal's users minus those who blocked the notification or its email): a notification, and `OpenAccessNotify` from `contactEmail`/`contactName` with `allowUnsubscribe()`. U05 notes the test installs do not run the scheduler.

<a id="fn-o"></a>
**o** — Payments, OJS `classes/payment/ojs/OJSPaymentManager.php`: `isConfigured()` = `paymentsEnabled` and the method plugin's `isConfigured()`; `purchaseArticleEnabled()`, `purchaseIssueEnabled()`, `membershipEnabled()` = configured and the fee > 0; `onlyPdfEnabled()` = configured and `restrictOnlyPdf`; `getPaymentName()` (`payment.type.subscription` "Subscription Fee" + " ({type})", `payment.type.purchaseArticle` "Purchase Article Fee", `payment.type.purchaseIssue` "Purchase Issue Fee"); `fulfillQueuedPayment()` activates an individual subscription, sets an institutional one to `NEEDS_APPROVAL`, renews, and sends the online payment notifications. Its callers: `plugins/paymethod/paypal/PaypalPaymentPlugin.php` and, for submission (publication) fees only, `api/v1/_submissions/BackendSubmissionsController.php`. `plugins/paymethod/manual/ManualPaymentPlugin.php`: `isConfigured()` = non-empty `manualInstructions`; `getPaymentForm()` renders `templates/paymentForm.tpl` (`plugins.paymethod.manual` "Manual Fee Payment", `.purchase.title` "Title", `.purchase.fee` "Fee", `.sendNotificationOfPayment` "Send notification of payment"); `handle('notify')` emails `ManualPaymentNotify` to the journal's contact and fulfils nothing. Payment Types: `classes/subscription/form/PaymentTypesForm.php` (`purchaseArticleFee`, `purchaseIssueFee`, `membershipFee`, `restrictOnlyPdf`; labels `manager.payment.options.purchaseArticleFee` "Purchase Article", `.purchaseIssueFee` "Purchase Issue", `.onlypdf`, `.membershipFee` "Association Membership").

<a id="fn-p"></a>
**p** — Read from the code (note e: `hasPaidPurchaseArticle()`, `hasPaidPurchaseIssue()`, `dateEndMembership`); it cannot be seen on the test installs. Only a completed payment opens these paths, and the one method that works there without an outside service, "Manual Fee Payment", completes none (Rule 30; note o); PayPal needs the outside service. Live-probed 2026-09-25: a signed-in reader pressing a locked galley with a "Purchase Article" fee of 5 got the "Manual Fee Payment" page, and nothing on any screen marked the purchase or a membership paid. Settled by a completed purchase-article (or membership) payment for a reader, then the galley pressed.

<a id="fn-q"></a>
**q** — Read from the code (`InstitutionalSubscriptionDAO::isValidInstitutionalSubscription()` with the request's host name, note k). It cannot be seen on the test installs: they are reached as "localhost", and the subscription window and the test tooling both refuse a "Domain" without a dot ("Please enter a valid domain.", live-probed 2026-09-25). Settled by a visitor whose host name ends in a dotted domain saved on the subscription.

<a id="fn-r"></a>
**r** — Read from the code (`UserInstitutionalSubscriptionForm`, `user.subscriptions.form.membershipRequired`). A "Create New Subscription Type" window greys and unticks "Subscriptions require membership information…" when "Institutional" is chosen; an institutional type can ask for membership only through "Edit" (Fields), and none such was saved or bought in the probes of 2026-09-25. Settled by buying an institutional type edited to ask for membership, "Membership" left empty.

<a id="fn-s"></a>
**s** — `email.compose.error` after a failed send in `IndividualSubscriptionForm::execute()` / `InstitutionalSubscriptionForm::execute()` (note g); read from the code, since no screen makes the mailer fail. Settled by a save with the box ticked while the mailer refuses.

<a id="fn-t"></a>
**t** — Read from the code (note n): the mailables, their recipients and the subscription contact as sender. Nothing is sent to see ([A27](#a27), note td29).

<a id="fn-u"></a>
**u** — No online payment completes on the test installs (Rule 30), so the four emails, the status change and the renewal here cannot be seen there; read from the code (note o: `fulfillQueuedPayment()`, `SubscriptionAction::sendOnlinePaymentNotificationEmail()`). Live-probed 2026-09-25: after a manual purchase and "Send notification of payment", the subscription contact received no "Subscription Purchase" or "Subscription Renewal" email and the subscription stayed "Awaiting Manual Payment".

<a id="fn-s0"></a>
**s0** — Scenario seeding. Scenario 16 runs on OMP and OPS `publicknowledge` as `manager.maya` (the Press Manager, the Preprint Server Manager) with a browser with no session as the visitor, its control on OJS `publicknowledge` as `manager.maya`, passwords as `docs/process/users.md` gives them; its positive controls for the two addresses are scenarios 8 and 9. Every other scenario runs on its own scratch journal from `POST scenarios/context` with `publishingMode: 'subscription'` and throwaway `users[]` (password: the username twice): `manager` (the Journal Manager) in scenarios 1 and 4 to 14; `reader` accounts named as the scenario names them (Sam, Lena, Eve, Nova, Tess), or one plain `reader`; `subscriptionManager` and `sectionEditor` in scenarios 3 and 4; `copyeditor` and `author` (the submitter of "Tidal Patterns") in scenario 3. "Payments set up" is `payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay by bank transfer.'}` (scenarios 2, 4, 8, 9, 10, 14); scenario 14 adds `purchaseArticleFee: 5`. The subscription contact is `subscriptionName: 'Subscriptions Desk'`, `subscriptionEmail: 'desk@mail.test'`, `subscriptionMailingAddress: '1 Harbour Road'` (scenarios 6, 11, 12); scenario 11 adds `subscriptionExpiryPartial: true`. Types are `subscriptionTypes[]` `{name, cost, currency: 'USD', duration: 12}` ("Lifetime" without `duration`, "Campus Year" with `institutional: true` and cost 400, "Staff Rate" with `hidden: true`, scenario 8's "Online Year" with `description: '<p>A year of online reading.</p>'`, "Online Year" cost 40 where named). Subscriptions are `subscriptions[]` `{user, type}`, `status` left at `active` unless named: Sam in scenario 2 from 30 days before today to eleven months after; Eve `dateStart: '2025-01-01'`, `dateEnd` 30 days before today; the others at the default dates (today to today plus the type's duration). Institutions are `institutions: [{name: 'Harbour Library', ipRanges: ['127.0.0.1']}, {name: 'Dock Library'}]` in scenario 7, 127.0.0.1 being the address the test browser reaches the install from (note td22). The block is `sidebar: ['subscriptionblockplugin']` (scenarios 2, 7, 9). Issues come from `issues[]` (`{volume, number, year}`, `published: true` for a published one; the last published entry is the current issue); under the mode each is born "Subscription"; scenario 3's and 11's carry `galleys: [{label: 'PDF', file: 'article.pdf'}]`, scenario 11's `datePublished: '2025-03-01'`, scenario 12's "Vol. 1 No. 1 (2026)" `openAccessDate` today, "Vol. 1 No. 2 (2026)" `accessStatus: 'open'` and "Vol. 1 No. 3 (2026)" neither; scenario 13's first issue `accessStatus: 'open'`. Articles are scratch submissions from `POST scenarios/submission` with `title`, `published: true`, `issue` and `galleys: [{label: 'PDF', file: 'article.pdf'}]` (plus `{label: 'HTML', file: 'article.html'}` in scenario 14); into an unpublished issue that gives a scheduled article (scenario 13); `accessStatus: 'open'` is the ticked "Open Access" box ("Storm Surges", "Open Waters"). Scenario 15: `restrictArticleAccess: true`. "Run the site's scheduled tasks, then its background jobs" is `php lib/pkp/tools/scheduler.php test --name=APP\tasks\OpenAccessNotification` in the app's root, then `runJobs()` (`shared/playwright/support/jobs.js`), so scenario 12 belongs in the serial project; the mail catcher is Mailpit at `MAILPIT_URL` (default `http://127.0.0.1:8025`), scoped by recipient address. The visitor is a browser with no session. Choosing "the US dollar" in "Currency" (scenario 5) is the list's USD entry.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-25 (the absence paragraph), OMP and OPS on the seeded press and server and on scratch ones. As Press Manager, Settings › Distribution reads "License, DOIs, Search Indexing, Payments, Statistics", with no "Access"; its "Payments" tab holds only "Enable", and with "Enable" saved ("Saved") the side menu gains no "Payments". As Preprint Server Manager the tabs read "License, DOIs, Search Indexing, Access, Statistics"; "Access" holds "Posting Mode" with its two choices, then "Enable OAI"; either choice saved showed "Saved" and the next load neither. Signed out, as Reader and as manager, `{context}/about/subscriptions`, `/user/subscriptions`, `/payments` and `/user/purchaseSubscription/individual` answer the "404 Not Found" page on both apps; their Roles tabs list no Subscription Manager (OPS: "Preprint Server manager, Moderator, Author, Reader, Editorial Board Member"), where the OJS tab lists "Subscription Manager". OMP and OPS offer no "Subscription Block" in the Appearance "Sidebar" list.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-25 (Actors row 1; Purpose; Fields, the "Payments" page), OJS, one scratch account per role. With payments off the side menu has no "Payments", yet the address opens the page headed "Subscriptions" with its six tabs for the Journal Manager, Editor, Production Editor, Site Administrator and Subscription Manager; with payments enabled (set up or not) the managers' side menu offers "Institutions" and "Payments". The Section Editor (not assigned), Copyeditor, Author and Reader get the access-denied page, a signed-out visitor the Login page. A subscription window closed after changing "Reference Number" asked "The data on this form has changed. Do you wish to continue without saving?", and after "OK" the list still showed the old value; leaving "Subscription Policies" for another tab with a change asked the same; leaving the page raised the browser's "Leave site?".

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-25 (Actors row 9; A16), a throwaway Subscription Manager on three scratch journals (payments off, enabled but not set up, set up): each sign-in landed on the access-denied page "The current role does not have access to this operation." with no side menu. Test run 2026-09-25 (Actors row 9; scenario 4): the user menu's "Dashboard" on that page led to `{journal}/user/profile`, and `{journal}/dashboard/editorial` gave the access-denied page; the public menu's `NMI_TYPE_USER_DASHBOARD` item (lib/pkp `PKPNavigationMenuService`) points at the `user` page's profile op for a user holding no `ROLE_ID_MANAGER`, `ROLE_ID_ASSISTANT`, `ROLE_ID_REVIEWER` or `ROLE_ID_AUTHOR` in the journal. `{journal}/payments` opened the six tabs on all three; its side menu read "Start A New Submission", "Institutions", "Payments" while payments were enabled, "Start A New Submission" alone with them off.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-25 (Rules 1, 5; Fields, the "Access" tab; A1, A15, A17): a fresh journal showed no "Publishing Mode" choice selected and no "Delayed Open Access"; the list appeared only with the second choice, as 61 entries "Disabled", "1 Months" … "60 Months", arriving as an empty box. "Save" showed "Saved", the next load kept the choice, and the box stayed empty; after "Disabled" itself was saved it read "Disabled". The third choice picked and left through the side menu's "Journal" raised no question, and "Distribution" › "Access" showed the saved second choice again; switching to another Distribution tab and back kept the unsaved pick.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-25 (Rule 6): with "3 Months" saved, an unpublished issue set to "Open access" and then published read "Subscription" and "2026-12-25" on its "Access" tab; an issue published earlier as "Open access" still read "Open access". The Reader was refused the new issue's article PDF and "Full Issue" (home page) and opened the earlier issue's PDF. With "Disabled" saved, an issue set to "Open access" and published stayed "Open access" and its PDF opened for the Reader.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-25 (Rules 8, 10; A18, A19): on the article's page, the issue's table of contents and the "Full Issue" list a restricted link shows the padlock in place of the file icon, with the accessible name "Requires Subscription PDF". With payments set up and fees of 5 and 20 USD: "Requires Subscription or Fee PDF (USD 5)" on the article page and the table of contents, "(USD 20)" on "Full Issue"; with only a membership fee, "Requires Subscription" and no price. The same fees saved with payments not enabled: "(USD 5)" and "(USD 20)" beside "Requires Subscription", and pressing led to the home page. The article's "Data" file under "Additional Files" kept its file icon and was refused (the visitor to Login, the Reader to the home page).

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-25 (Rule 12, signed out): with payments off, the article PDF and the "Full Issue" led to the Login page with "Subscription required to access item. To verify subscription, log in to journal."; with a "Purchase Article" or a membership fee and payments set up, the article message read "Subscription or article purchase required to access item. To verify subscription, access previous purchase, or purchase article, log in to journal." and the "Full Issue" one "Subscription or issue purchase required to access item. To verify subscription, access previous purchase, or purchase issue, log in to journal.". Signed in there, a subscriber landed on the galley in the viewer (article and "Full Issue"), a Reader on the home page.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-25 (Rule 12, signed in; A5, A20): with payments off the Reader pressing the locked PDF landed on the home page with no message; with payments set up, on the "Subscriptions" page; with fees of 5 and 20 USD, on "Manual Fee Payment" with "Purchase Article Fee" and "5.00 (USD)", and for "Full Issue" "Purchase Issue Fee" and "20.00 (USD)". With only "Association Membership" set, the article PDF led to the "Subscriptions" page and the "Full Issue" to "Manual Fee Payment" for a "Purchase Issue Fee" with no fee line.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-25 (Actors rows 4–5; Rules 8, 11a; A7), one scratch account per role, a restricted article with PDF, HTML and a "Data" file, no subscription for anyone: every role and the signed-out visitor read the article's page with title, authors, abstract and references, the issue's page, "Current" and "Archives". The Journal Manager, Editor, Production Editor, Site Administrator, Section Editor (not assigned), Guest Editor, every assistant role, the Subscription Manager and the article's Author opened the galleys; the Author was refused the issue's "Full Issue" (home page); the Translator, Reviewer, a Reader and another article's Author were sent to the home page, the visitor to Login. On the issue's page every one of them but a subscriber saw the padlock.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-25 (Rules 17, 22; Fields, the subscription lists; A22): the "Start" and "End" columns print "2026-01-01" and "2026-12-31", empty for a non-expiring type; a list longer than a page shows "Items per page" and page links ("1 - 3 of 4 items"), and "Subscription Types" pages the same way. An "Active" subscription of an "Online" type opened the PDF, as did one ending today, a non-expiring one and a membership one; "Needs Information", "Needs Approval", "Awaiting Manual Payment", "Awaiting Online Payment", "Other, See Notes", a "Print" type, a start tomorrow and an end yesterday were refused. "Search" by "Given Name", "Family Name", "Username" and "Email" narrowed the list ("contains" and "is"); "Membership", "Reference Number", "Notes", "Institution name", "Domain" and "IP ranges" returned the whole list even for "nothing-like-this", on two journals.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-25 (Rule 19; A21): every refusal the rule quotes showed verbatim at the window's top under "Errors occurred processing this form" and beside its field, the window staying open (A4's among them). With no type, or no institution, the message stood in place of the list as soon as the window opened, and "Save" marked the empty list "This field is required."; start 2015 and end 2037 were refused, 2016 and 2036 accepted; a "Print" institutional type saved with neither domain nor IP range. A start of 2026-12-01 with an end of 2026-01-01 saved with "Your changes have been saved.". A saved subscription opened the subscriber's PDF at once.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-25 (Rule 15; Fields, the type window; A2): an empty window's "Save" marked "Name of Type", "Currency" and "Cost" with "This field is required."; "forty" or "-5" in "Cost" gave the notice "The cost must be a positive, numeric value.", "a" or "-1" in "Duration" "The duration must be a positive, numeric value.", the window open and nothing marked; a cost of 0 saved. The window offers 181 currencies, "Online" preselected, and no instruction under "Cost". A saved type showed "Your changes have been saved." and joined the list's end. Neither "Individual" nor "Institutional" arrives ticked, and a type saved so is individual; "Institutional" greys the membership box on "Create", but "Edit" of an institutional type leaves it live, on two journals.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-25 (Rule 16): the question read as quoted, with "OK" and "Cancel"; "OK" removed the type and its subscriber's row, and that subscriber's PDF, open before, was refused after.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-25 (Rules 24, 25; Fields, "Subscription Policies"; A3): a fresh journal's tab arrived with every box empty, "Full expiry" selected, the four reminder lists on "Disabled", every box unticked and the four payment boxes greyed under "Note: To enable these options, the Journal Manager must enable the online payments module, including online payments for subscriptions, under Reader Fees."; the payment boxes were live, and a ticked one kept, with payments set up. "Save" with the contact empty put "This field is required." under "Name", "Email" and "Mailing Address" and sent nothing; "sub@" showed "Please enter a valid email address." under the box; "sub@x" saved with "Your changes have been saved.".

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-25 (Rule 20): "Are you sure you want to renew this subscription?" with "OK" and "Cancel"; an end of 2026-10-25 became 2027-10-25; one that ended 2026-09-15, status "Needs Information", became 2027-09-25 with its status unchanged; "Cancel" changed nothing; no notice follows "OK", the row just updates.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-25 (Rule 28; Fields, the purchase pages; A9): the page's only name is the browser tab's title, with no heading and no breadcrumb; its list read "K3 Individual (10.00 USD)" with the hidden type absent. "Save" with a membership type and "Membership" empty brought the same page back with nothing said and nothing stored; with "ACME" it showed "Manual Fee Payment", "Subscription Fee (K3 Member)", "7.00 (USD)", and "My Subscriptions" and the managers' list read "Awaiting Manual Payment", 2026-09-25 to 2026-09-25; a non-expiring type was stored with "Start" and "End" empty. With an individual subscription, the address led home.

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-25 (Rule 29; Fields, the purchase pages; A11): the page is headed "Purchase Institutional Subscription"; only "Subscription Type" carries the required mark, and its list arrives with a type chosen, so the form's "Please select a valid subscription type." (`UserInstitutionalSubscriptionForm`) cannot be reached. "Continue" empty showed "An institution name is required." and "The selected subscription type requires a domain and/or an IP range for subscription authentication." at the top; "not a domain" gave "Please enter a valid domain.", "999.1.1.1" "Please enter a valid IP range.". Accepted with the four ranges of the help, it showed "Subscription Fee (K3 Institutional)", "100.00 (USD)"; a second purchase under the same name left two "Tide University" rows on the Institutions page. "Cancel" with a typed name returned to "My Subscriptions" with no question.

<a id="fn-td18"></a>
**td18** — Live-probed 2026-09-25 (Rule 31; A10, A25): "Awaiting Online Payment" offered "Purchase", showing the payment page for 10.00 with the status unchanged; "Active" offered "Renew" (payment page, dates unchanged) and "Purchase", a non-expiring one "Purchase" only; the other statuses no button, and with payments off no button column. "Purchase" › "Save" on an active subscription showed the payment page and left it "Awaiting Manual Payment" with today's dates, no "Renew", and its PDF led to the "Subscriptions" page. On an active institutional one, "IP ranges" arrived reading "Array", "Continue" was refused "Please enter a valid IP range.", and after retyping it added a second institution of the same name.

<a id="fn-td19"></a>
**td19** — Live-probed 2026-09-25 (Rule 32; A12): signed out, on a journal with payments set up, `{journal}/user/purchaseSubscription/individual` and `…/institutional` each answered HTTP 500 with an empty page. On an open-access journal and on journals whose payments were off, enabled without a method set up, or set up without "Manual Payment Instructions", both addresses led to the home page, signed in or out. With payments set up and no subscription type, both opened with an empty "Subscription Type" list, while the "Subscriptions" page listed nothing and "My Subscriptions" led home.

<a id="fn-td20"></a>
**td20** — Live-probed 2026-09-25 (Rule 33; A13, A24, A26): the block showed on journals requiring subscriptions, not on an open-access or a not-online one. Signed out: "Login to access subscriber-only resources."; a Reader with none: "A subscription is required to access some resources." and "Learn More", which opened the "Subscriptions" page with payments set up and led home with them off. Active: "K3 Individual", "Expires: 2027-09-25"; membership "(M-42)"; non-expiring "Non-expiring"; ended "Expired: 2026-06-01". A fresh manual purchase read "Expired: 2026-09-25" on the home page and "Awaiting Manual Payment" on "My Subscriptions"; "Needs Approval", "Needs Information" and "Other, See Notes" read "Expires: 2027-09-25" everywhere while the table read "Inactive". At 127.0.0.1 an active individual subscriber saw their own lines; an awaiting one saw the institution's.

<a id="fn-td21"></a>
**td21** — Live-probed 2026-09-25 (Rules 11, 23): under "Partial expiry", a reader whose subscription ended 2026-06-01 opened an article published into a later issue with its own date set to 2025-09-01, and was refused an article of the same issue dated today; another reader, subscribed 2025-01-01 to 2025-12-31, opened the "Full Issue" of an issue published 2025-06-01 but was refused its article, dated 2026-09-25 (an article published with a later "Publish Issue" keeps its own date). With "Full expiry" saved, both were refused. An institutional subscription ended 2025-12-31 was refused both of its journal's articles, dated today.

<a id="fn-td22"></a>
**td22** — Live-probed 2026-09-25 (Rules 11, 18; Rule 33): with an institution at 127.0.0.1 and an active "Online" institutional subscription, a signed-out visitor opened the PDF and "Full Issue", even with "Users must be registered…" ticked, and saw no padlock on the article or the issue; the block read "Access provided by: K1 Local Library" and "Accessed from: 127.0.0.1" (signed in, plus "My Subscriptions"). An institution at 10.0.0.0/8 gave the visitor nothing.

<a id="fn-td23"></a>
**td23** — Live-probed 2026-09-25 (Rule 10; Settings bullet 6; A14): with payments set up, the box ticked and no fee, PDF links were locked and HTML ones not, on the article page and "Full Issue"; HTML pressed led the visitor to Login and the Reader to the "Subscriptions" page. With fees of 5 and 20, or a membership fee of 7, the HTML article galley opened even for the visitor and the HTML "Full Issue" downloaded. With the box ticked and payments not enabled, every galley, HTML included, was locked and refused.

<a id="fn-td24"></a>
**td24** — Live-probed 2026-09-25 (Rule 13): with "Users must be registered…" ticked, the signed-out visitor pressing a restricted article's PDF, an open-access article's, an open issue's article's and both "Full Issue" galleys got the Login page with no message, while the pages stayed open; signed in as a Reader, the open ones opened and the restricted ones led home.

<a id="fn-td25"></a>
**td25** — Live-probed 2026-09-25 (Rule 27; Fields, "My Subscriptions"; A24): the page led a signed-in Reader home on an open-access journal, a not-online one and one with no type, and led a signed-out visitor home everywhere. With a type and payments off it opened with "Individual Subscription" (singular heading) and "View Available Subscription Types", which led home, and no "Subscription Status"; with payments set up, the table's four rows and "Purchase New Subscription". Statuses read "Awaiting Online Payment", "Awaiting Manual Payment", "Inactive" for "Needs Approval", "Needs Information" and "Other, See Notes", "Non-expiring", "Expires: 2027-09-25", "Expired: 2026-06-01", and "Needs Approval" for an institutional one; with payments off the awaiting and the institutional "Needs Approval" both read "Inactive".

<a id="fn-td26"></a>
**td26** — Live-probed 2026-09-25 (Rule 30; A6): the manual page showed the item, the fee, the instructions and "Send notification of payment"; pressed, "Payment Notification", "Payment notification sent" and "Continue". A bought subscription stayed "Awaiting Manual Payment" until the Subscription Manager edited it to "Active" with a year's dates, after which "My Subscriptions" read "Expires: 2027-09-25" and the PDF opened. An article bought for 5 USD and an issue for 20 USD, notified, left nothing on the "Payments" page's six tabs to record, and the galley showed the payment page again.

<a id="fn-td27"></a>
**td27** — Live-probed 2026-09-25 (Rule 26; Fields, the "Subscriptions" page; A23): with payments off, enabled without a method, or set up without instructions, the address led home for the visitor and the Reader. Set up: "Home / Subscriptions", "Subscriptions", the information text, the contact ("K3 Subscriptions Desk", the address, "Phone +1 555 0100", the email as a link), both tables with "Name / Format / Duration / Cost" and the description under the name, hidden types absent, and "Purchase New Subscription" under each table for the Reader only. An open-access and a not-online journal with payments set up showed their types the same way; there "Purchase New Subscription" led home.

<a id="fn-td28"></a>
**td28** — Live-probed 2026-09-25 (Side effects, "Subscription Notification"; Settings bullet 12; A4): with a contact saved, a new subscription with the box ticked sent the subscriber "Subscription Notification" from the contact's name and email, naming the journal, "K1 Six - 6 months - 6.00 USD" and the username; an "Edit" with the box ticked sent a second, one without none. Without a contact, "Save" was refused with A4's message. Nothing else sent mail: a plain "Edit", "Renew", "Delete", a new type, a policies "Save", the publishing mode switched and back, and the readers' purchases, "Renew", "Purchase" and "Cancel" left the mail catcher empty but for the manual method's "Manual Payment Notification" to the principal contact.

<a id="fn-td29"></a>
**td29** — Live-probed 2026-09-25 (Side effects, expiry reminders; A8, A27): the site's schedule list shows the task at `0 0 1 * *` (monthly, on the first). Run twice by hand as the scheduler runs it (`php lib/pkp/tools/scheduler.php test --name=…SubscriptionExpiryReminder`), on a journal with "1 Months" and "1 Weeks" before and subscriptions ending on the matching days, it stopped with a fatal error and sent nothing.

<a id="fn-f-a1"></a>
**f-a1** — Seen by the Navigation menus and Issues claim checks, 2026-09-23 and 2026-09-25 (seed-facts: "Settings › Distribution › "Access" shows no "Publishing Mode" choice ticked on `publicknowledge` or on a scratch journal, so both publish openly"), and live-probed 2026-09-25 (td4): no choice selected, the journal's galleys open to a visitor with no lock, the issue window without "Access", "Delayed Open Access" hidden. Mechanism: note d.

<a id="fn-f-a2"></a>
**f-a2** — Live-probed 2026-09-25 (td12). The entry stood on `SubscriptionTypesGridHandler::updateSubscriptionType()` answering `new JSONMessage(false)` on a failed `SubscriptionTypeForm::validate()`; the screen shows the validator's message (`manager.subscriptionTypes.form.costNumeric`, `.durationNumeric`) as a notice all the same.

<a id="fn-f-a3"></a>
**f-a3** — Live-probed 2026-09-25 (td14). `subscriptionPolicyForm.tpl`'s `required=true` puts the browser-side required check on the three fields, so the page sends nothing while one is empty; `SubscriptionPolicyForm` itself still validates only the email's format.

<a id="fn-f-a4"></a>
**f-a4** — `manager.subscriptions.form.subscriptionContactRequired` (OJS `locale/en/manager.po`); the fields are `subscriptionName` and `subscriptionEmail` of `SubscriptionPolicyForm`. Live-probed 2026-09-25 (td28): the refusal verbatim at the window's top.

<a id="fn-f-a5"></a>
**f-a5** — `ArticleHandler::userCanViewGalley()` redirects a signed-in reader to `about/subscriptions` (note e), and `AboutHandler::subscriptions()` redirects to the journal index while payments are not configured (note f). Live-probed 2026-09-25 (td8): the home page, no notice.

<a id="fn-f-a6"></a>
**f-a6** — Only `fulfillQueuedPayment()` writes the completed payment that `OJSCompletedPaymentDAO::hasPaidPurchaseArticle()` / `hasPaidPurchaseIssue()` read; its callers are the PayPal plugin and the submission-fee endpoints (note o). The manual plugin's `notify` fulfils nothing. Live-probed 2026-09-25 (td26), article and issue.

<a id="fn-f-a7"></a>
**f-a7** — `IssueHandler::setupIssueTemplate()` computes `hasAccess` from `subscribedUser($user, $journal)` (no submission, so no `canPreview()`), `subscribedDomain()` and a paid issue; the partial-expiry flags it assigns (`issueExpiryPartial`, `articleExpiryPartial`) are read by no template. Live-probed 2026-09-25 (td9, td21): the managers, Section Editor, Copyeditor, Subscription Manager, the article's Author and a reader under "Partial expiry" saw the padlock and opened the galley.
Issue report: [pkp-e2e#394](https://github.com/jardakotesovec/pkp-e2e/issues/394) ([docs/issues/U51-A7-issue-contents-lock-galleys-reader-can-open.md](../issues/U51-A7-issue-contents-lock-galleys-reader-can-open.md)).

<a id="fn-f-a8"></a>
**f-a8** — pkp/pkp-lib#11683, OJS commit `b795decf26` (2025-08-13, "fix schedule task frequency") changed `SubscriptionExpiryReminder` from `daily()` to `monthlyOn(1)`; `sendJournalReminders()` still matches one end date per run (note n) and `executeActions()` still simulates the missing days of short months, which only a daily run needs. The pre-Laravel `registry/scheduledTasks.xml` read `<frequency day="1"/>` for this task. Live-probed 2026-09-25 (td29): the schedule list shows `0 0 1 * *`; the exact-day matching could not be seen, as the task fails first (f-a27).

<a id="fn-f-a9"></a>
**f-a9** — `purchaseIndividualSubscription.tpl` has no `common/formErrors.tpl` include (the institutional page has one); `UserHandler::payPurchaseSubscription()` re-displays the form on a failed `validate()`. Live-probed 2026-09-25 (td16).
Issue report: [pkp-e2e#388](https://github.com/jardakotesovec/pkp-e2e/issues/388) ([docs/issues/U51-A9-individual-purchase-refusal-says-nothing.md](../issues/U51-A9-individual-purchase-refusal-says-nothing.md)).

<a id="fn-f-a10"></a>
**f-a10** — `userSubscriptions.tpl` offers `purchaseSubscription/{kind}/{id}` on an `ACTIVE` subscription; `UserIndividualSubscriptionForm::execute()` (and the institutional one) set the existing subscription's status to `AWAITING_MANUAL_PAYMENT` (or `_ONLINE_`) and both dates to today before any payment. Live-probed 2026-09-25 (td18), individual and institutional.
Issue report: [docs/issues/U51-A10-purchase-on-active-subscription-removes-access.md](../issues/U51-A10-purchase-on-active-subscription-removes-access.md).

<a id="fn-f-a11"></a>
**f-a11** — `UserInstitutionalSubscriptionForm::execute()` calls `Repo::institution()->add()` for a new `Institution` on every save, then points the subscription at it. Live-probed 2026-09-25 (td17, td18): two "Tide University" rows after two purchases, a second "K3 Uni B" after "Purchase" on an existing one.
Issue report: [docs/issues/U51-A11-institutional-purchase-adds-institution-each-time.md](../issues/U51-A11-institutional-purchase-adds-institution-each-time.md).

<a id="fn-f-a12"></a>
**f-a12** — `UserHandler::purchaseSubscription()` has no sign-in check: with no user, `$user->getId()` is called on nothing (the individual path in `subscriptionExistsByUserForJournal()`, the institutional path in the form's constructor). The page router authorises page requests by default. Live-probed 2026-09-25 (td19): signed out, `GET {journal}/user/purchaseSubscription/individual` and `GET …/institutional` answered HTTP 500 with an empty body.
Issue report: [pkp-e2e#358](https://github.com/jardakotesovec/pkp-e2e/issues/358) ([docs/issues/U52-A9-membership-address-signed-out-blank-page.md](../issues/U52-A9-membership-address-signed-out-blank-page.md)).

<a id="fn-f-a13"></a>
**f-a13** — `block.tpl` gates the awaiting lines on `$paymentsEnabled && $acceptSubscriptionPayments`; `SubscriptionBlockPlugin` assigns only `acceptSubscriptionPayments`, so the awaiting lines show only where the page itself assigns `paymentsEnabled` ("My Subscriptions"). A manual purchase stores `dateEnd` as today at midnight (note f), which `Subscription::isExpired()` reads as passed. Live-probed 2026-09-25 (td20).
Issue report: [pkp-e2e#387](https://github.com/jardakotesovec/pkp-e2e/issues/387) ([docs/issues/U51-A13-A26-subscription-block-status-wrong.md](../issues/U51-A13-A26-subscription-block-status-wrong.md)).

<a id="fn-f-a14"></a>
**f-a14** — `galley_link.tpl` leaves a non-PDF galley unlocked under `$restrictOnlyPdf`; `ArticleHandler::userCanViewGalley()` lets a non-PDF galley through only inside the `purchaseArticleEnabled() || membershipEnabled()` branch, and `IssueHandler::userCanViewGalley()` inside `purchaseIssueEnabled() || membershipEnabled()` (note e). Live-probed 2026-09-25 (td23).
Issue report: [pkp-e2e#385](https://github.com/jardakotesovec/pkp-e2e/issues/385) ([docs/issues/U51-A14-non-pdf-galley-shown-open-refused.md](../issues/U51-A14-non-pdf-galley-shown-open-refused.md)).

<a id="fn-f-a15"></a>
**f-a15** — `manager.subscriptionPolicies.xMonths` "{$x} Months" and `.xWeeks` "{$x} Weeks" (OJS `locale/en/manager.po`) serve every count from 1, in `AccessForm` and `SubscriptionPolicyForm`. Live-probed 2026-09-25 (td4, td14).
Issue report: [pkp-e2e#391](https://github.com/jardakotesovec/pkp-e2e/issues/391) ([docs/issues/U51-A15-month-week-lists-read-1-months.md](../issues/U51-A15-month-week-lists-read-1-months.md)).

<a id="fn-f-a16"></a>
**f-a16** — OJS `TemplateManager` adds the side menu's "Institutions" (`management/settings/institutions`) in the same step as "Payments", for every role that gets "Payments", the Subscription Manager included; the Institutions page itself is a management page the role cannot open. Live-probed 2026-09-25 (td3), on three scratch journals, by the menu and by the address.
Issue report: [pkp-e2e#393](https://github.com/jardakotesovec/pkp-e2e/issues/393) ([docs/issues/U51-A16-subscription-manager-offered-institutions-refused.md](../issues/U51-A16-subscription-manager-offered-institutions-refused.md)).

<a id="fn-f-a17"></a>
**f-a17** — `AccessForm`'s select gives "Disabled" the value 0; a fresh journal stores no `delayedOpenAccessDuration`, which matches no option, so the box shows empty; `IssueGridHandler::publishIssue()` treats an empty value as disabled (note m). Live-probed 2026-09-25 (td4): the save posted `delayedOpenAccessDuration=` with the box untouched.
Issue report: [pkp-e2e#392](https://github.com/jardakotesovec/pkp-e2e/issues/392) ([docs/issues/U51-A17-delayed-open-access-box-empty.md](../issues/U51-A17-delayed-open-access-box-empty.md)).

<a id="fn-f-a18"></a>
**f-a18** — The article page lists the file under "Additional Files" through the supplementary link (`a.obj_galley_link_supplementary`), which keeps the file glyph where a restricted galley link gets the padlock; `ArticleHandler::download()` refuses it like any galley (note e). Live-probed 2026-09-25 (td6).
Issue report: [pkp-e2e#395](https://github.com/jardakotesovec/pkp-e2e/issues/395) ([docs/issues/U51-A18-additional-file-no-padlock-refused.md](../issues/U51-A18-additional-file-no-padlock-refused.md)).

<a id="fn-f-a19"></a>
**f-a19** — `galley_link.tpl` prints `reader.purchasePrice` whenever a fee and a currency are passed; `article_details.tpl`, `article_summary.tpl` and `issue_toc.tpl` pass the journal's saved `purchaseArticleFee` / `purchaseIssueFee` without asking whether payments are configured, while the purchase itself needs `purchaseArticleEnabled()` / `purchaseIssueEnabled()` (note o). Live-probed 2026-09-25 (td6, td8).
Issue report: [pkp-e2e#396](https://github.com/jardakotesovec/pkp-e2e/issues/396) ([docs/issues/U51-A19-locked-link-fee-while-payments-off.md](../issues/U51-A19-locked-link-fee-while-payments-off.md)).

<a id="fn-f-a20"></a>
**f-a20** — `IssueHandler::userCanViewGalley()` enters its purchase branch on `purchaseIssueEnabled() || membershipEnabled()` and then queues a `PAYMENT_TYPE_PURCHASE_ISSUE` payment of the (empty) issue fee (note e); the article side leads to the "Subscriptions" page in the same case. Live-probed 2026-09-25 (td8), on two journals.
Issue report: [pkp-e2e#386](https://github.com/jardakotesovec/pkp-e2e/issues/386) ([docs/issues/U51-A20-full-issue-asks-fee-of-no-amount.md](../issues/U51-A20-full-issue-asks-fee-of-no-amount.md)).

<a id="fn-f-a21"></a>
**f-a21** — `SubscriptionForm` checks each date's presence and range (note h) but not their order. Live-probed 2026-09-25 (td11): start 2026-12-01, end 2026-01-01, saved and listed so.

<a id="fn-f-a22"></a>
**f-a22** — `SubscriptionDAO::applySearchFilters()` maps given name, family name, username and email to columns; the institutional fields have no mapping (`default => null`), so the filter is dropped. Membership, reference number and notes are mapped there, yet the screen returned the whole list for them too. Live-probed 2026-09-25 (td10), on two journals, "contains" and "is".
Issue report: [pkp-e2e#397](https://github.com/jardakotesovec/pkp-e2e/issues/397) ([docs/issues/U51-A22-subscription-search-fields-narrow-nothing.md](../issues/U51-A22-subscription-search-fields-narrow-nothing.md)).

<a id="fn-f-a23"></a>
**f-a23** — `AboutHandler::subscriptions()` checks only the payment setup (note f) and the template offers "Purchase New Subscription" to any signed-in visitor, while `UserHandler::purchaseSubscription()` redirects to the index outside `PUBLISHING_MODE_SUBSCRIPTION`. Live-probed 2026-09-25 (td27), on an open-access and a not-online journal.
Issue report: [pkp-e2e#389](https://github.com/jardakotesovec/pkp-e2e/issues/389) ([docs/issues/U51-A23-purchase-link-on-open-journal-leads-home.md](../issues/U51-A23-purchase-link-on-open-journal-leads-home.md)).

<a id="fn-f-a24"></a>
**f-a24** — `userSubscriptions.tpl` and the block link to `about/subscriptions`, which redirects to the journal index while payments are not configured (note f). Live-probed 2026-09-25 (td20, td25).
Issue report: [pkp-e2e#390](https://github.com/jardakotesovec/pkp-e2e/issues/390) ([docs/issues/U51-A24-subscription-offer-links-lead-home-payments-off.md](../issues/U51-A24-subscription-offer-links-lead-home-payments-off.md)).

<a id="fn-f-a25"></a>
**f-a25** — `UserInstitutionalSubscriptionForm::initData()` fills `ipRanges` with `$institution->getIPRanges()`, an array, which the text box prints as "Array"; the IP check then refuses it. Live-probed 2026-09-25 (td18).
Issue report: [docs/issues/U51-A25-institutional-purchase-ip-ranges-read-array.md](../issues/U51-A25-institutional-purchase-ip-ranges-read-array.md).

<a id="fn-f-a26"></a>
**f-a26** — `block.tpl` has lines only for the two awaiting statuses (note f-a13); any other status falls through to the date lines (`isNonExpiring()`, `isExpired()`, else "Expires: {date}"). Live-probed 2026-09-25 (td20): "Needs Approval", "Needs Information" and "Other, See Notes" read "Expires: 2027-09-25" in the block while "My Subscriptions" read "Inactive" and the PDF led to the "Subscriptions" page.
Issue report: [pkp-e2e#387](https://github.com/jardakotesovec/pkp-e2e/issues/387) ([docs/issues/U51-A13-A26-subscription-block-status-wrong.md](../issues/U51-A13-A26-subscription-block-status-wrong.md)).

<a id="fn-f-a27"></a>
**f-a27** — Live-probed 2026-09-25 (td29): the scheduled task `SubscriptionExpiryReminder`, run with no request, died with "Call to a member function getPrimaryLocale() on null" in `InstitutionalSubscriptionDAO::getInstitutionNameFetchParameters()` (the request's context is missing when the site's timer runs it); its task log holds "Task process started." and nothing after, twice.

<a id="fn-f-a28"></a>
**f-a28** — Test run 2026-09-25 (Rule 19; scenario 6). The four answers to "Save" were: "A user is required. A subscription start date is required. A subscription end date is required." (no user, no dates); then, Nova chosen, "A subscription start date is required." and "A subscription end date is required." again, the boxes now reading today's date; then, Sam chosen, today's date typed into "Start date" and next year's into "End date", "This user already has a subscription for this journal. A subscription start date is required."; then, Nova chosen, "A subscription start date is required.", the window staying open. A probe the same day read the fields after each step: from the first refusal on, the visible boxes held today's date while the values the window sends were empty; typing today's date left the sent start date empty, next year's end date was sent. The boxes are jQuery UI date pickers: lib/pkp `js/controllers/form/FormHandler.js` renames the visible box to `{name}-removed` and sends a hidden copy under the field's name (`templates/payments/individualSubscriptionForm.tpl`, `dateStart`/`dateEnd` with class `datepicker`).

<a id="fn-f-a29"></a>
**f-a29** — Test run 2026-10-01 (Side effects; scenario 12), OJS main (ojs `bade233f73`, lib/pkp `2e377d27fc`): after the scheduled task `APP\tasks\OpenAccessNotification` ran once and the jobs ran, the mail catcher held two emails "Free to read: Vol. 1 No. 1 (2026) of {journal} is now open access" for the Reader and two for the Journal Manager (one expected). Seen on the VM on a reset database and on every OJS CI run of 2026-10-01; the same check passed on every run of 2026-09-30. Mechanism (code read): `executeActions()` calls `sendNotifications()` for today, then, on the 1st of a month whose previous month is in `$shortMonths = [2,4,6,9,11]`, again for a simulated 31st of that month, and on 1 March for a simulated 30 February and, unless `date('L', mktime(0, 0, 0, 0, 0, $year))` (which reads the previous year) says leap, 29 February. `sendNotifications()` matches `strtotime($openAccessDate) == mktime(0, 0, 0, $month, $day, $year)`; PHP's `mktime()` rolls 31 April, June, September and November over to the 1st of the next month, 29 February of a common year and 30 February of a leap year to 1 March, so an issue opening today matches twice and gets two `OpenAccessMailUsers` batches. In the year after a leap year the 29th is skipped and 30 February falls on 2 March, so 1 March sends once. Only 1 October was driven; the other days are read in the code and checked against PHP's date arithmetic. The simulation dates from the task's first version (OJS `b33af3e5a5`, 2006-04-18, then with the list `2,4,6,8,10,12`); the task runs daily (`classes/scheduler/Scheduler.php`, `daily()`).

<a id="fn-f-ops1"></a>
**f-ops1** — Live-probed 2026-09-23 by the Navigation menus claim check (its OPS2): "Saved" shown, the next load with neither choice marked, "Archives" still in the header; the Search claim check saw every role still reach the Search page. Live-probed 2026-09-25 (td1) on a scratch server: "OPS will not be used…" and "The server will provide open access…" each saved with "Saved" and came back unselected; with the second saved, the visitor and the Reader still saw "Archives", the preprint page and its PDF. OPS `schemas/context.json` has no `publishingMode`, so the context API drops the value (note b); OPS `OpsServerMustPublishPolicy` and the archive header still read it.
Issue report: [pkp-e2e#380](https://github.com/jardakotesovec/pkp-e2e/issues/380) ([docs/issues/U51-OPS1-posting-mode-says-saved-keeps-nothing.md](../issues/U51-OPS1-posting-mode-says-saved-keeps-nothing.md)).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Access" tab: "Publishing Mode", "Delayed Open Access", "Save" (OJS; the OPS tab's "Posting Mode") | Settings › Distribution › "Access" | AFFM-096 |
| "Payments" page and its tab bar | side menu › "Payments" (`{journal}/payments`) | ROUTE-046 · AFFM-172 |
| "Individual Subscriptions" list | "Payments" › "Individual Subscriptions" | GRID-080 · GRID-082 |
| "Institutional Subscriptions" list | "Payments" › "Institutional Subscriptions" | GRID-081 · GRID-082 |
| "Create New Subscription" | either subscription list | AFFM-173 |
| Subscription list search form | either subscription list | AFFM-174 |
| Row "Edit", "Renew", "Delete" | a subscription row's arrow | AFFM-175 · AFFM-176 · AFFM-177 |
| Individual subscription window | "Create New Subscription" / "Edit" on "Individual Subscriptions" | AFFM-239 |
| Institutional subscription window | "Create New Subscription" / "Edit" on "Institutional Subscriptions" | AFFM-240 |
| "Locate a User" in the subscription window | the window's top | AFFM-241 · GRID-087 |
| "Subscription Types" list, "Create New Subscription Type" | "Payments" › "Subscription Types" | GRID-084 · AFFM-178 |
| Type row "Edit", "Delete" | a type row's arrow | AFFM-179 |
| Subscription type window | "Create New Subscription Type" / "Edit" | AFFM-242 |
| "Subscription Policies" form | "Payments" › "Subscription Policies" | AFFM-180 |
| Issue "Access" tab and its "Save" (screen owned by *Issues*) | "Issue Management" › "Access" | AFFW-742 · AFFW-748 |
| "Subscriptions" page | header "Subscriptions" (`{journal}/about/subscriptions`) | ROUTE-032 · AFFR-099 · AFFR-100 |
| "My Subscriptions" | header "My Subscriptions" (`{journal}/user/subscriptions`) | ROUTE-052 · AFFR-101 |
| "Purchase Individual Subscription" | "Purchase New Subscription" (`user/purchaseSubscription/individual[/{id}]`, posting to `user/payPurchaseSubscription/…`) | ROUTE-052 · AFFR-102 |
| "Purchase Institutional Subscription" | "Purchase New Subscription" under institutional (`user/purchaseSubscription/institutional[/{id}]`) | ROUTE-052 · AFFR-103 |
| "Purchase" and "Renew" on "My Subscriptions" | `user/completePurchaseSubscription/{kind}/{id}`, `user/payRenewSubscription/{kind}/{id}` | ROUTE-052 |
| "Subscription" block | the sidebar, once placed | PLUG-006 · AFFR-090 |
| "Subscription Notification" email | subscription window's email box | MAIL-066 |
| Expiry reminder emails and their scheduled task | the site's timer, monthly | MAIL-063 · MAIL-064 · MAIL-065 · JOB-059 |
| Online payment notification emails | an online subscription payment completing | MAIL-067 · MAIL-068 · MAIL-069 · MAIL-070 |
| Open-access email, its notification, scheduled task and queued job | the site's timer, daily | MAIL-061 · NOTIF-066 · JOB-058 · JOB-032 |

Handed to other specs: the "Payment Types" and "Payments" tabs and
`payMembership` (ROUTE-046's and ROUTE-052's payment operations) are
*Payments & APCs*'s; the issue's "Access" tab as a screen and the
per-article "Open Access" box (AFFM-256, AFFM-250) are
[Issues](U50-issues.md)'s; "Enable OAI" is *OAI-PMH*'s.

## Reference — code anchors

- OJS pages: `pages/payments/PaymentsHandler.php` · `pages/about/AboutHandler.php` · `pages/user/UserHandler.php` · `pages/article/ArticleHandler.php` (`view()`, `download()`, `userCanViewGalley()`) · `pages/issue/IssueHandler.php` (`userCanViewGalley()`, `setupIssueTemplate()`)
- OJS grids and forms: `controllers/grid/subscriptions/SubscriptionsGridHandler.php` · `IndividualSubscriptionsGridHandler.php` · `InstitutionalSubscriptionsGridHandler.php` · `SubscriptionsGridRow.php` · `SubscriptionsGridCellProvider.php` · `IndividualSubscriptionForm.php` · `InstitutionalSubscriptionForm.php` · `SubscriptionTypesGridHandler.php` · `SubscriptionTypesGridRow.php` · `SubscriptionTypesGridCellProvider.php` · `SubscriptionTypeForm.php` · `controllers/grid/users/subscriberSelect/SubscriberSelectGridHandler.php` · `classes/subscription/form/SubscriptionForm.php` · `SubscriptionPolicyForm.php` · `UserIndividualSubscriptionForm.php` · `UserInstitutionalSubscriptionForm.php` · `PaymentTypesForm.php` · `classes/components/forms/context/AccessForm.php` · `controllers/grid/issues/form/IssueAccessForm.php` · `classes/controllers/grid/issues/IssueGridHandler.php::publishIssue()` · `controllers/grid/toc/TocGridHandler.php::setAccessStatus()`
- OJS classes: `classes/subscription/Subscription.php` · `IndividualSubscription.php` · `InstitutionalSubscription.php` · `SubscriptionDAO.php` · `IndividualSubscriptionDAO.php` · `InstitutionalSubscriptionDAO.php` · `SubscriptionType.php` · `SubscriptionTypeDAO.php` · `SubscriptionAction.php` · `classes/issue/IssueAction.php` · `classes/payment/ojs/OJSPaymentManager.php` · `classes/security/authorization/OjsJournalMustPublishPolicy.php` · `classes/template/TemplateManager.php` (the "Payments" side-menu entry)
- OJS templates: `templates/payments/index.tpl` · `individualSubscriptionForm.tpl` · `institutionalSubscriptionForm.tpl` · `subscriptionTypeForm.tpl` · `subscriptionPolicyForm.tpl` · `templates/controllers/grid/subscriptions/subscriptionsGridFilter.tpl` · `templates/management/additionalDistributionTabs.tpl` · `templates/frontend/pages/subscriptions.tpl` · `userSubscriptions.tpl` · `purchaseIndividualSubscription.tpl` · `purchaseInstitutionalSubscription.tpl` · `templates/frontend/components/subscriptionContact.tpl` · `templates/frontend/objects/galley_link.tpl` · `article_summary.tpl` · `issue_toc.tpl` · `article_details.tpl` · `plugins/themes/default/styles/objects/galley_link.less`
- OJS email, tasks, jobs: `classes/mail/mailables/SubscriptionNotify.php` · `SubscriptionExpiresSoon.php` · `SubscriptionExpired.php` · `SubscriptionExpiredLast.php` · `SubscriptionPurchaseIndividual.php` · `SubscriptionPurchaseInstitutional.php` · `SubscriptionRenewIndividual.php` · `SubscriptionRenewInstitutional.php` · `OpenAccessNotify.php` · `classes/tasks/SubscriptionExpiryReminder.php` · `classes/tasks/OpenAccessNotification.php` · `jobs/notifications/OpenAccessMailUsers.php` · `classes/scheduler/Scheduler.php`
- OJS plugins: `plugins/blocks/subscription/SubscriptionBlockPlugin.php` · `templates/block.tpl` · `plugins/paymethod/manual/ManualPaymentPlugin.php` · `templates/paymentForm.tpl`
- OPS: `classes/components/forms/context/AccessForm.php` · `schemas/context.json` · `classes/security/authorization/OpsServerMustPublishPolicy.php`
- lib/pkp: `classes/submission/Repository.php` (`canPreview()`, `_roleCanPreview()`) · `classes/payment/PaymentManager.php` · `classes/notification/NotificationSubscriptionSettingsDAO.php::getSubscribedUserIds()` · `js/controllers/form/AjaxFormHandler.js::handleResponse()`
- Locale: OJS `locale/en/manager.po` `manager.subscriptions.*`, `manager.subscriptionTypes.*`, `manager.subscriptionPolicies.*`, `manager.distribution.*`, `manager.payment.*`; `locale/en/locale.po` `subscriptions.*`, `subscriptionTypes.*`, `about.subscriptions*`, `user.subscriptions.*`, `reader.*`, `payment.*`; `locale/en/emails.po` `emails.subscription*`, `emails.openAccessNotify.*`; `plugins/blocks/subscription/locale/en/locale.po`; `plugins/paymethod/manual/locale/en/locale.po`
