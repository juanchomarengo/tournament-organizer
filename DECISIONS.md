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

## 7. Formato del torneo

12 parejas (24 jugadores). El admin se encarga de tener un número par antes del sorteo.

### Fase 1 — Grupos (45 min, rondas 1–3 de 15')

- 4 grupos de 3 parejas (A, B, C, D), una zona por cancha
- Todos contra todos dentro del grupo: 3 partidos por grupo
- Cada pareja juega **2 partidos**
- Clasifica el 1° de cada grupo a Final Four (criterio: partidos ganados, desempate por games ganados)

### Fase 2 — Final Four (45 min, rondas 4–6 de 15')

**Foco actual: solo el camino del campeón.** Qué hacen las 8 parejas perdedoras durante esta fase queda **TBD** y se decide más adelante (ver sección 10).

| Ronda | Cancha 1 | Cancha 2 | Cancha 3 | Cancha 4 |
|-------|----------|----------|----------|----------|
| 4 | Semi 1 (1°A vs 1°D) | Semi 2 (1°B vs 1°C) | _TBD_ | _TBD_ |
| 5 | **FINAL** | 3er puesto | _TBD_ | _TBD_ |
| 6 | _libre / overtime_ | _libre / overtime_ | _TBD_ | _TBD_ |

- **Cancha 1 y 2:** llave de campeón. Una sola pareja gana el torneo (fiel al flyer).
- **Cancha 3 y 4:** sin uso definido todavía.

### Resultado por pareja (con el alcance actual)

- Ganador de grupo: 2 (grupo) + 2 ó 3 (finales) = **4 partidos**
- No ganador de grupo: 2 (grupo) + 0 = **2 partidos** ← _se resuelve después_

Una sola pareja se corona campeona del Sirius Padel Tournament 2026.

## 8. Score y cierre de partidos

- Se carga **resultado completo**: sets y games (ej: 6-4 / 7-5).
- El admin cierra el partido manualmente (no hay timer). Al cerrar, se elige ganador y se guarda el score.
- El bracket público se actualiza al cerrar.

## 9. Sorteo de parejas

- **Regla:** cada pareja = 1 Intermedio + 1 Principiante.
- Para que funcione, idealmente la lista tiene mismo número de Intermedios y Principiantes.
- Si la distribución no es exacta, el admin lo resuelve antes (cambiando niveles o ajustando lista).
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
