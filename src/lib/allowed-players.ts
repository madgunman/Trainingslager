import { normalizeNameKey } from "./seed";

/** Canonical full names accepted at player login (invite code still required). */
export const ALLOWED_PLAYERS = [
  "Steffen Mengel",
  "Marcos Freitas",
  "Kay Stumper",
  "Ovidiu Ionescu",
  "Yi-En Yeh",
  "Erik Schreyer",
  "Ivo Quett",
  "Nico Müller",
  "Kyrylo Samokysh",
  "Chris Albrecht",
  "Kaito Ishida",
  "Sandijs Vasiljevs",
  "Marius Marth",
  "Christian Reim",
  "Toby Kölling",
  "Thilo Merrbach",
  "Simon Stützer",
  "Lion Cooper Schlagenhoff",
  "Kay Launert",
  "Lucie Masopustova",
  "Artur Rietz",
  "Carlos Lang",
  "Johannes Döllmann",
  "Robert Eckardt",
  "Lilian Nicodemus",
  "Niklas Halbeisen",
  "Max Bodewald",
  "Oliver Wieland",
  "Tobias Müller",
  "Volker Porzelt",
  "Silvio Ulbrich",
  "Stephan Altrichter",
  "Maximilian Brüning",
  "Anja Sachse",
  "Henri Frederik Boelecke",
  "Georg Bratfisch",
  "Sandra Schröter",
  "Thomas Martin",
  "Uwe König",
  "Thomas Stecher",
  "Siegmar Böttcher",
  "Torsten Müller",
  "Janosch Kirchner",
  "Magnus Strecker",
  "Lutz Lindau",
  "Etienne Zierdt",
  "Tom Wedel",
  "Jörg Schmidt",
  "Daniel Kett",
  "Vladimir Bogomolov",
  "Christopher Mock",
  "Achim Simon",
  "Ingolf Lindner",
  "Jörg Stade",
  "Christian Kämmer",
  "Heino Lehmann",
  "Reinhard Rother",
  "Annika Fischer",
  "Elina Vakhrusheva",
  "Denise Husung",
  "Margarita Tischenko",
  "Juliane Elgert",
  "Martha Heinrich",
] as const;

const allowedByKey = new Map(
  ALLOWED_PLAYERS.map((name) => [normalizeNameKey(name), name]),
);

/** Returns the canonical display name if first + last match an allowed player. */
export function findAllowedPlayer(firstName: string, lastName: string) {
  const full = `${firstName.trim()} ${lastName.trim()}`.trim();
  if (!full) return null;
  return allowedByKey.get(normalizeNameKey(full)) ?? null;
}
