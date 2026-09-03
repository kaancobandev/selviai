import type {
  Aspect,
  ComposeRequest,
  Crop,
  IlhamEkseni,
  IlhamKategori,
  Lighting,
  Placement,
  TuretilmisTur,
} from "./types";

/* ------------------------------------------------------------------
   Prompt kurgusu — üç görsel sabit sırayla gönderilir:
   [1] kişi, [2] ürün, [3] sahne. Rolleri metin tanımlar; Gemini'de
   ayrı bir "referans tipi" alanı yoktur.

   Sadakat kayıplarının çoğu modelin ürünü "güzelleştirmesinden" doğar,
   bu yüzden yasaklar listesi görev tanımı kadar önemlidir.
   Şablon İngilizcedir: modeller bu dilde belirgin biçimde tutarlıdır.
   ------------------------------------------------------------------ */

/* Kırpma yönergesi ölçümde en zayıf halka çıktı: "detay" istendiğinde
   Flash ve Flash Lite normal portre üretiyordu (bkz. scripts/olcum).
   Bu yüzden her kırpma, karede neyin ne kadar yer kaplayacağını sayıyla
   söylüyor — "yakın çekim" gibi göreli ifadeler yeterli olmuyor. */
const CROP_TEXT: Record<Crop, string> = {
  portre:
    "head-and-shoulders portrait; the head and shoulders fill most of the frame " +
    "and the product is clearly legible",
  yarim: "waist-up three-quarter shot, the subject filling most of the frame height",
  tam: "full-body shot, the whole figure inside the frame",
  detay:
    "EXTREME CLOSE-UP on the product where it sits on the body. The product must " +
    "fill at least one third of the frame. Crop away the rest of the body and show " +
    "at most part of the face — a full portrait is wrong for this framing. " +
    "Shallow depth of field, the product in sharp focus",
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
    "  - Respect the requested framing exactly. It outranks the instinct to show the",
    "    whole person: if a close-up is asked for, deliver a close-up.",
    "",
    "OUTPUT",
    "  One photorealistic editorial fashion photograph. Neutral colour grade.",
    "  No collage, no split frame, no caption.",
    ...(note ? ["", "ADDITIONAL DIRECTION FROM THE ART DIRECTOR", `  ${note}`] : []),
  ].join("\n");
}

/* ==================================================================
   İLHAM — METİNDEN ÜRETİM

   Yukarıdaki şablon üç referans görselin rollerine kurulu ve metin
   moduna UYARLANAMAZ; o yüzden ayrı bir kurgu. Buradaki asıl tasarım
   sorunu "bir görsel üretmek" değil, DÖRT FARKLI görsel üretmek.

   Aynı prompt'u dört kez çağırmak dört benzer kare veriyor: model aynı
   isteğe aynı yerden yaklaşıyor. Bu yüzden her varyanta AYRI BİR EKSEN
   veriliyor — siluet, malzeme, renk, bağlam. Dördü de aynı fikri
   anlatıyor ama farklı bir kapıdan giriyor, yani kullanıcının seçimi
   gerçek bir seçim oluyor.
   ================================================================== */

const EKSEN_TEXT: Record<IlhamEkseni, string> = {
  siluet:
    "Lead with SILHOUETTE and proportion. Let the cut, volume and line of the " +
    "garment carry the idea; keep colour and surface quiet so the shape reads first.",
  malzeme:
    "Lead with MATERIAL. Make fabric behaviour the subject: weave, drape, weight, " +
    "sheen, transparency and how light sits in the surface. Frame close enough that texture is legible.",
  renk:
    "Lead with COLOUR. Build the frame around a decisive palette relationship; " +
    "let hue and tonal contrast do the work, with a simple silhouette.",
  baglam:
    "Lead with CONTEXT and styling. Place the idea in a setting that explains who " +
    "wears it and where; environment, layering and attitude carry the concept.",
};

const KATEGORI_TEXT: Record<IlhamKategori, string> = {
  moda: "a fashion design concept — garments, textiles and styling",
};

