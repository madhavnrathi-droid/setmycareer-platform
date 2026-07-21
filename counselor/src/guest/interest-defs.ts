// Verbatim definitions for the Career Interest Assessment Report, transcribed
// from the founder's report specification (interest-report-info.txt, Parts 1–3):
// 34 interest-cluster definitions + 10 work-environment factor definitions +
// 10 job-characteristic factor definitions. Do NOT edit the definition text —
// it is the exact copy that renders in the on-screen dropdowns and the printed
// glossaries of every report. Keys must match IFIN_CLUSTERS labels and
// IFIN_WE / IFIN_JC keys in interest-final.ts; the dev assert at the bottom
// fails loudly if the two files ever drift.

import { IFIN_CLUSTERS, IFIN_WE, IFIN_JC } from "./interest-final"

/** Fixed report strings from the specification (titles are the founder's own). */
export const IREPORT = {
  title: "Career Interest Assessment Report",
  coverSubtitle: "Helping You Discover Careers That Can Sustain Your Interest",
  graph1Title: "Activity-Level Interest Pattern",
  graph1Question: "What Naturally Attracts Me?",
  graph2Title: "Career-Level Interest Pattern",
  graph2Question: "What Could Sustain Me As a Career?",
  weTitle: "Preferred Work Environment",
  jcTitle: "Preferred Job Characteristics",
} as const

