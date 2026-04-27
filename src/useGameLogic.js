import { ETB_EFFECTS } from "../etb_effects.js";
import { SPELL_EFFECTS } from "../spell_effects.js";
import { ATTACK_TRIGGERS } from "../attack_triggers.js";
import { DESTROY_EFFECTS } from "../destroy_effects.js";
import { GLOBAL_TRIGGERS } from "../global_triggers.js";
import { TAP_EFFECTS } from "../tap_effects.js";
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CardEngine } from "./engine.js";
import { useNetwork, useArrowDrag } from "./hooks.js";

export const useGameLogic = ({ cards, deck, conn, isHost }) => {
    // Setup global effects for triggerEffect
    window.GAME_EFFECTS = { ETB_EFFECTS, SPELL_EFFECTS, ATTACK_TRIGGERS, DESTROY_EFFECTS, TAP_EFFECTS };

    const [gs, setGs] = useState({
        hand: [], mana: [], battleZone: [], shields: [], deck: [], graveyard: [],
        opponent: { handCount: 0, mana: [], battleZone: [], shields: [null, null, null, null, null], graveyard: [] },
        turn: isHost, hasPlacedMana: false, attackStarted: false, gameOver: null,
        turnEffects: { creepingPlague: false, swordOfMalevolentDeath: false, whiskingWhirlwind: false, miracleQuest: false, brutalCharge: false },
        shieldsBrokenThisTurn: 0
    });
    const [toasts, setToasts] = useState([]);
    const [ctx, setCtx] = useState(null);
    const [preview, setPreview] = useState(null);
    const [trigger, setTrigger] = useState(null);
    const [targeting, setTargeting] = useState(null);
    const [blockingRequest, setBlockingRequest] = useState(null);
    const [waitingForBlock, setWaitingForBlock] = useState(null);
    const [waitingForOpponent, setWaitingForOpponent] = useState(false);
    const [searchingDeck, setSearchingDeck] = useState(null);
    const [pendingDestruction, setPendingDestruction] = useState(null);
    const [pendingDecision, setPendingDecision] = useState(null);
    const [logs, setLogs] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isOpponentConnected, setIsOpponentConnected] = useState(true);

    const prevT = useRef(null);
    const wfbR = useRef(null);
    wfbR.current = waitingForBlock;
    const wfoR = useRef(null);
    wfoR.current = waitingForOpponent;
    const gsR = useRef(gs);
    gsR.current = gs;
    const oppBzRef = useRef(null);
    const oppShieldRef = useRef(null);
    const actionsRef = useRef({});
    const initializedRef = useRef(false);
    const disconnectTimerRef = useRef(null);
    const hasPromptedDisconnect = useRef(false);

    const net = useNetwork(conn);

    // Persistence
    const opponentId = conn?.peer;

    useEffect(() => {
        setIsOpponentConnected(net.isOpen);
        if (!net.isOpen && !gs.gameOver && initializedRef.current) {
            if (!disconnectTimerRef.current && !hasPromptedDisconnect.current) {
                disconnectTimerRef.current = setTimeout(() => {
                    setPendingDecision({
                        card: { name: "System", image_file: "bg.png" },
                        message: "Opponent has been disconnected for 10 seconds. Would you like to leave the game and delete saved data?",
                        onYes: () => {
                            localStorage.removeItem(`dm_gs_${opponentId}`);
                            localStorage.removeItem(`dm_logs_${opponentId}`);
                            localStorage.removeItem("dm_active_game");
                            window.location.reload();
                        },
                        onNo: () => {
                            hasPromptedDisconnect.current = true;
                        }
                    });
                }, 10000);
            }
        } else {
            if (disconnectTimerRef.current) {
                clearTimeout(disconnectTimerRef.current);
                disconnectTimerRef.current = null;
            }
            if (net.isOpen) {
                hasPromptedDisconnect.current = false;
            }
        }
    }, [net.isOpen, gs.gameOver, opponentId]);
    useEffect(() => {
        if (!opponentId || gs.gameOver || !initializedRef.current) return;
        localStorage.setItem(`dm_gs_${opponentId}`, JSON.stringify(gs));
    }, [gs, opponentId]);

    useEffect(() => {
        if (!opponentId || !initializedRef.current) return;
        localStorage.setItem(`dm_logs_${opponentId}`, JSON.stringify(logs));
    }, [logs, opponentId]);

    const toast = useCallback((msg, type = "info") => {
        const id = Date.now() + Math.random();
        setToasts(p => [...p, { id, message: msg, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2200);
    }, []);

    const draw = useCallback(() => {
        setGs(p => {
            if (p.deck.length === 0) { 
                net.send("ACTION", { action: "DECK_OUT" }); 
                return { ...p, gameOver: 'lose' }; 
            }
            const d = [...p.deck]; const c = d.pop();
            return { ...p, hand: [...p.hand, c], deck: d };
        });
    }, [net]);

    const cancelTargeting = useCallback(() => setTargeting(null), []);

    const onTargetClick = useCallback((target) => {
        if (!targeting) return;
        const newSelected = [...(targeting.selected || []), target.instanceId];
        if (newSelected.length >= targeting.count) {
            const currentOnComplete = targeting.onComplete;
            setTargeting(null);
            currentOnComplete(newSelected);
        } else {
            setTargeting({ ...targeting, selected: newSelected });
        }
    }, [targeting]);

    const hover = useCallback(c => { if (prevT.current) clearTimeout(prevT.current); prevT.current = setTimeout(() => setPreview(c), 300); }, []);
    const unhover = useCallback(() => { if (prevT.current) clearTimeout(prevT.current); prevT.current = null; setPreview(null); }, []);

    const isLocked = !gs.turn || gs.gameOver || waitingForOpponent || !!waitingForBlock || !!searchingDeck || !!targeting || !!pendingDestruction || !!pendingDecision || !!trigger;

    const addLog = useCallback((text, type = 'info', isOpponent = false, card = null) => {
        const entry = {
            id: Date.now() + Math.random(),
            text,
            type,
            isOpponent,
            card: card ? { name: card.name, image_file: card.image_file, set_id: card.set_id, text: card.text, type: card.type, power: card.power, cost: card.cost, civilizations: card.civilizations, subtypes: card.subtypes } : null,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setLogs(p => [entry, ...p]);
        if (!isOpponent) {
            net.send("ACTION", { action: "LOG_ENTRY", details: entry });
        }
    }, [net]);

    const triggerTapAbility = useCallback((card) => {
        if (!gsR.current.turn) return;
        if (card.summonedThisTurn && !CardEngine.parseAbilities(card, gsR.current.battleZone, gsR.current.mana).speedAttacker) {
            toast("Summoning sickness!", "error");
            return;
        }
        if (card.isTapped) {
            toast("Already tapped!", "error");
            return;
        }

        setGs(p => ({
            ...p,
            battleZone: p.battleZone.map(c => c.instanceId === card.instanceId ? { ...c, isTapped: true } : c)
        }));

        addLog(`${card.name} uses its Tap ability!`, 'effect', false, card);
        triggerEffect("TAP_EFFECTS", card);
        net.send("ACTION", { action: "TAP_TARGET", details: { targetId: card.instanceId } });
    }, [net, toast, triggerEffect, addLog]);

    const triggerEffect = useCallback((type, card, extraParams = {}) => {
        const map = window.GAME_EFFECTS[type];
        if (!map) return;
        
        // Original card effect
        const fx = map[card.name];
        const params = {
            card,
            draw: actionsRef.current.draw,
            setGs, toast, net, setSearchingDeck, setTargeting, gsR,
            play: actionsRef.current.play,
            attack: actionsRef.current.attack,
            CardEngine,
            addLog,
            askMay: ({ message, onYes, onNo }) => {
                setPendingDecision({ card, message, onYes, onNo: onNo || (() => {}) });
            },
            ...extraParams
        };
        if (fx) setTimeout(() => fx(params), 200);

        // Survivor shared triggers
        if (card.subtypes?.includes('Survivor')) {
            gsR.current.battleZone.forEach(other => {
                if (other.instanceId === card.instanceId) return;
                if (!other.subtypes?.includes('Survivor')) return;
                const survivorFx = map[other.name];
                // Only share if it's a Survivor ability
                if (survivorFx && other.text?.includes('Survivor')) {
                    setTimeout(() => survivorFx(params), 300);
                }
            });
        }
    }, [net, toast, addLog]);

    const triggerGlobalEffect = useCallback((type, eventData) => {
        const map = GLOBAL_TRIGGERS[type];
        if (!map) return;
        gsR.current.battleZone.forEach(c => {
            const fx = map[c.name];
            if (fx && c.instanceId !== eventData.card.instanceId) {
                const params = {
                    card: c,
                    eventData,
                    draw: actionsRef.current.draw,
                    setGs, toast, net, setSearchingDeck, setTargeting, gsR,
                    play: actionsRef.current.play,
                    attack: actionsRef.current.attack,
                    CardEngine,
                    addLog,
                    askMay: ({ message, onYes, onNo }) => {
                        setPendingDecision({ card: c, message, onYes, onNo: onNo || (() => {}) });
                    }
                };
                fx(params);
            }
        });
    }, [net, toast, addLog]);

    const finishDestruction = useCallback((card, destinationOverride = null) => {
        setGs(p => {
            const target = p.battleZone.find(c => c.instanceId === card.instanceId);
            if (!target) return p;

            const dest = destinationOverride || CardEngine.onDestroyed(target, p.battleZone);
            const filtered = p.battleZone.filter(c => c.instanceId !== card.instanceId);

            if (dest === 'mana') {
                return { ...p, battleZone: filtered, mana: [...p.mana, { ...target, isTapped: false }] };
            }
            if (dest === 'shield') {
                return { ...p, battleZone: filtered, shields: [...p.shields, target] };
            }
            if (dest === 'hand') {
                // DM-05 Replacements
                const abs = CardEngine.parseAbilities(card, p.battleZone, p.mana);
                if (abs.survivorManaReplacement) {
                    toast(`${card.name} Survivor: Moved to mana!`);
                    return { ...p, battleZone: filtered, mana: [...p.mana, { ...target, isTapped: false }] };
                }
                if (abs.survivorHandReplacement) {
                    toast(`${card.name} Survivor: Returned to hand!`);
                    return { ...p, battleZone: filtered, hand: [...p.hand, target] };
                }
                if (card.name === "Ambush Scorpion") {
                    const other = p.mana.find(c => c.name === "Ambush Scorpion");
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
                }
                if (card.name === "Jewel Spider") {
                    if (p.shields.length) {
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
                if (card.subtypes?.some(s => s.toLowerCase().includes('armored dragon'))) {
                    const kip = p.battleZone.find(c => c.name === "Kip Chippotto");
                    if (kip) {
                        askMay({
                            message: `Kip Chippotto: Destroy Kip instead of ${card.name}?`,
                            onYes: () => {
                                finishDestruction(kip);
                            }
                        });
                    }
                }
                return { ...p, battleZone: filtered, hand: [...p.hand, target] };
            }
            return { ...p, battleZone: filtered, graveyard: [...p.graveyard, target] };
        });
        triggerGlobalEffect("ON_DESTROY", { card });
        net.send("ACTION", { action: "FINISH_DESTRUCTION_SYNC", details: { instanceId: card.instanceId, dest: destinationOverride || CardEngine.onDestroyed(card, gsR.current.battleZone) } });
    }, [net, triggerGlobalEffect]);

    useEffect(() => {
        const isMakingDecision = !!targeting || !!blockingRequest || !!trigger || !!searchingDeck || !!pendingDestruction || !!pendingDecision;
        net.send("ACTION", { action: "WAIT_OPPONENT", details: { waiting: isMakingDecision } });
    }, [!!targeting, !!blockingRequest, !!trigger, !!searchingDeck, !!pendingDestruction, !!pendingDecision]);

    const broadcast = useCallback(s => {
        net.sync({
            handCount: s.hand.length,
            mana: s.mana.map(c => ({ instanceId: c.instanceId, isTapped: !!c.isTapped, skipNextUntap: !!c.skipNextUntap, civilizations: c.civilizations, name: c.name, image_file: c.image_file, set_id: c.set_id })),
            battleZone: s.battleZone.map(c => ({ instanceId: c.instanceId, name: c.name, power: c.power, cost: c.cost, civilizations: c.civilizations, image_file: c.image_file, set_id: c.set_id, isTapped: !!c.isTapped, skipNextUntap: !!c.skipNextUntap, chaosStrikeTarget: !!c.chaosStrikeTarget, text: c.text, type: c.type, subtypes: c.subtypes, powerBonus: c.powerBonus || 0, tempDoubleBreaker: c.tempDoubleBreaker })),
            shields: s.shields.map(c => ({ instanceId: c.instanceId, name: c.name, image_file: c.image_file, set_id: c.set_id, text: c.text, type: c.type, subtypes: c.subtypes })),
            graveyard: s.graveyard.map(c => ({ instanceId: c.instanceId, name: c.name, civilizations: c.civilizations, image_file: c.image_file, set_id: c.set_id })),
        });
    }, [net]);

    useEffect(() => { broadcast(gs); }, [gs.hand.length, gs.mana, gs.battleZone, gs.shields.length, gs.graveyard.length, broadcast]);

    const play = useCallback((card, target, targetId) => {
        if (isLocked) return;
        
        if (CardEngine.isSpellRestricted(card, gsR.current.battleZone, gsR.current.opponent.battleZone)) {
            toast("Alcadeias prevents you from casting this spell!", "error");
            return;
        }

        let actualCost = card.cost;
        const isSpell = CardEngine.isSpell(card);
        const avail = gsR.current.mana.filter(m => !m.isTapped).length;

        if (target === "mana") {
            setGs(p => ({ ...p, hand: p.hand.filter(c => c.instanceId !== card.instanceId), mana: [...p.mana, { ...card, isTapped: false }], hasPlacedMana: true }));
            addLog(`Placed ${card.name} in mana zone`, 'mana', false, card);
            return;
        }

        actualCost = CardEngine.calculateCost(card, gsR.current.battleZone);
        if (avail < actualCost) { toast(`Not enough mana! (Need ${actualCost})`, "error"); return; }

        setGs(p => {
            const newMana = [...p.mana];
            let tapped = 0;
            for (let i = 0; i < newMana.length && tapped < actualCost; i++) {
                if (!newMana[i].isTapped) { newMana[i].isTapped = true; tapped++; }
            }
            const newHand = p.hand.filter(c => c.instanceId !== card.instanceId);
            if (target === "evolution") {
                const filteredBz = p.battleZone.filter(c => c.instanceId !== targetId);
                return { ...p, hand: newHand, mana: newMana, battleZone: [...filteredBz, { ...card, summonedThisTurn: false, isTapped: false, powerBonus: 0 }] };
            }
            if (isSpell) return { ...p, hand: newHand, mana: newMana, graveyard: [...p.graveyard, card] };
            return { ...p, hand: newHand, mana: newMana, battleZone: [...p.battleZone, { ...card, summonedThisTurn: true, isTapped: false, powerBonus: 0 }] };
        });

        if (isSpell) {
            addLog(`Cast ${card.name}`, 'spell', false, card);
            triggerEffect("SPELL_EFFECTS", card);
        } else {
            addLog(`Summoned ${card.name}`, 'summon', false, card);
            triggerEffect("ETB_EFFECTS", card);
            triggerGlobalEffect("ON_SUMMON", { card });
            net.send("ACTION", { action: "GLOBAL_EVENT", details: { type: "ON_SUMMON", card } });
        }
    }, [isLocked, triggerEffect, triggerGlobalEffect, addLog, toast]);

    const resolveAttack = useCallback((atk, tgt, tid, isBlocked) => {
        if (tgt === "SHIELD") {
            addLog(`${atk.name} attacked shields`, 'attack', false, atk);
            if (!CardEngine.canAttackPlayer(atk, gsR.current.battleZone, gsR.current.mana)) { toast("Can't attack players!", "error"); return; }
            const shieldsToBreak = CardEngine.shieldsToBreak(atk, gsR.current.battleZone);
            const oppShields = gsR.current.opponent.shields;
            const oppShieldCount = Array.isArray(oppShields) ? oppShields.length : oppShields;
            
            if (oppShieldCount === 0) {
                toast("Direct attack!");
                net.send("ACTION", { action: "DIRECT_KILL" });
                setGs(p => ({ ...p, gameOver: 'win' }));
            } else {
                const actualBreaks = Math.min(shieldsToBreak, oppShieldCount);
                for (let i = 0; i < actualBreaks; i++) {
                    setTimeout(() => { 
                        if (abs.incinerate) {
                            net.send("ACTION", { action: "SHIELD_INCINERATED" });
                            toast(`${atk.name}: Shield incinerated!`);
                        } else {
                            net.send("ACTION", { action: "SHIELD_BROKEN" }); 
                        }
                        setGs(p => ({ ...p, shieldsBrokenThisTurn: p.shieldsBrokenThisTurn + 1 }));
                        const absActual = CardEngine.parseAbilities(atk, gsR.current.battleZone, gsR.current.mana);
                        if (absActual.drawOnShieldBreak) { draw(); toast(`${atk.name} Survivor: Draw a card!`); }
                        if (absActual.discardOnShieldBreak) { net.send("ACTION", { action: "DISCARD_RANDOM" }); toast(`${atk.name} Survivor: Opponent discards a card!`); }
                        if (gsR.current.turnEffects.miracleQuest) {
                            setTimeout(() => { draw(); draw(); }, 200);
                            toast("Miracle Quest: Draw 2 cards!");
                        }
                    }, i * 400);
                }
                toast(`Breaking ${actualBreaks} shield${actualBreaks > 1 ? 's' : ''}!`);
            }

            if (atk.name === "Marrow Ooze, the Twister") {
                setTimeout(() => {
                    setGs(p => {
                        const target = p.battleZone.find(x => x.instanceId === atk.instanceId);
                        if (!target) return p;
                        return { ...p, battleZone: p.battleZone.filter(x => x.instanceId !== atk.instanceId), graveyard: [...p.graveyard, target] };
                    });
                    toast("Marrow Ooze destroyed after attack!");
                }, 500);
            }
        } else {
            const opp = gsR.current.opponent.battleZone.find(c => c.instanceId === tid);
            if (!opp) return;
            addLog(`${atk.name} attacked ${opp.name}`, 'attack', false, atk);

            const s = gsR.current;
            let atkPower = CardEngine.getPotentialPower(atk, s.battleZone, s.graveyard, s.mana, s.shields) + (atk.powerBonus || 0);
            if (s.turnEffects.swordOfMalevolentDeath) {
                const darkMana = s.mana.filter(m => m.civilizations?.includes('Darkness')).length;
                atkPower += (darkMana * 1000);
            }
            const defPower = CardEngine.getCurrentPower(opp, s.opponent.battleZone, s.opponent.mana, s.opponent.shields) + (opp.powerBonus || 0);

            const win = atkPower > defPower;
            const lose = atkPower < defPower;
            const tie = atkPower === defPower;
            const attackerHasSlayer = CardEngine.hasSlayer(atk) || (isBlocked && gsR.current.turnEffects.creepingPlague);
            const defenderHasSlayer = CardEngine.hasSlayer(opp);

            const atkAbs = CardEngine.parseAbilities(atk, s.battleZone, s.mana);
            const defAbs = CardEngine.parseAbilities(opp, s.opponent.battleZone, s.opponent.mana);

            if (win || tie || attackerHasSlayer) {
                addLog(`${opp.name} was destroyed`, 'battle', false, opp);
                net.send("ACTION", { action: "CREATURE_DESTROYED", details: { targetId: tid } });
                if (attackerHasSlayer && !win && !tie) toast("Slayer: Enemy destroyed!", "error");
            }

            if (lose || tie || defenderHasSlayer) {
                addLog(`${atk.name} was destroyed`, 'battle', false, atk);
                setTimeout(() => {
                    const target = gsR.current.battleZone.find(x => x.instanceId === atk.instanceId);
                    if (!target) return;
                    triggerEffect("DESTROY_EFFECTS", target);
                    const opt = CardEngine.getOptionalReplacement(target, gsR.current.battleZone);
                    if (opt) {
                        setPendingDestruction({ card: target, replacement: opt });
                    } else {
                        finishDestruction(target);
                    }
                    if (defenderHasSlayer && !lose && !tie) toast("Slayer: Attacker destroyed!", "error");
                }, 100);
            }

            // Bone Spider / Destroy on Win effect
            if (win && !defenderHasSlayer && atkAbs.destroyOnWin) {
                addLog(`${atk.name} won the battle but is destroyed by its effect`, 'effect', false, atk);
                setTimeout(() => {
                    const target = gsR.current.battleZone.find(x => x.instanceId === atk.instanceId);
                    if (target) finishDestruction(target);
                }, 200);
            }

            if (lose && !attackerHasSlayer && defAbs.destroyOnWin) {
                addLog(`${opp.name} won the battle but is destroyed by its effect`, 'effect', true, opp);
                net.send("ACTION", { action: "CREATURE_DESTROYED", details: { targetId: tid } });
            }

            if (isBlocked && atk.name === "Avalanche Giant") {
                setTimeout(() => {
                    net.send("ACTION", { action: "SHIELD_BROKEN" });
                    setGs(p => ({ ...p, shieldsBrokenThisTurn: p.shieldsBrokenThisTurn + 1 }));
                }, 500);
                toast("Avalanche Giant: Shield broken because blocked!");
            }

            if (isBlocked && (opp.name === "Spiral Grass" || defAbs.untapAfterBattle)) {
                setTimeout(() => net.send("ACTION", { action: "UNTAP_TARGET", details: { targetId: tid } }), 600);
                if (defAbs.untapAfterBattle) toast(`${opp.name}: Untapped after battle!`);
            }

            if (tie) toast("Tie! Both destroyed!", "error");
            else if (win) {
                if (atkAbs.noBattleOnBlock && isBlocked) {
                    toast(`${atk.name}: No battle happened!`);
                } else {
                    toast(`${atk.name} wins battle!`);
                }
            }
            else if (lose) {
                if (defAbs.noBattleOnBlock && isBlocked) {
                    toast(`${opp.name}: No battle happened!`);
                } else {
                    toast(`${atk.name} loses battle!`, "error");
                }
            }
        }
    }, [net, toast, triggerEffect, addLog, finishDestruction]);

    const attack = useCallback((atk, tgt, tid) => {
        if (isLocked) return;
        if (atk.summonedThisTurn) { toast("Summoning sickness!", "error"); return; }
        if (atk.isTapped) { toast("Already tapped", "error"); return; }
        if (!CardEngine.canAttack(atk, gsR.current.battleZone, gsR.current.opponent.battleZone, gsR.current.mana)) { toast("This creature can't attack!", "error"); return; }

        addLog(`${atk.name} is attacking!`, 'attack', false, atk);
        setGs(p => ({ ...p, attackStarted: true, battleZone: p.battleZone.map(c => c.instanceId === atk.instanceId ? { ...c, isTapped: true, attackedThisTurn: true } : c) }));

        triggerEffect("ATTACK_TRIGGERS", atk);
        net.send("ACTION", { action: "ATTACK_DECLARED", details: { attacker: atk, targetType: tgt, targetId: tid } });
        setWaitingForBlock({ atk, tgt, tid });
    }, [toast, net, isLocked, triggerEffect, addLog]);

    const endTurn = useCallback(() => {
        if (isLocked) return;
        const currentGs = gsR.current;
        const mandatoryAtk = currentGs.battleZone.find(c => {
            const abs = CardEngine.parseAbilities(c, currentGs.battleZone, currentGs.mana);
            const canAtk = CardEngine.canAttack(c, currentGs.battleZone, currentGs.opponent.battleZone, currentGs.mana);
            return abs.mustAttack && !c.isTapped && !c.summonedThisTurn && canAtk;
        });

        if (mandatoryAtk) { toast(`${mandatoryAtk.name} must attack!`, "error"); return; }

        const returnCards = currentGs.battleZone.filter(c => {
            const text = (c.text || '').toLowerCase();
            return text.includes("at the end of your turn, return this creature to your hand");
        });

        setGs(p => ({
            ...p,
            turn: false,
            hasPlacedMana: false,
            attackStarted: false,
            battleZone: p.battleZone.filter(c => !returnCards.some(r => r.instanceId === c.instanceId)).map(c => {
                let nc = { ...c, chaosStrikeTarget: false };
                const abs = CardEngine.parseAbilities(c, p.battleZone, p.mana);
                if (abs.untapAtEnd || abs.untapAllAtEnd) nc.isTapped = false;
                nc.summonedThisTurn = false;
                nc.powerBonus = 0;
                nc.tempDoubleBreaker = false;
                nc.cantBeBlockedThisTurn = false;
                nc.canAttackPlayersOverride = false;
                nc.canAttackUntappedThisTurn = false;
                nc.tempBlocker = false;
                nc.tempSlayer = false;
                if (p.turnEffects.whiskingWhirlwind && nc.attackedThisTurn) nc.isTapped = false;
                nc.attackedThisTurn = false;
                return nc;
            }),
            hand: [...p.hand, ...returnCards],
            
            turnEffects: { creepingPlague: false, swordOfMalevolentDeath: false, whiskingWhirlwind: false, miracleQuest: false, brutalCharge: false },
            shieldsBrokenThisTurn: 0
        }));
        
        if (currentGs.turnEffects.brutalCharge && currentGs.shieldsBrokenThisTurn > 0) {
            const map = window.GAME_EFFECTS.SPELL_EFFECTS;
            if (map["Brutal Charge Trigger"]) map["Brutal Charge Trigger"]({ gsR, setGs, setSearchingDeck, toast, CardEngine });
        }
        net.send("ACTION", { action: "END_TURN" });
        toast("Your turn ended");
    }, [isLocked, net, toast]);

    useEffect(() => {
        net.on("SYNC", p => {
            setGs(s => ({
                ...s,
                opponent: {
                    ...s.opponent,
                    handCount: p.handCount,
                    mana: p.mana,
                    battleZone: p.battleZone,
                    shields: p.shields,
                    graveyard: p.graveyard
                }
            }));
        });

        net.on("ACTION", p => {
            const { action, details } = p;
            if (action === "LOG_ENTRY") {
                setLogs(p => [{ ...details, isOpponent: true }, ...p]);
            }
            if (action === "MOVE_TO_DECK_TOP") {
                setGs(p => {
                    const target = p.battleZone.find(c => c.instanceId === details.targetId);
                    if (!target) return p;
                    return {
                        ...p,
                        battleZone: p.battleZone.filter(c => c.instanceId !== details.targetId),
                        deck: [...p.deck, target]
                    };
                });
                toast("Creature returned to top of deck!", "error");
            }
            if (action === "FREEZE_TARGET") {
                setGs(p => ({
                    ...p,
                    battleZone: p.battleZone.map(c => c.instanceId === details.targetId ? { ...c, isTapped: true, skipNextUntap: true } : c)
                }));
                toast("Creature frozen!", "error");
            }
            if (action === "TAP_TARGET") {
                setGs(p => ({
                    ...p,
                    battleZone: p.battleZone.map(c => c.instanceId === details.targetId ? { ...c, isTapped: true } : c)
                }));
            }
            if (action === "UNTAP_TARGET") {
                setGs(p => ({
                    ...p,
                    battleZone: p.battleZone.map(c => c.instanceId === details.targetId ? { ...c, isTapped: false } : c)
                }));
            }
            if (action === "SHIELD_INCINERATED") {
                addLog("One of your shields was incinerated!", 'shield', true);
                setGs(prev => {
                    const ns = [...prev.shields];
                    if (!ns.length) return { ...prev, gameOver: 'lose' };
                    const c = ns.pop();
                    return { ...prev, shields: ns, graveyard: [...prev.graveyard, c] };
                });
                toast("Shield incinerated!", "error");
            }
            if (action === "CRISIS_BOULDER") {
                setPendingDecision({
                    card: { name: "Crisis Boulder", image_file: "crisis_boulder.png" },
                    message: "Crisis Boulder: Choose a card to destroy",
                    onYes: () => {
                        // Logic for choosing creature or mana...
                        // For simplicity in this turn, I'll just say "you must choose"
                        // But I should really trigger a targeting request.
                        setTargeting({
                            message: "Select a creature or mana to destroy",
                            count: 1,
                            validTargets: [...gsR.current.battleZone.map(x=>x.instanceId), ...gsR.current.mana.map(x=>x.instanceId)],
                            onComplete: (ids) => {
                                const id = ids[0];
                                const isCreature = gsR.current.battleZone.some(x => x.instanceId === id);
                                if (isCreature) {
                                    finishDestruction(gsR.current.battleZone.find(x => x.instanceId === id));
                                } else {
                                    setGs(p => ({ ...p, mana: p.mana.filter(x => x.instanceId !== id), graveyard: [...p.graveyard, p.mana.find(x => x.instanceId === id)] }));
                                }
                            }
                        });
                    }
                });
            }
            if (action === "END_TURN") {
                setGs(p => ({
                    ...p,
                    turn: true,
                    battleZone: p.battleZone.map(c => ({ ...c, isTapped: false, tappedByOpponent: false, skipNextUntap: false })),
                    mana: p.mana.map(m => ({ ...m, isTapped: false }))
                }));
                toast("Your Turn!", "success");
                // Rule: Draw at start of turn
                setTimeout(() => actionsRef.current.draw(), 800);
            }
            if (action === "SUMMON_CREATURE" || action === "CAST_SPELL") {
                setGs(p => ({
                    ...p,
                    battleZone: p.battleZone.map(c => {
                        if (c.name === "Aqua Rider") return { ...c, tempBlocker: true };
                        return c;
                    })
                }));
            }
            if (action === "ATTACK_DECLARED") {
                const { attacker, targetType, targetId } = details;
                const blockers = gsR.current.battleZone.filter(c => {
                    const abs = CardEngine.parseAbilities(c, gsR.current.battleZone, gsR.current.mana);
                    return abs.blocker && !c.isTapped && CardEngine.canBeBlocked(attacker, c, { battleZone: gsR.current.opponent.battleZone, manaZone: gsR.current.opponent.mana }, { battleZone: gsR.current.battleZone, manaZone: gsR.current.mana });
                });

                if (blockers.length > 0) {
                    setBlockingRequest({ attacker, targetType, targetId });
                    setTargeting({
                        message: "Choose a blocker or pass",
                        count: 1,
                        validTargets: blockers.map(c => c.instanceId),
                        onComplete: (ids) => {
                            net.send("ACTION", { action: "BLOCK_DECISION", details: { blockerId: ids[0] } });
                            setBlockingRequest(null);
                        }
                    });
                } else {
                    net.send("ACTION", { action: "BLOCK_DECISION", details: { blockerId: null } });
                }
            }
            if (action === "BLOCK_DECISION") {
                const { blockerId } = details;
                const wfb = wfbR.current;
                setWaitingForBlock(null);
                if (blockerId) {
                    const blocker = gsR.current.opponent.battleZone.find(x => x.instanceId === blockerId);
                    addLog(`${blocker ? blocker.name : 'A creature'} blocked the attack!`, 'battle', true, blocker);
                    resolveAttack(wfb.atk, "CREATURE", blockerId, true);
                } else {
                    resolveAttack(wfb.atk, wfb.tgt, wfb.tid, false);
                }
            }
            if (action === "WAIT_OPPONENT") {
                setWaitingForOpponent(details.waiting);
            }
            if (action === "REVEAL_CARD") {
                toast(`${details.card.name} revealed by opponent!`);
                setSearchingDeck({
                    message: "OPPONENT REVEALED:",
                    count: 0,
                    filter: () => false,
                    isReveal: true,
                    card: details.card,
                    onComplete: () => {}
                });
                setTimeout(() => setSearchingDeck(null), 3500);
            }
            if (action === "SHIELD_BROKEN") {
                addLog("One of your shields was broken", 'shield');
                setGs(prev => {
                    const ns = [...prev.shields];
                    if (!ns.length) return { ...prev, gameOver: 'lose' };
                    const c = ns.pop();
                    if (c.text?.toLowerCase().includes("shield trigger")) {
                        const hasGigabolver = [...gsR.current.battleZone, ...gsR.current.opponent.battleZone].some(x => x.name === "Gigabolver");
                        const isDarkness = c.civilizations?.includes('Darkness');
                        if (hasGigabolver && isDarkness) {
                            addLog(`Gigabolver prevented shield trigger for ${c.name}`, 'effect');
                            setTimeout(() => setGs(s => ({ ...s, hand: [...s.hand, c] })), 800);
                        } else {
                            setTrigger(c);
                        }
                    }
                    else setTimeout(() => setGs(s => ({ ...s, hand: [...s.hand, c] })), 800);
                    return { ...prev, shields: ns };
                });
                toast("Shield broken!", "error");
            }
            if (action === "DECK_OUT" || action === "DIRECT_KILL") { setGs(p => ({ ...p, gameOver: 'win' })); toast("Victory!"); }
            if (action === "CREATURE_DESTROYED") {
                const t = gsR.current.battleZone.find(c => c.instanceId === details.targetId);
                if (t) addLog(`Opponent destroyed your ${t.name}`, 'battle');
                if (t) {
                    triggerEffect("DESTROY_EFFECTS", t);
                    const opt = CardEngine.getOptionalReplacement(t, gsR.current.battleZone);
                    if (opt) {
                        setPendingDestruction({ card: t, replacement: opt });
                    } else {
                        finishDestruction(t);
                    }
                }
                toast("Creature destroyed!", "error");
            }
            if (action === "BOUNCE") { setGs(p => { const count = details?.count || 1; const toReturn = p.battleZone.slice(-count); return { ...p, battleZone: p.battleZone.slice(0, -count), hand: [...p.hand, ...toReturn] }; }); toast("Creatures bounced!", "error"); }
            if (action === "BOUNCE_TARGET") {
                setGs(p => {
                    const t = p.battleZone.find(c => c.instanceId === details.targetId);
                    if (!t) return p;
                    return { ...p, battleZone: p.battleZone.filter(c => c.instanceId !== details.targetId), hand: [...p.hand, t] };
                });
                toast("Creature bounced!", "error");
            }
            if (action === "BOUNCE_WEAK") { setGs(p => { const max = details?.maxPower || 2000; const toReturn = p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= max); return { ...p, battleZone: p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) > max), hand: [...p.hand, ...toReturn] }; }); toast("Weak creatures bounced!", "error"); }
            if (action === "TAP_ALL") { setGs(p => ({ ...p, battleZone: p.battleZone.map(c => ({ ...c, isTapped: true, tappedByOpponent: true })) })); toast("All creatures tapped!", "error"); }
            if (action === "TAP_CREATURE") {
                setGs(p => { const count = details?.count || 1; let tapped = 0; return { ...p, battleZone: p.battleZone.map(c => { if (!c.isTapped && tapped < count) { tapped++; return { ...c, isTapped: true, skipNextUntap: true }; } return c; }) }; });
                toast("Creature tapped!", "error");
            }
            if (action === "TAP_TARGET") {
                setGs(p => ({ ...p, battleZone: p.battleZone.map(c => c.instanceId === details.targetId ? { ...c, isTapped: true, tappedByOpponent: true } : c) }));
                toast("Creature tapped!", "error");
            }
            if (action === "UNTAP_TARGET") {
                setGs(p => ({ ...p, battleZone: p.battleZone.map(c => c.instanceId === details.targetId ? { ...c, isTapped: false, skipNextUntap: false } : c) }));
                toast("Creature untapped!", "info");
            }
            if (action === "DESTROY_TARGET") {
                const target = gsR.current.battleZone.find(c => c.instanceId === details.targetId);
                if (target) addLog(`Opponent destroyed your ${target.name}`, 'battle');
                if (target) {
                    triggerEffect("DESTROY_EFFECTS", target);
                    const opt = CardEngine.getOptionalReplacement(target, gsR.current.battleZone);
                    if (opt) {
                        setPendingDestruction({ card: target, replacement: opt });
                    } else {
                        finishDestruction(target);
                    }
                }
                toast("Creature destroyed!", "error");
            }
            if (action === "FINISH_DESTRUCTION_SYNC") {
                setGs(p => {
                    const target = p.battleZone.find(c => c.instanceId === details.instanceId);
                    if (!target) return p;
                    const dest = details.dest;
                    const filtered = p.battleZone.filter(c => c.instanceId !== details.instanceId);
                    if (dest === 'mana') return { ...p, battleZone: filtered, mana: [...p.mana, { ...target, isTapped: false }] };
                    if (dest === 'shield') return { ...p, battleZone: filtered, shields: [...p.shields, target] };
                    if (dest === 'hand') return { ...p, battleZone: filtered, hand: [...p.hand, target] };
                    return { ...p, battleZone: filtered, graveyard: [...p.graveyard, target] };
                });
            }
            if (action === "DESTROY_WEAK") {
                setGs(p => {
                    const max = details?.maxPower || 2000;
                    const victims = p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= max);
                    victims.forEach(v => triggerEffect("DESTROY_EFFECTS", v.name));
                    const survivors = p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) > max);
                    const toGrave=[]; const toMana=[]; const toHand=[];
                    victims.forEach(v => { const dest = CardEngine.onDestroyed(v); if (dest==='mana') toMana.push({...v,isTapped:false}); else if (dest==='hand') toHand.push(v); else toGrave.push(v); });
                    return { ...p, battleZone: survivors, graveyard: [...p.graveyard,...toGrave], mana: [...p.mana,...toMana], hand: [...p.hand,...toHand] };
                });
                toast("Weak creature destroyed!", "error");
            }
            if (action === "DESTROY_CHOICE") {
                setGs(p => { if (!p.battleZone.length) return p; const sorted = [...p.battleZone].sort((a, b) => CardEngine.getCurrentPower(b, p.battleZone, p.mana) - CardEngine.getCurrentPower(a, p.battleZone, p.mana)); const target = sorted[0]; const dest = CardEngine.onDestroyed(target); const filtered = p.battleZone.filter(c => c.instanceId !== target.instanceId); if (dest === 'mana') return { ...p, battleZone: filtered, mana: [...p.mana, { ...target, isTapped: false }] }; if (dest === 'hand') return { ...p, battleZone: filtered, hand: [...p.hand, target] }; return { ...p, battleZone: filtered, graveyard: [...p.graveyard, target] }; });
                toast("Creature destroyed!", "error");
            }
            if (action === "DESTROY_UNTAPPED") {
                setGs(p => { const target = p.battleZone.find(c => !c.isTapped); if (!target) return p; const dest = CardEngine.onDestroyed(target); const filtered = p.battleZone.filter(c => c.instanceId !== target.instanceId); if (dest === 'mana') return { ...p, battleZone: filtered, mana: [...p.mana, { ...target, isTapped: false }] }; if (dest === 'hand') return { ...p, battleZone: filtered, hand: [...p.hand, target] }; return { ...p, battleZone: filtered, graveyard: [...p.graveyard, target] }; });
                toast("Untapped creature destroyed!", "error");
            }
            if (action === "DESTROY_ALL_WEAK") {
                setGs(p => {
                    const max = details?.maxPower || 3000;
                    const victims = p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= max);
                    victims.forEach(v => triggerEffect("DESTROY_EFFECTS", v.name));
                    const survivors = p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) > max);
                    const toGrave=[]; const toMana=[]; const toHand=[];
                    victims.forEach(v => { const dest = CardEngine.onDestroyed(v); if (dest==='mana') toMana.push({...v,isTapped:false}); else if (dest==='hand') toHand.push(v); else toGrave.push(v); });
                    return { ...p, battleZone: survivors, graveyard: [...p.graveyard,...toGrave], mana: [...p.mana,...toMana], hand: [...p.hand,...toHand] };
                });
                toast("Mass destruction!", "error");
            }
            if (action === "CREATURE_TO_MANA") {
                setGs(p => { if (!p.battleZone.length) return p; const sorted = [...p.battleZone].sort((a, b) => CardEngine.getCurrentPower(a, p.battleZone, p.mana) - CardEngine.getCurrentPower(b, p.battleZone, p.mana)); const target = sorted[0]; return { ...p, battleZone: p.battleZone.filter(c => c.instanceId !== target.instanceId), mana: [...p.mana, { ...target, isTapped: false }] }; });
                toast("Creature sent to mana!", "error");
            }
            if (action === "CREATURE_TO_MANA_TARGET") {
                setGs(p => {
                    const target = p.battleZone.find(c => c.instanceId === details.targetId);
                    if (!target) return p;
                    return { ...p, battleZone: p.battleZone.filter(c => c.instanceId !== details.targetId), mana: [...p.mana, { ...target, isTapped: false }] };
                });
                toast("Creature sent to mana!", "error");
            }
            if (action === "CREATURE_TO_MANA_CHOICE") {
                setTargeting({
                    message: "Select one of your creatures to send to mana",
                    count: 1,
                    validTargets: gsR.current.battleZone.map(c => c.instanceId),
                    onComplete: (selectedIds) => {
                        const id = selectedIds[0];
                        setGs(s => {
                            const target = s.battleZone.find(c => c.instanceId === id);
                            return { ...s, battleZone: s.battleZone.filter(c => c.instanceId !== id), mana: [...s.mana, { ...target, isTapped: false }] };
                        });
                        toast("Sent to mana zone!");
                    }
                });
            }
            if (action === "MANA_TO_HAND_CHOICE") {
                setSearchingDeck({
                    message: `Select ${details.count} of your mana to return to hand`,
                    customList: gsR.current.mana,
                    count: details.count,
                    exact: true,
                    onComplete: (selected) => {
                        const cards = Array.isArray(selected) ? selected : [selected];
                        const ids = cards.map(c => c.instanceId);
                        setGs(s => {
                            const targets = s.mana.filter(m => ids.includes(m.instanceId));
                            return { ...s, mana: s.mana.filter(m => !ids.includes(m.instanceId)), hand: [...s.hand, ...targets] };
                        });
                        toast("Mana returned to hand!");
                    }
                });
            }
            if (action === "DE_EVOLVE") {
                setGs(p => {
                    const target = p.battleZone.find(c => c.instanceId === details.targetId);
                    if (!target) return p;
                    return { ...p, battleZone: p.battleZone.filter(c => c.instanceId !== details.targetId), graveyard: [...p.graveyard, target] };
                });
                toast("Creature de-evolved!", "error");
            }
            if (action === "SHIELD_TO_MANA") {
                setGs(p => {
                    const ids = details.targetIds;
                    addLog(`Shields moved to mana`, 'shield');
                    const indices = ids.map(id => parseInt(id.split('-')[1]));
                    const targets = p.shields.filter((_, i) => indices.includes(i));
                    return { ...p, shields: p.shields.filter((_, i) => !indices.includes(i)), mana: [...p.mana, ...targets.map(c => ({...c, isTapped: false}))] };
                });
                toast("Shields moved to mana!", "error");
            }
            if (action === "PEEK_HAND_SHIELDS") {
                toast("Opponent is peeking at your hand and shields!");
                net.send("ACTION", {
                    action: "REVEAL_HAND_SHIELDS",
                    details: { hand: gsR.current.hand, shields: gsR.current.shields }
                });
            }
            if (action === "REVEAL_HAND_SHIELDS") {
                setGs(prev => ({
                    ...prev,
                    opponent: { ...prev.opponent, handCards: details.hand, shields: details.shields }
                }));
            }
            if (action === "FORCE_DISCARD_NON_FIRE_MANA") {
                const nonFire = gsR.current.mana.filter(m => !m.civilizations?.includes('Fire'));
                if (nonFire.length > 0) {
                    setSearchingDeck({
                        message: "Opponent's Quelos: Select a non-Fire mana to sacrifice",
                        customList: nonFire,
                        count: 1,
                        onComplete: (card) => {
                            setGs(prev => {
                                return { ...prev, mana: prev.mana.filter(m => m.instanceId !== card.instanceId), graveyard: [...prev.graveyard, card] };
                            });
                        }
                    });
                }
            }
            if (action === "DESTROY_MANA_CHOICE") {
                setSearchingDeck({
                    message: `Select ${details.count} of your mana to destroy`,
                    customList: gsR.current.mana,
                    count: details.count,
                    exact: true,
                    onComplete: (selected) => {
                        const cards = Array.isArray(selected) ? selected : [selected];
                        const ids = cards.map(c => c.instanceId);
                        setGs(s => {
                            const targets = s.mana.filter(m => ids.includes(m.instanceId));
                            return { ...s, mana: s.mana.filter(m => !ids.includes(m.instanceId)), graveyard: [...s.graveyard, ...targets] };
                        });
                        toast("Mana destroyed!");
                    }
                });
            }
            if (action === "FORCE_DESTROY_OWN") {
                setGs(p => { if (!p.battleZone.length) return p; const sorted = [...p.battleZone].sort((a, b) => CardEngine.getCurrentPower(a, p.battleZone, p.mana) - CardEngine.getCurrentPower(b, p.battleZone, p.mana)); const target = sorted[0]; const dest = CardEngine.onDestroyed(target); const filtered = p.battleZone.filter(c => c.instanceId !== target.instanceId); if (dest === 'mana') return { ...p, battleZone: filtered, mana: [...p.mana, { ...target, isTapped: false }] }; if (dest === 'hand') return { ...p, battleZone: filtered, hand: [...p.hand, target] }; return { ...p, battleZone: filtered, graveyard: [...p.graveyard, target] }; });
                toast("Forced to sacrifice!", "error");
            }
            if (action === "FORCE_DESTROY_OWN_CHOICE") {
                setTargeting({
                    message: "Select one of your creatures to destroy",
                    count: 1,
                    validTargets: gsR.current.battleZone.map(c => c.instanceId),
                    onComplete: (selectedIds) => {
                        const id = selectedIds[0];
                        setGs(s => {
                            const target = s.battleZone.find(c => c.instanceId === id);
                            const dest = CardEngine.onDestroyed(target);
                            const filtered = s.battleZone.filter(c => c.instanceId !== id);
                            if (dest === 'mana') return { ...s, battleZone: filtered, mana: [...s.mana, { ...target, isTapped: false }] };
                            if (dest === 'hand') return { ...s, battleZone: filtered, hand: [...s.hand, target] };
                            return { ...s, battleZone: filtered, graveyard: [...s.graveyard, target] };
                        });
                        toast("Sacrificed creature!");
                    }
                });
            }
            if (action === "DISCARD_RANDOM") {
                setGs(p => {
                    if (!p.hand.length) return p;
                    const idx = Math.floor(Math.random() * p.hand.length);
                    const card = p.hand[idx];
                    const abs = CardEngine.parseAbilities(card, p.battleZone, p.mana);
                    if (abs.discardReplacement && !gsR.current.turn) {
                        addLog(`${card.name} discarded: Summoned to battle zone!`, 'effect', false, card);
                        return { ...p, hand: p.hand.filter((_, i) => i !== idx), battleZone: [...p.battleZone, { ...card, summonedThisTurn: true }] };
                    }
                    return { ...p, hand: p.hand.filter((_, i) => i !== idx), graveyard: [...p.graveyard, card] };
                });
                toast("Discarded a card!", "error");
            }
            if (action === "POWER_REDUCE_ALL") {
                setGs(p => { const amount = details?.amount || 2000; const survivors = []; const dead = []; p.battleZone.forEach(c => { if (CardEngine.getCurrentPower(c, p.battleZone, p.mana) - amount <= 0) dead.push(c); else survivors.push(c); }); return { ...p, battleZone: survivors, graveyard: [...p.graveyard, ...dead] }; });
                toast("Power reduced!", "error");
            }
            if (action === "DESTROY_ALL_BLOCKERS") {
                setGs(p => {
                    const targets = p.battleZone.filter(c => CardEngine.parseAbilities(c, p.battleZone, p.mana).blocker);
                    return { ...p, battleZone: p.battleZone.filter(c => !CardEngine.parseAbilities(c, p.battleZone, p.mana).blocker), graveyard: [...p.graveyard, ...targets] };
                });
                toast("Blockers annihilated!", "error");
            }
            if (action === "BOUNCE_ALL_BLOCKERS") {
                setGs(p => {
                    const targets = p.battleZone.filter(c => CardEngine.parseAbilities(c, p.battleZone, p.mana).blocker);
                    return { ...p, battleZone: p.battleZone.filter(c => !CardEngine.parseAbilities(c, p.battleZone, p.mana).blocker), hand: [...p.hand, ...targets] };
                });
                toast("All blockers bounced!", "error");
            }
            if (action === "DISCARD_ALL") {
                setGs(p => ({ ...p, hand: [], graveyard: [...p.graveyard, ...p.hand] }));
                toast("Lost Soul: Your whole hand was discarded!", "error");
            }
            if (action === "DESTROY_MANA") {
                setGs(p => {
                    const t = p.mana.find(m => m.instanceId === details.targetId);
                    if (!t) return p;
                    return { ...p, mana: p.mana.filter(m => m.instanceId !== details.targetId), graveyard: [...p.graveyard, t] };
                });
                toast("Mana destroyed!", "error");
            }
            if (action === "MANA_TO_HAND") {
                setGs(p => {
                    const count = details?.count || 1;
                    const toReturn = p.mana.slice(-count);
                    return { ...p, mana: p.mana.slice(0, -count), hand: [...p.hand, ...toReturn] };
                });
                toast("Mana returned to hand!", "error");
            }
            if (action === "GRAVE_TO_SHIELD") {
                setGs(p => ({ ...p, shields: [...p.shields, { name: "Mystery Shield", isFaceDown: true, image_file: "bg.png" }] }));
                toast("Opponent put a card into shields!", "error");
            }
            if (action === "GLOBAL_EVENT") {
                triggerGlobalEffect(details.type, { card: details.card });
            }
            if (action === "TAP_ALL_EXCEPT_LIGHT") {
                setGs(p => ({
                    ...p,
                    battleZone: p.battleZone.map(c => !c.civilizations?.includes('Light') ? { ...c, isTapped: true } : c)
                }));
                toast("Non-light creatures tapped!", "error");
            }
            if (action === "DISCARD_FOR_EACH_LIGHT") {
                const count = gsR.current.battleZone.filter(c => c.civilizations?.includes('Light')).length;
                for (let i = 0; i < count; i++) {
                    setTimeout(() => net.send("ACTION", { action: "DISCARD_RANDOM" }), i * 300);
                }
                toast(`Discard ${count} cards for light creatures!`);
            }
            if (action === "DESTROY_ALL_EXCEPT_DARK") {
                setGs(p => {
                    const nonDarks = p.battleZone.filter(c => !c.civilizations?.includes('Darkness'));
                    return { ...p, battleZone: p.battleZone.filter(c => c.civilizations?.includes('Darkness')), graveyard: [...p.graveyard, ...nonDarks] };
                });
                toast("All non-darkness creatures destroyed!");
            }
            if (action === "DESTROY_LIGHT_WEAK") {
                setGs(p => {
                    const max = details.maxPower;
                    const targets = p.battleZone.filter(c => c.civilizations?.includes('Light') && CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= max);
                    return { ...p, battleZone: p.battleZone.filter(c => !(c.civilizations?.includes('Light') && CardEngine.getCurrentPower(c, p.battleZone, p.mana) <= max)), graveyard: [...p.graveyard, ...targets] };
                });
                toast("Weak light creatures destroyed!");
            }
            if (action === "DESTROY_EXACT_POWER") {
                setGs(p => {
                    const power = details.power;
                    const targets = p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) === power);
                    return { ...p, battleZone: p.battleZone.filter(c => CardEngine.getCurrentPower(c, p.battleZone, p.mana) !== power), graveyard: [...p.graveyard, ...targets] };
                });
                toast(`Creatures with ${details.power} power destroyed!`);
            }
        });
    }, [net, draw, toast, triggerEffect, triggerGlobalEffect, resolveAttack, finishDestruction, addLog]);

    const ctxAction = useCallback((a, d) => {
        if (a === "AS") attack(d.a, "SHIELD");
        if (a === "AC") attack(d.a, "CREATURE", d.tid);
        if (a === "PB") play(d.card, "battle");
        if (a === "PM") play(d.card, "mana");
        if (a === "EV") {
            const race = CardEngine.evolutionBaitRace(d.card);
            const validBait = gs.battleZone.filter(c => c.subtypes?.some(s => {
                const st = s.toLowerCase();
                const rt = race.toLowerCase();
                return st.includes(rt) || rt.includes(st);
            }));
            if (!validBait.length) { toast(`Need a ${race} to evolve!`, "error"); return; }
            setTargeting({
                message: `Select a ${race} to evolve on top of`,
                count: 1,
                validTargets: validBait.map(c => c.instanceId),
                onComplete: (ids) => play(d.card, "evolution", ids[0])
            });
        }
        if (a === "TAP") triggerTapAbility(d.a);
        if (a === "TAP_ARC_BINE") {
            setGs(p => ({
                ...p,
                battleZone: p.battleZone.map(x => x.instanceId === d.a.instanceId ? { ...x, isTapped: true } : x)
            }));
            triggerEffect("TAP_EFFECTS", d.arc);
            addLog(`${d.a.name} uses Arc Bine's ability!`, 'effect', false, d.a);
            net.send("ACTION", { action: "TAP_TARGET", details: { targetId: d.a.instanceId } });
        }
    }, [attack, play, triggerTapAbility, gs.battleZone, toast, triggerEffect, net, addLog]);

    const onArrowDrop = useCallback((card, pt) => {
        if (isLocked) return;
        if (card.summonedThisTurn) { toast("Summoning sickness!", "error"); return; }
        if (card.isTapped) { toast("Already tapped", "error"); return; }
        if (!CardEngine.canAttack(card, gsR.current.battleZone, gsR.current.opponent.battleZone, gsR.current.mana)) { toast("Can't attack!", "error"); return; }

        const sr = oppShieldRef.current?.getBoundingClientRect();
        if (sr && pt.x >= sr.left - 20 && pt.x <= sr.right + 20 && pt.y >= sr.top - 20 && pt.y <= sr.bottom + 20) {
            attack(card, "SHIELD");
            return;
        }

        const oppBz = oppBzRef.current;
        if (oppBz) {
            const cards = oppBz.querySelectorAll('.creature--opp');
            for (const el of cards) {
                const r = el.getBoundingClientRect();
                if (pt.x >= r.left && pt.x <= r.right && pt.y >= r.top && pt.y <= r.bottom) {
                    const tid = el.dataset.instanceId;
                    if (tid) {
                        const opp = gsR.current.opponent.battleZone.find(c => c.instanceId === tid);
                        if (opp) {
                            const canAtkUntapped = CardEngine.canAttackUntapped(card, gsR.current.battleZone, gsR.current.mana, opp);
                            if (!opp.isTapped && !opp.chaosStrikeTarget && !canAtkUntapped) {
                                toast("Can only attack tapped creatures", "error");
                                return;
                            }
                            attack(card, "CREATURE", tid);
                            return;
                        }
                    }
                }
            }
        }
    }, [attack, toast, isLocked]);

    const { arrow, startArrow } = useArrowDrag(onArrowDrop);

    
    useEffect(() => {
        if (initializedRef.current) return;

        const opponentId = conn?.peer;
        if (opponentId) {
            const savedGs = localStorage.getItem(`dm_gs_${opponentId}`);
            const savedLogs = localStorage.getItem(`dm_logs_${opponentId}`);
            if (savedGs) {
                try {
                    const parsed = JSON.parse(savedGs);
                    // Ensure the state is not just an empty object and has actual game data
                    if (parsed && !parsed.gameOver && (parsed.deck?.length > 0 || parsed.hand?.length > 0)) {
                        initializedRef.current = true;
                        setGs(parsed);
                        if (savedLogs) setLogs(JSON.parse(savedLogs));
                        toast("Reconnected: Game state restored", "success");
                        return;
                    }
                } catch (e) {
                    console.error("Failed to restore game state", e);
                }
            }
        }

        if (!deck || !deck.cards || !cards || cards.length === 0) return;
        initializedRef.current = true;

        const full = [];
        deck.cards.forEach(dc => {
            const info = cards.find(c => c.id === dc.id && (!dc.set_id || c.set_id === dc.set_id));
            if (!info) return;
            for (let i = 0; i < dc.count; i++) full.push({ ...info, instanceId: Math.random().toString(36).substr(2, 9) });
        });
        const sh = full.sort(() => Math.random() - 0.5);
        const shields = sh.splice(0, 5);
        setGs(p => ({ ...p, deck: sh, shields }));
        
        for (let i = 0; i < 5; i++) setTimeout(() => actionsRef.current.draw(), 500 + i * 200);
    }, [conn?.peer, deck, cards]);


    actionsRef.current = { draw, play, attack, triggerEffect };

    return {
        gs, setGs, toasts, setToasts, ctx, setCtx, preview, setPreview, trigger, setTrigger,
        targeting, setTargeting, blockingRequest, setBlockingRequest, waitingForBlock, setWaitingForBlock,
        waitingForOpponent, setWaitingForOpponent, searchingDeck, setSearchingDeck,
        pendingDestruction, setPendingDestruction, pendingDecision, setPendingDecision,
        logs, setLogs, showHistory, setShowHistory, isOpponentConnected,
        net, toast, cancelTargeting, onTargetClick, hover, unhover, isLocked, addLog,
        triggerEffect, triggerTapAbility, finishDestruction, draw, play, attack, endTurn, ctxAction, arrow, startArrow, oppBzRef, oppShieldRef
    };
};
