import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  MessageSquare,
  Rocket,
  Bell,
  FileCode,
  MoreHorizontal,
  ArrowRight,
  X,
  User,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { taskApi } from '../api/client';
import { useUser } from '../contexts/UserContext';
import type { MessageAnalysisResult, ImprovedMessage, ExtractedTask, TaskCategory } from '../types';

interface MessageAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksExtracted?: (tasks: ExtractedTask[]) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  message: <MessageSquare size={14} />,
  email: <MessageSquare size={14} />,
  deploy: <Rocket size={14} />,
  reminder: <Bell size={14} />,
  jira_update: <FileCode size={14} />,
  other: <MoreHorizontal size={14} />,
};

const categoryColors: Record<string, string> = {
  message: 'var(--primary-500)',
  email: 'var(--primary-400)',
  deploy: 'var(--warning-500)',
  reminder: 'var(--accent-500)',
  jira_update: 'var(--info-500)',
  other: 'var(--slate-500)',
};

const priorityColors: Record<string, string> = {
  high: 'var(--error)',
  medium: 'var(--warning-500)',
  low: 'var(--success)',
};

export function MessageAnalyzer({ isOpen, onClose, onTasksExtracted }: MessageAnalyzerProps) {
  const { userProfile } = useUser();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MessageAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await taskApi.analyzeMessages(inputText, userProfile);
      setResult(analysisResult);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Failed to analyze message. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [inputText, userProfile]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleAddTasks = useCallback(() => {
    if (result?.tasks && onTasksExtracted) {
      onTasksExtracted(result.tasks);
      onClose();
    }
  }, [result, onTasksExtracted, onClose]);

  const handleClear = useCallback(() => {
    setInputText('');
    setResult(null);
    setError(null);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="analyzer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="analyzer-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="analyzer-header">
              <div className="analyzer-title">
                <Sparkles size={20} />
                <h3>Message Analyzer</h3>
              </div>
              <motion.button
                className="close-btn"
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={18} />
              </motion.button>
            </div>

            <div className="analyzer-content">
              {/* Input Section */}
              <div className="analyzer-input-section">
                <label>Paste messy messages, conversations, or task lists</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your message here... e.g., 'hey john can u deploy the thing today? also update jira pls and remind me 2 review pr tmrw'"
                  disabled={loading}
                  rows={6}
                />
                <div className="input-actions">
                  <motion.button
                    className="clear-btn"
                    onClick={handleClear}
                    disabled={loading || !inputText}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Clear
                  </motion.button>
                  <motion.button
                    className="analyze-btn"
                    onClick={handleAnalyze}
                    disabled={loading || !inputText.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          style={{ display: 'flex' }}
                        >
                          <Loader2 size={16} />
                        </motion.span>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Analyze with AI
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="analyzer-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results Section */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    className="analyzer-results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Summary */}
                    <div className="result-summary">
                      <div className={`relevance-badge ${result.relevantToUser ? 'relevant' : 'not-relevant'}`}>
                        <User size={12} />
                        {result.relevantToUser ? 'Relevant to you' : 'Not directly assigned'}
                      </div>
                      <p>{result.summary}</p>
                    </div>

                    {/* Improved Messages */}
                    {result.improvedMessages.length > 0 && (
                      <div className="result-section">
                        <h4>
                          <MessageSquare size={16} />
                          Improved Messages
                        </h4>
                        <div className="improved-messages">
                          {result.improvedMessages.map((msg, idx) => (
                            <motion.div
                              key={idx}
                              className="improved-message"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                            >
                              <div className="message-original">
                                <span className="label">Original:</span>
                                <p>"{msg.original}"</p>
                              </div>
                              <ArrowRight size={16} className="arrow" />
                              <div className="message-improved">
                                <span className="label">
                                  <Check size={12} />
                                  Improved:
                                </span>
                                <p>"{msg.improved}"</p>
                                <motion.button
                                  className="copy-btn"
                                  onClick={() => handleCopy(msg.improved, `msg-${idx}`)}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  {copiedId === `msg-${idx}` ? (
                                    <Check size={14} />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </motion.button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extracted Tasks */}
                    {result.tasks.length > 0 && (
                      <div className="result-section">
                        <h4>
                          <FileCode size={16} />
                          Extracted Tasks ({result.tasks.length})
                        </h4>
                        <div className="extracted-tasks">
                          {result.tasks.map((task, idx) => (
                            <motion.div
                              key={idx}
                              className="extracted-task"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                            >
                              <div className="task-header">
                                <span
                                  className="task-category"
                                  style={{ color: categoryColors[task.category] || categoryColors.other }}
                                >
                                  {categoryIcons[task.category] || categoryIcons.other}
                                  {task.category.replace('_', ' ')}
                                </span>
                                <span
                                  className="task-priority"
                                  style={{ backgroundColor: priorityColors[task.priority] }}
                                >
                                  {task.priority === 'high' && <AlertTriangle size={10} />}
                                  {task.priority}
                                </span>
                              </div>
                              <p className="task-text">{task.text}</p>
                              <div className="task-meta">
                                <span className="assigned-to">
                                  <User size={12} />
                                  {task.assignedTo === 'user' ? 'You' : task.assignedTo}
                                </span>
                                {task.dueDate && (
                                  <span className="due-date">
                                    <Clock size={12} />
                                    {task.dueDate}
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                        <motion.button
                          className="add-tasks-btn"
                          onClick={handleAddTasks}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Check size={16} />
                          Add {result.tasks.length} task{result.tasks.length > 1 ? 's' : ''} to board
                        </motion.button>
                      </div>
                    )}

                    {/* No Results */}
                    {result.improvedMessages.length === 0 && result.tasks.length === 0 && (
                      <div className="no-results">
                        <AlertCircle size={24} />
                        <p>No actionable items found in this message.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
