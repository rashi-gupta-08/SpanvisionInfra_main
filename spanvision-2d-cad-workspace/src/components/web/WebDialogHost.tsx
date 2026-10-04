import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { finishWebDialog, getDialog, subscribeDialog, type WebDialogRequest } from '../../services/web/dialogService';

function Dialog({ request }: { request: WebDialogRequest }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [input, setInput] = useState(request.input?.value ?? '');
  const [selection, setSelection] = useState(request.select?.value ?? '');
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} className="web-dialog" data-web-modal aria-labelledby="web-dialog-title"
      onCancel={event => { event.preventDefault(); finishWebDialog(null); }}>
      <form onSubmit={event => {
        event.preventDefault();
        const action = request.actions.find(item => item.primary) ?? request.actions[0];
        if (action) finishWebDialog({ action: action.value, input, selection });
      }}>
        <div className="web-dialog-heading">
          <h2 id="web-dialog-title">{request.title}</h2>
          <button type="button" aria-label="Close dialog" onClick={() => finishWebDialog(null)}><X size={18} /></button>
        </div>
        {request.message && <p className="web-dialog-message">{request.message}</p>}
        {request.input && <label className="web-field">{request.input.label}
          <input autoFocus value={input} required onChange={event => setInput(event.target.value)} />
          {request.input.suffix && <small>{request.input.suffix}</small>}
        </label>}
        {request.select && <label className="web-field">{request.select.label}
          <select value={selection} onChange={event => setSelection(event.target.value)}>
            {request.select.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>}
        <div className="web-dialog-actions">
          {request.actions.map(action => <button key={action.value} type="button" className={action.primary ? 'web-primary' : ''}
            disabled={Boolean(action.primary && request.input && !input.trim())}
            onClick={() => finishWebDialog({ action: action.value, input: input.trim(), selection })}>{action.label}</button>)}
        </div>
      </form>
    </dialog>
  );
}

export function WebDialogHost() {
  const request = useSyncExternalStore(subscribeDialog, getDialog);
  return request ? <Dialog key={request.id} request={request} /> : null;
}
