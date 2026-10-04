import {useRef} from 'react';
import {useModal} from './useModal';
export function FeedbackDialog({message,onClose}: {message:string;onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);useModal(ref,onClose);
  return <dialog ref={ref} className="feedback-dialog workspace-dialog" role="alertdialog" aria-labelledby="feedback-title" aria-describedby="feedback-message"><h2 id="feedback-title">Pointcloud Workspace</h2><p id="feedback-message">{message}</p><button className="sample-button" onClick={onClose}>OK</button></dialog>;
}
