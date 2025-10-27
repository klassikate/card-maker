import React, { useState, useRef } from "react";
import defaultBg from "./assets/bg.png";

/**
 * CardMaker — генератор карточек:
 * - В поле ввода — HTML для каждого слайда;
 * - Разделитель слайдов: ++++ (четыре плюса);
 * - Можно загрузить 1+ файлов фона — используются по порядку;
 * - HTML рендерится в SVG foreignObject -> рисуется на canvas -> экспорт PNG.
 */
export default function CardMaker() {
  const [input, setInput] = useState(
    // пример: 2 слайда, разделённые ++++
    `<div style="font-family:Inter, system-ui; padding: 40px;">
      <h1 style="font-size:64px; margin:0 0 20px;">Заголовок слайда 1</h1>
      <p style="font-size:36px; margin:0 0 10px;">Немного <b>жирного</b> текста и <span style="background:#ffd700;padding:4px;border-radius:4px;">выделение</span>.</p>
      <ul><li>Пункт один</li><li>Пункт два</li></ul>
    </div>
    ++++
    <div style="font-family:Inter, system-ui; padding: 40px;">
      <h2 style="font-size:56px; margin:0 0 14px;">Слайд 2</h2>
      <p style="font-size:34px;">Курсив: <i>пример</i> и <span style='font-weight:700'>важное</span></p>
    </div>`
  );

  const [bgFiles, setBgFiles] = useState([]); // dataURLs
  const [cards, setCards] = useState([]);
  const canvasRef = useRef(null);

  // Размеры — при необходимости поменяй
  const WIDTH = 1080;
  const HEIGHT = 1920;

  // Преобразует HTML в SVG-строку с foreignObject
  function makeSvgDataUrlFromHtml(html, width = WIDTH, height = HEIGHT) {
    // Оборачиваем HTML в namespace и задаём базовые стили (можно расширять)
    const escaped = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;box-sizing:border-box;">
      ${html}
    </div>
  </foreignObject>
</svg>`;

    // encodeURIComponent безопаснее для inline-URI
    const svg64 = encodeURIComponent(escaped)
      .replace(/'/g, "%27")
      .replace(/"/g, "%22");

    return `data:image/svg+xml;charset=utf-8,${svg64}`;
  }

  // Загружает image по src (dataURL или url)
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  // Обработка выбранных файлов фона — читаем их как dataURL
  function handleBgFilesChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) {
      setBgFiles([]);
      return;
    }
    const readers = files.map(
      (f) =>
        new Promise((res) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.readAsDataURL(f);
        })
    );
    Promise.all(readers).then((dataUrls) => setBgFiles(dataUrls));
  }

  // Основная генерация: разбиваем input на части по ++++, для каждого слайда рисуем фон + HTML -> сохраняем dataURL
  async function generateCards() {
    const parts = input
      .split("++++")
      .map((p) => p.trim())
      .filter(Boolean);

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");

    const results = [];

    // preload default background as dataURL
    let defaultBgDataUrl = defaultBg;
    // если defaultBg — модульный импорт, браузер отдаст путь, можно использовать как src

    for (let i = 0; i < parts.length; i++) {
      // Очистка холста
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // 1) фон: выбираем bgFiles[i] если есть, иначе первый bgFiles[0], иначе defaultBg
      const bgSrc = bgFiles[i] || bgFiles[0] || defaultBgDataUrl;
      try {
        const bgImg = await loadImage(bgSrc);
        // подгоняем фон под канву (можно сохранить пропорции, сейчас растягиваем)
        ctx.drawImage(bgImg, 0, 0, WIDTH, HEIGHT);
      } catch (e) {
        // если фон не загрузился — просто заливка
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      // 2) HTML -> SVG -> Image -> draw on top
      // parts[i] — ожидаем корректный HTML. Рекомендуем оборачивать в контейнер с padding/стилями.
      const svgUrl = makeSvgDataUrlFromHtml(parts[i], WIDTH, HEIGHT);
      try {
        const svgImg = await loadImage(svgUrl);
        // можно задать прозрачность слоя с HTML, или использовать blend, сейчас просто рисуем поверх
        ctx.drawImage(svgImg, 0, 0, WIDTH, HEIGHT);
      } catch (e) {
        // при ошибке рендеринга HTML — вывести текст ошибки на канве
        ctx.fillStyle = "#fff";
        ctx.font = "24px Inter, system-ui";
        ctx.fillText("Ошибка рендеринга HTML", 40, 120);
        console.error("HTML->SVG render error:", e);
      }

      const dataUrl = canvas.toDataURL("image/png");
      results.push({ dataUrl, html: parts[i] });
    }

    setCards(results);
  }

  // Скачать одну картинку
  function downloadImage(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Скачать все
  function downloadAll() {
    if (!cards.length) return;
    cards.forEach((c, idx) => {
      // без setTimeout, браузеры иногда блокируют — но тут синхронно сгенерирован
      downloadImage(c.dataUrl, `card-${idx + 1}.png`);
    });
  }

  // Очистить карточки
  function clearCards() {
    setCards([]);
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui", padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <h1>Card Maker — HTML → картинка</h1>

      <p>
        Напиши HTML для каждого слайда. Разделяй слайды строкой <code>++++</code>. Можно загружать 1 или
        несколько картинок фона (используются по порядку). HTML будет отрисован сверху и превращён в PNG.
      </p>

      <label style={{ display: "block", marginBottom: 8 }}>
        Фон (можно выбрать несколько файлов):{" "}
        <input type="file" accept="image/*" multiple onChange={handleBgFilesChange} />
      </label>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={12}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 14,
          borderRadius: 8,
          border: "1px solid #ddd",
          boxSizing: "border-box",
          fontFamily: "monospace",
        }}
      />

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <button onClick={generateCards} style={buttonStyle}>
          Generate
        </button>
        <button onClick={downloadAll} style={{ ...buttonStyle, background: "#10b981" }}>
          Download all
        </button>
        <button onClick={clearCards} style={{ ...buttonStyle, background: "#ef4444" }}>
          Clear
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <strong>Фоны, загруженные для генерации:</strong>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {bgFiles.length === 0 && <div style={{ color: "#666" }}>Нет загруженных фонов — будет использоваться дефолтный</div>}
          {bgFiles.map((b, i) => (
            <img key={i} src={b} alt={`bg-${i}`} style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #ddd" }} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Результаты</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {cards.length === 0 && <div style={{ color: "#666" }}>Нет карточек — сгенерируй их кнопкой «Generate»</div>}
          {cards.map((c, idx) => (
            <div key={idx} style={{ border: "1px solid #eee", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
              <img src={c.dataUrl} alt={`card-${idx + 1}`} style={{ width: "100%", display: "block" }} onClick={() => window.open(c.dataUrl)} />
              <div style={{ padding: 8, display: "flex", gap: 8 }}>
                <button onClick={() => downloadImage(c.dataUrl, `card-${idx + 1}.png`)} style={{ flex: 1, padding: 8, borderRadius: 6, border: "none", background: "#2563eb", color: "#fff" }}>
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* скрытый canvas — используем для экспорта */}
      <canvas ref={canvasRef} style={{ display: "none" }} width={WIDTH} height={HEIGHT} />
    </div>
  );
}

const buttonStyle = {
  padding: "10px 16px",
  borderRadius: 8,
  background: "#2563eb",
  color: "#fff",
  border: "none",
};
