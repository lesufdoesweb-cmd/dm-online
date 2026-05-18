export const AFTER_ATTACK_TRIGGERS = {
    "Marrow Ooze, the Twister": ({ gsR, setGs, finishDestruction, toast, card }) => {
        const target = gsR.current.battleZone.find(x => x.instanceId === card.instanceId);
        if (target) {
            finishDestruction(target);
            toast("Marrow Ooze destroyed after attack!");
        }
    },
    "Avalanche Giant": ({ net, setGs, toast, isBlocked }) => {
        if (isBlocked) {
            net.send("ACTION", { action: "SHIELD_BROKEN" });
            setGs(p => ({ ...p, shieldsBrokenThisTurn: p.shieldsBrokenThisTurn + 1 }));
            toast("Avalanche Giant: Shield broken because blocked!");
        }
    },
    "Splinterclaw Wasp": ({ net, setGs, toast, isBlocked }) => {
        if (isBlocked) {
            net.send("ACTION", { action: "SHIELD_BROKEN" });
            setGs(p => ({ ...p, shieldsBrokenThisTurn: p.shieldsBrokenThisTurn + 1 }));
            toast("Splinterclaw Wasp: Shield broken because blocked!");
        }
    }
};
