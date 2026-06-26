// ===== iOS SCROLL/ZOOM FIX =====
(function(){
    // Prevent iOS from zooming on input focus by ensuring viewport is correct
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
    // Disable scroll restoration so reload doesn't jump
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
})();

// ===================== CONSTANTS =====================

// ===================== FIREBASE =====================
let fbApp = null, fbDb = null, fbAuth = null, fbUser = null;

async function loadFirebaseSDK() {
    if (typeof firebase !== 'undefined') return;
    const urls = [
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js'
    ];
    for (const url of urls) {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url; s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }
}

function initFirebase(config) {
    if (fbApp) return;
    fbApp = firebase.initializeApp(config);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
}

async function syncFromFirestore() {
    if (!fbDb || !fbUser) return;
    const uid = fbUser.uid;
    try {
        const dataDoc = await fbDb.doc(`users/${uid}/data/main`).get();
        if (dataDoc.exists) {
            const d = dataDoc.data();
            // Merge: combine Firestore chars + local chars, avoiding duplicates by id
            const fsChars = d.characters || [];
            const localChars = getAllCharacters();
            if (fsChars.length > 0) {
                const merged = [...fsChars];
                for (const lc of localChars) {
                    if (!merged.find(c => c.id === lc.id)) merged.push(lc);
                }
                localStorage.setItem('dndCharacters', JSON.stringify(merged));
            }
            if (d.worldState) {
                // Merge world events too
                const fsWs = d.worldState;
                const localWs = getWorldState();
                const allEvents = [...(fsWs.events||[])];
                for (const ev of (localWs.events||[])) {
                    if (!allEvents.find(e => e.id === ev.id)) allEvents.push(ev);
                }
                localStorage.setItem('dndWorldState', JSON.stringify({ events: allEvents }));
            }
        } else {
            // Firestore empty — push all local data up
            const localChars = getAllCharacters();
            if (localChars.length > 0) {
                await fbDb.doc(`users/${uid}/data/main`).set({
                    characters: localChars,
                    worldState: getWorldState(),
                    updatedAt: new Date().toISOString()
                });
                // Push each character's game data
                for (const char of localChars) {
                    const gs = getGameState(char.id);
                    if (gs) await fbDb.doc(`users/${uid}/gameStates/${char.id}`).set(gs);
                    const adv = getAdventure(char.id);
                    if (adv) await fbDb.doc(`users/${uid}/adventures/${char.id}`).set(adv);
                    const ch = getChatHistory(char.id);
                    if (ch.length) await fbDb.doc(`users/${uid}/chatHistory/${char.id}`).set({ messages: ch });
                }
            }
        }
        // Pull per-character data from Firestore
        const chars = getAllCharacters();
        for (const char of chars) {
            const gsDoc = await fbDb.doc(`users/${uid}/gameStates/${char.id}`).get();
            if (gsDoc.exists) localStorage.setItem('dndGameState_' + char.id, JSON.stringify(gsDoc.data()));
            const advDoc = await fbDb.doc(`users/${uid}/adventures/${char.id}`).get();
            if (advDoc.exists) localStorage.setItem('dndAdventure_' + char.id, JSON.stringify(advDoc.data()));
            const chDoc = await fbDb.doc(`users/${uid}/chatHistory/${char.id}`).get();
            if (chDoc.exists && chDoc.data().messages) localStorage.setItem('dndChatHistory_' + char.id, JSON.stringify(chDoc.data().messages));
        }
    } catch(e) { console.error('Firestore sync error:', e); }
}

async function fsSaveMain() {
    if (!fbDb || !fbUser) return;
    try {
        await fbDb.doc(`users/${fbUser.uid}/data/main`).set({
            characters: getAllCharacters(),
            worldState: getWorldState(),
            updatedAt: new Date().toISOString()
        });
    } catch(e) { console.error('FS save error:', e); }
}
async function fsSaveGameState(id, gs) {
    if (!fbDb || !fbUser) return;
    try { await fbDb.doc(`users/${fbUser.uid}/gameStates/${id}`).set(gs); } catch(e) {}
}
async function fsSaveChatHistory(id, ch) {
    if (!fbDb || !fbUser) return;
    try { await fbDb.doc(`users/${fbUser.uid}/chatHistory/${id}`).set({ messages: ch }); } catch(e) {}
}
async function fsSaveAdventure(id, adv) {
    if (!fbDb || !fbUser) return;
    try { await fbDb.doc(`users/${fbUser.uid}/adventures/${id}`).set(adv); } catch(e) {}
}
async function fsDeleteCharacter(id) {
    if (!fbDb || !fbUser) return;
    const uid = fbUser.uid;
    try {
        await fbDb.doc(`users/${uid}/gameStates/${id}`).delete();
        await fbDb.doc(`users/${uid}/chatHistory/${id}`).delete();
        await fbDb.doc(`users/${uid}/adventures/${id}`).delete();
    } catch(e) {}
}

// ===== MODULE LOADER =====
// Loads satellite JS files in order before calling init.
(function loadModules() {
    var modules = ['constants.js', 'rolls.js', 'npc.js', 'ai.js', 'ui.js'];
    var idx = 0;
    function next() {
        if (idx >= modules.length) {
            loadFirebaseSDK().then(function(){ init(); }).catch(function(){ init(); });
            return;
        }
        var s = document.createElement('script');
        s.src = modules[idx++];
        s.onload = next;
        s.onerror = function() { console.error('Failed:', s.src); next(); };
        document.head.appendChild(s);
    }
    next();
})();
// ==========================

