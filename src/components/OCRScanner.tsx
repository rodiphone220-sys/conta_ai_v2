import { motion, AnimatePresence } from "motion/react";
import { useState, useRef } from "react";
import {
  X,
  Upload,
  FileImage,
  FileText,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit3,
  Save,
  Eye,
  Trash2
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface OCRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractData?: (data: ExtractedData) => void;
  userRegimen?: string;
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
  items?: OCRItem[];
  isDeductible?: boolean;
  deductibilityReason?: string;
  rawText?: string;
}

export interface OCRItem {
  descripcion: string;
  cantidad?: number;
  valorUnitario?: number;
  importe?: number;
  claveProdServ?: string;
}

// Fiscal deductibility rules based on regime
const DEDUCTIBILITY_RULES: Record<string, {
  allowedDocumentTypes: string[];
  allowedCategories: string[];
  forbiddenCategories: string[];
  description: string;
}> = {
  "626": { // Régimen Simplificado de Confianza (RESICO)
    allowedDocumentTypes: ["factura"],
    allowedCategories: ["médico", "escolar", "insumos", "proveedor", "servicios"],
    forbiddenCategories: ["supermercado", "tienda", "consumo personal", "restaurante"],
    description: "RESICO: Solo facturas CFDI de proveedores. Tickets de supermercado no son deducibles (excepto gastos médicos o escolares)."
  },
  "612": { // Personas Físicas con Actividades Empresariales y Profesionales (PFAE)
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
  "601": { // General de Ley Personas Morales
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
  "603": { // Personas Morales con Fines no Lucrativos
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

export function OCRScanner({ isOpen, onClose, onExtractData, userRegimen = "612" }: OCRScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setExtractedData(null);
    setIsProcessing(false);
    setProgress(0);
    setDocumentPreview(null);
    setIsEditing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato no válido", {
        description: "Por favor sube una imagen (JPG, PNG) o PDF"
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setDocumentPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process based on file type
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

      // Parse extracted text
      const parsedData = parseOCRText(text, file);
      setExtractedData(parsedData);
      
      setProgress(100);
      setIsProcessing(false);

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
    const page = await pdf.getPage(1); // First page
    
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context!,
      viewport: viewport
    }).promise;

    // Convert canvas to blob and run OCR
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

  const parseOCRText = (text: string, file: File): ExtractedData => {
    const upperText = text.toUpperCase();
    
    // Detect document type
    const isFactura = upperText.includes("CFDI") || 
                      upperText.includes("COMPROBANTE FISCAL") ||
                      upperText.includes("TIMBRADO") ||
                      upperText.includes("UUID") ||
                      upperText.includes("FOLIO FISCAL") ||
                      upperText.includes("SAT") && upperText.includes("RFC");
    
    const documentType: "ticket" | "factura" | "unknown" = isFactura ? "factura" : "ticket";

    // Extract UUID (format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
    const uuidMatch = text.match(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i);
    const uuid = uuidMatch ? uuidMatch[0] : undefined;

    // Extract RFC (format: 12-13 alphanumeric characters)
    const rfcEmisorMatch = upperText.match(/RFC[:\s]*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{9,10})/);
    const rfcEmisor = rfcEmisorMatch?.[1];

    // Extract date
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})/);
    const fecha = dateMatch?.[0];

    // Extract monetary amounts
    const moneyPattern = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    const amounts = Array.from(text.matchAll(moneyPattern)).map(m => parseFloat(m[1].replace(/,/g, "")));
    
    // Try to identify subtotal, IVA, and total
    let subtotal: number | undefined;
    let iva: number | undefined;
    let total: number | undefined;

    // Look for explicit labels
    const subtotalMatch = upperText.match(/SUBTOTAL[:\s]*\$?\s*([\d,]+\.?\d*)/i);
    const ivaMatch = upperText.match(/IVA[:\s]*\$?\s*([\d,]+\.?\d*)/i);
    const totalMatch = upperText.match(/TOTAL[:\s]*\$?\s*([\d,]+\.?\d*)/i);

    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ""));
    if (ivaMatch) iva = parseFloat(ivaMatch[1].replace(/,/g, ""));
    if (totalMatch) total = parseFloat(totalMatch[1].replace(/,/g, ""));

    // Fallback: use amounts array
    if (!total && amounts.length > 0) {
      total = Math.max(...amounts);
    }
    if (!subtotal && total) {
      subtotal = total / 1.16;
    }
    if (!iva && subtotal && total) {
      iva = total - subtotal;
    }

    // Extract issuer name (first line usually)
    const lines = text.split("\n").filter(l => l.trim().length > 0);
    const nombreEmisor = lines[0]?.trim();

    // Analyze deductibility based on regime
    const regimeRules = DEDUCTIBILITY_RULES[userRegimen] || DEDUCTIBILITY_RULES["612"];
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

    // Check if document type is allowed
    if (!rules.allowedDocumentTypes.includes(documentType)) {
      return false;
    }

    // Check forbidden categories
    for (const forbidden of rules.forbiddenCategories) {
      if (upperText.includes(forbidden.toUpperCase())) {
        return false;
      }
    }

    // Check if any allowed category is present
    if (rules.allowedCategories.length > 0 && rules.allowedCategories[0] !== "todos") {
      const hasAllowedCategory = rules.allowedCategories.some(cat =>
        upperText.includes(cat.toUpperCase())
      );
      
      // For tickets, require an allowed category
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

  const handleSaveData = () => {
    if (extractedData && onExtractData) {
      onExtractData(extractedData);
      toast.success("Datos aplicados", {
        description: "La información del documento se ha aplicado a la factura"
      });
      handleClose();
    }
  };

  const handleFieldChange = (field: keyof ExtractedData, value: any) => {
    if (extractedData) {
      setExtractedData({ ...extractedData, [field]: value });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto pointer-events-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-brand-primary to-brand-dark p-6 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <ScanLine className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-white">OCR Fiscal</h2>
                    <p className="text-white/80 text-sm">Escanea tickets y facturas</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 lg:p-8 space-y-6">
                {/* Upload Area */}
                {!extractedData && !isProcessing && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-brand-primary/30 rounded-2xl p-12 text-center hover:bg-brand-primary/5 transition-all cursor-pointer group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-10 h-10 text-brand-primary" />
                    </div>
                    <h3 className="text-lg font-display font-bold text-brand-dark mb-2">
                      Sube tu documento
                    </h3>
                    <p className="text-brand-dark/60 mb-4">
                      Arrastra o haz clic para subir
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
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
                    </div>
                    <h3 className="text-lg font-display font-bold text-brand-dark mb-2">
                      Procesando documento...
                    </h3>
                    <p className="text-brand-dark/60 mb-6">
                      Extrayendo información con OCR
                    </p>
                    <div className="w-full max-w-md mx-auto bg-brand-light rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="h-full bg-brand-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-sm text-brand-dark/40 mt-2">{Math.round(progress)}%</p>
                  </div>
                )}

                {/* Extracted Data */}
                {extractedData && !isProcessing && (
                  <div className="space-y-6">
                    {/* Document Preview */}
                    {documentPreview && (
                      <div className="flex justify-center">
                        <div className="relative w-full max-w-xs rounded-xl overflow-hidden border border-brand-dark/10">
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
                      "p-4 rounded-xl flex items-start gap-3",
                      extractedData.isDeductible ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
                    )}>
                      {extractedData.isDeductible ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={cn(
                          "font-bold",
                          extractedData.isDeductible ? "text-emerald-800" : "text-red-800"
                        )}>
                          {extractedData.deductibilityReason}
                        </p>
                      </div>
                    </div>

                    {/* Editable Form */}
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

                    {/* Raw Text (for debugging) */}
                    <details className="bg-brand-light rounded-xl p-4">
                      <summary className="font-bold text-brand-dark cursor-pointer flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Ver texto extraído (OCR)
                      </summary>
                      <pre className="mt-3 text-xs text-brand-dark/60 whitespace-pre-wrap max-h-48 overflow-auto">
                        {extractedData.rawText}
                      </pre>
                    </details>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      {!isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="flex-1 py-4 bg-brand-light hover:bg-brand-light/80 text-brand-dark rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                          >
                            <Edit3 className="w-5 h-5" />
                            Editar datos
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveData}
                            className="flex-1 py-4 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                          >
                            <Save className="w-5 h-5" />
                            Aplicar a factura
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-4 bg-brand-light hover:bg-brand-light/80 text-brand-dark rounded-xl font-bold transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveData}
                            className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            Guardar cambios
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
