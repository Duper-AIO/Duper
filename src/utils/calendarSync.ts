import * as Calendar from 'expo-calendar';

export interface CalendarTask {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}

const getEventDates = (task: CalendarTask) => {
  const [year, month, day] = task.date.split('-').map(Number);
  const startDate = task.startTime
    ? new Date(year, month - 1, day, ...task.startTime.split(':').map(Number), 0)
    : new Date(year, month - 1, day);

  if (!task.startTime) {
    return { startDate, endDate: new Date(year, month - 1, day + 1), allDay: true };
  }

  let endDate: Date;
  if (task.endTime) {
    const [endHour, endMinute] = task.endTime.split(':').map(Number);
    endDate = new Date(year, month - 1, day, endHour, endMinute);
    if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);
  } else {
    endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
  }
  return { startDate, endDate, allDay: false };
};

const getWritableCalendarId = async (): Promise<string> => {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writableCalendars = calendars.filter(calendar => calendar.allowsModifications);
  const preferredCalendar = writableCalendars.find(calendar => calendar.isPrimary) ?? writableCalendars[0];
  if (!preferredCalendar) throw new Error('No writable calendar is available on this device.');
  return preferredCalendar.id;
};

export async function saveTaskToCalendar(task: CalendarTask, existingEventId?: string | null): Promise<string> {
  if (!(await Calendar.isAvailableAsync())) throw new Error('Calendar is unavailable on this device.');

  let permission = await Calendar.getCalendarPermissionsAsync();
  if (!permission.granted) permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) throw new Error('Calendar permission was not granted.');

  const { startDate, endDate, allDay } = getEventDates(task);
  const recurrenceFrequency = task.repeat === 'none' ? null : {
    daily: Calendar.Frequency.DAILY,
    weekly: Calendar.Frequency.WEEKLY,
    monthly: Calendar.Frequency.MONTHLY,
    yearly: Calendar.Frequency.YEARLY,
  }[task.repeat];
  const eventDetails: Partial<Calendar.Event> = {
    title: task.title,
    notes: task.notes ?? '',
    startDate,
    endDate,
    allDay,
    recurrenceRule: recurrenceFrequency ? { frequency: recurrenceFrequency } : null,
    alarms: [],
  };

  if (existingEventId) {
    try {
      await Calendar.updateEventAsync(existingEventId, eventDetails);
      return existingEventId;
    } catch {
    }
  }

  const calendarId = await getWritableCalendarId();
  const eventId = await Calendar.createEventAsync(calendarId, eventDetails);
  if (existingEventId) {
    try {
      await Calendar.deleteEventAsync(existingEventId);
    } catch {
    }
  }
  return eventId;
}

export async function deleteTaskCalendarEvent(eventId: string): Promise<void> {
  const permission = await Calendar.getCalendarPermissionsAsync();
  if (!permission.granted) throw new Error('Calendar permission is needed to remove this event.');
  await Calendar.deleteEventAsync(eventId);
}