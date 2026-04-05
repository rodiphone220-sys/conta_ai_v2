import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';
const DATA_DIR = path.join(process.cwd(), 'data');

// ============ TIPOS ============
export interface Client {
  id: string;
  rfc: string;
  nombre: string;
  email?: string;
  telefono?: string;
  regimenFiscal?: string;
  usoCFDI?: string;
  metodoPago?: string;
  direccion: {
    calle?: string;
    numeroExt?: string;
    numeroInt?: string;
    colonia?: string;
    municipio?: string;
    estado?: string;
    pais?: string;
    cp?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  folio: string;
  serie: string;
  clienteId: string;
  clienteNombre?: string;
  clienteRFC?: string;
  fecha: string;
  subtotal: number;
  impuestos: number;
  total: number;
  xml?: string;
  status: 'pending' | 'timber' | 'canceled';
  emisor?: any;
  receptor?: any;
  conceptos?: any[];
  createdAt: string;
  updatedAt?: string;
}

// ============ GOOGLE SCRIPT SERVICE ============
class GoogleScriptService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = GOOGLE_SCRIPT_URL;
  }

  async call<T = any>(action: string, data?: Record<string, any>): Promise<T> {
    try {
      const formData = new URLSearchParams();
      formData.append('action', action);
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        });
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const text = await response.text();
      const result = JSON.parse(text);
      
      if (result.success === false) {
        throw new Error(result.error || 'Error en Google Script');
      }
      
      return result.data || result;
    } catch (error: any) {
      console.error(`[GoogleScript] Error calling ${action}:`, error);
      throw error;
    }
  }

  // ============ CLIENTES ============
  async saveClient(client: Client): Promise<any> {
    return this.call('saveClient', client);
  }

  async getClients(userId?: string): Promise<Client[]> {
    return this.call('getClients', { userId });
  }

  async getClient(rfc: string, userId?: string): Promise<Client | null> {
    const clients = await this.getClients(userId);
    const found = clients.find((c: any) => 
      (c as any).RFC === rfc || (c as any).rfc === rfc || (c as any).ID === rfc
    );
    return found || null;
  }

  // ============ FACTURAS ============
  async saveInvoice(invoice: Invoice): Promise<any> {
    return this.call('saveInvoice', invoice);
  }

  async getInvoices(userId?: string): Promise<Invoice[]> {
    return this.call('getInvoices', { userId });
  }

  async getInvoice(id: string, userId?: string): Promise<Invoice | null> {
    const invoices = await this.getInvoices(userId);
    const found = invoices.find((inv: any) => inv.ID === id || inv.id === id);
    return found || null;
  }

  // ============ PDF A DRIVE ============
  async savePdfToDrive(base64: string, serie: string, folio: string, userFolderId?: string): Promise<any> {
    return this.call('savePdfToDrive', { pdfBase64: base64, serie, folio, userFolderId });
  }

  // ============ EMPRESA ============
  async getCompanyData(userId?: string): Promise<any> {
    return this.call('getCompanyData', { userId });
  }

  async saveCompanyData(data: any): Promise<any> {
    return this.call('saveCompanyData', data);
  }

  // ============ CONSULTA RFC ============
  async consultaRFC(rfc: string): Promise<any> {
    return this.call('consultaRFC', { rfc });
  }

  // ============ CARPETA DE USUARIO ============
  async createUserFolder(userId: string, userName: string, email: string): Promise<{
    userFolderId: string;
    userFolderUrl: string;
    subfolders: Record<string, string>;
    message: string;
  }> {
    return this.call('createUserFolder', { userId, userName, email });
  }

  // ============ USUARIOS ============
  async createUser(data: { userId: string; email: string; name: string; googleId?: string; driveFolderId?: string; driveFolderUrl?: string }): Promise<any> {
    return this.call('createUser', data);
  }

  async getUser(email: string): Promise<any> {
    return this.call('getUser', { email });
  }

  async updateUserRFC(email: string, rfc: string, nombreEmpresa: string): Promise<any> {
    return this.call('updateUserRFC', { email, rfc, nombreEmpresa });
  }
}

export const googleScript = new GoogleScriptService();

// ============ ALMACENAMIENTO LOCAL (FALLBACK) ============
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

class LocalStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = DATA_DIR;
    this.ensureStructure();
  }

  private ensureStructure() {
    ensureDir(path.join(this.baseDir, 'users'));
    ensureDir(path.join(this.baseDir, 'clients'));
    ensureDir(path.join(this.baseDir, 'invoices'));
    ensureDir(path.join(this.baseDir, 'xml'));
    ensureDir(path.join(this.baseDir, 'pdf'));
  }

  private getUserDir(userId: string): string {
    const userDir = path.join(this.baseDir, 'users', userId);
    ensureDir(userDir);
    ensureDir(path.join(userDir, 'clients'));
    ensureDir(path.join(userDir, 'invoices'));
    ensureDir(path.join(userDir, 'xml'));
    ensureDir(path.join(userDir, 'pdf'));
    return userDir;
  }

  // ============ CLIENTES ============
  async saveClientLocal(userId: string, client: Client): Promise<{ success: boolean; error?: string }> {
    try {
      const userDir = this.getUserDir(userId);
      const clientsDir = path.join(userDir, 'clients');
      
      const clientFile = path.join(clientsDir, `${client.id}.json`);
      fs.writeFileSync(clientFile, JSON.stringify(client, null, 2));
      
      // Guardar índice
      await this.updateClientIndex(userId, client);
      
      // También guardar en Google Script
      try {
        await googleScript.saveClient(client);
      } catch (e) {
        console.log('[LocalStorage] Google Script no disponible, guardado solo local');
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async updateClientIndex(userId: string, client: Client): Promise<void> {
    const userDir = this.getUserDir(userId);
    const indexFile = path.join(userDir, 'clients', '_index.json');
    
    let index: Client[] = [];
    if (fs.existsSync(indexFile)) {
      try {
        index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
      } catch (e) {}
    }
    
    const existingIdx = index.findIndex(c => c.id === client.id);
    if (existingIdx >= 0) {
      index[existingIdx] = client;
    } else {
      index.push(client);
    }
    
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  }

  async getClientsLocal(userId: string): Promise<Client[]> {
    try {
      const indexFile = path.join(this.baseDir, 'users', userId, 'clients', '_index.json');
      if (!fs.existsSync(indexFile)) return [];
      
      return JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
    } catch (error) {
      return [];
    }
  }

  async getClientLocal(userId: string, clientId: string): Promise<Client | null> {
    try {
      const clientFile = path.join(this.baseDir, 'users', userId, 'clients', `${clientId}.json`);
      if (!fs.existsSync(clientFile)) return null;
      
      return JSON.parse(fs.readFileSync(clientFile, 'utf-8'));
    } catch (error) {
      return null;
    }
  }

  async deleteClientLocal(userId: string, clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const clientFile = path.join(this.baseDir, 'users', userId, 'clients', `${clientId}.json`);
      if (fs.existsSync(clientFile)) {
        fs.unlinkSync(clientFile);
      }
      
      // Actualizar índice
      const indexFile = path.join(this.baseDir, 'users', userId, 'clients', '_index.json');
      if (fs.existsSync(indexFile)) {
        let index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
        index = index.filter((c: Client) => c.id !== clientId);
        fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ============ FACTURAS ============
  async saveInvoiceLocal(userId: string, invoice: Invoice, saveXmlLocal: boolean = true, savePdfLocal: boolean = true): Promise<{ success: boolean; error?: string; xmlPath?: string; pdfPath?: string }> {
    try {
      const userDir = this.getUserDir(userId);
      const invoicesDir = path.join(userDir, 'invoices');
      
      const invoiceFile = path.join(invoicesDir, `${invoice.id}.json`);
      fs.writeFileSync(invoiceFile, JSON.stringify(invoice, null, 2));
      
      let xmlPath: string | undefined;
      let pdfPath: string | undefined;
      
      if (saveXmlLocal && invoice.xml) {
        const xmlDir = path.join(userDir, 'xml');
        xmlPath = path.join(xmlDir, `${invoice.folio}.xml`);
        fs.writeFileSync(xmlPath, invoice.xml);
      }
      
      if (savePdfLocal && invoice.xml) {
        // El PDF se genera del XML, por ahora guardamos referencia
        const pdfDir = path.join(userDir, 'pdf');
        pdfPath = path.join(pdfDir, `${invoice.folio}.pdf`);
        // En una implementación real, aquí se generaría el PDF
      }
      
      // Guardar en Google Script
      try {
        await googleScript.saveInvoice(invoice);
      } catch (e) {
        console.log('[LocalStorage] Google Script no disponible para factura');
      }
      
      return { success: true, xmlPath, pdfPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getInvoicesLocal(userId: string): Promise<Invoice[]> {
    try {
      const invoicesDir = path.join(this.baseDir, 'users', userId, 'invoices');
      if (!fs.existsSync(invoicesDir)) return [];
      
      const files = fs.readdirSync(invoicesDir).filter(f => f.endsWith('.json'));
      const invoices: Invoice[] = [];
      
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(invoicesDir, file), 'utf-8');
          invoices.push(JSON.parse(content));
        } catch (e) {}
      }
      
      return invoices.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    } catch (error) {
      return [];
    }
  }

  async getInvoiceLocal(userId: string, invoiceId: string): Promise<Invoice | null> {
    try {
      const invoiceFile = path.join(this.baseDir, 'users', userId, 'invoices', `${invoiceId}.json`);
      if (!fs.existsSync(invoiceFile)) return null;
      
      return JSON.parse(fs.readFileSync(invoiceFile, 'utf-8'));
    } catch (error) {
      return null;
    }
  }

  async getPendingInvoicesLocal(userId: string): Promise<Invoice[]> {
    const invoices = await this.getInvoicesLocal(userId);
    return invoices.filter(inv => inv.status === 'pending');
  }

  async deleteInvoiceLocal(userId: string, invoiceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userDir = path.join(this.baseDir, 'users', userId);
      const dirs = ['invoices', 'xml', 'pdf'].map(d => path.join(userDir, d));
      
      for (const dir of dirs) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            if (file.includes(invoiceId) || file.endsWith('.json')) {
              try {
                const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
                if (content.id === invoiceId) {
                  fs.unlinkSync(path.join(dir, file));
                }
              } catch (e) {}
            }
          }
        }
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ============ ESTADÍSTICAS ============
  async getStatsLocal(userId: string): Promise<{ totalFacturado: number; emitidas: number; pendientes: number; clientes: number }> {
    const invoices = await this.getInvoicesLocal(userId);
    const clients = await this.getClientsLocal(userId);
    
    const issued = invoices.filter(inv => inv.status === 'timber');
    const pending = invoices.filter(inv => inv.status === 'pending');
    
    return {
      totalFacturado: issued.reduce((sum, inv) => sum + inv.total, 0),
      emitidas: issued.length,
      pendientes: pending.length,
      clientes: clients.length
    };
  }
}

export const localStorage = new LocalStorageService();

// ============ GENERAR ID ÚNICO ============
export function generateId(prefix: string = 'ID'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}
