import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  type Node,
  type Edge,
  Handle,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, MessageCircle, Rocket, ClipboardList, Bell, X, GripVertical,
  Sparkles, FileText, MoreHorizontal, AlertTriangle, Pin, Mail
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { TaskGraphData, TaskPriority } from '../types';

// Storage key for positions
const POSITIONS_STORAGE_KEY = 'taskmap-node-positions';

// Category colors with better contrast - now includes 'other' and 'priority'
const CATEGORY_COLORS = {
  priority: { bg: '#dc2626', text: '#ffffff', glow: 'rgba(220, 38, 38, 0.4)' },
  message: { bg: '#22c55e', text: '#ffffff', glow: 'rgba(34, 197, 94, 0.3)' },
  jira_update: { bg: '#f97316', text: '#ffffff', glow: 'rgba(249, 115, 22, 0.3)' },
  deploy: { bg: '#ef4444', text: '#ffffff', glow: 'rgba(239, 68, 68, 0.3)' },
  reminder: { bg: '#8b5cf6', text: '#ffffff', glow: 'rgba(139, 92, 246, 0.3)' },
  other: { bg: '#64748b', text: '#ffffff', glow: 'rgba(100, 116, 139, 0.3)' },
  email: { bg: '#06b6d4', text: '#ffffff', glow: 'rgba(6, 182, 212, 0.3)' },
} as const;

// Category icons
const CATEGORY_ICONS = {
  priority: AlertTriangle,
  message: MessageCircle,
  jira_update: ClipboardList,
  deploy: Rocket,
  reminder: Bell,
  other: MoreHorizontal,
  email: Mail,
} as const;

// Category labels for zone headers
const CATEGORY_LABELS = {
  priority: 'Priority Tasks',
  message: 'Messages',
  jira_update: 'Jira Updates',
  deploy: 'Deployments',
  reminder: 'Reminders',
  other: 'Other Tasks',
  email: 'Emails',
} as const;

// Fixed column layout - each category gets its own vertical lane
const COLUMN_CONFIG = {
  priority: { columnIndex: 0 },
  message: { columnIndex: 1 },
  jira_update: { columnIndex: 2 },
  deploy: { columnIndex: 3 },
  reminder: { columnIndex: 4 },
  other: { columnIndex: 5 },
} as const;

// Layout constants
const LAYOUT = {
  columnWidth: 280,
  columnGap: 40,
  nodeWidth: 240,
  verticalGap: 60,
  headerHeight: 60,
  startY: 80,
  startX: 60,
} as const;

// Custom node component with premium styling and delete button
interface TaskNodeData {
  label: string;
  category: keyof typeof CATEGORY_COLORS;
  time?: string | null;
  isDark?: boolean;
  onDelete?: (id: string) => void;
  onDoubleClick?: (task: TaskGraphData) => void;
  onPinTask?: (id: string) => void;
  nodeId?: string;
  priority?: TaskPriority;
  isPinned?: boolean;
  raw_text?: string;
  original_message?: string | null;
  was_improved?: boolean;
  fullTask?: TaskGraphData;
}

function TaskNode({ data, id }: { data: TaskNodeData; id: string }) {
  const colors = CATEGORY_COLORS[data.category] || CATEGORY_COLORS.other;
  const Icon = CATEGORY_ICONS[data.category] || MoreHorizontal;
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onPinTask) {
      data.onPinTask(id);
    }
  };

  const handleDoubleClick = () => {
    if (data.onDoubleClick && data.fullTask) {
      data.onDoubleClick(data.fullTask);
    }
  };

  // Show priority indicator for high priority tasks
  const isHighPriority = data.priority === 'high' || data.isPinned;

  return (
    <div
      style={{
        background: colors.bg,
        color: colors.text,
        padding: '14px 18px',
        borderRadius: '12px',
        width: `${LAYOUT.nodeWidth}px`,
        boxShadow: isHovered
          ? `0 8px 24px ${colors.glow}, 0 4px 8px rgba(0, 0, 0, 0.15)`
          : `0 4px 12px ${colors.glow}, 0 2px 4px rgba(0, 0, 0, 0.1)`,
        position: 'relative',
        border: isHighPriority
          ? `2px solid #fbbf24`
          : `1px solid rgba(255, 255, 255, 0.2)`,
        backdropFilter: 'blur(8px)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
      title="Double-click to view full details"
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: colors.bg,
          border: '2px solid white',
          width: '10px',
          height: '10px',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: colors.bg,
          border: '2px solid white',
          width: '10px',
          height: '10px',
        }}
      />

      {/* Priority indicator */}
      {isHighPriority && (
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            right: '10px',
            background: '#fbbf24',
            color: '#000',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Priority
        </div>
      )}

      {/* Drag handle indicator */}
      <div
        style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          opacity: isHovered ? 0.6 : 0,
          transition: 'opacity 0.2s ease',
          cursor: 'grab',
        }}
      >
        <GripVertical size={12} />
      </div>

      {/* Action buttons */}
      <div
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          display: 'flex',
          gap: '4px',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        {/* Pin button */}
        <button
          onClick={handlePin}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '6px',
            background: data.isPinned ? '#fbbf24' : 'rgba(0, 0, 0, 0.3)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: data.isPinned ? '#000' : colors.text,
            padding: 0,
          }}
          title={data.isPinned ? 'Unpin from Priority' : 'Pin to Priority'}
        >
          <Pin size={12} />
        </button>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '6px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text,
            padding: 0,
          }}
          title="Delete task"
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingTop: '4px' }}>
        <div
          style={{
            padding: '6px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.4, wordWrap: 'break-word' }}>
            {data.label}
          </div>
        </div>
      </div>

      {data.time && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '10px',
            padding: '6px 10px',
            background: 'rgba(0, 0, 0, 0.15)',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 500,
          }}
        >
          <Clock size={12} />
          <span>{data.time}</span>
        </div>
      )}
    </div>
  );
}

