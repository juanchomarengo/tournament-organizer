import type { Player, Level } from "./types";

const SEED_NAMES: Array<{ name: string; level: Level }> = [
  { name: "Juancho", level: "intermedio" },
  { name: "Gonza Oxoby", level: "intermedio" },
  { name: "Lucas Lovaglio", level: "intermedio" },
  { name: "Santi Grimoldi", level: "intermedio" },
  { name: "Santino Montevidoni", level: "intermedio" },
  { name: "Martín Barreiro", level: "intermedio" },
  { name: "Don Pablo", level: "intermedio" },
  { name: "Santi Pérez", level: "intermedio" },
  { name: "Nacho", level: "intermedio" },
  { name: "Clari", level: "intermedio" },
  { name: "Santi Aguilar", level: "intermedio" },
  { name: "Marcos Lund", level: "intermedio" },
  { name: "Nesti", level: "intermedio" },
  { name: "Chulo", level: "intermedio" },
  { name: "Maxi Geist", level: "intermedio" },
  { name: "Carola", level: "principiante" },
  { name: "Fede Bustos", level: "principiante" },
  { name: "Agus Vilchez", level: "principiante" },
  { name: "Liz Lubelczyk", level: "principiante" },
  { name: "Agustina Alma", level: "principiante" },
  { name: "Ignacio Narbais", level: "principiante" },
  { name: "Cami Contestabile", level: "principiante" },
  { name: "Sofi Tartara", level: "principiante" },
  { name: "Emi López", level: "principiante" },
  { name: "Agustín", level: "principiante" },
  { name: "Lucas Barbeito", level: "principiante" },
];

export function seedPlayers(): Player[] {
  return SEED_NAMES.map((p, idx) => ({
    id: `p${idx + 1}`,
    name: p.name,
    level: p.level,
  }));
}
