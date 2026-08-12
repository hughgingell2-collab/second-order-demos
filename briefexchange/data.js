/* BriefExchange — mock data. All firms, companies, people and matters are fictitious. */

var FIRM = {
  name: 'Calder Reeve',
  blurb: 'Mid-size Australian commercial firm. 41 partners, offices in Sydney, Melbourne and Brisbane.',
  gc: { name: 'Dana Whitlock', title: 'General Counsel', company: 'Ravenswood Property Group' }
};

var SOURCES = [
  'ASX announcement',
  'Federal Court filing',
  'NSW planning portal',
  'AUSTRAC media release',
  'Tender portal'
];

var PRACTICE_AREAS = ['M&A', 'Planning', 'Litigation', 'Regulatory'];

var QUALIFY_THRESHOLD = 70;

/* Monday of each of the 8 observed weeks (ISO). */
var WEEK_STARTS = [
  '2026-06-22', '2026-06-29', '2026-07-06', '2026-07-13',
  '2026-07-20', '2026-07-27', '2026-08-03', '2026-08-10'
];

/* ---------------------------------------------------------------- credentials */

var CREDENTIALS = [
  { id: 'CR-01', practice: 'M&A', jurisdiction: 'QLD', sector: 'Energy', year: 2025, partner: 'Elena Marsh',
    title: 'Advised Kurraba Energy on the $410m acquisition of a 1.2GWh Queensland battery portfolio, including grid connection and offtake arrangements.' },
  { id: 'CR-02', practice: 'M&A', jurisdiction: 'VIC', sector: 'Energy', year: 2025, partner: 'Tom Callaghan',
    title: 'Acted for Deepwater Renewables on final investment decision and project financing for a 400MW offshore wind development in Bass Strait.' },
  { id: 'CR-03', practice: 'M&A', jurisdiction: 'WA', sector: 'Resources', year: 2024, partner: 'Elena Marsh',
    title: 'Advised the independent board committee of Bellara Minerals on a A$1.1bn scheme of arrangement with an offshore bidder.' },
  { id: 'CR-04', practice: 'Litigation', jurisdiction: 'Cth', sector: 'Transport', year: 2025, partner: 'Marcus Devlin',
    title: 'Defended Torrens Freight in ACCC cartel proceedings in the Federal Court, securing a 60% reduction on the penalty sought.' },
  { id: 'CR-05', practice: 'Regulatory', jurisdiction: 'Cth', sector: 'Financial services', year: 2026, partner: "Sinead O'Loughlin",
    title: 'Acted for a top-20 ASX financial institution through an AUSTRAC enforcement investigation and the resulting three-year remediation program.' },
  { id: 'CR-06', practice: 'Planning', jurisdiction: 'NSW', sector: 'Property', year: 2025, partner: 'Priya Raghunathan',
    title: 'Obtained State Significant Development consent for a 38-storey mixed-use tower in Parramatta, including two contested modification applications.' },
  { id: 'CR-07', practice: 'Planning', jurisdiction: 'NSW', sector: 'Property', year: 2024, partner: 'Priya Raghunathan',
    title: 'Ran a Class 1 appeal in the Land and Environment Court following refusal of a 480-bed student accommodation development in Randwick.' },
  { id: 'CR-08', practice: 'Planning', jurisdiction: 'NSW', sector: 'Utilities', year: 2026, partner: 'Priya Raghunathan',
    title: 'Advised on Critical State Significant Infrastructure approvals and community consultation for a regional desalination plant.' },
  { id: 'CR-09', practice: 'Litigation', jurisdiction: 'Cth', sector: 'Financial services', year: 2025, partner: 'Rupert Nkemelu',
    title: 'Defended a listed payments business against a $95m consumer class action in the Federal Court concerning transaction fee disclosure.' },
  { id: 'CR-10', practice: 'Regulatory', jurisdiction: 'Cth', sector: 'Financial services', year: 2025, partner: 'Marcus Devlin',
    title: 'Acted in ASIC civil penalty proceedings concerning continuous disclosure and misleading conduct by a listed insurer.' },
  { id: 'CR-11', practice: 'Regulatory', jurisdiction: 'Cth', sector: 'Transport', year: 2024, partner: 'Elena Marsh',
    title: 'Advised on ACCC informal merger clearance for a A$740m rail freight consolidation, including a Statement of Issues response.' },
  { id: 'CR-12', practice: 'Litigation', jurisdiction: 'Cth', sector: 'Health', year: 2025, partner: 'Marcus Devlin',
    title: 'Advised a national aged care operator on a representative proceeding and the parallel regulatory response to care standards findings.' },
  { id: 'CR-13', practice: 'Planning', jurisdiction: 'NSW', sector: 'Technology', year: 2026, partner: 'Tom Callaghan',
    title: 'Acted for a hyperscale data centre developer on a 120MW Sydney campus, covering planning approvals, grid connection and land assembly.' },
  { id: 'CR-14', practice: 'Regulatory', jurisdiction: 'Cth', sector: 'Financial services', year: 2025, partner: "Sinead O'Loughlin",
    title: 'Advised a listed insurer on an APRA capital review and the enforceable undertaking that followed.' },
  { id: 'CR-15', practice: 'M&A', jurisdiction: 'NSW', sector: 'Financial services', year: 2024, partner: 'Rupert Nkemelu',
    title: 'Acted on the demerger of a $2.3bn funds management business, including the ASX listing of the spun-out entity.' },
  { id: 'CR-16', practice: 'Litigation', jurisdiction: 'Cth', sector: 'Technology', year: 2026, partner: 'Marcus Devlin',
    title: 'Defended an ASX-listed technology company in a shareholder class action following disclosure of a cyber incident.' },
  { id: 'CR-17', practice: 'Regulatory', jurisdiction: 'Cth', sector: 'Agriculture', year: 2025, partner: "Sinead O'Loughlin",
    title: 'Advised an agricultural export alliance on export licensing, anti-dumping measures and trade remedies before the Anti-Dumping Commission.' },
  { id: 'CR-18', practice: 'Regulatory', jurisdiction: 'SA', sector: 'Utilities', year: 2025, partner: "Sinead O'Loughlin",
    title: 'Acted for a state water utility on its external legal panel arrangements and two regulatory pricing submissions.' }
];

