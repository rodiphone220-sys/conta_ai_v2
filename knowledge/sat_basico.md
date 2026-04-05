# SAT Básico - Guía de Conceptos Fiscales

## Regímenes Fiscales Comunes

### Personas Físicas

| Clave | Descripción | Ideal para |
|-------|-------------|------------|
| **612** | Actividades Empresariales y Profesionales | Freelancers, consultores, dueños de negocios |
| **626** | Régimen Simplificado de Confianza (RESICO) | Pequeños contribuyentes con ingresos < 3.5M anuales |
| **605** | Sueldos y Salarios | Empleados que reciben ingresos adicionales |
| **606** | Arrendamiento | Quienes rentan inmuebles |

### Personas Morales (Empresas)

| Clave | Descripción |
|-------|-------------|
| **601** | General de Ley Personas Morales |
| **603** | Personas Morales con Fines no Lucrativos |
| **621** | Incorporación Fiscal |

## Usos de CFDI (Receptor)

| Clave | Descripción | Cuándo usar |
|-------|-------------|-------------|
| **G01** | Adquisición de mercancías | Compra de productos para reventa |
| **G03** | Gastos en general | **EL MÁS COMÚN** - Gastos operativos |
| **I01** | Construcciones | Obras, remodelaciones |
| **I02** | Mobiliario y equipo | Compra de activos fijos |
| **P01** | Por definir | Cuando no se conoce el uso al momento de facturar |
| **CP01** | Pagos | Complemento de recepción de pagos |

## Formas de Pago

| Código | Descripción |
|--------|-------------|
| **01** | Efectivo |
| **02** | Cheque nominativo |
| **03** | Transferencia electrónica |
| **04** | Tarjeta de crédito |
| **28** | Tarjeta de débito |
| **99** | Por definir |

## Métodos de Pago

| Código | Descripción | Características |
|--------|-------------|-----------------|
| **PUE** | Pago en Una Exhibición | - Se paga todo al momento<br>- No requiere complemento de pago<br>- **Más común para ventas al contado** |
| **PPD** | Pago en Parcialidades o Diferido | - Se paga en múltiples exhibiciones<br>- **Requiere Complemento de Pago (REP)**<br>- Se usa para créditos |

## Impuestos

### IVA (Impuesto al Valor Agregado)

| Tasa | Aplicación |
|------|------------|
| **16%** | Tasa general (la mayoría de los productos y servicios) |
| **8%** | Tasa reducida (región fronteriza norte y sur) |
| **0%** | Tasa cero (alimentos básicos, medicinas, libros) |

### ISR (Impuesto Sobre la Renta)

- **Personas Físicas**: Tabla progresiva (1.92% - 35%)
- **Personas Morales**: 30% sobre utilidad fiscal
- **RESICO**: 1% - 2.5% sobre ingresos (sin deducciones)

## Retenciones Comunes

| Concepto | Tasa | Cuándo aplica |
|----------|------|---------------|
| **ISR Arrendamiento** | 10% | Cuando se factura renta de inmuebles |
| **ISR Honorarios** | 10% | Servicios profesionales a empresas |
| **IVA Retenido** | 10.667% | Servicios digitales (plataformas tecnológicas) |

## Validación de RFC

### Personas Físicas (13 caracteres)
```
Ejemplo: GUGO781110E30
- 4 letras (nombre)
- 6 dígitos (fecha nacimiento: YYMMDD)
- 2 caracteres (homoclave)
- 1 dígito (verificador)
```

### Personas Morales (12 caracteres)
```
Ejemplo: ABC123456T1
- 3 letras (razón social)
- 6 dígitos (fecha constitución: YYMMDD)
- 2 caracteres (homoclave)
- 1 dígito (verificador)
```

## Objetos de Impuesto

| Clave | Descripción |
|-------|-------------|
| **01** | No objeto de impuesto |
| **02** | Sí objeto de impuesto |
| **03** | Sí objeto de impuesto (con retención) |

## Claves de Producto/Servicio (Catálogo SAT)

Las más comunes:

| Clave | Descripción |
|-------|-------------|
| **80101500** | Servicios de consultoría empresarial |
| **81111500** | Servicios de ingeniería de software |
| **84111500** | Servicios de facturación/contabilidad |
| **01010101** | No existe en el catálogo (usar solo si no hay otra opción) |

## Claves de Unidad

| Clave | Descripción | Uso |
|-------|-------------|-----|
| **H87** | Pieza | Productos físicos |
| **E48** | Unidad de servicio | Servicios profesionales |
| **KGM** | Kilogramo | Productos por peso |
| **LTR** | Litro | Líquidos |

## Consejos Prácticos

### Para RESICO (626)
- Factura todos tus ingresos, sin excepción
- No puedes deducir IVA ni ISR
- Máximo $3.5 millones de ingresos anuales
- Si excedes el límite, pasas automáticamente a Régimen General (612)

### Para Actividad Empresarial (612)
- Puedes deducir gastos necesarios para tu actividad
- IVA acreditable vs IVA trasladado
- Declaraciones mensuales (obligatorias)
- Declaración anual (abril-mayo siguiente año)

### Errores Comunes a Evitar
1. RFC del receptor incorrecto → Factura no deducible
2. Uso de CFDI equivocado → Posible multa
3. No validar CSD vigente → Error al timbrar
4. Olvidar complemento de pago (PPD) → Factura no cerrada correctamente
