import { AppFrame } from "@/components/AppFrame";

const cards = [
  {
    title: "Problem",
    body: "People with chronic illness often have scattered symptom notes and short appointments. A model can help organize notes, but missed negation, invented symptoms, or wrong timing can change the story."
  },
  {
    title: "Model Approach",
    body: "Several components work together: deterministic, negation-aware safety rules drive the urgency triage score; a from-scratch TF-IDF + multinomial logistic regression classifier and a fine-tuned DistilBERT transformer both classify the symptom area and are compared head-to-head in an agreement panel that surfaces disagreement; and a general-purpose language model handles structured extraction, cautious generation, and a self-audit in a single pass."
  },
  {
    title: "Data Augmentation",
    body: "The stress test creates noisy variants with typos, vague timing, missing punctuation, negation, contradictions, urgent language, and long paragraphs."
  },
  {
    title: "Metrics",
    body: "The prototype reports local classifier test accuracy, extraction F1, hallucination rate, negation accuracy, temporal accuracy, supported claims, missed details, and safety flags."
  }
];

const iterationRows = [
  {
    finding: "Negation heavy notes can be misunderstood",
    improvement: "Added explicit negated symptom extraction and a negation error count in the evaluator",
    metric: "Negation accuracy"
  },
  {
    finding: "Summaries can imply causation without enough evidence",
    improvement: "Added instructions to phrase patterns cautiously and evaluate unsupported causation",
    metric: "Hallucination rate and temporal accuracy"
  },
  {
    finding: "Urgent language should not depend only on generated text",
    improvement: "Added a rule based safety check before the model generated summary is shown",
    metric: "Urgent risk terms"
  }
];

const roadmapRows = [
  {
    phase: "Before appointment",
    current: "Patient completes a pre-visit intake and generates a brief",
    planned: "Adaptive questions based on earlier answers, symptom history, pain, meds, and patient goals"
  },
  {
    phase: "During or after appointment",
    current: "Doctor brief can be exported",
    planned: "Record clinician takeaways, prescriptions, next steps, and follow-up instructions"
  },
  {
    phase: "Between appointments",
    current: "Single-run local result",
    planned: "Daily check-ins for symptoms, pain, side effects, and treatment response"
  },
  {
    phase: "Long-term use",
    current: "Browser-local latest result",
    planned: "Patient-owned health timeline with flares, triggers, meds, and visit decisions"
  }
];

const junoRows = [
  "Voice or text symptom check-ins",
  "Longitudinal health profile from conversations and history",
  "Pattern and trigger detection over weeks and months",
  "Appointment-ready reports for doctors",
  "Biometrics and wearable context",
  "Personalized non-diagnostic guidance based on patient history"
];

