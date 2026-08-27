const u = (id: string, w = 1400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export type Weave = "Düz dokuma" | "Dimi" | "Saten" | "Örme" | "Krep";

export type Fabric = {
  id: string;
  name: string;
  composition: string;
  color: string;
  weave: Weave;
  /** g/m² */
  weight: number;
  /** % esneme */
  stretch: number;
  /** 0 sert — 100 akışkan */
  drape: number;
  /** kumaş eni, cm */
  width: number;
  /** ₺ / metre */
  price: number;
  /** desen tekrarı, cm — düz kumaşta null */
  repeat: number | null;
  image: string;
};

export const fabrics: Fabric[] = [
  {
    id: "ipek-krep",
    name: "İpek Krep",
    composition: "%100 Dut İpeği",
    color: "Fildişi",
    weave: "Krep",
    weight: 60,
    stretch: 2,
    drape: 92,
    width: 114,
    price: 1480,
    repeat: null,
    image: u("1619043518800-7f14be467dca"),
  },
  {
    id: "organik-keten",
    name: "Organik Keten",
    composition: "%100 Organik Keten",
    color: "Ham",
    weave: "Düz dokuma",
    weight: 160,
    stretch: 3,
    drape: 55,
    width: 140,
    price: 620,
    repeat: null,
    image: u("1686806374120-e7ae3f19801d"),
  },
  {
    id: "gabardin",
    name: "Gabardin",
    composition: "%97 Pamuk · %3 Elastan",
    color: "Karamel",
    weave: "Dimi",
    weight: 240,
    stretch: 12,
    drape: 35,
    width: 150,
    price: 410,
    repeat: null,
    image: u("1705493253566-1522b9015c58"),
  },
  {
    id: "denim",
    name: "Denim",
    composition: "%100 Pamuk · 12 oz",
    color: "İndigo",
    weave: "Dimi",
    weight: 407,
    stretch: 1,
    drape: 20,
    width: 150,
    price: 390,
    repeat: null,
    image: u("1631112230741-446762ee05ac"),
  },
  {
    id: "poplin",
    name: "Poplin",
    composition: "%100 Uzun Elyaf Pamuk",
    color: "Beyaz",
    weave: "Düz dokuma",
    weight: 110,
    stretch: 0,
    drape: 40,
    width: 150,
    price: 280,
    repeat: null,
    image: u("1604147706283-d7119b5b822c"),
  },
  {
    id: "yun-flanel",
    name: "Yün Flanel",
    composition: "%90 Yün · %10 Kaşmir",
    color: "Antrasit",
    weave: "Dimi",
    weight: 320,
    stretch: 4,
    drape: 48,
    width: 150,
    price: 1150,
    repeat: null,
    image: u("1699245111017-658557db0abb"),
  },
  {
    id: "pied-de-poule",
    name: "Pied-de-poule Yün",
    composition: "%100 Yün",
    color: "Kahve · Bej",
    weave: "Dimi",
    weight: 280,
    stretch: 3,
    drape: 42,
    width: 150,
    price: 980,
    repeat: 4,
    image: u("1705493254703-0eb2b654d538"),
  },
  {
    id: "viskon-saten",
    name: "Viskon Saten",
    composition: "%100 Viskon",
    color: "Pudra",
    weave: "Saten",
    weight: 130,
    stretch: 2,
    drape: 85,
    width: 140,
    price: 340,
    repeat: null,
    image: u("1617055407123-3d7130c1f940"),
  },
  {
    id: "triko-kasmir",
    name: "Triko Kaşmir",
    composition: "%100 Kaşmir",
    color: "Kum",
    weave: "Örme",
    weight: 210,
    stretch: 30,
    drape: 70,
    width: 160,
    price: 2600,
    repeat: null,
    image: u("1643313260651-9c335822ecde"),
  },
];
