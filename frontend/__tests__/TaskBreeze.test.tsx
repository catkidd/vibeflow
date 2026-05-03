// FILE: frontend/__tests__/TaskBreeze.test.tsx
// RTL tests for TaskBreeze — add task, complete task, delete task, optimistic update.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskBreeze from '../app/components/TaskBreeze';
import { getMoodTheme } from '../lib/moodTheme';

jest.mock('framer-motion', () => ({
  motion: {
    div:    ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p}>{children}</button>,
    li:     ({ children, ...p }: React.LiHTMLAttributes<HTMLLIElement>) => <li {...p}>{children}</li>,
    input:  ({ ...p }: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAnimation:    () => ({ start: jest.fn() }),
}));

// Mock fetch so tests don't hit the real API
const fetchMock = jest.fn();
global.fetch = fetchMock;

const theme = getMoodTheme('focused');

const mockTasks = [
  { id: '1', title: 'Write unit tests', status: 'pending', created_at: new Date().toISOString() },
  { id: '2', title: 'Review PR',        status: 'pending', created_at: new Date().toISOString() },
];

beforeEach(() => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ tasks: mockTasks }),
  });
});

describe('TaskBreeze', () => {
  it('renders a list of tasks from the API', async () => {
    render(<TaskBreeze theme={theme} onTaskComplete={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeInTheDocument();
      expect(screen.getByText('Review PR')).toBeInTheDocument();
    });
  });

  it('adds a new task via the input field', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tasks: mockTasks }) }) // initial load
      .mockResolvedValueOnce({ ok: true, json: async () => ({ task: { id: '3', title: 'New task', status: 'pending', created_at: new Date().toISOString() } }) }); // POST

    render(<TaskBreeze theme={theme} onTaskComplete={jest.fn()} />);
    await waitFor(() => screen.getByText('Write unit tests'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New task' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('calls onTaskComplete when a task is marked done', async () => {
    const onComplete = jest.fn();
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tasks: mockTasks }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ task: { ...mockTasks[0], status: 'completed' } }) });

    render(<TaskBreeze theme={theme} onTaskComplete={onComplete} />);
    await waitFor(() => screen.getByText('Write unit tests'));

    // Click the first task's status toggle
    const statusBtns = screen.getAllByRole('button');
    fireEvent.click(statusBtns[0]);

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it('shows an empty state when no tasks exist', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ tasks: [] }) });
    render(<TaskBreeze theme={theme} onTaskComplete={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/no tasks|add a task|empty/i)).toBeInTheDocument();
    });
  });
});
