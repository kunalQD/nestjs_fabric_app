
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { Order, OrderStatus } from '../types';
import { STATUS_COLORS, BRAND_COLORS } from '../constants';

export const Calendar: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // Fix: dataService.getOrders() returns a Promise, so we must await it or use .then()
    dataService.getOrders().then(data => setOrders(data));
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const getOrdersForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return orders.filter(o => o.due_date === dateStr);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-[#002d62] brand-font mb-2">Installation Schedule</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">On-site deployment and delivery calendar</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        {/* Calendar Header */}
        <div className="p-8 bg-[#002d62] text-white flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-[#c5a059] text-xl">
              <i className="fas fa-calendar-day"></i>
            </div>
            <div>
              <h2 className="text-3xl font-black brand-font tracking-tight">
                {monthNames[month]} <span className="text-[#c5a059]">{year}</span>
              </h2>
              <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{orders.length} TOTAL PROJECTS ASSIGNED</p>
            </div>
          </div>
          
          <div className="flex bg-white/10 p-1.5 rounded-2xl backdrop-blur-md">
            <button onClick={prevMonth} className="w-12 h-12 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors">
              <i className="fas fa-chevron-left"></i>
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())} 
              className="px-8 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:text-[#c5a059] transition-colors"
            >
              Current Period
            </button>
            <button onClick={nextMonth} className="w-12 h-12 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors">
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/50">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{day}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 auto-rows-[160px]">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="border-r border-b border-slate-50 bg-slate-50/30"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayOrders = getOrdersForDay(day);
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            
            return (
              <div key={day} className={`border-r border-b border-slate-50 p-3 overflow-y-auto hover:bg-slate-50/80 transition-all group relative ${isToday ? 'bg-blue-50/20' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-black transition-all ${isToday ? 'bg-[#002d62] text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-lg -mt-1 -ml-1' : 'text-slate-300 group-hover:text-[#002d62]'}`}>
                    {day}
                  </span>
                  {dayOrders.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></span>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  {dayOrders.map(o => (
                    <div 
                      key={o.order_id} 
                      className={`text-[9px] px-2.5 py-1.5 rounded-lg leading-tight text-white font-black flex flex-col gap-0.5 shadow-sm transition-transform hover:scale-105 cursor-pointer relative overflow-hidden ${STATUS_COLORS[o.status]}`}
                      title={`${o.customer_name} - ${o.status}`}
                    >
                      <div className="truncate tracking-tight">{o.customer_name}</div>
                      <div className="opacity-60 text-[7px] uppercase tracking-tighter truncate">{o.showroom}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-10 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        {Object.values(OrderStatus).map(status => (
          <div key={status} className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full shadow-sm ${STATUS_COLORS[status]}`}></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
