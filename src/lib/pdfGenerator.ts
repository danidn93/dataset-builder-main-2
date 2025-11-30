import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface CriterioData {
  nombre: string;
  valor: number;
}

interface ReporteData {
  facultad: string;
  carrera: string;
  periodo: string;
  muestra: number;
  criterios: CriterioData[];
  promedioGeneral: number;
  porcentajeSatisfaccion: number;
}

export const generarReportePDF = async (data: ReporteData): Promise<void> => {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  
  let yPosition = margin;

  // Función helper para agregar nueva página si es necesario
  const checkNewPage = (neededSpace: number) => {
    if (yPosition + neededSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // ===== PORTADA =====
  pdf.setFillColor(25, 86, 142); // Color azul institucional
  pdf.rect(0, 0, pageWidth, 80, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont("helvetica", "bold");
  pdf.text("Reporte de Satisfacción Estudiantil", pageWidth / 2, 35, { align: "center" });
  
  pdf.setFontSize(20);
  pdf.text(data.carrera, pageWidth / 2, 55, { align: "center" });
  
  pdf.setFontSize(16);
  pdf.text(data.periodo, pageWidth / 2, 70, { align: "center" });
  
  yPosition = 100;
  pdf.setTextColor(0, 0, 0);

  // ===== ÍNDICE =====
  checkNewPage(60);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("Índice", margin, yPosition);
  yPosition += 10;
  
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  const indiceItems = [
    "1. Introducción",
    "2. Metodología",
    "3. Resultados",
    "4. Conclusiones",
    "5. Recomendaciones"
  ];
  
  indiceItems.forEach(item => {
    yPosition += 8;
    pdf.text(item, margin, yPosition);
  });
  
  yPosition += 20;
  
  // ===== INTRODUCCIÓN =====
  pdf.addPage();
  yPosition = margin;
  
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPosition, contentWidth, 30, "F");
  
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Facultad: " + data.facultad, margin + 5, yPosition + 10);
  pdf.text("Carrera: " + data.carrera, margin + 5, yPosition + 20);
  
  yPosition += 40;
  
  pdf.setFontSize(14);
  pdf.text("1. Introducción", margin, yPosition);
  yPosition += 10;
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  const introTexto = `En el marco del fortalecimiento de la calidad académica y de los servicios institucionales, la Dirección de Aseguramiento de la Calidad aplicó la Encuesta de Satisfacción Estudiantil correspondiente al ${data.periodo} a la carrera de ${data.carrera} con el propósito de evaluar el nivel de satisfacción de los estudiantes y establecer acciones de mejora.`;
  
  const introLineas = pdf.splitTextToSize(introTexto, contentWidth);
  pdf.text(introLineas, margin, yPosition);
  yPosition += introLineas.length * 6 + 10;
  
  const introTexto2 = "Este proceso permite identificar fortalezas y oportunidades, facilitando la toma de decisiones estratégicas. Los resultados obtenidos servirán como insumo para la planificación académica y la optimización de los recursos institucionales.";
  const intro2Lineas = pdf.splitTextToSize(introTexto2, contentWidth);
  pdf.text(intro2Lineas, margin, yPosition);
  yPosition += intro2Lineas.length * 6 + 15;
  
  // ===== METODOLOGÍA =====
  checkNewPage(80);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("2. Metodología", margin, yPosition);
  yPosition += 10;
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  
  const metodologiaItems = [
    `Instrumento: Encuesta en línea con escala de Likert de 5 niveles: (1: Muy insatisfecho – 5: Muy satisfecho).`,
    `Población objetivo: Estudiantes matriculados en ${data.carrera}.`,
    `Muestra efectiva: ${data.muestra} estudiantes respondieron la encuesta.`,
    `Periodo de aplicación: ${data.periodo}`
  ];
  
  metodologiaItems.forEach(item => {
    checkNewPage(10);
    const lineas = pdf.splitTextToSize(item, contentWidth - 10);
    pdf.text(lineas, margin + 5, yPosition);
    yPosition += lineas.length * 6 + 5;
  });
  
  yPosition += 5;
  pdf.setFont("helvetica", "bold");
  pdf.text("Criterios evaluados:", margin, yPosition);
  yPosition += 8;
  
  pdf.setFont("helvetica", "normal");
  data.criterios.forEach((criterio, idx) => {
    checkNewPage(8);
    pdf.text(`${idx + 1}. ${criterio.nombre}`, margin + 5, yPosition);
    yPosition += 6;
  });
  
  // ===== RESULTADOS =====
  pdf.addPage();
  yPosition = margin;
  
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("3. Resultados", margin, yPosition);
  yPosition += 10;
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  const resultadosTexto = "A continuación, se presentan los resultados obtenidos en cada uno de los criterios evaluados en la encuesta de satisfacción estudiantil. Estos reflejan la percepción de los estudiantes sobre diversos aspectos que inciden en su experiencia académica y formativa.";
  const resultadosLineas = pdf.splitTextToSize(resultadosTexto, contentWidth);
  pdf.text(resultadosLineas, margin, yPosition);
  yPosition += resultadosLineas.length * 6 + 15;
  
  // Tabla de resultados
  const tableStartY = yPosition;
  const col1Width = contentWidth * 0.7;
  const col2Width = contentWidth * 0.3;
  
  // Header de tabla
  pdf.setFillColor(25, 86, 142);
  pdf.rect(margin, yPosition, col1Width, 10, "F");
  pdf.rect(margin + col1Width, yPosition, col2Width, 10, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.text("Criterio", margin + 2, yPosition + 7);
  pdf.text("Promedio", margin + col1Width + 2, yPosition + 7);
  
  yPosition += 10;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");
  
  // Ordenar criterios de mayor a menor
  const criteriosOrdenados = [...data.criterios].sort((a, b) => b.valor - a.valor);
  
  criteriosOrdenados.forEach((criterio, idx) => {
    if (idx % 2 === 0) {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, yPosition, contentWidth, 8, "F");
    }
    
    const criterioLineas = pdf.splitTextToSize(criterio.nombre, col1Width - 4);
    pdf.text(criterioLineas, margin + 2, yPosition + 6);
    pdf.text(criterio.valor.toFixed(2), margin + col1Width + 2, yPosition + 6);
    
    yPosition += 8;
    
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = margin;
    }
  });
  
  yPosition += 15;
  
  // Porcentaje General
  checkNewPage(40);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Porcentaje General de Satisfacción", margin, yPosition);
  yPosition += 10;
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  const porcentajeTexto = `El promedio general de satisfacción obtenido por la carrera de ${data.carrera} fue de ${data.promedioGeneral.toFixed(2)} puntos sobre 5, equivalente a un ${data.porcentajeSatisfaccion.toFixed(1)}% de satisfacción global.`;
  const porcentajeLineas = pdf.splitTextToSize(porcentajeTexto, contentWidth);
  pdf.text(porcentajeLineas, margin, yPosition);
  yPosition += porcentajeLineas.length * 6 + 10;
  
  const fortalezasTexto = "Las fortalezas más destacadas se identifican según los promedios más altos de las áreas evaluadas, mientras que las oportunidades de mejora corresponden a los aspectos con puntuaciones más bajas.";
  const fortalezasLineas = pdf.splitTextToSize(fortalezasTexto, contentWidth);
  pdf.text(fortalezasLineas, margin, yPosition);
  
  // ===== CONCLUSIONES =====
  pdf.addPage();
  yPosition = margin;
  
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("4. Conclusiones", margin, yPosition);
  yPosition += 10;
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  
  const mejorCriterio = criteriosOrdenados[0];
  const peorCriterio = criteriosOrdenados[criteriosOrdenados.length - 1];
  
  const conclusiones = [
    `La carrera muestra un nivel de satisfacción global del ${data.porcentajeSatisfaccion.toFixed(1)}%, lo cual indica una percepción ${data.porcentajeSatisfaccion >= 80 ? 'favorable' : 'que requiere atención'} por parte de los estudiantes.`,
    `El criterio mejor evaluado es "${mejorCriterio.nombre}" con ${mejorCriterio.valor.toFixed(2)} puntos, lo cual representa una fortaleza institucional.`,
    `El área de "${peorCriterio.nombre}" obtuvo ${peorCriterio.valor.toFixed(2)} puntos, identificándose como una oportunidad de mejora.`,
    "Se evidencia la necesidad de mantener las fortalezas identificadas y trabajar en las áreas de oportunidad para elevar los índices de satisfacción estudiantil."
  ];
  
  conclusiones.forEach((conclusion, idx) => {
    checkNewPage(15);
    pdf.text(`${idx + 1}. `, margin, yPosition);
    const lineas = pdf.splitTextToSize(conclusion, contentWidth - 10);
    pdf.text(lineas, margin + 5, yPosition);
    yPosition += lineas.length * 6 + 8;
  });
  
  // ===== RECOMENDACIONES =====
  checkNewPage(60);
  yPosition += 10;
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("5. Recomendaciones", margin, yPosition);
  yPosition += 10;
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  
  const recomendaciones = [
    `Fortalecer las acciones en el área de "${peorCriterio.nombre}" mediante capacitación y asignación de recursos.`,
    "Realizar seguimiento trimestral de los indicadores de satisfacción para medir el impacto de las mejoras implementadas.",
    "Socializar los resultados con los docentes y personal administrativo para generar compromiso institucional.",
    "Mantener las buenas prácticas identificadas en los criterios mejor evaluados.",
    "Implementar un plan de mejora continua basado en los hallazgos de este reporte."
  ];
  
  recomendaciones.forEach((rec, idx) => {
    checkNewPage(15);
    pdf.text(`${idx + 1}. `, margin, yPosition);
    const lineas = pdf.splitTextToSize(rec, contentWidth - 10);
    pdf.text(lineas, margin + 5, yPosition);
    yPosition += lineas.length * 6 + 8;
  });
  
  // Footer en todas las páginas
  const totalPages = pdf.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  }
  
  pdf.save(`Reporte_Satisfaccion_${data.carrera.replace(/\s+/g, '_')}_${data.periodo}.pdf`);
};
