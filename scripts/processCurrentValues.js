import { MEASUREMENT_POINTS } from './data.js';
import { 
    calcularPresionPromedio, 
    calcularLinepack, 
    calcularAutonomia,
    pascalesABares,
    escalarLinepack
} from './calcularLinepack.js';

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

    // Calcular linepack y autonomía usando funciones centralizadas
    const enriched = {};

    for (const title in resultado) {
        const r = resultado[title];

        if (r.up != null && r.down != null) {
            // Usar las funciones centralizadas
            const pressAvg = calcularPresionPromedio(r.up, r.down);
            const LP = calcularLinepack(pressAvg, r.config);
            const autonomia = calcularAutonomia(LP, r.q);

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
                linepack: escalarLinepack(LP),  // Usando la función de escala centralizada
                pressure: pascalesABares(pressAvg), // Convertir a bares para visualización
                autonomia: autonomia,
                config: r.config // Incluimos la configuración para acceder a thresholds
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