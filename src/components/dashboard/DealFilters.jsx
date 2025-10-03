import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, ListFilter } from 'lucide-react';

export default function DealFilters({ filters, setFilters, sortBy, setSortBy }) {
  return (
    <div className="bg-white p-2 md:p-4 rounded-lg shadow-sm border border-slate-200 hover:border-brand-lime hover:border-opacity-20 transition-all duration-200 flex flex-col sm:flex-row gap-2 md:gap-4">
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-2 gap-2 md:gap-4">
        <div>
          <label className="text-xs text-brand-teal flex items-center mb-0.5 font-medium">
            <Filter className="w-3 h-3 mr-1" />
            Status
          </label>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="w-full border-slate-200 focus:border-brand-lime focus:ring-brand-lime h-7 md:h-9 text-xs md:text-sm">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="quote_requested">Quote Requested</SelectItem>
              <SelectItem value="negotiating">Negotiating</SelectItem>
              <SelectItem value="final_offer">Final Offer</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-brand-teal flex items-center mb-0.5 font-medium">
            <Filter className="w-3 h-3 mr-1" />
            Priority
          </label>
          <Select
            value={filters.priority}
            onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
          >
            <SelectTrigger className="w-full border-slate-200 focus:border-brand-lime focus:ring-brand-lime h-7 md:h-9 text-xs md:text-sm">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="sm:border-l sm:pl-2 md:sm:pl-4 border-slate-200 flex-shrink-0">
        <label className="text-xs text-brand-teal flex items-center mb-0.5 font-medium">
          <ListFilter className="w-3 h-3 mr-1" />
          Sort
        </label>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[140px] md:sm:w-[180px] border-slate-200 focus:border-brand-lime focus:ring-brand-lime h-7 md:h-9 text-xs md:text-sm">
            <SelectValue placeholder="Sort deals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="highest_offer">Highest Offer</SelectItem>
            <SelectItem value="biggest_savings">Biggest Savings</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}