// Zone header component
function ZoneHeader({ data }: { data: { label: string; color: string; count: number; isDark?: boolean; isSpecial?: boolean } }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 16px',
        background: data.isSpecial
          ? `linear-gradient(135deg, ${data.color}, ${data.color}dd)`
          : data.color,
        color: '#ffffff',
        borderRadius: '10px',
        fontWeight: 600,
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        boxShadow: data.isSpecial
          ? `0 4px 16px ${data.color}60`
          : `0 2px 8px ${data.color}40`,
        border: data.isSpecial
          ? '2px solid rgba(255, 255, 255, 0.3)'
          : '1px solid rgba(255, 255, 255, 0.1)',
        width: `${LAYOUT.nodeWidth}px`,
      }}
    >
      <span>{data.label}</span>
      <span
        style={{
          marginLeft: 'auto',
          background: 'rgba(255, 255, 255, 0.2)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
        }}
      >
        {data.count}
      </span>
    </div>
  );
}

const nodeTypes = {
  taskNode: TaskNode,
  zoneHeader: ZoneHeader,
};

// Load saved positions from localStorage
function loadSavedPositions(): Record<string, { x: number; y: number }> {
  try {
    const saved = localStorage.getItem(POSITIONS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// Save positions to localStorage
function savePositions(positions: Record<string, { x: number; y: number }>) {
  try {
    localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
  } catch (e) {
    console.error('Failed to save node positions:', e);
  }
}

// Load pinned tasks from localStorage
function loadPinnedTasks(): string[] {
  try {
    const saved = localStorage.getItem('taskmap-pinned-tasks');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Save pinned tasks to localStorage
function savePinnedTasks(pinnedIds: string[]) {
  try {
    localStorage.setItem('taskmap-pinned-tasks', JSON.stringify(pinnedIds));
  } catch (e) {
    console.error('Failed to save pinned tasks:', e);
  }
}

interface TaskGraphProps {
  tasks: TaskGraphData[];
  onDeleteTask?: (taskId: string) => void;
}

// Task Detail Modal Component
function TaskDetailModal({
  task,
  onClose,
  isDark,
}: {
  task: TaskGraphData;
  onClose: () => void;
  isDark: boolean;
}) {
  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;
  const Icon = CATEGORY_ICONS[task.category] || MoreHorizontal;

  return (
    <motion.div
      className="task-detail-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <motion.div
        className="task-detail-modal custom-scrollbar"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: isDark ? 'var(--bg-primary)' : '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          border: `1px solid ${isDark ? 'var(--border-primary)' : '#e2e8f0'}`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: colors.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.text,
              }}
            >
              <Icon size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Task Details
              </h3>
              <span style={{ fontSize: '12px', color: colors.bg, fontWeight: 500, textTransform: 'uppercase' }}>
                {task.category.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: isDark ? 'var(--bg-tertiary)' : '#f1f5f9',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Priority Badge */}
        {task.priority === 'high' && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: '#fef3c7',
            color: '#92400e',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '16px',
          }}>
            <AlertTriangle size={14} />
            High Priority
          </div>
        )}

        {/* Improved Task */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={14} style={{ color: colors.bg }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {task.was_improved ? 'Improved Task' : 'Task'}
            </span>
          </div>
          <div
            style={{
              padding: '16px',
              background: isDark ? 'var(--bg-secondary)' : '#f8fafc',
              borderRadius: '10px',
              fontSize: '15px',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              borderLeft: `3px solid ${colors.bg}`,
            }}
          >
            {task.text}
          </div>
        </div>

        {/* Original Input */}
        {task.raw_text && task.raw_text !== task.text && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FileText size={14} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Original Input
              </span>
            </div>
            <div
              style={{
                padding: '16px',
                background: isDark ? 'var(--bg-tertiary)' : '#f1f5f9',
                borderRadius: '10px',
                fontSize: '14px',
                lineHeight: 1.5,
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
              }}
            >
              {task.raw_text}
            </div>
          </div>
        )}

        {/* Original Message Context */}
        {task.original_message && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <MessageCircle size={14} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Full Message Context
              </span>
            </div>
            <div
              className="custom-scrollbar"
              style={{
                padding: '16px',
                background: isDark ? 'var(--bg-tertiary)' : '#f1f5f9',
                borderRadius: '10px',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                maxHeight: '200px',
                overflow: 'auto',
              }}
            >
              {task.original_message}
            </div>
          </div>
        )}

        {/* Time indicator */}
        {task.time && (
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={14} style={{ color: colors.bg }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
              {task.time}
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function TaskGraph({ tasks, onDeleteTask }: TaskGraphProps) {
  const { isDark } = useTheme();
  const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }>>(loadSavedPositions);
  const [selectedTask, setSelectedTask] = useState<TaskGraphData | null>(null);
  const [pinnedTasks, setPinnedTasks] = useState<string[]>(loadPinnedTasks);

  // Handle pin/unpin task
  const handlePinTask = useCallback((taskId: string) => {
    setPinnedTasks((prev) => {
      const updated = prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId];
      savePinnedTasks(updated);
      return updated;
    });
  }, []);

  // Calculate default positions using vertical column layout
  const getDefaultPosition = useCallback((
    category: keyof typeof COLUMN_CONFIG,
    indexInCategory: number
  ): { x: number; y: number } => {
    const config = COLUMN_CONFIG[category];
    const x = LAYOUT.startX + (config.columnIndex * (LAYOUT.columnWidth + LAYOUT.columnGap));
    const y = LAYOUT.startY + (indexInCategory * (LAYOUT.verticalGap + 100));
    return { x, y };
  }, []);

  // Group and position tasks by category
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Group tasks by category with priority column
    const tasksByCategory: Record<string, TaskGraphData[]> = {
      priority: [],
      message: [],
      jira_update: [],
      deploy: [],
      reminder: [],
      other: [],
    };

    tasks.forEach((task) => {
      // Check if task is pinned or high priority - add to priority column
      if (pinnedTasks.includes(task.id) || task.priority === 'high') {
        tasksByCategory.priority.push({ ...task, isPinned: pinnedTasks.includes(task.id) });
      } else {
        // Map category, defaulting to 'other' for unknown categories
        const category = task.category as keyof typeof tasksByCategory;
        if (tasksByCategory[category] && category !== 'priority') {
          tasksByCategory[category].push(task);
        } else if (task.category === 'email') {
          // Map email to message
          tasksByCategory.message.push(task);
        } else {
          tasksByCategory.other.push(task);
        }
      }
    });

    // Sort reminders by time (soonest first)
    tasksByCategory.reminder.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });

    // Add zone headers for each category
    Object.entries(COLUMN_CONFIG).forEach(([category, config]) => {
      const categoryKey = category as keyof typeof CATEGORY_COLORS;
      const count = tasksByCategory[category]?.length || 0;

      nodes.push({
        id: `header-${category}`,
        type: 'zoneHeader',
        position: {
          x: LAYOUT.startX + (config.columnIndex * (LAYOUT.columnWidth + LAYOUT.columnGap)),
          y: 10
        },
        data: {
          label: CATEGORY_LABELS[categoryKey],
          color: CATEGORY_COLORS[categoryKey].bg,
          count,
          isDark,
          isSpecial: category === 'priority',
        },
        draggable: false,
        selectable: false,
      });
    });

    // Position tasks in their columns
    Object.entries(tasksByCategory).forEach(([category, categoryTasks]) => {
      const categoryKey = category as keyof typeof COLUMN_CONFIG;

      categoryTasks.forEach((task, index) => {
        // Check for saved position first, otherwise use default
        const savedPos = savedPositions[task.id];
        const defaultPos = getDefaultPosition(categoryKey, index);
        const position = savedPos || defaultPos;

        nodes.push({
          id: task.id,
          type: 'taskNode',
          position,
          data: {
            label: task.text,
            category: category === 'priority' ? task.category : task.category,
            time: task.time,
            isDark,
            onDelete: onDeleteTask,
            onDoubleClick: setSelectedTask,
            onPinTask: handlePinTask,
            nodeId: task.id,
            priority: task.priority,
            isPinned: pinnedTasks.includes(task.id),
            raw_text: task.raw_text,
            original_message: task.original_message,
            was_improved: task.was_improved,
            fullTask: task,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      });
    });

    // Create edges from dependsOn with premium styling
    tasks.forEach((task) => {
      task.dependsOn.forEach((depId) => {
        // Only create edge if both nodes exist
        const sourceExists = tasks.some(t => t.id === depId);
        if (sourceExists) {
          edges.push({
            id: `e-${depId}-${task.id}`,
            source: depId,
            target: task.id,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: isDark ? '#64748b' : '#94a3b8',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isDark ? '#64748b' : '#94a3b8',
              width: 20,
              height: 20,
            },
          });
        }
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [tasks, isDark, savedPositions, getDefaultPosition, onDeleteTask, pinnedTasks, handlePinTask]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when tasks change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle node position changes and save to localStorage
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);

    // Save position when drag ends
    changes.forEach((change) => {
      if (change.type === 'position' && change.dragging === false && change.position) {
        const nodeId = change.id;
        // Don't save header positions
        if (!nodeId.startsWith('header-')) {
          setSavedPositions((prev) => {
            const updated = { ...prev, [nodeId]: change.position! };
            savePositions(updated);
            return updated;
          });
        }
      }
    });
  }, [onNodesChange]);

  // Reset layout to default
  const handleResetLayout = useCallback(() => {
    localStorage.removeItem(POSITIONS_STORAGE_KEY);
    setSavedPositions({});
  }, []);

  if (tasks.length === 0) {
    return (
      <div className="graph-empty">
        <p>No tasks to display in graph view.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', position: 'relative' }}>
      {/* Reset layout button */}
      <button
        onClick={handleResetLayout}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          padding: '8px 14px',
          fontSize: '12px',
          fontWeight: 500,
          background: isDark ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        title="Reset all nodes to default positions"
      >
        Reset layout
      </button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        attributionPosition="bottom-left"
        snapToGrid
        snapGrid={[20, 20]}
        style={{
          background: isDark ? 'var(--bg-secondary)' : 'var(--bg-primary)',
        }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background
          color={isDark ? '#334155' : '#e2e8f0'}
          gap={20}
          size={1}
        />
        <Controls
          style={{
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'zoneHeader') return 'transparent';
            const category = (node.data as TaskNodeData)?.category;
            return category ? CATEGORY_COLORS[category]?.bg || '#94a3b8' : '#94a3b8';
          }}
          maskColor={isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}
          style={{
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
          }}
        />
      </ReactFlow>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Mock data for testing
export const mockTaskData: TaskGraphData[] = [
  {
    id: '1',
    text: 'Deploy API v2.0 to production',
    category: 'deploy',
    time: null,
    dependsOn: [],
    priority: 'high',
  },
  {
    id: '2',
    text: 'Update JIRA ticket status to Done',
    category: 'jira_update',
    time: null,
    dependsOn: ['1'],
  },
  {
    id: '3',
    text: 'Message team about deployment success',
    category: 'message',
    time: null,
    dependsOn: ['2'],
  },
  {
    id: '4',
    text: 'Remind to check monitoring dashboard',
    category: 'reminder',
    time: '2:00 PM',
    dependsOn: ['1'],
  },
  {
    id: '5',
    text: 'Deploy frontend changes',
    category: 'deploy',
    time: null,
    dependsOn: [],
  },
  {
    id: '6',
    text: 'Create JIRA ticket for bug fix',
    category: 'jira_update',
    time: null,
    dependsOn: [],
  },
  {
    id: '7',
    text: 'Ping design team for review',
    category: 'message',
    time: null,
    dependsOn: ['6'],
  },
  {
    id: '8',
    text: 'Team standup meeting',
    category: 'reminder',
    time: '10:00 AM',
    dependsOn: [],
  },
  {
    id: '9',
    text: 'Code review reminder',
    category: 'reminder',
    time: '4:00 PM',
    dependsOn: ['5'],
  },
  {
    id: '10',
    text: 'Review documentation updates',
    category: 'other',
    time: null,
    dependsOn: [],
  },
];
