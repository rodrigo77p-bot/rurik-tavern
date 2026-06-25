// Helper function to convert item string to Item object (for backward compatibility)
function createItemFromName(itemName) {
    if (typeof itemName !== 'string') {
        // If it's already an object, return as is (with validation if needed)
        return itemName;
    }

    const name = itemName.trim();
    if (!name) {
        return { name: 'Item desconocido', type: 'objeto', damage: null, rarity: 'común', description: '', equipped: false };
    }

    // Determine item type based on name
    const lowerName = name.toLowerCase();
    let type = 'objeto'; // default
    let damage = null;   // default for non-weapons

    // Weapon keywords
    if (lowerName.includes('espada') ||
        lowerName.includes('daga') ||
        lowerName.includes('arco') ||
        lowerName.includes('hacha') ||
        lowerName.includes('maz') ||  // maza, mazacote
        lowerName.includes('lanza') ||
        lowerName.includes('bastón') ||
        lowerName.includes('club') ||
        lowerName.includes('martillo')) {
        type = 'arma';
        // Default damage for weapons - can be refined per weapon type
        damage = 6;
    }
    // Armor/shield keywords
    else if (lowerName.includes('armadura') ||
             lowerName.includes('escudo') ||
             lowerName.includes('ropa') ||
             lowerName.includes('vestiduras') ||
             lowerName.includes('túnica') ||
             lowerName.includes('capa') ||
             lowerName.includes('yelmo') ||
             lowerName.includes('yelmo') ||
             lowerName.includes('guantes') ||
             lowerName.includes('botas')) {
        type = 'armadura';
        // Armor doesn't have damage in D&D 5e terms, but could have AC bonus
        damage = null;
    }
    // Potion/consumable keywords
    else if (lowerName.includes('poción') ||
             lowerName.includes('veneno') ||
             lowerName.includes('curativa') ||
             lowerName.includes('antídoto') ||
             lowerName.includes('aceite') ||
             lowerName.includes('pergamino')) {
        type = 'consumible';
        damage = null;
    }
    // Treasure/junk keywords
    else if (lowerName.includes('moneda') ||
             lowerName.includes('gem') ||
             lowerName.includes('joya') ||
             lowerName.includes('arte') ||
             lowerName.includes('tesoro')) {
        type = 'tesoro';
        damage = null;
    }
    // Component/tool keywords
    else if (lowerName.includes('componente') ||
             lowerName.includes('herramienta') ||
             lowerName.includes('kit') ||
             lowerName.includes('libro') ||
             lowerName.includes('varita') ||
             lowerName.includes('orbe') ||
             lowerName.includes('amuleto') ||
             lowerName.includes('símbolo')) {
        type = 'componente';
        damage = null;
    }
    // Food/rations
    else if (lowerName.includes('ración') ||
             lowerName.includes('pan') ||
             lowerName.includes('agua') ||
             lowerName.includes('vino') ||
             lowerName.includes('comida') ||
             lowerName.includes('hidromiel')) {
        type = 'ración';
        damage = null;
    }
    // Default is already 'objeto'

    return {
        name: name,
        type: type,
        damage: damage,
        rarity: 'común', // Default rarity
        description: '', // No description by default
        equipped: false  // Not equipped by default
    };
}