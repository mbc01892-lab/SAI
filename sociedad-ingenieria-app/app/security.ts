import {cookies} from 'next/headers';
import {digest} from './security-core';
export * from './security-core';
export async function sessionHash(){const jar=await cookies();return digest(jar.get('nexo-admin')?.value||'')}
