import { motion } from 'framer-motion';
import {
  Rocket,
  MessageCircle,
  Mail,
  Bell,
  ClipboardList,
  Circle,
  Clock,
  Inbox,
  ArrowRight
} from 'lucide-react';
import type { Task, TaskCategory } from '../types';

interface TaskListProps {
  tasks: Task[];
  selectedTaskId: number | null;
  onSelectTask: (task: Task) => void;
}

const categoryConfig: Record<TaskCategory, { icon: typeof Circle; label: string }> = {
  deploy: { icon: Rocket, label: 'Deploy' },
  message: { icon: MessageCircle, label: 'Message' },
  email: { icon: Mail, label: 'Email' },
  reminder: { icon: Bell, label: 'Reminder' },
  jira_update: { icon: ClipboardList, label: 'Jira' },
  other: { icon: Circle, label: 'Task' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function TaskList({ tasks, selectedTaskId, onSelectTask }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <motion.div
        className="task-list empty"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Inbox size={48} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', marginBottom: '1rem' }} />
        <p className="empty-title">No tasks yet</p>
        <p className="empty-subtitle">Add your first tasks to see them organized here</p>
      </motion.div>
    );
  }

  return (
    <div className="task-list">
      <div className="task-list-header">
        <h3>Your tasks</h3>
        <span className="count">{tasks.length} {tasks.length === 1 ? 'item' : 'items'}</span>
      </div>

      <motion.div
        className="task-items"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {tasks.map((task) => {
          const config = categoryConfig[task.category] || categoryConfig.other;
          const Icon = config.icon;
          const pendingReminders = task.reminders?.filter(r => r.status === 'pending').length || 0;

          return (
            <motion.div
              key={task.id}
              className={`task-item ${selectedTaskId === task.id ? 'selected' : ''}`}
              onClick={() => onSelectTask(task)}
              variants={itemVariants}
              whileHover={{ backgroundColor: 'var(--bg-hover)' }}
              whileTap={{ scale: 0.995 }}
            >
              <span className={`category-badge ${task.category}`}>
                <Icon size={12} />
                {config.label}
              </span>

              <div className="task-content">
                <p className="task-text">{task.clean_text}</p>
                {task.depends_on && task.depends_on.length > 0 && (
                  <div className="task-meta">
                    <ArrowRight size={12} />
                    <span>Blocked by {task.depends_on.length} {task.depends_on.length === 1 ? 'task' : 'tasks'}</span>
                  </div>
                )}
              </div>

              {pendingReminders > 0 && (
                <motion.span
                  className="reminder-indicator"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  title={`${pendingReminders} ${pendingReminders === 1 ? 'reminder' : 'reminders'} set`}
                >
                  <Clock size={12} />
                  {pendingReminders}
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
