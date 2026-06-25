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

// Helper function to convert item string to Item object (for backward compatibility)
function createItemFromName(itemName) {
    if (typeof itemName !== 'string') {
        // If it's already an object, return as is (with validation if needed)
        return itemName;
    }

    const name = itemName.trim();
    if (!name) {
        return { name: 'Item desconocido', type: 'objeto', damage: null, rarity: 'común', description: '', equipped: false };
    }

    // Determine item type based on name
    const lowerName = name.toLowerCase();
    let type = 'objeto'; // default
    let damage = null;   // default for non-weapons

    // Weapon keywords
    if (lowerName.includes('espada') ||
        lowerName.includes('daga') ||
        lowerName.includes('arco') ||
        lowerName.includes('hacha') ||
        lowerName.includes('maz') ||  // maza, mazacote
        lowerName.includes('lanza') ||
        lowerName.includes('bastón') ||
        lowerName.includes('club') ||
        lowerName.includes('martillo')) {
        type = 'arma';
        // Default damage for weapons - can be refined per weapon type
        damage = 6;
    }
    // Armor/shield keywords
    else if (lowerName.includes('armadura') ||
             lowerName.includes('escudo') ||
             lowerName.includes('ropa') ||
             lowerName.includes('vestiduras') ||
             lowerName.includes('túnica') ||
             lowerName.includes('capa') ||
             lowerName.includes('yelmo') ||
             lowerName.includes('yelmo') ||
             lowerName.includes('guantes') ||
             lowerName.includes('botas')) {
        type = 'armadura';
        // Armor doesn't have damage in D&D 5e terms, but could have AC bonus
        damage = null;
    }
    // Potion/consumable keywords
    else if (lowerName.includes('poción') ||
             lowerName.includes('veneno') ||
             lowerName.includes('curativa') ||
             lowerName.includes('antídoto') ||
             lowerName.includes('aceite') ||
             lowerName.includes('pergamino')) {
        type = 'consumible';
        damage = null;
    }
    // Treasure/junk keywords
    else if (lowerName.includes('moneda') ||
             lowerName.includes('gem') ||
             lowerName.includes('joya') ||
             lowerName.includes('arte') ||
             lowerName.includes('tesoro')) {
        type = 'tesoro';
        damage = null;
    }
    // Component/tool keywords
    else if (lowerName.includes('componente') ||
             lowerName.includes('herramienta') ||
             lowerName.includes('kit') ||
             lowerName.includes('libro') ||
             lowerName.includes('varita') ||
             lowerName.includes('orbe') ||
             lowerName.includes('amuleto') ||
             lowerName.includes('símbolo')) {
        type = 'componente';
        damage = null;
    }
    // Food/rations
    else if (lowerName.includes('ración') ||
             lowerName.includes('pan') ||
             lowerName.includes('agua') ||
             lowerName.includes('vino') ||
             lowerName.includes('comida') ||
             lowerName.includes('hidromiel')) {
        type = 'ración';
        damage = null;
    }
    // Default is already 'objeto'

    return {
        name: name,
        type: type,
        damage: damage,
        rarity: 'común', // Default rarity
        description: '', // No description by default
        equipped: false  // Not equipped by default
    };
}

// Helper function to format inventory for display
function formatInventoryForDisplay(inventory) {
    if (!inventory || inventory.length === 0) {
        return 'Vacío';
    }

    return inventory.map(item => {
        // If it's a string (backward compatibility), return it as is
        if (typeof item === 'string') {
            return item;
        }

        // If it's an object, format it with relevant details
        let displayText = item.name;

        // Add type info for certain item types
        if (item.type === 'arma' && item.damage !== null) {
            displayText += ` (Daño: ${item.damage})`;
        } else if (item.type === 'armadura') {
            displayText += ` (Armadura)`;
        } else if (item.type === 'consumible') {
            displayText += ` (Consumible)`;
        } else if (item.type === 'tesoro') {
            displayText += ` (Tesoro)`;
        }

        // Add rarity if not common
        if (item.rarity && item.rarity !== 'común') {
            displayText += ` [${item.rarity}]`;
        }

        // Add equipped status if applicable
        if (item.equipped) {
            displayText += ` (Equipado)`;
        }

        return displayText;
    }).join(', ');
}

// Experience and leveling system
function addExperience(amount) {
    if (amount <= 0 || !state.character) return;

    // Add experience
    state.character.experience += amount;

    // Check for level ups
    let leveledUp = false;
    while (state.character.experience >= getExperienceForNextLevel(state.character.level)) {
        state.character.experience -= getExperienceForNextLevel(state.character.level);
        state.character.level++;
        state.character.skillPoints += 2; // Award 2 skill points per level up
        leveledUp = true;

        // Check if new level triggers class evolution
        updateClassEvolution();
    }

    // If we leveled up, show a message
    if (leveledUp) {
        addDMMessage(`¡Has subido de nivel! Ahora eres nivel ${state.character.level}. Tienes ${state.character.skillPoints} puntos de habilidad para asignar.`);
        updateStatus(); // Update UI to show new level
    }
}

