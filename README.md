# Mira

Mira is a pre-visit health intake companion. A patient answers a short intake, and Mira turns the messy free text into a timeline and a doctor-ready brief, then checks its own work before showing anything. I built it as an NLP course project, so the focus is less on a polished product and more on getting the language handling right and being honest about where it breaks.

Live demo: https://medical.aher.dev

## The problem I cared about

People with chronic illness often wait months to be seen, and then the appointment is short and their history is scattered across notes, apps, and memory. A model can tidy that up, but on real patient text three mistakes change everything:

- Missed negation, where "no chest pain" gets read as chest pain
- Invented symptoms that were never in the note
- Events placed in the wrong order

Those are exactly the errors a clinician cannot afford, so the whole evaluation is built around catching them rather than around a single accuracy number.

## What it does

- Collects symptom notes through a short guided intake
- Extracts a timeline where every event carries a quote copied straight from the note, so nothing is free floating
- Writes a cautious doctor brief with concerns, medication changes, questions, and open uncertainties
- Classifies the note into a symptom domain with two independent models and compares them side by side
- Runs a deterministic urgency triage with negation-aware red-flag rules before anything is displayed
- Audits the generated text for unsupported claims, missed details, negation slips, and temporal slips
- Ships stress tests for typo-heavy, vague, negated, contradictory, and urgent notes

## How the pipeline is layered

Mira runs five layers, classical through neural, and the rule is that the safety rules sit underneath the models so a confident model cannot override them.

1. **Triage rules** drive the urgency score. These are deterministic and negation-aware, so urgency never depends on generated text.
2. **TF-IDF + multinomial logistic regression**, written from scratch in JavaScript, reads the symptom domain. Bundled in `src/lib/ml/model.json`.
3. **Fine-tuned DistilBERT** reads the same domain as a neural second opinion, running in process through Transformers.js (ONNX runtime).
4. **A pre-trained language model (Gemini)** handles extraction, the summary, and the self-audit in one pass, with a schema that forces a source quote on every event.
5. **An agreement panel** compares the classical and neural models head to head. When they disagree, the note's domain is ambiguous and gets flagged for a human instead of one model being silently wrong.

## Transfer learning

I use two pre-trained models in two different ways.

- **DistilBERT, fine-tuned.** I take the general base model and train the weights on the symptom corpus with class weighting and early stopping, then run it locally. The training notebook is `notebooks/finetune_distilbert.ipynb`. The fine-tuned model is published on the Hugging Face Hub as [`jaydeep123423/mira-symptom-domain`](https://huggingface.co/jaydeep123423/mira-symptom-domain) (around 64MB quantized ONNX, public, no token needed at runtime) and is loaded in `src/lib/transformerModel.ts`.
- **Gemini, adapted by prompting.** I do not retrain it. I steer it with a schema that requires a source quote for every extracted event, so the summary stays anchored to the note.

The from-scratch TF-IDF model exists so the transformer has an honest classical opponent rather than a strawman.

## Local setup

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`. The fine-tuned DistilBERT model is pulled from the Hugging Face Hub on first use and cached on disk, so the first analyze request after a cold start is slower than the rest.

## The local TF-IDF model

The checked-in classical model is trained from the public `gretelai/symptom_to_diagnosis` dataset on Hugging Face, plus synthetic intake-style examples for meta notes ("tried ibuprofen") and multi-symptom notes. The script trains a TF-IDF multinomial logistic regression model and writes the artifact to `src/lib/ml/model.json`.

Current checked-in model:

- Model type: TF-IDF multinomial logistic regression
- Vocabulary size: 6,976 terms
- Training rows: 5,993
- Test rows: 332
- Domain test accuracy: 97.9 percent
- Priority test accuracy: 91.3 percent

For comparison, the fine-tuned DistilBERT reaches around 99.5 percent accuracy and 0.994 macro-F1 on the held-out split.

Retrain the classical model:

```bash
npm run train:local-nlp
```

## Evaluation

I evaluate with two complementary lenses, because a model can pick the right symptom area and still invent a detail.

- **Lens A, did it pick the right label:** accuracy, macro-F1, per-class recall, and the live agreement check between the two domain models.
- **Lens B, is the summary faithful:** hallucination rate, negation accuracy, and temporal accuracy, across seven stress categories.

Evaluation also drove the fixes. Negation-heavy notes were misread, so I added negated-symptom events and a negation-error count. Causation was implied too freely, so I forced cautious phrasing. Urgency could not safely depend on generated text, so I added the rule-based gate. To stay honest: the classifier numbers are real held-out results, while the stress-test metrics are estimated today, and the next step is a human-labelled gold set.

## Pages

- `Home`: project entry point
- `Why`: the framing, the problem, and the motivation
- `Workspace`: the guided intake
- `Results`: summary, reliability score, the rules-vs-model panel, and next steps
- `Timeline`: extracted events with their source quotes
- `Brief`: appointment-ready summary
- `Reliability`: the self-audit for unsupported or missed information
- `Stress Tests`: evaluation cases for difficult notes
- `Method`: training approach, metrics, and pitch summary

## Deployment

The app deploys to Railway from `railway.json` and is live at https://medical.aher.dev. Railway builds with:

```bash
npm ci && npm run build
```

and starts with:

```bash
npm run start
```

Required Railway variables:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Next.js runs in standalone output mode. The transformer runtime ships native ONNX binaries that are copied into the standalone build explicitly (see `next.config.ts`), since the trace does not pick them up on its own. One build gotcha worth knowing: `onnxruntime-node` downloads its runtime during `npm ci` and occasionally fails with `ECONNRESET`. A redeploy usually clears it.

## Scope

Mira is not a medical device and does not diagnose or give treatment advice. It organizes user-provided notes, checks its own work, and can still make mistakes. For urgent symptoms or a medical emergency, contact emergency services or a qualified clinician.
