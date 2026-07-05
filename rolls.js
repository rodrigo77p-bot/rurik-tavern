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
        lowerName.includes('bastón') || lowerName.includes('club') || lowerName.includes('martillo') ||
        lowerName.includes('cuchillo') || lowerName.includes('ballesta') || lowerName.includes('estoque') ||
        lowerName.includes('cimitarra') || lowerName.includes('mandoble') || lowerName.includes('garrote')) {
        type = 'arma';
        damage = getWeaponDamage(name).die; // die by weapon type (d4-d12)
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

function rollD20(statValue, dc, opts) {
    opts = opts || {};
    const r1 = Math.floor(Math.random()*20)+1;
    let roll = r1;
    const rolls = [r1];
    if (opts.adv === 'ventaja' || opts.adv === 'desventaja') {
        const r2 = Math.floor(Math.random()*20)+1;
        rolls.push(r2);
        roll = opts.adv === 'ventaja' ? Math.max(r1, r2) : Math.min(r1, r2);
    }
    const mod = Math.floor((statValue-10)/2);
    const prof = opts.prof || 0;
    const total = roll + mod + prof;
    const crit = roll === 20;
    const fumble = roll === 1;
    // Nat 20 always succeeds, nat 1 always fails
    const success = crit ? true : fumble ? false : total >= dc;
    return { roll, rolls, adv: opts.adv || null, mod, prof, total, dc, success, crit, fumble };
}

// Net advantage/disadvantage from active conditions
function getConditionAdvantage() {
    const conds = state.gameState.conditions || [];
    let adv = false, dis = false;
    for (const c of conds) {
        const def = CONDITIONS[c.id];
        if (!def) continue;
        if (def.effect === 'adv') adv = true;
        if (def.effect === 'dis') dis = true;
    }
    return (adv && dis) ? null : adv ? 'ventaja' : dis ? 'desventaja' : null;
}
// Combine AI-requested adv with condition-derived adv (they cancel out)
function combineAdvantage(a, b) {
    const set = new Set([a, b].filter(Boolean));
    if (set.has('ventaja') && set.has('desventaja')) return null;
    return set.has('ventaja') ? 'ventaja' : set.has('desventaja') ? 'desventaja' : null;
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
    const statVal = statValue || (state.character?.stats?.[trigger.stat] ?? 10);

    // Advantage: AI request + active conditions (cancel each other out)
    const adv = combineAdvantage(trigger.adv || null, getConditionAdvantage());
    // Proficiency bonus from class/learned knowledges
    const prof = getProficiencyBonus(trigger.skill);

    const result = { ...rollD20(statVal, trigger.dc, { adv, prof }), skill: trigger.skill };

    // Track skill usage
    const category = guessSkillCategory(trigger.skill);
    if (!state.gameState.skillUses) state.gameState.skillUses = { combat:0, magic:0, stealth:0, social:0, nature:0 };
    state.gameState.skillUses[category] = (state.gameState.skillUses[category] || 0) + 1;
    updateClassEvolution();

    // Build base roll message
    const mod = result.mod >= 0 ? '+'+result.mod : result.mod;
    const profStr = result.prof ? ` +${result.prof}(competencia)` : '';
    const advStr = result.adv ? ` [${result.adv.toUpperCase()}: dados ${result.rolls.join('/')}]` : '';
    const critStr = result.crit ? ' ¡CRÍTICO NATURAL 20!' : result.fumble ? ' ¡PIFIA NATURAL 1!' : '';
    let rollMsg = `[Tirada de ${trigger.skill}: d20=${result.roll}${advStr} ${mod}${profStr} = ${result.total} vs DC ${trigger.dc} → ${result.success ? '¡ÉXITO!' : 'FALLO'}${critStr}]`;
    if (result.crit) rollMsg += `\n[NARRADOR: éxito crítico — el resultado debe ser excepcionalmente bueno, más de lo que el jugador esperaba.]`;
    if (result.fumble) rollMsg += `\n[NARRADOR: pifia — el fallo tiene una consecuencia negativa adicional, cómica o peligrosa.]`;

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
// NOTE: xpForNextLevel was previously a `const` reassigned inside the loop → TypeError
// that silently aborted the DM response on every level-up. Fixed with `let`.
function addExperience(amount) {
    if (!state.character) return;

    state.character.experience += amount;

    let xpForNextLevel = (state.character.level + 1) * 100;

    while (state.character.experience >= xpForNextLevel) {
        state.character.experience -= xpForNextLevel;
        state.character.level++;
        state.character.skillPoints += 2;
        applyLevelUp(state.character.level);
        updateClassEvolution();
        xpForNextLevel = (state.character.level + 1) * 100;
    }

    updateCharData(state.character);
    updateStatus();
    updatePartyPanel();
    saveGameStateFor(state.activeCharId, state.gameState);
}

// Real level progression: max HP by class hit die + new class ability at odd levels
function applyLevelUp(newLevel) {
    const die = CLASS_HIT_DIE[state.character.classe] || 8;
    const conMod = Math.floor((state.character.stats.CON - 10) / 2);
    const hpGain = Math.max(1, Math.ceil(die / 2) + conMod); // average of hit die + CON mod
    state.gameState.maxHp += hpGain;
    state.gameState.hp = Math.min(state.gameState.maxHp, state.gameState.hp + hpGain);

    let msg = `⬆️ ¡Has alcanzado el nivel ${newLevel}! +${hpGain} HP máximo (ahora ${state.gameState.maxHp}). +2 puntos de habilidad (usa /asignar <stat> <puntos>).`;

    // New class ability at levels 3, 5, 7, 9...
    if (newLevel >= 3 && newLevel % 2 === 1) {
        const pool = CLASS_LEVEL_ABILITIES[state.character.classe] || [];
        if (!Array.isArray(state.gameState.learnedAbilities)) state.gameState.learnedAbilities = [];
        const next = pool.find(a => !state.gameState.learnedAbilities.find(l => l.id === a.id));
        if (next) {
            state.gameState.learnedAbilities.push({ ...next, source: `Nivel ${newLevel}` });
            msg += `\n⚡ Nueva habilidad de clase: ${next.name} — ${next.description}`;
        }
    }
    addDMMessage(msg);
}

// ===================== STRUCTURED COMBAT SYSTEM =====================
// Lightweight: the app owns all numbers (enemy HP, damage, defense), the AI only narrates.

function getPlayerDefense() {
    const dexMod = Math.floor(((state.character?.stats?.DES ?? 10) - 10) / 2);
    const eq = state.gameState.equipped || {};
    const ropa = (eq.ropa || '').toLowerCase();
    let armor = 0;
    if (/placas|malla completa/.test(ropa)) armor = 4;
    else if (/malla|escamas/.test(ropa)) armor = 3;
    else if (/cuero endurecido|cuero tachonado/.test(ropa)) armor = 2;
    else if (/cuero|armadura/.test(ropa)) armor = 1;
    const shield = /escudo/.test((eq.offhand || '').toLowerCase()) ? 2 : 0;
    return 10 + dexMod + armor + shield;
}

function startCombat(data) {
    const enemies = (data.enemies || []).slice(0, 4).map((e, i) => {
        const base = (e.ref && BESTIARY[e.ref]) ? BESTIARY[e.ref] : {};
        const hp = e.hp ?? base.hp ?? 10;
        return {
            id: ((e.id || e.ref || 'enemigo') + '_' + i),
            name: e.name || base.name || 'Enemigo',
            hp, maxHp: hp,
            attackBonus: e.attackBonus ?? base.attackBonus ?? 2,
            damage: e.damage || base.damage || 'd6',
            xp: e.xp ?? base.xp ?? 25,
            condition: e.condition || base.condition || null
        };
    });
    if (!enemies.length) return;
    state.gameState.combat = { active: true, round: 1, enemies };
    renderCombatPanel();
}

function endCombat(outcome) {
    if (!state.gameState.combat) return;
    state.gameState.combat = null;
    renderCombatPanel();
    saveGameStateFor(state.activeCharId, state.gameState);
}

// Which enemy is the player attacking? Match name words in their last message, else first alive.
function findTargetEnemy() {
    const combat = state.gameState.combat;
    if (!combat?.active) return null;
    const alive = combat.enemies.filter(e => e.hp > 0);
    if (!alive.length) return null;
    const lastPlayer = state.chatHistory.findLast(m => m.role === 'player');
    if (lastPlayer?.content) {
        const text = lastPlayer.content.toLowerCase();
        for (const e of alive) {
            const words = e.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            if (words.some(w => text.includes(w))) return e;
        }
    }
    return alive[0];
}

function isAttackRoll(rollResult) {
    if (!rollResult) return false;
    const skill = rollResult.skill || '';
    return ['Ataque', 'Combate', 'Fuerza', 'Magia'].includes(skill) || guessSkillCategory(skill) === 'combat';
}

// Runs after each player action while combat is active.
// Returns a context string describing damage dealt + enemy turn, for the AI to narrate.
function processCombatTurn(rollResult) {
    const combat = state.gameState.combat;
    if (!combat?.active) return '';
    let msg = '';

    // 1. Player damage on successful attack roll
    if (rollResult && rollResult.success && isAttackRoll(rollResult)) {
        const target = findTargetEnemy();
        if (target) {
            const weapon = (state.gameState.equipped?.arma) || 'puños';
            const dmg = rollWeaponDamage(weapon, rollResult.crit);
            target.hp = Math.max(0, target.hp - dmg.total);
            msg += `\n[DAÑO INFLIGIDO: ${dmg.total} (d${dmg.die}${dmg.crit ? ' x2 CRÍTICO' : ''}${dmg.bonus ? '+' + dmg.bonus : ''}) con ${weapon} a ${target.name} → HP ${target.hp}/${target.maxHp}]`;
            if (target.hp <= 0) {
                msg += `\n[ENEMIGO DERROTADO: ${target.name}. Narra su caída.]`;
                addExperience(target.xp || 25);
            }
        }
    }

    // 2. Victory check
    const alive = combat.enemies.filter(e => e.hp > 0);
    if (!alive.length) {
        const totalXp = combat.enemies.reduce((a, e) => a + (e.xp || 25), 0);
        endCombat('victoria');
        msg += `\n[COMBATE TERMINADO: VICTORIA. Todos los enemigos han caído. Narra el final del combate y el botín razonable si procede (+${totalXp} XP ya otorgados).]`;
        return msg;
    }

    // 3. Enemy turn: each living enemy attacks the player
    const defense = getPlayerDefense();
    for (const e of alive) {
        const atkRoll = Math.floor(Math.random() * 20) + 1;
        const atkTotal = atkRoll + (e.attackBonus || 0);
        const critHit = atkRoll === 20;
        if (atkRoll !== 1 && (critHit || atkTotal >= defense)) {
            let dmg = rollDieExpr(e.damage);
            if (critHit) dmg += rollDieExpr(e.damage);
            state.gameState.hp = Math.max(0, state.gameState.hp - dmg);
            msg += `\n[TURNO ENEMIGO: ${e.name} ataca d20=${atkRoll}+${e.attackBonus}=${atkTotal} vs Defensa ${defense} → IMPACTA${critHit ? ' (CRÍTICO)' : ''}, ${dmg} de daño. HP del jugador: ${state.gameState.hp}/${state.gameState.maxHp}]`;
            // Some monsters inflict a condition on hit (25% chance)
            if (e.condition && CONDITIONS[e.condition] && Math.random() < 0.25) {
                processConditionUpdate({ add: [{ id: e.condition, turns: 3 }] });
                msg += `\n[CONDICIÓN APLICADA: el golpe de ${e.name} te deja ${CONDITIONS[e.condition].name.toLowerCase()}]`;
            }
            if (state.gameState.hp <= 0) break; // player is down, stop the round
        } else {
            msg += `\n[TURNO ENEMIGO: ${e.name} ataca d20=${atkRoll}+${e.attackBonus}=${atkTotal} vs Defensa ${defense} → FALLA]`;
        }
    }
    combat.round++;
    renderCombatPanel();
    return msg;
}

// ===================== CONDITIONS =====================
function processConditionUpdate(c) {
    if (!c) return;
    if (!Array.isArray(state.gameState.conditions)) state.gameState.conditions = [];
    for (const add of (c.add || [])) {
        const id = (typeof add === 'string' ? add : (add.id || '')).toLowerCase().trim();
        if (!CONDITIONS[id]) continue;
        const turns = (typeof add === 'object' && add.turns) ? Math.min(10, Math.max(1, parseInt(add.turns) || 3)) : 3;
        const existing = state.gameState.conditions.find(x => x.id === id);
        if (existing) existing.turns = Math.max(existing.turns, turns);
        else state.gameState.conditions.push({ id, turns });
    }
    for (const rem of (c.remove || [])) {
        const id = (typeof rem === 'string' ? rem : (rem.id || '')).toLowerCase().trim();
        state.gameState.conditions = state.gameState.conditions.filter(x => x.id !== id);
    }
    updateStatus();
}

// Called once per player turn: applies damage-over-time and decrements durations.
// Returns a context string for the AI.
function tickConditions() {
    const conds = state.gameState.conditions || [];
    if (!conds.length) return '';
    const msgs = [];
    for (const c of conds) {
        const def = CONDITIONS[c.id];
        if (!def) continue;
        if (def.dot) {
            const dmg = Math.floor(Math.random() * def.dot) + 1;
            state.gameState.hp = Math.max(0, state.gameState.hp - dmg);
            msgs.push(`${def.name}: ${dmg} de daño`);
        }
        c.turns--;
    }
    const expired = conds.filter(c => c.turns <= 0);
    state.gameState.conditions = conds.filter(c => c.turns > 0);
    for (const e of expired) msgs.push(`${CONDITIONS[e.id]?.name || e.id} ha terminado`);
    return msgs.length ? `\n[CONDICIONES ESTE TURNO: ${msgs.join('; ')}. HP: ${state.gameState.hp}/${state.gameState.maxHp}]` : '';
}

// ===================== GOLD =====================
function applyGoldUpdate(g) {
    if (!g) return;
    const delta = Math.round(Number(g.delta));
    if (isNaN(delta) || delta === 0) return;
    state.gameState.gold = Math.max(0, (state.gameState.gold || 0) + delta);
    updateStatus();
}

// ===================== QUEST JOURNAL =====================
function processQuestUpdate(q) {
    if (!q || (!q.title && !q.id)) return;
    if (!Array.isArray(state.gameState.quests)) state.gameState.quests = [];
    const id = (q.id || q.title).toLowerCase().replace(/\s+/g, '_').slice(0, 40);
    const status = ['activa', 'completada', 'fallida'].includes(q.status) ? q.status : 'activa';
    const existing = state.gameState.quests.find(x => x.id === id);
    if (existing) {
        existing.status = status;
        if (q.title) existing.title = q.title;
        if (q.note && typeof q.note === 'string') {
            if (!Array.isArray(existing.notes)) existing.notes = [];
            if (!existing.notes.includes(q.note)) existing.notes.push(q.note);
        }
    } else {
        state.gameState.quests.push({ id, title: q.title || id, status, notes: (q.note && typeof q.note === 'string') ? [q.note] : [], created: new Date().toISOString().slice(0, 10) });
    }
}

// ===================== DEATH SAVES =====================
// At 0 HP the character is dying, not dead: d20 per save.
// >=10 success, <10 fail, nat 20 revives with 1 HP, nat 1 counts as 2 fails.
// 3 successes → stabilized (1 HP, unconscious). 3 fails → permanent death.
function startDying(deathNarration) {
    state.gameState.hp = 0;
    state.dying = { successes: 0, failures: 0, deathNarration: deathNarration || null };
    const input = document.getElementById('playerInput');
    const btn = document.getElementById('sendBtn');
    if (input) input.disabled = true;
    if (btn) btn.disabled = true;
    renderDeathSaveWidget();
    updateStatus();
}

window.rollDeathSave = async function() {
    const d = state.dying;
    if (!d) return;
    const r = Math.floor(Math.random() * 20) + 1;
    let note, resolved = null;
    if (r === 20)      { note = `d20=20 — ¡MILAGRO! Recuperas la consciencia con 1 HP.`; resolved = 'revive'; }
    else if (r === 1)  { d.failures += 2; note = `d20=1 — pifia: DOS fallos.`; }
    else if (r >= 10)  { d.successes++;   note = `d20=${r} — éxito.`; }
    else               { d.failures++;    note = `d20=${r} — fallo.`; }

    if (!resolved && d.failures >= 3) resolved = 'death';
    if (!resolved && d.successes >= 3) resolved = 'stable';

    d.lastNote = note;
    renderDeathSaveWidget();

    if (!resolved) return;

    const input = document.getElementById('playerInput');
    const btn = document.getElementById('sendBtn');
    if (resolved === 'death') {
        const narr = d.deathNarration;
        state.dying = null;
        removeDeathSaveWidget();
        saveGameStateFor(state.activeCharId, state.gameState);
        triggerDeath(narr || `${state.character.name} sucumbió a sus heridas en ${state.gameState.location}.`);
        return;
    }
    // revive or stable
    state.dying = null;
    state.gameState.hp = 1;
    removeDeathSaveWidget();
    if (input) input.disabled = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar'; }
    updateStatus(); updatePartyPanel();
    saveGameStateFor(state.activeCharId, state.gameState);
    const ctx = resolved === 'revive'
        ? `[SALVACIÓN DE MUERTE RESUELTA: 20 natural — ${state.character.name} despierta de golpe con 1 HP. Narra cómo vuelve en sí desafiando a la muerte. El combate ha terminado o los enemigos ya no son una amenaza inmediata; da al jugador un respiro.]`
        : `[SALVACIÓN DE MUERTE RESUELTA: ${state.character.name} se estabiliza con 1 HP tras 3 éxitos. Estuvo al borde de la muerte. Narra cómo recupera la consciencia débil y malherido; los enemigos se han ido o la situación ha cambiado. Da al jugador un respiro.]`;
    if (state.gameState.combat?.active) endCombat('interrumpido');
    await callAndRespond(ctx, null);
};

function renderDeathSaveWidget() {
    removeDeathSaveWidget();
    const container = document.getElementById('chatContainer');
    if (!container || !state.dying) return;
    const d = state.dying;
    const hearts = '💚'.repeat(d.successes) + '🖤'.repeat(Math.max(0, 3 - d.successes));
    const skulls = '💀'.repeat(Math.min(3, d.failures)) + '⬜'.repeat(Math.max(0, 3 - d.failures));
    const el = document.createElement('div');
    el.id = 'deathSaveWidget';
    el.className = 'death-save-widget';
    el.innerHTML = `
        <div class="dsw-title">⚰️ Estás agonizando</div>
        <div class="dsw-desc">A 0 HP tu vida pende de un hilo. Necesitas 3 éxitos (d20 ≥ 10) antes de acumular 3 fallos.</div>
        <div class="dsw-counters"><span>Éxitos: ${hearts}</span><span>Fallos: ${skulls}</span></div>
        ${d.lastNote ? `<div class="dsw-note">${d.lastNote}</div>` : ''}
        <button class="roll-btn dsw-btn" onclick="rollDeathSave()">☠️ Tirada de salvación</button>`;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
}
function removeDeathSaveWidget() {
    document.getElementById('deathSaveWidget')?.remove();
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