// Calculate experience needed for next level
function getExperienceForNextLevel(currentLevel) {
    // Using a simple exponential formula: level * 100
    // This means: level 2 needs 200 XP, level 3 needs 300 XP, etc.
    // Actually, let's make it cumulative: to go from level n to n+1, you need n * 100 XP
    // So total XP for level L is sum(i=1 to L-1) of i * 100 = 100 * (L-1) * L / 2
    // But for simplicity, let's use: XP for next level = currentLevel * 100
    return currentLevel * 100;
}
function getStartingEquipment(charClass) {
    switch(charClass) {
        case 'Guerrero':
            return [
                createItemFromName('Espada larga'),
                createItemFromName('Escudo'),
                createItemFromName('Armadura de cuero'),
                createItemFromName('Botella de hidromiel')
            ];
        case 'Mago':
            return [
                createItemFromName('Bastón de madera'),
                createItemFromName('Libro de hechizos'),
                createItemFromName('Componentes de hechizo'),
                createItemFromName('Ropa de viajante')
            ];
        case 'Pícaro':
            return [
                createItemFromName('Daga'),
                createItemFromName('Armadura de cuero'),
                createItemFromName('Herramientas de ladronzuelo'),
                createItemFromName('Bolso')
            ];
        case 'Clérigo':
            return [
                createItemFromName('Maza'),
                createItemFromName('Escudo'),
                createItemFromName('Armadura de cadena'),
                createItemFromName('Símbolo sagrado')
            ];
        default:
            return [
                createItemFromName('Daga'),
                createItemFromName('Botella de hidromiel'),
                createItemFromName('Sacode dormir')
            ];
    }
}

// Generate starting inventory for NPCs - returns array of Item objects
function generateNPCStartingInventory() {
    // Common items that NPCs might carry
    const commonItems = [
        'Moneda de cobre',
        'Moneda de plata',
        'Botella de agua',
        'Ración',
        'Cuerda',
        'Antorcha',
        'Saco'
    ];

    // Select 2-4 random items
    const inventory = [];
    const numItems = Math.floor(Math.random() * 3) + 2; // 2-4 items

    for (let i = 0; i < numItems; i++) {
        const randomIndex = Math.floor(Math.random() * commonItems.length);
        inventory.push(createItemFromName(commonItems[randomIndex]));
    }

    return inventory;
}

// DOM elements
const appDiv = document.getElementById('app');

