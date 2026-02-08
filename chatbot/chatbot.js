if (typeof CONFIG === 'undefined' || !CONFIG.API_GATEWAY_URL) {
    console.error('Error: Archivo config.js no encontrado o API Gateway no definido.');
    alert('Este sitio requiere un archivo de configuración válido. Por favor, crea config.js siguiendo el modelo en config.template.js');
}

const api_gateway_url = CONFIG.API_GATEWAY_URL;

const $cuadroParaUserInput = document.getElementById('cuadroParaUserInput');
const $chatBox = document.getElementById('chat-box');

async function sendMessage() {
    const textoDelUsuario = $cuadroParaUserInput.value;

    if (!textoDelUsuario) return;
    
    $cuadroParaUserInput.value = "";
    
    $chatBox.innerHTML += `<p><strong>Tú:</strong> ${textoDelUsuario}</p>`;
    $chatBox.scrollTop = $chatBox.scrollHeight;

    // Mostrar indicador de carga
    const loadingId = `loading-${Date.now()}`;
    $chatBox.innerHTML += `<p id="${loadingId}"><em>Escribiendo...</em></p>`;
    $chatBox.scrollTop = $chatBox.scrollHeight;

    try {
        const response = await fetch(api_gateway_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: textoDelUsuario })
        });
        
        // Eliminar indicador de carga
        document.getElementById(loadingId).remove();
        
        if (response.ok) {
            // Leer la respuesta como texto primero
            let textResponse = await response.text();
            
            // Intentar parsear como JSON
            try {
                const jsonResponse = JSON.parse(textResponse);
                
                // Si es un objeto con campo body, usar ese valor
                if (jsonResponse && typeof jsonResponse === 'object' && jsonResponse.body) {
                    $chatBox.innerHTML += `<p><strong>Chatbot:</strong> ${jsonResponse.body}</p>`;
                } else {
                    // Si es JSON pero sin body, mostrar como texto
                    $chatBox.innerHTML += `<p><strong>Chatbot:</strong> ${textResponse}</p>`;
                }
            } catch (e) {
                // Si no es JSON válido, mostrar el texto directamente
                $chatBox.innerHTML += `<p><strong>Chatbot:</strong> ${textResponse}</p>`;
            }
        } else {
            $chatBox.innerHTML += `<p><strong>Error:</strong> No se pudo obtener respuesta</p>`;
        }
        
        $chatBox.scrollTop = $chatBox.scrollHeight;
        
    } catch (error) {
        console.error('Error:', error);
        // Eliminar indicador de carga en caso de error
        if (document.getElementById(loadingId)) {
            document.getElementById(loadingId).remove();
        }
        $chatBox.innerHTML += `<p><strong>Error:</strong> No se pudo conectar con el chatbot</p>`;
        $chatBox.scrollTop = $chatBox.scrollHeight;
    }
}

$cuadroParaUserInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});