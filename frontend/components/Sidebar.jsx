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
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col justify-between p-4 sticky top-0 h-screen select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 px-2 py-1">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-lg">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg leading-tight tracking-tight">
              Recover<span className="text-blue-600">AI</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Revenue Recovery Agent</p>
          </div>
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
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
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
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
            <Building2 className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">Acme Store</p>
            <p className="text-[11px] text-slate-500 font-medium truncate">Razorpay Track 03</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>Agent Active</span>
          </span>
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
