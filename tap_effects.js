export const TAP_EFFECTS = {
    "Adomis, the Oracle": ({ gsR, setSearchingDeck, toast }) => {
        const shields = gsR.current.opponent.shields;
        if (!shields.length) return;
        setSearchingDeck({
            message: "Adomis: Choose a shield to look at",
            customList: shields,
            count: 1,
            onComplete: () => {
                toast("You looked at the shield.");
            }
        });
    },
    "Aeropica": ({ gsR, setTargeting, net, toast, askMay }) => {
        const creatures = [...gsR.current.battleZone, ...gsR.current.opponent.battleZone];
        if (!creatures.length) return;
        setTargeting({
            message: "Aeropica: Select a creature to bounce",
            count: 1,
            validTargets: creatures.map(c => c.instanceId),
            onComplete: (ids) => {
                const id = ids[0];
                const isMine = gsR.current.battleZone.some(x => x.instanceId === id);
                if (isMine) {
                    setGs(p => {
                        const target = p.battleZone.find(x => x.instanceId === id);
                        return { ...p, battleZone: p.battleZone.filter(x => x.instanceId !== id), hand: [...p.hand, target] };
                    });
                } else {
                    net.send("ACTION", { action: "BOUNCE_TARGET", details: { targetId: id } });
                }
                toast("Creature bounced!");
            }
        });
    },
    "Bliss Totem, Avatar of Luck": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const grave = gsR.current.graveyard;
        if (!grave.length) return;
        setSearchingDeck({
            message: "Bliss Totem: Select up to 3 cards to move to mana",
            customList: grave,
            count: 3,
            exact: false,
            onComplete: (cards) => {
                const selected = Array.isArray(cards) ? cards : [cards];
                setGs(p => {
                    const ids = selected.map(x => x.instanceId);
                    return { ...p, graveyard: p.graveyard.filter(x => !ids.includes(x.instanceId)), mana: [...p.mana, ...selected.map(x => ({ ...x, isTapped: false }))] };
                });
                toast("Cards moved to mana zone!");
            }
        });
    },
    "Charmilia, the Enticer": ({ gsR, setSearchingDeck, setGs, toast }) => {
        setSearchingDeck({
            message: "Charmilia: Search a creature from deck",
            count: 1,
            onComplete: (cards) => {
                const card = cards[0];
                setGs(p => ({
                    ...p,
                    deck: p.deck.filter(c => c.instanceId !== card.instanceId),
                    hand: [...p.hand, card]
                }));
                toast("Creature added to hand!");
            }
        });
    },
    "Chen Treg, Vizier of Blades": ({ gsR, setTargeting, net, toast }) => {
        const targets = gsR.current.opponent.battleZone;
        if (!targets.length) return;
        setTargeting({
            message: "Chen Treg: Select an enemy to tap",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "TAP_TARGET", details: { targetId: ids[0] } });
                toast("Enemy tapped!");
            }
        });
    },
    "Cosmogold, Spectral Knight": ({ gsR, setSearchingDeck, setGs, toast, CardEngine }) => {
        const spells = gsR.current.mana.filter(c => CardEngine.isSpell(c));
        if (!spells.length) return;
        setSearchingDeck({
            message: "Cosmogold: Select a spell from mana to return to hand",
            customList: spells,
            count: 1,
            onComplete: (cards) => {
                const card = cards[0];
                setGs(p => ({
                    ...p,
                    mana: p.mana.filter(c => c.instanceId !== card.instanceId),
                    hand: [...p.hand, card]
                }));
                toast("Spell returned to hand!");
            }
        });
    },
    "Arc Bine, the Astounding": ({ gsR, setTargeting, net, toast }) => {
        const targets = gsR.current.opponent.battleZone;
        if (!targets.length) return;
        setTargeting({
            message: "Arc Bine: Select an enemy to tap",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "TAP_TARGET", details: { targetId: ids[0] } });
                toast("Enemy tapped!");
            }
        });
    },
    "Grim Soul, Shadow of Reversal": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const darks = gsR.current.graveyard.filter(c => c.civilizations?.includes('Darkness'));
        if (!darks.length) return;
        setSearchingDeck({
            message: "Grim Soul: Select a darkness creature from graveyard",
            customList: darks,
            count: 1,
            onComplete: (cards) => {
                const card = cards[0];
                setGs(p => ({
                    ...p,
                    graveyard: p.graveyard.filter(c => c.instanceId !== card.instanceId),
                    hand: [...p.hand, card]
                }));
                toast("Darkness creature returned to hand!");
            }
        });
    },
    "Lupa, Poison-Tipped Doll": ({ gsR, setTargeting, setGs, toast }) => {
        const targets = gsR.current.battleZone;
        if (!targets.length) return;
        setTargeting({
            message: "Lupa: Select a creature to gain Slayer",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                setGs(p => ({
                    ...p,
                    battleZone: p.battleZone.map(c => c.instanceId === ids[0] ? { ...c, tempSlayer: true } : c)
                }));
                toast("Creature gained Slayer!");
            }
        });
    },
    "Migasa, Adept of Chaos": ({ gsR, setTargeting, setGs, toast }) => {
        const fireTargets = gsR.current.battleZone.filter(c => c.civilizations?.includes('Fire'));
        if (!fireTargets.length) return;
        setTargeting({
            message: "Migasa: Select a fire creature to gain Double Breaker",
            count: 1,
            validTargets: fireTargets.map(c => c.instanceId),
            onComplete: (ids) => {
                setGs(p => ({
                    ...p,
                    battleZone: p.battleZone.map(c => c.instanceId === ids[0] ? { ...c, tempDoubleBreaker: true } : c)
                }));
                toast("Fire creature gained Double Breaker!");
            }
        });
    },
    "Mighty Bandit, Ace of Thieves": ({ gsR, setTargeting, setGs, toast }) => {
        const targets = gsR.current.battleZone;
        if (!targets.length) return;
        setTargeting({
            message: "Mighty Bandit: Select a creature to get +5000 power",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                setGs(p => ({
                    ...p,
                    battleZone: p.battleZone.map(c => c.instanceId === ids[0] ? { ...c, powerBonus: (c.powerBonus || 0) + 5000 } : c)
                }));
                toast("Creature buffed!");
            }
        });
    },
    "Neon Cluster": ({ draw, toast }) => {
        draw();
        setTimeout(draw, 150);
        toast("Neon Cluster: Drew 2 cards!");
    },
    "Rikabu's Screwdriver": ({ gsR, setTargeting, net, toast, CardEngine }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.parseAbilities(c, [], []).blocker);
        if (!targets.length) return;
        setTargeting({
            message: "Rikabu: Select a blocker to destroy",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "CREATURE_DESTROYED", details: { targetId: ids[0] } });
                toast("Blocker destroyed!");
            }
        });
    },
    "Sopian": ({ gsR, setTargeting, setGs, toast }) => {
        const targets = gsR.current.battleZone;
        if (!targets.length) return;
        setTargeting({
            message: "Sopian: Select a creature to be unblockable this turn",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                setGs(p => ({
                    ...p,
                    battleZone: p.battleZone.map(c => c.instanceId === ids[0] ? { ...c, cantBeBlockedThisTurn: true } : c)
                }));
                toast("Creature is now unblockable!");
            }
        });
    },
    "Tank Mutant": ({ net, toast }) => {
        net.send("ACTION", { action: "DESTROY_CHOICE", details: { count: 1 } });
        toast("Tank Mutant: Opponent must choose a creature to destroy!");
    },
    "Legionnaire Lizard": ({ gsR, setTargeting, setGs, toast }) => {
        const targets = gsR.current.battleZone;
        if (!targets.length) return;
        setTargeting({
            message: "Legionnaire Lizard: Select a creature to gain Speed Attacker",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                setGs(p => ({
                    ...p,
                    battleZone: p.battleZone.map(c => c.instanceId === ids[0] ? { ...c, tempSpeedAttacker: true } : c)
                }));
                toast("Creature gained Speed Attacker!");
            }
        });
    },
    "Lava Walker Executo": ({ gsR, setTargeting, setGs, toast }) => {
        const fireTargets = gsR.current.battleZone.filter(c => c.civilizations?.includes('Fire'));
        if (!fireTargets.length) return;
        setTargeting({
            message: "Lava Walker: Select a fire creature to get +3000 power",
            count: 1,
            validTargets: fireTargets.map(c => c.instanceId),
            onComplete: (ids) => {
                setGs(p => ({
                    ...p,
                    battleZone: p.battleZone.map(c => c.instanceId === ids[0] ? { ...c, powerBonus: (c.powerBonus || 0) + 3000 } : c)
                }));
                toast("Fire creature buffed!");
            }
        });
    },
    "Living Citadel Vosh": ({ gsR, setGs, toast }) => {
        setGs(p => {
            if (p.deck.length === 0) return p;
            const top = p.deck[0];
            return { ...p, deck: p.deck.slice(1), mana: [...p.mana, { ...top, isTapped: false }] };
        });
        toast("Living Citadel: Put top card into mana zone!");
    },
    "Fort Megacluster": ({ draw, toast }) => {
        draw();
        toast("Fort Megacluster: Drew a card!");
    },
    "Phantasmal Horror Gigazald": ({ net, toast }) => {
        net.send("ACTION", { action: "DISCARD_RANDOM" });
        toast("Gigazald: Opponent discarded a card!");
    }
};

