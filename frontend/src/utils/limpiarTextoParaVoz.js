/**
 * Limpia el texto antes de mandarlo a speechSynthesis. Sin esto, la voz
 * lee literalmente cosas como "asterisco asterisco" o "numeral" cuando
 * el texto tiene markdown o símbolos sueltos.
 *
 * Nota: el system prompt del backend ya le pide a Claude que no use
 * markdown — esto es una segunda capa de seguridad por si algún símbolo
 * se cuela igual (o si en algún momento se muestra texto de otra fuente).
 */
export function limpiarTextoParaVoz(texto) {
  if (!texto) return "";

  return texto
    // markdown: negrita, cursiva, código
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    // encabezados y listas
    .replace(/^#+\s*/gm, "")
    .replace(/^[-•*]\s+/gm, "")
    // emojis (rango amplio de unicode)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    // símbolos que no deberían pronunciarse, pero conservamos puntuación
    // natural (, . ? ! : ; ¿ ¡) que ayuda a la entonación
    .replace(/[#@{}[\]|~^=+<>\\]/g, "")
    // saltos de línea y espacios repetidos
    .replace(/\n+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
