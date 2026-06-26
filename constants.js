// ===== GAME CONSTANTS =====

const ADVENTURES = [
    { id:'tavern-mystery', title:'El Misterio de la Taberna', emoji:'🕵️', gradient:'linear-gradient(135deg,#1a0a0a,#3d1a0a)', tags:['Misterio','Intriga'], description:'Clientes desaparecen en la Taberna de Rurik. Alguien entre los habituales oculta un secreto mortal.', startScene:'La taberna de Rurik está inusualmente silenciosa esta noche. Tres mesas vacías que siempre tienen clientes, la cocinera evita tu mirada, y el tabernero Grimbold limpia el mismo vaso desde hace veinte minutos. En el rincón del fondo, una silla volcada que nadie ha levantado desde ayer.', location:'Taberna de Rurik' },
    { id:'dungeon-king', title:'Las Catacumbas del Rey Olvidado', emoji:'💀', gradient:'linear-gradient(135deg,#0a0a1a,#1a0a3d)', tags:['Dungeon','Exploración'], description:'Bajo el castillo en ruinas yacen tesoros y horrores. Las trampas del rey muerto llevan mil años esperando.', startScene:'La entrada a las catacumbas es una grieta en la roca, apenas lo bastante ancha para entrar de lado. El aire que sale huele a piedra húmeda y algo antiguo. Tu antorcha proyecta sombras que parecen moverse antes de que la llama las alcance. La leyenda dice que el último explorador que entró dejó sus botas en la entrada. Las botas siguen aquí.', location:'Catacumbas del Rey Olvidado' },
    { id:'city-intrigue', title:'Trono de Cenizas', emoji:'👑', gradient:'linear-gradient(135deg,#0a0f0a,#1a3d10)', tags:['Política','Guerra'], description:'El gobernador ha sido asesinado y tres facciones se culpan. Tú conoces la verdad, pero ¿puedes sobrevivir para contarla?', startScene:'La ciudad de Piedranegra amanece con el cuerpo del gobernador colgado en la plaza. Tres facciones ya se acusan mutuamente. Tú viste quién salió de sus aposentos anoche. Nadie más lo sabe todavía.', location:'Ciudad de Piedranegra' },
    { id:'forest-spirits', title:'El Bosque que Sangra', emoji:'🌲', gradient:'linear-gradient(135deg,#0a0f08,#0f2d0a)', tags:['Naturaleza','Horror'], description:'Los árboles del bosque antiguo gotean sangre al amanecer. Las aldeas del borde llevan semanas sin noticias.', startScene:'El bosque de Mirenveil siempre fue extraño, pero ahora es otra cosa. Los árboles más viejos tienen líneas rojas que recorren su corteza como venas. Los pájaros no cantan. Hace tres semanas, la aldea de Millhaven dejó de responder a los mensajeros.', location:'Bosque de Mirenveil' },
    { id:'sea-port', title:'Puerto de Contrabandistas', emoji:'⚓', gradient:'linear-gradient(135deg,#050a1a,#0a1a3d)', tags:['Piratería','Mar'], description:'En el puerto más corrupto del mundo, todos tienen secretos. Un cargamento misterioso está a punto de desencadenar una guerra.', startScene:'El Puerto de las Lanzas huele a sal, pescado y traición. Esta mañana apareció un barco en la bahía sin tripulación, sin bandera, y con las escotillas selladas desde dentro. El Capitán Vorra ha ofrecido doscientas monedas a quien descubra qué lleva el barco.', location:'Puerto de las Lanzas' },
    { id:'free', title:'Aventura Libre', emoji:'✨', gradient:'linear-gradient(135deg,#1a100a,#3d2a0a)', tags:['Libre','Abierto'], description:'Sin guión. El Maestro de Mazmorras crea el mundo contigo en tiempo real.', startScene:null, location:'Taberna de Rurik' }
];

const CLASS_ICONS = { 'Guerrero':'⚔️','Mago':'🔮','Pícaro':'🗡️','Clérigo':'✦','Bardo':'🎭','Druida':'🌿','Explorador':'🏹','Paladín':'🛡️','Hechicero':'⚡','Monje':'👊' };

