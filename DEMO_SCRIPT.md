# 🎯 Demo Script - My Conta-AI Facturador

## Preparación (Antes de la Demo)

### 1. Verificar que todo esté corriendo
```bash
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# Ollama: http://localhost:11434
```

### 2. Comandos de Verificación
```bash
# Verificar Ollama
ollama list

# Debe mostrar:
# NAME                   ID              SIZE      MODIFIED
# llama3.2:3b-instruct-q4_K_M    xxxxx    1.7 GB    Now
```

### 3. Abrir la App
- URL: http://localhost:3000
- Iniciar sesión (cualquier email/password)
- Ignorar wizard de CSD por ahora

---

## 🎬 Guión de la Demo

### Escena 1: Presentación del Dashboard (2 min)

**Tú:** "Este es el panel principal de My Conta-AI. Como puedes ver:"

- **Total Facturado**: $124,500.00
- **Facturas Emitidas**: 48
- **Clientes Activos**: 12

**Tú:** "Pero lo interesante es el asistente de IA en la esquina inferior derecha..."

---

### Escena 2: Demo de Navegación por Voz (3 min)

**Tú:** "Voy a pedirle que me lleve a la sección de clientes..."

*[Abres el chat de IA]*

**Tú escribes:** "Necesito registrar un nuevo cliente"

**IA responde:** "Claro, te llevo a la sección de clientes para que lo agregues."

*[La pantalla cambia automáticamente a Clientes]*

**Tú:** "¿Viste eso? La IA no solo responde, **controla la aplicación**."

---

### Escena 3: Contexto Vivo (3 min)

**Tú:** "Ahora le voy a preguntar sobre el estado del negocio..."

**Tú escribes:** "¿Cómo voy este mes?"

**IA responde:** "¡Excelente! Llevas $124,500.00 facturados con 48 facturas emitidas y 12 clientes activos. ¿Quieres emitir la factura 49 ahora mismo?"

**Tú:** "La IA **sabe** lo que veo en pantalla porque le inyectamos contexto en tiempo real."

---

### Escena 4: Dudas Fiscales (2 min)

**Tú:** "Un cliente me pregunta la diferencia entre PUE y PPD..."

**Tú escribes:** "¿Qué es PUE?"

**IA responde:** "PUE significa 'Pago en Una Exhibición'. Se usa cuando el cliente paga todo en un solo momento. Es el más común para ventas al contado. Si necesitas cobrar en parcialidades, usarías PPD."

**Tú:** "Experto fiscal integrado, sin buscar en Google."

---

### Escena 5: Creación de Factura (5 min)

**Tú:** "Ahora voy a crear una factura con ayuda de la IA..."

**Tú escribes:** "Ayúdame a crear una factura"

**IA responde:** "Con gusto. Para crear una factura necesitas:
1. Datos del receptor (RFC, nombre, régimen fiscal)
2. Conceptos (productos/servicios)
3. Forma y método de pago

¿Quieres que te lleve al formulario? [NAV:new-invoice]"

*[La pantalla cambia a Nueva Factura]*

**Tú:** "Y desde el formulario puedo timbrar con el PAC configurado."

---

### Escena 6: Cierre (2 min)

**Tú:** "En resumen, My Conta-AI es:"

1. **Facturación CFDI 4.0 completa** - Todo lo que necesitas para timbrar
2. **IA que navega la app** - No solo chat, control real
3. **Contexto vivo** - La IA ve lo que tú ves
4. **Experto fiscal integrado** - SAT, regímenes, impuestos

**Tú:** "¿Qué te gustaría ver a continuación?"

---

## 🧪 Frases Clave para la Demo

### Para impresionar:
- "La IA **no solo responde**, **actúa**"
- "Contexto en tiempo real, no respuestas pregrabadas"
- "Llama 3.2 corriendo **localmente**, sin APIs externas"
- "Tu negocio en un dashboard vivo"

### Para responder objeciones:

**"¿Y si no tengo CSD?"**
- "Puedes usar el sandbox de Solución Factible para pruebas. Las credenciales ya están configuradas."

**"¿Es seguro?"**
- "Todo corre localmente. Tu data no sale de tu computadora hasta que timbras."

**"¿Qué pasa si el SAT cambia algo?"**
- "Actualizamos el system prompt de la IA y los catálogos del SAT."

---

## 🐛 Plan B (Si algo falla)

### Si Ollama no responde:
```bash
ollama serve
# En otra terminal:
ollama run llama3.2:3b-instruct-q4_K_M
```

### Si la navegación automática falla:
- La IA aún responde correctamente
- Solo menciona: "La navegación automática está en beta, pero la IA sí sabe a dónde ir"

### Si el PAC no conecta:
- Usa las credenciales actualizadas:
  - Usuario: `testing@solucionfactible.com`
  - Password: `timbrado.SF.16672`

---

## 📊 Stats para Mostrar

### Dashboard (hardcodeado para demo):
```javascript
{
  total: "$124,500.00",
  emitidas: 48,
  clientes: 12
}
```

### Para cambiar los stats (en Dashboard.tsx):
```javascript
const stats = [
  { label: "Total Facturado", value: "$250,000.00", change: "+25%" },
  { label: "Facturas Emitidas", value: "156", change: "+50" },
  { label: "Clientes Activos", value: "34", change: "+12" },
];
```

---

## ✅ Checklist Pre-Demo

- [ ] Ollama corriendo (`ollama list` muestra el modelo)
- [ ] Backend corriendo (`curl http://localhost:3001/api/health`)
- [ ] Frontend corriendo (abrir http://localhost:3000)
- [ ] Navegador limpio (sin tabs distrayendo)
- [ ] Audio/video configurado (si es demo remota)
- [ ] Script impreso o en segunda pantalla

---

## 🎯 Métricas de Éxito de la Demo

1. **El cliente pide probar la IA** → Engagement
2. **El cliente pregunta "¿ya se puede usar?"** → Interés real
3. **El cliente menciona "nuestra empresa necesita..."** → Visualización de uso

---

**¡Éxito en la demo! 🚀**
