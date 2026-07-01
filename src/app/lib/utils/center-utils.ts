import { DEFAULT_CENTERS } from "../../constants";

/**
 * Normalizes text for comparison by removing accents and lowercasing
 */
const normalizeForMatch = (text: string): string => {
  if (!text) return "";
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

export const CENTER_MAPPING: Record<string, string> = {
  "HN1.PH": "HN0001.PHY",
  "BN1.NSL": "BN0001.LTT",
  "BN2.TUS": "BN0002.TSN",
  "HN2.TH": "HN0002.THA",
  "HN3.HQV": "HN0003.HQV",
  "HN4.LG": "HN0004.LGI",
  "HN5.NVL": "HN0005.NVL",
  "HN7.VQ": "HN0007.VQN",
  "HN10.TG": "HN0010.MDH",
  "HN12.NHT": "HN0012.NHT",
  "HN14.TM": "HN0014.TMI",
  "HN15.VP": "HN0015.VPU",
  "HN16.PDP": "HN0016.PDP",
  "HN17.HNI": "HN0017.HNI",
  "HN18.VTP": "HN0018.VTP",
  "HN19.NT": "HN0019.NTN",
  "HN21.NGD": "HN0021.NGD",
  "HN22.NVO": "HN0022.NVO",
  "HN23.LD": "HN0023.LDM",
  "HN24.TC": "HN0024.TCY",
  "HN25.LTT": "HN0025.LTT",
  "HN26.VH": "HN0026.VHG",
  "HN27.OP": "HN0027.OPK",
  "HN28.PVD": "HN0028.PVD",
  "HN29.VPH": "HN0029.VPH",
  "HN30.AKH": "HN0030.AKH",
  "HN31.AHG": "HN0031.AHG",
  "HN32.LLQ": "HN0032.LLQ",
  "HN33.DAH": "HN0033.DAH",
  "HN34.HTN": "HN0034.HTN",
  "HY01.ECP": "HY0001.ECP",
  "HP1.LHP": "HP0001.LHP",
  "HP2.HBT": "HP0002.HBT",
  "HP3.VIN": "HP0003.VIN",
  "QN01.HL": "QN0001.HLG",
  "VIN01.CT": "VIN001.CTG",
  "VP01.PCT": "VP0001.PCT",
  "TH01.TPU": "TH0001.TPU",
  "TN01.LNQ": "TN0001.LNQ",
  "AA": "Apollo Advance -South", 
  "PT01.HVG": "PT0001.HVG",
  "MKT LOCAL NORTH_TH": "MKT LOCAL NORTH_TH",
  "MKT LOCAL NORTH_TN": "MKT LOCAL NORTH_TN",
  "MKT LOCAL NORTH_HP": "MKT LOCAL NORTH_HP",
  "MKT LOCAL NORTH_PT": "MKT LOCAL NORTH_PT",
  "NSL": "BN0001.LTT",
  "TUS": "BN0002.TSN",
  "PHY": "HN0001.PHY",
  "THA": "HN0002.THA",
  "HQV": "HN0003.HQV",
  "LGI": "HN0004.LGI",
  "NVL": "HN0005.NVL",
  "VQN": "HN0007.VQN",
  "MDH": "HN0010.MDH",
  "NHT": "HN0012.NHT",
  "TMI": "HN0014.TMI",
  "VPU": "HN0015.VPU",
  "PDP": "HN0016.PDP",
  "HNI": "HN0017.HNI",
  "VTP": "HN0018.VTP",
  "NTN": "HN0019.NTN",
  "NGD": "HN0021.NGD",
  "NVO": "HN0022.NVO",
  "LDM": "HN0023.LDM",
  "TCY": "HN0024.TCY",
  "LTT": "HN0025.LTT",
  "VHG": "HN0026.VHG",
  "OPK": "HN0027.OPK",
  "PVD": "HN0028.PVD",
  "VPH": "HN0029.VPH",
  "AKH": "HN0030.AKH",
  "AHG": "HN0031.AHG",
  "LLQ": "HN0032.LLQ",
  "DAH": "HN0033.DAH",
  "HTN": "HN0034.HTN",
  "ECP": "HY0001.ECP",
  "HLG": "QN0001.HLG",
  "CTG": "VIN001.CTG",
  "PCT": "VP0001.PCT",
  "TPU": "TH0001.TPU",
  "LNQ": "TN0001.LNQ",
  "HVG": "PT0001.HVG",
  "ASP": "HN0200.ASP",
  "THE GARDEN": "HN0010.MDH",
  "NGUYEN HUU THO": "HN0012.NHT",
  "MO LAO": "HN0022.NVO",
  "LY THAI TO": "BN0001.LTT",
  "QUANG NINH": "QN0001.HLG",
};

const RAW_MAPPINGS = [
  { l07: "BN0001.LTT", keys: ["NSL", "Ngo Si Lien", "BN01", "Ly Thai To", "Lý Thái Tổ","BN1"] },
  { l07: "BN0002.TSN", keys: ["TUS", "TSN", "Tu Son", "BN02","BN2"] },
  { l07: "HN0001.PHY", keys: ["HN1.PH", "PHY", "PH", "Pho Hue", "Pho Hue Junior", "HN01","HN1"] },
  { l07: "HN0002.THA", keys: ["TH", "THA", "Thai Ha", "HN02","HN2"] },
  { l07: "HN0003.HQV", keys: ["HQV", "Hoang Quoc Viet", "HN03","HN3"] },
  { l07: "HN0004.LGI", keys: ["LGI", "LG", "Lieu Giai", "HN04","HN4"] },
  { l07: "HN0005.NVL", keys: ["NVL", "Nguyen Van Linh", "HN05","HN5"] },
  { l07: "HN0007.VQN", keys: ["VQ", "VQN", "Van Quan", "HN07","HN7"] },
  { l07: "HN0010.MDH", keys: ["MD", "MDH", "My Dinh", "The Garden","HN10"] },
  { l07: "HN0012.NHT", keys: ["NHT", "HM", "Hoang Mai", "Nguyen Huu Tho", "Nguyễn Hữu Thọ", "HN12"] },
  { l07: "HN0014.TMI", keys: ["TMI", "TM", "Tan Mai", "HN14"] },
  { l07: "HN0015.VPU", keys: ["VPU", "VP", "Van Phu", "HN15"] },
  { l07: "HN0016.PDP", keys: ["PDP", "Phan Dinh Phung", "HN16"] },
  { l07: "HN0017.HNI", keys: ["HNI", "Ham Nghi", "HN17"] },
  { l07: "HN0018.VTP", keys: ["VTP", "Vu Tong Phan", "HN18"] },
  { l07: "HN0019.NTN", keys: ["NTN", "NT", "Nguyen Tuan", "HN19"] },
  { l07: "HN0021.NGD", keys: ["NGD", "Ngoai Giao Doan", "HN21"] },
  { l07: "HN0022.NVO", keys: ["NVO", "Nguyen Van Loc", "Mo Lao", "Mỗ Lao","HN22"] },
  { l07: "HN0023.LDM", keys: ["LDM", "LD", "Linh Dam", "HN23"] },
  { l07: "HN0024.TCY", keys: ["TCY", "TC", "TIMES CITY", "HN24"] },
  { l07: "HN0025.LTT", keys: ["LTT", "Le Trong Tan", "HN25"] },
  { l07: "HN0026.VHG", keys: ["VHG", "VH", "Viet Hung", "HN26"] },
  { l07: "HN0027.OPK", keys: ["OPK", "OCP","OP", "Ocepark", "Ocean Park", "HN27"] },
  { l07: "HN0028.PVD", keys: ["PVD", "Pham Van Dong", "HN28"] },
  { l07: "HN0029.VPH", keys: ["VPH", "Vu Pham Ham", "HN29"] },
  { l07: "HN0030.AKH", keys: ["AKH", "AK", "An Khanh", "HN30"] },
  { l07: "HN0031.AHG", keys: ["AHG", "AH", "An Hung", "HN31"] },
  { l07: "HN0032.LLQ", keys: ["LLQ", "Lac Long Quan", "Xuan Dieu", "Xuan Dieu (đổi thành Lạc Long Quân)", "HN32"] },
  { l07: "HN0033.DAH", keys: ["DAH", "DA", "Dong Anh","HN33.DAH", "HN33"] },
  { l07: "HN0034.HTN", keys: ["HTN", "Hong Tien", "HN34.HTN", "HN34"] },
  { l07: "HY0001.ECP", keys: ["ECP", "Ecopark", "HY01"] },
  { l07: "HP0001.LHP", keys: ["LHP", "HP1", "HP01", "Hai Phong 1"] },
  { l07: "HP0002.HBT", keys: ["HBT", "HP2", "HP02", "Hai Phong 2"] },
  { l07: "HP0003.VIN", keys: ["HP3", "HP03", "Hai Phong 3"] },
  { l07: "QN0001.HLG", keys: ["HLG", "QN", "HL", "Ha Long", "QN01", "Quang Ninh", "Quảng Ninh", "QN1"] },
  { l07: "VIN001.CTG", keys: ["CTG", "VIN", "Vinh", "VIN01","VIN1", "VIN01.CTG"] },
  { l07: "VP0001.PCT", keys: ["PCT", "VP01", "VP1", "Vinh Phuc", "VP0001", "VP01.PCT"] },
  { l07: "TH0001.TPU", keys: ["TPU", "TH01.TPU", "MKT TH01.TPU", "Thanh Hoa", "TH01"] },
  { l07: "TN0001.LNQ", keys: ["LNQ", "TN01.LNQ", "MKT TN01.LNQ", "Thai Nguyen", "TN01"] },
  { l07: "PT0001.HVG", keys: ["HVG", "PT01.HVG", "MKT PT01.HVG", "Phu Tho", "PT01"] },
  { l07: "AA", keys: ["AA", "Apollo Advance -South"] },
  { l07: "HN0200.ASP", keys: ["HN0.ASP", "ASP", "ASP - HN", "HN0200"] },
  { l07: "MKT LOCAL NORTH", keys: ["NORTH.MKT INTERN", "MKT LOCAL NORTH", "NTW"] },
  { l07: "MKT LOCAL NORTH_TH", keys: ["MKT LOCAL NORTH_TH"] },
  { l07: "MKT LOCAL NORTH_TN", keys: ["MKT LOCAL NORTH_TN"] },
  { l07: "MKT LOCAL NORTH_HP", keys: ["MKT LOCAL NORTH_HP"] },
  { l07: "MKT LOCAL NORTH_PT", keys: ["MKT LOCAL NORTH_PT"] },
  { l07: "ZHN0000.GY", keys: ["CAMBRIDGE", "CONTEST"] },
  { l07: "MKT HP", keys: ["MKT HP"] },
];

// const normalizeForMatchLoose = (text: string): string => {
//   if (!text) return "";
//   return text
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "")
//     .toLowerCase()
//     .replace(/[đĐ]/g, "d")
//     .trim();
// };

