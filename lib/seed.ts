import type { Player, Level } from "./types";

const SEED_NAMES: Array<{ name: string; level: Level }> = [
  { name: "Carola", level: "intermedio" },
  { name: "Juancho", level: "intermedio" },
  { name: "Nesti", level: "intermedio" },
  { name: "Santi Grimoldi", level: "intermedio" },
  { name: "Chulo", level: "intermedio" },
  { name: "Maxi Geist", level: "intermedio" },
  { name: "Fede Bustos", level: "intermedio" },
  { name: "Sofi Tartara", level: "intermedio" },
  { name: "Emi López", level: "intermedio" },
  { name: "Nacho", level: "intermedio" },
  { name: "Agus Vilchez", level: "intermedio" },
  { name: "Agustín", level: "principiante" },
  { name: "Lucas Barbeito", level: "principiante" },
  { name: "Santino Montevidoni", level: "principiante" },
  { name: "Clari", level: "principiante" },
  { name: "Marcos Lund", level: "principiante" },
  { name: "Santi Aguilar", level: "principiante" },
  { name: "Martín Barreiro", level: "principiante" },
  { name: "Don Pablo", level: "principiante" },
  { name: "Santi Pérez", level: "principiante" },
  { name: "Gonza Oxoby", level: "principiante" },
];

export function seedPlayers(): Player[] {
  return SEED_NAMES.map((p, idx) => ({
    id: `p${idx + 1}`,
    name: p.name,
    level: p.level,
  }));
}
