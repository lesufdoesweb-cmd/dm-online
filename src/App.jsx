import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import Gun from 'gun/gun';
import { DECKS } from './decks.js';
import GameBoard from './GameBoard.jsx';
import DeckBuilder from './DeckBuilder.jsx';
import { FORMATS } from './engine.js';

const gun = Gun({ peers: ["//dm-online.fun/gun"], localStorage: true });
const LOBBY_KEY = 'tcg_duel_masters_lobby_v3';
const DECKS_KEY = 'tcg_dm_community_decks_v2';

const App = () => {
    const [cards, setCards] = useState([]);
    const [peer, setPeer] = useState(null);
    const [conn, setConn] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [code, setCode] = useState("");
    const [view, setView] = useState("home");
    const [jc, setJc] = useState("");
    const [loading, setLoading] = useState(true);
    const [selIdx, setSelIdx] = useState(0);
    const [toasts, setToasts] = useState([]);
    const [playerName, setPlayerName] = useState("");
    const [pendingRequest, setPendingRequest] = useState(null);
    const [isNaming, setIsNaming] = useState(false);
    const [waitingPlayers, setWaitingPlayers] = useState([]);
    const [isReady, setIsReady] = useState(false);
    const [communityDecks, setCommunityDecks] = useState([]);
    const [showDeckModal, setShowDeckModal] = useState(false);
    const [editingDeckIdx, setEditingDeckIdx] = useState(null);
    const [viewOnlyDeck, setViewOnlyDeck] = useState(null);
    const [reconnectPending, setReconnectPending] = useState(null);
    const [currentFormat, setCurrentFormat] = useState(() => localStorage.getItem('dm_preferred_format') || 'CLASSIC');

    const toast = useCallback((msg, type = "info") => {
        const id = Date.now();
        setToasts(p => [...p, { id, message: msg, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
    }, []);

    const exitGame = useCallback(() => {
        const targetPeer = conn?.peer || reconnectPending?.opponentId;
        if (targetPeer) {
            localStorage.removeItem(`dm_gs_${targetPeer}`);
            localStorage.removeItem(`dm_logs_${targetPeer}`);
        }
        setConn(null);
        setReconnectPending(null);
        setView("home");
        localStorage.removeItem("dm_active_game");
    }, [conn, reconnectPending]);

    const handleLeave = () => {
        if (conn && conn.open) {
            conn.send({ type: 'LEAVE_GAME' });
            setTimeout(() => conn.close(), 100);
        }
        exitGame();
        toast("You left the duel");
    };

    const handleDiscard = () => {
        if (reconnectPending) {
            localStorage.removeItem(`dm_gs_${reconnectPending.opponentId}`);
            localStorage.removeItem(`dm_logs_${reconnectPending.opponentId}`);
        }
        localStorage.removeItem("dm_active_game");
        setReconnectPending(null);
        toast("Saved game discarded");
    };

    const handleResume = () => {
        if (!reconnectPending || !peer) return;
        const { opponentId, isHost: wasHost } = reconnectPending;
        setIsHost(wasHost);
        if (!wasHost) {
            const c = peer.connect(opponentId);
            c.on('open', () => { c.send({ type: 'RECONNECT_REQUEST', payload: { name: playerName } }); });
            setupConnection(c);
        }
        setView("game");
        setReconnectPending(null);
    };

    const incrementPlayedCount = (deck) => {
        if (!deck || !deck.gunId) return;
        gun.get(DECKS_KEY).get(deck.gunId).get('playedCount').put((deck.playedCount || 0) + 1);
    };

    const setupConnection = useCallback((c) => {
        c.on('data', data => {
            if (data.type === 'CONNECT_REQUEST' || data.type === 'RECONNECT_REQUEST') {
                const activeGame = JSON.parse(localStorage.getItem('dm_active_game'));
                if (data.type === 'RECONNECT_REQUEST' && activeGame && activeGame.opponentId === c.peer) {
                    c.send({ type: 'CONNECT_ACCEPT', payload: { name: playerName } });
                    setConn(c); setIsHost(activeGame.isHost); setView("game");
                    toast("Reconnected to duel!", "success");
                    return;
                }
                if (data.type === 'CONNECT_REQUEST') {
                    localStorage.removeItem(`dm_gs_${c.peer}`);
                    localStorage.removeItem(`dm_logs_${c.peer}`);
                }
                setPendingRequest({ conn: c, name: data.payload.name });
            }
            if (data.type === 'CONNECT_ACCEPT') {
                localStorage.removeItem(`dm_gs_${c.peer}`);
                localStorage.removeItem(`dm_logs_${c.peer}`);
                setConn(c); setIsHost(false); setView("game");
                localStorage.setItem("dm_active_game", JSON.stringify({ opponentId: c.peer, isHost: false }));
                incrementPlayedCount(communityDecks[selIdx]);
                toast("Connected to " + data.payload.name, "success");
            }
            if (data.type === 'CONNECT_REJECT') { toast("Challenge declined", "error"); c.close(); }
            if (data.type === 'LEAVE_GAME') { toast("Opponent left the game"); exitGame(); }
        });
        c.on('close', () => { toast("Connection lost. Refresh to attempt reconnection.", "error"); });
    }, [exitGame, toast, communityDecks, selIdx, playerName]);

    useEffect(() => {
        const adjectives = ["Brave", "Ancient", "Mystic", "Iron", "Swift", "Wild", "Solar", "Dark"];
        const nouns = ["Duelist", "Guardian", "Dragon", "Warrior", "Mage", "Beast", "Oracle", "Walker"];
        let savedName = localStorage.getItem("dm_player_name");
        if (!savedName) {
            savedName = adjectives[Math.floor(Math.random() * adjectives.length)] + " " + nouns[Math.floor(Math.random() * nouns.length)];
            localStorage.setItem("dm_player_name", savedName);
        }
        setPlayerName(savedName);

        const sets = ["dm-01", "dm-02", "dm-03", "dm-04"];
        Promise.all(sets.map(s => fetch(`/cards/${s}/metadata.json`).then(r => r.json())))
            .then(allSets => { setCards(allSets.flat()); setLoading(false); }).catch(() => setLoading(false));

        let savedId = localStorage.getItem('dm_peer_id_v2');
        if (!savedId) { savedId = Math.random().toString(36).substr(2, 9); localStorage.setItem('dm_peer_id_v2', savedId); }
        
        const p = new Peer('dm-' + savedId);
        p.on('open', id => {
            setCode(id);
            const activeGame = JSON.parse(localStorage.getItem('dm_active_game'));
            if (activeGame && activeGame.opponentId) {
                setReconnectPending(activeGame);
            }
        });
        p.on('connection', c => setupConnection(c));
        setPeer(p);

        // Fetch Decks
        gun.get(DECKS_KEY).map().on((data, id) => {
            if (!data) { setCommunityDecks(prev => prev.filter(d => d.gunId !== id)); return; }
            const deck = { ...data, gunId: id, format: data.format || 'CLASSIC' };
            try { deck.cards = JSON.parse(data.cards); } catch(e) { deck.cards = []; }
            setCommunityDecks(prev => {
                const filtered = prev.filter(d => d.gunId !== id);
                return [...filtered, deck].sort((a, b) => (b.playedCount || 0) - (a.playedCount || 0));
            });
        });

        return () => { if (p) p.destroy(); };
    }, []);

    useEffect(() => {
        if (!code || view !== 'home') return;
        const lobby = gun.get(LOBBY_KEY);
        const playerRef = lobby.get(code);
        const updatePresence = () => playerRef.put({ id: code, name: playerName, isReady: isReady, lastSeen: Date.now(), format: currentFormat });
        updatePresence();
        const heartbeat = setInterval(updatePresence, 5000);
        const handleUnload = () => playerRef.put({ isReady: false, lastSeen: 0 });
        window.addEventListener('beforeunload', handleUnload);
        lobby.map().on((data, id) => {
            if (!data || id === code) return;
            const isStale = !data.lastSeen || (Date.now() - data.lastSeen > 15000);
            setWaitingPlayers(prev => {
                const filtered = prev.filter(p => p.id !== id);
                if (data.isReady && !isStale && data.format === currentFormat) return [...filtered, { ...data, id }];
                return filtered;
            });
        });
        return () => { clearInterval(heartbeat); window.removeEventListener('beforeunload', handleUnload); playerRef.put({ isReady: false }); };
    }, [code, playerName, isReady, view, currentFormat]);

    const saveCommunityDeck = (deck) => {
        const deckData = {
            name: deck.name,
            color: deck.cards[0]?.civilizations?.[0] || "Neutral",
            ownerId: code,
            ownerName: playerName,
            playedCount: 0,
            createdAt: Date.now(),
            format: deck.format || currentFormat,
            cards: JSON.stringify(deck.cards.reduce((acc, c) => {
                const existing = acc.find(x => x.id === c.id && x.set_id === c.set_id);
                if (existing) existing.count++; else acc.push({ id: c.id, set_id: c.set_id, count: 1 });
                return acc;
            }, []))
        };
        if (editingDeckIdx !== null && communityDecks[editingDeckIdx]) {
            gun.get(DECKS_KEY).get(communityDecks[editingDeckIdx].gunId).put(deckData);
        } else {
            gun.get(DECKS_KEY).set(deckData);
        }
        setEditingDeckIdx(null); setView("home"); toast("Deck published!");
    };

    const deleteDeck = (deck, e) => {
        e.stopPropagation();
        if (deck.ownerId !== code) { toast("Only the creator can delete this deck!", "error"); return; }
        gun.get(DECKS_KEY).get(deck.gunId).put(null);
        toast("Deck deleted");
    };

    const acceptRequest = () => {
        if (!pendingRequest) return;
        const { conn: c } = pendingRequest;
        localStorage.removeItem(`dm_gs_${c.peer}`);
        localStorage.removeItem(`dm_logs_${c.peer}`);
        c.send({ type: 'CONNECT_ACCEPT', payload: { name: playerName } });
        setConn(c); setIsHost(true); setView("game"); setPendingRequest(null);
        localStorage.setItem("dm_active_game", JSON.stringify({ opponentId: c.peer, isHost: true }));
        incrementPlayedCount(communityDecks[selIdx]);
    };

    const join = (targetId = null) => { 
        const tid = (targetId || jc).trim();
        if (!tid || !peer) return;
        if (tid === code) { toast("You cannot challenge yourself!", "error"); return; } 
        toast("Challenging " + tid.substring(3, 9) + "...", "info");
        const c = peer.connect(tid); 
        const connTimeout = setTimeout(() => { if (!c.open) { toast("Opponent unavailable", "error"); c.close(); } }, 10000);
        c.on('open', () => { 
            clearTimeout(connTimeout);
            c.send({ type: 'CONNECT_REQUEST', payload: { name: playerName } }); 
            toast("Challenge sent!", "success"); 
        }); 
        setupConnection(c);
    };

    if (loading || !cards.length) return <div className="loading"><div className="ring" /><p>Loading...</p></div>;

    if (view === "game") return <GameBoard cards={cards} deck={communityDecks[selIdx]} conn={conn} isHost={isHost} onLeave={handleLeave} />;
    
    if (view === "deckbuilder") {
        const initialDeck = editingDeckIdx !== null ? communityDecks[editingDeckIdx] : viewOnlyDeck;
        return <DeckBuilder 
            cards={cards} 
            initialDeck={initialDeck} 
            readOnly={!!viewOnlyDeck}
            onSave={saveCommunityDeck} 
            onExit={() => { 
                setView("home"); 
                setEditingDeckIdx(null); 
                setViewOnlyDeck(null);
            }} 
        />;
    }

    return (
        <div className="lobby">
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
                        <div className="search-header"><h2>Community Decks</h2><button className="btn-secondary" onClick={() => setShowDeckModal(false)}>Close</button></div>
                        <div className="desc" style={{marginBottom: 20}}>Browse any deck created by the community. Your decks are shown first.</div>
                        <div style={{flex:1, overflowY:'auto', display:'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 15, paddingRight: 10}}>
                            {[...communityDecks].sort((a,b) => (a.ownerId === code ? -1 : (b.ownerId === code ? 1 : 0))).map((d) => (
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
            <div className="toast-layer">{toasts.map(t => (<div key={t.id} className={`toast toast--${t.type}`} style={{animation:'toast-in 0.3s ease-out forwards'}}>{t.type === 'error' ? '⚠️' : '✨'} {t.message}</div>))}</div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 20}}>
                <div>
                    <h1 style={{margin: 0}}>Duel<span>Masters</span></h1>
                    <div className="format-selector">
                        {Object.values(FORMATS).map(f => (
                            <button 
                                key={f.id} 
                                className={`format-btn ${currentFormat === f.id ? 'active' : ''}`}
                                onClick={() => {
                                    setCurrentFormat(f.id);
                                    localStorage.setItem('dm_preferred_format', f.id);
                                    toast(`Switched to ${f.name} format`);
                                }}
                            >
                                {f.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="player-tag" onClick={() => setIsNaming(true)}><span className="player-tag-label">DUELIST</span><span className="player-tag-name">{playerName} ✏️</span></div>
            </div>
            <div className="lobby-grid">
                <div className="lobby-panel" style={{display:'flex', flexDirection:'column'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><h2>Deck Library</h2><button className="btn-secondary btn-xs" onClick={() => setView("deckbuilder")}>+ New Deck</button></div>
                    <p className="sub">Top played {FORMATS[currentFormat].name} decks</p>
                    <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, marginTop:10, paddingRight:5}}>
                        {communityDecks.filter(d => d.format === currentFormat).slice(0, 8).map((d, i) => (
                            <div key={d.gunId || i} onClick={() => setSelIdx(communityDecks.indexOf(d))} style={{ padding: '12px 16px', borderRadius: 8, cursor: 'pointer', background: communityDecks[selIdx]?.gunId === d.gunId ? 'rgba(255,214,68,0.15)' : 'rgba(255,255,255,0.03)', border: communityDecks[selIdx]?.gunId === d.gunId ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s', position: 'relative' }}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><span style={{fontWeight: 700, color: communityDecks[selIdx]?.gunId === d.gunId ? 'var(--gold)' : 'var(--cream)'}}>{d.name}</span><div style={{display:'flex', alignItems:'center', gap:8}}>
                                        <button onClick={(e) => { e.stopPropagation(); setViewOnlyDeck(d); setView("deckbuilder"); }} style={{background:'none', border:'none', color:'var(--ice)', cursor:'pointer', fontSize: 10, padding: 4}}>👁️</button><span style={{fontSize: 9, opacity: 0.4}}>⚔️ {d.playedCount || 0}</span><div style={{width:10, height:10, borderRadius:'50%', background: `var(--${d.color?.toLowerCase()})`}}></div></div></div>
                            </div>
                        ))}
                    </div>
                    <button className="btn-primary" style={{marginTop: 15, width: '100%'}} onClick={() => setShowDeckModal(true)}>Browse All Decks</button>
                </div>
                <div className="lobby-panel" style={{display:'flex', flexDirection:'column'}}>
                    <h2>Manual Connection</h2><p className="sub">Host or join via code</p>
                    <div style={{marginTop: 15, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8}}>
                        <h3 style={{fontSize: 10, color: 'var(--gold)', marginBottom: 8}}>YOUR HOST CODE</h3>
                        {code ? (<div className="lobby-code-box" style={{padding: '8px 0'}}><span className="lobby-code" style={{fontSize: 14}} onClick={() => { navigator.clipboard.writeText(code); toast("Code copied!"); }}>{code}</span></div>) : <p style={{fontSize: 12}}>Generating...</p>}
                    </div>
                    <div style={{marginTop: 15}}><h3 style={{fontSize: 10, color: 'var(--gold)', marginBottom: 8}}>JOIN OPPONENT</h3><div style={{display:'flex', gap: 0}}><input className="lobby-input" style={{fontSize: 12, height: 32, borderRadius: '4px 0 0 4px', borderRight: 'none'}} placeholder="Paste Code..." value={jc} onChange={e => setJc(e.target.value)} /><button className="btn-primary" style={{height: 32, padding: '0 12px', fontSize: 11, borderRadius: '0 4px 4px 0'}} onClick={() => join()}>Connect</button></div></div>
                    <div style={{marginTop: 'auto', paddingTop: 20, textAlign: 'center'}}>
                        <h2>Duel Status</h2><button className={`ready-btn ${isReady ? 'ready-btn--active' : ''}`} onClick={() => setIsReady(!isReady)} style={{marginTop: 10, width: '100%'}}>{isReady ? 'READY FOR DUEL' : 'MARK AS READY'}</button>
                    </div>
                </div>
                <div className="lobby-panel" style={{display:'flex', flexDirection:'column'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><h2>Waiting Room</h2><span className="status-dot" style={{background: isReady ? '#4caf50' : '#777'}}></span></div>
                    <p className="sub">Ready duelists appear here</p>
                    <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, marginTop:10, paddingRight:5}}>
                        {waitingPlayers.length === 0 && <div className="empty-text" style={{fontSize:11, opacity:0.4, textAlign:'center', marginTop:20}}>No other duelists ready...</div>}
                        {waitingPlayers.map((p) => (<div key={p.id} className="player-item"><div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><span style={{fontWeight: 700}}>{p.name}</span><span style={{fontSize:9, opacity:0.5}}>{p.id.substring(3, 9)}...</span></div><button className="btn-primary btn-xs" style={{marginTop:8, width:'100%', fontSize:10}} onClick={() => join(p.id)}>Challenge</button></div>))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
