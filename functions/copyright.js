// GET /copyright — real, crawlable page (copy lives in functions/legal/_content.js)
import { renderLegal } from './legal/_render.js';
export const onRequestGet = ({ request }) => renderLegal('copyright', request);
