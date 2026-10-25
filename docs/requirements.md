# trainote の要件と設計

ダイエットのための個人用トレーニングノート。運動と体重を記録し、その記録を読んだ Claude に次のメニューや食事を相談する。利用者は一人で、スマホから毎日数十秒だけ開く。

この文書は 2026-10-24 から 25 にかけて設計を一問ずつ合意した結果である。インデントが依存関係を表す。親の決定が変われば子の決定も見直す。

## 合意した設計

### 利用者と認証

- 利用者は一人。ただし users テーブルは持つ
  - 認証は Cloudflare Access + Google。Zero Trust の Login methods は Google だけで、許可するメールは `yamat47.thirddown@gmail.com` の 1 件
    - Worker は Access が付けた identity (メール) で users に upsert する。ログイン画面もセッション管理も書かない
    - ローカルでは wrangler の `access.dev` ブロックで identity を偽装する
    - Access の検証は `ctx.access.getIdentity()` を第一候補にし、hostname ベースの Access アプリで取れなければ `CF_Authorization` の JWT を `https://yamat47.cloudflareaccess.com/cdn-cgi/access/certs` で検証する (AUD は後述の outputs)

### 記録するもの

- v1 の対象は運動と体重。食事と睡眠は対象外
  - 運動は筋トレと有酸素の両方
    - テーブルは `workouts` (日付、メモ) と `workout_items` (種目名、重量 kg、回数、セット、時間 分、距離 km。数値はすべて任意)
    - 入力は自由文。Claude が Structured Outputs で JSON にし、プレビューを出し、利用者が保存か修正を選ぶ
    - 種目名は Claude が正規化する (「ベンチ」を「ベンチプレス」に)。種目マスタは v1 では持たない
  - 体重は 1 日 1 件 (日付で upsert)、kg 小数 1 桁。体脂肪率は任意列

### Claude との相談

- 記録は専用ビュー、相談は別タブのチャット
  - Claude には読み取り専用ツールを持たせる (運動、体重、プロフィールを期間指定で取得)。ツールループは Worker 側で回す
    - 書き込みツールは v1 では持たない。保存は記録ビューの確認フローに寄せる
  - 会話履歴はスレッド単位で D1 に保存する (`threads`、`messages`)。Claude にはスレッド全文を渡し、長くなったら先頭を落とす
  - モデルはチャットが `claude-opus-5-5`、構造化が `claude-sonnet-5-5`。どちらも環境変数で差し替えられるようにする
  - 応答は SSE でストリーミングする。ツール実行中は「記録を読んでいます」をイベントで流す
- プロフィールは毎回システムプロンプトに入れる。項目は身長、生年、性別、目標体重と期限、運動環境 (ジムか自宅か、器具、週回数)、制約メモ (自由文)

### UI

- OOUI。オブジェクトはワークアウト、体重、相談スレッド、プロフィール。そのまま下タブにし、最後に開いたタブを記憶する
  - 各コレクションの先頭にインライン作成を置く。モーダルもウィザードも作らない
  - 体重はリストとグラフ (目標線つき) の表示切替
  - ワークアウトは日付降順。種目で絞ると推移が出る
  - 相談はスレッド一覧から単一ビュー (チャット) へ
- 見た目はトレーニングノート。地 `#F7F9FC`、紺インク `#15213B`、罫線 `#D7DEE8`、赤ペン `#C8323A` (目標線と修正にだけ使う)。書体は Zen 角ゴシック New 一家族で、数字はタブラー。等間隔の罫線で全行を揃え、記入欄は下線。ダークモードは OS 設定に追従する
  - 主役は数字と推移である。数字以外は黙らせる。クリーム地にセリフ、黒地にネオン、一色のカードキット、ラベルの全大文字、データの等幅フォントは使わない

### 技術スタック

- フロントは Vite + React + TypeScript
- ホスティングは 1 Worker で SPA と API を配信する。`@cloudflare/vite-plugin`、`run_worker_first: ["/api/*"]`、`not_found_handling: "single-page-application"`
  - API は Hono。`hono/client` でフロントと型を共有する
  - Claude API は Anthropic TypeScript SDK を Worker から呼ぶ。API キーは Worker の secret (`wrangler secret put ANTHROPIC_API_KEY`)
- DB は D1 + Drizzle。`drizzle-kit generate` で SQL を出し、`wrangler d1 migrations apply` で当てる
  - テーブルは users、profiles、workouts、workout_items、weights、threads、messages
- デプロイは GitHub Actions。main への push で migrate してから deploy する。PR では lint、typecheck、test だけ。actions は SHA ピン (github-toolkit の github-actions-workflows スキルに従う)
- ローカルは `vite dev` (Cloudflare プラグイン経由でローカル D1 つき)
- 日付は Asia/Tokyo 固定。単位は kg、km、分
- パッケージマネージャは pnpm。テストは vitest (API のツール関数と構造化の JSON スキーマが主な対象)

## すでに用意されているもの

このリポジトリの外で済んでいる作業。それぞれの場所と、ここから使うときの名前。

### GitHub (yamat47/infra-github で管理)

- このリポジトリは `site` プロファイル。public、main は PR と署名コミットのみ、merge commit 運用
- Actions 環境 `deploy` があり、使えるブランチは main だけ。Cloudflare のデプロイ用トークンはここに `CLOUDFLARE_API_TOKEN` として手で入れる (権限は Workers Scripts Edit と D1 Edit、アカウントは yamat47 のみ)。2026-10-25 時点でまだ入れていない
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

### 使うスキル (yamat47/github-toolkit)

typescript-idioms、react-patterns、api-design、frontend-design、github-actions-workflows、writing-conventions、create-pr、review-pr。コミットメッセージと PR 本文は英語、Conventional Commits。AI の痕跡 (Co-Authored-By、session URL、Generated with) は残さない。

## 最初の一歩

1. デプロイ用トークンを発行し、`deploy` 環境の secret に入れる
2. `npm create cloudflare@latest -- trainote --framework=react` 相当の構成を pnpm で起こし、Hono と Drizzle を足す
3. `wrangler.jsonc` に D1 バインディング (`DB`)、`run_worker_first`、`not_found_handling`、`access.dev` を書く
4. Drizzle のスキーマと最初のマイグレーション
5. CI (lint、typecheck、test、main で migrate と deploy)。ジョブ名が決まったら infra-github に `required_checks` を足す