const normalizedAeCodeMap = new Map<string, typeof DEFAULT_CENTERS[0]>();
const normalizedL07Map = new Map<string, typeof DEFAULT_CENTERS[0]>();
const exactL07Set = new Set<string>();
const exactAeCodeMap = new Map<string, string>();

DEFAULT_CENTERS.forEach((c) => {
  exactL07Set.add(c.l07.toUpperCase());
  exactAeCodeMap.set(c.aeCode.toUpperCase(), c.l07);
  normalizedAeCodeMap.set(normalizeForMatch(c.aeCode), c);
  normalizedL07Map.set(normalizeForMatch(c.l07), c);
});

const precomputedMappings: { l07: string; key: string; normKey: string; regex: RegExp }[] = [];
RAW_MAPPINGS.forEach((m) => {
  m.keys.forEach((k) => {
    const escapedKey = k.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    precomputedMappings.push({
      l07: m.l07,
      key: k.toUpperCase(),
      normKey: normalizeForMatch(k),
      regex: new RegExp(`(?:^|[^A-Z0-9a-z\\xC0-\\u1EF9])(${escapedKey})(?:[^A-Z0-9a-z\\xC0-\\u1EF9]|$)`, "i")
    });
  });
});
precomputedMappings.sort((a, b) => b.normKey.length - a.normKey.length);

