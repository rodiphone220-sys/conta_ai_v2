import { motion } from "motion/react";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calculator,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Info,
  Users,
  FileSignature,
  Send,
  Loader2,
  Download,
  Copy,
  RefreshCw,
  Clock,
  FileDown,
  Percent,
  ScanLine
} from "lucide-react";
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { IVATabulator } from "./IVATabulator";
import { OCRScanner, ExtractedData } from "./OCRScanner";
import {
  REGIMENES_FISCALES,
  USOS_CFDI,
  FORMAS_PAGO,
  METODOS_PAGO,
  UNIDADES_MEDIDA,
  PRODUCTOS_SERVICIOS
} from "../constants";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

type InvoiceStatus = 'BORRADOR' | 'GENERADA' | 'FIRMADA' | 'TIMBRANDO' | 'TIMBRADA' | 'ERROR' | 'CANCELADA';

const invoiceSchema = z.object({
  rfcEmisor: z.string().min(12).max(13),
  nombreEmisor: z.string().min(1),
  emailEmisor: z.string().email().optional().or(z.literal('')),
  regimenFiscalEmisor: z.string(),
  rfcReceptor: z.string().min(12).max(13),
  nombreReceptor: z.string().min(1),
  regimenFiscalReceptor: z.string(),
  domicilioFiscalReceptor: z.string().length(5),
  emailReceptor: z.string().optional(),
  telefonoReceptor: z.string().optional(),
  calleReceptor: z.string().optional(),
  numeroExtReceptor: z.string().optional(),
  numeroIntReceptor: z.string().optional(),
  coloniaReceptor: z.string().optional(),
  municipioReceptor: z.string().optional(),
  estadoReceptor: z.string().optional(),
  paisReceptor: z.string().optional(),
  usoCFDI: z.string(),
  formaPago: z.string(),
  metodoPago: z.string(),
  moneda: z.string(),
  tipoComprobante: z.string(),
  items: z.array(z.object({
    claveProdServ: z.string(),
    cantidad: z.number().min(0.000001),
    claveUnidad: z.string(),
    descripcion: z.string().min(1),
    valorUnitario: z.number().min(0),
    objetoImp: z.string(),
  })).min(1),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  onBack: () => void;
  onSave: (data: any) => void;
  editInvoice?: any;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bgColor: string }> = {
  BORRADOR: { label: 'Borrador', color: 'text-brand-dark/60', bgColor: 'bg-brand-dark/10' },
  GENERADA: { label: 'Generada', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  FIRMADA: { label: 'Firmada', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  TIMBRANDO: { label: 'Timbrando...', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  TIMBRADA: { label: 'Timbrada', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  ERROR: { label: 'Error', color: 'text-red-600', bgColor: 'bg-red-100' },
  CANCELADA: { label: 'Cancelada', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export function InvoiceForm({ onBack, onSave, editInvoice }: InvoiceFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>(editInvoice?.Status || 'BORRADOR');
  const [invoiceId, setInvoiceId] = useState<string | null>(editInvoice?.ID || editInvoice?.id || null);
  const [uuid, setUuid] = useState<string | null>(editInvoice?.UUID || editInvoice?.uuid || null);
  const [xmlTimbrado, setXmlTimbrado] = useState<string | null>(editInvoice?.XML_Content || null);
  const [pacConfigured, setPacConfigured] = useState(false);
  const [timbrando, setTimbrando] = useState(false);
  const [savingPending, setSavingPending] = useState(false);
  const [ivaTabulatorOpen, setIvaTabulatorOpen] = useState(false);
  const [targetItemIndex, setTargetItemIndex] = useState<number | null>(null);
  const [ocrScannerOpen, setOcrScannerOpen] = useState(false);
  const [userRegimen, setUserRegimen] = useState<string>("612");
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  useEffect(() => {
    checkPacConfig();
    loadCompanyData();
    loadClients();
    loadProducts();
    if (editInvoice) {
      loadInvoiceData(editInvoice);
    }
    // Si viene un cliente seleccionado desde ClientsPage, pre-llenar campos
    if (editInvoice?.clientData) {
      const c = editInvoice.clientData;
      setValue("rfcReceptor", c.RFC || c.rfc || "");
      setValue("nombreReceptor", c.Nombre || c.nombre || "");
      setValue("calleReceptor", c.Calle || c.calle || "");
      setValue("numeroExtReceptor", c.NumeroExt || c.numeroExt || "");
      setValue("numeroIntReceptor", c.NumeroInt || c.numeroInt || "");
      setValue("coloniaReceptor", c.Colonia || c.colonia || "");
      setValue("municipioReceptor", c.Municipio || c.municipio || "");
      setValue("estadoReceptor", c.Estado || c.estado || "");
      setValue("paisReceptor", c.Pais || c.pais || "México");
      setValue("domicilioFiscalReceptor", c.CP || c.cp || "");
      setValue("emailReceptor", c.Email || c.email || "");
      setValue("telefonoReceptor", c.Telefono || c.telefono || "");
      const rawRegimen = c.RegimenFiscal || c.regimenFiscal || "";
      const claveRegimen = rawRegimen.includes(" - ") ? rawRegimen.split(" - ")[0] : rawRegimen;
      setValue("regimenFiscalReceptor", claveRegimen);
      setSelectedClientId(c.id || "");
    }
  }, []);

  const loadCompanyData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/company`);
      if (response.ok) {
        const company = await response.json();
        console.log('[loadCompanyData] Datos recibidos del servidor:', company);
        if (company.RFC) {
          setValue("rfcEmisor", company.RFC);
        }
        if (company.Nombre) {
          setValue("nombreEmisor", company.Nombre);
        }
        if (company.Email) {
          setValue("emailEmisor", company.Email);
        }
        if (company.RegimenFiscal) {
          // Normalizar: si viene "626 - Descripción", extraer solo la clave "626"
          const raw = company.RegimenFiscal;
          const clave = raw.includes(" - ") ? raw.split(" - ")[0] : raw;
          setValue("regimenFiscalEmisor", clave);
        }
        setUserRegimen(company.RegimenFiscal || "612");
      } else {
        console.error('[loadCompanyData] Error en respuesta del servidor:', response.status);
      }
    } catch (error) {
      console.error('[loadCompanyData] Error cargando datos de empresa:', error);
    }
  };

  const loadClients = async () => {
    try {
      const response = await fetch(`${API_URL}/api/clients`);
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSelectProduct = (productId: string, targetIndex?: number) => {
    setSelectedProductId(productId);
    if (!productId) return;
    const product = products.find(p => p.id === productId);
    if (product) {
      const idx = targetIndex ?? 0;
      setValue(`items.${idx}.claveProdServ`, product.ClaveProdServ || product.claveProdServ || "");
      setValue(`items.${idx}.claveUnidad`, product.ClaveUnidad || product.claveUnidad || "E48");
      setValue(`items.${idx}.descripcion`, product.Nombre || product.nombre || product.Descripcion || "");
      setValue(`items.${idx}.valorUnitario`, parseFloat(product.PrecioUnitario || product.precioUnitario || product.precio || 0));
      toast.success('Producto cargado', {
        description: `${product.Nombre || product.nombre} — $${parseFloat(product.PrecioUnitario || product.precioUnitario || product.precio || 0).toFixed(2)}`,
      });
    }
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) {
      // Limpiar campos del receptor
      setValue("rfcReceptor", "");
      setValue("nombreReceptor", "");
      setValue("calleReceptor", "");
      setValue("numeroExtReceptor", "");
      setValue("numeroIntReceptor", "");
      setValue("coloniaReceptor", "");
      setValue("municipioReceptor", "");
      setValue("estadoReceptor", "");
      setValue("paisReceptor", "México");
      setValue("domicilioFiscalReceptor", "");
      setValue("emailReceptor", "");
      setValue("telefonoReceptor", "");
      setValue("regimenFiscalReceptor", "");
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setValue("rfcReceptor", client.RFC || client.rfc || "");
      setValue("nombreReceptor", client.Nombre || client.nombre || "");
      setValue("calleReceptor", client.Calle || client.calle || "");
      setValue("numeroExtReceptor", client.NumeroExt || client.numeroExt || "");
      setValue("numeroIntReceptor", client.NumeroInt || client.numeroInt || "");
      setValue("coloniaReceptor", client.Colonia || client.colonia || "");
      setValue("municipioReceptor", client.Municipio || client.municipio || "");
      setValue("estadoReceptor", client.Estado || client.estado || "");
      setValue("paisReceptor", client.Pais || client.pais || "México");
      setValue("domicilioFiscalReceptor", client.CP || client.cp || "");
      setValue("emailReceptor", client.Email || client.email || "");
      setValue("telefonoReceptor", client.Telefono || client.telefono || "");
      // Normalizar régimen fiscal: extraer solo la clave
      const rawRegimen = client.RegimenFiscal || client.regimenFiscal || "";
      const claveRegimen = rawRegimen.includes(" - ") ? rawRegimen.split(" - ")[0] : rawRegimen;
      setValue("regimenFiscalReceptor", claveRegimen);
      toast.success('Cliente seleccionado', {
        description: `Datos cargados para ${client.Nombre || client.nombre}`,
      });
    }
  };

  const loadInvoiceData = (invoice: any) => {
    if (invoice.items && invoice.items.length > 0) {
      // Los items se cargarán en el formulario
    }
  };

  const checkPacConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pac/config`);
      const data = await response.json();
      setPacConfigured(data.configured);
    } catch (error) {
      console.error('Error checking PAC config:', error);
    }
  };

  const handleSavePending = async (data: InvoiceFormValues) => {
    setSavingPending(true);

    try {
      const invoiceData = {
        Fecha: new Date().toISOString(),
        Serie: 'F',
        Folio: invoiceId || String(Date.now()).slice(-6),
        RFC_Emisor: data.rfcEmisor,
        Nombre_Emisor: data.nombreEmisor,
        RFC_Receptor: data.rfcReceptor,
        Nombre_Receptor: data.nombreReceptor,
        UsoCFDI: data.usoCFDI,
        MetodoPago: data.metodoPago,
        FormaPago: data.formaPago,
        RegimenFiscal: data.regimenFiscalEmisor,
        Subtotal: subtotal,
        IVA: iva,
        Total: total,
        Status: 'BORRADOR',
        items: data.items.map(item => ({
          ...item,
          importe: item.cantidad * item.valorUnitario
        })),
      };

      const response = await fetch(`${API_URL}/api/pending-invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });

      const result = await response.json();

      if (result.success) {
        setInvoiceId(result.data.ID);
        toast.success('Factura guardada como pendiente', {
          description: `Folio: ${result.data.Serie}-${result.data.Folio}`,
        });
      } else {
        toast.error('Error al guardar');
      }
    } catch (error) {
      toast.error('Error al guardar factura pendiente');
    } finally {
      setSavingPending(false);
    }
  };

  const handleGeneratePDF = async (data: InvoiceFormValues) => {
    try {
      const invoiceData = {
        serie: data.rfcEmisor.slice(0, 2),
        folio: invoiceId || String(Date.now()).slice(-6),
        fecha: new Date().toISOString(),
        emisor: {
          rfc: data.rfcEmisor,
          nombre: data.nombreEmisor,
          regimenFiscal: data.regimenFiscalEmisor,
        },
        receptor: {
          rfc: data.rfcReceptor,
          nombre: data.nombreReceptor,
          usoCFDI: data.usoCFDI,
        },
        items: data.items.map(item => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          valorUnitario: item.valorUnitario,
          importe: item.cantidad * item.valorUnitario,
        })),
        subtotal,
        iva,
        total,
        formaPago: data.formaPago,
        metodoPago: data.metodoPago,
        moneda: data.moneda,
        uuid: uuid,
        xmlTimbrado: xmlTimbrado,
      };

      const response = await fetch(`${API_URL}/api/invoices/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });

      const result = await response.json();

      if (result.success && result.html) {
        // Abrir el HTML en una nueva ventana para impresión/guardado como PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(result.html);
          printWindow.document.close();
          printWindow.focus();
          // Auto-trigger print dialog after content loads
          setTimeout(() => {
            printWindow.print();
          }, 250);
          toast.success('Factura lista para imprimir/guardar como PDF');
        } else {
          toast.error('Permite las ventanas emergentes para generar la factura');
        }
      } else {
        toast.error('Error al generar la factura');
      }
    } catch (error) {
      toast.error('Error al generar PDF');
    }
  };

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      rfcEmisor: "ABC123456T1",
      nombreEmisor: "MI EMPRESA S.A. DE C.V.",
      emailEmisor: "",
      regimenFiscalEmisor: "601",
      rfcReceptor: "",
      nombreReceptor: "",
      regimenFiscalReceptor: "",
      domicilioFiscalReceptor: "",
      emailReceptor: "",
      telefonoReceptor: "",
      calleReceptor: "",
      numeroExtReceptor: "",
      numeroIntReceptor: "",
      coloniaReceptor: "",
      municipioReceptor: "",
      estadoReceptor: "",
      paisReceptor: "México",
      usoCFDI: "",
      formaPago: "",
      metodoPago: "",
      items: [{ claveProdServ: "80101500", cantidad: 1, claveUnidad: "E48", descripcion: "", valorUnitario: 0, objetoImp: "02" }],
      moneda: "MXN",
      tipoComprobante: "I",
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const items = watch("items");
  const subtotal = items.reduce((acc, item) => acc + (item.cantidad * item.valorUnitario), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const generateXML = (data: InvoiceFormValues): string => {
    const now = new Date();
    const fecha = now.toISOString().slice(0, 19).replace('T', 'T');
    const serie = 'F';
    const folio = String(Date.now()).slice(-6);

    let itemsXML = '';
    data.items.forEach((item, index) => {
      const importe = item.cantidad * item.valorUnitario;
      itemsXML += `
        <cfdi:Concepto ClaveProdServ="${item.claveProdServ}" Cantidad="${item.cantidad}" ClaveUnidad="${item.claveUnidad}" Descripcion="${item.descripcion}" ValorUnitario="${item.valorUnitario}" Importe="${importe}" ObjetoImp="${item.objetoImp}">
          <cfdi:Impuestos>
            <cfdi:Traslados>
              <cfdi:Traslado Base="${importe}" Impuesto="002" TasaOcuota="0.160000" TipoFactor="Tasa" Importe="${importe * 0.16}"/>
            </cfdi:Traslados>
          </cfdi:Impuestos>
        </cfdi:Concepto>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="${serie}" Folio="${folio}" Fecha="${fecha}" FormaPago="${data.formaPago}" NoCertificado="30001000000300023708" Certificado="" SubTotal="${subtotal}" Moneda="MXN" Total="${total}" TipoDeComprobante="${data.tipoComprobante}" MetodoPago="${data.metodoPago}" LugarExpedicion="${data.domicilioFiscalReceptor}">
  <cfdi:Emisor Rfc="${data.rfcEmisor}" Nombre="${data.nombreEmisor}" RegimenFiscal="${data.regimenFiscalEmisor}"/>
  <cfdi:Receptor Rfc="${data.rfcReceptor}" Nombre="${data.nombreReceptor}" UsoCFDI="${data.usoCFDI}"/>
  <cfdi:Conceptos>${itemsXML}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${iva}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${subtotal}" Impuesto="002" TasaOcuota="0.160000" TipoFactor="Tasa" Importe="${iva}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;
  };

  const handleGenerar = async (data: InvoiceFormValues) => {
    try {
      const response = await fetch(`${API_URL}/api/cfdi/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serie: 'F',
          rfcEmisor: data.rfcEmisor,
          nombreEmisor: data.nombreEmisor,
          regimenFiscalEmisor: data.regimenFiscalEmisor,
          rfcReceptor: data.rfcReceptor,
          nombreReceptor: data.nombreReceptor,
          usoCFDI: data.usoCFDI,
          formaPago: data.formaPago,
          metodoPago: data.metodoPago,
          moneda: data.moneda,
          tipoComprobante: data.tipoComprobante,
          lugarExpedicion: data.domicilioFiscalReceptor,
          items: data.items.map(item => ({
            claveProdServ: item.claveProdServ,
            cantidad: item.cantidad,
            claveUnidad: item.claveUnidad,
            descripcion: item.descripcion,
            valorUnitario: item.valorUnitario,
            objetoImp: item.objetoImp,
          })),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setInvoiceStatus('GENERADA');
        setInvoiceId(result.folio);
        toast.success('CFDI Generado', {
          description: `XML creado correctamente. Folio: ${result.folio}. Ahora puedes firmarlo.`,
        });
      } else {
        toast.error('Error al generar CFDI', {
          description: result.error || 'Verifica los datos del formulario',
        });
      }
    } catch (error) {
      toast.error('Error de conexión', {
        description: 'No se pudo generar el CFDI',
      });
    }
  };

  const handleFirmar = async (data: InvoiceFormValues) => {
    try {
      const xmlBase64 = btoa(unescape(encodeURIComponent(generateXML(data))));

      const response = await fetch(`${API_URL}/api/cfdi/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlBase64 }),
      });

      const result = await response.json();

      if (result.success) {
        setInvoiceStatus('FIRMADA');
        setXmlTimbrado(result.xmlSellado);
        toast.success('CFDI Firmado', {
          description: `Documento firmado con CSD (${result.noCertificado}). Listo para timbrar.`,
        });
      } else {
        toast.error('Error al firmar', {
          description: result.message || result.error || 'Verifica que tu CSD esté configurado',
        });
      }
    } catch (error) {
      toast.error('Error de conexión', {
        description: 'No se pudo firmar el CFDI',
      });
    }
  };

  const handleTimbrar = async (data: InvoiceFormValues) => {
    if (!pacConfigured) {
      toast.error('PAC no configurado', {
        description: 'Configura tu PAC en Configuración > Timbrado',
      });
      return;
    }

    setInvoiceStatus('TIMBRANDO');
    setTimbrando(true);

    try {
      const xmlBase64 = btoa(unescape(encodeURIComponent(generateXML(data))));

      const response = await fetch(`${API_URL}/api/pac/timbrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlBase64 })
      });

      const result = await response.json();

      if (result.success && result.uuid) {
        setInvoiceStatus('TIMBRADA');
        setUuid(result.uuid);
        setXmlTimbrado(atob(result.xmlTimbrado));
        toast.success('¡CFDI Timbrado!', {
          description: `UUID: ${result.uuid}`,
        });
      } else {
        setInvoiceStatus('ERROR');
        toast.error('Error al timbrar', {
          description: result.mensaje || 'Verifica tu configuración PAC',
        });
      }
    } catch (error) {
      setInvoiceStatus('ERROR');
      toast.error('Error de conexión', {
        description: 'No se pudo conectar con el PAC',
      });
    } finally {
      setTimbrando(false);
    }
  };

  const handleGuardar = (data: InvoiceFormValues) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSave({ ...data, subtotal, iva, total, status: invoiceStatus, uuid });
    }, 2000);
  };

  const handleCopiarUUID = () => {
    if (uuid) {
      navigator.clipboard.writeText(uuid);
      toast.success('UUID copiado');
    }
  };

  const handleReset = () => {
    setInvoiceStatus('BORRADOR');
    setUuid(null);
    setXmlTimbrado(null);
  };

  const handleOpenIvaTabulator = (itemIndex?: number) => {
    setTargetItemIndex(itemIndex ?? null);
    setIvaTabulatorOpen(true);
  };

  const handleApplyIvaTabulator = (subtotal: number, iva: number, total: number) => {
    // Apply to specific item or distribute among all items
    if (targetItemIndex !== null && targetItemIndex >= 0) {
      // Apply to specific item's valorUnitario
      setValue(`items.${targetItemIndex}.valorUnitario`, subtotal);
      toast.success('Monto aplicado', {
        description: `Subtotal: $${subtotal.toFixed(2)} | IVA: $${iva.toFixed(2)} | Total: $${total.toFixed(2)}`,
      });
    } else {
      // Apply to first item or show message
      if (items.length === 1) {
        setValue(`items.0.valorUnitario`, subtotal);
        toast.success('Monto aplicado al concepto', {
          description: `Subtotal: $${subtotal.toFixed(2)} | IVA: $${iva.toFixed(2)} | Total: $${total.toFixed(2)}`,
        });
      } else {
        toast.success('Usa los montos como referencia', {
          description: `Subtotal: $${subtotal.toFixed(2)} | IVA: $${iva.toFixed(2)} | Total: $${total.toFixed(2)}`,
        });
      }
    }
  };

  const handleExtractedOCRData = (data: ExtractedData) => {
    // Apply OCR data to the invoice form
    if (data.rfcEmisor) {
      setValue("rfcReceptor", data.rfcEmisor);
    }
    if (data.nombreEmisor) {
      setValue("nombreReceptor", data.nombreEmisor);
    }

    // Add items from OCR
    if (data.subtotal && data.total) {
      // Update first item with extracted data
      setValue(`items.0.valorUnitario`, data.subtotal);
      setValue(`items.0.descripcion`, data.nombreEmisor || `Servicio de ${data.documentType}`);
    }

    toast.success('Datos del OCR aplicados', {
      description: `Documento: ${data.documentType} | Total: $${data.total?.toFixed(2) || '0.00'} | Deducible: ${data.isDeductible ? 'Sí' : 'No'}`,
    });
  };

  const onSubmit = (data: InvoiceFormValues) => {
    if (invoiceStatus === 'TIMBRADA') {
      handleGuardar(data);
    } else {
      handleGenerar(data);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light p-4 sm:p-6 lg:p-12 overflow-x-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 lg:mb-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden p-1 shadow-md">
                <img
                  src="/logo-conta-ai.svg"
                  alt="Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-lg font-display font-bold text-brand-dark">My Conta-AI</h1>
            </div>
            <div className="flex items-center gap-4 lg:gap-6">
              <button
                type="button"
                onClick={onBack}
                className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-2xl flex items-center justify-center shadow-3d hover-3d text-brand-dark/60 hover:text-brand-primary shrink-0"
              >
                <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl lg:text-3xl font-display font-bold text-brand-dark">Nueva Factura</h2>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    STATUS_CONFIG[invoiceStatus].bgColor,
                    STATUS_CONFIG[invoiceStatus].color
                  )}>
                    {invoiceStatus}
                  </span>
                </div>
                {uuid && (
                  <p className="text-brand-dark/50 font-mono text-xs mt-1">
                    UUID: {uuid}
                    <button type="button" onClick={handleCopiarUUID} className="ml-2 text-brand-primary hover:underline">
                      <Copy className="w-3 h-3 inline" />
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 bg-white/50 p-2 rounded-2xl border border-brand-dark/5 shadow-sm w-full lg:w-auto overflow-x-auto scrollbar-hide">
            <StepIndicator current={step} step={1} label="Emisor" />
            <div className="w-4 lg:w-8 h-px bg-brand-dark/10 shrink-0" />
            <StepIndicator current={step} step={2} label="Conceptos" />
            <div className="w-4 lg:w-8 h-px bg-brand-dark/10 shrink-0" />
            <StepIndicator current={step} step={3} label="Pago" />
          </div>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 lg:space-y-8 pb-12 lg:pb-0">
          {/* Step 1: Emisor & Receptor */}
          {step === 1 && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="space-y-6 lg:space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Emisor Card */}
                <div className="glass p-6 lg:p-8 rounded-[32px] shadow-3d relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-primary" />
                  <h3 className="text-lg lg:text-xl font-display font-bold text-brand-dark mb-6 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                    Datos del Emisor
                  </h3>
                  <div className="space-y-4">
                    <InputField label="RFC" {...register("rfcEmisor")} error={errors.rfcEmisor?.message} disabled />
                    <InputField label="Nombre o Razón Social" {...register("nombreEmisor")} error={errors.nombreEmisor?.message} disabled />
                    <InputField label="Email" {...register("emailEmisor")} error={errors.emailEmisor?.message} disabled />
                    <SelectField label="Régimen Fiscal" {...register("regimenFiscalEmisor")} options={REGIMENES_FISCALES} disabled />
                  </div>
                </div>

                {/* Receptor Card */}
                <div className="glass p-6 lg:p-8 rounded-[32px] shadow-3d relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-gold" />
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                    <h3 className="text-lg lg:text-xl font-display font-bold text-brand-dark flex items-center gap-2">
                      <Users className="w-5 h-5 text-brand-gold" />
                      Datos del Receptor
                    </h3>
                    {clients.length > 0 && (
                      <select
                        value={selectedClientId}
                        onChange={(e) => handleSelectClient(e.target.value)}
                        className="text-sm bg-brand-gold/10 border border-brand-gold/20 rounded-xl py-2 px-3 text-brand-dark font-bold focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
                      >
                        <option value="">+ Seleccionar cliente</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.Nombre || client.nombre} ({client.RFC || client.rfc})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="space-y-4">
                    <InputField label="RFC Receptor" {...register("rfcReceptor")} placeholder="XAXX010101000" error={errors.rfcReceptor?.message} />
                    <InputField label="Nombre o Razón Social" {...register("nombreReceptor")} placeholder="CLIENTE EJEMPLO S.A." error={errors.nombreReceptor?.message} />

                    {/* Dirección */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField label="Calle" {...register("calleReceptor")} placeholder="Av. Insurgentes Sur" />
                      <InputField label="No. Ext" {...register("numeroExtReceptor")} placeholder="123" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField label="No. Int" {...register("numeroIntReceptor")} placeholder="Int. 4B" />
                      <InputField label="Colonia" {...register("coloniaReceptor")} placeholder="Centro" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <InputField label="Municipio" {...register("municipioReceptor")} placeholder="Coyoacán" />
                      <InputField label="Estado" {...register("estadoReceptor")} placeholder="CDMX" />
                      <InputField label="País" {...register("paisReceptor")} placeholder="México" />
                    </div>

                    {/* CP, Email, Teléfono */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <InputField label="CP Domicilio Fiscal" {...register("domicilioFiscalReceptor")} placeholder="00000" error={errors.domicilioFiscalReceptor?.message} />
                      <InputField label="Email" {...register("emailReceptor")} placeholder="cliente@email.com" />
                      <InputField label="Teléfono" {...register("telefonoReceptor")} placeholder="55 1234 5678" />
                    </div>

                    {/* Régimen y Uso CFDI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SelectField label="Régimen Fiscal" {...register("regimenFiscalReceptor")} options={REGIMENES_FISCALES} />
                      <SelectField label="Uso de CFDI" {...register("usoCFDI")} options={USOS_CFDI} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full lg:w-auto bg-brand-dark text-white px-10 py-4 rounded-2xl font-bold hover:bg-brand-primary transition-all shadow-3d hover-3d active:scale-95"
                >
                  Siguiente: Conceptos
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Conceptos */}
          {step === 2 && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="space-y-6 lg:space-y-8"
            >
              <div className="glass p-6 lg:p-8 rounded-[32px] shadow-3d">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                  <h3 className="text-lg lg:text-xl font-display font-bold text-brand-dark">Conceptos</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOcrScannerOpen(true)}
                      className="flex items-center justify-center gap-2 text-emerald-600 font-bold bg-emerald-100 hover:bg-emerald-200 px-4 py-3 rounded-xl transition-all text-sm lg:text-base"
                    >
                      <ScanLine className="w-5 h-5" />
                      Escanear OCR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenIvaTabulator()}
                      className="flex items-center justify-center gap-2 text-brand-gold font-bold bg-brand-gold/10 hover:bg-brand-gold/20 px-4 py-3 rounded-xl transition-all text-sm lg:text-base"
                    >
                      <Percent className="w-5 h-5" />
                      Tabulador IVA
                    </button>
                    <button
                      type="button"
                      onClick={() => append({ claveProdServ: "80101500", cantidad: 1, claveUnidad: "E48", descripcion: "", valorUnitario: 0, objetoImp: "02" })}
                      className="flex items-center justify-center gap-2 text-brand-primary font-bold bg-brand-primary/5 hover:bg-brand-primary/10 px-4 py-3 rounded-xl transition-all text-sm lg:text-base"
                    >
                      <Plus className="w-5 h-5" />
                      Agregar Concepto
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {fields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="p-4 sm:p-6 bg-brand-light/50 rounded-2xl border border-brand-dark/5 relative group"
                    >
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-white text-red-500 rounded-full shadow-md flex items-center justify-center lg:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                        {/* Product selector + SAT key */}
                        <div className="lg:col-span-5 space-y-3">
                          {products.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">Producto Guardado</label>
                              <select
                                value={selectedProductId}
                                onChange={(e) => handleSelectProduct(e.target.value, index)}
                                className="w-full bg-brand-primary/5 border border-brand-primary/10 rounded-xl py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-semibold text-brand-dark appearance-none cursor-pointer"
                              >
                                <option value="">+ Seleccionar producto</option>
                                {products.map((prod) => (
                                  <option key={prod.id} value={prod.id}>
                                    {prod.Nombre || prod.nombre} — ${(parseFloat(prod.PrecioUnitario || prod.precioUnitario || prod.precio || 0)).toFixed(2)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <SelectField label="Clave SAT" {...register(`items.${index}.claveProdServ`)} options={PRODUCTOS_SERVICIOS} />
                        </div>
                        <div className="lg:col-span-1">
                          <InputField label="Cantidad" type="number" step="any" {...register(`items.${index}.cantidad`, { valueAsNumber: true })} />
                        </div>
                        <div className="lg:col-span-2">
                          <SelectField label="Unidad" {...register(`items.${index}.claveUnidad`)} options={UNIDADES_MEDIDA} />
                        </div>
                        <div className="lg:col-span-2">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">Precio Unitario</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                step="any"
                                {...register(`items.${index}.valorUnitario`, { valueAsNumber: true })}
                                className="w-full bg-white/50 border border-brand-dark/5 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-semibold text-brand-dark placeholder:text-brand-dark/20"
                              />
                              <button
                                type="button"
                                onClick={() => handleOpenIvaTabulator(index)}
                                className="px-3 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold rounded-xl flex items-center justify-center transition-all shrink-0"
                                title="Calcular con IVA"
                              >
                                <Percent className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="lg:col-span-2">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">Importe</label>
                            <div className="bg-white/50 border border-brand-dark/5 rounded-xl py-3 px-4 font-bold text-brand-dark">
                              ${(watch(`items.${index}.cantidad`) * watch(`items.${index}.valorUnitario`)).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-12">
                          <InputField label="Descripción" {...register(`items.${index}.descripcion`)} placeholder="Descripción detallada..." />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="bg-white text-brand-dark px-10 py-4 rounded-2xl font-bold hover:bg-brand-light transition-all shadow-3d hover-3d active:scale-95 order-2 sm:order-1"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-brand-dark text-white px-10 py-4 rounded-2xl font-bold hover:bg-brand-primary transition-all shadow-3d hover-3d active:scale-95 order-1 sm:order-2"
                >
                  Siguiente: Pago
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Pago y Totales */}
          {step === 3 && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="space-y-6 lg:space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                  <div className="glass p-6 lg:p-8 rounded-[32px] shadow-3d">
                    <h3 className="text-xl font-display font-bold text-brand-dark mb-6">Información de Pago</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <SelectField label="Forma de Pago" {...register("formaPago")} options={FORMAS_PAGO} />
                      <SelectField label="Método de Pago" {...register("metodoPago")} options={METODOS_PAGO} />
                      <InputField label="Moneda" {...register("moneda")} disabled />
                      <InputField label="Tipo de Comprobante" value="Ingreso" disabled />
                    </div>
                  </div>

                  <div className="bg-brand-primary/5 p-6 rounded-[24px] border border-brand-primary/10 flex items-start gap-4">
                    <Info className="w-6 h-6 text-brand-primary shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-brand-dark/70 leading-relaxed mb-4">
                        Flujo de timbrado:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleSubmit(handleGenerar)}
                          disabled={invoiceStatus !== 'BORRADOR' || isSubmitting}
                          className={cn(
                            "px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all",
                            invoiceStatus === 'GENERADA' || invoiceStatus === 'FIRMADA' || invoiceStatus === 'TIMBRADA'
                              ? "bg-emerald-100 text-emerald-700"
                              : invoiceStatus === 'BORRADOR'
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                : "bg-brand-dark/5 text-brand-dark/30 cursor-not-allowed"
                          )}
                        >
                          {invoiceStatus === 'GENERADA' || invoiceStatus === 'FIRMADA' || invoiceStatus === 'TIMBRADA' ? <CheckCircle2 className="w-4 h-4" /> : <FileSignature className="w-4 h-4" />}
                          1. Generar
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmit(handleFirmar)}
                          disabled={invoiceStatus !== 'GENERADA' || isSubmitting}
                          className={cn(
                            "px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all",
                            invoiceStatus === 'FIRMADA' || invoiceStatus === 'TIMBRADA'
                              ? "bg-emerald-100 text-emerald-700"
                              : invoiceStatus === 'GENERADA'
                                ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                : "bg-brand-dark/5 text-brand-dark/30 cursor-not-allowed"
                          )}
                        >
                          {invoiceStatus === 'FIRMADA' || invoiceStatus === 'TIMBRADA' ? <CheckCircle2 className="w-4 h-4" /> : <FileSignature className="w-4 h-4" />}
                          2. Firmar
                        </button>
                        <button
                          type="button"
                          disabled={invoiceStatus !== 'FIRMADA' || !pacConfigured || timbrando}
                          onClick={handleSubmit(handleTimbrar)}
                          className={cn(
                            "px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all",
                            invoiceStatus === 'TIMBRADA'
                              ? "bg-emerald-100 text-emerald-700"
                              : invoiceStatus === 'FIRMADA' && pacConfigured
                                ? "bg-brand-primary text-white hover:bg-brand-primary/90"
                                : "bg-brand-dark/5 text-brand-dark/30 cursor-not-allowed"
                          )}
                        >
                          {timbrando ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Timbrando...</>
                          ) : invoiceStatus === 'TIMBRADA' ? (
                            <><CheckCircle2 className="w-4 h-4" /> Timbrado</>
                          ) : (
                            <><Send className="w-4 h-4" /> 3. Timbrar</>
                          )}
                        </button>
                      </div>
                      {!pacConfigured && invoiceStatus === 'FIRMADA' && (
                        <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Configura tu PAC en Settings para timbrar
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <div className="glass p-6 lg:p-8 rounded-[32px] shadow-3d lg:sticky lg:top-8">
                    <h3 className="text-xl font-display font-bold text-brand-dark mb-8 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-brand-primary" />
                      Resumen
                    </h3>

                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between text-brand-dark/60 font-semibold">
                        <span>Subtotal</span>
                        <span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-brand-dark/60 font-semibold">
                        <span>IVA (16%)</span>
                        <span>${iva.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="pt-4 border-t border-brand-dark/5 flex justify-between text-xl lg:text-2xl font-display font-bold text-brand-dark">
                        <span>Total</span>
                        <span className="text-brand-primary">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || (invoiceStatus !== 'TIMBRADA' && invoiceStatus !== 'BORRADOR' && invoiceStatus !== 'GENERADA')}
                      className={cn(
                        "w-full text-white py-5 rounded-2xl font-bold text-lg shadow-3d hover-3d transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70",
                        invoiceStatus === 'TIMBRADA'
                          ? "bg-emerald-500 hover:bg-emerald-600"
                          : "bg-brand-dark hover:bg-brand-primary",
                        isSubmitting && "animate-pulse"
                      )}
                    >
                      {invoiceStatus === 'TIMBRADA' ? (
                        <><Download className="w-6 h-6" /> Descargar XML</>
                      ) : isSubmitting ? (
                        <><Loader2 className="w-6 h-6 animate-spin" /> Procesando...</>
                      ) : invoiceStatus === 'BORRADOR' ? (
                        <><Save className="w-6 h-6" /> Generar CFDI</>
                      ) : invoiceStatus === 'GENERADA' ? (
                        <><FileSignature className="w-6 h-6" /> Firmar y Continuar</>
                      ) : invoiceStatus === 'FIRMADA' ? (
                        <><Send className="w-6 h-6" /> Enviar a Timbrar</>
                      ) : (
                        <><Save className="w-6 h-6" /> Continuar</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full lg:w-auto bg-white text-brand-dark px-10 py-4 rounded-2xl font-bold hover:bg-brand-light transition-all shadow-3d hover-3d active:scale-95"
                >
                  Anterior
                </button>
              </div>

              <div className="border-t border-brand-dark/10 pt-6">
                <h4 className="text-sm font-bold text-brand-dark/60 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Acciones Adicionales
                </h4>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={handleSubmit(handleSavePending)}
                    disabled={savingPending}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all disabled:opacity-50"
                  >
                    {savingPending ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
                    ) : (
                      <><Clock className="w-5 h-5" /> Guardar como Pendiente</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit(handleGeneratePDF)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-brand-dark text-white rounded-xl font-bold hover:bg-brand-dark/90 transition-all"
                  >
                    <FileDown className="w-5 h-5" />
                    Generar PDF
                  </button>
                </div>
                <p className="text-xs text-brand-dark/50 mt-3 text-center">
                  Guardar como pendiente te permite timbrar después y generar el PDF sin costo
                </p>
              </div>
            </motion.div>
          )}
        </form>
      </div>

      {/* IVA Tabulator Modal */}
      <IVATabulator
        isOpen={ivaTabulatorOpen}
        onClose={() => setIvaTabulatorOpen(false)}
        onApply={handleApplyIvaTabulator}
        ivaRate={0.16}
      />

      {/* OCR Scanner Modal */}
      <OCRScanner
        isOpen={ocrScannerOpen}
        onClose={() => setOcrScannerOpen(false)}
        onExtractData={handleExtractedOCRData}
        userRegimen={userRegimen}
      />
    </div>
  );
}

function StepIndicator({ current, step, label }: { current: number, step: number, label: string }) {
  const isActive = current === step;
  const isCompleted = current > step;

  return (
    <div className="flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-2 shrink-0">
      <div className={cn(
        "w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center font-bold text-xs lg:text-sm transition-all shrink-0",
        isActive ? "bg-brand-primary text-white shadow-lg scale-110" :
          isCompleted ? "bg-emerald-500 text-white" : "bg-brand-dark/5 text-brand-dark/30"
      )}>
        {isCompleted ? <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5" /> : step}
      </div>
      <span className={cn(
        "text-xs lg:text-sm font-bold transition-all whitespace-nowrap",
        isActive ? "text-brand-dark" : "text-brand-dark/30"
      )}>
        {label}
      </span>
    </div>
  );
}

const InputField = ({ label, error, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">{label}</label>
    <input
      {...props}
      className={cn(
        "w-full bg-white/50 border border-brand-dark/5 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-semibold text-brand-dark placeholder:text-brand-dark/20",
        error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
        props.disabled && "opacity-60 cursor-not-allowed bg-brand-dark/5"
      )}
    />
    {error && <p className="text-xs text-red-500 font-bold ml-1">{error}</p>}
  </div>
);

const SelectField = ({ label, options, error, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <select
        {...props}
        className={cn(
          "w-full bg-white/50 border border-brand-dark/5 rounded-xl py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-semibold text-brand-dark appearance-none",
          error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
          props.disabled && "opacity-60 cursor-not-allowed bg-brand-dark/5"
        )}
      >
        <option value="">Seleccionar...</option>
        {options.map((opt: any) => (
          <option key={opt.code} value={opt.code}>{opt.code} - {opt.description}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/30 pointer-events-none" />
    </div>
    {error && <p className="text-xs text-red-500 font-bold ml-1">{error}</p>}
  </div>
);
