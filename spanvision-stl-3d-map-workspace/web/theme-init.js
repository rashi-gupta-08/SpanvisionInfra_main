// Apply the saved preference before painting; legacy storage keys stay compatible.
(()=>{let saved=null;try{saved=localStorage.getItem('oststl.theme');}catch{}const value=saved===null?'spanvision-mono':saved;if(['spanvision-mono','light','dark',''].includes(value)){if(value)document.documentElement.dataset.theme=value;else document.documentElement.removeAttribute('data-theme');}})();
