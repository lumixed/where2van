import { create } from "zustand";
import { persist } from "zustand/middleware";
import { pushPeople } from "./remote";
import type { PersonId } from "./types";

/** One of the two of us: a name, and optionally a face for each score. */
export interface Person {
  name: string;
  /** Photo paths for 1 to 5 stars, in that order; null where none is set. */
  faces: (string | null)[];
}

export type People = Record<PersonId, Person>;

export const PERSON_IDS: PersonId[] = ["a", "b"];
const SCORES = 5;

const DEFAULTS: People = {
  a: { name: "Person 1", faces: Array(SCORES).fill(null) },
  b: { name: "Person 2", faces: Array(SCORES).fill(null) },
};

/** Fills the gaps in whatever the database holds, which starts out empty. */
export function completePeople(saved: unknown): People {
  const from = (saved ?? {}) as Partial<Record<PersonId, Partial<Person>>>;
  const person = (id: PersonId): Person => ({
    name: from[id]?.name?.trim() || DEFAULTS[id].name,
    faces: Array.from({ length: SCORES }, (_, i) => from[id]?.faces?.[i] ?? null),
  });
  return { a: person("a"), b: person("b") };
}

interface PeopleState {
  /** Which of us this phone or computer belongs to. Stays on the device. */
  me: PersonId | null;
  /** Names and faces, shared between both of us. */
  people: People;
  setMe: (me: PersonId) => void;
  rename: (id: PersonId, name: string) => void;
  /** Sets or clears the face for a score (1 to 5). */
  setFace: (id: PersonId, score: number, path: string | null) => void;
  /** A change arriving from the shared database; not sent back. */
  replaceFromRemote: (people: People) => void;
}

export const usePeople = create<PeopleState>()(
  persist(
    (set, get) => {
      const share = (people: People) => {
        set({ people });
        pushPeople(people);
      };
      return {
        me: null,
        people: DEFAULTS,
        setMe: (me) => set({ me }),
        rename: (id, name) => {
          const { people } = get();
          share({ ...people, [id]: { ...people[id], name: name.trim() || DEFAULTS[id].name } });
        },
        setFace: (id, score, path) => {
          const { people } = get();
          const faces = people[id].faces.map((face, i) => (i === score - 1 ? path : face));
          share({ ...people, [id]: { ...people[id], faces } });
        },
        replaceFromRemote: (people) => set({ people }),
      };
    },
    { name: "where2van:people" },
  ),
);
