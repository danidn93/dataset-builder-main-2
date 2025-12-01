import jsPDF from "jspdf";

export interface CriterioData {
  nombre: string;
  valor: number;
}

export interface ReporteData {
  facultad: string;
  carrera: string;
  periodo: string;
  muestra: number;
  criterios: CriterioData[];
  promedioGeneral: number;
  porcentajeSatisfaccion: number;
}

export interface ReporteImages {
  portada: string; // base64
  header: string;  // base64
  footer: string;  // base64
}

export const generarReportePDF = async (
  data: ReporteData,
  images: ReporteImages
) => {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // ---------------------------------------
  // Helper seguro para imágenes base64
  // ---------------------------------------
  const safeAddImage = (
    img: string | undefined,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    if (!img) {
      console.error("❌ Imagen faltante:", { img });
      return;
    }
    try {
      pdf.addImage(img, "PNG", x, y, w, h);
    } catch (err) {
      console.error("❌ Error al insertar imagen:", err);
    }
  };

  // ======================================================
  // PORTADA
  // ======================================================
  safeAddImage(images.portada, 0, 0, pageWidth, pageHeight);

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  pdf.text("Reporte de Satisfacción Estudiantil", pageWidth / 2, 40, {
    align: "center",
  });

  pdf.setFontSize(20);
  pdf.text(data.carrera, pageWidth / 2, 60, { align: "center" });

  pdf.setFontSize(16);
  pdf.text(data.periodo, pageWidth / 2, 75, { align: "center" });

  pdf.addPage();
  y = margin;

  // ======================================================
  // ENCABEZADO
  // ======================================================
  safeAddImage(images.header, 0, 0, pageWidth, 25);
  y += 30;

  pdf.setFontSize(18);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.text("1. Facultades y Carreras", margin, y);
  y += 10;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Facultad: ${data.facultad}`, margin, y);
  y += 7;
  pdf.text(`Carrera: ${data.carrera}`, margin, y);
  y += 7;
  pdf.text(`Muestra: ${data.muestra}`, margin, y);
  y += 15;

  // ======================================================
  // TABLA CRITERIOS
  // ======================================================
  pdf.setFillColor(25, 86, 142);
  pdf.rect(margin, y, pageWidth - 2 * margin, 10, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("Criterio", margin + 2, y + 7);
  pdf.text("Promedio", pageWidth - margin - 25, y + 7);

  y += 12;

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");

  data.criterios.forEach((c, idx) => {
    if (idx % 2 === 0) {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, y - 2, pageWidth - 2 * margin, 8, "F");
    }

    pdf.text(c.nombre, margin + 2, y + 4);
    pdf.text(c.valor.toFixed(2), pageWidth - margin - 25, y + 4);

    y += 8;
  });

  y += 10;

  // ======================================================
  // PORCENTAJE GENERAL
  // ======================================================
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Promedio General", margin, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.text(
    `La carrera obtuvo un promedio general de ${data.promedioGeneral.toFixed(
      2
    )}, equivalente a un ${data.porcentajeSatisfaccion.toFixed(
      1
    )}% de satisfacción.`,
    margin,
    y
  );

  // ======================================================
  // FOOTER FINAL
  // ======================================================
  pdf.addPage();
  safeAddImage(images.footer, 0, pageHeight - 40, pageWidth, 40);

  // ======================================================
  // GUARDAR PDF
  // ======================================================
  pdf.save(
    `Reporte_Satisfaccion_${data.carrera.replace(/\s+/g, "_")}_${
      data.periodo
    }.pdf`
  );
};
