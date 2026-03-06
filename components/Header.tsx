
import React from 'react';
import { MenuIcon, ChevronLeft, ChevronRight, SearchIcon } from './Icons';
import { CalendarViewMode } from '../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  activeCategories: string[];
  onCategoryToggle: (category: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, currentDate, onPrev, onNext, activeCategories, onCategoryToggle
}) => {
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const categories = [
    { name: 'Strike', icon: '🚨', color: 'amber' },
    { name: 'Traffic Ban', icon: '⚠️', color: 'blue' },
    { name: 'Holiday', icon: '🏛️', color: 'rose' }
  ];

  return (
    <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 bg-white shrink-0">
      <div className="flex items-center space-x-4">
        <button 
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
        >
          <MenuIcon />
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold italic">E</div>
          <span className="text-xl font-medium text-slate-700 hidden sm:inline-block">EuroLogix</span>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <div className="flex space-x-1">
            <button onClick={onPrev} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
              <ChevronLeft />
            </button>
            <button onClick={onNext} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
              <ChevronRight />
            </button>
          </div>
          <h2 className="text-xl font-medium text-slate-700 ml-2 whitespace-nowrap">{monthName}</h2>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
          {categories.map(cat => {
            const isActive = activeCategories.includes(cat.name);
            return (
              <button
                key={cat.name}
                onClick={() => onCategoryToggle(cat.name)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all
                  ${isActive 
                    ? `bg-white shadow-sm text-slate-800 border border-slate-200` 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-transparent'}
                `}
              >
                <span className={isActive ? '' : 'grayscale opacity-50'}>{cat.icon}</span>
                <span>{cat.name}</span>
                {isActive && (
                  <div className={`w-1.5 h-1.5 rounded-full bg-${cat.color}-500 ml-1`} />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2">
           <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
