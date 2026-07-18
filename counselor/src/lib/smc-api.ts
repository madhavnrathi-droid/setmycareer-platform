// ─────────────────────────────────────────────────────────────────────────────
// SetMyCareer core backend — the REAL production API the live business runs on.
// Base URL + endpoint contract per the API spec shared by the SMC team
// (Sharmila Doshi, Jun 2026). This is a CLIENT-SIDE API: the browser calls it
// directly (the API serves `access-control-allow-origin: *`).
//
// SAFETY: the data behind this API is LIVE. This module implements only the
// READ / non-destructive endpoints. Every WRITE endpoint (login, OTP, signup,
// order creation, profile updates) is catalogued for reference but routed through
// `blockedWrite()` so nothing can mutate production by accident from this app
// until we deliberately turn it on. Do not remove that guard without intent.
// ─────────────────────────────────────────────────────────────────────────────

/** Base URL — overridable via `VITE_SMC_API_BASE`, defaults to production.
 *  Always ends with a trailing slash so endpoint joins are clean. */
export const SMC_API_BASE = (
  (import.meta.env.VITE_SMC_API_BASE as string | undefined) ?? "https://api.setmycareer.com/api/"
).replace(/\/?$/, "/")

// ── data entities (exact field sets from the API contract) ───────────────────

export interface UserData {
  id: number
  Name: string
  dob: string | null
  whatsapp: string | null
  mobile: string | null
  gender: string | null
  email: string | null
  password?: string | null
  grand_total: string | number | null
  Paid_amount: string | number | null
  Cart_Product: string | null
  Payment_Status: string | null
  category: string | null
  Generated_id: string | null
  date: string | null
  Updated_date: string | null
  Otp: string | null
  intrest_report: string | null
  personal_report: string | null
  ability_report: string | null
  competency_report: string | null
  careerRecommendationsReprt: string | null
  Img_url: string | null
  Ability_Report_Date: string | null
  Intrest_Report_Date: string | null
  Personal_Report_Date: string | null
  Competency_Report_Date: string | null
  Sub_category: string | null
  IsStudyCompleted: boolean | string | null
  Service_Looking: string | null
  User_query: string | null
  All_data_json: string | null
}

export interface PackagesData {
  id: number
  category: string | null
  package_name: string | null
  package_short_description: string | null
  package_description: string | null
  price_online: string | null
  gst: string | null
  price_face_to_face: string | null
  razorpay_id_online: string | null
  razorpay_id_face_to_face: string | null
  gst_face_to_face: string | null
  gst_price_online: string | null
  total_price_online: string | null
  total_face_to_face: string | null
  top_description: string | null
  description: string | null
  description_row: string | null
  description_row1: string | null
  description_row2: string | null
}

export interface NavigatorListItem {
  id: number
  name: string | null
  email: string | null
  Mobile: string | null
  contact: string | null
  Displayimg: string | null
  img: string | null
  About_navigator: string | null
  About_navigator_full_des: string | null
  Achievments: string | null
  Address: string | null
  Certifications: string | null
  Education: string | null
  Experiance: string | null
  IsActive: boolean | string | null
  Language: string | null
  Location: string | null
  Meetinglink: string | null
  Navigator_Services: string | null
  Online_mode: string | null
  Order_list: string | null
  Organzation_working_for: string | null
  Practicing_expertise: string | null
  Short_Description: string | null
  Topic_Study: string | null
  Work_Experience: string | null
  zoho_calendar_uid: string | null
  zoho_calendar_id: string | null
}

export interface SoldServiceData {
  id: number
  user_id: number
  package_id: number
  package_name: string | null
  navigator_id: number | null
  consulting_mode: string | null
  payment_status: string | null
  total_payment_amout: string | number | null
  package_amout: string | number | null
  razorpay_payment_id: string | null
  razorpay_order_id: string | null
  razorpay_signature: string | null
  date: string | null
  updated_data: string | null
  Status: string | null
  RecService: string | null
  RecDuration: string | null
  DurationPerSession: string | null
  Location: string | null
  InvoiceNumber: string | null
  InvoiceNumberInteger: number | null
}

export interface ReportData {
  id: number
  user_id: number
  report_name: string | null
  report_location: string | null
  created_at: string | null
  modified_at: string | null
}

export interface SessionItem {
  session_date: string | null
  session_in_min: number | null
  navi_name: string | null
  navi_img: string | null
  session_id: number | null
  sessionTopic: string | null
  Meetinglink: string | null
  [k: string]: unknown
}

