import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Compass,
  GraduationCap,
  Mic2,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_SMC_API_BASE || "";

const profileOptions = [
  "Student (8-10 Std)",
  "Student (11-12 Std)",
  "Student (UG)",
  "Student (PG)",
  "Parent (8-10 Std)",
  "Parent (11-12 Std)",
  "Parent (UG)",
  "Parent (PG)",
  "Working Professional (1-10 yrs exp)",
  "Senior Working Professional (10+ yrs exp)",
  "Executive with Career Break",
  "Principal/Teacher",
  "Others",
];

const services = [
  {
    title: "Career Counselling",
    note: "Structured discussion plus psychometric inputs for students, graduates, and professionals.",
    icon: Compass,
  },
  {
    title: "Psychometric Assessment",
    note: "Aptitude, interests, behaviour, and personality signals interpreted by qualified counsellors.",
    icon: BarChart3,
  },
  {
    title: "Career Coaching & Mentoring",
    note: "Goal planning, career growth, transition support, and restart guidance.",
    icon: UserRoundCheck,
  },
  {
    title: "Personality Development",
    note: "Confidence, communication, interview readiness, CV writing, and personal growth support.",
    icon: Sparkles,
  },
];

const suggestedQuestions = [
  "Which stream should I choose after 10th?",
  "I am confused between design, psychology, and business. How should I decide?",
  "Can you explain my assessment results in simple language?",
  "I want to restart my career after a break. What should I prepare first?",
];

const mockResults = [
  { label: "Career clarity", value: 72, tone: "green" },
  { label: "Self-understanding", value: 81, tone: "blue" },
  { label: "Decision confidence", value: 64, tone: "amber" },
];

