# Sistema de captura de tareas sin problema en Trello (Elastic)

## 🎯 El problema
Registrar una tarea en el flujo de trabajo diario suele tener demasiada complejidad: requiere abrir una interfaz de IA, buscar el asistente correcto, redactar la tarea, esperar la respuesta y copiar/pegar manualmente el resultado en una tarjeta de Trello. Este problema provoca que muchas ideas o tareas urgentes se pierdan en el camino.

## 💡 La solución
Un sistema automatizado de un solo paso. El usuario escribe su tarea en bruto (lenguaje natural) en un formulario de Google y, en segundos, la tarea aparece perfectamente estructurada, etiquetada y categorizada en Trello, lista en la columna "Backlog".

## 🏗️ Arquitectura y diseño: Motores enchufables
La característica principal de este sistema es que **el motor de IA es una pieza intercambiable**. El sistema cuenta con una base común y dos motores independientes implantados (Google Gemini y OpenAI). 

Ambos motores reciben exactamente los mismos parámetros (el texto del usuario y las instrucciones de contexto YAML) y devuelven exactamente el mismo output (un JSON estructurado). Esto permite al equipo comparar el rendimiento, coste, velocidad y calidad de ambas IAs en un entorno de producción real.

### El flujo de datos
1. **Captura:** El usuario envía el texto en bruto, elige el Proyecto y el Motor (Gemini u OpenAI) a través de Google Forms.
2. **Disparador:** Google Apps Script detecta el envío mediante un trigger `onFormSubmit`.
3. **Inyección de Contexto:** El script carga el "Core" de reglas Kanban y le inyecta la configuración en formato YAML del proyecto seleccionado (unidades, palabras clave, prefijos emoji).
4. **Procesamiento de IA:** El script llama a la API del motor elegido. La IA procesa el contexto y la tarea, devolviendo un JSON estricto.
5. **Parseo y Creación:** Apps Script lee el JSON, mapea las categorías a colores de etiquetas, formatea la descripción en Markdown y hace una petición HTTP a la API de Trello.
6. **Resultado:** La tarjeta aparece en el tablero global con una marca de agua indicando qué IA la generó (ej. *"generada con: OpenAI"*).

## 🚀 Guía de configuración

### 1. Variables de entorno (Script Properties)
Por seguridad, ninguna clave de API se sube al código fuente. En Google Apps Script, se deben configurar las siguientes propiedades de la secuencia de comandos:
* `GEMINI_API_KEY`: Clave de Google AI Studio.
* `OPENAI_API_KEY`: Clave de la API de OpenAI.
* `TRELLO_API_KEY`: Clave de desarrollador de Trello.
* `TRELLO_TOKEN`: Token de autorización de Trello.
* `TRELLO_BACKLOG_ID`: ID de la lista destino en el tablero.

### 2. Configuración del formulario
El Google Form asociado debe tener exactamente estas tres preguntas configuradas como **Obligatorias**:
1. **Descripción de la tarea:** Campo de texto (párrafo).
2. **Proyecto:** Opción múltiple / Desplegable (Industrias Stark, Corporación ACME, Elastic).
3. **Motor:** Opción múltiple / Desplegable (Gemini, OpenAI).