// ── endpoint catalogue (drives the admin "Connected APIs" panel) ─────────────

export type EndpointKind = "read" | "write"
export type EndpointGroup =
  | "Auth" | "Users" | "Navigators" | "Sessions" | "Reports"
  | "Calendar" | "Admission" | "Career Explorer" | "Payment" | "Packages" | "Stats"
export interface EndpointSpec {
  path: string
  method: "GET" | "POST"
  kind: EndpointKind
  group: EndpointGroup
  input: string
  output: string
}

/** The FULL live contract — every endpoint the app talks to. `read` endpoints are
 *  wired + consumed; `write` endpoints are catalogued and gated (they mutate live
 *  production data, so they only fire when VITE_SMC_WRITES_ENABLED is on). */
export const SMC_ENDPOINTS: EndpointSpec[] = [
  // ── Auth ──
  { path: "Login/AdminLogin", method: "POST", kind: "write", group: "Auth", input: "{ username, password }", output: "AdminRecord[] (len>0 = ok)" },
  { path: "Login/NavigatorLogin", method: "POST", kind: "write", group: "Auth", input: "{ email | mobile, password }", output: "NavigatorRecord" },
  { path: "User/LoginWithPassword", method: "POST", kind: "write", group: "Auth", input: "{ mobile?, email?, password }", output: "{ success, message, data }" },
  { path: "User/LoginWithOtp", method: "POST", kind: "write", group: "Auth", input: "{ otp, mobile?, email? }", output: "UserData | 401" },
  { path: "User/SendOtp", method: "POST", kind: "write", group: "Auth", input: "{ mobile?, email? }", output: "{ success, message }" },
  { path: "User/ResendOtp", method: "POST", kind: "write", group: "Auth", input: "{ mobile?, email? }", output: "{ success, message }" },
  { path: "User/SendOtpRegister", method: "POST", kind: "write", group: "Auth", input: "{ mobile?, email? }", output: "{ success, message }" },
  { path: "User/SignupwithotpPassword", method: "POST", kind: "write", group: "Auth", input: "{ otp, mobile?, email?, password }", output: "{ success, message, data }" },
  { path: "User/UpdateSignUp", method: "POST", kind: "write", group: "Auth", input: "SignupCompleteRequest", output: "{ success, data: UserData }" },
  { path: "User/SigninWithGoogle", method: "POST", kind: "write", group: "Auth", input: "{ mobile?, email? }", output: "{ success, message, data }" },
  // ── Users ──
  { path: "UserView", method: "POST", kind: "read", group: "Users", input: "{ mobile?, email?, userId? }", output: "UserData | UserData[]" },
  { path: "UserView/GetPurchasePackages/{userId}", method: "GET", kind: "read", group: "Users", input: "URL param: userId", output: "{ success, data: SoldServiceData[] }" },
  { path: "User/UpdateProfilePic", method: "POST", kind: "write", group: "Users", input: "Query: userId + file", output: "string (file name)" },
  { path: "UserUpdate/UserUpdateCategory", method: "POST", kind: "write", group: "Users", input: "{ category, mobile }", output: "{ success }" },
  // ── Navigators (counsellors) ──
  { path: "NavigatorList/getAllNavigator", method: "GET", kind: "read", group: "Navigators", input: "—", output: "FullNavigator[] (81)" },
  { path: "NavigatorList/GetNavigatorListByPackageId", method: "POST", kind: "read", group: "Navigators", input: "{ package_Id, mode, location }", output: "NavigatorListItem[]" },
  { path: "NavigatorDetail/{id}", method: "GET", kind: "read", group: "Navigators", input: "URL param: id", output: "FullNavigator[]" },
  { path: "NavigatorDetail/GetNavigatorStats", method: "POST", kind: "read", group: "Navigators", input: "{ id }", output: "{ ClientCount, SessionCount, Rating, Earning }" },
  { path: "NavigatorDetail/AddNavigator", method: "POST", kind: "write", group: "Navigators", input: "{ name, email, password }", output: "{ success }" },
  { path: "NavigatorDetail/updateNavigatorDetial", method: "POST", kind: "write", group: "Navigators", input: "NavigatorRecord", output: "{ success }" },
  { path: "NavigatorDetail/EnableNavigator/{email}", method: "GET", kind: "write", group: "Navigators", input: "URL param: email", output: "{ success }" },
  { path: "NavigatorDetail/disableNavigator/{email}", method: "GET", kind: "write", group: "Navigators", input: "URL param: email", output: "{ success }" },
  // ── Sessions / caseload (SoldService) ──
  { path: "SoldService/getSessionAll", method: "POST", kind: "read", group: "Sessions", input: "{ user_id }", output: "UserSession[]" },
  { path: "SoldService/getSessionAllAdmin", method: "POST", kind: "read", group: "Sessions", input: "{}", output: "AdminSession[] (12k)" },
  { path: "SoldService/getAllclientbysession", method: "POST", kind: "read", group: "Sessions", input: "{}", output: "AdminSession[]" },
  { path: "SoldService/getclientbynaviId", method: "POST", kind: "read", group: "Sessions", input: "{ navigator_id, id:0 }", output: "caseload rows" },
  { path: "SoldService/getclientbynaviIdNavi", method: "POST", kind: "read", group: "Sessions", input: "{ navigator_id }", output: "dashboard sessions" },
  { path: "SoldService/getclientbyadmin", method: "POST", kind: "read", group: "Sessions", input: "{ ...filter }", output: "admin client rows" },
  { path: "SoldService/primaryFormCheck", method: "POST", kind: "read", group: "Sessions", input: "{ user_id }", output: "PrimaryForm[]" },
  { path: "SoldService/getTestbyId", method: "POST", kind: "read", group: "Sessions", input: "{ user_id }", output: "string[4]" },
  { path: "SoldService/GetAdminAbilitySummaryData", method: "GET", kind: "read", group: "Sessions", input: "—", output: "AbilitySummaryRow[] (978)" },
  { path: "SoldService/getCommentsAllbyNavi", method: "POST", kind: "read", group: "Sessions", input: "{ uid }", output: "SessionNoteRow[] (comments)" },
  { path: "SoldService/getReviewbyid", method: "POST", kind: "read", group: "Sessions", input: "{ user_id }", output: "ReviewRow[]" },
  { path: "SoldService/ModifysessionsStatus", method: "POST", kind: "write", group: "Sessions", input: "{ id, session_status }", output: "{ success }" },
  { path: "SoldService/deletesessions", method: "POST", kind: "write", group: "Sessions", input: "{ ...session }", output: "{ success }" },
  { path: "SoldService/commentinsert", method: "POST", kind: "write", group: "Sessions", input: "{ id, uid, comment, navigator_name, … }", output: "{ success }" },
  { path: "SoldService/addClientServiceFromAdmin", method: "POST", kind: "write", group: "Sessions", input: "AddClientServicePayload", output: "{ success }" },
  { path: "Calendar/changeUserNavigator", method: "POST", kind: "write", group: "Sessions", input: "{ navigatorId, serviceId }", output: "{ success }" },
  // ── Reports ──
  { path: "Reports/getAllReportsForUser/{userId}", method: "GET", kind: "read", group: "Reports", input: "URL param: userId", output: "ReportData[]" },
  { path: "Reports/uploadReport", method: "POST", kind: "write", group: "Reports", input: "FormData { user_id, report_name, file }", output: "{ success }" },
  { path: "SoldService/postRecommedation", method: "POST", kind: "write", group: "Reports", input: "FormData { user_id, file }", output: "{ success }" },
  { path: "RecommendedService/addRecommendedService", method: "POST", kind: "write", group: "Reports", input: "RecommendedServicePayload", output: "{ success }" },
  // ── Admission assistance ──
  { path: "Admission/GetAdmissionData/{userId}", method: "GET", kind: "read", group: "Admission", input: "URL param: userId", output: "{ data: { json_data } }" },
  // ── Career Explorer ──
  { path: "SoldService/getCareerExplorerQuestionAnswers", method: "POST", kind: "read", group: "Career Explorer", input: "{ service_id }", output: "CareerExplorerQA[]" },
  { path: "SoldService/saveCareerExplorerAnswers", method: "POST", kind: "write", group: "Career Explorer", input: "{ user_id, service_id, items[] }", output: "{ success }" },
  // ── Calendar (Zoho) ──
  { path: "Calendar/ListAllEvents", method: "POST", kind: "read", group: "Calendar", input: "{ calendarId, startDate, endDate, UserId }", output: "{ events: ZohoEvent[] }" },
  { path: "Calendar/AddRecurringEvent", method: "POST", kind: "write", group: "Calendar", input: "CalendarEventInput", output: "{ success }" },
  { path: "Calendar/UpdateEvent", method: "POST", kind: "write", group: "Calendar", input: "CalendarEventInput + eventId", output: "{ success }" },
  { path: "Calendar/DeleteEvent", method: "POST", kind: "write", group: "Calendar", input: "{ eventId, calendarId }", output: "{ success }" },
  { path: "Calendar/UploadAttachment", method: "POST", kind: "write", group: "Calendar", input: "FormData { files }", output: "{ success }" },
  // ── Payment ──
  { path: "Payment/CreateOrder", method: "POST", kind: "write", group: "Payment", input: "{ name, email, mobile, category, packageId, mode }", output: "{ userId, orderId, amount }" },
  // ── Packages ──
  { path: "SoldService/getAllPackages", method: "POST", kind: "read", group: "Packages", input: "{ id: 0 }", output: "PackagesData[] (123)" },
  { path: "Packages", method: "POST", kind: "write", group: "Packages", input: "PackageOrderRequestData", output: "PackagesData" },
  // ── Stats ──
  { path: "Admin/GetStatistics", method: "GET", kind: "read", group: "Stats", input: "—", output: "AdminStatistics" },
]

