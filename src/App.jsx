import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { DECKS } from './decks.js';
import GameBoard from './GameBoard.jsx';
import MobileGameBoard from './MobileGameBoard.jsx';
import DeckBuilder from './DeckBuilder.jsx';
import MobileLobby from './MobileLobby.jsx';
import DesktopLobby from './DesktopLobby.jsx';
import LobbyModals from './LobbyModals.jsx';
import { FORMATS } from './engine.js';
import { LocalConn, BotEngine } from './bot.js';
import { StatusBar } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';
import { SplashScreen } from '@capacitor/splash-screen';

const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:8765' : 'https://dm-online.fun';

const socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'], // prefer websocket
    secure: true
});

const App = () => {
    const [cards, setCards] = useState([]);
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
        if (connRef.current && !connRef.current.isMock) {
            connRef.current.emit('leave_room');
        }
        setConn(null);
        setReconnectPending(null);
        setView("home");
        setIsReady(false); // Make sure they aren't marked as searching anymore
        localStorage.removeItem("dm_active_game");
    }, []);

    const handleLeave = () => {
        exitGame();
        toast("You left the duel");
    };

    const handleDiscard = () => {
        localStorage.removeItem("dm_active_game");
        setReconnectPending(null);
        toast("Saved game discarded");
    };

    const handleResume = () => {
        if (reconnectPending) {
            setIsHost(reconnectPending.isHost);
            socket.emit('rejoin_room', reconnectPending.opponentId, reconnectPending.isHost ? 'host' : 'client');
        } else {
            handleDiscard();
        }
    };

    const incrementPlayedCount = (deck) => {
        if (!deck || !deck.gunId) return;
        if (!deck.gunId.startsWith('local_')) {
             socket.emit('increment_deck_play', deck.gunId);
        }
    };

    useEffect(() => {
        try {
            const activeGame = JSON.parse(localStorage.getItem('dm_active_game'));
            if (activeGame && activeGame.opponentId) {
                setReconnectPending(activeGame);
            }
        } catch (e) {}

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

        socket.connect();
        
        socket.on('connect', () => {
             socket.emit('get_rooms');
        });

        socket.on('decks_update', (serverDecks) => {
             const parsedServerDecks = serverDecks.map(d => {
                 if (typeof d.cards === 'string') {
                     try {
                         return { ...d, cards: JSON.parse(d.cards) };
                     } catch (e) {
                         console.error("Failed to parse deck cards:", e);
                     }
                 }
                 return d;
             });
             const localDecks = DECKS.map((d, i) => ({ ...d, gunId: 'local_' + i, format: 'CLASSIC' }));
             setCommunityDecks([...parsedServerDecks.sort((a,b) => (b.playedCount||0) - (a.playedCount||0)), ...localDecks]);
        });

        socket.on('rooms_list', (rooms) => {
             const formatted = rooms.map(r => ({
                  id: r.id,
                  hostId: r.host,
                  name: r.name,
                  format: r.format,
                  isReady: true
             }));
             setWaitingPlayers(formatted.filter(p => p.format === currentFormatRef.current && p.hostId !== socket.id));
        });

        socket.on('room_created', (roomId) => {
             setCode(roomId); // Show room ID
             toast("Room created! Waiting for opponent...", "success");
        });

        socket.on('room_joined', (roomId) => {
             setCode(roomId);
             toast("Waiting for host to accept...", "info");
        });

        socket.on('join_accepted', () => {
             setIsHost(false);
             setConn(socket);
             setView("game");
             toast("Connected!", "success");
             incrementPlayedCount(communityDecksRef.current[selIdxRef.current]);
             localStorage.setItem("dm_active_game", JSON.stringify({ opponentId: code, isHost: false }));
        });

        socket.on('rejoin_accepted', (roomId) => {
             setCode(roomId);
             setConn(socket);
             setView("game");
             setReconnectPending(null);
             toast("Reconnected successfully!", "success");
        });

        socket.on('player_joined', (data) => {
             setPendingRequest({
                 id: data.id,
                 name: data.name,
                 format: data.format
             });
        });

        socket.on('room_error', (err) => {
             toast(err, "error");
             if (err === 'Game session expired or invalid.') {
                 handleDiscard();
             }
        });
        
        socket.on('join_rejected', (reason) => {
             toast("Join request rejected: " + reason, "error");
        });
        
        const onOpponentDisconnected = () => {
             toast("Opponent disconnected or left", "error");
             exitGame();
        };

        const onOpponentReconnected = () => {
             toast("Opponent reconnected!", "success");
        };

        socket.on('opponent_disconnected', onOpponentDisconnected);
        socket.on('opponent_reconnected', onOpponentReconnected);

        return () => {
            socket.off('connect');
            socket.off('decks_update');
            socket.off('rooms_list');
            socket.off('room_created');
            socket.off('room_joined');
            socket.off('join_accepted');
            socket.off('rejoin_accepted');
            socket.off('player_joined');
            socket.off('room_error');
            socket.off('join_rejected');
            socket.off('opponent_disconnected');
            socket.off('opponent_reconnected');
            socket.disconnect();
        };
    }, [toast, exitGame, reconnectPending]); 

    useEffect(() => {
         if (socket.connected) {
              socket.emit('get_rooms');
         }
    }, [currentFormat]);

    const saveCommunityDeck = (deck) => {
        const deckData = {
            name: deck.name,
            color: deck.cards[0]?.civilizations?.[0] || "Neutral",
            ownerId: socket.id,
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
            deckData.gunId = communityDecks[editingDeckIdx].gunId;
        }
        
        socket.emit('save_deck', deckData);
        setEditingDeckIdx(null); setView("home"); toast("Deck published!");
    };

    const deleteDeck = (deck, e) => {
        e.stopPropagation();
        if (deck.ownerId !== socket.id) { toast("Only the creator can delete this deck!", "error"); return; }
        socket.emit('delete_deck', deck.gunId);
        toast("Deck deleted");
    };

    const acceptRequest = () => {
        if (!pendingRequest) return;
        socket.emit('accept_join', pendingRequest.id);
        setConn(socket);
        setIsHost(true);
        setView("game");
        setPendingRequest(null);
        incrementPlayedCount(communityDecks[selIdx]);
        localStorage.setItem("dm_active_game", JSON.stringify({ opponentId: code, isHost: true }));
    };
    
    const declineRequest = () => {
        if (!pendingRequest) return;
        socket.emit('reject_join', pendingRequest.id, "Declined by host");
        setPendingRequest(null);
    };

    const startSinglePlayer = useCallback(() => {
        const playerDeck = communityDecksRef.current[selIdxRef.current];
        if (!playerDeck) {
            toast("Select a deck first!", "error");
            return;
        }

        const botDeck = DECKS[Math.floor(Math.random() * DECKS.length)];
        const bot = new BotEngine(cards, botDeck);
        const mockConn = new LocalConn(bot);

        const playerGoesFirst = Math.random() > 0.5;
        setIsHost(playerGoesFirst);
        setConn(mockConn);
        setView("game");
        
        incrementPlayedCount(playerDeck);

        setTimeout(() => {
            bot.initialize();
            if (!playerGoesFirst) {
                bot.handleAction("SYNC_TURN", { hostTurn: false });
            }
        }, 1000);
        
        toast(`Practicing against Bot (${botDeck.name})`);
    }, [cards, toast]);

    const join = (roomId = null) => {
        const targetId = (roomId || jc).trim();
        if (!targetId || !socket.connected) return;
        toast("Joining room...", "info");
        socket.emit('join_room', targetId, { name: playerName, format: currentFormat });
    };

    useEffect(() => {
         if (isReady && socket.connected && view === 'home') {
             socket.emit('create_room', { name: playerName, format: currentFormat });
         } else if (!isReady && socket.connected && view === 'home') {
             socket.emit('leave_room');
             setCode("");
             setPendingRequest(null);
         }
    }, [isReady, playerName, currentFormat, view]);

    if (loading || !cards.length) return <div className="loading"><div className="ring" /><p>Loading...</p></div>;

    if (view === "game") {
        const BoardComponent = isMobile ? MobileGameBoard : GameBoard;
        return <BoardComponent cards={cards} deck={communityDecks[selIdx]} conn={conn} isHost={isHost} gameId={code} onLeave={handleLeave} />;
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
        handleResume, handleDiscard, pendingRequest, acceptRequest, declineRequest, setPendingRequest,
        toasts, startSinglePlayer
    };

    return (
        <>
            <LobbyModals {...lobbyProps} />
            {isMobile ? <MobileLobby {...lobbyProps} /> : <DesktopLobby {...lobbyProps} />}
        </>
    );
};

export default App;