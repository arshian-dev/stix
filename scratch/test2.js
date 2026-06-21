import Prism from 'prismjs';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-markdown.js';

const md = "```js\nconst x = 1;\n```";
console.log(Prism.highlight(md, Prism.languages.markdown, 'markdown'));
