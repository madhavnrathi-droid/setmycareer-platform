// ─────────────────────────────────────────────────────────────────────────────
// SetMyCareer LIVE API — the complete admin + client surface, on top of the
// shared transport in smc-api.ts. Per the Admin API contract (admin_api_contract).
//
//   • Reads are OPEN (no token) and safe — used to go fully live.
//   • Writes route through smcWrite() and are OFF unless VITE_SMC_WRITES_ENABLED.
//   • Type gotchas baked in: user_id / uid are sent as STRINGS; the client-filter
//     endpoints need a NUMERIC `id` (0). The wire uses lowercase-first keys.
// ─────────────────────────────────────────────────────────────────────────────

import { post, get, smcWrite, postForm, SMC_API_BASE, type UserData, type ReportData, type PackagesData, type SoldServiceData } from "./smc-api"

const sid = (v: string | number) => String(v) // ids the backend wants as strings

// ── entity shapes (match the live wire) ──────────────────────────────────────

/** GetStatistics → { "Sessions": [{key,value}], ... } */
export type AdminStatistics = Record<string, { key: string; value: number }[]>

export interface FullNavigator {
  id: number | string
  name?: string
  email?: string
  mobile?: string
  contact?: string
  displayimg?: string
  img?: string
  isActive?: boolean | string
  location?: string
  language?: string
  education?: string
  experiance?: string
  work_Experience?: string
  organzation_working_for?: string
  practicing_expertise?: string
  certifications?: string
  achievments?: string
  about_navigator?: string
  about_navigator_full_des?: string
  short_Description?: string
  topic_Study?: string
  online_mode?: string
  meetinglink?: string
  navigator_Services?: string
  zoho_calendar_uid?: string
  zoho_calendar_id?: string
  [k: string]: unknown
}

/** A per-user session (getSessionAll) — what the client/counsellor timeline shows. */
export interface UserSession {
  session_id: number | string
  session_name?: string
  session_date?: string // DD/MM/YYYY
  session_time?: string // "06:00 PM - 07:00 PM"
  session_status?: string // Booked | Completed | Pending | Deleted | Cancelled
  session_in_min?: string | number
  package_id?: string | number
  navi_id?: number | string
  navi_name?: string
  navi_img?: string
  navi_address?: string
  session_user?: string
  followUpQuestion?: string
  sessionTopic?: string
  meetinglink?: string
  [k: string]: unknown
}

/** An admin session row (getSessionAllAdmin / getAllclientbysession). */
export interface AdminSession {
  id: number | string
  sessionsid?: number | string
  service_id?: number | string
  user_id?: number | string
  navigator_id?: number | string
  package_id?: number | string
  name?: string
  navigator?: string
  category?: string
  session_name?: string
  session_date?: string
  session_time?: string
  session_in_min?: string | number
  package_name?: string
  session_status?: string
  followup_question?: string
  discussion_topic?: string | null
  meetinglink?: string
  zoho_meeting_link?: string
  date?: string
  updated_data?: string
  [k: string]: unknown
}

/** A session note (getCommentsAllbyNavi / commentinsert). */
export interface SessionNoteRow {
  id?: number | string
  uid?: number | string
  navigator_id?: number | string
  navigator_name?: string
  comment?: string
  date?: string
  meeting_type?: string
  [k: string]: unknown
}

export interface ReviewRow { review_json?: string; [k: string]: unknown }

/** A psychometric ability-summary row (GetAdminAbilitySummaryData) — per student. */
export interface AbilitySummaryRow {
  name?: string
  dob?: string
  package_name?: string
  [k: string]: unknown // sa_total, cl_total, ra_total, ca_total, va2_total, na_total, ma_total + *_stage
}

export interface RecommendedService {
  recService?: string
  recDuration?: string
  durationPerSession?: string
  comments?: string
  [k: string]: unknown
}

/** Full user profile (UserView). Superset of the lighter UserData. */
export interface UserDetail extends Partial<UserData> {
  id: number
  name?: string | null
  category?: string | null
  mobile?: string | null
  email?: string | null
  gender?: string | null
  dob?: string | null
  img_url?: string | null
  intrest_report?: string | null
  personal_report?: string | null
  ability_report?: string | null
  competency_report?: string | null
  careerRecommendationsReprt?: string | null
  [k: string]: unknown
}

