
import React from 'react';
import { LogisticsEvent } from './types';

export const LOGISTICS_TYPES: { label: string; value: string; color: string }[] = [
  { label: 'Maritime', value: 'Maritime', color: 'bg-blue-500' },
  { label: 'Road Freight', value: 'Road', color: 'bg-emerald-500' },
  { label: 'Rail Transport', value: 'Rail', color: 'bg-amber-500' },
  { label: 'Air Cargo', value: 'Air', color: 'bg-indigo-500' },
  { label: 'Regional Holidays', value: 'Holiday', color: 'bg-purple-500' },
  { label: 'Logistics Risks', value: 'Risk', color: 'bg-rose-500' },
];

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();

export const EUROPEAN_COUNTRIES = [
  { name: 'Slovakia', code: 'SK', flag: '🇸🇰' },
  { name: 'Hungary', code: 'HU', flag: '🇭🇺' },
  { name: 'Poland', code: 'PL', flag: '🇵🇱' },
  { name: 'Czech Republic', code: 'CZ', flag: '🇨🇿' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪' },
  { name: 'Austria', code: 'AT', flag: '🇦🇹' },
  { name: 'Ukraine', code: 'UA', flag: '🇺🇦' },
  { name: 'Romania', code: 'RO', flag: '🇷🇴' },
  { name: 'Slovenia', code: 'SI', flag: '🇸🇮' },
];

export const MOCK_EVENTS: LogisticsEvent[] = [
  {
    id: 'strike-1',
    title: '🚨 DB Cargo Strike Warning',
    start: new Date(2026, 2, 10, 0),
    end: new Date(2026, 2, 12, 23),
    type: 'Risk',
    location: 'Germany',
    countryCode: 'DE',
    status: 'planned',
    category: 'Strike',
    description: 'Potential rail freight disruptions across Germany due to GDL union action.'
  },
  {
    id: 'ban-1',
    title: '⚠️ Sunday Truck Ban',
    start: new Date(2026, 2, 8, 0),
    end: new Date(2026, 2, 8, 22),
    type: 'Holiday',
    location: 'Germany',
    countryCode: 'DE',
    status: 'planned',
    category: 'Traffic Ban',
    description: 'Standard Sunday driving ban for heavy goods vehicles (>7.5t).'
  },
  {
    id: 'ban-sk',
    title: '⚠️ Sunday Truck Ban',
    start: new Date(2026, 2, 8, 0),
    end: new Date(2026, 2, 8, 22),
    type: 'Holiday',
    location: 'Slovakia',
    countryCode: 'SK',
    status: 'planned',
    category: 'Traffic Ban',
  },
  {
    id: 'ban-2',
    title: '⚠️ Sunday Truck Ban',
    start: new Date(2026, 2, 15, 0),
    end: new Date(2026, 2, 15, 22),
    type: 'Holiday',
    location: 'Poland',
    countryCode: 'PL',
    status: 'planned',
    category: 'Traffic Ban',
  },
  {
    id: 'strike-2',
    title: '🚨 Port of Gdynia Operational Delay',
    start: new Date(2026, 2, 18, 6),
    end: new Date(2026, 2, 19, 18),
    type: 'Risk',
    location: 'Poland',
    countryCode: 'PL',
    status: 'delayed',
    category: 'Strike',
    description: 'Local dockworker protest affecting container handling.'
  },
  {
    id: 'holiday-1',
    title: '🏛️ St. Patrick\'s Day',
    start: new Date(2026, 2, 17, 0),
    end: new Date(2026, 2, 17, 23),
    type: 'Holiday',
    location: 'Ireland',
    countryCode: 'IE',
    status: 'planned',
    category: 'Holiday',
  },
  {
    id: 'easter-sk-1',
    title: '🏛️ Good Friday',
    start: new Date(2026, 3, 3, 0),
    end: new Date(2026, 3, 3, 23),
    type: 'Holiday',
    location: 'Slovakia',
    countryCode: 'SK',
    status: 'planned',
    category: 'Holiday',
    sourceUrl: 'https://www.qppstudio.net/public-holidays/eu.htm'
  },
  {
    id: 'easter-sk-2',
    title: '🏛️ Easter Monday',
    start: new Date(2026, 3, 6, 0),
    end: new Date(2026, 3, 6, 23),
    type: 'Holiday',
    location: 'Slovakia',
    countryCode: 'SK',
    status: 'planned',
    category: 'Holiday',
    sourceUrl: 'https://www.qppstudio.net/public-holidays/eu.htm'
  },
  {
    id: 'easter-pl',
    title: '🏛️ Easter Monday',
    start: new Date(2026, 3, 6, 0),
    end: new Date(2026, 3, 6, 23),
    type: 'Holiday',
    location: 'Poland',
    countryCode: 'PL',
    status: 'planned',
    category: 'Holiday',
    sourceUrl: 'https://www.qppstudio.net/public-holidays/eu.htm'
  }
];
