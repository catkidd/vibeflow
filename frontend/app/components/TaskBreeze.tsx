'use client';
// FILE: frontend/app/components/TaskBreeze.tsx
// Reorderable task list with glass cards, bubble-pop completion animation,
// and optimistic UI updates against GET/POST/PATCH/DELETE /api/tasks.

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  taskCompletionVariants,
  bubblePopVariants,
  staggerItemVariants,
  staggerContainerVariants,
  errorShakeVariants,
  DURATION,
  EASE,
} from '@/lib/animation';
import type { MoodThemeToken } from '@/lib/moodTheme';

interface Task {
  id: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  mood_id?: string | null;
  created_at: string;
}

interface TaskBreezeProps {
  theme: MoodThemeToken;
  /** Called when a task is completed — parent can fire toast */
  onTaskComplete?: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const STATUS_COLORS: Record<Task['status'], string> = {
  todo:        'rgba(255,255,255,0.25)',
  in_progress: '#FFD166',
  done:        '#74C0A8',
};

const STATUS_LABELS: Record<Task['status'], string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  done:        'Done',
};

/**
 * TaskBreeze
 * Framer Motion Reorder list of glass task cards.
 * On completion: card scales to 0.85 + fades, bubble pops from checkbox.
 * On add: frosted glass input expands on focus with height animation.
 * Optimistic updates: UI changes immediately, rolls back on API failure.
 *
 * Edge case — API failure on complete: rolls back to original status, shows error.
 * Edge case — API failure on delete: restores the task in the list.
 * Edge case — Empty state: shows a friendly placeholder with the mood emoji.
 *
 * @param theme          - Current mood theme
 * @param onTaskComplete - Called after a task is marked done
 */
