"use client";
import { createContext,useContext,useState,useEffect,useCallback,type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname,useRouter } from 'next/navigation';
import { Menu,Search,Bell,ChevronDown,Sun,Moon,LogOut,User,Settings,Home,Package,ShoppingBag,Truck,Users,ChartNoAxesCombined,Receipt,Wallet,X } from 'lucide-react';
import { navigation } from '@/lib/suite/navigation';
import { str,type SuiteState } from '@/lib/suite/types';
import { SearchProvider } from '@/lib/context/SearchContext';
import { CurrencyProvider } from '@/lib/context/CurrencyContext';
type Context={state:SuiteState|null;loading:boolean;error:string;refresh:()=>Promise<void>;request:(path:string,data?:unknown,method?:string)=>Promise<unknown>};
const SuiteContext=createContext<Context|null>(null);
export function useSuite(){const value=useContext(SuiteContext);if(!value)throw new Error('Suite context missing');return value;}
export function SuiteShell({children}:{children:ReactNode}){
 const [state,setState]=useState<SuiteState|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[compact,setCompact]=useState(false),[mobile,setMobile]=useState(false),[profile,setProfile]=useState(false),[alerts,setAlerts]=useState(false),[query,setQuery]=useState(''),[dark,setDark]=useState(false),[collapsed,setCollapsed]=useState<Record<string,boolean>>({});
 const path=usePathname(),router=useRouter();
 const refresh=useCallback(async()=>{try{setError('');const r=await fetch('/api/suite/state',{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.message||'Unable to load boutique data');setState(data);}catch(e){setError(e instanceof Error?e.message:'Unable to load boutique data');}finally{setLoading(false);}},[]);
 useEffect(()=>{refresh();const value=localStorage.getItem('qb-pos-theme')==='dark';setDark(value);document.documentElement.dataset.qbTheme=value?'dark':'light';},[refresh]);
 useEffect(()=>{setMobile(false);setQuery('');setProfile(false);setAlerts(false);},[path]);
 async function request(resource:string,data?:unknown,method='POST'){const response=await fetch('/api/suite/'+resource,{method,headers:{'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});const json=await response.json();if(!response.ok)throw new Error(json.message||'Unable to save changes');await refresh();window.dispatchEvent(new Event('qb-currency-changed'));return json;}
 const icons:Record<string,typeof Home>={Dashboard:Home,Inventory:Package,Purchases:Truck,Sales:ShoppingBag,Invoices:Receipt,Customers:Users,Suppliers:Truck,Expenses:Wallet,Reports:ChartNoAxesCombined,Users:User,Settings};
 const href=(p:string)=>'/dashboard'+(p?'/'+p:'');
 const match=(p:string)=>path===href(p);
 const results=query.trim()?[
  ...(state?.products||[]).filter(p=>(p.name+' '+p.sku+' '+str(p.barcode)).toLowerCase().includes(query.toLowerCase())).map(p=>({label:p.name,caption:p.sku,path:'inventory/products?product='+p._id})),
  ...(state?.sales||[]).filter(s=>(s.orderNumber+' '+s.customerName).toLowerCase().includes(query.toLowerCase())).map(s=>({label:s.invoiceNumber||s.orderNumber,caption:s.customerName,path:'invoices/invoices?invoice='+s._id})),
  ...(state?.records||[]).filter(r=>r.kind==='customers'&&(str(r.data.name)+' '+str(r.data.email)).toLowerCase().includes(query.toLowerCase())).map(r=>({label:str(r.data.name),caption:str(r.data.email),path:'customers/customers'})),
 ].slice(0,8):[];
 return <SuiteContext.Provider value={{state,loading,error,refresh,request}}><SearchProvider><CurrencyProvider><div className={'suite-app '+(compact?'nav-collapsed':'')}>
 {mobile&&<button className="suite-scrim" aria-label="Close navigation" onClick={()=>setMobile(false)}/>}
 <aside className={'suite-nav '+(mobile?'is-open':'')}>
  <Link href="/dashboard" className="suite-logo"><Image src="/qb-logo-light.png" alt="Que Bros Perfumery" width={166} height={75} priority/><span>BOUTIQUE MANAGEMENT</span></Link>
  <nav aria-label="Boutique navigation">{navigation.map(group=><section key={group.label}><h2>{group.label}</h2>{group.items.map(item=>{
   const Icon=icons[item.label]||Package;const children='children'in item?item.children:undefined;const itemPath='path'in item?item.path:undefined;const active=children?.some(([,p])=>match(p))||itemPath!==undefined&&match(itemPath);
   return <div key={item.label}>{children?<><button className={'suite-nav-parent '+(active?'active':'')} aria-expanded={!collapsed[item.label]} onClick={()=>setCollapsed(v=>({...v,[item.label]:!v[item.label]}))}><Icon size={17}/><span>{item.label}</span><ChevronDown size={13} className={collapsed[item.label]?'turn':''}/></button>{!collapsed[item.label]&&<div className="suite-subnav">{children.map(([label,p])=><Link key={p} href={href(p)} aria-current={match(p)?'page':undefined} className={match(p)?'active':''}>{label}</Link>)}</div>}</>:<Link className={'suite-nav-parent '+(active?'active':'')} href={href(itemPath||'')} aria-current={active?'page':undefined}><Icon size={17}/><span>{item.label}</span></Link>}</div>;
  })}</section>)}</nav>
  <div className="suite-nav-user"><span className="suite-avatar">{state?.actor.name.split(' ').map(s=>s[0]).join('').slice(0,2)||'QB'}</span><div><b>{state?.actor.name||'Que Bros Team'}</b><small>{state?.actor.isOwner?'Boutique Owner':state?.actor.role||'Workspace'}</small></div></div>
 </aside>
 <div className="suite-main"><header className="suite-topbar"><button className="suite-icon" aria-label="Toggle navigation" onClick={()=>window.innerWidth>900?setCompact(v=>!v):setMobile(v=>!v)}><Menu size={20}/></button><div className="suite-search"><Search size={17}/><input aria-label="Search products, customers and invoices" placeholder="Search fragrances, customers, invoices…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={14}/></button>}{query&&<div className="suite-search-results">{results.length?results.map((r,i)=><Link key={i} href={href(r.path)} onClick={()=>setQuery('')}><b>{r.label}</b><small>{r.caption}</small></Link>):<p>No matching records</p>}</div>}</div>
 <div className="suite-top-actions"><button className="suite-icon" aria-label="Toggle light or dark theme" onClick={()=>{const value=!dark;setDark(value);document.documentElement.dataset.qbTheme=value?'dark':'light';localStorage.setItem('qb-pos-theme',value?'dark':'light');}}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><div className="suite-dropdown-wrap"><button className="suite-icon" aria-label="Notifications" onClick={()=>{setAlerts(v=>!v);setProfile(false);}}><Bell size={18}/>{state?.notifications.some(n=>!n.read)&&<i/>}</button>{alerts&&<div className="suite-dropdown suite-alerts"><h3>Boutique notifications</h3>{state?.notifications.length?state.notifications.map((n,i)=><button key={i} onClick={async()=>{await fetch(`/api/notifications/${str(n._id)}/read`,{method:'PATCH'});await refresh();}}><b>{str(n.title)}</b><small>{str(n.message)}</small></button>):<p>You’re all caught up.</p>}</div>}</div><div className="suite-dropdown-wrap"><button className="suite-profile-button" onClick={()=>{setProfile(v=>!v);setAlerts(false);}} aria-label="Account menu"><span className="suite-avatar">{state?.actor.name[0]||'Q'}</span><span><b>{state?.actor.name||'Que Bros'}</b><small>{state?.actor.role||'Boutique'}</small></span><ChevronDown size={13}/></button>{profile&&<div className="suite-dropdown"><p>{state?.actor.email}</p><Link href="/dashboard/profile"><User size={16}/>My Profile</Link><Link href="/dashboard/settings/general"><Settings size={16}/>Settings</Link><button onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});localStorage.removeItem('userEmail');localStorage.removeItem('userName');router.push('/auth/signin');router.refresh();}}><LogOut size={16}/>Sign Out</button></div>}</div></div></header>
 <main className="suite-content">{children}</main><footer className="suite-footer">© {new Date().getFullYear()} Que Bros Perfumery. Crafted for the boutique.</footer></div>
 </div></CurrencyProvider></SearchProvider></SuiteContext.Provider>;
}
