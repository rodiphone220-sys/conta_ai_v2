import { motion } from "motion/react";
import { ArrowLeft, ScanLine, FileImage, FileText, Upload, CheckCircle2, AlertCircle, Loader2, Eye, Edit3, Save, X } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import API_URL from "../config/api";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface OCRScannerPageProps {
  onBack: () => void;
}

export interface ExtractedData {
  documentType: "ticket" | "factura" | "unknown";
  uuid?: string;
  fecha?: string;
  rfcEmisor?: string;
  nombreEmisor?: string;
  rfcReceptor?: string;
  nombreReceptor?: string;
  subtotal?: number;
  iva?: number;
  total?: number;
  isDeductible?: boolean;
  deductibilityReason?: string;
  rawText?: string;
}

// Fiscal deductibility rules based on regime
const DEDUCTIBILITY_RULES: Record<string, {
  allowedDocumentTypes: string[];
  allowedCategories: string[];
  forbiddenCategories: string[];
  description: string;
}> = {
  "626": { // RESICO
    allowedDocumentTypes: ["factura"],
    allowedCategories: ["médico", "escolar", "insumos", "proveedor", "servicios"],
    forbiddenCategories: ["supermercado", "tienda", "consumo personal", "restaurante"],
    description: "RESICO: Solo facturas CFDI de proveedores. Tickets de supermercado no son deducibles (excepto gastos médicos o escolares)."
  },
  "612": { // PFAE
    allowedDocumentTypes: ["factura", "ticket"],
    allowedCategories: ["insumos", "proveedor", "herramientas", "materiales", "oficina"],
    forbiddenCategories: ["consumo personal", "ropa", "entretenimiento"],
    description: "PFAE: Tickets de insumos y proveedores son deducibles. Consumo personal no es deducible."
  },
  "605": { // Sueldos y Salarios
    allowedDocumentTypes: [],
    allowedCategories: [],
    forbiddenCategories: ["todos"],
    description: "Sueldos y Salarios: Ningún gasto es deducible para este régimen."
  },
  "601": { // General de Ley
    allowedDocumentTypes: ["factura"],
    allowedCategories: ["todos"],
    forbiddenCategories: [],
    description: "General de Ley: Todas las facturas de proveedores son deducibles si están relacionadas con la actividad empresarial."
  },
  "621": { // Incorporación Fiscal
    allowedDocumentTypes: ["factura"],
    allowedCategories: ["insumos", "proveedor", "herramientas", "materiales"],
    forbiddenCategories: ["consumo personal"],
    description: "Incorporación Fiscal: Facturas de proveedores relacionadas con la actividad son deducibles."
  },
  "603": { // No Lucrativos
    allowedDocumentTypes: ["factura"],
    allowedCategories: ["gastos operativos", "servicios", "materiales"],
    forbiddenCategories: ["consumo personal"],
    description: "No Lucrativos: Facturas relacionadas con los fines de la asociación son deducibles."
  },
  "606": { // Arrendamiento
    allowedDocumentTypes: ["factura"],
    allowedCategories: ["mantenimiento", "reparación", "servicios", "predial"],
    forbiddenCategories: ["consumo personal"],
    description: "Arrendamiento: Gastos relacionados con el mantenimiento del inmueble son deducibles."
  }
};

