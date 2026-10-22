"use client";
import {useEffect,useState} from 'react';
import Image from 'next/image';

export default function SplashScreen(){
 const [phase,setPhase]=useState('visible');
 useEffect(()=>{
  const fade=window.setTimeout(()=>setPhase('leaving'),1400);
  const finish=window.setTimeout(()=>setPhase('done'),2050);
  return ()=>{window.clearTimeout(fade);window.clearTimeout(finish);};
 },[]);
 if(phase==='done')return null;
 return <div className={'qb-splash '+phase} role="status" aria-label="Opening Que Bros Perfumery">
  <div className="qb-splash-halo"/>
  <div className="qb-splash-brand"><Image src="/qb-logo-light.png" alt="Que Bros Perfumery" width={280} height={126} priority/>
   <span>THE BOUTIQUE WORKSPACE</span><i/><p>A refined beginning.</p>
  </div>
 </div>;
}
