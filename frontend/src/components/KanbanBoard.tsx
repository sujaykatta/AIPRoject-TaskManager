import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Loader2,
  Inbox,
  ListTodo,
  Clock,
  CheckCircle2,
  Trash2,
  MessageSquare,
  Rocket,
  Bell,
  FileCode,
  MoreHorizontal,
  Mail,
  Calendar,
  User,
  Tag,
  X,
  Sparkles,
  AlertCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from 'lucide-react';
import { taskApi } from '../api/client';
import type { Task, TaskStatus, TaskCategory, TaskPriority } from '../types';

interface KanbanBoardProps {
  refreshTrigger: number;
  onTaskDeleted?: () => void;
}

interface Column {
  id: TaskStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const columns: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    icon: <ListTodo size={18} />,
    color: 'var(--slate-500)',
    bgColor: 'rgba(100, 116, 139, 0.08)',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    icon: <Clock size={18} />,
    color: 'var(--primary-500)',
    bgColor: 'rgba(99, 102, 241, 0.08)',
  },
  {
    id: 'done',
    title: 'Done',
    icon: <CheckCircle2 size={18} />,
    color: 'var(--success-500)',
    bgColor: 'rgba(34, 197, 94, 0.08)',
  },
];

// Premium category configuration
const categoryConfig: Record<TaskCategory, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  message: {
    icon: <MessageSquare size={12} />,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    label: 'Message',
  },
  email: {
    icon: <Mail size={12} />,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    label: 'Email',
  },
  deploy: {
    icon: <Rocket size={12} />,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    label: 'Deploy',
  },
  reminder: {
    icon: <Bell size={12} />,
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.12)',
    label: 'Reminder',
  },
  jira_update: {
    icon: <FileCode size={12} />,
    color: '#0ea5e9',
    bg: 'rgba(14, 165, 233, 0.12)',
    label: 'Jira',
  },
  other: {
    icon: <MoreHorizontal size={12} />,
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)',
    label: 'Other',
  },
};

// Priority configuration
const priorityConfig: Record<TaskPriority, { icon: React.ReactNode; color: string; label: string }> = {
  high: {
    icon: <ArrowUp size={12} />,
    color: '#ef4444',
    label: 'High',
  },
  medium: {
    icon: <ArrowRight size={12} />,
    color: '#f59e0b',
    label: 'Medium',
  },
  low: {
    icon: <ArrowDown size={12} />,
    color: '#22c55e',
    label: 'Low',
  },
};

// Task Detail Modal Component
interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onDelete: (id: number) => void;
}

