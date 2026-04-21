// NLP Engine: TF-IDF + Cosine + Logistic Regression + ATS scoring
// Now extracts STRUCTURED Experience / Education / Projects / Certifications
// with per-section validation status (valid / incomplete / fresher / missing).

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

// ---------- Structured types ----------
export interface ExperienceItem { company: string; role: string; duration: string }
export interface EducationItem { degree: string; college: string }
export interface ProjectItem { project_name: string }
export interface CertificationItem { certification_name: string }

export type SectionStatus = 'valid' | 'incomplete' | 'fresher' | 'missing';

export interface StructuredResume {
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  experience_status: SectionStatus;
  education_status: SectionStatus;
  projects_status: SectionStatus;
  certifications_status: SectionStatus;
  is_fresher: boolean;
}

// ---------- Section splitter ----------
const SECTION_HEADERS: Record<string, RegExp> = {
  experience: /^\s*(work\s+experience|professional\s+experience|employment(\s+history)?|experience|internships?)\s*:?\s*$/i,
  education: /^\s*(education|academic(\s+background)?|qualifications)\s*:?\s*$/i,
  projects: /^\s*(projects?|personal\s+projects?|key\s+projects?|academic\s+projects?)\s*:?\s*$/i,
  certifications: /^\s*(certifications?|licenses?|courses?\s*&?\s*certifications?)\s*:?\s*$/i,
  skills: /^\s*(skills|technical\s+skills|core\s+competencies|expertise)\s*:?\s*$/i,
  summary: /^\s*(summary|profile|objective|about\s+me)\s*:?\s*$/i,
};

function splitSections(text: string): Record<string, string> {
  const lines = text.split(/\r?\n/);
  const out: Record<string, string[]> = {};
  let current = 'preamble';
  out[current] = [];
  for (const raw of lines) {
    const line = raw.trim();
    let matched: string | null = null;
    for (const [name, re] of Object.entries(SECTION_HEADERS)) {
      if (re.test(line)) { matched = name; break; }
    }
    if (matched) {
      current = matched;
      if (!out[current]) out[current] = [];
    } else {
      if (!out[current]) out[current] = [];
      out[current].push(raw);
    }
  }
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(out)) result[k] = v.join('\n').trim();
  return result;
}

// ---------- Helpers ----------
const MONTH = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*';
const DURATION_RE = new RegExp(
  `(\\d+\\s*(\\+)?\\s*(years?|yrs?|months?|mos?))` +
  `|(${MONTH}\\.?\\s*\\d{4}\\s*[-–to]+\\s*(present|current|${MONTH}\\.?\\s*\\d{4}|\\d{4}))` +
  `|(\\d{4}\\s*[-–]\\s*(present|current|\\d{4}))`,
  'i'
);

const ROLE_KEYWORDS = [
  'engineer', 'developer', 'intern', 'analyst', 'manager', 'architect', 'designer',
  'consultant', 'lead', 'scientist', 'administrator', 'specialist', 'officer',
  'programmer', 'researcher', 'tester', 'qa', 'devops', 'sre',
];

