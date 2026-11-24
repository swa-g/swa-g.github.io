/**
 * Testimonials backend for swarnendughosh.com
 *
 * A tiny Google Apps Script web app that lives inside a Google Sheet. The website:
 *   - POSTs a new testimonial  -> a row is added with Status = "Unverified"
 *   - GETs ?action=list        -> receives ONLY the "Verified" rows, plus how many rows are still "Unverified"
 *
 * Unverified text is never sent back to the website. You verify by changing the Status cell to "Verified".
 * Setup steps are in README.md (about 5 minutes, no code to write).
 */

var SHEET_NAME = "Testimonials";
var HEADERS = ["Timestamp", "Name", "Relationship", "Institution / role", "Testimonial", "Status", "Notes (private)"];
var STATUS_COL = 6;                       // column F
var RELATIONSHIPS = ["Student", "Mentee / project student", "Colleague", "Co-author / collaborator", "Supervisor / mentor", "Other"];
var MAX_PER_HOUR = 30;                    // simple spam brake for the whole site

/** Run this ONCE from the editor (Run > setup). Creates the sheet, headings, Status dropdown and colours. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight("bold").setBackground("#1F3864").setFontColor("#FFFFFF");
  sh.setFrozenRows(1);
  var dropdown = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Unverified", "Verified", "Rejected"], true).setAllowInvalid(false).build();
  sh.getRange(2, STATUS_COL, 2000, 1).setDataValidation(dropdown);
  var area = sh.getRange(2, 1, 2000, HEADERS.length);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$F2="Verified"').setBackground("#E2EFDA").setRanges([area]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$F2="Unverified"').setBackground("#FFF2CC").setRanges([area]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$F2="Rejected"').setBackground("#EDEDED").setRanges([area]).build()
  ]);
  [160, 160, 170, 200, 520, 100, 220].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(2, 5, 2000, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  Logger.log("Sheet ready. Now deploy as a web app (see README).");
}

function sheet_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh) throw new Error("Run setup() first.");
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Trim, cap length, and neutralise spreadsheet formulas (a value starting with = + - @ would be run as a formula). */
function clean_(value, max) {
  var s = String(value == null ? "" : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (s.length > max) s = s.slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

/** A visitor submits a testimonial. */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.website) return json_({ ok: true });                 // honeypot: bots fill this; pretend it worked
    var name = clean_(data.name, 80), org = clean_(data.org, 100), msg = clean_(data.message, 1000);
    var rel = clean_(data.relationship, 60);
    if (!name || msg.length < 20) return json_({ ok: false, error: "Please give your name and a testimonial of at least 20 characters." });
    if (data.consent !== true) return json_({ ok: false, error: "Please confirm you are happy for this to be shown." });
    if (RELATIONSHIPS.indexOf(rel) === -1) rel = "Other";

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var cache = CacheService.getScriptCache();
      var key = "n_" + Math.floor(Date.now() / 3600000);
      var used = Number(cache.get(key) || 0);
      if (used >= MAX_PER_HOUR) return json_({ ok: false, error: "Too many submissions right now. Please try again later." });
      cache.put(key, String(used + 1), 3700);
      sheet_().appendRow([new Date(), name, rel, org, msg, "Unverified", ""]);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: "Could not save your testimonial." });
  }
}

/** The website asks for the public list. Only Verified rows leave the sheet; Unverified ones are just counted. */
function doGet(e) {
  var rows = sheet_().getDataRange().getValues().slice(1);
  var verified = [], pending = 0;
  rows.forEach(function (r) {
    var status = String(r[STATUS_COL - 1]).trim().toLowerCase();
    if (status === "verified") {
      verified.push({
        name: String(r[1]), role: String(r[2]), org: String(r[3]), quote: String(r[4]),
        year: (r[0] instanceof Date) ? r[0].getFullYear() : ""
      });
    } else if (status === "unverified") {
      pending++;
    }
  });
  return json_({ verified: verified, pending: pending });
}