export const mapChargeToCenterToL07 = (rawL07: string): string => {
  if (!rawL07) return "";
  const l07Upper = String(rawL07).toUpperCase().trim();

  // Try specific region MKT logic first
  if (
    l07Upper === "MKT PT01.HVG" ||
    l07Upper === "PT01.HVG" ||
    l07Upper === "PT0001.HVG" ||
    l07Upper === "MKT LOCAL NORTH_PT" ||
    l07Upper.includes("PT01") ||
    l07Upper.includes("PT0001") ||
    l07Upper.includes("PHU THO") ||
    l07Upper.includes("HVG")
  ) {
    return "MKT LOCAL NORTH_PT";
  }

  if (
    l07Upper === "MKT TH01.TPU" ||
    l07Upper === "TH01.TPU" ||
    l07Upper === "TH0001.TPU" ||
    l07Upper === "MKT LOCAL NORTH_TH" ||
    l07Upper.includes("TH01") ||
    l07Upper.includes("TH0001") ||
    l07Upper.includes("THANH HOA") ||
    l07Upper.includes("TPU")
  ) {
    return "MKT LOCAL NORTH_TH";
  }

  if (
    l07Upper === "MKT TN01.LNQ" ||
    l07Upper === "TN01.LNQ" ||
    l07Upper === "TN0001.LNQ" ||
    l07Upper === "MKT LOCAL NORTH_TN" ||
    l07Upper.includes("TN01") ||
    l07Upper.includes("TN0001") ||
    l07Upper.includes("THAI NGUYEN") ||
    l07Upper.includes("LNQ")
  ) {
    return "MKT LOCAL NORTH_TN";
  }

  if (
    l07Upper === "MKT HP" ||
    l07Upper === "MKT LOCAL NORTH_HP" ||
    l07Upper === "HAI PHONG" ||
    l07Upper === "HP" ||
    l07Upper === "HAI PHONG 1" ||
    l07Upper === "HAI PHONG 2" ||
    l07Upper === "HAI PHONG 3" ||
    l07Upper === "HP0001.LHP" ||
    l07Upper === "HP0002.HBT" ||
    l07Upper === "HP0003.VIN" ||
    l07Upper === "LHP" ||
    l07Upper === "HBT" ||
    (l07Upper.includes("HP") &&
      !l07Upper.includes("AHN_HP") &&
      !l07Upper.includes("AHP") &&
      !l07Upper.includes("SOUTH") &&
      !l07Upper.includes("ASH"))
  ) {
    return "MKT LOCAL NORTH_HP";
  }

  // General MKT Local North
  if (
    l07Upper === "MKT NA" ||
    l07Upper === "MKT BN" ||
    l07Upper === "MKT VP" ||
    l07Upper === "MKT QN" ||
    l07Upper === "MKT HY" ||
    l07Upper === "MKT HN" ||
    l07Upper === "NTW" ||
    (l07Upper.includes("MKT") && !l07Upper.includes("HP") && !l07Upper.includes("SOUTH"))
  ) {
    return "MKT LOCAL NORTH";
  }

  if (l07Upper === "MKT LOCAL NORTH_TH") return "MKT LOCAL NORTH_TH";
  if (l07Upper === "MKT LOCAL NORTH_TN") return "MKT LOCAL NORTH_TN";
  if (l07Upper === "MKT LOCAL NORTH_HP") return "MKT LOCAL NORTH_HP";
  if (l07Upper === "MKT LOCAL NORTH_PT") return "MKT LOCAL NORTH_PT";

  // If not MKT specific, fallback to standard mapping
  return mapAeCodeToL07(rawL07);
};

