// ===== AI SYSTEM =====

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

        let { narration, stateUpdates, actions, legacy, deathNarration, rollRequest, npcUpdate, learnUpdate } = parseLlmResponse(response);

        // Debug logging
        if (DEBUG_IA_COMMUNICATION) {
            console.log('PARSED IA RESPONSE:', { narration, stateUpdates, actions, legacy, deathNarration, rollRequest, npcUpdate, learnUpdate });
        }

        if (npcUpdate) processNpcUpdate(npcUpdate);
        if (learnUpdate) processLearnUpdate(learnUpdate);
        document.getElementById('typingIndicator')?.remove();

        // Ensure companions and relationships are initialized
        if (!state.gameState.companions) state.gameState.companions = [];
        if (!state.gameState.relationships) state.gameState.relationships = {};

        // Ensure we have actions to show the user
        if (!actions || actions.length === 0) {
            actions = generateDefaultActions();
        }

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
            const dmMsg = { role:'dm', content:narration, actions:actions, location:state.gameState.location, time:state.gameState.timeOfDay, rollPending:true };
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

        // Award XP for successful rolls
        if (rollResult && rollResult.success) {
            // Base XP for success + bonus based on difficulty
            const baseXP = 10;
            const difficultyBonus = Math.floor(rollResult.dc / 2); // More difficult rolls give more XP
            const xpEarned = baseXP + difficultyBonus;
            addExperience(xpEarned);
        } else if (rollResult && !rollResult.success) {
            // Give half XP for failed attempts (learning from mistakes)
            const baseXP = 10;
            const difficultyBonus = Math.floor(rollResult.dc / 2);
            const xpEarned = Math.floor((baseXP + difficultyBonus) / 2);
            addExperience(xpEarned);
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
        let errorMessage = 'El humo de la taberna nubla la visión. Inténtalo de nuevo.';
        let isUserActionable = false;

        if (err.message === 'timeout') {
            errorMessage = 'La conexión tardó demasiado. El Maestro de Mazmorras está ocupado. Inténtalo de nuevo en unos momentos.';
            isUserActionable = true;
        } else if (err.message && err.message.includes('Failed to fetch')) {
            errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet e inténtalo de nuevo.';
            isUserActionable = true;
        } else if (err.message && err.message.includes('JSON.parse')) {
            errorMessage = 'La respuesta recibida no tenía el formato esperado. Esto puede ser temporal; inténtalo de nuevo.';
            isUserActionable = true;
        } else if (err.name === 'TypeError') {
            errorMessage = 'Ocurrió un error inesperado en el procesamiento. Por favor, inténtalo de nuevo.';
            isUserActionable = true;
        } else if (err.message && err.message.includes('Groq')) {
            // Handle Groq API specific errors
            if (err.message.includes('401') || err.message.includes('403')) {
                errorMessage = 'Error de autenticación con la IA. Verifica que tu API key de Groq sea válida y esté correctamente configurada.';
                isUserActionable = true;
            } else if (err.message.includes('429')) {
                errorMessage = 'Has excedido el límite de solicitudes a la IA. Espera un momento antes de intentarlo de nuevo.';
                isUserActionable = true;
            } else if (err.message.includes('500') || err.message.includes('502') || err.message.includes('503') || err.message.includes('504')) {
                errorMessage = 'El servicio de IA está experimentando problemas técnicos. Por favor, inténtalo de nuevo más tarde.';
                isUserActionable = true;
            } else {
                errorMessage = `Error del servicio de IA: ${err.message.replace('Groq ', '')}. Inténtalo de nuevo.`;
                isUserActionable = true;
            }
        } else if (err.message && err.message.includes('parseLlmResponse')) {
            errorMessage = 'La IA respondió de forma inesperada. El Maestro de Mazmorras intentará interpretar tu acción de otra manera.';
            isUserActionable = true;
        }

        // Add debugging info in debug mode
        if (DEBUG_IA_COMMUNICATION && !isUserActionable) {
            errorMessage += ` (Detalles: ${err.message})`;
        }

        addDMMessage(errorMessage, [isUserActionable ? ['Intentarlo de nuevo', 'Cambiar acción', 'Ver ayuda'] : []]);
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
    // Long-term memory section (consolidated history anchor)
    let longTermSection = '';
    if (state.gameState.longTermMemory) {
        let ltm = state.gameState.longTermMemory;
        try {
            const parsed = JSON.parse(ltm);
            const npcsStr = (parsed.npcs_conocidos || []).map(n =>
                `  · ${n.nombre} (${n.rol}): ${n.datos_clave || ''}`
            ).join('\n');
            const eventsStr = (parsed.eventos_clave || []).map(e => `  · ${e}`).join('\n');
            longTermSection = `\nMEMORIA CONSOLIDADA (INMUTABLE — ESTOS HECHOS SON VERDAD Y NO CAMBIAN):
- Ubicación actual: ${parsed.ubicacion_actual || ''}
- Razón de estar aquí: ${parsed.razon_en_ubicacion || ''}
- Misión: ${parsed.mision_activa || ''}
- NPCs conocidos con sus nombres EXACTOS:\n${npcsStr || '  (ninguno registrado)'}
- Eventos clave ocurridos:\n${eventsStr || '  (ninguno)'}
- Historia hasta ahora: ${parsed.resumen_narrativo || ''}`;
        } catch(e) {
            // Fallback: include raw text
            longTermSection = `\nMEMORIA CONSOLIDADA (INMUTABLE):\n${ltm.substring(0, 600)}`;
        }
    }

    // Appearance section — what NPCs actually see when they look at the character
    const raceAppearance = RACE_APPEARANCE[char.race] || `Rasgos de ${char.race}.`;
    const equipped = state.gameState.equipped || {};
    const equippedParts = [
        equipped.ropa      ? `Viste: ${equipped.ropa}` : null,
        equipped.arma      ? `Lleva (mano derecha): ${equipped.arma}` : null,
        equipped.offhand   ? `Lleva (mano izquierda / espalda): ${equipped.offhand}` : null,
        equipped.accesorio ? `Accesorio visible: ${equipped.accesorio}` : null
    ].filter(Boolean);
    const charPhysical = char.appearance ? `Rasgos físicos personales: ${char.appearance}.` : '';
    const appearanceSection = `\nAPARIENCIA VISIBLE DEL PERSONAJE (lo que cualquier NPC ve al mirarle):
- Raza: ${char.race} — ${raceAppearance}
${charPhysical ? '- ' + charPhysical : ''}
${equippedParts.length ? equippedParts.map(p=>'- '+p).join('\n') : '- Sin equipo especial visible.'}
REGLA: usa esta información cuando evalúes la plausibilidad de mentiras sociales, disfraces o impostura. Un elfo SIN alas ni aura mágica que afirma ser hada de verdad genera desconfianza automática. Alguien con armadura y armas visibles no parece emisario diplomático.`;

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
    const classAbilities = CLASS_ABILITIES[char.classe];
    const knowledges = state.gameState.knowledges || [];
    const learnedAbilities = state.gameState.learnedAbilities || [];
    const knowledgesStr = knowledges.length
        ? knowledges.map(k => `${k.name} (${k.type}, nivel ${k.level}${k.source ? ', fuente: '+k.source : ''})`).join('; ')
        : 'ninguno';
    const abilitiesStr = learnedAbilities.length
        ? learnedAbilities.map(a => `${a.name} [${a.category}, usa ${a.stat}${a.dcBonus ? ', DC-'+a.dcBonus : ''}]`).join('; ')
        : 'ninguna';
    const classRulesSection = classAbilities ? `\nRESTRICCIONES DE CLASE — OBLIGATORIO:\n${char.name} es ${char.classe}. PUEDE naturalmente: ${classAbilities.can.join(', ')}.\nPOR DEFECTO NO PUEDE: ${classAbilities.cannot.join(', ')}.\n\nCONOCIMIENTOS ADQUIRIDOS (lo que ha estudiado y aprendido a lo largo del juego):\n${knowledgesStr}\n\nHABILIDADES APRENDIDAS (lo que puede hacer activamente):\n${abilitiesStr}\n\nREGLA DE EXCEPCIONES: Si el personaje intenta algo fuera de su clase pero tiene el conocimiento adquirido relevante, puede intentarlo con DC aumentado (+3). Si no tiene el conocimiento, narra que le es imposible por ignorancia — no es fracaso de tirada, es incapacidad. No hay excepciones sin conocimiento registrado.\n\nCUANDO EL PERSONAJE APRENDE ALGO NUEVO (estudia un libro, recibe entrenamiento, descubre un secreto profundo) añade al final de tu respuesta:\n[LEARN: {"type":"knowledge","id":"id_unico","name":"Nombre del conocimiento","category":"magic|lore|language|skill|craft","level":1,"source":"De dónde lo aprendió","description":"qué sabe exactamente"}]\nSi el aprendizaje le da una nueva habilidad activa:\n[LEARN: {"type":"ability","id":"id_unico","name":"Nombre de la habilidad","category":"spell|combat|social|craft","stat":"FUE|DES|CON|INT|SAB|CAR","dcBonus":0,"source":"De dónde","description":"qué puede hacer"}]\nUSA [LEARN:] solo cuando sea un aprendizaje significativo y permanente, no para acciones cotidianas.\n` : '';

    const system = `Eres el Maestro de Mazmorras de una campaña de D&D en un mundo de fantasía oscura medieval. Narras en segunda persona con prosa cinematográfica.

PERSONAJE:
- ${char.name}, ${char.race}, ${classLabel}, ${char.gender||''}${char.gender ? ',' : ''} trasfondo: ${char.background}${char.motivation?', motivación: '+char.motivation:''}
- FUE ${stats.FUE}(${fmod('FUE')}), DES ${stats.DES}(${fmod('DES')}), CON ${stats.CON}(${fmod('CON')}), INT ${stats.INT}(${fmod('INT')}), SAB ${stats.SAB}(${fmod('SAB')}), CAR ${stats.CAR}(${fmod('CAR')})
${curseNote}

${longTermSection}

HISTORIAL RECIENTE (últimos turnos):
${getRecentHistory()}

ESTADO ACTUAL:
- Ubicación: ${state.gameState.location} | Hora: ${state.gameState.timeOfDay}
- HP: ${state.gameState.hp}/${state.gameState.maxHp}
- Inventario: ${state.gameState.inventory.join(', ')||'vacío'}
- Misión: ${state.gameState.quest}
- Contexto: ${state.gameState.summary||'inicio'}
- Compañeros: ${companions}
- Relaciones: ${rels}${npcSection}
${appearanceSection}
${worldSection}${rollSection}
${classRulesSection}
INSTRUCCIONES:
- **REGLA DE OBLIGATORIO CUMPLIMIENTO**: Cuando veas "[ACTION SELECCIONADA] X" en el prompt del usuario, debes interpretar "X" como la acción que el personaje ha seleccionado realizar. Describe las consecuencias de esa acción sin repetir literalmente "X". Muestra lo que sucede como resultado de esa elección.
- **TIRADAS OPUESTAS — OBLIGATORIO**: Cuando recibes un bloque [RESULTADO OPUESTO: ...], debes narrar respetando quién ganó. Si el NPC gana, el NPC sospecha, hace preguntas difíciles, o descubre el engaño — proporcional a la diferencia de puntos. No ignores nunca el resultado de la tirada del NPC.
- **PLAUSIBILIDAD DE MENTIRAS**: Aunque no haya tirada, si el jugador afirma algo muy inverosímil dado quién es (su raza, apariencia obvia, falta de pruebas) el NPC debería expresar dudas o pedir evidencia. Una hada de verdad tendría alas o aura mágica. Un enviado real llevaría documentos sellados. Los NPCs no son ingenuos.
- **CONSISTENCIA NARRATIVA — NUNCA ROMPER**: Los nombres de personajes, NPCs y lugares ya establecidos en la conversación NO cambian. Si Gorin fue presentado como soldado, sigue siendo soldado. Si el lord se llama Harrington, sigue llamándose Harrington. Si el jugador está en el castillo por una razón específica, esa razón no cambia ni se olvida.
- **CONTINUIDAD DE ESCENA**: Si el jugador acaba de seguir a alguien o entrar a un lugar, la siguiente respuesta ocurre en ese lugar con esos personajes. No introduzcas personajes nuevos sin lógica narrativa.
- **MOTIVO DEL JUGADOR**: El resumen y el contexto indican por qué el jugador está en un lugar. Mantenlo siempre presente en la narración.
- 60-120 palabras de narración. Conciso, cinematográfico, sin descripciones de entorno innecesarias. Ve al grano.
- NPCs con nombres y personalidad consistente. Los eventos del mundo son REALES y visibles.
- Si hay historia del mundo en esta zona, inclúyela naturalmente.
- Romance, seducción y relaciones pueden desarrollarse naturalmente.
- Si el jugador muere (hp=0), narra una muerte épica.
- Narra las consecuencias claras de éxito o fracaso basado en el resultado de la tirada, manteniendo el tono cinematográfico y inmersivo.
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
- ESCUCHAR CUALQUIER CONVERSACIÓN u OÍR SONIDOS → SAB (SIEMPRE requiere tirada)
- MIRAR, VER u OBSERVAR CON INTENCIÓN → SAB (SIEMPRE requiere tirada)
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

    // Añadir regla especial para acciones de juego cuando la entrada corresponde a una opción mostrada
    const lastDMMessage = state.chatHistory.findLast(msg => msg.role === 'dm');
    let isGameAction = false;
    if (lastDMMessage && lastDMMessage.actions && Array.isArray(lastDMMessage.actions)) {
        isGameAction = lastDMMessage.actions.some(action => action === playerAction);
    }

    let userContent = playerAction;
    if (isGameAction) {
        userContent = `[ACTION SELECCIONADA] ${playerAction}\n\nCONTEXTO DE JUEGO: Esta acción ocurre dentro de una escena de rol de un juego de Dungeons & Dragons en un mundo de fantasía. Todos los personajes, objetos y situaciones son ficticios y forman parte de una narrativa colaborativa. Por favor, describe las consecuencias dentro de este marco de juego de roles, siguiendo todas las reglas establecidas para el Maestro de Mazmorras.\n\n(CLARIFICACIÓN: La acción anterior fue seleccionada por el jugador. Describa las consecuencias de que el jugador realice esta acción, sin atribuirla al Maestro de Mazmorras.)`;
    }

    return { system, user: userContent };
}

async function callGroqApi(playerAction, rollResult) {
    const { system, user } = buildPrompt(playerAction, rollResult);

    // Build conversation history for the model.
    // If we have consolidated long-term memory, we only need recent turns
    // (the LTM in the system prompt covers earlier context).
    // Without LTM, send more turns to compensate.
    const historyMessages = [];
    const windowSize = state.gameState.longTermMemory ? 14 : 30;
    const recentHistory = state.chatHistory.slice(-windowSize);
    for (const msg of recentHistory) {
        if (msg.role === 'player') {
            historyMessages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'dm') {
            // Strip [STATE:], [ACTIONS:], [ROLL:], [NPC:] blocks from assistant messages
            // to keep token count manageable while preserving narrative
            const cleanContent = msg.content
                .replace(/\[STATE:[\s\S]*?\]/g, '')
                .replace(/\[ACTIONS:[\s\S]*?\]/g, '')
                .replace(/\[ROLL:[\s\S]*?\]/g, '')
                .replace(/\[NPC:[\s\S]*?\]/g, '')
                .replace(/\[LEGACY:[\s\S]*?\]/g, '')
                .replace(/\[LEARN:[\s\S]*?\]/g, '')
                .trim();
            if (cleanContent) historyMessages.push({ role: 'assistant', content: cleanContent });
        }
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json','Authorization':`Bearer ${state.apiKey}` },
        body: JSON.stringify({
            model:'llama-3.3-70b-versatile',
            messages:[
                {role:'system',content:system},
                ...historyMessages,
                {role:'user',content:user}
            ],
            temperature:0.7,
            max_tokens:1000
        })
    });
    if (!response.ok) { const e = await response.text(); throw new Error(`Groq ${response.status}: ${e}`); }
    const data = await response.json();
    return data.choices[0].message.content;
}



function extractTagBlock(text, tag) {
    const prefix = '[' + tag + ':';
    const idx = text.indexOf(prefix);
    if (idx === -1) return null;
    let i = idx + prefix.length;
    while (i < text.length && (text[i] === ' ' || text[i] === '\n')) i++;
    const contentStart = i;
    let depth = 0, braceDepth = 0, inString = false, escape = false;
    while (i < text.length) {
        const c = text[i];
        if (escape) { escape = false; i++; continue; }
        if (c === '\\' && inString) { escape = true; i++; continue; }
        if (c === '"') { inString = !inString; i++; continue; }
        if (inString) { i++; continue; }
        if (c === '{') braceDepth++;
        else if (c === '}') { braceDepth--; }
        else if (c === '[') depth++;
        else if (c === ']') {
            if (depth === 0 && braceDepth === 0) {
                return { match: text.slice(idx, i + 1), content: text.slice(contentStart, i).trim() };
            }
            depth--;
        }
        i++;
    }
    return null;
}

function parseLlmResponse(response) {
    let narration = response;
    let stateUpdates = null, actions = [], legacy = null, deathNarration = null, rollRequest = null;

    const actionsBlock = extractTagBlock(response, 'ACTIONS');
    if (actionsBlock) {
        try { actions = JSON.parse(actionsBlock.content); } catch(e) { if (DEBUG_IA_COMMUNICATION) console.warn('Failed to parse ACTIONS block:', actionsBlock.content, e); }
        narration = narration.replace(actionsBlock.match, '').trim();
    }
    const stateBlock = extractTagBlock(response, 'STATE');
    if (stateBlock) {
        try { stateUpdates = JSON.parse(stateBlock.content); } catch(e) { if (DEBUG_IA_COMMUNICATION) console.warn('Failed to parse STATE block:', stateBlock.content, e); }
        narration = narration.replace(stateBlock.match, '').trim();
    }
    const legacyBlock = extractTagBlock(response, 'LEGACY');
    if (legacyBlock) {
        try { legacy = JSON.parse(legacyBlock.content); } catch(e) { if (DEBUG_IA_COMMUNICATION) console.warn('Failed to parse LEGACY block:', legacyBlock.content, e); }
        narration = narration.replace(legacyBlock.match, '').trim();
    }
    const rollBlock = extractTagBlock(response, 'ROLL');
    if (rollBlock) {
        try {
            const r = JSON.parse(rollBlock.content);
            rollRequest = { skill: r.skill || 'Habilidad', stat: r.stat || guessStatFromSkill(r.skill || ''), dc: parseInt(r.dc) || 12, reason: r.reason || '' };
        } catch(e) { if (DEBUG_IA_COMMUNICATION) console.warn('Failed to parse ROLL block:', rollBlock.content, e); }
        narration = narration.replace(rollBlock.match, '').trim();
    }
    if (stateUpdates?.hp <= 0) { deathNarration = narration.split('\n\n').slice(-1)[0] || narration.slice(-200); }
    const npcBlock = extractTagBlock(response, 'NPC');
    let npcUpdate = null;
    if (npcBlock) {
        try { npcUpdate = JSON.parse(npcBlock.content); } catch(e) { if (DEBUG_IA_COMMUNICATION) console.warn('Failed to parse NPC block:', npcBlock.content, e); }
        narration = narration.replace(npcBlock.match, '').trim();
    }
    const learnBlock = extractTagBlock(response, 'LEARN');
    let learnUpdate = null;
    if (learnBlock) {
        try { learnUpdate = JSON.parse(learnBlock.content); } catch(e) { if (DEBUG_IA_COMMUNICATION) console.warn('Failed to parse LEARN block:', learnBlock.content, e); }
        narration = narration.replace(learnBlock.match, '').trim();
    }
    return { narration, stateUpdates, actions, legacy, deathNarration, rollRequest, npcUpdate, learnUpdate };
}

async function summarizeContext() {
    // Use full chat history for consolidation (up to last 40 messages)
    const historyToSummarize = state.chatHistory.slice(-40);
    const text = historyToSummarize.map(m=>`${m.role==='dm'?'DM':'Jugador'}: ${m.content.substring(0,400)}`).join('\n');

    // Include existing longTermMemory as base if it exists
    const prevMemory = state.gameState.longTermMemory
        ? `MEMORIA PREVIA:\n${state.gameState.longTermMemory}\n\n`
        : '';

    const prompt = `${prevMemory}Eres el asistente de memoria de una campaña D&D. Analiza la siguiente sesión y genera un resumen estructurado y preciso. Es CRÍTICO que los nombres de personajes, lugares y NPCs sean exactamente los que aparecen en el texto.

${text}

Responde SOLO en este formato JSON (sin texto adicional):
{
  "ubicacion_actual": "nombre exacto del lugar donde está el jugador ahora",
  "razon_en_ubicacion": "por qué el jugador está aquí, con detalles específicos",
  "mision_activa": "objetivo principal actual",
  "npcs_conocidos": [
    {"nombre": "nombre exacto", "rol": "qué es este personaje", "relacion": "relación con el jugador", "datos_clave": "info importante"}
  ],
  "eventos_clave": ["evento 1", "evento 2", "evento 3"],
  "resumen_narrativo": "2-3 frases resumiendo el arco de la historia hasta ahora"
}`;

    try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method:'POST',
            headers:{ 'Content-Type':'application/json','Authorization':`Bearer ${state.apiKey}` },
            body: JSON.stringify({
                model:'llama-3.3-70b-versatile',
                messages:[{role:'user', content:prompt}],
                temperature:0.2,
                max_tokens:600
            })
        });
        const d = await r.json();
        const raw = d.choices[0].message.content.trim();

        // Try to parse structured memory
        let parsed = null;
        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        } catch(e) { /* keep parsed as null */ }

        if (parsed) {
            // Store structured long-term memory
            state.gameState.longTermMemory = JSON.stringify(parsed);
            // Also update the short summary for backward compat
            state.gameState.summary = parsed.resumen_narrativo || state.gameState.summary;
            state.gameState.longTermMemoryTurn = state.turnCount;
        } else {
            // Fallback: store raw text
            state.gameState.longTermMemory = raw;
            state.gameState.summary = raw.substring(0, 200);
        }

        // Only trim chat history AFTER we've consolidated it
        // Keep last 20 messages as short-term memory window
        if (state.chatHistory.length > 40) {
            state.chatHistory = state.chatHistory.slice(-20);
        }

        // Update memory indicator in UI
        updateMemoryIndicator();
        saveGameStateFor(state.activeCharId, state.gameState);
    } catch(e) {
        console.warn('Error al resumir el contexto:', e);
    }
}

function updateMemoryIndicator() {
    const el = document.getElementById('memoryIndicator');
    if (!el) return;
    const turns = state.chatHistory.length;
    const hasLTM = !!state.gameState.longTermMemory;
    el.innerHTML = hasLTM
        ? `📜 <span title="Historia consolidada">${turns} turnos memoria ok</span>`
        : `${turns} turnos en memoria`;
    el.style.color = hasLTM ? '#c9a84c' : '#888';
    el.title = hasLTM
        ? 'Historia consolidada activa'
        : 'Solo memoria reciente activa';
}
