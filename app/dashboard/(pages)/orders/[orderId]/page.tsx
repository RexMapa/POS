import {redirect} from 'next/navigation';
export default async function LegacyPage({params}:{params:Promise<{orderId:string}>}){redirect('/dashboard/invoices/invoices?invoice='+encodeURIComponent((await params).orderId));}
