
import React from 'react';
import { LogisticsEvent, LogisticsType } from '../types';
import { LOGISTICS_TYPES } from '../constants';

interface MonthViewProps {
  currentDate: Date;
  events: LogisticsEvent[];
  activeCountries: string[];
  onEventClick: (event: LogisticsEvent) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ currentDate, events, activeCountries, onEventClick }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = [];
  // Previous month padding
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getDayEvents = (day: number) => {
    return events.filter(e => {
      const eDate = new Date(e.start);
      return eDate.getDate() === day && 
             eDate.getMonth() === month && 
             eDate.getFullYear() === year && 
             activeCountries.includes(e.countryCode);
    });
  };

  const getEventColor = (event: LogisticsEvent) => {
    switch (event.category) {
      case 'Traffic Ban': return 'bg-blue-500';
      case 'Holiday': return 'bg-rose-500';
      case 'Strike': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="grid grid-cols-7 border-b border-slate-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-100 last:border-0">
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto custom-scrollbar">
        {days.map((day, idx) => (
          <div key={idx} className={`min-h-[120px] border-r border-b border-slate-100 p-1 group hover:bg-slate-50 transition-colors ${day === null ? 'bg-slate-50/50' : ''}`}>
            {day && (
              <>
                <div className="flex flex-col items-center mb-1">
                  <span className={`text-xs font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors
                    ${day === new Date().getDate() && month === new Date().getMonth() ? 'bg-blue-600 text-white' : 'text-slate-700 group-hover:bg-slate-200'}
                  `}>
                    {day}
                  </span>
                </div>
                <div className="space-y-1">
                  {getDayEvents(day).map(event => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={`w-full text-left px-2 py-0.5 text-[10px] leading-tight text-white rounded truncate transition-all hover:brightness-110 active:scale-95 ${getEventColor(event)}`}
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthView;
