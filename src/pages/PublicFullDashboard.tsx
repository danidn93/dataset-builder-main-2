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

/* ======================================================
   COLORES
====================================================== */
const COLORES_UNEMI = [
  "#1c3247", "#264763", "#335f7f", "#3c7aa0", "#4597bf",
  "#fc7e00", "#ea7d06", "#f48521", "#f78d37", "#f7964d",
  "#fe9900", "#da8b33", "#f28f19", "#ef922e", "#f49d47",
  "#002E45", "#222223"
];

/* ======================================================
   TIPOS
====================================================== */
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
  dedicaciones?: string[];
}

/* ======================================================
   HELPERS DE TEXTO
====================================================== */
function toTitle(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function wrapLabel(text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = line + " " + words[i];
    if (test.length <= maxWidth) line = test;
    else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

/* ======================================================
   HELPERS DE VOTOS
====================================================== */
type Conteo15 = Record<number | string, number>;

function sumConteo15(obj?: Conteo15 | null): number {
  if (!obj) return 0;
  return (obj[1] ?? 0) + (obj[2] ?? 0) + (obj[3] ?? 0) + (obj[4] ?? 0) + (obj[5] ?? 0);
}

/* ======================================================
   VOTOS → ENCUESTADOS
   (CORRECCIÓN PRINCIPAL)
====================================================== */
function encuestadosDesdeVotos(totalVotos: number, totalCriterios: number): number {
  if (!totalCriterios) return 0;
  return Math.round(totalVotos / totalCriterios);
}

function votosGlobalTotal(vpn: any, facultades: { nombre: string }[], criterios: string[]) {
  let total = 0;
  criterios.forEach(c => {
    const map = vpn?.criterio_facultad?.[c];
    facultades.forEach(f => {
      total += sumConteo15(map?.[f.nombre]);
    });
  });
  return total;
}

function votosFacultadTotal(vpn: any, facultad: string, criterios: string[]) {
  let total = 0;
  criterios.forEach(c => {
    total += sumConteo15(vpn?.criterio_facultad?.[c]?.[facultad]);
  });
  return total;
}

function votosCriterioGlobal(vpn: any, criterio: string, facultades: { nombre: string }[]) {
  let total = 0;
  facultades.forEach(f => {
    total += sumConteo15(vpn?.criterio_facultad?.[criterio]?.[f.nombre]);
  });
  return total;
}

function votosCriterioEnFacultad(vpn: any, criterio: string, facultad: string) {
  return sumConteo15(vpn?.criterio_facultad?.[criterio]?.[facultad]);
}

/* ======================================================
   COMPONENTE
====================================================== */
export default function PublicFullDashboard() {
  const { token } = useParams();

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [dedicaciones, setDedicaciones] = useState<string[]>([]);
  const [dedicacionSeleccionada, setDedicacionSeleccionada] = useState("ALL");

  const [selectedFacIdx, setSelectedFacIdx] = useState(0);
  const [selectedCarIdx, setSelectedCarIdx] = useState(0);

  const canvases = {
    facultades: useRef<HTMLCanvasElement>(null),
    criterios: useRef<HTMLCanvasElement>(null),
    detalle: useRef<HTMLCanvasElement>(null),
    radar: useRef<HTMLCanvasElement>(null),
  };

  const charts = useRef<Record<string, Chart>>({});

  /* ======================================================
     CARGA DE DATOS
  ====================================================== */
  useEffect(() => {
    const cargar = async () => {
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
      setData(json.data);
      setDedicaciones(json.data?.dedicaciones || []);
      setSelectedFacIdx(0);
      setSelectedCarIdx(0);
      setLoading(false);
    };

    if (token) cargar();
  }, [token, dedicacionSeleccionada]);

  /* ======================================================
     GRÁFICOS
  ====================================================== */
  useEffect(() => {
    if (!data) return;

    Object.values(charts.current).forEach(c => c.destroy());
    charts.current = {};

    const isMobile = window.innerWidth < 768;

    /* ---------- FACULTADES ---------- */
    charts.current.facultades = new Chart(canvases.facultades.current!, {
      type: "bar",
      data: {
        labels: data.facultades.map(f => wrapLabel(toTitle(f.nombre), 25)),
        datasets: [{
          data: data.facultades.map(f => f.total),
          backgroundColor: data.facultades.map((_, i) => COLORES_UNEMI[i % COLORES_UNEMI.length]),
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { max: 100 } },
      },
    });

    /* ---------- CRITERIOS GLOBALES ---------- */
    const promedios = data.criterios.map((_, i) => {
      let sum = 0, count = 0;
      data.facultades.forEach(f =>
        f.carreras.forEach(c => {
          if (!isNaN(c.criterios[i])) {
            sum += c.criterios[i];
            count++;
          }
        })
      );
      return count ? sum / count : 0;
    });

    charts.current.criterios = new Chart(canvases.criterios.current!, {
      type: "bar",
      data: {
        labels: data.criterios.map(c => wrapLabel(c, 25)),
        datasets: [{
          data: promedios,
          backgroundColor: data.criterios.map((_, i) => COLORES_UNEMI[i % COLORES_UNEMI.length]),
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: ctx => {
                const crit = data.criterios[ctx.dataIndex];
                const enc = votosCriterioGlobal(data.votos_por_numero, crit, data.facultades);
                return `Encuestados: ${enc}`;
              },
            },
          },
        },
        scales: { y: { max: 100 } },
      },
    });

    /* ---------- DETALLE ---------- */
    const fac = data.facultades[selectedFacIdx];
    const car = fac.carreras[selectedCarIdx];

    charts.current.detalle = new Chart(canvases.detalle.current!, {
      type: "bar",
      data: {
        labels: data.criterios.map(c => wrapLabel(c, 25)),
        datasets: [{
          data: car.criterios,
          backgroundColor: data.criterios.map((_, i) => COLORES_UNEMI[i % COLORES_UNEMI.length]),
        }],
      },
      options: { responsive: true, scales: { y: { max: 100 } } },
    });

    charts.current.radar = new Chart(canvases.radar.current!, {
      type: "radar",
      data: {
        labels: data.criterios,
        datasets: [{
          label: car.nombre,
          data: car.criterios,
          backgroundColor: "rgba(252,126,0,.2)",
          borderColor: "#fc7e00",
        }],
      },
      options: { responsive: true },
    });

  }, [data, selectedFacIdx, selectedCarIdx]);

  if (loading) return <div className="text-white text-3xl text-center mt-24">Cargando…</div>;
  if (!data) return <div className="text-red-500 text-3xl text-center mt-24">Error</div>;

  const votosGlobal = votosGlobalTotal(data.votos_por_numero, data.facultades, data.criterios);
  const encuestadosGlobal = encuestadosDesdeVotos(votosGlobal, data.criterios.length);
  const fac = data.facultades[selectedFacIdx];

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="min-h-screen bg-[#1c3247] p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-[#1c3247]">
          {data.datasetName}
        </h1>

        <p className="mt-2 text-lg">
          Período: <strong>{data.periodo}</strong>
        </p>

        {dedicaciones.length > 0 && (
          <div className="mt-4 max-w-sm">
            <Select value={dedicacionSeleccionada} onValueChange={setDedicacionSeleccionada}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las dedicaciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {dedicaciones.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="mt-6 flex items-center gap-4">
          <div className="bg-[#fc7e00] text-white text-4xl font-bold px-8 py-4 rounded-xl">
            {data.global.toFixed(2)}%
            <div className="text-sm mt-1 opacity-90">
              Encuestados: {encuestadosGlobal}
            </div>
          </div>
        </div>

        <h2 className="mt-10 text-xl font-semibold">Facultades</h2>
        <canvas ref={canvases.facultades} />

        <h2 className="mt-10 text-xl font-semibold">Porcentaje Global por Criterio</h2>
        <canvas ref={canvases.criterios} />

        <h2 className="mt-10 text-xl font-semibold">Detalle por Facultad</h2>
        <select
          className="mt-3 border p-2"
          value={selectedFacIdx}
          onChange={e => setSelectedFacIdx(+e.target.value)}
        >
          {data.facultades.map((f, i) => (
            <option key={i} value={i}>{toTitle(f.nombre)}</option>
          ))}
        </select>

        <table className="w-full mt-4 border">
          <thead className="bg-[#1c3247] text-white">
            <tr>
              <th className="p-2 text-left">Criterio</th>
              <th className="p-2 text-center">%</th>
              <th className="p-2 text-center">Encuestados</th>
            </tr>
          </thead>
          <tbody>
            {data.criterios.map((c, i) => {
              const valores = fac.carreras.map(car => car.criterios[i]).filter(v => !isNaN(v));
              const pct = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
              const enc = votosCriterioEnFacultad(data.votos_por_numero, c, fac.nombre);
              return (
                <tr key={c} className="border-b">
                  <td className="p-2">{c}</td>
                  <td className="p-2 text-center">{pct.toFixed(2)}%</td>
                  <td className="p-2 text-center font-bold">{enc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h2 className="mt-10 text-xl font-semibold">Detalle por Carrera</h2>
        <select
          className="mt-3 border p-2 w-full"
          value={selectedCarIdx}
          onChange={e => setSelectedCarIdx(+e.target.value)}
        >
          {fac.carreras.map((c, i) => (
            <option key={i} value={i}>{toTitle(c.nombre)}</option>
          ))}
        </select>

        <canvas className="mt-4" ref={canvases.detalle} />
        <canvas className="mt-6" ref={canvases.radar} />
      </div>
    </div>
  );
}
