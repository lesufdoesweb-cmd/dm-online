export const SPELL_EFFECTS = {
    "Holy Awe": ({ net, toast }) => { net.send("ACTION", { action: "TAP_ALL" }); toast("Holy Awe: Tap all enemy creatures!"); },
    "Solar Ray": ({ gsR, setTargeting, net, toast }) => {
        if (!gsR.current.opponent.battleZone.length) return;
        setTargeting({
            message: "Choose an enemy creature to tap",
            count: 1,
            validTargets: gsR.current.opponent.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                net.send("ACTION", { action: "TAP_TARGET", details: { targetId: selectedIds[0] } });
                toast("Enemy tapped!");
            }
        });
    },
    "Moonlight Flash": ({ gsR, setTargeting, net, toast }) => {
        if (!gsR.current.opponent.battleZone.length) return;
        setTargeting({
            message: "Choose up to 2 enemy creatures to tap",
            count: 2,
            validTargets: gsR.current.opponent.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                selectedIds.forEach(id => net.send("ACTION", { action: "TAP_TARGET", details: { targetId: id } }));
                toast("Enemies tapped!");
            }
        });
    },
    "Lost Soul": ({ net, toast }) => { net.send("ACTION", { action: "DISCARD_ALL" }); toast("Lost Soul: Opponent discards whole hand!"); },
    "Rumble Gate": ({ setGs, toast }) => {
        setGs(p => ({
            ...p,
            battleZone: p.battleZone.map(c => ({
                ...c,
                powerBonus: (c.powerBonus || 0) + 1000,
                canAttackUntappedThisTurn: true
            }))
        }));
        toast("Rumble Gate: Your creatures +1000 and can attack untapped!");
    },
    "Diamond Cutter": ({ setGs, toast }) => {
        setGs(p => ({
            ...p,
            battleZone: p.battleZone.map(c => ({ ...c, canAttackPlayersOverride: true }))
        }));
        toast("Diamond Cutter: Your creatures can attack as if not blockers!");
    },
    "Mana Crisis": ({ gsR, setSearchingDeck, net, toast }) => {
        const s = gsR.current;
        if (!s.opponent.mana.length) return;
        setSearchingDeck({
            message: "Mana Crisis: Choose enemy mana to destroy",
            customList: s.opponent.mana,
            count: 1,
            onComplete: (card) => {
                net.send("ACTION", { action: "DESTROY_MANA", details: { targetId: card.instanceId } });
                toast("Mana destroyed!");
            }
        });
    },
    "Searing Wave": ({ gsR, net, setGs, setSearchingDeck, toast }) => {
        net.send("ACTION", { action: "DESTROY_ALL_WEAK", details: { maxPower: 3000 } });
        const s = gsR.current;
        if (!s.shields.length) return;
        setSearchingDeck({
            message: "Searing Wave: Select a shield to put into graveyard",
            count: 1,
            customList: s.shields,
            isFaceDown: true,
            onComplete: (shield) => {
                setGs(p => {
                    const ns = p.shields.filter(x => x.instanceId !== shield.instanceId);
                    return { ...p, shields: ns, graveyard: [...p.graveyard, shield] };
                });
                toast("Searing Wave: Destroyed weak enemies & sacrificed shield!");
            }
        });
    },
    "Clone Factory": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setSearchingDeck({
            message: "Clone Factory: Select up to 2 cards from mana to return to hand",
            count: 2,
            customList: s.mana,
            onComplete: (cards) => {
                const selected = Array.isArray(cards) ? cards : [cards];
                const ids = selected.map(c => c.instanceId);
                setGs(prev => ({
                    ...prev,
                    mana: prev.mana.filter(m => !ids.includes(m.instanceId)),
                    hand: [...prev.hand, ...selected]
                }));
                toast("Cards returned from mana!");
            }
        });
    },
    "Burst Shot": ({ setGs, net, toast, CardEngine }) => {
        setGs(p => {
            const toDestroy = p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= 2000);
            return { ...p, battleZone: p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) > 2000), graveyard: [...p.graveyard, ...toDestroy] };
        });
        net.send("ACTION", { action: "DESTROY_ALL_WEAK", details: { maxPower: 2000 } });
        toast("Burst Shot cast!");
    },
    "Laser Wing": ({ gsR, setTargeting, setGs, toast }) => {
        if (!gsR.current.battleZone.length) return;
        setTargeting({
            message: "Select 2 creatures to make unblockable",
            count: 2,
            validTargets: gsR.current.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                setGs(s => ({ ...s, battleZone: s.battleZone.map(c => selectedIds.includes(c.instanceId) ? { ...c, cantBeBlockedThisTurn: true } : c) }));
                toast("Creatures unblockable!");
            }
        });
    },
    "Mana Nexus": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setSearchingDeck({
            message: "Mana Nexus: Select mana to put into shields",
            count: 1,
            customList: s.mana,
            onComplete: (card) => {
                setGs(prev => ({
                    ...prev,
                    mana: prev.mana.filter(x => x.instanceId !== card.instanceId),
                    shields: [...prev.shields, card]
                }));
                toast("Mana put into shields!");
            }
        });
    },
    "Sonic Wing": ({ gsR, setTargeting, setGs, toast }) => {
        if (!gsR.current.battleZone.length) return;
        setTargeting({
            message: "Select a creature to make unblockable",
            count: 1,
            validTargets: gsR.current.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                const id = selectedIds[0];
                setGs(s => ({ ...s, battleZone: s.battleZone.map(c => c.instanceId === id ? { ...c, cantBeBlockedThisTurn: true } : c) }));
                toast("Creature unblockable!");
            }
        });
    },
    "Brain Serum": ({ draw, toast }) => { draw(); setTimeout(() => draw(), 200); toast("Brain Serum: Draw 2!"); },
    "Spiral Gate": ({ gsR, setTargeting, net, setGs, toast }) => {
        const all = [...gsR.current.battleZone, ...gsR.current.opponent.battleZone];
        if (!all.length) return;
        setTargeting({
            message: "Select a creature to bounce",
            count: 1,
            validTargets: all.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                const id = selectedIds[0];
                net.send("ACTION", { action: "BOUNCE_TARGET", details: { targetId: id } });
                setGs(s => {
                    const c = s.battleZone.find(x => x.instanceId === id);
                    if (!c) return s;
                    return { ...s, battleZone: s.battleZone.filter(x => x.instanceId !== id), hand: [...s.hand, c] };
                });
                toast("Creature bounced!");
            }
        });
    },
    "Teleportation": ({ gsR, setTargeting, net, setGs, toast }) => {
        const all = [...gsR.current.battleZone, ...gsR.current.opponent.battleZone];
        if (!all.length) return;
        setTargeting({
            message: "Select up to 2 creatures to bounce",
            count: 2,
            validTargets: all.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                selectedIds.forEach(id => net.send("ACTION", { action: "BOUNCE_TARGET", details: { targetId: id } }));
                setGs(s => {
                    const toBounce = s.battleZone.filter(c => selectedIds.includes(c.instanceId));
                    return { ...s, battleZone: s.battleZone.filter(c => !selectedIds.includes(c.instanceId)), hand: [...s.hand, ...toBounce] };
                });
                toast("Creatures bounced!");
            }
        });
    },
    "Crystal Memory": ({ setSearchingDeck, setGs, toast, askMay }) => {
        askMay({
            message: "Use Crystal Memory's effect to search your deck?",
            onYes: () => {
                setSearchingDeck({
                    message: "Crystal Memory: Search Deck",
                    count: 1,
                    filter: () => true,
                    onComplete: (card) => {
                        setGs(s => {
                            const newDeck = s.deck.filter(x => x.instanceId !== card.instanceId).sort(() => Math.random() - 0.5);
                            return { ...s, deck: newDeck, hand: [...s.hand, card] };
                        });
                        toast("Card added to hand!");
                    }
                });
            }
        });
    },
    "Virtual Tripwire": ({ gsR, setTargeting, net, toast }) => {
        if (!gsR.current.opponent.battleZone.length) return;
        setTargeting({
            message: "Select an enemy creature to tap",
            count: 1,
            validTargets: gsR.current.opponent.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                net.send("ACTION", { action: "TAP_TARGET", details: { targetId: selectedIds[0] } });
                toast("Enemy tapped!");
            }
        });
    },
    "Critical Blade": ({ gsR, setTargeting, net, toast, CardEngine }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.parseAbilities(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana).blocker);
        if (!targets.length) { toast("No blockers to destroy"); return; }
        setTargeting({
            message: "Critical Blade: Select a blocker to destroy",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: selectedIds[0] } });
                toast("Blocker destroyed!");
            }
        });
    },
    "Logic Cube": ({ setSearchingDeck, net, setGs, toast }) => {
        setSearchingDeck({
            message: "Logic Cube: Search for a Spell",
            count: 1,
            filter: (c) => c.type === 'Spell',
            onComplete: (card) => {
                net.send("ACTION", { action: "REVEAL_CARD", details: { card } });
                setGs(s => {
                    const newDeck = s.deck.filter(x => x.instanceId !== card.instanceId).sort(() => Math.random() - 0.5);
                    return { ...s, deck: newDeck, hand: [...s.hand, card] };
                });
                toast(`${card.name} added to hand!`);
            }
        });
    },
    "Rainbow Stone": ({ setSearchingDeck, setGs, toast }) => {
        setSearchingDeck({
            message: "Rainbow Stone: Search for a card to put into mana",
            count: 1,
            filter: () => true,
            onComplete: (card) => {
                setGs(s => {
                    const newDeck = s.deck.filter(x => x.instanceId !== card.instanceId).sort(() => Math.random() - 0.5);
                    return { ...s, deck: newDeck, mana: [...s.mana, { ...card, isTapped: false }] };
                });
                toast("Card put into mana zone!");
            }
        });
    },
    "Recon Operation": ({ gsR, setSearchingDeck, toast }) => {
        const s = gsR.current;
        if (!s.opponent.shields?.length) return;
        const count = Math.min(s.opponent.shields.length, 3);
        const shieldsToPeek = s.opponent.shields.slice(-count);
        setSearchingDeck({
            message: `Recon Operation: Peeking at ${count} shields`,
            count: 0,
            isViewOnly: true,
            customList: shieldsToPeek,
            filter: () => true,
            onComplete: () => {}
        });
        toast("Recon Operation: Peeked at shields!");
    },
    "Thought Probe": ({ gsR, draw, toast }) => {
        if (gsR.current.opponent.battleZone.length >= 3) {
            draw(); draw(); draw();
            toast("Thought Probe: Draw 3 cards!");
        } else {
            toast("Less than 3 creatures \u2014 no draw");
        }
    },
    "Terror Pit": ({ gsR, setTargeting, net, toast }) => {
        if (!gsR.current.opponent.battleZone.length) return;
        setTargeting({
            message: "Select an enemy creature to destroy",
            count: 1,
            validTargets: gsR.current.opponent.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: selectedIds[0] } });
                toast("Enemy destroyed!");
            }
        });
    },
    "Death Smoke": ({ gsR, setTargeting, net, toast }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => !c.isTapped);
        if (!targets.length) { toast("No untapped creatures to destroy"); return; }
        setTargeting({
            message: "Select an untapped enemy creature to destroy",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: selectedIds[0] } });
                toast("Enemy destroyed!");
            }
        });
    },
    "Ghost Touch": ({ net, toast }) => { net.send("ACTION", { action: "DISCARD_RANDOM" }); toast("Ghost Touch: Opponent discards!"); },
    "Dark Reversal": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const creatures = gsR.current.graveyard.filter(c => c.type === 'Creature');
        if (!creatures.length) return;
        setSearchingDeck({
            message: "Dark Reversal: Select creature to return to hand",
            count: 1,
            customList: creatures,
            onComplete: (card) => {
                setGs(p => ({ ...p, graveyard: p.graveyard.filter(x => x.instanceId !== card.instanceId), hand: [...p.hand, card] }));
                toast("Dark Reversal: Recover creature!");
            }
        });
    },
    "Creeping Plague": ({ setGs, toast }) => {
        setGs(p => ({ ...p, turnEffects: { ...p.turnEffects, creepingPlague: true } }));
        toast("Creeping Plague active! All creatures get Slayer when blocked.", "error");
    },
    "Crimson Hammer": ({ gsR, setTargeting, net, toast, CardEngine }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.getCurrentPower(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana) <= 2000);
        if (!targets.length) { toast("No creatures with power <= 2000"); return; }
        setTargeting({
            message: "Destroy an enemy creature (Max 2000 power)",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: selectedIds[0] } });
                toast("Enemy destroyed!");
            }
        });
    },
    "Tornado Flame": ({ gsR, setTargeting, net, toast, CardEngine }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.getCurrentPower(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana) <= 4000);
        if (!targets.length) { toast("No creatures with power <= 4000"); return; }
        setTargeting({
            message: "Destroy an enemy creature (Max 4000 power)",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: selectedIds[0] } });
                toast("Enemy destroyed!");
            }
        });
    },
    "Burning Power": ({ gsR, setTargeting, setGs, toast }) => {
        if (!gsR.current.battleZone.length) return;
        setTargeting({
            message: "Select a creature to give +2000 power",
            count: 1,
            validTargets: gsR.current.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                const id = selectedIds[0];
                setGs(s => ({ ...s, battleZone: s.battleZone.map(c => c.instanceId === id ? { ...c, powerBonus: (c.powerBonus || 0) + 2000 } : c) }));
                toast("Power boosted!");
            }
        });
    },
    "Magma Gazer": ({ gsR, setTargeting, setGs, toast }) => {
        if (!gsR.current.battleZone.length) return;
        setTargeting({
            message: "Select a creature to give +4000 power & double breaker",
            count: 1,
            validTargets: gsR.current.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                const id = selectedIds[0];
                setGs(s => ({ ...s, battleZone: s.battleZone.map(c => c.instanceId === id ? { ...c, tempPowerAttacker: (c.tempPowerAttacker || 0) + 4000, tempDoubleBreaker: true } : c) }));
                toast("Power boosted!");
            }
        });
    },
    "Chaos Strike": ({ gsR, setTargeting, setGs, toast }) => {
        if (!gsR.current.opponent.battleZone.length) return;
        setTargeting({
            message: "Select an enemy creature. Your units can attack it as if tapped.",
            count: 1,
            validTargets: gsR.current.opponent.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                const id = selectedIds[0];
                setGs(s => ({
                    ...s,
                    opponent: {
                        ...s.opponent,
                        battleZone: s.opponent.battleZone.map(c => c.instanceId === id ? { ...c, chaosStrikeTarget: true } : c)
                    }
                }));
                toast("Chaos Strike targeted creature!");
            }
        });
    },
    "Aura Blast": ({ setGs, toast }) => {
        setGs(p => ({ ...p, battleZone: p.battleZone.map(c => ({ ...c, tempPowerAttacker: (c.tempPowerAttacker || 0) + 2000 })) }));
        toast("Aura Blast: All creatures +2000 Power Attacker!");
    },
    "Natural Snare": ({ gsR, setTargeting, net, toast }) => {
        if (!gsR.current.opponent.battleZone.length) return;
        setTargeting({
            message: "Select an enemy creature to send to mana",
            count: 1,
            validTargets: gsR.current.opponent.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                net.send("ACTION", { action: "CREATURE_TO_MANA_TARGET", details: { targetId: selectedIds[0] } });
                toast("Enemy sent to mana!");
            }
        });
    },
    "Dimension Gate": ({ setSearchingDeck, net, setGs, toast }) => {
        setSearchingDeck({
            message: "Dimension Gate: Search for a Creature",
            count: 1,
            filter: (c) => c.type === 'Creature',
            onComplete: (card) => {
                net.send("ACTION", { action: "REVEAL_CARD", details: { card } });
                setGs(s => {
                    const newDeck = s.deck.filter(x => x.instanceId !== card.instanceId).sort(() => Math.random() - 0.5);
                    return { ...s, deck: newDeck, hand: [...s.hand, card] };
                });
                toast(`${card.name} added to hand!`);
            }
        });
    },
    "Ultimate Force": ({ setGs, toast }) => {
        setGs(p => { const d = [...p.deck]; const added = []; for (let i = 0; i < 2 && d.length; i++) added.push(d.pop()); return { ...p, mana: [...p.mana, ...added.map(c => ({ ...c, isTapped: false }))], deck: d }; });
        toast("Ultimate Force: 2 cards to mana!");
    },
    "Pangaea's Song": ({ gsR, setTargeting, setGs, toast }) => {
        if (!gsR.current.battleZone.length) return;
        setTargeting({
            message: "Select your creature to send to mana zone",
            count: 1,
            validTargets: gsR.current.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                const id = selectedIds[0];
                setGs(s => {
                    const c = s.battleZone.find(x => x.instanceId === id);
                    return { ...s, battleZone: s.battleZone.filter(x => x.instanceId !== id), mana: [...s.mana, { ...c, isTapped: false }] };
                });
                toast("Creature sent to mana zone!");
            }
        });
    },
    "Coiling Vines": ({ net, toast }) => { net.send("ACTION", { action: "CREATURE_TO_MANA_CHOICE" }); toast("Coiling Vines: Creature to mana!"); },
    "Aurora of Reversal": ({ gsR, setGs, setSearchingDeck, toast }) => {
        const s = gsR.current;
        if (!s.shields.length) return;
        setSearchingDeck({
            message: "Aurora of Reversal: Select any number of shields to move to mana",
            count: s.shields.length,
            customList: s.shields,
            isFaceDown: true,
            exact: false,
            onComplete: (selectedCards) => {
                const cards = Array.isArray(selectedCards) ? selectedCards : [selectedCards];
                const ids = cards.map(c => c.instanceId);
                setGs(p => {
                    return {
                        ...p,
                        shields: p.shields.filter(c => !ids.includes(c.instanceId)),
                        mana: [...p.mana, ...cards.map(c => ({...c, isTapped: false}))]
                    };
                });
                toast("Shields moved to mana!");
            }
        });
    },
    "Blaze Cannon": ({ gsR, setGs, toast, CardEngine }) => {
        const s = gsR.current;
        if (!CardEngine.isMono(s.mana, 'Fire')) {
            toast("Mana is not mono-fire!", "error");
            return;
        }
        setGs(p => ({
            ...p,
            battleZone: p.battleZone.map(c => ({ ...c, tempPowerAttacker: (c.tempPowerAttacker || 0) + 4000, tempDoubleBreaker: true }))
        }));
        toast("Blaze Cannon: All units +4000 and Double Breaker!");
    },
    "Boomerang Comet": ({ card, gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setSearchingDeck({
            message: "Boomerang Comet: Select a card from mana to return to hand",
            customList: s.mana,
            count: 1,
            onComplete: (cardFromMana) => {
                setGs(prev => {
                    return {
                        ...prev,
                        mana: [...prev.mana.filter(m => m.instanceId !== cardFromMana.instanceId), { ...card, isTapped: false }],
                        hand: [...prev.hand, cardFromMana]
                    };
                });
                toast("Mana returned and spell moved to mana!");
            }
        });
    },
    "Crisis Boulder": ({ gsR, setGs, setTargeting, toast, finishDestruction }) => {
        setTargeting({
            message: "Select a creature or mana to destroy",
            count: 1,
            validTargets: [...gsR.current.battleZone.map(x => x.instanceId), ...gsR.current.mana.map(x => x.instanceId)],
            onComplete: (ids) => {
                const id = ids[0];
                const isCreature = gsR.current.battleZone.some(x => x.instanceId === id);
                if (isCreature) {
                    finishDestruction(gsR.current.battleZone.find(x => x.instanceId === id));
                } else {
                    setGs(p => ({
                        ...p,
                        mana: p.mana.filter(x => x.instanceId !== id),
                        graveyard: [...p.graveyard, p.mana.find(x => x.instanceId === id)]
                    }));
                }
                toast("Crisis Boulder: Target destroyed!");
            }
        });
    },
    "Eldritch Poison": ({ gsR, setTargeting, setSearchingDeck, setGs, toast, askMay }) => {
        const darks = gsR.current.battleZone.filter(c => c.civilizations?.includes('Darkness'));
        if (!darks.length) return;
        askMay({
            message: "Use Eldritch Poison's effect?",
            onYes: () => {
                setTargeting({
                    message: "Eldritch Poison: Select a Darkness creature to destroy",
                    count: 1,
                    validTargets: darks.map(c => c.instanceId),
                    onComplete: (creatureIds) => {
                        if (!gsR.current.mana.length) return;
                        setSearchingDeck({
                            message: "Select mana to return to hand",
                            customList: gsR.current.mana,
                            count: 1,
                            onComplete: (manaCard) => {
                                setGs(p => {
                                    const c = p.battleZone.find(x => x.instanceId === creatureIds[0]);
                                    return {
                                        ...p,
                                        battleZone: p.battleZone.filter(x => x.instanceId !== creatureIds[0]),
                                        graveyard: [...p.graveyard, c],
                                        mana: p.mana.filter(x => x.instanceId !== manaCard.instanceId),
                                        hand: [...p.hand, manaCard]
                                    };
                                });
                                toast("Eldritch Poison complete!");
                            }
                        });
                    }
                });
            }
        });
    },
    "Flood Valve": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setSearchingDeck({
            message: "Flood Valve: Select mana to return to hand",
            customList: s.mana,
            count: 1,
            onComplete: (card) => {
                setGs(p => {
                    return { ...p, mana: p.mana.filter(m => m.instanceId !== card.instanceId), hand: [...p.hand, card] };
                });
                toast("Mana returned to hand!");
            }
        });
    },
    "Logic Sphere": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const spells = gsR.current.mana.filter(c => c.type === 'Spell');
        if (!spells.length) return;
        setSearchingDeck({
            message: "Logic Sphere: Select a spell from your mana to return to hand",
            count: 1,
            customList: spells,
            onComplete: (card) => {
                setGs(p => ({ ...p, mana: p.mana.filter(m => m.instanceId !== card.instanceId), hand: [...p.hand, card] }));
                toast("Spell returned from mana!");
            }
        });
    },
    "Roar of the Earth": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const bigs = gsR.current.mana.filter(c => c.type === 'Creature' && c.cost >= 6);
        if (!bigs.length) return;
        setSearchingDeck({
            message: "Roar of the Earth: Select a creature (cost 6+) from mana",
            count: 1,
            customList: bigs,
            onComplete: (card) => {
                setGs(p => ({ ...p, mana: p.mana.filter(m => m.instanceId !== card.instanceId), hand: [...p.hand, card] }));
                toast("Creature returned from mana!");
            }
        });
    },
    "Ghastly Drain": ({ gsR, setGs, setSearchingDeck, toast }) => {
        const s = gsR.current;
        if (!s.shields.length) return;
        setSearchingDeck({
            message: "Ghastly Drain: Select any number of shields to take (No trigger)",
            count: s.shields.length,
            customList: s.shields,
            isFaceDown: true,
            exact: false,
            onComplete: (selectedCards) => {
                const cards = Array.isArray(selectedCards) ? selectedCards : [selectedCards];
                const ids = cards.map(c => c.instanceId);
                setGs(p => {
                    return {
                        ...p,
                        shields: p.shields.filter(c => !ids.includes(c.instanceId)),
                        hand: [...p.hand, ...cards]
                    };
                });
                toast("Shields taken to hand!");
            }
        });
    },
    "Liquid Scope": ({ gsR, setSearchingDeck, net, toast }) => {
        const s = gsR.current;
        net.send("ACTION", { action: "PEEK_HAND_SHIELDS" });
        setSearchingDeck({
            message: "Liquid Scope: Peeking at Opponent's Hand",
            count: 0,
            isViewOnly: true,
            customList: s.opponent.handCards || [], // Engine needs to provide this or approximation
            onComplete: () => {
                setSearchingDeck({
                    message: "Liquid Scope: Peeking at Opponent's Shields",
                    count: 0,
                    isViewOnly: true,
                    customList: s.opponent.shields || [],
                    onComplete: () => {}
                });
            }
        });
        toast("Liquid Scope: Peeking!");
    },
    "Psychic Shaper": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        const top4 = s.deck.slice(-4).reverse();
        setSearchingDeck({
            message: "Psychic Shaper: Top 4 cards",
            count: 0,
            isViewOnly: true,
            customList: top4,
            onComplete: () => {
                setGs(p => {
                    const cards = p.deck.slice(-4);
                    const water = cards.filter(c => c.civilizations?.includes('Water'));
                    const others = cards.filter(c => !c.civilizations?.includes('Water'));
                    return {
                        ...p,
                        deck: p.deck.slice(0, -4),
                        hand: [...p.hand, ...water],
                        graveyard: [...p.graveyard, ...others]
                    };
                });
                toast("Water cards added to hand!");
            }
        });
    },
    "Snake Attack": ({ gsR, setGs, setSearchingDeck, toast }) => {
        const s = gsR.current;
        if (!s.shields.length) return;
        setSearchingDeck({
            message: "Snake Attack: Select a shield to put into graveyard",
            count: 1,
            customList: s.shields,
            isFaceDown: true,
            onComplete: (shield) => {
                setGs(p => {
                    const ns = p.shields.filter(x => x.instanceId !== shield.instanceId);
                    return {
                        ...p,
                        shields: ns,
                        graveyard: [...p.graveyard, shield],
                        battleZone: p.battleZone.map(c => ({ ...c, tempDoubleBreaker: true }))
                    };
                });
                toast("Snake Attack: Mass Double Breaker but lost a shield!");
            }
        });
    },
    "Volcanic Arrows": ({ gsR, setTargeting, setSearchingDeck, setGs, net, toast, CardEngine }) => {
        const s = gsR.current;
        const targets = s.opponent.battleZone.filter(c => CardEngine.getCurrentPower(c, s.opponent.battleZone, s.opponent.mana) <= 6000);
        if (!targets.length) return;
        setTargeting({
            message: "Volcanic Arrows: Destroy creature (6000 or less)",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: ids[0] } });
                if (!s.shields.length) return;
                setSearchingDeck({
                    message: "Volcanic Arrows: Select a shield to put into graveyard",
                    count: 1,
                    customList: s.shields,
                    isFaceDown: true,
                    onComplete: (shield) => {
                        setGs(p => {
                            const ns = p.shields.filter(x => x.instanceId !== shield.instanceId);
                            return { ...p, shields: ns, graveyard: [...p.graveyard, shield] };
                        });
                        toast("Volcanic Arrows: Target destroyed, shield sacrificed!");
                    }
                });
            }
        });
    },
    "Sundrop Armor": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        if (!s.hand.length) return;
        setSearchingDeck({
            message: "Sundrop Armor: Select a card from hand to put into shields",
            count: 1,
            customList: s.hand,
            onComplete: (card) => {
                setGs(prev => ({
                    ...prev,
                    hand: prev.hand.filter(x => x.instanceId !== card.instanceId),
                    shields: [...prev.shields, card]
                }));
                toast("Card put into shields!");
            }
        });
    },
    "Chains of Sacrifice": ({ gsR, setTargeting, setGs, net, toast }) => {
        const oppCreatures = gsR.current.opponent.battleZone;
        if (!oppCreatures.length) return;
        setTargeting({
            message: "Chains of Sacrifice: Destroy up to 2 enemy creatures",
            count: 2,
            exact: false,
            validTargets: oppCreatures.map(c => c.instanceId),
            onComplete: (ids) => {
                ids.forEach(id => net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: id } }));
                if (!gsR.current.battleZone.length) return;
                setTargeting({
                    message: "Chains of Sacrifice: Select one of your creatures to destroy",
                    count: 1,
                    validTargets: gsR.current.battleZone.map(c => c.instanceId),
                    onComplete: (myIds) => {
                        const target = gsR.current.battleZone.find(x => x.instanceId === myIds[0]);
                        setGs(s => ({ ...s, battleZone: s.battleZone.filter(x => x.instanceId !== myIds[0]), graveyard: [...s.graveyard, target] }));
                        toast("Chains of Sacrifice complete!");
                    }
                });
            }
        });
    },
    "Darkpact": ({ gsR, setSearchingDeck, setGs, toast, draw }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setSearchingDeck({
            message: "Darkpact: Select any number of mana to sacrifice",
            count: s.mana.length,
            exact: false,
            customList: s.mana,
            onComplete: (selected) => {
                const cards = Array.isArray(selected) ? selected : [selected];
                const ids = cards.map(c => c.instanceId);
                setGs(p => ({
                    ...p,
                    mana: p.mana.filter(m => !ids.includes(m.instanceId)),
                    graveyard: [...p.graveyard, ...cards]
                }));
                for (let i = 0; i < cards.length; i++) setTimeout(() => draw(), i * 200);
                toast(`Darkpact: Drew ${cards.length} cards!`);
            }
        });
    },
    "Full Defensor": ({ setGs, toast }) => {
        setGs(p => ({
            ...p,
            battleZone: p.battleZone.map(c => ({ ...c, tempBlocker: true }))
        }));
        toast("Full Defensor: Your creatures are blockers until next turn!");
    },
    "Hydro Hurricane": ({ gsR, setGs, setSearchingDeck, setTargeting, net, toast }) => {
        const lightCount = gsR.current.battleZone.filter(c => c.civilizations?.includes('Light')).length;
        const darkCount = gsR.current.battleZone.filter(c => c.civilizations?.includes('Darkness')).length;
        
        const mCount = Math.min(lightCount, gsR.current.opponent.mana.length);
        if (mCount > 0) {
            setSearchingDeck({
                message: `Hydro Hurricane: Bounce ${mCount} enemy mana`,
                customList: gsR.current.opponent.mana,
                count: mCount,
                exact: true,
                onComplete: (cards) => {
                    const selected = Array.isArray(cards) ? cards : [cards];
                    selected.forEach(c => net.send("ACTION", { action: "MANA_TO_HAND_TARGET", details: { targetId: c.instanceId } }));
                    
                    const cCount = Math.min(darkCount, gsR.current.opponent.battleZone.length);
                    if (cCount > 0) {
                        setTargeting({
                            message: `Hydro Hurricane: Bounce ${cCount} enemy creatures`,
                            count: cCount,
                            exact: true,
                            validTargets: gsR.current.opponent.battleZone.map(c => c.instanceId),
                            onComplete: (ids) => {
                                ids.forEach(id => net.send("ACTION", { action: "BOUNCE_TARGET", details: { targetId: id } }));
                            }
                        });
                    }
                }
            });
        } else {
            const cCount = Math.min(darkCount, gsR.current.opponent.battleZone.length);
            if (cCount > 0) {
                setTargeting({
                    message: `Hydro Hurricane: Bounce ${cCount} enemy creatures`,
                    count: cCount,
                    exact: true,
                    validTargets: gsR.current.opponent.battleZone.map(c => c.instanceId),
                    onComplete: (ids) => {
                        ids.forEach(id => net.send("ACTION", { action: "BOUNCE_TARGET", details: { targetId: id } }));
                    }
                });
            }
        }
        toast("Hydro Hurricane triggered!");
    },
    "Brutal Charge": ({ setGs, toast }) => {
        setGs(p => ({ ...p, turnEffects: { ...p.turnEffects, brutalCharge: true } }));
        toast("Brutal Charge: Search effect active for end of turn!");
    },
    "Cataclysmic Eruption": ({ gsR, setSearchingDeck, net, toast }) => {
        const natureCount = gsR.current.battleZone.filter(c => c.civilizations?.includes('Nature')).length;
        if (natureCount === 0 || !gsR.current.opponent.mana.length) return;
        setSearchingDeck({
            message: `Cataclysmic Eruption: Select ${natureCount} enemy mana to destroy`,
            customList: gsR.current.opponent.mana,
            count: Math.min(natureCount, gsR.current.opponent.mana.length),
            exact: true,
            onComplete: (cards) => {
                const selected = Array.isArray(cards) ? cards : [cards];
                selected.forEach(c => net.send("ACTION", { action: "DESTROY_MANA_TARGET", details: { targetId: c.instanceId } }));
                toast("Mana destroyed!");
            }
        });
    },
    "Cyclone Panic": ({ setGs, net, toast }) => {
        setGs(p => {
            const count = p.hand.length;
            const newDeck = [...p.deck, ...p.hand].sort(() => Math.random() - 0.5);
            const newHand = newDeck.splice(0, count);
            return { ...p, hand: newHand, deck: newDeck };
        });
        net.send("ACTION", { action: "CYCLONE_PANIC" });
        toast("Hand shuffled into deck and redrawn!");
    },
    "Divine Riptide": ({ setGs, net, toast }) => {
        setGs(p => ({ ...p, hand: [...p.hand, ...p.mana], mana: [] }));
        net.send("ACTION", { action: "MANA_TO_HAND_ALL" });
        toast("All mana returned to hand!");
    },
    "Enchanted Soil": ({ gsR, setSearchingDeck, setGs, toast, CardEngine }) => {
        const creatures = gsR.current.graveyard.filter(c => CardEngine.isCreature(c));
        if (!creatures.length) return;
        setSearchingDeck({
            message: "Enchanted Soil: Select up to 2 creatures to move to mana",
            customList: creatures,
            count: 2,
            exact: false,
            onComplete: (cards) => {
                const selected = Array.isArray(cards) ? cards : [cards];
                setGs(p => {
                    const ids = selected.map(x => x.instanceId);
                    return { ...p, graveyard: p.graveyard.filter(x => !ids.includes(x.instanceId)), mana: [...p.mana, ...selected.map(x => ({ ...x, isTapped: false }))] };
                });
                toast("Creatures moved to mana zone!");
            }
        });
    },
    "Glory Snow": ({ gsR, setGs, toast }) => {
        const s = gsR.current;
        if (s.opponent.mana.length > s.mana.length) {
            setGs(p => {
                const top2 = p.deck.slice(0, 2);
                return { ...p, deck: p.deck.slice(2), mana: [...p.mana, ...top2.map(x => ({ ...x, isTapped: false }))] };
            });
            toast("Glory Snow: 2 mana ramped!");
        }
    },
    "Miracle Quest": ({ setGs, toast }) => {
        setGs(p => ({ ...p, turnEffects: { ...p.turnEffects, miracleQuest: true } }));
        toast("Miracle Quest: Draw 2 effect active for each shield break!");
    },
    "Mega Detonator": ({ gsR, setGs, setSearchingDeck, setTargeting, toast }) => {
        const s = gsR.current;
        if (!s.hand.length || !s.battleZone.length) return;
        setSearchingDeck({
            message: "Mega Detonator: Discard cards to give creatures Double Breaker",
            count: s.hand.length,
            exact: false,
            customList: s.hand,
            onComplete: (discarded) => {
                const discards = Array.isArray(discarded) ? discarded : [discarded];
                const count = discards.length;
                setGs(p => ({ ...p, hand: p.hand.filter(c => !discards.map(d => d.instanceId).includes(c.instanceId)), graveyard: [...p.graveyard, ...discards] }));
                
                setTargeting({
                    message: `Mega Detonator: Select ${count} creatures to give Double Breaker`,
                    count: count,
                    exact: true,
                    validTargets: gsR.current.battleZone.map(c => c.instanceId),
                    onComplete: (ids) => {
                        setGs(p => ({
                            ...p,
                            battleZone: p.battleZone.map(c => ids.includes(c.instanceId) ? { ...c, tempDoubleBreaker: true } : c)
                        }));
                        toast("Creatures buffed!");
                    }
                });
            }
        });
    },
    "Mystic Inscription": ({ draw, setGs, toast }) => {
        setGs(p => {
            const d = [...p.deck];
            if (!d.length) return p;
            const c = d.pop();
            return { ...p, deck: d, shields: [...p.shields, c] };
        });
        toast("Mystic Inscription: Card added to shields!");
    },
    "Screaming Sunburst": ({ setGs, net, toast }) => {
        setGs(p => ({
            ...p,
            battleZone: p.battleZone.map(c => !c.civilizations?.includes('Light') ? { ...c, isTapped: true } : c)
        }));
        net.send("ACTION", { action: "TAP_ALL_EXCEPT_LIGHT" });
        toast("Screaming Sunburst: Tapped non-light creatures!");
    },
    "Soul Gulp": ({ gsR, net, toast }) => {
        net.send("ACTION", { action: "DISCARD_FOR_EACH_LIGHT" });
        toast("Soul Gulp: Opponent discards for their light creatures!");
    },
    "Sword of Benevolent Life": ({ gsR, setGs, toast }) => {
        const lightCount = gsR.current.battleZone.filter(c => c.civilizations?.includes('Light')).length;
        const bonus = lightCount * 1000;
        setGs(p => ({
            ...p,
            battleZone: p.battleZone.map(c => ({ ...c, powerBonus: (c.powerBonus || 0) + bonus }))
        }));
        toast(`Sword of Benevolent Life: All creatures +${bonus}!`);
    },
    "Sword of Malevolent Death": ({ gsR, setTargeting, setGs, toast }) => {
        setTargeting({
            message: "Sword of Malevolent Death: Select a creature to buff",
            count: 1,
            validTargets: gsR.current.battleZone.map(c => c.instanceId),
            onComplete: (ids) => {
                setGs(p => ({
                    ...p,
                    battleZone: p.battleZone.map(c => c.instanceId === ids[0] ? { ...c, swordBuff: true } : c)
                }));
                toast("Creature buffed by Sword of Malevolent Death!");
            }
        });
    },
    "Whisking Whirlwind": ({ setGs, toast }) => {
        setGs(p => ({ ...p, turnEffects: { ...p.turnEffects, whiskingWhirlwind: true } }));
        toast("Whisking Whirlwind: All creatures will untap at end of turn!");
    },
    "Brutal Charge Trigger": ({ gsR, setSearchingDeck, setGs, toast, CardEngine }) => {
        const count = gsR.current.shieldsBrokenThisTurn;
        if (count === 0) return;
        setSearchingDeck({
            message: `Brutal Charge: Search up to ${count} creatures from deck`,
            count: count,
            exact: false,
            onComplete: (cards) => {
                const selected = Array.isArray(cards) ? cards : [cards];
                setGs(p => {
                    const ids = selected.map(x => x.instanceId);
                    return { ...p, deck: p.deck.filter(x => !ids.includes(x.instanceId)), hand: [...p.hand, ...selected] };
                });
                toast("Creatures added to hand!");
            }
        });
    },
    "Bonds of Justice": ({ gsR, setGs, net, toast, CardEngine }) => {
        const creatures = [...gsR.current.battleZone, ...gsR.current.opponent.battleZone];
        creatures.forEach(c => {
            const abs = CardEngine.parseAbilities(c, [], []);
            if (!abs.blocker) {
                const isMine = gsR.current.battleZone.some(x => x.instanceId === c.instanceId);
                if (isMine) {
                    setGs(p => ({ ...p, battleZone: p.battleZone.map(x => x.instanceId === c.instanceId ? { ...x, isTapped: true } : x) }));
                } else {
                    net.send("ACTION", { action: "TAP_TARGET", details: { targetId: c.instanceId } });
                }
            }
        });
        toast("Bonds of Justice: Tapped all non-blockers!");
    },
    "Comet Missile": ({ gsR, setTargeting, net, toast, CardEngine }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => {
            const abs = CardEngine.parseAbilities(c, [], []);
            const power = CardEngine.getCurrentPower(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana);
            return abs.blocker && power <= 6000;
        });
        if (!targets.length) return;
        setTargeting({
            message: "Comet Missile: Select a blocker to destroy (power 6000 or less)",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "CREATURE_DESTROYED", details: { targetId: ids[0] } });
                toast("Blocker destroyed!");
            }
        });
    },
    "Invincible Abyss": ({ gsR, net, toast }) => {
        gsR.current.opponent.battleZone.forEach(c => {
            net.send("ACTION", { action: "CREATURE_DESTROYED", details: { targetId: c.instanceId } });
        });
        toast("Invincible Abyss: All enemy creatures destroyed!");
    },
    "Invincible Aura": ({ setGs, toast }) => {
        setGs(p => {
            const top3 = p.deck.slice(0, 3);
            return { ...p, deck: p.deck.slice(3), shields: [...p.shields, ...top3] };
        });
        toast("Invincible Aura: 3 shields added from deck!");
    },
    "Invincible Cataclysm": ({ gsR, net, toast }) => {
        const count = Math.min(3, gsR.current.opponent.shields.length);
        for (let i = 0; i < count; i++) {
            setTimeout(() => net.send("ACTION", { action: "SHIELD_INCINERATED" }), i * 400);
        }
        toast(`Invincible Cataclysm: ${count} shields incinerated!`);
    },
    "Invincible Fortress": ({ gsR, net, toast }) => {
        const count = Math.min(3, gsR.current.opponent.shields.length);
        for (let i = 0; i < count; i++) {
            setTimeout(() => net.send("ACTION", { action: "SHIELD_BROKEN" }), i * 400);
        }
        toast(`Invincible Fortress: ${count} shields broken!`);
    },
    "Invincible Technology": ({ gsR, setSearchingDeck, setGs, toast }) => {
        setSearchingDeck({
            message: "Invincible Technology: Select any number of cards from deck",
            count: gsR.current.deck.length,
            exact: false,
            onComplete: (cards) => {
                const selected = Array.isArray(cards) ? cards : [cards];
                setGs(p => {
                    const ids = selected.map(x => x.instanceId);
                    return { ...p, deck: p.deck.filter(x => !ids.includes(x.instanceId)), hand: [...p.hand, ...selected] };
                });
                toast("Selected cards added to hand!");
            }
        });
    }
};
