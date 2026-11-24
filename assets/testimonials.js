/* Approved testimonials shown in the slider.

   Entries listed here are always shown. Once the Google Sheet is connected (assets/testimonials-config.js),
   submissions go to the sheet and you verify them there, so this list can stay empty.
   Until the sheet is connected, the form opens an email draft and you can paste approved ones here.

   Fields:  quote (required) · name (required) · role (e.g. "MTech student, 2023") · org (optional) · year (optional)

   Leave the list empty to show the "be the first" message. To preview the layout with clearly-marked sample
   cards, open the site with  ?demo  at the end of the address (e.g. http://localhost:8765/?demo). */
window.TESTIMONIALS = [
  /* { quote: "Text of the testimonial.", name: "Full Name", role: "MTech student", org: "Institute name", year: 2024 }, */
];