const CLASS_ABILITIES = {
    'Guerrero':   { can: ['combate cuerpo a cuerpo','uso de armas y armaduras','tácticas militares','resistencia física','intimidación por fuerza'], cannot: ['magia arcana','hechizos','necromancia','invocar o animar muertos','curación mágica','rituales arcanos o divinos','conjuros de cualquier tipo'] },
    'Mago':       { can: ['magia arcana','hechizos y conjuros','rituales arcanos','identificar objetos mágicos','leer pergaminos mágicos'], cannot: ['magia divina','curación sagrada','transformación animal','ki ni artes marciales','armaduras pesadas'] },
    'Pícaro':     { can: ['sigilo','robo y pickpocketing','venenos','trampas','engaño','acrobacias','ataques furtivos'], cannot: ['magia arcana','hechizos','necromancia','curación mágica','combate frontal con armadura pesada'] },
    'Clérigo':    { can: ['magia divina','curación mágica','rituales sagrados','expulsar muertos vivientes','bendiciones'], cannot: ['magia arcana','necromancia oscura','conjuros arcanos','venenos'] },
    'Bardo':      { can: ['magia arcana menor','música mágica','encantamientos','ilusiones menores','persuasión sobrenatural','conocimiento amplio'], cannot: ['necromancia','hechizos destructivos de alto nivel','armaduras pesadas','combate físico avanzado'] },
    'Druida':     { can: ['magia natural','transformación en animales','curación natural','rituales de naturaleza','control del clima menor'], cannot: ['magia arcana','necromancia','armaduras de metal','conjuros de fuego o destrucción masiva'] },
    'Explorador': { can: ['rastreo','arco y armas a distancia','supervivencia en naturaleza','magia menor de naturaleza','emboscadas'], cannot: ['magia arcana avanzada','necromancia','curación mágica','armaduras pesadas'] },
    'Paladín':    { can: ['combate sagrado','curación divina menor','auras de protección','detectar el mal','smite divino'], cannot: ['magia arcana','necromancia','magia oscura o corrupta','venenos'] },
    'Hechicero':  { can: ['magia arcana innata','hechizos de sangre','metamagia','conjuros instintivos'], cannot: ['magia divina','rituales arcanos complejos','curación sagrada','combate físico pesado'] },
    'Monje':      { can: ['ki y artes marciales','velocidad sobrehumana','golpes desarmados letales','resistencia mental','deflexión de proyectiles'], cannot: ['magia arcana','necromancia','hechizos','armaduras'] }
};
// ===================== CHARACTER KNOWLEDGE SYSTEM =====================
// Each entry: { id, name, type, level (1=básico,2=intermedio,3=avanzado), description }
// learnedAbilities: { id, name, category, stat, dcBonus, description }
const CLASS_STARTING_KNOWLEDGE = {
    'Guerrero': {
        knowledges: [
            { id:'weapon_mastery',    name:'Maestría con Armas',       type:'skill',  level:2, description:'Manejo experto de espadas, hachas y lanzas.' },
            { id:'armor_use',         name:'Uso de Armaduras',          type:'skill',  level:2, description:'Combate con armadura sin penalización.' },
            { id:'military_tactics',  name:'Tácticas Militares',        type:'skill',  level:1, description:'Formaciones, emboscadas y estrategia básica.' },
        ],
        learnedAbilities: [
            { id:'power_attack',  name:'Ataque Poderoso',  category:'combat', stat:'FUE', dcBonus:0,  description:'Golpe lento pero devastador.' },
            { id:'second_wind',   name:'Segundo Aliento',  category:'combat', stat:'CON', dcBonus:0,  description:'Recuperar HP en combate una vez por encuentro.' },
        ]
    },
    'Mago': {
        knowledges: [
            { id:'arcane_theory',   name:'Teoría Arcana',        type:'magic',    level:2, description:'Fundamentos de la magia arcana y sus escuelas.' },
            { id:'spellbook_read',  name:'Lectura de Grimorios', type:'skill',    level:2, description:'Leer, copiar y descifrar hechizos escritos.' },
            { id:'arcane_lore',     name:'Lore Arcano',          type:'lore',     level:1, description:'Historia de la magia y seres sobrenaturales.' },
        ],
        learnedAbilities: [
            { id:'magic_missile',  name:'Dardo de Magia',    category:'spell', stat:'INT', dcBonus:0,  description:'Proyectil de energía arcana infalible.' },
            { id:'detect_magic',   name:'Detectar Magia',    category:'spell', stat:'INT', dcBonus:0,  description:'Percibir auras mágicas cercanas.' },
            { id:'arcane_shield',  name:'Escudo Arcano',     category:'spell', stat:'INT', dcBonus:2,  description:'Barrera mágica instantánea.' },
        ]
    },
    'Pícaro': {
        knowledges: [
            { id:'stealth_arts',    name:'Arte del Sigilo',       type:'skill',  level:2, description:'Moverse sin ser visto ni oído.' },
            { id:'lockpicking',     name:'Ganzuería',             type:'skill',  level:2, description:'Abrir cerraduras y desactivar trampas.' },
            { id:'street_lore',     name:'Conocimiento Callejero',type:'lore',   level:1, description:'Contactos, rutas de escape y mercado negro.' },
            { id:'poison_basics',   name:'Venenos Básicos',       type:'craft',  level:1, description:'Identificar y aplicar venenos simples.' },
        ],
        learnedAbilities: [
            { id:'sneak_attack',    name:'Ataque Furtivo',    category:'combat', stat:'DES', dcBonus:0,  description:'Daño extra al atacar desde las sombras.' },
            { id:'pickpocket',      name:'Carterismo',        category:'skill',  stat:'DES', dcBonus:0,  description:'Robar objetos sin ser detectado.' },
        ]
    },
    'Clérigo': {
        knowledges: [
            { id:'divine_lore',     name:'Lore Divino',           type:'lore',   level:2, description:'Historia sagrada, deidades y rituales.' },
            { id:'healing_arts',    name:'Arte de la Curación',   type:'magic',  level:2, description:'Medicina mágica y mundana.' },
            { id:'undead_lore',     name:'Lore de No-Muertos',    type:'lore',   level:1, description:'Naturaleza, debilidades y creación de no-muertos.' },
        ],
        learnedAbilities: [
            { id:'heal',            name:'Curar Heridas',     category:'spell', stat:'SAB', dcBonus:0,  description:'Sanar HP con poder divino.' },
            { id:'turn_undead',     name:'Expulsar No-Muertos',category:'spell',stat:'SAB', dcBonus:0,  description:'Repeler o destruir muertos vivientes.' },
            { id:'bless',           name:'Bendición',         category:'spell', stat:'SAB', dcBonus:0,  description:'Bonificación divina a aliados.' },
        ]
    },
    'Bardo': {
        knowledges: [
            { id:'arcane_basics',   name:'Magia Arcana Básica',   type:'magic',  level:1, description:'Hechizos menores y encantamientos.' },
            { id:'world_lore',      name:'Conocimiento del Mundo',type:'lore',   level:2, description:'Historia, política, rumores y secretos.' },
            { id:'performance',     name:'Artes Escénicas',       type:'skill',  level:2, description:'Música, teatro y oratoria.' },
        ],
        learnedAbilities: [
            { id:'bardic_inspiration', name:'Inspiración Bárdica', category:'social', stat:'CAR', dcBonus:0, description:'Dar ventaja a un aliado con música o palabras.' },
            { id:'charm_person',    name:'Encantar Persona',   category:'spell', stat:'CAR', dcBonus:0,  description:'Hacer a alguien temporalmente amigable.' },
            { id:'vicious_mockery', name:'Insulto Procaz',     category:'spell', stat:'CAR', dcBonus:0,  description:'Magia psíquica a través del insulto.' },
        ]
    },
    'Druida': {
        knowledges: [
            { id:'nature_magic',    name:'Magia Natural',         type:'magic',  level:2, description:'Hechizos de tierra, viento, agua y animales.' },
            { id:'herbalism',       name:'Herboristería',         type:'craft',  level:2, description:'Pociones, venenos y remedios naturales.' },
            { id:'beast_lore',      name:'Lore Animal',           type:'lore',   level:2, description:'Comportamiento, rastros y lenguaje animal.' },
        ],
        learnedAbilities: [
            { id:'wild_shape',      name:'Forma Salvaje',     category:'spell', stat:'SAB', dcBonus:0,  description:'Transformarse en un animal conocido.' },
            { id:'entangle',        name:'Enredar',           category:'spell', stat:'SAB', dcBonus:0,  description:'Raíces y plantas inmovilizan enemigos.' },
            { id:'speak_animals',   name:'Hablar con Animales',category:'spell',stat:'SAB', dcBonus:0,  description:'Comunicación básica con bestias.' },
        ]
    },
    'Explorador': {
        knowledges: [
            { id:'tracking',        name:'Rastreo',               type:'skill',  level:2, description:'Seguir rastros en cualquier terreno.' },
            { id:'survival',        name:'Supervivencia',         type:'skill',  level:2, description:'Orientación, caza y refugio.' },
            { id:'nature_basics',   name:'Magia Natural Básica',  type:'magic',  level:1, description:'Hechizos menores de naturaleza.' },
            { id:'archery',         name:'Arquería',              type:'skill',  level:2, description:'Arco y armas a distancia.' },
        ],
        learnedAbilities: [
            { id:'hunters_mark',    name:'Marca del Cazador', category:'spell', stat:'SAB', dcBonus:0,  description:'Marcar a una presa para rastrearla y hacerle más daño.' },
            { id:'colossus_slayer', name:'Matar Colosos',     category:'combat',stat:'DES', dcBonus:0,  description:'Daño extra contra enemigos heridos.' },
        ]
    },
    'Paladín': {
        knowledges: [
            { id:'divine_magic',    name:'Magia Divina',          type:'magic',  level:1, description:'Bendiciones, smites y auras sagradas.' },
            { id:'combat_mastery',  name:'Maestría en Combate',   type:'skill',  level:2, description:'Combate con armadura pesada y armas sagradas.' },
            { id:'religious_lore',  name:'Lore Religioso',        type:'lore',   level:2, description:'Órdenes, dioses, rituales y enemigos sagrados.' },
        ],
        learnedAbilities: [
            { id:'divine_smite',    name:'Smite Divino',      category:'combat', stat:'FUE', dcBonus:0, description:'Canalizar energía divina en un golpe.' },
            { id:'lay_on_hands',    name:'Imponer Manos',     category:'spell',  stat:'SAB', dcBonus:0, description:'Curación divina por contacto.' },
            { id:'aura_protection', name:'Aura de Protección',category:'spell',  stat:'CAR', dcBonus:0, description:'Bonificación a tiradas de salvación cercanas.' },
        ]
    },
    'Hechicero': {
        knowledges: [
            { id:'innate_magic',    name:'Magia Innata',          type:'magic',  level:2, description:'Control instintivo del poder arcano interior.' },
            { id:'metamagic',       name:'Metamagia',             type:'magic',  level:1, description:'Modificar hechizos en tiempo real.' },
        ],
        learnedAbilities: [
            { id:'chaos_bolt',      name:'Rayo del Caos',     category:'spell', stat:'INT', dcBonus:0,  description:'Proyectil arcano de energía aleatoria.' },
            { id:'wild_magic',      name:'Magia Salvaje',     category:'spell', stat:'INT', dcBonus:0,  description:'Efectos mágicos impredecibles pero potentes.' },
            { id:'subtle_spell',    name:'Hechizo Sutil',     category:'spell', stat:'INT', dcBonus:0,  description:'Lanzar hechizos sin gestos ni palabras visibles.' },
        ]
    },
    'Monje': {
        knowledges: [
            { id:'ki_arts',         name:'Artes del Ki',          type:'skill',  level:2, description:'Control del flujo de energía interior.' },
            { id:'martial_arts',    name:'Artes Marciales',       type:'skill',  level:2, description:'Combate desarmado y con armas de monje.' },
            { id:'meditation',      name:'Meditación Avanzada',   type:'skill',  level:1, description:'Resistencia mental, concentración y percepción ampliada.' },
        ],
        learnedAbilities: [
            { id:'flurry_blows',    name:'Torbellino de Golpes', category:'combat', stat:'DES', dcBonus:0, description:'Dos golpes extra al usar ki.' },
            { id:'stunning_strike', name:'Golpe Aturdidor',      category:'combat', stat:'FUE', dcBonus:0, description:'Aturdir a un enemigo gastando ki.' },
            { id:'deflect_missiles',name:'Deflectar Proyectiles',category:'combat', stat:'DES', dcBonus:0, description:'Reducir o devolver proyectiles.' },
        ]
    }
};

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

