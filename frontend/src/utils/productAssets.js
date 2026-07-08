import { localizeNumbers, bnPct } from "./banglaFormat";
const PRODUCT_IMAGE_FILES = [
  "360_F_177224431_6S50Gr64wFWjkDHBGXq7PkaG5kcrgEgd.jpg",
  "alachi_lemon.jpg",
  "amalki.jpg",
  "apple.jpg",
  "ata_loose_white.jpg",
  "ata_packet.jpg",
  "banana_chapa.jpeg",
  "banana_sabri_high_quality.jpeg",
  "banana_sabri_ordinary.jpeg",
  "banana_sagar_high_quality.jpg",
  "banana_sagar_ordinary.jpg",
  "barbati_yardlong_bean.jpg",
  "beanordinary.jpg",
  "beansuperior_quality.jpg",
  "beef.jpg",
  "brinjal_ordinary_quality.jpg",
  "brinjal_superior_quality.jpg",
  "broiler_chicken.jpg",
  "cabbage_1011.jpg",
  "cagoji_lemon - Copy.jpg",
  "carrot.jpg",
  "cauliflower.jpg",
  "celeriac_olcopy.jpg",
  "chalcumra_water_gourd.jpg",
  "chichinga_snakegourd.jpg",
  "chicken.jpg",
  "chickpeas_imported.jpg",
  "chilli_imported.jpg",
  "chinigura_rice.jpeg",
  "chira.jpg",
  "coconut.jpg",
  "coriander_seed_old.jpg",
  "cucumber_hybrid.jpg",
  "cucumber_local.jpg",
  "danta.jpg",
  "dhundol.jpg",
  "dragon.jpg",
  "dried_chili_barisalraypurchandpur_ordinary.jpg",
  "dried_chili_barisalraypurchandpur_superior.jpg",
  "dried_chili_bograrangpur_ordinary.jpg",
  "dried_chili_bograrangpur_superior.jpg",
  "dried_chili_imported_ordinary.jpg",
  "dried_chili_local_ordinary.jpg",
  "dried_chili_local_superior.jpg",
  "egg.jpg",
  "egg_duck_local.jpeg",
  "egg_farm_red.jpg",
  "egg_farm_white.jpeg",
  "egg_hen_local.jpg",
  "farm_raised_hen.jpg",
  "flour_loose.jpg",
  "flour_packet.jpeg",
  "garlic.jpg",
  "garlic_imported.jpg",
  "garlic_local_big_size.jpg",
  "ginger.jpg",
  "ginger_imported.jpg",
  "ginger_local_new.jpg",
  "ginger_local_old.jpg",
  "gram_broken.jpg",
  "gram_whole.jpg",
  "grapes.jpg",
  "grass_carp.jpg",
  "green_banana.jpeg",
  "green_chili_local.jpg",
  "green_coconut.jpg",
  "green_papaya.jpg",
  "guava.jpg",
  "guava_kazi.jpg",
  "hilsha_500_900_gm.jpg",
  "jackfruit_big_above_4_kg.jpg",
  "jhinga_tasle_gourd.jpg",
  "kai.jpeg",
  "kakroll.jpg",
  "kalojira.jpg",
  "karalla.jpeg",
  "katla_big_above_5_kg.jpeg",
  "katla_local.jpeg",
  "katla_medium_2_50_4_50_kg.jpeg",
  "katla_small_1_50_2_00_kg.jpeg",
  "khejur_date.jpg",
  "khesari.jpg",
  "khirai_small_cucumber.jpg",
  "kochur_loti_aroid_succer.jpg",
  "lady_s_finger_okra.jpg",
  "lao_bottle_gourd.jpg",
  "lentils_desi_whole.jpg",
  "local_duck_big_above_900_gm - Copy.jpeg",
  "local_duck_big_above_900_gm.jpeg",
  "local_hen_big_above_900_gm.jpg",
  "local_hen_medium_700_850_gm.jpg",
  "local_white.jpeg",
  "malabar_spinach_puisak.jpg",
  "mango_amropali.jpg",
  "mango_himsagar.jpg",
  "mango_langra.jpg",
  "mash_broken.jpeg",
  "mash_kalai_whole.jpeg",
  "masur_imported_ordinary.jpg",
  "masur_imported_superior_quality.jpg",
  "masur_whole_local.jpg",
  "milk_powder_bag.jpg",
  "motar_peas_imported.jpg",
  "motar_peas_local.jpg",
  "motorshooti_peas.jpg",
  "mregal_big.jpeg",
  "mregal_small.jpeg",
  "mukhi_cachue_aroid.jpg",
  "mung_imported.jpeg",
  "mung_local.jpeg",
  "muri.jpg",
  "mustard.jpg",
  "mustard_oil_local_ordinary.jpeg",
  "mutton.jpeg",
  "mutton_male.jpeg",
  "onion_imported.jpg",
  "onion_local.jpg",
  "onion_new.jpg",
  "orange.jpg",
  "paddy_boro_coarse.jpg",
  "paddy_medium_boro.jpg",
  "palm_oil.jpeg",
  "pangash_big.jpeg",
  "pangash_small.jpeg",
  "pineapple_kelenga.jpg",
  "poah.jpg",
  "potato_holland_red.jpeg",
  "potato_holland_red_old.jpeg",
  "potato_holland_white_new.jpg",
  "potato_holland_white_old.jpg",
  "potato_local.jpg",
  "potato_local_old.jpg",
  "pumpkin_sweet_gourd.jpg",
  "radish_china.jpg",
  "radish_local.jpg",
  "red_spinach.jpg",
  "rice_aman_coarse.jpg",
  "rice_aman_fine.jpg",
  "rice_aman_medium.jpg",
  "rice_aman_pajam.jpg",
  "rice_amon_hybrid_coarse.jpg",
  "rice_amon_hybrid_medium.jpg",
  "rice_amon_hybrid_narrow.jpg",
  "rice_boro_fine.jpg",
  "rice_boro_hybrid_coarse.jpg",
  "rice_boro_hybrid_fine.jpg",
  "rice_boro_hybrid_medium.jpg",
  "rice_boro_medium.jpg",
  "ricel_boro_mota.jpg",
  "ruhi_imported_medium_2_50_4_50_kg.jpg",
  "ruhi_local_big_above_5_kg.jpg",
  "ruhi_local_medium_2_50_4_50_kg.jpg",
  "ruhi_local_small_1_50_2_00_kg.jpg",
  "rupchanda.jpg",
  "silver_carp.jpg",
  "singhi.jpg",
  "small_mung_local_super_quality.jpeg",
  "sonali_chicken.jpg",
  "soyabin_oil_1_lit_bottle.jpg",
  "soyabin_oil_5_liter_bottle.jpeg",
  "soybean_oilloose - Copy (3).jpg",
  "soybean_oilloose - Copy.jpg",
  "soybean_oilloose.jpg",
  "spices.jpg",
  "spinach_palongsak.jpg",
  "telapianilotica.jpeg",
  "tomato.jpg",
  "turmeric_local_long_ordinary.jpg",
  "turmeric_local_long_superior.jpg",
  "turnip.jpg",
  "uchehhe_bitter_gourd.jpg",
  "watermelon.jpg",
  "jackfruit_small.jpg",
  "patal_pointed_gourd.jpg",
  "imported_red.jpeg",
];

