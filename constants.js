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

// ===================== RACIAL STAT BONUSES =====================
const RACE_STAT_BONUSES = {
    'Humano':     { FUE:1, DES:1, CON:1, INT:1, SAB:1, CAR:1 },
    'Elfo':       { DES:2, SAB:1 },
    'Enano':      { CON:2, FUE:1 },
    'Mediano':    { DES:2, CAR:1 },
    'Tiefling':   { CAR:2, INT:1 },
    'Vampiro':    { CAR:2, DES:1 },
    'Hada':       { CAR:2, INT:1 },
    'Fauno':      { CON:2, CAR:1 },
    'Dragonborn': { FUE:2, CAR:1 },
    'Orco':       { FUE:2, CON:1 },
    'Semiélfico': { CAR:2, SAB:1 },
    'Gnomo':      { INT:2, DES:1 }
};
function applyRaceBonuses(stats, race) {
    const bonuses = RACE_STAT_BONUSES[race] || {};
    const out = { ...stats };
    for (const [ab, b] of Object.entries(bonuses)) out[ab] = (out[ab] || 10) + b;
    return out;
}

// ===================== HIT DICE (level-up HP) =====================
const CLASS_HIT_DIE = { 'Guerrero':10, 'Paladín':10, 'Explorador':10, 'Monje':8, 'Pícaro':8, 'Bardo':8, 'Clérigo':8, 'Druida':8, 'Hechicero':6, 'Mago':6 };

// ===================== WEAPON DAMAGE (type die + rarity bonus) =====================
const WEAPON_DAMAGE_DICE = [
    { keywords:['daga','cuchillo','navaja','puño','puño desnudo','honda'], die:4 },
    { keywords:['espada corta','maza','martillo ligero','hoz','bastón','baston','varita','garrote'], die:6 },
    { keywords:['espada','estoque','hacha','arco','ballesta','lanza','látigo','latigo','cimitarra','tridente'], die:8 },
    { keywords:['espada larga','martillo de guerra','alabarda','arco largo'], die:10 },
    { keywords:['mandoble','espadón','espadon','gran hacha','hacha grande','espada a dos manos'], die:12 }
];
const RARITY_BONUS = { 'común':0, 'comun':0, 'poco común':1, 'poco comun':1, 'raro':2, 'rara':2, 'épico':3, 'épica':3, 'epico':3, 'legendario':4, 'legendaria':4 };

function getWeaponDamage(nameOrItem) {
    const name = (typeof nameOrItem === 'string' ? nameOrItem : (nameOrItem?.name || '')).toLowerCase();
    let rarity = 'común';
    if (typeof nameOrItem === 'object' && nameOrItem?.rarity) rarity = nameOrItem.rarity.toLowerCase();
    else {
        // Detect rarity words in the name itself ("espada larga legendaria")
        for (const r of Object.keys(RARITY_BONUS)) { if (RARITY_BONUS[r] > 0 && name.includes(r)) { rarity = r; break; } }
    }
    let die = 6, best = 0;
    for (const w of WEAPON_DAMAGE_DICE) for (const k of w.keywords) {
        if (name.includes(k) && k.length > best) { best = k.length; die = w.die; }
    }
    if (!best && (!name || name.includes('puñetazo') || name.includes('desarmado'))) die = 4;
    return { die, bonus: RARITY_BONUS[rarity] ?? 0 };
}
function rollWeaponDamage(nameOrItem, crit) {
    const { die, bonus } = getWeaponDamage(nameOrItem);
    let roll = Math.floor(Math.random()*die)+1;
    if (crit) roll += Math.floor(Math.random()*die)+1; // crit: double dice
    return { die, roll, bonus, crit: !!crit, total: roll + bonus };
}
// Roll a die expression like "d6", "2d4+1", "d8+2"
function rollDieExpr(expr) {
    const m = /^(\d*)d(\d+)([+-]\d+)?$/.exec((expr || 'd6').trim());
    if (!m) return Math.floor(Math.random()*6)+1;
    const n = parseInt(m[1] || '1'), d = parseInt(m[2]), b = parseInt(m[3] || '0');
    let t = b;
    for (let i = 0; i < n; i++) t += Math.floor(Math.random()*d)+1;
    return Math.max(1, t);
}

