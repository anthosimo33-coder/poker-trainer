import type { LessonBookContent } from "../types";

import chapter_01 from "./chapters/01-langage-table.json";
import chapter_02 from "./chapters/02-notation-mains.json";

import cards from "./cards.json";

const content: LessonBookContent = {
  bookSlug: "lexique",
  chapters: [chapter_01, chapter_02],
  cards,
};

export default content;
