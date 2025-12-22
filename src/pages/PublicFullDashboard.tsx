import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Chart from "chart.js/auto";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// Colores institucionales UNEMI
const COLORES_UNEMI = [
  "#1c3247", "#264763", "#335f7f", "#3c7aa0", "#4597bf",
  "#fc7e00", "#ea7d06", "#f48521", "#f78d37", "#f7964d",
  "#fe9900", "#da8b33", "#f28f19", "#ef922e", "#f49d47",
  "#002E45", "#222223"
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
  version_id: string;
  global: number;
  criterios: string[];
  facultades: Facultad[];
  datasetName: string;
  periodo: string;
  votos_por_numero?: any;

  // ✅ viene desde edge function
  dedicaciones?: string[];
}

/* ======================================================
   HELPERS: TITLES / WRAP
====================================================== */
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
    if (testLine.length <= maxWidth) currentLine = testLine;
    else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

/* ======================================================
   HELPERS: VOTOS (respuestas 1..5)
====================================================== */
type Conteo15 = Record<number | string, number>;

function sumConteo15(obj?: Conteo15 | null): number {
  if (!obj) return 0;
  return (obj[1] ?? 0) + (obj[2] ?? 0) + (obj[3] ?? 0) + (obj[4] ?? 0) + (obj[5] ?? 0);
}

/* ======================================================
   ✅ ENCUESTADOS
   - Global/Facultad/Carrera: dividir votos totales / #criterios
   - Criterio: 1 respuesta = 1 encuestado (no dividir)
====================================================== */
function encuestadosDesdeVotos(totalVotos: number, totalCriterios: number): number {
  if (!totalCriterios) return 0;
  return Math.round(totalVotos / totalCriterios);
}

// votos global (sumando todas las facultades y todos los criterios)
function votosGlobalTotal(vpn: any, facultades: { nombre: string }[], criterios: string[]): number {
  const cf = vpn?.criterio_facultad;
  if (!cf) return 0;

  let n = 0;
  for (const criterio of criterios) {
    const mapFac = cf?.[criterio];
    if (!mapFac) continue;
    for (const f of facultades) {
      n += sumConteo15(mapFac?.[f.nombre]);
    }
  }
  return n;
}

// votos total por Facultad (sumando todos los criterios)
function votosFacultadTotal(vpn: any, facultad: string, criterios: string[]): number {
  const cf = vpn?.criterio_facultad;
  if (!cf) return 0;

  let n = 0;
  for (const criterio of criterios) {
    n += sumConteo15(cf?.[criterio]?.[facultad]);
  }
  return n;
}

// votos para un criterio global (sumando facultades) => encuestados reales del criterio
function votosCriterioGlobal(vpn: any, criterio: string, facultades: { nombre: string }[]): number {
  const cf = vpn?.criterio_facultad?.[criterio];
  if (!cf) return 0;

  let n = 0;
  for (const f of facultades) {
    n += sumConteo15(cf?.[f.nombre]);
  }
  return n;
}

// votos por criterio dentro de una Facultad => encuestados reales del criterio en esa facultad
function votosCriterioEnFacultad(vpn: any, criterio: string, facultad: string): number {
  const cf = vpn?.criterio_facultad?.[criterio]?.[facultad];
  return sumConteo15(cf);
}

// votos por criterio dentro de una Carrera (fac|||car) => encuestados reales del criterio en esa carrera
function votosCriterioEnCarrera(vpn: any, criterio: string, facNombre: string, carNombre: string): number {
  const cc = vpn?.criterio_carrera?.[criterio];
  if (!cc) return 0;
  const key = `${facNombre}|||${carNombre}`;
  return sumConteo15(cc?.[key]);
}

// votos total por Carrera (sumando todos los criterios)
function votosCarreraTotal(vpn: any, criterios: string[], facNombre: string, carNombre: string): number {
  let total = 0;
  for (const criterio of criterios) {
    total += votosCriterioEnCarrera(vpn, criterio, facNombre, carNombre);
  }
  return total;
}