// ===================== CONDITIONS =====================
const CONDITIONS = {
    envenenado: { name:'Envenenado', emoji:'🤢', effect:'dis',  dot:4, desc:'Desventaja en tiradas y 1d4 de daño por turno' },
    sangrando:  { name:'Sangrando',  emoji:'🩸', effect:null,   dot:4, desc:'1d4 de daño por turno' },
    aturdido:   { name:'Aturdido',   emoji:'💫', effect:'dis',  dot:0, desc:'Desventaja en todas las tiradas' },
    paralizado: { name:'Paralizado', emoji:'🧊', effect:'dis',  dot:0, desc:'Apenas puedes moverte: desventaja en todo' },
    asustado:   { name:'Asustado',   emoji:'😱', effect:'dis',  dot:0, desc:'Desventaja mientras la fuente del miedo esté presente' },
    cegado:     { name:'Cegado',     emoji:'🕶️', effect:'dis',  dot:0, desc:'Desventaja en tiradas que dependan de la vista' },
    exhausto:   { name:'Exhausto',   emoji:'😮‍💨', effect:'dis', dot:0, desc:'Desventaja por fatiga extrema' },
    bendecido:  { name:'Bendecido',  emoji:'✨', effect:'adv',  dot:0, desc:'Ventaja en tus tiradas' },
    inspirado:  { name:'Inspirado',  emoji:'🎵', effect:'adv',  dot:0, desc:'Ventaja gracias a inspiración' },
    oculto:     { name:'Oculto',     emoji:'🌫️', effect:'adv',  dot:0, desc:'Ventaja en ataques y sigilo mientras no te detecten' }
};

// ===================== BESTIARY =====================
// damage uses die expressions ("d6", "d8+1"). xp awarded on kill.
const BESTIARY = {
    rata_gigante:    { name:'Rata Gigante',      hp:7,  attackBonus:2, damage:'d4',    xp:10,  tier:'trivial' },
    kobold:          { name:'Kobold',            hp:5,  attackBonus:4, damage:'d4',    xp:10,  tier:'trivial' },
    goblin:          { name:'Goblin',            hp:7,  attackBonus:4, damage:'d6',    xp:15,  tier:'fácil' },
    lobo:            { name:'Lobo',              hp:11, attackBonus:3, damage:'d6',    xp:20,  tier:'fácil' },
    bandido:         { name:'Bandido',           hp:11, attackBonus:3, damage:'d6',    xp:25,  tier:'fácil' },
    cultista:        { name:'Cultista',          hp:9,  attackBonus:3, damage:'d6',    xp:25,  tier:'fácil' },
    esqueleto:       { name:'Esqueleto',         hp:13, attackBonus:4, damage:'d6',    xp:25,  tier:'fácil' },
    zombi:           { name:'Zombi',             hp:22, attackBonus:3, damage:'d6+1',  xp:30,  tier:'normal' },
    guardia_corrupto:{ name:'Guardia Corrupto',  hp:14, attackBonus:4, damage:'d8',    xp:40,  tier:'normal' },
    mercenario:      { name:'Mercenario',        hp:16, attackBonus:4, damage:'d8',    xp:45,  tier:'normal' },
    orco_guerrero:   { name:'Orco Guerrero',     hp:15, attackBonus:5, damage:'d8+1',  xp:50,  tier:'normal' },
    arana_gigante:   { name:'Araña Gigante',     hp:16, attackBonus:5, damage:'d8',    xp:60,  tier:'normal', condition:'envenenado' },
    gul:             { name:'Gul',               hp:18, attackBonus:4, damage:'d6+1',  xp:70,  tier:'difícil', condition:'paralizado' },
    mago_oscuro:     { name:'Mago Oscuro',       hp:14, attackBonus:5, damage:'d10',   xp:80,  tier:'difícil' },
    oso:             { name:'Oso Pardo',         hp:25, attackBonus:5, damage:'d8+2',  xp:80,  tier:'difícil' },
    espectro:        { name:'Espectro',          hp:16, attackBonus:5, damage:'d8',    xp:90,  tier:'difícil', condition:'asustado' },
    capitan_bandido: { name:'Capitán Bandido',   hp:26, attackBonus:6, damage:'d8+2',  xp:110, tier:'difícil' },
    ogro:            { name:'Ogro',              hp:30, attackBonus:6, damage:'d10+1', xp:120, tier:'muy difícil' },
    troll:           { name:'Troll',             hp:40, attackBonus:6, damage:'d10+2', xp:150, tier:'muy difícil' },
    vampiro_menor:   { name:'Vampiro Menor',     hp:35, attackBonus:7, damage:'d8+2',  xp:200, tier:'muy difícil', condition:'sangrando' },
    joven_dragon:    { name:'Dragón Joven',      hp:60, attackBonus:8, damage:'d12+3', xp:400, tier:'legendario' }
};

