import React, { useState } from 'react';
import { Preview } from "./components.jsx";
import { FORMATS } from "./engine.js";

const DeckBuilder = ({ cards, initialDeck, onSave, onExit, readOnly = false, currentFormat }) => {
    const [selectedFormat, setSelectedFormat] = useState(initialDeck?.format || currentFormat || 'CLASSIC');
    const [deck, setDeck] = useState(() => {
        if (!initialDeck) return [];
        const full = [];
        const deckCards = typeof initialDeck.cards === 'string' ? JSON.parse(initialDeck.cards) : initialDeck.cards;
        deckCards.forEach(dc => {
            const info = cards.find(c => c.id === dc.id && c.set_id === dc.set_id);
            if (info) {
                for (let i = 0; i < dc.count; i++) full.push({ ...info, instanceId: Math.random().toString(36).substr(2, 9) });
            }
        });
        return full;
    });
    const [filter, setFilter] = useState("All");
    const [selectedSet, setSelectedSet] = useState("All"); // Set filter state
    const [preview, setPreview] = useState(null);
    const [deckName, setDeckName] = useState(initialDeck?.name || "Custom Deck");

    const addCard = (card) => {
        if (readOnly || deck.length >= 40) return;
        const count = deck.filter(c => c.name === card.name).length;
        if (count >= 4) return;
        setDeck([...deck, { ...card, instanceId: Math.random().toString(36).substr(2, 9) }]);
    };

    const removeCard = (idx) => {
        if (readOnly) return;
        setDeck(deck.filter((_, i) => i !== idx));
    };

    const formatInfo = FORMATS[selectedFormat];
    const cardsInFormat = cards.filter(c => formatInfo.sets.includes(c.set_id || 'dm-01'));
    
    const setFiltered = selectedSet === "All" 
        ? cardsInFormat
        : cardsInFormat.filter(c => c.set_id === selectedSet);

    const filteredCards = filter === "All" 
        ? setFiltered 
        : setFiltered.filter(c => c.civilizations?.includes(filter));
    
    // In readOnly mode, we show only the cards in the deck
    const displayCards = readOnly ? [...new Set(deck.map(c => c.name))].map(name => deck.find(c => c.name === name)) : filteredCards;

    const [isMobile] = useState(window.innerWidth <= 932);
    
    return (
        <div className={`db-layout ${readOnly ? 'db-layout--readonly' : ''} ${isMobile ? 'db-layout--mobile' : ''}`}>
            {!isMobile && preview && <Preview card={preview} />}

            <div className="db-catalog" style={readOnly ? { flex: 1 } : {}}>
                <div className="db-catalog-header">
                    <div style={{display:'flex', flexDirection:'column', gap:4}}>
                        <h2 style={{fontSize: isMobile ? 14 : 20}}>{readOnly ? `Viewing Deck: ${deckName}` : "Card Catalog"}</h2>
                        {!readOnly && (
                            <div className="format-selector--mini">
                                {Object.values(FORMATS).map(f => (
                                    <button 
                                        key={f.id} 
                                        className={`format-btn-mini ${selectedFormat === f.id ? 'active' : ''}`}
                                        onClick={() => {
                                            if (deck.length > 0 && !window.confirm("Changing format will clear your current deck if it has incompatible cards. Continue?")) return;
                                            setSelectedFormat(f.id);
                                            setDeck([]); // Clear deck when switching format to be safe
                                        }}
                                    >
                                        {f.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {!readOnly && (
                        <div className="db-filters">
                            <div className="db-filter-row">
                                {["All", "Light", "Water", "Darkness", "Fire", "Nature"].map(c => (
                                    <button key={c} className={`civ-filter-btn ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
                                        {isMobile ? c[0] : c}
                                    </button>
                                ))}
                            </div>
                            <div className="db-filter-row">
                                <span style={{fontSize:9, opacity:0.5, alignSelf:'center', marginRight:4}}>SETS:</span>
                                {["All", ...formatInfo.sets].map(s => (
                                    <button key={s} className={`set-filter-btn ${selectedSet === s ? 'active' : ''}`} 
                                            style={{fontSize:8, padding:'2px 4px', background: selectedSet === s ? 'var(--gold)' : 'rgba(255,255,255,0.1)', border:'none', color: selectedSet === s ? 'black' : 'white', borderRadius:4, cursor:'pointer'}}
                                            onClick={() => setSelectedSet(s)}>
                                        {s.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {readOnly && <button className="btn-secondary" onClick={onExit}>Back to Lobby</button>}
                </div>
                <div className="db-catalog-grid">
                    {displayCards.map(c => {
                        const count = deck.filter(x => x.name === c.name).length;
                        return (
                            <div key={`${c.set_id}-${c.id}-${c.name}`} className={`card ${isMobile ? 'card--md' : 'card--md'} ${!readOnly && count >= 4 ? 'limit-reached' : ''}`}
                                 onClick={() => {
                                     if (isMobile) {
                                         if (preview?.id === c.id) {
                                             addCard(c);
                                         } else {
                                             setPreview(c);
                                         }
                                     } else {
                                         addCard(c);
                                     }
                                 }}
                                 onMouseEnter={() => !isMobile && setPreview(c)}
                                 onMouseLeave={() => !isMobile && setPreview(null)}
                                 style={{cursor: readOnly ? 'default' : 'pointer', opacity: 1, filter: 'none'}}>
                                <img src={`./cards/${c.set_id || 'dm-01'}/${c.image_file}`} alt={c.name} />
                                {count > 0 && <div className="power-gem" style={{background:'var(--gold)', color:'black', top: -5, right: -5, bottom: 'auto', borderRadius: '50%', width: 18, height: 18, fontSize: 9}}>{count}</div>}
                                {isMobile && <div className="mobile-preview-hint" onClick={(e) => { e.stopPropagation(); setPreview(c); }}>ℹ️</div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {isMobile && !readOnly && (
                <div className="db-preview-pane">
                    {preview ? <Preview card={preview} /> : <div className="preview-empty">Tap card for info</div>}
                </div>
            )}

            {!readOnly && (
                <div className="db-deck-pane">
                    <div className="db-deck-header">
                        <input value={deckName} onChange={e => setDeckName(e.target.value)}
                               style={{background:'none', border:'none', borderBottom:'1px solid var(--gold)', color:'var(--gold)', font:'inherit', fontWeight:900, width:'100%', outline:'none', fontSize: isMobile ? 12 : 16}} />
                        <div style={{fontSize:10, marginTop:4, opacity:0.6}}>Format: {FORMATS[selectedFormat].name} • {deck.length} / 40</div>
                    </div>
                    
                    <div className="db-deck-list">
                        {deck.map((c, i) => (
                            <div key={c.instanceId} className={`db-deck-card card ${isMobile ? 'card--xs' : 'card--xs'}`}
                                 onClick={() => removeCard(i)}
                                 onMouseEnter={() => !isMobile && setPreview(c)}
                                 onMouseLeave={() => !isMobile && setPreview(null)}>
                                <img src={`./cards/${c.set_id || 'dm-01'}/${c.image_file}`} alt={c.name} />
                            </div>
                        ))}
                    </div>
                    <div className="db-footer">
                        <button className="btn-primary" onClick={() => onSave({ name: deckName, cards: deck, format: selectedFormat })} disabled={deck.length !== 40}>Save</button>
                        <button className="btn-secondary" onClick={onExit}>Exit</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeckBuilder;
