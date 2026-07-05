// ===== UI =====

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
        const response = await fetch(AI_API_URL, {
            method:'POST',
            headers:{ 'Content-Type':'application/json','Authorization':`Bearer ${state.apiKey}` },
            body: JSON.stringify({ model: AI_MODELS[0], models: AI_MODELS, reasoning: { enabled: false, exclude: true }, messages:[{role:'system',content:system},{role:'user',content:recentHistory+'\n'+char.name+': '+text}], temperature:0.85, max_tokens:200 })
        });
        const data = await response.json();
        const reply = stripReasoning((data?.choices?.[0]?.message?.content || '').trim()).replace(/^[^:]+:\s*/,'');
        if (!reply) throw new Error(data?.error?.message || 'respuesta vacía de la IA');
        companionChats[activeChatCompanion].push({ role:'companion', content: reply });
        renderCompanionChat();
    } catch(e) {
        console.warn('Error en chat de compañero:', e);
        // Mensaje temático pero más informativo
        companionChats[activeChatCompanion].push({ role:'companion', content:'...*(El compañero parece distraído o no pudo responder en este momento)*...' });
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
    const slotsEl = document.getElementById('equippedSlots');

    // Render equipped slots panel
    if (slotsEl) {
        const eq = state.gameState.equipped || {};
        const slotDefs = [
            { key:'ropa',      icon:'👘', label:'Ropa' },
            { key:'arma',      icon:'⚔️', label:'Arma' },
            { key:'offhand',   icon:'🛡️', label:'Mano 2' },
            { key:'accesorio', icon:'💍', label:'Accesorio' }
        ];
        slotsEl.innerHTML = `
            <div style="font-size:0.75rem;color:var(--text-muted);font-family:'Cinzel',serif;letter-spacing:0.05em;margin-bottom:0.4rem">EQUIPADO ACTUALMENTE</div>
            <div class="equipped-grid">
                ${slotDefs.map(s => `
                    <div class="equipped-slot">
                        <span class="slot-icon">${s.icon}</span>
                        <div class="slot-info">
                            <div class="slot-label">${s.label}</div>
                            <div class="slot-value">${eq[s.key] || '<em style="color:var(--text-muted)">vacío</em>'}</div>
                        </div>
                        ${eq[s.key] ? `<button class="slot-unequip" onclick="unequipSlot('${s.key}')">✕</button>` : ''}
                    </div>`).join('')}
            </div>`;
    }

    if (!list) return;
    list.innerHTML = state.gameState.inventory.length === 0
        ? '<div class="inv-empty">La mochila está vacía</div>'
        : state.gameState.inventory.map((item,i) => {
            const itemName = typeof item === 'string' ? item : item.name;
            const itemType = typeof item === 'string' ? 'objeto' : (item.type || 'objeto');
            const itemRarity = typeof item === 'string' ? 'común' : (item.rarity || 'común');
            const itemDamage = typeof item === 'string' ? null : item.damage;

            // Determine which slot this item can equip to
            let equipSlot = null;
            if (itemType === 'arma') equipSlot = 'arma';
            else if (itemType === 'armadura') equipSlot = 'ropa';
            else if (['amuleto','anillo','componente'].includes(itemType) || itemName.toLowerCase().includes('amuleto') || itemName.toLowerCase().includes('collar') || itemName.toLowerCase().includes('anillo')) equipSlot = 'accesorio';

            let badge = '';
            if (itemType === 'arma' && itemDamage !== null) badge = `<span class="item-badge">d${itemDamage}</span>`;
            else if (itemType === 'armadura') badge = `<span class="item-badge">Armadura</span>`;
            else if (itemType === 'consumible') badge = `<span class="item-badge">Consumible</span>`;
            else if (itemType === 'tesoro') badge = `<span class="item-badge">Tesoro</span>`;

            const equipBtn = equipSlot
                ? `<button class="inv-equip" onclick="equipItem(${i},'${equipSlot}')" title="Equipar en ${equipSlot}">↑ Equipar</button>`
                : '';

            return `<div class="inv-item">
                <span>${itemName}</span>
                <span class="item-info">${itemType} (${itemRarity}) ${badge}</span>
                <div style="display:flex;gap:0.3rem;align-items:center">
                    ${equipBtn}
                    <button class="inv-remove" onclick="removeItem(${i})">✕</button>
                </div>
            </div>`;
        }).join('');
}

