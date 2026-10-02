// Editorial refinements sit after the original interaction styles so the
// portable document retains its controls, print support and responsive layout.
export const editorialStyles = `
body{font-size:16px;line-height:1.75;font-weight:450}
.wrap{max-width:1240px;padding-top:40px}
.panel{padding:clamp(24px,4vw,46px);border-radius:22px}
header .brand,.eyebrow{font-size:12px;letter-spacing:.13em;font-weight:650}
.cover p{font-size:18px}.cover .fine{font-size:14px;line-height:1.8;color:#d8e0d1}
.fine,.privacy-note,footer{font-size:14px;line-height:1.8}
h2{font-size:clamp(38px,4.7vw,58px);line-height:1.08;margin-bottom:22px}
h3{font-size:clamp(30px,3vw,39px);line-height:1.15}
.quicklinks{display:block;margin-bottom:40px;border:1px solid var(--line);border-radius:20px;padding:26px 30px;background:#fffdf7;font-size:15px}
.quicklinks h2{font-size:35px;margin:8px 0 20px}
.quicklinks ol{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 30px;list-style:none;padding:0;margin:0;counter-reset:chapter}
.quicklinks li{counter-increment:chapter}
.quicklinks a{display:flex;align-items:baseline;gap:12px;padding:9px 0;line-height:1.4;border-color:var(--line)}
.quicklinks a:before{content:counter(chapter,decimal-leading-zero);font-size:12px;font-weight:700;color:var(--gold);flex:none}
section[id],details[id],.food[id],#meals{scroll-margin-top:100px}
.assessment p{font-size:16px;line-height:1.85}.assessment .fine,.assessment .figure-description{font-size:14px}
.assessment h3{font-size:clamp(30px,3vw,38px);margin:0 0 16px}
.assessment-overview{max-width:850px;margin:28px 0 38px;padding:24px 28px;border-left:3px solid #b69a58;background:#f3f3e9;border-radius:0 14px 14px 0}
.assessment-overview h3{font-size:29px}.assessment-overview p:last-child{margin-bottom:0}
.patient-figures{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}
.patient-figure{margin:0;padding:24px;background:white;border:1px solid var(--line);border-radius:16px;min-width:0}
.patient-figure--composition,.patient-figure--bmi{grid-column:1/-1}
.patient-figure figcaption{margin-bottom:24px}.patient-figure h3{margin:8px 0 0}
.patient-chart svg{display:block;width:100%;height:auto;max-height:580px;margin:0 auto 22px}.visual-compact{display:none}
.patient-figure .figure-description{margin:14px 0 8px;line-height:1.8}
.patient-figure .fine{margin-top:10px}
.clinical-metrics{margin:16px 0;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
.clinical-metrics span{font-size:14px}.clinical-metrics strong{font-size:35px}.clinical-metrics small{font-size:13px}.clinical-metrics p{font-size:13px;line-height:1.65}
.clinical-context{margin:35px 0;padding:24px;border-radius:14px;background:#eef2e8}
.bristol-context{display:flex;gap:25px;align-items:flex-start}
.bristol-type{flex:none;width:76px;height:76px;display:grid;place-items:center;border-radius:50%;background:var(--forest);color:white;font:500 50px Editorial,Georgia,serif}
.bristol-context h3{margin:5px 0 16px}.bristol-context .eyebrow{margin-top:0}
.individual-targets{margin-top:38px}.target-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:22px 0}
.target-grid article{padding:20px;border-radius:12px;background:#eef2e8;border:1px solid var(--line)}
.target-grid span{display:block;font-size:14px}.target-grid strong{display:block;font:500 35px Editorial,Georgia,serif;line-height:1.2;margin:10px 0}
.target-grid small{font:13px Body,Arial,sans-serif}.target-grid p{font-size:13px;line-height:1.7;margin:10px 0 0}
.calculation-details{margin-top:38px;padding-top:28px}
.technical-section{margin-top:16px;border:1px solid var(--line);border-radius:12px;background:#fffdf8;overflow:hidden;break-inside:auto}
.technical-section>summary{padding:18px 22px;font-size:16px;font-weight:650;cursor:pointer;line-height:1.5}
.technical-section[open]>summary{border-bottom:1px solid var(--line);background:#eff2e8}
.technical-section>div{padding:8px 22px 18px}
.technical-section>div>p{font-size:14px;line-height:1.9;padding:14px 0;margin:0;overflow-wrap:anywhere;border-bottom:1px solid #e5e9de}
.technical-section>div>p:last-child{border-bottom:0}
.assessment section{break-inside:auto}.assessment .patient-figure,.target-grid article{break-inside:avoid}
.intro{grid-template-columns:1.15fr 1fr;gap:24px;margin-top:40px;margin-bottom:40px}.intro h2{font-size:40px}
label[for=checkdate],.complete,.water button,.diary label,.shopping-toolbar label,.pager{font-size:14px}
.water strong{font-size:32px}.water progress{height:10px}.progress{height:10px}
.week-overview{margin:40px 0}.week-overview h3{font-size:31px;margin:28px 0 20px}
.week-averages{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:32px}
.week-averages article{border-top:2px solid #b69a58;padding:15px 0;background:transparent}
.week-averages span{font-size:13px;display:block}.week-averages strong{font:500 33px Editorial,Georgia,serif;display:block;white-space:nowrap;margin-top:7px}
.week-averages small{font:12px Body,Arial,sans-serif}
.week-chart{background:#f1f3e9;border-radius:15px;padding:25px}.week-chart-row{display:grid;grid-template-columns:minmax(95px,.65fr) 2fr auto;gap:16px;align-items:center;margin:16px 0;font-size:14px}
.week-chart-row a{text-underline-offset:5px}.week-chart-row strong{font-size:14px;font-weight:650;min-width:105px;text-align:right}
.week-track{height:16px;background:#dce4d5;border-radius:8px;overflow:hidden}.week-track i{height:100%;display:block;background:var(--forest);border-radius:8px}
.week-chart .fine{margin:24px 0 0}.table-scroll{overflow:auto;max-width:100%;scrollbar-width:thin}.week-table{border-collapse:collapse;width:100%;font-size:14px;min-width:650px}
.week-table caption{font-size:14px;text-align:left;padding:16px 0;color:#496b56}.week-table th,.week-table td{padding:15px 12px;text-align:right;border-bottom:1px solid var(--line)}
.week-table th:first-child{text-align:left}.week-table thead th{font-size:13px;vertical-align:bottom}.week-table small{display:block;font-size:11px;font-weight:450;color:#496b56}
.day-heading{margin:36px 0 28px}.stats{gap:24px;min-width:470px}.stats strong{font-size:31px}.stats span{font-size:12px}
.tabs button{font-size:14px;padding:12px 17px}.meal{padding:30px;border-radius:22px;margin:24px 0}.meal-top{margin-bottom:26px}.meal-top h3{font-size:35px}.time{font-size:14px}.meal-kcal{font-size:13px;margin-top:10px}
.foods{grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:24px}.food strong{font-size:16px;line-height:1.55;margin-top:15px}.food p{font-size:17px}
.food small{font-size:13px;line-height:1.7}.food details{font-size:14px}.food summary{padding:10px 0}.food-options legend{font-size:13px}
.food-options label{grid-template-columns:20px 58px 1fr;gap:9px;padding:10px 6px;font-size:13px}.food-options input{width:18px;height:18px}.swap-image{width:58px}.food-options small{font-size:12px}.note{font-size:15px;line-height:1.8}
.mass-guide{gap:22px}.mass-guide strong{font-size:15px}.mass-guide ul{font-size:13px;line-height:1.8}.macro-guide span{font-size:14px}.macro-guide small{font-size:12px}.macro-track{height:10px}.plate-targets span{font-size:12px;padding:5px 8px}
.alternatives-guide{margin:40px 0}.swap-group{margin-top:18px;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.swap-group>summary{padding:19px 22px;cursor:pointer;font-size:16px;font-weight:650;line-height:1.6}.swap-group>summary small{display:block;font-size:13px;font-weight:450;color:#496b56;margin-left:19px}
.swap-group[open]>summary{background:#eff2e8;border-bottom:1px solid var(--line)}.swap-group>div{padding:24px}.swap-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:22px}
.swap-gallery .food-image{aspect-ratio:4/3;max-height:190px;margin-bottom:16px}.swap-gallery .eyebrow{font-size:10px}.swap-gallery h4{font-size:16px;line-height:1.5;margin:8px 0}.swap-gallery p{font-size:14px;line-height:1.8}.swap-gallery .fine{font-size:12px}
.swap-occurrences{display:flex;flex-wrap:wrap;gap:8px 15px;font-size:13px}.swap-occurrences a{padding:6px 10px;background:#eef2e8;border-radius:6px;text-underline-offset:3px}
h1,.food,.swap-occurrences a,.week-chart-row a,.cover p,#guidance p{overflow-wrap:anywhere}.swap-occurrences a{max-width:100%}.week-chart-row a{min-width:0}
.shopping label{font-size:15px}.shopping small,.shopping .shopping-group{font-size:13px}.curated p{font-size:16px}.curated-photo{width:240px;height:190px}
details.panel>summary{font-size:40px}.diary{margin-top:40px}.backup h3{font-size:35px}.photo-credits{font-size:13px}
@media(max-width:1000px){.stats{min-width:0}.patient-figures{grid-template-columns:1fr}.patient-figure--composition,.patient-figure--bmi{grid-column:auto}.foods{grid-template-columns:repeat(3,minmax(0,1fr))}.target-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.intro{grid-template-columns:1fr}.quicklinks ol{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){.wrap{padding:25px 16px}.panel{padding:24px 19px}.quicklinks{padding:22px}.quicklinks ol{grid-template-columns:1fr;gap:4px}.quicklinks h2{font-size:33px}.cover p{font-size:16px}.cover .fine{font-size:13px}.assessment-overview{padding:20px}.patient-figure{padding:17px}.patient-figure>svg{min-height:0;margin-bottom:12px}.patient-figure h3{font-size:29px}.patient-figure .figure-description,.patient-figure .fine{font-size:13px}.bristol-context{gap:16px;padding:20px 15px}.bristol-type{width:48px;height:48px;font-size:34px}.bristol-context h3{font-size:27px}.target-grid{gap:10px}.target-grid article{padding:15px}.target-grid strong{font-size:30px}.target-grid small{display:block;margin-top:4px}.technical-section>summary{padding:16px}.technical-section>div{padding:6px 16px 16px}.week-averages{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.week-averages strong{font-size:29px}.week-chart{padding:18px 15px}.week-chart-row{grid-template-columns:1fr auto;gap:6px 12px;margin:20px 0}.week-track{grid-row:2;grid-column:1/-1;height:13px}.week-chart-row strong{min-width:0;font-size:13px}.week-chart-row a{font-size:14px}.meal{padding:23px 18px}.meal-top h3{font-size:31px}.complete{font-size:13px;max-width:100px}.foods{grid-template-columns:repeat(2,minmax(0,1fr));gap:25px 16px}.food strong{font-size:15px}.food small{font-size:12px}.food-options label{grid-template-columns:18px 1fr}.food-options .swap-image{display:none}.food-options span{grid-column:2}.mass-guide{gap:15px}.mass-guide strong{font-size:14px}.mass-guide ul{font-size:12px}.stats strong{font-size:29px}.stats span{font-size:11px}.tabs button{font-size:14px}.swap-group>summary{padding:16px}.swap-group>div{padding:18px}.swap-gallery{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 14px}.swap-gallery h4{font-size:15px}.swap-gallery p{font-size:13px}.curated-photo{width:100%;height:210px;float:none;margin:0 0 20px}.pager button{font-size:13px}.intro h2{font-size:36px}}
@media(max-width:390px){.target-grid{grid-template-columns:1fr}.week-averages{grid-template-columns:repeat(2,minmax(0,1fr))}.foods{gap:22px 12px}.food strong{font-size:14px}.food small{font-size:12px}.bristol-context{display:block}.bristol-type{margin-bottom:15px}.clinical-metrics{grid-template-columns:1fr}}
@media(max-width:650px){.week-averages strong{white-space:normal;overflow-wrap:anywhere}.week-averages small{display:block;margin-top:3px}.stats{grid-template-columns:repeat(auto-fit,minmax(115px,1fr))}.stats strong{overflow-wrap:anywhere}}
@media(max-width:650px){.visual-wide:not(.visual-only){display:none}.visual-compact{display:block}.patient-chart svg{max-height:none;min-height:0;margin-bottom:12px}}
@media print{body{font-size:11pt;font-weight:450}.wrap{max-width:none}.panel{padding:20px;border-radius:0;margin-top:20px}.quicklinks{display:block!important;font-size:10pt;break-inside:avoid}.quicklinks ol{grid-template-columns:repeat(3,1fr)}.quicklinks h2{font-size:27pt}.quicklinks li:nth-last-child(-n+2){display:none}.cover p,.cover .fine{color:var(--forest)}h2{font-size:31pt}h3,.assessment h3{font-size:25pt}.assessment p{font-size:11pt}.fine,.assessment .fine,.privacy-note{font-size:9pt}.patient-figures{display:block}.patient-figure{margin:20px 0;break-inside:avoid;padding:20px}.patient-figure>svg{max-height:320px}.patient-figure--bmi>svg{max-height:380px}.target-grid{grid-template-columns:repeat(3,1fr)}.technical-section,.swap-group{break-inside:auto}.technical-section>summary,.swap-group>summary{font-size:11pt}.technical-section>div,.swap-group>div{display:block!important}.technical-section>div>p{font-size:10pt;break-inside:avoid}.table-scroll{overflow:visible}.week-table{min-width:0;font-size:9pt}.week-averages{grid-template-columns:repeat(5,1fr)}.week-chart-row{grid-template-columns:1fr 2fr auto;break-inside:avoid}.week-track{grid-column:auto;grid-row:auto}.week-averages strong{font-size:23pt}.stats{min-width:0;grid-template-columns:repeat(5,1fr)}.stats strong{font-size:20pt}.stats span{font-size:9pt}.meal{padding:18px}.meal-top h3{font-size:25pt}.foods{grid-template-columns:repeat(3,minmax(0,1fr))}.food strong{font-size:11pt}.food p{font-size:11pt}.food small,.mass-guide ul,.macro-guide span{font-size:9pt}.food-options label{font-size:9pt}.swap-gallery{grid-template-columns:repeat(3,1fr)}.swap-gallery article{break-inside:avoid}.swap-gallery .food-image{max-height:110px}.swap-gallery h4,.swap-gallery p{font-size:10pt}.swap-occurrences{font-size:9pt}.week-overview,.alternatives-guide,.calculation-details{break-before:page}.clinical-metrics article{break-inside:avoid}.curated p{font-size:11pt}.shopping label{font-size:11pt}.shopping small{font-size:9pt}}
@media print{.visual-wide{display:block!important}.visual-compact{display:none!important}.patient-chart svg{max-height:320px}.patient-figure--bmi .patient-chart svg{max-height:380px}}
`;
