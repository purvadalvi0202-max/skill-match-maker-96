import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

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
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
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
