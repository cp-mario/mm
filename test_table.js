import { mmxToHtml } from './scripts/parser.js';

const samples = {
  default: `#table
Name|Score
Alice|95
Bob|87
#endtable`,

  vmode: `#table v
Name|Score
Alice|95
Bob|87
#endtable`,

  hmode: `#table h
Name|Score
Alice|95
Bob|87
#endtable`,

  bmode: `#table b
          Nombre|Puntaje
Rendimiento ayer|Alice|95
#endtable`,
};

for (const [k, v] of Object.entries(samples)) {
  console.log('\n---', k, '---');
  console.log(mmxToHtml(v));
}
