
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Plane, PlaneTakeoff, Mail, Plus, RefreshCw, Trash2, TrendingDown, TrendingUp,
  ArrowRight, X, Loader2, Eye, CalendarDays, Settings, ExternalLink, Radio,
  Gauge, MoveUp, Compass, Zap, Map as MapIcon
} from "lucide-react";
import { AreaChart, Area, YAxis, XAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ═══════════════════════════════════════════════════════════════════════
   CONTRAIL v3 — live tracking ⇄ fare radar
   Data: Amadeus (fares) · AeroDataBox (status) · adsb.lol (live ADS-B)
         Claude AI web-search fallback when keys are absent/unreachable
   New:  Flightradar24-style live map (Leaflet, great-circle, live plane)
         Airport + airline autocomplete from embedded world database
═══════════════════════════════════════════════════════════════════════ */

const C = {
  ink: "#04070F",
  panel: "rgba(125,170,255,0.05)",
  border: "rgba(125,170,255,0.14)",
  borderSoft: "rgba(125,170,255,0.08)",
  cyan: "#5BE3F0", cyanDim: "rgba(91,227,240,0.14)",
  amber: "#FFC069", amberDim: "rgba(255,192,105,0.13)",
  text: "#EAF0FA", muted: "#8696AE",
  red: "#FF8585", green: "#7DF0B2", violet: "#9D8CFF",
};
const STORE_KEY = "contrail-data-v2";
const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const disp = { fontFamily: "'Space Grotesk', sans-serif" };

/* ════════════════════ EMBEDDED WORLD DATABASE ════════════════════ */
/* Airlines: [iata, name, icao] */
const AIRLINES = [
  ["UA","United Airlines","UAL"],["AA","American Airlines","AAL"],["DL","Delta Air Lines","DAL"],
  ["WN","Southwest Airlines","SWA"],["AS","Alaska Airlines","ASA"],["B6","JetBlue","JBU"],
  ["NK","Spirit Airlines","NKS"],["F9","Frontier Airlines","FFT"],["HA","Hawaiian Airlines","HAL"],
  ["G4","Allegiant Air","AAY"],["SY","Sun Country","SCX"],["MX","Breeze Airways","MXY"],
  ["AC","Air Canada","ACA"],["WS","WestJet","WJA"],["AM","Aeroméxico","AMX"],
  ["Y4","Volaris","VOI"],["VB","Viva Aerobus","VIV"],["CM","Copa Airlines","CMP"],
  ["AV","Avianca","AVA"],["LA","LATAM","LAN"],["G3","GOL","GLO"],["AD","Azul","AZU"],
  ["AR","Aerolíneas Argentinas","ARG"],["BA","British Airways","BAW"],["VS","Virgin Atlantic","VIR"],
  ["EI","Aer Lingus","EIN"],["AF","Air France","AFR"],["KL","KLM","KLM"],
  ["LH","Lufthansa","DLH"],["LX","SWISS","SWR"],["OS","Austrian","AUA"],["SN","Brussels Airlines","BEL"],
  ["IB","Iberia","IBE"],["UX","Air Europa","AEA"],["VY","Vueling","VLG"],["FR","Ryanair","RYR"],
  ["U2","easyJet","EZY"],["W6","Wizz Air","WZZ"],["TP","TAP Air Portugal","TAP"],
  ["AZ","ITA Airways","ITY"],["AY","Finnair","FIN"],["SK","SAS","SAS"],["DY","Norwegian","NOZ"],
  ["LO","LOT Polish","LOT"],["TK","Turkish Airlines","THY"],["A3","Aegean","AEE"],
  ["EK","Emirates","UAE"],["EY","Etihad","ETD"],["QR","Qatar Airways","QTR"],
  ["SV","Saudia","SVA"],["GF","Gulf Air","GFA"],["RJ","Royal Jordanian","RJA"],
  ["MS","EgyptAir","MSR"],["ET","Ethiopian","ETH"],["KQ","Kenya Airways","KQA"],
  ["SA","South African","SAA"],["AT","Royal Air Maroc","RAM"],
  ["NH","ANA","ANA"],["JL","Japan Airlines","JAL"],["ZG","ZIPAIR","TZP"],["MM","Peach","APJ"],
  ["KE","Korean Air","KAL"],["OZ","Asiana","AAR"],["TW","T'way Air","TWB"],
  ["CA","Air China","CCA"],["MU","China Eastern","CES"],["CZ","China Southern","CSN"],
  ["HU","Hainan Airlines","CHH"],["CX","Cathay Pacific","CPA"],["HX","Hong Kong Airlines","CRK"],
  ["BR","EVA Air","EVA"],["CI","China Airlines","CAL"],["SQ","Singapore Airlines","SIA"],
  ["TR","Scoot","TGW"],["MH","Malaysia Airlines","MAS"],["AK","AirAsia","AXM"],
  ["TG","Thai Airways","THA"],["VN","Vietnam Airlines","HVN"],["VJ","VietJet","VJC"],
  ["PR","Philippine Airlines","PAL"],["5J","Cebu Pacific","CEB"],["GA","Garuda Indonesia","GIA"],
  ["AI","Air India","AIC"],["6E","IndiGo","IGO"],["UL","SriLankan","ALK"],
  ["QF","Qantas","QFA"],["VA","Virgin Australia","VOZ"],["JQ","Jetstar","JST"],
  ["NZ","Air New Zealand","ANZ"],["FJ","Fiji Airways","FJI"],
];
const ICAO = Object.fromEntries(AIRLINES.map((a) => [a[0], a[2]]));
const AIRLINE_NAME = Object.fromEntries(AIRLINES.map((a) => [a[0], a[1]]));

/* Airports: [iata, city, name, lat, lon] — ~200 majors worldwide */
const AIRPORTS = [
  ["ATL","Atlanta","Hartsfield–Jackson",33.64,-84.43],["DFW","Dallas","Dallas/Fort Worth",32.90,-97.04],["DEN","Denver","Denver Intl",39.86,-104.67],
  ["ORD","Chicago","O'Hare",41.97,-87.91],["LAX","Los Angeles","Los Angeles Intl",33.94,-118.41],["CLT","Charlotte","Douglas Intl",35.21,-80.94],
  ["MCO","Orlando","Orlando Intl",28.43,-81.31],["LAS","Las Vegas","Harry Reid Intl",36.08,-115.15],["PHX","Phoenix","Sky Harbor",33.44,-112.01],
  ["MIA","Miami","Miami Intl",25.79,-80.29],["SEA","Seattle","Sea–Tac",47.45,-122.31],["IAH","Houston","George Bush",29.98,-95.34],
  ["JFK","New York","John F. Kennedy",40.64,-73.78],["EWR","Newark","Newark Liberty",40.69,-74.17],["LGA","New York","LaGuardia",40.78,-73.87],
  ["FLL","Fort Lauderdale","Hollywood Intl",26.07,-80.15],["MSP","Minneapolis","St. Paul Intl",44.88,-93.22],["SFO","San Francisco","San Francisco Intl",37.62,-122.38],
  ["DTW","Detroit","Metro Wayne",42.21,-83.35],["BOS","Boston","Logan Intl",42.36,-71.01],["SLC","Salt Lake City","Salt Lake Intl",40.79,-111.98],
  ["PHL","Philadelphia","Philadelphia Intl",39.87,-75.24],["BWI","Baltimore","Thurgood Marshall",39.18,-76.67],["TPA","Tampa","Tampa Intl",27.98,-82.53],
  ["SAN","San Diego","San Diego Intl",32.73,-117.19],["MDW","Chicago","Midway",41.79,-87.75],["BNA","Nashville","Nashville Intl",36.13,-86.67],
  ["IAD","Washington","Dulles Intl",38.95,-77.46],["DCA","Washington","Reagan National",38.85,-77.04],["AUS","Austin","Bergstrom Intl",30.19,-97.67],
  ["HNL","Honolulu","Daniel K. Inouye",21.32,-157.92],["DAL","Dallas","Love Field",32.85,-96.85],["HOU","Houston","Hobby",29.65,-95.28],
  ["OAK","Oakland","Oakland Intl",37.72,-122.22],["MSY","New Orleans","Louis Armstrong",29.99,-90.26],["RDU","Raleigh","Durham Intl",35.88,-78.79],
  ["SMF","Sacramento","Sacramento Intl",38.70,-121.59],["SJC","San Jose","Mineta Intl",37.36,-121.93],["SNA","Orange County","John Wayne",33.68,-117.87],
  ["RSW","Fort Myers","Southwest Florida",26.54,-81.76],["PDX","Portland","Portland Intl",45.59,-122.60],["STL","St. Louis","Lambert Intl",38.75,-90.37],
  ["MCI","Kansas City","Kansas City Intl",39.30,-94.71],["CLE","Cleveland","Hopkins Intl",41.41,-81.85],["IND","Indianapolis","Indianapolis Intl",39.72,-86.29],
  ["PIT","Pittsburgh","Pittsburgh Intl",40.49,-80.23],["CVG","Cincinnati","N. Kentucky Intl",39.05,-84.67],["CMH","Columbus","John Glenn Intl",40.00,-82.89],
  ["SAT","San Antonio","San Antonio Intl",29.53,-98.47],["MKE","Milwaukee","Mitchell Intl",42.95,-87.90],["JAX","Jacksonville","Jacksonville Intl",30.49,-81.69],
  ["OGG","Maui","Kahului",20.90,-156.43],["KOA","Kona","Ellison Onizuka",19.74,-156.05],["LIH","Kauai","Lihue",21.98,-159.34],
  ["ANC","Anchorage","Ted Stevens Intl",61.17,-149.99],["ABQ","Albuquerque","Sunport",35.04,-106.61],["BUR","Burbank","Hollywood Burbank",34.20,-118.36],
  ["ONT","Ontario","Ontario Intl",34.06,-117.60],["LGB","Long Beach","Long Beach",33.82,-118.15],["BOI","Boise","Boise Air Terminal",43.56,-116.22],
  ["GEG","Spokane","Spokane Intl",47.62,-117.53],["TUS","Tucson","Tucson Intl",32.12,-110.94],["OMA","Omaha","Eppley Airfield",41.30,-95.89],
  ["OKC","Oklahoma City","Will Rogers",35.39,-97.60],["TUL","Tulsa","Tulsa Intl",36.20,-95.89],["MEM","Memphis","Memphis Intl",35.04,-89.98],
  ["RIC","Richmond","Richmond Intl",37.51,-77.32],["ORF","Norfolk","Norfolk Intl",36.89,-76.20],["SDF","Louisville","Muhammad Ali Intl",38.17,-85.74],
  ["CHS","Charleston","Charleston Intl",32.90,-80.04],["SAV","Savannah","Hilton Head Intl",32.13,-81.20],["ELP","El Paso","El Paso Intl",31.81,-106.38],
  ["PBI","West Palm Beach","Palm Beach Intl",26.68,-80.10],["BDL","Hartford","Bradley Intl",41.94,-72.68],["ALB","Albany","Albany Intl",42.75,-73.80],
  ["BUF","Buffalo","Niagara Intl",42.94,-78.73],["ROC","Rochester","Greater Rochester",43.12,-77.67],["SYR","Syracuse","Hancock Intl",43.11,-76.11],
  ["PVD","Providence","T.F. Green",41.73,-71.43],["MHT","Manchester","Manchester–Boston",42.93,-71.44],["PWM","Portland ME","Portland Intl Jetport",43.65,-70.31],
  ["BTV","Burlington","Burlington Intl",44.47,-73.15],["GSO","Greensboro","Piedmont Triad",36.10,-79.94],["GSP","Greenville","Spartanburg Intl",34.90,-82.22],
  ["MYR","Myrtle Beach","Myrtle Beach Intl",33.68,-78.93],["TYS","Knoxville","McGhee Tyson",35.81,-83.99],["HSV","Huntsville","Huntsville Intl",34.64,-86.78],
  ["BHM","Birmingham","Shuttlesworth Intl",33.56,-86.75],["LIT","Little Rock","Clinton National",34.73,-92.22],["XNA","Bentonville","Northwest Arkansas",36.28,-94.31],
  ["DSM","Des Moines","Des Moines Intl",41.53,-93.66],["ICT","Wichita","Eisenhower National",37.65,-97.43],["COS","Colorado Springs","Colorado Springs",38.81,-104.70],
  ["PSP","Palm Springs","Palm Springs Intl",33.83,-116.51],["FAT","Fresno","Yosemite Intl",36.78,-119.72],["RNO","Reno","Reno–Tahoe",39.50,-119.77],
  ["EUG","Eugene","Mahlon Sweet Field",44.12,-123.21],["MFR","Medford","Rogue Valley",42.37,-122.87],["SBA","Santa Barbara","Santa Barbara",34.43,-119.84],
  ["YYZ","Toronto","Pearson Intl",43.68,-79.61],["YVR","Vancouver","Vancouver Intl",49.19,-123.18],["YUL","Montreal","Trudeau Intl",45.47,-73.74],
  ["YYC","Calgary","Calgary Intl",51.13,-114.01],["YEG","Edmonton","Edmonton Intl",53.31,-113.58],["YOW","Ottawa","Macdonald–Cartier",45.32,-75.67],
  ["YHZ","Halifax","Stanfield Intl",44.88,-63.51],["YWG","Winnipeg","Richardson Intl",49.91,-97.24],
  ["MEX","Mexico City","Benito Juárez",19.44,-99.07],["CUN","Cancún","Cancún Intl",21.04,-86.87],["GDL","Guadalajara","Miguel Hidalgo",20.52,-103.31],
  ["MTY","Monterrey","Mariano Escobedo",25.78,-100.11],["SJD","Los Cabos","Los Cabos Intl",23.15,-109.72],["PVR","Puerto Vallarta","Díaz Ordaz",20.68,-105.25],
  ["LIM","Lima","Jorge Chávez",-12.02,-77.11],["BOG","Bogotá","El Dorado",4.70,-74.15],["MDE","Medellín","José M. Córdova",6.16,-75.42],
  ["SCL","Santiago","Arturo Merino Benítez",-33.39,-70.79],["EZE","Buenos Aires","Ministro Pistarini",-34.82,-58.54],["GRU","São Paulo","Guarulhos",-23.43,-46.47],
  ["GIG","Rio de Janeiro","Galeão",-22.81,-43.25],["PTY","Panama City","Tocumen Intl",9.07,-79.38],["SJO","San José CR","Juan Santamaría",9.99,-84.21],
  ["LIR","Liberia CR","Daniel Oduber",10.59,-85.54],["UIO","Quito","Mariscal Sucre",-0.13,-78.36],["CTG","Cartagena","Rafael Núñez",10.44,-75.51],
  ["SJU","San Juan","Luis Muñoz Marín",18.44,-66.00],["MBJ","Montego Bay","Sangster Intl",18.50,-77.91],["NAS","Nassau","Lynden Pindling",25.04,-77.47],
  ["PUJ","Punta Cana","Punta Cana Intl",18.57,-68.36],["AUA","Aruba","Queen Beatrix",12.50,-70.02],["SXM","St. Maarten","Princess Juliana",18.04,-63.11],
  ["BDA","Bermuda","L.F. Wade Intl",32.36,-64.68],
  ["LHR","London","Heathrow",51.47,-0.45],["LGW","London","Gatwick",51.15,-0.18],["STN","London","Stansted",51.89,0.24],
  ["LCY","London","City",51.51,0.06],["MAN","Manchester","Manchester",53.36,-2.27],["EDI","Edinburgh","Edinburgh",55.95,-3.37],
  ["DUB","Dublin","Dublin",53.43,-6.24],["CDG","Paris","Charles de Gaulle",49.01,2.55],["ORY","Paris","Orly",48.73,2.36],
  ["NCE","Nice","Côte d'Azur",43.66,7.22],["AMS","Amsterdam","Schiphol",52.31,4.76],["FRA","Frankfurt","Frankfurt am Main",50.04,8.56],
  ["MUC","Munich","Franz Josef Strauss",48.35,11.79],["BER","Berlin","Brandenburg",52.36,13.50],["DUS","Düsseldorf","Düsseldorf",51.29,6.77],
  ["HAM","Hamburg","Hamburg",53.63,10.00],["ZRH","Zurich","Zurich",47.46,8.55],["GVA","Geneva","Geneva",46.24,6.11],
  ["VIE","Vienna","Schwechat",48.11,16.57],["BRU","Brussels","Zaventem",50.90,4.48],["MAD","Madrid","Barajas",40.47,-3.56],
  ["BCN","Barcelona","El Prat",41.30,2.08],["AGP","Málaga","Costa del Sol",36.68,-4.50],["PMI","Palma","Mallorca",39.55,2.74],
  ["LIS","Lisbon","Humberto Delgado",38.77,-9.13],["OPO","Porto","Sá Carneiro",41.25,-8.68],["FCO","Rome","Fiumicino",41.80,12.24],
  ["MXP","Milan","Malpensa",45.63,8.72],["LIN","Milan","Linate",45.45,9.28],["VCE","Venice","Marco Polo",45.51,12.35],
  ["NAP","Naples","Capodichino",40.89,14.29],["ATH","Athens","Eleftherios Venizelos",37.94,23.94],["IST","Istanbul","Istanbul Airport",41.26,28.74],
  ["SAW","Istanbul","Sabiha Gökçen",40.90,29.31],["CPH","Copenhagen","Kastrup",55.62,12.66],["OSL","Oslo","Gardermoen",60.19,11.10],
  ["ARN","Stockholm","Arlanda",59.65,17.92],["HEL","Helsinki","Vantaa",60.32,24.96],["WAW","Warsaw","Chopin",52.17,20.97],
  ["PRG","Prague","Václav Havel",50.10,14.26],["BUD","Budapest","Ferenc Liszt",47.44,19.26],["OTP","Bucharest","Henri Coandă",44.57,26.09],
  ["KEF","Reykjavík","Keflavík",63.99,-22.62],["KRK","Kraków","John Paul II",50.08,19.78],
  ["DXB","Dubai","Dubai Intl",25.25,55.36],["AUH","Abu Dhabi","Zayed Intl",24.43,54.65],["DOH","Doha","Hamad Intl",25.27,51.61],
  ["JED","Jeddah","King Abdulaziz",21.68,39.16],["RUH","Riyadh","King Khalid",24.96,46.70],["TLV","Tel Aviv","Ben Gurion",32.01,34.89],
  ["AMM","Amman","Queen Alia",31.72,35.99],["CAI","Cairo","Cairo Intl",30.12,31.41],
  ["JNB","Johannesburg","O.R. Tambo",-26.13,28.24],["CPT","Cape Town","Cape Town Intl",-33.97,18.60],["NBO","Nairobi","Jomo Kenyatta",-1.32,36.93],
  ["ADD","Addis Ababa","Bole Intl",8.98,38.80],["LOS","Lagos","Murtala Muhammed",6.58,3.32],["CMN","Casablanca","Mohammed V",33.37,-7.59],
  ["RAK","Marrakesh","Menara",31.61,-8.04],
  ["NRT","Tokyo","Narita",35.77,140.39],["HND","Tokyo","Haneda",35.55,139.78],["KIX","Osaka","Kansai",34.43,135.24],
  ["ITM","Osaka","Itami",34.79,135.44],["NGO","Nagoya","Chubu Centrair",34.86,136.81],["FUK","Fukuoka","Fukuoka",33.59,130.45],
  ["CTS","Sapporo","New Chitose",42.78,141.69],["OKA","Okinawa","Naha",26.20,127.65],
  ["ICN","Seoul","Incheon",37.46,126.44],["GMP","Seoul","Gimpo",37.56,126.79],["PEK","Beijing","Capital",40.08,116.58],
  ["PKX","Beijing","Daxing",39.51,116.41],["PVG","Shanghai","Pudong",31.14,121.81],["SHA","Shanghai","Hongqiao",31.20,121.34],
  ["CAN","Guangzhou","Baiyun",23.39,113.30],["SZX","Shenzhen","Bao'an",22.64,113.81],["HKG","Hong Kong","Chek Lap Kok",22.31,113.91],
  ["TPE","Taipei","Taoyuan",25.08,121.23],["MNL","Manila","Ninoy Aquino",14.51,121.02],["CGK","Jakarta","Soekarno–Hatta",-6.13,106.66],
  ["DPS","Bali","Ngurah Rai",-8.75,115.17],["SIN","Singapore","Changi",1.36,103.99],["KUL","Kuala Lumpur","KLIA",2.75,101.71],
  ["BKK","Bangkok","Suvarnabhumi",13.69,100.75],["DMK","Bangkok","Don Mueang",13.91,100.61],["HKT","Phuket","Phuket Intl",8.11,98.31],
  ["SGN","Ho Chi Minh City","Tan Son Nhat",10.82,106.66],["HAN","Hanoi","Noi Bai",21.22,105.81],["PNH","Phnom Penh","Pochentong",11.55,104.84],
  ["DEL","Delhi","Indira Gandhi",28.56,77.10],["BOM","Mumbai","Chhatrapati Shivaji",19.09,72.87],["BLR","Bengaluru","Kempegowda",13.20,77.71],
  ["MAA","Chennai","Chennai Intl",12.99,80.17],["HYD","Hyderabad","Rajiv Gandhi",17.24,78.43],["CCU","Kolkata","Netaji Subhas",22.65,88.45],
  ["CMB","Colombo","Bandaranaike",7.18,79.88],["KTM","Kathmandu","Tribhuvan",27.70,85.36],["ISB","Islamabad","Islamabad Intl",33.56,72.85],
  ["KHI","Karachi","Jinnah Intl",24.91,67.16],["LHE","Lahore","Allama Iqbal",31.52,74.40],["DAC","Dhaka","Shahjalal",23.84,90.40],
  ["SYD","Sydney","Kingsford Smith",-33.95,151.18],["MEL","Melbourne","Tullamarine",-37.67,144.84],["BNE","Brisbane","Brisbane Intl",-27.38,153.12],
  ["PER","Perth","Perth Intl",-31.94,115.97],["AKL","Auckland","Auckland Intl",-37.01,174.79],["CHC","Christchurch","Christchurch Intl",-43.49,172.53],
  ["NAN","Nadi","Nadi Intl",-17.76,177.44],["PPT","Tahiti","Faa'a Intl",-17.56,-149.61],["GUM","Guam","Won Pat Intl",13.48,144.80],
];
const APMAP = Object.fromEntries(AIRPORTS.map((a) => [a[0], a]));

/* ════════════════════ DATA PROVIDERS ════════════════════ */
async function claudeJSON({ prompt, useWebSearch = false, useGmail = false }) {
  const body = { model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] };
  if (useWebSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  if (useGmail) body.mcp_servers = [{ type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1", name: "gmail" }];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  const idx = [clean.indexOf("{"), clean.indexOf("[")].filter((i) => i >= 0);
  if (!idx.length) throw new Error("No JSON");
  return JSON.parse(clean.slice(Math.min(...idx)));
}

let _amTok = { token: null, exp: 0 };
async function amadeusToken(s) {
  if (_amTok.token && Date.now() < _amTok.exp - 60000) return _amTok.token;
  const base = s.amadeusEnv === "prod" ? "https://api.amadeus.com" : "https://test.api.amadeus.com";
  const res = await fetch(`${base}/v1/security/oauth2/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(s.amadeusKey)}&client_secret=${encodeURIComponent(s.amadeusSecret)}`,
  });
  if (!res.ok) throw new Error(`Amadeus auth ${res.status}`);
  const j = await res.json();
  _amTok = { token: j.access_token, exp: Date.now() + (j.expires_in || 1799) * 1000 };
  return _amTok.token;
}
async function amadeusFares(s, w) {
  const token = await amadeusToken(s);
  const base = s.amadeusEnv === "prod" ? "https://api.amadeus.com" : "https://test.api.amadeus.com";
  const dep = w.departDate || new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const p = new URLSearchParams({ originLocationCode: w.origin, destinationLocationCode: w.dest, departureDate: dep, adults: "1", currencyCode: "USD", max: "20" });
  if (w.returnDate) p.set("returnDate", w.returnDate);
  const res = await fetch(`${base}/v2/shopping/flight-offers?${p}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Amadeus ${res.status}`);
  const j = await res.json();
  const offers = (j.data || []).map((o) => ({
    price: Math.round(parseFloat(o.price?.grandTotal || o.price?.total || 0)),
    carrier: o.validatingAirlineCodes?.[0] || o.itineraries?.[0]?.segments?.[0]?.carrierCode || "—",
    stops: Math.max(0, (o.itineraries?.[0]?.segments?.length || 1) - 1),
    duration: o.itineraries?.[0]?.duration?.replace("PT", "").toLowerCase() || "",
  })).filter((o) => o.price > 0).sort((a, b) => a.price - b.price);
  if (!offers.length) throw new Error("No offers");
  return { price: offers[0].price, offers: offers.slice(0, 3), source: "amadeus" };
}

async function aeroDataBoxStatus(s, f) {
  const res = await fetch(
    `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(f.flightNo)}/${f.date}?withAircraftImage=false&withLocation=false`,
    { headers: { "X-RapidAPI-Key": s.rapidKey, "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com" } }
  );
  if (!res.ok) throw new Error(`AeroDataBox ${res.status}`);
  const arr = await res.json();
  const legs = Array.isArray(arr) ? arr : [];
  const leg = legs.find((l) => l.departure?.airport?.iata === f.origin) || legs[0];
  if (!leg) throw new Error("No leg");
  const M = { Expected: "Scheduled", CheckIn: "Scheduled", Boarding: "Boarding", GateClosed: "Boarding", Departed: "In Air", EnRoute: "In Air", Approaching: "In Air", Arrived: "Landed", Delayed: "Delayed", Canceled: "Cancelled", CanceledUncertain: "Cancelled", Diverted: "Delayed" };
  const timeOf = (t) => (t?.local || t?.utc || "").slice(11, 16) || null;
  const sched = timeOf(leg.departure?.scheduledTime), rev = timeOf(leg.departure?.revisedTime);
  let delay = 0;
  if (sched && rev && rev !== sched) {
    const [sh, sm] = sched.split(":").map(Number), [rh, rm] = rev.split(":").map(Number);
    delay = Math.max(0, rh * 60 + rm - (sh * 60 + sm));
  }
  return {
    status: M[leg.status] || (leg.status === "Unknown" ? null : leg.status) || null,
    gate: leg.departure?.gate || null, terminal: leg.departure?.terminal || null,
    depTime: rev || sched, arrTime: timeOf(leg.arrival?.revisedTime) || timeOf(leg.arrival?.scheduledTime),
    delay, source: "aerodatabox",
  };
}

async function adsbLive(f) {
  const m = (f.flightNo || "").match(/^([A-Z0-9]{2})\s?(\d+)$/i);
  const callsigns = [];
  if (m && ICAO[m[1].toUpperCase()]) callsigns.push(`${ICAO[m[1].toUpperCase()]}${m[2]}`);
  callsigns.push((f.flightNo || "").replace(/\s/g, "").toUpperCase());
  for (const cs of callsigns) {
    try {
      const res = await fetch(`https://api.adsb.lol/v2/callsign/${cs}`);
      if (!res.ok) continue;
      const j = await res.json();
      const ac = (j.ac || [])[0];
      if (ac && ac.lat != null) {
        return {
          alt: typeof ac.alt_baro === "number" ? ac.alt_baro : null,
          gs: ac.gs != null ? Math.round(ac.gs) : null,
          track: ac.track != null ? Math.round(ac.track) : null,
          lat: ac.lat, lon: ac.lon, source: "adsb", at: Date.now(),
        };
      }
    } catch { /* next */ }
  }
  return null;
}

async function aiStatus(f) {
  const r = await claudeJSON({
    useWebSearch: true,
    prompt: `Live status of flight ${f.airline || ""} ${f.flightNo} from ${f.origin} to ${f.dest} on ${f.date}? Search.
Respond ONLY JSON: {"status":"Scheduled|On Time|Boarding|In Air|Delayed|Cancelled|Landed","gate":null,"terminal":null,"depTime":"HH:MM","arrTime":"HH:MM","delay":0}`,
  });
  return { ...r, source: "ai" };
}
async function aiFares(w) {
  const r = await claudeJSON({
    useWebSearch: true,
    prompt: `Search current ${w.returnDate ? "round-trip" : "one-way"} economy airfare ${w.origin} to ${w.dest}${w.departDate ? ` departing around ${w.departDate}` : ""}${w.returnDate ? ` returning ${w.returnDate}` : ""}. Realistic low prices USD.
Respond ONLY JSON: {"price": 540, "offers": [{"carrier":"ZG","price":540,"stops":0,"duration":"11h"}]}`,
  });
  return { price: r.price, offers: (r.offers || []).slice(0, 3), source: "ai" };
}

/* ════════════════════ PERSISTENCE & HELPERS ════════════════════ */
const EMPTY = { flights: [], watches: [], settings: { amadeusKey: "", amadeusSecret: "", amadeusEnv: "test", rapidKey: "" } };
async function loadData() {
  try { const r = await window.storage.get(STORE_KEY); return r ? { ...EMPTY, ...JSON.parse(r.value) } : EMPTY; }
  catch { return EMPTY; }
}
async function persist(d) { try { await window.storage.set(STORE_KEY, JSON.stringify(d)); } catch (e) { console.error(e); } }

const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "—";
const fmtTime = (t) => t || "—:—";
function flightProgress(f) {
  if (!f.date || !f.depTime || !f.arrTime) return f.status === "Landed" ? 1 : 0;
  try {
    const dep = new Date(`${f.date}T${f.depTime}`);
    let arr = new Date(`${f.date}T${f.arrTime}`);
    if (arr < dep) arr = new Date(arr.getTime() + 86400000);
    const now = new Date();
    return now <= dep ? 0 : now >= arr ? 1 : (now - dep) / (arr - dep);
  } catch { return 0; }
}
/* great-circle interpolation, antimeridian-safe */
function gcPoints(a, b, n = 72) {
  const toR = (d) => (d * Math.PI) / 180, toD = (r) => (r * 180) / Math.PI;
  const la1 = toR(a[0]), lo1 = toR(a[1]), la2 = toR(b[0]), lo2 = toR(b[1]);
  const d = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
  if (!d) return [a, b];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
    const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
    const z = A * Math.sin(la1) + B * Math.sin(la2);
    pts.push([toD(Math.atan2(z, Math.sqrt(x * x + y * y))), toD(Math.atan2(y, x))]);
  }
  for (let i = 1; i < pts.length; i++) {
    while (pts[i][1] - pts[i - 1][1] > 180) pts[i][1] -= 360;
    while (pts[i][1] - pts[i - 1][1] < -180) pts[i][1] += 360;
  }
  return pts;
}
const STATUS_STYLE = {
  Scheduled: { bg: C.cyanDim, fg: C.cyan }, "On Time": { bg: "rgba(125,240,178,0.13)", fg: C.green },
  Boarding: { bg: "rgba(157,140,255,0.15)", fg: C.violet }, "In Air": { bg: C.cyanDim, fg: C.cyan },
  Delayed: { bg: "rgba(255,133,133,0.13)", fg: C.red }, Cancelled: { bg: "rgba(255,133,133,0.2)", fg: C.red },
  Landed: { bg: "rgba(134,150,174,0.13)", fg: C.muted },
};
const SOURCE_BADGE = {
  amadeus: { label: "AMADEUS LIVE", color: C.green }, aerodatabox: { label: "AERODATABOX", color: C.green },
  adsb: { label: "ADS-B LIVE", color: C.green }, ai: { label: "AI ESTIMATE", color: C.violet },
};
const gfLink = (w) => `https://www.google.com/travel/flights?q=${encodeURIComponent(`flights from ${w.origin} to ${w.dest}${w.departDate ? ` on ${w.departDate}` : ""}${w.returnDate ? ` through ${w.returnDate}` : ""}`)}`;

/* ════════════════════ LEAFLET LOADER ════════════════════ */
let _leaflet = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (_leaflet) return _leaflet;
  _leaflet = new Promise((res, rej) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onload = () => res(window.L);
    s.onerror = () => rej(new Error("Leaflet failed to load"));
    document.body.appendChild(s);
  });
  return _leaflet;
}

/* ════════════════════ LIVE MAP MODAL ════════════════════ */
function MapModal({ flight: f, onClose, onTelemetry }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const planeRef = useRef(null);
  const [tele, setTele] = useState(f.telemetry || null);
  const [err, setErr] = useState(null);
  const [checking, setChecking] = useState(false);

  const o = APMAP[f.origin], d = APMAP[f.dest];

  const planeIcon = (L, track) =>
    L.divIcon({
      className: "",
      html: `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;transform:rotate(${(track ?? 0)}deg);filter:drop-shadow(0 0 8px ${C.cyan});">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="${C.cyan}"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
      </div>`,
      iconSize: [34, 34], iconAnchor: [17, 17],
    });
  const dotIcon = (L, color, label) =>
    L.divIcon({
      className: "",
      html: `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;transform:translateY(-4px);">
        <div style="width:10px;height:10px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color};border:2px solid rgba(255,255,255,0.25);"></div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.08em;color:${color};text-shadow:0 1px 4px #000;">${label}</div>
      </div>`,
      iconSize: [40, 28], iconAnchor: [20, 8],
    });

  useEffect(() => {
    let dead = false;
    loadLeaflet().then((L) => {
      if (dead || !divRef.current) return;
      const map = L.map(divRef.current, { zoomControl: false, attributionControl: true, worldCopyJump: true });
      mapRef.current = map;
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: "abcd", maxZoom: 12,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      const bounds = [];
      if (o && d) {
        const route = gcPoints([o[3], o[4]], [d[3], d[4]]);
        L.polyline(route, { color: "rgba(125,170,255,0.35)", weight: 1.5, dashArray: "3 6" }).addTo(map);
        // flown portion
        if (tele?.lat != null) {
          const flown = gcPoints([o[3], o[4]], [tele.lat, tele.lon], 48);
          L.polyline(flown, { color: C.cyan, weight: 2.5, opacity: 0.9 }).addTo(map);
        }
        L.marker([o[3], o[4]], { icon: dotIcon(L, C.cyan, f.origin) }).addTo(map);
        L.marker([d[3], d[4]], { icon: dotIcon(L, C.amber, f.dest) }).addTo(map);
        bounds.push([o[3], o[4]], [d[3], d[4]]);
      }
      if (tele?.lat != null) {
        planeRef.current = L.marker([tele.lat, tele.lon], { icon: planeIcon(L, tele.track), zIndexOffset: 1000 }).addTo(map);
        bounds.push([tele.lat, tele.lon]);
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [46, 46] });
      else map.setView([30, 0], 2);
    }).catch((e) => setErr(e.message));

    return () => { dead = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshPosition = useCallback(async () => {
    setChecking(true);
    const t = await adsbLive(f);
    setChecking(false);
    if (!t) return false;
    setTele(t);
    onTelemetry?.(t);
    const L = window.L;
    if (L && mapRef.current) {
      if (planeRef.current) {
        planeRef.current.setLatLng([t.lat, t.lon]);
        planeRef.current.setIcon(planeIcon(L, t.track));
      } else {
        planeRef.current = L.marker([t.lat, t.lon], { icon: planeIcon(L, t.track), zIndexOffset: 1000 }).addTo(mapRef.current);
        mapRef.current.panTo([t.lat, t.lon]);
      }
    }
    return true;
  }, [f, onTelemetry]);

  useEffect(() => {
    refreshPosition();
    const iv = setInterval(refreshPosition, 25000);
    return () => clearInterval(iv);
  }, [refreshPosition]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#04070F" }}>
      {/* top bar */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.borderSoft}`, background: "rgba(4,7,15,0.9)", backdropFilter: "blur(10px)", zIndex: 500 }}>
        <div>
          <div style={{ ...mono, fontSize: 9, color: C.muted, letterSpacing: "0.25em" }} className="uppercase">Live radar</div>
          <div style={{ ...disp, fontSize: 17, fontWeight: 700, color: C.text }}>
            {f.flightNo} <span style={{ color: C.muted, fontWeight: 500 }}>{f.origin}</span>
            <ArrowRight size={13} style={{ display: "inline", margin: "0 5px 2px", color: C.cyan }} />
            <span style={{ color: C.muted, fontWeight: 500 }}>{f.dest}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshPosition} className="px-3 py-2 rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform"
            style={{ ...mono, fontSize: 11, color: C.cyan, background: C.cyanDim, border: "1px solid rgba(91,227,240,0.25)" }}>
            {checking ? <Loader2 size={12} className="animate-spin" /> : <Radio size={12} />} Ping
          </button>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: C.muted, background: "rgba(125,170,255,0.07)", border: `1px solid ${C.borderSoft}` }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* map */}
      <div className="flex-1 relative">
        <div ref={divRef} style={{ position: "absolute", inset: 0, background: "#0A0F1A" }} />
        {err && (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: "#04070F" }}>
            <p style={{ ...mono, fontSize: 12, color: C.muted, textAlign: "center" }}>
              Map library blocked in this environment — host the app to enable tiles.<br />Live position still updates on the flight card.
            </p>
          </div>
        )}
        {/* telemetry HUD */}
        <div className="absolute left-3 bottom-3 rounded-2xl px-4 py-3" style={{ background: "rgba(5,10,20,0.85)", border: `1px solid ${C.border}`, backdropFilter: "blur(10px)", zIndex: 500 }}>
          {tele ? (
            <div className="flex gap-5">
              <div><div className="hud-l">ALT</div><div className="hud-v">{tele.alt != null ? tele.alt.toLocaleString() : "—"}<span className="hud-u"> FT</span></div></div>
              <div><div className="hud-l">GS</div><div className="hud-v">{tele.gs ?? "—"}<span className="hud-u"> KT</span></div></div>
              <div><div className="hud-l">TRK</div><div className="hud-v">{tele.track ?? "—"}<span className="hud-u">°</span></div></div>
            </div>
          ) : (
            <div style={{ ...mono, fontSize: 11, color: C.muted }}>
              {checking ? "Pinging ADS-B network…" : "No live signal — aircraft may not be airborne yet."}
            </div>
          )}
        </div>
      </div>
      <style>{`
        .hud-l { font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:.18em; color:${C.muted}; }
        .hud-v { font-family:'Space Grotesk',sans-serif; font-size:19px; font-weight:700; color:${C.cyan}; }
        .hud-u { font-size:10px; color:${C.muted}; font-family:'IBM Plex Mono',monospace; }
        .leaflet-container { font-family:'IBM Plex Mono',monospace; }
        .leaflet-control-attribution { background: rgba(4,7,15,0.7) !important; color:${C.muted} !important; font-size:9px !important; }
        .leaflet-control-attribution a { color:${C.muted} !important; }
        .leaflet-bar a { background:#0B1322 !important; color:${C.cyan} !important; border-color:${C.borderSoft} !important; }
      `}</style>
    </div>
  );
}

/* ════════════════════ AUTOCOMPLETE FIELDS ════════════════════ */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(null);
  const onFocus = () => { clearTimeout(blurTimer.current); setOpen(true); };
  const onBlur = () => { blurTimer.current = setTimeout(() => setOpen(false), 150); };
  return { open, setOpen, onFocus, onBlur };
}
function AirportField({ label, value, onChange, placeholder }) {
  const [q, setQ] = useState("");
  const { open, setOpen, onFocus, onBlur } = useDropdown();
  const results = useMemo(() => {
    const s = (q || "").trim().toUpperCase();
    if (!s) return [];
    const starts = [], includes = [];
    for (const a of AIRPORTS) {
      const [code, city, name] = a;
      if (code === s) { starts.unshift(a); continue; }
      if (code.startsWith(s)) starts.push(a);
      else if (city.toUpperCase().includes(s) || name.toUpperCase().includes(s)) includes.push(a);
      if (starts.length + includes.length > 18) break;
    }
    return [...starts, ...includes].slice(0, 6);
  }, [q]);
  const pick = (a) => { onChange(a[0]); setQ(""); setOpen(false); };
  return (
    <label className="block mb-3 relative">
      <span style={{ ...mono, fontSize: 10.5, color: C.muted, letterSpacing: "0.1em" }} className="block mb-1.5 uppercase">{label}</span>
      <div className="relative">
        <input
          value={open ? q : value || ""}
          placeholder={value || placeholder}
          onFocus={(e) => { onFocus(); setQ(""); }}
          onBlur={onBlur}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          style={{ ...inputStyle, paddingRight: 52 }}
        />
        {value && !open && (
          <span style={{ ...mono, position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: C.cyan, letterSpacing: "0.1em" }}>
            {APMAP[value] ? "✓" : ""}
          </span>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-30"
          style={{ background: "#0B1424", border: `1px solid ${C.border}`, boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
          {results.map((a) => (
            <button key={a[0]} onMouseDown={(e) => { e.preventDefault(); pick(a); }}
              className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-white/5"
              style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
              <span>
                <span style={{ ...mono, fontSize: 13, fontWeight: 600, color: C.cyan }}>{a[0]}</span>
                <span style={{ fontSize: 12.5, color: C.text }}> · {a[1]}</span>
              </span>
              <span style={{ ...mono, fontSize: 10, color: C.muted }}>{a[2]}</span>
            </button>
          ))}
        </div>
      )}
      {value && APMAP[value] && !open && (
        <span style={{ ...mono, fontSize: 10, color: C.muted, opacity: 0.7 }} className="block mt-1">
          {APMAP[value][1]} — {APMAP[value][2]}
        </span>
      )}
    </label>
  );
}
function AirlineField({ label, value, onChange }) {
  const [q, setQ] = useState("");
  const { open, setOpen, onFocus, onBlur } = useDropdown();
  const results = useMemo(() => {
    const s = (q || "").trim().toUpperCase();
    if (!s) return [];
    return AIRLINES.filter(([code, name]) => code.startsWith(s) || name.toUpperCase().includes(s)).slice(0, 6);
  }, [q]);
  const pick = (a) => { onChange({ name: a[1], code: a[0] }); setQ(""); setOpen(false); };
  return (
    <label className="block mb-3 relative">
      <span style={{ ...mono, fontSize: 10.5, color: C.muted, letterSpacing: "0.1em" }} className="block mb-1.5 uppercase">{label}</span>
      <input
        value={open ? q : value || ""}
        placeholder={value || "United"}
        onFocus={() => { onFocus(); setQ(""); }}
        onBlur={onBlur}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        style={inputStyle}
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-30"
          style={{ background: "#0B1424", border: `1px solid ${C.border}`, boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
          {results.map((a) => (
            <button key={a[0]} onMouseDown={(e) => { e.preventDefault(); pick(a); }}
              className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-white/5"
              style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
              <span style={{ fontSize: 12.5, color: C.text }}>{a[1]}</span>
              <span style={{ ...mono, fontSize: 11, color: C.cyan }}>{a[0]}</span>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

/* ════════════════════ SKY CANVAS ════════════════════ */
function SkyCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w, h, raf;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = canvas.width = window.innerWidth * DPR;
      h = canvas.height = window.innerHeight * DPR;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
    };
    resize();
    window.addEventListener("resize", resize);
    const stars = Array.from({ length: 110 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.1 + 0.3,
      tw: Math.random() * Math.PI * 2, sp: 0.2 + Math.random() * 0.8,
    }));
    let trails = [], lastSpawn = 0;
    const spawnTrail = () => {
      const fromLeft = Math.random() > 0.5;
      trails.push({ x: fromLeft ? -0.05 : 1.05, y: 0.08 + Math.random() * 0.45, vx: (fromLeft ? 1 : -1) * (0.00055 + Math.random() * 0.0004), vy: (Math.random() - 0.5) * 0.00012, pts: [] });
    };
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const a = 0.25 + 0.5 * Math.abs(Math.sin(s.tw + t * 0.0006 * s.sp));
        ctx.fillStyle = `rgba(180,210,255,${a})`;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r * DPR, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduced) {
        if (t - lastSpawn > 9000 && trails.length < 2) { spawnTrail(); lastSpawn = t; }
        trails = trails.filter((tr) => tr.x > -0.15 && tr.x < 1.15);
        for (const tr of trails) {
          tr.x += tr.vx; tr.y += tr.vy;
          tr.pts.push({ x: tr.x, y: tr.y });
          if (tr.pts.length > 90) tr.pts.shift();
          ctx.beginPath();
          tr.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * w, p.y * h) : ctx.lineTo(p.x * w, p.y * h)));
          ctx.strokeStyle = "rgba(140,200,240,0.10)"; ctx.lineWidth = 1.4 * DPR; ctx.stroke();
          const head = tr.pts[tr.pts.length - 1];
          if (head) { ctx.fillStyle = "rgba(190,235,255,0.85)"; ctx.beginPath(); ctx.arc(head.x * w, head.y * h, 1.5 * DPR, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    if (reduced) { draw(0); cancelAnimationFrame(raf); } else { raf = requestAnimationFrame(draw); }
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* ════════════════════ ROUTE ARC ════════════════════ */
function RouteArc({ progress = 0, accent = C.cyan, live = false }) {
  const W = 300, H = 84, pad = 26, yBase = H - 16, peak = 12;
  const path = `M ${pad} ${yBase} Q ${W / 2} ${peak} ${W - pad} ${yBase}`;
  const t = Math.max(0, Math.min(1, progress));
  const qx = (1 - t) ** 2 * pad + 2 * (1 - t) * t * (W / 2) + t * t * (W - pad);
  const qy = (1 - t) ** 2 * yBase + 2 * (1 - t) * t * peak + t * t * yBase;
  const dx = 2 * (1 - t) * (W / 2 - pad) + 2 * t * (W - pad - W / 2);
  const dy = 2 * (1 - t) * (peak - yBase) + 2 * t * (yBase - peak);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <path d={path} fill="none" stroke="rgba(125,170,255,0.16)" strokeWidth="1.5" strokeDasharray="2.5 5.5" />
      {t > 0 && (
        <path d={path} fill="none" stroke={accent} strokeWidth="2.2" pathLength="1000"
          strokeDasharray="1000" strokeDashoffset={1000 - 1000 * t}
          style={{ filter: `drop-shadow(0 0 6px ${accent})` }} strokeLinecap="round" />
      )}
      <circle cx={pad} cy={yBase} r="3.5" fill={accent} style={{ filter: `drop-shadow(0 0 4px ${accent})` }} />
      <circle cx={W - pad} cy={yBase} r="3.5" fill="none" stroke={accent} strokeWidth="1.5" />
      {t > 0 && t < 1 && (
        <g transform={`translate(${qx},${qy}) rotate(${ang})`}>
          {live && <circle r="9" fill="none" stroke={accent} strokeWidth="1" opacity="0.5" className="ping" />}
          <path d="M -7 0 L 6 0 M 6 0 L 1.5 -3.5 M 6 0 L 1.5 3.5" stroke={accent} strokeWidth="2.2" strokeLinecap="round" fill="none"
            style={{ filter: `drop-shadow(0 0 5px ${accent})` }} />
        </g>
      )}
    </svg>
  );
}

/* ════════════════════ ATOMS ════════════════════ */
function Pill({ children, bg, fg, glow }) {
  return (
    <span className="px-2 py-1 rounded-md uppercase font-medium"
      style={{ ...mono, background: bg, color: fg, fontSize: 10.5, letterSpacing: "0.09em", boxShadow: glow ? `0 0 12px ${bg}` : "none" }}>
      {children}
    </span>
  );
}
function SourceTag({ source }) {
  const s = SOURCE_BADGE[source];
  if (!s) return null;
  return (
    <span style={{ ...mono, fontSize: 9, color: s.color, letterSpacing: "0.12em", opacity: 0.85 }} className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
      {s.label}
    </span>
  );
}
function GhostBtn({ icon: Icon, label, onClick, accent = C.muted, busy, disabled }) {
  return (
    <button onClick={onClick} disabled={busy || disabled}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
      style={{ ...mono, fontSize: 11.5, color: accent, background: "rgba(125,170,255,0.06)", border: `1px solid ${C.borderSoft}`, opacity: busy || disabled ? 0.5 : 1 }}>
      {busy ? <Loader2 size={13} className="animate-spin" /> : Icon && <Icon size={13} />}
      {label}
    </button>
  );
}
const inputStyle = {
  ...mono, fontSize: 14, color: C.text, background: "rgba(125,170,255,0.06)",
  border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", width: "100%", outline: "none",
};
function Field({ label, hint, ...props }) {
  return (
    <label className="block mb-3">
      <span style={{ ...mono, fontSize: 10.5, color: C.muted, letterSpacing: "0.1em" }} className="block mb-1.5 uppercase">{label}</span>
      <input {...props} style={inputStyle} />
      {hint && <span style={{ ...mono, fontSize: 10, color: C.muted, opacity: 0.65 }} className="block mt-1">{hint}</span>}
    </label>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(2,5,11,0.78)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[88vh] overflow-y-auto rise"
        style={{ background: "linear-gradient(180deg, #0A1322, #070D18)", border: `1px solid ${C.border}`, boxShadow: "0 -10px 60px rgba(91,227,240,0.07)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ ...disp, fontSize: 18, fontWeight: 700, color: C.text }}>{title}</h2>
          <button onClick={onClose} style={{ color: C.muted }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ════════════════════ FLIGHT CARD ════════════════════ */
function FlightCard({ flight: f, onRefresh, onWatch, onMap, onDelete, busy }) {
  const inAir = f.status === "In Air";
  const prog = inAir ? Math.max(0.04, flightProgress(f)) : f.status === "Landed" ? 1 : 0;
  const st = STATUS_STYLE[f.status] || STATUS_STYLE.Scheduled;
  const tele = f.telemetry;
  return (
    <div className="rounded-2xl p-4 mb-3 card">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span style={{ ...mono, color: C.text, fontSize: 13, fontWeight: 600 }}>{f.airline ? `${f.airline} ` : ""}{f.flightNo}</span>
          <Pill bg={st.bg} fg={st.fg} glow={inAir}>{f.status}{f.delay ? ` +${f.delay}m` : ""}</Pill>
        </div>
        <span style={{ ...mono, color: C.muted, fontSize: 11 }}>{fmtDate(f.date)}</span>
      </div>
      <div className="flex items-end justify-between -mb-1">
        <div>
          <div style={{ ...disp, fontSize: 32, fontWeight: 700, color: C.text, lineHeight: 1 }}>{f.origin}</div>
          <div style={{ ...mono, fontSize: 11.5, color: C.muted }} className="mt-1">{fmtTime(f.depTime)}</div>
        </div>
        <div className="flex-1 px-1"><RouteArc progress={prog} accent={C.cyan} live={inAir && !!tele} /></div>
        <div className="text-right">
          <div style={{ ...disp, fontSize: 32, fontWeight: 700, color: C.text, lineHeight: 1 }}>{f.dest}</div>
          <div style={{ ...mono, fontSize: 11.5, color: C.muted }} className="mt-1">{fmtTime(f.arrTime)}</div>
        </div>
      </div>
      {tele && inAir && (
        <div className="flex gap-2 mt-2.5 flex-wrap">
          {tele.alt != null && <span className="tele"><MoveUp size={11} /> {tele.alt.toLocaleString()} FT</span>}
          {tele.gs != null && <span className="tele"><Gauge size={11} /> {tele.gs} KT</span>}
          {tele.track != null && <span className="tele"><Compass size={11} /> {tele.track}°</span>}
        </div>
      )}
      {(f.gate || f.terminal) && (
        <div className="flex gap-4 mt-2.5">
          {f.terminal && <span style={{ ...mono, fontSize: 11.5, color: C.muted }}>TERM <span style={{ color: C.cyan }}>{f.terminal}</span></span>}
          {f.gate && <span style={{ ...mono, fontSize: 11.5, color: C.muted }}>GATE <span style={{ color: C.cyan }}>{f.gate}</span></span>}
        </div>
      )}
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
        <div className="flex gap-2 flex-wrap">
          <GhostBtn icon={Radio} label="Status" accent={C.cyan} onClick={onRefresh} busy={busy} />
          <GhostBtn icon={MapIcon} label="Map" accent={C.green} onClick={onMap} />
          <GhostBtn icon={Eye} label="Fares" accent={C.amber} onClick={onWatch} />
        </div>
        <button onClick={onDelete} style={{ color: C.muted, opacity: 0.55 }} className="active:scale-90 transition-transform"><Trash2 size={15} /></button>
      </div>
      <div className="flex items-center justify-between mt-2.5">
        {f.source ? <SourceTag source={f.source} /> : <span />}
        {f.lastChecked && <span style={{ ...mono, fontSize: 9.5, color: C.muted, opacity: 0.55 }}>{new Date(f.lastChecked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
      </div>
    </div>
  );
}

/* ════════════════════ WATCH CARD ════════════════════ */
function WatchCard({ watch: w, onCheck, onTrack, onDelete, busy }) {
  const hist = w.history || [];
  const latest = hist.length ? hist[hist.length - 1].price : null;
  const prev = hist.length > 1 ? hist[hist.length - 2].price : null;
  const best = hist.length ? Math.min(...hist.map((h) => h.price)) : null;
  const hit = w.targetPrice && latest != null && latest <= w.targetPrice;
  return (
    <div className="rounded-2xl p-4 mb-3 card" style={hit ? { borderColor: "rgba(255,192,105,0.5)", boxShadow: "0 0 28px rgba(255,192,105,0.1)" } : undefined}>
      <div className="flex items-center justify-between mb-0.5">
        <span style={{ ...disp, fontSize: 23, fontWeight: 700, color: C.text }}>
          {w.origin}<ArrowRight size={16} style={{ display: "inline", margin: "0 7px 3px", color: C.amber }} />{w.dest}
        </span>
        {hit && <Pill bg={C.amberDim} fg={C.amber} glow>Target hit</Pill>}
      </div>
      <div style={{ ...mono, fontSize: 11, color: C.muted }} className="mb-2.5 flex items-center gap-1.5 flex-wrap">
        <CalendarDays size={12} />
        {w.departDate ? fmtDate(w.departDate) : "flexible"}{w.returnDate ? ` → ${fmtDate(w.returnDate)}` : ""}
        {w.targetPrice ? <span>· target ${w.targetPrice}</span> : null}
      </div>
      <div className="flex items-end gap-4">
        <div style={{ minWidth: 92 }}>
          <div style={{ ...mono, fontSize: 10, color: C.muted, letterSpacing: "0.12em" }}>LOWEST NOW</div>
          <div style={{ ...disp, fontSize: 34, fontWeight: 700, color: hit ? C.amber : C.text, lineHeight: 1.05 }}>
            {latest != null ? `$${latest}` : "—"}
            {prev != null && latest < prev && <TrendingDown size={18} style={{ display: "inline", marginLeft: 6, color: C.green }} />}
            {prev != null && latest > prev && <TrendingUp size={18} style={{ display: "inline", marginLeft: 6, color: C.red }} />}
          </div>
          {best != null && <div style={{ ...mono, fontSize: 10.5, color: C.muted }} className="mt-0.5">best <span style={{ color: C.green }}>${best}</span></div>}
        </div>
        <div className="flex-1" style={{ height: 70 }}>
          {hist.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hist} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                <defs>
                  <linearGradient id={`g-${w.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.amber} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide /><YAxis hide domain={["dataMin - 25", "dataMax + 25"]} />
                <Tooltip contentStyle={{ background: "#0B1322", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                  labelStyle={{ color: C.muted }} formatter={(v) => [`$${v}`, "fare"]} />
                <Area type="monotone" dataKey="price" stroke={C.amber} strokeWidth={2} fill={`url(#g-${w.id})`} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center" style={{ ...mono, fontSize: 10.5, color: C.muted, opacity: 0.55 }}>
              check fares again to draw the trend
            </div>
          )}
        </div>
      </div>
      {(w.offers || []).length > 0 && (
        <div className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${C.borderSoft}` }}>
          {w.offers.map((o, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2"
              style={{ background: i % 2 ? "transparent" : "rgba(125,170,255,0.035)", ...mono, fontSize: 11.5 }}>
              <span style={{ color: C.text }}>{AIRLINE_NAME[o.carrier] || o.carrier}
                <span style={{ color: C.muted }}> · {o.stops === 0 ? "nonstop" : `${o.stops} stop${o.stops > 1 ? "s" : ""}`}{o.duration ? ` · ${o.duration}` : ""}</span>
              </span>
              <span style={{ color: i === 0 ? C.amber : C.text, fontWeight: 600 }}>${o.price}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 flex-wrap gap-2" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
        <div className="flex gap-2 flex-wrap">
          <GhostBtn icon={RefreshCw} label="Check fares" accent={C.amber} onClick={onCheck} busy={busy} />
          <GhostBtn icon={PlaneTakeoff} label="Track it" accent={C.cyan} onClick={onTrack} />
          <a href={gfLink(w)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{ ...mono, fontSize: 11.5, color: C.green, background: "rgba(125,240,178,0.07)", border: `1px solid rgba(125,240,178,0.18)` }}>
            <ExternalLink size={12} /> Book
          </a>
        </div>
        <button onClick={onDelete} style={{ color: C.muted, opacity: 0.55 }} className="active:scale-90 transition-transform"><Trash2 size={15} /></button>
      </div>
      <div className="mt-2.5">{w.source && <SourceTag source={w.source} />}</div>
    </div>
  );
}

/* ════════════════════ FORMS & SETTINGS ════════════════════ */
function FlightForm({ prefill = {}, onSubmit }) {
  const [f, setF] = useState({ airline: "", airlineCode: "", flightNo: "", origin: prefill.origin || "", dest: prefill.dest || "", date: todayISO(), depTime: "", arrTime: "" });
  const ok = f.flightNo && f.origin && f.dest && f.date;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <AirlineField label="Airline" value={f.airline}
          onChange={({ name, code }) => setF((p) => ({ ...p, airline: name, airlineCode: code, flightNo: p.flightNo && /^\d+$/.test(p.flightNo) ? `${code}${p.flightNo}` : p.flightNo }))} />
        <Field label="Flight no." placeholder={f.airlineCode ? `${f.airlineCode}837` : "UA837"} value={f.flightNo}
          onChange={(e) => setF({ ...f, flightNo: e.target.value.toUpperCase() })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <AirportField label="From" value={f.origin} placeholder="SFO" onChange={(v) => setF((p) => ({ ...p, origin: v }))} />
        <AirportField label="To" value={f.dest} placeholder="NRT" onChange={(v) => setF((p) => ({ ...p, dest: v }))} />
      </div>
      <Field label="Date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Departs" type="time" value={f.depTime} onChange={(e) => setF({ ...f, depTime: e.target.value })} />
        <Field label="Arrives" type="time" value={f.arrTime} onChange={(e) => setF({ ...f, arrTime: e.target.value })} />
      </div>
      <button disabled={!ok} onClick={() => onSubmit(f)} className="w-full py-3.5 rounded-xl mt-1 active:scale-[0.98] transition-transform"
        style={{ ...disp, fontSize: 15, fontWeight: 700, background: ok ? C.cyan : "rgba(125,170,255,0.1)", color: ok ? "#04121A" : C.muted, boxShadow: ok ? "0 6px 24px rgba(91,227,240,0.3)" : "none" }}>
        Track flight
      </button>
      <p style={{ ...mono, fontSize: 10.5, color: C.muted, opacity: 0.65 }} className="mt-3 text-center">Times optional — Status fills them in live.</p>
    </div>
  );
}
function WatchForm({ prefill = {}, onSubmit }) {
  const [w, setW] = useState({ origin: prefill.origin || "", dest: prefill.dest || "", departDate: "", returnDate: "", targetPrice: "" });
  const ok = w.origin && w.dest;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <AirportField label="From" value={w.origin} placeholder="SFO" onChange={(v) => setW((p) => ({ ...p, origin: v }))} />
        <AirportField label="To" value={w.dest} placeholder="NRT" onChange={(v) => setW((p) => ({ ...p, dest: v }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Depart" type="date" value={w.departDate} onChange={(e) => setW({ ...w, departDate: e.target.value })} />
        <Field label="Return (optional)" type="date" value={w.returnDate} onChange={(e) => setW({ ...w, returnDate: e.target.value })} />
      </div>
      <Field label="Target price USD (optional)" type="number" placeholder="650" value={w.targetPrice}
        onChange={(e) => setW({ ...w, targetPrice: e.target.value ? Number(e.target.value) : "" })} />
      <button disabled={!ok} onClick={() => onSubmit(w)} className="w-full py-3.5 rounded-xl mt-1 active:scale-[0.98] transition-transform"
        style={{ ...disp, fontSize: 15, fontWeight: 700, background: ok ? C.amber : "rgba(125,170,255,0.1)", color: ok ? "#1A1004" : C.muted, boxShadow: ok ? "0 6px 24px rgba(255,192,105,0.3)" : "none" }}>
        Start watching
      </button>
      <p style={{ ...mono, fontSize: 10.5, color: C.muted, opacity: 0.65 }} className="mt-3 text-center">First check runs immediately. Each re-check adds a trend point.</p>
    </div>
  );
}
function SettingsForm({ settings, onSave }) {
  const [s, setS] = useState({ ...settings });
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });
  return (
    <div>
      <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(125,170,255,0.05)", border: `1px solid ${C.borderSoft}` }}>
        <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>
          Without keys, Contrail uses AI web-search estimates. Add free keys for live data — keys are stored only in your app storage.
        </p>
      </div>
      <div style={{ ...mono, fontSize: 11, color: C.amber, letterSpacing: "0.1em" }} className="uppercase mb-2">Amadeus — real fares</div>
      <Field label="API key" value={s.amadeusKey} onChange={set("amadeusKey")} placeholder="from developers.amadeus.com" />
      <Field label="API secret" type="password" value={s.amadeusSecret} onChange={set("amadeusSecret")} />
      <label className="block mb-4">
        <span style={{ ...mono, fontSize: 10.5, color: C.muted, letterSpacing: "0.1em" }} className="block mb-1.5 uppercase">Environment</span>
        <div className="flex gap-2">
          {["test", "prod"].map((env) => (
            <button key={env} onClick={() => setS({ ...s, amadeusEnv: env })} className="flex-1 py-2 rounded-lg"
              style={{ ...mono, fontSize: 12, color: s.amadeusEnv === env ? C.amber : C.muted, background: s.amadeusEnv === env ? C.amberDim : "rgba(125,170,255,0.05)", border: `1px solid ${s.amadeusEnv === env ? "rgba(255,192,105,0.3)" : C.borderSoft}` }}>
              {env === "test" ? "Test (free)" : "Production"}
            </button>
          ))}
        </div>
      </label>
      <div style={{ ...mono, fontSize: 11, color: C.cyan, letterSpacing: "0.1em" }} className="uppercase mb-2">AeroDataBox — live status</div>
      <Field label="RapidAPI key" type="password" value={s.rapidKey} onChange={set("rapidKey")} hint="rapidapi.com → AeroDataBox → Basic (free tier)" />
      <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(125,240,178,0.05)", border: `1px solid rgba(125,240,178,0.15)` }}>
        <p style={{ ...mono, fontSize: 10.5, color: C.green }}>ADS-B positions + live map via adsb.lol — free, no key, already on.</p>
      </div>
      <button onClick={() => onSave(s)} className="w-full py-3.5 rounded-xl active:scale-[0.98] transition-transform"
        style={{ ...disp, fontSize: 15, fontWeight: 700, background: C.cyan, color: "#04121A" }}>
        Save
      </button>
    </div>
  );
}
function EmptyState({ icon: Icon, title, body, actions, accent }) {
  return (
    <div className="pt-12 text-center rise">
      <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
        style={{ background: C.panel, border: `1px solid ${C.border}`, boxShadow: `0 0 40px ${accent}11` }}>
        <Icon size={26} style={{ color: accent }} />
      </div>
      <h3 style={{ ...disp, fontSize: 19, fontWeight: 700, color: C.text }}>{title}</h3>
      <p style={{ fontSize: 13.5, color: C.muted, maxWidth: 300 }} className="mx-auto mt-1.5 leading-relaxed">{body}</p>
      <div className="flex gap-2 justify-center mt-5 flex-wrap">
        {actions.map((a) => (
          <button key={a.label} onClick={a.onClick} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
            style={{ ...mono, fontSize: 12.5, color: accent, background: C.panel, border: `1px solid ${C.border}` }}>
            <a.icon size={14} /> {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════ APP ════════════════════ */
export default function Contrail() {
  const [tab, setTab] = useState("flights");
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(null);
  const [busyIds, setBusyIds] = useState({});
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadData().then((d) => { setData(d); setLoaded(true); }); }, []);
  const update = useCallback((fn) => setData((p) => { const n = fn(p); persist(n); return n; }), []);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 3400); };
  const setBusy = (id, v) => setBusyIds((b) => ({ ...b, [id]: v }));

  const scanEmail = async () => {
    setScanning(true);
    try {
      const result = await claudeJSON({
        useGmail: true,
        prompt: `Search my Gmail for airline flight confirmation/itinerary emails from the last 90 days for upcoming flights. Extract each flight.
Respond ONLY a JSON array: [{"airline":"United","flightNo":"UA837","origin":"SFO","dest":"NRT","date":"2026-07-15","depTime":"11:05","arrTime":"14:20","status":"Scheduled"}]
IATA codes, 24h times, ISO dates. If none: [].`,
      });
      const incoming = Array.isArray(result) ? result : [];
      let added = 0;
      update((prev) => {
        const seen = new Set(prev.flights.map((x) => `${x.flightNo}|${x.date}`));
        const fresh = incoming.filter((x) => x.flightNo && !seen.has(`${x.flightNo}|${x.date}`)).map((x) => ({ id: uid(), status: "Scheduled", ...x }));
        added = fresh.length;
        return { ...prev, flights: [...fresh, ...prev.flights] };
      });
      flash(added ? `Added ${added} flight${added > 1 ? "s" : ""} from Gmail` : "No new flights found in Gmail");
    } catch (e) { console.error(e); flash("Gmail scan failed — check the Gmail connector"); }
    setScanning(false);
  };

  const refreshFlight = async (f) => {
    setBusy(f.id, true);
    let patch = null, source = null;
    const hasKey = !!data.settings.rapidKey;
    if (hasKey) {
      try { patch = await aeroDataBoxStatus(data.settings, f); source = "aerodatabox"; }
      catch (e) { console.warn("ADB", e); }
    }
    let tele = null;
    try { tele = await adsbLive(f); } catch { /* fine */ }
    if (tele && (!patch || !patch.status || ["Scheduled", "In Air", "On Time"].includes(patch.status))) {
      patch = { ...(patch || {}), status: "In Air" };
      source = source || "adsb";
    }
    if (!patch || !patch.status) {
      try { patch = { ...(patch || {}), ...(await aiStatus(f)) }; source = "ai"; }
      catch (e) {
        console.error(e); setBusy(f.id, false);
        return flash(hasKey ? "All status sources unreachable right now" : "Status lookup failed — try an AeroDataBox key in settings");
      }
    }
    update((prev) => ({
      ...prev,
      flights: prev.flights.map((x) => x.id === f.id ? {
        ...x, status: patch.status || x.status, gate: patch.gate || x.gate, terminal: patch.terminal || x.terminal,
        depTime: patch.depTime || x.depTime, arrTime: patch.arrTime || x.arrTime,
        delay: patch.delay || 0, telemetry: tele || null, source, lastChecked: Date.now(),
      } : x),
    }));
    setBusy(f.id, false);
  };

  const checkFares = async (w) => {
    setBusy(w.id, true);
    let r = null;
    const hasKeys = data.settings.amadeusKey && data.settings.amadeusSecret;
    if (hasKeys) { try { r = await amadeusFares(data.settings, w); } catch (e) { console.warn("Amadeus", e); } }
    if (!r) {
      try { r = await aiFares(w); if (hasKeys) flash("Amadeus unreachable — used AI estimate"); }
      catch (e) { console.error(e); setBusy(w.id, false); return flash("Couldn't pull fares right now"); }
    }
    update((prev) => ({
      ...prev,
      watches: prev.watches.map((x) => x.id === w.id ? {
        ...x,
        history: [...(x.history || []), { t: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }), price: Math.round(r.price) }].slice(-40),
        offers: r.offers || x.offers, source: r.source, lastChecked: Date.now(),
      } : x),
    }));
    setBusy(w.id, false);
  };

  const addFlight = (f) => {
    update((p) => ({ ...p, flights: [{ id: uid(), status: "Scheduled", ...f }, ...p.flights] }));
    setModal(null); setTab("flights"); flash(`Tracking ${f.flightNo} · ${f.origin}→${f.dest}`);
  };
  const addWatch = (w) => {
    const watch = { id: uid(), history: [], ...w };
    update((p) => ({ ...p, watches: [watch, ...p.watches] }));
    setModal(null); setTab("fares"); flash(`Watching ${w.origin}→${w.dest} fares`);
    setTimeout(() => checkFares(watch), 60);
  };

  const flights = data.flights || [];
  const watches = data.watches || [];
  const liveKeys = !!(data.settings.amadeusKey || data.settings.rapidKey);

  return (
    <div className="min-h-screen relative" style={{ background: `radial-gradient(1200px 600px at 70% -10%, #0B1830 0%, ${C.ink} 55%)`, color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        body { margin: 0; }
        input::placeholder { color: rgba(134,150,174,0.45); }
        .card {
          background: linear-gradient(165deg, rgba(125,170,255,0.075), rgba(125,170,255,0.03));
          border: 1px solid ${C.border};
          backdrop-filter: blur(14px);
          box-shadow: 0 8px 32px rgba(2,6,14,0.5), inset 0 1px 0 rgba(190,215,255,0.07);
          transition: transform .2s ease;
        }
        .card:active { transform: scale(0.995); }
        .tele {
          display:inline-flex; align-items:center; gap:4px;
          font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em;
          color:${C.cyan}; background:${C.cyanDim}; border:1px solid rgba(91,227,240,0.22);
          padding:3px 8px; border-radius:8px;
        }
        .aurora {
          position: fixed; z-index: 0; pointer-events: none;
          width: 130vw; height: 50vh; left: -15vw; top: -18vh;
          background:
            radial-gradient(40% 60% at 30% 50%, rgba(91,227,240,0.10), transparent 70%),
            radial-gradient(35% 55% at 65% 40%, rgba(157,140,255,0.09), transparent 70%),
            radial-gradient(30% 50% at 85% 60%, rgba(255,192,105,0.06), transparent 70%);
          filter: blur(30px);
          animation: drift 26s ease-in-out infinite alternate;
        }
        @keyframes drift { from { transform: translateX(-3%); } to { transform: translateX(3%) translateY(2%); } }
        @keyframes rise { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform:none;} }
        .rise { animation: rise .4s cubic-bezier(.2,.7,.3,1) both; }
        @keyframes tick { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ticker-inner { display:inline-flex; white-space:nowrap; animation: tick 28s linear infinite; }
        @keyframes pingAnim { 0% { transform: scale(.6); opacity:.7; } 100% { transform: scale(2.2); opacity:0; } }
        .ping { transform-origin: center; animation: pingAnim 1.8s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .aurora, .ticker-inner, .ping { animation: none !important; }
          * { transition: none !important; }
        }
      `}</style>

      <SkyCanvas />
      <div className="aurora" />

      <div className="relative" style={{ zIndex: 1 }}>
        <header className="px-5 pt-6 pb-3 max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div style={{ ...mono, fontSize: 9, color: C.muted, letterSpacing: "0.28em" }} className="uppercase mb-0.5">Live tracking · Fare radar</div>
              <div className="flex items-center gap-2">
                <Plane size={20} style={{ color: C.cyan, transform: "rotate(-45deg)", filter: `drop-shadow(0 0 6px ${C.cyan})` }} />
                <span style={{ ...disp, fontSize: 22, fontWeight: 700 }}>Contrail</span>
                {liveKeys && <Zap size={12} style={{ color: C.green }} />}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={scanEmail} disabled={scanning} className="flex items-center gap-1.5 px-3 py-2 rounded-xl active:scale-95 transition-transform"
                style={{ ...mono, fontSize: 11.5, color: C.cyan, background: C.cyanDim, border: `1px solid rgba(91,227,240,0.25)` }}>
                {scanning ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                {scanning ? "Scanning…" : "Gmail"}
              </button>
              <button onClick={() => setModal({ type: "settings" })} className="px-3 py-2 rounded-xl active:scale-95 transition-transform"
                style={{ color: C.muted, background: "rgba(125,170,255,0.06)", border: `1px solid ${C.borderSoft}` }} aria-label="Data settings">
                <Settings size={15} />
              </button>
            </div>
          </div>

          {flights.length > 0 && (
            <div className="mt-4 rounded-xl overflow-hidden" style={{ border: `1px solid ${C.borderSoft}`, background: "rgba(3,8,16,0.55)" }}>
              <div className="ticker-inner py-1.5">
                {[0, 1].map((dup) => (
                  <span key={dup}>
                    {flights.map((f) => (
                      <span key={`${dup}-${f.id}`} style={{ ...mono, fontSize: 10.5, letterSpacing: "0.08em" }} className="uppercase px-4">
                        <span style={{ color: C.cyan }}>{f.flightNo}</span>
                        <span style={{ color: C.muted }}> {f.origin}→{f.dest} · </span>
                        <span style={{ color: (STATUS_STYLE[f.status] || {}).fg || C.muted }}>{f.status}</span>
                        {f.gate && <span style={{ color: C.muted }}> · GATE {f.gate}</span>}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 p-1 rounded-2xl flex relative" style={{ background: "rgba(125,170,255,0.055)", border: `1px solid ${C.border}` }}>
            <div className="absolute top-1 bottom-1 rounded-xl transition-all duration-300"
              style={{
                left: tab === "flights" ? 4 : "50%", width: "calc(50% - 4px)",
                background: tab === "flights" ? C.cyanDim : C.amberDim,
                border: `1px solid ${tab === "flights" ? "rgba(91,227,240,0.3)" : "rgba(255,192,105,0.3)"}`,
                boxShadow: tab === "flights" ? "0 0 20px rgba(91,227,240,0.15)" : "0 0 20px rgba(255,192,105,0.13)",
              }} />
            {[
              { id: "flights", label: "Flights", icon: PlaneTakeoff, n: flights.length, color: C.cyan },
              { id: "fares", label: "Fares", icon: TrendingDown, n: watches.length, color: C.amber },
            ].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 relative z-10"
                style={{ ...mono, fontSize: 13, color: tab === t.id ? t.color : C.muted, fontWeight: 500 }}>
                <t.icon size={15} /> {t.label}
                {t.n > 0 && <span style={{ fontSize: 10, background: "rgba(125,170,255,0.12)", borderRadius: 99, padding: "1px 7px" }}>{t.n}</span>}
              </button>
            ))}
          </div>
        </header>

        <main className="px-5 pb-32 max-w-lg mx-auto">
          {!loaded ? (
            <div className="flex justify-center pt-16"><Loader2 size={22} className="animate-spin" style={{ color: C.muted }} /></div>
          ) : tab === "flights" ? (
            flights.length === 0 ? (
              <EmptyState icon={PlaneTakeoff} accent={C.cyan} title="No flights on radar"
                body="Scan Gmail to pull in bookings, or add a flight by number. Live positions stream from the ADS-B network."
                actions={[
                  { label: "Scan Gmail", icon: Mail, onClick: scanEmail },
                  { label: "Add flight", icon: Plus, onClick: () => setModal({ type: "flight" }) },
                ]} />
            ) : flights.map((f) => (
              <div className="rise" key={f.id}>
                <FlightCard flight={f} busy={!!busyIds[f.id]}
                  onRefresh={() => refreshFlight(f)}
                  onMap={() => setModal({ type: "map", flight: f })}
                  onWatch={() => setModal({ type: "watch", prefill: { origin: f.origin, dest: f.dest } })}
                  onDelete={() => update((p) => ({ ...p, flights: p.flights.filter((x) => x.id !== f.id) }))} />
              </div>
            ))
          ) : watches.length === 0 ? (
            <EmptyState icon={TrendingDown} accent={C.amber} title="No fares on the radar"
              body="Pick a route and Contrail pulls real offers from Amadeus (or AI estimates) so you can spot the dip and book."
              actions={[{ label: "Watch a route", icon: Plus, onClick: () => setModal({ type: "watch" }) }]} />
          ) : watches.map((w) => (
            <div className="rise" key={w.id}>
              <WatchCard watch={w} busy={!!busyIds[w.id]}
                onCheck={() => checkFares(w)}
                onTrack={() => setModal({ type: "flight", prefill: { origin: w.origin, dest: w.dest } })}
                onDelete={() => update((p) => ({ ...p, watches: p.watches.filter((x) => x.id !== w.id) }))} />
            </div>
          ))}
        </main>

        <button onClick={() => setModal({ type: tab === "flights" ? "flight" : "watch" })}
          className="fixed bottom-6 right-5 w-14 h-14 rounded-2xl flex items-center justify-center z-40 active:scale-90 transition-transform"
          style={{
            background: `linear-gradient(150deg, ${tab === "flights" ? C.cyan : C.amber}, ${tab === "flights" ? "#37B8C9" : "#E59A3C"})`,
            color: "#04101A", boxShadow: `0 10px 32px ${tab === "flights" ? "rgba(91,227,240,0.4)" : "rgba(255,192,105,0.4)"}`,
          }}
          aria-label={tab === "flights" ? "Add flight" : "Watch a route"}>
          <Plus size={24} strokeWidth={2.5} />
        </button>

        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl z-50 rise"
            style={{ ...mono, fontSize: 12, background: "#0E1828", border: `1px solid ${C.border}`, color: C.text, maxWidth: "90vw", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
            {toast}
          </div>
        )}

        {modal?.type === "flight" && <Modal title="Track a flight" onClose={() => setModal(null)}><FlightForm prefill={modal.prefill} onSubmit={addFlight} /></Modal>}
        {modal?.type === "watch" && <Modal title="Watch a route" onClose={() => setModal(null)}><WatchForm prefill={modal.prefill} onSubmit={addWatch} /></Modal>}
        {modal?.type === "settings" && (
          <Modal title="Data sources" onClose={() => setModal(null)}>
            <SettingsForm settings={data.settings}
              onSave={(s) => { _amTok = { token: null, exp: 0 }; update((p) => ({ ...p, settings: s })); setModal(null); flash("Data sources saved"); }} />
          </Modal>
        )}
        {modal?.type === "map" && (
          <MapModal flight={modal.flight} onClose={() => setModal(null)}
            onTelemetry={(t) => update((p) => ({
              ...p,
              flights: p.flights.map((x) => x.id === modal.flight.id ? { ...x, telemetry: t, status: "In Air", source: x.source || "adsb" } : x),
            }))} />
        )}
      </div>
    </div>
  );
}


/* ════════════════════ AIRPORT WEATHER & DELAYS ════════════════════ */
const WMO = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Showers", 81: "Showers", 82: "Violent showers", 85: "Snow showers", 86: "Snow showers",
  95: "Thunderstorm", 96: "Thunderstorm + hail", 99: "Thunderstorm + hail",
};
const _wxCache = {}, _dlyCache = {};
async function airportWeather(iata) {
  const c = _wxCache[iata];
  if (c && Date.now() - c.at < 600000) return c;
  const a = APMAP[iata];
  if (!a) throw new Error("Unknown airport");
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${a[3]}&longitude=${a[4]}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,relative_humidity_2m&temperature_unit=fahrenheit&wind_speed_unit=kn`;
  const res = await fetch(u);
  if (!res.ok) throw new Error(`wx ${res.status}`);
  const j = await res.json();
  const cur = j.current || {};
  const out = {
    at: Date.now(),
    temp: cur.temperature_2m != null ? Math.round(cur.temperature_2m) : null,
    cond: WMO[cur.weather_code] ?? "—",
    code: cur.weather_code,
    wind: cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m) : null,
    gust: cur.wind_gusts_10m != null ? Math.round(cur.wind_gusts_10m) : null,
    dir: cur.wind_direction_10m != null ? Math.round(cur.wind_direction_10m) : null,
    hum: cur.relative_humidity_2m ?? null,
  };
  _wxCache[iata] = out;
  return out;
}
const DELAY_LEVELS = {
  none: { label: "No delays", color: "#7DF0B2" },
  minor: { label: "Minor delays", color: "#5BE3F0" },
  moderate: { label: "Moderate delays", color: "#FFC069" },
  severe: { label: "Severe delays", color: "#FF8585" },
};
async function airportDelays(settings, iata) {
  const c = _dlyCache[iata];
  if (c && Date.now() - c.at < 600000) return c;
  let out = null;
  if (settings?.rapidKey) {
    try {
      const res = await fetch(`https://aerodatabox.p.rapidapi.com/airports/iata/${iata}/delays`, {
        headers: { "X-RapidAPI-Key": settings.rapidKey, "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com" },
      });
      if (res.ok) {
        const j = await res.json();
        const idx = j?.departuresDelayIndex ?? j?.delayIndex ?? j?.departures?.delayIndex;
        const med = j?.departuresMedianDelay ?? null;
        if (typeof idx === "number") {
          const level = idx < 1 ? "none" : idx < 2.5 ? "minor" : idx < 3.5 ? "moderate" : "severe";
          out = { at: Date.now(), level, note: med ? `Median departure delay ${med}` : `Delay index ${idx.toFixed(1)} / 5`, source: "aerodatabox" };
        }
      }
    } catch { /* fall through */ }
  }
  if (!out) {
    const r = await claudeJSON({
      useWebSearch: true,
      prompt: `Are there flight delays at ${APMAP[iata]?.[1] || iata} airport (${iata}) right now? Search.
Respond ONLY JSON: {"level":"none|minor|moderate|severe","note":"one short sentence"}`,
    });
    out = { at: Date.now(), level: DELAY_LEVELS[r.level] ? r.level : "none", note: r.note || "", source: "ai" };
  }
  _dlyCache[iata] = out;
  return out;
}

/* ════════════════════ AIRPORT SHEET ════════════════════ */
function AirportSheet({ iata, settings, onClose }) {
  const ap = APMAP[iata];
  const [wx, setWx] = useState(null);
  const [dly, setDly] = useState(null);
  useEffect(() => {
    setWx(null); setDly(null);
    let dead = false;
    airportWeather(iata).then((w) => !dead && setWx(w)).catch(() => !dead && setWx({ err: true }));
    airportDelays(settings, iata).then((d) => !dead && setDly(d)).catch(() => !dead && setDly({ err: true }));
    return () => { dead = true; };
  }, [iata, settings]);
  if (!ap) return null;
  const lvl = dly && !dly.err ? DELAY_LEVELS[dly.level] : null;
  return (
    <div className="absolute left-3 right-3 rounded-2xl p-4 rise"
      style={{ bottom: 84, background: "rgba(6,11,22,0.94)", border: `1px solid ${C.border}`, backdropFilter: "blur(14px)", zIndex: 600, boxShadow: "0 16px 50px rgba(0,0,0,0.6)" }}>
      <div className="flex items-start justify-between">
        <div>
          <div style={{ ...disp, fontSize: 24, fontWeight: 700, color: C.text, lineHeight: 1 }}>{iata}</div>
          <div style={{ ...mono, fontSize: 11, color: C.muted }} className="mt-1">{ap[1]} — {ap[2]}</div>
        </div>
        <button onClick={onClose} style={{ color: C.muted }} className="p-1"><X size={17} /></button>
      </div>

      {/* weather */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {wx === null ? (
          <span style={{ ...mono, fontSize: 11, color: C.muted }} className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> weather…</span>
        ) : wx.err ? (
          <span style={{ ...mono, fontSize: 11, color: C.muted }}>Weather unavailable</span>
        ) : (
          <>
            <span className="flex items-center gap-1.5" style={{ ...mono, fontSize: 12, color: C.text }}>
              <Thermometer size={13} style={{ color: C.cyan }} />{wx.temp != null ? `${wx.temp}°F` : "—"}
              <span style={{ color: C.muted }}>· {wx.cond}</span>
            </span>
            {wx.wind != null && (
              <span className="flex items-center gap-1.5" style={{ ...mono, fontSize: 12, color: C.text }}>
                <Wind size={13} style={{ color: C.cyan }} />{wx.wind} kt{wx.dir != null ? ` @ ${wx.dir}°` : ""}
                {wx.gust && wx.gust > (wx.wind || 0) + 8 ? <span style={{ color: C.amber }}> G{wx.gust}</span> : null}
              </span>
            )}
          </>
        )}
      </div>

      {/* delays */}
      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
        {dly === null ? (
          <span style={{ ...mono, fontSize: 11, color: C.muted }} className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> checking delays…</span>
        ) : dly.err ? (
          <span style={{ ...mono, fontSize: 11, color: C.muted }}>Delay info unavailable</span>
        ) : (
          <div>
            <span className="px-2 py-1 rounded-md uppercase font-medium"
              style={{ ...mono, fontSize: 10.5, letterSpacing: "0.09em", color: lvl.color, background: `${lvl.color}1f`, boxShadow: dly.level === "severe" ? `0 0 14px ${lvl.color}44` : "none" }}>
              {dly.level !== "none" && <AlertTriangle size={10} style={{ display: "inline", marginRight: 4, marginBottom: 2 }} />}
              {lvl.label}
            </span>
            {dly.note && <span style={{ ...mono, fontSize: 10.5, color: C.muted }} className="block mt-1.5">{dly.note}</span>}
          </div>
        )}
        {dly && !dly.err && <SourceTag source={dly.source === "aerodatabox" ? "aerodatabox" : "ai"} />}
      </div>
    </div>
  );
}

/* ════════════════════ LIVE MAP (single flight or whole fleet) ════════════════════ */
function MapModal({ flights, single, settings, onClose, onTelemetry }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const planeRefs = useRef({});
  const flownRefs = useRef({});
  const [teleMap, setTeleMap] = useState(() => Object.fromEntries(flights.filter((f) => f.telemetry?.lat != null).map((f) => [f.id, f.telemetry])));
  const [err, setErr] = useState(null);
  const [checking, setChecking] = useState(false);
  const [lastPing, setLastPing] = useState(null);
  const [selAirport, setSelAirport] = useState(null);

  const f0 = flights[0];

  const planeIcon = (L, track, label) =>
    L.divIcon({
      className: "",
      html: `<div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;transform:rotate(${track ?? 0}deg);filter:drop-shadow(0 0 8px ${C.cyan});">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="${C.cyan}"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
        </div>
        ${!single && label ? `<div style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.08em;color:${C.cyan};text-shadow:0 1px 4px #000;margin-top:1px;">${label}</div>` : ""}
      </div>`,
      iconSize: [44, 40], iconAnchor: [22, 15],
    });
  const dotIcon = (L, color, label) =>
    L.divIcon({
      className: "",
      html: `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;transform:translateY(-4px);cursor:pointer;">
        <div style="width:11px;height:11px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color};border:2px solid rgba(255,255,255,0.25);"></div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.08em;color:${color};text-shadow:0 1px 4px #000;">${label}</div>
      </div>`,
      iconSize: [44, 30], iconAnchor: [22, 9],
    });

  useEffect(() => {
    let dead = false;
    loadLeaflet().then((L) => {
      if (dead || !divRef.current) return;
      const map = L.map(divRef.current, { zoomControl: false, attributionControl: true, worldCopyJump: true });
      mapRef.current = map;
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO", subdomains: "abcd", maxZoom: 12,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      const bounds = [];
      const airportSet = new Map();
      for (const f of flights) {
        const o = APMAP[f.origin], d = APMAP[f.dest];
        if (o && d) {
          const route = gcPoints([o[3], o[4]], [d[3], d[4]]);
          L.polyline(route, { color: "rgba(125,170,255,0.32)", weight: 1.5, dashArray: "3 6" }).addTo(map);
          bounds.push([o[3], o[4]], [d[3], d[4]]);
        }
        if (o) airportSet.set(f.origin, { ap: o, color: C.cyan });
        if (d) airportSet.set(f.dest, { ap: d, color: C.amber });
        const t = teleMap[f.id];
        if (t?.lat != null) {
          if (o) {
            flownRefs.current[f.id] = L.polyline(gcPoints([o[3], o[4]], [t.lat, t.lon], 48), { color: C.cyan, weight: 2.5, opacity: 0.9 }).addTo(map);
          }
          planeRefs.current[f.id] = L.marker([t.lat, t.lon], { icon: planeIcon(L, t.track, f.flightNo), zIndexOffset: 1000 }).addTo(map);
          bounds.push([t.lat, t.lon]);
        }
      }
      for (const [code, { ap, color }] of airportSet) {
        const m = L.marker([ap[3], ap[4]], { icon: dotIcon(L, color, code) }).addTo(map);
        m.on("click", () => setSelAirport(code));
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });
      else map.setView([30, 0], 2);
    }).catch((e) => setErr(e.message));
    return () => { dead = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } planeRefs.current = {}; flownRefs.current = {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshPositions = useCallback(async () => {
    setChecking(true);
    const active = flights.filter((f) => !["Landed", "Cancelled"].includes(f.status));
    for (const f of active) {
      let t = null;
      try { t = await adsbLive(f); } catch { /* skip */ }
      if (!t) continue;
      setTeleMap((m) => ({ ...m, [f.id]: t }));
      onTelemetry?.(f.id, t);
      const L = window.L;
      if (L && mapRef.current) {
        const ex = planeRefs.current[f.id];
        if (ex) { ex.setLatLng([t.lat, t.lon]); ex.setIcon(planeIcon(L, t.track, f.flightNo)); }
        else {
          planeRefs.current[f.id] = L.marker([t.lat, t.lon], { icon: planeIcon(L, t.track, f.flightNo), zIndexOffset: 1000 }).addTo(mapRef.current);
          if (single) mapRef.current.panTo([t.lat, t.lon]);
        }
        const o = APMAP[f.origin];
        if (o) {
          const flownPts = gcPoints([o[3], o[4]], [t.lat, t.lon], 48);
          if (flownRefs.current[f.id]) flownRefs.current[f.id].setLatLngs(flownPts);
          else flownRefs.current[f.id] = L.polyline(flownPts, { color: C.cyan, weight: 2.5, opacity: 0.9 }).addTo(mapRef.current);
        }
      }
    }
    setLastPing(Date.now());
    setChecking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flights, onTelemetry, single]);

  useEffect(() => {
    refreshPositions();
    const iv = setInterval(refreshPositions, 25000);
    return () => clearInterval(iv);
  }, [refreshPositions]);

  const liveCount = Object.keys(teleMap).length;
  const tele = single ? teleMap[f0?.id] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#04070F" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.borderSoft}`, background: "rgba(4,7,15,0.9)", backdropFilter: "blur(10px)", zIndex: 700 }}>
        <div>
          <div style={{ ...mono, fontSize: 9, color: C.muted, letterSpacing: "0.25em" }} className="uppercase">{single ? "Live radar" : "Fleet radar"}</div>
          <div style={{ ...disp, fontSize: 17, fontWeight: 700, color: C.text }}>
            {single ? (
              <>
                {f0.flightNo} <span style={{ color: C.muted, fontWeight: 500 }}>{f0.origin}</span>
                <ArrowRight size={13} style={{ display: "inline", margin: "0 5px 2px", color: C.cyan }} />
                <span style={{ color: C.muted, fontWeight: 500 }}>{f0.dest}</span>
              </>
            ) : (
              <>{flights.length} flight{flights.length !== 1 ? "s" : ""} <span style={{ color: C.cyan, fontWeight: 500 }}>· {liveCount} live</span></>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshPositions} className="px-3 py-2 rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform"
            style={{ ...mono, fontSize: 11, color: C.cyan, background: C.cyanDim, border: "1px solid rgba(91,227,240,0.25)" }}>
            {checking ? <Loader2 size={12} className="animate-spin" /> : <Radio size={12} />} Ping
          </button>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: C.muted, background: "rgba(125,170,255,0.07)", border: `1px solid ${C.borderSoft}` }}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <div ref={divRef} style={{ position: "absolute", inset: 0, background: "#0A0F1A" }} />
        {err && (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: "#04070F" }}>
            <p style={{ ...mono, fontSize: 12, color: C.muted, textAlign: "center" }}>
              Map library blocked in this environment — host the app to enable tiles.<br />Live positions still update on the flight cards.
            </p>
          </div>
        )}

        {/* HUD */}
        <div className="absolute left-3 bottom-3 rounded-2xl px-4 py-3" style={{ background: "rgba(5,10,20,0.85)", border: `1px solid ${C.border}`, backdropFilter: "blur(10px)", zIndex: 500 }}>
          {single ? (
            tele ? (
              <div className="flex gap-5">
                <div><div className="hud-l">ALT</div><div className="hud-v">{tele.alt != null ? tele.alt.toLocaleString() : "—"}<span className="hud-u"> FT</span></div></div>
                <div><div className="hud-l">GS</div><div className="hud-v">{tele.gs ?? "—"}<span className="hud-u"> KT</span></div></div>
                <div><div className="hud-l">TRK</div><div className="hud-v">{tele.track ?? "—"}<span className="hud-u">°</span></div></div>
              </div>
            ) : (
              <div style={{ ...mono, fontSize: 11, color: C.muted }}>{checking ? "Pinging ADS-B network…" : "No live signal — aircraft may not be airborne yet."}</div>
            )
          ) : (
            <div style={{ ...mono, fontSize: 11, color: C.muted }}>
              <span style={{ color: C.cyan }}>{liveCount}</span> aircraft live
              {lastPing && <span> · pinged {new Date(lastPing).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
          )}
          <div style={{ ...mono, fontSize: 9.5, color: C.muted, opacity: 0.6 }} className="mt-1.5">tap an airport for weather + delays</div>
        </div>

        {selAirport && <AirportSheet iata={selAirport} settings={settings} onClose={() => setSelAirport(null)} />}
      </div>
      <style>{`
        .hud-l { font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:.18em; color:${C.muted}; }
        .hud-v { font-family:'Space Grotesk',sans-serif; font-size:19px; font-weight:700; color:${C.cyan}; }
        .hud-u { font-size:10px; color:${C.muted}; font-family:'IBM Plex Mono',monospace; }
        .leaflet-container { font-family:'IBM Plex Mono',monospace; }
        .leaflet-control-attribution { background: rgba(4,7,15,0.7) !important; color:${C.muted} !important; font-size:9px !important; }
        .leaflet-control-attribution a { color:${C.muted} !important; }
        .leaflet-bar a { background:#0B1322 !important; color:${C.cyan} !important; border-color:${C.borderSoft} !important; }
      `}</style>
    </div>
  );
}