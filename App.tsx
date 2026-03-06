
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MonthView from './components/MonthView';
import AIAssistant from './components/AIAssistant';
import { CalendarViewMode, LogisticsEvent } from './types';
import { MOCK_EVENTS, LOGISTICS_TYPES, EUROPEAN_COUNTRIES } from './constants';
import { getRealTimeLogisticsEvents, getPortCongestion } from './services/geminiService';

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 5));
  const [viewMode, setViewMode] = useState<CalendarViewMode>('Month');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeCountries, setActiveCountries] = useState<string[]>(
    EUROPEAN_COUNTRIES.map(c => c.code)
  );
  const [activeCategories, setActiveCategories] = useState<string[]>(['Strike', 'Traffic Ban', 'Holiday']);
  const [events, setEvents] = useState<LogisticsEvent[]>(MOCK_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<LogisticsEvent | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [tempNote, setTempNote] = useState('');
  const [portCongestion, setPortCongestion] = useState<Record<string, string>>({
    Koper: 'Fluid',
    Rijeka: 'Fluid'
  });

  useEffect(() => {
    const fetchRealTimeData = async () => {
      try {
        const [realTimeEvents, congestionData] = await Promise.all([
          getRealTimeLogisticsEvents(),
          getPortCongestion()
        ]);

        if (realTimeEvents && realTimeEvents.length > 0) {
          const formattedEvents: LogisticsEvent[] = realTimeEvents.map((e: any, index: number) => ({
            ...e,
            id: `realtime-${index}`,
            start: new Date(e.start),
            end: new Date(e.end),
          }));
          setEvents(prev => [...prev, ...formattedEvents]);
        }

        if (congestionData) {
          setPortCongestion(congestionData);
        }
      } catch (error) {
        console.error("Failed to fetch real-time data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchRealTimeData();
  }, []);

  const toggleCountry = (code: string) => {
    setActiveCountries(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleCategory = (category: string) => {
    setActiveCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
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

  const getEventStatus = (event: LogisticsEvent) => {
    const now = new Date();
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    if (now > end) return 'Finished';
    if (now >= start && now <= end) return 'On going';
    return 'Planned';
  };

  const handleSaveNote = () => {
    if (selectedEvent) {
      const updatedEvents = events.map(e => 
        e.id === selectedEvent.id ? { ...e, note: tempNote } : e
      );
      setEvents(updatedEvents);
      setSelectedEvent({ ...selectedEvent, note: tempNote });
      setIsEditingNote(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden select-none">
      <Header 
        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
        currentDate={currentDate}
        onPrev={() => navigateDate(-1)}
        onNext={() => navigateDate(1)}
        activeCategories={activeCategories}
        onCategoryToggle={toggleCategory}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          activeCountries={activeCountries}
          onCountryToggle={toggleCountry}
          portCongestion={portCongestion}
        />
        
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {isInitialLoading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-blue-100 shadow-sm flex items-center space-x-2 animate-pulse">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
              <span className="text-xs font-medium text-slate-600">Fetching real-time European logistics data...</span>
            </div>
          )}
          {viewMode === 'Month' && (
            <MonthView 
              currentDate={currentDate} 
              events={events.filter(e => e.category && activeCategories.includes(e.category))} 
              activeCountries={activeCountries}
              onEventClick={(e) => setSelectedEvent(e)}
            />
          )}
          {viewMode !== 'Month' && (
            <div className="flex-1 flex flex-center items-center justify-center text-slate-400 bg-slate-50 italic">
              {viewMode} View is under development for this logistics dashboard.
            </div>
          )}

          {/* Event Detail Modal */}
          {selectedEvent && (
            <div className="absolute inset-0 z-40 bg-slate-900/10 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className={`h-2 ${
                  selectedEvent.category === 'Traffic Ban' ? 'bg-blue-500' :
                  selectedEvent.category === 'Holiday' ? 'bg-rose-500' :
                  selectedEvent.category === 'Strike' ? 'bg-amber-500' : 'bg-slate-400'
                }`} />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-slate-800">{selectedEvent.title}</h3>
                    </div>
                    <button onClick={() => { setSelectedEvent(null); setIsEditingNote(false); }} className="text-slate-400 hover:text-slate-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4 text-sm mb-8">
                    <div className="flex items-center text-slate-600">
                      <span className="w-20 font-semibold text-slate-400 uppercase text-[10px] tracking-wider">Date:</span>
                      <span className="font-medium">{selectedEvent.start.getFullYear()}. {selectedEvent.start.getMonth() + 1}. {selectedEvent.start.getDate()}</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <span className="w-20 font-semibold text-slate-400 uppercase text-[10px] tracking-wider">Event:</span>
                      <span className="font-medium">{selectedEvent.category}</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <span className="w-20 font-semibold text-slate-400 uppercase text-[10px] tracking-wider">Status:</span>
                      <span className={`font-bold ${
                        getEventStatus(selectedEvent) === 'Finished' ? 'text-slate-400' : 
                        getEventStatus(selectedEvent) === 'On going' ? 'text-emerald-600' : 'text-blue-600'
                      }`}>
                        {getEventStatus(selectedEvent)}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-3 mb-6">
                    <button 
                      onClick={() => {
                        let url = selectedEvent.sourceUrl;
                        if (selectedEvent.category === 'Traffic Ban') url = 'https://trafficban.com/';
                        else if (selectedEvent.category === 'Holiday') url = 'https://www.qppstudio.net/public-holidays/eu.htm';
                        else if (selectedEvent.category === 'Strike') url = 'https://www.euronews.com/tag/strike';
                        
                        if (url) window.open(url, '_blank');
                      }}
                      className="flex-1 bg-slate-800 text-white py-2.5 rounded-lg font-medium hover:bg-slate-900 transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      <span>Check Source</span>
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditingNote(true);
                        setTempNote(selectedEvent.note || '');
                      }}
                      className="flex-1 border border-slate-200 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-colors text-slate-700 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      <span>Edit Details</span>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Note</h4>
                      {isEditingNote && (
                        <button onClick={handleSaveNote} className="text-[10px] font-bold text-blue-600 uppercase hover:text-blue-700">Save</button>
                      )}
                    </div>
                    {isEditingNote ? (
                      <textarea 
                        autoFocus
                        value={tempNote}
                        onChange={(e) => setTempNote(e.target.value)}
                        className="w-full text-xs p-2 border border-blue-100 rounded bg-blue-50/30 focus:outline-none focus:ring-1 focus:ring-blue-400 min-h-[60px]"
                        placeholder="Add your notes here..."
                      />
                    ) : (
                      <div className="text-xs text-slate-600 min-h-[40px] italic">
                        {selectedEvent.note || 'No notes added yet. Click Edit Details to add one.'}
                      </div>
                    )}
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