const state = {
    apiKey: null,
    activeCharId: null,
    character: null,
    adventure: null,
    gameState: {
        location:'Taberna de Rurik', timeOfDay:'Tarde',
        hp:0, maxHp:0, inventory:[], quest:'', summary:'',
        companions:[], relationships:{}, npcs:[],
        knowledges:[], learnedAbilities:[],
        skillUses:{ combat:0, magic:0, stealth:0, social:0, nature:0 },
        classEvolution:'', curse:''
    },
    chatHistory: [],
    turnCount: 0,
    pendingRoll: null
};

// Debug configuration
const DEBUG_IA_COMMUNICATION = false; // Set to true to enable debug logging

const appDiv = document.getElementById('app');



// ===================== INIT =====================
async function init() {
    const fbConfig = localStorage.getItem('fbConfig');
    if (!fbConfig) { showScreen('firebaseSetup'); return; }
    try { initFirebase(JSON.parse(fbConfig)); } catch(e) { localStorage.removeItem('fbConfig'); showScreen('firebaseSetup'); return; }

    // Inject CSS for roll badges
    const style = document.createElement('style');
    style.textContent = `
        .roll-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.85rem;
            margin: 4px 0;
        }
        .roll-badge.success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .roll-badge.failure {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    `;
    document.head.appendChild(style);

    // If Firebase SDK didn't load (fbAuth is null), skip auth and sync
    if (fbAuth !== null) {
        await new Promise(resolve => {
            const unsub = fbAuth.onAuthStateChanged(user => { unsub(); fbUser = user; resolve(); });
        });
        if (!fbUser) { showScreen('auth'); return; }

        const loadingEl = document.createElement('div');
        loadingEl.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0d0a07;color:#c9a84c;font-family:Cinzel,serif;font-size:1rem;letter-spacing:0.1em';
        loadingEl.textContent = 'Sincronizando...';
        document.body.appendChild(loadingEl);
        await syncFromFirestore();
        loadingEl.remove();
    } else {
        // Firebase not available, continue with localStorage only
        // No need to set fbUser; we'll just skip sync.
    }

    state.apiKey = localStorage.getItem('groqApiKey');
    if (!state.apiKey) { showScreen('apiKey'); return; }
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
    // Ensure character has experience, level, and skillPoints fields for backward compatibility
    if (!state.character.hasOwnProperty('experience')) state.character.experience = 0;
    if (!state.character.hasOwnProperty('level')) state.character.level = 1;
    if (!state.character.hasOwnProperty('skillPoints')) state.character.skillPoints = 0;
    // Migrate: ensure knowledges and learnedAbilities exist in gameState
    if (!Array.isArray(state.gameState.knowledges)) {
        const starting = CLASS_STARTING_KNOWLEDGE[state.character.classe] || { knowledges:[], learnedAbilities:[] };
        state.gameState.knowledges = starting.knowledges.map(k=>({...k}));
    }
    if (!Array.isArray(state.gameState.learnedAbilities)) {
        const starting = CLASS_STARTING_KNOWLEDGE[state.character.classe] || { knowledges:[], learnedAbilities:[] };
        state.gameState.learnedAbilities = starting.learnedAbilities.map(a=>({...a}));
    }
    // Migrate: ensure equipped slots exist
    if (!state.gameState.equipped) {
        const defaultOutfit = CLASS_DEFAULT_OUTFIT[state.character.classe] || { ropa:'', arma:'', offhand:'', accesorio:'' };
        state.gameState.equipped = { ...defaultOutfit };
    }
    state.chatHistory = getChatHistory(charId);
    state.adventure = getAdventure(charId);
    state.turnCount = 0;
    state.pendingRoll = null;
}

