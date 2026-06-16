// ===================== ADVENTURES =====================
const ADVENTURES = [
    {
        id: 'tavern-mystery',
        title: 'El Misterio de la Taberna',
        emoji: '🕵️',
        gradient: 'linear-gradient(135deg, #1a0a0a 0%, #3d1a0a 100%)',
        tags: ['Misterio', 'Intriga'],
        description: 'Clientes desaparecen en la Taberna de Rurik. Alguien entre los habituales oculta un secreto mortal.',
        startScene: 'La taberna de Rurik está inusualmente silenciosa esta noche. Tres mesas vacías que siempre tienen clientes, la cocinera evita tu mirada, y el tabernero Grimbold limpia el mismo vaso desde hace veinte minutos. En el rincón del fondo, una silla volcada que nadie ha levantado desde ayer.',
        location: 'Taberna de Rurik'
    },
    {
        id: 'dungeon-king',
        title: 'Las Catacumbas del Rey Olvidado',
        emoji: '💀',
        gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a3d 100%)',
        tags: ['Dungeon', 'Exploración'],
        description: 'Bajo el castillo en ruinas yacen tesoros y horrores. Las trampas del rey muerto llevan mil años esperando.',
        startScene: 'La entrada a las catacumbas es una grieta en la roca, apenas lo bastante ancha para entrar de lado. El aire que sale huele a piedra húmeda y algo que no puedes identificar, algo antiguo. Tu antorcha proyecta sombras que parecen moverse antes de que la llama las alcance. La leyenda dice que el último explorador que entró dejó sus botas en la entrada. Las botas siguen aquí.',
        location: 'Catacumbas del Rey Olvidado'
    },
    {
        id: 'city-intrigue',
        title: 'Trono de Cenizas',
        emoji: '👑',
        gradient: 'linear-gradient(135deg, #0a0f0a 0%, #1a3d10 100%)',
        tags: ['Política', 'Guerra'],
        description: 'El gobernador ha sido asesinado y tres facciones se culpan. Tú conoces la verdad, pero ¿puedes sobrevivir para contarla?',
        startScene: 'La ciudad de Piedranegra amanece con el cuerpo del gobernador colgado en la plaza, un mensaje clavado en su pecho: "La Mano Roja cobra sus deudas." Tres facciones ya se acusan mutuamente: la guardia real, el gremio de mercaderes y el culto de la Llama Eterna. Tú viste quién salió de sus aposentos anoche. Nadie más lo sabe todavía.',
        location: 'Ciudad de Piedranegra'
    },
    {
        id: 'forest-spirits',
        title: 'El Bosque que Sangra',
        emoji: '🌲',
        gradient: 'linear-gradient(135deg, #0a0f08 0%, #0f2d0a 100%)',
        tags: ['Naturaleza', 'Horror'],
        description: 'Los árboles del bosque antiguo gotean sangre al amanecer. Las aldeas del borde del bosque llevan semanas sin noticias.',
        startScene: 'El bosque de Mirenveil siempre fue extraño, pero ahora es otra cosa. Los árboles más viejos tienen líneas rojas que recorren su corteza como venas. Los pájaros no cantan. Hace tres semanas, la aldea de Millhaven, justo dentro del borde del bosque, dejó de responder a los mensajeros. El último mensajero que fue solo dejó su caballo atado en el camino. El caballo volvió solo. No llevaba jinete, pero llevaba algo en las alforjas.',
        location: 'Bosque de Mirenveil'
    },
    {
        id: 'sea-port',
        title: 'Puerto de Contrabandistas',
        emoji: '⚓',
        gradient: 'linear-gradient(135deg, #050a1a 0%, #0a1a3d 100%)',
        tags: ['Piratería', 'Mar'],
        description: 'En el puerto más corrupto del mundo, todos tienen secretos. Un cargamento misterioso está a punto de desencadenar una guerra.',
        startScene: 'El Puerto de las Lanzas huele a sal, pescado y traición. La taberna del Ancla Rota está llena de capitanes que nunca miran directamente a nadie. Esta mañana apareció un barco en la bahía sin tripulación, sin bandera, y con las escotillas selladas desde dentro. El Capitán Vorra ha ofrecido doscientas monedas de oro a quien descubra qué lleva el barco. Otras tres personas ya han hecho la misma oferta.',
        location: 'Puerto de las Lanzas'
    },
    {
        id: 'free',
        title: 'Aventura Libre',
        emoji: '✨',
        gradient: 'linear-gradient(135deg, #1a100a 0%, #3d2a0a 100%)',
        tags: ['Libre', 'Abierto'],
        description: 'Sin guión. El Maestro de Mazmorras crea el mundo contigo en tiempo real.',
        startScene: null,
        location: 'Taberna de Rurik'
    }
];

