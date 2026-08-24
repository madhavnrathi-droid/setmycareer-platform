// Keyword + internal-link map, from the founder's "KW and Link Mapping" strategy doc.
//
// The doc targets twelve .php pages on the LIVE setmycareer.com. Those pages are not
// in this repo and are served from a host it cannot reach, so the strategy is
// implemented here — on the site that replaces them — with a `php` field on every
// entry recording the page each route supersedes. That field is the 301 map for
// cutover, and it is why the keyword research does not have to be redone then.
//
// DEVIATION FROM THE DOC, deliberate: the doc assigns one head term to several pages
// at once — "career guidance for students" to Class 8, 9 and 11; "career development
// program" to all three VCLP pages; "career options after graduation" to two. Pages
// that compete for the same query split their own authority and Google picks one, so
// each page here takes a distinct primary drawn from its OWN semantic list in the doc.
// The head terms survive as secondaries, where they still earn relevance.

export interface KwPage {
  /** route on this site */
  route: string
  /** the live .php page it supersedes — the 301 source at cutover */
  php: string
  primary: string
  /** monthly searches, India, from the doc */
  volume: number
  difficulty: string
  intent: string
  secondary: string[]
  /** <= 60 chars */
  title: string
  /** 140-158 chars */
  description: string
}

export const KW_PAGES: KwPage[] = [
  {
    route: "/career-counselling",
    php: "/career-counselling-and-guidance.php",
    primary: "career counselling",
    volume: 22200,
    difficulty: "High",
    intent: "Informational/Commercial - someone searching for career counselling services",
    secondary: ["counselling for career", "online career counselling", "career counselling near me", "career counselling online", "free career counselling", "career counselling and guidance", "best career counselling"],
    title: "Career Counselling & Guidance in India | SetMyCareer",
    description: "Expert career counselling in India. Psychometric assessments & one-on-one guidance for students & professionals. Find your right path - book a free session.",
  },
  {
    route: "/career-counselling/class-8",
    php: "/career-guidance-for-class-8th-students.php",
    primary: "career guidance for class 8 students",
    volume: 30,
    difficulty: "Medium",
    intent: "Informational - parents/students exploring early career awareness",
    secondary: ["career guidance websites for students", "career guidance program for students", "career guidance and counselling for students", "career guidance questions for students", "free career guidance for students", "career guidance for science students"],
    title: "Career Guidance for Students | Class 8 Expert Counselling",
    description: "Career guidance for class 8 students. Explore career options, take aptitude tests & plan your future early. Expert counselling to help students choose right.",
  },
  {
    route: "/career-counselling/class-9",
    php: "/career-counselling-for-9th-students.php",
    primary: "career guidance for class 9 students",
    volume: 40,
    difficulty: "Medium",
    intent: "Informational - parents/students in 9th grade exploring career paths ===PAGE===",
    secondary: ["career guidance and counselling for students", "career guidance questions for students", "career guidance program for students", "career guidance for students after 10th", "free career guidance for students", "career guidance websites for students"],
    title: "Career Guidance for Class 9 Students | Expert Counselling",
    description: "Career counselling for class 9 students. Explore stream options, aptitude tests & career paths. Get expert guidance to plan your future with confidence.",
  },
  {
    route: "/career-counselling/after-10th",
    php: "/career-counselling-after-10th.php",
    primary: "career options after 10th",
    volume: 4400,
    difficulty: "Medium",
    intent: "Informational/Commercial - students choosing stream after 10th board exams",
    secondary: ["options for career after 10th", "after 10th career options", "best career options after 10th", "career options after 10th in commerce", "career options after 10th in arts", "career guidance after 10th", "stream selector test"],
    title: "Career Options After 10th | Stream Selection Guidance",
    description: "Explore career options after 10th. Expert guidance on stream selection - Science, Commerce or Arts. Book a counselling session & choose the right path today.",
  },
  {
    route: "/career-counselling/class-11",
    php: "/career-counselling-for-11th-class-students.php",
    primary: "career guidance for class 11 students",
    volume: 40,
    difficulty: "Medium",
    intent: "Informational - students in 11th planning their post-12th path",
    secondary: ["career guidance and counselling for students", "career guidance questions for students", "career guidance program for students", "career guidance websites for students", "free career guidance for students", "career guidance for students after 12th"],
    title: "Career Guidance for Class 11 Students | Plan Your Future",
    description: "Career counselling for class 11 students. Expert guidance on subject selection, career planning & post-12th options. Start planning your future today.",
  },
  {
    route: "/career-counselling/after-12th",
    php: "/career-counselling-after-12th.php",
    primary: "career options after 12th",
    volume: 8100,
    difficulty: "Medium",
    intent: "Informational/Commercial - students choosing college/course after 12th boards",
    secondary: ["options for career after 12th", "after 12th career options", "career options after 12th science", "options for career after 12th science", "career guidance after 12th", "career guidance for students after 12th", "career guidance after 12th science"],
    title: "Career Options After 12th | Expert Guidance & Counselling",
    description: "Explore career options after 12th - Science, Commerce & Arts. Expert counselling to choose the right course & college. Book your session with SetMyCareer.",
  },
  {
    route: "/career-counselling/after-graduation",
    php: "/career-counselling-after-graduation.php",
    primary: "career options after graduation",
    volume: 390,
    difficulty: "Medium",
    intent: "Informational/Commercial - graduates confused about next steps (job vs higher studies)",
    secondary: ["after graduation career options", "best career options after graduation", "good career options after graduation", "career options after commerce graduation", "career options after graduation in arts", "career guidance after graduation", "career options after arts graduation"],
    title: "Career Options After Graduation | Counselling & Guidance",
    description: "Explore career options after graduation. Expert counselling on jobs, higher studies & career planning. Get personalized guidance for your next big move.",
  },
  {
    route: "/career-counselling/after-post-graduation",
    php: "/career-guidance-after-post-graduation.php",
    primary: "career guidance after post graduation",
    volume: 90,
    difficulty: "Medium",
    intent: "Informational - post-graduates (Masters/MBA/PhD) planning next career move",
    secondary: ["career guidance after graduation", "career assessment aptitude test", "career guidance test after graduation", "career guidance after graduation in commerce", "career guidance after graduation in science", "career guidance after graduation in arts", "career guidance for students after graduation"],
    title: "Career Guidance After Post Graduation | Expert Counselling",
    description: "Career guidance after post graduation. Explore career options after Masters, MBA or PhD. Expert counselling to plan your next strategic career move.",
  },
  {
    route: "/career-counselling/working-professionals",
    php: "/career-counselling-for-working-professionals.php",
    primary: "career change",
    volume: 33100,
    difficulty: "High",
    intent: "Informational/Commercial - professionals seeking career change or growth",
    secondary: ["change career", "change of career", "change career at 40", "career change in 40s", "career counselling for working professionals", "career transition counselling", "mid-career change guidance"],
    title: "Career Change Counselling for Working Professionals",
    description: "Expert career change counselling for working professionals. Guidance on mid-career transitions, career growth & new directions. Book your session today.",
  },
  {
    route: "/vclp/students",
    php: "/vclp/program-for-students.php",
    primary: "career development program for students",
    volume: 70,
    difficulty: "Medium",
    intent: "Commercial/Transactional - students looking for a structured career program",
    secondary: ["career development training program", "career guidance program for students", "career guidance and counselling for students", "career guidance for students", "career assessment aptitude test", "stream selector test"],
    title: "Career Development Program for Students | VCLP SetMyCareer",
    description: "VCLP career development program for students. Psychometric assessments, expert mentorship & career planning. Build your future with clarity and confidence.",
  },
  {
    route: "/vclp/graduates",
    php: "/vclp/program-for-graduates.php",
    primary: "career development training program",
    volume: 90,
    difficulty: "Medium",
    intent: "Commercial - fresh graduates seeking structured career launch support",
    secondary: ["career development program for students", "career guidance program for students", "career guidance after graduation", "career options after graduation", "career guidance for students", "career assessment aptitude test"],
    title: "Career Development Program for Graduates | VCLP SetMyCareer",
    description: "A career development training program for graduates: measured aptitude, a counsellor who tracks progress, and a credible route into the field you want.",
  },
  {
    route: "/vclp/professionals",
    php: "/vclp/program-for-working-professionals.php",
    primary: "employee career development program",
    volume: 70,
    difficulty: "Medium",
    intent: "Commercial/Transactional - professionals wanting structured career advancement",
    secondary: ["career development training program", "career development program for employees", "career change", "career counselling for working professionals", "career guidance for students", "career assessment aptitude test"],
    title: "Employee Career Development Program | SetMyCareer",
    description: "An employee career development program for professionals and teams. Measured aptitude, an honest readiness read, and the roles reachable from where you are.",
  },
]

