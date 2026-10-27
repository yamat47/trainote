# trainote の要件と設計

ボディメイクのための個人用ノート。日々の行動 (頑張ったこと = Win と、頑張れなかったこと = Slip) と体重を記録し、その記録を読んだ Claude に次のメニューや食事を相談し、週に一度振り返る。利用者は一人で、iPhone のホーム画面から毎日数十秒だけ開く。

この文書は 2026-10-24 から 25 にかけて設計を一問ずつ合意した結果である。10-26 に記録の対象を運動から行動全般に広げた。インデントが依存関係を表す。親の決定が変われば子の決定も見直す。末尾の「未決」が空になるまでは下書きである。

## 合意した設計

### 利用者と認証

- 利用者は一人。ただし users テーブルは持つ
  - 認証は Cloudflare Access + Google。Zero Trust の Login methods は Google だけで、許可するメールは `yamat47.thirddown@gmail.com` の 1 件
    - Worker は Access が付けた identity (メール) で users に upsert する。ログイン画面もセッション管理も書かない
    - ローカルでは wrangler の `access.dev` ブロックで identity を偽装する
    - Access の検証は `ctx.access.getIdentity()` を第一候補にし、hostname ベースの Access アプリで取れなければ `CF_Authorization` の JWT を `https://yamat47.cloudflareaccess.com/cdn-cgi/access/certs` で検証する (AUD は後述の outputs)

### 記録するもの

- v1 の対象は行動と体重。行動はボディメイクに向けた Win (頑張ったこと) と Slip (頑張れなかったこと) の 2 種で、Exercise、Food、Sleep、Life の 4 カテゴリに分ける
  - Slip は「一度滑っただけで失敗ではない」という行動療法の言葉。責めない姿勢を名前に込める
  - 食事のカロリーや睡眠時間は数値として記録しない。「お菓子を我慢した」「23 時に寝た」「お菓子を食べてしまった」のように行動を 1 件ずつ記録する
  - 入力は自由文だけ。種目を選ぶ UI も回数を入れる欄も作らない。1 回の入力に複数の行動を雑に書いてよい
    - Claude が Structured Outputs で 1 件ずつに分け、種別とカテゴリを付け、運動なら読み取れた範囲で種目と数値を切り出し、プレビューを出し、利用者が保存か修正を選ぶ
    - 修正は原文を書き直して構造化をやり直す。項目を直接直す画面は作らない
    - プレビューには Claude の一言 (1 文まで) を添える。構造化と同じ呼び出しの JSON に 1 項目足すだけなので往復は増えない。実装の最初に実測し、プレビューが 3 秒を超えるなら一言を外すか構造化のモデルを軽くする
  - 原文が一次記録。構造化した行は推移を出すためのもので、原文から取れなければ無くてよい
  - 運動は頑張ったことの一種で、種目ごとの数値を持てる
    - テーブルは `entries` (日付、種別 win / slip、カテゴリ、本文) と `workout_items` (entry_id、種目名、重量 kg、回数、セット、時間 分、距離 km。数値はすべて任意)
    - 行の粒度は原文に合わせて Claude が決める。「60kg 10 回 3 セット」は 1 行、「60kg で 10、8、6」は 3 行、「ジム行った」は行なし
    - 種目名は Claude が正規化する (「ベンチ」を「ベンチプレス」に)。種目マスタは v1 では持たない
  - 体重は行動とは別のオブジェクト。1 日 1 件 (日付で upsert)、kg 小数 1 桁。体脂肪率は任意列。行動の入力欄では体重を受けない

### 振り返り

- 行動の一覧は日付降順で、日ごとにまとめる。各件は原文と種別の印 (Win は +、Slip は −) を出し、運動なら取れた種目の数値も添える。Win と Slip の言葉は絞り込みと週の文にだけ出す
  - 先頭に今週を月曜から日曜の 7 列で出す。各日に Win の数 (+2) と Slip の数 (−1) を並べ、何もない日は空ける。今日の曜日だけ tint。その下に「9 wins and 2 slips this week, 6 days in a row.」のような 1 文。これが Notes の顔
  - 連続記録日数は「何かしら記録した日」が続いた数。頑張れなかったことだけの日でも途切れない。記録すること自体を習慣にする
  - 種別とカテゴリで絞れる。種目で絞ると推移が出る
