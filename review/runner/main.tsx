import './review-recipes';
import React,{Suspense,useState} from 'react';import {createRoot}from'react-dom/client';
import {View,ScrollView}from'react-native-web';
import {routes}from'./routes';import {business,products,product,quote,slot,order,fixtureNotice}from'./fixtures';
const p=new URLSearchParams(location.search);const screen=p.get('screen')||'explore';
class Boundary extends React.Component<any,{error:string|null}>{state={error:null};static getDerivedStateFromError(e:any){return{error:e.message}}componentDidCatch(error:any){console.error('REVIEW_RENDER_LIMIT',error.stack)}render(){return this.state.error?<div role="alert" style={{padding:24}}><h1>Render access limited</h1><p>{this.state.error}</p><p>This is a local preview adapter limitation, recorded in the tracker.</p></div>:this.props.children}}
async function getScreen(){
 if(['menu','cart','customization','checkout','status'].includes(screen)){
  const base=Object.values(routes)[0].split('/src/app/')[0]+'/src';
  const {PickupMenu}=await import(/* @vite-ignore */base+'/components/pickup/pickup-menu.tsx');
  const {PickupCart,PickupReview}=await import(/* @vite-ignore */base+'/components/pickup/pickup-checkout-steps.tsx');
  const {PickupItem}=await import(/* @vite-ignore */base+'/components/pickup/pickup-item.tsx');
  const {PickupStatus}=await import(/* @vite-ignore */base+'/components/pickup/pickup-status.tsx');
  const {PickupFlowLayout,PickupMerchantHeader,CustomerFlowNavigation}=await import(/* @vite-ignore */base+'/components/pickup/pickup-flow-layout.tsx');
  const {AppButton}=await import(/* @vite-ignore */base+'/components/app-button.tsx');
  const {ThemedText}=await import(/* @vite-ignore */base+'/components/themed-text.tsx');
  return {default:function OrderingScreen(){const[cart,setCart]=useState([{variationId:'coffee',quantity:2,modifierIds:['oat']}]);const[editing,setEditing]=useState<any>(screen==='customization'?product:null);const[next,setNext]=useState(screen);return <View style={{flex:1,backgroundColor:p.get('theme')==='dark'?'#0E1411':'#F4F2E9'}}><ScrollView contentContainerStyle={{padding:20,gap:24,paddingBottom:40}}><CustomerFlowNavigation title="Pickup order" onBack={()=>setNext('menu')}/><PickupMerchantHeader name={business.name} photos={business.business_photos} color={business.primary_color}/><ThemedText type="title">{next==='menu'?'Order ahead':next==='cart'?'Your cart':next==='checkout'?'Review your order':'Pickup order'}</ThemedText>{next==='menu'?<PickupMenu products={products} cart={cart} busy={false} onChoose={(x:any)=>setEditing(x)} onAdd={(x:any)=>setCart([...cart,{variationId:x.id,quantity:1,modifierIds:[]}])} onQuantity={(x:any,d:any)=>setCart(cart.map(l=>l.variationId===x.id?{...l,quantity:Math.max(1,l.quantity+d)}:l))}/>:next==='cart'?<PickupCart cart={cart} products={products} onEdit={(i:any)=>setEditing(products.find(x=>x.id===cart[i].variationId))} onRemove={(i:any)=>setCart(cart.filter((_,j)=>i!==j))} onQuantity={(i:any,d:any)=>setCart(cart.map((l,j)=>j===i?{...l,quantity:Math.max(1,l.quantity+d)}:l))}/>:next==='checkout'?<PickupReview cart={cart} products={products} quote={quote} slot={slot} recipient={{name:'Local review customer',phone:'2255550100'}} name="Local review customer" phone="2255550100" tip={0} onTip={()=>{}}/>:<PickupStatus order={order} busy={false} onRefresh={()=>{}} onCheckout={()=>{}} onNew={()=>setNext('menu')}/>}<AppButton label={next==='menu'?`View cart (${cart.reduce((n,l)=>n+l.quantity,0)})`:next==='cart'?'Choose pickup time':'Return to menu'} onPress={()=>setNext(next==='menu'?'cart':next==='cart'?'checkout':'menu')}/></ScrollView>{editing&&<PickupItem product={editing} onClose={()=>setEditing(null)} onSave={(x:any,ids:any,q:any)=>{setCart([{variationId:x.id,modifierIds:ids,quantity:q}]);setEditing(null)}}/>}</View>}}
 }
 const source=(routes as any)[screen]||(routes as any)['(tabs)/'+screen];if(!source)throw new Error('Unknown screen '+screen);return import(/* @vite-ignore */source);
}
const Screen=React.lazy(getScreen);createRoot(document.getElementById('root')!).render(<Boundary><Suspense fallback={<div style={{padding:24}}>Loading actual screen…</div>}><Screen/></Suspense></Boundary>);
document.documentElement.dataset.fixtureNotice=fixtureNotice;
