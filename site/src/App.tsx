import { Suspense } from "react"
import { Routes, Route, matchRoutes } from "react-router-dom"
import { useSmoothScroll } from "@/lib/motion"
import { Grain, Nav, Footer, ScrollProgress } from "@/components/Chrome"
import { CompassCursor } from "@/components/CompassCursor"
import { Splash } from "@/components/Splash"
import { CareerBar } from "@/components/CareerBar"
import { CookieConsent } from "@/components/CookieConsent"
import { lazyRoute, type RouteComponent } from "@/lib/lazy-route"

// Pages are split per route (see src/lib/lazy-route.ts). The shell above — nav, footer,
// Compass, consent — stays in the main bundle because every page renders it.
const Home = lazyRoute(() => import("@/pages/Home").then((m) => m.Home))
const Product = lazyRoute(() => import("@/pages/Product").then((m) => m.Product))
const Framework = lazyRoute(() => import("@/pages/Framework").then((m) => m.Framework))
const Solutions = lazyRoute(() => import("@/pages/Solutions").then((m) => m.Solutions))
const Library = lazyRoute(() => import("@/pages/Library").then((m) => m.Library))
const CareerPage = lazyRoute(() => import("@/pages/CareerPage").then((m) => m.CareerPage))
const Resources = lazyRoute(() => import("@/pages/Resources").then((m) => m.Resources))
const Videos = lazyRoute(() => import("@/pages/Videos").then((m) => m.Videos))
const Trust = lazyRoute(() => import("@/pages/Trust").then((m) => m.Trust))
const Pricing = lazyRoute(() => import("@/pages/Pricing").then((m) => m.Pricing))
const Book = lazyRoute(() => import("@/pages/Book").then((m) => m.Book))
const Contact = lazyRoute(() => import("@/pages/Contact").then((m) => m.Contact))
const Cri = lazyRoute(() => import("@/pages/Cri").then((m) => m.Cri))
const Fit = lazyRoute(() => import("@/pages/Fit").then((m) => m.Fit))
const CareerTestHub = lazyRoute(() => import("@/pages/CareerTest").then((m) => m.CareerTestHub))
const CareerTestAudience = lazyRoute(() => import("@/pages/CareerTest").then((m) => m.CareerTestAudience))
const CareerCounselling = lazyRoute(() => import("@/pages/CareerCounselling").then((m) => m.CareerCounselling))
const Counsellors = lazyRoute(() => import("@/pages/Counsellors").then((m) => m.Counsellors))
const Experts = lazyRoute(() => import("@/pages/Experts").then((m) => m.Experts))
const ExpertApply = lazyRoute(() => import("@/pages/ExpertApply").then((m) => m.ExpertApply))
const ExpertDetail = lazyRoute(() => import("@/pages/ExpertDetail").then((m) => m.ExpertDetail))
const Blog = lazyRoute(() => import("@/pages/Blog").then((m) => m.Blog))
const BlogPost = lazyRoute(() => import("@/pages/BlogPost").then((m) => m.BlogPost))
const LegalIndex = lazyRoute(() => import("@/pages/Legal").then((m) => m.LegalIndex))
const LegalPage = lazyRoute(() => import("@/pages/Legal").then((m) => m.LegalPage))
const SignIn = lazyRoute(() => import("@/pages/SignIn").then((m) => m.SignIn))
const Checkout = lazyRoute(() => import("@/pages/Checkout").then((m) => m.Checkout))
const Program = lazyRoute(() => import("@/pages/Program").then((m) => m.Program))
const NotFound = lazyRoute(() => import("@/pages/NotFound").then((m) => m.NotFound))

