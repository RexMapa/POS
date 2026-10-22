import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function Home() {
  return <main className="qb-entry">
    <section className="qb-story">
      <Image src="/qb-logo-light.png" alt="Que Bros Perfumery" width={180} height={85} priority className="object-contain object-left" />
      <div><span className="qb-eyebrow">The boutique workspace</span><h1>A finer way<br/>to run your <em>boutique.</em></h1><p>Thoughtful service starts behind the counter. Keep your collection, your customers and every order beautifully in sync.</p></div>
      <footer>Que Bros Perfumery · Boutique operations</footer>
    </section>
    <section className="qb-entry-panel"><div>
      <span className="qb-eyebrow">Made for the everyday</span><h2>Every detail, considered.</h2><p>Your daily operations, in one calm and considered space.</p>
      <div className="qb-features">{[["01","Curate your collection","Manage fragrances, pricing and stock with clarity."],["02","Make every sale seamless","Create orders and follow their progress from one place."],["03","Know your boutique","Keep customers and sales insights close at hand."]].map(([n,t,d])=><div className="qb-feature" key={n}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div></div>)}</div>
      <Button asChild className="w-full h-12"><Link href="/auth/signin">Enter your workspace <ArrowUpRight className="ml-2 h-4 w-4"/></Link></Button>
      <p className="text-center text-xs mt-5">New to the workspace? <Link className="underline underline-offset-4" href="/auth/register">Create an account</Link></p>
    </div></section>
  </main>;
}
