import React, { useState, useRef } from "react";
import defaultBg from "./assets/bg.png";

export default function CardMaker() {
  const [input, setInput] = useState(`<div>
    <h1>Заголовок</h1>
    <p>Описание с <span>выделением</span> текста.</p>
  </div>`);
  const [bgFiles, setBgFiles] = useState([]);
  const [cards, setCards] = useState([]);
  const [theme, setTheme] = useState("light"); // light | dark
  const [gradient, setGradient] = useState("none"); // none | darktop | lighttop
  const canvasRef = useRef(null);

  const WIDTH = 1080;
  const HEIGHT = 1080;

  function makeSvgDataUrlFromHtml(html) {
    const textColor = theme === "light" ? "#fff" : "#000";
    const spanBg = theme === "light" ? "#000" : "#fff";
    const spanColor = theme === "light" ? "#fff" : "#000";

    const gradientStyle =
      gradient === "darktop"
        ? "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0))"
        : gradient === "lighttop"
        ? "linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(255,255,255,0))"
        : "none";

    const escaped = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml"
         style="
            width:${WIDTH}px;
            height:${HEIGHT}px;
            box-sizing:border-box;
            font-family:Inter, system-ui;
            padding:140px;
            color:${textColor};
            position:relative;
            background:${gradientStyle};
         ">
      <style>
        h1 {
          font-size:84px;
          margin:0 0 20px 0;
          line-height:1.1;
        }
        p {
          font-size:34px;
          margin:0;
          line-height:1.3;
        }
        span {
          background:${spanBg};
          color:${spanColor};
          padding:4px 8px;
          border-radius:6px;
        }
      </style>
      ${html}
    </div>
  </foreignObject>
</svg>`;

    const svg64 = encodeURIComponent(escaped)
      .replace(/'/g, "%27")
      .replace(/"/g, "%22");
    return `data:image/svg+xml;charset=utf-8,${svg64}`;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  function handleBgFilesChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return setBgFiles([]);
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

  async function generateCards() {
    const parts = input.split("++++").map((p) => p.trim()).filter(Boolean);
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");

    const results = [];
    let defaultBgDataUrl = defaultBg;

    for (let i = 0; i < parts.length; i++) {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const bgSrc = bgFiles[i] || bgFiles[0] || defaultBgDataUrl;

      try {
        const bgImg = await loadImage(bgSrc);
        // cover-подгонка фона (без растяжения)
        const imgRatio = bgImg.width / bgImg.height;
        const boxRatio = WIDTH / HEIGHT;
        let drawWidth = WIDTH;
        let drawHeight = HEIGHT;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > boxRatio) {
          drawHeight = HEIGHT;
          drawWidth = bgImg.width * (HEIGHT / bgImg.height);
          offsetX = (WIDTH - drawWidth) / 2;
        } else {
          drawWidth = WIDTH;
          drawHeight = bgImg.height * (WIDTH / bgImg.width);
          offsetY = (HEIGHT - drawHeight) / 2;
        }

        ctx.drawImage(bgImg, offsetX, offsetY, drawWidth, drawHeight);
      } catch {
        ctx.fillStyle = theme === "light" ? "#000" : "#fff";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      const svgUrl = makeSvgDataUrlFromHtml(parts[i]);
      try {
        const svgImg = await loadImage(svgUrl);
        ctx.drawImage(svgImg, 0, 0, WIDTH, HEIGHT);
      } catch (e) {
        ctx.fillStyle = "#ff0000";
        ctx.font = "24px Inter";
        ctx.fillText("Ошибка рендеринга HTML", 40, 80);
      }

      results.push({ dataUrl: canvas.toDataURL("image/png"), html: parts[i] });
    }

    setCards(results);
  }

  function downloadImage(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui", padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <h1>Card Maker — улучшенная версия</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <label>
          Тема:{" "}
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
          </select>
        </label>
        <label>
          Градиент:{" "}
          <select value={gradient} onChange={(e) => setGradient(e.target.value)}>
            <option value="none">Без</option>
            <option value="darktop">Тёмный сверху</option>
            <option value="lighttop">Светлый сверху</option>
          </select>
        </label>
      </div>

      <label style={{ display: "block", marginBottom: 8 }}>
        Фон (можно выбрать несколько):{" "}
        <input type="file" accept="image/*" multiple onChange={handleBgFilesChange} />
      </label>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={10}
        style={{
          width: "100%",
          fontFamily: "monospace",
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: 10,
          boxSizing: "border-box",
        }}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button onClick={generateCards} style={buttonStyle}>
          Generate
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Результаты</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px,1fr))", gap: 12 }}>
          {cards.map((c, i) => (
            <div key={i} style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
              <img src={c.dataUrl} alt={`card-${i + 1}`} style={{ width: "100%", display: "block" }} />
              <button
                onClick={() => downloadImage(c.dataUrl, `card-${i + 1}.png`)}
                style={{ width: "100%", padding: 8, background: "#2563eb", color: "#fff", border: "none" }}
              >
                Скачать
              </button>
            </div>
          ))}
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} width={WIDTH} height={HEIGHT}></canvas>
    </div>
  );
}

const buttonStyle = {
  background: "#2563eb",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};
