import { CardEngine } from "./engine.js";

export class LocalConn {
    constructor(bot) {
        this.bot = bot;
        this.handlers = {};
        this.open = true;
        this.peer = "BOT";
        bot.setConn(this);
    }
    on(event, handler) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(handler);
        if (event === 'open') setTimeout(() => handler(), 0);
    }
    off(event, handler) {
        if (!this.handlers[event]) return;
        this.handlers[event] = this.handlers[event].filter(h => h !== handler);
    }
    send(msg) {
        // Message from Player to Bot
        // PeerJS usually sends {type, payload}
        setTimeout(() => this.bot.handleMessage(msg), 10);
    }
    receive(msg) {
        // Message from Bot to Player
        if (this.handlers['data']) {
            this.handlers['data'].forEach(h => h(msg));
        }
    }
    close() {
        this.open = false;
        if (this.handlers['close']) {
            this.handlers['close'].forEach(h => h());
        }
    }
}

export class BotEngine {
    constructor(cards, deck) {
        this.cards = cards;
        this.deck = deck;
        this.conn = null;
        this.gs = {
            hand: [], mana: [], battleZone: [], shields: [], deck: [], graveyard: [],
            opponent: { handCount: 0, mana: [], battleZone: [], shields: [], graveyard: [] },
            turn: false, hasPlacedMana: false
        };
        this.initialized = false;
    }

    setConn(conn) {
        this.conn = conn;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        const full = [];
        this.deck.cards.forEach(dc => {
            const info = this.cards.find(c => c.id === dc.id && (!dc.set_id || c.set_id === dc.set_id));
            if (!info) return;
            for (let i = 0; i < dc.count; i++) {
                full.push({ ...info, instanceId: "bot_" + Math.random().toString(36).substr(2, 9) });
            }
        });
        const sh = full.sort(() => Math.random() - 0.5);
        const shields = sh.splice(0, 5);
        this.gs.deck = sh;
        this.gs.shields = shields;

        // Draw 5
        for (let i = 0; i < 5; i++) {
            const c = this.gs.deck.pop();
            if (c) this.gs.hand.push(c);
        }
        this.sync();
    }

    sync() {
        if (!this.conn) return;
        this.conn.receive({
            type: "SYNC",
            payload: {
                handCount: this.gs.hand.length,
                mana: this.gs.mana.map(c => ({ ...c, isTapped: !!c.isTapped })),
                battleZone: this.gs.battleZone.map(c => ({ ...c, isTapped: !!c.isTapped })),
                shields: this.gs.shields.map(c => ({ instanceId: c.instanceId, name: c.name, image_file: c.image_file })),
                graveyard: this.gs.graveyard
            }
        });
    }

    sendAction(action, details = {}) {
        this.conn.receive({
            type: "ACTION",
            payload: { action, details }
        });
    }

    handleMessage(msg) {
        const { type, payload } = msg;
        if (type === "SYNC") {
            this.gs.opponent = payload;
        } else if (type === "ACTION") {
            this.handleAction(payload.action, payload.details);
        }
    }

    handleAction(action, details) {
        if (action === "SYNC_TURN") {
            // details.hostTurn is the PLAYER's turn. Bot is not host.
            const playerTurn = details.hostTurn;
            if (!playerTurn && !this.gs.turn) {
                this.gs.turn = true;
                this.startTurn();
            } else if (playerTurn) {
                this.gs.turn = false;
            }
        }
        if (action === "END_TURN") {
            if (!this.gs.turn) {
                this.gs.turn = true;
                this.startTurn();
            }
        }
        if (action === "ATTACK_DECLARED") {
            // Bot decides whether to block
            const { attacker, targetType, targetId } = details;
            const blockers = this.gs.battleZone.filter(c => {
                const abs = CardEngine.parseAbilities(c, this.gs.battleZone, this.gs.mana);
                return abs.blocker && !c.isTapped;
                // Simplified: we don't check canBeBlocked yet for the bot's side
            });

            if (blockers.length > 0) {
                // Heuristic: block with the weakest blocker
                blockers.sort((a, b) => (a.power || 0) - (b.power || 0));
                const chosen = blockers[0];
                this.gs.battleZone = this.gs.battleZone.map(c => c.instanceId === chosen.instanceId ? { ...c, isTapped: true } : c);
                this.sendAction("BLOCK_DECISION", { blockerId: chosen.instanceId });
            } else {
                this.sendAction("BLOCK_DECISION", { blockerId: null });
            }
            this.sync();
        }
        if (action === "SHIELD_BROKEN") {
            const broken = this.gs.shields.pop();
            if (broken) {
                // Check for shield trigger
                const abs = CardEngine.parseAbilities(broken, this.gs.battleZone, this.gs.mana);
                if (abs.shieldTrigger) {
                    // Bot logic for shield trigger - simplified: just put in hand
                    this.gs.hand.push(broken);
                } else {
                    this.gs.hand.push(broken);
                }
            }
            this.sync();
        }
        if (action === "FINISH_DESTRUCTION_SYNC") {
            const { instanceId, dest } = details;
            const target = this.gs.battleZone.find(c => c.instanceId === instanceId);
            if (target) {
                this.gs.battleZone = this.gs.battleZone.filter(c => c.instanceId !== instanceId);
                if (dest === 'mana') this.gs.mana.push({ ...target, isTapped: false });
                else if (dest === 'hand') this.gs.hand.push(target);
                else this.gs.graveyard.push(target);
            }
            this.sync();
        }
        if (action === "TAP_TARGET") {
            const { targetId } = details;
            this.gs.battleZone = this.gs.battleZone.map(c => c.instanceId === targetId ? { ...c, isTapped: true } : c);
            this.sync();
        }
    }

