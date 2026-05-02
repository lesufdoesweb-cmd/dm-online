import React from 'react';
const CARD_BACK = "/cards/bg.png";

export const PlayerHUD = ({ gs, avail, isLocked, waitingForOpponent, endTurn, setSearchingDeck, onLeave }) => {
    return (
        <div className="game-hud">
            <div className="hud-section"><div className="hud-label">Your Deck</div><div className="pile-counter"><div className="pile-icon" style={{ backgroundImage: `url(${CARD_BACK})` }} /><div className="pile-num">{gs.deck.length}</div></div></div>
            <div className="hud-section"><div className="hud-label">Mana</div><div className="mana-counter"><div className="mana-counter-text">{avail}<span className="mc-sep">/</span>{gs.mana.length}</div></div></div>
            <div className="end-turn-wrap"><button className={`end-turn ${(!isLocked && gs.turn) ? 'end-turn--active' : 'end-turn--waiting'}`} onClick={() => !isLocked && endTurn()}>{gs.turn ? (waitingForOpponent ? 'Wait...' : 'End Turn') : 'Waiting'}</button></div>
            <div className="hud-section"><div className="hud-label">Graveyard</div><div className="pile-counter"><div className="pile-icon" style={{ backgroundImage: gs.graveyard.length ? `url(./cards/${gs.graveyard[gs.graveyard.length-1].set_id || 'dm-01'}/${gs.graveyard[gs.graveyard.length-1].image_file})` : `url(${CARD_BACK})`, filter: 'brightness(0.5) saturate(0.5)' }} /><div className="pile-num" style={{ color: 'var(--fire)' }}>{gs.graveyard.length}</div></div></div>
            <button className="btn-danger btn-xs" style={{margin: '0 10px'}} onClick={onLeave}>Leave</button>
            <div className="hud-divider" /><div className="utility-btns">
                <button className="btn-secondary btn-xs" onClick={() => setSearchingDeck({ message: "Graveyard", customList: gs.graveyard, isViewOnly: true, filter: () => true })}>Grave</button>
                <button className="btn-secondary btn-xs" onClick={() => setSearchingDeck({ message: "Mana Zone", customList: gs.mana, isViewOnly: true, filter: () => true })}>Mana</button>
                <button className="btn-secondary btn-xs" onClick={() => setSearchingDeck({ message: "Your Deck", customList: gs.deck, isViewOnly: true, filter: () => true })}>Deck</button>
            </div>
        </div>
    );
};

export const OpponentHUD = ({ gs, oppAvail, isConnected, setSearchingDeck }) => {
    return (
        <div className="opp-hud">
            <div className="opp-info-tag">
                Opponent
                <span className={`conn-status ${isConnected ? 'conn-status--on' : 'conn-status--off'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                </span>
            </div>
            <div className="hud-section"><div className="hud-label">Opp Mana</div><div className="opp-mana-counter"><div className="opp-counter-text">{oppAvail}/{gs.opponent.mana.length}</div></div></div>
            <div className="hud-section"><div className="hud-label">Opp Grave</div><div className="pile-counter"><div style={{ width:36, height:50, borderRadius:4, background:`url(${CARD_BACK})`, backgroundSize:'cover', border:'1px solid rgba(255,60,60,0.2)', filter:'brightness(0.5) saturate(0.5)', boxShadow:'0 2px 6px rgba(0,0,0,0.5)' }} /><div className="pile-num" style={{ color: 'var(--fire)', fontSize: 11 }}>{gs.opponent.graveyard?.length || 0}</div></div></div>
            <div className="hud-divider" />
            <div className="utility-btns">
                <button className="btn-secondary btn-xs" onClick={() => setSearchingDeck({ message: "Opponent Graveyard", customList: gs.opponent.graveyard, isViewOnly: true })}>Opp Grave</button>
                <button className="btn-secondary btn-xs" onClick={() => setSearchingDeck({ message: "Opponent Mana Zone", customList: gs.opponent.mana, isViewOnly: true })}>Opp Mana</button>
            </div>
        </div>
    );
};

