import { useEffect, useState, type CSSProperties } from 'react'
import { FlashcardArray } from "react-quizlet-flashcard";
import { ClimbingBoxLoader } from "react-spinners";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'
import './App.css'
import { callGemini } from './GeminiAPI';

function render(title: string, content: string, englishClause: string = "", vietnameseClause: string = "", pronunciation: string = "") {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "20px",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <h3
        style={{
          marginBottom: "16px",
          fontWeight: "bold",
          fontSize: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: "16px", margin: 0, lineHeight: "1" }}>{content}</p>
      {pronunciation.length !== 0 && (
        <p
          style={{
            fontSize: "15px",
            marginTop: "5px",
            color: "#333",
            lineHeight: "1"
          }}
        >
          /{pronunciation}/
        </p>
      )}
      {englishClause.length !== 0 && vietnameseClause.length !== 0 && (
        <>
          <p
            style={{
              fontSize: "18px",
              marginTop: "50px",
              marginBottom: "0px",
              color: "#333",
              lineHeight: "1"
            }}
          >
            {englishClause}
          </p>
          <p
            style={{
              fontSize: "12px",
              marginTop: "5px",
              color: "#333",
              lineHeight: "1"
            }}
          >
            /{vietnameseClause}/
          </p>
        </>
      )}
    </div>
  );
}

type Word = {
  english: string;
  description: string;
  tag: string;
  week: string;
};

function parseDocContent(content: string, weekFilter: string): { words: Word[]; weeks: string[] } {
  const lines = content.split('\n');
  const words: Word[] = [];
  const weekSet = new Set<string>();

  let currentTag = "";
  let currentWeek = "";
  for (let line of lines) {
    line = line.trim();

    if (!line) continue;
    else if (/^_+$/.test(line)) continue;
    else if (line.startsWith('Week')) {
      currentWeek = line.trim();
      weekSet.add(currentWeek);
      continue;
    }
    else if (weekFilter != "All" && currentWeek != weekFilter) {
      continue;
    }
    else if (line.startsWith('*')) {
      const vocabLine = line.slice(1).trim();
      const colonIndex = vocabLine.indexOf(':');
      if (colonIndex !== -1) {
        const english = vocabLine.slice(0, colonIndex).trim();
        const description = vocabLine.slice(colonIndex + 1).trim();
        words.push({
          english,
          description,
          tag: currentTag,
          week: currentWeek
        });
      }
      continue;
    } else {
      currentTag = line.trim();
      continue;
    }
  }

  return {
    words,
    weeks: Array.from(weekSet)
  };
}

function wordsToCards(words: Word[]) {
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((word, index) => ({
    id: index + 1,
    frontHTML: render(word.tag, word.english),
    backHTML: render(word.tag, word.description.charAt(0).toUpperCase() + word.description.slice(1)),
    key: word.english,
    tag: word.tag,
    description: word.description.charAt(0).toUpperCase() + word.description.slice(1)
  }));
}

const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  borderColor: "#000000",
};

function App() {
  const docId = "1cba4NFq-IbZNaNnMw0WQDern05x3rD0wwhIYTEPlk48";
  const [cards, setCards] = useState<any[]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('All');

  const loadData = (weekFilter: string) => {
    const url = `https://docs.google.com/document/d/${docId}/export?format=txt`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch document");
        return res.text();
      })
      .then((text) => {
        const { words, weeks } = parseDocContent(text, weekFilter);
        const cardData = wordsToCards(words);
        setCards(cardData);
        setWeeks(['All', ...weeks]);
      })
      .catch((err) => console.log(err.message));
  };


  useEffect(() => {
    loadData(selectedWeek);
  }, [docId]);

  useEffect(() => {
    loadData(selectedWeek);
  }, [selectedWeek]);

  const handleCardFlip = async (id: number | string, index: number) => {
    const card = cards[index];
    const message = "Give me the pronunciation and a short sentence example how to use the English word: " + card.key +
      " only reply me with the format, don't say any more thing: <pronunciation>/<English sentence>/<translated to Vietnamese sentence>/"
    try {
      const response = await callGemini(message);
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log("Response: " + text);

      const parts = text
        .split('/')
        .map((part: string) => part.trim())
        .filter((part: string) => part !== '');

      const pronunciation = parts[0] || '';
      const englishClause = parts[1] || '';
      const vietnameseClause = parts[2] || '';
      setCards(prevCards =>
        prevCards.map(card =>
          card.id === id ? { ...card, backHTML: render(card.tag, card.description, englishClause, vietnameseClause, pronunciation) } : card
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  if (cards.length === 0) {
    return (
      <div className="sweet-loading">
        <ClimbingBoxLoader
          color={'#000000'}
          loading={true}
          cssOverride={override}
          size={15}
          aria-label="Loading Spinner"
          data-testid="loader"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-center my-4">
        <Listbox value={selectedWeek} onChange={(value) => {
          setSelectedWeek(value);
          loadData(value);
        }}>
          <div className="relative w-full">
            <ListboxButton className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400">
              {selectedWeek}
            </ListboxButton>

            <ListboxOptions
              anchor="top"
              className="absolute z-10 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5"
            >
              {weeks.map((week) => (
                <ListboxOption
                  key={week}
                  value={week}
                  className="cursor-pointer select-none py-2 pl-10 pr-4 data-[focus]:bg-blue-100 data-[focus]:text-blue-900 text-gray-900"
                >
                  {week}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        </Listbox>
      </div>
      <FlashcardArray cards={cards} onCardFlip={handleCardFlip} />
    </div>
  );
}

export default App
