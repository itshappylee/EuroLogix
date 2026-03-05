
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MonthView from './components/MonthView';
import AIAssistant from './components/AIAssistant';
import { CalendarViewMode, LogisticsEvent, LogisticsType } from './types';
import { MOCK_EVENTS, LOGISTICS_TYPES } from './constants';

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('Month');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeFilters, setActiveFilters] = useState<LogisticsType[]>(
    LOGISTICS_TYPES.map(t => t.value as LogisticsType)
  );
  const [events, setEvents] = useState<LogisticsEvent[]>(MOCK_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<LogisticsEvent | null>(null);

  const toggleFilter = (type: LogisticsType) => {
    setActiveFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'Month') {
      newDate.setMonth(currentDate.getMonth() + direction);
    } else if (viewMode === 'Week') {
      newDate.setDate(currentDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(currentDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden select-none">
      <Header 
        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
        currentDate={currentDate}
        onPrev={() => navigateDate(-1)}
        onNext={() => navigateDate(1)}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          activeFilters={activeFilters}
          onFilterToggle={toggleFilter}
        />
        
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {viewMode === 'Month' && (
            <MonthView 
              currentDate={currentDate} 
              events={events} 
              activeFilters={activeFilters}
              onEventClick={(e) => setSelectedEvent(e)}
            />
          )}
          {viewMode !== 'Month' && (
            <div className="flex-1 flex flex-center items-center justify-center text-slate-400 bg-slate-50 italic">
              {viewMode} View is under development for this logistics dashboard.
            </div>
          )}

          {/* Event Detail Modal (simplified) */}
          {selectedEvent && (
            <div className="absolute inset-0 z-40 bg-slate-900/10 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className={`h-2 ${LOGISTICS_TYPES.find(t => t.value === selectedEvent.type)?.color}`} />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-slate-800">{selectedEvent.title}</h3>
                    <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center text-slate-600">
                      <span className="w-20 font-semibold uppercase text-[10px] tracking-wider">Time:</span>
                      <span>{selectedEvent.start.toLocaleDateString()} - {selectedEvent.end.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <span className="w-20 font-semibold uppercase text-[10px] tracking-wider">Asset:</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{selectedEvent.type}</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <span className="w-20 font-semibold uppercase text-[10px] tracking-wider">Status:</span>
                      <span className={`px-2 py-0.5 rounded font-bold capitalize ${
                        selectedEvent.status === 'on-time' ? 'text-emerald-600 bg-emerald-50' : 
                        selectedEvent.status === 'delayed' ? 'text-rose-600 bg-rose-50' : 'text-amber-600 bg-amber-50'
                      }`}>
                        {selectedEvent.status}
                      </span>
                    </div>
                    {selectedEvent.origin && (
                      <div className="flex items-center text-slate-600">
                        <span className="w-20 font-semibold uppercase text-[10px] tracking-wider">Route:</span>
                        <span>{selectedEvent.origin} ➔ {selectedEvent.destination}</span>
                      </div>
                    )}
                    {selectedEvent.description && (
                      <div className="pt-4 border-t border-slate-100 text-slate-500 italic">
                        {selectedEvent.description}
                      </div>
                    )}
                  </div>
                  <div className="mt-8 flex space-x-3">
                    <button className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">Track Live</button>
                    <button className="flex-1 border border-slate-200 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-colors text-slate-700">Edit Details</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <AIAssistant events={events} />
    </div>
  );
};

export default App;