// ===================== STATE =====================
const state = {
    apiKey: null,
    character: null,
    adventure: null,
    gameState: {
        location: 'Taberna de Rurik',
        timeOfDay: 'Tarde',
        hp: 0, maxHp: 0,
        inventory: [],
        quest: '',
        summary: '',
        companions: [],
        relationships: {},
        skillUses: { combat: 0, magic: 0, stealth: 0, social: 0, nature: 0 },
        classEvolution: ''
    },
    chatHistory: [],
    turnCount: 0,
    pendingRoll: null
};

const appDiv = document.getElementById('app');

// ===================== ROLL SYSTEM =====================
const ROLL_TRIGGERS = [
    { keywords: ['persuad','convenc','engañ','negoci','seduc','enamor','coquete','flirte','charm','intim'], skill: 'Carisma', stat: 'CAR', dc: 12 },
    { keywords: ['busca','observa','invest','inspect','percib','detect','examin','estudia','analiz','registro','registra','mira con atenci','espía'], skill: 'Investigación', stat: 'SAB', dc: 10 },
    { keywords: ['atac','golpe','dispara','lucha','combat','corta','apuñal','hiero','golpeo','pelea'], skill: 'Ataque', stat: 'FUE', dc: 12 },
    { keywords: ['escond','sigilo','escapa','trepa','salta','esquiv','infiltr','se mueve en silencio'], skill: 'Sigilo', stat: 'DES', dc: 11 },
    { keywords: ['recuerd','identific','comprend','descifr','sabe sobre','conoce','historia de','lore'], skill: 'Conocimiento', stat: 'INT', dc: 11 },
    { keywords: ['intimid','amenaz','asus'], skill: 'Intimidación', stat: 'CAR', dc: 13 },
    { keywords: ['cura','sana','medic','venda'], skill: 'Medicina', stat: 'SAB', dc: 10 },
    { keywords: ['roba','hurta','carterist','desaparece el'], skill: 'Hurto', stat: 'DES', dc: 13 },
    { keywords: ['lanza','conjura','hechiz','magia','encanta','invoca'], skill: 'Magia', stat: 'INT', dc: 12 },
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

    // Track skill uses
    if (trigger.skill === 'Ataque') state.gameState.skillUses.combat++;
    else if (trigger.skill === 'Magia') state.gameState.skillUses.magic++;
    else if (trigger.skill === 'Sigilo' || trigger.skill === 'Hurto') state.gameState.skillUses.stealth++;
    else if (trigger.skill === 'Carisma' || trigger.skill === 'Intimidación') state.gameState.skillUses.social++;
    updateClassEvolution();

    state.chatHistory[msgIdx].roll = result;
    state.chatHistory[msgIdx].rollState = 'done';

    const container = document.getElementById('chatContainer');
    const existing = container.querySelector(`[data-idx="${msgIdx}"]`);
    if (existing) existing.replaceWith(createMessageEl(state.chatHistory[msgIdx], msgIdx));

    await callAndRespond(action, result);
};

