"use client";

import React, { useState } from "react";
import { ActivityBar } from "@/components/dashboard/ActivityBar";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { SearchProvider } from "@/lib/context/SearchContext";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { BoutiqueNav } from "@/components/dashboard/BoutiqueNav";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CurrencyProvider } from "@/lib/context/CurrencyContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleAddProduct = () => {
    router.push("/dashboard/products/new");
  };

  const handleAddOrder = () => {
    router.push("/dashboard/orders/new");
  };

  const handleSignOut = async () => {
    try {
      await axios.post("/api/auth/logout");
      // Clear user data from localStorage
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      router.push("/auth/signin");
      toast.success("Logged out successfully");
    } catch (err: unknown) {
      console.error("Error logging out", err);
      toast.error("Failed to logout");
    }
  };

  return (
    <SearchProvider><CurrencyProvider>
      <div className="flex min-h-screen">
        <BoutiqueNav />
        <DashboardSidebar
          isOpen={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
        />
        <div className="qb-workspace flex-1 flex flex-col">
          <ActivityBar
            onSidebarToggle={handleSidebarToggle}
            onAddProduct={handleAddProduct}
            onSignOut={handleSignOut}
            onAddOrder={handleAddOrder}
          />
          <main className="mt-14 flex-1 p-4 md:p-8">
            {pathname === "/dashboard" && <div className="qb-page-intro"><div><span className="qb-eyebrow">Que Bros Perfumery / Boutique operations</span><h1>Your boutique, at a glance.</h1><p>A thoughtful overview of your collection, customers and daily sales.</p></div><Link href="/dashboard/orders/new" className="inline-flex items-center gap-3 rounded-full bg-[#1e1e1e] text-[#fff7ef] px-6 py-3 text-sm hover:bg-[#a86f00]">Create a sale <span aria-hidden="true">↗</span></Link></div>}
            {children}</main>
        </div>
      </div>
    </CurrencyProvider></SearchProvider>
  );
}
