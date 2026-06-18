import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarCheck, ClipboardCheck, FileHeart, FileText, HeartPulse, MessageSquareHeart, Mic, ShieldCheck, Sparkles, Stethoscope, TrendingUp } from "lucide-react";

const points = [
  {
    title: "Find the appointment story",
    body: "Chief concern, timeline, severity, triggers, meds tried, and what changed since the last visit."
  },
  {
    title: "Catch weak spots",
    body: "Missing dates, unclear medication changes, vague pain descriptions, and unsupported claims."
  },
  {
    title: "Prioritize the visit",
    body: "A local model estimates whether the intake looks routine, worth discussion, or higher priority."
  }
];

const roadmap = [
  {
    title: "Before the visit",
    body: "Ask adaptive questions about symptoms, pain, medication changes, concerns, and what the patient wants answered."
  },
  {
    title: "After the visit",
    body: "Capture the clinician's take, prescriptions, instructions, and what the patient should watch next."
  },
  {
    title: "Between visits",
    body: "Track day one, day two, and ongoing updates so patterns do not disappear between appointments."
  },
  {
    title: "Long-term memory",
    body: "Build a patient-owned timeline of flares, triggers, meds, side effects, and doctor decisions."
  }
];

const junoInspired = [
  {
    title: "Voice or text check-ins",
    body: "Let patients log symptoms, pain, energy, sleep, mood, and medication updates by talking or typing.",
    icon: Mic
  },
  {
    title: "Longitudinal health profile",
    body: "Build a running profile from conversations, medical history, prescriptions, and repeated check-ins.",
    icon: HeartPulse
  },
  {
    title: "Pattern and trigger detection",
    body: "Spot recurring flare patterns across food, activity, sleep, stress, meds, weather, and timing.",
    icon: TrendingUp
  },
  {
    title: "Appointment-ready reports",
    body: "Generate a clean PDF for clinicians from weeks or months of patient-entered context.",
    icon: FileText
  },
  {
    title: "Biometrics and wearables",
    body: "Optionally connect heart rate, sleep, steps, and other signals when the patient wants that context included.",
    icon: CalendarCheck
  },
  {
    title: "Personalized guidance layer",
    body: "Use the patient history to suggest better questions, pacing reminders, and follow-up prompts without diagnosis.",
    icon: Sparkles
  }
];

export function LandingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid min-h-[calc(100vh-153px)] items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
        <div className="fade-up max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-strong)] shadow-sm">
            <Sparkles size={14} />
            Your health companion
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight text-[var(--foreground)] sm:text-6xl">
            Give clinicians their time back, before the visit begins.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--ink-soft)]">
            Clinicians are stretched thin and patients wait months to be seen. Mira automates the
            repetitive pre-visit prep - turning a patient&apos;s answers into a clean, triaged brief so
            the visit starts further ahead.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/workspace"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-strong)] hover:shadow-md"
            >
              Start Intake
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/why"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-6 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:shadow-sm"
            >
              Why Mira
            </Link>
          </div>
        </div>

        <div className="fade-up rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-card)]" style={{ animationDelay: "0.1s" }}>
          <div className="rounded-md bg-[var(--foreground)] p-5 text-white">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <FileHeart size={17} />
              What the doctor receives
            </div>
            <div className="mt-5 grid gap-3">
              <PreviewRow icon={<ClipboardCheck size={18} />} label="Visit brief" value="Chief concerns and timeline" />
              <PreviewRow icon={<FileHeart size={18} />} label="Follow-up gaps" value="What still needs asking" />
              <PreviewRow icon={<ShieldCheck size={18} />} label="Reliability" value="What may be unsupported" />
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {points.map((point) => (
              <div key={point.title} className="card-hover rounded-xl border border-[var(--line)] bg-[var(--muted)] p-4">
                <div className="text-sm font-semibold">{point.title}</div>
                <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{point.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] py-10">
        <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent-strong)]">Planned care journey</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">From appointment prep to health memory.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
            This prototype starts with pre-visit notes. The planned version follows the patient before the visit, after the visit, and through the days when treatment changes are actually felt.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {roadmap.map((item, index) => (
            <div key={item.title} className="card-hover rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                {index === 0 ? <ClipboardCheck size={19} /> : null}
                {index === 1 ? <Stethoscope size={19} /> : null}
                {index === 2 ? <MessageSquareHeart size={19} /> : null}
                {index === 3 ? <CalendarCheck size={19} /> : null}
              </div>
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{item.body}</p>
              <div className="mt-4 text-xs font-medium uppercase tracking-wide text-[var(--accent-strong)]">Coming soon</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--line)] py-10">
        <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent-strong)]">Where this is headed</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">A companion across the whole care journey.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
            Natural conversations, continuous tracking, pattern detection, longitudinal health
            profiles, biometrics, and appointment-ready reports. These are planned directions for
            Mira, not current features.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {junoInspired.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="card-hover rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon size={19} />
                </div>
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{item.body}</p>
                <div className="mt-4 text-xs font-medium uppercase tracking-wide text-[var(--accent-strong)]">Coming soon</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PreviewRow({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-white/10 p-3">
      <div className="flex items-center gap-3">
        <span className="text-emerald-200">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-right text-xs text-white/70">{value}</span>
    </div>
  );
}
