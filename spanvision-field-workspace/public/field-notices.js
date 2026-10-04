(function () {
  const button=document.getElementById('field-about');
  const dialog=document.getElementById('field-notices');
  if(!button||!dialog)return;
  button.addEventListener('click',()=>dialog.showModal());
  dialog.querySelector('.notices-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>button.focus());
})();
