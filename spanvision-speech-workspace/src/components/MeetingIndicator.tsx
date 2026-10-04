import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { listen } from '@tauri-apps/api/event';
import { runtime } from '../lib/runtime';

export default function MeetingIndicator() {
    const [state, setState] = createSignal<'recording' | 'transcribing' | 'paused'>('recording');
    const [elapsed, setElapsed] = createSignal(0);
    let timerInterval: number | undefined;

    const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600).toString().padStart(2, '0');
        const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    onMount(() => {
        if (runtime.preview) return;
        timerInterval = window.setInterval(() => {
            if (state() !== 'paused') setElapsed(prev => prev + 1);
        }, 1000);

        const unlisten = listen('meeting-indicator-state', (e: any) => setState(e.payload as any));
        onCleanup(() => {
            if (timerInterval) clearInterval(timerInterval);
            unlisten.then(f => f());
        });
    });

    const dotColor = () => {
        switch (state()) {
            case 'recording': return 'var(--theme-accent)';
            case 'transcribing': return 'var(--theme-accent)';
            case 'paused': return 'var(--theme-text-muted)';
        }
    };

    return (
        <><style>{`@keyframes indicator-spin{to{transform:rotate(360deg)}}`}</style>
        <div role="status" aria-label={`Meeting ${state()}`} title={`Meeting ${state()}`} style={{
            display: 'inline-flex', 'align-items': 'center', gap: '6px',
            background: 'var(--theme-bg-card)', 'border-radius': '20px', padding: '6px 14px',
            'box-shadow': '0 2px 8px rgba(0,0,0,0.3)',
            'font-family': 'system-ui, sans-serif',
            cursor: 'move', '-webkit-app-region': 'drag',
        }}>
            <div style={{
                width: '8px', height: '8px', background: dotColor(), 'border-radius': '50%',
                'box-shadow': state() !== 'paused' ? `0 0 6px ${dotColor()}` : 'none',
            }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke={state() === 'paused' ? 'var(--theme-text-muted)' : 'var(--theme-text)'} stroke-width="2"
                 style={{animation:state()==='transcribing'?'indicator-spin 1s linear infinite':'none'}}>
                <Show when={state()==='paused'}><path d="M8 4v16M16 4v16"/></Show>
                <Show when={state()==='transcribing'}><circle cx="12" cy="12" r="9" stroke-dasharray="42 15"/></Show>
                <Show when={state()==='recording'}>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                </Show>
            </svg>
            <span style={{
                color: state() === 'paused' ? 'var(--theme-text-muted)' : 'var(--theme-text)',
                'font-size': '11px', 'font-weight': '500', 'font-variant-numeric': 'tabular-nums',
            }}>
                {formatTime(elapsed())}
            </span>
        </div></>
    );
}