/* ---------------------------------------------------------------- signals feed */
/* 35 rows. qualified is derived in app.js as score >= QUALIFY_THRESHOLD. */

var SIGNALS = [
  { id: 'SG-101', date: '2026-06-23', source: 'ASX announcement', company: 'Kurraba Energy Ltd', jurisdiction: 'QLD', sector: 'Energy',
    summary: 'Announced acquisition of QLD battery portfolio', need: 'M&A', score: 94, partner: 'Elena Marsh',
    creds: ['CR-01', 'CR-02', 'CR-11'], pursuit: 'PU-01',
    detail: 'Market announcement flags a binding SPA for three grid-scale battery assets totalling 1.8GWh across Gladstone, Ipswich and Townsville. Completion is conditional on FIRB and AER approvals. Existing panel is Sydney-based and has no Queensland energy bench.' },
  { id: 'SG-102', date: '2026-06-24', source: 'NSW planning portal', company: 'Ravenswood Property Group', jurisdiction: 'NSW', sector: 'Property',
    summary: 'SSD lodged: 42-storey mixed-use tower, Parramatta', need: 'Planning', score: 91, partner: 'Priya Raghunathan',
    creds: ['CR-06', 'CR-07', 'CR-13'], pursuit: 'PU-02',
    detail: 'State Significant Development application lodged with the Department of Planning, Housing and Infrastructure. Design excellence competition already complete. Two adjoining owners have foreshadowed objections on overshadowing grounds.' },
  { id: 'SG-103', date: '2026-06-25', source: 'Federal Court filing', company: 'Torrens Freight Holdings', jurisdiction: 'Cth', sector: 'Transport',
    summary: 'ACCC proceedings filed over cartel conduct allegations', need: 'Litigation', score: 92, partner: 'Marcus Devlin',
    creds: ['CR-04', 'CR-11', 'CR-09'], pursuit: 'PU-03',
    detail: 'Originating application alleges price fixing across east-coast line haul contracts between 2021 and 2024. Two co-respondents have already engaged separate counsel, which usually signals a conflict-driven panel refresh.' },
  { id: 'SG-104', date: '2026-06-26', source: 'AUSTRAC media release', company: 'Wattlebank Financial Group', jurisdiction: 'Cth', sector: 'Financial services',
    summary: 'Enforcement investigation announced into AML/CTF program', need: 'Regulatory', score: 93, partner: "Sinead O'Loughlin",
    creds: ['CR-05', 'CR-14', 'CR-10'], pursuit: 'PU-04',
    detail: 'AUSTRAC confirms an enforcement investigation into transaction monitoring and customer due diligence across the group\'s remittance channel. Historically these run 18–30 months and pull in an independent expert.' },
  { id: 'SG-105', date: '2026-06-29', source: 'Tender portal', company: 'Karinya Water Utilities', jurisdiction: 'SA', sector: 'Utilities',
    summary: 'RFT issued: external legal panel, three-year term', need: 'Regulatory', score: 82, partner: "Sinead O'Loughlin",
    creds: ['CR-18', 'CR-08', 'CR-17'], pursuit: 'PU-15',
    detail: 'Request for tender covers regulatory pricing, procurement and environmental categories. Responses close 4 September 2026. Incumbent panel has held the work since 2020.' },
  { id: 'SG-106', date: '2026-06-30', source: 'ASX announcement', company: 'Bellara Minerals', jurisdiction: 'WA', sector: 'Resources',
    summary: 'Scheme of arrangement with offshore bidder announced', need: 'M&A', score: 88, partner: 'Elena Marsh',
    creds: ['CR-03', 'CR-01', 'CR-15'], pursuit: 'PU-10',
    detail: 'Scheme implementation deed signed at a 34% premium. FIRB and a first court hearing are the critical path. Independent expert appointment is still open.' },
  { id: 'SG-107', date: '2026-07-01', source: 'NSW planning portal', company: 'Yarra Verge Developments', jurisdiction: 'NSW', sector: 'Property',
    summary: 'Gateway determination sought for Marsden Park rezoning', need: 'Planning', score: 77, partner: 'Priya Raghunathan',
    creds: ['CR-06', 'CR-07', 'CR-08'], pursuit: null,
    detail: 'Planning proposal seeks to rezone 31 hectares from RU4 to R2 with an E1 local centre. Council officers have recommended against; the proponent is weighing a rezoning review.' },
  { id: 'SG-108', date: '2026-07-02', source: 'Federal Court filing', company: 'Nine Rivers Payments', jurisdiction: 'Cth', sector: 'Financial services',
    summary: 'Class action filed over unauthorised transaction fees', need: 'Litigation', score: 87, partner: 'Rupert Nkemelu',
    creds: ['CR-09', 'CR-16', 'CR-10'], pursuit: 'PU-08',
    detail: 'Open class proceeding on behalf of merchants charged interchange surcharges outside the disclosed schedule. Funder is on the record. Quantum pleaded at $64m.' },
  { id: 'SG-109', date: '2026-07-06', source: 'Tender portal', company: 'Harbourline Infrastructure', jurisdiction: 'NSW', sector: 'Infrastructure',
    summary: 'EOI: construction contracts counsel, M6 stage 2', need: 'Planning', score: 75, partner: 'Tom Callaghan',
    creds: ['CR-13', 'CR-06', 'CR-08'], pursuit: 'PU-14',
    detail: 'Expression of interest for a two-firm panel covering D&C contract drafting, delay claims and approvals interface for the second stage of the motorway.' },
  { id: 'SG-110', date: '2026-07-07', source: 'ASX announcement', company: 'Deepwater Renewables', jurisdiction: 'VIC', sector: 'Energy',
    summary: 'Capital raising to fund 400MW offshore wind FID', need: 'M&A', score: 81, partner: 'Tom Callaghan',
    creds: ['CR-02', 'CR-01', 'CR-15'], pursuit: 'PU-12',
    detail: '$620m accelerated non-renounceable entitlement offer to fund final investment decision. Offshore wind licensing under the OEI Act remains a live workstream.' },
  { id: 'SG-111', date: '2026-07-08', source: 'NSW planning portal', company: 'Eastcliff Student Living', jurisdiction: 'NSW', sector: 'Property',
    summary: 'DA lodged for 620-bed student accommodation, Kensington', need: 'Planning', score: 70, partner: 'Priya Raghunathan',
    creds: ['CR-07', 'CR-06', 'CR-13'], pursuit: null,
    detail: 'Development application lodged with Randwick City Council. Parking rates and student housing definitions under the LEP are the contested issues.' },
  { id: 'SG-112', date: '2026-07-09', source: 'ASX announcement', company: 'Stonefield Data Centres', jurisdiction: 'NSW', sector: 'Technology',
    summary: 'Binding MOU for Sydney hyperscale campus', need: 'M&A', score: 90, partner: 'Tom Callaghan',
    creds: ['CR-13', 'CR-02', 'CR-15'], pursuit: 'PU-06',
    detail: 'Memorandum of understanding for a 180MW campus at Eastern Creek with a US hyperscaler anchor tenant. Land assembly across four titles plus a dedicated substation.' },
  { id: 'SG-113', date: '2026-07-13', source: 'Federal Court filing', company: 'Westmere Aged Care', jurisdiction: 'Cth', sector: 'Health',
    summary: 'Representative proceeding over care standards filed', need: 'Litigation', score: 74, partner: 'Marcus Devlin',
    creds: ['CR-12', 'CR-09', 'CR-16'], pursuit: null,
    detail: 'Representative proceeding brought on behalf of residents across 14 facilities, running alongside an Aged Care Quality and Safety Commission review.' },
  { id: 'SG-114', date: '2026-07-14', source: 'ASX announcement', company: 'Tanami Lithium Ltd', jurisdiction: 'NT', sector: 'Resources',
    summary: 'Trading halt pending material transaction update', need: 'M&A', score: 76, partner: 'Elena Marsh',
    creds: ['CR-03', 'CR-01', 'CR-11'], pursuit: null,
    detail: 'Trading halt requested pending an announcement on a material transaction. Register shows two substantial holder notices lodged in the preceding fortnight.' },
  { id: 'SG-115', date: '2026-07-16', source: 'Federal Court filing', company: 'Sandalford Chemicals', jurisdiction: 'VIC', sector: 'Resources',
    summary: 'EPA prosecution listed for directions hearing', need: 'Litigation', score: 69, partner: 'Marcus Devlin',
    creds: ['CR-04', 'CR-12', 'CR-17'], pursuit: null,
    detail: 'Prosecution over an aggregate discharge at the Altona site. Directions hearing listed for 9 September 2026; a duty-of-care contravention is the lead charge.' },
  { id: 'SG-116', date: '2026-07-17', source: 'AUSTRAC media release', company: 'Nortonvale Logistics', jurisdiction: 'Cth', sector: 'Transport',
    summary: 'Named in remittance sector compliance review', need: 'Regulatory', score: 57, partner: "Sinead O'Loughlin",
    creds: ['CR-05', 'CR-17', 'CR-11'], pursuit: null,
    detail: 'Named in a thematic review of cross-border remittance affiliates. No enforcement action foreshadowed, but a program uplift is the usual next step.' },
  { id: 'SG-117', date: '2026-07-20', source: 'Tender portal', company: 'Coorong Agri Ltd', jurisdiction: 'SA', sector: 'Agriculture',
    summary: 'RFQ: biosecurity compliance advisory', need: 'Regulatory', score: 55, partner: "Sinead O'Loughlin",
    creds: ['CR-17', 'CR-18', 'CR-05'], pursuit: null,
    detail: 'Request for quote for a fixed-scope biosecurity compliance review across three processing sites. Low value; useful as a relationship entry point only.' },
  { id: 'SG-118', date: '2026-07-21', source: 'ASX announcement', company: 'Gundara Copper NL', jurisdiction: 'SA', sector: 'Resources',
    summary: 'Off-market takeover bid rejected by board', need: 'M&A', score: 72, partner: 'Elena Marsh',
    creds: ['CR-03', 'CR-15', 'CR-01'], pursuit: null,
    detail: 'Target statement recommends shareholders reject the offer. A Takeovers Panel application on truth-in-takeovers grounds is a realistic escalation.' },
  { id: 'SG-119', date: '2026-07-22', source: 'NSW planning portal', company: 'Meridian Coastal REIT', jurisdiction: 'NSW', sector: 'Property',
    summary: 'Planning proposal exhibited for Wollongong town centre', need: 'Planning', score: 68, partner: 'Priya Raghunathan',
    creds: ['CR-06', 'CR-08', 'CR-07'], pursuit: null,
    detail: 'Planning proposal on public exhibition until 18 September 2026, seeking a height uplift from 32m to 68m across two blocks.' },
  { id: 'SG-120', date: '2026-07-23', source: 'Federal Court filing', company: 'Ashcombe Insurance Ltd', jurisdiction: 'Cth', sector: 'Financial services',
    summary: 'ASIC civil penalty proceedings commenced', need: 'Regulatory', score: 83, partner: 'Marcus Devlin',
    creds: ['CR-10', 'CR-14', 'CR-05'], pursuit: 'PU-09',
    detail: 'Concise statement alleges failure to honour advertised claims-handling timeframes across 12,400 policies. Penalty exposure pleaded on a per-contravention basis.' },
  { id: 'SG-121', date: '2026-07-27', source: 'Tender portal', company: 'Pallara Health Group', jurisdiction: 'QLD', sector: 'Health',
    summary: 'Tender: M&A advisory panel for hospital acquisitions', need: 'M&A', score: 84, partner: 'Elena Marsh',
    creds: ['CR-01', 'CR-12', 'CR-15'], pursuit: 'PU-07',
    detail: 'Panel tender covering a foreshadowed program of four to six private hospital acquisitions in South East Queensland over three years.' },
  { id: 'SG-122', date: '2026-07-28', source: 'ASX announcement', company: 'Silverbrook Capital', jurisdiction: 'NSW', sector: 'Financial services',
    summary: 'Announced demerger of funds management arm', need: 'M&A', score: 85, partner: 'Rupert Nkemelu',
    creds: ['CR-15', 'CR-14', 'CR-03'], pursuit: 'PU-13',
    detail: 'Board has approved a demerger of the $3.1bn funds management business with a separate ASX listing targeted for Q2 2027. Scheme booklet and ATO class ruling both required.' },
  { id: 'SG-123', date: '2026-07-29', source: 'NSW planning portal', company: 'Quarry Point Cement', jurisdiction: 'NSW', sector: 'Resources',
    summary: 'SSD modification sought for extraction rate increase', need: 'Planning', score: 64, partner: 'Priya Raghunathan',
    creds: ['CR-08', 'CR-06', 'CR-17'], pursuit: null,
    detail: 'Section 4.55 modification to lift annual extraction from 1.4Mt to 2.2Mt. Air quality and haulage conditions are the contested items.' },
  { id: 'SG-124', date: '2026-07-30', source: 'Federal Court filing', company: 'Marrickshire Foods', jurisdiction: 'NSW', sector: 'Retail',
    summary: 'Supplier contract dispute filed, $18m claimed', need: 'Litigation', score: 61, partner: 'Rupert Nkemelu',
    creds: ['CR-09', 'CR-04', 'CR-17'], pursuit: null,
    detail: 'Claim for repudiation of a five-year supply agreement, with an unconscionable conduct count pleaded in the alternative under the ACL.' },
  { id: 'SG-125', date: '2026-07-31', source: 'AUSTRAC media release', company: 'Anvil Bay Resources', jurisdiction: 'Cth', sector: 'Resources',
    summary: 'Enforceable undertaking accepted for reporting failures', need: 'Regulatory', score: 71, partner: "Sinead O'Loughlin",
    creds: ['CR-05', 'CR-14', 'CR-10'], pursuit: null,
    detail: 'Enforceable undertaking accepted in relation to late threshold transaction reports. An independent auditor must be appointed within 60 days.' },
  { id: 'SG-126', date: '2026-08-03', source: 'ASX announcement', company: 'Hallmarque Hotels', jurisdiction: 'VIC', sector: 'Property',
    summary: 'Announced sale of 11 regional freehold sites', need: 'M&A', score: 63, partner: 'Elena Marsh',
    creds: ['CR-15', 'CR-06', 'CR-01'], pursuit: null,
    detail: 'Portfolio sale of 11 freehold hotel sites across regional Victoria, run as a two-stage competitive process. Duty and leaseback structuring are the live issues.' },
  { id: 'SG-127', date: '2026-08-04', source: 'ASX announcement', company: 'Ironbark Rail Group', jurisdiction: 'Cth', sector: 'Transport',
    summary: 'ACCC informal merger review commenced', need: 'Regulatory', score: 79, partner: 'Elena Marsh',
    creds: ['CR-11', 'CR-04', 'CR-10'], pursuit: null,
    detail: 'ACCC has commenced an informal review of the proposed acquisition of a competing intermodal terminal operator. Market inquiries letters have issued.' },
  { id: 'SG-128', date: '2026-08-05', source: 'Federal Court filing', company: 'Belrose Cyber', jurisdiction: 'Cth', sector: 'Technology',
    summary: 'Shareholder class action following data breach disclosure', need: 'Litigation', score: 89, partner: 'Marcus Devlin',
    creds: ['CR-16', 'CR-09', 'CR-12'], pursuit: 'PU-05',
    detail: 'Shareholder class action alleging continuous disclosure contraventions in the 11 weeks between detection and disclosure of a breach affecting 2.1m records.' },
  { id: 'SG-129', date: '2026-08-06', source: 'ASX announcement', company: 'Verity Health Insurance', jurisdiction: 'Cth', sector: 'Financial services',
    summary: 'Profit downgrade citing APRA capital review', need: 'Regulatory', score: 58, partner: "Sinead O'Loughlin",
    creds: ['CR-14', 'CR-10', 'CR-12'], pursuit: null,
    detail: 'Downgrade attributes a $38m provision to an APRA capital adequacy review. Board has flagged a governance uplift program.' },
  { id: 'SG-130', date: '2026-08-07', source: 'NSW planning portal', company: 'Brightwater Desalination', jurisdiction: 'NSW', sector: 'Utilities',
    summary: 'CSSI application lodged for Central Coast plant', need: 'Planning', score: 86, partner: 'Priya Raghunathan',
    creds: ['CR-08', 'CR-06', 'CR-13'], pursuit: 'PU-11',
    detail: 'Critical State Significant Infrastructure application for a 120ML/day plant with associated pipeline corridor. Biodiversity offsets and a marine outfall EIS are the long poles.' },
  { id: 'SG-131', date: '2026-08-08', source: 'AUSTRAC media release', company: 'Sunmarket Exchange', jurisdiction: 'Cth', sector: 'Financial services',
    summary: 'Digital currency exchange registration suspended', need: 'Regulatory', score: 80, partner: "Sinead O'Loughlin",
    creds: ['CR-05', 'CR-10', 'CR-14'], pursuit: null,
    detail: 'Registration suspended for 90 days pending evidence of an adequate AML/CTF program. Suspension notices of this kind are usually followed by a remediation deed.' },
  { id: 'SG-132', date: '2026-08-10', source: 'NSW planning portal', company: 'Bramwell Retail Group', jurisdiction: 'NSW', sector: 'Retail',
    summary: 'DA refused; Class 1 appeal window opens', need: 'Planning', score: 59, partner: 'Priya Raghunathan',
    creds: ['CR-07', 'CR-06', 'CR-08'], pursuit: null,
    detail: 'Council refused a large format retail DA on traffic generation grounds. The six-month appeal window to the Land and Environment Court has opened.' },
  { id: 'SG-133', date: '2026-08-11', source: 'Tender portal', company: 'Tallowood Timber Co', jurisdiction: 'VIC', sector: 'Agriculture',
    summary: 'EOI: environmental prosecution defence panel', need: 'Litigation', score: 67, partner: 'Marcus Devlin',
    creds: ['CR-04', 'CR-17', 'CR-12'], pursuit: null,
    detail: 'Expression of interest for a defence panel covering environmental prosecutions and native vegetation offences across three states.' },
  { id: 'SG-134', date: '2026-08-12', source: 'Federal Court filing', company: 'Portmore Aviation Services', jurisdiction: 'Cth', sector: 'Transport',
    summary: 'Judicial review of CASA licensing decision filed', need: 'Regulatory', score: 66, partner: 'Marcus Devlin',
    creds: ['CR-11', 'CR-10', 'CR-04'], pursuit: null,
    detail: 'Application for judicial review of a decision cancelling an air operator certificate variation. Interlocutory relief sought to preserve current operations.' },
  { id: 'SG-135', date: '2026-08-13', source: 'Tender portal', company: 'Lachlan Grain Alliance', jurisdiction: 'Cth', sector: 'Agriculture',
    summary: 'RFT: export licensing and trade remedies advice', need: 'Regulatory', score: 62, partner: "Sinead O'Loughlin",
    creds: ['CR-17', 'CR-18', 'CR-05'], pursuit: null,
    detail: 'Request for tender for export licensing, anti-dumping and country-of-origin advice across grain and pulse exports. Two-year term with a one-year extension option.' }
];

