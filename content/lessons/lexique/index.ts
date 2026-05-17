import type { LessonBookContent } from "../types";

import chapter_01 from "./chapters/01-langage-table.json";
import chapter_02 from "./chapters/02-notation-mains.json";
import chapter_03 from "./chapters/03-notation-ranges.json";
import chapter_04 from "./chapters/04-mental-meta-bankroll.json";

import cards from "./cards.json";

const content: LessonBookContent = {
  bookSlug: "lexique",
  chapters: [chapter_01, chapter_02, chapter_03, chapter_04],
  cards,
};

export default content;
