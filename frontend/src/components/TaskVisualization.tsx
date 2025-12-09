import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Loader2,
  Inbox,
  GitBranch,
  Network,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  Rocket,
  ClipboardList,
  Bell,
  Mail,
  MoreHorizontal,
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from 'lucide-react';
import { taskApi } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import type { Task, TaskCategory, TaskPriority } from '../types';

interface TaskVisualizationProps {
  refreshTrigger: number;
  onTaskDeleted?: () => void;
}

type VisualizationType = 'flowchart' | 'tree';

// Category configuration
const categoryConfig: Record<TaskCategory, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  message: { icon: <MessageCircle size={14} />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: 'Message' },
  email: { icon: <Mail size={14} />, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', label: 'Email' },
  deploy: { icon: <Rocket size={14} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', label: 'Deploy' },
  reminder: { icon: <Bell size={14} />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', label: 'Reminder' },
  jira_update: { icon: <ClipboardList size={14} />, color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', label: 'Jira' },
  other: { icon: <MoreHorizontal size={14} />, color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)', label: 'Other' },
};

// Priority configuration
const priorityConfig: Record<TaskPriority, { icon: React.ReactNode; color: string }> = {
  high: { icon: <ArrowUp size={12} />, color: '#ef4444' },
  medium: { icon: <ArrowRight size={12} />, color: '#f59e0b' },
  low: { icon: <ArrowDown size={12} />, color: '#22c55e' },
};

// Flowchart Node Component
interface FlowchartNodeData {
  label: string;
  category: TaskCategory;
  priority: TaskPriority;
  isDark?: boolean;
}

function FlowchartNode({ data }: { data: FlowchartNodeData }) {
  const category = categoryConfig[data.category] || categoryConfig.other;
  const priority = priorityConfig[data.priority || 'medium'];

  return (
    <div
      className="flowchart-node"
      style={{
        background: data.isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: category.color,
        boxShadow: `0 4px 20px ${category.bg}`,
      }}
    >
      <Handle type="target" position={Position.Top} className="flowchart-handle" />
      <div className="flowchart-node-header">
        <span className="flowchart-category" style={{ color: category.color, background: category.bg }}>
          {category.icon}
          {category.label}
        </span>
        <span className="flowchart-priority" style={{ color: priority.color }}>
          {priority.icon}
        </span>
      </div>
      <p className="flowchart-node-text">{data.label}</p>
      <Handle type="source" position={Position.Bottom} className="flowchart-handle" />
    </div>
  );
}

// Tree Item Component
interface TreeItemProps {
  task: Task;
  childTasks: Task[];
  allTasks: Task[];
  level: number;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
}

function TreeItem({ task, childTasks, allTasks, level, expandedIds, onToggle }: TreeItemProps) {
  const category = categoryConfig[task.category] || categoryConfig.other;
  const priority = priorityConfig[task.priority || 'medium'];
  const hasChildren = childTasks.length > 0;
  const isExpanded = expandedIds.has(task.id);

  return (
    <div className="tree-item" style={{ marginLeft: `${level * 24}px` }}>
      <motion.div
        className="tree-item-content"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: level * 0.05 }}
      >
        <button
          className={`tree-expand-btn ${hasChildren ? '' : 'hidden'}`}
          onClick={() => hasChildren && onToggle(task.id)}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="tree-node">
          <div className="tree-node-header">
            <span className="tree-category" style={{ color: category.color, background: category.bg }}>
              {category.icon}
              {category.label}
            </span>
            <span className="tree-priority" style={{ color: priority.color }}>
              {priority.icon}
            </span>
          </div>
          <p className="tree-node-text">{task.clean_text}</p>
          {task.assigned_to && (
            <span className="tree-assignee">@{task.assigned_to}</span>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            className="tree-children"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {childTasks.map((child) => {
              const grandChildren = allTasks.filter((t) => t.depends_on?.includes(child.id));
              return (
                <TreeItem
                  key={child.id}
                  task={child}
                  childTasks={grandChildren}
                  allTasks={allTasks}
                  level={level + 1}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const nodeTypes = { flowchartNode: FlowchartNode };

export function TaskVisualization({ refreshTrigger, onTaskDeleted }: TaskVisualizationProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [vizType, setVizType] = useState<VisualizationType>('flowchart');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const { isDark } = useTheme();

  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taskApi.getAll();
      // Filter out Done tasks from visualization
      const filteredTasks = data.filter((task) => task.status !== 'Done');
      setTasks(filteredTasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshTrigger]);

  // Generate flowchart nodes and edges
  const { flowchartNodes, flowchartEdges } = useMemo(() => {
    if (tasks.length === 0) return { flowchartNodes: [], flowchartEdges: [] };

    // Find root tasks (tasks with no dependencies or with dependencies that don't exist)
    const taskIds = new Set(tasks.map((t) => t.id));
    const rootTasks = tasks.filter(
      (t) => !t.depends_on || t.depends_on.length === 0 || !t.depends_on.some((id) => taskIds.has(id))
    );

    // Calculate levels for each task using BFS
    const levels: Map<number, number> = new Map();
    const queue: number[] = rootTasks.map((t) => t.id);
    rootTasks.forEach((t) => levels.set(t.id, 0));

    while (queue.length > 0) {
      const taskId = queue.shift()!;
      const currentLevel = levels.get(taskId) || 0;

      // Find children (tasks that depend on this one)
      const children = tasks.filter((t) => t.depends_on?.includes(taskId));
      children.forEach((child) => {
        const existingLevel = levels.get(child.id);
        if (existingLevel === undefined || existingLevel < currentLevel + 1) {
          levels.set(child.id, currentLevel + 1);
          queue.push(child.id);
        }
      });
    }

    // Group tasks by level
    const tasksByLevel: Map<number, Task[]> = new Map();
    tasks.forEach((task) => {
      const level = levels.get(task.id) ?? 0;
      if (!tasksByLevel.has(level)) {
        tasksByLevel.set(level, []);
      }
      tasksByLevel.get(level)!.push(task);
    });

    // Create nodes with positions
    const nodeWidth = 280;
    const nodeHeight = 100;
    const horizontalGap = 60;
    const verticalGap = 120;

    const newNodes: Node[] = [];
    const maxLevel = Math.max(...Array.from(levels.values()), 0);

    for (let level = 0; level <= maxLevel; level++) {
      const levelTasks = tasksByLevel.get(level) || [];
      const levelWidth = levelTasks.length * (nodeWidth + horizontalGap) - horizontalGap;
      const startX = -levelWidth / 2 + nodeWidth / 2;

      levelTasks.forEach((task, index) => {
        newNodes.push({
          id: task.id.toString(),
          type: 'flowchartNode',
          position: {
            x: startX + index * (nodeWidth + horizontalGap),
            y: level * (nodeHeight + verticalGap),
          },
          data: {
            label: task.clean_text,
            category: task.category,
            priority: task.priority || 'medium',
            isDark,
          },
        });
      });
    }

    // Create edges
    const newEdges: Edge[] = [];
    tasks.forEach((task) => {
      if (task.depends_on && task.depends_on.length > 0) {
        task.depends_on.forEach((depId) => {
          if (taskIds.has(depId)) {
            const category = categoryConfig[task.category] || categoryConfig.other;
            newEdges.push({
              id: `e${depId}-${task.id}`,
              source: depId.toString(),
              target: task.id.toString(),
              type: 'smoothstep',
              animated: true,
              style: { stroke: category.color, strokeWidth: 2 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: category.color,
                width: 20,
                height: 20,
              },
            });
          }
        });
      }
    });

    return { flowchartNodes: newNodes, flowchartEdges: newEdges };
  }, [tasks, isDark]);

  useEffect(() => {
    if (vizType === 'flowchart') {
      setNodes(flowchartNodes);
      setEdges(flowchartEdges);
    }
  }, [flowchartNodes, flowchartEdges, vizType, setNodes, setEdges]);

  // Tree view data
  const rootTasks = useMemo(() => {
    const taskIds = new Set(tasks.map((t) => t.id));
    return tasks.filter(
      (t) => !t.depends_on || t.depends_on.length === 0 || !t.depends_on.some((id) => taskIds.has(id))
    );
  }, [tasks]);

  const handleToggle = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Expand all by default
  useEffect(() => {
    setExpandedIds(new Set(tasks.map((t) => t.id)));
  }, [tasks]);

  if (loading) {
    return (
      <div className="visualization-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={32} strokeWidth={2} style={{ color: 'var(--primary-500)' }} />
        </motion.div>
        <p>Loading visualization...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="visualization-empty">
        <Inbox size={48} strokeWidth={1.5} />
        <p>No tasks to visualize</p>
        <span>Add some tasks to see them as a flowchart or tree</span>
      </div>
    );
  }

  return (
    <div className="task-visualization">
      <div className="visualization-header">
        <div className="viz-toggle">
          <button
            className={vizType === 'flowchart' ? 'active' : ''}
            onClick={() => setVizType('flowchart')}
          >
            <GitBranch size={16} />
            <span>Flowchart</span>
          </button>
          <button
            className={vizType === 'tree' ? 'active' : ''}
            onClick={() => setVizType('tree')}
          >
            <Network size={16} />
            <span>Tree View</span>
          </button>
        </div>
        <div className="viz-stats">
          <span>{tasks.length} tasks</span>
          <span>{tasks.filter((t) => t.depends_on && t.depends_on.length > 0).length} with dependencies</span>
        </div>
      </div>

      <div className="visualization-content">
        <AnimatePresence mode="wait">
          {vizType === 'flowchart' ? (
            <motion.div
              key="flowchart"
              className="flowchart-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                connectionLineType={ConnectionLineType.SmoothStep}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.3}
                maxZoom={1.5}
                className={isDark ? 'dark-flow' : ''}
              >
                <Background
                  color={isDark ? '#333' : '#ddd'}
                  gap={20}
                  size={1}
                />
                <Controls />
                <MiniMap
                  nodeColor={(node) => {
                    const cat = (node.data as FlowchartNodeData).category;
                    return categoryConfig[cat]?.color || '#64748b';
                  }}
                  maskColor={isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}
                />
              </ReactFlow>
            </motion.div>
          ) : (
            <motion.div
              key="tree"
              className="tree-container custom-scrollbar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {rootTasks.map((task) => {
                const childTasks = tasks.filter((t) => t.depends_on?.includes(task.id));
                return (
                  <TreeItem
                    key={task.id}
                    task={task}
                    childTasks={childTasks}
                    allTasks={tasks}
                    level={0}
                    expandedIds={expandedIds}
                    onToggle={handleToggle}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
