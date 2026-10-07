// Local gallery setup only. Opens real controls; never invokes a final save/submit.
const params=new URLSearchParams(location.search),view=params.get('reviewView');
const pause=()=>new Promise(resolve=>setTimeout(resolve,100));
async function find(select:()=>Element|undefined|null){for(let i=0;i<200;i++){const el=select();if(el)return el;await pause();}throw Error('Local pictured-state setup was unavailable. Open its controls manually.');}
async function click(label:string){const e=await find(()=>[...document.querySelectorAll('[role="button"],button,[role="radio"]')].find(e=>(e.getAttribute('aria-label')||e.textContent||'').trim()===label || ['State','Continue'].includes(label)&&(e.getAttribute('aria-label')||e.textContent||'').trim().startsWith(label)));(e as HTMLElement).click();await pause();}
async function text(label:string){const e=await find(()=>[...document.querySelectorAll('div,span')].find(e=>e.childElementCount===0&&e.textContent?.trim()===label));(e as HTMLElement).click();await pause();}
async function fill(label:string,value:string){const e=await find(()=>[...document.querySelectorAll('input,textarea')].find(e=>e.getAttribute('aria-label')===label)) as HTMLInputElement;const setter=Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')!.set!;setter.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true}));await pause();}
async function ready(){await find(()=>document.body.innerText.includes('Loading actual screen.')?null:document.querySelector('[role="button"],button'));}
async function setup(){if(!view)return;await ready();
 if(view.startsWith('business-new:')){
  await text('Continue during preview');
  if(!view.endsWith(':identity')){await fill('Business name (required)','Synthetic workshop');await text('Continue');}
  if(['location','review'].some(x=>view.endsWith(':'+x))){await text('Continue');await fill('Street address','100 Synthetic Street');await fill('City','Hammond');await click('State');await click('LA');}
  if(view.endsWith(':review'))await text('Continue');
 }
 if(view.startsWith('booking:')&&!view.endsWith(':service')){
  await click('Continue to times');await find(()=>[...document.querySelectorAll('[role="radio"]')].find(e=>(e.getAttribute('aria-label')||e.textContent||'').trim()==='12:00'));
  if(['contact','review'].some(x=>view.endsWith(':'+x))){await click('12:00');await click('Continue to contact details');await fill('Your name','Synthetic visitor');await fill('Phone number','5550130402');await fill('Email address','');}
  if(view.endsWith(':review'))await click('Review appointment');
 }
 if(view==='event-review:editor')await text('Local fixture: coffee tasting');
 if(view==='review:reply')await text('Synthetic review: friendly pickup and a fresh cup of coffee.');
 if(view==='request-form:edit')await text('1. Can we access the work area?');
 if(view==='request-form:preview')await click('Preview customer form');
 if(view==='calendar:detail'){const e=await find(()=>[...document.querySelectorAll('[role="button"]')].find(e=>e.getAttribute('aria-label')?.startsWith('Local fixture: coffee tasting, Bayou')));(e as HTMLElement).click();}
 if(view.startsWith('order:')&&!view.endsWith(':menu')){
  await click('Choose options for Seasonal coffee with oat milk');
  if(!view.endsWith(':customization')){
   const radio=await find(()=>[...document.querySelectorAll('[role="radio"]')].find(e=>(e.getAttribute('aria-label')||e.textContent||'').includes('Oat milk')));(radio as HTMLElement).click();await click('Increase Seasonal coffee with oat milk quantity');const add=await find(()=>[...document.querySelectorAll('[role="button"]')].find(e=>(e.getAttribute('aria-label')||e.textContent||'').includes('Add to order')));(add as HTMLElement).click();await pause();const cart=await find(()=>[...document.querySelectorAll('[role="button"]')].find(e=>(e.getAttribute('aria-label')||e.textContent||'').includes('View cart')));(cart as HTMLElement).click();await pause();
  }
  if(['contact','review'].some(x=>view.endsWith(':'+x))){await click('Choose pickup time');const soon=await find(()=>[...document.querySelectorAll('[role="radio"]')].find(e=>e.getAttribute('aria-label')?.startsWith('Soonest available')));(soon as HTMLElement).click();await click('Continue');}
  if(view.endsWith(':review')){await fill('Full name','Local review customer');await fill('Phone number','2255550100');await click('Review order');}
 }
 document.documentElement.dataset.reviewSetup='ready';
 // Return to the top without losing the entered state; the viewer can scroll normally.
 for(const e of document.querySelectorAll('*'))if((e as HTMLElement).scrollTop)(e as HTMLElement).scrollTop=0;
}
void setup().catch(error=>{document.documentElement.dataset.reviewSetup='manual';document.documentElement.dataset.reviewSetupError=error.message;console.warn('LOCAL_GALLERY_SETUP',error.message);});
