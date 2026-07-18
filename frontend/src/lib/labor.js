// Bundled labor-market snapshot — open, commercial-clean sources, on-device.
// Occupations carry O*NET-style key skills (importance 1–5), RIASEC interest
// codes, and a BLS outlook (median annual wage + 2022–32 projected growth %).
// This is a curated SNAPSHOT, not a live feed — labelled as such in the UI and
// refreshable from the free BLS API later. Nothing here leaves the device.
//
// Sources: O*NET 30.x (CC BY 4.0) for skills + RIASEC; BLS Employment
// Projections / OEWS (public domain) for wage + growth. Figures are rounded
// representative values for guidance, never exact payroll advice.

// RIASEC (Holland) interest codes used for interest↔role fit.
export const RIASEC = {
  R: 'Realistic — hands-on, building, doing',
  I: 'Investigative — analyzing, researching',
  A: 'Artistic — creating, expressing',
  S: 'Social — helping, teaching',
  E: 'Enterprising — leading, persuading',
  C: 'Conventional — organizing, detail',
}

// A canonical, deduplicated skill vocabulary the occupations draw from. Keeping
// names shared lets us match a user's skills to many roles cleanly.
export const SKILLS = [
  'Programming', 'Data analysis', 'Systems thinking', 'Problem solving',
  'Project management', 'Communication', 'Writing', 'Public speaking',
  'Design', 'Visual design', 'UX research', 'Product sense',
  'Sales', 'Negotiation', 'Marketing', 'Financial analysis', 'Accounting',
  'Leadership', 'People management', 'Mentoring', 'Strategy',
  'Research methods', 'Statistics', 'Machine learning', 'Cloud infrastructure',
  'Teaching', 'Curriculum design', 'Counseling', 'Active listening', 'Empathy',
  'Clinical assessment', 'Patient care', 'Lab techniques', 'Attention to detail',
  'Mechanical skills', 'Electrical systems', 'Operations', 'Logistics',
  'Customer service', 'Legal reasoning', 'Editing', 'Storytelling',
]

