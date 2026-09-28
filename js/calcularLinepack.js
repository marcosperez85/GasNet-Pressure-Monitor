/**
 * Calcula (P * A * L) / (Z * R * T), con P media y A = PI * D² / 4.
 * No convierte unidades: las presiones y R deben usar unidades compatibles.
 * Devuelve null cuando faltan datos o los parámetros no son válidos.
 */
function calcularLinepack(config, presionUpstream, presionDownstream) {
    if (!config) return null;
    const { D, L, Z, R, T } = config;
    if (![D, L, Z, R, T].every(value => Number.isFinite(value) && value > 0)
        || ![presionUpstream, presionDownstream].every(value => Number.isFinite(value) && value >= 0)) {
        return null;
    }

    const P = (presionUpstream + presionDownstream) / 2;
    const A = Math.PI * D ** 2 / 4;
    const linepack = (P * A * L) / (Z * R * T);
    return Number.isFinite(linepack) ? linepack : null;
}

function calcularLinepackActual(point, data) {
    const upstream = data?.up?.[data.up.length - 1];
    const downstream = data?.down?.[data.down.length - 1];
    // Usar el mismo instante de medición para ambas presiones.
    if (!upstream || !downstream || !Number.isFinite(upstream[0])
        || upstream[0] !== downstream[0]) return null;
    return calcularLinepack(point?.config, upstream[1], downstream[1]);
}
