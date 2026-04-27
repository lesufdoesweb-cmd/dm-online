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
    "Mana Crisis": ({ gsR, setTargeting, net, toast }) => {
        const s = gsR.current;
        if (!s.opponent.mana.length) return;
        setTargeting({
            message: "Mana Crisis: Choose enemy mana to destroy",
            count: 1,
            validTargets: s.opponent.mana.map(m => m.instanceId),
            isManaTarget: true,
            onComplete: (ids) => {
                net.send("ACTION", { action: "DESTROY_MANA", details: { targetId: ids[0] } });
                toast("Mana destroyed!");
            }
        });
    },
    "Searing Wave": ({ gsR, net, setGs, setTargeting, toast }) => {
        net.send("ACTION", { action: "DESTROY_ALL_WEAK", details: { maxPower: 3000 } });
        const s = gsR.current;
        if (!s.shields.length) return;
        setTargeting({
            message: "Searing Wave: Select a shield to put into graveyard",
            count: 1,
            validTargets: s.shields.map((_, i) => `shield-${i}`),
            isShieldTarget: true,
            onComplete: (ids) => {
                const idx = parseInt(ids[0].split('-')[1]);
                setGs(p => {
                    const ns = [...p.shields];
                    const removed = ns.splice(idx, 1)[0];
                    return { ...p, shields: ns, graveyard: [...p.graveyard, removed] };
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
                const ids = Array.isArray(cards) ? cards.map(c => c.instanceId) : [cards.instanceId];
                setGs(prev => ({
                    ...prev,
                    mana: prev.mana.filter(m => !ids.includes(m.instanceId)),
                    hand: [...prev.hand, ...(Array.isArray(cards) ? cards : [cards])]
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
    "Mana Nexus": ({ card, gsR, setSearchingDeck, setGs, net, toast }) => {
        const s = gsR.current;
        if (card.set_id === 'dm-03') {
            if (!s.mana.length) return;
            setSearchingDeck({
                message: "Mana Nexus (DM-03): Select mana to put into shields",
                count: 1,
                customList: s.mana,
                onComplete: (card) => {
                    setGs(prev => ({
                        ...prev,
                        mana: prev.mana.filter(x => x.instanceId !== card.instanceId),
                        shields: [...prev.shields, card]
                    }));
                    net.send("ACTION", { action: "GRAVE_TO_SHIELD" }); // reuse same action
                    toast("Mana put into shields!");
                }
            });
        } else {
            if (!s.graveyard.length) return;
            setSearchingDeck({
                message: "Mana Nexus: Select a card from graveyard to put into shields",
                count: 1,
                customList: s.graveyard,
                onComplete: (card) => {
                    setGs(prev => ({
                        ...prev,
                        graveyard: prev.graveyard.filter(x => x.instanceId !== card.instanceId),
                        shields: [...prev.shields, card]
                    }));
                    net.send("ACTION", { action: "GRAVE_TO_SHIELD" });
                    toast("Card put into shields!");
                }
            });
        }
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
                setGs(s => ({ ...s, battleZone: s.battleZone.map(c => c.instanceId === id ? { ...c, powerBonus: (c.powerBonus || 0) + 4000, tempDoubleBreaker: true } : c) }));
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
        setGs(p => ({ ...p, battleZone: p.battleZone.map(c => ({ ...c, powerBonus: (c.powerBonus || 0) + 2000 })) }));
        toast("Aura Blast: All creatures +2000!");
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
    "Aurora of Reversal": ({ gsR, setTargeting, setGs, toast }) => {
        const s = gsR.current;
        if (!s.shields.length) return;
        setTargeting({
            message: "Aurora of Reversal: Select any number of shields to move to mana",
            count: s.shields.length,
            validTargets: s.shields.map((_, i) => `shield-${i}`),
            isShieldTarget: true,
            allowPartial: true,
            onComplete: (selectedIds) => {
                const indices = selectedIds.map(id => parseInt(id.split('-')[1]));
                setGs(p => {
                    const targets = p.shields.filter((_, i) => indices.includes(i));
                    return {
                        ...p,
                        shields: p.shields.filter((_, i) => !indices.includes(i)),
                        mana: [...p.mana, ...targets.map(c => ({...c, isTapped: false}))]
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
            battleZone: p.battleZone.map(c => ({ ...c, powerBonus: (c.powerBonus || 0) + 4000, tempDoubleBreaker: true }))
        }));
        toast("Blaze Cannon: All units +4000 and Double Breaker!");
    },
    "Boomerang Comet": ({ card, gsR, setTargeting, setGs, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setTargeting({
            message: "Boomerang Comet: Select a card from mana to return to hand",
            count: 1,
            validTargets: s.mana.map(m => m.instanceId),
            isManaTarget: true,
            onComplete: (ids) => {
                setGs(prev => {
                    const target = prev.mana.find(m => m.instanceId === ids[0]);
                    return {
                        ...prev,
                        mana: [...prev.mana.filter(m => m.instanceId !== ids[0]), { ...card, isTapped: false }],
                        hand: [...prev.hand, target]
                    };
                });
                toast("Mana returned and spell moved to mana!");
            }
        });
    },
    "Eldritch Poison": ({ gsR, setTargeting, setGs, toast, askMay }) => {
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
                        setTargeting({
                            message: "Select mana to return to hand",
                            count: 1,
                            validTargets: gsR.current.mana.map(m => m.instanceId),
                            isManaTarget: true,
                            onComplete: (manaIds) => {
                                setGs(p => {
                                    const c = p.battleZone.find(x => x.instanceId === creatureIds[0]);
                                    const m = p.mana.find(x => x.instanceId === manaIds[0]);
                                    return {
                                        ...p,
                                        battleZone: p.battleZone.filter(x => x.instanceId !== creatureIds[0]),
                                        graveyard: [...p.graveyard, c],
                                        mana: p.mana.filter(x => x.instanceId !== manaIds[0]),
                                        hand: [...p.hand, m]
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
    "Flood Valve": ({ gsR, setTargeting, setGs, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setTargeting({
            message: "Flood Valve: Select mana to return to hand",
            count: 1,
            validTargets: s.mana.map(m => m.instanceId),
            isManaTarget: true,
            onComplete: (ids) => {
                setGs(p => {
                    const target = p.mana.find(m => m.instanceId === ids[0]);
                    return { ...p, mana: p.mana.filter(m => m.instanceId !== ids[0]), hand: [...p.hand, target] };
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
    "Ghastly Drain": ({ gsR, setTargeting, setGs, toast }) => {
        const s = gsR.current;
        if (!s.shields.length) return;
        setTargeting({
            message: "Ghastly Drain: Select any number of shields to take (No trigger)",
            count: s.shields.length,
            validTargets: s.shields.map((_, i) => `shield-${i}`),
            isShieldTarget: true,
            allowPartial: true,
            onComplete: (selectedIds) => {
                const indices = selectedIds.map(id => parseInt(id.split('-')[1]));
                setGs(p => {
                    const targets = p.shields.filter((_, i) => indices.includes(i));
                    return {
                        ...p,
                        shields: p.shields.filter((_, i) => !indices.includes(i)),
                        hand: [...p.hand, ...targets]
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
    "Snake Attack": ({ gsR, setGs, setTargeting, toast }) => {
        const s = gsR.current;
        if (!s.shields.length) return;
        setTargeting({
            message: "Snake Attack: Select a shield to put into graveyard",
            count: 1,
            validTargets: s.shields.map((_, i) => `shield-${i}`),
            isShieldTarget: true,
            onComplete: (ids) => {
                const idx = parseInt(ids[0].split('-')[1]);
                setGs(p => {
                    const ns = [...p.shields];
                    const removed = ns.splice(idx, 1)[0];
                    return {
                        ...p,
                        shields: ns,
                        graveyard: [...p.graveyard, removed],
                        battleZone: p.battleZone.map(c => ({ ...c, tempDoubleBreaker: true }))
                    };
                });
                toast("Snake Attack: Mass Double Breaker but lost a shield!");
            }
        });
    },
    "Volcanic Arrows": ({ gsR, setTargeting, setGs, net, toast, CardEngine }) => {
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
                setTargeting({
                    message: "Volcanic Arrows: Select a shield to put into graveyard",
                    count: 1,
                    validTargets: s.shields.map((_, i) => `shield-${i}`),
                    isShieldTarget: true,
                    onComplete: (shieldIds) => {
                        const idx = parseInt(shieldIds[0].split('-')[1]);
                        setGs(p => {
                            const ns = [...p.shields];
                            const removed = ns.splice(idx, 1)[0];
                            return { ...p, shields: ns, graveyard: [...p.graveyard, removed] };
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
};