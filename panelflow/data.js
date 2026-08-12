/* PanelFlow — demo data. All figures, firms, people and matters are fictitious.
   Everything the charts show is derived at runtime from MATTERS + BENCHMARKS,
   so the agency view and the firm view cannot drift apart. */

var PF_DATA = (function () {
  'use strict';

  var AGENCY = {
    name: 'NSW Dept of Planning & Infrastructure',
    shortName: 'DPI (NSW)',
    abn: '51 824 753 556',
    jurisdiction: 'NSW',
    panelName: 'Legal Services Panel 2024–2028',
    today: '2026-08-13'
  };

  /* The nine panel firms. `util` is declared capacity utilisation (%),
     `respHrs` median hours to acknowledge an allocation request,
     `slaPct` share of requests acknowledged inside the 48h panel SLA.

     `util` tracks FY26 work won per partner, so it stays consistent with the
     ledger: the small firms carrying the most spend (Tamblyn Cross, Wren &
     Ashby) are the most stretched, and the quiet firms have the headroom. That
     feedback loop is what stops the allocation engine simply handing every
     matter to the cheapest firm on the panel. */
  var FIRMS = [
    { id: 'F1', name: 'Harrow & Blyth',       abn: '41 682 349 117', tier: 'Tier 1', offices: 'Sydney, Newcastle',      partners: 34, util: 38, respHrs: 9.4,  slaPct: 91, declinePct: 8 },
    { id: 'F2', name: 'Meridian Legal',       abn: '77 205 918 640', tier: 'Tier 1', offices: 'Sydney, Parramatta',     partners: 41, util: 74, respHrs: 6.1,  slaPct: 96, declinePct: 4 },
    { id: 'F3', name: 'Kestrel Doyle',        abn: '63 449 072 385', tier: 'Tier 2', offices: 'Newcastle, Gosford',     partners: 18, util: 54, respHrs: 11.8, slaPct: 84, declinePct: 11 },
    { id: 'F4', name: 'Ashgrove Partners',    abn: '29 731 560 224', tier: 'Tier 1', offices: 'Sydney, Wollongong',     partners: 27, util: 55, respHrs: 5.2,  slaPct: 97, declinePct: 3 },
    { id: 'F5', name: 'Tamblyn Cross',        abn: '85 116 903 471', tier: 'Tier 2', offices: 'Wagga Wagga, Albury',    partners: 12, util: 88, respHrs: 14.6, slaPct: 79, declinePct: 14 },
    { id: 'F6', name: 'Ridgeway Legal',       abn: '18 540 267 839', tier: 'Tier 1', offices: 'Sydney',                 partners: 52, util: 42, respHrs: 8.3,  slaPct: 89, declinePct: 9 },
    { id: 'F7', name: 'Calder Vane',          abn: '90 673 158 402', tier: 'Tier 1', offices: 'Sydney, Orange',         partners: 30, util: 74, respHrs: 7.0,  slaPct: 93, declinePct: 6 },
    { id: 'F8', name: 'Northcote Fitzgerald', abn: '36 812 445 970', tier: 'Tier 2', offices: 'Parramatta, Dubbo',      partners: 21, util: 55, respHrs: 10.2, slaPct: 87, declinePct: 10 },
    { id: 'F9', name: 'Wren & Ashby',         abn: '72 358 601 293', tier: 'Tier 2', offices: 'Newcastle, Tamworth',    partners: 15, util: 86, respHrs: 12.9, slaPct: 82, declinePct: 12 }
  ];

  /* The firm whose seat you take in the Firm view. */
  var FIRM_VIEW_ID = 'F4';

  var MATTER_TYPES = ['Property & Planning', 'Commercial', 'Employment', 'Litigation', 'Construction'];
  var COMPLEXITIES = ['Low', 'Medium', 'High'];
  var VALUE_BANDS = ['Under $50k', '$50k–$150k', '$150k–$500k', '$500k+'];
  var SENIORITIES = ['Partner', 'Special Counsel', 'Senior Associate', 'Associate', 'Lawyer'];

  /* Post-matter satisfaction rating (out of 5) recorded by the agency,
     per firm per matter type. Feeds the "past performance" leg of the score. */
  var PERFORMANCE = {
    F1: { 'Property & Planning': 4.4, 'Commercial': 4.2, 'Employment': 3.6, 'Litigation': 4.5, 'Construction': 4.1 },
    F2: { 'Property & Planning': 4.1, 'Commercial': 4.5, 'Employment': 4.2, 'Litigation': 3.9, 'Construction': 3.5 },
    F3: { 'Property & Planning': 3.8, 'Commercial': 3.6, 'Employment': 4.6, 'Litigation': 3.7, 'Construction': 3.2 },
    F4: { 'Property & Planning': 4.3, 'Commercial': 4.0, 'Employment': 3.9, 'Litigation': 4.2, 'Construction': 4.6 },
    F5: { 'Property & Planning': 3.6, 'Commercial': 3.9, 'Employment': 4.0, 'Litigation': 3.5, 'Construction': 3.8 },
    F6: { 'Property & Planning': 4.6, 'Commercial': 4.3, 'Employment': 3.8, 'Litigation': 4.7, 'Construction': 4.4 },
    F7: { 'Property & Planning': 4.0, 'Commercial': 4.1, 'Employment': 4.3, 'Litigation': 4.0, 'Construction': 3.9 },
    F8: { 'Property & Planning': 3.9, 'Commercial': 4.4, 'Employment': 4.1, 'Litigation': 4.3, 'Construction': 4.0 },
    F9: { 'Property & Planning': 3.5, 'Commercial': 3.7, 'Employment': 3.7, 'Litigation': 3.4, 'Construction': 3.6 }
  };

  /* Standing conflicts declared by firms against a matter type. */
  var CONFLICTS = [
    { firmId: 'F6', type: 'Construction',        reason: 'Acting for Barrenjoey Civil Pty Ltd on the same head contract' },
    { firmId: 'F2', type: 'Litigation',          reason: 'Acting adverse to the Department in a related Land & Environment Court appeal' },
    { firmId: 'F9', type: 'Property & Planning', reason: 'Retained by the landowner group at the Kembla Grange release area' }
  ];

  /* ---- Allocation ledger -------------------------------------------------
     [ id, title, type, winningFirmId, complexity, valueBand, date, valueAUD,
       daysToAllocate, fy, shortlist[], quotedBlendedRates[] (parallel to
       shortlist, AUD/hr), outcome ]
     FY26 = 1 Jul 2025 – 30 Jun 2026.  FY25 = 1 Jul 2024 – 30 Jun 2025.        */
  var LEDGER = [
  ['M-1061','Award interpretation — Dubbo field crew','Employment','F3','Low','$50k–$150k','2024-07-13',108500,4,'FY25',['F6','F1','F9','F3'],[530,515,400,410],'Completed — on budget'],
  ['M-1062','GIPA appeal — Coffs Harbour records','Litigation','F7','Medium','Under $50k','2024-07-20',44000,10,'FY25',['F7','F9','F2','F5'],[525,455,530,500],'Completed — over budget'],
  ['M-1063','Planning appeal — Dubbo town centre LEP','Property & Planning','F7','High','$50k–$150k','2024-07-27',137500,12,'FY25',['F7','F2','F8','F1'],[440,490,500,510],'Completed — on budget'],
  ['M-1064','Head contract dispute — Queanbeyan bypass','Construction','F9','Medium','$150k–$500k','2024-07-22',250000,13,'FY25',['F4','F2','F9','F8'],[715,570,495,620],'Completed — on budget'],
  ['M-1065','Procurement advice — Albury depot upgrade','Commercial','F5','Medium','$150k–$500k','2024-07-02',390000,4,'FY25',['F3','F5','F2','F9'],[455,455,510,430],'In progress'],
  ['M-1066','Enterprise agreement variation — Armidale works depot','Employment','F3','Low','$50k–$150k','2024-08-13',64500,5,'FY25',['F5','F1','F3','F4'],[400,495,435,485],'Completed — over budget'],
  ['M-1067','Debt recovery — Queanbeyan contractor','Litigation','F8','Medium','Under $50k','2024-08-17',48500,9,'FY25',['F2','F3','F9','F8'],[570,490,465,570],'Completed — on budget'],
  ['M-1068','ICT panel contract — Wagga Wagga data centre','Commercial','F3','High','$150k–$500k','2024-08-06',449000,9,'FY25',['F3','F1','F9','F4'],[455,570,450,565],'Completed — on budget'],
  ['M-1069','Probity advice — Singleton tender','Commercial','F3','Medium','$50k–$150k','2024-08-24',141500,9,'FY25',['F5','F4','F3','F1'],[470,550,455,570],'Completed — on budget'],
  ['M-1070','ICT panel contract — Queanbeyan data centre','Commercial','F4','Medium','$500k+','2024-08-25',753000,11,'FY25',['F4','F8','F3','F6'],[535,535,485,580],'Completed — on budget'],
  ['M-1071','LEC proceedings — Wollongong quarry consent','Litigation','F6','High','Under $50k','2024-09-25',30500,12,'FY25',['F5','F9','F6','F8'],[475,455,605,540],'Completed — on budget'],
  ['M-1072','Misconduct investigation — Maitland office','Employment','F5','Low','$150k–$500k','2024-09-11',404000,7,'FY25',['F5','F6','F8','F7'],[390,520,455,450],'Completed — under budget'],
  ['M-1073','LEC proceedings — Cessnock quarry consent','Litigation','F9','Low','Under $50k','2024-09-13',31500,7,'FY25',['F8','F5','F9','F1'],[580,485,470,585],'Completed — on budget'],
  ['M-1074','Misconduct investigation — Gosford office','Employment','F9','Medium','$500k+','2024-09-09',621000,7,'FY25',['F8','F9','F7','F3'],[480,400,425,435],'Completed — on budget'],
  ['M-1075','Grant deed drafting — Orange program','Commercial','F7','Low','Under $50k','2024-10-13',38000,3,'FY25',['F7','F1','F6','F2'],[510,560,575,505],'Completed — over budget'],
  ['M-1076','Debt recovery — Griffith contractor','Litigation','F7','Medium','$50k–$150k','2024-10-26',98500,12,'FY25',['F5','F9','F1','F7'],[465,480,620,515],'Completed — on budget'],
  ['M-1077','Award interpretation — Kempsey field crew','Employment','F9','Medium','$150k–$500k','2024-10-11',371000,5,'FY25',['F2','F8','F9','F4'],[470,470,385,480],'Completed — under budget'],
  ['M-1078','Judicial review — Queanbeyan determination','Litigation','F5','High','Under $50k','2024-10-26',45500,22,'FY25',['F6','F1','F5','F2'],[645,590,475,550],'Completed — over budget'],
  ['M-1079','LEC proceedings — Broken Hill quarry consent','Litigation','F3','Low','$50k–$150k','2024-10-23',127500,4,'FY25',['F4','F2','F9','F3'],[610,555,480,480],'Completed — on budget'],
  ['M-1080','Grant deed drafting — Griffith program','Commercial','F2','High','$500k+','2024-11-19',543000,10,'FY25',['F1','F2','F6','F4'],[565,525,600,555],'Completed — on budget'],
  ['M-1081','LEC proceedings — Armidale quarry consent','Litigation','F7','Medium','$500k+','2024-11-10',664000,8,'FY25',['F6','F2','F7','F9'],[605,560,535,470],'Completed — on budget'],
  ['M-1082','Misconduct investigation — Wagga Wagga office','Employment','F3','Low','$50k–$150k','2024-11-22',54500,2,'FY25',['F4','F2','F1','F3'],[480,480,515,420],'Completed — on budget'],
  ['M-1083','LEC proceedings — Albury quarry consent','Litigation','F3','Low','$500k+','2024-11-21',829000,4,'FY25',['F3','F4','F1','F2'],[495,620,600,525],'Completed — on budget'],
  ['M-1084','Misconduct investigation — Wollongong office','Employment','F3','High','$150k–$500k','2024-11-20',272000,9,'FY25',['F3','F5','F2','F4'],[405,410,445,490],'Completed — on budget'],
  ['M-1085','Design defect claim — Griffith school','Construction','F9','Medium','$150k–$500k','2024-12-27',271000,6,'FY25',['F2','F9','F1','F4'],[595,510,645,720],'Completed — on budget'],
  ['M-1086','Procurement advice — Tamworth depot upgrade','Commercial','F7','Medium','Under $50k','2024-12-11',15500,5,'FY25',['F4','F9','F2','F7'],[565,440,520,470],'Completed — over budget'],
  ['M-1087','Latent conditions dispute — Bathurst tunnel','Construction','F5','Low','Under $50k','2024-12-24',19500,6,'FY25',['F5','F7','F3','F8'],[530,575,520,625],'Completed — on budget'],
  ['M-1088','Compulsory acquisition — Lismore rail underpass','Property & Planning','F3','Low','$150k–$500k','2024-12-23',233000,5,'FY25',['F1','F6','F9','F3'],[530,560,415,445],'Completed — on budget'],
  ['M-1089','Debt recovery — Albury contractor','Litigation','F8','High','Under $50k','2025-01-27',44500,19,'FY25',['F2','F8','F5','F3'],[570,565,480,520],'Completed — on budget'],
  ['M-1090','Compulsory acquisition — Coffs Harbour rail underpass','Property & Planning','F2','Medium','$50k–$150k','2025-01-07',91500,10,'FY25',['F3','F2','F7','F4'],[450,460,445,495],'Completed — on budget'],
  ['M-1091','Design defect claim — Coffs Harbour school','Construction','F5','High','$150k–$500k','2025-01-06',309000,20,'FY25',['F5','F9','F7','F8'],[515,505,575,625],'Completed — under budget'],
  ['M-1092','Licence agreement — Penrith visitor centre','Commercial','F5','Low','Under $50k','2025-01-14',44500,6,'FY25',['F9','F5','F6','F2'],[445,450,590,530],'Completed — under budget'],
  ['M-1093','Enterprise agreement variation — Penrith works depot','Employment','F2','Medium','Under $50k','2025-01-26',22500,7,'FY25',['F9','F6','F4','F2'],[380,510,465,455],'Completed — on budget'],
  ['M-1094','Compulsory acquisition — Penrith rail underpass','Property & Planning','F3','Medium','$50k–$150k','2025-02-13',100500,12,'FY25',['F2','F8','F9','F3'],[460,500,390,450],'In progress'],
  ['M-1095','Rezoning advice — Muswellbrook corridor','Property & Planning','F3','Medium','$50k–$150k','2025-02-15',141000,10,'FY25',['F5','F6','F3','F7'],[425,550,440,435],'In progress'],
  ['M-1096','Security of payment claim — Broken Hill bridge','Construction','F3','Medium','$50k–$150k','2025-02-19',72500,9,'FY25',['F3','F1','F6','F2'],[520,675,655,615],'Completed — on budget'],
  ['M-1097','Redundancy program advice — Wagga Wagga','Employment','F3','Low','$50k–$150k','2025-02-04',57000,4,'FY25',['F8','F5','F3','F2'],[455,410,410,470],'Completed — on budget'],
  ['M-1098','ICT panel contract — Broken Hill data centre','Commercial','F5','Medium','$150k–$500k','2025-02-04',481000,11,'FY25',['F6','F7','F3','F5'],[570,485,455,445],'In progress'],
  ['M-1099','Variation claim — Albury interchange','Construction','F6','Low','Under $50k','2025-03-22',17000,7,'FY25',['F9','F7','F1','F6'],[505,585,650,695],'Completed — on budget'],
  ['M-1100','Award interpretation — Newcastle field crew','Employment','F3','High','$150k–$500k','2025-03-22',220000,12,'FY25',['F3','F7','F8','F6'],[435,430,465,535],'Completed — on budget'],
  ['M-1101','Grant deed drafting — Penrith program','Commercial','F8','Medium','Under $50k','2025-03-02',49000,9,'FY25',['F4','F1','F3','F8'],[545,570,465,540],'In progress'],
  ['M-1102','Class action defence — Newcastle flood levee','Litigation','F9','Low','$50k–$150k','2025-03-08',142500,5,'FY25',['F7','F3','F9','F4'],[525,510,470,625],'Completed — over budget'],
  ['M-1103','Probity advice — Wollongong tender','Commercial','F5','High','$150k–$500k','2025-04-05',388000,22,'FY25',['F5','F9','F4','F3'],[440,450,535,460],'Completed — on budget'],
  ['M-1104','Variation claim — Cessnock interchange upgrade','Construction','F2','Medium','Under $50k','2025-04-13',42500,8,'FY25',['F6','F3','F1','F2'],[655,535,675,600],'Completed — over budget'],
  ['M-1105','Compulsory acquisition — Wollongong rail underpass','Property & Planning','F7','Medium','$50k–$150k','2025-04-20',121500,4,'FY25',['F2','F1','F6','F7'],[490,520,560,435],'Completed — on budget'],
  ['M-1106','Security of payment claim — Queanbeyan bridge','Construction','F2','Low','$50k–$150k','2025-04-24',52500,3,'FY25',['F1','F3','F6','F2'],[640,555,680,595],'In progress'],
  ['M-1107','Work health & safety prosecution — Albury yard','Employment','F3','Medium','$150k–$500k','2025-04-08',372000,5,'FY25',['F4','F1','F7','F3'],[490,510,445,430],'Completed — on budget'],
  ['M-1108','Latent conditions dispute — Parramatta tunnel','Construction','F9','Medium','Under $50k','2025-05-19',37000,13,'FY25',['F8','F9','F2','F6'],[615,500,580,660],'Completed — on budget'],
  ['M-1109','Debt recovery — Coffs Harbour contractor','Litigation','F3','Low','$500k+','2025-05-14',849000,2,'FY25',['F3','F1','F6','F7'],[490,630,650,530],'In progress'],
  ['M-1110','Debt recovery — Orange contractor','Litigation','F9','High','$50k–$150k','2025-05-19',146000,12,'FY25',['F4','F1','F8','F9'],[610,605,580,465],'Completed — on budget'],
  ['M-1111','Crown land dealing — Wollongong reserve','Property & Planning','F5','Medium','$150k–$500k','2025-05-02',449000,4,'FY25',['F4','F5','F3','F9'],[520,405,420,395],'Completed — on budget'],
  ['M-1112','GIPA appeal — Albury records','Litigation','F9','Low','$50k–$150k','2025-05-08',138500,3,'FY25',['F3','F8','F1','F9'],[505,585,620,465],'In progress'],
  ['M-1113','Latent conditions dispute — Armidale tunnel','Construction','F5','High','$50k–$150k','2025-06-16',137000,11,'FY25',['F3','F6','F9','F5'],[535,690,510,520],'Completed — on budget'],
  ['M-1114','Licence agreement — Wagga Wagga visitor centre','Commercial','F1','Low','$50k–$150k','2025-06-07',52500,7,'FY25',['F5','F2','F1','F4'],[470,505,565,550],'Completed — over budget'],
  ['M-1115','Enterprise agreement variation — Muswellbrook works depot','Employment','F5','Medium','$50k–$150k','2025-06-12',65500,11,'FY25',['F5','F6','F1','F7'],[400,545,490,420],'In progress'],
  ['M-1116','Head contract dispute — Goulburn bypass','Construction','F8','Medium','$150k–$500k','2025-06-09',292000,5,'FY25',['F8','F9','F3','F2'],[610,495,565,580],'Completed — on budget'],

    ['M-1001','Award interpretation — Nowra field crew','Employment','F5','Low','$500k+','2025-07-26',712000,7,'FY26',['F5','F4','F6','F3'],[415,485,520,410],'Completed — on budget'],
    ['M-1002','Design defect claim — Tamworth school','Construction','F9','Medium','$500k+','2025-07-14',761000,5,'FY26',['F3','F7','F2','F9'],[535,550,605,520],'Completed — under budget'],
    ['M-1003','Enterprise agreement variation — Dubbo works depot','Employment','F2','Low','$150k–$500k','2025-07-18',319000,6,'FY26',['F2','F1','F7','F9'],[450,505,420,375],'Completed — under budget'],
    ['M-1004','Variation claim — Cessnock interchange','Construction','F2','Medium','Under $50k','2025-07-03',38500,13,'FY26',['F1','F2','F3','F7'],[640,615,555,550],'Completed — on budget'],
    ['M-1005','Design defect claim — Maitland school','Construction','F4','Low','$500k+','2025-07-26',646000,4,'FY26',['F5','F2','F9','F4'],[530,610,485,720],'Completed — over budget'],
    ['M-1006','Enterprise agreement variation — Newcastle works depot','Employment','F5','Medium','$150k–$500k','2025-08-10',481000,7,'FY26',['F5','F4','F9','F7'],[405,475,405,435],'Completed — under budget'],
    ['M-1007','Head contract dispute — Singleton bypass','Construction','F8','Medium','$50k–$150k','2025-08-06',105500,5,'FY26',['F6','F8','F5','F1'],[700,595,540,650],'Completed — over budget'],
    ['M-1008','Misconduct investigation — Queanbeyan office','Employment','F6','High','$150k–$500k','2025-08-19',326000,21,'FY26',['F2','F4','F6','F5'],[460,480,520,410],'In progress'],
    ['M-1009','Rezoning advice — Goulburn corridor','Property & Planning','F5','Medium','$150k–$500k','2025-08-11',294000,10,'FY26',['F3','F5','F2','F1'],[445,420,455,545],'Completed — under budget'],
    ['M-1010','GIPA appeal — Cessnock records','Litigation','F8','Medium','Under $50k','2025-08-06',31500,5,'FY26',['F8','F9','F6','F4'],[570,485,615,620],'Completed — on budget'],
    ['M-1011','Enterprise agreement variation — Tamworth works depot','Employment','F9','Low','$150k–$500k','2025-09-17',170000,7,'FY26',['F4','F1','F9','F6'],[485,535,375,535],'Completed — on budget'],
    ['M-1012','Redundancy program advice — Broken Hill','Employment','F6','Low','$150k–$500k','2025-09-04',217000,2,'FY26',['F6','F4','F9','F1'],[545,475,405,535],'Completed — on budget'],
    ['M-1013','Redundancy program advice — Dubbo','Employment','F5','Medium','Under $50k','2025-09-03',35000,11,'FY26',['F4','F1','F3','F5'],[485,495,430,405],'Completed — on budget'],
    ['M-1014','Redundancy program advice — Goulburn','Employment','F2','Medium','$150k–$500k','2025-09-15',374000,10,'FY26',['F8','F1','F5','F2'],[455,535,415,475],'Completed — on budget'],
    ['M-1015','Rezoning advice — Parramatta corridor','Property & Planning','F2','High','$500k+','2025-09-25',826000,19,'FY26',['F7','F9','F2','F8'],[455,415,460,465],'Completed — under budget'],
    ['M-1016','Easement negotiation — Wagga Wagga substation site','Property & Planning','F2','High','$150k–$500k','2025-10-21',463000,19,'FY26',['F2','F6','F5','F9'],[465,520,405,400],'Completed — on budget'],
    ['M-1017','Security of payment claim — Parramatta bridge','Construction','F5','Low','$50k–$150k','2025-10-05',108000,2,'FY26',['F4','F9','F5','F1'],[695,510,535,660],'Completed — on budget'],
    ['M-1018','Debt recovery — Tamworth contractor','Litigation','F1','High','$50k–$150k','2025-10-09',124500,9,'FY26',['F8','F4','F2','F1'],[585,585,530,625],'Completed — under budget'],
    ['M-1019','Probity advice — Cessnock tender','Commercial','F5','Medium','$150k–$500k','2025-10-07',434000,6,'FY26',['F8','F2','F7','F5'],[550,510,485,470],'In progress'],
    ['M-1020','Grant deed drafting — Tamworth program','Commercial','F7','High','$50k–$150k','2025-10-20',60000,13,'FY26',['F7','F2','F4','F9'],[470,515,570,460],'Completed — on budget'],
    ['M-1021','Easement negotiation — Gosford substation site','Property & Planning','F9','Low','$50k–$150k','2025-11-26',109000,7,'FY26',['F6','F9','F8','F3'],[535,420,495,440],'Completed — on budget'],
    ['M-1022','Compulsory acquisition — Orange rail underpass','Property & Planning','F4','Medium','$50k–$150k','2025-11-02',63000,4,'FY26',['F6','F4','F8','F3'],[540,480,495,430],'Completed — over budget'],
    ['M-1023','Crown land dealing — Albury reserve','Property & Planning','F8','Medium','$50k–$150k','2025-11-13',132000,11,'FY26',['F4','F9','F6','F8'],[480,385,550,460],'Completed — on budget'],
    ['M-1024','Probity advice — Maitland tender','Commercial','F7','Medium','$150k–$500k','2025-11-04',362000,7,'FY26',['F4','F5','F7','F8'],[550,450,485,510],'Completed — under budget'],
    ['M-1025','Judicial review — Singleton determination','Litigation','F9','Medium','$500k+','2025-11-13',640000,11,'FY26',['F9','F5','F2','F8'],[465,465,570,540],'Completed — on budget'],
    ['M-1026','Work health & safety prosecution — Kempsey yard','Employment','F3','Medium','$150k–$500k','2025-12-14',336000,6,'FY26',['F5','F3','F2','F7'],[410,415,455,440],'Completed — on budget'],
    ['M-1027','Planning appeal — Orange town centre LEP','Property & Planning','F9','High','$500k+','2025-12-10',572000,9,'FY26',['F6','F9','F7','F1'],[525,405,465,525],'Completed — over budget'],
    ['M-1028','GIPA appeal — Tamworth records','Litigation','F1','High','$50k–$150k','2025-12-18',126500,16,'FY26',['F3','F2','F9','F1'],[490,555,465,600],'Completed — on budget'],
    ['M-1029','Enterprise agreement variation — Griffith works depot','Employment','F4','High','$50k–$150k','2025-12-20',149000,18,'FY26',['F7','F2','F4','F6'],[425,450,485,540],'Completed — on budget'],
    ['M-1030','Judicial review — Orange determination','Litigation','F8','Medium','Under $50k','2025-12-22',31500,7,'FY26',['F4','F8','F3','F7'],[600,570,485,530],'Completed — on budget'],
    ['M-1031','Planning appeal — Albury town centre LEP','Property & Planning','F7','High','Under $50k','2026-01-24',19500,19,'FY26',['F7','F8','F5','F3'],[440,485,425,440],'Completed — on budget'],
    ['M-1032','Variation claim — Armidale interchange','Construction','F6','Medium','$50k–$150k','2026-01-21',139500,12,'FY26',['F1','F8','F9','F6'],[655,630,510,665],'In progress'],
    ['M-1033','Debt recovery — Muswellbrook contractor','Litigation','F7','Medium','$50k–$150k','2026-01-06',138500,7,'FY26',['F7','F3','F4','F1'],[530,490,595,620],'Completed — on budget'],
    ['M-1034','Class action defence — Parramatta flood levee','Litigation','F6','Medium','$150k–$500k','2026-01-21',427000,13,'FY26',['F9','F4','F6','F8'],[475,575,640,580],'Completed — over budget'],
    ['M-1035','Rezoning advice — Coffs Harbour corridor','Property & Planning','F2','Medium','$500k+','2026-01-13',810000,4,'FY26',['F4','F8','F5','F2'],[495,460,405,470],'Completed — over budget'],
    ['M-1036','Planning appeal — Singleton town centre LEP','Property & Planning','F7','Low','$50k–$150k','2026-02-17',90000,2,'FY26',['F2','F4','F7','F5'],[490,490,435,415],'Completed — under budget'],
    ['M-1037','Procurement advice — Gosford depot upgrade','Commercial','F3','Medium','$50k–$150k','2026-02-19',139000,12,'FY26',['F9','F1','F3','F2'],[455,555,490,520],'Completed — on budget'],
    ['M-1038','Judicial review — Broken Hill determination','Litigation','F7','Medium','$50k–$150k','2026-02-10',81000,11,'FY26',['F9','F3','F8','F7'],[485,515,565,515],'Completed — on budget'],
    ['M-1039','Probity advice — Nowra tender','Commercial','F6','Medium','$50k–$150k','2026-02-17',141000,12,'FY26',['F9','F1','F6','F5'],[430,600,575,465],'Completed — under budget'],
    ['M-1040','Probity advice — Lismore tender','Commercial','F6','Medium','$150k–$500k','2026-02-11',445000,8,'FY26',['F2','F4','F1','F6'],[515,565,575,600],'Completed — on budget'],
    ['M-1041','Design defect claim — Albury school','Construction','F3','Medium','$150k–$500k','2026-03-22',187000,13,'FY26',['F4','F7','F9','F3'],[690,555,520,545],'Completed — on budget'],
    ['M-1042','Security of payment claim — Muswellbrook bridge','Construction','F8','Medium','$150k–$500k','2026-03-06',156000,11,'FY26',['F4','F8','F1','F3'],[690,590,685,525],'Completed — on budget'],
    ['M-1043','Debt recovery — Broken Hill contractor','Litigation','F7','Low','$500k+','2026-03-16',619000,5,'FY26',['F7','F1','F3','F8'],[525,630,505,585],'Completed — on budget'],
    ['M-1044','Redundancy program advice — Penrith','Employment','F7','Medium','$150k–$500k','2026-03-12',183000,5,'FY26',['F7','F2','F1','F6'],[430,475,500,550],'Completed — on budget'],
    ['M-1045','Debt recovery — Wollongong contractor','Litigation','F7','Medium','$150k–$500k','2026-03-07',438000,5,'FY26',['F5','F2','F7','F1'],[475,535,515,590],'Completed — on budget'],
    ['M-1046','Planning appeal — Muswellbrook town centre LEP','Property & Planning','F9','High','$50k–$150k','2026-04-20',104000,18,'FY26',['F9','F1','F8','F4'],[395,520,490,510],'Completed — on budget'],
    ['M-1047','Security of payment claim — Kempsey bridge','Construction','F8','Low','Under $50k','2026-04-22',44500,2,'FY26',['F2','F1','F7','F8'],[590,635,555,600],'In progress'],
    ['M-1048','Design defect claim — Queanbeyan school','Construction','F7','Medium','$50k–$150k','2026-04-18',129000,10,'FY26',['F7','F8','F1','F9'],[570,600,660,510],'Completed — over budget'],
    ['M-1049','Latent conditions dispute — Broken Hill tunnel','Construction','F9','Medium','$50k–$150k','2026-04-14',55000,5,'FY26',['F1','F5','F9','F3'],[655,505,525,530],'Completed — on budget'],
    ['M-1050','Award interpretation — Gosford field crew','Employment','F4','Medium','$150k–$500k','2026-04-20',398000,6,'FY26',['F3','F4','F8','F7'],[415,495,470,445],'Completed — on budget'],
    ['M-1051','Crown land dealing — Singleton reserve','Property & Planning','F5','High','$500k+','2026-05-15',707000,12,'FY26',['F5','F3','F6','F9'],[415,420,525,420],'Completed — on budget'],
    ['M-1052','ICT panel contract — Penrith data centre','Commercial','F1','Medium','$50k–$150k','2026-05-08',64000,4,'FY26',['F3','F1','F9','F2'],[480,565,430,530],'Completed — over budget'],
    ['M-1053','Design defect claim — Muswellbrook school','Construction','F9','Medium','$500k+','2026-05-09',816000,12,'FY26',['F3','F2','F5','F9'],[565,600,535,490],'Completed — under budget'],
    ['M-1054','Licence agreement — Muswellbrook visitor centre','Commercial','F8','High','$50k–$150k','2026-05-11',97000,9,'FY26',['F6','F7','F8','F4'],[615,495,505,555],'Completed — under budget'],
    ['M-1055','Latent conditions dispute — Queanbeyan tunnel','Construction','F2','Medium','Under $50k','2026-05-17',31000,5,'FY26',['F6','F8','F2','F3'],[675,585,595,550],'Completed — under budget'],
    ['M-1056','Probity advice — Orange tender','Commercial','F1','High','$150k–$500k','2026-06-24',418000,9,'FY26',['F6','F9','F1','F4'],[620,440,580,545],'Completed — over budget'],
    ['M-1057','Work health & safety prosecution — Dubbo yard','Employment','F3','High','$150k–$500k','2026-06-17',162000,12,'FY26',['F4','F6','F3','F2'],[485,530,440,465],'In progress'],
    ['M-1058','Grant deed drafting — Singleton program','Commercial','F9','Medium','$50k–$150k','2026-06-20',117500,10,'FY26',['F1','F9','F4','F6'],[555,460,525,580],'Completed — over budget'],
    ['M-1059','Planning appeal — Queanbeyan town centre LEP','Property & Planning','F1','Low','$50k–$150k','2026-06-04',140000,2,'FY26',['F5','F7','F1','F4'],[430,455,535,510],'Completed — on budget'],
    ['M-1060','Enterprise agreement variation — Albury works depot','Employment','F8','High','$150k–$500k','2026-06-10',385000,20,'FY26',['F8','F3','F7','F2'],[460,435,445,465],'Completed — under budget']
  ];

  /* Expand the compact ledger tuples into objects. */
  var MATTERS = LEDGER.map(function (r) {
    var shortlist = r[10];
    var bids = r[11];
    return {
      id: r[0], title: r[1], type: r[2], firmId: r[3], complexity: r[4],
      band: r[5], date: r[6], value: r[7], days: r[8], fy: r[9],
      shortlist: shortlist, bids: bids, outcome: r[12],
      month: r[6].slice(0, 7),
      rate: bids[shortlist.indexOf(r[3])]
    };
  });

  var FISCAL_YEARS = [
    { id: 'FY26', label: 'FY26 (Jul 25 – Jun 26)', start: '2025-07', prior: 'FY25' },
    { id: 'FY25', label: 'FY25 (Jul 24 – Jun 25)', start: '2024-07', prior: null }
  ];

  /* ---- Cross-agency rate benchmarks -------------------------------------
     [ matterType, seniority, thisAgencyRate, crossAgencyMedian, sampleMatters ]
     Delta % is computed at render time, never stored.                        */
  var BENCHMARKS = [
    ['Property & Planning', 'Partner',          620, 585, 210],
    ['Property & Planning', 'Special Counsel',  535, 505, 260],
    ['Property & Planning', 'Senior Associate', 455, 430, 340],
    ['Property & Planning', 'Associate',        390, 372, 300],
    ['Property & Planning', 'Lawyer',           355, 362, 180],
    ['Commercial',          'Partner',          675, 635, 190],
    ['Commercial',          'Special Counsel',  585, 550, 240],
    ['Commercial',          'Senior Associate', 495, 465, 310],
    ['Commercial',          'Associate',        425, 400, 285],
    ['Commercial',          'Lawyer',           370, 350, 165],
    ['Employment',          'Partner',          600, 575, 150],
    ['Employment',          'Special Counsel',  520, 495, 195],
    ['Employment',          'Senior Associate', 440, 420, 275],
    ['Employment',          'Associate',        380, 383, 240],
    ['Employment',          'Lawyer',           355, 360, 145],
    ['Litigation',          'Partner',          700, 650, 165],
    ['Litigation',          'Special Counsel',  620, 580, 205],
    ['Litigation',          'Senior Associate', 530, 495, 260],
    ['Litigation',          'Associate',        450, 420, 215],
    ['Litigation',          'Lawyer',           390, 370, 130],
    ['Construction',        'Partner',          715, 655, 120],
    ['Construction',        'Special Counsel',  640, 590, 155],
    ['Construction',        'Senior Associate', 555, 510, 195],
    ['Construction',        'Associate',        470, 435, 170],
    ['Construction',        'Lawyer',           405, 380,  95]
  ].map(function (r) {
    return { type: r[0], seniority: r[1], agencyRate: r[2], crossRate: r[3], sample: r[4] };
  });

  var CROSS_AGENCY_COUNT = 14;

  /* ---- Recent allocations (FY27 to date) --------------------------------
     New allocations made in the demo are prepended to this list. Because they
     sit in FY27 they never disturb the FY25/FY26 charts.                     */
  var RECENT_SEED = [
    { id: 'M-2001', title: 'Compulsory acquisition — Rouse Hill station precinct', type: 'Property & Planning', firmId: 'F7', complexity: 'High',   band: '$150k–$500k', date: '2026-07-06', requiredBy: '2026-10-30', excluded: ['F9'] },
    { id: 'M-2002', title: 'Probity advice — western fleet tender',                 type: 'Commercial',          firmId: 'F2', complexity: 'Medium', band: '$50k–$150k',  date: '2026-07-14', requiredBy: '2026-09-18', excluded: [] },
    { id: 'M-2003', title: 'Security of payment claim — Nowra bridge',              type: 'Construction',        firmId: 'F9', complexity: 'Medium', band: '$50k–$150k',  date: '2026-07-22', requiredBy: '2026-09-04', excluded: ['F6'] },
    { id: 'M-2004', title: 'Misconduct investigation — Bathurst office',            type: 'Employment',          firmId: 'F3', complexity: 'Low',    band: 'Under $50k',  date: '2026-07-30', requiredBy: '2026-09-11', excluded: [] },
    { id: 'M-2005', title: 'Judicial review — Tamworth determination',              type: 'Litigation',          firmId: 'F8', complexity: 'High',   band: '$150k–$500k', date: '2026-08-04', requiredBy: '2026-11-27', excluded: ['F2'] },
    { id: 'M-2006', title: 'Rezoning advice — Maitland corridor',                   type: 'Property & Planning', firmId: 'F5', complexity: 'Medium', band: '$50k–$150k',  date: '2026-08-11', requiredBy: '2026-10-09', excluded: [] }
  ];

  /* Midpoint value used when a new allocation is created from a value band. */
  var BAND_MIDPOINT = {
    'Under $50k': 32000,
    '$50k–$150k': 100000,
    '$150k–$500k': 325000,
    '$500k+': 690000
  };

  var ABOUT = [
    'PanelFlow starts life as something a government legal team already needs and already buys: a dashboard for its external legal panel. Which firms got what work, what it cost, how long allocation took, how the panel is performing against its own targets. That reporting obligation is real, it is annual, and it is currently met with spreadsheets and a lot of remembering. It is an easy first sale to a single procurement-friendly buyer.',
    'The reporting is the excuse. The moment the allocation decision itself — "which panel firm gets this matter?" — runs through the platform, the product stops being a dashboard and becomes a marketplace. The Allocate a matter screen in this demo is that moment: a matter goes in, the engine ranks the panel on past performance, current capacity, rate against benchmark and conflict status, and a firm comes out. That is market-making, installed under cover of a compliance tool, on a captive and recurring flow of government work.',
    'What accrues is matter-level flow data nobody else holds: what government actually sends out, to whom, at what rate, and with what result — across agencies rather than inside one. The two sides of that market are visible in this demo as the two perspectives. Agencies are buyers with reporting obligations and no idea whether they are paying above market. Panel firms are sellers who currently fly blind on why they win or lose; the Firm view here shows a firm discovering it loses its strongest practice area on price, not performance — a fact it could not have learned from the agency, and could not have assembled itself.',
    'The endgame is that the benchmarks reprice the panel market. Agency-side SaaS lands first because it is a single, procurement-friendly buyer. Firm-side subscriptions follow, because firms will pay to see the demand side. Once enough allocation flow runs through one place, the cross-agency rate curve becomes the reference price, and re-tenders start running on the platform that already holds the evidence. The thing worth validating first is small and unglamorous: that one agency legal operations lead does allocation by memory and spreadsheet today, and would trust a tool to recommend rather than decide.'
  ];

  return {
    AGENCY: AGENCY,
    FIRMS: FIRMS,
    FIRM_VIEW_ID: FIRM_VIEW_ID,
    MATTER_TYPES: MATTER_TYPES,
    COMPLEXITIES: COMPLEXITIES,
    VALUE_BANDS: VALUE_BANDS,
    SENIORITIES: SENIORITIES,
    PERFORMANCE: PERFORMANCE,
    CONFLICTS: CONFLICTS,
    MATTERS: MATTERS,
    FISCAL_YEARS: FISCAL_YEARS,
    BENCHMARKS: BENCHMARKS,
    CROSS_AGENCY_COUNT: CROSS_AGENCY_COUNT,
    RECENT_SEED: RECENT_SEED,
    BAND_MIDPOINT: BAND_MIDPOINT,
    ABOUT: ABOUT
  };
})();
