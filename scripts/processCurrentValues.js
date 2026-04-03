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
        console.log("Resultado parcial:", resultado);
        const r = resultado[key];

        if (r.up != null && r.down != null) {
            const LP = calcularLinepack(r.up, r.down, r.config);

            enriched[key] = {
                linepack: LP,
                pressure: (r.up + r.down) / 2
            };
        }
    }

    return enriched;
}