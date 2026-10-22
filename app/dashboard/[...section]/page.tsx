import { SuitePage } from '@/components/suite/SuitePage';
export default async function WorkspacePage({params}:{params:Promise<{section:string[]}>}){return <SuitePage screen={(await params).section.join('/')}/>;}