export function OCRScannerPage({ onBack }: OCRScannerPageProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [userRegimen, setUserRegimen] = useState<string>("612");
  const [userId, setUserId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get user ID from localStorage on mount
  useState(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUserId(userData.id || userData.userId || '');
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
  });

  const resetState = () => {
    setExtractedData(null);
    setIsProcessing(false);
    setProgress(0);
    setDocumentPreview(null);
    setIsEditing(false);
  };

  const saveOcrDocumentToDrive = async (file: File, data: ExtractedData) => {
    if (!userId) {
      console.warn('No user ID available, skipping OCR save to Drive');
      return;
    }

    try {
      // Convert image to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const response = await fetch(`${API_URL}/api/ocr/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          documentType: data.documentType,
          imageBase64: base64,
          fileName: `${data.documentType}_${data.nombreEmisor || 'scan'}_${Date.now()}`,
          extractedData: data
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('OCR document saved to Drive:', result.url);
      }
    } catch (error) {
      console.error('Error saving OCR document:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato no válido", {
        description: "Por favor sube una imagen (JPG, PNG) o PDF"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setDocumentPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsProcessing(true);
    setProgress(10);

    try {
      let text = "";

      if (file.type === "application/pdf") {
        text = await extractTextFromPDF(file);
      } else {
        text = await extractTextFromImage(file);
      }

      setProgress(80);
      const parsedData = parseOCRText(text, file, userRegimen);
      setExtractedData(parsedData);

      setProgress(100);
      setIsProcessing(false);

      // Guardar documento OCR en Google Drive (o localmente)
      await saveOcrDocumentToDrive(file, parsedData);

      toast.success("Documento procesado", {
        description: `Tipo: ${parsedData.documentType === "factura" ? "Factura CFDI" : parsedData.documentType === "ticket" ? "Ticket" : "Documento"}`
      });
    } catch (error) {
      console.error("OCR Error:", error);
      setIsProcessing(false);
      toast.error("Error al procesar documento", {
        description: "No se pudo leer el documento. Intenta con mejor calidad o formato PDF texto."
      });
    }
  };

  const extractTextFromImage = async (file: File): Promise<string> => {
    const result = await Tesseract.recognize(file, "spa", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(10 + (m.progress * 70));
        }
      }
    });
    return result.data.text;
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context!,
      viewport: viewport
    }).promise;

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Failed to convert PDF to image");

    const result = await Tesseract.recognize(blob, "spa", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(10 + (m.progress * 70));
        }
      }
    });
    return result.data.text;
  };

  const parseOCRText = (text: string, file: File, regimen: string): ExtractedData => {
    const upperText = text.toUpperCase();

    const isFactura = upperText.includes("CFDI") ||
      upperText.includes("COMPROBANTE FISCAL") ||
      upperText.includes("TIMBRADO") ||
      upperText.includes("UUID") ||
      upperText.includes("FOLIO FISCAL") ||
      upperText.includes("SAT") && upperText.includes("RFC");

    const documentType: "ticket" | "factura" | "unknown" = isFactura ? "factura" : "ticket";

    const uuidMatch = text.match(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i);
    const uuid = uuidMatch ? uuidMatch[0] : undefined;

    const rfcEmisorMatch = upperText.match(/RFC[:\s]*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{9,10})/);
    const rfcEmisor = rfcEmisorMatch?.[1];

    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})/);
    const fecha = dateMatch?.[0];

    const moneyPattern = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    const amounts = Array.from(text.matchAll(moneyPattern)).map(m => parseFloat(m[1].replace(/,/g, "")));

    let subtotal: number | undefined;
    let iva: number | undefined;
    let total: number | undefined;

    const subtotalMatch = upperText.match(/SUBTOTAL[:\s]*\$?\s*([\d,]+\.?\d*)/i);
    const ivaMatch = upperText.match(/IVA[:\s]*\$?\s*([\d,]+\.?\d*)/i);
    const totalMatch = upperText.match(/TOTAL[:\s]*\$?\s*([\d,]+\.?\d*)/i);

    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ""));
    if (ivaMatch) iva = parseFloat(ivaMatch[1].replace(/,/g, ""));
    if (totalMatch) total = parseFloat(totalMatch[1].replace(/,/g, ""));

    if (!total && amounts.length > 0) {
      total = Math.max(...amounts);
    }
    if (!subtotal && total) {
      subtotal = total / 1.16;
    }
    if (!iva && subtotal && total) {
      iva = total - subtotal;
    }

    const lines = text.split("\n").filter(l => l.trim().length > 0);
    const nombreEmisor = lines[0]?.trim();

    const regimeRules = DEDUCTIBILITY_RULES[regimen] || DEDUCTIBILITY_RULES["612"];
    const isDeductible = analyzeDeductibility(documentType, text, regimeRules);
    const deductibilityReason = generateDeductibilityReason(isDeductible, regimeRules, documentType);

    return {
      documentType,
      uuid,
      fecha,
      rfcEmisor,
      nombreEmisor,
      subtotal: subtotal ? Math.round(subtotal * 100) / 100 : undefined,
      iva: iva ? Math.round(iva * 100) / 100 : undefined,
      total: total ? Math.round(total * 100) / 100 : undefined,
      isDeductible,
      deductibilityReason,
      rawText: text
    };
  };

  const analyzeDeductibility = (
    documentType: string,
    text: string,
    rules: typeof DEDUCTIBILITY_RULES[string]
  ): boolean => {
    const upperText = text.toUpperCase();

    if (!rules.allowedDocumentTypes.includes(documentType)) {
      return false;
    }

    for (const forbidden of rules.forbiddenCategories) {
      if (upperText.includes(forbidden.toUpperCase())) {
        return false;
      }
    }

    if (rules.allowedCategories.length > 0 && rules.allowedCategories[0] !== "todos") {
      const hasAllowedCategory = rules.allowedCategories.some(cat =>
        upperText.includes(cat.toUpperCase())
      );

      if (documentType === "ticket" && !hasAllowedCategory) {
        return false;
      }
    }

    return true;
  };

  const generateDeductibilityReason = (
    isDeductible: boolean,
    rules: typeof DEDUCTIBILITY_RULES[string],
    documentType: string
  ): string => {
    if (isDeductible) {
      return `✅ Este ${documentType === "factura" ? "documento" : "ticket"} ES deducible para tu régimen.`;
    } else {
      return `❌ Este ${documentType === "factura" ? "documento" : "ticket"} NO es deducible para tu régimen. ${rules.description}`;
    }
  };

  const handleFieldChange = (field: keyof ExtractedData, value: any) => {
    if (extractedData) {
      setExtractedData({ ...extractedData, [field]: value });
    }
  };

  return (
    <div className="min-h-screen bg-brand-light p-4 sm:p-6 lg:p-12 overflow-x-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 lg:mb-12">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-3d hover-3d text-brand-dark/60 hover:text-brand-primary shrink-0"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <ScanLine className="w-6 h-6 text-emerald-600" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand-dark">OCR Fiscal</h1>
              </div>
              <p className="text-brand-dark/50 font-medium text-sm lg:text-base mt-1">
                Escanea y analiza tickets y facturas de proveedores
              </p>
            </div>
          </div>
        </header>

        {/* Régimen Selector */}
        <div className="glass p-6 rounded-2xl shadow-3d mb-6">
          <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1 mb-2 block">
            Tu Régimen Fiscal (para análisis de deducibilidad)
          </label>
          <select
            value={userRegimen}
            onChange={(e) => setUserRegimen(e.target.value)}
            className="w-full bg-white border border-brand-dark/5 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-semibold text-brand-dark"
          >
            <option value="626">626 - RESICO</option>
            <option value="612">612 - Personas Físicas con Actividad Empresarial</option>
            <option value="605">605 - Sueldos y Salarios</option>
            <option value="601">601 - General de Ley Personas Morales</option>
            <option value="621">621 - Incorporación Fiscal</option>
            <option value="603">603 - Personas Morales No Lucrativas</option>
            <option value="606">606 - Arrendamiento</option>
          </select>
        </div>

        {/* Upload Area */}
        {!extractedData && !isProcessing && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-emerald-400 rounded-3xl p-12 text-center hover:bg-emerald-50 transition-all cursor-pointer group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Upload className="w-12 h-12 text-emerald-600" />
            </div>
            <h3 className="text-xl font-display font-bold text-brand-dark mb-3">
              Sube tu documento
            </h3>
            <p className="text-brand-dark/60 mb-6 max-w-md mx-auto">
              Arrastra o haz clic para subir un ticket o factura. La app extraerá automáticamente los datos y analizará si es deducible.
            </p>
            <div className="flex justify-center gap-4 text-sm text-brand-dark/40">
              <span className="flex items-center gap-2">
                <FileImage className="w-4 h-4" /> JPG, PNG
              </span>
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> PDF
              </span>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="glass p-12 rounded-3xl text-center">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            </div>
            <h3 className="text-xl font-display font-bold text-brand-dark mb-3">
              Procesando documento...
            </h3>
            <p className="text-brand-dark/60 mb-6">
              Extrayendo información con OCR
            </p>
            <div className="w-full max-w-md mx-auto bg-brand-light rounded-full h-4 overflow-hidden mb-3">
              <motion.div
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-brand-dark/40">{Math.round(progress)}%</p>
          </div>
        )}

        {/* Extracted Data */}
        {extractedData && !isProcessing && (
          <div className="space-y-6">
            {/* Document Preview */}
            {documentPreview && (
              <div className="flex justify-center">
                <div className="relative w-full max-w-xs rounded-2xl overflow-hidden border border-brand-dark/10 shadow-lg">
                  {documentPreview.endsWith("pdf") ? (
                    <div className="aspect-[3/4] bg-brand-light flex items-center justify-center">
                      <FileText className="w-16 h-16 text-brand-dark/20" />
                    </div>
                  ) : (
                    <img
                      src={documentPreview}
                      alt="Documento"
                      className="w-full h-auto"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Deductibility Status */}
            <div className={cn(
              "p-6 rounded-2xl flex items-start gap-4",
              extractedData.isDeductible ? "bg-emerald-50 border-2 border-emerald-200" : "bg-red-50 border-2 border-red-200"
            )}>
              {extractedData.isDeductible ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-600 shrink-0" />
              )}
              <div className="flex-1">
                <p className={cn(
                  "font-bold text-lg",
                  extractedData.isDeductible ? "text-emerald-800" : "text-red-800"
                )}>
                  {extractedData.deductibilityReason}
                </p>
              </div>
            </div>

            {/* Editable Form */}
            <div className="glass p-6 lg:p-8 rounded-3xl shadow-3d">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold text-brand-dark">Datos Extraídos</h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-light hover:bg-brand-light/80 rounded-xl font-bold text-brand-dark transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  {isEditing ? "Cancelar" : "Editar"}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <EditableField
                  label="Tipo de documento"
                  value={extractedData.documentType === "factura" ? "Factura CFDI" : extractedData.documentType === "ticket" ? "Ticket" : "Documento"}
                  disabled
                />
                <EditableField
                  label="UUID / Folio Fiscal"
                  value={extractedData.uuid || "No detectado"}
                  onChange={(v) => handleFieldChange("uuid", v)}
                  isEditing={isEditing}
                />
                <EditableField
                  label="Fecha"
                  value={extractedData.fecha || ""}
                  onChange={(v) => handleFieldChange("fecha", v)}
                  isEditing={isEditing}
                  type="date"
                />
                <EditableField
                  label="RFC Emisor"
                  value={extractedData.rfcEmisor || ""}
                  onChange={(v) => handleFieldChange("rfcEmisor", v)}
                  isEditing={isEditing}
                  placeholder="ABC123456T1"
                />
                <EditableField
                  label="Nombre Emisor"
                  value={extractedData.nombreEmisor || ""}
                  onChange={(v) => handleFieldChange("nombreEmisor", v)}
                  isEditing={isEditing}
                  className="lg:col-span-2"
                />
                <EditableField
                  label="Subtotal"
                  value={extractedData.subtotal?.toFixed(2) || ""}
                  onChange={(v) => handleFieldChange("subtotal", parseFloat(v) || 0)}
                  isEditing={isEditing}
                  type="number"
                  prefix="$"
                />
                <EditableField
                  label="IVA (16%)"
                  value={extractedData.iva?.toFixed(2) || ""}
                  onChange={(v) => handleFieldChange("iva", parseFloat(v) || 0)}
                  isEditing={isEditing}
                  type="number"
                  prefix="$"
                />
                <EditableField
                  label="Total"
                  value={extractedData.total?.toFixed(2) || ""}
                  onChange={(v) => handleFieldChange("total", parseFloat(v) || 0)}
                  isEditing={isEditing}
                  type="number"
                  prefix="$"
                  className="lg:col-span-2"
                />
              </div>

              {/* Raw Text */}
              <details className="mt-6 bg-brand-light rounded-xl p-4">
                <summary className="font-bold text-brand-dark cursor-pointer flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Ver texto extraído (OCR)
                </summary>
                <pre className="mt-3 text-xs text-brand-dark/60 whitespace-pre-wrap max-h-64 overflow-auto">
                  {extractedData.rawText}
                </pre>
              </details>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={resetState}
                className="flex-1 py-4 bg-brand-light hover:bg-brand-light/80 text-brand-dark rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Escanear otro documento
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Editable Field Component
interface EditableFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  isEditing?: boolean;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  className?: string;
  prefix?: string;
}

function EditableField({
  label,
  value,
  onChange,
  isEditing = false,
  disabled = false,
  type = "text",
  placeholder = "",
  className = "",
  prefix
}: EditableFieldProps) {
  if (disabled || !isEditing) {
    return (
      <div className={cn("space-y-2", className)}>
        <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">
          {label}
        </label>
        <div className={cn(
          "bg-white/50 border border-brand-dark/5 rounded-xl py-3 px-4 font-semibold text-brand-dark",
          prefix && "flex items-center"
        )}>
          {prefix && <span className="text-brand-dark/40 mr-2">{prefix}</span>}
          {value || "—"}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40 font-bold">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-white border border-brand-dark/10 rounded-xl py-3 font-semibold text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary",
            prefix ? "pl-8 pr-4" : "px-4"
          )}
        />
      </div>
    </div>
  );
}
