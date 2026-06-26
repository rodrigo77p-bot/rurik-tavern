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

// Helper function to convert item string to Item object (for backward compatibility)
function createItemFromName(itemName) {
    if (typeof itemName !== 'string') {
        return itemName;
    }

    const name = itemName.trim();
    if (!name) {
        return { name: 'Item desconocido', type: 'objeto', damage: null, rarity: 'común', description: '', equipped: false };
    }

    const lowerName = name.toLowerCase();
    let type = 'objeto';
    let damage = null;

    if (lowerName.includes('espada') || lowerName.includes('daga') || lowerName.includes('arco') ||
        lowerName.includes('hacha') || lowerName.includes('maz') || lowerName.includes('lanza') ||
        lowerName.includes('bastón') || lowerName.includes('club') || lowerName.includes('martillo')) {
        type = 'arma';
        damage = 6;
    } else if (lowerName.includes('armadura') || lowerName.includes('escudo') || lowerName.includes('ropa') ||
               lowerName.includes('vestiduras') || lowerName.includes('túnica') || lowerName.includes('capa') ||
               lowerName.includes('yelmo') || lowerName.includes('guantes') || lowerName.includes('botas')) {
        type = 'armadura';
    } else if (lowerName.includes('poción') || lowerName.includes('veneno') || lowerName.includes('curativa') ||
               lowerName.includes('antídoto') || lowerName.includes('aceite') || lowerName.includes('pergamino')) {
        type = 'consumible';
    } else if (lowerName.includes('moneda') || lowerName.includes('gem') || lowerName.includes('joya') ||
               lowerName.includes('arte') || lowerName.includes('tesoro')) {
        type = 'tesoro';
    } else if (lowerName.includes('componente') || lowerName.includes('herramienta') || lowerName.includes('kit') ||
               lowerName.includes('libro') || lowerName.includes('varita') || lowerName.includes('orbe') ||
               lowerName.includes('amuleto') || lowerName.includes('símbolo')) {
        type = 'componente';
    } else if (lowerName.includes('ración') || lowerName.includes('pan') || lowerName.includes('agua') ||
               lowerName.includes('vino') || lowerName.includes('comida') || lowerName.includes('hidromiel')) {
        type = 'ración';
    }

    return { name, type, damage, rarity: 'común', description: '', equipped: false };
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

// Data-driven action detection rules for improved maintainability
const ACTION_RULES = [
  {
    name: 'social',
    keywords: ['convencer', 'seducir', 'intimidar', 'mentir', 'pedir favor', 'flirtear', 'persuadir', 'engañar', 'actuar'],
    determine: (actionLower) => {
      let skill = 'Persuasión';
      if (actionLower.includes('seducir') || actionLower.includes('flirtear')) skill = 'Seducción';
      else if (actionLower.includes('intimidar')) skill = 'Intimidación';
      else if (actionLower.includes('mentir') || actionLower.includes('engañar')) skill = 'Engaño';
      else if (actionLower.includes('actuar')) skill = 'Actuación';

      // Determine DC based on target's disposition/willingness
      let dc = 12; // Default moderate (neutral disposition)
      let reason = "Chequeo social";

      if (actionLower.includes('amigo') || actionLower.includes('aliado') ||
          actionLower.includes('confía') || actionLower.includes('bien disposed')) {
        dc = 8;
        reason = "Persuadir a aliado dispuesto";
      }
      else if (actionLower.includes('enemigo') || actionLower.includes('hostil') ||
               actionLower.includes('resistente') || actionLower.includes('opuesto')) {
        dc = 15;
        reason = "Persuadir a enemigo u oponente";
      }
      else if (actionLower.includes('esceptico') || actionLower.includes('dudoso') ||
               actionLower.includes('desconfiado') || actionLower.includes('reacio')) {
        dc = 14;
        reason = "Persuadir a persona escéptica";
      }

      return { skill: skill, stat: 'CAR', dc, reason };
    }
  },
  {
    name: 'combat',
    keywords: ['atacar', 'pelear', 'golpear', 'disparar', 'lanzar arma', 'herir', 'herida'],
    determine: (actionLower) => {
      let skill = 'Ataque';
      let stat = 'FUE';

      if (actionLower.includes('disparar') || actionLower.includes('arma a distancia') ||
          actionLower.includes('arco') || actionLower.includes('ballesta')) {
        stat = 'DES';
      }

      // Determine DC based on opponent's defense/armor
      let dc = 12; // Default moderate
      let reason = "Ataque estándar";

      if (actionLower.includes('defensa débil') || actionLower.includes('desarmado') ||
          actionLower.includes('vulnerable')) {
        dc = 8;
        reason = "Ataque a objetivo vulnerable";
      }
      else if (actionLower.includes('armadura pesada') || actionLower.includes('defensa alta') ||
               actionLower.includes('protegido') || actionLower.includes('escudo')) {
        dc = 15;
        reason = "Ataque contra defensa alta";
      }

      return { skill: skill, stat: stat, dc: dc, reason: reason };
    }
  },
  {
    name: 'stealth',
    keywords: ['esconder', 'sigilo', 'moverse sin ser visto', 'robar', 'hurto', 'sigiloso', 'invisible'],
    determine: (actionLower) => {
      let skill = 'Sigilo';
      let stat = 'DES';

      // Determine DC based on environment vigilance
      let dc = 12; // Default moderate
      let reason = "Chequeo de sigilo";

      if (actionLower.includes('multitud') || actionLower.includes('lugar transitado') ||
          actionLower.includes('vigilado') || actionLower.includes('guardia')) {
        dc = 15;
        reason = "Sigilo en área vigilada";
      }
      else if (actionLower.includes('solo') || actionLower.includes('desierto') ||
               actionLower.includes('oscuro') || actionLower.includes('sin testigos')) {
        dc = 8;
        reason = "Sigilo en área desierta";
      }

      return { skill: skill, stat: stat, dc: dc, reason: reason };
    }
  },
  {
    name: 'magic',
    keywords: ['magia', 'hechizo', 'conjuro', 'arcano', 'hechizar', 'invocar'],
    determine: (actionLower) => {
      let skill = 'Magia';
      let stat = 'INT';

      // Determine DC based on spell complexity/power
      let dc = 12; // Default moderate
      let reason = "Conjuro estándar";

      if (actionLower.includes('simple') || actionLower.includes('menor') ||
          actionLower.includes('truco')) {
        dc = 8;
        reason = "Conjuro menor";
      }
      else if (actionLower.includes('poderoso') || actionLower.includes('mayor') ||
               actionLower.includes('épico') || actionLower.includes('legendario')) {
        dc = 15;
        reason = "Conjuro poderoso";
      }

      return { skill: skill, stat: stat, dc: dc, reason: reason };
    }
  },
  {
    name: 'investigation',
    keywords: ['investigar', 'examinar', 'buscar', 'inspeccionar', 'analizar', 'estudiar', 'rastrear'],
    determine: (actionLower) => {
      let skill = 'Investigación';
      let stat = 'INT';

      // Determine DC based on clue obscurity
      let dc = 12; // Default moderate
      let reason = "Investigación estándar";

      if (actionLower.includes('evidente') || actionLower.includes('obvio') ||
          actionLower.includes('claro')) {
        dc = 8;
        reason = "Investigación de evidencia evidente";
      }
      else if (actionLower.includes('oculto') || actionLower.includes('secreto') ||
               actionLower.includes('difícil de encontrar') || actionLower.includes('pista tenue')) {
        dc = 15;
        reason = "Investigación de evidencia oculta";
      }

      return { skill: skill, stat: stat, dc: dc, reason: reason };
    }
  },
  {
    name: 'perception',
    keywords: ['escuch', 'oir', 'ver', 'mir', 'detect', 'sent', 'percib', 'intui', 'observar', 'notar', 'percibir'],
    determine: (actionLower) => {
      // Use root-based detection for perception (more flexible)
      const perceptionRoots = ['escuch', 'oir', 'ver', 'mir', 'detect', 'sent', 'percib', 'intui'];
      const hasPerceptionRoot = perceptionRoots.some(root => actionLower.includes(root));

      if (!hasPerceptionRoot) {
        return null; // Not a perception action
      }

      let skill = 'Percepción';
      let stat = 'SAB';

      // Determine DC based on subtlety of what's being perceived
      let dc = 12; // Default moderate
      let reason = "Chequeo de percepción";

      if (actionLower.includes('fuerte') || actionLower.includes('evidente') ||
          actionLower.includes('notorio') || actionLower.includes('obvio')) {
        dc = 8;
        reason = "Percepción de estímulo evidente";
      }
      else if (actionLower.includes('sutil') || actionLower.includes('oculto') ||
               actionLower.includes('susurro') || actionLower.includes('lejos') ||
               actionLower.includes('débil') || actionLower.includes('tenue')) {
        dc = 15;
        reason = "Percepción de estímulo sutil";
      }

      return { skill: skill, stat: stat, dc: dc, reason: reason };
    }
  },
  {
    name: 'athletic',
    keywords: ['saltar', 'trepar', 'correr', 'nadar', 'equilibrio', 'atlético', 'fuerza bruta'],
    determine: (actionLower) => {
      let skill = 'Atletismo';
      // Could be FUE or DES depending on the action
      let stat = 'FUE'; // Default to strength

      if (actionLower.includes('equilibrio') || actionLower.includes('acrobacia') ||
          actionLower.includes('flexibilidad') || actionLower.includes('agilidad')) {
        stat = 'DES';
      }

      // Determine DC based on obstacle difficulty
      let dc = 12; // Default moderate
      let reason = "Chequeo atlético";

      if (actionLower.includes('fácil') || actionLower.includes('sencillo') ||
          actionLower.includes('bajo')) {
        dc = 8;
        reason = "Actividad atlética sencilla";
      }
      else if (actionLower.includes('difícil') || actionLower.includes('complicado') ||
               actionLower.includes('alto') || actionLower.includes('pesado') ||
               actionLower.includes('extremo')) {
        dc = 15;
        reason = "Actividad atlética difícil";
      }

      return { skill: skill, stat: stat, dc: dc, reason: reason };
    }
  },
  {
    name: 'resistance',
    keywords: ['resistir', 'aguantar', 'soportar', 'tolerar', 'veneno', 'enfermedad', 'dolor', 'miedo'],
    determine: (actionLower) => {
      let skill = 'Constitución';
      let stat = 'CON';

      // Determine DC based on effect intensity
      let dc = 12; // Default moderate
      let reason = "Tirada de resistencia";

      if (actionLower.includes('leve') || actionLower.includes('suave') ||
          actionLower.includes('mínimo')) {
        dc = 8;
        reason = "Resistencia a efecto leve";
      }
      else if (actionLower.includes('intenso') || actionLower.includes('fuerte') ||
               actionLower.includes('grave') || actionLower.includes('letal') ||
               actionLower.includes('mortal')) {
        dc = 15;
        reason = "Resistencia a efecto intenso";
      }

      return { skill: skill, stat: stat, dc: dc, reason: reason };
    }
  },
  {
    name: 'knowledge',
    keywords: ['recordar', 'saber', 'conocer', 'lore', 'historia', 'identificar', 'descifrar', 'tradición'],
    determine: (actionLower) => {
      let skill = 'Historia';
      let stat = 'INT';

      // Determine DC based on obscurity of knowledge
      let dc = 12; // Default moderate
      let reason = "Chequeo de conocimiento";

      if (actionLower.includes('común') || actionLower.includes('básico') ||
          actionLower.includes('known') || actionLower.includes('evidente')) {
        dc = 8;
        reason = "Conocimiento común";
      }
      else if (actionLower.includes('arcano') || actionLower.includes('antiguo') ||
               actionLower.includes('olvidado') || actionLower.includes('secreto') ||
               actionLower.includes('misterioso') || actionLower.includes('legendario')) {
        dc = 15;
        reason = "Conocimiento arcano o antiguo";
      }

      return { skill: skill, stat: stat, dc: dc, reason: reason };
    }
  },
  {
    name: 'healing',
    keywords: ['curar', 'sanar', 'medicina', 'tratamiento', 'cuidar', 'aliviar', 'herida'],
    determine: (actionLower) => {
      let skill = 'Medicina';
      let stat = 'SAB';

      // Determine DC based on injury severity
      let dc = 12; // Default moderate
      let reason = "Chequeo de medicina";

      if (actionLower.includes('herida leve') || actionLower.includes('rasguño') ||
          actionLower.includes('moretón')) {
        dc = 8;
        reason = "Curación de herida leve";
      }
      else if (actionLower.includes('herida grave') || actionLower.includes('sangrado') ||
               actionLower.includes('herida profunda') || actionLower.includes('fractura')) {
        dc = 15;
        reason = "Curación de herida grave";
      }

      return { skill: skill, stat: stat, dc: dc, reason: reason };
    }
  }
];

// Refactored guessRequiredRoll function using data-driven approach
function guessRequiredRoll(action) {
    const actionLower = action.toLowerCase();

    // Try each rule in order
    for (const rule of ACTION_RULES) {
        // Check if any keyword matches
        if (rule.keywords.some(keyword => actionLower.includes(keyword))) {
            return rule.determine(actionLower);
        }
    }

    // Default to no roll for movement without obstacles, thoughts, passive actions
    return null;
}

function getRecentHistory() {
    // Get last 3 exchanges (player + DM pairs) or fewer if not available
    const recentExchanges = [];
    const chatHistory = state.chatHistory;

    // Start from the end and go backwards, collecting up to 3 exchanges
    let i = chatHistory.length - 1;
    let exchangesCollected = 0;

    while (i >= 0 && exchangesCollected < 3) {
        // Look for a player message followed by a DM message (or vice versa)
        if (chatHistory[i].role === 'player') {
            // Found player message, look for preceding DM message if available
            const playerMsg = chatHistory[i];
            let dmMsg = null;

            // Check if there's a DM message before this player message
            if (i > 0 && chatHistory[i-1].role === 'dm') {
                dmMsg = chatHistory[i-1];
                recentExchanges.unshift({ dm: dmMsg, player: playerMsg });
                i -= 2; // Skip both messages
            } else {
                // No preceding DM message, just add the player message
                recentExchanges.unshift({ player: playerMsg });
                i -= 1;
            }
            exchangesCollected++;
        } else if (chatHistory[i].role === 'dm') {
            // Found DM message, look for following player message if available
            const dmMsg = chatHistory[i];
            let playerMsg = null;

            // Check if there's a player message after this DM message
            if (i < chatHistory.length - 1 && chatHistory[i+1].role === 'player') {
                playerMsg = chatHistory[i+1];
                recentExchanges.unshift({ dm: dmMsg, player: playerMsg });
                i += 2; // Skip both messages
            } else {
                // No following player message, just add the DM message
                recentExchanges.unshift({ dm: dmMsg });
                i += 1;
            }
            exchangesCollected++;
        } else {
            i -= 1;
        }
    }

    // Format the recent exchanges into a string
    if (recentExchanges.length === 0) {
        return "Inicio de la partida.";
    }

    let historyString = "";
    recentExchanges.forEach((exchange, index) => {
        if (exchange.dm && exchange.player) {
            historyString += `- Maestra: "${exchange.dm.content.substring(0, 100)}${exchange.dm.content.length > 100 ? '...' : ''}"\n`;
            historyString += `- Jugador: "${exchange.player.content.substring(0, 100)}${exchange.player.content.length > 100 ? '...' : ''}"\n`;
        } else if (exchange.dm) {
            historyString += `- Maestra: "${exchange.dm.content.substring(0, 100)}${exchange.dm.content.length > 100 ? '...' : ''}"\n`;
        } else if (exchange.player) {
            historyString += `- Jugador: "${exchange.player.content.substring(0, 100)}${exchange.player.content.length > 100 ? '...' : ''}"\n`;
        }
    });

    return historyString.trim();
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

// Skills that trigger an opposed NPC roll
const OPPOSED_ROLL_SKILLS = {
    'Engaño':     { npcSkill: 'Perspicacia', npcStat: 'SAB', label: 'Perspicacia del NPC' },
    'Actuación':  { npcSkill: 'Perspicacia', npcStat: 'SAB', label: 'Perspicacia del NPC' },
    'Seducción':  { npcSkill: 'Perspicacia', npcStat: 'SAB', label: 'Perspicacia del NPC' },
    'Persuasión': { npcSkill: 'Perspicacia', npcStat: 'SAB', label: 'Perspicacia del NPC' },
    'Intimidación': { npcSkill: 'Resistencia', npcStat: 'CON', label: 'Resistencia del NPC' },
};

// Estimate NPC SAB/CON based on their relationship tier and role keywords
function estimateNpcStat(stat) {
    // Find the most recently referenced NPC in the last DM message
    const lastDM = state.chatHistory.findLast(m => m.role === 'dm');
    const npcList = state.gameState.npcs || [];
    let targetNpc = null;

    if (lastDM && npcList.length > 0) {
        // Find which registered NPC appears in the last DM message
        for (const npc of npcList) {
            if (lastDM.content && lastDM.content.toLowerCase().includes(npc.name.toLowerCase())) {
                targetNpc = npc;
                break;
            }
        }
    }

    // Base stat: 10 (average human). Adjust by role keywords.
    let base = 10;
    if (targetNpc) {
        const role = (targetNpc.role || '').toLowerCase();
        const personality = (targetNpc.personality || '').toLowerCase();
        // Wise/perceptive roles get higher SAB
        if (stat === 'SAB') {
            if (/mago|sabio|oráculo|sacerdote|druida|espía|detective|guard/.test(role)) base = 13;
            if (/lord|noble|rey|comandante|líder/.test(role)) base = 12;
            if (/astuto|sagaz|perceptivo|desconfiado/.test(personality)) base += 2;
            if (/ingenuo|simple|confiado/.test(personality)) base -= 2;
        }
        // CON for intimidation resistance
        if (stat === 'CON') {
            if (/guerrero|soldado|guard|mercenario|campeón/.test(role)) base = 13;
            if (/anciano|débil|asustado/.test(role + personality)) base = 8;
        }
    }
    return Math.max(6, Math.min(18, base));
}

window.executeRoll = async function(dmMsgIdx) {
    if (!state.pendingRoll) return;
    const { trigger, statValue } = state.pendingRoll;
    state.pendingRoll = null;
    const statVal = statValue || 10;
    const result = { ...rollD20(statVal, trigger.dc), skill: trigger.skill };

    // Track skill usage
    const category = guessSkillCategory(trigger.skill);
    state.gameState.skillUses[category]++;
    updateClassEvolution();

    // Build base roll message
    const mod = result.mod >= 0 ? '+'+result.mod : result.mod;
    let rollMsg = `[Tirada de ${trigger.skill}: d20=${result.roll} ${mod} = ${result.total} vs DC ${trigger.dc} → ${result.success ? '¡ÉXITO!' : 'FALLO'}]`;

    // Opposed NPC roll for social skills
    const opposedDef = OPPOSED_ROLL_SKILLS[trigger.skill];
    let npcRollResult = null;
    if (opposedDef) {
        const npcStatVal = estimateNpcStat(opposedDef.npcStat);
        const npcRoll = Math.floor(Math.random() * 20) + 1;
        const npcMod = Math.floor((npcStatVal - 10) / 2);
        const npcTotal = npcRoll + npcMod;
        const npcModStr = npcMod >= 0 ? '+' + npcMod : '' + npcMod;
        const playerWins = result.total >= npcTotal;

        npcRollResult = { skill: opposedDef.npcSkill, stat: opposedDef.npcStat, roll: npcRoll, mod: npcMod, total: npcTotal, playerWins };

        rollMsg += `\n[${opposedDef.label}: d20=${npcRoll} ${npcModStr} = ${npcTotal}]`;
        rollMsg += `\n[RESULTADO OPUESTO: jugador ${result.total} vs NPC ${npcTotal} → ${playerWins ? 'JUGADOR GANA — el NPC no detecta el engaño / acepta' : 'NPC GANA — el NPC sospecha o resiste'}]`;
        rollMsg += `\nIMPORTANTE PARA EL NARRADOR: ${playerWins
            ? `El NPC no detecta nada sospechoso. Narra que acepta o cree al jugador.`
            : `El NPC supera la tirada del jugador. Narra que el NPC sospecha, hace una pregunta difícil, o directamente descubre el engaño. La reacción debe ser proporcional a la diferencia (${npcTotal - result.total} puntos de ventaja NPC).`}`;
    }

    // Update player message to show roll result inline (include NPC roll if any)
    if (state.chatHistory[dmMsgIdx]) {
        state.chatHistory[dmMsgIdx].roll = result;
        state.chatHistory[dmMsgIdx].npcRoll = npcRollResult;
        state.chatHistory[dmMsgIdx].rollState = null;
        const container = document.getElementById('chatContainer');
        const existing = container?.querySelector(`[data-idx="${dmMsgIdx}"]`);
        if (existing) existing.replaceWith(createMessageEl(state.chatHistory[dmMsgIdx], dmMsgIdx));
    }

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

// Experience and leveling system
function addExperience(amount) {
    if (!state.character) return;

    state.character.experience += amount;

    // XP needed for next level: level * 100 (so level 2 needs 200 XP total, level 3 needs 300, etc.)
    // This means to go from level N to N+1, you need (N+1) * 100 XP
    const xpForNextLevel = (state.character.level + 1) * 100;

    // Check if we've leveled up
    while (state.character.experience >= xpForNextLevel) {
        state.character.experience -= xpForNextLevel;
        state.character.level++;
        state.character.skillPoints += 2; // Grant 2 skill points per level up

        // Check for class evolution after leveling up (since stats might have increased via skill points)
        updateClassEvolution();

        // Update xpForNextLevel for the new level
        xpForNextLevel = (state.character.level + 1) * 100;

        // Notify player of level up
        addDMMessage(`¡Has alcanzado el nivel ${state.character.level}! Has ganado 2 puntos de habilidad para asignar a tus estadísticas.`);

        // Update UI
        updateStatus();
        updatePartyPanel();
    }

    // Save game state
    saveGameStateFor(state.activeCharId, state.gameState);
}

window.useAction = function(text) {
    var input = document.getElementById('playerInput');
    if (!input) { console.error('useAction: playerInput not found'); return; }
    state.pendingRoll = null;
    state.skipPreRoll = true;   // bypass guessRequiredRoll in sendMessage
    input.value = text;
    if (typeof window._sendMessage === 'function') {
        window._sendMessage();
    } else {
        // fallback: click the button
        var btn = document.getElementById('sendBtn');
        if (btn) btn.click();
        else console.error('useAction: _sendMessage not available and sendBtn not found');
    }
};
