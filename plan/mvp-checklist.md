# 語音控制記分板 — MVP 開發計畫

## Context

目標是做一個這週末打球（羽球/桌球/壁球/網球）就能用的記分板網頁，主要賣點是「用語音喊『藍隊加一分』就能記分」，並在加減分成功時用語音報分作為回饋。

關鍵決策：
- **裝置**：實際會用 iPhone（Safari/WebKit），常駐語音聆聽不穩定是已知限制，UI 必須永遠保留手動按鈕當保底。
- **球類與規則**：支援羽球、桌球、壁球、網球，各自套用正式計分規則（換邊時機、局數、deuce 等），但**不追蹤發球輪替**。
- **隊伍**：固定 6 色清單（紅/藍/綠/黃/橘/紫），開賽前各選一色，語音指令用顏色詞辨識隊伍。
- **語音回饋**：加減分成功後用語音合成報分（例如「七比五」；網球報局內比分如「三十比十五」），播報時暫停收音避免自我誤觸發。
- **部署**：純前端靜態網頁，部署到 GitHub Pages。

## 技術路線

- 純 HTML/CSS/vanilla JS（ES modules），無建置工具。
- 語音辨識：`webkitSpeechRecognition`，`lang: 'zh-TW'`，continuous 模式 + 自動重啟模擬常駐聆聽。
- 語音回饋：`speechSynthesis`。
- 部署：GitHub repo + GitHub Pages（HTTPS，Web Speech API 需要 secure context）。

## Checklist

### Phase 0 — 專案骨架與部署管線
- [x] 建立 `index.html` + `css/style.css` + `js/main.js` 等骨架
- [x] `git init`，建立 `README.md`、`.gitignore`
- [ ] 建 GitHub repo，push，開啟 GitHub Pages，確認手機能開啟該網址（本機沒有 `gh` CLI 登入，需使用者自行操作，見下方部署步驟）
- [x] 建立 `./plan/mvp-checklist.md`

### Phase 1 — 開賽設定畫面與資料模型
- [x] `match-state.js`：match state 結構 + undo stack
- [x] 設定畫面 UI：選球類、單打/雙打、雙隊顏色下拉（6 色，不可重複選同一色，已驗證擋重複選色的檢查邏輯存在於 `main.js`）
- [x] 「開始比賽」按鈕 → 初始化規則引擎與 state，切換到記分板畫面

### Phase 2 — 羽球規則引擎 + 記分板 UI
- [x] `rules/badminton.js`：21分/贏2分/30封頂/三戰兩勝，局末換邊、決勝局11分換邊
- [x] `scoreboard-ui.js`：比分顯示、比賽結束 banner
- [x] 手動 +1 / -1 按鈕串接規則引擎
- [x] Playwright 自動化跑過一整場（21:0 贏第一局 → 復原測試 → 贏第二局比賽結束 → 結束後鎖定分數），全數通過

### Phase 3 — 補齊其餘三種球類規則引擎
- [x] `rules/tabletennis.js`（11分/贏2分/五戰三勝/決勝局5分換邊）
- [x] `rules/squash.js`（11分 PAR/五戰三勝/局末換邊）
- [x] `rules/tennis.js`（分/局兩層、deuce/advantage、6-6搶七、單數局換邊）
- [x] 共用邏輯抽成 `rules/point-race.js`（羽球/桌球/壁球共用），避免三份重複程式碼
- [x] 直接測試規則引擎狀態機（桌球贏2分、羽球30分封頂、網球平分/佔先/搶七換邊/搶七獲勝、決勝局換邊），共 13 項全數通過

### Phase 4 — 復原機制
- [x] state 變更前 push 到 undo stack
- [x] 「復原上一步」按鈕還原 state 並重繪
- [x] Playwright 驗證加分後 undo 能正確還原分數

### Phase 5 — 語音收音模式（STT）
- [x] `voice-input.js`：`webkitSpeechRecognition` 初始化 + `onend` 自動重啟迴圈
- [x] 關鍵字解析：掃描逐字稿比對 6 色詞 + 加/扣分詞，忽略未在本場使用的顏色
- [x] 「收音模式」開關 UI + 「目前聽到：…」浮動文字提示
- [ ] 真實麥克風辨識準確度尚未實測（無法在此環境用麥克風測試，需 Phase 7 實機驗證）

### Phase 6 — 語音回饋（TTS）
- [x] `voice-feedback.js`：加減分成功後用 `speechSynthesis` 報分
- [x] 羽球/桌球/壁球報「X比Y」；網球報局內比分術語，局末/賽末改報獲勝訊息
- [x] 播報前 `voiceInput.mute()`、播報完 `onEnd` 時 `voiceInput.unmute()`，避免自我誤觸發
- [ ] 真機喇叭/麥克風協調的實際效果尚未實測（同樣需 Phase 7 實機驗證）

### Phase 7 — iPhone 實機測試與調整（待使用者本人執行）
- [ ] 用實際 iPhone + Safari 開啟 GitHub Pages 網址測試收音模式穩定度
- [ ] 吵雜環境下測試關鍵字容錯
- [ ] 確認手動按鈕保底路徑完全不依賴語音也能玩完一整場
- [ ] 依實測結果調整關鍵字清單或重啟策略

## 部署步驟（需要使用者操作，本機環境沒有已登入的 `gh` CLI）

1. 到 GitHub 建立一個新的空 repo，例如 `voice-controlled-scoreboard`（不要勾選自動產生 README，本地已經有了）
2. 在專案資料夾執行：
   ```
   git remote add origin https://github.com/<你的帳號>/voice-controlled-scoreboard.git
   git branch -M main
   git push -u origin main
   ```
3. 到 repo 的 Settings → Pages，Source 選「Deploy from a branch」，Branch 選 `main` / `(root)`，儲存
4. 等 1-2 分鐘後，用網址 `https://<你的帳號>.github.io/voice-controlled-scoreboard/` 在 iPhone Safari 開啟測試

## 已知限制（刻意排除在 MVP 之外）

- 不追蹤雙打發球輪替
- 無帳號、無歷史紀錄、無多場並行
- 網球僅做「單盤」賽制，尚未支援多盤
- 沒有自動化測試框架常駐在專案內（測試腳本只在開發時用 Playwright 跑過，未寫入 repo）