// ── transport ────────────────────────────────────────────────────────────────

export class SmcApiError extends Error {
  status?: number
  constructor(message: string, status?: number) { super(message); this.status = status }
}

async function smcFetch<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 15000, ...rest } = init
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(SMC_API_BASE + path.replace(/^\//, ""), {
      ...rest,
      signal: ctrl.signal,
      headers: { Accept: "application/json", ...(rest.body ? { "Content-Type": "application/json" } : {}), ...(rest.headers ?? {}) },
    })
    if (!res.ok) throw new SmcApiError(`${path} → ${res.status} ${res.statusText}`, res.status)
    const text = await res.text()
    return (text ? JSON.parse(text) : null) as T
  } catch (e) {
    if (e instanceof SmcApiError) throw e
    if ((e as Error)?.name === "AbortError") throw new SmcApiError(`${path} → timed out after ${timeoutMs}ms`)
    throw new SmcApiError(`${path} → ${(e as Error)?.message ?? "network error"}`)
  } finally {
    clearTimeout(timer)
  }
}

export const post = <T>(path: string, body: unknown, opts?: { timeoutMs?: number }) =>
  smcFetch<T>(path, { method: "POST", body: JSON.stringify(body), timeoutMs: opts?.timeoutMs })
export const get = <T>(path: string) => smcFetch<T>(path, { method: "GET" })
/** multipart POST (report/file uploads). */
export const postForm = <T>(path: string, form: FormData) => smcFetch<T>(path, { method: "POST", body: form })
export { smcFetch }