/* ---------------------------------------------------------------- pursuits */
/* 15 rows. Funnel "Submitted" = Submitted + Won + Lost = 9; "Won" = 4. */

var PURSUIT_STAGES = ['Drafting', 'In review', 'Submitted', 'Won', 'Lost'];

var PURSUITS = [
  { id: 'PU-01', opportunity: 'QLD battery portfolio acquisition', client: 'Kurraba Energy Ltd', practice: 'M&A', stage: 'Won', value: 1850000, owner: 'Elena Marsh', signal: 'SG-101' },
  { id: 'PU-02', opportunity: 'Parramatta SSD approvals pathway', client: 'Ravenswood Property Group', practice: 'Planning', stage: 'Won', value: 920000, owner: 'Priya Raghunathan', signal: 'SG-102' },
  { id: 'PU-03', opportunity: 'ACCC cartel proceedings defence', client: 'Torrens Freight Holdings', practice: 'Litigation', stage: 'Won', value: 2400000, owner: 'Marcus Devlin', signal: 'SG-103' },
  { id: 'PU-04', opportunity: 'AUSTRAC enforcement response', client: 'Wattlebank Financial Group', practice: 'Regulatory', stage: 'Won', value: 1600000, owner: "Sinead O'Loughlin", signal: 'SG-104' },
  { id: 'PU-05', opportunity: 'Data breach class action defence', client: 'Belrose Cyber', practice: 'Litigation', stage: 'Submitted', value: 2100000, owner: 'Marcus Devlin', signal: 'SG-128' },
  { id: 'PU-06', opportunity: 'Hyperscale campus development', client: 'Stonefield Data Centres', practice: 'Planning', stage: 'Submitted', value: 1150000, owner: 'Tom Callaghan', signal: 'SG-112' },
  { id: 'PU-07', opportunity: 'Hospital acquisitions advisory panel', client: 'Pallara Health Group', practice: 'M&A', stage: 'Submitted', value: 640000, owner: 'Elena Marsh', signal: 'SG-121' },
  { id: 'PU-08', opportunity: 'Transaction fees class action', client: 'Nine Rivers Payments', practice: 'Litigation', stage: 'Lost', value: 1300000, owner: 'Rupert Nkemelu', signal: 'SG-108' },
  { id: 'PU-09', opportunity: 'ASIC civil penalty proceedings', client: 'Ashcombe Insurance Ltd', practice: 'Regulatory', stage: 'Lost', value: 980000, owner: 'Marcus Devlin', signal: 'SG-120' },
  { id: 'PU-10', opportunity: 'Scheme of arrangement — target advice', client: 'Bellara Minerals', practice: 'M&A', stage: 'In review', value: 1450000, owner: 'Elena Marsh', signal: 'SG-106' },
  { id: 'PU-11', opportunity: 'CSSI approvals — desalination plant', client: 'Brightwater Desalination', practice: 'Planning', stage: 'In review', value: 780000, owner: 'Priya Raghunathan', signal: 'SG-130' },
  { id: 'PU-12', opportunity: 'Offshore wind FID and financing', client: 'Deepwater Renewables', practice: 'M&A', stage: 'Drafting', value: 1050000, owner: 'Tom Callaghan', signal: 'SG-110' },
  { id: 'PU-13', opportunity: 'Funds management demerger', client: 'Silverbrook Capital', practice: 'M&A', stage: 'Drafting', value: 1700000, owner: 'Rupert Nkemelu', signal: 'SG-122' },
  { id: 'PU-14', opportunity: 'M6 stage 2 construction contracts panel', client: 'Harbourline Infrastructure', practice: 'Planning', stage: 'Drafting', value: 560000, owner: 'Tom Callaghan', signal: 'SG-109' },
  { id: 'PU-15', opportunity: 'External legal panel refresh', client: 'Karinya Water Utilities', practice: 'Regulatory', stage: 'Drafting', value: 410000, owner: "Sinead O'Loughlin", signal: 'SG-105' }
];

