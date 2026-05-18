export const DESTROY_EFFECTS = {
    "Bombersaur": ({ gsR, setGs, setSearchingDeck, net, toast }) => {
        const s = gsR.current;
        if (s.mana.length > 0) {
            const count = Math.min(2, s.mana.length);
            setSearchingDeck({
                message: "Bombersaur: Select " + count + " mana to put into graveyard",
                customList: s.mana,
                count: count,
                exact: true,
                onComplete: (selected) => {
                    const cards = Array.isArray(selected) ? selected : [selected];
                    const ids = cards.map(c => c.instanceId);
                    setGs(p => {
                        const targets = p.mana.filter(m => ids.includes(m.instanceId));
                        return { ...p, mana: p.mana.filter(m => !ids.includes(m.instanceId)), graveyard: [...p.graveyard, ...targets] };
                    });
                }
            });
        }
        net.send("ACTION", { action: "DESTROY_MANA_CHOICE", details: { count: 2 } });
        toast("Bombersaur: Each player loses 2 mana!");
    },
    "Engineer Kipo": ({ gsR, setGs, setSearchingDeck, net, toast }) => {
        const s = gsR.current;
        if (s.mana.length > 0) {
            setSearchingDeck({
                message: "Engineer Kipo: Select mana to put into graveyard",
                customList: s.mana,
                count: 1,
                onComplete: (card) => {
                    setGs(p => {
                        return { ...p, mana: p.mana.filter(m => m.instanceId !== card.instanceId), graveyard: [...p.graveyard, card] };
                    });
                }
            });
        }
        net.send("ACTION", { action: "DESTROY_MANA_CHOICE", details: { count: 1 } });
        toast("Engineer Kipo: Each player loses 1 mana!");
    },
    "Bone Piercer": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const creatures = gsR.current.mana.filter(c => c.type === 'Creature');
        if (!creatures.length) return;
        askMay({
            message: "Use Bone Piercer's effect to return a creature from mana?",
            onYes: () => {
                setSearchingDeck({
                    message: "Bone Piercer: Select creature from mana to return to hand",
                    count: 1,
                    customList: creatures,
                    onComplete: (card) => {
                        setGs(p => ({ ...p, mana: p.mana.filter(m => m.instanceId !== card.instanceId), hand: [...p.hand, card] }));
                        toast("Bone Piercer: Creature recovered from mana!");
                    }
                });
            }
        });
    },
    "Ambush Scorpion": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const s = gsR.current;
        const valid = s.mana.filter(c => c.name === "Ambush Scorpion");
        if (!valid.length) return;
        askMay({
            message: "Use Ambush Scorpion's effect to put an Ambush Scorpion from mana into the battle zone?",
            onYes: () => {
                setSearchingDeck({
                    message: "Select an Ambush Scorpion from mana",
                    count: 1,
                    customList: valid,
                    onComplete: (card) => {
                        setGs(p => ({
                            ...p,
                            mana: p.mana.filter(m => m.instanceId !== card.instanceId),
                            battleZone: [...p.battleZone, { ...card, summonedThisTurn: true }]
                        }));
                        toast("Ambush Scorpion: Summoned from mana!");
                    }
                });
            }
        });
    },
    "Jewel Spider": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const s = gsR.current;
        if (!s.shields.length) return;
        askMay({
            message: "Use Jewel Spider's effect to return a shield to your hand?",
            onYes: () => {
                setSearchingDeck({
                    message: "Jewel Spider: Select a shield to take to hand (No trigger)",
                    count: 1,
                    customList: s.shields,
                    isFaceDown: true,
                    onComplete: (shield) => {
                        setGs(prev => {
                            return {
                                ...prev,
                                hand: [...prev.hand, shield],
                                shields: prev.shields.filter(x => x.instanceId !== shield.instanceId)
                            };
                        });
                        toast("Jewel Spider: Shield returned to hand!");
                    }
                });
            }
        });
    },
    "Obsidian Scarab": ({ gsR, setSearchingDeck, setGs, toast, askMay }) => {
        const s = gsR.current;
        const valid = s.mana.filter(c => c.name === "Obsidian Scarab");
        if (!valid.length) return;
        askMay({
            message: "Use Obsidian Scarab's effect to put an Obsidian Scarab from mana into the battle zone?",
            onYes: () => {
                setSearchingDeck({
                    message: "Select an Obsidian Scarab from mana",
                    count: 1,
                    customList: valid,
                    onComplete: (card) => {
                        setGs(p => ({
                            ...p,
                            mana: p.mana.filter(m => m.instanceId !== card.instanceId),
                            battleZone: [...p.battleZone, { ...card, summonedThisTurn: true }]
                        }));
                        toast("Obsidian Scarab: Summoned from mana!");
                    }
                });
            }
        });
    },
    "Sinister General Damudo": ({ setGs, net, toast, CardEngine }) => {
        setGs(p => {
            const targets = p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= 3000);
            return { ...p, battleZone: p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) > 3000), graveyard: [...p.graveyard, ...targets] };
        });
        net.send("ACTION", { action: "DESTROY_ALL_WEAK", details: { maxPower: 3000 } });
        toast("Sinister General Damudo: Destroyed creatures with 3000 power or less!");
    },
    "Schuka, Duke of Amnesia": ({ setGs, net, toast }) => {
        setGs(p => ({ ...p, hand: [] }));
        net.send("ACTION", { action: "DISCARD_ALL" });
        toast("Schuka: Each player discards his hand!");
    }
};
