import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Chart from "chart.js/auto";

// Colores institucionales UNEMI
const COLORES_UNEMI = [
  "#1c3247", "#264763", "#335f7f", "#3c7aa0", "#4597bf", // Azules
  "#fc7e00", "#ea7d06", "#f48521", "#f78d37", "#f7964d", // Naranjas
  "#fe9900", "#da8b33", "#f28f19", "#ef922e", "#f49d47", // Naranjas alternos
  "#002E45", "#222223" // Azul oscuro y negro
];

interface Carrera {
  nombre: string;
  total: number;
  criterios: number[];
}

interface Facultad {
  nombre: string;
  total: number;
  carreras: Carrera[];
}

interface Data {
  global: number;
  criterios: string[];
  facultades: Facultad[];
  datasetName: string;
  periodo: string;
  votos_por_numero?: any;
}

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

export default function PublicFullDashboard() {
  const { token } = useParams();

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFacIdx, setSelectedFacIdx] = useState(0);
  const [selectedCarIdx, setSelectedCarIdx] = useState(0);

  const canvases = {
    facultades: useRef<HTMLCanvasElement>(null),
    globalCriterios: useRef<HTMLCanvasElement>(null),
    detalle: useRef<HTMLCanvasElement>(null),
    radar: useRef<HTMLCanvasElement>(null),
  };

  const charts = useRef<Record<string, Chart>>({});

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `body { margin: 0 !important; padding: 0 !important; background: #1c3247 !important; }`;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-dashboard`,
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
        if (!json.data) throw new Error("Token inválido");

        setData(json.data);
      } catch (e) {
        alert("Error al cargar dashboard público");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [token]);

  useEffect(() => {
    if (!data) return;

    Object.values(charts.current).forEach((c) => c?.destroy());
    charts.current = {};

    const isMobile = window.innerWidth < 768;

    // Plugin: Etiquetas arriba en naranja con mejor espaciado en móvil (SOLO PARA GRÁFICOS DE BARRAS)
    const barLabelsTop = {
      id: "barLabelsTop",
      afterDatasetsDraw(chart: Chart) {
        // Solo aplicar a gráficos de barras, NO al radar
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

    // Configuración de tooltips multilínea
    const multilineTooltipCallbacks = {
      title: (items: any) => {
        const idx = items[0].dataIndex;
        const label = items[0].chart.data.labels[idx];
        // Si es array (multilínea), unirlo; si no, devolverlo
        return Array.isArray(label) ? label.join(" ") : label;
      },
    };

    // FACULTADES
    const facultadesColors = data.facultades.map((_, i) => COLORES_UNEMI[i % COLORES_UNEMI.length]);
    
    charts.current.facultades = new Chart(canvases.facultades.current!, {
      type: "bar",
      data: {
        labels: data.facultades.map((f) => wrapLabel(toTitle(f.nombre), 25)),
        datasets: [
          {
            data: data.facultades.map((f) => f.total),
            backgroundColor: facultadesColors,
            borderRadius: 7,
          },
        ],
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
              font: { 
                size: 12,
                family: 'Inter, sans-serif'
              },
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

    // GLOBAL CRITERIOS
    const proms = data.criterios.map((_, i) => {
      let sum = 0, count = 0;
      data.facultades.forEach((f) =>
        f.carreras.forEach((c) => {
          if (!isNaN(c.criterios[i])) {
            sum += c.criterios[i];
            count++;
          }
        })
      );
      return count ? sum / count : 0;
    });

    const criteriosColors = data.criterios.map((_, i) => COLORES_UNEMI[i % COLORES_UNEMI.length]);

    charts.current.global = new Chart(canvases.globalCriterios.current!, {
      type: "bar",
      data: {
        labels: data.criterios.map((c) => wrapLabel(c, 20)),
        datasets: [{ 
          data: proms, 
          backgroundColor: criteriosColors, 
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
              font: { 
                size: 11,
                family: 'Inter, sans-serif'
              },
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

    actualizarDetalle();
  }, [data]);

  const actualizarDetalle = () => {
    if (!data) return;

    const fac = data.facultades[selectedFacIdx];
    const car = fac.carreras[selectedCarIdx];
    const isMobile = window.innerWidth < 768;

    const detalleColors = data.criterios.map((_, i) => COLORES_UNEMI[i % COLORES_UNEMI.length]);

    const multilineTooltipCallbacks = {
      title: (items: any) => {
        const idx = items[0].dataIndex;
        const label = items[0].chart.data.labels[idx];
        return Array.isArray(label) ? label.join(" ") : label;
      },
    };

    // DETALLE
    if (charts.current.detalle) charts.current.detalle.destroy();
    charts.current.detalle = new Chart(canvases.detalle.current!, {
      type: "bar",
      data: {
        labels: data.criterios.map((c) => wrapLabel(c, 20)),
        datasets: [
          { 
            data: car.criterios, 
            backgroundColor: detalleColors, 
            borderRadius: 6 
          },
        ],
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
              font: { 
                size: 11,
                family: 'Inter, sans-serif'
              },
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

    // RADAR - Labels multilinea en escritorio, sin etiquetas de porcentaje encima
    if (charts.current.radar) charts.current.radar.destroy();
    charts.current.radar = new Chart(canvases.radar.current!, {
      type: "radar",
      data: {
        labels: data.criterios.map((c) => isMobile ? "" : wrapLabel(c, 25)),
        datasets: [
          {
            label: toTitle(car.nombre),
            data: car.criterios,
            backgroundColor: "rgba(252, 126, 0, 0.15)",
            borderColor: "#fc7e00",
            borderWidth: 2,
            pointBackgroundColor: "#fc7e00",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "#fc7e00",
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false }, 
          tooltip: { 
            enabled: true,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                return data.criterios[idx];
              },
              label: (context) => {
                return context.parsed.r.toFixed(2) + "%";
              }
            }
          },
          datalabels: { display: false },
        },
        scales: {
          r: {
            angleLines: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: { 
              display: !isMobile,
              backdropColor: 'transparent',
              font: {
                size: 10,
                family: 'Inter, sans-serif'
              }
            },
            pointLabels: {
              display: !isMobile,
              font: {
                size: 11,
                family: 'Inter, sans-serif'
              },
              color: '#1c3247',
              padding: 15,
            },
            suggestedMin: 60,
            suggestedMax: 100,
          },
        },
      },
    });
  };

  useEffect(() => actualizarDetalle(), [selectedFacIdx, selectedCarIdx, data]);

  if (loading)
    return <div className="text-white text-3xl text-center mt-24 font-aventura">Cargando...</div>;

  if (!data)
    return <div className="text-red-500 text-3xl text-center mt-24 font-aventura">Error al cargar datos</div>;

  const fac = data.facultades[selectedFacIdx];

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
          Dashboard de Facultades y Carreras
        </h1>

        <div className="mt-4 text-base sm:text-lg font-avenir">
          <strong className="text-[#fc7e00]">Dataset:</strong> {data.datasetName} |
          <strong className="text-[#fc7e00] ml-3">Período:</strong> {data.periodo}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
          <span className="text-lg sm:text-xl font-bold text-[#1c3247] font-aventura">Porcentaje Global:</span>
          <div className="bg-[#fc7e00] text-white text-3xl sm:text-4xl font-bold px-8 sm:px-10 py-3 sm:py-4 rounded-xl font-aventura">
            {data.global.toFixed(2)}%
          </div>
        </div>

        <h2 className="text-[#1c3247] text-lg sm:text-xl mt-10 font-aventura">Resumen General de Facultades</h2>
        <div style={{ height: window.innerWidth < 768 ? "300px" : "400px" }}>
          <canvas ref={canvases.facultades}></canvas>
        </div>

        <h2 className="text-[#1c3247] text-lg sm:text-xl mt-10 mb-3 font-aventura">Resumen por Facultad</h2>

        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse rounded-lg overflow-hidden shadow-md">
            <thead className="bg-[#1c3247] text-white">
              <tr>
                <th className="p-2 sm:p-3 text-left text-sm sm:text-base font-aventura">Facultad</th>
                <th className="p-2 sm:p-3 text-center text-sm sm:text-base font-aventura">Total Global</th>
                <th className="p-2 sm:p-3 text-left text-sm sm:text-base font-aventura">Carrera Mejor Puntuada</th>
                <th className="p-2 sm:p-3 text-left text-sm sm:text-base font-aventura">Carrera Menor Puntuada</th>
              </tr>
            </thead>
            <tbody className="font-avenir text-sm sm:text-base">
              {data.facultades.map((fac, idx) => {
                const carrerasOrdenadas = [...fac.carreras].sort((a, b) => b.total - a.total);
                const mejor = carrerasOrdenadas[0];
                const peor = carrerasOrdenadas[carrerasOrdenadas.length - 1];

                return (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 sm:p-3 font-semibold">{toTitle(fac.nombre)}</td>
                    <td className="p-2 sm:p-3 text-center">
                      <span
                        className="px-2 sm:px-3 py-1 rounded-full text-white font-semibold font-aventura text-xs sm:text-base"
                        style={{
                          background:
                            fac.total < 75 ? "#c0392b" : fac.total < 80 ? "#f39c12" : "#27ae60",
                        }}
                      >
                        {fac.total.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-2 sm:p-3">
                      {toTitle(mejor.nombre)} ({mejor.total.toFixed(2)}%)
                    </td>
                    <td className="p-2 sm:p-3">
                      {toTitle(peor.nombre)} ({peor.total.toFixed(2)}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ height: "50px" }}></div>
        <h2 className="text-[#1c3247] text-lg sm:text-xl mt-10 font-aventura">Porcentaje Global por Criterio</h2>
        <div style={{ height: window.innerWidth < 768 ? "250px" : "300px" }}>
          <canvas ref={canvases.globalCriterios}></canvas>
        </div>

        <h2 className="text-[#1c3247] text-lg sm:text-xl mt-10 font-aventura">Detalle por Facultad</h2>

        <select
          value={selectedFacIdx}
          onChange={(e) => {
            setSelectedFacIdx(+e.target.value);
            setSelectedCarIdx(0);
          }}
          className="mt-3 border-2 border-[#3c7aa0] rounded-md p-2 text-base sm:text-lg font-avenir w-full sm:w-auto"
        >
          {data.facultades.map((f, i) => (
            <option key={i} value={i}>
              {toTitle(f.nombre)}
            </option>
          ))}
        </select>

        <h3 className="mt-4 text-lg sm:text-xl font-semibold font-aventura">
          {toTitle(fac.nombre)} ({fac.total.toFixed(2)}%)
        </h3>

        <table className="w-full mt-4 border-collapse">
          <thead className="bg-[#1c3247] text-white">
            <tr>
              <th className="p-2 text-left text-sm sm:text-base font-aventura">Carrera</th>
              <th className="p-2 text-center text-sm sm:text-base font-aventura">Total</th>
            </tr>
          </thead>
          <tbody className="font-avenir text-sm sm:text-base">
            {fac.carreras.map((car, i) => {
              const color = car.total < 75 ? "#c0392b" : car.total < 80 ? "#f39c12" : "#27ae60";
              return (
                <tr key={i}>
                  <td className="p-2 border-b">{toTitle(car.nombre)}</td>
                  <td className="p-2 text-center font-bold border-b font-aventura" style={{ color }}>
                    {car.total.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <select
          value={selectedCarIdx}
          onChange={(e) => setSelectedCarIdx(+e.target.value)}
          className="mt-6 mb-4 border-2 border-[#fc7e00] rounded-md p-2 text-base sm:text-lg font-avenir w-full"
        >
          {fac.carreras.map((c, i) => (
            <option key={i} value={i}>
              {toTitle(c.nombre)}
            </option>
          ))}
        </select>

        <div style={{ height: window.innerWidth < 768 ? "250px" : "300px" }}>
          <canvas ref={canvases.detalle}></canvas>
        </div>

        <h3 className="text-[#1c3247] text-lg sm:text-xl mt-12 font-aventura">Radar de la Carrera</h3>
        <div style={{ height: window.innerWidth < 768 ? "300px" : "450px" }}>
          <canvas ref={canvases.radar}></canvas>
        </div>
      </div>
    </div>
  );
}
