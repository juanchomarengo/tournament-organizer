# Sirius Padel Tournament — Decisiones de proyecto

Documento vivo de las decisiones tomadas para la web del torneo. Sirve como spec/contexto y se actualiza si algo cambia.

---

## 1. Contexto del evento

- **Nombre:** Sirius Padel Tournament 2026
- **Fecha:** Miércoles 6 de mayo de 2026, 18:30 hs
- **Lugar:** Pilar Padel Center
- **Premio:** Merch oficial 2026 World Cup para la pareja ganadora
- **Duración total prevista:** 1:30 hs
- **Canchas disponibles:** 4 en simultáneo
- **Naturaleza de la web:** temporal, uso interno en una sola noche, se descarta después del evento.

## 2. Stack técnico

- **Framework:** Next.js 15 + TypeScript (App Router)
- **Estilos:** Tailwind CSS
- **Animaciones:** Framer Motion
- **Persistencia:** Vercel KV (Upstash Redis, free tier) — un único objeto JSON con todo el estado del torneo
- **Deploy:** Vercel
- **Export Excel:** SheetJS (`xlsx`)
- **Auth admin:** password hardcodeado (web temporal, no amerita auth real)

### Por qué KV y no Postgres
Un solo admin cargando datos durante una noche, sin schemas relacionales complejos. Postgres era overkill. KV resuelve multi-device, sobrevive a redeploys y free tier sobra (~30k requests/día vs los ~200 que usaremos).

## 3. Identidad visual

