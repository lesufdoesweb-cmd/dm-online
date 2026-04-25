/* ============ CARD EFFECTS ENGINE ============ */

/**
 * These effects are executed within the GameBoard context.
 * They rely on being passed the following dependencies:
 * { draw, setGs, toast, net, setSearchingDeck, setTargeting, gsR, play, attack, CardEngine }
 */

export const ETB_EFFECTS = {
    "Aqua Hulcus": ({ draw, toast }) => { draw(); toast("Aqua Hulcus: Draw 1 card!"); },
    "Aqua Sniper": ({ gsR, setTargeting, net, setGs, toast }) => {
        const s = gsR.current;
        const allCreatures = [...s.battleZone, ...s.opponent.battleZone];
        if (!allCreatures.length) return;
        setTargeting({
            message: "Select up to 2 creatures to bounce",
            count: 2,
            validTargets: allCreatures.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                selectedIds.forEach(id => net.send("ACTION", { action: "BOUNCE_TARGET", details: { targetId: id } }));
                setGs(s => {
                    const toBounce = s.battleZone.filter(c => selectedIds.includes(c.instanceId));
                    return { ...s, battleZone: s.battleZone.filter(c => !selectedIds.includes(c.instanceId)), hand: [...s.hand, ...toBounce] };
                });
                toast(`Bounced ${selectedIds.length} creatures!`);
            }
        });
    },
    "King Ripped-Hide": ({ draw, toast }) => { draw(); setTimeout(() => draw(), 200); toast("King Ripped-Hide: Draw 2 cards!"); },
    "Emeral": ({ gsR, setSearchingDeck, setTargeting, setGs, toast, askMay }) => {
        const s = gsR.current;
        if (!s.hand.length) return;
        askMay({
            message: "Use Emeral's effect to swap a card with a shield?",
            onYes: () => {
                setSearchingDeck({
                    message: "Emeral: Select a card from your hand to put into shields",
                    count: 1,
                    customList: s.hand,
                    onComplete: (handCard) => {
                        setTargeting({
                            message: "Emeral: Select a shield to take to hand",
                            count: 1,
                            validTargets: s.shields.map((_, i) => `shield-${i}`),
                            isShieldTarget: true,
                            onComplete: (shieldIds) => {
                                const shieldIdx = parseInt(shieldIds[0].split('-')[1]);
                                setGs(prev => {
                                    const newHand = prev.hand.filter(x => x.instanceId !== handCard.instanceId);
                                    const newShields = [...prev.shields];
                                    const takenShield = newShields.splice(shieldIdx, 1, handCard)[0];
                                    return {
                                        ...prev,
                                        hand: [...newHand, takenShield],
                                        shields: newShields
                                    };
                                });
                                toast("Shield swapped!");
                            }
                        });
                    }
                });
            }
        });
    },
    "Saucer-Head Shark": ({ setGs, net, toast, CardEngine }) => {
        setGs(p => {
            const toReturn = p.battleZone.filter(c => CardEngine.basePower(c, p.battleZone, p.mana) <= 2000);
            return { ...p, battleZone: p.battleZone.filter(c => CardEngine.basePower(c, p.battleZone, p.mana) > 2000), hand: [...p.hand, ...toReturn] };
        });
        net.send("ACTION", { action: "BOUNCE_WEAK", details: { maxPower: 2000 } });
        toast("Saucer-Head Shark: Bounce weak creatures!");
    },
    "Unicorn Fish": ({ gsR, setTargeting, net, setGs, toast }) => {
        const s = gsR.current;
        const allCreatures = [...s.battleZone, ...s.opponent.battleZone];
        if (!allCreatures.length) return;
        setTargeting({
            message: "Select a creature to bounce",
            count: 1,
            validTargets: allCreatures.map(c => c.instanceId),
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
    "Illusionary Merfolk": ({ gsR, toast, draw }) => {
        const hasCyberLord = gsR.current.battleZone.some(c => c.subtypes?.some(s => s.toLowerCase().includes('cyber lord')));
        if (hasCyberLord) { toast("Illusionary Merfolk: Draw 3!"); setTimeout(() => { draw(); setTimeout(() => { draw(); setTimeout(() => draw(), 150); }, 150); }, 100); }
        else { toast("No Cyber Lord — no draw"); }
    },
    "Artisan Picora": ({ setGs, toast }) => {
        setGs(p => { if (p.mana.length === 0) return p; const removed = p.mana[p.mana.length - 1]; return { ...p, mana: p.mana.slice(0, -1), graveyard: [...p.graveyard, removed] }; });
        toast("Artisan Picora: Mana to graveyard!");
    },
    "Onslaughter Triceps": ({ setGs, toast }) => {
        setGs(p => { if (p.mana.length === 0) return p; const removed = p.mana[p.mana.length - 1]; return { ...p, mana: p.mana.slice(0, -1), graveyard: [...p.graveyard, removed] }; });
        toast("Onslaughter Triceps: Mana to graveyard!");
    },
    "Explosive Fighter Ucarn": ({ setGs, toast }) => {
        setGs(p => { const toRemove = p.mana.slice(-2); return { ...p, mana: p.mana.slice(0, -2), graveyard: [...p.graveyard, ...toRemove] }; });
        toast("Ucarn: 2 mana to graveyard!");
    },
    "Meteosaur": ({ gsR, toast, setTargeting, net, CardEngine, askMay }) => {
        const s = gsR.current;
        const targets = s.opponent.battleZone.filter(c => CardEngine.basePower(c, s.opponent.battleZone, s.opponent.mana) <= 2000);
        if (!targets.length) return;
        askMay({
            message: "Use Meteosaur's effect to destroy an enemy creature?",
            onYes: () => {
                setTargeting({
                    message: "Destroy an enemy creature (Max 2000 power)",
                    count: 1,
                    validTargets: targets.map(c => c.instanceId),
                    onComplete: (selectedIds) => {
                        net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: selectedIds[0] } });
                        toast("Target destroyed!");
                    }
                });
            }
        });
    },
    "Rothus, the Traveler": ({ gsR, setTargeting, setGs, net, toast }) => {
        if (!gsR.current.battleZone.length) return;
        setTargeting({
            message: "Select one of your creatures to destroy",
            count: 1,
            validTargets: gsR.current.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                const id = selectedIds[0];
                setGs(s => {
                    const c = s.battleZone.find(x => x.instanceId === id);
                    return { ...s, battleZone: s.battleZone.filter(x => x.instanceId !== id), graveyard: [...s.graveyard, c] };
                });
                net.send("ACTION", { action: "FORCE_DESTROY_OWN_CHOICE" });
                toast("Mutual destruction!");
            }
        });
    },
    "Bronze-Arm Tribe": ({ setGs, toast }) => {
        setGs(p => { const d = [...p.deck]; if (!d.length) return p; const c = d.pop(); return { ...p, mana: [...p.mana, { ...c, isTapped: false }], deck: d }; });
        toast("Bronze-Arm Tribe: Mana boost!");
    },
    "Storm Shell": ({ net, toast }) => { net.send("ACTION", { action: "CREATURE_TO_MANA_CHOICE" }); toast("Storm Shell: Opponent loses a creature!"); },
    "Poisonous Mushroom": ({ setGs, toast, askMay }) => {
        askMay({
            message: "Use Poisonous Mushroom's effect to put a card from hand into mana?",
            onYes: () => {
                setGs(p => { if (p.hand.length === 0) return p; const card = p.hand[p.hand.length - 1]; return { ...p, hand: p.hand.slice(0, -1), mana: [...p.mana, { ...card, isTapped: false }] }; });
                toast("Poisonous Mushroom: Hand to mana!");
            }
        });
    },
    "Thorny Mandra": ({ setGs, toast, askMay, gsR }) => {
        const creature = gsR.current.graveyard.find(c => c.type === 'Creature');
        if (!creature) return;
        askMay({
            message: "Use Thorny Mandra's effect to put a creature from grave into mana?",
            onYes: () => {
                setGs(p => { const c = p.graveyard.find(x => x.type === 'Creature'); if (!c) return p; return { ...p, graveyard: p.graveyard.filter(x => x.instanceId !== c.instanceId), mana: [...p.mana, { ...c, isTapped: false }] }; });
                toast("Thorny Mandra: Graveyard to mana!");
            }
        });
    },
    "Miele, Vizier of Lightning": ({ gsR, setTargeting, net, toast, askMay }) => {
        const s = gsR.current;
        if (!s.opponent.battleZone.length) return;
        askMay({
            message: "Use Miele's effect to tap an enemy creature?",
            onYes: () => {
                setTargeting({
                    message: "Choose an enemy creature to tap",
                    count: 1,
                    validTargets: s.opponent.battleZone.map(c => c.instanceId),
                    onComplete: (selectedIds) => {
                        net.send("ACTION", { action: "TAP_TARGET", details: { targetId: selectedIds[0] } });
                        toast("Enemy tapped!");
                    }
                });
            }
        });
    },
    "Rayla, Truth Enforcer": ({ setSearchingDeck, net, setGs, toast, askMay }) => {
        askMay({
            message: "Use Rayla's effect to search for a spell?",
            onYes: () => {
                setSearchingDeck({
                    message: "Rayla: Search for a Spell",
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
            }
        });
    },
    "Rumbling Terahorn": ({ setSearchingDeck, net, setGs, toast, askMay }) => {
        askMay({
            message: "Use Terahorn's effect to search for a creature?",
            onYes: () => {
                setSearchingDeck({
                    message: "Terahorn: Search for a Creature",
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
            }
        });
    },
    "Fighter Roarquill": ({ setGs, toast }) => {
        setGs(p => { const d = [...p.deck]; if (!d.length) return p; const c = d.pop(); return { ...p, mana: [...p.mana, { ...c, isTapped: false }], deck: d }; });
        toast("Fighter Roarquill: Mana boost!");
    },
    "Phyton": ({ gsR, setTargeting, setGs, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setTargeting({
            message: "Phyton: Choose mana to move to graveyard",
            count: 1,
            validTargets: s.mana.map(m => m.instanceId),
            isManaTarget: true,
            onComplete: (ids) => {
                setGs(prev => {
                    const target = prev.mana.find(m => m.instanceId === ids[0]);
                    return { ...prev, mana: prev.mana.filter(m => m.instanceId !== ids[0]), graveyard: [...prev.graveyard, target] };
                });
                toast("Mana moved to graveyard!");
            }
        });
    },
    "Trox, General of Destruction": ({ net, toast }) => {
        net.send("ACTION", { action: "DISCARD_RANDOM" });
        setTimeout(() => net.send("ACTION", { action: "DISCARD_RANDOM" }), 300);
        toast("Trox: Opponent discards 2 cards!");
    },
    "Propeller Mutant": ({ net, toast }) => { net.send("ACTION", { action: "DISCARD_RANDOM" }); toast("Propeller Mutant: Opponent discards!"); },
    "Aqua Deformer": ({ gsR, setTargeting, setGs, net, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setTargeting({
            message: "Aqua Deformer: Select 2 of your mana to return to hand",
            count: 2,
            validTargets: s.mana.map(m => m.instanceId),
            isManaTarget: true,
            onComplete: (ids) => {
                setGs(prev => {
                    const targets = prev.mana.filter(m => ids.includes(m.instanceId));
                    return { ...prev, mana: prev.mana.filter(m => !ids.includes(m.instanceId)), hand: [...prev.hand, ...targets] };
                });
                net.send("ACTION", { action: "MANA_TO_HAND_CHOICE", details: { count: 2 } });
                toast("Aqua Deformer: Mutual mana return!");
            }
        });
    },
    "Syforce, Aurora Elemental": ({ gsR, setTargeting, setGs, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setTargeting({
            message: "Syforce: Choose mana to return to hand",
            count: 1,
            validTargets: s.mana.map(m => m.instanceId),
            isManaTarget: true,
            onComplete: (ids) => {
                setGs(prev => {
                    const target = prev.mana.find(m => m.instanceId === ids[0]);
                    return { ...prev, mana: prev.mana.filter(m => m.instanceId !== ids[0]), hand: [...prev.hand, target] };
                });
                toast("Mana returned to hand!");
            }
        });
    },
    "Reese, the Oracle": ({ gsR, setTargeting, net, toast }) => {
        const s = gsR.current;
        if (!s.opponent.battleZone.length) return;
        setTargeting({
            message: "Reese: Choose enemy creature to tap",
            count: 1,
            validTargets: s.opponent.battleZone.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "TAP_TARGET", details: { targetId: ids[0] } });
                toast("Enemy tapped!");
            }
        });
    },
    "Vise Ichthys": ({ gsR, setTargeting, net, toast }) => {
        const s = gsR.current;
        const untapped = s.opponent.battleZone.filter(c => !c.isTapped);
        if (!untapped.length) return;
        setTargeting({
            message: "Vise Ichthys: Choose enemy untapped creature to tap",
            count: 1,
            validTargets: untapped.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "TAP_TARGET", details: { targetId: ids[0] } });
                toast("Enemy tapped!");
            }
        });
    },
    "Corile": ({ gsR, setTargeting, net, toast }) => {
        const s = gsR.current;
        if (!s.opponent.battleZone.length) return;
        setTargeting({
            message: "Corile: Return enemy to top of deck",
            count: 1,
            validTargets: s.opponent.battleZone.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "MOVE_TO_DECK_TOP", details: { targetId: ids[0] } });
                toast("Returned to deck top!");
            }
        });
    },
    "Fonch, the Oracle": ({ gsR, setTargeting, net, toast }) => {
        const s = gsR.current;
        if (!s.opponent.battleZone.length) return;
        setTargeting({
            message: "Fonch: Tap and freeze enemy",
            count: 1,
            validTargets: s.opponent.battleZone.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "FREEZE_TARGET", details: { targetId: ids[0] } });
                toast("Enemy frozen!");
            }
        });
    },
    "Aqua Bouncer": ({ gsR, setTargeting, net, setGs, toast }) => {
        const s = gsR.current;
        const allCreatures = [...s.battleZone, ...s.opponent.battleZone];
        if (!allCreatures.length) return;
        setTargeting({
            message: "Aqua Bouncer: Select a creature to bounce",
            count: 1,
            validTargets: allCreatures.map(c => c.instanceId),
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
    "Chaos Worm": ({ gsR, setTargeting, net, toast }) => {
        const s = gsR.current;
        if (!s.opponent.battleZone.length) return;
        setTargeting({
            message: "Chaos Worm: Select an opponent's creature to destroy",
            count: 1,
            validTargets: s.opponent.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: selectedIds[0] } });
                toast("Creature destroyed!");
            }
        });
    },
    "Fighter Dual Fang": ({ setGs, toast }) => {
        setGs(p => { 
            const d = [...p.deck]; 
            const added = []; 
            for (let i = 0; i < 2 && d.length; i++) added.push(d.pop()); 
            return { ...p, mana: [...p.mana, ...added.map(c => ({ ...c, isTapped: false }))], deck: d }; 
        });
        toast("Fighter Dual Fang: 2 cards to mana!");
    },
    "Fortress Shell": ({ gsR, setTargeting, net, toast }) => {
        const s = gsR.current;
        if (!s.opponent.mana.length) return;
        setTargeting({
            message: "Fortress Shell: Choose up to 2 enemy mana to destroy",
            count: 2,
            validTargets: s.opponent.mana.map(m => m.instanceId),
            isManaTarget: true,
            onComplete: (ids) => {
                ids.forEach(id => net.send("ACTION", { action: "DESTROY_MANA", details: { targetId: id } }));
                toast("Mana destroyed!");
            }
        });
    },
    "Larba Geer, the Immaculate": ({ gsR, net, toast, CardEngine }) => {
        const s = gsR.current;
        const blockers = s.opponent.battleZone.filter(c => CardEngine.parseAbilities(c, s.opponent.battleZone, s.opponent.mana).blocker);
        blockers.forEach(c => net.send("ACTION", { action: "TAP_TARGET", details: { targetId: c.instanceId } }));
        toast("Larba Geer: Tapped all blockers!");
    },
    "Magris, Vizier of Magnetism": ({ draw, toast }) => { draw(); toast("Magris: Draw 1 card!"); },
    "Phal Eega, Dawn Guardian": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        const spells = s.graveyard.filter(c => c.type === 'Spell');
        if (!spells.length) return;
        setSearchingDeck({
            message: "Phal Eega: Return a spell from graveyard",
            count: 1,
            filter: () => true,
            isGraveSearch: true,
            customList: spells,
            onComplete: (card) => {
                setGs(prev => ({
                    ...prev,
                    graveyard: prev.graveyard.filter(x => x.instanceId !== card.instanceId),
                    hand: [...prev.hand, card]
                }));
                toast(`${card.name} returned from graveyard!`);
            }
        });
    },
    "Poison Worm": ({ gsR, setTargeting, setGs, toast, CardEngine }) => {
        const targets = gsR.current.battleZone.filter(c => CardEngine.basePower(c, gsR.current.battleZone, gsR.current.mana) <= 3000);
        if (!targets.length) return;
        setTargeting({
            message: "Poison Worm: Select one of your creatures to destroy (3000 or less)",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                const id = selectedIds[0];
                setGs(s => {
                    const c = s.battleZone.find(x => x.instanceId === id);
                    if (!c) return s;
                    return { ...s, battleZone: s.battleZone.filter(x => x.instanceId !== id), graveyard: [...s.graveyard, c] };
                });
                toast("Poison Worm: Creature destroyed!");
            }
        });
    },
    "Baraga, Blade of Gloom": ({ gsR, setTargeting, setGs, toast }) => {
        const s = gsR.current;
        if (!s.shields.length) return;
        setTargeting({
            message: "Baraga: Select a shield to take to hand (No trigger)",
            count: 1,
            validTargets: s.shields.map((_, i) => `shield-${i}`),
            isShieldTarget: true,
            onComplete: (ids) => {
                const idx = parseInt(ids[0].split('-')[1]);
                setGs(p => {
                    const ns = [...p.shields];
                    const card = ns.splice(idx, 1)[0];
                    return { ...p, shields: ns, hand: [...p.hand, card] };
                });
                toast("Baraga: Shield to hand!");
            }
        });
    },
    "Lena, Vizier of Brilliance": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        const spells = s.mana.filter(c => c.type === 'Spell');
        if (!spells.length) return;
        setSearchingDeck({
            message: "Lena: Select a spell from your mana to return to hand",
            count: 1,
            customList: spells,
            onComplete: (card) => {
                setGs(p => ({ ...p, mana: p.mana.filter(m => m.instanceId !== card.instanceId), hand: [...p.hand, card] }));
                toast("Lena: Spell returned from mana!");
            }
        });
    },
    "Pouch Shell": ({ gsR, setTargeting, net, toast, CardEngine }) => {
        const s = gsR.current;
        const evos = s.opponent.battleZone.filter(c => CardEngine.isEvolution(c));
        if (!evos.length) return;
        setTargeting({
            message: "Pouch Shell: Select enemy evolution creature to de-evolve",
            count: 1,
            validTargets: evos.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "DE_EVOLVE", details: { targetId: ids[0] } });
                toast("Pouch Shell triggered!");
            }
        });
    },
    "Shtra": ({ gsR, setTargeting, setGs, net, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setTargeting({
            message: "Shtra: Select 1 of your mana to return to hand",
            count: 1,
            validTargets: s.mana.map(m => m.instanceId),
            isManaTarget: true,
            onComplete: (ids) => {
                setGs(prev => {
                    const target = prev.mana.find(m => m.instanceId === ids[0]);
                    return { ...prev, mana: prev.mana.filter(m => m.instanceId !== ids[0]), hand: [...prev.hand, target] };
                });
                net.send("ACTION", { action: "MANA_TO_HAND_CHOICE", details: { count: 1 } });
                toast("Shtra: Mutual mana return!");
            }
        });
    },
    "Masked Horror, Shadow of Scorn": ({ net, toast }) => { net.send("ACTION", { action: "DISCARD_RANDOM" }); toast("Masked Horror: Opponent discards!"); },
    "Swamp Worm": ({ net, toast }) => { net.send("ACTION", { action: "FORCE_DESTROY_OWN_CHOICE" }); toast("Swamp Worm: Opponent destroys a creature!"); },
    "Stinger Worm": ({ gsR, setTargeting, setGs, toast, CardEngine }) => {
        if (!gsR.current.battleZone.length) return;
        setTargeting({
            message: "Select one of your creatures to sacrifice",
            count: 1,
            validTargets: gsR.current.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                const id = selectedIds[0];
                setGs(s => {
                    const c = s.battleZone.find(x => x.instanceId === id);
                    return { ...s, battleZone: s.battleZone.filter(x => x.instanceId !== id), graveyard: [...s.graveyard, c] };
                });
                toast("Sacrificed!");
            }
        });
    },
    "Vampire Silphy": ({ setGs, net, toast, CardEngine }) => {
        setGs(p => {
            const toDestroy = p.battleZone.filter(c => CardEngine.basePower(c) <= 3000 && c.name !== "Vampire Silphy");
            return { ...p, battleZone: p.battleZone.filter(c => CardEngine.basePower(c) > 3000 || c.name === "Vampire Silphy"), graveyard: [...p.graveyard, ...toDestroy] };
        });
        net.send("ACTION", { action: "DESTROY_ALL_WEAK", details: { maxPower: 3000 } });
        toast("Vampire Silphy: Mass destruction!");
    },
    "Crystal Paladin": ({ setGs, net, toast, CardEngine }) => {
        setGs(p => {
            const blockers = p.battleZone.filter(c => CardEngine.parseAbilities(c).blocker);
            return { ...p, battleZone: p.battleZone.filter(c => !CardEngine.parseAbilities(c).blocker), hand: [...p.hand, ...blockers] };
        });
        net.send("ACTION", { action: "BOUNCE_ALL_BLOCKERS" });
        toast("Crystal Paladin: Bounce all blockers!");
    },
    "Gigargon": ({ setGs, toast }) => {
        setGs(p => { const creatures = p.graveyard.filter(c => c.type === 'Creature').slice(-2); return { ...p, graveyard: p.graveyard.filter(c => !creatures.includes(c)), hand: [...p.hand, ...creatures] }; });
        toast("Gigargon: Recover 2 creatures!");
    },
    "Scarlet Skyterror": ({ setGs, net, toast, CardEngine }) => {
        setGs(p => {
            const toDestroy = p.battleZone.filter(c => CardEngine.parseAbilities(c).blocker);
            return { ...p, battleZone: p.battleZone.filter(c => !CardEngine.parseAbilities(c).blocker), graveyard: [...p.graveyard, ...toDestroy] };
        });
        net.send("ACTION", { action: "DESTROY_ALL_BLOCKERS" });
        toast("Scarlet Skyterror: Destroy all blockers!");
    },
    "Black Feather, Shadow of Rage": ({ gsR, setTargeting, setGs, toast }) => {
        if (!gsR.current.battleZone.length) return;
        setTargeting({
            message: "Select one of your creatures to destroy",
            count: 1,
            validTargets: gsR.current.battleZone.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                const id = selectedIds[0];
                setGs(s => {
                    const c = s.battleZone.find(x => x.instanceId === id);
                    return { ...s, battleZone: s.battleZone.filter(x => x.instanceId !== id), graveyard: [...s.graveyard, c] };
                });
                toast("Destroyed own creature!");
            }
        });
    },
    "Gigaberos": ({ gsR, setGs, setTargeting, toast }) => {
        const s = gsR.current;
        const others = s.battleZone.filter(c => c.name !== "Gigaberos");
        if (others.length < 2) {
            setGs(p => {
               const self = p.battleZone.find(c => c.name === "Gigaberos");
               if (!self) return p;
               return { ...p, battleZone: p.battleZone.filter(c => c.instanceId !== self.instanceId), graveyard: [...p.graveyard, self] };
            });
            return;
        }
        setTargeting({
            message: "Select 2 other creatures to sacrifice",
            count: 2,
            validTargets: others.map(c => c.instanceId),
            onComplete: (selectedIds) => {
                setGs(s => {
                    const targets = s.battleZone.filter(c => selectedIds.includes(c.instanceId));
                    return { ...s, battleZone: s.battleZone.filter(c => !selectedIds.includes(c.instanceId)), graveyard: [...s.graveyard, ...targets] };
                });
                toast("Gigaberos sacrifice complete!");
            }
        });
    },
};

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
    "Searing Wave": ({ net, setGs, toast }) => { 
        net.send("ACTION", { action: "DESTROY_ALL_WEAK", details: { maxPower: 3000 } }); 
        setGs(p => {
            if (p.shields.length === 0) return p;
            const ns = [...p.shields];
            const removed = ns.pop();
            return { ...p, shields: ns, graveyard: [...p.graveyard, removed] };
        });
        toast("Searing Wave: Destroyed weak enemies & sacrificed shield!"); 
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
            const toDestroy = p.battleZone.filter(c => CardEngine.basePower(c, p.battleZone, p.mana) <= 2000);
            return { ...p, battleZone: p.battleZone.filter(c => CardEngine.basePower(c, p.battleZone, p.mana) > 2000), graveyard: [...p.graveyard, ...toDestroy] };
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
    "Crystal Memory": ({ setSearchingDeck, setGs, toast }) => { 
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
            toast("Less than 3 creatures — no draw");
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
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.basePower(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana) <= 2000);
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
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.basePower(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana) <= 4000);
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
    "Eldritch Poison": ({ gsR, setTargeting, setGs, toast }) => {
        const darks = gsR.current.battleZone.filter(c => c.civilizations?.includes('Darkness'));
        if (!darks.length) return;
        setTargeting({
            message: "Eldritch Poison: Select a Darkness creature to destroy",
            count: 1,
            validTargets: darks.map(c => c.instanceId),
            onComplete: (creatureIds) => {
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
    "Snake Attack": ({ setGs, toast }) => {
        setGs(p => {
            if (p.shields.length === 0) return p;
            const ns = [...p.shields];
            const removed = ns.pop();
            return { 
                ...p, 
                shields: ns, 
                graveyard: [...p.graveyard, removed],
                battleZone: p.battleZone.map(c => ({ ...c, tempDoubleBreaker: true }))
            };
        });
        toast("Snake Attack: Mass Double Breaker but lost a shield!");
    },
    "Volcanic Arrows": ({ gsR, setTargeting, setGs, net, toast, CardEngine }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.basePower(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana) <= 6000);
        if (!targets.length) return;
        setTargeting({
            message: "Volcanic Arrows: Destroy creature (6000 or less)",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: ids[0] } });
                setGs(p => {
                    if (p.shields.length === 0) return p;
                    const ns = [...p.shields];
                    const removed = ns.pop();
                    return { ...p, shields: ns, graveyard: [...p.graveyard, removed] };
                });
                toast("Volcanic Arrows: Target destroyed, shield sacrificed!");
            }
        });
    },
    "Sundrop Armor": ({ setSearchingDeck, setGs, toast }) => {
        setGs(p => {
            if (p.hand.length === 0) return p;
            setSearchingDeck({
                message: "Sundrop Armor: Select a card from hand to put into shields",
                count: 1,
                customList: p.hand,
                onComplete: (card) => {
                    setGs(prev => ({
                        ...prev,
                        hand: prev.hand.filter(x => x.instanceId !== card.instanceId),
                        shields: [...prev.shields, card]
                    }));
                    toast("Card put into shields!");
                }
            });
            return p;
        });
    },
};

