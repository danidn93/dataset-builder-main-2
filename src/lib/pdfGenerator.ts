import jsPDF from "jspdf";

export interface CriterioData {
  nombre: string;
  valor: number;
}

export interface ReporteData {
  facultad: string;
  carrera: string;
  periodo: string;
  muestra?: number; // Opcional, se calcula si no se proporciona
  criterios: CriterioData[];
  promedioGeneral: number;
  porcentajeSatisfaccion: number;
  conteo?: any; // Datos del dataset_analysis.conteo para calcular muestra
}

export interface ReporteImages {
  portada: string; // base64 - Header que va en todas las páginas (21.01cm x 2.9cm)
  header: string;  // base64 - Curva que va solo en página 1 (12.09cm x 3.78cm)
  footer: string;  // base64 - Footer desde página 3 en adelante (21.01cm x 0.79cm)
}

// -----------------------------------------------
// FUNCIÓN PARA CALCULAR MUESTRA DESDE CONTEO
// -----------------------------------------------
export const calcularMuestraDesdeConteo = (
  conteo: any,
  facultad: string,
  carrera: string
): number => {
  if (!conteo?.criterio_carrera) return 0;

  // Buscar la clave que coincida con FACULTAD|||CARRERA
  const claveCarrera = `${facultad.toUpperCase()}|||${carrera.toUpperCase()}`;

  // Tomar el primer criterio (todos tienen la misma cantidad de votos)
  const primerCriterio = Object.values(conteo.criterio_carrera)[0] as any;
  
  if (!primerCriterio) return 0;

  // Buscar por clave exacta o similar
  const datosCarrera = primerCriterio[claveCarrera];
  
  if (!datosCarrera) {
    // Intentar buscar con coincidencia parcial
    const claveEncontrada = Object.keys(primerCriterio).find(
      (k) => k.includes(facultad.toUpperCase()) && k.includes(carrera.toUpperCase())
    );
    
    if (!claveEncontrada) return 0;
    
    const datos = primerCriterio[claveEncontrada];
    return (datos["1"] || 0) + (datos["2"] || 0) + (datos["3"] || 0) + (datos["4"] || 0) + (datos["5"] || 0);
  }

  // Sumar todos los votos (1, 2, 3, 4, 5)
  return (
    (datosCarrera["1"] || 0) +
    (datosCarrera["2"] || 0) +
    (datosCarrera["3"] || 0) +
    (datosCarrera["4"] || 0) +
    (datosCarrera["5"] || 0)
  );
};

const COLORES = {
  azulUnemi: [28, 50, 71] as [number, number, number],
  azulClaro: [60, 122, 160] as [number, number, number],
  gris: [100, 100, 100] as [number, number, number],
  grisClaro: [245, 245, 245] as [number, number, number],
};

// =======================================================
// FUNCIÓN PARA AGREGAR TEXTO JUSTIFICADO EN JSPDDF
// =======================================================
const drawJustifiedText = (
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number = 5
) => {
  // cortar líneas normalmente
  const lines = pdf.splitTextToSize(text, maxWidth) as string[];

  lines.forEach((line, index) => {
    const isLastLine = index === lines.length - 1;

    if (isLastLine) {
      // última línea: izquierda normal
      pdf.text(line, x, y);
    } else {
      const words = line.split(" ");
      if (words.length === 1) {
        pdf.text(line, x, y);
      } else {
        const lineWithoutSpaces = words.join("");
        const textWidth = pdf.getTextWidth(lineWithoutSpaces);
        const totalSpaces = words.length - 1;
        const extraSpace = (maxWidth - textWidth) / totalSpaces;

        let cursorX = x;
        words.forEach((word, idx) => {
          pdf.text(word, cursorX, y);
          cursorX += pdf.getTextWidth(word) + extraSpace;
        });
      }
    }

    y += lineHeight;
  });

  return y;
};

