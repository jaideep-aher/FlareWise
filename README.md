# FlareWise

FlareWise is a Next.js prototype for turning chronic illness notes into a visit-ready summary. It is built for a course project focused on natural language processing, reliability checks, and careful handling of messy patient-written text.

## What It Does

- Collects symptom notes through a guided intake flow
- Builds a structured timeline from user-provided details
- Creates a doctor visit brief with concerns, medication changes, questions, and uncertainties
- Runs a local symptom-domain and appointment-priority classifier
- Checks for unsupported claims, missed details, negation mistakes, temporal mistakes, and urgent terms
- Includes stress tests for typo-heavy, vague, negated, contradictory, and urgent notes

## Local Setup

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

Open `http://localhost:3000`.

## Railway Deployment

This app is ready for Railway through `railway.json`. Railway should build with:

```bash
npm ci && npm run build
```

It should start with:

```bash
npm run start
```

Required Railway variables:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Deploy from this folder after logging in to Railway:

```bash
railway login
railway link
railway up --detach
```

The app uses the `PORT` value provided by Railway. The local classifier is bundled in `src/lib/ml/model.json`, so this version does not need a separate model server.

## Local NLP Model

The checked-in local model is trained from the public `gretelai/symptom_to_diagnosis` dataset from Hugging Face, plus synthetic intake-style examples for meta notes and multi-symptom notes. The script trains a TF-IDF multinomial logistic regression model in JavaScript and writes the artifact to `src/lib/ml/model.json`.

Current checked-in model:

- Model type: TF-IDF multinomial logistic regression
- Vocabulary size: 6,976 terms
- Domain training rows: 5,993
- Domain test rows: 332
- Domain test accuracy: 97.9 percent
- Priority test accuracy: 91.3 percent

Retrain the model:

```bash
npm run train:local-nlp
```

## Pages

- `Home`: project entry point
- `Intake`: guided note collection
- `Results`: summary, reliability score, and next-step links
- `Timeline`: extracted detail table
- `Brief`: appointment-ready summary
- `Reliability`: checks for unsupported or missed information
- `Stress Tests`: evaluation cases for difficult notes
- `Method`: project framing, training approach, metrics, and pitch summary

## Scope

FlareWise is not a medical device and does not provide diagnosis or treatment advice. It organizes user-provided notes and may make mistakes. For urgent symptoms or medical emergencies, contact emergency services or a qualified clinician.
