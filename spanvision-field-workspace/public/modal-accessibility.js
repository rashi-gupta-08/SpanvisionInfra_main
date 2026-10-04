// Keep keyboard navigation inside the existing application dialogs.
(function () {
  const dialogs=[...document.querySelectorAll('.modal')];
  let previous=document.activeElement;
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('.modal'))previous=event.target.closest('button,a,input,select,textarea')||document.activeElement;},true);
  document.addEventListener('keydown',()=>{if(!document.activeElement.closest('.modal'))previous=document.activeElement;},true);
  const returnFocus=new WeakMap();
  for(const dialog of dialogs) {
    dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
    const title=dialog.querySelector('.modal-header h3');
    if(title){if(!title.id)title.id=dialog.id+'-title';dialog.setAttribute('aria-labelledby',title.id);}
    new MutationObserver(()=>{
      if(dialog.classList.contains('active')) {
        returnFocus.set(dialog,previous);
        if(!dialog.contains(document.activeElement))dialog.querySelector('button,input,select,textarea')?.focus();
      } else if(dialog.contains(document.activeElement)) {
        const element=returnFocus.get(dialog);if(element?.isConnected)element.focus();
      }
    }).observe(dialog,{attributes:true,attributeFilter:['class']});
  }
  document.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const dialog=dialogs.findLast(el=>el.classList.contains('active'));if(!dialog)return;
    const items=[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const first=items[0],last=items.at(-1);
    if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first?.focus();}
  });
})();
