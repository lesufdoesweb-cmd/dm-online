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
    toast
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
                    <div className="mobile-selected-deck-preview">
                        {selectedDeck ? (
                            <>
                                <div className="deck-preview-info">
                                    <div className="deck-color-dot" style={{background: `var(--${selectedDeck.color?.toLowerCase()})`}}></div>
                                    <span className="deck-name">{selectedDeck.name}</span>
                                </div>
                                <div className="deck-preview-stats">
                                    <span>⚔️ {selectedDeck.playedCount || 0} Battles</span>
                                    <span>{FORMATS[selectedDeck.format]?.name}</span>
                                </div>
                                <div className="deck-preview-actions">
                                    <button className="btn-secondary btn-xs" onClick={() => { setViewOnlyDeck(selectedDeck); setView("deckbuilder"); }}>VIEW</button>
                                    {selectedDeck.ownerId === code && (
                                        <button className="btn-secondary btn-xs" onClick={() => { setEditingDeckIdx(selIdx); setView("deckbuilder"); }}>EDIT</button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="empty-deck">No Deck Selected</div>
                        )}
                    </div>
                    <button className="btn-primary" style={{marginTop: 'auto'}} onClick={() => setView("deckbuilder")}>+ NEW DECK</button>
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
        </div>
    );
};

export default MobileLobby;
