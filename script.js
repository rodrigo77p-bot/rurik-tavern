// ===================== CONSTANTS =====================
const ADVENTURES = [
    { id:'tavern-mystery', title:'El Misterio de la Taberna', emoji:'🕵️', gradient:'linear-gradient(135deg,#1a0a0a,#3d1a0a)', tags:['Misterio','Intriga'], description:'Clientes desaparecen en la Taberna de Rurik. Alguien entre los habituales oculta un secreto mortal.', startScene:'La taberna de Rurik está inusualmente silenciosa esta noche. Tres mesas vacías que siempre tienen clientes, la cocinera evita tu mirada, y el tabernero Grimbold limpia el mismo vaso desde hace veinte minutos. En el rincón del fondo, una silla volcada que nadie ha levantado desde ayer.', location:'Taberna de Rurik' },
    { id:'dungeon-king', title:'Las Catacumbas del Rey Olvidado', emoji:'💀', gradient:'linear-gradient(135deg,#0a0a1a,#1a0a3d)', tags:['Dungeon','Exploración'], description:'Bajo el castillo en ruinas yacen tesoros y horrores. Las trampas del rey muerto llevan mil años esperando.', startScene:'La entrada a las catacumbas es una grieta en la roca, apenas lo bastante ancha para entrar de lado. El aire que sale huele a piedra húmeda y algo antiguo. Tu antorcha proyecta sombras que parecen moverse antes de que la llama las alcance. La leyenda dice que el último explorador que entró dejó sus botas en la entrada. Las botas siguen aquí.', location:'Catacumbas del Rey Olvidado' },
    { id:'city-intrigue', title:'Trono de Cenizas', emoji:'👑', gradient:'linear-gradient(135deg,#0a0f0a,#1a3d10)', tags:['Política','Guerra'], description:'El gobernador ha sido asesinado y tres facciones se culpan. Tú conoces la verdad, pero ¿puedes sobrevivir para contarla?', startScene:'La ciudad de Piedranegra amanece con el cuerpo del gobernador colgado en la plaza. Tres facciones ya se acusan mutuamente. Tú viste quién salió de sus aposentos anoche. Nadie más lo sabe todavía.', location:'Ciudad de Piedranegra' },
    { id:'forest-spirits', title:'El Bosque que Sangra', emoji:'🌲', gradient:'linear-gradient(135deg,#0a0f08,#0f2d0a)', tags:['Naturaleza','Horror'], description:'Los árboles del bosque antiguo gotean sangre al amanecer. Las aldeas del borde llevan semanas sin noticias.', startScene:'El bosque de Mirenveil siempre fue extraño, pero ahora es otra cosa. Los árboles más viejos tienen líneas rojas que recorren su corteza como venas. Los pájaros no cantan. Hace tres semanas, la aldea de Millhaven dejó de responder a los mensajeros.', location:'Bosque de Mirenveil' },
    { id:'sea-port', title:'Puerto de Contrabandistas', emoji:'⚓', gradient:'linear-gradient(135deg,#050a1a,#0a1a3d)', tags:['Piratería','Mar'], description:'En el puerto más corrupto del mundo, todos tienen secretos. Un cargamento misterioso está a punto de desencadenar una guerra.', startScene:'El Puerto de las Lanzas huele a sal, pescado y traición. Esta mañana apareció un barco en la bahía sin tripulación, sin bandera, y con las escotillas selladas desde dentro. El Capitán Vorra ha ofrecido doscientas monedas a quien descubra qué lleva el barco.', location:'Puerto de las Lanzas' },
    { id:'free', title:'Aventura Libre', emoji:'✨', gradient:'linear-gradient(135deg,#1a100a,#3d2a0a)', tags:['Libre','Abierto'], description:'Sin guión. El Maestro de Mazmorras crea el mundo contigo en tiempo real.', startScene:null, location:'Taberna de Rurik' }
];

const CLASS_ICONS = { 'Guerrero':'⚔️','Mago':'🔮','Pícaro':'🗡️','Clérigo':'✦','Bardo':'🎭','Druida':'🌿','Explorador':'🏹','Paladín':'🛡️','Hechicero':'⚡','Monje':'👊' };
const STATUS_LABELS = { alive:'Vivo', dead:'Muerto', cursed:'Maldito' };

// ===================== WORLD STATE =====================
function getWorldState() {
    try { return JSON.parse(localStorage.getItem('dndWorldState') || '{"events":[]}'); } catch(e) { return { events: [] }; }
}
function saveWorldEvent(event) {
    const ws = getWorldState();
    event.id = 'evt_' + Date.now();
    event.date = new Date().toISOString().slice(0,10);
    ws.events.push(event);
    localStorage.setItem('dndWorldState', JSON.stringify(ws));
}
function getEventsForLocation(location) {
    if (!location) return [];
    const loc = location.toLowerCase();
    return getWorldState().events.filter(e =>
        e.location && (e.location.toLowerCase().includes(loc) || loc.includes(e.location.toLowerCase()))
    );
}

// ===================== CHARACTER MANAGEMENT =====================
function generateId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }

function getAllCharacters() {
    try { return JSON.parse(localStorage.getItem('dndCharacters') || '[]'); } catch(e) { return []; }
}
function saveAllCharacters(chars) { localStorage.setItem('dndCharacters', JSON.stringify(chars)); }

function getActiveCharId() { return localStorage.getItem('dndActiveCharId'); }
function setActiveCharId(id) { localStorage.setItem('dndActiveCharId', id); }

function getCharData(id) {
    const chars = getAllCharacters();
    return chars.find(c => c.id === id) || null;
}
function updateCharData(charObj) {
    const chars = getAllCharacters();
    const idx = chars.findIndex(c => c.id === charObj.id);
    if (idx >= 0) chars[idx] = charObj; else chars.push(charObj);
    saveAllCharacters(chars);
}
function getGameState(id) {
    try { return JSON.parse(localStorage.getItem('dndGameState_' + id) || 'null'); } catch(e) { return null; }
}
function saveGameStateFor(id, gs) { localStorage.setItem('dndGameState_' + id, JSON.stringify(gs)); }
function getChatHistory(id) {
    try { return JSON.parse(localStorage.getItem('dndChatHistory_' + id) || '[]'); } catch(e) { return []; }
}
function saveChatHistoryFor(id, ch) { localStorage.setItem('dndChatHistory_' + id, JSON.stringify(ch)); }
function getAdventure(id) {
    try { return JSON.parse(localStorage.getItem('dndAdventure_' + id) || 'null'); } catch(e) { return null; }
}
function saveAdventureFor(id, adv) { localStorage.setItem('dndAdventure_' + id, JSON.stringify(adv)); }

