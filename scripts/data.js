export const MEASUREMENT_POINTS = {
    // UNIDADES DE NEGOCIO Y PUNTOS DE MEDICIÓN DE DISTRIBUIDORA PAMPEANA
    'Bahía Blanca': [
        { title: 'Bahía Blanca', subtitle: 'Conexión regional'},
        { title: 'Pigüé', subtitle: 'Distribución costera'},
        { title: 'Industrias', subtitle: 'Nodo secundario'},
        { title: 'TGS', subtitle: 'Distribución urbana'}
    ],
    'Buenos Aires Centro': [
        { title: 'Puntos TGS', subtitle: 'Conexión regional'},
        { title: 'Plantas Propias', subtitle: 'Distribución costera'},
        { title: 'Industrias', subtitle: 'Nodo secundario'},
        { title: 'Compresora El Chourrón', subtitle: 'Distribución urbana'}
    ],
    'Buenos Aires Norte': [
        { title: 'CO Chivilcoy', subtitle: 'Conexión regional'},
        { title: 'CO Lobos', subtitle: 'Distribución costera'}
    ],
    'Buenos Aires Sur': [
        { title: 'CO Necochea', subtitle: 'Conexión regional'},
        { title: 'CO Tres Arroyos', subtitle: 'Distribución costera'}
    ],
    'La Pampa': [
        { title: 'Pampeano Norte', subtitle: 'Conexión regional'},
        { title: 'Pampeano Sur', subtitle: 'Distribución costera'},
        { title: 'Medanito', subtitle: 'Nodo secundario'}
    ],
    'La Plata': [
        { title: 'Despacho Pantalla 1', subtitle: 'Conexión regional'},
        { title: 'Despacho Pantalla 2', subtitle: 'Distribución costera'}

    ],
    'Mar del Plata': [
        {
            id: '037-001',
            title: 'Sistema Tandil - MDP',
            subtitle: '037-001',

            nombres: {
                puntoUpstream: 'PM 203 - El Chourron',
                puntoDownstream: 'Invernada L1',
            },

            // 🔥 QUERIES
            queries: {
                pEntradaUp: 'webhmi-model://PM 203 - El Chourron/P-Entrada',
                pEntradaDown: 'webhmi-model://Invernada L1/P-Entrada',
                caudal: 'webhmi-model://PM 203 - El Chourron/Q-Inst'
            },

            // 🔥 CONFIG FÍSICA
            config: {
                D: 0.4572,  // 18pulgadas pasadas a metros
                L: 157900,  // longitud en metros
                Z: 1,       // Factor de compresibilidad promedio
                T: 333,     // Temperatura absoluta promedio (288K = 15°C // 333K = 60°C )
                R: 8.314,   // Constante universal de los gases
                thresholds: {
                    green: 50,
                    yellow: 45
                }
            }
        },
        {
            id: '036-026',
            title: 'Sistema de la Costa',
            subtitle: '036-026',

            nombres: {
                puntoUpstream: 'PM 203 - El Chourron',
                puntoDownstream: 'C E Gesell',
            },

            // 🔥 QUERIES
            queries: {
                pEntradaUp: 'webhmi-model://PM 203 - El Chourron/P-Entrada',
                pEntradaDown: 'webhmi-model://C E Gesell/P-Entrada',
                caudal: 'webhmi-model://PM 203 - El Chourron/Q-Inst'
            },

            // 🔥 CONFIG FÍSICA
            config: {
                D: 0.4572,
                L: 129420,
                Z: 1,
                T: 288,
                R: 8.314,
                thresholds: {
                    green: 50,
                    yellow: 45
                }
            }
        },
        {
            id: '037-091',
            title: 'Sistema Balcarce',
            subtitle: '037-091',

            nombres: {
                puntoUpstream: 'Balcarce I',
                puntoDownstream: 'La Susana',
            },

            // 🔥 QUERIES
            queries: {
                pEntradaUp: 'webhmi-model://Balcarce I/P-Entrada',
                pEntradaDown: 'webhmi-model://La Susana/P-Entrada',
                caudal: 'webhmi-model://PM 203 - El Chourron/Q-Inst'
            },

            // 🔥 CONFIG FÍSICA
            config: {
                D: 0.4572,
                L: 129420,
                Z: 1,
                T: 288,
                R: 8.314,
                thresholds: {
                    green: 50,
                    yellow: 45
                }
            }
        },
        {
            id: '036-032',
            title: 'Sistema MDP Ciudad',
            subtitle: '036-032',

            nombres: {
                puntoUpstream: 'PM 203 - El Chourron',
                puntoDownstream: 'Central 9 de Julio',
            },


            // 🔥 QUERIES
            queries: {
                pEntradaUp: 'webhmi-model://PM 203 - El Chourron/P-Entrada',
                pEntradaDown: 'webhmi-model://Central 9 de Julio/P-Entrada',
                caudal: 'webhmi-model://PM 203 - El Chourron/Q-Inst'
            },

            // 🔥 CONFIG FÍSICA
            config: {
                D: 0.4572,
                L: 129420,
                Z: 1,
                T: 288,
                R: 8.314,
                thresholds: {
                    green: 50,
                    yellow: 45
                }
            }
        }
    ],

    // UNIDADES DE NEGOCIO Y PUNTOS DE MEDICIÓN DE DISTRIBUIDORA DEL SUR
    'Andina': [
        { title: '088 - Cordillerano', subtitle: 'Conexión regional'}
    ],
    'Comodoro Rivadavia': [
        { title: 'Comodoro Rivadavia', subtitle: 'Conexión regional'},
        { title: 'Despacho Comodoro Rivadavia', subtitle: 'Distribución costera'}
    ],
    'De los Lagos': [
        { title: 'Cordillero Patagónico', subtitle: 'Conexión regional'},
        { title: 'Región Sur', subtitle: 'Distribución costera'},
        { title: 'Puntos de Medición Iridium', subtitle: 'Nodo secundario'}
    ],
    'Del Comahue': [
        { title: 'Del Comahue 1- Zona 1 - Neuquén', subtitle: 'Conexión regional'},
        { title: 'Del Comahue 1 - Zona 2 - Río Negro', subtitle: 'Distribución costera'},
        { title: 'Del Comahue 2', subtitle: 'Nodo secundario'},
        { title: 'Del Comahue 3', subtitle: 'Distribución urbana'},
        { title: 'Del Comahue 4', subtitle: 'Distribución urbana'}
    ],
    'Patagonia Norte': [
        { title: 'Patagonia Norte', subtitle: 'Conexión regional'}
    ],
    'Península': [
        { title: 'Península', subtitle: 'Conexión regional'}
    ],
    'Santa Cruz Sur': [
        { title: 'Santa Cruz Sur', subtitle: 'Conexión regional'}
    ],
    'Tierra del Fuego': [
        { title: 'Sistema Fueguino', subtitle: 'Conexión regional'}
    ],
};