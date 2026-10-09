import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{
  return {name:'S.A. Ingeniería',short_name:'S.A. Ingeniería',description:'Asistencia con QR, solicitudes, comités y calendario de la sociedad.',start_url:'/',scope:'/',display:'standalone',orientation:'portrait',background_color:'#f8f6f2',theme_color:'#b84b1e',lang:'es',
    icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png'},{src:'/icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
}
