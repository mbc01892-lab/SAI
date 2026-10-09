import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'S.A. Ingeniería · Comunidad',description:'El punto de encuentro de tu comunidad de ingeniería.',manifest:'/manifest.webmanifest',icons:{icon:'/icons/icon-192.png',apple:'/icons/apple-touch-icon.png'},appleWebApp:{capable:true,title:'S.A. Ingeniería',statusBarStyle:'default'}};
export const viewport:Viewport={themeColor:'#b84b1e',width:'device-width',initialScale:1};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
