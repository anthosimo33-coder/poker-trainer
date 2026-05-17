import type { LessonBookContent } from "../types";

import chapter_01 from "./chapters/01-deroulement-main.json";
import chapter_02 from "./chapters/02-positions.json";
import chapter_03 from "./chapters/03-actions.json";
import chapter_04 from "./chapters/04-blinds-antes.json";
import chapter_05 from "./chapters/05-classement-mains.json";
import chapter_06 from "./chapters/06-tirages.json";
import chapter_07 from "./chapters/07-textures-board.json";
import chapter_08 from "./chapters/08-streets.json";
import chapter_09 from "./chapters/09-types-tournois.json";
import chapter_10 from "./chapters/10-structure-mtt.json";
import chapter_11 from "./chapters/11-itm-payouts.json";
import chapter_12 from "./chapters/12-vocabulaire-table.json";

import cards from "./cards.json";

const content: LessonBookContent = {
  bookSlug: "mecaniques",
  chapters: [
    chapter_01, chapter_02, chapter_03, chapter_04,
    chapter_05, chapter_06, chapter_07, chapter_08,
    chapter_09, chapter_10, chapter_11, chapter_12,
  ],
  cards,
};

export default content;
