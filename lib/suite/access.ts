import { AppError } from '../errors';
import type { Database } from '../db/db';
import { Store } from '../db/store';
import { defaultPermissions,type Actor,type Data } from './types';
export async function resolveActor(db:Database,id:string):Promise<Actor> {
 const user=await new Store(db).user(id);
 if(!user) throw new AppError('Please sign in again.',401);
 const m=(await db.query<{owner_id:string;role_id:string;warehouse:string;active:boolean}>('SELECT * FROM qb_pos.memberships WHERE user_id=$1',[id]))[0];
 if(m&&!m.active) throw new AppError('This staff account is suspended.',403);
 let role='administrator',permissions=defaultPermissions.administrator;
 if(m){
  const saved=(await db.query<{data:Data}>('SELECT data FROM qb_pos.records WHERE id=$1 AND owner_id=$2 AND kind=$3',[m.role_id,m.owner_id,'roles']))[0];
  role=String(saved?.data.key||m.role_id);
  permissions=(saved?.data.permissions as Record<string,string[]>|undefined)||defaultPermissions[role]||{};
 }
 return {id,owner:m?.owner_id||id,name:user.name,email:user.email,role,warehouse:m?.warehouse||'Que Bros Boutique',permissions,isOwner:!m};
}
export function authorize(actor:Actor,module:string,action:string){
 if(!actor.isOwner&&!actor.permissions[module]?.includes(action)) throw new AppError('Your role does not have permission for this action.',403);
}
export function moduleFor(kind:string) {
 if(['products','categories','brands','units','adjustments'].includes(kind)) return 'inventory';
 if(['sales','sales-returns','invoices','register-events'].includes(kind)) return 'sales';
 if(['purchases','purchase-returns','suppliers'].includes(kind)) return 'purchases';
 if(kind==='customers')return 'customers';if(kind==='expenses')return 'expenses';return 'admin';
}
