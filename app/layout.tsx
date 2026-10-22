import type { Metadata } from "next";
import "./globals.css";
import SplashScreen from "@/components/SplashScreen";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Que Bros Perfumery | Boutique POS",
  description: "The Que Bros Perfumery workspace for products, orders, customers and boutique operations.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased overflow-x-hidden"><SplashScreen/>{children}<Toaster toastOptions={{style:{background:'#1e1e1e',color:'#fff7ef',border:'1px solid #a86f00',borderRadius:'14px'}}}/></body></html>;
}
