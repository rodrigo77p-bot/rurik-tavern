// State
const state = {
    apiKey: null,
    character: null,
    gameState: {
        location: "Taberna de Rurik",
        hp: 0,
        maxHp: 0,
        inventory: [],
        quest: "Descubrir los secretos de la taberna",
        summary: ""
    },
    chatHistory: [],
    turnCount: 0
};

// DOM elements
const appDiv = document.getElementById('app');

// Initialize
function init() {
    const savedApiKey = localStorage.getItem('groqApiKey');
    if (savedApiKey) state.apiKey = savedApiKey;

    const savedChar = localStorage.getItem('dndCharacter');
    if (savedChar) {
        try { state.character = JSON.parse(savedChar); } catch(e) {}
    }
    const savedGame = localStorage.getItem('dndGameState');
    if (savedGame) {
        try { Object.assign(state.gameState, JSON.parse(savedGame)); } catch(e) {}
    }
    const savedHistory = localStorage.getItem('dndChatHistory');
    if (savedHistory) {
        try { state.chatHistory = JSON.parse(savedHistory); } catch(e) {}
    }

    if (!state.apiKey) {
        showScreen('apiKey');
    } else if (!state.character) {
        showScreen('characterCreation');
    } else {
        showScreen('chat');
    }
}

// Screen management
function showScreen(screenName) {
    appDiv.innerHTML = '';
    switch(screenName) {
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

// Screens rendering
function renderApiKeyScreen() {
    return `
        <div class="container">
            <h1>Rurik Tavern</h1>
            <p>Ingresa tu API key de Groq (gratuita) para comenzar.</p>
            <div class="input-group">
                <label for="apiKeyInput">API Key:</label>
                <input type="password" id="apiKeyInput" placeholder="gsk_...">
            </div>
            <button class="btn" id="saveApiKeyBtn">Guardar y Continuar</button>
            <p class="text-muted">Tu clave se guarda solo en tu navegador (localStorage). Nunca se envía a nuestros servidores.</p>
        </div>
    `;
}

function renderCharacterCreationScreen() {
    return `
        <div class="container">
            <h1>Creación de Personaje</h1>
            <p>Responde unas preguntas para crear tu héroe. No necesitas conocimientos previos de D&D.</p>

            <div class="input-group">
                <label for="charName">Nombre del personaje:</label>
                <input type="text" id="charName" placeholder="Ej: Rurik Piedra" required>
            </div>

            <div class="input-group">
                <label for="charRace">Raza:</label>
                <select id="charRace" required>
                    <option value="">Selecciona una raza</option>
                    <option value="Humano">Humano - Versátil y adaptable</option>
                    <option value="Elfo">Elfo - Ágil y perceptivo</option>
                    <option value="Enano">Enano - Resistente y fuerte</option>
                    <option value="Mediano">Mediano (Hobbit) - Afortunado y discreto</option>
                </select>
            </div>

            <div class="input-group">
                <label for="charClass">Clase:</label>
                <select id="charClass" required>
                    <option value="">Selecciona una clase</option>
                    <option value="Guerrero">Guerrero - Maestro del combate</option>
                    <option value="Mago">Mago - Usuario de poderosos hechizos</option>
                    <option value="Pícaro">Pícaro - Experto en sigilo y trampas</option>
                    <option value="Clérigo">Clérigo - Sanador y protegido por lo divino</option>
                </select>
            </div>

            <div class="input-group">
                <label for="charBackground">Trasfondo:</label>
                <select id="charBackground" required>
                    <option value="">Selecciona un trasfondo</option>
                    <option value="Soldado">Soldado - Entrenado en guerra y disciplina</option>
                    <option value="Criminal">Criminal - Experto en lo ilegal y las calles</option>
                    <option value="Noble">Noble - Educado y con conexiones influyentes</option>
                    <option value="Huérfano">Huérfano - Sobreviviente callejero</option>
                    <option value="Mercader">Mercader - Habilidoso en trueque y valoración</option>
                </select>
            </div>

            <div class="input-group">
                <button class="btn" id="rollStatsBtn">Tirar Estadísticas (Aleatorio)</button>
                <div id="statsDisplay" class="text-muted" style="margin-top:0.5rem;"></div>
            </div>

            <button class="btn" id="createCharBtn" disabled>Crear Personaje y Empezar Aventura</button>
        </div>
    `;
}

function renderChatScreen() {
    return `
        <div class="container">
            <div class="status-bar">
                <div>❤️ HP: <span id="hpDisplay">${state.gameState.hp}/${state.gameState.maxHp}</span></div>
                <div>📍 <span id="locationDisplay">${state.gameState.location}</span></div>
                <div>🎒 <span id="inventoryDisplay">${state.gameState.inventory.join(', ') || 'Vacío'}</span></div>
            </div>
            <div class="chat-container" id="chatContainer"></div>
            <div class="input-group">
                <input type="text" id="playerInput" placeholder="¿Qué haces?" autocomplete="off">
                <button class="btn" id="sendBtn">Enviar</button>
            </div>
            <p class="text-muted" style="text-align:center;font-size:0.8rem;">El juego resumirá el contexto automáticamente cada 10 turnos.</p>
        </div>
    `;
}

// Bindings
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
    const backgroundSelect = document.getElementById('charBackground');
    const rollBtn = document.getElementById('rollStatsBtn');
    const statsDisplay = document.getElementById('statsDisplay');
    const createBtn = document.getElementById('createCharBtn');

    function generateStats() {
        const stats = {};
        const abilities = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
        abilities.forEach(ab => {
            // 4d6 drop lowest (standard D&D)
            const rolls = [1,2,3,4].map(() => Math.floor(Math.random()*6)+1).sort((a,b)=>a-b).slice(1);
            stats[ab] = rolls.reduce((a,b)=>a+b,0);
        });
        return stats;
    }

    function updateStatsDisplay(stats) {
        if (!stats) { statsDisplay.textContent = ''; return; }
        const entries = Object.entries(stats).map(([ab,val])=>{
            const mod = Math.floor((val-10)/2);
            return `${ab}: ${val} (${mod>=0?'+':''}${mod})`;
        });
        statsDisplay.textContent = entries.join(' | ');
    }

    function checkFormValidity() {
        const valid = nameInput.value.trim() !== '' &&
                      raceSelect.value !== '' &&
                      classSelect.value !== '' &&
                      backgroundSelect.value !== '' &&
                      state.tempStats !== undefined;
        createBtn.disabled = !valid;
    }

    rollBtn.addEventListener('click', () => {
        state.tempStats = generateStats();
        updateStatsDisplay(state.tempStats);
        checkFormValidity();
    });

    [nameInput, raceSelect, classSelect, backgroundSelect].forEach(el => {
        el.addEventListener('input', checkFormValidity);
    });

    createBtn.addEventListener('click', () => {
        state.character = {
            name: nameInput.value.trim(),
            race: raceSelect.value,
            classe: classSelect.value,
            background: backgroundSelect.value,
            stats: state.tempStats
        };
        const conMod = Math.floor((state.character.stats.CON - 10)/2);
        state.gameState.maxHp = 10 + conMod;
        state.gameState.hp = state.gameState.maxHp;
        state.gameState.location = "Taberna de Rurik";
        state.gameState.inventory = [];
        localStorage.setItem('dndCharacter', JSON.stringify(state.character));
        localStorage.setItem('dndGameState', JSON.stringify(state.gameState));
        state.chatHistory = [];
        showScreen('chat');
        addDMMessage(`¡Bienvenido, ${state.character.name} el ${state.character.race} ${state.character.classe} de trasfondo ${state.character.background}!
Tu aventura comienza en la humeante Taberna de Rurik, donde el olor a cerveza y leña se mezcla con el murmullo de conspiraciones. ¿Qué deseas hacer primero?`);
    });
}

function bindChat() {
    const playerInput = document.getElementById('playerInput');
    const sendBtn = document.getElementById('sendBtn');

    function updateStatus() {
        document.getElementById('hpDisplay').textContent = `${state.gameState.hp}/${state.gameState.maxHp}`;
        document.getElementById('locationDisplay').textContent = state.gameState.location;
        document.getElementById('inventoryDisplay').textContent = state.gameState.inventory.join(', ') || 'Vacío';
    }

    async function sendMessage() {
        const playerAction = playerInput.value.trim();
        if (!playerAction) return;

        playerInput.disabled = true;
        sendBtn.disabled = true;
        sendBtn.textContent = 'Enviando...';

        state.chatHistory.push({role: 'player', content: playerAction});
        renderChat();
        playerInput.value = '';

        try {
            const response = await callGroqApi(playerAction);
            const {narration, stateUpdates} = parseLlmResponse(response);
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
            addDMMessage("El humo de la taberna nubla la visión. Inténtalo de nuevo.");
        } finally {
            playerInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.textContent = 'Enviar';
            playerInput.focus();
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    playerInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });

    renderChat();
    updateStatus();
    playerInput.focus();
}

// Helper functions
function renderChat() {
    const chatContainer = document.getElementById('chatContainer');
    if (!chatContainer) return;
    chatContainer.innerHTML = '';
    state.chatHistory.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message ${msg.role === 'dm' ? 'dm' : 'player'}`;
        div.textContent = msg.content;
        chatContainer.appendChild(div);
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addDMMessage(content) {
    state.chatHistory.push({role: 'dm', content});
    renderChat();
}

function buildPrompt(playerAction) {
    const char = state.character;
    const stats = char.stats;
    const mod = (ab) => Math.floor((stats[ab] - 10)/2);

    const system = `Eres Rurik, un Dungeon Master experimentado narrando una aventura de D&D en segunda persona.
Tono: épico pero accesible, con humor ocasional.
Personaje del jugador: ${char.name}, ${char.race}, ${char.classe}, trasfondo ${char.background}.
Stats: FUE ${stats.FUE} (${mod('FUE')>=0?'+':''}${mod('FUE')}), DES ${stats.DES} (${mod('DES')>=0?'+':''}${mod('DES')}), CON ${stats.CON} (${mod('CON')>=0?'+':''}${mod('CON')}), INT ${stats.INT} (${mod('INT')>=0?'+':''}${mod('INT')}), SAB ${stats.SAB} (${mod('SAB')>=0?'+':''}${mod('SAB')}), CAR ${stats.CAR} (${mod('CAR')>=0?'+':''}${mod('CAR')}).

Estado actual:
- Ubicación: ${state.gameState.location}
- HP: ${state.gameState.hp}/${state.gameState.maxHp}
- Inventario: ${state.gameState.inventory.join(', ') || 'vacío'}
- Misión activa: ${state.gameState.quest}
- Últimos eventos relevantes: ${state.gameState.summary || 'ninguno'}

Reglas:
- Respuestas de 80-150 palabras máximo.
- Cuando el jugador intente algo con incertidumbre, simula una tirada d20 + modificador y narra el resultado.
- Mantén siempre coherencia con el estado anterior.
- Termina siempre con una situación que invite al jugador a actuar.
- Al final de tu respuesta incluye exactamente este bloque: [STATE: {"hp": número, "location": "texto", "inventory": ["item1","item2"], "quest": "texto", "summary": "texto"}]
- Nada después del bloque STATE.`;

    return { system, user: playerAction };
}

async function callGroqApi(playerAction) {
    const { system, user } = buildPrompt(playerAction);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {role: 'system', content: system},
                {role: 'user', content: user}
            ],
            temperature: 0.7,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error Groq: ${response.status} ${errorText}`);
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
            console.warn('No se pudo parsear STATE block', e);
        }
    }
    return {narration, stateUpdates};
}

async function summarizeContext() {
    const recent = state.chatHistory.slice(-16);
    const recentText = recent.map(m => `${m.role === 'dm' ? 'DM' : 'Jugador'}: ${m.content}`).join('\n');
    const summaryPrompt = `Resume en 2-3 frases lo ocurrido, enfocándote en cambios de ubicación, HP, inventario o misión.\n\n${recentText}`;
    try {
        const resp = await callGroqApiRaw(summaryPrompt);
        state.gameState.summary = resp.trim();
        if (state.chatHistory.length > 30) {
            state.chatHistory = state.chatHistory.slice(-20);
        }
        saveGameState();
    } catch(e) {
        console.warn('No se pudo resumir el contexto', e);
    }
}

async function callGroqApiRaw(userMessage) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{role: 'user', content: userMessage}],
            temperature: 0.5,
            max_tokens: 200
        })
    });
    if (!response.ok) throw new Error(`Error Groq: ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
}

function saveGameState() {
    localStorage.setItem('dndGameState', JSON.stringify(state.gameState));
    localStorage.setItem('dndChatHistory', JSON.stringify(state.chatHistory));
}

// Start
init();