export const DESTROY_EFFECTS = {
    "Bombersaur": ({ setGs, net, toast }) => {
        setGs(p => {
            const count = Math.min(p.mana.length, 2);
            const toGrave = p.mana.slice(-count);
            return { ...p, mana: p.mana.slice(0, -count), graveyard: [...p.graveyard, ...toGrave] };
        });
        net.send("ACTION", { action: "DESTROY_MANA_CHOICE", details: { count: 2 } });
        toast("Bombersaur: Each player loses 2 mana!");
    },
    "Engineer Kipo": ({ setGs, net, toast }) => {
        setGs(p => {
            const count = Math.min(p.mana.length, 1);
            const toGrave = p.mana.slice(-count);
            return { ...p, mana: p.mana.slice(0, -count), graveyard: [...p.graveyard, ...toGrave] };
        });
        net.send("ACTION", { action: "DESTROY_MANA_CHOICE", details: { count: 1 } });
        toast("Engineer Kipo: Each player loses 1 mana!");
    },
    "Bone Piercer": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const creatures = gsR.current.mana.filter(c => c.type === 'Creature');
        if (!creatures.length) return;
        setSearchingDeck({
            message: "Bone Piercer: Select creature from mana to return to hand",
            count: 1,
            customList: creatures,
            onComplete: (card) => {
                setGs(p => ({ ...p, mana: p.mana.filter(m => m.instanceId !== card.instanceId), hand: [...p.hand, card] }));
                toast("Bone Piercer: Creature recovered from mana!");
            }
        });
    },
};

