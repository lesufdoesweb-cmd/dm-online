import React from 'react';
import { CardEngine } from "./engine.js";
const CARD_BACK = "./cards/bg.png";

export const SearchOverlay = ({ searchingDeck, setSearchingDeck, gs, onHover }) => {
    if (!searchingDeck) return null;
    return (
        <div className="search-overlay">
            <div className="search-container">
                <div className="search-header">
                    <h2>{searchingDeck.message}</h2>
                    {(searchingDeck.isViewOnly || searchingDeck.isReveal) && <button className="btn-secondary" onClick={() => setSearchingDeck(null)}>Close</button>}
                    {!searchingDeck.isReveal && !searchingDeck.isViewOnly && <div style={{color:'rgba(255,255,255,0.5)', fontSize:12}}>Pick {searchingDeck.count} card(s)</div>}
                </div>
                <div className="search-grid" style={searchingDeck.isReveal ? {display:'flex', justifyContent:'center', alignItems:'center'} : {}}>
                    {searchingDeck.isReveal ? (
                        <div className="card card--xl" style={{animation: 'preview-in 400ms'}}>
                            <img src={`./cards/${searchingDeck.card.set_id || 'dm-01'}/${searchingDeck.card.image_file}`} alt={searchingDeck.card.name} />
                        </div>
                    ) : (
                        (searchingDeck.customList || gs.deck.filter(searchingDeck.filter)).map(c => {
                            const isSel = (searchingDeck.selectedIds || []).includes(c.instanceId);
                            return (
                                <div key={c.instanceId} className={`search-card-wrap ${isSel ? 'search-card--selected' : ''}`} onClick={(e) => {
                                    if (searchingDeck.isViewOnly || searchingDeck.isReveal) {
                                        onHover && onHover(c);
                                        return;
                                    }
                                    if (searchingDeck.count === 1) {
                                        const currentOnComplete = searchingDeck.onComplete;
                                        setSearchingDeck(null);
                                        currentOnComplete(c);
                                    } else {
                                        const current = searchingDeck.selectedIds || [];
                                        if (isSel) {
                                            setSearchingDeck({ ...searchingDeck, selectedIds: current.filter(id => id !== c.instanceId) });
                                        } else if (current.length < searchingDeck.count) {
                                            setSearchingDeck({ ...searchingDeck, selectedIds: [...current, c.instanceId] });
                                        }
                                    }
                                }}>
                                    <div className="card card--md">
                                        <img src={searchingDeck.isFaceDown ? CARD_BACK : `./cards/${c.set_id || 'dm-01'}/${c.image_file}`} alt={c.name} />
                                        {isSel && <div className="power-gem" style={{background:'var(--gold)', color:'black', top:0, left:0, bottom:'auto', right:'auto'}}>✓</div>}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                {searchingDeck.count > 1 && !searchingDeck.isReveal && (
                    <div style={{padding:15, textAlign:'center', borderTop:'1px solid rgba(255,255,255,0.1)'}}>
                        <button className="btn-primary" onClick={() => {
                            const list = searchingDeck.customList || gs.deck.filter(searchingDeck.filter);
                            const selected = list.filter(c => (searchingDeck.selectedIds || []).includes(c.instanceId));
                            const currentOnComplete = searchingDeck.onComplete;
                            setSearchingDeck(null);
                            currentOnComplete(selected);
                        }} disabled={searchingDeck.exact ? (searchingDeck.selectedIds || []).length !== searchingDeck.count : (searchingDeck.selectedIds || []).length === 0}>Done Selection ({(searchingDeck.selectedIds || []).length})</button>
                    </div>
                )}
                {searchingDeck.isViewOnly && (
                    <div style={{padding:15, textAlign:'center', borderTop:'1px solid rgba(255,255,255,0.1)'}}>
                        <button className="btn-primary" onClick={() => setSearchingDeck(null)}>Dismiss</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export const DecisionModals = ({ 
    targeting, blockingRequest, waitingForOpponent, trigger, pendingDecision, pendingDestruction,
    setBlockingRequest, setTargeting, setTrigger, setPendingDecision, setPendingDestruction,
    net, gs, addLog, triggerEffect, toast, setGs, finishDestruction
}) => {
    return (
        <>
            {targeting && !blockingRequest && (
                <div className="decision-box">
                    <h2>🎯 SELECT TARGET</h2>
                    <div className="desc">{targeting.message}</div>
                </div>
            )}

            {waitingForOpponent && (
                <div className="trigger-modal--blocker" style={{ 
                    position: 'fixed', inset: 0, zIndex: 10000, 
                    pointerEvents: 'auto', background: 'rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="targeting-msg" style={{borderColor: 'var(--ice)', boxShadow: '0 0 30px rgba(79,195,247,0.2)', pointerEvents: 'auto'}}>
                        <div className="loading" style={{height: 'auto', background: 'none', padding: 0}}>
                            <div className="ring" style={{width: 24, height: 24, borderWidth: 2}}></div>
                        </div>
                        <span>Waiting for Opponent...</span>
                    </div>
                </div>
            )}

            {blockingRequest && (
                <div className="decision-box">
                    <h2>🛡️ BLOCK DECISION</h2>
                    <div style={{display:'flex', gap:10, alignItems:'center', background:'rgba(0,0,0,0.2)', padding:10, borderRadius:8}}>
                        <img src={`./cards/${blockingRequest.attacker.set_id || 'dm-01'}/${blockingRequest.attacker.image_file}`} style={{width:50, borderRadius:4}} alt="Attacker" />
                        <div style={{fontSize:16, color:'var(--gold)'}}>➡</div>
                        {blockingRequest.targetType === 'SHIELD' ? (
                            <div style={{width:35, height:50, border:'1px solid var(--gold)', borderRadius:4, background:`url(${CARD_BACK})`, backgroundSize:'cover'}}></div>
                        ) : (
                            <img src={`./cards/${(gs.battleZone.find(c => c.instanceId === blockingRequest.targetId) || {}).set_id || 'dm-01'}/${(gs.battleZone.find(c => c.instanceId === blockingRequest.targetId) || {}).image_file}`} style={{width:50, borderRadius:4}} alt="Target" />
                        )}
                    </div>
                    <div className="desc">An attack is incoming! Click a highlighted blocker to intercept, or let the attack through.</div>
                    <div className="actions">
                        <button className="btn-danger" onClick={() => {
                            net.send("ACTION", { action: "BLOCK_DECISION", details: { blockerId: null } });
                            setBlockingRequest(null);
                            setTargeting(null);
                        }}>Pass (Take Hit)</button>
                    </div>
                </div>
            )}

            {trigger && (
                <div className="decision-box">
                    <h2>⚡ SHIELD TRIGGER</h2>
                    <div style={{display:'flex', gap:12}}>
                        <img src={`./cards/${trigger.set_id || 'dm-01'}/${trigger.image_file}`} style={{width:100, borderRadius:6, border:'1px solid var(--gold)'}} alt="Trigger" />
                        <div className="desc" style={{flex:1}}>{trigger.text}</div>
                    </div>
                    <div className="actions">
                        <button className="btn-primary" onClick={() => {
                            const isSpell = CardEngine.isSpell(trigger);
                            addLog(`Activated Shield Trigger: ${trigger.name}`, 'effect', false, trigger);
                            if (isSpell) {
                                setGs(s => ({ ...s, graveyard: [...s.graveyard, trigger] }));
                                triggerEffect("SPELL_EFFECTS", trigger);
                                toast(`${trigger.name} triggered!`);
                            } else {
                                setGs(s => ({ ...s, battleZone: [...s.battleZone, { ...trigger, summonedThisTurn: true, isTapped: false, powerBonus: 0 }] }));
                                triggerEffect("ETB_EFFECTS", trigger);
                                toast(`${trigger.name} summoned from shield!`);
                            }
                            setTrigger(null);
                        }}>{CardEngine.isSpell(trigger) ? 'Cast Spell' : 'Summon'}</button>
                        <button className="btn-secondary" onClick={() => {
                            setGs(s => ({ ...s, hand: [...s.hand, trigger] }));
                            setTrigger(null);
                        }}>To Hand</button>
                    </div>
                </div>
            )}

            {pendingDecision && (
                <div className="decision-box">
                    <h2>🤔 OPTIONAL EFFECT</h2>
                    <div style={{display:'flex', gap:12}}>
                        <img src={`./cards/${pendingDecision.card.set_id || 'dm-01'}/${pendingDecision.card.image_file}`} style={{width:100, borderRadius:6, border:'1px solid var(--gold)'}} alt="Candidate" />
                        <div className="desc" style={{flex:1}}>{pendingDecision.message}</div>
                    </div>
                    <div className="actions">
                        <button className="btn-primary" onClick={() => {
                            pendingDecision.onYes();
                            setPendingDecision(null);
                        }}>Yes / Use Effect</button>
                        <button className="btn-secondary" onClick={() => {
                            pendingDecision.onNo();
                            setPendingDecision(null);
                        }}>No / Skip</button>
                    </div>
                </div>
            )}

            {pendingDestruction && (
                <div className="decision-box">
                    <h2>🛡️ DESTRUCTION REPLACEMENT</h2>
                    <div style={{display:'flex', gap:12}}>
                        <img src={`./cards/${pendingDestruction.card.set_id || 'dm-01'}/${pendingDestruction.card.image_file}`} style={{width:100, borderRadius:6, border:'1px solid var(--gold)'}} alt="Dying" />
                        <div className="desc" style={{flex:1}}>
                            <strong>{pendingDestruction.card.name}</strong> is about to be destroyed.
                            <br/>
                            {pendingDestruction.card.name === "Gigastand" ? "Discard 1 card to return it to your hand instead?" : "Use replacement effect?"}
                        </div>
                    </div>
                    <div className="actions">
                        <button className="btn-primary" onClick={() => {
                            if (pendingDestruction.card.name === "Gigastand") {
                                if (gs.hand.length === 0) {
                                    toast("No cards in hand to discard!", "error");
                                    return;
                                }
                                // Trigger discard
                                const currentCard = pendingDestruction.card;
                                setPendingDestruction(null);
                                setGs(p => {
                                    const idx = Math.floor(Math.random() * p.hand.length);
                                    const disc = p.hand[idx];
                                    toast(`Discarded ${disc.name} for Gigastand!`);
                                    return { 
                                        ...p, 
                                        hand: [...p.hand.filter((_, i) => i !== idx), currentCard],
                                        battleZone: p.battleZone.filter(c => c.instanceId !== currentCard.instanceId),
                                        graveyard: [...p.graveyard, disc]
                                    };
                                });
                                net.send("ACTION", { action: "FINISH_DESTRUCTION_SYNC", details: { instanceId: currentCard.instanceId, dest: 'hand' } });
                            } else {
                                finishDestruction(pendingDestruction.card, pendingDestruction.replacement);
                                setPendingDestruction(null);
                            }
                        }}>Yes (Replace)</button>
                        <button className="btn-secondary" onClick={() => {
                            finishDestruction(pendingDestruction.card);
                            setPendingDestruction(null);
                        }}>No (Destroy)</button>
                    </div>
                </div>
            )}
        </>
    );
};
