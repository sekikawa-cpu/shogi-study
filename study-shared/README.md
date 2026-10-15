# ホームの直近成績集計

DS検定と営業2級の「模擬試験 直近平均」は、本番形式の得点記録に加え、1問ずつ解く形式の保存済み演習履歴も参照します。`practice-scores.js` を各アプリの `app/js/` に配置し、ホームから `latestPracticeScores(state.scores, state.logs)` を使用します。

- 回答数と正答数から100点満点へ換算。分割保存された同じセッションは件数を合算して計算します。
- 同じセッションの本番得点が保存されている場合は、演習履歴から重複して得点を作りません。
- 従来どおり年度・科目ごとの直近成績を平均します。
- 回答ゼロ・不正な件数は除外し、正解ゼロは0点として含めます。
- 過去の履歴は試験キーと回答数、または従来形式の演習メモから読めるものを反映します。履歴の書き換えは行いません。
- 新規の通常選択式も `practiceMode: 'quiz'` で識別して集計します。自己評価式のSRSカードは正誤が客観的に判定できないため対象外です。

元アプリは `C:/Claude/DS検定` と `C:/Claude/営業2級`。`store.js` の学習記録に `practiceMode`、得点記録に `createdAt` を保持し、演習の `flushSession` で形式を記録します。ホームへ移る際にセッションが保存され、再集計されます。

単一HTML版を `node build.mjs` で生成し、各アプリの `tools/cloud-build.mjs` と `tools/cloud-admin.cjs` で本人限定のFirestore教材を更新します。DSは `upload --app-only` を指定し、原本画像を再アップロードしません。今回、ブログの公開HTMLや認証画面は変更しません。

テスト: `node --test study-shared/practice-scores.test.mjs`。
