// ======================================================
// DASHBOARD PÚBLICO SOLO LECTURA (PublicFullDashboard)
// ======================================================

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Chart from "chart.js/auto";

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
  periodo: string;
  datasetName: string;
}

function toTitle(str: string) {
  return str
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function PublicFullDashboard() {
  const { token } = useParams();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedFacIdx, setSelectedFacIdx] = useState(0);
  const [selectedCarIdx, setSelectedCarIdx] = useState(0);

  const canvases = {
    facultades: useRef<HTMLCanvasElement>(null),
    global: useRef<HTMLCanvasElement>(null),
    detalle: useRef<HTMLCanvasElement>(null),
    radar: useRef<HTMLCanvasElement>(null),
  };

  const charts = useRef<Record<string, Chart>>({});

  // ======================================
  // CARGAR DATA
  // ======================================
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-dashboard`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${
                import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
              }`,
            },
            body: JSON.stringify({ token }),
          }
        );

        const json = await res.json();
        if (!json.data) throw new Error("Token inválido");

        setData(json.data);
      } catch (err) {
        alert("Error cargando dashboard público");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  // ======================================================
  // RENDER GRAFICOS
  // ======================================================
  useEffect(() => {
    if (!data) return;

    Object.values(charts.current).forEach((c) => c?.destroy());
    charts.current = {};

    // ======================================================
    // PLUGIN → LABELS EXTERNOS (2 DECIMALES) BARRAS
    // ======================================================
    const externalLabels = {
      id: "externalLabels",
      afterDatasetsDraw(chart: Chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = "bold 13px Segoe UI, Arial";
        ctx.fillStyle = "#fc7e00";
        ctx.textAlign = "center";

        chart.data.datasets.forEach((ds, i) => {
          chart.getDatasetMeta(i).data.forEach((bar: any, j: number) => {
            const val = Number(ds.data[j]);
            ctx.fillText(val.toFixed(2) + "%", bar.x, bar.y - 8);
          });
        });

        ctx.restore();
      },
    };

    // ======================================================
    // PLUGIN → RADAR SOLO 1 LABEL POR CRITERIO
    // ======================================================
    const radarValueLabels = {
      id: "radarValueLabels",
      afterDatasetsDraw(chart: Chart) {
        const sc = chart.scales["r"];
        if (!sc) return;

        const ctx = chart.ctx;
        ctx.save();
        ctx.font = "bold 11px Segoe UI, Arial";
        ctx.fillStyle = "#fc7e00";
        ctx.textAlign = "center";

        const ds = chart.data.datasets[0];
        const meta = chart.getDatasetMeta(0);

        meta.data.forEach((p: any, i: number) => {
          const val = Number(ds.data[i]);
          const angle = sc.getIndexAngle(i) - Math.PI / 2;
          const radius = sc.getDistanceFromCenterForValue(val) + 14;

          const x = sc.xCenter + Math.cos(angle) * radius;
          const y = sc.yCenter + Math.sin(angle) * radius;

          ctx.fillText(val.toFixed(2) + "%", x, y);
        });

        ctx.restore();
      },
    };

    Chart.register(externalLabels, radarValueLabels);

    // ======================================================
    // PROMEDIOS GLOBALES
    // ======================================================
    const proms = data.criterios.map((_, i) => {
      let sum = 0;
      let count = 0;

      data.facultades.forEach((f) =>
        f.carreras.forEach((c) => {
          if (typeof c.criterios[i] !== "number") return;
          sum += c.criterios[i];
          count++;
        })
      );

      return count ? sum / count : 0;
    });

    // ======================================================
    // FACULTADES
    // ======================================================
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
        plugins: { legend: { display: false }, externalLabels: true },
        scales: { y: { beginAtZero: true, max: 100 } },
      },
    });

    // ======================================================
    // CRITERIOS GLOBAL
    // ======================================================
    charts.current.global = new Chart(canvases.global.current!, {
      type: "bar",
      data: {
        labels: data.criterios,
        datasets: [
          {
            data: proms,
            backgroundColor: "#fc7e00",
            borderRadius: 6,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false }, externalLabels: true },
        scales: { y: { max: 100 } },
      },
    });

    updateDetail();
  }, [data]);

  // ======================================================
  // DETALLE FACULTAD / CARRERA
  // ======================================================
  const updateDetail = () => {
    if (!data) return;

    const fac = data.facultades[selectedFacIdx];
    const car = fac.carreras[selectedCarIdx];

    // BARRAS DETALLE
    if (charts.current.detalle) charts.current.detalle.destroy();
    charts.current.detalle = new Chart(canvases.detalle.current!, {
      type: "bar",
      data: {
        labels: data.criterios,
        datasets: [
          {
            data: car.criterios,
            backgroundColor: "#fc7e00",
            borderRadius: 6,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false }, externalLabels: true },
        scales: { y: { max: 100 } },
      },
    });

    // RADAR
    if (charts.current.radar) charts.current.radar.destroy();
    charts.current.radar = new Chart(canvases.radar.current!, {
      type: "radar",
      data: {
        labels: data.criterios, // ← volver a mostrar criterios
        datasets: [
          {
            label: toTitle(car.nombre),
            data: car.criterios,
            backgroundColor: "rgba(63,122,160,0.20)",
            borderColor: "#fc7e00",
            pointBackgroundColor: "#fc7e00",
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          r: {
            suggestedMin: 60,
            suggestedMax: 100,
            pointLabels: {
              display: true,
              font: { size: 10 },
              color: "#1c3247",
            },
          },
        },
        layout: { padding: 20 },
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  };

  useEffect(() => updateDetail(), [selectedFacIdx, selectedCarIdx]);

  // ======================================================
  // RENDER
  // ======================================================
  if (loading)
    return (
      <div className="text-white text-3xl text-center mt-24">
        Cargando Dashboard Público...
      </div>
    );

  if (!data)
    return (
      <div className="text-red-500 text-3xl text-center mt-24">
        Error cargando datos
      </div>
    );

  const fac = data.facultades[selectedFacIdx];

  return (
    <div
      className="min-h-screen font-sans p-6"
      style={{
        background: "linear-gradient(120deg,#1c3247 70%,#3c7aa0 100%)",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "2rem auto",
          background: "white",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
        }}
      >
        <h1 className="text-3xl font-bold text-[#1c3247]">
          Dashboard Público — {toTitle(data.datasetName)}
        </h1>

        <div className="mt-3 text-lg">
          <strong className="text-[#fc7e00]">Período:</strong>{" "}
          {data.periodo}
        </div>

        {/* GLOBAL */}
        <div className="flex items-center gap-4 mt-6">
          <span className="text-xl font-bold text-[#1c3247]">
            Porcentaje Global:
          </span>
          <div className="bg-[#fc7e00] text-white text-4xl font-bold px-10 py-4 rounded-xl">
            {data.global.toFixed(2)}%
          </div>
        </div>

        {/* FACULTADES */}
        <h2 className="text-[#1c3247] text-xl mt-10">Resumen por Facultad</h2>
        <canvas ref={canvases.facultades}></canvas>

        {/* CRITERIOS */}
        <h2 className="text-[#1c3247] text-xl mt-10">Porcentaje Global por Criterio</h2>
        <canvas ref={canvases.global}></canvas>

        {/* DETALLE */}
        <h2 className="text-[#1c3247] text-xl mt-10">Detalle por Facultad</h2>

        <select
          className="border-2 border-[#3c7aa0] rounded-md p-2 mt-3"
          value={selectedFacIdx}
          onChange={(e) => {
            setSelectedFacIdx(+e.target.value);
            setSelectedCarIdx(0);
          }}
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

        {/* TABLA */}
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
                  <td
                    className="p-2 border-b text-center font-bold"
                    style={{ color }}
                  >
                    {car.total.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* SELECT CARRERA */}
        <select
          className="border-2 border-[#fc7e00] rounded-md p-2 mt-6"
          value={selectedCarIdx}
          onChange={(e) => setSelectedCarIdx(+e.target.value)}
        >
          {fac.carreras.map((car, idx) => (
            <option key={idx} value={idx}>
              {toTitle(car.nombre)}
            </option>
          ))}
        </select>

        {/* GRÁFICO DETALLE */}
        <canvas ref={canvases.detalle} className="mt-6"></canvas>

        <h3 className="text-[#1c3247] text-xl mt-10">Radar</h3>

        <div style={{ width: "70%", margin: "0 auto", height: "350px" }}>
          <canvas ref={canvases.radar}></canvas>
        </div>
      </div>
    </div>
  );
}
