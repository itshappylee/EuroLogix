
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

export const MOCK_EVENTS: LogisticsEvent[] = [
  {
    id: '1',
    title: 'Maersk Eindhoven - Port of Rotterdam',
    start: new Date(year, month, 15, 0),
    end: new Date(year, month, 17, 23),
    type: 'Maritime',
    location: 'Rotterdam, NL',
    status: 'on-time',
    origin: 'Shanghai',
    destination: 'Rotterdam'
  },
  {
    id: '2',
    title: 'Germany Driving Ban (Sunday)',
    start: new Date(year, month, 18, 0),
    end: new Date(year, month, 18, 22),
    type: 'Holiday',
    location: 'Germany',
    status: 'planned',
    description: 'Weekly heavy truck driving ban on federal roads.'
  },
  {
    id: '3',
    title: 'DB Cargo: Hamburg to Munich Express',
    start: new Date(year, month, 16, 14),
    end: new Date(year, month, 16, 22),
    type: 'Rail',
    location: 'Germany',
    status: 'delayed',
    origin: 'Hamburg',
    destination: 'Munich'
  },
  {
    id: '4',
    title: 'Air Freight: AMS - JFK Express',
    start: new Date(year, month, 20, 8),
    end: new Date(year, month, 20, 16),
    type: 'Air',
    location: 'Schiphol, NL',
    status: 'on-time',
  },
  {
    id: '5',
    title: 'Port Strike Warning: Felixstowe',
    start: new Date(year, month, 22, 0),
    end: new Date(year, month, 24, 0),
    type: 'Risk',
    location: 'UK',
    status: 'delayed',
    description: 'Potential disruptions due to local union action.'
  }
];