const DEFAULT_IMAGE = "360_F_177224431_6S50Gr64wFWjkDHBGXq7PkaG5kcrgEgd.jpg";

export const PRODUCT_CATEGORIES = [
  { id: "all", label: "সব পণ্য", icon: "🛍️" },
  { id: "rice_grain", label: "চাল ও শস্য", icon: "🌾" },
  { id: "vegetables", label: "সবজি", icon: "🥬" },
  { id: "fish_meat", label: "মাছ ও মাংস", icon: "🐟" },
  { id: "egg_dairy", label: "ডিম ও দুধ", icon: "🥚" },
  { id: "fruits", label: "ফল", icon: "🍎" },
  { id: "oil_spice", label: "তেল ও মসলা", icon: "🫙" },
  { id: "pulses", label: "ডাল", icon: "🫘" },
  { id: "other", label: "অন্যান্য", icon: "🧺" },
];

export const PRODUCT_NAME_BN = {
  alachi_lemon: "এলাচি লেবু",
  amalki: "আমলকী",
  apple: "আপেল",
  ata_loose_white: "খোলা আটা",
  ata_packet: "প্যাকেট আটা",
  banana_chapa: "চাপা কলা",
  banana_sabri_high_quality: "ভালো মানের সবরি কলা",
  banana_sabri_ordinary: "সাধারণ সবরি কলা",
  banana_sagar_high_quality: "ভালো মানের সাগর কলা",
  banana_sagar_ordinary: "সাধারণ সাগর কলা",
  barbati_yardlong_bean: "বরবটি",
  beanordinary: "সাধারণ শিম",
  beansuperior_quality: "ভালো মানের শিম",
  beef: "গরুর মাংস",
  brinjal_ordinary_quality: "সাধারণ বেগুন",
  brinjal_superior_quality: "ভালো মানের বেগুন",
  broiler_chicken: "ব্রয়লার মুরগি",
  cabbage_1011: "বাঁধাকপি",
  cagoji_lemon: "কাগজি লেবু",
  carrot: "গাজর",
  cauliflower: "ফুলকপি",
  celeriac_olcopy: "ওলকপি",
  chalcumra_water_gourd: "চালকুমড়া",
  chichinga_snakegourd: "চিচিঙ্গা",
  chicken: "মুরগি",
  chickpeas_imported: "আমদানি ছোলা",
  chilli_imported: "আমদানি কাঁচা মরিচ",
  chinigura_rice: "চিনিগুঁড়া চাল",
  chira: "চিড়া",
  coconut: "নারকেল",
  coriander_seed_old: "পুরনো ধনে",
  cucumber_hybrid: "হাইব্রিড শসা",
  cucumber_local: "দেশি শসা",
  danta: "ডাঁটা",
  dhundol: "ধুন্দল",
  dragon: "ড্রাগন ফল",
  dried_chili_barisalraypurchandpur_ordinary: "সাধারণ শুকনা মরিচ",
  dried_chili_barisalraypurchandpur_superior: "ভালো মানের শুকনা মরিচ",
  dried_chili_bograrangpur_ordinary: "সাধারণ শুকনা মরিচ",
  dried_chili_bograrangpur_superior: "ভালো মানের শুকনা মরিচ",
  dried_chili_imported_ordinary: "আমদানি শুকনা মরিচ",
  dried_chili_local_ordinary: "দেশি শুকনা মরিচ",
  dried_chili_local_superior: "ভালো মানের দেশি শুকনা মরিচ",
  egg: "ডিম",
  egg_duck_local: "দেশি হাঁসের ডিম",
  egg_farm_red: "লাল ফার্মের ডিম",
  egg_farm_white: "সাদা ফার্মের ডিম",
  egg_hen_local: "দেশি মুরগির ডিম",
  farm_raised_hen: "ফার্মের মুরগি",
  flour_loose: "খোলা ময়দা",
  flour_packet: "প্যাকেট ময়দা",
  garlic: "রসুন",
  garlic_imported: "আমদানি রসুন",
  garlic_local_big_size: "বড় দেশি রসুন",
  ginger: "আদা",
  ginger_imported: "আমদানি আদা",
  ginger_local_new: "নতুন দেশি আদা",
  ginger_local_old: "পুরনো দেশি আদা",
  gram_broken: "ভাঙা ছোলা",
  gram_whole: "পুরো ছোলা",
  grapes: "আঙুর",
  grass_carp: "গ্রাস কার্প মাছ",
  green_banana: "কাঁচা কলা",
  green_chili_local: "দেশি কাঁচা মরিচ",
  green_coconut: "ডাব",
  green_papaya: "কাঁচা পেঁপে",
  guava: "পেয়ারা",
  guava_kazi: "কাজী পেয়ারা",
  hilsha_500_900_gm: "ইলিশ মাছ ৫০০–৯০০ গ্রাম",
  jackfruit_big_above_4_kg: "বড় কাঁঠাল",
  jackfruit_small: "ছোট কাঁঠাল",
  jhinga_tasle_gourd: "ঝিঙা",
  kai: "কৈ মাছ",
  kakroll: "কাঁকরোল",
  kalojira: "কালোজিরা চাল",
  karalla: "করলা",
  katla_big_above_5_kg: "বড় কাতলা মাছ",
  katla_local: "দেশি কাতলা মাছ",
  katla_medium_2_50_4_50_kg: "মাঝারি কাতলা মাছ",
  katla_small_1_50_2_00_kg: "ছোট কাতলা মাছ",
  khejur_date: "খেজুর",
  khesari: "খেসারি ডাল",
  khirai_small_cucumber: "ছোট খিরা",
  kochur_loti_aroid_succer: "কচুর লতি",
  lady_s_finger_okra: "ঢেঁড়স",
  lao_bottle_gourd: "লাউ",
  lentils_desi_whole: "দেশি মসুর ডাল",
  local_duck_big_above_900_gm: "বড় দেশি হাঁস",
  local_hen_big_above_900_gm: "বড় দেশি মুরগি",
  local_hen_medium_700_850_gm: "মাঝারি দেশি মুরগি",
  local_white: "দেশি সাদা পণ্য",
  malabar_spinach_puisak: "পুঁইশাক",
  mango_amropali: "আম্রপালি আম",
  mango_himsagar: "হিমসাগর আম",
  mango_langra: "ল্যাংড়া আম",
  mash_broken: "ভাঙা মাষকলাই",
  mash_kalai_whole: "মাষকলাই ডাল",
  masur_imported_ordinary: "আমদানি মসুর ডাল",
  masur_imported_superior_quality: "ভালো মানের আমদানি মসুর ডাল",
  masur_whole_local: "দেশি মসুর ডাল",
  milk_powder_bag: "গুঁড়া দুধ",
  motar_peas_imported: "আমদানি মটর ডাল",
  motar_peas_local: "দেশি মটর ডাল",
  motorshooti_peas: "মটরশুঁটি",
  mregal_big: "বড় মৃগেল মাছ",
  mregal_small: "ছোট মৃগেল মাছ",
  mukhi_cachue_aroid: "মুখী কচু",
  mung_imported: "আমদানি মুগ ডাল",
  mung_local: "দেশি মুগ ডাল",
  muri: "মুড়ি",
  mustard: "সরিষা",
  mustard_oil_local_ordinary: "দেশি সরিষার তেল",
  mutton: "খাসির মাংস",
  mutton_male: "খাসির মাংস",
  onion_imported: "আমদানি পেঁয়াজ",
  onion_local: "দেশি পেঁয়াজ",
  onion_new: "নতুন পেঁয়াজ",
  orange: "কমলা",
  paddy_boro_coarse: "মোটা বোরো ধান",
  paddy_medium_boro: "মাঝারি বোরো ধান",
  palm_oil: "পাম তেল",
  pangash_big: "বড় পাঙ্গাস মাছ",
  pangash_small: "ছোট পাঙ্গাস মাছ",
  patal_pointed_gourd: "পটল",
  pineapple_kelenga: "আনারস",
  poah: "পোয়া মাছ",
  potato_holland_red: "লাল আলু",
  potato_holland_red_old: "পুরনো লাল আলু",
  potato_holland_white_new: "নতুন সাদা আলু",
  potato_holland_white_old: "পুরনো সাদা আলু",
  potato_local: "দেশি আলু",
  potato_local_old: "পুরনো দেশি আলু",
  pumpkin_sweet_gourd: "মিষ্টি কুমড়া",
  radish_china: "চায়না মুলা",
  radish_local: "দেশি মুলা",
  red_spinach: "লাল শাক",
  rice_aman_coarse: "মোটা আমন চাল",
  rice_aman_fine: "সরু আমন চাল",
  rice_aman_medium: "মাঝারি আমন চাল",
  rice_aman_pajam: "পাজাম চাল",
  rice_amon_hybrid_coarse: "মোটা হাইব্রিড আমন চাল",
  rice_amon_hybrid_medium: "মাঝারি হাইব্রিড আমন চাল",
  rice_amon_hybrid_narrow: "সরু হাইব্রিড আমন চাল",
  rice_boro_fine: "সরু বোরো চাল",
  rice_boro_hybrid_coarse: "মোটা হাইব্রিড বোরো চাল",
  rice_boro_hybrid_fine: "সরু হাইব্রিড বোরো চাল",
  rice_boro_hybrid_medium: "মাঝারি হাইব্রিড বোরো চাল",
  rice_boro_medium: "মাঝারি বোরো চাল",
  ricel_boro_mota: "মোটা বোরো চাল",
  ruhi_imported_medium_2_50_4_50_kg: "আমদানি রুই মাছ",
  ruhi_local_big_above_5_kg: "বড় দেশি রুই মাছ",
  ruhi_local_medium_2_50_4_50_kg: "মাঝারি দেশি রুই মাছ",
  ruhi_local_small_1_50_2_00_kg: "ছোট দেশি রুই মাছ",
  rupchanda: "রূপচাঁদা মাছ",
  silver_carp: "সিলভার কার্প মাছ",
  singhi: "শিং মাছ",
  small_mung_local_super_quality: "ভালো মানের ছোট মুগ ডাল",
  sonali_chicken: "সোনালি মুরগি",
  soyabin_oil_1_lit_bottle: "১ লিটার সয়াবিন তেল",
  soyabin_oil_5_liter_bottle: "৫ লিটার সয়াবিন তেল",
  soybean_oilloose: "খোলা সয়াবিন তেল",
  spices: "মসলা",
  spinach_palongsak: "পালং শাক",
  telapianilotica: "তেলাপিয়া মাছ",
  tomato: "টমেটো",
  turmeric_local_long_ordinary: "সাধারণ দেশি হলুদ",
  turmeric_local_long_superior: "ভালো মানের দেশি হলুদ",
  turnip: "শালগম",
  uchehhe_bitter_gourd: "উচ্ছে",
  watermelon: "তরমুজ",
};

