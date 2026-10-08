/**
 * The Home greeting in many languages. It starts in English and the page rotates through the rest by itself.
 * Pure data and one small function, so they can be tried out on their own.
 */

export type DayPart = "morning" | "afternoon" | "evening"

export interface GreetingLanguage {
  /** The language tag, so the browser picks the right letter shapes (Chinese and Japanese share many) and screen readers can pronounce it. */
  lang: string
  morning: string
  afternoon: string
  evening: string
}

/** Where in the day an hour (0 to 23) falls. */
export function dayPartFor(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return "morning"
  if (hour >= 12 && hour < 18) return "afternoon"
  return "evening"
}

/** English first, then the rest in the order they rotate. */
export const GREETING_LANGUAGES: readonly GreetingLanguage[] = [
  { lang: "en", morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" },
  { lang: "id", morning: "Selamat pagi", afternoon: "Selamat siang", evening: "Selamat malam" },
  { lang: "zh", morning: "早上好", afternoon: "下午好", evening: "晚上好" },
  { lang: "ko", morning: "좋은 아침이에요", afternoon: "좋은 오후예요", evening: "좋은 저녁이에요" },
  { lang: "ja", morning: "おはようございます", afternoon: "こんにちは", evening: "こんばんは" },
  { lang: "jv", morning: "Sugeng enjing", afternoon: "Sugeng siang", evening: "Sugeng sonten" },
  { lang: "es", morning: "Buenos días", afternoon: "Buenas tardes", evening: "Buenas noches" },
  { lang: "fr", morning: "Bonjour", afternoon: "Bon après-midi", evening: "Bonsoir" },
  { lang: "de", morning: "Guten Morgen", afternoon: "Guten Tag", evening: "Guten Abend" },
  { lang: "hi", morning: "सुप्रभात", afternoon: "नमस्कार", evening: "शुभ संध्या" },
  { lang: "pt", morning: "Bom dia", afternoon: "Boa tarde", evening: "Boa noite" },
  { lang: "it", morning: "Buongiorno", afternoon: "Buon pomeriggio", evening: "Buonasera" },
  { lang: "nl", morning: "Goedemorgen", afternoon: "Goedemiddag", evening: "Goedenavond" },
  { lang: "ru", morning: "Доброе утро", afternoon: "Добрый день", evening: "Добрый вечер" },
  { lang: "tr", morning: "Günaydın", afternoon: "İyi günler", evening: "İyi akşamlar" },
  { lang: "th", morning: "สวัสดีตอนเช้า", afternoon: "สวัสดีตอนบ่าย", evening: "สวัสดีตอนเย็น" },
  { lang: "vi", morning: "Chào buổi sáng", afternoon: "Chào buổi chiều", evening: "Chào buổi tối" },
  { lang: "tl", morning: "Magandang umaga", afternoon: "Magandang hapon", evening: "Magandang gabi" },
  { lang: "ms", morning: "Selamat pagi", afternoon: "Selamat tengah hari", evening: "Selamat petang" },
  { lang: "el", morning: "Καλημέρα", afternoon: "Καλό απόγευμα", evening: "Καλησπέρα" },
]

/** The greeting for a part of the day in the language at `index` (counting round from the start). */
export function greetingAt(index: number, part: DayPart): { lang: string; text: string } {
  const count = GREETING_LANGUAGES.length
  const language = GREETING_LANGUAGES[((index % count) + count) % count]
  return { lang: language.lang, text: language[part] }
}
