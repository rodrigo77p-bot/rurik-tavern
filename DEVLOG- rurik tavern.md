# Rurik Tavern — Devlog

App web D&D con IA como Maestro de Mazmorras. Vanilla HTML/CSS/JS, desplegada en [aventurasdyd.vercel.app](https://aventurasdyd.vercel.app) via GitHub (`rodrigo77p-bot/rurik-tavern`). Todo el código vive en `script.js` y `style.css`.

---

## Stack

- **Frontend:** HTML + CSS + JS vanilla (sin frameworks)
- **IA:** Groq API — modelo `llama-3.3-70b-versatile`
- **Sync:** Firebase Firestore + Auth (email/password y Google)
- **Retratos:** Pollinations.ai (gratis, sin API key)
- **Deploy:** Vercel (auto-deploy desde GitHub)

---

## Lo que se ha construido

### 1. Base del juego
- Pantalla de creación de personaje (nombre, raza, clase, stats, trasfondo, motivación)
- Selección de aventura con 6 escenarios predefinidos + modo libre
- Chat con el DM en segunda persona, prosa cinematográfica
- Barra de estado: HP, ubicación, hora, inventario
- Chips de acción sugeridos tras cada respuesta del DM
- Inventario gestionable (añadir/quitar objetos)
- Menú lateral con acceso a todo

### 2. Sistema de sincronización Firebase
Firebase cargado dinámicamente en `script.js` (el `index.html` es write-protected).

Estructura Firestore:
```
users/{uid}/data/main          → personajes + worldState
users/{uid}/gameStates/{charId}  → estado de juego por personaje
users/{uid}/chatHistory/{charId} → historial de chat
users/{uid}/adventures/{charId}  → aventura activa
```

La sync fusiona datos locales + Firestore al iniciar. Si Firestore está vacío, sube los datos locales automáticamente.

### 3. Sistema de dados AI-driven
El DM decide cuándo pedir una tirada incluyendo `[ROLL: {...}]` en su respuesta. El jugador ve un widget de dado y lo lanza. El resultado se envía automáticamente al DM como contexto para continuar la narración.

```
[ROLL: {"skill":"Persuasión","stat":"CAR","dc":12,"reason":"convencer al guardia"}]
```

DC orientativos: trivial=6, fácil=8, normal=10, difícil=15, legendario=20.

Casi toda acción tiene tirada: hablar con intención → CAR, atacar → FUE, sigilo → DES, magia → INT, percibir → SAB, resistir → CON.

### 4. Retratos de personaje
Generados con Pollinations.ai usando descriptores por raza (`RACE_VISUALS`). Estilo: *semi-realistic digital painting, D&D character art, artstation quality*.

### 5. Fixes móvil
- Panel de party oculto en móvil, accesible desde el menú
- iOS zoom fix: `font-size: 16px` en inputs + viewport `maximum-scale=1`
- Botón enviar: evento `touchend` + flag `touchFired` para evitar doble disparo
- Fix pendingRoll atascado: se limpia automáticamente al enviar

### 6. Legado del Mundo
Eventos épicos (muertes, hazañas, maldiciones) quedan grabados permanentemente en el mundo y aparecen cuando otros personajes visitan la misma zona.

### 7. Sistema de PNJs conocidos (`npcs[]` en gameState)

El DM registra automáticamente PNJs significativos mediante bloques `[NPC: {...}]` en sus respuestas. Visible en menú → **🎭 Personajes Conocidos**.

**Ficha por PNJ:**
- Retrato generado con Pollinations.ai
- Raza, rol, personalidad
- Badge de relación con color (9 niveles)
- Indicador de techo de relación (en naranja si hay límite)
- Sesgos visibles (ej. "odia a los elfos", "leal a la Corona")
- Secciones acordeón: *Lo que sabes*, *Buenos recuerdos*, *Conflictos*
- Campo de notas libres (solo visible para el jugador)

**Escala de relación:**
| Valor | Label | Color |
|-------|-------|-------|
| -3 | Enemigo Jurado | rojo oscuro |
| -2 | Enemigo | rojo |
| -1 | Rival | naranja |
| 0 | Neutro | gris |
| 1 | Conocido | azul |
| 2 | Amigo | verde |
| 3 | Aliado | verde claro |
| 4 | Interés Romántico | rosa |
| 5 | Amor | rojo pasión |

**Sistema de techo y sesgos:**
Cada PNJ tiene un `maxRelationship` permanente fijado al crearlo. Un guardia racista contra tu raza nunca puede pasar de "Conocido" aunque seas el personaje más carismático. Los sesgos y la personalidad se inyectan en cada prompt para que el DM los respete.

La relación **solo cambia por acciones concretas**, nunca por amabilidad pasiva.

El roster completo de PNJs se inyecta en cada prompt del DM para que no pierda el hilo de las relaciones aunque el contexto de la aventura se comprima.

---

## Bloques de comunicación DM → App

El DM devuelve bloques estructurados al final de cada respuesta:

```
[ACTIONS: ["acción 1", "acción 2", "acción 3"]]
[STATE: {"hp":N,"location":"X","timeOfDay":"X","inventory":[],...}]
[ROLL: {"skill":"X","stat":"CAR","dc":12,"reason":"..."}]   ← opcional
[NPC: {"name":"X","race":"X","role":"X","personality":"...","biases":["..."],"maxRelationship":3,"relationship":1,...}]  ← opcional
[LEGACY: {"location":"X","event":"...","type":"heroic"}]   ← opcional
```

---

## Archivos principales

| Archivo | Descripción |
|---------|-------------|
| `script.js` | Todo el JS (~93KB) |
| `style.css` | Estilos (~26KB) |
| `index.html` | Shell mínimo (write-protected) |
