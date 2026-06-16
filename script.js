// ===================== STATE =====================
const state = {
    apiKey: null,
    character: null,
    gameState: {
        location: "Taberna de Rurik",
        timeOfDay: "Tarde",
        hp: 0, maxHp: 0,
        inventory: [],
        quest: "Descubrir los secretos de la taberna",
        summary: ""
    },
    chatHistory: [],
    turnCount: 0,
    pendingRoll: null
};

const appDiv = document.getElementById('app');

// ===================== ROLL SYSTEM =====================
const ROLL_TRIGGERS = [
    { keywords: ['persuad','convenc','engañ','negoci','seduc','charm'], skill: 'Persuasión', stat: 'CAR', dc: 12 },
    { keywords: ['busca','observa','invest','inspect','percib','detect','examin','estudia','analiz','registro','registra','mira con atenci'], skill: 'Investigación', stat: 'SAB', dc: 10 },
    { keywords: ['atac','golpe','dispara','lucha','combat','corta','apuñal','hiero','golpeo'], skill: 'Ataque', stat: 'FUE', dc: 12 },
    { keywords: ['escond','sigilo','escapa','huye','trepa','salta','esquiv','infiltr'], skill: 'Sigilo', stat: 'DES', dc: 11 },
    { keywords: ['recuerd','identific','comprend','descifr','sabe sobre','conoce'], skill: 'Conocimiento', stat: 'INT', dc: 11 },
    { keywords: ['intimid','amenaz','asus'], skill: 'Intimidación', stat: 'CAR', dc: 13 },
    { keywords: ['cura','sana','medic'], skill: 'Medicina', stat: 'SAB', dc: 10 },
    { keywords: ['roba','hurta','carterist','desaparec'], skill: 'Hurto', stat: 'DES', dc: 13 },
];

function detectRoll(action) {
    const lower = action.toLowerCase();
    for (const t of ROLL_TRIGGERS) {
        if (t.keywords.some(kw => lower.includes(kw))) return t;
    }
    return null;
}

function rollD20(statValue, dc) {
    const roll = Math.floor(Math.random() * 20) + 1;
    const mod = Math.floor((statValue - 10) / 2);
    const total = roll + mod;
    return { roll, mod, total, dc, success: total >= dc };
}

window.executeRoll = async function(msgIdx) {
    if (!state.pendingRoll) return;
    const { action, trigger } = state.pendingRoll;
    state.pendingRoll = null;

    const statVal = state.character.stats[trigger.stat] || 10;
    const result = { ...rollD20(statVal, trigger.dc), skill: trigger.skill };

    state.chatHistory[msgIdx].roll = result;
    state.chatHistory[msgIdx].rollState = 'done';

    // Re-render that message
    const container = document.getElementById('chatContainer');
    const existing = container.querySelector(`[data-idx="${msgIdx}"]`);
    if (existing) existing.replaceWith(createMessageEl(state.chatHistory[msgIdx], msgIdx));

    await callAndRespond(action, result);
};

window.useAction = function(text) {
    const input = document.getElementById('playerInput');
    const btn = document.getElementById('sendBtn');
    if (input && btn && !state.pendingRoll) {
        input.value = text;
        btn.click();
    }
};

// ===================== INIT =====================
function init() {
    const savedKey = localStorage.getItem('groqApiKey');
    if (savedKey) state.apiKey = savedKey;
    const savedChar = localStorage.getItem('dndCharacter');
    if (savedChar) { try { state.character = JSON.parse(savedChar); } catch(e) {} }
    const savedGame = localStorage.getItem('dndGameState');
    if (savedGame) { try { Object.assign(state.gameState, JSON.parse(savedGame)); } catch(e) {} }
    const savedHistory = localStorage.getItem('dndChatHistory');
    if (savedHistory) { try { state.chatHistory = JSON.parse(savedHistory); } catch(e) {} }

    if (!state.apiKey) showScreen('apiKey');
    else if (!state.character) showScreen('characterCreation');
    else showScreen('chat');
}

