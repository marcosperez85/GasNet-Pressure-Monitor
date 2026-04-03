/**
 * Función para eliminar URLs duplicadas de un string de URLs separadas por comas
 * @param {string} stringURLs - String con URLs separadas por comas
 * @returns {string} - String con URLs únicas separadas por comas
 */
export function limpiarURLs(stringURLs) {
    // Separamos el string en URLs individuales
    const urls = stringURLs.split(',');
    
    // Usamos un Set para eliminar duplicados
    const urlsUnicas = [...new Set(urls)];
    
    // Imprimimos estadísticas para depuración
    console.log(`URLs originales: ${urls.length}`);
    console.log(`URLs únicas: ${urlsUnicas.length}`);
    console.log(`Se eliminaron ${urls.length - urlsUnicas.length} URLs duplicadas`);
    
    // Unimos nuevamente con comas
    return urlsUnicas.join(',');
}