// Initialize
function init() {
    const savedApiKey = localStorage.getItem('groqApiKey');
    if (savedApiKey) state.apiKey = savedApiKey;

    const savedChar = localStorage.getItem('dndCharacter');
    if (savedChar) {
        try {
            state.character = JSON.parse(savedChar);
            // Ensure backward compatibility by adding new fields if they don't exist
            if (state.character.experience === undefined) state.character.experience = 0;
            if (state.character.level === undefined) state.character.level = 1;
            if (state.character.skillPoints === undefined) state.character.skillPoints = 0;
        } catch(e) {}
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
                <div>🎒 <span id="inventoryDisplay">${formatInventoryForDisplay(state.gameState.inventory) || 'Vacío'}</span></div>
                <div>⭐ Nivel: <span id="levelDisplay">${state.character.level}</span> (<span id="xpDisplay">${state.character.experience}/${getExperienceForNextLevel(state.character.level)} XP</span>)</div>
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
            stats: state.tempStats,
            experience: 0,
            level: 1,
            skillPoints: 0
        };
        const conMod = Math.floor((state.character.stats.CON - 10)/2);
        state.gameState.maxHp = 10 + conMod;
        state.gameState.hp = state.gameState.maxHp;
        state.gameState.location = "Taberna de Rurik";
        state.gameState.inventory = getStartingEquipment(state.character.classe);
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
        document.getElementById('inventoryDisplay').textContent = formatInventoryForDisplay(state.gameState.inventory) || 'Vacío';
        const levelText = state.character.skillPoints > 0
            ? `Nivel: ${state.character.level} (${state.character.skillPoints}SP)`
            : `Nivel: ${state.character.level}`;
        document.getElementById('levelDisplay').textContent = levelText;
        document.getElementById('xpDisplay').textContent = `${state.character.experience}/${getExperienceForNextLevel(state.character.level)} XP`;
    }

    async function sendMessage() {
        const playerAction = playerInput.value.trim();
        if (!playerAction) return;

        // Handle skill point allocation commands
        const skillPointMatch = playerAction.match(/^\/asignar\s+(\d+)\s+(FUE|DES|CON|INT|SAB|CAR|Fuerza|Destreza|Constitución|Inteligencia|Sabiduría|Carisma)$/i);
        if (skillPointMatch) {
            const amount = parseInt(skillPointMatch[1]);
            const attrKey = skillPointMatch[2].toUpperCase();

            // Map Spanish attribute names to English keys used in stats
            const attrMap = {
                'FUERZA': 'FUE',
                'DESTREZA': 'DES',
                'CONSTITUCIÓN': 'CON',
                'INTELIGENCIA': 'INT',
                'SABIDURIA': 'SAB',
                'CARISMA': 'CAR'
            };
            const statKey = attrMap[attrKey] || attrKey;

            // Check if we have enough skill points
            if (state.character.skillPoints >= amount) {
                // Deduct skill points
                state.character.skillPoints -= amount;

                // Increase the stat
                state.character.stats[statKey] += amount;

                // Check if this stat change triggers class evolution
                updateClassEvolution();

                // Provide feedback
                const attrNames = {
                    'FUE': 'Fuerza',
                    'DES': 'Destreza',
                    'CON': 'Constitución',
                    'INT': 'Inteligencia',
                    'SAB': 'Sabiduría',
                    'CAR': 'Carisma'
                };
                const attrName = attrNames[statKey] || statKey;
                addDMMessage(`Has asignado ${amount} puntos de habilidad a ${attrName}. Ahora tienes ${state.character.skillPoints} puntos de habilidad disponibles.`);

                // Update status to reflect the changes
                updateStatus();
                saveGameState();

                // Early return since we handled this command without sending to LLM
                return;
            } else {
                addDMMessage(`No tienes suficientes puntos de habilidad. Necesitas ${amount} puntos pero solo tienes ${state.character.skillPoints}.`);
                return;
            }
        }

        playerInput.disabled = true;
        sendBtn.disabled = true;
        sendBtn.textContent = 'Enviando...';

        state.chatHistory.push({role: 'player', content: playerAction});
        renderChat();
        playerInput.value = '';

        try {
            const response = await callGroqApi(playerAction);
            const {narration, stateUpdates, rollUpdate} = parseLlmResponse(response);
            if (stateUpdates) {
                // Handle inventory conversion from string array to Item objects
                if (stateUpdates.inventory && Array.isArray(stateUpdates.inventory)) {
                    stateUpdates.inventory = stateUpdates.inventory.map(itemName =>
                        typeof itemName === 'string' ? createItemFromName(itemName) : itemName
                    );
                }
                Object.assign(state.gameState, stateUpdates);
                if (state.gameState.hp < 0) state.gameState.hp = 0;
                if (state.gameState.hp > state.gameState.maxHp) state.gameState.hp = state.gameState.maxHp;
            }
            // Award experience based on dice roll results
            if (rollUpdate && rollUpdate.success) {
                // Award experience based on roll difficulty and success
                // Base XP: 10
                // Difficulty bonus: DC / 2 (rounded down)
                // Success bonus: extra 50% if successful
                const baseXP = 10;
                const difficultyBonus = Math.floor(rollUpdate.dc / 2);
                let xpToAdd = baseXP + difficultyBonus;
                if (rollUpdate.success) {
                    xpToAdd = Math.floor(xpToAdd * 1.5); // 50% bonus for success
                }
                addExperience(xpToAdd);
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
- Inventario: ${formatInventoryForDisplay(state.gameState.inventory) || 'vacío'}
- Misión activa: ${state.gameState.quest}
- Últimos eventos relevantes: ${state.gameState.summary || 'ninguno'}

Reglas:
- Respuestas de 80-150 palabras máximo.
- Cuando el jugador intente algo con incertidumbre, simula una tirada d20 + modificador y narra el resultado.
- Mantén siempre coherencia con el estado anterior.
- Otorga experiencia (experience) cuando el jugador complete acciones significativas, teniendo en cuenta la dificultad y el éxito de la acción.
- Cuando simules tiradas de dados, incluye el resultado en un bloque [ROLL: {...}] con los detalles de la tirada.
- Termina siempre con una situación que invite al jugador a actuar.
- Al final de tu respuesta incluye exactamente este bloque: [STATE: {"hp": número, "location": "texto", "inventory": ["item1","item2"], "quest": "texto", "summary": "texto", "experience": número, "level": número}]
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
    const rollMatch = response.match(/\[ROLL:\s*(\{[\s\S]*?\})\]/);
    let stateUpdates = null;
    let rollUpdate = null;
    let narration = response;
    if (stateMatch) {
        try {
            stateUpdates = JSON.parse(stateMatch[1]);
            narration = response.replace(stateMatch[0], '').trim();
        } catch(e) {
            console.warn('No se pudo parsear STATE block', e);
        }
    }
    if (rollMatch) {
        try {
            rollUpdate = JSON.parse(rollMatch[1]);
            // Remove the ROLL block from narration as well
            narration = narration.replace(rollMatch[0], '').trim();
        } catch(e) {
            console.warn('No se pudo parsear ROLL block', e);
        }
    }
    return {narration, stateUpdates, rollUpdate};
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
