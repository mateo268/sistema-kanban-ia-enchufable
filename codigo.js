function alEnviarFormulario(e) {
  var respuestas = e.response.getItemResponses();

  // Escudo protector: Validar que lleguen todas las respuestas obligatorias
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

  // Inyección dinámica de configuraciones YAML
  var instruccionesCore = YAML_CORE;
  var instruccionesProyecto = "";

  if (proyectoElegido === "Industrias Stark") {
    instruccionesProyecto = YAML_STARK;
  } else if (proyectoElegido === "Corporación ACME") {
    instruccionesProyecto = YAML_ACME;
  } else if (proyectoElegido === "Elastic") {
    instruccionesProyecto = YAML_ELASTIC;
  }

  var instrucciones = "Eres un asistente estricto. Lee estas configuraciones en formato YAML y devuelve únicamente un JSON válido basándote en ellas:\n\n" + instruccionesCore + "\n\n" + instruccionesProyecto;
  
  var resultadoJSON = "";

  // Enrutador de la Arquitectura de Motores Enchufables
  if (motorElegido === "Gemini") {
    resultadoJSON = motorGemini(textoTarea, instrucciones);
  } else if (motorElegido === "OpenAI") {
    resultadoJSON = motorOpenAI(textoTarea, instrucciones);
  }

  // Procesamiento y envío a Trello
  if (resultadoJSON) {
    Logger.log("=== JSON ESTRUCTURADO RECIBIDO ===");
    Logger.log(resultadoJSON);
    var datosEstructurados = JSON.parse(resultadoJSON);
    crearTarjetaTrello(datosEstructurados, motorElegido);
  } else {
    Logger.log("Hubo un error al generar el JSON y no se pudo crear la tarjeta.");
  }
}

// MOTOR 1: GOOGLE GEMINI (Utiliza v1beta con el modelo gemini-2.5-flash validado)
function motorGemini(texto, instrucciones) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

  var promptCompleto = instrucciones + "\n\nTAREA DEL USUARIO: " + texto;
  var payload = {
    "contents": [{
      "parts": [{"text": promptCompleto}]
    }]
  };

  var opciones = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  var respuestaHttp = UrlFetchApp.fetch(url, opciones);
  var datosGenerales = JSON.parse(respuestaHttp.getContentText());

  if (datosGenerales.error) {
    Logger.log("Error de la API Gemini: " + datosGenerales.error.message);
    return null;
  }

  var textoIA = datosGenerales.candidates[0].content.parts[0].text;
  var jsonLimpio = textoIA.replace(/```json/g, "").replace(/```/g, "").trim();

  return jsonLimpio;
}

// MOTOR 2: OPENAI (Utiliza gpt-4o-mini por eficiencia y coste)
function motorOpenAI(texto, instrucciones) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  var url = 'https://api.openai.com/v1/chat/completions';

  var promptCompleto = instrucciones + "\n\nTAREA DEL USUARIO: " + texto;
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
    "temperature": 0.2
  };

  var opciones = {
    "method": "post",
    "contentType": "application/json",
    "headers": { "Authorization": "Bearer " + apiKey },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  var respuestaHttp = UrlFetchApp.fetch(url, opciones);
  var datosGenerales = JSON.parse(respuestaHttp.getContentText());

  if (datosGenerales.error) {
    Logger.log("Error de OpenAI: " + datosGenerales.error.message);
    return null; 
  }

  var textoIA = datosGenerales.choices[0].message.content;
  var jsonLimpio = textoIA.replace(/```json/g, "").replace(/```/g, "").trim();

  return jsonLimpio;
}

// INTEGRACIÓN CON TRELLO
function crearTarjetaTrello(datosTarea, motorElegido) {
  var key = PropertiesService.getScriptProperties().getProperty('TRELLO_API_KEY');
  var token = PropertiesService.getScriptProperties().getProperty('TRELLO_TOKEN');
  var idList = PropertiesService.getScriptProperties().getProperty('TRELLO_BACKLOG_ID');
  
  var colores = {
    "strategy": "blue",
    "design": "purple",
    "communication": "green",
    "web_digital": "orange",
    "operational": "yellow"
  };
  var colorEtiqueta = colores[datosTarea.category] || "sky";

  var descripcion = "**Objetivo:**\n" + datosTarea.objetivo + "\n\n" +
                    "**Entregables Esperados:**\n" + (Array.isArray(datosTarea.entregable) ? datosTarea.entregable.join("\n* ") : datosTarea.entregable) + "\n\n" +
                    "**Notas / Dependencias:**\n" + (Array.isArray(datosTarea.notas) ? datosTarea.notas.join("\n* ") : datosTarea.notas) + "\n\n" +
                    "---\n*Generada automáticamente con: " + motorElegido + "*";

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

  var respuestaCrear = UrlFetchApp.fetch(urlCrear, opcionesCrear);
  var tarjetaCreada = JSON.parse(respuestaCrear.getContentText());

  if (tarjetaCreada.id) {
    var urlEtiqueta = 'https://api.trello.com/1/cards/' + tarjetaCreada.id + '/labels?color=' + colorEtiqueta + '&key=' + key + '&token=' + token;
    UrlFetchApp.fetch(urlEtiqueta, { "method": "post", "muteHttpExceptions": true });
    Logger.log("¡Tarjeta creada exitosamente en Trello! ID: " + tarjetaCreada.id);
  } else {
    Logger.log("Error al crear la tarjeta en Trello: " + respuestaCrear.getContentText());
  }
}