window.equipItem = function(idx, slot) {
    const item = state.gameState.inventory[idx];
    if (!item) return;
    const itemName = typeof item === 'string' ? item : item.name;
    if (!state.gameState.equipped) state.gameState.equipped = {};
    // If something was already in that slot, keep it (don't auto-add back to inventory to avoid clutter)
    state.gameState.equipped[slot] = itemName;
    // Remove from inventory
    state.gameState.inventory.splice(idx, 1);
    renderInventoryModal(); updateStatus();
    saveGameStateFor(state.activeCharId, state.gameState);
};

window.unequipSlot = function(slot) {
    if (!state.gameState.equipped) return;
    const val = state.gameState.equipped[slot];
    if (!val) return;
    state.gameState.equipped[slot] = '';
    // Add back to inventory as an item object
    state.gameState.inventory.push(createItemFromName(val));
    renderInventoryModal(); updateStatus();
    saveGameStateFor(state.activeCharId, state.gameState);
};

window.removeItem = function(idx) {
    state.gameState.inventory.splice(idx,1); renderInventoryModal(); updateStatus();
    saveGameStateFor(state.activeCharId, state.gameState);
};

function openKnowledgeModal() {
    document.getElementById('knowledgeModal').classList.remove('hidden');
    renderKnowledgeModalContent();
}

