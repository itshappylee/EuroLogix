
import React from 'react';
import { EUROPEAN_COUNTRIES } from '../constants';

interface SidebarProps {
  isOpen: boolean;
  activeCountries: string[];
  onCountryToggle: (code: string) => void;
  portCongestion: Record<string, string>;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeCountries, onCountryToggle, portCongestion }) => {
  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Congested': return 'text-rose-500';
      case 'Moderate': return 'text-amber-500';
      case 'Fluid': return 'text-emerald-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <aside className="w-64 border-r border-slate-200 bg-white h-full flex flex-col p-4 space-y-8 overflow-y-auto custom-scrollbar">
      {/* Mini Calendar Placeholder */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <span className="font-semibold text-sm text-slate-700">March 2026</span>
          <div className="flex space-x-2">
            <button className="p-1 hover:bg-slate-100 rounded text-slate-500">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button className="p-1 hover:bg-slate-100 rounded text-slate-500">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-bold text-slate-400">
          {['S','M','T','W','T','F','S'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-center">
          {Array.from({length: 31}, (_, i) => i + 1).map(day => (
            <button key={day} className={`p-1.5 rounded-full hover:bg-blue-50 transition-colors ${day === 5 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-600'}`}>
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Country Filters */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Country Filter</h3>
        <div className="grid grid-cols-2 gap-2 px-2">
          {EUROPEAN_COUNTRIES.map(country => (
            <button
              key={country.code}
              onClick={() => onCountryToggle(country.code)}
              className={`flex items-center space-x-2 px-2 py-2 rounded-lg border transition-all text-left ${
                activeCountries.includes(country.code)
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-lg leading-none">{country.flag}</span>
              <span className="text-xs font-medium truncate">{country.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Region Status */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Port Congestion</h3>
        <div className="space-y-2 px-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Port of Koper (SI)</span>
            <span className={`font-medium ${getStatusColor(portCongestion.Koper)}`}>{portCongestion.Koper}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Port of Rijeka (HR)</span>
            <span className={`font-medium ${getStatusColor(portCongestion.Rijeka)}`}>{portCongestion.Rijeka}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
