import { useState } from 'react';
import Modal from '../Modal';
import { BRAND } from '../../branding';
import './FeedbackDialog.css';
export default function FeedbackDialog({open,onClose}: {open: boolean; onClose: () => void}) {
  const [message,setMessage]=useState('');
  const [saved,setSaved]=useState(false);
  const save=()=>{
    const blob=new Blob([BRAND.product+'\n'+BRAND.organization+' · v'+BRAND.version+'\n\n'+message.trim()+'\n'],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='spanvision-feedback.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setSaved(true);
  };
  return <Modal open={open} onClose={onClose} title={BRAND.organization+' · Feedback'} footer={<button className="settings-btn settings-btn-primary" disabled={message.trim().length<10} onClick={save}>Save feedback</button>}>
    <div className="geo-feedback"><p>Save a feedback note to share with your team. This workspace keeps it on your device.</p>
      <label htmlFor="geo-feedback">Your feedback</label><textarea id="geo-feedback" value={message} maxLength={5000} rows={7} onChange={event=>{setMessage(event.target.value);setSaved(false);}} placeholder="Describe what happened or what would help…" />
      <small>At least 10 characters.</small>{saved&&<p role="status">Feedback saved to your downloads.</p>}
    </div>
  </Modal>;
}