const DEGREE_PATTERNS = [
  /\bb\.?\s?tech\b/i, /\bb\.?\s?e\b/i, /\bb\.?\s?sc\b/i, /\bbachelor[a-z']*\b/i,
  /\bm\.?\s?tech\b/i, /\bm\.?\s?sc\b/i, /\bm\.?\s?e\b/i, /\bmaster[a-z']*\b/i,
  /\bmba\b/i, /\bbba\b/i, /\bbca\b/i, /\bmca\b/i, /\bphd\b/i, /\bdiploma\b/i,
  /\bb\.?\s?com\b/i, /\bm\.?\s?com\b/i, /\bb\.?\s?a\b/i, /\bm\.?\s?a\b/i,
];

const COLLEGE_RE = /\b(university|college|institute|school|academy|polytechnic|iit|nit|iiit|iiit-)\b/i;

// ---------- Experience extraction ----------
function extractExperienceItems(section: string, fullText: string): { items: ExperienceItem[]; isFresher: boolean } {
  if (/\bfresher\b/i.test(fullText) && !section) {
    return { items: [], isFresher: true };
  }

  const sourceText = section || '';
  const items: ExperienceItem[] = [];

  // Split by blank lines or bullet boundaries
  const blocks = sourceText
    .split(/\n\s*\n|(?=\n\s*[•*\-–])/g)
    .map(b => b.trim())
    .filter(b => b.length > 5);

  for (const block of blocks) {
    const compactLine = block.split('\n')[0].replace(/^[•*\-–]\s*/, '').trim();
    if (!compactLine) continue;

    const durMatch = block.match(DURATION_RE);
    const duration = durMatch ? durMatch[0].trim() : '';

    // Try splitting on common separators: "Role at Company", "Role - Company", "Role | Company"
    let role = '';
    let company = '';
    const atSplit = compactLine.match(/^(.+?)\s+(?:at|@|-|–|\|)\s+(.+?)(?:\s*[\(|,]|$)/i);
    if (atSplit) {
      role = atSplit[1].trim();
      company = atSplit[2].trim();
    } else {
      // Heuristic: line contains a role keyword
      const lower = compactLine.toLowerCase();
      const hit = ROLE_KEYWORDS.find(k => lower.includes(k));
      if (hit) role = compactLine;
    }

    // Strip trailing duration / dates from company
    company = company.replace(DURATION_RE, '').replace(/[\(\)\|,]/g, '').trim();
    role = role.replace(DURATION_RE, '').trim();

    if (role || company || duration) {
      items.push({ role, company, duration });
    }
  }

  // Fresher detection: empty section OR explicit keyword
  const fresherKeyword = /\bfresher\b|\bno\s+work\s+experience\b|\bseeking\s+(my\s+)?first\b/i.test(fullText);
  if (items.length === 0 && fresherKeyword) {
    return { items: [], isFresher: true };
  }

  return { items, isFresher: false };
}

// ---------- Education extraction ----------
function extractEducationItems(section: string): EducationItem[] {
  if (!section) return [];
  const items: EducationItem[] = [];
  const lines = section.split(/\n+/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const degMatch = DEGREE_PATTERNS.map(re => line.match(re)).find(Boolean);
    const collegeMatch = line.match(new RegExp(`([A-Z][\\w&.,'\\- ]*?\\b(university|college|institute|school|academy|polytechnic|iit|nit|iiit)[\\w&.,'\\- ]*)`, 'i'));
    if (degMatch || collegeMatch) {
      items.push({
        degree: degMatch ? degMatch[0].trim() : '',
        college: collegeMatch ? collegeMatch[1].trim() : '',
      });
    }
  }
  return items;
}

// ---------- Projects extraction ----------
function extractProjectItems(section: string): ProjectItem[] {
  if (!section) return [];
  const items: ProjectItem[] = [];
  const lines = section.split(/\n+/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const cleaned = line.replace(/^[\d]+[\.\)]\s*/, '').replace(/^[•*\-–]\s*/, '').trim();
    if (cleaned.length < 3) continue;
    // Project name = first phrase before colon, dash, or first 8 words
    const nameMatch = cleaned.match(/^([^:\-–|]+?)(?:[:\-–|]|$)/);
    let name = (nameMatch ? nameMatch[1] : cleaned).trim();
    if (name.split(/\s+/).length > 10) name = name.split(/\s+/).slice(0, 10).join(' ') + '…';
    if (name) items.push({ project_name: name });
  }
  return items;
}

// ---------- Certifications extraction ----------
function extractCertificationItems(section: string): CertificationItem[] {
  if (!section) return [];
  const items: CertificationItem[] = [];
  const lines = section.split(/\n+/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const cleaned = line.replace(/^[\d]+[\.\)]\s*/, '').replace(/^[•*\-–]\s*/, '').trim();
    if (cleaned.length < 3) continue;
    const name = cleaned.replace(/\s*\(\d{4}\)\s*$/, '').trim();
    if (name) items.push({ certification_name: name });
  }
  return items;
}

// ---------- Public structured extractor ----------
export function extractStructured(text: string): StructuredResume {
  const sections = splitSections(text);

  // Primary: section-based extraction
  let expRes = extractExperienceItems(sections.experience || '', text);
  let eduItems = extractEducationItems(sections.education || '');
  let projItems = extractProjectItems(sections.projects || '');
  let certItems = extractCertificationItems(sections.certifications || '');

  // Fallback: when section headers missing, scan the entire text line-by-line.
  // This guarantees we surface SOMETHING for resumes that don't follow header conventions.
  const allLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (eduItems.length === 0) {
    const eduLines = allLines.filter(l =>
      DEGREE_PATTERNS.some(re => re.test(l)) || COLLEGE_RE.test(l)
    );
    eduItems = extractEducationItems(eduLines.join('\n'));
  }

  if (expRes.items.length === 0 && !expRes.isFresher) {
    const expLines = allLines.filter(l => {
      const lower = l.toLowerCase();
      return DURATION_RE.test(l) || ROLE_KEYWORDS.some(k => lower.includes(k));
    });
    if (expLines.length > 0) {
      expRes = extractExperienceItems(expLines.join('\n\n'), text);
    }
  }

  if (projItems.length === 0) {
    // Look for lines containing "project" keyword
    const projLines = allLines.filter(l => /\bproject\b/i.test(l) && l.length < 200);
    if (projLines.length > 0) projItems = extractProjectItems(projLines.join('\n'));
  }

  if (certItems.length === 0) {
    const certLines = allLines.filter(l =>
      /\b(certified|certification|certificate|coursera|udemy|aws certified|google cloud|microsoft certified|nptel)\b/i.test(l)
      && l.length < 200
    );
    if (certLines.length > 0) certItems = extractCertificationItems(certLines.join('\n'));
  }

  // Validate experience
  let experience_status: SectionStatus;
  if (expRes.isFresher) experience_status = 'fresher';
  else if (expRes.items.length === 0) experience_status = 'missing';
  else {
    const allValid = expRes.items.every(e => e.company && e.role && e.duration);
    experience_status = allValid ? 'valid' : 'incomplete';
  }

  // Validate education
  let education_status: SectionStatus;
  if (eduItems.length === 0) education_status = 'missing';
  else {
    const allValid = eduItems.every(e => e.degree && e.college);
    education_status = allValid ? 'valid' : 'incomplete';
  }

  // Validate projects
  const projects_status: SectionStatus = projItems.length === 0 ? 'missing' : 'valid';
  const certifications_status: SectionStatus = certItems.length === 0 ? 'missing' : 'valid';

  return {
    experience: expRes.items,
    education: eduItems,
    projects: projItems,
    certifications: certItems,
    experience_status,
    education_status,
    projects_status,
    certifications_status,
    is_fresher: expRes.isFresher,
  };
}

// ---------- Skills (keyword-based) ----------
function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_KEYWORDS.filter(k => lower.includes(k));
}

