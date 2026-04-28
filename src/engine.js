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
        sets: ['dm-01', 'dm-02', 'dm-03', 'dm-04', 'dm-05', 'dm-06'],
        description: "All available sets including DM-04, DM-05, and DM-06."
    }
};

export const CardEngine = {
    isMono(manaZone, civ) {
        if (!manaZone || manaZone.length === 0) return false;
        return manaZone.every(m => m.civilizations?.includes(civ));
    },
    getCost(card, battleZone, manaZone) {
        let cost = card.cost;
        if (!battleZone) return cost;
        const isSpell = this.isSpell(card);
        battleZone.forEach(c => {
            if (isSpell && c.name === "Essence Elf") cost--;
            if (!isSpell && card.civilizations?.includes('Nature') && c.name === "Elf-X") cost--;

            if (c.name === "Dew Mushroom" && card.civilizations?.includes('Darkness')) cost++;
            if (c.name === "Milieus, the Daystretcher" && card.civilizations?.includes('Darkness')) cost += 2;
            if (c.name === "Missile Boy" && card.civilizations?.includes('Light')) cost++;
            if (c.name === "Volcano Smog, Deceptive Shade" && card.civilizations?.includes('Light')) cost += 2;
            if (c.name === "Horned Mutant" && card.civilizations?.includes('Nature')) cost++;
            if (c.name === "Quixotic Puppet" && card.civilizations?.includes('Water')) cost++;
            if (c.name === "Cocco Lupia" && card.subtypes?.some(s => s.toLowerCase().includes('dragon')) && !card.subtypes?.some(s => s.toLowerCase().includes('dragonoid'))) cost -= 2;
        });
        return Math.max(1, cost);
    },
    parseSurvivorAbilities(card, battleZone, manaZone) {
        const text = (card.text || '').toLowerCase();
        const abilities = {};
        if (text.includes("blocker")) abilities.blocker = true;
        if (text.includes("slayer")) abilities.slayer = true;
        if (text.includes("triple breaker")) abilities.tripleBreaker = true;
        if (text.includes("double breaker")) abilities.doubleBreaker = true;
        if (text.includes("speed attacker")) abilities.speedAttacker = true;
        if (text.includes("power attacker +1000")) abilities.powerAttacker = (abilities.powerAttacker || 0) + 1000;
        if (text.includes("untap this creature")) abilities.untapAtEnd = true;
        if (text.includes("untap it after it battles")) abilities.untapAfterBattle = true;
        if (text.includes("put it into your mana zone instead")) abilities.survivorManaReplacement = true;
        if (text.includes("put it into your hand instead")) abilities.survivorHandReplacement = true;
        if (text.includes("draw a card") && text.includes("whenever this creature breaks a shield")) abilities.drawOnShieldBreak = true;
        if (text.includes("discard a card") && text.includes("whenever this creature breaks a shield")) abilities.discardOnShieldBreak = true;
        if (text.includes("unblockable by creatures that have power 3000 or less")) abilities.unblockableBySmall = true;
        if (text.includes("when this creature would be destroyed, return it to your hand instead")) abilities.returnToHandOnDeath = true;
        if (text.includes("each of your light creatures may tap instead of attacking to use this creature's ability")) abilities.shareTapToLight = true;

        return abilities;
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
        if (text.includes("this creature can attack untapped darkness creatures")) abilities.canAttackUntappedDarkness = true;
        if (text.includes("this creature can attack untapped light creatures")) abilities.canAttackUntappedLight = true;
        
        if (text.includes("at the end of each of your turns, you may untap this creature")) abilities.untapAtEnd = true;
        if (text.includes("at the end of each of your turns, you may untap all your creatures")) abilities.untapAllAtEnd = true;
        if (text.includes("when this creature wins a battle, destroy it")) abilities.destroyOnWin = true;
        const paMatch = text.match(/power attacker \+(\d+)/);
        if (paMatch) abilities.powerAttacker = parseInt(paMatch[1]);
        if (text.trim().startsWith("shield trigger")) abilities.shieldTrigger = true;

        if (card.name === "Spiral Grass" || text.includes("untap it after it battles")) abilities.untapAfterBattle = true;

        if (card.name === "Angler Cluster") abilities.cantAttack = true;
        if (card.name === "Sparkle Flower" && this.isMono(manaZone, 'Light')) abilities.blocker = true;
        if (card.name === "Raging Dash-Horn" && this.isMono(manaZone, 'Nature')) abilities.doubleBreaker = true;

        if (battleZone?.some(c => c.name === "Sieg Balicula, the Intense" && c.instanceId !== card.instanceId)) {
            if (card.civilizations?.includes('Light')) abilities.blocker = true;
        }

        if (card.tempBlocker) abilities.blocker = true;

        // Survivor Sharing
        if (card.subtypes?.includes('Survivor')) {
            battleZone?.forEach(other => {
                if (other.instanceId === card.instanceId) return;
                if (!other.subtypes?.includes('Survivor')) return;
                const otherAbils = this.parseSurvivorAbilities(other, battleZone, manaZone);
                Object.assign(abilities, otherAbils);
            });
        }

        // DM-04 Global Buffs
        if (battleZone?.some(c => c.name === "Gregoria, Princess of War")) {
            if (card.subtypes?.some(s => s.toLowerCase().includes('demon command'))) abilities.blocker = true;
        }
        if (battleZone?.some(c => c.name === "Chaotic Skyterror")) {
            if (card.subtypes?.some(s => s.toLowerCase().includes('demon command'))) {
                abilities.powerAttacker = (abilities.powerAttacker || 0) + 4000;
                abilities.doubleBreaker = true;
            }
        }
        if (card.name === "Armored Scout Gestuchar") {
            const others = battleZone?.filter(c => c.instanceId !== card.instanceId && c.civilizations?.includes('Fire')).length || 0;
            if (others === 0) {
                abilities.powerAttacker = (abilities.powerAttacker || 0) + 3000;
                abilities.doubleBreaker = true;
            }
        }
        if (battleZone?.some(c => c.name === "Supporting Tulip")) {
            if (card.subtypes?.some(s => s.toLowerCase().includes('angel command'))) {
                abilities.powerAttacker = (abilities.powerAttacker || 0) + 4000;
            }
        }
        if (battleZone?.some(c => c.name === "Überdragon Jabaha" && c.instanceId !== card.instanceId)) {
            if (card.civilizations?.includes('Fire')) {
                abilities.powerAttacker = (abilities.powerAttacker || 0) + 2000;
            }
        }
        if (text.includes("$tap")) abilities.hasTapAbility = true;
        if (text.includes("instead of having this creature attack, you may tap it")) abilities.hasTapAbility = true;
        if (text.includes("whenever this creature would break a shield, your opponent puts that shield into his graveyard instead")) abilities.incinerate = true;
        if (text.includes("whenever this creature becomes blocked, no battle happens")) abilities.noBattleOnBlock = true;
        if (text.includes("can attack only creatures that have \"blocker\"")) abilities.onlyAttackBlockers = true;
        if (text.includes("during your opponent's turn, if this creature would be discarded from your hand, put it into the battle zone instead")) abilities.discardReplacement = true;

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
    getCurrentPower(card, battleZone, manaZone, shields = []) {
        let power = this.basePower(card);
        if (!battleZone) return power;
        battleZone.forEach(other => {
            if (other.instanceId === card.instanceId) return;
            if (other.name === "Armored Blaster Valdios" && card.subtypes?.some(s => s.toLowerCase().includes('human'))) power += 1000;
            if (other.name === "Barkwhip, the Smasher" && other.isTapped && card.subtypes?.some(s => s.toLowerCase().includes('beast folk'))) power += 2000;
            if (other.name === "Stallob, the Oracle" && card.civilizations?.includes('Light')) power += 1000;
            if (other.name === "Smaragd, Vizier of Faith" && other.isTapped) power += 2000;
        });
        if (card.name === "Iocant, the Oracle" && battleZone.some(c => c.instanceId !== card.instanceId && c.subtypes?.some(s => s.toLowerCase().includes('angel command')))) power += 2000;
        if (card.name === "Alek, Solidity Enforcer") {
            const lightCount = battleZone.filter(c => c.instanceId !== card.instanceId && c.civilizations?.includes('Light')).length;
            power += (lightCount * 1000);
        }
        if (card.name === "Chaos Fish") {
            const waterCount = battleZone.filter(c => c.instanceId !== card.instanceId && c.civilizations?.includes('Water')).length;
            power += (waterCount * 1000);
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
        if (card.name === "Galsaur") {
            const others = battleZone.filter(c => c.instanceId !== card.instanceId).length;
            if (others === 0) power += 4000;
        }

        // DM-04 Power Buffs
        if (card.name === "Blasto, Explosive Soldier") {
            if (battleZone.some(c => c.civilizations?.includes('Darkness'))) power += 2000;
        }
        if (card.name === "Exploding Cactus") {
            if (battleZone.some(c => c.civilizations?.includes('Light'))) power += 2000;
        }
        if (card.name === "Cannon Shell") {
            power += (shields.length * 1000);
        }

        battleZone.forEach(other => {
            if (other.instanceId === card.instanceId) return;
            if (other.name === "Re Bil, Seeker of Archery" && card.civilizations?.includes('Light')) power += 2000;
            if (other.name === "Shadow Moon, Cursed Shade" && card.civilizations?.includes('Darkness')) power += 2000;
            if (other.name === "Gregoria, Princess of War" && card.subtypes?.some(s => s.toLowerCase().includes('demon command'))) power += 2000;
            if (other.name === "Keeper of the Sunlit Abyss" && (card.civilizations?.includes('Light') || card.civilizations?.includes('Darkness'))) power += 1000;
            if (other.name === "Pippie Kuppie" && card.subtypes?.some(s => s.toLowerCase().includes('armored dragon'))) power += 1000;
            if (other.name === "Sieg Balicula, the Intense" && card.civilizations?.includes('Light')) power += 2000;
            if (other.name === "King Aquakamui" && (card.subtypes?.some(s => s.toLowerCase().includes('angel command')) || card.subtypes?.some(s => s.toLowerCase().includes('demon command')))) power += 2000;
        });

        if (card.name === "Armored Scout Gestuchar") {
            const others = battleZone.filter(c => c.instanceId !== card.instanceId && c.civilizations?.includes('Fire')).length;
            if (others === 0) {
                // Buffer to handle power attacker +3000 elsewhere if needed, 
                // but usually power calculation is simpler here.
            }
        }
        if (card.name === "Crow Winger") {
            const oppBz = battleZone.filter(c => c.isOpponent);
            const counts = oppBz.filter(c => c.civilizations?.includes('Water') || c.civilizations?.includes('Darkness')).length;
            power += (counts * 1000);
        }

        if (card.name === "Moon Horn") {
            power += (manaZone.length * 1000);
        }

        return power;
    },
    getPotentialPower(card, battleZone, graveyard, manaZone, shields = []) {
        let power = this.getCurrentPower(card, battleZone, manaZone, shields);
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
        if (card.name === "Leaping Tornado Horn") {
            const others = battleZone.filter(c => c.instanceId !== card.instanceId).length;
            power += (others * 1000);
        }
        if (card.name === "Armored Walker Urherion") {
            if (battleZone.some(c => c.instanceId !== card.instanceId && c.subtypes?.some(s => s.toLowerCase().includes('human')))) power += 2000;
        }
        if (card.name === "Fatal Attacker Horvath") {
            if (battleZone.some(c => c.instanceId !== card.instanceId && c.subtypes?.some(s => s.toLowerCase().includes('armorloid')))) power += 2000;
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
    canAttackPlayer(card, battleZone, manaZone, opponentShieldCount = 0) {
        if (card.name === "Gigazoul" && opponentShieldCount === 0) return false;
        const abilities = this.parseAbilities(card, battleZone, manaZone);
        if (abilities.onlyAttackBlockers) return false;
        if (card.canAttackPlayersOverride) return true;
        if (abilities.cantAttack) return false;
        if (abilities.cantAttackPlayers) return false;
        if (card.name === "Cliffcrush Giant" && !card.canAttackPlayersOverride && battleZone.some(c => c.instanceId !== card.instanceId && !c.isTapped && c.type === 'Creature')) return false;
        return true;
    },
    canAttack(card, battleZone, opponentBattleZone, manaZone) {
        const abilities = this.parseAbilities(card, battleZone, manaZone);
        if (card.canAttackPlayersOverride) return true; // Diamond Cutter ignores all cantAttack
        if (abilities.cantAttack) return false;
        if (card.name === "Snip Striker Bullraizer") {
            if (opponentBattleZone && opponentBattleZone.length > battleZone.length) return false;
        }
        if (card.name === "Cliffcrush Giant" && !card.canAttackPlayersOverride && battleZone.some(c => c.instanceId !== card.instanceId && !c.isTapped && c.type === 'Creature')) return false;
        return true;
    },
    canAttackUntapped(card, battleZone, manaZone, targetCard = null) { 
        const abs = this.parseAbilities(card, battleZone, manaZone);
        if (abs.canAttackUntapped || card.canAttackUntappedThisTurn) {
            if (abs.onlyAttackBlockers && targetCard && !this.parseAbilities(targetCard, [], []).blocker) return false;
            return true;
        }
        if (targetCard) {
            if (abs.canAttackUntappedDarkness && targetCard.civilizations?.includes('Darkness')) return true;
            if (abs.canAttackUntappedLight && targetCard.civilizations?.includes('Light')) return true;
        }
        return false; 
    },
    canBeBlocked(atk, def, atkContext, defContext) {
        const abs = this.parseAbilities(atk, atkContext.battleZone, atkContext.manaZone);
        if (abs.cantBeBlocked) return false;
        if (atk.name === "Calgo, Vizier of Rainclouds" && this.getCurrentPower(def, defContext.battleZone, defContext.manaZone) >= 4000) return false;
        const defPower = this.getCurrentPower(def, defContext.battleZone, defContext.manaZone) + (def.powerBonus || 0);
        if (atk.name === "Xeno Mantis" && defPower <= 5000) return false;
        if (atk.subtypes?.includes('Survivor')) {
            const abs = this.parseAbilities(atk, atkContext.battleZone, atkContext.manaZone);
            if (abs.unblockableBySmall && this.getCurrentPower(def, defContext.battleZone, defContext.manaZone) <= 3000) return false;
        }
        if (atk.cantBeBlockedThisTurn) return false;
        if (atkContext.battleZone?.some(c => c.name === "Legendary Bynor" && c.instanceId !== atk.instanceId)) {
            if (atk.civilizations?.includes('Water')) return false;
        }
        if (atk.name === "Clobber Totem" && defPower <= 5000) return false;
        if (atk.name === "Stampeding Longhorn" && defPower <= 3000) return false;
        if (atk.name === "Masked Pomegranate" && defPower <= 4000) return false;
        if (atk.name === "Tropico") {
            const others = atkContext.battleZone.filter(c => c.instanceId !== atk.instanceId).length;
            if (others >= 2) return false;
        }
        const hasNautilus = atkContext.battleZone.some(c => c.name === "King Nautilus" && c.instanceId !== atk.instanceId);
        if (hasNautilus && atk.subtypes?.some(s => s.toLowerCase().includes('liquid people'))) return false;

        if (def.name === "Lurking Eel" && !(atk.civilizations?.includes('Fire') || atk.civilizations?.includes('Nature'))) return false;

        if (atk.name === "Ancient Giant" && def.civilizations?.includes('Darkness')) return false;
        if (atk.name === "Gulan Rias, Speed Guardian" && def.civilizations?.includes('Darkness')) return false;
        if (atk.name === "Purple Piercer" && def.civilizations?.includes('Light')) return false;

        return true;
    },
    canBeAttacked(atk, def, bzAtk, bzDef) {
        if (atk.name === "Dawn Giant" && def.type === "Creature") return false;
        if (bzAtk?.some(c => c.canAttackPlayersOverride)) return false; // Diamond Cutter prevents attacking creatures
        if (def.name === "Gulan Rias, Speed Guardian" && atk.civilizations?.includes('Darkness')) return false;
        if (def.name === "Purple Piercer" && atk.civilizations?.includes('Light')) return false;
        return true;
    },
    hasSlayer(card, battleZone = []) { 
        if (card.tempSlayer) return true;
        const abs = this.parseAbilities(card, battleZone, []);
        if (abs.slayer) return true;
        // DM-05 specific slayers
        if (card.name === "Gigakail") return true; // Handled in resolveAttack for specific civs if needed, but usually just slayer
        return false;
    },
    isSlayerVs(atk, def) {
        if (atk.name === "Gigakail" && (def.civilizations?.includes('Nature') || def.civilizations?.includes('Light'))) return true;
        return false;
    },
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
        if (text.includes("when this creature would be destroyed, return it to your hand instead")) return 'hand';
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
    },
    isSpellRestricted(card, myBattleZone, oppBattleZone) {
        if (!this.isSpell(card)) return false;
        if ([...(myBattleZone || []), ...(oppBattleZone || [])].some(c => c.name === "Alcadeias, Lord of Spirits")) {
            if (!card.civilizations?.includes('Light')) return true;
        }
        return false;
    }
};