/* ---------------------------------------------------------------- exchange */

var VALUE_BANDS = ['Under $100k', '$100k–$250k', '$250k–$500k', '$500k–$1m', '$1m+'];
var BRIEF_STATUSES = ['Open', 'Closing soon', 'Shortlisting', 'Awarded'];

var BRIEFS = [
  { id: 'BX-2041', title: 'Panel refresh — corporate and commercial', company: 'Nortonvale Logistics', practice: 'M&A',
    jurisdiction: 'Cth', band: '$500k–$1m', responses: 7, closes: '2026-08-21', status: 'Open', score: 88,
    scope: 'Two-firm panel for corporate, commercial and M&A work across a national logistics group. Three-year term with an annual rate review.',
    requirements: ['Demonstrated east-coast transport sector experience', 'Fixed-fee menu for repeat commercial work', 'Named partner with 15+ years post-admission', 'Conflicts clearance against two named competitors'] },
  { id: 'BX-2038', title: 'Defence of shareholder class action', company: 'Belrose Cyber', practice: 'Litigation',
    jurisdiction: 'Cth', band: '$1m+', responses: 5, closes: '2026-08-18', status: 'Closing soon', score: 94,
    scope: 'Defence of an open class shareholder proceeding in the Federal Court alleging continuous disclosure contraventions following a cyber incident.',
    requirements: ['Federal Court class action defence experience', 'Cyber incident and disclosure workstream capability', 'Counsel relationships in the Sydney commercial bar', 'Litigation funding response strategy'] },
  { id: 'BX-2035', title: 'SSD approvals — Macquarie Park life sciences campus', company: 'Ravenswood Property Group', practice: 'Planning',
    jurisdiction: 'NSW', band: '$250k–$500k', responses: 4, closes: '2026-08-25', status: 'Open', score: 91,
    scope: 'End-to-end State Significant Development approvals for a three-building life sciences campus, including a concept SSD, two detailed SSDs and the associated planning agreement with council.',
    requirements: ['Recent SSD determinations in metropolitan Sydney', 'Voluntary planning agreement negotiation experience', 'Land and Environment Court appeal capability if required', 'Fixed fee by approval phase'] },
  { id: 'BX-2033', title: 'AUSTRAC remediation program counsel', company: 'Sunmarket Exchange', practice: 'Regulatory',
    jurisdiction: 'Cth', band: '$500k–$1m', responses: 6, closes: '2026-08-19', status: 'Closing soon', score: 86,
    scope: 'Counsel to a digital currency exchange through the suspension response, independent audit and AML/CTF program rebuild.',
    requirements: ['AUSTRAC enforcement experience within the last three years', 'Ability to instruct and manage an independent auditor', 'Digital asset regulatory familiarity', 'Weekly reporting to the board risk committee'] },
  { id: 'BX-2030', title: 'Acquisition of three QLD renewables SPVs', company: 'Kurraba Energy Ltd', practice: 'M&A',
    jurisdiction: 'QLD', band: '$250k–$500k', responses: 8, closes: '2026-08-14', status: 'Shortlisting', score: 90,
    scope: 'Buy-side advice on the acquisition of three special purpose vehicles holding grid-scale battery assets, including FIRB, AER approvals and offtake novation.',
    requirements: ['Queensland energy project experience', 'FIRB application experience', 'Capacity to complete within 10 weeks', 'Sector-experienced partner on the file daily'] },
  { id: 'BX-2028', title: 'Modern slavery and supply chain review', company: 'Bramwell Retail Group', practice: 'Regulatory',
    jurisdiction: 'Cth', band: '$100k–$250k', responses: 3, closes: '2026-08-28', status: 'Open', score: 61,
    scope: 'Review of modern slavery reporting obligations and supplier contract terms across 340 direct suppliers.',
    requirements: ['Modern slavery statement drafting experience', 'Supplier contract remediation playbook', 'Fixed fee with a defined deliverable set'] },
  { id: 'BX-2026', title: 'Land and Environment Court appeal — DA refusal', company: 'Eastcliff Student Living', practice: 'Planning',
    jurisdiction: 'NSW', band: '$100k–$250k', responses: 5, closes: '2026-08-17', status: 'Closing soon', score: 74,
    scope: 'Class 1 appeal against refusal of a 620-bed student accommodation development application, including expert evidence coordination.',
    requirements: ['Class 1 appeal track record', 'Planning and traffic expert relationships', 'Conciliation conference experience under s34'] },
  { id: 'BX-2024', title: 'ACCC merger clearance — rail freight', company: 'Ironbark Rail Group', practice: 'Regulatory',
    jurisdiction: 'Cth', band: '$1m+', responses: 4, closes: '2026-08-24', status: 'Open', score: 79,
    scope: 'Informal merger clearance for the acquisition of a competing intermodal terminal operator, including market inquiries and any Statement of Issues response.',
    requirements: ['Recent informal merger clearance experience', 'Economist engagement and management', 'Transport and logistics market knowledge'] },
  { id: 'BX-2021', title: 'Contract dispute — grain export terminal', company: 'Lachlan Grain Alliance', practice: 'Litigation',
    jurisdiction: 'Cth', band: '$250k–$500k', responses: 6, closes: '2026-08-12', status: 'Shortlisting', score: 57,
    scope: 'Dispute over throughput guarantees at a bulk grain export terminal, with an arbitration clause requiring ACICA rules.',
    requirements: ['ACICA arbitration experience', 'Agricultural commodity contract familiarity', 'Cost estimate to award'] },
  { id: 'BX-2018', title: 'Demerger implementation — funds management', company: 'Silverbrook Capital', practice: 'M&A',
    jurisdiction: 'NSW', band: '$1m+', responses: 5, closes: '2026-08-26', status: 'Open', score: 85,
    scope: 'Implementation of a demerger of a $3.1bn funds management business, including scheme booklet, ATO class ruling and ASX listing of the spun-out entity.',
    requirements: ['Demerger implementation experience on an ASX-listed structure', 'ATO class ruling experience', 'Dedicated project management resource'] },
  { id: 'BX-2015', title: 'Enforceable undertaking compliance audit', company: 'Anvil Bay Resources', practice: 'Regulatory',
    jurisdiction: 'Cth', band: '$100k–$250k', responses: 4, closes: '2026-08-11', status: 'Awarded', score: 71,
    scope: 'Legal support for an independent auditor appointment and the first compliance report under an AUSTRAC enforceable undertaking.',
    requirements: ['Enforceable undertaking experience', 'Auditor instruction and scoping', 'Board-level reporting'] },
  { id: 'BX-2012', title: 'Care standards follow-up regulatory advice', company: 'Westmere Aged Care', practice: 'Regulatory',
    jurisdiction: 'Cth', band: 'Under $100k', responses: 2, closes: '2026-08-09', status: 'Awarded', score: 66,
    scope: 'Advice on regulatory obligations and notification duties arising from Aged Care Quality and Safety Commission findings across 14 facilities.',
    requirements: ['Aged care regulatory experience', 'Ability to advise within 10 business days'] }
];