function showScreen(name) {
    appDiv.innerHTML = '';
    switch(name) {
        case 'apiKey': appDiv.innerHTML = renderApiKeyScreen(); bindApiKeyScreen(); break;
        case 'characterCreation': appDiv.innerHTML = renderCharacterCreationScreen(); bindCharacterCreation(); break;
        case 'chat': appDiv.innerHTML = renderChatScreen(); bindChat(); break;
    }
}

// ===================== RENDER SCREENS =====================
function renderApiKeyScreen() {
    return `<div class="container">
        <h1>Rurik Tavern</h1>
        <p style="text-align:center;margin-bottom:1.5rem;color:var(--text-muted)">Ingresa tu API key de Groq para comenzar tu aventura.</p>
        <div class="input-group">
            <label for="apiKeyInput">API Key de Groq (gratuita)</label>
            <input type="password" id="apiKeyInput" placeholder="gsk_...">
        </div>
        <button class="btn" id="saveApiKeyBtn">Comenzar</button>
        <p style="text-align:center;font-size:0.8rem;color:var(--text-muted);margin-top:0.75rem">Tu clave se guarda solo en este navegador.</p>
    </div>`;
}

function renderCharacterCreationScreen() {
    return `<div class="container">
        <h1>Crea tu Héroe</h1>
        <p style="text-align:center;margin-bottom:1.5rem;color:var(--text-muted)">No necesitas conocer D&D. Elige lo que te llame la atención.</p>
        <div class="input-group">
            <label for="charName">Nombre del personaje</label>
            <input type="text" id="charName" placeholder="Ej: Rurik, Lyra, Gareth..." required>
        </div>
        <div class="input-group">
            <label for="charRace">Raza</label>
            <select id="charRace" required>
                <option value="">Elige una raza</option>
                <option value="Humano">Humano — Versátil y adaptable</option>
                <option value="Elfo">Elfo — Ágil y perceptivo</option>
                <option value="Enano">Enano — Resistente y tenaz</option>
                <option value="Mediano">Mediano — Pequeño pero afortunado</option>
            </select>
        </div>
        <div class="input-group">
            <label for="charClass">Clase</label>
            <select id="charClass" required>
                <option value="">Elige una clase</option>
                <option value="Guerrero">Guerrero — Maestro del combate</option>
                <option value="Mago">Mago — Hechizos poderosos</option>
                <option value="Pícaro">Pícaro — Sigilo y engaño</option>
                <option value="Clérigo">Clérigo — Sanador divino</option>
            </select>
        </div>
        <div class="input-group">
            <label for="charBackground">Trasfondo</label>
            <select id="charBackground" required>
                <option value="">Elige un trasfondo</option>
                <option value="Soldado">Soldado — Veterano de guerra</option>
                <option value="Criminal">Criminal — Experto en las calles</option>
                <option value="Noble">Noble — Conexiones influyentes</option>
                <option value="Huérfano">Huérfano — Sobreviviente nato</option>
                <option value="Mercader">Mercader — Negociador nato</option>
            </select>
        </div>
        <div class="input-group">
            <label>Estadísticas</label>
            <button class="btn" id="rollStatsBtn" style="margin-top:0.25rem">🎲 Tirar Dados</button>
            <div id="statsDisplay" style="margin-top:0.5rem;font-size:0.82rem;color:var(--text-muted);text-align:center"></div>
        </div>
        <button class="btn" id="createCharBtn" disabled>⚔️ Empezar Aventura</button>
    </div>`;
}

