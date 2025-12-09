import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, GitBranch, Inbox } from 'lucide-react';
import { graphApi, taskApi } from '../api/client';
import { TaskGraph } from './TaskGraph';
import type { TaskGraphData } from '../types';

interface TaskGraphViewProps {
  refreshTrigger: number;
  onTaskDeleted?: () => void;
}

export function TaskGraphView({ refreshTrigger, onTaskDeleted }: TaskGraphViewProps) {
  const [tasks, setTasks] = useState<TaskGraphData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await graphApi.get();

      // Convert API response to TaskGraphData format and filter out Done items
      const graphTasks: TaskGraphData[] = data.nodes
        .filter((node) => node.status !== 'Done') // Exclude Done status
        .map((node) => {
          // Map category to the 4 main categories
          let category: TaskGraphData['category'] = 'message';
          if (node.category === 'deploy') category = 'deploy';
          else if (node.category === 'jira_update') category = 'jira_update';
          else if (node.category === 'reminder') category = 'reminder';
          else if (node.category === 'message' || node.category === 'email') category = 'message';
          else category = 'message'; // default for 'other'

          return {
            id: node.id,
            text: node.label,
            category,
            time: node.time || null,
            dependsOn: node.dependsOn || [],
            raw_text: node.raw_text,
            original_message: node.original_message,
            was_improved: node.was_improved,
          };
        });

      setTasks(graphTasks);
    } catch (err) {
      console.error('Failed to fetch graph:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph, refreshTrigger]);

  // Handle task deletion from graph
  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!confirm('Delete this task? This action cannot be undone.')) return;

    try {
      await taskApi.delete(parseInt(taskId, 10));
      // Remove from local state immediately for snappy UX
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      // Notify parent to refresh other views
      onTaskDeleted?.();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, [onTaskDeleted]);

  if (loading) {
    return (
      <motion.div
        className="graph-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex' }}
        >
          <Loader2 size={32} strokeWidth={2} style={{ color: 'var(--primary-500)' }} />
        </motion.div>
        <p>Building your task map...</p>
      </motion.div>
    );
  }

  if (tasks.length === 0) {
    return (
      <motion.div
        className="graph-empty"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Inbox size={48} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', marginBottom: '1rem' }} />
        <p className="empty-title">No tasks to visualize</p>
        <span className="subtitle">Add tasks to see how they connect and depend on each other</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="task-graph-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="graph-header">
        <GitBranch size={18} />
        <span>Dependency map</span>
        <span className="task-count">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
      </div>
      <TaskGraph tasks={tasks} onDeleteTask={handleDeleteTask} />
    </motion.div>
  );
}
