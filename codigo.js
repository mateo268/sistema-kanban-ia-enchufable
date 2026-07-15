// ============================================================
// Código.gs — versión completa con todas las correcciones
// ============================================================

function alEnviarFormulario(e) {

  // ── GUARD-EDITOR ──────────────────────────────────────────
  // Esta función solo funciona disparada por el envío del
  // formulario, que es quien construye el evento "e". Ejecutarla
  // con Run desde el editor llega sin evento y moría con un
  // TypeError críptico. Ahora muere con un mensaje que explica
  // qué hacer.
  if (!e || !e.response) {
    Logger.log("🚨 Esta función se dispara enviando el formulario, no con Run desde el editor.");
    return;
  }
  // ─────────────────────────────────────────────────────────

  var respuestas = e.response.getItemResponses();

  // Escudo protector
  if (respuestas.length < 3) {
    Logger.log("🚨 ERROR: No llegaron las 3 respuestas.");
    return;
  }

  var textoTarea = respuestas[0].getResponse();
  var proyectoElegido = respuestas[1].getResponse();
  var motorElegido = respuestas[2].getResponse();

  Logger.log("=== NUEVA TAREA RECIBIDA ===");
  Logger.log("Texto original: " + textoTarea);
  Logger.log("Proyecto seleccionado: " + proyectoElegido);
  Logger.log("Motor seleccionado: " + motorElegido);

  // 1. Cargamos la base inquebrantable de Elastic
  var instruccionesCore = YAML_CORE;
  var instruccionesProyecto = "";

  // 2. Elegimos el contexto según lo que marcó el usuario en el formulario (Anonimizado)
  if (proyectoElegido === "Industrias Stark") {
    instruccionesProyecto = YAML_STARK;
  } else if (proyectoElegido === "Corporación ACME") {
    instruccionesProyecto = YAML_ACME;
  } else if (proyectoElegido === "Elastic") {
    instruccionesProyecto = YAML_ELASTIC;
  }

  // ── CONTRATO ──────────────────────────────────────────
  var instrucciones = "Eres un asistente estricto. Lee estas configuraciones YAML y devuelve ÚNICAMENTE un objeto JSON PLANO cuyas claves de primer nivel sean exactamente: project, unit, unit_prefix, title, category, objetivo, entregable, notas. Sin claves envolventes, sin anidar el objeto bajo ningún nombre, sin texto alrededor:\n\n" + instruccionesCore + "\n\n" + instruccionesProyecto;
  // ─────────────────────────────────────────────────────────

  var resultadoJSON = "";

  // El enrutador
  if (motorElegido === "Gemini") {
    resultadoJSON = motorGemini(textoTarea, instrucciones);
  } else if (motorElegido === "OpenAI") {
    resultadoJSON = motorOpenAI(textoTarea, instrucciones);
  }

  // Creación de la tarjeta
  if (resultadoJSON) {
    Logger.log("=== JSON ESTRUCTURADO RECIBIDO ===");
    Logger.log(resultadoJSON);

    // ── ROBUSTEZ ──────────────────────────────────────────
    try {
      var datosEstructurados = JSON.parse(resultadoJSON);

      // ── DESENVOLVER ───────────────────────────────────
      if (Array.isArray(datosEstructurados)) {
        datosEstructurados = datosEstructurados[0];
      }
      if (datosEstructurados && !datosEstructurados.title) {
        var claves = Object.keys(datosEstructurados);
        if (claves.length === 1 && typeof datosEstructurados[claves[0]] === "object") {
          datosEstructurados = datosEstructurados[claves[0]];
        }
      }
      // ─────────────────────────────────────────────────────

      // ── VALIDAR ───────────────────────────────────────
      if (!datosEstructurados || !datosEstructurados.title || !datosEstructurados.category) {
        Logger.log("🚨 JSON con estructura inesperada de " + motorElegido + ". No se crea tarjeta.");
        Logger.log("Objeto recibido: " + JSON.stringify(datosEstructurados));
        return;
      }
      // ─────────────────────────────────────────────────────

      crearTarjetaTrello(datosEstructurados, motorElegido);
    } catch (err) {
      Logger.log("🚨 JSON inválido de " + motorElegido + ": " + err);
      Logger.log("Contenido recibido: " + resultadoJSON);
    }
    // ─────────────────────────────────────────────────────────
  } else {
    Logger.log("Hubo un error al generar el JSON y no se pudo crear la tarjeta.");
  }
}

function motorGemini(texto, instrucciones) {
  // Leemos la llave segura
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

  var promptCompleto = instrucciones + "\n\nTAREA DEL USUARIO: " + texto;

  // ── ROBUSTEZ ─────────────────────────────
  var payload = {
    "contents": [{
      "parts": [{"text": promptCompleto}]
    }],
    "generationConfig": {
      "temperature": 0.2,
      "responseMimeType": "application/json"
    }
  };
  // ─────────────────────────────────────────────────────────

  var opciones = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  var respuestaHttp = UrlFetchApp.fetch(url, opciones);

  var textoRespuesta = respuestaHttp.getContentText();
  Logger.log("Respuesta de Gemini en bruto: " + textoRespuesta);

  var datosGenerales = JSON.parse(textoRespuesta);

  // ── BUG ─────────────────────────────────────────────────
    Logger.log("Error de Gemini: " + datosGenerales.error.message);
    return null;
  }

  // Red extra: a veces la API responde 200 pero sin candidatos
  // (filtros de seguridad, cuota agotada, etc.). Sin esta
  // comprobación, la extracción de abajo moriría con "Cannot
  // read properties of undefined".
  if (!datosGenerales.candidates || !datosGenerales.candidates.length) {
    Logger.log("Gemini no devolvió candidatos: " + textoRespuesta);
    return null;
  }
  // ─────────────────────────────────────────────────────────

  // Extraemos el texto de la IA
  var textoIA = datosGenerales.candidates[0].content.parts[0].text;

  // Limpiamos las vallas de código (```json y ```)
  var jsonLimpio = textoIA.replace(/```json/g, "").replace(/```/g, "").trim();

  return jsonLimpio;
}

