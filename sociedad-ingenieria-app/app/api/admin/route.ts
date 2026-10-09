import {identity,transact,sameOrigin,secureFlag} from '../../server';
import {fail,member} from '../../domain';
import {digest,passwordHash,sessionHash,authorized} from '../../security';
export async function POST(req:Request){try{sameOrigin(req);const u=await identity(),b:any=await req.json(),now=Date.now(),hash=await sessionHash();
 if(b.action==='logout'){await transact(s=>{if(s.security)s.security.sessions=s.security.sessions.filter((x:any)=>x.hash!==hash)});return Response.json({ok:true},{headers:{'Set-Cookie':'nexo-admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+secureFlag(req)}})}
 if(typeof b.password!=='string'||b.password.length<12||b.password.length>200)fail('Usa una contraseña de 12 a 200 caracteres.');
 const {result:sec}=await transact(s=>{const m=member(s,u.userId);s.security||={sessions:[],attempts:{},salt:null,password:null};const sec=s.security;const a=sec.attempts[u.userId]||{count:0,until:now+900000};if(a.until<=now){a.count=0;a.until=now+900000}if(a.count>=5)fail('Demasiados intentos. Espera 15 minutos.');a.count++;sec.attempts[u.userId]=a;return {salt:sec.salt,password:sec.password,owner:m.role==='admin'}});
 const setup=!sec.password;if(setup&&!sec.owner)fail('El propietario debe configurar la contraseña primero.');if(b.action==='setup'&&!setup)fail('La contraseña ya está configurada.');
 const salt=sec.salt||crypto.randomUUID();const candidate=await passwordHash(b.password,salt);if(!setup&&candidate!==sec.password)fail('Contraseña incorrecta.');const token=crypto.randomUUID()+crypto.randomUUID(),tokenHash=await digest(token);
 await transact(s=>{if(setup){if(s.security.password)fail('La contraseña ya se configuró.');if(member(s,u.userId).role!=='admin')fail('Solo el propietario puede configurar.');s.security.salt=salt;s.security.password=candidate;}else if(s.security.password!==candidate)fail('La contraseña cambió.');s.security.attempts[u.userId]={count:0,until:now+900000};s.security.sessions=s.security.sessions.filter((x:any)=>x.expires>now&&x.user!==u.userId);s.security.sessions.push({hash:tokenHash,user:u.userId,expires:now+3600000})});
 return Response.json({ok:true},{headers:{'Set-Cookie':`nexo-admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${secureFlag(req)}`}})
 }catch(e:any){return Response.json({error:e.message},{status:400})}}