export const mapAeCodeToL07 = (rawL07: string): string => {
  if (!rawL07) return "";
  const l07Upper = String(rawL07).toUpperCase().trim();

  if (CENTER_MAPPING[l07Upper]) return CENTER_MAPPING[l07Upper];

  // If the input exactly matches a known L07, return it immediately
  if (exactL07Set.has(l07Upper)) return l07Upper;

  // If the input exactly matches a known aeCode, return its L07
  const exactL07 = exactAeCodeMap.get(l07Upper);
  if (exactL07) return exactL07;

  // Try keyword matching
  const normalized = normalizeForMatch(rawL07);
  
  // Exact match first
  for (const mapping of precomputedMappings) {
    if (mapping.normKey === normalized) return mapping.l07;
  }

  // Word boundary regex on original raw text
  for (const mapping of precomputedMappings) {
    if (mapping.regex.test(rawL07)) {
      return mapping.l07;
    }
  }

  // Final fallback for longer keys only (length >= 4) with loose include to avoid matching "PH" in "Hai Phong"
  for (const mapping of precomputedMappings) {
    if (mapping.normKey.length >= 4 && normalized.includes(mapping.normKey)) {
      return mapping.l07;
    }
  }
  
  return rawL07;
};

// Aliased for backwards compatibility in other files
export const mapL07 = mapAeCodeToL07;