export const generarReportePDF = async (
  data: ReporteData,
  images: ReporteImages
) => {
  // Calcular muestra si no fue proporcionada
  const muestra = data.muestra || 
    (data.conteo ? calcularMuestraDesdeConteo(data.conteo, data.facultad, data.carrera) : 0);

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  const safeAddImage = (
    img: string | undefined,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    if (!img) {
      console.error("❌ Imagen faltante");
      return;
    }
    try {
      pdf.addImage(img, "PNG", x, y, w, h);
    } catch (err) {
      console.error("❌ Error al insertar imagen:", err);
    }
  };

  // ============================================================
  // PÁGINA 1: PORTADA
  // ============================================================
  // Header arriba (21.01cm x 2.9cm = 210mm x 29mm)
  safeAddImage(images.portada, 0, 0, 210.1, 29);

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  
  pdf.setFontSize(28);
  pdf.text("Reporte de Satisfacción Estudiantil", pageWidth / 2, 100, {
    align: "center",
  });

  pdf.setFontSize(22);
  const carreraLines = pdf.splitTextToSize(data.carrera, pageWidth - 40);
  pdf.text(carreraLines, pageWidth / 2, 120, { align: "center" });

  pdf.setFontSize(20);
  pdf.text(data.periodo, pageWidth / 2, 120 + (carreraLines.length * 8), { align: "center" });

  // Curva en esquina inferior derecha (12.09cm x 3.78cm = 120.9mm x 37.8mm)
  safeAddImage(images.header, pageWidth - 120.9, pageHeight - 91.7, 120.9, 91.7);

  // ============================================================
  // PÁGINA 2: ÍNDICE (DOS COLUMNAS)
  // ============================================================
  pdf.addPage();
  // Header arriba (21.01cm x 2.9cm)
  safeAddImage(images.portada, 0, 0, 210.1, 29);
  y = 50;

  // Columna izquierda: "Índice"
  pdf.setTextColor(...COLORES.azulUnemi);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text("Índice", margin, y);

  // Columna derecha: Items del índice
  const indiceX = pageWidth / 2;
  let indiceY = y;
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);

  const indiceItems = [
    "Introducción",
    "Metodología",
    "Resultados",
    "Conclusiones",
    "Recomendaciones"
  ];

  indiceItems.forEach((item) => {
    pdf.text(item, indiceX, indiceY);
    indiceY += 10;
  });

  // Footer con número de página
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORES.gris);
  pdf.text(`Página 2 de 5`, pageWidth - margin, pageHeight - 10, { align: "right" });

  // ============================================================
  // PÁGINA 3: INTRODUCCIÓN Y METODOLOGÍA
  // ============================================================
  pdf.addPage();
  // Header arriba
  safeAddImage(images.portada, 0, 0, 210.1, 29);
  y = 40;

  // Título pequeño arriba
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORES.gris);
  pdf.text("Reporte de Satisfacción Estudiantil", margin, y);
  y += 10;

  // Datos de la carrera
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...COLORES.azulUnemi);
  pdf.text(`Facultad: ${data.facultad}`, margin, y);
  y += 8;
  pdf.text(`Carrera: ${data.carrera}`, margin, y);
  y += 8;
  pdf.text(`Periodo: ${data.periodo}`, margin, y);
  y += 15;

  // 1. Introducción
  pdf.setFontSize(16);
  pdf.text("1. Introducción", margin, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);

  const introText = `En el marco del fortalecimiento de la calidad académica y de los servicios institucionales, la Dirección de Aseguramiento de la Calidad aplicó la Encuesta de Satisfacción Estudiantil correspondiente al ${data.periodo} a la carrera de ${data.carrera} con el propósito de evaluar el nivel de satisfacción de los estudiantes y establecer acciones de mejora.`;
  
  y = drawJustifiedText(pdf, introText, margin, y, pageWidth - 2 * margin);
  y += 5;

  const introText2 = "Este proceso permite identificar fortalezas y oportunidades, facilitando la toma de decisiones estratégicas. Los resultados obtenidos servirán como insumo para la planificación académica y la optimización de los recursos institucionales.";
  y = drawJustifiedText(pdf, introText2, margin, y, pageWidth - 2 * margin);
  y += 10;

  // 2. Metodología
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...COLORES.azulUnemi);
  pdf.text("2. Metodología", margin, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);

  const metodologiaItems = [
    `Instrumento: Encuesta en línea con escala de Likert de 5 niveles: (20: Muy insatisfecho – 100: Muy satisfecho).`,
    `Población objetivo: Estudiantes matriculados en ${data.carrera}.`,
    `Muestra efectiva: ${muestra} estudiantes respondieron la encuesta.`,
    `Periodo de aplicación: ${data.periodo}`,
    `Criterios evaluados:`
  ];

  metodologiaItems.forEach((item) => {
    const lines = pdf.splitTextToSize(item, pageWidth - 2 * margin);
    y = drawJustifiedText(pdf, item, margin, y, pageWidth - 2 * margin);
    y += 3;
  });

  y += 3;

  // Lista de criterios
  data.criterios.forEach((criterio, idx) => {
    pdf.text(`${idx + 1}. ${criterio.nombre}.`, margin + 5, y);
    y += 5;
  });

  // Footer desde página 3 (21.01cm x 0.79cm = 210mm x 7.9mm)
  safeAddImage(images.footer, 0, pageHeight - 7.9, 210.1, 7.9);
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORES.gris);
  pdf.text(`Página 3 de 5`, pageWidth - margin, pageHeight - 12, { align: "right" });

  // ============================================================
  // PÁGINA 4: RESULTADOS
  // ============================================================
  pdf.addPage();
  // Header arriba
  safeAddImage(images.portada, 0, 0, 210.1, 29);
  y = 50;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...COLORES.azulUnemi);
  pdf.text("3. Resultados", margin, y);
  y += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  
  const resultadosText = "A continuación, se presentan los resultados obtenidos en cada uno de los criterios evaluados en la encuesta de satisfacción estudiantil. Estos reflejan la percepción de los estudiantes sobre diversos aspectos que inciden en su experiencia académica y formativa.";
  y = drawJustifiedText(pdf, resultadosText, margin, y, pageWidth - 2 * margin);
  y += 8;

  // Tabla de resultados con barras visuales
  const maxBarWidth = 80; // Ancho de la barra
  const maxTextWidth = 90; // Ancho máximo para el texto del criterio
  const barStartX = margin + maxTextWidth + 10; // Espacio entre texto y barra
  const criteriosOrdenados = [...data.criterios].sort((a, b) => a.valor - b.valor);

  criteriosOrdenados.forEach((criterio) => {
    // Nombre del criterio (permitir hasta 2 líneas)
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    const nombreLines = pdf.splitTextToSize(criterio.nombre, maxTextWidth);
    const lineHeight = 5;
    const criterioHeight = Math.max(nombreLines.length * lineHeight, 10); // Altura mínima de 10mm
    
    pdf.text(nombreLines, margin, y + (criterioHeight / 2) - (nombreLines.length * lineHeight / 2) + 3);
    
    // Barra visual (centrada verticalmente)
    const barY = y + (criterioHeight / 2) - 2.5;
    const barWidth = (criterio.valor / 100) * maxBarWidth;
    pdf.setFillColor(...COLORES.azulClaro);
    pdf.rect(barStartX, barY, barWidth, 5, "F");
    
    // Valor numérico (alineado a la derecha)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(criterio.valor.toFixed(2), pageWidth - margin, y + (criterioHeight / 2) + 1, { align: "right" });
    
    y += criterioHeight + 2;
  });

  y += 10;

  // Escala de referencia (0-100)
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORES.gris);
  const escalaY = y;
  const escalaStartX = pageWidth - margin - maxBarWidth;
  
  // Línea de escala
  pdf.setDrawColor(...COLORES.gris);
  pdf.line(escalaStartX, escalaY, escalaStartX + maxBarWidth, escalaY);
  
  // Marcas de escala (0, 25, 50, 75, 100)
  for (let i = 0; i <= 4; i++) {
    const x = escalaStartX + (i / 4) * maxBarWidth;
    const valor = i * 25;
    pdf.line(x, escalaY - 1, x, escalaY + 1);
    pdf.text(valor.toString(), x - 2, escalaY + 5);
  }
  
  y += 10;
  pdf.text("Escala del (0-100)", escalaStartX, y);
  y += 5;
  pdf.setFontSize(8);
  const leyendaText = "[20: Nada satisfecho, 40: Poco satisfecho, 60: Neutral, 80: Satisfecho, 100: Totalmente satisfecho]";
  const leyendaLines = pdf.splitTextToSize(leyendaText, maxBarWidth + 20);
  pdf.text(leyendaLines, escalaStartX, y);
  y += leyendaLines.length * 4 + 8;

  // Porcentaje General de Satisfacción
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...COLORES.azulUnemi);
  pdf.text("Porcentaje General de Satisfacción", margin, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  
  const satisfaccionText = `El promedio general de satisfacción obtenido por la carrera de ${data.carrera} fue de ${data.promedioGeneral.toFixed(2)} puntos sobre 5, equivalente a un ${data.porcentajeSatisfaccion.toFixed(1)}% de satisfacción global.`;
  const satisfaccionLines = pdf.splitTextToSize(satisfaccionText, pageWidth - 2 * margin);
  y = drawJustifiedText(pdf, satisfaccionText, margin, y, pageWidth - 2 * margin);
  y += satisfaccionLines.length * 5 + 5;

  const fortalezasText = "Las fortalezas más destacadas se identifican según los promedios más altos de las áreas evaluadas, mientras que las oportunidades de mejora corresponden a los aspectos con puntuaciones más bajas.";
  const fortalezasLines = pdf.splitTextToSize(fortalezasText, pageWidth - 2 * margin);
  y = drawJustifiedText(pdf, fortalezasText, margin, y, pageWidth - 2 * margin);

  // Footer de página 4
  safeAddImage(images.footer, 0, pageHeight - 7.9, 210.1, 7.9);
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORES.gris);
  pdf.text(`Página 4 de 5`, pageWidth - margin, pageHeight - 12, { align: "right" });

  // ============================================================
  // PÁGINA 5: CONCLUSIONES Y RECOMENDACIONES
  // ============================================================
  pdf.addPage();
  // Header arriba
  safeAddImage(images.portada, 0, 0, 210.1, 29);
  y = 50;

  // 4. Conclusiones
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...COLORES.azulUnemi);
  pdf.text("4. Conclusiones", margin, y);
  y += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);

  const conclusionesTexts = [
    `La carrera de ${data.carrera} alcanzó un nivel de satisfacción del ${data.porcentajeSatisfaccion.toFixed(1)}%, reflejando una percepción positiva por parte de los estudiantes.`,
    "Los aspectos mejor valorados representan fortalezas institucionales que deben ser mantenidas y consolidadas.",
    "Las áreas con menor puntuación requieren atención prioritaria para el desarrollo de estrategias de mejora continua."
  ];

  conclusionesTexts.forEach((texto) => {
    const lines = pdf.splitTextToSize(texto, pageWidth - 2 * margin);
    y = drawJustifiedText(pdf, texto, margin, y, pageWidth - 2 * margin);
    y += 5;
  });

  y += 10;

  // 5. Recomendaciones (generadas dinámicamente)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...COLORES.azulUnemi);
  pdf.text("5. Recomendaciones", margin, y);
  y += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);

  // Identificar los 2 criterios con mejor y peor valoración
  const criteriosOrdenadosDesc = [...data.criterios].sort((a, b) => b.valor - a.valor);
  const mejoresCriterios = criteriosOrdenadosDesc.slice(0, 2);
  const peoresCriterios = criteriosOrdenadosDesc.slice(-2).reverse();

  const recomendaciones = [
    `Mantener y fortalecer los aspectos mejor evaluados: "${mejoresCriterios[0].nombre}" y "${mejoresCriterios[1].nombre}", mediante la asignación de recursos adecuados y el reconocimiento del trabajo realizado.`,
    `Implementar planes de acción específicos para mejorar: "${peoresCriterios[0].nombre}" y "${peoresCriterios[1].nombre}", priorizando la asignación de recursos y el establecimiento de metas concretas.`,
    "Realizar un seguimiento periódico de los indicadores de satisfacción estudiantil para evaluar el impacto de las acciones implementadas.",
    "Socializar los resultados con la comunidad académica (docentes, estudiantes y autoridades) para promover la mejora continua y la toma de decisiones informadas.",
    "Implementar mecanismos de retroalimentación que permitan a los estudiantes participar activamente en los procesos de mejora institucional."
  ];

  recomendaciones.forEach((rec, idx) => {
    const lines = pdf.splitTextToSize(`${idx + 1}. ${rec}`, pageWidth - 2 * margin - 5);
    y = drawJustifiedText(pdf, `${idx + 1}. ${rec}`, margin + 5, y, pageWidth - 2 * margin - 5);
    y += 5;
  });

  y += 15;

  // Espacio para firmas (3 columnas)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(3, 46, 69); // #032e45

  const contentWidth = pageWidth - 2 * margin;
  const columnaWidth = contentWidth / 3;
  const lineWidth = 50; // Ancho de la línea de firma
  const firmaY = y;

  // Líneas para las firmas
  pdf.setDrawColor(0, 0, 0);
  
  // Firma 1: Asistente
  const firma1X = margin + (columnaWidth / 2) - (lineWidth / 2);
  
  const firma1Text = pdf.splitTextToSize("Asistente de Evaluación y Acreditación Institucional", columnaWidth - 5);
  pdf.text(firma1Text, margin + (columnaWidth / 2), firmaY + 5, { align: "center" });

  // Firma 2: Experto
  const firma2X = margin + columnaWidth + (columnaWidth / 2) - (lineWidth / 2);
  
  const firma2Text = pdf.splitTextToSize("Experto de Evaluación y Acreditación Institucional", columnaWidth - 5);
  pdf.text(firma2Text, margin + columnaWidth + (columnaWidth / 2), firmaY + 5, { align: "center" });

  // Firma 3: Directora
  const firma3X = margin + 2 * columnaWidth + (columnaWidth / 2) - (lineWidth / 2);
  
  const firma3Text = pdf.splitTextToSize("Directora de Aseguramiento de la Calidad", columnaWidth - 5);
  pdf.text(firma3Text, margin + 2 * columnaWidth + (columnaWidth / 2), firmaY + 5, { align: "center" });

  // Footer final
  safeAddImage(images.footer, 0, pageHeight - 7.9, 210.1, 7.9);
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORES.gris);
  pdf.text(`Página 5 de 5`, pageWidth - margin, pageHeight - 12, { align: "right" });

  // ============================================================
  // GUARDAR PDF
  // ============================================================
  pdf.save(
    `Reporte_Satisfaccion_${data.carrera.replace(/\s+/g, "_")}_${data.periodo}.pdf`
  );
};
