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
    "Emeral": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
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
                        setSearchingDeck({
                            message: "Emeral: Select a shield to take to hand",
                            count: 1,
                            customList: s.shields,
                            isFaceDown: true,
                            onComplete: (shield) => {
                                setGs(prev => {
                                    const newHand = prev.hand.filter(x => x.instanceId !== handCard.instanceId);
                                    const newShields = prev.shields.map(x => x.instanceId === shield.instanceId ? handCard : x);
                                    return {
                                        ...prev,
                                        hand: [...newHand, shield],
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
    "Unicorn Fish": ({ gsR, setTargeting, net, setGs, toast, askMay }) => {
        const s = gsR.current;
        const allCreatures = [...s.battleZone, ...s.opponent.battleZone];
        if (!allCreatures.length) return;
        askMay({
            message: "Use Unicorn Fish's effect to bounce a creature?",
            onYes: () => {
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
    },
    "Trox, General of Destruction": ({ card, net, toast, gsR }) => {
        if (card.set_id === 'dm-04') {
            const others = gsR.current.battleZone.filter(c => c.instanceId !== card.instanceId && c.civilizations?.includes('Darkness')).length;
            for (let i = 0; i < others; i++) {
                setTimeout(() => net.send("ACTION", { action: "DISCARD_RANDOM" }), i * 300);
            }
            toast(`Trox: Opponent discards ${others} cards!`);
        } else {
            net.send("ACTION", { action: "DISCARD_RANDOM" });
            toast("Trox: Opponent discards!");
        }
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
    "Baraga, Blade of Gloom": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        if (!s.shields.length) return;
        setSearchingDeck({
            message: "Baraga: Select a shield to take to hand (No trigger)",
            count: 1,
            customList: s.shields,
            isFaceDown: true,
            onComplete: (shield) => {
                setGs(p => {
                    const ns = p.shields.filter(x => x.instanceId !== shield.instanceId);
                    return { ...p, shields: ns, hand: [...p.hand, shield] };
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
    "Gigaberos": ({ card, gsR, setGs, setTargeting, toast, askMay, finishDestruction }) => {
        const s = gsR.current;
        const others = s.battleZone.filter(c => c.instanceId !== card.instanceId);
        
        const destroySelf = () => {
            const self = gsR.current.battleZone.find(c => c.instanceId === card.instanceId);
            if (self) finishDestruction(self);
        };

        if (others.length < 2) {
            destroySelf();
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
                        selectedIds.forEach(id => {
                            const target = gsR.current.battleZone.find(c => c.instanceId === id);
                            if (target) finishDestruction(target);
                        });
                        toast("Gigaberos sacrifice complete!");
                    }
                });
            },
            onNo: () => {
                destroySelf();
                toast("Gigaberos destroyed itself");
            }
        });
    },
    "Astral Warper": ({ draw, toast, askMay }) => {
        askMay({
            message: "Use Astral Warper's effect to draw up to 3 cards?",
            onYes: () => {
                for (let i = 0; i < 3; i++) setTimeout(() => draw(), i * 200);
                toast("Astral Warper: Draw 3!");
            }
        });
    },
    "Ballom, Master of Death": ({ setGs, net, toast }) => {
        setGs(p => {
            const nonDarks = p.battleZone.filter(c => !c.civilizations?.includes('Darkness'));
            return { ...p, battleZone: p.battleZone.filter(c => c.civilizations?.includes('Darkness')), graveyard: [...p.graveyard, ...nonDarks] };
        });
        net.send("ACTION", { action: "DESTROY_ALL_EXCEPT_DARK" });
        toast("Ballom: Darkness consumes all others!");
    },
    "Doboulgyser, Giant Rock Beast": ({ gsR, setTargeting, net, toast, CardEngine, askMay }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.getCurrentPower(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana) <= 3000);
        if (!targets.length) return;
        askMay({
            message: "Use Doboulgyser's effect to destroy an enemy?",
            onYes: () => {
                setTargeting({
                    message: "Doboulgyser: Destroy an enemy (Max 3000 power)",
                    count: 1,
                    validTargets: targets.map(c => c.instanceId),
                    onComplete: (ids) => {
                        net.send("ACTION", { action: "DESTROY_TARGET", details: { targetId: ids[0] } });
                        toast("Target destroyed!");
                    }
                });
            }
        });
    },
    "Galklife Dragon": ({ setGs, net, toast, CardEngine }) => {
        setGs(p => {
            const targets = p.battleZone.filter(c => c.civilizations?.includes('Light') && CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= 4000);
            return { ...p, battleZone: p.battleZone.filter(c => !(c.civilizations?.includes('Light') && CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= 4000)), graveyard: [...p.graveyard, ...targets] };
        });
        net.send("ACTION", { action: "DESTROY_LIGHT_WEAK", details: { maxPower: 4000 } });
        toast("Galklife Dragon: Light creatures burned!");
    },
    "Kolon, the Oracle": ({ gsR, setTargeting, net, toast, askMay }) => {
        const s = gsR.current;
        if (!s.opponent.battleZone.length) return;
        askMay({
            message: "Use Kolon's effect to tap an enemy?",
            onYes: () => {
                setTargeting({
                    message: "Kolon: Choose enemy to tap",
                    count: 1,
                    validTargets: s.opponent.battleZone.map(c => c.instanceId),
                    onComplete: (ids) => {
                        net.send("ACTION", { action: "TAP_TARGET", details: { targetId: ids[0] } });
                        toast("Enemy tapped!");
                    }
                });
            }
        });
    },
    "Locomotiver": ({ net, toast }) => {
        net.send("ACTION", { action: "DISCARD_RANDOM" });
        toast("Locomotiver: Opponent discards!");
    },
    "Magmarex": ({ setGs, net, toast, CardEngine }) => {
        setGs(p => {
            const targets = p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) === 1000);
            return { ...p, battleZone: p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) !== 1000), graveyard: [...p.graveyard, ...targets] };
        });
        net.send("ACTION", { action: "DESTROY_EXACT_POWER", details: { power: 1000 } });
        toast("Magmarex: All 1000-power units destroyed!");
    },
    "Marinomancer": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const top3 = gsR.current.deck.slice(-3).reverse();
        askMay({
            message: "Use Marinomancer's effect to reveal top 3?",
            onYes: () => {
                setSearchingDeck({
                    message: "Marinomancer: Reveal top 3",
                    count: 0,
                    isViewOnly: true,
                    customList: top3,
                    onComplete: () => {
                        setGs(p => {
                            const cards = p.deck.slice(-3);
                            const toHand = cards.filter(c => c.civilizations?.includes('Light') || c.civilizations?.includes('Darkness'));
                            const toGrave = cards.filter(c => !(c.civilizations?.includes('Light') || c.civilizations?.includes('Darkness')));
                            return { ...p, deck: p.deck.slice(0, -3), hand: [...p.hand, ...toHand], graveyard: [...p.graveyard, ...toGrave] };
                        });
                        toast("Light and Darkness cards added to hand!");
                    }
                });
            }
        });
    },
    "Niofa, Horned Protector": ({ setSearchingDeck, setGs, toast, net, askMay }) => {
        askMay({
            message: "Use Niofa's effect to search for a Nature creature?",
            onYes: () => {
                setSearchingDeck({
                    message: "Niofa: Search for a Nature creature",
                    count: 1,
                    filter: (c) => c.civilizations?.includes('Nature') && c.type === 'Creature',
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
    "King Aquakamui": ({ gsR, setGs, setSearchingDeck, toast, askMay }) => {
        const targets = gsR.current.graveyard.filter(c => c.subtypes?.some(s => s.toLowerCase().includes('angel command') || s.toLowerCase().includes('demon command')));
        if (!targets.length) return;
        askMay({
            message: "Use King Aquakamui's effect to recover Angel/Demon Commands?",
            onYes: () => {
                setGs(p => ({
                    ...p,
                    graveyard: p.graveyard.filter(c => !targets.map(t => t.instanceId).includes(c.instanceId)),
                    hand: [...p.hand, ...targets]
                }));
                toast("Angel/Demon Commands recovered!");
            }
        });
    },
    "Rimuel, Cloudbreak Elemental": ({ gsR, setTargeting, net, toast, askMay }) => {
        const untappedLightMana = gsR.current.mana.filter(m => !m.isTapped && m.civilizations?.includes('Light')).length;
        if (untappedLightMana === 0 || !gsR.current.opponent.battleZone.length) return;
        askMay({
            message: `Use Rimuel's effect to tap up to ${untappedLightMana} enemy creatures?`,
            onYes: () => {
                setTargeting({
                    message: `Rimuel: Tap ${untappedLightMana} enemy creatures`,
                    count: untappedLightMana,
                    exact: false,
                    validTargets: gsR.current.opponent.battleZone.map(c => c.instanceId),
                    onComplete: (ids) => {
                        ids.forEach(id => net.send("ACTION", { action: "TAP_TARGET", details: { targetId: id } }));
                        toast(`Tapped ${ids.length} enemies!`);
                    }
                });
            }
        });
    },
    "Skeleton Thief, the Revealer": ({ gsR, setGs, setSearchingDeck, toast, askMay }) => {
        const targets = gsR.current.graveyard.filter(c => c.subtypes?.some(s => s.toLowerCase().includes('living dead')));
        if (!targets.length) return;
        askMay({
            message: "Use Skeleton Thief's effect to recover a Living Dead?",
            onYes: () => {
                setSearchingDeck({
                    message: "Skeleton Thief: Recover a Living Dead",
                    count: 1,
                    isGraveSearch: true,
                    customList: targets,
                    onComplete: (card) => {
                        setGs(p => ({ ...p, graveyard: p.graveyard.filter(x => x.instanceId !== card.instanceId), hand: [...p.hand, card] }));
                        toast("Living Dead recovered!");
                    }
                });
            }
        });
    },
    "Aqua Surfer": ({ gsR, setTargeting, net, toast, askMay }) => {
        const creatures = [...gsR.current.battleZone, ...gsR.current.opponent.battleZone];
        if (!creatures.length) return;
        askMay({
            message: "Aqua Surfer: Return a creature to hand?",
            onYes: () => {
                setTargeting({
                    message: "Aqua Surfer: Select a creature to bounce",
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
            }
        });
    },
    "Death Cruzer, the Annihilator": ({ setGs, toast }) => {
        setGs(p => {
            const others = p.battleZone.filter(c => c.name !== "Death Cruzer, the Annihilator");
            return { ...p, battleZone: p.battleZone.filter(c => c.name === "Death Cruzer, the Annihilator"), graveyard: [...p.graveyard, ...others] };
        });
        toast("Death Cruzer: Destroyed all other creatures!");
    },
    "King Mazelan": ({ gsR, setTargeting, net, toast, askMay }) => {
        const creatures = [...gsR.current.battleZone, ...gsR.current.opponent.battleZone];
        if (!creatures.length) return;
        askMay({
            message: "King Mazelan: Return a creature to hand?",
            onYes: () => {
                setTargeting({
                    message: "King Mazelan: Select a creature to bounce",
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
            }
        });
    },
    "King Tsunami": ({ setGs, net, toast }) => {
        setGs(p => {
            const others = p.battleZone.filter(c => c.name !== "King Tsunami");
            return { ...p, battleZone: p.battleZone.filter(c => c.name === "King Tsunami"), hand: [...p.hand, ...others] };
        });
        net.send("ACTION", { action: "BOUNCE_ALL" });
        toast("King Tsunami: All other creatures bounced!");
    },
    "Kulus, Soulshine Enforcer": ({ gsR, setGs, toast }) => {
        const s = gsR.current;
        if (s.opponent.mana.length > s.mana.length) {
            setGs(p => {
                const [top, ...rest] = p.deck;
                if (!top) return p;
                return { ...p, deck: rest, mana: [...p.mana, { ...top, isTapped: false }] };
            });
            toast("Kulus: Mana ramped!");
        }
    },
    "Rain-Cloud Elemental": ({ gsR, setTargeting, net, toast }) => {
        const oppBz = gsR.current.opponent.battleZone;
        if (!oppBz.length) return;
        setTargeting({
            message: "Rain-Cloud Elemental: Select an enemy to tap",
            count: 1,
            validTargets: oppBz.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "TAP_TARGET", details: { targetId: ids[0] } });
                toast("Enemy tapped!");
            }
        });
    },
    "Ocean Messenger": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const top3 = gsR.current.deck.slice(0, 3);
        if (!top3.length) return;
        setSearchingDeck({
            message: "Ocean Messenger: Revealed top 3 cards",
            customList: top3,
            count: top3.length,
            exact: false,
            onComplete: () => {
                setGs(p => {
                    const revealed = p.deck.slice(0, 3);
                    const survivors = revealed.filter(c => c.subtypes?.includes('Survivor'));
                    const rest = revealed.filter(c => !c.subtypes?.includes('Survivor'));
                    return { ...p, deck: p.deck.slice(3), hand: [...p.hand, ...survivors], graveyard: [...p.graveyard, ...rest] };
                });
                toast("Survivors added to hand!");
            }
        });
    },
    "Aqua Surfer": ({ gsR, setTargeting, net, toast, askMay }) => {
        const targets = [...gsR.current.battleZone, ...gsR.current.opponent.battleZone];
        if (!targets.length) return;
        askMay({
            message: "Aqua Surfer: Bounce a creature?",
            onYes: () => {
                setTargeting({
                    message: "Select a creature to return to hand",
                    count: 1,
                    validTargets: targets.map(c => c.instanceId),
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
                        toast("Creature returned to hand!");
                    }
                });
            }
        });
    },
    "King Mazelan": ({ gsR, setTargeting, net, toast, askMay }) => {
        const targets = [...gsR.current.battleZone, ...gsR.current.opponent.battleZone];
        if (!targets.length) return;
        askMay({
            message: "King Mazelan: Bounce a creature?",
            onYes: () => {
                setTargeting({
                    message: "Select a creature to return to hand",
                    count: 1,
                    validTargets: targets.map(c => c.instanceId),
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
                        toast("Creature returned to hand!");
                    }
                });
            }
        });
    },
    "Midnight Crawler": ({ gsR, setTargeting, net, toast }) => {
        const oppMana = gsR.current.opponent.mana;
        if (!oppMana.length) return;
        setTargeting({
            message: "Midnight Crawler: Select an opponent's mana to return to hand",
            count: 1,
            validTargets: oppMana.map(m => m.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "BOUNCE_MANA_TARGET", details: { targetId: ids[0] } });
                toast("Opponent's mana returned to hand!");
            }
        });
    },
    "Raptor Fish": ({ gsR, setGs, toast }) => {
        const hand = gsR.current.hand;
        const count = hand.length;
        setGs(p => ({
            ...p,
            hand: [],
            deck: [...p.deck, ...hand].sort(() => Math.random() - 0.5)
        }));
        setTimeout(() => {
            for (let i = 0; i < count; i++) {
                setTimeout(() => draw(), i * 150);
            }
        }, 500);
        toast(`Raptor Fish: Shuffled ${count} cards and drawing!`);
    },
    "Thrash Crawler": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const mana = gsR.current.mana;
        if (!mana.length) return;
        setSearchingDeck({
            message: "Thrash Crawler: Select a card from mana to return to hand",
            customList: mana,
            count: 1,
            onComplete: (cards) => {
                const card = cards[0];
                setGs(p => ({
                    ...p,
                    mana: p.mana.filter(m => m.instanceId !== card.instanceId),
                    hand: [...p.hand, card]
                }));
                toast("Mana returned to hand!");
            }
        });
    },
    "Factory Shell Q": ({ gsR, setSearchingDeck, setGs, toast }) => {
        setSearchingDeck({
            message: "Factory Shell Q: Search a Survivor from deck",
            count: 1,
            filter: (c) => c.subtypes?.includes('Survivor'),
            onComplete: (cards) => {
                const card = cards[0];
                setGs(p => ({
                    ...p,
                    deck: p.deck.filter(c => c.instanceId !== card.instanceId),
                    hand: [...p.hand, card]
                }));
                toast("Survivor added to hand!");
            }
        });
    },
    "Forbos, Sanctum Guardian Q": ({ gsR, setSearchingDeck, setGs, toast }) => {
        setSearchingDeck({
            message: "Forbos: Search a spell from deck",
            count: 1,
            filter: (c) => CardEngine.isSpell(c),
            onComplete: (cards) => {
                const card = cards[0];
                setGs(p => ({
                    ...p,
                    deck: p.deck.filter(c => c.instanceId !== card.instanceId),
                    hand: [...p.hand, card]
                }));
                toast("Spell added to hand!");
            }
        });
    },
    "Grave Worm Q": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const survivors = gsR.current.graveyard.filter(c => c.subtypes?.includes('Survivor'));
        if (!survivors.length) return;
        setSearchingDeck({
            message: "Grave Worm Q: Select a Survivor from graveyard",
            customList: survivors,
            count: 1,
            onComplete: (cards) => {
                const card = cards[0];
                setGs(p => ({
                    ...p,
                    graveyard: p.graveyard.filter(c => c.instanceId !== card.instanceId),
                    hand: [...p.hand, card]
                }));
                toast("Survivor returned to hand!");
            }
        });
    },
    "Ripple Lotus Q": ({ gsR, setTargeting, net, toast }) => {
        const targets = gsR.current.opponent.battleZone;
        if (!targets.length) return;
        setTargeting({
            message: "Ripple Lotus Q: Select an enemy to tap",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "TAP_TARGET", details: { targetId: ids[0] } });
                toast("Enemy tapped!");
            }
        });
    },
    "Q-tronic Hypermind": ({ gsR, draw, toast }) => {
        const survivors = gsR.current.battleZone.filter(c => c.subtypes?.includes('Survivor')).length;
        for (let i = 0; i < survivors; i++) {
            setTimeout(draw, i * 150);
        }
        toast(`Q-tronic Hypermind: Drew ${survivors} cards!`);
    },
    "Phantasm Dragon": ({ gsR, setTargeting, setGs, toast }) => {
        const others = gsR.current.battleZone.filter(c => c.name !== "Phantasm Dragon");
        if (!others.length) return;
        setTargeting({
            message: "Phantasm Dragon: Select one of your other creatures to destroy",
            count: 1,
            validTargets: others.map(c => c.instanceId),
            onComplete: (ids) => {
                const target = gsR.current.battleZone.find(c => c.instanceId === ids[0]);
                if (target) {
                    setGs(p => ({
                        ...p,
                        battleZone: p.battleZone.filter(c => c.instanceId !== ids[0]),
                        graveyard: [...p.graveyard, target]
                    }));
                    toast(`${target.name} sacrificed!`);
                }
            }
        });
    },
    "Armored Decimator Valkaizer": ({ gsR, setTargeting, net, toast }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.getCurrentPower(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana) <= 4000);
        if (!targets.length) return;
        setTargeting({
            message: "Valkaizer: Select an enemy to destroy (power 4000 or less)",
            count: 1,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                net.send("ACTION", { action: "CREATURE_DESTROYED", details: { targetId: ids[0] } });
                toast("Enemy destroyed!");
            }
        });
    },
    "Craze Valkyrie, the Drastic": ({ gsR, setTargeting, net, toast }) => {
        const targets = gsR.current.opponent.battleZone;
        if (!targets.length) return;
        setTargeting({
            message: "Craze Valkyrie: Select up to 2 enemies to tap",
            count: 2,
            exact: false,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                ids.forEach(id => net.send("ACTION", { action: "TAP_TARGET", details: { targetId: id } }));
                toast("Enemies tapped!");
            }
        });
    },
    // DM-04
    "Astral Warper": ({ askMay, draw, toast }) => {
        askMay({
            message: "Use Astral Warper's effect to draw up to 3 cards?",
            onYes: () => { draw(); setTimeout(draw, 150); setTimeout(draw, 300); toast("Astral Warper: Drew 3 cards!"); }
        });
    },
    "Ballom, Master of Death": ({ gsR, setGs, net, toast }) => {
        setGs(p => {
            const nonDarks = p.battleZone.filter(c => !c.civilizations?.includes('Darkness'));
            return { ...p, battleZone: p.battleZone.filter(c => c.civilizations?.includes('Darkness')), graveyard: [...p.graveyard, ...nonDarks] };
        });
        net.send("ACTION", { action: "DESTROY_ALL_EXCEPT_DARK" });
        toast("Ballom: All non-darkness creatures destroyed!");
    },
    "Doboulgyser, Giant Rock Beast": ({ gsR, setTargeting, net, toast, askMay, CardEngine }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.getCurrentPower(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana) <= 3000);
        if (!targets.length) return;
        askMay({
            message: "Use Doboulgyser's effect to destroy an opponent's creature (power 3000 or less)?",
            onYes: () => {
                setTargeting({
                    message: "Select an enemy to destroy",
                    count: 1,
                    validTargets: targets.map(c => c.instanceId),
                    onComplete: (ids) => {
                        net.send("ACTION", { action: "CREATURE_DESTROYED", details: { targetId: ids[0] } });
                        toast("Enemy destroyed!");
                    }
                });
            }
        });
    },
    "Galklife Dragon": ({ setGs, net, toast }) => {
        setGs(p => {
            const targets = p.battleZone.filter(c => c.civilizations?.includes('Light') && CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= 4000);
            return { ...p, battleZone: p.battleZone.filter(c => !(c.civilizations?.includes('Light') && CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= 4000)), graveyard: [...p.graveyard, ...targets] };
        });
        net.send("ACTION", { action: "DESTROY_LIGHT_WEAK", details: { maxPower: 4000 } });
        toast("Galklife Dragon: Weak light creatures destroyed!");
    },
    "King Aquakamui": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const s = gsR.current;
        const validGraveyard = s.graveyard.filter(c => c.subtypes?.some(t => t.toLowerCase().includes('angel command') || t.toLowerCase().includes('demon command')));
        if (!validGraveyard.length) return;
        askMay({
            message: "Use King Aquakamui's effect to return Angel Commands and Demon Commands from your graveyard?",
            onYes: () => {
                setGs(p => ({
                    ...p,
                    graveyard: p.graveyard.filter(c => !(c.subtypes?.some(t => t.toLowerCase().includes('angel command') || t.toLowerCase().includes('demon command')))),
                    hand: [...p.hand, ...validGraveyard]
                }));
                toast("King Aquakamui: Returned creatures to hand!");
            }
        });
    },
    "Kolon, the Oracle": ({ gsR, setTargeting, net, toast, askMay }) => {
        const targets = gsR.current.opponent.battleZone.filter(c => !c.isTapped);
        if (!targets.length) return;
        askMay({
            message: "Use Kolon's effect to tap an opponent's creature?",
            onYes: () => {
                setTargeting({
                    message: "Kolon: Select an enemy to tap",
                    count: 1,
                    validTargets: targets.map(c => c.instanceId),
                    onComplete: (ids) => {
                        net.send("ACTION", { action: "TAP_TARGET", details: { targetId: ids[0] } });
                        toast("Enemy tapped!");
                    }
                });
            }
        });
    },
    "Locomotiver": ({ net, toast }) => {
        net.send("ACTION", { action: "DISCARD_RANDOM" });
        toast("Locomotiver: Opponent discarded a card!");
    },
    "Magmarex": ({ setGs, net, toast }) => {
        setGs(p => {
            const targets = p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) === 1000);
            return { ...p, battleZone: p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) !== 1000), graveyard: [...p.graveyard, ...targets] };
        });
        net.send("ACTION", { action: "DESTROY_EXACT_POWER", details: { power: 1000 } });
        toast("Magmarex: Destroyed 1000 power creatures!");
    },
    "Marinomancer": ({ gsR, setGs, toast }) => {
        setGs(p => {
            if (p.deck.length === 0) return p;
            const top3 = p.deck.slice(-3).reverse();
            const rest = p.deck.slice(0, -3);
            const toHand = top3.filter(c => c.civilizations?.includes('Light') || c.civilizations?.includes('Darkness'));
            const toGrave = top3.filter(c => !(c.civilizations?.includes('Light') || c.civilizations?.includes('Darkness')));
            return { ...p, deck: rest, hand: [...p.hand, ...toHand], graveyard: [...p.graveyard, ...toGrave] };
        });
        toast("Marinomancer: Revealed top 3 cards!");
    },
    "Niofa, Horned Protector": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        const natureCards = s.deck.filter(c => c.civilizations?.includes('Nature') && c.type === 'Creature');
        if (!natureCards.length) return;
        setSearchingDeck({
            message: "Niofa: Select a nature creature from your deck",
            count: 1,
            customList: s.deck,
            onComplete: (selectedCard) => {
                if (selectedCard && selectedCard.civilizations?.includes('Nature') && selectedCard.type === 'Creature') {
                    setGs(prev => ({
                        ...prev,
                        deck: prev.deck.filter(c => c.instanceId !== selectedCard.instanceId).sort(() => Math.random() - 0.5),
                        hand: [...prev.hand, selectedCard]
                    }));
                    toast("Niofa: Took a nature creature!");
                } else {
                    setGs(prev => ({ ...prev, deck: [...prev.deck].sort(() => Math.random() - 0.5) }));
                    toast("Niofa: Invalid card selected or skipped.", "error");
                }
            }
        });
    },
    "Rimuel, Cloudbreak Elemental": ({ gsR, setTargeting, net, toast }) => {
        const untappedLight = gsR.current.mana.filter(c => !c.isTapped && c.civilizations?.includes('Light')).length;
        if (untappedLight === 0) return;
        const targets = gsR.current.opponent.battleZone.filter(c => !c.isTapped);
        if (!targets.length) return;
        const count = Math.min(untappedLight, targets.length);
        setTargeting({
            message: `Rimuel: Select up to ${count} enemies to tap`,
            count: count,
            exact: false,
            validTargets: targets.map(c => c.instanceId),
            onComplete: (ids) => {
                ids.forEach(id => net.send("ACTION", { action: "TAP_TARGET", details: { targetId: id } }));
                toast("Enemies tapped!");
            }
        });
    },
    "Skeleton Thief, the Revealer": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const s = gsR.current;
        const valid = s.graveyard.filter(c => c.subtypes?.some(t => t.toLowerCase().includes('living dead')));
        if (!valid.length) return;
        askMay({
            message: "Use Skeleton Thief's effect to return a Living Dead from your graveyard?",
            onYes: () => {
                setSearchingDeck({
                    message: "Select a Living Dead to return",
                    count: 1,
                    customList: valid,
                    onComplete: (card) => {
                        setGs(p => ({
                            ...p,
                            graveyard: p.graveyard.filter(c => c.instanceId !== card.instanceId),
                            hand: [...p.hand, card]
                        }));
                        toast("Skeleton Thief: Returned creature!");
                    }
                });
            }
        });
    },
    "Trox, General of Destruction": ({ gsR, net, toast }) => {
        const otherDark = gsR.current.battleZone.filter(c => c.name !== "Trox, General of Destruction" && c.civilizations?.includes('Darkness')).length;
        if (otherDark > 0) {
            for (let i = 0; i < otherDark; i++) {
                setTimeout(() => net.send("ACTION", { action: "DISCARD_RANDOM" }), i * 300);
            }
            toast(`Trox: Opponent discards ${otherDark} cards!`);
        }
    },
    // DM-05
    "Aqua Surfer": ({ gsR, setTargeting, net, setGs, toast, askMay }) => {
        const s = gsR.current;
        const allCreatures = [...s.battleZone, ...s.opponent.battleZone];
        if (!allCreatures.length) return;
        askMay({
            message: "Use Aqua Surfer's effect to bounce a creature?",
            onYes: () => {
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
                        toast("Aqua Surfer: Bounced creature!");
                    }
                });
            }
        });
    },
    "Death Cruzer, the Annihilator": ({ setGs, toast }) => {
        setGs(p => {
            const others = p.battleZone.filter(c => c.name !== "Death Cruzer, the Annihilator");
            return {
                ...p,
                battleZone: p.battleZone.filter(c => c.name === "Death Cruzer, the Annihilator"),
                graveyard: [...p.graveyard, ...others]
            };
        });
        toast("Death Cruzer: Destroyed all your other creatures!");
    },
    "King Mazelan": ({ gsR, setTargeting, net, setGs, toast, askMay }) => {
        const s = gsR.current;
        const allCreatures = [...s.battleZone, ...s.opponent.battleZone];
        if (!allCreatures.length) return;
        askMay({
            message: "Use King Mazelan's effect to bounce a creature?",
            onYes: () => {
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
                        toast("King Mazelan: Bounced creature!");
                    }
                });
            }
        });
    },
    "King Tsunami": ({ setGs, net, toast }) => {
        setGs(p => {
            const others = p.battleZone.filter(c => c.name !== "King Tsunami");
            return {
                ...p,
                battleZone: p.battleZone.filter(c => c.name === "King Tsunami"),
                hand: [...p.hand, ...others]
            };
        });
        net.send("ACTION", { action: "BOUNCE_ALL" });
        toast("King Tsunami: Bounced all other creatures!");
    },
    "Kulus, Soulshine Enforcer": ({ gsR, setGs, toast }) => {
        if (gsR.current.opponent.mana.length > gsR.current.mana.length) {
            setGs(p => {
                if (p.deck.length === 0) return p;
                const top = p.deck[p.deck.length - 1];
                return { ...p, deck: p.deck.slice(0, -1), mana: [...p.mana, { ...top, isTapped: false }] };
            });
            toast("Kulus: Opponent has more mana. Put top card into mana zone!");
        }
    },
    "Scissor Scarab": ({ gsR, setSearchingDeck, setGs, toast }) => {
        const s = gsR.current;
        const valid = s.deck.filter(c => c.subtypes?.some(t => t.toLowerCase().includes('giant insect')));
        if (!valid.length) return;
        setSearchingDeck({
            message: "Scissor Scarab: Select a Giant Insect from your deck",
            count: 1,
            customList: s.deck,
            onComplete: (selectedCard) => {
                if (selectedCard && selectedCard.subtypes?.some(t => t.toLowerCase().includes('giant insect'))) {
                    setGs(prev => ({
                        ...prev,
                        deck: prev.deck.filter(c => c.instanceId !== selectedCard.instanceId).sort(() => Math.random() - 0.5),
                        hand: [...prev.hand, selectedCard]
                    }));
                    toast("Scissor Scarab: Took a Giant Insect!");
                } else {
                    setGs(prev => ({ ...prev, deck: [...prev.deck].sort(() => Math.random() - 0.5) }));
                    toast("Invalid card selected or skipped.", "error");
                }
            }
        });
    },
    "Solidskin Fish": ({ gsR, setSearchingDeck, setGs, toast }) => {
        if (!gsR.current.mana.length) return;
        setSearchingDeck({
            message: "Solidskin Fish: Select a card from mana to return to hand",
            count: 1,
            customList: gsR.current.mana,
            onComplete: (card) => {
                setGs(p => ({
                    ...p,
                    mana: p.mana.filter(m => m.instanceId !== card.instanceId),
                    hand: [...p.hand, card]
                }));
                toast("Solidskin Fish: Returned to hand!");
            }
        });
    },
    "Syforce, Aurora Elemental": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const s = gsR.current;
        const valid = s.mana.filter(c => c.type === 'Spell');
        if (!valid.length) return;
        askMay({
            message: "Use Syforce's effect to return a spell from your mana zone?",
            onYes: () => {
                setSearchingDeck({
                    message: "Select a Spell to return",
                    count: 1,
                    customList: valid,
                    onComplete: (card) => {
                        setGs(p => ({
                            ...p,
                            mana: p.mana.filter(c => c.instanceId !== card.instanceId),
                            hand: [...p.hand, card]
                        }));
                        toast("Syforce: Returned spell!");
                    }
                });
            }
        });
    }
};
