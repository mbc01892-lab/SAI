import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Almacenamiento con dos respaldos:
 *  - Netlify Blobs cuando corre en Netlify (strong consistency, escritura condicional por ETag).
 *  - Archivos en DATA_DIR para desarrollo local o servidores con disco (Docker/VPS).
 * Las claves son cadenas arbitrarias; los valores son JSON.
 */
export type Rec={data:any;etag:string};
/** ifMatch: undefined = escribir siempre; null = solo si no existe; string = solo si el ETag coincide. */
export type SetOpts={ifMatch?:string|null};

const onNetlify=()=>!!(process.env.NETLIFY||process.env.NETLIFY_BLOBS_CONTEXT||process.env.NETLIFY_LOCAL);
export const DATA_DIR=process.env.DATA_DIR||join(process.cwd(),'data');
const enc=(k:string)=>encodeURIComponent(k).replace(/%/g,'_');

/* ---------- Respaldo en archivos ---------- */
function fsKv(){
  const dir=join(DATA_DIR,'kv'),fdir=join(DATA_DIR,'files');
  mkdirSync(dir,{recursive:true});mkdirSync(fdir,{recursive:true});
  const p=(k:string)=>join(dir,enc(k)+'.json');
  return {
    async get(key:string):Promise<Rec|null>{try{const r=JSON.parse(readFileSync(p(key),'utf8'));return {data:r.data,etag:String(r.rev)}}catch{return null}},
    // Lectura-comprobación-escritura síncronas: atómicas dentro del proceso.
    async set(key:string,data:any,o:SetOpts={}):Promise<boolean>{
      let rev=0;try{rev=JSON.parse(readFileSync(p(key),'utf8')).rev}catch{rev=-1}
      if(o.ifMatch===null&&rev!==-1)return false;
      if(typeof o.ifMatch==='string'&&String(rev)!==o.ifMatch)return false;
      const tmp=p(key)+'.tmp';writeFileSync(tmp,JSON.stringify({rev:rev+1,data}));renameSync(tmp,p(key));return true;
    },
    async putFile(key:string,bytes:Uint8Array,type:string){writeFileSync(join(fdir,key),bytes);writeFileSync(join(fdir,key+'.type'),type)},
    async getFile(key:string){const f=join(fdir,key);if(!existsSync(f))return null;let type='application/octet-stream';try{type=readFileSync(f+'.type','utf8')}catch{}return {bytes:new Uint8Array(readFileSync(f)),type}},
    async delFile(key:string){for(const f of [join(fdir,key),join(fdir,key+'.type')])try{unlinkSync(f)}catch{}},
  };
}

/* ---------- Respaldo en Netlify Blobs ---------- */
async function blobsKv(){
  const {getStore}=await import('@netlify/blobs');
  // El fetch parcheado por Next puede quedarse colgado al descartar el cuerpo de una respuesta 404/204
  // (clave inexistente). Se leen esas respuestas completas y se devuelven como Response limpia.
  const safeFetch=async(u:any,o:any)=>{const r=await fetch(u,o);if(r.status===404||r.status===204){await r.arrayBuffer();return new Response(null,{status:r.status,headers:r.headers})}return r};
  const kv=getStore({name:'sociedad',consistency:'strong',fetch:safeFetch as any}),files=getStore({name:'evidencias',consistency:'strong',fetch:safeFetch as any});
  return {
    async get(key:string):Promise<Rec|null>{const r=await kv.getWithMetadata(key,{type:'json'});return r?{data:r.data,etag:r.etag as string}:null},
    async set(key:string,data:any,o:SetOpts={}):Promise<boolean>{
      const opt=o.ifMatch===null?{onlyIfNew:true}:typeof o.ifMatch==='string'?{onlyIfMatch:o.ifMatch}:{};
      return (await kv.setJSON(key,data,opt)).modified;
    },
    async putFile(key:string,bytes:Uint8Array,type:string){await files.set(key,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,{metadata:{type}})},
    async getFile(key:string){const r=await files.getWithMetadata(key,{type:'arrayBuffer'});return r?{bytes:new Uint8Array(r.data),type:String((r.metadata as any)?.type||'application/octet-stream')}:null},
    async delFile(key:string){await files.delete(key)},
  };
}

type Backend=ReturnType<typeof fsKv>;
const g=globalThis as any;
export async function store():Promise<Backend>{
  if(!g.__saStore)g.__saStore=onNetlify()?await blobsKv():fsKv();
  return g.__saStore;
}
