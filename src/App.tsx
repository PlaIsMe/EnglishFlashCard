import { useEffect, useState, type CSSProperties } from 'react'
import { FlashcardArray } from "react-quizlet-flashcard";
import { ClimbingBoxLoader } from "react-spinners";
import './App.css'
import { callGemini } from './GeminiAPI';

function render(title: string, content: string, englishClause: string = "", vietnameseClause: string = "") {
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
      {englishClause.length !== 0 && vietnameseClause.length !== 0 && (
        <>
          <p
            style={{
              fontSize: "18px",
              marginTop: "50px",
              marginBottom: "0px",
              color: "#333",
            }}
          >
            {englishClause}
          </p>
          <p
            style={{
              fontSize: "12px",
              marginTop: "0px",
              color: "#333",
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

  const handleCardFlip = async (id: number | string, index: number) => {
    const card = cards[index];
    const message = "Give me 1 short sentence example how to use the English word: " + card.key +
     " follow the format: English sentence/translated to Vietnamese sentence/"
    console.log("Message: " + message);
    try {
      const response = await callGemini(message);
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parts = text.trim().replace(/\/$/, '').split('/');
      const englishClause = parts[0];
      const vietnameseClause = parts[1];
      setCards(prevCards =>
        prevCards.map(card =>
          card.id === id ? { ...card, backHTML: render(card.tag, card.description, englishClause, vietnameseClause) } : card
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  const isMobile = window.innerWidth <= 768;

  // const wrapperStyle = {
  //   width: isMobile ? '80vw' : '100%',
  // };


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
      <FlashcardArray cards={cards} onCardFlip={handleCardFlip}/>
    </div>
  );
}

export default App
