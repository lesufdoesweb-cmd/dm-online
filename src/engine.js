export const FORMATS = {
    CLASSIC: {
        id: 'CLASSIC',
        name: "Classic",
        sets: ['dm-01', 'dm-02', 'dm-03'],
        description: "Sets 1-3. The foundation of Duel Masters."
    },
    EXPERIMENTAL: {
        id: 'EXPERIMENTAL',
        name: "Experimental",
        sets: ['dm-01', 'dm-02', 'dm-03', 'dm-04'],
        description: "All available sets including DM-04."
    }
};

export const CardEngine = {
    isMono(manaZone, civ) {
        if (!manaZone || manaZone.length === 0) return false;
        return manaZone.every(m => m.civilizations?.includes(civ));
    },
    calculateCost(card, battleZone) {
        let cost = card.cost;
        if (!battleZone) return cost;
        const isSpell = this.isSpell(card);
        const isNature = card.civilizations?.includes('Nature');
        battleZone.forEach(c => {
            if (isSpell && c.name === "Essence Elf") cost = Math.max(1, cost - 1);
            if (!isSpell && isNature && c.name === "Elf-X") cost = Math.max(1, cost - 1);
        });
        return cost;
    },
    parseAbilities(card, battleZone, manaZone) {
        const text = (card.text || '').toLowerCase();
        const abilities = {};
        if (text.includes("can't attack players") || text.includes("can\u2019t attack players")) abilities.cantAttackPlayers = true;
        if (text.includes("can't attack.") || text.includes("can\u2019t attack.") || (text.includes("can't attack") && !text.includes("can't attack players") && !text.includes("can't attack untapped")))
            if (text.match(/this creature can't attack\b[^p]/i) || text.endsWith("can't attack.") || text.endsWith("can\u2019t attack."))
                abilities.cantAttack = true;
        if (text.includes("can't be blocked") || text.includes("can\u2019t be blocked")) abilities.cantBeBlocked = true;
        if (text.includes("can't be blocked by any creature that has power 3000 or less")) abilities.unblockableByWeak = true;
        if (text.match(/(^|\n|: |\. )([\w\-]+ )?blocker\b/)) abilities.blocker = true;
        if (text.match(/(^|\n|: |\. )([\w\-]+ )?slayer\b/)) abilities.slayer = true;
        if (text.match(/(^|\n|: |\. )([\w\-]+ )?double breaker\b/)) abilities.doubleBreaker = true;
        if (text.match(/(^|\n|: |\. )([\w\-]+ )?triple breaker\b/)) abilities.tripleBreaker = true;
        if (text.includes("attacks each turn if able")) abilities.mustAttack = true;
        if (text.includes("this creature can attack untapped creatures")) abilities.canAttackUntapped = true;
        if (text.includes("at the end of each of your turns, you may untap this creature")) abilities.untapAtEnd = true;
        if (text.includes("at the end of each of your turns, you may untap all your creatures")) abilities.untapAllAtEnd = true;
        if (text.includes("when this creature wins a battle, destroy it")) abilities.destroyOnWin = true;
        const paMatch = text.match(/power attacker \+(\d+)/);
        if (paMatch) abilities.powerAttacker = parseInt(paMatch[1]);
        if (text.trim().startsWith("shield trigger")) abilities.shieldTrigger = true;

        if (card.name === "Angler Cluster") abilities.cantAttack = true;
        if (card.name === "Sparkle Flower" && this.isMono(manaZone, 'Light')) abilities.blocker = true;
        if (card.name === "Raging Dash-Horn" && this.isMono(manaZone, 'Nature')) abilities.doubleBreaker = true;

        if (battleZone?.some(c => c.name === "Sieg Balicula, the Intense" && c.instanceId !== card.instanceId)) {
            if (card.civilizations?.includes('Light')) abilities.blocker = true;
        }

        return abilities;
    },
    isSpell(card) { return card.type === 'Spell'; },
    isEvolution(card) {
        const text = (card.text || '').toLowerCase();
        return text.includes("evolution") && text.includes("put on one of your");
    },
    evolutionBaitRace(card) {
        const text = (card.text || '').toLowerCase();
        const match = text.match(/put on one of your ([\w\s]+)\./);
        if (!match) return null;
        let race = match[1].trim();
        if (race.endsWith('s')) return race.slice(0, -1);
        return race;
    },
    basePower(card) { if (!card.power) return 0; return parseInt(card.power.toString().replace(/[^0-9]/g, '')) || 0; },
    getCurrentPower(card, battleZone, manaZone) {
        let power = this.basePower(card);
        if (!battleZone) return power;
        battleZone.forEach(other => {
            if (other.instanceId === card.instanceId) return;
            if (other.name === "Armored Blaster Valdios" && card.subtypes?.some(s => s.toLowerCase().includes('human'))) power += 1000;
            if (other.name === "Barkwhip, the Smasher" && other.isTapped && card.subtypes?.some(s => s.toLowerCase().includes('beast folk'))) power += 2000;
            if (other.name === "Stallob, the Oracle" && card.civilizations?.includes('Light')) power += 1000;
            if (other.name === "Smaragd, Vizier of Faith" && other.isTapped) power += 2000;
            if (other.name === "Überdragon Jabaha" && card.civilizations?.includes('Fire')) power += 2000;
        });
        if (card.name === "Alek, Solidity Enforcer") {
            const lightCount = battleZone.filter(c => c.instanceId !== card.instanceId && c.civilizations?.includes('Light')).length;
            power += (lightCount * 1000);
        }
        if (card.name === "Garkago Dragon") {
            const fireCount = battleZone.filter(c => c.instanceId !== card.instanceId && c.civilizations?.includes('Fire')).length;
            power += (fireCount * 1000);
        }
        if (card.name === "Masked Pomegranate") {
            const natureCount = battleZone.filter(c => c.instanceId !== card.instanceId && c.civilizations?.includes('Nature')).length;
            power += (natureCount * 1000);
        }
        if (card.name === "Scratchclaw") {
            const darknessCount = battleZone.filter(c => c.instanceId !== card.instanceId && c.civilizations?.includes('Darkness')).length;
            power += (darknessCount * 1000);
        }
        if (card.name === "Angler Cluster" && this.isMono(manaZone, 'Water')) power += 3000;
        if (card.name === "Baby Zoppe" && this.isMono(manaZone, 'Fire')) power += 2000;
        if (card.name === "Mudman" && this.isMono(manaZone, 'Darkness')) power += 2000;
        if (card.name === "Raging Dash-Horn" && this.isMono(manaZone, 'Nature')) power += 3000;
        if (card.name === "Ur Pale, Seeker of Sunlight" && this.isMono(manaZone, 'Light')) power += 2000;
        if (card.name === "Leaping Tornado Horn") {
            const others = battleZone.filter(c => c.instanceId !== card.instanceId).length;
            power += (others * 1000);
        }
        if (card.name === "Galsaur") {
            const others = battleZone.filter(c => c.instanceId !== card.instanceId).length;
            if (others === 0) power += 4000;
        }
        return power;
    },
    getPotentialPower(card, battleZone, graveyard, manaZone) {
        let power = this.getCurrentPower(card, battleZone, manaZone);
        const abs = this.parseAbilities(card, battleZone, manaZone);
        if (abs.powerAttacker) power += abs.powerAttacker;
        if (card.name === "Bolshack Dragon" && graveyard) {
            const fireCount = graveyard.filter(c => c.civilizations?.includes('Fire')).length;
            power += (fireCount * 1000);
        }
        if (card.name === "Armored Cannon Balbaro") {
            const humans = battleZone.filter(c => c.instanceId !== card.instanceId && c.subtypes?.some(s => s.toLowerCase().includes('human'))).length;
            power += (humans * 2000);
        }
        if (card.name === "Dogarn, the Marauder") {
            const tapped = battleZone.filter(c => c.instanceId !== card.instanceId && c.isTapped).length;
            power += (tapped * 2000);
        }
        return power;
    },
    hasActiveGlobalEffect(card, battleZone) {
        const names = ["Essence Elf", "Elf-X", "Armored Blaster Valdios", "Barkwhip, the Smasher", "Stallob, the Oracle", "Smaragd, Vizier of Faith", "Überdragon Jabaha", "Sieg Balicula, the Intense"];
        return names.includes(card.name);
    },
    attackPower(card, battleZone, graveyard, manaZone) {
        return this.getPotentialPower(card, battleZone, graveyard, manaZone);
    },
    hasAttackTrigger(card) {
        const text = (card.text || '').toLowerCase();
        return text.includes("whenever this creature attacks");
    },
    shieldsToBreak(card, battleZone, manaZone) {
        const abilities = this.parseAbilities(card, battleZone, manaZone);
        if (abilities.tripleBreaker) return 3;
        if (abilities.doubleBreaker) return 2;
        if (card.tempDoubleBreaker) return 2;
        if (card.name === "Galsaur" && battleZone) {
            const others = battleZone.filter(c => c.instanceId !== card.instanceId).length;
            if (others === 0) return 2;
        }
        return 1;
    },
    canAttackPlayer(card, battleZone, manaZone) {
        const abilities = this.parseAbilities(card, battleZone, manaZone);
        if (card.canAttackPlayersOverride) return true;
        if (abilities.cantAttack) return false;
        if (abilities.cantAttackPlayers) return false;
        return true;
    },
    canAttack(card, battleZone, opponentBattleZone, manaZone) {
        const abilities = this.parseAbilities(card, battleZone, manaZone);
        if (abilities.cantAttack) return false;
        if (card.name === "Snip Striker Bullraizer") {
            if (opponentBattleZone && opponentBattleZone.length > battleZone.length) return false;
        }
        return true;
    },
    canAttackUntapped(card, battleZone, manaZone) { return !!this.parseAbilities(card, battleZone, manaZone).canAttackUntapped || !!card.canAttackUntappedThisTurn; },
    canBeBlocked(atk, def, atkContext, defContext) {
        const abs = this.parseAbilities(atk, atkContext.battleZone, atkContext.manaZone);
        if (abs.cantBeBlocked || atk.cantBeBlockedThisTurn) return false;
        if (atkContext.battleZone?.some(c => c.name === "Legendary Bynor" && c.instanceId !== atk.instanceId)) {
            if (atk.civilizations?.includes('Water')) return false;
        }
        const defPower = this.getCurrentPower(def, defContext.battleZone, defContext.manaZone) + (def.powerBonus || 0);
        if (atk.name === "Xeno Mantis" && defPower <= 5000) return false;
        if (atk.name === "Stampeding Longhorn" && defPower <= 3000) return false;
        if (atk.name === "Masked Pomegranate" && defPower <= 4000) return false;
        if (atk.name === "Tropico") {
            const others = atkContext.battleZone.filter(c => c.instanceId !== atk.instanceId).length;
            if (others >= 2) return false;
        }
        const hasNautilus = atkContext.battleZone.some(c => c.name === "King Nautilus" && c.instanceId !== atk.instanceId);
        if (hasNautilus && atk.subtypes?.some(s => s.toLowerCase().includes('liquid people'))) return false;
        return true;
    },
    hasSlayer(card) { return this.parseAbilities(card, [], []).slayer; },
    onDestroyed(card, battleZone) {
        const text = (card.text || '').toLowerCase();
        if (text.includes("add it to your shields face down instead") || text.includes("add it to your shields instead")) return 'shield';
        if (text.includes("put it into your mana zone instead") && !text.includes("you may")) return 'mana';
        if (text.includes("return it to your hand instead") && !text.includes("you may")) return 'hand';
        if (battleZone) {
            if (battleZone.some(c => c.name === "Gigamantis") && card.civilizations?.includes('Nature') && card.name !== "Gigamantis") {
                return 'mana';
            }
        }
        if (text.includes("when this creature would be destroyed, put it into your mana zone")) return 'mana';
        if (text.includes("when this creature would be destroyed, put it into your hand") || text.includes("when this creature would be destroyed, return it to your hand")) return 'hand';
        return 'graveyard';
    },
    getOptionalReplacement(card, battleZone) {
        const text = (card.text || '').toLowerCase();
        if (card.name === "Gigastand") {
            return { type: 'hand', message: "Return Gigastand to hand? (Must discard 1 card)", requiresDiscard: true };
        }
        if (battleZone?.some(c => c.name === "Jack Viper, Shadow of Doom") && card.civilizations?.includes('Darkness') && card.name !== "Jack Viper, Shadow of Doom") {
            return { type: 'hand', message: "Jack Viper: Return Darkness creature to hand instead?", requiresDiscard: false };
        }
        return null;
    }
};