const TOKEN_BN = {
  rice: "চাল", paddy: "ধান", boro: "বোরো", aman: "আমন", amon: "আমন", coarse: "মোটা", fine: "সরু", medium: "মাঝারি",
  potato: "আলু", onion: "পেঁয়াজ", local: "দেশি", imported: "আমদানি", new: "নতুন", old: "পুরনো", big: "বড়", small: "ছোট",
  fish: "মাছ", chicken: "মুরগি", duck: "হাঁস", hen: "মুরগি", egg: "ডিম", farm: "ফার্ম", red: "লাল", white: "সাদা",
  oil: "তেল", soybean: "সয়াবিন", soyabin: "সয়াবিন", loose: "খোলা", bottle: "বোতল", liter: "লিটার", lit: "লিটার",
  ordinary: "সাধারণ", superior: "ভালো মানের", quality: "মান", high: "ভালো", above: "বেশি", gm: "গ্রাম", kg: "কেজি",
  mango: "আম", banana: "কলা", apple: "আপেল", orange: "কমলা", guava: "পেয়ারা", chili: "মরিচ", chilli: "মরিচ", dried: "শুকনা",
  gourd: "লাউ/কুমড়া", spinach: "শাক", bean: "শিম", garlic: "রসুন", ginger: "আদা", flour: "ময়দা", packet: "প্যাকেট",
};