export const getL07FromFileName = (fileName: string): string => {
  if (!fileName) return "";
  const normalized = normalizeForMatch(fileName);
  
  // 1. Try regex first (word boundaries) - most precise
  for (const mapping of precomputedMappings) {
    if (mapping.regex.test(fileName)) {
      return mapping.l07;
    }
  }

  // 2. Try segmenting by common separators
  const segments = fileName.split(/[-_.\s]/).filter(Boolean);
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed || trimmed.length < 2) continue;
    const mapped = mapL07(trimmed);
    // If it maps to a full L07 code (with dot), it's a good match
    if (mapped && mapped.includes(".") && mapped.length >= 7) {
      return mapped;
    }
  }

  // Fallback but only for longer keys to prevent bad substring matching
  for (const mapping of precomputedMappings) {
    if (mapping.normKey.length >= 4 && normalized.includes(mapping.normKey)) {
      return mapping.l07;
    }
  }

  return "";
};

export const getCenterInfoByL07 = (l07: string) => {
  if (!l07) return null;
  const normalized = normalizeForMatch(l07);
  return normalizedL07Map.get(normalized) || null;
};

export const getCenterInfoByAECode = (aeCode: string) => {
  if (!aeCode) return null;
  const upper = String(aeCode).toUpperCase().trim();

  // Explicit mappings requested by the user
  if (upper === "MKT NA") return { l07: "MKT LOCAL NORTH", aeCode: "MKT NA", bus: "AHN", url: "" };
  if (upper === "MKT BN") return { l07: "MKT LOCAL NORTH", aeCode: "MKT BN", bus: "AHN", url: "" };
  if (upper === "MKT VP") return { l07: "MKT LOCAL NORTH", aeCode: "MKT VP", bus: "AHN", url: "" };
  if (upper === "MKT QN") return { l07: "MKT LOCAL NORTH", aeCode: "MKT QN", bus: "AHN", url: "" };
  if (upper === "MKT HY") return { l07: "MKT LOCAL NORTH", aeCode: "MKT HY", bus: "AHN", url: "" };
  if (upper === "MKT HN") return { l07: "MKT LOCAL NORTH", aeCode: "MKT HN", bus: "AHN", url: "" };
  if (upper === "MKT TH01.TPU") return { l07: "MKT LOCAL NORTH_TH", aeCode: "MKT TH01.TPU", bus: "ATH", url: "" };
  if (upper === "MKT TN01.LNQ") return { l07: "MKT LOCAL NORTH_TN", aeCode: "MKT TN01.LNQ", bus: "ATN", url: "" };
  if (upper === "MKT PT01.HVG") return { l07: "MKT LOCAL NORTH_PT", aeCode: "MKT PT01.HVG", bus: "APT", url: "" };  
  if (upper === "MKT HP") return { l07: "MKT LOCAL NORTH_HP", aeCode: "MKT HP", bus: "AHP", url: "" };
  if (upper === "MKT LOCAL NORTH_TH") return { l07: "MKT LOCAL NORTH_TH", aeCode: "MKT LOCAL NORTH_TH", bus: "ATH", url: "" };
  if (upper === "MKT LOCAL NORTH_TN") return { l07: "MKT LOCAL NORTH_TN", aeCode: "MKT LOCAL NORTH_TN", bus: "ATN", url: "" };
  if (upper === "MKT LOCAL NORTH_HP") return { l07: "MKT LOCAL NORTH_HP", aeCode: "MKT LOCAL NORTH_HP", bus: "AHP", url: "" };
  if (upper === "MKT LOCAL NORTH_PT") return { l07: "MKT LOCAL NORTH_PT", aeCode: "MKT LOCAL NORTH_PT", bus: "APT", url: "" };
  if (upper === "NTW") return { l07: "MKT LOCAL NORTH", aeCode: "NTW", bus: "AHN", url: "" };

  // Custom rule: Mã AE containing MKT except containing HP belongs to MKT LOCAL NORTH
  if (upper.includes("MKT") && !upper.includes("HP") && !upper.includes("SOUTH")) {
    const info = getCenterInfoByL07("MKT LOCAL NORTH");
    if (info) return info;
  }

  // Use robust mapAeCodeToL07 first
  const candidateL07 = mapAeCodeToL07(aeCode);
  const infoByL07 = getCenterInfoByL07(candidateL07);
  if (infoByL07) return infoByL07;

  // Fallback to normalized maps
  const normalizedAE = normalizeForMatch(aeCode);
  return normalizedAeCodeMap.get(normalizedAE) || normalizedL07Map.get(normalizedAE) || null;
};

