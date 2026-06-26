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

function createMessageEl(msg, idx) {
    const wrap = document.createElement('div');
    wrap.setAttribute('data-idx', idx);
    if (msg.role === 'dm') {
        wrap.className = 'message dm';
        let rollHtml = '';
        if (msg.rollResult) {
            const modDisplay = msg.rollResult.mod >= 0 ? `+${msg.rollResult.mod}` : `${msg.rollResult.mod}`;
            rollHtml = `<div class="roll-badge ${msg.rollResult.success?'success':'failure'}">${msg.rollResult.skill} d20=${msg.rollResult.roll}${modDisplay}=${msg.rollResult.total} ${msg.rollResult.success?'Éxito':'Fallo'}</div>`;
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
            const t = state.pendingRoll.trigger;
            const statVal = state.pendingRoll?.statValue || 10;
            const mod = Math.floor(((statVal)-10)/2);
            rollHtml = `<div class="roll-pending"><span class="roll-skill">${t.skill}</span><span class="roll-mod">${mod>=0?'+':''}${mod}</span><span class="roll-dc">DC ${t.dc}</span><button class="roll-btn" onclick="executeRoll(${idx})">→ Tirar</button></div>`;
        } else if (msg.roll) {
            const modDisplay = msg.roll.mod >= 0 ? `+${msg.roll.mod}` : `${msg.roll.mod}`;
            rollHtml = `<div class="roll-badge ${msg.roll.success?'success':'failure'}">${msg.roll.skill} d20=${msg.roll.roll}${modDisplay}=${msg.roll.total} ${msg.roll.success?'Éxito':'Fallo'}</div>`;
            // Show NPC opposed roll if present
            if (msg.npcRoll) {
                const npcModDisplay = msg.npcRoll.mod >= 0 ? `+${msg.npcRoll.mod}` : `${msg.npcRoll.mod}`;
                const npcClass = msg.npcRoll.playerWins ? 'npc-roll-lost' : 'npc-roll-won';
                const outcome = msg.npcRoll.playerWins ? '🗡️ Engaño logrado' : '👁️ NPC sospecha';
                rollHtml += `<div class="roll-badge npc-opposed ${npcClass}">NPC ${msg.npcRoll.skill} d20=${msg.npcRoll.roll}${npcModDisplay}=${msg.npcRoll.total} · ${outcome}</div>`;
            }
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

