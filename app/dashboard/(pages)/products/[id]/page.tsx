import {redirect} from 'next/navigation';
export default async function LegacyPage({params}:{params:Promise<{id:string}>}){redirect('/dashboard/inventory/products?product='+encodeURIComponent((await params).id));}
