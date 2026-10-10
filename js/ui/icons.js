/**
 * Íconos SVG chicos para armas, pasivas e interfaz. Usan currentColor,
 * así toman el color del texto que los rodea.
 */

const P = {
  // Armas
  blaster: '<path d="M12 3v10M8 6v9M16 6v9"/><path d="M6 21h12"/>',
  escopeta: '<path d="M12 20 5 6M12 20l7-14M12 20V5"/><circle cx="5" cy="5" r="1"/><circle cx="19" cy="5" r="1"/><circle cx="12" cy="4" r="1"/>',
  laser: '<path d="M12 21V3"/><path d="M9 21V8M15 21V8" opacity=".5"/>',
  misiles: '<path d="M7 18c0-6 2-11 5-14 3 3 5 8 5 14"/><path d="M7 18l-2 3M17 18l2 3M12 12v9"/>',
  drones: '<rect x="9" y="9" width="6" height="6"/><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/>',
  sierras: '<circle cx="12" cy="12" r="4"/><path d="M12 3l2 3h-4zM21 12l-3 2v-4zM12 21l-2-3h4zM3 12l3-2v4z"/>',
  rayo: '<path d="M13 2 6 13h5l-1 9 8-12h-5z"/>',
  nova: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" opacity=".6"/><circle cx="12" cy="12" r="10" opacity=".3"/>',
  minas: '<circle cx="12" cy="13" r="5"/><path d="M12 4v4M12 18v3M4 13h3M17 13h3M6.5 7.5l2 2M15.5 7.5l-2 2"/>',
  bumeran: '<path d="M5 19c2-7 7-12 14-14-3 4-5 8-5 14z"/>',
  // Pasivas
  calibre: '<path d="M8 21V9l4-6 4 6v12z"/><path d="M8 15h8"/>',
  gatillo: '<path d="M4 12h9M4 7h12M4 17h12"/><path d="M17 5l4 7-4 7"/>',
  blindaje: '<path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6z"/>',
  nanobots: '<path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/>',
  iman: '<path d="M6 4v8a6 6 0 0 0 12 0V4"/><path d="M6 4h3M15 4h3"/>',
  propulsor: '<path d="M12 3l5 9h-3v6h-4v-6H7z"/><path d="M10 21h4"/>',
  area: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><circle cx="12" cy="12" r="3"/>',
  multi: '<path d="M8 21V7M16 21V7"/><path d="M5 10l3-4 3 4M13 10l3-4 3 4"/>',
  escudo: '<path d="M4 14a8 8 0 0 1 16 0"/><path d="M7 14a5 5 0 0 1 10 0"/>',
  suerte: '<circle cx="9" cy="9" r="3.5"/><circle cx="15" cy="9" r="3.5"/><circle cx="9" cy="15" r="3.5"/><circle cx="15" cy="15" r="3.5"/>',
  lente: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  // Interfaz
  heal: '<path d="M12 5v14M5 12h14"/>',
  scrap: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><circle cx="12" cy="12" r="3"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
};

/** Devuelve el SVG del ícono `id` (o un círculo si no existe). */
export function icon(id, size = 22) {
  const body = P[id] || '<circle cx="12" cy="12" r="6"/>';
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