// ===================== SESSION STATE =====================
const state = {
    apiKey: null,
    activeCharId: null,
    character: null,
    adventure: null,
    gameState: {
        location:'Taberna de Rurik', timeOfDay:'Tarde',
        hp:0, maxHp:0, inventory:[], quest:'', summary:'',
        companions:[], relationships:{},
        skillUses:{ combat:0, magic:0, stealth:0, social:0, nature:0 },
        classEvolution:'', curse:''
    },
    chatHistory: [],
    turnCount: 0,
    pendingRoll: null
};

const appDiv = document.getElementById('app');

// ===================== ROLL SYSTEM =====================
const ROLL_TRIGGERS = [
    { keywords:['persuad','convenc','engañ','negoci','seduc','enamor','coquete','flirte','charm'], skill:'Carisma', stat:'CAR', dc:12 },
    { keywords:['busca','observa','invest','inspect','percib','detect','examin','estudia','analiz','registra','espía'], skill:'Investigación', stat:'SAB', dc:10 },
    { keywords:['atac','golpe','dispara','lucha','combat','corta','apuñal','hiero','golpeo','pelea'], skill:'Ataque', stat:'FUE', dc:12 },
    { keywords:['escond','sigilo','escapa','trepa','salta','esquiv','infiltr'], skill:'Sigilo', stat:'DES', dc:11 },
    { keywords:['recuerd','identific','comprend','descifr','sabe sobre','conoce','historia de'], skill:'Conocimiento', stat:'INT', dc:11 },
    { keywords:['intimid','amenaz','asus'], skill:'Intimidación', stat:'CAR', dc:13 },
    { keywords:['cura','sana','medic','venda'], skill:'Medicina', stat:'SAB', dc:10 },
    { keywords:['roba','hurta','carterist'], skill:'Hurto', stat:'DES', dc:13 },
    { keywords:['lanza','conjura','hechiz','magia','encanta','invoca'], skill:'Magia', stat:'INT', dc:12 },
];

function detectRoll(action) {
    const lower = action.toLowerCase();
    for (const t of ROLL_TRIGGERS) { if (t.keywords.some(kw => lower.includes(kw))) return t; }
    return null;
}
function rollD20(statValue, dc) {
    const roll = Math.floor(Math.random()*20)+1;
    const mod = Math.floor((statValue-10)/2);
    const total = roll+mod;
    return { roll, mod, total, dc, success: total>=dc };
}

window.executeRoll = async function(msgIdx) {
    if (!state.pendingRoll) return;
    const { action, trigger } = state.pendingRoll;
    state.pendingRoll = null;
    const statVal = state.character.stats[trigger.stat] || 10;
    const result = { ...rollD20(statVal, trigger.dc), skill: trigger.skill };
    if (trigger.skill === 'Ataque') state.gameState.skillUses.combat++;
    else if (trigger.skill === 'Magia') state.gameState.skillUses.magic++;
    else if (['Sigilo','Hurto'].includes(trigger.skill)) state.gameState.skillUses.stealth++;
    else if (['Carisma','Intimidación'].includes(trigger.skill)) state.gameState.skillUses.social++;
    updateClassEvolution();
    state.chatHistory[msgIdx].roll = result;
    state.chatHistory[msgIdx].rollState = 'done';
    const container = document.getElementById('chatContainer');
    const existing = container.querySelector(`[data-idx="${msgIdx}"]`);
    if (existing) existing.replaceWith(createMessageEl(state.chatHistory[msgIdx], msgIdx));
    await callAndRespond(action, result);
};

function updateClassEvolution() {
    const { combat, magic, stealth, social } = state.gameState.skillUses;
    const cls = state.character.classe;
    let evo = '';
    if (magic>=5 && cls==='Guerrero') evo='Guerrero Arcano';
    else if (combat>=5 && cls==='Mago') evo='Mago de Batalla';
    else if (social>=5 && cls==='Pícaro') evo='Maestro Manipulador';
    else if (combat>=3 && stealth>=3) evo='Sombra Luchadora';
    else if (social>=4 && magic>=3) evo='Bardo Arcano';
    state.gameState.classEvolution = evo;
}

window.useAction = function(text) {
    const input = document.getElementById('playerInput');
    const btn = document.getElementById('sendBtn');
    if (input && btn && !state.pendingRoll) { input.value = text; btn.click(); }
};

// ===================== INIT =====================
function init() {
    state.apiKey = localStorage.getItem('groqApiKey');
    if (!state.apiKey) { showScreen('apiKey'); return; }
    // Migrate old single-character data
    migrateOldData();
    showScreen('characterHub');
}

function migrateOldData() {
    const oldChar = localStorage.getItem('dndCharacter');
    if (oldChar && getAllCharacters().length === 0) {
        try {
            const char = JSON.parse(oldChar);
            char.id = generateId();
            char.status = 'alive';
            char.created = new Date().toISOString().slice(0,10);
            updateCharData(char);
            const oldGs = localStorage.getItem('dndGameState');
            if (oldGs) saveGameStateFor(char.id, JSON.parse(oldGs));
            const oldCh = localStorage.getItem('dndChatHistory');
            if (oldCh) saveChatHistoryFor(char.id, JSON.parse(oldCh));
            const oldAdv = localStorage.getItem('dndAdventure');
            if (oldAdv) saveAdventureFor(char.id, JSON.parse(oldAdv));
        } catch(e) {}
    }
}

function loadCharacter(charId) {
    state.activeCharId = charId;
    setActiveCharId(charId);
    state.character = getCharData(charId);
    const gs = getGameState(charId);
    if (gs) Object.assign(state.gameState, gs);
    else {
        const conMod = Math.floor((state.character.stats.CON-10)/2);
        state.gameState.maxHp = 10+conMod;
        state.gameState.hp = state.gameState.maxHp;
    }
    state.chatHistory = getChatHistory(charId);
    state.adventure = getAdventure(charId);
    state.turnCount = 0;
    state.pendingRoll = null;
}

