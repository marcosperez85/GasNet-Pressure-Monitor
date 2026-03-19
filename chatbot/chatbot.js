if (typeof CONFIG === 'undefined' || !CONFIG.API_GATEWAY_URL) {
    console.error('Error: Archivo config.js no encontrado o API Gateway no definido.');
    alert('Este sitio requiere un archivo de configuración válido. Por favor, crea config.js siguiendo el modelo en config.template.js');
}

const api_gateway_url = CONFIG.API_GATEWAY_URL;
const api_gateway_key = CONFIG.API_GATEWAY_KEY;

const chatbot_endpoint = api_gateway_url.endsWith('/chat') ?
    api_gateway_url :
    `${api_gateway_url}/chat`;


const $cuadroParaUserInput = document.getElementById('cuadroParaUserInput');
const $chatBox = document.getElementById('chat-box');

// Agregar evento para los botones de navegación
document.querySelectorAll('.navButton').forEach(button => {
    button.addEventListener('click', function () {
        if (this.textContent.includes('Map View')) {
            window.location.href = '../index.html';
        }
    });
});

async function sendMessage() {
    const textoDelUsuario = $cuadroParaUserInput.value;

    if (!textoDelUsuario) return;

    $cuadroParaUserInput.value = "";

    $chatBox.innerHTML += `<p><strong>Tú:</strong> ${textoDelUsuario}</p>`;
    $chatBox.scrollTop = $chatBox.scrollHeight;

    // Mostrar indicador de carga
    const loadingId = `loading-${Date.now()}`;
    $chatBox.innerHTML += `<p id="${loadingId}"><em><i class="fas fa-spinner fa-spin"></i> Escribiendo...</em></p>`;
    $chatBox.scrollTop = $chatBox.scrollHeight;

    try {
        const response = await fetch(chatbot_endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": api_gateway_key
            },
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

                // Si es un objeto con campo response, usar ese valor
                if (jsonResponse && typeof jsonResponse === 'object' && jsonResponse.response) {
                    $chatBox.innerHTML += `<p><strong>Chatbot:</strong> ${jsonResponse.response}</p>`;
                } else if (jsonResponse && typeof jsonResponse === 'object' && jsonResponse.body) {
                    $chatBox.innerHTML += `<p><strong>Chatbot:</strong> ${jsonResponse.body}</p>`;
                } else {
                    // Si es JSON pero sin body o response, mostrar como texto
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

$cuadroParaUserInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Mensaje de bienvenida al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        $chatBox.innerHTML += `<p><strong>Chatbot:</strong> ¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?</p>`;
    }, 500);
});