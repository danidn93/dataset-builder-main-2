// --------------------------------------------------------------
// PLUGIN 1: valueLabelsFacultades  (para las barras principales)
// --------------------------------------------------------------
export const valueLabelsFacultades = {
  id: "valueLabelsFacultades",
  afterDatasetsDraw(chart: any) {
    const { ctx, chartArea: area } = chart;
    if (!area) return;

    chart.data.datasets.forEach((dataset: any, i: number) => {
      chart.getDatasetMeta(i).data.forEach((bar: any, j: number) => {
        const value = dataset.data[j];
        ctx.save();
        ctx.font = "bold 13px Segoe UI, Arial";
        ctx.fillStyle = "#fc7e00";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        if (chart.config.type === "bar") {
          ctx.fillText(
            value === undefined || Number.isNaN(value)
              ? ""
              : value.toFixed(2) + "%",
            bar.x,
            bar.y - 6
          );
        }
        ctx.restore();
      });
    });
  },
};

// --------------------------------------------------------------
// PLUGIN 2: valueLabelsRadar (para el radar)
// --------------------------------------------------------------
export const valueLabelsRadar = {
  id: "valueLabelsRadar",
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    if (chart.config.type !== "radar") return;

    chart.data.datasets.forEach((dataset: any) => {
      chart.getDatasetMeta(0).data.forEach((point: any, j: number) => {
        const value = dataset.data[j];
        const angle = chart.scales.r.getIndexAngle(j);
        const radius =
          chart.scales.r.getDistanceFromCenterForValue(value) + 18;
        const x =
          chart.scales.r.xCenter +
          Math.cos(angle - Math.PI / 2) * radius;
        const y =
          chart.scales.r.yCenter +
          Math.sin(angle - Math.PI / 2) * radius;

        ctx.save();
        ctx.font = "bold 13px Segoe UI, Arial";
        ctx.fillStyle = "#fc7e00";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          value === undefined || Number.isNaN(value)
            ? ""
            : value.toFixed(1) + "%",
          x,
          y
        );
        ctx.restore();
      });
    });
  },
};

// --------------------------------------------------------------
// PLUGIN 3: valueLabelsGlobalCriterios (para barras globales)
// --------------------------------------------------------------
export const valueLabelsGlobalCriterios = {
  id: "valueLabelsGlobalCriterios",
  afterDatasetsDraw(chart: any) {
    const { ctx, chartArea: area } = chart;
    if (!area) return;

    chart.data.datasets.forEach((dataset: any) => {
      chart.getDatasetMeta(0).data.forEach((bar: any, j: number) => {
        const value = dataset.data[j];
        ctx.save();
        ctx.font = "bold 13px Segoe UI, Arial";
        ctx.fillStyle = "#fc7e00";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        if (chart.config.type === "bar") {
          ctx.fillText(
            value === undefined || Number.isNaN(value)
              ? ""
              : value.toFixed(2) + "%",
            bar.x,
            bar.y - 6
          );
        }
        ctx.restore();
      });
    });
  },
};