/** Part 1 — Interest Cluster Definitions, keyed by IFIN_CLUSTERS label. */
export const IFIN_CLUSTER_DEFS: Record<string, string> = {
  "Sales & Business Development":
    "This dimension measures interest in understanding customer needs, influencing decisions, building relationships, and creating business opportunities. Individuals scoring high enjoy interacting with people, communicating value, and working towards measurable outcomes. They are likely to find satisfaction in persuading others, expanding markets, and contributing to organisational growth through customer engagement.",
  "Digital Marketing":
    "This dimension measures interest in using digital platforms, online communication, content, and analytics to influence audience behaviour. High scorers enjoy understanding consumer engagement, experimenting with digital campaigns, analysing performance metrics, and continuously improving communication strategies to achieve marketing objectives in rapidly changing digital environments.",
  "Finance & Banking":
    "This dimension measures interest in financial systems, investments, banking operations, and evidence-based financial decision-making. Individuals with high scores enjoy analysing numbers, understanding financial performance, managing resources responsibly, and making logical decisions that support stability, growth, and effective financial management.",
  "Entrepreneurship":
    "This dimension measures interest in creating new ideas, recognising opportunities, taking initiative, and building value despite uncertainty. High scorers enjoy innovation, independent decision-making, calculated risk-taking, and transforming concepts into practical solutions through persistence, ownership, and continuous improvement.",
  "Leadership & Management":
    "This dimension measures interest in coordinating people, resources, and activities to achieve organisational objectives. Individuals scoring high enjoy planning, decision-making, prioritising work, guiding teams, balancing multiple responsibilities, and improving organisational performance through effective leadership and management practices.",
  "Human Resources":
    "This dimension measures interest in understanding people, supporting employee development, and improving workplace effectiveness. High scorers enjoy recognising individual differences, facilitating collaboration, developing talent, and contributing to organisational success by managing people-related processes, communication, and employee wellbeing.",
  "Law":
    "This dimension measures interest in justice, legal reasoning, rights, responsibilities, and analysing issues from multiple perspectives. Individuals with high scores enjoy interpreting rules, evaluating evidence, constructing logical arguments, and resolving disputes through structured thinking, careful analysis, and ethical judgement.",
  "Public Policy & Governance":
    "This dimension measures interest in government systems, public administration, policy development, and societal improvement. High scorers enjoy understanding how public decisions influence communities, analysing social issues, evaluating policies, and contributing to governance through evidence-based planning and responsible decision-making.",
  "Administration & Compliance":
    "This dimension measures interest in maintaining organised systems, following procedures, ensuring accuracy, and supporting efficient operations. Individuals scoring high enjoy structured work, managing information, coordinating administrative activities, and ensuring consistency, compliance, and reliability within organisational processes.",
  "Education & Teaching":
    "This dimension measures interest in facilitating learning, sharing knowledge, and helping others develop skills and understanding. High scorers enjoy explaining concepts, guiding learners, preparing educational activities, and contributing to personal growth by creating positive learning experiences for individuals and groups.",
  "Physical Science & Research":
    "This dimension measures interest in understanding natural phenomena through observation, experimentation, and scientific reasoning. Individuals scoring high enjoy investigating physical systems, analysing evidence, testing ideas, and expanding knowledge using systematic methods to explain how the physical world functions.",
  "Social Science & Research":
    "This dimension measures interest in understanding people, societies, institutions, and social behaviour through systematic inquiry. High scorers enjoy investigating social issues, analysing patterns of human interaction, interpreting research findings, and developing evidence-based understanding of communities and social systems.",
  "Core Engineering":
    "This dimension measures interest in designing, building, improving, and maintaining machines, structures, products, and technical systems. Individuals scoring high enjoy solving engineering problems, applying scientific principles, analysing technical challenges, and developing practical solutions that improve performance, safety, and efficiency.",
  "IT & Software Engineering":
    "This dimension measures interest in developing software, understanding digital systems, and solving problems through technology. High scorers enjoy logical thinking, programming, debugging, testing, and continuously improving software solutions that address practical needs and enhance digital experiences.",
  "Data Science & Analytics":
    "This dimension measures interest in extracting meaningful insights from data to support informed decision-making. Individuals with high scores enjoy analysing information, identifying patterns, interpreting evidence, and using quantitative methods to solve problems and improve organisational or societal outcomes.",
  "AI & Robotics":
    "This dimension measures interest in intelligent technologies, automation, robotics, and machine-based problem solving. High scorers enjoy understanding emerging technologies, designing intelligent systems, improving automation, and applying analytical thinking to develop innovative technological solutions.",
  "Healthcare / Medicine":
    "This dimension measures interest in health, disease, diagnosis, treatment, and improving human wellbeing. Individuals scoring high enjoy learning medical knowledge, understanding health conditions, taking responsibility for patient care, and contributing to the prevention, management, and treatment of illness.",
  "Allied Health":
    "This dimension measures interest in supporting healthcare through specialised diagnostic, therapeutic, pharmaceutical, or rehabilitation services. High scorers enjoy applying professional knowledge to improve health outcomes, assisting recovery, and helping individuals achieve better physical, functional, or clinical wellbeing.",
  "Psychology":
    "This dimension measures interest in understanding human thoughts, emotions, behaviour, and relationships. Individuals scoring high enjoy listening carefully, analysing behavioural patterns, exploring psychological processes, and helping people understand and manage personal, emotional, or behavioural challenges.",
  "Social Work":
    "This dimension measures interest in improving the wellbeing of individuals, families, and communities facing social challenges. High scorers enjoy supporting vulnerable populations, understanding community needs, collaborating with organisations, and contributing to positive social change through service and advocacy.",
  "Hospitality":
    "This dimension measures interest in creating enjoyable experiences through quality service, attention to detail, and customer satisfaction. Individuals scoring high enjoy interacting with people, responding to guest needs, maintaining service standards, and ensuring positive experiences in customer-focused environments.",
  "Event Management":
    "This dimension measures interest in planning, organising, and coordinating events involving multiple people, activities, and resources. High scorers enjoy managing logistics, solving problems under time pressure, coordinating teams, and ensuring successful execution of planned events.",
  "Creative Arts & Design":
    "This dimension measures interest in visual creativity, aesthetics, originality, and artistic expression. Individuals scoring high enjoy generating ideas, designing visual solutions, refining creative work, and producing aesthetically appealing outcomes that communicate meaning or enhance user experience.",
  "Performing Arts":
    "This dimension measures interest in artistic performance, creative expression, and engaging audiences through music, acting, dance, or related forms. High scorers enjoy practising performance skills, expressing emotions creatively, and continuously improving through rehearsal and audience interaction.",
  "Journalism & Mass Communication":
    "This dimension measures interest in gathering, analysing, and communicating information that informs or influences the public. Individuals scoring high enjoy investigating current issues, interacting with diverse sources, presenting information accurately, and contributing to public awareness through effective communication.",
  "Writing & Content Creation":
    "This dimension measures interest in expressing ideas, knowledge, and stories through written, visual, or digital content. High scorers enjoy researching topics, organising information, developing engaging communication, and refining content to inform, educate, or influence different audiences.",
  "Architecture":
    "This dimension measures interest in designing functional, safe, and aesthetically pleasing buildings and environments. Individuals scoring high enjoy combining creativity with technical planning, translating ideas into detailed designs, and developing spaces that effectively serve human needs.",
  "Agriculture & Environment":
    "This dimension measures interest in agriculture, sustainability, natural resources, and environmental systems. High scorers enjoy understanding ecological relationships, improving agricultural productivity, conserving resources, and solving practical problems related to food production and environmental sustainability.",
  "Defence Services":
    "This dimension measures interest in disciplined service, teamwork, national responsibility, and mission-oriented work. Individuals scoring high enjoy structured environments, physical and mental challenges, collective responsibility, and contributing to national security through commitment, resilience, and professional discipline.",
  "Operations Management":
    "This dimension measures interest in improving organisational efficiency through planning, coordination, and process optimisation. High scorers enjoy managing workflows, solving operational problems, allocating resources effectively, and ensuring consistent delivery of products or services.",
  "Retail & Consumer Business":
    "This dimension measures interest in consumer behaviour, merchandising, sales operations, and customer experience. Individuals scoring high enjoy understanding market needs, managing products, improving customer satisfaction, and contributing to commercial success through effective retail operations.",
  "Supply Chain & Logistics":
    "This dimension measures interest in planning and managing the movement of goods, information, and resources across interconnected systems. High scorers enjoy coordinating suppliers, transportation, inventory, and distribution while solving logistical challenges efficiently and systematically.",
  "Sports & Physical Fitness":
    "This dimension measures interest in physical activity, athletic performance, fitness development, and healthy lifestyles. Individuals scoring high enjoy regular physical training, improving performance through practice, setting fitness goals, and encouraging physical wellbeing through sustained effort and discipline.",
  "Adventure & Exploration":
    "This dimension measures interest in discovering new environments, experiencing challenges, and engaging in exploration-based activities. High scorers enjoy outdoor experiences, uncertainty, travel, and physically or mentally demanding situations that provide opportunities for learning, resilience, and personal growth.",
}

