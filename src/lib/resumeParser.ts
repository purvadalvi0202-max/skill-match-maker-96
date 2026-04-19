import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

const ALLOWED_TYPES = ['application/pdf', 'text/plain'];
const ALLOWED_EXTENSIONS = ['.pdf', '.txt'];
const REJECTED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateResumeFile(file: File): FileValidationResult {
  const lowerName = file.name.toLowerCase();
  const ext = '.' + (lowerName.split('.').pop() || '');
  const GENERIC_ERROR = 'Invalid file: Upload a valid Resume/CV (PDF/TXT only)';

  // Block known non-resume formats by extension regardless of MIME spoofing
  const BLOCKED_EXTS = [
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.rtf', '.odt',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic', '.tiff',
    '.mp3', '.mp4', '.mov', '.avi', '.wav', '.zip', '.rar', '.7z', '.tar', '.gz',
    '.exe', '.dmg', '.apk', '.html', '.htm', '.json', '.xml',
  ];
  if (BLOCKED_EXTS.includes(ext)) {
    return { valid: false, error: `${GENERIC_ERROR}. "${ext}" files (assignments, slides, images, etc.) are not accepted.` };
  }
  if (REJECTED_TYPES.includes(file.type)) {
    return { valid: false, error: `${GENERIC_ERROR}. Images, Word docs, slides, and spreadsheets are not accepted.` };
  }
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `${GENERIC_ERROR}. Only .pdf and .txt resumes are allowed.` };
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: GENERIC_ERROR };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'File too large. Maximum size is 5MB.' };
  }
  if (file.size < 200) {
    return { valid: false, error: `${GENERIC_ERROR}. File appears to be empty or too small to be a resume.` };
  }
  return { valid: true };
}

export interface ContentValidationResult {
  isResume: boolean;
  confidence: number;
  reason?: string;
}

/**
 * Heuristic content-based resume detector.
 * Looks for typical resume sections + contact info + resume vocabulary.
 * Rejects reports, essays, articles, assignments, etc.
 */
export function validateResumeContent(text: string): ContentValidationResult {
  if (!text || text.trim().length < 150) {
    return { isResume: false, confidence: 0, reason: 'File content is too short to be a resume.' };
  }

  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // 1. Resume section headers (need at least 2)
  const sectionPatterns = [
    /\b(work\s+experience|professional\s+experience|employment\s+history|experience)\b/,
    /\b(education|academic\s+background|qualifications)\b/,
    /\b(skills|technical\s+skills|core\s+competencies|expertise)\b/,
    /\b(projects?|personal\s+projects?|key\s+projects?)\b/,
    /\b(certifications?|licenses?|achievements?|awards?)\b/,
    /\b(summary|profile|objective|about\s+me)\b/,
    /\b(contact|contact\s+information|personal\s+details)\b/,
  ];
  const sectionHits = sectionPatterns.filter(r => r.test(lower)).length;

  // 2. Contact signals (email, phone, linkedin, github)
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const hasPhone = /(\+?\d{1,3}[\s-]?)?\(?\d{3,5}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/.test(text);
  const hasLinkedIn = /linkedin\.com\/in\//i.test(text);
  const hasGithub = /github\.com\//i.test(text);
  const contactHits = [hasEmail, hasPhone, hasLinkedIn, hasGithub].filter(Boolean).length;

  // 3. Resume vocabulary (action verbs + role words)
  const resumeVocab = [
    'developed', 'designed', 'implemented', 'managed', 'led', 'built', 'created',
    'engineered', 'architected', 'collaborated', 'responsible for', 'achieved',
    'engineer', 'developer', 'analyst', 'manager', 'intern', 'consultant',
    'bachelor', 'master', 'b.tech', 'b.sc', 'm.sc', 'mba', 'phd', 'university', 'college',
    'curriculum vitae', 'resume', 'cv',
  ];
  const vocabHits = resumeVocab.filter(w => lower.includes(w)).length;

  // 4. Negative signals — content typical of reports, papers, articles
  const negativePatterns = [
    /\babstract\b[\s\S]{0,200}\bintroduction\b/i,
    /\b(table\s+of\s+contents|chapter\s+\d|figure\s+\d|fig\.\s*\d)/i,
    /\b(stock\s+(price|market|prediction)|forecasting\s+model|time\s+series)\b/i,
    /\b(literature\s+review|methodology|research\s+paper|hypothesis|conclusion)\b/i,
    /\b(assignment|homework|term\s+paper|thesis|dissertation)\b/i,
    /\b(slide\s+\d|presentation\s+by|copyright\s+\u00a9)\b/i,
    /\bibid\.|et\s+al\./i,
    /\breferences\b[\s\S]{0,500}\[\d+\]/i,
  ];
  const negativeHits = negativePatterns.filter(r => r.test(text)).length;

  // Score: must have resume structure AND not look like a report
  const positiveScore = sectionHits * 2 + contactHits + Math.min(vocabHits, 6);
  const finalScore = positiveScore - negativeHits * 4;
  const confidence = Math.max(0, Math.min(100, Math.round((finalScore / 14) * 100)));

  if (negativeHits >= 2) {
    return {
      isResume: false,
      confidence,
      reason: 'This file looks like a report, paper, or assignment — not a resume. Please upload an actual CV/Resume.',
    };
  }
  if (sectionHits < 2) {
    return {
      isResume: false,
      confidence,
      reason: 'No recognizable resume sections (Experience, Education, Skills, etc.). Please upload a valid Resume/CV.',
    };
  }
  if (contactHits === 0) {
    return {
      isResume: false,
      confidence,
      reason: 'No contact information found (email, phone, LinkedIn). Please upload a valid Resume/CV.',
    };
  }
  if (vocabHits < 3) {
    return {
      isResume: false,
      confidence,
      reason: 'Content does not match a typical resume. Please upload a valid Resume/CV.',
    };
  }
  if (wordCount > 3000 && sectionHits < 4) {
    return {
      isResume: false,
      confidence,
      reason: 'File is too long and lacks resume structure — likely a report or document, not a resume.',
    };
  }

  return { isResume: true, confidence };
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return await file.text();
  }
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    return await extractFromPdf(file);
  }
  return await file.text();
}

