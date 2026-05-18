import React from 'react';
import { CardEngine } from "./engine.js";
const CARD_BACK = "/cards/bg.png";

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
                                        {searchingDeck.message.toLowerCase().includes('shield') && <div className="shield-num-badge">{c.index !== undefined ? c.index + 1 : (searchingDeck.customList || gs.deck.filter(searchingDeck.filter)).indexOf(c) + 1}</div>}
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
                        <button className="btn-primary" onClick={() => {
                            const currentOnComplete = searchingDeck.onComplete;
                            setSearchingDeck(null);
                            if (currentOnComplete) currentOnComplete();
                        }}>Dismiss</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export const TargetingOverlay = ({ targeting, setTargeting, gs, blockingRequest, onHover }) => {
    if (!targeting || blockingRequest) return null;

    const selectedIds = targeting.selected || [];

    // Helper to find the card in the game state and classify its zone
    const resolvedTargets = targeting.validTargets.map(id => {
        // Check my zones
        let card = gs.battleZone?.find(c => c.instanceId === id);
        if (card) return { card, id, zone: 'myBattle' };

        card = gs.mana?.find(c => c.instanceId === id);
        if (card) return { card, id, zone: 'myMana' };

        card = gs.hand?.find(c => c.instanceId === id);
        if (card) return { card, id, zone: 'myHand' };

        card = gs.shields?.find(c => c.instanceId === id);
        if (card) return { card, id, zone: 'myShield' };

        card = gs.graveyard?.find(c => c.instanceId === id);
        if (card) return { card, id, zone: 'myGrave' };

        // Check opponent's zones
        card = gs.opponent?.battleZone?.find(c => c.instanceId === id);
        if (card) return { card, id, zone: 'oppBattle' };

        card = gs.opponent?.mana?.find(c => c.instanceId === id);
        if (card) return { card, id, zone: 'oppMana' };

        card = gs.opponent?.graveyard?.find(c => c.instanceId === id);
        if (card) return { card, id, zone: 'oppGrave' };

        if (Array.isArray(gs.opponent?.handCards)) {
            card = gs.opponent.handCards.find(c => c.instanceId === id);
            if (card) return { card, id, zone: 'oppHand' };
        }

        if (Array.isArray(gs.opponent?.shields)) {
            card = gs.opponent.shields.find(c => c.instanceId === id);
            if (card) return { card, id, zone: 'oppShield' };
        }

        // Return a fallback representation if the card object is not found directly
        return {
            card: { instanceId: id, name: `Unknown Card (${id})`, image_file: 'bg.png' },
            id,
            zone: 'other'
        };
    });

    // Grouping the targets
    const myCreatures = resolvedTargets.filter(t => t.zone === 'myBattle');
    const oppCreatures = resolvedTargets.filter(t => t.zone === 'oppBattle');
    const myMana = resolvedTargets.filter(t => t.zone === 'myMana');
    const oppMana = resolvedTargets.filter(t => t.zone === 'oppMana');
    const myGrave = resolvedTargets.filter(t => t.zone === 'myGrave');
    const oppGrave = resolvedTargets.filter(t => t.zone === 'oppGrave');
    const other = resolvedTargets.filter(t => !['myBattle', 'oppBattle', 'myMana', 'oppMana', 'myGrave', 'oppGrave'].includes(t.zone));

    const handleCardClick = (id) => {
        const isSel = selectedIds.includes(id);
        if (targeting.count === 1) {
            // Click immediately resolves
            const currentOnComplete = targeting.onComplete;
            setTargeting(null);
            currentOnComplete([id]);
        } else {
            let nextSelected = [];
            if (isSel) {
                nextSelected = selectedIds.filter(x => x !== id);
            } else {
                if (selectedIds.length < targeting.count) {
                    nextSelected = [...selectedIds, id];
                } else {
                    return; // Max count reached
                }
            }
            setTargeting({ ...targeting, selected: nextSelected });
        }
    };

    const renderCardGrid = (list) => {
        return (
            <div className="search-grid">
                {list.map(t => {
                    const c = t.card;
                    const isSel = selectedIds.includes(t.id);
                    const isShieldTarget = t.id.startsWith('shield-') || t.id.startsWith('opp-shield-') || t.zone?.toLowerCase().includes('shield');
                    const getShieldNum = () => {
                        if (t.id.startsWith('shield-')) return parseInt(t.id.split('-')[1]) + 1;
                        if (t.id.startsWith('opp-shield-')) return parseInt(t.id.split('-')[2]) + 1;
                        return null;
                    };
                    return (
                        <div 
                            key={t.id} 
                            className={`search-card-wrap ${isSel ? 'search-card--selected' : ''}`}
                            onClick={() => handleCardClick(t.id)}
                            onMouseEnter={() => onHover && onHover(c)}
                            onMouseLeave={() => onHover && onHover(null)}
                        >
                            <div className="card card--md">
                                <img src={isShieldTarget ? CARD_BACK : `./cards/${c.set_id || 'dm-01'}/${c.image_file}`} alt={c.name} />
                                {isShieldTarget && <div className="shield-num-badge">{getShieldNum() || 1}</div>}
                                {isSel && <div className="power-gem" style={{background:'var(--gold)', color:'black', top:0, left:0, bottom:'auto', right:'auto'}}>✓</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Determine if we should show split columns for Battle Zones
    const showBattleSplit = myCreatures.length > 0 && oppCreatures.length > 0;

    return (
        <div className="search-overlay" style={{ zIndex: 15000 }}>
            <div className="search-container">
                <div className="search-header">
                    <h2>{targeting.message}</h2>
                    <button className="btn-secondary" onClick={() => setTargeting(null)}>Cancel</button>
                    <div style={{color:'rgba(255,255,255,0.5)', fontSize:12}}>
                        Selected: {selectedIds.length} / {targeting.count}
                    </div>
                </div>

                <div className="search-body" style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}>
                    {/* Battle split or simple list */}
                    {showBattleSplit ? (
                        <div className="targeting-split-container">
                            <div className="targeting-column">
                                <h3 className="targeting-column-title">Your Creatures</h3>
                                {renderCardGrid(myCreatures)}
                            </div>
                            <div className="targeting-column">
                                <h3 className="targeting-column-title">Opponent's Creatures</h3>
                                {renderCardGrid(oppCreatures)}
                            </div>
                        </div>
                    ) : (
                        <>
                            {myCreatures.length > 0 && (
                                <div style={{ marginBottom: 20 }}>
                                    <h3 className="targeting-column-title" style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>Your Creatures</h3>
                                    {renderCardGrid(myCreatures)}
                                </div>
                            )}
                            {oppCreatures.length > 0 && (
                                <div style={{ marginBottom: 20 }}>
                                    <h3 className="targeting-column-title" style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>Opponent's Creatures</h3>
                                    {renderCardGrid(oppCreatures)}
                                </div>
                            )}
                        </>
                    )}

                    {/* Mana Zones */}
                    {myMana.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <h3 className="targeting-column-title" style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>Your Mana</h3>
                            {renderCardGrid(myMana)}
                        </div>
                    )}
                    {oppMana.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <h3 className="targeting-column-title" style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>Opponent's Mana</h3>
                            {renderCardGrid(oppMana)}
                        </div>
                    )}

                    {/* Graveyards */}
                    {myGrave.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <h3 className="targeting-column-title" style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>Your Graveyard</h3>
                            {renderCardGrid(myGrave)}
                        </div>
                    )}
                    {oppGrave.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <h3 className="targeting-column-title" style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>Opponent's Graveyard</h3>
                            {renderCardGrid(oppGrave)}
                        </div>
                    )}

                    {/* Other Targets */}
                    {other.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <h3 className="targeting-column-title" style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>Other Targets</h3>
                            {renderCardGrid(other)}
                        </div>
                    )}
                </div>

                {targeting.count > 1 && (
                    <div style={{padding:15, textAlign:'center', borderTop:'1px solid rgba(255,255,255,0.1)'}}>
                        <button 
                            className="btn-primary" 
                            onClick={() => {
                                const currentOnComplete = targeting.onComplete;
                                setTargeting(null);
                                currentOnComplete(selectedIds);
                            }}
                            disabled={targeting.exact !== false ? selectedIds.length !== targeting.count : selectedIds.length === 0}
                        >
                            Done Selection ({selectedIds.length})
                        </button>
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

            {trigger && trigger.length > 0 && (
                <div className="decision-box">
                    <h2>⚡ SHIELD TRIGGER</h2>
                    <div style={{display:'flex', gap:12}}>
                        <img src={`./cards/${trigger[0].set_id || 'dm-01'}/${trigger[0].image_file}`} style={{width:100, borderRadius:6, border:'1px solid var(--gold)'}} alt="Trigger" />
                        <div className="desc" style={{flex:1}}>{trigger[0].text}</div>
                    </div>
                    <div className="actions">
                        <button className="btn-primary" onClick={() => {
                            const current = trigger[0];
                            const isSpell = CardEngine.isSpell(current);
                            addLog(`Activated Shield Trigger: ${current.name}`, 'effect', false, current);
                            net.send("ACTION", { action: "REVEAL_CARD", details: { card: current } });
                            if (current.attackerId) {
                                net.send("ACTION", { action: "SHIELD_TRIGGER_ACTIVATED", details: { attackerId: current.attackerId } });
                            }
                            if (isSpell) {
                                setGs(s => ({ ...s, graveyard: [...s.graveyard, current] }));
                                triggerEffect("SPELL_EFFECTS", current);
                                toast(`${current.name} triggered!`);
                            } else {
                                setGs(s => ({ ...s, battleZone: [...s.battleZone, { ...current, summonedThisTurn: true, isTapped: false, powerBonus: 0 }] }));
                                triggerEffect("ETB_EFFECTS", current, { card: current });
                                toast(`${current.name} summoned from shield!`);
                            }
                            setTrigger(prev => prev.slice(1));
                        }}>{CardEngine.isSpell(trigger[0]) ? 'Cast Spell' : 'Summon'}</button>
                        <button className="btn-secondary" onClick={() => {
                            const current = trigger[0];
                            setGs(s => ({ ...s, hand: [...s.hand, current] }));
                            setTrigger(prev => prev.slice(1));
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