/** Part 2 — Work Environment Factor Definitions, keyed by IFIN_WE key. */
export const IFIN_WE_DEFS: Record<string, string> = {
  WE1: "This factor measures preference for work environments that provide continuous learning, skill development, and intellectual growth. Individuals scoring high enjoy acquiring new knowledge, adapting to change, and working in roles that encourage ongoing professional development.",
  WE2: "This factor measures preference for accepting responsibility and ownership of outcomes. High scorers are comfortable being trusted with important tasks, meeting commitments, and being personally responsible for the quality and results of their work.",
  WE3: "This factor measures preference for collaborative work involving shared goals and mutual support. Individuals scoring high enjoy contributing within teams, cooperating with others, exchanging ideas, and achieving success through collective effort rather than individual accomplishment alone.",
  WE4: "This factor measures preference for autonomy and self-directed work. High scorers enjoy making decisions independently, managing their own responsibilities, solving problems with minimal supervision, and having flexibility in how they complete their work.",
  WE5: "This factor measures preference for structured, planned, and systematic work environments. Individuals scoring high enjoy order, planning, coordination, and maintaining well-managed processes that improve efficiency, consistency, and accuracy.",
  WE6: "This factor measures preference for dynamic work environments where priorities change rapidly and quick responses are required. High scorers enjoy urgency, variety, timely decision-making, and maintaining productivity in busy and constantly changing situations.",
  WE7: "This factor measures preference for work requiring sustained effort, patience, and long-term commitment. Individuals scoring high remain motivated while working on challenging tasks that demand persistence, consistency, and delayed achievement of meaningful outcomes.",
  WE8: "This factor measures preference for frequent communication and relationship building during work. High scorers enjoy interacting with people, exchanging ideas, collaborating through discussions, and maintaining professional relationships as a regular part of their work.",
  WE9: "This factor measures preference for working outside a traditional office environment. Individuals scoring high enjoy travelling, visiting different locations, interacting directly with real-world situations, and performing work where activities naturally occur.",
  WE10: "This factor measures preference for practical, action-oriented work involving direct involvement with tools, equipment, materials, or physical activities. High scorers enjoy learning by doing and solving problems through practical experience rather than only theoretical discussion.",
}

