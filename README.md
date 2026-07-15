# 🤖 Capturador de Tareas con IA para Trello (Motores Enchufables)

**Fecha de la última actualización:** Julio de 2026  
**Estado:** Producción (Robusto)

## 📌 ¿De qué va este proyecto?
Este sistema resuelve la fricción de registrar tareas en el día a día. En lugar de ir a Trello, crear la tarjeta, asignarle etiquetas y escribir el formato, simplemente metes la tarea en texto bruto (con tus propias palabras) en un formulario de Google. 

El sistema toma ese texto, le inyecta las reglas de negocio del proyecto seleccionado (vía YAML) y usa una IA para estructurarlo y mandarlo directo al Backlog de Trello con el formato perfecto.

Lo mejor del diseño es su **arquitectura de motores enchufables**: el núcleo del sistema es independiente de la IA. Puedes elegir procesar la tarea con **Gemini** o con **OpenAI**, ambos reciben el mismo contexto y devuelven el mismo JSON estricto.

---

## 🛠️ Evolución y Problemas Resueltos (Changelog)

Armar esto tuvo sus retos. Aquí dejo el historial de lo que fui ajustando para que el sistema no se rompa en producción:

1. **Credenciales Seguras:** Las API Keys (Gemini, OpenAI, Trello) están escondidas en las *Script Properties* de Google Apps Script. El código público está 100% limpio.
2. **El problema de la API de Gemini:** Al principio tiraba error 404 con el modelo viejo. Hice un pequeño script para listar los modelos activos y lo migré a `gemini-2.5-flash`.
3. **Firma de trazabilidad:** Para comparar cuál IA es mejor, Trello estampa al final de la tarjeta con qué motor fue generada (ej: *Generada con: OpenAI*).
4. **Bug de índices en el Formulario:** Al meter la opción de "Proyectos", las respuestas cambiaron de lugar y el script colapsó. Lo arreglé forzando la captura por posiciones estáticas (0: Tarea, 1: Proyecto, 2: Motor) y le puse un escudo que aborta la misión si el formulario llega incompleto.

### 🔥 Actualización de Robustez (La versión final)
En la última actualización metí varios parches críticos para que el sistema sea a prueba de balas:
* **Modo JSON Nativo:** Ahora tanto Gemini (`responseMimeType`) como OpenAI (`response_format`) están forzados por la API a devolver JSON puro. Ya no dependemos de hacer malabares limpiando texto.
* **Escudos Try/Catch y Desenvuelto:** A veces la IA metía el JSON dentro de un array o bajo una clave extraña. Le metí lógica para "desenvolver" ese JSON y un `try/catch` para que, si viene roto, el script no explote, sino que deje un registro en el Log.
* **Filtro anti-basura:** Si el JSON no trae las claves obligatorias (como el título o la categoría), el script rechaza la tarea en lugar de crear una tarjeta vacía y confusa en Trello.
* **Markdown y Colores:** Corregí el mapeo de categorías para que Trello asigne los colores exactos leyendo las variables del YAML (`strategy`, `design`, etc.) y arreglé la concatenación para que los "Entregables" y "Notas" se rendericen como listas de viñetas en Markdown.
* **Nueva unidad interna:** Añadí la unidad `marketing` (♦️) al proyecto base para gestionar las tareas de comunicación y captación.

---

## ⚙️ Configuración (Variables de Entorno)

Para replicar este proyecto, necesitas configurar estas 5 variables en las propiedades del script de Google:
* `GEMINI_API_KEY`: Tu llave de Google AI Studio.
* `OPENAI_API_KEY`: Tu llave de la API de OpenAI.
* `TRELLO_API_KEY`: Clave de desarrollador de Trello.
* `TRELLO_TOKEN`: Token de acceso de tu Trello.
* `TRELLO_BACKLOG_ID`: El ID de la lista destino (se saca agregando `.json` a la URL del tablero).

---

## 📁 Archivos de este Repositorio

Por privacidad, los datos de los proyectos reales con los que opero se han mantenido fuera del repositorio. Para demostrar la funcionalidad, incluí ejemplos ficticios con la misma estructura:

* `Código.gs`: El motor principal (enrutador, validaciones, Try/Catch y conexión HTTP con Trello).
* `config.example.gs`: La plantilla que almacena las reglas y los contextos.
* `elastic_kanban_core.yaml`: Las reglas universales del tablero.
* `project_stark.yaml` y `project_acme.yaml`: Contextos de demostración (Industrias Stark y ACME) para inyectar al prompt de la IA.

### 2. Configuración del formulario
El Google Form asociado debe tener exactamente estas tres preguntas configuradas como **Obligatorias**:
1. **Descripción de la tarea:** Campo de texto (párrafo).
2. **Proyecto:** Opción múltiple / Desplegable (Industrias Stark, Corporación ACME, Elastic).
3. **Motor:** Opción múltiple / Desplegable (Gemini, OpenAI).