// Rasgos raciales visibles (para el prompt del DM — en español)
const RACE_APPEARANCE = {
    'Humano':    'Sin rasgos raciales llamativos. Parece un humano corriente.',
    'Elfo':      'Orejas puntiagudas, rasgos etéreos y delicados, movimientos gráciles. Claramente no humano, pero tampoco una hada — le faltan alas y aura mágica.',
    'Enano':     'Baja estatura, complexión robusta, barba prominente. Inconfundiblemente enano.',
    'Mediano':   'Estatura muy baja (aprox. 1 metro), pies grandes y velludos, expresión afable.',
    'Tiefling':  'Pequeños cuernos en la frente, cola visible, ojos de color inusual. Ascendencia demoníaca evidente.',
    'Vampiro':   'Piel extremadamente pálida, ojos rojizos, colmillos apenas visibles. Presencia inquietante.',
    'Hada':      'Alas translúcidas, aura luminosa tenue, estatura pequeña, rasgos etéreos. Inconfundiblemente feérica.',
    'Fauno':     'Pequeños cuernos, piernas con pezuñas, rasgos mezcla de humano y cabra.',
    'Dragonborn':'Escamas visibles en piel y cara, rasgos reptilianos, complexión imponente.',
    'Orco':      'Piel verdosa, colmillos prominentes, complexión muy poderosa.',
    'Semiélfico':'Orejas ligeramente puntiagudas, rasgos a medio camino entre humano y elfo.',
    'Gnomo':     'Estatura muy pequeña, ojos grandes y curiosos, expresión vivaz.'
};