function App() {
  const [profile, setProfile] = useState("Student (11-12 Std)");
  const [goal, setGoal] = useState("I want to choose the right stream and understand my best-fit careers.");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    {
      role: "assistant",
      content:
        "Hi, I am the SetMyCareer AI counsellor. I can help you prepare questions, understand assessment results, and decide whether to book a counsellor.",
    },
  ]);
  const [booking, setBooking] = useState({ name: "", phone: "", slot: "Today, 6:00 PM" });
  const [loading, setLoading] = useState(false);

  const context = useMemo(
    () =>
      [
        `Client profile: ${profile}`,
        `Client stated goal: ${goal}`,
        "SetMyCareer model: scientific and data-driven career counselling; 360-degree qualitative and quantitative understanding; psychometric assessments; certified counsellor interpretation; personalized action plan.",
        "Boundaries: this assistant is decision support. It must not diagnose, guarantee admissions/jobs, or replace a certified counsellor.",
      ].join("\n"),
    [profile, goal],
  );

  async function askAssistant(nextMessage = message) {
    const trimmed = nextMessage.trim();
    if (!trimmed) return;

    const nextChat = [...chat, { role: "user", content: trimmed }];
    setChat(nextChat);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          mode: "strategize",
          context,
          history: nextChat.slice(-6),
        }),
      });

      if (!response.ok) throw new Error("Assistant request failed");
      const data = await response.json();
      setChat([...nextChat, { role: "assistant", content: data.reply || "I am here. Could you tell me a little more?" }]);
    } catch {
      setChat([
        ...nextChat,
        {
          role: "assistant",
          content:
            "I could not reach the live AI endpoint from this preview, but the handoff is ready: connect VITE_SMC_API_BASE to the FastAPI backend and this chat will use /api/chat.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function bookCounsellor(event) {
    event.preventDefault();
    const name = booking.name || "Client";
    setChat((items) => [
      ...items,
      {
        role: "assistant",
        content: `${name}, your counsellor booking request is drafted for ${booking.slot}. In production this should write to the CRM/calendar and notify the SetMyCareer counsellor team.`,
      },
    ]);
  }

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="SetMyCareer client home">
          <span className="brand-mark">SMC</span>
          <span>
            <strong>SetMyCareer</strong>
            <small>Client counselling portal</small>
          </span>
        </a>
        <nav aria-label="Primary">
          <a href="#ask">Ask AI</a>
          <a href="#results">Results</a>
          <a href="#book">Book counsellor</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="section-label">Scientific and data-driven career guidance</p>
          <h1>Ask, understand your results, and book the right SetMyCareer counsellor.</h1>
          <p>
            A client-side experience for students, parents, graduates, and professionals. It keeps the AI helpful, grounded,
            and clear about when a human counsellor should step in.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#ask">
              Start with AI <ArrowRight size={18} />
            </a>
            <a className="secondary-action" href="#book">Book counsellor</a>
          </div>
        </div>

        <div className="hero-panel" aria-label="Counselling journey">
          <div className="journey-step active">
            <GraduationCap size={22} />
            <span>Profile and goal</span>
            <strong>{profile}</strong>
          </div>
          <ChevronRight className="journey-arrow" />
          <div className="journey-step">
            <BookOpenCheck size={22} />
            <span>Assessment and chat</span>
            <strong>RIASEC, Big Five, transcript context</strong>
          </div>
          <ChevronRight className="journey-arrow" />
          <div className="journey-step">
            <CalendarCheck size={22} />
            <span>Human counsellor</span>
            <strong>1:1 session and action plan</strong>
          </div>
        </div>
      </section>

      <section className="intake-grid">
        <div className="panel">
          <div className="panel-heading">
            <Compass size={20} />
            <h2>Client intake</h2>
          </div>
          <label>
            Profile
            <select value={profile} onChange={(event) => setProfile(event.target.value)}>
              {profileOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            Current question or goal
            <textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={5} />
          </label>
        </div>

        <div className="panel service-panel">
          <div className="panel-heading">
            <ShieldCheck size={20} />
            <h2>SetMyCareer scope</h2>
          </div>
          <div className="service-list">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <article key={service.title}>
                  <Icon size={19} />
                  <div>
                    <strong>{service.title}</strong>
                    <p>{service.note}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="chat-panel panel" id="ask">
          <div className="panel-heading">
            <Sparkles size={20} />
            <h2>AI career counsellor</h2>
          </div>
          <div className="suggestions">
            {suggestedQuestions.map((question) => (
              <button key={question} type="button" onClick={() => askAssistant(question)}>
                {question}
              </button>
            ))}
          </div>
          <div className="messages" aria-live="polite">
            {chat.map((item, index) => (
              <div className={`message ${item.role}`} key={`${item.role}-${index}`}>
                {item.content}
              </div>
            ))}
            {loading ? <div className="message assistant">Thinking through your career question...</div> : null}
          </div>
          <form
            className="ask-form"
            onSubmit={(event) => {
              event.preventDefault();
              askAssistant();
            }}
          >
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about streams, career fit, transitions, reports, or counsellor booking..."
            />
            <button type="submit" aria-label="Send question">
              <Send size={18} />
            </button>
          </form>
        </div>

        <aside className="side-stack">
          <section className="panel" id="results">
            <div className="panel-heading">
              <BarChart3 size={20} />
              <h2>Results snapshot</h2>
            </div>
            <div className="result-list">
              {mockResults.map((item) => (
                <div className="result-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}%</strong>
                  <div className="meter">
                    <i className={item.tone} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="fine-print">
              Replace this demo snapshot with `/api/inventories/score`, `/api/career/analyze`, and saved report data.
            </p>
          </section>

          <section className="panel voice-card">
            <div className="panel-heading">
              <Mic2 size={20} />
              <h2>Voice-ready</h2>
            </div>
            <p>
              The matching `voice-agent` folder contains LiveKit-ready prompt, tool, and knowledge assets for a later
              Claude migration.
            </p>
          </section>
        </aside>
      </section>

      <section className="booking panel" id="book">
        <div>
          <div className="panel-heading">
            <CalendarCheck size={20} />
            <h2>Book a counsellor</h2>
          </div>
          <p>
            Capture intent now; wire this to the existing CRM, calendar, Zoho/Google Meet, or Appwrite/Supabase booking
            tables in the next step.
          </p>
        </div>
        <form onSubmit={bookCounsellor}>
          <input
            value={booking.name}
            onChange={(event) => setBooking({ ...booking, name: event.target.value })}
            placeholder="Client name"
          />
          <input
            value={booking.phone}
            onChange={(event) => setBooking({ ...booking, phone: event.target.value })}
            placeholder="Phone or WhatsApp"
          />
          <select value={booking.slot} onChange={(event) => setBooking({ ...booking, slot: event.target.value })}>
            <option>Today, 6:00 PM</option>
            <option>Tomorrow, 11:00 AM</option>
            <option>Saturday, 4:00 PM</option>
          </select>
          <button type="submit">
            <CheckCircle2 size={18} />
            Draft booking
          </button>
        </form>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
