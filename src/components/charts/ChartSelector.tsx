import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon, AreaChart as AreaChartIcon, Radar as RadarIcon, ScatterChart as ScatterIcon } from "lucide-react";
import { ChartType } from "./ChartCanvas";

interface ChartSelectorProps {
  onDragStart: (type: ChartType) => void;
}

const chartTypes: { type: ChartType; icon: any; label: string; description: string }[] = [
  { type: "bar", icon: BarChart3, label: "Barras", description: "Comparación de valores" },
  { type: "pie", icon: PieChartIcon, label: "Circular", description: "Proporciones del total" },
  { type: "line", icon: LineChartIcon, label: "Líneas", description: "Tendencias temporales" },
  { type: "area", icon: AreaChartIcon, label: "Área", description: "Volumen a lo largo del tiempo" },
  { type: "radar", icon: RadarIcon, label: "Radar", description: "Múltiples dimensiones" },
  { type: "scatter", icon: ScatterIcon, label: "Dispersión", description: "Correlación entre variables" },
];

export const ChartSelector = ({ onDragStart }: ChartSelectorProps) => {
  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-base">Tipos de Gráficos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {chartTypes.map((chart) => (
            <div
              key={chart.type}
              draggable
              onDragStart={() => onDragStart(chart.type)}
              className="flex flex-col items-center justify-center p-4 border-2 border-border rounded-lg cursor-move hover:bg-accent/50 hover:border-primary transition-all group"
            >
              <chart.icon className="h-8 w-8 mb-2 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-center">{chart.label}</span>
              <span className="text-xs text-muted-foreground text-center mt-1">{chart.description}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
