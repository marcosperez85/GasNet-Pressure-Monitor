import { MEASUREMENT_POINTS } from './data.js';
import { calcularLinepack } from './calcularLinepack.js';

export function procesarCurrentValues(dataset) {
    const resultado = {};

    // 🔹 Inicializar estructura
    for (const unidad in MEASUREMENT_POINTS) {
        MEASUREMENT_POINTS[unidad].forEach(p => {
            resultado[p.title] = {
                up: null,
                down: null,
                q: null,
                config: p.config
            };
        });
    }

    // 🔹 Mapear dataset
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

    // 🔹 Calcular linepack
    const enriched = {};

    for (const key in resultado) {
        const r = resultado[key];

        if (r.up != null && r.down != null) {
            const LP = calcularLinepack(r.up, r.down, r.config);

            // 🔥 Buscar el point en data.js para obtener el ID
            let pointConfig = null;

            for (const unidad in MEASUREMENT_POINTS) {
                const found = MEASUREMENT_POINTS[unidad].find(p => p.title === key);
                if (found) {
                    pointConfig = found;
                    break;
                }
            }

            const data = {
                linepack: LP,
                pressure: (r.up + r.down) / 2
            };

            // 🔥 SIEMPRE guardar por title (sidebar)
            enriched[key] = data;

            // 🔥 SOLO si hay ID, guardar también por ID (mapa)
            if (pointConfig?.id) {
                enriched[pointConfig.id] = data;
            }
        }
    }
    return enriched;
}