function showScreen(name) {
    appDiv.innerHTML = '';
    switch(name) {
        case 'firebaseSetup': appDiv.innerHTML = renderFirebaseSetupScreen(); bindFirebaseSetupScreen(); break;
        case 'auth': appDiv.innerHTML = renderAuthScreen(); bindAuthScreen(); break;
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
        const portraitUrl = getPortraitUrl(c, 200);
        return `<div class="char-card ${isDead?'dead':''}" data-id="${c.id}" ${isDead?'':'style="cursor:pointer"'}>
            <div class="char-card-avatar-wrap">
                <img src="${isDead ? '' : portraitUrl}" class="char-card-portrait" alt="${c.name}" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
                <div class="char-avatar-fallback" style="${isDead?'display:flex':'display:none'}">${isDead?'🪦':icon}</div>
            </div>
            <div class="char-card-info">
                <div class="char-card-name">${c.name} ${statusBadge}</div>
                <div class="char-card-class">${c.race} · ${c.classe}${c.classEvolution?' → '+c.classEvolution:''}</div>
                ${isDead ? `<div class="char-death-note">${c.deathNote || 'Cayó en combate'}</div>` : `
                <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${hpPct}%;background:${hpColor}"></div></div>
                <div class="char-adv">${adv ? adv.title : 'Sin aventura'} · ${history.length} turnos</div>`}
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
        <div class="input-group"><label>Descripción física (para generar retrato)</label><textarea id="charAppearance" rows="2" placeholder="Ej: cabello negro largo, ojos grises, cicatriz en la mejilla, complexión atlética..." style="background:var(--input-bg);border:1px solid var(--border);color:var(--input-text);padding:0.6rem 0.75rem;border-radius:4px;font-size:0.9rem;font-family:'Lora',serif;resize:vertical"></textarea></div>
        <div class="input-group">
            <label>👗 Ropa y equipo inicial</label>
            <p style="font-size:0.75rem;color:var(--text-muted);margin:0.25rem 0 0.5rem">Elige tu clase primero — aparecerá una sugerencia. Puedes editarla.</p>
            <div style="display:grid;gap:0.4rem">
                <div style="display:flex;align-items:center;gap:0.5rem">
                    <span style="min-width:80px;font-size:0.78rem;color:var(--text-muted)">👘 Ropa:</span>
                    <input type="text" id="outfitRopa" placeholder="Ej: túnica de viajero, capa marrón..." style="flex:1;background:var(--input-bg);border:1px solid var(--border);color:var(--input-text);padding:0.4rem 0.6rem;border-radius:4px;font-size:0.82rem;font-family:'Lora',serif">
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem">
                    <span style="min-width:80px;font-size:0.78rem;color:var(--text-muted)">⚔️ Arma:</span>
                    <input type="text" id="outfitArma" placeholder="Ej: espada de una mano, arco largo..." style="flex:1;background:var(--input-bg);border:1px solid var(--border);color:var(--input-text);padding:0.4rem 0.6rem;border-radius:4px;font-size:0.82rem;font-family:'Lora',serif">
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem">
                    <span style="min-width:80px;font-size:0.78rem;color:var(--text-muted)">🛡️ Mano 2:</span>
                    <input type="text" id="outfitOffhand" placeholder="Ej: escudo, segunda daga..." style="flex:1;background:var(--input-bg);border:1px solid var(--border);color:var(--input-text);padding:0.4rem 0.6rem;border-radius:4px;font-size:0.82rem;font-family:'Lora',serif">
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem">
                    <span style="min-width:80px;font-size:0.78rem;color:var(--text-muted)">💍 Accesorio:</span>
                    <input type="text" id="outfitAccesorio" placeholder="Ej: amuleto, bolsa de hierbas..." style="flex:1;background:var(--input-bg);border:1px solid var(--border);color:var(--input-text);padding:0.4rem 0.6rem;border-radius:4px;font-size:0.82rem;font-family:'Lora',serif">
                </div>
            </div>
        </div>
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
        <div style="text-align:center;margin-top:0.75rem"><button class="btn" id="backFromAdvBtn" style="background:transparent;border:1px solid var(--border);color:var(--text-muted);width:auto;padding:0.5rem 1.5rem;font-size:0.82rem">← Volver</button></div>
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
            <div>⚔️ <span id="levelDisplay">Nivel 1 (0/100 XP)</span></div>
        </div>
        <div id="menuModal" class="modal hidden"><div class="modal-box">
            <div class="modal-title">Menú — ${state.character?.name}</div>
            <button class="modal-btn" id="partyMenuBtn">👥 Party & Compañeros</button>
            <button class="modal-btn" id="npcMenuBtn">🎭 Personajes Conocidos</button>
            <button class="modal-btn" id="newAdventureBtn">🗺️ Nueva Aventura (mismo personaje)</button>
            <button class="modal-btn" id="switchCharBtn">🔄 Cambiar Personaje</button>
            <button class="modal-btn" id="manageInventoryBtn">🎒 Gestionar Inventario</button>
            <button class="modal-btn" id="knowledgeMenuBtn">📖 Conocimientos y Habilidades</button>
            <button class="modal-btn" id="viewLegacyBtn">📜 Ver Legado del Mundo</button>
            <button class="modal-btn" id="viewMemoryBtn">🧠 Ver Memoria de la Historia</button>
            <button class="modal-btn" id="logoutBtn">🚪 Cerrar Sesión</button>
            <button class="modal-btn danger" id="closeMenuBtn">✕ Cerrar</button>
        </div></div>
        <div id="inventoryModal" class="modal hidden"><div class="modal-box" style="max-width:520px">
            <div class="modal-title">🎒 Inventario</div>
            <div class="equipped-slots" id="equippedSlots"></div>
            <div style="margin:0.5rem 0;font-size:0.75rem;color:var(--text-muted);font-family:'Cinzel',serif;letter-spacing:0.05em">MOCHILA</div>
            <div id="inventoryList" class="inv-list"></div>
            <button class="modal-btn" id="closeInvBtn" style="margin-top:0.5rem">✓ Cerrar</button>
        </div></div>
        <div id="knowledgeModal" class="modal hidden">
            <div class="modal-box" style="max-width:520px;max-height:80vh;overflow-y:auto">
                <div class="modal-title">📖 Conocimientos y Habilidades</div>
                <div id="knowledgeModalContent"></div>
                <button class="modal-btn" id="closeKnowledgeBtn" style="margin-top:0.75rem">✓ Cerrar</button>
            </div>
        </div>
        <div id="legacyModal" class="modal hidden"><div class="modal-box" style="max-width:480px">
            <div class="modal-title">📜 Legado del Mundo</div>
            <div id="legacyList" class="legacy-modal-list"></div>
            <button class="modal-btn" id="closeLegacyBtn" style="margin-top:0.5rem">✓ Cerrar</button>
        </div></div>
        <div id="memoryModal" class="modal hidden"><div class="modal-box" style="max-width:520px;max-height:80vh;overflow-y:auto">
            <div class="modal-title">🧠 Memoria de la Historia</div>
            <div id="memoryModalContent" style="font-size:0.82rem;color:var(--text-muted);line-height:1.7"></div>
            <button class="modal-btn" id="closeMemoryBtn" style="margin-top:0.75rem">✓ Cerrar</button>
        </div></div>
        <div id="deathModal" class="modal hidden"><div class="modal-box" style="text-align:center">
            <div style="font-size:3rem;margin-bottom:0.5rem">💀</div>
            <div class="modal-title" style="color:#e05555">Tu personaje ha caído</div>
            <div id="deathNote" style="font-size:0.88rem;color:var(--text-muted);margin:0.75rem 0;line-height:1.6"></div>
            <div style="font-size:0.78rem;color:var(--accent);margin-bottom:0.75rem">Su historia quedará grabada en el mundo para siempre.</div>
            <button class="modal-btn" id="deathContinueBtn">Ver el legado y volver</button>
        </div></div>
        <div id="companionChatModal" class="modal hidden">
            <div class="modal-box companion-chat-box">
                <div class="companion-chat-header" id="companionChatHeader">
                    <div class="companion-chat-portrait-wrap">
                        <img id="companionChatPortrait" src="" class="companion-chat-portrait" loading="lazy">
                    </div>
                    <div class="companion-chat-title-wrap">
                        <div class="companion-chat-name" id="companionChatName"></div>
                        <div class="companion-chat-role" id="companionChatRole"></div>
                    </div>
                    <button class="companion-chat-close" id="closeCompanionChatBtn">✕</button>
                </div>
                <div class="companion-chat-messages" id="companionChatMessages"></div>
                <div class="companion-chat-input-row">
                    <input type="text" id="companionChatInput" placeholder="Habla con este personaje..." class="inv-input">
                    <button class="modal-btn small" id="companionChatSendBtn">Enviar</button>
                </div>
            </div>
        </div>
        <div id="partyModal" class="modal hidden">
            <div class="modal-box party-modal-box">
                <div class="modal-title">👥 Party</div>
                <div id="partyModalContent"></div>
                <button class="modal-btn" id="closePartyModalBtn" style="margin-top:0.5rem">✕ Cerrar</button>
            </div>
        </div>
        <div id="npcModal" class="modal hidden">
            <div class="modal-box npc-modal-box">
                <div class="modal-title">🎭 Personajes Conocidos</div>
                <div id="npcModalContent"></div>
                <button class="modal-btn" id="closeNpcModalBtn" style="margin-top:0.5rem">✕ Cerrar</button>
            </div>
        </div>
        <div class="game-layout">
            <div class="chat-area">
                <div class="chat-container" id="chatContainer"></div>
                <div class="input-area">
                    <input type="text" id="playerInput" placeholder="¿Qué haces?" autocomplete="off">
                    <button class="btn" id="sendBtn">Enviar</button>
                </div>
                <div class="memory-bar">
                    <span id="memoryIndicator" style="cursor:pointer" onclick="openMemoryModal()">💬 0 turnos en memoria</span>
                </div>
            </div>
            <aside class="party-panel" id="partyPanel"></aside>
        </div>
    </div>`;
}



// ===================== FIREBASE SCREENS =====================
function renderFirebaseSetupScreen() {
    return `<div class="container">
        <h1>Rurik Tavern</h1>
        <p style="text-align:center;color:var(--text-muted);margin-bottom:1rem;font-size:0.88rem">Configura Firebase para sincronizar personajes entre dispositivos.</p>
        <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:1rem;margin-bottom:1.25rem;font-size:0.82rem;color:var(--text-muted);line-height:1.9">
            <strong style="color:var(--accent)">Configuración inicial (5 min, gratis):</strong><br>
            1. Ve a <strong style="color:#fff">console.firebase.google.com</strong><br>
            2. Crea un proyecto → agrega una <strong style="color:#fff">app web</strong><br>
            3. Copia el objeto <strong style="color:#fff">firebaseConfig</strong><br>
            4. En Authentication → Sign-in method → activa <strong style="color:#fff">Email/Contraseña</strong><br>
            5. En Firestore Database → crea base de datos (modo prueba)
        </div>
        <div class="input-group">
            <label>Pega tu firebaseConfig (JSON)</label>
            <textarea id="fbConfigInput" rows="7" placeholder='{"apiKey":"AIza...","authDomain":"tu-proyecto.firebaseapp.com","projectId":"tu-proyecto","storageBucket":"tu-proyecto.appspot.com","messagingSenderId":"123...","appId":"1:123..."}' style="background:var(--input-bg);border:1px solid var(--border);color:var(--input-text);padding:0.6rem 0.75rem;border-radius:4px;font-size:0.75rem;font-family:monospace;resize:vertical;width:100%;box-sizing:border-box"></textarea>
        </div>
        <button class="btn" id="fbSetupBtn">Conectar Firebase</button>
        <div id="fbSetupError" style="color:#e05555;font-size:0.82rem;text-align:center;margin-top:0.5rem;display:none"></div>
    </div>`;
}

function renderAuthScreen() {
    return `<div class="container">
        <h1>Rurik Tavern</h1>
        <div style="display:flex;gap:0.5rem;margin-bottom:1.25rem">
            <button class="btn" id="tabLogin" style="flex:1">Iniciar Sesión</button>
            <button class="btn" id="tabRegister" style="flex:1;background:transparent;border:1px solid var(--border);color:var(--text-muted)">Registrarse</button>
        </div>
        <div id="authLoginForm">
            <div class="input-group"><label>Email</label><input type="email" id="loginEmail" placeholder="tu@email.com" autocomplete="email"></div>
            <div class="input-group"><label>Contraseña</label><input type="password" id="loginPassword" placeholder="••••••••" autocomplete="current-password"></div>
            <button class="btn" id="loginBtn">Entrar</button>
        </div>
        <div id="authRegisterForm" style="display:none">
            <div class="input-group"><label>Email</label><input type="email" id="regEmail" placeholder="tu@email.com" autocomplete="email"></div>
            <div class="input-group"><label>Contraseña (mín. 6 caracteres)</label><input type="password" id="regPassword" placeholder="••••••••" autocomplete="new-password"></div>
            <button class="btn" id="registerBtn">Crear Cuenta</button>
        </div>
        <div id="authError" style="color:#e05555;font-size:0.82rem;text-align:center;margin-top:0.5rem;display:none"></div>
        <button id="resetFbBtn" style="background:none;border:none;color:var(--text-muted);font-size:0.75rem;cursor:pointer;margin-top:1.5rem;display:block;text-align:center;width:100%">Cambiar configuración Firebase</button>
    </div>`;
}

function bindFirebaseSetupScreen() {
    document.getElementById('fbSetupBtn').addEventListener('click', () => {
        const raw = document.getElementById('fbConfigInput').value.trim();
        const errEl = document.getElementById('fbSetupError');
        errEl.style.display = 'none';
        let config;
        try {
            // Accept both raw JS object notation and JSON
            config = JSON.parse(raw.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":'));
            if (!config.apiKey || !config.projectId) throw new Error('Faltan campos');
        } catch(e) {
            errEl.textContent = 'JSON inválido. Asegúrate de copiar el objeto completo.';
            errEl.style.display = 'block';
            return;
        }
        try {
            localStorage.setItem('fbConfig', JSON.stringify(config));
            initFirebase(config);
            showScreen('auth');
        } catch(e) {
            errEl.textContent = 'Error al inicializar Firebase: ' + e.message;
            errEl.style.display = 'block';
        }
    });
}

function bindAuthScreen() {
    const errEl = document.getElementById('authError');
    const loginForm = document.getElementById('authLoginForm');
    const regForm = document.getElementById('authRegisterForm');

    document.getElementById('tabLogin').addEventListener('click', () => {
        loginForm.style.display = ''; regForm.style.display = 'none';
        document.getElementById('tabLogin').style.cssText = 'flex:1';
        document.getElementById('tabRegister').style.cssText = 'flex:1;background:transparent;border:1px solid var(--border);color:var(--text-muted)';
    });
    document.getElementById('tabRegister').addEventListener('click', () => {
        loginForm.style.display = 'none'; regForm.style.display = '';
        document.getElementById('tabRegister').style.cssText = 'flex:1';
        document.getElementById('tabLogin').style.cssText = 'flex:1;background:transparent;border:1px solid var(--border);color:var(--text-muted)';
    });

    document.getElementById('loginBtn').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value.trim();
        const pass = document.getElementById('loginPassword').value;
        errEl.style.display = 'none';
        try {
            const cred = await fbAuth.signInWithEmailAndPassword(email, pass);
            fbUser = cred.user;
            const loadingEl = document.createElement('div');
            loadingEl.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0d0a07;color:#c9a84c;font-family:Cinzel,serif;font-size:1rem;letter-spacing:0.1em';
            loadingEl.textContent = 'Cargando personajes...';
            document.body.appendChild(loadingEl);
            await syncFromFirestore();
            loadingEl.remove();
            state.apiKey = localStorage.getItem('groqApiKey');
            if (!state.apiKey) { showScreen('apiKey'); return; }
            migrateOldData();
            showScreen('characterHub');
        } catch(e) {
            const msgs = { 'auth/user-not-found':'Usuario no encontrado.', 'auth/wrong-password':'Contraseña incorrecta.', 'auth/invalid-email':'Email inválido.', 'auth/invalid-credential':'Email o contraseña incorrectos.' };
            errEl.textContent = msgs[e.code] || e.message;
            errEl.style.display = 'block';
        }
    });

    document.getElementById('registerBtn').addEventListener('click', async () => {
        const email = document.getElementById('regEmail').value.trim();
        const pass = document.getElementById('regPassword').value;
        errEl.style.display = 'none';
        try {
            const cred = await fbAuth.createUserWithEmailAndPassword(email, pass);
            fbUser = cred.user;
            state.apiKey = localStorage.getItem('groqApiKey');
            if (!state.apiKey) { showScreen('apiKey'); return; }
            showScreen('characterHub');
        } catch(e) {
            const msgs = { 'auth/email-already-in-use':'Este email ya está registrado.', 'auth/weak-password':'La contraseña debe tener al menos 6 caracteres.', 'auth/invalid-email':'Email inválido.' };
            errEl.textContent = msgs[e.code] || e.message;
            errEl.style.display = 'block';
        }
    });

    document.getElementById('resetFbBtn').addEventListener('click', () => {
        localStorage.removeItem('fbConfig');
        fbApp = null; fbDb = null; fbAuth = null; fbUser = null;
        showScreen('firebaseSetup');
    });
}