// Ropa inicial por defecto según clase
const CLASS_DEFAULT_OUTFIT = {
    'Guerrero':   { ropa: 'Armadura de cuero endurecido con coderas de metal, capa marrón de viajero', arma: 'Espada de una mano', offhand: 'Escudo de madera reforzado', accesorio: '' },
    'Mago':       { ropa: 'Túnica azul oscuro con bordados arcanos, cinturón de cuero con bolsillos', arma: 'Bastón de madera nudosa', offhand: '', accesorio: 'Bolsa de componentes mágicos' },
    'Pícaro':     { ropa: 'Ropa oscura de cuero ligero, capucha que puede subirse, botas silenciosas', arma: 'Daga de hoja fina', offhand: 'Segunda daga', accesorio: 'Juego de ganzúas oculto' },
    'Clérigo':    { ropa: 'Hábito de la orden con símbolo divino bordado, sandalias resistentes', arma: 'Maza ceremonial', offhand: 'Símbolo sagrado', accesorio: '' },
    'Bardo':      { ropa: 'Ropas coloridas de viajero, chaleco con muchos bolsillos, botas de cuero', arma: 'Espada estoque ligera', offhand: '', accesorio: 'Instrumento musical (laúd o flauta)' },
    'Druida':     { ropa: 'Túnica de lana natural sin teñir, cinturón de cuero trenzado con hojas secas', arma: 'Bastón de madera viva', offhand: '', accesorio: 'Bolsa de hierbas y semillas' },
    'Explorador': { ropa: 'Ropa de cuero ligera verde y marrón, capa de camuflaje forestal, botas altas', arma: 'Arco largo', offhand: 'Carcaj con flechas', accesorio: 'Daga de caza en el cinturón' },
    'Paladín':    { ropa: 'Armadura de placas pulida con símbolo divino en el pecho, capa blanca', arma: 'Espada larga sagrada', offhand: 'Escudo con emblema divino', accesorio: '' },
    'Hechicero':  { ropa: 'Ropas elegantes pero extrañas, telas que parecen moverse solas, collar peculiar', arma: 'Varita de cristal', offhand: '', accesorio: 'Collar con gema que pulsa levemente' },
    'Monje':      { ropa: 'Ropas sencillas de lino beige, faja ancha de tela, pies descalzos o sandalias', arma: 'Bastón de entrenamiento', offhand: '', accesorio: 'Cuentas de meditación en la muñeca' }
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