// ===================== PROFICIENCY (knowledge → skill bonus) =====================
const SKILL_PROFICIENCY_MAP = {
    'Ataque':        ['weapon_mastery','martial_arts','combat_mastery','archery','ki_arts'],
    'Combate':       ['weapon_mastery','martial_arts','combat_mastery','military_tactics','ki_arts'],
    'Fuerza':        ['weapon_mastery','combat_mastery'],
    'Atletismo':     ['martial_arts','survival'],
    'Sigilo':        ['stealth_arts'],
    'Hurto':         ['stealth_arts','lockpicking'],
    'Acrobacias':    ['martial_arts','ki_arts'],
    'Magia':         ['arcane_theory','innate_magic','nature_magic','divine_magic','arcane_basics','nature_basics','metamagic','healing_arts'],
    'Arcanos':       ['arcane_theory','arcane_lore','spellbook_read','innate_magic','metamagic'],
    'Historia':      ['world_lore','religious_lore','arcane_lore','street_lore','divine_lore'],
    'Investigación': ['arcane_lore','street_lore','world_lore','tracking'],
    'Conocimiento':  ['world_lore','arcane_lore','divine_lore','religious_lore','beast_lore','undead_lore','street_lore'],
    'Percepción':    ['meditation','tracking'],
    'Medicina':      ['healing_arts','herbalism'],
    'Naturaleza':    ['beast_lore','herbalism','nature_magic','survival','nature_basics'],
    'Supervivencia': ['survival','tracking','herbalism'],
    'Persuasión':    ['performance','world_lore'],
    'Engaño':        ['street_lore'],
    'Intimidación':  ['military_tactics','combat_mastery'],
    'Actuación':     ['performance'],
    'Resistencia':   ['meditation'],
    'Constitución':  ['meditation']
};
function getProficiencyBonus(skill) {
    const knowledges = state.gameState?.knowledges || [];
    if (!knowledges.length || !skill) return 0;
    const ids = SKILL_PROFICIENCY_MAP[skill] || [];
    const skillLower = skill.toLowerCase();
    let lvl = 0;
    for (const k of knowledges) {
        if (ids.includes(k.id) || (k.name && k.name.toLowerCase().includes(skillLower))) lvl = Math.max(lvl, k.level || 1);
    }
    if (!lvl) return 0;
    return lvl >= 3 ? 3 : 2;
}

// ===================== STARTING GOLD BY BACKGROUND =====================
const BACKGROUND_GOLD = { 'Soldado':25, 'Criminal':20, 'Noble':60, 'Huérfano':5, 'Mercader':45, 'Erudito':20, 'Marginado':8 };