function showScreen(name) {
    appDiv.innerHTML = '';
    switch(name) {
        case 'apiKey': appDiv.innerHTML = renderApiKeyScreen(); bindApiKeyScreen(); break;
        case 'characterHub': appDiv.innerHTML = renderCharacterHub(); bindCharacterHub(); break;
        case 'characterCreation': appDiv.innerHTML = renderCharacterCreationScreen(); bindCharacterCreation(); break;
        case 'adventureSelection': appDiv.innerHTML = renderAdventureSelectionScreen(); bindAdventureSelection(); break;
        case 'chat': appDiv.innerHTML = renderChatScreen(); bindChat(); break;
    }
}

// ===================== RENDER SCREENS =====================
function renderApiKeyScreen() {
    return `<div class="container">
        <h1>Rurik Tavern</h1>
        <p style="text-align:center;margin-bottom:1.5rem;color:var(--text-muted)">Ingresa tu API key de Groq para comenzar.</p>
        <div class="input-group"><label>API Key de Groq</label><input type="password" id="apiKeyInput" placeholder="gsk_..."></div>
        <button class="btn" id="saveApiKeyBtn">Comenzar</button>
    </div>`;
}

function renderCharacterHub() {
    const chars = getAllCharacters();
    const cards = chars.map(c => {
        const gs = getGameState(c.id);
        const hp = gs ? gs.hp : (c.stats ? 10+Math.floor((c.stats.CON-10)/2) : 10);
        const maxHp = gs ? gs.maxHp : hp;
        const hpPct = Math.max(0, Math.min(100, (hp/maxHp)*100));
        const adv = getAdventure(c.id);
        const history = getChatHistory(c.id);
        const isDead = c.status === 'dead';
        const isCursed = c.status === 'cursed';
        const hpColor = isDead ? '#555' : hpPct>60 ? '#4a7c59' : hpPct>30 ? '#8a6a20' : '#7c4a4a';
        const statusBadge = isDead ? '<span class="char-status dead">💀 Muerto</span>' : isCursed ? `<span class="char-status cursed">🌑 Maldito</span>` : '<span class="char-status alive">⬤ Vivo</span>';
        const icon = CLASS_ICONS[c.classe] || '⚔️';
        return `<div class="char-card ${isDead?'dead':''}" data-id="${c.id}" ${isDead?'':'style="cursor:pointer"'}>
            <div class="char-card-avatar">${isDead?'🪦':icon}</div>
            <div class="char-card-info">
                <div class="char-card-name">${c.name} ${statusBadge}</div>
                <div class="char-card-class">${c.race} · ${c.classe}${c.classEvolution?' → '+c.classEvolution:''}</div>
                ${isDead ? `<div class="char-death-note">${c.deathNote || 'Cayó en combate'}</div>` : `
                <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${hpPct}%;background:${hpColor}"></div></div>
                <div class="char-adv">${adv ? adv.title : 'Sin aventura'} · ${history.length} turnos</div>`}
            </div>
        </div>
            <button class="char-delete-btn" data-id="${c.id}" title="Eliminar personaje">🗑️</button>
        </div>`;
    }).join('');

    const worldState = getWorldState();
    const legacyHtml = worldState.events.length > 0 ? `
        <div class="legacy-section">
            <div class="legacy-title">📜 Legado del Mundo</div>
            ${worldState.events.slice(-5).reverse().map(e => `
                <div class="legacy-event">
                    <span class="legacy-type ${e.type}">${e.type==='death'?'💀':e.type==='heroic'?'⚔️':e.type==='curse'?'🌑':'✦'}</span>
                    <div class="legacy-text"><strong>${e.characterName}</strong> en <em>${e.location}</em>: ${e.event}</div>
                </div>`).join('')}
        </div>` : '';

    return `<div class="hub-screen">
        <h1>Rurik Tavern</h1>
        <div class="hub-chars">
            ${cards}
            <div class="char-card new-char" id="newCharBtn">
                <div class="char-card-avatar">+</div>
                <div class="char-card-info">
                    <div class="char-card-name" style="color:var(--accent)">Nuevo Personaje</div>
                    <div class="char-card-class" style="color:var(--text-muted)">Comenzar una nueva historia</div>
                </div>
            </div>
        </div>
        ${legacyHtml}
        <div id="deleteModal" class="modal hidden"><div class="modal-box">
            <div class="modal-title" style="color:#e05555">⚠️ Eliminar Personaje</div>
            <div id="deleteModalText" style="font-size:0.85rem;color:var(--text-muted);text-align:center;margin:0.5rem 0;line-height:1.6"></div>
            <p style="font-size:0.82rem;color:var(--text-muted);text-align:center">Escribe <strong style="color:var(--accent)">confirmar</strong> para borrar:</p>
            <input type="text" id="deleteConfirmInput" placeholder="confirmar" class="inv-input" style="margin-top:0.4rem">
            <button class="modal-btn danger" id="deleteConfirmBtn" disabled>🗑️ Eliminar para siempre</button>
            <button class="modal-btn" id="deleteCancelBtn">✕ Cancelar</button>
        </div></div>
    </div>`;
}