function updateClassEvolution() {
    const { combat, magic, stealth, social, nature } = state.gameState.skillUses;
    const char = state.character;
    let evo = '';
    if (magic >= 5 && char.classe === 'Guerrero') evo = 'Guerrero Arcano (usa magia y combate)';
    else if (combat >= 5 && char.classe === 'Mago') evo = 'Mago de Batalla (usa hechizos en combate)';
    else if (social >= 5 && char.classe === 'Pícaro') evo = 'Pícaro Maestro (especialista en manipulación)';
    else if (magic >= 5 && char.classe === 'Clérigo') evo = 'Clérigo Oscuro (magia y fe combinadas)';
    else if (combat >= 3 && stealth >= 3) evo = 'Luchador en las Sombras';
    else if (social >= 4 && magic >= 3) evo = 'Bardo Arcano';
    state.gameState.classEvolution = evo;
}

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
    const savedAdv = localStorage.getItem('dndAdventure');
    if (savedAdv) { try { state.adventure = JSON.parse(savedAdv); } catch(e) {} }
    const savedGame = localStorage.getItem('dndGameState');
    if (savedGame) { try { Object.assign(state.gameState, JSON.parse(savedGame)); } catch(e) {} }
    const savedHistory = localStorage.getItem('dndChatHistory');
    if (savedHistory) { try { state.chatHistory = JSON.parse(savedHistory); } catch(e) {} }

    if (!state.apiKey) showScreen('apiKey');
    else if (!state.character) showScreen('characterCreation');
    else if (!state.adventure && state.chatHistory.length === 0) showScreen('adventureSelection');
    else showScreen('chat');
}