function generateDefaultActions() {
    const location = state.gameState.location || 'este lugar';
    const timeOfDay = state.gameState.timeOfDay || 'momento actual';

    // Intentar obtener nombre de compañero si está disponible
    let companionName = null;
    if (state.gameState.companions && state.gameState.companions.length > 0) {
        companionName = state.gameState.companions[0].name;
    }

    // Intentar obtener nombre de NPC de relaciones si está disponible
    let npcName = null;
    if (state.gameState.relationships) {
        for (const [name, rel] of Object.entries(state.gameState.relationships)) {
            if (rel.level > 0) { // relación positiva
                npcName = name;
                break;
            }
        }
    }

    // Construir tres acciones predeterminadas
    const actions = [];

    // Acción 1: Interacción social
    if (companionName) {
        actions.push(`Hablar con ${companionName}`);
    } else if (npcName) {
        actions.push(`Acercarse a ${npcName}`);
    } else {
        actions.push(`Hablar con alguien en ${location}`);
    }

    // Acción 2: Exploración
    actions.push(`Explorar los alrededores de ${location}`);

    // Acción 3: Observación o verificación de estado
    actions.push(`Observar con atención lo que sucede`);

    // Asegurar que tengamos exactamente tres acciones
    return actions.slice(0, 3);
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
                fsDeleteCharacter(id);
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
    // Auto-fill outfit when class is selected
    classSelect.addEventListener('change', () => {
        const cls = classSelect.value;
        const defaults = CLASS_DEFAULT_OUTFIT[cls];
        if (defaults) {
            const ropa = document.getElementById('outfitRopa');
            const arma = document.getElementById('outfitArma');
            const offhand = document.getElementById('outfitOffhand');
            const accesorio = document.getElementById('outfitAccesorio');
            if (ropa && !ropa.value) ropa.value = defaults.ropa;
            if (arma && !arma.value) arma.value = defaults.arma;
            if (offhand && !offhand.value) offhand.value = defaults.offhand;
            if (accesorio && !accesorio.value) accesorio.value = defaults.accesorio;
        }
        checkValidity();
    });
    [nameInput,raceSelect,bgSelect].forEach(el=>el.addEventListener('input',checkValidity));
    document.getElementById('backToHubBtn').addEventListener('click', () => showScreen('characterHub'));
    createBtn.addEventListener('click', () => {
        const id = generateId();
        const conMod = Math.floor((state.tempStats.CON-10)/2);
        const cls = classSelect.value;
        const defaultOutfit = CLASS_DEFAULT_OUTFIT[cls] || { ropa:'', arma:'', offhand:'', accesorio:'' };
        const equipped = {
            ropa:      document.getElementById('outfitRopa')?.value.trim()      || defaultOutfit.ropa,
            arma:      document.getElementById('outfitArma')?.value.trim()      || defaultOutfit.arma,
            offhand:   document.getElementById('outfitOffhand')?.value.trim()   || defaultOutfit.offhand,
            accesorio: document.getElementById('outfitAccesorio')?.value.trim() || defaultOutfit.accesorio
        };
        const char = {
            id, name: nameInput.value.trim(), race: raceSelect.value, classe: cls,
            background: bgSelect.value, motivation: document.getElementById('charMotivation').value.trim(),
            gender: document.getElementById('charGender').value,
            appearance: document.getElementById('charAppearance').value.trim(),
            portraitSeed: Math.floor(Math.random() * 99999),
            stats: state.tempStats, status:'alive', created: new Date().toISOString().slice(0,10),
            experience: 0, level: 1, skillPoints: 0
        };
        updateCharData(char);
        state.activeCharId = id;
        setActiveCharId(id);
        state.character = char;
        const startingKnowledge = CLASS_STARTING_KNOWLEDGE[char.classe] || { knowledges:[], learnedAbilities:[] };
        const gs = { location:'Taberna de Rurik', timeOfDay:'Tarde', hp:10+conMod, maxHp:10+conMod, inventory:[], quest:'', summary:'', companions:[], relationships:{}, npcs:[], knowledges: startingKnowledge.knowledges.map(k=>({...k})), learnedAbilities: startingKnowledge.learnedAbilities.map(a=>({...a})), skillUses:{combat:0,magic:0,stealth:0,social:0,nature:0}, classEvolution:'', curse:'', equipped };
        Object.assign(state.gameState, gs);
        state.chatHistory = [];
        state.adventure = null;
        showScreen('adventureSelection');
    });
}