/** Writes hit LIVE production data, so they are OFF unless this single, auditable
 *  flag is set (`VITE_SMC_WRITES_ENABLED=true`). Read-first by default. */
export const SMC_WRITES_ENABLED = String(import.meta.env.VITE_SMC_WRITES_ENABLED ?? "") === "true"

/** Gated write transport — every mutation routes through here. When writes are
 *  disabled it throws loudly instead of touching production. */
export function smcWrite<T>(path: string, body: unknown, form?: FormData): Promise<T> {
  if (!SMC_WRITES_ENABLED) {
    return Promise.reject(new SmcApiError(`Write to "${path}" blocked — set VITE_SMC_WRITES_ENABLED=true to enable live mutations (production data).`))
  }
  return form ? postForm<T>(path, form) : post<T>(path, body)
}

/** Hard stop for legacy write stubs kept for type-completeness. */
function blockedWrite(path: string): never {
  throw new SmcApiError(`Refusing to call live write endpoint "${path}" — use the gated smcWrite() / writes layer.`)
}

// ── read / non-destructive operations (safe against live data) ───────────────

/** The full package catalogue (categories, pricing, GST). Needs no user id, so
 *  it doubles as the connectivity probe. */
export const getAllPackages = () => post<PackagesData[]>("SoldService/getAllPackages", { id: 0 })

/** Counsellors ("navigators") available for a package + mode + location. */
export const getNavigatorsByPackage = (package_Id: number, mode: string, location: string) =>
  post<NavigatorListItem[]>("NavigatorList/GetNavigatorListByPackageId", { package_Id, mode, location })

