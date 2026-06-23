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

// ===================== PORTRAIT GENERATION =====================
const RACE_VISUALS = {
    'Humano':'human',
    'Elfo':'elf with pointed ears, ethereal beauty',
    'Enano':'dwarf, stocky and sturdy',
    'Mediano':'halfling, small and cheerful',
    'Tiefling':'tiefling with small demon horns and glowing eyes',
    'Vampiro':'vampire with pale skin, sharp fangs and dark eyes',
    'Hada':'fairy with delicate pointed ears, ethereal iridescent skin, luminous glow, butterfly-like wings',
    'Fauno':'faun with small horns and goat features',
    'Dragonborn':'dragonborn with dragon scales and reptilian features',
    'Orco':'orc with green skin, tusks and powerful build',
    'Semiélfico':'half-elf with slightly pointed ears',
    'Gnomo':'gnome with large curious eyes'
};

function getPortraitUrl(char, size=512) {
    if (!char) return '';
    const raceVisual = RACE_VISUALS[char.race] || char.race;
    const appearance = char.appearance ? char.appearance + ', ' : '';
    const gender = char.gender && char.gender !== 'Otro' ? char.gender === 'Mujer' ? 'woman' : 'man' : '';
    const prompt = encodeURIComponent(`fantasy character portrait, ${gender} ${raceVisual} ${char.classe}, ${appearance}semi-realistic digital painting, highly detailed face and eyes, dramatic cinematic lighting, dark moody background with warm rim light, intricate fantasy costume with fine details, artstation trending, D&D character art, 8k resolution, professional illustration`);
    const seed = char.portraitSeed || 42;
    return `https://image.pollinations.ai/prompt/${prompt}?width=${size}&height=${Math.round(size*1.25)}&nologo=true&seed=${seed}&model=flux`;
}
function getCompanionPortraitUrl(companion, size=256) {
    const desc = companion.description ? companion.description + ', ' : '';
    const prompt = encodeURIComponent(`fantasy character portrait, ${companion.name} ${companion.role||''}, ${desc}semi-realistic digital painting, highly detailed face, dramatic cinematic lighting, dark moody background, intricate fantasy costume, artstation trending, D&D character art`);
    const seed = companion.portraitSeed || (companion.name.split('').reduce((a,c)=>a+c.charCodeAt(0),0) * 17 % 99999);
    return `https://image.pollinations.ai/prompt/${prompt}?width=${size}&height=${Math.round(size*1.25)}&nologo=true&seed=${seed}&model=flux`;
}

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
    fsSaveMain();
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
function saveAllCharacters(chars) { localStorage.setItem('dndCharacters', JSON.stringify(chars)); fsSaveMain(); }

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
function saveGameStateFor(id, gs) { localStorage.setItem('dndGameState_' + id, JSON.stringify(gs)); fsSaveGameState(id, gs); }
function getChatHistory(id) {
    try { return JSON.parse(localStorage.getItem('dndChatHistory_' + id) || '[]'); } catch(e) { return []; }
}
function saveChatHistoryFor(id, ch) { localStorage.setItem('dndChatHistory_' + id, JSON.stringify(ch)); fsSaveChatHistory(id, ch); }
function getAdventure(id) {
    try { return JSON.parse(localStorage.getItem('dndAdventure_' + id) || 'null'); } catch(e) { return null; }
}
function saveAdventureFor(id, adv) { localStorage.setItem('dndAdventure_' + id, JSON.stringify(adv)); fsSaveAdventure(id, adv); }

