
import { Branch } from './types';

export const MOCK_BRANCHES: Branch[] = [
  { id: 'b_north', name: 'North Campus Library', location: 'Sector 12, North City', email: 'reception@north.example', password: 'RecepNorth123' },
  { id: 'b_south', name: 'South City Reading Room', location: 'Green Park, South City', email: 'reception@south.example', password: 'RecepSouth123' },
  { id: 'b_east', name: 'Eastside Book Haven', location: 'Tech Park, East City', email: 'reception@east.example', password: 'RecepEast123' },
];

export const SNACK_ITEMS = [
  { id: 's_chips', name: 'Potato Chips', price: 20 },
  { id: 's_biscuit', name: 'Biscuits', price: 10 },
  { id: 's_coffee', name: 'Coffee', price: 30 },
  { id: 's_tea', name: 'Tea', price: 15 },
];

export const SUBSCRIPTION_PRICES: Record<string, number> = {
  '1 Month': 1200,
  '3 Months': 3200,
  '6 Months': 6000,
  'Custom': 0 // Admin enters manually
};
