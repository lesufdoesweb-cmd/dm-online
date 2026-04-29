import React from 'react';
import { FORMATS } from './engine.js';

const LobbyModals = ({
    reconnectPending,
    handleResume,
    handleDiscard,
    isNaming,
    playerName,
    setPlayerName,
    setIsNaming,
    pendingRequest,
    acceptRequest,
    setPendingRequest,
    showDeckModal,
    setShowDeckModal,
    communityDecks,
    currentFormat,
    code,
    selIdx,
    setSelIdx,
    setView,
    setEditingDeckIdx,
    setViewOnlyDeck,
    deleteDeck,
    toast
}) => {
    return (
        <>
            {reconnectPending && (
                <div className="trigger-modal" style={{zIndex: 6000}}>
                    <div className="decision-box" style={{left:'50%', top:'50%', transform:'translate(-50%, -50%)'}}>
                        <h2>RESUME GAME?</h2>
                        <div className="desc">An active duel with <strong>{reconnectPending.opponentId.substring(3, 9)}...</strong> was found. Would you like to reconnect?</div>
                        <div className="actions">
                            <button className="btn-primary" onClick={handleResume}>Resume</button>
                            <button className="btn-secondary" onClick={handleDiscard}>Discard</button>
                        </div>
                    </div>
                </div>
            )}
            {isNaming && (
                <div className="trigger-modal" style={{zIndex: 4000}}>
                    <div className="decision-box" style={{left:'50%', top:'50%', transform:'translate(-50%, -50%)'}}>
                        <h2>CHANGE NAME</h2>
                        <input className="lobby-input" value={playerName} onChange={e => setPlayerName(e.target.value)} autoFocus />
                        <div className="actions">
                            <button className="btn-primary" onClick={() => { localStorage.setItem("dm_player_name", playerName); setIsNaming(false); }}>Save</button>
                        </div>
                    </div>
                </div>
            )}
            {pendingRequest && (
                <div className="trigger-modal" style={{zIndex: 4000}}>
                    <div className="decision-box" style={{left:'50%', top:'50%', transform:'translate(-50%, -50%)'}}>
                        <h2>DUEL REQUEST</h2>
                        <div className="desc"><strong>{pendingRequest.name}</strong> wants to duel!</div>
                        <div className="actions">
                            <button className="btn-primary" onClick={acceptRequest}>Accept</button>
                            <button className="btn-secondary" onClick={() => { pendingRequest.conn.send({ type: 'CONNECT_REJECT' }); setPendingRequest(null); }}>Decline</button>
                        </div>
                    </div>
                </div>
            )}
            {showDeckModal && (
                <div className="trigger-modal" style={{zIndex: 5000}}>
                    <div className="search-container" style={{maxWidth: 1000, height: '80vh', background: 'var(--board-dark)', border: '2px solid var(--gold)', borderRadius: 12, padding: 30, display:'flex', flexDirection:'column'}}>
                        <div className="search-header"><h2>Community Decks ({FORMATS[currentFormat].name})</h2><button className="btn-secondary" onClick={() => setShowDeckModal(false)}>Close</button></div>
                        <div className="desc" style={{marginBottom: 20}}>Browse any deck created by the community for the <strong>{FORMATS[currentFormat].name}</strong> format. Your decks are shown first.</div>
                        <div style={{flex:1, overflowY:'auto', display:'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 15, paddingRight: 10}}>
                            {communityDecks.filter(d => d.format === currentFormat).sort((a,b) => (a.ownerId === code ? -1 : (b.ownerId === code ? 1 : 0))).map((d) => (
                                <div key={d.gunId} onClick={() => { setSelIdx(communityDecks.indexOf(d)); setShowDeckModal(false); }} className="deck-pill" style={{ 
                                    borderColor: communityDecks[selIdx]?.gunId === d.gunId ? 'var(--gold)' : 'rgba(255,255,255,0.1)',
                                    background: d.ownerId === code ? 'rgba(255,214,68,0.1)' : 'rgba(255,255,255,0.05)'
                                }}>
                                    <div className="deck-pill-info">
                                        <div className="deck-pill-dot" style={{background: `var(--${d.color?.toLowerCase()})`}}></div>
                                        <span className="deck-pill-name">{d.name}</span>
                                        <span className="deck-pill-count">⚔️ {d.playedCount || 0}</span>
                                    </div>
                                    <div className="deck-pill-actions">
                                        <button onClick={(e) => { e.stopPropagation(); setViewOnlyDeck(d); setView("deckbuilder"); setShowDeckModal(false); }} className="pill-btn" title="View">👁️</button>
                                        {d.ownerId === code && (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingDeckIdx(communityDecks.indexOf(d)); setView("deckbuilder"); setShowDeckModal(false); }} className="pill-btn pill-btn--edit" title="Edit">✏️</button>
                                                <button onClick={(e) => deleteDeck(d, e)} className="pill-btn pill-btn--delete" title="Delete">🗑️</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default LobbyModals;
