
export type LogisticsType = 'Maritime' | 'Road' | 'Rail' | 'Air' | 'Holiday' | 'Risk';

export interface LogisticsEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: LogisticsType;
  location: string;
  description?: string;
  status: 'on-time' | 'delayed' | 'planned';
  origin?: string;
  destination?: string;
}

export type CalendarViewMode = 'Day' | 'Week' | 'Month' | 'Year' | 'Schedule';

export interface CalendarState {
  currentDate: Date;
  viewMode: CalendarViewMode;
  selectedEvent: LogisticsEvent | null;
  isSidebarOpen: boolean;
  filters: LogisticsType[];
}
