import type { LessonBookContent } from "../types";

import chapter_01 from "./chapters/01-hand-selection.json";
import chapter_02 from "./chapters/02-position-comme-actif.json";
import chapter_03 from "./chapters/03-agressivite-controlee.json";
import chapter_04 from "./chapters/04-spr.json";
import chapter_05 from "./chapters/05-m-ratio.json";
import chapter_06 from "./chapters/06-notion-de-range.json";
import chapter_07 from "./chapters/07-profil-adverse.json";
import chapter_08 from "./chapters/08-bulle-mtt.json";
import chapter_09 from "./chapters/09-mecanique-vers-strategie.json";

import cards from "./cards.json";

const content: LessonBookContent = {
  bookSlug: "strategie",
  chapters: [
    chapter_01, chapter_02, chapter_03, chapter_04, chapter_05,
    chapter_06, chapter_07, chapter_08, chapter_09,
  ],
  cards,
};

export default content;
