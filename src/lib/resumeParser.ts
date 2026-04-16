// Simple text extraction from uploaded files (supports .txt and basic text from files)
// For production, you'd use a PDF parsing library or edge function

export async function extractTextFromFile(file: File): Promise<string> {
  // For text files, read directly
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return await file.text();
  }

  // For PDF files, extract text client-side (basic approach)
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    return await extractFromPdf(file);
  }

  // For other files, try to read as text
  return await file.text();
}

async function extractFromPdf(file: File): Promise<string> {
  // Simple PDF text extraction by reading raw bytes and finding text streams
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let text = '';

  // Decode as Latin-1 to preserve byte values
  const raw = Array.from(bytes).map(b => String.fromCharCode(b)).join('');

  // Extract text between BT and ET markers (PDF text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      text += tjMatch[1] + ' ';
    }
    // TJ arrays
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = tjArrMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(inner)) !== null) {
        text += strMatch[1];
      }
      text += ' ';
    }
  }

  // If no text was extracted, return a note
  if (!text.trim()) {
    return 'Unable to extract text from PDF. Please upload a text-based resume (.txt) for best results.';
  }

  return text.trim();
}

// Sample resume texts for demo purposes
export const SAMPLE_RESUMES = [
  {
    name: 'Alex Johnson - Java Developer',
    text: `Alex Johnson - Senior Java Developer
Skills: Java, Spring Boot, Microservices, REST API, SQL, PostgreSQL, Docker, Kubernetes, AWS, Git, CI/CD, Agile, Scrum, Testing, Selenium, Jenkins
Experience: 5 years as Backend Software Engineer developing enterprise Java applications, API design, microservices architecture, cloud deployment on AWS, team lead for a 6-person engineering team
Education: B.Tech Computer Science from MIT University, Oracle Java Certified Professional`,
  },
  {
    name: 'Sarah Chen - Full Stack Developer',
    text: `Sarah Chen - Full Stack Software Developer
Skills: Python, JavaScript, TypeScript, React, Node, Express, MongoDB, SQL, Docker, Git, HTML, CSS, REST, GraphQL, AWS, Agile
Experience: 3 years as Full-Stack Web Developer building modern web applications, frontend and backend development, API integration, mobile responsive design, junior developer
Education: B.Sc Computer Science from Stanford University, AWS Solutions Architect Certification`,
  },
  {
    name: 'Mike Torres - Data Analyst',
    text: `Mike Torres - Business Data Analyst
Skills: Python, SQL, Pandas, NumPy, Data Science, Machine Learning, Tensorflow, Excel, Tableau
Experience: 2 years as Data Analyst performing statistical analysis, data visualization, reporting, intern at consulting firm
Education: M.Sc Statistics from Columbia University, Google Data Analytics Certificate`,
  },
];