- 週に 1 回、「Weekly review」を定型の相談として用意する
  - Coach タブのスレッド一覧に入口を置く。押すと新しいスレッドができ、定型の最初の発言 (今週の行動と体重を読んで、できたこと、つまずき、来週の方針を 1 つにまとめて) が送られ、Claude の返答がそのまま流れる
  - 毎週日曜 20:00 JST にプッシュ通知 (「Time for your weekly review?」) で知らせる。通知を押すと上と同じことが起きる
    - Web Push を使う。Worker の Cron Trigger (`triggers.crons` に UTC で `0 11 * * 0`) が scheduled ハンドラで送る。購読は `push_subscriptions` (endpoint、p256dh、auth) に保存する。VAPID の秘密鍵は Worker の secret、公開鍵は環境変数
    - `web-push` パッケージは Node の crypto に依存して Worker で動かないので、WebCrypto で動くライブラリを使う
    - iOS を想定する。アプリを PWA にし (manifest、アイコン、service worker)、ホーム画面に追加して使う。iOS ではホーム画面に追加したときだけ通知が届く。service worker は push だけを扱い、fetch には触らない。Access のログインリダイレクトを邪魔しないため
    - 通知はこの用途だけ。他の通知は v1 では送らない

### Claude との相談

- 記録は専用ビュー、相談は別タブのチャット
  - Claude には読み取り専用ツールを持たせる (行動を期間、種別、カテゴリで、体重とプロフィールを期間で取得)。ツールループは Worker 側で回す
    - 書き込みツールは v1 では持たない。保存は記録ビューの確認フローに寄せる
  - 会話履歴はスレッド単位で D1 に保存する (`threads`、`messages`)。Claude にはスレッド全文を渡し、長くなったら先頭を落とす
  - モデルはチャットが `claude-opus-5-5`、構造化が `claude-sonnet-5-5`。どちらも環境変数で差し替えられるようにする
  - 応答は SSE でストリーミングする。ツール実行中は「Reading your notes」をイベントで流す
- プロフィールは毎回システムプロンプトに入れる。項目は身長、生年、性別、目標体重と期限、運動環境 (ジムか自宅か、器具、週回数)、制約メモ (自由文)
- システムプロンプトでボディメイクを軸に置く。頑張ったことと頑張れなかったことを踏まえて、運動と食事の両方について助言する

### UI

- 文言はすべて英語。利用者の入力と Claude の応答 (チャット、プレビューの一言、週の振り返り) は日本語
- OOUI。オブジェクトは行動、体重、相談スレッド、プロフィール。そのまま下タブ Notes、Weight、Coach、Profile にし、最後に開いたタブを記憶する
  - 各コレクションの先頭にインライン作成を置く。モーダルもウィザードも作らない
  - Notes は「振り返り」の節の通り
  - Weight は iOS のヘルスケアと同じ構成。先頭に今日の入力行、期間のセグメンテッドコントロール (W、M、6M、Y)、今日の値と 1 週間の増減、グラフ (目標線つき)、目標までの 1 文、直近の数行、最後に「Show all entries」で全件のリストへ。リストとグラフの切替はこれで代える
  - Coach はスレッド一覧から単一ビュー (チャット) へ。一覧の先頭に Weekly review の入口を置く
