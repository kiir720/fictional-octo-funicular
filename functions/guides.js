// GET /guides — index of the written guides.
import { renderIndex } from './guides/_render.js';
export const onRequestGet = ({ request }) => renderIndex(request);
