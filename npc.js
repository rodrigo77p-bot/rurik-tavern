// ===== NPC SYSTEM =====

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
    saveGameStateFor(state.activeCharId, state.gameState);
    const panel = document.getElementById('npcModalContent');
    if (panel) renderNpcModalContent();
}

function processLearnUpdate(update) {
    if (!update || !update.type || !update.name) return;
    if (!Array.isArray(state.gameState.knowledges)) state.gameState.knowledges = [];
    if (!Array.isArray(state.gameState.learnedAbilities)) state.gameState.learnedAbilities = [];

    if (update.type === 'knowledge') {
        const id = update.id || update.name.toLowerCase().replace(/\s+/g,'_');
        const existing = state.gameState.knowledges.find(k => k.id === id);
        if (existing) {
            if (update.level && update.level > existing.level) existing.level = update.level;
        } else {
            state.gameState.knowledges.push({
                id,
                name:        update.name,
                type:        update.category || update.type || 'skill',
                level:       update.level || 1,
                source:      update.source || '',
                description: update.description || ''
            });
        }
    } else if (update.type === 'ability') {
        const id = update.id || update.name.toLowerCase().replace(/\s+/g,'_');
        const existing = state.gameState.learnedAbilities.find(a => a.id === id);
        if (!existing) {
            state.gameState.learnedAbilities.push({
                id,
                name:        update.name,
                category:    update.category || 'skill',
                stat:        update.stat || 'INT',
                dcBonus:     update.dcBonus || update.dc_bonus || 0,
                source:      update.source || '',
                description: update.description || ''
            });
        }
    }

    saveGameStateFor(state.activeCharId, state.gameState);
    const panel = document.getElementById('knowledgeModalContent');
    if (panel) renderKnowledgeModalContent();
}

function processNpcUpdate(update) {
    if (!update || typeof update !== 'object' || !update.name || typeof update.name !== 'string' || update.name.trim() === '') {
        if (DEBUG_IA_COMMUNICATION) { console.warn('Invalid NPC update received:', update); }
        return;
    }
    if (!state.gameState.npcs) state.gameState.npcs = [];
    const sanitizedName = update.name.trim();
    const existing = state.gameState.npcs.find(n => n.name.toLowerCase() === sanitizedName.toLowerCase());
    if (existing) {
        // Harden: old/synced NPC records may lack these arrays — without this, .push() throws
        // and the exception aborts the whole DM response (this was the "NPCs stopped working" bug)
        if (!Array.isArray(existing.knownFacts)) existing.knownFacts = [];
        if (!Array.isArray(existing.goodMemories)) existing.goodMemories = [];
        if (!Array.isArray(existing.badMemories)) existing.badMemories = [];
        if (update.relationship !== undefined) {
            const rel = parseInt(update.relationship);
            if (!isNaN(rel)) {
                const cap = existing.maxRelationship !== undefined ? existing.maxRelationship : 5;
                const clampedRel = Math.min(cap, Math.max(-3, rel));
                if (existing.relationship !== clampedRel) {
                    existing.relationship = clampedRel;
                    existing.relationshipLabel = getNpcRelTier(existing.relationship).label;
                }
            }
        }
        if (update.fact && typeof update.fact === 'string' && update.fact.trim() !== '') {
            const fact = update.fact.trim();
            if (!existing.knownFacts.includes(fact)) existing.knownFacts.push(fact);
        }
        if (update.goodMemory && typeof update.goodMemory === 'string' && update.goodMemory.trim() !== '') {
            const goodMemory = update.goodMemory.trim();
            if (!existing.goodMemories.includes(goodMemory)) existing.goodMemories.push(goodMemory);
        }
        if (update.badMemory && typeof update.badMemory === 'string' && update.badMemory.trim() !== '') {
            const badMemory = update.badMemory.trim();
            if (!existing.badMemories.includes(badMemory)) existing.badMemories.push(badMemory);
        }
        if (update.race !== undefined && typeof update.race === 'string') { const r = update.race.trim(); if (r) existing.race = r; }
        if (update.role !== undefined && typeof update.role === 'string') { const r = update.role.trim(); if (r) existing.role = r; }
        if (update.lastSeen !== undefined && typeof update.lastSeen === 'string') { const r = update.lastSeen.trim(); if (r) existing.lastSeen = r; }
        if (update.portraitHint !== undefined && typeof update.portraitHint === 'string') {
            const ph = update.portraitHint.trim();
            if (ph && existing.portraitHint !== ph) { existing.portraitHint = ph; generateNpcPortrait(existing); }
        }
        if (update.notes !== undefined && typeof update.notes === 'string') existing.notes = update.notes.trim();
    } else {
        let relationship = 0;
        if (update.relationship !== undefined) {
            const rel = parseInt(update.relationship);
            if (!isNaN(rel)) relationship = Math.min(5, Math.max(-3, rel));
        }
        const tier = NPC_REL_TIERS.find(t => t.value === relationship) || NPC_REL_TIERS[3];
        const name = sanitizedName;
        const race = (typeof update.race === 'string') ? update.race.trim() : '';
        const role = (typeof update.role === 'string') ? update.role.trim() : '';
        const gender = (typeof update.gender === 'string') ? update.gender.trim() : '';
        const portraitHint = (typeof update.portraitHint === 'string') ? update.portraitHint.trim() : '';
        const lastSeen = (typeof update.lastSeen === 'string' && update.lastSeen.trim() !== '') ? update.lastSeen.trim() : (state.gameState.location || '');
        const notes = (typeof update.notes === 'string') ? update.notes.trim() : '';
        const knownFacts = Array.isArray(update.fact) ? update.fact.filter(f => typeof f === 'string' && f.trim() !== '').map(f => f.trim()) : (typeof update.fact === 'string' && update.fact.trim() !== '') ? [update.fact.trim()] : [];
        const goodMemories = Array.isArray(update.goodMemory) ? update.goodMemory.filter(m => typeof m === 'string' && m.trim() !== '').map(m => m.trim()) : (typeof update.goodMemory === 'string' && update.goodMemory.trim() !== '') ? [update.goodMemory.trim()] : [];
        const badMemories = Array.isArray(update.badMemory) ? update.badMemory.filter(m => typeof m === 'string' && m.trim() !== '').map(m => m.trim()) : (typeof update.badMemory === 'string' && update.badMemory.trim() !== '') ? [update.badMemory.trim()] : [];
        const npc = { id: name.toLowerCase().replace(/\s+/g,'_') + '_' + Date.now(), name, race, role, gender, portrait: null, portraitHint, relationship, relationshipLabel: tier.label, knownFacts, goodMemories, badMemories, lastSeen, notes };
        if (update.maxRelationship !== undefined) {
            const cap = parseInt(update.maxRelationship);
            if (!isNaN(cap)) npc.maxRelationship = Math.min(5, Math.max(-3, cap));
        }
        if (Array.isArray(update.biases)) npc.biases = update.biases.filter(b => typeof b === 'string' && b.trim() !== '');
        if (typeof update.personality === 'string' && update.personality.trim() !== '') npc.personality = update.personality.trim();
        state.gameState.npcs.push(npc);
        generateNpcPortrait(npc);
    }
    saveGameStateFor(state.activeCharId, state.gameState);
    const panel = document.getElementById('npcModalContent');
    if (panel) renderNpcModalContent();
}

// Extracts a [TAG: content] block from text, correctly handling nested brackets/braces and strings.
// Returns { match: fullMatchString, content: innerContentString } or null.