// ---------- Fake / suspicious detector ----------
export function detectFakeResume(text: string): { isSuspicious: boolean; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  if (text.length < 200) { s += 4; reasons.push('Resume text too short'); }
  if (text.length < 100) { s += 6; reasons.push('Extremely short content'); }
  const lower = text.toLowerCase();
  if (/lorem ipsum/gi.test(lower)) { s += 5; reasons.push('Placeholder text'); }
  if (/(.)\1{5,}/gi.test(text)) { s += 3; reasons.push('Repetitive characters'); }
  if (/asdf|qwerty|zxcvbn/gi.test(lower)) { s += 4; reasons.push('Keyboard mashing'); }
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 30) { s += 3; reasons.push('Very few words'); }
  return { isSuspicious: s >= 5, score: s, reasons };
}

export function detectGenderSignal(text: string): string | null {
  const lower = text.toLowerCase();
  const f = ['she/her', 'ms.', 'mrs.', ' she ', ' her ', 'women in tech', 'girl who codes'];
  const m = ['he/him', 'mr.', ' he ', ' him ', ' his '];
  const fc = f.filter(s => lower.includes(s)).length;
  const mc = m.filter(s => lower.includes(s)).length;
  if (fc > mc) return 'female';
  if (mc > fc) return 'male';
  return null;
}

// ---------- TF-IDF ----------
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9+#.\-/\s]/g, '').split(/\s+/).filter(Boolean);
}
function tf(tokens: string[]): Map<string, number> {
  const f = new Map<string, number>();
  for (const t of tokens) f.set(t, (f.get(t) || 0) + 1);
  const max = Math.max(...f.values(), 1);
  for (const [k, v] of f) f.set(k, v / max);
  return f;
}
function idf(docs: string[][]): Map<string, number> {
  const dc = docs.length;
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) || 0) + 1);
  const r = new Map<string, number>();
  for (const [t, c] of df) r.set(t, Math.log((dc + 1) / (c + 1)) + 1);
  return r;
}
function tfidfVector(tokens: string[], idfMap: Map<string, number>): Map<string, number> {
  const tfMap = tf(tokens);
  const v = new Map<string, number>();
  for (const [term, val] of tfMap) v.set(term, val * (idfMap.get(term) || 1));
  return v;
}
function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, mA = 0, mB = 0;
  for (const [k, v] of a) { dot += v * (b.get(k) || 0); mA += v * v; }
  for (const [, v] of b) mB += v * v;
  if (mA === 0 || mB === 0) return 0;
  return dot / (Math.sqrt(mA) * Math.sqrt(mB));
}

function logistic(features: number[]): number {
  const w = [1.8, 1.0, 0.7, 1.2, 0.9, 2.0];
  const b = -2.2;
  const z = features.reduce((s, f, i) => s + f * (w[i] || 0), b);
  return 1 / (1 + Math.exp(-z));
}

