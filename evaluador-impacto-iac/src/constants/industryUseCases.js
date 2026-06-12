/** Referencias de casos de uso por industria (contexto para IA y fallback). */
export const SECTORS = [
  'Banca y fintech',
  'Retail y e-commerce',
  'Salud',
  'Manufactura',
  'Logística y transporte',
  'Servicios profesionales',
  'Seguros',
  'Telecomunicaciones',
  'Educación',
  'Gobierno y sector público',
  'Otro',
]

export const TOOL_OPTIONS = [
  'Excel / hojas de cálculo',
  'Correo electrónico',
  'WhatsApp / mensajería',
  'Formularios en papel',
  'ERP (SAP, Oracle, etc.)',
  'CRM (Salesforce, HubSpot, etc.)',
  'SharePoint / carpetas compartidas',
  'Sistemas propios / legacy',
  'Sin herramienta formal',
]

export const SYSTEM_OPTIONS = [
  'ERP',
  'CRM',
  'Core bancario',
  'HCM / nómina',
  'Data warehouse / BI',
  'Plataforma de firma electrónica',
  'Motor de reglas / BPM',
  'Ninguno integrado',
]

export const INDUSTRY_HINTS = {
  'Banca y fintech': [
    'Onboarding digital con validación de identidad (KYC/AML)',
    'Automatización de apertura de productos y scoring crediticio',
  ],
  'Retail y e-commerce': [
    'Conciliación de pedidos y devoluciones entre canales',
    'Validación de inventario y surtido en tiempo real',
  ],
  Salud: [
    'Agendamiento y recordatorios de citas',
    'Validación de autorizaciones y historias clínicas',
  ],
  Manufactura: [
    'Órdenes de compra y recepción de materiales',
    'Control de calidad y trazabilidad de lote',
  ],
  'Logística y transporte': [
    'Asignación de rutas y POD digital',
    'Conciliación de tarifas y facturación a transportistas',
  ],
  'Servicios profesionales': [
    'Timesheet y facturación por proyecto',
    'Vinculación y validación documental de proveedores',
  ],
  Seguros: [
    'Suscripción y emisión de pólizas',
    'Gestión de siniestros y validación de soportes',
  ],
  Telecomunicaciones: [
    'Activación de líneas y portabilidad',
    'Gestión de reclamos Nivel 1 con bots',
  ],
  Educación: [
    'Matrículas y validación de documentos estudiantiles',
    'Certificados y constancias automatizadas',
  ],
  'Gobierno y sector público': [
    'Radicación y trazabilidad de PQRS',
    'Validación de requisitos en trámites ciudadanos',
  ],
  Otro: [
    'Captura estructurada de datos desde correo o PDF',
    'Flujos de aprobación con notificaciones automáticas',
  ],
}
