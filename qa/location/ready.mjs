export async function waitForPreview() {
 const deadline=Date.now()+45000;
 while(Date.now()<deadline){
  try{
   const response=await fetch('http://127.0.0.1:4230/__suite/status',{signal:AbortSignal.timeout(1500)});
   const status=await response.json();
   if(status.modules?.length===16&&status.modules.every(m=>m.available))return status;
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,400));
 }
 throw new Error('The suite preview did not become ready within 45 seconds.');
}
