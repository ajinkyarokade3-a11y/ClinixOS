import { TrendingDown, TrendingUp, Minus, type LucideIcon } from "lucide-react";
import { Card } from "./Card";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral" | "warning";
  icon: LucideIcon;
  iconColor: string;
}

export function StatCard({ title, value, change, changeType, icon: Icon, iconColor }: StatCardProps) {
  const changeIcon = {
    positive: <TrendingUp size={14} className="text-emerald-600" />,
    negative: <TrendingDown size={14} className="text-rose-600" />,
    warning: <TrendingDown size={14} className="text-amber-600" />,
    neutral: <Minus size={14} className="text-slate-400" />,
  };

  const changeColor = {
    positive: "text-emerald-600",
    negative: "text-rose-600",
    warning: "text-amber-600",
    neutral: "text-slate-500",
  };

  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${iconColor}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {changeIcon[changeType]}
        <span className={`text-xs font-medium ${changeColor[changeType]}`}>{change}</span>
      </div>
    </Card>
  );
}
