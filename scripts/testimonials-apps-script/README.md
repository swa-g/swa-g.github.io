# Testimonials: how it works and how to switch it on

**Flow:** visitor fills the form on the site -> a row appears in your Google Sheet marked **Unverified** -> the visitor sees
"submitted, pending review" -> you open the sheet and set Status to **Verified** -> only Verified rows show in the slider.
While any row is Unverified, the site shows a small "* Some testimonials are pending verification" note under the slider.
No email is involved.

A public website cannot write into a file on your own computer, so the "Excel file" lives in Google Sheets. It opens in
Excel at any time: in the sheet use **File > Download > Microsoft Excel (.xlsx)**.

## One-time setup (about 5 minutes)

1. Go to <https://sheets.google.com> and create a blank spreadsheet. Name it e.g. "Website testimonials".
2. **Extensions > Apps Script**. Delete the sample code and paste in everything from `Code.gs` (this folder). Click **Save**.
3. In the toolbar choose the function **setup** and click **Run**. Approve the permissions when asked (it only touches this sheet).
   A "Testimonials" tab appears with headings, a Status dropdown and row colours.
4. **Deploy > New deployment > type: Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. Put that URL in `assets/testimonials-config.js` as `endpoint` (or just give it to Claude), then push the site.

## Day to day

- New submissions arrive in yellow with Status **Unverified**.
- Read it, then change Status to **Verified** (turns green) or **Rejected** (turns grey).
- The site picks up the change on the next page load. Nothing to publish or push.
- Columns: Timestamp, Name, Relationship, Institution / role, Testimonial, Status, Notes (private).
  The Notes column is never sent to the website.

## What the public can and cannot see

- The public endpoint returns only Verified rows (name, relationship, institution, testimonial, year).
- Unverified text is never returned, only the count (that is what drives the asterisk).
- Spam brakes: hidden honeypot field, length limits, at most 30 submissions per hour, and nothing shows until you verify it.
- Text starting with `= + - @` is stored as plain text so it cannot run as a spreadsheet formula.

## If you change `Code.gs` later

Paste the new code, then **Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy**.
The URL stays the same.
