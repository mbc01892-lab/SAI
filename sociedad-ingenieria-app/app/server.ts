import {cookies} from 'next/headers';
import {initial,fail} from './domain';
import {digest} from './security-core';
import {store} from './storage';

export const SESSION_COOKIE='sa-session';
export const SESSION_SECONDS=30*24*3600;
export class AuthError extends Error{}

/** Escritura con revisión (CAS por ETag): reintenta sobre la versión vigente. */
export async function transact(fn:(s:any)=>any){
  const kv=await store();
  for(let n=0;n<12;n++){
    const row=await kv.get('society');
    if(!row)fail('La sociedad aún no está inicializada.');
    const s=row.data,result=fn(s);
    if(await kv.set('society',s,{ifMatch:row.etag}))return {state:s,result};
  }
  fail('Hay actividad simultánea. Intenta de nuevo.');
}

export async function societyExists(){return !!(await (await store()).get('society'))}

export async function identity(){
  const jar=await cookies();const token=jar.get(SESSION_COOKIE)?.value;
  if(!token)throw new AuthError('Inicia sesión para continuar.');
  const row=await (await store()).get('session:'+await digest(token));
  const s=row?.data;
  if(!s||s.expires<=Date.now())throw new AuthError('Tu sesión venció. Inicia sesión de nuevo.');
  return {userId:s.user as string,email:s.email as string,displayName:s.name as string};
}

/** Crea la sociedad con la primera cuenta como jefe. Devuelve false si ya existía. */
export async function createSociety(u:any){
  const s:any=initial();
  s.members.push({id:u.userId,email:u.email.toLowerCase(),name:u.displayName,role:'admin'});
  s.committees.push({id:crypto.randomUUID(),name:'Comunicación',description:'Planificación de contenidos y redes sociales.',leader:u.userId,members:[u.userId],planner:true,content:[]});
  return (await store()).set('society',s,{ifMatch:null});
}

/** Enlaza integrantes pendientes (alta por correo) con su cuenta recién creada. */
export async function initialize(u:any){
  await transact(s=>{
    const m=s.members.find((m:any)=>m.email===u.email.toLowerCase()&&m.id.startsWith('pending:'));
    if(m){const old=m.id;m.id=u.userId;
      for(const c of s.committees){if(c.leader===old)c.leader=m.id;c.members=c.members.map((x:string)=>x===old?m.id:x)}
      for(const e of s.events){e.invited=e.invited.map((x:string)=>x===old?m.id:x);e.attendance.forEach((a:any)=>{if(a.user===old)a.user=m.id})}
      s.retentions.forEach((r:any)=>{if(r.user===old)r.user=m.id})}
  });
}

function expectedOrigin(req:Request){
  if(process.env.APP_ORIGIN)return process.env.APP_ORIGIN.replace(/\/$/,'');
  const url=new URL(req.url);
  const proto=req.headers.get('x-forwarded-proto')?.split(',')[0].trim()||url.protocol.replace(':','');
  const host=req.headers.get('x-forwarded-host')?.split(',')[0].trim()||req.headers.get('host')||url.host;
  return `${proto}://${host}`;
}
export function sameOrigin(req:Request){if(req.headers.get('origin')!==expectedOrigin(req))fail('Origen de solicitud inválido.');}
export const isSecure=(req:Request)=>expectedOrigin(req).startsWith('https://');
export const secureFlag=(req:Request)=>isSecure(req)?'; Secure':'';

/** Archivos de evidencia (las claves son UUID generados por el servidor). */
const UUID=/^[0-9a-f-]{36}$/;
const k=(key:string)=>{if(!UUID.test(key))fail('Archivo inexistente.');return key};
export const saveFile=async(key:string,data:Uint8Array,type:string)=>(await store()).putFile(k(key),data,type);
export const readStoredFile=async(key:string)=>(await store()).getFile(k(key));
export const deleteStoredFile=async(key:string)=>{try{await (await store()).delFile(k(key))}catch{}};

/** Lectura sin escritura: ejecuta fn sobre una copia del estado vigente. */
export async function readState(fn:(s:any)=>any){
  const row=await (await store()).get('society');
  if(!row)fail('La sociedad aún no está inicializada.');
  return {state:row.data,result:fn(row.data)};
}
