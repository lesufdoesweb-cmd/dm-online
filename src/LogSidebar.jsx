import React from 'react';
import { Toast } from './components.jsx';

export const LogSidebar = ({ logs, hover, unhover, setShowHistory, toasts }) => {
    return (
        <>
            <div className="toast-layer">{toasts.map(t => <Toast key={t.id} t={t} />)}</div>
            <div className="timeline-sidebar">
                <div className="timeline-title">⚔ Game Log</div>
                <div className="timeline-scroll">
                    {logs.map(log => (
                        <div key={log.id} 
                             className={`log-entry ${log.isOpponent ? 'log-entry--opp' : ''} log-entry--${log.type}`} 
                             title={log.time} 
                             onMouseEnter={() => log.card && hover(log.card)} 
                             onMouseLeave={() => log.card && unhover()}>
                            {log.card && <div className="log-thumb"><img src={`./cards/${log.card.set_id || 'dm-01'}/${log.card.image_file}`} alt="" /></div>}
                            <span className="log-icon">{log.type === 'attack' ? '⚔️' : log.type === 'spell' ? '✨' : log.type === 'summon' ? '👤' : log.type === 'shield' ? '🛡️' : log.type === 'mana' ? '💧' : log.type === 'battle' ? '💀' : '🔥'}</span>
                            <div className="log-text">{log.isOpponent ? <strong style={{color:'var(--fire-soft)', fontSize:7}}>OPP: </strong> : ''}{log.text}</div>
                        </div>
                    ))}
                </div>
                {logs.length > 0 && <button className="history-btn" onClick={() => setShowHistory(true)}>Full History ({logs.length})</button>}
            </div>
        </>
    );
};
