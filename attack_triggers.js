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
    "Horrid Worm": ({ net, toast }) => { net.send("ACTION", { action: "DISCARD_RANDOM" }); toast("Horrid Worm: Opponent discards!"); },
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
        const targets = [...gsR.current.battleZone, ...gsR.current.opponent.battleZone].filter(c => CardEngine.getCurrentPower(c, [], []) <= 2000);
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
        const targets = gsR.current.opponent.battleZone.filter(c => CardEngine.getCurrentPower(c, gsR.current.opponent.battleZone, gsR.current.opponent.mana) <= 2000);
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