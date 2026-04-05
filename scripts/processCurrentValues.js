import { MEASUREMENT_POINTS } from './data.js';
import { calcularLinepack } from './calcularLinepack.js';

export function procesarCurrentValues(dataset) {
    // Estructura para almacenar resultados
    const resultado = {};
    // Mapa para relacionar ID con título
    const idTitleMap = {};
    
    // Crear el mapa de ID a título y inicializar estructura
    for (const unidad in MEASUREMENT_POINTS) {
        MEASUREMENT_POINTS[unidad].forEach(p => {
            resultado[p.title] = {
                up: null,
                down: null,
                q: null,
                config: p.config
            };
            
            // Si el punto tiene ID, guardamos la relación
            if (p.id) {
                idTitleMap[p.id] = p.title;
            }
        });
    }

    // Mapear dataset
    dataset.forEach(d => {
        if (!d.name) return;

        const [punto, variable] = d.name.split('/');
        const value = parseFloat(d.value);

        for (const unidad in MEASUREMENT_POINTS) {
            MEASUREMENT_POINTS[unidad].forEach(p => {
                if (!p.nombres) return;

                if (punto === p.nombres.puntoUpstream && variable === 'P-Entrada') {
                    resultado[p.title].up = value;
                }

                if (punto === p.nombres.puntoDownstream && variable === 'P-Entrada') {
                    resultado[p.title].down = value;
                }

                if (punto === p.nombres.puntoUpstream && variable === 'Q-Inst') {
                    resultado[p.title].q = value;
                }
            });
        }
    });

    // Calcular linepack
    const enriched = {};

    for (const title in resultado) {
        const r = resultado[title];

        if (r.up != null && r.down != null) {
            const LP = calcularLinepack(r.up, r.down, r.config);
            
            // Buscar el point en data.js para obtener el ID
            let pointID = null;
            for (const unidad in MEASUREMENT_POINTS) {
                const found = MEASUREMENT_POINTS[unidad].find(p => p.title === title);
                if (found && found.id) {
                    pointID = found.id;
                    break;
                }
            }

            const data = {
                linepack: LP,
                pressure: (r.up + r.down) / 2
            };

            // Guardar datos por título
            enriched[title] = data;
            
            // Si existe un ID para este título, también guardar una referencia al mismo objeto
            if (pointID) {
                enriched[pointID] = data;
            }
        }
    }
    
    return enriched;
}