- 見た目は iOS の標準 (Human Interface Guidelines) に揃える。部品は平らな一般的なもので、Liquid Glass は真似しない
  - 書体はシステムフォント。iOS では英数字が SF Pro、日本語が Hiragino Sans になる。Web フォントは読み込まない。サイズは iOS のテキストスタイル (本文 17、大見出し 34 など)。数字はタブラー
  - 色は iOS のシステムカラー (label、secondaryLabel、separator、systemBackground など) をライトもダークも Apple の値のまま使う。ダークモードは OS 設定に追従する
  - アクセント (tint) は iOS 標準の青 `#007AFF` (ダーク `#0A84FF`) の 1 色。ボタン、リンク、選択中のタブ、グラフの線に使う
  - 赤は systemRed。使うのはグラフの目標線 (破線) と破壊的操作 (Delete) だけ。修正 (Edit) は tint の文字ボタン。Slip は secondaryLabel の文字と − の印で区別し、赤は使わない
  - 各画面の上に大きなタイトル (large title)。下にアイコン + ラベルのタブバー。アイコンは Framework7 Icons (SF Symbols は Apple プラットフォーム外で使えない)
  - リストは Notes と Weight が plain (全幅の行と区切り線)、Profile が inset grouped (設定アプリ風)。行の高さは 44
  - 記入欄はリストの行に置く。下線や枠線の入力欄は作らない。Weight のリストとグラフの切替はセグメンテッドコントロール
  - Coach のチャットは Messages 風の吹き出し。自分が tint、Claude がグレー
  - 主役は数字と推移である。数字以外は黙らせる。独自の装飾、グラデーション、影、ラベルの全大文字、データの等幅フォントは使わない。グループ見出しも全大文字にしない (iOS の慣例からの唯一の逸脱)
  - 文言は文で書く。中黒やダッシュで項目をつなぐ定型 (「9 wins · 2 slips」) は使わない。日付の見出しは Today、Yesterday、その先は Friday, Oct 24。ボタンは起きることをそのまま言う (Save 3 entries、Edit text、Show all entries)
  - 見た目は github-toolkit の frontend-design スキルに沿って見直す。上記の決定はその結果

### 技術スタック

- フロントは Vite + React + TypeScript
- ホスティングは 1 Worker で SPA と API を配信する。`@cloudflare/vite-plugin`、`run_worker_first: ["/api/*"]`、`not_found_handling: "single-page-application"`
  - API は Hono。`hono/client` でフロントと型を共有する
  - Claude API は Anthropic TypeScript SDK を Worker から呼ぶ。API キーは Worker の secret (`wrangler secret put ANTHROPIC_API_KEY`)
- DB は D1 + Drizzle。`drizzle-kit generate` で SQL を出し、`wrangler d1 migrations apply` で当てる
  - テーブルは users、profiles、entries、workout_items、weights、threads、messages、push_subscriptions
- デプロイは GitHub Actions。main への push で migrate してから deploy する。PR では lint、typecheck、test だけ。actions は SHA ピン (github-toolkit の github-actions-workflows スキルに従う)
- ローカルは `vite dev` (Cloudflare プラグイン経由でローカル D1 つき)
- 日付は Asia/Tokyo 固定。Cron の時刻は UTC で書くので JST から引き直す。単位は kg、km、分
- パッケージマネージャは pnpm。テストは vitest (API のツール関数と構造化の JSON スキーマが主な対象)

## すでに用意されているもの

このリポジトリの外で済んでいる作業。それぞれの場所と、ここから使うときの名前。

### GitHub (yamat47/infra-github で管理)

