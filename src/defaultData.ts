import { TeaProduct } from "./types";

export const DEFAULT_PRODUCTS: TeaProduct[] = [
  {
    id: "buckwheat_cream_green",
    name: "蕎麥奶蓋 綠水",
    description: "法國 Elle & Vire 鮮奶油特調。帶有獨特蕎麥香氣的輕盈奶蓋，完美融合清香綠茶，口感甘醇順口。",
    priceM: 45,
    priceL: 50,
    iceConstraint: "僅供少冰",
    available: true,
    category: "蓋特調",
    badge: "人氣"
  },
  {
    id: "buckwheat_cream_genmaicha",
    name: "蕎麥奶蓋 玄米茶",
    description: "法國 Elle & Vire 鮮奶油特調。蕎麥奶蓋的濃郁與慢火烘焙玄米茶的焙烤穀香交織，層次分明、底蘊深厚。",
    priceM: 55,
    priceL: 65,
    iceConstraint: "僅供少冰",
    available: true,
    category: "蓋特調",
    badge: "熱銷"
  },
  {
    id: "seasal_cream_spring_oolong",
    name: "海鹽奶蓋 春青",
    description: "法國 Elle & Vire 鮮奶油特調。帶有一絲海鹽鹹甜的綿密奶蓋，引出春摘青茶的清新花香，純粹而美好。",
    priceM: 50,
    priceL: 55,
    iceConstraint: "僅供少冰",
    available: true,
    category: "蓋特調",
    badge: "推薦"
  },
  {
    id: "seasal_cream_black_tea",
    name: "海鹽奶蓋 紅茶",
    description: "法國 Elle & Vire 鮮奶油特調。經典阿薩姆紅茶的深邃茶感，與海鹽鹹甜奶蓋完美交融，交織出絲滑厚實風味。",
    priceM: 55,
    priceL: 60,
    iceConstraint: "僅供少冰",
    available: true,
    category: "蓋特調",
    badge: "推薦"
  },
  {
    id: "seasal_cream_apple_tea",
    name: "海鹽奶蓋 輕蘋果香茶",
    description: "法國 Elle & Vire 鮮奶油特調。微甜飽滿的輕蘋果香茶，覆蓋上綿密海鹽鹹甜奶蓋，酸甜沁涼、極致奢華。",
    priceM: 80,
    priceL: null, // L is not available in the image: '-'
    iceConstraint: "僅供少冰",
    available: true,
    category: "蓋特調",
    badge: "限定"
  }
];