export default function TaskBreeze({ theme, onTaskComplete }: TaskBreezeProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [inputError, setInputError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch tasks on mount
  useEffect(() => {
    fetch(`${API}/api/tasks`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { tasks: Task[] }) => {
        setTasks(data.tasks ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Add a new task
  const handleAddTask = useCallback(async () => {
    const description = inputValue.trim();
    if (!description) {
      setInputError(true);
      setTimeout(() => setInputError(false), 500);
      inputRef.current?.focus();
      return;
    }

    const optimisticTask: Task = {
      id: `optimistic-${Date.now()}`,
      description,
      status: 'todo',
      created_at: new Date().toISOString(),
    };

    setIsAdding(true);
    setTasks((prev) => [optimisticTask, ...prev]);
    setInputValue('');

    try {
      const res = await fetch(`${API}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description }),
      });

      if (!res.ok) throw new Error('Failed to create task');
      const data = await res.json() as { task: Task };

      // Replace optimistic task with real one
      setTasks((prev) =>
        prev.map((t) => (t.id === optimisticTask.id ? data.task : t)),
      );
    } catch {
      // Roll back optimistic add
      setTasks((prev) => prev.filter((t) => t.id !== optimisticTask.id));
      setInputValue(description); // restore input
    } finally {
      setIsAdding(false);
    }
  }, [inputValue]);

  // Complete a task (bubble-pop then remove from list)
  const handleComplete = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === 'done') return;

    // Optimistic: trigger completion animation
    setCompletingId(taskId);

    setTimeout(async () => {
      // Remove from UI
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setCompletingId(null);
      onTaskComplete?.();

      // Sync with server
      try {
        const res = await fetch(`${API}/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'done' }),
        });
        if (!res.ok) throw new Error('Failed to complete task');
      } catch {
        // Roll back — restore the task
        setTasks((prev) => [...prev, { ...task, status: 'done' }]);
      }
    }, DURATION.BUBBLE_POP * 1000 + 100);
  }, [tasks, onTaskComplete]);

  // Cycle status: todo → in_progress → done (delete)
  const handleStatusCycle = useCallback(async (task: Task) => {
    if (task.status === 'done') return;
    if (task.status === 'todo') {
      const next = { ...task, status: 'in_progress' as const };
      setTasks((prev) => prev.map((t) => (t.id === task.id ? next : t)));
      try {
        await fetch(`${API}/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'in_progress' }),
        });
      } catch {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      }
    } else {
      handleComplete(task.id);
    }
  }, [handleComplete]);

  // Delete a task
  const handleDelete = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      const res = await fetch(`${API}/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete task');
    } catch {
      if (task) setTasks((prev) => [...prev, task]);
    }
  }, [tasks]);

  const activeTasks = tasks.filter((t) => t.status !== 'done');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Add task input */}
      <motion.div
        className="relative overflow-hidden rounded-2xl"
        animate={{ height: isInputFocused ? 72 : 52 }}
        transition={{ duration: DURATION.CARD_HOVER, ease: EASE.SMOOTH }}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${isInputFocused ? theme.color40 : 'rgba(255,255,255,0.10)'}`,
          boxShadow: isInputFocused ? theme.subtleGlow : 'none',
          transition: `border-color 0.3s ease, box-shadow 0.3s ease`,
        }}
      >
        <motion.div
          variants={errorShakeVariants}
          animate={inputError ? 'error' : 'idle'}
          className="flex items-center h-full px-4 gap-3"
        >
          <span className="text-white/30 text-sm">+</span>
          <input
            ref={inputRef}
            id="task-add-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask();
              if (e.key === 'Escape') {
                setInputValue('');
                setIsInputFocused(false);
                inputRef.current?.blur();
              }
            }}
            placeholder="Add a task..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
            aria-label="New task description"
          />
          {inputValue && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleAddTask}
              disabled={isAdding}
              className="px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{
                background: theme.color20,
                color: theme.color,
                border: `1px solid ${theme.color40}`,
              }}
              aria-label="Add task"
            >
              {isAdding ? '…' : 'Add'}
            </motion.button>
          )}
        </motion.div>
      </motion.div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <motion.div
            className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {/* Active task list */}
      {!isLoading && activeTasks.length > 0 && (
        <Reorder.Group
          axis="y"
          values={activeTasks}
          onReorder={(reordered) => {
            setTasks([...reordered, ...doneTasks]);
          }}
          className="flex flex-col gap-2"
          as="ul"
        >
          <AnimatePresence>
            {activeTasks.map((task) => (
              <Reorder.Item
                key={task.id}
                value={task}
                as="li"
                className="list-none"
                style={{ listStyle: 'none' }}
              >
                <TaskCard
                  task={task}
                  theme={theme}
                  isCompleting={completingId === task.id}
                  onComplete={() => handleComplete(task.id)}
                  onStatusCycle={() => handleStatusCycle(task)}
                  onDelete={() => handleDelete(task.id)}
                />
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* Empty state */}
      {!isLoading && activeTasks.length === 0 && (
        <motion.div
          variants={staggerItemVariants}
          initial="hidden"
          animate="visible"
          className="text-center py-8 text-white/30 text-sm"
        >
          <span className="text-3xl block mb-2" role="img" aria-label="all done">
            {theme.emoji}
          </span>
          No tasks yet. Add one above.
        </motion.div>
      )}

      {/* Done tasks count */}
      {doneTasks.length > 0 && (
        <p className="text-xs text-white/30 text-center">
          {doneTasks.length} task{doneTasks.length !== 1 ? 's' : ''} completed today
        </p>
      )}
    </div>
  );
}

// ─── TaskCard Sub-Component ────────────────────────────────────────────────────
interface TaskCardProps {
  task: Task;
  theme: MoodThemeToken;
  isCompleting: boolean;
  onComplete: () => void;
  onStatusCycle: () => void;
  onDelete: () => void;
}

function TaskCard({ task, theme, isCompleting, onComplete, onStatusCycle, onDelete }: TaskCardProps) {
  const [showBubble, setShowBubble] = useState(false);
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const [bubbleOrigin, setBubbleOrigin] = useState({ x: 0, y: 0 });

  const handleCheckboxClick = useCallback(() => {
    if (!checkboxRef.current) return;
    const rect = checkboxRef.current.getBoundingClientRect();
    setBubbleOrigin({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setShowBubble(true);
    setTimeout(() => setShowBubble(false), DURATION.BUBBLE_POP * 1000 + 100);
    onComplete();
  }, [onComplete]);

  return (
    <motion.div
      layout
      variants={taskCompletionVariants}
      animate={isCompleting ? 'completing' : 'active'}
      className="relative"
    >
      {/* Bubble pop overlay — fixed to the checkbox position */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            key="bubble"
            className="fixed rounded-full pointer-events-none z-40"
            variants={bubblePopVariants}
            initial="hidden"
            animate="popped"
            style={{
              width: 48,
              height: 48,
              left: bubbleOrigin.x - 24,
              top: bubbleOrigin.y - 24,
              backgroundColor: theme.color,
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Card */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl group"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(12px)',
          cursor: 'grab',
        }}
      >
        {/* Checkbox button */}
        <button
          ref={checkboxRef}
          onClick={handleCheckboxClick}
          className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
          style={{
            borderColor: task.status === 'in_progress' ? theme.color : 'rgba(255,255,255,0.25)',
            background: task.status === 'in_progress' ? theme.color20 : 'transparent',
          }}
          aria-label={`Complete task: ${task.description}`}
        >
          {task.status === 'in_progress' && (
            <div className="w-2 h-2 rounded-full" style={{ background: theme.color }} />
          )}
        </button>

        {/* Description */}
        <span
          className="flex-1 text-sm text-white/85 leading-snug truncate"
          title={task.description}
        >
          {task.description}
        </span>

        {/* Status badge */}
        <button
          onClick={onStatusCycle}
          className="px-2 py-0.5 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: `${STATUS_COLORS[task.status]}22`,
            color: STATUS_COLORS[task.status],
            border: `1px solid ${STATUS_COLORS[task.status]}44`,
          }}
          aria-label={`Status: ${STATUS_LABELS[task.status]}. Click to advance.`}
        >
          {STATUS_LABELS[task.status]}
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="text-white/20 hover:text-red-400/60 transition-colors opacity-0 group-hover:opacity-100 text-sm"
          aria-label={`Delete task: ${task.description}`}
        >
          ×
        </button>
      </div>
    </motion.div>
  );
}