// ===================== SESSION STATE =====================
const state = {
    apiKey: null,
    activeCharId: null,
    character: null,
    adventure: null,
    gameState: {
        location:'Taberna de Rurik', timeOfDay:'Tarde',
        hp:0, maxHp:0, inventory:[], quest:'', summary:'',
        companions:[], relationships:{}, npcs:[],
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

// ===================== ROLL SYSTEM =====================
function guessStatFromSkill(skill) {
    const map = {
        'Persuasión':'CAR','Carisma':'CAR','Engaño':'CAR','Intimidación':'CAR','Seducción':'CAR','Actuación':'CAR',
        'Sigilo':'DES','Acrobacias':'DES','Hurto':'DES','Destreza':'DES',
        'Fuerza':'FUE','Atletismo':'FUE','Ataque':'FUE','Combate':'FUE',
        'Magia':'INT','Arcanos':'INT','Historia':'INT','Investigación':'INT','Conocimiento':'INT',
        'Percepción':'SAB','Medicina':'SAB','Naturaleza':'SAB','Supervivencia':'SAB','Intuición':'SAB',
        'Constitución':'CON','Resistencia':'CON'
    };
    return map[skill] || 'DES';
}

function guessSkillCategory(skill) {
    const categoryMap = {
        'Persuasión':'social','Carisma':'social','Engaño':'social','Intimidación':'social','Seducción':'social','Actuación':'social',
        'Sigilo':'stealth','Acrobacias':'stealth','Hurto':'stealth','Destreza':'stealth',
        'Fuerza':'combat','Atletismo':'combat','Ataque':'combat','Combate':'combat',
        'Magia':'magic','Arcanos':'magic','Historia':'magic','Investigación':'magic','Conocimiento':'magic',
        'Percepción':'nature','Medicina':'nature','Naturaleza':'nature','Supervivencia':'nature','Intuición':'nature',
        'Constitución':'nature','Resistencia':'nature'
    };
    return categoryMap[skill] || 'combat'; // default to combat for unknown skills
}

function guessRequiredRoll(action) {
    const actionLower = action.toLowerCase();

    // Social actions requiring CAR
    const socialActions = ['convencer', 'seducir', 'intimidar', 'mentir', 'pedir favor', 'flirtear', 'persuadir', 'engañar', 'actuar'];
    if (socialActions.some(word => actionLower.includes(word))) {
        return { skill: actionLower.includes('persuadir') || actionLower.includes('engañar') || actionLower.includes('actuar') ? 'Persuasión' :
                  actionLower.includes('seducir') || actionLower.includes('flirtear') ? 'Seducción' :
                  actionLower.includes('intimidar') ? 'Intimidación' :
                  actionLower.includes('mentir') ? 'Engaño' :
                  'Persuasión', stat: 'CAR' };
    }

    // Combat actions requiring FUE or DES
    const combatActions = ['atacar', 'pelear', 'golpear', 'disparar', 'atacar a distancia'];
    if (combatActions.some(word => actionLower.includes(word))) {
        // Determine if ranged or melee
        if (actionLower.includes('distancia') || actionLower.includes('arco') || actionLower.includes('disparar')) {
            return { skill: 'Destreza', stat: 'DES' };
        } else {
            return { skill: 'Fuerza', stat: 'FUE' };
        }
    }

    // Stealth actions requiring DES
    const stealthActions = ['esconderse', 'moverse sin ser visto', 'robar', 'sigilo'];
    if (stealthActions.some(word => actionLower.includes(word))) {
        return { skill: 'Sigilo', stat: 'DES' };
    }

    // Magic actions requiring INT
    const magicActions = ['lanzar magia', 'hechizo', 'conjuro', 'magia'];
    if (magicActions.some(word => actionLower.includes(word))) {
        return { skill: 'Magia', stat: 'INT' };
    }

    // Investigation actions requiring SAB or INT
    const investigationActions = ['buscar', 'investigar', 'examinar', 'investigar'];
    if (investigationActions.some(word => actionLower.includes(word))) {
        // Default to SAB for general investigation, but could be INT for lore
        return actionLower.includes('historia') || actionLower.includes('lore') || actionLower.includes('identificar') || actionLower.includes('decifrar') ?
               { skill: 'Investigación', stat: 'INT' } :
               { skill: 'Percepción', stat: 'SAB' };
    }

    // Perception actions requiring SAB
    const perceptionActions = ['percibir peligro', 'intuir mentiras', 'detectar', 'percibir', 'escuchar', 'oír', 'escuchando', 'oyendo'];
    if (perceptionActions.some(word => actionLower.includes(word))) {
        return { skill: 'Percepción', stat: 'SAB' };
    }

    // Athletic actions requiring FUE or DES
    const athleticActions = ['saltar', 'trepar', 'correr', 'forzar'];
    if (athleticActions.some(word => actionLower.includes(word))) {
        // Default to FUE for strength-based, DES for agility-based
        return actionLower.includes('trepar') || actionLower.includes('correr') ?
               { skill: 'Acrobacias', stat: 'DES' } :
               { skill: 'Atletismo', stat: 'FUE' };
    }

    // Resistance actions requiring CON
    const resistanceActions = ['resistir veneno', 'resistir dolor', 'resistir miedo', 'resistir'];
    if (resistanceActions.some(word => actionLower.includes(word))) {
        return { skill: 'Resistencia', stat: 'CON' };
    }

    // Knowledge actions requiring INT
    const knowledgeActions = ['recordar lore', 'descifrar', 'identificar', 'conocimiento'];
    if (knowledgeActions.some(word => actionLower.includes(word))) {
        return { skill: 'Conocimiento', stat: 'INT' };
    }

    // Healing actions requiring SAB
    const healingActions = ['curar', 'atender heridas', 'curar heridas'];
    if (healingActions.some(word => actionLower.includes(word))) {
        return { skill: 'Medicina', stat: 'SAB' };
    }

    // Default to no roll for movement without obstacles, thoughts, passive actions
    return null;
}

function validateStateUpdates(stateUpdates) {
    if (!stateUpdates || typeof stateUpdates !== 'object') return;

    // Validate location
    if (stateUpdates.location !== undefined) {
        if (typeof stateUpdates.location !== 'string' || stateUpdates.location.trim() === '') {
            if (DEBUG_IA_COMMUNICATION) {
                console.warn('Invalid location in stateUpdates:', stateUpdates.location);
            }
        }
    }

    // Validate HP
    if (stateUpdates.hp !== undefined) {
        if (typeof stateUpdates.hp !== 'number' || stateUpdates.hp < 0) {
            if (DEBUG_IA_COMMUNICATION) {
                console.warn('Invalid HP in stateUpdates:', stateUpdates.hp);
            }
        }
        // Note: We don't validate against maxHp here because maxHp might be updated in the same batch
    }

    // Validate timeOfDay
    if (stateUpdates.timeOfDay !== undefined) {
        if (typeof stateUpdates.timeOfDay !== 'string' || stateUpdates.timeOfDay.trim() === '') {
            if (DEBUG_IA_COMMUNICATION) {
                console.warn('Invalid timeOfDay in stateUpdates:', stateUpdates.timeOfDay);
            }
        }
    }

    // Validate inventory
    if (stateUpdates.inventory !== undefined) {
        if (!Array.isArray(stateUpdates.inventory)) {
            if (DEBUG_IA_COMMUNICATION) {
                console.warn('Invalid inventory in stateUpdates: not an array', stateUpdates.inventory);
            }
        }
    }

    // Validate that we're not setting both hp and maxHp to invalid combinations
    if (stateUpdates.hp !== undefined && stateUpdates.maxHp !== undefined) {
        if (stateUpdates.hp < 0 || stateUpdates.maxHp < 0) {
            if (DEBUG_IA_COMMUNICATION) {
                console.warn('Negative HP or maxHP in stateUpdates:', { hp: stateUpdates.hp, maxHp: stateUpdates.maxHp });
            }
        }
        if (stateUpdates.hp > stateUpdates.maxHp) {
            if (DEBUG_IA_COMMUNICATION) {
                console.warn('HP exceeds maxHP in stateUpdates:', { hp: stateUpdates.hp, maxHp: stateUpdates.maxHp });
            }
        }
    }
}

function rollD20(statValue, dc) {
    const roll = Math.floor(Math.random()*20)+1;
    const mod = Math.floor((statValue-10)/2);
    const total = roll+mod;
    return { roll, mod, total, dc, success: total>=dc };
}

window.executeRoll = async function(dmMsgIdx) {
    if (!state.pendingRoll) return;
    const { trigger } = state.pendingRoll;
    state.pendingRoll = null;
    const statVal = state.character.stats[trigger.stat] || 10;
    const result = { ...rollD20(statVal, trigger.dc), skill: trigger.skill };

    // Track skill usage
    const category = guessSkillCategory(trigger.skill);
    state.gameState.skillUses[category]++;
    updateClassEvolution();

    // Update DM message to show roll result inline
    if (state.chatHistory[dmMsgIdx]) {
        state.chatHistory[dmMsgIdx].rollResult = result;
        state.chatHistory[dmMsgIdx].rollPending = false;
        const container = document.getElementById('chatContainer');
        const existing = container?.querySelector(`[data-idx="${dmMsgIdx}"]`);
        if (existing) existing.replaceWith(createMessageEl(state.chatHistory[dmMsgIdx], dmMsgIdx));
    }

    // Auto-send roll result to AI for outcome narration
    const mod = result.mod >= 0 ? '+'+result.mod : result.mod;
    const rollMsg = `[Tirada de ${trigger.skill}: d20=${result.roll} ${mod} = ${result.total} vs DC ${trigger.dc} → ${result.success ? '¡ÉXITO!' : 'FALLO'}]`;
    const playerInput = document.getElementById('playerInput');
    const sendBtn = document.getElementById('sendBtn');
    if (playerInput) playerInput.disabled = true;
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '...'; }
    await callAndRespond(rollMsg, result);
};

function updateClassEvolution() {
    const { combat, magic, stealth, social, nature } = state.gameState.skillUses;
    const cls = state.character.classe;
    let evo = '';

    // Guerrero evolutions
    if (magic>=5 && cls==='Guerrero') evo='Guerrero Arcano';
    else if (nature>=5 && cls==='Guerrero') evo='Cazador';
    else if (combat>=3 && nature>=3 && cls==='Guerrero') evo='Guerrero de la Naturaleza';

    // Mago evolutions
    else if (combat>=5 && cls==='Mago') evo='Mago de Batalla';
    else if (nature>=5 && cls==='Mago') evo='Hechicero de la Naturaleza';
    else if (stealth>=3 && nature>=3 && cls==='Mago') evo='Mago Sigiloso';

    // Pícaro evolutions
    else if (social>=5 && cls==='Pícaro') evo='Maestro Manipulador';
    else if (nature>=5 && cls==='Pícaro') evo='Rastreador';
    else if (combat>=3 && nature>=3 && cls==='Pícaro') evo='Pícaro Cazador';

    // Explorador evolutions (if base class is Explorador)
    else if (nature>=5 && cls==='Explorador') evo='Explorador Maestro';
    else if (combat>=4 && cls==='Explorador') evo='Explorador Guerreriza';

    // Cleric evolutions
    else if (nature>=5 && cls==='Clérigo') evo='Druida';
    else if (combat>=3 && nature>=3 && cls==='Clérigo') evo='Clérigo de la Guerra';

    // General combinations
    else if (combat>=3 && stealth>=3) evo='Sombra Luchadora';
    else if (social>=4 && magic>=3) evo='Bardo Arcano';
    else if (magic>=3 && nature>=3) evo='Hechicero Sabio';
    else if (combat>=3 && social>=3) evo='Líder Carismático';

    state.gameState.classEvolution = evo;
}

window.useAction = function(text) {
    const input = document.getElementById('playerInput');
    const btn = document.getElementById('sendBtn');
    if (input && btn) { state.pendingRoll = null; input.value = text; btn.click(); }
};

// ===================== INIT =====================
async function init() {
    const fbConfig = localStorage.getItem('fbConfig');
    if (!fbConfig) { showScreen('firebaseSetup'); return; }
    try { initFirebase(JSON.parse(fbConfig)); } catch(e) { localStorage.removeItem('fbConfig'); showScreen('firebaseSetup'); return; }

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
        </div>
        <div id="menuModal" class="modal hidden"><div class="modal-box">
            <div class="modal-title">Menú — ${state.character?.name}</div>
            <button class="modal-btn" id="partyMenuBtn">👥 Party & Compañeros</button>
            <button class="modal-btn" id="npcMenuBtn">🎭 Personajes Conocidos</button>
            <button class="modal-btn" id="newAdventureBtn">🗺️ Nueva Aventura (mismo personaje)</button>
            <button class="modal-btn" id="switchCharBtn">🔄 Cambiar Personaje</button>
            <button class="modal-btn" id="manageInventoryBtn">🎒 Gestionar Inventario</button>
            <button class="modal-btn" id="viewLegacyBtn">📜 Ver Legado del Mundo</button>
            <button class="modal-btn" id="logoutBtn">🚪 Cerrar Sesión</button>
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
                <p class="footer-note">El contexto se resume automáticamente cada 10 turnos</p>
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
    [nameInput,raceSelect,classSelect,bgSelect].forEach(el=>el.addEventListener('input',checkValidity));
    document.getElementById('backToHubBtn').addEventListener('click', () => showScreen('characterHub'));
    createBtn.addEventListener('click', () => {
        const id = generateId();
        const conMod = Math.floor((state.tempStats.CON-10)/2);
        const char = {
            id, name: nameInput.value.trim(), race: raceSelect.value, classe: classSelect.value,
            background: bgSelect.value, motivation: document.getElementById('charMotivation').value.trim(),
            gender: document.getElementById('charGender').value,
            appearance: document.getElementById('charAppearance').value.trim(),
            portraitSeed: Math.floor(Math.random() * 99999),
            stats: state.tempStats, status:'alive', created: new Date().toISOString().slice(0,10)
        };
        updateCharData(char);
        state.activeCharId = id;
        setActiveCharId(id);
        state.character = char;
        const gs = { location:'Taberna de Rurik', timeOfDay:'Tarde', hp:10+conMod, maxHp:10+conMod, inventory:[], quest:'', summary:'', companions:[], relationships:{}, npcs:[], skillUses:{combat:0,magic:0,stealth:0,social:0,nature:0}, classEvolution:'', curse:'' };
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
    renderChat(); updatePartyPanel(); updateStatus();
    playerInput.focus();

    async function sendMessage() {
        const action = playerInput.value.trim();
        if (!action) return;
        state.pendingRoll = null; // clear any stale roll
        playerInput.disabled = true; sendBtn.disabled = true; sendBtn.textContent = '...'; playerInput.value = '';
        addPlayerMessage(action, null, 'done');
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

// ===================== MODALS =====================
// ===================== COMPANION CHAT =====================
const companionChats = {};
let activeChatCompanion = null;

window.openCompanionChat = function(companionName) {
    activeChatCompanion = companionName;
    const companion = (state.gameState.companions||[]).find(c=>c.name===companionName);
    if (!companion) return;
    document.getElementById('companionChatName').textContent = companion.name;
    document.getElementById('companionChatRole').textContent = companion.role || '';
    document.getElementById('companionChatPortrait').src = getCompanionPortraitUrl(companion, 120);
    if (!companionChats[companionName]) companionChats[companionName] = [];
    renderCompanionChat();
    document.getElementById('companionChatModal').classList.remove('hidden');
    document.getElementById('companionChatInput').focus();
};

function renderCompanionChat() {
    const msgs = companionChats[activeChatCompanion] || [];
    const el = document.getElementById('companionChatMessages');
    if (!el) return;
    el.innerHTML = msgs.length === 0
        ? `<div class="cc-empty">Di algo para iniciar la conversación</div>`
        : msgs.map(m => `<div class="cc-msg cc-${m.role}"><span class="cc-bubble">${m.content}</span></div>`).join('');
    el.scrollTop = el.scrollHeight;
}

async function sendCompanionMessage() {
    const input = document.getElementById('companionChatInput');
    const text = input.value.trim();
    if (!text || !activeChatCompanion) return;
    input.value = '';
    if (!companionChats[activeChatCompanion]) companionChats[activeChatCompanion] = [];
    companionChats[activeChatCompanion].push({ role:'player', content: text });
    renderCompanionChat();
    const sendBtn = document.getElementById('companionChatSendBtn');
    sendBtn.disabled = true; sendBtn.textContent = '...';
    try {
        const companion = (state.gameState.companions||[]).find(c=>c.name===activeChatCompanion);
        const rel = state.gameState.relationships?.[activeChatCompanion];
        const char = state.character;
        const recentHistory = companionChats[activeChatCompanion].slice(-10).map(m=>`${m.role==='player'?char.name:companion.name}: ${m.content}`).join('\n');
        const system = `Eres ${companion.name}${companion.role?', '+companion.role:''}. ${companion.description||''}\nEstás en ${state.gameState.location} junto a ${char.name}, ${char.race} ${char.classe}.\nTu relación con ${char.name}: ${rel?.type||'neutral'} (nivel ${rel?.level||0}/5).\nResponde en primera persona, en character, de forma natural y concisa (1-4 frases). Habla en el mismo idioma que ${char.name}.`;
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method:'POST',
            headers:{ 'Content-Type':'application/json','Authorization':`Bearer ${state.apiKey}` },
            body: JSON.stringify({ model:'llama-3.3-70b-versatile', messages:[{role:'system',content:system},{role:'user',content:recentHistory+'\n'+char.name+': '+text}], temperature:0.85, max_tokens:200 })
        });
        const data = await response.json();
        const reply = data.choices[0].message.content.trim().replace(/^[^:]+:\s*/,'');
        companionChats[activeChatCompanion].push({ role:'companion', content: reply });
        renderCompanionChat();
    } catch(e) {
        companionChats[activeChatCompanion].push({ role:'companion', content:'...(silencio)' });
        renderCompanionChat();
    } finally {
        sendBtn.disabled = false; sendBtn.textContent = 'Enviar';
        document.getElementById('companionChatInput').focus();
    }
}

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

function openPartyModal() {
    const modal = document.getElementById('partyModal');
    const content = document.getElementById('partyModalContent');
    if (!modal || !content || !state.character) return;
    const char = state.character;
    const hpPct = Math.max(0, Math.min(100, (state.gameState.hp/state.gameState.maxHp)*100));
    const hpColor = hpPct>60?'#4a7c59':hpPct>30?'#8a6a20':'#7c4a4a';
    const portraitUrl = getPortraitUrl(char, 200);
    const curseHtml = state.gameState.curse ? `<div class="curse-badge">🌑 ${state.gameState.curse}</div>` : '';
    const classLabel = state.gameState.classEvolution || `${char.race} ${char.classe}`;
    const companionHtml = (state.gameState.companions||[]).map(c => {
        const cp = Math.max(0,Math.min(100,(c.hp/c.maxHp)*100));
        const rel = state.gameState.relationships?.[c.name];
        const relBadge = rel && rel.type !== 'neutral' ? `<span class="rel-badge rel-${rel.type}">${rel.type==='romantic'?'💕':rel.type==='friend'?'🤝':rel.type==='rival'?'⚔️':'👤'} ${rel.type}</span>` : '';
        const cPortrait = getCompanionPortraitUrl(c, 100);
        return `<div class="companion-card">
            <div class="companion-avatar-wrap">
                <img src="${cPortrait}" class="companion-portrait" alt="${c.name}" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
                <div class="companion-avatar" style="display:none">${c.icon||'👤'}</div>
            </div>
            <div class="companion-info">
                <div class="companion-name">${c.name} ${relBadge}</div>
                <div class="companion-role">${c.role||''}</div>
                ${c.description ? `<div class="companion-desc">${c.description}</div>` : ''}
                <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${cp}%;background:${cp>60?'#4a7c59':cp>30?'#8a6a20':'#7c4a4a'}"></div></div>
                <div class="hp-text">PV ${c.hp}/${c.maxHp}</div>
                <button class="companion-chat-btn" onclick="document.getElementById('partyModal').classList.add('hidden');openCompanionChat('${c.name.replace(/'/g,"\'")}')">💬 Hablar</button>
            </div>
        </div>`;
    }).join('');
    content.innerHTML = `
        <div style="display:flex;gap:1rem;align-items:flex-start;margin-bottom:1rem">
            <img src="${portraitUrl}" style="width:80px;height:100px;object-fit:cover;border-radius:6px;flex-shrink:0" loading="lazy" onerror="this.style.display='none'">
            <div style="flex:1;min-width:0">
                <div style="font-family:Cinzel,serif;font-size:1rem;color:var(--accent)">${char.name}</div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.4rem">${classLabel}</div>
                ${curseHtml}
                <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${hpPct}%;background:${hpColor}"></div></div>
                <div class="hp-text">PV ${state.gameState.hp} / ${state.gameState.maxHp}</div>
                <div class="stats-mini" style="margin-top:0.5rem">${Object.entries(char.stats).map(([ab,v])=>{const m=Math.floor((v-10)/2);return `<div class="stat-mini"><span class="stat-label">${ab}</span><span class="stat-val">${v}</span><span class="stat-mod">${m>=0?'+':''}${m}</span></div>`;}).join('')}</div>
            </div>
        </div>
        ${companionHtml ? `<div class="companions-label" style="margin-bottom:0.5rem">Compañeros</div>${companionHtml}` : '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1rem">Aún no tienes compañeros</div>'}
    `;
    modal.classList.remove('hidden');
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
        const cPortrait = getCompanionPortraitUrl(c, 120);
        return `<div class="companion-card">
            <div class="companion-avatar-wrap">
                <img src="${cPortrait}" class="companion-portrait" alt="${c.name}" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
                <div class="companion-avatar" style="display:none">${c.icon||'👤'}</div>
            </div>
            <div class="companion-info">
                <div class="companion-name">${c.name} ${relBadge}</div>
                <div class="companion-role">${c.role||''}</div>
                ${c.description ? `<div class="companion-desc">${c.description}</div>` : ''}
                <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${cp}%;background:${cp>60?'#4a7c59':cp>30?'#8a6a20':'#7c4a4a'}"></div></div>
                <div class="hp-text">PV ${c.hp}/${c.maxHp}</div>
                <button class="companion-chat-btn" onclick="openCompanionChat('${c.name.replace(/'/g,"\\'")}')">💬 Hablar</button>
            </div>
        </div>`;
    }).join('');
    const portraitUrl = getPortraitUrl(char, 300);
    panel.innerHTML = `<div class="party-card">
        <div class="party-portrait-wrap">
            <img src="${portraitUrl}" class="party-portrait" alt="${char.name}" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
            <div class="party-avatar party-avatar-fallback" style="display:none">${CLASS_ICONS[char.classe]||'⚔️'}</div>
        </div>
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
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000));
        let response = await Promise.race([callGroqApi(action, rollResult), timeoutPromise]);

        // Debug logging
        if (DEBUG_IA_COMMUNICATION) {
            console.log('IA RAW RESPONSE:', response);
        }

        let { narration, stateUpdates, actions, legacy, deathNarration, rollRequest, npcUpdate } = parseLlmResponse(response);

        // Debug logging
        if (DEBUG_IA_COMMUNICATION) {
            console.log('PARSED IA RESPONSE:', { narration, stateUpdates, actions, legacy, deathNarration, rollRequest, npcUpdate });
        }

        // Fallback: if IA didn't request a roll but we think it should have, try again with more explicit instructions
        if (!rollRequest) {
            const suggestedRoll = guessRequiredRoll(action);
            if (suggestedRoll) {
                // Create a more insistent user prompt that explicitly asks for a roll
                const insistentAction = `${action}\n\nIMPORTANTE: Esta acción claramente requiere una tirada de dados. Por favor, incluye un bloque [ROLL:] en tu respuesta con la skill, stat, dc y razón adecuados.`;
                const insistentResponse = await Promise.race([callGroqApi(insistentAction, rollResult), timeoutPromise]);

                // Debug logging
                if (DEBUG_IA_COMMUNICATION) {
                    console.log('IA RESPONSE TO INSISTENT PROMPT:', insistentResponse);
                }

                const { narration: insistentNarration, stateUpdates: insistentStateUpdates, actions: insistentActions, legacy: insistentLegacy, deathNarration: insistentDeathNarration, rollRequest: insistentRollRequest, npcUpdate: insistentNpcUpdate } = parseLlmResponse(insistentResponse);

                // Debug logging
                if (DEBUG_IA_COMMUNICATION) {
                    console.log('PARSED INSISTENT IA RESPONSE:', { narration: insistentNarration, stateUpdates: insistentStateUpdates, actions: insistentActions, legacy: insistentLegacy, deathNarration: insistentDeathNarration, rollRequest: insistentRollRequest, npcUpdate: insistentNpcUpdate });
                }

                // Use the insistent response if it provided a roll request, otherwise stick with original
                if (insistentRollRequest) {
                    narration = insistentNarration;
                    stateUpdates = insistentStateUpdates;
                    actions = insistentActions;
                    legacy = insistentLegacy;
                    deathNarration = insistentDeathNarration;
                    rollRequest = insistentRollRequest;
                    npcUpdate = insistentNpcUpdate;
                    if (insistentNpcUpdate) processNpcUpdate(insistentNpcUpdate);
                }
            }
        }

        if (npcUpdate) processNpcUpdate(npcUpdate);
        document.getElementById('typingIndicator')?.remove();

        if (stateUpdates) {
            // Validate state updates for debugging
            validateStateUpdates(stateUpdates);

            Object.assign(state.gameState, stateUpdates);
            if (!state.gameState.companions) state.gameState.companions = [];
            if (!state.gameState.relationships) state.gameState.relationships = {};
        }

        if (legacy) saveWorldEvent({ ...legacy, characterName: state.character.name, characterRace: state.character.race, characterClass: state.character.classe });

        // If AI requests a roll, mark the DM message and set pendingRoll
        if (rollRequest) {
            const dmMsgIdx = state.chatHistory.length;
            const dmMsg = { role:'dm', content:narration, actions:[], location:state.gameState.location, time:state.gameState.timeOfDay, rollPending:true };
            state.chatHistory.push(dmMsg);
            state.pendingRoll = { trigger: rollRequest };
            const container = document.getElementById('chatContainer');
            if (container) { container.appendChild(createMessageEl(dmMsg, dmMsgIdx)); container.scrollTop = container.scrollHeight; }
        } else {
            addDMMessage(narration, actions);
        }
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
        const isTimeout = err.message === 'timeout';
        addDMMessage(isTimeout ? 'La conexión tardó demasiado. Intenta enviar tu acción de nuevo.' : 'El humo de la taberna nubla la visión. Inténtalo de nuevo.', []);
    } finally {
        if (playerInput) { playerInput.disabled = false; }
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
    const npcs = (state.gameState.npcs||[]);
    const npcSection = npcs.length > 0 ? '\nPERSONAJES CONOCIDOS:\n' + npcs.map(n=>{
        const tier = getNpcRelTier(n.relationship);
        const facts = n.knownFacts.slice(-3).join('; ');
        const lastEvent = [...(n.goodMemories||[]),...(n.badMemories||[])].slice(-1)[0]||'';
        const capStr = n.maxRelationship !== undefined && n.maxRelationship < 5 ? ` [TECHO:${getNpcRelTier(n.maxRelationship).label}]` : '';
        const biasStr = n.biases && n.biases.length ? ` [Sesgos: ${n.biases.join(', ')}]` : '';
        const persStr = n.personality ? ` [Personalidad: ${n.personality}]` : '';
        return `- ${n.name} (${n.race||''}${n.role?' · '+n.role:''}): REL=${tier.label}${capStr}${biasStr}${persStr}. ${facts}${lastEvent?' | Último: '+lastEvent:''}`;
    }).join('\n') : '';
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
- Relaciones: ${rels}${npcSection}
${worldSection}${rollSection}

INSTRUCCIONES:
- 60-120 palabras de narración. Conciso, cinematográfico, sin descripciones de entorno innecesarias. Ve al grano.
- NPCs con nombres y personalidad consistente. Los eventos del mundo son REALES y visibles.
- Si hay historia del mundo en esta zona, inclúyela naturalmente.
- Romance, seducción y relaciones pueden desarrollarse naturalmente.
- Si el jugador muere (hp=0), narra una muerte épica.
- Termina en momento de decisión o antes del bloque de tirada.
- AVANZA LA HISTORIA: Cuando sea apropiado, cambia de ubicación y avanza la trama. Usa bloques [STATE:] para reflejar cambios en ubicación, hora del día, y otros aspectos del estado del juego. No te quedes estancado en un solo lugar sin razón narrativa.

SISTEMA DE DADOS (CRÍTICO — SIGUE ESTO SIEMPRE):
CASI TODA acción requiere tirada. Pide [ROLL] SIEMPRE en estos casos:
- Hablar con alguien con intención (convencer, seducir, intimidar, mentir, pedir favor, flirtear) → CAR
- Atacar, pelear, golpear, disparar → FUE (o DES si es a distancia/sigilo)
- Esconderse, moverse sin ser visto, robar → DES  
- Lanzar magia, hechizos, conjuros → INT
- Buscar algo, investigar, examinar → SAB o INT
- Percibir peligro, intuir mentiras, detectar algo → SAB
- Saltar, trepar, correr, forzar → FUE o DES
- Resistir veneno/dolor/miedo → CON
- Recordar lore, descifrar, identificar → INT
- Curar, atender heridas → SAB

NO necesita tirada: moverse de A a B sin obstáculos, describir pensamientos, acciones puramente pasivas, o cuando ya recibes el resultado de una tirada ([Tirada de X: ...]).

En COMBATE: el [ROLL] es OBLIGATORIO siempre. Calcula el daño solo DESPUÉS de recibir el resultado.

DC orientativos: trivial=6, fácil=8, normal=10, moderado=12, difícil=15, muy difícil=18, legendario=20

Stats: FUE(Fuerza/Ataque/Atletismo), DES(Sigilo/Hurto/Acrobacias/Armas a distancia), CON(Resistencia/Aguante), INT(Magia/Arcanos/Conocimiento/Descifrar), SAB(Percepción/Medicina/Naturaleza/Intuición), CAR(Persuasión/Engaño/Intimidación/Seducción/Actuación)

Al final, en ESTE ORDEN exacto:
[ACTIONS: ["acción 1", "acción 2", "acción 3"]]
[STATE: {"hp":N,"location":"X","timeOfDay":"X","inventory":[],"quest":"X","summary":"2 frases","companions":[],"relationships":{},"curse":""}]
Si el resultado es incierto AÑADE TAMBIÉN:
[ROLL: {"skill":"Nombre del skill","stat":"FUE|DES|CON|INT|SAB|CAR","dc":N,"reason":"por qué se pide la tirada"}]
Si ocurre algo épico o permanente:
[LEGACY: {"location":"nombre exacto","event":"descripción en tercera persona","type":"death/heroic/curse/discovery"}]
Cuando interactúas con un PNJ con nombre, actualiza su registro (usa SOLO si hay algo nuevo o cambia la relación):
[NPC: {"name":"Nombre","race":"Raza","role":"Rol/ocupación","gender":"hombre|mujer","personality":"rasgos de personalidad en 5-8 palabras","biases":["odio o preferencia 1","odio o preferencia 2"],"maxRelationship":5,"relationship":0,"fact":"dato que el jugador descubre","goodMemory":"evento positivo","badMemory":"evento negativo","lastSeen":"lugar actual","portraitHint":"rasgos visuales breves"}]
Escala relación: -3=Enemigo Jurado, -2=Enemigo, -1=Rival, 0=Neutro, 1=Conocido, 2=Amigo, 3=Aliado, 4=Interés Romántico, 5=Amor
maxRelationship: el TECHO PERMANENTE de relación con este jugador específico. Si el PNJ es racista, leal a una facción enemiga, o tiene razones para no confiar nunca del todo, reduce este valor. Ejemplos: guardia corrupto que odia elfos → maxRelationship:1. Mercenario desconfiado → 3. Una vez fijado NO cambia.
REGLA CRÍTICA: la relación NUNCA puede mejorar solo porque el jugador sea amable. Debe haber acción concreta que justifique el cambio. Un PNJ con biases negativos resiste activamente el carisma del jugador.
Incluye solo los campos que cambian o son nuevos. biases y maxRelationship solo al crear el PNJ. NUNCA incluyas [NPC] si no hay personaje nombrado significativo.`;

    return { system, user: playerAction };
}

async function callGroqApi(playerAction, rollResult) {
    const { system, user } = buildPrompt(playerAction, rollResult);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json','Authorization':`Bearer ${state.apiKey}` },
        body: JSON.stringify({ model:'llama-3.3-70b-versatile', messages:[{role:'system',content:system},{role:'user',content:user}], temperature:0.7, max_tokens:1000 })
    });
    if (!response.ok) { const e = await response.text(); throw new Error(`Groq ${response.status}: ${e}`); }
    const data = await response.json();
    return data.choices[0].message.content;
}


