export interface SATCatalogItem {
  code: string;
  description: string;
}

export const REGIMENES_FISCALES: SATCatalogItem[] = [
  { code: "601", description: "General de Ley Personas Morales" },
  { code: "603", description: "Personas Morales con Fines no Lucrativos" },
  { code: "605", description: "Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { code: "606", description: "Arrendamiento" },
  { code: "612", description: "Personas Físicas con Actividades Empresariales y Profesionales" },
  { code: "621", description: "Incorporación Fiscal" },
  { code: "626", description: "Régimen Simplificado de Confianza" },
];

export const USOS_CFDI: SATCatalogItem[] = [
  { code: "G01", description: "Adquisición de mercancías" },
  { code: "G03", description: "Gastos en general" },
  { code: "I01", description: "Construcciones" },
  { code: "I02", description: "Mobiliario y equipo de oficina por inversiones" },
  { code: "P01", description: "Por definir" },
  { code: "S01", description: "Sin efectos fiscales" },
  { code: "CP01", description: "Pagos" },
];

export const FORMAS_PAGO: SATCatalogItem[] = [
  { code: "01", description: "Efectivo" },
  { code: "02", description: "Cheque nominativo" },
  { code: "03", description: "Transferencia electrónica de fondos" },
  { code: "04", description: "Tarjeta de crédito" },
  { code: "28", description: "Tarjeta de débito" },
  { code: "99", description: "Por definir" },
];

export const METODOS_PAGO: SATCatalogItem[] = [
  { code: "PUE", description: "Pago en una sola exhibición" },
  { code: "PPD", description: "Pago en parcialidades o diferido" },
];

export const UNIDADES_MEDIDA: SATCatalogItem[] = [
  { code: "H87", description: "Pieza" },
  { code: "E48", description: "Unidad de servicio" },
  { code: "KGM", description: "Kilogramo" },
  { code: "LTR", description: "Litro" },
];

export const PRODUCTOS_SERVICIOS: SATCatalogItem[] = [
  { code: "80101500", description: "Servicios de consultoría empresarial" },
  { code: "81111500", description: "Servicios de ingeniería de software" },
  { code: "84111500", description: "Servicios de facturación" },
  { code: "01010101", description: "No existe en el catálogo" },
];