// a blank client-filter (the backend wants a full object; `id` MUST be numeric)
const CLIENT_FILTER = {
  id: 0, user_id: "", package_id: "", package_name: "", navigator_id: "", consulting_mode: "",
  payment_status: "", total_payment_amout: "", package_amout: "", razorpay_payment_id: "",
  razorpay_order_id: "", razorpay_signature: "", date: "", updated_data: "", status: "",
  recService: "", recDuration: "", durationPerSession: "",
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

/** Admin login — returns an array; success when length > 0. */
export const adminLogin = (username: string, password: string) =>
  post<unknown[]>("Login/AdminLogin", { username, password })

/** Counsellor (navigator) sign-in — its OWN endpoint, distinct from AdminLogin.
 *  CRITICAL: it keys on `email`, NOT `username`. Sending `{ username }` returns []
 *  even with the correct password (verified live against a freshly-created test
 *  navigator: `{username}`→[], `{email}`→the record). So we pass the login id as
 *  `email` (or `mobile` when it isn't an email). Returns an array of navigator
 *  records; success when length > 0. This is how AddNavigator counsellors sign in. */
export const navigatorLogin = (loginId: string, password: string) => {
  const id = loginId.includes("@") ? { email: loginId } : { mobile: loginId }
  return post<unknown[]>("Login/NavigatorLogin", { ...id, password })
}

/** Client OTP login flow (phone or email). */
export const sendOtp = (q: { mobile?: string; email?: string }) => post<{ success?: boolean; message?: string }>("User/SendOtp", q)
export const resendOtp = (q: { mobile?: string; email?: string }) => post<{ success?: boolean; message?: string }>("User/ResendOtp", q)
export const sendOtpRegister = (q: { mobile?: string; email?: string }) => post<{ success?: boolean; message?: string }>("User/SendOtpRegister", q)
export const loginWithOtp = (q: { otp: string; mobile?: string; email?: string }) => post<UserDetail>("User/LoginWithOtp", q)
export const loginWithPassword = (q: { mobile?: string; email?: string; password: string }) =>
  post<{ success?: boolean; message?: string; data?: UserDetail }>("User/LoginWithPassword", q)
export const signinWithGoogle = (q: { mobile?: string; email?: string }) =>
  post<{ success?: boolean; message?: string; data?: UserDetail }>("User/SigninWithGoogle", q)

// ── READS (open, safe) ────────────────────────────────────────────────────────

export const getStatistics = () => get<AdminStatistics>("Admin/GetStatistics")
export const getAllNavigators = () => get<FullNavigator[]>("NavigatorList/getAllNavigator")
export const getNavigatorListDropdown = () => get<FullNavigator[]>("NavigatorList")
export const getNavigatorDetail = (id: number | string) => post<FullNavigator[]>("NavigatorDetail", { id })

export const getAllClientsBySession = () => post<AdminSession[]>("SoldService/getAllclientbysession", {})
export const getClientsByAdmin = () => post<unknown>("SoldService/getclientbyadmin", { ...CLIENT_FILTER })
// The backend returns the navigator's ENTIRE caseload in one response and serialises
// it slowly (a large counsellor's payload is >1MB and can trickle for 60s+), so this
// one heavy read gets a long timeout. The persisted cache (live-queries) means it
// only has to succeed once — after that the counsellor sees their clients instantly.
export const getClientsByNavi = (navigator_id: number | string) =>
  post<unknown>("SoldService/getclientbynaviId", { ...CLIENT_FILTER, navigator_id: sid(navigator_id) }, { timeoutMs: 90_000 })

export const getSessionsAllAdmin = () => post<AdminSession[]>("SoldService/getSessionAllAdmin", {})
export const getUserSessions = (userId: number | string) => post<UserSession[]>("SoldService/getSessionAll", { user_id: sid(userId) })

export const userView = (userId: number | string) => post<UserDetail>("UserView", { userId: sid(userId) })
export const userViewBy = (q: { mobile?: string; email?: string; userId?: number | string }) => post<UserDetail | UserDetail[]>("UserView", q)
export const getUserPurchases = (userId: number | string) => get<{ success: boolean; data: SoldServiceData[] }>(`UserView/GetPurchasePackages/${sid(userId)}`)
export const getUserReports = (userId: number | string) => get<ReportData[]>(`Reports/getAllReportsForUser/${sid(userId)}`)
export const getUserNotes = (uid: number | string) => post<SessionNoteRow[]>("SoldService/getCommentsAllbyNavi", { uid: sid(uid) })
export const getUserReviews = (userId: number | string) => post<ReviewRow[]>("SoldService/getReviewbyid", { user_id: sid(userId) })
export const primaryFormCheckLive = (userId: number | string) => post<unknown[]>("SoldService/primaryFormCheck", { user_id: sid(userId) })
export const getAbilitySummary = () => get<AbilitySummaryRow[]>("SoldService/GetAdminAbilitySummaryData/")
export const getRecommendedServices = (userId: number | string) => get<{ success: boolean; data: RecommendedService[] }>(`RecommendedService/getRecommendedServices/${sid(userId)}`)
export const getAllPackagesLive = () => post<PackagesData[]>("SoldService/getAllPackages", { id: 0 })

// ── Navigator View contract (navigator_view_api_contract) ─────────────────────

/** Top-level navigator stats for the counsellor dashboard. */
export interface NavigatorStats { ClientCount?: number; SessionCount?: number; Rating?: number | string; Earning?: number | string; [k: string]: unknown }
export const getNavigatorStats = (id: number | string) =>
  post<{ data?: NavigatorStats } & Record<string, unknown>>("NavigatorDetail/GetNavigatorStats", { id: sid(id) })

/** Dashboard upcoming-sessions feed for a navigator (lighter than the full caseload). */
export const getNaviDashboardSessions = (navigator_id: number | string) =>
  post<AdminSession[]>("SoldService/getclientbynaviIdNavi", { id: 0, navigator_id: sid(navigator_id) }, { timeoutMs: 60_000 })

/** Saved admission-assistance preferences (countries/cities) for a client. */
export interface AdmissionData { json_data?: string; [k: string]: unknown }
export const getAdmissionData = (userId: number | string) =>
  get<{ data?: AdmissionData } & Record<string, unknown>>(`Admission/GetAdmissionData/${sid(userId)}`)

/** Career Explorer questions + saved answers for a service (fields are case-loose). */
export interface CareerExplorerQA {
  question_no?: number | string; question_No?: number | string; Question_No?: number | string
  question_text?: string; question_Text?: string; Question_Text?: string
  answer_text?: string; answer_Text?: string; Answer_Text?: string
  [k: string]: unknown
}
export const getCareerExplorerQA = (serviceId: number | string) =>
  post<CareerExplorerQA[]>("SoldService/getCareerExplorerQuestionAnswers", { service_id: Number(serviceId) })

/** Normalise a case-loose Career Explorer row to { no, question, answer }. */
export const normalizeQA = (r: CareerExplorerQA) => ({
  no: r.question_no ?? r.question_No ?? r.Question_No ?? "",
  question: (r.question_text ?? r.question_Text ?? r.Question_Text ?? "") as string,
  answer: (r.answer_text ?? r.answer_Text ?? r.Answer_Text ?? "") as string,
})

// ── Zoho calendar (reads) ─────────────────────────────────────────────────────

export interface ZohoEvent {
  uid: string; title?: string
  dateandtime?: { start?: string; end?: string }
  isallday?: boolean | string; isprivate?: boolean | string
  description?: string; location?: string; url?: string
  organizer?: string | { email?: string; [k: string]: unknown }
  attendees?: unknown[]; rrule?: string; recurrenceid?: string; etag?: string
  conference?: { conference_data?: { meetingdata?: { meeting_link?: string } } }
  attach?: unknown[]
  [k: string]: unknown
}
/** List a navigator's Zoho calendar events between two YYYY-MM-DD dates (≤31-day window). */
export const listCalendarEvents = (p: { calendarId: string; startDate: string; endDate: string; UserId: string; NavigatorName?: string }) =>
  post<{ events?: ZohoEvent[] } & Record<string, unknown>>("Calendar/ListAllEvents", p, { timeoutMs: 30_000 })
export const getCalendarEventDetails = (calendarId: string, eventId: string, recurrenceId?: string) =>
  get<{ events?: ZohoEvent[] }>(`Calendar/GetEventDetails/${encodeURIComponent(calendarId)}/${encodeURIComponent(eventId)}${recurrenceId ? `?recurrenceid=${encodeURIComponent(recurrenceId)}` : ""}`)

/** Pull the join link out of a Zoho event (conference data or a URL field). */
export const zohoMeetingLink = (e: ZohoEvent): string | undefined =>
  e.conference?.conference_data?.meetingdata?.meeting_link ?? (typeof e.url === "string" && /^https?:/.test(e.url) ? e.url : undefined)

/** Profile-pic absolute URL. */
export const profilePicUrl = (img?: string | null) => (img ? `${SMC_API_BASE.replace(/api\/$/, "")}ProfilePic/${img}` : undefined)

// ── WRITES (gated by VITE_SMC_WRITES_ENABLED) ─────────────────────────────────

export interface AddClientServicePayload {
  user_id: string; package_id: string; package_name: string; navigator_id: string
  consulting_mode: string; location: string | null; payment_status: string
  total_payment_amout: string; package_amout: string
  razorpay_order_id: string | null; razorpay_payment_id: string | null
}
export const addClientService = (p: AddClientServicePayload) => smcWrite<unknown>("SoldService/addClientServiceFromAdmin/", p)

export const modifySessionStatus = (id: number | string, session_status: string) =>
  smcWrite<unknown>("SoldService/ModifysessionsStatus", { id, session_status })
export const modifySessionFull = (s: Record<string, unknown>) => smcWrite<unknown>("SoldService/ModifysessionsStatus", s)
export const deleteSession = (s: Record<string, unknown>) => smcWrite<unknown>("SoldService/deletesessions", { ...s, session_status: "Deleted" })

export const addNavigator = (p: { name: string; email: string; password: string }) => smcWrite<unknown>("NavigatorDetail/AddNavigator", p)
export const updateNavigator = (p: Record<string, unknown>) => smcWrite<unknown>("SoldService/updateNavigatorDetial", p)
export const enableNavigator = (email: string) => smcWrite<unknown>(`NavigatorDetail/EnableNavigator/${encodeURIComponent(email)}`, {})
export const disableNavigator = (email: string) => smcWrite<unknown>(`NavigatorDetail/disableNavigator/${encodeURIComponent(email)}`, {})

export const reassignNavigator = (navigatorId: number | string, serviceId: number | string) =>
  smcWrite<unknown>("Calendar/changeUserNavigator", { navigatorId, serviceId })

/** Add a session note (the "comment" = note). date is DD/MM/YYYY. */
export const insertNote = (p: { id: number | string; uid: number | string; navigator_id: number | string; comment: string; date: string; navigator_name: string; meeting_type: string }) =>
  smcWrite<unknown>("SoldService/commentinsert", p)

export const modifyCategory = (category: string, mobile: string) => smcWrite<unknown>("UserUpdate/UserUpdateCategory", { category, mobile })
export const addRecommendedService = (p: Record<string, unknown>) => smcWrite<unknown>("RecommendedService/addRecommendedService", p)

export const uploadReport = (user_id: string, report_name: string, file: File) => {
  const fd = new FormData(); fd.append("user_id", user_id); fd.append("report_name", report_name); fd.append("file", file)
  return smcWrite<unknown>("Reports/uploadReport", null, fd)
}
export const postRecommendationReport = (user_id: string, file: File) => {
  const fd = new FormData(); fd.append("user_id", user_id); fd.append("file", file)
  return smcWrite<unknown>("SoldService/postRecommedation", null, fd)
}

/** Save navigator-entered Career Explorer answers. */
export const saveCareerExplorerAnswers = (p: {
  user_id: string; service_id: string | number; package_id: string | number; session_id: string | number
  items: { question_no: number | string; question_text: string; answer_text: string }[]
}) => smcWrite<unknown>("SoldService/saveCareerExplorerAnswers", { ...p, answered_by_role: "Navigator" })

// ── Zoho calendar (writes, gated) ─────────────────────────────────────────────
export interface CalendarEventInput {
  calendarId: string; title: string; startDate: string; endDate: string
  isallday?: boolean; isprivate?: boolean; url?: string; location?: string; description?: string
  attendees?: unknown[]; isRecurring?: boolean; recurrenceRule?: unknown; AttachmentFileIds?: string[]
  UserId: string; NavigatorName?: string; [k: string]: unknown
}
export const addCalendarEvent = (p: CalendarEventInput) => smcWrite<unknown>("Calendar/AddRecurringEvent", p)
export const updateCalendarEvent = (p: CalendarEventInput & { eventId: string; etag?: string; recurrenceId?: string; recurrenceEditType?: "only" | "following" | "all" }) =>
  smcWrite<unknown>("Calendar/UpdateEvent", p)
export const deleteCalendarEvent = (p: { eventId: string; calendarId: string; etag?: string; UserId: string; NavigatorName?: string; recurrenceEditType?: "all" | "only" }) =>
  smcWrite<unknown>("Calendar/DeleteEvent", p)
export const uploadCalendarAttachment = (files: File[]) => {
  const fd = new FormData(); files.forEach((f) => fd.append("files", f))
  return smcWrite<unknown>("Calendar/UploadAttachment", null, fd)
}

// keep the unused transport import meaningful for tree-shakers
export { postForm }