function showScreen(name) {
    appDiv.innerHTML = '';
    switch(name) {
        case 'apiKey': appDiv.innerHTML = renderApiKeyScreen(); bindApiKeyScreen(); break;
        case 'characterCreation': appDiv.innerHTML = renderCharacterCreationScreen(); bindCharacterCreation(); break;
        case 'adventureSelection': appDiv.innerHTML = renderAdventureSelectionScreen(); bindAdventureSelection(); break;
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
    const races = [
        ['Humano','Versátil y adaptable'],
        ['Elfo','Ágil y perceptivo'],
        ['Enano','Resistente y tenaz'],
        ['Mediano','Pequeño pero afortunado'],
        ['Tiefling','Sangre demoníaca, fuego interior'],
        ['Vampiro','Inmortal, sediento de sangre'],
        ['Hada','Criatura mágica del bosque etéreo'],
        ['Fauno','Espíritu del bosque, mitad cabra'],
        ['Dragonborn','Sangre de dragón, aliento de fuego'],
        ['Orco','Fuerza bruta, honor guerrero'],
        ['Semiélfico','Lo mejor de dos mundos'],
        ['Gnomo','Inventivo e impredecible'],
    ];
    const classes = [
        ['Guerrero','Maestro del combate cuerpo a cuerpo'],
        ['Mago','Hechizos y magia arcana'],
        ['Pícaro','Sigilo, engaño y destreza'],
        ['Clérigo','Fe divina y magia sagrada'],
        ['Bardo','Música y magia del carisma'],
        ['Druida','Naturaleza, animales y magia salvaje'],
        ['Explorador','Maestro del bosque y el arco'],
        ['Paladín','Guerrero sagrado y protector'],
        ['Hechicero','Magia innata de sangre dracónica'],
        ['Monje','Artes marciales y ki interior'],
    ];
    const raceOpts = races.map(([v,d]) => `<option value="${v}">${v} — ${d}</option>`).join('');
    const classOpts = classes.map(([v,d]) => `<option value="${v}">${v} — ${d}</option>`).join('');
    return `<div class="container">
        <h1>Crea tu Héroe</h1>
        <div class="input-group">
            <label>Nombre del personaje</label>
            <input type="text" id="charName" placeholder="Ej: Rurik, Lyra, Gareth...">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="input-group" style="margin:0">
                <label>Raza</label>
                <select id="charRace"><option value="">Elige...</option>${raceOpts}</select>
            </div>
            <div class="input-group" style="margin:0">
                <label>Clase</label>
                <select id="charClass"><option value="">Elige...</option>${classOpts}</select>
            </div>
        </div>
        <div class="input-group">
            <label>Trasfondo</label>
            <select id="charBackground">
                <option value="">Elige un trasfondo</option>
                <option value="Soldado">Soldado — Veterano de guerra</option>
                <option value="Criminal">Criminal — Experto en las calles</option>
                <option value="Noble">Noble — Conexiones influyentes</option>
                <option value="Huérfano">Huérfano — Sobreviviente nato</option>
                <option value="Mercader">Mercader — Negociador nato</option>
                <option value="Erudito">Erudito — Estudioso de lo arcano</option>
                <option value="Marginado">Marginado — Vive fuera de la ley</option>
            </select>
        </div>
        <div class="input-group">
            <label>Motivación (opcional)</label>
            <input type="text" id="charMotivation" placeholder="Ej: vengar a mi familia, encontrar el artefacto perdido...">
        </div>
        <div class="input-group">
            <label>Estadísticas</label>
            <button class="btn" id="rollStatsBtn" style="margin-top:0.25rem">🎲 Tirar Dados</button>
            <div id="statsDisplay" style="margin-top:0.5rem;font-size:0.8rem;color:var(--text-muted);text-align:center"></div>
        </div>
        <button class="btn" id="createCharBtn" disabled>⚔️ Continuar</button>
    </div>`;
}

function renderAdventureSelectionScreen() {
    const cards = ADVENTURES.map(adv => `
        <div class="adv-card" data-id="${adv.id}" style="background:${adv.gradient}">
            <div class="adv-emoji">${adv.emoji}</div>
            <div class="adv-info">
                <div class="adv-title">${adv.title}</div>
                <div class="adv-tags">${adv.tags.map(t=>`<span class="adv-tag">${t}</span>`).join('')}</div>
                <div class="adv-desc">${adv.description}</div>
            </div>
        </div>`).join('');
    return `<div class="adv-screen">
        <h1>Elige tu Aventura</h1>
        <p style="text-align:center;color:var(--text-muted);margin-bottom:1.5rem;font-size:0.9rem">Selecciona el tipo de historia que quieres vivir</p>
        <div class="adv-grid">${cards}</div>
    </div>`;
}

function renderChatScreen() {
    return `<div class="game-wrapper">
        <div class="status-bar">
            <button class="menu-btn" id="menuBtn" title="Menú">☰</button>
            <div>❤️ <span id="hpDisplay">${state.gameState.hp}/${state.gameState.maxHp}</span></div>
            <div>📍 <span id="locationDisplay">${state.gameState.location}</span></div>
            <div>🌙 <span id="timeDisplay">${state.gameState.timeOfDay}</span></div>
            <div>🎒 <span id="inventoryDisplay">${state.gameState.inventory.join(', ') || 'Vacío'}</span></div>
        </div>
        <div id="menuModal" class="modal hidden">
            <div class="modal-box">
                <div class="modal-title">Menú</div>
                <button class="modal-btn" id="newAdventureBtn">🗺️ Nueva Aventura (mismo personaje)</button>
                <button class="modal-btn" id="newCharacterBtn">⚔️ Nuevo Personaje (reinicio total)</button>
                <button class="modal-btn" id="manageInventoryBtn">🎒 Gestionar Inventario</button>
                <button class="modal-btn danger" id="closeMenuBtn">✕ Cerrar</button>
            </div>
        </div>
        <div id="inventoryModal" class="modal hidden">
            <div class="modal-box">
                <div class="modal-title">🎒 Inventario</div>
                <div id="inventoryList" class="inv-list"></div>
                <div class="inv-add-row">
                    <input type="text" id="newItemInput" placeholder="Nuevo objeto..." class="inv-input">
                    <button class="modal-btn small" id="addItemBtn">+ Añadir</button>
                </div>
                <button class="modal-btn" id="closeInvBtn" style="margin-top:0.5rem">✓ Cerrar</button>
            </div>
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
        const motivation = document.getElementById('charMotivation').value.trim();
        state.character = {
            name: nameInput.value.trim(),
            race: raceSelect.value,
            classe: classSelect.value,
            background: bgSelect.value,
            motivation: motivation || '',
            stats: state.tempStats
        };
        const conMod = Math.floor((state.character.stats.CON - 10)/2);
        state.gameState.maxHp = 10 + conMod;
        state.gameState.hp = state.gameState.maxHp;
        state.gameState.companions = [];
        state.gameState.relationships = {};
        state.gameState.skillUses = { combat: 0, magic: 0, stealth: 0, social: 0, nature: 0 };
        localStorage.setItem('dndCharacter', JSON.stringify(state.character));
        showScreen('adventureSelection');
    });
}

function bindAdventureSelection() {
    document.querySelectorAll('.adv-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            const adv = ADVENTURES.find(a => a.id === id);
            state.adventure = adv;
            state.gameState.location = adv.location;
            state.gameState.quest = adv.id === 'free' ? 'Aventura libre: el destino lo dirá' : adv.description;
            state.chatHistory = [];
            localStorage.setItem('dndAdventure', JSON.stringify(adv));
            localStorage.setItem('dndGameState', JSON.stringify(state.gameState));
            showScreen('chat');

            const char = state.character;
            const opener = adv.startScene
                ? `${adv.startScene}\n\nTú eres ${char.name}, ${char.race} ${char.classe}${char.motivation ? `, y tu motivación es: ${char.motivation}` : ''}.\n\n¿Qué haces?`
                : `La Taberna de Rurik te recibe con el olor de cerveza y leña. Tú eres ${char.name}, ${char.race} ${char.classe}${char.motivation ? ` con una misión: ${char.motivation}` : ''}. El tabernero Grimbold te mira desde la barra. Una docena de desconocidos llenan las mesas. El mundo entero está por delante.\n\n¿Qué haces?`;
            addDMMessage(opener, ['Hablar con el tabernero', 'Explorar el lugar', 'Buscar una mesa tranquila y observar']);
        });
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

    // Menu
    document.getElementById('menuBtn').addEventListener('click', () => {
        document.getElementById('menuModal').classList.toggle('hidden');
    });
    document.getElementById('closeMenuBtn').addEventListener('click', () => {
        document.getElementById('menuModal').classList.add('hidden');
    });
    document.getElementById('newAdventureBtn').addEventListener('click', () => {
        state.chatHistory = [];
        state.adventure = null;
        state.gameState.companions = [];
        state.gameState.relationships = {};
        state.gameState.skillUses = { combat: 0, magic: 0, stealth: 0, social: 0, nature: 0 };
        state.gameState.classEvolution = '';
        state.gameState.summary = '';
        state.turnCount = 0;
        localStorage.removeItem('dndAdventure');
        localStorage.removeItem('dndChatHistory');
        localStorage.setItem('dndGameState', JSON.stringify(state.gameState));
        showScreen('adventureSelection');
    });
    document.getElementById('newCharacterBtn').addEventListener('click', () => {
        if (confirm('¿Seguro? Se borrará el personaje y toda la partida.')) {
            localStorage.clear();
            location.reload();
        }
    });
    document.getElementById('manageInventoryBtn').addEventListener('click', () => {
        document.getElementById('menuModal').classList.add('hidden');
        openInventoryModal();
    });
    document.getElementById('closeInvBtn').addEventListener('click', () => {
        document.getElementById('inventoryModal').classList.add('hidden');
    });
    document.getElementById('addItemBtn').addEventListener('click', () => {
        const input = document.getElementById('newItemInput');
        const item = input.value.trim();
        if (item) {
            state.gameState.inventory.push(item);
            input.value = '';
            renderInventoryModal();
            updateStatus();
            saveGameState();
        }
    });
    document.getElementById('newItemInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') document.getElementById('addItemBtn').click();
    });
}

function openInventoryModal() {
    document.getElementById('inventoryModal').classList.remove('hidden');
    renderInventoryModal();
}

function renderInventoryModal() {
    const list = document.getElementById('inventoryList');
    if (!list) return;
    if (state.gameState.inventory.length === 0) {
        list.innerHTML = '<div class="inv-empty">El inventario está vacío</div>';
        return;
    }
    list.innerHTML = state.gameState.inventory.map((item, i) =>
        `<div class="inv-item">
            <span>${item}</span>
            <button class="inv-remove" onclick="removeItem(${i})">✕</button>
        </div>`
    ).join('');
}

window.removeItem = function(idx) {
    state.gameState.inventory.splice(idx, 1);
    renderInventoryModal();
    updateStatus();
    saveGameState();

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
                ${msg.actions.map(a => `<button class="action-chip" onclick="useAction('${a.replace(/'/g,"\\'").replace(/"/g,'\\"')}')">↗ ${a}</button>`).join('')}
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
    const icons = { 'Guerrero':'⚔️','Mago':'🔮','Pícaro':'🗡️','Clérigo':'✦','Bardo':'🎭','Druida':'🌿','Explorador':'🏹','Paladín':'🛡️','Hechicero':'⚡','Monje':'👊' };
    const hpColor = hpPct > 60 ? '#4a7c59' : hpPct > 30 ? '#8a6a20' : '#7c4a4a';

    const companionHtml = (state.gameState.companions || []).map(c => {
        const cpct = Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100));
        const cc = cpct > 60 ? '#4a7c59' : cpct > 30 ? '#8a6a20' : '#7c4a4a';
        return `<div class="companion-card">
            <div class="companion-avatar">${c.icon || '👤'}</div>
            <div class="companion-info">
                <div class="companion-name">${c.name}</div>
                <div class="companion-role">${c.role || ''}</div>
                <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${cpct}%;background:${cc}"></div></div>
                <div class="hp-text">PV ${c.hp}/${c.maxHp}</div>
            </div>
        </div>`;
    }).join('');

    const classLabel = state.gameState.classEvolution || `${char.race} ${char.classe}`;

    panel.innerHTML = `
        <div class="party-card">
            <div class="party-avatar">${icons[char.classe] || '⚔️'}</div>
            <div class="party-name">${char.name}</div>
            <div class="party-class">${classLabel}</div>
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
            <div class="party-bg">${char.background}${char.motivation ? ' · '+char.motivation.substring(0,30) : ''}</div>
        </div>
        ${companionHtml ? `<div class="companions-section"><div class="companions-label">Compañeros</div>${companionHtml}</div>` : ''}`;
}

// ===================== API =====================
async function callAndRespond(action, rollResult) {
    const playerInput = document.getElementById('playerInput');
    const sendBtn = document.getElementById('sendBtn');

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
            if (!state.gameState.companions) state.gameState.companions = [];
            if (!state.gameState.relationships) state.gameState.relationships = {};
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
        addDMMessage('El humo de la taberna nubla la visión. Inténtalo de nuevo.', []);
    } finally {
        if (playerInput) { playerInput.disabled = false; playerInput.focus(); }
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Enviar'; }
    }
}

function buildPrompt(playerAction, rollResult) {
    const char = state.character;
    const stats = char.stats;
    const fmod = (ab) => { const m = Math.floor((stats[ab]-10)/2); return (m>=0?'+':'')+m; };
    const adv = state.adventure;

    const statMap = { 'Ataque':'FUE','Carisma':'CAR','Intimidación':'CAR','Sigilo':'DES','Hurto':'DES','Magia':'INT','Conocimiento':'INT','Investigación':'SAB','Medicina':'SAB' };
    let rollSection = '';
    if (rollResult) {
        const ab = statMap[rollResult.skill] || 'SAB';
        rollSection = `\nTIRADA: ${rollResult.skill} — d20(${rollResult.roll}) ${fmod(ab)} = ${rollResult.total} vs DC ${rollResult.dc} → ${rollResult.success ? 'ÉXITO' : 'FALLO'}`;
    }

    const companions = (state.gameState.companions || []).map(c => `- ${c.name} (${c.role || 'aliado'}, PV ${c.hp}/${c.maxHp})`).join('\n') || 'ninguno';
    const rels = Object.entries(state.gameState.relationships || {}).map(([k,v]) => `- ${k}: ${v.type} (nivel ${v.level}/5)`).join('\n') || 'ninguna establecida';
    const classLabel = state.gameState.classEvolution ? `${char.classe} → evolución: ${state.gameState.classEvolution}` : char.classe;
    const motivation = char.motivation ? `\nMotivación personal: ${char.motivation}` : '';
    const adventureCtx = adv && adv.id !== 'free' ? `\nAventura activa: "${adv.title}" — ${adv.description}` : '';

    const system = `Eres el Maestro de Mazmorras de una campaña de D&D en un mundo de fantasía oscura medieval. Narras en segunda persona, con prosa cinematográfica e inmersiva.

PERSONAJE:
- ${char.name}, ${char.race}, ${classLabel}, trasfondo: ${char.background}${motivation}
- FUE ${stats.FUE}(${fmod('FUE')}), DES ${stats.DES}(${fmod('DES')}), CON ${stats.CON}(${fmod('CON')}), INT ${stats.INT}(${fmod('INT')}), SAB ${stats.SAB}(${fmod('SAB')}), CAR ${stats.CAR}(${fmod('CAR')})
${adventureCtx}

ESTADO:
- Ubicación: ${state.gameState.location} | Hora: ${state.gameState.timeOfDay}
- HP: ${state.gameState.hp}/${state.gameState.maxHp}
- Inventario: ${state.gameState.inventory.join(', ') || 'vacío'}
- Misión: ${state.gameState.quest}
- Contexto previo: ${state.gameState.summary || 'inicio de aventura'}
- Compañeros: ${companions}
- Relaciones con NPCs: ${rels}
${rollSection}

INSTRUCCIONES NARRATIVAS:
- 150-350 palabras. Prosa rica, cinematográfica, detalles sensoriales (sonidos, olores, texturas).
- NPCs con nombres propios, personalidad consistente y motivaciones propias.
- Si hubo tirada: narra las consecuencias dramáticas del éxito o fallo.
- El romance, la seducción y las relaciones pueden desarrollarse naturalmente si el jugador las busca. Tratar con madurez y sin tabúes.
- Si un NPC se convierte en compañero, incluirlo en el STATE con sus datos.
- Las relaciones con NPCs evolucionan (neutral → amigo → aliado → romántico, o rival → enemigo).
- Termina siempre en un momento de decisión o suspense.

Al final de tu respuesta incluye en ESTE ORDEN exacto (sin nada después):
[ACTIONS: ["acción corta 1", "acción corta 2", "acción corta 3"]]
[STATE: {"hp": N, "location": "texto", "timeOfDay": "Mañana/Tarde/Noche/Madrugada", "inventory": [], "quest": "texto", "summary": "resumen 2 frases", "companions": [], "relationships": {}}]`;

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
            temperature: 0.85,
            max_tokens: 950
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
    const text = recent.map(m => `${m.role==='dm'?'DM':'Jugador'}: ${m.content}`).join('\n');
    try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.apiKey}` },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: `Resume en 2 frases los eventos clave, NPCs importantes y el estado actual de esta sesión de D&D:\n\n${text}` }],
                temperature: 0.3, max_tokens: 150
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

// Patch: add menu and inventory management
// Override renderChatScreen to include menu button
const _origRenderChatScreen = renderChatScreen;
// Already defined above, just need to patch via script additions
