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
    }
};