function normalize(value = "") {
  return value
    .toLowerCase()
    .replace(/\.(jpg|jpeg|png|webp)$/i, "")
    .replace(/\s*-\s*copy(?:\s*\(\d+\))?/gi, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function formatProductName(key = "") {
  const clean = normalize(key);
  if (PRODUCT_NAME_BN[clean]) return PRODUCT_NAME_BN[clean];

  const words = clean
    .split("_")
    .filter(Boolean)
    .filter((part) => !/^\d+$/.test(part))
    .map((part) => TOKEN_BN[part] || part);

  return words.join(" ") || "পণ্য";
}

export function formatUnit(unit = "") {
  const u = String(unit || "").toLowerCase();
  if (["kg", "kgs", "kilogram", "kilograms"].includes(u)) return "কেজি";
  if (["gm", "g", "gram", "grams"].includes(u)) return "গ্রাম";
  if (["litre", "liter", "l", "ltr"].includes(u)) return "লিটার";
  if (["piece", "pcs", "pc"].includes(u)) return "টি";
  if (["dozen", "dz"].includes(u)) return "ডজন";
  if (["packet", "pack"].includes(u)) return "প্যাকেট";
  return unit || "একক";
}

export function translateApiText(text = "") {
  if (text == null) return "";

  let out = String(text);
  const trimmed = out.trim();

  let match = trimmed.match(/^Price expected to rise ([\d.]+)%.*$/i);
  if (match) return `আগামী আপডেটে দাম প্রায় ${bnPct(match[1], 2)} বাড়তে পারে।`;

  match = trimmed.match(/^Price expected to fall ([\d.]+)%.*$/i);
  if (match) return `আগামী আপডেটে দাম প্রায় ${bnPct(match[1], 2)} কমতে পারে।`;

  match = trimmed.match(/^Model predicts a ([\d.]+)% drop.*$/i);
  if (match) return `মডেল বলছে আগামী আপডেটে দাম প্রায় ${bnPct(match[1], 2)} কমতে পারে।`;

  match = trimmed.match(/^Model predicts a ([\d.]+)% rise.*$/i);
  if (match) return `মডেল বলছে আগামী আপডেটে দাম প্রায় ${bnPct(match[1], 2)} বাড়তে পারে।`;

  if (/^Price expected to remain about the same\.?$/i.test(trimmed)) {
    return "দাম প্রায় একই থাকতে পারে।";
  }

  if (/^Price expected to stay roughly flat\.?$/i.test(trimmed)) {
    return "দাম মোটামুটি একই থাকতে পারে।";
  }

  const replacements = [
    ["Buy Today", "আজ কিনুন"],
    ["Buy today", "আজ কিনুন"],
    ["buy today", "আজ কিনুন"],
    ["Buy Now", "এখন কিনুন"],
    ["buy now", "এখন কিনুন"],
    ["Wait 1–2 Days", "১–২ দিন অপেক্ষা করুন"],
    ["Wait 1-2 Days", "১–২ দিন অপেক্ষা করুন"],
    ["Wait if Possible", "সম্ভব হলে অপেক্ষা করুন"],
    ["Wait", "অপেক্ষা করুন"],
    ["Price Stable", "দাম প্রায় একই"],
    ["Stable", "দাম প্রায় একই"],
    ["Price expected to remain about the same.", "দাম প্রায় একই থাকতে পারে।"],
    ["Price expected to stay roughly flat.", "দাম মোটামুটি একই থাকতে পারে।"],
    ["No savings buying now", "এখন কিনলে আলাদা সাশ্রয় নেই"],
    ["No savings from waiting", "অপেক্ষা করলে আলাদা সাশ্রয় নেই"],
    ["Not enough data", "ডাটা যথেষ্ট নেই"],
    ["Current price", "এখনকার দাম"],
    ["Latest market price", "সর্বশেষ বাজার দাম"],
    ["Predicted", "ধারণা করা দাম"],
    ["forecast", "ফোরকাস্ট"],
    ["increase", "বাড়তে পারে"],
    ["decrease", "কমতে পারে"],
    ["stable", "প্রায় একই থাকতে পারে"],
    ["market", "বাজার"],
    ["Market", "বাজার"],
    ["product", "পণ্য"],
    ["Product", "পণ্য"],
    ["today", "আজ"],
    ["tomorrow", "আগামী আপডেটে"],
    ["Expected", "ধারণা করা"],
    ["change", "পরিবর্তন"],
  ];

  replacements.forEach(([from, to]) => {
    out = out.split(from).join(to);
  });


  Object.entries(PRODUCT_NAME_BN).forEach(([key, bn]) => {
    const variants = new Set([
      key,
      key.replace(/_/g, " "),
      key.replace(/_/g, "-"),
    ]);

    variants.forEach((variant) => {
      const escaped = variant.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = new RegExp(`\\b${escaped}\\b`, "gi");
      out = out.replace(pattern, bn);
    });
  });
  return localizeNumbers(out);
}
export function getProductImage(key = "") {
  const clean = normalize(key);
  const exact = PRODUCT_IMAGE_FILES.find((file) => normalize(file) === clean);
  if (exact) return `/products/${exact}`;

  const loose = PRODUCT_IMAGE_FILES.find((file) => {
    const f = normalize(file);
    return f.includes(clean) || clean.includes(f);
  });

  return `/products/${loose || DEFAULT_IMAGE}`;
}

export function getProductCategory(key = "") {
  const k = String(key || "").toLowerCase();

  // Exact / priority fixes first
  // কাঁঠাল যেন কখনো মাছ-মাংস বা অন্য category-তে না যায়
  if (
    k.includes("jackfruit") ||
    k.includes("kathal") ||
    k.includes("kanthal") ||
    k.includes("কাঁঠাল") ||
    k.includes("কাঠাল")
  ) {
    return "fruits";
  }

  // Fruits first, before fish/meat
  if (
    /(apple|banana|mango|orange|guava|grapes|watermelon|pineapple|jackfruit|dragon|amalki|khejur|date|lemon)/.test(k) ||
    k.includes("coconut") ||
    k.includes("green_coconut")
  ) {
    return "fruits";
  }

  if (k === "egg" || k.startsWith("egg_") || /(milk|powder)/.test(k)) {
    return "egg_dairy";
  }

  // Fish and meat only
  if (
    /(^|_)(fish|hilsha|katla|ruhi|rui|pangash|telapia|telapianilotica|tilapia|rupchanda|singhi|kai|poah|carp|mregal|mrigel|mrigal)($|_)/.test(k) ||
    /(^|_)(mutton|beef|chicken|broiler|sonali|hen|duck)($|_)/.test(k)
  ) {
    return "fish_meat";
  }

  if (k.includes("patal") || k.includes("potol") || k.includes("pointed_gourd")) {
    return "vegetables";
  }

  if (/(rice|paddy|chinigura|kalojira|ata|flour|chira|muri)/.test(k)) {
    return "rice_grain";
  }

  if (
    k.includes("soybean_oil") ||
    k.includes("soybean_oilloose") ||
    k.includes("soyabin_oil") ||
    k.includes("mustard_oil") ||
    k.includes("palm_oil") ||
    /(turmeric|spice|spices|coriander|dried_chili|dried_chilli)/.test(k)
  ) {
    return "oil_spice";
  }

  if (/(masur|mung|mash|lentil|gram|peas|motar|motorshooti|khesari|chickpeas|kalai)/.test(k)) {
    return "pulses";
  }

  if (
    /(potato|onion|brinjal|tomato|cabbage|cauliflower|carrot|radish|gourd|bean|okra|spinach|chili|chilli|garlic|ginger|cucumber|papaya|green_banana|danta|dhundol|jhinga|kakroll|karalla|kochur|mukhi|turnip|celeriac|malabar|red_spinach|palongsak|puisak|water_gourd|bottle_gourd|snakegourd|bitter_gourd|yardlong|aroid|cachue)/.test(k)
  ) {
    return "vegetables";
  }

  return "other";
}

export function getCategoryMeta(categoryId = "other") {
  return PRODUCT_CATEGORIES.find((c) => c.id === categoryId) || PRODUCT_CATEGORIES[PRODUCT_CATEGORIES.length - 1];
}

export function productMatchesSearch(key = "", label = "", query = "") {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const banglaLabel = formatProductName(key);
  return key.toLowerCase().includes(q) || String(label).toLowerCase().includes(q) || banglaLabel.toLowerCase().includes(q);
}
