export type EventType =
  | "symptom"
  | "symptom_change"
  | "medication"
  | "trigger"
  | "negation"
  | "question"
  | "context";

export type Confidence = "high" | "medium" | "low";

export type HealthEvent = {
  id: string;
  date: string;
  type: EventType;
  name: string;
  severity?: number | null;
  dose?: string | null;
  change?: string | null;
  context?: string | null;
  confidence: Confidence;
  sourceQuote: string;
};

export type ReliabilityIssue = {
  type:
    | "unsupported_claim"
    | "missed_detail"
    | "negation_error"
    | "temporal_error"
    | "safety_concern"
    | "medical_advice";
  claim: string;
  problem: string;
  sourceQuote?: string | null;
};

export type SafetyFlag = {
  level: "routine" | "doctor_discussion" | "urgent_warning" | "emergency";
  term: string;
  message: string;
};

export type PatternFinding = {
  title: string;
  evidence: string;
  caution: string;
};

export type DoctorBrief = {
  mainConcerns: string[];
  medicationChanges: string[];
  questions: string[];
  uncertainties: string[];
};

export type ReliabilityReport = {
  score: number;
  supportedClaims: number;
  unsupportedClaims: number;
  missedDetails: number;
  negationErrors: number;
  temporalErrors: number;
  urgentRiskTerms: number;
  issues: ReliabilityIssue[];
};

export type AnalysisResult = {
  events: HealthEvent[];
  weeklySummary: string;
  doctorBrief: DoctorBrief;
  patterns: PatternFinding[];
  reliability: ReliabilityReport;
  safetyFlags: SafetyFlag[];
  missingInformation: string[];
  transferLearningNote: string;
  localModel?: LocalModelResult;
};

export type LocalModelResult = {
  modelName: string;
  modelType: string;
  task: string;
  sourceDataset: string;
  sourceUrl: string;
  topDomain: string;
  confidence: number;
  topPredictions: Array<{ domain: string; confidence: number }>;
  priority: string;
  priorityConfidence: number;
  priorityPredictions: Array<{ priority: string; confidence: number }>;
  testAccuracy: number;
  priorityTestAccuracy: number;
  trainingRows: number;
  testRows: number;
  coverage: {
    totalTokens: number;
    inVocabTokens: number;
    sufficient: boolean;
  };
};

export type Demographics = {
  name: string;
  age: string;
  sex: string;
  primaryCare: string;
  allergies: string;
  currentMedications: string;
};

export type StressTestResult = {
  testType: string;
  extractionF1: number;
  hallucinationRate: number;
  negationAccuracy: number;
  temporalAccuracy: number;
  notes: string;
};

export type StressTestResponse = {
  results: StressTestResult[];
  takeaway: string;
};
