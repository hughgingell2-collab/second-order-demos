/* CounselMatch — demo data.
   Everything here is fictitious: firms, boutiques, people, figures.
   No network calls; this file is the only data source for app.js. */
(function () {
  'use strict';

  /* The demo's "now". Days-open figures are derived from it so the tables,
     the charts and the detail panels can never drift apart. */
  var TODAY = '2026-08-13';

  var NICHES = [
    'Projects & Energy',
    'M&A / Corporate',
    'Banking & Finance',
    'Litigation & Disputes',
    'Employment & IR',
    'Property & Construction',
    'IP & Technology',
    'In-house / Legal Counsel'
  ];

  var PQE_BANDS = ['0-2 PQE', '2-4 PQE', '3-5 PQE', '4-7 PQE', '5-8 PQE', '8+ PQE'];

  var LOCATIONS = ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra'];

  var SALARY_BANDS = [
    { label: '$120k - $150k', min: 120000, max: 150000 },
    { label: '$150k - $180k', min: 150000, max: 180000 },
    { label: '$180k - $210k', min: 180000, max: 210000 },
    { label: '$210k - $250k', min: 210000, max: 250000 },
    { label: '$250k - $300k', min: 250000, max: 300000 },
    { label: '$300k - $400k', min: 300000, max: 400000 }
  ];

  /* Pipeline stages are disjoint "where each candidate sits right now",
     so the five counts always sum to the role's pipeline total. */
  var STAGES = ['Sourced', 'Screened', 'Interviewing', 'Offer', 'Placed'];

  var FIRM = {
    name: 'Ashgrove Hume',
    descriptor: 'Top-tier - Sydney',
    team: 'Talent & Legal Resourcing',
    abn: '54 118 902 447'
  };

  /* ---------------------------------------------------------------- *
   * Recruiters (18). nicheStats is the source of truth: every headline
   * number on the directory table, the scatter and the recruiter view
   * is derived from it below, so the three views cannot disagree.
   * ---------------------------------------------------------------- */
  var recruiters = [
    {
      id: 'r1', name: 'Priya Raman', boutique: 'Kestrel Legal Search', city: 'Sydney',
      medianDays: 34, rating: 4.8, since: 2019,
      nicheStats: [
        { niche: 'M&A / Corporate', briefs: 14, placements: 10 },
        { niche: 'Banking & Finance', briefs: 9, placements: 5 }
      ]
    },
    {
      id: 'r2', name: 'Daniel Okonkwo', boutique: 'Marlowe & Fitch', city: 'Sydney',
      medianDays: 31, rating: 4.9, since: 2017,
      nicheStats: [
        { niche: 'Projects & Energy', briefs: 12, placements: 9 },
        { niche: 'Property & Construction', briefs: 8, placements: 5 },
        { niche: 'M&A / Corporate', briefs: 6, placements: 3 }
      ]
    },
    {
      id: 'r3', name: 'Harriet Vane', boutique: 'Vane Legal Partners', city: 'Melbourne',
      medianDays: 38, rating: 4.6, since: 2020,
      nicheStats: [
        { niche: 'Litigation & Disputes', briefs: 11, placements: 7 },
        { niche: 'Employment & IR', briefs: 7, placements: 4 }
      ]
    },
    {
      id: 'r4', name: 'Tom Beckwith', boutique: 'Beckwith Talent Co.', city: 'Sydney',
      medianDays: 44, rating: 4.4, since: 2021,
      nicheStats: [
        { niche: 'In-house / Legal Counsel', briefs: 16, placements: 9 }
      ]
    },
    {
      id: 'r5', name: 'Sian Whitlock', boutique: 'Argyle Reid Search', city: 'Melbourne',
      medianDays: 36, rating: 4.7, since: 2018,
      nicheStats: [
        { niche: 'M&A / Corporate', briefs: 10, placements: 6 },
        { niche: 'IP & Technology', briefs: 8, placements: 6 }
      ]
    },
    {
      id: 'r6', name: 'Marcus Elkin', boutique: 'Elkin Recruitment', city: 'Brisbane',
      medianDays: 52, rating: 4.1, since: 2022,
      nicheStats: [
        { niche: 'Projects & Energy', briefs: 13, placements: 6 }
      ]
    },
    {
      id: 'r7', name: 'Joanna Pike', boutique: 'Pike & Halloran', city: 'Sydney',
      medianDays: 40, rating: 4.5, since: 2019,
      nicheStats: [
        { niche: 'Banking & Finance', briefs: 13, placements: 8 },
        { niche: 'In-house / Legal Counsel', briefs: 6, placements: 3 }
      ]
    },
    {
      id: 'r8', name: 'Rafael Cortez', boutique: 'Northbourne Legal', city: 'Canberra',
      medianDays: 47, rating: 4.2, since: 2021,
      nicheStats: [
        { niche: 'Litigation & Disputes', briefs: 9, placements: 5 },
        { niche: 'In-house / Legal Counsel', briefs: 8, placements: 4 }
      ]
    },
    {
      id: 'r9', name: 'Amelia Frost', boutique: 'Frostline Search', city: 'Perth',
      medianDays: 29, rating: 4.8, since: 2016,
      nicheStats: [
        { niche: 'Projects & Energy', briefs: 15, placements: 11 },
        { niche: 'Property & Construction', briefs: 7, placements: 4 }
      ]
    },
    {
      id: 'r10', name: 'Nikhil Shah', boutique: 'Aperture Legal Talent', city: 'Melbourne',
      medianDays: 42, rating: 4.5, since: 2020,
      nicheStats: [
        { niche: 'IP & Technology', briefs: 12, placements: 7 },
        { niche: 'In-house / Legal Counsel', briefs: 9, placements: 5 }
      ]
    },
    {
      id: 'r11', name: 'Georgia Mullane', boutique: 'Mullane Search Group', city: 'Sydney',
      medianDays: 35, rating: 4.6, since: 2018,
      nicheStats: [
        { niche: 'Employment & IR', briefs: 14, placements: 9 },
        { niche: 'Litigation & Disputes', briefs: 6, placements: 3 }
      ]
    },
    {
      id: 'r12', name: 'Ben Tanaka', boutique: 'Sable Court Partners', city: 'Sydney',
      medianDays: 33, rating: 4.7, since: 2017,
      nicheStats: [
        { niche: 'M&A / Corporate', briefs: 20, placements: 13 }
      ]
    },
    {
      id: 'r13', name: 'Clare Devereux', boutique: 'Devereux Legal', city: 'Brisbane',
      medianDays: 45, rating: 4.3, since: 2021,
      nicheStats: [
        { niche: 'Property & Construction', briefs: 11, placements: 6 },
        { niche: 'Projects & Energy', briefs: 8, placements: 4 }
      ]
    },
    {
      id: 'r14', name: 'Oscar Lindqvist', boutique: 'Lindqvist & Roe', city: 'Melbourne',
      medianDays: 49, rating: 4.0, since: 2022,
      nicheStats: [
        { niche: 'Banking & Finance', briefs: 17, placements: 8 }
      ]
    },
    {
      id: 'r15', name: 'Renee Boulton', boutique: 'Boulton Legal Search', city: 'Adelaide',
      medianDays: 51, rating: 4.2, since: 2020,
      nicheStats: [
        { niche: 'Employment & IR', briefs: 9, placements: 5 },
        { niche: 'In-house / Legal Counsel', briefs: 7, placements: 3 }
      ]
    },
    {
      id: 'r16', name: 'Hugo Marchetti', boutique: 'Marchetti Talent', city: 'Sydney',
      medianDays: 30, rating: 4.9, since: 2016,
      nicheStats: [
        { niche: 'Litigation & Disputes', briefs: 13, placements: 9 },
        { niche: 'IP & Technology', briefs: 7, placements: 5 }
      ]
    },
    {
      id: 'r17', name: 'Isabelle Nunn', boutique: 'Nunn Advisory Search', city: 'Melbourne',
      medianDays: 37, rating: 4.6, since: 2019,
      nicheStats: [
        { niche: 'In-house / Legal Counsel', briefs: 14, placements: 10 },
        { niche: 'M&A / Corporate', briefs: 5, placements: 2 }
      ]
    },
    {
      id: 'r18', name: 'Warrick Cho', boutique: 'Cho & Partners Search', city: 'Sydney',
      medianDays: 58, rating: 3.9, since: 2023,
      nicheStats: [
        { niche: 'Projects & Energy', briefs: 10, placements: 4 },
        { niche: 'Banking & Finance', briefs: 9, placements: 4 }
      ]
    }
  ];

  /* The signed-in recruiter for "Recruiter view". */
  var CURRENT_RECRUITER_ID = 'r2';

  /* Monthly placements + fee income for the signed-in recruiter.
     The 12 monthly placement counts sum to that recruiter's 12-month
     placement total (17), which is what the directory row shows. */
  var currentMonthly = [
    { month: 'Sep 25', year: 2025, placements: 1, fees: 48000 },
    { month: 'Oct 25', year: 2025, placements: 2, fees: 101000 },
    { month: 'Nov 25', year: 2025, placements: 1, fees: 55000 },
    { month: 'Dec 25', year: 2025, placements: 0, fees: 0 },
    { month: 'Jan 26', year: 2026, placements: 1, fees: 47000 },
    { month: 'Feb 26', year: 2026, placements: 2, fees: 98000 },
    { month: 'Mar 26', year: 2026, placements: 1, fees: 52000 },
    { month: 'Apr 26', year: 2026, placements: 2, fees: 105000 },
    { month: 'May 26', year: 2026, placements: 2, fees: 96000 },
    { month: 'Jun 26', year: 2026, placements: 1, fees: 58000 },
    { month: 'Jul 26', year: 2026, placements: 2, fees: 112000 },
    { month: 'Aug 26', year: 2026, placements: 2, fees: 94000 }
  ];

  /* ---------------------------------------------------------------- *
   * Roles posted by the demo firm (12).
   * ---------------------------------------------------------------- */
  var roles = [
    {
      id: 'ro-01', title: 'Senior Associate - Projects & Energy', practice: 'Projects & Energy',
      pqe: '5-8 PQE', location: 'Sydney', salaryMin: 210000, salaryMax: 260000,
      feePct: 22, exclusive: false, posted: '2026-07-03', status: 'Interviewing',
      recruiters: ['r2', 'r9', 'r6'],
      pipeline: { Sourced: 14, Screened: 6, Interviewing: 3, Offer: 1, Placed: 0 },
      note: 'Replacement for a departing SA. Energy transition and offshore wind exposure preferred; the team will flex on PQE for the right transactional background.'
    },
    {
      id: 'ro-02', title: 'Special Counsel - M&A', practice: 'M&A / Corporate',
      pqe: '8+ PQE', location: 'Sydney', salaryMin: 280000, salaryMax: 340000,
      feePct: 24, exclusive: false, posted: '2026-07-17', status: 'Shortlisting',
      recruiters: ['r1', 'r12', 'r17'],
      pipeline: { Sourced: 9, Screened: 5, Interviewing: 2, Offer: 0, Placed: 0 },
      note: 'Partner-track hire supporting two corporate partners. Public M&A and schemes experience is the real requirement, despite the generalist advert.'
    },
    {
      id: 'ro-03', title: 'Associate - Banking & Finance', practice: 'Banking & Finance',
      pqe: '2-4 PQE', location: 'Melbourne', salaryMin: 145000, salaryMax: 175000,
      feePct: 20, exclusive: false, posted: '2026-07-11', status: 'Interviewing',
      recruiters: ['r7', 'r14'],
      pipeline: { Sourced: 18, Screened: 7, Interviewing: 4, Offer: 1, Placed: 0 },
      note: 'Leveraged and acquisition finance. High-volume role; the team will run two hires if the market supports it.'
    },
    {
      id: 'ro-04', title: 'Lawyer - Employment & IR', practice: 'Employment & IR',
      pqe: '3-5 PQE', location: 'Sydney', salaryMin: 160000, salaryMax: 195000,
      feePct: 21, exclusive: false, posted: '2026-07-22', status: 'Interviewing',
      recruiters: ['r11', 'r3'],
      pipeline: { Sourced: 12, Screened: 5, Interviewing: 2, Offer: 1, Placed: 0 },
      note: 'Enterprise agreement and underpayment remediation work. Prior in-house secondment viewed favourably.'
    },
    {
      id: 'ro-05', title: 'Senior Associate - Construction', practice: 'Property & Construction',
      pqe: '5-8 PQE', location: 'Brisbane', salaryMin: 195000, salaryMax: 235000,
      feePct: 22, exclusive: true, posted: '2026-07-28', status: 'Sourcing',
      recruiters: ['r13', 'r9'],
      pipeline: { Sourced: 8, Screened: 3, Interviewing: 1, Offer: 0, Placed: 0 },
      note: 'Front-end construction for major infrastructure clients. Exclusive to the two engaged recruiters for 30 days.'
    },
    {
      id: 'ro-06', title: 'In-house Counsel - Group Legal', practice: 'In-house / Legal Counsel',
      pqe: '4-7 PQE', location: 'Sydney', salaryMin: 180000, salaryMax: 220000,
      feePct: 19, exclusive: false, posted: '2026-06-16', status: 'Offer out',
      recruiters: ['r4', 'r17', 'r10'],
      pipeline: { Sourced: 21, Screened: 9, Interviewing: 4, Offer: 2, Placed: 1 },
      note: 'Secondment-to-permanent with a long-standing client. One placement already made; a second offer is with the candidate.'
    },
    {
      id: 'ro-07', title: 'Associate - IP & Technology', practice: 'IP & Technology',
      pqe: '2-4 PQE', location: 'Melbourne', salaryMin: 135000, salaryMax: 165000,
      feePct: 20, exclusive: false, posted: '2026-07-25', status: 'Shortlisting',
      recruiters: ['r5', 'r16'],
      pipeline: { Sourced: 11, Screened: 4, Interviewing: 2, Offer: 0, Placed: 0 },
      note: 'Data, privacy and technology contracting. A science or engineering background is nice to have, not required.'
    },
    {
      id: 'ro-08', title: 'Partner - Litigation & Disputes', practice: 'Litigation & Disputes',
      pqe: '8+ PQE', location: 'Sydney', salaryMin: 340000, salaryMax: 400000,
      feePct: 25, exclusive: true, posted: '2026-05-31', status: 'Interviewing',
      recruiters: ['r16', 'r3'],
      pipeline: { Sourced: 6, Screened: 3, Interviewing: 2, Offer: 0, Placed: 0 },
      note: 'Lateral partner with a portable class actions or regulatory investigations practice. Confidential search.'
    },
    {
      id: 'ro-09', title: 'Graduate Lawyer - Corporate', practice: 'M&A / Corporate',
      pqe: '0-2 PQE', location: 'Perth', salaryMin: 120000, salaryMax: 140000,
      feePct: 18, exclusive: false, posted: '2026-08-01', status: 'Sourcing',
      recruiters: ['r12'],
      pipeline: { Sourced: 16, Screened: 6, Interviewing: 2, Offer: 0, Placed: 0 },
      note: 'Off-cycle graduate intake for the resources-facing corporate team.'
    },
    {
      id: 'ro-10', title: 'Senior Associate - Energy Transition', practice: 'Projects & Energy',
      pqe: '5-8 PQE', location: 'Melbourne', salaryMin: 205000, salaryMax: 250000,
      feePct: 23, exclusive: false, posted: '2026-07-14', status: 'Interviewing',
      recruiters: ['r2', 'r6'],
      pipeline: { Sourced: 10, Screened: 4, Interviewing: 2, Offer: 1, Placed: 0 },
      note: 'Renewables development and PPAs. Sits across the Melbourne and Sydney project teams.'
    },
    {
      id: 'ro-11', title: 'Associate - Property', practice: 'Property & Construction',
      pqe: '3-5 PQE', location: 'Sydney', salaryMin: 155000, salaryMax: 185000,
      feePct: 21, exclusive: false, posted: '2026-06-12', status: 'Placed',
      recruiters: ['r13'],
      pipeline: { Sourced: 13, Screened: 5, Interviewing: 1, Offer: 0, Placed: 1 },
      note: 'Commercial leasing and development. Filled at the top of band; start date 1 September 2026.'
    },
    {
      id: 'ro-12', title: 'Legal Counsel - Regulatory', practice: 'In-house / Legal Counsel',
      pqe: '5-8 PQE', location: 'Canberra', salaryMin: 190000, salaryMax: 230000,
      feePct: 20, exclusive: false, posted: '2026-07-20', status: 'On hold',
      recruiters: ['r8', 'r4'],
      pipeline: { Sourced: 7, Screened: 2, Interviewing: 1, Offer: 0, Placed: 0 },
      note: 'Paused pending the client-side budget approval. Engaged recruiters have been told to hold, not withdraw.'
    }
  ];

  /* ---------------------------------------------------------------- *
   * Open briefs across the marketplace, as a recruiter sees them.
   * Firms stay anonymised until a brief is claimed.
   * ---------------------------------------------------------------- */
  var briefs = [
    {
      id: 'b-01', firmMasked: 'Top-tier - Sydney', firmRevealed: 'Ashgrove Hume',
      practice: 'Projects & Energy', pqe: '5-8 PQE', location: 'Sydney',
      salaryMin: 215000, salaryMax: 265000, feePct: 22, competing: 4, posted: '2026-07-30',
      brief: 'Energy transition team hiring an SA. Offshore wind and hydrogen project experience is the real filter; the advert says "projects" but the panel screens for development-stage work.'
    },
    {
      id: 'b-02', firmMasked: 'Global elite - Sydney', firmRevealed: 'Harcourt Levine',
      practice: 'M&A / Corporate', pqe: '8+ PQE', location: 'Sydney',
      salaryMin: 300000, salaryMax: 360000, feePct: 25, competing: 6, posted: '2026-07-26',
      brief: 'Special counsel for public M&A. Two prior searches lapsed; the firm has now widened to accept ASX-listed in-house candidates.'
    },
    {
      id: 'b-03', firmMasked: 'National mid-tier - Melbourne', firmRevealed: 'Corben Wray',
      practice: 'Banking & Finance', pqe: '2-4 PQE', location: 'Melbourne',
      salaryMin: 140000, salaryMax: 170000, feePct: 19, competing: 3, posted: '2026-08-03',
      brief: 'Acquisition finance associate. Fast panel - first interviews within five business days of submission.'
    },
    {
      id: 'b-04', firmMasked: 'Boutique disputes - Sydney', firmRevealed: 'Pellegrini Ross',
      practice: 'Litigation & Disputes', pqe: '3-5 PQE', location: 'Sydney',
      salaryMin: 165000, salaryMax: 200000, feePct: 21, competing: 2, posted: '2026-08-05',
      brief: 'Commercial disputes with a class actions bias. Partner is hands-on and reads every CV personally.'
    },
    {
      id: 'b-05', firmMasked: 'ASX-100 in-house - Melbourne', firmRevealed: 'Verity Group Legal',
      practice: 'In-house / Legal Counsel', pqe: '4-7 PQE', location: 'Melbourne',
      salaryMin: 185000, salaryMax: 225000, feePct: 18, competing: 5, posted: '2026-07-21',
      brief: 'First in-house move welcomed. The GC wants commercial contracting depth over pure advisory.'
    },
    {
      id: 'b-06', firmMasked: 'Top-tier - Brisbane', firmRevealed: 'Ashgrove Hume',
      practice: 'Property & Construction', pqe: '5-8 PQE', location: 'Brisbane',
      salaryMin: 190000, salaryMax: 230000, feePct: 22, competing: 3, posted: '2026-08-01',
      brief: 'Front-end construction for major infrastructure. Exclusive window closes in 30 days.'
    },
    {
      id: 'b-07', firmMasked: 'National mid-tier - Perth', firmRevealed: 'Halloway Skene',
      practice: 'Projects & Energy', pqe: '3-5 PQE', location: 'Perth',
      salaryMin: 170000, salaryMax: 205000, feePct: 20, competing: 4, posted: '2026-07-24',
      brief: 'Resources and infrastructure projects. Will consider east-coast candidates with relocation support.'
    },
    {
      id: 'b-08', firmMasked: 'Independent - Sydney', firmRevealed: 'Kirribilli Legal Co.',
      practice: 'Employment & IR', pqe: '2-4 PQE', location: 'Sydney',
      salaryMin: 135000, salaryMax: 165000, feePct: 20, competing: 2, posted: '2026-08-07',
      brief: 'Employer-side advisory and Fair Work advocacy. Small team, broad exposure, genuine flexibility.'
    },
    {
      id: 'b-09', firmMasked: 'Global elite - Melbourne', firmRevealed: 'Harcourt Levine',
      practice: 'IP & Technology', pqe: '5-8 PQE', location: 'Melbourne',
      salaryMin: 220000, salaryMax: 270000, feePct: 24, competing: 5, posted: '2026-07-18',
      brief: 'Technology transactions and data. The team has lost two candidates on process speed - move fast.'
    },
    {
      id: 'b-10', firmMasked: 'Government - Canberra', firmRevealed: 'Commonwealth agency (Cth)',
      practice: 'In-house / Legal Counsel', pqe: '5-8 PQE', location: 'Canberra',
      salaryMin: 175000, salaryMax: 210000, feePct: 18, competing: 1, posted: '2026-08-06',
      brief: 'Regulatory and administrative law. Australian citizenship and a security clearance pathway required.'
    },
    {
      id: 'b-11', firmMasked: 'Top-tier - Melbourne', firmRevealed: 'Bennelong Craig',
      practice: 'Litigation & Disputes', pqe: '8+ PQE', location: 'Melbourne',
      salaryMin: 330000, salaryMax: 390000, feePct: 25, competing: 7, posted: '2026-07-09',
      brief: 'Lateral partner with a portable practice. Confidential - candidate names only, no CVs at first pass.'
    },
    {
      id: 'b-12', firmMasked: 'Mid-tier - Adelaide', firmRevealed: 'Torrens & Fell',
      practice: 'Property & Construction', pqe: '3-5 PQE', location: 'Adelaide',
      salaryMin: 145000, salaryMax: 175000, feePct: 19, competing: 2, posted: '2026-08-04',
      brief: 'Development and leasing. The firm hires slowly but has never withdrawn a brief.'
    },
    {
      id: 'b-13', firmMasked: 'Boutique corporate - Sydney', firmRevealed: 'Ashgrove Hume',
      practice: 'M&A / Corporate', pqe: '3-5 PQE', location: 'Sydney',
      salaryMin: 175000, salaryMax: 210000, feePct: 23, competing: 3, posted: '2026-07-31',
      brief: 'Private capital and venture deals. Genuinely mid-level - senior candidates have been screened out twice.'
    },
    {
      id: 'b-14', firmMasked: 'ASX-200 in-house - Sydney', firmRevealed: 'Marrickville Holdings',
      practice: 'Banking & Finance', pqe: '5-8 PQE', location: 'Sydney',
      salaryMin: 205000, salaryMax: 245000, feePct: 21, competing: 4, posted: '2026-07-28',
      brief: 'Treasury and structured finance counsel. Reports to the Deputy GC; hybrid three days on site.'
    },
    {
      id: 'b-15', firmMasked: 'National firm - Brisbane', firmRevealed: 'Corben Wray',
      practice: 'Employment & IR', pqe: '5-8 PQE', location: 'Brisbane',
      salaryMin: 195000, salaryMax: 235000, feePct: 22, competing: 3, posted: '2026-08-08',
      brief: 'Workplace investigations and safety prosecutions. Special counsel title available for the right hire.'
    },
    {
      id: 'b-16', firmMasked: 'Tech scale-up - Sydney', firmRevealed: 'Quayline Technologies',
      practice: 'IP & Technology', pqe: '2-4 PQE', location: 'Sydney',
      salaryMin: 130000, salaryMax: 160000, feePct: 18, competing: 2, posted: '2026-08-10',
      brief: 'First legal hire under the GC. Equity component on top of base; candidates must be comfortable without precedent banks.'
    }
  ];

  /* ---------------------------------------------------------------- *
   * Derived fields. Computed once, here, so every screen reads the
   * same numbers rather than re-deriving (or hard-coding) its own.
   * ---------------------------------------------------------------- */
  function round1(n) { return Math.round(n * 10) / 10; }

  function daysBetween(isoA, isoB) {
    var a = new Date(isoA + 'T00:00:00');
    var b = new Date(isoB + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  recruiters.forEach(function (r) {
    var briefsTaken = 0;
    var placements = 0;
    r.nicheStats.forEach(function (n) {
      n.hitRate = round1((n.placements / n.briefs) * 100);
      briefsTaken += n.briefs;
      placements += n.placements;
    });
    r.briefsTaken = briefsTaken;
    r.placements = placements;
    r.hitRate = round1((placements / briefsTaken) * 100);
    r.niches = r.nicheStats.map(function (n) { return n.niche; });
  });

  roles.forEach(function (role) {
    role.pipelineTotal = STAGES.reduce(function (sum, s) { return sum + (role.pipeline[s] || 0); }, 0);
    role.daysOpen = daysBetween(role.posted, TODAY);
    role.firmPosted = true;
  });

  briefs.forEach(function (b) {
    b.daysOpen = daysBetween(b.posted, TODAY);
  });

  var currentRecruiter = recruiters.filter(function (r) { return r.id === CURRENT_RECRUITER_ID; })[0];
  currentRecruiter.monthly = currentMonthly;
  currentRecruiter.placements12moFromMonthly = currentMonthly.reduce(function (s, m) { return s + m.placements; }, 0);
  currentRecruiter.feesYtd = currentMonthly.reduce(function (s, m) {
    return m.year === 2026 ? s + m.fees : s;
  }, 0);
  currentRecruiter.fees12mo = currentMonthly.reduce(function (s, m) { return s + m.fees; }, 0);

  window.CM_DATA = {
    TODAY: TODAY,
    NICHES: NICHES,
    PQE_BANDS: PQE_BANDS,
    LOCATIONS: LOCATIONS,
    SALARY_BANDS: SALARY_BANDS,
    STAGES: STAGES,
    FIRM: FIRM,
    recruiters: recruiters,
    roles: roles,
    briefs: briefs,
    currentRecruiterId: CURRENT_RECRUITER_ID,
    currentRecruiter: currentRecruiter,
    daysBetween: daysBetween
  };
})();
