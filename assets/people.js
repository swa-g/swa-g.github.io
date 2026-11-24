/* People shown in the "People I have worked with" section. Generated from coauthors-review.xlsx, then hand-editable.

   Each card shows: photo (if `photo` is set, otherwise initials), name, and current affiliation (`org`):
     org: { pos: "Professor", name: "Jadavpur University", abbr: "JU", city: "Kolkata", country: "India" }
   The position is highlighted; "University (ABBR), City, Country" is shown below it in smaller type.
   Leave `pos` null for people without a position, and leave out `org` when the affiliation is unknown.
   - `rel` only decides WHICH GROUP and in what order the person appears (see `groups`); it is not displayed.
   - `aliases` are the spellings used in the paper author lists, so the same person is merged into one entry.
   - `linkedin`: profile address (https://www.linkedin.com/in/...). When set, the whole card becomes a link to it.
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
    {"name": "Nibaran Das", "aliases": ["Nibaran Das", "N Das"], "rel": "Supervisor", "org": {"pos": "Professor", "name": "Jadavpur University", "abbr": "JU", "city": "Kolkata", "country": "India"}, "photo": "assets/people/nibaran-das.jpg"},
    {"name": "Mita Nasipuri", "aliases": ["Mita Nasipuri", "M Nasipuri"], "rel": "Senior collaborator", "org": {"pos": "Professor", "name": "Jadavpur University", "abbr": "JU", "city": "Kolkata", "country": "India"}, "photo": "assets/people/mita-nasipuri.jpg"},
    {"name": "KC Santosh", "aliases": ["KC Santosh"], "rel": "Senior collaborator", "org": {"pos": "Professor & Department Chair", "name": "University of South Dakota", "abbr": "USD", "city": "Vermillion", "country": "USA"}, "photo": "assets/people/kc-santosh.jpg"},
    {"name": "Teresa Gonçalves", "aliases": ["Teresa Gonçalves", "T Goncalves", "T Gonçalves"], "rel": "Co-supervisor", "org": {"pos": "Associate Professor", "name": "Universidade de Évora", "abbr": "UÉvora", "city": "Évora", "country": "Portugal"}, "photo": "assets/people/teresa-goncalves.jpg"},
    {"name": "Paulo Quaresma", "aliases": ["Paulo Quaresma", "P Quaresma"], "rel": "Senior collaborator", "org": {"pos": "Full Professor", "name": "Universidade de Évora", "abbr": "UÉvora", "city": "Évora", "country": "Portugal"}, "photo": "assets/people/paulo-quaresma.jpg"},
    {"name": "Bodhisatwa Mandal", "aliases": ["B Mandal", "Bodhisatwa Mandal"], "rel": "Student (UG / project)", "org": {"pos": "SDE 2", "name": "Amazon", "abbr": null, "city": "Bengaluru", "country": "India"}, "photo": "assets/people/bodhisatwa-mandal.jpg"},
    {"name": "Ritesh Sarkhel", "aliases": ["R Sarkhel", "Ritesh Sarkhel"], "rel": "Fellow research scholar", "org": {"pos": "Assistant Professor", "name": "Indian Institute of Technology Kharagpur", "abbr": "IIT KGP", "city": "Kharagpur", "country": "India"}, "photo": "assets/people/ritesh-sarkhel.jpg"},
    {"name": "Branko Šter", "aliases": ["Branko Šter", "B Šter"], "rel": "Supervisor", "org": {"pos": "Professor", "name": "University of Ljubljana", "abbr": "UL", "city": "Ljubljana", "country": "Slovenia"}, "photo": "assets/people/branko-ster.jpg"},
    {"name": "Mahantapas Kundu", "aliases": ["Mahantapas Kundu", "M Kundu"], "rel": "Senior collaborator", "org": {"pos": "Professor", "name": "Jadavpur University", "abbr": "JU", "city": "Kolkata", "country": "India"}, "photo": "assets/people/mahantapas-kundu.jpg"},
    {"name": "Utathya Aich", "aliases": ["U Aich", "Utathya Aich"], "rel": "Industry / other", "org": {"pos": null, "name": "CNH Industrial ITC", "abbr": null, "city": null, "country": "India"}, "photo": "assets/people/utathya-aich.jpg"},
    {"name": "Tulika Saha", "aliases": ["T Saha", "Tulika Saha"], "rel": "Collaborator", "org": {"pos": "Assistant Professor", "name": "International Institute of Information Technology Bangalore", "abbr": "IIIT-B", "city": "Bengaluru", "country": "India"}, "linkedin": "https://www.linkedin.com/in/tulika-saha-2547a4187/", "photo": "assets/people/tulika-saha.jpg"},
    {"name": "S Das", "aliases": ["S Das"], "rel": ""},
    {"name": "Soumya Ukil", "aliases": ["S Ukil", "Soumya Ukil"], "rel": "Student (UG / project)", "org": {"pos": "Software Engineer", "name": "Google", "abbr": null, "city": "San Francisco", "country": "USA"}, "photo": "assets/people/soumya-ukil.jpg"},
    {"name": "SM Obaidullah", "aliases": ["SM Obaidullah"], "rel": ""},
    {"name": "K Roy", "aliases": ["K Roy"], "rel": ""},
    {"name": "Anisha Pal", "aliases": ["A Pal", "Anisha Pal"], "rel": "Student (UG / project)", "org": {"pos": "ML Engineer", "name": "Planette AI", "abbr": null, "city": "San Francisco", "country": "USA"}, "photo": "assets/people/anisha-pal.jpg"},
    {"name": "Shourya Jaiswal", "aliases": ["S Jaiswal", "Shourya Jaiswal"], "rel": "Student (UG / project)", "org": {"pos": "Security Engineer", "name": "Rubrik Inc", "abbr": null, "city": null, "country": null}, "photo": "assets/people/shourya-jaiswal.jpg"},
    {"name": "Suvam Dubey", "aliases": ["S Dubey", "Suvam Dubey"], "rel": "Student (UG / project)", "hide": true},
    {"name": "Sandipan Choudhuri", "aliases": ["S Choudhuri", "Sandipan Choudhuri"], "rel": "Student (Master's)", "org": {"pos": "Senior Data Scientist", "name": "Interbiz Arizona", "abbr": null, "city": null, "country": "USA"}, "linkedin": "https://www.linkedin.com/in/sandipan-choudhuri-760aa7125", "photo": "assets/people/sandipan-choudhuri.jpg"},
    {"name": "David Muhič", "aliases": ["David Muhič"], "rel": "Student (UG / project)", "org": {"pos": "Student", "name": "University of Ljubljana, Faculty of Computer and Information Science", "abbr": "UL FRI", "city": "Ljubljana", "country": "Slovenia"}, "photo": "assets/people/david-muhic.jpg"},
    {"name": "David Calhas", "aliases": ["David Calhas"], "rel": "Present Colleague", "org": {"pos": "MSCA Postdoctoral Fellow", "name": "University of Ljubljana, Faculty of Computer and Information Science", "abbr": "UL FRI", "city": "Ljubljana", "country": "Slovenia"}, "photo": "assets/people/david-calhas.jpg"},
    {"name": "Vida Groznik", "aliases": ["Vida Groznik"], "rel": ""},
    {"name": "Dejan Georgiev", "aliases": ["Dejan Georgiev"], "rel": ""},
    {"name": "Aleksander Sadikov", "aliases": ["Aleksander Sadikov"], "rel": ""},
    {"name": "P Maiti", "aliases": ["P Maiti"], "rel": ""},
    {"name": "S Chanda", "aliases": ["S Chanda"], "rel": ""},
    {"name": "Subhadip Chandra", "aliases": ["S Chandra", "Subhadip Chandra"], "rel": "Past Colleague", "org": {"pos": "Assistant Professor", "name": "Institute of Engineering & Management", "abbr": "IEM", "city": "Kolkata", "country": "India"}, "photo": "assets/people/subhadip-chandra.jpg"},
    {"name": "Deepsubhra Guha Roy", "aliases": ["D Guha Roy", "Deepsubhra Guha Roy"], "rel": "Past Colleague", "org": {"pos": "Associate Professor", "name": "Institute of Engineering & Management", "abbr": "IEM", "city": "Kolkata", "country": "India"}, "photo": "assets/people/deepsubhra-guha-roy.jpg"},
    {"name": "Chandrima Das", "aliases": ["C Das", "Chandrima Das"], "rel": "Student (UG / project)", "org": {"pos": "AI Engineer", "name": "San Diego Supercomputer Center", "abbr": "SDSC", "city": "San Diego", "country": "USA"}, "photo": "assets/people/chandrima-das.jpg"},
    {"name": "Rangan Satpathi", "aliases": ["R Satpathi", "Rangan Satpathi"], "rel": "Student (UG / project)", "org": {"pos": "Data Engineer", "name": "Cognizant", "abbr": null, "city": null, "country": "India"}, "photo": "assets/people/rangan-satpathi.jpg"},
    {"name": "Mousumi Laha", "aliases": ["M Laha", "Mousumi Laha"], "rel": "Past Colleague", "org": {"pos": "Associate Professor", "name": "Institute of Engineering & Management", "abbr": "IEM", "city": "Kolkata", "country": "India"}, "photo": "assets/people/mousumi-laha.jpg"},
    {"name": "P Sarkar", "aliases": ["P Sarkar"], "rel": ""},
    {"name": "Kalpita Dutta", "aliases": ["K Dutta", "Kalpita Dutta"], "rel": "Fellow research scholar", "org": {"pos": "Head of Department, CSE", "name": "Techno India University", "abbr": "TIU", "city": "Kolkata", "country": "India"}, "photo": "assets/people/kalpita-dutta.jpg"},
    {"name": "Malyaban Bal", "aliases": ["M Bal", "Malyaban Bal"], "rel": "Student (UG / project)", "org": {"pos": "Senior Machine Learning Engineer", "name": "Waymo", "abbr": null, "city": "Mountain View, California", "country": "USA"}, "photo": "assets/people/malyaban-bal.jpg"},
    {"name": "Arpita Basak", "aliases": ["A Basak", "Arpita Basak"], "rel": "Student (UG / project)", "org": {"pos": "Senior Software Engineer", "name": "Oracle", "abbr": null, "city": null, "country": null}, "photo": "assets/people/arpita-basak.jpg"},
    {"name": "Arnald Dutta", "aliases": ["A Dutta", "Arnald Dutta"], "rel": "Student (UG / project)", "hide": true},
    {"name": "Ishita Das", "aliases": ["I Das", "Ishita Das"], "rel": "Student (Master's)", "org": {"pos": "Software Engineer", "name": "HashedIn by Deloitte", "abbr": null, "city": "Kolkata", "country": "India"}, "photo": "assets/people/ishita-das.jpg"},
    {"name": "Ujjwal Maulik", "aliases": ["Ujjwal Maulik", "U Maulik"], "rel": "Senior collaborator", "org": {"pos": "Professor", "name": "Jadavpur University", "abbr": "JU", "city": "Kolkata", "country": "India"}, "photo": "assets/people/ujjwal-maulik.jpg"},
    {"name": "Soumyajyoti Dey", "aliases": ["S Dey", "Soumyajyoti Dey"], "rel": "Fellow research scholar", "org": {"pos": "Assistant Professor (Senior Grade 1)", "name": "Vellore Institute of Technology", "abbr": "VIT", "city": "Vellore", "country": "India"}, "linkedin": "https://www.linkedin.com/in/soumyajyoti-dey-24202b136/", "photo": "assets/people/soumyajyoti-dey.jpg"},
    {"name": "S Mitra", "aliases": ["S Mitra"], "rel": "Senior collaborator", "hide": true},
    {"name": "S Chakrabarty", "aliases": ["S Chakrabarty"], "rel": ""},
    {"name": "P Shaw", "aliases": ["P Shaw"], "rel": ""},
    {"name": "S Chowdhury", "aliases": ["S Chowdhury"], "rel": ""},
    {"name": "Aritra Das", "aliases": ["A Das", "Aritra Das"], "rel": "Student (Master's)", "org": {"pos": "Scientist D", "name": "Centre for Development of Telematics", "abbr": "C-DOT", "city": "New Delhi", "country": "India"}, "photo": "assets/people/aritra-das.jpg"},
    {"name": "Deepan Sadhukhan", "aliases": ["D Sadhukhan", "Deepan Sadhukhan"], "rel": "Student (UG / project)", "org": {"pos": "UG Student", "name": "Institute of Engineering & Management", "abbr": "IEM", "city": "Kolkata", "country": "India"}, "photo": "assets/people/deepan-sadhukhan.jpg"},
    {"name": "Shinjini Chakraborty", "aliases": ["S Chakraborty", "Shinjini Chakraborty"], "rel": "Student (UG / project)", "org": {"pos": "UG Student", "name": "Institute of Engineering & Management", "abbr": "IEM", "city": "Kolkata", "country": "India"}, "photo": "assets/people/shinjini-chakraborty.jpg"}
  ]
};
