// State
const state = {
    apiKey: null,
    character: null,
    gameState: {
        location: "Taberna de Rurik",
        timeOfDay: "Tarde",
        hp: 0,
        maxHp: 0,
        inventory: [],
        quest: "Descubrir los secretos de la taberna",
        summary: ""
    },
    chatHistory: [],
    turnCount: 0
};

const appDiv = document.getElementById('app');

// Roll detection
const ROLL_TRIGGERS = [
    { keywords: ['persuad','convenc','ment','engañ','negoci','charm','seduc'], skill: 'Persuasión', stat: 'CAR' },
    { keywords: ['busca','observa','invest','inspect','percib','detect','examin','estudia','analiz'], skill: 'Investigación', stat: 'SAB' },
    { keywords: ['atac','golpe','dispara','lucha','combat','corta','apuñal','hiero','golpeo'], skill: 'Ataque', stat: 'FUE' },
    { keywords: ['escond','sigilo','escapa','huye','corre','trepa','salta','esquiv'], skill: 'Destreza', stat: 'DES' },
    { keywords: ['recuerd','sabe','conoce','identific','comprend','descifr'], skill: 'Conocimiento', stat: 'INT' },
    { keywords: ['intimid','amenaz','asus'], skill: 'Intimidación', stat: 'CAR' },
    { keywords: ['cura','sana','medic','ayuda'], skill: 'Medicina', stat: 'SAB' },
    { keywords: ['roba','hurta','carterist','desapar'], skill: 'Sigilo', stat: 'DES' },
];

function detectRoll(action) {
    const lower = action.toLowerCase();
    for (const t of ROLL_TRIGGERS) {
        if (t.keywords.some(kw => lower.includes(kw))) return t;
    }
    return null;
}

function rollD20(statValue) {
    const roll = Math.floor(Math.random() * 20) + 1;
    const mod = Math.floor((statValue - 10) / 2);
    const total = roll + mod;
    const success = total >= 12;
    return { roll, mod, total, success };
}

// Initialize
function init() {
    const savedApiKey = localStorage.getItem('groqApiKey');
    if (savedApiKey) state.apiKey = savedApiKey;

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
        case 'apiKey':
            appDiv.innerHTML = renderApiKeyScreen();
            bindApiKeyScreen();
            break;
        case 'characterCreation':
            appDiv.innerHTML = renderCharacterCreationScreen();
            bindCharacterCreation();
            break;
        case 'chat':
            appDiv.innerHTML = renderChatScreen();
            bindChat();
            break;
    }
}

// --- Render screens ---
function renderApiKeyScreen() {
    return `
        <div class="container">
            <h1>Rurik Tavern</h1>
            <p style="text-align:center;margin-bottom:1.5rem;color:var(--text-muted)">Ingresa tu API key de Groq para comenzar tu aventura.</p>
            <div class="input-group">
                <label for="apiKeyInput">API Key de Groq (gratuita)</label>
                <input type="password" id="apiKeyInput" placeholder="gsk_...">
            </div>
            <button class="btn" id="saveApiKeyBtn">Comenzar</button>
            <p style="text-align:center;font-size:0.8rem;color:var(--text-muted);margin-top:0.75rem">
                Tu clave se guarda solo en este navegador. Nunca sale de tu dispositivo.
            </p>
        </div>`;
}

