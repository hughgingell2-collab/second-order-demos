/* ClientDrill — mock data. All companies, people and figures are fictitious.
   No network access: everything here is plain JS attached to window.DATA. */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- firm */

  var FIRM = {
    name: 'Harwood Kelly',
    tagline: 'Your clients drill. You get the call.',
    user: 'Jasmine Ordway',
    userRole: 'BD Director'
  };

  /* --------------------------------------------------------- risk areas */

  var RISK_AREAS = [
    { id: 'environmental', label: 'Environmental' },
    { id: 'whs', label: 'WHS' },
    { id: 'cyber', label: 'Cyber' },
    { id: 'regulatory', label: 'Regulatory' },
    { id: 'insolvency', label: 'Insolvency' }
  ];

  /* ------------------------------------------------------------ clients */

  var CLIENTS = [
    { id: 'c1',  name: 'Kalgoorlie Ridge Minerals',  short: 'Kalgoorlie Ridge',      industry: 'Mining & resources',    state: 'WA',  abn: '48 217 903 664', rosterStart: 0 },
    { id: 'c2',  name: 'Brackwater Industries',      short: 'Brackwater',            industry: 'Manufacturing',         state: 'VIC', abn: '61 884 120 337', rosterStart: 6 },
    { id: 'c3',  name: 'Marrickville Property Group',short: 'Marrickville Property', industry: 'Property & construction',state: 'NSW', abn: '22 405 771 918', rosterStart: 12 },
    { id: 'c4',  name: 'Pindari Data Co',            short: 'Pindari Data',          industry: 'Technology',            state: 'NSW', abn: '90 336 502 145', rosterStart: 17 },
    { id: 'c5',  name: 'Talbot & Rowe Foods',        short: 'Talbot & Rowe',         industry: 'Food & agribusiness',   state: 'QLD', abn: '17 692 448 273', rosterStart: 22 },
    { id: 'c6',  name: 'Everton Freight Lines',      short: 'Everton Freight',       industry: 'Logistics & transport', state: 'NSW', abn: '35 118 760 502', rosterStart: 27 },
    { id: 'c7',  name: 'Coolabah Energy',            short: 'Coolabah Energy',       industry: 'Energy & utilities',    state: 'SA',  abn: '73 940 285 611', rosterStart: 34 },
    { id: 'c8',  name: 'Hastings Marine Group',      short: 'Hastings Marine',       industry: 'Marine services',       state: 'TAS', abn: '58 623 147 089', rosterStart: 39 },
    { id: 'c9',  name: 'Wrenfield Robotics',         short: 'Wrenfield Robotics',    industry: 'Technology',            state: 'VIC', abn: '11 507 836 420', rosterStart: 44 },
    { id: 'c10', name: 'Gowrie Gold Holdings',       short: 'Gowrie Gold',           industry: 'Mining & resources',    state: 'WA',  abn: '82 761 034 558', rosterStart: 49 }
  ];

  /* ------------------------------------- invitee roster pool (fictitious) */

  var PEOPLE = [
    { name: 'Marisa Colvin',       role: 'General Counsel' },
    { name: 'Dean Okafor',         role: 'Head of HSE' },
    { name: 'Prue Hanrahan',       role: 'Company Secretary' },
    { name: 'Callum Rhodes',       role: 'Operations Manager' },
    { name: 'Ingrid Salas',        role: 'Chief Financial Officer' },
    { name: 'Toby Marchetti',      role: 'Plant Manager' },
    { name: 'Anh Trinh',           role: 'Compliance Manager' },
    { name: 'Rebecca Stillwell',   role: 'Head of Risk' },
    { name: 'Gareth Mbeki',        role: 'Site Supervisor' },
    { name: 'Lucia Ferrante',      role: 'Legal Counsel' },
    { name: 'Hamish Doull',        role: 'IT Director' },
    { name: 'Nadia Persaud',       role: 'Head of People' },
    { name: 'Owen Bracegirdle',    role: 'Environmental Adviser' },
    { name: 'Simone Vaughan',      role: 'Finance Manager' },
    { name: 'Raj Kulkarni',        role: 'Head of Engineering' },
    { name: 'Fiona Ledger',        role: 'Communications Manager' },
    { name: 'Byron Achterberg',    role: 'Procurement Lead' },
    { name: 'Tessa Nguyen',        role: 'Board Director' },
    { name: 'Malcolm Freer',       role: 'Chief Operating Officer' },
    { name: 'Ivy Dashwood',        role: 'Quality Manager' },
    { name: "Sione Vaka'uta",      role: 'Operations Manager' },
    { name: 'Helena Brock',        role: 'General Counsel' },
    { name: 'Darius Whitlam',      role: 'Head of HSE' },
    { name: 'Poppy Ansell',        role: 'Company Secretary' },
    { name: 'Emmett Faraday',      role: 'Plant Manager' },
    { name: 'Zainab Haddad',       role: 'Compliance Manager' },
    { name: 'Grant Mulvaney',      role: 'Site Supervisor' },
    { name: 'Clara Bettencourt',   role: 'Chief Financial Officer' },
    { name: 'Xavier Pomeroy',      role: 'IT Director' },
    { name: 'Josephine Aturu',     role: 'Head of Risk' },
    { name: 'Neil Cardogan',       role: 'Environmental Adviser' },
    { name: 'Amira Selim',         role: 'Legal Counsel' },
    { name: 'Rory Thackeray',      role: 'Head of Engineering' },
    { name: 'Yvette Ramsbotham',   role: 'Head of People' },
    { name: 'Dominic Ashworth',    role: 'Finance Manager' },
    { name: 'Keira Lomax',         role: 'Communications Manager' },
    { name: 'Elias Vukovic',       role: 'Procurement Lead' },
    { name: 'Marion Tuiletufuga',  role: 'Board Director' },
    { name: 'Hugo Penhaligon',     role: 'Chief Operating Officer' },
    { name: 'Sarah Ngata',         role: 'Quality Manager' },
    { name: 'Patrick Deveraux',    role: 'Operations Manager' },
    { name: 'Leila Barrowman',     role: 'General Counsel' },
    { name: 'Cormac Bligh',        role: 'Head of HSE' },
    { name: 'Susannah Wray',       role: 'Company Secretary' },
    { name: 'Tobias Mkhize',       role: 'Plant Manager' },
    { name: 'Delphine Cousins',    role: 'Compliance Manager' },
    { name: 'Angus Kerrigan',      role: 'Site Supervisor' },
    { name: 'Rosa Villanueva',     role: 'Chief Financial Officer' },
    { name: 'Felix Ardagh',        role: 'IT Director' },
    { name: 'Bianca Threlfall',    role: 'Head of Risk' },
    { name: 'Jonah Everly',        role: 'Environmental Adviser' },
    { name: 'Mei-Lin Chau',        role: 'Legal Counsel' },
    { name: 'Duncan Rawsthorne',   role: 'Head of Engineering' },
    { name: 'Harriet Nkemelu',     role: 'Head of People' },
    { name: 'Vaughn Castellano',   role: 'Finance Manager' },
    { name: 'Priya Bhattacharya',  role: 'Communications Manager' },
    { name: 'Lachlan Strood',      role: 'Procurement Lead' },
    { name: 'Gemma Ivanovic',      role: 'Board Director' },
    { name: 'Roland Ashby-Kent',   role: 'Chief Operating Officer' },
    { name: 'Talia Woodgate',      role: 'Quality Manager' }
  ];

  /* ---------------------------------------------------------- scenarios */
  /* Each scenario has five drill steps. `short` is the chart label.       */

  var SCENARIOS = [
    {
      id: 'epa',
      label: 'EPA raid',
      area: 'environmental',
      owner: 'Priya Naidu',
      ownerRole: 'Partner, Environment & Planning',
      steps: [
        { name: 'Verify the warrant',            short: 'Verify warrant' },
        { name: 'Notify legal & pause work',     short: 'Notify legal' },
        { name: 'Preserve legal privilege',      short: 'Legal privilege' },
        { name: 'Supervise document seizure',    short: 'Supervise seizure' },
        { name: 'Post-raid notification',        short: 'Post-raid notice' }
      ]
    },
    {
      id: 'whs',
      label: 'WHS incident',
      area: 'whs',
      owner: 'Tom Halloran',
      ownerRole: 'Partner, Employment & Safety',
      steps: [
        { name: 'Secure the scene',              short: 'Secure scene' },
        { name: 'Preserve the incident site',    short: 'Preserve site' },
        { name: 'Notify the regulator (24h)',    short: 'Notify regulator' },
        { name: 'Run the internal investigation',short: 'Internal investigation' },
        { name: 'Handle worker interviews',      short: 'Worker interviews' }
      ]
    },
    {
      id: 'cyber',
      label: 'Cyber breach',
      area: 'cyber',
      owner: 'Elise Verlaine',
      ownerRole: 'Partner, Cyber & Privacy',
      steps: [
        { name: 'Contain and isolate',           short: 'Contain & isolate' },
        { name: 'Convene the response team',     short: 'Convene response team' },
        { name: 'Assess notifiable data breach', short: 'Assess notifiable breach' },
        { name: 'Notify OAIC & individuals',     short: 'Notify OAIC' },
        { name: 'Manage threat-actor contact',   short: 'Threat-actor contact' }
      ]
    },
    {
      id: 'asic',
      label: 'ASIC investigation',
      area: 'regulatory',
      owner: 'Marcus Deng',
      ownerRole: 'Partner, Regulatory & Investigations',
      steps: [
        { name: 'Respond to the s.19 notice',    short: 'Respond to s.19' },
        { name: 'Scope the document production', short: 'Scope production' },
        { name: 'Assert privilege',              short: 'Assert privilege' },
        { name: 'Prepare the examinee',          short: 'Prepare examinee' },
        { name: 'Continuous disclosure check',   short: 'Continuous disclosure' }
      ]
    },
    {
      id: 'insolvency',
      label: 'Insolvency',
      area: 'insolvency',
      owner: 'Rhonda Kellaway',
      ownerRole: 'Partner, Restructuring & Insolvency',
      steps: [
        { name: 'Assess solvency indicators',    short: 'Solvency indicators' },
        { name: 'Safe harbour eligibility',      short: 'Safe harbour' },
        { name: 'Director duties & liability',   short: 'Director duties' },
        { name: 'Engage restructuring adviser',  short: 'Engage adviser' },
        { name: 'Employee entitlements',         short: 'Employee entitlements' }
      ]
    }
  ];

  /* ---------------------------------------------------------- campaigns */
  /* invitees = people invited; completed = people who finished the drill. */
  /* stepFails[i] = how many of the `completed` cohort failed step i.      */
  /* Completion %, avg score, weakest step and the heatmap are all derived */
  /* from these three numbers in app.js, so nothing can drift out of sync. */

  var CAMPAIGNS = [
    { id: 'C-101', name: 'EPA Dawn Raid — Site 4',        scenario: 'epa',        clientId: 'c1',  invitees: 14, completed: 12, status: 'Closed', sent: '2026-06-15',
      bdAction: 'Partner call re privilege protocols and a one-page raid card for site leadership.' },
    { id: 'C-102', name: 'Fatality Response Tabletop',    scenario: 'whs',        clientId: 'c1',  invitees: 18, completed: 15, status: 'Closed', sent: '2026-07-02',
      bdAction: 'Offer the 24-hour notification workshop before the shutdown period.' },
    { id: 'C-103', name: 'Ransomware Board Drill',        scenario: 'cyber',      clientId: 'c9',  invitees: 10, completed:  7, status: 'Live',   sent: '2026-08-04',
      bdAction: 'Board briefing on the OAIC 30-day assessment clock.' },
    { id: 'C-104', name: 'Contamination Notice Response', scenario: 'epa',        clientId: 'c2',  invitees: 11, completed:  9, status: 'Closed', sent: '2026-06-22',
      bdAction: 'Privilege protocol review across the Altona and Laverton sites.' },
    { id: 'C-105', name: 'Machine Guarding Incident',     scenario: 'whs',        clientId: 'c2',  invitees: 12, completed: 10, status: 'Live',   sent: '2026-07-20',
      bdAction: 'Scene-preservation checklist and supervisor training proposal.' },
    { id: 'C-106', name: 'Cyber Extortion Escalation',    scenario: 'cyber',      clientId: 'c2',  invitees: 10, completed:  8, status: 'Live',   sent: '2026-08-06',
      bdAction: 'Sanctions and ransom-payment advice note for the executive team.' },
    { id: 'C-107', name: 'Development Site Raid',         scenario: 'epa',        clientId: 'c3',  invitees: 10, completed:  8, status: 'Closed', sent: '2026-06-29',
      bdAction: 'Privilege protocol for consultant reports commissioned through the firm.' },
    { id: 'C-108', name: 'Head Contractor Collapse',      scenario: 'insolvency', clientId: 'c3',  invitees:  7, completed:  6, status: 'Live',   sent: '2026-07-27',
      bdAction: 'Safe harbour eligibility review with the CFO before the half-year accounts.' },
    { id: 'C-109', name: 'Safe Harbour Board Refresher',  scenario: 'insolvency', clientId: 'c9',  invitees:  6, completed:  0, status: 'Draft',  sent: '2026-08-11',
      bdAction: 'Scheduled to send after the August board meeting.' },
    { id: 'C-110', name: 'Notifiable Data Breach Drill',  scenario: 'cyber',      clientId: 'c4',  invitees: 16, completed: 14, status: 'Closed', sent: '2026-06-18',
      bdAction: 'Breach-assessment playbook workshop for the incident response team.' },
    { id: 'C-111', name: 'Ransom Negotiation Tabletop',   scenario: 'cyber',      clientId: 'c4',  invitees:  9, completed:  7, status: 'Live',   sent: '2026-08-01',
      bdAction: 'Threat-actor engagement protocol and sanctions screening advice.' },
    { id: 'C-112', name: 'ASIC s.19 Examination Prep',    scenario: 'asic',       clientId: 'c4',  invitees:  8, completed:  5, status: 'Live',   sent: '2026-08-08',
      bdAction: 'Urgent partner call — privilege assertion is failing at board level.' },
    { id: 'C-113', name: 'Cold Chain Recall & EPA Notice',scenario: 'epa',        clientId: 'c5',  invitees: 13, completed: 11, status: 'Closed', sent: '2026-07-06',
      bdAction: 'Privilege protocol plus recall-notification review.' },
    { id: 'C-114', name: 'Chemical Handling Injury',      scenario: 'whs',        clientId: 'c5',  invitees: 15, completed: 12, status: 'Live',   sent: '2026-07-30',
      bdAction: 'Regulator notification training for the Rocklea and Yatala plants.' },
    { id: 'C-115', name: 'Fleet Fatality Response',       scenario: 'whs',        clientId: 'c6',  invitees: 22, completed: 17, status: 'Live',   sent: '2026-07-14',
      bdAction: 'Largest cohort to date — propose the depot-by-depot notification drill.' },
    { id: 'C-116', name: 'Driver Telematics Breach',      scenario: 'cyber',      clientId: 'c6',  invitees:  9, completed:  0, status: 'Draft',  sent: '2026-08-10',
      bdAction: 'Awaiting client sign-off on the invitee list.' },
    { id: 'C-117', name: 'Insolvent Trading Refresher',   scenario: 'insolvency', clientId: 'c6',  invitees:  8, completed:  6, status: 'Closed', sent: '2026-06-25',
      bdAction: 'Director duties briefing for the newly appointed board members.' },
    { id: 'C-118', name: 'Grid Outage Regulator Response',scenario: 'asic',       clientId: 'c7',  invitees: 11, completed:  9, status: 'Closed', sent: '2026-07-09',
      bdAction: 'Privilege protocol for the incident review currently under way.' },
    { id: 'C-119', name: 'Vessel Spill — Dual Regulator', scenario: 'epa',        clientId: 'c8',  invitees:  9, completed:  7, status: 'Live',   sent: '2026-08-03',
      bdAction: 'Dual-regulator (AMSA/EPA) privilege protocol for the fleet.' },
    { id: 'C-120', name: 'Continuous Disclosure Breach',  scenario: 'asic',       clientId: 'c10', invitees: 12, completed: 10, status: 'Live',   sent: '2026-07-23',
      bdAction: 'Continuous disclosure refresher ahead of the resource upgrade announcement.' }
  ];

  /* stepFails kept alongside so the arrays stay readable and checkable */
  var STEP_FAILS = {
    'C-101': [2, 3, 8, 4, 3],
    'C-102': [3, 6, 9, 4, 5],
    'C-103': [1, 2, 4, 5, 2],
    'C-104': [1, 2, 6, 3, 2],
    'C-105': [2, 5, 4, 3, 3],
    'C-106': [2, 1, 5, 4, 3],
    'C-107': [2, 1, 5, 2, 2],
    'C-108': [1, 4, 3, 1, 2],
    'C-109': [0, 0, 0, 0, 0],
    'C-110': [3, 2, 9, 6, 4],
    'C-111': [1, 1, 3, 2, 5],
    'C-112': [2, 1, 4, 2, 1],
    'C-113': [2, 3, 7, 3, 2],
    'C-114': [3, 4, 7, 3, 4],
    'C-115': [4, 7, 11, 5, 6],
    'C-116': [0, 0, 0, 0, 0],
    'C-117': [2, 3, 4, 1, 2],
    'C-118': [2, 3, 6, 3, 2],
    'C-119': [1, 2, 5, 2, 1],
    'C-120': [3, 2, 5, 4, 6]
  };

  /* ------------------------------------------------------------ signals */

  var SIGNALS = [
    { id: 'S-01', clientId: 'c1', area: 'environmental', campaignId: 'C-101', date: '2026-06-17', priority: 'High',
      signal: '8 of 12 failed the legal-privilege step',
      concern: 'Consultant reports are being handed to officers without a privilege claim.',
      action: 'Partner call re privilege protocols; offer a one-page raid card.',
      owner: 'Priya Naidu' },
    { id: 'S-02', clientId: 'c1', area: 'environmental', campaignId: 'C-101', date: '2026-06-19', priority: 'Medium',
      signal: 'GC re-ran the EPA drill twice in three days',
      concern: 'Something live at a site — the GC is rehearsing, not sampling.',
      action: 'Informal call before the quarterly review; do not sell, ask.',
      owner: 'Jasmine Ordway' },
    { id: 'S-03', clientId: 'c1', area: 'whs', campaignId: 'C-102', date: '2026-07-04', priority: 'High',
      signal: '9 of 15 missed the 24-hour regulator notification',
      concern: 'Notification duty is not understood below executive level.',
      action: 'Propose the notification workshop for site leadership.',
      owner: 'Tom Halloran' },
    { id: 'S-04', clientId: 'c1', area: 'whs', campaignId: 'C-102', date: '2026-07-06', priority: 'Low',
      signal: 'Site supervisor asked about worker interview rights',
      concern: 'Frontline uncertainty about who may be interviewed and when.',
      action: 'Send the interview-rights explainer; no partner time needed yet.',
      owner: 'Jasmine Ordway' },
    { id: 'S-05', clientId: 'c2', area: 'environmental', campaignId: 'C-104', date: '2026-06-24', priority: 'High',
      signal: '6 of 9 failed the legal-privilege step',
      concern: 'Same failure pattern as the Kalgoorlie cohort — systemic, not local.',
      action: 'Privilege protocol review across both Victorian sites.',
      owner: 'Priya Naidu' },
    { id: 'S-06', clientId: 'c2', area: 'whs', campaignId: 'C-105', date: '2026-07-22', priority: 'Medium',
      signal: 'Half the cohort failed incident-site preservation',
      concern: 'Plant is being restarted before the site is properly preserved.',
      action: 'Scene-preservation checklist plus supervisor training proposal.',
      owner: 'Tom Halloran' },
    { id: 'S-07', clientId: 'c2', area: 'cyber', campaignId: 'C-106', date: '2026-08-07', priority: 'High',
      signal: 'Asked about ransom-payment sanctions exposure',
      concern: 'A payment decision may be closer than the drill suggests.',
      action: 'Same-day partner call; sanctions screening advice note.',
      owner: 'Elise Verlaine' },
    { id: 'S-08', clientId: 'c3', area: 'environmental', campaignId: 'C-107', date: '2026-07-01', priority: 'Medium',
      signal: '5 of 8 failed the legal-privilege step',
      concern: 'Consultant reports commissioned direct, not through counsel.',
      action: 'Offer to re-paper the consultant engagements through the firm.',
      owner: 'Priya Naidu' },
    { id: 'S-09', clientId: 'c3', area: 'insolvency', campaignId: 'C-108', date: '2026-07-29', priority: 'High',
      signal: 'CFO drilled safe harbour twice in one week',
      concern: 'A head contractor in the supply chain is probably in trouble.',
      action: 'Safe harbour eligibility review before the half-year accounts.',
      owner: 'Rhonda Kellaway' },
    { id: 'S-10', clientId: 'c4', area: 'cyber', campaignId: 'C-110', date: '2026-06-20', priority: 'High',
      signal: '9 of 14 failed the notifiable-breach assessment',
      concern: 'The team cannot tell a reportable breach from an incident.',
      action: 'Breach-assessment playbook workshop for the response team.',
      owner: 'Elise Verlaine' },
    { id: 'S-11', clientId: 'c4', area: 'cyber', campaignId: 'C-110', date: '2026-06-23', priority: 'Medium',
      signal: 'Asked about the OAIC 30-day assessment clock',
      concern: 'Timing of the assessment window is the live uncertainty.',
      action: 'Send the assessment-clock note; follow up in two weeks.',
      owner: 'Jasmine Ordway' },
    { id: 'S-12', clientId: 'c4', area: 'cyber', campaignId: 'C-111', date: '2026-08-02', priority: 'Medium',
      signal: '5 of 7 failed the threat-actor contact step',
      concern: 'Staff are willing to negotiate directly with an attacker.',
      action: 'Threat-actor engagement protocol; escalate if repeated.',
      owner: 'Elise Verlaine' },
    { id: 'S-13', clientId: 'c4', area: 'regulatory', campaignId: 'C-112', date: '2026-08-09', priority: 'High',
      signal: '4 of 5 failed privilege assertion in s.19 prep',
      concern: 'Board-level exposure in a live regulatory matter.',
      action: 'Urgent partner call — this is the highest-value signal this month.',
      owner: 'Marcus Deng' },
    { id: 'S-14', clientId: 'c5', area: 'environmental', campaignId: 'C-113', date: '2026-07-08', priority: 'Medium',
      signal: '7 of 11 failed the legal-privilege step',
      concern: 'Recall documentation is being generated outside privilege.',
      action: 'Privilege protocol plus recall-notification review.',
      owner: 'Priya Naidu' },
    { id: 'S-15', clientId: 'c5', area: 'whs', campaignId: 'C-114', date: '2026-08-01', priority: 'Medium',
      signal: '7 of 12 missed the regulator notification step',
      concern: 'Two plants, one notification process, no shared owner.',
      action: 'Regulator notification training for Rocklea and Yatala.',
      owner: 'Tom Halloran' },
    { id: 'S-16', clientId: 'c6', area: 'whs', campaignId: 'C-115', date: '2026-07-16', priority: 'High',
      signal: '11 of 17 missed the 24-hour notification',
      concern: 'The largest cohort we have run, and the weakest result.',
      action: 'Propose the depot-by-depot notification drill.',
      owner: 'Tom Halloran' },
    { id: 'S-17', clientId: 'c6', area: 'whs', campaignId: 'C-115', date: '2026-07-18', priority: 'Low',
      signal: 'Head of HSE asked for a fatality-response one-pager',
      concern: 'Wants something laminated for the depot walls.',
      action: 'Send the branded one-pager; cheap goodwill, high recall.',
      owner: 'Jasmine Ordway' },
    { id: 'S-18', clientId: 'c6', area: 'insolvency', campaignId: 'C-117', date: '2026-06-27', priority: 'Medium',
      signal: '4 of 6 failed the director-duties step',
      concern: 'New board members have not been inducted on personal liability.',
      action: 'Director duties briefing for the incoming directors.',
      owner: 'Rhonda Kellaway' },
    { id: 'S-19', clientId: 'c7', area: 'regulatory', campaignId: 'C-118', date: '2026-07-11', priority: 'High',
      signal: '6 of 9 failed the privilege step in s.19 prep',
      concern: 'An incident review is under way without privilege in place.',
      action: 'Privilege protocol for the current review — time critical.',
      owner: 'Marcus Deng' },
    { id: 'S-20', clientId: 'c7', area: 'regulatory', campaignId: 'C-118', date: '2026-07-13', priority: 'Low',
      signal: 'Company secretary opened the debrief CTA twice',
      concern: 'Interested but has not booked — needs a nudge, not a pitch.',
      action: 'Offer three specific times rather than a general invitation.',
      owner: 'Jasmine Ordway' },
    { id: 'S-21', clientId: 'c8', area: 'environmental', campaignId: 'C-119', date: '2026-08-05', priority: 'Medium',
      signal: '5 of 7 failed the legal-privilege step',
      concern: 'Dual-regulator confusion about who may see what.',
      action: 'Dual-regulator (AMSA/EPA) privilege protocol for the fleet.',
      owner: 'Priya Naidu' },
    { id: 'S-22', clientId: 'c9', area: 'cyber', campaignId: 'C-103', date: '2026-08-06', priority: 'Medium',
      signal: '5 of 7 missed the OAIC notification step',
      concern: 'A board that thinks notification is an IT decision.',
      action: 'Board briefing on the OAIC assessment and notification duties.',
      owner: 'Elise Verlaine' },
    { id: 'S-23', clientId: 'c10', area: 'regulatory', campaignId: 'C-120', date: '2026-07-25', priority: 'High',
      signal: '6 of 10 failed the continuous-disclosure check',
      concern: 'A resource upgrade announcement is being prepared.',
      action: 'Continuous disclosure refresher before the announcement drops.',
      owner: 'Marcus Deng' }
  ];

  /* ------------------------------------------------- drill builder options */

  var INDUSTRIES = [
    'Mining & resources', 'Manufacturing', 'Property & construction', 'Technology',
    'Logistics & transport', 'Energy & utilities', 'Food & agribusiness', 'Marine services'
  ];

  var DIFFICULTIES = [
    { id: 'foundational', label: 'Foundational', mins: 20, note: 'For frontline and site staff' },
    { id: 'standard',     label: 'Standard',     mins: 35, note: 'For managers and functional leads' },
    { id: 'board',        label: 'Board-level',  mins: 50, note: 'For directors and the executive' }
  ];

  var BRAND_COLOURS = [
    { id: 'crimson',  label: 'Harwood Crimson', hex: '#dc2626' },
    { id: 'navy',     label: 'Chancery Navy',   hex: '#1e3a8a' },
    { id: 'green',    label: 'Silk Green',      hex: '#15803d' },
    { id: 'plum',     label: 'Bar Plum',        hex: '#6d28d9' },
    { id: 'teal',     label: 'Counsel Teal',    hex: '#0f766e' },
    { id: 'charcoal', label: 'Chambers Slate',  hex: '#374151' }
  ];

  /* ---------------------------------------------------- the drill player */
  /* Three-step EPA raid. correct = index of the right option.             */

  var DRILL = {
    scenarioId: 'epa',
    title: 'EPA raid — unannounced site inspection',
    intro: 'Three decisions, taken in the first hour. Choose the response you would actually make.',
    steps: [
      {
        clock: '07:04',
        heading: 'Two officers at the gate',
        situation: 'Two EPA authorised officers are at the front gate of your plant holding a document headed "Search Warrant". The shift supervisor has called you at home. Nobody from legal is on site.',
        options: [
          {
            text: 'Ask the officers to wait at reception while you photograph the warrant, record their names and authority numbers, and call the legal team.',
            correct: true,
            rationale: 'You must not obstruct — but you are entitled to verify the warrant’s scope and the officers’ authority before entry, and that record is the only evidence later of what they were permitted to take.'
          },
          {
            text: 'Wave them straight through. Refusing entry to an authorised officer is an offence and any delay will look like obstruction.',
            correct: false,
            rationale: 'Co-operation is required, but letting officers in without recording the warrant’s scope forfeits your only record of what they were entitled to seize.'
          },
          {
            text: 'Tell them to come back at 9am when the general counsel is on site.',
            correct: false,
            rationale: 'Turning authorised officers away risks an obstruction offence. The move is to verify while they wait at reception, not to send them home.'
          }
        ]
      },
      {
        clock: '07:41',
        heading: 'The folder on the HSE desk',
        situation: 'The officers ask for "all environmental reports". Your HSE manager’s folder includes a consultant’s report commissioned last month through Harwood Kelly, marked "prepared for the purpose of legal advice".',
        options: [
          {
            text: 'Hand over the whole folder. It is easier to sort out later than to look like you are hiding something.',
            correct: false,
            rationale: 'Privilege is waived on disclosure. Once that report is handed over you cannot claw it back, and it becomes evidence in the investigation.'
          },
          {
            text: 'Set the report aside, state that legal professional privilege is claimed over it, record it by description without disclosing the contents, and note the claim in the raid log.',
            correct: true,
            rationale: 'Correct. Privilege must be claimed at the point of seizure, the document described but not disclosed, and the claim recorded contemporaneously.'
          },
          {
            text: 'Have the HSE manager shred the report before the officers reach that desk.',
            correct: false,
            rationale: 'Destroying a document that may be required in an investigation is a criminal offence and will do far more damage than the report ever could.'
          }
        ]
      },
      {
        clock: '08:15',
        heading: 'The quiet word with the plant manager',
        situation: 'An officer takes your plant manager aside and asks him to "just walk me through what happened at the outfall on Tuesday". He has no lawyer with him and he is keen to be helpful.',
        options: [
          {
            text: 'Let him answer. Being helpful builds goodwill with the regulator and he knows the site better than anyone.',
            correct: false,
            rationale: 'An unrepresented informal account becomes an admission attributed to the company. Goodwill is not worth an unadvised statement on the record.'
          },
          {
            text: 'Instruct him to say nothing at all to anyone, on your authority.',
            correct: false,
            rationale: 'A blanket refusal can itself be obstruction where questions are lawfully compelled. Defer and get advice — do not stonewall.'
          },
          {
            text: 'Ask that any interview be deferred until a lawyer is present, log the request, and remind him to answer only on observed facts and never to speculate.',
            correct: true,
            rationale: 'Correct. Defer the interview, record the request in the raid log, and keep any answers to what was actually observed.'
          }
        ]
      }
    ],
    leaderboard: [
      { name: 'Marisa Colvin',   role: 'General Counsel',    score: 3 },
      { name: 'Anh Trinh',       role: 'Compliance Manager', score: 3 },
      { name: 'Dean Okafor',     role: 'Head of HSE',        score: 2 },
      { name: 'Toby Marchetti',  role: 'Plant Manager',      score: 1 }
    ],
    cpdPoints: 1.5
  };

  /* ------------------------------------------------------------- export */

  global.DATA = {
    FIRM: FIRM,
    RISK_AREAS: RISK_AREAS,
    CLIENTS: CLIENTS,
    PEOPLE: PEOPLE,
    SCENARIOS: SCENARIOS,
    CAMPAIGNS: CAMPAIGNS,
    STEP_FAILS: STEP_FAILS,
    SIGNALS: SIGNALS,
    INDUSTRIES: INDUSTRIES,
    DIFFICULTIES: DIFFICULTIES,
    BRAND_COLOURS: BRAND_COLOURS,
    DRILL: DRILL
  };
})(typeof window !== 'undefined' ? window : this);