// ===================== NPC SYSTEM =====================
const NPC_REL_TIERS = [
    { value:-3, label:'Enemigo Jurado', color:'#8b0000', emoji:'💀' },
    { value:-2, label:'Enemigo',        color:'#c0392b', emoji:'⚔️' },
    { value:-1, label:'Rival',          color:'#e67e22', emoji:'😠' },
    { value:0,  label:'Neutro',         color:'#7f8c8d', emoji:'😐' },
    { value:1,  label:'Conocido',       color:'#2980b9', emoji:'👋' },
    { value:2,  label:'Amigo',          color:'#27ae60', emoji:'🤝' },
    { value:3,  label:'Aliado',         color:'#1abc9c', emoji:'🛡️' },
    { value:4,  label:'Interés Romántico', color:'#e91e8c', emoji:'💕' },
    { value:5,  label:'Amor',           color:'#ff4081', emoji:'❤️' }
];

function getNpcRelTier(value) {
    return NPC_REL_TIERS.find(t => t.value === value) || NPC_REL_TIERS[3];
}

async function generateNpcPortrait(npc) {
    const raceHint = npc.race ? npc.race.toLowerCase() : 'human';
    const genderHint = npc.gender || '';
    const visualHint = npc.portraitHint || npc.role || '';
    const prompt = encodeURIComponent(`${genderHint} ${raceHint} ${visualHint}, semi-realistic digital painting, D&D NPC character portrait, artstation quality, dramatic lighting, fantasy, detailed face`);
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=256&height=256&seed=${Math.floor(Math.random()*9999)}&nologo=true`;
    npc.portrait = url;
    fsSaveGameState(state.activeCharId);
    // Refresh NPC panel if open
    const panel = document.getElementById('npcModalContent');
    if (panel) renderNpcModalContent();
}

function processNpcUpdate(update) {
    if (!update || !update.name) return;
    if (!state.gameState.npcs) state.gameState.npcs = [];

    const existing = state.gameState.npcs.find(n => n.name.toLowerCase() === update.name.toLowerCase());
    if (existing) {
        if (update.relationship !== undefined) {
            const cap = existing.maxRelationship !== undefined ? existing.maxRelationship : 5;
            existing.relationship = Math.min(cap, Math.max(-3, update.relationship));
            existing.relationshipLabel = getNpcRelTier(existing.relationship).label;
        }
        if (update.fact && !existing.knownFacts.includes(update.fact)) existing.knownFacts.push(update.fact);
        if (update.goodMemory && !existing.goodMemories.includes(update.goodMemory)) existing.goodMemories.push(update.goodMemory);
        if (update.badMemory && !existing.badMemories.includes(update.badMemory)) existing.badMemories.push(update.badMemory);
        if (update.race && !existing.race) existing.race = update.race;
        if (update.role && !existing.role) existing.role = update.role;
        if (update.lastSeen) existing.lastSeen = update.lastSeen || state.gameState.location;
        if (update.portraitHint && !existing.portraitHint) { existing.portraitHint = update.portraitHint; generateNpcPortrait(existing); }
    } else {
        const tier = NPC_REL_TIERS.find(t => t.value === (update.relationship||0)) || NPC_REL_TIERS[3];
        const npc = {
            id: update.name.toLowerCase().replace(/\s+/g,'_') + '_' + Date.now(),
            name: update.name,
            race: update.race || '',
            role: update.role || '',
            gender: update.gender || '',
            portrait: null,
            portraitHint: update.portraitHint || '',
            relationship: update.relationship !== undefined ? update.relationship : 0,
            relationshipLabel: update.relationshipLabel || tier.label,
            knownFacts: update.fact ? [update.fact] : [],
            goodMemories: update.goodMemory ? [update.goodMemory] : [],
            badMemories: update.badMemory ? [update.badMemory] : [],
            lastSeen: update.lastSeen || state.gameState.location || '',
            notes: update.notes || ''
        };
        state.gameState.npcs.push(npc);
        generateNpcPortrait(npc);
    }
    fsSaveGameState(state.activeCharId);
    // Live-refresh if panel open
    const panel = document.getElementById('npcModalContent');
    if (panel) renderNpcModalContent();
}

function parseLlmResponse(response) {
    let narration = response;
    let stateUpdates = null, actions = [], legacy = null, deathNarration = null, rollRequest = null;

    const actionsMatch = response.match(/\[ACTIONS:\s*(\[[\s\S]*?\])\]/);
    if (actionsMatch) {
        try {
            actions = JSON.parse(actionsMatch[1]);
        } catch(e) {
            if (DEBUG_IA_COMMUNICATION) {
                console.warn('Failed to parse ACTIONS block:', actionsMatch[1], e);
            }
        }
    narration = narration.replace(actionsMatch[0],'').trim(); }

    const stateMatch = response.match(/\[STATE:\s*(\{[\s\S]*?\})\]/);
    if (stateMatch) {
        try {
            stateUpdates = JSON.parse(stateMatch[1]);
        } catch(e) {
            if (DEBUG_IA_COMMUNICATION) {
                console.warn('Failed to parse STATE block:', stateMatch[1], e);
            }
        }
    narration = narration.replace(stateMatch[0],'').trim(); }

    const legacyMatch = response.match(/\[LEGACY:\s*(\{[\s\S]*?\})\]/);
    if (legacyMatch) {
        try {
            legacy = JSON.parse(legacyMatch[1]);
        } catch(e) {
            if (DEBUG_IA_COMMUNICATION) {
                console.warn('Failed to parse LEGACY block:', legacyMatch[1], e);
            }
        }
    narration = narration.replace(legacyMatch[0],'').trim(); }

    const rollMatch = response.match(/\[ROLL:\s*(\{[\s\S]*?\})\]/);
    if (rollMatch) {
        try {
            const r = JSON.parse(rollMatch[1]);
            rollRequest = {
                skill: r.skill || 'Habilidad',
                stat: r.stat || guessStatFromSkill(r.skill || ''),
                dc: parseInt(r.dc) || 12,
                reason: r.reason || ''
            };
        } catch(e) {
            if (DEBUG_IA_COMMUNICATION) {
                console.warn('Failed to parse ROLL block:', rollMatch[1], e);
            }
        }
        narration = narration.replace(rollMatch[0],'').trim();
    }

    if (stateUpdates?.hp <= 0) {
        deathNarration = narration.split('\n\n').slice(-1)[0] || narration.slice(-200);
    }

    const npcMatch = response.match(/\[NPC:\s*(\{[\s\S]*?\})\]/);
    let npcUpdate = null;
    if (npcMatch) {
        try {
            npcUpdate = JSON.parse(npcMatch[1]);
        } catch(e) {
            if (DEBUG_IA_COMMUNICATION) {
                console.warn('Failed to parse NPC block:', npcMatch[1], e);
            }
        }
        narration = narration.replace(npcMatch[0],'').trim();
    }

    return { narration, stateUpdates, actions, legacy, deathNarration, rollRequest, npcUpdate };
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

loadFirebaseSDK().then(() => init());