'use client';
import {useEffect,useState} from 'react';
export default function Login({onDone,notice}:{onDone:()=>void;notice?:string}){
  const [mode,setMode]=useState<'login'|'register'>('login'),[first,setFirst]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(notice||'');
  useEffect(()=>{fetch('/api/auth').then(r=>r.json()).then(v=>{if(v.firstRun){setFirst(true);setMode('register')}}).catch(()=>{})},[]);
  async function submit(e:any){
    e.preventDefault();setBusy(true);setError('');
    const d:any=Object.fromEntries(new FormData(e.currentTarget));
    try{
      const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode,...d})});
      const v:any=await r.json();if(v.error)throw Error(v.error);onDone();
    }catch(err:any){setError(err.message)}finally{setBusy(false)}
  }
  return <div className="loading auth">
    <div className="brand"><img className="sai-logo" src="/sai-logo.png" alt="S.A. Ingeniería"/></div>
    <h1>{first?'Crea la sociedad':mode==='login'?'Inicia sesión':'Crea tu cuenta'}</h1>
    <p>{first?'Esta primera cuenta será la jefatura de la sociedad.':mode==='login'?'Entra con tu correo y contraseña.':'Usa el correo con el que el jefe te dio de alta.'}</p>
    <form onSubmit={submit}>
      {mode==='register'&&<label>Nombre<input name="name" autoComplete="name" maxLength={100} required={first}/></label>}
      <label>Correo<input name="email" type="email" autoComplete="email" required/></label>
      <label>Contraseña<input name="password" type="password" minLength={10} maxLength={200} autoComplete={mode==='login'?'current-password':'new-password'} required/>{mode==='register'&&<span className="fine">Mínimo 10 caracteres.</span>}</label>
      {error&&<div className="notice" role="alert">{error}</div>}
      <button disabled={busy} type="submit">{busy?'Un momento…':mode==='login'?'Entrar':'Crear cuenta'}</button>
    </form>
    {!first&&<button className="text" onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?'¿Primera vez? Crea tu cuenta':'Ya tengo cuenta'}</button>}
  </div>;
}
