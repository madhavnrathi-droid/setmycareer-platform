# Live-site fixes for setmycareer.com (the .php site)

These pages are served from a host this repository cannot reach, so the fixes are written here for whoever has access to it. Checked live on 4 October 2026.

## 1. Urgent: three money pages point their canonical at an unrelated page

A canonical tag tells Google which URL is the real one. These three tell Google they are duplicates of a blog page, so Google indexes the blog page instead and suppresses them. `/career-counselling-after-12th.php` targets "career options after 12th" (8,100 searches a month).

Replace the canonical tag in each page's <head>:

| Page | Currently points to | Change to |
|---|---|---|
| `/career-counselling-after-12th.php` | `https://setmycareer.com/blog/` | `https://setmycareer.com/career-counselling-after-12th.php` |
| `/career-counselling-after-graduation.php` | `https://setmycareer.com/blog/career-management.php` | `https://setmycareer.com/career-counselling-after-graduation.php` |
| `/career-guidance-after-post-graduation.php` | `https://setmycareer.com/blog/how-career-counselling-guides-you-to-the-right-career.php` | `https://setmycareer.com/career-guidance-after-post-graduation.php` |

Exact tag, per page:

```html
<link rel="canonical" href="https://setmycareer.com/career-counselling-after-12th.php" />
<link rel="canonical" href="https://setmycareer.com/career-counselling-after-graduation.php" />
<link rel="canonical" href="https://setmycareer.com/career-guidance-after-post-graduation.php" />
```

## 2. Add a self-canonical to the three VCLP pages

These have no canonical tag. Less harmful than a wrong one, but add it:

```html
<link rel="canonical" href="https://setmycareer.com/vclp/program-for-students.php" />
<link rel="canonical" href="https://setmycareer.com/vclp/program-for-graduates.php" />
<link rel="canonical" href="https://setmycareer.com/vclp/program-for-working-professionals.php" />
```

## 3. Titles and meta descriptions from the keyword strategy

From the KW and Link Mapping doc. Where the doc gave several pages the same primary keyword, each page here has a distinct one so they do not compete; this matches the new site.

| Page | Primary keyword | Title | Meta description |
|---|---|---|---|
| `/career-counselling-and-guidance.php` | career counselling | Career Counselling & Guidance in India \| SetMyCareer | Expert career counselling in India. Psychometric assessments & one-on-one guidance for students & professionals. Find your right path - book a free session. |
| `/career-guidance-for-class-8th-students.php` | career guidance for class 8 students | Career Guidance for Students \| Class 8 Expert Counselling | Career guidance for class 8 students. Explore career options, take aptitude tests & plan your future early. Expert counselling to help students choose right. |
| `/career-counselling-for-9th-students.php` | career guidance for class 9 students | Career Guidance for Class 9 Students \| Expert Counselling | Career counselling for class 9 students. Explore stream options, aptitude tests & career paths. Get expert guidance to plan your future with confidence. |
| `/career-counselling-after-10th.php` | career options after 10th | Career Options After 10th \| Stream Selection Guidance | Explore career options after 10th. Expert guidance on stream selection - Science, Commerce or Arts. Book a counselling session & choose the right path today. |
| `/career-counselling-for-11th-class-students.php` | career guidance for class 11 students | Career Guidance for Class 11 Students \| Plan Your Future | Career counselling for class 11 students. Expert guidance on subject selection, career planning & post-12th options. Start planning your future today. |
| `/career-counselling-after-12th.php` | career options after 12th | Career Options After 12th \| Expert Guidance & Counselling | Explore career options after 12th - Science, Commerce & Arts. Expert counselling to choose the right course & college. Book your session with SetMyCareer. |
| `/career-counselling-after-graduation.php` | career options after graduation | Career Options After Graduation \| Counselling & Guidance | Explore career options after graduation. Expert counselling on jobs, higher studies & career planning. Get personalized guidance for your next big move. |
| `/career-guidance-after-post-graduation.php` | career guidance after post graduation | Career Guidance After Post Graduation \| Expert Counselling | Career guidance after post graduation. Explore career options after Masters, MBA or PhD. Expert counselling to plan your next strategic career move. |
| `/career-counselling-for-working-professionals.php` | career change | Career Change Counselling for Working Professionals | Expert career change counselling for working professionals. Guidance on mid-career transitions, career growth & new directions. Book your session today. |
| `/vclp/program-for-students.php` | career development program for students | Career Development Program for Students \| VCLP SetMyCareer | VCLP career development program for students. Psychometric assessments, expert mentorship & career planning. Build your future with clarity and confidence. |
| `/vclp/program-for-graduates.php` | career development training program | Career Development Program for Graduates \| VCLP SetMyCareer | A career development training program for graduates: measured aptitude, a counsellor who tracks progress, and a credible route into the field you want. |
| `/vclp/program-for-working-professionals.php` | employee career development program | Employee Career Development Program \| SetMyCareer | An employee career development program for professionals and teams. Measured aptitude, an honest readiness read, and the roles reachable from where you are. |

## 4. At cutover: 301 redirects from each .php page to the new site

When setmycareer.com moves to the new site, redirect each old URL so its rankings carry over. Source of truth: `PHP_REDIRECTS` in `site/src/content/kw-map.ts`.

| Old URL | New URL |
|---|---|
| `/career-counselling-and-guidance.php` | `/career-counselling` |
| `/career-guidance-for-class-8th-students.php` | `/career-counselling/class-8` |
| `/career-counselling-for-9th-students.php` | `/career-counselling/class-9` |
| `/career-counselling-after-10th.php` | `/career-counselling/after-10th` |
| `/career-counselling-for-11th-class-students.php` | `/career-counselling/class-11` |
| `/career-counselling-after-12th.php` | `/career-counselling/after-12th` |
| `/career-counselling-after-graduation.php` | `/career-counselling/after-graduation` |
| `/career-guidance-after-post-graduation.php` | `/career-counselling/after-post-graduation` |
| `/career-counselling-for-working-professionals.php` | `/career-counselling/working-professionals` |
| `/vclp/program-for-students.php` | `/vclp/students` |
| `/vclp/program-for-graduates.php` | `/vclp/graduates` |
| `/vclp/program-for-working-professionals.php` | `/vclp/professionals` |