function bindAdventureSelection() {
    document.getElementById('backFromAdvBtn').addEventListener('click', () => showScreen('characterHub'));
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
                : `${adv.location} te recibe. Tú eres ${char.name}, ${char.race} ${char.classe}${char.motivation?', '+char.motivation:''}.\n\n¿Qué haces?`;
            addDMMessage(opener, ['Hablar con el tabernero','Explorar el lugar','Buscar una mesa y observar']);
        });
    });
}

function renderNpcModalContent() {
    const container = document.getElementById('npcModalContent');
    if (!container) return;
    const npcs = state.gameState.npcs || [];
    if (npcs.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;font-size:0.85rem;padding:1rem">Todavia no has conocido a nadie reseniable.<br>Los personajes importantes apareceran aqui automaticamente.</p>';
        return;
    }
    container.innerHTML = npcs.map((npc, idx) => {
        const tier = getNpcRelTier(npc.relationship);
        const facts = (npc.knownFacts||[]).map(f=>`<li>${f}</li>`).join('');
        const good  = (npc.goodMemories||[]).map(f=>`<li>${f}</li>`).join('');
        const bad   = (npc.badMemories||[]).map(f=>`<li>${f}</li>`).join('');
        const portraitSrc = npc.portrait || '';
        return `<div class="npc-card" id="npc-card-${idx}">
            <div class="npc-card-header">
                ${portraitSrc ? `<img class="npc-portrait" src="${portraitSrc}" loading="lazy">` : '<div class="npc-portrait npc-portrait-placeholder">?</div>'}
                <div class="npc-card-info">
                    <div class="npc-name">${npc.name}</div>
                    <div class="npc-subt">${[npc.race,npc.role].filter(Boolean).join(' · ')}</div>
                    <div class="npc-rel-badge" style="background:${tier.color}22;border:1px solid ${tier.color};color:${tier.color}">${tier.emoji} ${tier.label}</div>
                    ${(npc.maxRelationship !== undefined && npc.maxRelationship < 5) ? `<div class="npc-cap-label">techo: ${getNpcRelTier(npc.maxRelationship).emoji} ${getNpcRelTier(npc.maxRelationship).label}</div>` : ''}
                    ${npc.biases && npc.biases.length ? `<div class="npc-biases">${npc.biases.join(' · ')}</div>` : ''}
                    ${npc.lastSeen ? `<div class="npc-lastseen">Visto en: ${npc.lastSeen}</div>` : ''}
                </div>
                <div class="npc-card-actions">
                    <button class="npc-btn" title="Regenerar retrato" onclick="regenNpcPortrait(${idx})">&#128260;</button>
                    <button class="npc-btn npc-del" title="Eliminar" onclick="deleteNpc(${idx})">&#128465;</button>
                </div>
            </div>
            ${facts ? `<details class="npc-section"><summary>Lo que sabes</summary><ul class="npc-list">${facts}</ul></details>` : ''}
            ${good  ? `<details class="npc-section"><summary>Buenos recuerdos</summary><ul class="npc-list">${good}</ul></details>` : ''}
            ${bad   ? `<details class="npc-section"><summary>Conflictos</summary><ul class="npc-list">${bad}</ul></details>` : ''}
            <details class="npc-section"><summary>Notas libres</summary>
                <textarea class="npc-notes-input" placeholder="Notas sobre ${npc.name}..." oninput="saveNpcNotes(${idx},this.value)">${npc.notes||''}</textarea>
            </details>
        </div>`;
    }).join('');
}