export default function Method() {
  return (
    <AppFrame>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Method &amp; Evaluation</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">
            How Mira turns messy patient notes into a reliable pre-visit brief, and how each model
            is evaluated so the output can be trusted.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <section key={card.title} className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{card.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Evaluation Guided Improvements</h2>
          <div className="mt-4 overflow-x-auto rounded-md border border-[var(--line)] soft-scroll">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[var(--muted)] text-xs uppercase text-[var(--ink-soft)]">
                <tr>
                  <th className="px-4 py-3">Evaluation finding</th>
                  <th className="px-4 py-3">Prototype change</th>
                  <th className="px-4 py-3">Metric used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {iterationRows.map((row) => (
                  <tr key={row.finding}>
                    <td className="px-4 py-4 text-[var(--foreground)]">{row.finding}</td>
                    <td className="px-4 py-4 text-[var(--ink-soft)]">{row.improvement}</td>
                    <td className="px-4 py-4 font-medium">{row.metric}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Trained Local Model</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            I trained two TF-IDF + multinomial logistic regression classifiers from scratch in
            JavaScript - no Python, no scikit-learn, no external ML libraries. Training data
            combines the public <code>gretelai/symptom_to_diagnosis</code> corpus with ~220
            synthesised intake-meta sentences (assigned to a dedicated{" "}
            <code>no_clear_domain</code> class), ~300 multi-symptom intake-style examples, and
            hand-written domain anchors for under-represented presentations like hypertension and
            lower back pain. Features are unigrams and bigrams (so &ldquo;chest pain&rdquo; and
            &ldquo;blurred vision&rdquo; count as their own discriminative features) with
            L2-normalised TF-IDF weighting. The model is trained with SGD with L2 regularisation
            for 35 epochs.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            At inference each intake note is split into sentences and classified individually.
            Sentences predicted as <code>no_clear_domain</code> with high confidence (intake meta
            like &ldquo;tried ibuprofen&rdquo;) are dropped before the remaining sentences vote on
            a domain. The chosen prediction is fed live into the intake UI AND passed into the
            language model prompt as a second opinion. Evaluation: ~98% on the held-out Gretel test split,
            ~100% on a held-out hand-built intake-style validation set (20 cases the model never
            saw in training), ~91% on the priority classifier.
          </p>
        </section>

        <section className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Fine-tuned Transformer + Classical-vs-Neural Comparison</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            A <code>distilbert-base-uncased</code> transformer was <strong>fine-tuned</strong> on the
            combined symptom corpus (<code>gretelai/symptom_to_diagnosis</code> +{" "}
            <code>NeuronZero/Symptom2Disease</code>, ~2,000 rows mapped into the same 7 domains) with
            class weighting and early stopping, then exported to ONNX and run in-app through
            Transformers.js. On the held-out test split it reached{" "}
            <strong>99.5% accuracy / 0.994 macro-F1</strong>, versus{" "}
            <strong>98.6% / 0.988</strong> for the from-scratch TF-IDF + logistic regression model.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            Both trained models classify each note&rsquo;s symptom area, and the results page compares
            them head-to-head. The comparison is itself an evaluation artifact: when the classical and
            neural models split on a domain, the note is flagged as ambiguous. The per-class report
            shows the weakest domain is <code>metabolic_or_systemic</code> (recall 0.94), which is
            also the smallest class (17 test examples). That points directly at class imbalance as
            the next thing to fix with more data.
          </p>
        </section>

        <section className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Product Roadmap</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            The useful product is not only a one-time summary. The longer-term app should help a patient prepare before a visit, capture what the clinician said afterward, and monitor what happens during the days after a treatment change.
          </p>
          <div className="mt-4 overflow-x-auto rounded-md border border-[var(--line)] soft-scroll">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[var(--muted)] text-xs uppercase text-[var(--ink-soft)]">
                <tr>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Current prototype</th>
                  <th className="px-4 py-3">Coming next</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {roadmapRows.map((row) => (
                  <tr key={row.phase}>
                    <td className="px-4 py-4 font-medium">{row.phase}</td>
                    <td className="px-4 py-4 text-[var(--ink-soft)]">{row.current}</td>
                    <td className="px-4 py-4 text-[var(--foreground)]">{row.planned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Planned Directions</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            The longer-term vision is a chronic-illness companion with natural conversations, continuous
            symptom tracking, longitudinal context, pattern detection, biometrics, and appointment-ready
            reports. This prototype focuses on the first and highest-leverage step: reliable pre-visit intake.
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {junoRows.map((row) => (
              <div key={row} className="rounded-md border border-[var(--line)] bg-[var(--muted)] p-3 text-sm">
                {row}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Audio Credits</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            Ambient rainfall loop:{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Sound_of_light_rainfall.ogg"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--accent-strong)] underline-offset-2 hover:underline"
            >
              &ldquo;Sound of light rainfall&rdquo;
            </a>{" "}
            from Wikimedia Commons, used under CC BY-SA 4.0. UI sounds are synthesized in-browser
            with the Web Audio API.
          </p>
        </section>

        <section className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Summary</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            Mira combines trained local NLP classifiers (a from-scratch TF-IDF model and a
            fine-tuned DistilBERT transformer) with a general pre-trained language model, applied to
            chronic-illness note understanding through task-specific schemas and evaluator prompts.
            Instead of treating the summary as automatically correct, the app checks unsupported claims,
            missed details, negation, timing, and safety risk, so clinicians get data they can trust.
          </p>
        </section>
      </div>
    </AppFrame>
  );
}