    async startTurn() {
        console.log("Bot starting turn...");
        // 1. Untap
        this.gs.battleZone = this.gs.battleZone.map(c => ({ ...c, isTapped: false, summonedThisTurn: false }));
        this.gs.mana = this.gs.mana.map(c => ({ ...c, isTapped: false }));
        this.gs.hasPlacedMana = false;
        this.sync();
        await this.delay(500);

        // 2. Draw
        if (this.gs.deck.length === 0) {
            this.sendAction("DECK_OUT");
            return;
        }
        const drawn = this.gs.deck.pop();
        this.gs.hand.push(drawn);
        this.sync();
        await this.delay(500);

        // 3. Charge Mana
        if (this.gs.hand.length > 0) {
            // Heuristic: charge a duplicate or the highest cost card if we have many
            const toChargeIdx = 0; 
            const toCharge = this.gs.hand.splice(toChargeIdx, 1)[0];
            this.gs.mana.push({ ...toCharge, isTapped: false });
            this.gs.hasPlacedMana = true;
            this.sendAction("LOG_ENTRY", { text: `Opponent placed ${toCharge.name} in mana zone`, type: 'mana' });
            this.sync();
            await this.delay(500);
        }

        // 4. Play Cards
        let played = true;
        while (played) {
            played = false;
            const availableMana = this.gs.mana.filter(m => !m.isTapped).length;
            
            // Try to find a playable creature
            const playable = this.gs.hand.filter(c => {
                if (CardEngine.isSpell(c)) return false; // Bot doesn't play spells yet
                const cost = CardEngine.getCost(c, this.gs.battleZone, this.gs.mana);
                return cost <= availableMana && CardEngine.hasCivilization(this.gs.mana, c.civilizations);
            });

            if (playable.length > 0) {
                // Play the most expensive one
                playable.sort((a, b) => b.cost - a.cost);
                const card = playable[0];
                const cost = CardEngine.getCost(card, this.gs.battleZone, this.gs.mana);
                
                // Tap mana
                let tapped = 0;
                this.gs.mana = this.gs.mana.map(m => {
                    if (!m.isTapped && tapped < cost) {
                        tapped++;
                        return { ...m, isTapped: true };
                    }
                    return m;
                });

                this.gs.hand = this.gs.hand.filter(c => c.instanceId !== card.instanceId);
                this.gs.battleZone.push({ ...card, summonedThisTurn: true, isTapped: false });
                
                this.sendAction("LOG_ENTRY", { text: `Opponent summoned ${card.name}`, type: 'summon' });
                this.sendAction("REVEAL_CARD", { card });
                this.sendAction("GLOBAL_EVENT", { type: "ON_SUMMON", card });
                
                this.sync();
                played = true;
                await this.delay(800);
            }
        }

        // 5. Attack
        const attackers = this.gs.battleZone.filter(c => {
            return !c.isTapped && !c.summonedThisTurn;
            // Simplified: doesn't check canAttack yet
        });

        for (const atk of attackers) {
            this.gs.battleZone = this.gs.battleZone.map(c => c.instanceId === atk.instanceId ? { ...c, isTapped: true } : c);
            this.sendAction("LOG_ENTRY", { text: `Opponent's ${atk.name} is attacking!`, type: 'attack' });
            this.sendAction("ATTACK_DECLARED", { attacker: atk, targetType: "SHIELD", targetId: null });
            
            this.sync();
            await this.delay(1500); // Wait for blocking decision (even if bot ignores it for now)
        }

        // 6. End Turn
        console.log("Bot ending turn.");
        this.gs.turn = false;
        this.sendAction("END_TURN");
        this.sync();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