function renderCharacterCreationScreen() {
    const races = [['Humano','Versátil'],['Elfo','Ágil y perceptivo'],['Enano','Resistente'],['Mediano','Afortunado'],['Tiefling','Sangre demoníaca'],['Vampiro','Inmortal'],['Hada','Criatura mágica'],['Fauno','Espíritu del bosque'],['Dragonborn','Sangre de dragón'],['Orco','Fuerza bruta'],['Semiélfico','Dos mundos'],['Gnomo','Inventivo']];
    const classes = [['Guerrero','Combate'],['Mago','Magia arcana'],['Pícaro','Sigilo'],['Clérigo','Fe divina'],['Bardo','Carisma'],['Druida','Naturaleza'],['Explorador','Bosque y arco'],['Paladín','Sagrado'],['Hechicero','Magia innata'],['Monje','Ki interior']];
    return `<div class="container">
        <h1>Nuevo Personaje</h1>
        <div class="input-group"><label>Nombre</label><input type="text" id="charName" placeholder="Ej: Lyra, Gareth..."></div>
        <div class="input-group"><label>Género</label><select id="charGender"><option value="Hombre">Hombre</option><option value="Mujer">Mujer</option><option value="No binario">No binario</option><option value="Otro">Otro</option></select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="input-group" style="margin:0"><label>Raza</label><select id="charRace"><option value="">Elige...</option>${races.map(([v,d])=>`<option value="${v}">${v} — ${d}</option>`).join('')}</select></div>
            <div class="input-group" style="margin:0"><label>Clase</label><select id="charClass"><option value="">Elige...</option>${classes.map(([v,d])=>`<option value="${v}">${v} — ${d}</option>`).join('')}</select></div>
        </div>
        <div class="input-group"><label>Trasfondo</label><select id="charBackground"><option value="">Elige...</option>${['Soldado','Criminal','Noble','Huérfano','Mercader','Erudito','Marginado'].map(v=>`<option value="${v}">${v}</option>`).join('')}</select></div>
        <div class="input-group"><label>Motivación (opcional)</label><input type="text" id="charMotivation" placeholder="Ej: vengar a mi familia..."></div>
        <div class="input-group"><label>Estadísticas</label><button class="btn" id="rollStatsBtn" style="margin-top:0.25rem">🎲 Tirar Dados</button><div id="statsDisplay" style="margin-top:0.5rem;font-size:0.8rem;color:var(--text-muted);text-align:center"></div></div>
        <button class="btn" id="createCharBtn" disabled>⚔️ Continuar</button>
        <button class="btn" id="backToHubBtn" style="background:transparent;border:1px solid var(--border);color:var(--text-muted);margin-top:0.5rem">← Volver</button>
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
        <p style="text-align:center;color:var(--text-muted);margin-bottom:1rem;font-size:0.88rem">${state.character?.name} — ${state.character?.race} ${state.character?.classe}</p>
        <div class="adv-grid">${cards}</div>
    </div>`;
}