// ===================== LEVEL-UP CLASS ABILITIES =====================
// Granted sequentially at odd levels (3, 5, 7...)
const CLASS_LEVEL_ABILITIES = {
    'Guerrero': [
        { id:'shield_bash',     name:'Golpe de Escudo',      category:'combat', stat:'FUE', dcBonus:0, description:'Aturdir brevemente a un enemigo con el escudo.' },
        { id:'battle_cry',      name:'Grito de Batalla',     category:'combat', stat:'CAR', dcBonus:0, description:'Intimidar a todos los enemigos cercanos.' },
        { id:'whirlwind',       name:'Torbellino de Acero',  category:'combat', stat:'FUE', dcBonus:2, description:'Atacar a todos los enemigos adyacentes de un giro.' }
    ],
    'Mago': [
        { id:'fireball',        name:'Bola de Fuego',        category:'spell', stat:'INT', dcBonus:2, description:'Explosión de fuego que daña a varios enemigos.' },
        { id:'invisibility',    name:'Invisibilidad',        category:'spell', stat:'INT', dcBonus:2, description:'Volverse invisible durante unos minutos.' },
        { id:'counterspell',    name:'Contrahechizo',        category:'spell', stat:'INT', dcBonus:2, description:'Anular la magia de un enemigo.' }
    ],
    'Pícaro': [
        { id:'smoke_bomb',      name:'Bomba de Humo',        category:'skill',  stat:'DES', dcBonus:0, description:'Escapar o reposicionarse en una nube de humo.' },
        { id:'poison_blade',    name:'Hoja Envenenada',      category:'combat', stat:'DES', dcBonus:0, description:'Impregnar el arma: el próximo golpe envenena.' },
        { id:'shadow_step',     name:'Paso Sombrío',         category:'skill',  stat:'DES', dcBonus:2, description:'Moverse entre sombras sin ser visto.' }
    ],
    'Clérigo': [
        { id:'mass_heal',       name:'Curación en Grupo',    category:'spell', stat:'SAB', dcBonus:2, description:'Sanar a todos los aliados cercanos.' },
        { id:'divine_shield',   name:'Escudo Divino',        category:'spell', stat:'SAB', dcBonus:0, description:'Barrera sagrada que absorbe daño.' },
        { id:'resurrection',    name:'Plegaria de Vida',     category:'spell', stat:'SAB', dcBonus:3, description:'Estabilizar a un aliado moribundo al instante.' }
    ],
    'Bardo': [
        { id:'song_of_rest',    name:'Canción de Descanso',  category:'social', stat:'CAR', dcBonus:0, description:'Melodía que restaura ánimo y algo de HP al grupo.' },
        { id:'hypnotic_tune',   name:'Melodía Hipnótica',    category:'spell',  stat:'CAR', dcBonus:2, description:'Fascinar a una audiencia u objetivo.' },
        { id:'cutting_words',   name:'Palabras Hirientes',   category:'social', stat:'CAR', dcBonus:0, description:'Sabotear la moral de un enemigo (le impone desventaja).' }
    ],
    'Druida': [
        { id:'thorn_whip',      name:'Látigo de Espinas',    category:'spell', stat:'SAB', dcBonus:0, description:'Atacar y atraer a un enemigo con espinas.' },
        { id:'summon_beast',    name:'Invocar Bestia',       category:'spell', stat:'SAB', dcBonus:2, description:'Llamar a un animal salvaje en tu ayuda.' },
        { id:'storm_call',      name:'Llamar Tormenta',      category:'spell', stat:'SAB', dcBonus:3, description:'Invocar rayos sobre el campo de batalla.' }
    ],
    'Explorador': [
        { id:'volley',          name:'Lluvia de Flechas',    category:'combat', stat:'DES', dcBonus:2, description:'Disparar a varios enemigos a la vez.' },
        { id:'animal_companion',name:'Compañero Animal',     category:'skill',  stat:'SAB', dcBonus:0, description:'Vincularte con una bestia que te acompaña.' },
        { id:'camouflage',      name:'Camuflaje Perfecto',   category:'skill',  stat:'DES', dcBonus:0, description:'Volverse casi invisible en terreno natural.' }
    ],
    'Paladín': [
        { id:'holy_weapon',     name:'Arma Sagrada',         category:'combat', stat:'FUE', dcBonus:0, description:'Imbuir el arma con luz divina (daño extra a no-muertos).' },
        { id:'aura_courage',    name:'Aura de Coraje',       category:'spell',  stat:'CAR', dcBonus:0, description:'Los aliados cercanos no pueden ser asustados.' },
        { id:'divine_judgment', name:'Juicio Divino',        category:'combat', stat:'FUE', dcBonus:3, description:'Golpe devastador contra un enemigo malvado.' }
    ],
    'Hechicero': [
        { id:'twin_spell',      name:'Hechizo Gemelo',       category:'spell', stat:'INT', dcBonus:2, description:'Duplicar un hechizo para afectar a dos objetivos.' },
        { id:'elemental_form',  name:'Forma Elemental',      category:'spell', stat:'INT', dcBonus:2, description:'Envolverse en fuego, hielo o rayo brevemente.' },
        { id:'arcane_storm',    name:'Tormenta Arcana',      category:'spell', stat:'INT', dcBonus:3, description:'Descarga caótica que golpea a todos los enemigos.' }
    ],
    'Monje': [
        { id:'pressure_point',  name:'Punto de Presión',     category:'combat', stat:'DES', dcBonus:0, description:'Golpe preciso que paraliza un miembro del enemigo.' },
        { id:'ki_blast',        name:'Onda de Ki',           category:'combat', stat:'SAB', dcBonus:2, description:'Proyectar energía interior a distancia.' },
        { id:'iron_body',       name:'Cuerpo de Hierro',     category:'combat', stat:'CON', dcBonus:0, description:'Endurecer el cuerpo: reduce el daño recibido un turno.' }
    ]
};

// ===================== SESSION STATE =====================
