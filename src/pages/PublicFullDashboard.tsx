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

// -----------------------------
// Title Case
// -----------------------------
function toTitle(str: string) {
  return str
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// -----------------------------
// MULTILÍNEA PARA RADAR
// -----------------------------
function wrapLabel(text: string, maxCharsPerLine = 20): string | string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Si es una sola línea corta, devolver string; si no, array (Chart.js lo soporta)
  return lines.length === 1 ? lines[0] : lines;
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
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
    // PLUGIN → LABELS EXTERNOS (2 DECIMALES)
    // ======================================================
    const externalLabels = {
      id: "externalLabels",
      afterDatasetsDraw(chart: Chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = "bold 13px Segoe UI, Arial";
        ctx.fillStyle = "#fc7e00";
        ctx.textAlign = "center";

        chart.data.datasets[0].data.forEach((v: any, i: number) => {
          const meta = chart.getDatasetMeta(0);
          const bar = meta.data[i];
          if (!bar) return;

          ctx.fillText(Number(v).toFixed(2) + "%", bar.x, bar.y - 8);
        });

        ctx.restore();
      },
    };

    // ======================================================
    // PLUGIN → RADAR SOLO 1 LABEL DE VALOR
    // ======================================================
    const radarValueLabels = {
        id: "radarValueLabels",
        afterDatasetsDraw(chart: Chart) {
            const sc = chart.scales["r"];
            if (!sc) return;

            const ctx = chart.ctx;
            ctx.save();
            ctx.font = "bold 12px Segoe UI, Arial";
            ctx.fillStyle = "#fc7e00";
            ctx.textAlign = "center";

            const ds = chart.data.datasets[0];
            const meta = chart.getDatasetMeta(0);

            meta.data.forEach((p: any, i: number) => {
            const val = Number(ds.data[i]);

            const angle = sc.getIndexAngle(i) - Math.PI / 2;
            const radius = sc.getDistanceFromCenterForValue(val) + 20; // separo del punto

            const x = sc.xCenter + Math.cos(angle) * radius;
            const y = sc.yCenter + Math.sin(angle) * radius;

            ctx.fillText(val.toFixed(2) + "%", x, y);
            });

            ctx.restore();
        },
    };

    Chart.register(externalLabels, radarValueLabels);

    // ======================================================
    // CRITERIOS (PROMEDIOS GLOBALES)
    // ======================================================
    const proms = data.criterios.map((_, idx) => {
      let sum = 0;
      let c = 0;

      data.facultades.forEach((f) =>
        f.carreras.forEach((car) => {
          const v = car.criterios[idx];
          if (typeof v === "number") {
            sum += v;
            c++;
          }
        })
      );

      return c ? sum / c : 0;
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
            datalabels: { display: false },
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          externalLabels: true,
          tooltip: { enabled: false },
        },
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
            datalabels: { display: false },
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          externalLabels: true,
          tooltip: { enabled: false },
        },
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
            borderRadius: 7,
            datalabels: { display: false },
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          externalLabels: true,
          tooltip: { enabled: false },
        },
        scales: { y: { max: 100 } },
      },
    });

    // RADAR
    if (charts.current.radar) charts.current.radar.destroy();    
        charts.current.radar = new Chart(canvases.radar.current, {
    type: "radar",
    data: {
      labels: data.criterios.map((c: string) => wrapLabel(c, 22)),
      datasets: [
        {
          label: toTitle(car.nombre),
          data: car.criterios,
          backgroundColor: "rgba(252, 126, 0, 0.15)",
          borderColor: "#fc7e00",
          borderWidth: 3,
          pointBackgroundColor: "#fc7e00",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 90,
          bottom: 90,
          left: 90,
          right: 90,
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
      scales: {
        r: {
          min: 60,
          max: 100,
          ticks: { display: false },
          pointLabels: {
            font: { size: 13, weight: "600" as const },
            color: "#1c3247",
            padding: 25,
          },
          grid: { color: "#e2e8f0" },
          angleLines: { color: "#e2e8f0" },
        },
      },
    },
    plugins: [
      {
        id: "radarSinglePercentage",
        afterDatasetsDraw(chart) {
          const { ctx, scales: { r } } = chart;
          const values = chart.data.datasets[0].data as number[];

          ctx.save();
          ctx.font = "bold 15px Segoe UI";
          ctx.fillStyle = "#fc7e00";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          values.forEach((value, i) => {
            const angle = r.getIndexAngle(i) - Math.PI / 2;
            const distance = r.getDistanceFromCenterForValue(value);
            const radius = distance + 45; // separación perfecta

            const x = r.xCenter + Math.cos(angle) * radius;
            let y = r.yCenter + Math.sin(angle) * radius;

            // Ajuste extra si el label del criterio tiene más de una línea
            const label = chart.data.labels[i];
            const lines = Array.isArray(label) ? label.length : 1;
            if (lines > 1) {
              y += (Math.sign(Math.sin(angle)) || 1) * 15 * lines;
            }

            ctx.fillText(`${value.toFixed(1)}%`, x, y);
          });

          ctx.restore();
        },
      },
    ],
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

  // ========================================
  // TABLA RESUMEN FACULTADES
  // ========================================
  const resumenFacultades = data.facultades.map((f) => {
    const best = [...f.carreras].sort((a, b) => b.total - a.total)[0];
    const worst = [...f.carreras].sort((a, b) => a.total - b.total)[0];
    return { ...f, best, worst };
  });

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

        {/* FACULTADES CHART */}
        <h2 className="text-[#1c3247] text-xl mt-10">Resumen por Facultad</h2>
        <canvas ref={canvases.facultades}></canvas>

        {/* TABLA RESUMEN */}
        <h2 className="text-[#1c3247] text-xl mt-10">
          Mejores y Peores Carreras por Facultad
        </h2>

        <table className="w-full mt-4 border-collapse">
          <thead className="bg-[#1c3247] text-white">
            <tr>
              <th className="p-3 text-left">Facultad</th>
              <th className="p-3 text-center">Global</th>
              <th className="p-3 text-left">Mejor Carrera</th>
              <th className="p-3 text-left">Peor Carrera</th>
            </tr>
          </thead>
          <tbody>
            {resumenFacultades.map((f, i) => (
              <tr key={i} className="border-b">
                <td className="p-3 font-semibold">{toTitle(f.nombre)}</td>
                <td className="p-3 text-center font-bold text-[#fc7e00]">
                  {f.total.toFixed(2)}%
                </td>
                <td className="p-3">
                  {toTitle(f.best.nombre)} ({f.best.total.toFixed(2)}%)
                </td>
                <td className="p-3">
                  {toTitle(f.worst.nombre)} ({f.worst.total.toFixed(2)}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* CRITERIOS GLOBAL */}
        <h2 className="text-[#1c3247] text-xl mt-10">
          Porcentaje Global por Criterio
        </h2>
        <canvas ref={canvases.global}></canvas>

        {/* DETALLE FACULTAD */}
        <h2 className="text-[#1c3247] text-xl mt-10">
          Detalle por Facultad
        </h2>

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

        {/* TABLA CARRERAS */}
        <table className="w-full mt-4 border-collapse">
          <thead className="bg-[#1c3247] text-white">
            <tr>
              <th className="p-2 text-left">Carrera</th>
              <th className="p-2 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {fac.carreras.map((car, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{toTitle(car.nombre)}</td>
                <td className="p-2 text-center font-bold text-[#fc7e00]">
                  {car.total.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SELECT CARRERA */}
        <select
          className="border-2 border-[#fc7e00] rounded-md p-2 mt-6"
          value={selectedCarIdx}
          onChange={(e) => setSelectedCarIdx(+e.target.value)}
        >
          {fac.carreras.map((c, i) => (
            <option key={i} value={i}>
              {toTitle(c.nombre)}
            </option>
          ))}
        </select>

        {/* BARRAS DETALLE */}
        <canvas ref={canvases.detalle} className="mt-6"></canvas>

        {/* RADAR 
        <h3 className="text-[#1c3247] text-xl mt-10">Radar</h3>

        <div style={{ width: "100%", height: "550px", margin: "0 auto" }}>
          <canvas ref={canvases.radar}></canvas>
        </div>*/}
      </div>
    </div>
  );
}
