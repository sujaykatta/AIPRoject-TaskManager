import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Bell, ChevronDown, ChevronRight, AlertTriangle, Calendar, X, Loader2 } from 'lucide-react';
import { reminderApi } from '../api/client';
import type { Reminder } from '../types';

interface ReminderPanelProps {
  refreshTrigger: number;
}

export function ReminderPanel({ refreshTrigger }: ReminderPanelProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifications, setNotifications] = useState<Reminder[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, notifs] = await Promise.all([
        reminderApi.getPending(),
        reminderApi.getNotifications(),
      ]);
      setReminders(pending);
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();

    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchReminders, 30000);
    return () => clearInterval(interval);
  }, [fetchReminders, refreshTrigger]);

  const handleDismiss = async (id: number) => {
    try {
      await reminderApi.delete(id);
      fetchReminders();
    } catch (err) {
      console.error('Failed to dismiss reminder:', err);
    }
  };

  const upcomingReminders = reminders.filter(r => !notifications.find(n => n.id === r.id));

  return (
    <motion.div
      className={`reminder-panel ${expanded ? 'expanded' : ''}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="reminder-header"
        onClick={() => setExpanded(!expanded)}
        whileHover={{ backgroundColor: 'var(--bg-hover)' }}
        whileTap={{ scale: 0.995 }}
      >
        <span className="bell-icon">
          <Bell size={18} />
          <AnimatePresence>
            {notifications.length > 0 && (
              <motion.span
                className="notification-badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                {notifications.length}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="reminder-title">
          Reminders
          <span className="count">({reminders.length})</span>
        </span>
        <motion.span
          className="expand-icon"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} />
        </motion.span>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="reminder-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loading && (
              <motion.div
                className="loading-small"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'flex' }}
                >
                  <Loader2 size={16} />
                </motion.span>
                Loading...
              </motion.div>
            )}

            <AnimatePresence>
              {notifications.length > 0 && (
                <motion.div
                  className="notifications-section"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="section-title">
                    <AlertTriangle size={14} />
                    <h4>Needs attention</h4>
                  </div>
                  {notifications.map((notif, idx) => (
                    <motion.div
                      key={notif.id}
                      className="notification-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="notification-content">
                        <p>{notif.task_text}</p>
                        <span className="due-time">
                          <Calendar size={12} />
                          {format(new Date(notif.remind_at), 'PPp')}
                        </span>
                      </div>
                      <motion.button
                        className="dismiss-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismiss(notif.id);
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X size={14} />
                      </motion.button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className="upcoming-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="section-title">
                <Calendar size={14} />
                <h4>Coming up</h4>
              </div>
              {upcomingReminders.length === 0 ? (
                <motion.p
                  className="no-reminders"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  No reminders scheduled yet
                </motion.p>
              ) : (
                upcomingReminders.map((reminder, idx) => (
                  <motion.div
                    key={reminder.id}
                    className="reminder-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="reminder-content">
                      <p>{reminder.task_text}</p>
                      <span className="remind-time">
                        <Calendar size={12} />
                        {format(new Date(reminder.remind_at), 'PPp')}
                      </span>
                    </div>
                    <motion.button
                      className="dismiss-btn small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(reminder.id);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={12} />
                    </motion.button>
                  </motion.div>
                ))
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
