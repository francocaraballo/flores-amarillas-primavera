export const DEFAULTS = Object.freeze({nombre:'Mi amor',frase:'Qué lindo que es florecer a tu lado. Feliz primavera, mi amor.'});
export const LIMITS = Object.freeze({nombre:60,frase:280});
export const lengthOf = value => Array.from(value).length;
export function normalize(value, key) {
  if (typeof value !== 'string') return DEFAULTS[key];
  const trimmed = value.trim();
  return trimmed && lengthOf(trimmed) <= LIMITS[key] ? trimmed : DEFAULTS[key];
}
export function readGift(hash) {
  const params = new URLSearchParams(hash.replace(/^#/,''));
  if (params.get('v') !== '1') return {...DEFAULTS};
  return {nombre:normalize(params.get('nombre'),'nombre'),frase:normalize(params.get('frase'),'frase')};
}
export function makeLink(base, values) {
  const url = new URL(base);
  url.hash = new URLSearchParams({v:'1',nombre:normalize(values.nombre,'nombre'),frase:normalize(values.frase,'frase')}).toString();
  return url.href;
}
