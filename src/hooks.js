import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export function useNetwork(conn) {
    const handlers = useRef({});
    const pending = useRef(null);
    const on = useCallback((t, h) => { handlers.current[t] = h; }, []);
    
    const isSocket = conn && typeof conn.emit === 'function';

    const send = useCallback((t, p) => { 
        if (isSocket && conn.connected) {
             conn.emit('game_action', { type: t, payload: p, ts: Date.now() });
        } else if (conn?.open) { 
             conn.send({ type: t, payload: p, ts: Date.now() }); 
        } 
    }, [conn, isSocket]);

    const sync = useCallback((g) => {
        if (pending.current) clearTimeout(pending.current);
        pending.current = setTimeout(() => {
            const s = typeof g === 'function' ? g() : g;
            send("SYNC", s);
            pending.current = null;
        }, 50); // Small 50ms debounce
    }, [send]);
    
    const [isOpen, setIsOpen] = useState(isSocket ? conn.connected : (conn?.open || false));

    useEffect(() => {
        if (!conn) {
            setIsOpen(false);
            return;
        }
        
        setIsOpen(isSocket ? conn.connected : conn.open);
        
        const h = d => { const fn = handlers.current[d.type]; if (fn) fn(d.payload); };
        const onOpen = () => setIsOpen(true);
        const onClose = () => setIsOpen(false);

        if (isSocket) {
            conn.on('game_action', h);
            conn.on('connect', onOpen);
            conn.on('disconnect', onClose);
            return () => {
                conn.off('game_action', h);
                conn.off('connect', onOpen);
                conn.off('disconnect', onClose);
                if (pending.current) clearTimeout(pending.current);
            };
        } else {
            conn.on('data', h);
            conn.on('open', onOpen);
            conn.on('close', onClose);
            if (conn.on) conn.on('error', onClose);
            
            return () => {
                if (conn.off) {
                    conn.off('data', h);
                    conn.off('open', onOpen);
                    conn.off('close', onClose);
                    conn.off('error', onClose);
                } else if (conn.removeListener) {
                    // Just in case
                }
                if (pending.current) clearTimeout(pending.current);
            };
        }
    }, [conn, isSocket]);

    return useMemo(() => ({ on, send, sync, isOpen }), [on, send, sync, isOpen]);
}

export function useDrag(onDrop) {
    const [dragging, setDragging] = useState(null);
    const start = useCallback((e, card) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        const ox = e.clientX - r.left, oy = e.clientY - r.top;
        setDragging({ card, x: e.clientX - ox, y: e.clientY - oy, w: r.width, h: r.height });
        const mv = ev => { ev.preventDefault(); setDragging(p => p ? { ...p, x: ev.clientX - ox, y: ev.clientY - oy } : null); };
        const up = ev => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); onDrop(card, { x: ev.clientX, y: ev.clientY }); setDragging(null); };
        document.addEventListener('mousemove', mv);
        document.addEventListener('mouseup', up);
    }, [onDrop]);
    return { dragging, start };
}

export function useArrowDrag(onArrowDrop) {
    const [arrow, setArrow] = useState(null);
    const startArrow = useCallback((e, card) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
        setArrow({ card, sx, sy, ex: e.clientX, ey: e.clientY });
        const mv = ev => { ev.preventDefault(); setArrow(p => p ? { ...p, ex: ev.clientX, ey: ev.clientY } : null); };
        const up = ev => {
            document.removeEventListener('mousemove', mv);
            document.removeEventListener('mouseup', up);
            onArrowDrop(card, { x: ev.clientX, y: ev.clientY });
            setArrow(null);
        };
        document.addEventListener('mousemove', mv);
        document.addEventListener('mouseup', up);
    }, [onArrowDrop]);
    return { arrow, startArrow };
}
