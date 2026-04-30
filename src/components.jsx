import React, { useState, useEffect } from 'react';
import { CardEngine } from "./engine.js";
const CARD_BACK = "./cards/bg.png";

export const Toast = ({ t }) => {
    const [exit, setExit] = useState(false);
    useEffect(() => { const tm = setTimeout(() => setExit(true), 1700); return () => clearTimeout(tm); }, []);
    return <div className={`toast-msg toast-msg--${t.type} ${exit ? 'toast-msg--exit' : ''}`}>{t.message}</div>;
};

export const Preview = ({ card }) => {
    if (!card) return null;
    const src = card.isFaceDown ? CARD_BACK : `./cards/${card.set_id || 'dm-01'}/${card.image_file}`;
    const abs = CardEngine.parseAbilities(card);
    const abilityTags = [];
    if (abs.blocker) abilityTags.push("Blocker");
    if (abs.doubleBreaker || card.tempDoubleBreaker) abilityTags.push("Double Breaker");
    if (abs.slayer) abilityTags.push("Slayer");
    if (abs.powerAttacker) abilityTags.push(`Power Attacker +${abs.powerAttacker}`);
    if (abs.cantAttackPlayers) abilityTags.push("Can't Attack Players");
    if (abs.cantAttack) abilityTags.push("Can't Attack");
    if (abs.cantBeBlocked) abilityTags.push("Unblockable");
    if (abs.shieldTrigger) abilityTags.push("Shield Trigger");
    if (abs.canAttackUntapped) abilityTags.push("Attacks Untapped");
    if (abs.untapAtEnd) abilityTags.push("End-Turn Untap");
    if (abs.untapAllAtEnd) abilityTags.push("End-Turn Untap All");
    if (abs.destroyOnWin) abilityTags.push("Destroy on Win");

    const civColors = {
        'Fire': 'var(--fire)',
        'Water': 'var(--ice)',
        'Nature': 'var(--nature)',
        'Darkness': 'var(--shadow)',
        'Light': 'var(--gold-bright)'
    };

    return (
        <div className="preview">
            <div className="preview-frame">
                <img src={src} alt={card.name || ""} />
                {!card.isFaceDown && (
                    <div className="preview-meta">
                        <h3 style={{fontSize: 12, margin: '2px 0', color: 'var(--gold)', textTransform: 'uppercase'}}>{card.name}</h3>
                        <div className="stats">
                            {card.type && <em style={{color:'var(--fire-soft)'}}>{card.type}</em>}
                            {card.cost != null && <>&nbsp;| Cost: <em>{card.cost}</em></>}
                            {card.power && <>&nbsp;| Power: <em>{card.power}</em></>}
                        </div>
                        {card.subtypes && card.subtypes.length > 0 && (
                            <div style={{display:'flex', flexWrap:'wrap', gap:4, justifyContent:'center', marginTop:10}}>
                                {card.subtypes.map((s, i) => (
                                    <span key={i} className="race-tag" style={{fontSize:10,fontWeight:900,padding:'2px 8px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:100,color:'var(--cream)',textTransform:'uppercase'}}>{s}</span>
                                ))}
                            </div>
                        )}
                        {card.civilizations && (
                            <div style={{display:'flex', flexWrap:'wrap', gap:4, justifyContent:'center', marginTop:6}}>
                                {card.civilizations.map((c, i) => (
                                    <span key={i} className="civ-tag" style={{fontSize:9,fontWeight:900,padding:'1px 8px',background:'rgba(0,0,0,0.3)',border:`1px solid ${civColors[c] || '#fff'}`,borderRadius:4,color:civColors[c] || '#fff',textTransform:'uppercase'}}>{c}</span>
                                ))}
                            </div>
                        )}
                        {abilityTags.length > 0 && (
                            <div style={{display:'flex', flexWrap:'wrap', gap:3, justifyContent:'center', marginTop:10}}>
                                {abilityTags.map((tag, i) => (
                                    <span key={i} className="ability-tag" style={{fontSize:8,fontWeight:800,padding:'2px 6px',background:'rgba(255,214,68,0.1)',border:'1px solid rgba(255,214,68,0.2)',borderRadius:4,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{tag}</span>
                                ))}
                            </div>
                        )}
                        {card.text && <div className="desc" style={{marginTop:15, borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:10}}>{card.text}</div>}
                        {card.flavor && <div style={{fontSize:11, fontStyle:'italic', opacity:0.4, marginTop:10, lineHeight:1.3}}>"{card.flavor}"</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

export const CtxMenu = ({ menu, onClose, onAction }) => {
    if (!menu) return null;
    const st = { left: Math.min(menu.x, window.innerWidth - 150), top: Math.min(menu.y, window.innerHeight - 200) };
    return (
        <>
            <div className="ctx-backdrop" onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }} />
            <div className="ctx-menu" style={st}>
                {menu.items.map((it, i) => {
                    if (it.type === 'sep') return <div key={i} className="ctx-sep" />;
                    return (
                        <button key={i} className={`ctx-item ${it.cls||''}`}
                                onClick={e => { e.stopPropagation(); onAction(it.action, it.data); onClose(); }}>
                            {it.icon && <span style={{ fontSize: 15 }}>{it.icon}</span>}
                            {it.label}
                        </button>
                    );
                })}
            </div>
        </>
    );
};

export const ArrowOverlay = ({ arrow }) => {
    if (!arrow) return null;
    const { sx, sy, ex, ey } = arrow;
    const dx = ex - sx, dy = ey - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) return null;
    const mx = sx + dx * 0.5, my = sy + dy * 0.5 - Math.min(dist * 0.2, 80);
    const angle = Math.atan2(ey - my, ex - mx);
    const aSize = 30;
    const a1x = ex - aSize * Math.cos(angle - 0.5), a1y = ey - aSize * Math.sin(angle - 0.5);
    const a2x = ex - aSize * Math.cos(angle + 0.5), a2y = ey - aSize * Math.sin(angle + 0.5);
    return (
        <div className="arrow-overlay">
            <svg>
                <defs>
                    <filter id="arrow-glow">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                <path d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`}
                      fill="none" stroke="#ff5722" strokeWidth="16" strokeLinecap="round"
                      filter="url(#arrow-glow)" opacity="0.9" />
                <path d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`}
                      fill="none" stroke="#ffab91" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
                <polygon points={`${ex},${ey} ${a1x},${a1y} ${a2x},${a2y}`}
                         fill="#ff5722" stroke="#ffab91" strokeWidth="2" filter="url(#arrow-glow)" />
                <circle cx={sx} cy={sy} r="12" fill="rgba(255,87,34,0.3)" stroke="#ff5722" strokeWidth="4" />
            </svg>
        </div>
    );
};
