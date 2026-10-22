"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
const CurrencyContext=createContext('PHP');
export function CurrencyProvider({children}:{children:ReactNode}) {
 const [currency,setCurrency]=useState('PHP');
 const refresh=useCallback(async()=>{
  try {const response=await fetch('/api/settings/business');if(response.ok) {const data=await response.json();if(['PHP','USD','EUR','GBP','INR','BDT'].includes(data.currency)) setCurrency(data.currency);}} catch {}
 },[]);
 useEffect(()=>{refresh();window.addEventListener('qb-currency-changed',refresh);return()=>window.removeEventListener('qb-currency-changed',refresh);},[refresh]);
 return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}
export function useCurrency() {
 const currency=useContext(CurrencyContext);
 const formatMoney=(value:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency}).format(value);
 return {currency,formatMoney};
}
export function Money({value}:{value:number}) {return <>{useCurrency().formatMoney(value)}</>;}
export function CurrencyCode() {return <>{useCurrency().currency}</>;}