/** Part 3 — Job Characteristic Factor Definitions, keyed by IFIN_JC key. */
export const IFIN_JC_DEFS: Record<string, string> = {
  JC1: "This factor measures preference for analytical thinking, objective reasoning, and evidence-based decision-making. Individuals scoring high enjoy examining facts, identifying patterns, evaluating alternatives, and solving problems through logical analysis.",
  JC2: "This factor measures preference for improving the wellbeing, development, or success of others. High scorers enjoy providing support, solving people's problems, contributing positively to others' lives, and experiencing satisfaction through meaningful service.",
  JC3: "This factor measures preference for communicating ideas creatively and presenting original thoughts. Individuals scoring high enjoy writing, designing, speaking, storytelling, or other forms of expression that allow imagination and creativity to be shared with others.",
  JC4: "This factor measures preference for taking initiative, expressing opinions confidently, and influencing decisions when necessary. High scorers are comfortable leading discussions, making decisions, and taking responsibility during challenging situations.",
  JC5: "This factor measures preference for pursuing opportunities, achieving ambitious goals, and creating value through initiative. Individuals scoring high enjoy influencing outcomes, developing new ideas, taking calculated risks, and driving growth or improvement.",
  JC6: "This factor measures preference for applying knowledge to produce useful, tangible, and real-world outcomes. High scorers enjoy implementing solutions, working with practical applications, and achieving visible results through action.",
  JC7: "This factor measures preference for gathering, organising, and sharing useful knowledge with others. Individuals scoring high enjoy explaining concepts, providing guidance, communicating information clearly, and helping people make informed decisions.",
  JC8: "This factor measures preference for systematic work with clearly defined processes, responsibilities, and procedures. High scorers enjoy organised workflows, careful planning, consistency, and completing tasks within established frameworks.",
  JC9: "This factor measures preference for accuracy, reliability, compliance, and established methods of working. Individuals scoring high value attention to detail, following standards, maintaining records, and ensuring dependable execution of responsibilities.",
  JC10: "This factor measures preference for curiosity, exploration, and understanding underlying causes or relationships. High scorers enjoy asking questions, investigating ideas, seeking deeper explanations, and continuously expanding their knowledge through thoughtful inquiry.",
}

export const clusterDef = (label: string): string => IFIN_CLUSTER_DEFS[label] ?? ""
export const weDef = (key: string): string => IFIN_WE_DEFS[key] ?? ""
export const jcDef = (key: string): string => IFIN_JC_DEFS[key] ?? ""

// Dev-time drift guard: every scored label/key must have a definition.
if (import.meta.env?.DEV) {
  for (const c of IFIN_CLUSTERS) {
    if (!IFIN_CLUSTER_DEFS[c.label]) throw new Error(`interest-defs: missing cluster definition for "${c.label}"`)
  }
  for (const w of IFIN_WE) {
    if (!IFIN_WE_DEFS[w.key]) throw new Error(`interest-defs: missing work-environment definition for "${w.key}" (${w.label})`)
  }
  for (const j of IFIN_JC) {
    if (!IFIN_JC_DEFS[j.key]) throw new Error(`interest-defs: missing job-characteristic definition for "${j.key}" (${j.label})`)
  }
}
