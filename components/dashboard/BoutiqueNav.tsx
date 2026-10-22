"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Package, ShoppingBag, Users, BarChart3, Settings, ArrowUpRight } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/products", label: "The collection", icon: Package },
  { href: "/dashboard/orders", label: "Sales & orders", icon: ShoppingBag },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function BoutiqueNav() {
  const pathname = usePathname();
  return <aside className="qb-rail">
    <Link href="/dashboard" className="qb-rail-logo"><Image src="/qb-logo-light.png" alt="Que Bros Perfumery" width={150} height={72} priority className="object-contain" /></Link>
    <div className="qb-rail-caption">Boutique workspace</div>
    <nav aria-label="Boutique navigation">{items.map(({href,label,icon:Icon}) => {
      const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "is-active" : ""}><Icon size={17}/><span>{label}</span>{active && <span className="qb-nav-dot"/>}</Link>;
    })}</nav>
    <div className="qb-rail-footer"><span className="qb-eyebrow">A little more personal.</span><p>Every fragrance.<br/>Every customer.<br/>Every detail.</p><Link href="/dashboard/orders/new">Create a sale <ArrowUpRight size={16}/></Link></div>
  </aside>;
}
