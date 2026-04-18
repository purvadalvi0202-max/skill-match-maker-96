// NLP Engine: TF-IDF + Cosine Similarity + Logistic Regression + ATS scoring
// Updated with Projects, Certifications, Fake Resume Detection

const SKILL_KEYWORDS = [
  'java', 'python', 'javascript', 'typescript', 'react', 'angular', 'vue', 'node',
  'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'docker', 'kubernetes',
  'aws', 'azure', 'gcp', 'git', 'ci/cd', 'rest', 'api', 'graphql', 'html', 'css',
  'c++', 'c#', 'go', 'rust', 'swift', 'kotlin', 'php', 'ruby', 'scala', 'spring',
  'spring boot', 'django', 'flask', 'express', 'tensorflow', 'pytorch', 'pandas', 'numpy',
  'machine learning', 'deep learning', 'nlp', 'data science', 'agile', 'scrum',
  'microservices', 'linux', 'testing', 'selenium', 'jenkins', 'terraform', 'tableau', 'excel',
  'figma', 'next.js', 'tailwind', 'redux', 'firebase', 'supabase', 'prisma', 'kafka',
];

const EXPERIENCE_KEYWORDS = [
  'backend', 'frontend', 'fullstack', 'full-stack', 'devops', 'cloud', 'api',
  'ml', 'ai', 'data', 'mobile', 'web', 'software', 'engineer', 'developer',
  'architect', 'lead', 'senior', 'junior', 'manager', 'analyst', 'consultant',
  'intern', 'team lead', 'project', 'product', 'design', 'testing', 'qa',
  'years', 'year', 'experience', 'worked', 'developed', 'built', 'led', 'managed',
];

const EDUCATION_KEYWORDS = [
  'b.sc', 'bsc', 'b.tech', 'btech', 'b.e', 'be', 'm.sc', 'msc', 'm.tech', 'mtech',
  'mba', 'phd', 'computer science', 'information technology', 'software engineering',
  'electrical', 'electronics', 'mathematics', 'statistics', 'data science',
  'bachelor', 'master', 'degree', 'diploma', 'certification', 'university', 'college',
];

const PROJECT_KEYWORDS = [
  'e-commerce', 'ecommerce', 'portfolio', 'blog', 'app', 'application', 'system',
  'dashboard', 'platform', 'website', 'web app', 'mobile app', 'chatbot', 'bot',
  'automation', 'tool', 'plugin', 'extension', 'library', 'module',
  'project', 'github', 'open source', 'deployed', 'hosted', 'production',
  'crud', 'microservice', 'fullstack', 'real-time', 'real time',
  'machine learning model', 'ml model', 'neural network', 'recommendation', 'classifier',
  'detection', 'recognition', 'scraper', 'analytics', 'visualization', 'game',
];

const CERTIFICATION_KEYWORDS = [
  'aws certified', 'azure certified', 'google cloud', 'gcp certified', 'certified',
  'certification', 'certificate', 'comptia', 'cisco', 'ccna', 'ccnp', 'cissp',
  'pmp', 'scrum master', 'csm', 'itil', 'oracle certified',
  'microsoft certified', 'mcp', 'mcse', 'red hat', 'rhce', 'rhcsa',
  'tensorflow certificate', 'coursera', 'udemy', 'edx',
  'hackerrank', 'kaggle', 'google analytics', 'hubspot',
  'salesforce', 'data analyst', 'data scientist', 'ml engineer', 'devops certified',
];

export function detectFakeResume(text: string): { isSuspicious: boolean; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let suspicionScore = 0;

  if (text.length < 200) { suspicionScore += 4; reasons.push('Resume text too short'); }
  if (text.length < 100) { suspicionScore += 6; reasons.push('Extremely short content'); }

  const lower = text.toLowerCase();
  if (/lorem ipsum/gi.test(lower)) { suspicionScore += 5; reasons.push('Contains placeholder text'); }
  if (/(.)\1{5,}/gi.test(text)) { suspicionScore += 3; reasons.push('Contains repetitive character patterns'); }
  if (/asdf|qwerty|zxcvbn/gi.test(lower)) { suspicionScore += 4; reasons.push('Contains keyboard mashing patterns'); }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 30) { suspicionScore += 3; reasons.push('Very few words detected'); }

  const hasSkillSection = /skill|expertise|proficien/gi.test(lower);
  const hasExpSection = /experience|work|employ|career/gi.test(lower);
  const hasEduSection = /education|degree|university|college|school/gi.test(lower);
  const sectionCount = [hasSkillSection, hasExpSection, hasEduSection].filter(Boolean).length;
  if (sectionCount === 0) { suspicionScore += 3; reasons.push('No recognizable resume sections found'); }

  return { isSuspicious: suspicionScore >= 5, score: suspicionScore, reasons };
}

export function detectGenderSignal(text: string): string | null {
  const lower = text.toLowerCase();
  const femaleSignals = ['she/her', 'ms.', 'mrs.', ' she ', ' her ', 'women in tech', 'girl who codes'];
  const maleSignals = ['he/him', 'mr.', ' he ', ' him ', ' his '];
  const femaleCount = femaleSignals.filter(s => lower.includes(s)).length;
  const maleCount = maleSignals.filter(s => lower.includes(s)).length;
  if (femaleCount > maleCount) return 'female';
  if (maleCount > femaleCount) return 'male';
  return null;
}

