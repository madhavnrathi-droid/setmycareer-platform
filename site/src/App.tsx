import { Routes, Route } from "react-router-dom"
import { useSmoothScroll } from "@/lib/motion"
import { Grain, Nav, Footer, ScrollProgress } from "@/components/Chrome"
import { CompassCursor } from "@/components/CompassCursor"
import { Splash } from "@/components/Splash"
import { Home } from "@/pages/Home"
import { Product } from "@/pages/Product"
import { Framework } from "@/pages/Framework"
import { Solutions } from "@/pages/Solutions"
import { Library } from "@/pages/Library"
import { CareerPage } from "@/pages/CareerPage"
import { Resources } from "@/pages/Resources"
import { Videos } from "@/pages/Videos"
import { Trust } from "@/pages/Trust"
import { Pricing } from "@/pages/Pricing"
import { Book } from "@/pages/Book"
import { Contact } from "@/pages/Contact"
import { Cri } from "@/pages/Cri"
import { Fit } from "@/pages/Fit"
import { CareerBar } from "@/components/CareerBar"
import { CookieConsent } from "@/components/CookieConsent"
import { Counsellors } from "@/pages/Counsellors"
import { Experts } from "@/pages/Experts"
import { ExpertApply } from "@/pages/ExpertApply"
import { ExpertDetail } from "@/pages/ExpertDetail"
import { Blog } from "@/pages/Blog"
import { BlogPost } from "@/pages/BlogPost"
import { LegalIndex, LegalPage } from "@/pages/Legal"
import { SignIn } from "@/pages/SignIn"
import { Checkout } from "@/pages/Checkout"
import { Program } from "@/pages/Program"
import { NotFound } from "@/pages/NotFound"

export default function App() {
  useSmoothScroll()
  return (
    <>
      <Splash />
      <Grain />
      <ScrollProgress />
      <CompassCursor />
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product" element={<Product />} />
        <Route path="/framework" element={<Framework />} />
        <Route path="/solutions" element={<Solutions />} />
        <Route path="/library" element={<Library />} />
        <Route path="/library/:id" element={<CareerPage />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/resources/videos" element={<Videos />} />
        <Route path="/trust" element={<Trust />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/book" element={<Book />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cri" element={<Cri />} />
        <Route path="/fit" element={<Fit />} />
        <Route path="/counsellors" element={<Counsellors />} />
        <Route path="/experts" element={<Experts />} />
        <Route path="/experts/apply" element={<ExpertApply />} />
        <Route path="/experts/:id" element={<ExpertDetail />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/legal" element={<LegalIndex />} />
        <Route path="/legal/:slug" element={<LegalPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/checkout/:tierId" element={<Checkout />} />
        <Route path="/programs/:slug" element={<Program />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <CareerBar />
      <CookieConsent />
    </>
  )
}
