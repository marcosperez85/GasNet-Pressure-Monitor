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

    // 🔹 Mapear dataset → puntos
    dataset.forEach(d => {
        const name = d.name;

        for (const unidad in MEASUREMENT_POINTS) {
            MEASUREMENT_POINTS[unidad].forEach(p => {

                if (!p.nombres) return;

                const upTag = `webhmi-model://${p.nombres.puntoUpstream}/P-Entrada`;
                const downTag = `webhmi-model://${p.nombres.puntoDownstream}/P-Entrada`;
                const qTag = `webhmi-model://${p.nombres.puntoUpstream}/Q-Inst`;

                if (name === upTag) resultado[p.title].up = parseFloat(d.value);
                if (name === downTag) resultado[p.title].down = parseFloat(d.value);
                if (name === qTag) resultado[p.title].q = parseFloat(d.value);
            });
        }
    });

    // 🔹 Calcular linepack
    const enriched = {};

    for (const key in resultado) {
        const r = resultado[key];

        if (r.up && r.down) {
            const LP = calcularLinepack(r.up, r.down, r.config);

            enriched[key] = {
                linepack: LP,
                pressure: (r.up + r.down) / 2
            };
        }
    }

    return enriched;
}