function renderCharacterCreationScreen() {
    return `
        <div class="container">
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
                    <option value="Humano">Humano — Versátil y adaptable, puede hacer de todo</option>
                    <option value="Elfo">Elfo — Ágil y perceptivo, experto en sigilo y magia</option>
                    <option value="Enano">Enano — Resistente y tenaz, excelente en combate cercano</option>
                    <option value="Mediano">Mediano — Pequeño pero afortunado, difícil de detectar</option>
                </select>
            </div>

            <div class="input-group">
                <label for="charClass">Clase</label>
                <select id="charClass" required>
                    <option value="">Elige una clase</option>
                    <option value="Guerrero">Guerrero — Dominas el combate. Más resistente y dañino en batalla</option>
                    <option value="Mago">Mago — Controlas hechizos poderosos. Frágil pero devastador</option>
                    <option value="Pícaro">Pícaro — Sigilo, engaño y ataques precisos. Evitas el combate frontal</option>
                    <option value="Clérigo">Clérigo — Puedes curar y proteger, con algo de combate divino</option>
                </select>
            </div>

            <div class="input-group">
                <label for="charBackground">Trasfondo</label>
                <select id="charBackground" required>
                    <option value="">Elige un trasfondo</option>
                    <option value="Soldado">Soldado — Veterano de guerra, conoces el combate y la disciplina</option>
                    <option value="Criminal">Criminal — Las calles te enseñaron todo. Contactos en el hampa</option>
                    <option value="Noble">Noble — Educación refinada y conexiones en la nobleza</option>
                    <option value="Huérfano">Huérfano — Sobreviviste solo. Ingenioso y desconfiado</option>
                    <option value="Mercader">Mercader — Negociador nato, conoces el valor de todo</option>
                </select>
            </div>

            <div class="input-group">
                <label>Estadísticas (se generan tirando 4 dados)</label>
                <button class="btn" id="rollStatsBtn" style="margin-top:0.25rem">🎲 Tirar Dados</button>
                <div id="statsDisplay" style="margin-top:0.5rem;font-size:0.85rem;color:var(--text-muted);text-align:center"></div>
            </div>

            <button class="btn" id="createCharBtn" disabled>⚔️ Empezar Aventura</button>
        </div>`;
}

function renderChatScreen() {
    return `
        <div class="container">
            <div class="status-bar">
                <div>❤️ <span id="hpDisplay">${state.gameState.hp}/${state.gameState.maxHp}</span></div>
                <div>📍 <span id="locationDisplay">${state.gameState.location}</span></div>
                <div>🌙 <span id="timeDisplay">${state.gameState.timeOfDay}</span></div>
                <div>🎒 <span id="inventoryDisplay">${state.gameState.inventory.join(', ') || 'Vacío'}</span></div>
            </div>
            <div class="chat-container" id="chatContainer"></div>
            <div class="input-area">
                <input type="text" id="playerInput" placeholder="¿Qué haces?" autocomplete="off">
                <button class="btn" id="sendBtn">Enviar</button>
            </div>
            <p class="footer-note">El contexto se resume automáticamente cada 10 turnos</p>
        </div>`;
}

// --- Bindings ---
function bindApiKeyScreen() {
    document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        if (key) {
            state.apiKey = key;
            localStorage.setItem('groqApiKey', key);
            showScreen('characterCreation');
        } else {
            alert('Por favor ingresa una API key válida');
        }
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

    function generateStats() {
        const stats = {};
        ['FUE','DES','CON','INT','SAB','CAR'].forEach(ab => {
            const rolls = [1,2,3,4].map(() => Math.floor(Math.random()*6)+1).sort((a,b)=>a-b).slice(1);
            stats[ab] = rolls.reduce((a,b)=>a+b,0);
        });
        return stats;
    }

    function checkValidity() {
        createBtn.disabled = !(nameInput.value.trim() && raceSelect.value && classSelect.value && bgSelect.value && state.tempStats);
    }

    rollBtn.addEventListener('click', () => {
        state.tempStats = generateStats();
        const entries = Object.entries(state.tempStats).map(([ab,v]) => {
            const mod = Math.floor((v-10)/2);
            return `${ab}: ${v} (${mod>=0?'+':''}${mod})`;
        });
        statsDisplay.textContent = entries.join(' · ');
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
        addDMMessage(`Tu aventura comienza en la humeante Taberna de Rurik, donde el olor a cerveza y leña se mezcla con el murmullo de conspiraciones. Eres ${state.character.name}, un ${state.character.race} ${state.character.classe} de trasfondo ${state.character.background}.\n\nEl tabernero, un hombre fornido con cicatrices en las manos, te mira de reojo desde detrás de la barra. En la esquina, un grupo de viajeros hablan en voz baja. Una mujer encapuchada cerca de la puerta evita tu mirada.\n\n¿Qué haces?`);
    });
}