export const kwFor = (route: string): KwPage | undefined =>
  KW_PAGES.find((p) => p.route === route)

/** The hub. The doc's first and highest-priority action is to link it to all eleven
 *  others so authority flows outward from the page that holds the head term. */
export const KW_HUB = "/career-counselling"

/** The student journey, in the order a family actually walks it. The doc calls for
 *  chain links so each stage points to the next — the flow is real, not decorative. */
export const STUDENT_CHAIN = [
  "/career-counselling/class-8",
  "/career-counselling/class-9",
  "/career-counselling/after-10th",
  "/career-counselling/class-11",
  "/career-counselling/after-12th",
  "/career-counselling/after-graduation",
]

/** Where the journey continues once a degree is done. */
export const PROFESSIONAL_CHAIN = [
  "/career-counselling/after-graduation",
  "/career-counselling/after-post-graduation",
  "/career-counselling/working-professionals",
]

/** VCLP conversion pages link back to the counselling page for the same audience. */
export const VCLP_BACKLINKS: Record<string, string> = {
  "/vclp/students": "/career-counselling/after-10th",
  "/vclp/graduates": "/career-counselling/after-graduation",
  "/vclp/professionals": "/career-counselling/working-professionals",
}

/** Every route this map owns — used by the prerenderer and the sitemap. */
export const KW_ROUTES = KW_PAGES.map((p) => p.route)

/** .php -> new route, for the redirect table at domain cutover. */
export const PHP_REDIRECTS: Record<string, string> = Object.fromEntries(
  KW_PAGES.map((p) => [p.php, p.route]),
)