/* GC-side: briefs posted by the signed-in general counsel's company. */

var MY_BRIEFS = [
  { id: 'BX-2035', title: 'SSD approvals — Macquarie Park life sciences campus', matterType: 'Planning & environment',
    band: '$250k–$500k', jurisdiction: 'NSW', posted: '2026-08-04', responses: 4, status: 'Open', panelOnly: false,
    description: 'End-to-end State Significant Development approvals for a three-building life sciences campus, including a concept SSD, two detailed SSDs and a planning agreement with council.' },
  { id: 'BX-2027', title: 'Construction contract suite — Parramatta tower stage 2', matterType: 'Property & construction',
    band: '$100k–$250k', jurisdiction: 'NSW', posted: '2026-07-28', responses: 6, status: 'Shortlisting', panelOnly: true,
    description: 'Drafting and negotiation of a D&C contract, three consultant deeds and a side deed suite for stage 2 of the Parramatta tower.' },
  { id: 'BX-2019', title: 'Land tax and duty review — NSW portfolio', matterType: 'Tax',
    band: 'Under $100k', jurisdiction: 'NSW', posted: '2026-07-14', responses: 3, status: 'Awarded', panelOnly: false,
    description: 'Review of land tax aggregation and surcharge duty exposure across 22 held entities following a group restructure.' },
  { id: 'BX-2009', title: 'Retail leasing template refresh', matterType: 'Property & construction',
    band: 'Under $100k', jurisdiction: 'NSW', posted: '2026-06-30', responses: 5, status: 'Awarded', panelOnly: true,
    description: 'Refresh of the standard retail lease and licence templates for compliance with the Retail Leases Act 1994 amendments.' }
];

