import React from 'react';
import { CardEngine } from "./engine.js";
import { Preview, CtxMenu, ArrowOverlay } from "./components.jsx";
import { useGameLogic } from "./useGameLogic.js";
import { LogSidebar } from "./LogSidebar.jsx";
import { SearchOverlay, DecisionModals } from "./GameModals.jsx";
import { OpponentSide, PlayerSide } from "./Zones.jsx";
import { PlayerHUD, OpponentHUD } from "./HUD.jsx";

const GameBoard = (props) => {
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

    const avail = gs.mana.filter(m => !m.isTapped).length;
    const oppAvail = gs.opponent.mana.filter(m => !m.isTapped).length;

    const renderCreature = (c, isOpponent) => {
        const s = gs;
        const bz = isOpponent ? s.opponent.battleZone : s.battleZone;
        const mz = isOpponent ? s.opponent.mana : s.mana;
        const gy = isOpponent ? s.opponent.graveyard : s.graveyard;
        const currentPower = CardEngine.getCurrentPower(c, bz, mz) + (c.powerBonus || 0);
        const potentialPower = CardEngine.getPotentialPower(c, bz, gy, mz) + (c.powerBonus || 0);
        const abs = CardEngine.parseAbilities(c, bz, mz);
        const isTargetable = targeting && targeting.validTargets.includes(c.instanceId);
        const isSelected = targeting && targeting.selected?.includes(c.instanceId);
        const canDragAttack = !isOpponent && !c.isTapped && (!c.summonedThisTurn || c.canAttackPlayersOverride || abs.speedAttacker) && !isLocked && gs.turn;
        const hasActiveEffect = CardEngine.hasActiveGlobalEffect(c, bz);
        const civColors = { 'Light': '#ffd644', 'Water': '#4fc3f7', 'Darkness': '#9c27b0', 'Fire': '#ff5722', 'Nature': '#66bb6a' };
        const mainCiv = c.civilizations?.[0] || 'Fire';

        return (
            <div key={c.instanceId} data-instance-id={c.instanceId}
                 className={`card card--md creature ${isOpponent ? 'creature--opp' : ''} ${c.isTapped ? 'creature--tapped' : ''} ${isTargetable ? 'selectable-glow' : ''} ${hasActiveEffect ? 'active-effect-pulse' : ''}`}
                 onContextMenu={e => !isOpponent && battleCtx(e, c)}
                 onClick={(e) => {
                     if (isTargetable) onTargetClick(c);
                     else if (!isOpponent && !isLocked) battleCtx(e, c);
                 }}
                 onMouseDown={e => canDragAttack && !isTargetable ? startArrow(e, c) : null}
                 onMouseEnter={() => hover(c)} onMouseLeave={unhover}
                 style={{ cursor: isTargetable ? 'crosshair' : (canDragAttack ? 'grab' : (isOpponent ? 'default' : 'pointer')), position: 'relative' }}>
                <div className="civ-indicator" style={{ backgroundColor: civColors[mainCiv] || '#ccc' }} />
                <img src={`./cards/${c.set_id || 'dm-01'}/${c.image_file}`} alt={c.name} />
                {isTargetable && <div className={`target-highlight ${isSelected ? 'target-selected' : ''}`} />}
                {c.power && (
                    <>
                        <div className="power-gem" style={(c.powerBonus > 0) ? {background:'linear-gradient(135deg,#4caf50,#2e7d32)',borderColor:'#66bb6a'} : {}}>{currentPower}</div>
                        {potentialPower > currentPower && <div className="potential-power-badge">ATK: {potentialPower}</div>}
                    </>
                )}
                {!isOpponent && c.cost != null && <div className="cost-gem">{c.cost}</div>}
                {abs.blocker && <div className="ability-icon ability-icon--blocker" title="Blocker">🛡️</div>}
                {abs.slayer && <div className="ability-icon ability-icon--slayer" title="Slayer">💀</div>}
                {abs.mustAttack && <div className="ability-icon ability-icon--must-attack" title="Must Attack">⚔️</div>}
                {CardEngine.isEvolution(c) && <div className="ability-icon ability-icon--evolution" title="Evolution">🧬</div>}
                {(abs.doubleBreaker || c.tempDoubleBreaker) && <div className="ability-icon ability-icon--breaker" title="Double Breaker">💥×2</div>}
                {abs.tripleBreaker && <div className="ability-icon ability-icon--breaker" title="Triple Breaker">💥×3</div>}
                {(abs.cantBeBlocked || c.cantBeBlockedThisTurn) && <div className="ability-icon ability-icon--unblockable" title="Unblockable">👻</div>}
                {(abs.untapAtEnd || abs.untapAllAtEnd) && <div style={{position:'absolute',top:26,left:4,fontSize:11,filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.8))',zIndex:5}}>🔄</div>}
                {!isOpponent && (abs.cantAttackPlayers || abs.cantAttack) && <div style={{position:'absolute',top:26,right:4,fontSize:11,filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.8))',zIndex:5}}>🚫</div>}
                {!isOpponent && c.summonedThisTurn && <div className="zzz-overlay"><span className="zzz-icon">💤</span></div>}
            </div>
        );
    };

    const battleCtx = (e, c) => {
        if (isLocked) return;
        e.preventDefault(); e.stopPropagation(); unhover();
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
            const tappedOpps = gs.opponent.battleZone.filter(x => (x.isTapped || x.chaosStrikeTarget) && CardEngine.canBeAttacked(c, x, gs.battleZone, gs.opponent.battleZone));
            const untappedOpps = canAtkUntapped ? gs.opponent.battleZone.filter(x => !x.isTapped && !x.chaosStrikeTarget && CardEngine.canBeAttacked(c, x, gs.battleZone, gs.opponent.battleZone)) : [];
            const targets = [...tappedOpps, ...untappedOpps];
            if (targets.length) {
                items.push({ type: 'sep' });
                targets.forEach(t => {
                    const s = gs;
                    const atkPow = CardEngine.getPotentialPower(c, s.battleZone, s.graveyard, s.mana) + (c.powerBonus || 0);
                    const defPower = CardEngine.getCurrentPower(t, s.opponent.battleZone, s.opponent.mana) + (t.powerBonus || 0);
                    items.push({ label: `${t.name} (${defPower})`, icon: atkPow >= defPower ? "⚔" : "💀", cls: "ctx-item--atk", action: "AC", data: { a: c, tid: t.instanceId } });
                });
            }
        }
        if (!items.length) {
            const reason = c.summonedThisTurn ? "Summoning sickness" : c.isTapped ? "Already tapped" : !canAtk ? "Can't attack" : !canAtkPlayer ? "Can't attack players" : "No targets";
            items.push({ label: reason, icon: "⚠", action: "_", data: {} });
        }
        const arcBine = gs.battleZone.find(x => x.name === "Arc Bine, the Astounding" && !x.isTapped);
        if (arcBine && c.civilizations?.includes('Light') && !c.isTapped && !c.summonedThisTurn) {
             items.push({ label: "Use Arc Bine Ability", icon: "✨", cls: "ctx-item--effect", action: "TAP_ARC_BINE", data: { a: c, arc: arcBine } });
        }
        setCtx({ x: e.clientX, y: e.clientY, items });
    };

    const handCtx = (e, c) => {
        e.preventDefault(); e.stopPropagation(); unhover();
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
        setCtx({ x: e.clientX, y: e.clientY, items });
    };

    return (
        <div className="board" onClick={() => setCtx(null)}>
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

            <LogSidebar logs={logs} hover={hover} unhover={unhover} setShowHistory={setShowHistory} toasts={toasts} />
            
            {showHistory && (
                <div className="history-overlay" onClick={() => setShowHistory(false)}>
                    <div className="history-container" onClick={e => e.stopPropagation()}>
                        <div className="history-header"><h2>Game Chronicles</h2><button className="btn-secondary btn-xs" onClick={() => setShowHistory(false)}>Close</button></div>
                        <div className="history-list">
                            {logs.length === 0 && <div className="empty-text" style={{textAlign:'center', padding:40}}>No records yet. The battle has just begun...</div>}
                            {logs.map(log => (
                                <div key={log.id} className="history-item" style={{ borderLeftColor: log.isOpponent ? 'var(--fire)' : 'var(--gold-dark)' }} onMouseEnter={() => log.card && hover(log.card)} onMouseLeave={() => log.card && unhover()}>
                                    <div className="time">{log.time}</div>
                                    {log.card && <div className="history-thumb"><img src={`./cards/${log.card.set_id || 'dm-01'}/${log.card.image_file}`} alt="" /></div>}
                                    <div className="content">{log.isOpponent ? <strong style={{color:'var(--fire-soft)'}}>Opponent </strong> : <strong style={{color:'var(--gold)'}}>You </strong>}{log.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {preview && <Preview card={preview} />}
            <CtxMenu menu={ctx} onClose={() => setCtx(null)} onAction={ctxAction} />
            
            <div className="centerline"><div className="centerline-inner" /></div>
            
            <OpponentSide 
                gs={gs} oppAvail={oppAvail} oppShieldRef={oppShieldRef} 
                oppBzRef={oppBzRef} renderCreature={renderCreature} 
                hover={hover} unhover={unhover} 
            />

            <PlayerSide 
                gs={gs} avail={avail} targeting={targeting} 
                onTargetClick={onTargetClick} renderCreature={renderCreature} 
                hover={hover} unhover={unhover} handCtx={handCtx}
            />

            <PlayerHUD 
                gs={gs} avail={avail} isLocked={isLocked} 
                waitingForOpponent={waitingForOpponent} 
                endTurn={endTurn} setSearchingDeck={setSearchingDeck} 
                onLeave={props.onLeave}
            />
            
            <OpponentHUD gs={gs} oppAvail={oppAvail} isConnected={isOpponentConnected} />

            <ArrowOverlay arrow={arrow} />
        </div>
    );
};

export default GameBoard;
