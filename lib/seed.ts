import type { Player, Level } from './types';

const SEED_NAMES: Array<{ name: string; level: Level }> = [
  { name: 'Gonza Oxoby', level: 'intermedio' },
  { name: 'Lucas Lovaglio', level: 'intermedio' },
  { name: 'Santi Grimoldi', level: 'intermedio' },
  { name: 'Fede Bustos', level: 'principiante' },
  { name: 'Carola', level: 'principiante' },
  { name: 'Agus Vilchez', level: 'principiante' },
  { name: 'Martín Barreiro', level: 'intermedio' },
  { name: 'Agustina Alma', level: 'principiante' },
  { name: 'Santino Montevidoni', level: 'intermedio' },
  { name: 'Ignacio Narbais', level: 'principiante' },
  { name: 'Santi Péres', level: 'intermedio' },
  { name: 'Don Pablo', level: 'intermedio' },
  { name: 'Cami Contestabile', level: 'principiante' },
  { name: 'Nacho Núñez', level: 'intermedio' },
  { name: 'Emi López', level: 'principiante' },
  { name: 'Marcos Lund', level: 'intermedio' },
  { name: 'Nesti', level: 'principiante' },
  { name: 'Clari', level: 'intermedio' },
  { name: 'Sofi Tartara', level: 'principiante' },
  { name: 'Lucas Barbeito', level: 'principiante' },
  { name: 'Santi Aguilar', level: 'intermedio' },
  { name: 'Fausto', level: 'principiante' },
  { name: 'Chulo', level: 'intermedio' },
  { name: 'Maxi Geist', level: 'intermedio' },
];

export function seedPlayers(): Player[] {
  return SEED_NAMES.map((p, idx) => ({
    id: `p${idx + 1}`,
    name: p.name,
    level: p.level,
  }));
}
