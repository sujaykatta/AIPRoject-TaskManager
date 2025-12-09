import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  X,
  MessageCircle,
  Mail,
  Rocket,
  Clock,
  Trash2,
  Copy,
  Check,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  Sparkles,
  Zap
} from 'lucide-react';
import { taskApi, reminderApi } from '../api/client';
import type { Task, MessageSuggestion, EmailSuggestion, DeployChecklist } from '../types';

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onTaskUpdated: () => void;
  onTaskDeleted: () => void;
}

const categoryConfig = {
  deploy: { icon: Rocket, label: 'Deployment', color: 'var(--category-deploy)' },
  message: { icon: MessageCircle, label: 'Message', color: 'var(--category-message)' },
  email: { icon: Mail, label: 'Email', color: 'var(--category-email)' },
  reminder: { icon: Clock, label: 'Reminder', color: 'var(--category-reminder)' },
  jira_update: { icon: FileText, label: 'Jira update', color: 'var(--category-jira)' },
  other: { icon: AlertCircle, label: 'Task', color: 'var(--text-tertiary)' },
};

export function TaskDetailPanel({ task, onClose, onTaskUpdated, onTaskDeleted }: TaskDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<MessageSuggestion | EmailSuggestion | DeployChecklist | null>(null);
  const [suggestionType, setSuggestionType] = useState<'message' | 'email' | 'deploy' | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderLoading, setReminderLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const config = categoryConfig[task.category] || categoryConfig.other;
  const CategoryIcon = config.icon;

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSuggestMessage = async () => {
    setLoading(true);
    setSuggestion(null);
    try {
      const result = await taskApi.suggestMessage(task.id);
      setSuggestion(result);
      setSuggestionType('message');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestEmail = async () => {
    setLoading(true);
    setSuggestion(null);
    try {
      const result = await taskApi.suggestEmail(task.id);
      setSuggestion(result);
      setSuggestionType('email');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestChecklist = async () => {
    setLoading(true);
    setSuggestion(null);
    setCheckedItems(new Set());
    try {
      const result = await taskApi.suggestDeployChecklist(task.id);
      setSuggestion(result);
      setSuggestionType('deploy');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetReminder = async () => {
    if (!reminderDate || !reminderTime) return;

    setReminderLoading(true);
    try {
      const remindAt = new Date(`${reminderDate}T${reminderTime}`).toISOString();
      await reminderApi.create(task.id, remindAt);
      onTaskUpdated();
      setReminderDate('');
      setReminderTime('');
    } catch (err) {
      console.error(err);
    } finally {
      setReminderLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;

    try {
      await taskApi.delete(task.id);
      onTaskDeleted();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCheckItem = (idx: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const renderSuggestion = () => {
    if (!suggestion || !suggestionType) return null;

    if (suggestionType === 'message') {
      const msg = suggestion as MessageSuggestion;
      return (
        <motion.div
          className="suggestion-box message"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="suggestion-header">
            <MessageCircle size={16} />
            <h4>Suggested message</h4>
          </div>
          <div className="suggestion-content">
            {msg.suggested_message}
          </div>
          <motion.button
            className="copy-btn"
            onClick={() => handleCopy(msg.suggested_message)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </motion.button>
        </motion.div>
      );
    }

    if (suggestionType === 'email') {
      const email = suggestion as EmailSuggestion;
      return (
        <motion.div
          className="suggestion-box email"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="suggestion-header">
            <Mail size={16} />
            <h4>Draft email</h4>
          </div>
          <div className="suggestion-content">
            <div className="email-subject">
              <strong>Subject:</strong> {email.subject}
            </div>
            <div className="email-body">
              <pre>{email.body}</pre>
            </div>
          </div>
          <motion.button
            className="copy-btn"
            onClick={() => handleCopy(`Subject: ${email.subject}\n\n${email.body}`)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </motion.button>
        </motion.div>
      );
    }

    if (suggestionType === 'deploy') {
      const checklist = suggestion as DeployChecklist;
      return (
        <motion.div
          className="suggestion-box deploy"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="suggestion-header">
            <Rocket size={16} />
            <h4>Deploy checklist</h4>
          </div>
          <ul className="checklist">
            {checklist.items.map((item, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={checkedItems.has(idx) ? 'checked' : ''}
              >
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={checkedItems.has(idx)}
                    onChange={() => toggleCheckItem(idx)}
                  />
                  <span className="checkbox-custom">
                    {checkedItems.has(idx) && <Check size={12} />}
                  </span>
                  <span className="checkbox-text">{item}</span>
                </label>
              </motion.li>
            ))}
          </ul>
          <div className="checklist-progress">
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${(checkedItems.size / checklist.items.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span>{checkedItems.size} of {checklist.items.length} complete</span>
          </div>
        </motion.div>
      );
    }
  };

  return (
    <div className="task-detail-panel">
      <div className="panel-header">
        <h3>Task details</h3>
        <motion.button
          className="close-btn"
          onClick={onClose}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          title="Close panel"
        >
          <X size={18} />
        </motion.button>
      </div>

      <div className="panel-content">
        <motion.div
          className="task-info"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p className="task-text">{task.clean_text}</p>
          <span className={`category-tag ${task.category}`}>
            <CategoryIcon size={12} />
            {config.label}
          </span>
          <p className="task-meta">
            <Calendar size={12} />
            Added {format(new Date(task.created_at), 'PPp')}
          </p>
        </motion.div>

        <motion.div
          className="ai-actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <div className="section-header">
            <Zap size={16} />
            <h4>AI actions</h4>
          </div>
          <p className="section-description">Let AI help you get this done faster</p>
          <div className="action-buttons">
            {(task.category === 'message' || task.category === 'other') && (
              <motion.button
                onClick={handleSuggestMessage}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Generate a message draft"
              >
                <MessageCircle size={16} />
                Draft message
              </motion.button>
            )}
            {(task.category === 'email' || task.category === 'other') && (
              <motion.button
                onClick={handleSuggestEmail}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Generate an email draft"
              >
                <Mail size={16} />
                Draft email
              </motion.button>
            )}
            {(task.category === 'deploy' || task.category === 'other') && (
              <motion.button
                onClick={handleSuggestChecklist}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Generate a deployment checklist"
              >
                <Rocket size={16} />
                Create checklist
              </motion.button>
            )}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              className="loading-suggestion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'flex' }}
              >
                <Loader2 size={20} />
              </motion.span>
              Generating with AI...
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {renderSuggestion()}
        </AnimatePresence>

        <motion.div
          className="reminder-section"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          <div className="section-header">
            <Clock size={16} />
            <h4>Schedule reminder</h4>
          </div>
          <p className="section-description">Get notified when it's time to work on this</p>
          <div className="reminder-inputs">
            <input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              title="Select date"
            />
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              title="Select time"
            />
            <motion.button
              onClick={handleSetReminder}
              disabled={!reminderDate || !reminderTime || reminderLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {reminderLoading ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'flex' }}
                  >
                    <Loader2 size={14} />
                  </motion.span>
                  Saving...
                </>
              ) : (
                <>
                  <Clock size={14} />
                  Set reminder
                </>
              )}
            </motion.button>
          </div>

          {task.reminders.length > 0 && (
            <motion.div
              className="existing-reminders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h5>Active reminders</h5>
              <ul>
                {task.reminders.map((r, idx) => (
                  <motion.li
                    key={r.id}
                    className={r.status}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <CheckCircle2 size={12} />
                    <span>{format(new Date(r.remind_at), 'PPp')}</span>
                    <span className="status-badge">{r.status}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          className="danger-zone"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.3 }}
        >
          <motion.button
            className="delete-btn"
            onClick={handleDelete}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 size={16} />
            Delete task
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
