import { useEffect, useState, type CSSProperties } from 'react'
import { FlashcardArray } from "react-quizlet-flashcard";
import { ClimbingBoxLoader } from "react-spinners";
import './App.css'

function render(title: string, content: string) {
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
      <p style={{ fontSize: "16px", margin: 0 }}>{content}</p>
    </div>
  );
}


type Word = {
  english: string;
  description: string;
  tag: string;
  week: string;
};

function parseDocContent(content: string): Word[] {
  const lines = content.split('\n');
  const words: Word[] = [];

  let currentTag = "";
  let currentWeek = "";
  for (let line of lines) {
    line = line.trim();

    if (!line) continue;
    else if (/^_+$/.test(line)) continue;
    else if (line.startsWith('Week')) {
      currentWeek = line.trim();
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

  return words;
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

  useEffect(() => {
    const url = `https://docs.google.com/document/d/${docId}/export?format=txt`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch document");
        return res.text();
      })
      .then((text) => {
        const words = parseDocContent(text);
        const cardData = wordsToCards(words);
        setCards(cardData);
      })
      .catch((err) => console.log(err.message));
  }, [docId]);

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
      <FlashcardArray cards={cards}/>
    </div>
  );
}

export default App