function overlap(resume: string[], job: string[]) {
  const set = new Set(resume);
  const matched = job.filter(k => set.has(k));
  const missing = job.filter(k => !set.has(k));
  return { ratio: job.length === 0 ? 0 : matched.length / job.length, matched, missing };
}

// ---------- Result type ----------
export interface AnalysisResult {
  name: string;
  skills: string;                 // comma list (back-compat)
  experience: string;             // JSON string of ExperienceItem[]
  education: string;              // JSON string of EducationItem[]
  projects: string;               // JSON string of ProjectItem[]
  certifications: string;         // JSON string of CertificationItem[]
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

// Safely parse stored JSON arrays from resume rows. Returns [] on legacy strings.
export function safeParseArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const v = JSON.parse(value);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export function generateAISuggestions(
  skillsCount: number, projectsCount: number, certsCount: number,
  expCount: number, eduCount: number, atsScore: number
): string[] {
  const out: string[] = [];
  if (projectsCount < 2) out.push('Add more projects to showcase practical skills.');
  if (certsCount === 0) out.push('Include certifications (AWS, Google Cloud, Coursera) to boost credibility.');
  if (skillsCount < 5) out.push('Expand your skills section with more relevant technologies.');
  if (expCount === 0) out.push('Add work experience or label yourself as Fresher with strong projects.');
  if (eduCount === 0) out.push('Add your education — degree and institution.');
  if (atsScore < 50) out.push('ATS score is low — mirror keywords from the job description more closely.');
  return out.slice(0, 4);
}

export function analyzeResume(
  resumeText: string,
  resumeName: string,
  jobDescription: string,
  candidatePreference: 'none' | 'women' | 'men' = 'none'
): AnalysisResult {
  const fakeCheck = detectFakeResume(resumeText);
  const genderSignal = detectGenderSignal(resumeText);

  const structured = extractStructured(resumeText);
  const resumeSkills = extractSkills(resumeText);
  const jobSkills = extractSkills(jobDescription);

  const skillM = overlap(resumeSkills, jobSkills);
  const expRatio = structured.is_fresher
    ? 0.5 // freshers get partial credit so they aren't zeroed
    : structured.experience_status === 'valid' ? 1
    : structured.experience_status === 'incomplete' ? 0.5
    : 0;
  const eduRatio = structured.education_status === 'valid' ? 1
    : structured.education_status === 'incomplete' ? 0.5 : 0;
  const projRatio = structured.projects.length > 0 ? Math.min(1, structured.projects.length / 3) : 0;
  const certRatio = structured.certifications.length > 0 ? Math.min(1, structured.certifications.length / 2) : 0;

  const atsRaw = skillM.ratio * 0.40 + expRatio * 0.20 + eduRatio * 0.15 + projRatio * 0.15 + certRatio * 0.10;

  let preferenceBoost = 0;
  if (candidatePreference === 'women' && genderSignal === 'female') preferenceBoost = 3;
  if (candidatePreference === 'men' && genderSignal === 'male') preferenceBoost = 3;

  const atsScore = Math.min(100, Math.round(atsRaw * 100) + preferenceBoost);

  const rTokens = tokenize(resumeText);
  const jTokens = tokenize(jobDescription);
  const idfMap = idf([rTokens, jTokens]);
  const tfidf = cosine(tfidfVector(rTokens, idfMap), tfidfVector(jTokens, idfMap));

  const score = Math.min(100, Math.round(
    (skillM.ratio * 0.35 + expRatio * 0.20 + eduRatio * 0.10 + projRatio * 0.15 + certRatio * 0.10 + tfidf * 0.10) * 100
  ) + preferenceBoost);

  const mlProb = logistic([skillM.ratio, expRatio, eduRatio, projRatio, certRatio, tfidf]);
  const mlPrediction: 'Suitable' | 'Not Suitable' = mlProb >= 0.45 ? 'Suitable' : 'Not Suitable';
  const status: 'Good' | 'Average' | 'Poor' = atsScore > 65 ? 'Good' : atsScore >= 40 ? 'Average' : 'Poor';

  return {
    name: resumeName,
    skills: resumeSkills.join(', '),
    experience: JSON.stringify(structured.experience),
    education: JSON.stringify(structured.education),
    projects: JSON.stringify(structured.projects),
    certifications: JSON.stringify(structured.certifications),
    score,
    atsScore,
    status,
    mlPrediction,
    missingSkills: skillM.missing.join(', '),
    rawText: resumeText,
    validationStatus: fakeCheck.isSuspicious ? 'suspicious' : 'valid',
    genderSignal,
    aiSuggestions: generateAISuggestions(
      resumeSkills.length, structured.projects.length, structured.certifications.length,
      structured.experience.length, structured.education.length, atsScore
    ),
  };
}
