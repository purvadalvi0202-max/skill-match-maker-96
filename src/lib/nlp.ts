// NLP Engine: TF-IDF + Cosine Similarity + Logistic Regression for resume matching

const SKILL_KEYWORDS = [
  'java', 'python', 'javascript', 'typescript', 'react', 'angular', 'vue', 'node',
  'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'docker', 'kubernetes',
  'aws', 'azure', 'gcp', 'git', 'ci/cd', 'rest', 'api', 'graphql', 'html', 'css',
  'c++', 'c#', 'go', 'rust', 'swift', 'kotlin', 'php', 'ruby', 'scala', 'spring',
  'django', 'flask', 'express', 'tensorflow', 'pytorch', 'pandas', 'numpy',
  'machine learning', 'deep learning', 'nlp', 'data science', 'agile', 'scrum',
  'microservices', 'linux', 'testing', 'selenium', 'jenkins', 'terraform',
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

/** Extract structured sections from raw resume text */
export function extractSections(text: string): { skills: string; experience: string; education: string } {
  const lower = text.toLowerCase();

  const extractMatches = (keywords: string[]) =>
    keywords.filter(k => lower.includes(k)).join(', ');

  return {
    skills: extractMatches(SKILL_KEYWORDS),
    experience: extractMatches(EXPERIENCE_KEYWORDS),
    education: extractMatches(EDUCATION_KEYWORDS),
  };
}

/** Tokenize text into words */
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9+#.\-/\s]/g, '').split(/\s+/).filter(Boolean);
}

/** Compute term frequency */
function tf(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  const max = Math.max(...freq.values(), 1);
  for (const [k, v] of freq) freq.set(k, v / max);
  return freq;
}

/** Compute IDF from a set of documents */
function idf(docs: string[][]): Map<string, number> {
  const docCount = docs.length;
  const dfMap = new Map<string, number>();
  for (const doc of docs) {
    const unique = new Set(doc);
    for (const term of unique) dfMap.set(term, (dfMap.get(term) || 0) + 1);
  }
  const result = new Map<string, number>();
  for (const [term, df] of dfMap) result.set(term, Math.log((docCount + 1) / (df + 1)) + 1);
  return result;
}

/** Build TF-IDF vector */
function tfidfVector(tokens: string[], idfMap: Map<string, number>): Map<string, number> {
  const tfMap = tf(tokens);
  const vec = new Map<string, number>();
  for (const [term, tfVal] of tfMap) {
    vec.set(term, tfVal * (idfMap.get(term) || 1));
  }
  return vec;
}

/** Cosine similarity between two vectors */
function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, magA = 0, magB = 0;
  for (const [k, v] of a) {
    dot += v * (b.get(k) || 0);
    magA += v * v;
  }
  for (const [, v] of b) magB += v * v;
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Simple logistic regression prediction using sigmoid */
function logisticPredict(features: number[]): number {
  // Pre-trained weights for [skillMatch, expMatch, eduMatch, tfidfScore]
  const weights = [1.8, 1.2, 0.8, 2.5];
  const bias = -2.0;
  const z = features.reduce((sum, f, i) => sum + f * weights[i], bias);
  return 1 / (1 + Math.exp(-z));
}

export interface AnalysisResult {
  name: string;
  skills: string;
  experience: string;
  education: string;
  score: number;
  status: 'Good' | 'Average' | 'Poor';
  mlPrediction: 'Suitable' | 'Not Suitable';
  rawText: string;
}

/** Analyze a resume against a job description */
export function analyzeResume(resumeText: string, resumeName: string, jobDescription: string): AnalysisResult {
  const resumeSections = extractSections(resumeText);
  const jobSections = extractSections(jobDescription);

  // Tokenize extracted sections for TF-IDF
  const resumeTokens = tokenize(`${resumeSections.skills} ${resumeSections.experience} ${resumeSections.education}`);
  const jobTokens = tokenize(`${jobSections.skills} ${jobSections.experience} ${jobSections.education}`);

  // TF-IDF + Cosine similarity
  const idfMap = idf([resumeTokens, jobTokens]);
  const resumeVec = tfidfVector(resumeTokens, idfMap);
  const jobVec = tfidfVector(jobTokens, idfMap);
  const tfidfScore = cosineSimilarity(resumeVec, jobVec);

  // Section-level matching
  const skillMatch = sectionOverlap(resumeSections.skills, jobSections.skills);
  const expMatch = sectionOverlap(resumeSections.experience, jobSections.experience);
  const eduMatch = sectionOverlap(resumeSections.education, jobSections.education);

  // Combined weighted score
  const score = Math.round((skillMatch * 0.4 + expMatch * 0.25 + eduMatch * 0.1 + tfidfScore * 0.25) * 100);

  // ML prediction
  const mlProb = logisticPredict([skillMatch, expMatch, eduMatch, tfidfScore]);
  const mlPrediction = mlProb >= 0.5 ? 'Suitable' : 'Not Suitable';

  // Status
  const status = score >= 70 ? 'Good' : score >= 40 ? 'Average' : 'Poor';

  return {
    name: resumeName,
    skills: resumeSections.skills,
    experience: resumeSections.experience,
    education: resumeSections.education,
    score,
    status,
    mlPrediction,
    rawText: resumeText,
  };
}

/** Compute overlap ratio between two comma-separated keyword lists */
function sectionOverlap(a: string, b: string): number {
  if (!a || !b) return 0;
  const setA = new Set(a.split(', ').filter(Boolean));
  const setB = new Set(b.split(', ').filter(Boolean));
  if (setB.size === 0) return 0;
  let matches = 0;
  for (const item of setA) if (setB.has(item)) matches++;
  return matches / setB.size;
}