function TaskDetailModal({ task, onClose, onDelete }: TaskDetailModalProps) {
  const category = categoryConfig[task.category];
  const priority = priorityConfig[task.priority || 'medium'];

  return (
    <motion.div
      className="kanban-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="kanban-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-badges">
            <span
              className="category-badge"
              style={{ color: category.color, background: category.bg }}
            >
              {category.icon}
              {category.label}
            </span>
            <span
              className="priority-badge"
              style={{ color: priority.color }}
            >
              {priority.icon}
              {priority.label}
            </span>
            {task.was_improved && (
              <span className="ai-badge">
                <Sparkles size={12} />
                AI Improved
              </span>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <h2 className="modal-title">{task.clean_text}</h2>

          {task.raw_text && task.raw_text !== task.clean_text && (
            <div className="modal-section">
              <h4>Original Text</h4>
              <p className="original-text">{task.raw_text}</p>
            </div>
          )}

          {task.original_message && (
            <div className="modal-section">
              <h4>Full Message Context</h4>
              <div className="message-context">{task.original_message}</div>
            </div>
          )}

          <div className="modal-meta">
            {task.assigned_to && (
              <div className="meta-item">
                <User size={14} />
                <span>{task.assigned_to}</span>
              </div>
            )}
            {task.due_at && (
              <div className="meta-item">
                <Calendar size={14} />
                <span>{new Date(task.due_at).toLocaleDateString()}</span>
              </div>
            )}
            {task.jira_ticket && (
              <div className="meta-item">
                <Tag size={14} />
                <span>{task.jira_ticket}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="modal-delete-btn"
            onClick={() => {
              onDelete(task.id);
              onClose();
            }}
          >
            <Trash2 size={14} />
            Delete Task
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Sortable Task Card - ENTIRE CARD IS DRAGGABLE
interface SortableTaskCardProps {
  task: Task;
  onDelete: (id: number) => void;
  onViewDetails: (task: Task) => void;
}

function SortableTaskCard({ task, onDelete, onViewDetails }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString() });

  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const category = categoryConfig[task.category];
  const priority = priorityConfig[task.priority || 'medium'];

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger on delete button
    if ((e.target as HTMLElement).closest('.card-delete-btn')) return;

    clickCount.current += 1;

    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        // Single click - show details panel (for now, same as double click)
        clickCount.current = 0;
      }, 250);
    } else if (clickCount.current === 2) {
      // Double click - open modal
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickCount.current = 0;
      onViewDetails(task);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`kanban-task-card ${isDragging ? 'dragging' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      layout
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      {/* Card Header */}
      <div className="task-card-header">
        <span
          className="category-badge"
          style={{ color: category.color, background: category.bg }}
        >
          {category.icon}
          {category.label}
        </span>
        <div className="card-header-right">
          {task.was_improved && (
            <span className="ai-indicator" title="AI Improved">
              <Sparkles size={12} />
            </span>
          )}
          <span
            className="priority-indicator"
            style={{ color: priority.color }}
            title={`${priority.label} priority`}
          >
            {priority.icon}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="task-card-body">
        <p className="task-text">{task.clean_text}</p>
      </div>

      {/* Card Footer */}
      <div className="task-card-footer">
        <div className="footer-meta">
          {task.due_at && (
            <span className="due-date">
              <Calendar size={12} />
              {new Date(task.due_at).toLocaleDateString()}
            </span>
          )}
          {task.assigned_to && (
            <span className="assignee">
              <User size={12} />
              {task.assigned_to}
            </span>
          )}
        </div>
        <button
          className="card-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          title="Delete task"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

// Task Card Overlay (shown during drag)
interface TaskCardOverlayProps {
  task: Task;
}

function TaskCardOverlay({ task }: TaskCardOverlayProps) {
  const category = categoryConfig[task.category];
  const priority = priorityConfig[task.priority || 'medium'];

  return (
    <div className="kanban-task-card overlay">
      <div className="task-card-header">
        <span
          className="category-badge"
          style={{ color: category.color, background: category.bg }}
        >
          {category.icon}
          {category.label}
        </span>
        <div className="card-header-right">
          {task.was_improved && (
            <span className="ai-indicator">
              <Sparkles size={12} />
            </span>
          )}
          <span className="priority-indicator" style={{ color: priority.color }}>
            {priority.icon}
          </span>
        </div>
      </div>
      <div className="task-card-body">
        <p className="task-text">{task.clean_text}</p>
      </div>
      <div className="task-card-footer">
        <div className="footer-meta">
          {task.due_at && (
            <span className="due-date">
              <Calendar size={12} />
              {new Date(task.due_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Droppable Column with proper drop zone
interface DroppableColumnProps {
  column: Column;
  tasks: Task[];
  onDelete: (id: number) => void;
  onViewDetails: (task: Task) => void;
  isOver?: boolean;
}

function DroppableColumn({ column, tasks, onDelete, onViewDetails }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      className={`kanban-column ${isOver ? 'drop-target' : ''}`}
      style={{ '--column-color': column.color, '--column-bg': column.bgColor } as React.CSSProperties}
    >
      <div className="column-header">
        <span className="column-icon">{column.icon}</span>
        <h3>{column.title}</h3>
        <span className="column-count">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`column-content custom-scrollbar scrollbar-auto-hide ${isOver ? 'is-over' : ''}`}
      >
        <SortableContext
          items={tasks.map((t) => t.id.toString())}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onDelete={onDelete}
                onViewDetails={onViewDetails}
              />
            ))}
          </AnimatePresence>
        </SortableContext>
        {tasks.length === 0 && (
          <motion.div
            className="column-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Inbox size={24} strokeWidth={1.5} />
            <p>Drop tasks here</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Main Kanban Board Component
export function KanbanBoard({ refreshTrigger, onTaskDeleted }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Configure sensors for better drag experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduced distance for easier dragging
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Long press to drag on touch
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taskApi.getAll();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshTrigger]);

  const handleDeleteTask = useCallback(async (taskId: number) => {
    if (!confirm('Delete this task? This action cannot be undone.')) return;

    try {
      await taskApi.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      onTaskDeleted?.();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, [onTaskDeleted]);

  const handleViewDetails = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const findColumnByTaskId = (taskId: string): TaskStatus | null => {
    const task = tasks.find((t) => t.id.toString() === taskId);
    return task?.status || null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id.toString() === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Check if dropping over a column
    const isOverColumn = columns.some((col) => col.id === overId);

    if (isOverColumn) {
      const newStatus = overId as TaskStatus;
      const currentStatus = findColumnByTaskId(activeId);

      if (currentStatus !== newStatus) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id.toString() === activeId
              ? { ...task, status: newStatus }
              : task
          )
        );
      }
    } else {
      // Dropping over another task
      const overTask = tasks.find((t) => t.id.toString() === overId);
      if (overTask) {
        const activeStatus = findColumnByTaskId(activeId);
        const overStatus = overTask.status;

        if (activeStatus !== overStatus) {
          setTasks((prev) =>
            prev.map((task) =>
              task.id.toString() === activeId
                ? { ...task, status: overStatus }
                : task
            )
          );
        }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id.toString();
    const task = tasks.find((t) => t.id.toString() === activeId);

    if (!task) return;

    // Determine the new status
    let newStatus: TaskStatus = task.status;

    const isOverColumn = columns.some((col) => col.id === over.id);
    if (isOverColumn) {
      newStatus = over.id as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id.toString() === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    // Update local state
    setTasks((prev) =>
      prev.map((t) =>
        t.id.toString() === activeId ? { ...t, status: newStatus } : t
      )
    );

    // Persist to backend
    try {
      await taskApi.updateStatus(task.id, newStatus);
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Revert on error
      fetchTasks();
    }
  };

  if (loading) {
    return (
      <motion.div
        className="kanban-loading"
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
        <p>Loading your tasks...</p>
      </motion.div>
    );
  }

  if (tasks.length === 0) {
    return (
      <motion.div
        className="kanban-empty"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Inbox size={48} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', marginBottom: '1rem' }} />
        <p className="empty-title">No tasks yet</p>
        <span className="subtitle">Add tasks to start organizing your workflow</span>
      </motion.div>
    );
  }

  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status);

  return (
    <>
      <motion.div
        className="kanban-board"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="kanban-columns">
            {columns.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                tasks={getTasksByStatus(column.id)}
                onDelete={handleDeleteTask}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </motion.div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onDelete={handleDeleteTask}
          />
        )}
      </AnimatePresence>
    </>
  );
}