Extraída directamente de [sirius.com.ar](https://sirius.com.ar/) (assets oficiales):

- **Paleta oficial:**
  - Background gradient: `linear-gradient(#081924, #0E2839)` (navy-900 → navy-800)
  - Acento primario cyan: `#00DEDA` (cyan-bright oficial)
  - Gradient brand: `#00DEDA → #96ECAB → #FCF0AD` (cyan → mint → cream)
  - Acentos del logo: `#F6DE5C` (yellow), `#F05E3E` (orange), `#AF1915` (red), `#15847F` (teal)
  - Texto: blanco / opacidad baja para secundarios
- **Estilo:** minimalista, moderno, con glow sutil en acentos
- **Logo Sirius:** poligonal multicolor oficial. Archivos en `/public/brand/`:
  - `sirius-logo.svg` (logo + texto, 237×58)
  - `sirius-icon.svg` (solo polígono, 60×58)
- **Tipografías:**
  - **Display:** Russo One (Google Fonts) — alternativa libre a "Good Times" comercial que usa la web oficial. Letras anchas, geométricas, retro-futurist.
  - **Body:** Montserrat (oficial Sirius)
  - **UI:** Inter (oficial Sirius)
- **Tono:** dinámico, festivo, "show".

## 4. Estructura de páginas

| Ruta | Propósito | Pública |
|------|-----------|---------|
| `/` | Landing: countdown al evento, lista de inscriptos, info del flyer | sí |
| `/sorteo` | Pantalla "show" del sorteo de parejas — proyectable | sí |
| `/bracket` | Bracket en vivo (final four + copa consuelo), se actualiza solo | sí |
| `/cronograma` | Qué pareja juega en qué cancha y horario | sí |
| `/admin` | Backoffice: gestión completa | password |

## 5. Modelo de datos (estado en KV)

Un solo objeto JSON bajo la key `tournament`:

```ts
{
  players: [{ id, name, level: "intermedio" | "principiante" }],
  teams: [{ id, playerIds: [id, id], groupId? }],
  groups: [{ id: "A"|"B"|"C"|"D", teamIds: [...] }],
  matches: [{
    id,
    phase: "groups" | "semis" | "final" | "third" | "consuelo",
    round: 1..6,
    court: 1..4,
    teamA: id, teamB: id,
    score: { setsA, setsB, gamesA, gamesB },
    winner: teamId | null,
    status: "pending" | "in_progress" | "done"
  }],
  state: "setup" | "pairs_drawn" | "bracket_drawn" | "running" | "finished",
  champion: teamId | null
}
```

## 6. Flow del admin

1. **Setup** — Alta/baja/edición de jugadores. Cada uno se marca como **Intermedio** o **Principiante**.
2. **Sorteo de parejas** — Botón "Sortear parejas" → corre la animación en `/sorteo`, queda persistido. **Regla:** cada pareja se forma con 1 jugador Intermedio + 1 Principiante (parejas balanceadas).
3. **Sorteo de grupos y bracket** — Con parejas armadas, otro botón "Sortear cruces" → distribuye las 12 parejas en 4 grupos de 3 y arma el cronograma. También con animación "show".
4. **Run del torneo** — Por cada partido: asignar cancha + horario (auto según cronograma), cargar score (sets/games) y marcar ganador. El admin **cierra el partido cuando quiere**, no hay timer automático.
5. **Export Excel** — Botón siempre disponible. Descarga `.xlsx` con jugadores, parejas, grupos, partidos, ganadores y campeón. Backup por si algo se rompe en vivo.

## 7. Formato del torneo (flexible según parejas)

El bracket se adapta automáticamente a la cantidad de parejas y canchas configuradas.

### Configuración (editable desde `/admin`)

| Campo | Default | Notas |
|-------|---------|-------|
| `courts` | 4 | Canchas en simultáneo. Tope práctico = 4. |
| `durationMode` | `by-time` | `by-time` (cada ronda dura X min, cuenta games) o `by-set` (cada partido se juega hasta cerrar el formato). |
| `totalReservedMinutes` | 90 | Tiempo total reservado para el evento. Drives los cálculos del panel. |
| `matchFormat` | `best-of-3` | Solo aplica si `durationMode === "by-set"`. `single-set` (~25 min) o `best-of-3` (~60 min). |
| `preferredGroupCount` | `auto` | Override de la heurística: `"auto"`, `1`, `2`, `4` grupos. Si el override no respeta el mínimo de 2 parejas/grupo, se cae a auto. |
| `eventStart` | 2026-05-06 18:30 | ISO con timezone. Drives countdown y horarios del cronograma. |
| `eventLocation` | Pilar Padel Center | |
| `prizeText` | 2026 World Cup merch | |

**El panel calcula y avisa:**
- En `by-time`: dado el tiempo reservado, parejas y canchas, sugiere cuántos minutos por partido (con warning si caen abajo de 8 min).
- En `by-set`: estima la duración total con `estimateMatchMinutes(format)` y avisa si excede el tiempo reservado.

### Estructura por cantidad de parejas

| Parejas | Grupos | Fase 2 |
|---------|--------|--------|
| 4–5 | 1 grupo (round-robin) | Final directa entre 1° y 2° |
| 6–10 | 2 grupos | Semis cruzadas (1°A vs 2°B / 1°B vs 2°A) + Final + 3° puesto |
| 11+ | 4 grupos | Semis (1°A vs 1°D / 1°B vs 1°C) + Final + 3° puesto |

### Fase 1 — Grupos

- Round-robin completo dentro de cada grupo.
- Schedule **greedy**: cada partido se asigna al primer slot (round, cancha) libre donde la cancha esté disponible y ninguna pareja del partido ya esté jugando en ese round.
- Limitado a las canchas configuradas: si `courts=2`, el schedule serializa más rondas.

### Fase 2 — Playoffs

- Las semis (o la final si hay 1 solo grupo) se llenan automáticamente cuando se cierran todos los partidos de grupos.
- Final + 3° puesto se llenan cuando se cierran las semis.

### Tiebreakers en grupos

1. Partidos ganados
2. Diferencia de games (gamesFor − gamesAgainst)
3. Games a favor

## 8. Score y cierre de partidos

- Se carga **resultado completo**: sets y games (ej: 6-4 / 7-5).
- El admin cierra el partido manualmente (no hay timer). Al cerrar, se elige ganador y se guarda el score.
- El bracket público se actualiza al cerrar.

## 9. Sorteo de parejas

- **Regla (best effort):** se emparejan 1 Intermedio + 1 Principiante mientras alcance. Cuando se agota un nivel, los sobrantes del nivel mayoritario se emparejan entre sí.
- **Requisitos mínimos:** total par y mínimo 4 jugadores. No se exige balance perfecto entre niveles.
- El admin ve un preview antes de sortear: "X parejas mixtas + Y mismo nivel".
- **Animación show:** doble reveal — primero "tu compañero es X", después "tu rival en grupo es Y".

## 10. Funcionalidades descartadas o pospuestas

- **Predicción de campeón:** descartada.
- **Galería en vivo (QR):** descartada por ahora, podría sumarse si sobra tiempo.
- **Tracking detallado de posiciones 5° al 12°:** descartado, diluye el foco en el campeón.
- **Copa Consuelo (8 parejas perdedoras durante Fase 2):** **pospuesta**. Se prioriza el camino del campeón. Una vez que el flujo principal esté funcionando, se decide qué hacer con esas 8 parejas y las canchas 3 y 4 (opciones en discusión: bracket de 8, mini liguilla rotativa, partidos abiertos, o nada).

## 11. Lista de jugadores actual (21)

Carola, Juancho, Nesti, Santi Grimoldi, Chulo, Maxi Geist, Fede Bustos, Sofi Tartara, Emi López, Nacho, Agus Vilchez, Agustín, Lucas Barbeito, Santino Montevidoni, Clari, Marcos Lund, Santi Aguilar, Martín Barreiro, Don Pablo, Santi Pérez, Gonza Oxoby.

> El admin sumará/sacará jugadores hasta llegar a 24 (12 parejas) antes del sorteo.

## 12. Pendientes a definir más adelante

- Password exacto del admin (definir cuando se vaya a deployar).
- Calibración exacta de colores hex contra el flyer original.
- ¿Querer SSE o se queda con polling cada 3s para refresco de pantalla pública? (decisión técnica, no afecta UX).