function renderChatScreen() {
    return `<div class="game-wrapper">
        <div class="status-bar">
            <button class="menu-btn" id="menuBtn">☰</button>
            <div>❤️ <span id="hpDisplay">${state.gameState.hp}/${state.gameState.maxHp}</span></div>
            <div>📍 <span id="locationDisplay">${state.gameState.location}</span></div>
            <div>🌙 <span id="timeDisplay">${state.gameState.timeOfDay}</span></div>
            <div>🎒 <span id="inventoryDisplay">${state.gameState.inventory.join(', ')||'Vacío'}</span></div>
        </div>
        <div id="menuModal" class="modal hidden"><div class="modal-box">
            <div class="modal-title">Menú — ${state.character?.name}</div>
            <button class="modal-btn" id="newAdventureBtn">🗺️ Nueva Aventura (mismo personaje)</button>
            <button class="modal-btn" id="switchCharBtn">👥 Cambiar Personaje</button>
            <button class="modal-btn" id="manageInventoryBtn">🎒 Gestionar Inventario</button>
            <button class="modal-btn" id="viewLegacyBtn">📜 Ver Legado del Mundo</button>
            <button class="modal-btn danger" id="closeMenuBtn">✕ Cerrar</button>
        </div></div>
        <div id="inventoryModal" class="modal hidden"><div class="modal-box">
            <div class="modal-title">🎒 Inventario</div>
            <div id="inventoryList" class="inv-list"></div>
            <div class="inv-add-row"><input type="text" id="newItemInput" placeholder="Nuevo objeto..." class="inv-input"><button class="modal-btn small" id="addItemBtn">+ Añadir</button></div>
            <button class="modal-btn" id="closeInvBtn" style="margin-top:0.5rem">✓ Cerrar</button>
        </div></div>
        <div id="legacyModal" class="modal hidden"><div class="modal-box" style="max-width:480px">
            <div class="modal-title">📜 Legado del Mundo</div>
            <div id="legacyList" class="legacy-modal-list"></div>
            <button class="modal-btn" id="closeLegacyBtn" style="margin-top:0.5rem">✓ Cerrar</button>
        </div></div>
        <div id="deathModal" class="modal hidden"><div class="modal-box" style="text-align:center">
            <div style="font-size:3rem;margin-bottom:0.5rem">💀</div>
            <div class="modal-title" style="color:#e05555">Tu personaje ha caído</div>
            <div id="deathNote" style="font-size:0.88rem;color:var(--text-muted);margin:0.75rem 0;line-height:1.6"></div>
            <div style="font-size:0.78rem;color:var(--accent);margin-bottom:0.75rem">Su historia quedará grabada en el mundo para siempre.</div>
            <button class="modal-btn" id="deathContinueBtn">Ver el legado y volver</button>
        </div></div>
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
        if (key) { state.apiKey = key; localStorage.setItem('groqApiKey', key); showScreen('characterHub'); }
    });
}

function bindCharacterHub() {
    document.getElementById('newCharBtn').addEventListener('click', () => showScreen('characterCreation'));
    document.querySelectorAll('.char-delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const char = getCharData(id);
            if (!char) return;
            const modal = document.getElementById('deleteModal');
            document.getElementById('deleteModalText').textContent = `¿Eliminar a "${char.name}" (${char.race} ${char.classe})? Esta acción es irreversible.`;
            const input = document.getElementById('deleteConfirmInput');
            const confirmBtn = document.getElementById('deleteConfirmBtn');
            input.value = '';
            confirmBtn.disabled = true;
            input.oninput = () => { confirmBtn.disabled = input.value.trim().toLowerCase() !== 'confirmar'; };
            confirmBtn.onclick = () => {
                const chars = getAllCharacters().filter(c => c.id !== id);
                saveAllCharacters(chars);
                localStorage.removeItem('dndGameState_' + id);
                localStorage.removeItem('dndChatHistory_' + id);
                localStorage.removeItem('dndAdventure_' + id);
                modal.classList.add('hidden');
                showScreen('characterHub');
            };
            document.getElementById('deleteCancelBtn').onclick = () => modal.classList.add('hidden');
            modal.classList.remove('hidden');
        });
    });
    document.querySelectorAll('.char-card:not(.new-char):not(.dead)').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            loadCharacter(id);
            if (!state.adventure && state.chatHistory.length === 0) showScreen('adventureSelection');
            else showScreen('chat');
        });
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

    function checkValidity() { createBtn.disabled = !(nameInput.value.trim() && raceSelect.value && classSelect.value && bgSelect.value && state.tempStats); }
    rollBtn.addEventListener('click', () => {
        const stats = {};
        ['FUE','DES','CON','INT','SAB','CAR'].forEach(ab => {
            const rolls = [1,2,3,4].map(()=>Math.floor(Math.random()*6)+1).sort((a,b)=>a-b).slice(1);
            stats[ab] = rolls.reduce((a,b)=>a+b,0);
        });
        state.tempStats = stats;
        statsDisplay.textContent = Object.entries(stats).map(([ab,v])=>{const m=Math.floor((v-10)/2);return `${ab} ${v} (${m>=0?'+':''}${m})`;}).join(' · ');
        checkValidity();
    });
    [nameInput,raceSelect,classSelect,bgSelect].forEach(el=>el.addEventListener('input',checkValidity));
    document.getElementById('backToHubBtn').addEventListener('click', () => showScreen('characterHub'));
    createBtn.addEventListener('click', () => {
        const id = generateId();
        const conMod = Math.floor((state.tempStats.CON-10)/2);
        const char = {
            id, name: nameInput.value.trim(), race: raceSelect.value, classe: classSelect.value,
            background: bgSelect.value, motivation: document.getElementById('charMotivation').value.trim(),
            gender: document.getElementById('charGender').value,
            stats: state.tempStats, status:'alive', created: new Date().toISOString().slice(0,10)
        };
        updateCharData(char);
        state.activeCharId = id;
        setActiveCharId(id);
        state.character = char;
        const gs = { location:'Taberna de Rurik', timeOfDay:'Tarde', hp:10+conMod, maxHp:10+conMod, inventory:[], quest:'', summary:'', companions:[], relationships:{}, skillUses:{combat:0,magic:0,stealth:0,social:0,nature:0}, classEvolution:'', curse:'' };
        Object.assign(state.gameState, gs);
        state.chatHistory = [];
        state.adventure = null;
        showScreen('adventureSelection');
    });
}

function bindAdventureSelection() {
    document.querySelectorAll('.adv-card').forEach(card => {
        card.addEventListener('click', () => {
            const adv = ADVENTURES.find(a => a.id === card.dataset.id);
            state.adventure = adv;
            state.gameState.location = adv.location;
            state.gameState.quest = adv.id==='free' ? 'Aventura libre' : adv.description;
            state.chatHistory = [];
            saveAdventureFor(state.activeCharId, adv);
            saveGameStateFor(state.activeCharId, state.gameState);
            showScreen('chat');
            const char = state.character;
            const worldEvents = getEventsForLocation(adv.location);
            const worldNote = worldEvents.length > 0 ? `\n\n${worldEvents.map(e=>`Nota del narrador: ${e.event}`).join('\n')}` : '';
            const opener = adv.startScene
                ? `${adv.startScene}${worldNote}\n\nTú eres ${char.name}, ${char.race} ${char.classe}${char.motivation?', '+char.motivation:''}.\n\n¿Qué haces?`
                : `La Taberna de Rurik te recibe. Tú eres ${char.name}, ${char.race} ${char.classe}${char.motivation?', '+char.motivation:''}. Grimbold te mira desde la barra.${worldNote}\n\n¿Qué haces?`;
            addDMMessage(opener, ['Hablar con el tabernero','Explorar el lugar','Buscar una mesa y observar']);
        });
    });
}

function bindChat() {
    const playerInput = document.getElementById('playerInput');
    const sendBtn = document.getElementById('sendBtn');
    renderChat(); updatePartyPanel(); updateStatus();
    playerInput.focus();

    async function sendMessage() {
        const action = playerInput.value.trim();
        if (!action || state.pendingRoll) return;
        playerInput.disabled = true; sendBtn.disabled = true; sendBtn.textContent = '...'; playerInput.value = '';
        const rollTrigger = detectRoll(action);
        const msgIdx = state.chatHistory.length;
        if (rollTrigger) {
            addPlayerMessage(action, null, 'pending', msgIdx);
            state.pendingRoll = { action, trigger: rollTrigger, msgIdx };
            playerInput.disabled = false; sendBtn.disabled = false; sendBtn.textContent = 'Enviar'; playerInput.focus();
        } else {
            addPlayerMessage(action, null, 'done', msgIdx);
            await callAndRespond(action, null);
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    playerInput.addEventListener('keypress', e => { if (e.key==='Enter') sendMessage(); });

    // Menu
    document.getElementById('menuBtn').addEventListener('click', () => document.getElementById('menuModal').classList.toggle('hidden'));
    document.getElementById('closeMenuBtn').addEventListener('click', () => document.getElementById('menuModal').classList.add('hidden'));
    document.getElementById('switchCharBtn').addEventListener('click', () => { document.getElementById('menuModal').classList.add('hidden'); showScreen('characterHub'); });
    document.getElementById('newAdventureBtn').addEventListener('click', () => {
        state.chatHistory = []; state.adventure = null;
        state.gameState.companions = []; state.gameState.relationships = {}; state.gameState.summary = '';
        saveChatHistoryFor(state.activeCharId, []); saveAdventureFor(state.activeCharId, null);
        document.getElementById('menuModal').classList.add('hidden');
        showScreen('adventureSelection');
    });
    document.getElementById('manageInventoryBtn').addEventListener('click', () => {
        document.getElementById('menuModal').classList.add('hidden'); openInventoryModal();
    });
    document.getElementById('viewLegacyBtn').addEventListener('click', () => {
        document.getElementById('menuModal').classList.add('hidden'); openLegacyModal();
    });

    // Inventory
    document.getElementById('closeInvBtn').addEventListener('click', () => document.getElementById('inventoryModal').classList.add('hidden'));
    document.getElementById('addItemBtn').addEventListener('click', () => {
        const input = document.getElementById('newItemInput');
        const item = input.value.trim();
        if (item) { state.gameState.inventory.push(item); input.value = ''; renderInventoryModal(); updateStatus(); saveGameStateFor(state.activeCharId, state.gameState); }
    });
    document.getElementById('newItemInput').addEventListener('keypress', e => { if (e.key==='Enter') document.getElementById('addItemBtn').click(); });

    // Legacy
    document.getElementById('closeLegacyBtn').addEventListener('click', () => document.getElementById('legacyModal').classList.add('hidden'));

    // Death
    document.getElementById('deathContinueBtn').addEventListener('click', () => {
        document.getElementById('deathModal').classList.add('hidden');
        showScreen('characterHub');
    });
}

// ===================== MODALS =====================
function openInventoryModal() {
    document.getElementById('inventoryModal').classList.remove('hidden');
    renderInventoryModal();
}
function renderInventoryModal() {
    const list = document.getElementById('inventoryList');
    if (!list) return;
    list.innerHTML = state.gameState.inventory.length === 0
        ? '<div class="inv-empty">El inventario está vacío</div>'
        : state.gameState.inventory.map((item,i) => `<div class="inv-item"><span>${item}</span><button class="inv-remove" onclick="removeItem(${i})">✕</button></div>`).join('');
}
window.removeItem = function(idx) {
    state.gameState.inventory.splice(idx,1); renderInventoryModal(); updateStatus();
    saveGameStateFor(state.activeCharId, state.gameState);
};

function openLegacyModal() {
    const modal = document.getElementById('legacyModal');
    const list = document.getElementById('legacyList');
    const ws = getWorldState();
    list.innerHTML = ws.events.length === 0
        ? '<div class="inv-empty">Ningún evento ha quedado grabado todavía.</div>'
        : ws.events.slice().reverse().map(e => `
            <div class="legacy-event-detail">
                <div class="legacy-event-header">
                    <span class="legacy-type ${e.type}">${e.type==='death'?'💀':e.type==='heroic'?'⚔️':e.type==='curse'?'🌑':'✦'}</span>
                    <strong>${e.characterName}</strong> — <em>${e.location}</em>
                    <span style="color:var(--text-muted);font-size:0.7rem;margin-left:auto">${e.date||''}</span>
                </div>
                <div class="legacy-event-text">${e.event}</div>
            </div>`).join('');
    modal.classList.remove('hidden');
}

// ===================== DEATH SYSTEM =====================
function triggerDeath(deathNote) {
    const char = state.character;
    char.status = 'dead';
    char.deathNote = deathNote || `Cayó en ${state.gameState.location}`;
    char.classEvolution = state.gameState.classEvolution;
    updateCharData(char);
    saveWorldEvent({
        location: state.gameState.location,
        event: `${char.name}, ${char.race} ${char.classe}, murió aquí. ${deathNote || ''}`,
        characterName: char.name,
        characterRace: char.race,
        characterClass: char.classe,
        type: 'death'
    });
    document.getElementById('deathNote').textContent = deathNote || `${char.name} cayó en ${state.gameState.location}.`;
    document.getElementById('deathModal').classList.remove('hidden');
}

// ===================== CHAT RENDERING =====================
function renderChat() {
    const container = document.getElementById('chatContainer');
    if (!container) return;
    container.innerHTML = '';
    state.chatHistory.forEach((msg,idx) => container.appendChild(createMessageEl(msg,idx)));
    container.scrollTop = container.scrollHeight;
}

function createMessageEl(msg, idx) {
    const wrap = document.createElement('div');
    wrap.setAttribute('data-idx', idx);
    if (msg.role === 'dm') {
        wrap.className = 'message dm';
        wrap.innerHTML = `
            <div class="dm-header"><span class="dm-label">Maestro de Mazmorras</span><span class="dm-location">${msg.location||''} · ${msg.time||''}</span></div>
            <div class="dm-content">${msg.content}</div>
            ${msg.actions?.length ? `<div class="action-chips">${msg.actions.map(a=>`<button class="action-chip" onclick="useAction('${a.replace(/'/g,"\\'").replace(/"/g,'\\"')}')">↗ ${a}</button>`).join('')}</div>` : ''}`;
    } else {
        wrap.className = 'message player';
        let rollHtml = '';
        if (msg.rollState==='pending' && !msg.roll && state.pendingRoll?.trigger) {
            const t = state.pendingRoll.trigger;
            const mod = Math.floor(((state.character?.stats[t.stat]||10)-10)/2);
            rollHtml = `<div class="roll-pending"><span class="roll-skill">${t.skill}</span><span class="roll-mod">${mod>=0?'+':''}${mod}</span><span class="roll-dc">DC ${t.dc}</span><button class="roll-btn" onclick="executeRoll(${idx})">→ Tirar</button></div>`;
        } else if (msg.roll) {
            rollHtml = `<div class="roll-badge ${msg.roll.success?'success':'failure'}">${msg.roll.skill} · ${msg.roll.success?'Éxito':'Fallo'} (${msg.roll.total})</div>`;
        }
        wrap.innerHTML = `<div class="player-action">${msg.content}</div>${rollHtml}`;
    }
    return wrap;
}

function addDMMessage(content, actions) {
    const msg = { role:'dm', content, actions:actions||[], location:state.gameState.location, time:state.gameState.timeOfDay };
    state.chatHistory.push(msg);
    const container = document.getElementById('chatContainer');
    if (container) { container.appendChild(createMessageEl(msg, state.chatHistory.length-1)); container.scrollTop = container.scrollHeight; }
}
function addPlayerMessage(content, roll, rollState, idx) {
    const msg = { role:'player', content, roll, rollState };
    state.chatHistory.push(msg);
    const container = document.getElementById('chatContainer');
    if (container) { container.appendChild(createMessageEl(msg, idx)); container.scrollTop = container.scrollHeight; }
}

function updateStatus() {
    const el = id => document.getElementById(id);
    if (el('hpDisplay')) el('hpDisplay').textContent = `${state.gameState.hp}/${state.gameState.maxHp}`;
    if (el('locationDisplay')) el('locationDisplay').textContent = state.gameState.location;
    if (el('timeDisplay')) el('timeDisplay').textContent = state.gameState.timeOfDay;
    if (el('inventoryDisplay')) el('inventoryDisplay').textContent = state.gameState.inventory.join(', ')||'Vacío';
}

function updatePartyPanel() {
    const panel = document.getElementById('partyPanel');
    if (!panel || !state.character) return;
    const char = state.character;
    const hpPct = Math.max(0, Math.min(100, (state.gameState.hp/state.gameState.maxHp)*100));
    const hpColor = hpPct>60?'#4a7c59':hpPct>30?'#8a6a20':'#7c4a4a';
    const classLabel = state.gameState.classEvolution || `${char.race} ${char.classe}`;
    const curseHtml = state.gameState.curse ? `<div class="curse-badge">🌑 ${state.gameState.curse}</div>` : '';
    const companionHtml = (state.gameState.companions||[]).map(c => {
        const cp = Math.max(0,Math.min(100,(c.hp/c.maxHp)*100));
        const rel = state.gameState.relationships?.[c.name];
        const relBadge = rel && rel.type !== 'neutral' ? `<span class="rel-badge rel-${rel.type}">${rel.type==='romantic'?'💕':rel.type==='friend'?'🤝':rel.type==='rival'?'⚔️':'👤'} ${rel.type}</span>` : '';
        return `<div class="companion-card">
            <div class="companion-avatar">${c.icon||'👤'}</div>
            <div class="companion-info">
                <div class="companion-name">${c.name} ${relBadge}</div>
                <div class="companion-role">${c.role||''}</div>
                ${c.description ? `<div class="companion-desc">${c.description}</div>` : ''}
                <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${cp}%;background:${cp>60?'#4a7c59':cp>30?'#8a6a20':'#7c4a4a'}"></div></div>
                <div class="hp-text">PV ${c.hp}/${c.maxHp}</div>
            </div>
        </div>`;
    }).join('');
    panel.innerHTML = `<div class="party-card">
        <div class="party-avatar">${CLASS_ICONS[char.classe]||'⚔️'}</div>
        <div class="party-name">${char.name}</div>
        <div class="party-class">${classLabel}</div>
        ${curseHtml}
        <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${hpPct}%;background:${hpColor}"></div></div>
        <div class="hp-text">PV ${state.gameState.hp} / ${state.gameState.maxHp}</div>
        <div class="stats-mini">${Object.entries(char.stats).map(([ab,v])=>{const m=Math.floor((v-10)/2);return `<div class="stat-mini"><span class="stat-label">${ab}</span><span class="stat-val">${v}</span><span class="stat-mod">${m>=0?'+':''}${m}</span></div>`;}).join('')}</div>
        <div class="party-bg">${char.background}${char.motivation?(' · '+char.motivation.substring(0,28)):''}</div>
    </div>
    ${companionHtml ? `<div class="companions-section"><div class="companions-label">Compañeros</div>${companionHtml}</div>` : ''}
    ${Object.entries(state.gameState.relationships||{}).filter(([k])=>!(state.gameState.companions||[]).find(c=>c.name===k)).length > 0 ? `
    <div class="companions-section">
        <div class="companions-label">Relaciones</div>
        ${Object.entries(state.gameState.relationships||{}).filter(([k])=>!(state.gameState.companions||[]).find(c=>c.name===k)).map(([name,rel])=>`
        <div class="rel-npc-row">
            <span class="rel-badge rel-${rel.type}">${rel.type==='romantic'?'💕':rel.type==='friend'?'🤝':rel.type==='rival'?'⚔️':'👤'}</span>
            <span class="rel-npc-name">${name}</span>
            <span class="rel-level">${'★'.repeat(rel.level||0)}${'☆'.repeat(5-(rel.level||0))}</span>
        </div>`).join('')}
    </div>` : ''}`;
}

// ===================== API =====================
async function callAndRespond(action, rollResult) {
    const playerInput = document.getElementById('playerInput');
    const sendBtn = document.getElementById('sendBtn');
    const typingEl = document.createElement('div');
    typingEl.className = 'typing-indicator'; typingEl.id = 'typingIndicator';
    typingEl.textContent = 'El Maestro de Mazmorras narra...';
    const container = document.getElementById('chatContainer');
    if (container) { container.appendChild(typingEl); container.scrollTop = container.scrollHeight; }

    try {
        const response = await callGroqApi(action, rollResult);
        const { narration, stateUpdates, actions, legacy, deathNarration } = parseLlmResponse(response);
        document.getElementById('typingIndicator')?.remove();

        if (stateUpdates) {
            Object.assign(state.gameState, stateUpdates);
            if (!state.gameState.companions) state.gameState.companions = [];
            if (!state.gameState.relationships) state.gameState.relationships = {};
        }

        if (legacy) saveWorldEvent({ ...legacy, characterName: state.character.name, characterRace: state.character.race, characterClass: state.character.classe });

        addDMMessage(narration, actions);
        updateStatus(); updatePartyPanel();

        // Check for death
        if (state.gameState.hp <= 0) {
            saveChatHistoryFor(state.activeCharId, state.chatHistory);
            saveGameStateFor(state.activeCharId, state.gameState);
            triggerDeath(deathNarration || `${state.character.name} cayó en ${state.gameState.location}.`);
            return;
        }

        // Check for curse
        if (state.gameState.curse && state.character.status !== 'cursed') {
            state.character.status = 'cursed';
            updateCharData(state.character);
            saveWorldEvent({ location: state.gameState.location, event: `${state.character.name}, ${state.character.race} ${state.character.classe}, fue maldito aquí. Maldición: ${state.gameState.curse}.`, characterName: state.character.name, characterRace: state.character.race, characterClass: state.character.classe, type: 'curse' });
        }

        state.turnCount++;
        if (state.turnCount % 10 === 0) await summarizeContext();
        saveChatHistoryFor(state.activeCharId, state.chatHistory);
        saveGameStateFor(state.activeCharId, state.gameState);
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
    const fmod = ab => { const m=Math.floor((stats[ab]-10)/2); return (m>=0?'+':'')+m; };
    const statMap = { 'Ataque':'FUE','Carisma':'CAR','Intimidación':'CAR','Sigilo':'DES','Hurto':'DES','Magia':'INT','Conocimiento':'INT','Investigación':'SAB','Medicina':'SAB' };
    let rollSection = '';
    if (rollResult) {
        const ab = statMap[rollResult.skill]||'SAB';
        rollSection = `\nTIRADA: ${rollResult.skill} — d20(${rollResult.roll}) ${fmod(ab)} = ${rollResult.total} vs DC ${rollResult.dc} → ${rollResult.success?'ÉXITO':'FALLO'}`;
    }
    const worldEvents = getEventsForLocation(state.gameState.location);
    const worldSection = worldEvents.length > 0 ? `\nHISTORIA DEL MUNDO EN ESTA ZONA:\n${worldEvents.map(e=>`- ${e.event}`).join('\n')}` : '';
    const companions = (state.gameState.companions||[]).map(c=>`- ${c.name} (${c.role||'aliado'}, PV ${c.hp}/${c.maxHp})`).join('\n')||'ninguno';
    const rels = Object.entries(state.gameState.relationships||{}).map(([k,v])=>`- ${k}: ${v.type} (nivel ${v.level}/5)`).join('\n')||'ninguna';
    const curseNote = state.gameState.curse ? `\nMALDICIÓN ACTIVA: ${state.gameState.curse}` : '';
    const classLabel = state.gameState.classEvolution ? `${char.classe} (evolucionando: ${state.gameState.classEvolution})` : char.classe;

    const system = `Eres el Maestro de Mazmorras de una campaña de D&D en un mundo de fantasía oscura medieval. Narras en segunda persona con prosa cinematográfica.

PERSONAJE:
- ${char.name}, ${char.race}, ${classLabel}, ${char.gender||''}${char.gender ? ',' : ''} trasfondo: ${char.background}${char.motivation?', motivación: '+char.motivation:''}
- FUE ${stats.FUE}(${fmod('FUE')}), DES ${stats.DES}(${fmod('DES')}), CON ${stats.CON}(${fmod('CON')}), INT ${stats.INT}(${fmod('INT')}), SAB ${stats.SAB}(${fmod('SAB')}), CAR ${stats.CAR}(${fmod('CAR')})
${curseNote}

ESTADO:
- Ubicación: ${state.gameState.location} | Hora: ${state.gameState.timeOfDay}
- HP: ${state.gameState.hp}/${state.gameState.maxHp}
- Inventario: ${state.gameState.inventory.join(', ')||'vacío'}
- Misión: ${state.gameState.quest}
- Contexto: ${state.gameState.summary||'inicio'}
- Compañeros: ${companions}
- Relaciones: ${rels}
${worldSection}${rollSection}

INSTRUCCIONES:
- 150-350 palabras, prosa rica con detalles sensoriales.
- NPCs con nombres y personalidad consistente. Los eventos del mundo son REALES y visibles (estatuas, tumbas, ruinas de batallas anteriores).
- Si hay historia del mundo en esta zona, inclúyela naturalmente en la narración (el personaje puede ver, tocar o preguntar sobre esos vestigios).
- Romance, seducción y relaciones pueden desarrollarse naturalmente.
- Si el jugador muere (hp=0), narra una muerte épica. Si hay una maldición significativa, descríbela.
- Termina en momento de decisión.

Al final, en ESTE ORDEN exacto:
[ACTIONS: ["acción 1", "acción 2", "acción 3"]]
[STATE: {"hp":N,"location":"X","timeOfDay":"X","inventory":[],"quest":"X","summary":"2 frases","companions":[],"relationships":{},"curse":""}]
Si ocurre algo épico o permanente (muerte heroica, maldición, derrota de monstruo mayor, descubrimiento importante):
[LEGACY: {"location":"nombre exacto","event":"descripción en tercera persona de qué ocurrió y qué quedó en el lugar","type":"death/heroic/curse/discovery"}]`;

    return { system, user: playerAction };
}

async function callGroqApi(playerAction, rollResult) {
    const { system, user } = buildPrompt(playerAction, rollResult);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json','Authorization':`Bearer ${state.apiKey}` },
        body: JSON.stringify({ model:'llama-3.3-70b-versatile', messages:[{role:'system',content:system},{role:'user',content:user}], temperature:0.85, max_tokens:1000 })
    });
    if (!response.ok) { const e = await response.text(); throw new Error(`Groq ${response.status}: ${e}`); }
    const data = await response.json();
    return data.choices[0].message.content;
}

function parseLlmResponse(response) {
    let narration = response;
    let stateUpdates = null, actions = [], legacy = null, deathNarration = null;

    const actionsMatch = response.match(/\[ACTIONS:\s*(\[[\s\S]*?\])\]/);
    if (actionsMatch) { try { actions = JSON.parse(actionsMatch[1]); } catch(e) {} narration = narration.replace(actionsMatch[0],'').trim(); }

    const stateMatch = response.match(/\[STATE:\s*(\{[\s\S]*?\})\]/);
    if (stateMatch) { try { stateUpdates = JSON.parse(stateMatch[1]); } catch(e) {} narration = narration.replace(stateMatch[0],'').trim(); }

    const legacyMatch = response.match(/\[LEGACY:\s*(\{[\s\S]*?\})\]/);
    if (legacyMatch) { try { legacy = JSON.parse(legacyMatch[1]); } catch(e) {} narration = narration.replace(legacyMatch[0],'').trim(); }

    if (stateUpdates?.hp <= 0) {
        deathNarration = narration.split('\n\n').slice(-1)[0] || narration.slice(-200);
    }

    return { narration, stateUpdates, actions, legacy, deathNarration };
}

async function summarizeContext() {
    const text = state.chatHistory.slice(-16).map(m=>`${m.role==='dm'?'DM':'Jugador'}: ${m.content}`).join('\n');
    try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method:'POST',
            headers:{ 'Content-Type':'application/json','Authorization':`Bearer ${state.apiKey}` },
            body: JSON.stringify({ model:'llama-3.3-70b-versatile', messages:[{role:'user',content:`Resume en 2 frases los eventos clave de esta sesión de D&D:\n\n${text}`}], temperature:0.3, max_tokens:120 })
        });
        const d = await r.json();
        state.gameState.summary = d.choices[0].message.content.trim();
        if (state.chatHistory.length > 30) state.chatHistory = state.chatHistory.slice(-20);
    } catch(e) { console.warn(e); }
}

init();