function bindChat() {
    const playerInput = document.getElementById('playerInput');
    const sendBtn = document.getElementById('sendBtn');

    function updateStatus() {
        document.getElementById('hpDisplay').textContent = `${state.gameState.hp}/${state.gameState.maxHp}`;
        document.getElementById('locationDisplay').textContent = state.gameState.location;
        document.getElementById('timeDisplay').textContent = state.gameState.timeOfDay;
        document.getElementById('inventoryDisplay').textContent = state.gameState.inventory.join(', ') || 'Vacío';
    }

    async function sendMessage() {
        const action = playerInput.value.trim();
        if (!action) return;

        playerInput.disabled = true;
        sendBtn.disabled = true;
        sendBtn.textContent = '...';
        playerInput.value = '';

        // Detect and execute roll
        const rollTrigger = detectRoll(action);
        let rollResult = null;
        if (rollTrigger && state.character) {
            const statVal = state.character.stats[rollTrigger.stat] || 10;
            rollResult = { ...rollD20(statVal), skill: rollTrigger.skill };
        }

        // Add player message with roll badge
        addPlayerMessage(action, rollResult);

        // Show typing indicator
        const typingEl = document.createElement('div');
        typingEl.className = 'typing-indicator';
        typingEl.id = 'typingIndicator';
        typingEl.textContent = 'El Maestro de Mazmorras narra...';
        document.getElementById('chatContainer').appendChild(typingEl);
        document.getElementById('chatContainer').scrollTop = 99999;

        try {
            const response = await callGroqApi(action, rollResult);
            const { narration, stateUpdates } = parseLlmResponse(response);

            // Remove typing indicator
            document.getElementById('typingIndicator')?.remove();

            if (stateUpdates) {
                Object.assign(state.gameState, stateUpdates);
                if (state.gameState.hp < 0) state.gameState.hp = 0;
                if (state.gameState.hp > state.gameState.maxHp) state.gameState.hp = state.gameState.maxHp;
            }
            addDMMessage(narration);
            updateStatus();
            state.turnCount++;
            if (state.turnCount % 10 === 0) await summarizeContext();
            saveGameState();
        } catch (err) {
            console.error(err);
            document.getElementById('typingIndicator')?.remove();
            addDMMessage("El humo de la taberna nubla la visión. Inténtalo de nuevo.");
        } finally {
            playerInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.textContent = 'Enviar';
            playerInput.focus();
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    playerInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

    renderChat();
    updateStatus();
    playerInput.focus();
}

// --- Render helpers ---
function renderChat() {
    const container = document.getElementById('chatContainer');
    if (!container) return;
    container.innerHTML = '';
    state.chatHistory.forEach(msg => {
        const el = createMessageEl(msg);
        container.appendChild(el);
    });
    container.scrollTop = container.scrollHeight;
}

function createMessageEl(msg) {
    const wrapper = document.createElement('div');
    if (msg.role === 'dm') {
        wrapper.className = 'message dm';
        const header = document.createElement('div');
        header.className = 'dm-header';
        header.innerHTML = `<span class="dm-label">Maestro de Mazmorras</span><span class="dm-location">${msg.location || state.gameState.location} · ${msg.time || state.gameState.timeOfDay}</span>`;
        const content = document.createElement('div');
        content.className = 'dm-content';
        content.textContent = msg.content;
        wrapper.appendChild(header);
        wrapper.appendChild(content);
    } else {
        wrapper.className = 'message player';
        const action = document.createElement('div');
        action.className = 'player-action';
        action.textContent = msg.content;
        wrapper.appendChild(action);
        if (msg.roll) {
            const badge = document.createElement('div');
            const success = msg.roll.success;
            badge.className = `roll-badge ${success ? 'success' : 'failure'}`;
            badge.textContent = `${msg.roll.skill} · ${success ? 'Éxito' : 'Fallo'} (${msg.roll.total})`;
            wrapper.appendChild(badge);
        }
    }
    return wrapper;
}

function addDMMessage(content) {
    const msg = {
        role: 'dm',
        content,
        location: state.gameState.location,
        time: state.gameState.timeOfDay
    };
    state.chatHistory.push(msg);
    const container = document.getElementById('chatContainer');
    if (container) {
        container.appendChild(createMessageEl(msg));
        container.scrollTop = container.scrollHeight;
    }
}

function addPlayerMessage(content, roll) {
    const msg = { role: 'player', content, roll };
    state.chatHistory.push(msg);
    const container = document.getElementById('chatContainer');
    if (container) {
        container.appendChild(createMessageEl(msg));
        container.scrollTop = container.scrollHeight;
    }
}

// --- API ---
function buildPrompt(playerAction, rollResult) {
    const char = state.character;
    const stats = char.stats;
    const mod = (ab) => { const m = Math.floor((stats[ab]-10)/2); return (m>=0?'+':'')+m; };

    let rollSection = '';
    if (rollResult) {
        rollSection = `\nResultado de tirada: ${rollResult.skill} — d20(${rollResult.roll}) ${mod(rollResult.skill==='Ataque'?'FUE':rollResult.skill==='Persuasión'||rollResult.skill==='Intimidación'?'CAR':rollResult.skill==='Destreza'||rollResult.skill==='Sigilo'?'DES':rollResult.skill==='Conocimiento'?'INT':'SAB')} = ${rollResult.total} → ${rollResult.success ? 'ÉXITO' : 'FALLO'}`;
    }

    const system = `Eres el Maestro de Mazmorras de una partida de D&D ambientada en un mundo de fantasía oscura medieval. Narras en segunda persona, con prosa cinematográfica e inmersiva.

PERSONAJE DEL JUGADOR:
- Nombre: ${char.name} | Raza: ${char.race} | Clase: ${char.classe} | Trasfondo: ${char.background}
- FUE ${stats.FUE}(${mod('FUE')}), DES ${stats.DES}(${mod('DES')}), CON ${stats.CON}(${mod('CON')}), INT ${stats.INT}(${mod('INT')}), SAB ${stats.SAB}(${mod('SAB')}), CAR ${stats.CAR}(${mod('CAR')})

ESTADO ACTUAL:
- Ubicación: ${state.gameState.location}
- Hora: ${state.gameState.timeOfDay}
- HP: ${state.gameState.hp}/${state.gameState.maxHp}
- Inventario: ${state.gameState.inventory.join(', ') || 'vacío'}
- Misión activa: ${state.gameState.quest}
- Contexto previo: ${state.gameState.summary || 'inicio de la aventura'}
${rollSection}

REGLAS DE NARRACIÓN:
- Escribe entre 150 y 350 palabras por respuesta. Sé descriptivo y cinematográfico.
- Los NPCs tienen nombres propios, personalidad y motivaciones. Recuérdalos entre turnos.
- Si hubo una tirada, narra las consecuencias apropiadas al resultado (éxito parcial en fallos por poco, éxito total en éxitos altos).
- La hora del día puede avanzar según lo que ocurra (Mañana → Mediodía → Tarde → Noche → Mañana).
- Termina siempre con la situación en suspenso o una pregunta implícita.
- Al final incluye exactamente este bloque (sin nada después): [STATE: {"hp": número, "location": "texto", "timeOfDay": "texto", "inventory": ["item1"], "quest": "texto", "summary": "resumen breve de lo ocurrido hasta ahora"}]`;

    return { system, user: playerAction };
}

async function callGroqApi(playerAction, rollResult) {
    const { system, user } = buildPrompt(playerAction, rollResult);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ],
            temperature: 0.8,
            max_tokens: 800
        })
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Error Groq: ${response.status} ${err}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
}

