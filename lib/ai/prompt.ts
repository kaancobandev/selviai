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

   ÇIKTI TASARIM DEĞİL, İLHAM KAYNAĞI. İlk sürümde eksenler siluet /
   malzeme / renk / bağlam idi ve dördü de GİYSİ çiziyordu — yani
   kullanıcıya dört ayrı tasarım taslağı sunuluyordu. Yanlıştı: "ilham"
   tasarımın kendisi değil, tasarımın NEYDEN doğduğu. Bir maymun, bir
   papatya, bir tablo. Tasarımcı önce kaynağı seçer, giysi ondan sonra
   gelir; zaten türetilmiş çıktılar (moodboard, kumaş, marka ve giysi
   silueti) seçilen kaynaktan üretiliyor. Giysiyi çizen tek yer orası —
   burada yasak olması onun için, ona rağmen değil.

   Aynı prompt'u dört kez çağırmak dört benzer kare veriyor: model aynı
   isteğe aynı yerden yaklaşıyor. Bu yüzden her varyanta AYRI BİR KAYNAK
   TÜRÜ veriliyor — doğa, sanat, doku, mekân. Dördü de aynı isteğin
   duygusunu taşıyor ama bambaşka yerlerden geliyor, yani kullanıcının
   seçimi gerçek bir seçim oluyor.
   ================================================================== */

const EKSEN_TEXT: Record<IlhamEkseni, string> = {
  doga:
    "Draw from NATURE. A single living or natural subject that carries the brief's " +
    "feeling: an animal, a plant, a mineral, a landscape, weather, water, light through " +
    "leaves. Photographic, close and specific — one creature or one form, not a scene full " +
    "of things.",
  sanat:
    "Draw from ART. An original artwork in the spirit of a painting, print or sculpture " +
    "whose mood matches the brief — brush, ink, pigment, canvas grain, chisel marks. " +
    "Evoke a movement or a technique; do NOT reproduce or closely imitate any specific " +
    "existing artwork or any living artist's signature style. This one is a made image, " +
    "not a photograph.",
  doku:
    "Draw from MATTER. A macro study of a surface that holds the brief's feeling: stone, " +
    "rust, bark, cracked glaze, woven fibre, wet asphalt, oxidised metal, paper. Fill the " +
    "frame with the surface so structure and patina are legible. No object, no scene.",
  mekan:
    "Draw from PLACE. An architectural or man-made subject that sets the brief's mood: a " +
    "doorway, a stair, an interior corner, a street surface, a piece of hardware or a tool. " +
    "Light and material tell the story. No people.",
};

const KATEGORI_TEXT: Record<IlhamKategori, string> = {
  moda: "will later become a fashion design — garments, textiles and styling",
};

