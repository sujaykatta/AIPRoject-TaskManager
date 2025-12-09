import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, List, GitBranch, Zap, Moon, Sun, Settings, Columns, Wand2, RefreshCw, Loader2, Trash2, AlertTriangle, Network, MessageSquare } from 'lucide-react';
import { TaskList } from './TaskList';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TaskGraphView } from './TaskGraphView';
import { TaskVisualization } from './TaskVisualization';
import { KanbanBoard } from './KanbanBoard';
import { ReminderPanel } from './ReminderPanel';
import { SettingsPanel } from './SettingsPanel';
import { MessageAnalyzer } from './MessageAnalyzer';
import { TeamsMentionsModal } from './TeamsMentionsModal';
import { taskApi } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import type { Task, ReanalyzeResponse } from '../types';

// Delete All Confirmation Modal Component
function DeleteAllModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  taskCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  taskCount: number;
}) {
  if (!isOpen) return null;

  return (
    <motion.div
      className="delete-all-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="delete-all-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="delete-all-modal-icon">
          <AlertTriangle size={48} />
        </div>
        <h2 className="delete-all-modal-title">Delete All Tasks?</h2>
        <p className="delete-all-modal-message">
          Are you sure you want to delete <strong>all {taskCount} tasks</strong>? This action cannot be undone.
        </p>
        <p className="delete-all-modal-warning">
          This will permanently remove all tasks from the database, graphs, Kanban board, and all other views.
        </p>
        <div className="delete-all-modal-actions">
          <motion.button
            className="delete-all-modal-cancel"
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isDeleting}
          >
            Cancel
          </motion.button>
          <motion.button
            className="delete-all-modal-confirm"
            onClick={onConfirm}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'flex' }}
                >
                  <Loader2 size={18} />
                </motion.span>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={18} />
                Delete All Tasks
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface TaskDashboardProps {
  initialTasks: Task[];
  onAddMore: () => void;
}