function renderChatScreen() {
    return `<div class="game-wrapper">
        <div class="status-bar">
            <div>❤️ <span id="hpDisplay">${state.gameState.hp}/${state.gameState.maxHp}</span></div>
            <div>📍 <span id="locationDisplay">${state.gameState.location}</span></div>
            <div>🌙 <span id="timeDisplay">${state.gameState.timeOfDay}</span></div>
            <div>🎒 <span id="inventoryDisplay">${state.gameState.inventory.join(', ') || 'Vacío'}</span></div>
        </div>
        <div class="game-layout">
            <div class="chat-area">
                <div class="chat-container" id="chatContainer"></div>
                <div class="input-area">
                    <input type="text" id="playerInput" placeholder="¿Qué haces?" autocomplete="off">
                    <button class="btn" id="sendBtn">Enviar</button>
                </div>
                <p class="footer-note">El contexto se resume automáticamente cada 10 turnos</p>
            </div>
            <aside class="party-panel" id="partyPanel"></aside>
        </div>
    </div>`;
}

// ===================== BINDINGS =====================
function bindApiKeyScreen() {
    document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        if (key) { state.apiKey = key; localStorage.setItem('groqApiKey', key); showScreen('characterCreation'); }
        else alert('Por favor ingresa una API key válida');
    });
}

function bindCharacterCreation() {
    const nameInput = document.getElementById('charName');
    const raceSelect = document.getElementById('charRace');
    const classSelect = document.getElementById('charClass');
    const bgSelect = document.getElementById('charBackground');
    const rollBtn = document.getElementById('rollStatsBtn');
    const statsDisplay = document.getElementById('statsDisplay');
    const createBtn = document.getElementById('createCharBtn');

    function checkValidity() {
        createBtn.disabled = !(nameInput.value.trim() && raceSelect.value && classSelect.value && bgSelect.value && state.tempStats);
    }

    rollBtn.addEventListener('click', () => {
        const stats = {};
        ['FUE','DES','CON','INT','SAB','CAR'].forEach(ab => {
            const rolls = [1,2,3,4].map(() => Math.floor(Math.random()*6)+1).sort((a,b)=>a-b).slice(1);
            stats[ab] = rolls.reduce((a,b)=>a+b,0);
        });
        state.tempStats = stats;
        statsDisplay.textContent = Object.entries(stats).map(([ab,v]) => {
            const m = Math.floor((v-10)/2);
            return `${ab} ${v} (${m>=0?'+':''}${m})`;
        }).join(' · ');
        checkValidity();
    });

    [nameInput, raceSelect, classSelect, bgSelect].forEach(el => el.addEventListener('input', checkValidity));

    createBtn.addEventListener('click', () => {
        state.character = {
            name: nameInput.value.trim(),
            race: raceSelect.value,
            classe: classSelect.value,
            background: bgSelect.value,
            stats: state.tempStats
        };
        const conMod = Math.floor((state.character.stats.CON - 10)/2);
        state.gameState.maxHp = 10 + conMod;
        state.gameState.hp = state.gameState.maxHp;
        state.gameState.location = "Taberna de Rurik";
        state.gameState.timeOfDay = "Tarde";
        state.gameState.inventory = [];
        state.chatHistory = [];
        localStorage.setItem('dndCharacter', JSON.stringify(state.character));
        localStorage.setItem('dndGameState', JSON.stringify(state.gameState));
        showScreen('chat');
        addDMMessage(
            `Tu aventura comienza en la humeante Taberna de Rurik, donde el olor a cerveza y leña se mezcla con el murmullo de conspiraciones. Eres ${state.character.name}, un ${state.character.race} ${state.character.classe} de trasfondo ${state.character.background}.\n\nEl tabernero, un hombre fornido con cicatrices en las manos, te mira de reojo desde detrás de la barra. En una mesa esquinera, un grupo de mercaderes hablan en voz baja sobre un camino peligroso al norte. Cerca de la puerta, una mujer encapuchada observa a todos sin que nadie la note.\n\n¿Qué haces?`,
            ["Hablar con el tabernero", "Acercarse a la mujer encapuchada", "Escuchar la conversación de los mercaderes"]
        );
    });
}

