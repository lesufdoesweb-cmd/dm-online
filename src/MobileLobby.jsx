import React from 'react';
import { FORMATS } from './engine.js';

const MobileLobby = ({
    code,
    playerName,
    isReady,
    setIsReady,
    waitingPlayers,
    join,
    communityDecks,
    selIdx,
    setSelIdx,
    setShowDeckModal,
    currentFormat,
    setCurrentFormat,
    setIsNaming,
    jc,
    setJc,
    setView,
    setEditingDeckIdx,
    setViewOnlyDeck,
    deleteDeck,
    toast,
    toasts
}) => {
    const selectedDeck = communityDecks[selIdx];

    return (
        <div className="mobile-lobby">
            {/* Header / Top Bar */}
            <div className="mobile-lobby-header">
                <h1 className="mobile-logo">Duel<span>Masters</span></h1>
                <div className="mobile-player-tag" onClick={() => setIsNaming(true)}>
                    <span className="player-tag-name">{playerName} ✏️</span>
                </div>
            </div>

            <div className="mobile-lobby-grid">
                {/* Column 1: Deck Selection */}
                <div className="mobile-lobby-panel">
                    <div className="panel-header">
                        <h2>DECK</h2>
                        <button className="btn-secondary btn-xs" onClick={() => setShowDeckModal(true)}>Library</button>
                    </div>
                    <div className="mobile-deck-selection-area">
                        <button className="mobile-new-deck-btn" onClick={() => setView("deckbuilder")}>
                            <span>+</span> NEW DECK
                        </button>
                        <div className="mobile-deck-list-scroll">
                            {communityDecks.filter(d => d.format === currentFormat).map((deck, idx) => {
                                const realIdx = communityDecks.indexOf(deck);
                                const isSelected = selIdx === realIdx;
                                return (
                                    <div key={deck.id || realIdx} 
                                         className={`mobile-deck-pill ${isSelected ? 'active' : ''}`}
                                         onClick={() => setSelIdx(realIdx)}>
                                        <div className="deck-pill-info">
                                            <div className="deck-pill-dot" style={{background: `var(--${deck.color?.toLowerCase() || 'gold'})`}}></div>
                                            <span className="deck-pill-name">{deck.name}</span>
                                        </div>
                                        <div className="deck-pill-actions">
                                            <button className="pill-btn pill-btn--view" onClick={(e) => { e.stopPropagation(); setViewOnlyDeck(deck); setView("deckbuilder"); }}>👁️</button>
                                            {deck.ownerId === code && (
                                                <>
                                                    <button className="pill-btn pill-btn--edit" onClick={(e) => { e.stopPropagation(); setEditingDeckIdx(realIdx); setView("deckbuilder"); }}>✏️</button>
                                                    <button className="pill-btn pill-btn--delete" onClick={(e) => { e.stopPropagation(); if(window.confirm("Delete?")) deleteDeck(realIdx); }}>🗑️</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {communityDecks.filter(d => d.format === currentFormat).length === 0 && (
                                <div className="empty-text" style={{padding: 20}}>No {currentFormat} decks found. Create one!</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Column 2: Duel Actions */}
                <div className="mobile-lobby-panel mobile-lobby-panel--center">
                    <div className="format-pills">
                        {Object.values(FORMATS).map(f => (
                            <button 
                                key={f.id} 
                                className={`format-pill ${currentFormat === f.id ? 'active' : ''}`}
                                onClick={() => {
                                    setCurrentFormat(f.id);
                                    const firstInFormat = communityDecks.find(d => d.format === f.id);
                                    if (firstInFormat) setSelIdx(communityDecks.indexOf(firstInFormat));
                                    toast(`Format: ${f.name}`);
                                }}
                            >
                                {f.name}
                            </button>
                        ))}
                    </div>

                    <button 
                        className={`mobile-duel-btn ${isReady ? 'active' : ''}`} 
                        onClick={() => setIsReady(!isReady)}
                    >
                        {isReady ? 'READY!' : 'DUEL'}
                    </button>

                    <div className="mobile-join-section">
                        <input 
                            className="mobile-lobby-input" 
                            placeholder="Join Code..." 
                            value={jc} 
                            onChange={e => setJc(e.target.value)} 
                        />
                        <button className="btn-primary" onClick={() => join()}>JOIN</button>
                    </div>
                    
                    <div className="mobile-host-code" onClick={() => { navigator.clipboard.writeText(code); toast("Copied!"); }}>
                        ID: {code?.substring(3, 12)}
                    </div>
                </div>

                {/* Column 3: Waiting Room */}
                <div className="mobile-lobby-panel">
                    <div className="panel-header">
                        <h2>ONLINE</h2>
                        <span className={`status-dot ${isReady ? 'active' : ''}`}></span>
                    </div>
                    <div className="mobile-waiting-list">
                        {waitingPlayers.length === 0 ? (
                            <div className="empty-text">Searching for duelists...</div>
                        ) : (
                            waitingPlayers.map((p) => (
                                <div key={p.id} className="mobile-player-item" onClick={() => join(p.id)}>
                                    <span className="player-name">{p.name}</span>
                                    <span className="player-id">{p.id.substring(3, 7)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

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

export default MobileLobby;
