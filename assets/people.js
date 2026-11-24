/* People shown in the "People" section.  Generated from coauthors-review.xlsx, then hand-editable.

   - Every person is listed here with the spelling(s) used in author lists (`aliases`), the full `name` to display,
     and a relationship (`rel`). Co-author counts and years are COMPUTED from assets/data.js.
   - `rel` decides the group (see `groups`). Leave it "" to show the person only in the "All co-authors" list.
   - `org` is only shown if present. `hide: true` removes the person from this section completely.
   - Anyone in an author list who is NOT listed here still appears in "All co-authors" under the spelling in the paper.
   - `extraStudents` is for people you guided who are not co-authors on any paper. Fields: name, level, years, topic, now, link.

   Held back on purpose until you confirm the spelling (the sheet and the published paper disagree):
   - B Mandal: sheet says 'Boadhisatwa Mandal'; the arXiv paper spells it 'Bodhisatwa Mandal'
   - S Jaiswal: sheet says 'Soumya Jaiswal'; the Crossref record for SegFast spells it 'Shourya Jaiswal'
   Affiliations that were still marked "(please confirm)" in the sheet are NOT published. */
window.PEOPLE = {
  groups: [
    { key: "supervisors",   title: "Supervisors",            rels: ["Supervisor", "Co-supervisor"], big: true },
    { key: "students",      title: "Students & mentees",     rels: ["Student (PhD)", "Student (Master's)", "Student (UG / project)", "Student (Intern)"] },
    { key: "colleagues",    title: "Colleagues",             rels: ["Present Colleague", "Past Colleague"] },
    { key: "collaborators", title: "Collaborators & peers",  rels: ["Senior collaborator", "Collaborator", "Fellow research scholar", "Industry / other"] }
  ],
  people: [
    {"name": "Nibaran Das", "aliases": ["Nibaran Das", "N Das"], "rel": "Supervisor", "org": "Jadavpur University, Kolkata", "note": "Professor, Dept. of Computer Science & Engineering"},
    {"name": "Mita Nasipuri", "aliases": ["Mita Nasipuri", "M Nasipuri"], "rel": "Senior collaborator"},
    {"name": "KC Santosh", "aliases": ["KC Santosh"], "rel": "Senior collaborator"},
    {"name": "Teresa Gonçalves", "aliases": ["Teresa Gonçalves", "T Goncalves", "T Gonçalves"], "rel": "Co-supervisor", "org": "Universidade de Évora, Portugal", "note": "Associate Professor, Dept. of Informatics"},
    {"name": "Paulo Quaresma", "aliases": ["Paulo Quaresma", "P Quaresma"], "rel": "Senior collaborator"},
    {"name": "B Mandal", "aliases": ["B Mandal"], "rel": "Student (UG / project)"},
    {"name": "Ritesh Sarkhel", "aliases": ["R Sarkhel", "Ritesh Sarkhel"], "rel": "Fellow research scholar"},
    {"name": "Branko Šter", "aliases": ["Branko Šter", "B Šter"], "rel": "Supervisor"},
    {"name": "Mahantapas Kundu", "aliases": ["Mahantapas Kundu", "M Kundu"], "rel": "Senior collaborator"},
    {"name": "Utathya Aich", "aliases": ["U Aich", "Utathya Aich"], "rel": "Industry / other"},
    {"name": "Tulika Saha", "aliases": ["T Saha", "Tulika Saha"], "rel": "Collaborator"},
    {"name": "S Das", "aliases": ["S Das"], "rel": ""},
    {"name": "Soumya Ukil", "aliases": ["S Ukil", "Soumya Ukil"], "rel": "Student (UG / project)"},
    {"name": "SM Obaidullah", "aliases": ["SM Obaidullah"], "rel": ""},
    {"name": "K Roy", "aliases": ["K Roy"], "rel": ""},
    {"name": "Anisha Pal", "aliases": ["A Pal", "Anisha Pal"], "rel": "Student (UG / project)"},
    {"name": "S Jaiswal", "aliases": ["S Jaiswal"], "rel": "Student (UG / project)"},
    {"name": "Suvam Dubey", "aliases": ["S Dubey", "Suvam Dubey"], "rel": "Student (UG / project)"},
    {"name": "Sandipan Choudhuri", "aliases": ["S Choudhuri", "Sandipan Choudhuri"], "rel": "Student (Master's)"},
    {"name": "David Muhič", "aliases": ["David Muhič"], "rel": "Student (UG / project)"},
    {"name": "David Calhas", "aliases": ["David Calhas"], "rel": "Present Colleague"},
    {"name": "Vida Groznik", "aliases": ["Vida Groznik"], "rel": ""},
    {"name": "Dejan Georgiev", "aliases": ["Dejan Georgiev"], "rel": ""},
    {"name": "Aleksander Sadikov", "aliases": ["Aleksander Sadikov"], "rel": ""},
    {"name": "P Maiti", "aliases": ["P Maiti"], "rel": ""},
    {"name": "S Chanda", "aliases": ["S Chanda"], "rel": ""},
    {"name": "Subhadip Chandra", "aliases": ["S Chandra", "Subhadip Chandra"], "rel": "Past Colleague"},
    {"name": "Deepsubhra Guha Roy", "aliases": ["D Guha Roy", "Deepsubhra Guha Roy"], "rel": "Past Colleague"},
    {"name": "Chandrima Das", "aliases": ["C Das", "Chandrima Das"], "rel": "Student (UG / project)"},
    {"name": "Rangan Satpathi", "aliases": ["R Satpathi", "Rangan Satpathi"], "rel": "Student (UG / project)"},
    {"name": "Mousumi Laha", "aliases": ["M Laha", "Mousumi Laha"], "rel": "Past Colleague"},
    {"name": "P Sarkar", "aliases": ["P Sarkar"], "rel": ""},
    {"name": "Kalpita Dutta", "aliases": ["K Dutta", "Kalpita Dutta"], "rel": "Fellow research scholar"},
    {"name": "Malyaban Bal", "aliases": ["M Bal", "Malyaban Bal"], "rel": "Student (UG / project)"},
    {"name": "Arpita Basak", "aliases": ["A Basak", "Arpita Basak"], "rel": "Student (UG / project)"},
    {"name": "Arnald Dutta", "aliases": ["A Dutta", "Arnald Dutta"], "rel": "Student (UG / project)"},
    {"name": "Ishita Das", "aliases": ["I Das", "Ishita Das"], "rel": "Student (Master's)"},
    {"name": "Ujjwal Maulik", "aliases": ["Ujjwal Maulik", "U Maulik"], "rel": "Senior collaborator"},
    {"name": "Soumyajyoti Dey", "aliases": ["S Dey", "Soumyajyoti Dey"], "rel": "Fellow research scholar"},
    {"name": "S Mitra", "aliases": ["S Mitra"], "rel": "Senior collaborator"},
    {"name": "S Chakrabarty", "aliases": ["S Chakrabarty"], "rel": ""},
    {"name": "P Shaw", "aliases": ["P Shaw"], "rel": ""},
    {"name": "S Chowdhury", "aliases": ["S Chowdhury"], "rel": ""},
    {"name": "A Das", "aliases": ["A Das"], "rel": "Student (Master's)"}
  ],
  extraStudents: []
};