function parseLlmResponse(response) {
    const stateMatch = response.match(/\[STATE:\s*(\{[\s\S]*?\})\]/);
    let stateUpdates = null;
    let narration = response;
    if (stateMatch) {
        try {
            stateUpdates = JSON.parse(stateMatch[1]);
            narration = response.replace(stateMatch[0], '').trim();
        } catch(e) {
            console.warn('STATE parse error', e);
        }
    }
    return { narration, stateUpdates };
}

async function summarizeContext() {
    const recent = state.chatHistory.slice(-16);
    const text = recent.map(m => `${m.role === 'dm' ? 'DM' : 'Jugador'}: ${m.content}`).join('\n');
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.apiKey}` },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: `Resume en 3 frases lo más importante de esta sesión de D&D: ubicación, eventos clave, NPCs conocidos, objetos obtenidos.\n\n${text}` }],
                temperature: 0.3,
                max_tokens: 200
            })
        });
        const data = await response.json();
        state.gameState.summary = data.choices[0].message.content.trim();
        if (state.chatHistory.length > 30) state.chatHistory = state.chatHistory.slice(-20);
        saveGameState();
    } catch(e) { console.warn('Summarize error', e); }
}

function saveGameState() {
    localStorage.setItem('dndGameState', JSON.stringify(state.gameState));
    localStorage.setItem('dndChatHistory', JSON.stringify(state.chatHistory));
}

init();
