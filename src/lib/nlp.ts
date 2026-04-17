// NLP Engine: TF-IDF + Cosine Similarity + Logistic Regression + ATS scoring

const SKILL_KEYWORDS = [
  'java', 'python', 'javascript', 'typescript', 'react', 'angular', 'vue', 'node',
  'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'docker', 'kubernetes',
  'aws', 'azure', 'gcp', 'git', 'ci/cd', 'rest', 'api', 'graphql', 'html', 'css',
  'c++', 'c#', 'go', 'rust', 'swift', 'kotlin', 'php', 'ruby', 'scala', 'spring',
  'spring boot', 'django', 'flask', 'express', 'tensorflow', 'pytorch', 'pandas', 'numpy',
  'machine learning', 'deep learning', 'nlp', 'data science', 'agile', 'scrum',
  'microservices', 'linux', 'testing', 'selenium', 'jenkins', 'terraform', 'tableau', 'excel',
];

const EXPERIENCE_KEYWORDS = [
  'backend', 'frontend', 'fullstack', 'full-stack', 'devops', 'cloud', 'api',
  'ml', 'ai', 'data', 'mobile', 'web', 'software', 'engineer', 'developer',
  'architect', 'lead', 'senior', 'junior', 'manager', 'analyst', 'consultant',
  'intern', 'team lead', 'project', 'product', 'design', 'testing', 'qa',
];

const EDUCATION_KEYWORDS = [
  'b.sc', 'bsc', 'b.tech', 'btech', 'b.e', 'be', 'm.sc', 'msc', 'm.tech', 'mtech',
  'mba', 'phd', 'computer science', 'information technology', 'software engineering',
  'electrical', 'electronics', 'mathematics', 'statistics', 'data science',
  'bachelor', 'master', 'degree', 'diploma', 'certification', 'university', 'college',
];

export function extractSections(text: string): { skills: string[]; experience: string[]; education: string[] } {
  const lower = text.toLowerCase();
  const extract = (kws: string[]) => kws.filter(k => lower.includes(k));
  return {
    skills: extract(SKILL_KEYWORDS),
    experience: extract(EXPERIENCE_KEYWORDS),
    education: extract(EDUCATION_KEYWORDS),
  };
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9+#.\-/\s]/g, '').split(/\s+/).filter(Boolean);
}

function tf(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  const max = Math.max(...freq.values(), 1);
  for (const [k, v] of freq) freq.set(k, v / max);
  return freq;
}

function idf(docs: string[][]): Map<string, number> {
  const docCount = docs.length;
  const dfMap = new Map<string, number>();
  for (const doc of docs) for (const term of new Set(doc)) dfMap.set(term, (dfMap.get(term) || 0) + 1);
  const result = new Map<string, number>();
  for (const [term, df] of dfMap) result.set(term, Math.log((docCount + 1) / (df + 1)) + 1);
  return result;
}

function tfidfVector(tokens: string[], idfMap: Map<string, number>): Map<string, number> {
  const tfMap = tf(tokens);
  const vec = new Map<string, number>();
  for (const [term, tfVal] of tfMap) vec.set(term, tfVal * (idfMap.get(term) || 1));
  return vec;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, magA = 0, magB = 0;
  for (const [k, v] of a) { dot += v * (b.get(k) || 0); magA += v * v; }
  for (const [, v] of b) magB += v * v;
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function logisticPredict(features: number[]): number {
  const weights = [1.8, 1.2, 0.8, 2.5];
  const bias = -2.0;
  const z = features.reduce((sum, f, i) => sum + f * weights[i], bias);
  return 1 / (1 + Math.exp(-z));
}

function overlap(resume: string[], job: string[]): { ratio: number; matched: string[]; missing: string[] } {
  const setR = new Set(resume);
  const matched = job.filter(k => setR.has(k));
  const missing = job.filter(k => !setR.has(k));
  const ratio = job.length === 0 ? 0 : matched.length / job.length;
  return { ratio, matched, missing };
}

export interface AnalysisResult {
  name: string;
  skills: string;
  experience: string;
  education: string;
  score: number;        // ML-blended match score
  atsScore: number;     // ATS weighted: 50/30/20
  status: 'Good' | 'Average' | 'Poor';
  mlPrediction: 'Suitable' | 'Not Suitable';
  missingSkills: string;
  rawText: string;
}

export function analyzeResume(resumeText: string, resumeName: string, jobDescription: string): AnalysisResult {
  const r = extractSections(resumeText);
  const j = extractSections(jobDescription);

  const skillM = overlap(r.skills, j.skills);
  const expM = overlap(r.experience, j.experience);
  const eduM = overlap(r.education, j.education);

  // ATS weighted score (50/30/20)
  const atsScore = Math.round((skillM.ratio * 0.5 + expM.ratio * 0.3 + eduM.ratio * 0.2) * 100);

  // TF-IDF cosine on full text
  const rTokens = tokenize(resumeText);
  const jTokens = tokenize(jobDescription);
  const idfMap = idf([rTokens, jTokens]);
  const tfidfScore = cosineSimilarity(tfidfVector(rTokens, idfMap), tfidfVector(jTokens, idfMap));

  // ML-blended score
  const score = Math.round((skillM.ratio * 0.4 + expM.ratio * 0.25 + eduM.ratio * 0.1 + tfidfScore * 0.25) * 100);

  const mlProb = logisticPredict([skillM.ratio, expM.ratio, eduM.ratio, tfidfScore]);
  const mlPrediction: 'Suitable' | 'Not Suitable' = mlProb >= 0.5 ? 'Suitable' : 'Not Suitable';

  const status: 'Good' | 'Average' | 'Poor' = atsScore > 75 ? 'Good' : atsScore >= 50 ? 'Average' : 'Poor';

  return {
    name: resumeName,
    skills: r.skills.join(', '),
    experience: r.experience.join(', '),
    education: r.education.join(', '),
    score,
    atsScore,
    status,
    mlPrediction,
    missingSkills: skillM.missing.join(', '),
    rawText: resumeText,
  };
}
