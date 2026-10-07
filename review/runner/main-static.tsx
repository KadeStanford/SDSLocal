import './review-recipes';
import React,{Suspense} from 'react';import {createRoot}from'react-dom/client';
import {routes}from'./routes';import {Colors}from'@/constants/theme';import {scheme,fixtureNotice}from'./fixtures';
const p=new URLSearchParams(location.search),screen=p.get('screen')||'explore';
document.body.style.backgroundColor=Colors[scheme].background;document.body.style.color=Colors[scheme].text;document.documentElement.style.colorScheme=scheme;
class Boundary extends React.Component<any,{error:string|null}>{state={error:null};static getDerivedStateFromError(e:any){return{error:e.message}}componentDidCatch(error:any){console.error('REVIEW_RENDER_LIMIT',error.stack)}render(){return this.state.error?<div role="alert" style={{padding:24}}><h1>Render access limited</h1><p>{this.state.error}</p><p>Local renderer boundary limitation.</p></div>:this.props.children}}
const Screen=React.lazy(async()=>{const source=(routes as any)[screen];if(!source)throw Error('Unknown screen '+screen);return source();});
createRoot(document.getElementById('root')!).render(<Boundary><Suspense fallback={<div style={{padding:24}}>Loading actual screen…</div>}><Screen/></Suspense></Boundary>);document.documentElement.dataset.fixtureNotice=fixtureNotice;