function openNpcModal() {
    renderNpcModalContent();
    document.getElementById('npcModal').classList.remove('hidden');
}

window.adjustNpcRel = function(idx, delta) {
    const npc = state.gameState.npcs[idx];
    if (!npc) return;
    npc.relationship = Math.max(-3, Math.min(5, npc.relationship + delta));
    npc.relationshipLabel = getNpcRelTier(npc.relationship).label;
    fsSaveGameState(state.activeCharId);
    renderNpcModalContent();
};

window.regenNpcPortrait = function(idx) {
    const npc = state.gameState.npcs[idx];
    if (!npc) return;
    npc.portrait = null;
    generateNpcPortrait(npc);
};

window.deleteNpc = function(idx) {
    if (!confirm('Eliminar este personaje del registro?')) return;
    state.gameState.npcs.splice(idx, 1);
    fsSaveGameState(state.activeCharId);
    renderNpcModalContent();
};

window.saveNpcNotes = function(idx, text) {
    if (state.gameState.npcs[idx]) { state.gameState.npcs[idx].notes = text; fsSaveGameState(state.activeCharId); }
};


function bindChat() {
    const playerInput = document.getElementById('playerInput');
    const sendBtn = document.getElementById('sendBtn');
    renderChat(); updatePartyPanel(); updateStatus(); updateMemoryIndicator();
    playerInput.focus();

    async function sendMessage() {
        const action = playerInput.value.trim();
        if (!action) return;

        // Handle /asignar command for skill point allocation
        if (action.startsWith('/asignar')) {
            const parts = action.split(' ');
            if (parts.length !== 3) {
                addDMMessage('Uso correcto: /asignar <estadistica> <puntos>\nEjemplo: /asignar FUE 2\nEstadísticas disponibles: FUE, DES, CON, INT, SAB, CAR');
                playerInput.value = '';
                return;
            }

            const stat = parts[1].toUpperCase();
            const points = parseInt(parts[2]);

            if (isNaN(points) || points <= 0) {
                addDMMessage('Los puntos deben ser un número positivo.');
                playerInput.value = '';
                return;
            }

            const validStats = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
            if (!validStats.includes(stat)) {
                addDMMessage('Estadística no válida. Use: FUE, DES, CON, INT, SAB o CAR.');
                playerInput.value = '';
                return;
            }

            if (state.character.skillPoints < points) {
                addDMMessage(`No tienes suficientes puntos de habilidad. Disponibles: ${state.character.skillPoints}`);
                playerInput.value = '';
                return;
            }

            // Apply the points to the selected stat
            state.character.stats[stat] += points;
            state.character.skillPoints -= points;

            // Check for class evolution after increasing stats
            updateClassEvolution();

            // Update max HP if CON was increased
            if (stat === 'CON') {
                const conMod = Math.floor((state.character.stats.CON - 10) / 2);
                state.gameState.maxHp = 10 + conMod;
                if (state.gameState.hp > state.gameState.maxHp) {
                    state.gameState.hp = state.gameState.maxHp;
                }
            }

            addDMMessage(`Has asignado ${points} punto(s) a ${stat}. Nueva estadística: ${stat} ${state.character.stats[stat]} (${Math.floor((state.character.stats[stat]-10)/2)>=0?'+':''}${Math.floor((state.character.stats[stat]-10)/2)})`);
            updateStatus();
            updatePartyPanel();
            saveGameStateFor(state.activeCharId, state.gameState);
            playerInput.value = '';
            return;
        }

        // Clear input immediately so user can prepare next action
        playerInput.value = '';
        state.pendingRoll = null; // clear any stale roll

        // Check if action requires a roll BEFORE sending to AI
        const suggestedRoll = guessRequiredRoll(action);
        if (suggestedRoll) {
            // We know a roll is needed, so set up pending roll immediately
            const statVal = state.character?.stats[suggestedRoll.stat] || 10;
            state.pendingRoll = {
                trigger: suggestedRoll,
                statValue: statVal
            };
            // Disable input while waiting for roll
            playerInput.disabled = true; sendBtn.disabled = true; sendBtn.textContent = '...';
            addPlayerMessage(action, null, 'pending', state.chatHistory.length); // Show roll button immediately
            // Don't call AI yet - wait for user to roll first
            return;
        }

        // If no roll needed, proceed normally
        playerInput.disabled = true; sendBtn.disabled = true; sendBtn.textContent = '...';
        addPlayerMessage(action, null, 'done', state.chatHistory.length);
        await callAndRespond(action, null);
    }

    // Use touchend on mobile for instant response, click as fallback
    let touchFired = false;
    sendBtn.addEventListener('touchend', e => {
        e.preventDefault();
        touchFired = true;
        sendMessage();
        setTimeout(() => { touchFired = false; }, 500);
    });
    sendBtn.addEventListener('click', () => { if (!touchFired) sendMessage(); });
    playerInput.addEventListener('keypress', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

    // Menu
    document.getElementById('menuBtn').addEventListener('click', () => document.getElementById('menuModal').classList.toggle('hidden'));
    document.getElementById('closeMenuBtn').addEventListener('click', () => document.getElementById('menuModal').classList.add('hidden'));
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (!confirm('¿Cerrar sesión?')) return;
        try { await fbAuth.signOut(); } catch(e) {}
        fbUser = null;
        showScreen('auth');
    });
    document.getElementById('partyMenuBtn').addEventListener('click', () => {
        document.getElementById('menuModal').classList.add('hidden');
        openPartyModal();
    });
    document.getElementById('closePartyModalBtn').addEventListener('click', () => {
        document.getElementById('partyModal').classList.add('hidden');
    });
    document.getElementById('npcMenuBtn').addEventListener('click', () => {
        document.getElementById('menuModal').classList.add('hidden');
        openNpcModal();
    });
    document.getElementById('closeNpcModalBtn').addEventListener('click', () => {
        document.getElementById('npcModal').classList.add('hidden');
    });
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
    document.getElementById('knowledgeMenuBtn').addEventListener('click', () => {
        document.getElementById('menuModal').classList.add('hidden'); openKnowledgeModal();
    });
    document.getElementById('closeKnowledgeBtn').addEventListener('click', () => {
        document.getElementById('knowledgeModal').classList.add('hidden');
    });
    document.getElementById('viewLegacyBtn').addEventListener('click', () => {
        document.getElementById('menuModal').classList.add('hidden'); openLegacyModal();
    });
    document.getElementById('viewMemoryBtn').addEventListener('click', () => {
        document.getElementById('menuModal').classList.add('hidden'); openMemoryModal();
    });

    // Inventory
    document.getElementById('closeInvBtn').addEventListener('click', () => document.getElementById('inventoryModal').classList.add('hidden'));

    // Legacy
    document.getElementById('closeLegacyBtn').addEventListener('click', () => document.getElementById('legacyModal').classList.add('hidden'));

    // Memory
    document.getElementById('closeMemoryBtn').addEventListener('click', () => document.getElementById('memoryModal').classList.add('hidden'));

    // Companion chat
    document.getElementById('closeCompanionChatBtn').addEventListener('click', () => document.getElementById('companionChatModal').classList.add('hidden'));
    document.getElementById('companionChatSendBtn').addEventListener('click', sendCompanionMessage);
    document.getElementById('companionChatInput').addEventListener('keypress', e => { if (e.key==='Enter') sendCompanionMessage(); });

    // Death
    document.getElementById('deathContinueBtn').addEventListener('click', () => {
        document.getElementById('deathModal').classList.add('hidden');
        showScreen('characterHub');
    });
}