/** A user's purchased services / sessions (live PII — caller supplies the id). */
export const getSessionsForUser = (user_id: number) => post<SessionItem[]>("SoldService/getSessionAll", { user_id })
export const getPurchasePackages = (userId: number) => get<{ success: boolean; data: SoldServiceData[] }>(`UserView/GetPurchasePackages/${userId}`)
export const getReportsForUser = (user_id: number) => get<ReportData[]>(`Reports/getAllReportsForUser/${user_id}`)
export const getUserView = (q: { mobile?: string; email?: string; userId?: number }) => post<UserData | UserData[]>("UserView", q)
export const primaryFormCheck = (user_id: number) => post<unknown[]>("SoldService/primaryFormCheck", { user_id })
export const getTestById = (user_id: number) => post<string[]>("SoldService/getTestbyId", { user_id })

// ── write operations — defined for type-completeness, guarded at runtime ──────

export const loginWithPassword = (_: { mobile?: string; email?: string; password: string }) => blockedWrite("User/LoginWithPassword")
export const sendOtp = (_: { mobile?: string; email?: string }) => blockedWrite("User/SendOtp")
export const createOrder = (_: { name: string; email: string; mobile: string; category: string; packageId: number; mode: string }) => blockedWrite("Payment/CreateOrder")

// ── live-display shapes (the API returns lowercase-first keys, not the PDF's
//    PascalCase — these match what actually comes back on the wire) ────────────

export interface SmcNavigator {
  id: string | number
  name?: string
  email?: string
  mobile?: string
  displayimg?: string
  img?: string
  about_navigator?: string
  about_navigator_full_des?: string
  practicing_expertise?: string
  experiance?: string
  education?: string
  location?: string
  language?: string
  certifications?: string
  achievments?: string
  short_Description?: string
  work_Experience?: string
  organzation_working_for?: string
  online_mode?: string
  isActive?: boolean | string
  meetinglink?: string
}

export interface SmcPurchase {
  id: string | number
  user_id?: string | number
  package_id?: string | number
  package_name?: string
  navigator_id?: string | number
  consulting_mode?: string
  payment_status?: string
  total_payment_amout?: string | number
  package_amout?: string | number
  razorpay_payment_id?: string
  razorpay_order_id?: string
  date?: string
  status?: string
  location?: string
  invoiceNumber?: string
  durationPerSession?: string
}

/** A registered user as it appears in the roster (`UserView {userId:0}`). Fields
 *  are sparse for most records; casing follows the wire. */
export interface SmcRosterUser {
  id: number
  Name?: string | null
  email?: string | null
  mobile?: string | null
  category?: string | null
  Sub_category?: string | null
  Service_Looking?: string | null
  gender?: string | null
  date?: string | null
  [k: string]: unknown
}

/** The full registered-user roster. Heavy (~1MB) — fetch sparingly / cache. */
export const fetchRoster = () => post<SmcRosterUser[]>("UserView", { userId: 0 })
/** A client's reports + purchases + sessions pulled together (read-only). */
export async function fetchClientBundle(userId: number): Promise<{ reports: ReportData[]; purchases: SmcPurchase[]; sessions: SessionItem[] }> {
  const [reports, purchasesRaw, sessions] = await Promise.all([
    getReportsForUser(userId).catch(() => [] as ReportData[]),
    getPurchasePackages(userId).catch(() => ({ success: false, data: [] as SoldServiceData[] })),
    getSessionsForUser(userId).catch(() => [] as SessionItem[]),
  ])
  const purchases = (Array.isArray(purchasesRaw) ? purchasesRaw : purchasesRaw?.data ?? []) as unknown as SmcPurchase[]
  return {
    reports: Array.isArray(reports) ? reports : [],
    purchases,
    sessions: Array.isArray(sessions) ? sessions : [],
  }
}

// ── health check (non-destructive) ───────────────────────────────────────────

export interface SmcHealth {
  ok: boolean
  status: number | null
  ms: number
  base: string
  packages: number | null
  error?: string
  /** epoch ms, stamped by the caller (no Date in pure helpers). */
  at?: number
}

/** Pings the catalogue endpoint and reports connectivity + latency. Read-only. */
export async function pingSmcApi(): Promise<SmcHealth> {
  const t0 = performance.now()
  try {
    const pkgs = await getAllPackages()
    return { ok: true, status: 200, ms: Math.round(performance.now() - t0), base: SMC_API_BASE, packages: Array.isArray(pkgs) ? pkgs.length : null }
  } catch (e) {
    const err = e as SmcApiError
    return { ok: false, status: err.status ?? null, ms: Math.round(performance.now() - t0), base: SMC_API_BASE, packages: null, error: err.message }
  }
}
