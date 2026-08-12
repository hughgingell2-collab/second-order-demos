/* StatuteGraph — mock data layer.
   All figures, instruments, firms and people below are FICTITIOUS.
   No network requests: everything lives in this file as plain JS. */

(function (global) {
  'use strict';

  /* ---------- Fixed vocabularies ---------- */

  // Right-hand column of the bipartite graph: exactly 10 document types.
  var DOC_TYPES = [
    'Employment agreement',
    'SaaS master services agreement',
    'Privacy policy & collection notice',
    'Supply agreement',
    'Shareholders agreement',
    'Contractor services agreement',
    'Data processing addendum',
    'Commercial lease',
    'WHS policy suite',
    'Development consent deed'
  ];

  var PRACTICE_AREAS = [
    'Privacy & Data',
    'Employment & IR',
    'Corporate & M&A',
    'Work Health & Safety',
    'Property & Planning',
    'Consumer & Competition'
  ];

  var JURISDICTIONS = ['Cth', 'NSW', 'VIC', 'QLD', 'WA', 'SA'];

  // Severity order (low -> high) drives sorting and the status colour tokens.
  var SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

  /* ---------- Builders (keep the source terse and internally consistent) ---------- */

  // cp(name, practiceArea, templateFamilies, docTypeIndexes)
  function cp(name, area, families, docs) {
    return {
      name: name,
      practiceArea: area,
      templateFamilies: families,
      docTypes: docs.map(function (i) { return DOC_TYPES[i]; })
    };
  }

  // prov(cite, heading, clausePatterns)
  function prov(cite, heading, patterns) {
    return { cite: cite, heading: heading, clausePatterns: patterns };
  }

  function amend(id, instrument, shortAct, jurisdiction, severity, commencement, summary, provisions) {
    return {
      id: id,
      instrument: instrument,
      shortAct: shortAct,
      jurisdiction: jurisdiction,
      severity: severity,
      commencement: commencement,
      summary: summary,
      provisions: provisions
    };
  }

  /* ---------- The corpus: 30 amendments ---------- */

  var AMENDMENTS = [
    amend('SG-2601', 'Privacy and Other Legislation Amendment Act 2026 (Cth) sch 2', 'Privacy Act 1988', 'Cth', 'Critical', '2026-07-01',
      'Schedule 2 shortens the notifiable data breach assessment window and adds a standing obligation to keep the regulator informed while an assessment is on foot. It also lifts the bar on cross-border disclosure, requiring a named recipient and a documented adequacy view rather than reasonable steps. A new automated decision-making transparency duty attaches wherever a decision materially affects an individual.',
      [
        prov('s 26WK', 'Notifiable data breaches — assessment and notice', [
          cp('Data breach notification clause', 'Privacy & Data', 14, [1, 2, 6, 3]),
          cp('Breach assessment timetable clause', 'Privacy & Data', 9, [1, 6, 3]),
          cp('Regulator liaison and cooperation clause', 'Privacy & Data', 6, [1, 2, 6])
        ]),
        prov('s 16C', 'Cross-border disclosure of personal information', [
          cp('Overseas disclosure and data transfer clause', 'Privacy & Data', 11, [1, 6, 3]),
          cp('Sub-processor approval clause', 'Privacy & Data', 8, [6, 1])
        ]),
        prov('s 26ZA', 'Automated decision-making transparency', [
          cp('Automated decision transparency clause', 'Privacy & Data', 7, [2, 1]),
          cp('Algorithmic explanation notice clause', 'Privacy & Data', 4, [2])
        ]),
        prov('s 41A', 'Statutory tort — serious invasion of privacy', [
          cp('Privacy indemnity and liability cap clause', 'Privacy & Data', 8, [1, 6, 3])
        ])
      ]),

    amend('SG-2602', 'Fair Work Amendment (Secure Jobs and Fair Pay) Act 2026 (Cth) pt 3', 'Fair Work Act 2009', 'Cth', 'High', '2026-07-15',
      'Part 3 replaces the employee-initiated casual conversion pathway with an employer notification duty at the six-month mark. Fixed-term engagements are capped at two consecutive terms, with an anti-avoidance rule that catches successive contractor arrangements. A right to disconnect is inserted as an enforceable workplace right.',
      [
        prov('s 66B', 'Casual employment — conversion', [
          cp('Casual conversion clause', 'Employment & IR', 18, [0, 5]),
          cp('Casual loading offset clause', 'Employment & IR', 11, [0])
        ]),
        prov('s 333E', 'Fixed term contracts — limitations', [
          cp('Fixed-term contract limitation clause', 'Employment & IR', 12, [0, 5]),
          cp('Contract renewal notice clause', 'Employment & IR', 7, [0])
        ]),
        prov('s 333M', 'Right to disconnect', [
          cp('Right to disconnect clause', 'Employment & IR', 9, [0]),
          cp('After-hours contact protocol clause', 'Employment & IR', 5, [0, 8])
        ])
      ]),

    amend('SG-2603', 'Work Health and Safety Amendment (Psychosocial Risk) Regulation 2026 (NSW)', 'WHS Regulation 2017 (NSW)', 'NSW', 'High', '2026-08-03',
      'The regulation makes psychosocial hazard control an express duty with a written risk management process, rather than a code of practice expectation. Workload, rostering and exposure to occupational violence are named hazards. Incident notification thresholds now capture psychological injury requiring treatment.',
      [
        prov('cl 55D', 'Managing psychosocial risks', [
          cp('Psychosocial hazard management clause', 'Work Health & Safety', 13, [8, 0, 5]),
          cp('Workload and rostering control clause', 'Work Health & Safety', 6, [8, 0])
        ]),
        prov('cl 39', 'Incident notification', [
          cp('Notifiable incident reporting clause', 'Work Health & Safety', 8, [8, 3])
        ]),
        prov('cl 39B', 'Contractor induction and supervision', [
          cp('Contractor safety induction clause', 'Work Health & Safety', 10, [5, 3, 8]),
          cp('Principal contractor consultation clause', 'Work Health & Safety', 7, [5, 8])
        ])
      ]),

    amend('SG-2604', 'Corporations Amendment (Climate-related Financial Disclosure) Act 2026 (Cth) sch 1', 'Corporations Act 2001', 'Cth', 'Critical', '2026-01-01',
      'Group 1 entities must lodge a sustainability report with the annual report, and directors must declare that the climate statements comply with the standards. Scope 3 disclosure pulls the obligation down the supply chain: reporting entities need contractual rights to emissions data from suppliers who are not themselves reporting entities. Limited assurance applies from the first reporting period.',
      [
        prov('s 296A', 'Sustainability report — contents', [
          cp('Sustainability reporting warranty clause', 'Corporate & M&A', 9, [4, 3]),
          cp('Climate statement accuracy clause', 'Corporate & M&A', 6, [4])
        ]),
        prov('s 296D', 'Scope 3 greenhouse gas emissions', [
          cp('Scope 3 data provision clause', 'Corporate & M&A', 6, [3, 1]),
          cp('Emissions data audit rights clause', 'Corporate & M&A', 5, [3, 4, 1])
        ]),
        prov('s 295A', 'Directors’ declaration', [
          cp('Director declaration clause', 'Corporate & M&A', 5, [4])
        ])
      ]),

    amend('SG-2605', 'Environmental Planning and Assessment Amendment (Biodiversity Offsets) Act 2026 (NSW)', 'EP&A Act 1979', 'NSW', 'Medium', '2026-06-01',
      'Offset obligations shift from a like-for-like credit test to a net-gain test, and credits must be retired before the relevant construction stage rather than before occupation. Consent conditions gain a standard modification-notice mechanism. Contamination findings during works now trigger a reporting duty to the consent authority.',
      [
        prov('s 7.13', 'Biodiversity offsets scheme', [
          cp('Biodiversity offset obligation clause', 'Property & Planning', 7, [9, 7]),
          cp('Offset credit purchase clause', 'Property & Planning', 4, [9])
        ]),
        prov('s 4.17', 'Conditions of development consent', [
          cp('Development consent condition clause', 'Property & Planning', 11, [9]),
          cp('Consent modification notice clause', 'Property & Planning', 5, [9, 7])
        ]),
        prov('s 4.15', 'Evaluation — matters for consideration', [
          cp('Site contamination warranty clause', 'Property & Planning', 6, [9, 7, 3])
        ])
      ]),

    amend('SG-2606', 'Australian Consumer Law Amendment (Unfair Trading Practices) Act 2026 (Cth) sch 3', 'Australian Consumer Law', 'Cth', 'High', '2026-08-01',
      'Schedule 3 adds a general prohibition on unfair trading practices sitting above the existing unfair contract terms regime, and raises the small business threshold so most mid-market supply arrangements are now in scope. Unilateral variation and automatic renewal terms are presumed unfair unless a prescribed notice is given. Liability caps that operate to exclude consumer guarantees are void rather than merely unenforceable.',
      [
        prov('s 23', 'Unfair contract terms', [
          cp('Unfair contract terms clause', 'Consumer & Competition', 21, [1, 3, 7, 5]),
          cp('Unilateral variation clause', 'Consumer & Competition', 14, [1, 3]),
          cp('Limitation of liability clause', 'Consumer & Competition', 17, [1, 3, 5])
        ]),
        prov('s 24A', 'Subscriptions and automatic renewal', [
          cp('Subscription auto-renewal clause', 'Consumer & Competition', 9, [1, 3])
        ]),
        prov('s 64', 'Consumer guarantees — exclusion', [
          cp('Consumer guarantee exclusion clause', 'Consumer & Competition', 13, [3, 1])
        ])
      ]),

    amend('SG-2607', 'Privacy Amendment (Children’s Online Privacy Code) Rules 2026 (Cth)', 'Privacy Act 1988', 'Cth', 'Medium', '2026-08-10',
      'The code applies to any service likely to be accessed by children, not only services aimed at them, which pulls most consumer platforms into scope. Age assurance must be proportionate and cannot itself become a new collection of sensitive information. Default settings must be the most privacy-protective option available.',
      [
        prov('r 12', 'Children’s online privacy code — application', [
          cp('Children’s online privacy clause', 'Privacy & Data', 5, [2, 1]),
          cp('Age assurance clause', 'Privacy & Data', 4, [2, 1])
        ]),
        prov('r 18', 'Default privacy settings', [
          cp('Default settings warranty clause', 'Privacy & Data', 3, [1, 2])
        ])
      ]),

    amend('SG-2608', 'Payroll Tax Amendment (Contractor Deeming) Act 2026 (VIC)', 'Payroll Tax Act 2007 (Vic)', 'VIC', 'Medium', '2026-07-01',
      'The relevant contract exemptions are narrowed, so engagements of 90 days or more with a single principal are presumed to be relevant contracts. Grouping provisions now reach labour hire intermediaries. The practical effect is that contractor paperwork must carry a deeming warranty and a tax indemnity that most standard templates do not have.',
      [
        prov('s 32A', 'Relevant contracts — exemptions', [
          cp('Contractor deeming warranty clause', 'Employment & IR', 9, [5, 3]),
          cp('Contractor status review clause', 'Employment & IR', 5, [5])
        ]),
        prov('s 46B', 'Grouping and joint liability', [
          cp('Payroll tax indemnity clause', 'Employment & IR', 6, [5, 0])
        ])
      ]),

    amend('SG-2609', 'Work Health and Safety Amendment (Industrial Manslaughter) Act 2026 (QLD)', 'WHS Act 2011 (Qld)', 'QLD', 'Critical', '2026-05-01',
      'Industrial manslaughter is extended to officers of unincorporated bodies and to senior officers of principal contractors. Due diligence is defined by reference to a documented board-level safety reporting cadence. Insurance and indemnity arrangements that would fund a penalty are expressly void, which invalidates a common carve-out in contractor paperwork.',
      [
        prov('s 27', 'Officer due diligence', [
          cp('Officer due diligence clause', 'Work Health & Safety', 11, [8, 4, 0]),
          cp('Board safety reporting clause', 'Work Health & Safety', 6, [4, 8])
        ]),
        prov('s 34C', 'Industrial manslaughter — officers', [
          cp('Industrial manslaughter indemnity carve-out', 'Work Health & Safety', 7, [5, 3, 8]),
          cp('Insurance and penalty exclusion clause', 'Work Health & Safety', 5, [5, 3])
        ]),
        prov('s 19', 'Primary duty of care', [
          cp('Safety management system clause', 'Work Health & Safety', 9, [8, 5])
        ])
      ]),

    amend('SG-2610', 'Security of Critical Infrastructure Amendment (Data Storage Systems) Act 2026 (Cth)', 'SOCI Act 2018', 'Cth', 'High', '2026-03-01',
      'Business-critical data storage systems are brought inside the critical infrastructure asset definition, so ordinary corporate SaaS can be captured where it holds regulated data. Risk management programs must now cover named upstream vendors. Reporting obligations are shortened and require the operator to compel cooperation from its suppliers.',
      [
        prov('s 12F', 'Critical data storage systems', [
          cp('Critical data system notification clause', 'Privacy & Data', 8, [1, 6, 3]),
          cp('Data localisation clause', 'Privacy & Data', 6, [1, 6])
        ]),
        prov('s 30CU', 'Risk management program', [
          cp('Supply chain risk clause', 'Privacy & Data', 10, [3, 1, 5]),
          cp('Vendor risk assessment clause', 'Privacy & Data', 7, [3, 1])
        ]),
        prov('s 30BC', 'Cyber incident reporting', [
          cp('Incident response cooperation clause', 'Privacy & Data', 6, [1, 6])
        ])
      ]),

    amend('SG-2611', 'Retail Leases Amendment (Disclosure and Outgoings) Act 2026 (NSW)', 'Retail Leases Act 1994 (NSW)', 'NSW', 'Low', '2025-11-01',
      'Lessor disclosure statements must itemise outgoings by category with a prior-year actual, and an estimate that understates by more than 10 per cent is not recoverable. Reconciliation timing moves from twelve months to three months after the accounting period. The changes are mechanical but touch every retail lease precedent in the market.',
      [
        prov('s 11', 'Lessor’s disclosure statement', [
          cp('Lessor disclosure statement clause', 'Property & Planning', 7, [7])
        ]),
        prov('s 12A', 'Outgoings — estimates and recovery', [
          cp('Outgoings apportionment clause', 'Property & Planning', 5, [7]),
          cp('Estimate and reconciliation clause', 'Property & Planning', 4, [7])
        ])
      ]),

    amend('SG-2612', 'Fair Work Amendment (Wage Compliance) Act 2026 (Cth) pt 2', 'Fair Work Act 2009', 'Cth', 'Critical', '2026-01-01',
      'Intentional underpayment becomes a criminal offence with a safe harbour for employers who self-report and remediate under a compliance agreement. Record-keeping failures now reverse the onus in any underpayment proceeding. Precedents need an express remediation mechanism and a records warranty that survives termination.',
      [
        prov('s 327A', 'Intentional underpayment — offence', [
          cp('Underpayment remediation clause', 'Employment & IR', 10, [0, 5]),
          cp('Wage audit cooperation clause', 'Employment & IR', 6, [0, 5, 3])
        ]),
        prov('s 535', 'Employee records', [
          cp('Record-keeping warranty clause', 'Employment & IR', 8, [0, 5, 3])
        ])
      ]),

    amend('SG-2613', 'Modern Slavery Amendment (Anti-Slavery Commissioner) Act 2026 (Cth)', 'Modern Slavery Act 2018', 'Cth', 'Medium', '2026-02-01',
      'Reporting entities must publish a due diligence statement rather than a narrative statement, and the Commissioner can require production of supplier assessments. The revenue threshold drops to $50 million, roughly doubling the reporting population. Supplier code compliance and audit rights become the operative drafting response.',
      [
        prov('s 16A', 'Due diligence statements', [
          cp('Supply chain due diligence clause', 'Consumer & Competition', 12, [3, 5, 1]),
          cp('Supplier code compliance clause', 'Consumer & Competition', 9, [3, 5])
        ]),
        prov('s 16C', 'Commissioner — information powers', [
          cp('Modern slavery audit rights clause', 'Consumer & Competition', 8, [3, 5])
        ])
      ]),

    amend('SG-2614', 'Environment Protection Amendment (PFAS Management) Regulations 2026 (VIC)', 'EP Regulations 2021 (Vic)', 'VIC', 'High', '2026-04-01',
      'PFAS is added to the priority waste schedule with a duty to notify on discovery above threshold concentration. The general environmental duty is given prescriptive content for site handover. Waste tracking obligations extend to the transporter and the receiving site, which changes who warrants what in a supply chain.',
      [
        prov('reg 36', 'Contaminated land — duty to notify', [
          cp('Contaminated land notification clause', 'Property & Planning', 6, [7, 9, 3]),
          cp('Remediation cost allocation clause', 'Property & Planning', 5, [7, 9])
        ]),
        prov('reg 12', 'General environmental duty', [
          cp('General environmental duty clause', 'Property & Planning', 9, [3, 7, 9])
        ]),
        prov('reg 74', 'Waste tracking', [
          cp('Waste tracking clause', 'Property & Planning', 5, [3, 5])
        ])
      ]),

    amend('SG-2615', 'Treasury Laws Amendment (Payment Times Reporting) Act 2026 (Cth) sch 1', 'Payment Times Reporting Act 2020', 'Cth', 'Medium', '2025-10-01',
      'Maximum payment terms for small business suppliers are capped at 20 days, and terms beyond that are read down rather than voided. Slow payer determinations are published and carry a remediation plan requirement. Standard supply terms across the market now sit outside the cap.',
      [
        prov('s 14A', 'Payment terms — small business suppliers', [
          cp('Payment terms clause', 'Consumer & Competition', 16, [3, 1, 5]),
          cp('Slow payer remediation clause', 'Consumer & Competition', 7, [3, 1])
        ]),
        prov('s 24', 'Reporting obligations', [
          cp('Small business supplier reporting clause', 'Consumer & Competition', 6, [3])
        ])
      ]),

    amend('SG-2616', 'Planning and Environment Amendment (Housing Targets) Act 2026 (VIC)', 'P&E Act 1987 (Vic)', 'VIC', 'Low', '2026-04-01',
      'Development contributions move to a standard levy with a transitional credit for existing permits. Permit conditions gain a mandatory staged delivery milestone where the development exceeds 50 dwellings. Deal documents that assume a negotiated contribution need reworking.',
      [
        prov('s 46GV', 'Development contributions — standard levy', [
          cp('Development contribution clause', 'Property & Planning', 6, [9, 7])
        ]),
        prov('s 62', 'Permit conditions', [
          cp('Planning permit condition clause', 'Property & Planning', 8, [9]),
          cp('Staged delivery milestone clause', 'Property & Planning', 4, [9, 3])
        ])
      ]),

    amend('SG-2617', 'Corporations Amendment (Virtual Meetings and Electronic Execution) Regulations 2026 (Cth)', 'Corporations Regulations 2001', 'Cth', 'Low', '2025-12-01',
      'Meeting notices may be given by a link-only method where the member has not opted out, and the technology requirements are tightened. Electronic execution is extended to deeds executed by an agent. The change is low severity but touches execution blocks in almost every template family.',
      [
        prov('reg 2G.2.01', 'Notice of meetings', [
          cp('Shareholder meeting notice clause', 'Corporate & M&A', 5, [4])
        ]),
        prov('reg 2G.3.02', 'Electronic execution of documents', [
          cp('Electronic execution clause', 'Corporate & M&A', 11, [4, 1, 3, 0]),
          cp('Counterparts and split execution clause', 'Corporate & M&A', 8, [4, 1, 3])
        ])
      ]),

    amend('SG-2618', 'Anti-Discrimination Amendment (Positive Duty) Act 2026 (NSW)', 'Anti-Discrimination Act 1977 (NSW)', 'NSW', 'High', '2026-07-20',
      'A positive duty to eliminate sex discrimination and hostile workplace environments is inserted, with an inquiry power attached. Reasonable steps must be evidenced, not merely asserted, which makes policy documents part of the compliance record. Contractor and labour hire arrangements are captured through the workplace participant definition.',
      [
        prov('s 22B', 'Positive duty — reasonable steps', [
          cp('Positive duty compliance clause', 'Employment & IR', 9, [0, 8, 5]),
          cp('Reasonable steps evidence clause', 'Employment & IR', 5, [0, 8])
        ]),
        prov('s 22F', 'Workplace conduct standards', [
          cp('Workplace behaviour policy clause', 'Employment & IR', 7, [0, 8])
        ])
      ]),

    amend('SG-2619', 'Privacy Amendment (Biometric Information) Regulations 2026 (Cth)', 'Privacy Regulations 2013', 'Cth', 'High', '2026-08-05',
      'Biometric templates are treated as sensitive information even where the underlying image is not retained. Consent must be separate from general terms and cannot be bundled with a service condition. Retention beyond the verification purpose requires a documented destruction schedule.',
      [
        prov('reg 4A', 'Biometric information — collection', [
          cp('Biometric collection consent clause', 'Privacy & Data', 6, [2, 0, 1]),
          cp('Biometric retention and destruction clause', 'Privacy & Data', 4, [2, 6])
        ]),
        prov('reg 4C', 'Sensitive information — handling', [
          cp('Sensitive information handling clause', 'Privacy & Data', 9, [2, 6, 1])
        ])
      ]),

    amend('SG-2620', 'Work Health and Safety Amendment (Crystalline Silica) Regulation 2026 (VIC)', 'OHS Regulations 2017 (Vic)', 'VIC', 'Medium', '2026-03-01',
      'Uncontrolled processing of engineered stone is prohibited outright, and the control hierarchy for other silica processes is prescribed rather than risk-assessed. Health monitoring is mandatory for anyone in a silica process regardless of exposure duration. Supply paperwork now needs a prohibited-process warranty.',
      [
        prov('reg 319', 'Crystalline silica processes', [
          cp('Crystalline silica control clause', 'Work Health & Safety', 5, [8, 5]),
          cp('Prohibited process warranty clause', 'Work Health & Safety', 4, [3, 5])
        ]),
        prov('reg 345', 'Health monitoring', [
          cp('Health monitoring clause', 'Work Health & Safety', 7, [8, 0])
        ])
      ]),

    amend('SG-2621', 'Competition and Consumer Amendment (Merger Reform) Act 2026 (Cth) sch 2', 'CC Act 2010', 'Cth', 'Critical', '2026-01-01',
      'Mandatory and suspensory merger notification replaces the informal review process, with monetary thresholds and a serial acquisition aggregation rule. Parties must not complete before determination, so condition precedent drafting changes materially. Information sharing between the parties during the standstill is constrained.',
      [
        prov('s 51ABA', 'Notification of acquisitions', [
          cp('Merger notification condition clause', 'Corporate & M&A', 8, [4, 3]),
          cp('Information sharing protocol clause', 'Corporate & M&A', 5, [4, 1])
        ]),
        prov('s 51ABF', 'Standstill obligations', [
          cp('Deal conduct and standstill clause', 'Corporate & M&A', 6, [4])
        ]),
        prov('s 51ABK', 'Determinations and conditions', [
          cp('Regulatory approval condition precedent', 'Corporate & M&A', 9, [4, 3, 1])
        ])
      ]),

    amend('SG-2622', 'Residential Tenancies and Other Legislation Amendment Act 2026 (QLD)', 'RT Act 2008 (Qld)', 'QLD', 'Low', '2025-09-01',
      'Rent increases are limited to one in any 12-month period and attach to the premises rather than the tenancy. Minimum housing standards are extended to rooming accommodation. Effect on commercial precedent families is small but real where mixed-use assets are involved.',
      [
        prov('s 91', 'Rent increases — frequency', [
          cp('Rent increase frequency clause', 'Property & Planning', 4, [7])
        ]),
        prov('s 185A', 'Minimum housing standards', [
          cp('Minimum standards compliance clause', 'Property & Planning', 3, [7])
        ])
      ]),

    amend('SG-2623', 'Fair Work Amendment (Employee-like Work) Act 2026 (Cth) pt 4', 'Fair Work Act 2009', 'Cth', 'High', '2026-06-01',
      'A new employee-like worker category allows minimum standards orders for digital platform work without converting the worker to an employee. Deactivation requires notice and a review pathway. Platform terms and downstream contractor paperwork both need new machinery.',
      [
        prov('s 536JY', 'Employee-like workers — application', [
          cp('Employee-like worker clause', 'Employment & IR', 11, [5, 0]),
          cp('Platform engagement terms clause', 'Employment & IR', 6, [5, 1])
        ]),
        prov('s 536LA', 'Minimum standards orders', [
          cp('Minimum standards order clause', 'Employment & IR', 8, [5, 3])
        ]),
        prov('s 536MF', 'Deactivation — notice and review', [
          cp('Deactivation notice clause', 'Employment & IR', 5, [5, 1])
        ])
      ]),

    amend('SG-2624', 'Environment Protection Amendment (Circular Economy) Act 2026 (SA)', 'EP Act 1993 (SA)', 'SA', 'Low', '2026-02-01',
      'Product stewardship obligations are extended to importers as well as manufacturers, with a recovery target phased in over three years. Packaging recovery reporting begins in the first full financial year. Supply agreements need an allocation of the stewardship cost.',
      [
        prov('s 27B', 'Product stewardship — extended producer responsibility', [
          cp('Product stewardship clause', 'Property & Planning', 5, [3, 1])
        ]),
        prov('s 27F', 'Packaging recovery targets', [
          cp('Packaging recovery clause', 'Property & Planning', 4, [3])
        ])
      ]),

    amend('SG-2625', 'Cyber Security (Ransomware Payment Reporting) Rules 2026 (Cth)', 'Cyber Security Act 2024', 'Cth', 'High', '2026-05-01',
      'Entities above the turnover threshold must report a ransomware payment within 72 hours, including payments made by a supplier on their behalf. A limited use protection applies to information given to the coordinator. Contracts need an approval gate before any supplier makes a payment.',
      [
        prov('r 12', 'Ransomware payment reports', [
          cp('Ransomware payment reporting clause', 'Privacy & Data', 7, [1, 6, 3]),
          cp('Payment approval authority clause', 'Privacy & Data', 4, [1, 3])
        ]),
        prov('r 16', 'Limited use obligations', [
          cp('Security incident cooperation clause', 'Privacy & Data', 9, [1, 6])
        ])
      ]),

    amend('SG-2626', 'Property Law Amendment (Seller Disclosure) Act 2026 (QLD)', 'Property Law Act 2023 (Qld)', 'QLD', 'Medium', '2026-08-01',
      'A mandatory seller disclosure statement must be given before the contract is signed, with a termination right if it is not. Prescribed certificates attach to the statement. Warranty and remedy drafting in sale contracts and development deeds needs to reflect the new termination trigger.',
      [
        prov('s 99', 'Seller disclosure statement', [
          cp('Seller disclosure warranty clause', 'Property & Planning', 8, [7, 9]),
          cp('Disclosure defect remedy clause', 'Property & Planning', 5, [7])
        ]),
        prov('s 103', 'Prescribed matters — certificates', [
          cp('Title encumbrance clause', 'Property & Planning', 6, [7])
        ])
      ]),

    amend('SG-2627', 'Franchising Code of Conduct Amendment Regulations 2026 (Cth)', 'Franchising Code', 'Cth', 'Medium', '2026-04-01',
      'Disclosure documents must include a standardised key facts sheet and a plain-English summary of termination rights. Compensation on early termination is a mandatory term rather than a negotiated one. Goodwill compensation is prescribed for motor vehicle dealerships and extended by regulation to two further sectors.',
      [
        prov('reg 9', 'Disclosure document', [
          cp('Franchise disclosure clause', 'Consumer & Competition', 7, [3, 1])
        ]),
        prov('reg 29', 'Termination and compensation', [
          cp('Termination and compensation clause', 'Consumer & Competition', 9, [3, 5]),
          cp('Goodwill compensation clause', 'Consumer & Competition', 5, [3])
        ])
      ]),

    amend('SG-2628', 'Work Health and Safety Amendment (Engineered Stone) Regulation 2026 (WA)', 'WHS Regulations 2022 (WA)', 'WA', 'Medium', '2025-10-01',
      'The prohibition on engineered stone is extended to legacy stock held before the commencement date. Supervision of high-risk work now requires a named competent person on site. Supply and contractor templates need a prohibited-materials warranty and a competency verification mechanism.',
      [
        prov('r 5.20', 'Prohibited materials', [
          cp('Prohibited materials warranty clause', 'Work Health & Safety', 6, [3, 5, 8])
        ]),
        prov('r 5.24', 'Supervision of high risk work', [
          cp('Site supervision clause', 'Work Health & Safety', 5, [5, 8]),
          cp('Competency verification clause', 'Work Health & Safety', 4, [5, 8, 0])
        ])
      ]),

    amend('SG-2629', 'Digital ID (Accredited Entities) Rules 2026 (Cth)', 'Digital ID Act 2024', 'Cth', 'Medium', '2025-11-01',
      'Accredited entities must support a nominated interoperability profile and cannot make accreditation-dependent services conditional on additional data collection. Relying parties inherit obligations through the accreditation chain. Vendor paperwork needs an accreditation warranty and a change-of-status notice.',
      [
        prov('r 22', 'Identity verification requirements', [
          cp('Identity verification clause', 'Privacy & Data', 8, [1, 2, 6])
        ]),
        prov('r 30', 'Accreditation conditions', [
          cp('Accreditation warranty clause', 'Privacy & Data', 5, [1, 3]),
          cp('Interoperability obligation clause', 'Privacy & Data', 4, [1, 6])
        ])
      ]),

    amend('SG-2630', 'Local Government Amendment (Contract Transparency) Act 2026 (NSW)', 'LG Act 1993 (NSW)', 'NSW', 'Low', '2025-12-01',
      'Councils must publish contracts above $150,000 with limited commercial-in-confidence redaction. Probity declarations extend to subcontractors named in a tender. Suppliers to local government need a disclosure acknowledgement and a conflict regime in their standard terms.',
      [
        prov('s 55A', 'Public contract disclosure', [
          cp('Public contract disclosure clause', 'Consumer & Competition', 5, [3, 1])
        ]),
        prov('s 55D', 'Probity and conflicts of interest', [
          cp('Probity and conflict clause', 'Consumer & Competition', 4, [3, 5])
        ])
      ])
  ];

  /* ---------- Derived views (single source of truth = AMENDMENTS) ---------- */

  // Flatten every clause pattern once, tagged with its amendment + provision.
  AMENDMENTS.forEach(function (a) {
    var flat = [];
    a.provisions.forEach(function (p) {
      p.id = provisionId(a, p);
      p.amendmentId = a.id;
      p.label = a.shortAct + ' ' + p.cite;
      p.clausePatterns.forEach(function (c) {
        c.provision = p.cite;
        c.provisionId = p.id;
        c.provisionLabel = p.label;
        c.amendmentId = a.id;
        flat.push(c);
      });
    });
    a.clausePatterns = flat;
    a.clausePatternCount = flat.length;

    // Affected document types, with the number of clause patterns hitting each.
    var byDoc = {};
    flat.forEach(function (c) {
      c.docTypes.forEach(function (d) { byDoc[d] = (byDoc[d] || 0) + 1; });
    });
    a.docTypeImpacts = DOC_TYPES
      .filter(function (d) { return byDoc[d]; })
      .map(function (d) { return { docType: d, clausePatterns: byDoc[d] }; })
      .sort(function (x, y) { return y.clausePatterns - x.clausePatterns; });
    a.docTypeCount = a.docTypeImpacts.length;

    // Practice areas touched, in the canonical order.
    var areas = {};
    flat.forEach(function (c) { areas[c.practiceArea] = true; });
    a.practiceAreas = PRACTICE_AREAS.filter(function (p) { return areas[p]; });

    // Template families is a useful secondary magnitude in the detail panel.
    a.templateFamilies = flat.reduce(function (sum, c) { return sum + c.templateFamilies; }, 0);
  });

  function provisionId(a, p) {
    var slug = (a.jurisdiction + '-' + a.shortAct + '-' + p.cite)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug;
  }

  // Every provision in the corpus, flattened (used by the graph + API console).
  var PROVISIONS = [];
  AMENDMENTS.forEach(function (a) {
    a.provisions.forEach(function (p) {
      var edges = {};
      p.clausePatterns.forEach(function (c) {
        c.docTypes.forEach(function (d) { edges[d] = (edges[d] || 0) + 1; });
      });
      PROVISIONS.push({
        id: p.id,
        cite: p.cite,
        heading: p.heading,
        label: p.label,
        amendmentId: a.id,
        instrument: a.instrument,
        jurisdiction: a.jurisdiction,
        severity: a.severity,
        clausePatterns: p.clausePatterns,
        edges: DOC_TYPES
          .filter(function (d) { return edges[d]; })
          .map(function (d) { return { docType: d, weight: edges[d] }; }),
        weight: p.clausePatterns.reduce(function (s, c) { return s + c.docTypes.length; }, 0)
      });
    });
  });

  /* ---------- Pricing (API Feed tab) ---------- */

  var PRICING = [
    {
      key: 'seat',
      name: 'Updater seat',
      role: 'First-order wedge',
      price: 'A$180',
      unit: 'per user / month',
      callPrice: '500 impact calls per seat per month included, then A$0.11 / call',
      primary: false,
      features: [
        'Precedent redlining inside the firm’s DMS',
        'Accept / reject feedback trains the graph',
        'Single-firm corpus, single jurisdiction bundle',
        'Impact feed with 24-hour refresh'
      ]
    },
    {
      key: 'feed',
      name: 'Vendor feed',
      role: 'The second-order business',
      price: 'A$0.06',
      unit: 'per call',
      callPrice: 'Minimum commitment A$2,400 / month · volume break at 250k calls',
      primary: true,
      features: [
        'Full /impacts and /provisions/{id}/documents endpoints',
        'Webhook push within 15 minutes of gazettal',
        'Embed in a DMS, CLM or drafting product under licence',
        'Edge-level confidence scores and provenance',
        'Historic graph back to July 2024'
      ]
    },
    {
      key: 'enterprise',
      name: 'Enterprise graph',
      role: 'Whole-of-corpus licence',
      price: 'A$14,000',
      unit: 'per month, flat',
      callPrice: 'Unrestricted calls · nightly bulk export · on-premise mirror',
      primary: false,
      features: [
        'Bulk graph export (Parquet + JSON-LD)',
        'Private clause taxonomy mapped to the public graph',
        'On-premise mirror for sovereign hosting',
        'Named solutions engineer and 99.9% SLA'
      ]
    }
  ];

  global.SG_DATA = {
    DOC_TYPES: DOC_TYPES,
    PRACTICE_AREAS: PRACTICE_AREAS,
    JURISDICTIONS: JURISDICTIONS,
    SEVERITIES: SEVERITIES,
    AMENDMENTS: AMENDMENTS,
    PROVISIONS: PROVISIONS,
    PRICING: PRICING,
    // "Today" for this demo — keeps the 12-month window deterministic offline.
    TODAY: '2026-08-13'
  };
})(typeof window !== 'undefined' ? window : globalThis);