- このリポジトリは `site` プロファイル。public、main は PR と署名コミットのみ、merge commit 運用
- Actions 環境 `deploy` があり、使えるブランチは main だけ。Cloudflare のデプロイ用トークンが環境 secret `CLOUDFLARE_API_TOKEN` として入っている。権限は公式テンプレート「Edit Cloudflare Workers」に D1 Edit を足したもので、アカウントは yamat47 のみ。最初のデプロイが通ったら、使っていない権限を外してこの行を実際の構成に合わせる
- デプロイのワークフローは `deploy` 環境を名乗り、トークンを `secrets.CLOUDFLARE_API_TOKEN`、アカウント ID を `vars.CLOUDFLARE_ACCOUNT_ID` (secret ではなく変数) から読む
- Actions 変数 `CLOUDFLARE_ACCOUNT_ID` = `24a305c930f17853bb811c18bee6074a`
- `required_checks` は未設定。CI のジョブ名が決まったら infra-github の `terraform/owners/yamat47/locals.tf` の trainote エントリに足す (default branch の管理は infra-github #33 で済んでいる)

### Cloudflare (yamat47/infra-yamat47 の `terraform/accounts/yamat47/cloudflare` で管理)

- D1 データベース `trainote` (apac)。`prevent_destroy` つき
- Access アプリ `trainote` (self_hosted、`trainote.yamat47.workers.dev`、セッション 24h) と、上記メール 1 件を allow するポリシー
- Terraform の outputs は次の 3 つ。`wrangler.jsonc` と Worker のコードにそのまま書く。どれも secret ではない
  - `trainote_d1_database_id` = `7f0a88bc-9c70-414e-84f8-0964400dab4b` (D1 バインディングの `database_id`)
  - `trainote_access_aud` = `462b3c5e4250c32653c929bb5f47600eb544d6e11b0c1747ea66bbe0615ab294` (Access の JWT を検証するときの audience)
  - `trainote_access_team_domain` = `yamat47.cloudflareaccess.com` (同じく issuer と証明書の取得先)
- Zero Trust の Google ログイン方法は手で登録済み。IdP の id は `0a257bc8-2462-4567-b5c6-0943cb816183` (ダッシュボードの編集画面 URL の末尾)。Access アプリは `allowed_idps` にこの 1 件だけを持ち、ログイン画面を飛ばして Google に直行する
- Worker 名は `trainote`。workers.dev のサブドメインは `yamat47.workers.dev`。Zero Trust のチームドメインは `yamat47.cloudflareaccess.com`

### デザイン (claude.ai の Design System アーティファクト)

- デザインシステム `trainote` = https://claude.ai/artifact/DsCPBeo51tExs5wGcYXe8k (非公開。所有者だけが開ける)
  - iOS のシステムカラー、システムフォントのテキストスタイル、余白と角丸をトークンにしてある。ライトとダークの値は Apple のものをそのまま使う
  - 部品は TabBar、NavBar、Row、Week、Group、Field、Mark、Stat、Button、Segmented、Bubble の 11 個。グラフと構造化プレビューは画面を描きながら決めて後から足す
  - 見た目の値はここが一次。実装では `project/tokens.json` を読んで CSS 変数にする。文書の「見た目」の行と食い違ったら文書を直す
  - アイコンフォント Framework7 Icons 5.0.5 (MIT) を `project/fonts/` に同梱している。実装では npm の `framework7-icons` から同じファイルを使う
- 画面 `trainote screens` = https://claude.ai/artifact/2uZYx9fL9R1WBsEFD8jhHB (非公開。上のデザインシステムの部品をそのまま載せている)
  - iPhone 幅 (390 × 844) で 8 枚。Notes、Notes の構造化プレビュー、Weight、Weight の全件リスト、Coach のスレッド一覧、週の振り返りのスレッド、Profile、日曜の通知
  - 各画面の Tweaks でライトとダークを切り替えられる

### 使うスキル (yamat47/github-toolkit)

typescript-idioms、react-patterns、api-design、frontend-design、github-actions-workflows、writing-conventions、create-pr、review-pr。コミットメッセージと PR 本文は英語、Conventional Commits。AI の痕跡 (Co-Authored-By、session URL、Generated with) は残さない。

## 最初の一歩

1. `npm create cloudflare@latest -- trainote --framework=react` 相当の構成を pnpm で起こし、Hono と Drizzle を足す
2. `wrangler.jsonc` に D1 バインディング (`DB`)、`run_worker_first`、`not_found_handling`、`access.dev`、`triggers.crons` を書く
3. Drizzle のスキーマと最初のマイグレーション
4. CI (lint、typecheck、test、main で migrate と deploy)。ジョブ名が決まったら infra-github に `required_checks` を足す
5. PWA (manifest、アイコン、service worker) と Web Push の購読と送信

## 未決

決まったら該当する行に書き写し、ここから消す。

- Access のセッションが 24h のままだと、ホーム画面の PWA でも毎日 Google へのリダイレクトが挟まる。延ばすなら infra-yamat47 の Access アプリの `session_duration` を変える
- 行動の保存後の編集と削除
- 種目で絞ったときの推移の指標 (最大重量、総量、有酸素は距離か時間か)
- 過去日付の記録を入れられるか
- 体重グラフの期間切替。同じ日に再入力したときの扱い。体脂肪率をグラフに出すか
- スレッドのタイトルの付け方。スレッドの削除
- 初回でデータがないときの表示。Claude API 失敗時とオフライン時の表示
- 初回に開くタブ
