import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Zap, ArrowLeft } from 'lucide-react';
import { TaskPasteArea, TaskDashboard, OnboardingPage } from './components';
import { OAuthCallback } from './components/OAuthCallback';
import { taskApi } from './api/client';
import { useUser } from './contexts/UserContext';
import type { Task } from './types';

type View = 'onboarding' | 'paste' | 'dashboard';

const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
};

function App() {
  const { isOnboarded, userName, greeting } = useUser();
  const [view, setView] = useState<View>(isOnboarded ? 'paste' : 'onboarding');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if this is an OAuth callback
  if (window.location.pathname === '/auth/callback') {
    return <OAuthCallback />;
  }

  useEffect(() => {
    if (!isOnboarded) {
      setLoading(false);
      setView('onboarding');
      return;
    }

    const checkExistingTasks = async () => {
      try {
        const existingTasks = await taskApi.getAll();
        if (existingTasks.length > 0) {
          setTasks(existingTasks);
          setView('dashboard');
        } else {
          setView('paste');
        }
      } catch (err) {
        console.error('Backend not available:', err);
        setView('paste');
      } finally {
        setLoading(false);
      }
    };

    checkExistingTasks();
  }, [isOnboarded]);

  const handleOnboardingComplete = () => {
    setView('paste');
  };

  const handleTasksParsed = (newTasks: Task[]) => {
    setTasks((prev) => [...newTasks, ...prev]);
    setView('dashboard');
  };

  const handleAddMore = () => {
    setView('paste');
  };

  if (loading) {
    return (
      <div className="app loading-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 size={40} strokeWidth={2} style={{ color: 'var(--primary-500)' }} />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {userName ? `Setting up your workspace, ${userName}...` : 'Preparing TaskFlow AI...'}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {view === 'onboarding' ? (
          <motion.div
            key="onboarding"
            {...pageTransition}
            style={{ height: '100vh' }}
          >
            <OnboardingPage onComplete={handleOnboardingComplete} />
          </motion.div>
        ) : view === 'paste' ? (
          <motion.div
            key="paste"
            className="paste-view"
            {...pageTransition}
          >
            <header className="app-header">
              <motion.div
                className="logo"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="logo-icon">
                  <Zap size={24} />
                </div>
                <h1>TaskFlow AI</h1>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Transform your to-do list into an organized, intelligent workflow
              </motion.p>
            </header>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <TaskPasteArea onTasksParsed={handleTasksParsed} />
            </motion.div>

            {tasks.length > 0 && (
              <motion.button
                className="back-btn"
                onClick={() => setView('dashboard')}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            {...pageTransition}
            style={{ height: '100vh' }}
          >
            <TaskDashboard initialTasks={tasks} onAddMore={handleAddMore} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
