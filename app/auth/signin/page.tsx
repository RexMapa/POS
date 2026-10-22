import LoginForm from "@/components/auth/login-form";
import Image from "next/image";
import Link from "next/link";
export default function SignInPage() {
  return <main className="qb-entry"><section className="qb-story">
    <Link href="/"><Image src="/qb-logo-light.png" alt="Que Bros Perfumery" width={180} height={85} priority className="object-contain object-left"/></Link>
    <div><span className="qb-eyebrow">Que Bros Perfumery</span><h1>The art of<br/><em>everyday service.</em></h1><p>A welcoming space for the people behind every memorable fragrance.</p></div>
    <footer>Your boutique. Beautifully in order.</footer>
  </section><section className="qb-entry-panel"><div><span className="qb-eyebrow">Your boutique awaits</span><h2>Welcome back.</h2><p className="mb-8">Sign in to your Que Bros workspace.</p><LoginForm/><p className="mt-8 text-center text-sm">Don&apos;t have an account? <Link href="/auth/register" className="underline underline-offset-4">Create one</Link></p></div></section></main>;
}