function renderKnowledgeModalContent() {
    const container = document.getElementById('knowledgeModalContent');
    if (!container) return;
    const knowledges = state.gameState.knowledges || [];
    const abilities  = state.gameState.learnedAbilities || [];
    const levelLabel = l => l===1 ? 'Básico' : l===2 ? 'Intermedio' : 'Avanzado';
    const typeIcon   = t => ({ magic:'✨', lore:'📜', language:'🗣️', skill:'⚙️', craft:'🔨' }[t] || '•');
    const catIcon    = c => ({ spell:'✨', combat:'⚔️', social:'💬', craft:'🔨', skill:'⚙️' }[c] || '•');

    const knSection = knowledges.length === 0
        ? '<div class="inv-empty">Sin conocimientos adicionales adquiridos.</div>'
        : knowledges.map(k => `
            <div class="npc-card" style="margin-bottom:0.5rem">
                <div style="display:flex;align-items:center;gap:0.5rem">
                    <span style="font-size:1.1rem">${typeIcon(k.type)}</span>
                    <div>
                        <div style="font-weight:600;color:var(--accent)">${k.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted)">${levelLabel(k.level)}${k.source ? ' · Fuente: '+k.source : ''}</div>
                        ${k.description ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.2rem">${k.description}</div>` : ''}
                    </div>
                </div>
            </div>`).join('');

    const abSection = abilities.length === 0
        ? '<div class="inv-empty">Sin habilidades adicionales aprendidas.</div>'
        : abilities.map(a => `
            <div class="npc-card" style="margin-bottom:0.5rem">
                <div style="display:flex;align-items:center;gap:0.5rem">
                    <span style="font-size:1.1rem">${catIcon(a.category)}</span>
                    <div>
                        <div style="font-weight:600;color:var(--accent)">${a.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted)">${a.category} · usa ${a.stat}${a.dcBonus ? ' · DC+'+a.dcBonus : ''}${a.source ? ' · '+a.source : ''}</div>
                        ${a.description ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.2rem">${a.description}</div>` : ''}
                    </div>
                </div>
            </div>`).join('');

    container.innerHTML = `
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem">
            Todo lo que ${state.character?.name} ha aprendido a lo largo de su historia.
        </div>
        <div style="font-size:0.85rem;font-family:Cinzel,serif;color:var(--accent);margin-bottom:0.4rem;border-bottom:1px solid var(--border);padding-bottom:0.3rem">📚 Conocimientos</div>
        ${knSection}
        <div style="font-size:0.85rem;font-family:Cinzel,serif;color:var(--accent);margin:0.75rem 0 0.4rem;border-bottom:1px solid var(--border);padding-bottom:0.3rem">⚡ Habilidades Activas</div>
        ${abSection}`;
}

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

function openMemoryModal() {
    const modal = document.getElementById('memoryModal');
    const content = document.getElementById('memoryModalContent');
    const turns = state.chatHistory.length;
    const hasLTM = !!state.gameState.longTermMemory;
    const ltmTurn = state.gameState.longTermMemoryTurn || 0;

    let html = `<div style="margin-bottom:0.75rem;padding:0.5rem 0.75rem;border-radius:6px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2)">
        <strong style="color:var(--accent)">Estado de la memoria</strong><br>
        💬 <strong>${turns}</strong> turnos en memoria activa (conversación reciente)<br>
        ${hasLTM
            ? `📜 Memoria consolidada activa — generada en turno ${ltmTurn}`
            : `⚠️ Sin memoria consolidada aún (se genera cada 10 turnos)`}
    </div>`;

    if (hasLTM) {
        try {
            const parsed = JSON.parse(state.gameState.longTermMemory);
            html += `<div style="margin-bottom:0.5rem"><strong style="color:var(--accent)">📍 Ubicación registrada</strong><br>${parsed.ubicacion_actual || '—'}</div>`;
            html += `<div style="margin-bottom:0.5rem"><strong style="color:var(--accent)">🎯 Razón de estar aquí</strong><br>${parsed.razon_en_ubicacion || '—'}</div>`;
            html += `<div style="margin-bottom:0.5rem"><strong style="color:var(--accent)">⚔️ Misión activa</strong><br>${parsed.mision_activa || '—'}</div>`;
            if (parsed.npcs_conocidos && parsed.npcs_conocidos.length > 0) {
                html += `<div style="margin-bottom:0.5rem"><strong style="color:var(--accent)">🎭 NPCs registrados</strong><br>`;
                html += parsed.npcs_conocidos.map(n =>
                    `<div style="padding:0.3rem 0;border-bottom:1px solid rgba(255,255,255,0.05)">
                        <strong>${n.nombre}</strong> · ${n.rol}<br>
                        <span style="color:#aaa">${n.datos_clave || ''}</span>
                    </div>`
                ).join('');
                html += `</div>`;
            }
            if (parsed.eventos_clave && parsed.eventos_clave.length > 0) {
                html += `<div style="margin-bottom:0.5rem"><strong style="color:var(--accent)">📋 Eventos clave</strong><br>`;
                html += parsed.eventos_clave.map(e => `<div style="padding:0.2rem 0">· ${e}</div>`).join('');
                html += `</div>`;
            }
            html += `<div style="margin-top:0.5rem;font-style:italic;color:#aaa">${parsed.resumen_narrativo || ''}</div>`;
        } catch(e) {
            html += `<pre style="white-space:pre-wrap;font-size:0.78rem">${state.gameState.longTermMemory}</pre>`;
        }
    } else {
        html += `<div style="color:#888;font-style:italic">La memoria se consolidará automáticamente en el turno ${10 - (turns % 10)} siguiente. Hasta entonces, la IA trabaja con los últimos 30 turnos de conversación directa.</div>`;
    }

    content.innerHTML = html;
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

// Shared roll badge builder (supports adv/dis dice, proficiency, crits)
function rollBadgeHtml(r) {
    if (!r) return '';
    const modDisplay = r.mod >= 0 ? `+${r.mod}` : `${r.mod}`;
    const profDisplay = r.prof ? `+${r.prof}🎓` : '';
    const diceDisplay = (r.rolls && r.rolls.length > 1)
        ? `${r.adv === 'ventaja' ? '⬆' : '⬇'}(${r.rolls.join('·')})→${r.roll}`
        : `${r.roll}`;
    const critClass = r.crit ? ' crit' : r.fumble ? ' fumble' : '';
    const outcome = r.crit ? '¡CRÍTICO!' : r.fumble ? '¡Pifia!' : r.success ? 'Éxito' : 'Fallo';
    return `<div class="roll-badge ${r.success ? 'success' : 'failure'}${critClass}">${r.skill} d20=${diceDisplay}${modDisplay}${profDisplay}=${r.total} ${outcome}</div>`;
}

// Pending-roll widget (works for both player-initiated and AI-requested rolls).
// statValue fallback: AI-requested rolls don't set it, so look it up from character stats.
function rollPendingHtml(idx) {
    const t = state.pendingRoll?.trigger;
    if (!t) return '';
    const statVal = state.pendingRoll?.statValue || state.character?.stats?.[t.stat] || 10;
    const mod = Math.floor((statVal - 10) / 2);
    const prof = typeof getProficiencyBonus === 'function' ? getProficiencyBonus(t.skill) : 0;
    const adv = combineAdvantage(t.adv || null, getConditionAdvantage());
    const advHtml = adv ? `<span class="roll-adv ${adv}">${adv === 'ventaja' ? '⬆ Ventaja' : '⬇ Desventaja'}</span>` : '';
    const profHtml = prof ? `<span class="roll-mod" title="Bono de competencia">+${prof}🎓</span>` : '';
    return `<div class="roll-pending"><span class="roll-skill">${t.skill}</span><span class="roll-mod">${mod>=0?'+':''}${mod}</span>${profHtml}${advHtml}<span class="roll-dc">DC ${t.dc}</span><button class="roll-btn" onclick="executeRoll(${idx})">→ Tirar</button></div>`;
}
function npcRollBadgeHtml(npcRoll) {
    if (!npcRoll) return '';
    const npcModDisplay = npcRoll.mod >= 0 ? `+${npcRoll.mod}` : `${npcRoll.mod}`;
    const npcClass = npcRoll.playerWins ? 'npc-roll-lost' : 'npc-roll-won';
    const outcome = npcRoll.playerWins ? '🗡️ Engaño logrado' : '👁️ NPC sospecha';
    return `<div class="roll-badge npc-opposed ${npcClass}">NPC ${npcRoll.skill} d20=${npcRoll.roll}${npcModDisplay}=${npcRoll.total} · ${outcome}</div>`;
}

function createMessageEl(msg, idx) {
    const wrap = document.createElement('div');
    wrap.setAttribute('data-idx', idx);
    if (msg.role === 'dm') {
        wrap.className = 'message dm';
        let rollHtml = '';
        if (msg.rollResult) {
            rollHtml = rollBadgeHtml(msg.rollResult);
        } else if (msg.roll) {
            // AI-requested roll already resolved on this DM message
            rollHtml = rollBadgeHtml(msg.roll) + npcRollBadgeHtml(msg.npcRoll);
        } else if (msg.rollPending && state.pendingRoll?.trigger) {
            // FIX: AI-requested rolls ([ROLL:] blocks) never rendered their dice widget —
            // the DM branch ignored rollPending, so the roll could never be executed.
            rollHtml = rollPendingHtml(idx);
        }
        wrap.innerHTML = `
            <div class="dm-header"><span class="dm-label">Maestro de Mazmorras</span><span class="dm-location">${msg.location||''} · ${msg.time||''}</span></div>
            <div class="dm-content">${msg.content}</div>
            ${rollHtml}
            ${msg.actions?.length ? `<div class="action-chips">${msg.actions.map(a=>`<button class="action-chip" onclick="useAction('${a.replace(/'/g,"\\'").replace(/"/g,'\\"')}')">↗ ${a}</button>`).join('')}</div>` : ''}`;
    } else {
        wrap.className = 'message player';
        let rollHtml = '';
        if (msg.rollState==='pending' && !msg.roll && state.pendingRoll?.trigger) {
            rollHtml = rollPendingHtml(idx);
        } else if (msg.roll) {
            rollHtml = rollBadgeHtml(msg.roll) + npcRollBadgeHtml(msg.npcRoll);
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
    if (el('goldDisplay')) el('goldDisplay').textContent = `${state.gameState.gold ?? 0}`;
    if (el('conditionsDisplay')) {
        const conds = state.gameState.conditions || [];
        el('conditionsDisplay').innerHTML = conds.length
            ? conds.map(c => { const d = CONDITIONS[c.id]; return d ? `<span class="cond-badge" title="${d.name} (${c.turns} turnos): ${d.desc}">${d.emoji}${c.turns}</span>` : ''; }).join('')
            : '';
        el('conditionsDisplay').style.display = conds.length ? '' : 'none';
    }
    if (el('locationDisplay')) el('locationDisplay').textContent = state.gameState.location;
    if (el('timeDisplay')) el('timeDisplay').textContent = state.gameState.timeOfDay;
    if (el('inventoryDisplay')) {
        if (state.gameState.inventory.length === 0) {
            el('inventoryDisplay').textContent = 'Vacío';
        } else {
            // Show first few items with details
            const itemsToShow = state.gameState.inventory.slice(0, 3);
            const itemTexts = itemsToShow.map(item => {
                const itemName = typeof item === 'string' ? item : item.name;
                const itemType = typeof item === 'string' ? 'objeto' : (item.type || 'objeto');
                return `${itemName} (${itemType})`;
            });
            let displayText = itemTexts.join(', ');
            if (state.gameState.inventory.length > 3) {
                displayText += `... (+${state.gameState.inventory.length - 3} más)`;
            }
            el('inventoryDisplay').textContent = displayText;
        }
    }
    // Add level, XP, and skill points display
    if (el('levelDisplay')) {
        const xpForNextLevel = (state.character.level + 1) * 100;
        const xpProgress = (state.character.experience / xpForNextLevel) * 100;
        el('levelDisplay').textContent = `Nivel ${state.character.level} (${state.character.experience}/${xpForNextLevel} XP) ${state.character.skillPoints > 0 ? `[${state.character.skillPoints} pts]` : ''}`;
    }
    updateMemoryIndicator();
}

// ===================== COMBAT PANEL =====================
function renderCombatPanel() {
    const panel = document.getElementById('combatPanel');
    if (!panel) return;
    const combat = state.gameState.combat;
    if (!combat?.active) {
        panel.classList.add('hidden');
        panel.innerHTML = '';
        return;
    }
    panel.classList.remove('hidden');
    panel.innerHTML = `
        <div class="combat-header">⚔️ COMBATE — Ronda ${combat.round} · Tu defensa: ${getPlayerDefense()}</div>
        <div class="combat-enemies">
            ${combat.enemies.map(e => {
                const pct = Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100));
                const color = pct > 60 ? '#4a7c59' : pct > 30 ? '#8a6a20' : '#7c4a4a';
                return `<div class="combat-enemy ${e.hp <= 0 ? 'dead' : ''}">
                    <div class="ce-name">${e.hp <= 0 ? '💀 ' : ''}${e.name}</div>
                    <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${pct}%;background:${color}"></div></div>
                    <div class="ce-hp">${e.hp}/${e.maxHp}</div>
                </div>`;
            }).join('')}
        </div>`;
}

// ===================== QUEST JOURNAL =====================
function openQuestModal() {
    const modal = document.getElementById('questModal');
    const content = document.getElementById('questModalContent');
    if (!modal || !content) return;
    const quests = state.gameState.quests || [];
    const statusDef = {
        activa:     { emoji:'🟡', label:'Activa',     color:'#c9a84c' },
        completada: { emoji:'✅', label:'Completada', color:'#4a7c59' },
        fallida:    { emoji:'❌', label:'Fallida',    color:'#7c4a4a' }
    };
    const order = { activa: 0, fallida: 1, completada: 2 };
    const sorted = quests.slice().sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
    content.innerHTML = sorted.length === 0
        ? '<div class="inv-empty">El diario está vacío. Las misiones que aceptes aparecerán aquí.</div>'
        : sorted.map(q => {
            const s = statusDef[q.status] || statusDef.activa;
            return `<div class="npc-card quest-card" style="margin-bottom:0.5rem;border-left:3px solid ${s.color}">
                <div style="display:flex;align-items:center;gap:0.5rem">
                    <span>${s.emoji}</span>
                    <div style="flex:1">
                        <div style="font-weight:600;color:var(--accent)">${q.title}</div>
                        <div style="font-size:0.72rem;color:${s.color}">${s.label}${q.created ? ' · ' + q.created : ''}</div>
                    </div>
                </div>
                ${(q.notes || []).length ? `<ul class="npc-list" style="margin-top:0.4rem">${q.notes.slice(-4).map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
            </div>`;
        }).join('');
    modal.classList.remove('hidden');
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
                <div class="level-info" style="margin-top:0.5rem; font-size:0.9rem;">
                    Nivel ${state.character.level}
                    (${state.character.experience}/${((state.character.level + 1) * 100)} XP)
                    ${state.character.skillPoints > 0 ? `[${state.character.skillPoints} puntos de habilidad disponibles]` : ''}
                </div>
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

