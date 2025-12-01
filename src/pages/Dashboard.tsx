// ======================================================
// DASHBOARD INTERNO COMPLETO (BOTONES DENTRO DEL CARD)
// ======================================================

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { FileDown, Share2 } from "lucide-react";

// IMÁGENES PDF
import portadaImg from "@/assets/pdf/portada.png?base64";
import curvaImg from "@/assets/pdf/curva.png?base64";
import footerImg from "@/assets/pdf/footer.png?base64";

// PDF GEN
import { generarReportePDF } from "@/lib/pdfGenerator";

// ------------------------------------------------
// Tipos
// ------------------------------------------------
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

// Title Case
function toTitle(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function Dashboard() {
  const { versionId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedFacIdx, setSelectedFacIdx] = useState(0);
  const [selectedCarIdx, setSelectedCarIdx] = useState(0);

  // MODAL PDF
  const [modalPDF, setModalPDF] = useState(false);
  const [pdfFacultadIdx, setPdfFacultadIdx] = useState(0);
  const [pdfCarreraIdx, setPdfCarreraIdx] = useState(0);

  // CANVAS
  const canvases = {
    facultades: useRef<HTMLCanvasElement>(null),
    globalCriterios: useRef<HTMLCanvasElement>(null),
    detalle: useRef<HTMLCanvasElement>(null),
    radar: useRef<HTMLCanvasElement>(null),
  };

  const charts = useRef<Record<string, Chart>>({});

  // Fondo azul global
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      body { margin: 0 !important; padding: 0 !important; background: #1c3247 !important; }
    `;
    document.head.appendChild(style);
  }, []);

  // ========================================
  // CARGAR DATA
  // ========================================
  useEffect(() => {
    const cargar = async () => {
      try {
        const vRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/dataset_versions?id=eq.${versionId}&select=periodo,dataset_id`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );
        const version = (await vRes.json())[0];

        const dRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/datasets?id=eq.${version.dataset_id}&select=nombre`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );
        const datasetName = (await dRes.json())[0]?.nombre || "Sin nombre";

        const aRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisis-version`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ versionId }),
          }
        );

        const analisis = await aRes.json();

        setData({
          global: analisis.global,
          criterios: analisis.criterios,
          facultades: analisis.facultades,
          datasetName,
          periodo: version.periodo || "",
          votos_por_numero: analisis.votos_por_numero,
        });
      } catch (e) {
        alert("Error al cargar dashboard");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [versionId]);

  // ========================================
  // RENDER GRÁFICOS
  // ========================================
  useEffect(() => {
    if (!data) return;

    Object.values(charts.current).forEach((c) => c?.destroy());
    charts.current = {};

    // Plugins — SOLO ETIQUETAS ARRIBA
    const barLabelsTop = {
      id: "barLabelsTop",
      afterDatasetsDraw(chart: Chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = "bold 14px Segoe UI";
        ctx.fillStyle = "#fc7e00";
        ctx.textAlign = "center";

        chart.data.datasets.forEach((ds, i) => {
          chart.getDatasetMeta(i).data.forEach((bar: any, j: number) => {
            const val = ds.data[j] as number;
            ctx.fillText(val.toFixed(2) + "%", bar.x, bar.y - 10);
          });
        });

        ctx.restore();
      },
    };

    // Plugin radar — SOLO etiqueta arriba
    const radarLabels = {
      id: "radarLabels",
      afterDatasetsDraw(chart: Chart) {
        const ctx = chart.ctx;
        const scale = chart.scales["r"];
        const ds = chart.data.datasets[0];
        if (!scale) return;

        ctx.save();
        ctx.font = "bold 14px Segoe UI";
        ctx.fillStyle = "#fc7e00";
        ctx.textAlign = "center";

        chart.getDatasetMeta(0).data.forEach((point: any, i: number) => {
          const val = ds.data[i] as number;
          ctx.fillText(val.toFixed(2) + "%", point.x, point.y - 12);
        });

        ctx.restore();
      },
    };

    Chart.register(barLabelsTop, radarLabels);

    // ==================== FACULTADES ====================
    charts.current.facultades = new Chart(canvases.facultades.current!, {
      type: "bar",
      data: {
        labels: data.facultades.map((f) => toTitle(f.nombre)),
        datasets: [
          {
            data: data.facultades.map((f) => f.total),
            backgroundColor: ["#1c3247", "#fc7e00", "#f48521", "#4597bf"],
            borderRadius: 7,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false }, datalabels: { display: false }, barLabelsTop: true },
        scales: { y: { beginAtZero: true, max: 100 } },
      },
    });

    // ==================== GLOBAL CRITERIOS ====================
    const proms = data.criterios.map((_, i) => {
      let sum = 0,
        count = 0;
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

    charts.current.global = new Chart(canvases.globalCriterios.current!, {
      type: "bar",
      data: {
        labels: data.criterios,
        datasets: [{ data: proms, backgroundColor: "#fc7e00", borderRadius: 6 }],
      },
      options: {
        plugins: { legend: { display: false }, datalabels: { display: false }, barLabelsTop: true },
        scales: { y: { max: 100 } },
      },
    });

    actualizarDetalle();
  }, [data]);

  const actualizarDetalle = () => {
    if (!data) return;

    const fac = data.facultades[selectedFacIdx];
    const car = fac.carreras[selectedCarIdx];

    // ========== DETALLE ==========
    if (charts.current.detalle) charts.current.detalle.destroy();
    charts.current.detalle = new Chart(canvases.detalle.current!, {
      type: "bar",
      data: {
        labels: data.criterios,
        datasets: [
          { data: car.criterios, backgroundColor: "#fc7e00", borderRadius: 6 },
        ],
      },
      options: {
        plugins: { legend: { display: false }, datalabels: { display: false }, barLabelsTop: true },
        scales: { y: { max: 100 } },
      },
    });

    // ========== RADAR ==========
    if (charts.current.radar) charts.current.radar.destroy();
    charts.current.radar = new Chart(canvases.radar.current!, {
      type: "radar",
      data: {
        labels: data.criterios.map((c) =>
          c.replace(/(.{25})/g, "$1\n")
        ),
        datasets: [
          {
            label: toTitle(car.nombre),
            data: car.criterios,
            backgroundColor: "rgba(63,122,160,0.15)",
            borderColor: "#fc7e00",
            pointBackgroundColor: "#fc7e00",
          },
        ],
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } },
        scales: {
          r: {
            ticks: { display: false },
            suggestedMin: 60,
            suggestedMax: 100,
          },
        },
      },
    });
  };

  useEffect(() => actualizarDetalle(), [
    selectedFacIdx,
    selectedCarIdx,
    data,
  ]);

  // ======================================
  // RENDER
  // ======================================
  if (loading)
    return <div className="text-white text-3xl text-center mt-24">Cargando...</div>;

  if (!data)
    return <div className="text-red-500 text-3xl text-center mt-24">Error al cargar datos</div>;

  const fac = data.facultades[selectedFacIdx];

  return (
    <div className="min-h-screen font-sans">
      <div
        style={{
          maxWidth: "1200px",
          margin: "2em auto",
          background: "white",
          borderRadius: "16px",
          padding: "40px",
          boxShadow: "0 6px 24px rgba(28,50,71,0.13)",
        }}
      >
        {/* BOTONES AHORA DENTRO DEL CARD */}
        <div className="flex justify-end gap-3 mb-6">
          {/* PDF */}
          <Dialog open={modalPDF} onOpenChange={setModalPDF}>
            <Button
              className="bg-accent hover:bg-accent/90 text-white rounded-lg h-12 text-base font-semibold"
              onClick={() => setModalPDF(true)}
            >
              <FileDown className="mr-2 h-5 w-5" /> Generar PDF
            </Button>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generar Reporte PDF</DialogTitle>
                <DialogDescription>Selecciona facultad y carrera.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-semibold">Facultad:</label>
                  <Select
                    value={pdfFacultadIdx.toString()}
                    onValueChange={(v) => {
                      setPdfFacultadIdx(+v);
                      setPdfCarreraIdx(0);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {data.facultades.map((f, i) => (
                        <SelectItem value={i.toString()} key={i}>
                          {toTitle(f.nombre)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold">Carrera:</label>
                  <Select
                    value={pdfCarreraIdx.toString()}
                    onValueChange={(v) => setPdfCarreraIdx(+v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {data.facultades[pdfFacultadIdx].carreras.map((c, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {toTitle(c.nombre)} ({c.total}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full h-11 text-base font-semibold"
                  onClick={() => {
                    setModalPDF(false);

                    const fac = data.facultades[pdfFacultadIdx];
                    const car = fac.carreras[pdfCarreraIdx];

                    generarReportePDF(
                      {
                        facultad: toTitle(fac.nombre),
                        carrera: toTitle(car.nombre),
                        periodo: data.periodo,
                        muestra: 0,
                        criterios: data.criterios.map((c, idx) => ({
                          nombre: c,
                          valor: car.criterios[idx] ?? 0,
                        })),
                        promedioGeneral:
                          car.criterios.reduce((a, x) => a + x, 0) /
                          car.criterios.length,
                        porcentajeSatisfaccion: car.total,
                      },
                      {
                        portada: portadaImg,
                        header: curvaImg,
                        footer: footerImg,
                      }
                    );
                  }}
                >
                  <FileDown className="mr-2 h-4 w-4" /> Generar Reporte
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            className="bg-accent hover:bg-accent/90 text-white rounded-lg h-12 text-base font-semibold"
            onClick={() =>
              navigate(`/datasets/${data.datasetName}/versions/${versionId}/share-links`)
            }
          >
            <Share2 className="mr-2 h-5 w-5" /> Gestionar Links
          </Button>

          <Button
            className="bg-[#3c7aa0] hover:bg-[#3c7aa0]/90 text-white rounded-lg h-12 text-base font-semibold"
            onClick={async () => {
              try {
                const res = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-public-dashboard-link`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      apikey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
                      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
                    },
                    body: JSON.stringify({ versionId }),
                  }
                );

                const { url } = await res.json();
                await navigator.clipboard.writeText(url);
                alert("Link público copiado:\n" + url);
              } catch (err) {
                alert("Error al generar link público.");
              }
            }}
          >
            <Share2 className="mr-2 h-5 w-5" /> Compartir Dashboard
          </Button>
        </div>

        {/* ====================================================== */}
        {/* CONTENIDO PRINCIPAL */}
        {/* ====================================================== */}

        <h1 className="text-3xl font-bold text-[#1c3247]">
          Dashboard de Facultades y Carreras
        </h1>

        <div className="mt-4 text-lg">
          <strong className="text-[#fc7e00]">Dataset:</strong> {data.datasetName} |
          <strong className="text-[#fc7e00] ml-3">Período:</strong> {data.periodo}
        </div>

        {/* GLOBAL */}
        <div className="flex items-center gap-4 mt-6">
          <span className="text-xl font-bold text-[#1c3247]">Porcentaje Global:</span>
          <div className="bg-[#fc7e00] text-white text-4xl font-bold px-10 py-4 rounded-xl">
            {data.global.toFixed(2)}%
          </div>
        </div>

        {/* FACULTADES */}
        <h2 className="text-[#1c3247] text-xl mt-10">Resumen General de Facultades</h2>
        <canvas ref={canvases.facultades}></canvas>

        {/* ====================================================== */}
        {/* TABLA RESUMEN DE FACULTADES */}
        {/* ====================================================== */}

        <h2 className="text-[#1c3247] text-xl mt-10 mb-3">
          Resumen por Facultad
        </h2>

        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse rounded-lg overflow-hidden shadow-md">
            <thead className="bg-[#1c3247] text-white">
              <tr>
                <th className="p-3 text-left">Facultad</th>
                <th className="p-3 text-center">Total Global</th>
                <th className="p-3 text-left">Carrera Mejor Puntuada</th>
                <th className="p-3 text-left">Carrera Menor Puntuada</th>
              </tr>
            </thead>

            <tbody>
              {data.facultades.map((fac, idx) => {
                const carrerasOrdenadas = [...fac.carreras].sort(
                  (a, b) => b.total - a.total
                );

                const mejor = carrerasOrdenadas[0];
                const peor = carrerasOrdenadas[carrerasOrdenadas.length - 1];

                return (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold">{toTitle(fac.nombre)}</td>

                    <td className="p-3 text-center">
                      <span
                        className="px-3 py-1 rounded-full text-white font-semibold"
                        style={{
                          background:
                            fac.total < 75
                              ? "#c0392b"
                              : fac.total < 80
                              ? "#f39c12"
                              : "#27ae60",
                        }}
                      >
                        {fac.total.toFixed(2)}%
                      </span>
                    </td>

                    <td className="p-3">
                      {toTitle(mejor.nombre)} ({mejor.total.toFixed(2)}%)
                    </td>

                    <td className="p-3">
                      {toTitle(peor.nombre)} ({peor.total.toFixed(2)}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ===== ESPACIO ANTES DEL SIGUIENTE TÍTULO ===== */}
        <div style={{ height: "30px" }}></div>


        {/* CRITERIOS */}
        <div style={{ height: "50px" }}></div>
        <h2 className="text-[#1c3247] text-xl mt-10">Porcentaje Global por Criterio</h2>
        <canvas
          ref={canvases.globalCriterios}
          style={{ width: "100%", height: "300px" }}
        ></canvas>

        {/* DETALLE */}
        <h2 className="text-[#1c3247] text-xl mt-10">Detalle por Facultad</h2>

        <select
          value={selectedFacIdx}
          onChange={(e) => {
            setSelectedFacIdx(+e.target.value);
            setSelectedCarIdx(0);
          }}
          className="mt-3 border-2 border-[#3c7aa0] rounded-md p-2 text-lg"
        >
          {data.facultades.map((f, i) => (
            <option key={i} value={i}>
              {toTitle(f.nombre)}
            </option>
          ))}
        </select>

        <h3 className="mt-4 text-xl font-semibold">
          {toTitle(fac.nombre)} ({fac.total.toFixed(2)}%)
        </h3>

        {/* TABLA CARRERAS */}
        <table className="w-full mt-4 border-collapse">
          <thead className="bg-[#1c3247] text-white">
            <tr>
              <th className="p-2 text-left">Carrera</th>
              <th className="p-2 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {fac.carreras.map((car, i) => {
              const color =
                car.total < 75
                  ? "#c0392b"
                  : car.total < 80
                  ? "#f39c12"
                  : "#27ae60";

              return (
                <tr key={i}>
                  <td className="p-2 border-b">{toTitle(car.nombre)}</td>
                  <td className="p-2 text-center font-bold border-b" style={{ color }}>
                    {car.total.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* SELECT CARRERA */}
        <select
          value={selectedCarIdx}
          onChange={(e) => setSelectedCarIdx(+e.target.value)}
          className="mt-6 mb-10 border-2 border-[#fc7e00] rounded-md p-2 text-lg"
          style={{ minWidth: "300px" }}
        >
          {fac.carreras.map((c, i) => (
            <option key={i} value={i}>
              {toTitle(c.nombre)}
            </option>
          ))}
        </select>

        {/* GRÁFICO DETALLE */}
        
        <canvas ref={canvases.detalle} className="w-full h-[300px]"></canvas>

        {/* RADAR 
        <h3 className="text-[#1c3247] text-xl mt-12">Radar de la Carrera</h3>
        <canvas ref={canvases.radar} className="w-full h-[330px]"></canvas>*/}
      </div>
    </div>
  );
}
