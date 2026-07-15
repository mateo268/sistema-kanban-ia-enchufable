// ============================================================
// config.gs — Plantilla de configuración pública
// ============================================================

var YAML_CORE = `
elastic_kanban_core:
  version: "1.0"
  purpose: Definir el estándar de tareas para los tableros Kanban de Elastic.
  principles:
    - "1 tarjeta = 1 entregable verificable"
    - "La conversación y referencias viven dentro de la tarjeta"
    - "El generador solo define la tarea, no asigna personas ni prioridades"
    - "Las categorías describen tipo de trabajo, no estado"
  output_schema:
    format: json
    json_shape:
      project: "id del proyecto activo"
      unit: "id de la unidad inferida"
      unit_prefix: "emoji de la unidad"
      title: "entregable claro y conciso, SIN el emoji"
      category: "una de: strategy, design, communication, web_digital, operational"
      objetivo: "1–2 frases explicando el propósito"
      entregable: "array de 3–6 strings, cada uno un criterio verificable"
      notas: "array de strings con dependencias o información que falta"
    rules:
      - "Devolver ÚNICAMENTE el objeto JSON, sin ningún texto alrededor."
      - "No usar vallas de código Markdown ni la etiqueta json."
      - "title NO lleva el emoji; el emoji va en unit_prefix."
      - "category debe ser exactamente uno de los cinco valores permitidos."
  categories:
    strategy: keywords [estrategia, posicionamiento, narrativa, sistema, guía, marco, kpi, arquitectura]
    design: keywords [diseño, menú, carta, señalética, cartel, pieza, editorial, arte final]
    communication: keywords [campaña, instagram, contenido, publicación, newsletter, anuncio, storytelling]
    web_digital: keywords [web, landing, seo, analytics, cms, ux, navegación]
    operational: keywords [actualizar, cambiar, subir, corregir, ajuste, mantenimiento]
`;

var YAML_STARK = `
project:
  id: stark
  name: "Industrias Stark"
  units:
    armaduras: { prefix: "🤖", keywords: [mark, armadura, reactor, arc, vuelo, propulsor, nanotecnología] }
    energia: { prefix: "⚡", keywords: [energía, limpia, torre, red, suministro, batería] }
`;

var YAML_ACME = `
project:
  id: acme
  name: "Corporación ACME"
  units:
    default: { prefix: "🧨", keywords: [acme, tnt, dinamita, explosivo, detonador, mecha, pólvora, trampa, yunque] }
`;

var YAML_ELASTIC = `
project:
  id: elastic
  name: "Elastic (interno)"
  units:
    redmirror: { prefix: "⭕", keywords: [redmirror, espejo] }
    filtr: { prefix: "🫥", keywords: [filtr, privacidad, tauri, whitepaper] }
    npm_guardian: { prefix: "🛡️", keywords: [npm guardian, dependencia, paquete] }
    quota: { prefix: "📊", keywords: [quota, cuota, límite, consumo] }
    eclipsemania: { prefix: "🌒", keywords: [eclipsemania, eclipse, astronomía] }
    management: { prefix: "⚙️", keywords: [management, gestión, interno, estudio, tarifas] }
    marketing: { prefix: "♦️", keywords: [marketing, marca, 3lastic, web elastic, signal, linkedin, artículo, caso de estudio, captación, propuesta comercial] }
`;