export function extractSections(text: string): {
  skills: string[];
  experience: string[];
  education: string[];
  projects: string[];
  certifications: string[];
} {
  const lower = text.toLowerCase();
  const extract = (kws: string[]) => kws.filter(k => lower.includes(k));
  return {
    skills: extract(SKILL_KEYWORDS),
    experience: extract(EXPERIENCE_KEYWORDS),
    education: extract(EDUCATION_KEYWORDS),
    projects: extract(PROJECT_KEYWORDS),
    certifications: extract(CERTIFICATION_KEYWORDS),
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
  const weights = [1.8, 1.0, 0.7, 1.2, 0.9, 2.0];
  const bias = -2.2;
  const z = features.reduce((sum, f, i) => sum + f * (weights[i] || 0), bias);
  return 1 / (1 + Math.exp(-z));
}

function overlap(resume: string[], job: string[]): { ratio: number; matched: string[]; missing: string[] } {
  const setR = new Set(resume);
  const matched = job.filter(k => setR.has(k));
  const missing = job.filter(k => !setR.has(k));
  const ratio = job.length === 0 ? 0 : matched.length / job.length;
  return { ratio, matched, missing };
}

export function generateAISuggestions(
  skills: string[],
  experience: string[],
  education: string[],
  projects: string[],
  certifications: string[],
  atsScore: number
): string[] {
  const suggestions: string[] = [];
  if (projects.length < 2) suggestions.push('Add more projects to showcase practical skills — recruiters love seeing real-world work.');
  if (certifications.length === 0) suggestions.push('Include certifications (e.g., AWS, Google Cloud, Coursera) to boost credibility.');
  if (skills.length < 5) suggestions.push('Expand your skills section with more relevant technologies.');
  if (experience.length < 3) suggestions.push('Detail your work experience with specific roles, technologies used, and impact.');
  if (education.length === 0) suggestions.push('Add your education background including degree, institution, and graduation year.');
  if (atsScore < 50) suggestions.push('Your ATS score is low — mirror keywords from the job description more closely.');
  if (atsScore >= 50 && atsScore < 70) suggestions.push('Good start! Tailor your resume more closely to the job requirements to improve your score.');
  if (!skills.some(s => ['git', 'docker', 'aws', 'ci/cd'].includes(s))) {
    suggestions.push('Consider adding DevOps skills like Git, Docker, or CI/CD to your profile.');
  }
  return suggestions.slice(0, 4);
}

export interface AnalysisResult {
  name: string;
  skills: string;
  experience: string;
  education: string;
  projects: string;
  certifications: string;
  score: number;
  atsScore: number;
  status: 'Good' | 'Average' | 'Poor';
  mlPrediction: 'Suitable' | 'Not Suitable';
  missingSkills: string;
  rawText: string;
  validationStatus: 'valid' | 'suspicious';
  genderSignal: string | null;
  aiSuggestions: string[];
}

export function analyzeResume(
  resumeText: string,
  resumeName: string,
  jobDescription: string,
  candidatePreference: 'none' | 'women' | 'men' = 'none'
): AnalysisResult {
  const fakeCheck = detectFakeResume(resumeText);
  const genderSignal = detectGenderSignal(resumeText);

  const r = extractSections(resumeText);
  const j = extractSections(jobDescription);

  const skillM = overlap(r.skills, j.skills);
  const expM = overlap(r.experience, j.experience);
  const eduM = overlap(r.education, j.education);
  const projM = overlap(r.projects, j.projects.length > 0 ? j.projects : PROJECT_KEYWORDS.slice(0, 10));
  const certM = overlap(r.certifications, j.certifications.length > 0 ? j.certifications : CERTIFICATION_KEYWORDS.slice(0, 5));

  // ATS weighted: 40/20/15/15/10
  const atsRaw = skillM.ratio * 0.40 + expM.ratio * 0.20 + eduM.ratio * 0.15 + projM.ratio * 0.15 + certM.ratio * 0.10;

  let preferenceBoost = 0;
  if (candidatePreference === 'women' && genderSignal === 'female') preferenceBoost = 3;
  if (candidatePreference === 'men' && genderSignal === 'male') preferenceBoost = 3;

  const atsScore = Math.min(100, Math.round(atsRaw * 100) + preferenceBoost);

  const rTokens = tokenize(resumeText);
  const jTokens = tokenize(jobDescription);
  const idfMap = idf([rTokens, jTokens]);
  const tfidfScore = cosineSimilarity(tfidfVector(rTokens, idfMap), tfidfVector(jTokens, idfMap));

  const score = Math.min(100, Math.round(
    (skillM.ratio * 0.35 + expM.ratio * 0.20 + eduM.ratio * 0.10 + projM.ratio * 0.15 + certM.ratio * 0.10 + tfidfScore * 0.10) * 100
  ) + preferenceBoost);

  const mlProb = logisticPredict([skillM.ratio, expM.ratio, eduM.ratio, projM.ratio, certM.ratio, tfidfScore]);
  const mlPrediction: 'Suitable' | 'Not Suitable' = mlProb >= 0.45 ? 'Suitable' : 'Not Suitable';
  const status: 'Good' | 'Average' | 'Poor' = atsScore > 65 ? 'Good' : atsScore >= 40 ? 'Average' : 'Poor';
  const aiSuggestions = generateAISuggestions(r.skills, r.experience, r.education, r.projects, r.certifications, atsScore);

  return {
    name: resumeName,
    skills: r.skills.join(', '),
    experience: r.experience.join(', '),
    education: r.education.join(', '),
    projects: r.projects.join(', '),
    certifications: r.certifications.join(', '),
    score,
    atsScore,
    status,
    mlPrediction,
    missingSkills: skillM.missing.join(', '),
    rawText: resumeText,
    validationStatus: fakeCheck.isSuspicious ? 'suspicious' : 'valid',
    genderSignal,
    aiSuggestions,
  };
}
