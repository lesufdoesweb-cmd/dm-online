export const DESTROY_EFFECTS = {
    "Bombersaur": ({ gsR, setGs, setTargeting, net, toast }) => {
        const s = gsR.current;
        if (s.mana.length > 0) {
            setTargeting({
                message: "Bombersaur: Select up to 2 mana to put into graveyard",
                count: 2,
                validTargets: s.mana.map(m => m.instanceId),
                isManaTarget: true,
                allowPartial: true,
                onComplete: (ids) => {
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
    "Engineer Kipo": ({ gsR, setGs, setTargeting, net, toast }) => {
        const s = gsR.current;
        if (s.mana.length > 0) {
            setTargeting({
                message: "Engineer Kipo: Select mana to put into graveyard",
                count: 1,
                validTargets: s.mana.map(m => m.instanceId),
                isManaTarget: true,
                onComplete: (ids) => {
                    setGs(p => {
                        const target = p.mana.find(m => m.instanceId === ids[0]);
                        return { ...p, mana: p.mana.filter(m => m.instanceId !== ids[0]), graveyard: [...p.graveyard, target] };
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
};