async function extractFromPdf(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const textParts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      textParts.push(pageText);
    }
    const text = textParts.join('\n').trim();
    if (!text || text.length < 20) {
      return 'Unable to extract text from PDF. This may be a scanned/image PDF. Please upload a text-based resume (.txt) for best results.';
    }
    return text;
  } catch (err) {
    console.error('PDF extraction error:', err);
    return 'Unable to extract text from PDF. Please upload a text-based resume (.txt) for best results.';
  }
}

export const SAMPLE_RESUMES = [
  {
    name: 'Alex Johnson - Java Developer',
    text: `Alex Johnson - Senior Java Developer
Email: alex.johnson@email.com | LinkedIn: linkedin.com/in/alexjohnson | GitHub: github.com/alexjohnson

SKILLS
Java, Spring Boot, Microservices, REST API, SQL, PostgreSQL, Docker, Kubernetes, AWS, Git, CI/CD, Agile, Scrum, Testing, Selenium, Jenkins, Maven, Hibernate

EXPERIENCE
Senior Backend Software Engineer - TechCorp Inc. (2020 - Present) | 4 years
- Developed enterprise Java applications using Spring Boot and microservices architecture
- Built and maintained REST APIs serving 1M+ requests per day
- Led a team of 6 backend engineers
- Deployed services to AWS ECS with CI/CD pipelines using Jenkins

Junior Backend Developer - StartupXYZ (2019 - 2020) | 1 year
- Built backend APIs using Java and Spring MVC
- Worked with SQL databases (PostgreSQL, MySQL)
- Contributed to Agile sprint processes

PROJECTS
1. E-Commerce Platform: Fullstack Java + React application with 50k active users. Deployed on AWS. GitHub: github.com/alexjohnson/ecommerce
2. Microservices Dashboard: Real-time system monitoring dashboard using Spring Boot microservices and Docker
3. REST API Gateway: Built a production API gateway handling authentication and rate limiting

CERTIFICATIONS
- AWS Certified Solutions Architect (2022)
- Oracle Java Certified Professional (2021)
- Scrum Master Certification (CSM)

EDUCATION
B.Tech Computer Science from MIT University (2019)`,
  },
  {
    name: 'Sarah Chen - Full Stack Developer',
    text: `Sarah Chen - Full Stack Software Developer
Email: sarah.chen@email.com | Portfolio: sarahchen.dev | GitHub: github.com/sarahchen

SKILLS
Python, JavaScript, TypeScript, React, Node, Express, MongoDB, SQL, Docker, Git, HTML, CSS, REST, GraphQL, AWS, Agile, Redux, Next.js, Tailwind, Firebase

EXPERIENCE
Full-Stack Developer - WebAgency (2021 - Present) | 3 years
- Built modern web applications for 15+ clients using React and Node.js
- Designed and developed REST and GraphQL APIs
- Implemented responsive UI/UX using Tailwind CSS and Framer Motion
- Managed MongoDB and PostgreSQL databases

Frontend Developer - MediaStartup (2020 - 2021) | 1 year
- Developed React components and Redux state management
- Integrated third-party APIs and payment systems

PROJECTS
1. SaaS Analytics Dashboard: Real-time analytics platform built with Next.js + Python backend. Live at analytics.sarahchen.dev
2. Open Source Component Library: Published npm library with 500+ downloads. GitHub: github.com/sarahchen/ui-lib
3. E-Commerce Web App: Fullstack React + Node.js shopping platform with Stripe payment integration
4. AI Chatbot: Python-based chatbot using NLP and deployed on AWS

CERTIFICATIONS
- AWS Solutions Architect - Associate (2023)
- Google Analytics Certified
- HackerRank Python Gold Badge

EDUCATION
B.Sc Computer Science from Stanford University (2020)`,
  },
  {
    name: 'Mike Torres - Data Analyst',
    text: `Mike Torres - Data Analyst & ML Engineer
Email: mike.torres@email.com | Kaggle: kaggle.com/miketorres

SKILLS
Python, SQL, Pandas, NumPy, Data Science, Machine Learning, TensorFlow, PyTorch, Excel, Tableau, Scikit-learn, Matplotlib, Seaborn, Deep Learning, NLP

EXPERIENCE
Data Analyst - Analytics Corp (2022 - Present) | 2 years
- Performed statistical analysis and built ML models for business forecasting
- Created interactive dashboards in Tableau for executive reporting
- Built data pipelines using Python and SQL
- Led a data team of 3 analysts

Data Science Intern - Consulting Firm (2021 - 2022) | 1 year
- Analyzed customer behavior data using pandas and NumPy
- Built classification and regression models with scikit-learn

PROJECTS
1. Recommendation System: Collaborative filtering ML model for an e-commerce platform with 85% accuracy. GitHub: github.com/miketorres/recommender
2. Customer Churn Classifier: Logistic regression + neural network model deployed in production
3. Data Visualization Dashboard: Interactive analytics dashboard with Python + Tableau

CERTIFICATIONS
- Google Data Analytics Certificate (2022)
- Kaggle ML Competitions - Expert Tier
- Coursera Deep Learning Specialization (Andrew Ng)
- TensorFlow Developer Certificate

EDUCATION
M.Sc Statistics from Columbia University (2021)
B.Sc Mathematics from NYU (2019)`,
  },
];
