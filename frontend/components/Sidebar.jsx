import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  FlaskConical,
  ShieldCheck,
  Building2,
  CreditCard,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    { label: 'Recovery Cases', href: '/cases', icon: Receipt },
    { label: 'Simulator Lab', href: '/simulator', icon: FlaskConical },
    { label: 'Checkout (Merchant)', href: '/checkout', icon: CreditCard },
  ];

  return (
    <aside className="w-64 h-screen shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between p-4 sticky top-0 z-20 select-none overflow-y-auto">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-2 py-1">
          <h1 className="font-bold text-slate-900 text-xl leading-tight tracking-tight">
            Recover<span className="text-blue-600">AI</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">Revenue Recovery Agent</p>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Merchant Profile */}
      <div className="border-t border-slate-200 pt-4 space-y-3">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
            <Building2 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">Acme Store</p>
            <p className="text-[11px] text-slate-500 font-medium truncate">Razorpay Track 03</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="font-semibold text-slate-700">Agent Active</span>
          </span>
          <span className="font-mono text-slate-400">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
