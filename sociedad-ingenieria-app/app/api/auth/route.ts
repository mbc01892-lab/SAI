import {timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {identity,initialize,createSociety,societyExists,sameOrigin,secureFlag,SESSION_COOKIE,SESSION_SECONDS} from '../../server';
import {store} from '../../storage';
import {fail} from '../../domain';
import {digest,passwordHash} from '../../security-core';

const same=(a:string,b:string)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const EMAIL=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function throttle(email:string,now:number){
  const kv=await store(),key='attempts:'+email;
  const row=await kv.get(key);let count=0,until=now+900000;
  if(row&&row.data.until>now){count=row.data.count;until=row.data.until}
  if(count>=5)fail('Demasiados intentos. Espera 15 minutos.');
  await kv.set(key,{count:count+1,until});
}

async function startSession(req:Request,a:{id:string;email:string;name:string},now:number){
  const token=crypto.randomUUID()+crypto.randomUUID();
  await (await store()).set('session:'+await digest(token),{user:a.id,email:a.email,name:a.name,expires:now+SESSION_SECONDS*1000});
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}${secureFlag(req)}`;
}

export async function POST(req:Request){
  try{
    sameOrigin(req);
    const b:any=await req.json(),now=Date.now(),kv=await store();

    if(b.action==='logout'){
      const token=(await cookies()).get(SESSION_COOKIE)?.value;
      if(token)await kv.set('session:'+await digest(token),{user:'',email:'',name:'',expires:0});
      return Response.json({ok:true},{headers:{'Set-Cookie':`${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag(req)}`}});
    }

    const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
    if(!EMAIL.test(email)||email.length>200)fail('Correo inválido.');
    if(typeof b.password!=='string'||b.password.length<10||b.password.length>200)fail('Usa una contraseña de 10 a 200 caracteres.');

    if(b.action==='register'){
      await throttle(email,now);
      if(await kv.get('account:'+email))fail('Ya existe una cuenta con ese correo. Inicia sesión.');
      let id:string=crypto.randomUUID(),name=typeof b.name==='string'?b.name.trim().slice(0,100):'';
      const soc=await kv.get('society');
      if(!soc){
        // Primera cuenta: será el jefe. OWNER_EMAIL (opcional) restringe quién puede ser.
        const owner=process.env.OWNER_EMAIL?.trim().toLowerCase();
        if(owner&&owner!==email)fail('Esta instalación aún no tiene propietario y está reservada a otro correo.');
        if(!name)fail('Escribe tu nombre.');
        if(!(await createSociety({userId:id,email,displayName:name})))fail('La sociedad ya fue creada. Pide al jefe que te dé de alta.');
      }else{
        const m=soc.data.members.find((m:any)=>m.email===email);
        if(!m)fail('Ese correo no ha sido dado de alta por el jefe de la sociedad.');
        if(!m.id.startsWith('pending:'))id=m.id;
        name=m.name||name;
      }
      const salt=crypto.randomUUID(),hash=await passwordHash(b.password,salt);
      const acct={id,email,name,salt,hash,created:now};
      if(!(await kv.set('account:'+email,acct,{ifMatch:null})))fail('Ya existe una cuenta con ese correo. Inicia sesión.');
      await initialize({userId:id,email,displayName:name});
      return Response.json({ok:true},{headers:{'Set-Cookie':await startSession(req,acct,now)}});
    }

    if(b.action==='login'){
      await throttle(email,now);
      const row=await kv.get('account:'+email),a=row?.data;
      const candidate=await passwordHash(b.password,a?.salt||'x');
      if(!a||!same(candidate,a.hash))fail('Correo o contraseña incorrectos.');
      await kv.set('attempts:'+email,{count:0,until:0});
      return Response.json({ok:true},{headers:{'Set-Cookie':await startSession(req,a,now)}});
    }
    fail('Acción desconocida.');
  }catch(e:any){return Response.json({error:e.message},{status:400})}
}

/** Estado de arranque para la pantalla de acceso. */
export async function GET(){
  try{const u=await identity();return Response.json({signedIn:true,email:u.email})}
  catch{return Response.json({signedIn:false,firstRun:!(await societyExists())})}
}
