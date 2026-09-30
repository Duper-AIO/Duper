import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { MonthWidget, TasksWidget, TodayAndTasksWidget } from './PlannerWidgets';
import { PLANNER_TASKS_STORAGE_KEY, toggleWidgetTask, WidgetTask } from './taskData';

const WIDGET_NAMES = ['PlannerTasks', 'PlannerMonth', 'PlannerToday'] as const;

const readTasks = async (): Promise<WidgetTask[]> => {
  const data = await AsyncStorage.getItem(PLANNER_TASKS_STORAGE_KEY);
  return data ? JSON.parse(data) as WidgetTask[] : [];
};

const renderWidget = (name: string, tasks: WidgetTask[], date: Date): React.JSX.Element => {
  if (name === 'PlannerMonth') return <MonthWidget tasks={tasks} date={date} />;
  if (name === 'PlannerToday') return <TodayAndTasksWidget tasks={tasks} date={date} />;
  return <TasksWidget tasks={tasks} date={date} />;
};

export async function refreshPlannerWidgets(): Promise<void> {
  const tasks = await readTasks();
  const date = new Date();
  await Promise.all(WIDGET_NAMES.map(widgetName => requestWidgetUpdate({
    widgetName,
    renderWidget: () => renderWidget(widgetName, tasks, date),
  })));
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  let tasks = await readTasks();
  const date = new Date();

  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'TOGGLE_TASK') {
    const taskId = String(props.clickActionData?.taskId ?? '');
    const taskDate = String(props.clickActionData?.date ?? '');
    const [year, month, day] = taskDate.split('-').map(Number);
    if (taskId && year && month && day) {
      tasks = toggleWidgetTask(tasks, taskId, new Date(year, month - 1, day));
      await AsyncStorage.setItem(PLANNER_TASKS_STORAGE_KEY, JSON.stringify(tasks));
      await refreshPlannerWidgets();
      return;
    }
  }

  props.renderWidget(renderWidget(props.widgetInfo.widgetName, tasks, date));
}