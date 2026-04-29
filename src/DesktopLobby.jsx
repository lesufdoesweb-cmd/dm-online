import React from 'react';
import { FORMATS } from './engine.js';

const DesktopLobby = ({
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
    toasts,
    setCurrentFormat,
    toast,
    jc,
    setJc,
    join,
    isReady,
    setIsReady,
    waitingPlayers,
    setIsNaming,
    playerName
}) => {
    return (
        <div className="lobby">
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
                                    const firstInFormat = communityDecks.find(d => d.format === f.id);
                                    if (firstInFormat) setSelIdx(communityDecks.indexOf(firstInFormat));
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

export default DesktopLobby;