export function buildIlhamPrompt(
  istek: string,
  kategori: IlhamKategori,
  eksen: IlhamEkseni,
): string {
  return [
    "You are producing ONE INSPIRATION IMAGE: the thing a designer would pin to a wall",
    `BEFORE designing. The work that ${KATEGORI_TEXT[kategori]} comes later, from this.`,
    "",
    "WHAT THE DESIGNER ASKED FOR",
    `  ${istek.trim().slice(0, 600)}`,
    "",
    "READ THE REQUEST FOR ITS FEELING, NOT ITS OBJECTS.",
    "  Take its mood, palette, weather, material and story — then find a SUBJECT FROM THE",
    "  WORLD that carries that same feeling. If the request describes a navy jacket in the",
    "  rain, the inspiration might be a crow's wet wing, a storm over slate, an ink wash,",
    "  or rain on cobblestone — never the jacket itself.",
    "",
    "WHERE TO LOOK",
    `  ${EKSEN_TEXT[eksen]}`,
    "",
    "HARD CONSTRAINTS",
    "  - DO NOT show clothing, garments, outfits, fashion models or styled people.",
    "    This is the single most important rule: the image is the SOURCE, not the design.",
    "  - No people at all unless the chosen subject genuinely is a person's hand or form,",
    "    and even then never as a fashion or clothing shot.",
    "  - One single frame. No collage, no grid, no split panels, no before/after.",
    "  - No text, captions, labels, logos, watermarks or borders anywhere in the image.",
    "  - Do not reproduce a specific existing artwork, a real brand's identity, or a",
    "    living artist's or designer's signature look.",
    "",
    "OUTPUT",
    "  One rich, specific image with the quality of a reference plate: strong subject,",
    "  honest light, a palette a designer could lift straight into a collection.",
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

   SİLUET ÖTEKİLERDEN BAŞKA BİR ŞEY İSTİYOR. Üçü referansı AÇIYOR (aynı
   dünyanın başka nesneleri), siluet ise ondan bir giysi TASARLAMAK
   zorunda: referans bir karga, bir doku, bir kapı eşiği — ortada
   kopyalanacak giysi yok. Bu yüzden istem "bunu çevir" değil "bundan bir
   giysi tasarla ve yalnız onu göster" diye kuruluyor.

   KARE ORAN KALDI (1:1). Dikey kare siluet için daha iyi okunurdu ama
   oran iş kaydında TEK alan (TuretilmisInput.aspect) ve dördü de onunla
   üretiliyor; türe bağlamak tipi, uç doğrulamasını ve pencerenin kare
   ızgarasını birlikte değiştirmek olurdu. Bedeli istemde ödeniyor:
   giysinin tamamı kenarlarda pay bırakarak kareye sığmak zorunda.
   ------------------------------------------------------------------ */

export function buildTuretilmisPrompt(tur: TuretilmisTur, istek: string): string {
  const brief = istek.trim().slice(0, 400);
  const ortak = [
    "",
    "HARD CONSTRAINTS",
    "  - Stay faithful to the reference image's palette, mood and material language.",
    "  - Do not drift to a different palette, season or attitude.",
    "  - No real brand marks, no imitation of an existing house's identity.",
  ];

  if (tur === "moodboard") {
    return [
      "The attached image is the INSPIRATION the designer chose — a source from the",
      "world (nature, art, a surface, a place), not a garment. Translate its palette,",
      "texture and mood into fashion work.",
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
      "The attached image is the INSPIRATION the designer chose — a source from the",
      "world (nature, art, a surface, a place), not a garment. Translate its palette,",
      "texture and mood into fashion work.",
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

  if (tur === "siluet") {
    return [
      "The attached image is the INSPIRATION the designer chose — a source from the",
      "world (nature, art, a surface, a place), not a garment. It is NOT a thing to",
      "photograph again: DESIGN ONE GARMENT out of it and show that garment alone.",
      "",
      "THE BRIEF BEHIND IT",
      `  ${brief}`,
      "",
      "WHAT TO PRODUCE",
      "  A SINGLE garment, seen straight from the front, centred, filling most of the",
      "  frame. Either laid perfectly flat or worn on an invisible mannequin — cut,",
      "  seam lines, proportion and the way the cloth falls must all read clearly.",
      "  Background: one plain, evenly lit, single flat colour, so the outline of the",
      "  garment separates from it cleanly. No set, no surface texture, no props.",
      "  Palette, material feeling and mood come from the reference; the shapes are",
      "  yours — this is the design the reference leads to.",
      ...ortak,
      "  - No human model, no face, no hands, no hair, no skin anywhere in the frame.",
      "  - One garment only: no second piece, no shoes, no accessories, no hanger.",
      "  - No text, no logos, no labels, no collage, no grid, no second view.",
      "",
      "OUTPUT",
      "  One photorealistic garment shot on a plain ground. The WHOLE garment inside",
      "  the frame with a margin on every side — nothing cropped at shoulder, sleeve",
      "  or hem. Even, soft light; minimal shadow.",
    ].join("\n");
  }

  return [
    "The attached image is the INSPIRATION the designer chose — a source from the",
    "world (nature, art, a surface, a place), not a garment. Translate its palette,",
    "texture and mood into fashion work.",
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
 * KOLAJ KESİMİ — konuyu zeminden ayırma.
 *
 * ŞEFFAFLIK İSTENMİYOR ÇÜNKÜ MODEL VEREMİYOR. Ölçüldü: "transparan
 * arka planlı PNG" istendiğinde çıktı alfa kanalsız JPEG dönüyor
 * (hasAlpha: false) ve köşe pikseli düz gri (174,165,158) — yani zemin
 * saydam değil, sadece sade. Alfa üzerinden katmanlama imkânsız.
 *
 * Bu yüzden klasik yeşil-perde yöntemi: model konuyu DÜZ ANAHTAR RENGE
 * oturtuyor, saydamlığı tarayıcı açıyor. Macenta seçildi çünkü moda
 * fotoğrafında neredeyse hiç bulunmuyor — ten, kumaş ve toprak tonları
 * ondan uzak, dolayısıyla yanlışlıkla silinen piksel az.
 *
 * Ölçüm (tek kare, gemini görsel ucu): zeminin %48,1'i tam (255,0,255),
 * %0,7'si yakın-macenta saçak, siluet kenarı temiz, 11,6 saniye.
 * Kalan zemin pikselleri tam maceta değil ama macentaya yakın; eşik
 * lib/kolaj.ts içinde ölçüme göre ayarlı.
 */
export const ANAHTAR_RENK = { r: 255, g: 0, b: 255 } as const;

export function buildKesimPrompt(istek: string): string {
  const brief = istek.trim().slice(0, 300);
  return [
    "Cut the MAIN SUBJECT out of the attached image and place it alone",
    "on a solid background.",
    "",
    "THE DIRECTION IT BELONGS TO",
    `  ${brief}`,
    "",
    "BACKGROUND — THIS IS THE CRITICAL PART",
    "  Fill the ENTIRE background with ONE completely flat, uniform colour:",
    "  pure magenta, RGB (255, 0, 255), hex #FF00FF.",
    "  Absolutely no gradient, no vignette, no texture, no shadow cast on it,",
    "  no lighting falloff, no reflection of the subject onto it.",
    "  Every background pixel must be the exact same magenta.",
    "  The subject itself must contain NO magenta anywhere.",
    "",
    "SUBJECT",
    "  Keep the garment, figure or object exactly as it appears: same shape,",
    "  same proportions, same fabric, same colour, same lighting on the subject.",
    "  Do not restyle it, do not change the pose, do not add or remove anything.",
    "  Keep the full silhouette in frame with a small margin on every side.",
    "  Crisp, clean edges — no soft glow or feathering into the background.",
    "",
    "OUTPUT",
    "  One image. The subject, cut out, on flat magenta. No text, no watermark,",
    "  no drop shadow, no border, no frame.",
  ].join("\n");
}

/* ------------------------------------------------------------------
   ÇEKİM LİSTESİ

   Ekli referans, kullanıcının TASARLADIĞI giysi: siluet karesi — düz
   zeminde, önden, tek parça (bkz. buildTuretilmisPrompt/"siluet").
   Buradaki görev onu YENİDEN TASARLAMAK değil, FOTOĞRAFLAMAK: bir
   manken üzerinde, gerçek bir mekânda, istenen kadraj ve ışıkla.

   Sadakat bu istemin tek en önemli kısıtı. Öteki türetilmiş çıktılarda
   model referansı "açmakta" serbest; burada değil — kare kullanıcının
   kendi tasarımının kampanya fotoğrafı, giysi değişirse çıktı yanlış.

   KADRAJ VE IŞIK HARİTALARI YENİDEN YAZILMADI. Dosyanın başındaki
   CROP_TEXT ve LIGHTING_TEXT tam bu kelime dağarcığı için yazılmıştı;
   kırpma metni ölçümle sertleştirilmiş (bkz. oradaki yorum) ve ikinci
   bir kopya ilk sapmada sessizce ayrışırdı. Tek fark: o metinler
   "the product" diyor, burada ürün giysinin kendisi — istem bunu bir
   satırda açıkça bağlıyor.
   ------------------------------------------------------------------ */

/**
 * "sahne" ışığı BU ARAÇTA YOK.
 *
 * Değeri "IMAGE 3'ün ışığını birebir devral" demek ve burada üçüncü
 * görsel yok: elimizdeki tek referans, giysinin DÜZ ZEMİNDEKİ yassı
 * ışıkla çekilmiş karesi. Onu devralmak, editoryal kare isterken
 * ürün fotoğrafının ışığını kopyalamak olurdu — yani seçeneğin
 * vaadinin tam tersi.
 *
 * ARAYÜZ BU DEĞERİ SUNMAMALI: çekim masası yalnız stüdyo / altın /
 * gece göstermeli (components/shoot-desk.tsx — o dosya bu ajanın
 * kapsamı dışında, karar buraya yazılıyor). Uç yine de LIGHTINGS'e
 * göre doğruladığı için "sahne" teknik olarak geçebilir; o zaman
 * ücretli bir üretimi reddetmek yerine aşağıdaki gün ışığına düşüyor.
 */
const CEKIM_ISIK_YEDEK =
  "Light it as honest natural daylight in the chosen setting: soft directional " +
  "daylight, neutral colour temperature, gentle shadows with visible direction.";

export function buildCekimPrompt(crop: Crop, lighting: Lighting, istek: string): string {
  const brief = istek.trim().slice(0, 400);
  const isik = lighting === "sahne" ? CEKIM_ISIK_YEDEK : LIGHTING_TEXT[lighting];

  return [
    "The attached image is a GARMENT the designer created, photographed alone on a",
    "plain background. Your job is to shoot THAT EXACT GARMENT as a single editorial",
    "fashion photograph: worn by a model, in a real setting, as a campaign frame.",
    "",
    "THE DIRECTION IT BELONGS TO",
    `  ${brief}`,
    "",
    "GARMENT FIDELITY — THIS IS THE MOST IMPORTANT RULE",
    "  The garment in the attached image is the design itself. Reproduce it exactly:",
    "  same cut and silhouette, same colour, same fabric and surface, same seam lines,",
    "  closures, collar, sleeve and hem, same proportions, same details and trim.",
    "  Do not redesign, restyle, simplify, embellish or 'improve' it. Do not change",
    "  its length, its neckline or its colour. It should be recognisable as the same",
    "  piece, now worn instead of laid flat.",
    "",
    "THE SHOT",
    "  One model wearing the garment, in a real location or set that suits the",
    "  direction above. Natural pose, alive rather than posed like a mannequin.",
    `  Framing: ${CROP_TEXT[crop]}. Here 'the product' means the garment itself.`,
    `  Lighting: ${isik}`,
    "",
    "HARD CONSTRAINTS",
    "  - Exactly two hands with five fingers each; two arms, two legs; no duplicated,",
    "    missing or deformed limbs; correct joint anatomy.",
    "  - Add no second garment that competes with it and no loud accessories; anything",
    "    else in frame stays quiet and plausible.",
    "  - No text, captions, labels, logos, watermarks, borders or frames anywhere.",
    "  - No real brand marks and no imitation of an existing house's identity.",
    "  - One single frame. No collage, no grid, no split panels, no second view,",
    "    no before/after.",
    "  - Respect the requested framing exactly. It outranks the instinct to show the",
    "    whole look: if a close-up is asked for, deliver a close-up.",
    "",
    "OUTPUT",
    "  One photorealistic editorial fashion photograph. Neutral colour grade,",
    "  believable depth of field, the garment reading clearly at the requested framing.",
  ].join("\n");
}

/* ==================================================================
   TEKNİK ÇİZİM (FLAT)

   NEDEN SİLUET KARESİ YETMİYOR. Teknik çizim aracı krokinin arkasına bir
   altlık koyup üstünden çizdiriyor; oraya bugüne kadar siluet karesi
   konuyordu ama o bir FOTOĞRAF — perspektifi, gölgesi, kırışığı var ve
   içinde beden var. Üstünden çizmek için kötü bir kılavuz.

   İstenen şey endüstrinin flat'i: düz yatık, simetrik, gölgesiz, siyah
   yapı çizgileriyle. Flat krokiyle doğal olarak hizalanıyor çünkü ikisi
   de önden ve simetrik.

   RENK SONRADAN İSTENDİ. İlk sürüm saf çizgi resmiydi — "renk dolgusu
   yok" açıkça yazılıydı — çünkü amaç üstünden çizilecek bir kılavuzdu.
   Sahibi renkli olmasını istedi ve bu makul: endüstride RENKLİ FLAT
   ayrı bir artefakt, line sheet'in kendisi. Çizgiler duruyor, altına
   düz renk giriyor; yani hem kılavuz hem sunum işi görüyor.

   ZEMİN BEYAZ KALMAK ZORUNDA ve bu artık yalnız estetik değil: arayüz
   flat'i krokiye oturtmak için karedeki beyaz olmayan pikselleri tarayıp
   giysinin sınırlarını buluyor (bkz. components/flat-sketch.tsx). Zemin
   renklenirse o ölçüm çöker.

   REFERANS GİYSİ FOTOĞRAFI, İSTENEN ŞEY ONUN ÇİZİMİ. Yani bu bir
   "tasarla" işi değil, bir ÇEVİRİ işi: tasarım sabit, değişen yalnız
   anlatım biçimi. İstemin en sert kısıtı da bu.
   ================================================================== */

const TEKNIK_GORUNUM: Record<"on" | "arka", string> = {
  on:
    "This is the FRONT view. Show the front of the garment: neckline or collar and lapel, " +
    "front closure (buttons, zip or wrap) drawn on the correct side, front pockets, front " +
    "darts or princess seams, cuff and hem finishes.",
  arka:
    "This is the BACK view of the SAME garment. It must agree with the front in every " +
    "measurable way: identical length, identical width, identical shoulder slope, identical " +
    "sleeve length and identical hem line. Show what belongs to the back: back yoke, centre " +
    "back seam, back darts, vent or pleat, and any detail that wraps round from the front.",
};

export function buildTeknikPrompt(gorunum: "on" | "arka", istek: string): string {
  const brief = istek.trim().slice(0, 300);

  return [
    "The attached image is a photograph of a garment the designer created.",
    "Redraw that SAME garment as a TECHNICAL FLAT — the line drawing a factory works from.",
    "",
    "THE DIRECTION IT BELONGS TO",
    `  ${brief}`,
    "",
    "THIS IS A TRANSLATION, NOT A NEW DESIGN",
    "  The garment is fixed. Same silhouette, same proportions, same length, same collar,",
    "  same closure, same pockets, same sleeve. Only the way it is DRAWN changes.",
    "",
    "HOW A COLOURED TECHNICAL FLAT LOOKS",
    "  - A line drawing WITH FLAT COLOUR: black construction lines drawn on top of even,",
    "    solid colour fill. This is the industry's coloured flat, not a rendering.",
    "  - The fill takes the garment's OWN colours from the reference. Every panel that is a",
    "    different colour or a different material in the reference stays different here.",
    "  - The colour is FLAT: one even tone per area. No shading, no gradient, no highlight,",
    "    no drop shadow, no fabric photograph, no 3D rendering, no depth of any kind.",
    "  - The black lines stay fully visible ON TOP of the colour — seams, topstitching and",
    "    closures must read as clearly as they would on white.",
    "  - The BACKGROUND stays pure white, edge to edge. Only the garment is coloured.",
    "  - The garment lies perfectly FLAT and SYMMETRIC, as if laid on a table, seen straight",
    "    on from directly above. Sleeves out to the sides, not folded.",
    "  - NOT on a body, NOT on a mannequin, NOT on a hanger, not worn. No human, no head,",
    "    no hands, no legs anywhere in the frame.",
    "  - Construction must read clearly: seam lines, dart placement, topstitching drawn as",
    "    dashed lines, closures (buttons, buttonholes, zip teeth, snaps), pocket openings,",
    "    collar and lapel shape, cuff, waistband and hem finishes.",
    "  - Line weight is deliberate: a heavier outline for the silhouette, lighter lines for",
    "    internal construction, dashed for topstitching.",
    "  - The garment is centred and fills the frame with a small, even margin on all sides.",
    "",
    "VIEW",
    `  ${TEKNIK_GORUNUM[gorunum]}`,
    "",
    "HARD CONSTRAINTS",
    "  - One garment, one view, one frame. No second view beside it, no collage, no grid.",
    "  - No text, no labels, no callouts, no arrows, no measurements, no size chart,",
    "    no logos, no watermark, no border, no title block.",
    "  - Pure white background, edge to edge. No paper texture, no grid paper, no desk.",
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
