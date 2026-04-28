import React from 'react';
import { CardEngine } from "./engine.js";
const CARD_BACK = "./cards/bg.png";

export const OpponentSide = ({ gs, oppAvail, oppShieldRef, oppBzRef, renderCreature, hover, unhover }) => {
    return (
        <div className="side-opponent">
            <div className="opp-hand-row">
                {Array.from({ length: gs.opponent.handCount }).map((_, i) => (
                    <div key={i} className="opp-card-back" style={{ backgroundImage: `url(${CARD_BACK})`, transform: `rotate(${(i - gs.opponent.handCount / 2) * 3}deg) translateY(${-Math.abs(i - gs.opponent.handCount / 2) * 2}px)` }} />
                ))}
            </div>
            <div className="opp-field">
                <div className="resource-row resource-row--split">
                    <div>
                        <div className="shield-label">Shields ({gs.opponent.shields.length ?? gs.opponent.shields})</div>
                        <div ref={oppShieldRef} className="shield-stack">
                            {(Array.isArray(gs.opponent.shields) ? gs.opponent.shields : Array.from({ length: gs.opponent.shields })).map((_, i) => (
                                <div key={i} className="shield-gem shield-gem--opp" style={{ backgroundImage: `url(${CARD_BACK})` }} />
                            ))}
                            {(gs.opponent.shields.length ?? gs.opponent.shields) === 0 && <span style={{ fontSize: 10, color: 'var(--fire)', fontWeight: 900 }}>OPEN</span>}
                        </div>
                    </div>
                    <div>
                        <div className="mana-zone-label">Mana ({oppAvail}/{gs.opponent.mana.length})</div>
                        <div className="mana-row">
                            {gs.opponent.mana.map((c, i) => (
                                <div key={c.instanceId || i} className={`mana-pip mana-pip--opp ${c.isTapped ? 'mana-pip--tapped' : ''}`} onMouseEnter={() => hover(c)} onMouseLeave={unhover}><img src={`./cards/${c.set_id || 'dm-01'}/${c.image_file}`} alt={c.name} /></div>
                            ))}
                        </div>
                    </div>
                </div>
                <div ref={oppBzRef} className="battle-row">{gs.opponent.battleZone.map(c => renderCreature(c, true))}</div>
            </div>
        </div>
    );
};

export const PlayerSide = ({ gs, avail, targeting, onTargetClick, renderCreature, hover, unhover, handCtx }) => {
    return (
        <div className="side-player">
            <div className="player-field">
                <div className="battle-row" style={{ position: 'relative' }}>{gs.battleZone.map(c => renderCreature(c, false))}</div>
                <div className="resource-row resource-row--split resource-row--player">
                    <div className="shield-zone-player">
                        <div className="shield-label">🛡 Shields ({gs.shields.length})</div>
                        <div className="shield-stack shield-stack--player">
                            {gs.shields.map((_, i) => {
                                const isTargetable = targeting && targeting.isShieldTarget && targeting.validTargets.includes(`shield-${i}`);
                                return <div key={i} className={`shield-gem shield-gem--self ${isTargetable ? 'selectable-glow' : ''}`} style={{ backgroundImage: `url(${CARD_BACK})`, cursor: isTargetable ? 'crosshair' : 'default' }} onClick={() => isTargetable && onTargetClick({ instanceId: `shield-${i}` })} />;
                            })}
                            {gs.shields.length === 0 && <span style={{ fontSize: 10, color: 'var(--fire)', fontWeight: 900 }}>OPEN!</span>}
                        </div>
                    </div>
                    <div className="mana-zone-player">
                        <div className="mana-zone-label">💧 Mana ({avail}/{gs.mana.length})</div>
                        <div className="mana-row-inline mana-row--player">
                            {gs.mana.map(c => <div key={c.instanceId} className={`mana-pip--player ${c.isTapped ? 'mana-pip--tapped' : 'mana-pip--active'}`} onMouseEnter={() => hover(c)} onMouseLeave={unhover}><img src={`./cards/${c.set_id || 'dm-01'}/${c.image_file}`} alt={c.name} /></div>)}
                        </div>
                    </div>
                </div>
            </div>
            <div className="hand-tray">
                <div className="hand-cards">
                    {gs.hand.map((c, i) => (
                        <div key={c.instanceId} className="hand-slot" style={{ zIndex: i + 10 }}>
                            <div className="card card--lg hand-card" onClick={e => handCtx(e, c)} onContextMenu={e => handCtx(e, c)} onMouseEnter={() => hover(c)} onMouseLeave={unhover}>
                                <img src={`./cards/${c.set_id || 'dm-01'}/${c.image_file}`} alt={c.name} />
                                {c.cost != null && (() => { const calcCost = CardEngine.getCost(c, gs.battleZone); const isDiscounted = calcCost < c.cost; return <div className={`cost-gem ${isDiscounted ? 'cost-gem--discounted' : ''}`}>{calcCost}</div>; })()}
                                {c.power && <div className="power-gem">{c.power}</div>}
                                {CardEngine.isSpell(c) && <div style={{position:'absolute',top:4,right:30,fontSize:12,filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.8))',zIndex:5}}>✨</div>}
                                {CardEngine.parseAbilities(c, gs.battleZone, gs.mana).shieldTrigger && <div className="trigger-badge" title="Shield Trigger">⚡</div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