// `src` names the page module so the prerenderer can emit a <link rel="modulepreload">
// for the route's chunk next to the HTML. Without it the browser would only discover the
// chunk after the main bundle had executed — one extra round trip before hydration.
export const ROUTE_TABLE: { path: string; Page: RouteComponent; src: string }[] = [
  { path: "/", Page: Home, src: "src/pages/Home.tsx" },
  { path: "/product", Page: Product, src: "src/pages/Product.tsx" },
  { path: "/framework", Page: Framework, src: "src/pages/Framework.tsx" },
  { path: "/solutions", Page: Solutions, src: "src/pages/Solutions.tsx" },
  { path: "/library", Page: Library, src: "src/pages/Library.tsx" },
  { path: "/library/:id", Page: CareerPage, src: "src/pages/CareerPage.tsx" },
  { path: "/resources", Page: Resources, src: "src/pages/Resources.tsx" },
  { path: "/resources/videos", Page: Videos, src: "src/pages/Videos.tsx" },
  { path: "/trust", Page: Trust, src: "src/pages/Trust.tsx" },
  { path: "/pricing", Page: Pricing, src: "src/pages/Pricing.tsx" },
  { path: "/book", Page: Book, src: "src/pages/Book.tsx" },
  { path: "/contact", Page: Contact, src: "src/pages/Contact.tsx" },
  { path: "/cri", Page: Cri, src: "src/pages/Cri.tsx" },
  { path: "/fit", Page: Fit, src: "src/pages/Fit.tsx" },
  { path: "/career-test", Page: CareerTestHub, src: "src/pages/CareerTest.tsx" },
  { path: "/career-test/:audience", Page: CareerTestAudience, src: "src/pages/CareerTest.tsx" },
  { path: "/career-counselling", Page: CareerCounselling, src: "src/pages/CareerCounselling.tsx" },
  { path: "/career-counselling/:stage", Page: CareerCounselling, src: "src/pages/CareerCounselling.tsx" },
  { path: "/vclp/:audience", Page: CareerCounselling, src: "src/pages/CareerCounselling.tsx" },
  { path: "/counsellors", Page: Counsellors, src: "src/pages/Counsellors.tsx" },
  { path: "/experts", Page: Experts, src: "src/pages/Experts.tsx" },
  { path: "/experts/apply", Page: ExpertApply, src: "src/pages/ExpertApply.tsx" },
  { path: "/experts/:id", Page: ExpertDetail, src: "src/pages/ExpertDetail.tsx" },
  { path: "/blog", Page: Blog, src: "src/pages/Blog.tsx" },
  { path: "/blog/:slug", Page: BlogPost, src: "src/pages/BlogPost.tsx" },
  { path: "/legal", Page: LegalIndex, src: "src/pages/Legal.tsx" },
  { path: "/legal/:slug", Page: LegalPage, src: "src/pages/Legal.tsx" },
  { path: "/signin", Page: SignIn, src: "src/pages/SignIn.tsx" },
  { path: "/checkout/:tierId", Page: Checkout, src: "src/pages/Checkout.tsx" },
  { path: "/programs/:slug", Page: Program, src: "src/pages/Program.tsx" },
  { path: "*", Page: NotFound, src: "src/pages/NotFound.tsx" },
]

/** Load the page chunk for a URL. Called before hydration (client) and before rendering
 *  (prerender), so the first render never suspends and both sides produce the same HTML. */
export function preloadRoute(pathname: string): Promise<void> {
  const hit = matchRoutes(ROUTE_TABLE.map((r) => ({ path: r.path })), pathname)
  const path = hit?.[hit.length - 1]?.route.path
  const r = ROUTE_TABLE.find((x) => x.path === path)
  return r ? r.Page.preload() : Promise.resolve()
}

export function routeSourceFor(pathname: string): string | undefined {
  const hit = matchRoutes(ROUTE_TABLE.map((r) => ({ path: r.path })), pathname)
  const path = hit?.[hit.length - 1]?.route.path
  return ROUTE_TABLE.find((x) => x.path === path)?.src
}

export default function App() {
  useSmoothScroll()
  return (
    <>
      <Splash />
      <Grain />
      <ScrollProgress />
      <CompassCursor />
      <Nav />
      {/* Only reached on an in-app navigation to a page whose chunk is not loaded yet.
          React Router wraps navigations in a transition, so the current page stays on
          screen until the next one is ready instead of flashing this empty fallback. */}
      <Suspense fallback={<main className="min-h-[60vh]" aria-busy="true" />}>
        <Routes>
          {ROUTE_TABLE.map(({ path, Page }) => <Route key={path} path={path} element={<Page />} />)}
        </Routes>
      </Suspense>
      <Footer />
      <CareerBar />
      <CookieConsent />
    </>
  )
}
