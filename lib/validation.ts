import { z } from "zod";
import { AppError } from "./errors";
export const email = z.string().trim().email().max(254).transform(v => v.toLowerCase());
export const signup = z.object({ name:z.string().trim().min(1).max(120), email, password:z.string().min(12).max(72) });
export const signin = z.object({ email, password:z.string().min(1).max(72) });
export const productInput = z.object({
 name:z.string().trim().min(1).max(200), sku:z.string().trim().max(100).default(''),
 description:z.string().max(10000).default(''), category:z.string().trim().max(120).default(''),
 quantity:z.coerce.number().int().min(0).max(100000000).default(0), reorderLevel:z.coerce.number().int().min(0).max(100000000).default(0),
 costPrice:z.coerce.number().min(0).max(999999999).default(0), sellPrice:z.coerce.number().min(0).max(999999999).default(0),
 unit:z.string().trim().min(1).max(30).default('pcs'),
 brand:z.string().trim().max(120).default(''),barcode:z.string().trim().max(120).default(''),
 status:z.enum(['active','inactive']).default('active'),tax:z.coerce.number().min(0).max(100).default(0),
 discount:z.coerce.number().min(0).max(100).default(0),maximumStock:z.coerce.number().int().min(0).max(100000000).default(0),warehouse:z.string().trim().max(120).default('Que Bros Boutique'),
 image:z.string().max(2000000).default('').refine(v=>!v || v.startsWith('/') || v.startsWith('https://') || /^data:image\/(png|jpe?g|webp|gif);base64,/.test(v), 'Use an HTTPS image URL or an image upload.'),
});
export const orderInput = z.object({ customerName:z.string().trim().min(1).max(120), customerEmail:email,
 items:z.array(z.object({productId:z.string().min(1).max(100),quantity:z.coerce.number().int().positive().max(100000000)})).min(1).max(100),
});
export const preferencesInput = z.object({ lowStockNotifications:z.boolean(),newOrderNotification:z.boolean(),outOfStockNotification:z.boolean() });
export const businessInput = z.object({ businessName:z.string().trim().min(1).max(200), address:z.string().max(1000).default(''), phone:z.string().max(50).default(''),email:z.union([email,z.literal('')]).default(''),currency:z.enum(['PHP','USD','EUR','GBP','INR','BDT']).default('PHP'),weightUnit:z.enum(['kg','lbs','units','pcs']).default('pcs'),lowStockThreshold:z.coerce.number().int().min(0).max(1000000).default(5) });
export function reportDates(url: URL) {
 const end = new Date(url.searchParams.get('endDate') || Date.now());
 const start = url.searchParams.has('startDate') ? new Date(url.searchParams.get('startDate')!) : new Date(end.getTime()-30*86400000);
 if (!Number.isFinite(+start) || !Number.isFinite(+end) || start>end) throw new AppError('Invalid date range');
 start.setUTCHours(0,0,0,0); end.setUTCHours(23,59,59,999); return {start,end};
}
