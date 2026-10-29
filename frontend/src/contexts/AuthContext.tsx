import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { storage } from '@/src/utils/storage';
import { clearMyopsLaunchTicketFromUrl, clearStoredMyopsAccessToken, endMyopsSession, extractMyopsLaunchTicket, OPSFLOW_API_TOKEN_KEY, redeemMyopsLaunchTicket, refreshMyopsSession, opsflowRequest, type OpsFlowProfile } from '@/src/services/myopsAppAccess';
export type Role = 'admin' | 'manager' | 'cashier';
export interface UserProfile extends OpsFlowProfile { status?: string; createdAt?: any; }
type User = { uid: string; email: string };
interface AuthCtx {
 user: User | null; profile: UserProfile | null; loading: boolean;
 register: (email: string,password: string,displayName: string,companyName?: string,onStatusChange?: (message: string)=>void)=>Promise<void>;
 login: (email: string,password: string,companyName?: string,rememberMe?: boolean)=>Promise<void>;
 forgotPassword: (email: string)=>Promise<void>; logout: ()=>Promise<void>; refreshProfile: ()=>Promise<void>;
 joinCompanyByCode: (code: string)=>Promise<{ companyId: string; role: Role }>;
}
const AuthContext=createContext<AuthCtx | undefined>(undefined);
export function AuthProvider({children}:{children:React.ReactNode}) {
 const [user,setUser]=useState<User|null>(null),[profile,setProfile]=useState<UserProfile|null>(null),[loading,setLoading]=useState(true);
 const clear=useCallback(async()=>{setUser(null);setProfile(null);setLoading(false);await clearStoredMyopsAccessToken();await Promise.all(['auth:user','auth:profile','auth:company','auth:workspace'].map(key=>storage.removeItem(key)));},[]);
 const adopt=useCallback((next:UserProfile)=>{if(!next?.uid||!next.companyId||!['admin','manager','cashier'].includes(next.role))throw new Error('Invalid OpsFlow identity');setUser({uid:next.uid,email:next.email||''});setProfile(next);setLoading(false);},[]);
 const refreshProfile=useCallback(async()=>{adopt(await opsflowRequest('/api/auth/me'));},[adopt]);
 const logout=useCallback(async()=>{const token=await storage.secureGet<string|null>(OPSFLOW_API_TOKEN_KEY,null);await clear();if(token)await endMyopsSession(token);},[clear]);
 useEffect(()=>{
  let alive=true,busy=false;
  const launch=async(url:string|null)=>{
   if(busy)return;busy=true;
   try {
    const ticket=url?extractMyopsLaunchTicket(url):null;
    if(ticket){await clearMyopsLaunchTicketFromUrl();const result=await redeemMyopsLaunchTicket(ticket);if(!alive){await endMyopsSession(result.accessToken);return;}await storage.secureSet(OPSFLOW_API_TOKEN_KEY,result.accessToken);adopt(result.profile);}
    else {const token=await storage.secureGet<string|null>(OPSFLOW_API_TOKEN_KEY,null);if(!token||!await refreshMyopsSession(token,false)){if(alive)await clear();return;}const next=await opsflowRequest('/api/auth/me');if(alive)adopt(next);}
   }catch{if(alive)await clear();}finally{busy=false;}
  };
  void Linking.getInitialURL().then(launch).catch(()=>{if(alive)void clear();});
  const sub=Linking.addEventListener('url',({url})=>{void launch(url);});
  const hash=()=>{if(typeof window!=='undefined')void launch(window.location.href);};
  if(typeof window!=='undefined')window.addEventListener('hashchange',hash);
  return()=>{alive=false;sub.remove();if(typeof window!=='undefined')window.removeEventListener('hashchange',hash);};
 },[adopt,clear]);
 useEffect(()=>{
  if(!user||typeof document==='undefined')return;
  let lastActivity=Date.now(),lastSent=lastActivity,busy=false;
  const activity=(event:Event)=>{if(event.isTrusted&&document.visibilityState==='visible')lastActivity=Date.now();};
  const events=['pointerdown','keydown','touchstart','scroll'];events.forEach(name=>document.addEventListener(name,activity,{passive:true}));
  const timer=setInterval(()=>{if(busy)return;void(async()=>{busy=true;try{if(Date.now()-lastActivity>=15*60_000){await logout();await Linking.openURL('https://www.myops.com.my/login');return;}const token=await storage.secureGet<string|null>(OPSFLOW_API_TOKEN_KEY,null);const sent=lastActivity;if(!token||!await refreshMyopsSession(token,sent>lastSent))await logout();else lastSent=sent;}finally{busy=false;}})();},10_000);
  return()=>{clearInterval(timer);events.forEach(name=>document.removeEventListener(name,activity));};
 },[logout,user?.uid]);
 const central=useCallback(async()=>{await Linking.openURL('https://www.myops.com.my/');},[]);
 const login=useCallback(async()=>{await central();throw new Error('Sign in through MYOPS');},[central]);
 const register=useCallback(async()=>{await central();throw new Error('Register through MYOPS');},[central]);
 const forgotPassword=useCallback(async()=>{await central();},[central]);
 const joinCompanyByCode=useCallback(async(_code:string):Promise<{companyId:string;role:Role}>=>{throw new Error('Company invitations are not enabled during the staging migration.');},[]);
 const value=useMemo(()=>({user,profile,loading,login,register,forgotPassword,logout,refreshProfile,joinCompanyByCode}),[user,profile,loading,login,register,forgotPassword,logout,refreshProfile,joinCompanyByCode]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const ctx=useContext(AuthContext);if(!ctx)throw new Error('useAuth must be used inside AuthProvider');return ctx;}