function bindChat() {
    const playerInput = document.getElementById('playerInput');
    const sendBtn = document.getElementById('sendBtn');

    renderChat();
    updatePartyPanel();
    updateStatus();
    playerInput.focus();

    async function sendMessage() {
        const action = playerInput.value.trim();
        if (!action || state.pendingRoll) return;

        playerInput.disabled = true;
        sendBtn.disabled = true;
        sendBtn.textContent = '...';
        playerInput.value = '';

        const rollTrigger = detectRoll(action);
        const msgIdx = state.chatHistory.length;

        if (rollTrigger) {
            addPlayerMessage(action, null, 'pending', msgIdx);
            state.pendingRoll = { action, trigger: rollTrigger, msgIdx };
            playerInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.textContent = 'Enviar';
            playerInput.focus();
        } else {
            addPlayerMessage(action, null, 'done', msgIdx);
            await callAndRespond(action, null);
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    playerInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
}

// ===================== CHAT RENDERING =====================
function renderChat() {
    const container = document.getElementById('chatContainer');
    if (!container) return;
    container.innerHTML = '';
    state.chatHistory.forEach((msg, idx) => container.appendChild(createMessageEl(msg, idx)));
    container.scrollTop = container.scrollHeight;
}

function createMessageEl(msg, idx) {
    const wrap = document.createElement('div');
    wrap.setAttribute('data-idx', idx);

    if (msg.role === 'dm') {
        wrap.className = 'message dm';
        wrap.innerHTML = `
            <div class="dm-header">
                <span class="dm-label">Maestro de Mazmorras</span>
                <span class="dm-location">${msg.location || ''} · ${msg.time || ''}</span>
            </div>
            <div class="dm-content">${msg.content}</div>
            ${msg.actions && msg.actions.length ? `
            <div class="action-chips">
                ${msg.actions.map(a => `<button class="action-chip" onclick="useAction('${a.replace(/'/g,"\\'")}')">↗ ${a}</button>`).join('')}
            </div>` : ''}`;
    } else {
        wrap.className = 'message player';
        let rollHtml = '';
        if (msg.rollState === 'pending' && !msg.roll) {
            const trigger = state.pendingRoll?.trigger;
            if (trigger) {
                const statVal = state.character?.stats[trigger.stat] || 10;
                const mod = Math.floor((statVal - 10) / 2);
                rollHtml = `<div class="roll-pending">
                    <span class="roll-skill">${trigger.skill}</span>
                    <span class="roll-mod">${mod >= 0 ? '+' : ''}${mod}</span>
                    <span class="roll-dc">DC ${trigger.dc}</span>
                    <button class="roll-btn" onclick="executeRoll(${idx})">→ Tirar</button>
                </div>`;
            }
        } else if (msg.roll) {
            rollHtml = `<div class="roll-badge ${msg.roll.success ? 'success' : 'failure'}">
                ${msg.roll.skill} · ${msg.roll.success ? 'Éxito' : 'Fallo'} (${msg.roll.total})
            </div>`;
        }
        wrap.innerHTML = `<div class="player-action">${msg.content}</div>${rollHtml}`;
    }
    return wrap;
}

function addDMMessage(content, actions) {
    const msg = { role: 'dm', content, actions: actions || [], location: state.gameState.location, time: state.gameState.timeOfDay };
    state.chatHistory.push(msg);
    const container = document.getElementById('chatContainer');
    if (container) {
        container.appendChild(createMessageEl(msg, state.chatHistory.length - 1));
        container.scrollTop = container.scrollHeight;
    }
}

function addPlayerMessage(content, roll, rollState, idx) {
    const msg = { role: 'player', content, roll, rollState };
    state.chatHistory.push(msg);
    const container = document.getElementById('chatContainer');
    if (container) {
        container.appendChild(createMessageEl(msg, idx));
        container.scrollTop = container.scrollHeight;
    }
}

function updateStatus() {
    const hp = document.getElementById('hpDisplay');
    const loc = document.getElementById('locationDisplay');
    const time = document.getElementById('timeDisplay');
    const inv = document.getElementById('inventoryDisplay');
    if (hp) hp.textContent = `${state.gameState.hp}/${state.gameState.maxHp}`;
    if (loc) loc.textContent = state.gameState.location;
    if (time) time.textContent = state.gameState.timeOfDay;
    if (inv) inv.textContent = state.gameState.inventory.join(', ') || 'Vacío';
}

function updatePartyPanel() {
    const panel = document.getElementById('partyPanel');
    if (!panel || !state.character) return;
    const char = state.character;
    const stats = char.stats;
    const hpPct = Math.max(0, Math.min(100, (state.gameState.hp / state.gameState.maxHp) * 100));
    const icons = { 'Guerrero': '⚔️', 'Mago': '🔮', 'Pícaro': '🗡️', 'Clérigo': '✦' };
    const hpColor = hpPct > 60 ? '#4a7c59' : hpPct > 30 ? '#8a6a20' : '#7c4a4a';
    panel.innerHTML = `
        <div class="party-card">
            <div class="party-avatar">${icons[char.classe] || '⚔️'}</div>
            <div class="party-name">${char.name}</div>
            <div class="party-class">${char.race} · ${char.classe}</div>
            <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${hpPct}%;background:${hpColor}"></div></div>
            <div class="hp-text">PV ${state.gameState.hp} / ${state.gameState.maxHp}</div>
            <div class="stats-mini">
                ${Object.entries(stats).map(([ab, v]) => {
                    const m = Math.floor((v-10)/2);
                    return `<div class="stat-mini">
                        <span class="stat-label">${ab}</span>
                        <span class="stat-val">${v}</span>
                        <span class="stat-mod">${m>=0?'+':''}${m}</span>
                    </div>`;
                }).join('')}
            </div>
            <div class="party-bg">${char.background}</div>
        </div>`;
}

// ===================== API =====================
async function callAndRespond(action, rollResult) {
    const playerInput = document.getElementById('playerInput');
    const sendBtn = document.getElementById('sendBtn');

    // Typing indicator
    const typingEl = document.createElement('div');
    typingEl.className = 'typing-indicator';
    typingEl.id = 'typingIndicator';
    typingEl.textContent = 'El Maestro de Mazmorras narra...';
    const container = document.getElementById('chatContainer');
    if (container) { container.appendChild(typingEl); container.scrollTop = container.scrollHeight; }

    try {
        const response = await callGroqApi(action, rollResult);
        const { narration, stateUpdates, actions } = parseLlmResponse(response);

        document.getElementById('typingIndicator')?.remove();

        if (stateUpdates) {
            Object.assign(state.gameState, stateUpdates);
            if (state.gameState.hp < 0) state.gameState.hp = 0;
            if (state.gameState.hp > state.gameState.maxHp) state.gameState.hp = state.gameState.maxHp;
        }

        addDMMessage(narration, actions);
        updateStatus();
        updatePartyPanel();
        state.turnCount++;
        if (state.turnCount % 10 === 0) await summarizeContext();
        saveGameState();
    } catch(err) {
        console.error(err);
        document.getElementById('typingIndicator')?.remove();
        addDMMessage("El humo de la taberna nubla la visión. Inténtalo de nuevo.", []);
    } finally {
        if (playerInput) { playerInput.disabled = false; playerInput.focus(); }
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Enviar'; }
    }
}

function buildPrompt(playerAction, rollResult) {
    const char = state.character;
    const stats = char.stats;
    const fmod = (ab) => { const m = Math.floor((stats[ab]-10)/2); return (m>=0?'+':'')+m; };

    let rollSection = '';
    if (rollResult) {
        rollSection = `\nTirada resuelta: ${rollResult.skill} — d20(${rollResult.roll}) ${fmod(
            rollResult.skill === 'Ataque' ? 'FUE' :
            rollResult.skill === 'Persuasión' || rollResult.skill === 'Intimidación' ? 'CAR' :
            rollResult.skill === 'Sigilo' || rollResult.skill === 'Hurto' ? 'DES' :
            rollResult.skill === 'Conocimiento' ? 'INT' : 'SAB'
        )} = ${rollResult.total} vs DC ${rollResult.dc} → ${rollResult.success ? 'ÉXITO' : 'FALLO'}`;
    }

    const system = `Eres el Maestro de Mazmorras de una campaña de D&D en un mundo de fantasía oscura medieval. Narras en segunda persona, con prosa cinematográfica e inmersiva al estilo de una novela de fantasía.

PERSONAJE:
- ${char.name}, ${char.race}, ${char.classe}, trasfondo: ${char.background}
- FUE ${stats.FUE}(${fmod('FUE')}), DES ${stats.DES}(${fmod('DES')}), CON ${stats.CON}(${fmod('CON')}), INT ${stats.INT}(${fmod('INT')}), SAB ${stats.SAB}(${fmod('SAB')}), CAR ${stats.CAR}(${fmod('CAR')})

ESTADO:
- Ubicación: ${state.gameState.location}
- Hora: ${state.gameState.timeOfDay}
- HP: ${state.gameState.hp}/${state.gameState.maxHp}
- Inventario: ${state.gameState.inventory.join(', ') || 'vacío'}
- Misión: ${state.gameState.quest}
- Contexto: ${state.gameState.summary || 'inicio de aventura'}
${rollSection}

INSTRUCCIONES:
- Escribe 150-350 palabras. Prosa rica, cinematográfica, con detalles sensoriales.
- Los NPCs tienen nombres propios y personalidad consistente. Recuérdalos.
- Si hubo tirada: narra las consecuencias del éxito o fallo de forma clara y dramática.
- La hora del día puede avanzar naturalmente.
- Termina en suspense o situación de decisión.
- Al final incluye en orden (sin nada después):
[ACTIONS: ["acción corta 1", "acción corta 2", "acción corta 3"]]
[STATE: {"hp": N, "location": "texto", "timeOfDay": "texto", "inventory": [], "quest": "texto", "summary": "resumen breve"}]`;

    return { system, user: playerAction };
}

async function callGroqApi(playerAction, rollResult) {
    const { system, user } = buildPrompt(playerAction, rollResult);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.apiKey}` },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
            temperature: 0.8,
            max_tokens: 900
        })
    });
    if (!response.ok) { const e = await response.text(); throw new Error(`Groq ${response.status}: ${e}`); }
    const data = await response.json();
    return data.choices[0].message.content;
}

function parseLlmResponse(response) {
    let narration = response;
    let stateUpdates = null;
    let actions = [];

    const actionsMatch = response.match(/\[ACTIONS:\s*(\[[\s\S]*?\])\]/);
    if (actionsMatch) {
        try { actions = JSON.parse(actionsMatch[1]); } catch(e) {}
        narration = narration.replace(actionsMatch[0], '').trim();
    }

    const stateMatch = response.match(/\[STATE:\s*(\{[\s\S]*?\})\]/);
    if (stateMatch) {
        try { stateUpdates = JSON.parse(stateMatch[1]); } catch(e) {}
        narration = narration.replace(stateMatch[0], '').trim();
    }

    return { narration, stateUpdates, actions };
}

async function summarizeContext() {
    const recent = state.chatHistory.slice(-16);
    const text = recent.map(m => `${m.role === 'dm' ? 'DM' : 'Jugador'}: ${m.content}`).join('\n');
    try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.apiKey}` },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: `Resume en 3 frases los eventos clave, NPCs y objetos importantes de esta sesión de D&D:\n\n${text}` }],
                temperature: 0.3, max_tokens: 200
            })
        });
        const d = await r.json();
        state.gameState.summary = d.choices[0].message.content.trim();
        if (state.chatHistory.length > 30) state.chatHistory = state.chatHistory.slice(-20);
        saveGameState();
    } catch(e) { console.warn('Summarize error', e); }
}

function saveGameState() {
    localStorage.setItem('dndGameState', JSON.stringify(state.gameState));
    localStorage.setItem('dndChatHistory', JSON.stringify(state.chatHistory));
}

init();
