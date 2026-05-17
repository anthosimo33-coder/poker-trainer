export interface LessonChapter {
  slug: string;
  name: string;
  contentMd: string;
  orderIndex: number;
}

export interface LessonCard {
  slug: string;
  term: string;
  shortDef: string;
  fullContentMd: string;
  relatedCardSlugs: string[];
  searchKeywords: string;
}

export interface LessonBookContent {
  bookSlug: string;
  chapters: LessonChapter[];
  cards: LessonCard[];
}
