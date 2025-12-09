import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, User, CheckCircle, Zap, GitBranch, Bell } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface OnboardingPageProps {
  onComplete: () => void;
}

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUserName } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    // Small delay for animation effect
    await new Promise(resolve => setTimeout(resolve, 400));

    setUserName(name.trim());
    onComplete();
  };

  const features = [
    { icon: Zap, text: 'AI-powered task organization' },
    { icon: GitBranch, text: 'Visual dependency mapping' },
    { icon: Bell, text: 'Smart reminders & notifications' },
  ];

  return (
    <div className="onboarding-page">
      {/* Background effects */}
      <div className="onboarding-bg">
        <motion.div
          className="bg-gradient bg-gradient-1"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="bg-gradient bg-gradient-2"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="bg-gradient bg-gradient-3"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Main content card */}
      <motion.div
        className="onboarding-card"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <motion.div
          className="onboarding-logo"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            className="logo-icon-large"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(59, 130, 246, 0)',
                '0 0 0 20px rgba(59, 130, 246, 0.1)',
                '0 0 0 0 rgba(59, 130, 246, 0)',
              ],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Sparkles size={36} />
          </motion.div>
        </motion.div>

        {/* Heading */}
        <motion.div
          className="onboarding-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h1 className="onboarding-title">Welcome to TaskMap</h1>
          <p className="onboarding-subtitle">
            Your intelligent workspace for organizing tasks, visualizing dependencies, and boosting productivity.
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          className="onboarding-features"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              className="feature-pill"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + idx * 0.1 }}
            >
              <feature.icon size={14} />
              <span>{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Divider */}
        <motion.div
          className="onboarding-divider"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        />

        {/* Form */}
        <motion.form
          className="onboarding-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <label className="form-label">
            Let's personalize your experience
          </label>

          <div className="input-wrapper">
            <div className="input-icon">
              <User size={20} />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              maxLength={30}
              disabled={isSubmitting}
            />
            {name.trim() && (
              <motion.div
                className="input-check"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <CheckCircle size={18} />
              </motion.div>
            )}
          </div>

          <motion.button
            type="submit"
            className="onboarding-btn"
            disabled={!name.trim() || isSubmitting}
            whileHover={{ scale: name.trim() && !isSubmitting ? 1.02 : 1 }}
            whileTap={{ scale: name.trim() && !isSubmitting ? 0.98 : 1 }}
          >
            {isSubmitting ? (
              <motion.div
                className="btn-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="loading-spinner"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <span>Setting up your workspace...</span>
              </motion.div>
            ) : (
              <>
                <span>Get started</span>
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>
        </motion.form>

        {/* Footer */}
        <motion.p
          className="onboarding-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          Powered by AI to help you work smarter
        </motion.p>
      </motion.div>
    </div>
  );
}
