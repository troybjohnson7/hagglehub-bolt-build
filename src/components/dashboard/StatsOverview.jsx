import { Card, CardContent } from "@/components/ui/card";
import { 
  Handshake, 
  TrendingDown
} from "lucide-react";
import { motion } from "framer-motion";

export default function StatsOverview({ activeDeals, bestSavings }) {
  const stats = [
    {
      title: "Active Deals",
      value: activeDeals,
      icon: Handshake,
      color: "text-brand-lime",
      bgColor: "bg-lime-50"
    },
    {
      title: "Best Savings",
      value: `$${bestSavings.toLocaleString()}`,
      icon: TrendingDown,
      color: "text-brand-teal",
      bgColor: "bg-teal-50"
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="shadow-sm border-slate-200 hover:shadow-md hover:border-brand-lime hover:border-opacity-30 transition-all duration-200 text-center">
            <CardContent className="p-4">
              <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${stat.bgColor} mx-auto mb-3`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs font-medium text-slate-500">{stat.title}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}