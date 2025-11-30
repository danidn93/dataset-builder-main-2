import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import html2canvas from "html2canvas";

export interface ReportData {
  carrera: string;
  facultad: string;
  periodo: string;
  introduccion: string;
  metodologia: string;
  conclusiones: string;
  recomendaciones: string;
}

export async function generateReportPDF({
  data,
  portadaImg,
  curvaImg,
  footerImg,
  chartRefs,
}: {
  data: ReportData;
  portadaImg: string;
  curvaImg: string;
  footerImg: string;
  chartRefs: {
    global: HTMLCanvasElement | null;
    detalle: HTMLCanvasElement | null;
    radar: HTMLCanvasElement | null;
  };
}) {
  // Tamaño A4
  const pageSize: [number, number] = [595, 842];

  // Crear documento
  const pdf = await PDFDocument.create();
  const fontNormal = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Cargar imágenes
  const portada = await pdf.embedPng(portadaImg);
  const curva = await pdf.embedPng(curvaImg);
  const footer = await pdf.embedPng(footerImg);

  // ------------------------------------------------------------
  // 1. PORTADA
  // ------------------------------------------------------------
  const page1 = pdf.addPage(pageSize);

  page1.drawImage(portada, { x: 0, y: 0, width: pageSize[0], height: pageSize[1] });
  page1.drawImage(curva, { x: 0, y: 0, width: pageSize[0], height: pageSize[1] });

  page1.drawText("Reporte de Satisfacción Estudiantil", {
    x: 60,
    y: 580,
    size: 22,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.28),
  });

  page1.drawText(data.carrera, {
    x: 60,
    y: 545,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.28),
  });

  page1.drawText(data.periodo, {
    x: 60,
    y: 510,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.28),
  });

  // ------------------------------------------------------------
  // FUNCION PARA AÑADIR PÁGINA 2+
  // ------------------------------------------------------------
  const addPage = () => {
    const p = pdf.addPage(pageSize);
    p.drawImage(footer, {
      x: 0,
      y: pageSize[1] - 120,
      width: pageSize[0],
      height: 120,
    });
    return p;
  };

  // ------------------------------------------------------------
  // 2. ÍNDICE
  // ------------------------------------------------------------
  const page2 = addPage();

  page2.drawText("Índice", {
    x: 60,
    y: 700,
    size: 20,
    font: fontBold,
  });

  [
    "1. Introducción",
    "2. Metodología",
    "3. Resultados",
    "4. Conclusiones",
    "5. Recomendaciones",
  ].forEach((t, i) => {
    page2.drawText(t, {
      x: 60,
      y: 660 - i * 28,
      size: 14,
      font: fontNormal,
    });
  });

  // ------------------------------------------------------------
  // 3. INTRODUCCIÓN
  // ------------------------------------------------------------
  const p3 = addPage();
  drawSectionTitle(p3, "1. Introducción");
  drawParagraph(p3, data.introduccion, 60, 660, fontNormal);

  // ------------------------------------------------------------
  // 4. METODOLOGÍA
  // ------------------------------------------------------------
  const p4 = addPage();
  drawSectionTitle(p4, "2. Metodología");
  drawParagraph(p4, data.metodologia, 60, 660, fontNormal);

  // ------------------------------------------------------------
  // 5. RESULTADOS (incluye gráfica)
  // ------------------------------------------------------------
  const p5 = addPage();
  drawSectionTitle(p5, "3. Resultados");

  if (chartRefs.global) {
    const canvas = await html2canvas(chartRefs.global);
    const img = await pdf.embedPng(canvas.toDataURL("image/png"));

    p5.drawImage(img, {
      x: 60,
      y: 330,
      width: 480,
      height: 280,
    });
  }

  // ------------------------------------------------------------
  // 6. CONCLUSIONES Y RECOMENDACIONES
  // ------------------------------------------------------------
  const p6 = addPage();
  drawSectionTitle(p6, "4. Conclusiones");
  drawParagraph(p6, data.conclusiones, 60, 660, fontNormal);

  p6.drawText("5. Recomendaciones", {
    x: 60,
    y: 500,
    size: 18,
    font: fontBold,
  });

  drawParagraph(p6, data.recomendaciones, 60, 470, fontNormal);

  // ------------------------------------------------------------
  // DESCARGAR PDF (corrección del error)
  // ------------------------------------------------------------
  const pdfBytes = await pdf.save();

  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `Reporte_${data.carrera}_${data.periodo}.pdf`;
  link.click();
}

/* ============================================================
   Helpers
   ============================================================ */

function drawSectionTitle(page: any, title: string) {
  page.drawText(title, {
    x: 60,
    y: 700,
    size: 18,
    font: page.doc?.fonts?.[1] || undefined, // fallback seguro
  });
}

function drawParagraph(
  page: any,
  text: string,
  x: number,
  y: number,
  font: any,
  size = 12,
  lineHeight = 16,
  maxWidth = 480
) {
  const words = text.split(" ");
  let line = "";
  let cursor = y;

  for (const w of words) {
    const test = line + w + " ";
    const width = font.widthOfTextAtSize(test, size);

    if (width > maxWidth) {
      page.drawText(line, { x, y: cursor, font, size });
      line = w + " ";
      cursor -= lineHeight;
    } else {
      line = test;
    }
  }

  page.drawText(line, { x, y: cursor, font, size });
}