export function TaskDashboard({ initialTasks, onAddMore }: TaskDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [view, setView] = useState<'list' | 'kanban' | 'graph' | 'visualize'>('kanban');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyzerOpen, setAnalyzerOpen] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeResult, setReanalyzeResult] = useState<ReanalyzeResponse | null>(null);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [teamsModalOpen, setTeamsModalOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { userName, greeting } = useUser();

  const fetchTasks = useCallback(async () => {
    try {
      const data = await taskApi.getAll();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, []);

  useEffect(() => {
    if (initialTasks.length > 0) {
      setTasks(initialTasks);
    } else {
      fetchTasks();
    }
  }, [initialTasks, fetchTasks]);

  const handleTaskUpdated = () => {
    fetchTasks();
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleTaskDeleted = () => {
    setSelectedTask(null);
    fetchTasks();
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSelectTask = async (task: Task) => {
    try {
      const freshTask = await taskApi.getById(task.id);
      setSelectedTask(freshTask);
    } catch {
      setSelectedTask(task);
    }
  };

  const handleReanalyze = async () => {
    if (isReanalyzing || tasks.length === 0) return;

    setIsReanalyzing(true);
    setReanalyzeResult(null);

    try {
      const result = await taskApi.reanalyze();
      setReanalyzeResult(result);

      // Refresh tasks after reanalysis
      await fetchTasks();
      setRefreshTrigger((prev) => prev + 1);

      // Clear result after 5 seconds
      setTimeout(() => setReanalyzeResult(null), 5000);
    } catch (err) {
      console.error('Failed to reanalyze tasks:', err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleDeleteAll = async () => {
    if (isDeleting || tasks.length === 0) return;

    setIsDeleting(true);

    try {
      await taskApi.deleteAll();

      // Clear local state
      setTasks([]);
      setSelectedTask(null);

      // Clear localStorage for pinned tasks and graph positions
      localStorage.removeItem('taskmap-pinned-tasks');
      localStorage.removeItem('taskmap-node-positions');

      // Trigger refresh across all views
      setRefreshTrigger((prev) => prev + 1);

      // Close modal
      setDeleteAllModalOpen(false);
    } catch (err) {
      console.error('Failed to delete all tasks:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="task-dashboard">
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Left: Logo and Greeting */}
        <div className="header-left">
          <div className="logo">
            <div className="logo-icon">
              <Zap size={20} />
            </div>
            <div className="logo-text">
              <h1 className="logo-title"><span className="greeting-text">{greeting},</span> {userName}</h1>
              <span className="logo-subtitle">TaskFlow AI - Powered by Intelligence</span>
            </div>
          </div>
        </div>

        {/* Center: Action Buttons */}
        <div className="header-center">
          <div className="action-group">
            <motion.button
              onClick={onAddMore}
              className="header-btn primary-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Add new tasks"
            >
              <Plus size={18} />
              <span>Add Tasks</span>
            </motion.button>

            <motion.button
              onClick={() => setTeamsModalOpen(true)}
              className="header-btn teams-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Get your latest Teams mentions"
            >
              <MessageSquare size={18} />
              <span>Teams</span>
            </motion.button>

            <motion.button
              onClick={() => setAnalyzerOpen(true)}
              className="header-btn analyzer-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Analyze messy messages with AI"
            >
              <Wand2 size={18} />
              <span>Analyze</span>
            </motion.button>

            <motion.button
              onClick={handleReanalyze}
              className="header-btn reanalyze-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isReanalyzing || tasks.length === 0}
              title="Re-analyze existing tasks to improve quality"
            >
              {isReanalyzing ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'flex' }}
                >
                  <Loader2 size={18} />
                </motion.span>
              ) : (
                <RefreshCw size={18} />
              )}
              <span>{isReanalyzing ? 'Improving...' : 'Improve'}</span>
            </motion.button>

            <motion.button
              onClick={() => setDeleteAllModalOpen(true)}
              className="header-btn delete-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={tasks.length === 0}
              title="Delete all tasks"
            >
              <Trash2 size={18} />
              <span>Delete All</span>
            </motion.button>
          </div>
        </div>

        {/* Right: View Controls & Settings */}
        <div className="header-right">
          <div className="view-toggle">
            <button
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
              title="View as list"
            >
              <List size={16} />
              <span>List</span>
            </button>
            <button
              className={view === 'kanban' ? 'active' : ''}
              onClick={() => setView('kanban')}
              title="View as Kanban board"
            >
              <Columns size={16} />
              <span>Kanban</span>
            </button>
            <button
              className={view === 'graph' ? 'active' : ''}
              onClick={() => setView('graph')}
              title="View as dependency graph"
            >
              <GitBranch size={16} />
              <span>Graph</span>
            </button>
            <button
              className={view === 'visualize' ? 'active' : ''}
              onClick={() => setView('visualize')}
              title="Flowchart & Tree visualization"
            >
              <Network size={16} />
              <span>Visualize</span>
            </button>
          </div>

          <div className="control-group">
            <ReminderPanel refreshTrigger={refreshTrigger} />

            <motion.button
              className="icon-btn theme-toggle"
              onClick={toggleTheme}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.span
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun size={18} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon size={18} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.button
              className="icon-btn settings-btn"
              onClick={() => setSettingsOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Open settings"
            >
              <Settings size={18} />
            </motion.button>
          </div>
        </div>

        {/* Reanalyze Result Toast */}
        <AnimatePresence>
          {reanalyzeResult && (
            <motion.div
              className="reanalyze-toast"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="toast-content">
                <RefreshCw size={16} />
                <span>
                  {reanalyzeResult.improved_count > 0 && `${reanalyzeResult.improved_count} improved`}
                  {reanalyzeResult.removed_count > 0 && ` ${reanalyzeResult.removed_count} removed`}
                  {reanalyzeResult.unchanged_count > 0 && ` ${reanalyzeResult.unchanged_count} unchanged`}
                  {reanalyzeResult.improved_count === 0 && reanalyzeResult.removed_count === 0 && 'All tasks look good!'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="dashboard-content">
        <motion.div
          className="main-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <AnimatePresence mode="wait">
            {view === 'list' && (
              <motion.div
                key="list"
                className="list-view-container"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <TaskList
                  tasks={tasks}
                  selectedTaskId={selectedTask?.id ?? null}
                  onSelectTask={handleSelectTask}
                />
              </motion.div>
            )}
            {view === 'kanban' && (
              <motion.div
                key="kanban"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                style={{ height: '100%' }}
              >
                <KanbanBoard
                  refreshTrigger={refreshTrigger}
                  onTaskDeleted={handleTaskDeleted}
                />
              </motion.div>
            )}
            {view === 'graph' && (
              <motion.div
                key="graph"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                style={{ height: '100%' }}
              >
                <TaskGraphView
                  refreshTrigger={refreshTrigger}
                  onTaskDeleted={handleTaskDeleted}
                />
              </motion.div>
            )}
            {view === 'visualize' && (
              <motion.div
                key="visualize"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                style={{ height: '100%' }}
              >
                <TaskVisualization
                  refreshTrigger={refreshTrigger}
                  onTaskDeleted={handleTaskDeleted}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {selectedTask && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.2 }}
            >
              <TaskDetailPanel
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                onTaskUpdated={handleTaskUpdated}
                onTaskDeleted={handleTaskDeleted}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <MessageAnalyzer
        isOpen={analyzerOpen}
        onClose={() => setAnalyzerOpen(false)}
        onTasksExtracted={(extractedTasks) => {
          // Refresh tasks after extraction
          handleTaskUpdated();
        }}
      />

      <AnimatePresence>
        <DeleteAllModal
          isOpen={deleteAllModalOpen}
          onClose={() => setDeleteAllModalOpen(false)}
          onConfirm={handleDeleteAll}
          isDeleting={isDeleting}
          taskCount={tasks.length}
        />
      </AnimatePresence>

      <TeamsMentionsModal
        isOpen={teamsModalOpen}
        onClose={() => setTeamsModalOpen(false)}
        onTasksCreated={handleTaskUpdated}
      />
    </div>
  );
}
