/* Where testimonials are stored. See scripts/testimonials-apps-script/README.md for the 5-minute setup.

   endpoint: the "Web app URL" of the Google Apps Script (ends in /exec).
             - Set  -> the form saves each testimonial to your Google Sheet as "Unverified", shows visitors a
                       "pending review" message, and the slider shows only rows you mark "Verified".
                       An asterisk note appears while any rows are still Unverified.
             - Empty -> the form falls back to opening an email draft and the slider shows only the entries in
                       assets/testimonials.js. */
window.TESTIMONIAL_CONFIG = {
  endpoint: ""
};
