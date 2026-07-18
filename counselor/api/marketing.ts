// Vercel Edge function: POST /api/marketing → Google Ads spend (server-only creds).
import { runMarketing } from "../src/server/marketing-core"

export const config = { runtime: "edge" }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 })
  try {
    return await runMarketing({
      devToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      clientId: process.env.GOOGLE_ADS_CLIENT_ID,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      customerId: process.env.GOOGLE_ADS_CUSTOMER_ID,
      loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      currency: process.env.GOOGLE_ADS_CURRENCY,
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ connected: false, error: err instanceof Error ? err.message : "Marketing error" }),
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }
}
