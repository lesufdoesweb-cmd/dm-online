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
    "Ambush Scorpion": ({ gsR, setGs, askMay, card }) => {
        const other = gsR.current.mana.find(c => c.name === "Ambush Scorpion");
        if (other) {
            askMay({
                message: "Ambush Scorpion: Bring another from mana zone?",
                onYes: () => {
                    setGs(s => ({
                        ...s,
                        mana: s.mana.filter(m => m.instanceId !== other.instanceId),
                        battleZone: [...s.battleZone, { ...other, instanceId: Math.random().toString(36).substr(2, 9), summonedThisTurn: true }]
                    }));
                }
            });
        }
    },
    "Jewel Spider": ({ gsR, setGs, askMay, card }) => {
        if (gsR.current.shields.length > 0) {
            askMay({
                message: "Jewel Spider: Return a shield to hand?",
                onYes: () => {
                    setGs(s => {
                        const ns = [...s.shields];
                        const c = ns.pop();
                        return { ...s, shields: ns, hand: [...s.hand, c] };
                    });
                }
            });
        }
    }
};
