export interface InvoiceItem {
  id: string;
  claveProdServ: string;
  cantidad: number;
  claveUnidad: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  objetoImp: string;
}

export interface InvoiceData {
  rfcEmisor: string;
  nombreEmisor: string;
  regimenFiscalEmisor: string;
  rfcReceptor: string;
  nombreReceptor: string;
  regimenFiscalReceptor: string;
  domicilioFiscalReceptor: string;
  usoCFDI: string;
  formaPago: string;
  metodoPago: string;
  moneda: string;
  tipoComprobante: string;
  items: InvoiceItem[];
  subtotal: number;
  iva: number;
  total: number;
}
