import { useEffect, useState, useRef } from 'react';
import { useModal } from '../useModal';
import { XCircle } from 'lucide-react';

interface ReconstructionProgressDialogProps {
  open: boolean;
  phase: string;
  percent: number;
  onCancel: () => void;
}

export function ReconstructionProgressDialog({
  open,
  phase,
  percent,
  onCancel,
}: ReconstructionProgressDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useModal(ref, onCancel, open);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) return;
    const startTime = Date.now();
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 200);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const seconds = Math.floor(elapsed / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <dialog ref={ref} className="recon-progress-panel workspace-dialog" aria-labelledby="recon-title">
        <div className="recon-progress-header">
          <span className="recon-progress-title" id="recon-title">Surface Reconstruction</span>
          <button className="recon-progress-close-btn" onClick={onCancel} title="Cancel">
            <XCircle size={16} />
          </button>
        </div>

        <div className="recon-progress-body">
          <div className="recon-progress-phase">{phase}</div>

          <div className="recon-progress-bar-track" role="progressbar" aria-label="Reconstruction progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clampedPercent}>
            <div
              className="recon-progress-bar-fill"
              style={{ width: `${clampedPercent}%` }}
            />
          </div>

          <div className="recon-progress-info">
            <span>{clampedPercent}%</span>
            <span>Elapsed: {timeStr}</span>
          </div>
        </div>

        <div className="recon-progress-footer">
          <button className="recon-progress-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
    </dialog>
  );
}
