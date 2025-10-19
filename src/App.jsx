import React, { useState, useRef } from 'react';
import bgImage from './assets/bg.png';

export default function CardMaker() {
  const [input, setInput] = useState(
    '!!Пункт один\n!!Пункт два\n#Заголовок и *важное* внутри#\n\nТекст с /курсивом/ и @маркером@'
  );
  const [cards, setCards] = useState([]);
  const WIDTH = 1080;
  const HEIGHT = 1920;
  const PADDING_TOP = 260;
  const PADDING_LEFT = 100;
  const canvasRef = useRef(null);

  const TEXT_LINE_HEIGHT = 85;    // обычный текст
  const HEADER_LINE_HEIGHT = 100; // заголовки

  // --- Универсальный парсер ---
  function parseTextSegments(text) {
    const segments = [];
    const regex = /(\#.+?\#)|(\*.+?\*)|(@.+?@)|(\/.+?\/)|(\$.+?\$)|(\!\!.+(\n|$))|([^\s]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      segments.push(match[0]);
    }
    return segments;
  }

  // --- Рекурсивная обработка вложенных стилей ---
  function renderStyledText(ctx, seg, baseFont, baseFill, startX, startY, maxWidth, isHeader = false) {
    let cursorX = startX;
    let cursorY = startY;

    const inner = parseTextSegments(seg);
    inner.forEach(innerSeg => {
      let font = baseFont;
      let fill = baseFill;
      let italic = false;

      if (innerSeg.startsWith('*') && innerSeg.endsWith('*')) {
        innerSeg = innerSeg.slice(1, -1);
        font = '700 70px Inter, system-ui';
      } else if (innerSeg.startsWith('@') && innerSeg.endsWith('@')) {
        innerSeg = innerSeg.slice(1, -1);
        fill = '#FFD700';
      } else if (innerSeg.startsWith('/') && innerSeg.endsWith('/')) {
        innerSeg = innerSeg.slice(1, -1);
        italic = true;
      } else if (innerSeg.startsWith('$') && innerSeg.endsWith('$')) {
        innerSeg = innerSeg.slice(1, -1);
        font = '400 48px Inter, system-ui';
      }

      ctx.font = italic ? `italic ${font}` : font;
      ctx.fillStyle = fill;

      const words = innerSeg.split(' ');
      const lineHeight = isHeader ? HEADER_LINE_HEIGHT : TEXT_LINE_HEIGHT;

      words.forEach(word => {
        const metrics = ctx.measureText(word + ' ');
        if (cursorX + metrics.width > startX + maxWidth) {
          cursorX = startX;
          cursorY += lineHeight;
        }
        ctx.fillText(word + ' ', cursorX, cursorY);
        cursorX += metrics.width;
      });
    });

    return cursorY + (isHeader ? HEADER_LINE_HEIGHT : TEXT_LINE_HEIGHT);
  }

  // --- Основная функция отрисовки текста ---
  function drawText(ctx, text, startX, startY, maxWidth) {
    const paragraphs = text.split('\n');
    let cursorY = startY;

    paragraphs.forEach(paragraph => {
      if (paragraph.trim() === '') {
        cursorY += TEXT_LINE_HEIGHT;
        return;
      }

      let cursorX = startX;
      const segments = parseTextSegments(paragraph);

      segments.forEach(seg => {
        let font = '400 75px Inter, system-ui';
        let fill = '#FFFFFF';
        let listOffset = 0;

        if (seg.startsWith('#') && seg.endsWith('#')) {
          const inner = seg.slice(1, -1);
          font = '400 100px Inter, system-ui';
          cursorY = renderStyledText(ctx, inner, font, fill, cursorX, cursorY, maxWidth, true);
          cursorX = startX;
          return;
        } else if (seg.startsWith('*') && seg.endsWith('*')) {
          seg = seg.slice(1, -1);
          font = '700 75px Inter, system-ui';
        } else if (seg.startsWith('@') && seg.endsWith('@')) {
          seg = seg.slice(1, -1);
          fill = '#FFD700';
        } else if (seg.startsWith('/') && seg.endsWith('/')) {
          seg = seg.slice(1, -1);
          font = 'italic 75px Inter, system-ui';
        } else if (seg.startsWith('$') && seg.endsWith('$')) {
          seg = seg.slice(1, -1);
          font = '400 48px Inter, system-ui';
        } else if (seg.startsWith('!!')) {
          seg = '• ' + seg.slice(2).trim();
          font = '500 48px Inter, system-ui';
          listOffset = 40;
          cursorX = startX + listOffset;
        }

        ctx.font = font;
        ctx.fillStyle = fill;

        const words = seg.split(' ');
        const lineHeight = TEXT_LINE_HEIGHT;
        words.forEach(word => {
          const metrics = ctx.measureText(word + ' ');
          if (cursorX + metrics.width > startX + maxWidth) {
            cursorX = startX + listOffset;
            cursorY += lineHeight;
          }
          ctx.fillText(word + ' ', cursorX, cursorY);
          cursorX += metrics.width;
        });
      });

      cursorY += TEXT_LINE_HEIGHT;
    });
  }

  // --- Фон ---
  function drawBackground(ctx) {
    return new Promise(resolve => {
      const img = new Image();
      img.src = bgImage;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
        resolve();
      };
      img.onerror = () => resolve();
    });
  }

  async function generateCards() {
    const parts = input.split('++++').map(p => p.trim()).filter(Boolean);
    const generated = [];
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < parts.length; i++) {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      await drawBackground(ctx);
      drawText(ctx, parts[i], PADDING_LEFT, PADDING_TOP, WIDTH - PADDING_LEFT * 2);

      const dataUrl = canvas.toDataURL('image/png');
      generated.push({ dataUrl, text: parts[i] });
    }

    setCards(generated);
  }

  function downloadImage(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadAll() {
    if (!cards.length) return;
    cards.forEach((c, idx) => {
      setTimeout(() => downloadImage(c.dataUrl, `card-${idx + 1}.png`), idx * 400);
    });
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui', padding: 20, maxWidth: 980, margin: '0 auto' }}>
      <h1>Card Maker — прототип</h1>
      <p>Поддерживает *, /, @, #, $, !! и переносы строк (вложенные стили работают)</p>
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={8}
        style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button onClick={generateCards} style={{ padding: '10px 16px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none' }}>Generate</button>
        <button onClick={downloadAll} style={{ padding: '10px 16px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none' }}>Download all</button>
        <button onClick={() => setCards([])} style={{ padding: '10px 16px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none' }}>Clear</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 18 }}>
        {cards.length === 0 && <div style={{ color: '#666' }}>Нет карточек — сгенерируй их кнопкой «Generate»</div>}
        {cards.map((c, idx) => (
          <div key={idx} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            <img src={c.dataUrl} alt={`card-${idx+1}`} style={{ width: '100%', display: 'block' }} onClick={() => window.open(c.dataUrl)} />
            <div style={{ padding: 8, display: 'flex', gap: 8 }}>
              <button onClick={() => downloadImage(c.dataUrl, `card-${idx + 1}.png`)} style={{ flex: 1, padding: 8, borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff' }}>Download</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
