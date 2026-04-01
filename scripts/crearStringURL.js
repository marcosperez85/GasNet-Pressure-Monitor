
import { MEASUREMENT_POINTS } from './data.js';

// Constantes para construir URLs
const inicioURL = 'webhmi-model://';
const pEntrada = 'P-Entrada';
const caudal = 'Q-Inst';

// Función para crear las URLs
function crearURLs() {
    let stringURLs = [];
    
    // Recorremos todas las unidades de negocio
    for (const unidadNegocio in MEASUREMENT_POINTS) {
        const puntosMedicion = MEASUREMENT_POINTS[unidadNegocio];
        
        // Recorremos todos los puntos de medición de cada unidad
        puntosMedicion.forEach(punto => {
            // Verificamos si el punto tiene los campos necesarios
            if (punto.nombres && punto.nombres.puntoUpstream && punto.nombres.puntoDownstream) {
                // Construimos las URLs basadas en los nombres
                const urlPEntradaUp = inicioURL + punto.nombres.puntoUpstream + "/" + pEntrada;
                const urlPEntradaDown = inicioURL + punto.nombres.puntoDownstream + "/" + pEntrada;
                const urlCaudal = inicioURL + punto.nombres.puntoUpstream + "/" + caudal;
                
                // Agregamos las URLs concatenadas al array
                stringURLs.push(urlPEntradaUp + "," + urlPEntradaDown + "," + urlCaudal);
                
                // Registramos para depuración
                console.log(`URLs para ${punto.title}:`);
                console.log(`- P Entrada Up: ${urlPEntradaUp}`);
                console.log(`- P Entrada Down: ${urlPEntradaDown}`);
                console.log(`- Caudal: ${urlCaudal}`);
                console.log('-------------------');
            } else if (punto.queries && punto.queries.pEntradaUp && punto.queries.pEntradaDown && punto.queries.caudal) {
                // Si no hay nombres pero sí queries, usamos esas URLs
                stringURLs.push(punto.queries.pEntradaUp + "," + punto.queries.pEntradaDown + "," + punto.queries.caudal);
                
                // Registramos para depuración
                console.log(`URLs para ${punto.title} (desde queries):`);
                console.log(`- P Entrada Up: ${punto.queries.pEntradaUp}`);
                console.log(`- P Entrada Down: ${punto.queries.pEntradaDown}`);
                console.log(`- Caudal: ${punto.queries.caudal}`);
                console.log('-------------------');
            }
        });
    }
    
    // Unimos todas las URLs en un solo string
    return stringURLs.join(',');
}

// Ejecutamos la función y guardamos el resultado
const stringURLs = crearURLs();

// Imprimimos el resultado para verificar
console.log("String de URLs completo:");
console.log(stringURLs);

// Exportamos la variable para que pueda ser utilizada en otros archivos
export { stringURLs };