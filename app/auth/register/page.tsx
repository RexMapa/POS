import RegisterForm from "@/components/auth/register-form";
import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
  if (process.env.REGISTRATION_ENABLED !== 'true') return <main className="min-h-screen flex items-center justify-center p-6"><div className="max-w-md text-center"><h1 className="text-4xl mb-4">Your boutique workspace.</h1><p className="text-muted-foreground mb-8">Sign in with the owner account configured for this boutique.</p><Link href="/auth/signin" className="inline-flex rounded-full bg-[#1e1e1e] text-[#fff7ef] px-8 py-3">Sign in</Link></div></main>;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/qb-logo-dark.png"
              alt="Que Bros Perfumery Logo"
              width={150}
              height={50}
              priority
            />
          </Link>
          <h1 className="mt-6 font-boldonse text-4xl font-bold text-gray-900">
            Create Your Account
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Join Que Bros Perfumery and streamline your inventory management.
          </p>
        </div>
        <RegisterForm />
        <p className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="font-semibold text-primary hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
