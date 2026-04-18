import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

const FAQ: Record<string, string> = {
  'why is my score low': 'Your score depends on how well your resume keywords match the job description. Try adding more relevant skills, technologies, and project keywords that appear in the job posting.',
  'how is ats score calculated': 'ATS score is weighted: 40% Skills, 20% Experience, 15% Education, 15% Projects, and 10% Certifications. Higher keyword overlap = higher score.',
  'how to improve score': 'To improve: (1) Add more matching skills, (2) Include relevant projects with tech keywords, (3) Add certifications, (4) Mirror exact phrases from the job description.',
  'what is ml prediction': 'ML Prediction uses logistic regression on your skill/experience/project/certification overlap to predict if you are Suitable or Not Suitable for the role.',
  'why suspicious': 'A resume is flagged as suspicious if it has very short content, placeholder text, keyboard-mashing patterns, or no recognizable resume sections.',
  'what is preference boost': 'The preference boost adds +3 points to candidates matching a recruiter gender preference. This is a small ranking assist — it does NOT filter out any candidates.',
  'how to add projects': 'In your resume, add a Projects section with names like: "E-commerce platform", "ML classifier", "Dashboard", "API", "Chatbot" etc. These keywords boost your ATS score.',
  'what certifications help': 'Certifications like AWS Certified, Google Cloud, Coursera courses, HackerRank, Kaggle, PMP, and Scrum Master significantly boost your certifications score.',
  'default': "I can help with: score explanation, ATS calculation, how to improve scores, project/certification tips, and ML prediction details. Try asking one of those!",
};

function getBotReply(userInput: string): string {
  const input = userInput.toLowerCase();
  for (const [key, val] of Object.entries(FAQ)) {
    if (key !== 'default' && input.includes(key.split(' ')[0]) && input.includes(key.split(' ')[key.split(' ').length - 1])) {
      return val;
    }
  }
  for (const [key, val] of Object.entries(FAQ)) {
    if (key !== 'default' && key.split(' ').some(word => word.length > 3 && input.includes(word))) {
      return val;
    }
  }
  return FAQ['default'];
}

const QUICK_QUESTIONS = [
  'Why is my score low?',
  'How is ATS score calculated?',
  'How to add projects?',
  'What certifications help?',
];

export default function MiniChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Hi! I am your Resume Screening Assistant. Ask me anything about your scores, ATS ranking, or how to improve your resume.' },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;
    const userMsg: Message = { role: 'user', text: msg };
    const botMsg: Message = { role: 'bot', text: getBotReply(msg) };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput('');
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full gradient-primary text-white shadow-xl shadow-primary/30 flex items-center justify-center"
        title="Resume Assistant"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}><X className="h-6 w-6" /></motion.span>
            : <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}><MessageCircle className="h-6 w-6" /></motion.span>
          }
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 glass-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden flex flex-col"
            style={{ maxHeight: '70vh' }}
          >
            <div className="gradient-primary p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-heading font-semibold text-white text-sm">Resume Assistant</p>
                <p className="text-white/70 text-xs">Always online</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: '40vh' }}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'gradient-primary text-white rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}>
                    {m.text}
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 hover:bg-primary/20 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-border/50 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask about your resume score..."
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => send()}
                className="h-9 w-9 rounded-xl gradient-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
