import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { FileText, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    setSubmitting(false);
    if (error) toast.error(error.message);
    else if (isSignUp) toast.success('Account created! You are now logged in.');
    else toast.success('Welcome back!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animated-gradient-bg relative overflow-hidden">
      {/* Floating decorative blobs */}
      <motion.div
        className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
        animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl"
        animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-card rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-primary-foreground mb-4"
              whileHover={{ rotate: 8, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <FileText className="h-8 w-8" />
            </motion.div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Resume Screener</h1>
            <p className="text-muted-foreground mt-2 flex items-center justify-center gap-1.5 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-powered candidate matching
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="float-field">
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required
              />
              <label htmlFor="email">Email address</label>
            </div>
            <div className="float-field">
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
              />
              <label htmlFor="password">Password</label>
            </div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                className="w-full rounded-xl h-12 text-base gradient-primary text-primary-foreground border-0 hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Please wait...
                  </span>
                ) : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </motion.div>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary font-semibold hover:underline">
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