export function buildIlhamPrompt(
  istek: string,
  kategori: IlhamKategori,
  eksen: IlhamEkseni,
): string {
  return [
    `You are producing ONE reference image that explores ${KATEGORI_TEXT[kategori]}.`,
    "",
    "THE BRIEF",
    `  ${istek.trim().slice(0, 600)}`,
    "",
    "HOW TO APPROACH IT",
    `  ${EKSEN_TEXT[eksen]}`,
    "",
    "HARD CONSTRAINTS",
    "  - One single frame. No collage, no grid, no split panels, no before/after.",
    "  - No text, captions, labels, logos, watermarks or borders anywhere in the image.",
    "  - If a person appears: correct anatomy, exactly two hands with five fingers each.",
    "  - Do not imitate a living designer's signature look or a real brand's identity.",
    "",
    "OUTPUT",
    "  One photorealistic image with the quality of an editorial reference shot.",
    "  Neutral colour grade. Nothing illustrative or rendered-looking.",
  ].join("\n");
}

/* ------------------------------------------------------------------
   TÜRETİLMİŞ ÇIKTILAR

   Kullanıcı dört kareden birini seçtikten SONRA üretiliyor ve seçilen
   kare referans olarak modele geri veriliyor. Yani bunlar "metinden"
   değil "tek referanstan" üretim: amaç seçilen yönü DEĞİŞTİRMEK değil
   AÇMAK.

   Moodboard'da kolaj YASAĞI bilerek kaldırıldı — kompozisyon şablonunda
   kolaj bir kusurdu, burada istenen çıktının ta kendisi.
   ------------------------------------------------------------------ */

export function buildTuretilmisPrompt(tur: TuretilmisTur, istek: string): string {
  const brief = istek.trim().slice(0, 400);
  const ortak = [
    "",
    "HARD CONSTRAINTS",
    "  - Stay faithful to the reference image's palette, mood and material language.",
    "  - Do not introduce a different garment, a different season or a different attitude.",
    "  - No real brand marks, no imitation of an existing house's identity.",
  ];

  if (tur === "moodboard") {
    return [
      "The attached image is an approved design direction.",
      "Produce a MOODBOARD that expands it into a working reference sheet.",
      "",
      "THE BRIEF BEHIND IT",
      `  ${brief}`,
      "",
      "WHAT TO PRODUCE",
      "  A flat-lay composition of 6 to 9 overlapping references on a neutral surface:",
      "  fabric corners, colour chips, hardware and trim detail, a texture close-up,",
      "  a silhouette study and one atmospheric shot. Arranged, not perfectly gridded.",
      ...ortak,
      "  - No text or handwriting on the board.",
      "",
      "OUTPUT",
      "  One photorealistic overhead flat-lay. Even soft light, minimal shadow.",
    ].join("\n");
  }

  if (tur === "kumas") {
    return [
      "The attached image is an approved design direction.",
      "Produce a FABRIC STUDY for it.",
      "",
      "THE BRIEF BEHIND IT",
      `  ${brief}`,
      "",
      "WHAT TO PRODUCE",
      "  Four to six textile swatches laid flat and slightly overlapping, each a",
      "  different weight or weave that could realistically build this garment:",
      "  show weave structure, selvedge or cut edge, drape at the fold, and surface",
      "  finish. Close enough that a buyer could judge the hand of the cloth.",
      ...ortak,
      "  - No text, no swatch labels, no measuring tape, no hands.",
      "",
      "OUTPUT",
      "  One photorealistic overhead shot. Raking light so texture reads.",
    ].join("\n");
  }

  return [
    "The attached image is an approved design direction.",
    "Produce a BRAND IDENTITY SHEET that could belong to it.",
    "",
    "THE BRIEF BEHIND IT",
    `  ${brief}`,
    "",
    "WHAT TO PRODUCE",
    "  A flat-lay of physical brand collateral for an INVENTED label: a woven",
    "  care label, a hangtag on cord, a folded garment bag corner and a business",
    "  card, resting on a surface that matches the direction's material world.",
    "  Shapes, colour and material only — the identity is carried by the objects.",
    ...ortak,
    "  - Any lettering must be illegible or abstract. Do not invent a readable",
    "    brand name; the designer will set the name later.",
    "",
    "OUTPUT",
    "  One photorealistic overhead flat-lay. Soft directional light.",
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
