export type Data=Record<string,unknown>;
export type Entry={id:string;kind:string;data:Data;createdAt:string;updatedAt:string};
export type Product={_id:string;name:string;sku:string;description:string;category:string;quantity:number;reorderLevel:number;costPrice:number;sellPrice:number;unit:string;image:string;createdAt:string;brand?:string;barcode?:string;status?:string;tax?:number;discount?:number;maximumStock?:number;warehouse?:string};
export type Sale={_id:string;orderNumber:string;customerName:string;customerEmail:string;totalAmount:number;status:string;createdAt:string;items:{_id:string;product:{_id:string;name:string;image:string};name:string;quantity:number;price:number;costPrice:number}[];paid?:number;paymentMethod?:string;dueDate?:string;discountAmount?:number;taxAmount?:number;subtotal?:number;notes?:string;costTotal?:number;invoiceNumber?:string};
export type Actor={id:string;owner:string;name:string;email:string;role:string;warehouse:string;permissions:Record<string,string[]>;isOwner:boolean};
export type SuiteState={actor:Actor;products:Product[];sales:Sale[];records:Entry[];settings:Record<string,Data>;members:Data[];notifications:Data[];audit:Data[]};
export const str=(value:unknown)=>typeof value==='string'?value:value==null?'':String(value);
export const num=(value:unknown)=>Number.isFinite(Number(value))?Number(value):0;
export const total=(rows:Data[],key:string)=>rows.reduce((s,r)=>s+num(r[key]),0);
export const permissionsModules=['inventory','sales','purchases','customers','expenses','reports','admin'];
export const permissionActions=['read','create','update','delete'];
export const defaultPermissions:Record<string,Record<string,string[]>>={
 administrator:Object.fromEntries(permissionsModules.map(m=>[m,permissionActions])),
 manager:{inventory:['read','create','update'],sales:['read','create','update'],purchases:['read','create','update'],customers:['read','create','update'],expenses:['read','create'],reports:['read'],admin:[]},
 cashier:{inventory:[],sales:['read','create'],purchases:[],customers:['read','create'],expenses:[],reports:[],admin:[]},
 inventory:{inventory:['read','create','update'],sales:[],purchases:['read','create','update'],customers:[],expenses:[],reports:[],admin:[]},
};
export const defaultSettings:Record<string,Data>={
 general:{businessName:'Que Bros Perfumery',taxNumber:'',email:'',phone:'',address:'',currency:'PHP',symbolPosition:'before',timezone:'Asia/Manila',dateFormat:'medium',logo:'/qb-logo-dark.png'},
 inventory:{lowStockThreshold:5,outOfStockAction:'block',warehouse:'Que Bros Boutique',unit:'pcs',skuPrefix:'QB-',barcodeSymbology:'Code 128',scannerBeep:true},
 sales:{taxRate:0,paymentTerm:14,invoicePrefix:'QB-INV-',maxDiscount:20,receiptHeader:'Que Bros Perfumery',receiptFooter:'Thank you for choosing Que Bros Perfumery.',cash:true,card:true,transfer:true,credit:false},
 purchases:{prefix:'QB-PO-',returnPrefix:'QB-PRET-',paymentTerms:'Net 30',approvalThreshold:2500,autoReceive:true,verifyBarcode:false},
 notifications:{lowStock:true,dailyDigest:false,overdue:false,inbound:true,email:'',phone:''},
};