export const ATTACK_TRIGGERS = {
    "Amber Piercer": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const s = gsR.current;
        const creatures = s.graveyard.filter(c => c.type === 'Creature');
        if (!creatures.length) return;
        askMay({
            message: "Use Amber Piercer's effect to return a creature from graveyard?",
            onYes: () => {
                setSearchingDeck({
                    message: "Amber Piercer: Return a creature from graveyard",
                    count: 1,
                    filter: () => true,
                    isGraveSearch: true,
                    customList: creatures,
                    onComplete: (card) => {
                        setGs(prev => ({
                            ...prev,
                            graveyard: prev.graveyard.filter(x => x.instanceId !== card.instanceId),
                            hand: [...prev.hand, card]
                        }));
                        toast(`${card.name} returned from graveyard!`);
                    }
                });
            }
        });
    },
    "Bolzard Dragon": ({ gsR, setTargeting, net, toast }) => {
        const s = gsR.current;
        if (!s.opponent.mana.length) return;
        setTargeting({
            message: "Bolzard Dragon: Choose enemy mana to destroy",
            count: 1,
            validTargets: s.opponent.mana.map(m => m.instanceId),
            isManaTarget: true,
            onComplete: (ids) => {
                net.send("ACTION", { action: "DESTROY_MANA", details: { targetId: ids[0] } });
                toast("Mana destroyed!");
            }
        });
    },
    "Dark Titan Maginn": ({ net, toast }) => { net.send("ACTION", { action: "DISCARD_RANDOM" }); toast("Dark Titan Maginn: Opponent discards!"); },
    "Hypersquid Walter": ({ draw, toast, askMay }) => { 
        askMay({
            message: "Use Hypersquid Walter's effect to draw a card?",
            onYes: () => { draw(); toast("Hypersquid Walter: Draw 1!"); }
        });
    },
    "General Dark Fiend": ({ setGs, toast }) => {
        setGs(p => {
            if (p.shields.length === 0) return p;
            const idx = Math.floor(Math.random() * p.shields.length);
            const ns = [...p.shields];
            const removed = ns.splice(idx, 1)[0];
            return { ...p, shields: ns, graveyard: [...p.graveyard, removed] };
        });
        toast("General Dark Fiend: Sacrificed a shield!");
    },
    "Laguna, Lightning Enforcer": ({ setSearchingDeck, net, setGs, toast, askMay }) => {
        askMay({
            message: "Use Laguna's effect to search for a spell?",
            onYes: () => {
                setSearchingDeck({
                    message: "Laguna: Search for a Spell",
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
            }
        });
    },
    "Metalwing Skyterror": ({ gsR, setTargeting, net, toast, CardEngine, askMay }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.parseAbilities(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana).blocker);
        if (!targets.length) return;
        askMay({
            message: "Use Metalwing Skyterror's effect to destroy an enemy blocker?",
            onYes: () => {
                setTargeting({
                    message: "Metalwing Skyterror: Destroy an enemy blocker",
                    count: 1,
                    validTargets: targets.map(c => c.instanceId),
                    onComplete: (selectedIds) => {
                        net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: selectedIds[0] } });
                        toast("Blocker destroyed!");
                    }
                });
            }
        });
    },
    "Plasma Chaser": ({ gsR, draw, toast, askMay }) => {
        const count = gsR.current.opponent.battleZone.length;
        if (count === 0) return;
        askMay({
            message: `Use Plasma Chaser's effect to draw ${count} cards?`,
            onYes: () => {
                for (let i = 0; i < count; i++) setTimeout(() => draw(), i * 200);
                toast(`Plasma Chaser: Draw ${count} cards!`);
            }
        });
    },
    "Silver Axe": ({ setGs, toast, askMay }) => {
        askMay({
            message: "Use Silver Axe's effect to boost mana?",
            onYes: () => {
                setGs(p => { 
                    const d = [...p.deck]; 
                    if (!d.length) return p; 
                    const c = d.pop(); 
                    return { ...p, mana: [...p.mana, { ...c, isTapped: false }], deck: d }; 
                });
                toast("Silver Axe: Mana boost!");
            }
        });
    },
    "Stained Glass": ({ gsR, setTargeting, net, toast, askMay }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => c.civilizations?.some(civ => civ === 'Fire' || civ === 'Nature'));
        if (!targets.length) return;
        askMay({
            message: "Use Stained Glass's effect to bounce a Fire or Nature creature?",
            onYes: () => {
                setTargeting({
                    message: "Stained Glass: Bounce a Fire or Nature creature",
                    count: 1,
                    validTargets: targets.map(c => c.instanceId),
                    onComplete: (selectedIds) => {
                        net.send("ACTION", { action: "BOUNCE_TARGET", details: { targetId: selectedIds[0] } });
                        toast("Creature bounced!");
                    }
                });
            }
        });
    },
    "Wyn, the Oracle": ({ gsR, setSearchingDeck, toast, askMay }) => {
        const s = gsR.current;
        if (!s.opponent.shields?.length) return;
        askMay({
            message: "Use Wyn's effect to peek at a shield?",
            onYes: () => {
                const shield = s.opponent.shields[Math.floor(Math.random() * s.opponent.shields.length)];
                setSearchingDeck({
                    message: "Wyn: Peeking at one shield",
                    count: 0,
                    isViewOnly: true,
                    customList: [shield],
                    filter: () => true,
                    onComplete: () => {}
                });
                toast("Wyn: Peeked at a shield!");
            }
        });
    },
    "Chaos Fish": ({ gsR, draw, toast, askMay }) => {
        const count = gsR.current.battleZone.filter(c => c.civilizations?.includes('Water') && c.name !== "Chaos Fish").length;
        if (count === 0) return;
        askMay({
            message: `Use Chaos Fish's effect to draw ${count} cards?`,
            onYes: () => {
                for (let i = 0; i < count; i++) setTimeout(() => draw(), i * 200);
                toast(`Chaos Fish: Draw ${count} cards!`);
            }
        });
    },
    "Earthstomp Giant": ({ gsR, setGs, toast }) => {
        const s = gsR.current;
        const creatures = s.mana.filter(c => c.type === 'Creature');
        if (!creatures.length) return;
        setGs(p => ({
            ...p,
            mana: p.mana.filter(m => m.type !== 'Creature'),
            hand: [...p.hand, ...creatures]
        }));
        toast("Earthstomp Giant: Creatures returned from mana!");
    },
    "Flametropus": ({ gsR, setTargeting, setGs, toast, askMay }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        askMay({
            message: "Use Flametropus's effect to sacrifice mana for a buff?",
            onYes: () => {
                setTargeting({
                    message: "Flametropus: Select mana to sacrifice for buff",
                    count: 1,
                    validTargets: s.mana.map(m => m.instanceId),
                    isManaTarget: true,
                    onComplete: (ids) => {
                        setGs(p => {
                            const target = p.mana.find(m => m.instanceId === ids[0]);
                            return {
                                ...p,
                                mana: p.mana.filter(m => m.instanceId !== ids[0]),
                                graveyard: [...p.graveyard, target],
                                battleZone: p.battleZone.map(c => c.name === "Flametropus" ? { ...c, powerBonus: (c.powerBonus || 0) + 3000, tempDoubleBreaker: true } : c)
                            };
                        });
                        toast("Flametropus: Buffed!");
                    }
                });
            }
        });
    },
    "Gamil, Knight of Hatred": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const darks = gsR.current.graveyard.filter(c => c.civilizations?.includes('Darkness') && c.type === 'Creature');
        if (!darks.length) return;
        askMay({
            message: "Use Gamil's effect to recover a Darkness creature?",
            onYes: () => {
                setSearchingDeck({
                    message: "Gamil: Select Darkness creature from graveyard",
                    count: 1,
                    isGraveSearch: true,
                    customList: darks,
                    onComplete: (card) => {
                        setGs(p => ({ ...p, graveyard: p.graveyard.filter(x => x.instanceId !== card.instanceId), hand: [...p.hand, card] }));
                        toast("Gamil: Darkness creature recovered!");
                    }
                });
            }
        });
    },
    "King Neptas": ({ gsR, setTargeting, net, toast, CardEngine, askMay }) => {
        const targets = [...gsR.current.battleZone, ...gsR.current.opponent.battleZone].filter(c => CardEngine.basePower(c, [], []) <= 2000);
        if (!targets.length) return;
        askMay({
            message: "Use King Neptas's effect to bounce a creature?",
            onYes: () => {
                setTargeting({
                    message: "King Neptas: Select creature to bounce (2000 power or less)",
                    count: 1,
                    validTargets: targets.map(c => c.instanceId),
                    onComplete: (ids) => {
                        const id = ids[0];
                        net.send("ACTION", { action: "BOUNCE_TARGET", details: { targetId: id } });
                        setGs(s => {
                            const c = s.battleZone.find(x => x.instanceId === id);
                            if (!c) return s;
                            return { ...s, battleZone: s.battleZone.filter(x => x.instanceId !== id), hand: [...s.hand, c] };
                        });
                        toast("King Neptas: Bounced creature!");
                    }
                });
            }
        });
    },
    "Muramasa, Duke of Blades": ({ gsR, setTargeting, net, toast, CardEngine, askMay }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.basePower(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana) <= 2000);
        if (!targets.length) return;
        askMay({
            message: "Use Muramasa's effect to destroy an enemy creature?",
            onYes: () => {
                setTargeting({
                    message: "Muramasa: Select enemy creature to destroy (2000 power or less)",
                    count: 1,
                    validTargets: targets.map(c => c.instanceId),
                    onComplete: (ids) => {
                        net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: ids[0] } });
                        toast("Muramasa: Destroyed enemy!");
                    }
                });
            }
        });
    },
    "King Ponitas": ({ setSearchingDeck, setGs, toast, askMay }) => {
        askMay({
            message: "Use King Ponitas's effect to search for a Water card?",
            onYes: () => {
                setSearchingDeck({
                    message: "King Ponitas: Search for a Water card",
                    count: 1,
                    filter: (c) => c.civilizations?.includes('Water'),
                    onComplete: (card) => {
                        setGs(s => {
                            const newDeck = s.deck.filter(x => x.instanceId !== card.instanceId).sort(() => Math.random() - 0.5);
                            return { ...s, deck: newDeck, hand: [...s.hand, card] };
                        });
                        toast("King Ponitas: Water card added to hand!");
                    }
                });
            }
        });
    },
    "Psyshroom": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const natures = gsR.current.graveyard.filter(c => c.civilizations?.includes('Nature'));
        if (!natures.length) return;
        askMay({
            message: "Use Psyshroom's effect to move Nature card from graveyard to mana?",
            onYes: () => {
                setSearchingDeck({
                    message: "Psyshroom: Select Nature card from graveyard to move to mana",
                    count: 1,
                    isGraveSearch: true,
                    customList: natures,
                    onComplete: (card) => {
                        setGs(p => ({ ...p, graveyard: p.graveyard.filter(x => x.instanceId !== card.instanceId), mana: [...p.mana, { ...card, isTapped: false }] }));
                        toast("Psyshroom: Nature card moved to mana!");
                    }
                });
            }
        });
    },
    "Ra Vu, Seeker of Lightning": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const lightSpells = gsR.current.graveyard.filter(c => c.civilizations?.includes('Light') && c.type === 'Spell');
        if (!lightSpells.length) return;
        askMay({
            message: "Use Ra Vu's effect to recover a Light spell?",
            onYes: () => {
                setSearchingDeck({
                    message: "Ra Vu: Select Light spell from graveyard",
                    count: 1,
                    isGraveSearch: true,
                    customList: lightSpells,
                    onComplete: (card) => {
                        setGs(p => ({ ...p, graveyard: p.graveyard.filter(x => x.instanceId !== card.instanceId), hand: [...p.hand, card] }));
                        toast("Ra Vu: Light spell recovered!");
                    }
                });
            }
        });
    },
    "Sniper Mosquito": ({ gsR, setTargeting, setGs, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setTargeting({
            message: "Sniper Mosquito: Select mana to return to hand",
            count: 1,
            validTargets: s.mana.map(m => m.instanceId),
            isManaTarget: true,
            onComplete: (ids) => {
                setGs(p => {
                    const target = p.mana.find(m => m.instanceId === ids[0]);
                    return { ...p, mana: p.mana.filter(m => m.instanceId !== ids[0]), hand: [...p.hand, target] };
                });
                toast("Sniper Mosquito: Mana returned!");
            }
        });
    },
    "Stinger Ball": ({ gsR, setSearchingDeck, toast, askMay }) => {
        const s = gsR.current;
        if (!s.opponent.shields?.length) return;
        askMay({
            message: "Use Stinger Ball's effect to peek at a shield?",
            onYes: () => {
                const shield = s.opponent.shields[Math.floor(Math.random() * s.opponent.shields.length)];
                setSearchingDeck({
                    message: "Stinger Ball: Peeking at one shield",
                    count: 0,
                    isViewOnly: true,
                    customList: [shield],
                    filter: () => true,
                    onComplete: () => {}
                });
                toast("Stinger Ball: Peeked at a shield!");
            }
        });
    },
    "Armored Warrior Quelos": ({ gsR, setTargeting, setGs, net, toast }) => {
        const s = gsR.current;
        const nonFire = s.mana.filter(m => !m.civilizations?.includes('Fire'));
        if (nonFire.length > 0) {
            setTargeting({
                message: "Quelos: Select a non-Fire mana to sacrifice",
                count: 1,
                validTargets: nonFire.map(m => m.instanceId),
                isManaTarget: true,
                onComplete: (ids) => {
                    setGs(prev => {
                        const target = prev.mana.find(m => m.instanceId === ids[0]);
                        return { ...prev, mana: prev.mana.filter(m => m.instanceId !== ids[0]), graveyard: [...prev.graveyard, target] };
                    });
                }
            });
        }   
        net.send("ACTION", { action: "FORCE_DISCARD_NON_FIRE_MANA" });
        toast("Quelos: Mutual mana destruction!");
    }
};
