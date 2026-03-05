
import React from 'react';
import { PlusIcon } from './Icons';
import { LOGISTICS_TYPES } from '../constants';
import { LogisticsType } from '../types';

interface SidebarProps {
  isOpen: boolean;
  activeFilters: LogisticsType[];
  onFilterToggle: (type: LogisticsType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeFilters, onFilterToggle }) => {
  if (!isOpen) return null;

  return (
    <aside className="w-64 border-r border-slate-200 bg-white h-full flex flex-col p-4 space-y-8 overflow-y-auto custom-scrollbar">
      {/* Mini Calendar Placeholder */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <span className="font-semibold text-sm text-slate-700">February 2025</span>
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
            <button key={day} className={`p-1.5 rounded-full hover:bg-blue-50 transition-colors ${day === 15 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-600'}`}>
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Logistics Assets</h3>
        <div className="space-y-1">
          {LOGISTICS_TYPES.map(type => (
            <label key={type.value} className="flex items-center space-x-3 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer group">
              <input 
                type="checkbox" 
                checked={activeFilters.includes(type.value as LogisticsType)}
                onChange={() => onFilterToggle(type.value as LogisticsType)}
                className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer`}
              />
              <span className="text-sm text-slate-600 group-hover:text-slate-900">{type.label}</span>
              <div className={`w-2 h-2 rounded-full ml-auto ${type.color}`} />
            </label>
          ))}
        </div>
      </div>

      {/* Region Status */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Key European Corridors</h3>
        <div className="space-y-2 px-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Rotterdam - Ruhr</span>
            <span className="text-emerald-500 font-medium">Fluid</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Brenner Pass</span>
            <span className="text-amber-500 font-medium">Moderate</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">English Channel</span>
            <span className="text-rose-500 font-medium">Congested</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
