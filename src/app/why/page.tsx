import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarX,
  Clock,
  Database,
  FileText,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Users,
  Zap
} from "lucide-react";
import { AppFrame } from "@/components/AppFrame";

const stats = [
  {
    value: "Up to 10M",
    label: "shortage of health workers projected worldwide by 2030",
    source: "WHO",
    icon: Users
  },
  {
    value: "~36 min",
    label: "spent in the medical record for every 30-minute primary care visit",
    source: "AMA",
    icon: Clock
  },
  {
    value: "~42%",
    label: "of physicians report at least one symptom of burnout",
    source: "AMA, 2025",
    icon: Activity
  }
];

const today = [
  {
    title: "Adaptive intake",
    body: "Patients answer one question at a time. Follow-ups appear only when an answer needs them, so the history is complete without being a form-filling chore.",
    icon: HeartPulse
  },
  {
    title: "Urgency triage with a safety net",
    body: "A rule-based score with deterministic red-flag checks estimates how soon the patient should be seen, so the most urgent cases surface first.",
    icon: Zap
  },
  {
    title: "A structured, ready-to-read brief",
    body: "Free-text answers become a clean summary: concerns, timeline, medications, what was tried, and what still needs clarifying.",
    icon: FileText
  },
  {
    title: "Data a clinician can trust",
    body: "Two trained models cross-check the symptom area and the LLM audits its own output, so the brief flags what is uncertain instead of hiding it.",
    icon: ShieldCheck
  }
];

const roadmap = [
  {
    title: "After the visit",
    body: "Capture the clinician's takeaways, prescriptions, and next steps so nothing is lost on the walk to the car."
  },
  {
    title: "Between visits",
    body: "Lightweight check-ins track symptoms, side effects, and treatment response so patterns are not forgotten by the next appointment."
  },
  {
    title: "Longitudinal memory",
    body: "A patient-owned timeline of flares, triggers, medications, and decisions that any clinician can read in seconds."
  },
  {
    title: "Clinician dashboard & EHR export",
    body: "Triaged, structured intakes delivered into the tools clinicians already use, instead of another tab to check."
  }
];

export default function Why() {
  return (
    <AppFrame>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-strong)] shadow-sm">
            <HeartPulse size={14} />
            Why I am building Mira
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Healthcare is running out of time. I want to give some back.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--ink-soft)]">
            There are not enough clinicians, and the ones working today spend hours on paperwork
            instead of patients. Meanwhile people wait months to be seen. Mira automates the
            repetitive prep around a visit so clinicians can spend their limited time where it
            actually matters.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/workspace"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-strong)]"
            >
              Try the intake
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/method"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-6 text-sm font-semibold transition hover:border-[var(--accent)]"
            >
              How it works
            </Link>
          </div>
        </section>

        {/* The wait, patient side */}
        <section className="mt-12 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
              <CalendarX size={16} />
              The wait is real
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Six months for a headache.</h2>
            <p className="mt-3 text-base leading-7 text-[var(--ink-soft)]">
              I have had migraines since April. When I finally asked for a neurology appointment, the
              earliest date available was January 2027, six months away. The honest question was: how
              do you live with a headache like that for six more months?
            </p>
            <p className="mt-3 text-base leading-7 text-[var(--ink-soft)]">
              That wait is not unusual. Specialist backlogs stretch for months because there simply
              are not enough hours of clinician time to go around. Every minute a clinician spends on
              work that could be automated is a minute another patient keeps waiting.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--foreground)] p-6 text-white shadow-sm">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-soft)]">
              <Stethoscope size={16} />
              The other side of the door
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Clinicians are stretched thin.</h2>
            <p className="mt-3 text-base leading-7 text-white/75">
              The people inside the system are carrying long hours, heavy administrative loads, and
              after-hours documentation often called &ldquo;pajama time.&rdquo; Burnout pushes
              experienced clinicians to cut back or leave, which shrinks capacity further and makes the
              wait times worse. It is a loop.
            </p>
            <p className="mt-3 text-base leading-7 text-white/75">
              You cannot fix that by asking people to work harder. You fix it by taking the repetitive
              work off their plate.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon size={19} />
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-tight">{stat.value}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{stat.label}</p>
                <div className="mt-3 text-[11px] font-medium uppercase tracking-wide text-[var(--ink-soft)]">
                  Source: {stat.source}
                </div>
              </div>
            );
          })}
        </section>

        {/* Our bet */}
        <section className="mt-12 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
            <Zap size={16} />
            Our approach
          </div>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
            Automate the repetitive. Protect the human part.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--ink-soft)]">
            Mira does not try to replace clinical judgment, and it does not diagnose. It removes
            the manual work that surrounds judgment: collecting a clear history, structuring it,
            flagging how urgent it looks, and checking it for gaps. The clinician opens the visit with
            clean, reliable, already-organized information instead of starting from a blank page.
          </p>
          <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--muted)] p-5">
            <div className="text-sm font-semibold">Why pre-visit intake first?</div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">
              Because it is the highest-leverage, lowest-risk place to start. Intake is repetitive and
              time-consuming, and it does not require a clinician to collect. Done well, it shortens
              visits, surfaces urgent cases sooner, and means fewer wasted appointments. This is step
              one. The rest of the workflow comes next.
            </p>
          </div>
        </section>

        {/* What it does today */}
        <section className="mt-6">
          <h2 className="text-2xl font-semibold">What Mira does today</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {today.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon size={19} />
                  </div>
                  <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Roadmap */}
        <section className="mt-12">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-[var(--accent)]" />
            <h2 className="text-2xl font-semibold">What comes next</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">
            Pre-visit intake is the first step. The same idea, taking repetitive work off clinicians
            and giving them better data, extends across the whole care journey.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {roadmap.map((item) => (
              <div key={item.title} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{item.body}</p>
                <div className="mt-4 text-xs font-medium uppercase tracking-wide text-[var(--accent-strong)]">
                  Coming soon
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mt-12 rounded-2xl border border-[var(--line)] bg-[var(--foreground)] p-8 text-center text-white shadow-sm">
          <h2 className="text-2xl font-semibold sm:text-3xl">Give clinicians their time back.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/75">
            Every visit that starts with a clear, triaged brief is a few minutes returned to the
            person who needs them most.
          </p>
          <Link
            href="/workspace"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          >
            Try the intake
            <ArrowRight size={18} />
          </Link>
        </section>

        {/* Sources */}
        <section className="mt-8 text-xs leading-6 text-[var(--ink-soft)]">
          <p className="font-semibold">Sources</p>
          <ul className="mt-1 space-y-1">
            <li>
              Health worker shortage:{" "}
              <a
                href="https://www.who.int/health-topics/health-workforce"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
              >
                World Health Organization
              </a>
            </li>
            <li>
              Time in the medical record &amp; burnout:{" "}
              <a
                href="https://www.ama-assn.org/practice-management/digital-health/primary-care-visits-run-half-hour-time-ehr-36-minutes"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
              >
                American Medical Association
              </a>
            </li>
          </ul>
          <p className="mt-3">
            Mira is a prototype. It is not a medical device and does not provide diagnosis or
            treatment advice.
          </p>
        </section>
      </div>
    </AppFrame>
  );
}