// field is used for grouping/colour; jobZone 1–5 = O*NET preparation level.
export const OCCUPATIONS = [
  // ---- Technology ----
  { code: '15-1252', title: 'Software Developer', field: 'Technology', jobZone: 4, riasec: ['I', 'C'], wage: 132270, growth: 25,
    skills: [['Programming', 5], ['Problem solving', 4.5], ['Systems thinking', 4], ['Communication', 3.5], ['Cloud infrastructure', 3.5]],
    related: ['Data Scientist', 'Product Manager', 'UX Designer'] },
  { code: '15-2051', title: 'Data Scientist', field: 'Technology', jobZone: 4, riasec: ['I', 'C'], wage: 108020, growth: 35,
    skills: [['Data analysis', 5], ['Statistics', 4.5], ['Machine learning', 4.5], ['Programming', 4], ['Communication', 3.5]],
    related: ['Software Developer', 'Data Analyst', 'Research Scientist'] },
  { code: '15-2041', title: 'Data Analyst', field: 'Technology', jobZone: 4, riasec: ['C', 'I'], wage: 82360, growth: 23,
    skills: [['Data analysis', 5], ['Statistics', 4], ['Communication', 4], ['Attention to detail', 4], ['Programming', 3]],
    related: ['Data Scientist', 'Financial Analyst', 'Product Manager'] },
  { code: '15-1255', title: 'UX Designer', field: 'Technology', jobZone: 4, riasec: ['A', 'I'], wage: 98540, growth: 16,
    skills: [['UX research', 5], ['Visual design', 4.5], ['Product sense', 4], ['Communication', 4], ['Design', 4]],
    related: ['Product Manager', 'Software Developer', 'Graphic Designer'] },
  { code: '11-2021', title: 'Product Manager', field: 'Technology', jobZone: 4, riasec: ['E', 'I'], wage: 140000, growth: 19,
    skills: [['Product sense', 5], ['Strategy', 4.5], ['Communication', 4.5], ['Leadership', 4], ['Data analysis', 3.5]],
    related: ['UX Designer', 'Software Developer', 'Marketing Manager'] },

  // ---- Healthcare ----
  { code: '29-1141', title: 'Registered Nurse', field: 'Healthcare', jobZone: 3, riasec: ['S', 'I'], wage: 86070, growth: 6,
    skills: [['Patient care', 5], ['Clinical assessment', 4.5], ['Empathy', 4.5], ['Communication', 4], ['Attention to detail', 4]],
    related: ['Nurse Practitioner', 'Physician Assistant', 'Therapist'] },
  { code: '29-1171', title: 'Nurse Practitioner', field: 'Healthcare', jobZone: 5, riasec: ['I', 'S'], wage: 126260, growth: 38,
    skills: [['Clinical assessment', 5], ['Patient care', 4.5], ['Communication', 4], ['Empathy', 4], ['Research methods', 3.5]],
    related: ['Registered Nurse', 'Physician Assistant'] },
  { code: '21-1014', title: 'Mental Health Counselor', field: 'Healthcare', jobZone: 5, riasec: ['S', 'A'], wage: 53710, growth: 18,
    skills: [['Counseling', 5], ['Active listening', 5], ['Empathy', 5], ['Communication', 4], ['Clinical assessment', 3.5]],
    related: ['Clinical Psychologist', 'Social Worker', 'Registered Nurse'] },
  { code: '19-3033', title: 'Clinical Psychologist', field: 'Healthcare', jobZone: 5, riasec: ['I', 'S'], wage: 92740, growth: 6,
    skills: [['Clinical assessment', 5], ['Research methods', 4.5], ['Counseling', 4.5], ['Empathy', 4], ['Writing', 3.5]],
    related: ['Mental Health Counselor', 'Social Worker'] },
  { code: '21-1021', title: 'Social Worker', field: 'Healthcare', jobZone: 4, riasec: ['S', 'E'], wage: 58380, growth: 7,
    skills: [['Active listening', 5], ['Empathy', 4.5], ['Communication', 4], ['Counseling', 4], ['Project management', 3]],
    related: ['Mental Health Counselor', 'Clinical Psychologist'] },

  // ---- Business & Finance ----
  { code: '13-2051', title: 'Financial Analyst', field: 'Business', jobZone: 4, riasec: ['C', 'E'], wage: 99890, growth: 8,
    skills: [['Financial analysis', 5], ['Data analysis', 4], ['Attention to detail', 4], ['Communication', 3.5], ['Statistics', 3.5]],
    related: ['Accountant', 'Data Analyst', 'Operations Manager'] },
  { code: '13-2011', title: 'Accountant', field: 'Business', jobZone: 4, riasec: ['C', 'E'], wage: 79880, growth: 4,
    skills: [['Accounting', 5], ['Attention to detail', 4.5], ['Financial analysis', 4], ['Communication', 3], ['Data analysis', 3]],
    related: ['Financial Analyst', 'Operations Manager'] },
  { code: '11-2021b', title: 'Marketing Manager', field: 'Business', jobZone: 4, riasec: ['E', 'A'], wage: 157620, growth: 7,
    skills: [['Marketing', 5], ['Strategy', 4.5], ['Communication', 4.5], ['Leadership', 4], ['Data analysis', 3.5]],
    related: ['Product Manager', 'Sales Manager', 'Content Strategist'] },
  { code: '11-1021', title: 'Operations Manager', field: 'Business', jobZone: 4, riasec: ['E', 'C'], wage: 101280, growth: 6,
    skills: [['Operations', 5], ['Leadership', 4.5], ['Project management', 4], ['Logistics', 4], ['People management', 4]],
    related: ['Project Manager', 'Financial Analyst'] },
  { code: '11-9199', title: 'Project Manager', field: 'Business', jobZone: 4, riasec: ['E', 'C'], wage: 95370, growth: 7,
    skills: [['Project management', 5], ['Communication', 4.5], ['Leadership', 4], ['People management', 3.5], ['Strategy', 3.5]],
    related: ['Operations Manager', 'Product Manager'] },

  // ---- Education ----
  { code: '25-2021', title: 'Teacher (K–12)', field: 'Education', jobZone: 4, riasec: ['S', 'A'], wage: 63670, growth: 1,
    skills: [['Teaching', 5], ['Curriculum design', 4], ['Communication', 4.5], ['Empathy', 4], ['Active listening', 3.5]],
    related: ['Instructional Designer', 'School Counselor', 'Professor'] },
  { code: '25-9031', title: 'Instructional Designer', field: 'Education', jobZone: 4, riasec: ['A', 'I'], wage: 74620, growth: 7,
    skills: [['Curriculum design', 5], ['Writing', 4], ['UX research', 3.5], ['Communication', 4], ['Design', 3.5]],
    related: ['Teacher (K–12)', 'Content Strategist', 'UX Designer'] },

  // ---- Creative & Media ----
  { code: '27-1024', title: 'Graphic Designer', field: 'Creative', jobZone: 3, riasec: ['A', 'R'], wage: 57990, growth: 3,
    skills: [['Visual design', 5], ['Design', 4.5], ['Communication', 3.5], ['Storytelling', 3], ['Attention to detail', 4]],
    related: ['UX Designer', 'Content Strategist'] },
  { code: '27-3042', title: 'Content Strategist', field: 'Creative', jobZone: 4, riasec: ['A', 'E'], wage: 73690, growth: 4,
    skills: [['Writing', 5], ['Storytelling', 4.5], ['Editing', 4], ['Marketing', 3.5], ['Communication', 4]],
    related: ['Marketing Manager', 'Graphic Designer', 'Instructional Designer'] },
  { code: '27-3023', title: 'Writer / Editor', field: 'Creative', jobZone: 4, riasec: ['A', 'I'], wage: 73150, growth: 4,
    skills: [['Writing', 5], ['Editing', 4.5], ['Storytelling', 4], ['Research methods', 3.5], ['Attention to detail', 4]],
    related: ['Content Strategist', 'Marketing Manager'] },

  // ---- Science & Engineering ----
  { code: '17-2141', title: 'Mechanical Engineer', field: 'Engineering', jobZone: 4, riasec: ['R', 'I'], wage: 96310, growth: 10,
    skills: [['Problem solving', 5], ['Systems thinking', 4.5], ['Mechanical skills', 4.5], ['Attention to detail', 4], ['Data analysis', 3.5]],
    related: ['Electrical Engineer', 'Operations Manager'] },
  { code: '17-2071', title: 'Electrical Engineer', field: 'Engineering', jobZone: 4, riasec: ['R', 'I'], wage: 106950, growth: 5,
    skills: [['Electrical systems', 5], ['Problem solving', 4.5], ['Systems thinking', 4], ['Attention to detail', 4], ['Programming', 3]],
    related: ['Mechanical Engineer', 'Software Developer'] },
  { code: '19-1042', title: 'Research Scientist', field: 'Science', jobZone: 5, riasec: ['I', 'R'], wage: 99930, growth: 10,
    skills: [['Research methods', 5], ['Statistics', 4.5], ['Lab techniques', 4.5], ['Writing', 4], ['Data analysis', 4]],
    related: ['Data Scientist', 'Clinical Psychologist'] },

  // ---- Trades & Operations ----
  { code: '47-2111', title: 'Electrician', field: 'Trades', jobZone: 3, riasec: ['R', 'C'], wage: 60240, growth: 6,
    skills: [['Electrical systems', 5], ['Mechanical skills', 4], ['Problem solving', 4], ['Attention to detail', 4], ['Customer service', 3]],
    related: ['Electrical Engineer', 'Operations Manager'] },
  { code: '13-1081', title: 'Logistics Coordinator', field: 'Trades', jobZone: 3, riasec: ['C', 'E'], wage: 48780, growth: 5,
    skills: [['Logistics', 5], ['Operations', 4], ['Communication', 3.5], ['Attention to detail', 4], ['Customer service', 3.5]],
    related: ['Operations Manager', 'Project Manager'] },

  // ---- Sales & Community ----
  { code: '41-3091', title: 'Sales Representative', field: 'Business', jobZone: 3, riasec: ['E', 'S'], wage: 65420, growth: 4,
    skills: [['Sales', 5], ['Negotiation', 4.5], ['Communication', 4.5], ['Customer service', 4], ['Active listening', 3.5]],
    related: ['Marketing Manager', 'Operations Manager'] },
  { code: '23-1011', title: 'Lawyer', field: 'Legal', jobZone: 5, riasec: ['E', 'I'], wage: 135740, growth: 8,
    skills: [['Legal reasoning', 5], ['Writing', 4.5], ['Negotiation', 4], ['Research methods', 4], ['Public speaking', 4]],
    related: ['Financial Analyst', 'Operations Manager'] },
]

export const OCC_BY_TITLE = Object.fromEntries(OCCUPATIONS.map((o) => [o.title, o]))

// Demand percentile: map a BLS growth % onto 0–1 against the bundled range, so a
// fast-growing field reads "hot" and a flat one reads "soft" — used in readiness.
const GROWTHS = OCCUPATIONS.map((o) => o.growth)
const G_MIN = Math.min(...GROWTHS), G_MAX = Math.max(...GROWTHS)
export const demand01 = (growth) => (G_MAX === G_MIN ? 0.5 : (growth - G_MIN) / (G_MAX - G_MIN))

// A gentle plain-language label for an outlook growth number.
export function outlookLabel(growth) {
  if (growth >= 20) return 'growing fast'
  if (growth >= 10) return 'growing strongly'
  if (growth >= 5) return 'growing steadily'
  if (growth >= 2) return 'holding steady'
  return 'slow growth'
}

export const fmtWage = (w) => '$' + Math.round(w / 1000) + 'k'