export default function PublicFullDashboard() {
  const { token } = useParams();

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFacIdx, setSelectedFacIdx] = useState(0);
  const [selectedCarIdx, setSelectedCarIdx] = useState(0);

  // ✅ filtro por DEDICACION
  const [dedicaciones, setDedicaciones] = useState<string[]>([]);
  const [dedicacionSeleccionada, setDedicacionSeleccionada] = useState<string>("ALL");

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

  // ✅ cargar (y recargar) cuando cambie la dedicación
  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-dashboard`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              token,
              dedicacion: dedicacionSeleccionada === "ALL" ? null : dedicacionSeleccionada,
            }),
          }
        );

        const json = await res.json();
        if (!json.data) throw new Error("Token inválido");

        const payload: Data = json.data;

        // set dedicaciones (si viene vacío, el filtro desaparece)
        const ded = Array.isArray(payload.dedicaciones) ? payload.dedicaciones : [];
        setDedicaciones(ded);
        if (ded.length === 0) setDedicacionSeleccionada("ALL");

        setData(payload);

        // reiniciar índices al recargar
        setSelectedFacIdx(0);
        setSelectedCarIdx(0);
      } catch (e) {
        alert("Error al cargar dashboard público");
        setData(null);
        setDedicaciones([]);
        setDedicacionSeleccionada("ALL");
      } finally {
        setLoading(false);
      }
    };

    if (token) cargar();
  }, [token, dedicacionSeleccionada]);

  useEffect(() => {
    if (!data) return;

    Object.values(charts.current).forEach((c) => c?.destroy());
    charts.current = {};

    const isMobile = window.innerWidth < 768;

    // Plugin: Etiquetas arriba en naranja (SOLO BARRAS)
    // ✅ Ajuste: usar "E:" en lugar de "Encuestados:" para no saturar el gráfico.
    const barLabelsTop = {
      id: "barLabelsTop",
      afterDatasetsDraw(chart: Chart) {
        if ((chart.config as any).type !== "bar") return;

        const ctx = chart.ctx;
        ctx.save();
        ctx.font = `bold ${isMobile ? "10px" : "14px"} Montserrat, sans-serif`;
        ctx.fillStyle = "#fc7e00";
        ctx.textAlign = "center";

        const chartId = (chart.canvas as any)?.id || "";

        chart.data.datasets.forEach((ds, i) => {
          chart.getDatasetMeta(i).data.forEach((bar: any, j: number) => {
            const val = ds.data[j] as number;
            const yOffset = isMobile ? -5 : -10;

            // FACULTADES: % + E (votos fac / criterios)
            if (chartId === "facultades-canvas" && data?.votos_por_numero) {
              const facNombre = data.facultades[j]?.nombre;
              const votos = votosFacultadTotal(data.votos_por_numero, facNombre, data.criterios);
              const e = encuestadosDesdeVotos(votos, data.criterios.length);
              ctx.fillText(`${val.toFixed(2)}% (E:${e})`, bar.x, bar.y + yOffset);
              return;
            }

            // GLOBAL CRITERIOS: % + E (directo por criterio)
            if (chartId === "global-criterios-canvas" && data?.votos_por_numero) {
              const criterioName = data.criterios[j];
              const e = votosCriterioGlobal(data.votos_por_numero, criterioName, data.facultades);
              ctx.fillText(`${val.toFixed(2)}% (E:${e})`, bar.x, bar.y + yOffset);
              return;
            }

            // DETALLE CARRERA: % + E (directo por criterio en carrera)
            if (chartId === "detalle-canvas" && data?.votos_por_numero) {
              const fac = data.facultades[selectedFacIdx];
              const car = fac?.carreras[selectedCarIdx];
              const criterioName = data.criterios[j];
              const e = votosCriterioEnCarrera(
                data.votos_por_numero,
                criterioName,
                fac.nombre,
                car.nombre
              );
              ctx.fillText(`${val.toFixed(2)}% (E:${e})`, bar.x, bar.y + yOffset);
              return;
            }

            // Default
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

    // FACULTADES
    const facultadesColors = data.facultades.map(
      (_, i) => COLORES_UNEMI[i % COLORES_UNEMI.length]
    );

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
          tooltip: {
            enabled: true,
            callbacks: {
              ...multilineTooltipCallbacks,
              afterLabel: (ctx: any) => {
                const facNombre = data.facultades[ctx.dataIndex]?.nombre;
                const votos = votosFacultadTotal(data.votos_por_numero, facNombre, data.criterios);
                const e = encuestadosDesdeVotos(votos, data.criterios.length);
                return `E: ${e}`;
              },
            },
          },
        } as any,
        scales: {
          x: {
            display: !isMobile,
            ticks: { font: { size: 12, family: "Inter, sans-serif" }, maxRotation: 0, minRotation: 0 },
          },
          y: { beginAtZero: true, max: 100, display: !isMobile },
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

    const criteriosColors = data.criterios.map(
      (_, i) => COLORES_UNEMI[i % COLORES_UNEMI.length]
    );

    charts.current.global = new Chart(canvases.globalCriterios.current!, {
      type: "bar",
      data: {
        labels: data.criterios.map((c) => wrapLabel(c, 20)),
        datasets: [{ data: proms, backgroundColor: criteriosColors, borderRadius: 6 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              ...multilineTooltipCallbacks,
              afterLabel: (ctx: any) => {
                const criterioName = data.criterios[ctx.dataIndex];
                const e = votosCriterioGlobal(data.votos_por_numero, criterioName, data.facultades);
                return `E: ${e}`;
              },
            },
          },
        } as any,
        scales: {
          x: {
            display: !isMobile,
            ticks: { font: { size: 11, family: "Inter, sans-serif" }, maxRotation: 0, minRotation: 0 },
          },
          y: { max: 100, display: !isMobile },
        },
      },
    });

    actualizarDetalle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const actualizarDetalle = () => {
    if (!data) return;

    const fac = data.facultades[selectedFacIdx];
    const car = fac.carreras[selectedCarIdx];
    const isMobile = window.innerWidth < 768;

    const detalleColors = data.criterios.map(
      (_, i) => COLORES_UNEMI[i % COLORES_UNEMI.length]
    );

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
        datasets: [{ data: car.criterios, backgroundColor: detalleColors, borderRadius: 6 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              ...multilineTooltipCallbacks,
              afterLabel: (ctx: any) => {
                const criterioName = data.criterios[ctx.dataIndex];
                const e = votosCriterioEnCarrera(
                  data.votos_por_numero,
                  criterioName,
                  fac.nombre,
                  car.nombre
                );
                return `E: ${e}`;
              },
            },
          },
        } as any,
        scales: {
          x: {
            display: !isMobile,
            ticks: { font: { size: 11, family: "Inter, sans-serif" }, maxRotation: 0, minRotation: 0 },
          },
          y: { max: 100, display: !isMobile },
        },
      },
    });

    // RADAR
    if (charts.current.radar) charts.current.radar.destroy();
    charts.current.radar = new Chart(canvases.radar.current!, {
      type: "radar",
      data: {
        labels: data.criterios.map((c) => (isMobile ? "" : wrapLabel(c, 25))),
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
              title: (items: any) => data.criterios[items[0].dataIndex],
              label: (context: any) => {
                const criterioName = data.criterios[context.dataIndex];
                const e = votosCriterioEnCarrera(
                  data.votos_por_numero,
                  criterioName,
                  fac.nombre,
                  car.nombre
                );
                return `${context.parsed.r.toFixed(2)}% — E: ${e}`;
              },
            },
          },
        } as any,
        scales: {
          r: {
            angleLines: { color: "rgba(0, 0, 0, 0.1)" },
            grid: { color: "rgba(0, 0, 0, 0.1)" },
            ticks: {
              display: !isMobile,
              backdropColor: "transparent",
              font: { size: 10, family: "Inter, sans-serif" },
            },
            pointLabels: {
              display: !isMobile,
              font: { size: 11, family: "Inter, sans-serif" },
              color: "#1c3247",
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
    return (
      <div className="text-white text-3xl text-center mt-24 font-aventura">
        Cargando...
      </div>
    );

  if (!data)
    return (
      <div className="text-red-500 text-3xl text-center mt-24 font-aventura">
        Error al cargar datos
      </div>
    );

  const fac = data.facultades[selectedFacIdx];

  const votosGlobal = votosGlobalTotal(data.votos_por_numero, data.facultades, data.criterios);
  const encuestadosGlobal = encuestadosDesdeVotos(votosGlobal, data.criterios.length);

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
          <strong className="text-[#fc7e00] ml-3">Período:</strong> {data.periodo}
        </div>

        {/* ✅ Leyenda E */}
        <div className="mt-2 text-sm font-avenir text-gray-600">
          <strong>E:</strong> Cantidad de encuestados
        </div>

        {/* ✅ Filtro DEDICACION (solo si existe) */}
        {dedicaciones.length > 0 && (
          <div className="mt-4 max-w-sm">
            <label className="block text-sm font-semibold font-avenir text-[#1c3247] mb-1">
              Dedicación
            </label>

            <Select
              value={dedicacionSeleccionada}
              onValueChange={(v) => setDedicacionSeleccionada(v)}
            >
              <SelectTrigger className="font-avenir">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {dedicaciones.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ✅ Porcentaje global + E */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
          <span className="text-lg sm:text-xl font-bold text-[#1c3247] font-aventura">
            Porcentaje Global:
          </span>

          <div className="bg-[#fc7e00] text-white text-3xl sm:text-4xl font-bold px-8 sm:px-10 py-3 sm:py-4 rounded-xl font-aventura text-center">
            {data.global.toFixed(2)}%
            <div className="text-sm font-avenir font-normal opacity-90 mt-1">
              E: {encuestadosGlobal}
            </div>
          </div>
        </div>

        <h2 className="text-[#1c3247] text-lg sm:text-xl mt-10 font-aventura">
          Resumen General de Facultades
        </h2>
        <div style={{ height: window.innerWidth < 768 ? "300px" : "400px" }}>
          <canvas id="facultades-canvas" ref={canvases.facultades}></canvas>
        </div>

        <h2 className="text-[#1c3247] text-lg sm:text-xl mt-10 mb-3 font-aventura">
          Resumen por Facultad
        </h2>

        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse rounded-lg overflow-hidden shadow-md">
            <thead className="bg-[#1c3247] text-white">
              <tr>
                <th className="p-2 sm:p-3 text-left text-sm sm:text-base font-aventura">
                  Facultad
                </th>
                <th className="p-2 sm:p-3 text-center text-sm sm:text-base font-aventura">
                  Total Global
                </th>

                <th className="p-2 sm:p-3 text-center text-sm sm:text-base font-aventura">
                  E
                </th>

                <th className="p-2 sm:p-3 text-left text-sm sm:text-base font-aventura">
                  Carrera Mejor Puntuada
                </th>
                <th className="p-2 sm:p-3 text-left text-sm sm:text-base font-aventura">
                  Carrera Menor Puntuada
                </th>
              </tr>
            </thead>
            <tbody className="font-avenir text-sm sm:text-base">
              {data.facultades.map((facItem, idx) => {
                const carrerasOrdenadas = [...facItem.carreras].sort((a, b) => b.total - a.total);
                const mejor = carrerasOrdenadas[0];
                const peor = carrerasOrdenadas[carrerasOrdenadas.length - 1];

                const votosFac = votosFacultadTotal(data.votos_por_numero, facItem.nombre, data.criterios);
                const eFac = encuestadosDesdeVotos(votosFac, data.criterios.length);

                return (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 sm:p-3 font-semibold">{toTitle(facItem.nombre)}</td>

                    <td className="p-2 sm:p-3 text-center">
                      <span
                        className="px-2 sm:px-3 py-1 rounded-full text-white font-semibold font-aventura text-xs sm:text-base"
                        style={{
                          background: facItem.total < 75 ? "#c0392b" : facItem.total < 80 ? "#f39c12" : "#27ae60",
                        }}
                      >
                        {facItem.total.toFixed(2)}%
                      </span>
                    </td>

                    <td className="p-2 sm:p-3 text-center font-bold font-avenir">
                      {eFac}
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

        <h2 className="text-[#1c3247] text-lg sm:text-xl mt-10 font-aventura">
          Porcentaje Global por Criterio
        </h2>
        <div style={{ height: window.innerWidth < 768 ? "250px" : "300px" }}>
          <canvas id="global-criterios-canvas" ref={canvases.globalCriterios}></canvas>
        </div>

        <h2 className="text-[#1c3247] text-lg sm:text-xl mt-10 font-aventura">
          Detalle por Facultad
        </h2>

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
          {toTitle(fac.nombre)} ({fac.total.toFixed(2)}%){" "}
          <span className="text-sm font-avenir font-normal text-gray-600">
            E:{" "}
            {encuestadosDesdeVotos(
              votosFacultadTotal(data.votos_por_numero, fac.nombre, data.criterios),
              data.criterios.length
            )}
          </span>
        </h3>

        <h3 className="mt-6 text-lg sm:text-xl font-semibold font-aventura text-[#1c3247]">
          E por criterio en {toTitle(fac.nombre)}
        </h3>

        <div className="overflow-x-auto mt-3">
          <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
            <thead className="bg-[#1c3247] text-white">
              <tr>
                <th className="p-2 text-left text-sm sm:text-base font-aventura">Criterio</th>
                <th className="p-2 text-center text-sm sm:text-base font-aventura">%</th>
                <th className="p-2 text-center text-sm sm:text-base font-aventura">E</th>
              </tr>
            </thead>
            <tbody className="font-avenir text-sm sm:text-base">
              {data.criterios.map((crit, i) => {
                const valores = fac.carreras
                  .map((c) => c.criterios[i])
                  .filter((v) => !isNaN(v));

                const pct = valores.length
                  ? valores.reduce((a, b) => a + b, 0) / valores.length
                  : 0;

                const e = votosCriterioEnFacultad(data.votos_por_numero, crit, fac.nombre);

                return (
                  <tr key={crit} className="border-b hover:bg-gray-50">
                    <td className="p-2">{crit}</td>
                    <td className="p-2 text-center font-aventura">{pct.toFixed(2)}%</td>
                    <td className="p-2 text-center font-bold">{e}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ✅ Tabla de carreras: agregar E */}
        <table className="w-full mt-6 border-collapse">
          <thead className="bg-[#1c3247] text-white">
            <tr>
              <th className="p-2 text-left text-sm sm:text-base font-aventura">Carrera</th>
              <th className="p-2 text-center text-sm sm:text-base font-aventura">Total</th>
              <th className="p-2 text-center text-sm sm:text-base font-aventura">E</th>
            </tr>
          </thead>
          <tbody className="font-avenir text-sm sm:text-base">
            {fac.carreras.map((car, i) => {
              const color = car.total < 75 ? "#c0392b" : car.total < 80 ? "#f39c12" : "#27ae60";
              const votosCar = votosCarreraTotal(data.votos_por_numero, data.criterios, fac.nombre, car.nombre);
              const eCar = encuestadosDesdeVotos(votosCar, data.criterios.length);

              return (
                <tr key={i}>
                  <td className="p-2 border-b">{toTitle(car.nombre)}</td>
                  <td className="p-2 text-center font-bold border-b font-aventura" style={{ color }}>
                    {car.total.toFixed(2)}%
                  </td>
                  <td className="p-2 text-center font-bold border-b">
                    {eCar}
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
          <canvas id="detalle-canvas" ref={canvases.detalle}></canvas>
        </div>

        <h3 className="text-[#1c3247] text-lg sm:text-xl mt-12 font-aventura">
          Radar de la Carrera
        </h3>
        <div style={{ height: window.innerWidth < 768 ? "300px" : "450px" }}>
          <canvas ref={canvases.radar}></canvas>
        </div>
      </div>
    </div>
  );
}
