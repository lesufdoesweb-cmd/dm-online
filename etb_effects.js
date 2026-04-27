export const ETB_EFFECTS = {
    "Aqua Hulcus": ({ draw, toast, askMay }) => {
        askMay({
            message: "Use Aqua Hulcus's effect to draw a card?",
            onYes: () => { draw(); toast("Aqua Hulcus: Draw 1 card!"); }
        });
    },
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
    "King Ripped-Hide": ({ draw, toast, askMay }) => {
        askMay({
            message: "Use King Ripped-Hide's effect to draw 2 cards?",
            onYes: () => { draw(); setTimeout(() => draw(), 200); toast("King Ripped-Hide: Draw 2 cards!"); }
        });
    },
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
    "Saucer-Head Shark": ({ setGs, net, toast, CardEngine, gsR }) => {
        setGs(p => {
            const toReturn = p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= 2000);
            return { ...p, battleZone: p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) > 2000), hand: [...p.hand, ...toReturn] };
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
        else { toast("No Cyber Lord \u2014 no draw"); }
    },
    "Artisan Picora": ({ gsR, setGs, setSearchingDeck, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setSearchingDeck({
            message: "Artisan Picora: Select mana to put into graveyard",
            customList: s.mana,
            count: 1,
            onComplete: (card) => {
                setGs(p => {
                    return { ...p, mana: p.mana.filter(m => m.instanceId !== card.instanceId), graveyard: [...p.graveyard, card] };
                });
                toast("Artisan Picora: Mana to graveyard!");
            }
        });
    }
        });
    },
    "Onslaughter Triceps": ({ gsR, setGs, setSearchingDeck, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setSearchingDeck({
            message: "Onslaughter Triceps: Select mana to put into graveyard",
            customList: s.mana,
            count: 1,
            onComplete: (card) => {
                setGs(p => {
                    return { ...p, mana: p.mana.filter(m => m.instanceId !== card.instanceId), graveyard: [...p.graveyard, card] };
                });
                toast("Onslaughter Triceps: Mana to graveyard!");
            }
        });
    }
        });
    },
    "Explosive Fighter Ucarn": ({ gsR, setGs, setSearchingDeck, toast }) => {
        const s = gsR.current;
        if (s.mana.length < 2) return;
        setSearchingDeck({
            message: "Ucarn: Select 2 mana to put into graveyard",
            customList: s.mana,
            count: 2,
            exact: true,
            onComplete: (selected) => {
                const cards = Array.isArray(selected) ? selected : [selected];
                const ids = cards.map(c => c.instanceId);
                setGs(p => {
                    const toRemove = p.mana.filter(m => ids.includes(m.instanceId));
                    return { ...p, mana: p.mana.filter(m => !ids.includes(m.instanceId)), graveyard: [...p.graveyard, ...toRemove] };
                });
                toast("Ucarn: 2 mana to graveyard!");
            }
        });
    },
    "Meteosaur": ({ gsR, toast, setTargeting, net, CardEngine, askMay }) => {
        const s = gsR.current;
        const targets = s.opponent.battleZone.filter(c => CardEngine.getCurrentPower(c, s.opponent.battleZone, s.opponent.mana) <= 2000);
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
    "Poisonous Mushroom": ({ gsR, setGs, setSearchingDeck, toast, askMay }) => {
        const s = gsR.current;
        if (!s.hand.length) return;
        askMay({
            message: "Use Poisonous Mushroom's effect to put a card from hand into mana?",
            onYes: () => {
                setSearchingDeck({
                    message: "Poisonous Mushroom: Select a card from hand to put into mana",
                    count: 1,
                    customList: s.hand,
                    onComplete: (card) => {
                        setGs(p => ({
                            ...p,
                            hand: p.hand.filter(x => x.instanceId !== card.instanceId),
                            mana: [...p.mana, { ...card, isTapped: false }]
                        }));
                        toast("Poisonous Mushroom: Hand to mana!");
                    }
                });
            }
        });
    },
    "Thorny Mandra": ({ gsR, setGs, setSearchingDeck, toast, askMay }) => {
        const creatures = gsR.current.graveyard.filter(c => c.type === 'Creature');
        if (!creatures.length) return;
        askMay({
            message: "Use Thorny Mandra's effect to put a creature from grave into mana?",
            onYes: () => {
                setSearchingDeck({
                    message: "Thorny Mandra: Select creature from graveyard to put into mana",
                    count: 1,
                    isGraveSearch: true,
                    customList: creatures,
                    onComplete: (card) => {
                        setGs(p => ({
                            ...p,
                            graveyard: p.graveyard.filter(x => x.instanceId !== card.instanceId),
                            mana: [...p.mana, { ...card, isTapped: false }]
                        }));
                        toast("Thorny Mandra: Graveyard to mana!");
                    }
                });
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
    "Phyton": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setSearchingDeck({
            message: "Phyton: Choose mana to move to graveyard",
            customList: s.mana,
            count: 1,
            onComplete: (card) => {
                setGs(prev => {
                    return { ...prev, mana: prev.mana.filter(m => m.instanceId !== card.instanceId), graveyard: [...prev.graveyard, card] };
                });
                toast("Mana moved to graveyard!");
            }
        });
    }
        });
    },
    "Trox, General of Destruction": ({ net, toast }) => {
        net.send("ACTION", { action: "DISCARD_RANDOM" });
        setTimeout(() => net.send("ACTION", { action: "DISCARD_RANDOM" }), 300);
        toast("Trox: Opponent discards 2 cards!");
    },
    "Propeller Mutant": ({ net, toast }) => { net.send("ACTION", { action: "DISCARD_RANDOM" }); toast("Propeller Mutant: Opponent discards!"); },
    "Aqua Deformer": ({ gsR, setSearchingDeck, setGs, net, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setSearchingDeck({
            message: "Aqua Deformer: Select 2 of your mana to return to hand",
            customList: s.mana,
            count: 2,
            exact: true,
            onComplete: (selected) => {
                const cards = Array.isArray(selected) ? selected : [selected];
                const ids = cards.map(c => c.instanceId);
                setGs(prev => {
                    const targets = prev.mana.filter(m => ids.includes(m.instanceId));
                    return { ...prev, mana: prev.mana.filter(m => !ids.includes(m.instanceId)), hand: [...prev.hand, ...targets] };
                });
                net.send("ACTION", { action: "MANA_TO_HAND_CHOICE", details: { count: 2 } });
                toast("Aqua Deformer: Mutual mana return!");
            }
        });
    } });
                toast("Aqua Deformer: Mutual mana return!");
            }
        });
    },
    "Syforce, Aurora Elemental": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setSearchingDeck({
            message: "Syforce: Choose mana to return to hand",
            customList: s.mana,
            count: 1,
            onComplete: (card) => {
                setGs(prev => {
                    return { ...prev, mana: prev.mana.filter(m => m.instanceId !== card.instanceId), hand: [...prev.hand, card] };
                });
                toast("Mana returned to hand!");
            }
        });
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
    "Aqua Bouncer": ({ gsR, setTargeting, net, setGs, toast, askMay }) => {
        const s = gsR.current;
        const allCreatures = [...s.battleZone, ...s.opponent.battleZone];
        if (!allCreatures.length) return;
        askMay({
            message: "Use Aqua Bouncer's effect to bounce a creature?",
            onYes: () => {
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
            }
        });
    },
    "Chaos Worm": ({ gsR, setTargeting, net, toast, askMay }) => {
        const s = gsR.current;
        if (!s.opponent.battleZone.length) return;
        askMay({
            message: "Use Chaos Worm's effect to destroy an enemy creature?",
            onYes: () => {
                setTargeting({
                    message: "Chaos Worm: Select an opponent's creature to destroy",
                    count: 1,
                    validTargets: s.opponent.battleZone.map(c => c.instanceId),
                    onComplete: (selectedIds) => {
                        net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: selectedIds[0] } });
                        toast("Creature destroyed!");
                    }
                });
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
    "Fortress Shell": ({ gsR, setSearchingDeck, net, toast }) => {
        const s = gsR.current;
        if (!s.opponent.mana.length) return;
        setSearchingDeck({
            message: "Fortress Shell: Choose up to 2 enemy mana to destroy",
            customList: s.opponent.mana,
            count: 2,
            onComplete: (selected) => {
                const cards = Array.isArray(selected) ? selected : [selected];
                const ids = cards.map(c => c.instanceId);
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
    "Magris, Vizier of Magnetism": ({ draw, toast, askMay }) => {
        askMay({
            message: "Use Magris's effect to draw a card?",
            onYes: () => { draw(); toast("Magris: Draw 1 card!"); }
        });
    },
    "Phal Eega, Dawn Guardian": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const s = gsR.current;
        const spells = s.graveyard.filter(c => c.type === 'Spell');
        if (!spells.length) return;
        askMay({
            message: "Use Phal Eega's effect to return a spell from graveyard?",
            onYes: () => {
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
            }
        });
    },
    "Poison Worm": ({ gsR, setTargeting, setGs, toast, CardEngine }) => {
        const targets = gsR.current.battleZone.filter(c => CardEngine.getCurrentPower(c, gsR.current.battleZone, gsR.current.mana) <= 3000);
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
    "Lena, Vizier of Brilliance": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const s = gsR.current;
        const spells = s.mana.filter(c => c.type === 'Spell');
        if (!spells.length) return;
        askMay({
            message: "Use Lena's effect to return a spell from mana?",
            onYes: () => {
                setSearchingDeck({
                    message: "Lena: Select a spell from your mana to return to hand",
                    count: 1,
                    customList: spells,
                    onComplete: (card) => {
                        setGs(p => ({ ...p, mana: p.mana.filter(m => m.instanceId !== card.instanceId), hand: [...p.hand, card] }));
                        toast("Lena: Spell returned from mana!");
                    }
                });
            }
        });
    },
    "Pouch Shell": ({ gsR, setTargeting, net, toast, CardEngine, askMay }) => {
        const s = gsR.current;
        const evos = s.opponent.battleZone.filter(c => CardEngine.isEvolution(c));
        if (!evos.length) return;
        askMay({
            message: "Use Pouch Shell's effect to de-evolve an enemy creature?",
            onYes: () => {
                setTargeting({
                    message: "Pouch Shell: Select enemy evolution creature to de-evolve",
                    count: 1,
                    validTargets: evos.map(c => c.instanceId),
                    onComplete: (ids) => {
                        net.send("ACTION", { action: "DE_EVOLVE", details: { targetId: ids[0] } });
                        toast("Pouch Shell triggered!");
                    }
                });
            }
        });
    },
    "Shtra": ({ gsR, setSearchingDeck, setGs, net, toast }) => {
        const s = gsR.current;
        if (!s.mana.length) return;
        setSearchingDeck({
            message: "Shtra: Select 1 of your mana to return to hand",
            customList: s.mana,
            count: 1,
            onComplete: (card) => {
                setGs(prev => {
                    return { ...prev, mana: prev.mana.filter(m => m.instanceId !== card.instanceId), hand: [...prev.hand, card] };
                });
                net.send("ACTION", { action: "MANA_TO_HAND_CHOICE", details: { count: 1 } });
                toast("Shtra: Mutual mana return!");
            }
        });
    } });
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
            const toDestroy = p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= 3000 && c.name !== "Vampire Silphy");
            return { ...p, battleZone: p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) > 3000 || c.name === "Vampire Silphy"), graveyard: [...p.graveyard, ...toDestroy] };
        });
        net.send("ACTION", { action: "DESTROY_ALL_WEAK", details: { maxPower: 3000 } });
        toast("Vampire Silphy: Mass destruction!");
    },
    "Crystal Paladin": ({ setGs, net, toast, CardEngine }) => {
        setGs(p => {
            const blockers = p.battleZone.filter(c => CardEngine.parseAbilities(c, p.battleZone, p.mana).blocker);
            return { ...p, battleZone: p.battleZone.filter(c => !CardEngine.parseAbilities(c, p.battleZone, p.mana).blocker), hand: [...p.hand, ...blockers] };
        });
        net.send("ACTION", { action: "BOUNCE_ALL_BLOCKERS" });
        toast("Crystal Paladin: Bounce all blockers!");
    },
    "Gigargon": ({ gsR, setGs, setSearchingDeck, toast }) => {
        const creatures = gsR.current.graveyard.filter(c => c.type === 'Creature');
        if (!creatures.length) return;
        setSearchingDeck({
            message: "Gigargon: Select up to 2 creatures from graveyard to return to hand",
            count: 2,
            isGraveSearch: true,
            customList: creatures,
            onComplete: (cards) => {
                const selected = Array.isArray(cards) ? cards : [cards];
                const ids = selected.map(c => c.instanceId);
                setGs(p => ({
                    ...p,
                    graveyard: p.graveyard.filter(x => !ids.includes(x.instanceId)),
                    hand: [...p.hand, ...selected]
                }));
                toast("Gigargon: Recovered creatures!");
            }
        });
    },
    "Scarlet Skyterror": ({ setGs, net, toast, CardEngine }) => {
        setGs(p => {
            const toDestroy = p.battleZone.filter(c => CardEngine.parseAbilities(c, p.battleZone, p.mana).blocker);
            return { ...p, battleZone: p.battleZone.filter(c => !CardEngine.parseAbilities(c, p.battleZone, p.mana).blocker), graveyard: [...p.graveyard, ...toDestroy] };
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
    "Gigaberos": ({ gsR, setGs, setTargeting, toast, askMay }) => {
        const s = gsR.current;
        const others = s.battleZone.filter(c => c.name !== "Gigaberos");
        const destroySelf = (p) => {
            const self = p.battleZone.find(c => c.name === "Gigaberos");
            if (!self) return p;
            return { ...p, battleZone: p.battleZone.filter(c => c.instanceId !== self.instanceId), graveyard: [...p.graveyard, self] };
        };

        if (others.length < 2) {
            setGs(destroySelf);
            toast("Gigaberos: Not enough others to sacrifice, destroyed itself");
            return;
        }

        askMay({
            message: "Gigaberos: Sacrifice 2 other creatures? (No will destroy Gigaberos)",
            onYes: () => {
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
            onNo: () => {
                setGs(destroySelf);
                toast("Gigaberos destroyed itself");
            }
        });
    },
};