function listarModelos() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  var url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey;

  var opciones = {
    "method": "get",
    "muteHttpExceptions": true
  };

  var respuesta = UrlFetchApp.fetch(url, opciones);
  Logger.log("=== MODELOS DISPONIBLES PARA TU CUENTA ===");
  Logger.log(respuesta.getContentText());
}

function crearTarjetaTrello(datosTarea, motorElegido) {
  // 1. Traemos las credenciales seguras
  var key = PropertiesService.getScriptProperties().getProperty('TRELLO_API_KEY');
  var token = PropertiesService.getScriptProperties().getProperty('TRELLO_TOKEN');
  var idList = PropertiesService.getScriptProperties().getProperty('TRELLO_BACKLOG_ID');

  // ── BUG ─────────────────────────────────────────────────
  var colores = {
    "strategy": "purple",
    "design": "pink",
    "communication": "green",
    "web_digital": "blue",
    "operational": "orange"
  };
  var colorEtiqueta = colores[datosTarea.category] || "yellow";
  // El amarillo funciona como alarma: si una tarjeta sale
  // amarilla, la IA devolvió una categoría fuera de las cinco.
  // ─────────────────────────────────────────────────────────

  // ── BUG ─────────────────────────────────────────────────
  var entregable = Array.isArray(datosTarea.entregable)
    ? "- " + datosTarea.entregable.join("\n- ")
    : (datosTarea.entregable || "Sin entregable definido");

  var notas = Array.isArray(datosTarea.notas)
    ? "- " + datosTarea.notas.join("\n- ")
    : (datosTarea.notas || "Sin notas");

  var descripcion = "**Objetivo:**\n" + datosTarea.objetivo + "\n\n" +
                    "**Entregable:**\n" + entregable + "\n\n" +
                    "**Notas:**\n" + notas + "\n\n" +
                    "---\n*Generada con: " + motorElegido + "*";
  // ─────────────────────────────────────────────────────────

  // 4. URL para crear la tarjeta principal
  var urlCrear = 'https://api.trello.com/1/cards?idList=' + idList + '&key=' + key + '&token=' + token;

  var payloadTarjeta = {
    "name": datosTarea.unit_prefix + " " + datosTarea.title,
    "desc": descripcion
  };

  var opcionesCrear = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payloadTarjeta),
    "muteHttpExceptions": true
  };

  Logger.log("Enviando tarjeta a Trello...");
  var respuestaCrear = UrlFetchApp.fetch(urlCrear, opcionesCrear);
  var tarjetaCreada = JSON.parse(respuestaCrear.getContentText());

  if (tarjetaCreada.id) {
    var urlEtiqueta = 'https://api.trello.com/1/cards/' + tarjetaCreada.id + '/labels?color=' + colorEtiqueta + '&key=' + key + '&token=' + token;
    UrlFetchApp.fetch(urlEtiqueta, {"method": "post", "muteHttpExceptions": true});
    Logger.log("¡Tarjeta creada exitosamente en Trello! ID: " + tarjetaCreada.id);
  } else {
    Logger.log("Error al crear la tarjeta en Trello: " + respuestaCrear.getContentText());
  }
}

function motorOpenAI(texto, instrucciones) {
  // 1. Leemos la llave segura de OpenAI
  var apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  // 2. URL de la API de OpenAI para chat
  var url = 'https://api.openai.com/v1/chat/completions';

  var promptCompleto = instrucciones + "\n\nTAREA DEL USUARIO: " + texto;

  // ── ROBUSTEZ ─────────────────────────────
  var payload = {
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "system",
        "content": "Eres un asistente experto en estructuración de datos que devuelve únicamente JSON puro, sin texto adicional."
      },
      {
        "role": "user",
        "content": promptCompleto
      }
    ],
    "temperature": 0.2,
    "response_format": { "type": "json_object" }
  };
  // ─────────────────────────────────────────────────────────

  var opciones = {
    "method": "post",
    "contentType": "application/json",
    "headers": {
      "Authorization": "Bearer " + apiKey
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  // 4. Hacemos la llamada HTTP a OpenAI
  Logger.log("Llamando a OpenAI...");
  var respuestaHttp = UrlFetchApp.fetch(url, opciones);
  var textoRespuesta = respuestaHttp.getContentText();
  Logger.log("Respuesta de OpenAI en bruto: " + textoRespuesta);

  var datosGenerales = JSON.parse(textoRespuesta);

  // Si hay error en la API
  if (datosGenerales.error) {
    Logger.log("Error de OpenAI: " + datosGenerales.error.message);
    return null;
  }

  // 5. Extraemos el texto de la IA (la ruta del JSON cambia respecto a Gemini)
  var textoIA = datosGenerales.choices[0].message.content;

  // 6. Limpiamos las vallas de código por si acaso
  var jsonLimpio = textoIA.replace(/```json/g, "").replace(/```/g, "").trim();

  return jsonLimpio;
}
