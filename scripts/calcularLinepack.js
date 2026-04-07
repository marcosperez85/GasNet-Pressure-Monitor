/**
 * Calcula el área transversal de una tubería dado su diámetro
 * @param {number} D - Diámetro de la tubería en metros
 * @return {number} - Área transversal en metros cuadrados
 */
export function calcularArea(D) {
    return Math.PI * Math.pow(D, 2) / 4;
}

/**
 * Calcula el linepack de un gasoducto
 * @param {number} P - Presión promedio en Pascales
 * @param {Object} config - Configuración del gasoducto
 * @return {number} - Linepack en metros cúbicos estándar
 */
export function calcularLinepack(P, config) {
    const { D, L, Z, T, R } = config;
    const A = calcularArea(D);

    return (P * A * L) / (Z * R * T);
}

/**
 * Calcula la presión promedio a partir de las presiones upstream y downstream
 * @param {number} P_up - Presión upstream en bares (manométrica)
 * @param {number} P_down - Presión downstream en bares (manométrica)
 * @return {number} - Presión promedio en Pascales (absoluta)
 */
export function calcularPresionPromedio(P_up, P_down) {
    // El factor 2* 1.013 corresponde a sacar factor común de la presión ambiental para convertir
    // la presión de historian (relativa o manométrica) en presión absoluta para el cálculo de linepack
    // El valor de 1.013 es la presión ambiental en bares (porque la previsón proveniente de Historian está en bares).
    // El factor de 1e5 (10 x e^5) es la conversion de bares a pascales.
    return ((P_up + P_down + 2 * 1.013) * 1e5) / 2;
}

/**
 * Calcula la autonomía en horas
 * @param {number} LP - Linepack
 * @param {number} Q - Caudal
 * @return {number|null} - Autonomía en horas o null si no hay caudal
 */
export function calcularAutonomia(LP, Q) {
    if (!Q || Q === 0) return null;
    return LP / Q;
}

/**
 * Convierte Pascales a Bares
 * @param {number} pascales - Valor en Pascales
 * @return {number} - Valor en Bares
 */
export function pascalesABares(pascales) {
    return pascales / 1e5;
}

/**
 * Escala el linepack para visualización (dividiéndolo por 10^7)
 * @param {number} linepack - Linepack en metros cúbicos estándar
 * @return {number} - Linepack escalado para visualización
 */
export function escalarLinepack(linepack) {
    return linepack / 1e7;
}