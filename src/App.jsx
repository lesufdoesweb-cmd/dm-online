import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import Gun from 'gun/gun';
import { DECKS } from './decks.js';
import GameBoard from './GameBoard.jsx';
import MobileGameBoard from './MobileGameBoard.jsx';
import DeckBuilder from './DeckBuilder.jsx';
import MobileLobby from './MobileLobby.jsx';
import DesktopLobby from './DesktopLobby.jsx';
import LobbyModals from './LobbyModals.jsx';
import { FORMATS } from './engine.js';
import { StatusBar } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';
import { SplashScreen } from '@capacitor/splash-screen';

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
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 932);
    
    // Refs for stable callbacks
    const playerNameRef = useRef(playerName);
    const selIdxRef = useRef(selIdx);
    const communityDecksRef = useRef(communityDecks);
    const currentFormatRef = useRef(currentFormat);
    const connRef = useRef(null);
    const setupConnectionRef = useRef(null);

    useEffect(() => { playerNameRef.current = playerName; }, [playerName]);
    useEffect(() => { selIdxRef.current = selIdx; }, [selIdx]);
    useEffect(() => { communityDecksRef.current = communityDecks; }, [communityDecks]);
    useEffect(() => { currentFormatRef.current = currentFormat; }, [currentFormat]);
    useEffect(() => { connRef.current = conn; }, [conn]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 932);
        window.addEventListener('resize', handleResize);
        
        const setImmersiveMode = async () => {
            try {
                await StatusBar.hide();
                await NavigationBar.hide();
                
                setTimeout(async () => {
                    await SplashScreen.hide();
                }, 500);
            } catch (e) {
                console.warn("Immersive mode setup failed", e);
                await SplashScreen.hide().catch(() => {});
            }
        };
        setImmersiveMode();

        // Heartbeat to keep it immersive (prevents bars coming back after keyboard/etc)
        const immersiveInterval = setInterval(async () => {
            try {
                await StatusBar.hide();
                await NavigationBar.hide();
            } catch {}
        }, 3000);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(immersiveInterval);
        };
    }, []);

    const toast = useCallback((msg, type = "info") => {
        const id = Date.now();
        setToasts(p => [...p, { id, message: msg, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
    }, []);

    const exitGame = useCallback(() => {
        const targetPeer = connRef.current?.peer || reconnectPending?.opponentId;
        if (targetPeer) {
            localStorage.removeItem(`dm_gs_${targetPeer}`);
            localStorage.removeItem(`dm_logs_${targetPeer}`);
        }
        setConn(null);
        setReconnectPending(null);
        setView("home");
        localStorage.removeItem("dm_active_game");
    }, [reconnectPending]);

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
        const c = peer.connect(opponentId);
        c.on('open', () => { c.send({ type: 'RECONNECT_REQUEST', payload: { name: playerName } }); });
        setupConnection(c);
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
                    c.send({ type: 'CONNECT_ACCEPT', payload: { name: playerNameRef.current, isReconnect: true } });
                    setConn(c); setIsHost(activeGame.isHost); setView("game");
                    toast("Reconnected to duel!", "success");
                    return;
                }
                if (data.type === 'CONNECT_REQUEST') {
                    if (data.payload.format && data.payload.format !== currentFormatRef.current) {
                        toast(`Declined: Opponent is playing ${data.payload.format} format`, "error");
                        c.send({ type: 'CONNECT_REJECT', payload: { reason: 'FORMAT_MISMATCH' } });
                        setTimeout(() => c.close(), 500);
                        return;
                    }
                    localStorage.removeItem(`dm_gs_${c.peer}`);
                    localStorage.removeItem(`dm_logs_${c.peer}`);
                }
                setPendingRequest({ conn: c, name: data.payload.name });
            }
            if (data.type === 'CONNECT_ACCEPT') {
                const activeGame = JSON.parse(localStorage.getItem('dm_active_game'));
                if (!data.payload?.isReconnect) {
                    localStorage.removeItem(`dm_gs_${c.peer}`);
                    localStorage.removeItem(`dm_logs_${c.peer}`);
                    setIsHost(false);
                    localStorage.setItem("dm_active_game", JSON.stringify({ opponentId: c.peer, isHost: false }));
                    incrementPlayedCount(communityDecksRef.current[selIdxRef.current]);
                } else if (activeGame && activeGame.opponentId === c.peer) {
                    setIsHost(activeGame.isHost);
                }
                setConn(c); setView("game");
                toast(data.payload?.isReconnect ? "Reconnected to duel!" : "Connected to " + data.payload.name, "success");
            }
            if (data.type === 'CONNECT_REJECT') { toast("Challenge declined", "error"); c.close(); }
            if (data.type === 'LEAVE_GAME') { toast("Opponent left the game"); exitGame(); }
        });
        c.on('close', () => { toast("Connection lost. Refresh to attempt reconnection.", "error"); });
    }, [exitGame, toast]);

    useEffect(() => { setupConnectionRef.current = setupConnection; }, [setupConnection]);

    useEffect(() => {
        const adjectives = ["Brave", "Ancient", "Mystic", "Iron", "Swift", "Wild", "Solar", "Dark"];
        const nouns = ["Duelist", "Guardian", "Dragon", "Warrior", "Mage", "Beast", "Oracle", "Walker"];
        let savedName = localStorage.getItem("dm_player_name");
        if (!savedName) {
            savedName = adjectives[Math.floor(Math.random() * adjectives.length)] + " " + nouns[Math.floor(Math.random() * nouns.length)];
            localStorage.setItem("dm_player_name", savedName);
        }
        setPlayerName(savedName);

        const sets = ["dm-01", "dm-02", "dm-03", "dm-04", "dm-05", "dm-06"];
        Promise.all(sets.map(s => fetch(`/cards/${s}/metadata.json`)
            .then(r => r.json())
            .then(data => data.map(c => ({ ...c, set_id: s })))
        )).then(allSets => { 
            const flat = allSets.flat();
            setCards(prev => prev.length > 0 ? prev : flat); 
            setLoading(false); 
        }).catch(() => setLoading(false));

        let savedId = localStorage.getItem('dm_peer_id_v2');
        if (!savedId) { savedId = Math.random().toString(36).substr(2, 9); localStorage.setItem('dm_peer_id_v2', savedId); }
        
        const p = new Peer('dm-' + savedId, {
            debug: 2,
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' }
                ]
            }
        });

        p.on('open', id => {
            setCode(id);
            const activeGame = JSON.parse(localStorage.getItem('dm_active_game'));
            if (activeGame && activeGame.opponentId) {
                setReconnectPending(activeGame);
            }
        });

        p.on('disconnected', () => {
            console.log("Peer server disconnected. Attempting to reconnect...");
            p.reconnect();
        });

        p.on('error', (err) => {
            console.error("PeerJS error:", err);
            if (err.type === 'network') {
                toast("Network error. PeerJS connection lost.", "error");
            }
        });

        p.on('connection', c => {
            if (setupConnectionRef.current) setupConnectionRef.current(c);
        });
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

        return () => { if (p) { p.destroy(); } };
    }, [toast]);

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
        const c = peer.connect(tid, {
            reliable: true,
            serialization: 'json'
        }); 
        const connTimeout = setTimeout(() => { if (!c.open) { toast("Opponent unavailable", "error"); c.close(); } }, 20000);
        c.on('open', () => { 
            clearTimeout(connTimeout);
            c.send({ type: 'CONNECT_REQUEST', payload: { name: playerName, format: currentFormat } }); 
            toast("Challenge sent!", "success"); 
        }); 
        setupConnection(c);
    };

    if (loading || !cards.length) return <div className="loading"><div className="ring" /><p>Loading...</p></div>;

    if (view === "game") {
        const BoardComponent = isMobile ? MobileGameBoard : GameBoard;
        return <BoardComponent cards={cards} deck={communityDecks[selIdx]} conn={conn} isHost={isHost} onLeave={handleLeave} />;
    }
    
    if (view === "deckbuilder") {
        const initialDeck = editingDeckIdx !== null ? communityDecks[editingDeckIdx] : viewOnlyDeck;
        return <DeckBuilder 
            cards={cards} 
            initialDeck={initialDeck} 
            readOnly={!!viewOnlyDeck}
            onSave={saveCommunityDeck} 
            currentFormat={currentFormat}
            onExit={() => { 
                setView("home"); 
                setEditingDeckIdx(null); 
                setViewOnlyDeck(null);
            }} 
        />;
    }

    const lobbyProps = {
        code, playerName, setPlayerName, isReady, setIsReady, waitingPlayers, 
        join, communityDecks, selIdx, setSelIdx, setShowDeckModal, showDeckModal,
        currentFormat, setCurrentFormat, setIsNaming, isNaming, jc, setJc, setView,
        setEditingDeckIdx, setViewOnlyDeck, deleteDeck, toast, reconnectPending,
        handleResume, handleDiscard, pendingRequest, acceptRequest, setPendingRequest,
        toasts
    };

    return (
        <>
            <LobbyModals {...lobbyProps} />
            {isMobile ? <MobileLobby {...lobbyProps} /> : <DesktopLobby {...lobbyProps} />}
        </>
    );
};

export default App;
