export const PLANNER_TASKS_STORAGE_KEY = 'plannerTasks_v3';

export interface WidgetTask {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  isCompleted: boolean;
  completedExceptions?: string[];
  repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getTasksForDate(tasks: WidgetTask[], date: Date): (WidgetTask & { completed: boolean })[] {
  const dateKey = toDateKey(date);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return tasks
    .filter(task => {
      const [year, month, day] = task.date.split('-').map(Number);
      const base = new Date(year, month - 1, day);
      if (task.repeat === 'none') return base.getTime() === target.getTime();
      if (target < base) return false;
      if (task.repeat === 'daily') return true;
      if (task.repeat === 'weekly') return base.getDay() === target.getDay();
      if (task.repeat === 'monthly') return base.getDate() === target.getDate();
      return base.getDate() === target.getDate() && base.getMonth() === target.getMonth();
    })
    .map(task => ({
      ...task,
      completed: task.repeat === 'none'
        ? task.isCompleted
        : task.completedExceptions?.includes(dateKey) ?? false,
    }))
    .sort((left, right) => (left.startTime || '23:59').localeCompare(right.startTime || '23:59'));
}

export function toggleWidgetTask(tasks: WidgetTask[], taskId: string, date: Date): WidgetTask[] {
  const dateKey = toDateKey(date);
  return tasks.map(task => {
    if (task.id !== taskId) return task;
    if (task.repeat === 'none') return { ...task, isCompleted: !task.isCompleted };

    const exceptions = task.completedExceptions ?? [];
    const isCompleted = exceptions.includes(dateKey);
    return {
      ...task,
      completedExceptions: isCompleted
        ? exceptions.filter(exception => exception !== dateKey)
        : [...exceptions, dateKey],
    };
  });
}

export function getMonthDays(date: Date): (number | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
}