import type { Aspect, ComposeRequest, Crop, Lighting, Placement } from "./types";

/* ------------------------------------------------------------------
   Prompt kurgusu — üç görsel sabit sırayla gönderilir:
   [1] kişi, [2] ürün, [3] sahne. Rolleri metin tanımlar; Gemini'de
   ayrı bir "referans tipi" alanı yoktur.

   Sadakat kayıplarının çoğu modelin ürünü "güzelleştirmesinden" doğar,
   bu yüzden yasaklar listesi görev tanımı kadar önemlidir.
   Şablon İngilizcedir: modeller bu dilde belirgin biçimde tutarlıdır.
   ------------------------------------------------------------------ */

const CROP_TEXT: Record<Crop, string> = {
  portre: "head-and-shoulders portrait, the product clearly visible",
  yarim: "waist-up three-quarter shot",
  tam: "full-body shot, the whole figure inside the frame",
  detay: "tight product close-up on the body, shallow depth of field",
};

const PLACEMENT_TEXT: Record<Placement, string> = {
  boyun: "around the neck, resting naturally on the collarbone",
  kulak: "on the ear lobe, correctly scaled to the face",
  bilek: "on the wrist, following the curve of the arm",
  el: "on the hand or finger, with correct finger anatomy",
  govde: "worn on the body as the garment it is, following the pose",
};

const LIGHTING_TEXT: Record<Lighting, string> = {
  sahne: "Inherit the lighting of IMAGE 3 exactly: same direction, colour temperature, contrast and shadow softness.",
  studyo: "Relight as a clean studio setup: large soft key light, gentle fill, neutral 5600 K, soft shadows.",
  altin: "Relight as golden hour: low warm sun from behind the subject, controlled rim light and gentle flare.",
  gece: "Relight as night: single hard key with warm practical lights in the background, deep but readable shadows.",
};

const ASPECT_TEXT: Record<Aspect, string> = {
  "3:4": "3:4 portrait",
  "4:5": "4:5 portrait",
  "1:1": "1:1 square",
  "16:9": "16:9 landscape",
};

export function buildPrompt(req: ComposeRequest): string {
  const note = req.note?.trim();

  return [
    "You are compositing a single editorial fashion photograph from three reference images.",
    "",
    "INPUT ROLES",
    "  IMAGE 1 — PERSON. Preserve facial identity, bone structure, skin tone and",
    "    hairline exactly as given. This face must stay recognisable as the same person.",
    "  IMAGE 2 — PRODUCT. Reproduce its exact geometry: silhouette, proportions,",
    "    stone count and cut, metal colour, engraving, seam lines, print and logo placement.",
    "  IMAGE 3 — SCENE. Use as the environment behind and around the person.",
    "",
    "TASK",
    `  Photograph the person from IMAGE 1 wearing the product from IMAGE 2, placed ${PLACEMENT_TEXT[req.placement]}.`,
    "  Composite them into the scene from IMAGE 3 so it reads as one real photograph.",
    `  Framing: ${CROP_TEXT[req.crop]}, ${ASPECT_TEXT[req.aspect]}.`,
    `  Lighting: ${LIGHTING_TEXT[req.lighting]}`,
    "",
    "HARD CONSTRAINTS",
    "  - Do not redesign, simplify, stylise or 'improve' the product in any way.",
    "  - Do not alter the person's face, body proportions or skin tone.",
    "  - Add no other jewellery, garments, text, logos, borders or watermarks.",
    "  - Exactly two hands with five fingers each; no duplicated or missing limbs.",
    "  - No visible cut-out edges or seams between the subject and the background.",
    "",
    "OUTPUT",
    "  One photorealistic editorial fashion photograph. Neutral colour grade.",
    "  No collage, no split frame, no caption.",
    ...(note ? ["", "ADDITIONAL DIRECTION FROM THE ART DIRECTOR", `  ${note}`] : []),
  ].join("\n");
}

/**
 * Onarım geçişi: kabul edilmeyen karede sıfırdan üretmek yerine tek bir
 * düzeltme istemek hem ucuz hem daha isabetli. (Faz 3'te devreye girecek.)
 */
export function buildRepairPrompt(what: string): string {
  return [
    "Keep the previous image identical in every respect —",
    "same person, same pose, same scene, same lighting, same framing —",
    `except for one correction: ${what}.`,
    "Do not re-imagine the composition.",
  ].join(" ");
}
