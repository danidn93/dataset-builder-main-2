import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, FileImage } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter } from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";

export type ChartType = "bar" | "pie" | "line" | "area" | "radar" | "scatter";

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  columns: string[];
  dataKey?: string; // Para gráficos de una columna (pie)
}

interface ChartCanvasProps {
  charts: ChartConfig[];
  data: any[];
  onRemoveChart: (id: string) => void;
  onUpdateChart: (id: string, config: Partial<ChartConfig>) => void;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "#8884d8", "#82ca9d", "#ffc658", "#ff7c7c"];

export const ChartCanvas = ({ charts, data, onRemoveChart, onUpdateChart }: ChartCanvasProps) => {
  const { toast } = useToast();

  const getChartData = (config: ChartConfig) => {
    if (config.type === "pie" && config.dataKey) {
      const counts: Record<string, number> = {};
      data.forEach(row => {
        const value = row[config.dataKey!];
        if (value) {
          counts[value] = (counts[value] || 0) + 1;
        }
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
    return data;
  };

  const exportAsImage = async (chartId: string) => {
    const element = document.getElementById(`chart-${chartId}`);
    if (!element) return;

    try {
      const canvas = await html2canvas(element);
      const link = document.createElement("a");
      link.download = `grafico-${chartId}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast({ title: "Exportado", description: "Gráfico exportado como imagen" });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo exportar la imagen", variant: "destructive" });
    }
  };

  const exportAsPDF = async (chartId: string) => {
    const element = document.getElementById(`chart-${chartId}`);
    if (!element) return;

    try {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`grafico-${chartId}.pdf`);
      toast({ title: "Exportado", description: "Gráfico exportado como PDF" });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo exportar el PDF", variant: "destructive" });
    }
  };

  const renderChart = (config: ChartConfig) => {
    const chartData = getChartData(config);

    switch (config.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.columns[0]} />
              <YAxis />
              <Tooltip />
              <Legend />
              {config.columns.slice(1).map((col, idx) => (
                <Bar key={col} dataKey={col} fill={COLORS[idx % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.columns[0]} />
              <YAxis />
              <Tooltip />
              <Legend />
              {config.columns.slice(1).map((col, idx) => (
                <Line key={col} type="monotone" dataKey={col} stroke={COLORS[idx % COLORS.length]} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.columns[0]} />
              <YAxis />
              <Tooltip />
              <Legend />
              {config.columns.slice(1).map((col, idx) => (
                <Area key={col} type="monotone" dataKey={col} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.6} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "radar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey={config.columns[0]} />
              <PolarRadiusAxis />
              <Tooltip />
              <Legend />
              {config.columns.slice(1).map((col, idx) => (
                <Radar key={col} name={col} dataKey={col} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.6} />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        );

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.columns[0]} name={config.columns[0]} />
              <YAxis dataKey={config.columns[1]} name={config.columns[1]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Legend />
              <Scatter name={config.title} data={chartData} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return <p className="text-muted-foreground">Tipo de gráfico no soportado</p>;
    }
  };

  if (charts.length === 0) {
    return (
      <Card className="border-2 border-dashed border-border">
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-muted-foreground text-lg">Arrastra un tipo de gráfico aquí para comenzar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {charts.map((chart) => (
        <Card key={chart.id} id={`chart-${chart.id}`} className="relative">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{chart.title}</CardTitle>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => exportAsImage(chart.id)} title="Exportar como imagen">
                  <FileImage className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => exportAsPDF(chart.id)} title="Exportar como PDF">
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onRemoveChart(chart.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderChart(chart)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
