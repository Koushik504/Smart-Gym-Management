"use client";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { type Row } from "./data";
const colors = ["#256f54", "#b9e67a", "#79b3a4", "#e1c382", "#b0c3bd"];
export function Chart({
  data,
  type = "area",
  valueKey = "value",
}: {
  data: Row[];
  type?: "area" | "bar" | "pie";
  valueKey?: string;
}) {
  if (!data.length)
    return <div className="chart-empty">No records for this period yet.</div>;
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {type === "pie" ? (
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={data}
              dataKey={valueKey}
              nameKey="label"
              innerRadius="58%"
              outerRadius="83%"
              paddingAngle={4}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        ) : type === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="#e8eeeb"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#84918b" }}
              tickFormatter={(v) => String(v).slice(5)}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#84918b" }}
              width={38}
            />
            <Tooltip />
            <Bar
              isAnimationActive={false}
              dataKey={valueKey}
              fill="#70a68d"
              radius={[5, 5, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        ) : (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="greenArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#69a283" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#69a283" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="#e8eeeb"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#84918b" }}
              tickFormatter={(v) => String(v).slice(5)}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#84918b" }}
              width={45}
            />
            <Tooltip />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey={valueKey}
              stroke="#397d60"
              strokeWidth={2.5}
              fill="url(#greenArea)"
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
