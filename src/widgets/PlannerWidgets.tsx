import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { getMonthDays, getTasksForDate, toDateKey, WidgetTask } from './taskData';

const colors = {
  background: '#12252A',
  surface: '#1C353B',
  text: '#F3F7F5',
  muted: '#A9B9B5',
  accent: '#78D5B2',
  highlight: '#F0A45D',
} as const;

const widgetSurface = {
  width: 'match_parent' as const,
  height: 'match_parent' as const,
  backgroundColor: colors.background,
  borderRadius: 18,
  padding: 14,
  flexDirection: 'column' as const,
};

const openPlannerUri = (query: string) => `duper://planner?${query}`;

const taskLabel = (task: WidgetTask & { completed: boolean }) =>
  `${task.completed ? 'Done' : task.startTime || 'All day'}  ${task.title}`;

export function TasksWidget({ tasks, date }: { tasks: WidgetTask[]; date: Date }) {
  const todayTasks = getTasksForDate(tasks, date);

  return (
    <FlexWidget style={{ ...widgetSurface, justifyContent: 'space-between' }}>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text="TODAY'S TASKS" style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }} />
        <TextWidget text={`${todayTasks.filter(task => !task.completed).length} LEFT`} style={{ color: colors.accent, fontSize: 10, fontWeight: '700' }} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'column', flex: 1, justifyContent: 'center', marginTop: 7, marginBottom: 7 }}>
        {todayTasks.length === 0 ? (
          <TextWidget text="Nothing planned for today" style={{ color: colors.text, fontSize: 14 }} maxLines={1} />
        ) : todayTasks.slice(0, 3).map(task => (
          <TextWidget
            key={task.id}
            text={taskLabel(task)}
            clickAction="TOGGLE_TASK"
            clickActionData={{ taskId: task.id, date: toDateKey(date) }}
            accessibilityLabel={`${task.completed ? 'Mark incomplete' : 'Complete'} ${task.title}`}
            style={{ color: task.completed ? colors.muted : colors.text, fontSize: 13, marginBottom: 6 }}
            maxLines={1}
            truncate="END"
          />
        ))}
      </FlexWidget>

      <TextWidget
        text="Add task +"
        clickAction="OPEN_URI"
        clickActionData={{ uri: openPlannerUri('addTask=1') }}
        accessibilityLabel="Add a task in Duper"
        style={{ color: colors.background, backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontWeight: '700', textAlign: 'center' }}
      />
    </FlexWidget>
  );
}

export function MonthWidget({ tasks, date }: { tasks: WidgetTask[]; date: Date }) {
  const days = getMonthDays(date);
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = date.getDate();
  const dateKey = toDateKey(date);
  const monthName = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const taskDays = new Set(
    tasks
      .filter(task => !task.isCompleted)
      .filter(task => task.date.slice(0, 7) === dateKey.slice(0, 7))
      .map(task => Number(task.date.slice(8, 10)))
  );

  return (
    <FlexWidget style={widgetSurface}>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <TextWidget text={monthName} style={{ color: colors.text, fontSize: 16, fontWeight: '700' }} />
        <TextWidget text="TODAY" style={{ color: colors.accent, fontSize: 10, fontWeight: '700' }} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        {weekdays.map((weekday, index) => (
          <TextWidget key={`${weekday}-${index}`} text={weekday} style={{ width: 28, color: colors.muted, fontSize: 10, textAlign: 'center' }} />
        ))}
      </FlexWidget>

      {Array.from({ length: 6 }, (_, week) => (
        <FlexWidget key={`week-${week}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          {days.slice(week * 7, week * 7 + 7).map((day, weekdayIndex) => {
            if (day === null) return <TextWidget key={`empty-${weekdayIndex}`} text=" " style={{ width: 28, height: 25 }} />;
            const isToday = day === today;
            return (
              <TextWidget
                key={`day-${day}`}
                text={`${taskDays.has(day) && !isToday ? `${day}·` : day}`}
                clickAction="OPEN_URI"
                clickActionData={{ uri: openPlannerUri(`date=${dateKey.slice(0, 8)}${String(day).padStart(2, '0')}`) }}
                accessibilityLabel={`${monthName} ${day}${isToday ? ', today' : ''}`}
                style={{
                  width: 28,
                  height: 25,
                  borderRadius: 13,
                  backgroundColor: isToday ? colors.highlight : colors.background,
                  color: isToday ? colors.background : colors.text,
                  fontSize: 11,
                  fontWeight: isToday ? '700' : '500',
                  textAlign: 'center',
                }}
              />
            );
          })}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export function TodayAndTasksWidget({ tasks, date }: { tasks: WidgetTask[]; date: Date }) {
  const todayTasks = getTasksForDate(tasks, date).filter(task => !task.completed);
  const dayTitle = date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
  const dayNumber = date.toLocaleDateString(undefined, { day: 'numeric' });
  const monthTitle = date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();

  return (
    <FlexWidget style={{ ...widgetSurface, flexDirection: 'row', alignItems: 'center', padding: 12 }}>
      <FlexWidget
        style={{ width: 76, backgroundColor: colors.surface, borderRadius: 13, alignItems: 'center', justifyContent: 'center', padding: 7 }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: openPlannerUri(`date=${toDateKey(date)}`) }}
        accessibilityLabel="Open today's planner calendar"
      >
        <TextWidget text={dayTitle} style={{ color: colors.accent, fontSize: 10, fontWeight: '700' }} />
        <TextWidget text={dayNumber} style={{ color: colors.text, fontSize: 30, fontWeight: '700' }} />
        <TextWidget text={monthTitle} style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }} />
      </FlexWidget>

      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', marginLeft: 12 }}>
        <TextWidget text="UP NEXT" style={{ color: colors.muted, fontSize: 10, fontWeight: '700', marginBottom: 8 }} />
        {todayTasks.length === 0 ? (
          <TextWidget text="No tasks today" style={{ color: colors.text, fontSize: 13 }} maxLines={2} />
        ) : todayTasks.slice(0, 2).map(task => (
          <TextWidget
            key={task.id}
            text={`${task.startTime ? `${task.startTime} ` : ''}${task.title}`}
            clickAction="TOGGLE_TASK"
            clickActionData={{ taskId: task.id, date: toDateKey(date) }}
            accessibilityLabel={`Complete ${task.title}`}
            style={{ color: colors.text, fontSize: 12, marginBottom: 7 }}
            maxLines={1}
            truncate="END"
          />
        ))}
        <TextWidget
          text="Add task +"
          clickAction="OPEN_URI"
          clickActionData={{ uri: openPlannerUri('addTask=1') }}
          style={{ color: colors.accent, fontSize: 11, fontWeight: '700', marginTop: 3 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}