/**
 * Recognizes the L07 location based on Charge To Center MKT values or keywords
 */
export const getL07FromChargeToCenterMkt = (chargeValue: string): string | null => {
  if (!chargeValue) return null;
  const upper = String(chargeValue).toUpperCase().trim();
  
  if (
    upper === "TH0001.TPU" ||
    upper === "TH01.TPU" ||
    upper === "MKT TH01.TPU" ||
    upper.includes("TH01") ||
    upper.includes("TH0001") ||
    upper.includes("THANH HOA") ||
    upper.includes("TPU")
  ) {
    return "MKT LOCAL NORTH_TH";
  }
  
  if (upper === "NTW") {
    return "MKT LOCAL NORTH";
  }
  
  if (
    upper === "TN0001.LNQ" ||
    upper === "TN01.LNQ" ||
    upper === "MKT TN01.LNQ" ||
    upper.includes("TN01") ||
    upper.includes("TN0001") ||
    upper.includes("THAI NGUYEN") ||
    upper.includes("LNQ")
  ) {
    return "MKT LOCAL NORTH_TN";
  }
  
  if (
    upper === "PT0001.HVG" ||
    upper === "PT01.HVG" ||
    upper === "MKT PT01.HVG" ||
    upper.includes("PT01") ||
    upper.includes("PT0001") ||
    upper.includes("PHU THO") ||
    upper.includes("HVG")
  ) {
    return "MKT LOCAL NORTH_PT";
  }

  if (
    upper === "HAI PHONG" ||
    upper === "HP" ||
    upper === "MKT HP" ||
    upper === "HAI PHONG 1" ||
    upper === "HAI PHONG 2" ||
    upper === "HAI PHONG 3" ||
    upper === "HP0001.LHP" ||
    upper === "HP0002.HBT" ||
    upper === "HP0003.VIN" ||
    upper === "LHP" ||
    upper === "HBT" ||
    (upper.includes("HP") &&
      !upper.includes("AHN_HP") &&
      !upper.includes("AHP") &&
      !upper.includes("SOUTH") &&
      !upper.includes("ASH"))
  ) {
    return "MKT LOCAL NORTH_HP";
  }
  
  return null;
};

