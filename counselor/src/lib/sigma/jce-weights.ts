// AUTO-GENERATED from JCE_Education_Job_Group_Engine.xlsx — the JCE-compatible
// engine: 34 Basic Interest scales -> 30 Job Groups + 17 Education Groups via
// profile-similarity (Pearson) weighting. Bands per the manual lookup table.

export const JCE_SCALES: string[] = ["Adventure", "Authoritarian Leadership", "Author-Journalism", "Business", "Consulting", "Creative Arts", "Elementary Education", "Engineering", "Family Activity", "Finance", "Law", "Life Science", "Mathematics", "Mediation & Persuasion", "Medical Service", "Nature-Agriculture", "Office Work", "Performing Arts", "Personal Service", "Physical Science", "Sales", "Skilled Trades", "Social Science", "Social Service", "Supervising Others", "Teaching", "Technical Writing", "Academic Achievement", "Accountability", "Endurance", "Independence", "Interpersonal Confidence", "Job Security", "Organization"];

export const JOB_WEIGHTS: Record<string, number[]> = {
  'Medical Diagnosis & Treatment': [0, 0, -4, 0, -5, 0, 0, 4, 0, -5, -5, 5, 4, -3, 5, 4, -4, 0, 0, 5, 0, 0, 3, 0, -4, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Sales & Business Development': [0, 0, 0, 5, 4, -5, 0, 0, 0, 5, 3, -3, -5, 4, 0, -4, 3, 0, 0, -4, 5, 0, -5, 0, 4, 0, 0, 0, 0, -4, 0, 0, 0, 0],
  'Protective Services & Public Safety': [5, 5, 0, 0, 0, -5, -4, 4, 0, 0, 4, 0, -5, 0, 0, 0, 0, -5, 0, 0, 0, 5, 0, 0, 0, -4, -4, 0, 0, 0, 0, 0, 0, 0],
  'Information Technology & Computers': [0, 0, -5, -5, 0, 0, 0, 5, 0, 0, 0, 0, 5, -4, 0, 0, 0, 0, 0, 5, -4, 4, 0, -4, 0, 0, -5, 0, 0, 4, 0, 0, 0, 0],
  'Communications & Writing': [0, -5, 5, 0, 0, 0, 0, -4, 0, 0, 0, 0, -3, 0, -5, 0, 0, 5, -5, 0, 0, -3, 4, 0, 0, 0, 5, 0, -4, 0, 4, 0, -4, 0],
  'Financial & Business Services': [-5, 0, 0, 5, 4, -4, 0, 0, 0, 5, 4, -3, 0, 0, -3, -4, 5, -5, 0, 0, 3, 0, -4, -5, 4, 0, 0, 0, 0, 0, 0, 0, 0, 3],
  'Mathematics': [0, 0, -5, -4, -4, 0, 0, 5, 0, 0, -5, 4, 5, -3, 0, 0, 0, 0, -3, 5, -4, 0, 0, -3, -5, 0, 0, 0, 0, 4, 0, 0, 0, 0],
  'Law & Government': [0, 0, 4, 0, 3, -3, 0, 0, -4, 5, 5, -5, -4, 5, -5, -5, -3, 0, 0, 0, -3, -4, 0, 0, 4, 0, 4, 0, 0, 0, 0, 3, 0, 0],
  'Health Services': [0, 0, -3, -5, -5, 0, 0, 0, 1, -5, -4, 5, 0, -4, 5, 5, 0, -3, 0, 0, 0, 0, 0, 0, 0, 0, -4, 0, 0, 0, 0, 0, 0, 0],
  'Career & Guidance Counseling': [-3, 0, 0, 0, 4, -4, 4, -4, 0, 0, 0, -5, 0, 5, 0, -5, 0, 0, 0, -5, 0, -4, 0, 5, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  'Engineering & Technical Support': [4, 4, -4, 0, 0, 0, -4, 5, 0, 0, 0, 0, 5, -5, 0, 0, 0, 0, 0, 4, -5, 5, 0, -4, 0, -5, 0, 0, 0, 3, 0, 0, 3, 0],
  'Social Science & Research': [-4, 0, 5, 0, 0, 0, 3, -5, -4, 0, 0, 0, 0, 0, 0, -5, 0, 0, -4, 0, 0, -3, 5, 0, 0, 4, 5, 0, -5, 0, 4, 4, 0, 0],
  'Human Resources': [-5, 0, 0, 5, 5, 0, 0, 0, -5, 4, 9, -3, -4, 4, -4, -3, 0, 0, 0, -4, 0, 0, 0, 0, 3, 0, 0, 0, 0, -5, 0, 3, 0, 0],
  'Physical Science & Research': [0, 0, 0, -4, -4, 0, 0, 4, 0, 0, -5, 5, 5, -3, 0, 0, 0, 0, 0, 5, -4, 0, 0, -5, -5, 0, 0, 0, 0, 4, 0, 0, 0, 0],
  'Construction': [4, 0, -4, 0, 0, 5, 0, 5, 4, 0, -5, 0, 0, -5, 0, 4, 0, 0, 0, 0, 0, 5, 0, 0, 0, -4, -4, 0, 0, 0, 0, -5, 3, 0],
  'Social Service & Mental Health': [-4, 0, -3, 0, 0, 0, 0, 0, 0, 0, 0, 0, -3, 0, 0, -5, 0, -3, -5, 0, 0, -5, 5, 5, 0, 1, 4, 0, 0, 0, 0, 0, 0, 0],
  'Nature, Agriculture & Environment': [0, 0, -5, 0, 0, 0, 0, 0, 5, -4, -5, 4, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, -5, 0, 4, 0, 0, 0, 0, 0],
  'Physical Health & Recreation': [0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, -5, 0, 5, 4, 0, 0, 0, -4, 0, 0, -5, 0, 0, 0, 0, 0, 0, -4, 0, 0, 0, 0],
  'Merchandising & Marketing': [0, -4, 4, 5, 4, 0, 0, -4, 0, 4, 0, -5, 0, 0, -5, -5, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, -4, 3],
  'Entertainment': [0, 0, 5, 0, -5, 5, 0, 0, 0, -4, 0, 0, -3, 0, 0, 0, -5, 5, 0, 0, 0, 0, 0, 0, -4, 0, 0, -5, 0, 0, 0, 4, 0, -4],
  'Teaching & Instruction': [-5, 0, 0, 0, 0, 0, 5, -4, 0, 0, 0, -5, 0, 4, -5, 0, 4, 0, 0, -4, 0, 0, 0, 5, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  'Music': [0, 0, 0, 0, 0, 5, 4, 0, 0, -5, -5, 0, 0, 0, -4, 0, 0, 5, 5, 0, 0, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Commercial Art & Design': [0, 0, 5, 0, -5, 5, 0, 0, 0, 0, -5, 0, 0, 0, 0, 0, -4, 5, 0, 4, 0, 0, 0, -5, -4, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Fine Art': [0, 0, 4, 0, -5, 5, 0, 0, 0, -4, -5, 4, 0, 0, 0, 5, 0, 5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Service & Hospitality': [0, 0, -5, 4, 0, 0, 4, -5, 5, 0, 0, -5, 0, 0, 0, 0, 5, 0, 5, -4, 0, 4, 0, -4, 0, 0, -4, 0, 0, 0, 0, 0, 0, 0],
  'Life Science & Research': [4, 0, -4, -5, -4, 0, 0, 4, 0, 0, -5, 5, 3, -4, 5, 4, 0, 0, 0, 5, -5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Clerical & Administrative Support': [-4, 0, 0, 5, 4, 0, 0, -5, 0, 5, 0, -3, 0, 0, -3, -4, 5, 0, 0, -4, 4, 0, -5, 0, 4, 0, 0, 0, 0, -5, 0, 0, 0, 3],
  'Management & Administration': [-5, 0, 0, 4, 4, -3, 0, -4, 0, 4, 5, -3, -5, 5, -4, -5, 0, 0, 0, -3, 0, -4, 0, 0, 5, 0, 0, 0, 0, 0, 0, 3, 0, 0],
  'Machining & Mechanical Trades': [4, 0, -4, 0, 0, 4, 0, 5, 0, 0, -5, 0, 5, -4, -5, 0, 0, 0, 0, 4, 0, 5, 0, -5, 0, -3, 0, 0, 0, 0, 0, -4, 3, 0],
  'Primary Education': [0, 0, 0, 0, 0, 0, 5, 0, 0, -5, 0, 0, 0, 0, -5, 0, 4, 0, 4, 0, 0, 0, -5, 5, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0],
};

export const EDU_WEIGHTS: Record<string, number[]> = {
  'Education': [0, 0, 0, 0, 0, 0, 5, -5, 0, -5, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, -4, -5, 0, 5, 0, 5, 0, 4, 0, 0, 0, 0, 0, 0],
  'Performing Arts': [0, 0, 5, 0, 0, 5, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, -5, -4],
  'Social Service': [0, 0, 0, 0, 4, 0, 0, -5, 0, -5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, -4, -5, 4, 5, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  'Health, Physical Education & Recreation': [5, 4, 0, 0, 0, 0, 0, 0, 0, -5, 0, 5, 0, 0, 5, 0, -5, 0, 0, 0, 0, 0, 0, 4, 0, 0, -5, 0, 0, 0, 0, 0, 0, 0],
  'Communication Arts': [0, 0, 5, 0, 0, 4, 0, -5, 0, 0, 0, 0, 0, 0, 0, 0, -5, 5, 0, 0, 0, -5, 4, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0],
  'Behavioral Science': [0, 0, 0, -5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -5, -5, 5, 5, 0, 5, 4, 4, 0, 0, 0, 0, 0, 0],
  'Art & Architecture': [0, 0, 0, 0, 0, 5, 0, 5, 0, -5, 0, 0, 4, 0, -5, 0, 0, 0, 0, 5, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0],
  'Business': [0, 0, 0, 5, 4, 0, 0, 0, 0, 5, 0, -5, 0, 0, 0, 0, 0, 0, 0, -5, 5, 0, 0, -5, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4],
  'Social Science, Law & Politics': [0, 0, 0, 0, 0, 0, 0, -5, 0, 0, 5, 0, 0, 5, -5, 0, 0, 0, 0, 0, 0, -5, 5, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0],
  'Environmental Resource Management': [4, 0, 0, 0, 0, 0, 0, 0, 0, -5, 0, 5, 0, 0, 0, 5, -5, 0, 0, 5, -5, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0],
  'Computer Science': [0, 0, 0, 0, 0, 0, -5, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, -5, 0, 5, 0, 0, 0, -5, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0],
  'Mathematical Science': [0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, -5, 0, 5, -5, 0, 0, -5, 0, 0, 0, 4, 0, 4, 0, 0, 0, 0],
  'Food Science': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -5, 5, 0, 0, 4, 5, 0, -5, 0, 5, -5, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0],
  'Engineering': [0, 0, 0, 0, 0, 0, -5, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, -5, 0, 5, 0, 4, 0, -5, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0],
  'Agribusiness & Economics': [0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 4, 0, -5, 5, 0, -5, 0, 0, 0, 0, 0, -5, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0],
  'Health Services & Science': [0, 0, 0, -5, 0, -5, 0, 0, 0, 0, 0, 5, 0, 0, 5, 0, 0, 0, 0, 5, -5, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0],
  'Science': [0, 0, 0, -5, 0, 0, 0, 4, 0, 0, 0, 5, 5, 0, 0, 0, 0, -5, 0, 5, -5, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0],
};

export const JCE_BANDS: { from: number; to: number; label: string }[] = [
  { from: -1, to: -0.61, label: 'Very Low' },
  { from: -0.6, to: -0.25, label: 'Low' },
  { from: -0.24, to: 0.25, label: 'Neutral' },
  { from: 0.26, to: 0.4, label: 'Moderately High' },
  { from: 0.41, to: 0.6, label: 'High' },
  { from: 0.61, to: 1, label: 'Very High' },
];
