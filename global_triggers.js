export const GLOBAL_TRIGGERS = {
    ON_SUMMON: {
        "Mist Rias, Sonic Guardian": ({ draw, toast, askMay }) => {
            askMay({
                message: "Mist Rias: Another creature was summoned. Draw a card?",
                onYes: () => { draw(); toast("Mist Rias: Draw 1!"); }
            });
        }
    },
    ON_DESTROY: {
        "Mongrel Man": ({ draw, toast, askMay }) => {
            askMay({
                message: "Mongrel Man: Another creature was destroyed. Draw a card?",
                onYes: () => { draw(); toast("Mongrel Man: Draw 1!"); }
            });
        }
    }
};
