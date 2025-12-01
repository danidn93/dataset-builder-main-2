import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Chart from "chart.js/auto";

// Colores institucionales UNEMI
const COLORES_UNEMI = [
  "#1c3247", "#264763", "#335f7f", "#3c7aa0", "#4597bf",
  "#fc7e00", "#ea7d06", "#f48521", "#f78d37", "#f7964d",
  "#fe9900", "#da8b33", "#f28f19", "#ef922e", "#f49d47",
  "#002E45", "#222223"
];

interface FacultadLink {
  tipo: "FACULTAD";
  nombre: string;
  global: number;
  criterios: string[];
  carreras: { nombre: string; total: number; criterios: number[] }[];
}

interface CarreraLink {
  tipo: "CARRERA";
  nombre: string;
  global: number;
  criterios: string[];
  valores: number[];
}

type AnalisisFiltrado = FacultadLink | CarreraLink;

function toTitle(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function wrapLabel(text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + " " + words[i];
    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

export default function PublicStaticDashboard() {
  const { token } = useParams();
  const [info, setInfo] = useState<AnalisisFiltrado | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);

  const chartTopRef = useRef<HTMLCanvasElement>(null);
  const chartBottomRef = useRef<HTMLCanvasElement>(null);
  const charts = useRef<{ top?: Chart; bottom?: Chart }>({});

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `body { margin: 0 !important; padding: 0 !important; background: #1c3247 !important; }`;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!token) return;

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisis-filtrado-chunk`,
          {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ token }),
          }
        );

        const json = await res.json();
        setInfo(json);
      } catch (e) {
        alert("Error al cargar dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  useEffect(() => {
    if (!info) return;

    if (charts.current.top) charts.current.top.destroy();
    if (charts.current.bottom) charts.current.bottom.destroy();

    const isMobile = window.innerWidth < 768;

    // Plugin: Etiquetas arriba en naranja (SOLO PARA BARRAS)
    const barLabelsTop = {
      id: "barLabelsTop",
      afterDatasetsDraw(chart: Chart) {
        if (chart.config.type !== "bar") return;
        
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = `bold ${isMobile ? '10px' : '14px'} Montserrat, sans-serif`;
        ctx.fillStyle = "#fc7e00";
        ctx.textAlign = "center";

        chart.data.datasets.forEach((ds, i) => {
          chart.getDatasetMeta(i).data.forEach((bar: any, j: number) => {
            const val = ds.data[j] as number;
            const yOffset = isMobile ? -5 : -10;
            ctx.fillText(val.toFixed(2) + "%", bar.x, bar.y + yOffset);
          });
        });

        ctx.restore();
      },
    };

    Chart.register(barLabelsTop);

    const multilineTooltipCallbacks = {
      title: (items: any) => {
        const idx = items[0].dataIndex;
        const label = items[0].chart.data.labels[idx];
        return Array.isArray(label) ? label.join(" ") : label;
      },
    };

    // GRÁFICO SUPERIOR
    if (info.tipo === "FACULTAD") {
      const labels = info.carreras.map(c => wrapLabel(toTitle(c.nombre), 25));
      const valores = info.carreras.map(c => c.total);
      const colors = info.carreras.map((_, i) => COLORES_UNEMI[i % COLORES_UNEMI.length]);

      charts.current.top = new Chart(chartTopRef.current!, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            data: valores,
            backgroundColor: colors,
            borderRadius: 7,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            legend: { display: false }, 
            datalabels: { display: false },
            tooltip: { 
              enabled: true,
              callbacks: multilineTooltipCallbacks,
            },
          },
          scales: { 
            x: {
              display: !isMobile,
              ticks: {
                font: { size: 12, family: 'Inter, sans-serif' },
                maxRotation: 0,
                minRotation: 0,
              }
            },
            y: { 
              beginAtZero: true, 
              max: 100,
              display: !isMobile,
            } 
          },
        },
      });
    } else {
      charts.current.top = new Chart(chartTopRef.current!, {
        type: "bar",
        data: {
          labels: [["Promedio", "Global"]],
          datasets: [{
            data: [info.global],
            backgroundColor: "#fc7e00",
            borderRadius: 7,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            legend: { display: false }, 
            datalabels: { display: false },
            tooltip: { enabled: true },
          },
          scales: { 
            x: { display: !isMobile },
            y: { beginAtZero: true, max: 100, display: !isMobile } 
          },
        },
      });
    }

    // GRÁFICO INFERIOR
    drawBottomChart();
  }, [info]);

  const drawBottomChart = () => {
    if (!info) return;
    if (charts.current.bottom) charts.current.bottom.destroy();

    const isMobile = window.innerWidth < 768;

    const multilineTooltipCallbacks = {
      title: (items: any) => {
        const idx = items[0].dataIndex;
        const label = items[0].chart.data.labels[idx];
        return Array.isArray(label) ? label.join(" ") : label;
      },
    };

    let valores: number[] = [];
    if (info.tipo === "FACULTAD") {
      valores = info.carreras[selected].criterios;
    } else {
      valores = info.valores;
    }

    const colors = info.criterios.map((_, i) => COLORES_UNEMI[i % COLORES_UNEMI.length]);

    charts.current.bottom = new Chart(chartBottomRef.current!, {
      type: "bar",
      data: {
        labels: info.criterios.map((c) => wrapLabel(c, 20)),
        datasets: [{ 
          data: valores, 
          backgroundColor: colors, 
          borderRadius: 6 
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false }, 
          datalabels: { display: false },
          tooltip: { 
            enabled: true,
            callbacks: multilineTooltipCallbacks,
          },
        },
        scales: { 
          x: {
            display: !isMobile,
            ticks: {
              font: { size: 11, family: 'Inter, sans-serif' },
              maxRotation: 0,
              minRotation: 0,
            }
          },
          y: { 
            max: 100,
            display: !isMobile,
          } 
        },
      },
    });
  };

  useEffect(() => {
    if (info?.tipo === "FACULTAD") {
      drawBottomChart();
    }
  }, [selected]);

  if (loading)
    return <div className="text-white text-3xl text-center mt-24 font-aventura">Cargando...</div>;

  if (!info)
    return <div className="text-red-500 text-3xl text-center mt-24 font-aventura">Error al cargar datos</div>;

  return (
    <div className="min-h-screen font-avenir">
      <div
        style={{
          maxWidth: "1200px",
          margin: "2em auto",
          background: "white",
          borderRadius: "16px",
          padding: window.innerWidth < 768 ? "20px" : "40px",
          boxShadow: "0 6px 24px rgba(28,50,71,0.13)",
        }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1c3247] font-aventura">
          Dashboard de Satisfacción Estudiantil - {toTitle(info.nombre)}
        </h1>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
          <span className="text-lg sm:text-xl font-bold text-[#1c3247] font-aventura">
            Percepción Total:
          </span>
          <div className="bg-[#fc7e00] text-white text-3xl sm:text-4xl font-bold px-8 sm:px-10 py-3 sm:py-4 rounded-xl font-aventura">
            {info.global.toFixed(2)}%
          </div>
        </div>

        <h2 className="text-[#1c3247] text-lg sm:text-xl mt-10 font-aventura">
          {info.tipo === "FACULTAD" ? "Percepción Global por Carrera" : "Promedio Global"}
        </h2>
        <div style={{ height: window.innerWidth < 768 ? "300px" : "400px" }}>
          <canvas ref={chartTopRef}></canvas>
        </div>

        {info.tipo === "FACULTAD" && (
          <>
            <h2 className="text-[#1c3247] text-lg sm:text-xl mt-10 font-aventura">
              Análisis por Carrera
            </h2>

            <select
              value={selected}
              onChange={(e) => setSelected(+e.target.value)}
              className="mt-3 border-2 border-[#3c7aa0] rounded-md p-2 text-base sm:text-lg font-avenir w-full sm:w-auto"
            >
              {info.carreras.map((c, i) => (
                <option key={i} value={i}>
                  {toTitle(c.nombre)}
                </option>
              ))}
            </select>

            <h3 className="mt-4 text-lg sm:text-xl font-semibold font-aventura">
              {toTitle(info.carreras[selected].nombre)} ({info.carreras[selected].total.toFixed(2)}%)
            </h3>
          </>
        )}

        <h2 className="text-[#1c3247] text-lg sm:text-xl mt-10 font-aventura">
          {info.tipo === "FACULTAD" 
            ? `Indicadores de ${toTitle(info.carreras[selected].nombre)}`
            : `Indicadores de ${toTitle(info.nombre)}`
          }
        </h2>
        <div style={{ height: window.innerWidth < 768 ? "250px" : "300px" }}>
          <canvas ref={chartBottomRef}></canvas>
        </div>
      </div>
    </div>
  );
}
