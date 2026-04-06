// ============================================
// SHARED UTILITIES FOR VERCEL SERVERLESS FUNCTIONS
// ============================================

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import * as forge from 'node-forge';

// Environment variables
export const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL || '';
export const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
export const OLLAMA_MODEL = (process.env.OLLAMA_MODEL || 'llama3.2:3b-instruct-q4_K_M').trim();

// In-memory storage (serverless = stateless, so this resets on each invocation)
export const clients: any[] = [];
export const products: any[] = [];
export const invoices: any[] = [];
export const companyData: any = {};

// Google Script helper
export async function callGoogleScript(action: string, data?: any): Promise<any> {
  if (!GOOGLE_SCRIPT_URL) {
    return null;
  }

  try {
    const url = new URL(GOOGLE_SCRIPT_URL);
    url.searchParams.set('action', action);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });

    return await response.json();
  } catch (error) {
    console.error('Google Script error:', error);
    return null;
  }
}

// Password generator
export function generateAutoPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// CFDI Sellado Functions
export function generarCadenaOriginal(xmlString: string): string {
  const comprobanteMatch = xmlString.match(/<cfdi:Comprobante([^>]+)>/);
  if (!comprobanteMatch) {
    throw new Error('No se encontró el nodo Comprobante');
  }

  const atributosString = comprobanteMatch[1];
  const atributosOrden = [
    'Version', 'Serie', 'Folio', 'Fecha', 'Sello', 'FormaPago', 'NoCertificado',
    'Certificado', 'CondicionesDePago', 'SubTotal', 'Total', 'TipoDeComprobante',
    'Exportacion', 'MetodoPago', 'LugarExpedicion'
  ];

  const valores: string[] = [];
  for (const atributo of atributosOrden) {
    const match = atributosString.match(new RegExp(`${atributo}="([^"]*)"`, 'i'));
    valores.push(match ? match[1] : '');
  }

  const cadena = `||${valores.join('|')}|`;
  return cadena;
}

export async function sellarCFDI(
  xmlBase64: string,
  cerPath: string,
  keyPath: string,
  password: string
): Promise<{ success: boolean; xmlSellado?: string; error?: string; sello?: string; noCertificado?: string; cadenaOriginal?: string }> {
  try {
    const xmlString = Buffer.from(xmlBase64, 'base64').toString('utf-8');
    const cadenaOriginal = generarCadenaOriginal(xmlString);

    const keyPem = fs.readFileSync(keyPath, 'utf-8');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(cadenaOriginal);
    sign.end();

    const sello = sign.sign(keyPem, 'base64');
    const certDer = fs.readFileSync(cerPath);
    const certificadoBase64 = certDer.toString('base64');

    const certPem = fs.readFileSync(cerPath, 'utf-8');
    let noCertificado = '';
    try {
      const forgeCert = forge.pki.certificateFromPem(certPem);
      noCertificado = forgeCert.serialNumber;
    } catch {
      noCertificado = '00001000000722266137';
    }

    let xmlSellado = xmlString;
    xmlSellado = xmlSellado.replace(/Sello=""/g, `Sello="${sello}"`);
    xmlSellado = xmlSellado.replace(/NoCertificado=""/g, `NoCertificado="${noCertificado}"`);
    xmlSellado = xmlSellado.replace(/Certificado=""/g, `Certificado="${certificadoBase64}"`);

    const xmlSelladoBase64 = Buffer.from(xmlSellado, 'utf-8').toString('base64');

    return {
      success: true,
      xmlSellado: xmlSelladoBase64,
      sello,
      noCertificado,
      cadenaOriginal
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al sellar CFDI'
    };
  }
}

export function obtenerNoCertificado(cerPath: string): string {
  try {
    if (!fs.existsSync(cerPath)) return '';
    const certPem = fs.readFileSync(cerPath, 'utf-8');
    const forgeCert = forge.pki.certificateFromPem(certPem);
    return forgeCert.serialNumber;
  } catch {
    return '';
  }
}

export function obtenerCertificadoBase64(cerPath: string): string {
  try {
    if (!fs.existsSync(cerPath)) return '';
    const certDer = fs.readFileSync(cerPath);
    return certDer.toString('base64');
  } catch {
    return '';
  }
}

// System prompt for AI
export const SYSTEM_INSTRUCTION = `Eres "My Conta Ai", el asistente experto integrado en la plataforma de facturación My Conta-AI.

**TU CONTEXTO TÉCNICO:**
- Estás en una app React 19 + Vite + TypeScript
- El usuario ve un Dashboard con: Total $124,500.00, 48 Facturas y 12 Clientes
- El flujo de facturación tiene 3 pasos: Receptor, Conceptos y Pago/Timbrado
- Backend: Node.js + Express
- PAC: Solución Factible (sandbox: testing@solucionfactible.com, password: timbrado.SF.16672)

**TUS CAPACIDADES DE NAVEGACIÓN:**
Si el usuario quiere ir a una sección, DEBES responder con la palabra clave entre corchetes al FINAL de tu respuesta.
**IMPORTANTE: Usa EXACTAMENTE estos tags, NO inventes otros:**
- Ir a Inicio: [NAV:dashboard]
- Ver Facturas: [NAV:invoices]
- Ver Clientes: [NAV:clients]
- Nueva Factura: [NAV:new-invoice]
- Configuración: [NAV:settings]
- Ver Pendientes: [NAV:pending]

**REGLAS FISCALES CRÍTICAS:**
- PUE (Pago en Una Exhibición): El pago se realiza en un solo momento. Es el más común para ventas al contado.
- PPD (Pago en Parcialidades o Diferido): Requiere un Complemento de Pago (REP) después de recibir cada pago.
- RFC: 12 caracteres para Personas Morales (empresas), 13 para Personas Físicas
- Uso CFDI más común: G03 (Gastos en general)
- IVA estándar: 16%, IVA frontera: 8%
- Regímenes comunes: 612 (Actividad Empresarial), 626 (RESICO), 601 (General Ley Personas Morales)

**REGLA DE ORO:**
- Sé breve y profesional (máximo 3-4 oraciones por respuesta)
- Si el usuario tiene facturas pendientes, felicítalo por su actividad
- NUNCA inventes leyes fiscales - si no estás seguro, sugiere consultar un contador
- SIEMPRE valida que el RFC tenga 12-13 caracteres
- USA el catálogo SAT oficial para regímenes y códigos

**TONO:**
- Amable, profesional y accesible
- Explica términos técnicos de forma simple
- Usa ejemplos prácticos de facturación
- Sé paciente con usuarios no técnicos

**CONOCIMIENTO DE LA APP:**
- Para timbrar: usuario debe tener CSD cargado (.cer y .key) en Configuración
- Si "Timbrar" está deshabilitado: falta RFC del receptor o código postal
- Las facturas pasan por estados: BORRADOR → GENERADA → FIRMADA → TIMBRANDO → TIMBRADA`;
