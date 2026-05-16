import React, { useState } from 'react';
import { CardEngine } from "./engine.js";
import { Preview, CtxMenu, ArrowOverlay } from "./components.jsx";
import { useGameLogic } from "./useGameLogic.js";
import { LogSidebar } from "./LogSidebar.jsx";
import { SearchOverlay, DecisionModals } from "./GameModals.jsx";
import { PlayerHUD, OpponentHUD } from "./HUD.jsx";
import "./mobile_board.css";

const CARD_BACK = "/cards/bg.png";

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
                    const atkPow = CardEngine.getPotentialPower(c, gs.battleZone, gs.graveyard, gs.mana);
                    const defPower = CardEngine.getCurrentPower(t, gs.opponent.battleZone, gs.opponent.mana);
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
        const hasCiv = CardEngine.hasCivilization(gs.mana, c.civilizations);
        const items = [];
        if (isEvo) {
            items.push({ 
                label: hasCiv ? `Evolve (${c.cost})` : `Missing ${c.civilizations?.[0]} Mana`, 
                icon: "🧬", 
                cls: hasCiv ? "ctx-item--summon" : "ctx-item--disabled", 
                action: hasCiv ? "EV" : "_", 
                data: { card: c } 
            });
        } else {
            items.push({ 
                label: hasCiv ? (isSpell ? `Cast Spell (${c.cost})` : `Summon (${c.cost})`) : `Missing ${c.civilizations?.[0]} Mana`, 
                icon: isSpell ? "✨" : "⚡", 
                cls: hasCiv ? "ctx-item--summon" : "ctx-item--disabled", 
                action: hasCiv ? "PB" : "_", 
                data: { card: c } 
            });
        }
        if (!gs.hasPlacedMana) items.push({ label: "Charge Mana", icon: "💧", cls: "ctx-item--mana", action: "PM", data: { card: c } });
        
        // Use coordinates from event or raw numbers
        const x = e.clientX || e.x || 0;
        const y = e.clientY || e.y || 0;
        setCtx({ x, y, items });
    };

    const renderCreature = (c, isOpponent, i, total) => {
        const s = gs;
        const bz = isOpponent ? s.opponent.battleZone : s.battleZone;
        const mz = isOpponent ? s.opponent.mana : s.mana;
        const currentPower = CardEngine.getCurrentPower(c, bz, mz);
        const isTargetable = targeting && targeting.validTargets.includes(c.instanceId);
        const isSelected = targeting && targeting.selected?.includes(c.instanceId);
        const canDragAttack = !isOpponent && !c.isTapped && (!c.summonedThisTurn || CardEngine.parseAbilities(c, bz, mz).speedAttacker) && !isLocked && gs.turn;
        const abs = CardEngine.parseAbilities(c, bz, mz);

        // Squeezing logic
        const cardWidth = 65;
        const maxFieldWidth = window.innerWidth - 380; // Adjusted for zones and padding
        const baseGap = 12; // More space as requested
        
        const requiredWidth = total * cardWidth + (total - 1) * baseGap;
        let style = { transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' };
        
        if (requiredWidth > maxFieldWidth && total > 1) {
            const spacing = (maxFieldWidth - cardWidth) / (total - 1);
            const overlap = cardWidth - spacing;
            style.marginLeft = i === 0 ? 0 : -overlap;
        } else {
            style.margin = `0 ${baseGap / 2}px`;
        }

        return (
            <div key={c.instanceId} data-instance-id={c.instanceId}
                 className={`mobile-unit ${isOpponent ? 'unit--opp' : ''} ${c.isTapped ? 'unit--tapped' : ''} ${isTargetable ? 'selectable-glow' : ''}`}
                 style={style}
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
            setSelectedHandCardId(null);
        }}>
            <SearchOverlay searchingDeck={searchingDeck} setSearchingDeck={setSearchingDeck} gs={gs} onHover={hover} />
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

            {/* FLOATING HUD (Top Level) */}
            <div className="mobile-floating-hud">
                <div className={`mobile-end-turn-floating ${!gs.turn || isLocked ? 'disabled' : ''}`} 
                     onClick={() => gs.turn && !isLocked && endTurn()}>
                    <span>{gs.turn ? 'END' : 'WAIT'}</span>
                    <div className="sub">TURN</div>
                </div>

                <div className="mobile-hud-actions-floating">
                    <button className="mobile-btn-glass" onClick={() => setSearchingDeck({ customList: gs.graveyard, message: "Your Graveyard", isViewOnly: true })}>GRAVE</button>
                    <button className="mobile-btn-glass" onClick={() => setSearchingDeck({ customList: gs.mana, message: "Mana Zone", isViewOnly: true })}>MANA</button>
                    <button className="mobile-btn-glass" onClick={() => setSearchingDeck({ customList: gs.opponent.graveyard, message: "Opponent Graveyard", isViewOnly: true })}>OPP GRAVE</button>
                    <button className="mobile-btn-glass" onClick={() => setSearchingDeck({ customList: gs.opponent.mana, message: "Opponent Mana", isViewOnly: true })}>OPP MANA</button>
                    <button className="mobile-btn-glass" onClick={() => setSearchingDeck({ customList: gs.deck, message: "Your Deck", isViewOnly: true })}>DECK</button>
                    <button className="mobile-btn-glass" onClick={() => setShowHistory(true)}>📜 LOGS</button>
                </div>

            </div>

            {/* BATTLEFIELD (MAT) */}
            <div className="mobile-battlefield" onClick={() => { unhover(); setCtx(null); }}>
                
                {/* OPPONENT FLOATING ZONE */}
                <div className="mobile-floating-zone mobile-floating-zone--opp">
                    {/* Mana behind shields */}

                    <div className="mobile-card-mini-stack">
                        {gs.opponent.mana.map((c, i) => {
                            const spacing = gs.opponent.mana.length > 1 ? Math.min(8, 70 / gs.opponent.mana.length) : 0;
                            return (
                                <div key={i} className="mobile-card-mini" 
                                     style={{ 
                                         left: i * spacing, 
                                         zIndex: i, 
                                         transform: c.isTapped ? 'rotate(90deg) translateY(6px)' : 'none',
                                         filter: c.isTapped ? 'brightness(0.7)' : 'none',
                                         cursor: 'pointer' 
                                     }}
                                     onClick={(e) => { e.stopPropagation(); hover(c); }}>
                                    <img src={`./cards/${c.set_id || 'dm-01'}/${c.image_file}`} alt="mana" />
                                </div>
                            );
                        })}
                        <div style={{position:'absolute', bottom:-12, left:0, fontSize:10, fontWeight:900, color:'#0277bd', textShadow:'0 0 4px #000'}}>💧 {oppAvail}/{gs.opponent.mana.length}</div>
                    </div>
                    {/* Shields in front */}
                    <div className="mobile-shield-grid" style={{marginTop: 15}}>
                        {Array.from({ length: typeof gs.opponent.shields === 'number' ? gs.opponent.shields : gs.opponent.shields.length }).map((_, i) => (
                            <div key={i} className="mobile-shield-card" style={{ backgroundImage: `url(${CARD_BACK})` }} />
                        ))}
                    </div>
                </div>

                <div className="mobile-field-row mobile-field-row--opp" ref={oppBzRef}>
                    {/* Opponent Hand Tray at the very top */}
                    <div className="mobile-opp-hand-tray">
                        <div className="mobile-opp-hand-fan">
                            {Array.from({ length: gs.opponent.handCount || 0 }).map((_, i) => {
                                const rotation = (i - (gs.opponent.handCount - 1) / 2) * -4;
                                const transY = Math.abs(i - (gs.opponent.handCount - 1) / 2) * 1.5;
                                return (
                                    <div key={i} className="mobile-opp-card-back" 
                                         style={{ 
                                             backgroundImage: `url(${CARD_BACK})`,
                                             transform: `rotate(${rotation}deg) translateY(${-transY}px)`,
                                             marginLeft: i === 0 ? 0 : -20
                                         }} />
                                );
                            })}
                        </div>
                    </div>
                    {gs.opponent.battleZone.map((c, i) => renderCreature(c, true, i, gs.opponent.battleZone.length))}
                </div>
                <div className="mobile-field-row mobile-field-row--player">
                    {gs.battleZone.map((c, i) => renderCreature(c, false, i, gs.battleZone.length))}
                </div>

                {/* PLAYER FLOATING ZONE (Bottom Right) */}
                <div className="mobile-floating-zone mobile-floating-zone--player">
                    {/* Shields in front */}
                    <div className="mobile-shield-grid" style={{marginBottom: 10}}>
                        {gs.shields.map((_, i) => {
                            const isTargetable = targeting && targeting.isShieldTarget && targeting.validTargets.includes(`shield-${i}`);
                            const isSelected = targeting && targeting.selected?.includes(`shield-${i}`);
                            return (
                                <div key={i} 
                                     className={`mobile-shield-card ${isTargetable ? 'selectable-glow' : ''} ${isSelected ? 'target-selected' : ''}`} 
                                     style={{ backgroundImage: `url(${CARD_BACK})` }}
                                     onClick={() => isTargetable && onTargetClick({ instanceId: `shield-${i}` })} 
                                />
                            );
                        })}
                    </div>
                    {/* Mana behind shields */}
                    <div className="mobile-card-mini-stack">
                        {gs.mana.map((c, i) => {
                            const spacing = gs.mana.length > 1 ? Math.min(8, 70 / gs.mana.length) : 0;
                            return (
                                <div key={i} className="mobile-card-mini" 
                                     style={{ 
                                         left: i * spacing, 
                                         zIndex: i, 
                                         transform: c.isTapped ? 'rotate(90deg) translateY(-6px)' : 'none',
                                         filter: c.isTapped ? 'brightness(0.7)' : 'none',
                                         cursor: 'pointer' 
                                     }}
                                     onClick={(e) => { e.stopPropagation(); hover(c); }}>
                                    <img src={`./cards/${c.set_id || 'dm-01'}/${c.image_file}`} alt="mana" />
                                </div>
                            );
                        })}
                        <div style={{position:'absolute', top:-12, left:0, fontSize:10, fontWeight:900, color:'#0277bd', textShadow:'0 0 4px #000'}}>💧 {avail}/{gs.mana.length}</div>
                    </div>
                </div>
            </div>

            {/* PERSISTENT HAND */}
            <div className="mobile-hand-persistent">
                {gs.hand.map((c, i) => {
                    const total = gs.hand.length;
                    const isSelected = selectedHandCardId === c.instanceId;
                    
                    const center = (total - 1) / 2;
                    const dist = i - center;
                    
                    // Responsive spacing to fit ~65% width
                    const maxHandWidth = window.innerWidth * 0.65; 
                    const cardWidth = 60;
                    const baseSpacing = 48; 
                    const spacing = total > 1 ? Math.min(baseSpacing, (maxHandWidth - cardWidth) / (total - 1)) : 0;
                    
                    const rotation = dist * (12 / Math.max(2, total / 3)); 
                    const translateY = Math.abs(dist) * Math.abs(dist) * (6 / Math.max(1, total / 3));
                    const translateX = dist * spacing;

                    const cardStyle = isSelected ? {} : {
                        transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`,
                        zIndex: 100 + i
                    };

                    return (
                        <div key={c.instanceId} 
                             className={`mobile-hand-card-wrapper ${isSelected ? 'selected' : ''}`} 
                             style={cardStyle}
                             onClick={(e) => {
                                 if (targeting || searchingDeck) return;
                                 e.stopPropagation();
                                 const rect = e.currentTarget.getBoundingClientRect();
                                 const x = rect.left + rect.width / 2; // Center horizontally
                                 const y = rect.top - 220; // Higher position to clear scaled card
                                 
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

            <CtxMenu menu={ctx} 
                     onClose={() => { setCtx(null); setSelectedHandCardId(null); unhover(); }} 
                     onAction={(action, data) => { ctxAction(action, data); setSelectedHandCardId(null); unhover(); }} />
            {preview && <Preview card={preview} />}
            <ArrowOverlay arrow={arrow} />
            <div className="toast-layer">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast--${t.type}`}>
                        {t.type === 'error' ? '⚠️' : t.type === 'success' ? '✨' : 'ℹ️'} {t.message}
                    </div>
                ))}
            </div>
        </div>
    );
};


export default MobileGameBoard;