/**
 * Gets the corresponding BUSINESS based on the L07 string
 */
export const getBusinessFromL07 = (l07: string): string => {
  if (!l07) return "UNKNOWN";
  const upper = String(l07).toUpperCase().trim();
  
  if (upper === "MKT LOCAL NORTH_TH") return "ATH";
  if (upper === "MKT LOCAL NORTH_TN") return "ATN";
  if (upper === "MKT LOCAL NORTH_HP") return "AHP";
  if (upper === "MKT LOCAL NORTH_PT") return "APT";  
  if (upper === "MKT LOCAL NORTH") return "AHN";
  if (upper === "MKT LOCAL SOUTH") return "ASH";
  
  const info = getCenterInfoByL07(l07);
  if (info && info.bus) {
    return info.bus === "AHN_HP" ? "AHP" : info.bus;
  }
  
  return "UNKNOWN";
};

/**
 * Gets the corresponding Mã AE based on L07
 */
export const getAeCodeFromL07 = (l07: string): string => {
  if (!l07) return "UNKNOWN";
  const upper = String(l07).toUpperCase().trim();
  
  if (
    upper === "MKT LOCAL NORTH" ||
    upper === "MKT LOCAL NORTH_TH" ||
    upper === "MKT LOCAL NORTH_TN" ||
    upper === "MKT LOCAL NORTH_HP" ||
    upper === "MKT LOCAL NORTH_PT" ||
    upper === "MKT LOCAL SOUTH"
  ) {
    return upper;
  }
  
  const info = getCenterInfoByL07(l07);
  return info ? info.aeCode : l07;
};

/**
 * Resolve L07 and BU from Charge to Center MKT
 */
export const resolveL07BuFromChargeToCenter = (rawChargeToCenter: string): { l07: string, bu: string } | null => {
  if (!rawChargeToCenter) return null;
  
  // Logic from lines 311-326 and related 482-497 in PivotSheet.tsx
  const chargeUpper = rawChargeToCenter.toUpperCase().trim();
  
  let l07 = "";
  if (chargeUpper === "MKT NORTH" || chargeUpper === "MKT LOCAL NORTH" || chargeUpper === "NTW") {
    l07 = "MKT LOCAL NORTH";
  } else if (chargeUpper === "MKT SOUTH" || chargeUpper === "MKT LOCAL SOUTH") {
    l07 = "MKT LOCAL SOUTH";
  } else {
    l07 = mapChargeToCenterToL07(rawChargeToCenter) || rawChargeToCenter;
  }
  
  return { l07, bu: getBusinessFromL07(l07) };
};

/**
 * Resolve L07 and BU from AE code (rCen)
 */
export const resolveL07BuFromAeCode = (rCen: string): { l07: string, bu: string } | null => {
  if (!rCen) return null;
  
  const rCenUpper = rCen.toUpperCase().trim();
  let l07 = "";
  if (rCenUpper === "MKT NORTH" || rCenUpper === "MKT LOCAL NORTH") {
    l07 = "MKT LOCAL NORTH";
  } else if (rCenUpper === "MKT SOUTH" || rCenUpper === "MKT LOCAL SOUTH") {
    l07 = "MKT LOCAL SOUTH";
  } else {
    l07 = mapAeCodeToL07(rCen);
  }
  
  return { l07, bu: getBusinessFromL07(l07) };
};

/**
 * Resolve L07 and BU from File Name
 */
export const resolveL07BuFromFile = (fileName: string): { l07: string, bu: string } | null => {
  if (!fileName) return null;
  
  const l07 = getL07FromFileName(fileName);
  if (!l07) return null;
  
  return { l07, bu: getBusinessFromL07(l07) };
};


