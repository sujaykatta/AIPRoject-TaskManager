import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, AlertCircle, Loader2, Lightbulb } from 'lucide-react';
import { taskApi } from '../api/client';
import type { Task } from '../types';

interface TaskPasteAreaProps {
  onTasksParsed: (tasks: Task[]) => void;
}

export function TaskPasteArea({ onTasksParsed }: TaskPasteAreaProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Add some tasks to get started');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await taskApi.parse(text);
      onTasksParsed(response.tasks);
      setText('');
    } catch (err) {
      setError('Unable to process your tasks. Please check that the server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-paste-area">
      <h2>What's on your plate?</h2>
      <p className="subtitle">
        Paste your tasks below and let AI organize them for you
      </p>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
        }}
        placeholder={`Try something like:

- Deploy the new API to production
- Message John about project timeline
- Send weekly report to the client
- Remind me to review pull requests at 3pm
- Update Jira ticket after deployment

Pro tip: Include details like names, times, and dependencies for smarter organization.`}
        rows={10}
        disabled={loading}
      />

      {error && (
        <motion.div
          className="error-message"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={16} />
          {error}
        </motion.div>
      )}

      <motion.button
        onClick={handleAnalyze}
        disabled={loading || !text.trim()}
        className="primary-btn"
        whileHover={{ scale: loading ? 1 : 1.01 }}
        whileTap={{ scale: loading ? 1 : 0.99 }}
      >
        {loading ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'flex' }}
            >
              <Loader2 size={20} />
            </motion.span>
            Processing with AI...
          </>
        ) : (
          <>
            <Wand2 size={20} />
            Generate task map
          </>
        )}
      </motion.button>

      <motion.div
        className="helper-tip"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Lightbulb size={14} />
        <span>AI will categorize tasks, detect dependencies, and suggest next actions</span>
      </motion.div>
    </div>
  );
}