var MATTER_TYPES = [
  'M&A / corporate', 'Planning & environment', 'Litigation & disputes',
  'Regulatory & compliance', 'Property & construction', 'Employment', 'Tax'
];

var JURISDICTIONS = ['Cth', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

/* Responses to BX-2035 — the sample brief in the client view. */

var RESPONSE_BRIEF_ID = 'BX-2035';

var BRIEF_RESPONSES = [
  { firm: 'Calder Reeve', score: 91, fee: 312000, feeBasis: 'Fixed fee by approval phase, capped',
    seniority: '2 partners, 1 senior counsel, 4 associates', matters: 14, lodged: '2026-08-07',
    citations: [
      'Obtained State Significant Development consent for a 38-storey mixed-use tower in Parramatta, including two contested modification applications (2025).',
      'Advised on Critical State Significant Infrastructure approvals and community consultation for a regional desalination plant (2026).',
      'Acted for a hyperscale data centre developer on a 120MW Sydney campus, covering planning approvals, grid connection and land assembly (2026).'
    ],
    note: 'Proposes a fixed fee per approval phase with a capped variation allowance, and offers to absorb the concept SSD scoping meeting.' },
  { firm: 'Ashgrove Wren', score: 84, fee: 348000, feeBasis: 'Fixed fee with monthly drawdown',
    seniority: '1 partner, 5 associates', matters: 9, lodged: '2026-08-06',
    citations: [
      'Acted on nine State Significant Development applications in metropolitan Sydney since 2023, seven determined favourably.',
      'Negotiated four voluntary planning agreements with metropolitan councils, two involving affordable housing contributions.',
      'Advised a listed REIT on a contested rezoning in the Macquarie Park corridor (2024).'
    ],
    note: 'Strongest local knowledge of the Macquarie Park corridor but a thinner senior bench; partner time capped at 12% of total hours.' },
  { firm: 'Merriwell Tate', score: 78, fee: 268000, feeBasis: 'Capped hourly with a phase estimate',
    seniority: '1 partner, 2 senior associates, 3 associates', matters: 6, lodged: '2026-08-08',
    citations: [
      'Ran two Class 1 appeals in the Land and Environment Court for residential flat building refusals (2024, 2025).',
      'Advised on a concept SSD and two detailed SSDs for a health precinct in Western Sydney (2025).',
      'Prepared planning agreement documentation for three council-led urban renewal projects.'
    ],
    note: 'Lowest fee of the four. Life sciences campus experience is adjacent rather than direct; no comparable concept SSD at this scale.' },
  { firm: 'Bellhaven Croft', score: 69, fee: 405000, feeBasis: 'Hourly, no cap offered',
    seniority: '3 partners, 2 associates', matters: 11, lodged: '2026-08-05',
    citations: [
      'Advised on eleven State Significant Development applications nationally, four in NSW.',
      'Acted on the planning approvals for a $900m mixed-use precinct in Melbourne (2025).',
      'Advised a university on campus master plan approvals and associated infrastructure agreements (2024).'
    ],
    note: 'Deepest national bench but declined to offer a fee cap, and only four of the eleven cited matters are NSW.' }
];
