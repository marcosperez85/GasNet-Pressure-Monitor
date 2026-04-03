export function calcularLinepack(P_up, P_down, config) {
    const P_prom = (P_up + P_down) / 2;

    const A = Math.PI * Math.pow(config.D, 2) / 4;

    return (P_prom * A * config.L) / (config.Z * config.R * config.T);
}

export function calcularAutonomia(LP, Q) {
    if (!Q || Q === 0) return null;
    return LP / Q;
}