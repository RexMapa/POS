import { AppError } from './errors';
import { readSession } from './session';
export async function getUserIdFromRequest(req:Request) {
 const token=(req.headers.get('cookie')||'').split(';').map(c=>c.trim()).find(c=>c.startsWith('token='))?.slice(6);
 if(!token) throw new AppError('Authentication required',401);
 try { return await readSession(token); }
 catch(error) { if(error instanceof AppError && error.status===503) throw error; throw new AppError('Your session has expired. Please sign in again.',401); }
}
