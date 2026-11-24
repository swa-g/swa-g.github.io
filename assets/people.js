/* People shown in the "People I have worked with" section. Generated from coauthors-review.xlsx, then hand-editable.

   Each card shows: photo (if `photo` is set, otherwise initials), name, and current affiliation (`org`):
     org: { pos: "Professor", name: "Jadavpur University", abbr: "JU", city: "Kolkata", country: "India" }
   The position is highlighted; "University (ABBR), City, Country" is shown below it in smaller type.
   Leave `pos` null for people without a position, and leave out `org` when the affiliation is unknown.
   - `rel` only decides WHICH GROUP and in what order the person appears (see `groups`); it is not displayed.
   - `aliases` are the spellings used in the paper author lists, so the same person is merged into one entry.
   - `photo`: put a square-ish picture in assets/people/ named after the person (e.g. nibaran-das.jpg).
   - `hide: true` removes the person from this section completely.
   - Co-authors who are NOT listed with a `rel` appear at the bottom under "Other co-authors". */
window.PEOPLE = {
  groups: [
    { key: "supervisors", title: "Supervisors & co-supervisors", rels: ["Supervisor", "Co-supervisor"] },
    { key: "senior",      title: "Senior collaborators",         rels: ["Senior collaborator"] },
    { key: "industry",    title: "Industry & collaborators",     rels: ["Industry / other", "Collaborator", "External collaborator"] },
    { key: "colleagues",  title: "Present & past colleagues",    rels: ["Present Colleague", "Past Colleague", "Colleague (same institution)"] },
    { key: "students",    title: "Research fellows & students",  rels: ["Fellow research scholar", "Student (PhD)", "Student (Master's)", "Student (UG / project)", "Student (Intern)"] }
  ],
  people: [
    {"name": "Nibaran Das", "aliases": ["Nibaran Das", "N Das"], "rel": "Supervisor", "org": {"pos": "Professor", "name": "Jadavpur University", "abbr": "JU", "city": "Kolkata", "country": "India"}},
    {"name": "Mita Nasipuri", "aliases": ["Mita Nasipuri", "M Nasipuri"], "rel": "Senior collaborator", "org": {"pos": "Professor", "name": "Jadavpur University", "abbr": "JU", "city": "Kolkata", "country": "India"}},
    {"name": "KC Santosh", "aliases": ["KC Santosh"], "rel": "Senior collaborator", "org": {"pos": "Professor & Department Chair", "name": "University of South Dakota", "abbr": "USD", "city": "Vermillion", "country": "USA"}},
    {"name": "Teresa Gonçalves", "aliases": ["Teresa Gonçalves", "T Goncalves", "T Gonçalves"], "rel": "Co-supervisor", "org": {"pos": "Associate Professor", "name": "Universidade de Évora", "abbr": "UÉvora", "city": "Évora", "country": "Portugal"}},
    {"name": "Paulo Quaresma", "aliases": ["Paulo Quaresma", "P Quaresma"], "rel": "Senior collaborator", "org": {"pos": "Full Professor", "name": "Universidade de Évora", "abbr": "UÉvora", "city": "Évora", "country": "Portugal"}},
    {"name": "Bodhisatwa Mandal", "aliases": ["B Mandal", "Bodhisatwa Mandal"], "rel": "Student (UG / project)"},
    {"name": "Ritesh Sarkhel", "aliases": ["R Sarkhel", "Ritesh Sarkhel"], "rel": "Fellow research scholar"},
    {"name": "Branko Šter", "aliases": ["Branko Šter", "B Šter"], "rel": "Supervisor", "org": {"pos": "Professor", "name": "University of Ljubljana", "abbr": "UL", "city": "Ljubljana", "country": "Slovenia"}},
    {"name": "Mahantapas Kundu", "aliases": ["Mahantapas Kundu", "M Kundu"], "rel": "Senior collaborator", "org": {"pos": "Professor", "name": "Jadavpur University", "abbr": "JU", "city": "Kolkata", "country": "India"}},
    {"name": "Utathya Aich", "aliases": ["U Aich", "Utathya Aich"], "rel": "Industry / other", "org": {"pos": null, "name": "CNH Industrial ITC", "abbr": null, "city": null, "country": "India"}},
    {"name": "Tulika Saha", "aliases": ["T Saha", "Tulika Saha"], "rel": "Collaborator", "org": {"pos": "Assistant Professor", "name": "International Institute of Information Technology Bangalore", "abbr": "IIIT-B", "city": "Bengaluru", "country": "India"}},
    {"name": "S Das", "aliases": ["S Das"], "rel": ""},
    {"name": "Soumya Ukil", "aliases": ["S Ukil", "Soumya Ukil"], "rel": "Student (UG / project)"},
    {"name": "SM Obaidullah", "aliases": ["SM Obaidullah"], "rel": ""},
    {"name": "K Roy", "aliases": ["K Roy"], "rel": ""},
    {"name": "Anisha Pal", "aliases": ["A Pal", "Anisha Pal"], "rel": "Student (UG / project)"},
    {"name": "Shourya Jaiswal", "aliases": ["S Jaiswal", "Shourya Jaiswal"], "rel": "Student (UG / project)"},
    {"name": "Suvam Dubey", "aliases": ["S Dubey", "Suvam Dubey"], "rel": "Student (UG / project)"},
    {"name": "Sandipan Choudhuri", "aliases": ["S Choudhuri", "Sandipan Choudhuri"], "rel": "Student (Master's)", "org": {"pos": "PhD Student", "name": "Arizona State University", "abbr": "ASU", "city": "Tempe", "country": "USA"}},
    {"name": "David Muhič", "aliases": ["David Muhič"], "rel": "Student (UG / project)"},
    {"name": "David Calhas", "aliases": ["David Calhas"], "rel": "Present Colleague"},
    {"name": "Vida Groznik", "aliases": ["Vida Groznik"], "rel": ""},
    {"name": "Dejan Georgiev", "aliases": ["Dejan Georgiev"], "rel": ""},
    {"name": "Aleksander Sadikov", "aliases": ["Aleksander Sadikov"], "rel": ""},
    {"name": "P Maiti", "aliases": ["P Maiti"], "rel": ""},
    {"name": "S Chanda", "aliases": ["S Chanda"], "rel": ""},
    {"name": "Subhadip Chandra", "aliases": ["S Chandra", "Subhadip Chandra"], "rel": "Past Colleague", "org": {"pos": "Assistant Professor", "name": "Institute of Engineering & Management", "abbr": "IEM", "city": "Kolkata", "country": "India"}},
    {"name": "Deepsubhra Guha Roy", "aliases": ["D Guha Roy", "Deepsubhra Guha Roy"], "rel": "Past Colleague", "org": {"pos": "Associate Professor", "name": "Institute of Engineering & Management", "abbr": "IEM", "city": "Kolkata", "country": "India"}},
    {"name": "Chandrima Das", "aliases": ["C Das", "Chandrima Das"], "rel": "Student (UG / project)"},
    {"name": "Rangan Satpathi", "aliases": ["R Satpathi", "Rangan Satpathi"], "rel": "Student (UG / project)"},
    {"name": "Mousumi Laha", "aliases": ["M Laha", "Mousumi Laha"], "rel": "Past Colleague", "org": {"pos": null, "name": "Institute of Engineering & Management", "abbr": "IEM", "city": "Kolkata", "country": "India"}},
    {"name": "P Sarkar", "aliases": ["P Sarkar"], "rel": ""},
    {"name": "Kalpita Dutta", "aliases": ["K Dutta", "Kalpita Dutta"], "rel": "Fellow research scholar"},
    {"name": "Malyaban Bal", "aliases": ["M Bal", "Malyaban Bal"], "rel": "Student (UG / project)"},
    {"name": "Arpita Basak", "aliases": ["A Basak", "Arpita Basak"], "rel": "Student (UG / project)"},
    {"name": "Arnald Dutta", "aliases": ["A Dutta", "Arnald Dutta"], "rel": "Student (UG / project)"},
    {"name": "Ishita Das", "aliases": ["I Das", "Ishita Das"], "rel": "Student (Master's)"},
    {"name": "Ujjwal Maulik", "aliases": ["Ujjwal Maulik", "U Maulik"], "rel": "Senior collaborator", "org": {"pos": "Professor", "name": "Jadavpur University", "abbr": "JU", "city": "Kolkata", "country": "India"}},
    {"name": "Soumyajyoti Dey", "aliases": ["S Dey", "Soumyajyoti Dey"], "rel": "Fellow research scholar", "org": {"pos": "Assistant Professor (Senior Grade 1)", "name": "Vellore Institute of Technology", "abbr": "VIT", "city": "Vellore", "country": "India"}},
    {"name": "S Mitra", "aliases": ["S Mitra"], "rel": "Senior collaborator"},
    {"name": "S Chakrabarty", "aliases": ["S Chakrabarty"], "rel": ""},
    {"name": "P Shaw", "aliases": ["P Shaw"], "rel": ""},
    {"name": "S Chowdhury", "aliases": ["S Chowdhury"], "rel": ""},
    {"name": "Aritra Das", "aliases": ["A Das", "Aritra Das"], "rel": "Student (Master's)"},
    {"name": "Deepan Sadhukhan", "aliases": ["D Sadhukhan", "Deepan Sadhukhan"], "rel": "Student (UG / project)", "org": {"pos": "UG Student", "name": "Institute of Engineering & Management", "abbr": "IEM", "city": "Kolkata", "country": "India"}},
    {"name": "Shinjini Chakraborty", "aliases": ["S Chakraborty", "Shinjini Chakraborty"], "rel": "Student (UG / project)", "org": {"pos": "UG Student", "name": "Institute of Engineering & Management", "abbr": "IEM", "city": "Kolkata", "country": "India"}}
  ]
};
