import { MEASUREMENT_POINTS } from './data.js';
import { calcularLinepack, calcularAutonomia } from './chart.js'; // Importamos calcularAutonomia

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

    // Calcular linepack y autonomía
    const enriched = {};

    for (const title in resultado) {
        const r = resultado[title];

        if (r.up != null && r.down != null) {
            // Calcular presión promedio
            // El factor 2* 1.013 corresponde a sacar factor común de la presión ambiental para convertir
            // la presión de historian (relativa o manométrica) en presión absoluta para el cálculo de linepack
            // El valor de 1.013 es la presión ambiental en bares (porque la previsón proveniente de Historian está en bares).
            // El factor de 1e5 (10 x e^5) es la conversion de bares a pascales.
            const pressAvg = ((r.up + r.down + 2 * 1.013) * 1e5) / 2;

            // Calcular linepack
            const LP = calcularLinepack(pressAvg, r.config);

            // Calcular autonomía aquí (ahora en processCurrentValues.js)
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
                linepack: LP / 1e7,         // Divido por 1e7 para facilitar la lectura
                pressure: pressAvg / 1e5,   // Divido por 1e5 para convertir de pascales a bares
                autonomia: autonomia        // Añadimos autonomía a los datos procesados
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