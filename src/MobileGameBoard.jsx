import React, { useState } from 'react';
import { CardEngine } from "./engine.js";
import { Preview, CtxMenu, ArrowOverlay } from "./components.jsx";
import { useGameLogic } from "./useGameLogic.js";
import { LogSidebar } from "./LogSidebar.jsx";
import { SearchOverlay, DecisionModals } from "./GameModals.jsx";
import { PlayerHUD, OpponentHUD } from "./HUD.jsx";
import "./mobile_board.css";

const CARD_BACK = "./cards/bg.png";

const MobileGameBoard = (props) => {
    const {
        gs, setGs, toasts, ctx, setCtx, preview, trigger, setTrigger,
        targeting, setTargeting, blockingRequest, setBlockingRequest,
        waitingForOpponent, searchingDeck, setSearchingDeck,
        pendingDecision, setPendingDecision,
        pendingDestruction, setPendingDestruction,
        logs, showHistory, setShowHistory, isOpponentConnected,
        net, toast, onTargetClick, hover, unhover, isLocked, addLog,
        triggerEffect, endTurn, ctxAction, arrow, startArrow, oppBzRef, oppShieldRef,
        finishDestruction
    } = useGameLogic(props);

    const [selectedHandCardId, setSelectedHandCardId] = useState(null);

    const avail = gs.mana.filter(m => !m.isTapped).length;
    const oppAvail = gs.opponent.mana.filter(m => !m.isTapped).length;

    const battleCtx = (e, c) => {
        if (isLocked) return;
        e.preventDefault(); e.stopPropagation();
        const canAtk = CardEngine.canAttack(c, gs.battleZone, gs.opponent.battleZone, gs.mana);
        const canAtkPlayer = CardEngine.canAttackPlayer(c, gs.battleZone, gs.mana);
        const canAtkUntapped = CardEngine.canAttackUntapped(c, gs.battleZone, gs.mana);
        
        const items = [];
        const abs = CardEngine.parseAbilities(c, gs.battleZone, gs.mana);
        if (abs.hasTapAbility && !c.isTapped && !c.summonedThisTurn) {
            items.push({ label: "Use Tap Ability", icon: "💎", cls: "ctx-item--effect", action: "TAP", data: { a: c } });
        }
        if (!c.isTapped && !c.summonedThisTurn && canAtk) {
            if (canAtkPlayer) {
                const breaksCount = CardEngine.shieldsToBreak(c, gs.battleZone, gs.mana);
                items.push({ label: `Attack Shields${breaksCount > 1 ? ` (×${breaksCount})` : ''}`, icon: "🛡", cls: "ctx-item--atk", action: "AS", data: { a: c } });
            }
            const targets = gs.opponent.battleZone.filter(x => (x.isTapped || x.chaosStrikeTarget || canAtkUntapped) && CardEngine.canBeAttacked(c, x, gs.battleZone, gs.opponent.battleZone));
            if (targets.length) {
                items.push({ type: 'sep' });
                targets.forEach(t => {
                    const atkPow = CardEngine.getPotentialPower(c, gs.battleZone, gs.graveyard, gs.mana) + (c.powerBonus || 0);
                    const defPower = CardEngine.getCurrentPower(t, gs.opponent.battleZone, gs.opponent.mana) + (t.powerBonus || 0);
                    items.push({ label: `${t.name} (${defPower})`, icon: atkPow >= defPower ? "⚔" : "💀", cls: "ctx-item--atk", action: "AC", data: { a: c, tid: t.instanceId } });
                });
            }
        }
        if (!items.length) {
            const reason = c.summonedThisTurn ? "Summoning sickness" : c.isTapped ? "Already tapped" : "No targets";
            items.push({ label: reason, icon: "⚠", action: "_", data: {} });
        }
        setCtx({ x: e.clientX, y: e.clientY, items });
    };

    const handCtx = (e, c) => {
        if (isLocked || gs.attackStarted) return;
        const isSpell = CardEngine.isSpell(c);
        const isEvo = CardEngine.isEvolution(c);
        const items = [];
        if (isEvo) {
            items.push({ label: `Evolve (${c.cost})`, icon: "🧬", cls: "ctx-item--summon", action: "EV", data: { card: c } });
        } else {
            items.push({ label: isSpell ? `Cast Spell (${c.cost})` : `Summon (${c.cost})`, icon: isSpell ? "✨" : "⚡", cls: "ctx-item--summon", action: "PB", data: { card: c } });
        }
        if (!gs.hasPlacedMana) items.push({ label: "Charge Mana", icon: "💧", cls: "ctx-item--mana", action: "PM", data: { card: c } });
        
        // Use coordinates from event or raw numbers
        const x = e.clientX || e.x || 0;
        const y = e.clientY || e.y || 0;
        setCtx({ x, y, items });
    };

    const renderCreature = (c, isOpponent) => {
        const s = gs;
        const bz = isOpponent ? s.opponent.battleZone : s.battleZone;
        const mz = isOpponent ? s.opponent.mana : s.mana;
        const currentPower = CardEngine.getCurrentPower(c, bz, mz) + (c.powerBonus || 0);
        const isTargetable = targeting && targeting.validTargets.includes(c.instanceId);
        const isSelected = targeting && targeting.selected?.includes(c.instanceId);
        const canDragAttack = !isOpponent && !c.isTapped && (!c.summonedThisTurn || CardEngine.parseAbilities(c, bz, mz).speedAttacker) && !isLocked && gs.turn;
        const abs = CardEngine.parseAbilities(c, bz, mz);

        return (
            <div key={c.instanceId} data-instance-id={c.instanceId}
                 className={`mobile-unit ${isOpponent ? 'unit--opp' : ''} ${c.isTapped ? 'unit--tapped' : ''} ${isTargetable ? 'selectable-glow' : ''}`}
                 onClick={(e) => {
                     e.stopPropagation();
                     if (isTargetable) onTargetClick(c);
                     else if (!isOpponent && !isLocked) battleCtx(e, c);
                     else hover(c);
                 }}
                 onMouseDown={e => canDragAttack && !isTargetable ? startArrow(e, c) : null}
                 onMouseEnter={() => hover(c)} onMouseLeave={unhover}>
                <img src={`./cards/${c.set_id || 'dm-01'}/${c.image_file}`} alt={c.name} />
                {c.power && <div className="unit-power">{currentPower}</div>}
                {isTargetable && <div className={`target-highlight ${isSelected ? 'target-selected' : ''}`} />}
                {abs.blocker && <div className="unit-icon">🛡️</div>}
                {!isOpponent && c.summonedThisTurn && !abs.speedAttacker && <div className="unit-zzz">💤</div>}
            </div>
        );
    };

    return (
        <div className="mobile-board" onClick={() => { 
            if (targeting || searchingDeck) return; 
            unhover(); 
            setCtx(null); 
        }}>
            <SearchOverlay searchingDeck={searchingDeck} setSearchingDeck={setSearchingDeck} gs={gs} />
            <DecisionModals 
                targeting={targeting} blockingRequest={blockingRequest} 
                waitingForOpponent={waitingForOpponent} trigger={trigger} 
                pendingDecision={pendingDecision} pendingDestruction={pendingDestruction}
                setBlockingRequest={setBlockingRequest} setTargeting={setTargeting} 
                setTrigger={setTrigger} setPendingDecision={setPendingDecision} 
                setPendingDestruction={setPendingDestruction}
                net={net} gs={gs} addLog={addLog} triggerEffect={triggerEffect} 
                toast={toast} setGs={setGs} finishDestruction={finishDestruction}
            />

            {gs.gameOver && (
                <div className="gameover">
                    <h1 className={gs.gameOver === 'win' ? 'win' : 'lose'}>{gs.gameOver === 'win' ? 'Victory' : 'Defeat'}</h1>
                    <button onClick={props.onLeave}>Back to Lobby</button>
                </div>
            )}

            {/* OPPONENT SIDEBAR (LEFT) */}
            <div className="mobile-sidebar mobile-sidebar--opp">
                <div className="mobile-portrait mobile-portrait--opp">
                    <img src={CARD_BACK} alt="Opponent" />
                    <div className="mobile-mana-counter mobile-mana-counter--opp">{oppAvail} / {gs.opponent.mana.length}</div>
                    <div className={`mobile-end-turn-indicator ${!gs.turn ? 'active' : ''}`}>{!gs.turn ? 'TURN' : 'WAIT'}</div>
                </div>
                <div className="mobile-hand-count-indicator">👐 {gs.opponent.handCount}</div>
                
                <div className="mobile-sidebar-stacks">
                    <div className="mobile-shield-stack mobile-shield-stack--opp">
                        {Array.from({ length: typeof gs.opponent.shields === 'number' ? gs.opponent.shields : gs.opponent.shields.length }).map((_, i) => (
                            <div key={i} className="mobile-shield-gem" />
                        ))}
                    </div>
                    <div className="mobile-mana-stack">
                        {gs.opponent.mana.map((c, i) => {
                            const civ = c.civilizations?.[0] || 'Neutral';
                            return <div key={i} className={`mobile-mana-bubble ${c.isTapped ? 'tapped' : ''} bubble--${civ.toLowerCase()}`} />;
                        })}
                    </div>
                </div>

                <div className="mobile-sidebar-piles">
                    <button className="mobile-action-btn-sidebar" onClick={() => setSearchingDeck({ customList: gs.opponent.graveyard, message: "Opponent Graveyard", isViewOnly: true })}>GRAVE</button>
                    <button className="mobile-action-btn-sidebar" onClick={() => setSearchingDeck({ customList: gs.opponent.mana, message: "Opponent Mana", isViewOnly: true })}>MANA</button>
                </div>
            </div>

            {/* TOP STATUS BAR */}
            <div className="mobile-top-status">
                <div className={`status-bubble ${gs.turn ? 'status--your-turn' : 'status--opp-turn'}`}>
                    {gs.turn ? "YOUR TURN" : "OPPONENT'S TURN"}
                </div>
            </div>

            {/* BATTLEFIELD */}
            <div className="mobile-battlefield" onClick={() => { unhover(); setCtx(null); }}>
                <div className="mobile-field-row mobile-field-row--opp" ref={oppBzRef}>
                    {gs.opponent.battleZone.map(c => renderCreature(c, true))}
                </div>
                <div className="mobile-field-row mobile-field-row--player">
                    {gs.battleZone.map(c => renderCreature(c, false))}
                </div>
            </div>

            {/* PLAYER SIDEBAR (RIGHT) */}
            <div className="mobile-sidebar mobile-sidebar--player">
                <div className={`mobile-portrait mobile-portrait--player ${gs.turn && !isLocked ? 'active-turn' : ''}`} onClick={() => gs.turn && !isLocked && endTurn()}>
                    <img src={CARD_BACK} alt="You" />
                    <div className={`mobile-end-turn-indicator ${gs.turn && !isLocked ? 'active' : ''}`}>END</div>
                </div>
                
                <div className="mobile-sidebar-stacks">
                    <div className="mobile-shield-stack">
                        {gs.shields.map((_, i) => {
                            const isTargetable = targeting && targeting.isShieldTarget && targeting.validTargets.includes(`shield-${i}`);
                            const isSelected = targeting && targeting.selected?.includes(`shield-${i}`);
                            return <div key={i} className={`mobile-shield-gem ${isTargetable ? 'selectable-glow' : ''} ${isSelected ? 'target-selected' : ''}`} onClick={() => isTargetable && onTargetClick({ instanceId: `shield-${i}` })} />;
                        })}
                    </div>
                    <div className="mobile-mana-stack">
                        {gs.mana.map((c, i) => {
                            const civ = c.civilizations?.[0] || 'Neutral';
                            return <div key={i} className={`mobile-mana-bubble ${c.isTapped ? 'tapped' : ''} bubble--${civ.toLowerCase()}`} />;
                        })}
                    </div>
                </div>

                <div className="mobile-sidebar-piles">
                    <button className="mobile-action-btn-sidebar" onClick={() => setSearchingDeck({ customList: gs.graveyard, message: "Your Graveyard", isViewOnly: true })}>GRAVE</button>
                    <button className="mobile-action-btn-sidebar" onClick={() => setSearchingDeck({ customList: gs.mana, message: "Mana Zone", isViewOnly: true })}>MANA</button>
                    <button className="mobile-pile-btn" onClick={() => setSearchingDeck({ customList: gs.deck, message: "Your Deck", isViewOnly: true })}>🎴</button>
                    <button className="mobile-log-toggle-sidebar" onClick={() => setShowHistory(true)}>📜</button>
                </div>
            </div>

            {/* PERSISTENT HAND */}
            <div className="mobile-hand-persistent">
                {gs.hand.map((c, i) => {
                    const isSelected = selectedHandCardId === c.instanceId;
                    return (
                        <div key={c.instanceId} 
                             className={`mobile-hand-card-wrapper ${isSelected ? 'selected' : ''}`} 
                             onClick={(e) => {
                                 if (targeting || searchingDeck) return;
                                 e.stopPropagation();
                                 const rect = e.currentTarget.getBoundingClientRect();
                                 const x = rect.left;
                                 const y = rect.top - 160; // Position significantly above card
                                 
                                 setSelectedHandCardId(c.instanceId);
                                 hover(c);
                                 handCtx({ clientX: x, clientY: y }, c);
                             }}>
                            <img src={`./cards/${c.set_id || 'dm-01'}/${c.image_file}`} alt={c.name} />
                            <div className="mobile-card-cost">{c.cost}</div>
                            {CardEngine.isSpell(c) && <div className="mobile-spell-tag">✨</div>}
                        </div>
                    );
                })}
                {selectedHandCardId && <div className="hand-close-overlay" onClick={() => { setSelectedHandCardId(null); unhover(); }} />}
            </div>

            {showHistory && (
                <div className="history-overlay" onClick={() => setShowHistory(false)}>
                    <div className="history-container" onClick={e => e.stopPropagation()}>
                        <div className="history-header"><h2>Chronicles</h2><button className="btn-secondary btn-xs" onClick={() => setShowHistory(false)}>Close</button></div>
                        <div className="history-list">
                            {logs.map(log => (
                                <div key={log.id} className="history-item" style={{ borderLeftColor: log.isOpponent ? 'var(--fire)' : 'var(--gold-dark)' }}>
                                    <div className="content">{log.isOpponent ? 'OPP: ' : 'YOU: '}{log.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <CtxMenu menu={ctx} onClose={() => setCtx(null)} onAction={ctxAction} />
            {preview && <Preview card={preview} />}
            <ArrowOverlay arrow={arrow} />
            <div className="toast-layer">{toasts.map(t => (<div key={t.id} className={`toast toast--${t.type}`} style={{fontSize: 12, padding: '8px 16px'}}>{t.message}</div>))}</div>
        </div>
    );
};

export default MobileGameBoard;
